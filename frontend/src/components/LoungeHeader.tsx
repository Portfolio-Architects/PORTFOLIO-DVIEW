'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, MessageSquare, Home, LayoutDashboard, Coins, Newspaper, Building2 } from 'lucide-react';
import Link from 'next/link';
import FloatingUserBar from '@/components/FloatingUserBar';
import { useAuth } from '@/hooks/useAuth';
import { dashboardFacade } from '@/lib/DashboardFacade';

const LoungeHeader = React.memo(function LoungeHeader({ activeTab = 'lounge', onTabChange }: { activeTab?: string, onTabChange?: (tab: string) => void }) {
  const { user } = useAuth();
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  return (
    <>
      {/* Main Header — Minimalist Navigation integrated */}
      <header className="hidden md:block shrink-0 bg-surface/95 backdrop-blur-xl border-b border-border sticky top-0 z-50" role="banner">
        <div className="w-full max-w-[2000px] mx-auto px-3 sm:px-6 md:px-10 lg:px-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between h-[68px] gap-4 md:gap-0">
            
            {/* Mobile: Top Bar */}
            <div className="md:hidden flex items-center justify-end w-full">
              <FloatingUserBar />
            </div>

            {/* Center: Nav Tabs (Segmented Control Style matched to DashboardClient) */}
            <nav className="hidden md:flex shrink-0 items-center gap-1 sm:gap-1.5 bg-body/80 p-2 rounded-[18px] overflow-x-auto no-scrollbar" aria-label="메인 메뉴">
              <Link
                href="/#overview"
                onClick={() => {
                  if (onTabChange) onTabChange('overview');
                  if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
                  scrollTimeoutRef.current = setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
                }}
                className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-all duration-300 rounded-[12px] ${
                  activeTab === 'overview'
                    ? 'bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5 dark:ring-white/10'
                    : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:bg-surface/5'
                }`}
              >
                <LayoutDashboard size={18} className={activeTab === 'overview' ? 'text-primary' : 'text-tertiary group-hover:scale-110 transition-transform duration-200'} />
                데이터 랩
              </Link>

              <Link
                href="/technovalley"
                className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-all duration-300 rounded-[12px] ${
                  activeTab === 'technovalley'
                    ? 'bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5 dark:ring-white/10'
                    : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:bg-surface/5'
                }`}
              >
                <Building2 size={18} className={activeTab === 'technovalley' ? 'text-primary' : 'text-tertiary group-hover:scale-110 transition-transform duration-200'} />
                <span>테크노밸리</span>
              </Link>

              <Link
                href="/explore"
                className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-all duration-300 rounded-[12px] ${
                  activeTab === 'imjang'
                    ? 'bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5 dark:ring-white/10'
                    : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:bg-surface/5'
                }`}
              >
                <Home size={18} className={activeTab === 'imjang' ? 'text-primary' : 'text-tertiary group-hover:scale-110 transition-transform duration-200'} />
                <span>아파트 탐색</span>
              </Link>
              
              <Link
                href="/lounge"
                className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-all duration-300 rounded-[12px] ${
                  activeTab === 'lounge'
                    ? 'bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5 dark:ring-white/10'
                    : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:bg-surface/5'
                }`}
              >
                <MessageSquare size={18} className={activeTab === 'lounge' ? 'text-primary' : 'text-tertiary group-hover:scale-110 transition-transform duration-200'} />
                <span>동탄 라운지</span>
              </Link>
 
              <Link
                href="/#gap"
                className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-all duration-300 rounded-[12px] ${
                  activeTab === 'gap'
                    ? 'bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5 dark:ring-white/10'
                    : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:bg-surface/5'
                }`}
              >
                <Coins size={18} className={activeTab === 'gap' ? 'text-primary' : 'text-tertiary group-hover:scale-110 transition-transform duration-200'} />
                <span>큐레이션</span>
              </Link>

            </nav>

            {/* Right: Desktop User Bar */}
            <div className="hidden md:flex items-center justify-end">
              <FloatingUserBar />
            </div>
            
          </div>
        </div>
      </header>
    </>
  );
});

LoungeHeader.displayName = 'LoungeHeader';
export default LoungeHeader;
