// Responsive Viewport Tester preview page. Renders the target URL in an iframe
// at an exact device viewport size (any width, including phone widths the real
// window can't shrink to) and scales it to fit. Frame-blocking response headers
// are stripped by the background worker's DNR rule, scoped to THIS tab only.

const DEVICES = [
  { group: "Breakpoints", items: [
    ["Tailwind sm", 640, 800], ["Tailwind md", 768, 1024], ["Tailwind lg", 1024, 768],
    ["Tailwind xl", 1280, 800], ["Tailwind 2xl", 1536, 864],
  ]},
  { group: "Phones", items: [
    ["iPhone SE", 375, 667], ["iPhone 13/14", 390, 844], ["iPhone 15/16", 393, 852],
    ["iPhone 15 Pro Max", 430, 932], ["iPhone 16 Pro Max", 440, 956],
    ["Pixel 8", 412, 915], ["Pixel 8 Pro", 448, 998],
    ["Galaxy S24", 360, 780], ["Galaxy S24 Ultra", 412, 883], ["Galaxy Z Fold 5", 344, 882],
  ]},
  { group: "Tablets", items: [
    ["iPad Mini", 768, 1024], ["iPad 10.9\"", 810, 1080], ["iPad Air", 820, 1180],
    ["iPad Pro 11\"", 834, 1194], ["iPad Pro 12.9\"", 1024, 1366],
    ["Galaxy Tab S9", 800, 1280], ["Surface Pro", 912, 1368],
  ]},
  { group: "Laptops & Desktops", items: [
    ["Laptop", 1366, 768], ["Laptop L", 1440, 900], ["Desktop", 1920, 1080], ["4K", 2560, 1440],
  ]},
];

const params = new URLSearchParams(location.search);
// Only web (and file) pages may be previewed — never javascript:, data:,
// chrome:, etc. The popup already filters, this makes it safe by construction.
const rawTarget = params.get("url") || "";
const targetUrl = /^(https?|file):/i.test(rawTarget) ? rawTarget : "";
let w = Math.max(200, parseInt(params.get("w"), 10) || 390);
let h = Math.max(200, parseInt(params.get("h"), 10) || 844);

const $ = (id) => document.getElementById(id);
const stage = $("stage");
const wEl = $("w"), hEl = $("h"), zoomEl = $("zoom"), deviceEl = $("device"), readout = $("readout"), urlEl = $("url");

urlEl.textContent = targetUrl;
urlEl.title = targetUrl;
document.title = "Responsive · " + targetUrl;

// Populate device dropdown (grouped)
deviceEl.innerHTML = '<option value="">Custom</option>' + DEVICES.map((g) =>
  `<optgroup label="${g.group}">` + g.items.map(([name, dw, dh]) =>
    `<option value="${dw}x${dh}">${name} · ${dw}×${dh}</option>`).join("") + "</optgroup>").join("");

let frameWrap, iframe;

function buildFrame() {
  stage.innerHTML = "";
  frameWrap = document.createElement("div");
  frameWrap.className = "frame-wrap";
  const label = document.createElement("div");
  label.className = "frame-label";
  iframe = document.createElement("iframe");
  iframe.id = "previewFrame";
  iframe.setAttribute("allow", "fullscreen");
  frameWrap.append(label, iframe);
  stage.appendChild(frameWrap);
  frameWrap._label = label;
}

function currentScale() {
  const z = zoomEl.value;
  if (z !== "fit") return parseFloat(z);
  const availW = stage.clientWidth - 48;
  const availH = stage.clientHeight - 48;
  return Math.min(1, availW / w, availH / h);
}

function layout() {
  if (!iframe) buildFrame();
  iframe.style.width = w + "px";
  iframe.style.height = h + "px";
  const scale = currentScale();
  iframe.style.transform = "scale(" + scale + ")";
  frameWrap.style.width = w * scale + "px";
  frameWrap.style.height = h * scale + "px";
  frameWrap._label.textContent = w + " × " + h + (scale < 0.999 ? "  ·  " + Math.round(scale * 100) + "%" : "");
  readout.textContent = w + " × " + h + " px";
  wEl.value = w; hEl.value = h;
  // reflect matching device in dropdown
  deviceEl.value = DEVICES.some((g) => g.items.some((i) => i[1] === w && i[2] === h)) ? w + "x" + h : "";
}

function loadFrame() {
  if (!iframe) buildFrame();
  iframe.src = targetUrl;
}

// Apply size from device / inputs
deviceEl.addEventListener("change", () => {
  if (!deviceEl.value) return;
  const [dw, dh] = deviceEl.value.split("x").map(Number);
  w = dw; h = dh; layout();
});
const applyInputs = () => {
  w = Math.max(200, Math.min(5000, parseInt(wEl.value, 10) || w));
  h = Math.max(200, Math.min(5000, parseInt(hEl.value, 10) || h));
  layout();
};
wEl.addEventListener("change", applyInputs);
hEl.addEventListener("change", applyInputs);
$("rotate").addEventListener("click", () => { const t = w; w = h; h = t; layout(); });
zoomEl.addEventListener("change", layout);
$("reload").addEventListener("click", () => { if (iframe) iframe.src = targetUrl; });
$("openTab").addEventListener("click", () => { if (targetUrl) chrome.tabs.create({ url: targetUrl }); });
window.addEventListener("resize", () => { if (zoomEl.value === "fit") layout(); });

// Mobile user-agent emulation: update the per-tab DNR rule, then reload the frame
$("ua").addEventListener("change", (e) => {
  chrome.runtime.sendMessage({ type: "RESP_ENABLE", mobileUA: e.target.checked }, () => {
    if (iframe) iframe.src = targetUrl;
  });
});

// ── Full-page screenshot of the device viewport ──
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const captureTile = () => new Promise((res) => chrome.runtime.sendMessage({ type: "CAPTURE_TAB" }, (r) => res((r && r.dataUrl) || null)));
const loadImg = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error("decode failed")); im.src = src; });

// Inject/remove a scrollbar-hiding style INSIDE the previewed iframe so the
// page's own scrollbar isn't baked into the screenshot.
async function setFrameScrollbar(tabId, frameId, hide) {
  await chrome.scripting.executeScript({
    target: { tabId, frameIds: [frameId] },
    args: [hide],
    func: (hide) => {
      const ID = "__wdtHideScrollbar";
      const ex = document.getElementById(ID);
      if (hide) {
        if (!ex) {
          const el = document.createElement("style");
          el.id = ID;
          el.textContent = "html{scrollbar-width:none !important}::-webkit-scrollbar{width:0 !important;height:0 !important;display:none !important}";
          (document.head || document.documentElement).appendChild(el);
        }
      } else if (ex) {
        ex.remove();
      }
    },
  });
}

async function captureDevice() {
  const btn = $("shot"), prog = $("shotProg");
  const SHOT_MAX = 32760;
  const savedZoom = zoomEl.value, savedScroll = stage.scrollTop;
  const bar = document.querySelector(".bar");
  let sbStyle = null, tabId = null, childFrameId = null;
  btn.disabled = true; prog.textContent = "Preparing…";
  try {
    const tab = await chrome.tabs.getCurrent();
    if (!tab) throw new Error("no tab");
    tabId = tab.id;
    // Find the preview iframe's frame id (the top frame is an extension page that
    // isn't injectable under <all_urls>, so target the child frame explicitly),
    // hide its scrollbar, then measure the page's full content height.
    let contentH = h;
    try {
      const frames = await chrome.webNavigation.getAllFrames({ tabId });
      let child = (frames || []).find((f) => f.parentFrameId === 0 && f.frameId !== 0 && /^https?:/i.test(f.url || ""))
        || (frames || []).find((f) => f.frameId !== 0 && /^https?:/i.test(f.url || ""));
      if (child) {
        childFrameId = child.frameId;
        await setFrameScrollbar(tabId, childFrameId, true);
        const r = await chrome.scripting.executeScript({
          target: { tabId, frameIds: [childFrameId] },
          func: () => Math.max(
            document.documentElement.scrollHeight,
            document.body ? document.body.scrollHeight : 0,
            document.documentElement.offsetHeight,
            document.body ? document.body.offsetHeight : 0
          ),
        });
        const val = r && r[0] && r[0].result;
        if (val && val > 0) contentH = Math.max(h, val);
      }
    } catch (_) {}

    const dpr = window.devicePixelRatio || 1;
    const scale = Math.min(1, window.innerWidth / w); // fit width so there's no horizontal scroll
    // Lay out for capture: hide toolbar + the stage's own scrollbar, drop padding,
    // and expand the iframe to full height. The frame stays CENTERED (no left
    // shift) — we crop to its actual on-screen position.
    bar.style.display = "none";
    stage.style.padding = "0";
    stage.style.scrollbarWidth = "none";
    sbStyle = document.createElement("style");
    sbStyle.textContent = "#stage::-webkit-scrollbar{display:none!important}";
    document.head.appendChild(sbStyle);
    frameWrap._label.style.display = "none";
    iframe.style.width = w + "px"; iframe.style.height = contentH + "px"; iframe.style.transform = "scale(" + scale + ")";
    frameWrap.style.width = (w * scale) + "px"; frameWrap.style.height = (contentH * scale) + "px";
    stage.scrollTop = 0;
    await sleep(220); // let layout settle + lazy images (now all in view) load

    const fw = Math.round(w * scale * dpr);
    const cropX = Math.max(0, Math.round(frameWrap.getBoundingClientRect().left * dpr)); // crop to the centered frame
    const viewH = stage.clientHeight; // the stage is the scroll container, not the window
    const totalCss = Math.min(contentH * scale, Math.floor(SHOT_MAX / dpr));
    const truncated = contentH * scale > totalCss + 1;
    const ch = Math.round(totalCss * dpr);
    const canvas = document.createElement("canvas");
    canvas.width = fw; canvas.height = ch;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, fw, ch);

    const rows = Math.max(1, Math.ceil(totalCss / viewH));
    let prevBottom = 0;
    for (let i = 0; i < rows; i++) {
      let y = i * viewH;
      if (y > totalCss - viewH) y = Math.max(0, totalCss - viewH);
      stage.scrollTop = y;
      await sleep(i === 0 ? 240 : 340); // scroll settle + capture rate-limit headroom
      prog.textContent = "Capturing " + (i + 1) + " / " + rows + "…";
      let url = await captureTile();
      if (!url) { await sleep(800); url = await captureTile(); }
      if (!url) throw new Error("Capture was rate-limited. Wait a moment and try again.");
      const img = await loadImg(url);
      let dy = Math.round(y * dpr);
      if (i > 0 && dy > prevBottom) dy = prevBottom; // close sub-pixel seams
      ctx.drawImage(img, cropX, 0, fw, img.height, 0, dy, fw, img.height);
      prevBottom = dy + img.height;
    }

    prog.textContent = "Saving…";
    const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
    if (!blob) throw new Error("Image too large to export.");
    let host = "page"; try { host = new URL(targetUrl).hostname.replace(/^www\./, ""); } catch (_) {}
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = host.replace(/[^\w.-]+/g, "-") + "-" + w + "x" + contentH + ".png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    prog.textContent = truncated ? "Saved (truncated, page very tall)" : "Saved ✓";
    setTimeout(() => { prog.textContent = ""; }, 2600);
  } catch (e) {
    prog.textContent = e.message || "Screenshot failed";
  } finally {
    if (sbStyle) sbStyle.remove();
    if (tabId && childFrameId != null) { try { await setFrameScrollbar(tabId, childFrameId, false); } catch (_) {} }
    bar.style.display = "";
    stage.style.padding = ""; stage.style.scrollbarWidth = "";
    frameWrap._label.style.display = "";
    zoomEl.value = savedZoom; layout(); stage.scrollTop = savedScroll;
    btn.disabled = false;
  }
}
$("shot").addEventListener("click", captureDevice);

// Guard: no URL
if (!targetUrl) {
  stage.innerHTML = '<div class="msg">No page URL was provided.</div>';
} else {
  // Enable header stripping for THIS tab, then load the frame.
  buildFrame();
  layout();
  chrome.runtime.sendMessage({ type: "RESP_ENABLE" }, () => {
    loadFrame();
  });
}
