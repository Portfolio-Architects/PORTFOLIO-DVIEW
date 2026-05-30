'use client';

import { useState, useEffect } from 'react';
import PageHeroHeader from './PageHeroHeader';
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

export default function LoungeContainerClient({ 
  initialPosts,
  searchParams,
}: { 
  initialPosts: Post[];
  searchParams?: { notice?: string };
}) {
  const [currentTab, setCurrentTab] = useState(searchParams?.notice ? '동탄구 소식' : '동탄 부동산 뉴스');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleHashChange = () => {
        if (window.location.hash === '#lounge-news') {
          setCurrentTab('동탄 부동산 뉴스');
        }
      };
      
      handleHashChange(); // Run once on mount
      
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }
  }, []);
  const categories = [
    '동탄 부동산 뉴스',
    '동탄구 소식',
    '매니저 임장기',
    '동탄 육아/교육',
    '실시간 오픈런/정보',
    '우리동네 이야기',
    '동탄 벼룩/나눔'
  ];
  return (
    <div className="flex flex-col w-full bg-surface">
      {/* Standardized Hero Header */}
      <PageHeroHeader 
        title="D-VIEW 라운지"
        subtitleStrong="동탄 지역 부동산 커뮤니티"
        subtitleLight="현장 임장기, 부동산 뉴스, 우리 동네 이야기"
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 w-full px-4 sm:px-6 md:px-10 lg:px-16 pt-3 md:pt-5 pb-16">
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
      <section className="md:col-span-9 lg:col-span-9 w-full">
        
        {/* Universal Top Header */}
        <div className="flex flex-col mb-6 md:mb-8 px-1 md:px-2">
          <div className="flex items-center gap-3 mb-4 md:mb-0">
            <h1 className="text-[24px] md:text-[32px] font-extrabold text-primary tracking-tight leading-none">
              {currentTab}
            </h1>
          </div>

          {/* Mobile Horizontal Tabs */}
          <div className="flex md:hidden gap-2 overflow-x-auto pb-2 pt-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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

        <LoungeComposeClient currentCategory={(currentTab === '동탄 부동산 뉴스' || currentTab === '매니저 임장기') ? '우리동네 이야기' : currentTab} />
      </section>

      </div>
    </div>
  );
}
