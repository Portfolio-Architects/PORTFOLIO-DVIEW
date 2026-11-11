'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TrainFront, TrendingDown, TrendingUp, Activity } from 'lucide-react';
import type { ApartmentStatRecord, RegressionAnalysisResult } from '@/lib/stats/types';
import { formatPriceEokCompact, formatShortContractDate } from '@/lib/stats/dongtanStationDistanceEngine';
import { getToggleTrackClass, getToggleBtnClass } from '@/lib/design-system/controls';

export type TrendlineDisplayMode = 'both' | 'log' | 'linear';

export interface DistanceRegressionScatterPlotProps {
  records: ApartmentStatRecord[];
  regression: RegressionAnalysisResult;
  onSelectComplex?: (record: ApartmentStatRecord) => void;
  className?: string;
}

function estimateSvgTextWidth(text: string): number {
  let width = 0;
  for (const ch of text) {
    if (/[가-힣…]/.test(ch)) {
      width += 10.8;
    } else if (/[A-Z]/.test(ch)) {
      width += 7.5;
    } else {
      width += 6.5;
    }
  }
  return Math.ceil(width) + 10;
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
  const [trendMode, setTrendMode] = useState<TrendlineDisplayMode>('both');

  // Dynamic 1:1 pixel-accurate SVG dimensions to prevent aspect-ratio stretching/blurring,
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
  const margin = { top: 46, right: 30, bottom: 56, left: 72 };
  const plotWidth = Math.max(200, svgWidth - margin.left - margin.right);
  const plotHeight = Math.max(180, svgHeight - margin.top - margin.bottom);

  // Reserve a dedicated 26px top header band inside the plot for Zone Labels ("역세권 코어", etc.)
  // so scatter points and callout texts never collide with the Y-axis title or zone headers.
  const zoneHeaderBandHeight = 26;
  const dataTop = margin.top + zoneHeaderBandHeight + 12;
  const dataBottom = svgHeight - margin.bottom - 12;
  const dataHeight = Math.max(120, dataBottom - dataTop);

  // Tight X Domain: 0m to 5,150m (eliminating wasted right whitespace)
  const xMin = 0;
  const xMax = 5150;

  const toPyeongMan = (pyeongWon: number) =>
    pyeongWon > 100000 ? pyeongWon / 10000 : pyeongWon;

  // Tight data-fitted Y Domain (100만 step bounds instead of wide 500만 dead bands)
  // so the vertical amplitude utilizes ~90%+ of plot height and preserves realistic slope steepness.
  const { yMin, yMax, yGridValues } = useMemo(() => {
    let minVal = 1500;
    let maxVal = 5384;
    if (records.length > 0) {
      const vals = records.map((r) => toPyeongMan(r.avgPricePerPyeongWon));
      minVal = Math.min(...vals);
      maxVal = Math.max(...vals);
    }
    let computedMin = Math.max(400, Math.floor((minVal - 60) / 100) * 100);
    let computedMax = Math.ceil((maxVal + 140) / 100) * 100;
    if (computedMax - computedMin < 1200) {
      const mid = Math.round((computedMin + computedMax) / 200) * 100;
      computedMin = Math.max(400, mid - 600);
      computedMax = computedMin + 1200;
    }

    const firstTick = Math.ceil(computedMin / 500) * 500;
    const lastTick = Math.floor(computedMax / 500) * 500;
    const ticks: number[] = [];
    for (let v = firstTick; v <= lastTick; v += 500) {
      ticks.push(v);
    }
    return { yMin: computedMin, yMax: computedMax, yGridValues: ticks };
  }, [records]);

  const getX = (distMeters: number) => {
    const clamped = Math.max(xMin, Math.min(xMax, distMeters));
    return margin.left + ((clamped - xMin) / (xMax - xMin)) * plotWidth;
  };

  const getY = (pyeongWon: number) => {
    const pyeongMan = toPyeongMan(pyeongWon);
    const clamped = Math.max(yMin, Math.min(yMax, pyeongMan));
    return dataTop + dataHeight - ((clamped - yMin) / (yMax - yMin)) * dataHeight;
  };

  // 1. Linear OLS Regression line parameters (y = slope * x_km + intercept)
  const slope = regression.slopeManwonPerKm ?? regression.slopeWonPerKm ?? -386;
  const intercept = regression.interceptManwon ?? regression.interceptWon ?? 3438;

  const yAt0 = intercept;
  const yAt5050 = intercept + slope * 5.05;

  const lineX1 = getX(0);
  const lineY1 = getY(yAt0);
  const lineX2 = getX(5050);
  const lineY2 = getY(yAt5050);

  // Linear OLS Confidence corridor (±380 만원/평 dispersion band)
  const bandDelta = 380;
  const bandPolygonPoints = [
    `${getX(0)},${getY(yAt0 + bandDelta)}`,
    `${getX(5050)},${getY(yAt5050 + bandDelta)}`,
    `${getX(5050)},${getY(yAt5050 - bandDelta)}`,
    `${getX(0)},${getY(yAt0 - bandDelta)}`,
  ].join(' ');

  // 2. Empirical Semi-Log Distance Decay Regression: y = b0 + b1 * ln(dist_km)
  // Captures the real urban bid-rent steep drop inside <1.5km (R² ≈ 60.9% vs linear 44.1%)
  const logRegression = useMemo(() => {
    const valid = records.filter(
      (r) =>
        Number.isFinite(r.distanceToStationMeters) &&
        r.distanceToStationMeters > 0 &&
        Number.isFinite(r.avgPricePerPyeongWon) &&
        r.avgPricePerPyeongWon > 0
    );

    if (valid.length < 2) {
      return {
        isValid: false,
        b0: intercept,
        b1: 0,
        rSquared: 0,
        pearsonR: 0,
        minDistMeters: 160,
        predict: (km: number) => intercept + slope * km,
      };
    }

    const us = valid.map((r) => Math.log(Math.max(0.08, r.distanceToStationMeters / 1000)));
    const ys = valid.map((r) => toPyeongMan(r.avgPricePerPyeongWon));
    const n = valid.length;
    const meanU = us.reduce((acc, v) => acc + v, 0) / n;
    const meanY = ys.reduce((acc, v) => acc + v, 0) / n;

    let suu = 0;
    let suy = 0;
    let syy = 0;
    for (let i = 0; i < n; i++) {
      const du = us[i] - meanU;
      const dy = ys[i] - meanY;
      suu += du * du;
      suy += du * dy;
      syy += dy * dy;
    }

    if (suu <= 1e-9 || syy <= 1e-9) {
      return {
        isValid: false,
        b0: meanY,
        b1: 0,
        rSquared: 0,
        pearsonR: 0,
        minDistMeters: 160,
        predict: () => meanY,
      };
    }

    const b1 = suy / suu;
    const b0 = meanY - b1 * meanU;
    const rSquared = Math.max(0, Math.min(1, (suy * suy) / (suu * syy)));
    const pearsonR = Math.max(-1, Math.min(1, suy / Math.sqrt(suu * syy)));
    const minObservedMeters = Math.min(...valid.map((r) => r.distanceToStationMeters));
    const minDistMeters = Math.max(120, Math.min(180, minObservedMeters - 30));

    return {
      isValid: true,
      b0,
      b1,
      rSquared,
      pearsonR,
      minDistMeters,
      predict: (km: number) => b0 + b1 * Math.log(Math.max(0.08, km)),
    };
  }, [records, intercept, slope]);

  // Smooth SVG path & corridor polygon for Semi-Log Decay Curve
  const { logCurvePath, logCorridorPoints } = useMemo(() => {
    if (!logRegression.isValid) {
      return { logCurvePath: '', logCorridorPoints: '' };
    }
    const sampleCount = 56;
    const startM = logRegression.minDistMeters;
    const endM = 5050;
    const upperPts: string[] = [];
    const lowerPts: string[] = [];
    const pathCommands: string[] = [];
    const logBandDelta = 340;

    for (let i = 0; i <= sampleCount; i++) {
      // Denser sampling near <1.5km where curvature is steepest
      const t = i / sampleCount;
      const easedT = t * t * 0.65 + t * 0.35;
      const distM = startM + (endM - startM) * easedT;
      const predMan = logRegression.predict(distM / 1000);
      const px = getX(distM).toFixed(1);
      const py = getY(predMan).toFixed(1);
      pathCommands.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
      upperPts.push(`${px},${getY(predMan + logBandDelta).toFixed(1)}`);
      lowerPts.unshift(`${px},${getY(predMan - logBandDelta).toFixed(1)}`);
    }

    return {
      logCurvePath: pathCommands.join(' '),
      logCorridorPoints: [...upperPts, ...lowerPts].join(' '),
    };
  }, [logRegression, svgWidth, svgHeight, plotWidth, dataTop, dataHeight, yMin, yMax]);

  // Real empirical phase-by-phase decay summary for the right-side briefing panel
  const decaySummary = useMemo(() => {
    const p200m = Math.round(logRegression.predict(0.2));
    const p1km = Math.round(logRegression.predict(1.0));
    const p2km = Math.round(logRegression.predict(2.0));
    const p3km = Math.round(logRegression.predict(3.0));
    const p5km = Math.round(logRegression.predict(5.0));

    const dropCore800m = Math.max(0, p200m - p1km); // 200m -> 1km drop
    const dropCorePerKm = Math.round(dropCore800m / 0.8);
    const dropMid1km = Math.max(0, p1km - p2km); // 1km -> 2km drop
    const dropOuterPerKm = Math.max(0, Math.round((p2km - p5km) / 3.0)); // 2km -> 5km per km
    const maxRate = Math.max(dropCorePerKm, dropMid1km, dropOuterPerKm, 1);

    const diff34PyeongEok = (((p200m - p3km) * 34) / 10000).toFixed(1);

    return {
      p200m,
      p1km,
      p2km,
      p3km,
      p5km,
      dropCore800m,
      dropCorePerKm,
      dropMid1km,
      dropOuterPerKm,
      maxRate,
      diff200mTo3kmMan: Math.max(0, p200m - p3km),
      diff34PyeongEok,
    };
  }, [logRegression]);

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

  // 8-direction collision-aware placement solver for landmark callout labels
  const positionedLandmarks = useMemo(() => {
    if (landmarkRecords.length === 0) return [];

    const allPoints = records.map((r) => ({
      id: r.id,
      x: margin.left + ((Math.max(xMin, Math.min(xMax, r.distanceToStationMeters)) - xMin) / (xMax - xMin)) * plotWidth,
      y:
        dataTop +
        dataHeight -
        ((Math.max(yMin, Math.min(yMax, toPyeongMan(r.avgPricePerPyeongWon))) - yMin) / (yMax - yMin)) *
          dataHeight,
    }));

    const minBoundX = margin.left + 6;
    const maxBoundX = svgWidth - margin.right - 6;
    const minBoundY = margin.top + zoneHeaderBandHeight + 4;
    const maxBoundY = svgHeight - margin.bottom - 6;

    interface Box {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }

    const placedBoxes: Box[] = [];
    const labelH = 14;

    const boxesOverlap = (a: Box, b: Box, pad = 4) =>
      a.x1 - pad < b.x2 && a.x2 + pad > b.x1 && a.y1 - pad < b.y2 && a.y2 + pad > b.y1;

    return landmarkRecords.map((r) => {
      const cx =
        margin.left + ((Math.max(xMin, Math.min(xMax, r.distanceToStationMeters)) - xMin) / (xMax - xMin)) * plotWidth;
      const cy =
        dataTop +
        dataHeight -
        ((Math.max(yMin, Math.min(yMax, toPyeongMan(r.avgPricePerPyeongWon))) - yMin) / (yMax - yMin)) *
          dataHeight;

      const pyeongMan = Math.round(toPyeongMan(r.avgPricePerPyeongWon));
      const shortName = r.name.length > 10 ? `${r.name.slice(0, 10)}…` : r.name;
      const text = `${shortName} (${pyeongMan.toLocaleString()}만)`;
      const estW = estimateSvgTextWidth(text);

      const candidates: Array<{
        labelX: number;
        labelY: number;
        anchor: 'start' | 'middle' | 'end';
        box: Box;
      }> = [
        // 1. Right-middle
        {
          labelX: cx + 11,
          labelY: cy + 3.5,
          anchor: 'start',
          box: { x1: cx + 11, y1: cy - 8, x2: cx + 11 + estW, y2: cy - 8 + labelH },
        },
        // 2. Top-right
        {
          labelX: cx + 9,
          labelY: cy - 10,
          anchor: 'start',
          box: { x1: cx + 9, y1: cy - 21, x2: cx + 9 + estW, y2: cy - 21 + labelH },
        },
        // 3. Left-middle
        {
          labelX: cx - 11,
          labelY: cy + 3.5,
          anchor: 'end',
          box: { x1: cx - 11 - estW, y1: cy - 8, x2: cx - 11, y2: cy - 8 + labelH },
        },
        // 4. Top-left
        {
          labelX: cx - 9,
          labelY: cy - 10,
          anchor: 'end',
          box: { x1: cx - 9 - estW, y1: cy - 21, x2: cx - 9, y2: cy - 21 + labelH },
        },
        // 5. Bottom-right
        {
          labelX: cx + 9,
          labelY: cy + 18,
          anchor: 'start',
          box: { x1: cx + 9, y1: cy + 7, x2: cx + 9 + estW, y2: cy + 7 + labelH },
        },
        // 6. Bottom-left
        {
          labelX: cx - 9,
          labelY: cy + 18,
          anchor: 'end',
          box: { x1: cx - 9 - estW, y1: cy + 7, x2: cx - 9, y2: cy + 7 + labelH },
        },
        // 7. Top-center
        {
          labelX: cx,
          labelY: cy - 11,
          anchor: 'middle',
          box: { x1: cx - estW / 2, y1: cy - 22, x2: cx + estW / 2, y2: cy - 22 + labelH },
        },
        // 8. Bottom-center
        {
          labelX: cx,
          labelY: cy + 19,
          anchor: 'middle',
          box: { x1: cx - estW / 2, y1: cy + 8, x2: cx + estW / 2, y2: cy + 8 + labelH },
        },
      ];

      let best = candidates[0];
      let bestScore = Infinity;

      candidates.forEach((cand, idx) => {
        let penalty = idx * 4;
        const { box } = cand;

        if (box.x1 < minBoundX) penalty += 10000 + (minBoundX - box.x1) * 50;
        if (box.x2 > maxBoundX) penalty += 10000 + (box.x2 - maxBoundX) * 50;
        if (box.y1 < minBoundY) penalty += 10000 + (minBoundY - box.y1) * 80;
        if (box.y2 > maxBoundY) penalty += 10000 + (box.y2 - maxBoundY) * 80;

        for (const prev of placedBoxes) {
          if (boxesOverlap(box, prev, 6)) {
            penalty += 6000;
          }
        }

        for (const pt of allPoints) {
          if (pt.id === r.id) continue;
          if (
            pt.x >= box.x1 - 6 &&
            pt.x <= box.x2 + 6 &&
            pt.y >= box.y1 - 6 &&
            pt.y <= box.y2 + 6
          ) {
            penalty += 120;
          }
        }

        if (penalty < bestScore) {
          bestScore = penalty;
          best = cand;
        }
      });

      placedBoxes.push(best.box);

      return {
        id: r.id,
        text,
        labelX: best.labelX,
        labelY: Math.max(minBoundY + 10, Math.min(maxBoundY - 2, best.labelY)),
        anchor: best.anchor,
      };
    });
  }, [
    landmarkRecords,
    records,
    svgWidth,
    svgHeight,
    plotWidth,
    dataTop,
    dataHeight,
    yMin,
    yMax,
    margin.left,
    margin.right,
    margin.top,
    margin.bottom,
  ]);

  // Point color by distance tier (Ad Money v5.0 semantic palette)
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
  const xZoneEnd = getX(xMax);
  const isCompactZoneHeader = xZone1km - margin.left < 108;
  const show500mTickLabel = xZone1km - margin.left >= 84;

  const showLogCurve = (trendMode === 'both' || trendMode === 'log') && logRegression.isValid;
  const showLinearLine = trendMode === 'both' || trendMode === 'linear' || !logRegression.isValid;

  return (
    <section
      aria-label="동탄역 거리 대 평당가 OLS 선형회귀 산점도"
      className={`w-full rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-4 sm:p-6 border border-[#f2f4f6] dark:border-[#202027] flex flex-col justify-between gap-4 ${className}`}
    >
      {/* Top Section Header, Trendline Switcher & Legend */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div>
          <div className="flex items-center flex-wrap gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <TrendingDown className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-primary tracking-tight">
              동탄역 거리 vs 평당가 회귀분석 (역세권 로그 감가 · 선형 OLS)
            </h3>
            {logRegression.isValid && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 tabular-nums">
                로그 R² = {(logRegression.rSquared * 100).toFixed(1)}%
              </span>
            )}
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 tabular-nums">
              선형 R² = {(regression.rSquared * 100).toFixed(1)}%
            </span>
          </div>
          <p className="text-[11px] sm:text-[12px] font-medium text-secondary mt-1">
            {records.length}개 단지 최근 1년 실거래 평균 분포 — 초역세권 급감 구간을 반영한 로그 회귀 곡선 및 선형(OLS) 추세 비교
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Trendline Mode Switcher */}
          <div className={getToggleTrackClass()}>
            <button
              type="button"
              onClick={() => setTrendMode('both')}
              className={getToggleBtnClass(trendMode === 'both', { size: 'sm', tone: 'emerald' })}
            >
              로그+선형 비교
            </button>
            <button
              type="button"
              onClick={() => setTrendMode('log')}
              className={getToggleBtnClass(trendMode === 'log', { size: 'sm', tone: 'emerald' })}
            >
              로그 감가 곡선
            </button>
            <button
              type="button"
              onClick={() => setTrendMode('linear')}
              className={getToggleBtnClass(trendMode === 'linear', { size: 'sm', tone: 'blue' })}
            >
              선형 OLS
            </button>
          </div>

          {/* Crisp Pill Legend */}
          <div className="flex items-center flex-wrap gap-2 text-[11px] font-bold text-secondary bg-white dark:bg-[#202027] px-3 py-1.5 rounded-xl border border-[#f2f4f6] dark:border-[#2c2c35]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3182f6] ring-2 ring-blue-500/20" />
              <span className="text-primary font-extrabold">&lt;1km</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#059669] ring-2 ring-emerald-500/20" />
              <span className="text-primary font-extrabold">1~2km</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#64748b]" />
              <span>2km+</span>
            </div>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-[2.5px] rounded-full bg-[#059669]" />
              <span className="text-emerald-600 dark:text-emerald-400 font-black">로그 곡선</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-b-2 border-dashed border-[#3182f6]" />
              <span className="text-blue-600 dark:text-blue-400 font-black">OLS 직선</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Balanced Layout on Wide Desktop: ~2:1 Banked Scatter Plot (8 cols) + Slope Decay Briefing (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left 8 Cols: High-Contrast Financial Terminal Chart Canvas */}
        <div className="lg:col-span-8 w-full rounded-xl bg-white dark:bg-[#111115] border border-[#f2f4f6] dark:border-[#22222a] p-3 sm:p-4 flex flex-col gap-2">
          {/* Top Formula & Statistical HUD Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#f2f4f6] dark:border-[#1e1e26]">
            <div className="flex items-center gap-2 text-[11px] sm:text-[12px] font-extrabold text-secondary">
              <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Y축: 평당가 ({yMin.toLocaleString()}~{yMax.toLocaleString()}만)</span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span>X축: 동탄역 거리 (0~5km)</span>
            </div>

            <div className="flex items-center flex-wrap gap-1.5">
              {logRegression.isValid && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  <span>
                    y = {Math.round(logRegression.b1)}ln(x) + {Math.round(logRegression.b0).toLocaleString()} (R² = {logRegression.rSquared.toFixed(2)})
                  </span>
                </div>
              )}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f9fafb] dark:bg-[#1a1a22] border border-[#f2f4f6] dark:border-[#2a2a35] text-[11px] font-black text-primary tabular-nums">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>
                  y = {Math.round(slope)}x + {Math.round(intercept).toLocaleString()} (R² = {regression.rSquared.toFixed(2)})
                </span>
              </div>
            </div>
          </div>

          {/* Responsive ~2:1 Banked SVG Scatter Plot with Pre-Reserved Zero-CLS Bounding Box */}
          <div
            ref={containerRef}
            className="w-full h-[400px] sm:h-[500px] lg:h-[540px] relative select-none"
            onMouseLeave={() => setHoveredRecord(null)}
          >
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-full overflow-visible"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="zoneStationCoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3182f6" stopOpacity="0.075" />
                  <stop offset="100%" stopColor="#3182f6" stopOpacity="0.015" />
                </linearGradient>
                <linearGradient id="zoneSubStationGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.008" />
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

              {/* Distance Zone Shaded Backdrops & Dispersion Band */}
              <g clipPath="url(#scatterPlotClip)">
                <rect
                  x={margin.left}
                  y={margin.top}
                  width={Math.max(0, xZone1km - margin.left)}
                  height={plotHeight}
                  fill="url(#zoneStationCoreGrad)"
                />
                <rect
                  x={xZone1km}
                  y={margin.top}
                  width={Math.max(0, xZone2km - xZone1km)}
                  height={plotHeight}
                  fill="url(#zoneSubStationGrad)"
                />

                {/* Show log dispersion corridor when log curve is active, otherwise linear corridor */}
                {showLogCurve && logCorridorPoints ? (
                  <polygon
                    points={logCorridorPoints}
                    fill="#059669"
                    fillOpacity="0.065"
                  />
                ) : (
                  <polygon
                    points={bandPolygonPoints}
                    fill="#3182f6"
                    fillOpacity="0.06"
                  />
                )}
              </g>

              {/* Dedicated Top Zone Header Strip Separator */}
              <line
                x1={margin.left}
                y1={margin.top}
                x2={svgWidth - margin.right}
                y2={margin.top}
                stroke="currentColor"
                className="text-slate-200/80 dark:text-[#23232c]"
                strokeWidth="1"
              />
              <line
                x1={margin.left}
                y1={margin.top + zoneHeaderBandHeight}
                x2={svgWidth - margin.right}
                y2={margin.top + zoneHeaderBandHeight}
                stroke="currentColor"
                className="text-slate-200/70 dark:text-[#202027]"
                strokeWidth="0.75"
              />

              {/* Zone Top Header Labels (Strictly isolated inside top 26px header band) */}
              <text
                x={(margin.left + xZone1km) / 2}
                y={margin.top + 17}
                textAnchor="middle"
                className="fill-blue-600/85 dark:fill-blue-400/85 text-[10px] font-extrabold"
              >
                {isCompactZoneHeader ? '<1km' : '역세권 코어 (<1km)'}
              </text>
              <text
                x={(xZone1km + xZone2km) / 2}
                y={margin.top + 17}
                textAnchor="middle"
                className="fill-emerald-600/85 dark:fill-emerald-400/85 text-[10px] font-extrabold"
              >
                {isCompactZoneHeader ? '1~2km' : '준역세권 (1~2km)'}
              </text>
              <text
                x={(xZone2km + xZoneEnd) / 2}
                y={margin.top + 17}
                textAnchor="middle"
                className="fill-slate-400 dark:fill-slate-500 text-[10px] font-bold"
              >
                {isCompactZoneHeader ? '2km+' : '외곽 주거권 (2km+)'}
              </text>

              {/* Background Grid Lines (Horizontal Price Levels) */}
              {yGridValues.map((pyeong) => {
                const y = getY(pyeong);
                if (y < margin.top + zoneHeaderBandHeight + 4 || y > svgHeight - margin.bottom - 4) {
                  return null;
                }
                const isMajor = pyeong % 1000 === 0;
                const canShowTickLabel =
                  isMajor &&
                  y >= margin.top + zoneHeaderBandHeight + 8 &&
                  y <= svgHeight - margin.bottom - 8;

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
                    {canShowTickLabel && (
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
                const isMajorLabel = (dist === 500 && show500mTickLabel) || dist % 1000 === 0;
                return (
                  <g key={dist}>
                    <line
                      x1={x}
                      y1={isZoneBoundary ? margin.top : margin.top + zoneHeaderBandHeight}
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

              {/* Regression Trendlines (Clipped cleanly to plot area) */}
              <g clipPath="url(#scatterPlotClip)">
                {/* 1. Linear OLS Trendline (Blue Dashed) */}
                {showLinearLine && (
                  <>
                    <line
                      x1={lineX1}
                      y1={lineY1}
                      x2={lineX2}
                      y2={lineY2}
                      stroke="#3182f6"
                      strokeOpacity="0.14"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                    <line
                      x1={lineX1}
                      y1={lineY1}
                      x2={lineX2}
                      y2={lineY2}
                      stroke="#3182f6"
                      strokeWidth="2.25"
                      strokeDasharray="7 5"
                      strokeLinecap="round"
                      className="transition-all duration-300"
                    />
                  </>
                )}

                {/* 2. Empirical Semi-Log Station Decay Curve (Emerald Solid) */}
                {showLogCurve && logCurvePath && (
                  <>
                    <path
                      d={logCurvePath}
                      fill="none"
                      stroke="#059669"
                      strokeOpacity="0.16"
                      strokeWidth="7.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={logCurvePath}
                      fill="none"
                      stroke="#059669"
                      strokeWidth="2.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                )}
              </g>

              {/* Interactive Hover Crosshair Guide Lines */}
              {hoveredRecord && (
                <g className="pointer-events-none">
                  <line
                    x1={getX(hoveredRecord.distanceToStationMeters)}
                    y1={margin.top + zoneHeaderBandHeight}
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

              {/* Collision-Free Landmark Complex Callout Tags */}
              {positionedLandmarks.map((lm) => (
                <g key={`label-${lm.id}`} className="pointer-events-none">
                  <text
                    x={lm.labelX}
                    y={lm.labelY}
                    textAnchor={lm.anchor}
                    className="fill-primary text-[10px] font-extrabold tabular-nums"
                    style={{
                      paintOrder: 'stroke',
                      stroke: 'var(--bg-surface, #ffffff)',
                      strokeWidth: '3.5px',
                      strokeLinecap: 'round',
                      strokeLinejoin: 'round',
                    }}
                  >
                    {lm.text}
                  </text>
                </g>
              ))}

              {/* X & Y Axis Titles (Strictly positioned in outer margin bands with >=20px clearance) */}
              <text
                x={margin.left + plotWidth / 2}
                y={svgHeight - 8}
                textAnchor="middle"
                className="fill-slate-500 dark:fill-slate-400 text-[11px] font-extrabold"
              >
                동탄역(GTX-A)과의 거리
              </text>
              <text
                x={12}
                y={22}
                textAnchor="start"
                className="fill-slate-500 dark:fill-slate-400 text-[11px] font-extrabold"
              >
                평당 매매가 (만원/평)
              </text>
            </svg>

            {/* Floating High-Contrast Tooltip Card */}
            {hoveredRecord && (() => {
              const actualPyeongMan = Math.round(toPyeongMan(hoveredRecord.avgPricePerPyeongWon));
              const distKm = hoveredRecord.distanceToStationMeters / 1000;
              const expectedLinearMan = Math.round(intercept + slope * distKm);
              const residualLinearMan = actualPyeongMan - expectedLinearMan;
              const expectedLogMan = Math.round(logRegression.predict(distKm));
              const residualLogMan = actualPyeongMan - expectedLogMan;
              const latestDateShort = formatShortContractDate(hoveredRecord.latestContractDate);

              return (
                <div
                  style={{
                    left: `${Math.min(
                      Math.max(12, tooltipPos.x + 14),
                      Math.max(20, (svgWidth || 600) - 265)
                    )}px`,
                    top: `${Math.max(12, tooltipPos.y - 180)}px`,
                  }}
                  className="absolute z-20 pointer-events-none p-3.5 rounded-2xl bg-white/95 dark:bg-[#1e1e26]/95 backdrop-blur-md border border-blue-500/30 shadow-xl min-w-[248px] flex flex-col gap-1.5 text-[11px]"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-[#f2f4f6] dark:border-[#2c2c35] pb-1.5 mb-0.5">
                    <span className="font-black text-primary text-[12px] truncate max-w-[164px]">
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
                    <span className="text-secondary font-semibold">1년 평균 평당가</span>
                    <span className="font-black text-primary">
                      {actualPyeongMan.toLocaleString()}만원/평
                    </span>
                  </div>

                  <div className="flex items-center justify-between tabular-nums">
                    <span className="text-secondary font-semibold">1년 평균 매매가</span>
                    <span className="font-extrabold text-primary">
                      {(hoveredRecord.avgPriceWon / 100000000).toFixed(1)}억원 ({hoveredRecord.txCount}건)
                    </span>
                  </div>

                  <div className="flex items-center justify-between tabular-nums">
                    <span className="text-secondary font-semibold">최근 실거래가</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">
                      {formatPriceEokCompact(hoveredRecord.latestPriceWon, '억원')}
                      {latestDateShort && (
                        <span className="text-[10px] font-semibold text-tertiary ml-1">
                          ({latestDateShort})
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 pt-1 border-t border-[#f2f4f6] dark:border-[#2c2c35] tabular-nums">
                    {logRegression.isValid && (
                      <div className="flex items-center justify-between">
                        <span className="text-tertiary font-semibold">로그 곡선 대비</span>
                        <span
                          className={`font-black ${
                            residualLogMan >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          {residualLogMan >= 0 ? `+${residualLogMan.toLocaleString()}만` : `${residualLogMan.toLocaleString()}만`}/평
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-tertiary font-semibold">OLS 직선 대비</span>
                      <span
                        className={`font-extrabold ${
                          residualLinearMan >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {residualLinearMan >= 0 ? `+${residualLinearMan.toLocaleString()}만` : `${residualLinearMan.toLocaleString()}만`}/평
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right 4 Cols: Quantitative Phase-by-Phase Slope Decay Briefing Panel */}
        <aside className="lg:col-span-4 w-full rounded-xl bg-white dark:bg-[#111115] border border-[#f2f4f6] dark:border-[#22222a] p-4 sm:p-5 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#f2f4f6] dark:border-[#1e1e26]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <TrendingDown className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs sm:text-sm font-black text-primary tracking-tight">
                  구간별 실제 감가 기울기 비교
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1e1e26] text-[10px] font-extrabold text-secondary tabular-nums">
                상관계수 r = {(logRegression.isValid ? logRegression.pearsonR : regression.pearsonR).toFixed(2)}
              </span>
            </div>

            <p className="text-[11px] sm:text-[12px] text-secondary font-medium leading-relaxed">
              동탄역 프리미엄은 전 구간 일정하게 하락하지 않고, <strong className="text-primary font-extrabold">도보 역세권(1km 이내)에서 급격히 감가</strong>된 뒤 2km 외곽부터 완만해지는 비선형 로그 구조를 보입니다.
            </p>

            {/* 3-Stage Slope Intensity Cards */}
            <div className="flex flex-col gap-2.5 mt-1">
              {/* Stage 1: Core <1km */}
              <div className="p-3 rounded-xl bg-[#f9fafb] dark:bg-[#17171c] border border-blue-500/15 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-extrabold text-blue-600 dark:text-blue-400">
                    1단계 · 역세권 코어 (200m → 1km)
                  </span>
                  <span className="font-black text-primary tabular-nums">
                    1km당 -{decaySummary.dropCorePerKm.toLocaleString()}만/평
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200/70 dark:bg-slate-800 overflow-hidden">
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(15, Math.round((decaySummary.dropCorePerKm / decaySummary.maxRate) * 100)))}%`,
                    }}
                    className="h-full rounded-full bg-blue-600 dark:bg-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-secondary font-semibold tabular-nums">
                  <span>기대 평당가 {decaySummary.p200m.toLocaleString()}만 → {decaySummary.p1km.toLocaleString()}만</span>
                  <span className="text-blue-600 dark:text-blue-400 font-extrabold">
                    800m 만에 -{decaySummary.dropCore800m.toLocaleString()}만 급감
                  </span>
                </div>
              </div>

              {/* Stage 2: Sub-station 1~2km */}
              <div className="p-3 rounded-xl bg-[#f9fafb] dark:bg-[#17171c] border border-emerald-500/15 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                    2단계 · 준역세권 (1km → 2km)
                  </span>
                  <span className="font-black text-primary tabular-nums">
                    1km당 -{decaySummary.dropMid1km.toLocaleString()}만/평
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200/70 dark:bg-slate-800 overflow-hidden">
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(12, Math.round((decaySummary.dropMid1km / decaySummary.maxRate) * 100)))}%`,
                    }}
                    className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-secondary font-semibold tabular-nums">
                  <span>기대 평당가 {decaySummary.p1km.toLocaleString()}만 → {decaySummary.p2km.toLocaleString()}만</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                    중간 감가 구간
                  </span>
                </div>
              </div>

              {/* Stage 3: Outer 2~5km */}
              <div className="p-3 rounded-xl bg-[#f9fafb] dark:bg-[#17171c] border border-[#f2f4f6] dark:border-[#22222c] flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-extrabold text-secondary">
                    3단계 · 외곽 주거권 (2km → 5km)
                  </span>
                  <span className="font-black text-secondary tabular-nums">
                    1km당 -{decaySummary.dropOuterPerKm.toLocaleString()}만/평
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200/70 dark:bg-slate-800 overflow-hidden">
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(8, Math.round((decaySummary.dropOuterPerKm / decaySummary.maxRate) * 100)))}%`,
                    }}
                    className="h-full rounded-full bg-slate-400 dark:bg-slate-500"
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-tertiary font-semibold tabular-nums">
                  <span>기대 평당가 {decaySummary.p2km.toLocaleString()}만 → {decaySummary.p5km.toLocaleString()}만</span>
                  <span>호수공원 등 국지 입지 우세</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Summary Callout: 34-Pyeong Price Gap & Model Fit Comparison */}
          <div className="p-3.5 rounded-xl bg-blue-500/[0.06] dark:bg-blue-500/[0.09] border border-blue-500/20 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-extrabold text-primary tabular-nums">
              <span>국민평형(34평) 환산 거리 격차</span>
              <span className="text-blue-600 dark:text-blue-400 font-black text-xs sm:text-sm">
                약 -{decaySummary.diff34PyeongEok}억원
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-secondary font-medium leading-snug tabular-nums">
              초역세권 200m({decaySummary.p200m.toLocaleString()}만/평) 대비 3km 외곽({decaySummary.p3km.toLocaleString()}만/평) 이동 시 평당 -{decaySummary.diff200mTo3kmMan.toLocaleString()}만원 차이 · 로그 회귀 적용 시 설명력 {(regression.rSquared * 100).toFixed(1)}% →{' '}
              <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                {(logRegression.rSquared * 100).toFixed(1)}%
              </strong>
              로 상승
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
