import React from 'react';
import { createPortal } from 'react-dom';
import { getDisplayAptName } from '@/lib/utils/apartmentMapping';
import type { AptTxSummary } from '@/lib/types/transaction';

export interface MacroMobileDrawerProps {
  isBottomSheetOpen: boolean;
  setIsBottomSheetOpen: (open: boolean) => void;
  selectedTimelineApt: string | null;
  selectedAptSummary: AptTxSummary | null;
  timeframe: "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL";
  setTimeframe: (tf: "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL") => void;
  renderBottomSheetChart: () => React.ReactNode;
}

export const MacroMobileDrawer = React.memo(function MacroMobileDrawer({
  isBottomSheetOpen,
  setIsBottomSheetOpen,
  selectedTimelineApt,
  selectedAptSummary,
  timeframe,
  setTimeframe,
  renderBottomSheetChart,
}: MacroMobileDrawerProps) {
  if (!isBottomSheetOpen || typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center lg:hidden">
      {/* Backdrop Overlay */}
      <button 
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200 cursor-default focus:outline-none border-none outline-none" 
        onClick={() => setIsBottomSheetOpen(false)}
        aria-label="바텀시트 닫기"
      />
      {/* Sheet Box */}
      <div className="relative w-full bg-surface rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border-t border-border flex flex-col max-h-[80vh] z-10 animate-in slide-in-from-bottom duration-300">
        {/* Drag Handle Bar */}
        <button 
          type="button"
          onClick={() => setIsBottomSheetOpen(false)}
          aria-label="바텀시트 닫기"
          className="w-full flex justify-center py-3 shrink-0 cursor-pointer outline-none focus:ring-2 focus:ring-emerald-500/50 bg-transparent border-none"
        >
          <div className="w-12 h-1.5 bg-[#e5e8eb] dark:bg-slate-700 rounded-full" />
        </button>
        {/* Header */}
        <div className="px-5 pb-3 flex items-center justify-between border-b border-border/50 shrink-0">
          <h3 className="text-[15px] font-extrabold text-primary truncate max-w-[80%]">
            {selectedTimelineApt ? `${getDisplayAptName(selectedTimelineApt)} 시세 추이` : "단지 가격 추이"}
          </h3>
          <button 
            onClick={() => setIsBottomSheetOpen(false)}
            className="text-[12px] font-bold text-secondary bg-body hover:bg-[#e5e8eb] px-3 py-1.5 rounded-lg border-none transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
        
        {/* Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 pb-36 flex flex-col gap-4">
          {/* 기간 선택 버튼 (3M, 6M, 1Y, 3Y, 5Y, ALL) */}
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2 shrink-0">
            <span className="text-[11.5px] font-bold text-tertiary">조회 기간</span>
            <div className="flex bg-body p-0.5 rounded-lg text-secondary">
              {(["3M", "6M", "1Y", "3Y", "5Y", "ALL"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-[6px] border-none transition-all cursor-pointer ${
                    timeframe === tf
                      ? "bg-surface text-primary shadow-sm"
                      : "text-tertiary hover:text-secondary"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* 차트 영역 */}
          <div className="w-full h-[200px] relative mb-4 shrink-0">
            {renderBottomSheetChart()}
          </div>

          {/* 커스텀 범례 */}
          <div className="flex items-center justify-center gap-3 mb-5 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#ea6100]/8 text-[#ea6100] rounded-full text-[10px] font-bold border border-[#ea6100]/15">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ea6100]" />
              <span>평균 매매가</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#f9a825]/8 text-[#f9a825] rounded-full text-[10px] font-bold border border-[#f9a825]/15">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f9a825]" />
              <span>평균 전세가</span>
            </div>
          </div>

          {/* 실거래 요약 테이블 */}
          {selectedAptSummary && (() => {
            const avgSale = (selectedAptSummary.avg1MPrice || selectedAptSummary.avg3MPrice || selectedAptSummary.latestPrice || 0);
            const avgRent = (selectedAptSummary.avg1MRentDeposit || selectedAptSummary.avg3MRentDeposit || selectedAptSummary.latestRentDeposit || 0);
            const hasValues = avgSale > 0 && avgRent > 0;
            const gap = hasValues ? avgSale - avgRent : 0;
            
            const gapEok = Math.floor(gap / 10000);
            const gapMan = gap % 10000;
            const gapText = gapEok > 0 ? `${gapEok}억${gapMan > 0 ? ` ${gapMan.toLocaleString()}` : ''}` : `${gapMan.toLocaleString()}만`;
            
            const jeonseRate = hasValues ? (avgRent / avgSale) * 100 : 0;
            const jeonseRateText = `${jeonseRate.toFixed(1)}%`;
            
            return (
              <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-border/50 rounded-2xl p-3.5 flex flex-col gap-3 shrink-0">
                <div className="flex items-center justify-between border-b border-border/30 pb-2 flex-wrap gap-2">
                  <span className="inline-flex items-center justify-center bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold text-[11px] px-2 py-0.5 rounded-[5px] shrink-0 gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                    실거래 요약
                  </span>
                  <span className="text-[10px] text-tertiary font-bold px-2 py-0.5 rounded border border-border/30">
                    최근 30일 매매 {selectedAptSummary.avg1MTxCount || 0}건
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 divide-x divide-border/40 text-center">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-tertiary font-medium">평균 매매가</span>
                    <span className="text-[12.5px] font-black text-primary">
                      {avgSale > 0 ? `${(avgSale / 10000).toFixed(1)}억` : "-"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-tertiary font-medium">평균 전세가</span>
                    <span className="text-[12.5px] font-black text-[#ea6100]">
                      {avgRent > 0 ? `${(avgRent / 10000).toFixed(1)}억` : "-"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-tertiary font-medium">실구매 갭</span>
                    <span className="text-[12.5px] font-black text-teal-600 dark:text-teal-400">
                      {hasValues ? gapText : "-"}
                    </span>
                  </div>
                </div>
                {hasValues && (
                  <div className="text-[10.5px] text-center text-secondary font-bold pt-1 border-t border-border/20">
                    전세가율: <span className="text-[#ea6100]">{jeonseRateText}</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>,
    document.body
  );
});
