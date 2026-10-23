'use client';

import React from 'react';
import { getFormatDimensions, type AdSlotFormat } from '../core/adSlotGeometry';

export interface AdSlotPlaceholderViewProps {
  format: AdSlotFormat;
  slotId?: string;
  minHeightClass: string;
}

export function AdSlotPlaceholderView({
  format,
  slotId,
  minHeightClass,
}: AdSlotPlaceholderViewProps) {
  return (
    <div
      data-testid="ad-slot-dev-placeholder"
      className={`w-full h-full flex flex-col items-center justify-center p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 text-center select-none ${minHeightClass}`}
    >
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold mb-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        [광고 슬롯 미리보기 - 개발/테스트 모드]
      </div>
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        포맷: <span className="font-mono text-blue-600 dark:text-blue-400">{format}</span>
        {' '}| 크기 규격: <span className="font-mono text-slate-600 dark:text-slate-400">{getFormatDimensions(format)}</span>
        {slotId && (
          <> | 슬롯 ID: <span className="font-mono text-slate-600 dark:text-slate-400">{slotId}</span></>
        )}
      </p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
        NEXT_PUBLIC_ADSENSE_CLIENT_ID 환경변수가 설정되면 실광고가 송출됩니다.
      </p>
    </div>
  );
}

export default AdSlotPlaceholderView;
