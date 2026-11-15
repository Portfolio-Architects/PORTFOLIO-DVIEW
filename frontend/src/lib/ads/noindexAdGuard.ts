/**
 * Shared AdSense isolation guard for `noindex` routes (`/lounge`, `/news`, `/technovalley/[slug]`,
 * 404 pages, and zero-sale apartment pages marked `<meta name="robots" content="noindex, follow">`).
 * Pure server/client-safe module (no React client hooks) so Server Components (`layout.tsx`) can import it directly.
 */

const NOINDEX_AD_EXCLUDED_PATH_REGEX = /^\/(?:lounge|news)(?:\/|$)/i;
const TECHNOVALLEY_DETAIL_PATH_REGEX = /^\/technovalley\/.+/i;

type AdSenseWindow = Window & {
  adsbygoogle?: unknown[] & { pauseAdRequests?: number };
  __DVIEW_NOINDEX_ADS_PAUSED__?: boolean;
};

export function isNoindexAdExcludedPath(pathname?: string | null): boolean {
  if (!pathname || typeof pathname !== 'string') return false;
  const cleanPath = pathname.split('?')[0].split('#')[0].trim();
  if (!cleanPath) return false;
  const normalized = cleanPath !== '/' ? cleanPath.replace(/\/+$/, '') : '/';
  if (NOINDEX_AD_EXCLUDED_PATH_REGEX.test(normalized)) return true;
  if (TECHNOVALLEY_DETAIL_PATH_REGEX.test(normalized)) return true;
  return false;
}

export function documentHasNoindexRobotsMeta(doc?: Document | null): boolean {
  const targetDoc = doc ?? (typeof document !== 'undefined' ? document : null);
  if (!targetDoc || typeof targetDoc.querySelectorAll !== 'function') return false;
  try {
    const metas = targetDoc.querySelectorAll('meta[name="robots"], meta[name="googlebot"]');
    for (let i = 0; i < metas.length; i++) {
      const content = metas[i]?.getAttribute('content') || '';
      if (/\bnoindex\b/i.test(content)) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Synchronizes `window.adsbygoogle.pauseAdRequests` (`1` on `noindex` routes, `0` when returning to indexable routes).
 */
export function syncWindowAdSenseNoindexPause(
  pathname?: string | null,
  doc?: Document | null
): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const effectivePath =
      typeof pathname === 'string' && pathname.length > 0
        ? pathname
        : window.location?.pathname || '/';
    const isExcluded =
      isNoindexAdExcludedPath(effectivePath) || documentHasNoindexRobotsMeta(doc);
    const win = window as AdSenseWindow;
    const queue = (win.adsbygoogle =
      win.adsbygoogle || ([] as unknown[] & { pauseAdRequests?: number }));
    if (isExcluded) {
      queue.pauseAdRequests = 1;
      win.__DVIEW_NOINDEX_ADS_PAUSED__ = true;
    } else if (win.__DVIEW_NOINDEX_ADS_PAUSED__) {
      queue.pauseAdRequests = 0;
      win.__DVIEW_NOINDEX_ADS_PAUSED__ = false;
    }
    return isExcluded;
  } catch {
    return false;
  }
}

const headListeners = new Set<() => void>();
let sharedHeadObserver: MutationObserver | null = null;
let observedHeadNode: HTMLHeadElement | null = null;

function notifyHeadListeners(): void {
  syncWindowAdSenseNoindexPause();
  headListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore subscriber errors
    }
  });
}

export function ensureSharedHeadObserver(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const currentHead = document.head;
  if (!currentHead || typeof MutationObserver === 'undefined') return;
  if (sharedHeadObserver && observedHeadNode === currentHead) return;

  if (sharedHeadObserver) {
    sharedHeadObserver.disconnect();
  }
  observedHeadNode = currentHead;
  sharedHeadObserver = new MutationObserver(() => {
    notifyHeadListeners();
  });
  sharedHeadObserver.observe(currentHead, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['name', 'content'],
  });
}

export function subscribeNoindexHead(listener: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const wasEmpty = headListeners.size === 0;
  headListeners.add(listener);
  ensureSharedHeadObserver();
  if (wasEmpty) {
    window.addEventListener('popstate', notifyHeadListeners);
  }
  return () => {
    headListeners.delete(listener);
    if (headListeners.size === 0) {
      if (sharedHeadObserver) {
        sharedHeadObserver.disconnect();
        sharedHeadObserver = null;
        observedHeadNode = null;
      }
      window.removeEventListener('popstate', notifyHeadListeners);
    }
  };
}

/**
 * Synchronous pre-hydration `<head>` inline script executed BEFORE `<script id="google-adsense" async itemProp="adsense-loader">`.
 * Sets `(window.adsbygoogle = window.adsbygoogle || []).pauseAdRequests = 1` on `/lounge`, `/news`,
 * `/technovalley/[slug]`, and any page emitting `<meta name="robots" content*="noindex">`, and observes `<head>` mutations.
 */
export function buildPreHydrationAdSenseNoindexGuardScript(): string {
  return `(function(){try{var check=function(){try{var p=((window.location&&window.location.pathname)||'/').replace(/\\/+$/,'')||'/';var isExcluded=/^\\/(?:lounge|news)(?:\\/|$)/i.test(p)||/^\\/technovalley\\/.+/i.test(p);if(!isExcluded&&typeof document!=='undefined'&&document.querySelectorAll){var ms=document.querySelectorAll('meta[name="robots"],meta[name="googlebot"]');for(var i=0;i<ms.length;i++){var c=ms[i].getAttribute('content')||'';if(/\\bnoindex\\b/i.test(c)){isExcluded=true;break;}}}var q=window.adsbygoogle=window.adsbygoogle||[];if(isExcluded){q.pauseAdRequests=1;window.__DVIEW_NOINDEX_ADS_PAUSED__=true;}else if(window.__DVIEW_NOINDEX_ADS_PAUSED__){q.pauseAdRequests=0;window.__DVIEW_NOINDEX_ADS_PAUSED__=false;}}catch(_){}};check();if(typeof document!=='undefined'){if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',check,{once:true});}if(document.head&&typeof MutationObserver!=='undefined'&&!window.__DVIEW_NOINDEX_HEAD_OBS__){window.__DVIEW_NOINDEX_HEAD_OBS__=true;new MutationObserver(check).observe(document.head,{childList:true,subtree:true,attributes:true,attributeFilter:['name','content']});}}if(typeof window!=='undefined'){window.addEventListener('popstate',check);}}catch(_){}})();`;
}
