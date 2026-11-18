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
import { resolveCanonicalAptSlug } from '@/lib/utils/apartmentMapping';
import { acquireBodyScrollLock, isAppleTouchDevice } from '@/lib/utils/bodyScrollLock';
import { X, BellRing, Sparkles, ShieldCheck, AlertTriangle, Smartphone, ExternalLink, Copy } from 'lucide-react';

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

const PushSubscriptionModal = React.memo(function PushSubscriptionModal({
  isOpen,
  onClose,
  aptName,
  canonicalSlug,
  dong,
  guideSlug,
}: PushSubscriptionModalProps) {
  const { user } = useAuth();
  const { subscribeToPush, showToast, isPushSupported, isIOS, isStandalone, triggerCustomA2HSModal } = usePWA();
  const inAppEnv = detectPushInAppEnvironment(
    typeof navigator !== 'undefined' ? navigator.userAgent : '',
    typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0
  );
  const isIosBrowserNeedsA2hs = Boolean(
    !inAppEnv.isInApp && isIOS && !isPushSupported && !isStandalone
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [errorState, setErrorState] = React.useState<'denied' | 'unsupported' | 'failed' | null>(null);
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
    return acquireBodyScrollLock();
  }, [isOpen]);

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
  const subscriptionTarget = trimmedCanonical || aptName;
  const resolvedCanonicalApt =
    trimmedCanonical ||
    (aptName && aptName !== '동탄 전체' && aptName !== '동탄 전역'
      ? resolveCanonicalAptSlug(aptName, { dong }) || aptName
      : '동탄 전체');

  const extraHandoffList =
    resolvedCanonicalApt && resolvedCanonicalApt !== '동탄 전체'
      ? [resolvedCanonicalApt]
      : undefined;
  const currentHref = typeof window !== 'undefined' ? window.location.href : '';
  const externalBrowserTargetUrl = buildInAppExternalBrowserUrl(
    currentHref,
    inAppEnv,
    extraHandoffList
  );

  const handleInAppOpenExternal = () => {
    const autoSavedWatchlist = ensureGuestFavoriteSaved(resolvedCanonicalApt);
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
      `${aptName} 관심단지 저장 완료 · ${inAppEnv.isIOS ? 'Safari' : 'Chrome'}에서 평일 07시 알림을 켜주세요`
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
    const autoSavedWatchlist = ensureGuestFavoriteSaved(resolvedCanonicalApt);
    const baseUrl =
      typeof window !== 'undefined' && window.location.href
        ? window.location.href
        : `https://dongtanview.com/apartment/${encodeURIComponent(resolvedCanonicalApt)}`;
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
      `${aptName} 관심단지 저장 및 주소 복사 완료 · ${inAppEnv.isIOS ? 'Safari' : 'Chrome'} 주소창에 붙여넣어 주세요`
    );
  };

  const handleSubscribe = async () => {
    if (submitting) return;
    setSubmitting(true);
    setErrorState(null);
    try {
      const success = await subscribeToPush(user?.uid ?? null, subscriptionTarget);
      if (success && mountedRef.current) {
        const autoSavedWatchlist = ensureGuestFavoriteSaved(resolvedCanonicalApt);
        trackEvent('push_subscribe_success', {
          surface: 'push_subscription_modal',
          trigger: 'modal_submit_cta',
          apt_name: aptName,
          apartment_name: resolvedCanonicalApt,
          auto_saved_watchlist: autoSavedWatchlist,
          ...(dong ? { dong } : {}),
          ...(guideSlug ? { guide_slug: guideSlug } : {}),
        });
        showToast(
          `${aptName}의 실거래가 변동 알림 신청이 완료되었습니다.${autoSavedWatchlist ? ' (관심단지 자동 찜)' : ''}`
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

  return createPortal(
    <>
      {/* Backdrop */}
      <button 
        type="button"
        className="fixed inset-0 bg-black/45 z-[9999] backdrop-blur-sm transition-opacity border-none cursor-default"
        onClick={onClose}
        aria-label="알림 구독 창 닫기"
      />
      
      {/* Bottom Sheet / Popover Modal */}
      <div 
        ref={modalRef}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="push-title"
        aria-describedby="push-desc"
        className="fixed bottom-0 left-0 right-0 z-[10000] bg-surface rounded-t-[32px] shadow-[0_-12px_40px_rgba(0,0,0,0.12)] transform transition-transform duration-300 ease-out max-w-lg mx-auto border-t border-border/40 pb-[calc(env(safe-area-inset-bottom)+24px)] animate-in slide-in-from-bottom duration-300"
      >
        <div className="px-6 pt-6 pb-2">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <BellRing size={20} strokeWidth={2.4} />
              </div>
              <div className="min-w-0">
                <h3 id="push-title" className="text-[17px] font-black text-primary truncate">{aptName} 알림 신청</h3>
                <p id="push-desc" className="text-[12px] font-semibold text-secondary mt-0.5 tabular-nums">
                  비로그인 1초 신청 · 평일 07:00 KST 실거래 변동 배달
                </p>
              </div>
            </div>
            <button 
              ref={closeButtonRef}
              onClick={onClose}
              className="p-2 text-tertiary hover:text-secondary hover:bg-body rounded-full transition-colors cursor-pointer shrink-0"
              aria-label="닫기"
            >
              <X size={20} />
            </button>
          </div>

          {/* Lightweight Curation Value Props Banner */}
          <div className="bg-[#f9fafb] dark:bg-[#17171c] rounded-2xl p-4 text-left mb-5 relative overflow-hidden">
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              <span className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-lg text-[11.5px] font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                <Sparkles size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>평일 07:00 실거래 브리핑</span>
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300">
                로그인 불필요
              </span>
            </div>
            
            <ul className="space-y-2 text-[12.5px] text-secondary font-semibold tabular-nums">
              <li className="flex items-start gap-2">
                <ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-snug">새벽 동기화(05:38~06:38 KST) 직후 <strong>평일 07시</strong> 실거래 변동 즉시 알림</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-snug">신규 매매·전세 신고가 및 인접 대장 단지 갭(Gap) 요약 동시 포함</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-snug">회원가입·개인정보 입력 없이 내 기기 관심단지에 자동 저장 및 1-Click 해제</span>
              </li>
            </ul>
          </div>

          {inAppEnv.isInApp ? (
            <div
              data-testid="push-inapp-browser-bridge"
              className="bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/50 rounded-2xl p-4 mb-6 text-left space-y-2"
            >
              <p className="text-[13px] font-extrabold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <ExternalLink size={15} className="shrink-0" />
                <span>
                  {inAppEnv.isIOS
                    ? '인앱 브라우저 접속 중 · Safari 전환 안내'
                    : '인앱 브라우저 접속 중 · Chrome 전환 안내'}
                </span>
              </p>
              <p className="text-[12px] text-secondary font-bold leading-relaxed">
                {inAppEnv.isIOS
                  ? '카카오톡·네이버 등 인앱 화면에서는 홈 화면 추가와 오전 7시 웹 푸시가 제한됩니다. Safari로 열면 방금 찜한 관심단지가 그대로 이어지며 바로 설정할 수 있습니다.'
                  : '인앱 화면에서는 앱 종료 시 오전 7시 실거래 알림 수신이 차단될 수 있습니다. Chrome으로 열면 찜한 관심단지가 그대로 이어지며 안정적으로 알림을 받을 수 있습니다.'}
              </p>
              <div className="pt-1 flex items-center justify-end">
                <button
                  type="button"
                  data-testid="push-inapp-copy-url-btn"
                  onClick={() => void handleInAppCopyUrl()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-[11.5px] font-extrabold transition-colors cursor-pointer"
                >
                  <Copy size={12} className="shrink-0" />
                  <span>{copiedUrl ? '주소 복사됨' : '현재 페이지 URL 복사'}</span>
                </button>
              </div>
            </div>
          ) : errorState === 'denied' || (typeof window !== 'undefined' && typeof Notification !== 'undefined' && Notification.permission === 'denied') ? (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl p-4 mb-6 text-left">
              <p className="text-[13px] font-extrabold text-red-600 dark:text-red-400 mb-1.5 flex items-center gap-1.5">
                <AlertTriangle size={15} className="shrink-0" />
                <span>알림 권한이 차단되어 있습니다</span>
              </p>
              <p className="text-[12px] text-secondary font-bold leading-relaxed">
                브라우저 설정에서 알림 권한이 거부되어 실거래가 소식을 보내드릴 수 없습니다. 아래 설정 방법을 참고해 허용해 주세요.
              </p>
              <div className="mt-3 pt-2.5 border-t border-red-200/20 dark:border-red-800/30 text-[11px] text-tertiary font-bold space-y-1">
                <p>• <strong>안드로이드/Chrome</strong>: 주소창 왼쪽 설정(조절기) 아이콘 클릭 -&gt; 권한 -&gt; 알림 허용</p>
                <p>• <strong>아이폰/Safari</strong>: 설정 -&gt; 알림 -&gt; DVIEW(또는 추가된 홈앱) -&gt; 알림 허용</p>
              </div>
            </div>
          ) : errorState === 'failed' ? (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl p-4 mb-6 text-left">
              <p className="text-[13px] font-extrabold text-red-600 dark:text-red-400 flex items-center gap-1.5">
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
              className="bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/50 rounded-2xl p-4 mb-6 text-left"
            >
              <p className="text-[13px] font-extrabold text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1.5">
                <Smartphone size={15} className="shrink-0" />
                <span>아이폰·아이패드 Safari 홈 화면 추가 안내</span>
              </p>
              <p className="text-[12px] text-secondary font-bold leading-relaxed">
                iOS Safari는 홈 화면에 앱 추가(1초) 완료 후 오전 7시 실거래 Web Push 알림이 활성화됩니다.
              </p>
            </div>
          ) : (!isPushSupported || errorState === 'unsupported') ? (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl p-4 mb-6 text-center">
              <p className="text-[12px] font-bold text-red-600 dark:text-red-400">
                ※ 현재 사용 중이신 브라우저는 Web Push 알림을 지원하지 않습니다. Chrome, Safari(iOS 16.4+), Edge 브라우저를 이용해 주세요.
              </p>
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 px-4 bg-body hover:bg-slate-200 dark:hover:bg-slate-800 text-secondary font-bold rounded-2xl transition-colors text-[13.5px] cursor-pointer"
            >
              취소
            </button>
            {inAppEnv.isInApp ? (
              inAppEnv.canOpenExternalDirectly && externalBrowserTargetUrl ? (
                <button
                  type="button"
                  data-testid="push-inapp-open-external-btn"
                  data-external-href={externalBrowserTargetUrl}
                  onClick={handleInAppOpenExternal}
                  className="flex-1 py-3.5 px-4 bg-blue-600 dark:bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 dark:hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md text-[13.5px] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ExternalLink size={15} className="shrink-0" />
                  <span>{inAppEnv.externalBrowserLabel}</span>
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="push-inapp-primary-copy-btn"
                  onClick={() => void handleInAppCopyUrl()}
                  className="flex-1 py-3.5 px-4 bg-blue-600 dark:bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 dark:hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md text-[13.5px] cursor-pointer flex items-center justify-center gap-1.5"
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
                  const autoSavedWatchlist = ensureGuestFavoriteSaved(resolvedCanonicalApt);
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
                className="flex-1 py-3.5 px-4 bg-blue-600 dark:bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 dark:hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md text-[13.5px] cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Smartphone size={15} className="shrink-0" />
                <span>홈 화면 추가 후 알림 켜기</span>
              </button>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={!isPushSupported || submitting}
                className="flex-1 py-3.5 px-4 bg-blue-600 dark:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 text-white font-black rounded-2xl hover:bg-blue-700 dark:hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md text-[13.5px] cursor-pointer flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
