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
import {
  getToggleTrackClass,
  getToggleBtnClass,
  getControlSelectClass,
} from '@/lib/design-system/controls';

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

import {
  DONG_MENU_DEFAULT_WIDTH,
  DONG_MENU_VIEWPORT_MARGIN,
  computeClampedDropdownLeftOffset,
  computeClampedDropdownMaxWidth,
} from './statsFilterBarPosition';

export {
  DONG_MENU_DEFAULT_WIDTH,
  DONG_MENU_VIEWPORT_MARGIN,
  computeClampedDropdownLeftOffset,
  computeClampedDropdownMaxWidth,
};

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

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
  const [dongMenuPosition, setDongMenuPosition] = React.useState<{
    left: number;
    maxWidth: number | null;
  }>({ left: 0, maxWidth: null });
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const dongMenuRef = React.useRef<HTMLDivElement>(null);

  const updateDongMenuPosition = React.useCallback(() => {
    if (!dropdownRef.current || typeof window === 'undefined') return;
    const rect = dropdownRef.current.getBoundingClientRect();
    const containingBlockLeft = rect.left + (dropdownRef.current.clientLeft || 0);
    const docClientWidth =
      typeof document !== 'undefined' ? document.documentElement?.clientWidth || 0 : 0;
    const viewportWidth =
      docClientWidth > 0 ? Math.min(window.innerWidth, docClientWidth) : window.innerWidth;
    const maxAvailableWidth = computeClampedDropdownMaxWidth(
      viewportWidth,
      DONG_MENU_VIEWPORT_MARGIN
    );
    const measuredWidth = dongMenuRef.current?.offsetWidth || 0;
    const nextLeft = computeClampedDropdownLeftOffset(
      containingBlockLeft,
      measuredWidth,
      viewportWidth,
      DONG_MENU_VIEWPORT_MARGIN
    );
    const nextMaxWidth = maxAvailableWidth > 0 ? maxAvailableWidth : null;
    setDongMenuPosition((prev) =>
      prev.left === nextLeft && prev.maxWidth === nextMaxWidth
        ? prev
        : { left: nextLeft, maxWidth: nextMaxWidth }
    );
  }, []);

  // Re-clamp dropdown horizontally on open, layout reflow, scroll, orientationchange, and viewport resize
  // so it always stays strictly within [12px, viewportWidth - 12px]
  useIsomorphicLayoutEffect(() => {
    if (!isDongMenuOpen || typeof window === 'undefined') return;
    updateDongMenuPosition();

    window.addEventListener('resize', updateDongMenuPosition, { passive: true });
    window.addEventListener('orientationchange', updateDongMenuPosition, { passive: true });
    window.addEventListener('scroll', updateDongMenuPosition, { capture: true, passive: true });

    const vv = window.visualViewport;
    if (vv && typeof vv.addEventListener === 'function') {
      vv.addEventListener('resize', updateDongMenuPosition, { passive: true });
    }

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateDongMenuPosition();
      });
      if (dropdownRef.current) resizeObserver.observe(dropdownRef.current);
      if (dongMenuRef.current) resizeObserver.observe(dongMenuRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateDongMenuPosition);
      window.removeEventListener('orientationchange', updateDongMenuPosition);
      window.removeEventListener('scroll', updateDongMenuPosition, { capture: true });
      if (vv && typeof vv.removeEventListener === 'function') {
        vv.removeEventListener('resize', updateDongMenuPosition);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [isDongMenuOpen, region, isPending, updateDongMenuPosition]);

  // Close dropdown on click, touch outside, or Escape
  React.useEffect(() => {
    if (!isDongMenuOpen) return;
    function handleOutsidePointer(e: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDongMenuOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsDongMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsidePointer);
    document.addEventListener('touchstart', handleOutsidePointer, { passive: true });
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsidePointer);
      document.removeEventListener('touchstart', handleOutsidePointer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDongMenuOpen]);

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
      className="w-full bg-white dark:bg-slate-900 border-y border-slate-200/80 dark:border-slate-800/80 py-3.5 sm:py-4 transition-all"
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all active:scale-95 cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                      : 'bg-[#eff1f5] dark:bg-[#1e2532] text-secondary hover:text-primary hover:bg-slate-200/70 dark:hover:bg-[#252c3d]'
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
                aria-expanded={isDongMenuOpen}
                onClick={() => {
                  if (!isDongMenuOpen) {
                    updateDongMenuPosition();
                  }
                  setIsDongMenuOpen((prev) => !prev);
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation ${
                  DONGTAN1_DONGS.includes(region as any) ||
                  (DONGTAN2_DONGS.includes(region as any) && region !== '청계동')
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                    : 'bg-[#eff1f5] dark:bg-[#1e2532] text-secondary hover:text-primary hover:bg-slate-200/70 dark:hover:bg-[#252c3d]'
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
                <div
                  ref={dongMenuRef}
                  data-testid="stats-dong-dropdown-menu"
                  data-scroll-interactive="true"
                  style={{
                    left: `${dongMenuPosition.left}px`,
                    ...(dongMenuPosition.maxWidth !== null
                      ? { maxWidth: `${dongMenuPosition.maxWidth}px` }
                      : {}),
                  }}
                  className="absolute left-0 top-full mt-1.5 z-50 w-56 max-w-[calc(100vw-24px)] rounded-2xl bg-surface border border-border shadow-lg p-2 animate-in fade-in zoom-in-95"
                >
                  <div className="text-[11px] font-bold text-tertiary px-2 py-1">동탄1동 법정동</div>
                  <div className="grid grid-cols-2 gap-1 mb-2">
                    {DONGTAN1_DONGS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleDongSelect(d)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors ${
                          isDongActive(d)
                            ? 'bg-[#eff1f5] dark:bg-[#1e2532] text-primary font-extrabold'
                            : 'hover:bg-[#eff1f5]/70 dark:hover:bg-[#1e2532]/70 text-secondary hover:text-primary'
                        }`}
                      >
                        <span>{d}</span>
                        {isDongActive(d) && <Check size={12} />}
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] font-bold text-tertiary px-2 py-1 border-t border-border pt-1.5">
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
                            ? 'bg-[#eff1f5] dark:bg-[#1e2532] text-primary font-extrabold'
                            : 'hover:bg-[#eff1f5]/70 dark:hover:bg-[#1e2532]/70 text-secondary hover:text-primary'
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
              <span className="text-xs text-secondary font-bold animate-pulse">
                데이터 집계 중...
              </span>
            )}
            {onReset && (
              <button
                type="button"
                data-testid="filter-reset-button"
                onClick={onReset}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-secondary hover:text-primary hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] transition-colors cursor-pointer"
                title="필터 조건 초기화"
              >
                <RotateCcw size={13} />
                <span>필터 초기화</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Pyeong Chips & Timeframe Tabs & Sort Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-border">
          {/* Pyeong Chips (single-row horizontal swipe on mobile to preserve above-the-fold chart space) */}
          <div className="flex flex-nowrap sm:flex-wrap items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full py-0.5">
            <span className="text-xs font-bold text-tertiary mr-1 hidden sm:inline shrink-0">
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
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0 touch-manipulation ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                      : 'bg-[#eff1f5] dark:bg-[#1e2532] text-secondary hover:text-primary hover:bg-slate-200/70 dark:hover:bg-[#252c3d]'
                  }`}
                >
                  <span>{opt.label}</span>
                  {opt.id !== 'ALL' && (
                    <span className={`ml-1 text-[10px] ${isActive ? 'text-white/75 dark:text-slate-900/70' : 'text-tertiary'}`}>
                      {opt.subLabel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Timeframe & Sort Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Timeframe Tabs */}
            <div className={getToggleTrackClass('overflow-x-auto no-scrollbar max-w-full')}>
              {TIMEFRAME_OPTIONS.map((opt) => {
                const isActive = timeframe === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid={opt.testId}
                    onClick={() => onTimeframeChange(opt.id)}
                    className={getToggleBtnClass({ active: isActive, size: 'sm' })}
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
                  className={getControlSelectClass('appearance-none pl-2.5 sm:pl-3 pr-7')}
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
