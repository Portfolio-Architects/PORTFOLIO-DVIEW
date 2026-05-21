'use client';

import { Compass, MessageSquare, Home, Settings, LayoutDashboard, FileText } from 'lucide-react';
import Link from 'next/link';
import { useSettings } from '@/lib/contexts/SettingsContext';

interface MobileDockProps {
  activeTab: 'imjang' | 'lounge' | 'overview';
  onTabClick?: (tab: 'imjang' | 'lounge' | 'overview') => void;
}

export default function MobileDock({ activeTab, onTabClick }: MobileDockProps) {
  const { setIsSettingsModalOpen } = useSettings();

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-[999] bg-surface/95 backdrop-blur-xl shadow-[0_-8px_30px_rgba(0,0,0,0.06)] rounded-t-[24px] px-5 pt-2 pb-[calc(env(safe-area-inset-bottom)+12px)] flex items-center justify-between border-t border-border w-full">
      {/* 4개 탭 */}
      <div className="flex items-center justify-between flex-1 gap-1">
        {[
          { id: 'overview' as const, label: '데이터 랩', icon: LayoutDashboard, href: '/' },
          { id: 'imjang' as const, label: '아파트 탐색', icon: Home, href: '/#imjang' },
          { id: 'lounge' as const, label: '커뮤니티', icon: MessageSquare, href: '/#lounge' },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          
          if (onTabClick) {
             // Dashboard usage
             return (
               <button
                 key={tab.id}
                 onClick={() => {
                   onTabClick(tab.id as 'imjang' | 'lounge' | 'overview');
                   if (tab.id === 'overview') {
                     window.history.replaceState(null, '', window.location.pathname + window.location.search);
                   } else {
                     window.history.replaceState(null, '', window.location.pathname + window.location.search + `#${tab.id}`);
                   }
                 }}
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
    </nav>
  );
}
