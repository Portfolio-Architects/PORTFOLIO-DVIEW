/**
 * @module safeReload
 * @description Prevents infinite reload loops when lazy-loaded dynamic chunks fail to load.
 */
export function safeReload(componentName: string) {
  if (typeof window !== 'undefined') {
    const key = `chunk_retry_${componentName}`;
    const retried = sessionStorage.getItem(key);
    if (!retried) {
      sessionStorage.setItem(key, 'true');
      window.location.reload();
    } else {
      console.error(`[Chunk Load] Reload failed repeatedly for ${componentName}. Stopping reload to prevent infinite loop.`);
      setTimeout(() => sessionStorage.removeItem(key), 15000);
    }
  }
}
