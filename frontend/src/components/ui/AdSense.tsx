'use client';

import React, { useEffect, useRef } from 'react';

interface AdSenseProps {
  adClient?: string;
  adSlot: string;
  adFormat?: string;
  responsive?: string;
  style?: React.CSSProperties;
  className?: string;
}

export default function AdSense({
  adClient,
  adSlot,
  adFormat = 'auto',
  responsive = 'true',
  style = { display: 'block' },
  className = '',
}: AdSenseProps) {
  const initialized = useRef(false);
  const client = adClient || process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  useEffect(() => {
    // Prevent double initialization in React 18/19 strict mode
    if (initialized.current) return;
    
    if (typeof window !== 'undefined' && client) {
      try {
        (window as any).adsbygoogle = (window as any).adsbygoogle || [];
        (window as any).adsbygoogle.push({});
        initialized.current = true;
      } catch (err) {
        console.warn('[AdSense] Failed to initialize ad slot:', adSlot, err);
      }
    }
  }, [client, adSlot]);

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
    <div className={`adsense-container ${className}`} style={{ overflow: 'hidden' }}>
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
