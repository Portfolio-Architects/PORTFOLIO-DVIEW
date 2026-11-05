'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';


function useSafeRouter() {
  try {
    return useRouter();
  } catch {
    return null;
  }
}

const LoungeHeader = React.memo(function LoungeHeader({ activeTab = 'overview', onTabChange }: { activeTab?: string, onTabChange?: (tab: string) => void }) {
  const router = useSafeRouter();
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Proactively prefetch core routes on mount
    router?.prefetch('/');
    router?.prefetch('/explore');
    router?.prefetch('/stats');
    router?.prefetch('/guide');
    router?.prefetch('/technovalley');

    const handlePopState = () => {
      if (!onTabChange || typeof window === 'undefined') return;
      const path = window.location.pathname;
      if (path === '/') onTabChange('overview');
      else if (path === '/explore') onTabChange('imjang');
      else if (path === '/stats' || path.startsWith('/stats/')) onTabChange('stats');
      else if (path === '/guide' || path.startsWith('/guide/')) onTabChange('guide');
      else if (path === '/technovalley' || path.startsWith('/technovalley/')) onTabChange('technovalley');
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
        router?.replace(href, { scroll: false });
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

            {/* Desktop Wide View: 5 Core Nav Tabs + Right Utility Links */}
            <nav aria-label="메인 메뉴" className="hidden md:flex w-full items-center justify-start gap-3">
              {/* Left Group: 5 Core Nav Tabs (Segmented Control Style) */}
              <div data-testid="nav-left-group" className="flex shrink-0 items-center space-x-1 bg-slate-100/90 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/70 dark:border-slate-700/60">
                {/* 1. 아파트 랩 */}
                <Link
                  href="/"
                  prefetch={true}
                  onMouseEnter={() => router?.prefetch('/')}
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
                  onMouseEnter={() => router?.prefetch('/explore')}
                  onClick={(e) => handleNavClick(e, '/explore', 'imjang')}
                  className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] px-4 py-2 text-[13px] font-extrabold transition-colors duration-75 rounded-[12px] ${
                    activeTab === 'imjang' || activeTab === 'explore'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-extrabold shadow-xs border border-slate-200/60 dark:border-slate-700/60'
                      : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:bg-surface/5'
                  }`}
                >
                  <span>아파트 탐색</span>
                </Link>

                {/* 3. 아파트 통계 */}
                <Link
                  href="/stats"
                  prefetch={true}
                  onMouseEnter={() => router?.prefetch('/stats')}
                  onClick={(e) => handleNavClick(e, '/stats', 'stats')}
                  className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] px-4 py-2 text-[13px] font-extrabold transition-colors duration-75 rounded-[12px] ${
                    activeTab === 'stats'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-extrabold shadow-xs border border-slate-200/60 dark:border-slate-700/60'
                      : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:bg-surface/5'
                  }`}
                >
                  <span>아파트 통계</span>
                </Link>

                {/* 4. 부동산 가이드 */}
                <Link
                  href="/guide"
                  prefetch={true}
                  title="동탄 부동산 20개 심층 비교 분석 가이드"
                  data-guide-badge="20개 심층 분석"
                  onMouseEnter={() => router?.prefetch('/guide')}
                  onClick={(e) => handleNavClick(e, '/guide', 'guide')}
                  className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] px-4 py-2 text-[13px] font-extrabold transition-colors duration-75 rounded-[12px] after:content-[attr(data-guide-badge)] after:ml-1.5 after:px-1.5 after:py-0.5 after:text-[10px] after:font-extrabold after:rounded-full after:bg-emerald-500/10 after:text-emerald-700 dark:after:text-emerald-400 after:border after:border-emerald-500/20 ${
                    activeTab === 'guide'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-extrabold shadow-xs border border-slate-200/60 dark:border-slate-700/60'
                      : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:bg-surface/5'
                  }`}
                >
                  <span>부동산 가이드</span>
                </Link>

                {/* 5. 테크노밸리 랩 */}
                <Link
                  href="/technovalley"
                  prefetch={true}
                  onMouseEnter={() => router?.prefetch('/technovalley')}
                  onClick={(e) => handleNavClick(e, '/technovalley', 'technovalley')}
                  className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] px-4 py-2 text-[13px] font-extrabold transition-colors duration-75 rounded-[12px] ${
                    activeTab === 'technovalley'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-extrabold shadow-xs border border-slate-200/60 dark:border-slate-700/60'
                      : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:bg-surface/5'
                  }`}
                >
                  <span>테크노밸리 랩</span>
                </Link>
              </div>

              {/* Right Group: Policy & Support Quick Access (/about, /contact) */}
              <div data-testid="nav-right-policy-group" className="hidden lg:flex shrink-0 items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  data-testid="header-about-link"
                  data-href="/about"
                  onMouseEnter={() => router?.prefetch('/about')}
                  onClick={() => router?.push('/about')}
                  className="px-3 py-1.5 text-[12px] font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  서비스 안내
                </button>
                <span className="text-slate-300 dark:text-slate-700 text-[11px] select-none" aria-hidden="true">|</span>
                <button
                  type="button"
                  data-testid="header-contact-link"
                  data-href="/contact"
                  onMouseEnter={() => router?.prefetch('/contact')}
                  onClick={() => router?.push('/contact')}
                  className="px-3 py-1.5 text-[12px] font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  고객지원
                </button>
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
