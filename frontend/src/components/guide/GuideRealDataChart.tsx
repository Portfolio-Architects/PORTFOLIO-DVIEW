import React from 'react';
import { BarChart3 } from 'lucide-react';
import type { GuideAptMiniPreviewItem } from '@/lib/data/guides';

export interface GuideRealDataChartProps {
  articleTitle: string;
  items: GuideAptMiniPreviewItem[];
  className?: string;
}

/**
 * Pure SSR-compatible SVG horizontal real-transaction comparison chart.
 * Strictly renders verified MOLIT latestPrice & jeonseRatio data (zero mock/estimated numbers).
 */
export default function GuideRealDataChart({
  articleTitle,
  items,
  className = '',
}: GuideRealDataChartProps) {
  const verifiedItems = (items || [])
    .filter((item) => typeof item.latestPrice === 'number' && Number.isFinite(item.latestPrice) && item.latestPrice > 0)
    .sort((a, b) => b.latestPrice - a.latestPrice)
    .slice(0, 6);

  if (verifiedItems.length < 2) {
    return null;
  }

  const maxPrice = Math.max(...verifiedItems.map((i) => i.latestPrice), 1);
  const rowHeight = 42;
  const topPad = 14;
  const bottomPad = 16;
  const svgHeight = topPad + verifiedItems.length * rowHeight + bottomPad;
  const svgWidth = 680;
  const labelWidth = 178;
  const valueAreaWidth = 128;
  const barTrackWidth = svgWidth - labelWidth - valueAreaWidth - 20;

  return (
    <figure
      data-testid="guide-real-data-chart"
      className={`rounded-2xl bg-elevated border border-border/60 p-4 sm:p-5 space-y-3 tabular-nums ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#eff1f5] dark:bg-[#1e2532] text-primary shrink-0">
            <BarChart3 size={14} aria-hidden="true" />
          </span>
          <h2 className="text-xs sm:text-sm font-black text-primary tracking-tight truncate">
            리포트 핵심 단지 국토부 실거래가 시각화 비교
          </h2>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-bold text-tertiary">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#2f6bff] dark:bg-[#60a5fa] inline-block" />
            <span>최근 매매</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-500 dark:bg-slate-400 inline-block" />
            <span>전세 보증금</span>
          </span>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          role="img"
          aria-label={`${articleTitle} 핵심 단지 국토부 실거래 매매가 및 전세가 비교 차트`}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full min-w-[480px] h-auto block"
        >
          {verifiedItems.map((item, idx) => {
            const y = topPad + idx * rowHeight;
            const saleRatio = Math.max(0.08, Math.min(1, item.latestPrice / maxPrice));
            const saleBarW = Math.round(barTrackWidth * saleRatio);
            const rentPrice =
              typeof item.latestRent === 'number' && Number.isFinite(item.latestRent) && item.latestRent > 0
                ? item.latestRent
                : 0;
            const rentBarW =
              rentPrice > 0 ? Math.max(10, Math.round(barTrackWidth * Math.min(1, rentPrice / maxPrice))) : 0;

            const shortName =
              item.displayName.length > 13 ? `${item.displayName.slice(0, 12)}…` : item.displayName;
            const ratioLabel = item.jeonseRatio > 0 ? `전세 ${item.jeonseRatio}%` : item.dong;

            return (
              <g key={item.canonicalSlug} transform={`translate(0, ${y})`}>
                <text
                  x={0}
                  y={14}
                  className="fill-slate-900 dark:fill-slate-100 text-[12px] font-bold"
                >
                  {shortName}
                </text>
                <text
                  x={0}
                  y={29}
                  className="fill-slate-500 dark:fill-slate-400 text-[10.5px] font-semibold"
                >
                  {item.dong}
                </text>

                {/* Track */}
                <rect
                  x={labelWidth}
                  y={4}
                  width={barTrackWidth}
                  height={12}
                  rx={6}
                  className="fill-slate-200/70 dark:fill-slate-800"
                />
                {/* Sale Bar */}
                <rect
                  x={labelWidth}
                  y={4}
                  width={saleBarW}
                  height={12}
                  rx={6}
                  className="fill-[#2f6bff] dark:fill-[#60a5fa]"
                />

                {/* Jeonse Sub-bar */}
                {rentBarW > 0 && (
                  <rect
                    x={labelWidth}
                    y={20}
                    width={rentBarW}
                    height={7}
                    rx={3.5}
                    className="fill-slate-500/80 dark:fill-slate-400/80"
                  />
                )}

                {/* Value Labels */}
                <text
                  x={labelWidth + barTrackWidth + 12}
                  y={14}
                  className="fill-slate-900 dark:fill-slate-50 text-[12px] font-extrabold"
                >
                  {item.latestPriceStr}
                </text>
                <text
                  x={labelWidth + barTrackWidth + 12}
                  y={28}
                  className="fill-slate-500 dark:fill-slate-400 text-[10.5px] font-bold"
                >
                  {ratioLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <figcaption className="text-[11px] font-semibold text-tertiary leading-snug">
        출처: 국토교통부 실거래가 공개시스템 검증 데이터(D-VIEW 일일 동기화 기준). 매매 실거래가가 확인된 상위 대표 단지 최대 6곳의 최근 거래가와 전세 보증금을 동일 축으로 비교했습니다.
      </figcaption>
    </figure>
  );
}
