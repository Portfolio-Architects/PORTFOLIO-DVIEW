'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Copy, ExternalLink, Compass, X, AlertTriangle } from 'lucide-react';
import { logger } from '@/lib/services/logger';

/**
 * Non-blocking 48px Slim Top Banner for In-App Browsers (KakaoTalk, Naver, Instagram, Line, Facebook, X).
 * Guarantees 100% main content and AdSense slot visibility/interactivity inside WebViews (Invariant 4).
 * Strictly adheres to DESIGN.md Slate/Emerald/Blue palette with zero blocking overlays.
 */
const InAppBrowserBypass = React.memo(function InAppBrowserBypass() {
  const [inAppInfo, setInAppInfo] = useState<{
    isInApp: boolean;
    isAndroid: boolean;
    isIOS: boolean;
    appName: string;
    canAutoRedirect: boolean;
  }>({
    isInApp: false,
    isAndroid: false,
    isIOS: false,
    appName: '',
    canAutoRedirect: false,
  });

  const [showBanner, setShowBanner] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [redirectFailed, setRedirectFailed] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const visibilityListenerRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  const removeVisibilityListener = () => {
    if (visibilityListenerRef.current) {
      document.removeEventListener('visibilitychange', visibilityListenerRef.current);
      visibilityListenerRef.current = null;
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
      removeVisibilityListener();
    };
  }, []);

  const safeBypassRedirect = (url: string) => {
    const start = Date.now();
    let hasRedirected = false;

    removeVisibilityListener();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hasRedirected = true;
      }
    };

    visibilityListenerRef.current = handleVisibilityChange;
    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
    redirectTimeoutRef.current = setTimeout(() => {
      if (visibilityListenerRef.current === handleVisibilityChange) {
        removeVisibilityListener();
      }
      if (!hasRedirected && Date.now() - start < 2000) {
        logger.warn('InAppBrowserBypass.safeBypassRedirect', 'Deep link redirect failed or app not installed');
        if (mountedRef.current) {
          setRedirectFailed(true);
        }
      }
    }, 1500);

    try {
      window.location.href = url;
    } catch (err) {
      logger.error('InAppBrowserBypass.safeBypassRedirect', 'Deep link schema navigation exception caught', undefined, err);
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
      if (visibilityListenerRef.current === handleVisibilityChange) {
        removeVisibilityListener();
      }
      setRedirectFailed(true);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = /android/i.test(userAgent);
    const isIOS = /iphone|ipad|ipod/i.test(userAgent);

    const isKakao = /kakaotalk/i.test(userAgent);
    const isNaver = /naver/i.test(userAgent);
    const isLine = /line/i.test(userAgent);
    const isInstagram = /instagram/i.test(userAgent);
    const isFacebook = /fb_iab|fb4a|fban|fbios/i.test(userAgent);
    const isTwitter = /twitter|twttr/i.test(userAgent);

    const isInApp = isKakao || isNaver || isLine || isInstagram || isFacebook || isTwitter;

    let isDismissed = false;
    try {
      const dismissedTime = localStorage.getItem('dview_inapp_bypass_dismissed');
      isDismissed = Boolean(
        dismissedTime && Date.now() - parseInt(dismissedTime, 10) < 7 * 24 * 60 * 60 * 1000
      );
    } catch {
      // Ignore storage read errors in restricted WebViews
    }

    if (isInApp && !isDismissed) {
      let appName = 'other';
      if (isKakao) appName = 'kakaotalk';
      else if (isNaver) appName = 'naver';
      else if (isLine) appName = 'line';
      else if (isInstagram) appName = 'instagram';
      else if (isFacebook) appName = 'facebook';
      else if (isTwitter) appName = 'twitter';

      const canAutoRedirect = isAndroid || (isIOS && (isKakao || isNaver));

      setInAppInfo({
        isInApp,
        isAndroid,
        isIOS,
        appName,
        canAutoRedirect,
      });

      setShowBanner(true);
    }
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem('dview_inapp_bypass_dismissed', Date.now().toString());
    } catch (e) {
      logger.warn('InAppBrowserBypass.handleDismiss', 'Failed to save in-app dismiss state', undefined, e);
    }
    setShowBanner(false);
  };

  const handleRedirectClick = () => {
    const currentUrl = window.location.href;
    setRedirectFailed(false);

    if (inAppInfo.isAndroid) {
      const rawUrl = currentUrl.replace(/^https?:\/\//i, '');
      const intentUrl = `intent://${rawUrl}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(currentUrl)};end`;
      safeBypassRedirect(intentUrl);
    } else if (inAppInfo.isIOS) {
      if (inAppInfo.appName === 'kakaotalk') {
        safeBypassRedirect(`kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`);
      } else if (inAppInfo.appName === 'naver') {
        safeBypassRedirect(`naversearchapp://default?version=1&command=showURL&url=${encodeURIComponent(currentUrl)}`);
      }
    }
  };

  const handleCopyLink = async () => {
    const text = window.location.href;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        if (mountedRef.current) {
          setCopySuccess(true);
          if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
          copyTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) setCopySuccess(false);
          }, 2000);
        }
        return;
      }
    } catch (e) {
      logger.warn('InAppBrowserBypass.handleCopyLink', 'Navigator clipboard failed, trying fallback', undefined, e);
    }

    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.position = 'fixed';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful && mountedRef.current) {
        setCopySuccess(true);
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) setCopySuccess(false);
        }, 2000);
      }
    } catch (err) {
      logger.error('InAppBrowserBypass.handleCopyLink', 'Fallback copy failed', undefined, err);
    }
  };

  if (!showBanner || !inAppInfo.isInApp) return null;

  const appConfig = (() => {
    switch (inAppInfo.appName) {
      case 'kakaotalk':
        return {
          title: '카카오톡 인앱 브라우저',
          iconColor: 'bg-slate-800 text-white',
          badgeText: 'KakaoTalk',
          btnText: inAppInfo.isAndroid ? 'Chrome 열기' : 'Safari 열기',
        };
      case 'naver':
        return {
          title: '네이버 인앱 브라우저',
          iconColor: 'bg-slate-800 text-white',
          badgeText: 'NAVER',
          btnText: inAppInfo.isAndroid ? 'Chrome 열기' : 'Safari 열기',
        };
      case 'line':
        return {
          title: '라인 인앱 브라우저',
          iconColor: 'bg-slate-800 text-white',
          badgeText: 'LINE',
          btnText: inAppInfo.isAndroid ? 'Chrome 열기' : 'Safari 열기',
        };
      case 'instagram':
        return {
          title: '인스타그램 인앱 브라우저',
          iconColor: 'bg-slate-800 text-white',
          badgeText: 'Instagram',
          btnText: inAppInfo.isAndroid ? 'Chrome 열기' : '링크 복사',
        };
      case 'facebook':
        return {
          title: '페이스북 인앱 브라우저',
          iconColor: 'bg-slate-800 text-white',
          badgeText: 'Facebook',
          btnText: inAppInfo.isAndroid ? 'Chrome 열기' : '링크 복사',
        };
      case 'twitter':
        return {
          title: 'X 인앱 브라우저',
          iconColor: 'bg-slate-800 text-white',
          badgeText: 'X',
          btnText: inAppInfo.isAndroid ? 'Chrome 열기' : '링크 복사',
        };
      default:
        return {
          title: '인앱 브라우저',
          iconColor: 'bg-slate-800 text-white',
          badgeText: 'WebView',
          btnText: inAppInfo.isAndroid ? '외부 브라우저' : '링크 복사',
        };
    }
  })();

  return (
    <aside
      role="region"
      aria-label="외부 브라우저 전환 안내 배너"
      data-testid="inapp-slim-banner"
      style={{ height: '48px' }}
      className="fixed top-0 left-0 right-0 z-[9999] h-[48px] min-h-[48px] max-h-[48px] bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between gap-2 shadow-sm"
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`h-7 px-2 rounded-md ${appConfig.iconColor} border border-slate-700 flex items-center gap-1.5 shrink-0 text-[11px] font-bold`}
        >
          <Compass size={13} className="text-emerald-400 shrink-0" />
          <span>{appConfig.badgeText}</span>
        </div>
        <p className="text-[12px] font-semibold text-slate-200 truncate">
          {redirectFailed ? (
            <span className="inline-flex items-center gap-1 text-slate-200">
              <AlertTriangle size={12} className="text-emerald-400 shrink-0" />
              <span>링크 복사 후 기본 브라우저에서 열어주세요</span>
            </span>
          ) : (
            <span>{appConfig.title} 접속 중 · 외부 브라우저 권장</span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {inAppInfo.canAutoRedirect && !redirectFailed ? (
          <button
            type="button"
            data-testid="inapp-open-external-btn"
            onClick={handleRedirectClick}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold transition-colors cursor-pointer"
          >
            <ExternalLink size={12} />
            <span>{appConfig.btnText}</span>
          </button>
        ) : null}

        <button
          type="button"
          data-testid="inapp-copy-link-btn"
          onClick={handleCopyLink}
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-[11px] font-bold transition-colors cursor-pointer"
        >
          <Copy size={12} />
          <span>{copySuccess ? '복사됨' : 'URL 복사'}</span>
        </button>

        <button
          type="button"
          data-testid="inapp-dismiss-btn"
          onClick={handleDismiss}
          aria-label="배너 닫기"
          className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
    </aside>
  );
});

InAppBrowserBypass.displayName = 'InAppBrowserBypass';

export default InAppBrowserBypass;
