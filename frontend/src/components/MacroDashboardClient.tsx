import React, { useMemo, useState, useDeferredValue, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { safeReload } from "@/lib/utils/safeReload";
const MacroTrendChart = dynamic(() => import("./MacroTrendChart").catch(err => {
  console.warn('MacroTrendChart Chunk Load failure, initiating fallback reload', err);
  safeReload('MacroTrendChart');
  return { default: () => null };
}), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[200px] flex items-center justify-center bg-body/50 rounded-2xl animate-pulse">
      <span className="text-tertiary text-[13px] font-bold">차트 로드 중...</span>
    </div>
  )
});
const AptFitFinder = dynamic(() => import("./consumer/AptFitFinder").catch(err => {
  console.warn('AptFitFinder Chunk Load failure, initiating fallback reload', err);
  safeReload('AptFitFinder');
  return { default: () => null };
}), {
  ssr: false,
});

import type { DongApartment } from "@/lib/dong-apartments";
import type { AptTxSummary, DongtanMacroTrendPoint } from "@/lib/types/transaction";
import type { FieldReportData } from "@/lib/types/report.types";
import { normalizeAptName, findTxKey, findTypeMapEntry, getDisplayAptName } from "@/lib/utils/apartmentMapping";
import { haversineDistance } from "@/lib/utils/haversine";
import { useSettings } from "@/lib/contexts/SettingsContext";
import { useAuth } from "@/hooks/useAuth";
import FloatingUserBar from "@/components/FloatingUserBar";
import PageHeroHeader from "./PageHeroHeader";
import {
  ArrowUp,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Building2,
  Compass,
  Shield,
  Calculator,
  TrendingDown,
  Train,
  ArrowRight,
  Settings,
} from "lucide-react";
import { NativeAdPlaceholder } from "@/components/ui/NativeAdPlaceholder";

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
  onSelectApt?: (name: string) => void;
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
  typeMap?: Record<string, Record<string, { typeM2: string; typePyeong: string }>>;
  updateFavoriteOrder?: (newOrder: string[]) => Promise<void>;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

const COLORS = [
  "#00d29d",
  "#4196f7",
  "#f9a825",
  "#f04452",
  "#b0b8c1",
];
const LINE_COLORS = ["#b0b8c1", "#00d29d", "#f04452", "#00a261", "#f9a825"];

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
  color = "#00d29d",
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

  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.03)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] border min-h-[82px] sm:min-h-[88px] md:min-h-[96px] h-auto min-w-0 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] group/card bg-[var(--card-bg-gradient)] dark:bg-[var(--card-bg-gradient-dark)] border-[var(--card-border)] dark:border-[var(--card-border-dark)] ${
        onClick
          ? "cursor-pointer hover:-translate-y-1 hover:scale-[1.01] hover:border-[var(--card-border-hover)] dark:hover:border-[var(--card-border-hover-dark)] hover:shadow-[0_12px_24px_var(--card-glow)] dark:hover:shadow-[0_12px_32px_var(--card-glow-dark)] active:scale-[0.98]"
          : "cursor-default"
      } ${className || ""}`}
      style={cardStyle}
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
    </div>
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
  const deltaMan = Math.round(deltaEok * 10000);
  if (isNaN(deltaMan)) return "";
  if (deltaMan >= 10000) {
    const eok = Math.floor(deltaMan / 10000);
    const man = deltaMan % 10000;
    return man === 0 ? `+${eok}억` : `+${eok}억 ${man.toLocaleString()}만`;
  }
  return `+${deltaMan.toLocaleString()}만`;
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

const parsePriceEokHelper = (priceStr: string): number => {
  if (typeof priceStr !== 'string') return 0;
  let total = 0;
  const clean = priceStr.replace(/,/g, '').trim();
  if (clean.includes('억')) {
    const parts = clean.split('억');
    total += parseFloat(parts[0]) || 0;
    if (parts[1]) {
      const tenMillion = parseFloat(parts[1].replace(/[^0-9.]/g, '')) || 0;
      total += tenMillion / 10000;
    }
  } else {
    const val = parseFloat(clean.replace(/[^0-9.]/g, '')) || 0;
    total += val / 10000;
  }
  return total;
};

export default function MacroDashboardClient({
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
  typeMap = {},
  updateFavoriteOrder,
}: MacroDashboardProps) {
  const { areaUnit } = useSettings();
  const { user, isLoading: authLoading, handleLogin } = useAuth();
  const [gapRankingDong, setGapRankingDong] = useState<string>("전체");
  const { data: globalVotesData } = useSWR('/api/apartments/vote?aptName=global', fetcher);
  const { data: noticesData, error: noticesError, mutate: mutateNotices } = useSWR('/api/local-notices', fetcher);
  const { data: locationScores } = useSWR<Record<string, any>>('/data/location-scores.json', fetcher);
  const { data: postsData } = useSWR('/api/posts?limit=50', fetcher);
  const noticesLoading = !noticesData && !noticesError;



  const railNotices = useMemo(() => {
    if (!noticesData?.notices) return [];
    const keywords = ['철도', '교통', 'gtx', '트램', '인동선', 'srt', '지하철', '복합환승', '대중교통', '철도교통', '동탄인덕원', '노선', '열차', '정거장', '서해선', '1호선', '신수원선'];
    return noticesData.notices.filter((n: any) => {
      if (n.source === 'rail') return true;
      const titleLower = (n.title || '').toLowerCase();
      return keywords.some(kw => titleLower.includes(kw));
    });
  }, [noticesData]);

  const filteredRailNotices = useMemo(() => {
    if (gapRankingDong === "전체") return railNotices;
    return railNotices.filter((n: any) => {
      const deptMatch = (n.dept || '').includes(gapRankingDong.replace("동", ""));
      const titleMatch = (n.title || '').includes(gapRankingDong);
      return deptMatch || titleMatch;
    });
  }, [railNotices, gapRankingDong]);

  const railStrategyNotices = useMemo(() => {
    return railNotices.filter((n: any) => 
      (n.dept || '').includes('철도') || (n.dept || '').includes('전략')
    );
  }, [railNotices]);

  const tramNotices = useMemo(() => {
    return railNotices.filter((n: any) => 
      (n.dept || '').includes('트램') || (n.dept || '').includes('추진단')
    );
  }, [railNotices]);

  const nextCultureEvent = useMemo(() => {
    if (!noticesData?.notices) return null;
    const cultureNotices = noticesData.notices.filter((n: any) => n.source === 'culture');
    if (cultureNotices.length === 0) return null;
    
    const today = new Date('2026-06-07');
    today.setHours(0, 0, 0, 0);
    
    const upcoming = cultureNotices
      .map((n: any) => {
        const target = new Date(n.date);
        target.setHours(0, 0, 0, 0);
        const diff = target.getTime() - today.getTime();
        const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return { notice: n, diffDays };
      })
      .filter((item: any) => item.diffDays >= 0)
      .sort((a: any, b: any) => a.diffDays - b.diffDays);
      
    return upcoming[0] || null;
  }, [noticesData]);

  const renderAreaLabel = (areaPyeong: number, area?: number) => {
    if (areaUnit === 'm2' && area) {
      return `${Math.round(area)}㎡`;
    }
    return `${Math.round(areaPyeong)}평`;
  };


  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isTooltipActive, setIsTooltipActive] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
    }
  }, []);

  const [chartMode, setChartMode] = useState<string>("30");
  const [timeframe, setTimeframe] = useState<
    "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL"
  >("ALL");
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);

  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 바텀 시트 오픈 시 body 스크롤 방지
  useEffect(() => {
    if (isBottomSheetOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isBottomSheetOpen]);

  const [isScrolled, setIsScrolled] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [selectedTimelineApt, setSelectedTimelineApt] = useState<string | null>(null);
  const [hasSetDefaultApt, setHasSetDefaultApt] = useState(false);

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
    
    // 유저가 로그아웃 상태이거나 관심단지가 없는 경우 초기화 상태 유지
    if (!user || !userFavorites || userFavorites.size === 0) {
      setHasSetDefaultApt(false);
      return;
    }

    // 이미 디폴트 아파트를 설정했거나, 유저가 수동으로 아파트를 선택한 경우 스킵
    if (hasSetDefaultApt || selectedTimelineApt) {
      if (selectedTimelineApt && !hasSetDefaultApt) {
        setHasSetDefaultApt(true);
      }
      return;
    }
    
    // Set의 첫 번째 요소를 기본 관심 단지로 선택
    const firstFav = Array.from(userFavorites)[0];
    if (firstFav) {
      setSelectedTimelineApt(firstFav);
      setHasSetDefaultApt(true);
    }
  }, [user, userFavorites, selectedTimelineApt, mounted, hasSetDefaultApt, isFavoritesLoading]);

  const [aptRealTxData, setAptRealTxData] = useState<any[] | null>(null);
  const [isAptTxLoading, setIsAptTxLoading] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);


  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#fit-quiz") {
      setIsQuizOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // txSummaryData가 아직 로드되지 않은 경우, 올바른 매핑 키를 알 수 없으므로 페칭을 대기합니다.
    if (!txSummaryData || Object.keys(txSummaryData).length === 0) {
      return;
    }

    if (!selectedTimelineApt) {
      setAptRealTxData(null);
      return;
    }
    let active = true;
    setIsAptTxLoading(true);
    const txKey = findTxKey(selectedTimelineApt, txSummaryData, nameMapping) || selectedTimelineApt;
    
    fetch(`/tx-data/${encodeURIComponent(txKey)}.json`)
      .then(res => {
        if (!res.ok) {
          console.warn(`Failed to load tx data for ${txKey}: status ${res.status}`);
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (active && data) {
          setAptRealTxData(data);
        }
      })
      .catch(err => {
        console.error("Error fetching apt real tx data:", err);
        if (active) {
          setAptRealTxData(null);
        }
      })
      .finally(() => {
        if (active) {
          setIsAptTxLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedTimelineApt, txSummaryData, nameMapping, mounted]);




  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const chartContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        chartContainerRef.current &&
        !chartContainerRef.current.contains(e.target as Node)
      ) {
        setActiveIndex(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, {
      passive: true,
    });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Compute max transaction date across all data once
  const maxDateTime = useMemo(() => {
    let maxVal = 0;
    Object.values(txSummaryData).forEach((sum) => {
      if (sum.recent) {
        sum.recent.forEach((tx) => {
          const dt = parseDateHelper(tx.date, sum.latestDate);
          if (dt) {
            const time = dt.getTime();
            if (time > maxVal) {
              maxVal = time;
            }
          }
        });
      }
    });
    if (maxVal === 0) {
      maxVal = new Date("2026-05-26").getTime();
    }
    return maxVal;
  }, [txSummaryData]);

  // 1. Donut Chart Data (실거래 등락 비중 - 상승 vs 하락 vs 보합)
  const donutData = useMemo(() => {
    const daysLimit = chartMode === "30" ? 30 : 90;
    const cutoffTime = maxDateTime - daysLimit * 24 * 60 * 60 * 1000;
    let upCount = 0;
    let downCount = 0;
    let sameCount = 0;

    Object.values(txSummaryData).forEach((sum) => {
      if (!sum.recent || sum.recent.length === 0) return;
      const areaGroups: Record<number, typeof sum.recent> = {};
      sum.recent.forEach((tx) => {
        const areaKey = Math.floor(tx.area);
        if (!areaGroups[areaKey]) {
          areaGroups[areaKey] = [];
        }
        areaGroups[areaKey].push(tx);
      });

      Object.values(areaGroups).forEach((transactions) => {
        const mapped = transactions
          .map((tx) => ({
            tx,
            dt: parseDateHelper(tx.date, sum.latestDate),
          }))
          .filter((item): item is { tx: typeof item.tx; dt: Date } => item.dt !== null);

        const sorted = mapped.sort((a, b) => a.dt.getTime() - b.dt.getTime());

        for (let j = 1; j < sorted.length; j++) {
          const current = sorted[j];
          const prev = sorted[j - 1];
          if (current.dt.getTime() >= cutoffTime) {
            const currentPrice = parsePriceEokHelper(current.tx.priceEok);
            const prevPrice = parsePriceEokHelper(prev.tx.priceEok);
            if (currentPrice > prevPrice) {
              upCount++;
            } else if (currentPrice < prevPrice) {
              downCount++;
            } else if (currentPrice === prevPrice) {
              sameCount++;
            }
          }
        }
      });
    });

    return [
      { name: "상승 거래", value: upCount },
      { name: "하락 거래", value: downCount },
      { name: "보합 거래", value: sameCount },
    ];
  }, [txSummaryData, chartMode, maxDateTime]);

  const [totalHouseholds, publicRentalHouseholds] = useMemo(() => {
    let total = 0;
    let publicRental = 0;
    if (!sheetApartments) return [0, 0];
    Object.values(sheetApartments)
      .flat()
      .forEach((apt) => {
        const hh = apt.householdCount || 0;
        total += hh;
        if (publicRentalSet.has(apt.name)) {
          publicRental += hh;
        }
      });
    return [total, publicRental];
  }, [sheetApartments, publicRentalSet]);

  // 2. Line Chart Data (동탄 아파트 전체 가격 변화 추이 - 실제 데이터)
  const benchmarks = useMemo(() => {
    return ["동탄 아파트 전체"];
  }, []);

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

    const macroTrendList = deferredMacroTrendData;
    const finalChartData = macroTrendList.map((point, idx) => {
      const key = point.name;
      let finalSale = monthlyAverages[key].sale;
      let finalRent = monthlyAverages[key].rent;

      // --- 매매 보간 ---
      if (finalSale === null) {
        if (idx < firstSaleAnchorIndex) {
          finalSale = null;
        } else {
          let lastValidSale = saleAnchorValue;
          for (let j = idx - 1; j >= firstSaleAnchorIndex; j--) {
            const prevKey = macroTrendList[j].name;
            if (monthlyAverages[prevKey].sale !== null) {
              lastValidSale = monthlyAverages[prevKey].sale ?? lastValidSale;
              break;
            }
          }
          finalSale = lastValidSale;
        }
      }

      // --- 전세 보간 ---
      if (finalRent === null) {
        if (idx < firstRentAnchorIndex) {
          finalRent = null;
        } else {
          let lastValidRent = rentAnchorValue;
          for (let j = idx - 1; j >= firstRentAnchorIndex; j--) {
            const prevKey = macroTrendList[j].name;
            if (monthlyAverages[prevKey].rent !== null) {
              lastValidRent = monthlyAverages[prevKey].rent ?? lastValidRent;
              break;
            }
          }
          finalRent = lastValidRent;
        }
      }

      // 전세 거래내역 그래프는 첫 매매 그래프가 생긴시점부터 시작되도록
      if (realFirstSaleIndex !== -1 && idx < realFirstSaleIndex) {
        finalRent = null;
        finalSale = null;
      }

      return {
        name: key,
        '동탄 아파트 전체': finalSale !== null ? Math.round(finalSale * 100) / 100 : null,
        '동탄 아파트 전세 평균': finalRent !== null ? Math.round(finalRent * 100) / 100 : null,
      };
    });

    let sliceIndex = -1;
    if (realFirstSaleIndex !== -1) {
      sliceIndex = realFirstSaleIndex;
    } else if (realFirstRentIndex !== -1) {
      sliceIndex = realFirstRentIndex;
    }

    if (sliceIndex !== -1) {
      return finalChartData.slice(sliceIndex);
    }

    return finalChartData;
  }, [selectedAptSummary, deferredMacroTrendData, aptRealTxData]);

  const getAptBriefingMessage = React.useCallback((summary: AptTxSummary, aptName: string) => {
    const isFav = userFavorites?.has(aptName);
    const prefix = isFav ? "⭐ 관심 단지 리포트: " : "📊 단지 요약: ";
    
    const txCount = summary.avg1MTxCount || summary.avg3MTxCount || 0;
    const priceStr = summary.avg1MPriceEok || summary.avg3MPriceEok || summary.latestPriceEok || "-";
    const rentStr = summary.avg1MRentDepositEok || summary.avg3MRentDepositEok || summary.latestRentDepositEok || "-";
    
    if (txCount === 0) {
      return `${prefix}${aptName}은 최근 30일간 실거래 내역이 없지만, 직전 거래 기준 매매 ${priceStr}, 전세 ${rentStr}선에 시세가 형성되어 있습니다.`;
    }
    
    const saleVal = summary.avg1MPrice || summary.avg3MPrice || summary.latestPrice || 0;
    const rentVal = summary.avg1MRentDeposit || summary.avg3MRentDeposit || summary.latestRentDeposit || 0;
    const gapVal = saleVal - rentVal;
    let gapStr = "-";
    if (gapVal > 0) {
      gapStr = `${(gapVal / 10000).toFixed(1)}억`;
    }
    
    const rentRate = saleVal > 0 ? Math.round((rentVal / saleVal) * 100) : 0;
    
    return `${prefix}${aptName}은 최근 30일 동안 ${txCount}건의 실거래가 발생했습니다. 평균 매매 ${priceStr}, 평균 전세 ${rentStr}선이며, 예상 갭투자금은 약 ${gapStr} (전세가율 ${rentRate}%) 수준입니다.`;
  }, [userFavorites]);

  const lineData = useMemo(() => {
    const sourceData = selectedAptChartData || deferredMacroTrendData;
    if (!sourceData) return [];
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
    else if (timeframe === "ALL") step = 24; // 2년 간격

    // 항상 최신 달(가장 오른쪽)부터 역순으로 균등하게 범례를 추출
    for (let i = total - 1; i >= 0; i -= step) {
      ticks.unshift(lineData[i].name);
    }
    return ticks;
  }, [lineData, timeframe]);

  const mainLineData = useMemo(() => {
    if (isMobileViewport) {
      const sourceData = deferredMacroTrendData;
      if (!sourceData) return [];
      let count = sourceData.length;
      switch (timeframe) {
        case "3M": count = 3; break;
        case "6M": count = 6; break;
        case "1Y": count = 12; break;
        case "3Y": count = 36; break;
        case "5Y": count = 60; break;
        case "ALL": count = sourceData.length; break;
      }
      return sourceData.slice(-Math.min(count, sourceData.length));
    }
    return lineData;
  }, [isMobileViewport, lineData, deferredMacroTrendData, timeframe]);

  const mainXTicks = useMemo(() => {
    if (isMobileViewport) {
      if (mainLineData.length === 0) return [];
      if (timeframe === "3M" || timeframe === "6M") {
        return mainLineData.map((d) => d.name);
      }
      let step = 1;
      if (timeframe === "1Y") step = 2;
      else if (timeframe === "3Y") step = 6;
      else if (timeframe === "5Y") step = 12;
      else if (timeframe === "ALL") step = 24;

      const ticks = [];
      const total = mainLineData.length;
      for (let i = total - 1; i >= 0; i -= step) {
        ticks.unshift(mainLineData[i].name);
      }
      return ticks;
    }
    return xTicks;
  }, [isMobileViewport, xTicks, mainLineData, timeframe]);

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


  // 1안 Card 3: 최근 7일 동탄 실거래량 & 추세 (WoW)
  const card3Data = useMemo(() => {
    if (recent7DaysVolume) {
      return recent7DaysVolume;
    }
    const limit7 = 7 * 24 * 60 * 60 * 1000;
    const cutoff7 = maxDateTime - limit7;
    const cutoff14 = maxDateTime - 2 * limit7;
    let currentCount = 0;
    let prevCount = 0;

    Object.values(txSummaryData).forEach((sum) => {
      if (sum.recent) {
        sum.recent.forEach((tx) => {
          const dt = parseDateHelper(tx.date, sum.latestDate);
          if (dt) {
            const time = dt.getTime();
            if (time >= cutoff7) {
              currentCount++;
            } else if (time >= cutoff14) {
              prevCount++;
            }
          }
        });
      }
    });

    const diff = currentCount - prevCount;
    const rate = prevCount > 0 ? (diff / prevCount) * 100 : 0;
    const isUp = diff > 0;
    const isDown = diff < 0;
    let trendText = "보합 (0%)";
    let trendColor = "#5d6d7e";

    if (isUp) {
      trendText = `상승 (+${rate.toFixed(1)}%)`;
      trendColor = "#ff4b5c";
    } else if (isDown) {
      trendText = `하락 (${rate.toFixed(1)}%)`;
      trendColor = "#2e7cf6";
    }

    return {
      currentCount,
      prevCount,
      trendText,
      trendColor,
      badge: `${diff >= 0 ? "+" : ""}${diff}건 (${diff >= 0 ? "+" : ""}${rate.toFixed(0)}%)`,
    };
  }, [recent7DaysVolume, txSummaryData, maxDateTime]);

  // 1안 Card 4: 실시간 최고 관심 단지
  const card4Data = useMemo(() => {
    let targetAptName = "-";
    let maxFavorites = 0;

    if (sheetApartments && favoriteCounts) {
      Object.values(sheetApartments)
        .flat()
        .forEach((apt) => {
          if (publicRentalSet.has(apt.name)) return;
          const count = favoriteCounts[apt.name] || 0;
          if (count > maxFavorites) {
            maxFavorites = count;
            targetAptName = apt.name;
          }
        });
    }

    // Fallback: 관심(즐겨찾기) 단지가 아직 없을 시, 리스트 내 임대제외 첫 아파트
    if (targetAptName === "-" && sheetApartments) {
      const firstApt = Object.values(sheetApartments)
        .flat()
        .find((apt) => !publicRentalSet.has(apt.name));
      if (firstApt) {
        targetAptName = firstApt.name;
      }
    }

    return {
      name: targetAptName,
      badge: maxFavorites > 0 ? `관심 ${maxFavorites}명` : "관심 0명",
    };
  }, [sheetApartments, publicRentalSet, favoriteCounts]);

  // 동탄 매수 심리 계산 (Card 2)
  const globalVotes = useMemo(() => {
    const buyCount = globalVotesData?.buyCount || 0;
    const waitCount = globalVotesData?.waitCount || 0;
    const totalVotes = buyCount + waitCount;
    const buyPercent = totalVotes > 0 ? Math.round((buyCount / totalVotes) * 100) : 50;
    
    let sentimentText = "팽팽함";
    if (buyPercent > 55) sentimentText = "매수 우세";
    else if (buyPercent < 45) sentimentText = "관망 우세";

    return {
      buyPercent,
      totalVotes,
      sentimentText,
    };
  }, [globalVotesData]);

  // 동탄 갭투자 1위 (최고 전세가율 단지) 계산
  const gapInvestment1st = useMemo(() => {
    let bestAptName = "-";
    let maxJeonseRate = 0;
    let bestGapText = "-";
    let bestJeonseRateText = "-";

    if (sheetApartments && txSummaryData) {
      const allApts = Object.values(sheetApartments).flat();
      allApts.forEach((apt) => {
        if (publicRentalSet.has(apt.name)) return;
        const txKey = findTxKey(apt.name, txSummaryData, nameMapping);
        if (txKey && txSummaryData[txKey]) {
          const sum = txSummaryData[txKey];
          const avgSale = sum.avg1MPrice || sum.avg3MPrice || sum.latestPrice || 0;
          const avgRent = sum.avg1MRentDeposit || sum.avg3MRentDeposit || sum.latestRentDeposit || 0;

          if (avgSale > 0 && avgRent > 0) {
            const rate = (avgRent / avgSale) * 100;
            if (rate > maxJeonseRate && rate < 98) {
              maxJeonseRate = rate;
              bestAptName = apt.name;
              const gapVal = avgSale - avgRent;
              const fmtGap = formatEokWithUnit(gapVal);
              const gapUnitStr = fmtGap.unit === "만원" ? "만" : fmtGap.unit === "원" ? "" : fmtGap.unit;
              bestGapText = `갭 ${fmtGap.value}${gapUnitStr}`;
              bestJeonseRateText = `전세율 ${rate.toFixed(1)}%`;
            }
          }
        }
      });
    }

    if (bestAptName === "-" || maxJeonseRate === 0) {
      return {
        name: "동탄역 시범 한화꿈에그린",
        jeonseRateText: "전세율 72.4%",
        gapText: "갭 2.3억",
      };
    }

    return {
      name: bestAptName,
      jeonseRateText: bestJeonseRateText,
      gapText: bestGapText,
    };
  }, [sheetApartments, txSummaryData, publicRentalSet, nameMapping]);

  // 동탄 갭투자 Top 5 계산 (필터링 및 리스크 포함)
  const gapInvestmentTop5 = useMemo(() => {
    if (!sheetApartments || !txSummaryData) return [];

    const allApts = Object.values(sheetApartments).flat();
    const result: Array<{
      name: string;
      dong: string;
      gap: number;
      gapText: string;
      jeonseRate: number;
      jeonseRateText: string;
      avgSale: number;
      avgRent: number;
      risks: {
        reverseJeonse: 'safe' | 'warning' | 'danger';
        liquidity: 'safe' | 'warning' | 'danger';
        volatility: 'safe' | 'warning' | 'danger';
      }
    }> = [];

    allApts.forEach((apt) => {
      if (publicRentalSet && publicRentalSet.has && publicRentalSet.has(apt.name)) return;
      if (gapRankingDong !== "전체" && apt.dong !== gapRankingDong) return;

      const txKey = findTxKey(apt.name, txSummaryData, nameMapping);
      if (txKey && txSummaryData[txKey]) {
        const sum = txSummaryData[txKey];
        const avgSale = sum.avg1MPrice || sum.avg3MPrice || sum.latestPrice || 0;
        const avgRent = sum.avg1MRentDeposit || sum.avg3MRentDeposit || sum.latestRentDeposit || 0;

        if (avgSale > 0 && avgRent > 0) {
          const rate = (avgRent / avgSale) * 100;
          if (rate > 50 && rate < 98) {
            const gapVal = avgSale - avgRent;
            const fmtGap = formatEokWithUnit(gapVal);
            const gapUnitStr = fmtGap.unit === "만원" ? "만" : fmtGap.unit === "원" ? "" : fmtGap.unit;

            // 3대 리스크 판정
            // 1) 역전세 리스크
            let reverseJeonse: 'safe' | 'warning' | 'danger' = 'safe';
            if (rate >= 80) reverseJeonse = 'danger';
            else if (rate >= 70) reverseJeonse = 'warning';

            // 2) 유동성 리스크 (3개월 거래수 기준)
            const vol3M = sum.avg3MTxCount || 0;
            let liquidity: 'safe' | 'warning' | 'danger' = 'safe';
            if (vol3M <= 2) liquidity = 'danger';
            else if (vol3M <= 5) liquidity = 'warning';

            // 3) 가격 변동성 리스크 (세대수 기준)
            const household = apt.householdCount || 0;
            let volatility: 'safe' | 'warning' | 'danger' = 'safe';
            if (household < 500) volatility = 'danger';
            else if (household < 1000) volatility = 'warning';

            result.push({
              name: apt.name,
              dong: apt.dong,
              gap: gapVal,
              gapText: `${fmtGap.value}${gapUnitStr}`,
              jeonseRate: rate,
              jeonseRateText: `${rate.toFixed(1)}%`,
              avgSale,
              avgRent,
              risks: {
                reverseJeonse,
                liquidity,
                volatility
              }
            });
          }
        }
      }
    });

    // 정렬: 전세가율 높은 순 -> 갭 금액 적은 순
    return result
      .sort((a, b) => {
        if (Math.abs(b.jeonseRate - a.jeonseRate) > 0.01) {
          return b.jeonseRate - a.jeonseRate;
        }
        return a.gap - b.gap;
      })
      .slice(0, 5);
  }, [sheetApartments, txSummaryData, publicRentalSet, nameMapping, gapRankingDong]);

  // 동탄 전역(혹은 gapRankingDong 필터 기준) 평균 전세가율 연산
  const averageJeonseRateText = useMemo(() => {
    if (!sheetApartments || !txSummaryData) return "71.2%";
    const allApts = Object.values(sheetApartments).flat();
    let totalRate = 0;
    let count = 0;
    allApts.forEach((apt) => {
      if (publicRentalSet && publicRentalSet.has && publicRentalSet.has(apt.name)) return;
      if (gapRankingDong !== "전체" && apt.dong !== gapRankingDong) return;

      const txKey = findTxKey(apt.name, txSummaryData, nameMapping);
      if (txKey && txSummaryData[txKey]) {
        const sum = txSummaryData[txKey];
        const avgSale = sum.avg1MPrice || sum.avg3MPrice || sum.latestPrice || 0;
        const avgRent = sum.avg1MRentDeposit || sum.avg3MRentDeposit || sum.latestRentDeposit || 0;
        if (avgSale > 0 && avgRent > 0) {
          const rate = (avgRent / avgSale) * 100;
          if (rate > 20 && rate < 100) {
            totalRate += rate;
            count++;
          }
        }
      }
    });
    if (count === 0) return "71.2%";
    return `${(totalRate / count).toFixed(1)}%`;
  }, [sheetApartments, txSummaryData, publicRentalSet, nameMapping, gapRankingDong]);

  // 6차 사이클: 일자별 신고가 타임라인 데이터 계산
  const dailyTimelineData = useMemo(() => {
    const groups: Record<string, { dateStr: string; timestamp: number; items: TimelineItem[] }> = {};

    if (!sheetApartments || !txSummaryData) return [];

    // O(1) txKey to Apartment map to prevent duplicate listings and ensure official name usage
    const txKeyToAptMap = new Map<string, DongApartment>();
    const allApts = Object.values(sheetApartments).flat();

    allApts.forEach((apt) => {
      const txKey = findTxKey(apt.name, txSummaryData, nameMapping);
      if (txKey) {
        const existing = txKeyToAptMap.get(txKey);
        if (!existing || apt.name === txKey || normalizeAptName(apt.name) === normalizeAptName(txKey)) {
          txKeyToAptMap.set(txKey, apt);
        }
      }
    });

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

    txKeyToAptMap.forEach((apt, txKey) => {
      if (publicRentalSet && publicRentalSet.has && publicRentalSet.has(apt.name)) return;
      const sum = txSummaryData[txKey];
      if (sum && sum.recent && sum.recent.length > 0) {
        sum.recent.forEach((tx) => {

          const dt = parseDateHelper(tx.date, sum.latestDate);
          if (!dt) return;

          // 미래 혹은 가짜 일자 오차 방어
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

            const t = typeMap ? findTypeMapEntry(typeMap, apt.name, tx.area) : null;
            const labelM2 = t ? t.typeM2 : `${tx.area}㎡`;
            const labelPyeong = t ? (t.typePyeong || t.typeM2) : `${Math.round(tx.areaPyeong)}평`;

            const customAptName = txKeyToCustomNameMap.get(txKey) || txKeyToCustomNameMap.get(normalizeAptName(txKey)) || apt.name;

            groups[dateKey].items.push({
              aptName: apt.name,
              displayAptName: getDisplayAptName(customAptName),
              dong: apt.dong || sum.dong || "",
              priceEok: tx.priceEok,
              priceVal: tx.priceVal || parsePriceEokHelper(tx.priceEok),
              areaPyeong: tx.areaPyeong,
              area: tx.area,
              floor: tx.floor,
              type: tx.isNewHigh ? "high" : "normal",
              delta: tx.isNewHigh ? (tx.newHighDelta || tx.delta || 0) : (tx.delta || 0),
              deltaPercent: tx.deltaPercent || 0,
              prevPriceVal: tx.prevPriceVal,
              areaLabelM2: labelM2,
              areaLabelPyeong: labelPyeong,
            });
          }
        });
      }
    });

    // Sort groups by latest date descending
    return Object.values(groups)
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((group) => {
        // Sort items inside same date by price descending
        const sortedItems = group.items.sort((a, b) => b.priceVal - a.priceVal);
        return {
          ...group,
          items: sortedItems,
        };
      });
  }, [txSummaryData, sheetApartments, publicRentalSet, nameMapping, maxDateTime, typeMap]);








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

  const mainYTicks = useMemo(() => {
    if (isMobileViewport) {
      if (!mainLineData || mainLineData.length === 0) return [0, 2, 4, 6, 8];
      let maxVal = 0;
      mainLineData.forEach((d) => {
        const sale = d["동탄 아파트 전체"] || 0;
        const rent = d["동탄 아파트 전세 평균"] || 0;
        if (sale > maxVal) maxVal = sale;
        if (rent > maxVal) maxVal = rent;
      });

      let step = 2;
      if (maxVal <= 5) step = 1;
      else if (maxVal <= 12) step = 2;
      else if (maxVal <= 24) step = 4;
      else step = 5;

      const roundedMax = Math.ceil(maxVal / step) * step;
      const finalMax = (roundedMax - maxVal < step * 0.1) ? roundedMax + step : roundedMax;

      const ticks = [];
      for (let i = 0; i <= finalMax; i += step) {
        ticks.push(i);
      }
      return ticks;
    }
    return yTicks;
  }, [isMobileViewport, yTicks, mainLineData]);

  return (
    <div className="w-full flex flex-col bg-surface relative">
      <PageHeroHeader 
        title="D-VIEW 데이터 랩"
        compactTitle="D-VIEW 데이터 랩"
        subtitleStrong={
          <>
            데이터 기반 <span className="text-[#00d29d] font-extrabold px-0.5">동탄 아파트</span> 가치 분석
          </>
        }
        subtitleLight="실시간 실거래 분석과 입지 점수로 보는 동탄의 오늘"
        rightContent={
          <div className="hidden sm:flex items-center gap-2">


            {onOpenAdModal && (
              <button
                onClick={onOpenAdModal}
                className="hidden md:flex px-3 py-1.5 bg-body hover:bg-body/80 text-secondary text-[13px] font-bold rounded-[8px] transition-colors items-center gap-1.5"
              >
                <MessageSquare size={14} />
                광고/제휴 문의
              </button>
            )}
          </div>
        }
        rightSideContent={
          <div 
            onClick={onOpenAdModal}
            className="flex items-center gap-4 shrink-0 w-[320px] h-[80px] px-5 bg-gradient-to-br from-teal-500/8 to-emerald-500/3 dark:from-[#0d9488]/10 dark:to-emerald-950/5 border border-[#0d9488]/20 hover:border-[#0d9488]/45 rounded-2xl shadow-[0_4px_20px_rgba(13,148,136,0.03)] hover:shadow-[0_6px_24px_rgba(13,148,136,0.08)] cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl group-hover:bg-teal-500/15 transition-all" />
            <div className="w-10 h-10 bg-teal-50 dark:bg-[#0d9488]/10 text-[#0d9488] dark:text-[#00d29d] rounded-xl flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
              <Building2 size={20} />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-extrabold text-[#0d9488] dark:text-[#00d29d] bg-teal-500/10 px-2 py-0.5 rounded-[6px] tracking-wider uppercase">제휴 모집</span>
                <span className="text-[13px] font-extrabold text-primary tracking-tight truncate">동탄 전문 중개 파트너</span>
              </div>
              <span className="text-[11.5px] text-secondary font-bold group-hover:text-[#0d9488] dark:group-hover:text-[#00d29d] transition-colors leading-snug">
                디뷰에서 귀사의 중개소를 소개해보세요 ➔
              </span>
            </div>
          </div>
        }
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
              </div>

              <div className="flex-1 overflow-y-auto md:max-h-none max-h-[320px] pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full flex flex-col gap-4 mt-2 min-h-0">
                {dailyTimelineData.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-tertiary text-[14px]">
                    최근 실거래 내역이 없습니다.
                  </div>
                ) : (
                  ((!isMobileViewport || isTimelineExpanded) ? dailyTimelineData : dailyTimelineData.slice(0, 3)).map((group) => (
                    <div key={group.dateStr} className="flex flex-col gap-2 relative pl-4 border-l-2 border-[#f2f4f6]">
                      {/* Timeline Dot */}
                      <div className="absolute left-[-6px] top-1.5 w-[10px] h-[10px] rounded-full bg-[#cbd5e1] border-2 border-surface" />
                      
                      {/* Date Heading */}
                      <h3 className="text-[14px] font-extrabold text-primary flex items-center gap-1.5 mb-1.5">
                        {group.dateStr}
                      </h3>

                      {/* Items */}
                      <div className="flex flex-col gap-2">
                        {group.items.map((item, idx) => (
                          <div
                            key={`${item.aptName}-${idx}`}
                            onClick={() => {
                              setSelectedTimelineApt(item.aptName);
                              if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                                setIsBottomSheetOpen(true);
                              }
                            }}
                            className={`flex flex-col p-3 rounded-xl cursor-pointer transition-all border ${
                              selectedTimelineApt === item.aptName
                                ? "border-[#00d29d] bg-[#e0fbf4]/20 ring-1 ring-[#00d29d]/30"
                                : "bg-body hover:bg-body/80 border-transparent hover:border-border"
                            } group gap-1.5`}
                          >
                            {/* 1st Row: Apt Name & High Price Badge */}
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-1.5 min-w-0 max-w-[75%]">
                                <span className="text-[13.5px] sm:text-[14px] font-extrabold text-primary break-keep group-hover:text-[#00d29d] transition-colors leading-tight truncate" title={item.displayAptName || item.aptName}>
                                  {item.displayAptName || item.aptName}
                                </span>
                                {item.type === 'high' && (
                                  <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded bg-[#ffebed] text-[#ff4b5c] shrink-0 whitespace-nowrap animate-pulse">
                                    신고가
                                  </span>
                                )}
                              </div>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap ${
                                item.delta > 0 
                                  ? (item.type === 'high' ? "bg-[#ffebed] text-[#ff4b5c]" : "bg-[#e0fbf4] text-[#00b386]")
                                  : item.delta < 0 
                                    ? "bg-[#eef2ff] text-[#4f46e5] dark:bg-[#312e81] dark:text-[#a5b4fc]" 
                                    : "bg-[#f2f4f6] text-[#8e94a5] dark:bg-[#1e293b] dark:text-[#94a3b8]"
                              }`}>
                                {item.delta > 0 
                                  ? `▲ ${formatDeltaPrice(item.delta)}` 
                                  : item.delta < 0 
                                    ? `▼ ${formatDeltaPrice(Math.abs(item.delta))}` 
                                    : '보합'}
                              </span>
                            </div>

                            {/* 2nd Row: Info & Price & Button */}
                            <div className="flex items-center justify-between text-[11px] text-tertiary">
                              <div className="flex items-center gap-1 min-w-0 font-medium mr-2">
                                <span className="truncate">
                                  {item.dong} · {
                                    areaUnit === 'm2'
                                      ? (item.areaLabelM2 || `${Math.round(item.area)}㎡`)
                                      : (item.areaLabelPyeong || `${Math.round(item.areaPyeong)}평`)
                                  } · {item.floor}층
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="flex items-center gap-1.5">
                                  {item.delta && item.delta > 0 && item.prevPriceVal && item.prevPriceVal > 0 && (
                                    <>
                                      <span className="text-[11px] text-tertiary font-bold line-through opacity-75">
                                        {formatEokWithUnit(item.prevPriceVal * 10000).value}
                                      </span>
                                      <span className="text-[10px] text-tertiary font-bold opacity-60">➔</span>
                                    </>
                                  )}
                                  <span className="text-[14.5px] font-black text-[#ff4b5c] tracking-tight">
                                    {item.priceEok}
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onSelectApt) {
                                      onSelectApt(item.aptName);
                                    }
                                  }}
                                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-border text-[10.5px] font-extrabold text-secondary hover:text-primary transition-all active:scale-95 cursor-pointer shadow-sm hover:border-[#cbd5e1]"
                                >
                                  상세
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {isMobileViewport && dailyTimelineData.length > 3 && (
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
                      <span>최근 실거래 더보기 ({dailyTimelineData.length - 3}개 더보기)</span>
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
                      <h3 className="text-[15px] font-bold text-primary tracking-tight truncate flex items-center gap-1.5 max-w-[360px] sm:max-w-none">
                        동탄 아파트 시세 추이
                      </h3>

                      {isDefaultAptSettingUp ? (
                        <div className="w-[150px] sm:w-[190px] h-[28px] bg-zinc-100 dark:bg-zinc-800/60 rounded-xl animate-pulse" />
                      ) : (
                        mounted && user && userFavorites && userFavorites.size > 0 && (
                          <div className="relative flex items-center gap-1">
                            <select
                              value={selectedTimelineApt || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSelectedTimelineApt(val === "" ? null : val);
                              }}
                              className="px-2.5 h-[28px] bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-border/80 text-secondary rounded-xl text-[11px] font-extrabold cursor-pointer transition-colors outline-none focus:ring-1 focus:ring-[#00d29d] focus:border-[#00d29d] shadow-sm w-[150px] sm:w-[190px] truncate shrink-0"
                            >
                              <option value="">전체 추이 보기</option>
                              {favoritesArray.map((fav) => (
                                <option key={fav} value={fav}>
                                  {fav}
                                </option>
                              ))}
                            </select>

                            {/* ⚙️ 관심 단지 순서 편집 버튼 */}
                            <div className="relative flex items-center" ref={orderEditorRef}>
                              <button
                                onClick={() => setShowOrderEditor(!showOrderEditor)}
                                title="관심 단지 정렬 순서 편집"
                                className="w-7 h-7 flex items-center justify-center bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-border/80 text-secondary hover:text-primary rounded-xl transition-colors cursor-pointer outline-none focus:ring-1 focus:ring-[#00d29d] shadow-sm shrink-0"
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
                                          draggedIndex === index ? "opacity-40 border-dashed border-[#00d29d]" : ""
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
                        )
                      )}

                      {selectedTimelineApt && !isDefaultAptSettingUp && (
                        <button
                          onClick={() => onSelectApt && onSelectApt(selectedTimelineApt)}
                          className="px-2.5 py-1 bg-[#e0fbf4] hover:bg-[#e0fbf4]/80 text-[#00d29d] border-none rounded-xl text-[11px] font-extrabold cursor-pointer transition-colors shrink-0 flex items-center gap-1 shadow-sm"
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
                    <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center bg-zinc-50/50 dark:bg-zinc-900/10 border border-border/40 rounded-2xl animate-pulse">
                      <span className="text-tertiary text-[12px] font-extrabold mb-1">관심 단지 정보를 불러오는 중입니다...</span>
                      <span className="text-[10px] text-tertiary/60 font-medium">내 자산 가치 분석 보고서를 작성하고 있습니다.</span>
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
                  <div className="flex items-center justify-center gap-3 mt-1.5 flex-none animate-pulse">
                    <div className="w-20 h-5 bg-zinc-100 dark:bg-zinc-800/60 rounded-full" />
                    <div className="w-20 h-5 bg-zinc-100 dark:bg-zinc-800/60 rounded-full" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3 mt-1.5 flex-none">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-[#00d29d]/8 dark:bg-[#00d29d]/15 text-[#00d29d] rounded-full text-[11px] font-extrabold border border-[#00d29d]/15 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00d29d]" />
                      <span>평균 매매가</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-[#f9a825]/8 dark:bg-[#f9a825]/15 text-[#f9a825] rounded-full text-[11px] font-extrabold border border-[#f9a825]/15 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f9a825]" />
                      <span>평균 전세가</span>
                    </div>
                  </div>
                )}

                {/* Bottom Card Area: either Favorites List or CTA Banner */}
                {isDefaultAptSettingUp ? (
                  <div className="mt-2 pt-2.5 border-t border-border/60 flex-none h-[72px] bg-zinc-50 dark:bg-zinc-900/10 rounded-2xl animate-pulse border border-border/40" />
                ) : (
                  mounted && userFavorites && userFavorites.size > 0 ? null : (
                    <div className="mt-2 pt-2.5 border-t border-border/60 flex-none">
                      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-zinc-900/40 dark:to-teal-950/20 border border-emerald-500/10 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-[13px] font-bold text-primary flex items-center gap-1.5">
                            <span className="text-[#00d29d] font-black">내 아파트 시세 브리핑</span>을 받아보세요
                          </span>
                          <span className="text-[11.5px] text-tertiary font-semibold leading-relaxed">
                            {user ? "관심 단지를 등록하면 매일 첫 화면에서 실거래 시세 변동과 매매/전세 갭을 자동으로 분석해 드려요." : "로그인 후 내 아파트를 등록하면 매일 첫 화면에서 간편하게 자산 가치 브리핑을 받을 수 있어요."}
                          </span>
                        </div>
                        <button
                          onClick={() => {
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
                        className="px-3.5 py-2 bg-[#00d29d] hover:bg-[#00d29d]/90 text-white border-none rounded-xl text-[12px] font-extrabold cursor-pointer transition-colors shadow-sm shrink-0 self-stretch sm:self-auto text-center"
                      >
                        {user ? "단지 등록하기" : "3초 간편 로그인"}
                      </button>
                    </div>
                  </div>
                )
                )}
              </div>
            </div>

            {/* 동탄 철도 교통 게시판 위젯 */}
            <div className="w-full bg-surface rounded-2xl border border-border p-4 sm:p-5 flex flex-col gap-4 relative shadow-sm md:h-[360px] justify-start">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-border/40 pb-3 shrink-0">
                <div className="relative group/title flex items-center gap-1.5 min-w-0">
                  <span className="bg-[#00d29d]/10 dark:bg-[#00d29d]/25 text-[#00b386] dark:text-[#00d29d] font-extrabold text-[10.5px] px-2.5 py-0.5 rounded-[8px] shrink-0">
                    철도·교통
                  </span>
                  <h4 className="text-[14px] font-extrabold text-primary tracking-tight truncate">
                    동탄 철도 교통 게시판
                  </h4>
                  <Info className="w-3.5 h-3.5 shrink-0 text-tertiary cursor-pointer hover:text-secondary transition-colors" />
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-full left-0 mb-2 w-[280px] p-3 bg-[#191f28] text-white text-[12px] font-medium leading-[1.5] rounded-xl shadow-xl opacity-0 invisible group-hover/title:opacity-100 group-hover/title:visible transition-all duration-200 z-50 normal-case tracking-normal whitespace-normal break-keep"
                  >
                    동탄 전역 및 행정동별 철도(GTX, 트램, 인동선, SRT) 및 대중교통 관련 실시간 고시·공고와 주요 교통 추진 현황 뉴스판입니다.
                    <div className="absolute top-full left-4 border-[6px] border-transparent border-t-[#191f28]"></div>
                  </div>
                </div>

              </div>

              {/* 소식 리스트 */}
              <div className="flex flex-col gap-3.5 flex-1 justify-start py-1.5 overflow-hidden">
                {/* 1. 철도전략과 소식 */}
                <div className="flex flex-col gap-1.5">
                  <div className="text-[11px] font-black text-secondary/70 flex items-center gap-1.5 px-2 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00d29d] shadow-[0_0_4px_rgba(0,210,157,0.4)]"></span>
                    철도전략과 소식
                  </div>
                  {railStrategyNotices.length === 0 ? (
                    <div className="text-center py-4 text-tertiary text-[11px] font-medium bg-neutral-50/50 dark:bg-zinc-900/10 rounded-xl border border-dashed border-border/30">
                      관련 공지사항이 없습니다.
                    </div>
                  ) : (
                    railStrategyNotices.slice(0, 2).map((item: LocalNoticeItem) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          window.location.href = `/lounge?notice=${item.id}`;
                        }}
                        className="flex items-center justify-between py-2 px-2.5 hover:bg-body/60 dark:hover:bg-zinc-900/30 rounded-xl transition-all duration-200 cursor-pointer group/item active:scale-[0.995] border border-transparent hover:border-border/30 min-w-0"
                      >
                        {/* Left: Icon & Title */}
                        <div className="flex items-center gap-2.5 min-w-0 mr-3">
                          <div className="w-6 h-6 rounded-lg bg-[#00d29d]/10 text-[#00b386] flex items-center justify-center shrink-0">
                            <Train size={12} />
                          </div>
                          <span className="text-[12.5px] font-bold text-primary group-hover/item:text-[#00d29d] transition-colors truncate" title={item.title}>
                            {item.title}
                          </span>
                        </div>
                        {/* Right: Date */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10.5px] text-tertiary font-semibold w-[42px] text-right shrink-0">
                            {item.date.substring(5, 10).replace("-", "/")}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* 구분선 */}
                <div className="border-t border-border/30 my-1.5 mx-2"></div>

                {/* 2. 트램건설추진단 소식 */}
                <div className="flex flex-col gap-1.5">
                  <div className="text-[11px] font-black text-secondary/70 flex items-center gap-1.5 px-2 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.4)]"></span>
                    트램건설추진단 소식
                  </div>
                  {tramNotices.length === 0 ? (
                    <div className="text-center py-4 text-tertiary text-[11px] font-medium bg-neutral-50/50 dark:bg-zinc-900/10 rounded-xl border border-dashed border-border/30">
                      관련 공지사항이 없습니다.
                    </div>
                  ) : (
                    tramNotices.slice(0, 2).map((item: LocalNoticeItem) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          window.location.href = `/lounge?notice=${item.id}`;
                        }}
                        className="flex items-center justify-between py-2 px-2.5 hover:bg-body/60 dark:hover:bg-zinc-900/30 rounded-xl transition-all duration-200 cursor-pointer group/item active:scale-[0.995] border border-transparent hover:border-border/30 min-w-0"
                      >
                        {/* Left: Icon & Title */}
                        <div className="flex items-center gap-2.5 min-w-0 mr-3">
                          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                            <Train size={12} />
                          </div>
                          <span className="text-[12.5px] font-bold text-primary group-hover/item:text-emerald-600 transition-colors truncate" title={item.title}>
                            {item.title}
                          </span>
                        </div>
                        {/* Right: Date */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10.5px] text-tertiary font-semibold w-[42px] text-right shrink-0">
                            {item.date.substring(5, 10).replace("-", "/")}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>


          </div>
        </div>

        {/* 💬 실시간 웅성웅성 라운지 토크 위젯 */}
        <div className="flex flex-col gap-6 mt-6 w-full">
          {/* Left: 실시간 웅성웅성 라운지 토크 위젯 (Full-width) */}
          <div className="w-full bg-surface rounded-2xl border border-border p-5 flex flex-col gap-4 shadow-sm min-h-[300px]">
            <div className="flex justify-between items-center border-b border-border/50 pb-3.5">
              <div className="flex items-center gap-2">
                <span className="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 text-[11px] font-black px-2.5 py-1 rounded-lg shrink-0">
                  실시간 라운지
                </span>
                <h4 className="text-[15px] font-black text-primary tracking-tight">
                  동탄 웅성웅성 인기 대화
                </h4>
              </div>
              <button 
                onClick={() => {
                  window.location.href = '/lounge';
                }}
                className="text-[11.5px] font-bold text-secondary hover:text-[#00d29d] transition-colors bg-transparent border-none cursor-pointer"
              >
                라운지 전체보기 ➔
              </button>
            </div>
            
            <div className="flex flex-grow flex-col gap-3">
              {(!postsData?.posts || postsData.posts.length === 0) ? (
                <div className="flex-grow flex items-center justify-center text-tertiary text-[12px] font-medium py-8 border border-dashed border-border/40 rounded-2xl">
                  아직 라운지 이야기가 등록되지 않았습니다.
                </div>
              ) : (
                postsData.posts.slice(0, 4).map((post: any) => (
                  <div 
                    key={post.id}
                    onClick={() => {
                      window.location.href = `/lounge?post=${post.id}`;
                    }}
                    className="flex justify-between items-center p-3 hover:bg-body/50 dark:hover:bg-zinc-950/20 border border-transparent hover:border-border/30 rounded-xl transition-all cursor-pointer group active:scale-[0.995]"
                  >
                    <div className="flex flex-col gap-1 min-w-0 mr-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9.5px] font-bold text-[#00b386] dark:text-[#00d29d] bg-[#00d29d]/10 dark:bg-[#00d29d]/20 px-1.5 py-0.5 rounded shrink-0">
                          {post.category || '기타'}
                        </span>
                        <span className="text-[12.5px] font-bold text-primary truncate group-hover:text-[#00d29d] transition-colors">
                          {post.title}
                        </span>
                      </div>
                      <span className="text-[11px] text-tertiary font-medium line-clamp-1">
                        {post.summary || '내용 없음'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-[10.5px] text-tertiary font-semibold">
                      <span className="flex items-center gap-1">
                        💬 {post.commentCount}
                      </span>
                      <span>
                        조회 {post.views}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 프리미엄 유틸리티 툴킷 그리드 영역 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6 w-full">
          {/* Card 1: AI Quiz */}
          <div 
            onClick={() => setIsQuizOpen(true)}
            className="flex flex-col justify-between h-full p-6 bg-gradient-to-br from-[#00d29d]/8 to-surface dark:from-[#00d29d]/4 border border-[#00d29d]/15 hover:border-[#00d29d]/40 rounded-[22px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] cursor-pointer hover:-translate-y-1 active:scale-[0.99] transition-all duration-300 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#00d29d]/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
            <div className="relative z-10 flex flex-col gap-4">
              {/* Icon & Badge Row */}
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-[#00d29d]/10 dark:bg-[#00d29d]/15 text-[#00b386] dark:text-[#00d29d] rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  <Compass size={18} />
                </div>
                <span className="text-[10px] font-black bg-[#ffebed] text-[#ff4b5c] px-2.5 py-1 rounded-full tracking-wide uppercase shadow-sm">New 콘텐츠</span>
              </div>
              
              {/* Title & Desc */}
              <div className="flex flex-col gap-2 mt-2">
                <h3 className="text-[15.5px] font-black text-primary tracking-tight leading-snug">
                  나만의 동탄 찰떡 아파트 찾기 Quiz
                </h3>
                <p className="text-[12.5px] text-secondary font-semibold leading-relaxed break-keep">
                  5가지 초간단 질문으로 당신의 라이프스타일, 예산, 교육 환경에 가장 완벽하게 어우러지는 아파트 3곳을 AI 데이터 매칭으로 즉시 추천받아 보세요!
                </p>
              </div>
            </div>

            {/* Bottom Button */}
            <div className="mt-6 relative z-10">
              <button 
                className="w-full py-3 bg-slate-900 dark:bg-slate-800 hover:bg-[#00d29d] dark:hover:bg-[#00d29d] text-white text-[12.5px] font-black rounded-xl shadow-sm transition-all duration-300 flex items-center justify-center gap-1.5 border-none cursor-pointer"
              >
                <span>지금 추천 받기</span>
                <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Card 2: Jeonse Safety */}
          {onOpenJeonseSafety && (
            <div 
              onClick={() => onOpenJeonseSafety()}
              className="flex flex-col justify-between h-full p-6 bg-gradient-to-br from-emerald-500/8 to-surface dark:from-emerald-500/4 border border-emerald-500/15 hover:border-emerald-500/40 rounded-[22px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] cursor-pointer hover:-translate-y-1 active:scale-[0.99] transition-all duration-300 group relative overflow-hidden"
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
                    전세금 안전진단 & 깡통전세 계산기
                  </h3>
                  <p className="text-[12.5px] text-secondary font-semibold leading-relaxed break-keep">
                    내가 입주할 혹은 거주 중인 아파트의 보증금과 등기부상 근저당권을 실시간 시세와 연동 분석하여 대항력 획득 여부와 깡통전세 위험률을 안전도 4단계로 즉시 분석합니다.
                  </p>
                </div>
              </div>

              {/* Bottom Button */}
              <div className="mt-6 relative z-10">
                <button 
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[12.5px] font-black rounded-xl shadow-sm transition-all duration-300 flex items-center justify-center gap-1.5 border-none cursor-pointer"
                >
                  <span>보증금 진단하기</span>
                  <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {/* Card 3: Mortgage Calculator */}
          {onOpenMortgage && (
            <div 
              onClick={() => onOpenMortgage()}
              className="flex flex-col justify-between h-full p-6 bg-gradient-to-br from-emerald-500/8 to-surface dark:from-emerald-500/4 border border-emerald-500/15 hover:border-emerald-500/40 rounded-[22px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] cursor-pointer hover:-translate-y-1 active:scale-[0.99] transition-all duration-300 group relative overflow-hidden"
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
                    내 집 마련 대출 계산기 & 시뮬레이터
                  </h3>
                  <p className="text-[12.5px] text-secondary font-semibold leading-relaxed break-keep">
                    가구 소득, 순자산, 자녀 수에 따라 신생아 특례대출, 디딤돌, 보금자리론 등 최적의 정부 저금리 정책 대출 자격을 진단하고 월 원리금 상환 계획을 즉시 설계합니다.
                  </p>
                </div>
              </div>

              {/* Bottom Button */}
              <div className="mt-6 relative z-10">
                <button 
                  className="w-full py-3 bg-[#008262] hover:bg-[#00a37b] text-white text-[12.5px] font-black rounded-xl shadow-sm transition-all duration-300 flex items-center justify-center gap-1.5 border-none cursor-pointer"
                >
                  <span>대출 한도 조회</span>
                  <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {/* Card 4: AI Sell Timing & Tax Diagnosis */}
          {onOpenSellTimingCalculator && (
            <div 
              onClick={() => onOpenSellTimingCalculator()}
              className="flex flex-col justify-between h-full p-6 bg-gradient-to-br from-rose-500/8 to-surface dark:from-rose-500/4 border border-rose-500/15 hover:border-rose-500/40 rounded-[22px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] cursor-pointer hover:-translate-y-1 active:scale-[0.99] transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-rose-500/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
              <div className="relative z-10 flex flex-col gap-4">
                {/* Icon & Badge Row */}
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    <TrendingDown size={18} />
                  </div>
                  <span className="text-[10px] font-black bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 px-2.5 py-1 rounded-full tracking-wide uppercase shadow-sm">D-VIEW 매도</span>
                </div>

                {/* Title & Desc */}
                <div className="flex flex-col gap-2 mt-2">
                  <h3 className="text-[15.5px] font-black text-primary tracking-tight leading-snug">
                    내 아파트 지금 팔면 호구일까?
                  </h3>
                  <p className="text-[12.5px] text-secondary font-semibold leading-relaxed break-keep">
                    보유 단지의 낙폭, 거래 회전율, 전세 지지력을 AI 모델로 종합 분석하여 \'지금 매도하면 호구 지수\'를 평가하고 양도세 간이 세액을 산출합니다.
                  </p>
                </div>
              </div>

              {/* Bottom Button */}
              <div className="mt-6 relative z-10">
                <button 
                  className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white text-[12.5px] font-black rounded-xl shadow-sm transition-all duration-300 flex items-center justify-center gap-1.5 border-none cursor-pointer"
                >
                  <span>매도 시기 진단</span>
                  <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          )}
        </div>





      </div>

      {isQuizOpen && (
        <AptFitFinder
          sheetApartments={sheetApartments}
          txSummaryData={txSummaryData}
          nameMapping={nameMapping || {}}
          publicRentalSet={publicRentalSet}
          fieldReportsMap={fieldReportsMap}
          onSelectApt={onSelectApt || (() => {})}
          isOpen={isQuizOpen}
          onClose={() => setIsQuizOpen(false)}
          locationScores={locationScores || {}}
        />
      )}

      {/* Mobile Bottom Sheet Modal */}
      {isBottomSheetOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center lg:hidden">
          {/* Backdrop Overlay */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200" 
            onClick={() => setIsBottomSheetOpen(false)}
          />
          {/* Sheet Box */}
          <div className="relative w-full bg-surface rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border-t border-border flex flex-col max-h-[80vh] z-10 animate-in slide-in-from-bottom duration-300">
            {/* Drag Handle Bar */}
            <div className="w-full flex justify-center py-3 shrink-0 cursor-pointer" onClick={() => setIsBottomSheetOpen(false)}>
              <div className="w-12 h-1.5 bg-[#e5e8eb] dark:bg-slate-700 rounded-full" />
            </div>
            {/* Header */}
            <div className="px-5 pb-3 flex items-center justify-between border-b border-border/50 shrink-0">
              <h3 className="text-[15px] font-extrabold text-primary truncate max-w-[80%]">
                {selectedTimelineApt ? `${selectedTimelineApt} 시세 추이` : "단지 가격 추이"}
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
                  lineData={lineData}
                  xTicks={xTicks}
                  yTicks={yTicks}
                  timeframe={timeframe}
                  isBottomSheet={true}
                />
              </div>

              {/* 커스텀 범례 */}
              <div className="flex items-center justify-center gap-3 mb-5 shrink-0">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-[#00d29d]/8 text-[#00d29d] rounded-full text-[10px] font-bold border border-[#00d29d]/15">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00d29d]" />
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
                        <span className="text-[11px] font-bold text-tertiary">예상 갭투자금</span>
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
}
