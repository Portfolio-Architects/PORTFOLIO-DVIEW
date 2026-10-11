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
  policyBadge?: string;
  policyLoanLimit?: string;
  avgPriceLabel?: string;
  isTop?: boolean;
  repApt?: {
    name: string;
    rawName: string;
    price: string;
    dong?: string;
  } | null;
}

export type AptDonutMode = 'pyeong' | 'price' | 'policy' | 'energy';

export interface AptDonutSectionProps {
  mounted?: boolean;
  recentTransactions?: any[];
  txSummaryData?: Record<string, AptTxSummary> | { summary?: Record<string, AptTxSummary> };
  nameMapping?: Record<string, string>;
  publicRentalSet?: Set<string>;
  onSelectApt?: (name: string, dong?: string) => void;
  preloadApartmentTx?: (name: string, dong: string) => void;
  onOpenMortgageModal?: () => void;
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
  under6: '#10b981',   // 6억 이하: Emerald (엔트리·안정)
  under9: '#057e77',   // 6억 ~ 9억: Brand Deep Teal (주력 볼륨)
  under15: '#3b82f6',  // 9억 ~ 15억: Ocean Blue (상급지 확장)
  over15: '#e11d48',   // 15억 초과: Ruby Rose (하이엔드 희소)
};

export const POLICY_COLORS = PRICE_TIER_COLORS;

export const PYEONG_TIER_COLORS: Record<'small' | 'medium' | 'large' | 'xlarge', string> = {
  small: '#10b981',   // 소형 (60㎡ 이하): Emerald
  medium: '#057e77',  // 중소형 (60~85㎡): Brand Deep Teal
  large: '#3b82f6',   // 중대형 (85~102㎡): Ocean Blue
  xlarge: '#e11d48',  // 대형 (102㎡ 초과): Ruby Rose
};

export const PYEONG_COLORS = PYEONG_TIER_COLORS;

export const AptDonutSection = React.memo(function AptDonutSection({
  mounted = true,
  recentTransactions = [],
  txSummaryData,
  nameMapping,
  publicRentalSet,
  onSelectApt,
  preloadApartmentTx,
  onOpenMortgageModal,
  activeCategory: controlledActiveCategory,
  onActiveCategoryChange,
  onActiveSectorChange,
  initialMode = 'pyeong',
  mode: controlledMode,
  onModeChange,
  initialPeriod = '90d',
  period: controlledPeriod,
  onPeriodChange,
  chartSize = 240,
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

  // Analyze recent transactions into pyeong tiers and price tiers
  const { pyeongDonut, priceDonut, totalCount } = useMemo(() => {
    // Pyeong items:
    const smallItems: AptEnergyItem[] = [];
    const mediumItems: AptEnergyItem[] = [];
    const largeItems: AptEnergyItem[] = [];
    const xlargeItems: AptEnergyItem[] = [];

    // Price items:
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

        const areaM2 = typeof tx.area === 'number' && tx.area > 0
          ? tx.area
          : (areaPyeong > 0 ? areaPyeong * 3.3058 : 84.0);

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

        // 1. Pyeong Tier Classification (소형 <= 60㎡, 중소형 <= 85㎡, 중대형 <= 102㎡, 대형 > 102㎡)
        if (areaM2 <= 60.0) {
          smallItems.push(item);
        } else if (areaM2 <= 85.0) {
          mediumItems.push(item);
        } else if (areaM2 <= 102.0) {
          largeItems.push(item);
        } else {
          xlargeItems.push(item);
        }

        // 2. Price Tier Classification (6억 이하, 6억~9억, 9억~15억, 15억 초과)
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

    const total = smallItems.length + mediumItems.length + largeItems.length + xlargeItems.length;

    // Helper: Compute exact 100.0% sum percentages
    const calcPercentages = (counts: number[], totalCount: number): number[] => {
      if (totalCount === 0) return counts.map(() => 0);
      const pcts = counts.map((c) => Math.round((c / totalCount) * 1000) / 10);
      const sum = Math.round(pcts.reduce((a, b) => a + b, 0) * 10) / 10;
      if (sum !== 100.0) {
        const diff = Math.round((100.0 - sum) * 10) / 10;
        let maxIdx = 0;
        for (let i = 1; i < counts.length; i++) {
          if (counts[i] > counts[maxIdx]) maxIdx = i;
        }
        pcts[maxIdx] = Math.round((pcts[maxIdx] + diff) * 10) / 10;
      }
      return pcts;
    };

    // Pyeong percentages
    const [pSmall, pMedium, pLarge, pXlarge] = calcPercentages(
      [smallItems.length, mediumItems.length, largeItems.length, xlargeItems.length],
      total
    );

    // Price percentages
    const [pUnder6, pUnder9, pUnder15, pOver15] = calcPercentages(
      [under6Items.length, under9Items.length, under15Items.length, over15Items.length],
      total
    );

    // Sort items by contractDate desc, then priceVal desc
    const sortItems = (items: AptEnergyItem[]) =>
      items.sort((a, b) => (b.contractDate || '').localeCompare(a.contractDate || '') || b.priceVal - a.priceVal);

    sortItems(smallItems);
    sortItems(mediumItems);
    sortItems(largeItems);
    sortItems(xlargeItems);
    sortItems(under6Items);
    sortItems(under9Items);
    sortItems(under15Items);
    sortItems(over15Items);

    const smallAvg = formatSectorAvgPrice(smallItems);
    const mediumAvg = formatSectorAvgPrice(mediumItems);
    const largeAvg = formatSectorAvgPrice(largeItems);
    const xlargeAvg = formatSectorAvgPrice(xlargeItems);

    const under6Avg = formatSectorAvgPrice(under6Items);
    const under9Avg = formatSectorAvgPrice(under9Items);
    const under15Avg = formatSectorAvgPrice(under15Items);
    const over15Avg = formatSectorAvgPrice(over15Items);

    // Top tier flags
    const pCounts = [smallItems.length, mediumItems.length, largeItems.length, xlargeItems.length];
    const maxPCount = Math.max(...pCounts);
    const hasSinglePMax = total > 0 && maxPCount > 0 && pCounts.filter((c) => c === maxPCount).length === 1;

    const priceCounts = [under6Items.length, under9Items.length, under15Items.length, over15Items.length];
    const maxPriceCount = Math.max(...priceCounts);
    const hasSinglePriceMax = total > 0 && maxPriceCount > 0 && priceCounts.filter((c) => c === maxPriceCount).length === 1;

    const pyeongData: AptDonutDataItem[] = [
      {
        name: '소형 (60㎡ 이하)',
        subName: '20평대 이하',
        category: 'small',
        value: pSmall,
        count: smallItems.length,
        color: PYEONG_TIER_COLORS.small,
        items: smallItems,
        policyBadge: '1~2인·신혼',
        policyLoanLimit: '디딤돌·신생아특례 적격',
        policyDescription: '전용 60㎡ 이하 소형 평형 실속 수요 구간',
        avgPriceLabel: smallAvg,
        isTop: hasSinglePMax && smallItems.length === maxPCount,
        repApt: getRepresentativeApt(smallItems),
      },
      {
        name: '중소형 (60~85㎡)',
        subName: '국민평형 30평대',
        category: 'medium',
        value: pMedium,
        count: mediumItems.length,
        color: PYEONG_TIER_COLORS.medium,
        items: mediumItems,
        policyBadge: '국민평형 84타입',
        policyLoanLimit: '동탄 주력 선호',
        policyDescription: '전용 84㎡ 중심의 동탄 패밀리 실수요 최다 거래 구간',
        avgPriceLabel: mediumAvg,
        isTop: hasSinglePMax && mediumItems.length === maxPCount,
        repApt: getRepresentativeApt(mediumItems),
      },
      {
        name: '중대형 (85~102㎡)',
        subName: '30평형대 후반',
        category: 'large',
        value: pLarge,
        count: largeItems.length,
        color: PYEONG_TIER_COLORS.large,
        items: largeItems,
        policyBadge: '여유공간 선호',
        policyLoanLimit: '30평형대 후반',
        policyDescription: '전용 85~102㎡ 여유로운 중대형 평형 선호 구간',
        avgPriceLabel: largeAvg,
        isTop: hasSinglePMax && largeItems.length === maxPCount,
        repApt: getRepresentativeApt(largeItems),
      },
      {
        name: '대형 (102㎡ 초과)',
        subName: '40평형 이상',
        category: 'xlarge',
        value: pXlarge,
        count: xlargeItems.length,
        color: PYEONG_TIER_COLORS.xlarge,
        items: xlargeItems,
        policyBadge: '희소 펜트·대형',
        policyLoanLimit: '40평형 이상 희소성',
        policyDescription: '전용 102㎡ 초과 대형 및 펜트하우스 희소 가치 구간',
        avgPriceLabel: xlargeAvg,
        isTop: hasSinglePMax && xlargeItems.length === maxPCount,
        repApt: getRepresentativeApt(xlargeItems),
      },
    ];

    const priceData: AptDonutDataItem[] = [
      {
        name: '6억 이하',
        category: 'under6',
        value: pUnder6,
        count: under6Items.length,
        color: PRICE_TIER_COLORS.under6,
        items: under6Items,
        policyBadge: '디딤돌·신생아 1.6%~',
        policyLoanLimit: '한도 최대 4억 · LTV 80%',
        policyDescription: '보금자리론·디딤돌·신생아특례 정책대출 적격 가성비 구간',
        avgPriceLabel: under6Avg,
        isTop: hasSinglePriceMax && under6Items.length === maxPriceCount,
        repApt: getRepresentativeApt(under6Items),
      },
      {
        name: '6억 ~ 9억',
        category: 'under9',
        value: pUnder9,
        count: under9Items.length,
        color: PRICE_TIER_COLORS.under9,
        items: under9Items,
        policyBadge: '신생아특례 5억',
        policyLoanLimit: '한도 최대 5억 · LTV 70%',
        policyDescription: '신생아특례 대출 상한 및 국평 실거주 주력 수요 구간',
        avgPriceLabel: under9Avg,
        isTop: hasSinglePriceMax && under9Items.length === maxPriceCount,
        repApt: getRepresentativeApt(under9Items),
      },
      {
        name: '9억 ~ 15억',
        category: 'under15',
        value: pUnder15,
        count: under15Items.length,
        color: PRICE_TIER_COLORS.under15,
        items: under15Items,
        policyBadge: '상급지 갈아타기',
        policyLoanLimit: '스트레스 DSR 2단계',
        policyDescription: '동탄역세권 대장 단지 및 상급지 갈아타기 선호 구간',
        avgPriceLabel: under15Avg,
        isTop: hasSinglePriceMax && under15Items.length === maxPriceCount,
        repApt: getRepresentativeApt(under15Items),
      },
      {
        name: '15억 초과',
        category: 'over15',
        value: pOver15,
        count: over15Items.length,
        color: PRICE_TIER_COLORS.over15,
        items: over15Items,
        policyBadge: '하이엔드 프리미엄',
        policyLoanLimit: '자기자본 10억+ 집중',
        policyDescription: '동탄 최고가 랜드마크 및 하이엔드 자산가 구간',
        avgPriceLabel: over15Avg,
        isTop: hasSinglePriceMax && over15Items.length === maxPriceCount,
        repApt: getRepresentativeApt(over15Items),
      },
    ];

    return {
      pyeongDonut: pyeongData,
      priceDonut: priceData,
      totalCount: total,
    };
  }, [activeTransactions, summaryMap, publicRentalSet, nameMapping]);

  const isPyeongMode = mode === 'pyeong';
  const donutData = isPyeongMode ? pyeongDonut : priceDonut;

  const policyEligibleRate = useMemo(() => {
    if (totalCount === 0) return '0.0';
    const under9Sum = donutData
      .filter((d) => d.category === 'under6' || d.category === 'under9')
      .reduce((acc, d) => acc + d.value, 0);
    return (Math.round(under9Sum * 10) / 10).toFixed(1);
  }, [donutData, totalCount]);

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
      className={`bg-surface border border-border/80 p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] shadow-sm flex flex-col justify-between h-auto sm:min-h-[350px] lg:h-[400px] shrink-0 ${className}`}
    >
      {/* Header with Mode Toggle & Period Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-y-2.5 gap-x-2 sm:gap-x-3 mb-3 sm:mb-4">
        {/* Element 1: Title Group (Indicator dot + Section Title + Count Badge) */}
        <div className="flex items-center gap-1.5 sm:gap-2 order-1 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-[#057e77] shrink-0" />
          <h3 className="text-[14px] sm:text-[15px] font-black text-primary tracking-tight whitespace-nowrap">
            수요 분포
          </h3>
          {totalCount > 0 && (
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-[10px] sm:text-[10.5px] font-extrabold text-secondary shrink-0">
              총 {totalCount}건
            </span>
          )}
        </div>

        {/* Element 2: Divider & Mode Switch Toggle (Desktop inline order-2, Mobile full-width order-3) */}
        <div className="w-full sm:w-auto order-3 sm:order-2 flex items-center gap-2 sm:gap-2.5">
          <div className="hidden sm:block h-3.5 w-px bg-border/60" />
          <div className="grid grid-cols-2 sm:flex sm:items-center w-full sm:w-auto p-0.5 bg-neutral-100 dark:bg-zinc-800 rounded-lg text-[11px] font-bold border border-border/40">
            <button
              type="button"
              onClick={() => handleModeChange('pyeong')}
              aria-pressed={mode === 'pyeong'}
              className={`px-2.5 py-1 text-center rounded-md transition-all cursor-pointer ${
                mode === 'pyeong'
                  ? 'bg-surface text-primary shadow-xs font-black'
                  : 'text-tertiary hover:text-primary'
              }`}
            >
              평형대별
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('price')}
              aria-pressed={mode === 'price' || mode === 'policy'}
              className={`px-2.5 py-1 text-center rounded-md transition-all cursor-pointer ${
                mode === 'price' || mode === 'policy'
                  ? 'bg-surface text-primary shadow-xs font-black'
                  : 'text-tertiary hover:text-primary'
              }`}
            >
              가격대별
            </button>
          </div>
        </div>

        {/* Element 3: Period Selector & Reset Button (Mobile order-2, Desktop order-3 ml-auto) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 ml-auto order-2 sm:order-3 shrink-0">
          {activeCategory && (
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className="text-[10.5px] sm:text-[11px] font-bold text-tertiary hover:text-primary cursor-pointer transition-colors mr-0.5 sm:mr-1"
            >
              선택 초기화
            </button>
          )}

          {/* Period Selector (7d / 30d / 90d / 1y) */}
          <div className="flex items-center p-0.5 bg-neutral-100 dark:bg-zinc-800 rounded-lg text-[10px] sm:text-[10.5px] font-bold border border-border/40">
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
        <div className="w-full sm:w-[48%] lg:w-[48%] shrink-0 flex items-center justify-center relative sm:h-full sm:border-r border-border/60 dark:border-border/30 pr-0 sm:pr-3 py-1">
          {mounted ? (
            <div
              style={{ maxWidth: chartSize, maxHeight: chartSize }}
              className={`relative flex items-center justify-center transition-opacity duration-200 w-[215px] h-[215px] sm:w-[240px] sm:h-[240px] ${
                isPeriodLoading ? 'opacity-50' : 'opacity-100'
              }`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {totalCount === 0 ? (
                    <Pie
                      data={[{ value: 1 }]}
                      cx="50%"
                      cy="50%"
                      innerRadius="72%"
                      outerRadius="93%"
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
                      innerRadius="72%"
                      outerRadius="93%"
                      paddingAngle={2.5}
                      dataKey="value"
                      onMouseEnter={(data: any, index: number) => {
                        const entry = donutData[index] || (data && (donutData.find((d) => d.name === data.name || d.category === data.category)));
                        if (entry) {
                          setHoveredCategory(entry.name);
                        }
                      }}
                      onMouseLeave={() => setHoveredCategory(null)}
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
                            opacity={isHighlighted ? 1 : 0.4}
                            stroke={isSelected || isHovered ? '#ffffff' : 'transparent'}
                            strokeWidth={isSelected || isHovered ? 2.5 : 0}
                            onMouseEnter={() => setHoveredCategory(entry.name)}
                            onMouseLeave={() => setHoveredCategory(null)}
                            className="transition-all duration-200 outline-none cursor-pointer"
                          />
                        );
                      })}
                    </Pie>
                  )}
                  {/* Floating tooltip disabled in favor of Center HUD to prevent z-index text collision */}
                  <Tooltip content={() => null} />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Info Overlay matching reference: 총 거래 / N건 */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
                {displaySector ? (
                  <>
                    <span className="text-[10.5px] sm:text-[11.5px] font-bold text-slate-400 dark:text-zinc-500 tracking-tight px-2 truncate max-w-[150px]">
                      {displaySector.name}
                    </span>
                    <span className="text-[22px] sm:text-[26px] font-black text-primary leading-tight mt-0.5">
                      {displaySector.value.toFixed(1)}%
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="text-[9.5px] sm:text-[10.5px] font-extrabold px-2 sm:px-2.5 py-0.5 rounded-full"
                        style={{ color: displaySector.color, backgroundColor: `${displaySector.color}18` }}
                      >
                        {displaySector.count.toLocaleString()}건
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] sm:text-[12px] font-bold text-slate-400 dark:text-zinc-500 tracking-tight">
                      총 거래
                      <span className="sr-only">총 실거래</span>
                    </span>
                    <span className="text-[22px] sm:text-[27px] font-black text-slate-900 dark:text-white leading-tight mt-0.5">
                      {isPeriodLoading ? (
                        <span className="text-[15px] font-bold text-tertiary animate-pulse">조회 중...</span>
                      ) : (
                        `${totalCount.toLocaleString()}건`
                      )}
                    </span>
                    <span className="sr-only">
                      {PERIOD_LABELS[period]} 기준
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{ maxWidth: chartSize, maxHeight: chartSize }}
              className="w-[215px] h-[215px] sm:w-[240px] sm:h-[240px] rounded-full border-4 border-dashed border-border animate-pulse"
            />
          )}
        </div>

        {/* Right: 4 Category Breakdown Cards (Flexible Width) */}
        <div className="w-full sm:flex-1 min-w-0 flex flex-col justify-center gap-1.5 sm:gap-2 my-auto py-0.5 pl-0 sm:pl-1">
          {donutData.map((sector) => {
            const isSelected = activeCategory === sector.name || activeCategory === sector.category;
            const isHovered = hoveredCategory === sector.name || hoveredCategory === sector.category;
            const isMainstream = sector.isTop;
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
                className={`group p-2 sm:py-2 sm:px-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-1 ${
                  isSelected
                    ? 'bg-body border-primary/60 shadow-md ring-2 ring-primary/20 scale-[1.01]'
                    : isHovered
                      ? 'bg-body/80 border-border/90 shadow-xs scale-[1.005]'
                      : isMainstream
                        ? 'bg-surface/90 border-border/70 hover:border-border'
                        : 'bg-surface/80 hover:bg-body border-border/40 hover:border-border/70'
                }`}
              >
                {/* Top Row: Indicator Dot + Category Name (Left) | Ratio & Count + Chevron (Right) */}
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: sector.color }}
                    />
                    <span className="text-[12.5px] sm:text-[13px] font-black text-primary whitespace-nowrap">
                      {sector.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-auto pl-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[12.5px] sm:text-[13px] font-black text-primary whitespace-nowrap tabular-nums">
                        {sector.value.toFixed(1)}%
                      </span>
                      <span className="text-[9.5px] sm:text-[10px] font-medium text-tertiary whitespace-nowrap tabular-nums">
                        ({sector.count.toLocaleString()}건)
                      </span>
                    </div>
                    <ChevronRight
                      size={14}
                      className={`shrink-0 transition-transform duration-200 ${
                        isSelected
                          ? 'rotate-90 text-[#057e77] dark:text-emerald-400'
                          : 'text-tertiary group-hover:text-primary group-hover:translate-x-0.5'
                      }`}
                    />
                  </div>
                </div>

                {/* Bottom Row: Visual Progress Gauge Bar */}
                <div className="w-full bg-neutral-100 dark:bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(3, sector.value))}%`,
                      backgroundColor: sector.color,
                    }}
                  />
                </div>

                {/* Selected Loan CTA */}
                {isSelected && onOpenMortgageModal && (
                  <div className="flex items-center justify-end pt-1 border-t border-border/30 mt-0.5">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenMortgageModal();
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          e.preventDefault();
                          onOpenMortgageModal();
                        }
                      }}
                      className="text-[10.5px] font-bold text-[#057e77] dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      대출 한도·금리 &gt;
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default AptDonutSection;
