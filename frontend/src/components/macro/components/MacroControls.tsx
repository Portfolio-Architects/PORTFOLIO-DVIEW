import React from 'react';
import { Settings } from 'lucide-react';
import { getDisplayAptName } from '@/lib/utils/apartmentMapping';

export interface TimelineFilterControlsProps {
  timelineDongFilter: string;
  setTimelineDongFilter: (dong: string) => void;
  timelineAptFilter: string;
  setTimelineAptFilter: (apt: string) => void;
  availableDongs: string[];
  availableApts: string[];
}

export const TimelineFilterControls = React.memo(function TimelineFilterControls({
  timelineDongFilter,
  setTimelineDongFilter,
  timelineAptFilter,
  setTimelineAptFilter,
  availableDongs,
  availableApts,
}: TimelineFilterControlsProps) {
  return (
    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 min-w-0">
      <select
        value={timelineDongFilter}
        onChange={(e) => setTimelineDongFilter(e.target.value)}
        className="px-1 sm:px-2 h-[25px] sm:h-[28px] bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-border/80 text-secondary rounded-xl text-[9px] xs:text-[10px] sm:text-[11px] font-extrabold cursor-pointer transition-colors outline-none focus:ring-1 focus:ring-[#ea6100] focus:border-[#ea6100] shadow-sm shrink-0 min-w-0 w-[72px] xs:w-[80px] sm:w-[110px] truncate"
      >
        <option value="전체">전체 동</option>
        {availableDongs.map((dong) => (
          <option key={dong} value={dong}>
            {dong}
          </option>
        ))}
      </select>
      <select
        value={timelineAptFilter}
        onChange={(e) => setTimelineAptFilter(e.target.value)}
        className="px-1 sm:px-2 h-[25px] sm:h-[28px] bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-border/80 text-secondary rounded-xl text-[9px] xs:text-[10px] sm:text-[11px] font-extrabold cursor-pointer transition-colors outline-none focus:ring-1 focus:ring-[#ea6100] focus:border-[#ea6100] shadow-sm shrink-0 min-w-0 w-[80px] xs:w-[92px] sm:w-[140px] truncate"
      >
        <option value="전체">전체 단지</option>
        {availableApts.map((apt) => (
          <option key={apt} value={apt}>
            {getDisplayAptName(apt).length > 10 ? getDisplayAptName(apt).substring(0, 10) + "..." : getDisplayAptName(apt)}
          </option>
        ))}
      </select>
    </div>
  );
});

export interface TimeframeSelectorProps {
  timeframe: "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL";
  setTimeframe: (tf: "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL") => void;
}

export const TimeframeSelector = React.memo(function TimeframeSelector({
  timeframe,
  setTimeframe,
}: TimeframeSelectorProps) {
  return (
    <div className="flex bg-body p-0.5 rounded-lg shadow-inner self-start sm:self-auto shrink-0 mt-1 sm:mt-0">
      {(["3M", "6M", "1Y", "3Y", "5Y", "ALL"] as const).map((tf) => (
        <button
          key={tf}
          onClick={() => setTimeframe(tf)}
          className={`px-1.5 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[10.5px] font-extrabold rounded-md transition-all duration-200 cursor-pointer ${
            timeframe === tf
              ? "bg-surface text-primary shadow-sm"
              : "text-tertiary hover:text-secondary"
          }`}
        >
          {tf}
        </button>
      ))}
    </div>
  );
});

export interface FavoriteOrderEditorProps {
  showOrderEditor: boolean;
  setShowOrderEditor: (show: boolean) => void;
  orderEditorRef: React.RefObject<HTMLDivElement | null>;
  favoritesArray: string[];
  draggedIndex: number | null;
  handleDragStart: (e: React.DragEvent, index: number) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDragEnd: () => void;
}

export const FavoriteOrderEditor = React.memo(function FavoriteOrderEditor({
  showOrderEditor,
  setShowOrderEditor,
  orderEditorRef,
  favoritesArray,
  draggedIndex,
  handleDragStart,
  handleDragOver,
  handleDragEnd,
}: FavoriteOrderEditorProps) {
  return (
    <div className="relative flex items-center" ref={orderEditorRef}>
      <button
        onClick={() => setShowOrderEditor(!showOrderEditor)}
        title="관심 단지 정렬 순서 편집"
        className="w-7 h-7 flex items-center justify-center bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-border/80 text-secondary hover:text-primary rounded-xl transition-colors cursor-pointer outline-none focus:ring-1 focus:ring-[#ea6100] shadow-sm shrink-0"
      >
        <Settings size={13} />
      </button>

      {showOrderEditor && (
        <div className="absolute right-0 top-[32px] z-[50] w-[260px] max-w-[calc(100vw-32px)] max-h-[320px] overflow-y-auto bg-surface border border-border rounded-2xl shadow-xl p-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="text-[11px] text-secondary font-extrabold mb-2 border-b border-border/60 pb-1.5 flex justify-between items-center">
            <span>⭐ 관심 단지 순서 편집</span>
            <span className="text-[9px] text-tertiary font-normal">드래그하여 순서 변경</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {favoritesArray.map((fav, index) => (
              <div
                key={fav}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex justify-between items-center px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-border/40 rounded-xl cursor-grab active:cursor-grabbing text-[11px] font-bold text-primary select-none transition-colors ${
                  draggedIndex === index ? "opacity-40 border-dashed border-[#ea6100]" : ""
                }`}
              >
                <span className="truncate pr-2">{getDisplayAptName(fav)}</span>
                <span className="text-tertiary text-[10px] shrink-0 font-normal">☰</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
