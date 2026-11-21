'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePWA } from './PWAProvider';
import { useAuth } from '@/hooks/useAuth';
import {
  ensureGuestFavoriteSaved,
  buildGuestFavoritesHandoffUrl,
} from '@/hooks/useFavorites';
import { logger } from '@/lib/services/logger';
import { trackEvent } from '@/lib/utils/analytics';
import { getDisplayAptName, resolveCanonicalAptSlug } from '@/lib/utils/apartmentMapping';
import { CANONICAL_DONG_APT_LIST } from '@/lib/utils/canonicalAptCatalog';
import { acquireBodyScrollLock, isAppleTouchDevice } from '@/lib/utils/bodyScrollLock';
import {
  X,
  BellRing,
  BellOff,
  ShieldCheck,
  AlertTriangle,
  Smartphone,
  ExternalLink,
  Copy,
  Check,
  Send,
} from 'lucide-react';

export type NotificationScope = 'all_plus_complex' | 'all_only' | 'complex_only';

export interface PushInAppEnvironment {
  isInApp: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  appName: 'kakaotalk' | 'naver' | 'line' | 'instagram' | 'facebook' | 'twitter' | 'other' | null;
  canOpenExternalDirectly: boolean;
  externalBrowserLabel: string;
}

export function detectPushInAppEnvironment(
  userAgent?: string | null,
  maxTouchPoints?: number | null
): PushInAppEnvironment {
  const ua = String(userAgent || '');
  const lower = ua.toLowerCase();
  const isIOS = isAppleTouchDevice(ua, maxTouchPoints);
  const isAndroid = /android/i.test(lower);

  const isKakao = /kakaotalk/i.test(lower);
  const isNaver = /naver/i.test(lower);
  const isLine = /line\//i.test(lower);
  const isInstagram = /instagram/i.test(lower);
  const isFacebook = /fb_iab|fb4a|fban|fbios/i.test(lower);
  const isTwitter = /twitter|twttr/i.test(lower);
  const isInApp = isKakao || isNaver || isLine || isInstagram || isFacebook || isTwitter;

  if (!isInApp) {
    return {
      isInApp: false,
      isIOS,
      isAndroid,
      appName: null,
      canOpenExternalDirectly: false,
      externalBrowserLabel: isIOS ? 'Safari에서 열기' : 'Chrome에서 열기',
    };
  }

  const appName: PushInAppEnvironment['appName'] = isKakao
    ? 'kakaotalk'
    : isNaver
      ? 'naver'
      : isLine
        ? 'line'
        : isInstagram
          ? 'instagram'
          : isFacebook
            ? 'facebook'
            : isTwitter
              ? 'twitter'
              : 'other';

  const canOpenExternalDirectly = Boolean(
    isAndroid || (isIOS && (appName === 'kakaotalk' || appName === 'naver' || appName === 'line'))
  );

  return {
    isInApp: true,
    isIOS,
    isAndroid,
    appName,
    canOpenExternalDirectly,
    externalBrowserLabel: isIOS ? 'Safari에서 열기' : 'Chrome에서 열기',
  };
}

export function buildInAppExternalBrowserUrl(
  currentUrl: string,
  env: PushInAppEnvironment,
  extraFavoriteSlugs?: ReadonlyArray<string | null | undefined>
): string | null {
  if (!env.isInApp || !env.canOpenExternalDirectly || !currentUrl) return null;
  const handoffUrl = buildGuestFavoritesHandoffUrl(currentUrl, extraFavoriteSlugs);
  if (!handoffUrl) return null;
  if (env.isAndroid) {
    const withoutScheme = handoffUrl.replace(/^https?:\/\//i, '');
    const hashIdx = withoutScheme.indexOf('#');
    const rawHostPathQuery = hashIdx >= 0 ? withoutScheme.slice(0, hashIdx) : withoutScheme;
    return `intent://${rawHostPathQuery}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(handoffUrl)};end`;
  }
  if (env.isIOS) {
    if (env.appName === 'kakaotalk') {
      return `kakaotalk://web/openExternal?url=${encodeURIComponent(handoffUrl)}`;
    }
    if (env.appName === 'naver') {
      return `naversearchapp://default?version=1&command=showURL&url=${encodeURIComponent(handoffUrl)}`;
    }
    if (env.appName === 'line') {
      try {
        const lineParsed = new URL(handoffUrl, 'https://dongtanview.com');
        lineParsed.searchParams.set('openExternalBrowser', '1');
        return lineParsed.toString();
      } catch {
        return null;
      }
    }
  }
  return null;
}

interface PushSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  aptName: string;
  canonicalSlug?: string;
  dong?: string;
  guideSlug?: string;
}

const GLOBAL_SCOPE_NAME = '동탄 전체';

function resolveReadableAptLabel(rawName: string): string {
  const trimmed = (rawName || '').trim();
  if (!trimmed || trimmed === GLOBAL_SCOPE_NAME || trimmed === '동탄 전역') {
    return GLOBAL_SCOPE_NAME;
  }
  const canonical = resolveCanonicalAptSlug(trimmed) || trimmed;
  const catalogEntry = CANONICAL_DONG_APT_LIST.find(
    (entry) => entry.txKey === canonical || entry.rawTxKey === trimmed || entry.name === trimmed
  );
  return catalogEntry?.name || getDisplayAptName(trimmed) || trimmed;
}

const PushSubscriptionModal = React.memo(function PushSubscriptionModal({
  isOpen,
  onClose,
  aptName,
  canonicalSlug,
  dong,
  guideSlug,
}: PushSubscriptionModalProps) {
  const { user } = useAuth();
  const {
    subscribeToPush,
    unsubscribeFromPush,
    pushSubscription,
    showToast,
    isPushSupported,
    isIOS,
    isStandalone,
    triggerCustomA2HSModal,
  } = usePWA();
  const inAppEnv = detectPushInAppEnvironment(
    typeof navigator !== 'undefined' ? navigator.userAgent : '',
    typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0
  );
  const isIosBrowserNeedsA2hs = Boolean(
    !inAppEnv.isInApp && isIOS && !isPushSupported && !isStandalone
  );

  const normalizedPropApt = (aptName || '').trim();
  const isSpecificApt = Boolean(
    normalizedPropApt &&
      normalizedPropApt !== GLOBAL_SCOPE_NAME &&
      normalizedPropApt !== '동탄 전역'
  );

  const [selectedScope, setSelectedScope] = useState<NotificationScope>(
    isSpecificApt ? 'all_plus_complex' : 'all_only'
  );
  const [submitting, setSubmitting] = useState(false);
  const [unsubscribing, setUnsubscribing] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [subscribedApts, setSubscribedApts] = useState<string[]>([]);
  const [errorState, setErrorState] = useState<'denied' | 'unsupported' | 'config' | 'failed' | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [mounted, setMounted] = useState(false);
  const mountedRef = useRef(true);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      setMounted(false);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setErrorState(null);
    setCopiedUrl(false);
    setTestFeedback(null);
    setSelectedScope(isSpecificApt ? 'all_plus_complex' : 'all_only');
    return acquireBodyScrollLock();
  }, [isOpen, isSpecificApt, aptName]);

  // Fetch currently subscribed targets for this device when already subscribed
  useEffect(() => {
    if (!isOpen || !pushSubscription?.endpoint || typeof fetch !== 'function') {
      setSubscribedApts([]);
      return;
    }

    let cancelled = false;
    const loadSubscribedApts = async () => {
      try {
        const res = await fetch(
          `/api/push/subscribe?endpoint=${encodeURIComponent(pushSubscription.endpoint)}`
        );
        if (!res || !res.ok) return;
        const json = await res.json();
        const rawList = Array.isArray(json?.data?.apts)
          ? json.data.apts
          : Array.isArray(json?.apts)
            ? json.apts
            : [];
        if (!cancelled && mountedRef.current) {
          setSubscribedApts(rawList.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0));
        }
      } catch {
        // Non-blocking: device remains manageable via 1-Click unsubscribe even if lookup fails
      }
    };

    void loadSubscribedApts();
    return () => {
      cancelled = true;
    };
  }, [isOpen, pushSubscription?.endpoint]);

  // Focus and Escape key management
  useEffect(() => {
    if (isOpen && mounted) {
      const timer = setTimeout(() => {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        }
      }, 50);

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleEscape);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, mounted, onClose]);

  if (!isOpen || !mounted) return null;

  const trimmedCanonical = canonicalSlug?.trim() || '';
  const subscriptionTarget = isSpecificApt ? trimmedCanonical || normalizedPropApt : GLOBAL_SCOPE_NAME;
  const resolvedCanonicalApt =
    trimmedCanonical ||
    (isSpecificApt
      ? resolveCanonicalAptSlug(normalizedPropApt, { dong }) || normalizedPropApt
      : GLOBAL_SCOPE_NAME);
  const displayComplexName = isSpecificApt ? normalizedPropApt : GLOBAL_SCOPE_NAME;

  const extraHandoffList =
    isSpecificApt && resolvedCanonicalApt && resolvedCanonicalApt !== GLOBAL_SCOPE_NAME
      ? [resolvedCanonicalApt]
      : undefined;
  const currentHref = typeof window !== 'undefined' ? window.location.href : '';
  const externalBrowserTargetUrl = buildInAppExternalBrowserUrl(
    currentHref,
    inAppEnv,
    extraHandoffList
  );

  const handleInAppOpenExternal = () => {
    const autoSavedWatchlist = isSpecificApt ? ensureGuestFavoriteSaved(resolvedCanonicalApt) : false;
    const liveHref = typeof window !== 'undefined' ? window.location.href : currentHref;
    const freshExternalTargetUrl =
      buildInAppExternalBrowserUrl(liveHref, inAppEnv, extraHandoffList) ||
      externalBrowserTargetUrl;

    trackEvent('inapp_external_browser_bridge', {
      surface: 'push_subscription_modal',
      trigger: inAppEnv.isIOS ? 'ios_inapp_push_bridge' : 'android_inapp_push_bridge',
      apt_name: aptName,
      apartment_name: resolvedCanonicalApt,
      in_app_name: inAppEnv.appName || 'other',
      auto_saved_watchlist: autoSavedWatchlist,
      ...(dong ? { dong } : {}),
      ...(guideSlug ? { guide_slug: guideSlug } : {}),
    });
    showToast(
      isSpecificApt
        ? `${displayComplexName} 관심단지 저장 완료 · ${inAppEnv.isIOS ? 'Safari' : 'Chrome'}에서 매일 오전 7시대 알림을 켜주세요`
        : `${inAppEnv.isIOS ? 'Safari' : 'Chrome'}에서 동탄 전체 실거래 알림을 켜주세요`
    );
    if (
      freshExternalTargetUrl &&
      typeof window !== 'undefined' &&
      !/jsdom/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '')
    ) {
      try {
        window.location.href = freshExternalTargetUrl;
      } catch (err) {
        logger.warn('PushSubscriptionModal.handleInAppOpenExternal', 'External browser deep link failed', undefined, err);
      }
    }
  };

  const handleInAppCopyUrl = async () => {
    const autoSavedWatchlist = isSpecificApt ? ensureGuestFavoriteSaved(resolvedCanonicalApt) : false;
    const baseUrl =
      typeof window !== 'undefined' && window.location.href
        ? window.location.href
        : isSpecificApt
          ? `https://dongtanview.com/apartment/${encodeURIComponent(resolvedCanonicalApt)}`
          : 'https://dongtanview.com';
    const targetUrl = buildGuestFavoritesHandoffUrl(baseUrl, extraHandoffList) || baseUrl;

    trackEvent('inapp_external_browser_bridge', {
      surface: 'push_subscription_modal',
      trigger: 'inapp_copy_url_bridge',
      apt_name: aptName,
      apartment_name: resolvedCanonicalApt,
      in_app_name: inAppEnv.appName || 'other',
      auto_saved_watchlist: autoSavedWatchlist,
      ...(dong ? { dong } : {}),
      ...(guideSlug ? { guide_slug: guideSlug } : {}),
    });

    let copiedViaClipboard = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(targetUrl);
        copiedViaClipboard = true;
      }
    } catch {
      // Clipboard fallback attempted below for restricted WebViews
    }

    if (!copiedViaClipboard && typeof document !== 'undefined' && document.body) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = targetUrl;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand?.('copy');
        document.body.removeChild(textArea);
      } catch {
        // Ignored safely in restricted WebViews
      }
    }

    if (mountedRef.current) {
      setCopiedUrl(true);
    }
    showToast(
      isSpecificApt
        ? `${displayComplexName} 관심단지 저장 및 주소 복사 완료 · ${inAppEnv.isIOS ? 'Safari' : 'Chrome'} 주소창에 붙여넣어 주세요`
        : `주소 복사 완료 · ${inAppEnv.isIOS ? 'Safari' : 'Chrome'} 주소창에 붙여넣어 주세요`
    );
  };

  const handleSubscribe = async () => {
    if (submitting) return;
    setSubmitting(true);
    setErrorState(null);
    setTestFeedback(null);
    try {
      const effectiveScope: NotificationScope = isSpecificApt ? selectedScope : 'all_only';
      let success = false;

      if (effectiveScope === 'all_plus_complex' && isSpecificApt) {
        success = await subscribeToPush(user?.uid ?? null, subscriptionTarget, {
          extraAptNames: [GLOBAL_SCOPE_NAME],
        });
      } else if (effectiveScope === 'all_only') {
        success = await subscribeToPush(user?.uid ?? null, GLOBAL_SCOPE_NAME, {
          includeGuestFavorites: false,
        });
      } else {
        success = await subscribeToPush(user?.uid ?? null, subscriptionTarget);
      }

      if (success && mountedRef.current) {
        const shouldSaveFavorite = isSpecificApt && effectiveScope !== 'all_only';
        const autoSavedWatchlist = shouldSaveFavorite ? ensureGuestFavoriteSaved(resolvedCanonicalApt) : false;
        trackEvent('push_subscribe_success', {
          surface: 'push_subscription_modal',
          trigger: 'modal_submit_cta',
          apt_name: effectiveScope === 'all_only' ? GLOBAL_SCOPE_NAME : aptName,
          apartment_name: effectiveScope === 'all_only' ? GLOBAL_SCOPE_NAME : resolvedCanonicalApt,
          notification_scope: effectiveScope,
          auto_saved_watchlist: autoSavedWatchlist,
          ...(dong ? { dong } : {}),
          ...(guideSlug ? { guide_slug: guideSlug } : {}),
        });

        const scopeLabel =
          effectiveScope === 'all_plus_complex'
            ? `동탄 전체 + ${displayComplexName}`
            : effectiveScope === 'all_only'
              ? '동탄 전체 주요 실거래'
              : displayComplexName;

        showToast(
          `${scopeLabel} 알림 신청이 완료되었습니다.${autoSavedWatchlist ? ' (관심단지 저장됨)' : ''}`
        );
        onClose();
      } else if (!success && mountedRef.current) {
        const isPermissionDenied =
          typeof window !== 'undefined' &&
          typeof Notification !== 'undefined' &&
          Notification.permission === 'denied';
        setErrorState(isPermissionDenied ? 'denied' : 'failed');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error('PushSubscriptionModal.handleSubscribe', 'Subscription error in modal', undefined, err as Error);
      if (mountedRef.current) {
        if (errorMsg === 'PERMISSION_DENIED') {
          setErrorState('denied');
        } else if (errorMsg === 'UNSUPPORTED_BROWSER') {
          setErrorState('unsupported');
        } else if (errorMsg === 'VAPID_NOT_CONFIGURED') {
          setErrorState('config');
        } else {
          setErrorState('failed');
        }
      }
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  const handleUnsubscribeAll = async () => {
    if (unsubscribing || !pushSubscription) return;
    setUnsubscribing(true);
    setTestFeedback(null);
    try {
      const ok = await unsubscribeFromPush(null);
      if (ok && mountedRef.current) {
        setSubscribedApts([]);
        trackEvent('push_unsubscribe_all', {
          surface: 'push_subscription_modal',
          apt_name: aptName,
        });
      }
    } finally {
      if (mountedRef.current) {
        setUnsubscribing(false);
      }
    }
  };

  const handleRemoveSingleTarget = async (targetApt: string) => {
    if (unsubscribing || !pushSubscription) return;
    setUnsubscribing(true);
    try {
      if (subscribedApts.length <= 1) {
        const ok = await unsubscribeFromPush(null);
        if (ok && mountedRef.current) {
          setSubscribedApts([]);
        }
      } else {
        const ok = await unsubscribeFromPush(targetApt);
        if (ok && mountedRef.current) {
          setSubscribedApts((prev) => prev.filter((item) => item !== targetApt));
        }
      }
    } finally {
      if (mountedRef.current) {
        setUnsubscribing(false);
      }
    }
  };

  const handleSendTestPush = async () => {
    if (sendingTest || !pushSubscription) return;
    setSendingTest(true);
    setTestFeedback(null);
    try {
      const subPayload =
        typeof pushSubscription.toJSON === 'function'
          ? pushSubscription.toJSON()
          : {
              endpoint: pushSubscription.endpoint,
              keys: (pushSubscription as unknown as { keys?: { p256dh?: string; auth?: string } }).keys,
            };

      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subPayload }),
      });
      const json = await res.json().catch(() => ({}));
      if (!mountedRef.current) return;

      if (res.ok && json?.success) {
        const msg = '테스트 알림을 보냈습니다. 브라우저·기기 알림창을 확인해 주세요.';
        setTestFeedback({ type: 'success', message: msg });
        showToast(msg);
      } else {
        const errMsg =
          json?.error ||
          json?.message ||
          '테스트 알림 발송에 실패했습니다. 알림을 껐다가 다시 신청해 주세요.';
        setTestFeedback({ type: 'error', message: errMsg });
      }
    } catch {
      if (mountedRef.current) {
        setTestFeedback({
          type: 'error',
          message: '네트워크 오류로 테스트 알림을 보내지 못했습니다.',
        });
      }
    } finally {
      if (mountedRef.current) {
        setSendingTest(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length === 0) return;
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }
  };

  const scopeOptions: Array<{
    id: NotificationScope;
    testId: string;
    label: string;
    badge?: string;
    desc: string;
  }> = isSpecificApt
    ? [
        {
          id: 'all_plus_complex',
          testId: 'push-scope-all-plus-complex',
          label: `동탄 전체 + ${displayComplexName}`,
          badge: '추천',
          desc: '동탄 주요 매매 요약과 이 단지 신규 거래를 함께 받아요',
        },
        {
          id: 'all_only',
          testId: 'push-scope-all-only',
          label: '동탄 전체 주요 실거래만',
          desc: '오늘 동탄 매매 건수·신고가·최고가 요약만 받아요',
        },
        {
          id: 'complex_only',
          testId: 'push-scope-complex-only',
          label: `${displayComplexName}만 받기`,
          desc: '이 단지에 신규 매매가 등록될 때만 받아요',
        },
      ]
    : [];

  const scopeDetailBullet =
    !isSpecificApt || selectedScope === 'all_only'
      ? '오늘 동탄 전체 매매 건수·신고가·최고가 주요 거래 요약 안내'
      : selectedScope === 'all_plus_complex'
        ? `동탄 전체 매매 건수·신고가 요약 + ${displayComplexName} 신규 매매 함께 안내`
        : `${displayComplexName} 신규 매매 실거래 및 신고가 등록 안내`;

  return createPortal(
    <>
      {/* Backdrop */}
      <button
        type="button"
        data-scroll-interactive="true"
        className="fixed inset-0 bg-black/45 z-[11000] backdrop-blur-sm transition-opacity border-none cursor-default"
        onClick={onClose}
        aria-label="알림 구독 창 닫기"
      />

      {/* Bottom Sheet / Popover Modal */}
      <div
        ref={modalRef}
        data-scroll-interactive="true"
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="push-title"
        aria-describedby="push-desc"
        className="fixed bottom-0 left-0 right-0 z-[11001] bg-surface rounded-t-[32px] shadow-[0_-12px_40px_rgba(0,0,0,0.12)] transform transition-transform duration-300 ease-out max-w-lg mx-auto border-t border-border/40 max-h-[90dvh] overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom,0px)+24px)] animate-in slide-in-from-bottom duration-300"
      >
        <div className="px-6 pt-6 pb-2">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 dview-spark-badge rounded-2xl flex items-center justify-center text-white shrink-0">
                <BellRing size={20} strokeWidth={2.4} />
              </div>
              <div className="min-w-0">
                <h3 id="push-title" className="text-[17px] font-black text-primary truncate">
                  {isSpecificApt ? '동탄 실거래가 알림 설정' : '동탄 전체 실거래가 알림'}
                </h3>
                <p id="push-desc" className="text-[12px] font-semibold text-secondary mt-0.5 tabular-nums">
                  로그인 없이 신청 · 매일 오전 7시대 국토부 매매 요약
                </p>
              </div>
            </div>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="p-2 text-tertiary hover:text-secondary hover:bg-body rounded-full transition-colors cursor-pointer shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40"
              aria-label="닫기"
            >
              <X size={20} />
            </button>
          </div>

          {/* Active Subscription Management Card (1-Click Unsubscribe + Live Test Push) */}
          {pushSubscription && !inAppEnv.isInApp && (
            <div
              data-testid="push-active-subscription-card"
              className="bg-[#f7f8fa] dark:bg-[#151a23] rounded-2xl p-3.5 mb-4 text-left"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-[#eff1f5] dark:bg-[#1e2532] text-primary inline-flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={2.8} />
                  </span>
                  <span className="text-[12.5px] font-extrabold text-primary truncate">
                    이 기기에서 실거래 알림을 받고 있어요
                  </span>
                </div>
              </div>

              {subscribedApts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {subscribedApts.map((item) => {
                    const chipLabel = resolveReadableAptLabel(item);
                    return (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] bg-surface dark:bg-[#1e2532] text-[11.5px] font-bold text-secondary"
                      >
                        <span>{chipLabel}</span>
                        <button
                          type="button"
                          onClick={() => void handleRemoveSingleTarget(item)}
                          disabled={unsubscribing}
                          aria-label={`${chipLabel} 알림 해제`}
                          className="text-tertiary hover:text-primary cursor-pointer p-0.5 -mr-0.5 rounded transition-colors"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="push-send-test-btn"
                  onClick={() => void handleSendTestPush()}
                  disabled={sendingTest || unsubscribing}
                  className="flex-1 h-9 px-3 rounded-[10px] bg-surface hover:bg-[#eff1f5] dark:bg-[#1e2532] dark:hover:bg-[#252c3d] text-primary text-[12px] font-extrabold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send size={12.5} className="shrink-0" />
                  <span>{sendingTest ? '발송 중...' : '테스트 알림 받기'}</span>
                </button>
                <button
                  type="button"
                  data-testid="push-unsubscribe-all-btn"
                  onClick={() => void handleUnsubscribeAll()}
                  disabled={unsubscribing || sendingTest}
                  className="h-9 px-3.5 rounded-[10px] bg-surface hover:bg-brand-red-light dark:bg-[#1e2532] text-secondary hover:text-brand-red text-[12px] font-extrabold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <BellOff size={12.5} className="shrink-0" />
                  <span>{unsubscribing ? '해제 중...' : '알림 끄기'}</span>
                </button>
              </div>

              {testFeedback && (
                <p
                  data-testid="push-test-feedback"
                  className={`mt-2 text-[11.5px] font-bold leading-snug ${
                    testFeedback.type === 'success'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-brand-red'
                  }`}
                >
                  {testFeedback.message}
                </p>
              )}
            </div>
          )}

          {/* Selectable Notification Scope (when opened from a specific apartment context) */}
          {isSpecificApt && !inAppEnv.isInApp && (
            <div className="mb-4" role="radiogroup" aria-label="알림 받을 범위 선택">
              <p className="text-[11.5px] font-extrabold text-tertiary mb-2">알림 받을 범위</p>
              <div className="space-y-1.5">
                {scopeOptions.map((option) => {
                  const isActive = selectedScope === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      data-testid={option.testId}
                      onClick={() => setSelectedScope(option.id)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-2xl transition-colors cursor-pointer flex items-start gap-2.5 ${
                        isActive
                          ? 'bg-[#eff1f5] dark:bg-[#1e2532] ring-1 ring-inset ring-slate-900/20 dark:ring-white/25'
                          : 'bg-[#f7f8fa] hover:bg-[#eff1f5] dark:bg-[#151a23] dark:hover:bg-[#1e2532]'
                      }`}
                    >
                      <span
                        className={`mt-0.5 w-4 h-4 rounded-full inline-flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                            : 'bg-surface dark:bg-[#252c3d] ring-1 ring-inset ring-slate-300 dark:ring-slate-600'
                        }`}
                        aria-hidden="true"
                      >
                        {isActive && <Check size={10} strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[13px] font-extrabold leading-tight break-keep text-primary">
                            {option.label}
                          </span>
                          {option.badge && (
                            <span className="px-1.5 py-0.5 rounded-[6px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-extrabold">
                              {option.badge}
                            </span>
                          )}
                        </span>
                        <span className="block text-[11.5px] font-semibold text-secondary mt-0.5 leading-snug">
                          {option.desc}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Honest Delivery Guide Banner */}
          <div className="bg-[#f7f8fa] dark:bg-[#151a23] rounded-2xl p-4 text-left mb-5 relative overflow-hidden">
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#eff1f5] dark:bg-[#1e2532] text-[11.5px] font-extrabold text-primary tabular-nums">
                매일 오전 7시대 요약
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#eff1f5] dark:bg-[#1e2532] text-[11px] font-extrabold text-secondary">
                로그인 불필요
              </span>
            </div>

            <ul className="space-y-2 text-[12.5px] text-secondary font-semibold tabular-nums">
              <li className="flex items-start gap-2">
                <ShieldCheck size={15} className="text-primary shrink-0 mt-0.5" />
                <span className="leading-snug">
                  국토부 새벽 수집 후 <strong>매일 오전 7시대(KST)</strong> 매매 실거래 요약 발송
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck size={15} className="text-primary shrink-0 mt-0.5" />
                <span className="leading-snug">{scopeDetailBullet}</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck size={15} className="text-primary shrink-0 mt-0.5" />
                <span className="leading-snug">
                  회원가입 없이 바로 신청하고 이 창에서 언제든 알림 끄기 가능
                </span>
              </li>
            </ul>
          </div>

          {inAppEnv.isInApp ? (
            <div
              data-testid="push-inapp-browser-bridge"
              className="bg-[#f7f8fa] dark:bg-[#151a23] border border-border/80 rounded-2xl p-4 mb-6 text-left space-y-2"
            >
              <p className="text-[13px] font-extrabold text-primary flex items-center gap-1.5">
                <ExternalLink size={15} className="shrink-0" />
                <span>
                  {inAppEnv.isIOS
                    ? '인앱 브라우저 접속 중 · Safari 전환 안내'
                    : '인앱 브라우저 접속 중 · Chrome 전환 안내'}
                </span>
              </p>
              <p className="text-[12px] text-secondary font-bold leading-relaxed">
                {inAppEnv.isIOS
                  ? '카카오톡·네이버 등 인앱 화면에서는 홈 화면 추가와 매일 오전 7시대 웹 푸시가 제한됩니다. Safari로 열면 방금 찜한 관심단지가 그대로 이어지며 바로 설정할 수 있습니다.'
                  : '인앱 화면에서는 앱 종료 시 매일 오전 7시대 실거래 알림 수신이 차단될 수 있습니다. Chrome으로 열면 찜한 관심단지가 그대로 이어지며 안정적으로 알림을 받을 수 있습니다.'}
              </p>
              <div className="pt-1 flex items-center justify-end">
                <button
                  type="button"
                  data-testid="push-inapp-copy-url-btn"
                  onClick={() => void handleInAppCopyUrl()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] border border-border text-primary text-[11.5px] font-extrabold transition-colors cursor-pointer"
                >
                  <Copy size={12} className="shrink-0" />
                  <span>{copiedUrl ? '주소 복사됨' : '현재 페이지 URL 복사'}</span>
                </button>
              </div>
            </div>
          ) : errorState === 'denied' || (typeof window !== 'undefined' && typeof Notification !== 'undefined' && Notification.permission === 'denied') ? (
            <div className="bg-brand-red-light border border-brand-red/20 rounded-2xl p-4 mb-6 text-left">
              <p className="text-[13px] font-extrabold text-brand-red mb-1.5 flex items-center gap-1.5">
                <AlertTriangle size={15} className="shrink-0" />
                <span>알림 권한이 차단되어 있습니다</span>
              </p>
              <p className="text-[12px] text-secondary font-bold leading-relaxed">
                브라우저 설정에서 알림 권한이 거부되어 실거래가 소식을 보내드릴 수 없습니다. 아래 설정 방법을 참고해 허용해 주세요.
              </p>
              <div className="mt-3 pt-2.5 border-t border-brand-red/15 text-[11px] text-tertiary font-bold space-y-1">
                <p>• <strong>안드로이드/Chrome</strong>: 주소창 왼쪽 설정(조절기) 아이콘 클릭 -&gt; 권한 -&gt; 알림 허용</p>
                <p>• <strong>아이폰/Safari</strong>: 설정 -&gt; 알림 -&gt; DVIEW(또는 추가된 홈앱) -&gt; 알림 허용</p>
              </div>
            </div>
          ) : errorState === 'config' ? (
            <div className="bg-brand-red-light border border-brand-red/20 rounded-2xl p-4 mb-6 text-left">
              <p className="text-[13px] font-extrabold text-brand-red flex items-center gap-1.5">
                <AlertTriangle size={15} className="shrink-0" />
                <span>알림 서버 키가 아직 설정되지 않았습니다</span>
              </p>
              <p className="text-[12px] text-secondary font-bold mt-1 leading-relaxed">
                운영 서버에 Web Push VAPID 공개키가 등록되면 바로 알림을 신청할 수 있습니다.
              </p>
            </div>
          ) : errorState === 'failed' ? (
            <div className="bg-brand-red-light border border-brand-red/20 rounded-2xl p-4 mb-6 text-left">
              <p className="text-[13px] font-extrabold text-brand-red flex items-center gap-1.5">
                <AlertTriangle size={15} className="shrink-0" />
                <span>알림 등록 중 오류가 발생했습니다</span>
              </p>
              <p className="text-[12px] text-secondary font-bold mt-1 leading-relaxed">
                네트워크 연결이 일시적으로 끊겼거나 브라우저 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
              </p>
            </div>
          ) : isIosBrowserNeedsA2hs && errorState !== 'unsupported' ? (
            <div
              data-testid="push-ios-a2hs-bridge"
              className="bg-[#f7f8fa] dark:bg-[#151a23] border border-border/80 rounded-2xl p-4 mb-6 text-left"
            >
              <p className="text-[13px] font-extrabold text-primary mb-1 flex items-center gap-1.5">
                <Smartphone size={15} className="shrink-0" />
                <span>아이폰·아이패드 Safari 홈 화면 추가 안내</span>
              </p>
              <p className="text-[12px] text-secondary font-bold leading-relaxed">
                iOS Safari는 홈 화면에 앱 추가(1초) 완료 후 매일 오전 7시대 실거래 Web Push 알림이 활성화됩니다.
              </p>
            </div>
          ) : (!isPushSupported || errorState === 'unsupported') ? (
            <div className="bg-brand-red-light border border-brand-red/20 rounded-2xl p-4 mb-6 text-center">
              <p className="text-[12px] font-bold text-brand-red">
                ※ 현재 사용 중이신 브라우저는 Web Push 알림을 지원하지 않습니다. Chrome, Safari(iOS 16.4+), Edge 브라우저를 이용해 주세요.
              </p>
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 px-4 bg-[#f7f8fa] hover:bg-[#eff1f5] dark:bg-[#151a23] dark:hover:bg-[#1e2532] text-secondary font-bold rounded-2xl transition-colors text-[13.5px] cursor-pointer"
            >
              {pushSubscription ? '닫기' : '취소'}
            </button>
            {inAppEnv.isInApp ? (
              inAppEnv.canOpenExternalDirectly && externalBrowserTargetUrl ? (
                <button
                  type="button"
                  data-testid="push-inapp-open-external-btn"
                  data-external-href={externalBrowserTargetUrl}
                  onClick={handleInAppOpenExternal}
                  className="flex-1 py-3.5 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.98] transition-all text-[13.5px] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ExternalLink size={15} className="shrink-0" />
                  <span>{inAppEnv.externalBrowserLabel}</span>
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="push-inapp-primary-copy-btn"
                  onClick={() => void handleInAppCopyUrl()}
                  className="flex-1 py-3.5 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.98] transition-all text-[13.5px] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Copy size={15} className="shrink-0" />
                  <span>{copiedUrl ? '복사 완료 · 브라우저에 붙여넣기' : '링크 복사 후 외부 브라우저 열기'}</span>
                </button>
              )
            ) : isIosBrowserNeedsA2hs && errorState !== 'unsupported' ? (
              <button
                type="button"
                data-testid="push-ios-a2hs-btn"
                onClick={() => {
                  const autoSavedWatchlist = isSpecificApt ? ensureGuestFavoriteSaved(resolvedCanonicalApt) : false;
                  trackEvent('a2hs_modal_open', {
                    surface: 'push_subscription_modal',
                    trigger: 'ios_safari_push_bridge',
                    apt_name: aptName,
                    apartment_name: resolvedCanonicalApt,
                    auto_saved_watchlist: autoSavedWatchlist,
                    ...(dong ? { dong } : {}),
                    ...(guideSlug ? { guide_slug: guideSlug } : {}),
                  });
                  triggerCustomA2HSModal?.();
                  onClose();
                }}
                className="flex-1 py-3.5 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.98] transition-all text-[13.5px] cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Smartphone size={15} className="shrink-0" />
                <span>홈 화면 추가 후 알림 켜기</span>
              </button>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={!isPushSupported || submitting}
                className="flex-1 py-3.5 px-4 bg-slate-900 dark:bg-white disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 text-white dark:text-slate-900 font-black rounded-2xl hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.98] transition-all text-[13.5px] cursor-pointer flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  '실거래가 알림 신청하기'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.getElementById('modal-root') || document.body
  );
});

PushSubscriptionModal.displayName = 'PushSubscriptionModal';
export default PushSubscriptionModal;
