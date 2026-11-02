'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { ChevronRight, Maximize2 } from 'lucide-react';
import { ZoneDonutFullscreenModal } from './ZoneDonutFullscreenModal';
import { getDisplayAptName, normalizeAptName, findTxKey } from '@/lib/utils/apartmentMapping';
import { buildInitialApartments } from '@/lib/dong-apartments';
import type { AptTxSummary } from '@/types';
import { usePeriodTransactions } from '@/hooks/useStaticData';
import type { TimelinePeriod } from '@/types/transaction';
import { getToggleTrackClass, getToggleBtnClass } from '@/lib/design-system/controls';
import { trackEvent } from '@/lib/utils/analytics';

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

export type AptDonutMode = 'pyeong' | 'price' | 'policy' | 'energy' | 'zone';

export type BudgetFilterKey = 'all' | 'u6' | 'b6_9' | 'b9_12' | 'o12';

export type AptDonutVariant = 'classic' | 'navigator';

export interface DongtanZoneMeta {
  key: 'lake' | 'north' | 'newtown' | 'dongtan1' | 'sibeom' | 'gbcx';
  name: string;
  subName: string;
  dongs: string[];
  color: string;
  badge: string;
}

export const ZONE_TIER_COLORS: Record<'lake' | 'north' | 'newtown' | 'dongtan1' | 'sibeom' | 'gbcx', string> = {
  lake: '#059669',     // 동탄호수권: Emerald 600
  north: '#2563eb',    // 북동탄: Trust Blue 600
  newtown: '#34d399',  // 신주거: Emerald 400
  dongtan1: '#475569', // 동탄1신도시: Slate 600
  sibeom: '#60a5fa',   // 시범단지·청계권: Light Blue 400
  gbcx: '#1e3a8a',     // 동탄역권: Deep Navy Blue 900
};

export const DONGTAN_ZONES: DongtanZoneMeta[] = [
  {
    key: 'lake',
    name: '동탄호수권',
    subName: '송동 · 산척동 · 장지동',
    dongs: ['송동', '산척동', '장지동', '방교동'],
    color: ZONE_TIER_COLORS.lake,
    badge: '호수공원 · 남동탄',
  },
  {
    key: 'north',
    name: '북동탄',
    subName: '영천동 · 금곡동',
    dongs: ['영천동', '금곡동'],
    color: ZONE_TIER_COLORS.north,
    badge: '테크노밸리 · 11자상가',
  },
  {
    key: 'newtown',
    name: '신주거',
    subName: '신동 · 목동',
    dongs: ['신동', '목동'],
    color: ZONE_TIER_COLORS.newtown,
    badge: '신주거문화타운 · 동탄9동',
  },
  {
    key: 'dongtan1',
    name: '동탄1신도시',
    subName: '반송동 · 능동 · 석우동',
    dongs: ['반송동', '능동', '석우동'],
    color: ZONE_TIER_COLORS.dongtan1,
    badge: '센트럴파크 · 인동선',
  },
  {
    key: 'sibeom',
    name: '시범단지·청계권',
    subName: '청계동',
    dongs: ['청계동'],
    color: ZONE_TIER_COLORS.sibeom,
    badge: '중앙공원 · 명문학군',
  },
  {
    key: 'gbcx',
    name: '동탄역권',
    subName: '여울동 · 오산동',
    dongs: ['여울동', '오산동'],
    color: ZONE_TIER_COLORS.gbcx,
    badge: 'GTX-A · SRT 광역환승',
  },
];

export const BUDGET_LABELS: Record<BudgetFilterKey, string> = {
  all: '전체 예산',
  u6: '6억 이하',
  b6_9: '6~9억',
  b9_12: '9~12억',
  o12: '12억 초과',
};

export const BUDGET_FILTER_OPTIONS: { key: BudgetFilterKey; label: string; ariaLabel: string }[] = [
  { key: 'all', label: '전체', ariaLabel: '전체 예산 권역 비중 보기' },
  { key: 'u6', label: '~6억', ariaLabel: '6억 이하 인기 권역 보기' },
  { key: 'b6_9', label: '6~9억', ariaLabel: '6억 초과 9억 이하 인기 권역 보기' },
  { key: 'b9_12', label: '9~12억', ariaLabel: '9억 초과 12억 이하 인기 권역 보기' },
  { key: 'o12', label: '12억+', ariaLabel: '12억 초과 인기 권역 보기' },
];

export const matchesBudgetFilter = (priceVal: number, budgetKey: BudgetFilterKey): boolean => {
  if (budgetKey === 'all') return true;
  if (budgetKey === 'u6') return priceVal > 0 && priceVal <= 6;
  if (budgetKey === 'b6_9') return priceVal > 6 && priceVal <= 9;
  if (budgetKey === 'b9_12') return priceVal > 9 && priceVal <= 12;
  if (budgetKey === 'o12') return priceVal > 12;
  return true;
};

const stripAptLookupKey = (s: string): string =>
  String(s || '').replace(/[^가-힣a-zA-Z0-9]/g, '').toLowerCase();

export interface AptDonutSectionProps {
  variant?: AptDonutVariant;
  mounted?: boolean;
  recentTransactions?: any[];
  txSummaryData?: Record<string, AptTxSummary> | { summary?: Record<string, AptTxSummary> };
  sheetApartments?: Record<string, { name: string; dong?: string; txKey?: string }[]>;
  nameMapping?: Record<string, string>;
  publicRentalSet?: Set<string>;
  onSelectApt?: (name: string, dong?: string) => void;
  onOpenAptDetail?: (name: string, dong?: string) => void;
  enableFullscreen?: boolean;
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
  initialBudget?: BudgetFilterKey;
  budget?: BudgetFilterKey;
  onBudgetChange?: (budget: BudgetFilterKey) => void;
  chartSize?: number;
  className?: string;
}

export const ENERGY_COLORS: Record<'high' | 'rising' | 'flat' | 'falling', string> = {
  high: '#f04452',    // 신고가: Brand Red (국내 부동산 상승=적색 관례)
  rising: '#f87171',  // 상승거래: Soft Red
  flat: '#059669',    // 보합: Emerald
  falling: '#2563eb', // 하락거래: Trust Blue
};

export const PRICE_TIER_COLORS: Record<'under6' | 'under9' | 'under15' | 'over15', string> = {
  under6: '#059669',   // 6억 이하: Emerald (엔트리·안정)
  under9: '#2563eb',   // 6억 ~ 9억: Trust Blue (주력 볼륨)
  under15: '#60a5fa',  // 9억 ~ 15억: Light Blue (상급지 확장)
  over15: '#334155',   // 15억 초과: Deep Slate (하이엔드 희소)
};

export const POLICY_COLORS = PRICE_TIER_COLORS;

export const PYEONG_TIER_COLORS: Record<'small' | 'medium' | 'large' | 'xlarge', string> = {
  small: '#059669',   // 소형 (60㎡ 이하): Emerald
  medium: '#2563eb',  // 중소형 (60~85㎡): Trust Blue
  large: '#60a5fa',   // 중대형 (85~102㎡): Light Blue
  xlarge: '#334155',  // 대형 (102㎡ 초과): Deep Slate
};

export const PYEONG_COLORS = PYEONG_TIER_COLORS;

export const AptDonutSection = React.memo(function AptDonutSection({
  variant = 'classic',
  mounted = true,
  recentTransactions = [],
  txSummaryData,
  sheetApartments,
  nameMapping,
  publicRentalSet,
  onSelectApt,
  onOpenAptDetail,
  enableFullscreen = true,
  preloadApartmentTx,
  onOpenMortgageModal,
  activeCategory: controlledActiveCategory,
  onActiveCategoryChange,
  onActiveSectorChange,
  initialMode,
  mode: controlledMode,
  onModeChange,
  initialPeriod = '90d',
  period: controlledPeriod,
  onPeriodChange,
  initialBudget = 'all',
  budget: controlledBudget,
  onBudgetChange,
  chartSize = 270,
  className = '',
}: AptDonutSectionProps) {
  const isNavigator = variant === 'navigator';
  const resolvedInitialMode: AptDonutMode = initialMode ?? (isNavigator ? 'zone' : 'pyeong');

  const [internalMode, setInternalMode] = useState<AptDonutMode>(resolvedInitialMode);
  const isControlledMode = controlledMode !== undefined;
  const mode: AptDonutMode = isNavigator ? 'zone' : (isControlledMode ? controlledMode : internalMode);

  const budget: BudgetFilterKey = isNavigator ? 'all' : (controlledBudget ?? initialBudget);
  void onBudgetChange;

  const [internalActiveCategory, setInternalActiveCategory] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [fullscreenInitialZone, setFullscreenInitialZone] = useState<string | null>(null);

  const isControlledCategory = controlledActiveCategory !== undefined;
  const activeCategory = isControlledCategory
    ? controlledActiveCategory
    : internalActiveCategory;

  const setActiveCategory = useCallback((cat: string | null) => {
    setHoveredCategory(null);
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
    recentTransactions,
    { chunked: true }
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
    if (isNavigator) {
      trackEvent('donut_mode_switch', { mode: newMode });
    }
    onModeChange?.(newMode);
  }, [isControlledMode, setActiveCategory, onModeChange, isNavigator]);

  const summaryMap = useMemo(() => {
    if (!txSummaryData) return {};
    return (txSummaryData as { summary?: Record<string, AptTxSummary> })?.summary || (txSummaryData as Record<string, AptTxSummary>);
  }, [txSummaryData]);

  // Deterministic Dong lookup combining summaryMap, sheetApartments, and static Dongtan master catalog
  const dongLookupMap = useMemo(() => {
    const map = new Map<string, string>();
    const register = (key: string | undefined, dongName: string | undefined) => {
      if (!key || !dongName) return;
      map.set(key, dongName);
      map.set(normalizeAptName(key), dongName);
      const stripped = stripAptLookupKey(key);
      if (stripped) map.set(stripped, dongName);
    };

    const initialCatalog = buildInitialApartments();
    Object.entries(initialCatalog).forEach(([dongKey, aptList]) => {
      aptList.forEach((apt) => {
        const d = apt.dong || dongKey;
        register(apt.name, d);
        register((apt as { txKey?: string }).txKey, d);
      });
    });

    if (sheetApartments && typeof sheetApartments === 'object') {
      Object.entries(sheetApartments).forEach(([dongKey, aptList]) => {
        if (!Array.isArray(aptList)) return;
        aptList.forEach((apt) => {
          const d = apt?.dong || dongKey;
          register(apt?.name, d);
          register(apt?.txKey, d);
        });
      });
    }

    Object.entries(summaryMap).forEach(([aptKey, entry]) => {
      if (entry?.dong) {
        register(aptKey, entry.dong);
      }
    });

    return map;
  }, [sheetApartments, summaryMap]);

  // Analyze recent transactions into pyeong tiers, price tiers, allItems (for zone & energy modes)
  const { pyeongDonut, priceDonut, allItems, energyDonut, energyMetrics, totalCount } = useMemo(() => {
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

    // Energy items:
    const highItems: AptEnergyItem[] = [];
    const risingItems: AptEnergyItem[] = [];
    const fallingItems: AptEnergyItem[] = [];
    const flatItems: AptEnergyItem[] = [];

    // Master parsed list for zone × budget slicing:
    const parsedAllItems: AptEnergyItem[] = [];

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
        const rawAptName = tx.aptName || tx.txKey || '';
        const matchedSummaryKey = findTxKey(aptKey, summaryMap, nameMapping);
        const dong = (
          tx.dong ||
          (matchedSummaryKey && summaryMap[matchedSummaryKey]?.dong) ||
          summaryMap[aptKey]?.dong ||
          summaryMap[normalizeAptName(aptKey)]?.dong ||
          dongLookupMap.get(rawAptName) ||
          dongLookupMap.get(normalizeAptName(rawAptName)) ||
          dongLookupMap.get(stripAptLookupKey(rawAptName)) ||
          dongLookupMap.get(stripAptLookupKey(aptKey)) ||
          ''
        ) as string;
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

        // 3. Momentum / Energy Classification (신고가 돌파, 상승 체결, 하락·급매, 보합권)
        if (isHigh) {
          highItems.push(item);
        } else if (delta > 0.0001) {
          risingItems.push(item);
        } else if (delta < -0.0001) {
          fallingItems.push(item);
        } else {
          flatItems.push(item);
        }

        // 4. Master list for Zone × Budget Navigator
        parsedAllItems.push(item);
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

    // Energy / Momentum items sorting:
    // - high & rising & flat: latest contractDate desc, then priceVal desc
    // - falling (하락·급매): steepest discount first (delta ascending, e.g. -1.5 before -0.2)
    sortItems(highItems);
    sortItems(risingItems);
    sortItems(flatItems);
    fallingItems.sort((a, b) => (a.delta - b.delta) || (b.contractDate || '').localeCompare(a.contractDate || ''));

    const [pHigh, pFalling, pRising, pFlat] = calcPercentages(
      [highItems.length, fallingItems.length, risingItems.length, flatItems.length],
      total
    );

    const energyCounts = [highItems.length, fallingItems.length, risingItems.length, flatItems.length];
    const maxEnergyCount = Math.max(...energyCounts);
    const hasSingleEnergyMax = total > 0 && maxEnergyCount > 0 && energyCounts.filter((c) => c === maxEnergyCount).length === 1;

    const energyData: AptDonutDataItem[] = [
      {
        name: '신고가 돌파',
        subName: '직전 최고가 경신',
        category: 'high',
        value: pHigh,
        count: highItems.length,
        color: ENERGY_COLORS.high,
        items: highItems,
        avgPriceLabel: formatSectorAvgPrice(highItems),
        isTop: hasSingleEnergyMax && highItems.length === maxEnergyCount,
        repApt: getRepresentativeApt(highItems),
      },
      {
        name: '직전가 대비 하락·급매',
        subName: '할인 폭 큰 순서',
        category: 'falling',
        value: pFalling,
        count: fallingItems.length,
        color: ENERGY_COLORS.falling,
        items: fallingItems,
        avgPriceLabel: formatSectorAvgPrice(fallingItems),
        isTop: hasSingleEnergyMax && fallingItems.length === maxEnergyCount,
        repApt: getRepresentativeApt(fallingItems),
      },
      {
        name: '직전가 대비 상승',
        subName: '직전 실거래 상회',
        category: 'rising',
        value: pRising,
        count: risingItems.length,
        color: ENERGY_COLORS.rising,
        items: risingItems,
        avgPriceLabel: formatSectorAvgPrice(risingItems),
        isTop: hasSingleEnergyMax && risingItems.length === maxEnergyCount,
        repApt: getRepresentativeApt(risingItems),
      },
      {
        name: '보합권 체결',
        subName: '직전가 수준 유지',
        category: 'flat',
        value: pFlat,
        count: flatItems.length,
        color: ENERGY_COLORS.flat,
        items: flatItems,
        avgPriceLabel: formatSectorAvgPrice(flatItems),
        isTop: hasSingleEnergyMax && flatItems.length === maxEnergyCount,
        repApt: getRepresentativeApt(flatItems),
      },
    ];

    const bullishCount = highItems.length + risingItems.length;
    const directionalTotal = bullishCount + fallingItems.length;
    const bullishPct = directionalTotal > 0
      ? Math.round((bullishCount / directionalTotal) * 1000) / 10
      : 0;

    return {
      pyeongDonut: pyeongData,
      priceDonut: priceData,
      allItems: parsedAllItems,
      energyDonut: energyData,
      energyMetrics: {
        highCount: highItems.length,
        fallingCount: fallingItems.length,
        risingCount: risingItems.length,
        flatCount: flatItems.length,
        bullishPct,
      },
      totalCount: total,
    };
  }, [activeTransactions, summaryMap, publicRentalSet, nameMapping, dongLookupMap]);

  // Helper to build 5-Zone distribution for any BudgetFilterKey
  const buildZoneDistribution = useCallback((items: AptEnergyItem[], targetBudget: BudgetFilterKey) => {
    const dongToZoneKey = new Map<string, DongtanZoneMeta['key']>();
    DONGTAN_ZONES.forEach((z) => {
      z.dongs.forEach((d) => dongToZoneKey.set(d, z.key));
    });

    const buckets: Record<DongtanZoneMeta['key'], AptEnergyItem[]> = {
      lake: [],
      north: [],
      newtown: [],
      dongtan1: [],
      sibeom: [],
      gbcx: [],
    };

    const budgetFiltered = items.filter((it) => matchesBudgetFilter(it.priceVal, targetBudget));

    budgetFiltered.forEach((it) => {
      let zKey = it.dong ? dongToZoneKey.get(it.dong) : undefined;
      if (!zKey) {
        const label = `${it.displayAptName || ''} ${it.aptName || ''}`;
        if (label.includes('시범') && label.includes('동탄역')) zKey = 'sibeom';
        else if (label.includes('동탄역')) zKey = 'gbcx';
        else if (label.includes('호수') || label.includes('레이크')) zKey = 'lake';
        else if (label.includes('메타폴리스') || label.includes('서동탄') || label.includes('센트럴파크')) zKey = 'dongtan1';
        else if (
          label.includes('파크릭스') ||
          label.includes('숨마데시앙') ||
          label.includes('아테라') ||
          label.includes('신주거') ||
          label.includes('파크아너스') ||
          label.includes('동탄포레') ||
          label.includes('힐스테이트 동탄') ||
          label.includes('힐스테이트동탄') ||
          label.includes('한신더휴')
        ) {
          zKey = 'newtown';
        } else {
          zKey = 'north';
        }
      }
      buckets[zKey].push(it);
    });

    Object.values(buckets).forEach((arr) => {
      arr.sort((a, b) => (b.contractDate || '').localeCompare(a.contractDate || '') || b.priceVal - a.priceVal);
    });

    // Sort zones by transaction count descending (tie-breaker: canonical DONGTAN_ZONES order)
    const orderedZones = [...DONGTAN_ZONES].sort(
      (a, b) => buckets[b.key].length - buckets[a.key].length
    );

    const zTotal = budgetFiltered.length;
    const rawCounts = orderedZones.map((z) => buckets[z.key].length);
    let pcts = rawCounts.map(() => 0);
    if (zTotal > 0) {
      pcts = rawCounts.map((c) => Math.round((c / zTotal) * 1000) / 10);
      const sum = Math.round(pcts.reduce((a, b) => a + b, 0) * 10) / 10;
      if (sum !== 100.0) {
        const diff = Math.round((100.0 - sum) * 10) / 10;
        pcts[0] = Math.round((pcts[0] + diff) * 10) / 10;
      }
    }

    const maxCount = rawCounts.length > 0 ? Math.max(...rawCounts) : 0;
    const hasTop = zTotal > 0 && maxCount > 0;

    const zoneSlices: AptDonutDataItem[] = orderedZones.map((z, idx) => {
      const zItems = buckets[z.key];
      return {
        name: z.name,
        subName: z.subName,
        category: z.key,
        value: pcts[idx],
        count: zItems.length,
        color: z.color,
        items: zItems,
        policyBadge: z.badge,
        avgPriceLabel: formatSectorAvgPrice(zItems),
        isTop: hasTop && idx === 0,
        repApt: getRepresentativeApt(zItems),
      };
    });

    return {
      zoneSlices,
      zoneTotalCount: zTotal,
    };
  }, []);

  const { zoneSlices: zoneDonut, zoneTotalCount } = useMemo(
    () => buildZoneDistribution(allItems, budget),
    [allItems, budget, buildZoneDistribution]
  );

  const overallAvgPriceLabel = useMemo(
    () => formatSectorAvgPrice(allItems),
    [allItems]
  );

  const donutData = useMemo(() => {
    if (mode === 'zone') return zoneDonut;
    if (mode === 'energy') return energyDonut;
    if (mode === 'pyeong') return pyeongDonut;
    return priceDonut;
  }, [mode, zoneDonut, energyDonut, pyeongDonut, priceDonut]);

  const effectiveTotalCount = mode === 'zone' ? zoneTotalCount : totalCount;

  const pieRenderData = useMemo(() => {
    if (!isNavigator) return donutData;
    const nonZero = donutData.filter((d) => d.count > 0);
    return nonZero.length > 0 ? nonZero : donutData;
  }, [isNavigator, donutData]);

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

  const handleToggleSlice = useCallback((sector: AptDonutDataItem) => {
    const isCurrentlySelected = activeCategory === sector.name || activeCategory === sector.category;
    const nextCat = isCurrentlySelected ? null : sector.name;
    setHoveredCategory(null);
    setActiveCategory(nextCat);
    if (isNavigator && nextCat) {
      trackEvent('donut_slice_select', {
        mode,
        category: sector.category,
        slice_name: sector.name,
        budget: mode === 'zone' ? budget : 'all',
      });
    }
  }, [activeCategory, setActiveCategory, isNavigator, mode, budget]);

  const handleOpenFullscreen = useCallback((initialZone: string | null = null) => {
    if (!enableFullscreen) return;
    setHoveredCategory(null);
    setFullscreenInitialZone(initialZone);
    setIsFullscreenOpen(true);
    trackEvent('donut_fullscreen_open', {
      mode,
      period,
      initial_zone: initialZone || 'all',
    });
  }, [enableFullscreen, mode, period]);

  const handleCloseFullscreen = useCallback(() => {
    setIsFullscreenOpen(false);
  }, []);

  return (
    <div
      id="apt-market-energy-donut"
      className={`bg-surface border-b border-border pb-3.5 sm:pb-4 flex flex-col justify-between h-auto sm:min-h-[315px] lg:h-[360px] shrink-0 ${className}`}
    >
      {/* Header with Period Switcher (and Mode Toggle in classic variant only) */}
      <div className={`flex flex-wrap xl:flex-nowrap items-center justify-between gap-y-2 gap-x-1.5 sm:gap-x-2.5 ${isNavigator ? 'mb-2 sm:mb-2.5' : 'mb-2.5 sm:mb-3'}`}>
        {/* Element 1: Title Group (Indicator dot + Section Title + Count Badge) */}
        <div className="flex items-center gap-1.5 sm:gap-2 order-1 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
          <h3 className="text-[14px] sm:text-[15px] font-black text-primary tracking-tight whitespace-nowrap">
            {isNavigator ? '권역별 거래·평균가' : '실거래 비중'}
          </h3>
          {effectiveTotalCount > 0 && (
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10.5px] sm:text-[11.5px] font-extrabold text-secondary shrink-0 tabular-nums whitespace-nowrap">
              총 {effectiveTotalCount.toLocaleString()}건
            </span>
          )}
        </div>

        {/* Element 2: Divider & Mode Switch Toggle (Classic variant only; Navigator is locked to single '권역별 거래·평균가' view) */}
        {!isNavigator && (
          <div className="w-full sm:w-auto lg:w-full xl:w-auto order-3 sm:order-2 lg:order-3 xl:order-2 flex items-center gap-1.5 sm:gap-2">
            <div className="hidden sm:block lg:hidden xl:block h-3.5 w-px bg-border/60" />
            <div className={getToggleTrackClass('grid grid-cols-2 sm:inline-flex lg:grid lg:grid-cols-2 xl:inline-flex w-full sm:w-auto lg:w-full xl:w-auto')}>
              <button
                type="button"
                onClick={() => handleModeChange('pyeong')}
                aria-pressed={mode === 'pyeong'}
                className={getToggleBtnClass({ active: mode === 'pyeong', size: 'sm' })}
              >
                평형대별
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('price')}
                aria-pressed={mode === 'price' || mode === 'policy'}
                className={getToggleBtnClass({ active: mode === 'price' || mode === 'policy', size: 'sm' })}
              >
                가격대별
              </button>
            </div>
          </div>
        )}

        {/* Element 3: Period Selector & Reset Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto order-2 sm:order-3 lg:order-2 xl:order-3 shrink-0">
          {activeCategory && (
            <button
              type="button"
              data-testid="donut-reset-selection"
              onClick={() => setActiveCategory(null)}
              className={`${isNavigator ? 'inline-block' : 'hidden xl:inline-block'} text-[10.5px] sm:text-[11px] font-bold text-tertiary hover:text-primary cursor-pointer transition-colors mr-0.5 whitespace-nowrap`}
            >
              선택 초기화
            </button>
          )}

          {/* Period Selector (7d / 30d / 90d / 1y) */}
          <div className={getToggleTrackClass()}>
            {PERIOD_BUTTONS.map((btn) => (
              <button
                key={btn.key}
                type="button"
                onClick={() => handlePeriodChange(btn.key)}
                className={getToggleBtnClass({ active: period === btn.key, size: 'sm', extraClass: 'tabular-nums' })}
                aria-label={btn.ariaLabel}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chart & Category Legend (Chart-dominant ratio with compact right legend) */}
      <div className={`flex flex-col sm:flex-row items-center flex-1 w-full ${isNavigator ? 'gap-2.5 sm:gap-3 xl:gap-4' : 'gap-2.5 sm:gap-4'} min-h-0`}>
        {/* Left: Donut Chart Container (dominant flex-1 width) */}
        <div
          data-testid="donut-chart-pane"
          onClick={() => {
            if (enableFullscreen) {
              handleOpenFullscreen(mode === 'zone' && activeSector ? activeSector.category : null);
            }
          }}
          className={`w-full sm:flex-1 min-w-0 flex items-center justify-center relative sm:h-full sm:border-r border-border/60 dark:border-border/30 py-0.5 ${
            enableFullscreen ? 'cursor-pointer group/donut' : ''
          } ${
            isNavigator ? 'pr-0 sm:pr-2.5 xl:pr-4' : 'pr-0 sm:pr-3'
          }`}
        >
          {enableFullscreen && (
            <button
              type="button"
              data-testid="donut-fullscreen-open-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenFullscreen(mode === 'zone' && activeSector ? activeSector.category : null);
              }}
              aria-label="도넛차트 크게 보기"
              title="도넛차트 크게 보기"
              className="absolute top-0.5 right-1 sm:right-2.5 z-10 px-2 py-1 rounded-lg bg-elevated hover:bg-blue-50 dark:hover:bg-blue-950/60 border border-border/80 group-hover/donut:border-blue-500/30 text-secondary group-hover/donut:text-blue-600 dark:group-hover/donut:text-blue-400 hover:text-blue-600 dark:hover:text-blue-400 text-[11px] font-extrabold inline-flex items-center gap-1 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 whitespace-nowrap"
            >
              <Maximize2 size={12} className="shrink-0" />
              <span>크게 보기</span>
            </button>
          )}
          {mounted ? (
            <div
              data-testid="donut-chart-box"
              onClick={(e) => {
                if (enableFullscreen) {
                  e.stopPropagation();
                  handleOpenFullscreen(mode === 'zone' && activeSector ? activeSector.category : null);
                }
              }}
              style={{ maxWidth: chartSize, maxHeight: chartSize }}
              className={`relative flex items-center justify-center transition-opacity duration-200 ${
                enableFullscreen ? 'cursor-pointer' : ''
              } ${
                isNavigator
                  ? 'w-[208px] h-[208px] sm:w-[226px] sm:h-[226px] md:w-[242px] md:h-[242px] lg:w-[174px] lg:h-[174px] xl:w-[220px] xl:h-[220px] 2xl:w-[262px] 2xl:h-[262px]'
                  : 'w-[208px] h-[208px] sm:w-[230px] sm:h-[230px] lg:w-[202px] lg:h-[202px] xl:w-[234px] xl:h-[234px] 2xl:w-[256px] 2xl:h-[256px]'
              } ${isPeriodLoading ? 'opacity-50' : 'opacity-100'}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {effectiveTotalCount === 0 ? (
                    <Pie
                      data={[{ value: 1 }]}
                      cx="50%"
                      cy="50%"
                      innerRadius="68%"
                      outerRadius="97%"
                      dataKey="value"
                      stroke="transparent"
                      rootTabIndex={-1}
                      isAnimationActive={false}
                    >
                      <Cell className="fill-slate-200 dark:fill-slate-800" fill="currentColor" />
                    </Pie>
                  ) : (
                    <Pie
                      data={pieRenderData}
                      cx="50%"
                      cy="50%"
                      innerRadius="68%"
                      outerRadius="97%"
                      paddingAngle={2.5}
                      dataKey="value"
                      rootTabIndex={-1}
                      onMouseEnter={(data: any, index: number) => {
                        if (activeCategory !== null) return;
                        const entry = pieRenderData[index] || (data && (donutData.find((d) => d.name === data.name || d.category === data.category)));
                        if (entry) {
                          setHoveredCategory((prev) => (prev === entry.name ? prev : entry.name));
                        }
                      }}
                      onMouseLeave={() => setHoveredCategory((prev) => (prev === null ? prev : null))}
                      onClick={(entry: any, _idx?: number, e?: React.MouseEvent) => {
                        if (enableFullscreen) {
                          e?.stopPropagation?.();
                          handleOpenFullscreen(mode === 'zone' && activeSector ? activeSector.category : null);
                          return;
                        }
                        const matched = donutData.find(
                          (d) => d.name === entry?.name || (entry?.category && d.category === entry.category)
                        );
                        if (matched) {
                          handleToggleSlice(matched);
                        }
                      }}
                      cursor="pointer"
                      isAnimationActive={false}
                    >
                      {pieRenderData.map((entry) => {
                        const isSelected = activeCategory === entry.name || activeCategory === entry.category;
                        const isEffectiveHover = activeCategory === null && (hoveredCategory === entry.name || hoveredCategory === entry.category);
                        const isHighlighted = (activeCategory === null && hoveredCategory === null) || isSelected || isEffectiveHover;
                        return (
                          <Cell
                            key={entry.name}
                            fill={entry.color}
                            opacity={isHighlighted ? 1 : 0.35}
                            stroke={isSelected || isEffectiveHover ? '#ffffff' : 'transparent'}
                            strokeWidth={isSelected || isEffectiveHover ? 2.5 : 0}
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

              {/* Center Info Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
                {displaySector ? (
                  <>
                    <span className="text-[10.5px] xl:text-[11.5px] 2xl:text-[12px] font-bold text-slate-400 dark:text-slate-500 tracking-tight px-2 truncate max-w-[116px] sm:max-w-[136px] lg:max-w-[110px] xl:max-w-[140px]">
                      {displaySector.name}
                    </span>
                    <span className="text-[20px] sm:text-[22px] lg:text-[19px] xl:text-[23px] 2xl:text-[27px] font-black text-primary leading-tight mt-0.5 tabular-nums">
                      {isNavigator
                        ? `${displaySector.count.toLocaleString()}건`
                        : `${displaySector.value.toFixed(1)}%`}
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span
                        className="text-[9.5px] xl:text-[10px] 2xl:text-[10.5px] font-extrabold px-2 py-0.5 rounded-full tabular-nums whitespace-nowrap"
                        style={{ color: displaySector.color, backgroundColor: `${displaySector.color}18` }}
                      >
                        {isNavigator
                          ? `${displaySector.value.toFixed(1)}%${displaySector.avgPriceLabel ? ` · ${displaySector.avgPriceLabel.replace('평균 ', '')}` : ''}`
                          : `${displaySector.count.toLocaleString()}건`}
                      </span>
                    </div>
                  </>
                ) : mode === 'energy' ? (
                  <>
                    <span className="text-[10.5px] xl:text-[11.5px] font-bold text-slate-400 dark:text-slate-500 tracking-tight">
                      {energyMetrics.bullishPct >= 50 ? '상승 에너지 우위' : '급매·매수 우위'}
                    </span>
                    <span
                      className={`text-[20px] sm:text-[22px] 2xl:text-[25px] font-black leading-tight mt-0.5 tabular-nums ${
                        energyMetrics.bullishPct >= 50
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {isPeriodLoading ? (
                        <span className="text-[14px] font-bold text-tertiary animate-pulse">조회 중...</span>
                      ) : (
                        `${energyMetrics.bullishPct.toFixed(1)}%`
                      )}
                    </span>
                    <span className="text-[9.5px] font-bold text-tertiary mt-0.5 tabular-nums">
                      신고가 {energyMetrics.highCount} · 급매 {energyMetrics.fallingCount}건
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10.5px] xl:text-[11.5px] 2xl:text-[12px] font-bold text-slate-400 dark:text-slate-500 tracking-tight">
                      {mode === 'zone' && budget !== 'all'
                        ? `${BUDGET_LABELS[budget]} 거래`
                        : `${PERIOD_LABELS[period]} 거래`}
                      <span className="sr-only">총 실거래</span>
                    </span>
                    <span className="text-[20px] sm:text-[22px] lg:text-[19px] xl:text-[23px] 2xl:text-[27px] font-black text-slate-900 dark:text-white leading-tight mt-0.5 tabular-nums">
                      {isPeriodLoading ? (
                        <span className="text-[14px] font-bold text-tertiary animate-pulse">조회 중...</span>
                      ) : (
                        `${effectiveTotalCount.toLocaleString()}건`
                      )}
                    </span>
                    {isNavigator && overallAvgPriceLabel && (
                      <span className="text-[9.5px] xl:text-[10px] 2xl:text-[10.5px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full mt-0.5 tabular-nums truncate max-w-[116px] sm:max-w-[136px] lg:max-w-[110px] xl:max-w-[140px]">
                        전체 {overallAvgPriceLabel}
                      </span>
                    )}
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
              className={`${
                isNavigator
                  ? 'w-[208px] h-[208px] sm:w-[226px] sm:h-[226px] md:w-[242px] md:h-[242px] lg:w-[174px] lg:h-[174px] xl:w-[220px] xl:h-[220px] 2xl:w-[262px] 2xl:h-[262px]'
                  : 'w-[208px] h-[208px] sm:w-[230px] sm:h-[230px] lg:w-[202px] lg:h-[202px] xl:w-[234px] xl:h-[234px] 2xl:w-[256px] 2xl:h-[256px]'
              } rounded-full border-4 border-dashed border-border animate-pulse`}
            />
          )}
        </div>

        {/* Right: Compact Category Breakdown Legend (narrowed fixed/constrained width so rows stay tight & readable) */}
        <div
          data-testid="donut-legend-pane"
          className={`w-full max-w-[340px] mx-auto sm:mx-0 sm:max-w-none shrink-0 flex flex-col justify-center ${
            isNavigator ? 'gap-0.5 sm:gap-1' : 'gap-1 sm:gap-1.5'
          } my-auto py-0.5 ${
            isNavigator
              ? 'sm:w-[268px] md:w-[296px] lg:w-[212px] xl:w-[280px] 2xl:w-[324px] pl-0 sm:pl-1 xl:pl-1.5'
              : 'sm:w-[252px] md:w-[276px] lg:w-[204px] xl:w-[260px] 2xl:w-[296px] pl-0 sm:pl-1.5'
          }`}
        >
          {donutData.map((sector, idx) => {
            const isSelected = activeCategory === sector.name || activeCategory === sector.category;
            const isEffectiveHover = activeCategory === null && (hoveredCategory === sector.name || hoveredCategory === sector.category);
            const isDimmed = activeCategory !== null ? !isSelected : (hoveredCategory !== null && !isEffectiveHover);
            const showTopBadge = isNavigator && mode === 'zone' && idx === 0 && sector.count > 0;
            const ariaSummary = isNavigator && sector.avgPriceLabel
              ? `${sector.name} ${sector.count}건 (${sector.value.toFixed(1)}%) · ${sector.avgPriceLabel}`
              : `${sector.name} ${sector.count}건 (${sector.value.toFixed(1)}%)`;
            return (
              <div
                key={sector.name}
                data-testid={`donut-legend-${sector.category}`}
                onClick={() => handleToggleSlice(sector)}
                onMouseEnter={() => {
                  if (activeCategory === null) {
                    setHoveredCategory(sector.name);
                  }
                }}
                onMouseLeave={() => setHoveredCategory(null)}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={
                  sector.repApt
                    ? `${ariaSummary} - 하단 대표 실거래 4건 확인`
                    : ariaSummary
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggleSlice(sector);
                  }
                }}
                className={`group ${
                  isNavigator ? 'px-2 py-1 xl:px-3 xl:py-1 gap-1' : 'px-2.5 py-1.5 sm:px-3 sm:py-2 gap-1.5'
                } rounded-xl transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-elevated dark:bg-slate-800/80 ring-1 ring-blue-500/25'
                    : isEffectiveHover
                      ? 'bg-elevated/70 dark:bg-slate-800/40'
                      : 'bg-transparent'
                } ${isDimmed ? 'opacity-45' : 'opacity-100'}`}
              >
                {/* Top Row: Indicator Dot + Category Name (Left) | Count, Share & Avg Price + Chevron (Right) */}
                <div className="flex items-center justify-between w-full gap-1.5 xl:gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 transition-transform duration-200 ${
                        isSelected || isEffectiveHover ? 'scale-110' : ''
                      }`}
                      style={{ backgroundColor: sector.color }}
                    />
                    <span
                      className={`${isNavigator ? 'text-[11.5px] xl:text-[12.5px]' : 'text-[12px] sm:text-[12.5px]'} tracking-tight truncate transition-colors duration-200 ${
                        isSelected || isEffectiveHover
                          ? 'font-bold text-slate-900 dark:text-white'
                          : 'font-medium text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {sector.name}
                    </span>
                    {showTopBadge && (
                      <span className="px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[9.5px] font-extrabold shrink-0 leading-tight">
                        1위
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 xl:gap-1.5 shrink-0 ml-auto pl-1">
                    {isNavigator ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-[12px] xl:text-[13px] font-extrabold text-slate-900 dark:text-white whitespace-nowrap tabular-nums tracking-tight">
                          {sector.count.toLocaleString()}건
                        </span>
                        <span className="text-[10.5px] xl:text-[11px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap tabular-nums">
                          ({sector.value.toFixed(1)}%)
                        </span>
                        {sector.avgPriceLabel && (
                          <>
                            <span className="text-[10.5px] text-slate-300 dark:text-slate-600 select-none" aria-hidden="true">
                              ·
                            </span>
                            <span className="text-[11.5px] xl:text-[12.5px] font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap tabular-nums tracking-tight">
                              {sector.avgPriceLabel}
                            </span>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-[12.5px] sm:text-[13px] font-bold text-slate-900 dark:text-white whitespace-nowrap tabular-nums tracking-tight">
                          {sector.value.toFixed(1)}%
                        </span>
                        <span className="text-[10.5px] sm:text-[11px] font-normal text-slate-400 dark:text-slate-500 whitespace-nowrap tabular-nums">
                          ({sector.count.toLocaleString()}건)
                        </span>
                      </div>
                    )}
                    <ChevronRight
                      size={13}
                      className={`shrink-0 transition-all duration-200 ${
                        isSelected
                          ? 'rotate-90 text-blue-600 dark:text-blue-400'
                          : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 group-hover:translate-x-0.5'
                      }`}
                    />
                  </div>
                </div>

                {/* Bottom Row: Ultra-Slim Minimalist Gauge Line */}
                <div className="w-full bg-slate-100 dark:bg-slate-800/70 h-[3px] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.min(100, Math.max(sector.count > 0 ? 2 : 0, sector.value))}%`,
                      backgroundColor: sector.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {enableFullscreen && isFullscreenOpen && (
        <ZoneDonutFullscreenModal
          isOpen={isFullscreenOpen}
          onClose={handleCloseFullscreen}
          zoneSlices={zoneDonut}
          totalCount={zoneTotalCount}
          period={period}
          onPeriodChange={handlePeriodChange}
          isPeriodLoading={isPeriodLoading}
          initialSelectedZone={fullscreenInitialZone}
          onSelectApt={onOpenAptDetail || onSelectApt}
          preloadApartmentTx={preloadApartmentTx}
        />
      )}
    </div>
  );
});

export default AptDonutSection;
