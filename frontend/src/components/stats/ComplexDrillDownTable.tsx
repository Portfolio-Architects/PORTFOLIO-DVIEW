'use client';

import React, { useState, useMemo } from 'react';
import {
  TrainFront,
  Building2,
  Search,
  ArrowUpDown,
} from 'lucide-react';
import type { ApartmentStatRecord, StatsFilterOptions } from '@/lib/stats/types';
import { formatPriceEokCompact, formatShortContractDate } from '@/lib/stats/dongtanStationDistanceEngine';
import { matchesApartmentSearch } from '@/lib/utils/apartmentSearch';
import {
  getToggleTrackClass,
  getToggleBtnClass,
  getControlSelectClass,
} from '@/lib/design-system/controls';

export interface ComplexDrillDownTableProps {
  records: ApartmentStatRecord[];
  filters: StatsFilterOptions;
  onFilterChange: (filters: Partial<StatsFilterOptions>) => void;
  onSelectComplex?: (record: ApartmentStatRecord) => void;
  className?: string;
}

const DONG_OPTIONS = [
  { label: '전체 권역', value: 'all' },
  { label: '동탄1신도시', value: '동탄1' },
  { label: '동탄2신도시', value: '동탄2' },
  { label: '청계동', value: '청계동' },
  { label: '영천동', value: '영천동' },
  { label: '오산동', value: '오산동' },
  { label: '반송동', value: '반송동' },
  { label: '석우동', value: '석우동' },
  { label: '능동', value: '능동' },
  { label: '목동', value: '목동' },
  { label: '산척동', value: '산척동' },
  { label: '장지동', value: '장지동' },
  { label: '송동', value: '송동' },
  { label: '신동', value: '신동' },
];

export function ComplexDrillDownTable({
  records = [],
  filters,
  onFilterChange,
  onSelectComplex,
  className = '',
}: ComplexDrillDownTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [displayCount, setDisplayCount] = useState(25);

  // Search filter
  const displayedRecords = useMemo(() => {
    let list = records;
    if (searchQuery.trim()) {
      list = list.filter((r) =>
        matchesApartmentSearch({ name: r.name, dong: r.dong }, searchQuery)
      );
    }
    return list;
  }, [records, searchQuery]);

  const pagedRecords = displayedRecords.slice(0, displayCount);

  return (
    <section
      aria-label="동탄 단지별 역세권 상세 분석 데이터 테이블"
      className={`w-full rounded-2xl bg-elevated p-4 sm:p-6 border border-border flex flex-col gap-4 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <h3 className="text-sm sm:text-base font-black text-primary tracking-tight">
              동탄 127개 단지 전수 실거래 & 역세권 상세 대사
            </h3>
          </div>
          <p className="text-[11px] sm:text-[12px] font-medium text-secondary mt-0.5">
            평형대, 연식, 권역별 필터링 및 1년 평균 매매가 · 최근 실거래가 비교 탐색
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-tertiary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="단지명 또는 동 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-[34px] sm:h-[36px] pl-8 pr-3 rounded-[10px] bg-surface text-[12px] sm:text-[13px] font-bold text-primary placeholder:text-tertiary border border-border outline-none focus:ring-2 focus:ring-slate-900/15 dark:focus:ring-white/20"
          />
        </div>
      </div>

      {/* Multi-Dimensional Filter Controls */}
      <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-xl bg-surface border border-border">
        {/* Area Band Toggle */}
        <div className="flex flex-wrap items-center gap-1.5 min-w-0 max-w-full">
          <span className="text-[11px] font-bold text-secondary shrink-0">평형:</span>
          <div className={getToggleTrackClass('flex-wrap max-w-full')}>
            <button
              type="button"
              onClick={() => onFilterChange({ areaBand: 'all' })}
              className={getToggleBtnClass(filters.areaBand === 'all', { size: 'sm', tone: 'neutral' })}
            >
              전체
            </button>
            <button
              type="button"
              onClick={() => onFilterChange({ areaBand: 'small' })}
              className={getToggleBtnClass(filters.areaBand === 'small', { size: 'sm', tone: 'neutral' })}
            >
              소형 (~59㎡)
            </button>
            <button
              type="button"
              onClick={() => onFilterChange({ areaBand: 'medium' })}
              className={getToggleBtnClass(filters.areaBand === 'medium', { size: 'sm', tone: 'neutral' })}
            >
              국민평형 (84㎡)
            </button>
            <button
              type="button"
              onClick={() => onFilterChange({ areaBand: 'large' })}
              className={getToggleBtnClass(filters.areaBand === 'large', { size: 'sm', tone: 'neutral' })}
            >
              대형 (85㎡+)
            </button>
          </div>
        </div>

        {/* Building Age Toggle */}
        <div className="flex flex-wrap items-center gap-1.5 min-w-0 max-w-full">
          <span className="text-[11px] font-bold text-secondary shrink-0">연식:</span>
          <div className={getToggleTrackClass('flex-wrap max-w-full')}>
            <button
              type="button"
              onClick={() => onFilterChange({ buildingAge: 'all' })}
              className={getToggleBtnClass(filters.buildingAge === 'all', { size: 'sm', tone: 'neutral' })}
            >
              전체
            </button>
            <button
              type="button"
              onClick={() => onFilterChange({ buildingAge: 'under5' })}
              className={getToggleBtnClass(filters.buildingAge === 'under5', { size: 'sm', tone: 'neutral' })}
            >
              신축 (≤5년)
            </button>
            <button
              type="button"
              onClick={() => onFilterChange({ buildingAge: '5to10' })}
              className={getToggleBtnClass(filters.buildingAge === '5to10', { size: 'sm', tone: 'neutral' })}
            >
              5~10년
            </button>
            <button
              type="button"
              onClick={() => onFilterChange({ buildingAge: 'over10' })}
              className={getToggleBtnClass(filters.buildingAge === 'over10', { size: 'sm', tone: 'neutral' })}
            >
              구축 (10년+)
            </button>
          </div>
        </div>

        {/* Dong / Region Select */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-secondary shrink-0">권역:</span>
          <select
            value={filters.dong}
            onChange={(e) => onFilterChange({ dong: e.target.value })}
            className={getControlSelectClass('text-primary')}
            aria-label="법정동 및 권역 선택"
          >
            {DONG_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Sort Options */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] font-bold text-secondary">
        <span className="tabular-nums">
          총 <strong className="text-primary font-black">{displayedRecords.length}</strong>개 단지 추출
        </span>

        <div className="flex items-center flex-wrap gap-1">
          <span className="text-tertiary mr-1 inline-flex items-center gap-1">
            <ArrowUpDown className="w-3 h-3" />
            정렬:
          </span>
          <button
            type="button"
            onClick={() => onFilterChange({ sortBy: 'distance' })}
            className={`px-2 py-1 rounded-md transition-colors ${
              filters.sortBy === 'distance'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-black'
                : 'bg-surface hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] hover:text-primary'
            }`}
          >
            동탄역 거리순
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ sortBy: 'pyeongPriceDesc' })}
            className={`px-2 py-1 rounded-md transition-colors ${
              filters.sortBy === 'pyeongPriceDesc'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-black'
                : 'bg-surface hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] hover:text-primary'
            }`}
          >
            평당가 높은순
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ sortBy: 'priceDesc' })}
            className={`px-2 py-1 rounded-md transition-colors ${
              filters.sortBy === 'priceDesc'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-black'
                : 'bg-surface hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] hover:text-primary'
            }`}
          >
            1년 평균가순
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ sortBy: 'latestPriceDesc' })}
            className={`px-2 py-1 rounded-md transition-colors ${
              filters.sortBy === 'latestPriceDesc'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-black'
                : 'bg-surface hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] hover:text-primary'
            }`}
          >
            최근 실거래가순
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ sortBy: 'volumeDesc' })}
            className={`px-2 py-1 rounded-md transition-colors ${
              filters.sortBy === 'volumeDesc'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-black'
                : 'bg-surface hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] hover:text-primary'
            }`}
          >
            거래량순
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ sortBy: 'latestYear' })}
            className={`px-2 py-1 rounded-md transition-colors ${
              filters.sortBy === 'latestYear'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-black'
                : 'bg-surface hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] hover:text-primary'
            }`}
          >
            최신 연식순
          </button>
        </div>
      </div>

      {/* Sortable Table with Fixed Row Height (h-[52px]) to eliminate CLS */}
      <div className="w-full overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-left border-collapse min-w-[840px]">
          <thead>
            <tr className="border-b border-border bg-elevated text-[11px] font-extrabold text-secondary h-[40px]">
              <th className="px-3 text-center w-[50px]">순위</th>
              <th className="px-3">단지명</th>
              <th className="px-3 w-[75px]">법정동</th>
              <th className="px-3 w-[115px] text-right">동탄역 거리</th>
              <th className="px-3 w-[115px] text-right">1년 평균 평당가</th>
              <th className="px-3 w-[110px] text-right">1년 평균 매매가</th>
              <th className="px-3 w-[145px] text-right">최근 실거래가</th>
              <th className="px-3 w-[70px] text-center">연식</th>
              <th className="px-3 w-[85px] text-right">1년 거래량</th>
            </tr>
          </thead>
          <tbody>
            {pagedRecords.length > 0 ? (
              pagedRecords.map((apt, idx) => {
                const pyeongMan =
                  apt.avgPricePerPyeongWon > 100000
                    ? Math.round(apt.avgPricePerPyeongWon / 10000)
                    : Math.round(apt.avgPricePerPyeongWon);

                const priceEok = (apt.avgPriceWon / 100000000).toFixed(1);
                const latestDateShort = formatShortContractDate(apt.latestContractDate);

                return (
                  <tr
                    key={apt.id}
                    onClick={() => onSelectComplex?.(apt)}
                    className="h-[52px] border-b border-border hover:bg-[#eff1f5]/60 dark:hover:bg-[#1e2532]/60 transition-colors cursor-pointer text-[12px] group"
                  >
                    <td className="px-3 text-center font-bold text-tertiary tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="px-3 font-black text-primary truncate max-w-[200px]">
                      {apt.name}
                    </td>
                    <td className="px-3 font-medium text-secondary">
                      {apt.dong}
                    </td>
                    <td className="px-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-black tabular-nums text-[11px] px-2 py-0.5 rounded-md ${
                          apt.distanceToStationMeters < 500
                            ? 'bg-brand-blue-light text-brand-blue border border-brand-blue/20'
                            : apt.distanceToStationMeters < 1000
                            ? 'bg-brand-blue-light/70 text-brand-blue'
                            : apt.distanceToStationMeters < 2000
                            ? 'bg-[#eff1f5] dark:bg-[#1e2532] text-primary'
                            : 'bg-[#eff1f5]/60 dark:bg-[#1e2532]/60 text-tertiary'
                        }`}
                      >
                        <TrainFront className="w-3 h-3" />
                        {apt.distanceToStationMeters.toLocaleString()}m
                      </span>
                    </td>
                    <td className="px-3 text-right font-black text-primary tabular-nums whitespace-nowrap">
                      {pyeongMan.toLocaleString()}만
                    </td>
                    <td className="px-3 text-right font-extrabold text-primary tabular-nums whitespace-nowrap">
                      {priceEok}억
                    </td>
                    <td className="px-3 text-right font-black text-primary tabular-nums whitespace-nowrap">
                      <span>{formatPriceEokCompact(apt.latestPriceWon, '억')}</span>
                      {latestDateShort && (
                        <span className="text-[10px] font-semibold text-tertiary ml-1">
                          ({latestDateShort})
                        </span>
                      )}
                    </td>
                    <td className="px-3 text-center font-medium text-secondary tabular-nums">
                      {apt.builtYear}
                    </td>
                    <td className="px-3 text-right font-bold text-tertiary tabular-nums whitespace-nowrap">
                      {apt.txCount}건
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="h-[120px] text-center text-secondary font-medium">
                  선택한 필터 조건에 부합하는 단지가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Load More Button */}
      {displayedRecords.length > displayCount && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setDisplayCount((prev) => prev + 25)}
            className="px-4 py-2 rounded-xl bg-surface hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] border border-border text-xs font-bold text-primary transition-colors"
          >
            {displayedRecords.length - displayCount}개 단지 더보기
          </button>
        </div>
      )}
    </section>
  );
}
