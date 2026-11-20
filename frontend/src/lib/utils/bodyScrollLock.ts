/**
 * Reference-counted document.body inline overflow scroll lock and Apple touch UA helper.
 * Prevents stacked or sequentially transitioning modals (e.g. PushSubscriptionModal -> CustomA2HSModal,
 * or ApartmentModal -> PushSubscriptionModal) from prematurely unlocking body scroll or overwriting
 * stylesheet `body { overflow-x: hidden }` with `overflow: visible`.
 */

let activeScrollLockCount = 0;
let savedInlineBodyOverflow = '';
let savedInlineBodyPaddingRight = '';
let savedInlineHtmlOverscroll = '';

export function acquireBodyScrollLock(): () => void {
  if (typeof document === 'undefined' || !document.body) {
    return () => {};
  }

  if (activeScrollLockCount === 0) {
    savedInlineBodyOverflow = document.body.style.overflow;
    savedInlineBodyPaddingRight = document.body.style.paddingRight;
    savedInlineHtmlOverscroll = document.documentElement?.style.overscrollBehavior ?? '';

    if (typeof window !== 'undefined' && document.documentElement) {
      const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
      if (scrollbarWidth > 0) {
        const computedPaddingRight =
          parseFloat(window.getComputedStyle(document.body).paddingRight || '0') || 0;
        document.body.style.paddingRight = `${computedPaddingRight + scrollbarWidth}px`;
      }
      document.documentElement.style.overscrollBehavior = 'none';
    }
    document.body.style.overflow = 'hidden';
  }
  activeScrollLockCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeScrollLockCount = Math.max(0, activeScrollLockCount - 1);
    if (activeScrollLockCount === 0 && typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = savedInlineBodyOverflow;
      document.body.style.paddingRight = savedInlineBodyPaddingRight;
      if (document.documentElement) {
        document.documentElement.style.overscrollBehavior = savedInlineHtmlOverscroll;
      }
      savedInlineBodyOverflow = '';
      savedInlineBodyPaddingRight = '';
      savedInlineHtmlOverscroll = '';
    }
  };
}

export function getActiveBodyScrollLockCount(): number {
  return activeScrollLockCount;
}

export function resetBodyScrollLockForTests(): void {
  activeScrollLockCount = 0;
  savedInlineBodyOverflow = '';
  savedInlineBodyPaddingRight = '';
  savedInlineHtmlOverscroll = '';
  if (typeof document !== 'undefined' && document.body) {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    if (document.documentElement) {
      document.documentElement.style.overscrollBehavior = '';
    }
  }
}

/**
 * Detects iPhone, iPod, iPad, and modern iPadOS 13+ Safari (which reports a Macintosh UA
 * alongside multi-touch `navigator.maxTouchPoints > 1`).
 */
export function isAppleTouchDevice(
  userAgent?: string | null,
  maxTouchPoints?: number | null
): boolean {
  const ua = String(userAgent || '').toLowerCase();
  if (!ua) return false;
  if (/iphone|ipad|ipod/.test(ua)) {
    return true;
  }
  if (/macintosh|mac os x/.test(ua) && typeof maxTouchPoints === 'number' && maxTouchPoints > 1) {
    return true;
  }
  return false;
}
