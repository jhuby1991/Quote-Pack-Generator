(function () {
  'use strict';

  const QUOTE_URL_REGEX = /[?#&]id=(\d+)/;

  function getQuoteId() {
    const m = window.location.href.match(QUOTE_URL_REGEX);
    return m ? parseInt(m[1], 10) : null;
  }

  function getText(el) {
    if (!el) return '';
    return (el.textContent || '').trim().replace(/\s+/g, ' ');
  }

  function findLabelThenContent(labelText) {
    const labels = Array.from(document.querySelectorAll('label.oe_form_label'));
    const label = labels.find(function (l) {
      return getText(l).indexOf(labelText) !== -1;
    });
    if (!label) return null;
    const tr = label.closest('tr');
    if (!tr) return null;
    const content = tr.querySelector('.oe_form_char_content, .oe_form_uri');
    return content ? getText(content) : null;
  }

  function getRqReference() {
    return findLabelThenContent('Quotation') || '';
  }

  function getProjectName() {
    const link = document.querySelector('a.oe_form_uri');
    if (!link) return '';
    return getText(link).replace(/\s+/g, ' ').trim();
  }

  function getOrderDate() {
    const found = findLabelThenContent('Date') || findLabelThenContent('Order Date');
    if (found) return found;
    const dates = document.querySelectorAll('.oe_form_field_date .oe_form_char_content');
    for (let i = 0; i < dates.length; i++) {
      const t = getText(dates[i]);
      if (t && t.length >= 8) return t;
    }
    return '';
  }

  function extractProductCode(cellText) {
    const match = (cellText || '').match(/\[([^\]]+)\]/);
    return match ? match[1].trim() : '';
  }

  function normalizeForDrive(name) {
    return name.toLowerCase().replace(/\s+/g, '-');
  }

  function getProductRows() {
    const rows = document.querySelectorAll('tr[data-id]');
    const lines = [];
    const seen = new Set();

    rows.forEach(function (row) {
      const productCell = row.querySelector('td[data-field="product_id"]');
      if (!productCell) return;

      const rawName = getText(productCell);
      const code = extractProductCode(rawName);
      if (!code || seen.has(code)) return;
      seen.add(code);

      const qtyCell = row.querySelector('td[data-field="product_uom_qty"]');
      const priceCell = row.querySelector('td[data-field="price_unit"]');
      const totalCell = row.querySelector('td[data-field="price_subtotal"]');

      const qty = qtyCell ? getText(qtyCell) : '';
      const cost = priceCell ? getText(priceCell) : '';
      const total = totalCell ? getText(totalCell) : '';

      lines.push({
        productCode: code,
        productName: '[' + code + ']',
        normalizedName: normalizeForDrive(code),
        quantity: qty,
        cost: cost,
        total: total
      });
    });

    return lines;
  }

  function scrapeQuote() {
    const quoteId = getQuoteId();
    if (!quoteId) {
      return { error: 'Not a quote page. Open a quotation first.' };
    }

    const rqRef = getRqReference();
    const projectName = getProjectName();
    const date = getOrderDate();
    const products = getProductRows();

    return {
      quoteId: quoteId,
      rqReference: rqRef,
      projectName: projectName,
      date: date,
      companyName: projectName,
      products: products,
      error: null
    };
  }

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
      if (request.type === 'SCRAPE_QUOTE') {
        try {
          sendResponse({ payload: scrapeQuote() });
        } catch (e) {
          sendResponse({ payload: { error: e.message } });
        }
      }
    });
  }
})();
