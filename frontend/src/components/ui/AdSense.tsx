'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAdBlockDetector } from '@/hooks/useAdBlockDetector';

interface AdSenseProps {
  adClient?: string;
  adSlot: string;
  adFormat?: string;
  responsive?: string;
  style?: React.CSSProperties;
  className?: string;
  onAdStatusChange?: (status: 'filled' | 'unfilled') => void;
}

export default function AdSense({
  adClient,
  adSlot,
  adFormat = 'auto',
  responsive = 'true',
  style = { display: 'block' },
  className = '',
  onAdStatusChange,
}: AdSenseProps) {
  const router = useRouter();
  const { isAdBlockActive } = useAdBlockDetector();
  const initialized = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const client = adClient || process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  useEffect(() => {
    if (initialized.current || !client || typeof window === 'undefined') return;

    const pushAd = () => {
      if (initialized.current) return;
      try {
        if (!(window as any).adsbygoogle) {
          (window as any).adsbygoogle = [];
        }
        const ads = (window as any).adsbygoogle;
        if (ads && typeof ads.push === 'function') {
          try {
            ads.push({});
            initialized.current = true;
          } catch (pushErr) {
            console.warn('[AdSense] adsbygoogle.push failed. This usually happens when an AdBlocker intercepts or freezes the adsbygoogle array:', pushErr);
          }
        } else {
          console.warn('[AdSense] adsbygoogle is not an array or push method is missing. The script might be blocked or crippled.');
        }
      } catch (err) {
        console.warn('[AdSense] Failed to initialize ad slot:', adSlot, err);
      }
    };

    const container = containerRef.current;
    if (!container) return;

    const checkVisibilityAndPush = () => {
      if (initialized.current) return true;
      
      const rect = container.getBoundingClientRect();
      const style = window.getComputedStyle(container);
      
      if (rect.width > 0 && style.display !== 'none' && style.visibility !== 'hidden') {
        pushAd();
        return true;
      }
      return false;
    };

    // 1. If already visible and has non-zero width, initialize immediately
    if (checkVisibilityAndPush()) {
      return;
    }

    // 2. Fallback if ResizeObserver is not supported
    if (typeof ResizeObserver === 'undefined') {
      pushAd();
      return;
    }

    // 3. Observe visibility/width changes (e.g. tab switching or loading states)
    const observer = new ResizeObserver(() => {
      if (checkVisibilityAndPush()) {
        observer.disconnect();
      }
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [client, adSlot]);

  // MutationObserver to watch data-ad-status attribute on the <ins> tag
  useEffect(() => {
    if (typeof window === 'undefined' || !onAdStatusChange) return;

    const container = containerRef.current;
    if (!container) return;

    const checkAndNotify = (el: Element) => {
      const status = el.getAttribute('data-ad-status');
      if (status === 'filled' || status === 'unfilled') {
        onAdStatusChange(status as 'filled' | 'unfilled');
      }
    };

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-ad-status') {
          checkAndNotify(mutation.target as Element);
        } else if (mutation.type === 'childList') {
          const ins = container.querySelector('ins.adsbygoogle');
          if (ins) {
            checkAndNotify(ins);
          }
        }
      });
    });

    observer.observe(container, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['data-ad-status']
    });

    const insElement = container.querySelector('ins.adsbygoogle');
    if (insElement) {
      checkAndNotify(insElement);
    }

    return () => {
      observer.disconnect();
    };
  }, [onAdStatusChange]);

  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'development') return;

    const timer = setTimeout(() => {
      const adsbygoogle = (window as any).adsbygoogle;
      const isLoaded = adsbygoogle && adsbygoogle.push !== Array.prototype.push;
      
      if (!isLoaded) {
        console.error(
          '%c[AdSense] 광고 차단기(AdBlock/AdGuard) 또는 보안 설정으로 인해 구글 광고 스크립트가 차단되었습니다. (window.adsbygoogle is not loaded)',
          'color: #ef4444; font-weight: bold; font-size: 13px;'
        );
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  // B2B 문의 모달 트리거 이벤트 발행
  const handleOpenInquiry = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('open-ad-inquiry'));
  };

  // 임장기 작성 페이지로 이동
  const handleGoToWriteReport = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push('/write-report');
  };

  if (isAdBlockActive) {
    const isAnchor = adSlot.toLowerCase().includes('anchor');
    if (isAnchor) {
      return (
        <div 
          className="w-full bg-[#0d9488] text-white text-[12px] font-extrabold py-2.5 px-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-[#0f766e] transition-colors"
          style={style}
          onClick={handleGoToWriteReport}
        >
          <span>💚 실거주민의 리얼 임장기 보러가기</span>
          <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">바로가기 →</span>
        </div>
      );
    }

    const isB2B = adSlot.charCodeAt(adSlot.length - 1) % 2 === 0;

    return (
      <div 
        className={`w-full bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 dark:border-emerald-500/10 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300 hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(13,148,136,0.1)] group cursor-pointer ${className}`}
        style={{ minHeight: '120px', ...style }}
        onClick={isB2B ? handleOpenInquiry : handleGoToWriteReport}
      >
        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5">
            <span className="bg-emerald-500/10 dark:bg-emerald-500/20 text-[#0d9488] dark:text-[#14b8a6] text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {isB2B ? 'DVIEW Partner' : 'DVIEW Premium'}
            </span>
          </div>
          <h4 className="text-[16px] font-black text-primary mb-1 tracking-tight leading-snug">
            {isB2B ? '동탄 지역 부동산 B2B 전문 파트너 모집 🤝' : 'DVIEW 임장기 쓰고 프리미엄 자료 열람하기 💚'}
          </h4>
          <p className="text-[13px] text-secondary leading-relaxed max-w-[550px]">
            {isB2B 
              ? 'DVIEW 플랫폼에 입점하여 월 10만 명의 실수요 매수층에게 차별화된 매물을 홍보하고 비즈니스를 선점해보세요.' 
              : '여러분의 현장 답사기를 공유해주세요. 작성 즉시 24시간 동안 모든 프리미엄 입지 분석 자료가 무료로 잠금 해제됩니다.'}
          </p>
        </div>
        <button 
          className="bg-[#0d9488] hover:bg-[#0f766e] text-white font-bold text-[13px] px-5 py-2.5 rounded-xl transition-all duration-300 shadow-sm shrink-0 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          {isB2B ? '제휴 문의' : '이동하기'}
        </button>
      </div>
    );
  }

  if (process.env.NODE_ENV === 'development') {
    return (
      <div 
        className={`w-full bg-[#f8fafc] dark:bg-[#1e293b]/30 rounded-2xl p-4 border border-dashed border-border flex flex-col items-center justify-center text-[12px] font-bold text-tertiary select-none ${className}`} 
        style={{ minHeight: '100px', ...style }}
      >
        <span className="text-[10px] opacity-60 uppercase tracking-widest mb-1">AdSense Preview</span>
        <span className="font-extrabold text-[#0d9488]">Slot ID: {adSlot}</span>
        {client && <span className="text-[9px] opacity-40 mt-0.5">Client: {client}</span>}
      </div>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <div ref={containerRef} className={`adsense-container ${className}`} style={{ overflow: 'hidden' }}>
      <ins
        className="adsbygoogle"
        style={style}
        data-ad-client={client}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={responsive}
      />
    </div>
  );
}
