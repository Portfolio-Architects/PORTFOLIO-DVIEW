/**
 * @module ga4DataLayerBootstrap
 * @description Zero-dependency GA4 `window.dataLayer` bootstrap queue order normalizer.
 *
 * Guarantees that `gtag('js', Date)` and `gtag('config', 'G-...')` tuples always precede
 * any early `gtag('event', ...)` tuples queued during React Selective Hydration or child-first
 * mount races before external `gtag.js` upgrades `window.dataLayer.push`.
 *
 * Preserves:
 *  - Exact `window.dataLayer` Array identity
 *  - Exact `[object Arguments]` tuple references (required by `gtag.js`)
 *  - Zero own `push` property on pristine `window.dataLayer` (`hasOwnProperty('push') === false`)
 */

let preConfigMicrotaskScheduled = false;
let preConfigMutationObserver: MutationObserver | null = null;

function getDataLayerCommandRank(item: unknown): number {
  if (item === null || typeof item !== 'object') {
    return 3;
  }
  const cmd = (item as ArrayLike<unknown>)[0];
  if (cmd === 'consent') return 0;
  if (cmd === 'js') return 1;
  if (cmd === 'config') return 2;
  return 3;
}

export function hasDataLayerConfigCommand(dataLayer: unknown): boolean {
  if (!Array.isArray(dataLayer)) return false;
  for (let i = 0; i < dataLayer.length; i++) {
    const item = dataLayer[i];
    if (item !== null && typeof item === 'object' && (item as ArrayLike<unknown>)[0] === 'config') {
      return true;
    }
  }
  return false;
}

function disconnectPreConfigObserver(): void {
  if (preConfigMutationObserver) {
    try {
      preConfigMutationObserver.disconnect();
    } catch {
      // Ignore DOM observer cleanup errors in torn-down test environments
    }
    preConfigMutationObserver = null;
  }
}

export function resetPreConfigDataLayerNormalizationState(): void {
  preConfigMicrotaskScheduled = false;
  disconnectPreConfigObserver();
}

/**
 * Stably hoists `consent` -> `js` -> `config` tuples ahead of `event` tuples in-place
 * while `window.dataLayer` is still a raw pre-`gtag.js` queue (`!hasOwnProperty(dl, 'push')`).
 * Returns `true` if any entries were reordered, `false` otherwise.
 */
export function normalizeGa4DataLayerBootstrapOrder(dataLayer?: unknown): boolean {
  if (
    !Array.isArray(dataLayer) ||
    dataLayer.length < 2 ||
    Object.isFrozen(dataLayer) ||
    Object.prototype.hasOwnProperty.call(dataLayer, 'push')
  ) {
    return false;
  }

  let hasBootstrapCommand = false;
  let maxRankSeen = -1;
  let needsReorder = false;

  for (let i = 0; i < dataLayer.length; i++) {
    const rank = getDataLayerCommandRank(dataLayer[i]);
    if (rank === 1 || rank === 2) {
      hasBootstrapCommand = true;
    }
    if (rank < maxRankSeen) {
      needsReorder = true;
    } else {
      maxRankSeen = rank;
    }
  }

  if (!hasBootstrapCommand || !needsReorder) {
    return false;
  }

  const consentBucket: unknown[] = [];
  const jsBucket: unknown[] = [];
  const configBucket: unknown[] = [];
  const postConfigBucket: unknown[] = [];

  for (let i = 0; i < dataLayer.length; i++) {
    const entry = dataLayer[i];
    const rank = getDataLayerCommandRank(entry);
    if (rank === 0) {
      consentBucket.push(entry);
    } else if (rank === 1) {
      jsBucket.push(entry);
    } else if (rank === 2) {
      configBucket.push(entry);
    } else {
      postConfigBucket.push(entry);
    }
  }

  const ordered = [...consentBucket, ...jsBucket, ...configBucket, ...postConfigBucket];
  try {
    for (let i = 0; i < ordered.length; i++) {
      dataLayer[i] = ordered[i];
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensures any pre-config `event` tuples queued into `window.dataLayer` before `#_next-ga-init`
 * executes are automatically reordered behind `js` and `config` via both a same-turn microtask
 * and a one-shot DOM `MutationObserver` watching for `#_next-ga-init`, strictly before async
 * external `gtag.js` downloads and replays the queue.
 */
export function schedulePreConfigDataLayerNormalization(dataLayer?: unknown): void {
  const targetDl =
    dataLayer ??
    (typeof window !== 'undefined'
      ? (window as unknown as { dataLayer?: unknown }).dataLayer
      : undefined);

  if (
    !Array.isArray(targetDl) ||
    targetDl.length === 0 ||
    Object.isFrozen(targetDl) ||
    Object.prototype.hasOwnProperty.call(targetDl, 'push')
  ) {
    return;
  }

  normalizeGa4DataLayerBootstrapOrder(targetDl);

  if (hasDataLayerConfigCommand(targetDl)) {
    disconnectPreConfigObserver();
    return;
  }

  if (!preConfigMicrotaskScheduled) {
    preConfigMicrotaskScheduled = true;
    const flushMicrotask = () => {
      preConfigMicrotaskScheduled = false;
      if (typeof window === 'undefined') return;
      const currentDl = (window as unknown as { dataLayer?: unknown }).dataLayer;
      normalizeGa4DataLayerBootstrapOrder(currentDl);
      if (hasDataLayerConfigCommand(currentDl)) {
        disconnectPreConfigObserver();
      }
    };
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(flushMicrotask);
    } else {
      void Promise.resolve().then(flushMicrotask);
    }
  }

  if (
    !preConfigMutationObserver &&
    typeof MutationObserver === 'function' &&
    typeof document !== 'undefined'
  ) {
    const rootNode = document.documentElement || document.body;
    if (rootNode) {
      try {
        preConfigMutationObserver = new MutationObserver(() => {
          if (typeof window === 'undefined') {
            disconnectPreConfigObserver();
            return;
          }
          const currentDl = (window as unknown as { dataLayer?: unknown }).dataLayer;
          normalizeGa4DataLayerBootstrapOrder(currentDl);
          if (
            hasDataLayerConfigCommand(currentDl) ||
            (typeof document !== 'undefined' && Boolean(document.getElementById('_next-ga-init')))
          ) {
            disconnectPreConfigObserver();
          }
        });
        preConfigMutationObserver.observe(rootNode, {
          childList: true,
          subtree: true,
        });
      } catch {
        disconnectPreConfigObserver();
      }
    }
  }
}
