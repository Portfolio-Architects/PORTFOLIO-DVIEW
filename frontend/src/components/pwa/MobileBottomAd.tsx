'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import AdSense from '@/components/ui/AdSense';

interface MobileBottomAdProps {
  adSlot: string;
}

export default function MobileBottomAd({ adSlot }: MobileBottomAdProps) {
  const pathname = usePathname();

  // MobileDock가 노출되는 주요 서비스 페이지(/, /lounge 등) 및 어드민 페이지에서는 
  // 고정 하단 광고를 표시하지 않습니다. (MobileDock과의 겹침 및 정책 위반 방지)
  const isDockPage = pathname === '/' || pathname?.startsWith('/lounge') || pathname?.startsWith('/apartment');
  const isAdminPage = pathname?.startsWith('/admin');

  if (isDockPage || isAdminPage) {
    return null;
  }

  return (
    <>
      {/* 고정 광고 영역 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border flex items-center justify-center h-[50px] w-full shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="w-[320px] h-[50px] overflow-hidden flex items-center justify-center">
          <AdSense 
            adSlot={adSlot} 
            adFormat="horizontal"
            responsive="false"
            style={{ display: 'inline-block', width: '320px', height: '50px', minHeight: '50px' }}
          />
        </div>
      </div>
      {/* 본문 콘텐츠가 광고에 가려지지 않도록 문서 흐름 하단에 50px 여백 추가 */}
      <div className="w-full h-[50px] block md:hidden" aria-hidden="true" />
    </>
  );
}
