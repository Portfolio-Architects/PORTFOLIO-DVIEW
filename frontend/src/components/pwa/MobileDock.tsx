'use client';

import React from 'react';
import { Home, LayoutDashboard, Building2, BookOpen, BarChart3, MoreHorizontal, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface MobileDockProps {
  activeTab?: 'imjang' | 'overview' | 'stats' | 'guide' | 'technovalley' | string;
  onTabClick?: (tab: 'imjang' | 'overview' | 'stats' | 'guide' | 'technovalley' | any) => void;
}

export const TABS: Array<{
  id: 'overview' | 'imjang' | 'stats' | 'guide' | 'technovalley';
  label: string;
  icon: React.ComponentType<any>;
  href: string;
}> = [
  { id: 'overview', label: '아파트 랩', icon: Building2, href: '/' },
  { id: 'imjang', label: '아파트 탐색', icon: Home, href: '/explore' },
  { id: 'stats', label: '아파트 통계', icon: BarChart3, href: '/stats' },
  { id: 'guide', label: '부동산 가이드', icon: BookOpen, href: '/guide' },
  { id: 'technovalley', label: '테크노밸리 랩', icon: LayoutDashboard, href: '/technovalley' },
];

const MobileDock = React.memo(function MobileDock({ activeTab, onTabClick }: MobileDockProps) {
  const router = useRouter();
  const [shouldHide, setShouldHide] = React.useState(false);
  const [isMoreOpen, setIsMoreOpen] = React.useState(false);
  const initialHeightRef = React.useRef<number>(0);
  const moreMenuRef = React.useRef<HTMLDivElement | null>(null);
  const moreButtonRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    // Proactively prefetch core routes on mount
    router.prefetch('/');
    router.prefetch('/explore');
    router.prefetch('/stats');
    router.prefetch('/guide');
    router.prefetch('/technovalley');
  }, [router]);

  React.useEffect(() => {
    if (!isMoreOpen || typeof document === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMoreOpen(false);
      }
    };

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (moreMenuRef.current?.contains(target) || moreButtonRef.current?.contains(target)) {
        return;
      }
      setIsMoreOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside, { passive: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
    };
  }, [isMoreOpen]);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    initialHeightRef.current = window.innerHeight || 800;
    const vv = window.visualViewport;

    const handleResize = () => {
      // If viewport height drops significantly (e.g. by more than 120px), 
      // it strongly indicates that the on-screen keyboard is open.
      const initialHeight = initialHeightRef.current || window.innerHeight || 800;
      if (vv.height < initialHeight - 120) {
        setShouldHide(true);
        setIsMoreOpen(false);
      } else {
        setShouldHide(false);
      }
    };

    vv.addEventListener('resize', handleResize, { passive: true });
    // Initial trigger
    handleResize();

    return () => {
      vv.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <>
      {isMoreOpen && !shouldHide && (
        <div
          ref={moreMenuRef}
          data-testid="mobile-dock-more-menu"
          role="dialog"
          aria-label="D-VIEW 서비스 안내 및 약관 메뉴"
          className="md:hidden fixed bottom-[76px] right-3 z-[10001] w-56 max-w-[calc(100vw-24px)] rounded-2xl bg-surface/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-xl p-3 flex flex-col gap-1.5"
        >
          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-200/60 dark:border-slate-800">
            <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400">
              서비스 안내 및 정책
            </span>
            <button
              type="button"
              onClick={() => setIsMoreOpen(false)}
              aria-label="더보기 메뉴 닫기"
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
          <Link
            href="/about"
            onClick={() => setIsMoreOpen(false)}
            className="px-2.5 py-2 rounded-xl text-[12.5px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            D-VIEW 소개
          </Link>
          <Link
            href="/contact"
            onClick={() => setIsMoreOpen(false)}
            className="px-2.5 py-2 rounded-xl text-[12.5px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            고객지원 및 문의하기
          </Link>
          <Link
            href="/terms"
            onClick={() => setIsMoreOpen(false)}
            className="px-2.5 py-2 rounded-xl text-[12.5px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            서비스 이용약관
          </Link>
          <Link
            href="/privacy"
            onClick={() => setIsMoreOpen(false)}
            className="px-2.5 py-2 rounded-xl text-[12.5px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            개인정보처리방침
          </Link>
        </div>
      )}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-[10000] bg-surface/85 backdrop-blur-xl shadow-[0_-8px_32px_rgba(0,0,0,0.06)] rounded-t-[24px] px-2.5 pt-2 pb-[calc(env(safe-area-inset-bottom)+10px)] flex items-center justify-between border-t border-border/40 transition-transform transition-opacity duration-300 ease-out transform-gpu ${
        shouldHide ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
      }`}>
        {/* 5개 핵심 탭 + 더보기 버튼 */}
        <div className="flex items-center justify-between w-full min-w-0 gap-0.5">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id || (tab.id === 'imjang' && activeTab === 'explore');
            const activeTextColor = 'text-blue-600 dark:text-blue-400';
            const activeBgClass = 'bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/40 dark:border-blue-800/40';

            return (
              <Link
                key={tab.id}
                href={tab.href}
                prefetch={true}
                onMouseEnter={() => router.prefetch(tab.href)}
                onClick={(e) => {
                  setIsMoreOpen(false);
                  if (onTabClick) {
                    e.preventDefault();
                    onTabClick(tab.id);
                    try {
                      router.replace(tab.href, { scroll: false });
                    } catch (err) {}
                  }
                }}
                className={`group flex flex-1 min-w-0 flex-col items-center justify-center min-h-[48px] rounded-[18px] transition-[transform,color,background-color] duration-200 ease-out active:scale-[0.94] transform-gpu select-none touch-manipulation relative ${
                  isActive ? activeTextColor : 'text-tertiary hover:text-secondary'
                }`}
              >
                {isActive && (
                   <div className={`absolute inset-0 rounded-[18px] transition-[transform,opacity] duration-200 ease-out transform-gpu animate-in zoom-in-95 ${activeBgClass}`} />
                )}
                <tab.icon size={17} strokeWidth={isActive ? 2.5 : 2} className={`mb-0.5 relative z-10 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] sm:w-[19px] sm:h-[19px] ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                <span className="text-[9.5px] xs:text-[10.5px] font-bold tracking-tight relative z-10 whitespace-nowrap">{tab.label}</span>
              </Link>
            );
          })}
          <button
            ref={moreButtonRef}
            type="button"
            data-testid="mobile-dock-more-button"
            aria-label="정책 및 고객지원 더보기"
            aria-expanded={isMoreOpen}
            onClick={() => setIsMoreOpen((prev) => !prev)}
            className={`group flex shrink-0 px-1.5 flex-col items-center justify-center min-h-[48px] rounded-[18px] transition-[transform,color,background-color] duration-200 ease-out active:scale-[0.94] transform-gpu select-none touch-manipulation relative cursor-pointer ${
              isMoreOpen ? 'text-blue-600 dark:text-blue-400' : 'text-tertiary hover:text-secondary'
            }`}
          >
            <MoreHorizontal size={17} strokeWidth={isMoreOpen ? 2.5 : 2} className="mb-0.5 relative z-10 sm:w-[19px] sm:h-[19px]" />
            <small className="text-[9.5px] xs:text-[10.5px] font-bold tracking-tight relative z-10 leading-none">더보기</small>
          </button>
        </div>
      </nav>
    </>
  );
});

MobileDock.displayName = 'MobileDock';
export default MobileDock;
