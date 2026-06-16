'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import AdSense from '@/components/ui/AdSense';

interface MobileBottomAdProps {
  adSlot: string;
}

export default function MobileBottomAd({ adSlot }: MobileBottomAdProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [hash, setHash] = useState('');

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setHash(window.location.hash);
      const handleHashChange = () => {
        setHash(window.location.hash);
      };
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }
  }, []);

  if (!mounted) {
    // Pre-hydration placeholder that preserves CSS height constraints
    return (
      <div className="w-full h-[50px] block md:hidden bg-transparent" aria-hidden="true" />
    );
  }

  // MobileDock가 노출되는 주요 서비스 페이지(/, /lounge, /explore, /news 등) 및 어드민 페이지에서는 
  // 고정 하단 광고를 표시하지 않습니다. (MobileDock과의 겹침 및 정책 위반 방지)
  const isDockPage = pathname === '/' || 
                     pathname?.startsWith('/lounge') || 
                     pathname?.startsWith('/apartment') ||
                     pathname?.startsWith('/explore') ||
                     pathname?.startsWith('/news');
  const isAdminPage = pathname?.startsWith('/admin');
  
  // 아파트 모달, 라운지 게시글 모달 등이 떠 있을 때도 광고가 모달과 겹치거나 가려지지 않도록 미노출 처리
  const hasActiveModal = hash.includes('apt=') || hash.includes('post=') || hash.includes('notice=');

  if (isDockPage || isAdminPage || hasActiveModal) {
    return null;
  }

  return (
    <>
      {/* 고정 광고 영역 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-border flex items-center justify-center h-[50px] w-full shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
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
