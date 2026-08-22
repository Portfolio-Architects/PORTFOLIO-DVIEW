/**
 * @module preloadHelpers
 * @description Pure asset and data preloading utilities.
 * Architecture Layer: Infrastructure / Utility (zero UI component imports)
 */

const preloadedAssets = new Set<string>();

/**
 * Preloads a static image URL in the browser environment.
 * @param src - Image URL to preload
 */
export function preloadImage(src: string): Promise<void> {
  if (typeof window === 'undefined' || !src) return Promise.resolve();
  if (preloadedAssets.has(src)) return Promise.resolve();

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      preloadedAssets.add(src);
      resolve();
    };
    img.onerror = () => {
      resolve(); // Graceful resolve to not block callers
    };
    img.src = src;
  });
}

/**
 * Preloads and caches a JSON dataset via fetch in the background.
 * @param url - URL of the JSON resource
 */
export async function preloadJson<T = unknown>(url: string): Promise<T | null> {
  if (typeof window === 'undefined' || !url) return null;
  try {
    const res = await fetch(url, { priority: 'low' } as RequestInit);
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}
