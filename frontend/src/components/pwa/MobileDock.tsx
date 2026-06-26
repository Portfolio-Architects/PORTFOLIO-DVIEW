'use client';

import React from 'react';
import { Compass, MessageSquare, Home, Settings, LayoutDashboard, FileText, Coins, TrendingUp, Newspaper, Building2 } from 'lucide-react';
import Link from 'next/link';
import { useSettingsUi } from '@/lib/contexts/SettingsContext';

interface MobileDockProps {
  activeTab: 'imjang' | 'lounge' | 'overview' | 'gap' | 'technovalley';
  onTabClick?: (tab: 'imjang' | 'lounge' | 'overview' | 'gap' | 'technovalley') => void;
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

  return (
    <nav className={`sm:hidden fixed bottom-0 left-0 right-0 z-[10000] bg-surface/85 backdrop-blur-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.04)] rounded-t-[24px] px-5 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+12px)] flex items-center justify-between border-t border-border/40 transition-all duration-300 ${
      shouldHide ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
    }`}>
      {/* 5개 탭 */}
      <div className="flex items-center justify-between flex-1 gap-1">
        {[
          { id: 'overview' as const, label: '데이터 랩', icon: LayoutDashboard, href: '/' },
          { id: 'technovalley' as const, label: '테크노밸리', icon: Building2, href: '/technovalley' },
          { id: 'imjang' as const, label: '아파트 탐색', icon: Home, href: '/explore' },
          { id: 'lounge' as const, label: '동탄 라운지', icon: MessageSquare, href: '/lounge' },
          { id: 'gap' as const, label: '큐레이션', icon: Coins, href: '/#gap' },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          
          if (onTabClick && tab.id !== 'imjang' && tab.id !== 'lounge' && tab.id !== 'technovalley') {
             // Dashboard usage (except for separated explore/lounge/technovalley pages)
             return (
               <button
                 key={tab.id}
                 onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                   e.preventDefault();
                   onTabClick(tab.id as 'imjang' | 'lounge' | 'overview' | 'gap' | 'technovalley');
                   if (tab.id === 'overview') {
                     window.history.replaceState(null, '', window.location.pathname + window.location.search);
                   } else {
                     window.history.replaceState(null, '', window.location.pathname + window.location.search + `#${tab.id}`);
                   }
                 }}
                 className={`group flex flex-col items-center justify-center w-full min-h-[48px] rounded-[18px] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.94] will-change-transform select-none touch-manipulation relative ${
                   isActive ? 'text-[#c44d00] dark:text-[#ea6100]' : 'text-tertiary hover:text-secondary'
                 }`}
               >
                 {isActive && (
                    <div className="absolute inset-0 bg-[hsla(165,100%,41%,0.08)] border border-[hsla(165,100%,41%,0.15)] rounded-[18px] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] animate-in zoom-in-95" />
                 )}
                 <tab.icon size={19} strokeWidth={isActive ? 2.5 : 2} className={`mb-0.5 relative z-10 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                 <span className="text-[11px] font-bold tracking-tight relative z-10">{tab.label}</span>
               </button>
             );
          }

          // Lounge, Explore, Technovalley or cross-page links
          return (
            <Link
              key={tab.id}
              href={tab.href}
              prefetch={false}
              className={`group flex flex-col items-center justify-center w-full min-h-[48px] rounded-[18px] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.94] will-change-transform select-none touch-manipulation relative ${
                isActive ? 'text-[#c44d00] dark:text-[#ea6100]' : 'text-tertiary hover:text-secondary'
              }`}
            >
              {isActive && (
                 <div className="absolute inset-0 bg-[hsla(165,100%,41%,0.08)] border border-[hsla(165,100%,41%,0.15)] rounded-[18px] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] animate-in zoom-in-95" />
              )}
              <tab.icon size={19} strokeWidth={isActive ? 2.5 : 2} className={`mb-0.5 relative z-10 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
              <span className="text-[11px] font-bold tracking-tight relative z-10">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
});

MobileDock.displayName = 'MobileDock';
export default MobileDock;
