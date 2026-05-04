// ─── Syntax highlighter ──────────────────────────────────────────────────────
(function() {
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
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
      if (src[i]==='/' && src[i+1]==='*') {
        const end = src.indexOf('*/', i+2); const s = end<0 ? src.slice(i) : src.slice(i, end+2);
        out += tok('comment', esc(s)); i += s.length; continue;
      }
      // String
      if (src[i]==='"' || src[i]==="'") {
        const q = src[i]; let j = i+1;
        while (j<src.length && src[j]!==q) { if(src[j]==='\\') j++; j++; }
        out += tok('string', esc(src.slice(i, j+1))); prevSig = q; i = j+1; continue;
      }
      // At-rule
      if (src[i]==='@') {
        const m = src.slice(i).match(/^@[\w-]+/);
        if (m) { out += tok('atrule', esc(m[0])); prevSig = 'x'; i += m[0].length; continue; }
      }
      // Hex colour
      if (src[i]==='#') {
        const m = src.slice(i).match(/^#[0-9a-fA-F]{3,8}(?=[\s,;)\n]|$)/);
        if (m) { out += tok('hex', esc(m[0])); prevSig = 'x'; i += m[0].length; continue; }
      }
      // var(--name)
      if (src.slice(i,i+4)==='var(') {
        const m = src.slice(i).match(/^var\(\s*(--[\w-]+)\s*\)/);
        if (m) { out += tok('fn','var(') + tok('var', esc(m[1])) + tok('punct',')'); prevSig = ')'; i += m[0].length; continue; }
      }
      // CSS function
      const fnRe = /^(clamp|calc|min|max|rgba?|hsla?|hwb|color|linear-gradient|radial-gradient|conic-gradient|repeating-[\w-]+|var|env|url|format|local|translate(?:[XYZ]|3d)?|rotate(?:[XYZ]|3d)?|scale(?:[XY]|3d)?|skew[XY]?|matrix(?:3d)?|perspective|cubic-bezier|steps|blur|brightness|contrast|drop-shadow|grayscale|hue-rotate|invert|opacity|saturate|sepia)\s*(?=\()/i;
      const fnM = src.slice(i).match(fnRe);
      if (fnM) { out += tok('fn', esc(fnM[0])); prevSig = '('; i += fnM[0].length; continue; }
      // CSS custom property
      if (src[i]==='-' && src[i+1]==='-') {
        const m = src.slice(i).match(/^--[\w-]+/);
        if (m) { out += tok('var', esc(m[0])); prevSig = 'x'; i += m[0].length; continue; }
      }
      // Number + unit
      if (/[-\d.]/.test(src[i]) && (i===0||/[\s,(:+\-*\/]/.test(src[i-1]))) {
        const m = src.slice(i).match(/^-?\d*\.?\d+(?:px|r?em|vw|vh|vmin|vmax|svh|svw|dvh|dvw|cqw|cqh|%|ms?|deg|turn|grad|rad|fr|ch|ex|ic|lh|rlh|cap)?/);
        if (m && m[0].length) {
          const unitM = m[0].match(/(px|r?em|vw|vh|vmin|vmax|svh|svw|dvh|dvw|cqw|cqh|%|ms?|deg|turn|grad|rad|fr|ch|ex|ic|lh|rlh|cap)$/);
          if (unitM) { const num=m[0].slice(0,-unitM[0].length); out += tok('number',esc(num))+tok('unit',unitM[0]); }
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
      if (code[i]==='"') {
        let j = i+1; while (j<code.length && code[j]!=='"') { if(code[j]==='\\') j++; j++; }
        const s = code.slice(i, j+1);
        const after = code.slice(j+1).trimStart();
        out += after[0]===':' ? tok('key', esc(s)) : tok('string', esc(s));
        i = j+1; continue;
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

  window._hl = function(code, lang) {
    if (!code) return '';
    try {
      if (lang === 'json') return highlightJSON(code);
      if (lang === 'text') return highlightText(code);
      return highlightCSS(code);
    } catch(e) { return esc(code); }
  };

  // Helper: set code element with syntax highlighting, preserving raw text in dataset
  window._setCode = function(el, raw, lang) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;
    el.dataset.raw = raw;
    el.innerHTML = window._hl(raw, lang || 'css');
  };
})();

document.addEventListener("DOMContentLoaded", () => {

  // ─── SVG icon helper (replaces emojis throughout) ────────────────────────────
  const SI = {
    pass:     `<svg class="status-icon status-icon--pass" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
    warn:     `<svg class="status-icon status-icon--warn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    fail:     `<svg class="status-icon status-icon--fail" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    info:     `<svg class="status-icon status-icon--info" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    critical: `<svg class="status-icon status-icon--fail" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    expired:  `<svg class="status-icon status-icon--fail" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    valid:    `<svg class="status-icon status-icon--pass" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
  };

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

  const activateTab = (tabName) => {
    navItems.forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tabName));
    tabContents.forEach(tab => tab.classList.toggle("active", tab.id === tabName));
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
    if (settings.activeTab) activateTab(settings.activeTab);
    else activateTab("clamp");

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
    // Re-run calculators after restoring values
    updateClampCalculator();
  });


  // Sample Lorem Ipsum sentences
const loremWords = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
  "magna", "aliqua", "ut", "enim", "ad", "minim", "veniam", "quis", "nostrud",
  "exercitation", "ullamco", "laboris", "nisi", "ut", "aliquip", "ex", "ea",
  "commodo", "consequat", "duis", "aute", "irure", "dolor", "in", "reprehenderit"
];

// Generate a random word
function getRandomWord() {
  return loremWords[Math.floor(Math.random() * loremWords.length)];
}

// Generate a sentence with a specific number of words
function generateSentence(wordCount) {
  let words = Array.from({ length: wordCount }, getRandomWord);
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1); // Capitalize first word
  return words.join(" ") + ".";
}

// Main generation logic
document.getElementById("generateLorem").addEventListener("click", () => {
  const paraCount = +document.getElementById("loremParagraphs").value;
  const sentenceCount = +document.getElementById("loremSentences").value;
  const sentenceLength = +document.getElementById("loremWordsPerSentence").value; // Add this input in HTML

  const paragraphs = Array.from({ length: paraCount }, () => {
    return Array.from({ length: sentenceCount }, () =>
      generateSentence(sentenceLength)
    ).join(" ");
  });

  document.getElementById("loremOutput").value = paragraphs.join("\n\n");
});


// Copy to clipboard
document.getElementById("copyLorem").addEventListener("click", () => {
  const output = document.getElementById("loremOutput");
  const button = document.getElementById("copyLorem");
  const originalText = button.textContent;
  output.select();
  navigator.clipboard.writeText(output.value).then(() => {
    button.textContent = "Copied!";
    setTimeout(() => { button.textContent = originalText; }, 2000);
  }).catch(() => {
    button.textContent = "Copy failed";
    setTimeout(() => { button.textContent = originalText; }, 2000);
  });
});


  // Color Picker
  const colorInput = document.getElementById("colorInput");
  const colorPreview = document.getElementById("colorPreview");

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

  const updateColorValues = (hex) => {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

    colorPreview.style.backgroundColor = hex;
    _setCode("hexCode", `color: ${hex};`);
    _setCode("rgbCode", `color: rgb(${rgb.r},${rgb.g},${rgb.b});`);
    _setCode("hslCode", `color: hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%);`);
  };

  colorInput.addEventListener("input", (e) => updateColorValues(e.target.value));

  document.getElementById("eyeDropperBtn").addEventListener("click", async () => {
    try {
      const eyeDropper = new EyeDropper(); // Capital E here is required
      const result = await eyeDropper.open();
      updateColorValues(result.sRGBHex);
      document.getElementById("colorInput").value = result.sRGBHex;
    } catch (err) {
      console.error("Eyedropper error:", err);
    }
  });

  // Update copy button functionality
  document.querySelectorAll(".copy").forEach(btn => {
    btn.addEventListener("click", () => {
      const codeElement = btn.previousElementSibling;
      const originalText = btn.textContent;
      navigator.clipboard.writeText(codeElement.dataset.raw || codeElement.textContent).then(() => {
        btn.textContent = "Copied!";
        setTimeout(() => { btn.textContent = originalText; }, 2000);
      }).catch(() => {
        btn.textContent = "Copy failed";
        setTimeout(() => { btn.textContent = originalText; }, 2000);
      });
    });
  });

  // Font Picker
const savedFontInfo = localStorage.getItem('fontInfo');
if (savedFontInfo) {
  const fontInfo = JSON.parse(savedFontInfo);
  updateFontPreview(fontInfo);
}

// ✅ Main font picker hover function
function fontPickerHoverScript() {
  if (window.__fontPickerCleanup) window.__fontPickerCleanup();

  // Remove existing overlay/style if any
  document.getElementById('__fontOverlay__')?.remove();
  document.getElementById('__fontPickerStyle__')?.remove();

  // Inject style tag
  const style = document.createElement('style');
  style.id = '__fontPickerStyle__';
  style.textContent = `
    #__fontOverlay__ {
      position: absolute !important;
      pointer-events: none !important;
      border: 2px dashed #4caf50 !important;
      background-color: rgba(76, 175, 80, 0.1) !important;
      z-index: 999999 !important;
      box-sizing: border-box !important;
      display: none !important;
    }
  `;
  document.head.appendChild(style);

  // Create overlay
  const overlay = document.createElement("div");
  overlay.id = "__fontOverlay__";
  document.body.appendChild(overlay);

  let lastEl = null;
  let isActive = true;

  const mouseMove = (e) => {
    if (!isActive) return;

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || ["HTML", "BODY", "SCRIPT"].includes(el.tagName)) return;

    const rect = el.getBoundingClientRect();
    Object.assign(overlay.style, {
      top: `${window.scrollY + rect.top}px`,
      left: `${window.scrollX + rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      display: 'block'
    });

    if (el !== lastEl) {
      lastEl = el;
      const style = window.getComputedStyle(el);
      const fontInfo = {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        fontStyle: style.fontStyle,
        textDecoration: style.textDecoration,
        textAlign: style.textAlign,
        color: style.color,
        sampleText: el.textContent.trim().substring(0, 50)
      };

      chrome.runtime.sendMessage({
        type: 'FONT_INFO',
        data: fontInfo
      });
    }
  };

  const clickHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    isActive = false;

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;

    const style = window.getComputedStyle(el);
    const fontInfo = {
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      fontStyle: style.fontStyle,
      textDecoration: style.textDecoration,
      textAlign: style.textAlign,
      color: style.color,
      sampleText: el.textContent.trim().substring(0, 50)
    };

    overlay.remove();
    document.getElementById('__fontPickerStyle__')?.remove();
    document.removeEventListener('mousemove', mouseMove);
    document.removeEventListener('click', clickHandler, true);
    delete window.__fontPickerCleanup;

    chrome.runtime.sendMessage({
      type: 'FONT_INFO',
      data: fontInfo,
      locked: true
    });
  };

  const cleanup = () => {
    document.getElementById('__fontOverlay__')?.remove();
    document.getElementById('__fontPickerStyle__')?.remove();
    document.removeEventListener('mousemove', mouseMove);
    document.removeEventListener('click', clickHandler, true);
    delete window.__fontPickerCleanup;
  };

  document.addEventListener('mousemove', mouseMove);
  document.addEventListener('click', clickHandler, true);
  window.__fontPickerCleanup = cleanup;
}



// ✅ Trigger font picker on button click
document.getElementById("checkFontOnPage").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
    alert("This extension cannot access chrome:// or internal Chrome pages.");
    return;
  }

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: fontPickerHoverScript
  });
});

// ✅ Reset overlay and UI
document.getElementById("resetFontPicker").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
    return;
  }

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      if (window.__fontPickerCleanup) {
        window.__fontPickerCleanup();
        delete window.__fontPickerCleanup;
      }
    }
  });

  document.getElementById('checkFontOnPage').textContent = 'Pick Font from Page';
  document.getElementById('fontInfoOutput').textContent = 'Click "Pick Font from Page" to start...';
  document.getElementById('fontPreviewBox').classList.add('hidden');
});

// ✅ Update font preview in popup
function updateFontPreview(fontInfo) {
  const css = `font-family: ${fontInfo.fontFamily};
font-size: ${fontInfo.fontSize};
font-weight: ${fontInfo.fontWeight};
line-height: ${fontInfo.lineHeight};
letter-spacing: ${fontInfo.letterSpacing};
font-style: ${fontInfo.fontStyle};
text-decoration: ${fontInfo.textDecoration};
text-align: ${fontInfo.textAlign};`;

  _setCode('fontInfoOutput', css);

  const preview = document.getElementById('fontPreview');
  const previewBox = document.getElementById('fontPreviewBox');
  preview.style = '';

  preview.style.fontFamily = fontInfo.fontFamily;
  preview.style.color = '#1b5e20';

  if (fontInfo.sampleText) {
    preview.textContent = fontInfo.sampleText;
  }

  previewBox.classList.remove('hidden');
}

// ✅ Receive message from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FONT_INFO') {
    const fontInfo = message.data;
    localStorage.setItem('fontInfo', JSON.stringify(fontInfo));
    updateFontPreview(fontInfo);

    if (message.locked) {
      document.getElementById('checkFontOnPage').textContent = 'Pick New Font';
    }
  }
});

// ✅ Copy font info to clipboard
document.getElementById('copyFontInfo').addEventListener('click', () => {
  const fontInfo = document.getElementById('fontInfoOutput').dataset.raw || document.getElementById('fontInfoOutput').textContent;
  const button = document.getElementById('copyFontInfo');
  const originalText = button.textContent;
  navigator.clipboard.writeText(fontInfo).then(() => {
    button.textContent = 'Copied!';
    setTimeout(() => { button.textContent = originalText; }, 2000);
  }).catch(() => {
    button.textContent = 'Copy failed';
    setTimeout(() => { button.textContent = originalText; }, 2000);
  });
});



  // CSS Clamp Calculator
  const updateClampCalculator = () => {
    const rootFontSize = parseFloat(document.querySelector('input[name="rootFontSize"]:checked').value);
    const minDevice = parseFloat(document.getElementById("minDeviceWidth").value) || 320;
    const maxDevice = parseFloat(document.getElementById("maxDeviceWidth").value) || 1280;
    const minFont = parseFloat(document.getElementById("minFontSize").value);
    const maxFont = parseFloat(document.getElementById("maxFontSize").value);
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
      format === "scss"     ? `$font-size: ${clampCore};` :
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
  const clampPreviewWrap = document.querySelector(".clamp-preview-wrap");
  const clampPreviewEl = document.getElementById("clampPreview");

  function updateSliderPreview() {
    if (!clampSlider || !clampPreviewEl) return;
    const w = parseInt(clampSlider.value);
    const rootFontSize = parseFloat(document.querySelector('input[name="rootFontSize"]:checked')?.value) || 16;
    const minFont = parseFloat(document.getElementById("minFontSize").value);
    const maxFont = parseFloat(document.getElementById("maxFontSize").value);
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

  document.getElementById("copyClampBtn").addEventListener("click", () => {
    const clampEl = document.getElementById("clampOutput");
    const text = clampEl.dataset.raw || clampEl.textContent;
    const button = document.getElementById("copyClampBtn");
    const originalText = button.textContent;
    navigator.clipboard.writeText(text).then(() => {
      button.textContent = "Copied!";
      setTimeout(() => { button.textContent = originalText; }, 2000);
    }).catch(() => {
      button.textContent = "Copy failed";
      setTimeout(() => { button.textContent = originalText; }, 2000);
    });
  });

  document.getElementById("resetClamp").addEventListener("click", () => {
    document.querySelector('input[name="rootFontSize"][value="16"]').checked = true;
    document.querySelector('input[name="clampFormat"][value="css"]').checked = true;
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

  // ─── BOX SHADOW GENERATOR ────────────────────────────────────────────────────

  let bsLayers = [{ h: 0, v: 8, blur: 24, spread: -4, color: '#000000', opacity: 15, inset: false }];
  let bsActiveCat = 'classic';
  let bsActiveFmt = 'css';
  let bsShape = 'box';

  const bsAllPresets = {
    classic: [
      { name: 'Soft',    layers: [{ h:0, v:4,  blur:15, spread:0,   color:'#000000', opacity:8,   inset:false }] },
      { name: 'Medium',  layers: [{ h:0, v:8,  blur:24, spread:-4,  color:'#000000', opacity:15,  inset:false }] },
      { name: 'Hard',    layers: [{ h:4, v:4,  blur:0,  spread:0,   color:'#000000', opacity:25,  inset:false }] },
      { name: 'Long',    layers: [{ h:0, v:25, blur:50, spread:-12, color:'#000000', opacity:25,  inset:false }] },
      { name: 'Sharp',   layers: [{ h:2, v:2,  blur:0,  spread:0,   color:'#000000', opacity:100, inset:false }] },
      { name: 'Diffuse', layers: [{ h:0, v:2,  blur:40, spread:0,   color:'#000000', opacity:12,  inset:false }] },
    ],
    elevated: [
      { name: 'Card',       layers: [{ h:0, v:1,  blur:4,  spread:0,  color:'#000000', opacity:8,  inset:false }, { h:0, v:4,  blur:12, spread:-2, color:'#000000', opacity:10, inset:false }] },
      { name: 'Float',      layers: [{ h:0, v:4,  blur:12, spread:-2, color:'#000000', opacity:10, inset:false }, { h:0, v:16, blur:40, spread:-4, color:'#000000', opacity:15, inset:false }] },
      { name: 'Popup',      layers: [{ h:0, v:24, blur:64, spread:-8, color:'#000000', opacity:30, inset:false }] },
      { name: 'Material 1', layers: [{ h:0, v:1,  blur:3,  spread:0,  color:'#000000', opacity:12, inset:false }, { h:0, v:1,  blur:2,  spread:0,  color:'#000000', opacity:24, inset:false }] },
      { name: 'Material 2', layers: [{ h:0, v:3,  blur:6,  spread:0,  color:'#000000', opacity:15, inset:false }, { h:0, v:3,  blur:6,  spread:0,  color:'#000000', opacity:23, inset:false }] },
      { name: 'Material 3', layers: [{ h:0, v:10, blur:20, spread:0,  color:'#000000', opacity:19, inset:false }, { h:0, v:6,  blur:6,  spread:0,  color:'#000000', opacity:23, inset:false }] },
    ],
    effects: [
      { name: 'Neon Green', layers: [{ h:0, v:0, blur:20, spread:2, color:'#4caf50', opacity:80, inset:false }] },
      { name: 'Neon Blue',  layers: [{ h:0, v:0, blur:20, spread:2, color:'#2196f3', opacity:80, inset:false }] },
      { name: 'Neon Pink',  layers: [{ h:0, v:0, blur:20, spread:2, color:'#e91e63', opacity:80, inset:false }] },
      { name: 'Glow',       layers: [{ h:0, v:0, blur:10, spread:0, color:'#4caf50', opacity:40, inset:false }, { h:0, v:0, blur:30, spread:5, color:'#4caf50', opacity:20, inset:false }] },
      { name: 'Retro',      layers: [{ h:4, v:4, blur:0,  spread:0, color:'#000000', opacity:100, inset:false }] },
      { name: 'Brutal',     layers: [{ h:8, v:8, blur:0,  spread:0, color:'#000000', opacity:100, inset:false }] },
    ],
    inner: [
      { name: 'Subtle',   layers: [{ h:0, v:2,  blur:6,  spread:0,  color:'#000000', opacity:12, inset:true }] },
      { name: 'Deep',     layers: [{ h:0, v:6,  blur:12, spread:-2, color:'#000000', opacity:30, inset:true }] },
      { name: 'Pressed',  layers: [{ h:2, v:2,  blur:5,  spread:0,  color:'#000000', opacity:20, inset:true }, { h:-2, v:-2, blur:5,  spread:0,  color:'#ffffff', opacity:60, inset:true }] },
      { name: 'Neumorph', layers: [{ h:5, v:5,  blur:10, spread:0,  color:'#000000', opacity:15, inset:false }, { h:-5, v:-5, blur:10, spread:0,  color:'#ffffff', opacity:70, inset:false }] },
      { name: 'Engraved', layers: [{ h:0, v:1,  blur:0,  spread:0,  color:'#ffffff', opacity:50, inset:true },  { h:0, v:-1, blur:0,  spread:0,  color:'#000000', opacity:30, inset:true }] },
      { name: 'Groove',   layers: [{ h:0, v:3,  blur:6,  spread:-2, color:'#000000', opacity:25, inset:true },  { h:0, v:-3, blur:6,  spread:-2, color:'#ffffff', opacity:50, inset:true }] },
    ],
  };

  function bsLayerToCSS(layer) {
    const r = parseInt(layer.color.slice(1,3), 16);
    const g = parseInt(layer.color.slice(3,5), 16);
    const b = parseInt(layer.color.slice(5,7), 16);
    const a = (layer.opacity / 100).toFixed(2);
    return `${layer.inset ? 'inset ' : ''}${layer.h}px ${layer.v}px ${layer.blur}px ${layer.spread}px rgba(${r},${g},${b},${a})`;
  }

  function bsBuildCSS() { return bsLayers.map(bsLayerToCSS).join(',\n             '); }

  function bsBuildTailwind() {
    const val = bsLayers.map(l => {
      const r = parseInt(l.color.slice(1,3), 16);
      const g = parseInt(l.color.slice(3,5), 16);
      const b = parseInt(l.color.slice(5,7), 16);
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
    const canvas  = document.getElementById('bsCanvas');
    const codeEl  = document.getElementById('bsShadowCode');
    const radius  = parseInt(document.getElementById('bsBorderRadius')?.value) || 8;
    const elColor = document.getElementById('bsElColor')?.value || '#ffffff';
    const canvasColor = document.getElementById('bsCanvasColor')?.value || '#f8f9fa';
    if (preview) {
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
    const r = parseInt(layer.color.slice(1,3), 16);
    const g = parseInt(layer.color.slice(3,5), 16);
    const b = parseInt(layer.color.slice(5,7), 16);
    return `rgba(${r},${g},${b},${layer.opacity/100})`;
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
          ${bsLayers.length > 1 ? `<button class="bs-del-btn" data-idx="${idx}" title="Remove">&#x2715;</button>` : ''}
        </div>
        <div class="bs-layer-body">
          <div class="bs-ctrl-row">
            ${bsSliderHTML('X Offset', 'h',    l.h,       -100, 100, 'px')}
            ${bsSliderHTML('Y Offset', 'v',    l.v,       -100, 100, 'px')}
          </div>
          <div class="bs-ctrl-row">
            ${bsSliderHTML('Blur',   'blur',   l.blur,    0,    100, 'px')}
            ${bsSliderHTML('Spread', 'spread', l.spread,  -50,  50,  'px')}
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

  ['bsCanvasColor','bsElColor','bsBorderRadius'].forEach(id =>
    document.getElementById(id)?.addEventListener('input', bsRender)
  );

  document.getElementById('bsAddLayer')?.addEventListener('click', () => {
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
    document.querySelectorAll('#bsCanvas .bs-shape-btn').forEach((b,i) => b.classList.toggle('active', i===0));
    const el = document.getElementById('bsPreviewEl');
    if (el) { el.className = 'bs-shape-box'; }
    bsActiveCat = 'classic';
    document.querySelectorAll('#bsCatTabs .bs-cat-tab').forEach((t,i) => t.classList.toggle('active', i===0));
    bsRenderLayers();
    bsRenderPresets();
    bsRender();
  });

  document.getElementById('bsCopyBtn')?.addEventListener('click', () => {
    const btn = document.getElementById('bsCopyBtn');
    const cEl = document.getElementById('bsShadowCode');
    const text = cEl?.dataset.raw || cEl?.textContent || '';
    const orig = btn.textContent;
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = orig; }, 1500);
    }).catch(() => {});
  });

  bsRenderLayers();
  bsRenderPresets();
  bsRender();

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
      }
    });

    return colorStop;
  };

  // Remove any existing event listeners for Add Color Stop
  const addColorStopBtn = document.getElementById("addColorStop");
  const newBtn = addColorStopBtn.cloneNode(true);
  addColorStopBtn.parentNode.replaceChild(newBtn, addColorStopBtn);

  // Add single event listener for Add Color Stop button
  newBtn.addEventListener("click", () => {
    const colorStops = document.getElementById("colorStops");
    const stops = colorStops.querySelectorAll(".color-stop");
    const lastStop = stops[stops.length - 1];
    const newPosition = 100;
    
    const colorStop = document.createElement("div");
    colorStop.classList.add("color-stop");
    colorStop.innerHTML = `
      <input type="color" class="gradientColor" value="#ffffff">
      <input type="range" class="gradientStop" value="${newPosition}" min="0" max="100">
      <span class="position-label">${newPosition}%</span>
      <input type="number" class="color-stop-input" value="${newPosition}" min="0" max="100">
      <button class="remove-stop btn-hover" title="Remove Color Stop">×</button>
    `;

    const rangeInput = colorStop.querySelector(".gradientStop");
    const numberInput = colorStop.querySelector(".color-stop-input");
    const positionLabel = colorStop.querySelector(".position-label");

    const updatePosition = (value) => {
      value = Math.min(100, Math.max(0, parseInt(value) || 0));
      rangeInput.value = value;
      numberInput.value = value;
      positionLabel.textContent = `${value}%`;
      updateGradient();
    };

    rangeInput.addEventListener("input", (e) => updatePosition(e.target.value));
    numberInput.addEventListener("input", (e) => updatePosition(e.target.value));
    colorStop.querySelector(".gradientColor").addEventListener("input", updateGradient);
    colorStop.querySelector(".remove-stop").addEventListener("click", () => {
      if (document.querySelectorAll(".color-stop").length > 2) {
        colorStop.remove();
        updateGradient();
      }
    });

    colorStops.appendChild(colorStop);
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

    const colorStops = Array.from(document.querySelectorAll(".color-stop")).map(stop => {
      const color = stop.querySelector(".gradientColor").value;
      const position = stop.querySelector(".gradientStop").value;
      return `${color} ${position}%`;
    }).join(", ");

    const gradient = `${type}-gradient(${gradientParams ? gradientParams + ", " : ""}${colorStops})`;
    gradientPreview.style.backgroundImage = gradient;
    _setCode(gradientCode, `background-image: ${gradient};`);
  };

  // Update custom angle value display with improved visuals
  document.getElementById("customAngle").addEventListener("input", (e) => {
    document.getElementById("customAngleValue").textContent = `${e.target.value}°`;
    document.getElementById("angleVisualizer").style.transform = `rotate(${e.target.value}deg)`;
  });

  // Add event listeners for all gradient controls
  document.querySelectorAll("#gradient select, #gradient input").forEach(input => {
    if (input.classList.contains("gradientStop")) {
      input.addEventListener("input", (e) => {
        updatePositionLabel(e.target);
        updateGradient();
      });
    } else {
      input.addEventListener("input", updateGradient);
    };
  });

  // Event listeners for preset buttons
  document.querySelectorAll(".gradient-preset").forEach(button => {
    button.addEventListener("click", () => {
      applyGradientPreset(button.dataset.preset);
    });
  });

  // Update position labels for range inputs
  const updatePositionLabel = (rangeInput) => {
    const label = rangeInput.parentElement.querySelector(".position-label");
    label.textContent = `${rangeInput.value}%`;
  };
  document.getElementById("copyGradient").addEventListener("click", () => {
    const button = document.getElementById("copyGradient");
    const originalText = button.textContent;
    navigator.clipboard.writeText(gradientCode.dataset.raw || gradientCode.textContent).then(() => {
      button.textContent = "Copied!";
      setTimeout(() => { button.textContent = originalText; }, 2000);
    }).catch(() => {
      button.textContent = "Copy failed";
      setTimeout(() => { button.textContent = originalText; }, 2000);
    });
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

  const updateConversion = () => {
    const baseFontSize = parseFloat(document.getElementById("baseFontSize").value) || 16;
    const inputValue = parseFloat(document.getElementById("inputValue").value) || 0;
    const inputUnit = document.getElementById("inputUnit").value;
    const outputUnit = document.getElementById("outputUnit").value;

    // Convert to pixels first
    const pxValue = inputUnit === "px" ? inputValue :
      inputUnit === "rem" ? inputValue * baseFontSize :
      inputUnit === "em" ? inputValue * baseFontSize :
      inputUnit === "%" ? (inputValue / 100) * baseFontSize :
      inputUnit === "vh" ? (inputValue / 100) * viewportHeight :
      inputUnit === "vw" ? (inputValue / 100) * viewportWidth :
      inputUnit === "vmin" ? (inputValue / 100) * Math.min(viewportHeight, viewportWidth) :
      inputUnit === "vmax" ? (inputValue / 100) * Math.max(viewportHeight, viewportWidth) :
      inputUnit === "pt" ? inputValue * (96 / 72) : 0;

    // Convert from pixels to target unit
    const outputValue = outputUnit === "px" ? pxValue :
      outputUnit === "rem" ? pxValue / baseFontSize :
      outputUnit === "em" ? pxValue / baseFontSize :
      outputUnit === "%" ? (pxValue / baseFontSize) * 100 :
      outputUnit === "vh" ? (pxValue / viewportHeight) * 100 :
      outputUnit === "vw" ? (pxValue / viewportWidth) * 100 :
      outputUnit === "vmin" ? (pxValue / Math.min(viewportHeight, viewportWidth)) * 100 :
      outputUnit === "vmax" ? (pxValue / Math.max(viewportHeight, viewportWidth)) * 100 :
      outputUnit === "pt" ? pxValue * (72 / 96) : 0;

    const formattedInput = `${inputValue}${inputUnit}`;
    const formattedOutput = `${outputValue.toFixed(2)}${outputUnit}`;
    _setCode('conversionResult', `${formattedInput} = ${formattedOutput}`, 'text');
  };

  // Add event listeners for unit converter
  document.querySelectorAll("#unit-converter input, #unit-converter select").forEach(input => {
    input.addEventListener("input", updateConversion);
  });

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

  document.getElementById("copyConversion").addEventListener("click", () => {
    const cvEl = document.getElementById("conversionResult");
    const result = cvEl.dataset.raw || cvEl.textContent;
    const button = document.getElementById("copyConversion");
    const originalText = button.textContent;
    navigator.clipboard.writeText(result).then(() => {
      button.textContent = "Copied!";
      setTimeout(() => { button.textContent = originalText; }, 2000);
    }).catch(() => {
      button.textContent = "Copy failed";
      setTimeout(() => { button.textContent = originalText; }, 2000);
    });
  });


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
      if (/^#[0-9A-Fa-f]{6}$/.test(colorText.value)) {
        colorInput.value = colorText.value;
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
  };

  document.getElementById("useEyedropper").addEventListener("click", async () => {
    try {
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
      foregroundColorInput.value = result.sRGBHex;
      foregroundColorText.value = result.sRGBHex;
      updateContrastChecker();
    } catch (err) {
      console.error("Eyedropper error:", err);
    }
  });

  foregroundColorInput.addEventListener("input", () => {
    updateContrastChecker();
  });

  backgroundColorInput.addEventListener("input", () => {
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

  // Case conversion functions
  const caseConverters = {
    upper: (text) => text.toUpperCase(),
    lower: (text) => text.toLowerCase(),
    title: (text) => text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase()),
    sentence: (text) => text.replace(/(^\w|\.\s+\w)/g, letter => letter.toUpperCase()),
    capitalize: (text) => text.replace(/\b\w/g, letter => letter.toUpperCase()),
    toggle: (text) => text.split('').map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join(''),
    inverse: (text) => text.split('').map((c, i) => i % 2 ? c.toUpperCase() : c.toLowerCase()).join('')
  };
  // Add event listeners for case conversion buttons
  document.querySelectorAll('#text-case button[data-case]').forEach(button => {
    button.addEventListener('click', () => {
      const converter = caseConverters[button.dataset.case];
      if (converter && textInput.value.trim()) {
        const newText = converter(textInput.value);
        textInput.value = newText;
        addToHistory(newText);
      }
    });
  });

  // Utility functions
  document.getElementById('removeSpaces').addEventListener('click', () => {
    if (textInput.value.trim()) {
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

  document.getElementById('copyText').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(textInput.value);
      const originalText = document.getElementById('copyText').textContent;
      document.getElementById('copyText').textContent = 'Copied!';
      setTimeout(() => {
        document.getElementById('copyText').textContent = originalText;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
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
    const baseSize  = parseFloat(document.getElementById("fluidBaseSize").value)  || 16;
    const minScale  = parseFloat(document.getElementById("fluidMinScale").value)  || 1.2;
    const maxScale  = parseFloat(document.getElementById("fluidMaxScale").value)  || 1.333;
    const minVp     = parseFloat(document.getElementById("fluidMinVp").value)     || 320;
    const maxVp     = parseFloat(document.getElementById("fluidMaxVp").value)     || 1280;
    const rawPrefix = (document.getElementById("fluidVarPrefix").value || "--font-").trim();
    const prefix    = rawPrefix.endsWith("-") ? rawPrefix : rawPrefix + "-";
    const format    = document.querySelector('input[name="fluidFormat"]:checked')?.value || "css";

    const typeSteps = [
      { name: "h1",   step: 5 },
      { name: "h2",   step: 4 },
      { name: "h3",   step: 3 },
      { name: "h4",   step: 2 },
      { name: "h5",   step: 1 },
      { name: "h6",   step: 0.5 },
      { name: "body", step: 0 },
      { name: "sm",   step: -0.5 },
      { name: "xs",   step: -1 },
    ];

    const spacingMults = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32];
    const spacingBase  = 4;

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
      const lines = ["// tailwind.config.js — theme.extend", `// ${typeComment}`, "fontSize: {"];
      typeEntries.forEach(({ name, value }) => lines.push(`  '${name}': ['${value}'],`));
      lines.push("},", "spacing: {");
      spacingEntries.forEach(({ name, value }) => lines.push(`  '${name}': '${value}',`));
      lines.push("}");
      output = lines.join("\n");
    } else {
      const lines = [`// SCSS — ${typeComment}`, "$type-scale: ("];
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
          <span class="fluid-scale-label">${prefix}${name}</span>
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

  document.getElementById("copyFluid").addEventListener("click", () => {
    const btn = document.getElementById("copyFluid");
    const orig = btn.textContent;
    navigator.clipboard.writeText(document.getElementById("fluidOutput").dataset.raw || document.getElementById("fluidOutput").textContent).then(() => {
      btn.textContent = "Copied!";
      setTimeout(() => { btn.textContent = orig; }, 2000);
    }).catch(() => {
      btn.textContent = "Copy failed";
      setTimeout(() => { btn.textContent = orig; }, 2000);
    });
  });

  updateFluidDesign();


  // ─── ANIMATION BUILDER ──────────────────────────────────────────────────────

  const bezierCanvas = document.getElementById("bezierCanvas");
  const bezierCtx = bezierCanvas.getContext("2d");
  const BEZIER_PAD = 18;
  let bezierDragging = null;

  function bezierToCanvas(bx, by) {
    const w = bezierCanvas.width, h = bezierCanvas.height, p = BEZIER_PAD;
    return {
      x: p + bx * (w - 2 * p),
      y: (h - p) - by * (h - 2 * p)
    };
  }

  function canvasToBezier(cx, cy) {
    const w = bezierCanvas.width, h = bezierCanvas.height, p = BEZIER_PAD;
    return {
      bx: Math.max(0, Math.min(1, (cx - p) / (w - 2 * p))),
      by: ((h - p) - cy) / (h - 2 * p)
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
    const isDark = document.documentElement.dataset.theme !== "light";
    const gridColor = isDark ? "#2d3144" : "#e2e8f0";
    const lineColor = isDark ? "#8892a4" : "#94a3b8";
    const accent = "#4caf50";
    const fixedPt = isDark ? "#e2e8f0" : "#1a202c";

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

  function updateAnimOutput() {
    const { x1, y1, x2, y2 } = getBezierValues();
    const name = document.getElementById("animName").value.trim() || "myAnimation";
    const dur = document.getElementById("animDuration").value || "0.5";
    const delay = document.getElementById("animDelay").value || "0";
    const iter = document.getElementById("animIterations").value || "1";
    const dir = document.getElementById("animDirection").value;
    const from = document.getElementById("keyframeFrom").value.trim();
    const to = document.getElementById("keyframeTo").value.trim();
    const curve = `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
    const output = `@keyframes ${name} {\n  from { ${from} }\n  to   { ${to} }\n}\n\n.element {\n  animation: ${name} ${dur}s ${curve} ${delay}s ${iter} ${dir} both;\n}`;
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

  bezierCanvas.addEventListener("mousemove", e => {
    if (!bezierDragging) return;
    const rect = bezierCanvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (bezierCanvas.width / rect.width);
    const my = (e.clientY - rect.top) * (bezierCanvas.height / rect.height);
    const { bx, by } = canvasToBezier(mx, my);
    if (bezierDragging === "p1") {
      document.getElementById("bx1").value = Math.max(0, Math.min(1, bx)).toFixed(2);
      document.getElementById("by1").value = by.toFixed(2);
    } else {
      document.getElementById("bx2").value = Math.max(0, Math.min(1, bx)).toFixed(2);
      document.getElementById("by2").value = by.toFixed(2);
    }
    updateAnimOutput();
  });

  document.addEventListener("mouseup", () => { bezierDragging = null; });

  document.querySelectorAll(".bezier-preset").forEach(btn => {
    btn.addEventListener("click", () => {
      const [x1, y1, x2, y2] = btn.dataset.curve.split(",").map(Number);
      document.getElementById("bx1").value = x1;
      document.getElementById("by1").value = y1;
      document.getElementById("bx2").value = x2;
      document.getElementById("by2").value = y2;
      updateAnimOutput();
    });
  });

  ["bx1", "by1", "bx2", "by2", "animDuration", "animDelay", "animIterations", "animDirection", "animName", "keyframeFrom", "keyframeTo"].forEach(id => {
    document.getElementById(id).addEventListener("input", updateAnimOutput);
  });

  document.getElementById("playAnimation").addEventListener("click", () => {
    const box = document.getElementById("animPreviewBox");
    const { x1, y1, x2, y2 } = getBezierValues();
    const dur = parseFloat(document.getElementById("animDuration").value) || 0.5;
    const name = document.getElementById("animName").value.trim() || "myAnimation";
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

  document.getElementById("copyAnimation").addEventListener("click", () => {
    const btn = document.getElementById("copyAnimation");
    const orig = btn.textContent;
    navigator.clipboard.writeText(document.getElementById("animOutput").dataset.raw || document.getElementById("animOutput").textContent).then(() => {
      btn.textContent = "Copied!";
      setTimeout(() => { btn.textContent = orig; }, 2000);
    }).catch(() => {
      btn.textContent = "Copy failed";
      setTimeout(() => { btn.textContent = orig; }, 2000);
    });
  });

  updateAnimOutput();


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

  function updateSerpPreview() {
    const rawTitle = document.getElementById("seoTitle").value;
    const rawDesc = document.getElementById("seoDescription").value;
    const rawUrl = document.getElementById("seoUrl").value;

    const titleLen = rawTitle.length;
    const descLen = rawDesc.length;
    document.getElementById("seoTitleCount").textContent = `${titleLen} chars${titleLen > 60 ? " (too long)" : ""}`;
    document.getElementById("seoDescCount").textContent = `${descLen} chars${descLen > 160 ? " (too long)" : ""}`;

    const isDesktop = seoView === "desktop";
    const titleMaxPx = isDesktop ? 580 : 340;
    const descMaxPx = isDesktop ? 700 : 380;
    const titleFont = isDesktop ? "20px Arial" : "16px Arial";
    const descFont = "14px Arial";

    const { text: title, truncated: tTrunc } = truncateToPixels(rawTitle || "Page Title", titleMaxPx, titleFont);
    const { text: desc, truncated: dTrunc } = truncateToPixels(rawDesc || "Meta description will appear here…", descMaxPx, descFont);

    let urlDisplay = rawUrl || "https://example.com";
    try { const u = new URL(urlDisplay.startsWith("http") ? urlDisplay : "https://" + urlDisplay); urlDisplay = u.hostname + u.pathname; } catch {}

    document.getElementById("serpTitle").textContent = title;
    document.getElementById("serpDescription").textContent = desc;
    document.getElementById("serpUrl").textContent = urlDisplay;

    const preview = document.getElementById("serpPreview");
    preview.classList.toggle("serp-mobile", !isDesktop);

    const warnings = [];
    if (!rawTitle) warnings.push("No title set");
    else if (rawTitle.length > 60) warnings.push(`Title is ${rawTitle.length} chars — Google typically shows ~60`);
    if (!rawDesc) warnings.push("No meta description set");
    else if (rawDesc.length > 160) warnings.push(`Description is ${rawDesc.length} chars — Google typically shows ~160`);
    if (tTrunc) warnings.push("Title will be truncated in search results");
    if (dTrunc) warnings.push("Description will be truncated in search results");

    document.getElementById("seoWarnings").innerHTML = warnings.map(w => `<p class="seo-warning">${SI.warn} ${w}</p>`).join("");
  }

  ["seoTitle", "seoDescription", "seoUrl"].forEach(id => {
    document.getElementById(id).addEventListener("input", updateSerpPreview);
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
            url: location.href
          };
        }
      }, (results) => {
        btn.textContent = "Fetch from Active Tab";
        btn.disabled = false;
        if (results?.[0]?.result) {
          const { title, description, url } = results[0].result;
          document.getElementById("seoTitle").value = title;
          document.getElementById("seoDescription").value = description;
          document.getElementById("seoUrl").value = url;
          updateSerpPreview();
        }
      });
    });
  });

  updateSerpPreview();


  // ─── JSON → TYPESCRIPT ──────────────────────────────────────────────────────

  function inferType(value, key, interfaces, nameStack) {
    if (value === null) return "null";
    const t = typeof value;
    if (t === "string") return "string";
    if (t === "number") return "number";
    if (t === "boolean") return "boolean";
    if (Array.isArray(value)) {
      if (!value.length) return "unknown[]";
      const itemType = inferType(value[0], key, interfaces, nameStack);
      return `${itemType.includes(" ") ? `(${itemType})` : itemType}[]`;
    }
    if (t === "object") {
      const childName = key.charAt(0).toUpperCase() + key.slice(1).replace(/s$/, "");
      buildTsInterface(value, childName, interfaces, nameStack);
      return childName;
    }
    return "unknown";
  }

  function buildTsInterface(obj, name, interfaces, nameStack) {
    if (nameStack.has(name)) return;
    nameStack.add(name);
    const lines = [`interface ${name} {`];
    for (const [key, value] of Object.entries(obj)) {
      const optional = document.getElementById("optionalToggle").checked && Array.isArray(value) ? "?" : "";
      const type = inferType(value, key, interfaces, nameStack);
      lines.push(`  ${key}${optional}: ${type};`);
    }
    lines.push("}");
    interfaces.unshift(lines.join("\n"));
  }

  function buildZodSchema(obj, name, schemas, nameStack) {
    if (nameStack.has(name)) return;
    nameStack.add(name);

    function zodType(value, key) {
      if (value === null) return "z.null()";
      const t = typeof value;
      if (t === "string") return "z.string()";
      if (t === "number") return "z.number()";
      if (t === "boolean") return "z.boolean()";
      if (Array.isArray(value)) {
        if (!value.length) return "z.array(z.unknown())";
        return `z.array(${zodType(value[0], key)})`;
      }
      if (t === "object") {
        const childName = key.charAt(0).toUpperCase() + key.slice(1).replace(/s$/, "");
        buildZodSchema(value, childName, schemas, nameStack);
        return childName + "Schema";
      }
      return "z.unknown()";
    }

    const lines = [`const ${name}Schema = z.object({`];
    for (const [key, value] of Object.entries(obj)) {
      lines.push(`  ${key}: ${zodType(value, key)},`);
    }
    lines.push("});");
    schemas.unshift(lines.join("\n"));
  }

  document.getElementById("convertJson").addEventListener("click", () => {
    const input = document.getElementById("jsonInput").value.trim();
    const errEl = document.getElementById("jsonError");
    const outEl = document.getElementById("tsOutput");
    errEl.textContent = "";

    if (!input) { errEl.textContent = "Paste some JSON first."; return; }

    let parsed;
    try { parsed = JSON.parse(input); } catch (e) { errEl.textContent = `JSON parse error: ${e.message}`; return; }

    const rootName = document.getElementById("rootInterfaceName").value.trim() || "Root";
    const interfaces = [];
    const nameStack = new Set();

    if (typeof parsed === "object" && !Array.isArray(parsed)) {
      buildTsInterface(parsed, rootName, interfaces, nameStack);
    } else if (Array.isArray(parsed) && parsed.length && typeof parsed[0] === "object") {
      buildTsInterface(parsed[0], rootName + "Item", interfaces, nameStack);
      interfaces.push(`type ${rootName} = ${rootName}Item[];`);
    } else {
      errEl.textContent = "Top-level JSON must be an object or array of objects.";
      return;
    }

    let output = interfaces.join("\n\n");

    if (document.getElementById("zodToggle").checked) {
      const schemas = [];
      const zodStack = new Set();
      if (Array.isArray(parsed) && parsed.length) buildZodSchema(parsed[0], rootName + "Item", schemas, zodStack);
      else buildZodSchema(parsed, rootName, schemas, zodStack);
      output += "\n\n// Zod Schemas\nimport { z } from 'zod';\n\n" + schemas.join("\n\n");
    }

    _setCode(outEl, output, 'text');
  });

  document.getElementById("jsonInput").addEventListener("input", () => {
    document.getElementById("jsonError").textContent = "";
  });

  document.getElementById("copyTs").addEventListener("click", () => {
    const btn = document.getElementById("copyTs");
    const orig = btn.textContent;
    navigator.clipboard.writeText(document.getElementById("tsOutput").dataset.raw || document.getElementById("tsOutput").textContent).then(() => {
      btn.textContent = "Copied!";
      setTimeout(() => { btn.textContent = orig; }, 2000);
    }).catch(() => {
      btn.textContent = "Copy failed";
      setTimeout(() => { btn.textContent = orig; }, 2000);
    });
  });


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

  function hexToRgbArr(hex) {
    const v = parseInt(hex.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }

  function lighten(hex, amt) {
    const [r, g, b] = hexToRgbArr(hex);
    return `rgb(${Math.min(255, r + amt)}, ${Math.min(255, g + amt)}, ${Math.min(255, b + amt)})`;
  }

  function darken(hex, amt) {
    const [r, g, b] = hexToRgbArr(hex);
    return `rgb(${Math.max(0, r - amt)}, ${Math.max(0, g - amt)}, ${Math.max(0, b - amt)})`;
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

  function updateGlass() {
    const card = document.getElementById("glassCard");
    const output = document.getElementById("glassOutput");
    const warning = document.getElementById("glassContrastWarning");

    if (glassMode === "glass") {
      const bgColor = document.getElementById("glassBg").value;
      const bgOpacity = parseInt(document.getElementById("glassBgOpacity").value) / 100;
      const blur = parseInt(document.getElementById("glassBlur").value);
      const borderOp = parseInt(document.getElementById("glassBorderOpacity").value) / 100;
      const shadowOp = parseInt(document.getElementById("glassShadowOpacity").value) / 100;
      const radius = parseInt(document.getElementById("glassBorderRadius").value);
      const textColor = document.getElementById("glassTextColor").value;
      const scene = document.getElementById("glassBgScene").value;

      const [r, g, b] = hexToRgbArr(bgColor);
      const css = `.glass {
  background: rgba(${r}, ${g}, ${b}, ${bgOpacity.toFixed(2)});
  backdrop-filter: blur(${blur}px);
  -webkit-backdrop-filter: blur(${blur}px);
  border-radius: ${radius}px;
  border: 1px solid rgba(255, 255, 255, ${borderOp.toFixed(2)});
  box-shadow: 0 8px 32px rgba(0, 0, 0, ${shadowOp.toFixed(2)});
  color: ${textColor};
}`;
      _setCode(output, css);

      card.style.cssText = `background: rgba(${r},${g},${b},${bgOpacity.toFixed(2)}); backdrop-filter: blur(${blur}px); -webkit-backdrop-filter: blur(${blur}px); border-radius: ${radius}px; border: 1px solid rgba(255,255,255,${borderOp.toFixed(2)}); box-shadow: 0 8px 32px rgba(0,0,0,${shadowOp.toFixed(2)}); color: ${textColor};`;

      const scene_el = document.getElementById("glassScene");
      scene_el.className = `glass-scene glass-scene--${scene}`;

      // Contrast warning (approximate on white/black text)
      const approxBg = `#${Math.round(r).toString(16).padStart(2,"0")}${Math.round(g).toString(16).padStart(2,"0")}${Math.round(b).toString(16).padStart(2,"0")}`;
      const cr = contrastRatio(textColor, approxBg);
      if (cr < 4.5) {
        warning.innerHTML = `${SI.warn} Contrast ratio ~${cr.toFixed(1)}:1 - may fail WCAG AA (needs 4.5:1 for normal text)`;
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

  ["glassBg", "glassBgOpacity", "glassBlur", "glassBorderOpacity", "glassShadowOpacity", "glassBorderRadius", "glassTextColor", "glassBgScene"].forEach(id => {
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

  document.getElementById("copyGlass").addEventListener("click", () => {
    const btn = document.getElementById("copyGlass");
    const orig = btn.textContent;
    navigator.clipboard.writeText(document.getElementById("glassOutput").dataset.raw || document.getElementById("glassOutput").textContent).then(() => {
      btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = orig; }, 2000);
    }).catch(() => { btn.textContent = "Copy failed"; setTimeout(() => { btn.textContent = orig; }, 2000); });
  });

  updateGlass();


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
  function updateContainerQuery() {
    const name = document.getElementById("cqContainerName").value.trim() || "card";
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

  document.getElementById("cqContainerName").addEventListener("input", updateContainerQuery);
  document.getElementById("cqContainerType").addEventListener("change", updateContainerQuery);
  document.getElementById("addCqBp").addEventListener("click", () => {
    const list = document.getElementById("cqBreakpoints");
    const row = document.createElement("div");
    row.className = "cq-breakpoint-row";
    row.innerHTML = `<input type="number" class="cq-bp-width" value="600" placeholder="600"><span>px</span><input type="text" class="cq-bp-css" placeholder="CSS properties…"><button class="remove-cq-bp btn-hover">×</button>`;
    list.appendChild(row);
    row.querySelectorAll("input").forEach(i => i.addEventListener("input", updateContainerQuery));
    row.querySelector(".remove-cq-bp").addEventListener("click", () => { row.remove(); updateContainerQuery(); });
    updateContainerQuery();
  });
  document.querySelectorAll(".remove-cq-bp").forEach(btn => btn.addEventListener("click", () => { btn.closest(".cq-breakpoint-row").remove(); updateContainerQuery(); }));
  document.querySelectorAll(".cq-bp-width, .cq-bp-css").forEach(el => el.addEventListener("input", updateContainerQuery));
  document.getElementById("copyCq").addEventListener("click", () => {
    const btn = document.getElementById("copyCq"); const orig = btn.textContent;
    navigator.clipboard.writeText(document.getElementById("cqOutput").dataset.raw || document.getElementById("cqOutput").textContent).then(() => { btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = orig; }, 2000); });
  });
  updateContainerQuery();

  // Logical Properties Converter
  const LOGICAL_MAP = {
    "margin-left": "margin-inline-start", "margin-right": "margin-inline-end",
    "margin-top": "margin-block-start", "margin-bottom": "margin-block-end",
    "padding-left": "padding-inline-start", "padding-right": "padding-inline-end",
    "padding-top": "padding-block-start", "padding-bottom": "padding-block-end",
    "border-left": "border-inline-start", "border-right": "border-inline-end",
    "border-top": "border-block-start", "border-bottom": "border-block-end",
    "left": "inset-inline-start", "right": "inset-inline-end",
    "top": "inset-block-start", "bottom": "inset-block-end",
    "width": "inline-size", "height": "block-size",
    "min-width": "min-inline-size", "max-width": "max-inline-size",
    "min-height": "min-block-size", "max-height": "max-block-size",
    "text-align: left": "text-align: start", "text-align: right": "text-align: end",
    "float: left": "float: inline-start", "float: right": "float: inline-end",
  };

  document.getElementById("convertLogical").addEventListener("click", () => {
    let css = document.getElementById("logicalInput").value;
    for (const [phys, logical] of Object.entries(LOGICAL_MAP)) {
      css = css.replace(new RegExp(`\\b${phys.replace(/[-:]/g, "\\$&")}\\b`, "g"), logical);
    }
    _setCode('logicalOutput', css);
  });
  document.getElementById("copyLogical").addEventListener("click", () => {
    const btn = document.getElementById("copyLogical"); const orig = btn.textContent;
    navigator.clipboard.writeText(document.getElementById("logicalOutput").dataset.raw || document.getElementById("logicalOutput").textContent).then(() => { btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = orig; }, 2000); });
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
  document.getElementById("copyHas").addEventListener("click", () => {
    const btn = document.getElementById("copyHas"); const orig = btn.textContent;
    navigator.clipboard.writeText(document.getElementById("hasOutput").dataset.raw || document.getElementById("hasOutput").textContent).then(() => { btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = orig; }, 2000); });
  });
  updateHasOutput();


  // ─── SCHEMA GENERATOR (JSON-LD) ─────────────────────────────────────────────

  const SCHEMA_FIELDS = {
    Article: [
      { key: "headline", label: "Headline", type: "text", required: true, placeholder: "Article title" },
      { key: "description", label: "Description", type: "text", placeholder: "Short description" },
      { key: "author", label: "Author Name", type: "text", placeholder: "John Doe" },
      { key: "datePublished", label: "Date Published", type: "date", required: true },
      { key: "dateModified", label: "Date Modified", type: "date" },
      { key: "image", label: "Image URL", type: "text", placeholder: "https://example.com/image.jpg" },
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
    ],
    FAQPage: [
      { key: "faqItems", label: "FAQ Items", type: "faq" },
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
    container.innerHTML = fields.map(f => {
      if (f.type === "faq") return `<div id="faqList" class="faq-list"></div><button id="addFaqItem" class="btn-hover">+ Add Q&amp;A</button>`;
      if (f.type === "select") return `<div class="input-group"><label>${f.label}${f.required ? " *" : ""}</label><select id="schema_${f.key}">${(f.options || []).map(o => `<option>${o}</option>`).join("")}</select></div>`;
      if (f.type === "date") return `<div class="input-group"><label>${f.label}${f.required ? " *" : ""}</label><input type="date" id="schema_${f.key}"></div>`;
      return `<div class="input-group"><label>${f.label}${f.required ? " *" : ""}</label><input type="${f.type}" id="schema_${f.key}" placeholder="${f.placeholder || ""}"></div>`;
    }).join("");

    if (type === "FAQPage") {
      const faqList = document.getElementById("faqList");
      function addFaqItem(q = "", a = "") {
        const row = document.createElement("div");
        row.className = "faq-item-row";
        row.innerHTML = `<input type="text" class="faq-q" placeholder="Question…" value="${q.replace(/"/g, "&quot;")}"><textarea class="faq-a" rows="2" placeholder="Answer…">${a}</textarea><button class="remove-faq-item btn-hover">×</button>`;
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
      const items = [...document.querySelectorAll(".faq-item-row")].map(row => ({
        "@type": "Question",
        name: row.querySelector(".faq-q").value,
        acceptedAnswer: { "@type": "Answer", text: row.querySelector(".faq-a").value }
      }));
      schema.mainEntity = items;
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
    } else if (type === "LocalBusiness") {
      const name = document.getElementById("schema_name")?.value; if (!name) missing.push("name"); else schema.name = name;
      ["description","telephone","email","url","openingHours"].forEach(k => {
        const v = document.getElementById(`schema_${k}`)?.value; if (v) schema[k] = v;
      });
      const street = document.getElementById("schema_streetAddress")?.value;
      if (street) schema.address = { "@type": "PostalAddress", streetAddress: street, addressLocality: document.getElementById("schema_city")?.value, addressRegion: document.getElementById("schema_region")?.value, postalCode: document.getElementById("schema_postalCode")?.value, addressCountry: document.getElementById("schema_country")?.value };
    } else {
      fields.forEach(f => {
        if (f.type === "faq") return;
        const el = document.getElementById(`schema_${f.key}`);
        if (!el) return;
        const val = el.value.trim();
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
  document.getElementById("copySchema").addEventListener("click", () => {
    const btn = document.getElementById("copySchema"); const orig = btn.textContent;
    navigator.clipboard.writeText(document.getElementById("schemaOutput").dataset.raw || document.getElementById("schemaOutput").textContent).then(() => { btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = orig; }, 2000); }).catch(() => { btn.textContent = "Copy failed"; setTimeout(() => { btn.textContent = orig; }, 2000); });
  });
  renderSchemaFields();


  // ─── ROBOTS.TXT GENERATOR ────────────────────────────────────────────────────

  function updateRobots() {
    const lines = [];
    const blockedBots = [...document.querySelectorAll(".bot-toggle:checked")].map(cb => cb.dataset.bot);
    blockedBots.forEach(bot => { lines.push(`User-agent: ${bot}`, "Disallow: /", ""); });

    const paths = [...document.querySelectorAll(".robots-path-row")];
    const uaGroups = {};
    paths.forEach(row => {
      const ua = row.querySelector(".robots-ua-select").value;
      const path = row.querySelector(".robots-path-input").value.trim();
      if (!path) return;
      if (!uaGroups[ua]) uaGroups[ua] = [];
      uaGroups[ua].push(path);
    });

    if (!blockedBots.includes("*")) {
      lines.push("User-agent: *");
      if (uaGroups["*"] && uaGroups["*"].length) uaGroups["*"].forEach(p => lines.push(`Disallow: ${p}`));
      else lines.push("Disallow:");
      lines.push("");
    }

    Object.entries(uaGroups).filter(([ua]) => ua !== "*").forEach(([ua, ps]) => {
      lines.push(`User-agent: ${ua}`);
      ps.forEach(p => lines.push(`Disallow: ${p}`));
      lines.push("");
    });

    const sitemap = document.getElementById("robotsSitemap").value.trim();
    if (sitemap) lines.push(`Sitemap: ${sitemap}`);

    _setCode('robotsOutput', lines.join("\n").trimEnd(), 'text');
  }

  document.querySelectorAll(".bot-toggle, .robots-path-input, .robots-ua-select").forEach(el => el.addEventListener("change", updateRobots));
  document.querySelectorAll(".bot-toggle, .robots-path-input").forEach(el => el.addEventListener("input", updateRobots));
  document.getElementById("robotsSitemap").addEventListener("input", updateRobots);

  document.getElementById("addRobotsPath").addEventListener("click", () => {
    const list = document.getElementById("robotsDisallowList");
    const row = document.createElement("div");
    row.className = "robots-path-row";
    row.innerHTML = `<select class="robots-ua-select"><option value="*">All (*)</option><option value="Googlebot">Googlebot</option><option value="Bingbot">Bingbot</option></select><input type="text" class="robots-path-input" placeholder="/path/"><button class="remove-robots-path btn-hover">×</button>`;
    row.querySelector(".remove-robots-path").addEventListener("click", () => { row.remove(); updateRobots(); });
    row.querySelector(".robots-ua-select").addEventListener("change", updateRobots);
    row.querySelector(".robots-path-input").addEventListener("input", updateRobots);
    list.appendChild(row);
    updateRobots();
  });

  document.querySelectorAll(".remove-robots-path").forEach(btn => btn.addEventListener("click", () => { btn.closest(".robots-path-row").remove(); updateRobots(); }));

  document.getElementById("copyRobots").addEventListener("click", () => {
    const btn = document.getElementById("copyRobots"); const orig = btn.textContent;
    navigator.clipboard.writeText(document.getElementById("robotsOutput").dataset.raw || document.getElementById("robotsOutput").textContent).then(() => { btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = orig; }, 2000); }).catch(() => { btn.textContent = "Copy failed"; setTimeout(() => { btn.textContent = orig; }, 2000); });
  });

  updateRobots();


  // ─── HTML BEAUTIFY / MINIFY ──────────────────────────────────────────────────

  function beautifyHtml(html) {
    let level = 0;
    const INDENT = "  ";
    const voidTags = new Set(["area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"]);
    const inlineTags = new Set(["a","abbr","b","bdi","bdo","cite","code","data","dfn","em","i","kbd","mark","q","rp","rt","ruby","s","samp","small","span","strong","sub","sup","time","u","var","wbr"]);

    html = html.trim().replace(/>\s+</g, "><");
    const tokens = html.split(/(<[^>]+>)/);
    const lines = [];

    tokens.forEach(token => {
      if (!token.trim()) return;
      if (token.startsWith("</")) {
        level = Math.max(0, level - 1);
        lines.push(INDENT.repeat(level) + token.trim());
      } else if (token.startsWith("<!--")) {
        lines.push(INDENT.repeat(level) + token.trim());
      } else if (token.startsWith("<")) {
        const tagMatch = token.match(/^<([a-zA-Z][a-zA-Z0-9]*)/);
        const tag = tagMatch ? tagMatch[1].toLowerCase() : "";
        lines.push(INDENT.repeat(level) + token.trim());
        if (!voidTags.has(tag) && !token.endsWith("/>") && !inlineTags.has(tag)) level++;
      } else {
        const text = token.trim();
        if (text) lines.push(INDENT.repeat(level) + text);
      }
    });

    return lines.join("\n");
  }

  function minifyHtml(html, removeComments) {
    if (removeComments) html = html.replace(/<!--[\s\S]*?-->/g, "");
    return html
      .replace(/\s+/g, " ")
      .replace(/>\s+</g, "><")
      .replace(/\s+(\/?>)/g, "$1")
      .replace(/(<[a-z][^>]*)\s+>/gi, "$1>")
      .trim();
  }

  document.getElementById("hbmBeautify").addEventListener("click", () => {
    const input = document.getElementById("hbmInput").value.trim();
    const errEl = document.getElementById("hbmError");
    errEl.textContent = "";
    if (!input) { errEl.textContent = "Paste some HTML first."; return; }
    try { _setCode('hbmOutput', beautifyHtml(input), 'text'); }
    catch (e) { errEl.textContent = `Error: ${e.message}`; }
  });

  document.getElementById("hbmMinify").addEventListener("click", () => {
    const input = document.getElementById("hbmInput").value.trim();
    const errEl = document.getElementById("hbmError");
    errEl.textContent = "";
    if (!input) { errEl.textContent = "Paste some HTML first."; return; }
    const removeComments = document.getElementById("hbmRemoveComments").checked;
    _setCode('hbmOutput', minifyHtml(input, removeComments), 'text');
  });

  document.getElementById("copyHbm").addEventListener("click", () => {
    const btn = document.getElementById("copyHbm"); const orig = btn.textContent;
    navigator.clipboard.writeText(document.getElementById("hbmOutput").dataset.raw || document.getElementById("hbmOutput").textContent).then(() => { btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = orig; }, 2000); }).catch(() => { btn.textContent = "Copy failed"; setTimeout(() => { btn.textContent = orig; }, 2000); });
  });


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

    const emptyEl    = panel.querySelector('#__ci_empty');
    const contentEl  = panel.querySelector('#__ci_content');
    const lockBtn    = panel.querySelector('#__ci_lock_btn');
    const stopBtn    = panel.querySelector('#__ci_stop_btn');
    const copyAllBtn = panel.querySelector('#__ci_copy_all');
    const dot        = panel.querySelector('#__ci_dot');
    const bodyEl     = panel.querySelector('#__ci_body');

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

    function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function pxf(v) { return parseFloat(v) || 0; }
    function sh4(t, r, b, l) {
      if (t===r && r===b && b===l) return t;
      if (t===b && r===l) return `${t} ${r}`;
      if (r===l) return `${t} ${r} ${b}`;
      return `${t} ${r} ${b} ${l}`;
    }
    const SKIP = new Set(['none','auto','normal','0px','0','initial','inherit','unset','visible','static','1','0s','ease','all','rgba(0, 0, 0, 0)','transparent','matrix(1, 0, 0, 1, 0, 0)','']);
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
      const mT=cs.marginTop,mR=cs.marginRight,mB=cs.marginBottom,mL=cs.marginLeft;
      const pT=cs.paddingTop,pR=cs.paddingRight,pB=cs.paddingBottom,pL=cs.paddingLeft;
      const bW=sh4(cs.borderTopWidth,cs.borderRightWidth,cs.borderBottomWidth,cs.borderLeftWidth);
      const p=el.parentElement, pcs=p?window.getComputedStyle(p):null, pr=p?p.getBoundingClientRect():null;
      return {
        selector: genSel(el), tagName: el.tagName.toLowerCase(),
        id: el.id||null, classList: [...el.classList].filter(c=>!c.startsWith('__ci')),
        inlineStyle: el.style.cssText||null,
        rect: { w: Math.round(r.width), h: Math.round(r.height) },
        layout: {
          width:cs.width, height:cs.height, minWidth:cs.minWidth, maxWidth:cs.maxWidth,
          minHeight:cs.minHeight, maxHeight:cs.maxHeight, display:cs.display, position:cs.position,
          top:cs.top, right:cs.right, bottom:cs.bottom, left:cs.left,
          zIndex:cs.zIndex, overflow:cs.overflow, overflowX:cs.overflowX, overflowY:cs.overflowY,
          flexDirection:cs.flexDirection, flexWrap:cs.flexWrap,
          justifyContent:cs.justifyContent, alignItems:cs.alignItems,
          alignContent:cs.alignContent, gap:cs.gap,
          gridTemplateColumns:cs.gridTemplateColumns, gridTemplateRows:cs.gridTemplateRows,
          alignSelf:cs.alignSelf, justifySelf:cs.justifySelf,
          flexGrow:cs.flexGrow, flexShrink:cs.flexShrink, flexBasis:cs.flexBasis,
          gridColumn:cs.gridColumn, gridRow:cs.gridRow,
        },
        box: {
          margin:sh4(mT,mR,mB,mL), mT,mR,mB,mL,
          padding:sh4(pT,pR,pB,pL), pT,pR,pB,pL,
          borderWidth:bW, borderStyle:cs.borderTopStyle, borderColor:cs.borderTopColor,
          borderRadius:cs.borderRadius, boxSizing:cs.boxSizing, outline:cs.outline,
        },
        typo: {
          fontSize:cs.fontSize, fontFamily:cs.fontFamily, fontWeight:cs.fontWeight,
          fontStyle:cs.fontStyle, lineHeight:cs.lineHeight, letterSpacing:cs.letterSpacing,
          textTransform:cs.textTransform, textAlign:cs.textAlign,
          textDecoration:cs.textDecoration, whiteSpace:cs.whiteSpace,
          wordBreak:cs.wordBreak, textOverflow:cs.textOverflow,
        },
        colors: {
          color:cs.color, backgroundColor:cs.backgroundColor,
          backgroundImage:cs.backgroundImage, backgroundSize:cs.backgroundSize,
          backgroundPosition:cs.backgroundPosition, opacity:cs.opacity,
        },
        effects: {
          boxShadow:cs.boxShadow, textShadow:cs.textShadow,
          filter:cs.filter, backdropFilter:cs.backdropFilter,
          transform:cs.transform, transformOrigin:cs.transformOrigin,
          mixBlendMode:cs.mixBlendMode,
        },
        interaction: { cursor:cs.cursor, pointerEvents:cs.pointerEvents, userSelect:cs.userSelect, resize:cs.resize },
        anim: {
          transition:cs.transition, animation:cs.animation,
          animationName:cs.animationName, animationDuration:cs.animationDuration,
          animationTimingFunction:cs.animationTimingFunction, willChange:cs.willChange,
        },
        parent: pcs ? {
          tagName:p.tagName.toLowerCase(), display:pcs.display, flexDirection:pcs.flexDirection,
          justifyContent:pcs.justifyContent, alignItems:pcs.alignItems, gap:pcs.gap,
          gridTemplateColumns:pcs.gridTemplateColumns,
          width: pr ? Math.round(pr.width)+'px' : '', maxWidth:pcs.maxWidth,
        } : null,
      };
    }

    // ── CSS text builders (for copy functionality) ───────────────────────────
    const SKIP_VALS = new Set(['none','auto','normal','0px','0','initial','inherit','unset','start','visible','static','1','0s','ease','all']);
    function skip(val) { return SKIP_VALS.has(String(val).trim()); }
    function cssLine(prop, val) {
      if (!val || skip(val)) return '';
      return `  ${prop}: ${val};\n`;
    }

    function buildSectionCss(d, sid) {
      if (!d) return '';
      const l=d.layout, b=d.box, t=d.typo, c=d.colors, e=d.effects, i=d.interaction, a=d.anim;
      const map = {
        layout: () => [
          cssLine('display',l.display), cssLine('position',l.position),
          l.position!=='static' ? cssLine('top',l.top)+cssLine('right',l.right)+cssLine('bottom',l.bottom)+cssLine('left',l.left) : '',
          cssLine('width',l.width), cssLine('height',l.height),
          cssLine('flex-direction',l.flexDirection), cssLine('justify-content',l.justifyContent),
          cssLine('align-items',l.alignItems), cssLine('gap',l.gap),
          cssLine('grid-template-columns',l.gridTemplateColumns),
          cssLine('overflow',l.overflow), cssLine('z-index',l.zIndex),
        ].join(''),
        box: () => [
          cssLine('box-sizing',b.boxSizing), cssLine('margin',b.margin), cssLine('padding',b.padding),
          b.borderStyle&&b.borderStyle!=='none' ? `  border: ${b.borderWidth} ${b.borderStyle} ${b.borderColor};\n` : '',
          cssLine('border-radius',b.borderRadius),
        ].join(''),
        typo: () => [
          cssLine('font-size',t.fontSize), cssLine('font-family',t.fontFamily),
          cssLine('font-weight',t.fontWeight), cssLine('font-style',t.fontStyle),
          cssLine('line-height',t.lineHeight), cssLine('text-align',t.textAlign),
          cssLine('letter-spacing',t.letterSpacing), cssLine('text-transform',t.textTransform),
          cssLine('text-decoration',t.textDecoration), cssLine('white-space',t.whiteSpace),
        ].join(''),
        colors: () => [
          cssLine('color',c.color), cssLine('background-color',c.backgroundColor),
          c.backgroundImage&&c.backgroundImage!=='none' ? cssLine('background-image',c.backgroundImage) : '',
          c.opacity!=='1' ? cssLine('opacity',c.opacity) : '',
        ].join(''),
        effects: () => [
          cssLine('box-shadow',e.boxShadow), cssLine('filter',e.filter),
          cssLine('backdrop-filter',e.backdropFilter), cssLine('transform',e.transform),
          cssLine('mix-blend-mode',e.mixBlendMode),
        ].join(''),
        interaction: () => [
          cssLine('cursor',i.cursor), cssLine('pointer-events',i.pointerEvents),
          cssLine('user-select',i.userSelect),
        ].join(''),
        anim: () => [
          a.transition&&a.transition!=='all 0s ease 0s' ? cssLine('transition',a.transition) : '',
          a.animation&&a.animation!=='none 0s ease 0s 1 normal none running' ? cssLine('animation',a.animation) : '',
          cssLine('will-change',a.willChange),
        ].join(''),
      };
      const fn = map[sid];
      const body = fn ? fn() : '';
      return body.trim() ? `/* ${sid} */\n${body}` : '';
    }

    function buildFullCss(d) {
      if (!d) return '';
      const parts = ['layout','box','typo','colors','effects','interaction','anim']
        .map(s => buildSectionCss(d, s)).filter(Boolean).join('\n');
      return `/* ${d.selector} */\n${parts}`;
    }

    function copyText(btn, text) {
      if (!text.trim()) return;
      navigator.clipboard.writeText(text).then(() => {
        const prev = btn.textContent;
        btn.textContent = '✓';
        setTimeout(() => { btn.textContent = prev; }, 1500);
      }).catch(() => {});
    }

    // ── Pseudo-class state detection via CSSOM ───────────────────────────────
    const PSEUDO_STATES = [':hover',':focus',':active',':visited',':focus-within',':focus-visible',':checked',':disabled',':placeholder-shown',':target'];
    function getPseudoStyles(el) {
      const found = {};
      try {
        for (const sheet of [...document.styleSheets]) {
          let rules;
          try { rules = [...sheet.cssRules]; } catch(_) { continue; }
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
                try { if (el.matches(base)) { matches = true; break; } } catch(_) {}
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
      } catch(_) {}
      return found;
    }

    // ── Section helper ───────────────────────────────────────────────────────
    function sec(id, title, rows, open = true) {
      if (!rows.trim()) return '';
      return `<div class="ci-sec ${open?'':'ci-sec--closed'}" data-sid="${id}">
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
      const l=d.layout, b=d.box, t=d.typo, c=d.colors, e=d.effects, i=d.interaction, a=d.anim;
      const isFlex = l.display.includes('flex'), isGrid = l.display.includes('grid');
      const classes = d.classList.slice(0,3).map(v=>'.'+v).join('');
      const borderVal = b.borderWidth&&b.borderWidth!=='0px' ? `${b.borderWidth} ${b.borderStyle} ${b.borderColor}` : '';

      const layoutRows = [
        row('display', l.display, true), row('position', l.position),
        l.position!=='static'&&l.top!=='auto'    ? row('top',    l.top)    : '',
        l.position!=='static'&&l.right!=='auto'  ? row('right',  l.right)  : '',
        l.position!=='static'&&l.bottom!=='auto' ? row('bottom', l.bottom) : '',
        l.position!=='static'&&l.left!=='auto'   ? row('left',   l.left)   : '',
        row('width', l.width), row('height', l.height),
        l.minWidth!=='0px'  ? row('min-width',  l.minWidth)  : '',
        l.maxWidth!=='none' ? row('max-width',  l.maxWidth)  : '',
        l.zIndex!=='auto'   ? row('z-index',    l.zIndex)    : '',
        l.overflow!=='visible' ? row('overflow', l.overflow) : '',
        isFlex ? row('flex-dir',    l.flexDirection)  : '',
        isFlex ? row('justify',     l.justifyContent) : '',
        isFlex ? row('align-items', l.alignItems)     : '',
        (isFlex||isGrid)&&l.gap&&l.gap!=='normal' ? row('gap', l.gap) : '',
        isGrid&&l.gridTemplateColumns!=='none' ? row('grid-cols', l.gridTemplateColumns) : '',
        l.flexGrow!=='0'  ? row('flex-grow',  l.flexGrow)  : '',
        l.flexBasis!=='auto' ? row('flex-basis', l.flexBasis) : '',
        l.alignSelf!=='auto' ? row('align-self', l.alignSelf) : '',
      ].join('');

      const boxRows = [
        row('box-sizing', b.boxSizing),
        row('margin', b.margin), row('padding', b.padding),
        row('border', borderVal),
        b.borderRadius!=='0px' ? row('radius', b.borderRadius) : '',
        b.outline&&b.outline!=='none'&&!b.outline.startsWith('0px') ? row('outline', b.outline) : '',
      ].join('');

      const typoRows = [
        row('font-size', t.fontSize, true), row('font', t.fontFamily), row('weight', t.fontWeight),
        row('line-height', t.lineHeight), row('text-align', t.textAlign),
        t.letterSpacing!=='normal'  ? row('letter-sp',  t.letterSpacing)  : '',
        t.textTransform!=='none'    ? row('transform',   t.textTransform)  : '',
        t.textDecoration!=='none'   ? row('decoration',  t.textDecoration) : '',
        t.whiteSpace!=='normal'     ? row('white-space', t.whiteSpace)     : '',
        t.wordBreak!=='normal'      ? row('word-break',  t.wordBreak)      : '',
      ].join('');

      const colorRows = [
        `<div class="ci-row"><span class="ci-lbl">color</span><span class="ci-val">${sw(c.color)}${esc(c.color||'—')}</span></div>`,
        `<div class="ci-row"><span class="ci-lbl">background</span><span class="ci-val">${sw(c.backgroundColor)}${esc(c.backgroundColor||'—')}</span></div>`,
        c.backgroundImage&&c.backgroundImage!=='none' ? row('bg-image', c.backgroundImage.length>55?c.backgroundImage.slice(0,55)+'…':c.backgroundImage) : '',
        c.opacity!=='1' ? row('opacity', c.opacity) : '',
      ].join('');

      const fxRows = [
        e.boxShadow&&e.boxShadow!=='none'         ? row('box-shadow', e.boxShadow)       : '',
        e.textShadow&&e.textShadow!=='none'        ? row('text-shadow', e.textShadow)     : '',
        e.filter&&e.filter!=='none'                ? row('filter', e.filter)              : '',
        e.backdropFilter&&e.backdropFilter!=='none' ? row('backdrop', e.backdropFilter)   : '',
        e.transform&&e.transform!=='none'&&e.transform!=='matrix(1, 0, 0, 1, 0, 0)' ? row('transform', e.transform) : '',
        e.mixBlendMode&&e.mixBlendMode!=='normal'  ? row('blend', e.mixBlendMode)         : '',
      ].join('');

      const ixRows = [
        row('cursor', i.cursor, true),
        i.pointerEvents!=='auto'  ? row('pointer-ev',  i.pointerEvents) : '',
        i.userSelect&&i.userSelect!=='auto' ? row('user-select', i.userSelect) : '',
        i.resize&&i.resize!=='none' ? row('resize', i.resize) : '',
      ].join('');

      const animRows = [
        a.transition&&a.transition!=='all 0s ease 0s' ? row('transition', a.transition) : '',
        a.animationName&&a.animationName!=='none'       ? row('anim-name', a.animationName) : '',
        a.animationDuration&&a.animationDuration!=='0s' ? row('duration',  a.animationDuration) : '',
        a.willChange&&a.willChange!=='auto'             ? row('will-change', a.willChange) : '',
      ].join('');

      let parentRows = '';
      if (d.parent) {
        const p = d.parent, pisFlex=p.display.includes('flex'), pisGrid=p.display.includes('grid');
        parentRows = [
          row('tag',     `<${p.tagName}>`), row('display', p.display),
          p.width        ? row('width',     p.width)                    : '',
          p.maxWidth!=='none' ? row('max-width', p.maxWidth)            : '',
          pisFlex ? row('flex-dir', p.flexDirection)                    : '',
          pisFlex ? row('justify',  p.justifyContent)                   : '',
          pisFlex ? row('align-it', p.alignItems)                       : '',
          (pisFlex||pisGrid)&&p.gap&&p.gap!=='normal' ? row('gap', p.gap) : '',
          pisGrid&&p.gridTemplateColumns!=='none' ? row('grid-cols', p.gridTemplateColumns) : '',
        ].join('');
      }

      // ── Pseudo-class states section
      const pseudoStyles = el ? getPseudoStyles(el) : {};
      const pseudoEntries = Object.entries(pseudoStyles).filter(([,props]) => Object.keys(props).length > 0);
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
          <div id="__ci_meta">&lt;${esc(d.tagName)}&gt;${d.id?' #'+esc(d.id):''}${classes?' '+esc(classes):''} · ${d.rect.w}×${d.rect.h}px</div>
        </div>
        ${sec('layout',      'Layout',           layoutRows, true)}
        ${sec('box',         'Box Model',         boxRows,    true)}
        ${sec('typo',        'Typography',        typoRows,   true)}
        ${sec('colors',      'Colors',            colorRows,  true)}
        ${sec('effects',     'Effects',           fxRows,     false)}
        ${sec('interaction', 'Interaction',       ixRows,     false)}
        ${sec('anim',        'Animations',        animRows,   false)}
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
        const mT=pxf(cs.marginTop),mR=pxf(cs.marginRight),mB=pxf(cs.marginBottom),mL=pxf(cs.marginLeft);
        const pT=pxf(cs.paddingTop),pR=pxf(cs.paddingRight),pB=pxf(cs.paddingBottom),pL=pxf(cs.paddingLeft);
        mb.style.cssText = `display:block;top:${r.top-mT}px;left:${r.left-mL}px;width:${r.width+mL+mR}px;height:${r.height+mT+mB}px;`;
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
        try { chrome.storage.local.set({ wdt_inspect_lock: lastData }); } catch(_) {}
      } else if (!val) {
        try { chrome.storage.local.remove('wdt_inspect_lock'); } catch(_) {}
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
      if (rafId) cancelAnimationFrame(rafId);
      [style, panel, overlay, mb, pb].forEach(el => { if (el && el.parentElement) el.remove(); });
      window.__cssInspectorCleanup = null;
    }

    const onKey = e => {
      if (e.key === 'Escape') {
        if (locked) setLocked(false);
        else cleanup();
      }
    };

    stopBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (lastData) {
        try { chrome.storage.local.set({ wdt_inspect_lock: lastData }); } catch(_) {}
      }
      cleanup();
    });
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey);
    window.__cssInspectorCleanup = cleanup;
  }

  // ── Panel UI ─────────────────────────────────────────────────────────────

  const ciStartBtn  = document.getElementById('startCssInspect');
  const ciStopBtn   = document.getElementById('stopCssInspect');
  const ciStatusBar = document.getElementById('inspectorStatusBar');
  const ciStatusTxt = document.getElementById('inspectorStatusText');
  const ciEmpty     = document.getElementById('inspectorEmpty');
  const ciData      = document.getElementById('inspectorData');
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
        }).catch(() => {});
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
    if (data.wdt_inspect_lock) {
      ciRenderData(data.wdt_inspect_lock);
      ciSetStatus('locked', 'Data saved - click Clear to reset, or Start Inspecting for a new session');
      ciStopBtn.disabled = false;
    }
  });

  // ── Render helpers ────────────────────────────────────────────────────────

  function ciEsc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function ciSwatch(color) {
    if (!color || color === 'none' || color === 'transparent' || color.includes('gradient')) return '';
    return `<span class="inspect-swatch" style="background:${color}"></span>`;
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
    const idStr   = d.id ? `#${d.id}` : '';
    let html = `
      <div class="inspect-el-header">
        <div class="inspect-el-selector">${ciEsc(d.selector)}</div>
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
    layoutRows += ciRow('Width',       l.width,    { always: true });
    layoutRows += ciRow('Height',      l.height,   { always: true });
    layoutRows += ciRow('Display',     l.display,  { always: true });
    if (l.minWidth  !== '0px')   layoutRows += ciRow('Min-width',  l.minWidth);
    if (l.maxWidth  !== 'none')  layoutRows += ciRow('Max-width',  l.maxWidth);
    if (l.minHeight !== '0px')   layoutRows += ciRow('Min-height', l.minHeight);
    if (l.maxHeight !== 'none')  layoutRows += ciRow('Max-height', l.maxHeight);
    if (l.position  !== 'static') {
      layoutRows += ciRow('Position', l.position, { always: true });
      if (l.top !== 'auto')    layoutRows += ciRow('Top',    l.top);
      if (l.right !== 'auto')  layoutRows += ciRow('Right',  l.right);
      if (l.bottom !== 'auto') layoutRows += ciRow('Bottom', l.bottom);
      if (l.left !== 'auto')   layoutRows += ciRow('Left',   l.left);
    }
    if (l.zIndex !== 'auto') layoutRows += ciRow('Z-index', l.zIndex);
    if (l.overflow !== 'visible') layoutRows += ciRow('Overflow', l.overflow);
    if (l.display.includes('flex')) {
      layoutRows += ciRow('Flex direction',  l.flexDirection,  { always: true });
      layoutRows += ciRow('Justify content', l.justifyContent, { always: true });
      layoutRows += ciRow('Align items',     l.alignItems,     { always: true });
      if (l.flexWrap !== 'nowrap') layoutRows += ciRow('Flex wrap', l.flexWrap);
      if (l.gap && l.gap !== 'normal') layoutRows += ciRow('Gap', l.gap);
      if (l.alignContent !== 'normal') layoutRows += ciRow('Align content', l.alignContent);
    }
    if (l.display.includes('grid')) {
      if (l.gridTemplateColumns !== 'none') layoutRows += ciRow('Grid columns', l.gridTemplateColumns, { always: true });
      if (l.gridTemplateRows   !== 'none') layoutRows += ciRow('Grid rows',    l.gridTemplateRows,    { always: true });
      if (l.gap && l.gap !== 'normal')     layoutRows += ciRow('Gap',          l.gap);
    }
    if (l.alignSelf !== 'auto')     layoutRows += ciRow('Align self',   l.alignSelf);
    if (l.justifySelf !== 'auto')   layoutRows += ciRow('Justify self', l.justifySelf);
    if (l.flexGrow !== '0')         layoutRows += ciRow('Flex grow',    l.flexGrow);
    if (l.flexShrink !== '1')       layoutRows += ciRow('Flex shrink',  l.flexShrink);
    if (l.flexBasis !== 'auto')     layoutRows += ciRow('Flex basis',   l.flexBasis);
    if (l.gridColumn !== 'auto')    layoutRows += ciRow('Grid column',  l.gridColumn);
    if (l.gridRow !== 'auto')       layoutRows += ciRow('Grid row',     l.gridRow);
    html += ciSection('layout', 'Layout', layoutRows);

    // ── Box model section
    const b = d.box;
    let boxRows = '';
    boxRows += ciRow('Box sizing', b.boxSizing, { always: true });
    boxRows += ciRow('Margin',     b.margin,    { always: true });
    boxRows += ciRow('Padding',    b.padding,   { always: true });
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
    typoRows += ciRow('Font size',    t.fontSize,    { always: true });
    typoRows += ciRow('Font family',  t.fontFamily,  { always: true });
    typoRows += ciRow('Font weight',  t.fontWeight,  { always: true });
    typoRows += ciRow('Line height',  t.lineHeight,  { always: true });
    typoRows += ciRow('Text align',   t.textAlign,   { always: true });
    if (t.fontStyle      !== 'normal')  typoRows += ciRow('Font style',     t.fontStyle);
    if (t.letterSpacing  !== 'normal')  typoRows += ciRow('Letter spacing', t.letterSpacing);
    if (t.textTransform  !== 'none')    typoRows += ciRow('Text transform', t.textTransform);
    if (t.textDecoration !== 'none')    typoRows += ciRow('Text decoration',t.textDecoration);
    if (t.whiteSpace     !== 'normal')  typoRows += ciRow('White space',    t.whiteSpace);
    if (t.wordBreak      !== 'normal')  typoRows += ciRow('Word break',     t.wordBreak);
    if (t.textOverflow   !== 'clip')    typoRows += ciRow('Text overflow',  t.textOverflow);
    html += ciSection('typo', 'Typography', typoRows);

    // ── Colors section
    const c = d.colors;
    let colorRows = '';
    colorRows += ciRow('Color',          c.color,           { always: true, color: true });
    colorRows += ciRow('Background',     c.backgroundColor, { always: true, color: true });
    if (c.backgroundImage && c.backgroundImage !== 'none') {
      colorRows += ciRow('Bg image', c.backgroundImage.length > 60 ? c.backgroundImage.slice(0, 60) + '…' : c.backgroundImage);
      if (c.backgroundSize !== 'auto') colorRows += ciRow('Bg size', c.backgroundSize);
    }
    if (c.opacity !== '1') colorRows += ciRow('Opacity', c.opacity, { always: true });
    html += ciSection('colors', 'Colors', colorRows);

    // ── Effects section
    const e = d.effects;
    let fxRows = '';
    if (e.boxShadow     && e.boxShadow !== 'none')     fxRows += ciRow('Box shadow',      e.boxShadow);
    if (e.textShadow    && e.textShadow !== 'none')     fxRows += ciRow('Text shadow',     e.textShadow);
    if (e.filter        && e.filter !== 'none')         fxRows += ciRow('Filter',          e.filter);
    if (e.backdropFilter && e.backdropFilter !== 'none') fxRows += ciRow('Backdrop filter', e.backdropFilter);
    if (e.transform     && e.transform !== 'none')      fxRows += ciRow('Transform',       e.transform);
    if (e.mixBlendMode  && e.mixBlendMode !== 'normal') fxRows += ciRow('Mix blend mode',  e.mixBlendMode);
    if (fxRows) html += ciSection('effects', 'Effects', fxRows, false);

    // ── Interaction section
    const i = d.interaction;
    let ixRows = '';
    ixRows += ciRow('Cursor', i.cursor, { always: true });
    if (i.pointerEvents !== 'auto')   ixRows += ciRow('Pointer events', i.pointerEvents);
    if (i.userSelect !== 'auto')      ixRows += ciRow('User select',    i.userSelect);
    if (i.resize !== 'none')          ixRows += ciRow('Resize',         i.resize);
    html += ciSection('interaction', 'Interaction', ixRows, false);

    // ── Animations section
    const a = d.anim;
    let animRows = '';
    if (a.transition    && a.transition !== 'all 0s ease 0s')      animRows += ciRow('Transition', a.transition);
    if (a.animationName && a.animationName !== 'none')              animRows += ciRow('Animation', a.animationName);
    if (a.animationDuration && a.animationDuration !== '0s')       animRows += ciRow('Duration',  a.animationDuration);
    if (a.willChange    && a.willChange !== 'auto')                 animRows += ciRow('Will change', a.willChange);
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
        parentRows += ciRow('Direction',       p.flexDirection,  { always: true });
        parentRows += ciRow('Justify content', p.justifyContent, { always: true });
        parentRows += ciRow('Align items',     p.alignItems,     { always: true });
        if (p.gap && p.gap !== 'normal') parentRows += ciRow('Gap', p.gap);
      }
      if (p.display.includes('grid') && p.gridTemplateColumns !== 'none') {
        parentRows += ciRow('Grid columns', p.gridTemplateColumns, { always: true });
      }
      if (parentRows) html += ciSection('parent', 'Parent Container', parentRows, false);
    }

    ciData.innerHTML = html;

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
        } catch(err) {
          flash('Error!');
          return;
        }
        if (!text) { flash('Empty'); return; }
        const writeViaTextarea = () => {
          try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
            document.body.appendChild(ta);
            ta.focus(); ta.select();
            document.execCommand('copy');
            ta.remove();
            flash('Copied!');
          } catch(_) { flash('Failed'); }
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(() => flash('Copied!')).catch(writeViaTextarea);
        } else {
          writeViaTextarea();
        }
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
          l.maxWidth !== 'none'  ? `max-width: ${l.maxWidth};` : '',
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
          t.textTransform !== 'none'   ? `text-transform: ${t.textTransform};` : '',
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
    const sids = ['layout', 'box', 'typo', 'colors', 'effects', 'interaction', 'anim'];
    const body = sids.map(s => buildSectionCss(d, s)).filter(Boolean).join('\n');
    return `/* ${d.selector} */\n${body}`;
  }


  // ─── ACCESSIBILITY AUDIT ────────────────────────────────────────────────────

  document.getElementById("runA11yAudit").addEventListener("click", () => {
    const btn = document.getElementById("runA11yAudit");
    btn.textContent = "Auditing…";
    btn.disabled = true;
    const results = document.getElementById("a11yResults");
    results.classList.add("hidden");

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) { btn.textContent = "Audit Active Tab"; btn.disabled = false; return; }
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
          else if (h1Count > 1) issues.push({ category: "Headings", severity: "warning", count: h1Count, message: `Multiple H1 tags (${h1Count}) — page should have only one` });
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
          if (!document.querySelector("main, [role=main]")) issues.push({ category: "Landmarks", severity: "warning", count: 1, message: "No main landmark — screen readers rely on this for navigation" });
          if (!document.querySelector("nav, [role=navigation]")) issues.push({ category: "Landmarks", severity: "warning", count: 1, message: "No nav landmark found on page" });

          // Generic link text
          const genericTexts = ["click here", "here", "read more", "learn more", "more", "link", "this"];
          const genericLinks = [...document.querySelectorAll("a")].filter(a => genericTexts.includes(a.textContent.trim().toLowerCase()) && !a.getAttribute("aria-label"));
          if (genericLinks.length) issues.push({ category: "Links", severity: "warning", count: genericLinks.length, message: `${genericLinks.length} link(s) with generic text ("click here", "read more", etc.) — use descriptive text` });

          // Tabindex misuse
          const badTabindex = [...document.querySelectorAll("[tabindex]")].filter(el => parseInt(el.getAttribute("tabindex")) > 0);
          if (badTabindex.length) issues.push({ category: "Focus", severity: "warning", count: badTabindex.length, message: `${badTabindex.length} element(s) with tabindex > 0 — disrupts natural focus order` });

          // Skip link check
          const firstLink = document.querySelector("a");
          const hasSkipLink = firstLink && (firstLink.getAttribute("href") || "").startsWith("#") && /skip|jump|main|content/i.test(firstLink.textContent);
          if (!hasSkipLink) issues.push({ category: "Focus", severity: "warning", count: 1, message: "No skip-to-content link detected — keyboard users must tab through all navigation" });

          const errIssues = issues.filter(i => i.severity === "error");
          const warnIssues = issues.filter(i => i.severity === "warning");
          return { issues, totals: { errors: errIssues.reduce((a, i) => a + i.count, 0), errorChecks: errIssues.length, warnings: warnIssues.reduce((a, i) => a + i.count, 0), warningChecks: warnIssues.length } };
        }
      }, (results_) => {
        btn.textContent = "Audit Active Tab";
        btn.disabled = false;
        if (chrome.runtime.lastError || !results_?.[0]?.result) {
          document.getElementById("a11ySummary").innerHTML = `<p class="clamp-error">Could not audit this page. Try a regular HTTP/HTTPS page.</p>`;
          results.classList.remove("hidden");
          return;
        }
        const { issues, totals } = results_[0].result;
        const summaryEl = document.getElementById("a11ySummary");
        const listEl = document.getElementById("a11yIssueList");

        if (!issues.length) {
          summaryEl.innerHTML = `<div class="a11y-pass">${SI.pass} No common accessibility issues found!</div>`;
          listEl.innerHTML = "";
        } else {
          const errLabel = totals.errorChecks === 1 ? `${totals.errors} error` : `${totals.errorChecks} errors (${totals.errors} elements)`;
          const warnLabel = totals.warningChecks === 1 ? `${totals.warnings} warning` : `${totals.warningChecks} warnings`;
          summaryEl.innerHTML = `<div class="a11y-score"><span class="a11y-badge a11y-badge--error">${errLabel}</span><span class="a11y-badge a11y-badge--warning">${warnLabel}</span></div>`;
          listEl.innerHTML = issues.map(issue => `
            <div class="a11y-issue a11y-issue--${issue.severity}">
              <div class="a11y-issue-header">
                <span class="a11y-issue-category">${issue.category}</span>
                <span class="a11y-issue-sev">${issue.severity}</span>
              </div>
              <p class="a11y-issue-msg">${issue.message}</p>
            </div>`).join("");
        }

        results.classList.remove("hidden");
      });
    });
  });


  // ─── TECHNICAL SEO AUDIT ────────────────────────────────────────────────────

  document.getElementById("runTechSEO").addEventListener("click", () => {
    const btn = document.getElementById("runTechSEO");
    const resultsEl = document.getElementById("techSEOResults");
    const summaryEl = document.getElementById("techSEOSummary");
    const listEl = document.getElementById("techSEOList");

    btn.textContent = "Auditing…";
    btn.disabled = true;
    resultsEl.classList.add("hidden");

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) { btn.textContent = "Audit Active Tab"; btn.disabled = false; return; }
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
          else addCheck("Indexing", "Robots meta", "info", "No robots meta tag — defaults to index, follow.", "");

          if (isNofollow) addCheck("Indexing", "Robots meta: nofollow", "warn", "Links on this page won't pass link equity.", robotsContent);

          const canonical = document.querySelector("link[rel='canonical']");
          if (!canonical) {
            addCheck("Indexing", "Canonical URL", "warn", "No canonical tag found. Duplicate content risk.", "");
          } else {
            const href = canonical.getAttribute("href") || "";
            const isSelf = href === location.href || href === location.pathname;
            addCheck("Indexing", "Canonical URL", isSelf ? "pass" : "warn",
              isSelf ? "Canonical points to this page." : "Canonical points to a different URL — verify this is intentional.", href);
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
          else addCheck("Content", "Title tag", "pass", `Length: ${titleLen} chars — optimal.`, title);

          const metaDesc = document.querySelector("meta[name='description']");
          const desc = metaDesc?.getAttribute("content") || "";
          const descLen = desc.length;
          if (!desc) addCheck("Content", "Meta description", "fail", "No meta description found.", "");
          else if (descLen < 80) addCheck("Content", "Meta description", "warn", `Too short (${descLen} chars). Aim for 150–160 chars.`, desc.substring(0, 80) + "…");
          else if (descLen > 160) addCheck("Content", "Meta description", "warn", `Too long (${descLen} chars). Google truncates at ~160 chars.`, desc.substring(0, 80) + "…");
          else addCheck("Content", "Meta description", "pass", `Length: ${descLen} chars — optimal.`, desc.substring(0, 80) + (desc.length > 80 ? "…" : ""));

          const h1s = document.querySelectorAll("h1");
          if (!h1s.length) addCheck("Content", "H1 tag", "fail", "No H1 tag found. Each page should have exactly one H1.", "");
          else if (h1s.length > 1) addCheck("Content", "H1 tag", "warn", `${h1s.length} H1 tags found. Use only one H1 per page.`, h1s[0].textContent.trim().substring(0, 60));
          else addCheck("Content", "H1 tag", "pass", "One H1 found.", h1s[0].textContent.trim().substring(0, 60));

          const bodyText = document.body?.innerText || "";
          const wordCount = bodyText.trim().split(/\s+/).filter(Boolean).length;
          if (wordCount < 200) addCheck("Content", "Word count", "warn", `Only ${wordCount} words. Thin content may rank poorly. Aim for 300+.`, `${wordCount} words`);
          else addCheck("Content", "Word count", "pass", `${wordCount} words — sufficient content.`, `${wordCount} words`);

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
          if (headScripts.length) addCheck("Performance", "Render-blocking scripts", "warn", `${headScripts.length} script(s) in <head> without defer/async — blocks page rendering.`, headScripts.slice(0, 2).map(s => s.src.split("/").slice(-1)[0]).join(", "));
          else addCheck("Performance", "Render-blocking scripts", "pass", "No render-blocking scripts detected in <head>.", "");

          const imgs = [...document.querySelectorAll("img")];
          const noDims = imgs.filter(img => !img.hasAttribute("width") || !img.hasAttribute("height"));
          if (noDims.length) addCheck("Performance", "Image dimensions", "warn", `${noDims.length} image(s) missing width/height attributes — causes layout shift (CLS).`, noDims.slice(0, 2).map(i => i.src.split("/").slice(-1)[0] || "img").join(", "));
          else if (imgs.length) addCheck("Performance", "Image dimensions", "pass", "All images have width/height attributes.", "");

          const noLazy = imgs.filter(img => !img.hasAttribute("loading") && !img.hasAttribute("data-lazy"));
          if (noLazy.length > 3) addCheck("Performance", "Lazy loading", "warn", `${noLazy.length} image(s) without loading="lazy". Add lazy loading to off-screen images.`, "");
          else if (imgs.length) addCheck("Performance", "Lazy loading", "pass", "Images use lazy loading or count is low.", "");

          const langAttr = document.documentElement.getAttribute("lang") || "";
          if (!langAttr) addCheck("Performance", "Language declaration", "warn", "Missing lang attribute on html element.", "");
          else addCheck("Performance", "Language declaration", "pass", `lang="${langAttr}" declared.`, langAttr);

          return checks;
        }
      }, (results_) => {
        btn.textContent = "Audit Active Tab";
        btn.disabled = false;

        if (chrome.runtime.lastError || !results_?.[0]?.result) {
          summaryEl.innerHTML = `<p class="clamp-error">Could not audit this page. Try a regular HTTP/HTTPS page.</p>`;
          resultsEl.classList.remove("hidden");
          return;
        }

        const checks = results_[0].result;
        const passes  = checks.filter(c => c.status === "pass").length;
        const warns   = checks.filter(c => c.status === "warn").length;
        const fails   = checks.filter(c => c.status === "fail").length;

        summaryEl.innerHTML = `<div class="tseo-score">
          <span class="tseo-badge tseo-badge--pass">${SI.pass} ${passes} passed</span>
          ${warns  ? `<span class="tseo-badge tseo-badge--warn">${SI.warn} ${warns} warnings</span>` : ""}
          ${fails  ? `<span class="tseo-badge tseo-badge--fail">${SI.fail} ${fails} failed</span>` : ""}
        </div>`;

        const sections = [...new Set(checks.map(c => c.section))];
        listEl.innerHTML = sections.map(sec => `
          <div class="tseo-section-label">${sec}</div>
          ${checks.filter(c => c.section === sec).map(c => `
            <div class="tseo-item tseo-item--${c.status}">
              <span class="tseo-icon">${SI[c.status] || SI.info}</span>
              <div class="tseo-content">
                <div class="tseo-label">${c.label}</div>
                ${c.detail ? `<div class="tseo-detail">${c.detail}</div>` : ""}
                ${c.value ? `<span class="tseo-val">${c.value}</span>` : ""}
              </div>
            </div>`).join("")}
        `).join("");

        resultsEl.classList.remove("hidden");
      });
    });
  });


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

  document.querySelectorAll(".nav-category[data-cat] > .nav-category-label").forEach(label => {
    label.addEventListener("click", () => {
      const cat = label.closest(".nav-category");
      if (sidebar.classList.contains("collapsed")) {
        setSidebarCollapsed(false);
        cat.classList.remove("collapsed");
      } else {
        cat.classList.toggle("collapsed");
      }
      saveCatState();
    });
  });

  loadCatState(state => {
    if (!state) return; // use HTML defaults (all collapsed)
    document.querySelectorAll(".nav-category[data-cat]").forEach(cat => {
      if (state[cat.dataset.cat] !== undefined) {
        cat.classList.toggle("collapsed", state[cat.dataset.cat]);
      }
    });
  });

  // When a nav item is clicked, expand its parent category if collapsed
  document.querySelectorAll(".nav-category[data-cat] .nav-item").forEach(item => {
    item.addEventListener("click", () => {
      const cat = item.closest(".nav-category");
      if (cat && cat.classList.contains("collapsed")) {
        cat.classList.remove("collapsed");
        saveCatState();
      }
    }, true);
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

  const DEFAULT_FAVORITES = ['clamp', 'css-inspector', 'broken-links', 'color-picker', 'tech-seo'];
  let favorites = new Set();

  function saveFavorites() {
    chrome.storage.local.set({ wdt_favorites: [...favorites] });
  }

  function loadFavorites(cb) {
    chrome.storage.local.get(["wdt_favorites"], (result) => {
      if (result.wdt_favorites !== undefined) {
        favorites = new Set(result.wdt_favorites);
      } else {
        favorites = new Set(DEFAULT_FAVORITES);
        saveFavorites();
      }
      cb();
    });
  }

  const staticNavItems = () => [...document.querySelectorAll(".nav-category:not(.nav-dynamic) .nav-item")];

  function renderDynamicNav() {
    const nav = document.getElementById("sidebarNav");
    nav.querySelectorAll(".nav-dynamic").forEach(el => el.remove());

    const starredItems = staticNavItems().filter(btn => favorites.has(btn.dataset.tab));
    if (!starredItems.length) return;

    const div = document.createElement("div");
    div.className = "nav-category nav-dynamic";
    div.innerHTML = `<span class="nav-category-label"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg><span class="nav-cat-text">Starred / Featured</span></span>`;

    starredItems.forEach(original => {
      const clone = original.cloneNode(true);
      clone.classList.remove("active");
      if (original.classList.contains("active")) clone.classList.add("active");

      // Wire the star in the clone so clicking it removes from starred
      const cloneStar = clone.querySelector(".nav-star");
      if (cloneStar) {
        cloneStar.textContent = "★";
        cloneStar.title = "Remove from Starred";
        cloneStar.addEventListener("click", e => {
          e.stopPropagation();
          toggleFavorite(original.dataset.tab);
        });
      }

      // Clicking the nav item (not the star) activates the tab
      clone.addEventListener("click", e => {
        if (!e.target.closest(".nav-star")) original.click();
      });
      div.appendChild(clone);
    });

    nav.prepend(div);
  }

  function toggleFavorite(tab) {
    if (favorites.has(tab)) favorites.delete(tab);
    else favorites.add(tab);
    updateStarButtons();
    renderDynamicNav();
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
  });


  // Initialize and handle all event listeners
  const init = () => {
    // Add initialization code here if needed
  };

  // Start initialization
  init();


  // ========================
  // BROKEN LINKS CHECKER
  // ========================
  (function () {
    const BLC_STORE = 'blc_state';

    const scanBtn      = document.getElementById('blcScanBtn');
    const highlightBtn = document.getElementById('blcHighlightBtn');
    const clearBtn     = document.getElementById('blcClearBtn');
    const resetBtn     = document.getElementById('blcResetBtn');
    const cancelBtn    = document.getElementById('blcCancelBtn');
    const progressEl   = document.getElementById('blcProgress');
    const progressBar  = document.getElementById('blcProgressBar');
    const progressText = document.getElementById('blcProgressText');
    const resultsEl    = document.getElementById('blcResults');
    const linkList     = document.getElementById('blcLinkList');
    const insightsEl   = document.getElementById('blcInsights');
    const scanCtxEl    = document.getElementById('blcScanContext');
    const scoreValueEl = document.getElementById('blcScoreValue');
    const scoreEl      = document.getElementById('blcScore');
    const totalEl      = document.getElementById('blcTotal');
    const brokenEl     = document.getElementById('blcBroken');
    const redirectEl   = document.getElementById('blcRedirect');
    const validEl      = document.getElementById('blcValid');
    const externalEl   = document.getElementById('blcExternal');
    const ignoreAnchors = document.getElementById('blcIgnoreAnchors');
    const ignoreMailto  = document.getElementById('blcIgnoreMailto');
    const checkExternal = document.getElementById('blcCheckExternal');
    const checkInternal = document.getElementById('blcCheckInternal');

    let allResults    = [];
    let cancelled     = false;
    let currentFilter = 'all';
    let lastTabUrl    = '';
    let lastScanTs    = 0;

    // ── Page-injected functions (NO outer scope refs — serialized by executeScript) ──

    function extractLinksFromDOM() {
      const links = [];
      const origin = location.origin;
      document.querySelectorAll('a[href]').forEach((a, i) => {
        const raw = a.getAttribute('href') || '';
        let href;
        try { href = new URL(raw, location.href).href; } catch { return; }
        const text = (a.innerText || a.textContent || '').trim().slice(0, 120);
        links.push({ href, rawHref: raw, text, isInternal: href.startsWith(origin), index: i });
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
      return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
      } catch {}
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
      try { chrome.storage.local.remove([BLC_STORE]); } catch {}
    }

    function restoreState(s) {
      allResults    = s.results;
      lastTabUrl    = s.url    || '';
      lastScanTs    = s.ts     || 0;
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
        const chk   = urlResults.get(link.href);
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
        const finalUrl   = chk && chk.finalUrl ? chk.finalUrl : link.href;
        const isInsecure = link.href.startsWith('http://');
        const isSlashMismatch = category === 'redirect' &&
          (finalUrl === link.href + '/' || finalUrl === link.href.replace(/\/$/, ''));
        return { ...link, ...(chk || {}), category, severity, isDuplicate: count > 1, duplicateCount: count, isInsecure, isSlashMismatch };
      });
    }

    function renderSummary() {
      const total    = allResults.length;
      const broken   = allResults.filter(r => r.category === 'broken').length;
      const redirect = allResults.filter(r => r.category === 'redirect').length;
      const valid    = allResults.filter(r => r.category === 'valid').length;
      const external = allResults.filter(r => !r.isInternal).length;
      totalEl.textContent    = total;
      brokenEl.textContent   = broken;
      redirectEl.textContent = redirect;
      validEl.textContent    = valid;
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
      if (currentFilter === 'broken')         filtered = allResults.filter(r => r.category === 'broken');
      else if (currentFilter === 'redirect')   filtered = allResults.filter(r => r.category === 'redirect');
      else if (currentFilter === 'valid')      filtered = allResults.filter(r => r.category === 'valid');
      else if (currentFilter === 'external')   filtered = allResults.filter(r => !r.isInternal);
      else if (currentFilter === 'duplicate')  filtered = allResults.filter(r => r.isDuplicate);
      else if (currentFilter === 'http')       filtered = allResults.filter(r => r.isInsecure);
      else if (currentFilter === 'no-slash')   filtered = allResults.filter(r => r.isSlashMismatch);

      if (!filtered.length) { linkList.innerHTML = '<p class="blc-empty">No links match this filter.</p>'; return; }

      linkList.innerHTML = filtered.slice(0, 200).map(r => {
        const statusTxt    = r.category === 'unchecked' ? '…' : (r.status || (r.error ? 'ERR' : '?'));
        const dupBadge     = r.isDuplicate   ? `<span class="blc-badge blc-badge--dup">${r.duplicateCount}×</span>` : '';
        const extBadge     = !r.isInternal   ? `<span class="blc-badge blc-badge--ext">ext</span>` : '';
        const sevBadge     = r.severity      ? `<span class="blc-badge blc-badge--${r.severity}">${r.severity}</span>` : '';
        const httpBadge    = r.isInsecure    ? `<span class="blc-badge blc-badge--http">HTTP</span>` : '';
        const slashBadge   = r.isSlashMismatch ? `<span class="blc-badge blc-badge--slash">No /</span>` : '';
        const redir        = r.isRedirect && r.finalUrl ? `<div class="blc-redir-url">→ ${blcEsc(blcTrunc(r.finalUrl, 60))}</div>` : '';
        const errTxt       = r.error ? `<div class="blc-link-err">${blcEsc(blcTrunc(r.error, 80))}</div>` : '';
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
      const broken    = allResults.filter(r => r.category === 'broken');
      const redirects = allResults.filter(r => r.category === 'redirect');
      const insights  = [];

      const allUnchecked = allResults.length > 0 && allResults.every(r => r.category === 'unchecked');
      if (allUnchecked) {
        insights.push({ sev: 'critical', msg: 'HTTP checking did not complete. Reload the extension at chrome://extensions, then scan again.' });
      }

      const httpToHttps = allResults.filter(r => r.isInsecure && r.category !== 'unchecked');
      if (httpToHttps.length) insights.push({ sev: 'warning', msg: `${httpToHttps.length} link(s) use HTTP — switch to HTTPS to avoid redirect hops and mixed-content warnings. Use the HTTP filter to view them.` });

      const slashMismatches = allResults.filter(r => r.isSlashMismatch);
      if (slashMismatches.length) insights.push({ sev: 'warning', msg: `${slashMismatches.length} link(s) redirect due to a trailing slash mismatch (e.g. /page → /page/) — a fixable SEO issue. Use the No Slash / filter to view them.` });

      if (broken.length > 10)     insights.push({ sev: 'critical', msg: `${broken.length} broken links — high impact on UX and SEO crawl budget.` });
      else if (broken.length > 0) insights.push({ sev: 'warning',  msg: `${broken.length} broken link(s) detected. Fix to avoid 404 errors.` });

      const netErrs = allResults.filter(r => r.status === 0 && r.category === 'broken');
      if (netErrs.length) insights.push({ sev: 'info', msg: `${netErrs.length} link(s) couldn’t be reached (network/CORS). May be behind auth or a firewall.` });

      const highDups = [...new Set(allResults.filter(r => r.isDuplicate && r.duplicateCount > 3).map(r => r.href))];
      if (highDups.length) insights.push({ sev: 'info', msg: `${highDups.length} URL(s) appear 4+ times — review for unintentional duplicate links.` });

      if (!insights.length) { insightsEl.classList.add('hidden'); return; }
      const icons = { critical: SI.critical, warning: SI.warn, info: SI.info };
      insightsEl.classList.remove('hidden');
      insightsEl.innerHTML = `<div class="blc-insights-title">Smart Insights</div>` +
        insights.map(i => `<div class="blc-insight blc-insight--${i.sev}">${icons[i.sev] || ''} ${blcEsc(i.msg)}</div>`).join('');
    }

    // ── Scan ─────────────────────────────────────────────────────────────────

    async function startScan() {
      cancelled   = false;
      allResults  = [];
      lastTabUrl  = '';
      lastScanTs  = 0;
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

      allResults  = buildResults(links, urlResults);
      lastScanTs  = Date.now();
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

    function resetResults() {
      allResults  = [];
      lastTabUrl  = '';
      lastScanTs  = 0;
      currentFilter = 'all';
      document.querySelectorAll('.blc-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
      resultsEl.classList.add('hidden');
      scanCtxEl.classList.add('hidden');
      resetBtn.classList.add('hidden');
      highlightBtn.disabled = true;
      clearBtn.disabled = true;
      clearState();
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
        const hdr = ['URL','Anchor Text','Status','Category','Internal','Final URL','Redirect','Error','Duplicates'];
        const esc = v => `"${String(v).replace(/"/g, '""')}"`;
        content = [hdr.join(','), ...rows.map(r => Object.values(r).map(esc).join(','))].join('\n');
        filename = 'broken-links.csv'; mime = 'text/csv';
      } else if (fmt === 'json') {
        content = JSON.stringify(rows, null, 2);
        filename = 'broken-links.json'; mime = 'application/json';
      } else {
        const score  = scoreValueEl.textContent;
        const broken = rows.filter(r => r.category === 'broken');
        const redirs = rows.filter(r => r.category === 'redirect');
        content = `# Broken Links Report\n\n**Health Score:** ${score}/100\n**Page:** ${lastTabUrl}\n**Total:** ${rows.length} | **Broken:** ${broken.length} | **Redirects:** ${redirs.length}\n\n## Broken Links\n\n` +
          (broken.length ? broken.map(r => `- [\`${r.url}\`](${r.url}) — ${r.status || 'ERR'}${r.error ? ` (${r.error})` : ''}`).join('\n') : '_None_') +
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


});



