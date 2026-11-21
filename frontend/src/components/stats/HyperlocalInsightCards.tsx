'use client';

import React from 'react';
import type { ComplexStatItem, HyperlocalInsightCardsData } from '@/types/stats';
import { formatPriceEok } from '@/lib/analytics/statsEngine';

export interface HyperlocalInsightCardsProps {
  insights: HyperlocalInsightCardsData;
  onSelectComplex?: (aptKey: string, aptName: string) => void;
  onOpenJeonseSafety?: (aptName: string) => void;
  onOpenCompare?: (aptName: string) => void;
  className?: string;
}

function formatContractDateShort(rawDate?: string): string {
  if (!rawDate) return '';
  const digits = String(rawDate).replace(/[^0-9]/g, '');
  if (digits.length >= 8) {
    const yy = digits.substring(2, 4);
    const mm = digits.substring(4, 6);
    const dd = digits.substring(6, 8);
    return `${yy}.${mm}.${dd}`;
  }
  return rawDate;
}

function formatHighestSpecMeta(item: ComplexStatItem, preferMaxPyeong = false): string {
  const parts: string[] = [];
  if (item.dong) {
    parts.push(item.dong);
  }

  const hasMaxPyeongArea = Boolean(
    preferMaxPyeong &&
      ((item.maxPyeongArea && item.maxPyeongArea > 0) ||
        (item.maxPyeongAreaPyeong && item.maxPyeongAreaPyeong > 0))
  );
  const rawAreaPyeong = hasMaxPyeongArea ? item.maxPyeongAreaPyeong : item.highestAreaPyeong;
  const rawArea = hasMaxPyeongArea ? item.maxPyeongArea : item.highestArea;
  const rawFloor =
    preferMaxPyeong && item.maxPyeongPrice && item.maxPyeongPrice > 0
      ? item.maxPyeongFloor !== undefined
        ? item.maxPyeongFloor
        : item.maxPyeongTxPrice && item.maxPyeongTxPrice !== item.highestPrice
        ? undefined
        : item.highestFloor
      : item.highestFloor;
  const rawContractDate = preferMaxPyeong
    ? item.maxPyeongContractDate || item.highestContractDate
    : item.highestContractDate;

  const pyeong =
    rawAreaPyeong && rawAreaPyeong > 0
      ? Math.round(rawAreaPyeong)
      : rawArea && rawArea > 0
      ? Math.round(rawArea / 3.30578)
      : 0;
  const areaM2 = rawArea && rawArea > 0 ? Math.round(rawArea) : 0;

  if (pyeong > 0 && areaM2 > 0) {
    parts.push(`${pyeong}평(${areaM2}㎡)`);
  } else if (pyeong > 0) {
    parts.push(`${pyeong}평형`);
  } else if (areaM2 > 0) {
    parts.push(`${areaM2}㎡`);
  } else if (item.region) {
    parts.push(item.region);
  }

  if (rawFloor !== undefined && rawFloor !== null && rawFloor !== '') {
    parts.push(`${rawFloor}층`);
  }

  const shortDate = formatContractDateShort(rawContractDate);
  if (shortDate) {
    parts.push(`${shortDate} 거래`);
  }

  return parts.join(' · ');
}

export function HyperlocalInsightCards({
  insights,
  onSelectComplex,
  onOpenJeonseSafety,
  onOpenCompare,
  className,
}: HyperlocalInsightCardsProps) {
  const { newHighComplex, optimalGapComplex, volumeSurgeComplex, urgentBargainComplex } = insights;

  const newHighPyeongPrice =
    newHighComplex?.highestPyeongPrice || newHighComplex?.avgPyeongPrice || 0;
  const newHighDateBadge = formatContractDateShort(newHighComplex?.highestContractDate);

  const topPyeongPrice =
    optimalGapComplex?.maxPyeongPrice ||
    optimalGapComplex?.highestPyeongPrice ||
    optimalGapComplex?.avgPyeongPrice ||
    0;
  const topPyeongTotalPrice =
    optimalGapComplex?.maxPyeongTxPrice ||
    optimalGapComplex?.highestPrice ||
    optimalGapComplex?.avgPrice ||
    0;
  const topPyeongDateBadge = formatContractDateShort(
    optimalGapComplex?.maxPyeongContractDate || optimalGapComplex?.highestContractDate
  );

  return (
    <div
      data-testid="stats-hyperlocal-insights"
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ${className ?? 'mb-8'}`}
    >
      {/* 1. 최고 거래가 단지 */}
      <div
        data-testid="insight-card-new-high"
        onClick={
          newHighComplex
            ? () => onSelectComplex?.(newHighComplex.aptKey, newHighComplex.aptName)
            : undefined
        }
        onKeyDown={
          newHighComplex
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectComplex?.(newHighComplex.aptKey, newHighComplex.aptName);
                }
              }
            : undefined
        }
        role={newHighComplex ? 'button' : undefined}
        tabIndex={newHighComplex ? 0 : undefined}
        aria-label={newHighComplex ? `최고 거래가 ${newHighComplex.aptName} 상세 보기` : undefined}
        className={`relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-elevated transition-colors ${
          newHighComplex
            ? 'group hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] cursor-pointer'
            : 'cursor-default'
        }`}
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-[#eff1f5] dark:bg-[#1e2532] text-secondary">
              최고 거래가
            </span>
            {newHighDateBadge && (
              <span className="text-[11px] font-bold tabular-nums text-tertiary">
                {newHighDateBadge} 계약
              </span>
            )}
          </div>
          <h4 className="font-extrabold text-sm sm:text-base text-primary group-hover:text-primary transition-colors line-clamp-1">
            {newHighComplex?.aptName || '해당 없음'}
          </h4>
          <p className="text-xs text-secondary mt-1 truncate">
            {newHighComplex ? formatHighestSpecMeta(newHighComplex) : '최근 거래 내역 없음'}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-border flex items-end justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-tertiary">최고 거래가</span>
            {newHighPyeongPrice > 0 && (
              <span className="text-[11px] font-semibold tabular-nums text-secondary mt-0.5">
                평당 {newHighPyeongPrice.toLocaleString()}만원
              </span>
            )}
          </div>
          <div className="flex flex-col items-end">
            <p className="text-sm sm:text-base font-black tabular-nums text-primary">
              {newHighComplex?.highestPrice
                ? formatPriceEok(newHighComplex.highestPrice)
                : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. 최고 평당가 단지 */}
      <div
        data-testid="insight-card-optimal-gap"
        onClick={
          optimalGapComplex
            ? () => onSelectComplex?.(optimalGapComplex.aptKey, optimalGapComplex.aptName)
            : undefined
        }
        onKeyDown={
          optimalGapComplex
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectComplex?.(optimalGapComplex.aptKey, optimalGapComplex.aptName);
                }
              }
            : undefined
        }
        role={optimalGapComplex ? 'button' : undefined}
        tabIndex={optimalGapComplex ? 0 : undefined}
        aria-label={
          optimalGapComplex ? `최고 평당가 ${optimalGapComplex.aptName} 상세 보기` : undefined
        }
        className={`relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-elevated transition-colors ${
          optimalGapComplex
            ? 'group hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] cursor-pointer'
            : 'cursor-default'
        }`}
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-[#eff1f5] dark:bg-[#1e2532] text-secondary">
              최고 평당가
            </span>
            {topPyeongDateBadge && (
              <span className="text-[11px] font-bold tabular-nums text-tertiary">
                {topPyeongDateBadge} 계약
              </span>
            )}
          </div>
          <h4 className="font-extrabold text-sm sm:text-base text-primary group-hover:text-primary transition-colors line-clamp-1">
            {optimalGapComplex?.aptName || '해당 없음'}
          </h4>
          <p className="text-xs text-secondary mt-1 truncate">
            {optimalGapComplex
              ? formatHighestSpecMeta(optimalGapComplex, true)
              : '최근 거래 내역 없음'}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-border flex items-end justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-tertiary">최고 평당가</span>
            {topPyeongTotalPrice > 0 && (
              <span className="text-[11px] font-semibold tabular-nums text-secondary mt-0.5">
                매매 {formatPriceEok(topPyeongTotalPrice)}
              </span>
            )}
          </div>
          <div className="flex flex-col items-end">
            <p className="text-sm sm:text-base font-black tabular-nums text-primary">
              {topPyeongPrice > 0
                ? `평당 ${topPyeongPrice.toLocaleString()}만원`
                : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. 주간 거래량 급증 단지 */}
      <div
        data-testid="insight-card-volume-surge"
        onClick={
          volumeSurgeComplex
            ? () => onSelectComplex?.(volumeSurgeComplex.aptKey, volumeSurgeComplex.aptName)
            : undefined
        }
        onKeyDown={
          volumeSurgeComplex
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectComplex?.(volumeSurgeComplex.aptKey, volumeSurgeComplex.aptName);
                }
              }
            : undefined
        }
        role={volumeSurgeComplex ? 'button' : undefined}
        tabIndex={volumeSurgeComplex ? 0 : undefined}
        aria-label={
          volumeSurgeComplex ? `거래량 급증 ${volumeSurgeComplex.aptName} 상세 보기` : undefined
        }
        className={`relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-elevated transition-colors ${
          volumeSurgeComplex
            ? 'group hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] cursor-pointer'
            : 'cursor-default'
        }`}
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-[#eff1f5] dark:bg-[#1e2532] text-secondary">
              거래량 급증
            </span>
          </div>
          <h4 className="font-extrabold text-sm sm:text-base text-primary group-hover:text-primary transition-colors line-clamp-1">
            {volumeSurgeComplex?.aptName || '해당 없음'}
          </h4>
          <p className="text-xs text-secondary mt-1">
            {volumeSurgeComplex ? `${volumeSurgeComplex.dong} · 평당 ${volumeSurgeComplex.avgPyeongPrice.toLocaleString()}만` : '거래 데이터 없음'}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-border flex items-baseline justify-between">
          <span className="text-[11px] font-bold text-tertiary">체결 건수</span>
          <p className="text-sm sm:text-base font-black tabular-nums text-primary">
            {volumeSurgeComplex?.txCount ? `${volumeSurgeComplex.txCount}건` : '-'}
          </p>
        </div>
      </div>

      {/* 4. 낙폭과대 급매 단지 */}
      <div
        data-testid="insight-card-urgent-bargain"
        onClick={
          urgentBargainComplex
            ? () => onSelectComplex?.(urgentBargainComplex.aptKey, urgentBargainComplex.aptName)
            : undefined
        }
        onKeyDown={
          urgentBargainComplex
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectComplex?.(urgentBargainComplex.aptKey, urgentBargainComplex.aptName);
                }
              }
            : undefined
        }
        role={urgentBargainComplex ? 'button' : undefined}
        tabIndex={urgentBargainComplex ? 0 : undefined}
        aria-label={
          urgentBargainComplex ? `낙폭과대 급매 ${urgentBargainComplex.aptName} 상세 보기` : undefined
        }
        className={`relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-elevated transition-colors ${
          urgentBargainComplex
            ? 'group hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] cursor-pointer'
            : 'cursor-default'
        }`}
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-brand-blue-light text-brand-blue">
              낙폭과대 급매
            </span>
          </div>
          <h4 className="font-extrabold text-sm sm:text-base text-primary group-hover:text-primary transition-colors line-clamp-1">
            {urgentBargainComplex?.aptName || '해당 없음'}
          </h4>
          <p className="text-xs text-secondary mt-1">
            {urgentBargainComplex
              ? `${urgentBargainComplex.dong} · 고점 ${formatPriceEok(urgentBargainComplex.highestPrice)}`
              : '급매 데이터 없음'}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-border flex items-baseline justify-between">
          <span className="text-[11px] font-bold text-tertiary">고점 대비 할인율</span>
          <p className="text-sm sm:text-base font-black tabular-nums text-brand-blue">
            {urgentBargainComplex?.urgentSaleDiscountRate
              ? `-${urgentBargainComplex.urgentSaleDiscountRate}%`
              : '-'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default HyperlocalInsightCards;
