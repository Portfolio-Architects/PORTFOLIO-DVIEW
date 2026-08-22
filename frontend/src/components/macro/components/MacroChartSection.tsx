import React from 'react';
import { getDisplayAptName } from '@/lib/utils/apartmentMapping';
import { TimeframeSelector, FavoriteOrderEditor } from './MacroControls';

export interface MacroChartSectionProps {
  userFavorites?: Set<string>;
  isDefaultAptSettingUp: boolean;
  mounted: boolean;
  selectedTimelineApt: string | null;
  setSelectedTimelineApt: (apt: string | null) => void;
  preloadApartmentModal: () => void;
  favoritesArray: string[];
  defaultTimelineApts: string[];
  onSelectApt?: (name: string, dong?: string) => void;
  onHoverApt?: (name: string) => void;
  timeframe: "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL";
  setTimeframe: (tf: "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL") => void;
  isAptTxLoading: boolean;
  aptRealTxData: any[] | null;
  mainLineData: any[];
  mainXTicks: string[];
  mainYTicks: number[];
  renderChart: () => React.ReactNode;
  trafficNoticeBoardNode?: React.ReactNode;
  showOrderEditor: boolean;
  setShowOrderEditor: (show: boolean) => void;
  orderEditorRef: React.RefObject<HTMLDivElement | null>;
  draggedIndex: number | null;
  handleDragStart: (e: React.DragEvent, index: number) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDragEnd: () => void;
  className?: string;
}

export const MacroChartSection = React.memo(function MacroChartSection({
  userFavorites,
  isDefaultAptSettingUp,
  mounted,
  selectedTimelineApt,
  setSelectedTimelineApt,
  preloadApartmentModal,
  favoritesArray,
  defaultTimelineApts,
  onSelectApt,
  onHoverApt,
  timeframe,
  setTimeframe,
  isAptTxLoading,
  aptRealTxData,
  renderChart,
  trafficNoticeBoardNode,
  showOrderEditor,
  setShowOrderEditor,
  orderEditorRef,
  draggedIndex,
  handleDragStart,
  handleDragOver,
  handleDragEnd,
  className,
}: MacroChartSectionProps) {
  return (
    <div className={`w-full flex flex-col gap-4 min-w-0 lg:h-[586px] box-border ${className || ''}`}>
      {/* Right Panel: Interactive Market Feed & Trend */}
      <div className="w-full flex flex-col bg-surface rounded-[20px] sm:rounded-[24px] shadow-sm border border-border/80 p-4 sm:p-6 flex-1 lg:h-[586px] min-h-[460px] min-w-0 box-border justify-between">
        <div className="flex-1 flex flex-col min-h-[260px] md:min-h-[300px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-border/40 w-full min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <h3 className="text-[14px] sm:text-[15px] font-black text-primary tracking-tight flex items-center gap-1.5 break-keep">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ea6100] shrink-0" />
                <span>{userFavorites && userFavorites.size > 0 ? "내 관심 단지 시세 추이" : "동탄 대표 아파트 시세 추이"}</span>
              </h3>

                {isDefaultAptSettingUp ? (
                  <div className="w-[130px] sm:w-[190px] h-[28px] bg-gradient-to-r from-zinc-100 to-zinc-50 dark:from-zinc-800/50 dark:to-zinc-800/30 rounded-xl animate-pulse border border-border/10" />
                ) : (
                  mounted && (
                    userFavorites && userFavorites.size > 0 ? (
                      <div className="relative flex items-center gap-1">
                        <select
                          value={selectedTimelineApt || ""}
                          onFocus={preloadApartmentModal}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedTimelineApt(val === "" ? null : val);
                          }}
                          className="px-2.5 h-[28px] bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-border/80 text-secondary rounded-xl text-[11px] font-extrabold cursor-pointer transition-colors outline-none focus:ring-1 focus:ring-[#ea6100] focus:border-[#ea6100] shadow-sm w-[130px] sm:w-[190px] truncate shrink-0"
                        >
                          <option value="">전체 추이 보기</option>
                          {favoritesArray.map((fav) => (
                            <option key={fav} value={fav}>
                              {getDisplayAptName(fav)}
                            </option>
                          ))}
                        </select>

                        <FavoriteOrderEditor
                          showOrderEditor={showOrderEditor}
                          setShowOrderEditor={setShowOrderEditor}
                          orderEditorRef={orderEditorRef}
                          favoritesArray={favoritesArray}
                          draggedIndex={draggedIndex}
                          handleDragStart={handleDragStart}
                          handleDragOver={handleDragOver}
                          handleDragEnd={handleDragEnd}
                        />
                      </div>
                    ) : (
                      <div className="relative flex items-center gap-1">
                        <select
                          value={selectedTimelineApt || ""}
                          onFocus={preloadApartmentModal}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedTimelineApt(val === "" ? null : val);
                          }}
                          className="px-2.5 h-[28px] bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-border/80 text-secondary rounded-xl text-[11px] font-extrabold cursor-pointer transition-colors outline-none focus:ring-1 focus:ring-[#ea6100] focus:border-[#ea6100] shadow-sm w-[130px] sm:w-[190px] truncate shrink-0"
                        >
                          <option value="">전체 추이 보기</option>
                          {defaultTimelineApts.map((apt) => (
                            <option key={apt} value={apt}>
                              {getDisplayAptName(apt)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )
                  )
                )}

                {selectedTimelineApt && !isDefaultAptSettingUp && (
                  <button
                    onClick={() => onSelectApt && onSelectApt(selectedTimelineApt)}
                    onMouseEnter={() => onHoverApt && onHoverApt(selectedTimelineApt)}
                    onTouchStart={() => onHoverApt && onHoverApt(selectedTimelineApt)}
                    className="px-2.5 py-1 bg-[#fff3e0] hover:bg-[#fff3e0]/80 text-[#ea6100] border-none rounded-xl text-[11px] font-extrabold cursor-pointer transition-colors shrink-0 flex items-center gap-1 shadow-sm"
                  >
                    상세 리포트 보기 ➔
                  </button>
                )}
              </div>

            <TimeframeSelector
              timeframe={timeframe}
              setTimeframe={setTimeframe}
            />
          </div>

          <div className="w-full flex-1 min-h-[240px] md:min-h-[280px] relative overflow-hidden mt-2 sm:mt-0">
            {isDefaultAptSettingUp || (isAptTxLoading && !aptRealTxData && !!selectedTimelineApt) ? (
              <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center bg-zinc-50/30 dark:bg-zinc-900/10 border border-border/30 rounded-2xl animate-pulse relative overflow-hidden">
                {/* Background blur glow */}
                <div className="absolute w-[180px] h-[180px] rounded-full bg-[#ea6100]/4 blur-[60px] top-1/2 left-1/3 -translate-y-1/2 pointer-events-none" />
                <div className="absolute w-[180px] h-[180px] rounded-full bg-[#f9a825]/4 blur-[60px] top-1/2 right-1/3 -translate-y-1/2 pointer-events-none" />
                
                <div className="flex items-center gap-1.5 mb-3.5 flex-none">
                  <div className="w-1.5 h-6 bg-[#ea6100]/30 rounded-full animate-bounce duration-500 delay-100" />
                  <div className="w-1.5 h-10 bg-[#ea6100]/40 rounded-full animate-bounce duration-500 delay-200" />
                  <div className="w-1.5 h-14 bg-[#ea6100]/60 rounded-full animate-bounce duration-500 delay-300" />
                  <div className="w-1.5 h-10 bg-[#f9a825]/50 rounded-full animate-bounce duration-500 delay-400" />
                  <div className="w-1.5 h-12 bg-[#f9a825]/60 rounded-full animate-bounce duration-500 delay-500" />
                  <div className="w-1.5 h-8 bg-[#f9a825]/40 rounded-full animate-bounce duration-500 delay-600" />
                </div>

                <span className="text-secondary text-[12.5px] font-extrabold mb-1.5 tracking-tight">관심 단지 정보를 분석하고 있습니다...</span>
                <span className="text-[10px] text-tertiary font-bold opacity-75">내 자산 가치에 맞춘 전용 리포트를 생성하는 중입니다.</span>
              </div>
            ) : (
              renderChart()
            )}
          </div>

          {/* Custom Legend Badges */}
          {isDefaultAptSettingUp ? (
            <div className="flex items-center justify-center gap-3 mt-1.5 flex-none">
              <div className="w-20 h-5 bg-gradient-to-r from-zinc-100 to-zinc-50 dark:from-zinc-800/50 dark:to-zinc-800/30 rounded-full animate-pulse border border-border/20" />
              <div className="w-20 h-5 bg-gradient-to-r from-zinc-100 to-zinc-50 dark:from-zinc-800/50 dark:to-zinc-800/30 rounded-full animate-pulse border border-border/20" />
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 mt-1.5 flex-none">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#ea6100]/8 dark:bg-[#ea6100]/15 text-[#ea6100] rounded-full text-[11px] font-extrabold border border-[#ea6100]/15 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ea6100]" />
                <span>평균 매매가</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#f9a825]/8 dark:bg-[#f9a825]/15 text-[#f9a825] rounded-full text-[11px] font-extrabold border border-[#f9a825]/15 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f9a825]" />
                <span>평균 전세가</span>
              </div>
            </div>
          )}

          {selectedTimelineApt && (!aptRealTxData || aptRealTxData.length === 0) && !isAptTxLoading && !isDefaultAptSettingUp && (
            <div className="text-[10.5px] text-tertiary text-center mt-1.5 font-medium flex items-center justify-center gap-1">
              <span>※ 개별 실거래 세부내역 수집 대기 단지로 시세 추정치가 표시됩니다.</span>
            </div>
          )}
        </div>
      </div>

      {/* Traffic notice board widget */}
      {trafficNoticeBoardNode}
    </div>
  );
});
