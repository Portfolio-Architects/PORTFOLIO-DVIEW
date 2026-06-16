import { z } from 'zod';
import { logger } from '@/lib/services/logger';

// Isomorphic Zod custom guards for browser-only types
const IsomorphicHTMLElementSchema = z.custom<any>((val) => {
  if (typeof window === 'undefined' || typeof HTMLElement === 'undefined') return true;
  return val instanceof HTMLElement;
}, 'Must be a valid HTMLElement');

const IsomorphicDocumentSchema = z.custom<any>((val) => {
  if (typeof window === 'undefined' || typeof Document === 'undefined') return true;
  return val instanceof Document;
}, 'Must be a valid Document');

export const Html2CanvasOptionsSchema = z.object({
  useCORS: z.boolean().optional(),
  allowTaint: z.boolean().optional(),
  backgroundColor: z.string().nullable().optional(),
  scale: z.number().positive().optional(),
  logging: z.boolean().optional(),
  onclone: z.function().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  scrollX: z.number().optional(),
  scrollY: z.number().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  foreignObjectRendering: z.boolean().optional(),
  imageTimeout: z.number().nonnegative().optional(),
  removeContainer: z.boolean().optional(),
  ignoreElements: z.function().optional(),
}).catchall(z.any());

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
  const docValidation = IsomorphicDocumentSchema.safeParse(clonedDoc);
  if (!docValidation.success) {
    logger.warn('html2canvasPatch.patchClonedDocumentForHtml2canvas', 'Invalid clonedDoc provided', {
      error: String(docValidation.error)
    });
    return;
  }

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
    logger.warn("html2canvasPatch.patchClonedDocumentForHtml2canvas", "Failed to reset dark-mode classes on clone", { error: String(e) });
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
    logger.warn("html2canvasPatch.patchClonedDocumentForHtml2canvas", "Failed to patch clone SVG icons", { error: String(e) });
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
    logger.warn("html2canvasPatch.patchClonedDocumentForHtml2canvas", "Failed to clean style tags", { error: String(e) });
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
    logger.warn("html2canvasPatch.patchClonedDocumentForHtml2canvas", "Error cleaning styleSheets", { error: String(e) });
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
    logger.warn("html2canvasPatch.patchClonedDocumentForHtml2canvas", "Failed to clean elements", { error: String(e) });
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
      logger.warn("html2canvasPatch.patchClonedDocumentForHtml2canvas", "Failed to override getComputedStyle", { error: String(e) });
    }
  }
}

export async function safeHtml2canvas(
  element: HTMLElement,
  options: any = {}
): Promise<HTMLCanvasElement> {
  const elementVal = IsomorphicHTMLElementSchema.safeParse(element);
  const optionsVal = Html2CanvasOptionsSchema.safeParse(options);
  if (!elementVal.success || !optionsVal.success) {
    logger.warn('html2canvasPatch.safeHtml2canvas', 'Invalid arguments provided', {
      elementError: elementVal.success ? undefined : String(elementVal.error),
      optionsError: optionsVal.success ? undefined : String(optionsVal.error),
    });
  }

  const validatedOptions = optionsVal.success ? optionsVal.data : (options || {});
  const html2canvas = (await import('html2canvas')).default;
  let originalGetComputedStyle: typeof window.getComputedStyle | undefined = undefined;
  if (typeof window !== 'undefined') {
    originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = function(el, pseudoElt) {
      const style = originalGetComputedStyle ? originalGetComputedStyle.call(window, el, pseudoElt) : window.getComputedStyle(el, pseudoElt);
      return proxyStyleDeclaration(style);
    };
  }

  const originalOnclone = validatedOptions.onclone;
  validatedOptions.onclone = (clonedDoc: Document) => {
    patchClonedDocumentForHtml2canvas(clonedDoc);
    if (originalOnclone) {
      originalOnclone(clonedDoc);
    }
  };

  try {
    return await html2canvas(element, validatedOptions);
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
  const elementVal = IsomorphicHTMLElementSchema.safeParse(element);
  const optionsVal = Html2CanvasOptionsSchema.safeParse(options);
  if (!elementVal.success || !optionsVal.success) {
    logger.warn('html2canvasPatch.safeHtml2canvasPro', 'Invalid arguments provided', {
      elementError: elementVal.success ? undefined : String(elementVal.error),
      optionsError: optionsVal.success ? undefined : String(optionsVal.error),
    });
  }

  const validatedOptions = optionsVal.success ? { ...optionsVal.data } : { ...(options || {}) };
  let originalGetComputedStyle: typeof window.getComputedStyle | undefined = undefined;
  if (typeof window !== 'undefined') {
    originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = function(el, pseudoElt) {
      const style = originalGetComputedStyle ? originalGetComputedStyle.call(window, el, pseudoElt) : window.getComputedStyle(el, pseudoElt);
      return proxyStyleDeclaration(style);
    };
  }

  const originalOnclone = validatedOptions.onclone;
  validatedOptions.onclone = (clonedDoc: Document) => {
    patchClonedDocumentForHtml2canvas(clonedDoc);
    if (originalOnclone) {
      originalOnclone(clonedDoc);
    }
  };

  try {
    const initialScale = validatedOptions.scale || 1.0;
    // Attempt progressive scale reductions (initial -> 1.5 -> 1.0 -> 0.8) to handle canvas OOM issues on low-end devices
    const scalesToTry = [initialScale, 1.5, 1.0, 0.8].filter((s, idx, arr) => s <= initialScale && arr.indexOf(s) === idx);
    let lastError: any = null;

    for (const scale of scalesToTry) {
      try {
        validatedOptions.scale = scale;
        const canvas = await html2canvasProInstance(element, validatedOptions);
        if (canvas && canvas.width > 0 && canvas.height > 0) {
          logger.info('html2canvasPatch.safeHtml2canvasPro', `Successfully captured canvas at scale ${scale}`);
          return canvas;
        }
        throw new Error("Canvas generated empty or zero dimensions");
      } catch (err) {
        lastError = err;
        logger.warn('html2canvasPatch.safeHtml2canvasPro', `Failed capture with scale ${scale}, attempting fallback...`, {
          error: String(err)
        });
      }
    }
    throw lastError || new Error("All scale options failed");
  } finally {
    if (typeof window !== 'undefined' && originalGetComputedStyle) {
      window.getComputedStyle = originalGetComputedStyle;
    }
  }
}
