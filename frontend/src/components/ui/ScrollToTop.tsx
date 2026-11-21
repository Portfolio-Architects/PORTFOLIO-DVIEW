'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp } from 'lucide-react';

const MODAL_DIALOG_SELECTOR = '[role="dialog"][aria-modal="true"]';

function getModalDialogs(): HTMLElement[] {
  if (typeof document === 'undefined') return [];
  return Array.from(document.querySelectorAll<HTMLElement>(MODAL_DIALOG_SELECTOR));
}

function isDialogElementVisible(el: HTMLElement): boolean {
  if (!el.isConnected) return false;
  const canComputeStyle =
    typeof window !== 'undefined' && typeof window.getComputedStyle === 'function';
  let current: HTMLElement | null = el;
  while (current) {
    if (
      current.hidden ||
      current.getAttribute('aria-hidden') === 'true' ||
      current.hasAttribute('inert')
    ) {
      return false;
    }
    if (canComputeStyle) {
      const style = window.getComputedStyle(current);
      if (style.display === 'none') return false;
      if (current === el && (style.visibility === 'hidden' || style.visibility === 'collapse')) {
        return false;
      }
    }
    if (current === document.body || current === document.documentElement) break;
    current = current.parentElement;
  }
  return true;
}

function hasVisibleModalDialog(dialogs: HTMLElement[] = getModalDialogs()): boolean {
  for (let i = 0; i < dialogs.length; i += 1) {
    if (isDialogElementVisible(dialogs[i])) return true;
  }
  return false;
}

function containsModalDialogNode(node: Node): boolean {
  if (node.nodeType !== 1) return false;
  const el = node as Element;
  return el.matches(MODAL_DIALOG_SELECTOR) || el.querySelector(MODAL_DIALOG_SELECTOR) !== null;
}

function containsKnownDialog(node: Node, knownDialogs: HTMLElement[]): boolean {
  for (let k = 0; k < knownDialogs.length; k += 1) {
    if (node === knownDialogs[k] || node.contains(knownDialogs[k])) {
      return true;
    }
  }
  return false;
}

function hasRelevantModalMutation(
  records: MutationRecord[],
  knownDialogs: HTMLElement[]
): boolean {
  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    if (record.type === 'childList') {
      for (let j = 0; j < record.addedNodes.length; j += 1) {
        if (containsModalDialogNode(record.addedNodes[j])) return true;
      }
      for (let j = 0; j < record.removedNodes.length; j += 1) {
        const removed = record.removedNodes[j];
        if (
          containsModalDialogNode(removed) ||
          (knownDialogs.length > 0 && containsKnownDialog(removed, knownDialogs))
        ) {
          return true;
        }
      }
      continue;
    }

    if (record.type === 'attributes') {
      const attr = record.attributeName;
      const target = record.target;
      if (attr === 'role' || attr === 'aria-modal') {
        if (
          target instanceof Element &&
          (target.matches(MODAL_DIALOG_SELECTOR) ||
            (knownDialogs.length > 0 && knownDialogs.includes(target as HTMLElement)))
        ) {
          return true;
        }
        continue;
      }
      if (knownDialogs.length === 0) continue;
      if (target === document.body) continue;
      if (target instanceof Node && containsKnownDialog(target, knownDialogs)) {
        return true;
      }
    }
  }
  return false;
}

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [hasOpenModal, setHasOpenModal] = useState(false);
  const hasOpenModalRef = useRef(false);
  const flushPendingModalSyncRef = useRef<(() => boolean) | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const toggleVisibility = (e: Event) => {
      const target = e.target;
      // Ignore internal scroll events from the apartment overlay drawer (which renders its own scroll-to-top button)
      if (
        target instanceof HTMLElement &&
        target.closest('[data-testid="apartment-inspector-panel"]')
      ) {
        setIsVisible(false);
        return;
      }

      // Suppress global mobile ScrollToTop while any visible full-screen modal dialog is open
      const modalOpen =
        flushPendingModalSyncRef.current !== null
          ? flushPendingModalSyncRef.current()
          : typeof MutationObserver === 'undefined'
            ? hasVisibleModalDialog()
            : hasOpenModalRef.current;
      if (modalOpen) {
        if (!hasOpenModalRef.current) {
          hasOpenModalRef.current = true;
          setHasOpenModal(true);
        }
        setIsVisible(false);
        return;
      }

      let scrollTop = 0;

      if (
        target === document ||
        target === window ||
        target === document.documentElement ||
        target === document.body
      ) {
        scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      } else if (
        target instanceof HTMLElement &&
        target.classList.contains('fixed') &&
        target.classList.contains('overflow-y-auto')
      ) {
        scrollTop = target.scrollTop;
      } else {
        // Ignore nested non-page scrollables (e.g., horizontal chip strips, small tables)
        return;
      }

      // 출현 시점 단축: 120px 이상 스크롤 시 버튼 노출
      setIsVisible(scrollTop > 120);
    };

    // Sync initial scroll position in case browser restored scroll offset or user scrolled prior to hydration
    const initialY = window.scrollY || document.documentElement.scrollTop || 0;
    if (initialY > 120 && !hasOpenModalRef.current && !hasVisibleModalDialog()) {
      setIsVisible(true);
    }

    // Use capture phase (true) and passive option to intercept scroll events from nested scroll containers without blocking main thread
    window.addEventListener('scroll', toggleVisibility, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility, { capture: true });
  }, []);

  // Immediately hide/restore ScrollToTop when modal dialogs mount or unmount even without a scroll event,
  // filtering irrelevant class/style storms (body.is-scrolling, chart tooltips) and coalescing via rAF.
  useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
    let isDisposed = false;
    let rafId: number | null = null;
    let knownDialogs: HTMLElement[] = [];

    const cancelScheduledSync = () => {
      if (
        rafId !== null &&
        typeof window !== 'undefined' &&
        typeof window.cancelAnimationFrame === 'function'
      ) {
        window.cancelAnimationFrame(rafId);
      }
      rafId = null;
    };

    const syncModalPresence = (): boolean => {
      if (isDisposed) return hasOpenModalRef.current;
      knownDialogs = getModalDialogs();
      const open = hasVisibleModalDialog(knownDialogs);
      const wasOpen = hasOpenModalRef.current;
      hasOpenModalRef.current = open;
      if (wasOpen !== open) {
        setHasOpenModal(open);
        if (!open && typeof window !== 'undefined') {
          const y = window.scrollY || document.documentElement.scrollTop || 0;
          setIsVisible(y > 120);
        }
      }
      return open;
    };

    const scheduleSyncModalPresence = () => {
      if (isDisposed || rafId !== null) return;
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        rafId = window.requestAnimationFrame(() => {
          rafId = null;
          if (!isDisposed) {
            syncModalPresence();
          }
        });
      } else {
        syncModalPresence();
      }
    };

    syncModalPresence();
    const observer = new MutationObserver((records) => {
      if (isDisposed || rafId !== null) return;
      if (!hasRelevantModalMutation(records, knownDialogs)) return;
      scheduleSyncModalPresence();
    });

    flushPendingModalSyncRef.current = () => {
      const pendingRecords = observer.takeRecords();
      if (rafId !== null) {
        cancelScheduledSync();
        return syncModalPresence();
      }
      if (pendingRecords.length > 0 && hasRelevantModalMutation(pendingRecords, knownDialogs)) {
        return syncModalPresence();
      }
      return hasOpenModalRef.current;
    };

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['role', 'aria-modal', 'aria-hidden', 'hidden', 'inert', 'style', 'class'],
    });
    return () => {
      isDisposed = true;
      flushPendingModalSyncRef.current = null;
      observer.disconnect();
      cancelScheduledSync();
      knownDialogs = [];
    };
  }, []);

  // Hide floating scroll-to-top button when mobile virtual keyboard is open
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const handleViewportResize = () => {
      const innerH = window.innerHeight || 800;
      setIsKeyboardOpen(vv.height < innerH - 120);
    };
    handleViewportResize();
    vv.addEventListener('resize', handleViewportResize, { passive: true });
    return () => {
      vv.removeEventListener('resize', handleViewportResize);
    };
  }, []);

  const scrollToTop = () => {
    // Try to find if there is an active scrollable modal backdrop
    const modalBackdrops = document.querySelectorAll('.fixed.overflow-y-auto');
    const scrolledModal = Array.from(modalBackdrops).find(
      (el) => el instanceof HTMLElement && el.scrollTop > 50
    ) as HTMLElement | undefined;

    if (scrolledModal) {
      scrolledModal.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } else {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  const showButton = isVisible && !isKeyboardOpen && !hasOpenModal;

  return (
    <button
      type="button"
      data-testid="mobile-scroll-to-top"
      data-scroll-interactive="true"
      onClick={scrollToTop}
      className={`fixed right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+80px+var(--dview-mobile-anchor-offset,0px))] z-[9995] w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 border border-border/40 cursor-pointer active:scale-90 touch-manipulation md:hidden ${
        showButton
          ? 'opacity-100 translate-y-0 scale-100 bg-slate-900 text-white dark:bg-white dark:text-slate-900'
          : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
      }`}
      aria-label="최상단으로 스크롤"
      aria-hidden={!showButton}
      tabIndex={showButton ? 0 : -1}
    >
      <ChevronUp size={22} strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
}
