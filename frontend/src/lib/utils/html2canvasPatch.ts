
const replaceNestedFunction = (str: string, funcName: string, fallbackValue: string) => {
  let index = 0;
  while (true) {
    index = str.indexOf(funcName + '(', index);
    if (index === -1) break;
    let depth = 1;
    let i = index + funcName.length + 1;
    while (i < str.length && depth > 0) {
      if (str[i] === '(') depth++;
      else if (str[i] === ')') depth--;
      i++;
    }
    str = str.substring(0, index) + fallbackValue + str.substring(i);
    index += fallbackValue.length;
  }
  return str;
};

const unsupportedFuncs = ['oklab', 'oklch', 'color-mix', 'lab', 'lch', 'hwb', 'light-dark'];

const hasUnsupported = (str: string) => {
  return unsupportedFuncs.some(fn => str.includes(fn));
};

const sanitizeColors = (str: string) => {
  let result = str;
  for (const fn of unsupportedFuncs) {
    result = replaceNestedFunction(result, fn, 'rgba(0,0,0,0.1)');
  }
  return result;
};

function proxyStyleDeclaration(style: CSSStyleDeclaration): CSSStyleDeclaration {
  return new Proxy(style, {
    get(target, prop) {
      const val = Reflect.get(target, prop);
      if (typeof val === 'string') {
        if (hasUnsupported(val)) {
          return 'rgba(0, 0, 0, 0.1)';
        }
      }
      if (typeof val === 'function') {
        return function(this: any, ...args: any[]) {
          const res = val.apply(target, args);
          if (typeof res === 'string') {
            if (hasUnsupported(res)) {
              return 'rgba(0, 0, 0, 0.1)';
            }
          }
          return res;
        };
      }
      return val;
    }
  });
}

export function patchClonedDocumentForHtml2canvas(clonedDoc: Document) {
  // 0. Force Light Mode on the cloned document for clean pastel cute card rendering
  try {
    const htmlEl = clonedDoc.documentElement;
    const bodyEl = clonedDoc.body;
    if (htmlEl) {
      htmlEl.classList.remove('dark');
      htmlEl.style.setProperty('--bg-body', '#f2f4f6');
      htmlEl.style.setProperty('--bg-surface', '#ffffff');
      htmlEl.style.setProperty('--text-primary', '#191f28');
      htmlEl.style.setProperty('--text-secondary', '#4e5968');
      htmlEl.style.setProperty('--toss-blue', '#00d29d');
      htmlEl.style.setProperty('--toss-blue-light', '#e0fbf4');
    }
    if (bodyEl) {
      bodyEl.classList.remove('dark');
      bodyEl.style.backgroundColor = '#f2f4f6';
      bodyEl.style.color = '#191f28';
    }
  } catch (e) {
    console.warn("Failed to reset dark-mode classes on clone:", e);
  }

  // 0.2. Fix duplicate SVG render missing issues on mobile browsers
  try {
    const svgs = clonedDoc.getElementsByTagName('svg');
    for (let i = 0; i < svgs.length; i++) {
      const svg = svgs[i] as SVGSVGElement;
      if (!svg.getAttribute('viewBox') && svg.getBoundingClientRect) {
        const rect = svg.getBoundingClientRect();
        if (rect.width && rect.height) {
          svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
        }
      }
    }
  } catch (e) {
    console.warn("Failed to patch clone SVG icons:", e);
  }

  // 1. Clean <style> tags content
  try {
    const styleTags = clonedDoc.getElementsByTagName('style');
    for (let i = 0; i < styleTags.length; i++) {
      const style = styleTags[i];
      if (style.innerHTML && hasUnsupported(style.innerHTML)) {
        style.innerHTML = sanitizeColors(style.innerHTML);
      }
    }
  } catch (e) {
    console.warn("Failed to clean style tags:", e);
  }

  // 2. Clean styleSheets rules directly
  try {
    for (let i = 0; i < clonedDoc.styleSheets.length; i++) {
      const sheet = clonedDoc.styleSheets[i] as CSSStyleSheet;
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (!rules) continue;
        for (let j = 0; j < rules.length; j++) {
          const rule = rules[j] as CSSStyleRule;
          if (rule.style && rule.style.cssText) {
            const cssText = rule.style.cssText;
            if (hasUnsupported(cssText)) {
              rule.style.cssText = sanitizeColors(cssText);
            }
          }
        }
      } catch (e) {
        // Ignore CORS stylesheet errors
      }
    }
  } catch (e) {
    console.warn("Error cleaning styleSheets:", e);
  }

  // 3. Clean inline styles and shadows
  try {
    const allElements = clonedDoc.getElementsByTagName('*');
    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i] as HTMLElement;
      if (el.style) {
        if (el.style.cssText && hasUnsupported(el.style.cssText)) {
          el.style.cssText = sanitizeColors(el.style.cssText);
        }
        // Remove shadows and rings to avoid canvas rendering artifacts/crashes
        el.style.boxShadow = 'none';
        if (el.className && typeof el.className === 'string') {
          // Remove tailwind shadow and ring classes which compute to oklab
          if (el.className.includes('shadow') || el.className.includes('ring')) {
            el.className = el.className.replace(/\b(shadow|ring)[^\s]*\b/g, '');
          }
        }
      }
    }
  } catch (e) {
    console.warn("Failed to clean elements:", e);
  }

  // 4. Override getComputedStyle of the cloned document's window
  if (clonedDoc.defaultView) {
    try {
      const originalGetComputedStyle = clonedDoc.defaultView.getComputedStyle;
      clonedDoc.defaultView.getComputedStyle = function(el, pseudoElt) {
        const style = originalGetComputedStyle.call(clonedDoc.defaultView, el, pseudoElt);
        return proxyStyleDeclaration(style);
      };
    } catch (e) {
      console.warn("Failed to override getComputedStyle:", e);
    }
  }
}

export async function safeHtml2canvas(
  element: HTMLElement,
  options: any = {}
): Promise<HTMLCanvasElement> {
  const html2canvas = (await import('html2canvas')).default;
  let originalGetComputedStyle: typeof window.getComputedStyle | undefined = undefined;
  if (typeof window !== 'undefined') {
    originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = function(el, pseudoElt) {
      const style = originalGetComputedStyle ? originalGetComputedStyle.call(window, el, pseudoElt) : window.getComputedStyle(el, pseudoElt);
      return proxyStyleDeclaration(style);
    };
  }

  const originalOnclone = options.onclone;
  options.onclone = (clonedDoc: Document) => {
    patchClonedDocumentForHtml2canvas(clonedDoc);
    if (originalOnclone) {
      originalOnclone(clonedDoc);
    }
  };

  try {
    return await html2canvas(element, options);
  } finally {
    if (typeof window !== 'undefined' && originalGetComputedStyle) {
      window.getComputedStyle = originalGetComputedStyle;
    }
  }
}

export async function safeHtml2canvasPro(
  html2canvasProInstance: any,
  element: HTMLElement,
  options: any = {}
): Promise<HTMLCanvasElement> {
  let originalGetComputedStyle: typeof window.getComputedStyle | undefined = undefined;
  if (typeof window !== 'undefined') {
    originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = function(el, pseudoElt) {
      const style = originalGetComputedStyle ? originalGetComputedStyle.call(window, el, pseudoElt) : window.getComputedStyle(el, pseudoElt);
      return proxyStyleDeclaration(style);
    };
  }

  const originalOnclone = options.onclone;
  options.onclone = (clonedDoc: Document) => {
    patchClonedDocumentForHtml2canvas(clonedDoc);
    if (originalOnclone) {
      originalOnclone(clonedDoc);
    }
  };

  try {
    return await html2canvasProInstance(element, options);
  } finally {
    if (typeof window !== 'undefined' && originalGetComputedStyle) {
      window.getComputedStyle = originalGetComputedStyle;
    }
  }
}
