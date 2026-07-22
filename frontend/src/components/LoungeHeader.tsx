'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, MessageSquare, Home, LayoutDashboard, Coins, Newspaper, Building2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FloatingUserBar from '@/components/FloatingUserBar';
import { useAuth } from '@/hooks/useAuth';
import { dashboardFacade } from '@/lib/DashboardFacade';

const LoungeHeader = React.memo(function LoungeHeader({ activeTab = 'lounge', onTabChange }: { activeTab?: string, onTabChange?: (tab: string) => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Proactively prefetch core routes on mount
    router.prefetch('/');
    router.prefetch('/overview?tab=office');
    router.prefetch('/lounge');
    router.prefetch('/overview');
    router.prefetch('/explore');

    const handlePopState = () => {
      if (!onTabChange || typeof window === 'undefined') return;
      const path = window.location.pathname;
      const search = window.location.search;
      if (path === '/') onTabChange('technovalley');
      else if (path === '/lounge') onTabChange('lounge');
      else if (path === '/explore') onTabChange('imjang');
      else if (path === '/overview') {
        if (search.includes('tab=office')) onTabChange('office');
        else onTabChange('overview');
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [router, onTabChange]);

  const handleNavClick = (e: React.MouseEvent, href: string, tab: string) => {
    if (onTabChange) {
      e.preventDefault();
      window.history.pushState(null, '', href);
      onTabChange(tab);
      try {
        router.replace(href, { scroll: false });
      } catch (err) {}
    }
  };

  return (
    <>
      {/* Main Header — Minimalist Navigation integrated */}
      <header className="hidden md:block shrink-0 bg-surface/85 backdrop-blur-xl border-b border-border/60 sticky top-0 z-50 transition-colors duration-300" role="banner">
        <div className="w-full max-w-[2000px] mx-auto px-3 sm:px-6 md:px-10 lg:px-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between h-[80px] gap-4 md:gap-0">
            
            {/* Mobile: Top Bar */}
            <div className="md:hidden flex items-center justify-end w-full">
              <FloatingUserBar />
            </div>

            {/* Center: Nav Tabs (Segmented Control Style) */}
            <div className="hidden md:flex shrink-0 items-center gap-3" aria-label="메인 메뉴">
              <nav aria-label="메인 메뉴" className="hidden md:flex items-center space-x-1 bg-body p-1.5 rounded-[18px] border border-border/40">
                <Link
                  href="/"
                  prefetch={true}
                  onMouseEnter={() => router.prefetch('/')}
                  onTouchStart={() => router.prefetch('/')}
                  onClick={(e) => handleNavClick(e, '/', 'technovalley')}
                  className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-colors duration-75 rounded-[12px] ${
                    activeTab === 'technovalley'
                      ? 'bg-hs-blue-light text-hs-blue font-extrabold shadow-[0_2px_12px_rgba(0,0,0,0.06)]'
                      : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:bg-surface/5'
                  }`}
                >
                  <LayoutDashboard size={18} className={activeTab === 'technovalley' ? 'text-hs-blue' : 'text-tertiary'} />
                  <span>테크노 랩</span>
                </Link>

                <Link
                  href="/overview?tab=office"
                  prefetch={true}
                  onMouseEnter={() => router.prefetch('/overview?tab=office')}
                  onTouchStart={() => router.prefetch('/overview?tab=office')}
                  onClick={(e) => handleNavClick(e, '/overview?tab=office', 'office')}
                  className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-colors duration-75 rounded-[12px] ${
                    activeTab === 'office'
                      ? 'bg-hs-blue-light text-hs-blue font-extrabold shadow-[0_2px_12px_rgba(0,0,0,0.06)]'
                      : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:bg-surface/5'
                  }`}
                >
                  <Building2 size={18} className={activeTab === 'office' ? 'text-hs-blue' : 'text-tertiary'} />
                  <span>사무실 탐색</span>
                </Link>

                <Link
                  href="/lounge"
                  prefetch={true}
                  onMouseEnter={() => router.prefetch('/lounge')}
                  onTouchStart={() => router.prefetch('/lounge')}
                  onClick={(e) => handleNavClick(e, '/lounge', 'lounge')}
                  className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-colors duration-75 rounded-[12px] ${
                    activeTab === 'lounge'
                      ? 'bg-hs-blue-light text-hs-blue font-extrabold shadow-[0_2px_12px_rgba(0,0,0,0.06)]'
                      : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:bg-surface/5'
                  }`}
                >
                  <MessageSquare size={18} className={activeTab === 'lounge' ? 'text-hs-blue' : 'text-tertiary'} />
                  <span>동탄 라운지</span>
                </Link>

                <Link
                  href="/overview"
                  prefetch={true}
                  onMouseEnter={() => router.prefetch('/overview')}
                  onTouchStart={() => router.prefetch('/overview')}
                  onClick={(e) => {
                    handleNavClick(e, '/overview', 'overview');
                    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
                    scrollTimeoutRef.current = setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
                  }}
                  className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-colors duration-75 rounded-[12px] ${
                    activeTab === 'overview'
                      ? 'bg-hs-orange-light text-hs-orange font-extrabold shadow-[0_2px_12px_rgba(0,0,0,0.06)]'
                      : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:bg-surface/5'
                  }`}
                >
                  <Building2 size={18} className={activeTab === 'overview' ? 'text-hs-orange' : 'text-tertiary'} />
                  <span>아파트 랩</span>
                </Link>

                <Link
                  href="/explore"
                  prefetch={true}
                  onMouseEnter={() => router.prefetch('/explore')}
                  onTouchStart={() => router.prefetch('/explore')}
                  onClick={(e) => handleNavClick(e, '/explore', 'imjang')}
                  className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-colors duration-75 rounded-[12px] ${
                    activeTab === 'imjang'
                      ? 'bg-hs-orange-light text-hs-orange font-extrabold shadow-[0_2px_12px_rgba(0,0,0,0.06)]'
                      : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:bg-surface/5'
                  }`}
                >
                  <Home size={18} className={activeTab === 'imjang' ? 'text-hs-orange' : 'text-tertiary'} />
                  <span>아파트 탐색</span>
                </Link>
              </nav>
            </div>

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

