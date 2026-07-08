const urlCache = new Map();
const URL_CACHE_MAX = 2000;

// Responsive Viewport Tester: strip frame-blocking headers, but ONLY for the
// specific preview tab (scoped via tabIds), so the rest of the browser is
// unaffected. The rule id is the tab id; cleaned up when the tab closes.
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [tabId] }).catch(() => {});
});

// If the preview tab navigates away from responsive.html (e.g. the user reuses
// the tab to browse), drop its rule immediately — otherwise every site visited
// in that tab would load its iframes with CSP/XFO stripped. Rule ids are tab
// ids and only the responsive tester creates session rules, so removing a
// nonexistent id for ordinary tabs is a harmless no-op.
chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return;
  if (details.url.startsWith(chrome.runtime.getURL("responsive.html"))) return;
  chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [details.tabId] }).catch(() => {});
});

function cacheResult(url, result) {
  if (urlCache.size >= URL_CACHE_MAX) {
    urlCache.delete(urlCache.keys().next().value);
  }
  urlCache.set(url, result);
}

async function checkSingleUrl(url) {
  if (urlCache.has(url)) return urlCache.get(url);

  const startTime = Date.now();
  let result;

  const makeAbort = () => {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), 12000);
    return { signal: ctrl.signal, clear: () => clearTimeout(id) };
  };

  try {
    const { signal, clear } = makeAbort();
    // credentials:'omit' — link checks must never ride the user's session:
    // a page full of /logout or /delete?id= links would otherwise hit them
    // authenticated (the extension's host permissions attach cookies by default).
    const headRes = await fetch(url, { method: 'HEAD', redirect: 'follow', credentials: 'omit', signal });
    clear();
    const elapsed = Date.now() - startTime;
    const isRedirect = headRes.url !== url;
    result = { url, status: headRes.status, ok: headRes.status >= 200 && headRes.status < 400, finalUrl: headRes.url, isRedirect, elapsed, error: null };
  } catch (headErr) {
    try {
      const { signal, clear } = makeAbort();
      const getRes = await fetch(url, { method: 'GET', redirect: 'follow', credentials: 'omit', signal });
      clear();
      const elapsed = Date.now() - startTime;
      const isRedirect = getRes.url !== url;
      result = { url, status: getRes.status, ok: getRes.status >= 200 && getRes.status < 400, finalUrl: getRes.url, isRedirect, elapsed, error: null };
    } catch (getErr) {
      result = { url, status: 0, ok: false, finalUrl: url, isRedirect: false, elapsed: Date.now() - startTime, error: getErr.message || 'Network error' };
    }
  }

  cacheResult(url, result);
  return result;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only accept messages from this extension's own pages
  if (sender.id !== chrome.runtime.id) {
    sendResponse({ error: "Unauthorized sender." });
    return true;
  }

  // Network-touching messages are for the popup / extension pages only.
  // Content scripts (which always have sender.tab) never need them — this
  // keeps the fetch proxy out of reach of code running inside web pages.
  if ((message.type === "API_REQUEST" || message.type === "LINK_CHECK") && sender.tab) {
    sendResponse({ error: "Not allowed from this context." });
    return true;
  }

  if (message.type === "API_REQUEST") {
    const { url, method, headers, body } = message;
    // credentials:'omit' — these are public files (robots.txt, llms.txt,
    // sitemaps, page HTML for detection); never send the user's cookies.
    const opts = { method: method || "GET", headers: headers || {}, credentials: "omit" };
    if (body && method !== "GET" && method !== "HEAD") opts.body = body;

    const startTime = Date.now();
    fetch(url, opts)
      .then(async res => {
        const elapsed = Date.now() - startTime;
        const contentType = res.headers.get("content-type") || "";
        // Expose all response headers (the extension has host permissions, so
        // CORS doesn't gate header access) — the Tech Stack Detector reads
        // Server, X-Powered-By, CF-Ray, etc. from here.
        const headersObj = {};
        try { res.headers.forEach((v, k) => { headersObj[k.toLowerCase()] = v; }); } catch (_) {}
        const text = await res.text();
        let json = null;
        if (contentType.includes("json")) {
          try { json = JSON.parse(text); } catch {}
        }
        sendResponse({ ok: true, status: res.status, statusText: res.statusText, contentType, headers: headersObj, body: text, json, elapsed });
      })
      .catch(err => sendResponse({ ok: false, error: err.message }));

    return true;
  }

  // Page pickers (font, component) ask to reopen the popup after capture
  // so the user immediately sees the result. Works on Chrome 127+; older
  // versions fail silently and the on-page confirmation covers it.
  // The page color picker asks for a fresh screenshot after scrolling
  if (message.type === "CAPTURE_TAB") {
    // Page pickers send from a content script (sender.tab is set); the
    // Screenshot tool sends from the popup (no sender.tab) and passes windowId.
    const windowId = message.windowId ?? sender.tab?.windowId;
    chrome.tabs.captureVisibleTab(windowId, { format: "png" }, (dataUrl) => {
      sendResponse({ dataUrl: chrome.runtime.lastError ? null : dataUrl });
    });
    return true;
  }

  if (message.type === "RESP_ENABLE") {
    const tabId = sender.tab?.id;
    if (!tabId) { sendResponse({ ok: false }); return true; }
    const MOBILE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    const action = {
      type: "modifyHeaders",
      responseHeaders: [
        { header: "x-frame-options", operation: "remove" },
        { header: "content-security-policy", operation: "remove" },
        { header: "content-security-policy-report-only", operation: "remove" },
        { header: "frame-options", operation: "remove" },
      ],
    };
    if (message.mobileUA) {
      action.requestHeaders = [
        { header: "user-agent", operation: "set", value: MOBILE_UA },
        { header: "sec-ch-ua-mobile", operation: "set", value: "?1" },
        { header: "sec-ch-ua-platform", operation: "set", value: '"iOS"' },
      ];
    }
    chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [tabId],
      addRules: [{ id: tabId, priority: 1, action, condition: { tabIds: [tabId], resourceTypes: ["sub_frame"] } }],
    }).then(() => sendResponse({ ok: true })).catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  if (message.type === "REOPEN_POPUP") {
    try {
      chrome.action.openPopup().catch(() => {});
    } catch (_) {}
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "LINK_CHECK") {
    const { urls, clearCache } = message;
    if (clearCache) urlCache.clear();

    Promise.allSettled((urls || []).map(url => checkSingleUrl(url)))
      .then(settled => {
        sendResponse({
          results: settled.map((r, i) =>
            r.status === 'fulfilled'
              ? r.value
              : { url: urls[i], status: 0, ok: false, finalUrl: urls[i], isRedirect: false, elapsed: 0, error: r.reason?.message || 'Unknown error' }
          )
        });
      });

    return true;
  }

  sendResponse({ error: "Unknown message type." });
  return true;
});
