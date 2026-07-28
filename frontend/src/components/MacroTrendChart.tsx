import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";
import type { DongtanMacroTrendPoint } from "@/lib/types/transaction";
import { processMacroTrendData, formatXAxisTick } from "@/lib/utils/macroChartTransform";
import ChartErrorBoundary from "@/components/common/ChartErrorBoundary";

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
      <div className="bg-surface/80 dark:bg-zinc-900/80 backdrop-blur-md p-3.5 rounded-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.06)] border border-border/40 dark:border-white/10 flex flex-col gap-2 min-w-[170px] transition-all duration-300 ease-out">
        <div className="text-[12px] font-extrabold text-tertiary mb-0.5">
          {label}
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
                  <span className="text-[13.5px] font-black text-[var(--brand-orange)]">
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

interface MacroTrendChartProps {
  lineData: DongtanMacroTrendPoint[] | Array<{ name: string; "동탄 아파트 전체": number | null; "동탄 아파트 전세 평균": number | null; [key: string]: unknown }>;
  xTicks: string[];
  yTicks: number[];
  timeframe: string;
  isBottomSheet?: boolean;
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
}: MacroTrendChartProps) {
  const [refCallback, size] = useResizeObserver(150);
  const [isTooltipActive, setIsTooltipActive] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
 
  React.useLayoutEffect(() => {
    if (typeof window !== "undefined") {
      setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
    }
  }, []);

  const fontSize = isBottomSheet ? 11 : 12;
  const yWidth = isBottomSheet ? 35 : 40;

  // Process data with null/undefined guards
  const processedData = useMemo(() => {
    return processMacroTrendData(lineData);
  }, [lineData]);

  const tooltipCursorStyle = useMemo(() => ({
    stroke: "rgba(148, 163, 184, 0.4)",
    strokeWidth: 1.5,
    strokeDasharray: "3 3",
  }), []);

  const saleDotProp = useMemo(() => {
    if (isBottomSheet || timeframe === "ALL" || timeframe === "5Y") return false;
    return { r: 3.5, strokeWidth: 1.5, fill: "#ffffff", stroke: "#ea6100" };
  }, [isBottomSheet, timeframe]);

  const saleActiveDotProp = useMemo(() => ({
    r: isBottomSheet ? 4.5 : 5.5,
    strokeWidth: isBottomSheet ? 1.5 : 2,
    stroke: "#ffffff",
    fill: "#ea6100"
  }), [isBottomSheet]);

  const rentDotProp = useMemo(() => {
    if (isBottomSheet || timeframe === "ALL" || timeframe === "5Y") return false;
    return { r: 2.5, strokeWidth: 1.5, fill: "#ffffff", stroke: "#f9a825" };
  }, [isBottomSheet, timeframe]);

  const rentActiveDotProp = useMemo(() => ({
    r: isBottomSheet ? 3.5 : 4.5,
    strokeWidth: isBottomSheet ? 1.5 : 2,
    stroke: "#ffffff",
    fill: "#f9a825"
  }), [isBottomSheet]);

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
      <div ref={refCallback} className="w-full h-full min-h-[330px] touch-pan-y relative overflow-hidden flex items-center justify-center">
      <AreaChart
        width={chartW}
        height={chartH}
        data={processedData}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        {...desktopEventHandlers}
      >
        <defs>
          <linearGradient id="colorSale" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ea6100" stopOpacity={0.30} />
            <stop offset="95%" stopColor="#ea6100" stopOpacity={0.0} />
          </linearGradient>
          <linearGradient id="colorRent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f9a825" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#f9a825" stopOpacity={0.0} />
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
          active={(!isBottomSheet && isTouchDevice) ? isTooltipActive : undefined}
          content={<CustomTooltip />}
          cursor={tooltipCursorStyle}
          isAnimationActive={false}
        />
        <Area
          key="동탄 아파트 전체"
          type="monotone"
          name="평균 매매가"
          dataKey="동탄 아파트 전체"
          stroke="#ea6100"
          strokeWidth={isBottomSheet ? 1.8 : 2.2}
          fill="url(#colorSale)"
          isAnimationActive={false}
          connectNulls={true}
          dot={saleDotProp}
          activeDot={saleActiveDotProp}
        />
        <Area
          key="동탄 아파트 전세 평균"
          type="monotone"
          name="평균 전세가"
          dataKey="동탄 아파트 전세 평균"
          stroke="#f9a825"
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
