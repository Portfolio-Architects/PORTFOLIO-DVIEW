'use client';

import React from 'react';
import { Compass, MessageSquare, Home, Settings, LayoutDashboard, FileText, Coins, TrendingUp, Newspaper, Building2 } from 'lucide-react';
import Link from 'next/link';
import { useSettingsUi } from '@/lib/contexts/SettingsContext';

interface MobileDockProps {
  activeTab: 'imjang' | 'lounge' | 'overview' | 'office' | 'technovalley';
  onTabClick?: (tab: 'imjang' | 'lounge' | 'overview' | 'office' | 'technovalley') => void;
}

const MobileDock = React.memo(function MobileDock({ activeTab, onTabClick }: MobileDockProps) {
  const { setIsSettingsModalOpen } = useSettingsUi();
  const [shouldHide, setShouldHide] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;

    const handleResize = () => {
      // If viewport height drops significantly (e.g. by more than 120px), 
      // it strongly indicates that the on-screen keyboard is open.
      const initialHeight = window.innerHeight;
      if (vv.height < initialHeight - 120) {
        setShouldHide(true);
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

  const tabs: Array<{
    id: 'imjang' | 'lounge' | 'overview' | 'office' | 'technovalley';
    label: string;
    icon: React.ComponentType<any>;
    href: string;
  }> = [
    { id: 'technovalley', label: '테크노 랩', icon: LayoutDashboard, href: '/' },
    { id: 'office', label: '사무실 탐색', icon: Building2, href: '/overview?tab=office' },
    { id: 'lounge', label: '동탄 라운지', icon: MessageSquare, href: '/lounge' },
    { id: 'overview', label: '아파트 랩', icon: Building2, href: '/overview' },
    { id: 'imjang', label: '아파트 탐색', icon: Home, href: '/explore' },
  ];

  return (
    <nav className={`sm:hidden fixed bottom-0 left-0 right-0 z-[10000] bg-surface shadow-[0_-8px_32px_rgba(0,0,0,0.04)] rounded-t-[24px] px-5 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+12px)] flex items-center justify-between border-t border-border/40 transition-all duration-300 ${
      shouldHide ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
    }`}>
      {/* 5개 탭 */}
      <div className="flex items-center justify-between flex-1 gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const showDivider = tab.id === 'office' || tab.id === 'lounge';
          
          let tabElement = null;
          
          if (onTabClick && tab.id !== 'imjang' && tab.id !== 'lounge' && tab.id !== 'technovalley' && tab.id !== 'overview' && tab.id !== 'office') {
             // Dashboard usage (if within the same page context)
             tabElement = (
                <button
                  key={tab.id}
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    onTabClick(tab.id as 'imjang' | 'lounge' | 'overview' | 'office' | 'technovalley');
                    if (tab.id === 'overview') {
                      window.history.replaceState(null, '', window.location.pathname + window.location.search);
                    } else {
                      window.history.replaceState(null, '', window.location.pathname + window.location.search + `#${tab.id}`);
                    }
                  }}
                  className={`group flex flex-col items-center justify-center w-full min-h-[48px] rounded-[18px] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.94] will-change-transform select-none touch-manipulation relative ${
                    isActive ? 'text-hs-orange' : 'text-tertiary hover:text-secondary'
                  }`}
                >
                 {isActive && (
                    <div className="absolute inset-0 bg-[#fdf0e9] border border-[#dc6e2d]/15 rounded-[18px] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] animate-in zoom-in-95" />
                 )}
                 <tab.icon size={19} strokeWidth={isActive ? 2.5 : 2} className={`mb-0.5 relative z-10 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                 <span className="text-[11px] font-bold tracking-tight relative z-10">{tab.label}</span>
               </button>
             );
          } else {
             // Cross-page links or other routes
             tabElement = (
              <Link
                key={tab.id}
                href={tab.href}
                prefetch={false}
                className={`group flex flex-col items-center justify-center w-full min-h-[48px] rounded-[18px] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.94] will-change-transform select-none touch-manipulation relative ${
                  isActive ? 'text-hs-orange' : 'text-tertiary hover:text-secondary'
                }`}
              >
                {isActive && (
                   <div className="absolute inset-0 bg-[#fdf0e9] border border-[#dc6e2d]/15 rounded-[18px] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] animate-in zoom-in-95" />
                )}
                <tab.icon size={19} strokeWidth={isActive ? 2.5 : 2} className={`mb-0.5 relative z-10 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                <span className="text-[11px] font-bold tracking-tight relative z-10">{tab.label}</span>
              </Link>
             );
          }

          return (
            <React.Fragment key={tab.id}>
              {tabElement}
              {showDivider && (
                <div className="w-[1px] h-5 bg-border/40 mx-0.5 shrink-0 self-center" aria-hidden="true" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
});

MobileDock.displayName = 'MobileDock';
export default MobileDock;
