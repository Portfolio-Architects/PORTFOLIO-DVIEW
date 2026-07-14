'use client';

import React from 'react';
import PageHeroHeader from '@/components/PageHeroHeader';
import LoungeHeader from '@/components/LoungeHeader';
import MobileDock from '@/components/pwa/MobileDock';
import dynamic from 'next/dynamic';
import Link from 'next/link';


const TechnoValleyDashboard = dynamic(
  () => import('@/components/macro/TechnoValleyDashboard'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 mb-5 items-stretch animate-pulse">
        {/* Left Panel Skeleton */}
        <div className="lg:col-span-6 flex flex-col gap-6 h-[586px]">
          <div className="bg-black/5 dark:bg-surface/5 border border-border/40 p-6 rounded-[24px] h-[370px] shrink-0" />
          <div className="grid grid-cols-2 gap-4 flex-1">
            <div className="bg-black/5 dark:bg-surface/5 border border-border/40 p-4 rounded-[20px] h-[80px]" />
            <div className="bg-black/5 dark:bg-surface/5 border border-border/40 p-4 rounded-[20px] h-[80px]" />
            <div className="bg-black/5 dark:bg-surface/5 border border-border/40 p-4 rounded-[20px] h-[80px]" />
            <div className="bg-black/5 dark:bg-surface/5 border border-border/40 p-4 rounded-[20px] h-[80px]" />
          </div>
        </div>
        {/* Right Panel Skeleton */}
        <div className="lg:col-span-6 bg-black/5 dark:bg-surface/5 border border-border/40 p-6 rounded-[24px] h-[566px]" />
      </div>
    )
  }
);

export default function TechnoValleyClient() {
  const handleScrollToTaxSimulator = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const target = document.getElementById('tax-simulator');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const bottomContent = (
    <div className="flex flex-wrap gap-2.5 mt-2">
      <button
        onClick={handleScrollToTaxSimulator}
        className="cursor-pointer bg-hs-blue hover:bg-hs-blue/90 text-white font-extrabold px-4 sm:px-5 py-2 sm:py-2.5 rounded-full shadow-sm transition-all text-[12px] sm:text-[13px] inline-flex items-center gap-1.5 select-none active:scale-[0.98]"
      >
        <span>💼 법인 세제 감면 계산기</span>
      </button>
      <Link
        href="/overview?tab=office"
        className="bg-hs-orange hover:bg-hs-orange/90 text-white font-extrabold px-4 sm:px-5 py-2 sm:py-2.5 rounded-full shadow-sm transition-all text-[12px] sm:text-[13px] inline-flex items-center gap-1.5 select-none active:scale-[0.98]"
      >
        <span>🤝 소형 공동임차 매칭 보드</span>
      </Link>
    </div>
  );

  return (
    <>
      <LoungeHeader activeTab="technovalley" />
      
      <div className="flex flex-col w-full bg-transparent">
        {/* Hero Header */}
        <PageHeroHeader 
          title="D-VIEW 테크노 랩"
          subtitleStrong="화성시 동탄구 테크노밸리 연구소"
          subtitleLight="데이터 기반 동탄 테크노밸리 첨단 산업 단지 활성화 솔루션"
          bottomContent={bottomContent}
        />

        <div className="max-w-[2000px] mx-auto w-full px-4 sm:px-6 md:px-10 lg:px-16 pt-6 pb-0">
          <TechnoValleyDashboard />
        </div>
      </div>

      <MobileDock activeTab="technovalley" />
    </>
  );
}
