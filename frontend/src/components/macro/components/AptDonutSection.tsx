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

export const formatSectorAvgPrice = (items: AptEnergyItem[]): string => {
  if (!items || items.length === 0) return '';
  const valid = items.filter((it) => typeof it.priceVal === 'number' && isFinite(it.priceVal) && it.priceVal > 0);
  if (valid.length === 0) return '';
  const sum = valid.reduce((acc, it) => acc + it.priceVal, 0);
  const avg = sum / valid.length;
  if (avg >= 1) {
    const rounded = Math.round(avg * 10) / 10;
    return `평균 ${rounded.toFixed(1)}억`;
  }
  const man = Math.round(avg * 10000);
  return `평균 ${man.toLocaleString()}만`;
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
  avgPriceLabel?: string;
  isTop?: boolean;
}

export type AptDonutMode = 'pyeong' | 'energy' | 'policy';

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

export const PYEONG_COLORS: Record<'small' | 'medium' | 'large' | 'xlarge', string> = {
  small: '#10b981',   // 소형 (20평대): Emerald Green
  medium: '#ea6100',  // 국민평형 (30평대): D-VIEW Orange
  large: '#3b82f6',   // 중대형 (30후~40평): Royal Blue
  xlarge: '#8b5cf6',  // 대형 (40평+): Violet
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
  initialMode = 'pyeong',
  mode: controlledMode,
  onModeChange,
  chartSize = 200,
  className = '',
}: AptDonutSectionProps) {
  const [internalMode, setInternalMode] = useState<AptDonutMode>(initialMode);
  const isControlledMode = controlledMode !== undefined;
  const mode = isControlledMode ? controlledMode : internalMode;

  const [internalActiveCategory, setInternalActiveCategory] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

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
    setHoveredCategory(null);
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

    // Pyeong demand tiers
    const smallPyeongItems: AptEnergyItem[] = [];
    const mediumPyeongItems: AptEnergyItem[] = [];
    const largePyeongItems: AptEnergyItem[] = [];
    const xlargePyeongItems: AptEnergyItem[] = [];

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

        // Pyeong categorization
        const pyeongVal = areaPyeong > 0 ? areaPyeong : (typeof tx.area === 'number' && tx.area > 0 ? tx.area / 3.3058 : 34);
        const areaVal = typeof tx.area === 'number' && tx.area > 0 ? tx.area : pyeongVal * 3.3058;

        if (areaVal <= 60 || pyeongVal < 28) {
          smallPyeongItems.push(item);
        } else if (areaVal <= 85 || pyeongVal < 36) {
          mediumPyeongItems.push(item);
        } else if (areaVal <= 115 || pyeongVal < 43) {
          largePyeongItems.push(item);
        } else {
          xlargePyeongItems.push(item);
        }
      });
    }

    const total = highItems.length + risingItems.length + flatItems.length + fallingItems.length;

    if (mode === 'pyeong' || mode === 'policy') {
      let pSmall = 0;
      let pMedium = 0;
      let pLarge = 0;
      let pXlarge = 0;

      if (total > 0) {
        pSmall = Math.round((smallPyeongItems.length / total) * 1000) / 10;
        pMedium = Math.round((mediumPyeongItems.length / total) * 1000) / 10;
        pLarge = Math.round((largePyeongItems.length / total) * 1000) / 10;
        pXlarge = Math.round((xlargePyeongItems.length / total) * 1000) / 10;

        // Adjust rounding to ensure sum === 100.0% exactly
        const sum = Math.round((pSmall + pMedium + pLarge + pXlarge) * 10) / 10;
        if (sum !== 100.0) {
          const diff = Math.round((100.0 - sum) * 10) / 10;
          const segments = [
            { key: 'small', count: smallPyeongItems.length },
            { key: 'medium', count: mediumPyeongItems.length },
            { key: 'large', count: largePyeongItems.length },
            { key: 'xlarge', count: xlargePyeongItems.length },
          ].sort((a, b) => b.count - a.count);

          if (segments[0].key === 'small') pSmall = Math.round((pSmall + diff) * 10) / 10;
          else if (segments[0].key === 'medium') pMedium = Math.round((pMedium + diff) * 10) / 10;
          else if (segments[0].key === 'large') pLarge = Math.round((pLarge + diff) * 10) / 10;
          else pXlarge = Math.round((pXlarge + diff) * 10) / 10;
        }
      }

      smallPyeongItems.sort((a, b) => (b.contractDate || '').localeCompare(a.contractDate || '') || b.priceVal - a.priceVal);
      mediumPyeongItems.sort((a, b) => (b.contractDate || '').localeCompare(a.contractDate || '') || b.priceVal - a.priceVal);
      largePyeongItems.sort((a, b) => (b.contractDate || '').localeCompare(a.contractDate || '') || b.priceVal - a.priceVal);
      xlargePyeongItems.sort((a, b) => (b.contractDate || '').localeCompare(a.contractDate || '') || b.priceVal - a.priceVal);

      const pSmallAvg = formatSectorAvgPrice(smallPyeongItems);
      const pMediumAvg = formatSectorAvgPrice(mediumPyeongItems);
      const pLargeAvg = formatSectorAvgPrice(largePyeongItems);
      const pXlargeAvg = formatSectorAvgPrice(xlargePyeongItems);

      const pyeongCounts = [smallPyeongItems.length, mediumPyeongItems.length, largePyeongItems.length, xlargePyeongItems.length];
      const maxPyeongCount = Math.max(...pyeongCounts);
      const hasSinglePyeongMax = total > 0 && maxPyeongCount > 0 && pyeongCounts.filter(c => c === maxPyeongCount).length === 1;

      const pyeongDonut: AptDonutDataItem[] = [
        {
          name: '소형 (20평대)',
          subName: '59㎡ 이하',
          category: 'small',
          value: pSmall,
          count: smallPyeongItems.length,
          color: PYEONG_COLORS.small,
          items: smallPyeongItems,
          policyDescription: '신혼부부 및 가성비 첫 집 마련 실수요 선호 평형',
          avgPriceLabel: pSmallAvg,
          isTop: hasSinglePyeongMax && smallPyeongItems.length === maxPyeongCount,
        },
        {
          name: '국민평형 (30평대)',
          subName: '84㎡ 주력',
          category: 'medium',
          value: pMedium,
          count: mediumPyeongItems.length,
          color: PYEONG_COLORS.medium,
          items: mediumPyeongItems,
          policyDescription: '3~4인 가족 실거주 중심, 환금성과 거래량이 가장 높은 주력 평형',
          avgPriceLabel: pMediumAvg,
          isTop: hasSinglePyeongMax && mediumPyeongItems.length === maxPyeongCount,
        },
        {
          name: '중대형 (30후~40평)',
          subName: '85~115㎡',
          category: 'large',
          value: pLarge,
          count: largePyeongItems.length,
          color: PYEONG_COLORS.large,
          items: largePyeongItems,
          policyDescription: '넓은 공간 및 쾌적 주거를 위한 상급지 갈아타기 선호 평형',
          avgPriceLabel: pLargeAvg,
          isTop: hasSinglePyeongMax && largePyeongItems.length === maxPyeongCount,
        },
        {
          name: '대형 (40평+)',
          subName: '115㎡ 초과',
          category: 'xlarge',
          value: pXlarge,
          count: xlargePyeongItems.length,
          color: PYEONG_COLORS.xlarge,
          items: xlargePyeongItems,
          policyDescription: '희소성과 조망권을 갖춘 대형 및 펜트하우스 자산가 평형',
          avgPriceLabel: pXlargeAvg,
          isTop: hasSinglePyeongMax && xlargePyeongItems.length === maxPyeongCount,
        },
      ];

      return {
        donutData: pyeongDonut,
        totalCount: total,
      };
    }

    // Energy Mode (시장 체감 온도)
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

    const highAvg = formatSectorAvgPrice(highItems);
    const risingAvg = formatSectorAvgPrice(risingItems);
    const flatAvg = formatSectorAvgPrice(flatItems);
    const fallingAvg = formatSectorAvgPrice(fallingItems);

    const energyCounts = [highItems.length, risingItems.length, flatItems.length, fallingItems.length];
    const maxEnergyCount = Math.max(...energyCounts);
    const hasSingleEnergyMax = total > 0 && maxEnergyCount > 0 && energyCounts.filter(c => c === maxEnergyCount).length === 1;

    const energyDonut: AptDonutDataItem[] = [
      {
        name: '신고가',
        subName: '최고가 갱신',
        category: 'high',
        value: highPct,
        count: highItems.length,
        color: ENERGY_COLORS.high,
        items: highItems,
        policyDescription: '종전 최고가를 넘어선 신고가 거래로 매수세가 강력한 단지',
        avgPriceLabel: highAvg,
        isTop: hasSingleEnergyMax && highItems.length === maxEnergyCount,
      },
      {
        name: '상승거래',
        subName: '직전가 대비 상승',
        category: 'rising',
        value: risingPct,
        count: risingItems.length,
        color: ENERGY_COLORS.rising,
        items: risingItems,
        policyDescription: '직전 실거래가보다 상승 체결되어 가격 회복을 주도하는 단지',
        avgPriceLabel: risingAvg,
        isTop: hasSingleEnergyMax && risingItems.length === maxEnergyCount,
      },
      {
        name: '보합',
        subName: '가격 유지',
        category: 'flat',
        value: flatPct,
        count: flatItems.length,
        color: ENERGY_COLORS.flat,
        items: flatItems,
        policyDescription: '직전 실거래가와 동일하거나 변동폭이 미미한 안정적 거래 단지',
        avgPriceLabel: flatAvg,
        isTop: hasSingleEnergyMax && flatItems.length === maxEnergyCount,
      },
      {
        name: '하락거래',
        subName: '직전가 대비 하락',
        category: 'falling',
        value: fallingPct,
        count: fallingItems.length,
        color: ENERGY_COLORS.falling,
        items: fallingItems,
        policyDescription: '직전 실거래가보다 낮게 체결된 급매 또는 가격 조정 거래 단지',
        avgPriceLabel: fallingAvg,
        isTop: hasSingleEnergyMax && fallingItems.length === maxEnergyCount,
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

  const displaySector = useMemo(() => {
    if (activeSector) return activeSector;
    if (hoveredCategory) {
      return donutData.find(d => d.name === hoveredCategory || d.category === hoveredCategory) || null;
    }
    return null;
  }, [activeSector, hoveredCategory, donutData]);

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
              style={{ backgroundColor: mode === 'energy' ? '#ea6100' : '#10b981' }}
            />
            <span>{mode === 'energy' ? '실거래 시장 체감 온도' : '실거래 평형대별 수요 분포'}</span>
          </h3>

          {/* Mode Switcher */}
          <div className="flex items-center p-0.5 bg-neutral-100 dark:bg-zinc-800 rounded-lg text-[11px] font-bold border border-border/40">
            <button
              type="button"
              onClick={() => handleModeChange('pyeong')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                mode === 'pyeong' || mode === 'policy'
                  ? 'bg-surface text-primary shadow-xs font-black'
                  : 'text-tertiary hover:text-primary'
              }`}
            >
              평형대별 수요
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
              시장 체감 온도
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
                      cornerRadius={5}
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
                        const isHovered = hoveredCategory === entry.name || hoveredCategory === entry.category;
                        const isHighlighted = (activeCategory === null && hoveredCategory === null) || isSelected || isHovered;
                        return (
                          <Cell
                            key={entry.name}
                            fill={entry.color}
                            opacity={isHighlighted ? 1 : 0.35}
                            stroke={isSelected || isHovered ? '#ffffff' : 'transparent'}
                            strokeWidth={isSelected || isHovered ? 2.5 : 0}
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
                {displaySector ? (
                  <>
                    <span className="text-[11px] font-extrabold text-tertiary tracking-tight px-2 truncate max-w-[130px]">
                      {displaySector.name}
                    </span>
                    <span className="text-[18px] font-black text-primary leading-tight mt-0.5">
                      {displaySector.value.toFixed(1)}%
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full"
                        style={{ color: displaySector.color, backgroundColor: `${displaySector.color}15` }}
                      >
                        {displaySector.count.toLocaleString()}건
                      </span>
                      {displaySector.avgPriceLabel && (
                        <span className="text-[10px] font-bold text-secondary">
                          {displaySector.avgPriceLabel}
                        </span>
                      )}
                    </div>
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
                      style={{ color: mode === 'energy' ? '#ea6100' : '#10b981' }}
                    >
                      {mode === 'energy' ? '시장 체감 온도' : '평형대별 수요'}
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
            const isHovered = hoveredCategory === sector.name || hoveredCategory === sector.category;
            return (
              <div
                key={sector.name}
                onClick={() => setActiveCategory(isSelected ? null : sector.name)}
                onMouseEnter={() => setHoveredCategory(sector.name)}
                onMouseLeave={() => setHoveredCategory(null)}
                role="button"
                tabIndex={0}
                aria-label={`${sector.name} ${sector.count}건 (${sector.value.toFixed(1)}%) 상세 목록 보기`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveCategory(isSelected ? null : sector.name);
                  }
                }}
                className={`p-2.5 sm:p-2.5 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between gap-1.5 ${
                  isSelected
                    ? 'bg-body border-primary/50 shadow-sm ring-1 ring-primary/20 scale-[1.01]'
                    : isHovered
                      ? 'bg-body/70 border-border shadow-xs'
                      : 'bg-surface/80 hover:bg-body border-border/50 hover:border-border'
                }`}
              >
                {/* Header Row: Dot + Name + Badges (left) | AvgPrice + Value + Chevron (right) */}
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: sector.color }}
                    />
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
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
                      {sector.isTop && (
                        <span className="text-[9px] sm:text-[9.5px] font-black px-1.5 py-0.2 rounded tracking-tight shrink-0 whitespace-nowrap bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          최다 거래
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {sector.avgPriceLabel && (
                      <span className="text-[11px] sm:text-[11.5px] font-extrabold text-secondary bg-neutral-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                        {sector.avgPriceLabel}
                      </span>
                    )}
                    <span className="text-[12.5px] sm:text-[13px] font-black text-primary">
                      {sector.value.toFixed(1)}%
                    </span>
                    <ChevronRight
                      size={13}
                      className={`text-tertiary transition-transform duration-200 ${isSelected ? 'rotate-90 text-[#ea6100]' : ''}`}
                    />
                  </div>
                </div>

                {/* Sub Row: Count */}
                <div className="flex items-center justify-between text-[10px] sm:text-[10.5px] font-bold text-tertiary px-0.5">
                  <span>{sector.count.toLocaleString()}건</span>
                </div>

                {/* Progress Bar (Visual Ratio) */}
                <div className="w-full bg-neutral-100 dark:bg-zinc-800/80 h-1 sm:h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(0, sector.value))}%`,
                      backgroundColor: sector.color,
                    }}
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
