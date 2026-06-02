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

  if (!client) {
    // If no client ID is provided, show a subtle fallback placeholder in development
    if (process.env.NODE_ENV === 'development') {
      return (
        <div 
          className={`w-full bg-[#f8fafc] dark:bg-[#1e293b]/30 rounded-2xl p-4 border border-dashed border-border flex flex-col items-center justify-center text-[12px] font-bold text-tertiary select-none ${className}`} 
          style={{ minHeight: '100px', ...style }}
        >
          <span className="text-[10px] opacity-60 uppercase tracking-widest mb-1">AdSense Placeholder</span>
          <span>Google AdSense Slot: {adSlot}</span>
        </div>
      );
    }
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
