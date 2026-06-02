'use client';

import React, { useEffect, useRef } from 'react';

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
  const initialized = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const client = adClient || process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  useEffect(() => {
    if (initialized.current || !client || typeof window === 'undefined') return;

    const pushAd = () => {
      if (initialized.current) return;
      try {
        (window as any).adsbygoogle = (window as any).adsbygoogle || [];
        (window as any).adsbygoogle.push({});
        initialized.current = true;
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

    const insElement = container.querySelector('ins.adsbygoogle');
    if (!insElement) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-ad-status') {
          const status = insElement.getAttribute('data-ad-status');
          if (status === 'filled' || status === 'unfilled') {
            onAdStatusChange(status as 'filled' | 'unfilled');
          }
        }
      });
    });

    observer.observe(insElement, {
      attributes: true,
      attributeFilter: ['data-ad-status']
    });

    const initialStatus = insElement.getAttribute('data-ad-status');
    if (initialStatus === 'filled' || initialStatus === 'unfilled') {
      onAdStatusChange(initialStatus as 'filled' | 'unfilled');
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
