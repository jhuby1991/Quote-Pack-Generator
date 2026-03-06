(function () {
  'use strict';

  const QUOTE_STORAGE_KEY = 'documentCompilerQuote';
  const DRIVE_FOLDER_ID = '1hx5Ui1fpNLD_VknHC2C3MC-tPxG3AEVe';

  const loadBtn = document.getElementById('loadQuote');
  const quoteSection = document.getElementById('quoteSection');
  const companyEl = document.getElementById('companyName');
  const rqRefEl = document.getElementById('rqRef');
  const quoteDateEl = document.getElementById('quoteDate');
  const linesBody = document.getElementById('quoteLines');
  const salesPackBtn = document.getElementById('salesPack');
  const techPackBtn = document.getElementById('techPack');
  const messageEl = document.getElementById('message');
  const loadingEl = document.getElementById('loading');

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = 'message ' + (type || '');
    messageEl.classList.remove('hidden');
  }

  function hideMessage() {
    messageEl.classList.add('hidden');
  }

  function setLoading(on) {
    loadingEl.classList.toggle('hidden', !on);
  }

  function renderQuote(data) {
    companyEl.textContent = data.companyName || '—';
    rqRefEl.textContent = data.rqReference || '—';
    quoteDateEl.textContent = data.date || '—';
    linesBody.innerHTML = '';
    (data.products || []).forEach(function (p) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td>' + escapeHtml(p.productName) + '</td><td>' + escapeHtml(p.quantity) + '</td><td>' + escapeHtml(p.cost) + '</td><td>' + escapeHtml(p.total) + '</td>';
      linesBody.appendChild(tr);
    });
    quoteSection.classList.remove('hidden');
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  loadBtn.addEventListener('click', function () {
    hideMessage();
    loadBtn.disabled = true;
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tab = tabs[0];
      if (!tab || tab.url.indexOf('staff.rakocontrols.com') === -1) {
        showMessage('Open a quotation page at staff.rakocontrols.com first.', 'error');
        loadBtn.disabled = false;
        return;
      }
      chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_QUOTE' }, function (response) {
        loadBtn.disabled = false;
        if (chrome.runtime.lastError) {
          showMessage('Could not read the page. Reload the quote page and try again.', 'error');
          return;
        }
        const payload = response && response.payload;
        if (!payload) {
          showMessage('Could not read quote data.', 'error');
          return;
        }
        if (payload.error) {
          showMessage(payload.error, 'error');
          return;
        }
        chrome.storage.local.set({ [QUOTE_STORAGE_KEY]: payload });
        renderQuote(payload);
      });
    });
  });

  function getStoredQuote(cb) {
    chrome.storage.local.get(QUOTE_STORAGE_KEY, function (obj) {
      const data = obj[QUOTE_STORAGE_KEY];
      if (!data || !data.products || data.products.length === 0) {
        cb(null, 'Load a quotation first.');
        return;
      }
      cb(data, null);
    });
  }

  salesPackBtn.addEventListener('click', function () {
    hideMessage();
    getStoredQuote(function (data, err) {
      if (err) {
        showMessage(err, 'error');
        return;
      }
      salesPackBtn.disabled = true;
      setLoading(true);
      chrome.runtime.sendMessage({
        type: 'GENERATE_PACK',
        pack: 'sales',
        driveFolderId: DRIVE_FOLDER_ID,
        quote: data
      }, function (response) {
        salesPackBtn.disabled = false;
        setLoading(false);
        if (chrome.runtime.lastError) {
          showMessage(chrome.runtime.lastError.message, 'error');
          return;
        }
        if (response && response.error) {
          showMessage(response.error, 'error');
          return;
        }
        showMessage('Sales pack downloaded.', 'success');
      });
    });
  });

  techPackBtn.addEventListener('click', function () {
    hideMessage();
    getStoredQuote(function (data, err) {
      if (err) {
        showMessage(err, 'error');
        return;
      }
      techPackBtn.disabled = true;
      setLoading(true);
      chrome.runtime.sendMessage({
        type: 'GENERATE_PACK',
        pack: 'tech',
        driveFolderId: DRIVE_FOLDER_ID,
        quote: data
      }, function (response) {
        techPackBtn.disabled = false;
        setLoading(false);
        if (chrome.runtime.lastError) {
          showMessage(chrome.runtime.lastError.message, 'error');
          return;
        }
        if (response && response.error) {
          showMessage(response.error, 'error');
          return;
        }
        showMessage('Tech pack downloaded.', 'success');
      });
    });
  });

  chrome.storage.local.get(QUOTE_STORAGE_KEY, function (obj) {
    const data = obj[QUOTE_STORAGE_KEY];
    if (data && data.products && data.products.length > 0) {
      renderQuote(data);
    }
  });
})();
