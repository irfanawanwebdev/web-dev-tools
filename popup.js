document.addEventListener("DOMContentLoaded", () => {
  // Tab Switching
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach(button => {
    button.addEventListener("click", () => {
      tabButtons.forEach(btn => btn.classList.remove("active"));
      tabContents.forEach(tab => tab.classList.remove("active"));

      button.classList.add("active");
      document.getElementById(button.dataset.tab).classList.add("active");
    });
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
  output.select();
  navigator.clipboard.writeText(output.value);
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
    document.getElementById("hexCode").textContent = `color: ${hex};`;
    document.getElementById("rgbCode").textContent = `color: rgb(${rgb.r},${rgb.g},${rgb.b});`;
    document.getElementById("hslCode").textContent = `color: hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%);`;
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
      navigator.clipboard.writeText(codeElement.textContent).then(() => {
        const originalText = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2000);
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

  document.getElementById('fontInfoOutput').textContent = css;

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
  const fontInfo = document.getElementById('fontInfoOutput').textContent;
  navigator.clipboard.writeText(fontInfo).then(() => {
    const button = document.getElementById('copyFontInfo');
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
  });
});



  // CSS Clamp Calculator
  const updateClampCalculator = () => {
    const rootFontSize = parseFloat(document.querySelector('input[name="rootFontSize"]:checked').value);
    const minDevice = parseFloat(document.getElementById("minDeviceWidth").value) || 320;
    const maxDevice = parseFloat(document.getElementById("maxDeviceWidth").value) || 1280;
    const minFont = parseFloat(document.getElementById("minFontSize").value);
    const maxFont = parseFloat(document.getElementById("maxFontSize").value);

    const output = document.getElementById("clampOutput");
    const copyBtn = document.getElementById("copyClampBtn");

    if (!minFont || !maxFont) {
      output.textContent = "Enter min and max font sizes";
      copyBtn.disabled = true;
      return;
    }

    const minFontPx = minFont * rootFontSize;
    const maxFontPx = maxFont * rootFontSize;
    
    const slope = (maxFontPx - minFontPx) / (maxDevice - minDevice);
    const base = minFontPx - slope * minDevice;
    const clampVal = `clamp(${minFont.toFixed(2)}rem, ${(base / rootFontSize).toFixed(3)}rem + ${(slope * 100).toFixed(3)}vw, ${maxFont.toFixed(2)}rem)`;

    output.textContent = clampVal;
    copyBtn.disabled = false;
  };

  // Add event listeners for dynamic updates
  document.querySelectorAll('input[name="rootFontSize"]').forEach(radio => {
    radio.addEventListener('change', updateClampCalculator);
  });

  document.querySelectorAll('#clamp input[type="number"]').forEach(input => {
    ['input', 'change'].forEach(eventType => {
      input.addEventListener(eventType, updateClampCalculator);
    });
  });

  document.getElementById("copyClampBtn").addEventListener("click", () => {
    const output = document.getElementById("clampOutput").textContent;
    const button = document.getElementById("copyClampBtn");
    const originalText = button.textContent;
    
    navigator.clipboard.writeText(output).then(() => {
      button.textContent = "Copied!";
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    });
  });

  document.getElementById("resetClamp").addEventListener("click", () => {
    document.querySelector('input[name="rootFontSize"][value="16"]').checked = true;
    document.getElementById("minDeviceWidth").value = "320";
    document.getElementById("maxDeviceWidth").value = "1280";
    document.getElementById("minFontSize").value = "3";
    document.getElementById("maxFontSize").value = "4";
    updateClampCalculator();
  });

  // Initialize clamp calculator
  updateClampCalculator();

  // Clamp Presets
  const updateClampPresets = () => {
    const rootFontSize = 10; // Fixed to 10px
    const minWidth = 320;
    const maxWidth = 1280;
    const previewItems = document.querySelectorAll('.preview-item');
    let cssOutput = `:root {\n  font-size: 10px;\n`;

    previewItems.forEach(item => {
      const element = item.dataset.element;
      const minSize = parseFloat(item.querySelector('.min-size').value);
      const maxSize = parseFloat(item.querySelector('.max-size').value);

      // Calculate clamp values
      const slope = (maxSize - minSize) / (maxWidth - minWidth);
      const base = minSize - slope * minWidth;
      const clampValue = `clamp(${minSize}rem, ${base.toFixed(3)}rem + ${(slope * 100).toFixed(3)}vw, ${maxSize}rem)`;
      
      // Add to CSS output
      cssOutput += `  --font-${element}: ${clampValue};\n`;
    });

    cssOutput += '}';
    document.getElementById('clampPresetsOutput').textContent = cssOutput;
  };

  // Add event listeners for clamp presets inputs
  document.querySelectorAll('.preview-item .size-controls input').forEach(input => {
    ['input', 'change'].forEach(eventType => {
      input.addEventListener(eventType, updateClampPresets);
    });
  });

  // Initialize clamp presets and add copy functionality
  document.getElementById('copyClampPresets').addEventListener('click', () => {
    const cssOutput = document.getElementById('clampPresetsOutput').textContent;
    navigator.clipboard.writeText(cssOutput).then(() => {
      const button = document.getElementById('copyClampPresets');
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    });
  });

  // Initialize clamp presets on load
  updateClampPresets();

  // Box Shadow Generator
  const boxShadowPreview = document.getElementById("boxShadowPreview");
  const previewContainer = document.querySelector('.preview-container');
  const shadowCode = document.getElementById('shadowCode');
  
  const updateBoxShadow = () => {
    const hOffset = document.getElementById("hOffset").value || 0;
    const vOffset = document.getElementById("vOffset").value || 0;
    const blurRadius = document.getElementById("blurRadius").value || 0;
    const spreadRadius = document.getElementById("spreadRadius").value || 0;
    const shadowColor = document.getElementById("shadowColor").value || "#000000";
    const inset = document.getElementById("insetToggle").checked ? "inset" : "";

    // Get box properties with validation
    const canvasColor = document.getElementById("canvasColor").value;
    const previewBgColor = document.getElementById("previewBgColor").value;
    const borderColor = document.getElementById("borderColor").value;
    const borderRadius = Math.min(200, document.getElementById("borderRadius").value || 0);
    const previewHeight = Math.min(200, Math.max(50, document.getElementById("previewHeight").value || 100));
    const previewWidth = Math.min(200, Math.max(50, document.getElementById("previewWidth").value || 200));

    // Update inputs if values were clamped
    document.getElementById("borderRadius").value = borderRadius;
    document.getElementById("previewHeight").value = previewHeight;
    document.getElementById("previewWidth").value = previewWidth;

    // Apply box properties
    const container = document.querySelector('#box-shadow .preview-container');
    container.style.backgroundColor = canvasColor;
    boxShadowPreview.style.backgroundColor = previewBgColor;
    boxShadowPreview.style.borderColor = borderColor;
    boxShadowPreview.style.borderRadius = `${borderRadius}px`;
    boxShadowPreview.style.height = `${previewHeight}px`;
    boxShadowPreview.style.width = `${previewWidth}px`;

    const boxShadow = `${inset} ${hOffset}px ${vOffset}px ${blurRadius}px ${spreadRadius}px ${shadowColor}`;
    boxShadowPreview.style.boxShadow = boxShadow;
    
    // Update only the box-shadow CSS in the code display
    shadowCode.textContent = `box-shadow: ${boxShadow};`;
  };
  // Add event listeners for all inputs
  document.querySelectorAll("#box-shadow input").forEach(input => {
    input.addEventListener("input", updateBoxShadow);
  });

  // Box Shadow Reset Functionality
  document.getElementById("resetBoxShadow").addEventListener("click", () => {
    // Reset all box shadow inputs to default values
    document.getElementById("hOffset").value = "0";
    document.getElementById("vOffset").value = "0";
    document.getElementById("blurRadius").value = "0";
    document.getElementById("spreadRadius").value = "0";
    document.getElementById("shadowColor").value = "#000000";
    document.getElementById("insetToggle").checked = false;
    
    // Reset box properties
    document.getElementById("canvasColor").value = "#f3f4f6";
    document.getElementById("previewBgColor").value = "#ffffff";
    document.getElementById("borderColor").value = "#000000";
    document.getElementById("borderRadius").value = "0";
    document.getElementById("previewHeight").value = "100";
    document.getElementById("previewWidth").value = "200";

    // Update the preview
    updateBoxShadow();
  });

  // Fix copy functionality
  document.getElementById("copyBoxShadow").addEventListener("click", () => {
    const codeToCopy = shadowCode.textContent;
    navigator.clipboard.writeText(codeToCopy).then(() => {
      const button = document.getElementById("copyBoxShadow");
      const originalText = button.textContent;
      button.textContent = "Copied!";
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    });
  });

  // Box shadow preset values
  const boxShadowPresets = {
    soft: {
      hOffset: 0,
      vOffset: 4,
      blur: 8,
      spread: 0,
      color: 'rgba(0, 0, 0, 0.1)',
      inset: false
    },
    medium: {
      hOffset: 0,
      vOffset: 6,
      blur: 12,
      spread: -2,
      color: 'rgba(0, 0, 0, 0.15)',
      inset: false
    },
    hard: {
      hOffset: 2,
      vOffset: 2,
      blur: 4,
      spread: 0,
      color: 'rgba(0, 0, 0, 0.2)',
      inset: false
    },
    layered: {
      hOffset: 0,
      vOffset: 10,
      blur: 20,
      spread: -5,
      color: 'rgba(0, 0, 0, 0.2)',
      inset: false
    },
    inset: {
      hOffset: 2,
      vOffset: 2,
      blur: 4,
      spread: 0,
      color: 'rgba(0, 0, 0, 0.1)',
      inset: true
    },
    float: {
      hOffset: 0,
      vOffset: 8,
      blur: 16,
      spread: -4,
      color: 'rgba(0, 0, 0, 0.1)',
      inset: false
    }
  };

  // Apply box shadow preset
  function applyBoxShadowPreset(preset) {
    const values = boxShadowPresets[preset];
    if (!values) return;

    // Update input values
    document.getElementById('hOffset').value = values.hOffset;
    document.getElementById('vOffset').value = values.vOffset;
    document.getElementById('blurRadius').value = values.blur;
    document.getElementById('spreadRadius').value = values.spread;
    document.getElementById('insetToggle').checked = values.inset;

    // Update preview by triggering the updateBoxShadow function
    updateBoxShadow();
  }

  // Add event listeners for presets
  document.querySelectorAll('.shadow-preset').forEach(button => {
    button.addEventListener('click', () => {
      const preset = button.getAttribute('data-preset');
      applyBoxShadowPreset(preset);
    });
  });

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
    gradientCode.textContent = `background-image: ${gradient};`;
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
    navigator.clipboard.writeText(gradientCode.textContent).then(() => {
      const button = document.getElementById("copyGradient");
      const originalText = button.textContent;
      button.textContent = "Copied!";
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
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
      inputUnit === "vh" ? (inputValue / 100) * window.innerHeight :
      inputUnit === "vw" ? (inputValue / 100) * window.innerWidth :
      inputUnit === "vmin" ? (inputValue / 100) * Math.min(window.innerHeight, window.innerWidth) :
      inputUnit === "vmax" ? (inputValue / 100) * Math.max(window.innerHeight, window.innerWidth) :
      inputUnit === "pt" ? inputValue * (96/72) : 0;

    // Convert from pixels to target unit
    const outputValue = outputUnit === "px" ? pxValue :
      outputUnit === "rem" ? pxValue / baseFontSize :
      outputUnit === "em" ? pxValue / baseFontSize :
      outputUnit === "%" ? (pxValue / baseFontSize) * 100 :
      outputUnit === "vh" ? (pxValue / window.innerHeight) * 100 :
      outputUnit === "vw" ? (pxValue / window.innerWidth) * 100 :
      outputUnit === "vmin" ? (pxValue / Math.min(window.innerHeight, window.innerWidth)) * 100 :
      outputUnit === "vmax" ? (pxValue / Math.max(window.innerHeight, window.innerWidth)) * 100 :
      outputUnit === "pt" ? pxValue * (72/96) : 0;

    const formattedInput = `${inputValue}${inputUnit}`;
    const formattedOutput = `${outputValue.toFixed(2)}${outputUnit}`;
    document.getElementById("conversionResult").textContent = `${formattedInput} = ${formattedOutput}`;
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
    const result = document.getElementById("conversionResult").textContent;
    navigator.clipboard.writeText(result).then(() => {
      const button = document.getElementById("copyConversion");
      const originalText = button.textContent;
      button.textContent = "Copied!";
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    });
  });

  // Business Info Generator

  // --- Business Hours Dynamic Rows ---
  const businessHoursGrid = document.getElementById('businessHoursGrid');
  const addBusinessHoursBtn = document.getElementById('addBusinessHours');

  // Delegate remove button click
  businessHoursGrid.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-hours-row')) {
      const row = e.target.closest('.hours-row');
      if (row) {
        row.remove();
      }
    }
  });

  // Add new row functionality
  addBusinessHoursBtn.addEventListener('click', () => {
    const rows = businessHoursGrid.querySelectorAll('.hours-row');
    const lastRow = rows[rows.length - 1];
    const newRow = lastRow.cloneNode(true);
    newRow.querySelector('.days-input').value = '';
    newRow.querySelector('.hours-input').value = '';
    businessHoursGrid.appendChild(newRow);
  });

  // Row selection for "chosen"/"selected" CSS
  businessHoursGrid.addEventListener('focusin', (e) => {
    const row = e.target.closest('.hours-row');
    if (row) {
      row.classList.add('focused');
    }
  });

  businessHoursGrid.addEventListener('focusout', (e) => {
    const row = e.target.closest('.hours-row');
    if (row) {
      row.classList.remove('focused');
    }
  });

  // --- Business Info Code Generation ---
  const generateBusinessCode = () => {
    const format = text => text.replace(/'/g, "\\'").trim();
    // Collect business hours from all rows
    const businessHours = Array.from(document.querySelectorAll('#businessHoursGrid .hours-row')).map(row => {
      const days = format(row.querySelector('.days-input').value);
      const hours = format(row.querySelector('.hours-input').value);
      return days && hours ? `${days}: ${hours}` : '';
    }).filter(Boolean);

    const inputs = {
      phone: format(document.getElementById('phone').value),
      email: format(document.getElementById('email').value),
      address: format(document.getElementById('address').value),
      mapEmbed: document.getElementById('mapEmbed').value.trim(),
      mapLink: format(document.getElementById('mapLink').value),
      facebook: format(document.getElementById('facebook').value),
      instagram: format(document.getElementById('instagram').value),
      linkedin: format(document.getElementById('linkedin').value),
      twitter: format(document.getElementById('twitter').value),
      youtube: format(document.getElementById('youtube').value),
      tiktok: format(document.getElementById('tiktok').value),
      businessHours: businessHours
    };

    const code = [];

    if (inputs.phone) {
      const cleanPhone = inputs.phone.replace(/[^0-9+]/g, '');
      code.push(`// Phone Number With Link
function get_phone_number_link() {
    return '<a href="tel:${cleanPhone}">${inputs.phone}</a>';
}
add_shortcode('phone_link', 'get_phone_number_link');`);

      code.push(`// Phone Number Without Link
function get_phone_number() {
    return '${inputs.phone}';
}
add_shortcode('phone', 'get_phone_number');`);
    }

    if (inputs.email) {
      code.push(`// Email Address With Link
function get_email_address_link() {
    return '<a href="mailto:${inputs.email}">${inputs.email}</a>';
}
add_shortcode('email_link', 'get_email_address_link');`);

      code.push(`// Email Address Without Link
function get_email_address() {
    return '${inputs.email}';
}
add_shortcode('email', 'get_email_address');`);
    }

    if (inputs.address) {
      code.push(`// Business Address
function get_business_address() {
    return '${inputs.address}';
}
add_shortcode('address', 'get_business_address');`);
    }

    if (inputs.mapEmbed) {
      code.push(`// Google Maps Embed Code
function get_gmb_code() {
    return \'${inputs.mapEmbed}\';
}
add_shortcode('GMB', 'get_gmb_code');`);
    }

    if (inputs.mapLink) {
      code.push(`// Google Maps Link
function get_gmb_link() {
    return '${inputs.mapLink}';
}
add_shortcode('GMB_link', 'get_gmb_link');`);
    }

    const socials = [
      { key: 'facebook', label: 'Facebook' },
      { key: 'instagram', label: 'Instagram' },
      { key: 'linkedin', label: 'LinkedIn' },
      { key: 'twitter', label: 'Twitter' },
      { key: 'youtube', label: 'YouTube' },
      { key: 'tiktok', label: 'TikTok' }
    ];

    socials.forEach(({ key, label }) => {
      if (inputs[key]) {
        code.push(`// ${label} Link
function get_${key}_link() {
    return '${inputs[key]}';
}
add_shortcode('${key}_link', 'get_${key}_link');`);
      }
    });

    if (inputs.businessHours.length > 0) {
      code.push(`// Business Hours
function get_business_hours() {
    return \'${inputs.businessHours.join('<br>')}\';
}
add_shortcode('business_hours', 'get_business_hours');`);
    }

    code.push(`// Current Year
function display_current_year() {
    return date('Y');
}
add_shortcode('current_year', 'display_current_year');

// Site Title
function get_site_title() {
    return get_bloginfo('name');
}
add_shortcode('site_title', 'get_site_title');`);

    document.getElementById('businessOutput').textContent = code.join('\n\n');
  };

  // Add event listeners for business info
  document.getElementById('generateBusiness').addEventListener('click', generateBusinessCode);
  
  document.getElementById('copyBusinessCode').addEventListener('click', () => {
    const code = document.getElementById('businessOutput').textContent;
    navigator.clipboard.writeText(code).then(() => {
      const button = document.getElementById('copyBusinessCode');
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    });
  });

  document.getElementById('resetBusiness').addEventListener('click', () => {
    const inputs = document.querySelectorAll('#business-info input, #business-info textarea');
    inputs.forEach(input => input.value = '');
    // Reset business hours to two default rows
    while (businessHoursGrid.children.length > 2) {
      businessHoursGrid.removeChild(businessHoursGrid.lastChild);
    }
    businessHoursGrid.querySelectorAll('.days-input')[0].value = 'Mon - Sat';
    businessHoursGrid.querySelectorAll('.hours-input')[0].value = '09:00 AM – 05:00 PM';
    businessHoursGrid.querySelectorAll('.days-input')[1].value = 'Sun';
    businessHoursGrid.querySelectorAll('.hours-input')[1].value = 'Closed';
    document.getElementById('businessOutput').textContent = 'Click "Generate Code" to create your shortcodes';
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

  // Initialize and handle all event listeners
  const init = () => {
    // Add initialization code here if needed
  };

  // Start initialization
  init();

  
});


// Accent Color Shortcode Generator
document.getElementById('generateShortcode').addEventListener('click', () => {
  const name = document.getElementById('shortcodeName').value.trim() || 'ac';
  const cssVar = document.getElementById('cssVariable').value.trim() || 'var(--e-global-color-accent)';

  const code = `<?php
// Function to create a "${name}" shortcode using accent color

function ${name}_color_shortcode($atts, $content = null) {
    return '<span style="color: ${cssVar};">' . do_shortcode($content) . '</span>';
}
add_shortcode('${name}', '${name}_color_shortcode');
?>`;

  const output = document.getElementById('phpOutput');
  output.textContent = code;


  
  
  // Update usage example
  document.getElementById('usageExample').textContent = `This is an[${name}]Accent Color Example.[/${name}]`;
  
  // Show the preview section
  document.querySelector('.preview-section').classList.remove('hidden');
});

// Copy PHP code
document.getElementById('copyPHP').addEventListener('click', () => {
  const code = document.getElementById('phpOutput').textContent;
  navigator.clipboard.writeText(code).then(() => {    const btn = document.getElementById('copyPHP');
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = original, 2000);
  });
});

// Copy usage example
document.getElementById('copyUsage').addEventListener('click', () => {
  const example = document.getElementById('usageExample').textContent;
  navigator.clipboard.writeText(example).then(() => {
    const btn = document.getElementById('copyUsage');
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = original, 2000);
  });
});

// Reset form
document.getElementById('resetAccent').addEventListener('click', () => {
  document.getElementById('shortcodeName').value = 'ac';
  document.getElementById('cssVariable').value = 'var(--e-global-color-accent)';
  document.getElementById('phpOutput').textContent = '';
  document.getElementById('usageExample').textContent = 'This is an[ac]Accent Color Example.[/ac]';
});

// Auto-generate on input change
['shortcodeName', 'cssVariable'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    document.getElementById('generateShortcode').click();
  });
});

