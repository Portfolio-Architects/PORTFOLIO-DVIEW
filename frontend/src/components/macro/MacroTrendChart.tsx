import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import type { DongtanMacroTrendPoint } from "@/types/transaction";
import { processMacroTrendData, formatXAxisTick } from "@/lib/utils/macroChartTransform";
import ChartErrorBoundary from "@/components/common/ChartErrorBoundary";
import { calculateTwoSigma, type TwoSigmaStats } from "@/lib/analytics/twoSigmaEngine";

const SafeReferenceArea = ReferenceArea as React.ComponentType<
  React.ComponentProps<typeof ReferenceArea> & { isFront?: boolean }
>;

interface TooltipPayloadEntry {
  dataKey?: string | number;
  name?: string;
  value: number;
  color?: string;
  payload?: unknown;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const saleData = payload.find(
      (p) => p.dataKey === "동탄 아파트 전체" || p.name === "평균 매매가"
    );
    const rentData = payload.find(
      (p) =>
        p.dataKey === "동탄 아파트 전세 평균" || p.name === "평균 전세가"
    );

    const salePrice = saleData?.value || 0;
    const rentPrice = rentData?.value || 0;

    let ratio = 0;
    if (salePrice > 0 && rentPrice > 0) {
      ratio = (rentPrice / salePrice) * 100;
    }

    const gapPrice = salePrice > 0 && rentPrice > 0 ? salePrice - rentPrice : 0;
    const gapPriceStr = gapPrice > 0 ? `${gapPrice.toFixed(1)}억` : null;

    return (
      <div className="bg-surface/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 rounded-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-border/60 dark:border-white/10 flex flex-col gap-2 min-w-[170px] transition-all duration-300 ease-out">
        <div className="text-[12px] font-extrabold text-tertiary mb-0.5">
          {label ? formatXAxisTick(String(label)) : ""}
        </div>
        {payload
          .filter((entry) => entry.value !== undefined && entry.value !== null && entry.value > 0)
          .map((entry, index: number) => {
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
                  <span className="text-[13px] font-bold text-secondary">
                    {isRent ? "전세가" : "매매가"}
                  </span>
                </div>
                <span className="text-[13.5px] font-black text-primary">
                  {entry.value}억
                </span>
              </div>
            );
          })}
        {ratio > 0 && (
          <>
            <div className="w-full h-[1px] bg-body my-1" />
            <div className="flex flex-col gap-1.5">
              {gapPriceStr && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[12px] font-bold text-tertiary">
                    예상 갭차이
                  </span>
                  <span className="text-[13.5px] font-black text-blue-600 dark:text-blue-400">
                    {gapPriceStr}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <span className="text-[12px] font-bold text-tertiary">
                  전세가율
                </span>
                <span className="text-[13.5px] font-black text-[var(--brand-blue)]">
                  {ratio.toFixed(1)}%
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }
  return null;
};

export interface DiamondVertexProps {
  cx?: number;
  cy?: number;
  radius?: number | string;
  r?: number | string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number | string;
  className?: string;
  payload?: unknown;
  value?: unknown;
  index?: number;
}

/**
 * Diamond vertex component rendering SVG polygon.
 * Points formula: `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`
 * - Standard radius: r = 3.6
 * - Active/Hover radius: r = 6.0
 */
export const DiamondVertex = React.memo(function DiamondVertex({
  cx,
  cy,
  radius = 3.6,
  r,
  fill = "#2563eb",
  stroke = "#ffffff",
  strokeWidth = 1.5,
  className,
}: DiamondVertexProps) {
  if (
    typeof cx !== "number" ||
    typeof cy !== "number" ||
    !Number.isFinite(cx) ||
    !Number.isFinite(cy)
  ) {
    return null;
  }

  const effectiveRadius = Number(radius !== undefined ? radius : (r !== undefined ? r : 3.6));
  const points = `${cx},${cy - effectiveRadius} ${cx + effectiveRadius},${cy} ${cx},${cy + effectiveRadius} ${cx - effectiveRadius},${cy}`;

  return (
    <polygon
      points={points}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      className={className}
    />
  );
});

DiamondVertex.displayName = "DiamondVertex";

export interface MacroDotProps {
  cx?: number;
  cy?: number;
  className?: string;
}

export const SaleDiamondDot = (props: MacroDotProps): React.ReactElement | null => (
  <DiamondVertex
    cx={props.cx}
    cy={props.cy}
    radius={3.6}
    fill="#2563eb"
    stroke="#ffffff"
    strokeWidth={1.5}
    className={props.className}
  />
);
SaleDiamondDot.displayName = "SaleDiamondDot";

export const SaleActiveDiamondDot = (props: MacroDotProps): React.ReactElement | null => (
  <DiamondVertex
    cx={props.cx}
    cy={props.cy}
    radius={6.0}
    fill="#2563eb"
    stroke="#ffffff"
    strokeWidth={2}
    className={props.className}
  />
);
SaleActiveDiamondDot.displayName = "SaleActiveDiamondDot";

export const RentDiamondDot = (props: MacroDotProps): React.ReactElement | null => (
  <DiamondVertex
    cx={props.cx}
    cy={props.cy}
    radius={3.6}
    fill="#059669"
    stroke="#ffffff"
    strokeWidth={1.5}
    className={props.className}
  />
);
RentDiamondDot.displayName = "RentDiamondDot";

export const RentActiveDiamondDot = (props: MacroDotProps): React.ReactElement | null => (
  <DiamondVertex
    cx={props.cx}
    cy={props.cy}
    radius={6.0}
    fill="#059669"
    stroke="#ffffff"
    strokeWidth={2}
    className={props.className}
  />
);
RentActiveDiamondDot.displayName = "RentActiveDiamondDot";

export interface MacroTrendChartProps {
  lineData: Array<{
    name: string;
    "동탄 아파트 전체"?: number | null;
    "동탄 아파트 전세 평균"?: number | null;
  }>;
  xTicks: string[];
  yTicks: number[];
  timeframe: string;
  isBottomSheet?: boolean;
  className?: string;
}

// Custom ResizeObserver hook with 150ms debouncing to prevent layout thrashing
function useResizeObserver(delay = 150) {
  const [size, setSize] = useState({ width: 600, height: 330 });
  const sizeRef = useRef({ width: 600, height: 330 });
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const refCallback = React.useCallback((node: HTMLDivElement | null) => {
    if (!node && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (node) {
      const rect = node.getBoundingClientRect();
      const initialW = rect.width > 0 ? rect.width : (node.clientWidth > 0 ? node.clientWidth : 600);
      const initialH = rect.height > 0 ? rect.height : (node.clientHeight > 0 ? node.clientHeight : 330);
      if (initialW > 0 && initialH > 0) {
        sizeRef.current = { width: initialW, height: initialH };
        setSize({ width: initialW, height: initialH });
      }
    }
    setElement(node);
  }, []);

  useEffect(() => {
    if (!element) return;

    function handleResize(entries: ResizeObserverEntry[]) {
      if (typeof document !== 'undefined' && document.body.style.overflow === 'hidden') {
        return;
      }

      if (!entries || !entries.length) return;
      const rawW = entries[0].contentRect.width;
      const rawH = entries[0].contentRect.height;

      if (rawW <= 0 || rawH <= 0) return;

      const width = Math.max(300, Math.floor(rawW));
      const height = Math.max(240, Math.floor(rawH));

      const diffW = Math.abs(width - sizeRef.current.width);
      const diffH = Math.abs(height - sizeRef.current.height);
      if (sizeRef.current.width > 0 && sizeRef.current.height > 0 && diffW <= 2 && diffH <= 2) {
        return;
      }

      if (sizeRef.current.width === 0 || sizeRef.current.height === 0) {
        const newSize = { width, height };
        sizeRef.current = newSize;
        setSize(newSize);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        timeoutRef.current = setTimeout(() => {
          const newSize = { width, height };
          sizeRef.current = newSize;
          setSize(newSize);
        }, delay);
      }
    }

    const observer = new ResizeObserver(handleResize);
    observer.observe(element);

    return () => {
      observer.disconnect();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [element, delay]);

  return [refCallback, size] as const;
}

const MacroTrendChart = React.memo(function MacroTrendChart({
  lineData,
  xTicks,
  yTicks,
  timeframe,
  isBottomSheet = false,
  className,
}: MacroTrendChartProps) {
  const [refCallback, size] = useResizeObserver(150);
  const [isTooltipActive, setIsTooltipActive] = useState(false);
  const isTouchDevice = React.useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mql = window.matchMedia("(pointer: coarse)");
      mql.addEventListener?.("change", onStoreChange);
      return () => mql.removeEventListener?.("change", onStoreChange);
    },
    () => (typeof window !== "undefined" && !!window.matchMedia ? window.matchMedia("(pointer: coarse)").matches : false),
    () => false
  );

  const fontSize = isBottomSheet ? 11 : 12;
  const yWidth = isBottomSheet ? 35 : 40;

  // Process data with null/undefined guards
  const processedData = useMemo(() => {
    return processMacroTrendData(lineData);
  }, [lineData]);

  // Two-sigma statistical confidence interval bounds
  const twoSigmaStats = useMemo<TwoSigmaStats>(() => {
    const saleValues = processedData.map((d) => d["동탄 아파트 전체"]);
    const saleStats = calculateTwoSigma(saleValues);
    if (saleStats.isValid) {
      return saleStats;
    }
    const rentValues = processedData.map((d) => d["동탄 아파트 전세 평균"]);
    const rentStats = calculateTwoSigma(rentValues);
    if (rentStats.isValid) {
      return rentStats;
    }
    return saleStats;
  }, [processedData]);

  const tooltipCursorStyle = useMemo(() => ({
    stroke: "rgba(148, 163, 184, 0.4)",
    strokeWidth: 1.5,
    strokeDasharray: "3 3",
  }), []);

  const nonNullSaleCount = useMemo(() => {
    return processedData.filter(
      (d) => typeof d["동탄 아파트 전체"] === "number" && d["동탄 아파트 전체"]! > 0
    ).length;
  }, [processedData]);

  const nonNullRentCount = useMemo(() => {
    return processedData.filter(
      (d) => typeof d["동탄 아파트 전세 평균"] === "number" && d["동탄 아파트 전세 평균"]! > 0
    ).length;
  }, [processedData]);

  const saleDotProp = useMemo(() => {
    if (nonNullSaleCount === 1) return SaleDiamondDot;
    if (isBottomSheet || timeframe === "ALL" || timeframe === "5Y") return false;
    return SaleDiamondDot;
  }, [isBottomSheet, timeframe, nonNullSaleCount]);

  const saleActiveDotProp = SaleActiveDiamondDot;

  const rentDotProp = useMemo(() => {
    if (nonNullRentCount === 1) return RentDiamondDot;
    if (isBottomSheet || timeframe === "ALL" || timeframe === "5Y") return false;
    return RentDiamondDot;
  }, [isBottomSheet, timeframe, nonNullRentCount]);

  const rentActiveDotProp = RentActiveDiamondDot;

  const desktopEventHandlers = (isTouchDevice && !isBottomSheet)
    ? {
        onTouchStart: () => setIsTooltipActive(true),
        onTouchMove: (e: unknown) => {
          const chartEvent = e as { activePayload?: unknown[] } | null;
          if (chartEvent && chartEvent.activePayload) {
            setIsTooltipActive(true);
          }
        },
        onTouchEnd: () => setIsTooltipActive(false),
      }
    : {};

  const chartW = size.width > 0 ? size.width : 380;
  const chartH = isBottomSheet ? 220 : (size.height > 0 ? size.height : 300);

  return (
    <ChartErrorBoundary fallbackText="동탄 매크로 트렌드 차트를 로드할 수 없습니다.">
      <div
        ref={refCallback}
        data-testid="macro-trend-chart-container"
        className={`w-full h-full flex-1 ${isBottomSheet ? 'min-h-[220px]' : 'min-h-[330px]'} touch-pan-y relative overflow-hidden flex items-center justify-center ${className || ''}`}
      >
      <AreaChart
        width={chartW}
        height={chartH}
        data={processedData}
        margin={{ top: 14, right: 18, left: 4, bottom: 6 }}
        {...desktopEventHandlers}
      >
        <defs>
          <linearGradient id="colorSale" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.30} />
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
          </linearGradient>
          <linearGradient id="colorRent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeWidth={0.7}
          vertical={false}
          horizontal={true}
          stroke="rgba(148, 163, 184, 0.18)"
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#64748b", fontSize, fontFamily: "inherit", fontWeight: 700 }}
          dy={10}
          ticks={xTicks}
          tickFormatter={formatXAxisTick}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#64748b", fontSize, fontFamily: "inherit", fontWeight: 700 }}
          tickFormatter={(value: number) =>
            value === 0 ? "0" : `${Number.isInteger(value) ? value : value.toFixed(1)}억`
          }
          domain={[0, yTicks && yTicks.length > 0 ? yTicks[yTicks.length - 1] : "auto"]}
          ticks={yTicks}
          width={yWidth}
        />
        <RechartsTooltip
          content={<CustomTooltip />}
          cursor={tooltipCursorStyle}
          isAnimationActive={false}
          wrapperStyle={{ zIndex: 50, pointerEvents: "none", opacity: 1 }}
        />
        {twoSigmaStats.isValid && twoSigmaStats.lower2SD !== null && twoSigmaStats.upper2SD !== null && (
          <SafeReferenceArea
            y1={twoSigmaStats.lower2SD}
            y2={twoSigmaStats.upper2SD}
            fill="var(--brand-primary)"
            fillOpacity={0.06}
            isFront={false}
          />
        )}
        {twoSigmaStats.isValid && twoSigmaStats.upper2SD !== null && (
          <ReferenceLine
            y={twoSigmaStats.upper2SD}
            stroke="var(--brand-primary)"
            strokeDasharray="3 3"
          />
        )}
        {twoSigmaStats.isValid && twoSigmaStats.mean !== null && (
          <ReferenceLine
            y={twoSigmaStats.mean}
            stroke="var(--brand-primary)"
            strokeDasharray="5 5"
          />
        )}
        {twoSigmaStats.isValid && twoSigmaStats.lower2SD !== null && (
          <ReferenceLine
            y={twoSigmaStats.lower2SD}
            stroke="var(--brand-primary)"
            strokeDasharray="3 3"
          />
        )}
        <Area
          key="동탄 아파트 전체"
          type="linear"
          name="평균 매매가"
          dataKey="동탄 아파트 전체"
          stroke="#2563eb"
          strokeWidth={isBottomSheet ? 1.8 : 2.2}
          fill="url(#colorSale)"
          isAnimationActive={false}
          connectNulls={true}
          dot={saleDotProp}
          activeDot={saleActiveDotProp}
        />
        <Area
          key="동탄 아파트 전세 평균"
          type="linear"
          name="평균 전세가"
          dataKey="동탄 아파트 전세 평균"
          stroke="#059669"
          strokeWidth={isBottomSheet ? 1.2 : 1.5}
          fill="url(#colorRent)"
          isAnimationActive={false}
          connectNulls={true}
          dot={rentDotProp}
          activeDot={rentActiveDotProp}
        />
      </AreaChart>
    </div>
  </ChartErrorBoundary>
  );
});

MacroTrendChart.displayName = 'MacroTrendChart';

export default MacroTrendChart;
