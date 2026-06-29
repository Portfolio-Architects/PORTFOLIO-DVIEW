'use client';

import React from 'react';
import PageHeroHeader from '@/components/PageHeroHeader';
import LoungeHeader from '@/components/LoungeHeader';
import MobileDock from '@/components/pwa/MobileDock';
import TechnoValleyDashboard from '@/components/macro/TechnoValleyDashboard';

export default function TechnoValleyClient() {
  return (
    <>
      <LoungeHeader activeTab="technovalley" />
      
      <div className="flex flex-col w-full bg-transparent">
        {/* Hero Header */}
        <PageHeroHeader 
          title="D-VIEW 테크노 랩"
          subtitleStrong="화성시 동탄구 테크노밸리 연구소"
          subtitleLight="데이터 기반 동탄 테크노밸리 첨단 산업 단지 활성화 솔루션"
        />

        <div className="max-w-[2000px] mx-auto w-full px-4 sm:px-6 md:px-10 lg:px-16 pt-6 pb-0">
          <TechnoValleyDashboard />
        </div>
      </div>

      <MobileDock activeTab="technovalley" />
    </>
  );
}
