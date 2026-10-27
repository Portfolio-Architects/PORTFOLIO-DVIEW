'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';


const LoungeHeader = React.memo(function LoungeHeader({ activeTab = 'overview', onTabChange }: { activeTab?: string, onTabChange?: (tab: string) => void }) {
  const router = useRouter();
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Proactively prefetch core routes on mount
    router.prefetch('/');
    router.prefetch('/explore');
    router.prefetch('/mbti');
    router.prefetch('/guide');
    router.prefetch('/stats');

    const handlePopState = () => {
      if (!onTabChange || typeof window === 'undefined') return;
      const path = window.location.pathname;
      if (path === '/') onTabChange('overview');
      else if (path === '/explore') onTabChange('imjang');
      else if (path === '/mbti') onTabChange('mbti');
      else if (path === '/guide') onTabChange('guide');
      else if (path === '/stats') onTabChange('stats');
      else onTabChange('overview');
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
      <header className="hidden md:block shrink-0 w-full bg-surface/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-300" role="banner">
        <div className="w-full max-w-[2000px] mx-auto px-3 sm:px-6 md:px-10 lg:px-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between h-[80px] gap-4 md:gap-0">
            
            {/* Mobile: Top Bar */}
            <div className="md:hidden flex items-center justify-end w-full" />

            {/* Desktop Wide View: 4 (Left) ---------------------- 1 (Right) */}
            <nav aria-label="메인 메뉴" className="hidden md:flex w-full items-center justify-between gap-3">
              {/* Left Group: 4 Core Nav Tabs (Segmented Control Style) */}
              <div data-testid="nav-left-group" className="flex shrink-0 items-center space-x-1 bg-slate-100/90 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/70 dark:border-slate-700/60">
                {/* 1. 아파트 랩 */}
                <Link
                  href="/"
                  prefetch={true}
                  onMouseEnter={() => router.prefetch('/')}
                  onClick={(e) => {
                    handleNavClick(e, '/', 'overview');
                    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
                    scrollTimeoutRef.current = setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' }), 50);
                  }}
                  className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] px-4 py-2 text-[13px] font-extrabold transition-colors duration-75 rounded-[12px] ${
                    activeTab === 'overview'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-extrabold shadow-xs border border-slate-200/60 dark:border-slate-700/60'
                      : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:bg-surface/5'
                  }`}
                >
                  <span>아파트 랩</span>
                </Link>

                {/* 2. 아파트 탐색 */}
                <Link
                  href="/explore"
                  prefetch={true}
                  onMouseEnter={() => router.prefetch('/explore')}
                  onClick={(e) => handleNavClick(e, '/explore', 'imjang')}
                  className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] px-4 py-2 text-[13px] font-extrabold transition-colors duration-75 rounded-[12px] ${
                    activeTab === 'imjang'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-extrabold shadow-xs border border-slate-200/60 dark:border-slate-700/60'
                      : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:bg-surface/5'
                  }`}
                >
                  <span>아파트 탐색</span>
                </Link>

                {/* 3. 단지 MBTI */}
                <Link
                  href="/mbti"
                  prefetch={true}
                  onMouseEnter={() => router.prefetch('/mbti')}
                  onClick={(e) => handleNavClick(e, '/mbti', 'mbti')}
                  className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] px-4 py-2 text-[13px] font-extrabold transition-colors duration-75 rounded-[12px] ${
                    activeTab === 'mbti'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-extrabold shadow-xs border border-slate-200/60 dark:border-slate-700/60'
                      : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:bg-surface/5'
                  }`}
                >
                  <span>단지 MBTI</span>
                </Link>

                {/* 4. 부동산 가이드 */}
                <Link
                  href="/guide"
                  prefetch={true}
                  onMouseEnter={() => router.prefetch('/guide')}
                  onClick={(e) => handleNavClick(e, '/guide', 'guide')}
                  className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] px-4 py-2 text-[13px] font-extrabold transition-colors duration-75 rounded-[12px] ${
                    activeTab === 'guide'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-extrabold shadow-xs border border-slate-200/60 dark:border-slate-700/60'
                      : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:bg-surface/5'
                  }`}
                >
                  <span>부동산 가이드</span>
                </Link>
              </div>

              {/* Right Group: 5. 아파트 통계 (Separated to far right) */}
              <div data-testid="nav-right-group" className="flex shrink-0 items-center bg-slate-100/90 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/70 dark:border-slate-700/60">
                <Link
                  href="/stats"
                  prefetch={true}
                  onMouseEnter={() => router.prefetch('/stats')}
                  onClick={(e) => handleNavClick(e, '/stats', 'stats')}
                  className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] px-4 py-2 text-[13px] font-extrabold transition-colors duration-75 rounded-[12px] ${
                    activeTab === 'stats'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-extrabold shadow-xs border border-slate-200/60 dark:border-slate-700/60'
                      : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:bg-surface/5'
                  }`}
                >
                  <span>아파트 통계</span>
                </Link>
              </div>
            </nav>
            
          </div>
        </div>
      </header>
    </>
  );
});

LoungeHeader.displayName = 'LoungeHeader';
export default LoungeHeader;
