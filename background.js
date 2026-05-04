const urlCache = new Map();

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
    const headRes = await fetch(url, { method: 'HEAD', redirect: 'follow', signal });
    clear();
    const elapsed = Date.now() - startTime;
    const isRedirect = headRes.url !== url;
    result = { url, status: headRes.status, ok: headRes.status >= 200 && headRes.status < 400, finalUrl: headRes.url, isRedirect, elapsed, error: null };
  } catch (headErr) {
    try {
      const { signal, clear } = makeAbort();
      const getRes = await fetch(url, { method: 'GET', redirect: 'follow', signal });
      clear();
      const elapsed = Date.now() - startTime;
      const isRedirect = getRes.url !== url;
      result = { url, status: getRes.status, ok: getRes.status >= 200 && getRes.status < 400, finalUrl: getRes.url, isRedirect, elapsed, error: null };
    } catch (getErr) {
      result = { url, status: 0, ok: false, finalUrl: url, isRedirect: false, elapsed: Date.now() - startTime, error: getErr.message || 'Network error' };
    }
  }

  urlCache.set(url, result);
  return result;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "API_REQUEST") {
    const { url, method, headers, body } = message;
    const opts = { method: method || "GET", headers: headers || {} };
    if (body && method !== "GET" && method !== "HEAD") opts.body = body;

    const startTime = Date.now();
    fetch(url, opts)
      .then(async res => {
        const elapsed = Date.now() - startTime;
        const contentType = res.headers.get("content-type") || "";
        const text = await res.text();
        let json = null;
        if (contentType.includes("json")) {
          try { json = JSON.parse(text); } catch {}
        }
        sendResponse({ ok: true, status: res.status, statusText: res.statusText, contentType, body: text, json, elapsed });
      })
      .catch(err => sendResponse({ ok: false, error: err.message }));

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
