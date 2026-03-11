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
  const orderPackBtn = document.getElementById('orderPack');
  const techPackBtn = document.getElementById('techPack');
  const messageEl = document.getElementById('message');
  const loadingEl = document.getElementById('loading');
  const loadingTextEl = document.getElementById('loadingText');
  const orderSection = document.getElementById('orderSection');
  const orderList = document.getElementById('orderList');
  const generateFromOrderBtn = document.getElementById('generateFromOrder');
  const closeOrderBtn = document.getElementById('closeOrder');

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = 'message ' + (type || '');
    messageEl.classList.remove('hidden');
  }

  function hideMessage() {
    messageEl.classList.add('hidden');
  }

  function setLoading(on, text) {
    if (!loadingEl) return;
    if (on) {
      loadingEl.classList.remove('hidden');
      if (loadingTextEl) {
        loadingTextEl.textContent = text || 'Preparing documents…';
      }
    } else {
      loadingEl.classList.add('hidden');
    }
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

  function getOrderOptions() {
    var opt6 = [];
    if (document.getElementById('opt6a') && document.getElementById('opt6a').checked) opt6.push('Integration');
    if (document.getElementById('opt6b') && document.getElementById('opt6b').checked) opt6.push('Supp. Products');
    return {
      option1: document.getElementById('opt1') ? document.getElementById('opt1').checked : false,
      option2: (document.getElementById('opt2') && document.getElementById('opt2').value) || '',
      option3: (document.getElementById('opt3') && document.getElementById('opt3').value) || '',
      option4: (document.getElementById('opt4') && document.getElementById('opt4').value) || '',
      option5: (document.getElementById('opt5') && document.getElementById('opt5').value) || '',
      option6: opt6.length === 1 ? opt6[0] : (opt6.length > 1 ? opt6 : null)
    };
  }

  function buildOrderListFromOptions() {
    var fn = window.getDefaultOrderedFilenames;
    return fn ? fn(getOrderOptions()) : [];
  }

  function renderOrderList(filenames) {
    if (!orderList) return;
    orderList.innerHTML = '';
    (filenames || []).forEach(function (name) {
      var li = document.createElement('li');
      li.draggable = true;
      li.dataset.filename = name;
      li.innerHTML = '<span class="drag-handle" aria-hidden="true"></span><span class="filename">' + escapeHtml(name) + '</span>';
      orderList.appendChild(li);
    });
    setupListDragDrop();
  }

  function setupListDragDrop() {
    if (!orderList) return;
    var dragged = null;
    orderList.querySelectorAll('li').forEach(function (li) {
      li.addEventListener('dragstart', function (e) {
        dragged = li;
        li.classList.add('dragging');
        e.dataTransfer.setData('text/plain', li.dataset.filename || '');
        e.dataTransfer.effectAllowed = 'move';
      });
      li.addEventListener('dragend', function () {
        li.classList.remove('dragging');
        dragged = null;
      });
      li.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragged && dragged !== li) li.parentNode.insertBefore(dragged, li);
      });
    });
  }

  function getOrderFromList() {
    if (!orderList) return [];
    var out = [];
    orderList.querySelectorAll('li').forEach(function (li) {
      if (li.dataset.filename) out.push(li.dataset.filename);
    });
    return out;
  }

  if (orderPackBtn) {
    orderPackBtn.addEventListener('click', function () {
      hideMessage();
      getStoredQuote(function (data, err) {
        if (err) {
          showMessage(err, 'error');
          return;
        }
        var filenames = buildOrderListFromOptions();
        renderOrderList(filenames);
        if (orderSection) orderSection.classList.remove('hidden');
      });
    });
  }

  function addOptionListeners() {
    var ids = ['opt1', 'opt2', 'opt3', 'opt4', 'opt5', 'opt6a', 'opt6b'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', function () {
        renderOrderList(buildOrderListFromOptions());
      });
    });
  }
  addOptionListeners();

  if (closeOrderBtn) {
    closeOrderBtn.addEventListener('click', function () {
      if (orderSection) orderSection.classList.add('hidden');
    });
  }

  if (generateFromOrderBtn) {
    generateFromOrderBtn.addEventListener('click', function () {
      hideMessage();
      var ordered = getOrderFromList();
      if (ordered.length === 0) {
        showMessage('Add options or use default order.', 'error');
        return;
      }
      getStoredQuote(function (data, err) {
        if (err) {
          showMessage(err, 'error');
          return;
        }
        generateFromOrderBtn.disabled = true;
        setLoading(true, 'Gathering sales documents from Drive…');
        chrome.runtime.sendMessage({
          type: 'GENERATE_PACK',
          pack: 'sales',
          driveFolderId: DRIVE_FOLDER_ID,
          quote: data,
          orderedFilenames: ordered
        }, function (response) {
          generateFromOrderBtn.disabled = false;
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
          if (orderSection) orderSection.classList.add('hidden');
        });
      });
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
      setLoading(true, 'Gathering sales documents from Drive…');
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
      setLoading(true, 'Gathering datasheets and building tech pack…');
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
