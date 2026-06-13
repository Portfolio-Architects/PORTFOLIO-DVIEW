'use client';

import { Compass, MessageSquare, Home, Settings, LayoutDashboard, FileText, Coins } from 'lucide-react';
import Link from 'next/link';
import { useSettings } from '@/lib/contexts/SettingsContext';

interface MobileDockProps {
  activeTab: 'imjang' | 'lounge' | 'overview' | 'gap';
  onTabClick?: (tab: 'imjang' | 'lounge' | 'overview' | 'gap') => void;
}

export default function MobileDock({ activeTab, onTabClick }: MobileDockProps) {
  const { setIsSettingsModalOpen } = useSettings();

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-[10000] bg-surface/85 backdrop-blur-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.04)] rounded-t-[24px] px-5 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+12px)] flex items-center justify-between border-t border-border/40">
      {/* 4개 탭 */}
      <div className="flex items-center justify-between flex-1 gap-1">
        {[
          { id: 'overview' as const, label: '데이터 랩', icon: LayoutDashboard, href: '/' },
          { id: 'imjang' as const, label: '아파트 탐색', icon: Home, href: '/explore' },
          { id: 'gap' as const, label: '큐레이션', icon: Coins, href: '/#gap' },
          { id: 'lounge' as const, label: '커뮤니티', icon: MessageSquare, href: '/#lounge' },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          
          if (onTabClick && tab.id !== 'imjang') {
             // Dashboard usage (except for separated explore tab)
             return (
               <button
                 key={tab.id}
                 onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                   e.preventDefault();
                   onTabClick(tab.id as 'imjang' | 'lounge' | 'overview' | 'gap');
                   if (tab.id === 'overview') {
                     window.history.replaceState(null, '', window.location.pathname + window.location.search);
                   } else {
                     window.history.replaceState(null, '', window.location.pathname + window.location.search + `#${tab.id}`);
                   }
                 }}
                 className={`group flex flex-col items-center justify-center w-full min-h-[44px] rounded-[18px] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.94] will-change-transform relative ${
                   isActive ? 'text-[#008262] dark:text-[#00d29d]' : 'text-tertiary hover:text-secondary'
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

          // Lounge, Explore, or cross-page links
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`group flex flex-col items-center justify-center w-full min-h-[44px] rounded-[18px] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.94] will-change-transform relative ${
                isActive ? 'text-[#008262] dark:text-[#00d29d]' : 'text-tertiary hover:text-secondary'
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
}
