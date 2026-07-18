'use client';

import React from 'react';
import PageHeroHeader from '@/components/PageHeroHeader';
import LoungeHeader from '@/components/LoungeHeader';
import MobileDock from '@/components/pwa/MobileDock';
import dynamic from 'next/dynamic';


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
  return (
    <>
      <LoungeHeader activeTab="technovalley" />
      
      <div className="flex flex-col w-full bg-transparent">
        {/* Hero Header */}
        <PageHeroHeader 
          title="D-VIEW 테크노 랩"
          subtitleStrong="데이터로 분석하는 동탄 테크노밸리 현황"
          subtitleLight="첨단 산업단지의 입주 동향과 지역 경제 활성화 현황을 다각도로 짚어 드립니다"
          bottomContent={undefined}
        />

        <div className="max-w-[2000px] mx-auto w-full px-4 sm:px-6 md:px-10 lg:px-16 pt-6 pb-0">
          <TechnoValleyDashboard />
        </div>
      </div>

      <MobileDock activeTab="technovalley" />
    </>
  );
}
