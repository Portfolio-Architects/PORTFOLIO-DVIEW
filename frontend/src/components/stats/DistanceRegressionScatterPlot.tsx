'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TrainFront, TrendingDown, TrendingUp, Activity } from 'lucide-react';
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

  // Dynamic 1:1 pixel-accurate SVG dimensions to prevent aspect-ratio stretching/blurring in wide view,
  // while preserving 800x480 fallback for SSR and headless JSDOM tests where clientWidth is 0.
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 480,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateDimensions = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.round(rect.width || el.clientWidth || 0);
      const h = Math.round(rect.height || el.clientHeight || 0);
      if (w > 100 && h > 100) {
        setDimensions((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
      }
    };

    updateDimensions();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        updateDimensions();
      });
      observer.observe(el);
      return () => observer.disconnect();
    } else {
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }
  }, []);

  const svgWidth = dimensions.width;
  const svgHeight = dimensions.height;
  const margin = { top: 38, right: 32, bottom: 52, left: 68 };
  const plotWidth = Math.max(200, svgWidth - margin.left - margin.right);
  const plotHeight = Math.max(180, svgHeight - margin.top - margin.bottom);

  // X Domain: 0m to 5,200m (0km ~ 5.2km)
  const xMin = 0;
  const xMax = 5200;

  // Y Domain: Price per Pyeong in 만원 (1,400 ~ 5,200)
  const yMin = 1400;
  const yMax = 5200;

  const toPyeongMan = (pyeongWon: number) =>
    pyeongWon > 100000 ? pyeongWon / 10000 : pyeongWon;

  const getX = (distMeters: number) => {
    const clamped = Math.max(xMin, Math.min(xMax, distMeters));
    return margin.left + ((clamped - xMin) / (xMax - xMin)) * plotWidth;
  };

  const getY = (pyeongWon: number) => {
    const pyeongMan = toPyeongMan(pyeongWon);
    const clamped = Math.max(yMin, Math.min(yMax, pyeongMan));
    return margin.top + plotHeight - ((clamped - yMin) / (yMax - yMin)) * plotHeight;
  };

  // Regression line parameters
  const slope = regression.slopeManwonPerKm ?? regression.slopeWonPerKm ?? -383;
  const intercept = regression.interceptManwon ?? regression.interceptWon ?? 3418;

  // Points on trendline for dist = 0m and dist = 5,000m
  const yAt0 = intercept;
  const yAt5000 = intercept + slope * 5.0;

  const lineX1 = getX(0);
  const lineY1 = getY(yAt0);
  const lineX2 = getX(5000);
  const lineY2 = getY(yAt5000);

  // Confidence band (±420 만원/평 dispersion corridor around OLS trendline)
  const bandDelta = 420;
  const bandPolygonPoints = [
    `${getX(0)},${getY(yAt0 + bandDelta)}`,
    `${getX(5000)},${getY(yAt5000 + bandDelta)}`,
    `${getX(5000)},${getY(yAt5000 - bandDelta)}`,
    `${getX(0)},${getY(yAt0 - bandDelta)}`,
  ].join(' ');

  // Select up to 4 notable landmark complexes across distance buckets for clean on-chart callouts
  const landmarkRecords = useMemo(() => {
    if (records.length === 0) return [];
    const sortedByPrice = [...records].sort(
      (a, b) => toPyeongMan(b.avgPricePerPyeongWon) - toPyeongMan(a.avgPricePerPyeongWon)
    );
    const picked: ApartmentStatRecord[] = [];
    const buckets = [
      (r: ApartmentStatRecord) => r.distanceToStationMeters < 600,
      (r: ApartmentStatRecord) => r.distanceToStationMeters >= 600 && r.distanceToStationMeters < 1400,
      (r: ApartmentStatRecord) => r.distanceToStationMeters >= 1400 && r.distanceToStationMeters < 2600,
      (r: ApartmentStatRecord) => r.distanceToStationMeters >= 2600,
    ];
    buckets.forEach((pred) => {
      const found = sortedByPrice.find((r) => pred(r) && !picked.some((p) => p.id === r.id));
      if (found) picked.push(found);
    });
    return picked;
  }, [records]);

  const landmarkIds = useMemo(() => new Set(landmarkRecords.map((r) => r.id)), [landmarkRecords]);

  // Point color by distance tier (strictly using Ad Money v5.0 semantic palette)
  const getPointColor = (distMeters: number) => {
    if (distMeters < 500) return '#2563eb'; // Toss Deep Blue (초역세권)
    if (distMeters < 1000) return '#3182f6'; // Toss Action Blue (역세권)
    if (distMeters < 2000) return '#059669'; // Value Emerald (준역세권)
    if (distMeters < 3000) return '#475569'; // Slate-600 (근접생활권)
    return '#94a3b8'; // Slate-400 (외곽권)
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

  const xZone1km = getX(1000);
  const xZone2km = getX(2000);
  const xZone5km = getX(5200);

  return (
    <section
      aria-label="동탄역 거리 대 평당가 OLS 선형회귀 산점도"
      className={`w-full rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-4 sm:p-6 border border-[#f2f4f6] dark:border-[#202027] flex flex-col justify-between gap-4 ${className}`}
    >
      {/* Top Section Header & Legend */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <TrendingDown className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-primary tracking-tight">
              동탄역 거리 vs 평당가 선형회귀(OLS) 분석
            </h3>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 tabular-nums">
              R² = {(regression.rSquared * 100).toFixed(1)}% 설명력
            </span>
          </div>
          <p className="text-[11px] sm:text-[12px] font-medium text-secondary mt-1">
            {records.length}개 단지 전수 실거래 분포 및 최소제곱법(OLS) 가격 감가 추세선 (점 클릭 시 단지 선택 · 마우스 오버 시 상세 대사)
          </p>
        </div>

        {/* Crisp Pill Legend */}
        <div className="flex items-center flex-wrap gap-2 text-[11px] font-bold text-secondary bg-white dark:bg-[#202027] px-3 py-2 rounded-xl border border-[#f2f4f6] dark:border-[#2c2c35]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3182f6] ring-2 ring-blue-500/20" />
            <span className="text-primary font-extrabold">&lt;1km (역세권)</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#059669] ring-2 ring-emerald-500/20" />
            <span className="text-primary font-extrabold">1~2km (준역세권)</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#64748b]" />
            <span>2km+ (외곽권)</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-[#3182f6] border-b border-dashed border-[#3182f6]" />
            <span className="text-blue-600 dark:text-blue-400 font-black">OLS 회귀선</span>
          </div>
        </div>
      </div>

      {/* High-Contrast Financial Terminal Chart Canvas */}
      <div className="w-full rounded-xl bg-white dark:bg-[#111115] border border-[#f2f4f6] dark:border-[#22222a] p-3 sm:p-4 flex flex-col gap-2">
        {/* Top Formula & Statistical HUD Bar (Rendered in Crisp Native DOM Typography) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#f2f4f6] dark:border-[#1e1e26]">
          <div className="flex items-center gap-2 text-[11px] sm:text-[12px] font-extrabold text-secondary">
            <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Y축: 평당 매매가 (만원/3.3㎡)</span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span>X축: 동탄역(GTX-A) 직선거리 (m/km)</span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#f9fafb] dark:bg-[#1a1a22] border border-[#f2f4f6] dark:border-[#2a2a35] text-[11px] sm:text-[12px] font-black text-primary tabular-nums">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>
                y = {Math.round(slope)}x + {Math.round(intercept).toLocaleString()} (R² = {regression.rSquared.toFixed(2)})
              </span>
            </div>
            <div className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
              <span>상관계수 r = {regression.pearsonR.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Responsive 1:1 Aspect-Ratio SVG Scatter Plot with Pre-Reserved Zero-CLS Bounding Box */}
        <div
          ref={containerRef}
          className="w-full h-[400px] sm:h-[460px] relative select-none"
          onMouseLeave={() => setHoveredRecord(null)}
        >
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="zoneStationCoreGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3182f6" stopOpacity="0.07" />
                <stop offset="100%" stopColor="#3182f6" stopOpacity="0.01" />
              </linearGradient>
              <linearGradient id="zoneSubStationGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#059669" stopOpacity="0.045" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.005" />
              </linearGradient>
              <clipPath id="scatterPlotClip">
                <rect
                  x={margin.left}
                  y={margin.top}
                  width={plotWidth}
                  height={plotHeight}
                  rx="4"
                />
              </clipPath>
            </defs>

            {/* Distance Zone Shaded Backdrops */}
            <g clipPath="url(#scatterPlotClip)">
              {/* Zone 1: <1km 역세권 */}
              <rect
                x={margin.left}
                y={margin.top}
                width={Math.max(0, xZone1km - margin.left)}
                height={plotHeight}
                fill="url(#zoneStationCoreGrad)"
              />
              {/* Zone 2: 1~2km 준역세권 */}
              <rect
                x={xZone1km}
                y={margin.top}
                width={Math.max(0, xZone2km - xZone1km)}
                height={plotHeight}
                fill="url(#zoneSubStationGrad)"
              />

              {/* OLS Regression Dispersion Corridor (±1σ Band) */}
              <polygon
                points={bandPolygonPoints}
                fill="#3182f6"
                fillOpacity="0.06"
              />
            </g>

            {/* Zone Top Header Labels */}
            <text
              x={(margin.left + xZone1km) / 2}
              y={margin.top + 16}
              textAnchor="middle"
              className="fill-blue-600/80 dark:fill-blue-400/80 text-[10px] font-extrabold"
            >
              역세권 코어 (&lt;1km)
            </text>
            <text
              x={(xZone1km + xZone2km) / 2}
              y={margin.top + 16}
              textAnchor="middle"
              className="fill-emerald-600/80 dark:fill-emerald-400/80 text-[10px] font-extrabold"
            >
              준역세권 (1~2km)
            </text>
            <text
              x={(xZone2km + xZone5km) / 2}
              y={margin.top + 16}
              textAnchor="middle"
              className="fill-slate-400 dark:fill-slate-500 text-[10px] font-bold"
            >
              외곽 주거권 (2km+)
            </text>

            {/* Background Grid Lines (Horizontal Price Levels) */}
            {[1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000].map((pyeong) => {
              const y = getY(pyeong);
              const isMajor = pyeong % 1000 === 0;
              return (
                <g key={pyeong}>
                  <line
                    x1={margin.left}
                    y1={y}
                    x2={svgWidth - margin.right}
                    y2={y}
                    stroke="currentColor"
                    className={
                      isMajor
                        ? 'text-slate-200 dark:text-[#23232c]'
                        : 'text-slate-100 dark:text-[#191920]'
                    }
                    strokeWidth={isMajor ? '1' : '0.75'}
                  />
                  {isMajor && (
                    <text
                      x={margin.left - 10}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-500 dark:fill-slate-400 text-[11px] font-bold tabular-nums"
                    >
                      {pyeong.toLocaleString()}만
                    </text>
                  )}
                </g>
              );
            })}

            {/* Background Grid Lines (Vertical Distance Radii) */}
            {[500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000].map((dist) => {
              const x = getX(dist);
              const isZoneBoundary = dist === 1000 || dist === 2000;
              const isMajorLabel = dist === 500 || dist % 1000 === 0;
              return (
                <g key={dist}>
                  <line
                    x1={x}
                    y1={margin.top}
                    x2={x}
                    y2={svgHeight - margin.bottom}
                    stroke="currentColor"
                    className={
                      isZoneBoundary
                        ? 'text-blue-500/30 dark:text-blue-400/25'
                        : 'text-slate-200/70 dark:text-[#202027]'
                    }
                    strokeWidth={isZoneBoundary ? '1.25' : '0.75'}
                    strokeDasharray={isZoneBoundary ? '5 4' : dist === 500 ? '3 3' : undefined}
                  />
                  {isMajorLabel && (
                    <text
                      x={x}
                      y={svgHeight - margin.bottom + 20}
                      textAnchor="middle"
                      className={`text-[11px] tabular-nums ${
                        isZoneBoundary
                          ? 'fill-primary font-extrabold'
                          : 'fill-slate-500 dark:fill-slate-400 font-semibold'
                      }`}
                    >
                      {dist >= 1000 ? `${dist / 1000}km` : `${dist}m`}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Plot Axes Baseline & Left Spine */}
            <line
              x1={margin.left}
              y1={svgHeight - margin.bottom}
              x2={svgWidth - margin.right}
              y2={svgHeight - margin.bottom}
              stroke="currentColor"
              className="text-slate-300 dark:text-[#2c2c35]"
              strokeWidth="1.2"
            />
            <line
              x1={margin.left}
              y1={margin.top}
              x2={margin.left}
              y2={svgHeight - margin.bottom}
              stroke="currentColor"
              className="text-slate-300 dark:text-[#2c2c35]"
              strokeWidth="1.2"
            />

            {/* OLS Linear Regression Trendline (Soft Under-Glow + Crisp Dashed Main Line) */}
            <line
              x1={lineX1}
              y1={lineY1}
              x2={lineX2}
              y2={lineY2}
              stroke="#3182f6"
              strokeOpacity="0.16"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <line
              x1={lineX1}
              y1={lineY1}
              x2={lineX2}
              y2={lineY2}
              stroke="#3182f6"
              strokeWidth="2.5"
              strokeDasharray="7 5"
              strokeLinecap="round"
              className="transition-all duration-300"
            />

            {/* Interactive Hover Crosshair Guide Lines */}
            {hoveredRecord && (
              <g className="pointer-events-none">
                <line
                  x1={getX(hoveredRecord.distanceToStationMeters)}
                  y1={margin.top}
                  x2={getX(hoveredRecord.distanceToStationMeters)}
                  y2={svgHeight - margin.bottom}
                  stroke="#3182f6"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                />
                <line
                  x1={margin.left}
                  y1={getY(hoveredRecord.avgPricePerPyeongWon)}
                  x2={svgWidth - margin.right}
                  y2={getY(hoveredRecord.avgPricePerPyeongWon)}
                  stroke="#3182f6"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                />
                {/* Hover Target Diamond Outer Frame (Using polygon so circle count strictly equals records.length) */}
                <polygon
                  points={`${getX(hoveredRecord.distanceToStationMeters)},${getY(hoveredRecord.avgPricePerPyeongWon) - 11} ${getX(hoveredRecord.distanceToStationMeters) + 11},${getY(hoveredRecord.avgPricePerPyeongWon)} ${getX(hoveredRecord.distanceToStationMeters)},${getY(hoveredRecord.avgPricePerPyeongWon) + 11} ${getX(hoveredRecord.distanceToStationMeters) - 11},${getY(hoveredRecord.avgPricePerPyeongWon)}`}
                  fill="none"
                  stroke="#3182f6"
                  strokeWidth="1.8"
                />
              </g>
            )}

            {/* Scatter Points (Strictly 1 <circle> per complex record) */}
            {records.map((r) => {
              const cx = getX(r.distanceToStationMeters);
              const cy = getY(r.avgPricePerPyeongWon);
              const color = getPointColor(r.distanceToStationMeters);
              const isHovered = hoveredRecord?.id === r.id;
              const isLandmark = landmarkIds.has(r.id);

              return (
                <circle
                  key={r.id}
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 7.5 : isLandmark ? 6 : 5}
                  fill={color}
                  fillOpacity={isHovered ? 1 : 0.88}
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  className="cursor-pointer transition-opacity duration-150"
                  onMouseEnter={(e) => handlePointHover(e, r)}
                  onClick={() => onSelectComplex?.(r)}
                />
              );
            })}

            {/* Landmark Complex Callout Tags */}
            {landmarkRecords.map((r) => {
              const cx = getX(r.distanceToStationMeters);
              const cy = getY(r.avgPricePerPyeongWon);
              const pyeongMan = Math.round(toPyeongMan(r.avgPricePerPyeongWon));
              const shortName = r.name.length > 10 ? `${r.name.slice(0, 10)}…` : r.name;
              const isNearRightEdge = cx > svgWidth - 170;
              const labelX = isNearRightEdge ? cx - 8 : cx + 8;
              const anchor = isNearRightEdge ? 'end' : 'start';

              return (
                <g key={`label-${r.id}`} className="pointer-events-none">
                  <text
                    x={labelX}
                    y={cy - 7}
                    textAnchor={anchor}
                    className="fill-primary text-[10px] font-extrabold tabular-nums"
                    style={{
                      paintOrder: 'stroke',
                      stroke: 'var(--bg-surface, #ffffff)',
                      strokeWidth: '3px',
                      strokeLinecap: 'round',
                      strokeLinejoin: 'round',
                    }}
                  >
                    {shortName} ({pyeongMan.toLocaleString()}만)
                  </text>
                </g>
              );
            })}

            {/* X & Y Axis Titles */}
            <text
              x={margin.left + plotWidth / 2}
              y={svgHeight - 10}
              textAnchor="middle"
              className="fill-slate-500 dark:fill-slate-400 text-[11px] font-extrabold"
            >
              동탄역(GTX-A)과의 거리
            </text>
            <text
              x={margin.left}
              y={margin.top - 14}
              textAnchor="start"
              className="fill-slate-500 dark:fill-slate-400 text-[11px] font-extrabold"
            >
              평당 매매가 (만원/평)
            </text>
          </svg>

          {/* Floating High-Contrast Tooltip Card */}
          {hoveredRecord && (() => {
            const actualPyeongMan = Math.round(toPyeongMan(hoveredRecord.avgPricePerPyeongWon));
            const expectedPyeongMan = Math.round(
              intercept + slope * (hoveredRecord.distanceToStationMeters / 1000)
            );
            const residualMan = actualPyeongMan - expectedPyeongMan;

            return (
              <div
                style={{
                  left: `${Math.min(
                    Math.max(12, tooltipPos.x + 14),
                    Math.max(20, (containerRef.current?.clientWidth || 600) - 245)
                  )}px`,
                  top: `${Math.max(12, tooltipPos.y - 140)}px`,
                }}
                className="absolute z-20 pointer-events-none p-3.5 rounded-2xl bg-white/95 dark:bg-[#1e1e26]/95 backdrop-blur-md border border-blue-500/30 shadow-xl min-w-[225px] flex flex-col gap-1.5 text-[11px]"
              >
                <div className="flex items-center justify-between gap-2 border-b border-[#f2f4f6] dark:border-[#2c2c35] pb-1.5 mb-0.5">
                  <span className="font-black text-primary text-[12px] truncate max-w-[150px]">
                    {hoveredRecord.name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#f9fafb] dark:bg-[#2a2a35] text-[10px] font-extrabold text-secondary">
                    {hoveredRecord.dong}
                  </span>
                </div>

                <div className="flex items-center justify-between tabular-nums">
                  <span className="text-secondary font-semibold">동탄역 직선거리</span>
                  <span className="font-black text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">
                    <TrainFront className="w-3 h-3" />
                    {hoveredRecord.distanceToStationMeters.toLocaleString()}m
                  </span>
                </div>

                <div className="flex items-center justify-between tabular-nums">
                  <span className="text-secondary font-semibold">실거래 평당가</span>
                  <span className="font-black text-primary">
                    {actualPyeongMan.toLocaleString()}만원/평
                  </span>
                </div>

                <div className="flex items-center justify-between tabular-nums">
                  <span className="text-secondary font-semibold">평균 매매가</span>
                  <span className="font-extrabold text-primary">
                    {(hoveredRecord.avgPriceWon / 100000000).toFixed(1)}억원 ({hoveredRecord.txCount}건)
                  </span>
                </div>

                <div className="flex items-center justify-between tabular-nums pt-1 border-t border-[#f2f4f6] dark:border-[#2c2c35]">
                  <span className="text-tertiary font-semibold">OLS 추세 대비</span>
                  <span
                    className={`font-black ${
                      residualMan >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {residualMan >= 0 ? `+${residualMan.toLocaleString()}만` : `${residualMan.toLocaleString()}만`}/평
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </section>
  );
}
