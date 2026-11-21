import React, { useMemo, useState, useRef, useDeferredValue, useEffect, useCallback } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { safeReload } from "@/lib/utils/safeReload";
import { logger } from "@/lib/services/logger";
import { preloadApartmentModal } from "@/components/common/ComponentPreloader";
import type { DongApartment } from "@/lib/dong-apartments";
import type { AptTxSummary, DongtanMacroTrendPoint, FieldReportData } from "@/types";
import { normalizeAptName, sanitizeAptKey, findTxKey, findTypeMapEntry, getDisplayAptName, isSameApartment, isApartmentInFavorites, HARDCODED_MAPPING, resolveCanonicalAptSlug } from "@/lib/utils/apartmentMapping";
import { matchesApartmentSearch } from "@/lib/utils/apartmentSearch";
import { addRecentApartment } from "@/lib/utils/recentApartments";
import { aggregateStats, resolveSummaryEntry } from "@/lib/analytics/statsEngine";
import type { RegionFilter, PyeongFilter, TimeframeFilter, SortOption, RawTransactionRecord, HyperlocalInsightCardsData } from "@/types/stats";
import { useSettingsValues } from "@/contexts/SettingsContext";
import { useAuth } from "@/hooks/useAuth";
import { useLocationScores, usePeriodTransactions } from "@/hooks/useStaticData";
import { BUILD_VERSION } from "@/lib/build-version";
import {
  buildApartmentGranularChartData,
  computeNonOverlappingXTicks,
  filterChartTimeframeByGranularity,
  parseMacroTrendSeriesPayload,
  resolveGranularityForTimeframe,
  type FormattedMacroPoint,
} from "@/lib/utils/macroChartTransform";

import {
  useMacroFilters,
  DONGTAN1_DONGS,
  DONGTAN2_DONGS,
  LANDMARK_APTS,
  compareTimelineItemsByPyeongPriceDesc,
} from "./macro/hooks/useMacroFilters";
import { MacroHeader } from "./macro/components/MacroHeader";
import { MacroTimelineView } from "./macro/components/MacroTimelineView";
import { MacroChartSection } from "./macro/components/MacroChartSection";
import { RetentionActionCard } from "./macro/components/RetentionActionCard";
import { AptFitFinderCard } from "./macro/components/AptFitFinderCard";
import { AptDonutSection, type AptDonutDataItem, type AptDonutPeriod } from "./macro/AptDonutSection";
import { AptMetricCards } from "./macro/AptMetricCards";
import { RealtimeRankingBoard } from "@/components/ranking/RealtimeRankingBoard";
import { usePWA } from "@/components/pwa/PWAProvider";
import { trackEvent, trackApartmentView, trackSearchQuery } from '@/lib/utils/analytics';
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import ChartErrorBoundary from "@/components/common/ChartErrorBoundary";
import { AdSlot } from "@/components/ads/AdSlot";
import Link from "next/link";
import { Star, MessageSquare, Clock, ArrowRight } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { TrafficNoticeBoard, type LocalNoticeItem } from "./macro/TrafficNoticeBoard";
import { GUIDE_ARTICLES } from "@/lib/data/guides";
import { truncateToCopyBudget } from "@/lib/design-system/copyDiet";



const InlineLoader = ({ text }: { text: string }) => (
  <div className="w-full h-[330px] min-h-[330px] flex flex-col items-center justify-center bg-surface/50 dark:bg-surface/50 border border-border/50 rounded-2xl p-6 gap-3 backdrop-blur-md">
    <div className="relative w-10 h-10 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full border-2 border-toss-blue/20 border-t-toss-blue animate-spin" />
      <svg className="w-4 h-4 text-primary animate-pulse" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 12l10 10 10-10L12 2z" />
      </svg>
    </div>
    <span className="text-[13px] text-secondary tracking-tight font-medium">{text}</span>
  </div>
);

const MacroTrendChart = dynamic(() => import("@/components/macro/MacroTrendChart").catch(err => {
  logger.warn('MacroDashboardClient.dynamic', 'MacroTrendChart Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('MacroTrendChart');
  return { default: () => null };
}), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center bg-[#f7f8fa]/60 dark:bg-[#151a23]/60 border border-border/30 rounded-2xl animate-pulse relative overflow-hidden">
      <div className="flex items-center gap-1.5 mb-3.5 flex-none">
        <div className="w-1.5 h-6 bg-slate-300 dark:bg-slate-700 rounded-full animate-bounce duration-500 delay-100" />
        <div className="w-1.5 h-10 bg-slate-400/70 dark:bg-slate-600 rounded-full animate-bounce duration-500 delay-200" />
        <div className="w-1.5 h-14 bg-slate-500/70 dark:bg-slate-500 rounded-full animate-bounce duration-500 delay-300" />
        <div className="w-1.5 h-10 bg-slate-400/70 dark:bg-slate-600 rounded-full animate-bounce duration-500 delay-400" />
        <div className="w-1.5 h-12 bg-slate-500/70 dark:bg-slate-500 rounded-full animate-bounce duration-500 delay-500" />
        <div className="w-1.5 h-8 bg-slate-300 dark:bg-slate-700 rounded-full animate-bounce duration-500 delay-600" />
      </div>
      <span className="text-secondary text-[12.5px] font-extrabold mb-1.5 tracking-tight">관심 단지 시세 데이터 로딩</span>
      <span className="text-[10px] text-tertiary font-bold opacity-75">단지별 실거래 추이 차트 준비 중</span>
    </div>
  )
});

const AptFitFinder = dynamic(() => import("@/components/consumer/AptFitFinder").catch(err => {
  logger.warn('MacroDashboardClient.dynamic', 'AptFitFinder Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('AptFitFinder');
  return { default: () => null };
}), {
  ssr: false,
  loading: () => <InlineLoader text="맞춤 단지 매칭 엔진 준비 중" />
});

const PushSubscriptionModal = dynamic(() => import("@/components/pwa/PushSubscriptionModal").catch(err => {
  logger.warn('MacroDashboardClient.dynamic', 'PushSubscriptionModal Chunk Load failure, initiating fallback reload', undefined, err);
  return { default: () => null };
}), {
  ssr: false,
});

const EMPTY_OBJECT = Object.freeze({});
const NOOP_FN = () => {};

const DEFAULT_TIMELINE_APTS = [
  "동탄역 롯데캐슬",
  "동탄역 시범 우남퍼스트빌",
  "동탄역 시범 더샵 센트럴시티",
  "동탄역 시범 한화꿈에그린 프레스티지"
];

/** GA4 최근 90일 실측 조회수 상위 4개 심층 리포트 (2열 x 2행 메인 큐레이션) */
const TOP_VIEWED_GUIDE_SLUGS = [
  "dongtan-1-vs-2-comparison",
  "dongtan-budget-tier-ranking",
  "dongtan-lake-vs-station-comparison",
  "dongtan-school-zone-top-apartments",
] as const;

export interface TimelineItem {
  aptName: string;
  dong: string;
  priceEok: string;
  priceVal: number;
  areaPyeong: number;
  area: number;
  floor: number;
  type: string;
  delta: number;
  deltaPercent?: number;
  prevPriceVal?: number;
  areaLabelM2?: string;
  areaLabelPyeong?: string;
  displayAptName?: string;
  contractDate?: string;
  registeredDate?: string;
  registeredDateLabel?: string;
  date?: string;
  isNewHigh?: boolean;
  isTodayRegistered?: boolean;
}

interface RecentTransaction {
  aptName: string;
  txKey: string;
  date: string;
  contractDate: string;
  registeredDate?: string;
  registeredDateLabel?: string;
  priceVal: number;
  priceEok: string;
  area: number;
  areaPyeong: number;
  floor: number | string;
  dealType: string;
  isNewHigh?: boolean;
  prevPriceVal?: number;
  delta?: number;
  deltaPercent?: number;
  dateLabel?: string;
}

interface AptTransactionRecord {
  dong: string;
  aptName: string;
  area: number;
  areaPyeong: number;
  contractYm: string;
  contractDay: string;
  price: number;
  priceEok: string;
  deposit?: number;
  monthlyRent?: number;
  floor: number;
  buildYear: number;
  dealType: string;
  reqGb?: string;
  rnuYn?: string;
  cancelDate?: string;
  [key: string]: unknown;
}

interface MacroDashboardProps {
  sheetApartments: Record<string, DongApartment[]>;
  txSummaryData: Record<string, AptTxSummary>;
  macroTrendData: DongtanMacroTrendPoint[];
  nameMapping?: Record<string, string>;
  publicRentalSet: Set<string>;
  fieldReportsMap: Map<string, FieldReportData>;
  onSelectApt?: (name: string, dong?: string) => void;
  onNavigateApartmentPage?: (name: string, dong?: string) => void;
  onOpenAdModal?: () => void;
  onOpenCompare?: (aptName?: string, targetAptName?: string) => void;
  onOpenJeonseSafety?: (aptName?: string) => void;
  onOpenMortgage?: (aptName?: string, priceWon?: number) => void;
  onOpenTaxCalculator?: (aptName?: string) => void;
  onOpenSellTimingCalculator?: (aptName?: string) => void;
  recent7DaysVolume?: {
    currentCount: number;
    prevCount: number;
    trendText: string;
    trendColor: string;
    badge: string;
  };
  recentTransactions?: RecentTransaction[];
  typeMap?: Record<string, Record<string, { typeM2: string; typePyeong: string }>>;
  initialLocationScores?: Record<string, import("@/types/transaction").LocationScoreItem>;
  preloadApartmentTx?: (apartmentName: string, dong: string) => void;
  favoriteCounts?: Record<string, number>;
  isSplitMode?: boolean;
  isSlimmedSsr?: boolean;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} (${url})`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Expected JSON response from ${url}, received ${contentType || 'non-JSON'}`);
  }
  return res.json();
};

export const formatEokWithUnit = (priceMan: number) => {
  const roundedPriceMan = Math.round(priceMan / 100) * 100;
  const eok = Math.floor(roundedPriceMan / 10000);
  const man = roundedPriceMan % 10000;
  if (eok === 0) return { value: `${man.toLocaleString()}`, unit: "만원" };
  if (man === 0) return { value: `${eok}억`, unit: "원" };
  return {
    value: `${eok}억 ${man === 0 ? "" : man.toLocaleString()}`,
    unit: "만원",
  };
};

export const formatGapPrice = (priceMan: number) => {
  const eok = Math.floor(priceMan / 10000);
  const remainder = priceMan % 10000;
  if (eok === 0) return `${remainder.toLocaleString()}만`;
  if (remainder === 0) return `${eok}억`;
  return `${eok}억 ${remainder.toLocaleString()}만`;
};

export const formatDeltaPrice = (deltaEok: number): string => {
  if (deltaEok === undefined || deltaEok === null || isNaN(deltaEok)) return "";
  const deltaMan = Math.round(Math.abs(deltaEok) * 10000);
  if (isNaN(deltaMan)) return "";
  if (deltaMan >= 10000) {
    const eok = Math.floor(deltaMan / 10000);
    const man = deltaMan % 10000;
    return man === 0 ? `${eok}억` : `${eok}억 ${man.toLocaleString()}만`;
  }
  return `${deltaMan.toLocaleString()}만`;
};

export const formatDeltaPercent = (val: number | undefined): string => {
  if (typeof val !== 'number' || isNaN(val) || !isFinite(val) || val === 0) return '';
  const rounded = Math.round(val * 10) / 10;
  if (rounded === 0) return '';
  return ` (${rounded > 0 ? '+' : ''}${rounded}%)`;
};

export const formatTimelinePriceText = (raw?: string): string => {
  if (!raw) return '';
  const trimmed = raw.trim();
  const eokManMatch = trimmed.match(/^(\d+)억\s*([0-9,]+)(?:만(?:원)?)?$/);
  if (eokManMatch) {
    const manClean = eokManMatch[2].trim();
    return manClean === '0' ? `${eokManMatch[1]}억` : `${eokManMatch[1]}억 ${manClean}만`;
  }
  const eokOnlyMatch = trimmed.match(/^(\d+)억(?:원)?$/);
  if (eokOnlyMatch) return `${eokOnlyMatch[1]}억`;
  const manOnlyMatch = trimmed.match(/^([0-9,]+)(?:만(?:원)?)?$/);
  if (manOnlyMatch) return `${manOnlyMatch[1]}만`;
  return trimmed;
};

const parseDateHelper = (dateStr: string | number, parentLatestDate?: string): Date | null => {
  if (dateStr === null || dateStr === undefined) return null;
  const clean = String(dateStr).replace(/[^0-9]/g, '');
  if (clean.length === 8) {
    const y = parseInt(clean.substring(0, 4), 10);
    const m = parseInt(clean.substring(4, 6), 10) - 1;
    const d = parseInt(clean.substring(6, 8), 10);
    const dt = new Date(y, m, d);
    return isNaN(dt.getTime()) ? null : dt;
  }
  if (String(dateStr).includes('.')) {
    const parts = String(dateStr).split('.');
    if (parts.length >= 2) {
      const m = parseInt(parts[0], 10) - 1;
      const d = parseInt(parts[1], 10);
      if (isNaN(m) || isNaN(d)) return null;
      let y = 2026;
      let latestDt: Date | null = null;
      if (parentLatestDate && parentLatestDate.length === 8) {
        const ly = parseInt(parentLatestDate.substring(0, 4), 10);
        const lm = parseInt(parentLatestDate.substring(4, 6), 10) - 1;
        const ld = parseInt(parentLatestDate.substring(6, 8), 10);
        const lDt = new Date(ly, lm, ld);
        if (!isNaN(lDt.getTime())) {
          latestDt = lDt;
          y = ly;
        }
      }
      const dt = new Date(y, m, d);
      if (isNaN(dt.getTime())) return null;
      if (latestDt && dt.getTime() > latestDt.getTime()) {
        dt.setFullYear(y - 1);
      }
      return dt;
    }
  }
  return null;
};

export interface TimelineItemCardProps {
  item: TimelineItem;
  isSelected: boolean;
  areaUnit: string;
  isFavorite?: boolean;
  onToggleFavorite?: (aptName: string) => void;
  onCardHover: (aptName: string, dong: string) => void;
  onCardClick: (aptName: string) => void;
  onDetailsClick: (aptName: string) => void;
  onDetailsHover: (aptName: string, dong: string) => void;
}

export const TimelineItemCard = React.memo(function TimelineItemCard({
  item,
  isSelected,
  areaUnit,
  isFavorite,
  onToggleFavorite,
  onCardHover,
  onCardClick,
  onDetailsClick,
  onDetailsHover,
}: TimelineItemCardProps) {
  const isRising = item.delta > 0;
  const isFalling = item.delta < 0;
  const pyeong = item.areaPyeong || (item.area ? item.area / 3.3058 : 34);
  const pyeongPriceMan = Math.round((item.priceVal * 10000) / pyeong);

  const normalizePriceText = (raw?: string): string => {
    if (!raw) return '';
    const trimmed = raw.trim();
    const eokManMatch = trimmed.match(/^(\d+)억\s*([0-9,]+)(?:만(?:원)?)?$/);
    if (eokManMatch) {
      const manClean = eokManMatch[2].trim();
      return manClean === '0' ? `${eokManMatch[1]}억` : `${eokManMatch[1]}억 ${manClean}만`;
    }
    const eokOnlyMatch = trimmed.match(/^(\d+)억(?:원)?$/);
    if (eokOnlyMatch) return `${eokOnlyMatch[1]}억`;
    const manOnlyMatch = trimmed.match(/^([0-9,]+)(?:만(?:원)?)?$/);
    if (manOnlyMatch) return `${manOnlyMatch[1]}만`;
    return trimmed;
  };

  const normalizedPrice = normalizePriceText(item.priceEok);
  const displayName = item.displayAptName || item.aptName;
  const areaLabel = areaUnit === 'm2'
    ? (item.areaLabelM2 || `${Math.round(item.area)}㎡`)
    : (item.areaLabelPyeong || `${Math.round(item.areaPyeong)}평`);
  const contractShortDate = item.contractDate
    ? (item.contractDate.length >= 8 ? `${item.contractDate.slice(4, 6)}.${item.contractDate.slice(6, 8)}` : item.contractDate)
    : '';

  const isNewHigh = item.type === 'high' || Boolean(item.isNewHigh);

  return (
    <div
      onMouseEnter={() => onCardHover(item.aptName, item.dong)}
      className={`relative flex flex-col gap-2.5 p-3 sm:p-4 rounded-2xl transition-colors duration-150 ease-out w-full max-w-full box-border ${
        isSelected
          ? "ring-2 ring-slate-900/20 dark:ring-white/25 bg-[#eff1f5] dark:bg-[#1e2532]"
          : isNewHigh
            ? "dview-spark-card"
            : "bg-elevated hover:bg-[#eff1f5] dark:bg-[#151a23] dark:hover:bg-[#1e2532]"
      } group`}
    >
      {/* Clickable Card Body Button (stretched overlay covers full card; 2-row hierarchy gives full title width) */}
      <button
        type="button"
        onClick={() => onCardClick(item.aptName)}
        aria-label={`실거래 분석 아파트 선택: ${item.aptName}, 위치: ${item.dong}, 가격: ${item.priceEok}`}
        className="w-full flex flex-col gap-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 dark:focus-visible:ring-white/30 rounded-xl p-0 bg-transparent border-none min-w-0 cursor-pointer after:content-[''] after:absolute after:inset-0 after:rounded-2xl"
      >
        {/* Row 1: Complex Identity + Jackpot New-High Spark Pill (reserves space for top-right actions) */}
        <div className={`flex items-center gap-1 sm:gap-1.5 min-w-0 w-full ${onToggleFavorite ? 'pr-[82px] sm:pr-24' : 'pr-[50px] sm:pr-16'}`}>
          <span
            data-testid="timeline-card-title"
            className="text-[14px] sm:text-[14.5px] font-extrabold text-primary transition-colors leading-snug truncate break-keep min-w-0"
            title={displayName}
          >
            {displayName}
          </span>
          {isNewHigh && (
            <span className="px-1.5 py-0.5 rounded-md dview-spark-badge text-[10px] font-black shrink-0 whitespace-nowrap leading-none">
              신고가
            </span>
          )}
        </div>

        {/* Row 2: Specs (Left/Top on mobile) + Hero Price & Delta Pill (Right/Bottom on mobile) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2.5 pt-2 border-t border-border min-w-0 w-full tabular-nums">
          <div
            data-testid="timeline-card-specs"
            className="flex items-center flex-wrap sm:flex-nowrap gap-x-1 gap-y-0.5 min-w-0 w-full sm:w-auto sm:flex-1 sm:overflow-hidden text-[11px] font-semibold text-tertiary"
          >
            <span className="shrink-0 font-bold text-secondary max-w-[96px] truncate min-w-0" title={item.dong}>
              {item.dong}
            </span>
            <span className="opacity-35 font-normal shrink-0">·</span>
            <span className="shrink-0 whitespace-nowrap">{areaLabel}</span>
            <span className="opacity-35 font-normal shrink-0">·</span>
            <span className="shrink-0 whitespace-nowrap">{item.floor}층</span>
            {contractShortDate && (
              <span className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                <span className="opacity-35 font-normal">·</span>
                <span className="text-secondary font-medium">{contractShortDate}</span>
              </span>
            )}
            {pyeongPriceMan > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                <span className="opacity-35 font-normal">·</span>
                <span className="text-secondary font-medium">
                  평당 {pyeongPriceMan.toLocaleString()}만
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto shrink-0 whitespace-nowrap tabular-nums">
            <span
              data-testid="timeline-card-price"
              className="text-[14.5px] sm:text-[15px] font-black tracking-tight leading-none whitespace-nowrap text-primary"
            >
              {normalizedPrice}
            </span>

            <span
              data-testid="timeline-card-delta"
              className={`px-1.5 py-0.5 rounded-md text-[10.5px] sm:text-[11px] font-black shrink-0 whitespace-nowrap leading-none ${
                isRising
                  ? "bg-brand-red-light text-brand-red"
                  : isFalling
                    ? "bg-brand-blue-light text-brand-blue"
                    : "bg-[#eff1f5] text-secondary dark:bg-[#1e2532]"
              }`}
            >
              {isRising
                ? `+ ${formatDeltaPrice(item.delta)}${formatDeltaPercent(item.deltaPercent)}`
                : isFalling
                  ? `- ${formatDeltaPrice(Math.abs(item.delta))}${formatDeltaPercent(item.deltaPercent)}`
                  : "보합"}
            </span>
          </div>
        </div>
      </button>

      {/* Top-Right Actions: Favorite Star + Detail Action Button (z-10 above stretched card button) */}
      <div className="absolute top-2 right-2 sm:top-3 sm:right-3.5 z-10 flex items-center justify-center gap-1 shrink-0">
        {onToggleFavorite && (
          <button
            type="button"
            data-testid={`timeline-fav-toggle-${item.aptName}`}
            aria-label={`${item.aptName} ${isFavorite ? '찜 해제' : '찜하기'}`}
            onClick={(e) => {
              e.stopPropagation();
              const willBeFav = !isFavorite;
              trackEvent('watchlist_toggle_favorite', {
                apt_name: item.aptName,
                is_favorite: willBeFav,
                surface: 'timeline',
              });
              onToggleFavorite(item.aptName);
            }}
            className="min-w-[32px] min-h-[32px] sm:min-w-[28px] sm:min-h-[28px] inline-flex items-center justify-center rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-700 text-tertiary transition-colors cursor-pointer touch-manipulation"
          >
            <Star
              size={14}
              className={
                isFavorite
                  ? 'fill-slate-900 text-slate-900 dark:fill-slate-100 dark:text-slate-100'
                  : 'text-tertiary hover:text-primary'
              }
            />
          </button>
        )}
        <button
          type="button"
          aria-label={`${item.aptName} 상세 정보 보기`}
          onClick={(e) => {
            e.stopPropagation();
            onDetailsClick(item.aptName);
          }}
          onMouseEnter={() => onDetailsHover(item.aptName, item.dong)}
          className="px-2.5 py-1 min-h-[30px] sm:min-h-[26px] rounded-xl bg-surface hover:bg-[#eff1f5] dark:hover:bg-[#252c3d] text-[11px] font-extrabold text-secondary hover:text-primary transition-colors duration-150 ease-out active:scale-95 cursor-pointer shrink-0 outline-none focus:ring-2 focus:ring-slate-900/20 whitespace-nowrap touch-manipulation"
        >
          상세
        </button>
      </div>
    </div>
  );
});

export interface TimelineItemRowProps {
  item: TimelineItem;
  isSelected: boolean;
  areaUnit?: string;
  isFavorite?: boolean;
  onToggleFavorite?: (aptName: string) => void;
  onCardHover?: (aptName: string, dong: string) => void;
  onCardClick: (aptName: string) => void;
  onDetailsClick: (aptName: string) => void;
  onDetailsHover?: (aptName: string, dong: string) => void;
}

export const TimelineItemRow = React.memo(function TimelineItemRow({
  item,
  isSelected,
  areaUnit = 'p',
  isFavorite,
  onToggleFavorite,
  onCardHover,
  onCardClick,
  onDetailsClick,
  onDetailsHover,
}: TimelineItemRowProps) {
  const isRising = item.delta > 0;
  const isFalling = item.delta < 0;
  const displayName = item.displayAptName || item.aptName;
  const pyeong = item.areaPyeong || (item.area ? item.area / 3.3058 : 34);
  const pyeongPriceMan = Math.round((item.priceVal * 10000) / pyeong);
  const normalizedPrice = formatTimelinePriceText(item.priceEok);

  const isNewHigh = item.type === 'high' || Boolean(item.isNewHigh);

  return (
    <div
      data-testid={`timeline-row-${item.aptName}`}
      onMouseEnter={() => onCardHover?.(item.aptName, item.dong)}
      className={`px-3.5 py-3 flex items-center justify-between gap-2 hover:bg-elevated dark:hover:bg-[#151a23] transition-colors cursor-pointer border-b border-border last:border-b-0 ${
        isSelected ? 'bg-[#eff1f5] dark:bg-[#1e2532]' : ''
      }`}
    >
      {/* Left: Apt info */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onCardClick(item.aptName)}
          aria-label={`실거래 분석 아파트 선택: ${item.aptName}, 위치: ${item.dong}, 가격: ${item.priceEok}`}
          className="flex flex-col min-w-0 text-left bg-transparent border-none p-0 cursor-pointer flex-1"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[13px] sm:text-[13.5px] font-extrabold text-primary truncate break-keep min-w-0" title={displayName}>
              {displayName}
            </span>
            {isNewHigh && (
              <span className="px-1.5 py-0.5 rounded-md dview-spark-badge text-[9.5px] font-black shrink-0 leading-none">
                신고가
              </span>
            )}
          </div>
          <span className="text-[11px] text-tertiary font-medium tabular-nums">
            {item.dong} · {areaUnit === 'm2' ? (item.areaLabelM2 || `${Math.round(item.area)}㎡`) : (item.areaLabelPyeong || `${Math.round(item.areaPyeong)}평`)} · {item.floor}층
            {item.contractDate && (
              <span className="text-secondary font-medium">
                {' '}· {item.contractDate.length >= 8 ? `${item.contractDate.slice(4, 6)}.${item.contractDate.slice(6, 8)}` : item.contractDate}
              </span>
            )}
            {pyeongPriceMan > 0 && <span className="hidden sm:inline"> · 평당 {pyeongPriceMan.toLocaleString()}만</span>}
          </span>
        </button>
      </div>

      {/* Right: Price, Delta, and Details Button */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 tabular-nums">
        <div className="text-right flex flex-col items-end justify-center gap-0.5">
          <div className="text-[13px] sm:text-[14px] font-black leading-tight text-primary">
            {normalizedPrice}
          </div>
          {item.delta !== undefined && item.delta !== 0 ? (
            <div
              className={`text-[10px] font-extrabold flex items-center gap-0.5 ${
                isRising ? 'text-brand-red' : 'text-brand-blue'
              }`}
            >
              {isRising ? '+' : '-'} {formatDeltaPrice(Math.abs(item.delta))}
              {formatDeltaPercent(item.deltaPercent)}
            </div>
          ) : (
            <div className="text-[10px] font-bold text-tertiary">보합</div>
          )}
        </div>

        {onToggleFavorite && (
          <button
            type="button"
            data-testid={`timeline-fav-toggle-${item.aptName}`}
            aria-label={`${item.aptName} ${isFavorite ? '찜 해제' : '찜하기'}`}
            onClick={(e) => {
              e.stopPropagation();
              const willBeFav = !isFavorite;
              trackEvent('watchlist_toggle_favorite', {
                apt_name: item.aptName,
                is_favorite: willBeFav,
                surface: 'timeline',
              });
              onToggleFavorite(item.aptName);
            }}
            className="min-w-[32px] min-h-[32px] sm:min-w-[28px] sm:min-h-[28px] inline-flex items-center justify-center rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-tertiary transition-colors cursor-pointer touch-manipulation"
          >
            <Star
              size={14}
              className={
                isFavorite
                  ? 'fill-slate-900 text-slate-900 dark:fill-slate-100 dark:text-slate-100'
                  : 'text-tertiary hover:text-primary'
              }
            />
          </button>
        )}
        <button
          type="button"
          aria-label={`${item.aptName} 상세 정보 보기`}
          onClick={(e) => {
            e.stopPropagation();
            onDetailsClick(item.aptName);
          }}
          onMouseEnter={() => onDetailsHover?.(item.aptName, item.dong)}
          className="px-2.5 py-1 min-h-[30px] sm:min-h-[26px] rounded-xl bg-elevated hover:bg-[#eff1f5] dark:bg-[#151a23] dark:hover:bg-[#1e2532] text-[11px] font-extrabold text-secondary hover:text-primary transition-colors cursor-pointer touch-manipulation"
        >
          상세
        </button>
      </div>
    </div>
  );
});

const MacroDashboardClient = React.memo(function MacroDashboardClient({
  sheetApartments,
  txSummaryData,
  macroTrendData,
  nameMapping,
  publicRentalSet,
  fieldReportsMap,
  onSelectApt,
  onNavigateApartmentPage,
  onOpenAdModal: _onOpenAdModal,
  onOpenCompare,
  onOpenJeonseSafety,
  onOpenMortgage,
  onOpenTaxCalculator: _onOpenTaxCalculator,
  onOpenSellTimingCalculator,
  recent7DaysVolume: _recent7DaysVolume,
  recentTransactions = [],
  typeMap = {},
  initialLocationScores,
  preloadApartmentTx,
  favoriteCounts,
  isSplitMode = false,
  isSlimmedSsr = false,
}: MacroDashboardProps) {
  const { areaUnit } = useSettingsValues();
  const { user, isLoading: authLoading, handleLogin } = useAuth();
  const { userFavorites, toggleFavorite } = useFavorites();
  const [mounted, setMounted] = useState(false);

  // Zone 4: Local Notices fetch (Hydration-safe: defer localStorage SWR cache read until mounted)
  const { data: localNoticesRes } = useSWR<any>(
    mounted ? '/api/local-notices?dongtan=true' : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  const localNotices: LocalNoticeItem[] = useMemo(() => {
    if (!mounted) return [];
    const raw = (localNoticesRes as any)?.data?.notices || (localNoticesRes as any)?.notices || (Array.isArray(localNoticesRes) ? localNoticesRes : []);
    return Array.isArray(raw) ? raw : [];
  }, [mounted, localNoticesRes]);

  const { railStrategyNotices, tramNotices } = useMemo(() => {
    const rail: LocalNoticeItem[] = [];
    const tram: LocalNoticeItem[] = [];
    const railKeywords = [
      '철도', '트램', 'gtx', '인동선', '동인선', '동탄인덕원',
      'srt', '분당선', '신분당선', '솔빛나루', '환승센터', '광역철도', '복선전철', '복선절철',
      '반도체선', '동서횡단', '국가철도망', '경강선', 'jtx', '수도권내륙선'
    ];
    const westernNonDongtanKeywords = ['신안산선', '인천발', '봉담', '향남', '어천', '송산', '서해선', '남양'];
    const dongtanCoreRailKeywords = ['동탄', '솔빛나루', '인덕원', '동인선', '분당선', 'gtx-a', 'srt'];

    localNotices.forEach((item) => {
      const id = item.id || '';
      const title = item.title || '';
      const dept = item.dept || '';
      const titleLower = title.toLowerCase();
      const deptLower = dept.toLowerCase();

      // Exclude culture events and synthetic AI reports from railway board
      if (
        item.source === 'culture' ||
        id.startsWith('culture_') ||
        id.startsWith('ai_report') ||
        title.startsWith('[AI') ||
        dept.includes('AI 데이터 랩')
      ) {
        return;
      }

      const isRailSource =
        item.source === 'rail' ||
        id.startsWith('rail_') ||
        id.includes('1131') ||
        id.includes('1154') ||
        deptLower.includes('철도') ||
        deptLower.includes('트램') ||
        deptLower.includes('추진단') ||
        railKeywords.some((kw) => titleLower.includes(kw));

      if (!isRailSource) return;

      // Exclude non-Dongtan western Hwaseong railway projects unless Dongtan is explicitly mentioned
      const isByeongjeomSongsanDong =
        titleLower.includes('송산동') &&
        (titleLower.includes('병점') || titleLower.includes('진안'));
      if (
        !titleLower.includes('동탄') &&
        westernNonDongtanKeywords.some((kw) => {
          if (kw === '송산' && isByeongjeomSongsanDong) return false;
          return titleLower.includes(kw);
        })
      ) {
        return;
      }

      const isTram =
        id.includes('1154') ||
        deptLower.includes('트램') ||
        deptLower.includes('추진단') ||
        titleLower.includes('트램');

      if (isTram) {
        tram.push(item);
      } else {
        rail.push(item);
      }
    });

    const sortRailItems = (a: LocalNoticeItem, b: LocalNoticeItem) => {
      const dateCompare = (b.date || '').localeCompare(a.date || '');
      if (dateCompare !== 0) return dateCompare;
      const aCore = dongtanCoreRailKeywords.some((kw) => (a.title || '').toLowerCase().includes(kw)) ? 1 : 0;
      const bCore = dongtanCoreRailKeywords.some((kw) => (b.title || '').toLowerCase().includes(kw)) ? 1 : 0;
      if (bCore !== aCore) return bCore - aCore;
      return (b.id || '').localeCompare(a.id || '', undefined, { numeric: true });
    };

    rail.sort(sortRailItems);
    tram.sort(sortRailItems);

    return { railStrategyNotices: rail, tramNotices: tram };
  }, [localNotices]);

  // Zone 4: Top 4 Most-Viewed Comparison Guides (2x2 Grid)
  const topGuides = useMemo(() => {
    const bySlug = new Map(GUIDE_ARTICLES.map((g) => [g.slug, g]));
    const picked = TOP_VIEWED_GUIDE_SLUGS.map((slug) => bySlug.get(slug)).filter(
      (g): g is (typeof GUIDE_ARTICLES)[number] => Boolean(g)
    );
    if (picked.length < 4) {
      const pickedSet = new Set(picked.map((g) => g.slug));
      for (const article of GUIDE_ARTICLES) {
        if (!pickedSet.has(article.slug)) {
          picked.push(article);
          pickedSet.add(article.slug);
          if (picked.length >= 4) break;
        }
      }
    }
    return picked.slice(0, 4);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hero section trend chart ready immediately to prevent 2-stage loader transition
  const [trendChartReady] = useState(true);

  // Background prefetching for 4 major apartments
  useEffect(() => {
    if (!mounted || !txSummaryData) return;

    const controller = new AbortController();
    const { signal } = controller;

    const prefetchApts = () => {
      if (signal.aborted) return;
      const summaryMap = (txSummaryData as { summary?: Record<string, AptTxSummary> })?.summary || txSummaryData;
      DEFAULT_TIMELINE_APTS.forEach((apt) => {
        if (signal.aborted) return;
        const normalizedName = normalizeAptName(apt);
        let rawApt: DongApartment | null = null;
        if (sheetApartments) {
          const allApts = Object.values(sheetApartments).flat();
          rawApt = allApts.find(a => isSameApartment(a.name, apt, nameMapping, a.dong)) || null;
        }
        const rawAptTxKey = (rawApt as { txKey?: string })?.txKey;
        const overrideKey = HARDCODED_MAPPING[normalizedName];
        const summaryResolved = findTxKey(apt, summaryMap, nameMapping);
        const resolved = rawAptTxKey || overrideKey || summaryResolved || apt;
        const txKey = normalizeAptName(resolved);

        fetch(`/tx-data/${encodeURIComponent(txKey)}.json?v=${BUILD_VERSION}`, { signal }).catch((err) => {
          if (signal.aborted) return;
          if (err.name !== "AbortError" && err.message !== "Failed to fetch" && err.name !== "TypeError") {
            logger.warn('MacroDashboardClient.prefetchApts', `Prefetch failed for ${txKey}`, undefined, err);
          } else {
            logger.info('MacroDashboardClient.prefetchApts', `Prefetch aborted or skipped: ${txKey}`);
          }
        });
      });
    };

    let idleId: number;
    let timerId: NodeJS.Timeout;

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(prefetchApts);
    } else {
      timerId = setTimeout(prefetchApts, 1500);
    }

    return () => {
      controller.abort();
      if (idleId && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [mounted, txSummaryData, nameMapping, sheetApartments]);

  // Use custom filter hook
  const {
    quickFilter,
    setQuickFilter,
    searchQuery,
    setSearchQuery,
    sortOrder,
    setSortOrder,
    viewMode,
    setViewMode,
    resetFilters,
    regionFilter,
    setRegionFilter,
    timelineDongFilter,
    setTimelineDongFilter,
    timelineAptFilter,
    setTimelineAptFilter,
    pyeongFilter,
    setPyeongFilter,
    tradeTypeFilter,
    setTradeTypeFilter,
    periodFilter,
    setPeriodFilter,
    timeframe,
    setTimeframe,
    availableDongs,
    availableApts,
  } = useMacroFilters({ sheetApartments });

  const periodTxOptions = useMemo(
    () => (isSlimmedSsr ? { chunked: true, revalidateStaticOnMount: true } : { chunked: true }),
    [isSlimmedSsr]
  );

  const { transactions: timelinePeriodTransactions, isLoading: isTimelinePeriodLoading } = usePeriodTransactions(
    periodFilter,
    recentTransactions,
    periodTxOptions
  );

  const { locationScores } = useLocationScores(initialLocationScores);

  const { triggerCustomA2HSModal } = usePWA();
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [pushTargetApt, setPushTargetApt] = useState<string>('');
  const [activeDonutCategory, setActiveDonutCategory] = useState<string | null>(null);
  const [activeDonutSector, setActiveDonutSector] = useState<AptDonutDataItem | null>(null);
  const [selectedTimelineDateJump, setSelectedTimelineDateJump] = useState<string | null>(null);
  const [isTimelineInlineExpanded, setIsTimelineInlineExpanded] = useState(false);

  const [donutPeriod, setDonutPeriod] = useState<AptDonutPeriod>('1d');

  const handleDonutPeriodChange = useCallback(
    (nextPeriod: AptDonutPeriod) => {
      setDonutPeriod(nextPeriod);
      setSelectedTimelineDateJump(null);
      setPeriodFilter(nextPeriod);
    },
    [setPeriodFilter]
  );

  const handleDonutCategoryChange = useCallback(
    (cat: string | null) => {
      if (!cat) {
        setActiveDonutCategory(null);
        setTradeTypeFilter('all');
        return;
      }
      const catToTradeType: Record<string, 'high' | 'rising' | 'flat' | 'falling'> = {
        high: 'high',
        '신고가 돌파': 'high',
        rising: 'rising',
        '직전가 대비 상승': 'rising',
        flat: 'flat',
        '보합권 체결': 'flat',
        falling: 'falling',
        '직전가 대비 하락·급매': 'falling',
      };
      const mapped = catToTradeType[cat];
      if (mapped) {
        setActiveDonutCategory(mapped);
        setTradeTypeFilter(mapped);
      } else {
        setActiveDonutCategory(cat);
      }
    },
    [setTradeTypeFilter]
  );

  useEffect(() => {
    if (tradeTypeFilter === 'all') {
      setActiveDonutCategory(null);
    } else {
      setActiveDonutCategory(tradeTypeFilter);
    }
  }, [tradeTypeFilter]);

  const handleResetAllFilters = useCallback(() => {
    setSelectedTimelineDateJump(null);
    setDonutPeriod('1d');
    resetFilters();
  }, [resetFilters]);

  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [visibleTimelineCount, setVisibleTimelineCount] = useState(8);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let debounceTimer: NodeJS.Timeout | null = null;
    const handleResize = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const isMob = window.innerWidth < 768;
        setIsMobileViewport(isMob);
      }, 100);
    };
    const isMob = window.innerWidth < 768;
    setIsMobileViewport(isMob);
    setVisibleTimelineCount(isMob ? 3 : 8);
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (isQuizOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isQuizOpen]);

  const [selectedTimelineApt, setSelectedTimelineApt] = useState<string | null>(null);
  const chartGranularity = useMemo(
    () => resolveGranularityForTimeframe(timeframe),
    [timeframe]
  );

  const handleCardHover = useCallback((aptName: string, dong: string) => {
    preloadApartmentTx?.(aptName, dong);
    import('@/components/apartment/ApartmentModal').catch(() => {});
    import('@/components/apartment-modal/TransactionChartSection').catch(() => {});
  }, [preloadApartmentTx]);

  const resolveAptDong = useCallback((aptName: string, explicitDong?: string): string => {
    if (explicitDong) return explicitDong;
    if (sheetApartments) {
      const matched = Object.values(sheetApartments)
        .flat()
        .find((a) => isSameApartment(a.name, aptName, nameMapping, a.dong));
      if (matched?.dong) return matched.dong;
    }
    if (txSummaryData) {
      const summaryMap =
        (txSummaryData as { summary?: Record<string, AptTxSummary> })?.summary ||
        (txSummaryData as Record<string, AptTxSummary>);
      const resolvedKey = findTxKey(aptName, summaryMap, nameMapping);
      if (resolvedKey && summaryMap[resolvedKey]?.dong) {
        return summaryMap[resolvedKey].dong || '';
      }
    }
    return '';
  }, [sheetApartments, txSummaryData, nameMapping]);

  const handleNavigateDetailPage = useCallback((aptName: string, dong?: string, surface: string = 'dashboard') => {
    if (!aptName) return;
    const resolvedDong = resolveAptDong(aptName, dong);
    addRecentApartment({ name: aptName, dong: resolvedDong });

    const summaryMap = (txSummaryData as { summary?: Record<string, AptTxSummary> })?.summary || (txSummaryData as Record<string, AptTxSummary>) || {};
    const canonicalSlug =
      resolveCanonicalAptSlug(aptName, {
        txMap: summaryMap,
        sheetApartments,
        manualMapping: nameMapping,
        dong: resolvedDong || dong,
      }) || aptName;
    const canonicalHref = `/apartment/${encodeURIComponent(canonicalSlug)}`;

    trackEvent('hybrid_detail_navigate', {
      apt_name: aptName,
      canonical_slug: canonicalSlug,
      surface,
    });
    const detailViewPayload = {
      apartment_name: aptName,
      apt_name: aptName,
      canonical_slug: canonicalSlug,
      dong: resolvedDong || dong || undefined,
      surface,
      view_type: 'detail_page' as const,
    };
    if (typeof trackApartmentView === 'function') {
      trackApartmentView(detailViewPayload);
    } else {
      trackEvent('apartment_view', detailViewPayload);
    }

    if (onNavigateApartmentPage) {
      onNavigateApartmentPage(aptName, resolvedDong || dong);
    } else if (onSelectApt) {
      onSelectApt(aptName, resolvedDong || dong);
    } else if (typeof window !== 'undefined') {
      window.location.assign(canonicalHref);
    }
  }, [resolveAptDong, txSummaryData, sheetApartments, nameMapping, onNavigateApartmentPage, onSelectApt]);

  const handleChartHeaderSelectApt = useCallback(
    (aptName: string, dong?: string) => handleNavigateDetailPage(aptName, dong, 'chart_header'),
    [handleNavigateDetailPage]
  );

  const handleCardClick = useCallback((aptName: string) => {
    if (!aptName) return;
    setSelectedTimelineApt(aptName);
    const resolvedDong = resolveAptDong(aptName);
    const isMob = typeof window !== 'undefined' && window.innerWidth < 1024;
    if (isMob) {
      if (onSelectApt) {
        addRecentApartment({ name: aptName, dong: resolvedDong });
        onSelectApt(aptName, resolvedDong || undefined);
      } else {
        handleNavigateDetailPage(aptName, resolvedDong || undefined, 'dashboard_timeline_mobile');
      }
      return;
    }
    addRecentApartment({ name: aptName, dong: resolvedDong });
    const cardViewPayload = {
      apartment_name: aptName,
      apt_name: aptName,
      dong: resolvedDong || undefined,
      surface: 'dashboard_timeline_preview',
      view_type: 'chart_preview' as const,
    };
    if (typeof trackApartmentView === 'function') {
      trackApartmentView(cardViewPayload);
    } else {
      trackEvent('apartment_view', cardViewPayload);
    }
  }, [setSelectedTimelineApt, resolveAptDong, onSelectApt, handleNavigateDetailPage]);

  const handleDetailsClick = useCallback((aptName: string) => {
    handleNavigateDetailPage(aptName, undefined, 'timeline_detail');
  }, [handleNavigateDetailPage]);

  const handleDetailsHover = useCallback((aptName: string, dong: string) => {
    preloadApartmentTx?.(aptName, dong);
    preloadApartmentModal();
  }, [preloadApartmentTx]);

  const handleCloseQuiz = useCallback(() => {
    setIsQuizOpen(false);
  }, []);

  const handleOpenAptFitFinder = useCallback(() => {
    setIsQuizOpen(true);
  }, []);

  const lastTrackedTimelineSearchRef = useRef<string>('');

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      lastTrackedTimelineSearchRef.current = '';
      return;
    }
    if (!mounted) return;

    const normalizedQuery = query.slice(0, 100);
    const timer = setTimeout(() => {
      if (lastTrackedTimelineSearchRef.current !== normalizedQuery) {
        lastTrackedTimelineSearchRef.current = normalizedQuery;
        const searchPayload = {
          search_term: normalizedQuery,
          query: normalizedQuery,
          surface: 'dashboard_timeline',
          trigger: 'debounce',
        };
        if (typeof trackSearchQuery === 'function') {
          trackSearchQuery(searchPayload);
        } else {
          trackEvent('search_query', searchPayload);
        }
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery, mounted]);

  const handleOpenCompare = useCallback((aptName?: string, trigger?: string) => {
    const safeAptName =
      typeof aptName === 'string' && aptName.trim().length > 0 ? aptName.trim() : undefined;
    const safeTrigger =
      typeof trigger === 'string' && trigger.trim().length > 0 ? trigger.trim() : undefined;
    trackEvent('open_calculator', {
      calculator_type: 'compare',
      apartment_name: safeAptName,
      apt_name: safeAptName,
      surface: 'dashboard',
      trigger: safeTrigger,
    });
    if (onOpenCompare) {
      onOpenCompare(safeAptName);
    }
  }, [onOpenCompare]);

  const handleOpenJeonseSafety = useCallback((aptName?: string, trigger?: string) => {
    const safeAptName =
      typeof aptName === 'string' && aptName.trim().length > 0 ? aptName.trim() : undefined;
    const safeTrigger =
      typeof trigger === 'string' && trigger.trim().length > 0 ? trigger.trim() : undefined;
    trackEvent('open_calculator', {
      calculator_type: 'jeonse_safety',
      apartment_name: safeAptName,
      apt_name: safeAptName,
      surface: 'dashboard',
      trigger: safeTrigger,
    });
    if (onOpenJeonseSafety) {
      onOpenJeonseSafety(safeAptName);
    }
  }, [onOpenJeonseSafety]);

  const handleOpenMortgage = useCallback(
    (aptName?: string, priceWon?: number, trigger?: string) => {
      const safeAptName =
        typeof aptName === 'string' && aptName.trim().length > 0 ? aptName.trim() : undefined;
      const safePriceWon =
        typeof priceWon === 'number' && Number.isFinite(priceWon) && priceWon > 0
          ? priceWon
          : undefined;
      const safeTrigger =
        typeof trigger === 'string' && trigger.trim().length > 0 ? trigger.trim() : undefined;
      trackEvent('open_calculator', {
        calculator_type: 'mortgage',
        apartment_name: safeAptName,
        apt_name: safeAptName,
        surface: 'dashboard',
        trigger: safeTrigger,
      });
      if (onOpenMortgage) {
        onOpenMortgage(safeAptName, safePriceWon);
      }
    },
    [onOpenMortgage]
  );

  const handleOpenSellTiming = useCallback((aptName?: string, trigger?: string) => {
    const safeAptName =
      typeof aptName === 'string' && aptName.trim().length > 0 ? aptName.trim() : undefined;
    const safeTrigger =
      typeof trigger === 'string' && trigger.trim().length > 0 ? trigger.trim() : undefined;
    trackEvent('open_calculator', {
      calculator_type: 'sell_timing',
      apartment_name: safeAptName,
      apt_name: safeAptName,
      surface: 'dashboard',
      trigger: safeTrigger,
    });
    if (onOpenSellTimingCalculator) {
      onOpenSellTimingCalculator(safeAptName);
    } else if (_onOpenTaxCalculator) {
      _onOpenTaxCalculator(safeAptName);
    }
  }, [onOpenSellTimingCalculator, _onOpenTaxCalculator]);

  const handleOpenTaxCalculator = useCallback((aptName?: string, trigger?: string) => {
    const safeAptName =
      typeof aptName === 'string' && aptName.trim().length > 0 ? aptName.trim() : undefined;
    const safeTrigger =
      typeof trigger === 'string' && trigger.trim().length > 0 ? trigger.trim() : undefined;
    trackEvent('open_calculator', {
      calculator_type: 'property_tax',
      apartment_name: safeAptName,
      apt_name: safeAptName,
      surface: 'dashboard',
      trigger: safeTrigger,
    });
    if (_onOpenTaxCalculator) {
      _onOpenTaxCalculator(safeAptName);
    } else if (onOpenSellTimingCalculator) {
      onOpenSellTimingCalculator(safeAptName);
    }
  }, [_onOpenTaxCalculator, onOpenSellTimingCalculator]);

  const handleSelectApt = useCallback((name: string, dong?: string) => {
    if (!name) return;
    const resolvedDong = resolveAptDong(name, dong);
    if (onSelectApt) {
      onSelectApt(name, resolvedDong || undefined);
    } else {
      handleNavigateDetailPage(name, resolvedDong || dong, 'dashboard_card');
    }
  }, [resolveAptDong, onSelectApt, handleNavigateDetailPage]);

  const isDefaultAptSettingUp = useMemo(() => {
    if (!mounted) return true;
    return false;
  }, [mounted]);

  // Preload ApartmentModal and transactions when selectedTimelineApt changes
  useEffect(() => {
    if (!selectedTimelineApt || !sheetApartments) return;
    if (process.env.NODE_ENV === 'test') return;
    
    const allApts = Object.values(sheetApartments).flat();
    const aptObj = allApts.find(a => a.name === selectedTimelineApt || normalizeAptName(a.name) === normalizeAptName(selectedTimelineApt));
    const dong = aptObj?.dong || '';
    
    if (preloadApartmentTx) {
      preloadApartmentTx(selectedTimelineApt, dong);
    }
    preloadApartmentModal();
  }, [selectedTimelineApt, sheetApartments, preloadApartmentTx]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#fit-quiz") {
      setIsQuizOpen(true);
    }
  }, []);

  const txKey = useMemo(() => {
    if (!selectedTimelineApt) return null;
    const normalizedName = normalizeAptName(selectedTimelineApt);

    let rawApt: DongApartment | null = null;
    if (sheetApartments) {
      const allApts = Object.values(sheetApartments).flat();
      rawApt = allApts.find(a => isSameApartment(a.name, selectedTimelineApt, nameMapping, a.dong)) || null;
    }

    const rawAptTxKey = (rawApt as { txKey?: string })?.txKey;
    const overrideKey = HARDCODED_MAPPING[normalizedName];

    let summaryResolved: string | null = null;
    if (txSummaryData) {
      const summaryMap = (txSummaryData as { summary?: Record<string, AptTxSummary> })?.summary || txSummaryData;
      if (Object.keys(summaryMap).length > 0) {
        summaryResolved = findTxKey(selectedTimelineApt, summaryMap, nameMapping);
      }
    }

    const resolved = rawAptTxKey || overrideKey || summaryResolved || selectedTimelineApt;
    return normalizeAptName(resolved);
  }, [selectedTimelineApt, sheetApartments, txSummaryData, nameMapping]);

  const fetchUrl = useMemo(() => {
    if (!mounted || !txKey) return null;
    return `/tx-data/${encodeURIComponent(txKey)}.json?v=${BUILD_VERSION}`;
  }, [mounted, txKey]);

  const { data: aptRealTxDataData, isValidating: isAptTxLoading } = useSWR<AptTransactionRecord[]>(
    fetchUrl,
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) {
        logger.warn('MacroDashboardClient.fetchTxData', `Failed to load tx data: status ${res.status}`);
        return null;
      }
      return res.json();
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateOnMount: true,
      dedupingInterval: 1000,
    }
  );

  const aptRealTxData = aptRealTxDataData || null;

  const maxDateTime = useMemo(() => {
    let maxVal = 0;
    const txSource = (timelinePeriodTransactions && timelinePeriodTransactions.length > 0)
      ? timelinePeriodTransactions
      : recentTransactions;
    txSource.forEach((tx) => {
      const dt = parseDateHelper(tx.registeredDate || tx.contractDate || tx.date);
      if (dt) {
        const time = dt.getTime();
        if (time > maxVal) {
          maxVal = time;
        }
      }
    });
    if (maxVal === 0) {
      maxVal = new Date("2026-05-26").getTime();
    }
    return maxVal;
  }, [recentTransactions, timelinePeriodTransactions]);

  const { data: directMacroTrendData } = useSWR<DongtanMacroTrendPoint[]>(
    (!macroTrendData || macroTrendData.length === 0) && mounted ? `/data/macro-trend.json?v=${BUILD_VERSION}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 3600000 }
  );

  const activeMacroData = useMemo(() => {
    if (macroTrendData && macroTrendData.length > 0) return macroTrendData;
    if (directMacroTrendData && directMacroTrendData.length > 0) return directMacroTrendData;
    return [];
  }, [macroTrendData, directMacroTrendData]);

  const paddedMacroTrendData = useMemo(() => {
    if (!activeMacroData || activeMacroData.length === 0) return [];
    
    const currentYear = 2026;
    const currentMonth = 6;
    
    const lastPoint = activeMacroData[activeMacroData.length - 1];
    if (!lastPoint || !lastPoint.name) return activeMacroData;
    
    const parts = lastPoint.name.split(".");
    if (parts.length !== 2) return activeMacroData;
    
    let lastYear = 2000 + parseInt(parts[0]);
    let lastMonth = parseInt(parts[1]);
    
    const padded = [...activeMacroData];
    
    while (true) {
      if (lastYear > currentYear || (lastYear === currentYear && lastMonth >= currentMonth)) {
        break;
      }
      
      lastMonth++;
      if (lastMonth > 12) {
        lastMonth = 1;
        lastYear++;
      }
      
      const newName = `${String(lastYear).slice(2)}.${String(lastMonth).padStart(2, '0')}`;
      padded.push({
        ...lastPoint,
        name: newName,
        ...(typeof lastPoint.saleCount === 'number' ? { saleCount: 0 } : {}),
        ...(typeof lastPoint.rentCount === 'number' ? { rentCount: 0 } : {}),
      });
    }
    
    return padded;
  }, [activeMacroData]);

  const deferredMacroTrendData = useDeferredValue(paddedMacroTrendData);

  const macroTrendJsonLd = useMemo(() => {
    if (!activeMacroData || activeMacroData.length === 0) return null;

    const formatDateStr = (nameStr: string) => {
      const parts = nameStr.split('.');
      if (parts.length === 2) {
        const year = 2000 + parseInt(parts[0], 10);
        const month = parts[1];
        return `${year}-${month}`;
      }
      return nameStr;
    };

    const firstPoint = activeMacroData[0];
    const lastPoint = activeMacroData[activeMacroData.length - 1];
    const startDate = firstPoint ? formatDateStr(firstPoint.name) : "2023-01";
    const endDate = lastPoint ? formatDateStr(lastPoint.name) : "2026-06";

    const latestSalePrice = lastPoint ? lastPoint['동탄 아파트 전체'] : undefined;
    const latestJeonsePrice = lastPoint ? lastPoint['동탄 아파트 전세 평균'] : undefined;

    const datasetSchema = {
      "@context": "https://schema.org",
      "@type": "Dataset",
      "name": "동탄 아파트 부동산 매크로 시세 및 실거래 트렌드 통계",
      "description": "동탄 지역 아파트의 매매 실거래 평균가 및 전세 평균 시세의 월별 변동 추이를 집계한 부동산 매크로 통계 데이터셋입니다.",
      "url": "https://dongtanview.com",
      "spatialCoverage": {
        "@type": "Place",
        "name": "경기도 화성시 동탄"
      },
      "temporalCoverage": `${startDate}/${endDate}`,
      "variableMeasured": [
        {
          "@type": "PropertyValue",
          "name": "동탄 아파트 전체 평균 매매 실거래가",
          "value": latestSalePrice ? `${latestSalePrice}억 원` : "데이터 없음",
          "unitText": "억 원"
        },
        {
          "@type": "PropertyValue",
          "name": "동탄 아파트 전세 평균가",
          "value": latestJeonsePrice ? `${latestJeonsePrice}억 원` : "데이터 없음",
          "unitText": "억 원"
        }
      ],
      "distribution": {
        "@type": "DataDownload",
        "name": "동탄 아파트 월별 매크로 시세 추이",
        "encodingFormat": "application/json",
        "contentUrl": "https://dongtanview.com"
      }
    };

    return JSON.stringify(datasetSchema);
  }, [activeMacroData]);

  const shouldFetchGranularSeries =
    mounted && !selectedTimelineApt && (chartGranularity === "daily" || chartGranularity === "weekly");

  const { data: rawMacroTrendSeries, isLoading: isMacroTrendSeriesLoading } = useSWR<unknown>(
    shouldFetchGranularSeries ? `/data/macro-trend-series.json?v=${BUILD_VERSION}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 3600000,
    }
  );

  const parsedMacroTrendSeries = useMemo(
    () => parseMacroTrendSeriesPayload(rawMacroTrendSeries),
    [rawMacroTrendSeries]
  );

  const isGranularLoading =
    shouldFetchGranularSeries && isMacroTrendSeriesLoading && !parsedMacroTrendSeries;

  const selectedAptChartData = useMemo(() => {
    if (!selectedTimelineApt) return null;
    if (!aptRealTxData || !Array.isArray(aptRealTxData) || aptRealTxData.length === 0) {
      return [];
    }
    return buildApartmentGranularChartData(aptRealTxData, chartGranularity, deferredMacroTrendData);
  }, [selectedTimelineApt, aptRealTxData, chartGranularity, deferredMacroTrendData]);

  const lineData = useMemo(() => {
    let sourceData: (DongtanMacroTrendPoint | FormattedMacroPoint)[] = [];
    if (selectedTimelineApt) {
      sourceData = selectedAptChartData || [];
    } else if (chartGranularity === "daily") {
      sourceData = parsedMacroTrendSeries?.daily || [];
    } else if (chartGranularity === "weekly") {
      sourceData = parsedMacroTrendSeries?.weekly || [];
    } else {
      sourceData =
        parsedMacroTrendSeries && parsedMacroTrendSeries.monthly.length > 0
          ? parsedMacroTrendSeries.monthly
          : deferredMacroTrendData || [];
    }
    return filterChartTimeframeByGranularity<DongtanMacroTrendPoint | FormattedMacroPoint>(
      sourceData,
      timeframe,
      chartGranularity
    );
  }, [
    selectedTimelineApt,
    selectedAptChartData,
    chartGranularity,
    parsedMacroTrendSeries,
    deferredMacroTrendData,
    timeframe,
  ]);

  const xTicks = useMemo(() => {
    return computeNonOverlappingXTicks(lineData, isSplitMode ? 5 : 7);
  }, [lineData, isSplitMode]);

  const yTicks = useMemo(() => {
    if (!lineData || lineData.length === 0) return [0, 2, 4, 6, 8];
    let maxVal = 0;
    lineData.forEach((d) => {
      const sale = d["동탄 아파트 전체"] || 0;
      const rent = d["동탄 아파트 전세 평균"] || 0;
      if (sale > maxVal) maxVal = sale;
      if (rent > maxVal) maxVal = rent;
    });

    if (maxVal <= 0) return [0, 2, 4, 6, 8];

    let step = 2;
    if (maxVal <= 5) {
      step = 1;
    } else if (maxVal <= 12) {
      step = 2;
    } else if (maxVal <= 24) {
      step = 4;
    } else {
      step = 5;
    }

    const finalMax = (Math.floor(maxVal / step) + 1) * step;

    const ticks = [];
    for (let i = 0; i <= finalMax; i += step) {
      ticks.push(i);
    }
    return ticks;
  }, [lineData]);

  const dailyTimelineData = useMemo(() => {
    const groups: Record<string, { dateStr: string; dateKey?: string; year?: number; timestamp: number; items: TimelineItem[] }> = {};

    const activeTimelineTxs = (timelinePeriodTransactions && timelinePeriodTransactions.length > 0)
      ? timelinePeriodTransactions
      : recentTransactions;

    if (!activeTimelineTxs || !txSummaryData) return [];

    const txKeyToCustomNameMap = new Map<string, string>();
    if (nameMapping) {
      for (const [customName, tKey] of Object.entries(nameMapping)) {
        if (tKey) {
          txKeyToCustomNameMap.set(tKey, customName);
          txKeyToCustomNameMap.set(normalizeAptName(tKey), customName);
        }
      }
    }

    const summaryMap = (txSummaryData as { summary?: Record<string, AptTxSummary> })?.summary || txSummaryData;

    activeTimelineTxs.forEach((tx) => {
      if (publicRentalSet && publicRentalSet.has && publicRentalSet.has(tx.aptName)) return;

      const dt = parseDateHelper(tx.registeredDate || tx.contractDate || tx.date);
      if (!dt) return;

      const diffMs = maxDateTime - dt.getTime();
      const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      if (diffDays >= 0) {
        const year = dt.getFullYear();
        const month = dt.getMonth() + 1;
        const dateVal = dt.getDate();
        const daysOfWeek = ["일", "월", "화", "수", "목", "금", "토"];
        const dayName = daysOfWeek[dt.getDay()];
        const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(dateVal).padStart(2, '0')}`;
        const dateStr = `${year}.${String(month).padStart(2, '0')}.${String(dateVal).padStart(2, '0')} (${dayName})`;

        if (!groups[dateKey]) {
          groups[dateKey] = {
            dateStr,
            dateKey,
            year,
            timestamp: dt.getTime(),
            items: [],
          };
        }

        const t = typeMap ? findTypeMapEntry(typeMap, tx.aptName, tx.area) : null;
        const labelM2 = t ? t.typeM2 : `${tx.area}㎡`;
        const labelPyeong = t ? (t.typePyeong || t.typeM2) : `${Math.round(tx.areaPyeong)}평`;

        const customAptName = txKeyToCustomNameMap.get(tx.txKey) || tx.aptName;

        groups[dateKey].items.push({
          aptName: customAptName,
          displayAptName: getDisplayAptName(customAptName),
          dong: summaryMap[tx.txKey]?.dong || txSummaryData[tx.txKey]?.dong || "",
          priceEok: tx.priceEok,
          priceVal: tx.priceVal,
          areaPyeong: tx.areaPyeong,
          area: tx.area,
          floor: typeof tx.floor === 'string' ? (parseInt(tx.floor, 10) || 0) : tx.floor,
          type: tx.isNewHigh ? "high" : "normal",
          isNewHigh: tx.isNewHigh,
          delta: tx.delta || 0,
          deltaPercent: typeof tx.deltaPercent === 'number' ? Math.round(tx.deltaPercent * 10) / 10 : 0,
          prevPriceVal: tx.prevPriceVal || (tx.priceVal - (tx.delta || 0)),
          areaLabelM2: labelM2,
          areaLabelPyeong: labelPyeong,
          contractDate: tx.contractDate,
          date: tx.date,
          registeredDate: tx.registeredDate,
          registeredDateLabel: tx.registeredDateLabel,
        });
      }
    });

    return Object.values(groups)
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((group) => {
        const sortedItems = [...group.items].sort(compareTimelineItemsByPyeongPriceDesc);
        const totalCount = sortedItems.length;
        const avgVal = totalCount > 0 ? (sortedItems.reduce((s, it) => s + it.priceVal, 0) / totalCount) : 0;
        const avgRoundedMan = Math.round(avgVal * 10000);
        const eok = Math.floor(avgRoundedMan / 10000);
        const man = avgRoundedMan % 10000;
        const avgPriceEok = eok === 0 ? `${man.toLocaleString()}만` : man === 0 ? `${eok}억` : `${eok}억 ${man.toLocaleString()}만`;

        const priceSorted = [...group.items].sort((a, b) => b.priceVal - a.priceVal);
        const highest = priceSorted[0];
        const highestPriceApt = highest
          ? {
              aptName: highest.aptName,
              displayAptName: highest.displayAptName || highest.aptName,
              priceEok: highest.priceEok,
              priceVal: highest.priceVal,
            }
          : undefined;

        return {
          ...group,
          items: sortedItems,
          totalCount,
          avgPriceVal: avgVal,
          avgPriceEok,
          highestPriceApt,
        };
      });
  }, [txSummaryData, recentTransactions, timelinePeriodTransactions, publicRentalSet, nameMapping, maxDateTime, typeMap]);

  const filteredTimelineData = useMemo(() => {
    const isAllRegion = (regionFilter === "all" || regionFilter === "전체") && (timelineDongFilter === "전체" || timelineDongFilter === "all");
    const isAllApt = timelineAptFilter === "전체" || timelineAptFilter === "all";
    const isAllPyeong = pyeongFilter === "all";
    const isAllTradeType = tradeTypeFilter === "all";
    const isAllQuick = quickFilter === "all";
    const hasSearchQuery = !!(searchQuery && searchQuery.trim());
    const isDefaultSort = sortOrder === "latest";

    if (isAllRegion && isAllApt && isAllPyeong && isAllTradeType && isAllQuick && !hasSearchQuery && isDefaultSort) {
      return dailyTimelineData;
    }

    const trimmedSearch = searchQuery ? searchQuery.trim().toLowerCase() : "";

    return dailyTimelineData
      .map((group) => {
        const filteredItems = group.items.filter((item) => {
          // 1. Quick Filter Check
          if (quickFilter === 'dongtan1') {
            if (!DONGTAN1_DONGS.includes(item.dong)) return false;
          } else if (quickFilter === 'dongtan2') {
            if (!DONGTAN2_DONGS.includes(item.dong)) return false;
          } else if (quickFilter === 'high') {
            if (item.type !== 'high' && !item.isNewHigh) return false;
          } else if (quickFilter === 'pyeong30') {
            const pyeong = item.areaPyeong || (item.area ? item.area / 3.3058 : 0);
            const inPyeong30 = (pyeong >= 30 && pyeong < 40) || (item.area >= 74 && item.area < 102);
            if (!inPyeong30) return false;
          } else if (quickFilter === 'billion10') {
            if (item.priceVal < 10.0) return false;
          } else if (quickFilter === 'landmark') {
            const isLandmark = LANDMARK_APTS.some(
              (lm) =>
                item.aptName.includes(lm) ||
                lm.includes(item.aptName) ||
                (item.displayAptName && (item.displayAptName.includes(lm) || lm.includes(item.displayAptName))) ||
                isSameApartment(item.aptName, lm, nameMapping)
            );
            if (!isLandmark) return false;
          }

          // 2. Region / Dong match
          if (regionFilter === 'dongtan1') {
            if (!DONGTAN1_DONGS.includes(item.dong)) return false;
          } else if (regionFilter === 'dongtan2') {
            if (!DONGTAN2_DONGS.includes(item.dong)) return false;
          } else if (regionFilter !== 'all' && regionFilter !== '전체') {
            if (item.dong !== regionFilter) return false;
          } else if (timelineDongFilter !== '전체' && timelineDongFilter !== 'all') {
            if (item.dong !== timelineDongFilter) return false;
          }

          // 3. Apt match
          if (timelineAptFilter !== '전체' && timelineAptFilter !== 'all') {
            const matchesApt =
              item.aptName === timelineAptFilter ||
              normalizeAptName(item.aptName) === normalizeAptName(timelineAptFilter) ||
              isSameApartment(item.aptName, timelineAptFilter, nameMapping);
            if (!matchesApt) return false;
          }

          // 4. Pyeong match
          const pyeong = item.areaPyeong || (item.area ? item.area / 3.3058 : 0);
          if (pyeongFilter === 'under20') {
            if (pyeong >= 20) return false;
          } else if (pyeongFilter === '20s') {
            if (pyeong < 20 || pyeong >= 30) return false;
          } else if (pyeongFilter === '30s') {
            if (pyeong < 30 || pyeong >= 40) return false;
          } else if (pyeongFilter === '40plus') {
            if (pyeong < 40) return false;
          }

          // 5. Trade Type match (1:1 aligned with 4 energy donut slices: high / rising / flat / falling)
          const isItemHigh = item.type === 'high' || Boolean(item.isNewHigh);
          if (tradeTypeFilter === 'high') {
            if (!isItemHigh) return false;
          } else if (tradeTypeFilter === 'rising') {
            if (isItemHigh || (item.delta || 0) <= 0.0001) return false;
          } else if (tradeTypeFilter === 'flat') {
            if (isItemHigh || Math.abs(item.delta || 0) > 0.0001) return false;
          } else if (tradeTypeFilter === 'falling') {
            if (isItemHigh || (item.delta || 0) >= -0.0001) return false;
          }

          // 6. Search Query match
          if (trimmedSearch) {
            if (
              !matchesApartmentSearch(
                {
                  name: item.aptName || '',
                  displayName: item.displayAptName,
                  dong: item.dong,
                },
                trimmedSearch
              )
            ) {
              return false;
            }
          }

          return true;
        });

        // Apply Sorting inside each date group
        const sortedItems = [...filteredItems].sort((a, b) => {
          if (sortOrder === 'price_desc') {
            return b.priceVal - a.priceVal;
          }
          if (sortOrder === 'delta_desc') {
            const bDeltaPct = b.deltaPercent ?? (b.prevPriceVal && b.prevPriceVal > 0 ? (b.delta / b.prevPriceVal) * 100 : b.delta);
            const aDeltaPct = a.deltaPercent ?? (a.prevPriceVal && a.prevPriceVal > 0 ? (a.delta / a.prevPriceVal) * 100 : a.delta);
            if (bDeltaPct !== aDeltaPct) {
              return bDeltaPct - aDeltaPct;
            }
            return b.delta - a.delta;
          }
          if (sortOrder === 'area_desc') {
            return (b.area || b.areaPyeong) - (a.area || a.areaPyeong);
          }
          // 'latest' (default): sort within each registration date group by price-per-pyeong descending (평당가 상위순)
          return compareTimelineItemsByPyeongPriceDesc(a, b);
        });

        const totalCount = sortedItems.length;
        const avgVal = totalCount > 0 ? (sortedItems.reduce((s, it) => s + it.priceVal, 0) / totalCount) : 0;
        const avgRoundedMan = Math.round(avgVal * 10000);
        const eok = Math.floor(avgRoundedMan / 10000);
        const man = avgRoundedMan % 10000;
        const avgPriceEok = eok === 0 ? `${man.toLocaleString()}만` : man === 0 ? `${eok}억` : `${eok}억 ${man.toLocaleString()}만`;

        const highest = sortedItems.reduce((max, cur) => (cur.priceVal > max.priceVal ? cur : max), sortedItems[0]);
        const highestPriceApt = highest
          ? {
              aptName: highest.aptName,
              displayAptName: highest.displayAptName || highest.aptName,
              priceEok: highest.priceEok,
              priceVal: highest.priceVal,
            }
          : undefined;

        return {
          ...group,
          items: sortedItems,
          totalCount,
          avgPriceVal: avgVal,
          avgPriceEok,
          highestPriceApt,
        };
      })
      .filter((group) => group.items.length > 0);
  }, [dailyTimelineData, regionFilter, timelineDongFilter, timelineAptFilter, pyeongFilter, tradeTypeFilter, quickFilter, searchQuery, sortOrder, nameMapping]);

  useEffect(() => {
    setVisibleTimelineCount(isMobileViewport ? 3 : 8);
  }, [timelineDongFilter, regionFilter, timelineAptFilter, pyeongFilter, tradeTypeFilter, quickFilter, searchQuery, sortOrder, periodFilter, isMobileViewport]);

  const totalTimelineCardsCount = useMemo(() => {
    return filteredTimelineData.reduce((acc, group) => acc + group.items.length, 0);
  }, [filteredTimelineData]);

  const donutTransactions = useMemo(() => {
    const rawBase =
      donutPeriod === '1y' && timelinePeriodTransactions && timelinePeriodTransactions.length > 0
        ? timelinePeriodTransactions
        : recentTransactions && recentTransactions.length > 0
          ? recentTransactions
          : timelinePeriodTransactions || [];

    if (selectedTimelineDateJump) {
      const targetDigits = selectedTimelineDateJump.replace(/[^0-9]/g, '').slice(0, 8);
      if (targetDigits.length === 8) {
        return rawBase.filter((tx) => {
          const raw = String(tx?.registeredDate || tx?.contractDate || tx?.date || '');
          const clean = raw.replace(/[^0-9]/g, '').slice(0, 8);
          return clean === targetDigits || tx?.registeredDateLabel === selectedTimelineDateJump;
        });
      }
      const matchedGroup = dailyTimelineData.find(
        (g) => (g.dateStr || g.dateKey) === selectedTimelineDateJump
      );
      return matchedGroup ? (matchedGroup.items as unknown as RecentTransaction[]) : rawBase;
    }

    let baseSource = rawBase;
    if ((donutPeriod === '1d' || donutPeriod === '7d' || donutPeriod === '30d') && rawBase.length > 0) {
      let maxDateStr = '';
      for (let i = 0; i < rawBase.length; i++) {
        const cd = String(rawBase[i]?.registeredDate || rawBase[i]?.contractDate || rawBase[i]?.date || '');
        const clean = cd.replace(/[^0-9]/g, '').slice(0, 8);
        if (clean.length === 8 && clean > maxDateStr) maxDateStr = clean;
      }
      if (maxDateStr.length === 8) {
        if (donutPeriod === '1d') {
          baseSource = rawBase.filter((tx) => {
            const cd = String(tx?.registeredDate || tx?.contractDate || tx?.date || '');
            const clean = cd.replace(/[^0-9]/g, '').slice(0, 8);
            if (clean.length < 8) return true;
            return clean === maxDateStr;
          });
        } else {
          const days = donutPeriod === '7d' ? 7 : 30;
          const y = parseInt(maxDateStr.slice(0, 4), 10);
          const m = parseInt(maxDateStr.slice(4, 6), 10) - 1;
          const d = parseInt(maxDateStr.slice(6, 8), 10);
          const cutoffD = new Date(y, m, d - days);
          const cutoffNum = cutoffD.getFullYear() * 10000 + (cutoffD.getMonth() + 1) * 100 + cutoffD.getDate();
          baseSource = rawBase.filter((tx) => {
            const cd = String(tx?.registeredDate || tx?.contractDate || tx?.date || '');
            const clean = cd.replace(/[^0-9]/g, '').slice(0, 8);
            if (clean.length < 8) return true;
            return parseInt(clean, 10) >= cutoffNum;
          });
        }
      }
    }

    return baseSource;
  }, [donutPeriod, timelinePeriodTransactions, recentTransactions, selectedTimelineDateJump, dailyTimelineData]);

  const donutInsights = useMemo<HyperlocalInsightCardsData>(() => {
    const summaryMap =
      (txSummaryData as { summary?: Record<string, AptTxSummary> })?.summary ||
      (txSummaryData as Record<string, AptTxSummary>) ||
      {};

    const enrichedDonutTxs = (donutTransactions as unknown as RawTransactionRecord[]).map((tx) => {
      if (typeof tx.deltaPercent === 'number' && isFinite(tx.deltaPercent) && tx.deltaPercent !== 0) {
        return tx;
      }
      const rawDelta = typeof tx.delta === 'number' && isFinite(tx.delta) ? tx.delta : 0;
      if (rawDelta >= 0) return tx;
      const priceEok =
        typeof tx.priceVal === 'number' && tx.priceVal > 0
          ? tx.priceVal
          : typeof tx.price === 'number' && tx.price > 0
            ? tx.price > 1000
              ? tx.price / 10000
              : tx.price
            : 0;
      const prevEok =
        typeof tx.prevPriceVal === 'number' && tx.prevPriceVal > 0
          ? tx.prevPriceVal
          : priceEok - rawDelta;
      if (prevEok > 0) {
        return {
          ...tx,
          deltaPercent: parseFloat(((rawDelta / prevEok) * 100).toFixed(1)),
        };
      }
      return tx;
    });

    const stats = aggregateStats(
      {
        transactions: enrichedDonutTxs,
        rents: [],
        macroTrend: deferredMacroTrendData,
        summaryMap,
      },
      {
        region: 'ALL',
        pyeong: 'ALL',
        timeframe: 'ALL',
        sort: 'PYEONG_DESC',
      },
      {
        sortBy: 'PYEONG_DESC',
        rankLimit: 0,
      }
    );

    let urgentBargainComplex = stats.insights.urgentBargainComplex;
    if (enrichedDonutTxs.length > 0) {
      let steepestTx: RawTransactionRecord | null = null;
      let maxDropPct = 0;
      for (let i = 0; i < enrichedDonutTxs.length; i++) {
        const tx = enrichedDonutTxs[i];
        const dp = typeof tx.deltaPercent === 'number' && isFinite(tx.deltaPercent) ? tx.deltaPercent : 0;
        if (dp < 0 && Math.abs(dp) > maxDropPct) {
          maxDropPct = Math.abs(dp);
          steepestTx = tx;
        }
      }
      if (steepestTx && maxDropPct > 0) {
        const matchedRank = stats.pyeongRankings.find(
          (r) => r.aptName === steepestTx?.aptName || r.aptKey === (steepestTx?.txKey || steepestTx?.aptName)
        );
        if (matchedRank) {
          urgentBargainComplex = {
            ...matchedRank,
            urgentSaleDiscountRate: parseFloat(maxDropPct.toFixed(1)),
          };
        }
      }
    }

    return {
      ...stats.insights,
      urgentBargainComplex,
    };
  }, [donutTransactions, txSummaryData, deferredMacroTrendData]);

  const unifiedStatsData = useMemo(() => {
    const rawTxSource = (timelinePeriodTransactions && timelinePeriodTransactions.length > 0)
      ? timelinePeriodTransactions
      : recentTransactions;
    const summaryMap = (txSummaryData as { summary?: Record<string, AptTxSummary> })?.summary || (txSummaryData as Record<string, AptTxSummary>) || {};

    let mappedRegion: RegionFilter = 'ALL';
    let mappedDong = '';
    if (regionFilter === 'dongtan1') {
      mappedRegion = 'DONGTAN1';
    } else if (regionFilter === 'dongtan2') {
      mappedRegion = 'DONGTAN2';
    } else if (regionFilter !== 'all' && regionFilter !== '전체') {
      mappedRegion = regionFilter;
      mappedDong = regionFilter;
    } else if (timelineDongFilter !== '전체' && timelineDongFilter !== 'all') {
      mappedRegion = timelineDongFilter;
      mappedDong = timelineDongFilter;
    }

    let mappedPyeong: PyeongFilter = 'ALL';
    if (pyeongFilter === 'under20') mappedPyeong = 'SMALL';
    else if (pyeongFilter === '20s') mappedPyeong = 'MEDIUM_SMALL';
    else if (pyeongFilter === '30s') mappedPyeong = 'MEDIUM_LARGE';
    else if (pyeongFilter === '40plus') mappedPyeong = 'LARGE';

    let mappedTimeframe: TimeframeFilter = '3M';
    if (periodFilter === '1d' || periodFilter === '7d' || periodFilter === '30d') mappedTimeframe = '1M';
    else if (periodFilter === '90d') mappedTimeframe = '3M';
    else if (periodFilter === '1y') mappedTimeframe = '1Y';

    let mappedSort: SortOption = 'PYEONG_DESC';
    if (sortOrder === 'price_desc') mappedSort = 'PRICE_DESC';

    const trimmedSearch = searchQuery ? searchQuery.trim().toLowerCase() : '';
    const isAptFiltered = timelineAptFilter !== '전체' && timelineAptFilter !== 'all';

    const filteredTxs = (rawTxSource as unknown as RawTransactionRecord[]).filter((tx) => {
      if (isAptFiltered) {
        const matchesApt =
          tx.aptName === timelineAptFilter ||
          normalizeAptName(tx.aptName) === normalizeAptName(timelineAptFilter) ||
          isSameApartment(tx.aptName, timelineAptFilter, nameMapping);
        if (!matchesApt) return false;
      }
      if (trimmedSearch) {
        const txKeyStr = typeof tx.txKey === 'string' ? tx.txKey : undefined;
        const txDong =
          (txKeyStr ? summaryMap[txKeyStr]?.dong : undefined) ||
          (typeof tx.dong === 'string' ? tx.dong : undefined);
        if (
          !matchesApartmentSearch(
            {
              name: tx.aptName || '',
              displayName: getDisplayAptName(tx.aptName),
              dong: txDong,
              txKey: txKeyStr,
            },
            trimmedSearch
          )
        ) {
          return false;
        }
      }
      return true;
    });

    return aggregateStats(
      {
        transactions: filteredTxs,
        rents: [],
        macroTrend: deferredMacroTrendData,
        summaryMap,
      },
      {
        region: mappedRegion,
        dong: mappedDong,
        pyeong: mappedPyeong,
        timeframe: mappedTimeframe,
        sort: mappedSort,
      },
      {
        sortBy: mappedSort,
        rankLimit: 20,
      }
    );
  }, [
    timelinePeriodTransactions,
    recentTransactions,
    txSummaryData,
    deferredMacroTrendData,
    regionFilter,
    timelineDongFilter,
    pyeongFilter,
    periodFilter,
    sortOrder,
    searchQuery,
    timelineAptFilter,
    nameMapping,
  ]);

  const handleSelectComplex = useCallback((_aptKey: string, aptName: string) => {
    const rawSummary = (txSummaryData as { summary?: Record<string, AptTxSummary> })?.summary || (txSummaryData as Record<string, AptTxSummary>) || {};
    const sanKey = _aptKey ? sanitizeAptKey(_aptKey) : '';
    const sanName = aptName ? sanitizeAptKey(aptName) : '';
    const normKey = _aptKey ? normalizeAptName(_aptKey) : '';
    const normName = aptName ? normalizeAptName(aptName) : '';
    const summary =
      resolveSummaryEntry(rawSummary, _aptKey || aptName, aptName || _aptKey) ||
      (_aptKey ? rawSummary?.[_aptKey] : undefined) ||
      (sanKey ? rawSummary?.[sanKey] : undefined) ||
      (normKey ? rawSummary?.[normKey] : undefined) ||
      rawSummary?.[aptName] ||
      (sanName ? rawSummary?.[sanName] : undefined) ||
      (normName ? rawSummary?.[normName] : undefined);
    if (!aptName) return;
    const dongVal = summary?.dong;
    const resolvedDong = resolveAptDong(aptName, dongVal);
    setSelectedTimelineApt(aptName);
    if (onSelectApt) {
      addRecentApartment({ name: aptName, dong: resolvedDong });
    }
    handleSelectApt(aptName, resolvedDong || dongVal);
  }, [txSummaryData, resolveAptDong, onSelectApt, handleSelectApt]);

  const displayedTimelineData = useMemo(() => {
    let count = 0;
    const result = [];
    for (const group of filteredTimelineData) {
      if (count >= visibleTimelineCount) break;
      const remaining = visibleTimelineCount - count;
      const slicedItems = group.items.slice(0, remaining);
      if (slicedItems.length > 0) {
        result.push({ ...group, items: slicedItems });
        count += slicedItems.length;
      }
    }
    return result;
  }, [filteredTimelineData, visibleTimelineCount]);

  // Zone 4: Dynamic price auto-binding for finance section
  const financeBinding = useMemo(() => {
    let targetApt = selectedTimelineApt;
    if (!targetApt && activeDonutSector?.repApt?.rawName) {
      targetApt = activeDonutSector.repApt.rawName;
    }
    if (!targetApt && userFavorites && userFavorites.size > 0) {
      targetApt = Array.from(userFavorites)[0];
    }
    if (!targetApt && DEFAULT_TIMELINE_APTS.length > 0) {
      targetApt = DEFAULT_TIMELINE_APTS[0];
    }

    if (!targetApt) return { aptName: null, priceWon: undefined };

    let priceWon: number | undefined = undefined;
    if (txSummaryData) {
      const summaryMap = (txSummaryData as { summary?: Record<string, AptTxSummary> })?.summary || (txSummaryData as Record<string, AptTxSummary>);
      const summaryEntry = resolveSummaryEntry(summaryMap, targetApt, targetApt);
      if (summaryEntry?.latestPrice && summaryEntry.latestPrice > 0) {
        priceWon = summaryEntry.latestPrice * 10_000;
      }
    }

    if (!priceWon && recentTransactions && recentTransactions.length > 0) {
      const matchingTx = recentTransactions.find(
        (t) => isSameApartment(t.aptName, targetApt, nameMapping)
      );
      if (matchingTx?.priceVal && matchingTx.priceVal > 0) {
        priceWon = Math.round(matchingTx.priceVal * 100_000_000);
      }
    }

    const displayName = getDisplayAptName(targetApt);

    return {
      aptName: displayName || targetApt,
      priceWon,
    };
  }, [selectedTimelineApt, activeDonutSector, userFavorites, txSummaryData, recentTransactions, nameMapping]);

  const liveRankingBoardNode = useMemo(() => (
    <ErrorBoundary name="실시간 랭킹 보드">
      <RealtimeRankingBoard
        recentTransactions={recentTransactions}
        txSummaryData={txSummaryData}
        sheetApartments={sheetApartments}
        className="mb-0 h-full"
        onSelectComplex={(complexName) => {
          setSelectedTimelineApt(complexName);
          handleCardClick(complexName);
        }}
        onSelectApt={(aptName) => {
          setSelectedTimelineApt(aptName);
          handleCardClick(aptName);
        }}
      />
    </ErrorBoundary>
  ), [recentTransactions, txSummaryData, sheetApartments, handleCardClick]);

  const renderTimelineItemCardNode = useCallback((item: TimelineItem, isSelected: boolean) => {
    const isFav = isApartmentInFavorites(userFavorites, item.aptName, nameMapping);
    return (
      <TimelineItemCard
        key={`${item.aptName}-${item.floor}-${item.priceVal}`}
        item={item}
        isSelected={isSelected}
        areaUnit={areaUnit}
        isFavorite={isFav}
        onToggleFavorite={toggleFavorite}
        onCardHover={handleCardHover}
        onCardClick={handleCardClick}
        onDetailsClick={handleDetailsClick}
        onDetailsHover={handleDetailsHover}
      />
    );
  }, [areaUnit, userFavorites, nameMapping, toggleFavorite, handleCardHover, handleCardClick, handleDetailsClick, handleDetailsHover]);

  const renderTimelineItemRowNode = useCallback((item: TimelineItem, isSelected: boolean) => {
    const isFav = isApartmentInFavorites(userFavorites, item.aptName, nameMapping);
    return (
      <TimelineItemRow
        key={`${item.aptName}-${item.floor}-${item.priceVal}`}
        item={item}
        isSelected={isSelected}
        areaUnit={areaUnit}
        isFavorite={isFav}
        onToggleFavorite={toggleFavorite}
        onCardHover={handleCardHover}
        onCardClick={handleCardClick}
        onDetailsClick={handleDetailsClick}
        onDetailsHover={handleDetailsHover}
      />
    );
  }, [areaUnit, userFavorites, nameMapping, toggleFavorite, handleCardHover, handleCardClick, handleDetailsClick, handleDetailsHover]);

  const renderChart = useCallback(() => {
    if (!trendChartReady) {
      return <InlineLoader text="매크로 동향 차트 분석 중" />;
    }
    return (
      <MacroTrendChart
        lineData={lineData}
        xTicks={xTicks}
        yTicks={yTicks}
        timeframe={timeframe}
        granularity={chartGranularity}
        isSplitMode={isSplitMode}
      />
    );
  }, [trendChartReady, lineData, xTicks, yTicks, timeframe, chartGranularity, isSplitMode]);

  const handleHoverApt = useCallback((aptName: string) => {
    if (!sheetApartments) return;
    const allApts = Object.values(sheetApartments).flat();
    const aptObj = allApts.find(a => a.name === aptName || normalizeAptName(a.name) === normalizeAptName(aptName));
    const dong = aptObj?.dong || '';
    preloadApartmentTx?.(aptName, dong);
    preloadApartmentModal();
  }, [sheetApartments, preloadApartmentTx]);

  return (
    <div
      data-split-mode={String(isSplitMode)}
      className="w-full flex flex-col bg-transparent relative min-h-[85vh] min-h-[800px] min-w-0 max-w-full transition-opacity duration-200 ease-out"
      style={{ contain: 'layout paint', containIntrinsicSize: '800px' }}
    >
      <MacroHeader macroTrendJsonLd={macroTrendJsonLd} isSplitMode={isSplitMode} />

      <div
        className={`flex flex-col ${
          isSplitMode
            ? 'px-4 sm:px-5 md:px-6 xl:px-8'
            : 'px-4 sm:px-6 md:px-10 lg:px-16'
        } pt-3 md:pt-5 pb-6 md:pb-8 lg:pb-10 w-auto max-w-full overflow-x-clip min-w-0 min-h-[85vh] min-h-[800px] box-border transition-opacity duration-200 ease-out`}
      >
        {/* ═══ Zone 2A: 메인 히어로 (좌측 원형 도넛 네비게이터 + 연동 4칸 카드 | 우측 단지·매크로 시세 추이) ═══ */}
        <div
          data-testid="hero-donut-trend-grid"
          className={`w-full ${
            isSplitMode
              ? 'grid grid-cols-1 gap-6'
              : 'grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-0'
          } pb-5 mb-4 border-b border-border items-stretch box-border transition-opacity duration-200 ease-out`}
        >
          {/* Left 6 Columns (lg:col-span-6, 시그니처 도넛 차트 자리): Circular Donut Navigator + Connected 4-Card Drilldown */}
          <div
            data-testid="hero-left-donut-col"
            className={
              isTimelineInlineExpanded
                ? 'hidden'
                : isSplitMode
                  ? 'flex flex-col gap-3.5 min-w-0 justify-between box-border pb-5 border-b border-border'
                  : 'lg:col-span-6 flex flex-col gap-3.5 lg:h-[526px] min-w-0 justify-between box-border pb-5 border-b border-border lg:pb-0 lg:border-b-0 lg:pr-6 xl:pr-8 lg:border-r lg:border-border'
            }
          >
            <ChartErrorBoundary fallbackText="실거래 체결 온도 차트를 불러올 수 없습니다.">
              <AptDonutSection
                variant="navigator"
                initialMode="energy"
                initialPeriod="1d"
                period={donutPeriod}
                onPeriodChange={handleDonutPeriodChange}
                mounted={mounted}
                isSplitMode={isSplitMode}
                recentTransactions={donutTransactions}
                selectedDateLabel={selectedTimelineDateJump}
                onClearSelectedDate={() => setSelectedTimelineDateJump(null)}
                txSummaryData={txSummaryData}
                sheetApartments={sheetApartments}
                nameMapping={nameMapping}
                publicRentalSet={publicRentalSet}
                activeCategory={activeDonutCategory}
                onActiveCategoryChange={handleDonutCategoryChange}
                onActiveSectorChange={setActiveDonutSector}
                onSelectApt={(aptName) => {
                  setSelectedTimelineApt(aptName);
                  handleCardClick(aptName);
                }}
                onOpenAptDetail={(aptName, dong) => {
                  setSelectedTimelineApt(aptName);
                  handleNavigateDetailPage(aptName, dong, 'donut_fullscreen');
                }}
                preloadApartmentTx={preloadApartmentTx}
                onOpenMortgageModal={() => handleOpenMortgage(selectedTimelineApt || undefined)}
              />
            </ChartErrorBoundary>
            <ErrorBoundary name="핵심 실거래 지표 카드">
              <AptMetricCards
                recentTransactions={donutTransactions}
                txSummaryData={txSummaryData}
                macroTrendData={macroTrendData}
                activeSector={activeDonutSector}
                insights={donutInsights}
                onResetSector={() => handleDonutCategoryChange(null)}
                onOpenSellTimingCalculator={handleOpenSellTiming}
                onOpenMortgageModal={handleOpenMortgage}
                onOpenJeonseSafetyModal={handleOpenJeonseSafety}
                onSelectComplex={handleSelectComplex}
                onSelectApt={(aptName, dong) => {
                  if (!aptName) return;
                  const resolvedDong = resolveAptDong(aptName, dong);
                  setSelectedTimelineApt(aptName);
                  if (onSelectApt) {
                    addRecentApartment({ name: aptName, dong: resolvedDong });
                  }
                  handleSelectApt(aptName, resolvedDong || dong);
                }}
                preloadApartmentTx={preloadApartmentTx}
              />
            </ErrorBoundary>
          </div>

          {/* Right 6 Columns (lg:col-span-6, or lg:col-span-12 when inline expanded): MacroTimelineView */}
          <div
            data-testid="hero-right-chart-col"
            className={
              isTimelineInlineExpanded
                ? 'lg:col-span-12 flex flex-col gap-6 min-w-0 box-border'
                : isSplitMode
                  ? 'flex flex-col gap-6 min-w-0 box-border'
                  : 'lg:col-span-6 flex flex-col gap-6 lg:h-[526px] min-w-0 lg:pl-6 xl:pl-8 box-border'
            }
          >
            <ErrorBoundary name="실거래 타임라인">
              <MacroTimelineView
                compactHeroMode={true}
                isInlineExpanded={isTimelineInlineExpanded}
                onToggleInlineExpand={setIsTimelineInlineExpanded}
                donutPeriod={donutPeriod}
                onDonutPeriodChange={handleDonutPeriodChange}
                displayedTimelineData={displayedTimelineData}
                fullTimelineData={filteredTimelineData}
                selectedTimelineApt={selectedTimelineApt}
                selectedApt={selectedTimelineApt}
                nameMapping={nameMapping}
                areaUnit={areaUnit}
                isMobileViewport={isMobileViewport}
                totalTimelineCardsCount={totalTimelineCardsCount}
                visibleTimelineCount={visibleTimelineCount}
                setVisibleTimelineCount={setVisibleTimelineCount}
                enableInfiniteScroll={false}
                periodFilter={periodFilter}
                setPeriodFilter={
                  isTimelineInlineExpanded
                    ? (p) =>
                        handleDonutPeriodChange(
                          p === '1d' || p === '7d' || p === '30d' || p === '90d' || p === '1y'
                            ? p
                            : '1y'
                        )
                    : undefined
                }
                selectedDateJump={selectedTimelineDateJump}
                onSelectedDateJumpChange={setSelectedTimelineDateJump}
                isLoading={isTimelinePeriodLoading}
                onCardHover={handleCardHover}
                onCardClick={handleCardClick}
                onSelectApt={handleCardClick}
                onDetailsClick={handleDetailsClick}
                onDetailsHover={handleDetailsHover}
                timelineDongFilter={timelineDongFilter}
                setTimelineDongFilter={setTimelineDongFilter}
                timelineAptFilter={timelineAptFilter}
                setTimelineAptFilter={setTimelineAptFilter}
                availableDongs={availableDongs}
                availableApts={availableApts}
                regionFilter={regionFilter}
                setRegionFilter={setRegionFilter}
                pyeongFilter={pyeongFilter}
                setPyeongFilter={setPyeongFilter}
                tradeTypeFilter={tradeTypeFilter}
                setTradeTypeFilter={setTradeTypeFilter}
                quickFilter={quickFilter}
                setQuickFilter={setQuickFilter}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                viewMode={viewMode}
                setViewMode={setViewMode}
                onResetFilters={handleResetAllFilters}
                showQuickFilters={false}
                pyeongRankings={unifiedStatsData.pyeongRankings}
                liveRankingBoardNode={liveRankingBoardNode}
                enableInFeedAd={true}
                userFavorites={userFavorites}
                onToggleFavorite={toggleFavorite}
                sheetApartments={sheetApartments}
                onSelectComplex={handleSelectComplex}
                onOpenJeonseSafety={handleOpenJeonseSafety}
                onOpenCompare={handleOpenCompare}
                renderTimelineItemCard={renderTimelineItemCardNode}
                renderTimelineItemRow={renderTimelineItemRowNode}
              />
            </ErrorBoundary>
          </div>
        </div>

        {/* Prime Hero-to-Timeline Zero-CLS In-Feed AdSlot 1 (Directly Below Donut & Timeline Hero) */}
        {process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true' && (
          <div className="w-full mb-6 empty:hidden" data-testid="hero-ad-slot-1">
            <AdSlot
              refreshSlotId="dashboard_hero_infeed_1"
              format="in-feed"
              cpaCampaignId="jeonse-sentinel"
              apartmentName={selectedTimelineApt || activeDonutSector?.repApt?.rawName || undefined}
              className="w-full"
            />
          </div>
        )}

        {/* ═══ Zone 3: 단지·매크로 시세 추이 그래프 ═══ */}
        <div className="w-full flex flex-col gap-5 pb-5 mb-6 border-b border-border box-border" data-testid="zone3-chart-section">
          <ChartErrorBoundary fallbackText="가격 동향 차트를 불러올 수 없습니다.">
            <MacroChartSection
              isDefaultAptSettingUp={isDefaultAptSettingUp}
              mounted={mounted}
              selectedTimelineApt={selectedTimelineApt}
              setSelectedTimelineApt={setSelectedTimelineApt}
              preloadApartmentModal={preloadApartmentModal}
              defaultTimelineApts={DEFAULT_TIMELINE_APTS}
              sheetApartments={sheetApartments}
              txSummaryData={txSummaryData}
              nameMapping={nameMapping}
              userFavorites={userFavorites}
              onToggleFavorite={toggleFavorite}
              onOpenMortgageModal={handleOpenMortgage}
              onSelectApt={handleChartHeaderSelectApt}
              onHoverApt={handleHoverApt}
              timeframe={timeframe}
              setTimeframe={setTimeframe}
              isGranularLoading={isGranularLoading}
              isSplitMode={isSplitMode}
              isAptTxLoading={isAptTxLoading}
              aptRealTxData={aptRealTxData}
              mainLineData={lineData}
              mainXTicks={xTicks}
              mainYTicks={yTicks}
              renderChart={renderChart}
            />
          </ChartErrorBoundary>
        </div>

        {/* ═══ Zone 4A: Zero-CLS Finance In-Feed AdSlot 2 (Immediately Below Timeline) ═══ */}
        {process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true' && (
          <div className="w-full my-6 empty:hidden" data-testid="finance-ad-slot-2">
            <AdSlot
              refreshSlotId="dashboard_finance_infeed_2"
              format="in-feed"
              cpaCampaignId="mortgage-refinance"
              apartmentName={financeBinding.aptName || undefined}
              className="w-full"
            />
          </div>
        )}

        {/* ═══ Zone 4B: 심층 비교 리포트 순환(Recirculation, 2x2 조회수 TOP 4) & 리텐션·커뮤니티 허브 ═══ */}
        <div className="w-full flex flex-col gap-3 mb-6">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-[15px] sm:text-[17px] font-black text-primary tracking-tight">
                심층 입지 · 단지 비교 리포트
              </h3>
              <p className="text-[11.5px] sm:text-[12px] text-tertiary font-medium mt-0.5">
                조회수 상위 인기 리포트 TOP 4 · 국토부 실거래 기반
              </p>
            </div>
            <Link
              href="/guide" prefetch={false}
              className="text-[11.5px] font-bold text-secondary hover:text-primary inline-flex items-center gap-1 transition-colors shrink-0 tabular-nums"
            >
              <span>전체 {GUIDE_ARTICLES.length}편 리포트</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          <div
            className={`grid grid-cols-1 ${isSplitMode ? '' : 'md:grid-cols-2'} gap-4 transition-all duration-300 ease-out`}
            data-testid="curated-guides-grid"
          >
            {topGuides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guide/${guide.slug}`} prefetch={false}
                data-testid={`guide-card-${guide.slug}`}
                onClick={() => {
                  trackEvent('guide_card_click', {
                    guide_slug: guide.slug,
                    guide_title: guide.title,
                  });
                }}
                className="bg-elevated hover:bg-[#eff1f5] dark:bg-[#151a23] dark:hover:bg-[#1e2532] rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-colors duration-150 group cursor-pointer"
              >
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#eff1f5] dark:bg-[#1e2532] text-secondary text-[10px] font-extrabold truncate">
                      {guide.category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10.5px] text-tertiary font-bold tabular-nums shrink-0">
                      <Clock size={11} />
                      {guide.readingTime}
                    </span>
                  </div>

                  <h4 className="text-[14px] sm:text-[14.5px] font-extrabold text-primary transition-colors line-clamp-2 leading-snug tracking-tight break-keep">
                    {guide.title}
                  </h4>

                  <p className="text-[12px] text-secondary/85 line-clamp-2 leading-relaxed break-keep">
                    {truncateToCopyBudget(guide.description, 'cardDescription')}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-border flex items-center justify-between text-secondary group-hover:text-primary transition-colors">
                  <span className="text-[11px] font-extrabold">심층 리포트 보기</span>
                  <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Lower 2x2 Bento Retention & Community Hub (7:5 Symmetric Grid) */}
        <div
          data-testid="zone4-retention-community-grid"
          className={`w-full ${
            isSplitMode ? 'grid grid-cols-1' : 'grid grid-cols-1 lg:grid-cols-12'
          } gap-4 lg:gap-5 items-stretch box-border transition-opacity duration-200 ease-out`}
        >
          {/* Row 1 Left (lg:col-span-7): TrafficNoticeBoard */}
          <div
            className={
              isSplitMode
                ? 'flex flex-col min-w-0'
                : 'lg:col-span-7 flex flex-col min-w-0'
            }
          >
            <ErrorBoundary name="철도·교통 게시판">
              <TrafficNoticeBoard
                railStrategyNotices={railStrategyNotices}
                tramNotices={tramNotices}
                className="h-full"
              />
            </ErrorBoundary>
          </div>

          {/* Row 1 Right (lg:col-span-5): RetentionActionCard */}
          <div
            className={
              isSplitMode
                ? 'flex flex-col min-w-0'
                : 'lg:col-span-5 flex flex-col min-w-0'
            }
          >
            <ErrorBoundary name="리텐션 액션 허브">
              <RetentionActionCard
                selectedAptName={selectedTimelineApt}
                className="h-full"
                onOpenPushModal={(apt) => {
                  setPushTargetApt(apt);
                  setIsPushModalOpen(true);
                }}
                onOpenA2HSModal={() => {
                  triggerCustomA2HSModal();
                }}
              />
            </ErrorBoundary>
          </div>

          {/* Row 2 Left (lg:col-span-7): Community Lounge */}
          <div
            className={
              isSplitMode
                ? 'flex flex-col min-w-0'
                : 'lg:col-span-7 flex flex-col min-w-0'
            }
          >
            <div
              data-testid="lounge-entry-card"
              className="w-full h-full bg-elevated rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3.5 relative overflow-hidden group transition-colors"
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap min-[400px]:flex-nowrap justify-between items-center border-b border-slate-200/70 dark:border-slate-800/80 pb-3 gap-2">
                  <h4 className="text-[14px] font-extrabold text-primary tracking-tight truncate min-w-0">
                    동탄 입주민 라운지
                  </h4>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-primary bg-[#eff1f5] dark:bg-[#1e2532] px-2 py-0.5 rounded-md shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse" />
                    실시간 토론 중
                  </span>
                </div>

                <p className="text-[12.5px] text-secondary leading-relaxed font-medium break-keep">
                  동탄1·2 단지별 실거주 후기 · 학군 · 급매 · 갈아타기 실전 정보 교류
                </p>

                <div className="flex flex-col gap-2 pt-0.5">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface text-[12px] text-tertiary">
                    <MessageSquare size={14} className="text-secondary shrink-0" />
                    <span className="font-semibold text-primary break-keep line-clamp-2 min-[360px]:line-clamp-none min-[360px]:truncate">“동탄역 대장단지 vs 1동탄 대형평수 실거주 비교”</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface text-[12px] text-tertiary">
                    <MessageSquare size={14} className="text-secondary shrink-0" />
                    <span className="font-semibold text-primary break-keep line-clamp-2 min-[360px]:line-clamp-none min-[360px]:truncate">“인동선 및 트램 착공 구간별 실질 수혜 단지 정리”</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800/80 flex flex-wrap min-[360px]:flex-nowrap items-center justify-between gap-2 shrink-0">
                <span className="text-[11px] text-tertiary font-medium break-keep">
                  D-VIEW 인증 입주민 & 실투자자 전용
                </span>
                <Link
                  href="/lounge" prefetch={false}
                  data-testid="lounge-link-btn"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-[12px] font-bold transition-all active:scale-95 cursor-pointer shrink-0 ml-auto"
                >
                  <span>라운지 입장하기</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>

          {/* Row 2 Right (lg:col-span-5): AptFitFinderCard */}
          <div
            className={
              isSplitMode
                ? 'flex flex-col min-w-0'
                : 'lg:col-span-5 flex flex-col min-w-0'
            }
          >
            <ErrorBoundary name="맞춤 단지 찾기 카드">
              <AptFitFinderCard
                className="h-full"
                onOpenAptFitFinder={handleOpenAptFitFinder}
              />
            </ErrorBoundary>
          </div>
        </div>
      </div>

      <ErrorBoundary name="맞춤 단지 찾기">
        <AptFitFinder
          sheetApartments={sheetApartments}
          txSummaryData={txSummaryData}
          nameMapping={nameMapping || EMPTY_OBJECT}
          publicRentalSet={publicRentalSet}
          fieldReportsMap={fieldReportsMap}
          onSelectApt={(aptName, dong) => handleNavigateDetailPage(aptName, dong, 'apt_fit_finder')}
          isOpen={isQuizOpen}
          onClose={handleCloseQuiz}
          locationScores={locationScores || EMPTY_OBJECT}
        />
      </ErrorBoundary>

      {/* Push Subscription Modal */}
      {isPushModalOpen && (
        <PushSubscriptionModal
          isOpen={isPushModalOpen}
          onClose={() => setIsPushModalOpen(false)}
          aptName={pushTargetApt || selectedTimelineApt || '동탄 전체'}
        />
      )}
    </div>
  );
});

export default MacroDashboardClient;
