import React, { useMemo, useState, useDeferredValue, useEffect } from "react";
import useSWR from "swr";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import type { DongApartment } from "@/lib/dong-apartments";
import type { AptTxSummary, DongtanMacroTrendPoint } from "@/lib/types/transaction";
import type { FieldReportData } from "@/lib/types/report.types";
import { normalizeAptName, findTxKey } from "@/lib/utils/apartmentMapping";
import { haversineDistance } from "@/lib/utils/haversine";
import { useSettings } from "@/lib/contexts/SettingsContext";
import FloatingUserBar from "@/components/FloatingUserBar";
import PageHeroHeader from "./PageHeroHeader";
import {
  ArrowUp,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { NativeAdPlaceholder } from "@/components/ui/NativeAdPlaceholder";

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
  source?: 'bbs' | 'gosi' | 'rail' | 'dong';
}

interface MacroDashboardProps {
  sheetApartments: Record<string, DongApartment[]>;
  txSummaryData: Record<string, AptTxSummary>;
  macroTrendData: DongtanMacroTrendPoint[];
  nameMapping?: Record<string, string>;
  publicRentalSet: Set<string>;
  userFavorites?: Set<string>;
  fieldReportsMap: Map<string, FieldReportData>;
  favoriteCounts: Record<string, number>;
  onSelectApt?: (name: string) => void;
  onOpenAdModal?: () => void;
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
}

const InfoBox = ({
  title,
  value,
  unit,
  badge,
  color = "#00d29d",
  description,
  onClick,
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
      className={`relative rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.03)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] border h-[82px] sm:h-[88px] md:h-[96px] min-w-0 transition-all duration-300 group/card bg-[var(--card-bg-gradient)] dark:bg-[var(--card-bg-gradient-dark)] border-[var(--card-border)] dark:border-[var(--card-border-dark)] ${
        onClick
          ? "cursor-pointer hover:-translate-y-0.5 hover:border-[var(--card-border-hover)] dark:hover:border-[var(--card-border-hover-dark)] hover:shadow-[0_8px_20px_var(--card-glow)] dark:hover:shadow-[0_8px_24px_var(--card-glow-dark)]"
          : "cursor-default"
      }`}
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
          <span className="text-[14px] sm:text-[15.5px] md:text-[19px] font-black text-primary tracking-tight leading-tight truncate">
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
            className="px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-[6px] text-[9.5px] md:text-[11px] tracking-tight font-extrabold whitespace-nowrap leading-none shrink-0"
            style={{
              backgroundColor: hexToRgba(color, 0.08),
              color: color,
              border: `1px solid ${hexToRgba(color, 0.15)}`,
            }}
          >
            {badge}
          </div>
        )}
      </div>

      {/* Row 3: Description Area */}
      <div className="w-full min-w-0 mt-auto z-10">
        {description ? (
          <div className="text-[9.5px] sm:text-[10.5px] md:text-[12px] font-medium text-secondary/90 dark:text-secondary/80 tracking-tight truncate w-full">
            {description}
          </div>
        ) : (
          <div className="h-[15px] sm:h-[16px] md:h-[18px]" />
        )}
      </div>
    </div>
  );
};

interface TooltipPayloadEntry {
  dataKey?: string | number;
  name?: string;
  value: number;
  color?: string;
  payload?: any;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const saleData = payload.find(
      (p) => p.dataKey === "동탄 아파트 전체" || p.name === "평균 매매가",
    );
    const rentData = payload.find(
      (p) =>
        p.dataKey === "동탄 아파트 전세 평균" || p.name === "평균 전세가",
    );

    const salePrice = saleData?.value || 0;
    const rentPrice = rentData?.value || 0;

    let ratio = 0;
    if (salePrice > 0 && rentPrice > 0) {
      ratio = (rentPrice / salePrice) * 100;
    }

    return (
      <div className="bg-surface p-3.5 rounded-[14px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-border flex flex-col gap-2 min-w-[150px]">
        <div className="text-[13.5px] font-bold text-tertiary mb-1">
          {label}
        </div>
        {payload.map((entry, index: number) => {
          const isRent =
            entry.dataKey === "동탄 아파트 전세 평균" ||
            entry.name === "평균 전세가";
          return (
            <div
              key={index}
              className="flex items-center justify-between gap-6"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-[14px] font-bold text-secondary">
                  {isRent ? "전세가" : "매매가"}
                </span>
              </div>
              <span className="text-[14px] font-extrabold text-primary">
                {entry.value}억
              </span>
            </div>
          );
        })}
        {ratio > 0 && (
          <>
            <div className="w-full h-[1px] bg-body my-1" />
            <div className="flex items-center justify-between gap-4">
              <span className="text-[13px] font-bold text-tertiary pl-4">
                전세가율
              </span>
              <span className="text-[14.5px] font-extrabold text-[#00d29d] tracking-tight">
                {ratio.toFixed(1)}%
              </span>
            </div>
          </>
        )}
      </div>
    );
  }
  return null;
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

export const formatDeltaPrice = (deltaEok: number): string => {
  const deltaMan = Math.round(deltaEok * 10000);
  if (deltaMan >= 10000) {
    const eok = Math.floor(deltaMan / 10000);
    const man = deltaMan % 10000;
    return man === 0 ? `+${eok}억` : `+${eok}억 ${man.toLocaleString()}만`;
  }
  return `+${deltaMan.toLocaleString()}만`;
};

const parseDateHelper = (dateStr: string | number, parentLatestDate?: string): Date | null => {
  const clean = String(dateStr).replace(/[^0-9]/g, '');
  if (clean.length === 8) {
    const y = parseInt(clean.substring(0, 4), 10);
    const m = parseInt(clean.substring(4, 6), 10) - 1;
    const d = parseInt(clean.substring(6, 8), 10);
    return new Date(y, m, d);
  }
  if (String(dateStr).includes('.')) {
    const parts = String(dateStr).split('.');
    if (parts.length >= 2) {
      const m = parseInt(parts[0], 10) - 1;
      const d = parseInt(parts[1], 10);
      let y = 2026;
      let latestDt: Date | null = null;
      if (parentLatestDate && parentLatestDate.length === 8) {
        y = parseInt(parentLatestDate.substring(0, 4), 10);
        const lm = parseInt(parentLatestDate.substring(4, 6), 10) - 1;
        const ld = parseInt(parentLatestDate.substring(6, 8), 10);
        latestDt = new Date(y, lm, ld);
      }
      const dt = new Date(y, m, d);
      if (latestDt && dt.getTime() > latestDt.getTime()) {
        dt.setFullYear(y - 1);
      }
      return dt;
    }
  }
  return null;
};

const parsePriceEokHelper = (priceStr: string): number => {
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
  fieldReportsMap,
  favoriteCounts,
  onSelectApt,
  onOpenAdModal,
}: MacroDashboardProps) {
  const { areaUnit } = useSettings();
  const { data: globalVotesData } = useSWR('/api/apartments/vote?aptName=global', fetcher);
  const { data: noticesData } = useSWR('/api/local-notices', fetcher);

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
  const [accordionMode, setAccordionMode] = useState<"price" | "pyeong">("price");
  const [timeframe, setTimeframe] = useState<
    "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL"
  >("ALL");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const [selectedTiers, setSelectedTiers] = useState<Record<string, number>>({});
  const [isScrolled, setIsScrolled] = useState(false);
  const [newsData, setNewsData] = useState<MacroNewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [visibleNewsCount, setVisibleNewsCount] = useState(6);
  const [newsTab, setNewsTab] = useState<"news" | "notice">("news");
  const [visibleNoticeCount, setVisibleNoticeCount] = useState(6);

  const [selectedTimelineApt, setSelectedTimelineApt] = useState<string | null>(null);
  const [aptRealTxData, setAptRealTxData] = useState<any[] | null>(null);
  const [isAptTxLoading, setIsAptTxLoading] = useState(false);

  useEffect(() => {
    if (!selectedTimelineApt) {
      setAptRealTxData(null);
      return;
    }
    setIsAptTxLoading(true);
    const txKey = findTxKey(selectedTimelineApt, txSummaryData, nameMapping) || selectedTimelineApt;
    
    fetch(`/tx-data/${encodeURIComponent(txKey)}.json`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load tx data");
        return res.json();
      })
      .then(data => {
        setAptRealTxData(data);
      })
      .catch(err => {
        console.error("Error fetching apt real tx data:", err);
        setAptRealTxData(null);
      })
      .finally(() => {
        setIsAptTxLoading(false);
      });
  }, [selectedTimelineApt, txSummaryData, nameMapping]);



  React.useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch("/api/macro/news");
        const json = await res.json();
        if (json.status === "success" && json.data) {
          setNewsData(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch news", err);
      } finally {
        setNewsLoading(false);
      }
    }
    fetchNews();
  }, []);

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

  const deferredMacroTrendData = useDeferredValue(macroTrendData);

  const selectedAptSummary = useMemo(() => {
    if (!selectedTimelineApt || !txSummaryData) return null;
    const txKey = findTxKey(selectedTimelineApt, txSummaryData, nameMapping);
    return txKey ? txSummaryData[txKey] : null;
  }, [selectedTimelineApt, txSummaryData, nameMapping]);

  const selectedAptChartData = useMemo(() => {
    if (!selectedAptSummary || !deferredMacroTrendData || deferredMacroTrendData.length === 0) return null;

    // 만약 실제 거래 데이터가 로드되지 않았거나 로딩 중이면, 안전한 fallback으로 기존의 Mock 스케일링 데이터를 제공
    if (!aptRealTxData || aptRealTxData.length === 0) {
      const latestMacroPoint = deferredMacroTrendData[deferredMacroTrendData.length - 1];
      const macroSaleVal = latestMacroPoint ? latestMacroPoint['동탄 아파트 전체'] || 8.1 : 8.1;
      const macroJeonseVal = latestMacroPoint ? latestMacroPoint['동탄 아파트 전세 평균'] || 4.3 : 4.3;

      const aptSaleVal = (selectedAptSummary.avg3MPrice || selectedAptSummary.avg1MPrice || selectedAptSummary.latestPrice || 0) / 10000;
      const aptJeonseVal = (selectedAptSummary.avg3MRentDeposit || selectedAptSummary.avg1MRentDeposit || selectedAptSummary.latestRentDeposit || 0) / 10000;

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

    const fallbackSalePrice = (selectedAptSummary.avg3MPrice || selectedAptSummary.avg1MPrice || selectedAptSummary.latestPrice || 80000) / 10000;
    const fallbackRentPrice = (selectedAptSummary.avg3MRentDeposit || selectedAptSummary.avg1MRentDeposit || selectedAptSummary.latestRentDeposit || 48000) / 10000;

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
    const saleAnchorValue = monthlyAverages[saleAnchorKey].sale!;
    const rentAnchorValue = monthlyAverages[rentAnchorKey].rent!;

    const macroTrendList = deferredMacroTrendData;
    const finalChartData = macroTrendList.map((point, idx) => {
      const key = point.name;
      let finalSale = monthlyAverages[key].sale;
      let finalRent = monthlyAverages[key].rent;

      // --- 매매 보간 ---
      if (finalSale === null) {
        if (idx < firstSaleAnchorIndex) {
          const anchorMacro = macroTrendList[firstSaleAnchorIndex]['동탄 아파트 전체'];
          const currentMacro = point['동탄 아파트 전체'];
          const macroRatio = anchorMacro > 0 ? currentMacro / anchorMacro : 1;
          finalSale = saleAnchorValue * macroRatio;
        } else {
          let lastValidSale = saleAnchorValue;
          for (let j = idx - 1; j >= firstSaleAnchorIndex; j--) {
            const prevKey = macroTrendList[j].name;
            if (monthlyAverages[prevKey].sale !== null) {
              lastValidSale = monthlyAverages[prevKey].sale!;
              break;
            }
          }
          finalSale = lastValidSale;
        }
      }

      // --- 전세 보간 ---
      if (finalRent === null) {
        if (idx < firstRentAnchorIndex) {
          const anchorMacro = macroTrendList[firstRentAnchorIndex]['동탄 아파트 전세 평균'] || 4.3;
          const currentMacro = point['동탄 아파트 전세 평균'] || 4.3;
          const macroRatio = anchorMacro > 0 ? currentMacro / anchorMacro : 1;
          finalRent = rentAnchorValue * macroRatio;
        } else {
          let lastValidRent = rentAnchorValue;
          for (let j = idx - 1; j >= firstRentAnchorIndex; j--) {
            const prevKey = macroTrendList[j].name;
            if (monthlyAverages[prevKey].rent !== null) {
              lastValidRent = monthlyAverages[prevKey].rent!;
              break;
            }
          }
          finalRent = lastValidRent;
        }
      }

      return {
        name: key,
        '동탄 아파트 전체': Math.round(finalSale * 100) / 100,
        '동탄 아파트 전세 평균': Math.round(finalRent * 100) / 100,
      };
    });

    return finalChartData;
  }, [selectedAptSummary, deferredMacroTrendData, aptRealTxData]);

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


  // 1안 Card 3: 최근 7일 동탄 실거래량 & 추세 (WoW)
  const card3Data = useMemo(() => {
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
    let trendColor = "#94a3b8";

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
  }, [txSummaryData, maxDateTime]);

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



  // 6차 사이클: 일자별 신고가 타임라인 데이터 계산
  const dailyTimelineData = useMemo(() => {
    const groups: Record<string, { dateStr: string; timestamp: number; items: any[] }> = {};

    if (!sheetApartments || !txSummaryData) return [];

    const allApts = Object.values(sheetApartments).flat();

    allApts.forEach((apt) => {
      if (publicRentalSet.has(apt.name)) return;
      const txKey = findTxKey(apt.name, txSummaryData, nameMapping);
      if (txKey && txSummaryData[txKey]) {
        const sum = txSummaryData[txKey];
        if (sum.recent && sum.recent.length > 0) {
          // Group transactions by areaKey to trace historical price trend per area size
          const areaGroups: Record<string, any[]> = {};
          sum.recent.forEach((tx) => {
            const areaKey = tx.area ? (Math.round(tx.area * 100) / 100).toFixed(2) : 'default';
            const dt = parseDateHelper(tx.date, sum.latestDate);
            const price = parsePriceEokHelper(tx.priceEok);
            if (dt && price > 0) {
              if (!areaGroups[areaKey]) {
                areaGroups[areaKey] = [];
              }
              areaGroups[areaKey].push({ tx, dt, price });
            }
          });

          // Process each area size ascending in time to determine strict new highs
          Object.keys(areaGroups).forEach((areaKey) => {
            const sorted = areaGroups[areaKey].sort((a, b) => a.dt.getTime() - b.dt.getTime());
            let currentMax = 0;

            sorted.forEach((item, index) => {
              const { tx, dt, price } = item;
              let isNewHigh = false;
              let delta = 0;

              if (index === 0) {
                currentMax = price;
              } else {
                if (price > currentMax) {
                  isNewHigh = true;
                  delta = price - currentMax;
                  currentMax = price;
                }
              }

              // Check if it is a new high and falls within the last 30 days
              const diffMs = maxDateTime - dt.getTime();
              const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
              if (isNewHigh && diffDays >= 0 && diffDays <= 30) {
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

                groups[dateKey].items.push({
                  aptName: apt.name,
                  dong: apt.dong || sum.dong || "",
                  priceEok: tx.priceEok,
                  priceVal: price,
                  areaPyeong: tx.areaPyeong,
                  area: tx.area,
                  floor: tx.floor,
                  type: "high",
                  delta: delta,
                });
              }
            });
          });
        }
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
  }, [txSummaryData, sheetApartments, publicRentalSet, nameMapping, maxDateTime]);

  useEffect(() => {
    if (dailyTimelineData && dailyTimelineData.length > 0 && !selectedTimelineApt) {
      const firstGroup = dailyTimelineData[0];
      if (firstGroup && firstGroup.items && firstGroup.items.length > 0) {
        setSelectedTimelineApt(firstGroup.items[0].aptName);
      }
    }
  }, [dailyTimelineData, selectedTimelineApt]);

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const isPointInPolygon = (point: { lat: number; lng: number }, vs: { lat: number; lng: number }[]) => {
    const x = point.lng, y = point.lat;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i].lng, yi = vs[i].lat;
      const xj = vs[j].lng, yj = vs[j].lat;
      const intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const sibumPolygon = [
    { lat: 37.204400, lng: 127.099303 },
    { lat: 37.194603, lng: 127.099151 },
    { lat: 37.199094, lng: 127.115916 },
    { lat: 37.203404, lng: 127.112905 }
  ];

  const culturePolygon = [
    { lat: 37.194037, lng: 127.082630 },
    { lat: 37.193915, lng: 127.099012 },
    { lat: 37.178302, lng: 127.103808 },
    { lat: 37.188171, lng: 127.083393 }
  ];

  const waterfrontPolygon = [
    { lat: 37.172228, lng: 127.094673 },
    { lat: 37.171307, lng: 127.118744 },
    { lat: 37.165758, lng: 127.114791 },
    { lat: 37.165082, lng: 127.091299 }
  ];

  const gwangBizPolygon = [
    { lat: 37.204512, lng: 127.085889 },
    { lat: 37.194624, lng: 127.083147 },
    { lat: 37.194700, lng: 127.098262 },
    { lat: 37.204544, lng: 127.098434 }
  ];

interface GroupedApartment {
  name: string;
  latestPrice: number;
  latestPriceEok: string;
  pyeongPrice: number;
  mdd: number;
  gap: number;
  liquid: number;
  householdCount: number;
  yearBuilt: string;
  distToDongtan: number | null;
  dong?: string;
  txKey?: string;
  views?: number;
  likes?: number;
}

interface GroupedCategory {
  title: string;
  dong: string;
  totalValue: number;
  totalPyeongValue: number;
  count: number;
  apartments: GroupedApartment[];
  avgPrice?: number;
  avgPyeongPrice?: number;
}

  const accordionData = useMemo(() => {
    if (!sheetApartments || !txSummaryData) return [];

    const grouped: Record<string, GroupedCategory> = {};

    Object.values(sheetApartments)
      .flat()
      .forEach((apt) => {
        const lat = apt.lat || 0;
        const lng = apt.lng || 0;

        const dongtanCoord = { lat: 37.2005, lng: 127.0985 };
        const distToDongtan =
          lat && lng
            ? haversineDistance(
              { lat: Number(lat), lng: Number(lng) },
              dongtanCoord
            )
            : null;

        const themeTitles: string[] = [];

        // ==========================================
        const isSibumArea = lat !== 0 && lng !== 0 && isPointInPolygon({ lat: Number(lat), lng: Number(lng) }, sibumPolygon);
        const isCultureArea = lat !== 0 && lng !== 0 && isPointInPolygon({ lat: Number(lat), lng: Number(lng) }, culturePolygon);
        const isLakeArea = lat !== 0 && lng !== 0 && isPointInPolygon({ lat: Number(lat), lng: Number(lng) }, waterfrontPolygon);
        const isGwangBizArea = lat !== 0 && lng !== 0 && isPointInPolygon({ lat: Number(lat), lng: Number(lng) }, gwangBizPolygon);
        const isDongtanName = apt.name.includes("동탄역");

        let isDongtanArea = false;
        if (distToDongtan !== null) {
          isDongtanArea = distToDongtan <= 1500;
        } else {
          isDongtanArea = isDongtanName || apt.dong === "오산동" || apt.dong === "여울동";
        }

        const is1Dongtan = apt.dong === "반송동" || apt.dong === "능동" || apt.dong === "석우동";

        // 동탄역세권은 중복 편입을 허용하므로 독립적으로 push
        if (isDongtanArea) {
          themeTitles.push("동탄역세권");
        }

        // 나머지 권역들은 Mutually Exclusive
        if (isGwangBizArea) {
          themeTitles.push("광역비지니스컴플렉스");
        } else if (isSibumArea) {
          themeTitles.push("커뮤니티시범단지");
        } else if (isCultureArea) {
          themeTitles.push("문화디자인밸리");
        } else if (isLakeArea) {
          themeTitles.push("워터프론트컴플렉스");
        } else if (is1Dongtan) {
          themeTitles.push("1동탄");
        }

        if (themeTitles.length === 0) {
          themeTitles.push("기타 권역");
        }

        if (publicRentalSet.has(apt.name)) return;
        const rawTxKey =
          apt.txKey || findTxKey(apt.name, txSummaryData, nameMapping);
        const txKey = rawTxKey ? normalizeAptName(rawTxKey) : null;
        const tx = txKey ? txSummaryData[txKey] : undefined;

        if (tx) {
          const sales = tx.avg3MPrice || tx.avg1MPrice || tx.latestPrice || 0;
          if (sales > 0) {
            const maxPrice = tx.maxPrice || sales;
            const mdd =
              maxPrice > 0 ? ((sales - maxPrice) / maxPrice) * 100 : 0;
            const gap =
              sales > 0 && tx.latestRentDeposit
                ? (tx.latestRentDeposit / sales) * 100
                : 0;
            const liquid = tx.avg3MTxCount || 0;

            let formattedYear = apt.yearBuilt || "";
            if (formattedYear.length === 6 && !isNaN(Number(formattedYear))) {
              formattedYear = `${formattedYear.substring(0, 4)}년 ${formattedYear.substring(4, 6)}월`;
            } else if (
              formattedYear.length === 4 &&
              !isNaN(Number(formattedYear))
            ) {
              formattedYear = `${formattedYear}년`;
            }

            const pyeongPrice =
              tx.avg3MPerPyeong ||
              tx.avg1MPerPyeong ||
              (tx.latestArea ? tx.latestPrice / (tx.latestArea / 3.3058) : 0);

            // distToDongtan은 상단에서 미리 계산함

            themeTitles.forEach(themeTitle => {
              if (!grouped[themeTitle]) {
                grouped[themeTitle] = {
                  title: themeTitle,
                  dong: themeTitle, // 헤더의 Core Anchor 표시에 사용
                  totalValue: 0,
                  totalPyeongValue: 0,
                  count: 0,
                  apartments: [],
                };
              }

              grouped[themeTitle].apartments.push({
                name: apt.name,
                latestPrice: sales,
                latestPriceEok: formatEokWithUnit(sales).value + (formatEokWithUnit(sales).unit === '만원' ? '만' : ''),
                pyeongPrice: pyeongPrice,
                mdd: mdd,
                gap: gap,
                liquid: liquid,
                householdCount: apt.householdCount || 0,
                yearBuilt: formattedYear,
                distToDongtan: distToDongtan,
                dong: apt.dong,
                txKey: apt.txKey,
                views: fieldReportsMap.get(apt.name)?.viewCount || 0,
                likes: favoriteCounts[apt.name] || 0,
              });

              grouped[themeTitle].totalValue += sales;
              grouped[themeTitle].totalPyeongValue += pyeongPrice;
              grouped[themeTitle].count += 1;
            });
          }
        }
      });

    const themeOrder = [
      "동탄역세권",
      "광역비지니스컴플렉스",
      "커뮤니티시범단지",
      "워터프론트컴플렉스",
      "문화디자인밸리",
      "1동탄",
      "기타 권역",
    ];

    const result = Object.values(grouped)
      .filter((g) => g.count > 0)
      .map((g) => {
        g.avgPrice = g.totalValue / g.count;
        g.avgPyeongPrice = g.totalPyeongValue / g.count;
        g.apartments.sort((a, b) => b.latestPrice - a.latestPrice);
        (g as any).recentTxCount = g.apartments.reduce((sum, apt) => sum + (apt.liquid || 0), 0);
        return g;
      })
      .sort((a, b) => {
        const indexA = themeOrder.indexOf(a.title);
        const indexB = themeOrder.indexOf(b.title);
        const orderA = indexA === -1 ? 999 : indexA;
        const orderB = indexB === -1 ? 999 : indexB;
        if (orderA !== orderB) return orderA - orderB;
        return (b.avgPrice || 0) - (a.avgPrice || 0);
      });

    return result;
  }, [sheetApartments, txSummaryData, publicRentalSet]);

  const { gapText, jeonseRateText, hasValues } = useMemo(() => {
    if (!selectedAptSummary) return { gapText: "-", jeonseRateText: "-", hasValues: false };
    const sale = selectedAptSummary.avg3MPrice || selectedAptSummary.avg1MPrice || selectedAptSummary.latestPrice || 0;
    const rent = selectedAptSummary.avg3MRentDeposit || selectedAptSummary.avg1MRentDeposit || selectedAptSummary.latestRentDeposit || 0;
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
    const ticks = [];
    for (let i = 0; i <= roundedMax + step; i += step) {
      ticks.push(i);
    }
    return ticks;
  }, [lineData]);

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
          onOpenAdModal && (
            <button
              onClick={onOpenAdModal}
              className="hidden md:flex ml-4 px-3 py-1.5 bg-body hover:bg-body/80 text-secondary text-[13px] font-bold rounded-[8px] transition-colors items-center gap-1.5"
            >
              <MessageSquare size={14} />
              광고/제휴 문의
            </button>
          )
        }
        rightSideContent={
          <div className="flex items-center justify-center shrink-0 w-[320px] h-[80px] bg-body border border-border rounded-[12px] border-dashed cursor-pointer hover:bg-body/60 transition-colors group" onClick={onOpenAdModal}>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[14px] font-bold text-tertiary group-hover:text-primary transition-colors">광고 구좌 (배너) 영역</span>
              <span className="text-[12px] text-tertiary group-hover:text-secondary transition-colors">이곳을 클릭하여 제휴 문의를 남겨주세요</span>
            </div>
          </div>
        }
      />
      <div className="flex flex-col px-4 sm:px-6 md:px-10 lg:px-16 pt-3 md:pt-5 pb-0 md:pb-12 lg:pb-16 w-full">



        <div className="flex flex-col md:flex-row gap-4 w-full px-0 mt-0">
          {/* Left Column Container */}
          <div className="w-full md:w-1/2 flex flex-col gap-4 min-w-0">
            {/* Daily Timeline Card */}
            <div className="flex flex-col bg-surface rounded-2xl shadow-sm border border-border px-5 py-6 min-h-[420px] min-w-0">
              <div className="flex justify-between items-center gap-2 mb-4">
                <h2 className="text-[16px] sm:text-[18px] font-extrabold text-primary tracking-tight whitespace-nowrap">
                  일자별 신고가 단지
                </h2>
                <span className="text-[12px] text-tertiary font-bold bg-[#f2f4f6] px-2 py-1 rounded-md shrink-0">
                  최근 30일
                </span>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[320px] pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full flex flex-col gap-4 mt-2">
                {dailyTimelineData.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-tertiary text-[14px]">
                    최근 30일 내 등록된 신고가 거래가 없습니다.
                  </div>
                ) : (
                  dailyTimelineData.map((group) => (
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
                            onClick={() => setSelectedTimelineApt(item.aptName)}
                            className={`flex flex-col p-4 rounded-2xl cursor-pointer transition-all border ${
                              selectedTimelineApt === item.aptName
                                ? "border-[#00d29d] bg-[#e0fbf4]/20 ring-1 ring-[#00d29d]/30"
                                : "bg-body hover:bg-body/80 border-transparent hover:border-border"
                            } group gap-2`}
                          >
                            {/* 1st Row: Apt Name & High Price Badge */}
                            <div className="flex items-start justify-between gap-3">
                              <span className="text-[14.5px] sm:text-[15px] font-extrabold text-primary break-keep group-hover:text-[#00d29d] transition-colors leading-snug">
                                {item.aptName}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#ffebed] text-[#ff4b5c] shadow-sm shrink-0 whitespace-nowrap">
                                🔥 신고가 ({formatDeltaPrice(item.delta)})
                              </span>
                            </div>

                            {/* 2nd Row: Meta Info (Dong · Pyeong · Floor) */}
                            <div className="text-[12px] text-tertiary font-medium pl-0.5">
                              {item.dong} · {renderAreaLabel(item.areaPyeong, item.area)} · {item.floor}층
                            </div>

                            {/* 3rd Row: Price & Details Button */}
                            <div className="flex items-center justify-between mt-1 pt-2.5 border-t border-border/30">
                              <span className="text-[16.5px] sm:text-[17.5px] font-black text-[#ff4b5c] tracking-tight">
                                {item.priceEok}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectApt && onSelectApt(item.aptName);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-border text-[11.5px] font-extrabold text-secondary hover:text-primary transition-all active:scale-95 cursor-pointer shadow-sm hover:border-[#cbd5e1]"
                              >
                                상세
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 4 Info Boxes Grid */}
            <div className="grid grid-cols-2 gap-3 mt-2">
              <InfoBox
                title={
                  <div className="relative group/title flex items-center gap-1 w-full">
                    <span className="break-keep whitespace-nowrap tracking-tight">
                      실시간 인기 1위 단지
                    </span>
                    <Info className="w-3.5 h-3.5 shrink-0 text-tertiary cursor-pointer hover:text-secondary transition-colors" />
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[280px] p-3 bg-[#191f28] text-white text-[13px] font-medium leading-[1.5] rounded-xl shadow-xl opacity-0 invisible group-hover/title:opacity-100 group-hover/title:visible transition-all duration-200 z-50 normal-case tracking-normal whitespace-normal break-keep"
                    >
                      DVIEW 플랫폼 사용자들에게 가장 인기가 많고 즐겨찾기(관심)가 많이 등록된 대표 단지 정보입니다.
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#191f28]"></div>
                    </div>
                  </div>
                }
                value={card4Data.name}
                badge={card4Data.badge}
                description="실시간 조회/관심 1위"
                color="#ff4b5c"
                onClick={() => {
                  if (onSelectApt && card4Data.name && card4Data.name !== "-") {
                    onSelectApt(card4Data.name);
                  }
                }}
              />
              <InfoBox
                title={
                  <div className="relative group/title flex items-center gap-1 w-full">
                    <span className="break-keep whitespace-nowrap tracking-tight">
                      동탄 매수 심리
                    </span>
                    <Info className="w-3.5 h-3.5 shrink-0 text-tertiary cursor-pointer hover:text-secondary transition-colors" />
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[280px] p-3 bg-[#191f28] text-white text-[13px] font-medium leading-[1.5] rounded-xl shadow-xl opacity-0 invisible group-hover/title:opacity-100 group-hover/title:visible transition-all duration-200 z-50 normal-case tracking-normal whitespace-normal break-keep"
                    >
                      동탄 전역 아파트들의 실시간 매수/관망 익명 투표를 집계한 결과와 투표 참여자 수입니다.
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#191f28]"></div>
                    </div>
                  </div>
                }
                value={`매수 찬성 ${globalVotes.buyPercent}%`}
                badge={globalVotes.sentimentText}
                description={`총 ${globalVotes.totalVotes.toLocaleString()}명 투표 참여`}
                color="#0d9488"
                onClick={() => {
                  window.location.hash = 'imjang';
                }}
              />
              <InfoBox
                title={
                  <div className="relative group/title flex items-center gap-1 w-full">
                    <span className="break-keep whitespace-nowrap tracking-tight">
                      최근 7일 동탄 실거래량
                    </span>
                    <Info className="w-3.5 h-3.5 shrink-0 text-tertiary cursor-pointer hover:text-secondary transition-colors" />
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[280px] p-3 bg-[#191f28] text-white text-[13px] font-medium leading-[1.5] rounded-xl shadow-xl opacity-0 invisible group-hover/title:opacity-100 group-hover/title:visible transition-all duration-200 z-50 normal-case tracking-normal whitespace-normal break-keep"
                    >
                      최근 7일 동안 동탄 전역에서 신고된 총 실거래량과 직전 동기(8~14일 전) 대비 거래량 증감 추세입니다.
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#191f28]"></div>
                    </div>
                  </div>
                }
                value={card3Data.currentCount}
                unit="건"
                badge={card3Data.badge}
                description={`직전 7일: ${card3Data.prevCount}건`}
                color={card3Data.trendColor}
              />
              <InfoBox
                title={
                  <div className="relative group/title flex items-center gap-1 w-full">
                    <span className="break-keep whitespace-nowrap tracking-tight">
                      오늘의 주요 로컬 소식
                    </span>
                    <Info className="w-3.5 h-3.5 shrink-0 text-tertiary cursor-pointer hover:text-secondary transition-colors" />
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[280px] p-3 bg-[#191f28] text-white text-[13px] font-medium leading-[1.5] rounded-xl shadow-xl opacity-0 invisible group-hover/title:opacity-100 group-hover/title:visible transition-all duration-200 z-50 normal-case tracking-normal whitespace-normal break-keep"
                    >
                      화성시청 및 동탄출장소 등에서 공식 발표한 동탄 지역의 주요 행정 소식 및 행사 안내입니다.
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#191f28]"></div>
                    </div>
                  </div>
                }
                value={`신규 소식 ${noticesData?.notices?.length || 0}건`}
                badge={noticesData?.notices?.[0]?.dept || "동탄구"}
                description={noticesData?.notices?.[0]?.title || "새로운 공지사항이 없습니다"}
                color="#00d29d"
                onClick={() => {
                  const latest = noticesData?.notices?.[0];
                  if (latest) {
                    window.location.hash = `notice=${encodeURIComponent(latest.id)}`;
                  } else {
                    window.location.hash = 'lounge-notices';
                  }
                }}
              />
            </div>

          </div>

          {/* Right Panel: Interactive Market Feed & Trend */}
          <div className="w-full md:w-1/2 flex flex-col bg-surface rounded-2xl shadow-sm border border-border p-4 sm:p-5 min-h-[420px] min-w-0">
            <div className="flex-1 flex flex-col min-h-[300px]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[15px] font-bold text-primary tracking-tight truncate max-w-[360px] sm:max-w-none">
                      {selectedTimelineApt ? `${selectedTimelineApt} 가격 추이` : "동탄 아파트 대표 가격 변화 추이"}
                    </h3>
                    {selectedTimelineApt && (
                      <button
                        onClick={() => onSelectApt && onSelectApt(selectedTimelineApt)}
                        className="px-2.5 py-1 bg-[#e0fbf4] hover:bg-[#e0fbf4]/80 text-[#00d29d] border-none rounded-lg text-[11px] font-bold cursor-pointer transition-colors shrink-0"
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

              <div className="w-full flex-grow mt-2 sm:mt-0 h-[260px] min-h-[260px] relative">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <LineChart
                      data={lineData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      onMouseMove={(e: any) => {
                        if (e && e.activePayload) {
                          setIsTooltipActive(true);
                        } else {
                          setIsTooltipActive(false);
                        }
                      }}
                      onMouseLeave={() => setIsTooltipActive(false)}
                      onTouchStart={() => setIsTooltipActive(true)}
                      onTouchMove={(e: any) => {
                        if (e && e.activePayload) {
                          setIsTooltipActive(true);
                        }
                      }}
                      onTouchEnd={() => setIsTooltipActive(false)}
                    >
                      <CartesianGrid
                        strokeWidth={0.7}
                        vertical={false}
                        horizontal={true}
                        stroke="rgba(148, 163, 184, 0.25)"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--text-secondary)", fontSize: 12, fontWeight: 600 }}
                        dy={10}
                        ticks={xTicks}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--text-secondary)", fontSize: 12, fontWeight: 600 }}
                        tickFormatter={(value: number) =>
                           value === 0 ? "0" : `${Number.isInteger(value) ? value : value.toFixed(1)}억`
                        }
                        domain={[0, "auto"]}
                        ticks={yTicks}
                        width={40}
                      />
                      <RechartsTooltip
                        active={isTouchDevice ? isTooltipActive : undefined}
                        content={<CustomTooltip />}
                        cursor={{
                          stroke: "var(--border-color)",
                          strokeWidth: 2,
                          strokeDasharray: "3 3",
                        }}
                      />
                      <Line
                        key="동탄 아파트 전체"
                        type="monotone"
                        name="평균 매매가"
                        dataKey="동탄 아파트 전체"
                        stroke="#00d29d"
                        strokeWidth={4}
                        animationDuration={300}
                        dot={
                          timeframe === "ALL" || timeframe === "5Y"
                            ? false
                            : { r: 5, strokeWidth: 2 }
                        }
                        activeDot={{ r: 7 }}
                      />
                      <Line
                        key="동탄 아파트 전세 평균"
                        type="monotone"
                        name="평균 전세가"
                        dataKey="동탄 아파트 전세 평균"
                        stroke="#f9a825"
                        strokeWidth={2}
                        animationDuration={300}
                        dot={
                          timeframe === "ALL" || timeframe === "5Y"
                            ? false
                            : { r: 3, strokeWidth: 2 }
                        }
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
              </div>

              {/* 세련된 캡슐 뱃지 형태의 커스텀 범례 */}
              <div className="flex items-center justify-center gap-3 mt-3.5 flex-none">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-[#00d29d]/8 dark:bg-[#00d29d]/15 text-[#00d29d] rounded-full text-[11px] font-extrabold border border-[#00d29d]/15 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00d29d]" />
                  <span>평균 매매가</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-[#f9a825]/8 dark:bg-[#f9a825]/15 text-[#f9a825] rounded-full text-[11px] font-extrabold border border-[#f9a825]/15 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f9a825]" />
                  <span>평균 전세가</span>
                </div>
              </div>

              {/* 개선된 여백 채우기용 슬림한 실거래 요약 바 */}
              <div className="mt-4 pt-3 border-t border-border/60 flex-none">
                {selectedAptSummary ? (
                  <div className="bg-zinc-50/70 dark:bg-zinc-900/30 border border-border/50 rounded-2xl p-3.5 flex flex-col gap-3">
                    {/* Top Row: Title Badge & Target Info */}
                    <div className="flex items-center justify-between border-b border-border/30 pb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center bg-teal-500/10 text-teal-600 dark:text-teal-400 font-extrabold text-[11px] px-2 py-0.5 rounded-[6px] shrink-0 gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                          실거래 요약
                        </span>
                        <div className="flex items-baseline gap-1.5 min-w-0">
                          <span className="text-[12px] text-primary font-extrabold truncate max-w-[280px] sm:max-w-[360px]" title={selectedTimelineApt || "선택 단지"}>
                            {selectedTimelineApt || "선택 단지"}
                          </span>
                          {selectedAptSummary.dong && (
                            <span className="text-[10.5px] text-tertiary font-medium shrink-0">
                              {selectedAptSummary.dong}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] text-tertiary font-semibold bg-white dark:bg-zinc-850 px-2 py-0.5 rounded-md border border-border/30">
                        이 단지 최근 90일 매매 {selectedAptSummary.avg3MTxCount || 0}건
                      </span>
                    </div>

                    {/* Bottom Row: 3-Column Grid for Metrics */}
                    <div className="grid grid-cols-3 gap-2 divide-x divide-border/40 text-center">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] sm:text-[10.5px] font-bold text-tertiary">평균 매매(3M)</span>
                        <span className="text-[12.5px] sm:text-[13.5px] font-black text-primary truncate">
                          {selectedAptSummary.avg3MPriceEok || selectedAptSummary.latestPriceEok || "-"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 pl-1">
                        <span className="text-[10px] sm:text-[10.5px] font-bold text-tertiary">평균 전세(3M)</span>
                        <span className="text-[12.5px] sm:text-[13.5px] font-black text-primary truncate">
                          {selectedAptSummary.avg3MRentDepositEok || selectedAptSummary.latestRentDepositEok || "-"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 pl-1">
                        <span className="text-[10px] sm:text-[10.5px] font-bold text-tertiary">예상 갭투자금</span>
                        <span className="text-[12.5px] sm:text-[13.5px] font-black text-teal-600 dark:text-teal-400 truncate">
                          {hasValues ? gapText : "-"}
                          {hasValues && <span className="text-[9.5px] font-bold text-secondary ml-1">({jeonseRateText})</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-50/70 dark:bg-zinc-900/30 border border-border/50 rounded-2xl p-3.5 flex flex-col gap-3">
                    {/* Top Row: Title Badge & Target Info */}
                    <div className="flex items-center justify-between border-b border-border/30 pb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold text-[11px] px-2 py-0.5 rounded-[6px] shrink-0 gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          동탄 시장 요약
                        </span>
                        <span className="text-[12px] text-primary font-extrabold">
                          종합 모니터링
                        </span>
                      </div>
                      <span className="text-[11px] text-tertiary font-semibold bg-white dark:bg-zinc-850 px-2 py-0.5 rounded-md border border-border/30">
                        최근 7일 기준
                      </span>
                    </div>

                    {/* Bottom Row: 3-Column Grid for Metrics */}
                    <div className="grid grid-cols-3 gap-2 divide-x divide-border/40 text-center">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] sm:text-[10.5px] font-bold text-tertiary">실거래량</span>
                        <span className="text-[12.5px] sm:text-[13.5px] font-black text-primary truncate">
                          {card3Data.currentCount}건
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 pl-1">
                        <span className="text-[10px] sm:text-[10.5px] font-bold text-tertiary">거래추세</span>
                        <span className="text-[12.5px] sm:text-[13.5px] font-black truncate" style={{ color: card3Data.trendColor }}>
                          {card3Data.trendText.split(" ")[0]} ({card3Data.badge.split(" ")[1]?.replace("(", "")?.replace(")", "") || "0%"})
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 pl-1">
                        <span className="text-[10px] sm:text-[10.5px] font-bold text-tertiary">최고 관심 단지</span>
                        <span className="text-[12.5px] sm:text-[13.5px] font-black text-primary truncate pl-1" title={card4Data.name}>
                          {card4Data.name}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Real Estate Portfolio Section */}
        <div className="mt-12 mb-6 flex items-center justify-between px-0">
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-[16px] bg-[#00d29d] rounded-full" />
            <h2 className="text-[22px] font-bold text-primary">
              권역별 단지 분류
            </h2>
          </div>

          {/* Toss Style Segmented Control for Accordion */}
          <div className="flex bg-body p-1 rounded-lg">
            <button
              onClick={() => setAccordionMode("price")}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-md transition-all ${accordionMode === "price"
                ? "bg-surface text-primary shadow-sm"
                : "text-tertiary hover:text-secondary"
                }`}
            >
              매매가
            </button>
            <button
              onClick={() => setAccordionMode("pyeong")}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-md transition-all ${accordionMode === "pyeong"
                ? "bg-surface text-primary shadow-sm"
                : "text-tertiary hover:text-secondary"
                }`}
            >
              평단가
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-0 px-0 items-start">
          {accordionData.map((group) => {
            const isExpanded = expandedGroups[group.title];

            const themeColors: Record<string, string> = {
              "동탄역세권": "#3182f6",
              "광역비지니스컴플렉스": "#ff9f0a",
              "커뮤니티시범단지": "#af52de",
              "워터프론트컴플렉스": "#00d29d",
              "문화디자인밸리": "#f04452",
              "1동탄": "#4e5968",
            };
            const themeColor = themeColors[group.title] || "#00d29d";

            return (
              <div
                key={group.title}
                className="bg-surface rounded-[20px] shadow-sm border border-border transition-all duration-300 relative"
              >
                {/* Group Header */}
                <div
                  className={`px-5 flex items-center justify-between cursor-pointer hover:bg-body/50 rounded-t-[20px] h-[78px] md:h-[86px] ${!isExpanded ? 'rounded-b-[20px]' : ''}`}
                  onClick={() => toggleGroup(group.title)}
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                    <div
                      className="w-[12px] h-[12px] rounded-full shadow-sm shrink-0"
                      style={{ backgroundColor: themeColor }}
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[14px] md:text-[17px] font-extrabold text-primary tracking-tight break-keep">
                          {group.title}
                        </span>
                        {group.title === "동탄역세권" && (
                          <div className="relative group/info flex items-center">
                            <Info className="w-4 h-4 text-tertiary cursor-pointer hover:text-secondary transition-colors" />
                            <div className="absolute left-0 bottom-full mb-3 w-max max-w-[280px] sm:max-w-[420px] opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all bg-surface text-[13px] leading-[1.6] font-medium px-5 py-4 rounded-[12px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-border z-50 pointer-events-none flex flex-col gap-3 text-left">
                              <span className="font-bold text-[#3182f6] text-[15px]">동탄역세권 설정 기준</span>
                              <div>
                                <span className="font-bold text-primary">1. 공간적·물리적 기준</span><br />
                                <span className="text-secondary">1차: 동탄역 중심 반경 500m (도보 7~8분 한계선)<br />
                                  2차: 반경 1km 이내 (경부 지하화로 인한 광비콤 서측 동서 단절 해소)</span>
                              </div>
                              <div className="pt-2 border-t border-border">
                                <span className="font-bold text-primary">2. 시간 및 교통 연계적 기준</span><br />
                                <span className="text-secondary">복합환승 결절점(GTX-A, SRT, 인동선, 트램) 효과 및 지선망 연계를 통한 접근 시간 등가 반경 적용.<br />
                                  ➡ <span className="font-bold text-[#3182f6]">1 트램 정거장 이내 도달(반경 1.5km) 지역을 '시간적 역세권'으로 분류.</span></span>
                              </div>
                              <div className="mt-1 bg-[#3182f6]/10 text-[#3182f6] px-2 py-1.5 rounded-[6px] text-center font-bold">
                                물리+시간적 1.5km 통합 기준 적용
                              </div>
                              <div className="absolute top-full left-3 border-[6px] border-transparent border-t-white" />
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                    {(group as any).recentTxCount > 0 && (
                      <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-bold bg-[#e0fbf4] dark:bg-[#00d29d]/10 text-[#00b386] dark:text-[#00d29d] border border-transparent whitespace-nowrap leading-none shrink-0">
                        90일 거래 {(group as any).recentTxCount}건
                      </span>
                    )}
                    <div className="flex flex-col items-end shrink-0">
                      {accordionMode === "price" ? (
                        (() => {
                          const { value, unit } = formatEokWithUnit(group.avgPrice || 0);
                          return (
                            <>
                              <div className="flex items-baseline gap-1 whitespace-nowrap">
                                <span className="text-[13.5px] md:text-[18px] font-extrabold text-primary tracking-tighter">
                                  {value}
                                </span>
                                <span className="text-[10px] md:text-[11px] font-bold text-tertiary">
                                  {unit}
                                </span>
                              </div>
                              <span className="text-[11px] md:text-[12px] font-medium text-tertiary mt-0.5 whitespace-nowrap flex items-center gap-1 justify-end">
                                <span className="sm:hidden text-[10px] font-bold text-[#00b386] dark:text-[#00d29d]">
                                  (90일 {(group as any).recentTxCount}건)
                                </span>
                                평균 실거래가
                              </span>
                            </>
                          );
                        })()
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1 whitespace-nowrap">
                            <span className="text-[13.5px] md:text-[18px] font-extrabold text-primary tracking-tighter">
                              {Math.round(group.avgPyeongPrice || 0).toLocaleString()}
                            </span>
                            <span className="text-[10px] md:text-[11px] font-bold text-tertiary">
                              만원/평
                            </span>
                          </div>
                          <span className="text-[11px] md:text-[12px] font-medium text-tertiary mt-0.5 whitespace-nowrap flex items-center gap-1 justify-end">
                            <span className="sm:hidden text-[10px] font-bold text-[#00b386] dark:text-[#00d29d]">
                              (90일 {(group as any).recentTxCount}건)
                            </span>
                            평균 평단가
                          </span>
                        </>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-tertiary" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-tertiary" />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-5 pb-5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="w-full h-[1px] bg-body mb-4" />

                    <div className="flex flex-col gap-4">
                      {(() => {
                        const TIERS = accordionMode === "price"
                          ? [
                            { name: "15억원 이상", min: 150000, max: Infinity },
                            { name: "10억~15억원", min: 100000, max: 150000 },
                            { name: "8억~10억원", min: 80000, max: 100000 },
                            { name: "6억~8억원", min: 60000, max: 80000 },
                            { name: "6억원 미만", min: 0, max: 60000 },
                          ]
                          : [
                            { name: "4,000만원 이상", min: 4000, max: Infinity },
                            { name: "3,000~4,000만원", min: 3000, max: 4000 },
                            { name: "2,500~3,000만원", min: 2500, max: 3000 },
                            { name: "2,000~2,500만원", min: 2000, max: 2500 },
                            { name: "2,000만원 미만", min: 0, max: 2000 },
                          ];

                        // Compute which tiers have apartments
                        const availableTiers = TIERS.map((tier, idx) => {
                          const apts = group.apartments.filter((apt) => {
                            const val = accordionMode === "price" ? apt.latestPrice : apt.pyeongPrice;
                            return val >= tier.min && val < tier.max;
                          }).sort((a, b) => {
                            return accordionMode === "price" ? b.latestPrice - a.latestPrice : b.pyeongPrice - a.pyeongPrice;
                          });
                          return { ...tier, originalIndex: idx, apts };
                        }).filter(t => t.apts.length > 0);

                        if (availableTiers.length === 0) return null;

                        // Default to the first available tier if none is selected
                        const currentTierIndex = selectedTiers[group.title] ?? availableTiers[0].originalIndex;
                        const activeTier = availableTiers.find(t => t.originalIndex === currentTierIndex) || availableTiers[0];

                        return (
                          <>
                            {/* Tier Selection Pills */}
                            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 pt-1 -mx-2 px-2">
                              {availableTiers.map(t => {
                                const isActive = t.originalIndex === currentTierIndex;
                                return (
                                  <button
                                    key={t.originalIndex}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTiers(prev => ({ ...prev, [group.title]: t.originalIndex }));
                                    }}
                                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-colors ${isActive
                                      ? "bg-[#333d4b] text-white shadow-sm"
                                      : "bg-body text-tertiary hover:bg-[#e5e8eb] hover:text-secondary"
                                      }`}
                                  >
                                    {t.name}
                                    <span className={`text-[11px] px-1.5 py-0.5 rounded-md ${isActive ? 'bg-surface/20 text-white' : 'bg-[#e5e8eb] text-tertiary'}`}>
                                      {t.apts.length}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Active Tier Apartments List */}
                            <div className="flex flex-col gap-2 mt-1 animate-in fade-in duration-300">
                              {activeTier.apts.map((apt) => (
                                <div
                                  key={apt.name}
                                  onClick={(e) => { e.stopPropagation(); onSelectApt && onSelectApt(apt.name); }}
                                  className="flex flex-col p-3.5 sm:p-4 rounded-[14px] border border-border bg-surface hover:border-[#00d29d]/30 hover:bg-body cursor-pointer transition-all shadow-sm group/apt gap-2 sm:gap-2.5"
                                >
                                  {/* Top Row: Name and Chevron */}
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                                      <div className="w-1.5 h-1.5 bg-[#d1d6db] rounded-full shrink-0 group-hover/apt:bg-[#00d29d] transition-colors" />
                                      <span className="text-[14.5px] sm:text-[15.5px] font-extrabold text-primary truncate">
                                        {apt.name}
                                      </span>
                                      {!!((apt.likes && apt.likes >= 3) || (apt.views && apt.views >= 100)) && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-[5px] text-[10px] font-black bg-rose-50 dark:bg-rose-950/20 text-rose-500 border border-rose-500/10 leading-none shrink-0 gap-0.5 animate-pulse">
                                          🔥 HOT
                                        </span>
                                      )}
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-tertiary shrink-0" />
                                  </div>

                                  {/* Bottom Row: Distance and Price */}
                                  <div className="flex items-center justify-between pl-4 mt-0.5">
                                    <div className="flex items-center min-w-0 pr-2">
                                      {apt.distToDongtan !== null && (
                                        <span className="text-[11px] sm:text-[11.5px] font-bold text-[#3182f6] bg-[#e8f3ff] px-2 py-[3px] rounded-[6px] group-hover/apt:bg-[#d1e6ff] transition-colors border border-[#3182f6]/10 inline-flex whitespace-nowrap">
                                          동탄역 {(apt.distToDongtan / 1000).toFixed(2)}km
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex flex-row items-baseline gap-1 text-right shrink-0">
                                      {accordionMode === "price" ? (
                                        (() => {
                                          const { value, unit } = formatEokWithUnit(apt.latestPrice);
                                          return (
                                            <>
                                              <span className="text-[13.5px] sm:text-[15px] font-extrabold text-primary whitespace-nowrap">
                                                {value}
                                              </span>
                                              <span className="text-[10px] sm:text-[11px] font-bold text-tertiary whitespace-nowrap">
                                                {unit}
                                              </span>
                                            </>
                                          );
                                        })()
                                      ) : (
                                        <>
                                          <span className="text-[13.5px] sm:text-[15px] font-extrabold text-primary whitespace-nowrap">
                                            {Math.round(apt.pyeongPrice).toLocaleString()}
                                          </span>
                                          <span className="text-[10px] sm:text-[11px] font-bold text-tertiary whitespace-nowrap">
                                            만원/평
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {/* 커뮤니티 라운지 연결 브릿지 */}
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.hash = 'lounge';
                                }}
                                className="mt-2.5 flex items-center justify-between p-3.5 rounded-[12px] bg-body hover:bg-[#e8f3ff] hover:text-[#3182f6] border border-dashed border-border text-secondary text-[12px] font-extrabold cursor-pointer transition-colors group/bridge gap-2"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <MessageSquare className="w-3.5 h-3.5 text-[#3182f6] shrink-0" />
                                  <span className="truncate">"{group.title}" 권역 입주민 라운지 수다방 입장</span>
                                </div>
                                <span className="text-[11px] font-extrabold text-[#3182f6] inline-flex items-center shrink-0">
                                  대화 참여
                                  <ChevronRight className="w-3 h-3 ml-0.5 transform group-hover/bridge:translate-x-0.5 transition-transform" />
                                </span>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Ad Banner Placeholder (8th Slot) */}
          <NativeAdPlaceholder 
            location="매크로 대시보드 하단" 
            onClick={onOpenAdModal} 
            adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD_BOTTOM || "test-dashboard-bottom-slot"} 
          />
        </div>

        {/* 권역별 분류와 뉴스 피드 사이의 구분선 */}
        <div className="w-full my-8 md:my-12">
          <div className="w-full h-[1px] bg-border dark:bg-slate-800/80" />
        </div>

        {/* Dongtan Market Insights (News & Notice Section) */}
        <div className="mb-8 bg-surface rounded-2xl shadow-sm border border-border p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-[18px] md:text-[24px] font-extrabold text-primary tracking-tight whitespace-nowrap">
              동탄 부동산 인사이트
            </h2>
            <p className="text-[11.5px] md:text-[13px] font-medium text-tertiary mt-1 italic">
              Dongtan real estate market latest insights & news
            </p>
          </div>

          {/* Switch Tabs */}
          <div className="flex border-b border-border mb-6">
            <button
              onClick={() => setNewsTab("news")}
              className={`pb-3 px-4 text-[13.5px] md:text-[15px] font-extrabold transition-all border-b-2 -mb-[1px] ${
                newsTab === "news"
                  ? "border-[#00d29d] text-primary"
                  : "border-transparent text-tertiary hover:text-secondary"
              }`}
            >
              부동산 뉴스
            </button>
            <button
              onClick={() => setNewsTab("notice")}
              className={`pb-3 px-4 text-[13.5px] md:text-[15px] font-extrabold transition-all border-b-2 -mb-[1px] ${
                newsTab === "notice"
                  ? "border-[#00d29d] text-primary"
                  : "border-transparent text-tertiary hover:text-secondary"
              }`}
            >
              동탄 소식
            </button>
          </div>

          {newsTab === "news" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {newsLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex gap-4 p-5 rounded-xl border border-border bg-body animate-pulse"
                  >
                    <div className="w-8 h-8 shrink-0 bg-gray-200 rounded-full" />
                    <div className="flex flex-col w-full">
                      <div className="w-1/3 h-3 bg-gray-200 rounded mb-2" />
                      <div className="w-full h-4 bg-gray-200 rounded mb-1.5" />
                      <div className="w-2/3 h-4 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))
                : (newsData.length > 0
                  ? newsData.slice(0, visibleNewsCount)
                  : [
                    {
                      id: 1,
                      category: "INFRASTRUCTURE",
                      sub: "Transportation",
                      title:
                        "GTX-A 노선 개통 이후 동탄역 주변 아파트 실거래가 15% 상승 — 광역 교통망 확충이 지역 핵심 자산 가치에 미치는 파급력 분석.",
                      link: "#",
                    },
                    {
                      id: 2,
                      category: "MARKET",
                      sub: "Supply & Demand",
                      title:
                        "동탄2신도시 입주 물량 안정화 진입, 전세가율 반등 — 동탄 호수공원 및 문화디자인밸리 중심의 신축 아파트 선호도 지속.",
                      link: "#",
                    },
                    {
                      id: 3,
                      category: "POLICY",
                      sub: "Urban Development",
                      title:
                        "동탄 트램(도시철도) 기본설계 본격화 — 1동탄 and 2동탄을 잇는 내부 교통망 완성으로 인한 권역별 가격 갭(Gap) 축소 전망.",
                      link: "#",
                    },
                    {
                      id: 4,
                      category: "COMMERCIAL",
                      sub: "Anchor Tenant",
                      title:
                        "경부고속도로 지하화 및 상부 공원화 사업 — 동탄역세권 광역비즈니스콤플렉스 확장 및 라이프스타일 앵커 시설 도입 예정.",
                      link: "#",
                    },
                    {
                      id: 5,
                      category: "MACRO",
                      sub: "Liquidity",
                      title:
                        "금리 인하 기대감 선반영, 거래량 3개월 연속 상승 — 신생아 특례대출 등 정책 금융이 3040 세대의 매수 심리에 미친 영향.",
                      link: "#",
                    },
                    {
                      id: 6,
                      category: "COMMUNITY",
                      sub: "Education",
                      title:
                        "동탄 내 학군 형성 가속화, '시범 커뮤니티' 권역 프리미엄 고착화 — 우수 학군 배정 단지의 가격 하방 경직성 및 거래 회전율 검증.",
                      link: "#",
                    },
                  ]
                ).map((news) => {
                  const isPlaceholder = news.link === "#";
                  const LinkComponent = isPlaceholder ? "div" : "a";
                  return (
                    <LinkComponent
                      key={news.id}
                      href={isPlaceholder ? undefined : news.link}
                      target={isPlaceholder ? undefined : "_blank"}
                      rel={isPlaceholder ? undefined : "noopener noreferrer"}
                      className="flex gap-4 p-5 rounded-xl border border-border bg-body hover:bg-surface hover:border-[#00d29d]/30 transition-all cursor-pointer group"
                    >
                      <div className="w-8 h-8 md:w-9 md:h-9 shrink-0 flex items-center justify-center bg-surface rounded-full border border-border text-[#00d29d] font-bold text-[13px] md:text-[14px] shadow-sm group-hover:bg-[#00d29d] group-hover:text-white transition-colors">
                        {news.id}
                      </div>
                      <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                          <span className="text-[11px] md:text-[12px] font-extrabold text-[#00d29d] tracking-wide">
                            {news.category}
                          </span>
                          <span className="text-[11px] md:text-[12px] text-gray-300">|</span>
                          <span className="text-[11px] md:text-[12px] font-semibold text-tertiary">
                            {news.sub}
                          </span>
                        </div>
                        <p className="text-[13px] md:text-[15px] font-semibold text-secondary leading-snug md:leading-[1.5] group-hover:text-primary transition-colors line-clamp-2">
                          {news.title}
                        </p>
                      </div>
                    </LinkComponent>
                  );
                })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!noticesData
                ? Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex gap-4 p-5 rounded-xl border border-border bg-body animate-pulse"
                  >
                    <div className="w-8 h-8 shrink-0 bg-gray-200 rounded-full" />
                    <div className="flex flex-col w-full">
                      <div className="w-1/3 h-3 bg-gray-200 rounded mb-2" />
                      <div className="w-full h-4 bg-gray-200 rounded mb-1.5" />
                      <div className="w-2/3 h-4 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))
                : (noticesData.notices && noticesData.notices.length > 0
                  ? noticesData.notices.slice(0, visibleNoticeCount)
                  : []
                ).map((notice: LocalNoticeItem, index: number) => (
                  <a
                    key={notice.id || index}
                    href={(notice.url || '').trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-4 p-5 rounded-xl border border-border bg-body hover:bg-surface hover:border-[#00d29d]/30 transition-all cursor-pointer group"
                  >
                    <div className="w-8 h-8 md:w-9 md:h-9 shrink-0 flex items-center justify-center bg-surface rounded-full border border-border text-[#00d29d] font-bold text-[13px] md:text-[14px] shadow-sm group-hover:bg-[#00d29d] group-hover:text-white transition-colors">
                      {index + 1}
                    </div>
                    <div className="flex flex-col justify-center min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                        <span className="text-[11px] md:text-[12px] font-extrabold text-[#00d29d] tracking-wide">
                          {notice.dept || "동탄 소식"}
                        </span>
                        <span className="text-[11px] md:text-[12px] text-gray-300">|</span>
                        <span className="text-[11px] md:text-[12px] font-semibold text-tertiary">
                          {notice.date}
                        </span>
                        {notice.isDongtan && (
                          <>
                            <span className="text-[11px] md:text-[12px] text-gray-300">|</span>
                            <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-1 py-0.5 text-[9px] font-black rounded">동탄</span>
                          </>
                        )}
                      </div>
                      <p className="text-[13px] md:text-[15px] font-semibold text-secondary leading-snug md:leading-[1.5] group-hover:text-primary transition-colors line-clamp-2">
                        {notice.title}
                      </p>
                    </div>
                  </a>
                ))
              }
              {noticesData && (!noticesData.notices || noticesData.notices.length === 0) && (
                <div className="col-span-1 md:col-span-2 text-center py-12 text-tertiary font-bold text-[14.5px]">
                  최근 행정 고시공고 소식이 존재하지 않습니다.
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 justify-center items-center">
            {newsTab === "news" ? (
              visibleNewsCount < (newsData.length || 100) && (
                <button
                  onClick={() => setVisibleNewsCount(prev => prev + 6)}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-surface border border-border hover:bg-body text-secondary text-[13.5px] font-bold rounded-full transition-colors shadow-sm"
                >
                  뉴스 더보기 ({visibleNewsCount} / {newsData.length || 100})
                  <ChevronRight className="w-4 h-4" />
                </button>
              )
            ) : (
              noticesData?.notices && visibleNoticeCount < noticesData.notices.length && (
                <button
                  onClick={() => setVisibleNoticeCount(prev => prev + 6)}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-surface border border-border hover:bg-body text-secondary text-[13.5px] font-bold rounded-full transition-colors shadow-sm"
                >
                  소식 더보기 ({visibleNoticeCount} / {noticesData.notices.length})
                  <ChevronRight className="w-4 h-4" />
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
