'use client';

import { useEffect } from 'react';
import type { CascadeSlotStatus } from '@/lib/ads/cascadeFallback';
import { transitionCascadeStateWithPath } from '@/lib/ads/cascadeFallback';

export interface UseInsDomInterceptorParams {
  insRef: React.RefObject<HTMLModElement | null>;
  isPlaceholder: boolean;
  isAdBlockActive: boolean;
  effectiveRefreshKey: string | number | undefined;
  isPushedRef: React.MutableRefObject<boolean>;
  cascadeStatusRef: React.MutableRefObject<CascadeSlotStatus>;
  explicitlyFilledRef: React.MutableRefObject<boolean>;
  cascadeTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  cascadeRemainingMsRef: React.MutableRefObject<number>;
  cascadeTimerStartedAtRef: React.MutableRefObject<number | null>;
  setCascadeStatus: React.Dispatch<React.SetStateAction<CascadeSlotStatus>>;
  setIsAdLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  setLateFillDiscarded: React.Dispatch<React.SetStateAction<boolean>>;
  activateCascadeFallback: (
    trigger: 'UNFILLED_ATTRIBUTE' | 'TIMEOUT_FALLBACK',
    transitionEvent: 'STATUS_UNFILLED' | 'TIMEOUT_3S'
  ) => void;
  clearCascadeTimeout: () => void;
  discardLateFilledResponse: () => void;
  startCascadeTimeout: (customDelayMs?: number) => void;
}

export function useInsDomInterceptor({
  insRef,
  isPlaceholder,
  isAdBlockActive,
  effectiveRefreshKey,
  isPushedRef,
  cascadeStatusRef,
  explicitlyFilledRef,
  cascadeTimeoutRef,
  cascadeRemainingMsRef,
  cascadeTimerStartedAtRef,
  setCascadeStatus,
  setIsAdLoaded,
  setLateFillDiscarded,
  activateCascadeFallback,
  clearCascadeTimeout,
  discardLateFilledResponse,
  startCascadeTimeout,
}: UseInsDomInterceptorParams) {
  useEffect(() => {
    if (isPlaceholder || isAdBlockActive || !insRef.current) return;

    const initialInsEl = insRef.current;
    const parentEl = initialInsEl.parentElement;
    const patchedInsElements = new Set<HTMLElement>();
    let observer: MutationObserver | null = null;
    let isInternalGuardActive = false;

    const nativeSetAttribute = Element.prototype.setAttribute;
    const nativeRemoveAttribute = Element.prototype.removeAttribute;
    const nativeAppendChild = Node.prototype.appendChild;
    const nativeInsertBefore = Node.prototype.insertBefore;
    const nativeReplaceChild = Node.prototype.replaceChild;
    const nativeReplaceWith = Element.prototype.replaceWith;
    const nativeInnerHTMLDescriptor = Object.getOwnPropertyDescriptor(
      Element.prototype,
      'innerHTML'
    );

    const evaluateInsStatus = () => {
      if (!insRef.current) return;
      const status = insRef.current.getAttribute('data-adsbygoogle-status');
      const adStatus = insRef.current.getAttribute('data-ad-status');
      const hasInjectedChildren = insRef.current.childNodes.length > 0;

      // Invariant 5: f(FALLBACK_ACTIVE, STATUS_FILLED) = FALLBACK_ACTIVE
      // If fallback card is already active, cancel & discard any late AdSense fill or injected iframe.
      if (
        cascadeStatusRef.current === 'FALLBACK_ACTIVE' ||
        cascadeStatusRef.current === 'CLICKED'
      ) {
        if (adStatus === 'filled' || hasInjectedChildren) {
          discardLateFilledResponse();
        }
        return;
      }

      // Invariant 1: f(REQUESTED, STATUS_UNFILLED) = UNFILLED_DETECTED -> FALLBACK_ACTIVE (<= 50ms)
      if (adStatus === 'unfilled' && !explicitlyFilledRef.current) {
        activateCascadeFallback('UNFILLED_ATTRIBUTE', 'STATUS_UNFILLED');
        return;
      }

      // Genuine Fill: f(REQUESTED, STATUS_FILLED) = FILLED
      if (adStatus === 'filled' || (hasInjectedChildren && adStatus !== 'unfilled')) {
        clearCascadeTimeout();
        explicitlyFilledRef.current = true;
        const transition = transitionCascadeStateWithPath(
          cascadeStatusRef.current,
          'STATUS_FILLED'
        );
        cascadeStatusRef.current = transition.nextState;
        setCascadeStatus(transition.nextState);
        setIsAdLoaded((prev) => (prev ? prev : true));
        return;
      }

      // If adsbygoogle.js claimed the slot with data-adsbygoogle-status="done" prior to auction completion,
      // dismiss skeleton shimmer while keeping the 3,000ms cascade timeout active until filled/unfilled resolves.
      if (status === 'done' && adStatus !== 'unfilled') {
        setIsAdLoaded((prev) => (prev ? prev : true));
      }
    };

    const syncFromReplacementIns = (replacementEl: HTMLElement) => {
      if (!insRef.current || replacementEl === insRef.current) return;
      const adStatus = replacementEl.getAttribute('data-ad-status');
      const adsbygoogleStatus = replacementEl.getAttribute('data-adsbygoogle-status');
      if (adStatus !== null) {
        nativeSetAttribute.call(insRef.current, 'data-ad-status', adStatus);
      }
      if (adsbygoogleStatus !== null) {
        nativeSetAttribute.call(insRef.current, 'data-adsbygoogle-status', adsbygoogleStatus);
      }
      if (replacementEl.childNodes.length > 0 && nativeInnerHTMLDescriptor?.set) {
        nativeInnerHTMLDescriptor.set.call(insRef.current, replacementEl.innerHTML);
      }
    };

    const bindInsInterceptors = (targetIns: HTMLElement) => {
      if (patchedInsElements.has(targetIns)) return;
      patchedInsElements.add(targetIns);

      targetIns.setAttribute = function (qualifiedName: string, value: string) {
        nativeSetAttribute.call(this, qualifiedName, value);
        if (this !== insRef.current && insRef.current) {
          nativeSetAttribute.call(insRef.current, qualifiedName, value);
        }
        if (
          !isInternalGuardActive &&
          (qualifiedName === 'data-ad-status' || qualifiedName === 'data-adsbygoogle-status')
        ) {
          isInternalGuardActive = true;
          try {
            if (
              (cascadeStatusRef.current === 'FALLBACK_ACTIVE' ||
                cascadeStatusRef.current === 'CLICKED') &&
              qualifiedName === 'data-adsbygoogle-status' &&
              value === 'done' &&
              this.getAttribute('data-ad-status') !== 'unfilled'
            ) {
              discardLateFilledResponse();
            } else {
              evaluateInsStatus();
            }
          } finally {
            isInternalGuardActive = false;
          }
        }
      };

      targetIns.removeAttribute = function (qualifiedName: string) {
        nativeRemoveAttribute.call(this, qualifiedName);
        if (this !== insRef.current && insRef.current) {
          nativeRemoveAttribute.call(insRef.current, qualifiedName);
        }
        if (
          !isInternalGuardActive &&
          (qualifiedName === 'data-ad-status' || qualifiedName === 'data-adsbygoogle-status')
        ) {
          if (
            !this.getAttribute('data-ad-status') &&
            !this.getAttribute('data-adsbygoogle-status')
          ) {
            cascadeStatusRef.current = 'REQUESTED';
            explicitlyFilledRef.current = false;
            setCascadeStatus('REQUESTED');
            setLateFillDiscarded(false);
            setIsAdLoaded(false);
          }
        }
      };

      targetIns.appendChild = function <T extends Node>(newChild: T): T {
        if (
          !isInternalGuardActive &&
          (cascadeStatusRef.current === 'FALLBACK_ACTIVE' ||
            cascadeStatusRef.current === 'CLICKED')
        ) {
          isInternalGuardActive = true;
          try {
            discardLateFilledResponse();
          } finally {
            isInternalGuardActive = false;
          }
          return newChild;
        }
        const targetHost = insRef.current ?? this;
        const appended = nativeAppendChild.call(targetHost, newChild) as T;
        if (!isInternalGuardActive) {
          isInternalGuardActive = true;
          try {
            evaluateInsStatus();
          } finally {
            isInternalGuardActive = false;
          }
        }
        return appended;
      };

      targetIns.insertBefore = function <T extends Node>(
        newNode: T,
        referenceNode: Node | null
      ): T {
        if (
          !isInternalGuardActive &&
          (cascadeStatusRef.current === 'FALLBACK_ACTIVE' ||
            cascadeStatusRef.current === 'CLICKED')
        ) {
          isInternalGuardActive = true;
          try {
            discardLateFilledResponse();
          } finally {
            isInternalGuardActive = false;
          }
          return newNode;
        }
        const targetHost = insRef.current ?? this;
        const inserted = nativeInsertBefore.call(targetHost, newNode, referenceNode) as T;
        if (!isInternalGuardActive) {
          isInternalGuardActive = true;
          try {
            evaluateInsStatus();
          } finally {
            isInternalGuardActive = false;
          }
        }
        return inserted;
      };

      if (typeof nativeReplaceWith === 'function') {
        targetIns.replaceWith = function (...nodes: Array<Node | string>) {
          if (
            !isInternalGuardActive &&
            (cascadeStatusRef.current === 'FALLBACK_ACTIVE' ||
              cascadeStatusRef.current === 'CLICKED')
          ) {
            isInternalGuardActive = true;
            try {
              for (const n of nodes) {
                if (n instanceof HTMLElement && nativeInnerHTMLDescriptor?.set) {
                  nativeInnerHTMLDescriptor.set.call(n, '');
                }
              }
              discardLateFilledResponse();
            } finally {
              isInternalGuardActive = false;
            }
            return;
          }
          const replacementEl = nodes.find((n): n is HTMLElement => n instanceof HTMLElement);
          if (replacementEl) {
            bindInsInterceptors(replacementEl);
            observer?.observe(replacementEl, {
              attributes: true,
              attributeFilter: ['data-adsbygoogle-status', 'data-ad-status'],
              childList: true,
            });
            syncFromReplacementIns(replacementEl);
            if (!isInternalGuardActive) {
              isInternalGuardActive = true;
              try {
                evaluateInsStatus();
              } finally {
                isInternalGuardActive = false;
              }
            }
          }
        };
      }

      if (
        nativeInnerHTMLDescriptor &&
        typeof nativeInnerHTMLDescriptor.get === 'function' &&
        typeof nativeInnerHTMLDescriptor.set === 'function'
      ) {
        Object.defineProperty(targetIns, 'innerHTML', {
          configurable: true,
          enumerable: true,
          get() {
            return nativeInnerHTMLDescriptor.get!.call(this);
          },
          set(htmlValue: string) {
            if (
              !isInternalGuardActive &&
              (cascadeStatusRef.current === 'FALLBACK_ACTIVE' ||
                cascadeStatusRef.current === 'CLICKED') &&
              htmlValue !== ''
            ) {
              isInternalGuardActive = true;
              try {
                nativeInnerHTMLDescriptor.set!.call(this, '');
                if (this !== insRef.current && insRef.current) {
                  nativeInnerHTMLDescriptor.set!.call(insRef.current, '');
                }
                discardLateFilledResponse();
              } finally {
                isInternalGuardActive = false;
              }
              return;
            }
            nativeInnerHTMLDescriptor.set!.call(this, htmlValue);
            if (this !== insRef.current && insRef.current) {
              nativeInnerHTMLDescriptor.set!.call(insRef.current, htmlValue);
            }
            if (!isInternalGuardActive && htmlValue !== '') {
              isInternalGuardActive = true;
              try {
                evaluateInsStatus();
              } finally {
                isInternalGuardActive = false;
              }
            }
          },
        });
      }
    };

    bindInsInterceptors(initialInsEl);

    if (parentEl) {
      parentEl.replaceChild = function <T extends Node>(newChild: Node, oldChild: T): T {
        const oldNode = oldChild as unknown as Node;
        if (
          oldNode === insRef.current ||
          patchedInsElements.has(oldNode as HTMLElement)
        ) {
          if (
            !isInternalGuardActive &&
            (cascadeStatusRef.current === 'FALLBACK_ACTIVE' ||
              cascadeStatusRef.current === 'CLICKED')
          ) {
            isInternalGuardActive = true;
            try {
              if (newChild instanceof HTMLElement && nativeInnerHTMLDescriptor?.set) {
                nativeInnerHTMLDescriptor.set.call(newChild, '');
              }
              discardLateFilledResponse();
            } finally {
              isInternalGuardActive = false;
            }
            return oldChild;
          }

          if (newChild instanceof HTMLElement) {
            bindInsInterceptors(newChild);
            observer?.observe(newChild, {
              attributes: true,
              attributeFilter: ['data-adsbygoogle-status', 'data-ad-status'],
              childList: true,
            });
            syncFromReplacementIns(newChild);
            if (!isInternalGuardActive) {
              isInternalGuardActive = true;
              try {
                evaluateInsStatus();
              } finally {
                isInternalGuardActive = false;
              }
            }
          }
          return oldChild;
        }
        return nativeReplaceChild.call(this, newChild, oldChild) as T;
      };
    }

    evaluateInsStatus();

    if (
      isPushedRef.current &&
      cascadeStatusRef.current === 'REQUESTED' &&
      !explicitlyFilledRef.current &&
      cascadeTimeoutRef.current === null
    ) {
      startCascadeTimeout(cascadeRemainingMsRef.current);
    }

    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) {
        if (cascadeTimeoutRef.current !== null) {
          const elapsed =
            cascadeTimerStartedAtRef.current !== null
              ? Math.max(0, Date.now() - cascadeTimerStartedAtRef.current)
              : 0;
          cascadeRemainingMsRef.current = Math.max(
            1,
            cascadeRemainingMsRef.current - elapsed
          );
          clearCascadeTimeout();
        }
      } else if (
        isPushedRef.current &&
        cascadeStatusRef.current === 'REQUESTED' &&
        !explicitlyFilledRef.current &&
        cascadeTimeoutRef.current === null
      ) {
        startCascadeTimeout(cascadeRemainingMsRef.current);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    if (typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(evaluateInsStatus);
      observer.observe(initialInsEl, {
        attributes: true,
        attributeFilter: ['data-adsbygoogle-status', 'data-ad-status'],
        childList: true,
      });
    }

    return () => {
      observer?.disconnect();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      clearCascadeTimeout();
      if (parentEl) {
        delete (parentEl as Partial<HTMLElement>).replaceChild;
      }
      for (const el of patchedInsElements) {
        delete (el as Partial<HTMLElement>).setAttribute;
        delete (el as Partial<HTMLElement>).removeAttribute;
        delete (el as Partial<HTMLElement>).appendChild;
        delete (el as Partial<HTMLElement>).insertBefore;
        delete (el as Partial<HTMLElement>).replaceWith;
        delete (el as Partial<HTMLElement>).innerHTML;
      }
    };
  }, [
    isPlaceholder,
    isAdBlockActive,
    effectiveRefreshKey,
    insRef,
    isPushedRef,
    cascadeStatusRef,
    explicitlyFilledRef,
    cascadeTimeoutRef,
    cascadeRemainingMsRef,
    cascadeTimerStartedAtRef,
    setCascadeStatus,
    setIsAdLoaded,
    setLateFillDiscarded,
    activateCascadeFallback,
    clearCascadeTimeout,
    discardLateFilledResponse,
    startCascadeTimeout,
  ]);
}
