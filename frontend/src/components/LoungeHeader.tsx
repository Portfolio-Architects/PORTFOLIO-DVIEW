'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { trackTabView } from '@/lib/utils/analytics';


function useSafeRouter() {
  try {
    return useRouter();
  } catch {
    return null;
  }
}

function normalizeHeaderTab(tab?: string): string {
  if (!tab) return 'overview';
  return tab === 'explore' ? 'imjang' : tab;
}

function isModifiedNavigationClick(e: React.MouseEvent): boolean {
  return Boolean(
    e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      (typeof e.button === 'number' && e.button !== 0)
  );
}

const LoungeHeader = React.memo(function LoungeHeader({ activeTab = 'overview', onTabChange }: { activeTab?: string, onTabChange?: (tab: string) => void }) {
  const router = useSafeRouter();
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastResolvedTabRef = useRef<string>(normalizeHeaderTab(activeTab));
  const isApprovalMode = process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE === 'true';

  useEffect(() => {
    lastResolvedTabRef.current = normalizeHeaderTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    const handlePopState = (event?: Event) => {
      if (typeof window === 'undefined') return;
      const path = window.location.pathname;
      let matchedTab: string | null = null;
      if (path === '/' || path === '/overview' || path === '/mbti') matchedTab = 'overview';
      else if (path === '/explore') matchedTab = 'imjang';
      else if (path === '/stats' || path.startsWith('/stats/')) matchedTab = 'stats';
      else if (path === '/guide' || path.startsWith('/guide/')) matchedTab = 'guide';
      else if (path === '/technovalley' || path.startsWith('/technovalley/')) matchedTab = 'technovalley';
      else if (path === '/lounge' || path.startsWith('/lounge/')) matchedTab = 'lounge';

      if (matchedTab !== null) {
        const prevNormalized = lastResolvedTabRef.current;
        const nextNormalized = normalizeHeaderTab(matchedTab);
        lastResolvedTabRef.current = nextNormalized;

        if (event?.type === 'popstate' && nextNormalized !== prevNormalized) {
          trackTabView({
            tab_name: nextNormalized,
            previous_tab: prevNormalized,
            surface: 'popstate_navigation',
            trigger: `tab_${nextNormalized}`,
          });
        }
      }
      if (onTabChange) {
        onTabChange(matchedTab ?? 'overview');
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [router, onTabChange, isApprovalMode]);

  const handleNavClick = (e: React.MouseEvent, href: string, tab: string): boolean => {
    if (isModifiedNavigationClick(e)) {
      return false;
    }
    const currentNormalized = normalizeHeaderTab(activeTab);
    const targetNormalized = normalizeHeaderTab(tab);
    lastResolvedTabRef.current = targetNormalized;
    if (targetNormalized !== currentNormalized) {
      trackTabView({
        tab_name: targetNormalized,
        previous_tab: currentNormalized,
        surface: 'gnb_header',
        trigger: `tab_${targetNormalized}`,
      });
    }
    if (onTabChange) {
      e.preventDefault();
      window.history.pushState(null, '', href);
      onTabChange(tab);
      try {
        router?.replace(href, { scroll: false });
      } catch (err) {}
    }
    return true;
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
                  prefetch={false}
                  onClick={(e) => {
                    if (!handleNavClick(e, '/', 'overview')) return;
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
                  prefetch={false}
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
                  prefetch={false}
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
                  prefetch={false}
                  title="동탄 부동산 20개 심층 비교 분석 가이드"
                  onClick={(e) => handleNavClick(e, '/guide', 'guide')}
                  className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] px-4 py-2 text-[13px] font-extrabold transition-colors duration-75 rounded-[12px] ${
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
                  prefetch={false}
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

              {/* Right Group: Real-time Resident Lounge (/lounge) or Policy & Support in AdSense Approval Mode */}
              {isApprovalMode ? (
                <div data-testid="nav-right-policy-group" className="hidden lg:flex shrink-0 items-center gap-1.5 ml-auto">
                  <button
                    type="button"
                    data-testid="header-about-link"
                    data-href="/about"
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
                    onClick={() => router?.push('/contact')}
                    className="px-3 py-1.5 text-[12px] font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    고객지원
                  </button>
                </div>
              ) : (
                <div data-testid="nav-right-lounge-group" className="flex shrink-0 items-center ml-auto">
                  <button
                    type="button"
                    data-testid="header-lounge-link"
                    data-href="/lounge"
                    aria-current={activeTab === 'lounge' ? 'page' : undefined}
                    onClick={(e) => {
                      if (isModifiedNavigationClick(e)) return;
                      const currentNormalized = normalizeHeaderTab(activeTab);
                      lastResolvedTabRef.current = 'lounge';
                      if (currentNormalized !== 'lounge') {
                        trackTabView({
                          tab_name: 'lounge',
                          previous_tab: currentNormalized,
                          surface: 'gnb_header',
                          trigger: 'tab_lounge',
                        });
                      }
                      router?.push('/lounge');
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 lg:px-3.5 py-2 text-[12.5px] lg:text-[13px] font-extrabold rounded-[12px] transition-colors duration-150 cursor-pointer ${
                      activeTab === 'lounge'
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/70 shadow-xs'
                        : 'bg-slate-100/90 hover:bg-slate-200/75 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-400 border border-slate-200/70 dark:border-slate-700/60'
                    }`}
                  >
                    <MessageSquare size={14} strokeWidth={2.25} className="text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="whitespace-nowrap">실시간 입주민 라운지</span>
                  </button>
                </div>
              )}
            </nav>
            
          </div>
        </div>
      </header>
    </>
  );
});

LoungeHeader.displayName = 'LoungeHeader';
export default LoungeHeader;
