import React from 'react';
import { type ObjectiveMetrics } from '@/lib/types/scoutingReport';
import { getAdForApartment } from '@/lib/utils/adMatching';
import AdSense from './AdSense';

interface NativeAdPlaceholderProps {
  location: string;
  onClick?: () => void;
  metrics?: ObjectiveMetrics;
  adSlot?: string;
  isCompact?: boolean;
}

export function NativeAdPlaceholder({ location, onClick, metrics, adSlot, isCompact }: NativeAdPlaceholderProps) {
  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const [adStatus, setAdStatus] = React.useState<'loading' | 'filled' | 'unfilled'>('loading');

  const ad = getAdForApartment(metrics);

  const handleAdClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick();
    } else if (ad.link) {
      if (ad.link.startsWith('/#')) {
        window.location.hash = ad.link.substring(2);
      } else {
        window.open(ad.link, '_blank');
      }
    }
  };

  // If client ID is set, we can render the AdSense component if slot is provided.
  // Otherwise, or if AdSense fails to load (unfilled), we fallback to B2B matching.
  if (adsenseClient && adSlot && adStatus !== 'unfilled') {
    if (isCompact) {
      return (
        <div className="w-full rounded-[20px] p-1.5 bg-[#f8fafc] dark:bg-[#1e293b]/30 border border-border overflow-hidden flex items-center justify-center min-h-[78px] md:min-h-[86px] h-[78px] md:h-[86px] relative">
          {/* Shimmer Skeleton for CLS Prevention */}
          {adStatus === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 px-4">
              <div className="w-full flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full animate-shimmer" />
                  <div className="h-3 w-28 rounded animate-shimmer" />
                </div>
                <span className="text-[9px] font-bold text-tertiary">DVIEW 추천 광고주 매칭 중...</span>
              </div>
            </div>
          )}
          <div className={`w-full z-10 relative flex justify-center items-center ${adStatus === 'loading' ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}`}>
            <AdSense adSlot={adSlot} adFormat="horizontal" responsive="false" onAdStatusChange={setAdStatus} />
          </div>
        </div>
      );
    }

    return (
      <div className="w-full rounded-[20px] p-2 bg-[#f8fafc] dark:bg-[#1e293b]/30 border border-border overflow-hidden flex items-center justify-center min-h-[250px] md:min-h-[280px] relative">
        {/* Shimmer Skeleton for CLS Prevention */}
        {adStatus === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0 p-4">
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full animate-shimmer" />
              <div className="h-3.5 w-40 rounded animate-shimmer" />
              <div className="h-3 w-56 rounded animate-shimmer" />
              <span className="text-[10px] font-bold text-tertiary mt-1">DVIEW 안전 추천 광고주 매칭 중...</span>
            </div>
          </div>
        )}
        <div className={`w-full z-10 relative ${adStatus === 'loading' ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}`}>
          <AdSense adSlot={adSlot} adFormat="horizontal" responsive="true" onAdStatusChange={setAdStatus} />
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`w-full ${ad.themeColor} rounded-[20px] px-5 border border-dashed flex flex-row items-center justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-all cursor-pointer h-[78px] md:h-[86px]`}
      onClick={handleAdClick}
    >
      <div className="absolute top-1.5 right-3 text-[8px] font-bold opacity-60 uppercase tracking-widest sm:hidden">
        Sponsored
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 flex-1 min-w-0 text-left">
        <div className={`text-[14px] sm:text-[15px] md:text-[16px] font-extrabold ${ad.textColor} group-hover:opacity-80 transition-opacity leading-tight shrink-0`}>
          {ad.title}
        </div>
        <span className="hidden sm:inline opacity-40">—</span>
        <p className="text-[11px] sm:text-[12.5px] font-medium text-secondary truncate">
          {ad.description}
        </p>
      </div>
      
      <div className="flex items-center gap-3 shrink-0 ml-4">
        <button className="hidden sm:block text-[11px] font-bold px-3 py-1.5 bg-surface text-primary border border-border rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          {ad.buttonText}
        </button>
        <span className="text-[10px] font-bold opacity-85 uppercase tracking-widest">
          Sponsored
        </span>
      </div>
    </div>
  );
}

