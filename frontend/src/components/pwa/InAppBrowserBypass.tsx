'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Copy, ExternalLink, Compass, AlertTriangle } from 'lucide-react';

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

  const [showOverlay, setShowOverlay] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [redirectFailed, setRedirectFailed] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const visibilityListenerRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  const removeVisibilityListener = () => {
    if (visibilityListenerRef.current) {
      window.removeEventListener('visibilitychange', visibilityListenerRef.current);
      visibilityListenerRef.current = null;
    }
  };

  useEffect(() => {
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
    window.addEventListener('visibilitychange', handleVisibilityChange);

    if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
    redirectTimeoutRef.current = setTimeout(() => {
      if (visibilityListenerRef.current === handleVisibilityChange) {
        removeVisibilityListener();
      }
      if (!hasRedirected && Date.now() - start < 2000) {
        console.warn('Deep link redirect failed or app not installed');
        if (mountedRef.current) {
          setRedirectFailed(true);
        }
      }
    }, 1500);

    try {
      window.location.href = url;
    } catch (err) {
      console.error('Deep link schema navigation exception caught:', err);
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
    const currentUrl = window.location.href;

    const isKakao = /kakaotalk/i.test(userAgent);
    const isNaver = /naver/i.test(userAgent);
    const isLine = /line/i.test(userAgent);
    const isInstagram = /instagram/i.test(userAgent);
    const isFacebook = /fb_iab|fb4a|fban|fbios/i.test(userAgent);
    const isTwitter = /twitter|twttr/i.test(userAgent);

    const isInApp = isKakao || isNaver || isLine || isInstagram || isFacebook || isTwitter;

    const dismissedTime = localStorage.getItem('dview_inapp_bypass_dismissed');
    const isDismissed = dismissedTime && (Date.now() - parseInt(dismissedTime, 10) < 7 * 24 * 60 * 60 * 1000); // 7 days

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

      setShowOverlay(true);

      // Attempt automatic redirect immediately with fail safe guard
      if (isAndroid) {
        const rawUrl = currentUrl.replace(/^https?:\/\//i, '');
        const intentUrl = `intent://${rawUrl}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(currentUrl)};end`;
        safeBypassRedirect(intentUrl);
      } else if (isIOS) {
        if (isKakao) {
          safeBypassRedirect(`kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`);
        } else if (isNaver) {
          safeBypassRedirect(`naversearchapp://default?version=1&command=showURL&url=${encodeURIComponent(currentUrl)}`);
        }
      }
    }
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem('dview_inapp_bypass_dismissed', Date.now().toString());
    } catch (e) {
      console.warn('Failed to save in-app dismiss state:', e);
    }
    setShowOverlay(false);
  };

  const handleRedirectClick = () => {
    const currentUrl = window.location.href;
    setRedirectFailed(false); // Reset failure state on manual retry
    
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
      console.warn('Navigator clipboard failed, trying fallback:', e);
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
      if (successful) {
        if (mountedRef.current) {
          setCopySuccess(true);
          if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
          copyTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) setCopySuccess(false);
          }, 2000);
        }
      } else {
        alert('주소 복사에 실패했습니다. 직접 복사해주세요.');
      }
    } catch (err) {
      console.error('Fallback copy failed:', err);
      alert('주소 복사에 실패했습니다. 직접 복사해주세요.');
    }
  };

  if (!showOverlay || !inAppInfo.isInApp) return null;

  const appConfig = (() => {
    switch (inAppInfo.appName) {
      case 'kakaotalk':
        return {
          title: '카카오톡 인앱 브라우저',
          iconColor: 'bg-[#fee500] text-[#191919]',
          badgeText: 'KakaoTalk',
          btnText: '사파리(Safari)로 열기',
        };
      case 'naver':
        return {
          title: '네이버 앱 인앱 브라우저',
          iconColor: 'bg-[#03c75a] text-white',
          badgeText: 'NAVER',
          btnText: inAppInfo.isAndroid ? '크롬(Chrome)으로 열기' : '사파리(Safari)로 열기',
        };
      case 'line':
        return {
          title: '라인 인앱 브라우저',
          iconColor: 'bg-[#06c755] text-white',
          badgeText: 'LINE',
          btnText: inAppInfo.isAndroid ? '크롬(Chrome)으로 열기' : '사파리(Safari)로 열기',
        };
      case 'instagram':
        return {
          title: '인스타그램 인앱 브라우저',
          iconColor: 'bg-gradient-to-tr from-[#f9ce3f] via-[#e1306c] to-[#833ab4] text-white',
          badgeText: 'Instagram',
          btnText: inAppInfo.isAndroid ? '크롬(Chrome)으로 열기' : '링크 복사하기',
        };
      case 'facebook':
        return {
          title: '페이스북 인앱 브라우저',
          iconColor: 'bg-[#1877f2] text-white',
          badgeText: 'Facebook',
          btnText: inAppInfo.isAndroid ? '크롬(Chrome)으로 열기' : '링크 복사하기',
        };
      case 'twitter':
        return {
          title: '트위터 인앱 브라우저',
          iconColor: 'bg-black text-white dark:bg-white dark:text-black',
          badgeText: 'X / Twitter',
          btnText: inAppInfo.isAndroid ? '크롬(Chrome)으로 열기' : '링크 복사하기',
        };
      default:
        return {
          title: '인앱 브라우저 접속 중',
          iconColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
          badgeText: 'WebView',
          btnText: inAppInfo.isAndroid ? '기본 브라우저로 열기' : '링크 복사하기',
        };
    }
  })();

  return (
    <div className="fixed inset-0 z-[99999] bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-surface max-w-sm w-full rounded-3xl border border-border shadow-2xl p-6 text-center flex flex-col items-center gap-5 animate-in zoom-in-95 duration-200">
        
        {/* App Indicator Icon */}
        <div className={`w-16 h-16 rounded-2xl ${appConfig.iconColor} flex items-center justify-center text-[18px] font-black shadow-md relative`}>
          <Compass size={28} className="animate-spin" style={{ animationDuration: '6s' }} />
          <span className="absolute -bottom-2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-primary text-surface border border-border">
            {appConfig.badgeText}
          </span>
        </div>

        <div>
          <h2 className="text-[17px] font-black text-primary mb-2">외부 브라우저로 접속해 주세요</h2>
          <p className="text-[13px] text-secondary leading-relaxed px-1">
            구글 정책으로 인해 <strong>{appConfig.title}</strong> 등 인앱 브라우저 환경에서는 구글 로그인이 불가능합니다.
          </p>
        </div>

        {/* Action Guide Card */}
        <div className="w-full bg-body rounded-2xl p-4 border border-border text-left flex flex-col gap-2.5">
          <span className={`text-[11.5px] font-black flex items-center gap-1 ${redirectFailed ? 'text-rose-500' : 'text-teal-600 dark:text-teal-400'}`}>
            <AlertTriangle size={12} /> {redirectFailed ? '자동 이동 실패 안내' : '안내 및 간단 접속 방법'}
          </span>
          {redirectFailed ? (
            <p className="text-[12px] text-secondary leading-normal">
              자동 이동을 시도했으나 실패했습니다. <strong>외부 앱이 설치되어 있지 않거나</strong> OS에 의해 차단되었을 수 있습니다. 아래 버튼을 눌러 <strong>주소를 복사한 뒤 기본 브라우저에 붙여넣기</strong> 해주세요.
            </p>
          ) : inAppInfo.canAutoRedirect ? (
            <p className="text-[12px] text-secondary leading-normal">
              아래 <strong>{appConfig.btnText}</strong> 버튼을 눌러 안전하고 빠른 시스템 브라우저로 이동해 주세요. 자동으로 이동되지 않을 때도 버튼을 누르시면 됩니다.
            </p>
          ) : (
            <p className="text-[12px] text-secondary leading-normal">
              아래 버튼을 눌러 링크를 복사한 뒤, <strong>Safari(사파리)</strong> 또는 <strong>Chrome(크롬)</strong>을 실행하여 주소창에 붙여넣어 주세요.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2">
          {inAppInfo.canAutoRedirect ? (
            <>
              <button
                onClick={handleRedirectClick}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[13.5px] font-extrabold transition-all bg-teal-600 border border-teal-600 text-surface hover:bg-teal-700 active:scale-[0.98]"
              >
                <ExternalLink size={16} />
                {appConfig.btnText}
              </button>
              <button
                onClick={handleCopyLink}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[13.5px] font-extrabold transition-all border ${
                  copySuccess
                    ? 'bg-emerald-600 border-emerald-600 text-surface'
                    : 'bg-body border-border text-primary hover:bg-neutral-200 dark:hover:bg-neutral-800'
                }`}
              >
                <Copy size={16} />
                {copySuccess ? '링크 복사 완료!' : '주소(URL) 복사하기'}
              </button>
            </>
          ) : (
            <button
              onClick={handleCopyLink}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[13.5px] font-extrabold transition-all border ${
                copySuccess
                  ? 'bg-emerald-600 border-emerald-600 text-surface'
                  : 'bg-teal-600 border-teal-600 text-surface hover:bg-teal-700 active:scale-[0.98]'
              }`}
            >
              <Copy size={16} />
              {copySuccess ? '링크 복사 완료!' : '주소(URL) 복사하기'}
            </button>
          )}
          
          {/* Close/Browse button */}
          <button
            onClick={handleDismiss}
            className="w-full py-2.5 rounded-2xl text-[12px] font-bold text-tertiary hover:text-secondary transition-all"
          >
            그냥 둘러볼래요 (구글 로그인 불가)
          </button>
        </div>

        <p className="text-[11px] text-tertiary font-bold tracking-tight">
          D-VIEW — 동탄 아파트 가치분석
        </p>
      </div>
    </div>
  );
});

InAppBrowserBypass.displayName = 'InAppBrowserBypass';

export default InAppBrowserBypass;
