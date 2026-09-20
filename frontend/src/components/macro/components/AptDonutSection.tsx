'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { ChevronRight } from 'lucide-react';
import { getDisplayAptName, normalizeAptName, findTxKey } from '@/lib/utils/apartmentMapping';
import type { AptTxSummary } from '@/types';
import { usePeriodTransactions } from '@/hooks/useStaticData';
import type { TimelinePeriod } from '@/types/transaction';

export type AptDonutPeriod = '7d' | '30d' | '90d' | '1y';

export const PERIOD_LABELS: Record<AptDonutPeriod, string> = {
  '7d': '최근 7일',
  '30d': '최근 30일',
  '90d': '최근 90일',
  '1y': '최근 1년',
};

export const PERIOD_BUTTONS: { key: AptDonutPeriod; label: string; ariaLabel: string }[] = [
  { key: '7d', label: '7일', ariaLabel: '최근 7일 실거래 보기' },
  { key: '30d', label: '30일', ariaLabel: '최근 30일 실거래 보기' },
  { key: '90d', label: '90일', ariaLabel: '최근 90일 실거래 보기' },
  { key: '1y', label: '1년', ariaLabel: '최근 1년 실거래 보기' },
];

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

export const getRepresentativeApt = (items: AptEnergyItem[]) => {
  if (!items || items.length === 0) return null;
  const top = items[0];
  return {
    name: top.displayAptName || top.aptName,
    rawName: top.aptName,
    price: top.priceEok || formatPriceEok(top.priceVal),
    dong: top.dong,
  };
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
  repApt?: {
    name: string;
    rawName: string;
    price: string;
    dong?: string;
  } | null;
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
  onActiveSectorChange?: (sector: AptDonutDataItem | null) => void;
  initialMode?: AptDonutMode;
  mode?: AptDonutMode;
  onModeChange?: (mode: AptDonutMode) => void;
  initialPeriod?: AptDonutPeriod;
  period?: AptDonutPeriod;
  onPeriodChange?: (period: AptDonutPeriod) => void;
  chartSize?: number;
  className?: string;
}

export const ENERGY_COLORS: Record<'high' | 'rising' | 'flat' | 'falling', string> = {
  high: '#f43f5e',    // 신고가: Rose Red
  rising: '#ea6100',  // 상승거래: D-VIEW Orange
  flat: '#10b981',    // 보합: Emerald Green
  falling: '#3b82f6', // 하락거래: Blue
};

export const PRICE_TIER_COLORS: Record<'under6' | 'under9' | 'under15' | 'over15', string> = {
  under6: '#0d9488',   // 6억 이하: D-VIEW Emerald Teal
  under9: '#ea6100',   // 6억 ~ 9억: D-VIEW Signature Orange (최다 거래 주력)
  under15: '#0284c7',  // 9억 ~ 15억: Ocean Sky Blue (상급지 갈아타기)
  over15: '#6366f1',   // 15억 초과: Royal Indigo (하이엔드 프리미엄 자산)
};

export const POLICY_COLORS = PRICE_TIER_COLORS;

export const PYEONG_COLORS: Record<'small' | 'medium' | 'large' | 'xlarge', string> = {
  small: '#0d9488',   // 소형 (20평대): Emerald Teal
  medium: '#ea6100',  // 국민평형 (30평대): D-VIEW Orange
  large: '#0284c7',   // 중대형 (30후~40평): Ocean Sky Blue
  xlarge: '#6366f1',  // 대형 (40평+): Royal Indigo
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
  onActiveSectorChange,
  initialMode = 'pyeong',
  mode: controlledMode,
  onModeChange,
  initialPeriod = '90d',
  period: controlledPeriod,
  onPeriodChange,
  chartSize = 215,
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

  const [internalPeriod, setInternalPeriod] = useState<AptDonutPeriod>(initialPeriod);
  const isControlledPeriod = controlledPeriod !== undefined;
  const period = isControlledPeriod ? controlledPeriod : internalPeriod;

  const handlePeriodChange = useCallback((newPeriod: AptDonutPeriod) => {
    if (!isControlledPeriod) {
      setInternalPeriod(newPeriod);
    }
    setActiveCategory(null);
    setHoveredCategory(null);
    onPeriodChange?.(newPeriod);
  }, [isControlledPeriod, setActiveCategory, onPeriodChange]);

  const timelinePeriodForFetch: TimelinePeriod = period === '1y' ? '1y' : '90d';
  const { transactions: periodTransactions, isLoading: isPeriodLoading } = usePeriodTransactions(
    timelinePeriodForFetch,
    recentTransactions
  );

  const activeTransactions = useMemo(() => {
    const baseTxs = period === '1y'
      ? (Array.isArray(periodTransactions) && periodTransactions.length > 0 ? periodTransactions : recentTransactions || [])
      : (Array.isArray(recentTransactions) && recentTransactions.length > 0 ? recentTransactions : periodTransactions || []);

    if (!Array.isArray(baseTxs) || baseTxs.length === 0) return [];
    if (period === '90d' || period === '1y') return baseTxs;

    const days = period === '7d' ? 7 : 30;

    let maxDateStr = '';
    for (let i = 0; i < baseTxs.length; i++) {
      const cd = String(baseTxs[i]?.contractDate || baseTxs[i]?.date || '');
      const clean = cd.replace(/[^0-9]/g, '').slice(0, 8);
      if (clean > maxDateStr) maxDateStr = clean;
    }
    if (maxDateStr.length < 8) return baseTxs;

    const y = parseInt(maxDateStr.slice(0, 4), 10);
    const m = parseInt(maxDateStr.slice(4, 6), 10) - 1;
    const d = parseInt(maxDateStr.slice(6, 8), 10);
    const cutoffD = new Date(y, m, d - days);
    const cutoffNum = cutoffD.getFullYear() * 10000 + (cutoffD.getMonth() + 1) * 100 + cutoffD.getDate();

    return baseTxs.filter((tx) => {
      const cd = String(tx?.contractDate || tx?.date || '');
      const clean = cd.replace(/[^0-9]/g, '').slice(0, 8);
      if (clean.length < 8) return true;
      return parseInt(clean, 10) >= cutoffNum;
    });
  }, [period, periodTransactions, recentTransactions]);

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

  // Analyze recent transactions into price tiers (실거래 가격대별 수요)
  const { donutData, totalCount } = useMemo(() => {
    const under6Items: AptEnergyItem[] = [];
    const under9Items: AptEnergyItem[] = [];
    const under15Items: AptEnergyItem[] = [];
    const over15Items: AptEnergyItem[] = [];

    if (Array.isArray(activeTransactions) && activeTransactions.length > 0) {
      activeTransactions.forEach((tx) => {
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

        // Price tier categorization (6억 이하, 6억~9억, 9억~15억, 15억 초과)
        if (priceVal <= 6) {
          under6Items.push(item);
        } else if (priceVal <= 9) {
          under9Items.push(item);
        } else if (priceVal <= 15) {
          under15Items.push(item);
        } else {
          over15Items.push(item);
        }
      });
    }

    const total = under6Items.length + under9Items.length + under15Items.length + over15Items.length;

    let pUnder6 = 0;
    let pUnder9 = 0;
    let pUnder15 = 0;
    let pOver15 = 0;

    if (total > 0) {
      pUnder6 = Math.round((under6Items.length / total) * 1000) / 10;
      pUnder9 = Math.round((under9Items.length / total) * 1000) / 10;
      pUnder15 = Math.round((under15Items.length / total) * 1000) / 10;
      pOver15 = Math.round((over15Items.length / total) * 1000) / 10;

      // Adjust rounding to ensure sum === 100.0% exactly
      const sum = Math.round((pUnder6 + pUnder9 + pUnder15 + pOver15) * 10) / 10;
      if (sum !== 100.0) {
        const diff = Math.round((100.0 - sum) * 10) / 10;
        const segments = [
          { key: 'under6', count: under6Items.length },
          { key: 'under9', count: under9Items.length },
          { key: 'under15', count: under15Items.length },
          { key: 'over15', count: over15Items.length },
        ].sort((a, b) => b.count - a.count);

        if (segments[0].key === 'under6') pUnder6 = Math.round((pUnder6 + diff) * 10) / 10;
        else if (segments[0].key === 'under9') pUnder9 = Math.round((pUnder9 + diff) * 10) / 10;
        else if (segments[0].key === 'under15') pUnder15 = Math.round((pUnder15 + diff) * 10) / 10;
        else pOver15 = Math.round((pOver15 + diff) * 10) / 10;
      }
    }

    under6Items.sort((a, b) => (b.contractDate || '').localeCompare(a.contractDate || '') || b.priceVal - a.priceVal);
    under9Items.sort((a, b) => (b.contractDate || '').localeCompare(a.contractDate || '') || b.priceVal - a.priceVal);
    under15Items.sort((a, b) => (b.contractDate || '').localeCompare(a.contractDate || '') || b.priceVal - a.priceVal);
    over15Items.sort((a, b) => (b.contractDate || '').localeCompare(a.contractDate || '') || b.priceVal - a.priceVal);

    const under6Avg = formatSectorAvgPrice(under6Items);
    const under9Avg = formatSectorAvgPrice(under9Items);
    const under15Avg = formatSectorAvgPrice(under15Items);
    const over15Avg = formatSectorAvgPrice(over15Items);

    const tierCounts = [under6Items.length, under9Items.length, under15Items.length, over15Items.length];
    const maxTierCount = Math.max(...tierCounts);
    const hasSingleTierMax = total > 0 && maxTierCount > 0 && tierCounts.filter(c => c === maxTierCount).length === 1;

    const under6Rep = getRepresentativeApt(under6Items);
    const under9Rep = getRepresentativeApt(under9Items);
    const under15Rep = getRepresentativeApt(under15Items);
    const over15Rep = getRepresentativeApt(over15Items);

    const priceDonut: AptDonutDataItem[] = [
      {
        name: '6억 이하',
        category: 'under6',
        value: pUnder6,
        count: under6Items.length,
        color: PRICE_TIER_COLORS.under6,
        items: under6Items,
        policyDescription: '보금자리론·디딤돌·신생아특례 등 정책대출 적격 가성비 구간',
        avgPriceLabel: under6Avg,
        isTop: hasSingleTierMax && under6Items.length === maxTierCount,
        repApt: under6Rep,
      },
      {
        name: '6억 ~ 9억',
        category: 'under9',
        value: pUnder9,
        count: under9Items.length,
        color: PRICE_TIER_COLORS.under9,
        items: under9Items,
        policyDescription: '신생아특례 대출 상한 및 동탄 국민평형 실거주 최다 거래 주력 구간',
        avgPriceLabel: under9Avg,
        isTop: hasSingleTierMax && under9Items.length === maxTierCount,
        repApt: under9Rep,
      },
      {
        name: '9억 ~ 15억',
        category: 'under15',
        value: pUnder15,
        count: under15Items.length,
        color: PRICE_TIER_COLORS.under15,
        items: under15Items,
        policyDescription: '동탄역세권 대장 단지 및 상급지 갈아타기 선호 구간',
        avgPriceLabel: under15Avg,
        isTop: hasSingleTierMax && under15Items.length === maxTierCount,
        repApt: under15Rep,
      },
      {
        name: '15억 초과',
        category: 'over15',
        value: pOver15,
        count: over15Items.length,
        color: PRICE_TIER_COLORS.over15,
        items: over15Items,
        policyDescription: '동탄 최고가 랜드마크 및 하이엔드 자산가 구간',
        avgPriceLabel: over15Avg,
        isTop: hasSingleTierMax && over15Items.length === maxTierCount,
        repApt: over15Rep,
      },
    ];

    return {
      donutData: priceDonut,
      totalCount: total,
    };
  }, [activeTransactions, summaryMap, publicRentalSet, nameMapping]);

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

  useEffect(() => {
    onActiveSectorChange?.(activeSector);
  }, [activeSector, onActiveSectorChange]);

  return (
    <div
      id="apt-market-energy-donut"
      className={`bg-surface border border-border/80 p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] shadow-sm flex flex-col justify-between h-auto sm:min-h-[385px] lg:h-[388px] shrink-0 ${className}`}
    >
      {/* Header with Period Switcher */}
      <div className="flex justify-between items-center mb-3 sm:mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-black text-primary tracking-tight flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full bg-[#0d9488]"
            />
            <span>실거래 가격대별 수요 분포</span>
          </h3>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 ml-auto flex-wrap">
          {activeCategory && (
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className="text-[11px] font-bold text-tertiary hover:text-primary cursor-pointer transition-colors mr-1"
            >
              선택 초기화
            </button>
          )}

          {/* Period Selector (7d / 30d / 90d / 1y) */}
          <div className="flex items-center p-0.5 bg-neutral-100 dark:bg-zinc-800 rounded-lg text-[10.5px] font-bold border border-border/40">
            {PERIOD_BUTTONS.map((btn) => (
              <button
                key={btn.key}
                type="button"
                onClick={() => handlePeriodChange(btn.key)}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md transition-all cursor-pointer ${
                  period === btn.key
                    ? 'bg-surface text-primary shadow-xs font-black'
                    : 'text-tertiary hover:text-primary'
                }`}
                aria-label={btn.ariaLabel}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chart & Category Legend (Flex layout for optimal spacing) */}
      <div className="flex flex-col sm:flex-row items-center flex-1 w-full gap-2 sm:gap-4 min-h-0">
        {/* Left: Donut Chart Container */}
        <div className="w-full sm:w-[48%] lg:w-[48%] shrink-0 flex items-center justify-center relative h-full sm:border-r border-border/60 dark:border-border/30 pr-0 sm:pr-3 py-1">
          {mounted ? (
            <div style={{ width: chartSize, height: chartSize }} className={`relative flex items-center justify-center transition-opacity duration-200 ${isPeriodLoading ? 'opacity-50' : 'opacity-100'}`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {totalCount === 0 ? (
                    <Pie
                      data={[{ value: 1 }]}
                      cx="50%"
                      cy="50%"
                      innerRadius="73%"
                      outerRadius="94%"
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
                      innerRadius="73%"
                      outerRadius="94%"
                      cornerRadius={4}
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
                    <span className="text-[11.5px] sm:text-[12px] font-extrabold text-tertiary tracking-tight px-2 truncate max-w-[155px]">
                      {displaySector.name}
                    </span>
                    <span className="text-[21px] sm:text-[23px] font-black text-primary leading-tight mt-0.5">
                      {displaySector.value.toFixed(1)}%
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="text-[10.5px] font-extrabold px-1.5 py-0.2 rounded-full"
                        style={{ color: displaySector.color, backgroundColor: `${displaySector.color}15` }}
                      >
                        {displaySector.count.toLocaleString()}건
                      </span>
                      {displaySector.avgPriceLabel && (
                        <span className="text-[10.5px] font-bold text-secondary">
                          {displaySector.avgPriceLabel}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-[11.5px] sm:text-[12px] font-extrabold text-tertiary tracking-tight">
                      총 실거래
                    </span>
                    <span className="text-[21px] sm:text-[23px] font-black text-primary leading-tight mt-0.5">
                      {isPeriodLoading ? (
                        <span className="text-[15px] font-bold text-tertiary animate-pulse">조회 중...</span>
                      ) : (
                        `${totalCount.toLocaleString()}건`
                      )}
                    </span>
                    <span
                      className="text-[11px] font-extrabold mt-0.5 text-[#0d9488]"
                    >
                      가격대별 수요
                    </span>
                    <span className="text-[9.5px] font-semibold text-tertiary mt-0.5">
                      {PERIOD_LABELS[period]} 기준
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div style={{ width: chartSize, height: chartSize }} className="rounded-full border-4 border-dashed border-border animate-pulse" />
          )}
        </div>

        {/* Right: 4 Category Breakdown Cards (Flexible Width) */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-1.5 sm:gap-2 h-full py-0.5 pl-0 sm:pl-1">
          {donutData.map((sector) => {
            const isSelected = activeCategory === sector.name || activeCategory === sector.category;
            const isHovered = hoveredCategory === sector.name || hoveredCategory === sector.category;
            return (
              <div
                key={sector.name}
                onClick={() => {
                  setActiveCategory(isSelected ? null : sector.name);
                }}
                onMouseEnter={() => {
                  setHoveredCategory(sector.name);
                }}
                onMouseLeave={() => setHoveredCategory(null)}
                role="button"
                tabIndex={0}
                aria-label={
                  sector.repApt
                    ? `${sector.name} ${sector.count}건 (${sector.value.toFixed(1)}%) - 하단 대표 실거래 4건 확인`
                    : `${sector.name} ${sector.count}건 (${sector.value.toFixed(1)}%)`
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveCategory(isSelected ? null : sector.name);
                  }
                }}
                className={`group p-2.5 sm:py-2.5 sm:px-3 rounded-xl border transition-all duration-150 cursor-pointer flex items-center justify-between gap-1.5 sm:gap-2 ${
                  isSelected
                    ? 'bg-body border-primary/50 shadow-sm ring-1 ring-primary/20 scale-[1.01]'
                    : isHovered
                      ? 'bg-body/70 border-border shadow-xs'
                      : 'bg-surface/80 hover:bg-body border-border/50 hover:border-border'
                }`}
              >
                {/* Left: Indicator Dot & Category Name */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: sector.color }}
                  />
                  <span className="text-[12px] sm:text-[12.5px] font-bold text-primary whitespace-nowrap">
                    {sector.name}
                  </span>
                </div>

                {/* Right: Average Price + Ratio & Count + Chevron */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto pl-1">
                  {sector.avgPriceLabel && (
                    <span className="text-[10.5px] sm:text-[11.5px] font-semibold text-secondary whitespace-nowrap">
                      {sector.avgPriceLabel}
                    </span>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-[12px] sm:text-[12.5px] font-black text-primary whitespace-nowrap tabular-nums">
                      {sector.value.toFixed(1)}%
                    </span>
                    <span className="text-[9.5px] sm:text-[10px] font-medium text-tertiary whitespace-nowrap tabular-nums">
                      ({sector.count.toLocaleString()}건)
                    </span>
                  </div>
                  <ChevronRight
                    size={14}
                    className={`shrink-0 transition-all duration-200 ${
                      isSelected
                        ? 'rotate-90 text-[#ea6100]'
                        : 'text-tertiary group-hover:text-[#ea6100] group-hover:translate-x-0.5'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default AptDonutSection;
