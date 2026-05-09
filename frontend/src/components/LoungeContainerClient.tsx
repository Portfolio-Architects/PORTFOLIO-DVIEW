'use client';

import { useState, useEffect } from 'react';
import LoungeFeedClient from '@/components/LoungeFeedClient';
import LoungeComposeClient from '@/components/LoungeComposeClient';

// Same Post interface needed for initial posts typing
interface Post {
  id: string;
  title: string;
  summary: string;
  imageUrl: string | null;
  category: string;
  author: string;
  meta: string;
  views: number;
  likes: number;
  createdAt: number;
}

export default function LoungeContainerClient({ initialPosts }: { initialPosts: Post[] }) {
  const [currentTab, setCurrentTab] = useState('전체');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleHashChange = () => {
        if (window.location.hash === '#lounge-news') {
          setCurrentTab('부동산 뉴스');
        }
      };
      
      handleHashChange(); // Run once on mount
      
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }
  }, []);

  const categories = ['전체', '부동산 뉴스', '동탄 임장/분석', '부동산 고민상담', '동탄 청약/대출', '동탄 교통/상권'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
      {/* LEFT SIDEBAR: Categories */}
      <aside className="md:col-span-3 lg:col-span-3 hidden md:block">
        <div className="sticky top-[100px]">
          <h2 className="text-[14px] font-extrabold text-primary mb-4 px-2">게시판 카테고리</h2>
          <div className="flex flex-col gap-1">
            {categories.map((cat) => (
              <button 
                key={cat} 
                onClick={() => setCurrentTab(cat)}
                className={`text-left px-4 py-3 rounded-xl text-[15px] font-bold transition-all ${
                  currentTab === cat ? 'bg-body text-primary' : 'text-secondary hover:bg-body'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* CENTER COLUMN: Main Feed */}
      <section className="md:col-span-9 lg:col-span-6 w-full max-w-[600px] mx-auto md:mx-0">
        
        {/* Universal Top Header - Matches MacroDashboardClient */}
        <div className="flex flex-col mb-6 md:mb-8 px-1 md:px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white border border-[#e5e8eb] flex items-center justify-center shadow-sm shrink-0">
              <img src="/d-view-icon.png" alt="Icon" className="w-[26px] h-[26px] md:w-[31px] md:h-[31px] object-contain" />
            </div>
            <h1 className="text-[24px] md:text-[32px] font-extrabold text-[#191f28] tracking-tight leading-none">
              실시간 동탄 커뮤니티
            </h1>
          </div>
          
          <div className="flex items-center gap-2 mt-4 md:mt-5 mb-4 md:mb-0">
            <div className="w-[3px] h-[14px] bg-[#0d9488] rounded-full" />
            <p className="text-[13px] md:text-[15px] font-semibold text-[#4e5968] tracking-tight">
              LOUNGE — <span className="font-normal text-[#8b95a1]">동탄 주민들의 솔직한 이야기, 실시간 정보 공유</span>
            </p>
          </div>

          {/* Mobile Horizontal Tabs */}
          <div className="flex md:hidden gap-2 overflow-x-auto pb-2 pt-2 scrollbar-hide">
            {categories.map((cat) => (
              <button 
                key={cat} 
                onClick={() => setCurrentTab(cat)}
                className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-bold border transition-all ${
                  currentTab === cat ? 'bg-primary text-surface border-[#191f28]' : 'bg-surface text-secondary border-toss-gray hover:border-toss-blue'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <LoungeFeedClient initialPosts={initialPosts} currentTab={currentTab} />

        <LoungeComposeClient currentCategory={currentTab === '전체' ? '동탄 임장/분석' : currentTab} />
      </section>

      {/* RIGHT SIDEBAR: Placeholder for Popular Posts / Widgets */}
      <aside className="hidden lg:block lg:col-span-3">
        <div className="sticky top-[100px] bg-surface rounded-2xl border border-border p-5">
          <h2 className="text-[14px] font-extrabold text-primary mb-4 flex items-center gap-1">
            <span className="text-toss-red">🔥</span> 주간 인기글
          </h2>
          <p className="text-[13px] text-tertiary leading-relaxed">
            최근 일주일 동안 동탄 주민들이 가장 많이 본 인기글이 곧 제공될 예정입니다.
          </p>
        </div>
      </aside>
    </div>
  );
}
