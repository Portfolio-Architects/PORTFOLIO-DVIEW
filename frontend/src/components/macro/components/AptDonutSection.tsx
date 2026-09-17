'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { ChevronRight } from 'lucide-react';
import { getDisplayAptName, normalizeAptName, findTxKey } from '@/lib/utils/apartmentMapping';
import { preloadApartmentModal } from '@/components/common/preload';
import type { AptTxSummary } from '@/types';

export const formatPriceEok = (priceVal: number): string => {
  if (typeof priceVal !== 'number' || !isFinite(priceVal) || priceVal <= 0) return '-';
  const priceMan = Math.round(priceVal * 10000);
  if (priceMan >= 10000) {
    const eok = Math.floor(priceMan / 10000);
    const man = priceMan % 10000;
    return man === 0 ? `${eok}억` : `${eok}억 ${man.toLocaleString()}만`;
  }
  return `${priceMan.toLocaleString()}만`;
};

export const formatDeltaPrice = (deltaEok: number): string => {
  if (typeof deltaEok !== 'number' || !isFinite(deltaEok)) return '';
  const deltaMan = Math.round(Math.abs(deltaEok) * 10000);
  if (!isFinite(deltaMan) || deltaMan <= 0) return '';
  if (deltaMan >= 10000) {
    const eok = Math.floor(deltaMan / 10000);
    const man = deltaMan % 10000;
    return man === 0 ? `${eok}억` : `${eok}억 ${man.toLocaleString()}만`;
  }
  return `${deltaMan.toLocaleString()}만`;
};

export interface AptEnergyItem {
  aptName: string;
  displayAptName?: string;
  dong: string;
  priceVal: number;
  priceEok: string;
  areaPyeong: number;
  area?: number;
  floor?: number | string;
  delta: number;
  deltaPercent?: number;
  prevPriceVal?: number;
  contractDate?: string;
  dateLabel?: string;
  isNewHigh?: boolean;
}

export interface AptDonutDataItem {
  name: string;
  subName?: string;
  category: string;
  value: number; // percentage (0 ~ 100)
  count: number;
  color: string;
  items: AptEnergyItem[];
  policyDescription?: string;
}

export type AptDonutMode = 'policy' | 'energy';

export interface AptDonutSectionProps {
  mounted?: boolean;
  recentTransactions?: any[];
  txSummaryData?: Record<string, AptTxSummary> | { summary?: Record<string, AptTxSummary> };
  nameMapping?: Record<string, string>;
  publicRentalSet?: Set<string>;
  onSelectApt?: (name: string, dong?: string) => void;
  preloadApartmentTx?: (name: string, dong: string) => void;
  activeCategory?: string | null;
  onActiveCategoryChange?: (category: string | null) => void;
  initialMode?: AptDonutMode;
  mode?: AptDonutMode;
  onModeChange?: (mode: AptDonutMode) => void;
  chartSize?: number;
  className?: string;
}

export const ENERGY_COLORS: Record<'high' | 'rising' | 'flat' | 'falling', string> = {
  high: '#f43f5e',    // 신고가: Rose Red
  rising: '#ea6100',  // 상승거래: D-VIEW Orange
  flat: '#10b981',    // 보합: Emerald Green
  falling: '#3b82f6', // 하락거래: Blue
};

export const POLICY_COLORS: Record<'under6' | 'under9' | 'under15' | 'over15', string> = {
  under6: '#10b981',   // 6억 이하: Emerald Green
  under9: '#ea6100',   // 6억 ~ 9억: D-VIEW Orange
  under15: '#3b82f6',  // 9억 ~ 15억: Royal Blue
  over15: '#8b5cf6',   // 15억 초과: Violet
};

export const AptDonutSection = React.memo(function AptDonutSection({
  mounted = true,
  recentTransactions = [],
  txSummaryData,
  nameMapping,
  publicRentalSet,
  onSelectApt,
  preloadApartmentTx,
  activeCategory: controlledActiveCategory,
  onActiveCategoryChange,
  initialMode = 'policy',
  mode: controlledMode,
  onModeChange,
  chartSize = 200,
  className = '',
}: AptDonutSectionProps) {
  const [internalMode, setInternalMode] = useState<AptDonutMode>(initialMode);
  const isControlledMode = controlledMode !== undefined;
  const mode = isControlledMode ? controlledMode : internalMode;

  const [internalActiveCategory, setInternalActiveCategory] = useState<string | null>(null);

  const isControlledCategory = controlledActiveCategory !== undefined;
  const activeCategory = isControlledCategory
    ? controlledActiveCategory
    : internalActiveCategory;

  const setActiveCategory = useCallback((cat: string | null) => {
    if (!isControlledCategory) {
      setInternalActiveCategory(cat);
    }
    onActiveCategoryChange?.(cat);
  }, [isControlledCategory, onActiveCategoryChange]);

  const handleModeChange = useCallback((newMode: AptDonutMode) => {
    if (!isControlledMode) {
      setInternalMode(newMode);
    }
    setActiveCategory(null);
    onModeChange?.(newMode);
  }, [isControlledMode, setActiveCategory, onModeChange]);

  const summaryMap = useMemo(() => {
    if (!txSummaryData) return {};
    return (txSummaryData as { summary?: Record<string, AptTxSummary> })?.summary || (txSummaryData as Record<string, AptTxSummary>);
  }, [txSummaryData]);

  // Analyze recent transactions into policy loan tiers or energy categories
  const { donutData, totalCount } = useMemo(() => {
    // Energy categories
    const highItems: AptEnergyItem[] = [];
    const risingItems: AptEnergyItem[] = [];
    const flatItems: AptEnergyItem[] = [];
    const fallingItems: AptEnergyItem[] = [];

    // Policy loan tiers
    const under6Items: AptEnergyItem[] = [];
    const under9Items: AptEnergyItem[] = [];
    const under15Items: AptEnergyItem[] = [];
    const over15Items: AptEnergyItem[] = [];

    if (Array.isArray(recentTransactions) && recentTransactions.length > 0) {
      recentTransactions.forEach((tx) => {
        if (!tx || typeof tx !== 'object') return;
        if (!tx.aptName && !tx.txKey && typeof tx.priceVal !== 'number' && typeof tx.price !== 'number') return;
        if (publicRentalSet && publicRentalSet.has(tx.aptName)) return;

        const isHigh = Boolean(tx.isNewHigh || tx.type === 'high');
        const priceVal = typeof tx.priceVal === 'number' && isFinite(tx.priceVal)
          ? tx.priceVal
          : (typeof tx.price === 'number' && isFinite(tx.price) ? (tx.price > 1000 ? tx.price / 10000 : tx.price) : 0);
        const prevPriceVal = typeof tx.prevPriceVal === 'number' ? tx.prevPriceVal : undefined;
        
        let delta = 0;
        if (typeof tx.delta === 'number') {
          delta = tx.delta;
        } else if (prevPriceVal !== undefined && priceVal > 0) {
          delta = priceVal - prevPriceVal;
        }

        const deltaPercent = typeof tx.deltaPercent === 'number' ? tx.deltaPercent : 
          (prevPriceVal && prevPriceVal > 0 ? (delta / prevPriceVal) * 100 : 0);

        const deltaMan = Math.round(delta * 10000);

        const aptKey = tx.txKey || tx.aptName || '';
        const matchedSummaryKey = findTxKey(aptKey, summaryMap, nameMapping);
        const dong = ((matchedSummaryKey && summaryMap[matchedSummaryKey]?.dong) ||
          summaryMap[aptKey]?.dong ||
          summaryMap[normalizeAptName(aptKey)]?.dong ||
          tx.dong ||
          '') as string;
        const rawAptName = tx.aptName || tx.txKey || '';
        const displayAptName = getDisplayAptName(rawAptName);

        const areaPyeong = typeof tx.areaPyeong === 'number' && tx.areaPyeong > 0
          ? tx.areaPyeong
          : (typeof tx.area === 'number' && tx.area > 0 ? tx.area / 3.3058 : 0);

        const item: AptEnergyItem = {
          aptName: rawAptName,
          displayAptName,
          dong,
          priceVal,
          priceEok: tx.priceEok || formatPriceEok(priceVal),
          areaPyeong,
          area: tx.area,
          floor: tx.floor,
          delta,
          deltaPercent,
          prevPriceVal,
          contractDate: tx.contractDate,
          dateLabel: tx.dateLabel || tx.date,
          isNewHigh: isHigh,
        };

        // Energy categorization
        if (isHigh) {
          highItems.push(item);
        } else if (deltaMan > 0) {
          risingItems.push(item);
        } else if (deltaMan < 0) {
          fallingItems.push(item);
        } else {
          flatItems.push(item);
        }

        // Policy loan categorization (by transaction price in 억)
        if (priceVal <= 6.0) {
          under6Items.push(item);
        } else if (priceVal <= 9.0) {
          under9Items.push(item);
        } else if (priceVal <= 15.0) {
          under15Items.push(item);
        } else {
          over15Items.push(item);
        }
      });
    }

    const total = highItems.length + risingItems.length + flatItems.length + fallingItems.length;

    if (mode === 'policy') {
      let p6 = 0;
      let p9 = 0;
      let p15 = 0;
      let pOver = 0;

      if (total > 0) {
        p6 = Math.round((under6Items.length / total) * 1000) / 10;
        p9 = Math.round((under9Items.length / total) * 1000) / 10;
        p15 = Math.round((under15Items.length / total) * 1000) / 10;
        pOver = Math.round((over15Items.length / total) * 1000) / 10;

        // Adjust rounding to ensure sum === 100.0% exactly
        const sum = Math.round((p6 + p9 + p15 + pOver) * 10) / 10;
        if (sum !== 100.0) {
          const diff = Math.round((100.0 - sum) * 10) / 10;
          const segments = [
            { key: 'under6', count: under6Items.length },
            { key: 'under9', count: under9Items.length },
            { key: 'under15', count: under15Items.length },
            { key: 'over15', count: over15Items.length },
          ].sort((a, b) => b.count - a.count);

          if (segments[0].key === 'under6') p6 = Math.round((p6 + diff) * 10) / 10;
          else if (segments[0].key === 'under9') p9 = Math.round((p9 + diff) * 10) / 10;
          else if (segments[0].key === 'under15') p15 = Math.round((p15 + diff) * 10) / 10;
          else pOver = Math.round((pOver + diff) * 10) / 10;
        }
      }

      under6Items.sort((a, b) => b.priceVal - a.priceVal);
      under9Items.sort((a, b) => b.priceVal - a.priceVal);
      under15Items.sort((a, b) => b.priceVal - a.priceVal);
      over15Items.sort((a, b) => b.priceVal - a.priceVal);

      const policyDonut: AptDonutDataItem[] = [
        {
          name: '6억 이하',
          subName: '디딤돌·신생아',
          category: 'under6',
          value: p6,
          count: under6Items.length,
          color: POLICY_COLORS.under6,
          items: under6Items,
          policyDescription: '디딤돌대출(최저 1.5%~) 및 신생아 특례대출(최저 1.6%~) 최대 금리우대 적격 구간',
        },
        {
          name: '6억 ~ 9억',
          subName: '특례보금자리',
          category: 'under9',
          value: p9,
          count: under9Items.length,
          color: POLICY_COLORS.under9,
          items: under9Items,
          policyDescription: '특례보금자리론 및 신생아 특례대출(9억 이하) 실수요 집중 수혜 구간',
        },
        {
          name: '9억 ~ 15억',
          subName: '일반 주담대',
          category: 'under15',
          value: p15,
          count: under15Items.length,
          color: POLICY_COLORS.under15,
          items: under15Items,
          policyDescription: '1금융권 시중은행 주택담보대출 및 모바일 대환대출 주력 구간',
        },
        {
          name: '15억 초과',
          subName: '고가·자산가',
          category: 'over15',
          value: pOver,
          count: over15Items.length,
          color: POLICY_COLORS.over15,
          items: over15Items,
          policyDescription: '고가 주택 주담대 LTV 및 취득세 중과, 자금조달계획서 점검 구간',
        },
      ];

      return {
        donutData: policyDonut,
        totalCount: total,
      };
    }

    // Energy Mode
    let highPct = 0;
    let risingPct = 0;
    let flatPct = 0;
    let fallingPct = 0;

    if (total > 0) {
      highPct = Math.round((highItems.length / total) * 1000) / 10;
      risingPct = Math.round((risingItems.length / total) * 1000) / 10;
      flatPct = Math.round((flatItems.length / total) * 1000) / 10;
      fallingPct = Math.round((fallingItems.length / total) * 1000) / 10;

      // Adjust rounding to ensure sum === 100.0% exactly
      const sum = Math.round((highPct + risingPct + flatPct + fallingPct) * 10) / 10;
      if (sum !== 100.0) {
        const diff = Math.round((100.0 - sum) * 10) / 10;
        const segments = [
          { key: 'high', count: highItems.length },
          { key: 'rising', count: risingItems.length },
          { key: 'flat', count: flatItems.length },
          { key: 'falling', count: fallingItems.length },
        ].sort((a, b) => b.count - a.count);

        if (segments[0].key === 'high') highPct = Math.round((highPct + diff) * 10) / 10;
        else if (segments[0].key === 'rising') risingPct = Math.round((risingPct + diff) * 10) / 10;
        else if (segments[0].key === 'flat') flatPct = Math.round((flatPct + diff) * 10) / 10;
        else fallingPct = Math.round((fallingPct + diff) * 10) / 10;
      }
    }

    // Sort items within each category
    highItems.sort((a, b) => (b.delta || 0) - (a.delta || 0) || b.priceVal - a.priceVal);
    risingItems.sort((a, b) => (b.delta || 0) - (a.delta || 0) || b.priceVal - a.priceVal);
    flatItems.sort((a, b) => b.priceVal - a.priceVal);
    fallingItems.sort((a, b) => (a.delta || 0) - (b.delta || 0) || b.priceVal - a.priceVal);

    const energyDonut: AptDonutDataItem[] = [
      {
        name: '신고가',
        category: 'high',
        value: highPct,
        count: highItems.length,
        color: ENERGY_COLORS.high,
        items: highItems,
      },
      {
        name: '상승거래',
        category: 'rising',
        value: risingPct,
        count: risingItems.length,
        color: ENERGY_COLORS.rising,
        items: risingItems,
      },
      {
        name: '보합',
        category: 'flat',
        value: flatPct,
        count: flatItems.length,
        color: ENERGY_COLORS.flat,
        items: flatItems,
      },
      {
        name: '하락거래',
        category: 'falling',
        value: fallingPct,
        count: fallingItems.length,
        color: ENERGY_COLORS.falling,
        items: fallingItems,
      },
    ];

    return {
      donutData: energyDonut,
      totalCount: total,
    };
  }, [recentTransactions, summaryMap, publicRentalSet, nameMapping, mode]);

  const activeSector = useMemo(() => {
    if (!activeCategory) return null;
    return donutData.find(d => d.name === activeCategory || d.category === activeCategory) || null;
  }, [donutData, activeCategory]);

  const handleCardClick = useCallback((aptName: string, dong?: string) => {
    if (onSelectApt) {
      onSelectApt(aptName, dong);
    }
  }, [onSelectApt]);

  const handleCardHover = useCallback((aptName: string, dong?: string) => {
    if (preloadApartmentTx) {
      preloadApartmentTx(aptName, dong || '');
    }
    preloadApartmentModal();
  }, [preloadApartmentTx]);

  return (
    <div
      id="apt-market-energy-donut"
      className={`bg-surface border border-border/80 p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] shadow-sm flex flex-col justify-between ${activeSector ? 'h-auto gap-4' : 'h-auto sm:h-[370px]'} shrink-0 ${className}`}
    >
      {/* Header with Dual-Mode Segmented Control */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <h3 className="text-[15px] font-black text-primary tracking-tight flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: mode === 'policy' ? '#10b981' : '#ea6100' }}
            />
            <span>{mode === 'policy' ? '실거래 정책대출 적격 분포' : '실거래 시장 에너지 분포'}</span>
          </h3>

          {/* Mode Switcher */}
          <div className="flex items-center p-0.5 bg-neutral-100 dark:bg-zinc-800 rounded-lg text-[11px] font-bold border border-border/40">
            <button
              type="button"
              onClick={() => handleModeChange('policy')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                mode === 'policy'
                  ? 'bg-surface text-primary shadow-xs font-black'
                  : 'text-tertiary hover:text-primary'
              }`}
            >
              정책대출 기준
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('energy')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                mode === 'energy'
                  ? 'bg-surface text-primary shadow-xs font-black'
                  : 'text-tertiary hover:text-primary'
              }`}
            >
              실거래 변동
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black bg-neutral-100 dark:bg-zinc-800 text-tertiary px-2.5 py-1 rounded-full uppercase tracking-wide hidden sm:inline-block">
            최근 실거래 {totalCount.toLocaleString()}건 전수 분석
          </span>
          {activeCategory && (
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className="text-[11px] font-bold text-tertiary hover:text-primary cursor-pointer transition-colors"
            >
              선택 초기화
            </button>
          )}
        </div>
      </div>

      {/* Main Chart & Category Legend Grid (5:7 split with divider) */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 sm:gap-0 flex-1 min-h-[240px] items-center w-full px-2 sm:px-4">
        {/* Left: Donut Chart Container (5/12) */}
        <div className="col-span-1 sm:col-span-5 flex items-center justify-center relative w-full h-full sm:border-r border-border/60 dark:border-border/30 pr-0 sm:pr-4 py-2">
          {mounted ? (
            <div style={{ width: chartSize, height: chartSize }} className="relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {totalCount === 0 ? (
                    <Pie
                      data={[{ value: 1 }]}
                      cx="50%"
                      cy="50%"
                      innerRadius="62%"
                      outerRadius="90%"
                      dataKey="value"
                      stroke="transparent"
                      isAnimationActive={false}
                    >
                      <Cell className="fill-slate-200 dark:fill-zinc-800" fill="currentColor" />
                    </Pie>
                  ) : (
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius="62%"
                      outerRadius="90%"
                      paddingAngle={3}
                      dataKey="value"
                      onClick={(entry: any) => {
                        const entryName = entry?.name || null;
                        if (activeCategory === entryName || (entry?.category && activeCategory === entry.category)) {
                          setActiveCategory(null);
                        } else {
                          setActiveCategory(entryName);
                        }
                      }}
                      cursor="pointer"
                      isAnimationActive={false}
                    >
                      {donutData.map((entry) => {
                        const isSelected = activeCategory === entry.name || activeCategory === entry.category;
                        return (
                          <Cell
                            key={entry.name}
                            fill={entry.color}
                            opacity={activeCategory === null || isSelected ? 1 : 0.35}
                            stroke={isSelected ? '#ffffff' : 'transparent'}
                            strokeWidth={isSelected ? 3 : 0}
                            className="transition-all duration-200 outline-none cursor-pointer"
                          />
                        );
                      })}
                    </Pie>
                  )}
                  {totalCount > 0 && (
                    <Tooltip
                      formatter={(val: any, name: any) => [`${Number(val).toFixed(1)}%`, `${name} 비중`]}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.92)',
                        borderRadius: '12px',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 700,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                      }}
                    />
                  )}
                </PieChart>
              </ResponsiveContainer>

              {/* Center Info Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
                {activeSector ? (
                  <>
                    <span className="text-[11px] font-extrabold text-tertiary tracking-tight px-2 truncate max-w-[130px]">
                      {activeSector.name}
                    </span>
                    <span className="text-[18px] font-black text-primary leading-tight mt-0.5">
                      {activeSector.value.toFixed(1)}%
                    </span>
                    <span
                      className="text-[11px] font-extrabold mt-0.5 px-2 py-0.5 rounded-full"
                      style={{ color: activeSector.color, backgroundColor: `${activeSector.color}15` }}
                    >
                      {activeSector.count.toLocaleString()}건
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] font-extrabold text-tertiary tracking-tight">
                      총 실거래
                    </span>
                    <span className="text-[18px] font-black text-primary leading-tight mt-0.5">
                      {totalCount.toLocaleString()}건
                    </span>
                    <span
                      className="text-[10.5px] font-extrabold mt-0.5"
                      style={{ color: mode === 'policy' ? '#10b981' : '#ea6100' }}
                    >
                      {mode === 'policy' ? '정책대출 적격' : '시장 에너지'}
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="w-[200px] h-[200px] rounded-full border-4 border-dashed border-border animate-pulse" />
          )}
        </div>

        {/* Right: 4 Category Breakdown Cards (7/12) */}
        <div className="col-span-1 sm:col-span-7 flex flex-col justify-between gap-1.5 sm:gap-2 h-full pl-0 sm:pl-5 py-2">
          {donutData.map((sector) => {
            const isSelected = activeCategory === sector.name || activeCategory === sector.category;
            return (
              <div
                key={sector.name}
                onClick={() => setActiveCategory(isSelected ? null : sector.name)}
                role="button"
                tabIndex={0}
                aria-label={`${sector.name} ${sector.count}건 (${sector.value.toFixed(1)}%) 상세 목록 보기`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveCategory(isSelected ? null : sector.name);
                  }
                }}
                className={`p-2.5 sm:p-3 rounded-xl border transition-all duration-150 cursor-pointer flex items-center justify-between gap-2.5 ${
                  isSelected
                    ? 'bg-body border-primary/50 shadow-sm ring-1 ring-primary/20 scale-[1.01]'
                    : 'bg-surface/80 hover:bg-body border-border/50 hover:border-border'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: sector.color }}
                  />
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[12.5px] sm:text-[13px] font-black text-primary whitespace-nowrap shrink-0">
                        {sector.name}
                      </span>
                      {sector.subName && (
                        <span
                          className="text-[9.5px] sm:text-[10px] font-extrabold px-1.5 py-0.2 rounded tracking-tight shrink-0 whitespace-nowrap"
                          style={{
                            color: sector.color,
                            backgroundColor: `${sector.color}15`,
                          }}
                        >
                          {sector.subName}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-tertiary shrink-0">
                      {sector.count.toLocaleString()}건
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[13px] sm:text-[13.5px] font-black text-primary">
                    {sector.value.toFixed(1)}%
                  </span>
                  <ChevronRight
                    size={13}
                    className={`text-tertiary transition-transform duration-200 ${isSelected ? 'rotate-90 text-[#ea6100]' : ''}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Representative Apartment List */}
      {activeSector && (
        <div className="p-4 sm:p-5 rounded-xl bg-body/80 border border-border/60 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: activeSector.color }}
              />
              <span className="text-[13px] sm:text-[14px] font-black text-primary flex items-center gap-1.5">
                <span>{activeSector.name}</span>
                {activeSector.subName && (
                  <span
                    className="text-[10.5px] font-extrabold px-1.5 py-0.5 rounded"
                    style={{ color: activeSector.color, backgroundColor: `${activeSector.color}15` }}
                  >
                    {activeSector.subName}
                  </span>
                )}
                <span>대표 실거래 단지 리스트</span>
                <span className="text-[11px] font-bold text-secondary">
                  ({activeSector.items.length}건)
                </span>
              </span>
            </div>
            <span className="text-[11px] font-bold text-tertiary">
              단지 클릭 시 상세 분석 리포트로 이동합니다.
            </span>
          </div>

          {activeSector.policyDescription && (
            <div
              className="mb-3.5 px-3 py-2 rounded-lg text-[11.5px] font-bold border flex items-center gap-2"
              style={{
                borderColor: `${activeSector.color}30`,
                backgroundColor: `${activeSector.color}0a`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: activeSector.color }} />
              <span className="text-secondary dark:text-zinc-300">
                {activeSector.policyDescription}
              </span>
            </div>
          )}

          {activeSector.items.length === 0 ? (
            <div className="py-6 text-center text-[12px] font-bold text-tertiary">
              해당 카테고리의 최근 실거래 내역이 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {activeSector.items.slice(0, 8).map((item, idx) => {
                const formattedDelta = formatDeltaPrice(item.delta);
                const deltaMan = Math.round(item.delta * 10000);
                const isRising = deltaMan > 0 && formattedDelta !== '';
                const isFalling = deltaMan < 0 && formattedDelta !== '';

                return (
                  <div
                    key={`${item.aptName}-${item.floor}-${idx}`}
                    onClick={() => handleCardClick(item.aptName, item.dong)}
                    onMouseEnter={() => handleCardHover(item.aptName, item.dong)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${item.displayAptName || item.aptName} ${item.priceEok} 실거래 상세 리포트 열기`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleCardClick(item.aptName, item.dong);
                      }
                    }}
                    className="p-3 rounded-xl bg-surface border border-border/50 hover:border-[#ea6100]/50 hover:shadow-sm transition-all duration-150 cursor-pointer flex flex-col justify-between gap-2 group"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      {/* Meta: Dong & Area & Floor */}
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-tertiary truncate">
                        {item.isNewHigh && (
                          <span className="text-[8.5px] font-black px-1.5 py-0.2 rounded bg-rose-500 text-white shrink-0">
                            신고가
                          </span>
                        )}
                        {item.dong && <span className="text-secondary font-extrabold">{item.dong}</span>}
                        {item.dong && <span className="opacity-30">•</span>}
                        <span>{Math.round(item.areaPyeong)}평</span>
                        {item.floor !== undefined && item.floor !== '' && (
                          <>
                            <span className="opacity-30">•</span>
                            <span>{item.floor}층</span>
                          </>
                        )}
                      </div>

                      {/* Apt Name */}
                      <span className="text-[13px] font-black text-primary group-hover:text-[#ea6100] transition-colors truncate">
                        {item.displayAptName || item.aptName}
                      </span>
                    </div>

                    {/* Price & Delta */}
                    <div className="flex items-baseline justify-between pt-1 border-t border-border/30">
                      <span className="text-[13px] font-black text-primary">
                        {item.priceEok}
                      </span>
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                          isRising
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400'
                            : isFalling
                              ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {isRising
                          ? `▲ ${formattedDelta}`
                          : isFalling
                            ? `▼ ${formattedDelta}`
                            : '보합'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default AptDonutSection;
