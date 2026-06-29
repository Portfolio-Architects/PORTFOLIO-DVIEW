'use client';

import React, { useState } from 'react';
import { LayoutDashboard, Coins, Users } from 'lucide-react';
import PageHeroHeader from '@/components/PageHeroHeader';
import LoungeHeader from '@/components/LoungeHeader';
import MobileDock from '@/components/pwa/MobileDock';
import TechnoValleyDashboard from '@/components/macro/TechnoValleyDashboard';
import RelocationTaxSimulator from '@/components/macro/RelocationTaxSimulator';
import CoLeasingBoard from '@/components/macro/CoLeasingBoard';

export default function TechnoValleyClient() {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'tax' | 'matching'>('dashboard');

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

        {/* Sub-tab segmented control */}
        <div className="max-w-[2000px] mx-auto w-full px-4 sm:px-6 md:px-10 lg:px-16 pt-6 flex justify-center">
          <div className="flex bg-body/80 p-1.5 border border-border/40 rounded-[22px] shadow-inner select-none w-full max-w-xl justify-between">
            <button
              onClick={() => setActiveSubTab('dashboard')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[16px] text-[12.5px] font-black transition-all cursor-pointer ${
                activeSubTab === 'dashboard'
                  ? 'bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-border/10'
                  : 'text-tertiary hover:text-secondary'
              }`}
            >
              <LayoutDashboard size={15} />
              <span>실시간 활성 지산 랩</span>
            </button>
            
            <button
              onClick={() => setActiveSubTab('tax')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[16px] text-[12.5px] font-black transition-all cursor-pointer ${
                activeSubTab === 'tax'
                  ? 'bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-border/10'
                  : 'text-tertiary hover:text-secondary'
              }`}
            >
              <Coins size={15} />
              <span>세제 혜택 계산기</span>
            </button>
            
            <button
              onClick={() => setActiveSubTab('matching')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[16px] text-[12.5px] font-black transition-all cursor-pointer ${
                activeSubTab === 'matching'
                  ? 'bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-border/10'
                  : 'text-tertiary hover:text-secondary'
              }`}
            >
              <Users size={15} />
              <span>공동임차 매칭 보드</span>
            </button>
          </div>
        </div>

        <div className="max-w-[2000px] mx-auto w-full px-4 sm:px-6 md:px-10 lg:px-16 pt-6 pb-16">
          {/* 탭 전환 렌더링 */}
          {activeSubTab === 'dashboard' && <TechnoValleyDashboard />}
          {activeSubTab === 'tax' && <RelocationTaxSimulator />}
          {activeSubTab === 'matching' && <CoLeasingBoard />}
        </div>
      </div>

      <MobileDock activeTab="technovalley" />
    </>
  );
}
