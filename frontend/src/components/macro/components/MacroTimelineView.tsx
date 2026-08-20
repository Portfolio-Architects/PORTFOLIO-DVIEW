import React from 'react';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { normalizeAptName, isSameApartment } from '@/lib/utils/apartmentMapping';
import { TimelineFilterControls } from './MacroControls';

export interface TimelineItem {
  aptName: string;
  dong: string;
  priceEok: string;
  priceVal: number;
  areaPyeong: number;
  area: number;
  floor: number;
  type: string;
  delta: number;
  deltaPercent?: number;
  prevPriceVal?: number;
  areaLabelM2?: string;
  areaLabelPyeong?: string;
  displayAptName?: string;
}

export interface TimelineGroup {
  dateStr: string;
  timestamp: number;
  items: TimelineItem[];
}

export interface MacroTimelineViewProps {
  displayedTimelineData: TimelineGroup[];
  selectedTimelineApt: string | null;
  nameMapping?: Record<string, string>;
  areaUnit: string;
  isMobileViewport: boolean;
  totalTimelineCardsCount: number;
  visibleTimelineCount: number;
  setVisibleTimelineCount: React.Dispatch<React.SetStateAction<number>>;
  onCardHover: (aptName: string, dong: string) => void;
  onCardClick: (aptName: string) => void;
  onDetailsClick: (aptName: string) => void;
  onDetailsHover: (aptName: string, dong: string) => void;
  timelineDongFilter: string;
  setTimelineDongFilter: (dong: string) => void;
  timelineAptFilter: string;
  setTimelineAptFilter: (apt: string) => void;
  availableDongs: string[];
  availableApts: string[];
  renderTimelineItemCard: (item: TimelineItem, isSelected: boolean) => React.ReactNode;
}

export const MacroTimelineView = React.memo(function MacroTimelineView({
  displayedTimelineData,
  selectedTimelineApt,
  nameMapping,
  isMobileViewport,
  totalTimelineCardsCount,
  visibleTimelineCount,
  setVisibleTimelineCount,
  timelineDongFilter,
  setTimelineDongFilter,
  timelineAptFilter,
  setTimelineAptFilter,
  availableDongs,
  availableApts,
  renderTimelineItemCard,
}: MacroTimelineViewProps) {
  return (
    <div className="w-full md:w-1/2 flex flex-col gap-4 min-w-0 md:h-full max-w-full box-border">
      {/* Daily Timeline Card */}
      <div className="flex flex-col bg-surface rounded-2xl shadow-sm border border-border px-3.5 sm:px-5 py-4 sm:py-6 md:h-full md:min-h-[420px] min-w-0 max-w-full overflow-hidden w-full box-border">
        <div className="flex flex-row items-center justify-between gap-1.5 sm:gap-2.5 mb-3.5 sm:mb-4 w-full">
          <h2 className="text-[13.5px] xs:text-[14.5px] sm:text-[18px] font-extrabold text-primary tracking-tight whitespace-nowrap shrink-0">
            일자별 최근 실거래
          </h2>
          <TimelineFilterControls
            timelineDongFilter={timelineDongFilter}
            setTimelineDongFilter={setTimelineDongFilter}
            timelineAptFilter={timelineAptFilter}
            setTimelineAptFilter={setTimelineAptFilter}
            availableDongs={availableDongs}
            availableApts={availableApts}
          />
        </div>

        <div className={`flex-1 ${isMobileViewport ? "max-h-none overflow-visible" : "max-h-[520px] md:max-h-none overflow-y-auto"} pr-0.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/60 [&::-webkit-scrollbar-thumb]:rounded-full flex flex-col gap-4 mt-2 min-h-0 w-full box-border`}>
          {displayedTimelineData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-tertiary text-[14px]">
              최근 실거래 내역이 없습니다.
            </div>
          ) : (
            displayedTimelineData.map((group) => {
              const isGroupSelected = group.items.some(item => 
                selectedTimelineApt ? (
                  selectedTimelineApt === item.aptName ||
                  normalizeAptName(selectedTimelineApt) === normalizeAptName(item.aptName) ||
                  isSameApartment(selectedTimelineApt, item.aptName, nameMapping)
                ) : false
              );
              return (
                <div key={group.dateStr} className="flex flex-col gap-3 relative pl-5 pr-5 border-l-2 border-slate-100 dark:border-slate-800/80 w-full box-border">
                  {/* Timeline Dot */}
                  <div className={`absolute left-[-6.5px] top-1.5 w-3 h-3 rounded-full border-2 border-surface transition-all duration-300 ${
                    isGroupSelected
                      ? "bg-[#ea6100] dark:bg-[#ea6100] ring-4 ring-[#ea6100]/15 scale-110"
                      : "bg-[#cbd5e1] dark:bg-slate-600"
                  }`} />
                  
                  {/* Date Heading */}
                  <h3 className="text-[13.5px] font-extrabold text-primary flex items-center gap-1.5 mb-0.5">
                    <Calendar size={13.5} className="text-tertiary" />
                    {group.dateStr}
                  </h3>

                  {/* Items */}
                  <div className="flex flex-col gap-2.5 w-full box-border">
                    {group.items.map((item, idx) => {
                      const isSelected = !!selectedTimelineApt && (
                        selectedTimelineApt === item.aptName ||
                        normalizeAptName(selectedTimelineApt) === normalizeAptName(item.aptName) ||
                        isSameApartment(selectedTimelineApt, item.aptName, nameMapping)
                      );
                      return (
                        <React.Fragment key={`${item.aptName}-${idx}`}>
                          {renderTimelineItemCard(item, isSelected)}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {totalTimelineCardsCount > 3 && (
          <button
            onClick={() => {
              if (totalTimelineCardsCount > visibleTimelineCount) {
                setVisibleTimelineCount((prev) => prev + 20);
              } else {
                setVisibleTimelineCount(isMobileViewport ? 3 : 8);
              }
            }}
            className="w-full mt-4 py-2.5 bg-body hover:bg-body/80 border border-border/40 text-[12.5px] font-bold text-secondary rounded-[12px] flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-sm active:scale-[0.99]"
          >
            {totalTimelineCardsCount > visibleTimelineCount ? (
              <>
                <span>
                  최근 실거래 더보기 ({Math.min(20, totalTimelineCardsCount - visibleTimelineCount)}개 더보기 / 남은 {totalTimelineCardsCount - visibleTimelineCount}개)
                </span>
                <ChevronDown size={14} />
              </>
            ) : (
              <>
                <span>접기</span>
                <ChevronUp size={14} />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
});
