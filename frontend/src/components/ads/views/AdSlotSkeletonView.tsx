'use client';

import React from 'react';

export interface AdSlotSkeletonViewProps {
  isVisible?: boolean;
  format?: string;
  minHeightClass?: string;
}

/**
 * Pure Presentational View for AdSlot Shimmer Skeleton (Zero-CLS Overlay)
 * Enforces Ad Money v5.0 borderless soft surface (`bg-[#f9fafb] dark:bg-[#17171c] rounded-2xl`).
 */
export function AdSlotSkeletonView({ isVisible = true }: AdSlotSkeletonViewProps = {}) {
  if (!isVisible) return null;

  return (
    <div
      data-testid="ad-slot-skeleton"
      className="absolute inset-0 flex flex-col items-center justify-center bg-[#f9fafb] dark:bg-[#17171c] rounded-2xl animate-pulse pointer-events-none p-4 text-center z-0"
      aria-hidden="true"
    >
      <div className="w-16 h-3 bg-slate-300/80 dark:bg-slate-700/80 rounded mb-2" />
      <div className="w-48 sm:w-64 h-3.5 bg-slate-200/80 dark:bg-slate-700/50 rounded" />
    </div>
  );
}

export default AdSlotSkeletonView;
