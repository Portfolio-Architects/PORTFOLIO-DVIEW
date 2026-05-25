import React, { useMemo, useState, useDeferredValue } from "react";
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

interface InfoBoxProps {
  title: React.ReactNode;
  value: React.ReactNode;
  unit?: string;
  progress?: number;
  badge?: React.ReactNode;
  color?: string;
}

const InfoBox = ({
  title,
  value,
  unit,
  progress,
  badge,
  color = "#00d29d",
}: InfoBoxProps) => {
  return (
    <div className="bg-[#f4f5f6] dark:bg-body rounded-[14px] p-2.5 md:p-4 flex flex-col gap-1 md:gap-1.5 shadow-sm border border-border h-full justify-center">
      {/* Title Area */}
      <div className="text-[11.5px] md:text-body-normal font-bold text-tertiary tracking-tight min-w-0 w-full break-keep leading-snug">
        {title}
      </div>

      {/* Content Area */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full gap-1 md:gap-2 mt-0.5 md:mt-0">

        {/* Value & Unit */}
        <div className="flex items-baseline gap-0.5 md:gap-1 min-w-0 flex-wrap">
          <span className="text-[14.5px] md:text-title-lg font-extrabold text-primary tracking-tight break-keep leading-tight">
            {value}
          </span>
          {unit && (
            <span className="text-[11px] md:text-body-sm font-bold text-secondary tracking-tight shrink-0">
              {unit}
            </span>
          )}
        </div>

        {/* Badges / Progress */}
        {(progress !== undefined || badge) && (
          <div className="flex items-center shrink-0 self-start md:self-auto md:ml-auto gap-2">
            {badge && (
              <div className="bg-surface border border-border px-2.5 py-0.5 md:px-3 md:py-1 rounded-[6px] shadow-sm">
                <span className="text-[13px] tracking-tight font-extrabold text-[#00d29d] whitespace-nowrap">
                  {badge}
                </span>
              </div>
            )}
            {progress !== undefined && (
              <div className="relative flex items-center justify-center">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 32 32"
                  className="transform -rotate-90 md:w-6 md:h-6"
                >
                  <circle
                    cx="16"
                    cy="16"
                    r="12"
                    fill="transparent"
                    stroke="#e5e8eb"
                    strokeWidth="4"
                  />
                  <circle
                    cx="16"
                    cy="16"
                    r="12"
                    fill="transparent"
                    stroke={color}
                    strokeWidth="4"
                    strokeDasharray={2 * Math.PI * 12}
                    strokeDashoffset={2 * Math.PI * 12 * (1 - progress / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
              </div>
            )}
          </div>
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
        p.dataKey === "동탄 아파트 전세 평균" || p.name === "평균 전월세가",
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
            entry.name === "평균 전월세가";
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
  const { data: gaData } = useSWR('/api/public/analytics', fetcher, { 
    revalidateOnFocus: false,
    dedupingInterval: 60000 
  });
  
  const formatNum = (num?: number) => typeof num === 'number' ? num.toLocaleString() : '-';
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [chartMode, setChartMode] = useState<"price" | "pyeong">("price");
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

  // 1. Donut Chart Data (실거래가/평단가 티어별 세대수 분포)
  const donutData = useMemo(() => {
    const priceTiers = [
      { name: "15억원 이상", min: 150000, max: Infinity, count: 0 },
      { name: "10억~15억원", min: 100000, max: 150000, count: 0 },
      { name: "8억~10억원", min: 80000, max: 100000, count: 0 },
      { name: "6억~8억원", min: 60000, max: 80000, count: 0 },
      { name: "6억원 미만", min: 0, max: 60000, count: 0 },
    ];

    const pyeongTiers = [
      { name: "4,000만원 이상", min: 4000, max: Infinity, count: 0 },
      { name: "3,000~4,000만원", min: 3000, max: 4000, count: 0 },
      { name: "2,500~3,000만원", min: 2500, max: 3000, count: 0 },
      { name: "2,000~2,500만원", min: 2000, max: 2500, count: 0 },
      { name: "2,000만원 미만", min: 0, max: 2000, count: 0 },
    ];

    const tiers = chartMode === "price" ? priceTiers : pyeongTiers;

    Object.entries(sheetApartments).forEach(([dong, apts]) => {
      const validApts = apts.filter((a) => !publicRentalSet.has(a.name));

      validApts.forEach((a) => {
        const rawTxKey = a.txKey || findTxKey(a.name, txSummaryData, nameMapping);
        const key = rawTxKey ? normalizeAptName(rawTxKey) : null;
        const tx = key ? txSummaryData[key] : undefined;
        if (tx && a.householdCount) {
          let valueToCompare = 0;
          const sales = tx.avg3MPrice || tx.avg1MPrice || tx.latestPrice || 0;
          if (chartMode === "price" && sales > 0) {
            valueToCompare = sales; // 만원 단위
          } else if (chartMode === "pyeong") {
            valueToCompare =
              tx.avg3MPerPyeong ||
              tx.avg1MPerPyeong ||
              (tx.latestArea ? tx.latestPrice / (tx.latestArea / 3.3058) : 0);
          }

          if (valueToCompare > 0) {
            const tier = tiers.find(
              (t) => valueToCompare >= t.min && valueToCompare < t.max,
            );
            if (tier) {
              tier.count += a.householdCount;
            }
          }
        }
      });
    });

    return tiers.map((t) => ({
      name: t.name,
      value: t.count,
    }));
  }, [sheetApartments, publicRentalSet, txSummaryData, chartMode]);

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

  const lineData = useMemo(() => {
    if (!deferredMacroTrendData) return [];
    let count = deferredMacroTrendData.length;
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
        count = deferredMacroTrendData.length;
        break;
    }
    return deferredMacroTrendData.slice(
      -Math.min(count, deferredMacroTrendData.length),
    );
  }, [timeframe, deferredMacroTrendData]);

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

  const topTierRatio =
    totalHouseholds > 0
      ? (((donutData[0]?.value || 0) + (donutData[1]?.value || 0)) /
        totalHouseholds) *
      100
      : 0;
  const topTierLabel =
    chartMode === "price" ? "PREMIUM (1급지+)" : "NEW APT (10년내)";

  const publicRentalRatio =
    totalHouseholds > 0 ? (publicRentalHouseholds / totalHouseholds) * 100 : 0;

  const latestAvgPrice =
    macroTrendData && macroTrendData.length > 0
      ? macroTrendData[macroTrendData.length - 1]["동탄 아파트 전체"]
      : 0;
  const avgPriceProgress = Math.min((latestAvgPrice / 15) * 100, 100);

  const avgPriceFormatted = useMemo(() => {
    const uk = Math.floor(latestAvgPrice);
    const man = Math.round((latestAvgPrice - uk) * 10000);

    if (man === 0) {
      return { value: `${uk}`, unit: "억" };
    }
    return { value: `${uk}억 ${man.toLocaleString()}`, unit: "만원" };
  }, [latestAvgPrice]);

  const momStats = useMemo(() => {
    if (!macroTrendData || macroTrendData.length < 2)
      return {
        change: 0,
        changeText: "0원",
        rate: 0,
        text: "보합 상태",
        color: "#b0b8c1",
      };
    const current =
      macroTrendData[macroTrendData.length - 1]["동탄 아파트 전체"];
    const prev =
      macroTrendData[macroTrendData.length - 2]["동탄 아파트 전체"];
    if (prev === 0)
      return {
        change: 0,
        changeText: "0원",
        rate: 0,
        text: "보합 상태",
        color: "#b0b8c1",
      };

    const change = current - prev;
    const rate = (change / prev) * 100;

    const formatChange = (c: number) => {
      const uk = Math.floor(c);
      const man = Math.round((c - uk) * 10000);
      if (uk === 0) return `${man.toLocaleString()}만원`;
      if (man === 0) return `${uk}억`;
      return `${uk}억 ${man.toLocaleString()}만원`;
    };

    const absChange = Math.abs(change);
    const changeText = formatChange(absChange);

    if (change > 0)
      return {
        change: absChange,
        changeText,
        rate: Math.abs(rate),
        text: "상승 중",
        color: "#f04452",
      };
    if (change < 0)
      return {
        change: absChange,
        changeText,
        rate: Math.abs(rate),
        text: "하락 중",
        color: "#3182f6",
      };
    return {
      change: 0,
      changeText: "0원",
      rate: 0,
      text: "보합 상태",
      color: "#b0b8c1",
    };
  }, [lineData]);

  const dongtanAvgPyeongPrice = useMemo(() => {
    let sum = 0;
    let count = 0;
    if (!sheetApartments) return 0;

    Object.values(sheetApartments)
      .flat()
      .forEach((apt) => {
        if (publicRentalSet.has(apt.name)) return;
        const rawTxKey =
          apt.txKey || findTxKey(apt.name, txSummaryData, nameMapping);
        const txKey = rawTxKey ? normalizeAptName(rawTxKey) : null;
        const tx = txKey ? txSummaryData[txKey] : undefined;

        if (tx) {
          const pyeongPrice =
            tx.avg3MPerPyeong ||
            tx.avg1MPerPyeong ||
            (tx.latestArea ? tx.latestPrice / (tx.latestArea / 3.3058) : 0);
          if (pyeongPrice > 0) {
            sum += pyeongPrice;
            count++;
          }
        }
      });

    return count > 0 ? Math.round(sum / count) : 0;
  }, [txSummaryData, sheetApartments, publicRentalSet]);

  const [maxAptName, maxPriceEok] = useMemo(() => {
    let maxPrice = 0;
    let maxEok = "";
    let displayAptName = "";

    if (!sheetApartments) return ["", ""];

    Object.values(sheetApartments)
      .flat()
      .forEach((apt) => {
        if (publicRentalSet.has(apt.name)) return;
        const txKey = findTxKey(apt.name, txSummaryData, nameMapping);
        if (txKey && txSummaryData[txKey]) {
          const tx = txSummaryData[txKey];
          const sales = tx.avg3MPrice || tx.avg1MPrice || tx.latestPrice || 0;
          if (sales > maxPrice) {
            maxPrice = sales;
            const fmt = formatEokWithUnit(sales);
            maxEok = `${fmt.value}${fmt.unit}`;
            displayAptName = apt.name;
          }
        }
      });

    return [displayAptName, maxEok];
  }, [txSummaryData, sheetApartments, publicRentalSet]);

  const [maxPyeongAptName, maxPyeongPrice] = useMemo(() => {
    let maxPrice = 0;
    let displayAptName = "";

    if (!sheetApartments) return ["", 0];

    Object.values(sheetApartments)
      .flat()
      .forEach((apt) => {
        if (publicRentalSet.has(apt.name)) return;
        const txKey = findTxKey(apt.name, txSummaryData, nameMapping);
        if (txKey && txSummaryData[txKey]) {
          const tx = txSummaryData[txKey];
          const pyeongPrice =
            tx.avg3MPerPyeong ||
            tx.avg1MPerPyeong ||
            (tx.latestArea ? tx.latestPrice / (tx.latestArea / 3.3058) : 0);
          if (pyeongPrice > maxPrice) {
            maxPrice = pyeongPrice;
            displayAptName = apt.name;
          }
        }
      });

    return [displayAptName, Math.round(maxPrice)];
  }, [txSummaryData, sheetApartments, publicRentalSet]);



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
        subtitleLight={
          <div className="flex flex-nowrap overflow-x-auto overflow-y-hidden touch-pan-x sm:overflow-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] items-center gap-2 sm:gap-3 ml-0 sm:ml-1 mt-1 sm:mt-0 max-w-[calc(100vw-32px)] md:max-w-none h-7 md:h-auto py-1 md:py-0">
            <span className="hidden sm:inline text-[#d1d6db] mr-0.5 shrink-0">—</span>
            <div className="group relative flex items-center gap-1.5 shrink-0 cursor-help">
              <span className="bg-body border border-border px-1.5 py-0.5 rounded text-[11px] sm:text-[12px] text-secondary font-bold tracking-tight">MAU</span>
              <span className="text-primary font-semibold text-[13px] sm:text-[14px] font-mono tabular-nums">{gaData ? formatNum(gaData.mau) : '...'}</span>
              <div className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-full mt-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 bg-[#191f28] text-white text-[12px] font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl z-50">
                최근 30일 동안의 월간 순 방문자 수
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-[#191f28]" />
              </div>
            </div>
            <div className="w-[3px] h-[3px] rounded-full bg-[#d1d6db] shrink-0" />
            <div className="group relative flex items-center gap-1.5 shrink-0 cursor-help">
              <span className="bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded text-[11px] sm:text-[12px] text-toss-blue font-bold tracking-tight">DAU</span>
              <span className="text-toss-blue font-extrabold text-[13px] sm:text-[14px] font-mono tabular-nums">{gaData ? formatNum(gaData.dau) : '...'}</span>
              <div className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-full mt-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 bg-[#191f28] text-white text-[12px] font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl z-50">
                오늘 하루 동안의 일간 순 방문자 수
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-[#191f28]" />
              </div>
            </div>
            <div className="w-[3px] h-[3px] rounded-full bg-[#d1d6db] shrink-0" />
            <div className="group relative flex items-center gap-1.5 shrink-0 cursor-help">
              <span className="bg-body border border-border px-1.5 py-0.5 rounded text-[11px] sm:text-[12px] text-secondary font-bold tracking-tight">VIEW (30D)</span>
              <span className="text-primary font-semibold text-[13px] sm:text-[14px] font-mono tabular-nums">{gaData ? formatNum(gaData.totalViews) : '...'}</span>
              <div className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-full mt-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 bg-[#191f28] text-white text-[12px] font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl z-50">
                최근 30일 동안의 누적 페이지 뷰 (조회수) 총합
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-[#191f28]" />
              </div>
            </div>
            <div className="hidden sm:block w-[3px] h-[3px] rounded-full bg-[#d1d6db] shrink-0" />
            <div className="group relative flex items-center gap-1.5 shrink-0 pr-4 sm:pr-0 cursor-help">
              <span className="bg-body border border-border px-1.5 py-0.5 rounded text-[11px] sm:text-[12px] text-secondary font-bold tracking-tight">AVG. TIME</span>
              <span className="text-primary font-semibold text-[13px] sm:text-[14px] font-mono tabular-nums">{gaData ? gaData.avgSessionDuration : '...'}</span>
              <div className="hidden sm:block absolute right-0 top-full mt-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 bg-[#191f28] text-white text-[12px] font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl z-50">
                방문자 1인당 평균 체류 시간
                <div className="absolute bottom-full right-6 border-4 border-transparent border-b-[#191f28]" />
              </div>
            </div>
          </div>
        }
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
            {/* Donut Chart Card */}
            <div className="flex flex-col bg-surface rounded-2xl shadow-sm border border-border px-5 py-7 min-h-[350px]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-[18px] font-extrabold text-primary tracking-tight">
                  동탄 아파트 {chartMode === "price" ? "가격" : "평단가"} 현황
                </h2>
                {/* Toss Style Segmented Control */}
                <div className="flex bg-body p-1 rounded-lg">
                  <button
                    onClick={() => setChartMode("price")}
                    className={`px-3 py-1.5 text-[12px] font-bold rounded-md transition-all ${chartMode === "price"
                      ? "bg-surface text-primary shadow-sm"
                      : "text-tertiary hover:text-secondary"
                      }`}
                  >
                    매매가
                  </button>
                  <button
                    onClick={() => setChartMode("pyeong")}
                    className={`px-3 py-1.5 text-[12px] font-bold rounded-md transition-all ${chartMode === "pyeong"
                      ? "bg-surface text-primary shadow-sm"
                      : "text-tertiary hover:text-secondary"
                      }`}
                  >
                    평당가
                  </button>
                </div>
              </div>

              <div ref={chartContainerRef} className="flex-1 flex flex-col xl:flex-row items-center justify-between px-2 xl:px-12 gap-6 relative mt-3">
                <div className="w-[240px] h-[240px] relative shrink-0">
                  {/* Center Label (Placed before ResponsiveContainer to prevent z-index overlap with Tooltip) */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                    <span className="text-[13px] font-bold text-tertiary mb-1">
                      분석 세대수
                    </span>
                    <span className="text-[26px] font-extrabold text-primary leading-none tracking-tight">
                      {totalHouseholds.toLocaleString()}
                      <span className="text-[15px] font-bold text-tertiary ml-1">
                        세대
                      </span>
                    </span>
                  </div>

                  <ResponsiveContainer
                    width="100%"
                    minWidth={1}
                    minHeight={1}
                    height={240}
                    className="relative z-10"
                  >
                    <PieChart onMouseLeave={() => setActiveIndex(null)}>
                      <Pie
                        data={donutData}
                        innerRadius={78}
                        outerRadius={110}
                        paddingAngle={2}
                        dataKey="value"
                        onMouseEnter={(_, index) => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(null)}
                        stroke="none"
                        animationDuration={400}
                        animationBegin={0}
                      >
                        {donutData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            style={{
                              transition: "all 0.3s ease",
                              opacity:
                                activeIndex === null || activeIndex === index
                                  ? 1
                                  : 0.3,
                              filter: "none",
                            }}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length && activeIndex !== null) {
                            const color = payload[0].payload?.fill || payload[0].color || "#4e5968";
                            return (
                              <div className="bg-surface py-2 px-3 rounded-[10px] shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-border">
                                <span className="text-[14.5px] font-bold" style={{ color }}>
                                  세대수 : {(payload[0].value || 0).toLocaleString()} 세대
                                </span>
                              </div>
                            );
                          }
                          return null;
                        }}
                        cursor={{ fill: "transparent" }}
                        isAnimationActive={false}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Interactive Legend */}
                <div className="flex flex-col gap-1 w-full max-w-[260px]">
                  {donutData.map((entry, index) => {
                    const totalValue = donutData.reduce(
                      (s, i) => s + i.value,
                      0,
                    );
                    const percentage =
                      totalValue > 0
                        ? ((entry.value / totalValue) * 100).toFixed(1)
                        : "0.0";
                    const isActive = activeIndex === index;
                    return (
                      <div
                        key={entry.name}
                        className={`flex items-center justify-between px-3 py-1.5 rounded-xl transition-all cursor-pointer ${isActive ? "bg-body scale-[1.02]" : "hover:bg-body"}`}
                        onMouseEnter={() => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(null)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                            style={{
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                          <span className="text-[14px] font-bold text-secondary tracking-tight">
                            {entry.name}
                          </span>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className="text-[15.5px] font-extrabold text-primary leading-none mb-1">
                            {percentage}%
                          </span>
                          <span className="text-[12px] font-semibold text-tertiary leading-none">
                            {entry.value.toLocaleString()} 세대
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 4 Info Boxes Grid */}
            <div className="grid grid-cols-2 gap-3">
              <InfoBox
                title="대장 아파트 단지"
                value={maxAptName}
                badge={maxPriceEok}
              />
              <InfoBox
                title="최고 평당가 단지"
                value={maxPyeongAptName}
                badge={
                  <>
                    {maxPyeongPrice.toLocaleString()}만원
                    <span className="text-secondary ml-0.5 font-bold">/평</span>
                  </>
                }
              />
              <InfoBox
                title={
                  <div className="relative group flex items-center gap-1 w-full">
                    <span className="break-keep whitespace-nowrap tracking-tight">
                      평균 매매/평당가
                    </span>
                    <Info className="w-3.5 h-3.5 shrink-0 text-tertiary cursor-pointer hover:text-secondary transition-colors" />

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[280px] p-3 bg-[#191f28] text-white text-[13px] font-medium leading-[1.5] rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 normal-case tracking-normal whitespace-normal break-keep">
                      통계 왜곡을 방지하기 위해 국민평형(30~36평형)을 기준으로,
                      각 단지별 가장 최근 실거래가를 취합하여 산출한 대표
                      가격입니다.
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#191f28]"></div>
                    </div>
                  </div>
                }
                value={avgPriceFormatted.value}
                unit={avgPriceFormatted.unit}
                badge={
                  <>
                    {dongtanAvgPyeongPrice.toLocaleString()}만원
                    <span className="text-secondary ml-0.5 font-bold">/평</span>
                  </>
                }
              />
              <InfoBox
                title={
                  <div className="relative group flex items-center gap-1 w-full">
                    <span className="break-keep whitespace-nowrap tracking-tight">전월 대비 가격 변동</span>
                    <Info className="w-3.5 h-3.5 shrink-0 text-tertiary cursor-pointer hover:text-secondary transition-colors" />

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[280px] p-3 bg-[#191f28] text-white text-[13px] font-medium leading-[1.5] rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 normal-case tracking-normal whitespace-normal break-keep">
                      동탄 지역 내 거래된 전체 아파트의 지난달 평균 실거래가
                      대비, 이번 달 평균 실거래가의 변동폭을 의미합니다.
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#191f28]"></div>
                    </div>
                  </div>
                }
                value={
                  <span style={{ color: momStats.color }}>{momStats.text}</span>
                }
                badge={
                  <>
                    {momStats.text === "상승 중"
                      ? "+"
                      : momStats.text === "하락 중"
                        ? "-"
                        : ""}
                    {momStats.changeText}{" "}
                    <span className="text-secondary ml-0.5 font-bold">
                      (
                      {momStats.text === "상승 중"
                        ? "+"
                        : momStats.text === "하락 중"
                          ? "-"
                          : ""}
                      {momStats.rate.toFixed(1)}%)
                    </span>
                  </>
                }
                color={momStats.color}
              />
            </div>
          </div>

          {/* Right Panel: Line Chart */}
          <div className="w-full md:w-1/2 flex flex-col bg-surface rounded-2xl shadow-sm border border-border p-4 sm:p-5 min-h-[300px] min-w-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div className="flex flex-col">
                <h2 className="text-[18px] font-extrabold text-primary tracking-tight">
                  동탄 아파트 대표 가격 변화 추이
                </h2>
                <span className="text-[13px] text-tertiary font-medium mt-1">
                  {timeframe === "ALL"
                    ? "전체 기간 "
                    : `최근 ${timeframe.replace("M", "개월").replace("Y", "년")} `}
                  국민평형(30~36평형) 실거래가 변동
                </span>
              </div>
              <div className="flex bg-body p-0.5 rounded-lg shadow-inner self-end sm:self-auto">
                {(["3M", "6M", "1Y", "3Y", "5Y", "ALL"] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2.5 py-1 text-[11px] font-extrabold rounded-md transition-all duration-200 ${timeframe === tf
                      ? "bg-surface text-primary shadow-sm"
                      : "text-tertiary hover:text-secondary"
                      }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full h-[250px] md:h-auto md:flex-1 mt-2 sm:mt-0 min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <LineChart
                    data={lineData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--border-color)"
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
                      yAxisId="left"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--text-secondary)", fontSize: 12, fontWeight: 600 }}
                      tickFormatter={(value: number) =>
                        `${Number.isInteger(value) ? value : value.toFixed(1)}억`
                      }
                      domain={["auto", "auto"]}
                      width={40}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--text-secondary)", fontSize: 12, fontWeight: 600 }}
                      tickFormatter={(value: number) =>
                        `${Number.isInteger(value) ? value : value.toFixed(1)}억`
                      }
                      domain={["auto", "auto"]}
                      width={40}
                    />
                    <RechartsTooltip
                      content={<CustomTooltip />}
                      cursor={{
                        stroke: "var(--border-color)",
                        strokeWidth: 2,
                        strokeDasharray: "3 3",
                      }}
                    />
                    <Legend
                      align="center"
                      verticalAlign="bottom"
                      iconType="circle"
                      wrapperStyle={{
                        paddingTop: "20px",
                        fontSize: "13px",
                        fontWeight: "bold",
                      }}
                      formatter={(value, entry: { color?: string }) => (
                        <span
                          style={{
                            color: entry.color,
                            marginLeft: "4px",
                          }}
                        >
                          {value}
                        </span>
                      )}
                    />
                    <Line
                      yAxisId="left"
                      key="동탄 아파트 전체"
                      type="monotone"
                      name="평균 매매가(좌)"
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
                      yAxisId="right"
                      key="동탄 아파트 전세 평균"
                      type="monotone"
                      name="평균 전월세가(우)"
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
                        <span className="text-[15px] md:text-[18px] font-extrabold text-primary tracking-tight break-keep">
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
                    <div className="flex flex-col items-end shrink-0">
                      {accordionMode === "price" ? (
                        (() => {
                          const { value, unit } = formatEokWithUnit(group.avgPrice || 0);
                          return (
                            <>
                              <div className="flex items-baseline gap-1 whitespace-nowrap">
                                <span className="text-[15px] md:text-[20px] font-extrabold text-primary tracking-tighter">
                                  {value}
                                </span>
                                <span className="text-[11px] md:text-[12px] font-bold text-tertiary">
                                  {unit}
                                </span>
                              </div>
                              <span className="text-[11px] md:text-[12px] font-medium text-tertiary mt-0.5 whitespace-nowrap">
                                평균 실거래가
                              </span>
                            </>
                          );
                        })()
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1 whitespace-nowrap">
                            <span className="text-[15px] md:text-[20px] font-extrabold text-primary tracking-tighter">
                              {Math.round(group.avgPyeongPrice || 0).toLocaleString()}
                            </span>
                            <span className="text-[11px] md:text-[12px] font-bold text-tertiary">
                              만원/평
                            </span>
                          </div>
                          <span className="text-[11px] md:text-[12px] font-medium text-tertiary mt-0.5 whitespace-nowrap">
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
                                              <span className="text-[15px] sm:text-[17px] font-extrabold text-primary whitespace-nowrap">
                                                {value}
                                              </span>
                                              <span className="text-[11px] sm:text-[12px] font-bold text-tertiary whitespace-nowrap">
                                                {unit}
                                              </span>
                                            </>
                                          );
                                        })()
                                      ) : (
                                        <>
                                          <span className="text-[15px] sm:text-[17px] font-extrabold text-primary whitespace-nowrap">
                                            {Math.round(apt.pyeongPrice).toLocaleString()}
                                          </span>
                                          <span className="text-[11px] sm:text-[12px] font-bold text-tertiary whitespace-nowrap">
                                            만원/평
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
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
          <NativeAdPlaceholder location="매크로 대시보드 하단" onClick={onOpenAdModal} />
        </div>

        {/* 구분선 (Divider) 및 대칭 여백 */}
        <div className="w-full">
          <div className="h-[36px]" />
          <div className="w-full h-px bg-[#f2f4f6] dark:bg-border" />
          <div className="h-[36px]" />
        </div>

        {/* Dongtan Market Insights (News Section) */}
        <div className="mb-8 bg-surface rounded-2xl shadow-sm border border-border p-8">
          <div className="mb-6">
            <h2 className="text-[24px] font-extrabold text-primary tracking-tight">
              동탄 부동산 인사이트{" "}
              <span className="text-[16px] font-semibold text-tertiary ml-2 font-normal">
                최신 뉴스 피드
              </span>
            </h2>
            <p className="text-[13px] font-medium text-tertiary mt-1 italic">
              Dongtan real estate market latest news
            </p>
          </div>

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
                      "동탄 트램(도시철도) 기본설계 본격화 — 1동탄과 2동탄을 잇는 내부 교통망 완성으로 인한 권역별 가격 갭(Gap) 축소 전망.",
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
              ).map((news) => (
                <div
                  key={news.id}
                  onClick={() =>
                    news.link !== "#" && window.open(news.link, "_blank")
                  }
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
                </div>
              ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 justify-center items-center">
            <button
              onClick={() => {
                window.location.hash = 'lounge-news';
              }}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-surface border border-border hover:bg-body text-secondary text-[13.5px] font-bold rounded-full transition-colors shadow-sm"
            >
              더보기 ({visibleNewsCount} {"/"} {newsData.length || 100})
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
