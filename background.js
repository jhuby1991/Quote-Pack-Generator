importScripts('lib/pdf-lib.min.js');

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DOCS_API = 'https://docs.googleapis.com/v1';

function getAuthToken() {
  return new Promise(function (resolve, reject) {
    chrome.identity.getAuthToken({ interactive: true }, function (token) {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(token);
    });
  });
}

function driveFetch(token, path, options) {
  const url = path.startsWith('http') ? path : DRIVE_API + path;
  return fetch(url, {
    ...options,
    headers: {
      Authorization: 'Bearer ' + token,
      ...(options && options.headers)
    }
  });
}

function docsFetch(token, path, options) {
  const url = path.startsWith('http') ? path : DOCS_API + path;
  return fetch(url, {
    ...options,
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      ...(options && options.headers)
    }
  });
}

function listFiles(token, folderId) {
  const q = encodeURIComponent("'" + folderId + "' in parents and trashed = false");
  return driveFetch(token, '/files?q=' + q + '&fields=files(id,name,mimeType)&supportsAllDrives=true')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.error) throw new Error(data.error.message || 'Drive API error');
      return data.files || [];
    });
}

function findSubfolderByName(token, parentId, name) {
  return listFiles(token, parentId).then(function (files) {
    const lower = (name || '').toLowerCase();
    const folder = files.find(function (f) {
      return f.mimeType === 'application/vnd.google-apps.folder' && f.name.toLowerCase() === lower;
    });
    return folder ? folder.id : null;
  });
}

function findTemplateDoc(files) {
  const doc = files.find(function (f) {
    return f.mimeType === 'application/vnd.google-apps.document' &&
      (f.name.toLowerCase().indexOf('template') !== -1 || f.name.toLowerCase() === 'template');
  });
  return doc ? doc.id : null;
}

function copyFile(token, fileId, newName) {
  return driveFetch(token, '/files/' + fileId + '/copy?supportsAllDrives=true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName || 'Document Compiler temp' })
  }).then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.error) throw new Error(data.error.message || 'Copy failed');
      return data.id;
    });
}

function replacePlaceholders(token, documentId, projectName, rakoQuote) {
  return docsFetch(token, '/documents/' + documentId + ':batchUpdate', {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        { replaceAllText: { containsText: { text: '{{projectName}}', matchCase: true }, replaceText: projectName || '' } },
        { replaceAllText: { containsText: { text: '{{rakoQuote}}', matchCase: true }, replaceText: rakoQuote || '' } }
      ]
    })
  }).then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.error) throw new Error(data.error.message || 'Docs update failed');
      return data;
    });
}

function exportPdf(token, fileId) {
  const url = DRIVE_API + '/files/' + fileId + '/export?mimeType=application/pdf&supportsAllDrives=true';
  return driveFetch(token, url).then(function (r) {
    if (!r.ok) return r.text().then(function (t) { throw new Error(t || 'Export failed'); });
    return r.arrayBuffer();
  });
}

function downloadFile(token, fileId) {
  const url = DRIVE_API + '/files/' + fileId + '?alt=media&supportsAllDrives=true';
  return driveFetch(token, url).then(function (r) {
    if (!r.ok) return r.text().then(function (t) { throw new Error(t || 'Download failed'); });
    return r.arrayBuffer();
  });
}

function deleteFile(token, fileId) {
  return driveFetch(token, '/files/' + fileId + '?supportsAllDrives=true', { method: 'DELETE' });
}

function matchProductFile(files, normalizedName) {
  const docs = files.filter(function (f) { return f.mimeType === 'application/vnd.google-apps.document'; });
  const normalized = (normalizedName || '').toLowerCase();
  const exact = docs.find(function (f) {
    const base = (f.name || '').toLowerCase().replace(/\.[^.]*$/, '').trim();
    return base === normalized || base.replace(/-/g, ' ') === normalized.replace(/-/g, ' ');
  });
  if (exact) return exact.id;
  const partial = docs.find(function (f) {
    const base = (f.name || '').toLowerCase();
    return base.indexOf(normalized) !== -1 || normalized.indexOf(base.replace(/\.[^.]*$/, '').trim()) !== -1;
  });
  return partial ? partial.id : null;
}

function matchProductFileForTechPack(files, normalizedName) {
  var docOrPdf = files.filter(function (f) {
    return f.mimeType === 'application/vnd.google-apps.document' || f.mimeType === 'application/pdf';
  });
  var normalized = (normalizedName || '').toLowerCase();
  var exact = docOrPdf.find(function (f) {
    var base = (f.name || '').toLowerCase().replace(/\.[^.]*$/, '').trim();
    return base === normalized || base.replace(/-/g, ' ') === normalized.replace(/-/g, ' ');
  });
  if (exact) return exact;
  var partial = docOrPdf.find(function (f) {
    var base = (f.name || '').toLowerCase();
    return base.indexOf(normalized) !== -1 || normalized.indexOf(base.replace(/\.[^.]*$/, '').trim()) !== -1;
  });
  return partial || null;
}

function getFileContentAsPdf(token, file) {
  if (file.mimeType === 'application/pdf') {
    return downloadFile(token, file.id);
  }
  return exportPdf(token, file.id);
}

function buildSalesPack(token, folderId, quote) {
  const projectName = quote.projectName || quote.companyName || '';
  const rakoQuote = quote.rqReference || '';

  return listFiles(token, folderId)
    .then(function (files) {
      const templateId = findTemplateDoc(files);
      if (!templateId) return Promise.reject(new Error('No template document found in the sales pack folder.'));

      const copyIdPromise = copyFile(token, templateId, 'Document Compiler cover');
      return copyIdPromise.then(function (copyId) {
        return replacePlaceholders(token, copyId, projectName, rakoQuote)
          .then(function () { return exportPdf(token, copyId); })
          .then(function (pdfBytes) {
            return deleteFile(token, copyId).catch(function () {})
              .then(function () { return pdfBytes; });
          });
      });
    })
    .then(function (firstPdfBytes) {
      return listFiles(token, folderId).then(function (files) {
        const productIds = (quote.products || [])
          .map(function (p) { return matchProductFile(files, p.normalizedName); })
          .filter(Boolean);
        if (productIds.length === 0) return firstPdfBytes;

        return Promise.all(productIds.map(function (id) { return exportPdf(token, id); }))
          .then(function (pdfBuffers) {
            return mergePdfs([firstPdfBytes].concat(pdfBuffers));
          });
      });
    });
}

function buildTechPack(token, folderId, quote) {
  const projectName = quote.projectName || quote.companyName || '';
  const rakoQuote = quote.rqReference || '';

  return findSubfolderByName(token, folderId, 'datasheets')
    .then(function (datasheetsId) {
      if (!datasheetsId) return Promise.reject(new Error('Datasheets subfolder not found.'));
      return listFiles(token, datasheetsId);
    })
    .then(function (files) {
      const templateId = findTemplateDoc(files);
      if (!templateId) return Promise.reject(new Error('No template document found in the datasheets folder.'));

      const copyIdPromise = copyFile(token, templateId, 'Document Compiler tech cover');
      return copyIdPromise.then(function (copyId) {
        return replacePlaceholders(token, copyId, projectName, rakoQuote)
          .then(function () { return exportPdf(token, copyId); })
          .then(function (pdfBytes) {
            return deleteFile(token, copyId).catch(function () {})
              .then(function () { return pdfBytes; });
          });
      });
    })
    .then(function (firstPdfBytes) {
      return findSubfolderByName(token, folderId, 'datasheets').then(function (datasheetsId) {
        return listFiles(token, datasheetsId);
      }).then(function (files) {
        const productFiles = (quote.products || [])
          .map(function (p) { return matchProductFileForTechPack(files, p.normalizedName); })
          .filter(Boolean);
        if (productFiles.length === 0) return firstPdfBytes;

        return Promise.all(productFiles.map(function (file) { return getFileContentAsPdf(token, file); }))
          .then(function (pdfBuffers) {
            return mergePdfs([firstPdfBytes].concat(pdfBuffers));
          });
      });
    });
}

function mergePdfs(arrayBuffers) {
  return PDFLib.PDFDocument.load(arrayBuffers[0]).then(function (mergedDoc) {
    var chain = Promise.resolve();
    for (var i = 1; i < arrayBuffers.length; i++) {
      (function (buf) {
        chain = chain.then(function () {
          return PDFLib.PDFDocument.load(buf).then(function (src) {
            var pageCount = src.getPageCount();
            var indices = [];
            for (var p = 0; p < pageCount; p++) indices.push(p);
            return mergedDoc.copyPages(src, indices).then(function (copied) {
              copied.forEach(function (page) { mergedDoc.addPage(page); });
            });
          });
        });
      })(arrayBuffers[i]);
    }
    return chain.then(function () { return mergedDoc.save(); });
  });
}

function arrayBufferToBase64(buffer) {
  var bytes = new Uint8Array(buffer);
  var chunkSize = 8192;
  var binary = '';
  for (var i = 0; i < bytes.length; i += chunkSize) {
    var chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type !== 'GENERATE_PACK') return;
  var pack = request.pack;
  var driveFolderId = request.driveFolderId;
  var quote = request.quote;

  getAuthToken()
    .then(function (token) {
      if (pack === 'tech') return buildTechPack(token, driveFolderId, quote);
      return buildSalesPack(token, driveFolderId, quote);
    })
    .then(function (pdfBytes) {
      var base64 = arrayBufferToBase64(pdfBytes);
      var safe = function (s) {
        return (s || '').replace(/[/\\:*?"<>|]/g, '').trim().slice(0, 100) || 'Unknown';
      };
      var packLabel = pack === 'tech' ? 'Tech Pack' : 'Sales Pack';
      var quotation = safe(quote.rqReference);
      var customer = safe(quote.projectName || quote.companyName);
      var filename = packLabel + ' - ' + quotation + ' - ' + customer + '.pdf';
      chrome.downloads.download({
        url: 'data:application/pdf;base64,' + base64,
        filename: filename,
        saveAs: true
      }, function () {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message || 'Download failed.' });
        } else {
          sendResponse({ ok: true });
        }
      });
    })
    .catch(function (err) {
      sendResponse({ error: err.message || 'Failed to generate pack.' });
    });

  return true;
});
