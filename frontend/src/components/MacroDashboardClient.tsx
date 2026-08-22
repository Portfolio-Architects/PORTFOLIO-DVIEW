import React, { useMemo, useState, useDeferredValue, useEffect, useCallback } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { safeReload } from "@/lib/utils/safeReload";
import { logger } from "@/lib/services/logger";
import { preloadApartmentModal } from "@/components/common/preload";
import type { DongApartment } from "@/lib/dong-apartments";
import type { AptTxSummary, DongtanMacroTrendPoint, FieldReportData } from "@/types";
import { normalizeAptName, findTxKey, findTypeMapEntry, getDisplayAptName, isSameApartment, HARDCODED_MAPPING } from "@/lib/utils/apartmentMapping";
import { useSettingsValues } from "@/contexts/SettingsContext";
import { useAuth } from "@/hooks/useAuth";
import { useLocationScores } from "@/hooks/useStaticData";
import { BUILD_VERSION } from "@/lib/build-version";

import { useMacroFilters, DONGTAN1_DONGS, DONGTAN2_DONGS, LANDMARK_APTS } from "./macro/hooks/useMacroFilters";
import { useMacroDragDrop } from "./macro/hooks/useMacroDragDrop";
import { MacroHeader } from "./macro/components/MacroHeader";
import { MacroTimelineView } from "./macro/components/MacroTimelineView";
import { MacroChartSection } from "./macro/components/MacroChartSection";
import { MacroMobileDrawer } from "./macro/components/MacroMobileDrawer";
import { MacroUtilityCards } from "./macro/components/MacroUtilityCards";
import { MacroBriefingModal } from "./macro/components/MacroBriefingModal";
import { AptDonutSection } from "./macro/components/AptDonutSection";
import { AptMetricCards } from "./macro/components/AptMetricCards";


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

const MacroTrendChart = dynamic(() => import(/* webpackPreload: false */ "@/components/MacroTrendChart").catch(err => {
  logger.warn('MacroDashboardClient.dynamic', 'MacroTrendChart Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('MacroTrendChart');
  return { default: () => null };
}), {
  ssr: false,
  loading: () => <InlineLoader text="매크로 동향 차트 분석 중" />
});

const AptFitFinder = dynamic(() => import(/* webpackPreload: false */ "@/components/consumer/AptFitFinder").catch(err => {
  logger.warn('MacroDashboardClient.dynamic', 'AptFitFinder Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('AptFitFinder');
  return { default: () => null };
}), {
  ssr: false,
  loading: () => <InlineLoader text="맞춤 단지 매칭 엔진 준비 중" />
});

const TrafficNoticeBoard = dynamic(() => import("./macro/TrafficNoticeBoard").then(mod => mod.TrafficNoticeBoard), {
  ssr: false,
  loading: () => <div className="w-full h-[260px] min-h-[260px] bg-body/20 dark:bg-zinc-800/20 rounded-[20px] animate-pulse" />
});

const LoungeTalkWidget = dynamic(() => import("./macro/LoungeTalkWidget").then(mod => mod.LoungeTalkWidget), {
  ssr: false,
  loading: () => <div className="w-full h-[260px] min-h-[260px] bg-body/20 dark:bg-zinc-800/20 rounded-[20px] animate-pulse" />
});

const EMPTY_OBJECT = {};

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
  isNewHigh?: boolean;
}

interface LocalNoticeItem {
  id: string;
  title: string;
  url: string;
  dept: string;
  date: string;
  isDongtan: boolean;
  source?: 'bbs' | 'gosi' | 'rail' | 'dong' | 'culture';
}

interface RecentTransaction {
  aptName: string;
  txKey: string;
  date: string;
  contractDate: string;
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
}

interface MacroDashboardProps {
  sheetApartments: Record<string, DongApartment[]>;
  txSummaryData: Record<string, AptTxSummary>;
  macroTrendData: DongtanMacroTrendPoint[];
  nameMapping?: Record<string, string>;
  publicRentalSet: Set<string>;
  userFavorites?: Set<string>;
  isFavoritesLoading?: boolean;
  fieldReportsMap: Map<string, FieldReportData>;
  favoriteCounts: Record<string, number>;
  onSelectApt?: (name: string, dong?: string) => void;
  onOpenAdModal?: () => void;
  onOpenCompare?: () => void;
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
  updateFavoriteOrder?: (newOrder: string[]) => Promise<void>;
  onToggleFavorite?: (aptName: string) => void;
  preloadApartmentTx?: (apartmentName: string, dong: string) => void;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

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
  isFavorite = false,
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
      className={`flex items-center justify-between p-2.5 xs:p-3 sm:p-3.5 rounded-xl transition-[background-color,border-color,transform] duration-150 ease-out border w-full max-w-full box-border ${
        isSelected
          ? "border-[#ea6100] bg-[#ea6100]/5 dark:bg-[#ea6100]/10 shadow-[0_2px_12px_rgba(234,97,0,0.08)]"
          : "bg-body hover:bg-slate-50 dark:hover:bg-slate-900/40 border-transparent hover:border-border"
      } group gap-2 sm:gap-3`}
    >
      {/* Optional Favorite Heart Button */}
      {onToggleFavorite && (
        <button
          type="button"
          aria-label={`${item.aptName} 관심 단지 등록`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(item.aptName);
          }}
          className="p-1 -ml-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0 outline-none cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill={isFavorite ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-colors ${
              isFavorite
                ? "fill-rose-500 text-rose-500"
                : "text-slate-300 dark:text-zinc-600 hover:text-rose-400"
            }`}
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        </button>
      )}

      {/* Clickable Card Body Button */}
      <button
        type="button"
        onClick={() => onCardClick(item.aptName)}
        aria-label={`실거래 분석 아파트 선택: ${item.aptName}, 위치: ${item.dong}, 가격: ${item.priceEok}`}
        className="flex-1 flex items-center justify-between text-left outline-none focus:ring-2 focus:ring-[#ea6100]/50 rounded-lg p-0.5 bg-transparent border-none min-w-0 cursor-pointer overflow-hidden gap-2"
      >
        {/* Left Column: 2-Row Layout */}
        <div className="flex flex-col gap-1 min-w-0 flex-1 overflow-hidden">
          {/* Row 1: [신고가 Badge] + [동 / 평형 / 층수 / 평당가] */}
          <div className="flex items-center gap-1.5 min-w-0 w-full overflow-hidden text-[9.5px] xs:text-[10px] sm:text-[11px] text-tertiary font-bold tracking-tight whitespace-nowrap">
            {item.type === 'high' && (
              <span className="text-[8px] xs:text-[9px] sm:text-[9.5px] font-black px-1.5 py-0.5 rounded bg-rose-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.4)] shrink-0 whitespace-nowrap animate-pulse tracking-wider">
                신고가
              </span>
            )}
            <span className="shrink-0 font-extrabold text-secondary max-w-[80px] xs:max-w-[110px] sm:max-w-none truncate min-w-0" title={item.dong}>
              {item.dong}
            </span>
            <span className="opacity-30 font-normal shrink-0">•</span>
            <span className="shrink-0">
              {areaUnit === 'm2'
                ? (item.areaLabelM2 || `${Math.round(item.area)}㎡`)
                : (item.areaLabelPyeong || `${Math.round(item.areaPyeong)}평`)}
            </span>
            <span className="opacity-30 font-normal shrink-0">•</span>
            <span className="shrink-0">{item.floor}층</span>
            {pyeongPriceMan > 0 && (
              <>
                <span className="opacity-30 font-normal shrink-0 hidden sm:inline">•</span>
                <span className="shrink-0 text-slate-400 dark:text-zinc-500 font-medium hidden sm:inline">
                  평당 {pyeongPriceMan.toLocaleString()}만
                </span>
              </>
            )}
          </div>

          {/* Row 2: [아파트 Full Name] */}
          <div className="flex items-center min-w-0 w-full overflow-hidden">
            <span
              className="text-xs xs:text-[13px] sm:text-sm font-extrabold text-primary group-hover:text-[#ea6100] dark:group-hover:text-[#ea6100] transition-colors leading-tight truncate break-keep min-w-0 flex-1"
              title={item.displayAptName || item.aptName}
            >
              {item.displayAptName || item.aptName}
            </span>
          </div>
        </div>

        {/* Right Section Column 1: Price & Delta Badges */}
        <div className="flex flex-col items-end justify-center gap-0.5 shrink-0 ml-1.5 sm:ml-2 min-w-0">
          <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
            {item.delta !== 0 && item.prevPriceVal && item.prevPriceVal > 0 && (
              <>
                <span className="text-[10px] sm:text-[11px] text-tertiary font-bold line-through opacity-50 hidden sm:inline">
                  {formatEokWithUnit(item.prevPriceVal * 10000).value}
                </span>
                <span className="text-[9px] text-tertiary opacity-45 hidden sm:inline">➔</span>
              </>
            )}
            <span
              className={`text-[12.5px] xs:text-[13px] sm:text-[14.5px] font-black tracking-tight leading-none whitespace-nowrap ${
                isRising
                  ? "text-rose-500 dark:text-rose-400"
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
                ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
                : isFalling
                  ? "bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            <span className="inline sm:hidden">
              {isRising
                ? `▲ ${formatDeltaPrice(item.delta).replace(/억\s*([0-9,]+)만?/, (_match: string, m: string) => {
                    const num = parseInt(m.replace(/,/g, ''), 10);
                    if (!num || num <= 0) return '억';
                    const dec = (num / 10000).toFixed(2).substring(1).replace(/\.?0+$/, '');
                    return `${dec}억`;
                  })}`
                : isFalling
                  ? `▼ ${formatDeltaPrice(Math.abs(item.delta)).replace(/억\s*([0-9,]+)만?/, (_match: string, m: string) => {
                      const num = parseInt(m.replace(/,/g, ''), 10);
                      if (!num || num <= 0) return '억';
                      const dec = (num / 10000).toFixed(2).substring(1).replace(/\.?0+$/, '');
                      return `${dec}억`;
                    })}`
                  : "보합"}
            </span>
            <span className="hidden sm:inline">
              {isRising
                ? `▲ ${formatDeltaPrice(item.delta)}${item.deltaPercent ? ` (${item.deltaPercent > 0 ? '+' : ''}${item.deltaPercent}%)` : ''}`
                : isFalling
                  ? `▼ ${formatDeltaPrice(Math.abs(item.delta))}${item.deltaPercent ? ` (${item.deltaPercent}%)` : ''}`
                  : "보합"}
            </span>
          </span>
        </div>
      </button>

      {/* Right Section Column 2: Detail Action Button */}
      <div className="flex items-center justify-center shrink-0 pl-1 sm:pl-2 border-l border-border/20 dark:border-zinc-800/50 my-0.5">
        <button
          type="button"
          aria-label={`${item.aptName} 상세 정보 보기`}
          onClick={(e) => {
            e.stopPropagation();
            onDetailsClick(item.aptName);
          }}
          onMouseEnter={() => onDetailsHover(item.aptName, item.dong)}
          className="px-2 xs:px-2.5 py-1.5 min-h-[32px] rounded-lg bg-surface hover:bg-slate-50 dark:hover:bg-slate-800 border border-border hover:border-slate-300 dark:hover:border-slate-700 text-[10px] sm:text-[10.5px] font-extrabold text-secondary hover:text-primary transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-95 cursor-pointer shadow-sm shrink-0 outline-none focus:ring-2 focus:ring-emerald-500/50 whitespace-nowrap"
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
  isFavorite = false,
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
      className={`px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer border-b border-border/40 last:border-b-0 ${
        isSelected ? 'bg-orange-50/20 dark:bg-orange-950/20' : ''
      }`}
    >
      {/* Left: Favorite Button + Apt info */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {onToggleFavorite && (
          <button
            type="button"
            aria-label={`${item.aptName} 관심 단지 등록`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(item.aptName);
            }}
            className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors shrink-0 outline-none cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill={isFavorite ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-colors ${
                isFavorite
                  ? "fill-rose-500 text-rose-500"
                  : "text-slate-300 dark:text-zinc-600 hover:text-rose-400"
              }`}
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </button>
        )}

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
              <span className="px-1.5 py-0.2 rounded bg-rose-500 text-white text-[8.5px] sm:text-[9px] font-black shrink-0 tracking-wider">
                신고가
              </span>
            )}
          </div>
          <span className="text-[10px] text-tertiary font-medium">
            {item.dong} · {item.floor}층 · {areaUnit === 'm2' ? (item.areaLabelM2 || `${Math.round(item.area)}㎡`) : (item.areaLabelPyeong || `${Math.round(item.areaPyeong)}평`)}
            {pyeongPriceMan > 0 && <span className="hidden sm:inline"> · 평당 {pyeongPriceMan.toLocaleString()}만</span>}
          </span>
        </button>
      </div>

      {/* Right: Price, Delta, and Details Button */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <div className="text-right flex flex-col items-end justify-center">
          <div className="text-[12.5px] sm:text-[13.5px] font-black text-primary leading-tight">
            {item.priceEok}
          </div>
          {item.delta !== undefined && item.delta !== 0 ? (
            <div
              className={`text-[9.5px] font-extrabold flex items-center gap-0.5 ${
                isRising ? 'text-rose-500' : isFalling ? 'text-blue-500' : 'text-slate-400'
              }`}
            >
              {isRising ? '▲' : '▼'} {formatDeltaPrice(Math.abs(item.delta))}
              {item.deltaPercent ? ` (${item.deltaPercent > 0 ? '+' : ''}${item.deltaPercent}%)` : ''}
            </div>
          ) : (
            <div className="text-[9.5px] font-bold text-slate-400">보합</div>
          )}
        </div>

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
  userFavorites,
  isFavoritesLoading,
  fieldReportsMap,
  favoriteCounts: _favoriteCounts,
  onSelectApt,
  onOpenAdModal: _onOpenAdModal,
  onOpenCompare: _onOpenCompare,
  onOpenJeonseSafety,
  onOpenMortgage,
  onOpenTaxCalculator: _onOpenTaxCalculator,
  onOpenSellTimingCalculator,
  recent7DaysVolume: _recent7DaysVolume,
  recentTransactions = [],
  typeMap = {},
  updateFavoriteOrder,
  onToggleFavorite,
  preloadApartmentTx,
}: MacroDashboardProps) {
  const { areaUnit } = useSettingsValues();
  const { user, isLoading: authLoading, handleLogin } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    timeframe,
    setTimeframe,
    availableDongs,
    availableApts,
  } = useMacroFilters({ sheetApartments });

  const { data: noticesData } = useSWR<{ notices: LocalNoticeItem[]; lastUpdated?: string }>('/api/local-notices', fetcher, { revalidateOnFocus: false, dedupingInterval: 300000 });
  const { locationScores } = useLocationScores();
  const { data: postsData } = useSWR('/api/posts?limit=50', fetcher, { revalidateOnFocus: false, dedupingInterval: 180000 });

  const railNotices = useMemo(() => {
    if (!noticesData?.notices) return [];
    const keywords = ['철도', '교통', 'gtx', '트램', '인동선', 'srt', '지하철', '복합환승', '대중교통', '철도교통', '동탄인덕원', '노선', '열차', '정거장', '서해선', '1호선', '신수원선'];
    return noticesData.notices.filter((n: LocalNoticeItem) => {
      if (n.source === 'rail') return true;
      if (n.id.includes('1131') || n.id.includes('1154')) return true;
      const deptLower = (n.dept || '').toLowerCase();
      if (deptLower.includes('철도') || deptLower.includes('트램') || deptLower.includes('교통') || deptLower.includes('추진단')) return true;
      const titleLower = (n.title || '').toLowerCase();
      return keywords.some(kw => titleLower.includes(kw));
    });
  }, [noticesData]);

  const rawTramNotices = useMemo(() => {
    const matched = railNotices.filter((n: LocalNoticeItem) => 
      n.id.includes('1154') ||
      (n.dept || '').includes('트램') || (n.dept || '').includes('추진단') ||
      (n.title || '').includes('트램')
    );
    if (matched.length > 0) return matched;
    if (!noticesData?.notices || noticesData.notices.length === 0) return [];
    return noticesData.notices.slice(2, 4);
  }, [railNotices, noticesData]);

  const tramNotices = rawTramNotices;

  const rawRailStrategyNotices = useMemo(() => {
    const tramNoticeIds = new Set(rawTramNotices.map(t => t.id));
    const matched = railNotices.filter((n: LocalNoticeItem) => !tramNoticeIds.has(n.id));
    if (matched.length > 0) return matched;
    if (!noticesData?.notices || noticesData.notices.length === 0) return [];
    return noticesData.notices.slice(0, 2);
  }, [railNotices, rawTramNotices, noticesData]);

  const railStrategyNotices = rawRailStrategyNotices;

  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [showBriefingPopup, setShowBriefingPopup] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);

  useEffect(() => {
    if (!mounted || authLoading || isFavoritesLoading) return;
    
    const hasFavorites = userFavorites && userFavorites.size > 0;
    if (hasFavorites) {
      setShowBriefingPopup(false);
      return;
    }
    
    const lastDismissed = localStorage.getItem("dview_briefing_popup_dismissed");
    const oneDay = 24 * 60 * 60 * 1000;
    const isDismissedRecently = lastDismissed && (Date.now() - parseInt(lastDismissed, 10) < oneDay);
    
    if (!isDismissedRecently) {
      const timer = setTimeout(() => {
        setShowBriefingPopup(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [mounted, authLoading, isFavoritesLoading, userFavorites]);

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
    import('@/components/ApartmentModal').catch(() => {});
    import('@/components/apartment-modal/TransactionChartSection').catch(() => {});
  }, [preloadApartmentTx]);

  const handleCardClick = useCallback((aptName: string) => {
    setSelectedTimelineApt(aptName);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsBottomSheetOpen(true);
    }
  }, [setSelectedTimelineApt, setIsBottomSheetOpen]);

  const handleDetailsClick = useCallback((aptName: string) => {
    if (onSelectApt) {
      onSelectApt(aptName);
    }
  }, [onSelectApt]);

  const handleDetailsHover = useCallback((aptName: string, dong: string) => {
    preloadApartmentTx?.(aptName, dong);
    preloadApartmentModal();
  }, [preloadApartmentTx]);

  const isDefaultAptSettingUp = useMemo(() => {
    if (!mounted) return true;
    if (isFavoritesLoading) return true;
    return false;
  }, [mounted, isFavoritesLoading]);

  const favoritesArray = useMemo(() => Array.from(userFavorites || []), [userFavorites]);

  // Use custom drag and drop hook for favorites reordering
  const {
    showOrderEditor,
    setShowOrderEditor,
    draggedIndex,
    orderEditorRef,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useMacroDragDrop({
    favoritesArray,
    updateFavoriteOrder,
  });

  // Preload ApartmentModal and transactions when selectedTimelineApt changes
  useEffect(() => {
    if (!selectedTimelineApt || !sheetApartments) return;
    
    const allApts = Object.values(sheetApartments).flat();
    const aptObj = allApts.find(a => a.name === selectedTimelineApt || normalizeAptName(a.name) === normalizeAptName(selectedTimelineApt));
    const dong = aptObj?.dong || '';
    
    if (preloadApartmentTx) {
      preloadApartmentTx(selectedTimelineApt, dong);
    }
    preloadApartmentModal();
  }, [selectedTimelineApt, sheetApartments, preloadApartmentTx]);

  // Set default apartment on login/favorites ready
  useEffect(() => {
    if (!mounted) return;
    if (hasSetDefaultApt) return;
    if (authLoading || isFavoritesLoading) return;

    if (userFavorites && userFavorites.size > 0) {
      const favArray = Array.from(userFavorites);
      setSelectedTimelineApt(favArray[0]);
      setHasSetDefaultApt(true);
    } else {
      if (!selectedTimelineApt) {
        setSelectedTimelineApt("동탄역 롯데캐슬");
      }
      setHasSetDefaultApt(true);
    }
  }, [userFavorites, mounted, hasSetDefaultApt, authLoading, isFavoritesLoading, selectedTimelineApt]);

  // Session reset handler
  const [prevUser, setPrevUser] = useState<string | null>(null);
  useEffect(() => {
    if (!mounted) return;
    const currentUserId = user ? user.uid : null;
    if (currentUserId !== prevUser) {
      setHasSetDefaultApt(false);
      setPrevUser(currentUserId);
    }
  }, [user, prevUser, mounted]);

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
    recentTransactions.forEach((tx) => {
      const dt = parseDateHelper(tx.contractDate);
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
  }, [recentTransactions]);

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
    if (!selectedTimelineApt || !deferredMacroTrendData || deferredMacroTrendData.length === 0) return null;

    if (!Array.isArray(aptRealTxData) || aptRealTxData.length === 0) {
      if (!selectedAptSummary) return null;
      const latestMacroPoint = deferredMacroTrendData[deferredMacroTrendData.length - 1];
      const macroSaleVal = latestMacroPoint ? latestMacroPoint['동탄 아파트 전체'] || 8.1 : 8.1;
      const macroJeonseVal = latestMacroPoint ? latestMacroPoint['동탄 아파트 전세 평균'] || 4.3 : 4.3;

      const aptSaleVal = (selectedAptSummary.avg1MPrice || selectedAptSummary.avg3MPrice || selectedAptSummary.latestPrice || 0) / 10000;
      const aptJeonseVal = (selectedAptSummary.avg1MRentDeposit || selectedAptSummary.avg3MRentDeposit || selectedAptSummary.latestRentDeposit || 0) / 10000;

      const saleFactor = aptSaleVal > 0 ? aptSaleVal / macroSaleVal : 1;
      const jeonseFactor = aptJeonseVal > 0 ? aptJeonseVal / macroJeonseVal : (aptSaleVal > 0 ? (aptSaleVal * 0.6) / macroJeonseVal : 1);

      return deferredMacroTrendData.map(point => ({
        name: point.name,
        '동탄 아파트 전체': Math.round((point['동탄 아파트 전체'] * saleFactor) * 100) / 100,
        '동탄 아파트 전세 평균': Math.round((point['동탄 아파트 전세 평균'] * jeonseFactor) * 100) / 100,
      }));
    }

    const salesByMonth: Record<string, number[]> = {};
    const rentsByMonth: Record<string, number[]> = {};

    aptRealTxData.forEach(tx => {
      if (!tx.contractYm) return;
      const yy = tx.contractYm.substring(2, 4);
      const mm = tx.contractYm.substring(4, 6);
      const key = `${yy}.${mm}`;

      if (tx.dealType === '전세' || tx.dealType === '월세') {
        const depositVal = tx.dealType === '월세'
          ? ((tx.deposit || 0) + Math.round((tx.monthlyRent || 0) * 12 / 0.055)) / 10000
          : (tx.deposit || tx.price || 0) / 10000;
        if (depositVal > 0) {
          if (!rentsByMonth[key]) rentsByMonth[key] = [];
          rentsByMonth[key].push(depositVal);
        }
      } else {
        const priceVal = (tx.price || 0) / 10000;
        if (priceVal > 0) {
          if (!salesByMonth[key]) salesByMonth[key] = [];
          salesByMonth[key].push(priceVal);
        }
      }
    });

    const monthlyAverages: Record<string, { sale: number | null; rent: number | null }> = {};
    deferredMacroTrendData.forEach(point => {
      const monthKey = point.name;
      const sales = salesByMonth[monthKey] || [];
      const rents = rentsByMonth[monthKey] || [];

      monthlyAverages[monthKey] = {
        sale: sales.length > 0 ? sales.reduce((a, b) => a + b, 0) / sales.length : null,
        rent: rents.length > 0 ? rents.reduce((a, b) => a + b, 0) / rents.length : null,
      };
    });

    let firstSaleAnchorIndex = -1;
    let firstRentAnchorIndex = -1;

    for (let i = 0; i < deferredMacroTrendData.length; i++) {
      const key = deferredMacroTrendData[i].name;
      if (firstSaleAnchorIndex === -1 && monthlyAverages[key].sale !== null) {
        firstSaleAnchorIndex = i;
      }
      if (firstRentAnchorIndex === -1 && monthlyAverages[key].rent !== null) {
        firstRentAnchorIndex = i;
      }
    }

    const realFirstSaleIndex = firstSaleAnchorIndex;
    const realFirstRentIndex = firstRentAnchorIndex;

    const fallbackSalePrice = ((selectedAptSummary?.avg1MPrice || selectedAptSummary?.avg3MPrice || selectedAptSummary?.latestPrice) || 80000) / 10000;
    const fallbackRentPrice = ((selectedAptSummary?.avg1MRentDeposit || selectedAptSummary?.avg3MRentDeposit || selectedAptSummary?.latestRentDeposit) || 48000) / 10000;

    if (firstSaleAnchorIndex === -1) {
      firstSaleAnchorIndex = deferredMacroTrendData.length - 1;
      const key = deferredMacroTrendData[firstSaleAnchorIndex].name;
      monthlyAverages[key].sale = fallbackSalePrice;
    }
    if (firstRentAnchorIndex === -1) {
      firstRentAnchorIndex = deferredMacroTrendData.length - 1;
      const key = deferredMacroTrendData[firstRentAnchorIndex].name;
      monthlyAverages[key].rent = fallbackRentPrice;
    }

    const saleAnchorKey = deferredMacroTrendData[firstSaleAnchorIndex].name;
    const rentAnchorKey = deferredMacroTrendData[firstRentAnchorIndex].name;
    const saleAnchorValue = monthlyAverages[saleAnchorKey].sale ?? 0;
    const rentAnchorValue = monthlyAverages[rentAnchorKey].rent ?? 0;

    let saleFactor = 1;
    if (realFirstSaleIndex !== -1 && deferredMacroTrendData[realFirstSaleIndex]) {
      const anchorPoint = deferredMacroTrendData[realFirstSaleIndex];
      const anchorMacroSale = anchorPoint ? (anchorPoint['동탄 아파트 전체'] || 8.1) : 8.1;
      const firstAptSale = (monthlyAverages[anchorPoint.name] && monthlyAverages[anchorPoint.name].sale) || fallbackSalePrice;
      saleFactor = anchorMacroSale > 0 ? firstAptSale / anchorMacroSale : 1;
    } else {
      const latestMacroPoint = deferredMacroTrendData[deferredMacroTrendData.length - 1];
      const macroSaleVal = latestMacroPoint ? (latestMacroPoint['동탄 아파트 전체'] || 8.1) : 8.1;
      saleFactor = macroSaleVal > 0 ? fallbackSalePrice / macroSaleVal : 1;
    }
    if (isNaN(saleFactor) || saleFactor <= 0) saleFactor = 1;

    let rentFactor = 1;
    if (realFirstRentIndex !== -1 && deferredMacroTrendData[realFirstRentIndex]) {
      const anchorPoint = deferredMacroTrendData[realFirstRentIndex];
      const anchorMacroRent = anchorPoint ? (anchorPoint['동탄 아파트 전세 평균'] || 4.3) : 4.3;
      const firstAptRent = (monthlyAverages[anchorPoint.name] && monthlyAverages[anchorPoint.name].rent) || fallbackRentPrice;
      rentFactor = anchorMacroRent > 0 ? firstAptRent / anchorMacroRent : 1;
    } else {
      const latestMacroPoint = deferredMacroTrendData[deferredMacroTrendData.length - 1];
      const macroRentVal = latestMacroPoint ? (latestMacroPoint['동탄 아파트 전세 평균'] || 4.3) : 4.3;
      rentFactor = macroRentVal > 0 ? fallbackRentPrice / macroRentVal : 1;
    }
    if (isNaN(rentFactor) || rentFactor <= 0) rentFactor = 1;

    const macroTrendList = deferredMacroTrendData;
    const runningLastSaleRef = { current: saleAnchorValue };
    const runningLastRentRef = { current: rentAnchorValue };

    const interpolatedSale = macroTrendList.map((point, i) => {
      const val = monthlyAverages[point.name] ? monthlyAverages[point.name].sale : null;
      if (val !== null && val !== undefined && !isNaN(val)) runningLastSaleRef.current = val;
      return i < firstSaleAnchorIndex ? null : runningLastSaleRef.current;
    });

    const interpolatedRent = macroTrendList.map((point, i) => {
      const val = monthlyAverages[point.name] ? monthlyAverages[point.name].rent : null;
      if (val !== null && val !== undefined && !isNaN(val)) runningLastRentRef.current = val;
      return i < firstRentAnchorIndex ? null : runningLastRentRef.current;
    });

    const finalChartData = macroTrendList.map((point, idx) => {
      const key = point.name;
      const monthAvg = monthlyAverages[key];
      
      let finalSale = monthAvg ? monthAvg.sale : null;
      if (finalSale === null || finalSale === undefined || isNaN(finalSale)) {
        if (realFirstSaleIndex !== -1 && idx >= realFirstSaleIndex) {
          finalSale = interpolatedSale[idx];
        }
        if (finalSale === null || finalSale === undefined || isNaN(finalSale)) {
          const macroSale = point['동탄 아파트 전체'] || 8.1;
          finalSale = macroSale * saleFactor;
        }
      }

      let finalRent = monthAvg ? monthAvg.rent : null;
      if (finalRent === null || finalRent === undefined || isNaN(finalRent)) {
        if (realFirstRentIndex !== -1 && idx >= realFirstRentIndex) {
          finalRent = interpolatedRent[idx];
        }
        if (finalRent === null || finalRent === undefined || isNaN(finalRent)) {
          const macroRent = point['동탄 아파트 전세 평균'] || 4.3;
          finalRent = macroRent * rentFactor;
        }
      }

      let safeSale = (typeof finalSale === 'number' && !isNaN(finalSale) && finalSale > 0) ? finalSale : 8.5;
      if (safeSale > 100) safeSale = safeSale / 10000;
      safeSale = Math.round(safeSale * 100) / 100;

      let safeRent = (typeof finalRent === 'number' && !isNaN(finalRent) && finalRent > 0) ? finalRent : 4.5;
      if (safeRent > 100) safeRent = safeRent / 10000;
      safeRent = Math.round(safeRent * 100) / 100;

      return {
        name: key,
        '동탄 아파트 전체': safeSale,
        '동탄 아파트 전세 평균': safeRent,
      };
    });

    return finalChartData;
  }, [selectedAptSummary, deferredMacroTrendData, aptRealTxData]);

  const lineData = useMemo(() => {
    const sourceData = selectedAptChartData || deferredMacroTrendData;
    if (!sourceData) return [];

    if (selectedAptChartData && timeframe === "ALL") {
      let firstValidIdx = -1;
      for (let i = 0; i < selectedAptChartData.length; i++) {
        const item = selectedAptChartData[i];
        if (item['동탄 아파트 전체'] !== null || item['동탄 아파트 전세 평균'] !== null) {
          firstValidIdx = i;
          break;
        }
      }
      
      if (firstValidIdx !== -1) {
        const startIndex = Math.max(0, firstValidIdx - 3);
        return selectedAptChartData.slice(startIndex);
      }
    }

    let count = sourceData.length;
    switch (timeframe) {
      case "3M": count = 3; break;
      case "6M": count = 6; break;
      case "1Y": count = 12; break;
      case "3Y": count = 36; break;
      case "5Y": count = 60; break;
      case "ALL": count = sourceData.length; break;
    }
    const sliced = sourceData.slice(-Math.min(count, sourceData.length));

    const hasAnyValidPoint = sliced.some(
      (item) => item['동탄 아파트 전체'] !== null || item['동탄 아파트 전세 평균'] !== null
    );

    if (!hasAnyValidPoint && deferredMacroTrendData && deferredMacroTrendData.length > 0) {
      return sliced.map((item) => {
        const matchingPoint = deferredMacroTrendData.find((p) => p.name === item.name);
        const macroSale = matchingPoint ? matchingPoint['동탄 아파트 전체'] : 8.1;
        const macroRent = matchingPoint ? matchingPoint['동탄 아파트 전세 평균'] : 4.3;
        return {
          ...item,
          '동탄 아파트 전체': item['동탄 아파트 전체'] ?? Math.round(macroSale * 100) / 100,
          '동탄 아파트 전세 평균': item['동탄 아파트 전세 평균'] ?? Math.round(macroRent * 100) / 100,
        };
      });
    }

    return sliced;
  }, [selectedAptChartData, deferredMacroTrendData, timeframe]);

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
    const groups: Record<string, { dateStr: string; timestamp: number; items: TimelineItem[] }> = {};

    if (!recentTransactions || !txSummaryData) return [];

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

    recentTransactions.forEach((tx) => {
      if (publicRentalSet && publicRentalSet.has && publicRentalSet.has(tx.aptName)) return;

      const dt = parseDateHelper(tx.contractDate);
      if (!dt) return;

      const diffMs = maxDateTime - dt.getTime();
      const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      if (diffDays >= 0) {
        const dateKey = tx.date;
        const daysOfWeek = ["일", "월", "화", "수", "목", "금", "토"];
        const dayName = daysOfWeek[dt.getDay()];
        const month = dt.getMonth() + 1;
        const dateVal = dt.getDate();
        const dateStr = `${month}월 ${dateVal}일 (${dayName})`;

        if (!groups[dateKey]) {
          groups[dateKey] = {
            dateStr,
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
          deltaPercent: tx.deltaPercent || 0,
          prevPriceVal: tx.prevPriceVal || (tx.priceVal - (tx.delta || 0)),
          areaLabelM2: labelM2,
          areaLabelPyeong: labelPyeong,
        });
      }
    });

    return Object.values(groups)
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((group) => {
        const sortedItems = [...group.items].sort((a, b) => b.priceVal - a.priceVal);
        const totalCount = sortedItems.length;
        const avgVal = totalCount > 0 ? (sortedItems.reduce((s, it) => s + it.priceVal, 0) / totalCount) : 0;
        const avgRoundedMan = Math.round(avgVal * 10000);
        const eok = Math.floor(avgRoundedMan / 10000);
        const man = avgRoundedMan % 10000;
        const avgPriceEok = eok === 0 ? `${man.toLocaleString()}만` : man === 0 ? `${eok}억` : `${eok}억 ${man.toLocaleString()}만`;

        const highest = sortedItems[0];
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
  }, [txSummaryData, recentTransactions, publicRentalSet, nameMapping, maxDateTime, typeMap]);

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

          // 5. Trade Type match
          if (tradeTypeFilter === 'high') {
            if (item.type !== 'high' && !item.isNewHigh) return false;
          } else if (tradeTypeFilter === 'rising') {
            if (item.delta <= 0) return false;
          } else if (tradeTypeFilter === 'falling') {
            if (item.delta >= 0) return false;
          }

          // 6. Search Query match
          if (trimmedSearch) {
            const nameMatch = item.aptName && item.aptName.toLowerCase().includes(trimmedSearch);
            const displayNameMatch = item.displayAptName && item.displayAptName.toLowerCase().includes(trimmedSearch);
            const dongMatch = item.dong && item.dong.toLowerCase().includes(trimmedSearch);
            if (!nameMatch && !displayNameMatch && !dongMatch) return false;
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
          // 'latest' or default: keep natural / priceVal order
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
  }, [timelineDongFilter, regionFilter, timelineAptFilter, pyeongFilter, tradeTypeFilter, quickFilter, searchQuery, sortOrder, isMobileViewport]);

  const totalTimelineCardsCount = useMemo(() => {
    return filteredTimelineData.reduce((acc, group) => acc + group.items.length, 0);
  }, [filteredTimelineData]);

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

  const renderTimelineItemCardNode = useCallback((item: TimelineItem, isSelected: boolean) => {
    const isFav = userFavorites ? (userFavorites instanceof Set ? userFavorites.has(item.aptName) : Array.isArray(userFavorites) ? (userFavorites as string[]).includes(item.aptName) : false) : false;
    return (
      <TimelineItemCard
        key={`${item.aptName}-${item.floor}-${item.priceVal}`}
        item={item}
        isSelected={isSelected}
        areaUnit={areaUnit}
        isFavorite={isFav}
        onToggleFavorite={onToggleFavorite}
        onCardHover={handleCardHover}
        onCardClick={handleCardClick}
        onDetailsClick={handleDetailsClick}
        onDetailsHover={handleDetailsHover}
      />
    );
  }, [areaUnit, userFavorites, onToggleFavorite, handleCardHover, handleCardClick, handleDetailsClick, handleDetailsHover]);

  const renderTimelineItemRowNode = useCallback((item: TimelineItem, isSelected: boolean) => {
    const isFav = userFavorites ? (userFavorites instanceof Set ? userFavorites.has(item.aptName) : Array.isArray(userFavorites) ? (userFavorites as string[]).includes(item.aptName) : false) : false;
    return (
      <TimelineItemRow
        key={`${item.aptName}-${item.floor}-${item.priceVal}`}
        item={item}
        isSelected={isSelected}
        areaUnit={areaUnit}
        isFavorite={isFav}
        onToggleFavorite={onToggleFavorite}
        onCardHover={handleCardHover}
        onCardClick={handleCardClick}
        onDetailsClick={handleDetailsClick}
        onDetailsHover={handleDetailsHover}
      />
    );
  }, [areaUnit, userFavorites, onToggleFavorite, handleCardHover, handleCardClick, handleDetailsClick, handleDetailsHover]);

  const renderChart = useCallback(() => (
    <MacroTrendChart
      lineData={lineData}
      xTicks={xTicks}
      yTicks={yTicks}
      timeframe={timeframe}
    />
  ), [lineData, xTicks, yTicks, timeframe]);

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
        {/* Top 2-Column Hero Section: Left (Donut Section + Metric Cards), Right (Apartment Price Trend Chart) */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6 items-stretch box-border">
          {/* Left Column: Donut Section + Metric Cards (lg:col-span-6) */}
          <div className="lg:col-span-6 flex flex-col gap-6 lg:h-[586px]">
            <AptDonutSection
              mounted={mounted}
              recentTransactions={recentTransactions}
              txSummaryData={txSummaryData}
              nameMapping={nameMapping}
              publicRentalSet={publicRentalSet}
              onSelectApt={onSelectApt}
              preloadApartmentTx={preloadApartmentTx}
            />
            <AptMetricCards
              recentTransactions={recentTransactions}
              txSummaryData={txSummaryData}
              macroTrendData={deferredMacroTrendData}
              onOpenSellTimingCalculator={onOpenSellTimingCalculator}
            />
          </div>

          {/* Right Column: Trend Line Chart Section (lg:col-span-6) */}
          <div className="lg:col-span-6 flex flex-col gap-6 lg:h-[586px]">
            <MacroChartSection
              userFavorites={userFavorites}
              isDefaultAptSettingUp={isDefaultAptSettingUp}
              mounted={mounted}
              selectedTimelineApt={selectedTimelineApt}
              setSelectedTimelineApt={setSelectedTimelineApt}
              preloadApartmentModal={preloadApartmentModal}
              favoritesArray={favoritesArray}
              defaultTimelineApts={DEFAULT_TIMELINE_APTS}
              onSelectApt={onSelectApt}
              onHoverApt={handleHoverApt}
              timeframe={timeframe}
              setTimeframe={setTimeframe}
              isAptTxLoading={isAptTxLoading}
              aptRealTxData={aptRealTxData}
              mainLineData={lineData}
              mainXTicks={xTicks}
              mainYTicks={yTicks}
              renderChart={renderChart}
              showOrderEditor={showOrderEditor}
              setShowOrderEditor={setShowOrderEditor}
              orderEditorRef={orderEditorRef}
              draggedIndex={draggedIndex}
              handleDragStart={handleDragStart}
              handleDragOver={handleDragOver}
              handleDragEnd={handleDragEnd}
            />
          </div>
        </div>

        {/* Daily Real Transactions Section (Wide Layout) */}
        <div className="w-full flex flex-col gap-4 mb-6 box-border">
          <MacroTimelineView
            displayedTimelineData={displayedTimelineData}
            selectedTimelineApt={selectedTimelineApt}
            selectedApt={selectedTimelineApt}
            nameMapping={nameMapping}
            areaUnit={areaUnit}
            isMobileViewport={isMobileViewport}
            totalTimelineCardsCount={totalTimelineCardsCount}
            visibleTimelineCount={visibleTimelineCount}
            setVisibleTimelineCount={setVisibleTimelineCount}
            onCardHover={handleCardHover}
            onCardClick={handleCardClick}
            onSelectApt={handleCardClick}
            onDetailsClick={handleDetailsClick}
            onDetailsHover={handleDetailsHover}
            userFavorites={userFavorites}
            onToggleFavorite={onToggleFavorite}
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
            onResetFilters={resetFilters}
            renderTimelineItemCard={renderTimelineItemCardNode}
            renderTimelineItemRow={renderTimelineItemRowNode}
          />
        </div>

        {/* Traffic Notice Board Widget */}
        <div className="w-full flex flex-col gap-4 mb-2">
          <TrafficNoticeBoard
            railStrategyNotices={railStrategyNotices}
            tramNotices={tramNotices}
          />
        </div>

        {/* Community Talk Widget */}
        <div className="flex flex-col gap-6 mt-6 w-full">
          <LoungeTalkWidget postsData={postsData} />
        </div>

        {/* Utility Toolkit Cards Grid */}
        <MacroUtilityCards
          setIsQuizOpen={setIsQuizOpen}
          onOpenJeonseSafety={onOpenJeonseSafety}
          onOpenMortgage={onOpenMortgage}
          onOpenSellTimingCalculator={onOpenSellTimingCalculator}
        />
      </div>

      <AptFitFinder
        sheetApartments={sheetApartments}
        txSummaryData={txSummaryData}
        nameMapping={nameMapping || EMPTY_OBJECT}
        publicRentalSet={publicRentalSet}
        fieldReportsMap={fieldReportsMap}
        onSelectApt={onSelectApt || (() => {})}
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        locationScores={locationScores || EMPTY_OBJECT}
      />

      {/* Retention Care Briefing Popup Modal */}
      <MacroBriefingModal
        showBriefingPopup={showBriefingPopup}
        setShowBriefingPopup={setShowBriefingPopup}
        mounted={mounted}
        user={user}
        handleLogin={handleLogin}
      />

      {/* Mobile Bottom Sheet Modal */}
      <MacroMobileDrawer
        isBottomSheetOpen={isBottomSheetOpen}
        setIsBottomSheetOpen={setIsBottomSheetOpen}
        selectedTimelineApt={selectedTimelineApt}
        selectedAptSummary={selectedAptSummary}
        timeframe={timeframe}
        setTimeframe={setTimeframe}
        renderBottomSheetChart={renderBottomSheetChart}
      />
    </div>
  );
});

export default MacroDashboardClient;
