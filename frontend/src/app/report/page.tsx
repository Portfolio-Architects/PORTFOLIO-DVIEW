'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Hexagon, LayoutDashboard, Home, Compass, MessageSquare, Search, TrendingUp, MapPin } from 'lucide-react';
import Link from 'next/link';
import FloatingUserBar from '@/components/FloatingUserBar';
import MobileDock from '@/components/pwa/MobileDock';
import PageHeroHeader from '@/components/PageHeroHeader';
import { useDashboardData } from '@/lib/DashboardFacade';

export default function ReportPage() {
  const { dongtanApartments, fieldReports } = useDashboardData();
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter apartments that have field reports or are just top tier
  const reportApts = Object.values(dongtanApartments)
    .flat()
    .filter(apt => {
      const hasReport = fieldReports.some(r => r.apartmentName === apt.name);
      return hasReport || apt.salePrice >= 120000; 
    })
    .filter(apt => apt.name.includes(searchQuery) || apt.dong.includes(searchQuery))
    .sort((a, b) => b.salePrice - a.salePrice); 

  return (
    <div className="min-h-screen bg-body text-primary pb-28 md:pb-12 flex flex-col">
      {/* Main Header — Logo + Nav integrated (Desktop) */}
      <header className="hidden md:block shrink-0 bg-surface/95 backdrop-blur-xl border-b border-border sticky top-0 z-40" role="banner">
        <div className="w-full max-w-[2000px] mx-auto px-3 sm:px-6 md:px-10 lg:px-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-2 md:py-2.5 gap-2 md:gap-0">
            
            <div className="md:hidden flex items-center justify-end w-full">
              <FloatingUserBar />
            </div>

            {/* Center: Nav Tabs */}
            <nav className="hidden md:flex shrink-0 items-center gap-1 sm:gap-1.5 bg-body/80 p-1.5 rounded-[16px] overflow-x-auto no-scrollbar" aria-label="메인 메뉴">
              <Link
                href="/"
                className="flex items-center justify-center min-w-[80px] sm:min-w-[90px] gap-1.5 px-3 py-1.5 text-[12px] sm:text-[13px] font-bold transition-all duration-300 rounded-[10px] text-tertiary hover:text-secondary hover:bg-black/5 dark:hover:bg-surface/5 group"
              >
                <LayoutDashboard size={16} className="text-tertiary group-hover:scale-110 transition-transform duration-200" />
                <span>데이터 랩</span>
              </Link>
              
              <Link
                href="/#imjang"
                className="flex items-center justify-center min-w-[80px] sm:min-w-[90px] gap-1.5 px-3 py-1.5 text-[12px] sm:text-[13px] font-bold transition-all duration-300 rounded-[10px] text-tertiary hover:text-secondary hover:bg-black/5 dark:hover:bg-surface/5 group"
              >
                <Home size={16} className="text-tertiary group-hover:scale-110 transition-transform duration-200" />
                <span>아파트 탐색</span>
              </Link>
              
              <Link
                href="/#discover"
                className="flex items-center justify-center min-w-[80px] sm:min-w-[90px] gap-1.5 px-3 py-1.5 text-[12px] sm:text-[13px] font-bold transition-all duration-300 rounded-[10px] text-tertiary hover:text-secondary hover:bg-black/5 dark:hover:bg-surface/5 group"
              >
                <Compass size={16} className="text-tertiary group-hover:scale-110 transition-transform duration-200" />
                <span>골라보기</span>
              </Link>

              <Link
                href="/#lounge"
                className="flex items-center justify-center min-w-[80px] sm:min-w-[90px] gap-1.5 px-3 py-1.5 text-[12px] sm:text-[13px] font-bold transition-all duration-300 rounded-[10px] text-tertiary hover:text-secondary hover:bg-black/5 dark:hover:bg-surface/5 group"
              >
                <MessageSquare size={16} className="text-tertiary group-hover:scale-110 transition-transform duration-200" />
                <span>커뮤니티</span>
              </Link>
            </nav>

            {/* Right: Desktop Extra Nav & User Bar */}
            <div className="hidden md:flex items-center justify-end gap-4">
              <nav className="flex shrink-0 items-center bg-body/80 p-1.5 rounded-[16px]" aria-label="추가 메뉴">
                <div
                  className="flex items-center justify-center min-w-[80px] sm:min-w-[90px] gap-1.5 px-3 py-1.5 text-[12px] sm:text-[13px] font-bold transition-all duration-300 rounded-[10px] bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5 dark:ring-white/10"
                >
                  <FileText size={16} className="text-primary" />
                  <span>리포트</span>
                </div>
              </nav>
              <FloatingUserBar />
            </div>
            
          </div>
        </div>
      </header>

      {/* Standardized Hero Header */}
      <PageHeroHeader 
        title="D-VIEW 아파트 리포트"
        subtitleStrong="데이터 기반 동탄 아파트 가치 분석"
        subtitleLight="단지별 평당가, 전세가율, 인프라 심층 리포트"
      />

      <main className="w-full max-w-[1200px] mx-auto px-5 md:px-8 py-8 md:py-10 flex-1 flex flex-col gap-6">
        
        {/* Search Bar only (Title removed since it's in PageHeroHeader) */}
        <div className="flex justify-end w-full">
          <div className="w-full md:w-[320px] relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" size={18} />
            <input 
              type="text" 
              placeholder="단지명 또는 동 검색" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-3 text-[14px] font-bold focus:outline-none focus:ring-2 focus:ring-toss-blue/30 focus:border-toss-blue transition-all"
            />
          </div>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {!mounted ? (
            // Skeleton loader for SSR
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-surface border border-border rounded-2xl p-6 h-[220px] animate-pulse"></div>
            ))
          ) : reportApts.length === 0 ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-surface rounded-3xl border border-border border-dashed">
              <Search className="text-tertiary mb-3 opacity-50" size={48} />
              <h3 className="text-lg font-bold text-secondary mb-1">검색 결과가 없습니다</h3>
              <p className="text-tertiary text-sm">다른 단지명이나 키워드로 검색해 보세요.</p>
            </div>
          ) : (
            reportApts.map((apt) => {
              const hasReport = fieldReports.some(r => r.apartmentName === apt.name);
              
              return (
                <Link 
                  key={apt.name} 
                  href={`/#apt=${encodeURIComponent(apt.name)}`}
                  className="group bg-surface border border-border rounded-2xl p-5 md:p-6 hover:border-toss-blue/50 hover:shadow-[0_12px_30px_rgba(49,130,246,0.1)] transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-extrabold text-toss-blue bg-[#eff6ff] px-2.5 py-1 rounded-lg w-fit">
                        {apt.dong}
                      </span>
                      <h3 className="text-[18px] md:text-[20px] font-black text-primary leading-tight group-hover:text-toss-blue transition-colors">
                        {apt.name}
                      </h3>
                    </div>
                    {hasReport && (
                      <div className="shrink-0 bg-toss-blue-light/30 text-toss-blue text-[10px] font-extrabold px-2 py-1 rounded-md border border-toss-blue/20">
                        임장기 포함
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 mt-auto">
                    <div className="flex items-center gap-2 text-[13px] font-bold text-secondary">
                      <TrendingUp size={16} className="text-[#00d29d]" />
                      매매가: {Math.floor(apt.salePrice / 10000)}억 {(apt.salePrice % 10000).toLocaleString() !== '0' ? `${(apt.salePrice % 10000).toLocaleString()}` : ''} 
                      <span className="text-tertiary text-[12px] font-medium ml-1">({apt.pyeongPrice.toLocaleString()}만/평)</span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-4 border-t border-border">
                      <span className="text-[13px] font-extrabold text-toss-blue flex items-center gap-1.5">
                        <FileText size={16} /> 심층 분석 리포트 보기
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
        
      </main>

      <MobileDock activeTab="report" />
    </div>
  );
}

