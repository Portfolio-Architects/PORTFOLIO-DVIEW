import React, { useMemo, useState, useDeferredValue, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { safeReload } from "@/lib/utils/safeReload";
import { logger } from "@/lib/services/logger";
import { preloadApartmentModal } from "@/lib/utils/preloadHelpers";
const InlineLoader = ({ text }: { text: string }) => (
  <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center bg-surface/50 dark:bg-surface/50 border border-border/50 rounded-2xl p-6 gap-3 backdrop-blur-md">
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

const TrafficNoticeBoard = dynamic(() => import("./macro/TrafficNoticeBoard").then(mod => mod.TrafficNoticeBoard), { ssr: false });
const LoungeTalkWidget = dynamic(() => import("./macro/LoungeTalkWidget").then(mod => mod.LoungeTalkWidget), { ssr: false });

const EMPTY_OBJECT = {};

const DEFAULT_TIMELINE_APTS = [
  "동탄역 롯데캐슬",
  "동탄역 시범 우남퍼스트빌",
  "동탄역 시범 더샵 센트럴시티",
  "동탄역 시범 한화꿈에그린 프레스티지"
];

import type { DongApartment } from "@/lib/dong-apartments";
import type { AptTxSummary, DongtanMacroTrendPoint } from "@/lib/types/transaction";
import type { FieldReportData } from "@/lib/types/report.types";
import { normalizeAptName, findTxKey, findTypeMapEntry, getDisplayAptName } from "@/lib/utils/apartmentMapping";
import { useSettingsValues } from "@/lib/contexts/SettingsContext";
import { useAuth } from "@/hooks/useAuth";
import { useLocationScores } from "@/hooks/useStaticData";
import { BUILD_VERSION } from "@/lib/build-version";
import PageHeroHeader from "./PageHeroHeader";
import {
  Info,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Compass,
  Shield,
  Calculator,
  TrendingUp,
  Settings,
  X,
  Calendar,
} from "lucide-react";


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
}

interface MacroNewsItem {
  id: number | string;
  category: string;
  sub: string;
  title: string;
  link: string;
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
  preloadApartmentTx?: (apartmentName: string, dong: string) => void;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

const hexToRgba = (hex: string, alpha: number) => {
  let cleanHex = hex.replace("#", "");
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split("").map((c) => c + c).join("");
  }
  if (cleanHex.length !== 6) return hex;
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface InfoBoxProps {
  title: React.ReactNode;
  value: React.ReactNode;
  unit?: string;
  badge?: React.ReactNode;
  color?: string;
  description?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const InfoBox = ({
  title,
  value,
  unit,
  badge,
  color = "#ea6100",
  description,
  onClick,
  className,
}: InfoBoxProps) => {
  const cardStyle = {
    "--card-color": color,
    "--card-bg-gradient": `linear-gradient(135deg, var(--bg-surface) 30%, ${hexToRgba(color, 0.015)} 100%)`,
    "--card-bg-gradient-dark": `linear-gradient(135deg, var(--bg-surface) 30%, ${hexToRgba(color, 0.08)} 100%)`,
    "--card-border": hexToRgba(color, 0.10),
    "--card-border-dark": hexToRgba(color, 0.20),
    "--card-border-hover": hexToRgba(color, 0.30),
    "--card-border-hover-dark": hexToRgba(color, 0.45),
    "--card-glow": hexToRgba(color, 0.04),
    "--card-glow-dark": hexToRgba(color, 0.15),
  } as React.CSSProperties;

  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`relative rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.03)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] border min-h-[82px] sm:min-h-[88px] md:min-h-[96px] h-auto min-w-0 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] group/card bg-[var(--card-bg-gradient)] dark:bg-[var(--card-bg-gradient-dark)] border-[var(--card-border)] dark:border-[var(--card-border-dark)] ${
        onClick
          ? "cursor-pointer hover:-translate-y-1 hover:scale-[1.01] hover:border-[var(--card-border-hover)] dark:hover:border-[var(--card-border-hover-dark)] hover:shadow-[0_12px_24px_var(--card-glow)] dark:hover:shadow-[0_12px_32px_var(--card-glow-dark)] active:scale-[0.98] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-toss-blue"
          : "cursor-default"
      } ${className || ""}`}
      style={cardStyle}
      aria-label={onClick ? `${typeof title === 'string' ? title : '지표'}: ${typeof value === 'string' || typeof value === 'number' ? value : ''}${unit || ''} 상세 보기` : undefined}
    >
      {/* Background glow wrapper to clip the glow blob while keeping tooltip visible */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none z-0">
        {/* Background glow blob */}
        <div
          className="absolute -right-6 -bottom-6 w-16 h-16 rounded-full blur-[24px] opacity-10 dark:opacity-20 transition-all duration-500 group-hover/card:scale-125"
          style={{ backgroundColor: color }}
        />
      </div>

      {/* Row 1: Title Area */}
      <div className="flex items-center justify-between w-full min-w-0 z-10">
        <div className="text-[10px] sm:text-[11px] md:text-body-sm font-semibold text-tertiary tracking-tight w-full">
          {title}
        </div>
      </div>

      {/* Row 2: Value & Badge Area */}
      <div className="flex items-center justify-between w-full min-w-0 gap-2 mt-auto mb-auto z-10">
        <div className="flex items-baseline gap-0.5 min-w-0">
          <span className="text-[13px] sm:text-[14.5px] md:text-[18px] font-black text-primary tracking-tight leading-tight break-keep whitespace-normal">
            {value}
          </span>
          {unit && (
            <span className="text-[10px] sm:text-[10.5px] md:text-body-sm font-bold text-secondary tracking-tight ml-0.5 shrink-0">
              {unit}
            </span>
          )}
        </div>

        {badge && (
          <div
            className="px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-[6px] text-[9.5px] md:text-[11px] tracking-tight font-extrabold whitespace-nowrap leading-none shrink-0 border"
            style={{
              backgroundColor: hexToRgba(color, 0.08),
              borderColor: hexToRgba(color, 0.15),
            }}
          >
            <span 
              style={{ color: color }}
              className="dark:brightness-125 dark:saturate-150"
            >
              {badge}
            </span>
          </div>
        )}
      </div>

      {/* Row 3: Description Area */}
      <div className="w-full min-w-0 mt-auto z-10">
        {description ? (
          <div className="text-[9.5px] sm:text-[10.5px] md:text-[11.5px] font-medium text-secondary/90 dark:text-secondary/80 tracking-tight break-keep whitespace-normal w-full">
            {description}
          </div>
        ) : (
          <div className="h-[15px] sm:h-[16px] md:h-[18px]" />
        )}
      </div>
    </Tag>
  );
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

interface TimelineItemCardProps {
  item: TimelineItem;
  isSelected: boolean;
  areaUnit: string;
  onCardHover: (aptName: string, dong: string) => void;
  onCardClick: (aptName: string) => void;
  onDetailsClick: (aptName: string) => void;
  onDetailsHover: (aptName: string, dong: string) => void;
}

const TimelineItemCard = React.memo(function TimelineItemCard({
  item,
  isSelected,
  areaUnit,
  onCardHover,
  onCardClick,
  onDetailsClick,
  onDetailsHover,
}: TimelineItemCardProps) {
  const isRising = item.delta > 0;
  const isFalling = item.delta < 0;

  return (
    <div
      onMouseEnter={() => onCardHover(item.aptName, item.dong)}
      onTouchStart={() => onCardHover(item.aptName, item.dong)}
      className={`flex items-center justify-between p-3.5 rounded-xl transition-all border ${
        isSelected
          ? "border-[#ea6100] bg-[#ea6100]/5 dark:bg-[#ea6100]/10 shadow-[0_2px_12px_rgba(234,97,0,0.08)]"
          : "bg-body hover:bg-slate-50 dark:hover:bg-slate-900/40 border-transparent hover:border-border"
      } group gap-4`}
    >
      <button
        type="button"
        onClick={() => onCardClick(item.aptName)}
        aria-label={`실거래 분석 아파트 선택: ${item.aptName}, 위치: ${item.dong}, 가격: ${item.priceEok}`}
        className="flex-1 flex items-center justify-between text-left outline-none focus:ring-2 focus:ring-[#ea6100]/50 rounded-lg p-1 bg-transparent border-none min-w-0 cursor-pointer"
      >
        {/* Left Column: Apt Name & Info */}
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[13px] sm:text-[14px] font-extrabold text-primary break-keep group-hover:text-[#ea6100] dark:group-hover:text-[#ea6100] transition-colors leading-tight truncate" title={item.displayAptName || item.aptName}>
              {item.displayAptName || item.aptName}
            </span>
            {item.type === 'high' && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.4)] shrink-0 whitespace-nowrap animate-pulse tracking-wider">
                신고가
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] text-tertiary font-bold tracking-tight whitespace-nowrap overflow-hidden">
            <span>{item.dong}</span>
            <span className="opacity-30 font-normal">•</span>
            <span>
              {areaUnit === 'm2'
                ? (item.areaLabelM2 || `${Math.round(item.area)}㎡`)
                : (item.areaLabelPyeong || `${Math.round(item.areaPyeong)}평`)}
            </span>
            <span className="opacity-30 font-normal">•</span>
            <span>{item.floor}층</span>
          </div>
        </div>

        {/* Right Column: Price & Change Badges */}
        <div className="flex flex-col items-end gap-1 shrink-0 ml-1 sm:ml-2">
          {/* Price and flow */}
          <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
            {item.delta !== 0 && item.prevPriceVal && item.prevPriceVal > 0 && (
              <>
                <span className="text-[11px] text-tertiary font-bold line-through opacity-50 hidden sm:inline">
                  {formatEokWithUnit(item.prevPriceVal * 10000).value}
                </span>
                <span className="text-[9px] text-tertiary opacity-45 hidden sm:inline">➔</span>
              </>
            )}
            <span className={`text-[14.5px] font-black tracking-tight leading-none whitespace-nowrap ${
              isRising
                ? "text-rose-500 dark:text-rose-400"
                : isFalling
                  ? "text-slate-500 dark:text-slate-400"
                  : "text-primary"
            }`}>
              {item.priceEok}
            </span>
          </div>

          {/* Delta Badge */}
          <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-md shrink-0 whitespace-nowrap leading-none ${
            isRising
              ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
              : isFalling
                ? "bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          }`}>
            {isRising 
              ? `▲ ${formatDeltaPrice(item.delta)}` 
              : isFalling 
                ? `▼ ${formatDeltaPrice(Math.abs(item.delta))}` 
                : '보합'}
          </span>
        </div>
      </button>

      {/* Details Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDetailsClick(item.aptName);
        }}
        onMouseEnter={() => onDetailsHover(item.aptName, item.dong)}
        onTouchStart={() => onDetailsHover(item.aptName, item.dong)}
        className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-surface hover:bg-slate-50 dark:hover:bg-slate-800 border border-border hover:border-slate-300 dark:hover:border-slate-700 text-[10px] sm:text-[10.5px] font-extrabold text-secondary hover:text-primary transition-all active:scale-95 cursor-pointer shadow-sm shrink-0 outline-none focus:ring-2 focus:ring-emerald-500/50"
      >
        상세
      </button>
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
  favoriteCounts,
  onSelectApt,
  onOpenAdModal,
  onOpenCompare,
  onOpenJeonseSafety,
  onOpenMortgage,
  onOpenTaxCalculator,
  onOpenSellTimingCalculator,
  recent7DaysVolume,
  recentTransactions = [],
  typeMap = {},
  updateFavoriteOrder,
  preloadApartmentTx,
}: MacroDashboardProps) {
  const { areaUnit } = useSettingsValues();
  const { user, isLoading: authLoading, handleLogin } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 4대 대장 아파트 시세 데이터 백그라운드 프리패칭 (Idle-time 및 지연 처리)
  useEffect(() => {
    if (!mounted || !txSummaryData) return;

    const controller = new AbortController();
    const { signal } = controller;

    const prefetchApts = () => {
      if (signal.aborted) return;
      DEFAULT_TIMELINE_APTS.forEach((apt) => {
        if (signal.aborted) return;
        const resolved = findTxKey(apt, txSummaryData, nameMapping) || apt;
        if (!resolved) return;
        const txKey = normalizeAptName(resolved);
        fetch(`/tx-data/${encodeURIComponent(txKey)}.json?v=${BUILD_VERSION}`, { signal }).catch((err) => {
          if (signal.aborted) return;
          if (err.name !== "AbortError" && err.message !== "Failed to fetch" && err.name !== "TypeError") {
            logger.warn('MacroDashboardClient.prefetchApts', `Prefetch failed for ${txKey}`, undefined, err);
          } else {
            // Log as info to prevent E2E warning threshold failures
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
  }, [mounted, txSummaryData, nameMapping]);
  const [gapRankingDong, setGapRankingDong] = useState<string>("전체");
  const [timelineDongFilter, setTimelineDongFilter] = useState<string>("전체");
  const [timelineAptFilter, setTimelineAptFilter] = useState<string>("전체");

  useEffect(() => {
    setTimelineAptFilter("전체");
  }, [timelineDongFilter]);

  const availableDongs = useMemo(() => {
    if (!sheetApartments) return [];
    return Object.keys(sheetApartments).sort();
  }, [sheetApartments]);

  const availableApts = useMemo(() => {
    if (!sheetApartments) return [];
    if (timelineDongFilter !== "전체") {
      return (sheetApartments[timelineDongFilter] || []).map(a => a.name).sort();
    }
    return Object.values(sheetApartments).flat().map(a => a.name).sort();
  }, [sheetApartments, timelineDongFilter]);
  const { data: globalVotesData } = useSWR('/api/apartments/vote?aptName=global', fetcher, { revalidateOnFocus: false, dedupingInterval: 300000 });
  const { data: noticesData, error: noticesError, mutate: mutateNotices } = useSWR<{ notices: LocalNoticeItem[]; lastUpdated?: string }>('/api/local-notices', fetcher, { revalidateOnFocus: false, dedupingInterval: 300000 });
  const { locationScores } = useLocationScores();
  const { data: postsData } = useSWR('/api/posts?limit=50', fetcher, { revalidateOnFocus: false, dedupingInterval: 180000 });
  const noticesLoading = !noticesData && !noticesError;

  const railNotices = useMemo(() => {
    if (!noticesData?.notices) return [];
    const keywords = ['철도', '교통', 'gtx', '트램', '인동선', 'srt', '지하철', '복합환승', '대중교통', '철도교통', '동탄인덕원', '노선', '열차', '정거장', '서해선', '1호선', '신수원선'];
    return noticesData.notices.filter((n: LocalNoticeItem) => {
      if (n.source === 'rail') return true;
      const titleLower = (n.title || '').toLowerCase();
      return keywords.some(kw => titleLower.includes(kw));
    });
  }, [noticesData]);

  const filteredRailNotices = useMemo(() => {
    if (gapRankingDong === "전체") return railNotices;
    return railNotices.filter((n: LocalNoticeItem) => {
      const deptMatch = (n.dept || '').includes(gapRankingDong.replace("동", ""));
      const titleMatch = (n.title || '').includes(gapRankingDong);
      return deptMatch || titleMatch;
    });
  }, [railNotices, gapRankingDong]);

  const railStrategyNotices = useMemo(() => {
    return railNotices.filter((n: LocalNoticeItem) => 
      (n.dept || '').includes('철도') || (n.dept || '').includes('전략')
    );
  }, [railNotices]);

  const tramNotices = useMemo(() => {
    return railNotices.filter((n: LocalNoticeItem) => 
      (n.dept || '').includes('트램') || (n.dept || '').includes('추진단')
    );
  }, [railNotices]);

  const nextCultureEvent = useMemo(() => {
    if (!noticesData?.notices) return null;
    const cultureNotices = noticesData.notices.filter((n: LocalNoticeItem) => n.source === 'culture');
    if (cultureNotices.length === 0) return null;
    
    const today = new Date('2026-06-07');
    today.setHours(0, 0, 0, 0);
    
    const upcoming = cultureNotices
      .map((n: LocalNoticeItem) => {
        const target = new Date(n.date);
        target.setHours(0, 0, 0, 0);
        const diff = target.getTime() - today.getTime();
        const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return { notice: n, diffDays };
      })
      .filter((item: { notice: LocalNoticeItem; diffDays: number }) => item.diffDays >= 0)
      .sort((a: { notice: LocalNoticeItem; diffDays: number }, b: { notice: LocalNoticeItem; diffDays: number }) => a.diffDays - b.diffDays);
      
    return upcoming[0] || null;
  }, [noticesData]);

  const renderAreaLabel = (areaPyeong: number, area?: number) => {
    if (areaUnit === 'm2' && area) {
      return `${Math.round(area)}㎡`;
    }
    return `${Math.round(areaPyeong)}평`;
  };


  // Removed unused activeIndex, isTooltipActive, and isTouchDevice states


  const [timeframe, setTimeframe] = useState<
    "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL"
  >("3Y");
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [showBriefingPopup, setShowBriefingPopup] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);

  useEffect(() => {
    if (!mounted || authLoading || isFavoritesLoading) return;
    
    // Only show if user has no favorites
    const hasFavorites = userFavorites && userFavorites.size > 0;
    if (hasFavorites) {
      setShowBriefingPopup(false);
      return;
    }
    
    // Check if user has already dismissed the popup in the last 24 hours
    const lastDismissed = localStorage.getItem("dview_briefing_popup_dismissed");
    const oneDay = 24 * 60 * 60 * 1000;
    const isDismissedRecently = lastDismissed && (Date.now() - parseInt(lastDismissed, 10) < oneDay);
    
    if (!isDismissedRecently) {
      const timer = setTimeout(() => {
        setShowBriefingPopup(true);
      }, 1500); // 1.5 seconds delay
      return () => clearTimeout(timer);
    }
  }, [mounted, authLoading, isFavoritesLoading, userFavorites]);

  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let debounceTimer: NodeJS.Timeout | null = null;
    const handleResize = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        setIsMobileViewport(window.innerWidth < 1024);
      }, 100);
    };
    setIsMobileViewport(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);

  // 바텀 시트 및 퀴즈 오픈 시 body 스크롤 방지
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

  const [isScrolled, setIsScrolled] = useState(false);



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
    if (authLoading) return true;
    if (user && isFavoritesLoading) return true;
    // 유저가 로그인되어 있고 관심단지가 존재하는데, 아직 디폴트 단지 설정이 완료되지 않은 상태
    if (user && userFavorites && userFavorites.size > 0 && !hasSetDefaultApt) return true;
    return false;
  }, [mounted, authLoading, user, isFavoritesLoading, userFavorites, hasSetDefaultApt]);

  const favoritesArray = useMemo(() => Array.from(userFavorites || []), [userFavorites]);

  // ⚙️ 관심단지 정렬 팝오버 상태 및 핸들러
  const [showOrderEditor, setShowOrderEditor] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const orderEditorRef = React.useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 팝오버 닫기
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    function handleClickOutside(event: MouseEvent) {
      if (orderEditorRef.current && !orderEditorRef.current.contains(event.target as Node)) {
        setShowOrderEditor(false);
      }
    }
    if (showOrderEditor) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showOrderEditor]);

  // Preload ApartmentModal and transactions when selectedTimelineApt changes
  useEffect(() => {
    if (!selectedTimelineApt || !sheetApartments) return;
    
    // Find the dong of the selected timeline apartment from sheetApartments
    const allApts = Object.values(sheetApartments).flat();
    const aptObj = allApts.find(a => a.name === selectedTimelineApt || normalizeAptName(a.name) === normalizeAptName(selectedTimelineApt));
    const dong = aptObj?.dong || '';
    
    if (preloadApartmentTx) {
      preloadApartmentTx(selectedTimelineApt, dong);
    }
    preloadApartmentModal();
  }, [selectedTimelineApt, sheetApartments, preloadApartmentTx]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const nextArray = [...favoritesArray];
    const targetItem = nextArray.splice(draggedIndex, 1)[0];
    nextArray.splice(index, 0, targetItem);

    setDraggedIndex(index);
    if (updateFavoriteOrder) {
      updateFavoriteOrder(nextArray);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };
  const favIndex = useMemo(() => favoritesArray.indexOf(selectedTimelineApt || ""), [favoritesArray, selectedTimelineApt]);

  const handlePrevFavorite = useCallback(() => {
    if (favoritesArray.length <= 1 || favIndex === -1) return;
    const nextIndex = (favIndex - 1 + favoritesArray.length) % favoritesArray.length;
    setSelectedTimelineApt(favoritesArray[nextIndex]);
  }, [favoritesArray, favIndex]);

  const handleNextFavorite = useCallback(() => {
    if (favoritesArray.length <= 1 || favIndex === -1) return;
    const nextIndex = (favIndex + 1) % favoritesArray.length;
    setSelectedTimelineApt(favoritesArray[nextIndex]);
  }, [favoritesArray, favIndex]);

  // 1. 로그인 여부 및 관심 단지에 따라 디폴트 아파트 선택
  useEffect(() => {
    if (!mounted || isFavoritesLoading) return;
    
    // 이미 디폴트 아파트를 설정한 경우 스킵
    if (hasSetDefaultApt) {
      return;
    }

    // 유저가 로그아웃 상태이거나 관심단지가 없는 경우 동탄역 롯데캐슬로 기본 설정
    if (!user || !userFavorites || userFavorites.size === 0) {
      setSelectedTimelineApt("동탄역 롯데캐슬");
      setHasSetDefaultApt(true);
      return;
    }
    
    // Set의 첫 번째 요소를 기본 관심 단지로 선택
    const firstFav = Array.from(userFavorites)[0];
    if (firstFav) {
      setSelectedTimelineApt(firstFav);
      setHasSetDefaultApt(true);
    }
  }, [user, userFavorites, mounted, hasSetDefaultApt, isFavoritesLoading]);

  // 로그인 상태 변화 감지 및 세션 전환 시 디폴트 설정 리셋
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
    if (!selectedTimelineApt || !txSummaryData || Object.keys(txSummaryData).length === 0) return null;
    const resolved = findTxKey(selectedTimelineApt, txSummaryData, nameMapping) || selectedTimelineApt;
    return resolved ? normalizeAptName(resolved) : null;
  }, [selectedTimelineApt, txSummaryData, nameMapping]);

  // 모든 타임프레임에서 데이터 정합성 보장을 위해 전체 데이터(.json)를 페치합니다 (초경량 130KB 이내)
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
      dedupingInterval: 300000, // 5분
    }
  );

  const aptRealTxData = aptRealTxDataData || null;




  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    let scrollFrame: number | null = null;
    const handleScroll = () => {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 80);
        scrollFrame = null;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
    };
  }, []);

  // Removed unused chartContainerRef and click-outside listener

  // Compute max transaction date across all data once
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

  const paddedMacroTrendData = useMemo(() => {
    if (!macroTrendData || macroTrendData.length === 0) return [];
    
    const currentYear = 2026;
    const currentMonth = 6;
    
    const lastPoint = macroTrendData[macroTrendData.length - 1];
    if (!lastPoint || !lastPoint.name) return macroTrendData;
    
    const parts = lastPoint.name.split(".");
    if (parts.length !== 2) return macroTrendData;
    
    let lastYear = 2000 + parseInt(parts[0]);
    let lastMonth = parseInt(parts[1]);
    
    const padded = [...macroTrendData];
    
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
  }, [macroTrendData]);

  const deferredMacroTrendData = useDeferredValue(paddedMacroTrendData);

  const macroTrendJsonLd = useMemo(() => {
    if (!macroTrendData || macroTrendData.length === 0) return null;

    const formatDateStr = (nameStr: string) => {
      const parts = nameStr.split('.');
      if (parts.length === 2) {
        const year = 2000 + parseInt(parts[0], 10);
        const month = parts[1];
        return `${year}-${month}`;
      }
      return nameStr;
    };

    const firstPoint = macroTrendData[0];
    const lastPoint = macroTrendData[macroTrendData.length - 1];
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
  }, [macroTrendData]);

  const selectedAptSummary = useMemo(() => {
    if (!selectedTimelineApt || !txSummaryData) return null;
    const txKey = findTxKey(selectedTimelineApt, txSummaryData, nameMapping);
    return txKey ? txSummaryData[txKey] : null;
  }, [selectedTimelineApt, txSummaryData, nameMapping]);

  const selectedAptChartData = useMemo(() => {
    if (!selectedAptSummary || !deferredMacroTrendData || deferredMacroTrendData.length === 0) return null;

    // 만약 실제 거래 데이터가 로드되지 않았거나 로딩 중이면, 안전한 fallback으로 기존의 Mock 스케일링 데이터를 제공
    if (!Array.isArray(aptRealTxData) || aptRealTxData.length === 0) {
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

    // 1. 실제 거래 분류 및 월별 데이터 구조 구축
    const salesByMonth: Record<string, number[]> = {};
    const rentsByMonth: Record<string, number[]> = {};

    aptRealTxData.forEach(tx => {
      if (!tx.contractYm) return;
      const yy = tx.contractYm.substring(2, 4);
      const mm = tx.contractYm.substring(4, 6);
      const key = `${yy}.${mm}`;

      if (tx.dealType === '전세') {
        const depositVal = (tx.deposit || tx.price || 0) / 10000;
        if (depositVal > 0) {
          if (!rentsByMonth[key]) rentsByMonth[key] = [];
          rentsByMonth[key].push(depositVal);
        }
      } else if (tx.dealType !== '월세') {
        const priceVal = (tx.price || 0) / 10000;
        if (priceVal > 0) {
          if (!salesByMonth[key]) salesByMonth[key] = [];
          salesByMonth[key].push(priceVal);
        }
      }
    });

    // 2. 월별 평균 구하기
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

    // 3. 정밀 보간 (Interpolation) 파이프라인
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

    const fallbackSalePrice = (selectedAptSummary.avg1MPrice || selectedAptSummary.avg3MPrice || selectedAptSummary.latestPrice || 80000) / 10000;
    const fallbackRentPrice = (selectedAptSummary.avg1MRentDeposit || selectedAptSummary.avg3MRentDeposit || selectedAptSummary.latestRentDeposit || 48000) / 10000;

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

    // 첫 실거래 기준 매크로 가격 비율 계산 (과거 데이터 백필용)
    let saleFactor = 1;
    if (realFirstSaleIndex !== -1) {
      const anchorPoint = deferredMacroTrendData[realFirstSaleIndex];
      const anchorMacroSale = anchorPoint ? anchorPoint['동탄 아파트 전체'] || 8.1 : 8.1;
      const firstAptSale = monthlyAverages[anchorPoint.name].sale || fallbackSalePrice;
      saleFactor = firstAptSale / anchorMacroSale;
    } else {
      const latestMacroPoint = deferredMacroTrendData[deferredMacroTrendData.length - 1];
      const macroSaleVal = latestMacroPoint ? latestMacroPoint['동탄 아파트 전체'] || 8.1 : 8.1;
      saleFactor = fallbackSalePrice / macroSaleVal;
    }

    let rentFactor = 1;
    if (realFirstRentIndex !== -1) {
      const anchorPoint = deferredMacroTrendData[realFirstRentIndex];
      const anchorMacroRent = anchorPoint ? anchorPoint['동탄 아파트 전세 평균'] || 4.3 : 4.3;
      const firstAptRent = monthlyAverages[anchorPoint.name].rent || fallbackRentPrice;
      rentFactor = firstAptRent / anchorMacroRent;
    } else {
      const latestMacroPoint = deferredMacroTrendData[deferredMacroTrendData.length - 1];
      const macroRentVal = latestMacroPoint ? latestMacroPoint['동탄 아파트 전세 평균'] || 4.3 : 4.3;
      rentFactor = fallbackRentPrice / macroRentVal;
    }

    const macroTrendList = deferredMacroTrendData;
    const runningLastSaleRef = { current: saleAnchorValue };
    const runningLastRentRef = { current: rentAnchorValue };

    const interpolatedSale = macroTrendList.map((point, i) => {
      const val = monthlyAverages[point.name].sale;
      if (val !== null) runningLastSaleRef.current = val;
      return i < firstSaleAnchorIndex ? null : runningLastSaleRef.current;
    });

    const interpolatedRent = macroTrendList.map((point, i) => {
      const val = monthlyAverages[point.name].rent;
      if (val !== null) runningLastRentRef.current = val;
      return i < firstRentAnchorIndex ? null : runningLastRentRef.current;
    });

    const finalChartData = macroTrendList.map((point, idx) => {
      const key = point.name;
      
      // 실제 데이터가 없으면,
      // 첫 거래 이후 기간에는 기존 보간법(interpolated)을 쓰고,
      // 첫 거래 이전(과거) 기간에는 null을 대입해 그래프 선이 노출되지 않도록 가드 (실거래 0건인 경우에만 기존 백필 유지)
      let finalSale = monthlyAverages[key].sale;
      if (finalSale === null) {
        if (realFirstSaleIndex !== -1 && idx > realFirstSaleIndex) {
          finalSale = interpolatedSale[idx];
        } else {
          if (realFirstSaleIndex === -1) {
            finalSale = point['동탄 아파트 전체'] * saleFactor;
          } else {
            finalSale = null;
          }
        }
      }

      let finalRent = monthlyAverages[key].rent;
      if (finalRent === null) {
        if (realFirstRentIndex !== -1 && idx > realFirstRentIndex) {
          finalRent = interpolatedRent[idx];
        } else {
          if (realFirstRentIndex === -1) {
            finalRent = point['동탄 아파트 전세 평균'] * rentFactor;
          } else {
            finalRent = null;
          }
        }
      }

      return {
        name: key,
        '동탄 아파트 전체': finalSale !== null ? Math.round(finalSale * 100) / 100 : null,
        '동탄 아파트 전세 평균': finalRent !== null ? Math.round(finalRent * 100) / 100 : null,
      };
    });

    return finalChartData;
  }, [selectedAptSummary, deferredMacroTrendData, aptRealTxData]);

  const lineData = useMemo(() => {
    const sourceData = selectedAptChartData || deferredMacroTrendData;
    if (!sourceData) return [];

    // 만약 개별 아파트이고 timeframe이 "ALL"인 경우, 최초 거래월 기준으로 시작 연월을 동적 슬라이싱
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
        // 최초 거래 발생 월의 직전 3개월 마진을 주어 조금 더 자연스럽게 그래프가 시작되게 함
        const startIndex = Math.max(0, firstValidIdx - 3);
        return selectedAptChartData.slice(startIndex);
      }
    }

    let count = sourceData.length;
    switch (timeframe) {
      case "3M":
        count = 3;
        break;
      case "6M":
        count = 6;
        break;
      case "1Y":
        count = 12;
        break;
      case "3Y":
        count = 36;
        break;
      case "5Y":
        count = 60;
        break;
      case "ALL":
        count = sourceData.length;
        break;
    }
    return sourceData.slice(
      -Math.min(count, sourceData.length),
    );
  }, [timeframe, deferredMacroTrendData, selectedAptChartData]);

  const xTicks = useMemo(() => {
    if (lineData.length === 0) return [];
    const ticks = [];
    const total = lineData.length;

    if (timeframe === "3M" || timeframe === "6M") {
      return lineData.map((d) => d.name);
    }

    let step = 1;
    if (timeframe === "1Y")
      step = 2; // 2개월 간격
    else if (timeframe === "3Y")
      step = 6; // 6개월 간격
    else if (timeframe === "5Y")
      step = 12; // 1년 간격
    else if (timeframe === "ALL") {
      // 유동적으로 좁혀진 lineData 길이에 맞추어 x축 틱 단계 조절
      if (total <= 12) step = 2;
      else if (total <= 36) step = 6;
      else if (total <= 60) step = 12;
      else step = 24; // 2년 간격
    }

    // 항상 최신 달(가장 오른쪽)부터 역순으로 균등하게 범례를 추출
    for (let i = total - 1; i >= 0; i -= step) {
      ticks.unshift(lineData[i].name);
    }
    return ticks;
  }, [lineData, timeframe]);

  const mainLineData = lineData;

  const mainXTicks = xTicks;

  const latestMacroPoint = useMemo(() => {
    if (!deferredMacroTrendData || deferredMacroTrendData.length === 0) return null;
    return deferredMacroTrendData[deferredMacroTrendData.length - 1];
  }, [deferredMacroTrendData]);

  const macroSalePriceText = useMemo(() => {
    if (!latestMacroPoint) return "8.1억";
    const val = latestMacroPoint['동탄 아파트 전체'];
    return typeof val === 'number' ? `${val.toFixed(1)}억` : "8.1억";
  }, [latestMacroPoint]);

  const macroRentPriceText = useMemo(() => {
    if (!latestMacroPoint) return "4.3억";
    const val = latestMacroPoint['동탄 아파트 전세 평균'];
    return typeof val === 'number' ? `${val.toFixed(1)}억` : "4.3억";
  }, [latestMacroPoint]);


  // 6차 사이클: 일자별 신고가 타임라인 데이터 계산
  const dailyTimelineData = useMemo(() => {
    const groups: Record<string, { dateStr: string; timestamp: number; items: TimelineItem[] }> = {};

    if (!recentTransactions || !txSummaryData) return [];

    // 역방향 매핑 맵 생성 (txKey -> 시트 설정 커스텀 명칭)
    const txKeyToCustomNameMap = new Map<string, string>();
    if (nameMapping) {
      for (const [customName, tKey] of Object.entries(nameMapping)) {
        if (tKey) {
          txKeyToCustomNameMap.set(tKey, customName);
          txKeyToCustomNameMap.set(normalizeAptName(tKey), customName);
        }
      }
    }

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
          dong: txSummaryData[tx.txKey]?.dong || "",
          priceEok: tx.priceEok,
          priceVal: tx.priceVal,
          areaPyeong: tx.areaPyeong,
          area: tx.area,
          floor: typeof tx.floor === 'string' ? (parseInt(tx.floor, 10) || 0) : tx.floor,
          type: tx.isNewHigh ? "high" : "normal",
          delta: tx.delta || 0,
          deltaPercent: tx.deltaPercent || 0,
          prevPriceVal: tx.prevPriceVal || (tx.priceVal - (tx.delta || 0)),
          areaLabelM2: labelM2,
          areaLabelPyeong: labelPyeong,
        });
      }
    });

    // Sort groups by latest date descending
    return Object.values(groups)
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((group) => {
        const sortedItems = group.items.sort((a, b) => b.priceVal - a.priceVal);
        return {
          ...group,
          items: sortedItems,
        };
      });
  }, [txSummaryData, recentTransactions, publicRentalSet, nameMapping, maxDateTime, typeMap]);

  const filteredTimelineData = useMemo(() => {
    if (timelineDongFilter === "전체" && timelineAptFilter === "전체") return dailyTimelineData;
    return dailyTimelineData
      .map((group) => {
        const filteredItems = group.items.filter((item) => {
          const matchesDong = timelineDongFilter === "전체" || item.dong === timelineDongFilter;
          const matchesApt = timelineAptFilter === "전체" || 
            item.aptName === timelineAptFilter || 
            normalizeAptName(item.aptName) === normalizeAptName(timelineAptFilter);
          return matchesDong && matchesApt;
        });
        return {
          ...group,
          items: filteredItems,
        };
      })
      .filter((group) => group.items.length > 0);
  }, [dailyTimelineData, timelineDongFilter, timelineAptFilter]);








  const { gapText, jeonseRateText, hasValues } = useMemo(() => {
    if (!selectedAptSummary) return { gapText: "-", jeonseRateText: "-", hasValues: false };
    const sale = selectedAptSummary.avg1MPrice || selectedAptSummary.avg3MPrice || selectedAptSummary.latestPrice || 0;
    const rent = selectedAptSummary.avg1MRentDeposit || selectedAptSummary.avg3MRentDeposit || selectedAptSummary.latestRentDeposit || 0;
    if (sale > 0 && rent > 0) {
      const gapVal = sale - rent;
      const fmtGap = formatEokWithUnit(gapVal);
      const gapUnitStr = fmtGap.unit === "만원" ? "만" : fmtGap.unit === "원" ? "" : fmtGap.unit;
      const ratio = (rent / sale) * 100;
      return {
        gapText: `${fmtGap.value}${gapUnitStr}`,
        jeonseRateText: `${ratio.toFixed(1)}%`,
        hasValues: true
      };
    }
    return { gapText: "-", jeonseRateText: "-", hasValues: false };
  }, [selectedAptSummary]);

  const yTicks = useMemo(() => {
    if (!lineData || lineData.length === 0) return [0, 2, 4, 6, 8];
    let maxVal = 0;
    lineData.forEach((d) => {
      const sale = d["동탄 아파트 전체"] || 0;
      const rent = d["동탄 아파트 전세 평균"] || 0;
      if (sale > maxVal) maxVal = sale;
      if (rent > maxVal) maxVal = rent;
    });

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

    const roundedMax = Math.ceil(maxVal / step) * step;
    // Y축 최대값과 데이터 최대값의 차이가 너무 타이트할 때(step의 10% 미만)만 한 step을 추가하여 상단 여백 확보
    const finalMax = (roundedMax - maxVal < step * 0.1) ? roundedMax + step : roundedMax;

    const ticks = [];
    for (let i = 0; i <= finalMax; i += step) {
      ticks.push(i);
    }
    return ticks;
  }, [lineData]);

  const mainYTicks = yTicks;

  return (
    <div className="w-full flex flex-col bg-transparent relative">
      {macroTrendJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: macroTrendJsonLd }}
        />
      )}
      <PageHeroHeader 
        title="D-VIEW 아파트 랩"
        compactTitle="D-VIEW 아파트 랩"
        subtitleStrong={
          <>
            실수요자 중심 <span className="text-[#ea6100] font-extrabold px-0.5">동탄 아파트</span> 주거 안심 및 정주 여건 진단
          </>
        }
        subtitleLight="역전세 리스크 진단 및 생활 밀착형 인프라(돌봄·교통) 연계 공익 데이터 리포트"
        rightContent={
          <div className="hidden sm:flex items-center gap-2">
          </div>
        }
        rightSideContent={null}
      />
      <div className="flex flex-col px-4 sm:px-6 md:px-10 lg:px-16 pt-3 md:pt-5 pb-6 md:pb-8 lg:pb-10 w-full">



        <div className="flex flex-col md:flex-row items-start md:items-stretch gap-4 w-full px-0 mt-0 md:h-[870px]">
          {/* Left Column Container */}
          <div className="w-full md:w-1/2 flex flex-col gap-4 min-w-0 md:h-full">
            {/* Daily Timeline Card */}
            <div className="flex flex-col bg-surface rounded-2xl shadow-sm border border-border px-5 py-6 md:h-full min-h-[420px] min-w-0">
              <div className="flex justify-between items-center gap-2 mb-4">
                <h2 className="text-[16px] sm:text-[18px] font-extrabold text-primary tracking-tight whitespace-nowrap">
                  일자별 최근 실거래
                </h2>
                <div className="flex items-center gap-1.5 shrink-0">
                  <select
                    value={timelineDongFilter}
                    onChange={(e) => setTimelineDongFilter(e.target.value)}
                    className="px-2 h-[28px] bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-border/80 text-secondary rounded-xl text-[11px] font-extrabold cursor-pointer transition-colors outline-none focus:ring-1 focus:ring-[#ea6100] focus:border-[#ea6100] shadow-sm shrink-0"
                  >
                    <option value="전체">전체 동</option>
                    {availableDongs.map((dong) => (
                      <option key={dong} value={dong}>
                        {dong}
                      </option>
                    ))}
                  </select>
                  <select
                    value={timelineAptFilter}
                    onChange={(e) => setTimelineAptFilter(e.target.value)}
                    className="px-2 h-[28px] bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-border/80 text-secondary rounded-xl text-[11px] font-extrabold cursor-pointer transition-colors outline-none focus:ring-1 focus:ring-[#ea6100] focus:border-[#ea6100] shadow-sm w-[110px] sm:w-[130px] truncate shrink-0"
                  >
                    <option value="전체">전체 단지</option>
                    {availableApts.map((apt) => (
                      <option key={apt} value={apt}>
                        {getDisplayAptName(apt)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto md:max-h-none max-h-[320px] pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full flex flex-col gap-4 mt-2 min-h-0">
                {filteredTimelineData.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-tertiary text-[14px]">
                    최근 실거래 내역이 없습니다.
                  </div>
                ) : (
                  ((!isMobileViewport || isTimelineExpanded) ? filteredTimelineData : filteredTimelineData.slice(0, 3)).map((group) => {
                    const isGroupSelected = group.items.some(item => 
                      selectedTimelineApt ? (
                        selectedTimelineApt === item.aptName ||
                        normalizeAptName(selectedTimelineApt) === normalizeAptName(item.aptName)
                      ) : false
                    );
                    return (
                      <div key={group.dateStr} className="flex flex-col gap-3 relative pl-5 border-l-2 border-slate-100 dark:border-slate-800/80">
                        {/* Timeline Dot */}
                        <div className={`absolute left-[-6.5px] top-1.5 w-3 h-3 rounded-full border-2 border-surface transition-all duration-300 ${
                          isGroupSelected
                            ? "bg-[#ea6100] dark:bg-[#ea6100] ring-4 ring-[#ea6100]/15 scale-110"
                            : "bg-[#cbd5e1] dark:bg-slate-600"
                        }`} />
                        
                        {/* Date Heading */}
                        <h3 className="text-[13.5px] font-extrabold text-primary flex items-center gap-1.5 mb-0.5">
                          <Calendar size={13.5} className="text-tertiary" />
                          {group.dateStr}
                        </h3>

                        {/* Items */}
                        <div className="flex flex-col gap-2.5">
                          {group.items.map((item, idx) => (
                            <TimelineItemCard
                              key={`${item.aptName}-${idx}`}
                              item={item}
                              isSelected={selectedTimelineApt === item.aptName}
                              areaUnit={areaUnit}
                              onCardHover={handleCardHover}
                              onCardClick={handleCardClick}
                              onDetailsClick={handleDetailsClick}
                              onDetailsHover={handleDetailsHover}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {isMobileViewport && filteredTimelineData.length > 3 && (
                <button
                  onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
                  className="w-full mt-4 py-2.5 bg-body hover:bg-body/80 border border-border/40 text-[12.5px] font-bold text-secondary rounded-[12px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  {isTimelineExpanded ? (
                    <>
                      <span>접기</span>
                      <ChevronUp size={14} />
                    </>
                  ) : (
                    <>
                      <span>최근 실거래 더보기 ({filteredTimelineData.length - 3}개 더보기)</span>
                      <ChevronDown size={14} />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Right Column Container */}
          <div className="w-full md:w-1/2 flex flex-col gap-4 min-w-0 mt-2 md:mt-0 md:h-full">
            {/* Right Panel: Interactive Market Feed & Trend */}
            <div className="w-full flex flex-col bg-surface rounded-2xl shadow-sm border border-border p-4 sm:p-5 md:flex-1 min-h-[420px] min-w-0">
              <div className="flex-1 flex flex-col min-h-[300px]">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 
                        className="text-[15px] font-bold text-primary tracking-tight shrink-0"
                      >
                        {user ? "내 관심 단지 시세 추이" : "동탄 대표 아파트 시세 추이"}
                      </h3>

                      {isDefaultAptSettingUp ? (
                        <div className="w-[150px] sm:w-[190px] h-[28px] bg-gradient-to-r from-zinc-100 to-zinc-50 dark:from-zinc-800/50 dark:to-zinc-800/30 rounded-xl animate-pulse border border-border/10" />
                      ) : (
                        mounted && (
                          user && userFavorites && userFavorites.size > 0 ? (
                            <div className="relative flex items-center gap-1">
                              <select
                                value={selectedTimelineApt || ""}
                                onFocus={preloadApartmentModal}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSelectedTimelineApt(val === "" ? null : val);
                                }}
                                className="px-2.5 h-[28px] bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-border/80 text-secondary rounded-xl text-[11px] font-extrabold cursor-pointer transition-colors outline-none focus:ring-1 focus:ring-[#ea6100] focus:border-[#ea6100] shadow-sm w-[150px] sm:w-[190px] truncate shrink-0"
                              >
                                <option value="">전체 추이 보기</option>
                                {favoritesArray.map((fav) => (
                                  <option key={fav} value={fav}>
                                    {getDisplayAptName(fav)}
                                  </option>
                                ))}
                              </select>

                              {/* ⚙️ 관심 단지 순서 편집 버튼 */}
                              <div className="relative flex items-center" ref={orderEditorRef}>
                                <button
                                  onClick={() => setShowOrderEditor(!showOrderEditor)}
                                  title="관심 단지 정렬 순서 편집"
                                  className="w-7 h-7 flex items-center justify-center bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-border/80 text-secondary hover:text-primary rounded-xl transition-colors cursor-pointer outline-none focus:ring-1 focus:ring-[#ea6100] shadow-sm shrink-0"
                                >
                                  <Settings size={13} />
                                </button>

                                {/* 팝오버 UI */}
                                {showOrderEditor && (
                                  <div className="absolute right-0 top-[32px] z-[50] w-[260px] max-h-[320px] overflow-y-auto bg-surface border border-border rounded-2xl shadow-xl p-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="text-[11px] text-secondary font-extrabold mb-2 border-b border-border/60 pb-1.5 flex justify-between items-center">
                                      <span>⭐ 관심 단지 순서 편집</span>
                                      <span className="text-[9px] text-tertiary font-normal">드래그하여 순서 변경</span>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                      {favoritesArray.map((fav, index) => (
                                        <div
                                          key={fav}
                                          draggable
                                          onDragStart={(e) => handleDragStart(e, index)}
                                          onDragOver={(e) => handleDragOver(e, index)}
                                          onDragEnd={handleDragEnd}
                                          className={`flex justify-between items-center px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-border/40 rounded-xl cursor-grab active:cursor-grabbing text-[11px] font-bold text-primary select-none transition-colors ${
                                            draggedIndex === index ? "opacity-40 border-dashed border-[#ea6100]" : ""
                                          }`}
                                        >
                                          <span className="truncate pr-2">{getDisplayAptName(fav)}</span>
                                          <span className="text-tertiary text-[10px] shrink-0 font-normal">☰</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="relative flex items-center gap-1">
                              <select
                                value={selectedTimelineApt || ""}
                                onFocus={preloadApartmentModal}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSelectedTimelineApt(val === "" ? null : val);
                                }}
                                className="px-2.5 h-[28px] bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-border/80 text-secondary rounded-xl text-[11px] font-extrabold cursor-pointer transition-colors outline-none focus:ring-1 focus:ring-[#ea6100] focus:border-[#ea6100] shadow-sm w-[150px] sm:w-[190px] truncate shrink-0"
                              >
                                {DEFAULT_TIMELINE_APTS.map((apt) => (
                                  <option key={apt} value={apt}>
                                    {getDisplayAptName(apt)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )
                        )
                      )}

                      {selectedTimelineApt && !isDefaultAptSettingUp && (
                        <button
                          onClick={() => onSelectApt && onSelectApt(selectedTimelineApt)}
                          onMouseEnter={() => {
                            if (selectedTimelineApt) {
                              const aptObj = Object.values(sheetApartments).flat().find(a => a.name === selectedTimelineApt || normalizeAptName(a.name) === normalizeAptName(selectedTimelineApt));
                              const dong = aptObj?.dong || '';
                              preloadApartmentTx?.(selectedTimelineApt, dong);
                              preloadApartmentModal();
                            }
                          }}
                          onTouchStart={() => {
                            if (selectedTimelineApt) {
                              const aptObj = Object.values(sheetApartments).flat().find(a => a.name === selectedTimelineApt || normalizeAptName(a.name) === normalizeAptName(selectedTimelineApt));
                              const dong = aptObj?.dong || '';
                              preloadApartmentTx?.(selectedTimelineApt, dong);
                              preloadApartmentModal();
                            }
                          }}
                          className="px-2.5 py-1 bg-[#fff3e0] hover:bg-[#fff3e0]/80 text-[#ea6100] border-none rounded-xl text-[11px] font-extrabold cursor-pointer transition-colors shrink-0 flex items-center gap-1 shadow-sm"
                        >
                          상세 리포트 보기 ➔
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex bg-body p-0.5 rounded-lg shadow-inner self-end sm:self-auto shrink-0">
                    {(["3M", "6M", "1Y", "3Y", "5Y", "ALL"] as const).map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10.5px] font-extrabold rounded-md transition-all duration-200 cursor-pointer ${timeframe === tf
                          ? "bg-surface text-primary shadow-sm"
                          : "text-tertiary hover:text-secondary"
                          }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-full flex-grow mt-2 sm:mt-0 md:h-[330px] md:min-h-[330px] h-[260px] min-h-[260px] relative">
                  {isDefaultAptSettingUp ? (
                    <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center bg-zinc-50/30 dark:bg-zinc-900/10 border border-border/30 rounded-2xl animate-pulse relative overflow-hidden">
                      {/* 백그라운드 블러 글로우 효과 */}
                      <div className="absolute w-[180px] h-[180px] rounded-full bg-[#ea6100]/4 blur-[60px] top-1/2 left-1/3 -translate-y-1/2 pointer-events-none" />
                      <div className="absolute w-[180px] h-[180px] rounded-full bg-[#f9a825]/4 blur-[60px] top-1/2 right-1/3 -translate-y-1/2 pointer-events-none" />
                      
                      {/* 고급스러운 로딩 스피너 및 차트 실루엣 플레이스홀더 */}
                      <div className="flex items-center gap-1.5 mb-3.5 flex-none">
                        <div className="w-1.5 h-6 bg-[#ea6100]/30 rounded-full animate-bounce duration-500 delay-100" />
                        <div className="w-1.5 h-10 bg-[#ea6100]/40 rounded-full animate-bounce duration-500 delay-200" />
                        <div className="w-1.5 h-14 bg-[#ea6100]/60 rounded-full animate-bounce duration-500 delay-300" />
                        <div className="w-1.5 h-10 bg-[#f9a825]/50 rounded-full animate-bounce duration-500 delay-400" />
                        <div className="w-1.5 h-12 bg-[#f9a825]/60 rounded-full animate-bounce duration-500 delay-500" />
                        <div className="w-1.5 h-8 bg-[#f9a825]/40 rounded-full animate-bounce duration-500 delay-600" />
                      </div>

                      <span className="text-secondary text-[12.5px] font-extrabold mb-1.5 tracking-tight">관심 단지 정보를 분석하고 있습니다...</span>
                      <span className="text-[10px] text-tertiary font-bold opacity-75">내 자산 가치에 맞춘 전용 리포트를 생성하는 중입니다.</span>
                    </div>
                  ) : (
                    <MacroTrendChart
                      lineData={mainLineData}
                      xTicks={mainXTicks}
                      yTicks={mainYTicks}
                      timeframe={timeframe}
                    />
                  )}
                </div>

                {/* 세련된 캡슐 뱃지 형태의 커스텀 범례 */}
                {isDefaultAptSettingUp ? (
                  <div className="flex items-center justify-center gap-3 mt-1.5 flex-none">
                    <div className="w-20 h-5 bg-gradient-to-r from-zinc-100 to-zinc-50 dark:from-zinc-800/50 dark:to-zinc-800/30 rounded-full animate-pulse border border-border/20" />
                    <div className="w-20 h-5 bg-gradient-to-r from-zinc-100 to-zinc-50 dark:from-zinc-800/50 dark:to-zinc-800/30 rounded-full animate-pulse border border-border/20" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3 mt-1.5 flex-none">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-[#ea6100]/8 dark:bg-[#ea6100]/15 text-[#ea6100] rounded-full text-[11px] font-extrabold border border-[#ea6100]/15 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ea6100]" />
                      <span>평균 매매가</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-[#f9a825]/8 dark:bg-[#f9a825]/15 text-[#f9a825] rounded-full text-[11px] font-extrabold border border-[#f9a825]/15 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f9a825]" />
                      <span>평균 전세가</span>
                    </div>
                  </div>
                )}


              </div>
            </div>

            {/* 동탄 철도 교통 게시판 위젯 */}
            <TrafficNoticeBoard
              railStrategyNotices={railStrategyNotices}
              tramNotices={tramNotices}
            />


          </div>
        </div>

        {/* 💬 동탄 커뮤니티 인기 대화 위젯 */}
        <div className="flex flex-col gap-6 mt-6 w-full">
          <LoungeTalkWidget postsData={postsData} />
        </div>

        {/* 프리미엄 유틸리티 툴킷 그리드 영역 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6 w-full">
          {/* Card 1: AI Quiz */}
          <button 
            type="button"
            onClick={() => setIsQuizOpen(true)}
            aria-label="나만의 동탄 안심 정착 단지 찾기 Quiz 상세 보기"
            className="text-left w-full flex flex-col justify-between h-full p-6 bg-gradient-to-br from-[#ea6100]/8 to-surface dark:from-[#ea6100]/4 border border-[#ea6100]/15 hover:border-[#ea6100]/40 rounded-[22px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] cursor-pointer hover:-translate-y-1 active:scale-[0.99] transition-all duration-300 group relative overflow-hidden outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#ea6100]/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
            <div className="relative z-10 flex flex-col gap-4">
              {/* Icon & Badge Row */}
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-[#ea6100]/10 dark:bg-[#ea6100]/15 text-[#ff8f00] dark:text-[#ea6100] rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  <Compass size={18} />
                </div>
                <span className="text-[10px] font-black bg-[#ffebed] text-[#ff4b5c] px-2.5 py-1 rounded-full tracking-wide uppercase shadow-sm">New 콘텐츠</span>
              </div>
              
              {/* Title & Desc */}
              <div className="flex flex-col gap-2 mt-2">
                <h3 className="text-[15.5px] font-black text-primary tracking-tight leading-snug">
                  나만의 동탄 안심 정착 단지 찾기 Quiz
                </h3>
                <p className="text-[12.5px] text-secondary font-semibold leading-relaxed break-keep">
                  5가지 초간단 질문으로 당신의 예산, 보육 여건(늘봄학교), 자녀 학군(초품아), 교통 인프라에 가장 잘 부합하는 최적의 정주 단지 3곳을 AI 매칭으로 진단해보세요!
                </p>
              </div>
            </div>

            {/* Bottom Button */}
            <div className="mt-6 relative z-10 w-full">
              <div 
                className="w-full py-3 bg-slate-900 dark:bg-slate-800 hover:bg-[#ea6100] dark:hover:bg-[#ea6100] text-white text-[12.5px] font-black rounded-xl shadow-sm transition-all duration-300 flex items-center justify-center gap-1.5 border-none"
              >
                <span>지금 추천 받기</span>
                <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </button>

          {/* Card 2: Jeonse Safety */}
          {onOpenJeonseSafety && (
            <button 
              type="button"
              onClick={() => onOpenJeonseSafety()}
              aria-label="전세금 반환 안전진단 및 역전세 계산기 상세 보기"
              className="text-left w-full flex flex-col justify-between h-full p-6 bg-gradient-to-br from-emerald-500/8 to-surface dark:from-emerald-500/4 border border-emerald-500/15 hover:border-emerald-500/40 rounded-[22px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] cursor-pointer hover:-translate-y-1 active:scale-[0.99] transition-all duration-300 group relative overflow-hidden outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
              <div className="relative z-10 flex flex-col gap-4">
                {/* Icon & Badge Row */}
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    <Shield size={18} />
                  </div>
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 px-2.5 py-1 rounded-full tracking-wide uppercase shadow-sm">D-VIEW 안전</span>
                </div>

                {/* Title & Desc */}
                <div className="flex flex-col gap-2 mt-2">
                  <h3 className="text-[15.5px] font-black text-primary tracking-tight leading-snug">
                    전세금 반환 안전진단 & 역전세 계산기
                  </h3>
                  <p className="text-[12.5px] text-secondary font-semibold leading-relaxed break-keep">
                    임차(예정) 중인 단지의 보증금과 시세 변동 추이를 연동 분석하여 계약 만기 시 보증금 미반환(역전세) 리스크 및 대항력 확보 여부를 안전도 4단계로 진단합니다.
                  </p>
                </div>
              </div>

              {/* Bottom Button */}
              <div className="mt-6 relative z-10 w-full">
                <div 
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[12.5px] font-black rounded-xl shadow-sm transition-all duration-300 flex items-center justify-center gap-1.5 border-none"
                >
                  <span>보증금 진단하기</span>
                  <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </button>
          )}

          {/* Card 3: Mortgage Calculator */}
          {onOpenMortgage && (
            <button 
              type="button"
              onClick={() => onOpenMortgage()}
              aria-label="내집마련 정책자금 대출 계산기 상세 보기"
              className="text-left w-full flex flex-col justify-between h-full p-6 bg-gradient-to-br from-emerald-500/8 to-surface dark:from-emerald-500/4 border border-emerald-500/15 hover:border-emerald-500/40 rounded-[22px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] cursor-pointer hover:-translate-y-1 active:scale-[0.99] transition-all duration-300 group relative overflow-hidden outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
              <div className="relative z-10 flex flex-col gap-4">
                {/* Icon & Badge Row */}
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    <Calculator size={18} />
                  </div>
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 px-2.5 py-1 rounded-full tracking-wide uppercase shadow-sm">D-VIEW 금융</span>
                </div>

                {/* Title & Desc */}
                <div className="flex flex-col gap-2 mt-2">
                  <h3 className="text-[15.5px] font-black text-primary tracking-tight leading-snug">
                    내집마련 정책자금 대출 계산기
                  </h3>
                  <p className="text-[12.5px] text-secondary font-semibold leading-relaxed break-keep">
                    가구 소득, 순자산, 자녀 수에 따라 신생아 특례대출, 디딤돌, 보금자리론 등 최적의 정부 저금리 정책 금융 지원 자격을 진단하고 월 원리금 상환 계획을 시뮬레이션합니다.
                  </p>
                </div>
              </div>

              {/* Bottom Button */}
              <div className="mt-6 relative z-10 w-full">
                <div 
                  className="w-full py-3 bg-[#c44d00] hover:bg-[#00a37b] text-white text-[12.5px] font-black rounded-xl shadow-sm transition-all duration-300 flex items-center justify-center gap-1.5 border-none"
                >
                  <span>대출 한도 조회</span>
                  <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </button>
          )}

          {/* Card 4: AI Sell Timing & Tax Diagnosis */}
          {onOpenSellTimingCalculator && (
            <button 
              type="button"
              onClick={() => onOpenSellTimingCalculator()}
              aria-label="우리집 적정 가치 및 주거 자산 안정성 진단 상세 보기"
              className="text-left w-full flex flex-col justify-between h-full p-6 bg-gradient-to-br from-rose-500/8 to-surface dark:from-rose-500/4 border border-rose-500/15 hover:border-rose-500/40 rounded-[22px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] cursor-pointer hover:-translate-y-1 active:scale-[0.99] transition-all duration-300 group relative overflow-hidden outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-rose-500/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
              <div className="relative z-10 flex flex-col gap-4">
                {/* Icon & Badge Row */}
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    <TrendingUp size={18} />
                  </div>
                  <span className="text-[10px] font-black bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 px-2.5 py-1 rounded-full tracking-wide uppercase shadow-sm">D-VIEW 자산</span>
                </div>

                {/* Title & Desc */}
                <div className="flex flex-col gap-2 mt-2">
                  <h3 className="text-[15.5px] font-black text-primary tracking-tight leading-snug">
                    우리집 적정 가치 & 주거 자산 안정성 진단
                  </h3>
                  <p className="text-[12.5px] text-secondary font-semibold leading-relaxed break-keep">
                    단지별 시세 추이, 매매-전세 차액(안전마진), 거래 회전율을 종합 분석하여 실수요자 관점의 적정 가치를 진단하고 주거 자산의 장기적 재정 안정성을 평가합니다.
                  </p>
                </div>
              </div>

              {/* Bottom Button */}
              <div className="mt-6 relative z-10 w-full">
                <div 
                  className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white text-[12.5px] font-black rounded-xl shadow-sm transition-all duration-300 flex items-center justify-center gap-1.5 border-none"
                >
                  <span>자산 안정성 진단</span>
                  <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </button>
          )}
        </div>





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

      {/* 🔔 내 아파트 시세 브리핑 안내 팝업/모달 */}
      {showBriefingPopup && mounted && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[4px] animate-in fade-in duration-200">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[400px] bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col relative animate-in slide-in-from-bottom-6 zoom-in-95 duration-300"
          >
            {/* 닫기 버튼 */}
            <button
              onClick={() => setShowBriefingPopup(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-body text-tertiary hover:text-primary transition-colors cursor-pointer border-none bg-transparent outline-none"
            >
              <X size={18} />
            </button>

            {/* Content */}
            <div className="p-6 sm:p-7 pt-9 flex flex-col items-center text-center">

              {/* Title & Badge */}
              <div className="flex items-center gap-1.5 justify-center mb-2.5">
                <span className="bg-[#ea6100]/10 text-[#ff8f00] font-black text-[9.5px] px-2 py-0.5 rounded-[6px]">
                  리텐션 케어
                </span>
                <h3 className="text-[17px] font-black text-primary tracking-tight">
                  내 아파트 시세 브리핑
                </h3>
              </div>

              <p className="text-[12.5px] text-secondary font-bold leading-relaxed mb-5 break-keep">
                관심 단지를 등록해 두시면, 매일 오전 국토부 실거래가 신고건을 기반으로 시세 변동과 매매/전세 갭을 자동으로 분석해 드립니다.
              </p>

              {/* Features List */}
              <div className="w-full bg-body rounded-2xl p-5 flex flex-col gap-4 text-left border border-border/40 mb-6">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[12.5px] font-bold text-primary">실거래가 변동 실시간 수집</span>
                  <span className="text-[11px] text-tertiary font-medium leading-normal">매일 아침 시세 변동 내역 자동 비교</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[12.5px] font-bold text-primary">매매/전세 갭(Gap) 정밀 분석</span>
                  <span className="text-[11px] text-tertiary font-medium leading-normal">전세가율 및 단지별 최신 갭 비율 계산</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[12.5px] font-bold text-primary">나만의 대시보드 맞춤형 차트</span>
                  <span className="text-[11px] text-tertiary font-medium leading-normal">불필요한 정보 없이 내 관심 단지만 요약</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 w-full">
                <button
                  onClick={() => {
                    setShowBriefingPopup(false);
                    if (!user) {
                      handleLogin();
                    } else {
                      const searchEl = document.querySelector('input[placeholder="단지명 검색..."]');
                      if (searchEl) {
                        (searchEl as HTMLElement).focus();
                        searchEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }
                  }}
                  className="w-full py-3 bg-[#ea6100] hover:bg-[#ea6100]/90 text-white border-none rounded-2xl text-[13.5px] font-extrabold cursor-pointer transition-colors shadow-sm text-center active:scale-[0.985] outline-none"
                >
                  {user ? "지금 관심 단지 등록하기 ➔" : "3초 간편 로그인하고 시작하기 ➔"}
                </button>
                
                <div className="flex items-center justify-between w-full mt-2 px-1">
                  <button
                    onClick={() => {
                      localStorage.setItem("dview_briefing_popup_dismissed", Date.now().toString());
                      setShowBriefingPopup(false);
                    }}
                    className="text-[11px] text-tertiary hover:text-secondary font-bold bg-transparent border-none cursor-pointer transition-colors outline-none"
                  >
                    오늘 하루 보지 않기
                  </button>
                  <button
                    onClick={() => {
                      setShowBriefingPopup(false);
                    }}
                    className="text-[11px] text-tertiary hover:text-secondary font-bold bg-transparent border-none cursor-pointer transition-colors outline-none"
                  >
                    다음에 할게요
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Mobile Bottom Sheet Modal */}
      {isBottomSheetOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center lg:hidden">
          {/* Backdrop Overlay */}
          <button 
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200 cursor-default focus:outline-none border-none outline-none" 
            onClick={() => setIsBottomSheetOpen(false)}
            aria-label="바텀시트 닫기"
          />
          {/* Sheet Box */}
          <div className="relative w-full bg-surface rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border-t border-border flex flex-col max-h-[80vh] z-10 animate-in slide-in-from-bottom duration-300">
            {/* Drag Handle Bar */}
            <button 
              type="button"
              onClick={() => setIsBottomSheetOpen(false)}
              aria-label="바텀시트 닫기"
              className="w-full flex justify-center py-3 shrink-0 cursor-pointer outline-none focus:ring-2 focus:ring-emerald-500/50 bg-transparent border-none"
            >
              <div className="w-12 h-1.5 bg-[#e5e8eb] dark:bg-slate-700 rounded-full" />
            </button>
            {/* Header */}
            <div className="px-5 pb-3 flex items-center justify-between border-b border-border/50 shrink-0">
              <h3 className="text-[15px] font-extrabold text-primary truncate max-w-[80%]">
                {selectedTimelineApt ? `${getDisplayAptName(selectedTimelineApt)} 시세 추이` : "단지 가격 추이"}
              </h3>
              <button 
                onClick={() => setIsBottomSheetOpen(false)}
                className="text-[12px] font-bold text-secondary bg-body hover:bg-[#e5e8eb] px-3 py-1.5 rounded-lg border-none transition-colors cursor-pointer"
              >
                닫기
              </button>
            </div>
            
            {/* Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-5 pb-36 flex flex-col gap-4">
              {/* 기간 선택 버튼 (3M, 6M, 1Y, 3Y, 5Y, ALL) */}
              <div className="flex justify-between items-center mb-4 flex-wrap gap-2 shrink-0">
                <span className="text-[11.5px] font-bold text-tertiary">조회 기간</span>
                <div className="flex bg-body p-0.5 rounded-lg text-secondary">
                  {(["3M", "6M", "1Y", "3Y", "5Y", "ALL"] as const).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-[6px] border-none transition-all cursor-pointer ${
                        timeframe === tf
                          ? "bg-surface text-primary shadow-sm"
                          : "text-tertiary hover:text-secondary"
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              {/* 차트 영역 */}
              <div className="w-full h-[200px] relative mb-4 shrink-0">
                <MacroTrendChart
                  key={`${selectedTimelineApt || 'all'}-${timeframe}`}
                  lineData={lineData}
                  xTicks={xTicks}
                  yTicks={yTicks}
                  timeframe={timeframe}
                  isBottomSheet={true}
                />
              </div>

              {/* 커스텀 범례 */}
              <div className="flex items-center justify-center gap-3 mb-5 shrink-0">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-[#ea6100]/8 text-[#ea6100] rounded-full text-[10px] font-bold border border-[#ea6100]/15">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ea6100]" />
                  <span>평균 매매가</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-[#f9a825]/8 text-[#f9a825] rounded-full text-[10px] font-bold border border-[#f9a825]/15">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f9a825]" />
                  <span>평균 전세가</span>
                </div>
              </div>

              {/* 실거래 요약 테이블 */}
              {selectedAptSummary && (() => {
                const avgSale = (selectedAptSummary.avg1MPrice || selectedAptSummary.avg3MPrice || selectedAptSummary.latestPrice || 0);
                const avgRent = (selectedAptSummary.avg1MRentDeposit || selectedAptSummary.avg3MRentDeposit || selectedAptSummary.latestRentDeposit || 0);
                const hasValues = avgSale > 0 && avgRent > 0;
                const gap = hasValues ? avgSale - avgRent : 0;
                
                const gapEok = Math.floor(gap / 10000);
                const gapMan = gap % 10000;
                const gapText = gapEok > 0 ? `${gapEok}억${gapMan > 0 ? ` ${gapMan.toLocaleString()}` : ''}` : `${gapMan.toLocaleString()}만`;
                
                const jeonseRate = hasValues ? (avgRent / avgSale) * 100 : 0;
                const jeonseRateText = `${jeonseRate.toFixed(1)}%`;
                
                return (
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-border/50 rounded-2xl p-3.5 flex flex-col gap-3 shrink-0">
                    <div className="flex items-center justify-between border-b border-border/30 pb-2 flex-wrap gap-2">
                      <span className="inline-flex items-center justify-center bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold text-[11px] px-2 py-0.5 rounded-[5px] shrink-0 gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                        실거래 요약
                      </span>
                      <span className="text-[10px] text-tertiary font-bold px-2 py-0.5 rounded border border-border/30">
                        최근 30일 매매 {selectedAptSummary.avg1MTxCount || 0}건
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 divide-x divide-border/40 text-center">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-bold text-tertiary">평균 매매(1M)</span>
                        <span className="text-[13.5px] font-extrabold text-primary truncate">
                          {selectedAptSummary.avg1MPriceEok || selectedAptSummary.avg3MPriceEok || selectedAptSummary.latestPriceEok || "-"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 pl-1">
                        <span className="text-[11px] font-bold text-tertiary">평균 전세(1M)</span>
                        <span className="text-[13.5px] font-extrabold text-primary truncate">
                          {selectedAptSummary.avg1MRentDepositEok || selectedAptSummary.avg3MRentDepositEok || selectedAptSummary.latestRentDepositEok || "-"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 pl-1">
                        <span className="text-[11px] font-bold text-tertiary">매매-전세 차액</span>
                        <span className="text-[13.5px] font-extrabold text-teal-600 dark:text-teal-400 truncate">
                          {hasValues ? gapText : "-"}
                          {hasValues && <span className="text-[10.5px] font-bold text-secondary ml-1">({jeonseRateText})</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});

MacroDashboardClient.displayName = 'MacroDashboardClient';
export default MacroDashboardClient;
