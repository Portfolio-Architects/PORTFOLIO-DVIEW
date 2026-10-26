'use client';

import React, { useState, useMemo, useRef } from 'react';
import { TrainFront, Building2, Calendar, TrendingDown, Info } from 'lucide-react';
import type { ApartmentStatRecord, RegressionAnalysisResult } from '@/lib/stats/types';

export interface DistanceRegressionScatterPlotProps {
  records: ApartmentStatRecord[];
  regression: RegressionAnalysisResult;
  onSelectComplex?: (record: ApartmentStatRecord) => void;
  className?: string;
}

export function DistanceRegressionScatterPlot({
  records = [],
  regression,
  onSelectComplex,
  className = '',
}: DistanceRegressionScatterPlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredRecord, setHoveredRecord] = useState<ApartmentStatRecord | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Plot Dimensions
  const svgWidth = 800;
  const svgHeight = 480;
  const margin = { top: 40, right: 30, bottom: 60, left: 70 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  // X Domain: 0m to 5,200m (0km ~ 5.2km)
  const xMin = 0;
  const xMax = 5200;

  // Y Domain: Price per Pyeong in 만원 (1,500 ~ 5,000)
  const yMin = 1500;
  const yMax = 5000;

  const getX = (distMeters: number) => {
    const clamped = Math.max(xMin, Math.min(xMax, distMeters));
    return margin.left + ((clamped - xMin) / (xMax - xMin)) * plotWidth;
  };

  const getY = (pyeongWon: number) => {
    const pyeongMan = pyeongWon > 100000 ? pyeongWon / 10000 : pyeongWon;
    const clamped = Math.max(yMin, Math.min(yMax, pyeongMan));
    return margin.top + plotHeight - ((clamped - yMin) / (yMax - yMin)) * plotHeight;
  };

  // Regression line calculation
  const slope = regression.slopeManwonPerKm ?? regression.slopeWonPerKm ?? -383;
  const intercept = regression.interceptManwon ?? regression.interceptWon ?? 3413;

  // Points on trendline for dist = 0 and dist = 5000
  const yAt0 = intercept;
  const yAt5000 = intercept + slope * 5.0;

  const lineX1 = getX(0);
  const lineY1 = getY(yAt0);
  const lineX2 = getX(5000);
  const lineY2 = getY(yAt5000);

  // Helper for point color by tier
  const getPointColor = (distMeters: number) => {
    if (distMeters < 500) return '#3182f6'; // Toss Blue
    if (distMeters < 1000) return '#3b82f6'; // Blue-500
    if (distMeters < 2000) return '#059669'; // Value Emerald
    if (distMeters < 3000) return '#64748b'; // Slate-500
    return '#94a3b8'; // Slate-400
  };

  const handlePointHover = (e: React.MouseEvent, record: ApartmentStatRecord) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setHoveredRecord(record);
  };

  return (
    <section
      aria-label="동탄역 거리 대 평당가 OLS 선형회귀 산점도"
      className={`w-full rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-4 sm:p-6 border border-[#f2f4f6] dark:border-[#202027] flex flex-col justify-between ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm sm:text-base font-black text-primary tracking-tight">
              동탄역 거리 vs 평당가 선형회귀(OLS) 분석
            </h3>
          </div>
          <p className="text-[11px] sm:text-[12px] font-medium text-secondary mt-0.5">
            127개 단지 전수 실거래 분포 및 최소제곱법(OLS) 추세선
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center flex-wrap gap-2.5 text-[11px] font-bold text-secondary">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3182f6]" />
            <span>&lt;1km (역세권)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
            <span>1~2km (준역세권)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#64748b]" />
            <span>2km+ (외곽권)</span>
          </div>
          <div className="flex items-center gap-1.5 ml-1">
            <span className="w-4 h-0.5 bg-[#3182f6] border-b border-dashed border-[#3182f6]" />
            <span className="text-blue-600 dark:text-blue-400 font-extrabold">OLS 회귀선</span>
          </div>
        </div>
      </div>

      {/* Responsive SVG Scatter Plot with Pre-Reserved Zero-CLS Bounding Box */}
      <div
        ref={containerRef}
        className="w-full h-[400px] sm:h-[480px] relative select-none"
        onMouseLeave={() => setHoveredRecord(null)}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          {/* Background Grid Lines (Horizontal) */}
          {[2000, 3000, 4000, 5000].map((pyeong) => {
            const y = getY(pyeong);
            return (
              <g key={pyeong}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={svgWidth - margin.right}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-200/70 dark:text-[#202027]"
                  strokeWidth="1"
                />
                <text
                  x={margin.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 dark:fill-slate-500 text-[11px] font-medium tabular-nums"
                >
                  {pyeong.toLocaleString()}만
                </text>
              </g>
            );
          })}

          {/* Background Grid Lines (Vertical Distance Radii) */}
          {[500, 1000, 2000, 3000, 4000, 5000].map((dist) => {
            const x = getX(dist);
            return (
              <g key={dist}>
                <line
                  x1={x}
                  y1={margin.top}
                  x2={x}
                  y2={svgHeight - margin.bottom}
                  stroke="currentColor"
                  className="text-slate-200/70 dark:text-[#202027]"
                  strokeWidth="1"
                  strokeDasharray={dist <= 2000 ? '4 4' : undefined}
                />
                <text
                  x={x}
                  y={svgHeight - margin.bottom + 20}
                  textAnchor="middle"
                  className="fill-slate-400 dark:fill-slate-500 text-[11px] font-medium tabular-nums"
                >
                  {dist >= 1000 ? `${dist / 1000}km` : `${dist}m`}
                </text>
              </g>
            );
          })}

          {/* OLS Linear Regression Trendline */}
          <line
            x1={lineX1}
            y1={lineY1}
            x2={lineX2}
            y2={lineY2}
            stroke="#3182f6"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            className="transition-all duration-300"
          />

          {/* Scatter Points */}
          {records.map((r) => {
            const cx = getX(r.distanceToStationMeters);
            const cy = getY(r.avgPricePerPyeongWon);
            const color = getPointColor(r.distanceToStationMeters);
            const isHovered = hoveredRecord?.id === r.id;

            return (
              <circle
                key={r.id}
                cx={cx}
                cy={cy}
                r={isHovered ? 7.5 : 5}
                fill={color}
                fillOpacity={isHovered ? 1 : 0.85}
                stroke="#ffffff"
                strokeWidth={isHovered ? 2.5 : 1.2}
                className="cursor-pointer transition-transform duration-150 hover:scale-125"
                onMouseEnter={(e) => handlePointHover(e, r)}
                onClick={() => onSelectComplex?.(r)}
              />
            );
          })}

          {/* Regression Formula Badge Annotation */}
          <g transform={`translate(${margin.left + 20}, ${margin.top + 20})`}>
            <rect
              width="230"
              height="36"
              rx="8"
              fill="currentColor"
              className="text-white dark:text-[#202027] shadow-xs"
            />
            <text
              x="12"
              y="22"
              className="fill-primary text-[12px] font-extrabold tabular-nums"
            >
              y = {Math.round(slope)}x + {Math.round(intercept).toLocaleString()} (R² = {regression.rSquared.toFixed(2)})
            </text>
          </g>

          {/* X & Y Axis Labels */}
          <text
            x={svgWidth / 2}
            y={svgHeight - 15}
            textAnchor="middle"
            className="fill-slate-500 dark:fill-slate-400 text-[12px] font-bold"
          >
            동탄역(GTX-A)과의 거리
          </text>
          <text
            x={20}
            y={margin.top - 15}
            textAnchor="start"
            className="fill-slate-500 dark:fill-slate-400 text-[12px] font-bold"
          >
            평당 매매가 (만원/평)
          </text>
        </svg>

        {/* Floating Tooltip Card */}
        {hoveredRecord && (
          <div
            style={{
              left: `${Math.min(tooltipPos.x + 12, (containerRef.current?.clientWidth || 600) - 220)}px`,
              top: `${Math.max(10, tooltipPos.y - 120)}px`,
            }}
            className="absolute z-20 pointer-events-none p-3 rounded-xl bg-white dark:bg-[#202027] border border-blue-500/30 shadow-lg min-w-[210px] flex flex-col gap-1 text-[11px] animate-in fade-in duration-100"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#f2f4f6] dark:border-[#2c2c35] pb-1.5 mb-0.5">
              <span className="font-black text-primary text-[12px] truncate max-w-[140px]">
                {hoveredRecord.name}
              </span>
              <span className="text-[10px] font-bold text-tertiary">
                {hoveredRecord.dong}
              </span>
            </div>

            <div className="flex items-center justify-between tabular-nums">
              <span className="text-secondary font-medium">동탄역 거리:</span>
              <span className="font-black text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">
                <TrainFront className="w-3 h-3" />
                {hoveredRecord.distanceToStationMeters.toLocaleString()}m
              </span>
            </div>

            <div className="flex items-center justify-between tabular-nums">
              <span className="text-secondary font-medium">평균 평당가:</span>
              <span className="font-extrabold text-primary">
                {Math.round(
                  hoveredRecord.avgPricePerPyeongWon > 100000
                    ? hoveredRecord.avgPricePerPyeongWon / 10000
                    : hoveredRecord.avgPricePerPyeongWon
                ).toLocaleString()}
                만원/평
              </span>
            </div>

            <div className="flex items-center justify-between tabular-nums">
              <span className="text-secondary font-medium">평균 매매가:</span>
              <span className="font-extrabold text-primary">
                {(hoveredRecord.avgPriceWon / 100000000).toFixed(1)}억원
              </span>
            </div>

            <div className="flex items-center justify-between tabular-nums text-tertiary text-[10px] pt-1 border-t border-[#f2f4f6] dark:border-[#2c2c35]">
              <span>{hoveredRecord.builtYear}년식</span>
              <span>최근 1년 {hoveredRecord.txCount}건 거래</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
