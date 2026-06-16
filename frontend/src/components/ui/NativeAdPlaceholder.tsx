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

export const NativeAdPlaceholder = React.memo(function NativeAdPlaceholder({ location, onClick, metrics, adSlot, isCompact }: NativeAdPlaceholderProps) {
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
          {/* Shimmer Skeleton for CLS Prevention (uses GPU acceleration via will-change: background-position) */}
          {adStatus === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 px-4">
              <div className="w-full flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full animate-shimmer" style={{ willChange: 'background-position' }} />
                  <div className="h-3 w-28 rounded animate-shimmer" style={{ willChange: 'background-position' }} />
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
              <div className="w-10 h-10 rounded-full animate-shimmer" style={{ willChange: 'background-position' }} />
              <div className="h-3.5 w-40 rounded animate-shimmer" style={{ willChange: 'background-position' }} />
              <div className="h-3 w-56 rounded animate-shimmer" style={{ willChange: 'background-position' }} />
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

  // B2B Fallback or Local Sponsored Ad
  return (
    <div 
      className={`w-full ${ad.themeColor} rounded-[20px] px-5 border border-dashed flex items-center justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-all cursor-pointer ${
        isCompact 
          ? 'h-[78px] md:h-[86px] flex-row' 
          : 'min-h-[250px] md:min-h-[280px] py-8 flex-col sm:flex-row justify-center sm:justify-between gap-6'
      }`}
      onClick={handleAdClick}
    >
      <div className="absolute top-1.5 right-3 text-[8px] font-bold opacity-60 uppercase tracking-widest sm:hidden">
        Sponsored
      </div>
      <div className={`flex gap-1.5 flex-1 min-w-0 text-left ${isCompact ? 'flex-col sm:flex-row sm:items-center sm:gap-3' : 'flex-col items-center sm:items-start text-center sm:text-left'}`}>
        <div className={`text-[14px] sm:text-[15px] md:text-[17px] font-extrabold ${ad.textColor} group-hover:opacity-80 transition-opacity leading-tight shrink-0`}>
          {ad.title}
        </div>
        {!isCompact && <div className="h-1 w-12 bg-border/40 my-2 rounded sm:hidden" />}
        {isCompact && <span className="hidden sm:inline opacity-40">—</span>}
        <p className={`text-[11px] sm:text-[13px] font-medium text-secondary ${isCompact ? 'truncate' : 'line-clamp-3 sm:line-clamp-2 max-w-[620px]'}`}>
          {ad.description}
        </p>
      </div>
      
      <div className={`flex items-center gap-3 shrink-0 ${isCompact ? 'ml-4' : 'mt-4 sm:mt-0 flex-col sm:flex-row'}`}>
        <button className="text-[11px] sm:text-[12px] font-bold px-4 py-2 bg-white dark:bg-slate-900 text-primary border border-border rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
          {ad.buttonText}
        </button>
        <span className="text-[10px] font-bold opacity-85 uppercase tracking-widest">
          Sponsored
        </span>
      </div>
    </div>
  );
});

NativeAdPlaceholder.displayName = 'NativeAdPlaceholder';

