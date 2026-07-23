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

interface MacroTrendPoint {
  name: string;
  "동탄 아파트 전체": number | null;
  "동탄 아파트 전세 평균": number | null;
  [key: string]: unknown;
}

interface MacroTrendChartProps {
  lineData: MacroTrendPoint[];
  xTicks: string[];
  yTicks: number[];
  timeframe: string;
  isBottomSheet?: boolean;
}

const formatXAxisTick = (value: string) => {
  if (typeof value === "string" && /^\d{2}\.\d{2}$/.test(value)) {
    const parts = value.split(".");
    return `${parts[0]}년 ${parts[1]}월`;
  }
  return value;
};

// Custom ResizeObserver hook with callback ref pattern to ensure ResizeObserver is bound when the DOM element mounts.
function useResizeObserver(delay = 150) {
  const [size, setSize] = useState({ width: 600, height: 330 });
  const sizeRef = useRef({ width: 600, height: 330 });
  const [element, setElement] = useState<HTMLDivElement | null>(null);

  const refCallback = React.useCallback((node: HTMLDivElement | null) => {
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

    let timeoutId: NodeJS.Timeout;

    function handleResize(entries: ResizeObserverEntry[]) {
      // Prevent ResizeObserver from firing layout updates while scroll lock (overflow: hidden) is active.
      // This eliminates rendering overhead on background charts when the apartment modal is opening/active.
      if (typeof document !== 'undefined' && document.body.style.overflow === 'hidden') {
        return;
      }

      if (!entries || !entries.length) return;
      const { width, height } = entries[0].contentRect;
      
      // 2px 이하 미세 변화는 리사이즈 무시하여 불필요한 차트 리렌더 억제
      const diffW = Math.abs(width - sizeRef.current.width);
      const diffH = Math.abs(height - sizeRef.current.height);
      if (sizeRef.current.width > 0 && sizeRef.current.height > 0 && diffW <= 2 && diffH <= 2) {
        return;
      }

      // Debounce state update to prevent UI rendering thrashing during resizing or animations
      if (sizeRef.current.width === 0 || sizeRef.current.height === 0) {
        const newSize = { width, height };
        sizeRef.current = newSize;
        setSize(newSize);
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
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
      clearTimeout(timeoutId);
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
  const [isTooltipActive, setIsTooltipActive] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [mounted, setMounted] = useState(false);
 
  const [containerRef, { width, height }] = useResizeObserver(150);
 
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
    }
  }, []);

  const fontSize = isBottomSheet ? 11 : 12;
  const yWidth = isBottomSheet ? 35 : 40;

  // 0원 또는 null인 전세 데이터를 null로 필터링하여 라인이 바닥에 붙지 않게 처리
  const processedData = useMemo(() => {
    return lineData.map((d) => ({
      ...d,
      "동탄 아파트 전세 평균":
        d["동탄 아파트 전세 평균"] === 0 || d["동탄 아파트 전세 평균"] === null
          ? null
          : d["동탄 아파트 전세 평균"],
    }));
  }, [lineData]);

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

  if (!mounted) {
    return <div className="w-full h-full min-h-[240px] md:min-h-[330px] bg-transparent" />;
  }

  return (
    <div ref={containerRef} className="w-full h-full min-h-[240px] md:min-h-[330px] touch-pan-y relative">
      {width > 0 && height > 0 && (
        <AreaChart
          width={width}
          height={height}
          data={processedData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          {...desktopEventHandlers}
        >
          <defs>
            <linearGradient id="colorSale" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--brand-orange)" stopOpacity={0.22} />
              <stop offset="95%" stopColor="var(--brand-orange)" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="colorRent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--brand-blue)" stopOpacity={0.18} />
              <stop offset="95%" stopColor="var(--brand-blue)" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeWidth={0.7}
            vertical={false}
            horizontal={true}
            stroke="rgba(148, 163, 184, 0.12)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--text-tertiary)", fontSize, fontFamily: "inherit", fontWeight: 700 }}
            dy={10}
            ticks={xTicks}
            tickFormatter={formatXAxisTick}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--text-tertiary)", fontSize, fontFamily: "inherit", fontWeight: 700 }}
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
            cursor={{
              stroke: "var(--border-color)",
              strokeWidth: 1.5,
              strokeDasharray: "3 3",
            }}
            isAnimationActive={false}
          />
          <Area
            key="동탄 아파트 전체"
            type="monotone"
            name="평균 매매가"
            dataKey="동탄 아파트 전체"
            stroke="var(--brand-orange)"
            strokeWidth={isBottomSheet ? 1.5 : 1.8}
            fill="url(#colorSale)"
            isAnimationActive={false}
            dot={
              isBottomSheet
                ? false
                : timeframe === "ALL" || timeframe === "5Y"
                ? false
                : { r: 3.5, strokeWidth: 1.5, fill: "var(--bg-surface)" }
            }
            activeDot={{
              r: isBottomSheet ? 4.5 : 5,
              strokeWidth: isBottomSheet ? 1.5 : 2,
              stroke: "var(--bg-surface)",
              fill: "var(--brand-orange)"
            }}
          />
          <Area
            key="동탄 아파트 전세 평균"
            type="monotone"
            name="평균 전세가"
            dataKey="동탄 아파트 전세 평균"
            stroke="var(--brand-blue)"
            strokeWidth={isBottomSheet ? 1.0 : 1.2}
            fill="url(#colorRent)"
            isAnimationActive={false}
            dot={
              isBottomSheet
                ? false
                : timeframe === "ALL" || timeframe === "5Y"
                ? false
                : { r: 2.5, strokeWidth: 1.5, fill: "var(--bg-surface)" }
            }
            activeDot={{
              r: isBottomSheet ? 3.5 : 4,
              strokeWidth: isBottomSheet ? 1.5 : 2,
              stroke: "var(--bg-surface)",
              fill: "var(--brand-blue)"
            }}
          />
        </AreaChart>
      )}
    </div>
  );
});

MacroTrendChart.displayName = 'MacroTrendChart';

export default MacroTrendChart;
