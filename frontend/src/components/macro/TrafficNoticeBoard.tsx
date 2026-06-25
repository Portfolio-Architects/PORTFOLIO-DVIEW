import React from "react";
import { Info, Train } from "lucide-react";

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
}

export function TrafficNoticeBoard({ railStrategyNotices, tramNotices }: TrafficNoticeBoardProps) {
  return (
    <div className="w-full bg-surface rounded-2xl border border-border p-4 sm:p-5 flex flex-col gap-4 relative shadow-sm md:h-[350px] justify-start">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-border/40 pb-3 shrink-0">
        <div className="relative group/title flex items-center gap-1.5 min-w-0">
          <span className="bg-[#00d29d]/10 dark:bg-[#00d29d]/25 text-[#00b386] dark:text-[#00d29d] font-extrabold text-[10.5px] px-2.5 py-0.5 rounded-[8px] shrink-0">
            철도·교통
          </span>
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
      <div className="flex flex-col gap-2.5 flex-1 justify-start py-1.5 overflow-hidden">
        {/* 1. 철도전략과 소식 */}
        <div className="flex flex-col gap-1.5">
          <div className="text-[12.5px] font-black text-secondary/80 flex items-center gap-1.5 px-2 mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00d29d] shadow-[0_0_4px_rgba(0,210,157,0.4)]"></span>
            철도전략과 소식
          </div>
          {railStrategyNotices.length === 0 ? (
            <div className="text-center py-4 text-tertiary text-[11.5px] font-medium bg-neutral-50/50 dark:bg-zinc-900/10 rounded-xl border border-dashed border-border/30">
              관련 공지사항이 없습니다.
            </div>
          ) : (
            railStrategyNotices.slice(0, 2).map((item: LocalNoticeItem) => (
              <button
                key={item.id}
                type="button"
                aria-label={`공고: ${item.title}, 날짜: ${item.date}`}
                onClick={() => {
                  window.location.href = `/news?notice=${item.id}`;
                }}
                className="flex items-center justify-between py-1.5 px-2.5 hover:bg-body/60 dark:hover:bg-zinc-900/30 rounded-xl transition-all duration-200 cursor-pointer group/item active:scale-[0.995] border border-transparent hover:border-border/30 min-w-0 w-full text-left bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-[#00d29d]/50"
              >
                {/* Left: Icon & Title */}
                <div className="flex items-center gap-2.5 min-w-0 mr-3">
                  <div className="w-6 h-6 rounded-lg bg-[#00d29d]/10 text-[#00b386] flex items-center justify-center shrink-0">
                    <Train size={12} />
                  </div>
                  <span className="text-[14px] font-bold text-primary group-hover/item:text-[#00d29d] transition-colors truncate" title={item.title}>
                    {item.title}
                  </span>
                </div>
                {/* Right: Date */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11.5px] text-tertiary font-semibold w-[42px] text-right shrink-0">
                    {item.date.substring(5, 10).replace("-", "/")}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* 구분선 */}
        <div className="border-t border-border/30 my-1.5 mx-2"></div>

        {/* 2. 트램건설추진단 소식 */}
        <div className="flex flex-col gap-1.5">
          <div className="text-[12.5px] font-black text-secondary/80 flex items-center gap-1.5 px-2 mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.4)]"></span>
            트램건설추진단 소식
          </div>
          {tramNotices.length === 0 ? (
            <div className="text-center py-4 text-tertiary text-[11.5px] font-medium bg-neutral-50/50 dark:bg-zinc-900/10 rounded-xl border border-dashed border-border/30">
              관련 공지사항이 없습니다.
            </div>
          ) : (
            tramNotices.slice(0, 2).map((item: LocalNoticeItem) => (
              <button
                key={item.id}
                type="button"
                aria-label={`공고: ${item.title}, 날짜: ${item.date}`}
                onClick={() => {
                  window.location.href = `/news?notice=${item.id}`;
                }}
                className="flex items-center justify-between py-1.5 px-2.5 hover:bg-body/60 dark:hover:bg-zinc-900/30 rounded-xl transition-all duration-200 cursor-pointer group/item active:scale-[0.995] border border-transparent hover:border-border/30 min-w-0 w-full text-left bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
              >
                {/* Left: Icon & Title */}
                <div className="flex items-center gap-2.5 min-w-0 mr-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <Train size={12} />
                  </div>
                  <span className="text-[14px] font-bold text-primary group-hover/item:text-emerald-600 transition-colors truncate" title={item.title}>
                    {item.title}
                  </span>
                </div>
                {/* Right: Date */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11.5px] text-tertiary font-semibold w-[42px] text-right shrink-0">
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
