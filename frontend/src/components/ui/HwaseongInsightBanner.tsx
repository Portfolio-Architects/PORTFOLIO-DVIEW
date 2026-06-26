import React from 'react';
import { type ObjectiveMetrics } from '@/lib/types/scoutingReport';
import { getInsightForApartment, type HwaseongInsightMetrics } from '@/lib/utils/hwaseongInsight';

interface HwaseongInsightBannerProps {
  location: string;
  onClick?: () => void;
  metrics?: ObjectiveMetrics;
  isCompact?: boolean;
}

export const HwaseongInsightBanner = React.memo(function HwaseongInsightBanner({
  location,
  onClick,
  metrics,
  isCompact = false,
}: HwaseongInsightBannerProps) {
  // Convert ObjectiveMetrics structure to HwaseongInsightMetrics structure safely
  const mappedMetrics: HwaseongInsightMetrics = {
    yearBuilt: metrics?.yearBuilt,
    distanceToElementary: metrics?.distanceToElementary,
    distanceToSubway: metrics?.distanceToSubway,
    jeonseRate: metrics?.jeonseRate,
  };

  const insight = getInsightForApartment(mappedMetrics);

  const handleBannerClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    } else if (insight.link) {
      e.preventDefault();
      window.open(insight.link, '_blank', 'noopener,noreferrer');
    }
  };

  // Compact layout (e.g. within accordion or sidebar lists)
  if (isCompact) {
    return (
      <button
        type="button"
        className={`w-full ${insight.themeColor} rounded-[20px] px-4 py-3 border flex items-center justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-all cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 h-[78px] md:h-[86px]`}
        onClick={handleBannerClick}
      >
        <div className="flex flex-col flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-1.5 mb-0.5 shrink-0">
            <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white/80 dark:bg-slate-900/60 shadow-sm text-emerald-800 dark:text-emerald-300">
              {insight.badge}
            </span>
          </div>
          <h4 className={`text-[12px] sm:text-[13px] font-extrabold ${insight.textColor} truncate leading-tight`}>
            {insight.title}
          </h4>
          <p className="text-[10px] sm:text-[11px] font-medium text-secondary truncate mt-0.5 opacity-85">
            {insight.description}
          </p>
        </div>
        <div className="flex items-center shrink-0">
          <div className="text-[10px] font-bold px-3 py-1.5 bg-white dark:bg-slate-900 text-primary border border-border rounded-xl shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors select-none text-center">
            {insight.buttonText}
          </div>
        </div>
      </button>
    );
  }

  // Full/Large layout (e.g. within apartment modal, lounge feed)
  return (
    <div
      className={`w-full ${insight.themeColor} rounded-[20px] p-5 md:p-6 border flex flex-col sm:flex-row items-center justify-between gap-4 md:gap-6 shadow-sm hover:shadow-md transition-all duration-300`}
    >
      <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1 min-w-0">
        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-white/80 dark:bg-slate-900/60 shadow-sm text-emerald-800 dark:text-emerald-300 mb-2 shrink-0">
          {insight.badge}
        </span>
        <h3 className={`text-[15px] sm:text-[16px] md:text-[18px] font-extrabold ${insight.textColor} leading-snug mb-1.5`}>
          {insight.title}
        </h3>
        <p className="text-[11px] sm:text-[12px] font-semibold text-secondary leading-relaxed max-w-[660px]">
          {insight.description}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0 w-full sm:w-auto justify-center">
        <button
          type="button"
          className="w-full sm:w-auto text-[11px] sm:text-[12px] font-extrabold px-5 py-2.5 bg-white dark:bg-slate-900 text-primary border border-border rounded-xl shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
          onClick={handleBannerClick}
        >
          {insight.buttonText}
        </button>
      </div>
    </div>
  );
});

HwaseongInsightBanner.displayName = 'HwaseongInsightBanner';
