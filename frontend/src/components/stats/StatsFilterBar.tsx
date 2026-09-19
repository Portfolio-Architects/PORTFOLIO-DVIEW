'use client';

import React from 'react';
import { RotateCcw, ChevronDown, Check, SlidersHorizontal } from 'lucide-react';
import type {
  RegionFilter,
  PyeongFilter,
  TimeframeFilter,
  SortOption,
} from '@/types/stats';
import { DONGTAN1_DONGS, DONGTAN2_DONGS } from '@/types/stats';

export interface StatsFilterBarProps {
  region: RegionFilter;
  dong?: string;
  pyeong: PyeongFilter;
  timeframe: TimeframeFilter;
  sort?: SortOption;
  onRegionChange: (region: RegionFilter) => void;
  onDongChange?: (dong: string) => void;
  onPyeongChange: (pyeong: PyeongFilter) => void;
  onTimeframeChange: (timeframe: TimeframeFilter) => void;
  onSortChange?: (sort: SortOption) => void;
  onReset?: () => void;
  isPending?: boolean;
}

const REGION_TABS: Array<{ id: RegionFilter; label: string; testId: string }> = [
  { id: 'ALL', label: '동탄 전체', testId: 'filter-region-all' },
  { id: 'DONGTAN1', label: '동탄1', testId: 'filter-region-dongtan1' },
  { id: 'DONGTAN2', label: '동탄2', testId: 'filter-region-dongtan2' },
  { id: '청계동', label: '청계동', testId: 'filter-region-cheonggye' },
];

const PYEONG_OPTIONS: Array<{ id: PyeongFilter; label: string; subLabel: string; testId: string }> = [
  { id: 'ALL', label: '전체 평형', subLabel: '전체', testId: 'filter-pyeong-all' },
  { id: 'SMALL', label: '소형', subLabel: '60㎡↓', testId: 'filter-pyeong-small' },
  { id: 'MEDIUM_SMALL', label: '중소형', subLabel: '60~85㎡', testId: 'filter-pyeong-medium-small' },
  { id: 'MEDIUM_LARGE', label: '중대형', subLabel: '85~102㎡', testId: 'filter-pyeong-medium-large' },
  { id: 'LARGE', label: '대형', subLabel: '102㎡↑', testId: 'filter-pyeong-large' },
];

const TIMEFRAME_OPTIONS: Array<{ id: TimeframeFilter; label: string; testId: string }> = [
  { id: '1M', label: '1개월', testId: 'filter-timeframe-1m' },
  { id: '3M', label: '3개월', testId: 'filter-timeframe-3m' },
  { id: '6M', label: '6개월', testId: 'filter-timeframe-6m' },
  { id: '1Y', label: '1년', testId: 'filter-timeframe-1y' },
  { id: 'ALL', label: '전체', testId: 'filter-timeframe-all' },
];

const SORT_OPTIONS: Array<{ id: SortOption; label: string }> = [
  { id: 'PYEONG_DESC', label: '평당가 높은순' },
  { id: 'PRICE_DESC', label: '매매가 높은순' },
  { id: 'PRICE_ASC', label: '매매가 낮은순' },
  { id: 'VOLUME_DESC', label: '거래량 많은순' },
  { id: 'JEONSE_DESC', label: '전세가율 높은순' },
];

export function StatsFilterBar({
  region,
  dong,
  pyeong,
  timeframe,
  sort = 'PYEONG_DESC',
  onRegionChange,
  onDongChange,
  onPyeongChange,
  onTimeframeChange,
  onSortChange,
  onReset,
  isPending = false,
}: StatsFilterBarProps) {
  const [isDongMenuOpen, setIsDongMenuOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDongMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDongSelect = (dongName: string) => {
    setIsDongMenuOpen(false);
    if (onDongChange) {
      onDongChange(dongName);
    }
    onRegionChange(dongName);
  };

  const isDongActive = (name: string) => region === name || dong === name;

  return (
    <div
      data-testid="stats-filter-bar"
      className="w-full bg-surface/90 backdrop-blur-md border-y border-border/60 py-3 sm:py-4 transition-all"
    >
      <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 flex flex-col gap-3">
        {/* Row 1: Region Pills & Dong Dropdown + Reset Button */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mr-1 hidden sm:inline">
              권역
            </span>

            {/* Region Pills */}
            {REGION_TABS.map((tab) => {
              const isActive = region === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={tab.testId}
                  onClick={() => {
                    onRegionChange(tab.id);
                    if (onDongChange && tab.id !== '청계동') onDongChange('');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all active:scale-95 ${
                    isActive
                      ? 'bg-hs-orange text-white shadow-sm ring-2 ring-hs-orange/30'
                      : 'bg-body text-secondary hover:text-primary hover:bg-black/5 dark:hover:bg-surface/5 border border-border/60'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}

            {/* Legal Dong Dropdown for fine-grained selection */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDongMenuOpen(!isDongMenuOpen)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  DONGTAN1_DONGS.includes(region as any) ||
                  (DONGTAN2_DONGS.includes(region as any) && region !== '청계동')
                    ? 'bg-hs-orange text-white border-hs-orange'
                    : 'bg-body text-secondary hover:text-primary border-border/60'
                }`}
              >
                <span>
                  {DONGTAN1_DONGS.includes(region as any) ||
                  DONGTAN2_DONGS.includes(region as any)
                    ? region
                    : '법정동 선택'}
                </span>
                <ChevronDown size={14} className={isDongMenuOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>

              {isDongMenuOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-50 w-56 rounded-2xl bg-surface border border-border shadow-xl p-2 animate-in fade-in zoom-in-95">
                  <div className="text-[11px] font-bold text-slate-400 px-2 py-1">동탄1동 법정동</div>
                  <div className="grid grid-cols-2 gap-1 mb-2">
                    {DONGTAN1_DONGS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleDongSelect(d)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors ${
                          isDongActive(d)
                            ? 'bg-hs-orange-light text-hs-orange font-bold'
                            : 'hover:bg-body text-secondary'
                        }`}
                      >
                        <span>{d}</span>
                        {isDongActive(d) && <Check size={12} />}
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] font-bold text-slate-400 px-2 py-1 border-t border-border/40 pt-1.5">
                    동탄2동 법정동
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {DONGTAN2_DONGS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleDongSelect(d)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors ${
                          isDongActive(d)
                            ? 'bg-hs-orange-light text-hs-orange font-bold'
                            : 'hover:bg-body text-secondary'
                        }`}
                      >
                        <span>{d}</span>
                        {isDongActive(d) && <Check size={12} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reset button & Loading indicator */}
          <div className="flex items-center gap-2">
            {isPending && (
              <span className="text-xs text-hs-orange font-bold animate-pulse">
                데이터 집계 중...
              </span>
            )}
            {onReset && (
              <button
                type="button"
                data-testid="filter-reset-button"
                onClick={onReset}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-body transition-colors"
                title="필터 조건 초기화"
              >
                <RotateCcw size={13} />
                <span>필터 초기화</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Pyeong Chips & Timeframe Tabs & Sort Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40">
          {/* Pyeong Chips */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mr-1 hidden sm:inline">
              평형
            </span>
            {PYEONG_OPTIONS.map((opt) => {
              const isActive = pyeong === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-testid={opt.testId}
                  onClick={() => onPyeongChange(opt.id)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                      : 'bg-body text-secondary hover:text-primary border border-border/60 hover:bg-black/5 dark:hover:bg-surface/5'
                  }`}
                >
                  <span>{opt.label}</span>
                  {opt.id !== 'ALL' && (
                    <span className={`ml-1 text-[10px] ${isActive ? 'text-blue-100' : 'text-tertiary'}`}>
                      {opt.subLabel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Timeframe & Sort Controls */}
          <div className="flex items-center gap-2">
            {/* Timeframe Tabs */}
            <div className="flex items-center bg-body p-1 rounded-xl border border-border/60">
              {TIMEFRAME_OPTIONS.map((opt) => {
                const isActive = timeframe === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid={opt.testId}
                    onClick={() => onTimeframeChange(opt.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Sort Selector Dropdown */}
            {onSortChange && (
              <div className="relative inline-flex items-center">
                <select
                  data-testid="filter-sort-select"
                  value={sort}
                  onChange={(e) => onSortChange(e.target.value as SortOption)}
                  className="appearance-none bg-body border border-border/60 text-secondary hover:text-primary text-xs font-bold rounded-xl pl-2.5 pr-7 py-2 focus:outline-none focus:ring-2 focus:ring-hs-orange/30 cursor-pointer"
                >
                  {SORT_OPTIONS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <SlidersHorizontal
                  size={12}
                  className="absolute right-2.5 text-slate-400 pointer-events-none"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatsFilterBar;
