'use client';

import React from 'react';
import { FileText, TrendingUp, BarChart3, ChevronRight, Lock, BellRing, Hexagon, LayoutDashboard, Home, Compass, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import FloatingUserBar from '@/components/FloatingUserBar';
import MobileDock from '@/components/pwa/MobileDock';

export default function ReportPage() {
  const WEEKLY_REPORTS = [
    {
      id: 1,
      title: '동탄역세권 대장주 시세 동향 및 분석',
      date: '2026.05.15',
      summary: '동탄역 롯데캐슬 등 시범단지 위주의 갭 투자 동향과 주간 매매가 상승 흐름을 분석합니다.',
      category: '시장 동향',
      isPremium: false,
    },
    {
      id: 2,
      title: '남동탄 학군지 (호수공원) 실거래가 분석',
      date: '2026.05.08',
      summary: '주요 학원가 형성에 따른 학군지 프리미엄 변화와 남동탄 대장단지들의 실거래가를 짚어봅니다.',
      category: '학군/상권',
      isPremium: true,
    },
    {
      id: 3,
      title: 'GTX-A 완전 개통이 미치는 파급 효과',
      date: '2026.05.01',
      summary: '전 구간 개통 이후 출퇴근 시간 단축이 아파트 가치에 미치는 실제 데이터를 분석한 특집 리포트입니다.',
      category: '교통/호재',
      isPremium: true,
    }
  ];

  return (
    <div className="min-h-screen bg-body text-primary pb-28 md:pb-12">
      {/* Mobile Top Header (only visible on mobile) */}
      <header className="md:hidden sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-border/50 px-5 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-toss-blue" />
          <h1 className="text-lg font-bold tracking-tight">인사이트 리포트</h1>
        </div>
        <FloatingUserBar />
      </header>

      {/* Main Header — Logo + Nav integrated (Desktop) */}
      <header className="hidden md:block shrink-0 bg-surface/95 backdrop-blur-xl border-b border-border sticky top-0 z-40" role="banner">
        <div className="w-full max-w-[2000px] mx-auto px-3 sm:px-6 md:px-10 lg:px-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-2 md:py-2.5 gap-2 md:gap-0">
            
            {/* Mobile: Top Bar placeholder to maintain justify-between balance if needed, but not strictly necessary as DashboardClient uses md:hidden */}
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

      <main className="max-w-[1000px] mx-auto px-5 md:px-8 py-8 space-y-12">
        {/* Banner Section */}
        <section className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-64 h-64 bg-toss-blue/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-toss-blue-light/20 px-3 py-1 rounded-full text-[12px] font-bold text-toss-blue mb-3">
                <BellRing size={14} /> D-VIEW 리포트 알림
              </div>
              <h2 className="text-white text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
                최신 부동산 트렌드를<br />가장 빠르게 받아보세요
              </h2>
              <p className="text-slate-300 text-sm font-medium">동탄 아파트 실거래 및 심층 분석 리포트 매주 금요일 발행</p>
            </div>
            <button className="bg-toss-blue hover:bg-[#2b72d6] text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all shrink-0">
              구독하기
            </button>
          </div>
        </section>

        {/* Weekly Reports Section */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[20px] font-black flex items-center gap-2">
              <TrendingUp className="text-toss-blue" size={20} />
              주간 동탄 시장 리포트
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {WEEKLY_REPORTS.map((report) => (
              <div key={report.id} className="group bg-surface border border-border rounded-2xl p-5 hover:border-toss-blue/30 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col h-full">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-toss-blue bg-toss-blue-light dark:bg-toss-blue/10 px-2.5 py-1 rounded-lg">
                    {report.category}
                  </span>
                  {report.isPremium ? (
                    <Lock size={14} className="text-tertiary group-hover:text-toss-blue transition-colors" />
                  ) : (
                    <span className="text-[11px] text-tertiary">{report.date}</span>
                  )}
                </div>
                <h4 className="text-[16px] font-bold text-primary mb-2 line-clamp-2 leading-snug group-hover:text-toss-blue transition-colors">
                  {report.title}
                </h4>
                <p className="text-[13px] text-secondary line-clamp-3 mb-5 flex-grow">
                  {report.summary}
                </p>
                <Link href={report.id === 1 ? '/#apt=동탄역 롯데캐슬' : '#'} className="flex items-center justify-between mt-auto pt-4 border-t border-border w-full">
                  <span className="text-[12px] font-bold text-primary">자세히 보기</span>
                  <ChevronRight size={16} className="text-tertiary group-hover:translate-x-1 group-hover:text-toss-blue transition-all" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Data Analysis Deep Dive */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[20px] font-black flex items-center gap-2">
              <BarChart3 className="text-toss-green" size={20} />
              심층 데이터 랩
            </h3>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <h4 className="text-xl font-bold mb-3">단지별 평당가 & 전세가율 비교 분석기</h4>
              <p className="text-secondary text-sm mb-5 leading-relaxed">
                단순 실거래가를 넘어선 입지적 프리미엄 가치를 수치화하여 비교합니다. 연식, 학군, 교통 등 다양한 요소를 반영한 자체 스코어링 데이터를 확인하세요.
              </p>
              <button className="bg-body border border-border text-primary font-bold py-2.5 px-5 rounded-xl hover:bg-toss-blue-light dark:hover:bg-toss-blue/10 hover:text-toss-blue transition-all">
                데이터 보러가기
              </button>
            </div>
            <div className="w-full md:w-1/3 aspect-video bg-body rounded-xl border border-border flex items-center justify-center">
              <BarChart3 size={40} className="text-tertiary/50" />
            </div>
          </div>
        </section>
      </main>

      <MobileDock activeTab="report" />
    </div>
  );
}
