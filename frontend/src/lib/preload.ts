/**
 * @module preload
 * @description Non-blocking, prioritized asset and component preloader using requestIdleCallback.
 * Architecture Layer: Core Library / Utilities
 */

/**
 * Safely schedule a callback to run during browser idle time, or fallback to setTimeout.
 */
export function scheduleIdle(callback: () => void, timeoutMs: number = 2000): void {
  if (typeof window === 'undefined') return;
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => callback(), { timeout: timeoutMs });
  } else {
    setTimeout(callback, Math.min(timeoutMs, 200));
  }
}

/**
 * Generic helper to preload a dynamic component chunk during browser idle time.
 */
export function preloadComponent(importer: () => Promise<unknown>, timeoutMs: number = 2000): void {
  if (typeof window === 'undefined') return;
  scheduleIdle(() => {
    importer().catch(() => {});
  }, timeoutMs);
}
