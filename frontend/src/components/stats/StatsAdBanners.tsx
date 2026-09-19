'use client';

import React from 'react';
import { AdSlot } from '@/components/ads/AdSlot';

interface StatsAdBannerProps {
  testMode?: boolean;
  className?: string;
}

/**
 * 1. Filter Bottom Ad Banner
 * Placed below the filter controls / KPI summary cards.
 * Format: horizontal-strip (min-h-[90px] sm:min-h-[100px])
 * Maintained 24px vertical margin to prevent accidental clicks on filter buttons.
 */
export function FilterBottomAdBanner({ testMode = false, className = '' }: StatsAdBannerProps) {
  return (
    <div
      data-testid="ad-placement-filter-bottom"
      className={`my-6 w-full ${className}`}
    >
      <AdSlot
        slotId="stat-slot-filter-bottom"
        format="horizontal-strip"
        testMode={testMode}
        fallbackType="minimal"
        className="rounded-xl overflow-hidden"
      />
    </div>
  );
}

/**
 * 2. Mid-Feed Ad Banner
 * Placed between Time-Series Chart and Ranking Board.
 * Format: in-feed (min-h-[140px] sm:min-h-[160px])
 * Natural reading break for users transitioning from macro trends to micro rankings.
 */
export function MidFeedAdBanner({ testMode = false, className = '' }: StatsAdBannerProps) {
  return (
    <div
      data-testid="ad-placement-mid-feed"
      className={`my-6 w-full ${className}`}
    >
      <AdSlot
        slotId="stat-slot-mid-feed"
        format="in-feed"
        testMode={testMode}
        fallbackType="minimal"
        className="rounded-xl overflow-hidden"
      />
    </div>
  );
}

/**
 * 3. Ranking Break In-Feed Ad Banner
 * Placed inside ranking list after rank 3.
 * Format: in-feed (min-h-[140px] sm:min-h-[160px])
 * Highly engaging native placement within list browsing flow.
 */
export function RankingBreakAdBanner({ testMode = false, className = '' }: StatsAdBannerProps) {
  return (
    <div
      data-testid="ad-placement-ranking-break"
      className={`py-2 w-full ${className}`}
    >
      <AdSlot
        slotId="stat-slot-ranking-break"
        format="in-feed"
        testMode={testMode}
        fallbackType="minimal"
        className="rounded-xl overflow-hidden"
      />
    </div>
  );
}

/**
 * 4. Bottom Anchor Ad Banner
 * Placed at the end of the report content, above footer.
 * Format: banner (min-h-[250px])
 * Captures high-dwell-time engaged users who finished the full report.
 */
export function BottomAnchorAdBanner({ testMode = false, className = '' }: StatsAdBannerProps) {
  return (
    <div
      data-testid="ad-placement-bottom-anchor"
      className={`my-8 w-full ${className}`}
    >
      <AdSlot
        slotId="stat-slot-bottom-anchor"
        format="banner"
        testMode={testMode}
        fallbackType="minimal"
        className="rounded-2xl overflow-hidden"
      />
    </div>
  );
}

export type StatsAdPlacement = 'filter-bottom' | 'mid-feed' | 'ranking-break' | 'bottom-anchor';

export function StatsAdBanner({
  placement,
  testMode = false,
  className = '',
}: StatsAdBannerProps & { placement: StatsAdPlacement }) {
  switch (placement) {
    case 'filter-bottom':
      return <FilterBottomAdBanner testMode={testMode} className={className} />;
    case 'mid-feed':
      return <MidFeedAdBanner testMode={testMode} className={className} />;
    case 'ranking-break':
      return <RankingBreakAdBanner testMode={testMode} className={className} />;
    case 'bottom-anchor':
      return <BottomAnchorAdBanner testMode={testMode} className={className} />;
    default:
      return null;
  }
}

export default StatsAdBanner;
