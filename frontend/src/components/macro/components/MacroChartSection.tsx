import React, { useState, useMemo } from 'react';
import { getDisplayAptName, normalizeAptName } from '@/lib/utils/apartmentMapping';
import { TimeframeSelector, FavoriteOrderEditor } from './MacroControls';
import { DongApartment, buildInitialApartments } from '@/lib/dong-apartments';

export interface MacroChartSectionProps {
  userFavorites?: Set<string>;
  isDefaultAptSettingUp: boolean;
  mounted: boolean;
  selectedTimelineApt: string | null;
  setSelectedTimelineApt: (apt: string | null) => void;
  preloadApartmentModal: () => void;
  favoritesArray: string[];
  defaultTimelineApts: string[];
  sheetApartments?: Record<string, DongApartment[]>;
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
  sheetApartments,
  onSelectApt,
  onHoverApt,
  timeframe,
  setTimeframe,
  isAptTxLoading,
  aptRealTxData,
  mainLineData,
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
  const [selectedDong, setSelectedDong] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract all dongs and unique apartments
  const dongsData = useMemo(() => {
    let source: Record<string, { name: string; dong?: string }[]> = {};
    if (sheetApartments && Object.keys(sheetApartments).length > 0) {
      source = sheetApartments;
    } else {
      source = buildInitialApartments();
    }

    const dongs = Object.keys(source).sort();
    const allApts: { name: string; dong: string }[] = [];
    const seen = new Set<string>();

    Object.entries(source).forEach(([dong, apts]) => {
      apts.forEach((a) => {
        const name = a.name;
        if (!seen.has(name)) {
          seen.add(name);
          allApts.push({ name, dong: a.dong || dong });
        }
      });
    });

    allApts.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    return { dongs, allApts };
  }, [sheetApartments]);

  const trimmedSearch = searchQuery.trim().toLowerCase();

  const filteredApts = useMemo(() => {
    if (!trimmedSearch) return [];
    return dongsData.allApts.filter((a) => {
      const display = getDisplayAptName(a.name).toLowerCase();
      const raw = a.name.toLowerCase();
      const dong = a.dong.toLowerCase();
      return display.includes(trimmedSearch) || raw.includes(trimmedSearch) || dong.includes(trimmedSearch);
    });
  }, [trimmedSearch, dongsData.allApts]);

  const currentAptObj = useMemo(() => {
    if (!selectedTimelineApt) return null;
    return (
      dongsData.allApts.find(
        (a) =>
          a.name === selectedTimelineApt ||
          getDisplayAptName(a.name) === getDisplayAptName(selectedTimelineApt)
      ) || null
    );
  }, [selectedTimelineApt, dongsData.allApts]);

  const isSelectedInList = useMemo(() => {
    if (!selectedTimelineApt) return true;
    if (trimmedSearch) {
      return filteredApts.some((a) => a.name === selectedTimelineApt);
    }
    if (selectedDong === 'default') {
      return defaultTimelineApts.includes(selectedTimelineApt);
    }
    if (selectedDong === 'favorites') {
      return favoritesArray.includes(selectedTimelineApt);
    }
    if (selectedDong === 'all') {
      return true;
    }
    return dongsData.allApts.some((a) => a.dong === selectedDong && a.name === selectedTimelineApt);
  }, [selectedTimelineApt, trimmedSearch, filteredApts, selectedDong, defaultTimelineApts, favoritesArray, dongsData.allApts]);

  return (
    <div className={`w-full flex flex-col gap-4 min-w-0 lg:h-[586px] box-border ${className || ''}`}>
      {/* Right Panel: Interactive Market Feed & Trend */}
      <div className="w-full flex flex-col bg-surface rounded-[20px] sm:rounded-[24px] shadow-sm border border-border/80 p-4 sm:p-6 flex-1 lg:h-[586px] min-h-[460px] min-w-0 box-border justify-between">
        <div className="flex-1 flex flex-col min-h-[260px] md:min-h-[300px]">
          {/* Header Row: Title & Action + Timeframe */}
          <div className="flex flex-col gap-2.5 mb-3.5 pb-3 border-b border-border/40 w-full min-w-0">
            <div className="flex justify-between items-center w-full gap-2 flex-wrap">
              {/* Title & Detail CTA */}
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <h3 className="text-[14px] sm:text-[15px] font-black text-primary tracking-tight flex items-center gap-1.5 break-keep">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ea6100] shrink-0" />
                  <span>
                    {selectedTimelineApt
                      ? `${getDisplayAptName(selectedTimelineApt)} 시세 추이`
                      : (userFavorites && userFavorites.size > 0 ? "내 관심 단지 시세 추이" : "동탄 아파트 시세 추이")}
                  </span>
                </h3>

                {selectedTimelineApt && !isDefaultAptSettingUp && (
                  <button
                    onClick={() => onSelectApt && onSelectApt(selectedTimelineApt, currentAptObj?.dong)}
                    onMouseEnter={() => onHoverApt && onHoverApt(selectedTimelineApt)}
                    onTouchStart={() => onHoverApt && onHoverApt(selectedTimelineApt)}
                    className="px-2.5 py-1 bg-[#fff3e0] hover:bg-[#fff3e0]/80 text-[#ea6100] border-none rounded-xl text-[11px] font-extrabold cursor-pointer transition-colors shrink-0 flex items-center gap-1 shadow-xs"
                  >
                    상세 리포트 보기 ➔
                  </button>
                )}
              </div>

              {/* Timeframe Selector (3M, 6M, 1Y, 3Y, 5Y, ALL) */}
              <TimeframeSelector
                timeframe={timeframe}
                setTimeframe={setTimeframe}
              />
            </div>

            {/* Filter Bar: Dong Filter + Search Filter + Apartment Select Dropdown */}
            {isDefaultAptSettingUp ? (
              <div className="w-full h-[28px] bg-gradient-to-r from-zinc-100 to-zinc-50 dark:from-zinc-800/50 dark:to-zinc-800/30 rounded-xl animate-pulse border border-border/10" />
            ) : (
              mounted && (
                <div className="flex items-center gap-2 flex-wrap w-full min-w-0 pt-0.5">
                  {/* 1. Dong (Region) Filter */}
                  <div className="flex items-center gap-1 shrink-0">
                    <select
                      aria-label="아파트 지역 필터 선택"
                      value={selectedDong}
                      onChange={(e) => {
                        setSelectedDong(e.target.value);
                        setSearchQuery('');
                      }}
                      className="px-2.5 h-[28px] bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-border/80 text-secondary rounded-xl text-[11px] font-extrabold cursor-pointer transition-colors outline-none focus:ring-1 focus:ring-[#ea6100] focus:border-[#ea6100] shadow-xs shrink-0"
                    >
                      <option value="all">동탄 전체 ({dongsData.allApts.length}개 단지)</option>
                      <option value="default">대표 4개 단지</option>
                      {userFavorites && userFavorites.size > 0 && (
                        <option value="favorites">★ 내 관심 단지 ({userFavorites.size})</option>
                      )}
                      {dongsData.dongs.map((dong) => {
                        const count = dongsData.allApts.filter((a) => a.dong === dong).length;
                        return (
                          <option key={dong} value={dong}>
                            {dong} ({count})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* 2. Apartment Select Dropdown */}
                  <div className="relative flex items-center gap-1 flex-1 min-w-[150px] max-w-[280px]">
                    <select
                      aria-label="시세 그래프 조회 아파트 선택"
                      value={selectedTimelineApt || ""}
                      onFocus={preloadApartmentModal}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedTimelineApt(val === "" ? null : val);
                      }}
                      className="w-full px-2.5 h-[28px] bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-border/80 text-secondary rounded-xl text-[11px] font-extrabold cursor-pointer transition-colors outline-none focus:ring-1 focus:ring-[#ea6100] focus:border-[#ea6100] shadow-xs truncate"
                    >
                      <option value="">전체 추이 보기 (동탄 매크로)</option>

                      {/* Show current selected apartment if outside current filter */}
                      {selectedTimelineApt && !isSelectedInList && (
                        <optgroup label="현재 선택 단지">
                          <option value={selectedTimelineApt}>
                            {getDisplayAptName(selectedTimelineApt)}
                          </option>
                        </optgroup>
                      )}

                      {trimmedSearch ? (
                        filteredApts.length === 0 ? (
                          <option value="" disabled>검색 결과 없음</option>
                        ) : (
                          <optgroup label={`검색 결과 (${filteredApts.length}개)`}>
                            {filteredApts.map((a) => (
                              <option key={a.name} value={a.name}>
                                [{a.dong}] {getDisplayAptName(a.name)}
                              </option>
                            ))}
                          </optgroup>
                        )
                      ) : selectedDong === 'default' ? (
                        <optgroup label="동탄 대표 단지">
                          {defaultTimelineApts.map((apt) => (
                            <option key={apt} value={apt}>
                              {getDisplayAptName(apt)}
                            </option>
                          ))}
                        </optgroup>
                      ) : selectedDong === 'favorites' ? (
                        <optgroup label="내 관심 단지">
                          {favoritesArray.map((fav) => (
                            <option key={fav} value={fav}>
                              {getDisplayAptName(fav)}
                            </option>
                          ))}
                        </optgroup>
                      ) : selectedDong !== 'all' ? (
                        <optgroup label={`${selectedDong} 아파트`}>
                          {dongsData.allApts
                            .filter((a) => a.dong === selectedDong)
                            .map((a) => (
                              <option key={a.name} value={a.name}>
                                {getDisplayAptName(a.name)}
                              </option>
                            ))}
                        </optgroup>
                      ) : (
                        <>
                          <optgroup label="⭐ 동탄 대표 단지">
                            {defaultTimelineApts.map((apt) => (
                              <option key={`def-${apt}`} value={apt}>
                                {getDisplayAptName(apt)}
                              </option>
                            ))}
                          </optgroup>
                          {dongsData.dongs.map((dong) => {
                            const aptsInDong = dongsData.allApts.filter((a) => a.dong === dong);
                            if (aptsInDong.length === 0) return null;
                            return (
                              <optgroup key={dong} label={dong}>
                                {aptsInDong.map((a) => (
                                  <option key={a.name} value={a.name}>
                                    {getDisplayAptName(a.name)}
                                  </option>
                                ))}
                              </optgroup>
                            );
                          })}
                        </>
                      )}
                    </select>

                    {selectedDong === 'favorites' && userFavorites && userFavorites.size > 0 && (
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
                    )}
                  </div>

                  {/* 3. Quick Search Filter Input */}
                  <div className="relative flex items-center flex-1 min-w-[120px] max-w-[190px]">
                    <input
                      type="text"
                      placeholder="단지명 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="단지명 실시간 검색"
                      className="w-full pl-7 pr-6 h-[28px] bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-border/80 text-primary placeholder:text-tertiary rounded-xl text-[11px] font-bold transition-colors outline-none focus:ring-1 focus:ring-[#ea6100] focus:border-[#ea6100] shadow-xs"
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="absolute left-2.5 text-tertiary pointer-events-none"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                    {searchQuery && (
                      <button
                        type="button"
                        aria-label="검색어 지우기"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 text-tertiary hover:text-primary font-bold text-[13px] leading-none cursor-pointer p-0.5"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              )
            )}
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



          {selectedTimelineApt && (!mainLineData || mainLineData.length === 0) && !isAptTxLoading && !isDefaultAptSettingUp && (
            <div className="text-[10.5px] text-tertiary text-center mt-1.5 font-medium flex items-center justify-center gap-1">
              <span>※ 개별 실거래 세부내역 수집 대기 중인 단지입니다.</span>
            </div>
          )}
        </div>
      </div>

      {/* Traffic notice board widget */}
      {trafficNoticeBoardNode}
    </div>
  );
});
