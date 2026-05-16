'use client';

import { TrendingUp, MessageSquare, Home, ShieldCheck, LayoutDashboard, Compass } from 'lucide-react';
import Link from 'next/link';
import FloatingUserBar from '@/components/FloatingUserBar';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { dashboardFacade } from '@/lib/DashboardFacade';

export default function LoungeHeader({ activeTab = 'lounge', onTabChange }: { activeTab?: string, onTabChange?: (tab: string) => void }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 80);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Dynamic Minimal Sticky Header */}
      <div 
        className={`flex fixed top-0 inset-x-0 w-full bg-surface/95 backdrop-blur-md border-b border-border shadow-sm z-50 transition-transform duration-300 items-center justify-between px-3 md:px-10 lg:px-16 h-[68px] ${
          isScrolled ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <span className="font-extrabold text-[#191f28] tracking-tight text-[15px] flex items-center gap-2">
           <span className="text-toss-blue">PORTFOLIO</span>
           <span className="text-[#8b95a1] font-normal text-[13px]">|</span>
           <span className="text-[#4e5968] font-semibold text-[14px]">D-VIEW</span>
        </span>
        <div className="flex items-center -mr-1">
          <FloatingUserBar />
        </div>
      </div>
      
      {/* Main Header — Minimalist Navigation integrated */}
      <header className="hidden md:block shrink-0 bg-surface/95 backdrop-blur-xl border-b border-border relative z-40" role="banner">
        <div className="w-full max-w-[2000px] mx-auto px-3 sm:px-6 md:px-10 lg:px-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between pt-4 pb-3 md:py-4 gap-4 md:gap-0">
            
            {/* Mobile: Top Bar */}
            <div className="md:hidden flex items-center justify-end w-full">
              <FloatingUserBar />
            </div>

            {/* Center: Nav Tabs (Segmented Control Style) */}
            <nav className="hidden md:flex shrink-0 items-center gap-1 sm:gap-1.5 bg-body/80 p-1.5 rounded-[16px] overflow-x-auto no-scrollbar" aria-label="메인 메뉴">
              <Link
                href="/#overview"
                onClick={() => {
                  if (onTabChange) onTabChange('overview');
                  setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-[15px] font-bold transition-all whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'bg-white text-primary shadow-sm ring-1 ring-black/5'
                    : 'text-tertiary hover:text-secondary hover:bg-black/5'
                }`}
              >
                <LayoutDashboard size={18} className={activeTab === 'overview' ? 'text-toss-blue' : ''} />
                데이터 랩
              </Link>
              
              <Link
                href="/#imjang"
                className={`flex items-center justify-center min-w-[90px] sm:min-w-[100px] gap-1.5 px-3 py-2.5 text-[13px] sm:text-[14px] font-bold transition-all duration-300 rounded-[12px] text-tertiary hover:text-secondary hover:bg-black/5`}
              >
                <Home size={16} className="text-tertiary group-hover:scale-110 transition-transform duration-200" />
                <span>아파트 탐색</span>
              </Link>
              
              <Link
                href="/#discover"
                className={`flex items-center justify-center min-w-[90px] sm:min-w-[100px] gap-1.5 px-3 py-2.5 text-[13px] sm:text-[14px] font-bold transition-all duration-300 rounded-[12px] text-tertiary hover:text-secondary hover:bg-black/5`}
              >
                <Compass size={16} className="text-tertiary group-hover:scale-110 transition-transform duration-200" />
                <span>골라보기</span>
              </Link>

              <Link
                href="/lounge"
                className={`flex items-center justify-center min-w-[90px] sm:min-w-[100px] gap-1.5 px-3 py-2.5 text-[13px] sm:text-[14px] font-bold transition-all duration-300 rounded-[12px] bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5`}
              >
                <MessageSquare size={16} className="text-primary group-hover:scale-110 transition-transform duration-200" />
                <span>커뮤니티</span>
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
}
