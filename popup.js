// ─── Shared HTML escape — safe for both element and attribute contexts ──────
window.escapeHtml = function (s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// ─── Toast notifications ─────────────────────────────────────────────────────
window.showToast = function (msg, type = "success") {
  let t = document.getElementById("wdtToast");
  if (!t) {
    t = document.createElement("div");
    t.id = "wdtToast";
    t.setAttribute("role", "status");
    t.setAttribute("aria-live", "polite");
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.remove("show", "toast--error");
  if (type === "error") t.classList.add("toast--error");
  void t.offsetWidth; // restart the slide-in animation on rapid re-trigger
  t.classList.add("show");
  clearTimeout(t._hideTimer);
  t._hideTimer = setTimeout(() => t.classList.remove("show"), 1600);
};

// ─── Unified clipboard helper — every copy button goes through here ─────────
window.copyToClipboard = function (text, btn) {
  return navigator.clipboard.writeText(text).then(() => {
    showToast("Copied to clipboard");
    if (btn) {
      btn.classList.add("btn-copied");
      setTimeout(() => btn.classList.remove("btn-copied"), 1200);
    }
  }).catch(() => showToast("Copy failed", "error"));
};

// ─── Syntax highlighter ──────────────────────────────────────────────────────
(function () {
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function tok(cls, s) { return `<span class="sh-${cls}">${s}</span>`; }

  function highlightCSS(code) {
    let out = ''; let i = 0;
    const src = code;
    let prevSig = '\n'; // track last non-whitespace char for context

    while (i < src.length) {
      // Whitespace — preserve exactly
      if (/[ \t\r\n]/.test(src[i])) {
        const m = src.slice(i).match(/^[ \t\r\n]+/)[0];
        out += m; if (m.includes('\n')) prevSig = '\n'; i += m.length; continue;
      }
      // Comment
      if (src[i] === '/' && src[i + 1] === '*') {
        const end = src.indexOf('*/', i + 2); const s = end < 0 ? src.slice(i) : src.slice(i, end + 2);
        out += tok('comment', esc(s)); i += s.length; continue;
      }
      // String
      if (src[i] === '"' || src[i] === "'") {
        const q = src[i]; let j = i + 1;
        while (j < src.length && src[j] !== q) { if (src[j] === '\\') j++; j++; }
        out += tok('string', esc(src.slice(i, j + 1))); prevSig = q; i = j + 1; continue;
      }
      // At-rule
      if (src[i] === '@') {
        const m = src.slice(i).match(/^@[\w-]+/);
        if (m) { out += tok('atrule', esc(m[0])); prevSig = 'x'; i += m[0].length; continue; }
      }
      // Hex colour
      if (src[i] === '#') {
        const m = src.slice(i).match(/^#[0-9a-fA-F]{3,8}(?=[\s,;)\n]|$)/);
        if (m) { out += tok('hex', esc(m[0])); prevSig = 'x'; i += m[0].length; continue; }
      }
      // var(--name)
      if (src.slice(i, i + 4) === 'var(') {
        const m = src.slice(i).match(/^var\(\s*(--[\w-]+)\s*\)/);
        if (m) { out += tok('fn', 'var(') + tok('var', esc(m[1])) + tok('punct', ')'); prevSig = ')'; i += m[0].length; continue; }
      }
      // CSS function
      const fnRe = /^(clamp|calc|min|max|rgba?|hsla?|hwb|color|linear-gradient|radial-gradient|conic-gradient|repeating-[\w-]+|var|env|url|format|local|translate(?:[XYZ]|3d)?|rotate(?:[XYZ]|3d)?|scale(?:[XY]|3d)?|skew[XY]?|matrix(?:3d)?|perspective|cubic-bezier|steps|blur|brightness|contrast|drop-shadow|grayscale|hue-rotate|invert|opacity|saturate|sepia)\s*(?=\()/i;
      const fnM = src.slice(i).match(fnRe);
      if (fnM) { out += tok('fn', esc(fnM[0])); prevSig = '('; i += fnM[0].length; continue; }
      // CSS custom property
      if (src[i] === '-' && src[i + 1] === '-') {
        const m = src.slice(i).match(/^--[\w-]+/);
        if (m) { out += tok('var', esc(m[0])); prevSig = 'x'; i += m[0].length; continue; }
      }
      // Number + unit
      if (/[-\d.]/.test(src[i]) && (i === 0 || /[\s,(:+\-*\/]/.test(src[i - 1]))) {
        const m = src.slice(i).match(/^-?\d*\.?\d+(?:px|r?em|vw|vh|vmin|vmax|svh|svw|dvh|dvw|cqw|cqh|%|ms?|deg|turn|grad|rad|fr|ch|ex|ic|lh|rlh|cap)?/);
        if (m && m[0].length) {
          const unitM = m[0].match(/(px|r?em|vw|vh|vmin|vmax|svh|svw|dvh|dvw|cqw|cqh|%|ms?|deg|turn|grad|rad|fr|ch|ex|ic|lh|rlh|cap)$/);
          if (unitM) { const num = m[0].slice(0, -unitM[0].length); out += tok('number', esc(num)) + tok('unit', unitM[0]); }
          else { out += tok('number', esc(m[0])); }
          prevSig = 'x'; i += m[0].length; continue;
        }
      }
      // Identifier
      if (/[a-zA-Z_\\]/.test(src[i])) {
        const m = src.slice(i).match(/^[\w-]+/);
        if (m) {
          const kwRe = /^(none|auto|inherit|initial|unset|revert|normal|bold|italic|oblique|relative|absolute|fixed|sticky|static|flex|grid|block|inline(?:-block|-flex|-grid)?|contents|flow-root|list-item|center|start|end|left|right|top|bottom|middle|space-between|space-around|space-evenly|stretch|baseline|nowrap|wrap(?:-reverse)?|solid|dashed|dotted|double|hidden|visible|scroll|clip|ellipsis|break-all|break-word|pointer|default|text|crosshair|move|grab|ease(?:-in)?(?:-out)?|linear|step-start|step-end|forwards|backwards|both|infinite|alternate(?:-reverse)?|reverse|paused|running|transparent|currentColor|currentcolor|minmax|fit-content|max-content|min-content|subgrid|dense|row|column|fill|stroke|contain|cover|round|space|no-repeat|repeat(?:-x|-y)?|uppercase|lowercase|capitalize|underline|overline|line-through|serif|sans-serif|monospace|cursive|fantasy|system-ui|pre|pre-wrap|pre-line|nowrap|thin|medium|thick|border-box|content-box|padding-box)$/;
          // Property: after { ; \n and followed by colon (not ::)
          const isAfterBlock = /[\n;{]/.test(prevSig);
          const afterIdent = src.slice(i + m[0].length).trimStart();
          const isBeforeColon = afterIdent.startsWith(':') && !afterIdent.startsWith('::');
          if (isAfterBlock && isBeforeColon) { out += tok('prop', esc(m[0])); }
          else if (kwRe.test(m[0])) { out += tok('kw', m[0]); }
          else { out += esc(m[0]); }
          prevSig = m[0].slice(-1); i += m[0].length; continue;
        }
      }
      // Punctuation
      if ('{};:,()[]|!*+>~'.includes(src[i])) {
        out += tok('punct', esc(src[i])); prevSig = src[i]; i++; continue;
      }
      out += esc(src[i]); prevSig = src[i]; i++;
    }
    return out;
  }

  function highlightJSON(code) {
    let out = ''; let i = 0;
    while (i < code.length) {
      if (/\s/.test(code[i])) { out += code[i++]; continue; }
      if (code[i] === '"') {
        let j = i + 1; while (j < code.length && code[j] !== '"') { if (code[j] === '\\') j++; j++; }
        const s = code.slice(i, j + 1);
        const after = code.slice(j + 1).trimStart();
        out += after[0] === ':' ? tok('key', esc(s)) : tok('string', esc(s));
        i = j + 1; continue;
      }
      const numM = code.slice(i).match(/^-?\d+\.?\d*(?:[eE][+-]?\d+)?/);
      if (numM) { out += tok('number', numM[0]); i += numM[0].length; continue; }
      const kwM = code.slice(i).match(/^(?:true|false|null)/);
      if (kwM) { out += tok('kw', kwM[0]); i += kwM[0].length; continue; }
      if ('{[]},:'.includes(code[i])) { out += tok('punct', esc(code[i])); i++; continue; }
      out += esc(code[i]); i++;
    }
    return out;
  }

  function highlightText(code) { return esc(code); }

  window._hl = function (code, lang) {
    if (!code) return '';
    try {
      if (lang === 'json') return highlightJSON(code);
      if (lang === 'text') return highlightText(code);
      return highlightCSS(code);
    } catch (e) { return esc(code); }
  };

  // Helper: set code element with syntax highlighting, preserving raw text in dataset
  window._setCode = function (el, raw, lang) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;
    el.dataset.raw = raw;
    el.innerHTML = window._hl(raw, lang || 'css');
  };
})();

document.addEventListener("DOMContentLoaded", () => {

  // ─── SVG icon helper (replaces emojis throughout) ────────────────────────────
  const SI = {
    pass: `<svg class="status-icon status-icon--pass" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
    warn: `<svg class="status-icon status-icon--warn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    fail: `<svg class="status-icon status-icon--fail" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    info: `<svg class="status-icon status-icon--info" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    critical: `<svg class="status-icon status-icon--fail" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    expired: `<svg class="status-icon status-icon--fail" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    valid: `<svg class="status-icon status-icon--pass" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
  };

  // ─── Shared color math ──────────────────────────────────────────────────────
  // Used by Color Picker, Contrast, Page Palette, Color Scale and
  // Glassmorphism — kept eager so any of those tools can lazy-init first.
  const hexToRgb = (hex) => {
    const intVal = parseInt(hex.slice(1), 16);
    return {
      r: (intVal >> 16) & 255,
      g: (intVal >> 8) & 255,
      b: intVal & 255
    };
  };

  const rgbToHsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  };

  const hslToHex = (h, s, l) => {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
  };

  // sRGB → OKLCH (modern CSS color space, perceptually uniform)
  const hexToOklch = (hex) => {
    const { r, g, b } = hexToRgb(hex);
    const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const [lr, lg, lb] = [lin(r), lin(g), lin(b)];
    const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
    const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
    const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
    const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
    const A = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
    const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
    const C = Math.sqrt(A * A + B * B);
    let H = Math.atan2(B, A) * 180 / Math.PI;
    if (H < 0) H += 360;
    return `oklch(${(L * 100).toFixed(1)}% ${C.toFixed(3)} ${C < 0.001 ? 0 : H.toFixed(1)})`;
  };

  function hexToRgbArr(hex) {
    const v = parseInt(hex.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }

  function relativeLuminance(hex) {
    return hexToRgbArr(hex).map(c => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }).reduce((acc, c, i) => acc + c * [0.2126, 0.7152, 0.0722][i], 0);
  }

  function contrastRatio(hex1, hex2) {
    const l1 = relativeLuminance(hex1), l2 = relativeLuminance(hex2);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(c => Math.round(c).toString(16).padStart(2, "0")).join("");
  }

  // --- Persistence helpers ---
  const STORAGE_KEY = "wdt_settings";

  const saveSettings = () => {
    const settings = {
      activeTab: document.querySelector(".nav-item.active")?.dataset.tab || "clamp",
      theme: document.documentElement.dataset.theme || "dark",
      rootFontSize: document.querySelector('input[name="rootFontSize"]:checked')?.value || "16",
      minDeviceWidth: document.getElementById("minDeviceWidth")?.value || "320",
      maxDeviceWidth: document.getElementById("maxDeviceWidth")?.value || "1280",
    };
    chrome.storage.local.set({ [STORAGE_KEY]: settings });
  };

  const loadSettings = (cb) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      cb(result[STORAGE_KEY] || {});
    });
  };

  // --- Dark Mode ---
  const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
  };

  document.getElementById("darkModeToggle").addEventListener("click", () => {
    const current = document.documentElement.dataset.theme;
    applyTheme(current === "dark" ? "light" : "dark");
    saveSettings();
  });

  // --- Tab Switching (sidebar nav-items) ---
  const navItems = document.querySelectorAll(".nav-item");
  const tabContents = document.querySelectorAll(".tab-content");

  const contentEl = document.querySelector(".content");

  // Tools can register a callback that fires when their tab is opened —
  // used for auto-scanning the active page without an extra click.
  // Only read-only scans belong here; actions with side effects (e.g. the
  // Broken Links network sweep) stay behind their button.
  const tabActivateHooks = {};

  const registerTabHook = (tabId, fn) => {
    tabActivateHooks[tabId] = fn;
    if (document.getElementById(tabId)?.classList.contains("active")) fn();
  };

  // ─── Lazy tool initialization ───────────────────────────────────────────────
  // Every tool registers its setup here instead of running at popup startup;
  // the init runs the first time the tool's tab is opened. Cross-tool handoffs
  // (e.g. Color Picker → Contrast) go through toolAPI, which a tool populates
  // during its init — after activateTab() the target tool is guaranteed inited.
  const toolInits = {};
  const toolInited = new Set();
  const toolAPI = {};

  const registerToolInit = (tabId, fn) => { (toolInits[tabId] ||= []).push(fn); };

  const ensureToolInit = (tabId) => {
    if (toolInited.has(tabId) || !toolInits[tabId]) return false;
    toolInited.add(tabId);
    toolInits[tabId].forEach(fn => fn());
    return true;
  };

  const activateTab = (tabName) => {
    const switched = !document.getElementById(tabName)?.classList.contains("active");
    // Query fresh: the Starred section clones nav items after startup,
    // and those clones must get their active state updated too.
    document.querySelectorAll(".nav-item").forEach(btn =>
      btn.classList.toggle("active", btn.dataset.tab === tabName));
    tabContents.forEach(tab => tab.classList.toggle("active", tab.id === tabName));
    updateToolHeader(tabName);
    syncCatToActive();
    // First open runs the tool's deferred init. registerTabHook fires its own
    // hook immediately when the tab is already active (it is — classes were
    // just toggled), so skip the explicit call in that case to avoid a double scan.
    const justInited = ensureToolInit(tabName);
    if (switched) {
      contentEl.scrollTop = 0;
      if (!justInited) tabActivateHooks[tabName]?.();
    }
  };

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      activateTab(item.dataset.tab);
      saveSettings();
    });
  });

  // --- Sidebar search ---
  const toolSearch = document.getElementById("toolSearch");
  toolSearch.addEventListener("input", () => {
    const q = toolSearch.value.trim().toLowerCase();
    navItems.forEach(item => {
      const label = item.textContent.trim().toLowerCase();
      item.classList.toggle("hidden-by-search", q !== "" && !label.includes(q));
    });
    // Hide category label if all its children are hidden
    document.querySelectorAll(".nav-category").forEach(cat => {
      const items = cat.querySelectorAll(".nav-item");
      const allHidden = [...items].every(i => i.classList.contains("hidden-by-search"));
      cat.style.display = allHidden ? "none" : "";
    });
  });

  // --- Restore persisted settings on load ---
  loadSettings((settings) => {
    if (settings.theme) applyTheme(settings.theme);

    if (settings.rootFontSize) {
      const radio = document.querySelector(`input[name="rootFontSize"][value="${settings.rootFontSize}"]`);
      if (radio) radio.checked = true;
    }
    ["minDeviceWidth", "maxDeviceWidth"].forEach(id => {
      if (settings[id]) {
        const el = document.getElementById(id);
        if (el) el.value = settings[id];
      }
    });
    // Activate last: the tab's lazy init reads the restored values itself
    activateTab(settings.activeTab || "dashboard");
  });


  registerToolInit("lorem", () => {
    // ─── LOREM IPSUM GENERATOR ──────────────────────────────────────────────────

    // Full standard lorem vocabulary (deduped)
    const loremWords = [
      "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
      "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
      "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
      "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo",
      "consequat", "duis", "aute", "irure", "in", "reprehenderit", "voluptate",
      "velit", "esse", "cillum", "eu", "fugiat", "nulla", "pariatur", "excepteur",
      "sint", "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui",
      "officia", "deserunt", "mollit", "anim", "id", "est", "laborum", "at", "vero",
      "eos", "accusamus", "iusto", "odio", "dignissimos", "ducimus", "blanditiis",
    ];

    const CLASSIC_OPENING = "Lorem ipsum dolor sit amet, consectetur adipiscing elit";

    const loremClamp = (id) => {
      const el = document.getElementById(id);
      return Math.min(+el.max || 99, Math.max(+el.min || 1, +el.value || +el.min || 1));
    };

    function loremWord() {
      return loremWords[Math.floor(Math.random() * loremWords.length)];
    }

    function loremSentence(wordCount, terminate = true) {
      const words = Array.from({ length: wordCount }, loremWord);
      words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
      return words.join(" ") + (terminate ? "." : "");
    }

    function generateLoremText() {
      const paraCount = loremClamp("loremParagraphs");
      const sentenceCount = loremClamp("loremSentences");
      const sentenceLength = loremClamp("loremWordsPerSentence");
      const format = document.querySelector('input[name="loremFormat"]:checked')?.value || "plain";
      const classic = document.getElementById("loremClassic").checked;

      let output;
      if (format === "ul" || format === "md") {
        // List modes: "Paragraphs" acts as the item count, items are short fragments
        const items = Array.from({ length: paraCount }, () => loremSentence(sentenceLength, false));
        output = format === "ul"
          ? `<ul>\n${items.map(i => `  <li>${i}</li>`).join("\n")}\n</ul>`
          : items.map(i => `- ${i}`).join("\n");
      } else {
        const paragraphs = Array.from({ length: paraCount }, (_, p) => {
          const sentences = Array.from({ length: sentenceCount }, (_, i) =>
            classic && p === 0 && i === 0
              ? CLASSIC_OPENING + (sentenceLength > 8 ? `, ${loremSentence(sentenceLength - 8, false).toLowerCase()}.` : ".")
              : loremSentence(sentenceLength)
          );
          return sentences.join(" ");
        });
        output = format === "html"
          ? paragraphs.map(p => `<p>${p}</p>`).join("\n")
          : paragraphs.join("\n\n");
      }

      document.getElementById("loremOutput").value = output;
      const words = output.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
      document.getElementById("loremStats").textContent = `${words} words · ${output.length} characters`;
    }

    document.getElementById("generateLorem").addEventListener("click", generateLoremText);
    ["loremParagraphs", "loremSentences", "loremWordsPerSentence"].forEach(id =>
      document.getElementById(id).addEventListener("input", generateLoremText));
    document.querySelectorAll('input[name="loremFormat"]').forEach(r => r.addEventListener("change", generateLoremText));
    document.getElementById("loremClassic").addEventListener("change", generateLoremText);

    generateLoremText();

    // Copy to clipboard
    document.getElementById("copyLorem").addEventListener("click", (e) => {
      copyToClipboard(document.getElementById("loremOutput").value, e.currentTarget);
    });



  }); // ─── end lazy init: lorem
  registerToolInit("color", () => {
    // Color Picker
    const colorInput = document.getElementById("colorInput");
    const colorPreview = document.getElementById("colorPreview");

    // Shades & tints: same hue/saturation across a 10-step lightness scale
    const renderColorScale = (hex) => {
      const { r, g, b } = hexToRgb(hex);
      const { h, s } = rgbToHsl(r, g, b);
      const steps = [95, 85, 75, 65, 55, 45, 35, 25, 15, 8];
      document.getElementById("colorScale").innerHTML = steps.map(l => {
        const sw = hslToHex(h, s, l);
        return `<button class="color-swatch" data-hex="${sw}" style="background:${sw}" title="${sw} · click to copy"></button>`;
      }).join("");
    };

    // Recent colors (persisted)
    const RECENT_COLORS_KEY = "wdt_recent_colors";
    let recentColors = [];

    const renderRecentColors = () => {
      const wrap = document.getElementById("recentColors");
      wrap.innerHTML = recentColors.length
        ? recentColors.map(c => `<button class="color-swatch" data-hex="${c}" data-select="1" style="background:${c}" title="${c} · click to select"></button>`).join("")
        : '<span class="color-scale-empty">Picked colors appear here</span>';
    };

    chrome.storage.local.get([RECENT_COLORS_KEY], d => {
      recentColors = (Array.isArray(d[RECENT_COLORS_KEY]) ? d[RECENT_COLORS_KEY] : [])
        .filter(c => /^#[0-9a-f]{6}$/i.test(c));
      renderRecentColors();
    });

    const recordRecentColor = (hex) => {
      recentColors = [hex, ...recentColors.filter(c => c !== hex)].slice(0, 8);
      chrome.storage.local.set({ [RECENT_COLORS_KEY]: recentColors });
      renderRecentColors();
    };

    const updateColorValues = (hex) => {
      const rgb = hexToRgb(hex);
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

      colorPreview.style.backgroundColor = hex;
      _setCode("hexCode", `color: ${hex};`);
      _setCode("rgbCode", `color: rgb(${rgb.r},${rgb.g},${rgb.b});`);
      _setCode("hslCode", `color: hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%);`);
      _setCode("oklchCode", `color: ${hexToOklch(hex)};`);
      renderColorScale(hex);
    };

    colorInput.addEventListener("input", (e) => updateColorValues(e.target.value));
    colorInput.addEventListener("change", (e) => recordRecentColor(e.target.value));

    // Swatch clicks: scale swatches copy, recent swatches re-select
    document.getElementById("color").addEventListener("click", (e) => {
      const sw = e.target.closest(".color-swatch");
      if (!sw) return;
      if (sw.dataset.select) {
        colorInput.value = sw.dataset.hex;
        updateColorValues(sw.dataset.hex);
      } else {
        copyToClipboard(sw.dataset.hex);
      }
    });

    // Screenshot-based picker injected into the page. The popup closes first,
    // then pixels are sampled from a captureVisibleTab screenshot (which never
    // includes the popup) — picking starts instantly, no extra gesture needed.
    function pageColorPicker(shotUrl) {
      if (window.__wdtEyeCleanup) window.__wdtEyeCleanup();

      const img = new Image();
      img.onload = start;
      img.src = shotUrl;

      function start() {
        let scale = img.naturalWidth / window.innerWidth;
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);

        // Full-viewport overlay: captures all events, freezes the page state
        const ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;inset:0;z-index:2147483646;cursor:crosshair;';

        // Loupe: zoomed pixels + live hex readout, follows the cursor
        const loupe = document.createElement('div');
        loupe.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;display:none;background:#1a1d27;border:1.5px solid #4caf50;border-radius:8px;box-shadow:0 6px 24px rgba(0,0,0,0.6);overflow:hidden;';
        const zoom = document.createElement('canvas');
        zoom.width = 132; zoom.height = 60;
        zoom.style.cssText = 'display:block;';
        const zctx = zoom.getContext('2d');
        zctx.imageSmoothingEnabled = false;
        const label = document.createElement('div');
        label.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 8px;font:11px/1.3 system-ui,sans-serif;color:#e2e8f0;border-top:1px solid #2d3144;';
        const dot = document.createElement('span');
        dot.style.cssText = 'width:11px;height:11px;border-radius:50%;border:1px solid rgba(255,255,255,0.5);flex-shrink:0;';
        const hexText = document.createElement('span');
        label.appendChild(dot);
        label.appendChild(hexText);
        loupe.appendChild(zoom);
        loupe.appendChild(label);

        const tip = document.createElement('div');
        tip.textContent = 'Click to pick a color · scroll to move · Esc to cancel';
        tip.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#1a1d27;color:#e2e8f0;padding:6px 14px;border-radius:99px;font:12px system-ui,sans-serif;z-index:2147483647;border:1px solid #4caf50;box-shadow:0 4px 16px rgba(0,0,0,0.5);';

        // Closed shadow root: the page can't reach the loupe canvas (which
        // holds screenshot pixels, possibly of cross-origin iframes) or
        // restyle the picker UI. Zero-size host; children are position:fixed
        // so they still overlay the full viewport and receive events.
        const host = document.createElement('div');
        host.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;';
        const shadow = host.attachShadow({ mode: 'closed' });
        shadow.appendChild(ov);
        shadow.appendChild(loupe);
        shadow.appendChild(tip);
        document.documentElement.appendChild(host);

        let currentHex = null;

        const toHex = (d) => '#' + [d[0], d[1], d[2]].map(c => c.toString(16).padStart(2, '0')).join('');

        const sampleAt = (cx, cy) => {
          const px = Math.max(0, Math.min(canvas.width - 1, Math.round(cx * scale)));
          const py = Math.max(0, Math.min(canvas.height - 1, Math.round(cy * scale)));
          return { px, py, hex: toHex(ctx.getImageData(px, py, 1, 1).data) };
        };

        const onMove = (e) => {
          const { px, py, hex } = sampleAt(e.clientX, e.clientY);
          currentHex = hex;
          // Zoom: 11×5 source pixels scaled 12× with a center marker
          zctx.clearRect(0, 0, zoom.width, zoom.height);
          zctx.drawImage(canvas, px - 5 * scale, py - 2 * scale, 11 * scale, 5 * scale, 0, 0, 132, 60);
          zctx.strokeStyle = 'rgba(255,255,255,0.9)';
          zctx.lineWidth = 1;
          zctx.strokeRect(60, 24, 12, 12);
          dot.style.background = hex;
          hexText.textContent = hex;
          loupe.style.display = 'block';
          const lx = e.clientX + 18 + 140 > window.innerWidth ? e.clientX - 18 - 136 : e.clientX + 18;
          const ly = e.clientY + 18 + 86 > window.innerHeight ? e.clientY - 18 - 84 : e.clientY + 18;
          loupe.style.left = lx + 'px';
          loupe.style.top = ly + 'px';
        };

        const onClick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const hex = currentHex || sampleAt(e.clientX, e.clientY).hex;
          cleanup();
          try {
            chrome.storage.local.set({ wdt_color_pick: { hex, ts: Date.now() } }, () => {
              try { chrome.runtime.sendMessage({ type: 'REOPEN_POPUP' }); } catch (_) { }
            });
          } catch (_) { }
          const pill = document.createElement('div');
          pill.textContent = `✓ Picked ${hex}`;
          pill.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#1b5e20;color:#fff;padding:7px 16px;border-radius:99px;font:12px system-ui,sans-serif;z-index:2147483647;box-shadow:0 4px 16px rgba(0,0,0,0.5);';
          const pd = document.createElement('span');
          pd.style.cssText = `display:inline-block;width:11px;height:11px;border-radius:50%;background:${hex};margin-left:7px;vertical-align:-1px;border:1px solid rgba(255,255,255,0.6);`;
          pill.appendChild(pd);
          document.documentElement.appendChild(pill);
          setTimeout(() => pill.remove(), 2500);
        };

        const onKey = (e) => { if (e.key === 'Escape') cleanup(); };

        // Scrolling is allowed: the screenshot goes stale, so once scrolling
        // settles we ask the background for a fresh capture and swap it in.
        let scrollTimer = null;
        let recapturing = false;
        const requestRecapture = () => {
          if (recapturing) return;
          recapturing = true;
          tip.textContent = 'Updating capture…';
          try {
            chrome.runtime.sendMessage({ type: 'CAPTURE_TAB' }, (res) => {
              recapturing = false;
              tip.textContent = 'Click to pick a color · scroll to move · Esc to cancel';
              if (!res || !res.dataUrl) return;
              const fresh = new Image();
              fresh.onload = () => {
                canvas.width = fresh.naturalWidth;
                canvas.height = fresh.naturalHeight;
                ctx.drawImage(fresh, 0, 0);
                scale = fresh.naturalWidth / window.innerWidth;
              };
              fresh.src = res.dataUrl;
            });
          } catch (_) { recapturing = false; }
        };
        const onScroll = () => {
          loupe.style.display = 'none'; // stale until the new capture lands
          clearTimeout(scrollTimer);
          scrollTimer = setTimeout(requestRecapture, 250);
        };

        function cleanup() {
          host.remove();
          document.removeEventListener('keydown', onKey, true);
          window.removeEventListener('scroll', onScroll, true);
          clearTimeout(scrollTimer);
          delete window.__wdtEyeCleanup;
        }
        window.__wdtEyeCleanup = cleanup;

        ov.addEventListener('mousemove', onMove);
        ov.addEventListener('click', onClick, true);
        document.addEventListener('keydown', onKey, true);
        window.addEventListener('scroll', onScroll, true);
      }
    }

    document.getElementById("eyeDropperBtn").addEventListener("click", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        // Restricted pages: fall back to the in-popup eyedropper (it can still
        // sample everything the popup isn't covering)
        const restricted = !tab || tab.url?.startsWith("chrome://") || tab.url?.startsWith("chrome-extension://");
        if (restricted) {
          if (!window.EyeDropper) { showToast("Eyedropper is not supported in this browser", "error"); return; }
          new EyeDropper().open().then(result => {
            colorInput.value = result.sRGBHex;
            updateColorValues(result.sRGBHex);
            recordRecentColor(result.sRGBHex);
            showToast(`Picked ${result.sRGBHex}`);
          }).catch(() => { });
          return;
        }
        chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
          if (chrome.runtime.lastError || !dataUrl) {
            showToast("Could not capture this page", "error");
            return;
          }
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: pageColorPicker,
            args: [dataUrl],
          }, () => {
            if (chrome.runtime.lastError) {
              showToast("Could not start the picker on this page", "error");
              return;
            }
            window.close();
          });
        });
      });
    });

    // Consume a pick made while the popup was closed (fresh ones only)
    chrome.storage.local.get(["wdt_color_pick"], (d) => {
      const p = d.wdt_color_pick;
      if (p?.hex && /^#[0-9a-f]{6}$/i.test(p.hex) && Date.now() - (p.ts || 0) < 60000) {
        colorInput.value = p.hex;
        updateColorValues(p.hex);
        recordRecentColor(p.hex);
        showToast(`Picked ${p.hex}`);
      }
      chrome.storage.local.remove("wdt_color_pick");
    });

    // Hand the current color to the Contrast Checker as text color
    document.getElementById("sendToContrast").addEventListener("click", () => {
      const hex = colorInput.value;
      document.getElementById("foregroundColor").value = hex;
      document.getElementById("foregroundColorText").value = hex;
      activateTab("contrast-checker");
      saveSettings();
      toolAPI["contrast-checker"]?.update();
    });

    // Hand the current color to the Color Scale generator as the base
    document.getElementById("sendToScale").addEventListener("click", () => {
      const hex = colorInput.value;
      document.getElementById("scaleBase").value = hex;
      document.getElementById("scaleBaseText").value = hex;
      activateTab("color-scale");
      saveSettings();
      toolAPI["color-scale"]?.update();
    });

    updateColorValues(colorInput.value);

    // Update copy button functionality
    document.querySelectorAll(".copy").forEach(btn => {
      btn.addEventListener("click", () => {
        const codeElement = btn.previousElementSibling;
        copyToClipboard(codeElement.dataset.raw || codeElement.textContent, btn);
      });
    });


  }); // ─── end lazy init: color
  registerToolInit("font", () => {
    // ─── FONT CHECKER ────────────────────────────────────────────────────────────
    // Injected floating panel (CSS Inspector pattern): font info updates LIVE
    // while hovering — click pins the font to the compare list and saves it,
    // Esc unlocks/exits. Fully self-contained.

    function fontInspectorFloating() {
      if (window.__fontPickerCleanup) window.__fontPickerCleanup();

      const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      const style = document.createElement('style');
      style.textContent = `
      #__wf_panel { position:fixed !important; top:16px !important; right:16px !important; width:280px !important; background:#1a1d27 !important; border:1.5px solid #2d3144 !important; border-radius:10px !important; box-shadow:0 8px 40px rgba(0,0,0,0.75) !important; z-index:2147483647 !important; font:12px/1.45 system-ui,sans-serif !important; color:#e2e8f0 !important; overflow:hidden !important; user-select:none !important; }
      #__wf_panel.wf-locked { border-color:#fbbf24 !important; }
      #__wf_hdr { display:flex !important; align-items:center !important; gap:6px !important; padding:7px 10px !important; background:#242838 !important; cursor:move !important; border-bottom:1px solid #2d3144 !important; }
      #__wf_title { flex:1 !important; font-weight:700 !important; color:#4caf50 !important; font-size:11px !important; }
      .wf-btn { background:#2d3144 !important; border:none !important; color:#e2e8f0 !important; font:11px system-ui !important; padding:3px 8px !important; border-radius:5px !important; cursor:pointer !important; }
      .wf-btn:hover { background:#3a4054 !important; }
      #__wf_body { padding:10px !important; }
      .wf-family { font-size:14px !important; font-weight:700 !important; color:#fff !important; margin-bottom:2px !important; word-break:break-word !important; }
      .wf-stack { color:#8892a4 !important; font-size:10px !important; margin-bottom:8px !important; word-break:break-word !important; }
      .wf-row { display:flex !important; justify-content:space-between !important; gap:8px !important; font-size:11px !important; padding:1.5px 0 !important; }
      .wf-l { color:#8892a4 !important; }
      .wf-v { color:#e2e8f0 !important; font-family:Consolas,monospace !important; display:flex !important; align-items:center !important; gap:5px !important; }
      .wf-dot { width:9px !important; height:9px !important; border-radius:50% !important; border:1px solid rgba(255,255,255,0.4) !important; display:inline-block !important; flex-shrink:0 !important; }
      .wf-sample { border-top:1px solid #2d3144 !important; padding-top:7px !important; margin-top:6px !important; font-size:15px !important; line-height:1.35 !important; color:#e2e8f0 !important; max-height:46px !important; overflow:hidden !important; word-break:break-word !important; }
      .wf-pins { border-top:1px solid #2d3144 !important; margin-top:8px !important; padding-top:6px !important; }
      .wf-pins-t { font-size:9px !important; letter-spacing:0.07em !important; text-transform:uppercase !important; color:#6b7a99 !important; margin-bottom:4px !important; }
      .wf-pin { display:flex !important; gap:6px !important; align-items:center !important; font-size:10.5px !important; padding:2px 0 !important; color:#cbd5e1 !important; }
      .wf-pin b { color:#fff !important; font-weight:600 !important; }
      #__wf_hint { padding:5px 10px !important; background:#13161e !important; color:#6b7a99 !important; font-size:10px !important; border-top:1px solid #2d3144 !important; }
    `;
      document.documentElement.appendChild(style);

      // Overlay display is controlled ONLY inline (an !important display in
      // CSS would beat inline style and hide it forever)
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:absolute;pointer-events:none;border:2px dashed #4caf50;background:rgba(76,175,80,0.08);z-index:2147483646;box-sizing:border-box;display:none;border-radius:2px;';
      document.documentElement.appendChild(overlay);

      const panel = document.createElement('div');
      panel.id = '__wf_panel';
      panel.innerHTML = `
      <div id="__wf_hdr">
        <span id="__wf_title">Font Checker</span>
        <button class="wf-btn" id="__wf_close">✕ Close</button>
      </div>
      <div id="__wf_body"><div class="wf-stack">Hover over text to analyze its font…</div></div>
      <div id="__wf_hint">Hover = live · Click = pin &amp; save (hover continues) · Esc = exit</div>`;
      document.documentElement.appendChild(panel);
      const body = panel.querySelector('#__wf_body');

      let locked = false, lastEl = null, lastFont = null, rafId = null;
      const pins = [];

      // Seed the panel's compare list with previously pinned fonts, so
      // "+ Pin Another Font" sessions continue where the last one ended
      try {
        chrome.storage.local.get(['wdt_font_pins'], (res) => {
          (Array.isArray(res.wdt_font_pins) ? res.wdt_font_pins : []).slice(0, 4).forEach(p => {
            if (p?.data) pins.push({ family: firstFamily(p.data.fontFamily), size: p.data.fontSize, weight: p.data.fontWeight, color: p.data.color });
          });
        });
      } catch (_) { }

      const readFont = (el) => {
        const s = window.getComputedStyle(el);
        return {
          fontFamily: s.fontFamily,
          fontSize: s.fontSize,
          fontWeight: s.fontWeight,
          lineHeight: s.lineHeight,
          letterSpacing: s.letterSpacing,
          fontStyle: s.fontStyle,
          textDecoration: s.textDecorationLine || s.textDecoration,
          textAlign: s.textAlign,
          color: s.color,
          sampleText: (el.textContent || '').trim().substring(0, 60),
        };
      };

      const firstFamily = (ff) => (ff || '').split(',')[0].replace(/["']/g, '').trim();

      function render(font, el) {
        const rows = [
          ['Size', font.fontSize], ['Weight', font.fontWeight],
          ['Line height', font.lineHeight], ['Letter spc', font.letterSpacing],
          ['Style', font.fontStyle], ['Decoration', font.textDecoration || 'none'],
        ];
        body.innerHTML = `
        <div class="wf-family">${esc(firstFamily(font.fontFamily))} <span style="color:#8892a4;font-weight:400;font-size:10px;">&lt;${esc(el.tagName.toLowerCase())}&gt;</span></div>
        <div class="wf-stack">${esc(font.fontFamily)}</div>
        ${rows.map(([l, v]) => `<div class="wf-row"><span class="wf-l">${l}</span><span class="wf-v">${esc(v)}</span></div>`).join('')}
        <div class="wf-row"><span class="wf-l">Color</span><span class="wf-v"><span class="wf-dot" id="__wf_cdot"></span>${esc(font.color)}</span></div>
        <div class="wf-sample" id="__wf_sample"></div>
        ${pins.length ? `<div class="wf-pins"><div class="wf-pins-t">Pinned for compare</div>${pins.map(p => `
          <div class="wf-pin"><span class="wf-dot" style="background:${p.color}"></span><b>${esc(p.family)}</b> · ${esc(p.size)} / ${esc(p.weight)}</div>`).join('')}</div>` : ''}`;
        body.querySelector('#__wf_cdot').style.background = font.color;
        const sample = body.querySelector('#__wf_sample');
        sample.textContent = font.sampleText || 'The quick brown fox';
        sample.style.fontFamily = font.fontFamily;
        sample.style.fontWeight = font.fontWeight;
        sample.style.fontStyle = font.fontStyle;
        sample.style.letterSpacing = font.letterSpacing;
      }

      function setOverlay(el) {
        const r = el.getBoundingClientRect();
        overlay.style.display = 'block';
        overlay.style.top = `${window.scrollY + r.top}px`;
        overlay.style.left = `${window.scrollX + r.left}px`;
        overlay.style.width = `${r.width}px`;
        overlay.style.height = `${r.height}px`;
        overlay.style.borderColor = locked ? '#fbbf24' : '#4caf50';
      }

      const onMove = (e) => {
        if (locked) return;
        if (panel.contains(e.target)) return;
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          const el = document.elementFromPoint(e.clientX, e.clientY);
          if (!el || ['HTML', 'BODY', 'SCRIPT'].includes(el.tagName) || el === overlay || panel.contains(el)) return;
          if (el === lastEl) return;
          lastEl = el;
          lastFont = readFont(el);
          render(lastFont, el);
          setOverlay(el);
        });
      };

      const flashSaved = () => {
        const t = panel.querySelector('#__wf_title');
        t.textContent = '✓ Pinned & saved';
        t.style.color = '#fbbf24';
        setTimeout(() => { t.textContent = 'Font Checker'; t.style.color = ''; }, 1100);
      };

      let pinFlashTimer = null;

      const onClick = (e) => {
        if (panel.contains(e.target)) return; // panel buttons stay clickable
        e.preventDefault();
        e.stopPropagation();
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el || panel.contains(el) || el === overlay) return;
        lastEl = el;
        lastFont = readFont(el);
        pins.unshift({ family: firstFamily(lastFont.fontFamily), size: lastFont.fontSize, weight: lastFont.fontWeight, color: lastFont.color });
        if (pins.length > 4) pins.pop();
        render(lastFont, el);
        flashSaved();
        // Brief amber confirmation, then hover resumes live automatically —
        // every next pin is just as informed as the first one
        locked = true;
        panel.classList.add('wf-locked');
        setOverlay(el);
        clearTimeout(pinFlashTimer);
        pinFlashTimer = setTimeout(() => {
          locked = false;
          panel.classList.remove('wf-locked');
          lastEl = null; // force a fresh render on the next mouse move
        }, 700);
        // Append to the shared pin list the popup renders for comparison
        try {
          chrome.storage.local.get(['wdt_font_pins'], (res) => {
            const stored = Array.isArray(res.wdt_font_pins) ? res.wdt_font_pins : [];
            stored.unshift({ data: lastFont, host: location.hostname, ts: Date.now() });
            chrome.storage.local.set({ wdt_font_pins: stored.slice(0, 6) });
          });
        } catch (_) { }
      };

      const onKey = (e) => {
        if (e.key === 'Escape') cleanup();
      };

      // Panel dragging
      let drag = false, dox = 0, doy = 0;
      const hdr = panel.querySelector('#__wf_hdr');
      const onDragStart = (e) => {
        if (e.target.closest('.wf-btn')) return;
        drag = true;
        const r = panel.getBoundingClientRect();
        dox = e.clientX - r.left;
        doy = e.clientY - r.top;
        e.preventDefault();
      };
      const onDragMove = (e) => {
        if (!drag) return;
        panel.style.setProperty('left', `${e.clientX - dox}px`, 'important');
        panel.style.setProperty('top', `${e.clientY - doy}px`, 'important');
        panel.style.setProperty('right', 'auto', 'important');
      };
      const onDragEnd = () => { drag = false; };

      function cleanup() {
        document.removeEventListener('mousemove', onMove, true);
        document.removeEventListener('click', onClick, true);
        document.removeEventListener('keydown', onKey, true);
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
        if (rafId) cancelAnimationFrame(rafId);
        clearTimeout(pinFlashTimer);
        style.remove(); panel.remove(); overlay.remove();
        delete window.__fontPickerCleanup;
      }

      panel.querySelector('#__wf_close').addEventListener('click', cleanup);
      hdr.addEventListener('mousedown', onDragStart);
      document.addEventListener('mousemove', onDragMove);
      document.addEventListener('mouseup', onDragEnd);
      document.addEventListener('mousemove', onMove, true);
      document.addEventListener('click', onClick, true);
      document.addEventListener('keydown', onKey, true);
      window.__fontPickerCleanup = cleanup;
    }

    document.getElementById("checkFontOnPage").addEventListener("click", async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;
      if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("chrome-extension://")) {
        showToast("Cannot pick from Chrome system pages", "error");
        return;
      }
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: fontInspectorFloating,
      }, () => {
        if (chrome.runtime.lastError) {
          showToast("Could not start the picker on this page", "error");
          return;
        }
        window.close();
      });
    });

    document.getElementById("resetFontPicker").addEventListener("click", async () => {
      chrome.storage.local.remove(['wdt_font_lock', 'wdt_font_pins']);
      fontPins = [];
      fontPinSel = 0;
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && !tab.url?.startsWith("chrome://") && !tab.url?.startsWith("chrome-extension://")) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => { if (window.__fontPickerCleanup) window.__fontPickerCleanup(); },
        }, () => void chrome.runtime.lastError);
      }
      _setCode('fontInfoOutput', 'Click "Open Font Inspector" to start...', 'text');
      document.getElementById('fontPreviewBox').classList.add('hidden');
      renderFontPins();
    });

    function updateFontPreview(fontInfo, meta) {
      const css = `font-family: ${fontInfo.fontFamily};
font-size: ${fontInfo.fontSize};
font-weight: ${fontInfo.fontWeight};
line-height: ${fontInfo.lineHeight};
letter-spacing: ${fontInfo.letterSpacing};
font-style: ${fontInfo.fontStyle};
text-decoration: ${fontInfo.textDecoration};
text-align: ${fontInfo.textAlign};
color: ${fontInfo.color};`;

      _setCode('fontInfoOutput', css);

      // Preview renders with the actual picked typography
      const preview = document.getElementById('fontPreview');
      preview.style.cssText = '';
      preview.style.fontFamily = fontInfo.fontFamily;
      preview.style.fontWeight = fontInfo.fontWeight;
      preview.style.fontStyle = fontInfo.fontStyle;
      preview.style.letterSpacing = fontInfo.letterSpacing;
      preview.textContent = fontInfo.sampleText || 'The quick brown fox jumps over the lazy dog';

      const title = document.querySelector('#fontPreviewBox h4');
      if (title && meta?.host) {
        const mins = Math.round((Date.now() - (meta.ts || Date.now())) / 60000);
        const age = mins < 1 ? 'just now' : mins < 60 ? `${mins} min ago` : `${Math.round(mins / 60)} h ago`;
        title.textContent = `Picked from ${meta.host} · ${age}`;
      }

      document.getElementById('fontPreviewBox').classList.remove('hidden');
    }

    // ── Pinned fonts: compare list shared with the page inspector ──
    let fontPins = [];
    let fontPinSel = 0;

    function renderFontPins() {
      const wrap = document.getElementById('fontPins');
      document.getElementById('checkFontOnPage').textContent =
        fontPins.length ? '+ Pin Another Font' : 'Open Font Inspector';
      if (!fontPins.length) { wrap.innerHTML = ''; return; }

      wrap.innerHTML = `
      <p class="panel-label">Pinned fonts (${fontPins.length}) <small class="hint-inline">click to view · × to remove</small></p>
      ${fontPins.map((p, i) => {
        const f = p.data;
        const fam = (f.fontFamily || '').split(',')[0].replace(/["']/g, '').trim();
        return `
        <div class="font-pin-row${i === fontPinSel ? ' active' : ''}" data-i="${i}">
          <span class="font-pin-dot"></span>
          <span class="font-pin-name">${escapeHtml(fam)}</span>
          <span class="font-pin-meta">${escapeHtml(f.fontSize)} / ${escapeHtml(f.fontWeight)}</span>
          <button class="font-pin-x" data-i="${i}" title="Remove pin">×</button>
        </div>`;
      }).join('')}
      <button id="fontPinAdd" class="btn-ghost btn-ghost--accent font-pin-add">+ Pin Another Font</button>`;

      // Same flow as the main button: opens the inspector on the page
      wrap.querySelector('#fontPinAdd').addEventListener('click', () =>
        document.getElementById('checkFontOnPage').click());

      wrap.querySelectorAll('.font-pin-row').forEach((row, i) => {
        row.querySelector('.font-pin-dot').style.background = fontPins[i].data.color;
        row.addEventListener('click', (e) => {
          if (e.target.closest('.font-pin-x')) return;
          fontPinSel = +row.dataset.i;
          updateFontPreview(fontPins[fontPinSel].data, fontPins[fontPinSel]);
          renderFontPins();
        });
      });
      wrap.querySelectorAll('.font-pin-x').forEach(btn => {
        btn.addEventListener('click', () => {
          fontPins.splice(+btn.dataset.i, 1);
          chrome.storage.local.set({ wdt_font_pins: fontPins });
          fontPinSel = 0;
          if (fontPins.length) {
            updateFontPreview(fontPins[0].data, fontPins[0]);
          } else {
            _setCode('fontInfoOutput', 'Click "Open Font Inspector" to start...', 'text');
            document.getElementById('fontPreviewBox').classList.add('hidden');
          }
          renderFontPins();
        });
      });
    }

    chrome.storage.local.get(['wdt_font_pins', 'wdt_font_lock'], (res) => {
      fontPins = Array.isArray(res.wdt_font_pins) ? res.wdt_font_pins.filter(p => p?.data) : [];
      // Legacy single-lock format becomes the first pin
      if (!fontPins.length && res.wdt_font_lock?.data) fontPins = [res.wdt_font_lock];
      if (fontPins.length) updateFontPreview(fontPins[0].data, fontPins[0]);
      renderFontPins();
    });

    // ✅ Copy font info to clipboard
    document.getElementById('copyFontInfo').addEventListener('click', (e) => {
      const out = document.getElementById('fontInfoOutput');
      copyToClipboard(out.dataset.raw || out.textContent, e.currentTarget);
    });




  }); // ─── end lazy init: font
  registerToolInit("clamp", () => {
    // CSS Clamp Calculator
    const getClampUnit = () =>
      document.querySelector('input[name="clampUnit"]:checked')?.value || "rem";

    // Font sizes are always calculated in rem; px inputs are converted using
    // the selected root font size. Output stays rem — it respects users'
    // browser font-size settings (accessibility best practice).
    const readClampFontsRem = (rootFontSize) => {
      const min = parseFloat(document.getElementById("minFontSize").value);
      const max = parseFloat(document.getElementById("maxFontSize").value);
      const div = getClampUnit() === "px" ? rootFontSize : 1;
      return { minFont: min / div, maxFont: max / div };
    };

    const updateClampCalculator = () => {
      const rootFontSize = parseFloat(document.querySelector('input[name="rootFontSize"]:checked').value);
      const minDevice = parseFloat(document.getElementById("minDeviceWidth").value) || 320;
      const maxDevice = parseFloat(document.getElementById("maxDeviceWidth").value) || 1280;
      const { minFont, maxFont } = readClampFontsRem(rootFontSize);
      const format = document.querySelector('input[name="clampFormat"]:checked').value;

      const output = document.getElementById("clampOutput");
      const copyBtn = document.getElementById("copyClampBtn");
      const errorEl = document.getElementById("clampError");
      const preview = document.getElementById("clampPreview");

      const showError = (msg) => {
        errorEl.textContent = msg;
        _setCode(output, "—", 'text');
        copyBtn.disabled = true;
        if (preview) preview.style.fontSize = "";
      };

      errorEl.textContent = "";

      if (!minFont || !maxFont) {
        showError("Enter min and max font sizes.");
        return;
      }
      if (minFont <= 0 || maxFont <= 0) {
        showError("Font sizes must be greater than 0.");
        return;
      }
      if (minFont >= maxFont) {
        showError("Min font size must be smaller than max font size.");
        return;
      }
      if (minDevice >= maxDevice) {
        showError("Min device width must be smaller than max device width.");
        return;
      }

      const minFontPx = minFont * rootFontSize;
      const maxFontPx = maxFont * rootFontSize;
      const slope = (maxFontPx - minFontPx) / (maxDevice - minDevice);
      const base = minFontPx - slope * minDevice;
      const clampCore = `clamp(${minFont.toFixed(2)}rem, ${(base / rootFontSize).toFixed(3)}rem + ${(slope * 100).toFixed(3)}vw, ${maxFont.toFixed(2)}rem)`;

      const formatted =
        format === "tailwind" ? `text-[${clampCore}]` :
          format === "scss" ? `$font-size: ${clampCore};` :
            format === "custom-prop" ? `--font-size: ${clampCore};` :
              `font-size: ${clampCore};`;

      _setCode(output, formatted);
      copyBtn.disabled = false;

      if (preview) preview.style.fontSize = clampCore;
      updateSliderPreview();
    };

    // Live viewport preview slider — calculate actual interpolated px value
    const clampSlider = document.getElementById("clampViewportSlider");
    const clampViewportVal = document.getElementById("clampViewportVal");
    const clampPreviewWrap = document.querySelector("#clamp .preview-panel");
    const clampPreviewEl = document.getElementById("clampPreview");

    function updateSliderPreview() {
      if (!clampSlider || !clampPreviewEl) return;
      const w = parseInt(clampSlider.value);
      const rootFontSize = parseFloat(document.querySelector('input[name="rootFontSize"]:checked')?.value) || 16;
      const { minFont, maxFont } = readClampFontsRem(rootFontSize);
      const minDevice = parseFloat(document.getElementById("minDeviceWidth").value) || 320;
      const maxDevice = parseFloat(document.getElementById("maxDeviceWidth").value) || 1280;
      if (!minFont || !maxFont || minFont >= maxFont || minDevice >= maxDevice) return;
      const minPx = minFont * rootFontSize;
      const maxPx = maxFont * rootFontSize;
      const slope = (maxPx - minPx) / (maxDevice - minDevice);
      const intercept = minPx - slope * minDevice;
      const computed = Math.max(minPx, Math.min(maxPx, intercept + slope * w));
      clampPreviewEl.style.fontSize = `${computed.toFixed(1)}px`;
      clampViewportVal.textContent = `${w}px`;
    }

    if (clampSlider) {
      clampSlider.addEventListener("input", updateSliderPreview);
    }

    // Add event listeners for dynamic updates (also save settings on change)
    document.querySelectorAll('input[name="rootFontSize"], input[name="clampFormat"]').forEach(radio => {
      radio.addEventListener('change', () => { updateClampCalculator(); saveSettings(); });
    });

    document.querySelectorAll('#clamp input[type="number"]').forEach(input => {
      ['input', 'change'].forEach(eventType => {
        input.addEventListener(eventType, () => { updateClampCalculator(); saveSettings(); });
      });
    });

    document.getElementById("copyClampBtn").addEventListener("click", (e) => {
      const clampEl = document.getElementById("clampOutput");
      copyToClipboard(clampEl.dataset.raw || clampEl.textContent, e.currentTarget);
    });

    // Unit toggle: convert the current values so the result stays identical
    let clampUnitPrev = "rem";
    const applyClampUnit = (unit) => {
      const root = parseFloat(document.querySelector('input[name="rootFontSize"]:checked').value);
      ["minFontSize", "maxFontSize"].forEach(id => {
        const el = document.getElementById(id);
        const v = parseFloat(el.value);
        if (!isNaN(v) && unit !== clampUnitPrev) {
          el.value = unit === "px" ? +(v * root).toFixed(2) : +(v / root).toFixed(3);
        }
        el.step = unit === "px" ? "1" : "0.01";
      });
      document.getElementById("minFontUnit").textContent = unit;
      document.getElementById("maxFontUnit").textContent = unit;
      clampUnitPrev = unit;
    };

    document.querySelectorAll('input[name="clampUnit"]').forEach(r =>
      r.addEventListener("change", () => {
        applyClampUnit(getClampUnit());
        updateClampCalculator();
      }));

    document.getElementById("resetClamp").addEventListener("click", () => {
      document.querySelector('input[name="rootFontSize"][value="16"]').checked = true;
      document.querySelector('input[name="clampFormat"][value="css"]').checked = true;
      document.querySelector('input[name="clampUnit"][value="rem"]').checked = true;
      applyClampUnit("rem");
      document.getElementById("minDeviceWidth").value = "320";
      document.getElementById("maxDeviceWidth").value = "1280";
      document.getElementById("minFontSize").value = "1";
      document.getElementById("maxFontSize").value = "1.5";
      if (clampSlider) { clampSlider.value = "760"; clampViewportVal.textContent = "760px"; }
      if (clampPreviewWrap) clampPreviewWrap.style.width = "";
      updateClampCalculator();
    });

    // Initialize clamp calculator
    updateClampCalculator();


  }); // ─── end lazy init: clamp
  registerToolInit("box-shadow", () => {
    // ─── BOX SHADOW GENERATOR ────────────────────────────────────────────────────

    let bsLayers = [{ h: 0, v: 8, blur: 24, spread: -4, color: '#000000', opacity: 15, inset: false }];
    let bsActiveCat = 'classic';
    let bsActiveFmt = 'css';
    let bsShape = 'box';

    const bsAllPresets = {
      classic: [
        { name: 'Soft', layers: [{ h: 0, v: 4, blur: 15, spread: 0, color: '#000000', opacity: 8, inset: false }] },
        { name: 'Medium', layers: [{ h: 0, v: 8, blur: 24, spread: -4, color: '#000000', opacity: 15, inset: false }] },
        { name: 'Hard', layers: [{ h: 4, v: 4, blur: 0, spread: 0, color: '#000000', opacity: 25, inset: false }] },
        { name: 'Long', layers: [{ h: 0, v: 25, blur: 50, spread: -12, color: '#000000', opacity: 25, inset: false }] },
        { name: 'Sharp', layers: [{ h: 2, v: 2, blur: 0, spread: 0, color: '#000000', opacity: 100, inset: false }] },
        { name: 'Diffuse', layers: [{ h: 0, v: 2, blur: 40, spread: 0, color: '#000000', opacity: 12, inset: false }] },
      ],
      elevated: [
        { name: 'Card', layers: [{ h: 0, v: 1, blur: 4, spread: 0, color: '#000000', opacity: 8, inset: false }, { h: 0, v: 4, blur: 12, spread: -2, color: '#000000', opacity: 10, inset: false }] },
        { name: 'Float', layers: [{ h: 0, v: 4, blur: 12, spread: -2, color: '#000000', opacity: 10, inset: false }, { h: 0, v: 16, blur: 40, spread: -4, color: '#000000', opacity: 15, inset: false }] },
        { name: 'Popup', layers: [{ h: 0, v: 24, blur: 64, spread: -8, color: '#000000', opacity: 30, inset: false }] },
        { name: 'Material 1', layers: [{ h: 0, v: 1, blur: 3, spread: 0, color: '#000000', opacity: 12, inset: false }, { h: 0, v: 1, blur: 2, spread: 0, color: '#000000', opacity: 24, inset: false }] },
        { name: 'Material 2', layers: [{ h: 0, v: 3, blur: 6, spread: 0, color: '#000000', opacity: 15, inset: false }, { h: 0, v: 3, blur: 6, spread: 0, color: '#000000', opacity: 23, inset: false }] },
        { name: 'Material 3', layers: [{ h: 0, v: 10, blur: 20, spread: 0, color: '#000000', opacity: 19, inset: false }, { h: 0, v: 6, blur: 6, spread: 0, color: '#000000', opacity: 23, inset: false }] },
      ],
      effects: [
        { name: 'Neon Green', layers: [{ h: 0, v: 0, blur: 20, spread: 2, color: '#4caf50', opacity: 80, inset: false }] },
        { name: 'Neon Blue', layers: [{ h: 0, v: 0, blur: 20, spread: 2, color: '#2196f3', opacity: 80, inset: false }] },
        { name: 'Neon Pink', layers: [{ h: 0, v: 0, blur: 20, spread: 2, color: '#e91e63', opacity: 80, inset: false }] },
        { name: 'Glow', layers: [{ h: 0, v: 0, blur: 10, spread: 0, color: '#4caf50', opacity: 40, inset: false }, { h: 0, v: 0, blur: 30, spread: 5, color: '#4caf50', opacity: 20, inset: false }] },
        { name: 'Retro', layers: [{ h: 4, v: 4, blur: 0, spread: 0, color: '#000000', opacity: 100, inset: false }] },
        { name: 'Brutal', layers: [{ h: 8, v: 8, blur: 0, spread: 0, color: '#000000', opacity: 100, inset: false }] },
      ],
      inner: [
        { name: 'Subtle', layers: [{ h: 0, v: 2, blur: 6, spread: 0, color: '#000000', opacity: 12, inset: true }] },
        { name: 'Deep', layers: [{ h: 0, v: 6, blur: 12, spread: -2, color: '#000000', opacity: 30, inset: true }] },
        { name: 'Pressed', layers: [{ h: 2, v: 2, blur: 5, spread: 0, color: '#000000', opacity: 20, inset: true }, { h: -2, v: -2, blur: 5, spread: 0, color: '#ffffff', opacity: 60, inset: true }] },
        { name: 'Neumorph', layers: [{ h: 5, v: 5, blur: 10, spread: 0, color: '#000000', opacity: 15, inset: false }, { h: -5, v: -5, blur: 10, spread: 0, color: '#ffffff', opacity: 70, inset: false }] },
        { name: 'Engraved', layers: [{ h: 0, v: 1, blur: 0, spread: 0, color: '#ffffff', opacity: 50, inset: true }, { h: 0, v: -1, blur: 0, spread: 0, color: '#000000', opacity: 30, inset: true }] },
        { name: 'Groove', layers: [{ h: 0, v: 3, blur: 6, spread: -2, color: '#000000', opacity: 25, inset: true }, { h: 0, v: -3, blur: 6, spread: -2, color: '#ffffff', opacity: 50, inset: true }] },
      ],
    };

    function bsLayerToCSS(layer) {
      const r = parseInt(layer.color.slice(1, 3), 16);
      const g = parseInt(layer.color.slice(3, 5), 16);
      const b = parseInt(layer.color.slice(5, 7), 16);
      const a = (layer.opacity / 100).toFixed(2);
      return `${layer.inset ? 'inset ' : ''}${layer.h}px ${layer.v}px ${layer.blur}px ${layer.spread}px rgba(${r},${g},${b},${a})`;
    }

    function bsBuildCSS() { return bsLayers.map(bsLayerToCSS).join(',\n             '); }

    function bsBuildTailwind() {
      const val = bsLayers.map(l => {
        const r = parseInt(l.color.slice(1, 3), 16);
        const g = parseInt(l.color.slice(3, 5), 16);
        const b = parseInt(l.color.slice(5, 7), 16);
        const a = (l.opacity / 100).toFixed(2);
        return `${l.inset ? 'inset_' : ''}${l.h}px_${l.v}px_${l.blur}px_${l.spread}px_rgba(${r}_${g}_${b}_/_${a})`;
      }).join(',');
      return `shadow-[${val}]`;
    }

    function bsBuildScss() {
      return `$shadow: ${bsBuildCSS()};\n\n.element {\n  box-shadow: $shadow;\n}`;
    }

    function bsRender() {
      const preview = document.getElementById('bsPreviewEl');
      const canvas = document.getElementById('bsCanvas');
      const codeEl = document.getElementById('bsShadowCode');
      const radius = parseInt(document.getElementById('bsBorderRadius')?.value) || 8;
      const elColor = document.getElementById('bsElColor')?.value || '#ffffff';
      const canvasColor = document.getElementById('bsCanvasColor')?.value || '#f8f9fa';
      if (preview) {
        preview.className =
          bsShape === 'circle' ? 'bs-shape-circle' :
            bsShape === 'wide' ? 'bs-shape-wide' : 'bs-shape-box';
        preview.style.boxShadow = bsLayers.map(bsLayerToCSS).join(', ');
        preview.style.borderRadius = bsShape === 'circle' ? '50%' : radius + 'px';
        preview.style.backgroundColor = elColor;
      }
      if (canvas) canvas.style.backgroundColor = canvasColor;
      if (codeEl) {
        const bsRaw = bsActiveFmt === 'css' ? `box-shadow: ${bsBuildCSS()};`
          : bsActiveFmt === 'tailwind' ? bsBuildTailwind() : bsBuildScss();
        _setCode(codeEl, bsRaw, bsActiveFmt === 'tailwind' ? 'text' : 'css');
      }
    }

    function bsSliderHTML(label, prop, val, min, max, unit) {
      return `<div class="bs-ctrl">
      <div class="bs-ctrl-hdr">
        <span class="bs-ctrl-label">${label}</span>
        <span class="bs-ctrl-val" data-val="${prop}">${val}<span class="bs-ctrl-unit">${unit}</span></span>
      </div>
      <div class="bs-slider-pair">
        <input type="range" class="bs-range" min="${min}" max="${max}" value="${val}" data-prop="${prop}">
        <input type="number" class="bs-num" min="${min}" max="${max}" value="${val}" data-prop="${prop}">
      </div>
    </div>`;
    }

    function bsColorDot(layer) {
      const r = parseInt(layer.color.slice(1, 3), 16);
      const g = parseInt(layer.color.slice(3, 5), 16);
      const b = parseInt(layer.color.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${layer.opacity / 100})`;
    }

    function bsRenderLayers() {
      const list = document.getElementById('bsLayersList');
      if (!list) return;
      list.innerHTML = bsLayers.map((l, idx) => `
      <div class="bs-layer" data-idx="${idx}">
        <div class="bs-layer-hdr">
          <div class="bs-layer-dot" style="background:${bsColorDot(l)}"></div>
          <span class="bs-layer-title">Layer ${idx + 1}</span>
          <label class="bs-inset-lbl"><input type="checkbox" class="bs-inset-cb" data-idx="${idx}" ${l.inset ? 'checked' : ''}> Inset</label>
          <button class="bs-dup-btn" data-idx="${idx}" title="Duplicate layer">&#x2398;</button>
          ${bsLayers.length > 1 ? `<button class="bs-del-btn" data-idx="${idx}" title="Remove">&#x2715;</button>` : ''}
        </div>
        <div class="bs-layer-body">
          <div class="bs-ctrl-row">
            ${bsSliderHTML('X Offset', 'h', l.h, -100, 100, 'px')}
            ${bsSliderHTML('Y Offset', 'v', l.v, -100, 100, 'px')}
          </div>
          <div class="bs-ctrl-row">
            ${bsSliderHTML('Blur', 'blur', l.blur, 0, 100, 'px')}
            ${bsSliderHTML('Spread', 'spread', l.spread, -50, 50, 'px')}
          </div>
          <div class="bs-ctrl-row bs-ctrl-row--color">
            <div class="bs-ctrl bs-ctrl--color">
              <div class="bs-ctrl-hdr"><span class="bs-ctrl-label">Color</span></div>
              <input type="color" class="bs-color-pick" value="${l.color}" data-idx="${idx}">
            </div>
            ${bsSliderHTML('Opacity', 'opacity', l.opacity, 0, 100, '%')}
          </div>
        </div>
      </div>`).join('');

      list.querySelectorAll('.bs-layer').forEach(layerEl => {
        const idx = parseInt(layerEl.dataset.idx);
        layerEl.querySelectorAll('.bs-range, .bs-num').forEach(input => {
          input.addEventListener('input', () => {
            const prop = input.dataset.prop;
            const val = parseFloat(input.value);
            if (isNaN(val)) return; // cleared number field — keep last valid value
            bsLayers[idx][prop] = val;
            layerEl.querySelector(`.bs-slider-pair [data-prop="${prop}"]${input.classList.contains('bs-range') ? '.bs-num' : '.bs-range'}`).value = val;
            const valEl = layerEl.querySelector(`.bs-ctrl-val[data-val="${prop}"]`);
            if (valEl) valEl.firstChild.textContent = val;
            if (prop === 'opacity') layerEl.querySelector('.bs-layer-dot').style.background = bsColorDot(bsLayers[idx]);
            bsRender();
          });
        });
        layerEl.querySelectorAll('.bs-color-pick').forEach(pick => {
          pick.addEventListener('input', () => {
            bsLayers[idx].color = pick.value;
            layerEl.querySelector('.bs-layer-dot').style.background = bsColorDot(bsLayers[idx]);
            bsRender();
          });
        });
        layerEl.querySelectorAll('.bs-inset-cb').forEach(cb => {
          cb.addEventListener('change', () => { bsLayers[idx].inset = cb.checked; bsRender(); });
        });
        layerEl.querySelectorAll('.bs-del-btn').forEach(btn => {
          btn.addEventListener('click', () => { bsLayers.splice(parseInt(btn.dataset.idx), 1); bsRenderLayers(); bsRender(); });
        });
        layerEl.querySelectorAll('.bs-dup-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            if (bsLayers.length >= BS_MAX_LAYERS) {
              showToast(`Maximum ${BS_MAX_LAYERS} layers`, "error");
              return;
            }
            bsLayers.splice(idx + 1, 0, { ...bsLayers[idx] });
            bsRenderLayers();
            bsRender();
          });
        });
      });
    }

    function bsRenderPresets() {
      const grid = document.getElementById('bsPresetGrid');
      if (!grid) return;
      const presets = bsAllPresets[bsActiveCat] || [];
      grid.innerHTML = presets.map(p => {
        const shadow = p.layers.map(bsLayerToCSS).join(', ');
        return `<button class="bs-preset-btn btn-hover" data-preset="${p.name}" style="box-shadow:${shadow}">${p.name}</button>`;
      }).join('');
      grid.querySelectorAll('.bs-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const preset = bsAllPresets[bsActiveCat].find(p => p.name === btn.dataset.preset);
          if (!preset) return;
          bsLayers = preset.layers.map(l => ({ ...l }));
          bsRenderLayers();
          bsRender();
          grid.querySelectorAll('.bs-preset-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });
    }

    document.getElementById('bsCatTabs')?.querySelectorAll('.bs-cat-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        bsActiveCat = tab.dataset.cat;
        document.querySelectorAll('#bsCatTabs .bs-cat-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        bsRenderPresets();
      });
    });

    document.getElementById('bsFmtTabs')?.querySelectorAll('.bs-fmt-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        bsActiveFmt = tab.dataset.fmt;
        document.querySelectorAll('#bsFmtTabs .bs-fmt-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        bsRender();
      });
    });

    document.getElementById('bsCanvas')?.querySelectorAll('.bs-shape-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        bsShape = btn.dataset.shape;
        document.querySelectorAll('#bsCanvas .bs-shape-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        bsRender();
      });
    });

    ['bsCanvasColor', 'bsElColor', 'bsBorderRadius'].forEach(id =>
      document.getElementById(id)?.addEventListener('input', bsRender)
    );

    const BS_MAX_LAYERS = 8;

    document.getElementById('bsAddLayer')?.addEventListener('click', () => {
      if (bsLayers.length >= BS_MAX_LAYERS) {
        showToast(`Maximum ${BS_MAX_LAYERS} layers`, "error");
        return;
      }
      bsLayers.push({ h: 0, v: 4, blur: 12, spread: 0, color: '#000000', opacity: 10, inset: false });
      bsRenderLayers();
      bsRender();
    });

    document.getElementById('bsResetBtn')?.addEventListener('click', () => {
      bsLayers = [{ h: 0, v: 8, blur: 24, spread: -4, color: '#000000', opacity: 15, inset: false }];
      document.getElementById('bsCanvasColor').value = '#f8f9fa';
      document.getElementById('bsElColor').value = '#ffffff';
      document.getElementById('bsBorderRadius').value = '8';
      bsShape = 'box';
      document.querySelectorAll('#bsCanvas .bs-shape-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
      bsActiveCat = 'classic';
      document.querySelectorAll('#bsCatTabs .bs-cat-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
      bsRenderLayers();
      bsRenderPresets();
      bsRender();
    });

    document.getElementById('bsCopyBtn')?.addEventListener('click', (e) => {
      const cEl = document.getElementById('bsShadowCode');
      copyToClipboard(cEl?.dataset.raw || cEl?.textContent || '', e.currentTarget);
    });

    bsRenderLayers();
    bsRenderPresets();
    bsRender();


  }); // ─── end lazy init: box-shadow
  registerToolInit("gradient", () => {
    // Gradient Generator
    const gradientPreview = document.getElementById("gradientPreview");
    const gradientCode = document.getElementById("gradientCode");

    // Gradient presets
    const gradientPresets = {
      sunset: {
        type: "linear",
        direction: "to right",
        stops: [
          { color: "#ff7e5f", position: 0 },
          { color: "#feb47b", position: 100 }
        ]
      },
      ocean: {
        type: "linear",
        direction: "to bottom",
        stops: [
          { color: "#2193b0", position: 0 },
          { color: "#6dd5ed", position: 100 }
        ]
      },
      emerald: {
        type: "linear",
        direction: "45deg",
        stops: [
          { color: "#00b09b", position: 0 },
          { color: "#96c93d", position: 100 }
        ]
      },
      aurora: {
        type: "linear",
        direction: "45deg",
        stops: [
          { color: "#85FFBD", position: 0 },
          { color: "#FFFB7D", position: 100 }
        ]
      },
      cosmic: {
        type: "linear",
        direction: "to right",
        stops: [
          { color: "#0f0c29", position: 0 },
          { color: "#302b63", position: 50 },
          { color: "#24243e", position: 100 }
        ]
      },
      royal: {
        type: "linear",
        direction: "to right",
        stops: [
          { color: "#141e30", position: 0 },
          { color: "#243b55", position: 100 }
        ]
      }
    };

    // Update color stop creation to include number input
    const createColorStop = (color = "#ffffff", position = 50) => {
      const colorStop = document.createElement("div");
      colorStop.classList.add("color-stop");
      colorStop.innerHTML = `
      <input type="color" class="gradientColor" value="${color}">
      <input type="range" class="gradientStop" value="${position}" min="0" max="100">
      <span class="position-label">${position}%</span>
      <input type="number" class="color-stop-input" value="${position}" min="0" max="100">
      <button class="remove-stop btn-hover" title="Remove Color Stop">×</button>
    `;

      // Add event listeners for both range and number inputs
      const rangeInput = colorStop.querySelector(".gradientStop");
      const numberInput = colorStop.querySelector(".color-stop-input");
      const positionLabel = colorStop.querySelector(".position-label");

      rangeInput.addEventListener("input", (e) => {
        numberInput.value = e.target.value;
        positionLabel.textContent = `${e.target.value}%`;
        updateGradient();
      });

      numberInput.addEventListener("input", (e) => {
        const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
        rangeInput.value = value;
        numberInput.value = value;
        positionLabel.textContent = `${value}%`;
        updateGradient();
      });

      colorStop.querySelector(".gradientColor").addEventListener("input", updateGradient);

      colorStop.querySelector(".remove-stop").addEventListener("click", () => {
        if (document.querySelectorAll(".color-stop").length > 2) {
          colorStop.remove();
          updateGradient();
        } else {
          showToast("Minimum 2 color stops", "error");
        }
      });

      return colorStop;
    };

    const GRADIENT_MAX_STOPS = 10;

    document.getElementById("addColorStop").addEventListener("click", () => {
      const colorStops = document.getElementById("colorStops");
      if (colorStops.querySelectorAll(".color-stop").length >= GRADIENT_MAX_STOPS) {
        showToast(`Maximum ${GRADIENT_MAX_STOPS} color stops`, "error");
        return;
      }
      colorStops.appendChild(createColorStop("#ffffff", 100));
      updateGradient();
    });

    // Update applyGradientPreset to use createColorStop
    const applyGradientPreset = (preset) => {
      const presetData = gradientPresets[preset];
      document.getElementById("gradientType").value = presetData.type;

      if (presetData.type === "linear") {
        document.getElementById("gradientDirection").value = presetData.direction;
      } else if (presetData.type === "radial") {
        document.getElementById("radialShape").value = presetData.shape;
      }

      // Clear existing color stops
      const colorStops = document.getElementById("colorStops");
      while (colorStops.children.length > 0) {
        colorStops.removeChild(colorStops.lastChild);
      }

      // Add new color stops
      presetData.stops.forEach(stop => {
        colorStops.appendChild(createColorStop(stop.color, stop.position));
      });

      updateGradient();
    };

    const updateGradient = () => {
      const type = document.getElementById("gradientType").value;
      const direction = document.getElementById("gradientDirection").value;
      const customAngle = document.getElementById("customAngle").value;
      const radialShape = document.getElementById("radialShape").value;

      // Handle gradient type specific controls visibility
      document.getElementById("linearControls").classList.toggle("hidden", type !== "linear");
      document.getElementById("radialControls").classList.toggle("hidden", type !== "radial");
      document.getElementById("customAngleControls").classList.toggle("hidden", direction !== "custom");

      let gradientParams = "";
      if (type === "linear") {
        gradientParams = direction === "custom" ? `${customAngle}deg` : direction;
      } else if (type === "radial") {
        gradientParams = radialShape;
      }

      // Sort by position so the generated CSS reads cleanly regardless of UI order
      const colorStops = Array.from(document.querySelectorAll(".color-stop"))
        .map(stop => ({
          color: stop.querySelector(".gradientColor").value,
          pos: parseInt(stop.querySelector(".gradientStop").value, 10) || 0,
        }))
        .sort((a, b) => a.pos - b.pos)
        .map(s => `${s.color} ${s.pos}%`)
        .join(", ");

      const gradient = `${type}-gradient(${gradientParams ? gradientParams + ", " : ""}${colorStops})`;
      gradientPreview.style.backgroundImage = gradient;
      _setCode(gradientCode, `background-image: ${gradient};`);
    };

    // Update custom angle value display with improved visuals
    document.getElementById("customAngle").addEventListener("input", (e) => {
      document.getElementById("customAngleValue").textContent = `${e.target.value}°`;
      document.getElementById("angleVisualizer").style.transform = `rotate(${e.target.value}deg)`;
    });

    // Add event listeners for the gradient controls.
    // Color-stop rows bind their own handlers in createColorStop — skip them.
    document.querySelectorAll("#gradient select, #gradient input").forEach(input => {
      if (input.closest(".color-stop")) return;
      input.addEventListener("input", updateGradient);
    });

    // Preset buttons: paint each swatch from the preset data itself,
    // so the swatch always matches what clicking it produces.
    document.querySelectorAll(".gradient-preset").forEach(button => {
      const p = gradientPresets[button.dataset.preset];
      if (p) button.style.background =
        `linear-gradient(${p.direction}, ${p.stops.map(s => `${s.color} ${s.position}%`).join(", ")})`;
      button.addEventListener("click", () => {
        applyGradientPreset(button.dataset.preset);
      });
    });

    // Build the two default stops through createColorStop so every stop —
    // including the initial pair — has working remove/sync handlers.
    const initialStops = document.getElementById("colorStops");
    initialStops.innerHTML = "";
    initialStops.appendChild(createColorStop("#000000", 0));
    initialStops.appendChild(createColorStop("#ffffff", 100));
    updateGradient();

    document.getElementById("copyGradient").addEventListener("click", (e) => {
      copyToClipboard(gradientCode.dataset.raw || gradientCode.textContent, e.currentTarget);
    });

    // Gradient Reset Functionality
    document.getElementById("resetGradient").addEventListener("click", () => {
      // Reset gradient type and direction
      document.getElementById("gradientType").value = "linear";
      document.getElementById("gradientDirection").value = "to right";
      document.getElementById("radialShape").value = "circle";
      document.getElementById("customAngle").value = "90";
      document.getElementById("angleVisualizer").style.transform = "rotate(90deg)";
      document.getElementById("customAngleValue").textContent = "90°";

      // Clear existing color stops
      const colorStops = document.getElementById("colorStops");
      while (colorStops.children.length > 0) {
        colorStops.removeChild(colorStops.lastChild);
      }

      // Add default color stops (black to white)
      const stop1 = createColorStop("#000000", 0);
      const stop2 = createColorStop("#ffffff", 100);
      colorStops.appendChild(stop1);
      colorStops.appendChild(stop2);

      // Update the preview
      updateGradient();

      // Show/hide appropriate controls
      document.getElementById("linearControls").classList.remove("hidden");
      document.getElementById("radialControls").classList.add("hidden");
      document.getElementById("customAngleControls").classList.add("hidden");
    });


  }); // ─── end lazy init: gradient
  registerToolInit("unit-converter", () => {
    // Unit Converter
    // Defaults used as fallback when active tab is a restricted page (chrome://, etc.)
    let viewportWidth = 1280;
    let viewportHeight = 720;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => ({ width: window.innerWidth, height: window.innerHeight })
        }).then(results => {
          if (results && results[0] && results[0].result) {
            viewportWidth = results[0].result.width;
            viewportHeight = results[0].result.height;
            const hint = document.getElementById("viewportHint");
            if (hint) hint.textContent = `Active tab viewport: ${viewportWidth}×${viewportHeight}px`;
          }
        }).catch(() => {
          const hint = document.getElementById("viewportHint");
          if (hint) hint.textContent = `Viewport: ${viewportWidth}×${viewportHeight}px (open a page first)`;
        });
      }
    });

    // Every conversion goes through px as the hub unit
    const unitToPx = (value, unit, base) => {
      switch (unit) {
        case "px": return value;
        case "rem": case "em": return value * base;
        case "%": return (value / 100) * base;
        case "vh": return (value / 100) * viewportHeight;
        case "vw": return (value / 100) * viewportWidth;
        case "vmin": return (value / 100) * Math.min(viewportHeight, viewportWidth);
        case "vmax": return (value / 100) * Math.max(viewportHeight, viewportWidth);
        case "pt": return value * (96 / 72);
        default: return 0;
      }
    };

    const pxToUnit = (px, unit, base) => {
      switch (unit) {
        case "px": return px;
        case "rem": case "em": return px / base;
        case "%": return (px / base) * 100;
        case "vh": return (px / viewportHeight) * 100;
        case "vw": return (px / viewportWidth) * 100;
        case "vmin": return (px / Math.min(viewportHeight, viewportWidth)) * 100;
        case "vmax": return (px / Math.max(viewportHeight, viewportWidth)) * 100;
        case "pt": return px * (72 / 96);
        default: return 0;
      }
    };

    const ALL_UNITS = ["px", "rem", "em", "%", "vh", "vw", "vmin", "vmax", "pt"];

    // Trim trailing zeros: 1.50 → 1.5, 16.00 → 16
    const fmtUnit = (n) => (+n.toFixed(3)).toString();

    const updateConversion = () => {
      const baseFontSize = parseFloat(document.getElementById("baseFontSize").value) || 16;
      const inputValue = parseFloat(document.getElementById("inputValue").value) || 0;
      const inputUnit = document.getElementById("inputUnit").value;
      const outputUnit = document.getElementById("outputUnit").value;

      const pxValue = unitToPx(inputValue, inputUnit, baseFontSize);
      const outputValue = pxToUnit(pxValue, outputUnit, baseFontSize);

      _setCode('conversionResult', `${inputValue}${inputUnit} = ${fmtUnit(outputValue)}${outputUnit}`, 'text');

      // All-units table
      document.getElementById("unitTable").innerHTML = ALL_UNITS.map(u => {
        const val = `${fmtUnit(pxToUnit(pxValue, u, baseFontSize))}${u}`;
        return `<button class="unit-row${u === inputUnit ? " unit-row--src" : ""}" data-copy="${val}" title="Copy ${val}">
        <span class="unit-row-unit">${u}</span>
        <span class="unit-row-val">${val}</span>
      </button>`;
      }).join("");
    };

    document.getElementById("unitTable").addEventListener("click", (e) => {
      const row = e.target.closest(".unit-row");
      if (row) copyToClipboard(row.dataset.copy);
    });

    document.getElementById("swapUnits").addEventListener("click", () => {
      const inUnit = document.getElementById("inputUnit");
      const outUnit = document.getElementById("outputUnit");
      const base = parseFloat(document.getElementById("baseFontSize").value) || 16;
      const inputEl = document.getElementById("inputValue");
      // Carry the converted value across so the result stays equivalent
      const px = unitToPx(parseFloat(inputEl.value) || 0, inUnit.value, base);
      [inUnit.value, outUnit.value] = [outUnit.value, inUnit.value];
      if (inputEl.value !== "") inputEl.value = fmtUnit(pxToUnit(px, inUnit.value, base));
      updateConversion();
    });

    // Add event listeners for unit converter
    document.querySelectorAll("#unit-converter input, #unit-converter select").forEach(input => {
      input.addEventListener("input", updateConversion);
    });

    updateConversion();

    // Quick convert buttons
    document.querySelectorAll(".quick-convert").forEach(button => {
      button.addEventListener("click", () => {
        const value = button.dataset.value;
        const fromUnit = button.dataset.from;
        const toUnit = button.dataset.to;

        document.getElementById("inputValue").value = value;
        document.getElementById("inputUnit").value = fromUnit;
        document.getElementById("outputUnit").value = toUnit;
        updateConversion();
      });
    });

    document.getElementById("copyConversion").addEventListener("click", (e) => {
      const cvEl = document.getElementById("conversionResult");
      copyToClipboard(cvEl.dataset.raw || cvEl.textContent, e.currentTarget);
    });



  }); // ─── end lazy init: unit-converter
  registerToolInit("contrast-checker", () => {
    // Updated Color Contrast Checker
    const foregroundColorInput = document.getElementById("foregroundColor");
    const foregroundColorText = document.getElementById("foregroundColorText");
    const backgroundColorInput = document.getElementById("backgroundColor");
    const backgroundColorText = document.getElementById("backgroundColorText");
    const contrastPreview = document.getElementById("contrastPreview");
    const contrastRatioOutput = document.getElementById("contrastRatio");
    const wcagComplianceOutput = document.getElementById("wcagCompliance");
    const wcagLargeTextOutput = document.getElementById("wcagLargeText");
    const wcagUIOutput = document.getElementById("wcagUI");
    const fontSizeToggle = document.querySelectorAll("input[name='fontSize']");

    const syncColorInputs = (colorInput, colorText) => {
      colorInput.addEventListener("input", () => {
        colorText.value = colorInput.value;
        updateContrastChecker();
      });

      colorText.addEventListener("input", () => {
        let v = colorText.value.trim();
        // Expand 3-digit shorthand (#abc → #aabbcc)
        if (/^#[0-9A-Fa-f]{3}$/.test(v)) v = "#" + [...v.slice(1)].map(c => c + c).join("");
        if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
          colorInput.value = v;
          updateContrastChecker();
        }
      });
    };

    syncColorInputs(foregroundColorInput, foregroundColorText);
    syncColorInputs(backgroundColorInput, backgroundColorText);

    const calculateContrastRatio = (fg, bg) => {
      const luminance = (color) => {
        const rgb = color.match(/\w\w/g).map((c) => parseInt(c, 16) / 255);
        const [r, g, b] = rgb.map((c) =>
          c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
        );
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };

      const fgLuminance = luminance(fg);
      const bgLuminance = luminance(bg);
      const ratio =
        fgLuminance > bgLuminance
          ? (fgLuminance + 0.05) / (bgLuminance + 0.05)
          : (bgLuminance + 0.05) / (fgLuminance + 0.05);

      return ratio.toFixed(2);
    };

    toolAPI["contrast-checker"] = { update: () => updateContrastChecker() };

    const updateContrastChecker = () => {
      const fg = foregroundColorInput.value.slice(1);
      const bg = backgroundColorInput.value.slice(1);
      const ratio = calculateContrastRatio(fg, bg);

      contrastRatioOutput.textContent = `Contrast Ratio: ${ratio}:1`;
      contrastRatioOutput.className = ratio >= 4.5 ? "pass" : "fail";

      wcagComplianceOutput.textContent =
        ratio >= 7
          ? "WCAG Compliance: AAA"
          : ratio >= 4.5
            ? "WCAG Compliance: AA"
            : "WCAG Compliance: Fail";
      wcagComplianceOutput.className = ratio >= 4.5 ? "pass" : "fail";

      wcagLargeTextOutput.textContent =
        ratio >= 4.5
          ? "Large Text Compliance: AAA"
          : ratio >= 3
            ? "Large Text Compliance: AA"
            : "Large Text Compliance: Fail";
      wcagLargeTextOutput.className = ratio >= 3 ? "pass" : "fail";

      wcagUIOutput.textContent =
        ratio >= 3
          ? "UI Components Compliance: AA"
          : "UI Components Compliance: Fail";
      wcagUIOutput.className = ratio >= 3 ? "pass" : "fail";

      contrastPreview.style.color = foregroundColorInput.value;
      contrastPreview.style.backgroundColor = backgroundColorInput.value;

      renderContrastSuggestion(parseFloat(ratio));
    };

    // ── Accessible color suggestion engine ──
    // Walks lightness from the original value in `dir` until the candidate
    // meets `target` contrast against the background.
    function findPassingLightness(h, s, startL, bgHex, target, dir) {
      for (let l = startL; l >= 0 && l <= 100; l += dir) {
        const cand = hslToHex(h, s, l);
        if (parseFloat(calculateContrastRatio(cand.slice(1), bgHex.slice(1))) >= target) return cand;
      }
      return null;
    }

    // Builds a diverse set of accessible alternatives:
    // - your hue at the minimum AA lightness (closest to the original)
    // - your hue pushed to AAA (7:1) for body text
    // - two hue rotations (±25°) so you get genuinely different colors
    // - a muted and a vivid saturation variant
    // - black/white as the maximum-contrast fallback
    // Near-gray text borrows the background's hue for harmonious tints.
    function suggestAccessibleColors(fgHex, bgHex) {
      const fgRgb = hexToRgb(fgHex);
      const { h, s, l } = rgbToHsl(fgRgb.r, fgRgb.g, fgRgb.b);
      const bgRgb = hexToRgb(bgHex);
      const bgHsl = rgbToHsl(bgRgb.r, bgRgb.g, bgRgb.b);
      const dir = relativeLuminance(bgHex) > 0.5 ? -1 : 1;

      // Near-gray text: tint with the background's hue for harmony — but if the
      // background is also achromatic (white/black/gray), stay neutral gray
      // instead of inheriting its meaningless 0° (red) hue.
      const isGrayish = s < 10;
      const bgIsGrayish = bgHsl.s < 10;
      const baseHue = isGrayish ? bgHsl.h : h;
      const baseSat = isGrayish ? (bgIsGrayish ? 0 : 45) : s;

      const candidates = [];
      const tryAdd = (label, hue, sat, target) => {
        hue = ((hue % 360) + 360) % 360;
        sat = Math.min(100, Math.max(0, Math.round(sat)));
        const hex = findPassingLightness(hue, sat, l, bgHex, target, dir)
          || findPassingLightness(hue, sat, l, bgHex, target, -dir);
        if (hex) candidates.push({ label, hex });
      };

      tryAdd("Closest AA", baseHue, baseSat, 4.5);
      tryAdd("AAA", baseHue, baseSat, 7);
      tryAdd("Hue −25°", baseHue - 25, baseSat, 4.5);
      tryAdd("Hue +25°", baseHue + 25, baseSat, 4.5);
      tryAdd("Muted", baseHue, baseSat * 0.35, 4.5);
      tryAdd("Vivid", baseHue, baseSat * 1.4 + 10, 4.5);

      const bw = dir === -1 ? "#000000" : "#ffffff";
      candidates.push({ label: "Max contrast", hex: bw });

      // Dedupe, verify, attach the real ratio + earned badge
      const seen = new Set();
      return candidates.filter(c => {
        const key = c.hex.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        c.ratio = parseFloat(calculateContrastRatio(c.hex.slice(1), bgHex.slice(1)));
        c.badge = c.ratio >= 7 ? "AAA" : "AA";
        return c.ratio >= 4.5;
      }).slice(0, 6);
    }

    function renderContrastSuggestion(ratio) {
      const el = document.getElementById("contrastSuggest");
      // Already AAA — nothing to improve
      if (ratio >= 7) { el.innerHTML = ""; return; }

      const bgHex = backgroundColorInput.value;
      const list = suggestAccessibleColors(foregroundColorInput.value, bgHex);
      if (!list.length) { el.innerHTML = ""; return; }

      const title = ratio < 4.5
        ? "Fails AA: accessible alternatives"
        : "Passes AA: AAA upgrades available";

      el.innerHTML = `
      <div class="contrast-suggest-title">${title} <small>click a card to apply</small></div>
      <div class="contrast-suggest-grid">
        ${list.map(c => `
          <button class="suggest-card" data-hex="${c.hex}" title="Apply ${c.hex} as text color">
            <span class="suggest-preview" style="background:${bgHex};color:${c.hex}">Aa</span>
            <span class="suggest-meta">
              <code>${c.hex}</code>
              <span class="suggest-sub">${c.label}</span>
              <span class="suggest-stats">
                <span class="suggest-badge suggest-badge--${c.badge.toLowerCase()}">${c.badge}</span>
                ${c.ratio.toFixed(2)}:1
              </span>
            </span>
          </button>`).join("")}
      </div>`;

      el.querySelectorAll(".suggest-card").forEach(card => {
        card.addEventListener("click", () => {
          foregroundColorInput.value = card.dataset.hex;
          foregroundColorText.value = card.dataset.hex;
          updateContrastChecker();
          showToast(`Applied ${card.dataset.hex}`);
        });
      });
    }

    async function pickColorInto(colorEl, textEl) {
      if (!window.EyeDropper) {
        showToast("Eyedropper is not supported in this browser", "error");
        return;
      }
      try {
        const result = await new EyeDropper().open();
        colorEl.value = result.sRGBHex;
        textEl.value = result.sRGBHex;
        updateContrastChecker();
      } catch { /* user cancelled */ }
    }

    document.getElementById("pickFgBtn").addEventListener("click", () => pickColorInto(foregroundColorInput, foregroundColorText));
    document.getElementById("pickBgBtn").addEventListener("click", () => pickColorInto(backgroundColorInput, backgroundColorText));

    document.getElementById("swapContrastBtn").addEventListener("click", () => {
      const fg = foregroundColorInput.value;
      foregroundColorInput.value = backgroundColorInput.value;
      foregroundColorText.value = backgroundColorInput.value;
      backgroundColorInput.value = fg;
      backgroundColorText.value = fg;
      updateContrastChecker();
    });

    fontSizeToggle.forEach(toggle => {
      toggle.addEventListener("change", () => {
        const isLargeText = document.querySelector("input[name='fontSize']:checked").value === "large";
        contrastPreview.style.fontSize = isLargeText ? "24px" : "16px";
        updateContrastChecker();
      });
    });

    // Set the initial font size based on the default checked value
    const isLargeText = document.querySelector("input[name='fontSize']:checked").value === "large";
    contrastPreview.style.fontSize = isLargeText ? "24px" : "16px";

    updateContrastChecker();



  }); // ─── end lazy init: contrast-checker
  registerToolInit("palette-extractor", () => {
    // ─── PAGE PALETTE EXTRACTOR ─────────────────────────────────────────────────

    (function () {
      const scanBtn = document.getElementById("ppScanBtn");
      const resultsEl = document.getElementById("ppResults");
      const summaryEl = document.getElementById("ppSummary");
      const gridEl = document.getElementById("ppGrid");
      const errEl = document.getElementById("ppError");
      let ppColors = [];
      let ppFilter = "all";

      function ppRender() {
        const list = ppColors.filter(c => ppFilter === "all" || c.uses[ppFilter] > 0);
        summaryEl.textContent = `${ppColors.length} unique colors · showing ${list.length}`;
        gridEl.innerHTML = list.map(c => `
        <button class="pp-card" data-copy="${c.display}" title="Copy ${c.display}">
          <span class="pp-swatch" style="background:${c.css}"></span>
          <span class="pp-meta">
            <code>${c.display}</code>
            <span class="pp-uses">${c.total}× · ${["text", "bg", "border"].filter(k => c.uses[k]).map(k => `${k} ${c.uses[k]}`).join(", ")}</span>
          </span>
        </button>`).join("");
      }

      gridEl.addEventListener("click", e => {
        const card = e.target.closest(".pp-card");
        if (card) copyToClipboard(card.dataset.copy);
      });

      document.querySelectorAll(".pp-filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          document.querySelectorAll(".pp-filter-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          ppFilter = btn.dataset.filter;
          ppRender();
        });
      });

      document.getElementById("ppExportVars").addEventListener("click", (e) => {
        if (!ppColors.length) return;
        const lines = ppColors.map((c, i) => `  --page-color-${i + 1}: ${c.display};`);
        copyToClipboard(`:root {\n${lines.join("\n")}\n}`, e.currentTarget);
      });

      document.getElementById("ppExportJson").addEventListener("click", (e) => {
        if (!ppColors.length) return;
        copyToClipboard(JSON.stringify(ppColors.map(c => ({ color: c.display, count: c.total, uses: c.uses })), null, 2), e.currentTarget);
      });

      function ppScan() {
        scanBtn.textContent = "Scanning…";
        scanBtn.disabled = true;
        errEl.textContent = "";

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs[0]) { scanBtn.textContent = "↻ Rescan"; scanBtn.disabled = false; return; }
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
              const counts = new Map();
              const add = (val, kind) => {
                if (!val || !val.startsWith("rgb")) return;
                // skip fully transparent values
                const m = val.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
                if (!m) return;
                const a = m[4] === undefined ? 1 : parseFloat(m[4]);
                if (a === 0) return;
                const key = `${m[1]},${m[2]},${m[3]},${a}`;
                let e = counts.get(key);
                if (!e) { e = { r: +m[1], g: +m[2], b: +m[3], a, text: 0, bg: 0, border: 0 }; counts.set(key, e); }
                e[kind]++;
              };
              const els = document.querySelectorAll("*");
              const n = Math.min(els.length, 5000);
              for (let i = 0; i < n; i++) {
                const cs = getComputedStyle(els[i]);
                add(cs.color, "text");
                add(cs.backgroundColor, "bg");
                if (cs.borderTopWidth !== "0px" && cs.borderTopStyle !== "none") add(cs.borderTopColor, "border");
              }
              return [...counts.values()]
                .map(c => ({ ...c, total: c.text + c.bg + c.border }))
                .sort((x, y) => y.total - x.total)
                .slice(0, 60);
            },
          }, (results) => {
            scanBtn.textContent = "↻ Rescan";
            scanBtn.disabled = false;
            if (chrome.runtime.lastError || !results?.[0]?.result) {
              errEl.textContent = "Could not scan this page. Try a regular HTTP/HTTPS page.";
              resultsEl.classList.add("hidden");
              return;
            }
            // Rebuild every color string ourselves from parsed numbers —
            // nothing from the page reaches innerHTML directly.
            ppColors = results[0].result.map(c => {
              const css = c.a === 1 ? `rgb(${c.r},${c.g},${c.b})` : `rgba(${c.r},${c.g},${c.b},${c.a})`;
              const display = c.a === 1 ? rgbToHex(c.r, c.g, c.b) : css;
              return { css, display, total: c.total, uses: { text: c.text, bg: c.bg, border: c.border } };
            });
            resultsEl.classList.remove("hidden");
            ppRender();
          });
        });
      }

      scanBtn.addEventListener("click", ppScan);
      registerTabHook("palette-extractor", ppScan);
    })();



  }); // ─── end lazy init: palette-extractor
  registerToolInit("color-scale", () => {
    // ─── COLOR SCALE GENERATOR ──────────────────────────────────────────────────

    const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
    const SCALE_L = { 50: 97, 100: 93, 200: 86, 300: 76, 400: 65, 500: 55, 600: 45, 700: 37, 800: 28, 900: 20, 950: 13 };

    // Fixed lightness targets with the base color anchored at its nearest step,
    // so the exact input color always appears in the scale.
    function buildColorScale(baseHex) {
      const { r, g, b } = hexToRgb(baseHex);
      const { h, s, l } = rgbToHsl(r, g, b);
      let closest = SCALE_STEPS[0];
      SCALE_STEPS.forEach(st => {
        if (Math.abs(SCALE_L[st] - l) < Math.abs(SCALE_L[closest] - l)) closest = st;
      });
      return SCALE_STEPS.map(st => ({
        step: st,
        hex: st === closest ? baseHex : hslToHex(h, s, SCALE_L[st]),
        base: st === closest,
      }));
    }

    function scaleTokenName() {
      const raw = document.getElementById("scaleName").value.trim();
      return raw.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase() || "brand";
    }

    toolAPI["color-scale"] = { update: () => updateColorScaleTool() };

    function updateColorScaleTool() {
      const base = document.getElementById("scaleBase").value;
      const fmt = document.querySelector('input[name="scaleFormat"]:checked')?.value || "tailwind";
      const name = scaleTokenName();
      const scale = buildColorScale(base);

      document.getElementById("scaleStrip").innerHTML = scale.map(s => `
      <button class="scale-swatch${s.base ? " scale-swatch--base" : ""}" data-hex="${s.hex}"
        style="background:${s.hex}" title="${s.step}: ${s.hex}${s.base ? " (your base color)" : ""} · click to copy">
        <span class="scale-swatch-step">${s.step}</span>
      </button>`).join("");

      let out;
      if (fmt === "tailwind") {
        out = `// tailwind.config.js → theme.extend.colors\n'${name}': {\n${scale.map(s => `  ${s.step}: '${s.hex}',`).join("\n")}\n},`;
      } else if (fmt === "tailwind4") {
        out = `/* Tailwind v4: add to your CSS */\n@theme {\n${scale.map(s => `  --color-${name}-${s.step}: ${hexToOklch(s.hex)};`).join("\n")}\n}`;
      } else {
        out = `:root {\n${scale.map(s => `  --${name}-${s.step}: ${s.hex};`).join("\n")}\n}`;
      }
      _setCode("scaleOutput", out, fmt === "tailwind" ? "text" : "css");
    }

    document.getElementById("scaleStrip").addEventListener("click", e => {
      const sw = e.target.closest(".scale-swatch");
      if (sw) copyToClipboard(sw.dataset.hex);
    });

    document.getElementById("scaleBase").addEventListener("input", () => {
      document.getElementById("scaleBaseText").value = document.getElementById("scaleBase").value;
      updateColorScaleTool();
    });

    document.getElementById("scaleBaseText").addEventListener("input", () => {
      let v = document.getElementById("scaleBaseText").value.trim();
      if (/^#[0-9A-Fa-f]{3}$/.test(v)) v = "#" + [...v.slice(1)].map(c => c + c).join("");
      if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
        document.getElementById("scaleBase").value = v;
        updateColorScaleTool();
      }
    });

    document.getElementById("scaleName").addEventListener("input", updateColorScaleTool);
    document.querySelectorAll('input[name="scaleFormat"]').forEach(r => r.addEventListener("change", updateColorScaleTool));

    document.getElementById("copyScale").addEventListener("click", (e) => {
      const out = document.getElementById("scaleOutput");
      copyToClipboard(out.dataset.raw || out.textContent, e.currentTarget);
    });

    updateColorScaleTool();



  }); // ─── end lazy init: color-scale
  registerToolInit("text-case", () => {
    // Text Case Converter
    const textInput = document.getElementById("textInput");
    const textStats = document.getElementById("textStats");
    const copyText = document.getElementById("copyText");
    const downloadText = document.getElementById("downloadText");
    const undoButton = document.getElementById("undoButton");
    let debounceTimer;
    let textHistory = [];
    let currentHistoryIndex = -1;

    // Helper function to update word and character count and button states
    const updateStats = () => {
      const text = textInput.value;
      const chars = text.length;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      textStats.textContent = `Characters: ${chars} | Words: ${words}`;

      // Update button states
      const hasContent = text.trim().length > 0;
      copyText.disabled = !hasContent;
      downloadText.disabled = !hasContent;
      undoButton.disabled = currentHistoryIndex <= 0;
    };
    // Function to add text state to history
    const addToHistory = (text) => {
      // Remove any forward history if we're not at the end
      if (currentHistoryIndex < textHistory.length - 1) {
        textHistory = textHistory.slice(0, currentHistoryIndex + 1);
      }
      // Add new state
      textHistory.push(text);
      currentHistoryIndex = textHistory.length - 1;
      updateStats();
    };

    // Handle text input with debounce
    textInput.addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        addToHistory(e.target.value);
        updateStats();
      }, 300);
    });

    // Handle undo functionality (Ctrl+Z)
    const handleUndo = () => {
      if (currentHistoryIndex > 0) {
        currentHistoryIndex--;
        textInput.value = textHistory[currentHistoryIndex];
        updateStats();
      }
    };

    // Add keyboard shortcut for undo
    textInput.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        handleUndo();
      }
    });

    // Add click handler for undo button
    undoButton.addEventListener("click", handleUndo);

    // Splits any input (spaces, punctuation, existing camelCase…) into words
    const toCaseWords = (text) =>
      text.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(/[^a-zA-Z0-9]+/).filter(Boolean);

    const capWord = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

    // Developer cases convert each line independently so multi-line input survives
    const perLine = (fn) => (text) =>
      text.split("\n").map(line => line.trim() ? fn(line) : line).join("\n");

    // Case conversion functions
    const caseConverters = {
      upper: (text) => text.toUpperCase(),
      lower: (text) => text.toLowerCase(),
      title: (text) => text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase()),
      sentence: (text) => text.replace(/(^\w|\.\s+\w)/g, letter => letter.toUpperCase()),
      capitalize: (text) => text.replace(/\b\w/g, letter => letter.toUpperCase()),
      toggle: (text) => text.split('').map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join(''),
      inverse: (text) => text.split('').map((c, i) => i % 2 ? c.toUpperCase() : c.toLowerCase()).join(''),
      camel: perLine(t => toCaseWords(t).map((w, i) => i ? capWord(w) : w.toLowerCase()).join("")),
      pascal: perLine(t => toCaseWords(t).map(capWord).join("")),
      snake: perLine(t => toCaseWords(t).map(w => w.toLowerCase()).join("_")),
      kebab: perLine(t => toCaseWords(t).map(w => w.toLowerCase()).join("-")),
      constant: perLine(t => toCaseWords(t).map(w => w.toUpperCase()).join("_")),
      dot: perLine(t => toCaseWords(t).map(w => w.toLowerCase()).join(".")),
    };

    // Add event listeners for case conversion buttons
    document.querySelectorAll('#text-case button[data-case]').forEach(button => {
      button.addEventListener('click', () => {
        const converter = caseConverters[button.dataset.case];
        if (converter && textInput.value.trim()) {
          // Snapshot pasted/typed text the debounce hasn't recorded yet,
          // so Undo can always return to the pre-conversion state
          if (textHistory[currentHistoryIndex] !== textInput.value) {
            addToHistory(textInput.value);
          }
          const newText = converter(textInput.value);
          textInput.value = newText;
          addToHistory(newText);
        }
      });
    });

    // Utility functions
    document.getElementById('removeSpaces').addEventListener('click', () => {
      if (textInput.value.trim()) {
        if (textHistory[currentHistoryIndex] !== textInput.value) {
          addToHistory(textInput.value);
        }
        const newText = textInput.value.replace(/\s+/g, ' ').trim();
        textInput.value = newText;
        addToHistory(newText);
      }
    });

    document.getElementById('clearText').addEventListener('click', () => {
      if (textInput.value.trim()) {
        textInput.value = '';
        addToHistory('');
      }
    });

    document.getElementById('copyText').addEventListener('click', (e) => {
      copyToClipboard(textInput.value, e.currentTarget);
    });

    document.getElementById('downloadText').addEventListener('click', () => {
      const blob = new Blob([textInput.value], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'converted-text.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });


  }); // ─── end lazy init: text-case
  registerToolInit("fluid-design", () => {
    // ─── FLUID DESIGN SYSTEM ────────────────────────────────────────────────────

    function fluidClamp(minPx, maxPx, minVp, maxVp) {
      const lo = Math.min(minPx, maxPx);
      const hi = Math.max(minPx, maxPx);
      if (Math.abs(hi - lo) < 0.01 || maxVp === minVp) return `${(lo / 16).toFixed(3)}rem`;
      const slope = (maxPx - minPx) / (maxVp - minVp);
      const intercept = minPx - slope * minVp;
      return `clamp(${(lo / 16).toFixed(3)}rem, ${(intercept / 16).toFixed(3)}rem + ${(slope * 100).toFixed(3)}vw, ${(hi / 16).toFixed(3)}rem)`;
    }

    function updateFluidDesign() {
      const baseSize = parseFloat(document.getElementById("fluidBaseSize").value) || 16;
      const minScale = parseFloat(document.getElementById("fluidMinScale").value) || 1.2;
      const maxScale = parseFloat(document.getElementById("fluidMaxScale").value) || 1.333;
      const minVp = parseFloat(document.getElementById("fluidMinVp").value) || 320;
      const maxVp = parseFloat(document.getElementById("fluidMaxVp").value) || 1280;
      // Normalize the free-text prefix into a valid custom-property name:
      // strip anything but letters/digits/hyphens, ensure leading -- and trailing -
      let rawPrefix = (document.getElementById("fluidVarPrefix").value || "--font-")
        .trim().replace(/[^a-zA-Z0-9-]/g, "") || "--font-";
      if (!rawPrefix.startsWith("--")) rawPrefix = "--" + rawPrefix.replace(/^-+/, "");
      const prefix = rawPrefix.endsWith("-") ? rawPrefix : rawPrefix + "-";
      const format = document.querySelector('input[name="fluidFormat"]:checked')?.value || "css";

      const typeSteps = [
        { name: "h1", step: 5 },
        { name: "h2", step: 4 },
        { name: "h3", step: 3 },
        { name: "h4", step: 2 },
        { name: "h5", step: 1 },
        { name: "h6", step: 0.5 },
        { name: "body", step: 0 },
        { name: "sm", step: -0.5 },
        { name: "xs", step: -1 },
      ];

      const spacingMults = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32];
      const spacingBase = 4;

      const typeEntries = typeSteps.map(({ name, step }) => {
        const minPx = baseSize * Math.pow(minScale, step);
        const maxPx = baseSize * Math.pow(maxScale, step);
        return { name, minPx, maxPx, value: fluidClamp(minPx, maxPx, minVp, maxVp) };
      });

      const spacingEntries = spacingMults.map(m => ({
        name: `${spacingBase * m}`,
        value: `${(spacingBase * m / 16).toFixed(3)}rem`
      }));

      const typeComment = `/* Base ${baseSize}px | Mobile scale ×${minScale} → Desktop scale ×${maxScale} | ${minVp}px–${maxVp}px */`;

      let output = "";
      if (format === "css") {
        const lines = [":root {", `  ${typeComment}`, "  /* Type Scale */"];
        typeEntries.forEach(({ name, value }) => lines.push(`  ${prefix}${name}: ${value};`));
        lines.push("", "  /* Spacing Scale */");
        spacingEntries.forEach(({ name, value }) => lines.push(`  --space-${name}: ${value};`));
        lines.push("}");
        output = lines.join("\n");
      } else if (format === "tailwind") {
        const lines = ["// tailwind.config.js theme.extend", `// ${typeComment}`, "fontSize: {"];
        typeEntries.forEach(({ name, value }) => lines.push(`  '${name}': ['${value}'],`));
        lines.push("},", "spacing: {");
        spacingEntries.forEach(({ name, value }) => lines.push(`  '${name}': '${value}',`));
        lines.push("}");
        output = lines.join("\n");
      } else {
        const lines = [`// SCSS: ${typeComment}`, "$type-scale: ("];
        typeEntries.forEach(({ name, value }) => lines.push(`  '${name}': ${value},`));
        lines.push(");", "", "$spacing-scale: (");
        spacingEntries.forEach(({ name, value }) => lines.push(`  '${name}': ${value},`));
        lines.push(");");
        output = lines.join("\n");
      }

      _setCode('fluidOutput', output);

      // Scale preview — show mobile (minScale) vs desktop (maxScale) sizes
      const preview = document.getElementById("fluidScalePreview");
      preview.innerHTML = `
      <div class="fluid-preview-header">
        <span>Variable</span><span>Preview</span><span>Mobile</span><span>Desktop</span>
      </div>
      ${typeSteps.map(({ name, step }) => {
        const mPx = (baseSize * Math.pow(minScale, step)).toFixed(1);
        const dPx = (baseSize * Math.pow(maxScale, step)).toFixed(1);
        const sample = Math.min(parseFloat(dPx), 28);
        return `<div class="fluid-scale-row">
          <span class="fluid-scale-label">${escapeHtml(prefix + name)}</span>
          <span class="fluid-scale-sample" style="font-size:${sample}px">Aa</span>
          <span class="fluid-scale-px">${mPx}px</span>
          <span class="fluid-scale-px">${dPx}px</span>
        </div>`;
      }).join("")}`;
    }

    ["fluidBaseSize", "fluidMinVp", "fluidMaxVp", "fluidVarPrefix"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("input", updateFluidDesign);
    });
    ["fluidMinScale", "fluidMaxScale"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("change", updateFluidDesign);
    });
    document.querySelectorAll('input[name="fluidFormat"]').forEach(r => r.addEventListener("change", updateFluidDesign));

    document.getElementById("copyFluid").addEventListener("click", (e) => {
      const out = document.getElementById("fluidOutput");
      copyToClipboard(out.dataset.raw || out.textContent, e.currentTarget);
    });

    updateFluidDesign();



  }); // ─── end lazy init: fluid-design
  registerToolInit("animation-builder", () => {
    // ─── ANIMATION BUILDER ──────────────────────────────────────────────────────

    const bezierCanvas = document.getElementById("bezierCanvas");
    const bezierCtx = bezierCanvas.getContext("2d");
    const BEZIER_PAD = 12;
    // Fixed extended Y range so overshoot curves (spring, back-easings) stay
    // visible instead of clipping at the canvas edge. X stays [0,1] per spec.
    const BEZIER_Y_LO = -0.6;
    const BEZIER_Y_HI = 1.7;
    let bezierDragging = null;

    function bezierToCanvas(bx, by) {
      const w = bezierCanvas.width, h = bezierCanvas.height, p = BEZIER_PAD;
      return {
        x: p + bx * (w - 2 * p),
        y: (h - p) - ((by - BEZIER_Y_LO) / (BEZIER_Y_HI - BEZIER_Y_LO)) * (h - 2 * p)
      };
    }

    function canvasToBezier(cx, cy) {
      const w = bezierCanvas.width, h = bezierCanvas.height, p = BEZIER_PAD;
      return {
        bx: Math.max(0, Math.min(1, (cx - p) / (w - 2 * p))),
        by: BEZIER_Y_LO + (((h - p) - cy) / (h - 2 * p)) * (BEZIER_Y_HI - BEZIER_Y_LO)
      };
    }

    function getBezierValues() {
      return {
        x1: parseFloat(document.getElementById("bx1").value) || 0,
        y1: parseFloat(document.getElementById("by1").value) || 0,
        x2: parseFloat(document.getElementById("bx2").value) || 1,
        y2: parseFloat(document.getElementById("by2").value) || 1
      };
    }

    function drawBezierCanvas() {
      const { x1, y1, x2, y2 } = getBezierValues();
      const w = bezierCanvas.width, h = bezierCanvas.height;
      const rootStyle = getComputedStyle(document.documentElement);
      const gridColor = rootStyle.getPropertyValue("--border").trim() || "#2d3144";
      const lineColor = rootStyle.getPropertyValue("--text-muted").trim() || "#8892a4";
      const accent = rootStyle.getPropertyValue("--accent").trim() || "#4caf50";
      const fixedPt = rootStyle.getPropertyValue("--text-primary").trim() || "#e2e8f0";

      bezierCtx.clearRect(0, 0, w, h);

      const p0 = bezierToCanvas(0, 0);
      const p1 = bezierToCanvas(x1, y1);
      const p2 = bezierToCanvas(x2, y2);
      const p3 = bezierToCanvas(1, 1);

      // Grid border
      bezierCtx.strokeStyle = gridColor;
      bezierCtx.lineWidth = 1;
      bezierCtx.strokeRect(p0.x, p3.y, p3.x - p0.x, p0.y - p3.y);

      // Diagonal guide
      bezierCtx.strokeStyle = gridColor;
      bezierCtx.setLineDash([4, 4]);
      bezierCtx.beginPath();
      bezierCtx.moveTo(p0.x, p0.y);
      bezierCtx.lineTo(p3.x, p3.y);
      bezierCtx.stroke();
      bezierCtx.setLineDash([]);

      // Control lines
      bezierCtx.strokeStyle = lineColor;
      bezierCtx.lineWidth = 1;
      [{ from: p0, to: p1 }, { from: p3, to: p2 }].forEach(({ from, to }) => {
        bezierCtx.beginPath();
        bezierCtx.moveTo(from.x, from.y);
        bezierCtx.lineTo(to.x, to.y);
        bezierCtx.stroke();
      });

      // Curve
      bezierCtx.strokeStyle = accent;
      bezierCtx.lineWidth = 2;
      bezierCtx.beginPath();
      bezierCtx.moveTo(p0.x, p0.y);
      bezierCtx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
      bezierCtx.stroke();

      // Control point handles
      [p1, p2].forEach(p => {
        bezierCtx.fillStyle = accent;
        bezierCtx.beginPath();
        bezierCtx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        bezierCtx.fill();
      });

      // Fixed points
      [p0, p3].forEach(p => {
        bezierCtx.fillStyle = fixedPt;
        bezierCtx.beginPath();
        bezierCtx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        bezierCtx.fill();
      });
    }

    // Animation names must be valid CSS identifiers
    function getAnimName() {
      const raw = document.getElementById("animName").value.trim();
      return raw.replace(/[^a-zA-Z0-9_-]/g, "") || "myAnimation";
    }

    function updateAnimOutput() {
      const { x1, y1, x2, y2 } = getBezierValues();
      const name = getAnimName();
      const dur = document.getElementById("animDuration").value || "0.5";
      const delay = document.getElementById("animDelay").value || "0";
      const iter = document.getElementById("animIterations").value || "1";
      const dir = document.getElementById("animDirection").value;
      const from = document.getElementById("keyframeFrom").value.trim();
      const to = document.getElementById("keyframeTo").value.trim();
      const curve = `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
      const output = `@keyframes ${name} {\n  from { ${from} }\n  to   { ${to} }\n}\n\n.element {\n  animation: ${name} ${dur}s ${curve} ${delay}s ${iter} ${dir} both;\n}\n\n/* Same easing as a transition */\ntransition: all ${dur}s ${curve};`;
      _setCode('animOutput', output);
      drawBezierCanvas();
    }

    bezierCanvas.addEventListener("mousedown", e => {
      const rect = bezierCanvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (bezierCanvas.width / rect.width);
      const my = (e.clientY - rect.top) * (bezierCanvas.height / rect.height);
      const { x1, y1, x2, y2 } = getBezierValues();
      const p1c = bezierToCanvas(x1, y1);
      const p2c = bezierToCanvas(x2, y2);
      const d1 = Math.hypot(mx - p1c.x, my - p1c.y);
      const d2 = Math.hypot(mx - p2c.x, my - p2c.y);
      if (d1 < 12) bezierDragging = "p1";
      else if (d2 < 12) bezierDragging = "p2";
    });

    // Track moves on the document so dragging stays smooth when the
    // cursor briefly leaves the canvas.
    document.addEventListener("mousemove", e => {
      if (!bezierDragging) return;
      const rect = bezierCanvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (bezierCanvas.width / rect.width);
      const my = (e.clientY - rect.top) * (bezierCanvas.height / rect.height);
      const { bx, by } = canvasToBezier(mx, my);
      const clampedY = Math.max(BEZIER_Y_LO, Math.min(BEZIER_Y_HI, by));
      if (bezierDragging === "p1") {
        document.getElementById("bx1").value = bx.toFixed(2);
        document.getElementById("by1").value = clampedY.toFixed(2);
      } else {
        document.getElementById("bx2").value = bx.toFixed(2);
        document.getElementById("by2").value = clampedY.toFixed(2);
      }
      clearBezierPresetState();
      updateAnimOutput();
    });

    document.addEventListener("mouseup", () => { bezierDragging = null; });

    function clearBezierPresetState() {
      document.querySelectorAll(".bezier-preset.active").forEach(b => b.classList.remove("active"));
    }

    document.querySelectorAll(".bezier-preset").forEach(btn => {
      btn.addEventListener("click", () => {
        const [x1, y1, x2, y2] = btn.dataset.curve.split(",").map(Number);
        document.getElementById("bx1").value = x1;
        document.getElementById("by1").value = y1;
        document.getElementById("bx2").value = x2;
        document.getElementById("by2").value = y2;
        clearBezierPresetState();
        btn.classList.add("active");
        updateAnimOutput();
      });
    });

    ["bx1", "by1", "bx2", "by2", "animDuration", "animDelay", "animIterations", "animDirection", "animName", "keyframeFrom", "keyframeTo"].forEach(id => {
      document.getElementById(id).addEventListener("input", () => {
        if (["bx1", "by1", "bx2", "by2"].includes(id)) clearBezierPresetState();
        updateAnimOutput();
      });
    });

    document.getElementById("playAnimation").addEventListener("click", () => {
      const box = document.getElementById("animPreviewBox");
      const { x1, y1, x2, y2 } = getBezierValues();
      const dur = parseFloat(document.getElementById("animDuration").value) || 0.5;
      const name = getAnimName();
      const from = document.getElementById("keyframeFrom").value.trim();
      const to = document.getElementById("keyframeTo").value.trim();
      const dir = document.getElementById("animDirection").value;

      // Inject keyframes dynamically
      let styleEl = document.getElementById("animPreviewStyle");
      if (!styleEl) { styleEl = document.createElement("style"); styleEl.id = "animPreviewStyle"; document.head.appendChild(styleEl); }
      styleEl.textContent = `@keyframes ${name} { from { ${from} } to { ${to} } }`;

      box.style.animation = "none";
      box.offsetHeight; // reflow
      box.style.animation = `${name} ${dur}s cubic-bezier(${x1},${y1},${x2},${y2}) 0s 1 ${dir} both`;
    });

    document.getElementById("copyAnimation").addEventListener("click", (e) => {
      const out = document.getElementById("animOutput");
      copyToClipboard(out.dataset.raw || out.textContent, e.currentTarget);
    });

    updateAnimOutput();



  }); // ─── end lazy init: animation-builder
  registerToolInit("seo-preview", () => {
    // ─── SEO PREVIEW SIMULATOR ──────────────────────────────────────────────────

    const serpCanvas = document.createElement("canvas");
    const serpCtx = serpCanvas.getContext("2d");

    function measureTextPx(text, font) {
      serpCtx.font = font;
      return serpCtx.measureText(text).width;
    }

    let seoView = "desktop";

    document.querySelectorAll(".seo-view-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".seo-view-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        seoView = btn.dataset.view;
        updateSerpPreview();
      });
    });

    function truncateToPixels(text, maxPx, font) {
      if (measureTextPx(text, font) <= maxPx) return { text, truncated: false };
      let lo = 0, hi = text.length;
      while (lo < hi) {
        const mid = Math.floor((lo + hi + 1) / 2);
        if (measureTextPx(text.slice(0, mid) + "…", font) <= maxPx) lo = mid;
        else hi = mid - 1;
      }
      return { text: text.slice(0, lo) + "…", truncated: true };
    }

    // Site name fetched from og:site_name (when available) wins over the
    // hostname-derived fallback
    let seoFetchedSiteName = "";

    function updateSerpPreview() {
      const rawTitle = document.getElementById("seoTitle").value;
      const rawDesc = document.getElementById("seoDescription").value;
      const rawUrl = document.getElementById("seoUrl").value;

      const isDesktop = seoView === "desktop";
      const titleMaxPx = isDesktop ? 580 : 340;
      const descMaxPx = isDesktop ? 700 : 380;
      const titleFont = isDesktop ? "20px Arial" : "16px Arial";
      const descFont = "14px Arial";

      // Pixel width is what Google actually truncates on — show it
      const titlePx = Math.round(measureTextPx(rawTitle, titleFont));
      document.getElementById("seoTitleCount").textContent =
        `${rawTitle.length} chars · ${titlePx}/${titleMaxPx}px${titlePx > titleMaxPx ? " (truncates)" : ""}`;
      document.getElementById("seoDescCount").textContent =
        `${rawDesc.length} chars${rawDesc.length > 160 ? " (too long)" : ""}`;

      const { text: title, truncated: tTrunc } = truncateToPixels(rawTitle || "Page Title", titleMaxPx, titleFont);
      const { text: desc, truncated: dTrunc } = truncateToPixels(rawDesc || "Meta description will appear here…", descMaxPx, descFont);

      let urlDisplay = rawUrl || "https://example.com";
      let hostname = "example.com";
      let pageUrl = ""; // full URL for the favicon-cache lookup (keyed per page)
      try {
        const u = new URL(urlDisplay.startsWith("http") ? urlDisplay : "https://" + urlDisplay);
        urlDisplay = u.hostname + u.pathname;
        hostname = u.hostname;
        pageUrl = u.href;
      } catch { }

      document.getElementById("serpTitle").textContent = title;
      document.getElementById("serpDescription").textContent = desc;
      document.getElementById("serpUrl").textContent = urlDisplay;

      // Modern Google layout: favicon + site name above the URL.
      // Site name falls back to the capitalized first hostname label.
      const bareHost = hostname.replace(/^www\./, "");
      const derived = bareHost.split(".")[0];
      document.getElementById("serpSiteName").textContent =
        seoFetchedSiteName || derived.charAt(0).toUpperCase() + derived.slice(1);

      const favImg = document.getElementById("serpFavicon");
      const favLetter = document.getElementById("serpFaviconLetter");
      favLetter.textContent = bareHost.charAt(0).toUpperCase() || "E";
      favImg.hidden = true;
      favLetter.hidden = false;
      if (hostname !== "example.com") {
        // Chrome's local favicon cache ("favicon" permission) — resolves fully
        // on-device, so the inspected hostname never leaves the browser.
        const favUrl = new URL(chrome.runtime.getURL("/_favicon/"));
        favUrl.searchParams.set("pageUrl", pageUrl || `https://${hostname}/`);
        favUrl.searchParams.set("size", "32");
        favImg.src = favUrl.toString();
        favImg.onload = () => { favImg.hidden = false; favLetter.hidden = true; };
        favImg.onerror = () => { favImg.hidden = true; favLetter.hidden = false; };
      }

      const preview = document.getElementById("serpPreview");
      preview.classList.toggle("serp-mobile", !isDesktop);

      const warnings = [];
      if (!rawTitle) warnings.push("No title set");
      else if (rawTitle.length > 60) warnings.push(`Title is ${rawTitle.length} chars. Google typically shows ~60`);
      if (!rawDesc) warnings.push("No meta description set");
      else if (rawDesc.length > 160) warnings.push(`Description is ${rawDesc.length} chars. Google typically shows ~160`);
      if (tTrunc) warnings.push("Title will be truncated in search results");
      if (dTrunc) warnings.push("Description will be truncated in search results");

      document.getElementById("seoWarnings").innerHTML = warnings.map(w => `<p class="seo-warning">${SI.warn} ${w}</p>`).join("");
    }

    ["seoTitle", "seoDescription"].forEach(id => {
      document.getElementById(id).addEventListener("input", updateSerpPreview);
    });

    // Manual URL edits invalidate the fetched site name
    document.getElementById("seoUrl").addEventListener("input", () => {
      seoFetchedSiteName = "";
      updateSerpPreview();
    });

    document.getElementById("fetchSeoData").addEventListener("click", () => {
      const btn = document.getElementById("fetchSeoData");
      btn.textContent = "Fetching…";
      btn.disabled = true;
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) { btn.textContent = "Fetch from Active Tab"; btn.disabled = false; return; }
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            const get = (sel) => document.querySelector(sel)?.getAttribute("content") || "";
            return {
              title: document.title,
              description: get('meta[name="description"]'),
              siteName: get('meta[property="og:site_name"]'),
              url: location.href
            };
          }
        }, (results) => {
          btn.textContent = "Fetch from Active Tab";
          btn.disabled = false;
          if (results?.[0]?.result) {
            const { title, description, siteName, url } = results[0].result;
            document.getElementById("seoTitle").value = title;
            document.getElementById("seoDescription").value = description;
            document.getElementById("seoUrl").value = url;
            seoFetchedSiteName = siteName || "";
            updateSerpPreview();
          }
        });
      });
    });

    updateSerpPreview();

    // Auto-fetch the active tab's meta on open — but only into empty fields,
    // so a draft in progress is never overwritten.
    registerTabHook("seo-preview", () => {
      const empty = !document.getElementById("seoTitle").value &&
        !document.getElementById("seoDescription").value &&
        !document.getElementById("seoUrl").value;
      if (empty) document.getElementById("fetchSeoData").click();
    });



  }); // ─── end lazy init: seo-preview
  registerToolInit("json-to-ts", () => {
    // ─── JSON → TYPESCRIPT ──────────────────────────────────────────────────────

    const TS_IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
    // Keys that aren't valid identifiers must be quoted ("user-name": string)
    const tsKey = (k) => TS_IDENT.test(k) ? k : JSON.stringify(k);

    function tsNameFromKey(key) {
      const cleaned = String(key)
        .replace(/[^a-zA-Z0-9]+([a-zA-Z0-9])/g, (_, c) => c.toUpperCase())
        .replace(/[^a-zA-Z0-9_$]/g, "");
      let base = (cleaned.charAt(0).toUpperCase() + cleaned.slice(1)).replace(/s$/, "");
      if (!base || !TS_IDENT.test(base)) base = "Item";
      return base;
    }

    // ── TypeScript inference ──
    // Arrays of objects are MERGED across all items (up to 50 sampled):
    // fields missing from some items come out optional, differing types
    // come out as unions. Identical shapes share one interface; different
    // shapes with the same derived name get numeric suffixes.

    function tsCollectFields(samples, ctx) {
      const fields = new Map();
      samples.forEach(sample => {
        Object.entries(sample).forEach(([k, v]) => {
          let f = fields.get(k);
          if (!f) { f = { types: new Set(), count: 0 }; fields.set(k, f); }
          f.types.add(tsTypeOf(v, k, ctx));
          f.count++;
        });
      });
      return fields;
    }

    function tsFieldLines(fields, sampleCount, ctx) {
      const lines = [];
      for (const [k, f] of fields) {
        let types = [...f.types];
        const hasNull = types.includes("null");
        types = types.filter(t => t !== "null");
        let typeStr = types.join(" | ") || "null";
        if (hasNull && types.length) typeStr += " | null";
        const optional = (f.count < sampleCount || ctx.allOptional) ? "?" : "";
        lines.push(`  ${tsKey(k)}${optional}: ${typeStr};`);
      }
      return lines;
    }

    function tsRegisterInterface(samples, key, ctx) {
      const fields = tsCollectFields(samples, ctx);
      const body = tsFieldLines(fields, samples.length, ctx).join("\n");
      let name = tsNameFromKey(key);
      let n = 1;
      while (ctx.byName.has(name) && ctx.byName.get(name) !== body) name = tsNameFromKey(key) + ++n;
      if (!ctx.byName.has(name)) {
        ctx.byName.set(name, body);
        ctx.list.push(`interface ${name} {\n${body}\n}`);
      }
      return name;
    }

    function tsTypeOf(value, key, ctx) {
      if (value === null) return "null";
      if (Array.isArray(value)) {
        if (!value.length) return "unknown[]";
        const sample = value.slice(0, 50);
        if (sample.every(v => v && typeof v === "object" && !Array.isArray(v))) {
          return `${tsRegisterInterface(sample, key, ctx)}[]`;
        }
        const elTypes = [...new Set(sample.map(v => tsTypeOf(v, key, ctx)))];
        const joined = elTypes.join(" | ");
        return elTypes.length === 1 && !joined.includes(" ") ? `${joined}[]` : `(${joined})[]`;
      }
      const t = typeof value;
      if (t === "object") return tsRegisterInterface([value], key, ctx);
      if (t === "string" || t === "number" || t === "boolean") return t;
      return "unknown";
    }

    // ── Zod (mirrors the TS walk: merged fields, unions, nullable, optional) ──

    function zodRegisterSchema(samples, key, ctx) {
      const fields = new Map();
      samples.forEach(s => Object.entries(s).forEach(([k, v]) => {
        let f = fields.get(k);
        if (!f) { f = { types: new Set(), count: 0 }; fields.set(k, f); }
        f.types.add(zodTypeOf(v, k, ctx));
        f.count++;
      }));
      const lines = [];
      for (const [k, f] of fields) {
        let types = [...f.types];
        const hasNull = types.includes("z.null()");
        types = types.filter(t => t !== "z.null()");
        let str = types.length === 1 ? types[0]
          : types.length ? `z.union([${types.join(", ")}])` : "z.null()";
        if (hasNull && types.length) str += ".nullable()";
        if (f.count < samples.length || ctx.allOptional) str += ".optional()";
        lines.push(`  ${tsKey(k)}: ${str},`);
      }
      const body = lines.join("\n");
      let name = tsNameFromKey(key) + "Schema";
      let n = 1;
      while (ctx.byName.has(name) && ctx.byName.get(name) !== body) name = tsNameFromKey(key) + ++n + "Schema";
      if (!ctx.byName.has(name)) {
        ctx.byName.set(name, body);
        ctx.list.push(`const ${name} = z.object({\n${body}\n});`);
      }
      return name;
    }

    function zodTypeOf(value, key, ctx) {
      if (value === null) return "z.null()";
      if (Array.isArray(value)) {
        if (!value.length) return "z.array(z.unknown())";
        const sample = value.slice(0, 50);
        if (sample.every(v => v && typeof v === "object" && !Array.isArray(v))) {
          return `z.array(${zodRegisterSchema(sample, key, ctx)})`;
        }
        const els = [...new Set(sample.map(v => zodTypeOf(v, key, ctx)))];
        return `z.array(${els.length === 1 ? els[0] : `z.union([${els.join(", ")}])`})`;
      }
      const t = typeof value;
      if (t === "object") return zodRegisterSchema([value], key, ctx);
      if (t === "string") return "z.string()";
      if (t === "number") return "z.number()";
      if (t === "boolean") return "z.boolean()";
      return "z.unknown()";
    }

    function convertJsonToTs(silent) {
      const input = document.getElementById("jsonInput").value.trim();
      const errEl = document.getElementById("jsonError");
      errEl.textContent = "";

      if (!input) { if (!silent) errEl.textContent = "Paste some JSON first."; return; }

      let parsed;
      try { parsed = JSON.parse(input); }
      catch (e) { if (!silent) errEl.textContent = `JSON parse error: ${e.message}`; return; }

      const rawRoot = document.getElementById("rootInterfaceName").value.trim() || "Root";
      const rootName = TS_IDENT.test(rawRoot) ? rawRoot : tsNameFromKey(rawRoot);
      const allOptional = document.getElementById("optionalToggle").checked;
      const ctx = { byName: new Map(), list: [], allOptional };

      let rootDecl;
      if (Array.isArray(parsed)) {
        rootDecl = `type ${rootName} = ${tsTypeOf(parsed, rootName + "Item", ctx)};`;
      } else if (parsed && typeof parsed === "object") {
        const body = tsFieldLines(tsCollectFields([parsed], ctx), 1, ctx).join("\n");
        rootDecl = `interface ${rootName} {\n${body}\n}`;
      } else {
        rootDecl = `type ${rootName} = ${tsTypeOf(parsed, rootName, ctx)};`;
      }

      // Root first, then children in parent→child order
      let output = [rootDecl, ...ctx.list.reverse()].join("\n\n");

      if (document.getElementById("zodToggle").checked) {
        const zctx = { byName: new Map(), list: [], allOptional };
        let zRoot = null;
        if (Array.isArray(parsed)) {
          zRoot = `const ${rootName}Schema = ${zodTypeOf(parsed, rootName + "Item", zctx)};`;
        } else if (parsed && typeof parsed === "object") {
          zodRegisterSchema([parsed], rootName, zctx);
        } else {
          zRoot = `const ${rootName}Schema = ${zodTypeOf(parsed, rootName, zctx)};`;
        }
        output += "\n\n// Zod schemas\nimport { z } from \"zod\";\n\n" +
          [...zctx.list.reverse(), zRoot].filter(Boolean).join("\n\n");
      }

      _setCode('tsOutput', output, 'text');
    }

    document.getElementById("convertJson").addEventListener("click", () => convertJsonToTs(false));

    // Live conversion while typing (errors stay quiet until the JSON parses)
    let jtsDebounce;
    document.getElementById("jsonInput").addEventListener("input", () => {
      document.getElementById("jsonError").textContent = "";
      clearTimeout(jtsDebounce);
      jtsDebounce = setTimeout(() => convertJsonToTs(true), 400);
    });
    ["zodToggle", "optionalToggle"].forEach(id =>
      document.getElementById(id).addEventListener("change", () => convertJsonToTs(true)));
    document.getElementById("rootInterfaceName").addEventListener("input", () => convertJsonToTs(true));

    document.getElementById("resetJson").addEventListener("click", () => {
      document.getElementById("jsonInput").value = "";
      document.getElementById("jsonError").textContent = "";
      document.getElementById("rootInterfaceName").value = "Root";
      document.getElementById("zodToggle").checked = false;
      document.getElementById("optionalToggle").checked = false;
      _setCode('tsOutput', "// TypeScript interface will appear here", 'text');
    });

    document.getElementById("copyTs").addEventListener("click", (e) => {
      const out = document.getElementById("tsOutput");
      copyToClipboard(out.dataset.raw || out.textContent, e.currentTarget);
    });



  }); // ─── end lazy init: json-to-ts
  registerToolInit("glassmorphism", () => {
    // ─── GLASSMORPHISM / NEUMORPHISM ────────────────────────────────────────────

    let glassMode = "glass";
    let neumMode = "flat";

    document.querySelectorAll(".glass-mode-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".glass-mode-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        glassMode = btn.dataset.mode;
        document.getElementById("glassControls").classList.toggle("hidden", glassMode !== "glass");
        document.getElementById("neumControls").classList.toggle("hidden", glassMode !== "neumorphism");
        updateGlass();
      });
    });

    document.querySelectorAll(".neum-mode-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".neum-mode-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        neumMode = btn.dataset.nmode;
        updateGlass();
      });
    });



    function lighten(hex, amt) {
      const [r, g, b] = hexToRgbArr(hex);
      return `rgb(${Math.min(255, r + amt)}, ${Math.min(255, g + amt)}, ${Math.min(255, b + amt)})`;
    }

    function darken(hex, amt) {
      const [r, g, b] = hexToRgbArr(hex);
      return `rgb(${Math.max(0, r - amt)}, ${Math.max(0, g - amt)}, ${Math.max(0, b - amt)})`;
    }



    // Approximate midpoint color of each preview scene, used to estimate the
    // real perceived background behind the glass (tint composited over scene).
    const GLASS_SCENE_APPROX = {
      "gradient-purple": "#6e6cc6",
      "gradient-blue": "#203a43",
      "gradient-sunset": "#f88512",
      "solid-dark": "#1a1d27",
    };

    function updateGlass() {
      const card = document.getElementById("glassCard");
      const output = document.getElementById("glassOutput");
      const warning = document.getElementById("glassContrastWarning");

      if (glassMode === "glass") {
        const bgColor = document.getElementById("glassBg").value;
        const bgOpacity = parseInt(document.getElementById("glassBgOpacity").value) / 100;
        const blur = parseInt(document.getElementById("glassBlur").value);
        const saturation = parseInt(document.getElementById("glassSaturation")?.value) || 100;
        const borderOp = parseInt(document.getElementById("glassBorderOpacity").value) / 100;
        const shadowOp = parseInt(document.getElementById("glassShadowOpacity").value) / 100;
        const radius = parseInt(document.getElementById("glassBorderRadius").value);
        const textColor = document.getElementById("glassTextColor").value;
        const scene = document.getElementById("glassBgScene").value;

        const [r, g, b] = hexToRgbArr(bgColor);
        const backdrop = `blur(${blur}px)${saturation !== 100 ? ` saturate(${saturation}%)` : ""}`;
        const css = `.glass {
  background: rgba(${r}, ${g}, ${b}, ${bgOpacity.toFixed(2)});
  backdrop-filter: ${backdrop};
  -webkit-backdrop-filter: ${backdrop};
  border-radius: ${radius}px;
  border: 1px solid rgba(255, 255, 255, ${borderOp.toFixed(2)});
  box-shadow: 0 8px 32px rgba(0, 0, 0, ${shadowOp.toFixed(2)});
  color: ${textColor};
}`;
        _setCode(output, css);

        card.style.cssText = `background: rgba(${r},${g},${b},${bgOpacity.toFixed(2)}); backdrop-filter: ${backdrop}; -webkit-backdrop-filter: ${backdrop}; border-radius: ${radius}px; border: 1px solid rgba(255,255,255,${borderOp.toFixed(2)}); box-shadow: 0 8px 32px rgba(0,0,0,${shadowOp.toFixed(2)}); color: ${textColor};`;

        const scene_el = document.getElementById("glassScene");
        scene_el.className = `glass-scene glass-scene--${scene}`;

        // Contrast check against the *perceived* background: the tint color
        // alpha-composited over the scene behind it, not the raw tint.
        const [sr, sg, sb] = hexToRgbArr(GLASS_SCENE_APPROX[scene] || "#777777");
        const blend = (c, s) => c * bgOpacity + s * (1 - bgOpacity);
        const perceivedBg = rgbToHex(blend(r, sr), blend(g, sg), blend(b, sb));
        const cr = contrastRatio(textColor, perceivedBg);
        if (cr < 4.5) {
          warning.innerHTML = `${SI.warn} Estimated contrast ~${cr.toFixed(1)}:1 on this scene. It may fail WCAG AA (needs 4.5:1 for normal text)`;
        } else {
          warning.textContent = "";
        }

      } else {
        const bg = document.getElementById("neumBg").value;
        const radius = parseInt(document.getElementById("neumRadius").value);
        const intensity = parseInt(document.getElementById("neumIntensity").value);
        const textColor = document.getElementById("neumTextColor").value;
        const light = lighten(bg, 30);
        const dark = darken(bg, 30);

        let background = bg;
        if (neumMode === "concave") background = `linear-gradient(145deg, ${darken(bg, 20)}, ${lighten(bg, 20)})`;
        if (neumMode === "convex") background = `linear-gradient(145deg, ${lighten(bg, 20)}, ${darken(bg, 20)})`;

        const css = `.neumorphism {
  background: ${background};
  border-radius: ${radius}px;
  box-shadow: ${intensity}px ${intensity}px ${intensity * 2}px ${dark},
             -${intensity}px -${intensity}px ${intensity * 2}px ${light};
  color: ${textColor};
}`;
        _setCode(output, css);
        card.style.cssText = `background: ${background}; border-radius: ${radius}px; box-shadow: ${intensity}px ${intensity}px ${intensity * 2}px ${dark}, -${intensity}px -${intensity}px ${intensity * 2}px ${light}; color: ${textColor};`;
        document.getElementById("glassScene").className = "glass-scene glass-scene--solid-light";
        warning.textContent = "";
      }
    }

    ["glassBg", "glassBgOpacity", "glassBlur", "glassSaturation", "glassBorderOpacity", "glassShadowOpacity", "glassBorderRadius", "glassTextColor", "glassBgScene"].forEach(id => {
      const el = document.getElementById(id);
      el.addEventListener("input", () => {
        const valEl = document.getElementById(id + "Val");
        if (valEl) valEl.textContent = el.value + (id.includes("Blur") || id.includes("Radius") ? "px" : "%");
        updateGlass();
      });
    });
    ["neumBg", "neumRadius", "neumIntensity", "neumTextColor"].forEach(id => {
      const el = document.getElementById(id);
      el.addEventListener("input", () => {
        const valEl = document.getElementById(id + "Val");
        if (valEl) valEl.textContent = el.value + "px";
        updateGlass();
      });
    });

    document.getElementById("copyGlass").addEventListener("click", (e) => {
      const out = document.getElementById("glassOutput");
      copyToClipboard(out.dataset.raw || out.textContent, e.currentTarget);
    });

    updateGlass();



  }); // ─── end lazy init: glassmorphism
  registerToolInit("css-snippets", () => {
    // ─── CSS SNIPPETS ────────────────────────────────────────────────────────────

    document.querySelectorAll(".snippet-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".snippet-tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".snippet-content").forEach(c => c.classList.add("hidden"));
        btn.classList.add("active");
        document.getElementById("snip-" + btn.dataset.stab).classList.remove("hidden");
      });
    });

    // Container Query
    function cqName() {
      // Container/class names must be valid CSS identifiers
      const raw = document.getElementById("cqContainerName").value.trim();
      return raw.replace(/[^a-zA-Z0-9_-]/g, "") || "card";
    }

    function updateContainerQuery() {
      const name = cqName();
      const type = document.getElementById("cqContainerType").value;
      const rows = document.querySelectorAll(".cq-breakpoint-row");
      const lines = [`.${name}-wrapper {\n  container-type: ${type};\n  container-name: ${name};\n}\n`];
      rows.forEach(row => {
        const width = row.querySelector(".cq-bp-width").value || "400";
        const css = row.querySelector(".cq-bp-css").value.trim();
        if (css) lines.push(`@container ${name} (min-width: ${width}px) {\n  .${name} {\n    ${css.replace(/;\s*/g, ";\n    ").trimEnd()}\n  }\n}`);
      });
      _setCode('cqOutput', lines.join("\n"));
    }

    // Single factory for breakpoint rows — used by the defaults and the add button
    function addCqRow(width, css) {
      const list = document.getElementById("cqBreakpoints");
      const row = document.createElement("div");
      row.className = "cq-breakpoint-row";
      row.innerHTML = `<input type="number" class="cq-bp-width" value="${width}" placeholder="${width}"><span>px</span><input type="text" class="cq-bp-css" placeholder="CSS properties…"><button class="remove-cq-bp btn-hover" title="Remove">×</button>`;
      row.querySelector(".cq-bp-css").value = css;
      row.querySelectorAll("input").forEach(i => i.addEventListener("input", updateContainerQuery));
      row.querySelector(".remove-cq-bp").addEventListener("click", () => { row.remove(); updateContainerQuery(); });
      list.appendChild(row);
    }

    document.getElementById("cqContainerName").addEventListener("input", updateContainerQuery);
    document.getElementById("cqContainerType").addEventListener("change", updateContainerQuery);
    document.getElementById("addCqBp").addEventListener("click", () => {
      addCqRow(600, "");
      updateContainerQuery();
    });
    document.getElementById("copyCq").addEventListener("click", (e) => {
      const out = document.getElementById("cqOutput");
      copyToClipboard(out.dataset.raw || out.textContent, e.currentTarget);
    });

    addCqRow(400, "font-size: 1.25rem; padding: 1.5rem;");
    addCqRow(700, "font-size: 1.5rem; padding: 2rem;");
    updateContainerQuery();

    // Logical Properties Converter
    // Note: longest/most-specific keys first — replacement is sequential.
    const LOGICAL_MAP = {
      "border-top-left-radius": "border-start-start-radius",
      "border-top-right-radius": "border-start-end-radius",
      "border-bottom-left-radius": "border-end-start-radius",
      "border-bottom-right-radius": "border-end-end-radius",
      "text-align: left": "text-align: start", "text-align: right": "text-align: end",
      "float: left": "float: inline-start", "float: right": "float: inline-end",
      "margin-left": "margin-inline-start", "margin-right": "margin-inline-end",
      "margin-top": "margin-block-start", "margin-bottom": "margin-block-end",
      "padding-left": "padding-inline-start", "padding-right": "padding-inline-end",
      "padding-top": "padding-block-start", "padding-bottom": "padding-block-end",
      "border-left": "border-inline-start", "border-right": "border-inline-end",
      "border-top": "border-block-start", "border-bottom": "border-block-end",
      "min-width": "min-inline-size", "max-width": "max-inline-size",
      "min-height": "min-block-size", "max-height": "max-block-size",
      "width": "inline-size", "height": "block-size",
      "left": "inset-inline-start", "right": "inset-inline-end",
      "top": "inset-block-start", "bottom": "inset-block-end",
    };

    function convertLogicalProps() {
      let css = document.getElementById("logicalInput").value;
      for (const [phys, logical] of Object.entries(LOGICAL_MAP)) {
        // Tolerate any spacing after a colon in value-keys like "text-align: left"
        const pattern = phys.replace(/-/g, "\\-").replace(/:\s*/, ":\\s*");
        css = css.replace(new RegExp(`\\b${pattern}\\b`, "g"), logical);
      }
      _setCode('logicalOutput', css);
    }

    document.getElementById("convertLogical").addEventListener("click", convertLogicalProps);
    document.getElementById("logicalInput").addEventListener("input", convertLogicalProps);
    document.getElementById("copyLogical").addEventListener("click", (e) => {
      const out = document.getElementById("logicalOutput");
      copyToClipboard(out.dataset.raw || out.textContent, e.currentTarget);
    });

    // :has() Builder
    function updateHasOutput() {
      const parent = document.getElementById("hasParent").value.trim() || ".parent";
      const child = document.getElementById("hasChild").value.trim() || "img";
      const props = document.getElementById("hasProperties").value.trim();
      const indented = props.split("\n").map(l => "  " + l).join("\n");
      _setCode('hasOutput', `${parent}:has(${child}) {\n${indented}\n}`);
    }
    ["hasParent", "hasChild", "hasProperties"].forEach(id => document.getElementById(id).addEventListener("input", updateHasOutput));
    document.getElementById("copyHas").addEventListener("click", (e) => {
      const out = document.getElementById("hasOutput");
      copyToClipboard(out.dataset.raw || out.textContent, e.currentTarget);
    });
    updateHasOutput();



  }); // ─── end lazy init: css-snippets
  registerToolInit("schema-generator", () => {
    // ─── SCHEMA GENERATOR (JSON-LD) ─────────────────────────────────────────────

    const SCHEMA_FIELDS = {
      Article: [
        { key: "articleType", label: "Article Type", type: "select", options: ["Article", "BlogPosting", "NewsArticle"] },
        { key: "headline", label: "Headline", type: "text", required: true, placeholder: "Article title" },
        { key: "description", label: "Description", type: "text", placeholder: "Short description" },
        { key: "author", label: "Author Name", type: "text", placeholder: "John Doe" },
        { key: "datePublished", label: "Date Published", type: "date", required: true },
        { key: "dateModified", label: "Date Modified", type: "date" },
        { key: "image", label: "Image URL", type: "text", required: true, placeholder: "https://example.com/image.jpg" },
        { key: "url", label: "Article URL", type: "text", placeholder: "https://example.com/article" },
      ],
      Product: [
        { key: "name", label: "Product Name", type: "text", required: true, placeholder: "My Product" },
        { key: "description", label: "Description", type: "text", placeholder: "Product description" },
        { key: "image", label: "Image URL", type: "text", placeholder: "https://example.com/product.jpg" },
        { key: "price", label: "Price", type: "number", required: true, placeholder: "29.99" },
        { key: "currency", label: "Currency", type: "text", placeholder: "USD" },
        { key: "availability", label: "Availability", type: "select", options: ["InStock", "OutOfStock", "PreOrder"] },
        { key: "brand", label: "Brand", type: "text", placeholder: "Brand Name" },
        { key: "sku", label: "SKU", type: "text", placeholder: "PROD-001" },
        { key: "ratingValue", label: "Avg. Rating (1–5, optional)", type: "number", placeholder: "4.7" },
        { key: "reviewCount", label: "Review Count (optional)", type: "number", placeholder: "128" },
      ],
      FAQPage: [
        { key: "faqItems", label: "FAQ Items", type: "faq" },
      ],
      BreadcrumbList: [
        { key: "crumbs", label: "Breadcrumb Items", type: "breadcrumb" },
      ],
      LocalBusiness: [
        { key: "name", label: "Business Name", type: "text", required: true, placeholder: "My Business" },
        { key: "description", label: "Description", type: "text", placeholder: "What we do" },
        { key: "telephone", label: "Phone", type: "text", placeholder: "+1-555-555-5555" },
        { key: "email", label: "Email", type: "text", placeholder: "contact@example.com" },
        { key: "url", label: "Website", type: "text", placeholder: "https://example.com" },
        { key: "streetAddress", label: "Street Address", type: "text", placeholder: "123 Main St" },
        { key: "city", label: "City", type: "text", placeholder: "New York" },
        { key: "region", label: "State/Region", type: "text", placeholder: "NY" },
        { key: "postalCode", label: "Postal Code", type: "text", placeholder: "10001" },
        { key: "country", label: "Country", type: "text", placeholder: "US" },
        { key: "openingHours", label: "Opening Hours", type: "text", placeholder: "Mo-Fr 09:00-17:00" },
      ],
    };

    function renderSchemaFields() {
      const type = document.getElementById("schemaType").value;
      const fields = SCHEMA_FIELDS[type] || [];
      const container = document.getElementById("schemaFields");
      const fieldHtml = (f) => {
        if (f.type === "faq") return `<div id="faqList" class="faq-list"></div><button id="addFaqItem" class="btn-hover">+ Add Q&amp;A</button>`;
        if (f.type === "breadcrumb") return `<div id="crumbList" class="faq-list"></div><button id="addCrumbItem" class="btn-hover">+ Add Level</button>`;
        if (f.type === "select") return `<div class="input-group"><label>${f.label}${f.required ? " *" : ""}</label><select id="schema_${f.key}">${(f.options || []).map(o => `<option>${o}</option>`).join("")}</select></div>`;
        if (f.type === "date") return `<div class="input-group"><label>${f.label}${f.required ? " *" : ""}</label><input type="date" id="schema_${f.key}"></div>`;
        return `<div class="input-group"><label>${f.label}${f.required ? " *" : ""}</label><input type="${f.type}" id="schema_${f.key}" placeholder="${f.placeholder || ""}"></div>`;
      };

      // Pair up runs of consecutive date fields into a two-column grid
      const parts = [];
      for (let i = 0; i < fields.length; i++) {
        if (fields[i].type === "date") {
          const run = [];
          while (i < fields.length && fields[i].type === "date") run.push(fieldHtml(fields[i++]));
          i--;
          parts.push(`<div class="input-grid">${run.join("")}</div>`);
        } else {
          parts.push(fieldHtml(fields[i]));
        }
      }
      container.innerHTML = parts.join("");

      if (type === "BreadcrumbList") {
        const crumbList = document.getElementById("crumbList");
        function addCrumbItem(name = "", url = "") {
          const row = document.createElement("div");
          row.className = "faq-item-row crumb-item-row";
          row.innerHTML = `<input type="text" class="crumb-name" placeholder="Name (e.g. Home)"><input type="text" class="crumb-url" placeholder="https://example.com/"><button class="remove-faq-item btn-hover">×</button>`;
          row.querySelector(".crumb-name").value = name;
          row.querySelector(".crumb-url").value = url;
          row.querySelector(".remove-faq-item").addEventListener("click", () => { row.remove(); generateSchema(); });
          row.querySelectorAll("input").forEach(el => el.addEventListener("input", generateSchema));
          crumbList.appendChild(row);
          generateSchema();
        }
        document.getElementById("addCrumbItem").addEventListener("click", () => addCrumbItem());
        addCrumbItem("Home", "https://example.com/");
        addCrumbItem("Category", "https://example.com/category/");
        addCrumbItem("Current Page", "");
      }

      if (type === "FAQPage") {
        const faqList = document.getElementById("faqList");
        function addFaqItem(q = "", a = "") {
          const row = document.createElement("div");
          row.className = "faq-item-row";
          row.innerHTML = `<input type="text" class="faq-q" placeholder="Question…" value="${escapeHtml(q)}"><textarea class="faq-a" rows="2" placeholder="Answer…">${escapeHtml(a)}</textarea><button class="remove-faq-item btn-hover">×</button>`;
          row.querySelector(".remove-faq-item").addEventListener("click", () => { row.remove(); generateSchema(); });
          row.querySelectorAll("input,textarea").forEach(el => el.addEventListener("input", generateSchema));
          faqList.appendChild(row);
          generateSchema();
        }
        document.getElementById("addFaqItem").addEventListener("click", () => addFaqItem());
        addFaqItem("What is your product?", "Our product helps you achieve great results.");
        addFaqItem("How do I get started?", "Simply sign up on our website and follow the onboarding steps.");
      }

      container.querySelectorAll("input, select, textarea").forEach(el => el.addEventListener("input", generateSchema));
      generateSchema();
    }

    function generateSchema() {
      const type = document.getElementById("schemaType").value;
      const fields = SCHEMA_FIELDS[type] || [];
      const missing = [];
      let schema = { "@context": "https://schema.org", "@type": type };

      if (type === "FAQPage") {
        const items = [...document.querySelectorAll(".faq-item-row:not(.crumb-item-row)")].map(row => ({
          "@type": "Question",
          name: row.querySelector(".faq-q").value,
          acceptedAnswer: { "@type": "Answer", text: row.querySelector(".faq-a").value }
        }));
        schema.mainEntity = items;
      } else if (type === "BreadcrumbList") {
        const rows = [...document.querySelectorAll(".crumb-item-row")];
        schema.itemListElement = rows
          .filter(row => row.querySelector(".crumb-name").value.trim())
          .map((row, i, arr) => {
            const item = {
              "@type": "ListItem",
              position: i + 1,
              name: row.querySelector(".crumb-name").value.trim(),
            };
            // Per Google: the last item (current page) may omit its URL
            const url = row.querySelector(".crumb-url").value.trim();
            if (url) item.item = url;
            else if (i < arr.length - 1) missing.push(`URL for "${item.name}"`);
            return item;
          });
        if (!schema.itemListElement.length) missing.push("at least one breadcrumb item");
      } else if (type === "Product") {
        const name = document.getElementById("schema_name")?.value; if (!name) missing.push("name"); else schema.name = name;
        const desc = document.getElementById("schema_description")?.value; if (desc) schema.description = desc;
        const image = document.getElementById("schema_image")?.value; if (image) schema.image = image;
        const brand = document.getElementById("schema_brand")?.value; if (brand) schema.brand = { "@type": "Brand", name: brand };
        const sku = document.getElementById("schema_sku")?.value; if (sku) schema.sku = sku;
        const price = document.getElementById("schema_price")?.value;
        const currency = document.getElementById("schema_currency")?.value || "USD";
        const avail = document.getElementById("schema_availability")?.value || "InStock";
        if (!price) missing.push("price");
        else schema.offers = { "@type": "Offer", price, priceCurrency: currency, availability: `https://schema.org/${avail}` };
        // aggregateRating earns the review stars in rich results
        const rating = document.getElementById("schema_ratingValue")?.value;
        const reviews = document.getElementById("schema_reviewCount")?.value;
        if (rating && reviews) {
          schema.aggregateRating = { "@type": "AggregateRating", ratingValue: rating, reviewCount: reviews };
        }
      } else if (type === "LocalBusiness") {
        const name = document.getElementById("schema_name")?.value; if (!name) missing.push("name"); else schema.name = name;
        ["description", "telephone", "email", "url", "openingHours"].forEach(k => {
          const v = document.getElementById(`schema_${k}`)?.value; if (v) schema[k] = v;
        });
        const street = document.getElementById("schema_streetAddress")?.value;
        if (street) schema.address = { "@type": "PostalAddress", streetAddress: street, addressLocality: document.getElementById("schema_city")?.value, addressRegion: document.getElementById("schema_region")?.value, postalCode: document.getElementById("schema_postalCode")?.value, addressCountry: document.getElementById("schema_country")?.value };
      } else {
        fields.forEach(f => {
          if (f.type === "faq" || f.type === "breadcrumb") return;
          const el = document.getElementById(`schema_${f.key}`);
          if (!el) return;
          const val = el.value.trim();
          if (f.key === "articleType") { schema["@type"] = val || "Article"; return; }
          if (f.required && !val) { missing.push(f.label); return; }
          if (val) {
            if (f.key === "author") schema.author = { "@type": "Person", name: val };
            else schema[f.key] = val;
          }
        });
      }

      const json = JSON.stringify(schema, null, 2);
      const output = `<script type="application/ld+json">\n${json}\n<\/script>`;
      _setCode('schemaOutput', output, 'text');
      const schemaVal = document.getElementById("schemaValidation");
      if (missing.length) {
        schemaVal.innerHTML = `${SI.warn} Missing required fields: ${missing.join(", ")}`;
      } else {
        schemaVal.textContent = "";
      }
    }

    document.getElementById("schemaType").addEventListener("change", renderSchemaFields);
    document.getElementById("copySchema").addEventListener("click", (e) => {
      const out = document.getElementById("schemaOutput");
      copyToClipboard(out.dataset.raw || out.textContent, e.currentTarget);
    });
    renderSchemaFields();



  }); // ─── end lazy init: schema-generator
  registerToolInit("robots-txt", () => {
    // ─── ROBOTS.TXT GENERATOR ────────────────────────────────────────────────────

    // Crawler taxonomy (current as of 2026). "training" bots harvest content
    // for model training; "ai-search" bots do live retrieval and can send
    // citation/referral traffic — blocking them is usually a mistake.
    const ROBOTS_BOTS = [
      { ua: "GPTBot", label: "GPTBot (OpenAI training)", cat: "training" },
      { ua: "ClaudeBot", label: "ClaudeBot (Anthropic training)", cat: "training" },
      { ua: "CCBot", label: "CCBot (Common Crawl)", cat: "training" },
      { ua: "Google-Extended", label: "Google-Extended (Gemini training)", cat: "training" },
      { ua: "Meta-ExternalAgent", label: "Meta-ExternalAgent (Meta AI)", cat: "training" },
      { ua: "Applebot-Extended", label: "Applebot-Extended (Apple AI)", cat: "training" },
      { ua: "Bytespider", label: "Bytespider (ByteDance)", cat: "training" },
      { ua: "Amazonbot", label: "Amazonbot (Amazon AI)", cat: "training" },
      { ua: "OAI-SearchBot", label: "OAI-SearchBot (ChatGPT Search)", cat: "ai-search" },
      { ua: "ChatGPT-User", label: "ChatGPT-User (user requests)", cat: "ai-search" },
      { ua: "Claude-Web", label: "Claude-Web (live retrieval)", cat: "ai-search" },
      { ua: "PerplexityBot", label: "PerplexityBot (Perplexity)", cat: "ai-search" },
      { ua: "Googlebot", label: "Googlebot (Google Search)", cat: "search" },
      { ua: "Bingbot", label: "Bingbot (Bing)", cat: "search" },
      { ua: "DuckDuckBot", label: "DuckDuckBot", cat: "search" },
      { ua: "Baiduspider", label: "Baiduspider (Baidu)", cat: "search" },
      { ua: "YandexBot", label: "YandexBot (Yandex)", cat: "search" },
      { ua: "AhrefsBot", label: "AhrefsBot", cat: "seo" },
      { ua: "SemrushBot", label: "SemrushBot", cat: "seo" },
      { ua: "MJ12bot", label: "MJ12bot (Majestic)", cat: "seo" },
      { ua: "DotBot", label: "DotBot (Moz)", cat: "seo" },
    ];

    const ROBOTS_CATS = [
      { id: "training", title: "AI Training Crawlers" },
      { id: "ai-search", title: "AI Search / Live Retrieval (send referral traffic)" },
      { id: "search", title: "Search Engines" },
      { id: "seo", title: "SEO Tool Crawlers" },
    ];

    function renderRobotsBotGroups() {
      document.getElementById("robotsBotGroups").innerHTML = ROBOTS_CATS.map(cat => `
      <div class="robots-bot-group">
        <div class="robots-bot-group-hdr">
          <h4>${cat.title}</h4>
          <button class="robots-cat-all" data-cat="${cat.id}">block all</button>
        </div>
        <div class="robots-toggles">
          ${ROBOTS_BOTS.filter(b => b.cat === cat.id).map(b =>
        `<label class="robots-toggle"><input type="checkbox" class="bot-toggle" data-bot="${b.ua}"> ${b.label}</label>`).join("")}
        </div>
      </div>`).join("");

      document.querySelectorAll(".bot-toggle").forEach(cb => cb.addEventListener("change", updateRobots));
      document.querySelectorAll(".robots-cat-all").forEach(btn => {
        btn.addEventListener("click", () => {
          const boxes = [...document.querySelectorAll(".bot-toggle")]
            .filter(cb => ROBOTS_BOTS.find(b => b.ua === cb.dataset.bot)?.cat === btn.dataset.cat);
          const allOn = boxes.every(cb => cb.checked);
          boxes.forEach(cb => { cb.checked = !allOn; });
          updateRobots();
        });
      });
    }

    function addRobotsRule(ua = "*", directive = "Disallow", path = "") {
      const list = document.getElementById("robotsRuleList");
      const row = document.createElement("div");
      row.className = "robots-path-row";
      row.innerHTML = `
      <select class="robots-ua-select">
        <option value="*">All (*)</option>
        ${ROBOTS_BOTS.filter(b => b.cat === "search").map(b => `<option>${b.ua}</option>`).join("")}
      </select>
      <select class="robots-directive-select">
        <option>Disallow</option>
        <option>Allow</option>
      </select>
      <input type="text" class="robots-path-input" placeholder="/path/">
      <button class="remove-robots-path btn-hover" title="Remove">×</button>`;
      row.querySelector(".robots-ua-select").value = ua;
      row.querySelector(".robots-directive-select").value = directive;
      row.querySelector(".robots-path-input").value = path;
      row.querySelector(".remove-robots-path").addEventListener("click", () => { row.remove(); updateRobots(); });
      row.querySelectorAll("select, input").forEach(el => {
        el.addEventListener("change", updateRobots);
        el.addEventListener("input", updateRobots);
      });
      list.appendChild(row);
    }

    function addRobotsSitemap(url = "") {
      const list = document.getElementById("robotsSitemapList");
      const row = document.createElement("div");
      row.className = "robots-path-row robots-sitemap-row";
      row.innerHTML = `<input type="text" class="robots-sitemap-input" placeholder="https://example.com/sitemap.xml"><button class="remove-robots-path btn-hover" title="Remove">×</button>`;
      row.querySelector(".robots-sitemap-input").value = url;
      row.querySelector(".remove-robots-path").addEventListener("click", () => { row.remove(); updateRobots(); });
      row.querySelector(".robots-sitemap-input").addEventListener("input", updateRobots);
      list.appendChild(row);
    }

    function robotsClearAll() {
      document.querySelectorAll(".bot-toggle").forEach(cb => { cb.checked = false; });
      document.getElementById("robotsRuleList").innerHTML = "";
      document.getElementById("robotsSitemapList").innerHTML = "";
      document.getElementById("robotsCrawlDelay").value = "";
    }

    const ROBOTS_PRESETS = {
      "default": () => { addRobotsSitemap(); },
      "block-training": () => {
        document.querySelectorAll(".bot-toggle").forEach(cb => {
          if (ROBOTS_BOTS.find(b => b.ua === cb.dataset.bot)?.cat === "training") cb.checked = true;
        });
        addRobotsSitemap();
      },
      "block-all-ai": () => {
        document.querySelectorAll(".bot-toggle").forEach(cb => {
          const cat = ROBOTS_BOTS.find(b => b.ua === cb.dataset.bot)?.cat;
          if (cat === "training" || cat === "ai-search") cb.checked = true;
        });
        addRobotsSitemap();
      },
      "wordpress": () => {
        addRobotsRule("*", "Disallow", "/wp-admin/");
        addRobotsRule("*", "Allow", "/wp-admin/admin-ajax.php");
        addRobotsSitemap("https://example.com/wp-sitemap.xml");
      },
      "staging": () => {
        addRobotsRule("*", "Disallow", "/");
      },
    };

    function updateRobots() {
      const lines = [];
      const warnings = [];
      const blockedBots = [...document.querySelectorAll(".bot-toggle:checked")].map(cb => cb.dataset.bot);

      // Per-rule groups, keyed by UA
      const uaGroups = {};
      [...document.querySelectorAll("#robotsRuleList .robots-path-row")].forEach(row => {
        const ua = row.querySelector(".robots-ua-select").value;
        const directive = row.querySelector(".robots-directive-select").value;
        const path = row.querySelector(".robots-path-input").value.trim();
        if (!path) return;
        if (!path.startsWith("/") && !path.startsWith("*")) {
          warnings.push({ sev: "warn", msg: `Path "${path}" should start with /. Crawlers may ignore it.` });
        }
        (uaGroups[ua] = uaGroups[ua] || []).push(`${directive}: ${path}`);
      });

      const crawlDelay = document.getElementById("robotsCrawlDelay").value.trim();

      // Default group (*) first
      const staging = (uaGroups["*"] || []).some(r => r === "Disallow: /");
      lines.push("User-agent: *");
      if (uaGroups["*"] && uaGroups["*"].length) uaGroups["*"].forEach(r => lines.push(r));
      else lines.push("Disallow:");
      if (crawlDelay) lines.push(`Crawl-delay: ${crawlDelay}`);
      lines.push("");

      // Named-UA rule groups
      Object.entries(uaGroups).filter(([ua]) => ua !== "*").forEach(([ua, rules]) => {
        lines.push(`User-agent: ${ua}`);
        rules.forEach(r => lines.push(r));
        lines.push("");
      });

      // Fully-blocked bots
      blockedBots.forEach(bot => { lines.push(`User-agent: ${bot}`, "Disallow: /", ""); });

      // Sitemaps
      [...document.querySelectorAll(".robots-sitemap-input")].forEach(input => {
        const url = input.value.trim();
        if (!url) return;
        if (!/^https?:\/\//.test(url)) warnings.push({ sev: "warn", msg: `Sitemap "${url}" must be an absolute URL.` });
        lines.push(`Sitemap: ${url}`);
      });

      // Smart warnings
      if (blockedBots.includes("Googlebot")) warnings.unshift({ sev: "critical", msg: "Blocking Googlebot removes your site from Google Search results." });
      if (blockedBots.includes("Bingbot")) warnings.unshift({ sev: "critical", msg: "Blocking Bingbot removes your site from Bing (and ChatGPT search uses Bing's index)." });
      const blockedAiSearch = blockedBots.filter(ua => ROBOTS_BOTS.find(b => b.ua === ua)?.cat === "ai-search");
      if (blockedAiSearch.length) warnings.push({ sev: "info", msg: `${blockedAiSearch.join(", ")}: these answer live user queries and can send referral traffic, so blocking is optional and not a privacy win.` });
      if (staging) warnings.push({ sev: "info", msg: "Disallow: / blocks all compliant crawlers. Remember to remove this when the site goes live." });

      _setCode('robotsOutput', lines.join("\n").trimEnd(), 'text');

      const icons = { critical: SI.critical, warn: SI.warn, info: SI.info };
      document.getElementById("robotsWarnings").innerHTML = warnings.map(w =>
        `<p class="robots-warning robots-warning--${w.sev}">${icons[w.sev]} ${escapeHtml(w.msg)}</p>`).join("");
    }

    document.querySelectorAll(".robots-preset").forEach(btn => {
      btn.addEventListener("click", () => {
        robotsClearAll();
        ROBOTS_PRESETS[btn.dataset.preset]?.();
        updateRobots();
      });
    });

    document.getElementById("addRobotsRule").addEventListener("click", () => { addRobotsRule(); updateRobots(); });
    document.getElementById("addRobotsSitemap").addEventListener("click", () => { addRobotsSitemap(); updateRobots(); });
    document.getElementById("robotsCrawlDelay").addEventListener("input", updateRobots);

    document.getElementById("copyRobots").addEventListener("click", (e) => {
      const out = document.getElementById("robotsOutput");
      copyToClipboard(out.dataset.raw || out.textContent, e.currentTarget);
    });

    document.getElementById("downloadRobots").addEventListener("click", () => {
      const out = document.getElementById("robotsOutput");
      const blob = new Blob([out.dataset.raw || out.textContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "robots.txt";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    // Fetch the active site's current robots.txt through the background worker
    document.getElementById("viewLiveRobots").addEventListener("click", (e) => {
      const btn = e.currentTarget;
      btn.textContent = "Fetching…";
      btn.disabled = true;
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const reset = () => { btn.textContent = "View live robots.txt of active site"; btn.disabled = false; };
        let origin = "";
        try { origin = new URL(tabs[0]?.url || "").origin; } catch { }
        if (!origin || !origin.startsWith("http")) {
          reset();
          showToast("Open a regular web page first", "error");
          return;
        }
        chrome.runtime.sendMessage({ type: "API_REQUEST", url: `${origin}/robots.txt`, method: "GET" }, (res) => {
          reset();
          if (!res?.ok || res.status >= 400) {
            showToast(`No robots.txt found at ${origin}`, "error");
            return;
          }
          _setCode('robotsOutput', `# Live robots.txt from ${origin}\n# (any edit below regenerates your draft)\n\n${res.body}`, 'text');
        });
      });
    });

    renderRobotsBotGroups();
    addRobotsRule("*", "Disallow", "/admin/");
    addRobotsSitemap();
    updateRobots();



  }); // ─── end lazy init: robots-txt
  registerToolInit("html-beautify", () => {
    // ─── HTML BEAUTIFY / MINIFY ──────────────────────────────────────────────────

    // Raw-text elements must survive formatting verbatim — extract them to
    // placeholders first, restore after.
    function extractRawBlocks(html) {
      const blocks = [];
      const result = html.replace(/<(pre|script|style|textarea)\b[\s\S]*?<\/\1\s*>/gi, m => {
        blocks.push(m);
        return `\u0000RAW${blocks.length - 1}\u0000`;
      });
      return { html: result, restore: s => s.replace(/\u0000RAW(\d+)\u0000/g, (_, i) => blocks[+i]) };
    }

    function hbmIndentStr() {
      const v = document.getElementById("hbmIndent").value;
      return v === "tab" ? "\t" : " ".repeat(+v);
    }

    function beautifyHtml(input, indentStr) {
      let level = 0;
      const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
      const inlineTags = new Set(["a", "abbr", "b", "bdi", "bdo", "cite", "code", "data", "dfn", "em", "i", "kbd", "mark", "q", "rp", "rt", "ruby", "s", "samp", "small", "span", "strong", "sub", "sup", "time", "u", "var", "wbr"]);

      const { html: protectedHtml, restore } = extractRawBlocks(input);
      const html = protectedHtml.trim().replace(/>\s+</g, "><");
      const tokens = html.split(/(<[^>]+>)/);
      const lines = [];

      const tagName = (token, closing) => {
        const m = token.match(closing ? /^<\/\s*([a-zA-Z][a-zA-Z0-9-]*)/ : /^<([a-zA-Z][a-zA-Z0-9-]*)/);
        return m ? m[1].toLowerCase() : "";
      };

      tokens.forEach(token => {
        if (!token.trim()) return;
        if (token.startsWith("</")) {
          // Inline closers never changed the level on open — don't dedent
          if (!inlineTags.has(tagName(token, true))) level = Math.max(0, level - 1);
          lines.push(indentStr.repeat(level) + token.trim());
        } else if (token.startsWith("<!")) {
          // Doctype, comments: never affect nesting
          lines.push(indentStr.repeat(level) + token.trim());
        } else if (token.startsWith("<")) {
          const tag = tagName(token, false);
          lines.push(indentStr.repeat(level) + token.trim());
          if (tag && !voidTags.has(tag) && !token.endsWith("/>") && !inlineTags.has(tag)) level++;
        } else {
          token.split("\n").map(l => l.trim()).filter(Boolean).forEach(l =>
            lines.push(indentStr.repeat(level) + l));
        }
      });

      return restore(lines.join("\n"));
    }

    function minifyHtml(input, removeComments) {
      const { html: protectedHtml, restore } = extractRawBlocks(input);
      let html = protectedHtml;
      if (removeComments) html = html.replace(/<!--[\s\S]*?-->/g, "");
      html = html
        .replace(/\s+/g, " ")
        .replace(/>\s+</g, "><")
        .replace(/\s+(\/?>)/g, "$1")
        .trim();
      return restore(html);
    }

    const hbmBytes = (s) => s.length < 1024 ? `${s.length} B` : `${(s.length / 1024).toFixed(1)} KB`;

    function hbmShowStats(input, output, minified) {
      const statsEl = document.getElementById("hbmStats");
      if (minified) {
        const pct = input.length ? Math.round((1 - output.length / input.length) * 100) : 0;
        statsEl.textContent = `${hbmBytes(input)} → ${hbmBytes(output)} (−${Math.max(0, pct)}%)`;
      } else {
        statsEl.textContent = `${hbmBytes(output)} · ${output.split("\n").length} lines`;
      }
    }

    document.getElementById("hbmBeautify").addEventListener("click", () => {
      const input = document.getElementById("hbmInput").value.trim();
      const errEl = document.getElementById("hbmError");
      errEl.textContent = "";
      if (!input) { errEl.textContent = "Paste some HTML first."; return; }
      try {
        const out = beautifyHtml(input, hbmIndentStr());
        _setCode('hbmOutput', out, 'text');
        hbmShowStats(input, out, false);
      } catch (e) { errEl.textContent = `Error: ${e.message}`; }
    });

    document.getElementById("hbmMinify").addEventListener("click", () => {
      const input = document.getElementById("hbmInput").value.trim();
      const errEl = document.getElementById("hbmError");
      errEl.textContent = "";
      if (!input) { errEl.textContent = "Paste some HTML first."; return; }
      const removeComments = document.getElementById("hbmRemoveComments").checked;
      const out = minifyHtml(input, removeComments);
      _setCode('hbmOutput', out, 'text');
      hbmShowStats(input, out, true);
    });

    document.getElementById("copyHbm").addEventListener("click", (e) => {
      const out = document.getElementById("hbmOutput");
      copyToClipboard(out.dataset.raw || out.textContent, e.currentTarget);
    });



  }); // ─── end lazy init: html-beautify
  registerToolInit("encoder-decoder", () => {
    // ─── ENCODER / DECODER ──────────────────────────────────────────────────────

    (function () {
      const plainEl = document.getElementById("encPlain");
      const encodedEl = document.getElementById("encEncoded");
      const errEl = document.getElementById("encError");
      let encMode = "base64";
      let lastEdited = "plain";

      // UTF-8-safe Base64 (naive btoa breaks on any non-Latin1 character)
      const b64encode = (str, urlSafe) => {
        const bytes = new TextEncoder().encode(str);
        let bin = "";
        bytes.forEach(b => { bin += String.fromCharCode(b); });
        let out = btoa(bin);
        if (urlSafe) out = out.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        return out;
      };

      const b64decode = (str) => {
        let s = str.trim().replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
        while (s.length % 4) s += "=";
        const bin = atob(s); // throws on invalid input
        return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
      };

      const entEncode = (str) => str
        .replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]))
        .replace(/[\u00A0-\uFFFF]/g, ch => `&#${ch.codePointAt(0)};`);

      // DOMParser decodes every named/numeric entity without executing anything
      const entDecode = (str) =>
        new DOMParser().parseFromString(str, "text/html").documentElement.textContent || "";

      const encode = (s) => {
        if (encMode === "base64") return b64encode(s, document.getElementById("encUrlSafe").checked);
        if (encMode === "url") return encodeURIComponent(s);
        return entEncode(s);
      };

      const decode = (s) => {
        if (encMode === "base64") return b64decode(s);
        // "+" as space: standard for pasted query-string values
        if (encMode === "url") return decodeURIComponent(s.replace(/\+/g, "%20"));
        return entDecode(s);
      };

      function encSync(direction) {
        errEl.textContent = "";
        try {
          if (direction === "encode") encodedEl.value = encode(plainEl.value);
          else plainEl.value = decode(encodedEl.value);
        } catch {
          errEl.textContent = encMode === "base64"
            ? "Invalid Base64. Check for stray characters."
            : "Could not decode. The input contains an invalid sequence.";
        }
      }

      plainEl.addEventListener("input", () => { lastEdited = "plain"; encSync("encode"); });
      encodedEl.addEventListener("input", () => { lastEdited = "encoded"; encSync("decode"); });

      document.getElementById("encUrlSafe").addEventListener("change", () =>
        encSync(lastEdited === "encoded" ? "decode" : "encode"));

      document.querySelectorAll(".enc-mode-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          document.querySelectorAll(".enc-mode-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          encMode = btn.dataset.mode;
          document.getElementById("encB64Options").classList.toggle("hidden", encMode !== "base64");
          encSync(lastEdited === "encoded" ? "decode" : "encode");
        });
      });

      document.getElementById("encCopyPlain").addEventListener("click", (e) =>
        copyToClipboard(plainEl.value, e.currentTarget));
      document.getElementById("encCopyEncoded").addEventListener("click", (e) =>
        copyToClipboard(encodedEl.value, e.currentTarget));
    })();



  }); // ─── end lazy init: encoder-decoder
  registerToolInit("css-inspector", () => {
    // ─── CSS INSPECTOR ──────────────────────────────────────────────────────────

    // ── Floating inspector — injected into page, fully self-contained ────────────
    // Fixes: overlay display (CSS !important blocked JS assignment → use cssText instead)
    // Adds: mouse wheel scroll, all 8 sections, per-section copy, Copy All button
    function cssInspectorFloating(showSpacing) {
      if (window.__cssInspectorCleanup) window.__cssInspectorCleanup();

      // ── Styles ──────────────────────────────────────────────────────────────
      const style = document.createElement('style');
      style.id = '__ci_style';
      // NOTE: overlay elements (#__ci_ov, #__ci_mb, #__ci_pb) intentionally have NO
      // display property in CSS — initial display:none is set via inline style so that
      // later inline style.display='block' via cssText can override it (CSS !important
      // would beat JS style.display assignment, breaking the hover highlight).
      style.textContent = `
      #__ci_panel {
        position: fixed !important; top: 16px !important; right: 16px !important;
        width: 318px !important; max-height: 560px !important;
        background: #1a1d27 !important; border: 1.5px solid #2d3144 !important;
        border-radius: 10px !important; box-shadow: 0 8px 40px rgba(0,0,0,0.75) !important;
        z-index: 2147483647 !important; font: 12px/1.45 system-ui,sans-serif !important;
        color: #e2e8f0 !important; overflow: hidden !important;
        display: flex !important; flex-direction: column !important;
        user-select: none !important; -webkit-user-select: none !important;
      }
      #__ci_panel.ci-locked { border-color: #fbbf24 !important; }
      #__ci_hdr {
        display: flex !important; align-items: center !important; gap: 5px !important;
        padding: 7px 9px !important; background: #242838 !important;
        border-radius: 10px 10px 0 0 !important; cursor: move !important;
        border-bottom: 1px solid #2d3144 !important; flex-shrink: 0 !important;
      }
      #__ci_title {
        flex: 1 !important; font-size: 11px !important; font-weight: 700 !important;
        color: #4caf50 !important; display: flex !important; align-items: center !important;
        gap: 5px !important; pointer-events: none !important;
      }
      #__ci_dot {
        width: 7px !important; height: 7px !important; border-radius: 50% !important;
        background: #4caf50 !important; flex-shrink: 0 !important;
        animation: __ci_blink 1.2s ease-in-out infinite !important;
      }
      #__ci_dot.ci-locked { background: #fbbf24 !important; animation: none !important; }
      @keyframes __ci_blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
      #__ci_lock_btn, #__ci_stop_btn, #__ci_copy_all {
        border: none !important; border-radius: 5px !important;
        cursor: pointer !important; font-size: 10px !important;
        padding: 2px 7px !important; line-height: 1.6 !important;
        font-family: system-ui,sans-serif !important;
      }
      #__ci_lock_btn { background: #2d3144 !important; color: #e2e8f0 !important; font-size: 11px !important; }
      #__ci_lock_btn:hover { background: #3a3f58 !important; }
      #__ci_lock_btn.ci-on { background: #fbbf24 !important; color: #1a1d27 !important; font-weight: 700 !important; }
      #__ci_copy_all { background: #2d3144 !important; color: #8892a4 !important; }
      #__ci_copy_all:hover { background: #3a3f58 !important; color: #e2e8f0 !important; }
      #__ci_stop_btn { background: transparent !important; color: #8892a4 !important; padding: 2px 6px !important; font-size: 12px !important; }
      #__ci_stop_btn:hover { color: #f87171 !important; }
      #__ci_body { overflow-y: auto !important; flex: 1 !important; scrollbar-width: thin !important; scrollbar-color: #2d3144 transparent !important; }
      #__ci_body::-webkit-scrollbar { width: 4px !important; }
      #__ci_body::-webkit-scrollbar-track { background: transparent !important; }
      #__ci_body::-webkit-scrollbar-thumb { background: #2d3144 !important; border-radius: 4px !important; }
      #__ci_body::-webkit-scrollbar-thumb:hover { background: #4caf50 !important; }
      #__ci_el_hdr { padding: 8px 10px 6px !important; border-bottom: 1px solid #2d3144 !important; }
      #__ci_sel { font-family: 'Courier New',monospace !important; font-size: 11px !important; color: #4caf50 !important; word-break: break-all !important; margin-bottom: 3px !important; }
      #__ci_meta { font-size: 11px !important; color: #8892a4 !important; }
      #__ci_empty { color: #8892a4 !important; text-align: center !important; padding: 22px 10px !important; font-size: 11px !important; }
      .ci-sec { border-bottom: 1px solid rgba(45,49,68,0.5) !important; }
      .ci-sec-hdr {
        display: flex !important; align-items: center !important; gap: 6px !important;
        padding: 5px 10px !important; cursor: pointer !important; background: transparent !important;
      }
      .ci-sec-hdr:hover { background: rgba(45,49,68,0.3) !important; }
      .ci-sec-arrow { font-size: 9px !important; color: #8892a4 !important; transition: transform 0.15s !important; display: inline-block !important; width: 10px !important; flex-shrink: 0 !important; }
      .ci-sec--closed .ci-sec-arrow { transform: rotate(-90deg) !important; }
      .ci-sec-title { flex: 1 !important; font-size: 9px !important; text-transform: uppercase !important; letter-spacing: 0.07em !important; color: #8892a4 !important; font-weight: 700 !important; }
      .ci-sec-copy { font-size: 10px !important; padding: 1px 6px !important; border: none !important; border-radius: 3px !important; background: #2d3144 !important; color: #8892a4 !important; cursor: pointer !important; opacity: 0 !important; font-family: system-ui,sans-serif !important; transition: opacity 0.15s !important; }
      .ci-sec-hdr:hover .ci-sec-copy { opacity: 1 !important; }
      .ci-sec-copy:hover { background: #3a3f58 !important; color: #e2e8f0 !important; }
      .ci-sec--closed .ci-sec-body { display: none !important; }
      .ci-sec-body { padding: 2px 10px 6px !important; }
      .ci-row { display: grid !important; grid-template-columns: 88px 1fr !important; gap: 4px !important; padding: 2px 0 !important; border-bottom: 1px solid rgba(45,49,68,0.3) !important; font-size: 11px !important; }
      .ci-lbl { color: #8892a4 !important; }
      .ci-val { color: #e2e8f0 !important; font-family: 'Courier New',monospace !important; word-break: break-all !important; }
      .ci-muted { color: #4a5568 !important; }
      .ci-sw { display: inline-block !important; width: 10px !important; height: 10px !important; border-radius: 2px !important; margin-right: 4px !important; vertical-align: middle !important; border: 1px solid rgba(255,255,255,0.15) !important; }
      #__ci_depth_nav { display: flex !important; align-items: center !important; gap: 6px !important; padding: 4px 10px !important; background: #0f1117 !important; border-bottom: 1px solid #2d3144 !important; font-size: 10px !important; }
      #__ci_depth_info { flex: 1 !important; text-align: center !important; color: #8892a4 !important; font-family: 'Courier New',monospace !important; font-size: 10px !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
      #__ci_depth_up, #__ci_depth_dn { border: none !important; background: #2d3144 !important; color: #e2e8f0 !important; border-radius: 3px !important; cursor: pointer !important; padding: 1px 6px !important; font-size: 10px !important; line-height: 1.4 !important; }
      #__ci_depth_up:hover, #__ci_depth_dn:hover { background: #4caf50 !important; color: #fff !important; }
      .ci-state-lbl { font-size: 10px !important; color: #4caf50 !important; font-family: 'Courier New',monospace !important; font-weight: 700 !important; padding: 5px 0 2px !important; display: block !important; border-top: 1px solid rgba(76,175,80,0.2) !important; margin-top: 4px !important; }
      .ci-state-lbl:first-child { border-top: none !important; margin-top: 0 !important; }
      .ci-child-item { display: flex !important; align-items: center !important; gap: 6px !important; padding: 5px 10px !important; cursor: pointer !important; font-size: 11px !important; color: #8892a4 !important; border-bottom: 1px solid rgba(45,49,68,0.5) !important; transition: background 0.1s !important; }
      .ci-child-item:hover { background: #242838 !important; color: #e2e8f0 !important; }
      .ci-child-item:last-child { border-bottom: none !important; }
      .ci-child-tag { color: #4caf50 !important; font-family: 'Courier New',monospace !important; font-weight: 600 !important; flex-shrink: 0 !important; }
      .ci-child-info { flex: 1 !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; color: #8892a4 !important; }
      .ci-child-size { font-size: 10px !important; color: #4a5568 !important; flex-shrink: 0 !important; }
      #__ci_footer { padding: 5px 10px !important; border-top: 1px solid #2d3144 !important; font-size: 10px !important; color: #4a5568 !important; flex-shrink: 0 !important; }
      #__ci_ov { position: fixed !important; pointer-events: none !important; z-index: 2147483646 !important; box-sizing: border-box !important; outline: 2px solid #4caf50 !important; outline-offset: -1px !important; background: rgba(76,175,80,0.06) !important; }
      #__ci_ov.ci-locked { outline-color: #fbbf24 !important; background: rgba(251,191,36,0.06) !important; }
      #__ci_mb { position: fixed !important; pointer-events: none !important; z-index: 2147483644 !important; background: rgba(255,152,0,0.15) !important; }
      #__ci_pb { position: fixed !important; pointer-events: none !important; z-index: 2147483645 !important; background: transparent !important; box-sizing: border-box !important; }
    `;
      document.head.appendChild(style);

      // ── Build floating panel ─────────────────────────────────────────────────
      const panel = document.createElement('div');
      panel.id = '__ci_panel';
      panel.innerHTML = `
      <div id="__ci_hdr">
        <div id="__ci_title"><span id="__ci_dot"></span>CSS Inspector</div>
        <button id="__ci_copy_all" title="Copy all CSS">Copy All</button>
        <button id="__ci_lock_btn">Lock</button>
        <button id="__ci_stop_btn" title="Stop (Esc)">✕</button>
      </div>
      <div id="__ci_body">
        <div id="__ci_empty">Hover any element to inspect</div>
        <div id="__ci_content" style="display:none">
          <div id="__ci_depth_nav" style="display:none">
            <button id="__ci_depth_up" title="Inspect element above in stack">▲</button>
            <span id="__ci_depth_info"></span>
            <button id="__ci_depth_dn" title="Inspect element below in stack">▼</button>
          </div>
        </div>
      </div>
      <div id="__ci_footer">click to lock · scroll · drag header · esc to stop</div>
    `;
      document.body.appendChild(panel);

      // Overlay elements: initial display:none set via inline cssText (not CSS rule)
      // so that later cssText assignment can override it — CSS !important beats JS style.display
      const overlay = document.createElement('div');
      overlay.id = '__ci_ov';
      overlay.style.cssText = 'display:none';
      document.body.appendChild(overlay);

      let mb = null, pb = null;
      if (showSpacing) {
        mb = document.createElement('div'); mb.id = '__ci_mb';
        mb.style.cssText = 'display:none';
        document.body.appendChild(mb);
        pb = document.createElement('div'); pb.id = '__ci_pb';
        pb.style.cssText = 'display:none';
        document.body.appendChild(pb);
      }

      const emptyEl = panel.querySelector('#__ci_empty');
      const contentEl = panel.querySelector('#__ci_content');
      const lockBtn = panel.querySelector('#__ci_lock_btn');
      const stopBtn = panel.querySelector('#__ci_stop_btn');
      const copyAllBtn = panel.querySelector('#__ci_copy_all');
      const dot = panel.querySelector('#__ci_dot');
      const bodyEl = panel.querySelector('#__ci_body');

      // ── Mouse wheel scroll (preventDefault stops page scroll, routes to panel) ──
      panel.addEventListener('wheel', e => {
        e.preventDefault();
        e.stopPropagation();
        bodyEl.scrollTop += e.deltaY;
      }, { passive: false });

      // ── Dragging ─────────────────────────────────────────────────────────────
      const hdr = panel.querySelector('#__ci_hdr');
      let drag = false, dox = 0, doy = 0;
      const onDragStart = e => {
        if (e.target.tagName === 'BUTTON') return;
        drag = true;
        const r = panel.getBoundingClientRect();
        dox = e.clientX - r.left; doy = e.clientY - r.top;
        e.preventDefault();
      };
      const onDragMove = e => {
        if (!drag) return;
        const x = Math.max(0, Math.min(window.innerWidth - 318, e.clientX - dox));
        const y = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - doy));
        panel.style.right = 'auto'; panel.style.bottom = 'auto';
        panel.style.left = x + 'px'; panel.style.top = y + 'px';
      };
      const onDragEnd = () => { drag = false; };
      hdr.addEventListener('mousedown', onDragStart);
      document.addEventListener('mousemove', onDragMove);
      document.addEventListener('mouseup', onDragEnd);

      // ── State & helpers ──────────────────────────────────────────────────────
      let locked = false, lastData = null, lastEl = null, rafId = null;
      let elemStack = [], stackIdx = 0;

      function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
      function pxf(v) { return parseFloat(v) || 0; }
      function sh4(t, r, b, l) {
        if (t === r && r === b && b === l) return t;
        if (t === b && r === l) return `${t} ${r}`;
        if (r === l) return `${t} ${r} ${b}`;
        return `${t} ${r} ${b} ${l}`;
      }
      const SKIP = new Set(['none', 'auto', 'normal', '0px', '0', 'initial', 'inherit', 'unset', 'visible', 'static', '1', '0s', 'ease', 'all', 'rgba(0, 0, 0, 0)', 'transparent', 'matrix(1, 0, 0, 1, 0, 0)', '']);
      function meaningless(v) { return SKIP.has(String(v).trim()); }
      function sw(v) {
        if (!v || SKIP.has(String(v).trim()) || String(v).includes('gradient')) return '';
        return `<span class="ci-sw" style="background:${v}"></span>`;
      }
      function row(label, val, always) {
        if (val === null || val === undefined || val === '') return '';
        const muted = !always && meaningless(val) ? ' ci-muted' : '';
        return `<div class="ci-row"><span class="ci-lbl">${label}</span><span class="ci-val${muted}">${sw(val)}${esc(val)}</span></div>`;
      }

      function genSel(el) {
        if (!el || el === document.body) return 'body';
        const parts = []; let cur = el, depth = 0;
        while (cur && cur !== document.body && depth < 4) {
          let s = cur.tagName.toLowerCase();
          if (cur.id) { parts.unshift('#' + cur.id); break; }
          const cls = [...cur.classList].filter(c => !c.startsWith('__ci')).slice(0, 2);
          if (cls.length) s += '.' + cls.join('.');
          parts.unshift(s); cur = cur.parentElement; depth++;
        }
        return parts.join(' > ') || el.tagName.toLowerCase();
      }

      function extractData(el) {
        const cs = window.getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const mT = cs.marginTop, mR = cs.marginRight, mB = cs.marginBottom, mL = cs.marginLeft;
        const pT = cs.paddingTop, pR = cs.paddingRight, pB = cs.paddingBottom, pL = cs.paddingLeft;
        const bW = sh4(cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth);
        const p = el.parentElement, pcs = p ? window.getComputedStyle(p) : null, pr = p ? p.getBoundingClientRect() : null;
        return {
          selector: genSel(el), tagName: el.tagName.toLowerCase(),
          id: el.id || null, classList: [...el.classList].filter(c => !c.startsWith('__ci')),
          inlineStyle: el.style.cssText || null,
          rect: { w: Math.round(r.width), h: Math.round(r.height) },
          layout: {
            width: cs.width, height: cs.height, minWidth: cs.minWidth, maxWidth: cs.maxWidth,
            minHeight: cs.minHeight, maxHeight: cs.maxHeight, display: cs.display, position: cs.position,
            top: cs.top, right: cs.right, bottom: cs.bottom, left: cs.left,
            zIndex: cs.zIndex, overflow: cs.overflow, overflowX: cs.overflowX, overflowY: cs.overflowY,
            flexDirection: cs.flexDirection, flexWrap: cs.flexWrap,
            justifyContent: cs.justifyContent, alignItems: cs.alignItems,
            alignContent: cs.alignContent, gap: cs.gap,
            gridTemplateColumns: cs.gridTemplateColumns, gridTemplateRows: cs.gridTemplateRows,
            alignSelf: cs.alignSelf, justifySelf: cs.justifySelf,
            flexGrow: cs.flexGrow, flexShrink: cs.flexShrink, flexBasis: cs.flexBasis,
            gridColumn: cs.gridColumn, gridRow: cs.gridRow,
          },
          box: {
            margin: sh4(mT, mR, mB, mL), mT, mR, mB, mL,
            padding: sh4(pT, pR, pB, pL), pT, pR, pB, pL,
            borderWidth: bW, borderStyle: cs.borderTopStyle, borderColor: cs.borderTopColor,
            borderRadius: cs.borderRadius, boxSizing: cs.boxSizing, outline: cs.outline,
          },
          typo: {
            fontSize: cs.fontSize, fontFamily: cs.fontFamily, fontWeight: cs.fontWeight,
            fontStyle: cs.fontStyle, lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing,
            textTransform: cs.textTransform, textAlign: cs.textAlign,
            textDecoration: cs.textDecoration, whiteSpace: cs.whiteSpace,
            wordBreak: cs.wordBreak, textOverflow: cs.textOverflow,
          },
          colors: {
            color: cs.color, backgroundColor: cs.backgroundColor,
            backgroundImage: cs.backgroundImage, backgroundSize: cs.backgroundSize,
            backgroundPosition: cs.backgroundPosition, opacity: cs.opacity,
          },
          effects: {
            boxShadow: cs.boxShadow, textShadow: cs.textShadow,
            filter: cs.filter, backdropFilter: cs.backdropFilter,
            transform: cs.transform, transformOrigin: cs.transformOrigin,
            mixBlendMode: cs.mixBlendMode,
          },
          interaction: { cursor: cs.cursor, pointerEvents: cs.pointerEvents, userSelect: cs.userSelect, resize: cs.resize },
          anim: {
            transition: cs.transition, animation: cs.animation,
            animationName: cs.animationName, animationDuration: cs.animationDuration,
            animationTimingFunction: cs.animationTimingFunction, willChange: cs.willChange,
          },
          parent: pcs ? {
            tagName: p.tagName.toLowerCase(), display: pcs.display, flexDirection: pcs.flexDirection,
            justifyContent: pcs.justifyContent, alignItems: pcs.alignItems, gap: pcs.gap,
            gridTemplateColumns: pcs.gridTemplateColumns,
            width: pr ? Math.round(pr.width) + 'px' : '', maxWidth: pcs.maxWidth,
          } : null,
        };
      }

      // ── CSS text builders (for copy functionality) ───────────────────────────
      const SKIP_VALS = new Set(['none', 'auto', 'normal', '0px', '0', 'initial', 'inherit', 'unset', 'start', 'visible', 'static', '1', '0s', 'ease', 'all']);
      function skip(val) { return SKIP_VALS.has(String(val).trim()); }
      function cssLine(prop, val) {
        if (!val || skip(val)) return '';
        return `  ${prop}: ${val};\n`;
      }

      function buildSectionCss(d, sid) {
        if (!d) return '';
        const l = d.layout, b = d.box, t = d.typo, c = d.colors, e = d.effects, i = d.interaction, a = d.anim;
        const map = {
          layout: () => [
            cssLine('display', l.display), cssLine('position', l.position),
            l.position !== 'static' ? cssLine('top', l.top) + cssLine('right', l.right) + cssLine('bottom', l.bottom) + cssLine('left', l.left) : '',
            cssLine('width', l.width), cssLine('height', l.height),
            cssLine('flex-direction', l.flexDirection), cssLine('justify-content', l.justifyContent),
            cssLine('align-items', l.alignItems), cssLine('gap', l.gap),
            cssLine('grid-template-columns', l.gridTemplateColumns),
            cssLine('overflow', l.overflow), cssLine('z-index', l.zIndex),
          ].join(''),
          box: () => [
            cssLine('box-sizing', b.boxSizing), cssLine('margin', b.margin), cssLine('padding', b.padding),
            b.borderStyle && b.borderStyle !== 'none' ? `  border: ${b.borderWidth} ${b.borderStyle} ${b.borderColor};\n` : '',
            cssLine('border-radius', b.borderRadius),
          ].join(''),
          typo: () => [
            cssLine('font-size', t.fontSize), cssLine('font-family', t.fontFamily),
            cssLine('font-weight', t.fontWeight), cssLine('font-style', t.fontStyle),
            cssLine('line-height', t.lineHeight), cssLine('text-align', t.textAlign),
            cssLine('letter-spacing', t.letterSpacing), cssLine('text-transform', t.textTransform),
            cssLine('text-decoration', t.textDecoration), cssLine('white-space', t.whiteSpace),
          ].join(''),
          colors: () => [
            cssLine('color', c.color), cssLine('background-color', c.backgroundColor),
            c.backgroundImage && c.backgroundImage !== 'none' ? cssLine('background-image', c.backgroundImage) : '',
            c.opacity !== '1' ? cssLine('opacity', c.opacity) : '',
          ].join(''),
          effects: () => [
            cssLine('box-shadow', e.boxShadow), cssLine('filter', e.filter),
            cssLine('backdrop-filter', e.backdropFilter), cssLine('transform', e.transform),
            cssLine('mix-blend-mode', e.mixBlendMode),
          ].join(''),
          interaction: () => [
            cssLine('cursor', i.cursor), cssLine('pointer-events', i.pointerEvents),
            cssLine('user-select', i.userSelect),
          ].join(''),
          anim: () => [
            a.transition && a.transition !== 'all 0s ease 0s' ? cssLine('transition', a.transition) : '',
            a.animation && a.animation !== 'none 0s ease 0s 1 normal none running' ? cssLine('animation', a.animation) : '',
            cssLine('will-change', a.willChange),
          ].join(''),
        };
        const fn = map[sid];
        const body = fn ? fn() : '';
        return body.trim() ? `/* ${sid} */\n${body}` : '';
      }

      function buildFullCss(d) {
        if (!d) return '';
        // Paste-ready rule: selector + braces, section comments indented
        const parts = ['layout', 'box', 'typo', 'colors', 'effects', 'interaction', 'anim']
          .map(s => buildSectionCss(d, s)).filter(Boolean)
          .map(s => s.replace(/^\/\* (\w+) \*\//, '  /* $1 */'))
          .join('\n');
        return `${d.selector} {\n${parts}}`;
      }

      function copyText(btn, text) {
        if (!text.trim()) return;
        navigator.clipboard.writeText(text).then(() => {
          const prev = btn.textContent;
          btn.textContent = '✓';
          setTimeout(() => { btn.textContent = prev; }, 1500);
        }).catch(() => { });
      }

      // ── Pseudo-class state detection via CSSOM ───────────────────────────────
      const PSEUDO_STATES = [':hover', ':focus', ':active', ':visited', ':focus-within', ':focus-visible', ':checked', ':disabled', ':placeholder-shown', ':target'];
      function getPseudoStyles(el) {
        const found = {};
        try {
          for (const sheet of [...document.styleSheets]) {
            let rules;
            try { rules = [...sheet.cssRules]; } catch (_) { continue; }
            for (const rule of rules) {
              if (!(rule instanceof CSSStyleRule)) continue;
              const selectorText = rule.selectorText || '';
              for (const state of PSEUDO_STATES) {
                if (!selectorText.includes(state)) continue;
                const parts = selectorText.split(',').map(s => s.trim()).filter(s => s.includes(state));
                let matches = false;
                for (const part of parts) {
                  // Strip the pseudo-class to get the base selector
                  const base = part.replace(new RegExp(state.replace(/[.:]/g, c => '\\' + c), 'g'), '').replace(/\s+/g, ' ').trim();
                  if (!base) continue;
                  try { if (el.matches(base)) { matches = true; break; } } catch (_) { }
                }
                if (matches) {
                  if (!found[state]) found[state] = {};
                  for (let i = 0; i < rule.style.length; i++) {
                    const prop = rule.style[i];
                    found[state][prop] = rule.style.getPropertyValue(prop);
                  }
                }
              }
            }
          }
        } catch (_) { }
        return found;
      }

      // ── Section helper ───────────────────────────────────────────────────────
      function sec(id, title, rows, open = true) {
        if (!rows.trim()) return '';
        return `<div class="ci-sec ${open ? '' : 'ci-sec--closed'}" data-sid="${id}">
        <div class="ci-sec-hdr">
          <span class="ci-sec-arrow">▾</span>
          <span class="ci-sec-title">${title}</span>
          <button class="ci-sec-copy" data-sid="${id}">Copy</button>
        </div>
        <div class="ci-sec-body">${rows}</div>
      </div>`;
      }

      // ── Render panel with all sections ───────────────────────────────────────
      function renderPanel(d, el) {
        const l = d.layout, b = d.box, t = d.typo, c = d.colors, e = d.effects, i = d.interaction, a = d.anim;
        const isFlex = l.display.includes('flex'), isGrid = l.display.includes('grid');
        const classes = d.classList.slice(0, 3).map(v => '.' + v).join('');
        const borderVal = b.borderWidth && b.borderWidth !== '0px' ? `${b.borderWidth} ${b.borderStyle} ${b.borderColor}` : '';

        const layoutRows = [
          row('display', l.display, true), row('position', l.position),
          l.position !== 'static' && l.top !== 'auto' ? row('top', l.top) : '',
          l.position !== 'static' && l.right !== 'auto' ? row('right', l.right) : '',
          l.position !== 'static' && l.bottom !== 'auto' ? row('bottom', l.bottom) : '',
          l.position !== 'static' && l.left !== 'auto' ? row('left', l.left) : '',
          row('width', l.width), row('height', l.height),
          l.minWidth !== '0px' ? row('min-width', l.minWidth) : '',
          l.maxWidth !== 'none' ? row('max-width', l.maxWidth) : '',
          l.zIndex !== 'auto' ? row('z-index', l.zIndex) : '',
          l.overflow !== 'visible' ? row('overflow', l.overflow) : '',
          isFlex ? row('flex-dir', l.flexDirection) : '',
          isFlex ? row('justify', l.justifyContent) : '',
          isFlex ? row('align-items', l.alignItems) : '',
          (isFlex || isGrid) && l.gap && l.gap !== 'normal' ? row('gap', l.gap) : '',
          isGrid && l.gridTemplateColumns !== 'none' ? row('grid-cols', l.gridTemplateColumns) : '',
          l.flexGrow !== '0' ? row('flex-grow', l.flexGrow) : '',
          l.flexBasis !== 'auto' ? row('flex-basis', l.flexBasis) : '',
          l.alignSelf !== 'auto' ? row('align-self', l.alignSelf) : '',
        ].join('');

        const boxRows = [
          row('box-sizing', b.boxSizing),
          row('margin', b.margin), row('padding', b.padding),
          row('border', borderVal),
          b.borderRadius !== '0px' ? row('radius', b.borderRadius) : '',
          b.outline && b.outline !== 'none' && !b.outline.startsWith('0px') ? row('outline', b.outline) : '',
        ].join('');

        const typoRows = [
          row('font-size', t.fontSize, true), row('font', t.fontFamily), row('weight', t.fontWeight),
          row('line-height', t.lineHeight), row('text-align', t.textAlign),
          t.letterSpacing !== 'normal' ? row('letter-sp', t.letterSpacing) : '',
          t.textTransform !== 'none' ? row('transform', t.textTransform) : '',
          t.textDecoration !== 'none' ? row('decoration', t.textDecoration) : '',
          t.whiteSpace !== 'normal' ? row('white-space', t.whiteSpace) : '',
          t.wordBreak !== 'normal' ? row('word-break', t.wordBreak) : '',
        ].join('');

        const colorRows = [
          `<div class="ci-row"><span class="ci-lbl">color</span><span class="ci-val">${sw(c.color)}${esc(c.color || 'none')}</span></div>`,
          `<div class="ci-row"><span class="ci-lbl">background</span><span class="ci-val">${sw(c.backgroundColor)}${esc(c.backgroundColor || 'none')}</span></div>`,
          c.backgroundImage && c.backgroundImage !== 'none' ? row('bg-image', c.backgroundImage.length > 55 ? c.backgroundImage.slice(0, 55) + '…' : c.backgroundImage) : '',
          c.opacity !== '1' ? row('opacity', c.opacity) : '',
        ].join('');

        const fxRows = [
          e.boxShadow && e.boxShadow !== 'none' ? row('box-shadow', e.boxShadow) : '',
          e.textShadow && e.textShadow !== 'none' ? row('text-shadow', e.textShadow) : '',
          e.filter && e.filter !== 'none' ? row('filter', e.filter) : '',
          e.backdropFilter && e.backdropFilter !== 'none' ? row('backdrop', e.backdropFilter) : '',
          e.transform && e.transform !== 'none' && e.transform !== 'matrix(1, 0, 0, 1, 0, 0)' ? row('transform', e.transform) : '',
          e.mixBlendMode && e.mixBlendMode !== 'normal' ? row('blend', e.mixBlendMode) : '',
        ].join('');

        const ixRows = [
          row('cursor', i.cursor, true),
          i.pointerEvents !== 'auto' ? row('pointer-ev', i.pointerEvents) : '',
          i.userSelect && i.userSelect !== 'auto' ? row('user-select', i.userSelect) : '',
          i.resize && i.resize !== 'none' ? row('resize', i.resize) : '',
        ].join('');

        const animRows = [
          a.transition && a.transition !== 'all 0s ease 0s' ? row('transition', a.transition) : '',
          a.animationName && a.animationName !== 'none' ? row('anim-name', a.animationName) : '',
          a.animationDuration && a.animationDuration !== '0s' ? row('duration', a.animationDuration) : '',
          a.willChange && a.willChange !== 'auto' ? row('will-change', a.willChange) : '',
        ].join('');

        let parentRows = '';
        if (d.parent) {
          const p = d.parent, pisFlex = p.display.includes('flex'), pisGrid = p.display.includes('grid');
          parentRows = [
            row('tag', `<${p.tagName}>`), row('display', p.display),
            p.width ? row('width', p.width) : '',
            p.maxWidth !== 'none' ? row('max-width', p.maxWidth) : '',
            pisFlex ? row('flex-dir', p.flexDirection) : '',
            pisFlex ? row('justify', p.justifyContent) : '',
            pisFlex ? row('align-it', p.alignItems) : '',
            (pisFlex || pisGrid) && p.gap && p.gap !== 'normal' ? row('gap', p.gap) : '',
            pisGrid && p.gridTemplateColumns !== 'none' ? row('grid-cols', p.gridTemplateColumns) : '',
          ].join('');
        }

        // ── Pseudo-class states section
        const pseudoStyles = el ? getPseudoStyles(el) : {};
        const pseudoEntries = Object.entries(pseudoStyles).filter(([, props]) => Object.keys(props).length > 0);
        const stateRows = pseudoEntries.map(([state, props]) =>
          `<span class="ci-state-lbl">${esc(state)}</span>` +
          Object.entries(props).map(([k, v]) => row(k, v, true)).join('')
        ).join('');

        // ── Children section
        const children = el ? [...el.children].filter(c => !(c.id && c.id.startsWith('__ci'))) : [];
        let childRows = '';
        if (children.length) {
          const shown = children.slice(0, 20);
          childRows = shown.map((c, i) => {
            const cr = c.getBoundingClientRect();
            const cClasses = [...c.classList].slice(0, 2).map(x => `.${esc(x)}`).join('');
            const cId = c.id ? `#${esc(c.id)}` : '';
            const info = (cId + cClasses) || '';
            return `<div class="ci-child-item" data-ci-cidx="${i}">
            <span class="ci-child-tag">&lt;${esc(c.tagName.toLowerCase())}&gt;</span>
            ${info ? `<span class="ci-child-info">${info}</span>` : ''}
            <span class="ci-child-size">${Math.round(cr.width)}×${Math.round(cr.height)}</span>
          </div>`;
          }).join('');
          if (children.length > 20) childRows += `<div class="ci-child-item" style="color:#4a5568!important;cursor:default!important">+${children.length - 20} more…</div>`;
        }

        contentEl.innerHTML = `
        <div id="__ci_depth_nav" style="${elemStack.length > 1 ? '' : 'display:none'}">
          <button id="__ci_depth_up">▲</button>
          <span id="__ci_depth_info">${stackIdx + 1} / ${elemStack.length} · ${elemStack[stackIdx]?.tagName?.toLowerCase?.() || ''}</span>
          <button id="__ci_depth_dn">▼</button>
        </div>
        <div id="__ci_el_hdr">
          <div id="__ci_sel">${esc(d.selector)}</div>
          <div id="__ci_meta">&lt;${esc(d.tagName)}&gt;${d.id ? ' #' + esc(d.id) : ''}${classes ? ' ' + esc(classes) : ''} · ${d.rect.w}×${d.rect.h}px</div>
        </div>
        ${sec('layout', 'Layout', layoutRows, true)}
        ${sec('box', 'Box Model', boxRows, true)}
        ${sec('typo', 'Typography', typoRows, true)}
        ${sec('colors', 'Colors', colorRows, true)}
        ${sec('effects', 'Effects', fxRows, false)}
        ${sec('interaction', 'Interaction', ixRows, false)}
        ${sec('anim', 'Animations', animRows, false)}
        ${stateRows ? sec('states', 'State Overrides (:hover, :focus…)', stateRows, true) : ''}
        ${childRows ? sec('children', `Children (${children.length})`, childRows, false) : ''}
        ${parentRows.trim() ? sec('parent', 'Parent Container', parentRows, false) : ''}
      `;
        emptyEl.style.display = 'none';
        contentEl.style.display = 'block';

        // Wire depth navigator
        const depthUp = contentEl.querySelector('#__ci_depth_up');
        const depthDn = contentEl.querySelector('#__ci_depth_dn');
        if (depthUp) depthUp.addEventListener('click', ev => { ev.stopPropagation(); navigateStack(-1); });
        if (depthDn) depthDn.addEventListener('click', ev => { ev.stopPropagation(); navigateStack(1); });

        // Wire child navigation
        contentEl.querySelectorAll('.ci-child-item[data-ci-cidx]').forEach(item => {
          item.addEventListener('click', ev => {
            ev.stopPropagation();
            const idx = parseInt(item.dataset.ciCidx, 10);
            const child = children[idx];
            if (!child) return;
            elemStack = [child];
            stackIdx = 0;
            lastEl = child;
            const cd = extractData(child);
            lastData = cd;
            renderPanel(cd, child);
            setOverlay(child);
          });
        });

        // Wire collapse toggles
        contentEl.querySelectorAll('.ci-sec-hdr').forEach(h => {
          h.addEventListener('click', ev => {
            if (ev.target.closest('.ci-sec-copy')) return;
            h.closest('.ci-sec').classList.toggle('ci-sec--closed');
          });
        });
        // Wire per-section copy buttons
        contentEl.querySelectorAll('.ci-sec-copy').forEach(btn => {
          btn.addEventListener('click', ev => {
            ev.stopPropagation();
            copyText(btn, buildSectionCss(d, btn.dataset.sid));
          });
        });
      }

      function setOverlay(el) {
        const r = el.getBoundingClientRect();
        // Use cssText assignment — inline !important cannot be overridden
        // by non-!important cssText values, but both are inline so last write wins
        overlay.style.cssText = `display:block;top:${r.top}px;left:${r.left}px;width:${r.width}px;height:${r.height}px;`;
        overlay.classList.toggle('ci-locked', locked);
        if (showSpacing && mb && pb) {
          const cs = window.getComputedStyle(el);
          const mT = pxf(cs.marginTop), mR = pxf(cs.marginRight), mB = pxf(cs.marginBottom), mL = pxf(cs.marginLeft);
          const pT = pxf(cs.paddingTop), pR = pxf(cs.paddingRight), pB = pxf(cs.paddingBottom), pL = pxf(cs.paddingLeft);
          mb.style.cssText = `display:block;top:${r.top - mT}px;left:${r.left - mL}px;width:${r.width + mL + mR}px;height:${r.height + mT + mB}px;`;
          pb.style.cssText = `display:block;top:${r.top}px;left:${r.left}px;width:${r.width}px;height:${r.height}px;border-top:${pT}px solid rgba(76,175,80,0.22);border-right:${pR}px solid rgba(76,175,80,0.22);border-bottom:${pB}px solid rgba(76,175,80,0.22);border-left:${pL}px solid rgba(76,175,80,0.22);`;
        }
      }

      // ── Hover ────────────────────────────────────────────────────────────────
      const onMove = e => {
        if (locked) return;
        if (panel.contains(e.target)) {
          overlay.style.cssText = 'display:none';
          if (mb) mb.style.cssText = 'display:none';
          if (pb) pb.style.cssText = 'display:none';
          return;
        }
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          const allEls = (document.elementsFromPoint(e.clientX, e.clientY) || [])
            .filter(el => el !== document.documentElement && el !== document.body && !(el.id && el.id.startsWith('__ci')) && !panel.contains(el));
          if (!allEls.length) return;
          const topEl = allEls[0];
          if (topEl === lastEl) return;
          elemStack = allEls;
          stackIdx = 0;
          lastEl = topEl;
          const d = extractData(topEl);
          lastData = d;
          renderPanel(d, topEl);
          setOverlay(topEl);
        });
      };

      function navigateStack(dir) {
        if (!elemStack.length) return;
        stackIdx = Math.max(0, Math.min(elemStack.length - 1, stackIdx + dir));
        const el = elemStack[stackIdx];
        lastEl = el;
        const d = extractData(el);
        lastData = d;
        renderPanel(d, el);
        setOverlay(el);
      }

      // ── Lock ─────────────────────────────────────────────────────────────────
      function setLocked(val) {
        locked = val;
        panel.classList.toggle('ci-locked', val);
        lockBtn.classList.toggle('ci-on', val);
        lockBtn.textContent = val ? 'Unlock' : 'Lock';
        dot.classList.toggle('ci-locked', val);
        if (val && lastData) {
          try { chrome.storage.local.set({ wdt_inspect_lock: { data: lastData, host: location.hostname, ts: Date.now() } }); } catch (_) { }
        } else if (!val) {
          try { chrome.storage.local.remove('wdt_inspect_lock'); } catch (_) { }
        }
      }

      const onClick = e => {
        if (panel.contains(e.target)) return;
        const allEls = (document.elementsFromPoint(e.clientX, e.clientY) || [])
          .filter(el => el !== document.documentElement && el !== document.body && !(el.id && el.id.startsWith('__ci')));
        if (!allEls.length) return;
        e.preventDefault(); e.stopPropagation();
        if (!locked) {
          elemStack = allEls;
          stackIdx = 0;
          const el = allEls[0];
          lastEl = el;
          const d = extractData(el);
          lastData = d;
          renderPanel(d, el);
          setOverlay(el);
        }
        setLocked(!locked);
      };

      lockBtn.addEventListener('click', e => { e.stopPropagation(); setLocked(!locked); });
      copyAllBtn.addEventListener('click', e => { e.stopPropagation(); copyText(copyAllBtn, buildFullCss(lastData)); });

      // ── Cleanup ──────────────────────────────────────────────────────────────
      function cleanup() {
        document.removeEventListener('mousemove', onMove, true);
        document.removeEventListener('click', onClick, true);
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
        window.removeEventListener('scroll', onReanchor, true);
        window.removeEventListener('resize', onReanchor);
        if (rafId) cancelAnimationFrame(rafId);
        if (trackRaf) cancelAnimationFrame(trackRaf);
        [style, panel, overlay, mb, pb].forEach(el => { if (el && el.parentElement) el.remove(); });
        window.__cssInspectorCleanup = null;
      }

      const onKey = e => {
        if (e.key === 'Escape') {
          if (locked) setLocked(false);
          else cleanup();
        }
      };

      // Keep the highlight glued to the element while the page scrolls or
      // resizes (the overlay is position:fixed, so it must be re-anchored).
      let trackRaf = null;
      const onReanchor = () => {
        if (!lastEl || trackRaf) return;
        trackRaf = requestAnimationFrame(() => {
          trackRaf = null;
          if (!lastEl) return;
          if (!lastEl.isConnected) {
            overlay.style.cssText = 'display:none';
            if (mb) mb.style.cssText = 'display:none';
            if (pb) pb.style.cssText = 'display:none';
            return;
          }
          setOverlay(lastEl);
        });
      };

      stopBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (lastData) {
          try { chrome.storage.local.set({ wdt_inspect_lock: { data: lastData, host: location.hostname, ts: Date.now() } }); } catch (_) { }
        }
        cleanup();
      });
      document.addEventListener('mousemove', onMove, true);
      document.addEventListener('click', onClick, true);
      document.addEventListener('keydown', onKey);
      window.addEventListener('scroll', onReanchor, true);
      window.addEventListener('resize', onReanchor);
      window.__cssInspectorCleanup = cleanup;
    }

    // ── Panel UI ─────────────────────────────────────────────────────────────

    const ciStartBtn = document.getElementById('startCssInspect');
    const ciStopBtn = document.getElementById('stopCssInspect');
    const ciStatusBar = document.getElementById('inspectorStatusBar');
    const ciStatusTxt = document.getElementById('inspectorStatusText');
    const ciEmpty = document.getElementById('inspectorEmpty');
    const ciData = document.getElementById('inspectorData');
    let ciLastData = null;

    function ciSetStatus(mode, text) {
      ciStatusBar.className = `inspect-statusbar inspect-statusbar--${mode}`;
      ciStatusTxt.textContent = text;
    }

    const CI_START_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>`;

    function ciStart() {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab) return;
        if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
          ciSetStatus('inactive', 'Cannot inspect Chrome system pages.');
          return;
        }
        const showSpacing = document.getElementById('inspectShowSpacing').checked;
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: cssInspectorFloating,
          args: [showSpacing],
        }, () => {
          if (chrome.runtime.lastError) {
            ciSetStatus('inactive', 'Error: ' + chrome.runtime.lastError.message);
            return;
          }
          // Popup closes — inspector is now a floating panel in the page
          window.close();
        });
      });
    }

    function ciStop() {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => { if (window.__cssInspectorCleanup) window.__cssInspectorCleanup(); },
          }).catch(() => { });
        }
      });
      chrome.storage.local.remove('wdt_inspect_lock');
      ciData.classList.add('hidden');
      ciEmpty.classList.remove('hidden');
      ciStopBtn.disabled = true;
      ciStartBtn.innerHTML = `${CI_START_ICON} Start Inspecting`;
      ciStartBtn.disabled = false;
      ciSetStatus('inactive', 'Not active - click Start Inspecting to begin');
    }

    ciStartBtn.addEventListener('click', ciStart);
    ciStopBtn.addEventListener('click', ciStop);

    // Load locked data from previous inspection session
    chrome.storage.local.get(['wdt_inspect_lock'], data => {
      const stored = data.wdt_inspect_lock;
      if (!stored) return;
      // New format wraps the data with origin + timestamp; tolerate the old shape
      const d = stored.data || stored;
      ciRenderData(d);
      let context = 'Data saved - click Clear to reset, or Start Inspecting for a new session';
      if (stored.host) {
        const mins = Math.round((Date.now() - (stored.ts || Date.now())) / 60000);
        const age = mins < 1 ? 'just now' : mins < 60 ? `${mins} min ago` : mins < 1440 ? `${Math.round(mins / 60)} h ago` : `${Math.round(mins / 1440)} d ago`;
        context = `Locked from ${stored.host} · ${age}. Clear to reset, or Start Inspecting for a new session`;
      }
      ciSetStatus('locked', context);
      ciStopBtn.disabled = false;
    });

    // ── Render helpers ────────────────────────────────────────────────────────

    function ciEsc(str) {
      return escapeHtml(str);
    }

    function ciSwatch(color) {
      if (!color || color === 'none' || color === 'transparent' || color.includes('gradient')) return '';
      return `<span class="inspect-swatch" style="background:${escapeHtml(color)}"></span>`;
    }

    const CI_SKIP = new Set(['none', 'auto', 'normal', '0px', '0', 'initial', 'inherit', 'unset', 'start', 'visible', 'static', '1', '0s', 'ease', 'all']);

    function ciRow(label, value, opts = {}) {
      if (value === null || value === undefined || value === '') return '';
      const muted = !opts.always && CI_SKIP.has(String(value).trim()) ? ' inspect-val--muted' : '';
      const swatch = opts.color ? ciSwatch(value) : '';
      return `<div class="inspect-row"><span class="inspect-label">${label}</span><span class="inspect-val${muted}">${swatch}${ciEsc(value)}</span></div>`;
    }

    function ciSection(id, title, rows, defaultOpen = true) {
      if (!rows.trim()) return '';
      return `
      <div class="inspect-section ${defaultOpen ? '' : 'collapsed'}" data-sid="${id}">
        <div class="inspect-section-hdr" tabindex="0">
          <span class="inspect-section-hdr-left">
            <svg class="inspect-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
            ${title}
          </span>
          <button class="inspect-section-copy btn-hover" data-sid="${id}">Copy</button>
        </div>
        <div class="inspect-section-body">${rows}</div>
      </div>`;
    }

    function ciRenderData(d) {
      ciLastData = d;
      ciEmpty.classList.add('hidden');
      ciData.classList.remove('hidden');

      // ── Element header
      const classes = d.classList.slice(0, 4).map(c => `.${c}`).join('');
      const idStr = d.id ? `#${d.id}` : '';
      let html = `
      <div class="inspect-el-header">
        <button class="inspect-el-selector" title="Click to copy selector">${ciEsc(d.selector)}</button>
        <div class="inspect-el-meta">
          <span class="inspect-el-tag">${ciEsc(d.tagName)}</span>
          ${idStr ? `<span class="inspect-el-class">${ciEsc(idStr)}</span>` : ''}
          ${classes ? `<span class="inspect-el-class">${ciEsc(classes)}</span>` : ''}
          <span class="inspect-el-size">${d.rect.w} × ${d.rect.h}</span>
          <button class="btn-hover inspect-copy-all inspect-section-copy" data-sid="all">Copy All CSS</button>
        </div>
        ${d.inlineStyle ? `<div class="inspect-inline-note">inline: ${ciEsc(d.inlineStyle)}</div>` : ''}
      </div>`;

      // ── Layout section
      const l = d.layout;
      let layoutRows = '';
      layoutRows += ciRow('Width', l.width, { always: true });
      layoutRows += ciRow('Height', l.height, { always: true });
      layoutRows += ciRow('Display', l.display, { always: true });
      if (l.minWidth !== '0px') layoutRows += ciRow('Min-width', l.minWidth);
      if (l.maxWidth !== 'none') layoutRows += ciRow('Max-width', l.maxWidth);
      if (l.minHeight !== '0px') layoutRows += ciRow('Min-height', l.minHeight);
      if (l.maxHeight !== 'none') layoutRows += ciRow('Max-height', l.maxHeight);
      if (l.position !== 'static') {
        layoutRows += ciRow('Position', l.position, { always: true });
        if (l.top !== 'auto') layoutRows += ciRow('Top', l.top);
        if (l.right !== 'auto') layoutRows += ciRow('Right', l.right);
        if (l.bottom !== 'auto') layoutRows += ciRow('Bottom', l.bottom);
        if (l.left !== 'auto') layoutRows += ciRow('Left', l.left);
      }
      if (l.zIndex !== 'auto') layoutRows += ciRow('Z-index', l.zIndex);
      if (l.overflow !== 'visible') layoutRows += ciRow('Overflow', l.overflow);
      if (l.display.includes('flex')) {
        layoutRows += ciRow('Flex direction', l.flexDirection, { always: true });
        layoutRows += ciRow('Justify content', l.justifyContent, { always: true });
        layoutRows += ciRow('Align items', l.alignItems, { always: true });
        if (l.flexWrap !== 'nowrap') layoutRows += ciRow('Flex wrap', l.flexWrap);
        if (l.gap && l.gap !== 'normal') layoutRows += ciRow('Gap', l.gap);
        if (l.alignContent !== 'normal') layoutRows += ciRow('Align content', l.alignContent);
      }
      if (l.display.includes('grid')) {
        if (l.gridTemplateColumns !== 'none') layoutRows += ciRow('Grid columns', l.gridTemplateColumns, { always: true });
        if (l.gridTemplateRows !== 'none') layoutRows += ciRow('Grid rows', l.gridTemplateRows, { always: true });
        if (l.gap && l.gap !== 'normal') layoutRows += ciRow('Gap', l.gap);
      }
      if (l.alignSelf !== 'auto') layoutRows += ciRow('Align self', l.alignSelf);
      if (l.justifySelf !== 'auto') layoutRows += ciRow('Justify self', l.justifySelf);
      if (l.flexGrow !== '0') layoutRows += ciRow('Flex grow', l.flexGrow);
      if (l.flexShrink !== '1') layoutRows += ciRow('Flex shrink', l.flexShrink);
      if (l.flexBasis !== 'auto') layoutRows += ciRow('Flex basis', l.flexBasis);
      if (l.gridColumn !== 'auto') layoutRows += ciRow('Grid column', l.gridColumn);
      if (l.gridRow !== 'auto') layoutRows += ciRow('Grid row', l.gridRow);
      html += ciSection('layout', 'Layout', layoutRows);

      // ── Box model section
      const b = d.box;
      let boxRows = '';
      boxRows += ciRow('Box sizing', b.boxSizing, { always: true });
      boxRows += ciRow('Margin', b.margin, { always: true });
      boxRows += ciRow('Padding', b.padding, { always: true });
      if (b.borderStyle !== 'none') {
        boxRows += ciRow('Border', `${b.borderWidth} ${b.borderStyle}`, { always: true });
        boxRows += ciRow('Border color', b.borderColor, { always: true, color: true });
      }
      if (b.borderRadius !== '0px') boxRows += ciRow('Border radius', b.borderRadius, { always: true });
      if (b.outline !== 'none' && !b.outline.startsWith('0px')) boxRows += ciRow('Outline', b.outline);
      html += ciSection('box', 'Box Model', boxRows);

      // ── Typography section
      const t = d.typo;
      let typoRows = '';
      typoRows += ciRow('Font size', t.fontSize, { always: true });
      typoRows += ciRow('Font family', t.fontFamily, { always: true });
      typoRows += ciRow('Font weight', t.fontWeight, { always: true });
      typoRows += ciRow('Line height', t.lineHeight, { always: true });
      typoRows += ciRow('Text align', t.textAlign, { always: true });
      if (t.fontStyle !== 'normal') typoRows += ciRow('Font style', t.fontStyle);
      if (t.letterSpacing !== 'normal') typoRows += ciRow('Letter spacing', t.letterSpacing);
      if (t.textTransform !== 'none') typoRows += ciRow('Text transform', t.textTransform);
      if (t.textDecoration !== 'none') typoRows += ciRow('Text decoration', t.textDecoration);
      if (t.whiteSpace !== 'normal') typoRows += ciRow('White space', t.whiteSpace);
      if (t.wordBreak !== 'normal') typoRows += ciRow('Word break', t.wordBreak);
      if (t.textOverflow !== 'clip') typoRows += ciRow('Text overflow', t.textOverflow);
      html += ciSection('typo', 'Typography', typoRows);

      // ── Colors section
      const c = d.colors;
      let colorRows = '';
      colorRows += ciRow('Color', c.color, { always: true, color: true });
      colorRows += ciRow('Background', c.backgroundColor, { always: true, color: true });
      if (c.backgroundImage && c.backgroundImage !== 'none') {
        colorRows += ciRow('Bg image', c.backgroundImage.length > 60 ? c.backgroundImage.slice(0, 60) + '…' : c.backgroundImage);
        if (c.backgroundSize !== 'auto') colorRows += ciRow('Bg size', c.backgroundSize);
      }
      if (c.opacity !== '1') colorRows += ciRow('Opacity', c.opacity, { always: true });
      html += ciSection('colors', 'Colors', colorRows);

      // ── Effects section
      const e = d.effects;
      let fxRows = '';
      if (e.boxShadow && e.boxShadow !== 'none') fxRows += ciRow('Box shadow', e.boxShadow);
      if (e.textShadow && e.textShadow !== 'none') fxRows += ciRow('Text shadow', e.textShadow);
      if (e.filter && e.filter !== 'none') fxRows += ciRow('Filter', e.filter);
      if (e.backdropFilter && e.backdropFilter !== 'none') fxRows += ciRow('Backdrop filter', e.backdropFilter);
      if (e.transform && e.transform !== 'none') fxRows += ciRow('Transform', e.transform);
      if (e.mixBlendMode && e.mixBlendMode !== 'normal') fxRows += ciRow('Mix blend mode', e.mixBlendMode);
      if (fxRows) html += ciSection('effects', 'Effects', fxRows, false);

      // ── Interaction section
      const i = d.interaction;
      let ixRows = '';
      ixRows += ciRow('Cursor', i.cursor, { always: true });
      if (i.pointerEvents !== 'auto') ixRows += ciRow('Pointer events', i.pointerEvents);
      if (i.userSelect !== 'auto') ixRows += ciRow('User select', i.userSelect);
      if (i.resize !== 'none') ixRows += ciRow('Resize', i.resize);
      html += ciSection('interaction', 'Interaction', ixRows, false);

      // ── Animations section
      const a = d.anim;
      let animRows = '';
      if (a.transition && a.transition !== 'all 0s ease 0s') animRows += ciRow('Transition', a.transition);
      if (a.animationName && a.animationName !== 'none') animRows += ciRow('Animation', a.animationName);
      if (a.animationDuration && a.animationDuration !== '0s') animRows += ciRow('Duration', a.animationDuration);
      if (a.willChange && a.willChange !== 'auto') animRows += ciRow('Will change', a.willChange);
      if (animRows) html += ciSection('anim', 'Animations', animRows, false);

      // ── Parent container section
      if (d.parent) {
        const p = d.parent;
        let parentRows = '';
        parentRows += ciRow('Parent', `<${p.tagName}>`, { always: true });
        parentRows += ciRow('Width', p.width, { always: true });
        if (p.maxWidth !== 'none') parentRows += ciRow('Max-width', p.maxWidth);
        parentRows += ciRow('Display', p.display, { always: true });
        if (p.display.includes('flex')) {
          parentRows += ciRow('Direction', p.flexDirection, { always: true });
          parentRows += ciRow('Justify content', p.justifyContent, { always: true });
          parentRows += ciRow('Align items', p.alignItems, { always: true });
          if (p.gap && p.gap !== 'normal') parentRows += ciRow('Gap', p.gap);
        }
        if (p.display.includes('grid') && p.gridTemplateColumns !== 'none') {
          parentRows += ciRow('Grid columns', p.gridTemplateColumns, { always: true });
        }
        if (parentRows) html += ciSection('parent', 'Parent Container', parentRows, false);
      }

      ciData.innerHTML = html;

      // Click the selector to copy it
      ciData.querySelector('.inspect-el-selector')?.addEventListener('click', () => {
        copyToClipboard(d.selector);
      });

      // Section collapse toggles
      ciData.querySelectorAll('.inspect-section-hdr').forEach(hdr => {
        hdr.addEventListener('click', (e) => {
          if (e.target.closest('.inspect-section-copy')) return;
          hdr.closest('.inspect-section').classList.toggle('collapsed');
        });
      });

      // Copy buttons
      ciData.querySelectorAll('.inspect-section-copy').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const orig = btn.textContent;
          const flash = (label) => { btn.textContent = label; setTimeout(() => { btn.textContent = orig; }, 1500); };
          let text;
          try {
            const sid = btn.dataset.sid;
            text = sid === 'all' ? buildFullCss(ciLastData) : buildSectionCss(ciLastData, sid);
          } catch (err) {
            flash('Error!');
            return;
          }
          if (!text) { flash('Empty'); return; }
          copyToClipboard(text, btn);
        });
      });
    }

    function buildSectionCss(d, sid) {
      if (!d) return '';
      const sections = {
        layout: () => {
          const l = d.layout;
          return [
            `width: ${l.width};`, `height: ${l.height};`, `display: ${l.display};`,
            l.position !== 'static' ? `position: ${l.position};` : '',
            l.maxWidth !== 'none' ? `max-width: ${l.maxWidth};` : '',
            l.zIndex !== 'auto' ? `z-index: ${l.zIndex};` : '',
            l.overflow !== 'visible' ? `overflow: ${l.overflow};` : '',
            l.display.includes('flex') ? [
              `flex-direction: ${l.flexDirection};`,
              `justify-content: ${l.justifyContent};`,
              `align-items: ${l.alignItems};`,
              l.gap !== 'normal' ? `gap: ${l.gap};` : '',
            ].filter(Boolean).join('\n') : '',
          ].filter(Boolean).join('\n');
        },
        box: () => {
          const b = d.box;
          return [
            `box-sizing: ${b.boxSizing};`,
            `margin: ${b.margin};`,
            `padding: ${b.padding};`,
            b.borderStyle !== 'none' ? `border: ${b.borderWidth} ${b.borderStyle} ${b.borderColor};` : '',
            b.borderRadius !== '0px' ? `border-radius: ${b.borderRadius};` : '',
          ].filter(Boolean).join('\n');
        },
        typo: () => {
          const t = d.typo;
          return [
            `font-size: ${t.fontSize};`,
            `font-family: ${t.fontFamily};`,
            `font-weight: ${t.fontWeight};`,
            `line-height: ${t.lineHeight};`,
            `text-align: ${t.textAlign};`,
            t.letterSpacing !== 'normal' ? `letter-spacing: ${t.letterSpacing};` : '',
            t.textTransform !== 'none' ? `text-transform: ${t.textTransform};` : '',
          ].filter(Boolean).join('\n');
        },
        colors: () => {
          const c = d.colors;
          return [
            `color: ${c.color};`,
            `background-color: ${c.backgroundColor};`,
            c.backgroundImage !== 'none' ? `background-image: ${c.backgroundImage};` : '',
            c.opacity !== '1' ? `opacity: ${c.opacity};` : '',
          ].filter(Boolean).join('\n');
        },
        effects: () => {
          const e = d.effects;
          return [
            e.boxShadow !== 'none' ? `box-shadow: ${e.boxShadow};` : '',
            e.filter !== 'none' ? `filter: ${e.filter};` : '',
            e.transform !== 'none' ? `transform: ${e.transform};` : '',
          ].filter(Boolean).join('\n');
        },
        interaction: () => `cursor: ${d.interaction.cursor};`,
        anim: () => {
          const a = d.anim;
          return [
            a.transition !== 'all 0s ease 0s' ? `transition: ${a.transition};` : '',
            a.animationName !== 'none' ? `animation: ${a.animation};` : '',
          ].filter(Boolean).join('\n');
        },
      };
      const fn = sections[sid];
      return fn ? fn() : '';
    }

    function buildFullCss(d) {
      if (!d) return '';
      // Paste-ready rule: selector + braces, declarations indented per section
      const sids = ['layout', 'box', 'typo', 'colors', 'effects', 'interaction', 'anim'];
      const body = sids.map(s => {
        const css = buildSectionCss(d, s);
        return css ? `  /* ${s} */\n` + css.split('\n').map(l => '  ' + l).join('\n') : '';
      }).filter(Boolean).join('\n\n');
      return `${d.selector} {\n${body}\n}`;
    }



  }); // ─── end lazy init: css-inspector
  registerToolInit("component-extractor", () => {
    // ─── COMPONENT EXTRACTOR ────────────────────────────────────────────────────

    // Injected into the page: hover-pick a container, then extract its HTML and
    // the non-default computed CSS of every descendant. Fully self-contained.
    function componentExtractorPicker() {
      if (window.__wdtCexCleanup) window.__wdtCexCleanup();

      const ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;pointer-events:none;background:rgba(76,175,80,0.16);border:1.5px solid #4caf50;z-index:2147483646;display:none;border-radius:2px;';
      const tip = document.createElement('div');
      tip.textContent = 'Component Extractor: click a container to extract · Esc to cancel';
      tip.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#1a1d27;color:#e2e8f0;padding:6px 14px;border-radius:99px;font:12px system-ui,sans-serif;z-index:2147483647;border:1px solid #4caf50;box-shadow:0 4px 16px rgba(0,0,0,0.5);';
      document.documentElement.appendChild(ov);
      document.documentElement.appendChild(tip);

      let cur = null;

      function cleanup() {
        document.removeEventListener('mousemove', onMove, true);
        document.removeEventListener('click', onClick, true);
        document.removeEventListener('keydown', onKey, true);
        ov.remove(); tip.remove();
        delete window.__wdtCexCleanup;
      }
      window.__wdtCexCleanup = cleanup;

      const onMove = (e) => {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el || el === ov || el === tip) return;
        cur = el;
        const r = el.getBoundingClientRect();
        ov.style.display = 'block';
        ov.style.top = r.top + 'px';
        ov.style.left = r.left + 'px';
        ov.style.width = r.width + 'px';
        ov.style.height = r.height + 'px';
      };
      const onKey = (e) => { if (e.key === 'Escape') cleanup(); };
      const onClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const target = cur;
        cleanup();
        if (target) extract(target);
      };

      document.addEventListener('mousemove', onMove, true);
      document.addEventListener('click', onClick, true);
      document.addEventListener('keydown', onKey, true);

      function extract(root) {
        const MAX_ELS = 150;
        const all = [root, ...root.querySelectorAll('*')];
        const els = all.slice(0, MAX_ELS);

        // Hidden iframe provides true browser-default styles per tag,
        // so we only emit properties that actually differ.
        const frame = document.createElement('iframe');
        frame.style.cssText = 'position:fixed;width:10px;height:10px;left:-9999px;top:-9999px;visibility:hidden;';
        document.documentElement.appendChild(frame);
        const fdoc = frame.contentDocument;
        const defaultsCache = {};
        // Probe must mirror what the element really is: a bare <a> has no
        // underline — only a[href] does — and <input> defaults vary by type.
        const getDefaults = (el) => {
          const tag = el.tagName.toLowerCase();
          const key = tag + (tag === 'a' && el.hasAttribute('href') ? '[href]' : '') +
            (el.type ? `[${el.type}]` : '');
          if (defaultsCache[key]) return defaultsCache[key];
          let probe;
          try { probe = fdoc.createElement(tag); } catch { probe = fdoc.createElement('div'); }
          if (tag === 'a' && el.hasAttribute('href')) probe.setAttribute('href', '#');
          try { if (el.type && 'type' in probe) probe.setAttribute('type', el.type); } catch { }
          fdoc.body.appendChild(probe);
          const cs = fdoc.defaultView.getComputedStyle(probe);
          const map = {};
          for (let i = 0; i < cs.length; i++) map[cs[i]] = cs.getPropertyValue(cs[i]);
          defaultsCache[key] = map;
          return map;
        };

        // Inheritable props: skip when identical to the parent's computed value —
        // they'll cascade naturally and the output stays readable.
        const INHERITED = new Set(['color', 'cursor', 'direction', 'font-family', 'font-size', 'font-style', 'font-variant', 'font-weight', 'letter-spacing', 'line-height', 'list-style-image', 'list-style-position', 'list-style-type', 'text-align', 'text-indent', 'text-transform', 'visibility', 'white-space', 'word-break', 'word-spacing', 'overflow-wrap']);

        // ── CSSOM rule index for pseudo-class states (:hover, :focus …) ──
        // Computed styles only reflect the current state; state styles must
        // come from the stylesheet rules themselves.
        const PSEUDOS = [':hover', ':focus-visible', ':focus-within', ':focus', ':active', ':checked', ':disabled'];
        const styleRules = [];
        let blockedSheets = 0;
        for (const sheet of document.styleSheets) {
          let rules;
          try { rules = sheet.cssRules; } catch { blockedSheets++; continue; }
          if (!rules) continue;
          const walk = (list) => {
            for (const r of list) {
              if (r.type === 1) styleRules.push(r);
              else if (r.cssRules) { try { walk(r.cssRules); } catch { } }
            }
          };
          try { walk(rules); } catch { }
        }

        const stripPseudo = (sel) => sel.replace(/:(hover|focus-visible|focus-within|focus|active|checked|disabled)/g, '');

        function pseudoClassRules(el, idx) {
          const out = [];
          for (const pseudo of PSEUDOS) {
            const decls = new Map();
            for (const rule of styleRules) {
              const selText = rule.selectorText;
              if (!selText || selText.indexOf(pseudo) === -1) continue;
              for (const sel of selText.split(',')) {
                if (sel.indexOf(pseudo) === -1) continue;
                let matches = false;
                try {
                  const base = stripPseudo(sel).trim();
                  matches = base ? el.matches(base) : false;
                } catch { }
                if (!matches) continue;
                for (let i = 0; i < rule.style.length; i++) {
                  const p = rule.style[i];
                  decls.set(p, rule.style.getPropertyValue(p));
                }
                break;
              }
            }
            if (decls.size) {
              out.push(`.x-${idx}${pseudo} {\n${[...decls].map(([p, v]) => `  ${p}: ${v};`).join('\n')}\n}`);
            }
          }
          return out;
        }

        // ── ::before / ::after — emitted whenever content is set ──
        function pseudoElementRules(el, idx, def) {
          const out = [];
          for (const pe of ['::before', '::after']) {
            let pcs;
            try { pcs = getComputedStyle(el, pe); } catch { continue; }
            const content = pcs.getPropertyValue('content');
            if (!content || content === 'none' || content === 'normal') continue;
            const decls = [];
            for (let i = 0; i < pcs.length; i++) {
              const prop = pcs[i];
              if (prop.startsWith('-webkit-') || prop.startsWith('--')) continue;
              const val = pcs.getPropertyValue(prop);
              if (!val || val === def[prop]) continue;
              decls.push(`  ${prop}: ${val};`);
            }
            if (decls.length) out.push(`.x-${idx}${pe} {\n${decls.join('\n')}\n}`);
          }
          return out;
        }

        const cssRules = [];
        els.forEach((el, i) => {
          if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
          const cs = getComputedStyle(el);
          const parentCs = (i > 0 && el.parentElement) ? getComputedStyle(el.parentElement) : null;
          const def = getDefaults(el);
          const decls = [];
          for (let p = 0; p < cs.length; p++) {
            const prop = cs[p];
            if (prop.startsWith('-webkit-') || prop.startsWith('--')) continue;
            const val = cs.getPropertyValue(prop);
            if (!val || val === def[prop]) continue;
            if (parentCs && INHERITED.has(prop) && parentCs.getPropertyValue(prop) === val) continue;
            decls.push(`  ${prop}: ${val};`);
          }
          if (decls.length) cssRules.push(`.x-${i} {\n${decls.join('\n')}\n}`);
          cssRules.push(...pseudoElementRules(el, i, def));
          cssRules.push(...pseudoClassRules(el, i));
        });
        frame.remove();

        if (blockedSheets) {
          cssRules.unshift(`/* Note: ${blockedSheets} cross-origin stylesheet(s) could not be read, so some :hover/:focus styles may be missing. */`);
        }

        // Clone the subtree; annotate elements with the matching .x-N classes,
        // strip scripts and inline event handlers.
        const clone = root.cloneNode(true);
        const cloneEls = [clone, ...clone.querySelectorAll('*')];
        cloneEls.forEach((el, i) => {
          if (i < MAX_ELS) el.classList.add('x-' + i);
          [...el.attributes].forEach(a => { if (a.name.startsWith('on')) el.removeAttribute(a.name); });
        });
        clone.querySelectorAll('script, style').forEach(s => s.remove());

        const CAP = 400000;
        let html = clone.outerHTML;
        let css = cssRules.join('\n\n');
        const truncated = all.length > MAX_ELS || html.length > CAP || css.length > CAP;
        html = html.slice(0, CAP);
        css = css.slice(0, CAP);

        try {
          chrome.storage.local.set({
            wdt_component: { html, css, host: location.hostname, ts: Date.now(), count: Math.min(all.length, MAX_ELS), truncated },
          }, () => {
            try { chrome.runtime.sendMessage({ type: 'REOPEN_POPUP' }); } catch (_) { }
          });
        } catch (_) { }

        // Confirm on the page, then reopen the popup with the result
        const pill = document.createElement('div');
        pill.textContent = `✓ Component extracted: ${Math.min(all.length, MAX_ELS)} element(s)`;
        pill.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#1b5e20;color:#fff;padding:7px 16px;border-radius:99px;font:12px system-ui,sans-serif;z-index:2147483647;box-shadow:0 4px 16px rgba(0,0,0,0.5);';
        document.documentElement.appendChild(pill);
        setTimeout(() => pill.remove(), 2500);
      }
    }

    (function () {
      const pickBtn = document.getElementById('cexPickBtn');
      const clearBtn = document.getElementById('cexClearBtn');
      const errEl = document.getElementById('cexError');

      function cexRender(stored) {
        document.getElementById('cexHtml').value = stored.html || '';
        document.getElementById('cexCss').value = stored.css || '';
        const mins = Math.round((Date.now() - (stored.ts || Date.now())) / 60000);
        const age = mins < 1 ? 'just now' : mins < 60 ? `${mins} min ago` : `${Math.round(mins / 60)} h ago`;
        document.getElementById('cexContext').innerHTML =
          `Extracted from <b>${escapeHtml(stored.host || '?')}</b> · ${age} · ${stored.count} element(s)` +
          (stored.truncated ? ` · <span class="cex-trunc">truncated at limits</span>` : '');
        document.getElementById('cexResults').classList.remove('hidden');
        clearBtn.disabled = false;
      }

      function cexSingleFile() {
        const html = document.getElementById('cexHtml').value;
        const css = document.getElementById('cexCss').value;
        return `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Extracted component</title>\n<style>\n${css}\n</style>\n</head>\n<body>\n${html}\n</body>\n</html>`;
      }

      pickBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs[0];
          if (!tab) return;
          if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
            errEl.textContent = 'Cannot extract from Chrome system pages.';
            return;
          }
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: componentExtractorPicker,
          }, () => {
            if (chrome.runtime.lastError) {
              errEl.textContent = 'Error: ' + chrome.runtime.lastError.message;
              return;
            }
            window.close();
          });
        });
      });

      clearBtn.addEventListener('click', () => {
        chrome.storage.local.remove('wdt_component');
        document.getElementById('cexResults').classList.add('hidden');
        clearBtn.disabled = true;
      });

      document.getElementById('cexCopyHtml').addEventListener('click', (e) =>
        copyToClipboard(document.getElementById('cexHtml').value, e.currentTarget));
      document.getElementById('cexCopyCss').addEventListener('click', (e) =>
        copyToClipboard(document.getElementById('cexCss').value, e.currentTarget));
      document.getElementById('cexCopyFile').addEventListener('click', (e) =>
        copyToClipboard(cexSingleFile(), e.currentTarget));

      document.getElementById('cexDownload').addEventListener('click', () => {
        const blob = new Blob([cexSingleFile()], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'component.html';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });

      chrome.storage.local.get(['wdt_component'], (data) => {
        if (data.wdt_component) cexRender(data.wdt_component);
      });
    })();



  }); // ─── end lazy init: component-extractor
  registerToolInit("a11y-audit", () => {
    // ─── ACCESSIBILITY AUDIT ────────────────────────────────────────────────────

    function runA11yScan() {
      const btn = document.getElementById("runA11yAudit");
      btn.textContent = "Auditing…";
      btn.disabled = true;
      const results = document.getElementById("a11yResults");
      results.classList.add("hidden");

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) { btn.textContent = "↻ Re-audit"; btn.disabled = false; return; }
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            const issues = [];

            // Images without alt
            const imgs = [...document.querySelectorAll("img")];
            const noAlt = imgs.filter(i => !i.hasAttribute("alt") || i.alt.trim() === "");
            if (noAlt.length) issues.push({ category: "Images", severity: "error", count: noAlt.length, message: `${noAlt.length} image(s) missing alt attribute`, selectors: noAlt.slice(0, 3).map(el => el.src.split("/").slice(-1)[0] || "img") });

            // Heading hierarchy
            const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")];
            const hSkips = [];
            let prevLevel = 0;
            headings.forEach(h => {
              const level = parseInt(h.tagName[1]);
              if (prevLevel && level > prevLevel + 1) hSkips.push(`${h.tagName}: "${h.textContent.trim().substring(0, 40)}"`);
              prevLevel = level;
            });
            const h1Count = document.querySelectorAll("h1").length;
            if (h1Count === 0) issues.push({ category: "Headings", severity: "error", count: 1, message: "No H1 tag found on page" });
            else if (h1Count > 1) issues.push({ category: "Headings", severity: "warning", count: h1Count, message: `Multiple H1 tags (${h1Count}). A page should have only one` });
            if (hSkips.length) issues.push({ category: "Headings", severity: "warning", count: hSkips.length, message: `Heading level skip(s): ${hSkips.slice(0, 2).join("; ")}` });

            // Form inputs without labels
            const inputs = [...document.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]), textarea, select")];
            const unlabeled = inputs.filter(inp => {
              const id = inp.id;
              const hasLabel = id && document.querySelector(`label[for="${id}"]`);
              const hasAriaLabel = inp.hasAttribute("aria-label") || inp.hasAttribute("aria-labelledby");
              return !hasLabel && !hasAriaLabel;
            });
            if (unlabeled.length) issues.push({ category: "Forms", severity: "error", count: unlabeled.length, message: `${unlabeled.length} form input(s) without accessible labels` });

            // Buttons/links with no text
            const btns = [...document.querySelectorAll("button, a")];
            const emptyBtns = btns.filter(el => {
              const text = el.textContent.trim();
              const hasImg = el.querySelector("img[alt]");
              const hasAria = el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby") || el.hasAttribute("title");
              return !text && !hasImg && !hasAria;
            });
            if (emptyBtns.length) issues.push({ category: "Interactive", severity: "error", count: emptyBtns.length, message: `${emptyBtns.length} button(s)/link(s) with no accessible text` });

            // Missing lang attribute
            if (!document.documentElement.hasAttribute("lang")) issues.push({ category: "Document", severity: "error", count: 1, message: "Missing lang attribute on the html element" });

            // Missing meta viewport
            if (!document.querySelector("meta[name=viewport]")) issues.push({ category: "Document", severity: "warning", count: 1, message: "Missing meta viewport tag" });

            // Landmark regions
            if (!document.querySelector("main, [role=main]")) issues.push({ category: "Landmarks", severity: "warning", count: 1, message: "No main landmark. Screen readers rely on this for navigation" });
            if (!document.querySelector("nav, [role=navigation]")) issues.push({ category: "Landmarks", severity: "warning", count: 1, message: "No nav landmark found on page" });

            // Generic link text
            const genericTexts = ["click here", "here", "read more", "learn more", "more", "link", "this"];
            const genericLinks = [...document.querySelectorAll("a")].filter(a => genericTexts.includes(a.textContent.trim().toLowerCase()) && !a.getAttribute("aria-label"));
            if (genericLinks.length) issues.push({ category: "Links", severity: "warning", count: genericLinks.length, message: `${genericLinks.length} link(s) with generic text ("click here", "read more", etc.). Use descriptive text` });

            // Tabindex misuse
            const badTabindex = [...document.querySelectorAll("[tabindex]")].filter(el => parseInt(el.getAttribute("tabindex")) > 0);
            if (badTabindex.length) issues.push({ category: "Focus", severity: "warning", count: badTabindex.length, message: `${badTabindex.length} element(s) with tabindex > 0, which disrupts the natural focus order` });

            // Skip link check
            const firstLink = document.querySelector("a");
            const hasSkipLink = firstLink && (firstLink.getAttribute("href") || "").startsWith("#") && /skip|jump|main|content/i.test(firstLink.textContent);
            if (!hasSkipLink) issues.push({ category: "Focus", severity: "warning", count: 1, message: "No skip-to-content link detected. Keyboard users must tab through all navigation" });

            // Duplicate IDs (break aria-labelledby/aria-describedby and label[for])
            const idCounts = {};
            document.querySelectorAll("[id]").forEach(el => { idCounts[el.id] = (idCounts[el.id] || 0) + 1; });
            const dupIds = Object.entries(idCounts).filter(([, n]) => n > 1);
            if (dupIds.length) issues.push({ category: "Document", severity: "error", count: dupIds.length, message: `${dupIds.length} duplicate id(s) (e.g. "${dupIds[0][0]}"), which breaks ARIA references and label associations` });

            // ARIA references pointing at missing ids
            let brokenRefs = 0;
            document.querySelectorAll("[aria-labelledby], [aria-describedby]").forEach(el => {
              ["aria-labelledby", "aria-describedby"].forEach(attr => {
                (el.getAttribute(attr) || "").split(/\s+/).filter(Boolean).forEach(id => {
                  if (!document.getElementById(id)) brokenRefs++;
                });
              });
            });
            if (brokenRefs) issues.push({ category: "ARIA", severity: "error", count: brokenRefs, message: `${brokenRefs} aria-labelledby/aria-describedby reference(s) point to ids that don't exist` });

            // role="button" that keyboards can't reach
            const fakeButtons = [...document.querySelectorAll('[role="button"]')].filter(el =>
              !["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA"].includes(el.tagName) && !el.hasAttribute("tabindex"));
            if (fakeButtons.length) issues.push({ category: "ARIA", severity: "error", count: fakeButtons.length, message: `${fakeButtons.length} element(s) with role="button" but no tabindex, so it's unreachable by keyboard` });

            // Iframes without an accessible name
            const unnamedFrames = [...document.querySelectorAll("iframe")].filter(f => !f.title && !f.getAttribute("aria-label"));
            if (unnamedFrames.length) issues.push({ category: "Document", severity: "warning", count: unnamedFrames.length, message: `${unnamedFrames.length} iframe(s) without a title attribute` });

            // Video without captions
            const uncaptioned = [...document.querySelectorAll("video")].filter(v => !v.querySelector('track[kind="captions"], track[kind="subtitles"]'));
            if (uncaptioned.length) issues.push({ category: "Media", severity: "warning", count: uncaptioned.length, message: `${uncaptioned.length} video(s) without a captions/subtitles track` });

            // Text contrast sampling (only where the element's own background is opaque,
            // so the measurement is trustworthy)
            const lum = (r, g, b) => {
              const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
              return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
            };
            const parseRgb = s => { const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/); return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null; };
            let lowContrast = 0, contrastSampled = 0;
            const textEls = document.querySelectorAll("p, span, a, li, td, th, h1, h2, h3, h4, h5, h6, label, button");
            for (let i = 0; i < textEls.length && contrastSampled < 300; i++) {
              const el = textEls[i];
              if (!el.textContent.trim() || el.children.length) continue;
              const cs = getComputedStyle(el);
              const bg = parseRgb(cs.backgroundColor);
              const fg = parseRgb(cs.color);
              if (!bg || !fg || bg.a < 1) continue;
              contrastSampled++;
              const l1 = lum(fg.r, fg.g, fg.b), l2 = lum(bg.r, bg.g, bg.b);
              const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
              const large = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
              if (ratio < (large ? 3 : 4.5)) lowContrast++;
            }
            if (lowContrast) issues.push({ category: "Contrast", severity: "error", count: lowContrast, message: `${lowContrast} of ${contrastSampled} sampled text element(s) fail WCAG AA contrast (own-background elements only)` });

            const errIssues = issues.filter(i => i.severity === "error");
            const warnIssues = issues.filter(i => i.severity === "warning");
            return { issues, totals: { errors: errIssues.reduce((a, i) => a + i.count, 0), errorChecks: errIssues.length, warnings: warnIssues.reduce((a, i) => a + i.count, 0), warningChecks: warnIssues.length } };
          }
        }, (results_) => {
          btn.textContent = "↻ Re-audit";
          btn.disabled = false;
          if (chrome.runtime.lastError || !results_?.[0]?.result) {
            document.getElementById("a11ySummary").innerHTML = `<p class="field-error">Could not audit this page. Try a regular HTTP/HTTPS page.</p>`;
            results.classList.remove("hidden");
            return;
          }
          const { issues, totals } = results_[0].result;
          a11yIssues = issues;
          renderA11y(issues, totals);
          results.classList.remove("hidden");
        });
      });
    }

    let a11yIssues = [];

    function renderA11y(issues, totals) {
      const summaryEl = document.getElementById("a11ySummary");
      const listEl = document.getElementById("a11yIssueList");

      if (!issues.length) {
        summaryEl.innerHTML = `<div class="a11y-pass">${SI.pass} No common accessibility issues found!</div>`;
        listEl.innerHTML = "";
        return;
      }

      // Score: each error check weighs double a warning check
      const penalty = totals.errorChecks * 2 + totals.warningChecks;
      const score = Math.max(0, Math.round(100 - (penalty / (penalty + 8)) * 100));
      const scoreCol = score >= 80 ? "var(--success)" : score >= 50 ? "var(--warning)" : "var(--danger)";
      const errLabel = totals.errorChecks === 1 ? `${totals.errors} error` : `${totals.errorChecks} errors (${totals.errors} elements)`;
      const warnLabel = totals.warningChecks === 1 ? `${totals.warnings} warning` : `${totals.warningChecks} warnings`;

      summaryEl.innerHTML = `
      <div class="tseo-hero">
        <div class="tseo-ring" style="background: conic-gradient(${scoreCol} ${score * 3.6}deg, var(--bg-elevated) 0)">
          <div class="tseo-ring-inner"><span class="tseo-ring-num">${score}</span><span class="tseo-ring-lbl">score</span></div>
        </div>
        <div class="tseo-stats">
          <span class="a11y-badge a11y-badge--error">${errLabel}</span>
          <span class="a11y-badge a11y-badge--warning">${warnLabel}</span>
          <button id="a11yCopyReport" class="btn-ghost">Copy Report</button>
        </div>
      </div>`;

      document.getElementById("a11yCopyReport").addEventListener("click", (e) => {
        const mark = { error: "[ERROR]", warning: "[WARN]" };
        const md = ["# Accessibility Audit", ""];
        [...new Set(a11yIssues.map(i => i.category))].forEach(cat => {
          md.push(`## ${cat}`);
          a11yIssues.filter(i => i.category === cat).forEach(i =>
            md.push(`- ${mark[i.severity] || "[WARN]"} ${i.message}`));
          md.push("");
        });
        copyToClipboard(md.join("\n"), e.currentTarget);
      });

      listEl.innerHTML = issues.map(issue => `
      <div class="a11y-issue a11y-issue--${issue.severity === "error" ? "error" : "warning"}">
        <div class="a11y-issue-header">
          <span class="a11y-issue-category">${escapeHtml(issue.category)}</span>
          <span class="a11y-issue-sev">${escapeHtml(issue.severity)}</span>
        </div>
        <p class="a11y-issue-msg">${escapeHtml(issue.message)}</p>
      </div>`).join("");
    }

    document.getElementById("runA11yAudit").addEventListener("click", runA11yScan);
    registerTabHook("a11y-audit", runA11yScan);



  }); // ─── end lazy init: a11y-audit
  registerToolInit("technical-seo", () => {
    // ─── TECHNICAL SEO AUDIT ────────────────────────────────────────────────────

    let tseoChecks = [];
    let tseoFilter = "all";

    const tseoSafeStatus = s => ["pass", "warn", "fail", "info"].includes(s) ? s : "info";

    function renderTseo() {
      const summaryEl = document.getElementById("techSEOSummary");
      const listEl = document.getElementById("techSEOList");
      const passes = tseoChecks.filter(c => c.status === "pass").length;
      const warns = tseoChecks.filter(c => c.status === "warn").length;
      const fails = tseoChecks.filter(c => c.status === "fail").length;
      const scored = passes + warns + fails;
      // Warnings count half — the score reflects "how close to clean"
      const score = scored ? Math.round(((passes + warns * 0.5) / scored) * 100) : 0;
      const scoreCol = score >= 80 ? "var(--success)" : score >= 50 ? "var(--warning)" : "var(--danger)";

      summaryEl.innerHTML = `
      <div class="tseo-hero">
        <div class="tseo-ring" style="background: conic-gradient(${scoreCol} ${score * 3.6}deg, var(--bg-elevated) 0)">
          <div class="tseo-ring-inner"><span class="tseo-ring-num">${score}</span><span class="tseo-ring-lbl">score</span></div>
        </div>
        <div class="tseo-stats">
          <span class="tseo-badge tseo-badge--pass">${SI.pass} ${passes} passed</span>
          <span class="tseo-badge tseo-badge--warn">${SI.warn} ${warns} warnings</span>
          <span class="tseo-badge tseo-badge--fail">${SI.fail} ${fails} failed</span>
        </div>
      </div>`;

      const visible = tseoChecks.filter(c => tseoFilter === "all" || tseoSafeStatus(c.status) === tseoFilter);
      const sections = [...new Set(visible.map(c => c.section))];
      listEl.innerHTML = sections.map(sec => {
        const items = visible.filter(c => c.section === sec);
        return `
        <div class="tseo-section-label">${escapeHtml(sec)} <span class="tseo-section-count">${items.length}</span></div>
        ${items.map(c => `
          <div class="tseo-item tseo-item--${tseoSafeStatus(c.status)}">
            <span class="tseo-icon">${SI[c.status] || SI.info}</span>
            <div class="tseo-content">
              <div class="tseo-label">${escapeHtml(c.label)}${c.value ? ` <span class="tseo-val">${escapeHtml(c.value)}</span>` : ""}</div>
              ${c.detail ? `<div class="tseo-detail">${escapeHtml(c.detail)}</div>` : ""}
            </div>
          </div>`).join("")}`;
      }).join("") || `<p class="tseo-empty">No checks match this filter.</p>`;
    }

    document.querySelectorAll(".tseo-filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tseo-filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        tseoFilter = btn.dataset.filter;
        renderTseo();
      });
    });

    document.getElementById("tseoCopyReport").addEventListener("click", (e) => {
      if (!tseoChecks.length) return;
      const mark = { pass: "[PASS]", warn: "[WARN]", fail: "[FAIL]", info: "[INFO]" };
      const md = ["# Technical SEO Audit", ""];
      [...new Set(tseoChecks.map(c => c.section))].forEach(sec => {
        md.push(`## ${sec}`);
        tseoChecks.filter(c => c.section === sec).forEach(c => {
          md.push(`- ${mark[c.status] || "[INFO]"} **${c.label}**${c.value ? ` (${c.value})` : ""}: ${c.detail}`);
        });
        md.push("");
      });
      copyToClipboard(md.join("\n"), e.currentTarget);
    });

    function runTechSeoScan() {
      const btn = document.getElementById("runTechSEO");
      const resultsEl = document.getElementById("techSEOResults");
      const summaryEl = document.getElementById("techSEOSummary");
      const listEl = document.getElementById("techSEOList");

      btn.textContent = "Auditing…";
      btn.disabled = true;
      resultsEl.classList.add("hidden");

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) { btn.textContent = "↻ Re-audit"; btn.disabled = false; return; }
        const tabUrl = tabs[0].url || "";

        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            const checks = [];

            const addCheck = (section, label, status, detail, value) => {
              checks.push({ section, label, status, detail: detail || "", value: value || "" });
            };

            // ── Indexing ────────────────────────────────────────────────────
            const robotsMeta = document.querySelector("meta[name='robots']");
            const robotsContent = (robotsMeta?.getAttribute("content") || "").toLowerCase();
            const isNoindex = robotsContent.includes("noindex");
            const isNofollow = robotsContent.includes("nofollow");
            if (isNoindex) addCheck("Indexing", "Robots meta: noindex", "fail", "Page is blocked from indexing. Remove noindex to allow crawling.", robotsContent);
            else if (robotsMeta) addCheck("Indexing", "Robots meta", "pass", "Page is indexable.", robotsContent);
            else addCheck("Indexing", "Robots meta", "info", "No robots meta tag, so it defaults to index, follow.", "");

            if (isNofollow) addCheck("Indexing", "Robots meta: nofollow", "warn", "Links on this page won't pass link equity.", robotsContent);

            const canonical = document.querySelector("link[rel='canonical']");
            if (!canonical) {
              addCheck("Indexing", "Canonical URL", "warn", "No canonical tag found. Duplicate content risk.", "");
            } else {
              const href = canonical.getAttribute("href") || "";
              const isSelf = href === location.href || href === location.pathname;
              addCheck("Indexing", "Canonical URL", isSelf ? "pass" : "warn",
                isSelf ? "Canonical points to this page." : "Canonical points to a different URL. Verify this is intentional.", href);
            }

            const httpsOk = location.protocol === "https:";
            addCheck("Indexing", "HTTPS", httpsOk ? "pass" : "fail",
              httpsOk ? "Page is served over HTTPS." : "Page is served over HTTP. Switch to HTTPS for security and SEO.", location.protocol);

            // ── Content ─────────────────────────────────────────────────────
            const title = document.title || "";
            const titleLen = title.length;
            if (!title) addCheck("Content", "Title tag", "fail", "No title tag found.", "");
            else if (titleLen < 30) addCheck("Content", "Title tag", "warn", `Title is too short (${titleLen} chars). Aim for 50–60 chars.`, title);
            else if (titleLen > 60) addCheck("Content", "Title tag", "warn", `Title is too long (${titleLen} chars). Google truncates at ~60 chars.`, title);
            else addCheck("Content", "Title tag", "pass", `Length: ${titleLen} chars (optimal).`, title);

            const metaDesc = document.querySelector("meta[name='description']");
            const desc = metaDesc?.getAttribute("content") || "";
            const descLen = desc.length;
            if (!desc) addCheck("Content", "Meta description", "fail", "No meta description found.", "");
            else if (descLen < 80) addCheck("Content", "Meta description", "warn", `Too short (${descLen} chars). Aim for 150–160 chars.`, desc.substring(0, 80) + "…");
            else if (descLen > 160) addCheck("Content", "Meta description", "warn", `Too long (${descLen} chars). Google truncates at ~160 chars.`, desc.substring(0, 80) + "…");
            else addCheck("Content", "Meta description", "pass", `Length: ${descLen} chars (optimal).`, desc.substring(0, 80) + (desc.length > 80 ? "…" : ""));

            const h1s = document.querySelectorAll("h1");
            if (!h1s.length) addCheck("Content", "H1 tag", "fail", "No H1 tag found. Each page should have exactly one H1.", "");
            else if (h1s.length > 1) addCheck("Content", "H1 tag", "warn", `${h1s.length} H1 tags found. Use only one H1 per page.`, h1s[0].textContent.trim().substring(0, 60));
            else addCheck("Content", "H1 tag", "pass", "One H1 found.", h1s[0].textContent.trim().substring(0, 60));

            const bodyText = document.body?.innerText || "";
            const wordCount = bodyText.trim().split(/\s+/).filter(Boolean).length;
            if (wordCount < 200) addCheck("Content", "Word count", "warn", `Only ${wordCount} words. Thin content may rank poorly. Aim for 300+.`, `${wordCount} words`);
            else addCheck("Content", "Word count", "pass", `${wordCount} words (sufficient content).`, `${wordCount} words`);

            // ── Social / Structured Data ─────────────────────────────────────
            const ogTitle = document.querySelector("meta[property='og:title']");
            const ogDesc = document.querySelector("meta[property='og:description']");
            const ogImage = document.querySelector("meta[property='og:image']");
            const ogMissing = [!ogTitle && "og:title", !ogDesc && "og:description", !ogImage && "og:image"].filter(Boolean);
            if (ogMissing.length) addCheck("Social", "Open Graph tags", ogMissing.length === 3 ? "warn" : "warn", `Missing: ${ogMissing.join(", ")}`, "");
            else addCheck("Social", "Open Graph tags", "pass", "og:title, og:description, og:image all present.", ogTitle.getAttribute("content").substring(0, 50));

            const twitterCard = document.querySelector("meta[name='twitter:card']");
            if (!twitterCard) addCheck("Social", "Twitter Card", "warn", "No twitter:card meta tag found.", "");
            else addCheck("Social", "Twitter Card", "pass", "Twitter card meta tag present.", twitterCard.getAttribute("content"));

            const jsonLd = [...document.querySelectorAll("script[type='application/ld+json']")];
            if (!jsonLd.length) {
              addCheck("Social", "Structured Data (JSON-LD)", "warn", "No JSON-LD structured data found. Consider adding Schema.org markup.", "");
            } else {
              const types = jsonLd.map(s => { try { return JSON.parse(s.textContent)["@type"] || "unknown"; } catch { return "invalid JSON"; } });
              addCheck("Social", "Structured Data (JSON-LD)", "pass", `${jsonLd.length} schema block(s) found.`, types.join(", "));
            }

            // ── Performance / Resources ──────────────────────────────────────
            const headScripts = [...document.querySelectorAll("head script[src]:not([defer]):not([async])")];
            if (headScripts.length) addCheck("Performance", "Render-blocking scripts", "warn", `${headScripts.length} script(s) in <head> without defer/async, which blocks page rendering.`, headScripts.slice(0, 2).map(s => s.src.split("/").slice(-1)[0]).join(", "));
            else addCheck("Performance", "Render-blocking scripts", "pass", "No render-blocking scripts detected in <head>.", "");

            const imgs = [...document.querySelectorAll("img")];
            const noDims = imgs.filter(img => !img.hasAttribute("width") || !img.hasAttribute("height"));
            if (noDims.length) addCheck("Performance", "Image dimensions", "warn", `${noDims.length} image(s) missing width/height attributes, which causes layout shift (CLS).`, noDims.slice(0, 2).map(i => i.src.split("/").slice(-1)[0] || "img").join(", "));
            else if (imgs.length) addCheck("Performance", "Image dimensions", "pass", "All images have width/height attributes.", "");

            const noLazy = imgs.filter(img => !img.hasAttribute("loading") && !img.hasAttribute("data-lazy"));
            if (noLazy.length > 3) addCheck("Performance", "Lazy loading", "warn", `${noLazy.length} image(s) without loading="lazy". Add lazy loading to off-screen images.`, "");
            else if (imgs.length) addCheck("Performance", "Lazy loading", "pass", "Images use lazy loading or count is low.", "");

            const langAttr = document.documentElement.getAttribute("lang") || "";
            if (!langAttr) addCheck("Performance", "Language declaration", "warn", "Missing lang attribute on html element.", "");
            else addCheck("Performance", "Language declaration", "pass", `lang="${langAttr}" declared.`, langAttr);

            // ── Head & Mobile hygiene ────────────────────────────────────────
            const viewportMeta = document.querySelector('meta[name="viewport"]');
            if (!viewportMeta) addCheck("Mobile & Head", "Viewport meta", "fail", "No viewport meta. The page won't render properly on mobile.", "");
            else addCheck("Mobile & Head", "Viewport meta", "pass", "Viewport meta present.", viewportMeta.getAttribute("content") || "");

            const charsetEl = document.querySelector("meta[charset], meta[http-equiv='Content-Type']");
            addCheck("Mobile & Head", "Charset", charsetEl ? "pass" : "warn",
              charsetEl ? "Character encoding declared." : "No charset declaration found.",
              charsetEl?.getAttribute("charset") || "");

            const favicon = document.querySelector("link[rel~='icon'], link[rel='shortcut icon']");
            addCheck("Mobile & Head", "Favicon", favicon ? "pass" : "warn",
              favicon ? "Favicon link present." : "No favicon link found. This affects SERP display and bookmarks.", "");

            const hreflangs = document.querySelectorAll("link[rel='alternate'][hreflang]").length;
            if (hreflangs) addCheck("Indexing", "Hreflang", "pass", `${hreflangs} hreflang alternate(s) declared.`, "");

            // ── Content extras ───────────────────────────────────────────────
            const h2Count = document.querySelectorAll("h2").length;
            addCheck("Content", "H2 structure", h2Count ? "pass" : "warn",
              h2Count ? `${h2Count} H2 heading(s), good content structure.` : "No H2 headings. Break content into sections.", "");

            const allImgs = document.querySelectorAll("img");
            if (allImgs.length) {
              const withAlt = [...allImgs].filter(i => i.hasAttribute("alt") && i.alt.trim()).length;
              const pct = Math.round((withAlt / allImgs.length) * 100);
              addCheck("Content", "Image alt coverage",
                pct === 100 ? "pass" : pct >= 70 ? "warn" : "fail",
                `${withAlt} of ${allImgs.length} images have alt text.`, `${pct}%`);
            }

            // ── Links ────────────────────────────────────────────────────────
            const anchors = [...document.querySelectorAll("a[href]")];
            const internal = anchors.filter(a => { try { return new URL(a.href).hostname === location.hostname; } catch { return false; } }).length;
            addCheck("Links", "Link profile", "info", `${internal} internal, ${anchors.length - internal} external.`, `${anchors.length} links`);
            const nofollow = anchors.filter(a => (a.rel || "").includes("nofollow")).length;
            if (nofollow) addCheck("Links", "Nofollow links", "info", `${nofollow} link(s) marked nofollow.`, "");

            const urlIssues = [];
            if (location.href.length > 115) urlIssues.push("very long");
            if (/_/.test(location.pathname)) urlIssues.push("underscores in path");
            if ((location.search.match(/[&?]/g) || []).length > 3) urlIssues.push("many query parameters");
            addCheck("Indexing", "URL quality", urlIssues.length ? "warn" : "pass",
              urlIssues.length ? `URL has: ${urlIssues.join(", ")}.` : "URL is clean and readable.", `${location.href.length} chars`);

            // ── Performance extras ───────────────────────────────────────────
            const domSize = document.getElementsByTagName("*").length;
            addCheck("Performance", "DOM size", domSize > 1500 ? "warn" : "pass",
              domSize > 1500 ? `${domSize} elements. Large DOMs slow rendering (Lighthouse flags >1500).` : `${domSize} elements.`, "");

            const resources = performance.getEntriesByType("resource");
            if (resources.length) {
              const totalKb = Math.round(resources.reduce((a, r) => a + (r.transferSize || 0), 0) / 1024);
              addCheck("Performance", "Network resources", totalKb > 3000 ? "warn" : "info",
                `${resources.length} requests · ~${totalKb} KB transferred (cached excluded).`, "");
            }

            if (location.protocol === "https:") {
              const mixed = document.querySelectorAll('img[src^="http://"], script[src^="http://"], link[href^="http://"], iframe[src^="http://"]').length;
              addCheck("Indexing", "Mixed content", mixed ? "fail" : "pass",
                mixed ? `${mixed} resource(s) load over insecure HTTP on an HTTPS page.` : "No insecure HTTP resources detected.", "");
            }

            return checks;
          }
        }, (results_) => {
          btn.textContent = "↻ Re-audit";
          btn.disabled = false;

          if (chrome.runtime.lastError || !results_?.[0]?.result) {
            summaryEl.innerHTML = `<p class="field-error">Could not audit this page. Try a regular HTTP/HTTPS page.</p>`;
            resultsEl.classList.remove("hidden");
            return;
          }

          tseoChecks = results_[0].result;
          tseoFilter = "all";
          document.querySelectorAll(".tseo-filter-btn").forEach(b =>
            b.classList.toggle("active", b.dataset.filter === "all"));
          renderTseo();
          resultsEl.classList.remove("hidden");
        });
      });
    }

    document.getElementById("runTechSEO").addEventListener("click", runTechSeoScan);
    registerTabHook("technical-seo", runTechSeoScan);



  }); // ─── end lazy init: technical-seo
  registerToolInit("headings-outline", () => {
    // ─── HEADINGS OUTLINE ───────────────────────────────────────────────────────

    (function () {
      const scanBtn = document.getElementById("hoScanBtn");
      const copyBtn = document.getElementById("hoCopyBtn");
      const errEl = document.getElementById("hoError");
      let hoHeadings = [];

      function hoRender() {
        const counts = [1, 2, 3, 4, 5, 6].map(l => hoHeadings.filter(h => h.level === l).length);
        document.getElementById("hoSummary").innerHTML =
          counts.map((n, i) => n ? `<span class="ho-count"><b>H${i + 1}</b> ×${n}</span>` : "").join("") ||
          '<span class="ho-count">No headings found</span>';

        // Structure warnings
        const warnings = [];
        const h1s = counts[0];
        if (h1s === 0) warnings.push({ sev: "critical", msg: "No H1 on the page. Every page should have exactly one." });
        if (h1s > 1) warnings.push({ sev: "warn", msg: `${h1s} H1 headings. Use only one per page.` });
        let prev = 0;
        let skips = 0;
        hoHeadings.forEach(h => {
          if (prev && h.level > prev + 1) skips++;
          prev = h.level;
        });
        if (skips) warnings.push({ sev: "warn", msg: `${skips} heading level skip(s) (e.g. H2 → H4). Screen readers and crawlers rely on sequential levels.` });
        const empties = hoHeadings.filter(h => !h.text).length;
        if (empties) warnings.push({ sev: "warn", msg: `${empties} empty heading(s).` });
        const hiddens = hoHeadings.filter(h => h.hidden).length;
        if (hiddens) warnings.push({ sev: "info", msg: `${hiddens} heading(s) are visually hidden (dimmed below).` });

        const icons = { critical: SI.critical, warn: SI.warn, info: SI.info };
        document.getElementById("hoWarnings").innerHTML = warnings.map(w =>
          `<p class="robots-warning robots-warning--${w.sev}">${icons[w.sev]} ${escapeHtml(w.msg)}</p>`).join("");

        // The tree — indented by level, with skip markers
        let prevLevel = 0;
        document.getElementById("hoTree").innerHTML = hoHeadings.map((h, i) => {
          const skip = prevLevel && h.level > prevLevel + 1;
          prevLevel = h.level;
          return `
        <button class="ho-row${h.hidden ? " ho-row--hidden" : ""}" data-idx="${i}"
          style="padding-left:${(h.level - 1) * 18 + 10}px" title="Scroll to this heading on the page">
          <span class="ho-badge ho-badge--h${h.level}">H${h.level}</span>
          ${skip ? `<span class="ho-skip" title="Skipped level">⚠</span>` : ""}
          <span class="ho-text">${h.text ? escapeHtml(h.text) : '<i>(empty)</i>'}</span>
        </button>`;
        }).join("") || '<p class="tseo-empty">This page has no headings.</p>';
      }

      document.getElementById("hoTree").addEventListener("click", async (e) => {
        const row = e.target.closest(".ho-row");
        if (!row) return;
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (idx) => {
            const h = document.querySelectorAll("h1,h2,h3,h4,h5,h6")[idx];
            if (!h) return;
            h.scrollIntoView({ behavior: "smooth", block: "center" });
            const prevOutline = h.style.outline;
            h.style.outline = "3px solid #4caf50";
            h.style.outlineOffset = "2px";
            setTimeout(() => { h.style.outline = prevOutline; h.style.outlineOffset = ""; }, 1600);
          },
          args: [parseInt(row.dataset.idx, 10)],
        });
      });

      copyBtn.addEventListener("click", (e) => {
        if (!hoHeadings.length) return;
        const md = hoHeadings.map(h => `${"  ".repeat(h.level - 1)}- [H${h.level}] ${h.text || "(empty)"}`).join("\n");
        copyToClipboard(md, e.currentTarget);
      });

      function hoScan() {
        scanBtn.textContent = "Scanning…";
        scanBtn.disabled = true;
        errEl.textContent = "";

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs[0]) { scanBtn.textContent = "↻ Rescan"; scanBtn.disabled = false; return; }
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].slice(0, 300).map(h => ({
              level: +h.tagName[1],
              text: (h.textContent || "").trim().replace(/\s+/g, " ").slice(0, 140),
              hidden: !(h.offsetParent || h.getClientRects().length),
            })),
          }, (results) => {
            scanBtn.textContent = "↻ Rescan";
            scanBtn.disabled = false;
            if (chrome.runtime.lastError || !results?.[0]?.result) {
              errEl.textContent = "Could not scan this page. Try a regular HTTP/HTTPS page.";
              document.getElementById("hoResults").classList.add("hidden");
              copyBtn.disabled = true;
              return;
            }
            hoHeadings = results[0].result;
            copyBtn.disabled = !hoHeadings.length;
            document.getElementById("hoResults").classList.remove("hidden");
            hoRender();
          });
        });
      }

      scanBtn.addEventListener("click", hoScan);
      registerTabHook("headings-outline", hoScan);
    })();



  }); // ─── end lazy init: headings-outline

  registerToolInit("copy-markdown", () => {
    // ─── COPY PAGE AS MARKDOWN ──────────────────────────────────────────────────
    // Capture happens in the page context (article detection, junk removal,
    // absolute URLs); conversion to Markdown happens HERE in the popup — so
    // toggling options re-converts instantly without touching the page again.

    // Injected into the page. Fully self-contained — returns { ok, html, meta }.
    function grabPageHtml(mode) {
      try {
        const meta = {
          title: document.querySelector('meta[property="og:title"]')?.content?.trim()
            || document.title || location.hostname,
          url: location.href,
          siteName: document.querySelector('meta[property="og:site_name"]')?.content?.trim() || "",
          description: document.querySelector('meta[name="description"]')?.content?.trim() || "",
          author: document.querySelector('meta[name="author"]')?.content?.trim()
            || document.querySelector('[rel="author"]')?.textContent?.trim() || "",
          published: document.querySelector('meta[property="article:published_time"]')?.content
            || document.querySelector("time[datetime]")?.getAttribute("datetime") || "",
        };

        if (mode === "selection") {
          const sel = window.getSelection();
          if (!sel || sel.isCollapsed || !sel.rangeCount) return { ok: false, error: "NO_SELECTION" };
          const div = document.createElement("div");
          for (let i = 0; i < sel.rangeCount; i++) div.appendChild(sel.getRangeAt(i).cloneContents());
          // Property access resolves relative URLs; freeze them into attributes
          div.querySelectorAll("a[href]").forEach(a => { try { a.setAttribute("href", a.href); } catch (_) { } });
          div.querySelectorAll("img").forEach(img => { try { img.setAttribute("src", img.currentSrc || img.src || ""); } catch (_) { } });
          const h = div.innerHTML;
          return { ok: true, html: h.slice(0, 2000000), truncated: h.length > 2000000, meta };
        }

        let root = document.body;
        if (mode === "article") {
          root = document.querySelector("article")
            || document.querySelector("main, [role='main']")
            || document.querySelector(".post-content, .entry-content, .article-body, #content")
            || root;
          if (root === document.body) {
            // Fall back to the densest text block on the page
            let best = null, bestLen = 0;
            document.querySelectorAll("div, section").forEach(el => {
              let pLen = 0;
              for (const c of el.children) {
                if (/^(P|H2|H3|UL|OL|PRE|BLOCKQUOTE)$/.test(c.tagName)) pLen += c.textContent.length;
              }
              if (pLen > bestLen) { bestLen = pLen; best = el; }
            });
            if (best && bestLen > 400) root = best;
          }
        }

        // Pair originals with clones to resolve lazy-loaded images and relative
        // URLs (deep clone preserves querySelectorAll document order)
        const clone = root.cloneNode(true);
        const origEls = root.querySelectorAll("a[href], img");
        const cloneEls = clone.querySelectorAll("a[href], img");
        origEls.forEach((orig, i) => {
          const c = cloneEls[i];
          if (!c) return;
          try {
            if (orig.tagName === "A") c.setAttribute("href", orig.href);
            else c.setAttribute("src", orig.currentSrc || orig.src || "");
          } catch (_) { }
        });

        const JUNK = mode === "article"
          ? "script,style,noscript,template,iframe,canvas,svg,form,button,input,select,textarea," +
          "nav,header,footer,aside,[role='navigation'],[role='banner'],[role='contentinfo']," +
          "[role='complementary'],[role='dialog'],[role='alertdialog'],[aria-hidden='true'],[hidden]," +
          ".ad,.ads,.advertisement,[class*='cookie' i],[id*='cookie' i],.share,.social-share," +
          ".related-posts,.comments,#comments,.newsletter,.popup,.modal,.sidebar,.breadcrumb,.breadcrumbs"
          : "script,style,noscript,template,[hidden]";
        clone.querySelectorAll(JUNK).forEach(el => el.remove());

        const h = clone.innerHTML;
        return { ok: true, html: h.slice(0, 2000000), truncated: h.length > 2000000, meta };
      } catch (err) {
        return { ok: false, error: String((err && err.message) || err) };
      }
    }

    // Injected element picker (Component Extractor pattern): hover highlights,
    // click stores the element's HTML and reopens the popup, Esc cancels.
    function markdownPicker() {
      if (window.__wdtMdPickCleanup) window.__wdtMdPickCleanup();

      const box = document.createElement("div");
      box.style.cssText = "position:fixed !important;z-index:2147483647 !important;pointer-events:none !important;background:rgba(244,114,182,.16) !important;border:1.5px solid #f472b6 !important;border-radius:2px !important;display:none;";
      const tag = document.createElement("div");
      tag.style.cssText = "position:fixed !important;z-index:2147483647 !important;pointer-events:none !important;background:#f472b6 !important;color:#fff !important;font:600 11px/1.7 system-ui,sans-serif !important;padding:1px 7px !important;border-radius:3px !important;display:none;";
      document.documentElement.append(box, tag);
      let cur = null;

      const onMove = (e) => {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el || el === document.documentElement || el === document.body) {
          box.style.display = tag.style.display = "none"; cur = null; return;
        }
        cur = el;
        const r = el.getBoundingClientRect();
        box.style.display = "block";
        box.style.left = r.left + "px"; box.style.top = r.top + "px";
        box.style.width = r.width + "px"; box.style.height = r.height + "px";
        tag.style.display = "block";
        tag.textContent = el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + ": click to capture, or press Esc to cancel";
        tag.style.left = Math.max(2, r.left) + "px";
        tag.style.top = Math.max(2, r.top - 24) + "px";
      };

      const cleanup = () => {
        document.removeEventListener("mousemove", onMove, true);
        document.removeEventListener("click", onClick, true);
        document.removeEventListener("keydown", onKey, true);
        box.remove(); tag.remove();
        window.__wdtMdPickCleanup = null;
      };
      window.__wdtMdPickCleanup = cleanup;

      const onClick = (e) => {
        if (!cur) return;
        e.preventDefault(); e.stopPropagation();
        const root = cur;
        cleanup();

        const meta = {
          title: document.querySelector('meta[property="og:title"]')?.content?.trim()
            || document.title || location.hostname,
          url: location.href,
          siteName: document.querySelector('meta[property="og:site_name"]')?.content?.trim() || "",
          description: "",
          author: "",
          published: "",
        };

        const clone = root.cloneNode(true);
        const origEls = root.querySelectorAll("a[href], img");
        const cloneEls = clone.querySelectorAll("a[href], img");
        origEls.forEach((orig, i) => {
          const c = cloneEls[i];
          if (!c) return;
          try {
            if (orig.tagName === "A") c.setAttribute("href", orig.href);
            else c.setAttribute("src", orig.currentSrc || orig.src || "");
          } catch (_) { }
        });
        clone.querySelectorAll("script,style,noscript,template,[hidden]").forEach(el => el.remove());

        const h = clone.outerHTML;
        chrome.storage.local.set({
          wdt_markdown: { html: h.slice(0, 2000000), truncated: h.length > 2000000, meta, ts: Date.now() },
        }, () => {
          chrome.runtime.sendMessage({ type: "REOPEN_POPUP" });
        });
      };

      const onKey = (e) => { if (e.key === "Escape") cleanup(); };

      document.addEventListener("mousemove", onMove, true);
      document.addEventListener("click", onClick, true);
      document.addEventListener("keydown", onKey, true);
    }

    // ── Popup-side HTML → GitHub-Flavored-Markdown engine ──
    const TRACKING_PARAM = /^(utm_\w+|fbclid|gclid|gclsrc|dclid|msclkid|mc_eid|mc_cid|igshid|ref_src|s_kwcid|yclid|wt_mc|pk_\w+|piwik_\w+|_hsenc|_hsmi|vero_\w+|oly_\w+|wickedid|twclid|ttclid)$/i;

    function cmdCleanUrl(raw) {
      try {
        const u = new URL(raw);
        [...u.searchParams.keys()].forEach(k => { if (TRACKING_PARAM.test(k)) u.searchParams.delete(k); });
        return u.href;
      } catch (_) { return raw; }
    }

    const CMD_BLOCK = new Set([
      "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DD", "DETAILS", "DIV", "DL", "DT",
      "FIELDSET", "FIGCAPTION", "FIGURE", "FOOTER", "FORM", "H1", "H2", "H3", "H4", "H5", "H6",
      "HEADER", "HR", "LI", "MAIN", "NAV", "OL", "P", "PRE", "SECTION", "TABLE", "UL", "VIDEO",
    ]);

    function htmlToMarkdown(html, opts) {
      const doc = new DOMParser().parseFromString(html, "text/html");

      const escText = (s) => s.replace(/[\\`*_~[\]]/g, (m) => "\\" + m);
      const collapseWs = (s) => s.replace(/\s+/g, " ");

      function inline(node) {
        let out = "";
        node.childNodes.forEach((ch) => { out += inlineNode(ch); });
        return out;
      }

      // Bold/italic markers can't touch whitespace — shift it outside the marks
      function wrapMark(n, mark) {
        const s = inline(n);
        const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
        return m[2] ? m[1] + mark + m[2] + mark + m[3] : s;
      }

      function inlineNode(n) {
        if (n.nodeType === 3) return escText(collapseWs(n.nodeValue));
        if (n.nodeType !== 1) return "";
        const t = n.tagName;
        if (t === "BR") return "\n";
        if (t === "IMG") {
          const alt = collapseWs(n.getAttribute("alt") || "").trim();
          if (!opts.images) return alt ? escText(alt) : "";
          const src = n.getAttribute("src") || "";
          if (!src || (src.startsWith("data:") && src.length > 1500)) return "";
          if (n.getAttribute("width") === "1" || n.getAttribute("height") === "1") return "";
          return `![${alt}](${src})`;
        }
        if (t === "A") {
          const text = inline(n).trim() || collapseWs(n.getAttribute("title") || "").trim();
          let href = (n.getAttribute("href") || "").trim();
          if (!opts.links || !href || href.startsWith("#") || href.toLowerCase().startsWith("javascript:")) return text;
          if (opts.cleanUrls) href = cmdCleanUrl(href);
          return text ? `[${text}](${href})` : "";
        }
        if (t === "STRONG" || t === "B") return wrapMark(n, "**");
        if (t === "EM" || t === "I") return wrapMark(n, "*");
        if (t === "DEL" || t === "S" || t === "STRIKE") return wrapMark(n, "~~");
        if (t === "CODE" || t === "KBD" || t === "SAMP") {
          const raw = collapseWs(n.textContent).trim();
          if (!raw) return "";
          return raw.includes("`") ? "`` " + raw + " ``" : "`" + raw + "`";
        }
        if (CMD_BLOCK.has(t)) return "\n" + blockToMd(n) + "\n";
        return inline(n); // span, u, mark, sub, sup, time, abbr, q, …
      }

      function blockToMd(n) {
        const t = n.tagName;
        if (/^H[1-6]$/.test(t)) {
          const txt = inline(n).trim().replace(/\n+/g, " ");
          return txt ? "#".repeat(+t[1]) + " " + txt : "";
        }
        if (t === "P") return inline(n).trim();
        if (t === "HR") return "---";
        if (t === "PRE") {
          const codeEl = n.querySelector("code");
          const cls = (codeEl?.className || n.className || "") + "";
          const lang = (cls.match(/(?:language-|lang-)([\w#+-]+)/) || [])[1] || "";
          const code = ((codeEl || n).textContent || "").replace(/\n$/, "");
          const fence = code.includes("```") ? "````" : "```";
          return fence + lang + "\n" + code + "\n" + fence;
        }
        if (t === "BLOCKQUOTE") {
          const innerMd = serializeChildren(n);
          return innerMd.split("\n").map((l) => ("> " + l).trimEnd()).join("\n");
        }
        if (t === "UL" || t === "OL") return listToMd(n, 0);
        if (t === "TABLE") return tableToMd(n);
        if (t === "FIGURE") {
          const parts = [];
          const img = n.querySelector("img");
          const cap = n.querySelector("figcaption");
          if (img) { const md = inlineNode(img); if (md) parts.push(md); }
          if (cap) { const c = inline(cap).trim(); if (c) parts.push("*" + c + "*"); }
          return parts.join("\n");
        }
        if (t === "DL") {
          const lines = [];
          [...n.children].forEach((ch) => {
            if (ch.tagName === "DT") lines.push("**" + inline(ch).trim() + "**");
            else if (ch.tagName === "DD") lines.push(": " + inline(ch).trim());
          });
          return lines.join("\n");
        }
        return serializeChildren(n); // generic containers: div, section, article…
      }

      // Walk children: inline runs become paragraphs, blocks render themselves
      function serializeChildren(container) {
        const parts = [];
        let buf = "";
        const flush = () => {
          const s = buf.replace(/[ \t]*\n[ \t]*/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
          if (s) parts.push(s);
          buf = "";
        };
        container.childNodes.forEach((ch) => {
          if (ch.nodeType === 1 && CMD_BLOCK.has(ch.tagName)) {
            flush();
            const md = blockToMd(ch);
            if (md) parts.push(md);
          } else {
            buf += inlineNode(ch);
          }
        });
        flush();
        return parts.join("\n\n");
      }

      function listToMd(listEl, depth) {
        const ordered = listEl.tagName === "OL";
        let idx = parseInt(listEl.getAttribute("start") || "1", 10) || 1;
        const pad = "  ".repeat(depth);
        const lines = [];
        [...listEl.children].forEach((li) => {
          if (li.tagName !== "LI") return;
          let marker = ordered ? `${idx++}.` : "-";
          const cb = li.querySelector(":scope > input[type=checkbox], :scope > label > input[type=checkbox], :scope > p > input[type=checkbox]");
          if (cb) marker += cb.checked ? " [x]" : " [ ]";
          let own = "";
          const nested = [];
          li.childNodes.forEach((ch) => {
            if (ch.nodeType === 1 && (ch.tagName === "UL" || ch.tagName === "OL")) nested.push(ch);
            else if (ch.nodeType === 1 && ch.tagName === "INPUT") { /* checkbox handled above */ }
            else if (ch.nodeType === 1 && CMD_BLOCK.has(ch.tagName)) own += (own ? " " : "") + blockToMd(ch).replace(/\n+/g, " ");
            else own += inlineNode(ch);
          });
          own = own.replace(/\s+/g, " ").trim();
          lines.push(`${pad}${marker} ${own}`.trimEnd());
          nested.forEach((nl) => lines.push(listToMd(nl, depth + 1)));
        });
        return lines.join("\n");
      }

      function tableToMd(tbl) {
        const rows = [...tbl.querySelectorAll(":scope > thead > tr, :scope > tbody > tr, :scope > tfoot > tr, :scope > tr")];
        if (!rows.length) return "";
        const cellMd = (c) => inline(c).replace(/\n+/g, " ").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
        const grid = rows.map((r) => [...r.children].filter((c) => c.tagName === "TD" || c.tagName === "TH").map(cellMd));
        const width = Math.max(...grid.map((r) => r.length));
        if (!width || width < 1) return "";
        grid.forEach((r) => { while (r.length < width) r.push(""); });
        const head = grid.shift();
        const out = ["| " + head.join(" | ") + " |", "|" + " --- |".repeat(width)];
        grid.forEach((r) => out.push("| " + r.join(" | ") + " |"));
        return out.join("\n");
      }

      return serializeChildren(doc.body).replace(/\n{3,}/g, "\n\n").trim();
    }

    // ── Popup wiring ──
    const cmdOutput = document.getElementById("cmdOutput");
    const cmdStats = document.getElementById("cmdStats");
    const cmdError = document.getElementById("cmdError");
    const cmdModeBtns = document.querySelectorAll("#copy-markdown .cmd-mode-btn");
    let lastCapture = null;

    const setActiveMode = (mode) =>
      cmdModeBtns.forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));

    const showCmdError = (msg) => { cmdError.textContent = msg; };
    const clearCmdError = () => { cmdError.textContent = ""; };

    function updateCmdStats() {
      const v = cmdOutput.value;
      cmdStats.textContent = v
        ? `· ${(v.match(/\S+/g) || []).length.toLocaleString()} words · ${v.length.toLocaleString()} chars · ~${Math.round(v.length / 4).toLocaleString()} tokens`
        : "";
    }

    function buildOutput() {
      if (!lastCapture) return;
      const opts = {
        images: document.getElementById("cmdImages").checked,
        links: document.getElementById("cmdLinks").checked,
        cleanUrls: document.getElementById("cmdCleanUrls").checked,
      };
      let md = htmlToMarkdown(lastCapture.html, opts);
      const m = lastCapture.meta || {};

      if (document.getElementById("cmdMeta").checked) {
        const title = (m.title || "").trim();
        // Skip the H1 if the captured content already starts with the same title
        const firstLine = (md.split("\n").find((l) => l.trim()) || "").replace(/^#+\s*/, "").replace(/\\/g, "").trim();
        const head = [];
        if (title && firstLine.toLowerCase() !== title.toLowerCase()) head.push("# " + title, "");
        if (m.url) head.push("> Source: " + (opts.cleanUrls ? cmdCleanUrl(m.url) : m.url));
        const byline = [
          m.siteName,
          m.author && "By " + m.author,
          m.published && "Published " + String(m.published).slice(0, 10),
        ].filter(Boolean).join(" · ");
        if (byline) head.push("> " + byline);
        if (head.length) head.push("", "---", "");
        md = head.join("\n") + md;
      }
      if (lastCapture.truncated) md += "\n\n<!-- Note: content truncated: the page exceeded the 2 MB capture limit -->";

      cmdOutput.value = md;
      updateCmdStats();
    }

    const CMD_RESTRICTED = /^(chrome|chrome-extension|edge|devtools|about|view-source):/;

    function cmdCapture(mode) {
      setActiveMode(mode);
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id || CMD_RESTRICTED.test(tab.url || "")) {
          showCmdError("This page can't be captured. Open a regular website tab.");
          return;
        }
        chrome.scripting.executeScript(
          { target: { tabId: tab.id }, func: grabPageHtml, args: [mode] },
          (results) => {
            if (chrome.runtime.lastError) {
              showCmdError("Could not access this page: " + chrome.runtime.lastError.message);
              return;
            }
            const res = results?.[0]?.result;
            if (!res?.ok) {
              showCmdError(res?.error === "NO_SELECTION"
                ? "Nothing is selected on the page. Highlight some text first, then click Selection."
                : "Capture failed: " + (res?.error || "unknown error"));
              return;
            }
            clearCmdError();
            lastCapture = { html: res.html, meta: res.meta, truncated: res.truncated };
            buildOutput();
          }
        );
      });
    }

    function cmdStartPick() {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id || CMD_RESTRICTED.test(tab.url || "")) {
          showCmdError("This page can't be captured. Open a regular website tab.");
          return;
        }
        chrome.scripting.executeScript({ target: { tabId: tab.id }, func: markdownPicker }, () => {
          if (chrome.runtime.lastError) {
            showCmdError("Could not access this page: " + chrome.runtime.lastError.message);
          } else {
            window.close();
          }
        });
      });
    }

    cmdModeBtns.forEach((btn) => btn.addEventListener("click", () => {
      if (btn.dataset.mode === "pick") { setActiveMode("pick"); cmdStartPick(); }
      else cmdCapture(btn.dataset.mode);
    }));

    ["cmdMeta", "cmdLinks", "cmdImages", "cmdCleanUrls"].forEach((id) =>
      document.getElementById(id).addEventListener("change", buildOutput));

    cmdOutput.addEventListener("input", updateCmdStats);

    document.getElementById("cmdCopy").addEventListener("click", (e) => {
      if (!cmdOutput.value.trim()) { showToast("Nothing to copy yet", "error"); return; }
      copyToClipboard(cmdOutput.value, e.currentTarget);
    });

    function cmdDownload(ext, mime) {
      const v = cmdOutput.value;
      if (!v.trim()) { showToast("Nothing to download yet", "error"); return; }
      const slug = (lastCapture?.meta?.title || "page").toLowerCase()
        .replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "page";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([v], { type: mime }));
      a.download = slug + "." + ext;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      showToast("Downloaded " + a.download);
    }

    document.getElementById("cmdDownloadMd").addEventListener("click", () => cmdDownload("md", "text/markdown"));
    document.getElementById("cmdDownloadTxt").addEventListener("click", () => cmdDownload("txt", "text/plain"));

    // Consume a pending Pick Element result, then enable auto-capture: the hook
    // registers here (not earlier) so a fresh pick can't be clobbered by the
    // auto Article scan racing it.
    chrome.storage.local.get(["wdt_markdown"], (d) => {
      const p = d.wdt_markdown;
      if (p?.html && Date.now() - (p.ts || 0) < 60000) {
        lastCapture = { html: p.html, meta: p.meta || {}, truncated: p.truncated };
        setActiveMode("pick");
        buildOutput();
        clearCmdError();
        showToast("Element captured");
      }
      chrome.storage.local.remove("wdt_markdown");
      registerTabHook("copy-markdown", () => { if (!lastCapture) cmdCapture("article"); });
    });

  }); // ─── end lazy init: copy-markdown

  registerToolInit("ai-readiness", () => {
    // ─── AI READINESS AUDIT (GEO/AEO) ───────────────────────────────────────────
    // How visible and quotable is this page for AI search engines & assistants?
    // Page facts come from an injected scan; robots.txt, llms.txt and the raw
    // HTML (JS-rendering check) are fetched through the background worker.

    // Injected into the page — fully self-contained, returns page facts only.
    function airPageScan() {
      try {
        const q = (s) => document.querySelector(s);
        const txt = (el) => (el?.textContent || "").trim();

        // Structured data: collect every @type in JSON-LD (incl. @graph)
        const ldTypes = [];
        let ldAuthor = false, ldDates = false;
        document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
          try {
            const collect = (node) => {
              if (!node || typeof node !== "object") return;
              if (Array.isArray(node)) { node.forEach(collect); return; }
              const t = node["@type"];
              if (t) (Array.isArray(t) ? t : [t]).forEach((v) => { if (typeof v === "string") ldTypes.push(v); });
              if (node.author) ldAuthor = true;
              if (node.datePublished || node.dateModified) ldDates = true;
              if (node["@graph"]) collect(node["@graph"]);
              if (node.mainEntity) collect(node.mainEntity);
            };
            collect(JSON.parse(s.textContent));
          } catch (_) { }
        });

        const hs = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")];
        const QUESTION_RE = /^(how|what|why|when|where|which|who|can|does|do|is|are|should)\b|\?\s*$/i;
        const questionHeadings = hs.filter((h) => /^H[23]$/.test(h.tagName) && QUESTION_RE.test(txt(h))).length;

        const root = q("article") || q("main, [role='main']") || document.body;
        const wordCount = (document.body.innerText || "").trim().split(/\s+/).filter(Boolean).length;

        let firstParaWords = 0;
        for (const p of root.querySelectorAll("p")) {
          const w = txt(p).split(/\s+/).filter(Boolean).length;
          if (w >= 5) { firstParaWords = w; break; }
        }
        const paras = [...root.querySelectorAll("p")]
          .map((p) => txt(p).split(/\s+/).filter(Boolean).length)
          .filter((w) => w > 0);
        const longParas = paras.filter((w) => w > 120).length;

        const imgs = [...document.querySelectorAll("img")].filter((i) => (i.width || 0) > 32 && (i.height || 0) > 32);

        return {
          ok: true,
          url: location.href,
          origin: location.origin,
          title: document.title || "",
          metaDesc: q('meta[name="description"]')?.content?.trim() || "",
          canonical: q('link[rel="canonical"]')?.getAttribute("href") || "",
          ogTitle: !!q('meta[property="og:title"]'),
          ogDesc: !!q('meta[property="og:description"]'),
          author: q('meta[name="author"]')?.content?.trim() || txt(q('[rel="author"]')) || "",
          published: q('meta[property="article:published_time"]')?.content
            || q("time[datetime]")?.getAttribute("datetime") || "",
          modified: q('meta[property="article:modified_time"]')?.content || "",
          lang: document.documentElement.getAttribute("lang") || "",
          hasArticle: !!q("article"),
          hasMain: !!(q("main") || q("[role='main']")),
          ldTypes: [...new Set(ldTypes)].slice(0, 12),
          ldAuthor, ldDates,
          h1Count: document.querySelectorAll("h1").length,
          headingCount: hs.length,
          questionHeadings,
          wordCount, firstParaWords, longParas, paraCount: paras.length,
          lists: root.querySelectorAll("ul, ol").length,
          tables: root.querySelectorAll("table").length,
          imgCount: imgs.length,
          imgsNoAlt: imgs.filter((i) => !(i.getAttribute("alt") || "").trim()).length,
          robotsMeta: (q('meta[name="robots"]')?.content || "").toLowerCase(),
          nosnippetEls: document.querySelectorAll("[data-nosnippet]").length,
        };
      } catch (err) {
        return { ok: false, error: String((err && err.message) || err) };
      }
    }

    // ── AI crawler taxonomy ──
    const AIR_SEARCH_BOTS = [
      ["OAI-SearchBot", "ChatGPT search results"],
      ["ChatGPT-User", "ChatGPT live browsing"],
      ["PerplexityBot", "Perplexity search index"],
      ["Perplexity-User", "Perplexity live browsing"],
      ["Claude-SearchBot", "Claude search results"],
      ["Claude-User", "Claude live browsing"],
    ];
    const AIR_TRAINING_BOTS = [
      ["GPTBot", "OpenAI model training"],
      ["ClaudeBot", "Anthropic model training"],
      ["Google-Extended", "Gemini training & grounding"],
      ["CCBot", "Common Crawl (feeds many models)"],
      ["Meta-ExternalAgent", "Meta AI training"],
      ["Applebot-Extended", "Apple Intelligence training"],
      ["Bytespider", "ByteDance training"],
      ["Amazonbot", "Amazon / Alexa"],
    ];

    // Minimal robots.txt evaluation: per user-agent group, is the whole site
    // disallowed? (Disallow: / with no Allow: / override.)
    function airParseRobots(body) {
      const groups = {};
      let agents = [];
      let inRules = false;
      String(body).split(/\r?\n/).forEach((raw) => {
        const line = raw.replace(/#.*$/, "").trim();
        if (!line) return;
        const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
        if (!m) return;
        const key = m[1].toLowerCase(), val = m[2].trim();
        if (key === "user-agent") {
          if (inRules) { agents = []; inRules = false; }
          const ua = val.toLowerCase();
          groups[ua] = groups[ua] || { all: false, some: false, allowRoot: false };
          agents.push(ua);
        } else {
          inRules = true;
          if (key === "disallow") {
            agents.forEach((ua) => {
              if (val === "/") groups[ua].all = true;
              else if (val) groups[ua].some = true;
            });
          } else if (key === "allow" && val === "/") {
            agents.forEach((ua) => { groups[ua].allowRoot = true; });
          }
        }
      });
      return groups;
    }

    function airBotStatus(groups, bot) {
      const g = groups[bot.toLowerCase()] || groups["*"];
      if (!g) return "allowed";
      if (g.all && !g.allowRoot) return "blocked";
      if (g.some || (g.all && g.allowRoot)) return "partial";
      return "allowed";
    }

    // Visible-text word count of a raw (un-executed) HTML string
    function airRawWordCount(html) {
      const stripped = String(html)
        .replace(/<script[\s\S]*?<\/script\s*>/gi, " ")
        .replace(/<style[\s\S]*?<\/style\s*>/gi, " ")
        .replace(/<noscript[\s\S]*?<\/noscript\s*>/gi, " ")
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&[a-zA-Z#0-9]+;/g, " ");
      return stripped.trim().split(/\s+/).filter(Boolean).length;
    }

    // ── Compose the audit ──
    function buildAirChecks(page, robotsRes, llmsRes, rawRes) {
      const checks = [];
      const add = (section, label, status, detail, value = "") =>
        checks.push({ section, label, status, detail, value });

      // AI Crawler Access
      if (!robotsRes?.ok || robotsRes.status >= 400) {
        add("AI Crawler Access", "robots.txt", "info",
          "No robots.txt found. Every AI crawler is allowed by default.", "");
      } else {
        const groups = airParseRobots(robotsRes.body || "");
        const searchBlocked = AIR_SEARCH_BOTS.filter(([b]) => airBotStatus(groups, b) === "blocked");
        const trainBlocked = AIR_TRAINING_BOTS.filter(([b]) => airBotStatus(groups, b) === "blocked");

        if (searchBlocked.length) {
          add("AI Crawler Access", "AI search crawlers blocked", "fail",
            "These bots fetch pages to answer questions and cite sources, so blocking them removes this site from AI search results (ChatGPT search, Perplexity, Claude).",
            searchBlocked.map(([b]) => b).join(", "));
        } else {
          add("AI Crawler Access", "AI search crawlers allowed", "pass",
            "OAI-SearchBot, PerplexityBot and the live-browsing agents can all reach this page, so it can be found and cited in AI answers.", "");
        }

        if (trainBlocked.length === AIR_TRAINING_BOTS.length) {
          add("AI Crawler Access", "All training crawlers blocked", "info",
            "A valid policy choice, but future models won't learn your content or brand. Make sure the AI *search* bots above stay allowed.", "");
        } else if (trainBlocked.length) {
          add("AI Crawler Access", "Training crawlers partially blocked", "info",
            "Blocked: " + trainBlocked.map(([b]) => b).join(", ") + ". The rest may use your content for model training.", `${trainBlocked.length} of ${AIR_TRAINING_BOTS.length}`);
        } else {
          add("AI Crawler Access", "Training crawlers allowed", "info",
            "GPTBot, ClaudeBot, CCBot and the other training crawlers may use this content. Block them in robots.txt if that's not wanted. It won't affect AI search visibility.", "");
        }
      }

      if (/\bnoindex\b/.test(page.robotsMeta)) {
        add("AI Crawler Access", "noindex", "fail",
          "This page is excluded from search indexes, and from every AI answer engine built on top of them.", page.robotsMeta);
      }
      if (/\bnosnippet\b/.test(page.robotsMeta) || /max-snippet\s*:\s*0/.test(page.robotsMeta)) {
        add("AI Crawler Access", "Snippets disabled", "fail",
          "nosnippet / max-snippet:0 stops search and AI engines from quoting this page, so it can't appear inside answers.", page.robotsMeta);
      }
      if (page.nosnippetEls) {
        add("AI Crawler Access", "data-nosnippet regions", "info",
          `${page.nosnippetEls} element(s) are excluded from snippets and AI quoting. Fine if intentional.`, "");
      }

      // llms.txt
      if (llmsRes?.ok && llmsRes.status === 200 && /^\s*#/.test(llmsRes.body || "")) {
        add("llms.txt", "llms.txt found", "pass",
          "This origin publishes an llms.txt content map for AI assistants. You're ahead of the curve.", page.origin + "/llms.txt");
      } else {
        add("llms.txt", "No llms.txt", "warn",
          "llms.txt is an emerging standard: a curated Markdown map of your most important pages for AI assistants. Quick to add at " + page.origin + "/llms.txt.", "");
      }

      // Machine Readability
      if (rawRes?.ok && rawRes.body) {
        const rawWords = airRawWordCount(rawRes.body);
        const ratio = page.wordCount ? rawWords / page.wordCount : 1;
        if (page.wordCount > 100 && ratio < 0.35) {
          add("Machine Readability", "Content requires JavaScript", "fail",
            `Only ~${Math.round(ratio * 100)}% of the visible text exists in the raw HTML. Most AI crawlers don't execute JavaScript, so they see a nearly empty page. Use SSR or prerendering.`,
            `${rawWords} vs ${page.wordCount} words`);
        } else if (page.wordCount > 100 && ratio < 0.7) {
          add("Machine Readability", "Partially JavaScript-rendered", "warn",
            `~${Math.round(ratio * 100)}% of the visible text is in the raw HTML; the rest needs JavaScript that many AI crawlers won't run.`,
            `${rawWords} vs ${page.wordCount} words`);
        } else {
          add("Machine Readability", "Server-rendered content", "pass",
            "The text is present in the raw HTML, so even non-JS crawlers get the full content.", "");
        }
      } else {
        add("Machine Readability", "Raw HTML check skipped", "info",
          "Couldn't re-fetch this page to compare raw vs rendered content.", "");
      }

      if (page.hasArticle || page.hasMain) {
        add("Machine Readability", "Semantic landmarks", "pass",
          `${[page.hasArticle && "<article>", page.hasMain && "<main>"].filter(Boolean).join(" and ")} help extractors find the main content.`, "");
      } else {
        add("Machine Readability", "No semantic landmarks", "warn",
          "Without <article>/<main>, AI extractors must guess where the content is, and often grab nav or boilerplate instead.", "");
      }

      if (page.lang) add("Machine Readability", "Language declared", "pass", "html lang helps engines serve the right language audience.", page.lang);
      else add("Machine Readability", "Missing lang attribute", "warn", "Declare the page language on the html element.", "");

      if (page.imgCount) {
        if (page.imgsNoAlt) add("Machine Readability", "Images missing alt text", "warn",
          `${page.imgsNoAlt} of ${page.imgCount} content image(s) have no alt text, so they're invisible to text-based AI crawlers.`, "");
        else add("Machine Readability", "Image alt text", "pass", `All ${page.imgCount} content image(s) are described.`, "");
      }

      // Answer-Friendly Structure
      if (page.h1Count === 1) add("Answer Structure", "Single clear H1", "pass", "One main topic per page is exactly what answer engines want.", "");
      else if (page.h1Count === 0) add("Answer Structure", "No H1", "fail", "Without an H1 the page topic is ambiguous to extractors.", "");
      else add("Answer Structure", "Multiple H1s", "warn", `${page.h1Count} H1 tags dilute the page's main topic.`, "");

      if (page.questionHeadings >= 2) {
        add("Answer Structure", "Question-style headings", "pass",
          `${page.questionHeadings} heading(s) phrased as questions, the exact format answer engines look for.`, "");
      } else {
        add("Answer Structure", "Few question headings", "info",
          'Headings phrased as questions ("How do I…", "What is…") map directly onto what people ask AI assistants.', `${page.questionHeadings} found`);
      }

      if (page.firstParaWords >= 10 && page.firstParaWords <= 90) {
        add("Answer Structure", "Concise opening answer", "pass",
          `The content opens with a ${page.firstParaWords}-word paragraph, quotable as a direct answer.`, "");
      } else if (page.firstParaWords > 150) {
        add("Answer Structure", "Long opening paragraph", "info",
          `The first paragraph is ${page.firstParaWords} words. Answer engines favor a short, self-contained summary up top.`, "");
      }

      if (page.lists || page.tables) {
        add("Answer Structure", "Structured facts", "pass",
          `${page.lists} list(s) and ${page.tables} table(s). Structured data is easiest for engines to lift into answers.`, "");
      } else if (page.wordCount > 300) {
        add("Answer Structure", "No lists or tables", "info",
          "Key facts in lists or tables are far more likely to be quoted by AI engines than prose.", "");
      }

      if (page.wordCount < 150) add("Answer Structure", "Thin content", "warn", `Only ${page.wordCount} words, too little substance to be cited as a source.`, "");
      if (page.paraCount >= 5 && page.longParas / page.paraCount > 0.3) {
        add("Answer Structure", "Walls of text", "info",
          `${page.longParas} paragraph(s) exceed 120 words. Shorter paragraphs are easier to extract and quote.`, "");
      }

      // Structured Data
      if (page.ldTypes.length) {
        add("Structured Data", "JSON-LD present", "pass", "Machine-readable context that AI engines use to understand and trust the page.", page.ldTypes.join(", "));
      } else {
        add("Structured Data", "No JSON-LD", "warn",
          "Schema markup (Article, FAQPage, Product…) gives engines machine-readable context. Generate it with the Schema Generator tool.", "");
      }
      const hasFaq = page.ldTypes.some((t) => /^(FAQPage|QAPage|Question)$/i.test(t));
      if (hasFaq) add("Structured Data", "FAQ/Q&A schema", "pass", "Q&A markup is the highest-yield format for answer engines.", "");
      const hasArticleLd = page.ldTypes.some((t) => /(Article|BlogPosting)$/i.test(t));
      if (hasArticleLd && !(page.ldAuthor && page.ldDates)) {
        add("Structured Data", "Article schema incomplete", "info",
          `Add ${[!page.ldAuthor && "author", !page.ldDates && "datePublished/dateModified"].filter(Boolean).join(" and ")} to the Article markup for stronger citation signals.`, "");
      }

      // Citation & Freshness
      if (page.title) add("Citation Signals", "Title", "pass", "", page.title.length > 70 ? page.title.slice(0, 70) + "…" : page.title);
      else add("Citation Signals", "Missing title", "fail", "No title tag. This is the single strongest topical signal.", "");
      if (page.metaDesc) add("Citation Signals", "Meta description", "pass", "", page.metaDesc.slice(0, 80) + (page.metaDesc.length > 80 ? "…" : ""));
      else add("Citation Signals", "Missing meta description", "warn", "Engines fall back to arbitrary page text when summarizing this page.", "");
      if (page.canonical) add("Citation Signals", "Canonical URL", "pass", "Tells engines which URL to credit and cite.", "");
      else add("Citation Signals", "No canonical URL", "warn", "Without a canonical, citations may split across duplicate URLs.", "");
      if (page.ogTitle && page.ogDesc) add("Citation Signals", "Open Graph tags", "pass", "Used when AI answers render link previews.", "");
      else add("Citation Signals", "Open Graph incomplete", "info", "og:title and og:description improve how citations of this page are displayed.", "");
      if (page.author || page.ldAuthor) add("Citation Signals", "Author attribution", "pass", "Named authorship is a trust signal for engines choosing sources.", page.author || "via schema");
      else add("Citation Signals", "No author attribution", "info", "Add a visible author or schema author. Engines prefer attributable sources.", "");
      if (page.published || page.modified || page.ldDates) {
        add("Citation Signals", "Publish/update dates", "pass", "Freshness is a major ranking factor in AI answer selection.",
          String(page.modified || page.published || "via schema").slice(0, 10));
      } else {
        add("Citation Signals", "No dates found", "warn", "AI engines strongly favor content with visible publish or update dates.", "");
      }

      return checks;
    }

    // ── Render (Technical SEO visual language) ──
    let airChecks = [];
    let airFilter = "all";
    const airSafeStatus = (s) => (["pass", "warn", "fail", "info"].includes(s) ? s : "info");

    function renderAir() {
      const summaryEl = document.getElementById("airSummary");
      const listEl = document.getElementById("airList");
      const passes = airChecks.filter((c) => c.status === "pass").length;
      const warns = airChecks.filter((c) => c.status === "warn").length;
      const fails = airChecks.filter((c) => c.status === "fail").length;
      const scored = passes + warns + fails;
      const score = scored ? Math.round(((passes + warns * 0.5) / scored) * 100) : 0;
      const scoreCol = score >= 80 ? "var(--success)" : score >= 50 ? "var(--warning)" : "var(--danger)";

      summaryEl.innerHTML = `
      <div class="tseo-hero">
        <div class="tseo-ring" style="background: conic-gradient(${scoreCol} ${score * 3.6}deg, var(--bg-elevated) 0)">
          <div class="tseo-ring-inner"><span class="tseo-ring-num">${score}</span><span class="tseo-ring-lbl">AI ready</span></div>
        </div>
        <div class="tseo-stats">
          <span class="tseo-badge tseo-badge--pass">${SI.pass} ${passes} passed</span>
          <span class="tseo-badge tseo-badge--warn">${SI.warn} ${warns} warnings</span>
          <span class="tseo-badge tseo-badge--fail">${SI.fail} ${fails} failed</span>
        </div>
      </div>`;

      const visible = airChecks.filter((c) => airFilter === "all" || airSafeStatus(c.status) === airFilter);
      const sections = [...new Set(visible.map((c) => c.section))];
      listEl.innerHTML = sections.map((sec) => {
        const items = visible.filter((c) => c.section === sec);
        return `
        <div class="tseo-section-label">${escapeHtml(sec)} <span class="tseo-section-count">${items.length}</span></div>
        ${items.map((c) => `
          <div class="tseo-item tseo-item--${airSafeStatus(c.status)}">
            <span class="tseo-icon">${SI[c.status] || SI.info}</span>
            <div class="tseo-content">
              <div class="tseo-label">${escapeHtml(c.label)}${c.value ? ` <span class="tseo-val">${escapeHtml(c.value)}</span>` : ""}</div>
              ${c.detail ? `<div class="tseo-detail">${escapeHtml(c.detail)}</div>` : ""}
            </div>
          </div>`).join("")}`;
      }).join("") || `<p class="tseo-empty">No checks match this filter.</p>`;
    }

    document.querySelectorAll(".air-filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".air-filter-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        airFilter = btn.dataset.filter;
        renderAir();
      });
    });

    document.getElementById("airCopyReport").addEventListener("click", (e) => {
      if (!airChecks.length) return;
      const mark = { pass: "[PASS]", warn: "[WARN]", fail: "[FAIL]", info: "[INFO]" };
      const md = ["# AI Readiness Audit (GEO/AEO)", ""];
      [...new Set(airChecks.map((c) => c.section))].forEach((sec) => {
        md.push(`## ${sec}`);
        airChecks.filter((c) => c.section === sec).forEach((c) => {
          md.push(`- ${mark[c.status] || "[INFO]"} **${c.label}**${c.value ? ` (${c.value})` : ""}${c.detail ? `: ${c.detail}` : ""}`);
        });
        md.push("");
      });
      copyToClipboard(md.join("\n"), e.currentTarget);
    });

    // ── Run ──
    const AIR_RESTRICTED = /^(chrome|chrome-extension|edge|devtools|about|view-source):/;
    const airBgFetch = (url) => new Promise((resolve) =>
      chrome.runtime.sendMessage({ type: "API_REQUEST", url, method: "GET" }, (res) => resolve(res || { ok: false })));
    let airRunning = false;

    function runAirAudit() {
      if (airRunning) return;
      const btn = document.getElementById("runAirAudit");
      const resultsEl = document.getElementById("airResults");
      const errEl = document.getElementById("airError");

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id || AIR_RESTRICTED.test(tab.url || "")) {
          errEl.textContent = "This page can't be audited. Open a regular website tab.";
          resultsEl.classList.add("hidden");
          return;
        }
        errEl.textContent = "";
        airRunning = true;
        btn.textContent = "Auditing…";
        btn.disabled = true;

        chrome.scripting.executeScript(
          { target: { tabId: tab.id }, func: airPageScan },
          async (results) => {
            const reset = () => {
              airRunning = false;
              btn.textContent = "↻ Re-audit";
              btn.disabled = false;
            };
            if (chrome.runtime.lastError) { reset(); errEl.textContent = "Could not access this page: " + chrome.runtime.lastError.message; return; }
            const page = results?.[0]?.result;
            if (!page?.ok) { reset(); errEl.textContent = "Scan failed: " + (page?.error || "unknown error"); return; }

            const [robotsRes, llmsRes, rawRes] = await Promise.all([
              airBgFetch(page.origin + "/robots.txt"),
              airBgFetch(page.origin + "/llms.txt"),
              airBgFetch(page.url),
            ]);
            reset();
            airChecks = buildAirChecks(page, robotsRes, llmsRes, rawRes);
            airFilter = "all";
            document.querySelectorAll(".air-filter-btn").forEach((b) =>
              b.classList.toggle("active", b.dataset.filter === "all"));
            renderAir();
            resultsEl.classList.remove("hidden");
          }
        );
      });
    }

    document.getElementById("runAirAudit").addEventListener("click", runAirAudit);
    registerTabHook("ai-readiness", runAirAudit);

  }); // ─── end lazy init: ai-readiness

  registerToolInit("llms-txt", () => {
    // ─── llms.txt GENERATOR + VIEWER ────────────────────────────────────────────
    // View: fetch /llms.txt for the active site, parse + validate + pretty-render.
    // Generate: build a spec-compliant file (title, summary, sections of links),
    // with one-click import from the current page or its sitemap.xml.

    const LLMS_RESTRICTED = /^(chrome|chrome-extension|edge|devtools|about|view-source):/;
    const llmsBgFetch = (url) => new Promise((resolve) =>
      chrome.runtime.sendMessage({ type: "API_REQUEST", url, method: "GET" }, (res) => resolve(res || { ok: false })));

    // ── Shared parser ──
    function llmsParseLink(s) {
      const m = s.match(/^\[([^\]]*)\]\(([^)\s]+)\)\s*:?\s*(.*)$/);
      if (m) return { title: m[1].trim(), url: m[2].trim(), desc: m[3].trim() };
      return { title: s.trim(), url: "", desc: "" };
    }
    function llmsParse(text) {
      const lines = String(text).split(/\r?\n/);
      let title = "", summary = [], details = [], sections = [], cur = null;
      for (const line of lines) {
        const h1 = line.match(/^#\s+(.+)/);
        const h2 = line.match(/^##\s+(.+)/);
        const bq = line.match(/^>\s?(.*)/);
        const li = line.match(/^[-*]\s+(.+)/);
        if (h1 && !title) { title = h1[1].trim(); continue; }
        if (h2) { cur = { name: h2[1].trim(), links: [] }; sections.push(cur); continue; }
        if (bq) { if (!cur) summary.push(bq[1]); continue; }
        if (li) { const lk = llmsParseLink(li[1]); (cur ? cur.links : details).push(cur ? lk : line); continue; }
        if (line.trim() && !cur) details.push(line);
      }
      return { title, summary: summary.join(" ").trim(), details: details.join("\n").trim(), sections };
    }

    // ════════════ VIEW MODE ════════════
    const llmsViewResult = document.getElementById("llmsViewResult");
    const llmsViewError = document.getElementById("llmsViewError");
    let llmsRunning = false;
    let llmsLastRaw = "";

    function llmsRenderView(parsed, raw, origin, hasFull) {
      const checks = [];
      checks.push(parsed.title ? { ok: "pass", t: "Has a title (H1)" } : { ok: "fail", t: "Missing the title (H1), which is required" });
      checks.push(parsed.summary ? { ok: "pass", t: "Has a summary blockquote" } : { ok: "warn", t: "No summary blockquote (recommended)" });
      const linkCount = parsed.sections.reduce((n, s) => n + s.links.filter((l) => l.url).length, 0);
      checks.push(parsed.sections.length ? { ok: "pass", t: `${parsed.sections.length} section(s), ${linkCount} link(s)` } : { ok: "warn", t: "No link sections found" });
      const empties = parsed.sections.filter((s) => !s.links.some((l) => l.url)).length;
      if (empties) checks.push({ ok: "warn", t: `${empties} section(s) have no links` });
      if (hasFull) checks.push({ ok: "info", t: "llms-full.txt is also published" });

      // Only linkify web URLs — the file is remote content, so anything else
      // (javascript:, data:, relative paths) renders as plain text instead.
      const llmsSafeUrl = (u) => (u && /^https?:\/\//i.test(u.trim()) ? u.trim() : "");
      const sectionsHtml = parsed.sections.map((s) => `
      <div class="llms-vsection">
        <div class="llms-vsection-name">${escapeHtml(s.name)} <span class="tsd-section-count">${s.links.length}</span></div>
        <ul class="llms-vlinks">${s.links.map((l) => {
        const u = llmsSafeUrl(l.url);
        return u
          ? `<li><a href="${escapeHtml(u)}" target="_blank" rel="noopener">${escapeHtml(l.title || u)}</a>${l.desc ? `<span class="llms-vdesc">: ${escapeHtml(l.desc)}</span>` : ""}</li>`
          : `<li>${escapeHtml(l.title || l.url || "")}${l.desc ? `<span class="llms-vdesc">: ${escapeHtml(l.desc)}</span>` : ""}</li>`;
      }).join("")}</ul>
      </div>`).join("");

      llmsViewResult.innerHTML = `
      <div class="llms-hero">
        <div class="llms-hero-title">${SI.pass} llms.txt found</div>
        <div class="llms-hero-sub">${escapeHtml(origin)}/llms.txt</div>
      </div>
      <div class="llms-checks">${checks.map((c) => `<div class="llms-check llms-check--${c.ok}">${SI[c.ok] || SI.info} ${escapeHtml(c.t)}</div>`).join("")}</div>
      <div class="llms-doc">
        ${parsed.title ? `<h4 class="llms-doc-title">${escapeHtml(parsed.title)}</h4>` : ""}
        ${parsed.summary ? `<blockquote class="llms-doc-summary">${escapeHtml(parsed.summary)}</blockquote>` : ""}
        ${parsed.details ? `<p class="llms-doc-details">${escapeHtml(parsed.details)}</p>` : ""}
        ${sectionsHtml}
      </div>
      <div class="llms-view-actions">
        <button id="llmsViewRaw" class="btn-ghost">View raw</button>
        <button id="llmsViewEdit" class="btn-ghost">Edit in generator</button>
      </div>
      <pre id="llmsRaw" class="llms-raw hidden">${escapeHtml(raw)}</pre>`;

      document.getElementById("llmsViewRaw").addEventListener("click", (e) => {
        const pre = document.getElementById("llmsRaw");
        pre.classList.toggle("hidden");
        e.currentTarget.textContent = pre.classList.contains("hidden") ? "View raw" : "Hide raw";
      });
      document.getElementById("llmsViewEdit").addEventListener("click", () => { llmsLoadIntoGen(parsed); llmsSetMode("generate"); });
    }

    function llmsRenderNotFound(origin) {
      llmsViewResult.innerHTML = `
      <div class="llms-hero llms-hero--miss">
        <div class="llms-hero-title">${SI.warn} No llms.txt found</div>
        <div class="llms-hero-sub">${escapeHtml(origin)}/llms.txt returned nothing</div>
      </div>
      <p class="tool-subtle">This site doesn't publish an llms.txt yet. You can generate one. It's a quick win for AI search visibility.</p>
      <button id="llmsGotoGen" class="btn-hover">Generate one →</button>`;
      document.getElementById("llmsGotoGen").addEventListener("click", () => {
        llmsSetMode("generate");
        if (!llmsState.title && !llmsState.sections.some((s) => s.links.some((l) => l.url))) llmsImportFromPage();
      });
    }

    function llmsFetchView() {
      if (llmsRunning) return;
      const btn = document.getElementById("llmsFetch");
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const tab = tabs[0];
        if (!tab?.id || LLMS_RESTRICTED.test(tab.url || "")) { llmsViewError.textContent = "Open a regular website tab to check its llms.txt."; llmsViewResult.innerHTML = ""; return; }
        let origin; try { origin = new URL(tab.url).origin; } catch (_) { llmsViewError.textContent = "Could not read this tab's URL."; return; }
        llmsViewError.textContent = "";
        llmsRunning = true; btn.textContent = "Checking…"; btn.disabled = true;
        const [main, full] = await Promise.all([llmsBgFetch(origin + "/llms.txt"), llmsBgFetch(origin + "/llms-full.txt")]);
        llmsRunning = false; btn.textContent = "↻ Re-check"; btn.disabled = false;
        const ok = main && main.ok && main.status === 200 && /^\s*#/.test(main.body || "") && !/<html/i.test((main.body || "").slice(0, 200));
        if (!ok) { llmsRenderNotFound(origin); return; }
        llmsLastRaw = main.body;
        const hasFull = full && full.ok && full.status === 200 && /^\s*#/.test(full.body || "");
        llmsRenderView(llmsParse(main.body), main.body, origin, hasFull);
      });
    }
    document.getElementById("llmsFetch").addEventListener("click", llmsFetchView);

    // ════════════ GENERATE MODE ════════════
    const llmsState = { title: "", summary: "", details: "", sections: [{ name: "Docs", links: [{ title: "", url: "", desc: "" }] }] };
    const llmsSectionsEl = document.getElementById("llmsSections");
    const llmsOutput = document.getElementById("llmsOutput");
    const llmsGenError = document.getElementById("llmsGenError");

    function llmsGenerate() {
      const s = llmsState;
      let out = "# " + (s.title.trim() || "Untitled") + "\n";
      if (s.summary.trim()) out += "\n> " + s.summary.trim().replace(/\s*\n+\s*/g, " ") + "\n";
      if (s.details.trim()) out += "\n" + s.details.trim() + "\n";
      for (const sec of s.sections) {
        const links = sec.links.filter((l) => l.url.trim());
        if (!sec.name.trim() && !links.length) continue;
        out += "\n## " + (sec.name.trim() || "Section") + "\n\n";
        for (const l of links) out += "- [" + (l.title.trim() || l.url.trim()) + "](" + l.url.trim() + ")" + (l.desc.trim() ? ": " + l.desc.trim() : "") + "\n";
      }
      return out.replace(/\n{3,}/g, "\n\n").trim() + "\n";
    }
    function llmsUpdateOutput() { llmsOutput.value = llmsGenerate(); }

    function llmsRenderSections() {
      llmsSectionsEl.innerHTML = llmsState.sections.map((s, si) => `
      <div class="llms-section" data-si="${si}">
        <div class="llms-section-head">
          <input class="llms-input llms-sec-name" placeholder="Section name (e.g. Docs, Blog, About)" value="${escapeHtml(s.name)}">
          <button class="llms-x llms-sec-del" type="button" title="Remove section">×</button>
        </div>
        <div class="llms-links">
          ${s.links.map((l, li) => `
            <div class="llms-link" data-li="${li}">
              <input class="llms-input llms-link-title" placeholder="Link title" value="${escapeHtml(l.title)}">
              <input class="llms-input llms-link-url" placeholder="https://…" value="${escapeHtml(l.url)}">
              <input class="llms-input llms-link-desc" placeholder="Description (optional)" value="${escapeHtml(l.desc)}">
              <button class="llms-x llms-link-del" type="button" title="Remove link">×</button>
            </div>`).join("")}
        </div>
        <button class="llms-add-link btn-ghost" type="button">+ Add link</button>
      </div>`).join("");
    }

    llmsSectionsEl.addEventListener("input", (e) => {
      const sec = e.target.closest(".llms-section"); if (!sec) return;
      const si = +sec.dataset.si;
      if (e.target.classList.contains("llms-sec-name")) llmsState.sections[si].name = e.target.value;
      else {
        const link = e.target.closest(".llms-link"); if (!link) return;
        const li = +link.dataset.li;
        if (e.target.classList.contains("llms-link-title")) llmsState.sections[si].links[li].title = e.target.value;
        else if (e.target.classList.contains("llms-link-url")) llmsState.sections[si].links[li].url = e.target.value;
        else if (e.target.classList.contains("llms-link-desc")) llmsState.sections[si].links[li].desc = e.target.value;
      }
      llmsUpdateOutput();
    });

    llmsSectionsEl.addEventListener("click", (e) => {
      const sec = e.target.closest(".llms-section"); if (!sec) return;
      const si = +sec.dataset.si;
      if (e.target.classList.contains("llms-sec-del")) { llmsState.sections.splice(si, 1); }
      else if (e.target.classList.contains("llms-add-link")) { llmsState.sections[si].links.push({ title: "", url: "", desc: "" }); }
      else if (e.target.classList.contains("llms-link-del")) { const li = +e.target.closest(".llms-link").dataset.li; llmsState.sections[si].links.splice(li, 1); }
      else return;
      if (!llmsState.sections.length) llmsState.sections.push({ name: "", links: [{ title: "", url: "", desc: "" }] });
      llmsRenderSections(); llmsUpdateOutput();
    });

    document.getElementById("llmsTitle").addEventListener("input", (e) => { llmsState.title = e.target.value; llmsUpdateOutput(); });
    document.getElementById("llmsSummary").addEventListener("input", (e) => { llmsState.summary = e.target.value; llmsUpdateOutput(); });
    document.getElementById("llmsDetails").addEventListener("input", (e) => { llmsState.details = e.target.value; llmsUpdateOutput(); });
    document.getElementById("llmsAddSection").addEventListener("click", () => { llmsState.sections.push({ name: "", links: [{ title: "", url: "", desc: "" }] }); llmsRenderSections(); llmsUpdateOutput(); });

    function llmsSyncForm() {
      document.getElementById("llmsTitle").value = llmsState.title;
      document.getElementById("llmsSummary").value = llmsState.summary;
      document.getElementById("llmsDetails").value = llmsState.details;
      llmsRenderSections(); llmsUpdateOutput();
    }
    function llmsLoadIntoGen(parsed) {
      llmsState.title = parsed.title || "";
      llmsState.summary = parsed.summary || "";
      llmsState.details = parsed.details || "";
      llmsState.sections = parsed.sections.length
        ? parsed.sections.map((s) => ({ name: s.name, links: (s.links.length ? s.links : [{ title: "", url: "", desc: "" }]).map((l) => ({ title: l.title || "", url: l.url || "", desc: l.desc || "" })) }))
        : [{ name: "", links: [{ title: "", url: "", desc: "" }] }];
      llmsSyncForm();
    }

    document.getElementById("llmsGenClear").addEventListener("click", () => {
      llmsState.title = ""; llmsState.summary = ""; llmsState.details = "";
      llmsState.sections = [{ name: "", links: [{ title: "", url: "", desc: "" }] }];
      llmsSyncForm();
    });

    document.getElementById("llmsCopy").addEventListener("click", (e) => copyToClipboard(llmsOutput.value, e.currentTarget));
    document.getElementById("llmsDownload").addEventListener("click", () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([llmsOutput.value], { type: "text/plain" }));
      a.download = "llms.txt"; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      showToast("Downloaded llms.txt");
    });

    // ── Imports ──
    // Admin / non-content URLs that must never appear in llms.txt
    const LLMS_ADMIN_URL = /\/wp-admin\/|wp-login\.php|customize\.php|plugins\.php|themes\.php|post(-new)?\.php|edit\.php|admin\.php|update-core\.php|\/wp-json\b|\/feed\/?($|\?)|[?&]replytocom=|\.(jpe?g|png|gif|webp|svg|ico|pdf|zip|css|js|xml|mp4|woff2?)($|\?)/i;

    const llmsPretty = (u) => {
      try {
        const p = new URL(u).pathname.replace(/\/+$/, "");
        if (!p) return "Home";
        const seg = p.split("/").filter(Boolean).pop();
        return seg.replace(/[-_]+/g, " ").replace(/\.[a-z]+$/i, "").replace(/\b\w/g, (c) => c.toUpperCase());
      } catch (_) { return u; }
    };

    // Categorize discovered URLs into spec sections: Core / Services / Locations /
    // Products / Resources. Returns generator-ready { name, links } objects.
    function llmsBuildSections(urls, origin) {
      const root = origin.replace(/\/+$/, "");
      const buckets = { "Core Pages": [], "Services": [], "Locations": [], "Products": [], "Resources": [] };
      const seen = new Set();
      let home = null;
      for (let u of urls) {
        u = (u || "").split("#")[0];
        if (!u || LLMS_ADMIN_URL.test(u)) continue;
        let path; try { path = new URL(u).pathname.toLowerCase().replace(/\/+$/, ""); } catch (_) { continue; }
        const key = path || "/";
        if (seen.has(key)) continue;
        seen.add(key);
        const clean = u.split("?")[0].replace(/\/+$/, "");
        if (key === "/" || clean === root) { home = { title: "Home", url: root + "/", desc: "" }; continue; }
        const item = { title: llmsPretty(u), url: clean, desc: "" };
        const segs = path.split("/").filter(Boolean);
        if (/(^|\/)(locations?|areas?|cities|city|service-areas?|near-me)(\/|$|-)/.test(path)) buckets["Locations"].push(item);
        else if (/(^|\/)services?(\/|$)/.test(path)) buckets["Services"].push(item);
        else if (/(^|\/)(products?|shop|store)(\/|$)/.test(path)) buckets["Products"].push(item);
        else if (/(^|\/)(blog|posts?|news|articles?|guides?|resources?|faqs?|category|tag|author|case-stud)(\/|$|-)/.test(path)) buckets["Resources"].push(item);
        else if (/(^|\/)(about|contact|pricing|quote|team|company|careers?|testimonials?|reviews?|book|booking|appointment|gallery|portfolio)(\/|$|-)/.test(path)) buckets["Core Pages"].push(item);
        else if (segs.length <= 1) buckets["Core Pages"].push(item);
        else buckets["Resources"].push(item);
      }
      if (home) buckets["Core Pages"].unshift(home);
      const sections = [];
      for (const name of ["Core Pages", "Services", "Locations", "Products", "Resources"]) {
        let items = buckets[name];
        if (!items.length) continue;
        if (name === "Core Pages") {
          const h = items.filter((i) => i.title === "Home");
          const rest = items.filter((i) => i.title !== "Home").sort((a, b) => a.title.localeCompare(b.title));
          items = h.concat(rest);
        } else {
          items.sort((a, b) => a.title.localeCompare(b.title));
        }
        sections.push({ name, links: items.slice(0, 60) });
      }
      return sections;
    }

    // Injected: extract links from the MAIN CONTENT only, dropping nav/header/footer/
    // sidebars and every WordPress admin-bar / Elementor / dashboard element.
    function llmsPageScan() {
      try {
        const origin = location.origin;
        const ADMIN_TXT = /^(about wordpress|get involved|wordpress\.org|documentation|support forums?|feedback|learn wordpress|plugins?|themes?|menus?|customize|widgets?|new\b|add new|media|users?|edit page|edit with elementor|duplicate page|dashboard|updates?|comments?|settings|tools|log ?out|howdy|skip to content)/i;
        const ADMIN_URL = /\/wp-admin\/|wp-login\.php|customize\.php|plugins\.php|themes\.php|post(-new)?\.php|edit\.php|admin\.php|update-core\.php|\/wp-json\b/i;
        const SEL = ["main", "article", ".entry-content", ".post-content", ".page-content", ".elementor-widget-theme-post-content", ".elementor-location-single", ".site-content", ".content-area"];
        let root = null;
        for (const s of SEL) { const el = document.querySelector(s); if (el) { root = el; break; } }
        if (!root) root = document.body;
        const IGNORE = "#wpadminbar,#adminmenu,header,footer,nav,aside,[role=navigation],[role=banner],[role=contentinfo],.site-header,.site-footer,.menu,.main-navigation,.navbar,.breadcrumb,.breadcrumbs,.sidebar,.widget,.cookie,.cookie-notice,.modal,.popup,.related,.related-posts,.share,.search-form";
        const seen = new Set(), links = [];
        root.querySelectorAll("a[href]").forEach((a) => {
          if (a.closest(IGNORE)) return;
          let u; try { u = new URL(a.getAttribute("href"), location.href); } catch (_) { return; }
          if (u.origin !== origin || ADMIN_URL.test(u.pathname)) return;
          const key = u.pathname.replace(/\/+$/, "") || "/";
          if (seen.has(key) || key === "/") return;
          const text = (a.textContent || "").replace(/\s+/g, " ").trim();
          if (!text || text.length > 80 || ADMIN_TXT.test(text)) return;
          seen.add(key); links.push(u.origin + u.pathname);
        });
        const siteName = document.querySelector('meta[property="og:site_name"]')?.content?.trim();
        return {
          ok: true,
          title: siteName || document.title || location.hostname,
          description: (document.querySelector('meta[name="description"]')?.content
            || document.querySelector('meta[property="og:description"]')?.content || "").trim(),
          h1: (document.querySelector("h1")?.textContent || "").replace(/\s+/g, " ").trim(),
          links: links.slice(0, 80),
        };
      } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
    }

    function llmsImportFromPage() {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id || LLMS_RESTRICTED.test(tab.url || "")) { llmsGenError.textContent = "Open a regular website tab to import."; return; }
        let origin; try { origin = new URL(tab.url).origin; } catch (_) { origin = ""; }
        chrome.scripting.executeScript({ target: { tabId: tab.id }, func: llmsPageScan }, (res) => {
          if (chrome.runtime.lastError) { llmsGenError.textContent = "Could not access this page: " + chrome.runtime.lastError.message; return; }
          const d = res?.[0]?.result;
          if (!d?.ok) { llmsGenError.textContent = "Import failed: " + (d?.error || "unknown error"); return; }
          llmsGenError.textContent = "";
          if (d.title) llmsState.title = d.title;
          if (d.description) llmsState.summary = d.description;
          const sections = llmsBuildSections(d.links, origin);
          llmsState.sections = sections.length ? sections : [{ name: "Key pages", links: [{ title: "", url: "", desc: "" }] }];
          llmsSyncForm();
          showToast(`Imported ${d.links.length} content link(s) from the page`);
        });
      });
    }
    document.getElementById("llmsImportPage").addEventListener("click", llmsImportFromPage);

    // Merge every common WordPress/SEO sitemap, following sitemap-index children.
    async function llmsFetchAllSitemaps(origin) {
      const grab = (xml) => (xml.match(/<loc>\s*([^<\s]+)\s*<\/loc>/gi) || []).map((m) => m.replace(/<\/?loc>/gi, "").trim());
      const seenSm = new Set(), pages = new Set();
      const queue = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap-index.xml", "/page-sitemap.xml", "/post-sitemap.xml", "/product-sitemap.xml", "/category-sitemap.xml", "/location-sitemap.xml", "/service-sitemap.xml"].map((p) => origin + p);
      let fetches = 0;
      while (queue.length && fetches < 14 && pages.size < 400) {
        const sm = queue.shift();
        if (seenSm.has(sm)) continue;
        seenSm.add(sm);
        const res = await llmsBgFetch(sm);
        fetches++;
        if (!res || !res.ok || res.status >= 400 || !res.body || !/<(urlset|sitemapindex)/i.test(res.body)) continue;
        const locs = grab(res.body);
        if (/<sitemapindex/i.test(res.body)) {
          locs.forEach((l) => { if (/\.xml(\?|$)/i.test(l) && !seenSm.has(l) && queue.length < 40) queue.push(l); });
        } else {
          locs.forEach((l) => pages.add(l));
        }
      }
      return [...pages];
    }

    document.getElementById("llmsImportSitemap").addEventListener("click", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const tab = tabs[0];
        if (!tab?.id || LLMS_RESTRICTED.test(tab.url || "")) { llmsGenError.textContent = "Open a regular website tab to import."; return; }
        let origin; try { origin = new URL(tab.url).origin; } catch (_) { return; }
        llmsGenError.textContent = "Fetching sitemaps…";
        const urls = await llmsFetchAllSitemaps(origin);
        if (!urls.length) { llmsGenError.textContent = "No sitemap found (tried sitemap.xml, page-sitemap.xml, post-sitemap.xml and more)."; return; }
        const sections = llmsBuildSections(urls, origin);
        if (!sections.length) { llmsGenError.textContent = "Sitemap had no usable page URLs."; return; }
        llmsGenError.textContent = "";
        llmsState.sections = sections;
        if (!llmsState.title) { try { llmsState.title = new URL(origin).hostname.replace(/^www\./, ""); } catch (_) { } }
        llmsSyncForm();
        const total = sections.reduce((n, s) => n + s.links.length, 0);
        showToast(`Imported ${total} URL(s) across ${sections.length} section(s)`);
      });
    });

    // ── Mode toggle ──
    function llmsSetMode(mode) {
      document.querySelectorAll("#llms-txt .llms-mode-btn").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
      document.getElementById("llmsView").classList.toggle("hidden", mode !== "view");
      document.getElementById("llmsGen").classList.toggle("hidden", mode !== "generate");
    }
    document.querySelectorAll("#llms-txt .llms-mode-btn").forEach((b) => b.addEventListener("click", () => llmsSetMode(b.dataset.mode)));

    // Init
    llmsSyncForm();
    registerTabHook("llms-txt", llmsFetchView);

  }); // ─── end lazy init: llms-txt

  registerToolInit("full-screenshot", () => {
    // ─── FULL PAGE SCREENSHOT ───────────────────────────────────────────────────
    // Scroll-and-stitch: the page is scrolled one viewport at a time, each frame
    // captured via chrome.tabs.captureVisibleTab (through the background worker),
    // then composited onto a canvas here in the popup. PNG/JPEG export + clipboard
    // copy. Keep the popup focused — capture aborts if the popup closes.

    // ── Injected page helpers (self-contained; window.* persists between calls) ──
    function shotMetrics() {
      const de = document.documentElement, body = document.body;
      // Hide scrollbars so captured frames don't include the scrollbar strip.
      // A style tag (not overflow:hidden) keeps the page programmatically scrollable.
      if (!document.getElementById("__wdtShotStyle")) {
        const st = document.createElement("style");
        st.id = "__wdtShotStyle";
        st.textContent = "html{scrollbar-width:none !important}::-webkit-scrollbar{width:0 !important;height:0 !important;display:none !important}";
        (document.head || de).appendChild(st);
      }
      const width = Math.max(de.scrollWidth, body ? body.scrollWidth : 0, de.clientWidth, window.innerWidth);
      const height = Math.max(de.scrollHeight, body ? body.scrollHeight : 0, de.clientHeight, window.innerHeight);
      window.__wdtShot = { x: window.scrollX, y: window.scrollY, scrollBehavior: de.style.scrollBehavior };
      de.style.scrollBehavior = "auto";
      return {
        width, height, viewW: window.innerWidth, viewH: window.innerHeight,
        dpr: window.devicePixelRatio || 1, title: document.title || location.hostname,
      };
    }

    function shotScroll(y) {
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, y);
      return { y: window.scrollY };
    }

    // Detect & hide fixed/sticky elements AFTER scrolling — JS-driven sticky
    // headers only switch to position:fixed once their scroll handler fires, so
    // detecting before the scroll misses them. Accumulates across frames.
    function shotHideFixed() {
      if (!window.__wdtShotFixed) { window.__wdtShotFixed = []; window.__wdtShotFixedVis = []; }
      document.querySelectorAll("body *").forEach((el) => {
        if (el.__wdtHidden) return;
        const cs = getComputedStyle(el);
        if (cs.position === "fixed" || cs.position === "sticky") {
          window.__wdtShotFixed.push(el);
          window.__wdtShotFixedVis.push(el.style.getPropertyValue("visibility"));
          el.style.setProperty("visibility", "hidden", "important"); // beat any !important visibility:visible
          el.__wdtHidden = true;
        }
      });
    }

    function shotRestore() {
      const els = window.__wdtShotFixed || [], vis = window.__wdtShotFixedVis || [];
      els.forEach((el, i) => {
        el.style.removeProperty("visibility");
        if (vis[i]) el.style.setProperty("visibility", vis[i]);
        delete el.__wdtHidden;
      });
      const st = document.getElementById("__wdtShotStyle");
      if (st) st.remove();
      const w = window.__wdtShot;
      if (w) { document.documentElement.style.scrollBehavior = w.scrollBehavior || ""; window.scrollTo(w.x, w.y); }
      delete window.__wdtShot; delete window.__wdtShotFixed; delete window.__wdtShotFixedVis;
    }

    // Injected drag-to-select region picker with an ADJUSTABLE crop box: after the
    // initial drag you can drag any of the 8 handles to resize, drag inside to move,
    // or drag on empty space to redraw — nothing is captured until you click Capture
    // (or press Enter). Esc cancels. Crops the visible tab in-page, stores the PNG,
    // then reopens the popup.
    function shotRegionPicker() {
      if (window.__wdtShotRegionCleanup) window.__wdtShotRegionCleanup();
      const Z = "2147483647";
      const vw = () => window.innerWidth, vh = () => window.innerHeight;
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

      const root = document.createElement("div");
      root.style.cssText = `position:fixed !important;inset:0 !important;z-index:${Z} !important;cursor:crosshair !important;user-select:none !important;`;
      // The selection box dims everything OUTSIDE it via a huge box-shadow "hole".
      const sel = document.createElement("div");
      sel.style.cssText = "position:fixed !important;box-sizing:border-box !important;border:1.5px solid #2f81f7 !important;box-shadow:0 0 0 100vmax rgba(0,0,0,.45) !important;display:none;cursor:move !important;";
      const hint = document.createElement("div");
      hint.style.cssText = `position:fixed !important;top:12px !important;left:50% !important;transform:translateX(-50%) !important;z-index:${Z} !important;background:#2f81f7 !important;color:#fff !important;font:600 12px/1.6 system-ui,sans-serif !important;padding:5px 12px !important;border-radius:6px !important;pointer-events:none !important;`;
      hint.textContent = "Drag to select an area";
      root.append(sel, hint);

      // 8 resize handles
      const DIRS = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
      const CURSORS = { nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize" };
      const handles = DIRS.map((dir) => {
        const el = document.createElement("div");
        el.dataset.dir = dir;
        el.style.cssText = `position:fixed !important;width:11px !important;height:11px !important;box-sizing:border-box !important;background:#fff !important;border:1.5px solid #2f81f7 !important;border-radius:2px !important;display:none;cursor:${CURSORS[dir]} !important;z-index:${Z} !important;`;
        root.append(el);
        return { el, dir };
      });

      // Toolbar: dimensions + Capture / Cancel
      const bar = document.createElement("div");
      bar.style.cssText = `position:fixed !important;display:none;align-items:center !important;gap:8px !important;z-index:${Z} !important;background:#1b1f24 !important;border:1px solid #30363d !important;border-radius:8px !important;padding:6px 8px !important;box-shadow:0 4px 16px rgba(0,0,0,.4) !important;font:600 12px/1 system-ui,sans-serif !important;`;
      const dimLbl = document.createElement("span");
      dimLbl.style.cssText = "color:#adbac7 !important;padding:0 2px !important;font-variant-numeric:tabular-nums !important;";
      const btnCap = document.createElement("button");
      btnCap.textContent = "Capture";
      btnCap.style.cssText = "all:unset !important;cursor:pointer !important;background:#2f81f7 !important;color:#fff !important;padding:5px 12px !important;border-radius:6px !important;font:inherit !important;";
      const btnCancel = document.createElement("button");
      btnCancel.textContent = "Cancel";
      btnCancel.style.cssText = "all:unset !important;cursor:pointer !important;background:#30363d !important;color:#fff !important;padding:5px 12px !important;border-radius:6px !important;font:inherit !important;";
      bar.append(dimLbl, btnCap, btnCancel);
      root.append(bar);

      document.documentElement.append(root);

      let rect = { x: 0, y: 0, w: 0, h: 0 };
      let op = null;        // "new" | "move" | "resize"
      let dir = null;
      let downX = 0, downY = 0, startRect = null;
      let committed = false; // has an initial selection been drawn?

      const clampRect = () => {
        rect.w = Math.min(rect.w, vw());
        rect.h = Math.min(rect.h, vh());
        rect.x = clamp(rect.x, 0, vw() - rect.w);
        rect.y = clamp(rect.y, 0, vh() - rect.h);
      };

      const render = () => {
        const show = committed && rect.w > 0 && rect.h > 0;
        sel.style.display = show ? "block" : "none";
        sel.style.left = rect.x + "px"; sel.style.top = rect.y + "px";
        sel.style.width = rect.w + "px"; sel.style.height = rect.h + "px";
        handles.forEach(({ el, dir }) => {
          el.style.display = show ? "block" : "none";
          const hx = dir.includes("w") ? rect.x : dir.includes("e") ? rect.x + rect.w : rect.x + rect.w / 2;
          const hy = dir.includes("n") ? rect.y : dir.includes("s") ? rect.y + rect.h : rect.y + rect.h / 2;
          el.style.left = (hx - 5.5) + "px"; el.style.top = (hy - 5.5) + "px";
        });
        bar.style.display = show ? "flex" : "none";
        hint.style.display = show ? "none" : "block";
        if (show) {
          dimLbl.textContent = Math.round(rect.w) + " × " + Math.round(rect.h);
          bar.style.visibility = "hidden";
          const bw = bar.offsetWidth || 220, bh = bar.offsetHeight || 34;
          const below = rect.y + rect.h + 10 + bh <= vh();
          bar.style.top = (below ? rect.y + rect.h + 10 : Math.max(8, rect.y - bh - 10)) + "px";
          bar.style.left = clamp(rect.x + rect.w / 2 - bw / 2, 8, vw() - bw - 8) + "px";
          bar.style.visibility = "visible";
        }
      };

      const cleanup = () => {
        document.removeEventListener("mousedown", onDown, true);
        document.removeEventListener("mousemove", onMove, true);
        document.removeEventListener("mouseup", onUp, true);
        document.removeEventListener("keydown", onKey, true);
        root.remove();
        window.__wdtShotRegionCleanup = null;
      };
      window.__wdtShotRegionCleanup = cleanup;
      const cancel = () => { cleanup(); chrome.runtime.sendMessage({ type: "REOPEN_POPUP" }); };

      const doCapture = () => {
        if (rect.w < 5 || rect.h < 5) return;
        const r = { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
        const dpr = window.devicePixelRatio || 1;
        cleanup(); // remove overlay BEFORE capture so it isn't in the shot
        requestAnimationFrame(() => requestAnimationFrame(() => {
          chrome.runtime.sendMessage({ type: "CAPTURE_TAB" }, (res) => {
            const url = res && res.dataUrl;
            if (!url) { chrome.runtime.sendMessage({ type: "REOPEN_POPUP" }); return; }
            const img = new Image();
            img.onload = () => {
              const sw = Math.round(r.w * dpr), sh = Math.round(r.h * dpr);
              const c = document.createElement("canvas");
              c.width = sw; c.height = sh;
              c.getContext("2d").drawImage(img, Math.round(r.x * dpr), Math.round(r.y * dpr), sw, sh, 0, 0, sw, sh);
              let dataUrl = "";
              try { dataUrl = c.toDataURL("image/png"); } catch (_) { }
              chrome.storage.local.set({ wdt_shot_region: { dataUrl, w: sw, h: sh, ts: Date.now() } }, () => {
                chrome.runtime.sendMessage({ type: "REOPEN_POPUP" });
              });
            };
            img.onerror = () => chrome.runtime.sendMessage({ type: "REOPEN_POPUP" });
            img.src = url;
          });
        }));
      };

      btnCap.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); doCapture(); });
      btnCancel.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); cancel(); });

      const onDown = (e) => {
        if (bar.contains(e.target)) return; // let toolbar buttons handle their own clicks
        e.preventDefault(); e.stopPropagation();
        downX = e.clientX; downY = e.clientY;
        startRect = { ...rect };
        const hd = e.target.dataset && e.target.dataset.dir;
        if (hd) { op = "resize"; dir = hd; }
        else if (committed && e.clientX >= rect.x && e.clientX <= rect.x + rect.w && e.clientY >= rect.y && e.clientY <= rect.y + rect.h) { op = "move"; }
        else { op = "new"; rect = { x: downX, y: downY, w: 0, h: 0 }; committed = true; }
        render();
      };

      const onMove = (e) => {
        if (!op) return;
        e.preventDefault();
        const mx = clamp(e.clientX, 0, vw()), my = clamp(e.clientY, 0, vh());
        if (op === "new") {
          rect.x = Math.min(downX, mx); rect.y = Math.min(downY, my);
          rect.w = Math.abs(mx - downX); rect.h = Math.abs(my - downY);
        } else if (op === "move") {
          rect.x = clamp(startRect.x + (e.clientX - downX), 0, vw() - startRect.w);
          rect.y = clamp(startRect.y + (e.clientY - downY), 0, vh() - startRect.h);
          rect.w = startRect.w; rect.h = startRect.h;
        } else if (op === "resize") {
          let left = startRect.x, top = startRect.y, right = startRect.x + startRect.w, bottom = startRect.y + startRect.h;
          if (dir.includes("w")) left = mx;
          if (dir.includes("e")) right = mx;
          if (dir.includes("n")) top = my;
          if (dir.includes("s")) bottom = my;
          rect.x = Math.min(left, right); rect.w = Math.abs(right - left);
          rect.y = Math.min(top, bottom); rect.h = Math.abs(bottom - top);
        }
        clampRect();
        render();
      };

      const onUp = () => {
        if (op === "new" && (rect.w < 5 || rect.h < 5)) { committed = false; render(); }
        op = null; dir = null;
      };

      const onKey = (e) => {
        if (e.key === "Escape") { e.preventDefault(); cancel(); }
        else if (e.key === "Enter" && committed) { e.preventDefault(); doCapture(); }
      };

      document.addEventListener("mousedown", onDown, true);
      document.addEventListener("mousemove", onMove, true);
      document.addEventListener("mouseup", onUp, true);
      document.addEventListener("keydown", onKey, true);
    }

    // ── Popup-side orchestration ──
    const SHOT_RESTRICTED = /^(chrome|chrome-extension|edge|devtools|about|view-source):/;
    const SHOT_MAX_PX = 32760; // canvas dimension safety cap (device pixels)
    const SHOT_DELAY = 320;    // ms between captures: lets content settle + dodges the capture rate limit

    const shotModeBtns = document.querySelectorAll("#full-screenshot .cmd-mode-btn");
    const shotProgress = document.getElementById("shotProgress");
    const shotError = document.getElementById("shotError");
    const shotResult = document.getElementById("shotResult");
    const shotImg = document.getElementById("shotImg");
    const shotMeta = document.getElementById("shotMeta");
    const shotBtn = document.getElementById("shotCapture");
    let shotMode = "full";
    let shotBlob = null;
    let shotName = "screenshot";

    const setActiveShotMode = (mode) => {
      shotMode = mode;
      shotModeBtns.forEach((x) => x.classList.toggle("active", x.dataset.mode === mode));
      document.getElementById("shotHideFixedWrap").style.display = mode === "full" ? "" : "none";
      document.getElementById("shotFormatWrap").style.display = mode === "region" ? "none" : "";
      shotBtn.textContent = mode === "region" ? "Select Area on Page" : "Capture Screenshot";
    };
    shotModeBtns.forEach((b) => b.addEventListener("click", () => setActiveShotMode(b.dataset.mode)));

    const shotSleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const shotExec = (tabId, func, args) => new Promise((resolve) =>
      chrome.scripting.executeScript({ target: { tabId }, func, args: args || [] },
        (res) => resolve(chrome.runtime.lastError ? null : res?.[0]?.result)));
    const shotCaptureTile = (windowId) => new Promise((resolve) =>
      chrome.runtime.sendMessage({ type: "CAPTURE_TAB", windowId }, (res) => resolve(res?.dataUrl || null)));
    const shotLoadImg = (src) => new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error("tile decode failed"));
      im.src = src;
    });

    function shotSlug(s) {
      return (s || "screenshot").toLowerCase().replace(/^https?:\/\//, "")
        .replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "screenshot";
    }

    async function shotFinalize(canvas, truncated) {
      const fmt = document.getElementById("shotFormat").value === "jpeg" ? "jpeg" : "png";
      const mime = fmt === "jpeg" ? "image/jpeg" : "image/png";
      const blob = await new Promise((res) => canvas.toBlob(res, mime, fmt === "jpeg" ? 0.92 : undefined));
      if (!blob) throw new Error("This page is too large to export as one image. Try Visible Area, or switch to JPEG.");
      shotBlob = blob;
      if (shotImg.dataset.url) URL.revokeObjectURL(shotImg.dataset.url);
      const objUrl = URL.createObjectURL(blob);
      shotImg.dataset.url = objUrl;
      shotImg.src = objUrl;
      const size = blob.size < 1048576 ? `${Math.round(blob.size / 1024)} KB` : `${(blob.size / 1048576).toFixed(1)} MB`;
      shotMeta.textContent = `· ${canvas.width}×${canvas.height}px · ${fmt.toUpperCase()} · ${size}${truncated ? " · truncated" : ""}`;
      shotResult.classList.remove("hidden");
    }

    async function runShotCapture() {
      shotError.textContent = "";
      const tabs = await new Promise((r) => chrome.tabs.query({ active: true, currentWindow: true }, r));
      const tab = tabs[0];
      if (!tab?.id || SHOT_RESTRICTED.test(tab.url || "")) {
        shotError.textContent = "This page can't be captured. Open a regular website tab.";
        return;
      }

      // Select Area: hand off to the in-page drag picker, then close the popup so
      // the user can interact with the page. It reopens us with the cropped image.
      if (shotMode === "region") {
        chrome.scripting.executeScript({ target: { tabId: tab.id }, func: shotRegionPicker }, () => {
          if (chrome.runtime.lastError) {
            shotError.textContent = "Could not start selection: " + chrome.runtime.lastError.message;
            return;
          }
          window.close();
        });
        return;
      }

      shotBtn.disabled = true;
      shotResult.classList.add("hidden");
      shotProgress.textContent = "Preparing…";
      let needRestore = false;

      try {
        const m = await shotExec(tab.id, shotMetrics);
        if (!m) throw new Error("Could not read this page. Try reloading the tab, then capture again.");
        needRestore = true;
        shotName = shotSlug(m.title) + "-" + new Date().toISOString().slice(0, 10);
        const dpr = m.dpr;

        if (shotMode === "visible") {
          await shotSleep(80);
          let url = await shotCaptureTile(tab.windowId);
          if (!url) { await shotSleep(700); url = await shotCaptureTile(tab.windowId); }
          if (!url) throw new Error("Capture was rate-limited. Wait a few seconds and try again.");
          const img = await shotLoadImg(url);
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          await shotFinalize(canvas, false);
          shotProgress.textContent = "";
          return;
        }

        // Full page: cap total height to the canvas-safe limit
        const cappedH = Math.min(m.height, Math.floor(SHOT_MAX_PX / dpr));
        const truncated = m.height > cappedH + 1;
        const rows = Math.max(1, Math.ceil(cappedH / m.viewH));
        const ch = Math.round(cappedH * dpr);
        const hideFixed = document.getElementById("shotHideFixed").checked;

        // Canvas is created lazily from the first captured tile so its width
        // exactly matches the captured pixels (no right-edge gap).
        let canvas = null, ctx = null, prevBottom = 0;

        for (let i = 0; i < rows; i++) {
          let targetY = i * m.viewH;
          if (targetY > cappedH - m.viewH) targetY = Math.max(0, cappedH - m.viewH);
          const sres = await shotExec(tab.id, shotScroll, [targetY]);
          const actualY = sres ? sres.y : targetY;
          await shotSleep(i === 0 ? 140 : SHOT_DELAY);
          // Hide sticky/fixed elements after the first frame so each appears only
          // once. Detection runs every frame (accumulating) to also catch headers
          // that JS only switches to position:fixed once you've scrolled. Crucially
          // we then wait for the hide to COMPOSITE before capturing — without this
          // settle the capture grabs the pre-hide frame and the element repeats.
          if (hideFixed && i > 0) {
            await shotExec(tab.id, shotHideFixed);
            await shotSleep(90);
          }
          shotProgress.textContent = `Capturing ${i + 1} / ${rows}…`;
          let url = await shotCaptureTile(tab.windowId);
          if (!url) { await shotSleep(800); url = await shotCaptureTile(tab.windowId); }
          if (!url) throw new Error(`Capture was rate-limited after ${i} of ${rows} frames. Wait a few seconds and try again.`);
          const img = await shotLoadImg(url);

          if (!canvas) {
            canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = ch;
            ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Could not allocate the canvas for this page size.");
            ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, ch);
          }

          // Place each tile at its true device-pixel offset, but never below the
          // previous tile's bottom — closes the sub-pixel gap that fractional DPR
          // rounding leaves between tiles (the faint horizontal seam line).
          let dy = Math.round(actualY * dpr);
          if (i > 0 && dy > prevBottom) dy = prevBottom;
          ctx.drawImage(img, 0, dy);
          prevBottom = dy + img.naturalHeight;
        }

        shotProgress.textContent = "Stitching…";
        await shotFinalize(canvas, truncated);
        shotProgress.textContent = truncated
          ? `Captured the top ${ch}px. The page was too tall for a single image.`
          : "";
      } catch (err) {
        shotError.textContent = err?.message || String(err);
        shotProgress.textContent = "";
      } finally {
        if (needRestore) await shotExec(tab.id, shotRestore);
        shotBtn.disabled = false;
      }
    }

    shotBtn.addEventListener("click", runShotCapture);

    document.getElementById("shotDownload").addEventListener("click", () => {
      if (!shotBlob) return;
      const ext = shotBlob.type === "image/jpeg" ? "jpg" : "png";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(shotBlob);
      a.download = shotName + "." + ext;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      showToast("Downloaded " + a.download);
    });

    document.getElementById("shotCopy").addEventListener("click", async () => {
      if (!shotBlob) return;
      try {
        // The clipboard image API only reliably accepts PNG — re-encode JPEG first
        let png = shotBlob;
        if (png.type !== "image/png") {
          const im = await shotLoadImg(URL.createObjectURL(shotBlob));
          const c = document.createElement("canvas");
          c.width = im.naturalWidth; c.height = im.naturalHeight;
          c.getContext("2d").drawImage(im, 0, 0);
          png = await new Promise((res) => c.toBlob(res, "image/png"));
          URL.revokeObjectURL(im.src);
        }
        await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
        showToast("Screenshot copied to clipboard");
      } catch (_) {
        showToast("Copy failed. Use Download instead", "error");
      }
    });

    // Consume a pending Select-Area result handed off by the in-page picker
    chrome.storage.local.get(["wdt_shot_region"], (d) => {
      const r = d.wdt_shot_region;
      if (r?.dataUrl && Date.now() - (r.ts || 0) < 60000) {
        fetch(r.dataUrl).then((res) => res.blob()).then((blob) => {
          shotBlob = blob;
          shotName = "selection-" + new Date().toISOString().slice(0, 10);
          if (shotImg.dataset.url) URL.revokeObjectURL(shotImg.dataset.url);
          const u = URL.createObjectURL(blob);
          shotImg.dataset.url = u;
          shotImg.src = u;
          const size = blob.size < 1048576 ? `${Math.round(blob.size / 1024)} KB` : `${(blob.size / 1048576).toFixed(1)} MB`;
          shotMeta.textContent = `· ${r.w}×${r.h}px · PNG · ${size}`;
          shotResult.classList.remove("hidden");
          setActiveShotMode("region");
          showToast("Area captured");
        }).catch(() => { });
      }
      chrome.storage.local.remove("wdt_shot_region");
    });

  }); // ─── end lazy init: full-screenshot

  registerToolInit("tech-stack", () => {
    // ─── TECH STACK DETECTOR (Wappalyzer-style) ─────────────────────────────────
    // Combines an in-page scan (DOM, script/link URLs, JS globals, cookies) with
    // the raw HTML + response headers fetched through the background worker, then
    // runs a curated signature ruleset. WordPress themes/plugins and the Shopify
    // theme get extra digging. Everything stays in the browser.

    // Injected scan — returns evidence only (no matching done here).
    function tsdPageScan() {
      try {
        const abs = (u) => { try { return new URL(u, location.href).href; } catch (_) { return u || ""; } };
        const urls = [];
        document.querySelectorAll("script[src]").forEach((s) => urls.push(abs(s.getAttribute("src"))));
        document.querySelectorAll("link[href]").forEach((l) => urls.push(abs(l.getAttribute("href"))));
        document.querySelectorAll("img[src]").forEach((i) => urls.push(abs(i.getAttribute("src"))));
        document.querySelectorAll("iframe[src]").forEach((i) => urls.push(abs(i.getAttribute("src"))));
        const urlBlob = urls.join("\n");

        let inlineJs = "";
        document.querySelectorAll("script:not([src])").forEach((s) => {
          if (inlineJs.length < 160000) inlineJs += "\n" + (s.textContent || "");
        });
        const headHtml = (document.head ? document.head.innerHTML : "").slice(0, 80000);

        const metas = {};
        document.querySelectorAll("meta[name][content]").forEach((m) => {
          const n = (m.getAttribute("name") || "").toLowerCase();
          if (n && !metas[n]) metas[n] = m.getAttribute("content") || "";
        });
        const generators = [...document.querySelectorAll('meta[name="generator" i]')]
          .map((m) => m.getAttribute("content") || "").filter(Boolean);
        const cookies = (document.cookie || "").split(";").map((c) => c.split("=")[0].trim()).filter(Boolean);

        const g = {};
        const tryset = (fn) => { try { fn(); } catch (_) { } };
        tryset(() => { if (window.jQuery && window.jQuery.fn && window.jQuery.fn.jquery) g.jquery = window.jQuery.fn.jquery; else if (window.jQuery || window.$) g.jquery = true; });
        tryset(() => { g.react = !!(window.React || window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || document.querySelector("[data-reactroot],[data-reactid]")); g.reactVer = (window.React && window.React.version) || ""; });
        tryset(() => { g.next = !!(window.__NEXT_DATA__ || document.querySelector("#__next")); });
        tryset(() => { g.nuxt = !!(window.__NUXT__ || document.querySelector("#__nuxt,#__layout")); });
        tryset(() => { g.gatsby = !!(window.___gatsby || document.querySelector("#___gatsby")); });
        tryset(() => { g.vue = !!(window.Vue || window.__VUE__ || document.querySelector("[data-v-app],[data-server-rendered]")); g.vueVer = (window.Vue && window.Vue.version) || ""; });
        tryset(() => { const e = document.querySelector("[ng-version]"); g.angular = !!e; g.angularVer = e ? e.getAttribute("ng-version") : ""; });
        tryset(() => { g.angularjs = !!(window.angular); });
        tryset(() => { g.svelte = !!document.querySelector('[class*="svelte-"]'); });
        tryset(() => { g.alpine = !!(window.Alpine || document.querySelector("[x-data]")); });
        tryset(() => { g.astro = !!document.querySelector('astro-island,[class*="astro-"]'); });
        tryset(() => { g.ember = !!document.querySelector(".ember-view"); });
        tryset(() => { g.backbone = !!window.Backbone; });
        tryset(() => { g.lodash = !!window._ && !!window._.VERSION; });
        tryset(() => { g.gsap = !!window.gsap; });
        tryset(() => { g.modernizr = !!window.Modernizr; });

        let shopify = null;
        tryset(() => { if (window.Shopify) { const t = window.Shopify.theme || {}; shopify = { name: t.name || "", id: t.id || "", themeStoreId: t.theme_store_id || "", shop: window.Shopify.shop || "" }; } });
        let wc = false;
        tryset(() => { wc = !!(window.wc || window.woocommerce_params || window.wc_add_to_cart_params); });

        return {
          ok: true, url: location.href, origin: location.origin, hostname: location.hostname,
          urlBlob, inlineJs, headHtml, metas, generators, cookies, globals: g, shopify, wc,
          htmlLang: document.documentElement.getAttribute("lang") || "",
        };
      } catch (err) {
        return { ok: false, error: String((err && err.message) || err) };
      }
    }

    // ── Signature ruleset ──
    // Each rule: { name, cat, and any of: urls, text, cookie (regex); global (key);
    // generator, header:[name,re], meta:[name,re] }. Version via: version (regex on
    // combined text, group 1), versionGen (regex on generator), versionHeader:[name,re],
    // globalVer (globals key holding a version string).
    const TSD_RULES = [
      // CMS
      { name: "WordPress", cat: "CMS", urls: /\/wp-(content|includes|json)\b/i, generator: /WordPress/i, versionGen: /WordPress\s+([\d.]+)/i },
      { name: "Wix", cat: "CMS", urls: /static\.parastorage\.com|wixstatic\.com|\.wixsite\.com/i, text: /wixBiSession|X-Wix-/i },
      { name: "Squarespace", cat: "CMS", urls: /static1\.squarespace\.com|squarespace-cdn\.com/i, generator: /Squarespace/i },
      { name: "Webflow", cat: "CMS", generator: /Webflow/i, urls: /assets\.website-files\.com|assets-global\.website-files\.com|\.webflow\.io/i },
      { name: "Framer", cat: "CMS", generator: /Framer/i, urls: /framerusercontent\.com|framer\.com/i },
      { name: "Drupal", cat: "CMS", generator: /Drupal/i, text: /Drupal\.settings|drupal-settings-json/i, versionGen: /Drupal\s+([\d.]+)/i },
      { name: "Joomla", cat: "CMS", generator: /Joomla/i, urls: /\/media\/jui\/|\/media\/system\/js\//i, versionGen: /Joomla!?\s+([\d.]+)/i },
      { name: "Ghost", cat: "CMS", generator: /Ghost/i, urls: /\/ghost\/|gh-card/i, versionGen: /Ghost\s+([\d.]+)/i },
      { name: "Blogger", cat: "CMS", generator: /Blogger/i, urls: /\.blogspot\.com|blogblog\.com/i },
      { name: "HubSpot CMS", cat: "CMS", urls: /hs-sites\.com|hubspotusercontent|hs-scripts\.com/i },
      { name: "Duda", cat: "CMS", urls: /irp-cdn\.multiscreensite\.com|dudamobile\.com/i, generator: /Duda/i },
      { name: "Contao", cat: "CMS", generator: /Contao/i },
      { name: "TYPO3", cat: "CMS", generator: /TYPO3/i },
      { name: "Craft CMS", cat: "CMS", generator: /Craft CMS/i, header: ["x-powered-by", /Craft CMS/i] },
      // Ecommerce
      { name: "WooCommerce", cat: "Ecommerce", urls: /\/wp-content\/plugins\/woocommerce/i, cookie: /^woocommerce_/i },
      { name: "Shopify", cat: "Ecommerce", urls: /cdn\.shopify\.com|\/cdn\/shop\//i, header: ["x-shopid", /.+/], text: /Shopify\.theme|window\.Shopify/i },
      { name: "Magento", cat: "Ecommerce", text: /Magento_|mage\/cookies|Mage\.Cookies|\/static\/version\d/i, cookie: /^(X-Magento|mage-)/i },
      { name: "PrestaShop", cat: "Ecommerce", text: /PrestaShop|prestashop/i, cookie: /^PrestaShop-/i },
      { name: "BigCommerce", cat: "Ecommerce", urls: /cdn\d*\.bigcommerce\.com/i },
      { name: "Squarespace Commerce", cat: "Ecommerce", urls: /squarespace-cdn\.com\/.*commerce/i },
      { name: "Ecwid", cat: "Ecommerce", urls: /app\.ecwid\.com|ecwid\.com\//i },
      { name: "Snipcart", cat: "Ecommerce", urls: /cdn\.snipcart\.com/i },
      // Page builders
      { name: "Elementor", cat: "Page Builder", urls: /\/wp-content\/plugins\/elementor/i, text: /elementor-(widget|element|section)/i, version: /elementor[^"']*?ver=([\d.]+)/i },
      { name: "Divi", cat: "Page Builder", urls: /\/wp-content\/themes\/Divi\//i, text: /et_pb_|et-builder/i },
      { name: "WPBakery Page Builder", cat: "Page Builder", text: /js_composer|wpb_(row|column|wrapper)|vc_row/i },
      { name: "Beaver Builder", cat: "Page Builder", text: /fl-builder|fl-row|fl-module/i },
      { name: "Bricks Builder", cat: "Page Builder", text: /\bbrxe-|id="brx-content"/i },
      { name: "Oxygen Builder", cat: "Page Builder", text: /ct_section|oxygen-vsb| oxy-/i },
      { name: "Gutenberg", cat: "Page Builder", text: /wp-block-[a-z]/i },
      // JS frameworks
      { name: "React", cat: "JS Framework", global: "react", globalVer: "reactVer" },
      { name: "Next.js", cat: "JS Framework", global: "next", text: /\/_next\/static\//i },
      { name: "Vue.js", cat: "JS Framework", global: "vue", globalVer: "vueVer" },
      { name: "Nuxt.js", cat: "JS Framework", global: "nuxt" },
      { name: "Angular", cat: "JS Framework", global: "angular", globalVer: "angularVer" },
      { name: "AngularJS", cat: "JS Framework", global: "angularjs" },
      { name: "Svelte", cat: "JS Framework", global: "svelte" },
      { name: "Gatsby", cat: "JS Framework", global: "gatsby" },
      { name: "Astro", cat: "JS Framework", global: "astro", generator: /Astro/i, versionGen: /Astro\s+v?([\d.]+)/i },
      { name: "Ember.js", cat: "JS Framework", global: "ember" },
      { name: "Backbone.js", cat: "JS Framework", global: "backbone" },
      // UI frameworks
      { name: "Bootstrap", cat: "UI Framework", urls: /bootstrap(\.min)?\.(css|js)|cdn\.jsdelivr\.net\/npm\/bootstrap/i, version: /bootstrap@?([\d.]+)/i },
      { name: "Tailwind CSS", cat: "UI Framework", urls: /cdn\.tailwindcss\.com/i, text: /--tw-[a-z]|tailwindcss/i },
      { name: "Foundation", cat: "UI Framework", urls: /foundation(\.min)?\.(css|js)/i },
      { name: "Bulma", cat: "UI Framework", urls: /bulma(\.min)?\.css/i },
      { name: "Material UI", cat: "UI Framework", text: /MuiButton|MuiBox|css-[a-z0-9]+-Mui/i },
      // JS libraries
      { name: "jQuery", cat: "JS Library", global: "jquery", globalVer: "jquery", urls: /jquery[.-]([\d.]+)?(\.min)?\.js/i, version: /jquery[.-]([\d.]+)(\.min)?\.js/i },
      { name: "jQuery UI", cat: "JS Library", urls: /jquery-ui|jquery\.ui/i },
      { name: "jQuery Migrate", cat: "JS Library", urls: /jquery-migrate/i },
      { name: "Lodash", cat: "JS Library", global: "lodash", urls: /lodash(\.min)?\.js/i },
      { name: "Underscore.js", cat: "JS Library", urls: /underscore(\.min)?\.js/i },
      { name: "GSAP", cat: "JS Library", global: "gsap", urls: /gsap(\.min)?\.js|TweenMax|cdnjs\.cloudflare\.com\/.*gsap/i },
      { name: "Swiper", cat: "JS Library", urls: /swiper[.-]/i },
      { name: "Slick", cat: "JS Library", urls: /slick(\.min)?\.(js|css)/i },
      { name: "Owl Carousel", cat: "JS Library", urls: /owl\.carousel/i },
      { name: "Modernizr", cat: "JS Library", global: "modernizr", urls: /modernizr/i },
      { name: "Moment.js", cat: "JS Library", urls: /moment(\.min)?\.js/i },
      { name: "Axios", cat: "JS Library", urls: /axios(\.min)?\.js/i },
      { name: "D3.js", cat: "JS Library", urls: /\bd3(\.v\d+)?(\.min)?\.js/i },
      { name: "Three.js", cat: "JS Library", urls: /three(\.min)?\.js|three\.module\.js/i },
      { name: "Lottie", cat: "JS Library", urls: /lottie(-player)?(\.min)?\.js/i },
      // Analytics
      { name: "Google Analytics", cat: "Analytics", text: /google-analytics\.com\/(analytics|ga)\.js|gtag\/js\?id=G-|\bUA-\d{4,}|\bG-[A-Z0-9]{6,}/i },
      { name: "Meta Pixel", cat: "Analytics", text: /connect\.facebook\.net\/[^"']*\/fbevents\.js|fbq\(/i },
      { name: "Hotjar", cat: "Analytics", text: /static\.hotjar\.com|hotjar\.com\/c\/hotjar/i },
      { name: "Microsoft Clarity", cat: "Analytics", text: /clarity\.ms\/tag|c\.clarity\.ms/i },
      { name: "Mixpanel", cat: "Analytics", text: /cdn\.mxpnl\.com|mixpanel/i },
      { name: "Segment", cat: "Analytics", text: /cdn\.segment\.com\/analytics\.js/i },
      { name: "Plausible", cat: "Analytics", text: /plausible\.io\/js/i },
      { name: "Matomo", cat: "Analytics", text: /matomo\.js|piwik\.js/i },
      { name: "Amplitude", cat: "Analytics", text: /cdn\.amplitude\.com|amplitude\.getInstance/i },
      { name: "Yandex Metrica", cat: "Analytics", text: /mc\.yandex\.ru\/metrika/i },
      // Tag managers
      { name: "Google Tag Manager", cat: "Tag Manager", text: /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]+/i },
      { name: "Tealium", cat: "Tag Manager", text: /tags\.tiqcdn\.com/i },
      { name: "Adobe Experience Platform", cat: "Tag Manager", text: /assets\.adobedtm\.com/i },
      // CDN
      { name: "Cloudflare", cat: "CDN", header: ["server", /cloudflare/i] },
      { name: "jsDelivr", cat: "CDN", urls: /cdn\.jsdelivr\.net/i },
      { name: "cdnjs", cat: "CDN", urls: /cdnjs\.cloudflare\.com/i },
      { name: "unpkg", cat: "CDN", urls: /unpkg\.com/i },
      { name: "Google Hosted Libraries", cat: "CDN", urls: /ajax\.googleapis\.com/i },
      { name: "Fastly", cat: "CDN", header: ["x-served-by", /cache-/i], header2: ["via", /varnish/i] },
      { name: "Amazon CloudFront", cat: "CDN", header: ["via", /cloudfront/i], urls: /cloudfront\.net/i },
      { name: "BunnyCDN", cat: "CDN", urls: /\.b-cdn\.net/i },
      { name: "KeyCDN", cat: "CDN", urls: /kxcdn\.com/i },
      // Hosting
      { name: "Vercel", cat: "Hosting", header: ["server", /Vercel/i], header2: ["x-vercel-id", /.+/] },
      { name: "Netlify", cat: "Hosting", header: ["server", /Netlify/i], header2: ["x-nf-request-id", /.+/] },
      { name: "GitHub Pages", cat: "Hosting", header: ["server", /GitHub\.com/i] },
      { name: "WP Engine", cat: "Hosting", header: ["x-powered-by", /WP Engine/i], text: /wpengine\.com/i },
      { name: "Kinsta", cat: "Hosting", header: ["x-kinsta-cache", /.+/], header2: ["server", /Kinsta/i] },
      { name: "Pantheon", cat: "Hosting", header: ["x-pantheon-styx-hostname", /.+/] },
      { name: "Amazon S3", cat: "Hosting", header: ["server", /AmazonS3/i] },
      // Web servers
      { name: "Nginx", cat: "Web Server", header: ["server", /nginx/i], versionHeader: ["server", /nginx\/([\d.]+)/i] },
      { name: "Apache", cat: "Web Server", header: ["server", /Apache/i], versionHeader: ["server", /Apache\/([\d.]+)/i] },
      { name: "Microsoft IIS", cat: "Web Server", header: ["server", /Microsoft-IIS/i], versionHeader: ["server", /IIS\/([\d.]+)/i] },
      { name: "LiteSpeed", cat: "Web Server", header: ["server", /LiteSpeed/i] },
      { name: "OpenResty", cat: "Web Server", header: ["server", /openresty/i] },
      { name: "Caddy", cat: "Web Server", header: ["server", /Caddy/i] },
      // Languages
      { name: "PHP", cat: "Programming Language", header: ["x-powered-by", /PHP/i], versionHeader: ["x-powered-by", /PHP\/([\d.]+)/i] },
      { name: "ASP.NET", cat: "Programming Language", header: ["x-powered-by", /ASP\.NET/i], header2: ["x-aspnet-version", /.+/] },
      { name: "Express", cat: "Programming Language", header: ["x-powered-by", /Express/i] },
      { name: "Ruby on Rails", cat: "Programming Language", header: ["x-powered-by", /Phusion Passenger/i], cookie: /^_session_id$/i },
      { name: "Java", cat: "Programming Language", cookie: /^JSESSIONID$/i },
      // Fonts
      { name: "Google Fonts", cat: "Fonts", urls: /fonts\.googleapis\.com|fonts\.gstatic\.com/i },
      { name: "Font Awesome", cat: "Fonts", urls: /font-?awesome|fontawesome|use\.fontawesome\.com|kit\.fontawesome\.com/i, text: /\bfa-[a-z]/i },
      { name: "Adobe Fonts (Typekit)", cat: "Fonts", urls: /use\.typekit\.net|use\.typekit\.com/i },
      // Marketing / Support
      { name: "Mailchimp", cat: "Marketing", text: /chimpstatic\.com|list-manage\.com|mc4wp/i },
      { name: "HubSpot", cat: "Marketing", text: /js\.hs-scripts\.com|js\.hsforms\.net/i },
      { name: "Klaviyo", cat: "Marketing", text: /static\.klaviyo\.com|klaviyo\.js/i },
      { name: "Intercom", cat: "Marketing", text: /widget\.intercom\.io|intercomcdn/i },
      { name: "Drift", cat: "Marketing", text: /js\.driftt\.com|drift\.com/i },
      { name: "Tawk.to", cat: "Marketing", text: /embed\.tawk\.to/i },
      { name: "Crisp", cat: "Marketing", text: /client\.crisp\.chat/i },
      { name: "Zendesk", cat: "Marketing", text: /static\.zdassets\.com|zopim/i },
      { name: "OneTrust", cat: "Marketing", text: /cdn\.cookielaw\.org|onetrust/i },
      { name: "Cookiebot", cat: "Marketing", text: /consent\.cookiebot\.com/i },
      // Security
      { name: "reCAPTCHA", cat: "Security", text: /google\.com\/recaptcha|gstatic\.com\/recaptcha/i },
      { name: "hCaptcha", cat: "Security", text: /hcaptcha\.com\/1\/api\.js|js\.hcaptcha\.com/i },
      { name: "Cloudflare Turnstile", cat: "Security", text: /challenges\.cloudflare\.com\/turnstile/i },
      { name: "Wordfence", cat: "Security", urls: /\/wp-content\/plugins\/wordfence/i },
      { name: "Sucuri", cat: "Security", header: ["x-sucuri-id", /.+/] },
    ];

    const TSD_CAT_ORDER = ["CMS", "Ecommerce", "Page Builder", "JS Framework", "UI Framework", "JS Library", "Analytics", "Tag Manager", "CDN", "Hosting", "Web Server", "Programming Language", "Fonts", "Marketing", "Security"];
    const TSD_CAT_COLOR = {
      "CMS": "#60a5fa", "Ecommerce": "#34d399", "Page Builder": "#a78bfa", "JS Framework": "#f472b6",
      "UI Framework": "#f59e0b", "JS Library": "#fbbf24", "Analytics": "#22d3ee", "Tag Manager": "#2dd4bf",
      "CDN": "#fb923c", "Hosting": "#818cf8", "Web Server": "#94a3b8", "Programming Language": "#f87171",
      "Fonts": "#c084fc", "Marketing": "#fb7185", "Security": "#4ade80",
    };

    // ── Matching engine ──
    function tsdEvaluate(ev) {
      const text = ev.urlBlob + "\n" + ev.headHtml + "\n" + ev.inlineJs;
      const H = ev.headers || {};
      const hdr = (n) => H[(n || "").toLowerCase()] || "";
      const out = [];
      const seen = new Set();

      for (const r of TSD_RULES) {
        let matched = false;
        if (r.global && ev.globals[r.global]) matched = true;
        if (!matched && r.urls && r.urls.test(ev.urlBlob)) matched = true;
        if (!matched && r.text && r.text.test(text)) matched = true;
        if (!matched && r.cookie && ev.cookies.some((c) => r.cookie.test(c))) matched = true;
        if (!matched && r.generator && ev.generators.some((g) => r.generator.test(g))) matched = true;
        if (!matched && r.meta && r.meta[1].test(ev.metas[r.meta[0]] || "")) matched = true;
        if (!matched && r.header && r.header[1].test(hdr(r.header[0]))) matched = true;
        if (!matched && r.header2 && r.header2[1].test(hdr(r.header2[0]))) matched = true;
        if (!matched) continue;

        let version = "";
        if (r.globalVer && typeof ev.globals[r.globalVer] === "string") version = ev.globals[r.globalVer];
        if (!version && r.global && typeof ev.globals[r.global] === "string") version = ev.globals[r.global];
        if (!version && r.versionGen) { for (const g of ev.generators) { const m = g.match(r.versionGen); if (m) { version = m[1]; break; } } }
        if (!version && r.versionHeader) { const m = hdr(r.versionHeader[0]).match(r.versionHeader[1]); if (m) version = m[1]; }
        if (!version && r.version) { const m = text.match(r.version); if (m && m[1]) version = m[1]; }

        const key = r.cat + "|" + r.name;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ name: r.name, cat: r.cat, version: (version || "").trim().slice(0, 24) });
      }
      return out;
    }

    // ── WordPress / Shopify deep extraction ──
    const TSD_PLUGIN_NAMES = {
      woocommerce: "WooCommerce", elementor: "Elementor", "elementor-pro": "Elementor Pro",
      "wordpress-seo": "Yoast SEO", "contact-form-7": "Contact Form 7", "wpforms-lite": "WPForms",
      wpforms: "WPForms", akismet: "Akismet", jetpack: "Jetpack", "wp-rocket": "WP Rocket",
      "w3-total-cache": "W3 Total Cache", "wp-super-cache": "WP Super Cache", "litespeed-cache": "LiteSpeed Cache",
      "all-in-one-seo-pack": "All in One SEO", "seo-by-rank-math": "Rank Math SEO", "rank-math": "Rank Math SEO",
      wordfence: "Wordfence Security", "really-simple-ssl": "Really Simple SSL", "mailchimp-for-wp": "Mailchimp for WP",
      "wp-mail-smtp": "WP Mail SMTP", "updraftplus": "UpdraftPlus", "redirection": "Redirection",
      "classic-editor": "Classic Editor", "advanced-custom-fields": "Advanced Custom Fields", "acf": "Advanced Custom Fields",
      "wpml": "WPML", "polylang": "Polylang", "wp-optimize": "WP-Optimize", "autoptimize": "Autoptimize",
      "smush": "Smush", "wp-smushit": "Smush", "ewww-image-optimizer": "EWWW Image Optimizer",
      "elementskit-lite": "ElementsKit", "essential-addons-for-elementor-lite": "Essential Addons for Elementor",
      "js_composer": "WPBakery", "revslider": "Slider Revolution", "layerslider": "LayerSlider",
      "ninja-forms": "Ninja Forms", "gravityforms": "Gravity Forms", "woocommerce-gateway-stripe": "WooCommerce Stripe",
      "mailpoet": "MailPoet", "the-events-calendar": "The Events Calendar", "yith-woocommerce-wishlist": "YITH Wishlist",
      "tablepress": "TablePress", "duplicate-post": "Yoast Duplicate Post", "wp-fastest-cache": "WP Fastest Cache",
    };
    const TSD_SHOPIFY_APPS = {
      "loox": "Loox", "judge.me": "Judge.me", "judgeme": "Judge.me", "klaviyo": "Klaviyo",
      "rechargecdn": "Recharge", "recharge": "Recharge", "yotpo": "Yotpo", "gorgias": "Gorgias",
      "pagefly": "PageFly", "shogun": "Shogun", "tidio": "Tidio", "privy": "Privy", "smile.io": "Smile.io",
      "stamped": "Stamped", "okendo": "Okendo", "rebuy": "Rebuy", "bold": "Bold", "vitals": "Vitals",
      "fera": "Fera", "growave": "Growave", "tapcart": "Tapcart", "attentive": "Attentive",
    };

    const tsdPrettySlug = (s) => s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const tsdUniq = (arr) => [...new Set(arr)];
    const tsdMatchAll = (text, re) => { const out = []; let m; const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"); while ((m = r.exec(text))) out.push(m[1]); return out; };
    const tsdEscapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    function tsdExtractWp(ev) {
      const text = ev.urlBlob + "\n" + ev.headHtml + "\n" + ev.inlineJs;
      const themes = tsdUniq(tsdMatchAll(text, /\/wp-content\/themes\/([a-z0-9_-]+)/gi)).slice(0, 4);
      const pluginSlugs = tsdUniq(tsdMatchAll(text, /\/wp-content\/plugins\/([a-z0-9_-]+)/gi)).slice(0, 40);
      const plugins = pluginSlugs.map((slug) => {
        let ver = "";
        const m = text.match(new RegExp("/wp-content/plugins/" + tsdEscapeRe(slug) + "/[^\"')\\s]*?[?&]ver=([0-9][0-9.]*)", "i"));
        if (m) ver = m[1];
        return { slug, name: TSD_PLUGIN_NAMES[slug] || tsdPrettySlug(slug), version: ver };
      }).sort((a, b) => a.name.localeCompare(b.name));
      let version = "";
      for (const g of ev.generators) { const m = g.match(/WordPress\s+([\d.]+)/i); if (m) { version = m[1]; break; } }
      return { version, themeSlugs: themes, plugins };
    }

    // ── Render ──
    let tsdLast = null; // { found, special, ev }

    function tsdChip(name, version) {
      return `<span class="tsd-chip">${escapeHtml(name)}${version ? `<span class="tsd-ver">${escapeHtml(version)}</span>` : ""}</span>`;
    }

    function tsdRender(data) {
      const { found, special, ev } = data;
      const hero = document.getElementById("tsdHero");
      const specialEl = document.getElementById("tsdSpecial");
      const listEl = document.getElementById("tsdList");

      // Use the browser's already-loaded favicon (no third-party request — nothing leaks)
      const favImg = ev.favicon ? `<img class="tsd-favicon" src="${escapeHtml(ev.favicon)}" alt="">` : "";
      hero.innerHTML = `
      ${favImg}
      <div class="tsd-hero-text">
        <div class="tsd-host">${escapeHtml(ev.hostname)}</div>
        <div class="tsd-count">${found.length} ${found.length === 1 ? "technology" : "technologies"} detected</div>
      </div>`;
      // Broken-favicon fallback — inline handlers are CSP-blocked on
      // extension pages, so this has to be attached programmatically.
      hero.querySelector(".tsd-favicon")?.addEventListener("error", (e) => {
        e.currentTarget.style.display = "none";
      }, { once: true });

      // Special cards (WordPress / Shopify)
      let sp = "";
      if (special.wp) {
        const wp = special.wp;
        const themeRows = wp.themes.length
          ? wp.themes.map((t) => `<div class="tsd-kv"><span class="tsd-k">Theme</span><span class="tsd-v">${escapeHtml(t.name)}${t.version ? ` <span class="tsd-ver">${escapeHtml(t.version)}</span>` : ""}${t.author ? ` <span class="tsd-by">by ${escapeHtml(t.author)}</span>` : ""}</span></div>`).join("")
          : "";
        const pluginChips = wp.plugins.length
          ? `<div class="tsd-kv tsd-kv--col"><span class="tsd-k">Plugins <span class="tsd-section-count">${wp.plugins.length}</span></span><div class="tsd-chips">${wp.plugins.map((p) => tsdChip(p.name, p.version)).join("")}</div></div>`
          : `<div class="tsd-kv"><span class="tsd-k">Plugins</span><span class="tsd-v tsd-muted">None detected in page markup (some load only where used)</span></div>`;
        sp += `
        <div class="tsd-card tsd-card--wp">
          <div class="tsd-card-head"><span class="tsd-card-badge">WP</span><span class="tsd-card-title">WordPress${wp.version ? ` <span class="tsd-ver">${escapeHtml(wp.version)}</span>` : ""}</span></div>
          ${themeRows}
          ${pluginChips}
        </div>`;
      }
      if (special.shopify) {
        const s = special.shopify;
        sp += `
        <div class="tsd-card tsd-card--shopify">
          <div class="tsd-card-head"><span class="tsd-card-badge tsd-card-badge--shopify">S</span><span class="tsd-card-title">Shopify</span></div>
          ${s.name ? `<div class="tsd-kv"><span class="tsd-k">Theme</span><span class="tsd-v">${escapeHtml(s.name)}${s.id ? ` <span class="tsd-ver">#${escapeHtml(String(s.id))}</span>` : ""}</span></div>` : ""}
          ${s.apps && s.apps.length ? `<div class="tsd-kv tsd-kv--col"><span class="tsd-k">Apps <span class="tsd-section-count">${s.apps.length}</span></span><div class="tsd-chips">${s.apps.map((a) => tsdChip(a, "")).join("")}</div></div>` : ""}
        </div>`;
      }
      specialEl.innerHTML = sp;

      // Categories
      const cats = tsdUniq([...TSD_CAT_ORDER, ...found.map((f) => f.cat)]).filter((c) => found.some((f) => f.cat === c));
      listEl.innerHTML = cats.map((cat) => {
        const items = found.filter((f) => f.cat === cat);
        const color = TSD_CAT_COLOR[cat] || "var(--accent)";
        return `
        <div class="tsd-cat">
          <div class="tsd-cat-head"><span class="tsd-dot" style="background:${color}"></span>${escapeHtml(cat)}<span class="tsd-section-count">${items.length}</span></div>
          <div class="tsd-chips">${items.map((f) => tsdChip(f.name, f.version)).join("")}</div>
        </div>`;
      }).join("") || `<p class="tseo-empty">No recognizable technologies found on this page.</p>`;
    }

    // ── Run ──
    const TSD_RESTRICTED = /^(chrome|chrome-extension|edge|devtools|about|view-source):/;
    const tsdBgFetch = (url) => new Promise((resolve) =>
      chrome.runtime.sendMessage({ type: "API_REQUEST", url, method: "GET" }, (res) => resolve(res || { ok: false })));
    let tsdRunning = false;

    function runTsd() {
      if (tsdRunning) return;
      const btn = document.getElementById("runTsd");
      const errEl = document.getElementById("tsdError");
      const resultsEl = document.getElementById("tsdResults");

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id || TSD_RESTRICTED.test(tab.url || "")) {
          errEl.textContent = "This page can't be scanned. Open a regular website tab.";
          resultsEl.classList.add("hidden");
          return;
        }
        errEl.textContent = "";
        tsdRunning = true;
        btn.textContent = "Scanning…";
        btn.disabled = true;

        chrome.scripting.executeScript({ target: { tabId: tab.id }, func: tsdPageScan }, async (results) => {
          const reset = () => { tsdRunning = false; btn.textContent = "↻ Re-scan"; btn.disabled = false; };
          if (chrome.runtime.lastError) { reset(); errEl.textContent = "Could not access this page: " + chrome.runtime.lastError.message; return; }
          const ev = results?.[0]?.result;
          if (!ev?.ok) { reset(); errEl.textContent = "Scan failed: " + (ev?.error || "unknown error"); return; }
          ev.favicon = tab.favIconUrl || "";

          // Pull raw HTML + headers (headers carry server / language / CDN signals)
          const main = await tsdBgFetch(ev.url);
          ev.headers = (main && main.ok && main.headers) ? main.headers : {};
          if (main && main.ok && main.body) {
            ev.headHtml = (ev.headHtml + "\n" + main.body).slice(0, 240000);
            // generator tags can live in the raw HTML even if JS stripped them
            const gm = main.body.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/gi) || [];
            gm.forEach((tag) => { const c = tag.match(/content=["']([^"']+)["']/i); if (c && !ev.generators.includes(c[1])) ev.generators.push(c[1]); });
          }

          const found = tsdEvaluate(ev);
          const special = {};

          if (found.some((f) => f.name === "WordPress")) {
            const wp = tsdExtractWp(ev);
            // Fetch the active theme's style.css header for a friendly name/version/author
            const themes = [];
            for (const slug of wp.themeSlugs.slice(0, 2)) {
              const res = await tsdBgFetch(`${ev.origin}/wp-content/themes/${slug}/style.css`);
              let name = tsdPrettySlug(slug), version = "", author = "";
              if (res && res.ok && res.body && /Theme Name:/i.test(res.body)) {
                const head = res.body.slice(0, 4000);
                const nm = head.match(/Theme Name:\s*(.+)/i); if (nm) name = nm[1].trim();
                const vm = head.match(/Version:\s*(.+)/i); if (vm) version = vm[1].trim();
                const am = head.match(/Author:\s*(.+)/i); if (am) author = am[1].trim().replace(/<[^>]+>/g, "");
              }
              themes.push({ slug, name, version, author });
            }
            special.wp = { version: wp.version, themes, plugins: wp.plugins };
          }

          if (ev.shopify || found.some((f) => f.name === "Shopify")) {
            const blob = ev.urlBlob + "\n" + ev.headHtml + "\n" + ev.inlineJs;
            const apps = tsdUniq(Object.keys(TSD_SHOPIFY_APPS).filter((k) => blob.toLowerCase().includes(k)).map((k) => TSD_SHOPIFY_APPS[k]));
            special.shopify = { name: ev.shopify?.name || "", id: ev.shopify?.id || "", apps };
          }

          reset();
          tsdLast = { found, special, ev };
          tsdRender(tsdLast);
          resultsEl.classList.remove("hidden");
        });
      });
    }

    document.getElementById("runTsd").addEventListener("click", runTsd);
    registerTabHook("tech-stack", runTsd);

    document.getElementById("tsdCopyReport").addEventListener("click", (e) => {
      if (!tsdLast) return;
      const { found, special, ev } = tsdLast;
      const md = [`# Tech Stack for ${ev.hostname}`, ""];
      if (special.wp) {
        md.push("## WordPress" + (special.wp.version ? ` ${special.wp.version}` : ""));
        special.wp.themes.forEach((t) => md.push(`- Theme: ${t.name}${t.version ? ` ${t.version}` : ""}${t.author ? ` by ${t.author}` : ""}`));
        if (special.wp.plugins.length) md.push(`- Plugins (${special.wp.plugins.length}): ${special.wp.plugins.map((p) => p.name + (p.version ? ` ${p.version}` : "")).join(", ")}`);
        md.push("");
      }
      if (special.shopify) {
        md.push("## Shopify");
        if (special.shopify.name) md.push(`- Theme: ${special.shopify.name}`);
        if (special.shopify.apps.length) md.push(`- Apps: ${special.shopify.apps.join(", ")}`);
        md.push("");
      }
      tsdUniq(found.map((f) => f.cat)).forEach((cat) => {
        md.push(`## ${cat}`);
        found.filter((f) => f.cat === cat).forEach((f) => md.push(`- ${f.name}${f.version ? ` ${f.version}` : ""}`));
        md.push("");
      });
      copyToClipboard(md.join("\n"), e.currentTarget);
    });

  }); // ─── end lazy init: tech-stack

  registerToolInit("json-formatter", () => {
    // ─── JSON FORMATTER / VALIDATOR ─────────────────────────────────────────────
    // Strict validation (exact line:col errors) + a CSP-safe relaxed parser that
    // repairs trailing commas, comments, single quotes and unquoted keys (no eval),
    // a collapsible tree with filter, key sorting, minify and copy/download.

    const jfInput = document.getElementById("jfInput");
    const jfOutput = document.getElementById("jfOutput");
    const jfTree = document.getElementById("jfTree");
    const jfStatus = document.getElementById("jfStatus");
    const jfStats = document.getElementById("jfStats");
    const jfTreeTools = document.getElementById("jfTreeTools");
    let jfParsed = undefined;
    let jfHasParsed = false;
    let jfView = "text";

    const jfIndentValue = () => {
      const v = document.getElementById("jfIndent").value;
      return v === "tab" ? "\t" : parseInt(v, 10);
    };

    // Deep key sort (objects only; arrays keep order)
    function jfDeepSort(v) {
      if (Array.isArray(v)) return v.map(jfDeepSort);
      if (v && typeof v === "object") {
        const out = {};
        Object.keys(v).sort().forEach((k) => { out[k] = jfDeepSort(v[k]); });
        return out;
      }
      return v;
    }
    const jfPrep = (v) => (document.getElementById("jfSort").checked ? jfDeepSort(v) : v);
    const jfFormatText = () => JSON.stringify(jfPrep(jfParsed), null, jfIndentValue());
    const jfMinifyText = () => JSON.stringify(jfPrep(jfParsed));

    const jfLineCol = (src, pos) => {
      let line = 1, col = 1;
      for (let k = 0; k < pos && k < src.length; k++) { if (src[k] === "\n") { line++; col = 1; } else col++; }
      return { line, col };
    };

    // ── CSP-safe relaxed (JSON5-lite) parser → returns a JS value ──
    function jfRelaxedParse(src) {
      let i = 0; const n = src.length;
      const isId = (c) => c && /[A-Za-z0-9_$]/.test(c);
      const err = (msg) => { const e = new Error(msg); e.pos = i; throw e; };
      const ws = () => {
        while (i < n) {
          const c = src[i];
          if (c === " " || c === "\t" || c === "\n" || c === "\r" || c === "\f" || c === "\v" || c === " " || c === "﻿") { i++; continue; }
          if (c === "/" && src[i + 1] === "/") { i += 2; while (i < n && src[i] !== "\n") i++; continue; }
          if (c === "/" && src[i + 1] === "*") { i += 2; while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++; i += 2; continue; }
          break;
        }
      };
      const ESC = { '"': '"', "'": "'", "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t", v: "\v", "0": "\0" };
      const str = () => {
        const q = src[i++]; let out = "";
        while (i < n) {
          const c = src[i++];
          if (c === q) return out;
          if (c === "\\") {
            const e = src[i++];
            if (e === "u") { const hex = src.slice(i, i + 4); i += 4; out += String.fromCharCode(parseInt(hex, 16)); }
            else if (e === "x") { const hex = src.slice(i, i + 2); i += 2; out += String.fromCharCode(parseInt(hex, 16)); }
            else if (e === "\n") { /* line continuation */ }
            else out += (e in ESC) ? ESC[e] : e;
          } else out += c;
        }
        err("Unterminated string");
      };
      const NUM_RE = /^[+-]?(?:0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|Infinity|NaN)/;
      const num = () => {
        const m = src.slice(i).match(NUM_RE);
        if (!m) err("Invalid number");
        i += m[0].length;
        return Number(m[0]);
      };
      const lit = (word, val) => { if (src.substr(i, word.length) === word && !isId(src[i + word.length])) { i += word.length; return { v: val }; } return null; };
      const key = () => {
        ws();
        const c = src[i];
        if (c === '"' || c === "'") return str();
        let k = "";
        while (i < n && isId(src[i])) k += src[i++];
        if (!k) err("Expected property name");
        return k;
      };
      const value = () => {
        ws();
        const c = src[i];
        if (c === undefined) err("Unexpected end of input");
        if (c === "{") return obj();
        if (c === "[") return arr();
        if (c === '"' || c === "'") return str();
        const t = lit("true", true) || lit("false", false) || lit("null", null);
        if (t) return t.v;
        if (c === "-" || c === "+" || c === "." || (c >= "0" && c <= "9")) return num();
        if (src.substr(i, 8) === "Infinity") { i += 8; return Infinity; }
        if (src.substr(i, 3) === "NaN") { i += 3; return NaN; }
        err("Unexpected token " + JSON.stringify(c));
      };
      const obj = () => {
        i++; const o = {}; ws();
        if (src[i] === "}") { i++; return o; }
        for (; ;) {
          ws();
          if (src[i] === "}") { i++; return o; } // trailing comma
          const k = key(); ws();
          if (src[i] !== ":") err("Expected ':' after property name");
          i++;
          o[k] = value(); ws();
          if (src[i] === ",") { i++; continue; }
          if (src[i] === "}") { i++; return o; }
          err("Expected ',' or '}'");
        }
      };
      const arr = () => {
        i++; const a = []; ws();
        if (src[i] === "]") { i++; return a; }
        for (; ;) {
          ws();
          if (src[i] === "]") { i++; return a; } // trailing comma
          a.push(value()); ws();
          if (src[i] === ",") { i++; continue; }
          if (src[i] === "]") { i++; return a; }
          err("Expected ',' or ']'");
        }
      };
      const v = value();
      ws();
      if (i < n) err("Unexpected trailing characters");
      return v;
    }

    // Parse → { ok, value, repaired, error:{message,line,col,snippet} }
    function jfParse(text, lenient) {
      let strictOk = false, strictVal;
      try { strictVal = JSON.parse(text); strictOk = true; } catch (e) {
        if (!lenient) {
          const info = jfStrictError(text, e);
          return { ok: false, error: info };
        }
      }
      if (strictOk) return { ok: true, value: strictVal, repaired: false };
      // lenient path
      try {
        const v = jfRelaxedParse(text);
        return { ok: true, value: v, repaired: true };
      } catch (e) {
        const lc = jfLineCol(text, e.pos || 0);
        return { ok: false, error: { message: e.message, line: lc.line, col: lc.col, snippet: jfSnippet(text, lc.line, lc.col) } };
      }
    }

    function jfStrictError(src, e) {
      let line, col;
      const lc = /line (\d+) column (\d+)/.exec(e.message);
      if (lc) { line = +lc[1]; col = +lc[2]; }
      else { const pm = /position (\d+)/.exec(e.message); if (pm) { const r = jfLineCol(src, +pm[1]); line = r.line; col = r.col; } }
      const message = e.message.replace(/ in JSON at position \d+.*$/, "").replace(/ in JSON$/, "");
      return { message, line, col, snippet: (line ? jfSnippet(src, line, col) : "") };
    }

    function jfSnippet(src, line, col) {
      const lines = src.split("\n");
      const text = lines[line - 1] || "";
      const trimmed = text.length > 80 ? text.slice(0, 80) + "…" : text;
      const caret = " ".repeat(Math.max(0, Math.min(col - 1, 80))) + "^";
      return trimmed + "\n" + caret;
    }

    // ── Stats ──
    function jfComputeStats(v) {
      let nodes = 0, keys = 0, depth = 0;
      (function walk(x, d) {
        nodes++; if (d > depth) depth = d;
        if (x && typeof x === "object") {
          if (Array.isArray(x)) x.forEach((e) => walk(e, d + 1));
          else { const ks = Object.keys(x); keys += ks.length; ks.forEach((k) => walk(x[k], d + 1)); }
        }
      })(v, 0);
      return { nodes, keys, depth };
    }

    // ── Tree ──
    const JF_TREE_CAP = 8000;
    function jfCount(v, st) {
      st.n++; if (st.n > JF_TREE_CAP) return;
      if (v && typeof v === "object") {
        if (Array.isArray(v)) { for (const e of v) { jfCount(e, st); if (st.n > JF_TREE_CAP) return; } }
        else { for (const k in v) { jfCount(v[k], st); if (st.n > JF_TREE_CAP) return; } }
      }
    }

    function jfValHtml(value) {
      let type = value === null ? "null" : typeof value;
      let disp;
      if (type === "string") disp = JSON.stringify(value);
      else disp = String(value);
      const full = disp;
      if (disp.length > 200) disp = disp.slice(0, 200) + "…";
      const copyVal = type === "string" ? value : String(value);
      return `<span class="jf-val jf-val--${type}" data-copy="${escapeHtml(copyVal)}" title="Click to copy">${escapeHtml(disp)}</span>`;
    }

    function jfBuildNode(key, value, q) {
      const isObj = value && typeof value === "object";
      const keyMatch = q && key !== null && String(key).toLowerCase().includes(q);
      if (isObj) {
        const entries = Array.isArray(value) ? value.map((v, idx) => [idx, v]) : Object.entries(value);
        const childQ = keyMatch ? "" : q;
        const childHtml = entries.map(([k, v]) => jfBuildNode(k, v, childQ)).join("");
        if (q && !keyMatch && !childHtml) return "";
        const isArr = Array.isArray(value);
        const open = isArr ? "[" : "{", close = isArr ? "]" : "}";
        const count = entries.length;
        const meta = isArr ? `${count} item${count === 1 ? "" : "s"}` : `${count} key${count === 1 ? "" : "s"}`;
        const keyHtml = key === null ? "" : (typeof key === "number"
          ? `<span class="jf-idx">${key}</span><span class="jf-punc">: </span>`
          : `<span class="jf-key">"${escapeHtml(String(key))}"</span><span class="jf-punc">: </span>`);
        return `<div class="jf-node">
        <div class="jf-row jf-row--branch"><span class="jf-toggle"></span>${keyHtml}<span class="jf-punc">${open}</span><span class="jf-ellipsis">…${close}</span> <span class="jf-meta">${meta}</span></div>
        <div class="jf-children">${childHtml}</div>
        <div class="jf-row jf-row--close"><span class="jf-punc">${close}</span></div>
      </div>`;
      }
      const valMatch = q && jfValMatch(value, q);
      if (q && !keyMatch && !valMatch) return "";
      const keyHtml = key === null ? "" : (typeof key === "number"
        ? `<span class="jf-idx">${key}</span><span class="jf-punc">: </span>`
        : `<span class="jf-key">"${escapeHtml(String(key))}"</span><span class="jf-punc">: </span>`);
      return `<div class="jf-row jf-row--leaf">${keyHtml}${jfValHtml(value)}</div>`;
    }
    const jfValMatch = (value, q) => {
      const type = value === null ? "null" : typeof value;
      const s = type === "string" ? value : String(value);
      return s.toLowerCase().includes(q);
    };

    function jfRenderTree(q) {
      if (!jfHasParsed) { jfTree.innerHTML = '<p class="tseo-empty">Nothing to show yet.</p>'; return; }
      const st = { n: 0 };
      jfCount(jfParsed, st);
      if (st.n > JF_TREE_CAP) {
        jfTree.innerHTML = `<p class="tseo-empty">Too large for the tree view (${st.n > JF_TREE_CAP ? JF_TREE_CAP + "+" : st.n} nodes). Use the Text view.</p>`;
        return;
      }
      const html = jfBuildNode(null, jfParsed, (q || "").trim().toLowerCase());
      jfTree.innerHTML = html || '<p class="tseo-empty">No nodes match the filter.</p>';
    }

    // ── Status / stats display ──
    function jfShowValid(repaired) {
      const s = jfComputeStats(jfParsed);
      jfStatus.className = "jf-status jf-status--ok";
      jfStatus.innerHTML = `<span>${SI.pass} Valid JSON${repaired ? " · auto-repaired" : ""}</span>`;
      const bytes = new Blob([jfMinifyText()]).size;
      const size = bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
      jfStats.textContent = ` · ${s.nodes.toLocaleString()} nodes · ${s.keys.toLocaleString()} keys · depth ${s.depth} · ${size}`;
    }
    function jfShowError(err) {
      jfStatus.className = "jf-status jf-status--err";
      const loc = err.line ? ` (line ${err.line}, column ${err.col})` : "";
      jfStatus.innerHTML = `<span>${SI.fail} ${escapeHtml(err.message)}${loc}</span>` +
        (err.snippet ? `<pre class="jf-err-snippet">${escapeHtml(err.snippet)}</pre>` : "");
      jfStats.textContent = "";
    }
    function jfClearStatus() { jfStatus.className = "jf-status"; jfStatus.innerHTML = ""; jfStats.textContent = ""; }

    // ── Validate (live) ──
    function jfValidate() {
      const text = jfInput.value;
      if (!text.trim()) { jfHasParsed = false; jfParsed = undefined; jfClearStatus(); if (jfView === "tree") jfTree.innerHTML = ""; return false; }
      const res = jfParse(text, document.getElementById("jfLenient").checked);
      if (res.ok) {
        jfParsed = res.value; jfHasParsed = true;
        jfShowValid(res.repaired);
        if (jfView === "tree") jfRenderTree(document.getElementById("jfSearch").value);
        return true;
      }
      jfHasParsed = false; jfParsed = undefined;
      jfShowError(res.error);
      if (jfView === "tree") jfTree.innerHTML = "";
      return false;
    }

    // ── Actions ──
    function jfDoFormat(minify) {
      if (!jfValidate()) return;
      jfOutput.value = minify ? jfMinifyText() : jfFormatText();
      jfSetView("text");
    }

    function jfSetView(view) {
      jfView = view;
      document.querySelectorAll("#json-formatter .jf-view-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
      jfTreeTools.classList.toggle("hidden", view !== "tree");
      jfOutput.classList.toggle("hidden", view === "tree");
      jfTree.classList.toggle("hidden", view !== "tree");
      if (view === "tree") {
        if (!jfHasParsed) jfValidate();
        jfRenderTree(document.getElementById("jfSearch").value);
      } else if (jfHasParsed && !jfOutput.value) {
        jfOutput.value = jfFormatText();
      }
    }

    document.getElementById("jfFormat").addEventListener("click", () => jfDoFormat(false));
    document.getElementById("jfMinify").addEventListener("click", () => jfDoFormat(true));
    document.getElementById("jfSample").addEventListener("click", () => {
      jfInput.value = JSON.stringify({
        name: "Web Dev Tools", version: 1.4, active: true, tags: ["chrome", "devtools", "json"],
        author: { name: "JZ", url: "https://example.com", verified: true },
        tools: [{ id: "json-formatter", stars: 1280 }, { id: "tech-stack", stars: 940 }],
        meta: { released: "2026-06-13", deprecated: null },
      });
      jfDoFormat(false);
    });
    document.getElementById("jfClear").addEventListener("click", () => {
      jfInput.value = ""; jfOutput.value = ""; jfTree.innerHTML = "";
      jfHasParsed = false; jfParsed = undefined; jfClearStatus();
      document.getElementById("jfSearch").value = "";
    });

    let jfDebounce;
    jfInput.addEventListener("input", () => { clearTimeout(jfDebounce); jfDebounce = setTimeout(jfValidate, 300); });
    ["jfSort", "jfLenient", "jfIndent"].forEach((id) => document.getElementById(id).addEventListener("change", () => {
      if (jfValidate() && jfView === "text" && jfOutput.value) jfOutput.value = jfFormatText();
    }));

    document.querySelectorAll("#json-formatter .jf-view-btn").forEach((b) => b.addEventListener("click", () => jfSetView(b.dataset.view)));
    document.getElementById("jfSearch").addEventListener("input", (e) => jfRenderTree(e.target.value));
    document.getElementById("jfExpandAll").addEventListener("click", () => jfTree.querySelectorAll(".jf-node.collapsed").forEach((n) => n.classList.remove("collapsed")));
    document.getElementById("jfCollapseAll").addEventListener("click", () => jfTree.querySelectorAll(".jf-node").forEach((n) => { if (n.querySelector(".jf-children").children.length) n.classList.add("collapsed"); }));

    jfTree.addEventListener("click", (e) => {
      const val = e.target.closest(".jf-val");
      if (val) { copyToClipboard(val.dataset.copy, val); return; }
      const branch = e.target.closest(".jf-row--branch");
      if (branch) branch.parentElement.classList.toggle("collapsed");
    });

    document.getElementById("jfCopy").addEventListener("click", (e) => {
      if (!jfHasParsed) { showToast("Nothing to copy. Fix the JSON first", "error"); return; }
      copyToClipboard(jfView === "text" && jfOutput.value ? jfOutput.value : jfFormatText(), e.currentTarget);
    });
    document.getElementById("jfDownload").addEventListener("click", () => {
      if (!jfHasParsed) { showToast("Nothing to download. Fix the JSON first", "error"); return; }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([jfFormatText()], { type: "application/json" }));
      a.download = "data.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      showToast("Downloaded data.json");
    });

  }); // ─── end lazy init: json-formatter

  registerToolInit("diff-checker", () => {
    // ─── DIFF CHECKER ───────────────────────────────────────────────────────────
    // LCS line diff (with common prefix/suffix trimming + a size guard) plus
    // intra-line word-level highlighting for changed lines. Side-by-side & unified
    // views, ignore-whitespace/case, collapse-unchanged, copy as a patch.

    const DIFF_DP_CAP = 4000000; // n*m guard for the DP table (~16 MB Uint32)

    // Generic LCS diff over arrays → ops [{t:'='|'-'|'+', ai, bi}]
    function diffLcs(a, b, keyOf) {
      const ka = a.map(keyOf), kb = b.map(keyOf);
      let aLo = 0, bLo = 0, aHi = a.length, bHi = b.length;
      const pre = [];
      while (aLo < aHi && bLo < bHi && ka[aLo] === kb[bLo]) { pre.push({ t: "=", ai: aLo, bi: bLo }); aLo++; bLo++; }
      const suf = [];
      while (aHi > aLo && bHi > bLo && ka[aHi - 1] === kb[bHi - 1]) { aHi--; bHi--; suf.push({ t: "=", ai: aHi, bi: bHi }); }
      suf.reverse();
      const mid = diffMiddle(ka, kb, aLo, aHi, bLo, bHi);
      return pre.concat(mid, suf);
    }

    function diffMiddle(ka, kb, a0, a1, b0, b1) {
      const n = a1 - a0, m = b1 - b0, out = [];
      if (n === 0 && m === 0) return out;
      if (n === 0) { for (let j = b0; j < b1; j++) out.push({ t: "+", bi: j }); return out; }
      if (m === 0) { for (let i = a0; i < a1; i++) out.push({ t: "-", ai: i }); return out; }
      if (n * m > DIFF_DP_CAP) { // too large — degrade to block replace
        for (let i = a0; i < a1; i++) out.push({ t: "-", ai: i });
        for (let j = b0; j < b1; j++) out.push({ t: "+", bi: j });
        return out;
      }
      const dp = [];
      for (let i = 0; i <= n; i++) dp.push(new Uint32Array(m + 1));
      for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
          dp[i][j] = ka[a0 + i] === kb[b0 + j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
      }
      let i = 0, j = 0;
      while (i < n && j < m) {
        if (ka[a0 + i] === kb[b0 + j]) { out.push({ t: "=", ai: a0 + i, bi: b0 + j }); i++; j++; }
        else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: "-", ai: a0 + i }); i++; }
        else { out.push({ t: "+", bi: b0 + j }); j++; }
      }
      while (i < n) { out.push({ t: "-", ai: a0 + i }); i++; }
      while (j < m) { out.push({ t: "+", bi: b0 + j }); j++; }
      return out;
    }

    const diffSplitLines = (text) => (text === "" ? [] : text.split("\n"));

    function diffWordHtml(aLine, bLine) {
      const tok = (s) => s.match(/[A-Za-z0-9_]+|\s+|[^A-Za-z0-9_\s]/g) || [];
      const at = tok(aLine), bt = tok(bLine);
      const ops = diffLcs(at, bt, (x) => x);
      let L = "", R = "";
      for (const op of ops) {
        if (op.t === "=") { L += escapeHtml(at[op.ai]); R += escapeHtml(bt[op.bi]); }
        else if (op.t === "-") L += `<span class="diff-wd diff-wd-del">${escapeHtml(at[op.ai])}</span>`;
        else R += `<span class="diff-wd diff-wd-add">${escapeHtml(bt[op.bi])}</span>`;
      }
      return { L, R };
    }

    // ── State ──
    const diffA = document.getElementById("diffA");
    const diffB = document.getElementById("diffB");
    const diffResult = document.getElementById("diffResult");
    const diffStats = document.getElementById("diffStats");
    let diffView = "split";
    let diffState = null; // { a, b, ops }

    function diffCompute() {
      const aText = diffA.value, bText = diffB.value;
      if (!aText && !bText) { diffState = null; diffStats.textContent = ""; diffResult.innerHTML = '<p class="diff-empty">Paste text into both panes to see the difference.</p>'; return; }
      const a = diffSplitLines(aText), b = diffSplitLines(bText);
      const ignoreWs = document.getElementById("diffIgnoreWs").checked;
      const ignoreCase = document.getElementById("diffIgnoreCase").checked;
      const keyOf = (s) => { let x = s; if (ignoreWs) x = x.replace(/\s+/g, " ").trim(); if (ignoreCase) x = x.toLowerCase(); return x; };
      const ops = diffLcs(a, b, keyOf);
      diffState = { a, b, ops };
      const adds = ops.filter((o) => o.t === "+").length;
      const dels = ops.filter((o) => o.t === "-").length;
      diffStats.textContent = adds || dels ? ` · +${adds} −${dels}` : " · identical";
      diffRender();
    }

    function diffRender() {
      if (!diffState) return;
      const { a, b, ops } = diffState;
      if (!ops.some((o) => o.t !== "=")) {
        diffResult.innerHTML = '<p class="diff-same">The two inputs are identical.</p>';
        return;
      }
      diffResult.innerHTML = diffView === "split" ? diffRenderSplit(a, b, ops) : diffRenderUnified(a, b, ops);
    }

    const diffCollapseOn = () => document.getElementById("diffCollapse").checked;
    const diffGap = (n) => `<div class="diff-collapsed">⋯ ${n} unchanged line${n === 1 ? "" : "s"} ⋯</div>`;

    function diffRenderUnified(a, b, ops) {
      const collapse = diffCollapseOn();
      let html = "", run = 0;
      const flush = () => { if (run) { html += diffGap(run); run = 0; } };
      for (const op of ops) {
        if (op.t === "=") {
          if (collapse) { run++; continue; }
          html += `<div class="diff-uni-row"><span class="diff-ln">${op.ai + 1}</span><span class="diff-ln">${op.bi + 1}</span><span class="diff-marker"> </span><span class="diff-content">${escapeHtml(a[op.ai]) || "&nbsp;"}</span></div>`;
        } else if (op.t === "-") {
          flush();
          html += `<div class="diff-uni-row diff-row--del"><span class="diff-ln">${op.ai + 1}</span><span class="diff-ln"></span><span class="diff-marker">−</span><span class="diff-content">${escapeHtml(a[op.ai]) || "&nbsp;"}</span></div>`;
        } else {
          flush();
          html += `<div class="diff-uni-row diff-row--add"><span class="diff-ln"></span><span class="diff-ln">${op.bi + 1}</span><span class="diff-marker">+</span><span class="diff-content">${escapeHtml(b[op.bi]) || "&nbsp;"}</span></div>`;
        }
      }
      flush();
      return html;
    }

    function diffRenderSplit(a, b, ops) {
      // Build aligned rows, pairing del/add within a change block for word diff
      const rows = [];
      let dels = [], adds = [];
      const flushBlock = () => {
        const pairs = Math.min(dels.length, adds.length);
        for (let k = 0; k < pairs; k++) {
          const w = diffWordHtml(a[dels[k]], b[adds[k]]);
          rows.push({ type: "chg", ln: dels[k] + 1, rn: adds[k] + 1, l: w.L, r: w.R });
        }
        for (let k = pairs; k < dels.length; k++) rows.push({ type: "del", ln: dels[k] + 1, l: escapeHtml(a[dels[k]]) });
        for (let k = pairs; k < adds.length; k++) rows.push({ type: "add", rn: adds[k] + 1, r: escapeHtml(b[adds[k]]) });
        dels = []; adds = [];
      };
      for (const op of ops) {
        if (op.t === "=") { flushBlock(); rows.push({ type: "eq", ln: op.ai + 1, rn: op.bi + 1, l: escapeHtml(a[op.ai]), r: escapeHtml(b[op.bi]) }); }
        else if (op.t === "-") dels.push(op.ai);
        else adds.push(op.bi);
      }
      flushBlock();

      const collapse = diffCollapseOn();
      let html = "", run = 0;
      const flush = () => { if (run) { html += diffGap(run); run = 0; } };
      const cell = (cls, ln, content) =>
        `<div class="diff-cell ${cls}"><span class="diff-ln">${ln != null ? ln : ""}</span><span class="diff-content">${content || "&nbsp;"}</span></div>`;
      for (const r of rows) {
        if (r.type === "eq") {
          if (collapse) { run++; continue; }
          html += `<div class="diff-split-row">${cell("", r.ln, r.l)}${cell("", r.rn, r.r)}</div>`;
        } else if (r.type === "chg") {
          flush();
          html += `<div class="diff-split-row">${cell("diff-cell--del", r.ln, r.l)}${cell("diff-cell--add", r.rn, r.r)}</div>`;
        } else if (r.type === "del") {
          flush();
          html += `<div class="diff-split-row">${cell("diff-cell--del", r.ln, r.l)}${cell("diff-cell--empty", null, "")}</div>`;
        } else {
          flush();
          html += `<div class="diff-split-row">${cell("diff-cell--empty", null, "")}${cell("diff-cell--add", r.rn, r.r)}</div>`;
        }
      }
      flush();
      return html;
    }

    function diffSetView(view) {
      diffView = view;
      document.querySelectorAll("#diff-checker .diff-view-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.view === view));
      diffRender();
    }

    // ── Wiring ──
    let diffDebounce;
    const diffTrigger = () => { clearTimeout(diffDebounce); diffDebounce = setTimeout(diffCompute, 250); };
    diffA.addEventListener("input", diffTrigger);
    diffB.addEventListener("input", diffTrigger);
    ["diffIgnoreWs", "diffIgnoreCase", "diffCollapse"].forEach((id) => document.getElementById(id).addEventListener("change", diffCompute));
    document.querySelectorAll("#diff-checker .diff-view-btn").forEach((btn) => btn.addEventListener("click", () => diffSetView(btn.dataset.view)));

    document.getElementById("diffSwap").addEventListener("click", () => { const t = diffA.value; diffA.value = diffB.value; diffB.value = t; diffCompute(); });
    document.getElementById("diffClear").addEventListener("click", () => { diffA.value = ""; diffB.value = ""; diffCompute(); });
    document.getElementById("diffSample").addEventListener("click", () => {
      diffA.value = "function greet(name) {\n  console.log('Hi ' + name);\n  return true;\n}\n\nconst x = 1;";
      diffB.value = "function greet(name, greeting) {\n  console.log(greeting + ' ' + name);\n  return true;\n}\n\nconst x = 2;\nconst y = 3;";
      diffCompute();
    });

    document.getElementById("diffCopy").addEventListener("click", (e) => {
      if (!diffState) { showToast("Nothing to copy yet", "error"); return; }
      const { a, b, ops } = diffState;
      const lines = ops.map((op) => op.t === "=" ? " " + a[op.ai] : op.t === "-" ? "-" + a[op.ai] : "+" + b[op.bi]);
      copyToClipboard(lines.join("\n"), e.currentTarget);
    });

  }); // ─── end lazy init: diff-checker

  registerToolInit("ruler-overlay", () => {
    // ─── PIXEL RULER & DESIGN OVERLAY ───────────────────────────────────────────
    // Two injected on-page tools. The Ruler draws crosshair guides + a drag-to-
    // measure box and reads element sizes on hover. The Overlay drops a design
    // image over the page with opacity / position / scale / difference-blend / lock.
    // Both are self-contained (no closures) with re-injection cleanup guards.

    // ── Injected: Page Ruler ──
    function rulerTool() {
      if (window.__wdtRulerCleanup) window.__wdtRulerCleanup();
      const Z = 2147483600;
      const style = document.createElement("style");
      style.id = "__wdtRulerStyle";
      style.textContent =
        "#__wdtRulerLayer{position:fixed!important;inset:0!important;z-index:" + Z + "!important;cursor:crosshair!important}" +
        ".__wdtrLine{position:fixed!important;background:#2f81f7!important;z-index:" + Z + "!important;pointer-events:none!important}" +
        ".__wdtrHL{left:0!important;right:0!important;height:1px!important}" +
        ".__wdtrVL{top:0!important;bottom:0!important;width:1px!important}" +
        "#__wdtRulerBox{position:fixed!important;border:1px solid #2f81f7!important;background:rgba(47,129,247,.12)!important;z-index:" + Z + "!important;pointer-events:none!important;display:none}" +
        "#__wdtRulerElt{position:fixed!important;border:1px solid #f472b6!important;background:rgba(244,114,182,.10)!important;z-index:" + Z + "!important;pointer-events:none!important;display:none}" +
        "#__wdtRulerTag{position:fixed!important;z-index:" + (Z + 1) + "!important;background:#2f81f7!important;color:#fff!important;font:600 11px/1.4 system-ui,sans-serif!important;padding:2px 6px!important;border-radius:4px!important;pointer-events:none!important;white-space:nowrap!important;display:none}" +
        "#__wdtRulerHint{position:fixed!important;top:12px!important;left:50%!important;transform:translateX(-50%)!important;z-index:" + (Z + 2) + "!important;background:#1b1f24!important;color:#e6edf3!important;font:600 12px/1.5 system-ui,sans-serif!important;padding:6px 12px!important;border-radius:8px!important;pointer-events:none!important;box-shadow:0 4px 16px rgba(0,0,0,.4)!important}";
      document.documentElement.appendChild(style);

      const layer = document.createElement("div"); layer.id = "__wdtRulerLayer";
      const hLine = document.createElement("div"); hLine.className = "__wdtrLine __wdtrHL";
      const vLine = document.createElement("div"); vLine.className = "__wdtrLine __wdtrVL";
      const box = document.createElement("div"); box.id = "__wdtRulerBox";
      const elt = document.createElement("div"); elt.id = "__wdtRulerElt";
      const tag = document.createElement("div"); tag.id = "__wdtRulerTag";
      const hint = document.createElement("div"); hint.id = "__wdtRulerHint";
      hint.textContent = "Drag to measure · hover to size an element · Esc to exit";
      document.documentElement.append(layer, hLine, vLine, box, elt, tag, hint);

      let dragging = false, sx = 0, sy = 0;
      const showTag = (text, left, top) => {
        tag.style.display = "block"; tag.textContent = text;
        tag.style.left = Math.max(4, Math.min(left, window.innerWidth - tag.offsetWidth - 4)) + "px";
        tag.style.top = Math.max(4, top) + "px";
      };

      const onMove = (e) => {
        const mx = e.clientX, my = e.clientY;
        hLine.style.top = my + "px"; vLine.style.left = mx + "px";
        if (dragging) {
          const x = Math.min(sx, mx), y = Math.min(sy, my), w = Math.abs(mx - sx), h = Math.abs(my - sy);
          box.style.left = x + "px"; box.style.top = y + "px"; box.style.width = w + "px"; box.style.height = h + "px";
          showTag(w + " × " + h + " px", x + w + 8, y);
        } else {
          layer.style.pointerEvents = "none";
          const el = document.elementFromPoint(mx, my);
          layer.style.pointerEvents = "auto";
          if (el && el !== document.documentElement && el !== document.body) {
            const r = el.getBoundingClientRect();
            elt.style.display = "block";
            elt.style.left = r.left + "px"; elt.style.top = r.top + "px";
            elt.style.width = r.width + "px"; elt.style.height = r.height + "px";
            showTag(Math.round(r.width) + " × " + Math.round(r.height) + " px", r.left, r.top - 22);
          } else { elt.style.display = "none"; tag.style.display = "none"; }
        }
      };
      const onDown = (e) => {
        dragging = true; sx = e.clientX; sy = e.clientY;
        box.style.display = "block"; box.style.left = sx + "px"; box.style.top = sy + "px"; box.style.width = "0"; box.style.height = "0";
        elt.style.display = "none";
        e.preventDefault();
      };
      const onUp = (e) => {
        if (!dragging) return;
        dragging = false;
        if (Math.abs(e.clientX - sx) < 3 && Math.abs(e.clientY - sy) < 3) { box.style.display = "none"; tag.style.display = "none"; }
      };
      const onKey = (e) => { if (e.key === "Escape") cleanup(); };

      layer.addEventListener("mousemove", onMove, true);
      layer.addEventListener("mousedown", onDown, true);
      window.addEventListener("mouseup", onUp, true);
      window.addEventListener("keydown", onKey, true);

      const cleanup = () => {
        layer.removeEventListener("mousemove", onMove, true);
        layer.removeEventListener("mousedown", onDown, true);
        window.removeEventListener("mouseup", onUp, true);
        window.removeEventListener("keydown", onKey, true);
        [layer, hLine, vLine, box, elt, tag, hint, style].forEach((n) => n.remove());
        window.__wdtRulerCleanup = null;
      };
      window.__wdtRulerCleanup = cleanup;
    }

    // ── Injected: Design Overlay ──
    function overlayTool(dataUrl) {
      if (window.__wdtOverlayCleanup) window.__wdtOverlayCleanup();
      const Z = 2147483600;
      const style = document.createElement("style");
      style.id = "__wdtOverlayStyle";
      style.textContent =
        "#__wdtOverlayImg{position:absolute!important;top:0!important;left:0!important;z-index:" + Z + "!important;opacity:.5;max-width:none!important;height:auto!important;user-select:none!important;transform-origin:top left!important}" +
        "#__wdtOverlayPanel{position:fixed!important;top:16px!important;right:16px!important;z-index:" + (Z + 1) + "!important;width:236px!important;background:#1b1f24!important;color:#e6edf3!important;font:12px/1.5 system-ui,sans-serif!important;border:1px solid #30363d!important;border-radius:10px!important;box-shadow:0 8px 30px rgba(0,0,0,.5)!important;overflow:hidden!important}" +
        "#__wdtOverlayPanel *{box-sizing:border-box!important;margin:0;font-family:inherit!important}" +
        ".__wdtoHead{display:flex!important;align-items:center!important;justify-content:space-between!important;padding:8px 10px!important;background:#22272e!important;cursor:move!important;font-weight:600!important}" +
        ".__wdtoClose{cursor:pointer!important;background:none!important;border:none!important;color:#adbac7!important;font-size:17px!important;line-height:1!important;padding:0 2px!important}" +
        ".__wdtoBody{padding:10px!important;display:flex!important;flex-direction:column!important;gap:9px!important}" +
        ".__wdtoRow{display:flex!important;align-items:center!important;gap:8px!important}" +
        ".__wdtoRow>label{flex:0 0 50px!important;color:#adbac7!important}" +
        ".__wdtoRow input[type=range]{flex:1!important;accent-color:#2f81f7}" +
        ".__wdtoRow input[type=number]{width:62px!important;background:#0d1117!important;color:#e6edf3!important;border:1px solid #30363d!important;border-radius:5px!important;padding:3px 5px!important}" +
        ".__wdtoVal{width:38px!important;text-align:right!important;color:#768390!important}" +
        ".__wdtoBtns{display:flex!important;flex-wrap:wrap!important;gap:6px!important}" +
        ".__wdtoBtn{flex:1!important;min-width:60px!important;cursor:pointer!important;background:#30363d!important;color:#fff!important;border:none!important;border-radius:6px!important;padding:6px 8px!important;font:inherit!important;text-align:center!important}" +
        ".__wdtoBtn.on{background:#2f81f7!important}" +
        ".__wdtoBtn--danger{background:#3d2222!important;color:#ff9b9b!important}" +
        ".__wdtoHint{color:#768390!important;font-size:11px!important}";
      document.documentElement.appendChild(style);

      const img = document.createElement("img");
      img.id = "__wdtOverlayImg"; img.src = dataUrl; img.alt = "";
      document.body.appendChild(img);

      const panel = document.createElement("div");
      panel.id = "__wdtOverlayPanel";
      panel.innerHTML =
        '<div class="__wdtoHead">Design Overlay <button class="__wdtoClose" title="Remove overlay">×</button></div>' +
        '<div class="__wdtoBody">' +
        '<div class="__wdtoRow"><label>Opacity</label><input type="range" id="__wdtoOp" min="0" max="100" value="50"><span class="__wdtoVal" id="__wdtoOpV">50%</span></div>' +
        '<div class="__wdtoRow"><label>Scale</label><input type="range" id="__wdtoSc" min="10" max="300" value="100"><span class="__wdtoVal" id="__wdtoScV">100%</span></div>' +
        '<div class="__wdtoRow"><label>X / Y</label><input type="number" id="__wdtoX" value="0"><input type="number" id="__wdtoY" value="0"></div>' +
        '<div class="__wdtoBtns"><button class="__wdtoBtn" id="__wdtoDiff">Difference</button><button class="__wdtoBtn" id="__wdtoLock">Lock</button><button class="__wdtoBtn" id="__wdtoFlip">Flip</button></div>' +
        '<div class="__wdtoHint">Drag the image to move it. Arrow keys nudge (Shift = 10px). Lock makes it click-through. Esc removes.</div>' +
        '<button class="__wdtoBtn __wdtoBtn--danger" id="__wdtoRemove">Remove overlay</button>' +
        "</div>";
      document.documentElement.appendChild(panel);

      const $ = (id) => panel.querySelector(id);
      let x = 0, y = 0, scale = 1, opacity = 0.5, locked = false, diff = false, flip = false;
      const apply = () => {
        img.style.left = x + "px"; img.style.top = y + "px";
        img.style.opacity = opacity;
        img.style.transform = "scale(" + scale + ")" + (flip ? " scaleX(-1)" : "");
        img.style.mixBlendMode = diff ? "difference" : "normal";
        img.style.pointerEvents = locked ? "none" : "auto";
        img.style.outline = locked ? "none" : "1px dashed rgba(47,129,247,.6)";
        img.style.cursor = locked ? "default" : "move";
        $("#__wdtoX").value = Math.round(x); $("#__wdtoY").value = Math.round(y);
      };

      let drag = false, dsx = 0, dsy = 0, dox = 0, doy = 0;
      img.addEventListener("mousedown", (e) => { if (locked) return; drag = true; dsx = e.clientX; dsy = e.clientY; dox = x; doy = y; e.preventDefault(); });
      const onMove = (e) => { if (!drag) return; x = dox + (e.clientX - dsx); y = doy + (e.clientY - dsy); apply(); };
      const onUp = () => { drag = false; };

      const head = panel.querySelector(".__wdtoHead");
      let pdrag = false, psx = 0, psy = 0, prx = 0, pry = 0;
      head.addEventListener("mousedown", (e) => {
        if (e.target.classList.contains("__wdtoClose")) return;
        pdrag = true; const r = panel.getBoundingClientRect(); psx = e.clientX; psy = e.clientY; prx = r.left; pry = r.top;
        panel.style.right = "auto"; e.preventDefault();
      });
      const onPMove = (e) => { if (!pdrag) return; panel.style.left = (prx + e.clientX - psx) + "px"; panel.style.top = (pry + e.clientY - psy) + "px"; };
      const onPUp = () => { pdrag = false; };

      const onKey = (e) => {
        if (e.key === "Escape") { cleanup(); return; }
        const t = (e.target.tagName || "").toLowerCase();
        if (locked || e.target.isContentEditable || t === "input" || t === "textarea" || t === "select") return;
        const step = e.shiftKey ? 10 : 1;
        if (e.key === "ArrowLeft") x -= step; else if (e.key === "ArrowRight") x += step;
        else if (e.key === "ArrowUp") y -= step; else if (e.key === "ArrowDown") y += step; else return;
        e.preventDefault(); apply();
      };

      window.addEventListener("mousemove", onMove, true);
      window.addEventListener("mouseup", onUp, true);
      window.addEventListener("mousemove", onPMove, true);
      window.addEventListener("mouseup", onPUp, true);
      window.addEventListener("keydown", onKey, true);

      const cleanup = () => {
        window.removeEventListener("mousemove", onMove, true);
        window.removeEventListener("mouseup", onUp, true);
        window.removeEventListener("mousemove", onPMove, true);
        window.removeEventListener("mouseup", onPUp, true);
        window.removeEventListener("keydown", onKey, true);
        img.remove(); panel.remove(); style.remove();
        window.__wdtOverlayCleanup = null;
      };
      window.__wdtOverlayCleanup = cleanup;

      $("#__wdtoOp").addEventListener("input", (e) => { opacity = e.target.value / 100; $("#__wdtoOpV").textContent = e.target.value + "%"; apply(); });
      $("#__wdtoSc").addEventListener("input", (e) => { scale = e.target.value / 100; $("#__wdtoScV").textContent = e.target.value + "%"; apply(); });
      $("#__wdtoX").addEventListener("input", (e) => { x = parseFloat(e.target.value) || 0; apply(); });
      $("#__wdtoY").addEventListener("input", (e) => { y = parseFloat(e.target.value) || 0; apply(); });
      $("#__wdtoDiff").addEventListener("click", () => { diff = !diff; $("#__wdtoDiff").classList.toggle("on", diff); apply(); });
      $("#__wdtoLock").addEventListener("click", () => { locked = !locked; $("#__wdtoLock").classList.toggle("on", locked); $("#__wdtoLock").textContent = locked ? "Unlock" : "Lock"; apply(); });
      $("#__wdtoFlip").addEventListener("click", () => { flip = !flip; $("#__wdtoFlip").classList.toggle("on", flip); apply(); });
      $("#__wdtoRemove").addEventListener("click", cleanup);
      panel.querySelector(".__wdtoClose").addEventListener("click", cleanup);

      apply();
    }

    // ── Popup wiring ──
    const RO_RESTRICTED = /^(chrome|chrome-extension|edge|devtools|about|view-source):/;
    const roError = document.getElementById("roError");
    const roRulerError = document.getElementById("roRulerError");
    let roDataUrl = "";

    // errEl lets each section show its error right under its own button.
    function roExec(func, args, after, errEl) {
      const err = errEl || roError;
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id || RO_RESTRICTED.test(tab.url || "")) {
          err.textContent = "This page can't be used. Open a regular website tab.";
          return;
        }
        err.textContent = "";
        chrome.scripting.executeScript({ target: { tabId: tab.id }, func, args: args || [] }, () => {
          if (chrome.runtime.lastError) err.textContent = "Could not access this page: " + chrome.runtime.lastError.message;
          else if (after) after();
        });
      });
    }

    document.getElementById("roRuler").addEventListener("click", () => roExec(rulerTool, [], () => window.close(), roRulerError));

    const roFile = document.getElementById("roFile");
    const roThumb = document.getElementById("roThumb");
    const roDropText = document.getElementById("roDropText");
    const roPlace = document.getElementById("roPlace");
    const roDrop = document.getElementById("roDrop");

    function roLoadFile(file) {
      if (!file || !file.type.startsWith("image/")) { roError.textContent = "Please choose an image file (PNG, JPG, WebP…)."; return; }
      if (file.size > 12 * 1024 * 1024) { roError.textContent = "Image is too large (max 12 MB)."; return; }
      const reader = new FileReader();
      reader.onload = () => {
        roDataUrl = reader.result;
        roThumb.src = roDataUrl;
        roThumb.classList.remove("hidden");
        roDropText.textContent = file.name;
        roPlace.disabled = false;
        roError.textContent = "";
      };
      reader.onerror = () => { roError.textContent = "Could not read that image."; };
      reader.readAsDataURL(file);
    }

    roFile.addEventListener("change", (e) => roLoadFile(e.target.files[0]));
    ["dragenter", "dragover"].forEach((ev) => roDrop.addEventListener(ev, (e) => { e.preventDefault(); roDrop.classList.add("dragover"); }));
    ["dragleave", "drop"].forEach((ev) => roDrop.addEventListener(ev, (e) => { e.preventDefault(); roDrop.classList.remove("dragover"); }));
    roDrop.addEventListener("drop", (e) => { const f = e.dataTransfer?.files?.[0]; if (f) roLoadFile(f); });

    roPlace.addEventListener("click", () => {
      if (!roDataUrl) return;
      roExec(overlayTool, [roDataUrl], () => window.close());
    });

  }); // ─── end lazy init: ruler-overlay

  registerToolInit("viewport-tester", () => {
    // ─── RESPONSIVE VIEWPORT TESTER ─────────────────────────────────────────────
    // Opens the active page in a dedicated preview tab (responsive.html) at an exact
    // device viewport. The preview iframes the page at the chosen CSS size and scales
    // it to fit; frame-blocking headers are stripped per-tab by the background worker.

    const VP_PRESETS = [
      { group: "Breakpoints", items: [["sm", 640, 800], ["md", 768, 1024], ["lg", 1024, 768], ["xl", 1280, 800], ["2xl", 1536, 864]] },
      { group: "Phones", items: [["iPhone SE", 375, 667], ["iPhone 13/14", 390, 844], ["iPhone 15/16", 393, 852], ["iPhone 15 Pro Max", 430, 932], ["iPhone 16 Pro Max", 440, 956], ["Pixel 8", 412, 915], ["Galaxy S24", 360, 780], ["Galaxy S24 Ultra", 412, 883], ["Galaxy Z Fold 5", 344, 882]] },
      { group: "Tablets", items: [["iPad Mini", 768, 1024], ["iPad 10.9\"", 810, 1080], ["iPad Air", 820, 1180], ["iPad Pro 11\"", 834, 1194], ["iPad Pro 12.9\"", 1024, 1366], ["Galaxy Tab S9", 800, 1280]] },
      { group: "Laptops & Desktops", items: [["Laptop", 1366, 768], ["Laptop L", 1440, 900], ["Desktop", 1920, 1080], ["4K", 2560, 1440]] },
    ];
    const VP_RESTRICTED = /^(chrome|chrome-extension|edge|devtools|about|view-source):/;
    const vpError = document.getElementById("vpError");

    document.getElementById("vpGroups").innerHTML = VP_PRESETS.map((g) => `
    <div class="vp-group">
      <div class="vp-group-label">${g.group}</div>
      <div class="vp-chips">${g.items.map(([name, w, h]) =>
      `<button class="vp-chip" data-w="${w}" data-h="${h}"><span class="vp-chip-name">${escapeHtml(name)}</span><span class="vp-chip-dim">${w}×${h}</span></button>`).join("")}</div>
    </div>`).join("");

    function vpOpen(w, h) {
      if (document.getElementById("vpRotate").checked) { const t = w; w = h; h = t; }
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.url || VP_RESTRICTED.test(tab.url)) { vpError.textContent = "Open a regular website tab to preview it."; return; }
        vpError.textContent = "";
        const u = chrome.runtime.getURL("responsive.html") + "?url=" + encodeURIComponent(tab.url) + "&w=" + w + "&h=" + h;
        chrome.tabs.create({ url: u });
      });
    }

    document.getElementById("vpGroups").addEventListener("click", (e) => {
      const chip = e.target.closest(".vp-chip");
      if (chip) vpOpen(+chip.dataset.w, +chip.dataset.h);
    });
    document.getElementById("vpApply").addEventListener("click", () => {
      const w = Math.max(200, Math.min(5000, parseInt(document.getElementById("vpW").value, 10) || 390));
      const h = Math.max(200, Math.min(5000, parseInt(document.getElementById("vpH").value, 10) || 844));
      vpOpen(w, h);
    });

  }); // ─── end lazy init: viewport-tester

  registerToolInit("cvd-sim", () => {
    // ─── COLOR BLINDNESS SIMULATOR ──────────────────────────────────────────────
    // Applies an SVG feColorMatrix to the whole page (and to the popup's preview
    // swatches) to simulate color vision deficiencies. Standard Wickline matrices.

    // type → 4×5 color matrix (sRGB). "normal" removes the filter.
    const CVD_TYPES = [
      { id: "normal", name: "Normal vision", desc: "No simulation (resets the page)", matrix: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" },
      { id: "protanopia", name: "Protanopia", desc: "Red-blind · ~1% of men", matrix: "0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0" },
      { id: "protanomaly", name: "Protanomaly", desc: "Red-weak · ~1% of men", matrix: "0.817 0.183 0 0 0  0.333 0.667 0 0 0  0 0.125 0.875 0 0  0 0 0 1 0" },
      { id: "deuteranopia", name: "Deuteranopia", desc: "Green-blind · ~1% of men", matrix: "0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0" },
      { id: "deuteranomaly", name: "Deuteranomaly", desc: "Green-weak · most common, ~5% of men", matrix: "0.8 0.2 0 0 0  0.258 0.742 0 0 0  0 0.142 0.858 0 0  0 0 0 1 0" },
      { id: "tritanopia", name: "Tritanopia", desc: "Blue-blind · rare", matrix: "0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0" },
      { id: "tritanomaly", name: "Tritanomaly", desc: "Blue-weak · rare", matrix: "0.967 0.033 0 0 0  0 0.733 0.267 0 0  0 0.183 0.817 0 0  0 0 0 1 0" },
      { id: "achromatopsia", name: "Achromatopsia", desc: "Total color blindness · very rare", matrix: "0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0" },
      { id: "achromatomaly", name: "Achromatomaly", desc: "Partial color blindness · very rare", matrix: "0.618 0.32 0.062 0 0  0.163 0.775 0.062 0 0  0.163 0.32 0.516 0 0  0 0 0 1 0" },
    ];
    const CVD_SWATCHES = ["#e63946", "#f3722c", "#f9c74f", "#90be6d", "#43aa8b", "#4d908e", "#277da1", "#4361ee", "#7209b7", "#f72585", "#8d5524", "#adb5bd"];

    // Injected: apply/update/remove the page filter. Falsy matrix → reset.
    function cvdApply(matrix, id, label) {
      const de = document.documentElement;
      const NS = "http://www.w3.org/2000/svg";
      let svg = document.getElementById("__wdtCvdSvg");
      let badge = document.getElementById("__wdtCvdBadge");
      if (!matrix) {
        de.style.filter = ""; de.removeAttribute("data-wdt-cvd");
        if (svg) svg.remove(); if (badge) badge.remove();
        return;
      }
      if (!svg) {
        svg = document.createElementNS(NS, "svg"); svg.id = "__wdtCvdSvg"; svg.setAttribute("aria-hidden", "true");
        svg.style.cssText = "position:absolute!important;width:0!important;height:0!important;overflow:hidden!important;pointer-events:none!important";
        const f = document.createElementNS(NS, "filter"); f.setAttribute("id", "__wdtCvdFilter"); f.setAttribute("color-interpolation-filters", "sRGB");
        const fe = document.createElementNS(NS, "feColorMatrix"); fe.setAttribute("id", "__wdtCvdMatrix"); fe.setAttribute("type", "matrix");
        f.appendChild(fe); svg.appendChild(f); de.appendChild(svg);
      }
      document.getElementById("__wdtCvdMatrix").setAttribute("values", matrix);
      de.style.setProperty("filter", "url(#__wdtCvdFilter)", "important");
      de.setAttribute("data-wdt-cvd", id);
      if (!badge) {
        badge = document.createElement("div"); badge.id = "__wdtCvdBadge";
        badge.style.cssText = "position:fixed!important;bottom:14px!important;left:14px!important;z-index:2147483647!important;background:#1b1f24!important;color:#fff!important;font:600 12px/1.5 system-ui,sans-serif!important;padding:6px 10px!important;border-radius:8px!important;box-shadow:0 4px 16px rgba(0,0,0,.4)!important;display:flex!important;align-items:center!important;gap:8px!important";
        const txt = document.createElement("span"); txt.id = "__wdtCvdBadgeTxt";
        const btn = document.createElement("button"); btn.textContent = "Reset";
        btn.style.cssText = "cursor:pointer!important;background:#30363d!important;color:#fff!important;border:none!important;border-radius:5px!important;padding:3px 8px!important;font:inherit!important";
        btn.addEventListener("click", () => {
          document.documentElement.style.filter = ""; document.documentElement.removeAttribute("data-wdt-cvd");
          const s = document.getElementById("__wdtCvdSvg"); if (s) s.remove();
          badge.remove();
        });
        badge.append(txt, btn); de.appendChild(badge);
      }
      document.getElementById("__wdtCvdBadgeTxt").textContent = "👁 " + label;
    }

    function cvdReadState() { return document.documentElement.getAttribute("data-wdt-cvd") || "normal"; }

    // ── Popup side ──
    const CVD_RESTRICTED = /^(chrome|chrome-extension|edge|devtools|about|view-source):/;
    const cvdTypesEl = document.getElementById("cvdTypes");
    const cvdSwatchesEl = document.getElementById("cvdSwatches");
    const cvdError = document.getElementById("cvdError");
    const cvdPreviewMatrix = document.getElementById("cvdPreviewMatrix");
    let cvdActive = "normal";

    cvdSwatchesEl.innerHTML = CVD_SWATCHES.map((c) => `<span class="cvd-swatch" style="background:${c}"></span>`).join("");

    function cvdRenderTypes() {
      cvdTypesEl.innerHTML = CVD_TYPES.map((t) =>
        `<button class="cvd-type${t.id === cvdActive ? " active" : ""}" data-id="${t.id}">
        <span class="cvd-type-name">${t.name}</span>
        <span class="cvd-type-desc">${escapeHtml(t.desc)}</span>
      </button>`).join("");
    }

    function cvdSelect(id) {
      const t = CVD_TYPES.find((x) => x.id === id) || CVD_TYPES[0];
      cvdActive = t.id;
      cvdPreviewMatrix.setAttribute("values", t.matrix);
      cvdRenderTypes();
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id || CVD_RESTRICTED.test(tab.url || "")) { cvdError.textContent = "This page can't be simulated. Open a regular website tab."; return; }
        cvdError.textContent = "";
        const args = t.id === "normal" ? [null, null, null] : [t.matrix, t.id, t.name];
        chrome.scripting.executeScript({ target: { tabId: tab.id }, func: cvdApply, args }, () => {
          if (chrome.runtime.lastError) cvdError.textContent = "Could not access this page: " + chrome.runtime.lastError.message;
        });
      });
    }

    cvdTypesEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".cvd-type");
      if (btn) cvdSelect(btn.dataset.id);
    });

    // Reflect any simulation already active on the page
    cvdRenderTypes();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id || CVD_RESTRICTED.test(tab.url || "")) return;
      chrome.scripting.executeScript({ target: { tabId: tab.id }, func: cvdReadState }, (res) => {
        if (chrome.runtime.lastError) return;
        const cur = res?.[0]?.result;
        if (cur && cur !== "normal") {
          const t = CVD_TYPES.find((x) => x.id === cur);
          if (t) { cvdActive = cur; cvdPreviewMatrix.setAttribute("values", t.matrix); cvdRenderTypes(); }
        }
      });
    });

  }); // ─── end lazy init: cvd-sim

  // ─── CATEGORY COLLAPSE / EXPAND ─────────────────────────────────────────────

  function saveCatState() {
    const state = {};
    document.querySelectorAll(".nav-category[data-cat]").forEach(cat => {
      state[cat.dataset.cat] = cat.classList.contains("collapsed");
    });
    chrome.storage.local.set({ wdt_cat_state: state });
  }

  function loadCatState(cb) {
    chrome.storage.local.get(["wdt_cat_state"], data => {
      const state = data.wdt_cat_state || null;
      cb(state);
    });
  }

  // Accordion: expand the active tool's category, collapse the rest,
  // and keep the active item in view.
  function syncCatToActive() {
    const activeItem = document.querySelector(".nav-category[data-cat] .nav-item.active");
    if (!activeItem) return;
    document.querySelectorAll(".nav-category[data-cat]").forEach(c =>
      c.classList.toggle("collapsed", !c.contains(activeItem)));
    saveCatState();
    activeItem.scrollIntoView({ block: "nearest" });
  }

  document.querySelectorAll(".nav-category[data-cat] > .nav-category-label").forEach(label => {
    label.addEventListener("click", () => {
      const cat = label.closest(".nav-category");
      const expand = cat.classList.contains("collapsed") || sidebar.classList.contains("collapsed");
      if (sidebar.classList.contains("collapsed")) setSidebarCollapsed(false);
      if (expand) {
        // Accordion: one open category at a time
        document.querySelectorAll(".nav-category[data-cat]").forEach(c =>
          c.classList.toggle("collapsed", c !== cat));
      } else {
        cat.classList.add("collapsed");
      }
      saveCatState();
    });
  });

  loadCatState(state => {
    if (state) {
      document.querySelectorAll(".nav-category[data-cat]").forEach(cat => {
        if (state[cat.dataset.cat] !== undefined) {
          cat.classList.toggle("collapsed", state[cat.dataset.cat]);
        }
      });
    }
    // Saved state may race with the restored active tab — re-assert accordion
    syncCatToActive();
  });


  // ─── SIDEBAR ICON-ONLY TOGGLE ────────────────────────────────────────────────

  const sidebar = document.getElementById("sidebar");
  const sidebarToggleBtn = document.getElementById("sidebarToggle");

  function setSidebarCollapsed(collapsed) {
    sidebar.classList.toggle("collapsed", collapsed);
    chrome.storage.local.set({ wdt_sidebar_collapsed: collapsed });
  }

  sidebarToggleBtn?.addEventListener("click", () => {
    setSidebarCollapsed(!sidebar.classList.contains("collapsed"));
  });

  chrome.storage.local.get(["wdt_sidebar_collapsed"], data => {
    if (data.wdt_sidebar_collapsed) sidebar.classList.add("collapsed");
  });


  // ─── STARRED / FEATURED TOOLS ───────────────────────────────────────────────

  // Order matters: index 0–8 were the v2 defaults; anything appended is a
  // later addition. Each default is auto-starred exactly ONCE per user (tracked
  // in wdt_fav_seeded), so adding a new default never resurrects a tool the
  // user has since unstarred.
  const DEFAULT_FAVORITES = [
    'font', 'color', 'palette-extractor', 'clamp', 'technical-seo',
    'css-inspector', 'component-extractor', 'broken-links', 'a11y-audit',
    'full-screenshot', 'tech-stack', 'ai-readiness',
  ];
  const FAV_V2_COUNT = 9; // how many of the above were defaults at fav-version 2
  const FAV_VERSION = 5;
  let favorites = new Set();

  function saveFavorites() {
    chrome.storage.local.set({ wdt_favorites: [...favorites] });
  }

  function loadFavorites(cb) {
    chrome.storage.local.get(["wdt_favorites", "wdt_fav_version", "wdt_fav_seeded"], (result) => {
      const firstRun = result.wdt_favorites === undefined;
      favorites = new Set(firstRun ? [] : result.wdt_favorites);

      // Which defaults has this user already been offered?
      let seeded;
      if (Array.isArray(result.wdt_fav_seeded)) seeded = new Set(result.wdt_fav_seeded);
      else if (firstRun) seeded = new Set();
      // Pre-seed-tracking user: a v2 user already received the first 9 defaults once.
      else seeded = new Set((result.wdt_fav_version || 1) >= 2 ? DEFAULT_FAVORITES.slice(0, FAV_V2_COUNT) : []);

      let changed = firstRun;
      DEFAULT_FAVORITES.forEach(t => {
        if (!seeded.has(t)) { favorites.add(t); seeded.add(t); changed = true; }
      });

      if (changed) {
        chrome.storage.local.set({ wdt_fav_version: FAV_VERSION, wdt_fav_seeded: [...seeded] });
        saveFavorites();
      }
      cb();
    });
  }

  const staticNavItems = () => [...document.querySelectorAll(".nav-category:not(.nav-dynamic) .nav-item")];

  // The sidebar no longer shows a "Starred / Featured" section — starred tools
  // live on the dashboard instead. This just clears any leftover dynamic block.
  function renderDynamicNav() {
    document.getElementById("sidebarNav").querySelectorAll(".nav-dynamic").forEach(el => el.remove());
  }

  function toggleFavorite(tab) {
    if (favorites.has(tab)) favorites.delete(tab);
    else favorites.add(tab);
    updateStarButtons();
    renderDynamicNav();
    renderDashboard();
    updateToolHeader(document.querySelector(".tab-content.active")?.id);
    saveFavorites();
  }

  function updateStarButtons() {
    staticNavItems().forEach(btn => {
      const star = btn.querySelector(".nav-star");
      if (star) star.textContent = favorites.has(btn.dataset.tab) ? "★" : "☆";
    });
  }

  // Inject star buttons into all static nav-items
  staticNavItems().forEach(btn => {
    const star = document.createElement("span");
    star.className = "nav-star";
    star.textContent = "☆";
    star.title = "Toggle starred";
    star.addEventListener("click", e => {
      e.stopPropagation();
      toggleFavorite(btn.dataset.tab);
    });
    btn.appendChild(star);
  });

  loadFavorites(() => {
    updateStarButtons();
    renderDynamicNav();
    renderDashboard();
  });


  // ─── DASHBOARD ──────────────────────────────────────────────────────────────

  // Central tool registry — single source of truth for the dashboard & search.
  const TOOLS = [
    { id: "clamp", name: "Clamp Calculator", category: "CSS Tools", description: "Fluid clamp() typography with live preview", keywords: ["fluid", "responsive", "font-size", "typography"] },
    { id: "box-shadow", name: "Box Shadow", category: "CSS Tools", description: "Multi-layer shadow generator with presets", keywords: ["shadow", "elevation", "depth"] },
    { id: "gradient", name: "Gradient", category: "CSS Tools", description: "Linear, radial & conic gradient builder", keywords: ["background", "color stops", "linear", "radial"] },
    { id: "fluid-design", name: "Fluid Design System", category: "CSS Tools", description: "Fluid type scales as CSS design tokens", keywords: ["type scale", "tokens", "modular scale"] },
    { id: "animation-builder", name: "Animation Builder", category: "CSS Tools", description: "Keyframes & cubic-bezier easing editor", keywords: ["keyframes", "easing", "bezier", "transition"] },
    { id: "glassmorphism", name: "Glassmorphism", category: "CSS Tools", description: "Glass & neumorphism effect generator", keywords: ["frosted", "blur", "neumorphism", "backdrop"] },
    { id: "css-snippets", name: "CSS Snippets", category: "CSS Tools", description: "Container queries, logical props, :has()", keywords: ["container query", "logical properties", "has"] },
    { id: "color", name: "Color Picker", category: "Colors", description: "Pick colors from any page (HEX, RGB, HSL)", keywords: ["eyedropper", "hex", "rgb", "hsl", "palette"] },
    { id: "contrast-checker", name: "Color Contrast", category: "Colors", description: "WCAG contrast checker with smart fixes", keywords: ["wcag", "accessibility", "ratio", "aa", "aaa"] },
    { id: "palette-extractor", name: "Page Palette", category: "Colors", description: "Extract every color used on the page", keywords: ["extract", "scan", "site colors", "colorzilla", "analyzer"] },
    { id: "color-scale", name: "Color Scale", category: "Colors", description: "Tailwind-style 50–950 shade scales", keywords: ["tailwind", "shades", "tints", "tokens", "oklch"] },
    { id: "lorem", name: "Lorem Ipsum", category: "Text & HTML", description: "Placeholder text generator", keywords: ["placeholder", "dummy text", "filler"] },
    { id: "text-case", name: "Text Case", category: "Text & HTML", description: "Convert text between cases", keywords: ["uppercase", "lowercase", "title case", "convert"] },
    { id: "unit-converter", name: "Unit Converter", category: "Text & HTML", description: "px ↔ rem, em, vh, vw conversions", keywords: ["px", "rem", "em", "viewport units"] },
    { id: "html-beautify", name: "HTML Beautify", category: "Text & HTML", description: "Beautify or minify HTML markup", keywords: ["format", "minify", "prettify", "markup"] },
    { id: "encoder-decoder", name: "Encoder / Decoder", category: "Text & HTML", description: "Base64, URL and HTML entities, both ways", keywords: ["base64", "url encode", "entities", "escape", "atob", "decode"] },
    { id: "seo-preview", name: "SEO Preview", category: "SEO Tools", description: "Google SERP snippet simulator", keywords: ["serp", "title", "meta description", "google"] },
    { id: "schema-generator", name: "Schema Generator", category: "SEO Tools", description: "JSON-LD structured data builder", keywords: ["json-ld", "structured data", "rich results"] },
    { id: "robots-txt", name: "Robots.txt", category: "SEO Tools", description: "robots.txt rule generator", keywords: ["crawler", "bots", "disallow", "sitemap"] },
    { id: "technical-seo", name: "Technical SEO", category: "SEO Tools", description: "One-click technical SEO audit", keywords: ["audit", "canonical", "indexing", "meta"] },
    { id: "headings-outline", name: "Headings Outline", category: "SEO Tools", description: "H1–H6 structure tree of the live page", keywords: ["headings", "h1", "outline", "structure", "hierarchy"] },
    { id: "json-to-ts", name: "JSON → TypeScript", category: "Dev Utils", description: "JSON to TS interfaces & Zod schemas", keywords: ["typescript", "interface", "zod", "types"] },
    { id: "json-formatter", name: "JSON Formatter", category: "Dev Utils", description: "Format, validate, repair & explore JSON", keywords: ["json", "format", "beautify", "validate", "minify", "tree", "lint", "pretty", "repair"] },
    { id: "diff-checker", name: "Diff Checker", category: "Dev Utils", description: "Compare two texts line & word by word", keywords: ["diff", "compare", "text compare", "changes", "merge", "patch", "difference"] },
    { id: "ruler-overlay", name: "Ruler & Overlay", category: "Dev Utils", description: "Measure the page & overlay a design comp", keywords: ["ruler", "measure", "pixel perfect", "overlay", "perfectpixel", "mockup", "design", "guides", "dimensions"] },
    { id: "viewport-tester", name: "Responsive", category: "Dev Utils", description: "Preview the page at any device viewport size", keywords: ["responsive", "viewport", "device", "mobile", "breakpoint", "resize", "responsively", "media query", "screen size"] },
    { id: "css-inspector", name: "CSS Inspector", category: "Dev Utils", description: "Hover-inspect element styles on the page", keywords: ["inspect", "computed styles", "devtools"] },
    { id: "component-extractor", name: "Component Extractor", category: "Dev Utils", description: "Pick a container, get its HTML + all child CSS", keywords: ["extract", "snippet", "clone", "replicate", "snappysnippet"] },
    { id: "font", name: "Font Checker", category: "Dev Utils", description: "Identify fonts used on any page", keywords: ["font family", "typography", "identify", "whatfont"] },
    { id: "full-screenshot", name: "Screenshot", category: "Dev Utils", description: "Full-page or visible-area screenshot capture", keywords: ["screenshot", "capture", "full page", "gofullpage", "png", "jpeg", "screen grab", "stitch"] },
    { id: "tech-stack", name: "Tech Stack", category: "Dev Utils", description: "Detect CMS, frameworks, themes & plugins", keywords: ["wappalyzer", "tech stack", "cms", "wordpress", "shopify", "framework", "plugins", "theme", "builtwith", "whatcms"] },
    { id: "a11y-audit", name: "A11y Audit", category: "Accessibility", description: "Scan the page for accessibility issues", keywords: ["accessibility", "wcag", "alt", "aria", "audit"] },
    { id: "broken-links", name: "Broken Links", category: "Accessibility", description: "Find broken & redirecting links on the page", keywords: ["404", "links", "redirects", "checker"] },
    { id: "cvd-sim", name: "Color Blindness", category: "Accessibility", description: "Simulate color vision deficiencies live", keywords: ["color blindness", "cvd", "deuteranopia", "protanopia", "tritanopia", "accessibility", "simulate", "colorblind"] },
    { id: "copy-markdown", name: "Copy as Markdown", category: "AI Tools", description: "LLM-ready Markdown from any page", keywords: ["markdown", "llm", "ai", "chatgpt", "claude", "clip", "article", "readability", "extract"] },
    { id: "ai-readiness", name: "AI Readiness", category: "AI Tools", description: "GEO/AEO audit for AI search visibility", keywords: ["geo", "aeo", "llms.txt", "ai search", "gptbot", "answer engine", "chatgpt", "perplexity", "citations", "audit"] },
    { id: "llms-txt", name: "llms.txt", category: "AI Tools", description: "Generate & view a site's llms.txt for AI", keywords: ["llms.txt", "llms", "ai", "generator", "viewer", "markdown", "geo", "answer engine", "content map"] },
  ];
  const TOOL_CATEGORIES = [...new Set(TOOLS.map(t => t.category))];

  // Category → slug, used for the per-category accent colors in CSS
  const CAT_SLUGS = {
    "CSS Tools": "css", "Colors": "colors", "Text & HTML": "text",
    "SEO Tools": "seo", "Dev Utils": "dev", "Accessibility": "a11y",
    "AI Tools": "ai",
  };

  // ── Tool header bar ──
  const toolHeader = document.getElementById("toolHeader");
  const thIcon = document.getElementById("thIcon");
  const thName = document.getElementById("thName");
  const thCat = document.getElementById("thCat");
  const thStar = document.getElementById("thStar");

  function updateToolHeader(tabName) {
    const tool = TOOLS.find(t => t.id === tabName);
    if (!tool) { toolHeader.classList.add("hidden"); delete toolHeader.dataset.tool; return; }
    toolHeader.classList.remove("hidden");
    toolHeader.dataset.tool = tool.id;
    toolHeader.dataset.cat = CAT_SLUGS[tool.category] || "";
    thIcon.innerHTML = toolIcon(tool.id);
    thName.textContent = tool.name;
    thCat.textContent = tool.category;
    const starred = favorites.has(tool.id);
    thStar.textContent = starred ? "★" : "☆";
    thStar.classList.toggle("starred", starred);
  }

  document.getElementById("thHome").addEventListener("click", () => {
    activateTab("dashboard");
    saveSettings();
  });

  thStar.addEventListener("click", () => {
    if (toolHeader.dataset.tool) toggleFavorite(toolHeader.dataset.tool);
  });

  // Clean up the storage key left behind by the removed "Recently Used" feature
  chrome.storage.local.remove("wdt_recents");

  // ── Rendering ──
  const dashContent = document.getElementById("dashContent");
  const dashSearch = document.getElementById("dashSearch");

  // Reuse the sidebar's SVG so each tool's icon lives in exactly one place
  function toolIcon(id) {
    const svg = document.querySelector(`.nav-category:not(.nav-dynamic) .nav-item[data-tab="${id}"] svg.icon`);
    return svg ? svg.outerHTML : "";
  }

  const DASH_GRIP = `<span class="dash-card-grip" title="Drag to reorder" aria-hidden="true"><svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><circle cx="5" cy="3" r="1.3"/><circle cx="11" cy="3" r="1.3"/><circle cx="5" cy="8" r="1.3"/><circle cx="11" cy="8" r="1.3"/><circle cx="5" cy="13" r="1.3"/><circle cx="11" cy="13" r="1.3"/></svg></span>`;

  function dashCard(t, draggable) {
    const starred = favorites.has(t.id);
    const slug = CAT_SLUGS[t.category] || "css";
    return `
      <div class="dash-card dash-card--${slug}${draggable ? " dash-card--draggable" : ""}" data-tool="${t.id}"${draggable ? ' draggable="true"' : ""} tabindex="0" role="button" aria-label="Open ${escapeHtml(t.name)}">
        <div class="dash-card-top">
          <span class="dash-card-icon">${toolIcon(t.id)}</span>
          <button class="dash-card-star${starred ? " starred" : ""}" data-tool="${t.id}"
            title="${starred ? "Remove from" : "Add to"} Starred" aria-label="Toggle star for ${escapeHtml(t.name)}">${starred ? "★" : "☆"}</button>
        </div>
        <div class="dash-card-name">${escapeHtml(t.name)}</div>
        <div class="dash-card-desc">${escapeHtml(t.description)}</div>
        <span class="dash-card-cat">${escapeHtml(t.category)}</span>
        ${draggable ? DASH_GRIP : ""}
      </div>`;
  }

  function dashSection(title, tools, draggable) {
    if (!tools.length) return "";
    return `
      <div class="dash-section">
        <h4 class="dash-section-title">${escapeHtml(title)}</h4>
        <div class="dash-grid">${tools.map((t) => dashCard(t, draggable)).join("")}</div>
      </div>`;
  }

  function renderDashboard() {
    if (!dashContent) return;
    const q = (dashSearch?.value || "").trim().toLowerCase();

    if (q) {
      const matches = TOOLS.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.keywords.some(k => k.includes(q))
      );
      dashContent.innerHTML = matches.length
        ? dashSection(`Results (${matches.length})`, matches)
        : `<p class="dash-empty">No tools match "<strong>${escapeHtml(q)}</strong>"</p>`;
      return;
    }

    // Starred order follows the favorites set (which the user can drag-reorder)
    const starredTools = [...favorites].map(id => TOOLS.find(t => t.id === id)).filter(Boolean);

    dashContent.innerHTML =
      dashSection("★ Starred", starredTools, true) +
      TOOL_CATEGORIES.map(cat => dashSection(cat, TOOLS.filter(t => t.category === cat))).join("");
  }

  dashSearch?.addEventListener("input", renderDashboard);

  // Event delegation: star toggles + card opens
  dashContent?.addEventListener("click", e => {
    const star = e.target.closest(".dash-card-star");
    if (star) {
      e.stopPropagation();
      toggleFavorite(star.dataset.tool);
      return;
    }
    if (e.target.closest(".dash-card-grip")) return; // grip is a drag handle, not "open"
    const card = e.target.closest(".dash-card");
    if (card) {
      activateTab(card.dataset.tool);
      saveSettings();
    }
  });

  // ── Drag-and-drop reordering of the Starred section ──
  let dashDragId = null;
  function dashReorder(srcId, targetId, after) {
    if (srcId === targetId) return;
    let order = [...favorites].filter(id => id !== srcId);
    let idx = order.indexOf(targetId);
    if (idx === -1) return;
    order.splice(after ? idx + 1 : idx, 0, srcId);
    favorites = new Set(order);
    saveFavorites();
    renderDashboard();
  }
  dashContent?.addEventListener("dragstart", e => {
    const card = e.target.closest(".dash-card--draggable");
    if (!card) return;
    dashDragId = card.dataset.tool;
    card.classList.add("dash-card--dragging");
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", dashDragId); } catch (_) {}
  });
  dashContent?.addEventListener("dragend", e => {
    e.target.closest(".dash-card")?.classList.remove("dash-card--dragging");
    dashContent.querySelectorAll(".dash-card--dropbefore, .dash-card--dropafter")
      .forEach(c => c.classList.remove("dash-card--dropbefore", "dash-card--dropafter"));
    dashDragId = null;
  });
  dashContent?.addEventListener("dragover", e => {
    if (!dashDragId) return;
    const card = e.target.closest(".dash-card--draggable");
    if (!card || card.dataset.tool === dashDragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const r = card.getBoundingClientRect();
    const after = e.clientX > r.left + r.width / 2;
    card.classList.toggle("dash-card--dropafter", after);
    card.classList.toggle("dash-card--dropbefore", !after);
  });
  dashContent?.addEventListener("dragleave", e => {
    e.target.closest(".dash-card--draggable")?.classList.remove("dash-card--dropbefore", "dash-card--dropafter");
  });
  dashContent?.addEventListener("drop", e => {
    if (!dashDragId) return;
    const card = e.target.closest(".dash-card--draggable");
    if (!card) return;
    e.preventDefault();
    const r = card.getBoundingClientRect();
    const after = e.clientX > r.left + r.width / 2;
    dashReorder(dashDragId, card.dataset.tool, after);
  });

  dashContent?.addEventListener("keydown", e => {
    if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("dash-card")) {
      e.preventDefault();
      activateTab(e.target.dataset.tool);
      saveSettings();
    }
  });


  registerToolInit("broken-links", () => {
    // ========================
    // BROKEN LINKS CHECKER
    // ========================
    (function () {
      const BLC_STORE = 'blc_state';

      const scanBtn = document.getElementById('blcScanBtn');
      const highlightBtn = document.getElementById('blcHighlightBtn');
      const clearBtn = document.getElementById('blcClearBtn');
      const resetBtn = document.getElementById('blcResetBtn');
      const cancelBtn = document.getElementById('blcCancelBtn');
      const progressEl = document.getElementById('blcProgress');
      const progressBar = document.getElementById('blcProgressBar');
      const progressText = document.getElementById('blcProgressText');
      const resultsEl = document.getElementById('blcResults');
      const linkList = document.getElementById('blcLinkList');
      const insightsEl = document.getElementById('blcInsights');
      const scanCtxEl = document.getElementById('blcScanContext');
      const scoreValueEl = document.getElementById('blcScoreValue');
      const scoreEl = document.getElementById('blcScore');
      const totalEl = document.getElementById('blcTotal');
      const brokenEl = document.getElementById('blcBroken');
      const redirectEl = document.getElementById('blcRedirect');
      const validEl = document.getElementById('blcValid');
      const externalEl = document.getElementById('blcExternal');
      const ignoreAnchors = document.getElementById('blcIgnoreAnchors');
      const ignoreMailto = document.getElementById('blcIgnoreMailto');
      const ignoreAdmin = document.getElementById('blcIgnoreAdmin');
      const checkExternal = document.getElementById('blcCheckExternal');
      const checkInternal = document.getElementById('blcCheckInternal');

      // CMS/admin endpoints that shouldn't count as real broken links
      const BLC_ADMIN_RE = /\/wp-admin(\/|$|\?)|\/wp-login\.php|\/wp-json(\/|$)|\/xmlrpc\.php|\/wp-cron\.php|\/administrator\/|\/user\/(login|logout|register)\b|\/ghost(\/|$)|\/typo3\//i;

      let allResults = [];
      let cancelled = false;
      let currentFilter = 'all';
      let lastTabUrl = '';
      let lastScanTs = 0;

      // ── Page-injected functions (NO outer scope refs — serialized by executeScript) ──

      function extractLinksFromDOM() {
        const links = [];
        const origin = location.origin;
        document.querySelectorAll('a[href]').forEach((a, i) => {
          const raw = a.getAttribute('href') || '';
          let href;
          try { href = new URL(raw, location.href).href; } catch { return; }
          const text = (a.innerText || a.textContent || '').trim().slice(0, 120);
          const inAdmin = !!a.closest('#wpadminbar, #adminmenu');
          links.push({ href, rawHref: raw, text, isInternal: href.startsWith(origin), index: i, inAdmin });
        });
        return links;
      }

      function scrollToLinkByIndex(index) {
        const a = document.querySelectorAll('a[href]')[index];
        if (!a) return;
        if (!document.getElementById('__blc_pulse')) {
          const s = document.createElement('style');
          s.id = '__blc_pulse';
          s.textContent = 'a[data-blc-pulse]{outline:3px solid #f59e0b!important;outline-offset:3px!important;}';
          document.head.appendChild(s);
        }
        a.scrollIntoView({ behavior: 'smooth', block: 'center' });
        a.setAttribute('data-blc-pulse', '1');
        setTimeout(() => {
          a.removeAttribute('data-blc-pulse');
          if (!document.querySelector('a[data-blc-pulse]')) {
            const s = document.getElementById('__blc_pulse');
            if (s) s.remove();
          }
        }, 2000);
      }

      function injectLinkHighlights(resultMap) {
        document.querySelectorAll('a[data-blc]').forEach(a => a.removeAttribute('data-blc'));
        let s = document.getElementById('__blc_styles');
        if (!s) { s = document.createElement('style'); s.id = '__blc_styles'; document.head.appendChild(s); }
        s.textContent = [
          'a[data-blc="broken"]    { outline: 2px solid #ef4444 !important; outline-offset: 2px; }',
          'a[data-blc="redirect"]  { outline: 2px solid #f59e0b !important; outline-offset: 2px; }',
          'a[data-blc="valid"]     { outline: 1px solid #22c55e !important; outline-offset: 2px; }',
          'a[data-blc="unchecked"] { outline: 1px dashed #64748b !important; outline-offset: 2px; }',
        ].join('\n');
        document.querySelectorAll('a[href]').forEach(a => {
          let href;
          try { href = new URL(a.getAttribute('href') || '', location.href).href; } catch { return; }
          const cat = resultMap[href];
          if (cat) a.dataset.blc = cat;
        });
      }

      function removeLinkHighlights() {
        document.querySelectorAll('a[data-blc]').forEach(a => a.removeAttribute('data-blc'));
        document.querySelectorAll('a[data-blc-pulse]').forEach(a => a.removeAttribute('data-blc-pulse'));
        ['__blc_styles', '__blc_pulse'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
      }

      // ── Helpers ──────────────────────────────────────────────────────────────

      function blcEsc(s) {
        return escapeHtml(s || '');
      }

      function blcTrunc(s, n) {
        return s && s.length > n ? s.slice(0, n - 1) + '…' : (s || '');
      }

      function blcMsg(msg) {
        return new Promise((resolve, reject) => {
          try {
            chrome.runtime.sendMessage(msg, res => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else if (!res) {
                reject(new Error('No response from background script'));
              } else if (res.error) {
                reject(new Error('Background: ' + res.error));
              } else {
                resolve(res);
              }
            });
          } catch (e) { reject(e); }
        });
      }

      // ── Persistence ───────────────────────────────────────────────────────────

      function saveState() {
        try {
          chrome.storage.local.set({ [BLC_STORE]: { results: allResults, url: lastTabUrl, ts: lastScanTs, filter: currentFilter } });
        } catch { }
      }

      function loadState(cb) {
        try {
          chrome.storage.local.get([BLC_STORE], data => {
            const s = data && data[BLC_STORE];
            cb(s && s.results && s.results.length > 0 ? s : null);
          });
        } catch { cb(null); }
      }

      function clearState() {
        try { chrome.storage.local.remove([BLC_STORE]); } catch { }
      }

      function restoreState(s) {
        allResults = s.results;
        lastTabUrl = s.url || '';
        lastScanTs = s.ts || 0;
        currentFilter = s.filter || 'all';
        document.querySelectorAll('.blc-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === currentFilter));
        renderSummary();
        renderResults();
        renderInsights();
        resultsEl.classList.remove('hidden');
        highlightBtn.disabled = false;
        clearBtn.disabled = false;
        showScanContext();
      }

      function showScanContext() {
        if (!lastTabUrl) {
          scanCtxEl.classList.add('hidden');
          resetBtn.classList.add('hidden');
          return;
        }
        const ago = lastScanTs ? (() => {
          const ms = Date.now() - lastScanTs;
          if (ms < 60000) return 'just now';
          if (ms < 3600000) return Math.floor(ms / 60000) + 'm ago';
          return Math.floor(ms / 3600000) + 'h ago';
        })() : '';
        scanCtxEl.textContent = `Last scan: ${lastTabUrl}${ago ? ' • ' + ago : ''}`;
        scanCtxEl.classList.remove('hidden');
        resetBtn.classList.remove('hidden');
      }

      // ── Core rendering ────────────────────────────────────────────────────────

      function buildResults(links, urlResults) {
        const urlCounts = new Map();
        links.forEach(l => urlCounts.set(l.href, (urlCounts.get(l.href) || 0) + 1));
        return links.map(link => {
          const chk = urlResults.get(link.href);
          const count = urlCounts.get(link.href) || 1;
          let category = 'unchecked', severity = null;
          if (chk) {
            if (!chk.ok) {
              category = 'broken';
              severity = (chk.status === 404 || chk.status === 0) ? 'critical' : 'warning';
            } else if (chk.isRedirect) {
              category = 'redirect';
              severity = 'warning';
            } else {
              category = 'valid';
            }
          }
          const finalUrl = chk && chk.finalUrl ? chk.finalUrl : link.href;
          const isInsecure = link.href.startsWith('http://');
          const isSlashMismatch = category === 'redirect' &&
            (finalUrl === link.href + '/' || finalUrl === link.href.replace(/\/$/, ''));
          return { ...link, ...(chk || {}), category, severity, isDuplicate: count > 1, duplicateCount: count, isInsecure, isSlashMismatch };
        });
      }

      function renderSummary() {
        const total = allResults.length;
        const broken = allResults.filter(r => r.category === 'broken').length;
        const redirect = allResults.filter(r => r.category === 'redirect').length;
        const valid = allResults.filter(r => r.category === 'valid').length;
        const external = allResults.filter(r => !r.isInternal).length;
        totalEl.textContent = total;
        brokenEl.textContent = broken;
        redirectEl.textContent = redirect;
        validEl.textContent = valid;
        externalEl.textContent = external;

        const checked = allResults.filter(r => r.category !== 'unchecked').length;
        if (!checked) { scoreValueEl.textContent = '—'; scoreEl.className = 'blc-score'; return; }
        let score = 100;
        score -= Math.min(broken * 5, 60);
        score -= Math.min(redirect, 20);
        score = Math.max(0, Math.round(score));
        scoreValueEl.textContent = score;
        scoreEl.className = 'blc-score ' + (score >= 80 ? 'blc-score--good' : score >= 60 ? 'blc-score--warn' : 'blc-score--bad');
      }

      function renderResults() {
        let filtered = allResults;
        if (currentFilter === 'broken') filtered = allResults.filter(r => r.category === 'broken');
        else if (currentFilter === 'redirect') filtered = allResults.filter(r => r.category === 'redirect');
        else if (currentFilter === 'valid') filtered = allResults.filter(r => r.category === 'valid');
        else if (currentFilter === 'external') filtered = allResults.filter(r => !r.isInternal);
        else if (currentFilter === 'duplicate') filtered = allResults.filter(r => r.isDuplicate);
        else if (currentFilter === 'http') filtered = allResults.filter(r => r.isInsecure);
        else if (currentFilter === 'no-slash') filtered = allResults.filter(r => r.isSlashMismatch);

        if (!filtered.length) { linkList.innerHTML = '<p class="blc-empty">No links match this filter.</p>'; return; }

        linkList.innerHTML = filtered.slice(0, 200).map(r => {
          const statusTxt = r.category === 'unchecked' ? '…' : (r.status || (r.error ? 'ERR' : '?'));
          const dupBadge = r.isDuplicate ? `<span class="blc-badge blc-badge--dup">${r.duplicateCount}×</span>` : '';
          const extBadge = !r.isInternal ? `<span class="blc-badge blc-badge--ext">ext</span>` : '';
          const sevBadge = r.severity ? `<span class="blc-badge blc-badge--${r.severity}">${r.severity}</span>` : '';
          const httpBadge = r.isInsecure ? `<span class="blc-badge blc-badge--http">HTTP</span>` : '';
          const slashBadge = r.isSlashMismatch ? `<span class="blc-badge blc-badge--slash">No /</span>` : '';
          const redir = r.isRedirect && r.finalUrl ? `<div class="blc-redir-url">→ ${blcEsc(blcTrunc(r.finalUrl, 60))}</div>` : '';
          const errTxt = r.error ? `<div class="blc-link-err">${blcEsc(blcTrunc(r.error, 80))}</div>` : '';
          return `<div class="blc-link-row blc-link-row--${r.category}">
          <div class="blc-link-code blc-code--${r.category}">${statusTxt}</div>
          <div class="blc-link-info">
            <div class="blc-link-text">${blcEsc(blcTrunc(r.text || '(no text)', 45))} ${dupBadge}${extBadge}${httpBadge}${slashBadge}${sevBadge}</div>
            <div class="blc-link-href" title="${blcEsc(r.href)}">${blcEsc(blcTrunc(r.href, 65))}</div>
            ${redir}${errTxt}
          </div>
          <button class="blc-scroll-btn" data-idx="${r.index}" title="Scroll to link on page">↗</button>
        </div>`;
        }).join('');

        if (filtered.length > 200) linkList.insertAdjacentHTML('beforeend', `<p class="blc-more">Showing 200 of ${filtered.length}. Use filters to narrow down.</p>`);

        linkList.querySelectorAll('.blc-scroll-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const idx = parseInt(btn.dataset.idx, 10);
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) chrome.scripting.executeScript({ target: { tabId: tab.id }, func: scrollToLinkByIndex, args: [idx] });
          });
        });
      }

      function renderInsights() {
        const broken = allResults.filter(r => r.category === 'broken');
        const redirects = allResults.filter(r => r.category === 'redirect');
        const insights = [];

        const allUnchecked = allResults.length > 0 && allResults.every(r => r.category === 'unchecked');
        if (allUnchecked) {
          insights.push({ sev: 'critical', msg: 'HTTP checking did not complete. Reload the extension at chrome://extensions, then scan again.' });
        }

        const httpToHttps = allResults.filter(r => r.isInsecure && r.category !== 'unchecked');
        if (httpToHttps.length) insights.push({ sev: 'warning', msg: `${httpToHttps.length} link(s) use HTTP. Switch to HTTPS to avoid redirect hops and mixed-content warnings. Use the HTTP filter to view them.` });

        const slashMismatches = allResults.filter(r => r.isSlashMismatch);
        if (slashMismatches.length) insights.push({ sev: 'warning', msg: `${slashMismatches.length} link(s) redirect due to a trailing slash mismatch (e.g. /page → /page/), a fixable SEO issue. Use the No Slash / filter to view them.` });

        if (broken.length > 10) insights.push({ sev: 'critical', msg: `${broken.length} broken links, with high impact on UX and SEO crawl budget.` });
        else if (broken.length > 0) insights.push({ sev: 'warning', msg: `${broken.length} broken link(s) detected. Fix to avoid 404 errors.` });

        const netErrs = allResults.filter(r => r.status === 0 && r.category === 'broken');
        if (netErrs.length) insights.push({ sev: 'info', msg: `${netErrs.length} link(s) couldn’t be reached (network/CORS). May be behind auth or a firewall.` });

        const highDups = [...new Set(allResults.filter(r => r.isDuplicate && r.duplicateCount > 3).map(r => r.href))];
        if (highDups.length) insights.push({ sev: 'info', msg: `${highDups.length} URL(s) appear 4+ times. Review for unintentional duplicate links.` });

        if (!insights.length) { insightsEl.classList.add('hidden'); return; }
        const icons = { critical: SI.critical, warning: SI.warn, info: SI.info };
        insightsEl.classList.remove('hidden');
        insightsEl.innerHTML = `<div class="blc-insights-title">Smart Insights</div>` +
          insights.map(i => `<div class="blc-insight blc-insight--${i.sev}">${icons[i.sev] || ''} ${blcEsc(i.msg)}</div>`).join('');
      }

      // ── Scan ─────────────────────────────────────────────────────────────────

      async function startScan() {
        cancelled = false;
        allResults = [];
        lastTabUrl = '';
        lastScanTs = 0;
        currentFilter = 'all';
        document.querySelectorAll('.blc-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
        scanCtxEl.classList.add('hidden');

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;
        lastTabUrl = tab.url || '';

        progressEl.classList.remove('hidden');
        resultsEl.classList.add('hidden');
        scanBtn.disabled = true;
        highlightBtn.disabled = true;
        clearBtn.disabled = true;
        progressBar.style.width = '0%';
        progressText.textContent = 'Extracting links…';

        let rawLinks;
        try {
          const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractLinksFromDOM });
          rawLinks = result;
        } catch {
          progressEl.classList.add('hidden');
          scanBtn.disabled = false;
          alert('Cannot access this page. Try a regular web page (not chrome:// or extension pages).');
          return;
        }

        const links = (rawLinks || []).filter(link => {
          const h = link.href.toLowerCase();
          if (!h.startsWith('http://') && !h.startsWith('https://')) return false;
          if (ignoreAnchors.checked && link.rawHref.startsWith('#')) return false;
          if (ignoreMailto.checked && (h.startsWith('mailto:') || h.startsWith('tel:'))) return false;
          if (ignoreAdmin.checked && (link.inAdmin || BLC_ADMIN_RE.test(link.href))) return false;
          if (!checkExternal.checked && !link.isInternal) return false;
          if (!checkInternal.checked && link.isInternal) return false;
          return true;
        });

        if (!links.length) {
          progressEl.classList.add('hidden');
          scanBtn.disabled = false;
          resultsEl.classList.remove('hidden');
          renderSummary();
          linkList.innerHTML = '<p class="blc-empty">No checkable links found on this page.</p>';
          return;
        }

        const uniqueUrls = [...new Set(links.map(l => l.href))];
        const urlResults = new Map();
        const BATCH = 5;
        let checked = 0;

        progressText.textContent = `Scanning 0 / ${uniqueUrls.length} links…`;

        for (let i = 0; i < uniqueUrls.length; i += BATCH) {
          if (cancelled) break;
          const batch = uniqueUrls.slice(i, i + BATCH);
          try {
            const res = await blcMsg({ type: 'LINK_CHECK', urls: batch, clearCache: i === 0 });
            if (res.results) res.results.forEach(r => urlResults.set(r.url, r));
          } catch (err) {
            const msg = err.message || '';
            if (msg.includes('Unknown message type')) {
              // Old background.js still running — stop scan, show reload instructions
              progressEl.classList.add('hidden');
              scanBtn.disabled = false;
              allResults = buildResults(links, new Map()); // keep as unchecked
              resultsEl.classList.remove('hidden');
              renderSummary();
              renderResults();
              insightsEl.classList.remove('hidden');
              insightsEl.innerHTML = `<div class="blc-insights-title">Action Required</div>
              <div class="blc-insight blc-insight--critical">${SI.critical} The background script needs reloading.
              Go to <strong>chrome://extensions</strong>, find <strong>Web Dev Tools</strong>,
              and click the <strong>↻ Reload</strong> button. Then scan again.</div>`;
              return;
            }
            // Other network/runtime errors: mark batch individually
            batch.forEach(url => urlResults.set(url, {
              url, status: 0, ok: false, finalUrl: url, isRedirect: false, elapsed: 0,
              error: msg || 'Check failed'
            }));
          }
          checked += batch.length;
          progressBar.style.width = Math.round((checked / uniqueUrls.length) * 100) + '%';
          progressText.textContent = `Scanning ${Math.min(checked, uniqueUrls.length)} / ${uniqueUrls.length} links…`;
          allResults = buildResults(links, urlResults);
          renderSummary();
          if (checked % 10 === 0 || checked >= uniqueUrls.length) renderResults();
        }

        allResults = buildResults(links, urlResults);
        lastScanTs = Date.now();
        progressEl.classList.add('hidden');
        resultsEl.classList.remove('hidden');
        scanBtn.disabled = false;
        highlightBtn.disabled = false;
        clearBtn.disabled = false;
        renderSummary();
        renderResults();
        renderInsights();
        showScanContext();
        saveState();
      }

      // ── Page actions ─────────────────────────────────────────────────────────

      async function highlightOnPage() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;
        if (!allResults.length) { alert('No scan results. Run a scan first.'); return; }
        const resultMap = {};
        // Include ALL found links — unchecked get dashed gray, others get color
        allResults.forEach(r => { if (!resultMap[r.href]) resultMap[r.href] = r.category; });
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: injectLinkHighlights, args: [resultMap] });
        const prev = highlightBtn.textContent;
        highlightBtn.textContent = 'Highlighted ✓';
        setTimeout(() => { highlightBtn.textContent = prev; }, 1500);
      }

      async function clearHighlights() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: removeLinkHighlights });
        const prev = clearBtn.textContent;
        clearBtn.textContent = 'Cleared ✓';
        setTimeout(() => { clearBtn.textContent = prev; }, 1200);
      }

      async function resetResults() {
        allResults = [];
        lastTabUrl = '';
        lastScanTs = 0;
        currentFilter = 'all';
        document.querySelectorAll('.blc-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
        resultsEl.classList.add('hidden');
        scanCtxEl.classList.add('hidden');
        resetBtn.classList.add('hidden');
        highlightBtn.disabled = true;
        clearBtn.disabled = true;
        clearState();
        // Also remove any link highlights left on the page (same as Clear Highlights)
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab?.id) await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: removeLinkHighlights });
        } catch (_) {}
      }

      // ── Export ────────────────────────────────────────────────────────────────

      function exportLinks(fmt) {
        if (!allResults.length) return;
        const rows = allResults.map(r => ({
          url: r.href, text: r.text || '', status: r.status || 0, category: r.category,
          isInternal: r.isInternal, finalUrl: r.finalUrl || r.href,
          isRedirect: r.isRedirect || false, error: r.error || '', duplicates: r.duplicateCount
        }));
        let content, filename, mime;
        if (fmt === 'csv') {
          const hdr = ['URL', 'Anchor Text', 'Status', 'Category', 'Internal', 'Final URL', 'Redirect', 'Error', 'Duplicates'];
          const esc = v => `"${String(v).replace(/"/g, '""')}"`;
          content = [hdr.join(','), ...rows.map(r => Object.values(r).map(esc).join(','))].join('\n');
          filename = 'broken-links.csv'; mime = 'text/csv';
        } else if (fmt === 'json') {
          content = JSON.stringify(rows, null, 2);
          filename = 'broken-links.json'; mime = 'application/json';
        } else {
          const score = scoreValueEl.textContent;
          const broken = rows.filter(r => r.category === 'broken');
          const redirs = rows.filter(r => r.category === 'redirect');
          content = `# Broken Links Report\n\n**Health Score:** ${score}/100\n**Page:** ${lastTabUrl}\n**Total:** ${rows.length} | **Broken:** ${broken.length} | **Redirects:** ${redirs.length}\n\n## Broken Links\n\n` +
            (broken.length ? broken.map(r => `- [\`${r.url}\`](${r.url}): ${r.status || 'ERR'}${r.error ? ` (${r.error})` : ''}`).join('\n') : '_None_') +
            `\n\n## Redirects\n\n` +
            (redirs.length ? redirs.map(r => `- [\`${r.url}\`](${r.url}) → ${r.finalUrl}`).join('\n') : '_None_');
          filename = 'broken-links.md'; mime = 'text/markdown';
        }
        const blob = new Blob([content], { type: mime });
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
        a.click();
        URL.revokeObjectURL(a.href);
      }

      // ── Event listeners ───────────────────────────────────────────────────────

      scanBtn.addEventListener('click', startScan);
      cancelBtn.addEventListener('click', () => { cancelled = true; });
      highlightBtn.addEventListener('click', highlightOnPage);
      clearBtn.addEventListener('click', clearHighlights);
      resetBtn.addEventListener('click', resetResults);

      document.querySelectorAll('.blc-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.blc-filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentFilter = btn.dataset.filter;
          renderResults();
        });
      });

      document.querySelectorAll('.blc-count[data-filter]').forEach(el => {
        el.addEventListener('click', () => {
          currentFilter = el.dataset.filter;
          document.querySelectorAll('.blc-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === currentFilter));
          renderResults();
        });
      });

      document.getElementById('blcExportCSV').addEventListener('click', () => exportLinks('csv'));
      document.getElementById('blcExportJSON').addEventListener('click', () => exportLinks('json'));
      document.getElementById('blcExportMD').addEventListener('click', () => exportLinks('md'));

      // ── Init: restore persisted results on load ────────────────────────────────

      loadState(s => { if (s) restoreState(s); });

      // Also restore when user navigates to this tab and results are empty
      const blcNavBtn = document.querySelector('[data-tab="broken-links"]');
      if (blcNavBtn) {
        blcNavBtn.addEventListener('click', () => {
          if (!allResults.length) loadState(s => { if (s) restoreState(s); });
        });
      }

    })();
  }); // ─── end lazy init: broken-links



});



