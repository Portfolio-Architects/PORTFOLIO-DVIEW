'use client';

import React from 'react';
import { Home, LayoutDashboard, Building2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSettingsUi } from '@/contexts/SettingsContext';

interface MobileDockProps {
  activeTab?: 'imjang' | 'lounge' | 'overview' | 'office' | 'technovalley' | string;
  onTabClick?: (tab: 'imjang' | 'lounge' | 'overview' | 'office' | 'technovalley') => void;
}

const TABS: Array<{
  id: 'imjang' | 'overview' | 'office' | 'technovalley';
  label: string;
  icon: React.ComponentType<any>;
  href: string;
}> = [
  { id: 'overview', label: '아파트 랩', icon: Building2, href: '/' },
  { id: 'imjang', label: '아파트 탐색', icon: Home, href: '/explore' },
  { id: 'technovalley', label: '테크노 랩', icon: LayoutDashboard, href: '/technovalley' },
  { id: 'office', label: '사무실 탐색', icon: Building2, href: '/overview?tab=office' },
];

const MobileDock = React.memo(function MobileDock({ activeTab, onTabClick }: MobileDockProps) {
  const { setIsSettingsModalOpen } = useSettingsUi();
  const router = useRouter();
  const [shouldHide, setShouldHide] = React.useState(false);
  const initialHeightRef = React.useRef<number>(0);

  React.useEffect(() => {
    // Proactively prefetch core routes on mount
    router.prefetch('/');
    router.prefetch('/explore');
    router.prefetch('/technovalley');
    router.prefetch('/overview?tab=office');
  }, [router]);

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
    <nav className={`sm:hidden fixed bottom-0 left-0 right-0 z-[10000] bg-surface/85 backdrop-blur-xl shadow-[0_-8px_32px_rgba(0,0,0,0.06)] rounded-t-[24px] px-2.5 pt-2 pb-[calc(env(safe-area-inset-bottom)+10px)] flex items-center justify-between border-t border-border/40 transition-transform transition-opacity duration-300 ease-out transform-gpu ${
      shouldHide ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
    }`}>
      {/* 4개 핵심 탭 */}
      <div className="flex items-center justify-between w-full min-w-0 gap-0.5">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const showDivider = tab.id === 'imjang';
          
          const isBlueTab = tab.id === 'technovalley' || tab.id === 'office';
          const activeTextColor = isBlueTab ? 'text-hs-blue' : 'text-hs-orange';
          const activeBgClass = isBlueTab 
            ? 'bg-hs-blue-light border border-hs-blue/15' 
            : 'bg-hs-orange-light border border-hs-orange/15';

          const tabElement = (
            <Link
              key={tab.id}
              href={tab.href}
              prefetch={true}
              onMouseEnter={() => router.prefetch(tab.href)}
              onClick={(e) => {
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

          return (
            <React.Fragment key={tab.id}>
              {tabElement}
              {showDivider && (
                <div className="w-[1px] h-4 bg-border/40 mx-0.5 shrink-0 self-center" aria-hidden="true" />
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
