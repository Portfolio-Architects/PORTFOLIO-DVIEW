import React from 'react';
import { type ObjectiveMetrics } from '@/lib/types/scoutingReport';
import { getAdForApartment } from '@/lib/utils/adMatching';
import AdSense from './AdSense';

interface NativeAdPlaceholderProps {
  location: string;
  onClick?: () => void;
  metrics?: ObjectiveMetrics;
  adSlot?: string;
}

export function NativeAdPlaceholder({ location, onClick, metrics, adSlot }: NativeAdPlaceholderProps) {
  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  // If client ID is set, we can render the AdSense component if slot is provided.
  // Otherwise, we fallback to B2B matching.
  if (adsenseClient && adSlot) {
    return (
      <div className="w-full rounded-[20px] p-2 bg-[#f8fafc] dark:bg-[#1e293b]/30 border border-border overflow-hidden flex items-center justify-center min-h-[82px]">
        <AdSense adSlot={adSlot} adFormat="horizontal" responsive="true" />
      </div>
    );
  }

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

  return (
    <div 
      className={`w-full ${ad.themeColor} rounded-[20px] px-5 border border-dashed flex flex-row items-center justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-all cursor-pointer h-[78px] md:h-[86px]`}
      onClick={handleAdClick}
    >
      <div className="absolute top-1.5 right-3 text-[8px] font-bold opacity-60 uppercase tracking-widest sm:hidden">
        Sponsored
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 flex-1 min-w-0 text-left">
        <h4 className={`text-[14px] sm:text-[15px] md:text-[16px] font-extrabold ${ad.textColor} group-hover:opacity-80 transition-opacity leading-tight shrink-0`}>
          {ad.title}
        </h4>
        <span className="hidden sm:inline opacity-40">—</span>
        <p className="text-[11px] sm:text-[12.5px] font-medium text-secondary truncate">
          {ad.description}
        </p>
      </div>
      
      <div className="flex items-center gap-3 shrink-0 ml-4">
        <button className="hidden sm:block text-[11px] font-bold px-3 py-1.5 bg-surface text-primary border border-border rounded-lg shadow-sm hover:bg-slate-50 transition-colors">
          {ad.buttonText}
        </button>
        <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">
          Sponsored
        </span>
      </div>
    </div>
  );
}

