import React from "react";
import { Info } from "lucide-react";

export interface LocalNoticeItem {
  id: string;
  title: string;
  url: string;
  dept: string;
  date: string;
  isDongtan: boolean;
  source?: 'bbs' | 'gosi' | 'rail' | 'dong' | 'culture';
}

interface TrafficNoticeBoardProps {
  railStrategyNotices: LocalNoticeItem[];
  tramNotices: LocalNoticeItem[];
  className?: string;
}

export function TrafficNoticeBoard({
  railStrategyNotices,
  tramNotices,
  className = '',
}: TrafficNoticeBoardProps) {
  return (
    <div className={`w-full h-full bg-elevated rounded-2xl p-4 sm:p-5 flex flex-col gap-2.5 relative justify-start ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-200/70 dark:border-slate-800/80 pb-3 shrink-0">
        <div className="relative group/title flex items-center gap-1.5 min-w-0">
          <h4 className="text-[14px] font-extrabold text-primary tracking-tight truncate">
            동탄 철도 교통 게시판
          </h4>
          <Info className="w-3.5 h-3.5 shrink-0 text-tertiary cursor-pointer hover:text-secondary transition-colors" />
          <div 
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-full left-0 mb-2 w-[280px] p-3 bg-[#191f28] text-white text-[12px] font-medium leading-[1.5] rounded-xl shadow-xl opacity-0 invisible group-hover/title:opacity-100 group-hover/title:visible transition-all duration-200 z-50 normal-case tracking-normal whitespace-normal break-keep"
          >
            동탄 전역 및 행정동별 철도(GTX, 트램, 인동선, SRT) 및 대중교통 관련 실시간 고시·공고와 주요 교통 추진 현황 뉴스판입니다.
            <div className="absolute top-full left-4 border-[6px] border-transparent border-t-[#191f28]"></div>
          </div>
        </div>
      </div>

      {/* 소식 리스트 */}
      <div className="flex flex-col gap-2 flex-1 justify-start min-w-0">
        {/* 1. 철도전략과 소식 */}
        <div className="flex flex-col gap-1">
          <div className="text-[12.5px] font-black text-secondary/80 flex items-center gap-1.5 px-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            철도전략과 소식
          </div>
          {railStrategyNotices.length === 0 ? (
            <div className="text-center py-4 text-tertiary text-[11.5px] font-medium bg-surface rounded-xl border border-dashed border-slate-200/70 dark:border-slate-800/80">
              관련 공지사항이 없습니다.
            </div>
          ) : (
            railStrategyNotices.slice(0, 2).map((item: LocalNoticeItem) => (
              <button
                key={item.id}
                type="button"
                aria-label={`공고: ${item.title}, 날짜: ${item.date}`}
                onClick={() => {
                  if (item.url && item.url.startsWith('http')) {
                    window.open(item.url, '_blank', 'noopener,noreferrer');
                  } else {
                    window.location.href = `/news?notice=${item.id}`;
                  }
                }}
                className="flex items-center justify-between py-1 px-2 hover:bg-surface rounded-xl transition-all duration-200 cursor-pointer group/item active:scale-[0.995] border border-transparent hover:border-slate-200/70 dark:hover:border-slate-800/80 min-w-0 w-full text-left bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
              >
                {/* Left: Title */}
                <div className="flex items-center min-w-0 mr-2">
                  <span className="text-[13.5px] sm:text-[14px] font-bold text-primary transition-colors truncate" title={item.title}>
                    {item.title}
                  </span>
                </div>
                {/* Right: Date */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11.5px] text-tertiary font-semibold text-right shrink-0 tabular-nums">
                    {item.date.substring(5, 10).replace("-", "/")}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* 구분선 */}
        <div className="border-t border-slate-200/70 dark:border-slate-800/80 my-0.5"></div>

        {/* 2. 트램건설추진단 소식 */}
        <div className="flex flex-col gap-1">
          <div className="text-[12.5px] font-black text-secondary/80 flex items-center gap-1.5 px-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500"></span>
            트램건설추진단 소식
          </div>
          {tramNotices.length === 0 ? (
            <div className="text-center py-4 text-tertiary text-[11.5px] font-medium bg-surface rounded-xl border border-dashed border-slate-200/70 dark:border-slate-800/80">
              관련 공지사항이 없습니다.
            </div>
          ) : (
            tramNotices.slice(0, 2).map((item: LocalNoticeItem) => (
              <button
                key={item.id}
                type="button"
                aria-label={`공고: ${item.title}, 날짜: ${item.date}`}
                onClick={() => {
                  window.open(item.url, '_blank', 'noopener,noreferrer');
                }}
                className="flex items-center justify-between py-1 px-2 hover:bg-surface rounded-xl transition-all duration-200 cursor-pointer group/item active:scale-[0.995] border border-transparent hover:border-slate-200/70 dark:hover:border-slate-800/80 min-w-0 w-full text-left bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
              >
                {/* Left: Title */}
                <div className="flex items-center min-w-0 mr-2">
                  <span className="text-[13.5px] sm:text-[14px] font-bold text-primary transition-colors truncate" title={item.title}>
                    {item.title}
                  </span>
                </div>
                {/* Right: Date */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11.5px] text-tertiary font-semibold text-right shrink-0 tabular-nums">
                    {item.date.substring(5, 10).replace("-", "/")}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
