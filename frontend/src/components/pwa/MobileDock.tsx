'use client';

import { Compass, MessageSquare, Home, Settings, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { useSettings } from '@/lib/contexts/SettingsContext';

interface MobileDockProps {
  activeTab: 'imjang' | 'lounge' | 'discover' | 'overview';
  onTabClick?: (tab: 'imjang' | 'discover' | 'overview') => void;
}

export default function MobileDock({ activeTab, onTabClick }: MobileDockProps) {
  const { setIsSettingsModalOpen } = useSettings();

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-xl shadow-[0_-8px_30px_rgba(0,0,0,0.06)] rounded-t-[24px] px-5 pt-2 pb-[calc(env(safe-area-inset-bottom)+12px)] flex items-center justify-between border-t border-border w-full">
      {/* 4개 탭 */}
      <div className="flex items-center justify-between flex-1 gap-1">
        {[
          { id: 'overview' as const, label: '데이터 랩', icon: LayoutDashboard, href: '/' },
          { id: 'imjang' as const, label: '아파트 탐색', icon: Home, href: '/#imjang' },
          { id: 'discover' as const, label: '골라보기', icon: Compass, href: '/#discover' },
          { id: 'lounge' as const, label: '커뮤니티', icon: MessageSquare, href: '/lounge' },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          
          if (onTabClick && tab.id !== 'lounge') {
             // Dashboard usage
             return (
               <button
                 key={tab.id}
                 onClick={() => onTabClick(tab.id as 'imjang' | 'discover' | 'overview')}
                 className={`flex flex-col items-center justify-center w-full min-h-[44px] rounded-[20px] transition-all duration-300 relative ${
                   isActive ? 'text-toss-blue' : 'text-tertiary hover:text-secondary'
                 }`}
               >
                 {isActive && (
                    <div className="absolute inset-0 bg-toss-blue/10 rounded-[20px] transition-opacity" />
                 )}
                 <tab.icon size={20} strokeWidth={isActive ? 2.5 : 2} className="mb-0.5 relative z-10" />
                 <span className="text-[10px] font-bold tracking-wide relative z-10">{tab.label}</span>
               </button>
             );
          }

          // Lounge or cross-page links
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex flex-col items-center justify-center w-full min-h-[44px] rounded-[20px] transition-all duration-300 relative ${
                isActive ? 'text-toss-blue' : 'text-tertiary hover:text-secondary'
              }`}
            >
              {isActive && (
                 <div className="absolute inset-0 bg-toss-blue/10 rounded-[20px] transition-opacity" />
              )}
              <tab.icon size={20} strokeWidth={isActive ? 2.5 : 2} className="mb-0.5 relative z-10" />
              <span className="text-[10px] font-bold tracking-wide relative z-10">{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* 구분선 */}
      <div className="w-[1px] h-8 bg-[#e5e8eb] mx-3 shrink-0 dark:bg-border" />

      {/* 설정 토글 (우측) */}
      <div className="flex flex-col items-center justify-center shrink-0 pr-1">
        <button
          onClick={() => setIsSettingsModalOpen(true)}
          className="flex flex-col items-center justify-center w-12 h-[44px] rounded-[20px] transition-all duration-300 relative text-tertiary hover:text-secondary hover:bg-black/5 dark:hover:bg-white/5"
          aria-label="설정"
        >
          <Settings size={22} strokeWidth={2} className="mb-0.5 relative z-10" />
          <span className="text-[10px] font-bold tracking-wide relative z-10">설정</span>
        </button>
      </div>
    </nav>
  );
}
