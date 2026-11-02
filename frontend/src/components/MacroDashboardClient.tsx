import React, { useMemo, useState, useDeferredValue, useEffect, useCallback } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { safeReload } from "@/lib/utils/safeReload";
import { logger } from "@/lib/services/logger";
import { preloadApartmentModal } from "@/components/common/ComponentPreloader";
import type { DongApartment } from "@/lib/dong-apartments";
import type { AptTxSummary, DongtanMacroTrendPoint, FieldReportData } from "@/types";
import { normalizeAptName, sanitizeAptKey, findTxKey, findTypeMapEntry, getDisplayAptName, isSameApartment, HARDCODED_MAPPING, resolveCanonicalAptSlug } from "@/lib/utils/apartmentMapping";
import { matchesApartmentSearch } from "@/lib/utils/apartmentSearch";
import { addRecentApartment } from "@/lib/utils/recentApartments";
import { aggregateStats, resolveSummaryEntry } from "@/lib/analytics/statsEngine";
import type { RegionFilter, PyeongFilter, TimeframeFilter, SortOption, RawTransactionRecord } from "@/types/stats";
import { useSettingsValues } from "@/contexts/SettingsContext";
import { useAuth } from "@/hooks/useAuth";
import { useLocationScores, usePeriodTransactions } from "@/hooks/useStaticData";
import { BUILD_VERSION } from "@/lib/build-version";
import { buildApartmentMacroChartData, filterChartTimeframe, type FormattedMacroPoint } from "@/lib/utils/macroChartTransform";

import { useMacroFilters, DONGTAN1_DONGS, DONGTAN2_DONGS, LANDMARK_APTS } from "./macro/hooks/useMacroFilters";
import { MacroHeader } from "./macro/components/MacroHeader";
import { MacroTimelineView } from "./macro/components/MacroTimelineView";
import { MacroChartSection } from "./macro/components/MacroChartSection";
import { MacroMobileDrawer } from "./macro/components/MacroMobileDrawer";
import { RetentionActionCard } from "./macro/components/RetentionActionCard";
import { AptDonutSection, type AptDonutDataItem } from "./macro/AptDonutSection";
import { AptMetricCards } from "./macro/AptMetricCards";
import { RealtimeRankingBoard } from "@/components/ranking/RealtimeRankingBoard";
import { HyperlocalInsightCards } from "@/components/stats/HyperlocalInsightCards";
import { usePWA } from "@/components/pwa/PWAProvider";
import { trackEvent, trackApartmentView, trackSearchQuery } from '@/lib/utils/analytics';
import { useDebounce } from '@/hooks/useDebounce';
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import ChartErrorBoundary from "@/components/common/ChartErrorBoundary";
import { HighCpcFinanceSection } from "@/components/finance/HighCpcFinanceSection";
import { AdSlot } from "@/components/ads/AdSlot";
import Link from "next/link";
import { Star, MessageSquare, Clock, ArrowRight } from "lucide-react";
import { useFavorites, isApartmentInFavorites } from "@/hooks/useFavorites";
import { TrafficNoticeBoard, type LocalNoticeItem } from "./macro/TrafficNoticeBoard";
import { GUIDE_ARTICLES } from "@/lib/data/guides";



const InlineLoader = ({ text }: { text: string }) => (
  <div className="w-full h-[330px] min-h-[330px] flex flex-col items-center justify-center bg-surface/50 dark:bg-surface/50 border border-border/50 rounded-2xl p-6 gap-3 backdrop-blur-md">
    <div className="relative w-10 h-10 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full border-2 border-toss-blue/20 border-t-toss-blue animate-spin" />
      <svg className="w-4 h-4 text-toss-blue animate-pulse" viewBox="0 0 24 24" fill="currentColor">
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
    <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center bg-slate-50/30 dark:bg-slate-900/10 border border-border/30 rounded-2xl animate-pulse relative overflow-hidden">
      <div className="absolute w-[180px] h-[180px] rounded-full bg-blue-50/60 blur-[60px] top-1/2 left-1/3 -translate-y-1/2 pointer-events-none" />
      <div className="absolute w-[180px] h-[180px] rounded-full bg-emerald-500/5 blur-[60px] top-1/2 right-1/3 -translate-y-1/2 pointer-events-none" />
      <div className="flex items-center gap-1.5 mb-3.5 flex-none">
        <div className="w-1.5 h-6 bg-blue-600/30 rounded-full animate-bounce duration-500 delay-100" />
        <div className="w-1.5 h-10 bg-blue-600/40 rounded-full animate-bounce duration-500 delay-200" />
        <div className="w-1.5 h-14 bg-blue-600/60 rounded-full animate-bounce duration-500 delay-300" />
        <div className="w-1.5 h-10 bg-emerald-500/50 rounded-full animate-bounce duration-500 delay-400" />
        <div className="w-1.5 h-12 bg-emerald-500/60 rounded-full animate-bounce duration-500 delay-500" />
        <div className="w-1.5 h-8 bg-emerald-500/40 rounded-full animate-bounce duration-500 delay-600" />
      </div>
      <span className="text-secondary text-[12.5px] font-extrabold mb-1.5 tracking-tight">관심 단지 정보를 분석하고 있습니다...</span>
      <span className="text-[10px] text-tertiary font-bold opacity-75">내 자산 가치에 맞춘 전용 리포트를 생성하는 중입니다.</span>
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
  onOpenCompare?: (aptName?: string) => void;
  onOpenJeonseSafety?: (aptName?: string) => void;
  onOpenMortgage?: (aptName?: string) => void;
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

  return (
    <div
      onMouseEnter={() => onCardHover(item.aptName, item.dong)}
      className={`relative flex items-center justify-between gap-2 sm:gap-2.5 p-3 xs:p-3.5 sm:px-4 sm:py-2.5 rounded-2xl transition-[background-color,transform] duration-150 ease-out w-full max-w-full box-border ${
        isSelected
          ? "ring-2 ring-blue-600/30 bg-blue-50/70 dark:bg-blue-950/30"
          : "bg-elevated hover:bg-slate-100/90 dark:hover:bg-slate-800/80"
      } group`}
    >
      {/* Clickable Card Body Button (stretched overlay covers full card; single horizontal row on wide view) */}
      <button
        type="button"
        onClick={() => onCardClick(item.aptName)}
        aria-label={`실거래 분석 아파트 선택: ${item.aptName}, 위치: ${item.dong}, 가격: ${item.priceEok}`}
        className="flex-1 flex items-center justify-between gap-2 sm:gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded-lg p-0 bg-transparent border-none min-w-0 cursor-pointer after:content-[''] after:absolute after:inset-0 after:rounded-2xl"
      >
        {/* Left: Apartment Full Name + Metadata (stacked on mobile, single row on sm+) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 min-w-0 flex-1 overflow-hidden">
          <span
            className="text-xs xs:text-[13px] sm:text-sm font-extrabold text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight truncate break-keep min-w-0 sm:max-w-[180px] xl:max-w-[230px] shrink-0"
            title={item.displayAptName || item.aptName}
          >
            {item.displayAptName || item.aptName}
          </span>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-x-1 gap-y-0.5 min-w-0 flex-1 text-[9.5px] xs:text-[10px] sm:text-[11px] text-tertiary font-bold tracking-tight tabular-nums overflow-hidden">
            {item.type === 'high' && (
              <span className="text-[8px] xs:text-[9px] sm:text-[9.5px] font-black px-1.5 py-0.5 mr-0.5 rounded bg-red-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.4)] shrink-0 whitespace-nowrap animate-pulse tracking-wider">
                신고가
              </span>
            )}
            <span className="shrink-0 font-extrabold text-secondary max-w-[110px] sm:max-w-[140px] truncate min-w-0" title={item.dong}>
              {item.dong}
            </span>
            <span className="opacity-35 font-normal shrink-0">·</span>
            <span className="shrink-0 whitespace-nowrap">
              {areaUnit === 'm2'
                ? (item.areaLabelM2 || `${Math.round(item.area)}㎡`)
                : (item.areaLabelPyeong || `${Math.round(item.areaPyeong)}평`)}
            </span>
            <span className="opacity-35 font-normal shrink-0">·</span>
            <span className="shrink-0 whitespace-nowrap">{item.floor}층</span>
            {item.contractDate && (
              <span className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                <span className="opacity-35 font-normal">·</span>
                <span className="text-secondary font-medium">
                  계약일 {item.contractDate.length >= 8 ? `${item.contractDate.slice(4, 6)}.${item.contractDate.slice(6, 8)}` : item.contractDate}
                </span>
              </span>
            )}
            {pyeongPriceMan > 0 && (
              <span className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                <span className="opacity-35 font-normal">·</span>
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  평당 {pyeongPriceMan.toLocaleString()}만
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Right of Button: Price & Delta Badges (stacked on mobile, inline single row on sm+) */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center justify-center sm:justify-end gap-0.5 sm:gap-2 shrink-0 ml-1 sm:ml-2 min-w-0 tabular-nums">
          <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
            {item.delta !== 0 && item.prevPriceVal && item.prevPriceVal > 0 && (
              <>
                <span className="text-[10px] sm:text-[11px] text-tertiary font-bold line-through opacity-50 hidden sm:inline">
                  {formatEokWithUnit(item.prevPriceVal * 10000).value}
                </span>
                <span className="text-[10px] text-tertiary opacity-45 hidden sm:inline">→</span>
              </>
            )}
            <span
              className={`text-[12.5px] xs:text-[13px] sm:text-[14.5px] font-black tracking-tight leading-none whitespace-nowrap ${
                isRising
                  ? "text-red-500 dark:text-red-400"
                  : isFalling
                    ? "text-slate-500 dark:text-slate-400"
                    : "text-primary"
              }`}
            >
              <span className="inline sm:hidden">
                {item.priceEok
                  ? item.priceEok.replace(/억\s*([0-9,]+)만?/, (_, m) => {
                      const num = parseInt(m.replace(/,/g, ''), 10);
                      if (!num || num <= 0) return '억';
                      const dec = (num / 10000).toFixed(2).substring(1).replace(/\.?0+$/, '');
                      return `${dec}억`;
                    })
                  : item.priceEok}
              </span>
              <span className="hidden sm:inline">{item.priceEok}</span>
            </span>
          </div>

          <span
            className={`text-[9px] sm:text-[9.5px] font-black px-1 sm:px-1.5 py-0.5 rounded-md shrink-0 whitespace-nowrap leading-none ${
              isRising
                ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                : isFalling
                  ? "bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            <span className="inline sm:hidden">
              {isRising
                ? `+ ${formatDeltaPrice(item.delta).replace(/억\s*([0-9,]+)만?/, (_match: string, m: string) => {
                    const num = parseInt(m.replace(/,/g, ''), 10);
                    if (!num || num <= 0) return '억';
                    const dec = (num / 10000).toFixed(2).substring(1).replace(/\.?0+$/, '');
                    return `${dec}억`;
                  })}`
                : isFalling
                  ? `- ${formatDeltaPrice(Math.abs(item.delta)).replace(/억\s*([0-9,]+)만?/, (_match: string, m: string) => {
                      const num = parseInt(m.replace(/,/g, ''), 10);
                      if (!num || num <= 0) return '억';
                      const dec = (num / 10000).toFixed(2).substring(1).replace(/\.?0+$/, '');
                      return `${dec}억`;
                    })}`
                  : "보합"}
            </span>
            <span className="hidden sm:inline">
              {isRising
                ? `+ ${formatDeltaPrice(item.delta)}${formatDeltaPercent(item.deltaPercent)}`
                : isFalling
                  ? `- ${formatDeltaPrice(Math.abs(item.delta))}${formatDeltaPercent(item.deltaPercent)}`
                  : "보합"}
            </span>
          </span>
        </div>
      </button>

      {/* Far-Right Actions: Favorite Star + Detail Action Button (z-10 above stretched card button) */}
      <div className="relative z-10 flex items-center justify-center gap-1 shrink-0">
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
                source: 'timeline',
              });
              onToggleFavorite(item.aptName);
            }}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-tertiary transition-colors cursor-pointer"
          >
            <Star
              size={13}
              className={
                isFavorite
                  ? 'fill-blue-500 text-blue-600'
                  : 'text-tertiary hover:text-blue-500'
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
          className="px-2.5 py-1 min-h-[26px] rounded-xl bg-surface hover:bg-blue-50 dark:hover:bg-blue-950/40 text-[10px] sm:text-[10.5px] font-extrabold text-secondary hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-150 ease-out active:scale-95 cursor-pointer shrink-0 outline-none focus:ring-2 focus:ring-blue-500/50 whitespace-nowrap"
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

  return (
    <div
      data-testid={`timeline-row-${item.aptName}`}
      onMouseEnter={() => onCardHover?.(item.aptName, item.dong)}
      className={`px-3.5 py-3 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer border-b border-border/40 last:border-b-0 ${
        isSelected ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
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
            <span className="text-[12px] sm:text-[13px] font-extrabold text-primary truncate max-w-[180px] sm:max-w-[280px]">
              {displayName}
            </span>
            {item.type === 'high' && (
              <span className="px-1.5 py-0.2 rounded bg-red-500 text-white text-[8.5px] sm:text-[9px] font-black shrink-0 tracking-wider">
                신고가
              </span>
            )}
          </div>
          <span className="text-[10px] text-tertiary font-medium">
            {item.dong} · {item.floor}층 · {areaUnit === 'm2' ? (item.areaLabelM2 || `${Math.round(item.area)}㎡`) : (item.areaLabelPyeong || `${Math.round(item.areaPyeong)}평`)}
            {item.contractDate && (
              <span className="text-secondary font-medium">
                {' '}· 계약일 {item.contractDate.length >= 8 ? `${item.contractDate.slice(4, 6)}.${item.contractDate.slice(6, 8)}` : item.contractDate}
              </span>
            )}
            {pyeongPriceMan > 0 && <span className="hidden sm:inline"> · 평당 {pyeongPriceMan.toLocaleString()}만</span>}
          </span>
        </button>
      </div>

      {/* Right: Price, Delta, and Details Button */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <div className="text-right flex flex-col items-end justify-center">
          <div className="text-[12.5px] sm:text-[13.5px] font-black text-primary leading-tight">
            {item.priceEok}
          </div>
          {item.delta !== undefined && item.delta !== 0 ? (
            <div
              className={`text-[9.5px] font-extrabold flex items-center gap-0.5 ${
                isRising ? 'text-red-500' : isFalling ? 'text-blue-500' : 'text-slate-400'
              }`}
            >
              {isRising ? '+' : '-'} {formatDeltaPrice(Math.abs(item.delta))}
              {formatDeltaPercent(item.deltaPercent)}
            </div>
          ) : (
            <div className="text-[9.5px] font-bold text-slate-400">보합</div>
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
                source: 'timeline',
              });
              onToggleFavorite(item.aptName);
            }}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-tertiary transition-colors cursor-pointer"
          >
            <Star
              size={12}
              className={
                isFavorite
                  ? 'fill-blue-500 text-blue-600'
                  : 'text-tertiary hover:text-blue-500'
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
          className="px-2 py-1 rounded-lg bg-surface hover:bg-slate-50 dark:hover:bg-slate-800 border border-border hover:border-slate-300 dark:hover:border-slate-700 text-[10px] sm:text-[10.5px] font-extrabold text-secondary hover:text-primary transition-all cursor-pointer shadow-xs"
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
  onOpenCompare: _onOpenCompare,
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
    localNotices.forEach((item) => {
      const t = (item.title || '') + (item.dept || '');
      if (t.includes('트램') || item.source === 'culture') {
        tram.push(item);
      } else {
        rail.push(item);
      }
    });
    return { railStrategyNotices: rail, tramNotices: tram };
  }, [localNotices]);

  // Zone 4: Top 3 Curated Comparison Guides
  const topGuides = useMemo(() => {
    return GUIDE_ARTICLES.slice(0, 3);
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

  const { transactions: timelinePeriodTransactions, isLoading: isTimelinePeriodLoading } = usePeriodTransactions(
    periodFilter,
    recentTransactions,
    { chunked: true }
  );

  const { locationScores } = useLocationScores(initialLocationScores);

  const { triggerCustomA2HSModal } = usePWA();
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [pushTargetApt, setPushTargetApt] = useState<string>('');
  const [activeDonutCategory, setActiveDonutCategory] = useState<string | null>(null);
  const [activeDonutSector, setActiveDonutSector] = useState<AptDonutDataItem | null>(null);
  const [selectedTimelineDateJump, setSelectedTimelineDateJump] = useState<string | null>(null);

  const donutPeriod: '7d' | '30d' | '90d' | '1y' =
    periodFilter === '7d' || periodFilter === '30d' || periodFilter === '90d' || periodFilter === '1y'
      ? periodFilter
      : '90d';

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
    if (isBottomSheetOpen || isQuizOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isBottomSheetOpen, isQuizOpen]);

  const [selectedTimelineApt, setSelectedTimelineApt] = useState<string | null>("동탄역 롯데캐슬");
  const [hasSetDefaultApt, setHasSetDefaultApt] = useState(false);

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
    setSelectedTimelineApt(aptName);
    const resolvedDong = aptName ? resolveAptDong(aptName) : '';
    if (aptName) {
      addRecentApartment({ name: aptName, dong: resolvedDong });
    }
    const isMob = typeof window !== 'undefined' && window.innerWidth < 1024;
    if (aptName) {
      const cardViewPayload = {
        apartment_name: aptName,
        apt_name: aptName,
        dong: resolvedDong || undefined,
        surface: isMob ? 'dashboard_mobile_drawer' : 'dashboard_timeline_preview',
        view_type: (isMob ? 'mobile_drawer' : 'chart_preview') as 'mobile_drawer' | 'chart_preview',
      };
      if (typeof trackApartmentView === 'function') {
        trackApartmentView(cardViewPayload);
      } else {
        trackEvent('apartment_view', cardViewPayload);
      }
    }
    if (isMob) {
      setIsBottomSheetOpen(true);
    }
  }, [setSelectedTimelineApt, setIsBottomSheetOpen, resolveAptDong]);

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

  const scrollToHighCpcFinanceSection = useCallback(() => {
    if (typeof document !== 'undefined') {
      const financeEl = document.querySelector('[data-testid="high-cpc-finance-section"]');
      if (financeEl && typeof financeEl.scrollIntoView === 'function') {
        financeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, []);

  const debouncedTimelineSearch = useDebounce(searchQuery, 1000);

  useEffect(() => {
    const query = debouncedTimelineSearch.trim();
    if (mounted && query) {
      trackEvent('search_apartment', { query, surface: 'dashboard_timeline' });
      const searchPayload = {
        search_term: query,
        query,
        surface: 'dashboard_timeline',
      };
      if (typeof trackSearchQuery === 'function') {
        trackSearchQuery(searchPayload);
      } else {
        trackEvent('search_query', searchPayload);
      }
    }
  }, [debouncedTimelineSearch, mounted]);

  const handleOpenCompare = useCallback((aptName?: string) => {
    trackEvent('open_calculator', {
      calculator_type: 'compare',
      apt_name: typeof aptName === 'string' ? aptName : undefined,
      surface: 'dashboard',
    });
    if (_onOpenCompare) {
      _onOpenCompare(aptName);
    } else {
      scrollToHighCpcFinanceSection();
    }
  }, [_onOpenCompare, scrollToHighCpcFinanceSection]);

  const handleOpenJeonseSafety = useCallback((aptName?: string) => {
    trackEvent('open_calculator', { calculator_type: 'jeonse_safety', apt_name: typeof aptName === 'string' ? aptName : undefined, surface: 'dashboard' });
    if (onOpenJeonseSafety) {
      onOpenJeonseSafety(aptName);
    } else {
      scrollToHighCpcFinanceSection();
    }
  }, [onOpenJeonseSafety, scrollToHighCpcFinanceSection]);

  const handleOpenMortgage = useCallback((aptName?: string) => {
    trackEvent('open_calculator', { calculator_type: 'mortgage', apt_name: typeof aptName === 'string' ? aptName : undefined, surface: 'dashboard' });
    if (onOpenMortgage) {
      onOpenMortgage(aptName);
    } else {
      scrollToHighCpcFinanceSection();
    }
  }, [onOpenMortgage, scrollToHighCpcFinanceSection]);

  const handleOpenSellTiming = useCallback((aptName?: string) => {
    trackEvent('open_calculator', { calculator_type: 'sell_timing', apt_name: typeof aptName === 'string' ? aptName : undefined, surface: 'dashboard' });
    if (onOpenSellTimingCalculator) {
      onOpenSellTimingCalculator(aptName);
    } else if (_onOpenTaxCalculator) {
      _onOpenTaxCalculator(aptName);
    } else {
      scrollToHighCpcFinanceSection();
    }
  }, [onOpenSellTimingCalculator, _onOpenTaxCalculator, scrollToHighCpcFinanceSection]);

  const handleOpenTaxCalculator = useCallback((aptName?: string) => {
    trackEvent('open_calculator', { calculator_type: 'property_tax', apt_name: typeof aptName === 'string' ? aptName : undefined, surface: 'dashboard' });
    if (_onOpenTaxCalculator) {
      _onOpenTaxCalculator(aptName);
    } else if (onOpenSellTimingCalculator) {
      onOpenSellTimingCalculator(aptName);
    } else {
      scrollToHighCpcFinanceSection();
    }
  }, [_onOpenTaxCalculator, onOpenSellTimingCalculator, scrollToHighCpcFinanceSection]);

  const handleSelectApt = useCallback((name: string, dong?: string) => {
    onSelectApt?.(name, dong);
  }, [onSelectApt]);

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

  // Set default apartment
  useEffect(() => {
    if (!mounted) return;
    if (hasSetDefaultApt) return;

    if (!selectedTimelineApt) {
      setSelectedTimelineApt("동탄역 롯데캐슬");
    }
    setHasSetDefaultApt(true);
  }, [mounted, hasSetDefaultApt, selectedTimelineApt]);

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

  const selectedAptSummary = useMemo(() => {
    if (!selectedTimelineApt || !txSummaryData) return null;
    const summaryMap = (txSummaryData as { summary?: Record<string, AptTxSummary> })?.summary || txSummaryData;
    const resolvedTxKey = findTxKey(selectedTimelineApt, summaryMap, nameMapping) || selectedTimelineApt;
    if (summaryMap[resolvedTxKey]) return summaryMap[resolvedTxKey];
    const normKey = normalizeAptName(resolvedTxKey);
    if (summaryMap[normKey]) return summaryMap[normKey];
    const matchedKey = Object.keys(summaryMap).find(k => normalizeAptName(k) === normKey);
    return matchedKey ? summaryMap[matchedKey] : null;
  }, [selectedTimelineApt, txSummaryData, nameMapping]);

  const selectedAptChartData = useMemo(() => {
    if (!selectedTimelineApt) return null;
    if (!aptRealTxData || !Array.isArray(aptRealTxData) || aptRealTxData.length === 0) {
      return [];
    }
    return buildApartmentMacroChartData(aptRealTxData, deferredMacroTrendData);
  }, [selectedTimelineApt, aptRealTxData, deferredMacroTrendData]);

  const lineData = useMemo(() => {
    const sourceData: (DongtanMacroTrendPoint | FormattedMacroPoint)[] = selectedTimelineApt
      ? (selectedAptChartData || [])
      : (deferredMacroTrendData || []);
    return filterChartTimeframe<DongtanMacroTrendPoint | FormattedMacroPoint>(sourceData, timeframe);
  }, [selectedTimelineApt, selectedAptChartData, deferredMacroTrendData, timeframe]);

  const xTicks = useMemo(() => {
    if (!lineData || lineData.length === 0) return [];
    if (lineData.length <= 6) return lineData.map((d) => d.name);
    const step = Math.ceil(lineData.length / 6);
    const ticks: string[] = [];
    for (let i = 0; i < lineData.length; i += step) {
      ticks.push(lineData[i].name);
    }
    if (ticks[ticks.length - 1] !== lineData[lineData.length - 1].name) {
      ticks.push(lineData[lineData.length - 1].name);
    }
    return ticks;
  }, [lineData]);

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
        const sortedItems = [...group.items].sort((a, b) => {
          const dateDiff = (b.contractDate || '').localeCompare(a.contractDate || '');
          if (dateDiff !== 0) return dateDiff;
          return b.priceVal - a.priceVal;
        });
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
          // 'latest' or default: keep contractDate desc then priceVal desc
          const dateDiff = (b.contractDate || '').localeCompare(a.contractDate || '');
          if (dateDiff !== 0) return dateDiff;
          return b.priceVal - a.priceVal;
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
      periodFilter === '1y' && timelinePeriodTransactions && timelinePeriodTransactions.length > 0
        ? timelinePeriodTransactions
        : recentTransactions && recentTransactions.length > 0
          ? recentTransactions
          : timelinePeriodTransactions || [];

    let baseSource = rawBase;
    if ((periodFilter === '7d' || periodFilter === '30d') && rawBase.length > 0) {
      const days = periodFilter === '7d' ? 7 : 30;
      let maxDateStr = '';
      for (let i = 0; i < rawBase.length; i++) {
        const cd = String(rawBase[i]?.registeredDate || rawBase[i]?.contractDate || rawBase[i]?.date || '');
        const clean = cd.replace(/[^0-9]/g, '').slice(0, 8);
        if (clean > maxDateStr) maxDateStr = clean;
      }
      if (maxDateStr.length === 8) {
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

    if (!selectedTimelineDateJump) {
      return baseSource;
    }
    const targetDigits = selectedTimelineDateJump.replace(/[^0-9]/g, '').slice(0, 8);
    if (targetDigits.length === 8) {
      return baseSource.filter((tx) => {
        const raw = String(tx?.registeredDate || tx?.contractDate || tx?.date || '');
        const clean = raw.replace(/[^0-9]/g, '').slice(0, 8);
        return clean === targetDigits || tx?.registeredDateLabel === selectedTimelineDateJump;
      });
    }
    const matchedGroup = dailyTimelineData.find(
      (g) => (g.dateStr || g.dateKey) === selectedTimelineDateJump
    );
    return matchedGroup ? (matchedGroup.items as unknown as RecentTransaction[]) : baseSource;
  }, [periodFilter, timelinePeriodTransactions, recentTransactions, selectedTimelineDateJump, dailyTimelineData]);

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
    if (periodFilter === '7d' || periodFilter === '30d') mappedTimeframe = '1M';
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
    const dongVal = summary?.dong;
    handleCardClick(aptName);
    handleSelectApt(aptName, dongVal);
  }, [txSummaryData, handleCardClick, handleSelectApt]);

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
      />
    );
  }, [trendChartReady, lineData, xTicks, yTicks, timeframe]);

  const renderBottomSheetChart = useCallback(() => (
    <MacroTrendChart
      key={selectedTimelineApt || 'all'}
      lineData={lineData}
      xTicks={xTicks}
      yTicks={yTicks}
      timeframe={timeframe}
      isBottomSheet={true}
    />
  ), [selectedTimelineApt, lineData, xTicks, yTicks, timeframe]);

  const handleHoverApt = useCallback((aptName: string) => {
    if (!sheetApartments) return;
    const allApts = Object.values(sheetApartments).flat();
    const aptObj = allApts.find(a => a.name === aptName || normalizeAptName(a.name) === normalizeAptName(aptName));
    const dong = aptObj?.dong || '';
    preloadApartmentTx?.(aptName, dong);
    preloadApartmentModal();
  }, [sheetApartments, preloadApartmentTx]);

  return (
    <div className="w-full flex flex-col bg-transparent relative min-h-[85vh] min-h-[800px] min-w-0 max-w-full" style={{ contain: 'layout paint', containIntrinsicSize: '800px' }}>
      <MacroHeader macroTrendJsonLd={macroTrendJsonLd} />

      <div className="flex flex-col px-4 sm:px-6 md:px-10 lg:px-16 pt-3 md:pt-5 pb-6 md:pb-8 lg:pb-10 w-auto max-w-full overflow-x-clip min-w-0 min-h-[85vh] min-h-[800px] box-border">
        {/* ═══ Zone 2A: 메인 히어로 (좌측 원형 도넛 네비게이터 + 연동 4칸 카드 | 우측 단지·매크로 시세 추이) ═══ */}
        <div
          data-testid="hero-donut-trend-grid"
          className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-0 pb-5 mb-4 border-b border-border items-stretch box-border"
        >
          {/* Left 6 Columns (lg:col-span-6, 시그니처 도넛 차트 자리): Circular Donut Navigator + Connected 4-Card Drilldown */}
          <div
            data-testid="hero-left-donut-col"
            className="lg:col-span-6 flex flex-col gap-3.5 lg:h-[526px] min-w-0 justify-between box-border pb-5 border-b border-border lg:pb-0 lg:border-b-0 lg:pr-6 xl:pr-8 lg:border-r lg:border-border"
          >
            <ChartErrorBoundary fallbackText="실거래 체결 온도 차트를 불러올 수 없습니다.">
              <AptDonutSection
                variant="navigator"
                initialMode="energy"
                initialPeriod="90d"
                period={donutPeriod}
                onPeriodChange={setPeriodFilter}
                mounted={mounted}
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
                onResetSector={() => handleDonutCategoryChange(null)}
                onOpenSellTimingCalculator={handleOpenSellTiming}
                onOpenMortgageModal={handleOpenMortgage}
                onOpenJeonseSafetyModal={handleOpenJeonseSafety}
                onSelectApt={(aptName) => {
                  setSelectedTimelineApt(aptName);
                  handleCardClick(aptName);
                }}
                preloadApartmentTx={preloadApartmentTx}
              />
            </ErrorBoundary>
          </div>

          {/* Right 6 Columns (lg:col-span-6): MacroTimelineView (통합 실거래 타임라인 + 실시간 시장 랭킹 탭) */}
          <div
            data-testid="hero-right-chart-col"
            className="lg:col-span-6 flex flex-col gap-6 lg:h-[526px] min-w-0 lg:pl-6 xl:pl-8 box-border"
          >
            <ErrorBoundary name="실거래 타임라인">
              <MacroTimelineView
                compactHeroMode={true}
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
                setPeriodFilter={setPeriodFilter}
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
        <div className="w-full mb-6" data-testid="hero-ad-slot-1">
          <AdSlot
            refreshSlotId="dashboard_hero_infeed_1"
            format="in-feed"
            cpaCampaignId="jeonse-sentinel"
            apartmentName={selectedTimelineApt || activeDonutSector?.repApt?.rawName || undefined}
            className="w-full"
          />
        </div>

        {/* ═══ Zone 3: 하이퍼로컬 핵심 실거래 인사이트 + 단지·매크로 시세 추이 그래프 ═══ */}
        <div className="w-full flex flex-col gap-5 pb-5 mb-6 border-b border-border box-border" data-testid="zone3-chart-section">
          {unifiedStatsData.insights && (
            <ErrorBoundary name="핵심 실거래 인사이트">
              <HyperlocalInsightCards
                insights={unifiedStatsData.insights}
                onSelectComplex={handleSelectComplex}
                onOpenJeonseSafety={handleOpenJeonseSafety}
                onOpenCompare={handleOpenCompare}
                className="mb-0"
              />
            </ErrorBoundary>
          )}
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
              isAptTxLoading={isAptTxLoading}
              aptRealTxData={aptRealTxData}
              mainLineData={lineData}
              mainXTicks={xTicks}
              mainYTicks={yTicks}
              renderChart={renderChart}
            />
          </ChartErrorBoundary>
        </div>

        {/* ═══ Zone 4A: AdSense High-CPC Finance Hub & Zero-CLS AdSlot 2 (Immediately Below Timeline) ═══ */}
        <ErrorBoundary name="정책자금 및 전세안전진단">
          <HighCpcFinanceSection
            onOpenMortgageModal={handleOpenMortgage}
            onOpenMortgage={handleOpenMortgage}
            onOpenJeonseSafetyModal={handleOpenJeonseSafety}
            onOpenJeonseSafety={handleOpenJeonseSafety}
            onOpenTaxCalculator={handleOpenTaxCalculator}
            onOpenSellTiming={handleOpenSellTiming}
            apartmentName={financeBinding.aptName}
            defaultPriceWon={financeBinding.priceWon}
          />
        </ErrorBoundary>

        <div className="w-full my-6" data-testid="finance-ad-slot-2">
          <AdSlot
            refreshSlotId="dashboard_finance_infeed_2"
            format="in-feed"
            cpaCampaignId="mortgage-refinance"
            apartmentName={financeBinding.aptName || undefined}
            className="w-full"
          />
        </div>

        {/* ═══ Zone 4B: 심층 비교 리포트 순환(Recirculation) & 7:5 리텐션·커뮤니티 허브 ═══ */}
        <div className="w-full flex flex-col gap-3 mb-6">
          <div className="flex items-center justify-between px-1">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] sm:text-[17px] font-black text-primary tracking-tight">
                  동탄 신도시 심층 입지·단지 비교 리포트
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold border border-blue-200/60 dark:border-blue-800/50">
                  D-VIEW LABS
                </span>
              </div>
              <p className="text-[11.5px] sm:text-[12px] text-tertiary font-medium mt-0.5">
                실거래가 통계와 도시계획 데이터를 바탕으로 검증한 추천 비교 분석 리포트
              </p>
            </div>
            <Link
              href="/guide"
              className="text-[11.5px] font-bold text-secondary hover:text-primary inline-flex items-center gap-1 transition-colors shrink-0"
            >
              <span>전체 리포트</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="curated-guides-grid">
            {topGuides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guide/${guide.slug}`}
                data-testid={`guide-card-${guide.slug}`}
                onClick={() => {
                  trackEvent('guide_card_click', {
                    guide_slug: guide.slug,
                    guide_title: guide.title,
                  });
                }}
                className="bg-elevated hover:bg-slate-100/80 dark:hover:bg-slate-800/60 rounded-2xl p-4 sm:p-5 flex flex-col justify-between border border-border/50 transition-all duration-150 group shadow-2xs cursor-pointer"
              >
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold truncate">
                      {guide.category}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-tertiary font-bold tabular-nums">
                      <Clock size={11} />
                      {guide.readingTime}
                    </span>
                  </div>

                  <h4 className="text-[13.5px] font-extrabold text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug tracking-tight">
                    {guide.title}
                  </h4>

                  <p className="text-[11.5px] text-secondary/80 line-clamp-2 leading-relaxed">
                    {guide.description}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-border/30 flex items-center justify-between text-secondary group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  <span className="text-[11px] font-extrabold">심층 리포트 보기</span>
                  <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Lower 7:5 Asymmetric Retention & Community Hub */}
        <div
          data-testid="zone4-retention-community-grid"
          className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch box-border"
        >
          {/* Left 7 Columns (lg:col-span-7): TrafficNoticeBoard + Community Lounge */}
          <div className="lg:col-span-7 flex flex-col gap-4 min-w-0">
            <ErrorBoundary name="철도·교통 게시판">
              <TrafficNoticeBoard
                railStrategyNotices={railStrategyNotices}
                tramNotices={tramNotices}
              />
            </ErrorBoundary>

            <div
              data-testid="lounge-entry-card"
              className="w-full bg-elevated rounded-2xl p-4 sm:p-5 flex flex-col justify-between border border-border/50 relative overflow-hidden shadow-2xs group"
            >
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-border/40 pb-3">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="bg-blue-600/10 dark:bg-blue-600/25 text-blue-700 dark:text-blue-400 font-extrabold text-[10.5px] px-2.5 py-0.5 rounded-[8px] shrink-0">
                      입주민 커뮤니티
                    </span>
                    <h4 className="text-[14px] font-extrabold text-primary tracking-tight truncate">
                      동탄 실시간 입주민 라운지
                    </h4>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    실시간 토론 중
                  </span>
                </div>

                <p className="text-[12.5px] text-secondary leading-relaxed font-medium">
                  동탄1·2 신도시 단지별 실제 거주 후기, 학군 및 상권 평가, 급매물 정보와 갈아타기 전략을 이웃들과 자유롭게 공유하세요.
                </p>

                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-body/60 dark:bg-slate-900/30 border border-border/30 text-[12px] text-tertiary">
                    <MessageSquare size={14} className="text-blue-500 shrink-0" />
                    <span className="font-semibold text-primary truncate">“동탄역 대장단지 vs 1동탄 대형평수 실거주 비교”</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-body/60 dark:bg-slate-900/30 border border-border/30 text-[12px] text-tertiary">
                    <MessageSquare size={14} className="text-emerald-500 shrink-0" />
                    <span className="font-semibold text-primary truncate">“인동선 및 트램 착공 구간별 실질 수혜 단지 정리”</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-border/30 flex items-center justify-between">
                <span className="text-[11px] text-tertiary font-medium">
                  D-VIEW 인증 입주민 & 실투자자 전용
                </span>
                <Link
                  href="/lounge"
                  data-testid="lounge-link-btn"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <span>라운지 입장하기</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>

          {/* Right 5 Columns (lg:col-span-5): RetentionActionCard */}
          <div className="lg:col-span-5 flex flex-col gap-4 min-w-0">
            <ErrorBoundary name="리텐션 액션 허브">
              <RetentionActionCard
                selectedAptName={selectedTimelineApt}
                className="h-full justify-between"
                onOpenPushModal={(apt) => {
                  setPushTargetApt(apt);
                  setIsPushModalOpen(true);
                }}
                onOpenA2HSModal={() => {
                  triggerCustomA2HSModal();
                }}
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

      {/* Mobile Bottom Sheet Modal */}
      <MacroMobileDrawer
        isBottomSheetOpen={isBottomSheetOpen}
        setIsBottomSheetOpen={setIsBottomSheetOpen}
        selectedTimelineApt={selectedTimelineApt}
        selectedAptSummary={selectedAptSummary}
        timeframe={timeframe}
        setTimeframe={setTimeframe}
        renderBottomSheetChart={renderBottomSheetChart}
        onOpenMortgageModal={handleOpenMortgage}
        onNavigateDetail={(aptName) => handleNavigateDetailPage(aptName, undefined, 'mobile_drawer')}
      />

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
