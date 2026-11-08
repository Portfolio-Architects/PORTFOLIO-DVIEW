'use client';

import React, { useMemo } from 'react';

import { preloadApartmentModal } from '@/components/common/ComponentPreloader';
import { formatPriceEok as formatStatsPriceEok } from '@/lib/analytics/statsEngine';
import { formatDeltaPrice, formatPriceEok, type AptDonutDataItem } from './AptDonutSection';
import type { AptTxSummary, DongtanMacroTrendPoint } from '@/types';
import type { ComplexStatItem, HyperlocalInsightCardsData } from '@/types/stats';

function formatCompactSpecMeta(item: ComplexStatItem, preferMaxPyeong = false): string {
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

  const pyeong =
    rawAreaPyeong && rawAreaPyeong > 0
      ? Math.round(rawAreaPyeong)
      : rawArea && rawArea > 0
      ? Math.round(rawArea / 3.30578)
      : 0;

  if (pyeong > 0) {
    parts.push(`${pyeong}평`);
  }

  return parts.join(' · ');
}

export const formatCleanDate = (dateStr?: string, contractDate?: string): string => {
  if (contractDate && contractDate.length === 8) {
    return `${contractDate.slice(4, 6)}.${contractDate.slice(6, 8)}`;
  }
  if (!dateStr) return '';
  const mMatch = dateStr.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (mMatch) {
    return `${mMatch[1].padStart(2, '0')}.${mMatch[2].padStart(2, '0')}`;
  }
  const dotMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})/);
  if (dotMatch) {
    return `${dotMatch[1].padStart(2, '0')}.${dotMatch[2].padStart(2, '0')}`;
  }
  return dateStr;
};

export const formatCompactEok = (priceVal?: number): string => {
  if (!priceVal || priceVal <= 0) return '';
  const rounded = Math.round(priceVal * 10) / 10;
  return `${rounded}억`;
};

export interface AptMetricCardsProps {
  recentTransactions?: any[];
  txSummaryData?: Record<string, AptTxSummary> | { summary?: Record<string, AptTxSummary> };
  macroTrendData?: DongtanMacroTrendPoint[];
  newHighCount?: number;
  newHighChange?: number;
  avgPyeongPrice?: number; // 만원 단위
  avgJeonseRate?: number; // % 단위
  onOpenSellTimingCalculator?: (aptName?: string) => void;
  onOpenMortgageModal?: (aptName?: string) => void;
  onOpenJeonseSafetyModal?: (aptName?: string) => void;
  activeSector?: AptDonutDataItem | null;
  insights?: HyperlocalInsightCardsData;
  onResetSector?: () => void;
  onSelectApt?: (name: string, dong?: string) => void;
  onSelectComplex?: (aptKey: string, aptName: string) => void;
  preloadApartmentTx?: (name: string, dong: string) => void;
  className?: string;
}

export const AptMetricCards = React.memo(function AptMetricCards({
  recentTransactions = [],
  txSummaryData,
  macroTrendData = [],
  newHighCount: propNewHighCount,
  newHighChange = 3,
  avgPyeongPrice: propAvgPyeongPrice,
  avgJeonseRate: propAvgJeonseRate,
  onOpenSellTimingCalculator,
  onOpenMortgageModal,
  onOpenJeonseSafetyModal,
  activeSector,
  insights,
  onResetSector,
  onSelectApt,
  onSelectComplex,
  preloadApartmentTx,
  className = '',
}: AptMetricCardsProps) {
  // 1. Calculate New High Count
  const computedNewHighCount = useMemo(() => {
    if (propNewHighCount !== undefined) return propNewHighCount;
    if (Array.isArray(recentTransactions) && recentTransactions.length > 0) {
      return recentTransactions.filter(tx => tx?.isNewHigh || tx?.type === 'high').length;
    }
    if (txSummaryData) {
      const summaryMap = (txSummaryData as { summary?: Record<string, AptTxSummary> })?.summary || (txSummaryData as Record<string, AptTxSummary>);
      const recentList = Object.values(summaryMap).flatMap(a => a.recent || []);
      if (recentList.length > 0) {
        return recentList.filter(tx => tx?.isNewHigh).length;
      }
    }
    if (Array.isArray(recentTransactions) && recentTransactions.length === 0) {
      return 0;
    }
    return 28;
  }, [recentTransactions, txSummaryData, propNewHighCount]);

  // 2. Calculate Average Price per Pyeong (만원)
  const computedAvgPyeongPrice = useMemo(() => {
    if (propAvgPyeongPrice !== undefined) return propAvgPyeongPrice;
    if (Array.isArray(recentTransactions) && recentTransactions.length > 0) {
      const validTx = recentTransactions.filter(
        tx => (typeof tx?.priceVal === 'number' && tx.priceVal > 0) || (typeof tx?.price === 'number' && tx.price > 0)
      );
      if (validTx.length > 0) {
        const sumPyeongPrice = validTx.reduce((acc, tx) => {
          const priceVal = typeof tx.priceVal === 'number' && isFinite(tx.priceVal)
            ? tx.priceVal
            : (typeof tx.price === 'number' && isFinite(tx.price) ? (tx.price > 1000 ? tx.price / 10000 : tx.price) : 0);
          const pyeong = typeof tx.areaPyeong === 'number' && tx.areaPyeong > 0
            ? tx.areaPyeong
            : (typeof tx.area === 'number' && tx.area > 0 ? tx.area / 3.3058 : 34);
          if (!pyeong || pyeong <= 0) return acc;
          return acc + (priceVal * 10000) / pyeong;
        }, 0);
        const avg = Math.round(sumPyeongPrice / validTx.length);
        if (isFinite(avg) && avg > 0) return avg;
      }
    }
    if (txSummaryData) {
      const summaryMap = (txSummaryData as { summary?: Record<string, AptTxSummary> })?.summary || (txSummaryData as Record<string, AptTxSummary>);
      const validApts = Object.values(summaryMap).filter(
        a => (a.avg3MPerPyeong && a.avg3MPerPyeong > 0) || (a.avg1MPerPyeong && a.avg1MPerPyeong > 0)
      );
      if (validApts.length > 0) {
        const sumPyeong = validApts.reduce((acc, a) => acc + (a.avg3MPerPyeong || a.avg1MPerPyeong || 0), 0);
        const avg = Math.round(sumPyeong / validApts.length);
        if (isFinite(avg) && avg > 0) return avg;
      }
    }
    return 2658;
  }, [recentTransactions, txSummaryData, propAvgPyeongPrice]);

  // 3. Calculate Average Jeonse Rate (%)
  const computedAvgJeonseRate = useMemo(() => {
    if (propAvgJeonseRate !== undefined) return propAvgJeonseRate;
    if (Array.isArray(macroTrendData) && macroTrendData.length > 0) {
      for (let i = macroTrendData.length - 1; i >= 0; i--) {
        const point = macroTrendData[i];
        const sale = point?.['동탄 아파트 전체'];
        const jeonse = point?.['동탄 아파트 전세 평균'];
        if (typeof sale === 'number' && sale > 0 && typeof jeonse === 'number' && jeonse > 0 && isFinite(sale) && isFinite(jeonse)) {
          const rate = Math.round((jeonse / sale) * 1000) / 10;
          if (isFinite(rate) && rate > 0) return rate;
        }
      }
    }
    if (txSummaryData) {
      const summaryMap = (txSummaryData as { summary?: Record<string, AptTxSummary> })?.summary || (txSummaryData as Record<string, AptTxSummary>);
      const validApts = Object.values(summaryMap).filter(
        a => (a.avg3MPrice || a.latestPrice) && (a.avg3MRentDeposit || a.latestRentDeposit)
      );
      if (validApts.length > 0) {
        const sumRate = validApts.reduce((acc, a) => {
          const sale = (a.avg3MPrice && a.avg3MPrice > 0) ? a.avg3MPrice : (a.latestPrice && a.latestPrice > 0 ? a.latestPrice : 1);
          const jeonse = a.avg3MRentDeposit || a.latestRentDeposit || 0;
          return acc + (jeonse / sale) * 100;
        }, 0);
        const rate = Math.round((sumRate / validApts.length) * 10) / 10;
        if (isFinite(rate) && rate > 0) return rate;
      }
    }
    return 46.8;
  }, [macroTrendData, txSummaryData, propAvgJeonseRate]);

  // 4. Calculate Rising vs Falling Transactions for Card 1 (상승 거래 비중)
  const risingMetrics = useMemo(() => {
    let rising = 0;
    let falling = 0;

    if (Array.isArray(recentTransactions) && recentTransactions.length > 0) {
      recentTransactions.forEach(tx => {
        if (tx?.isNewHigh || (typeof tx?.delta === 'number' && tx.delta > 0)) {
          rising++;
        } else if (typeof tx?.delta === 'number' && tx.delta < 0) {
          falling++;
        }
      });
    }

    if (rising === 0 && falling === 0 && txSummaryData) {
      const summaryMap = (txSummaryData as { summary?: Record<string, AptTxSummary> })?.summary || (txSummaryData as Record<string, AptTxSummary>);
      const recentList = Object.values(summaryMap).flatMap(a => a.recent || []);
      recentList.forEach((tx: any) => {
        if (tx?.isNewHigh || (typeof tx?.delta === 'number' && tx.delta > 0)) {
          rising++;
        } else if (typeof tx?.delta === 'number' && tx.delta < 0) {
          falling++;
        }
      });
    }

    const finalRising = (rising > 0 || falling > 0) ? rising : 257;
    const finalFalling = (rising > 0 || falling > 0) ? falling : 111;
    const total = finalRising + finalFalling;
    const ratio = total > 0 ? Math.round((finalRising / total) * 1000) / 10 : 69.8;
    const statusLabel = ratio >= 50 ? '상승 우세' : '하락 우세';

    return {
      risingCount: finalRising,
      fallingCount: finalFalling,
      risingRatio: ratio,
      statusLabel,
    };
  }, [recentTransactions, txSummaryData]);

  if (activeSector) {
    const displayItems = (activeSector.items || []).slice(0, 4);
    return (
      <div className={`grid grid-cols-2 grid-rows-2 gap-2.5 sm:gap-3 h-[148px] sm:h-[152px] lg:h-[152px] shrink-0 box-border ${className}`}>
        {displayItems.map((item, idx) => {
          const hasDelta = typeof item.delta === 'number' && isFinite(item.delta);
          const deltaFormatted = hasDelta ? formatDeltaPrice(item.delta) : '';
          const isRising = Boolean(item.isNewHigh || (hasDelta && item.delta > 0));
          const isFalling = Boolean(!item.isNewHigh && hasDelta && item.delta < 0);
          const cleanDate = formatCleanDate(
            item.registeredDateLabel || item.dateLabel,
            item.registeredDate || item.contractDate
          );

          return (
            <div
              key={`${item.aptName}-${item.contractDate || idx}-${idx}`}
              onClick={() => onSelectApt?.(item.aptName, item.dong)}
              onMouseEnter={() => {
                if (preloadApartmentTx) {
                  preloadApartmentTx(item.aptName, item.dong || '');
                }
                preloadApartmentModal();
              }}
              role="button"
              tabIndex={0}
              aria-label={`${item.displayAptName || item.aptName} ${item.priceEok} 실거래 상세 리포트 열기`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectApt?.(item.aptName, item.dong);
                }
              }}
              className="bg-elevated hover:bg-slate-100/90 dark:hover:bg-slate-800/80 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl flex flex-col justify-between h-full min-h-0 overflow-hidden box-border transition-colors duration-150 cursor-pointer text-left group"
            >
              {/* Row 1: Rank badge + Dong/Pyeong (left) | Momentum Badge or Date (right) */}
              <div className="flex items-center justify-between gap-1.5 min-w-0 w-full shrink-0">
                <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 leading-none tabular-nums"
                    style={{
                      backgroundColor: `${activeSector.color}15`,
                      color: activeSector.color,
                    }}
                  >
                    #{idx + 1}
                  </span>
                  <span className="text-[10.5px] font-medium text-tertiary truncate leading-none whitespace-nowrap">
                    {[item.dong, item.areaPyeong ? `${Math.round(item.areaPyeong)}평` : '']
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
                {item.isNewHigh ? (
                  <span className="text-[9.5px] font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded shrink-0 leading-none whitespace-nowrap">
                    신고가
                  </span>
                ) : hasDelta && item.delta !== 0 && deltaFormatted ? (
                  <span
                    className={`text-[10px] font-semibold tabular-nums leading-none whitespace-nowrap shrink-0 ${
                      item.delta > 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {item.delta > 0 ? `+${deltaFormatted}` : `-${deltaFormatted}`}
                  </span>
                ) : cleanDate ? (
                  <span className="text-[10px] font-medium text-tertiary tabular-nums shrink-0 leading-none whitespace-nowrap">
                    {cleanDate}
                  </span>
                ) : null}
              </div>

              {/* Row 2: Apartment Name (left) | Price (right) */}
              <div className="flex items-baseline justify-between gap-2 min-w-0 w-full mt-auto shrink-0 overflow-hidden">
                <span
                  className={`text-[12.5px] sm:text-[13.5px] font-bold text-primary truncate leading-tight transition-colors ${
                    isRising
                      ? 'group-hover:text-red-600 dark:group-hover:text-red-400'
                      : 'group-hover:text-blue-600 dark:group-hover:text-blue-400'
                  }`}
                >
                  {item.displayAptName || item.aptName}
                </span>
                <span
                  className={`text-[13px] sm:text-[14.5px] font-extrabold tabular-nums tracking-tight leading-none whitespace-nowrap shrink-0 ${
                    isRising
                      ? 'text-red-600 dark:text-red-400'
                      : isFalling
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {item.priceEok}
                </span>
              </div>
            </div>
          );
        })}

        {/* Fallback empty slots to maintain 2x2 grid */}
        {Array.from({ length: Math.max(0, 4 - displayItems.length) }).map((_, placeholderIdx) => (
          <div
            key={`empty-${placeholderIdx}`}
            className="bg-surface/50 border border-dashed border-border/60 p-2 rounded-xl sm:rounded-2xl flex items-center justify-center text-center h-full min-h-0 overflow-hidden box-border"
          >
            <span className="text-[10.5px] text-tertiary font-medium">추가 거래 내역 없음</span>
          </div>
        ))}
      </div>
    );
  }

  if (insights) {
    const { newHighComplex, optimalGapComplex, volumeSurgeComplex, urgentBargainComplex } = insights;

    const topPyeongPrice =
      optimalGapComplex?.maxPyeongPrice ||
      optimalGapComplex?.highestPyeongPrice ||
      optimalGapComplex?.avgPyeongPrice ||
      0;

    const handleInsightClick = (complex: ComplexStatItem | null | undefined) => {
      if (!complex) return;
      if (onSelectComplex) {
        onSelectComplex(complex.aptKey, complex.aptName);
      } else if (onSelectApt) {
        onSelectApt(complex.aptName, complex.dong);
      }
    };

    const handleInsightHover = (complex: ComplexStatItem | null | undefined) => {
      if (!complex) return;
      if (preloadApartmentTx) {
        preloadApartmentTx(complex.aptName, complex.dong || '');
      }
      preloadApartmentModal();
    };

    return (
      <div
        data-testid="stats-hyperlocal-insights"
        className={`grid grid-cols-2 grid-rows-2 gap-2.5 sm:gap-3 h-[148px] sm:h-[152px] lg:h-[152px] shrink-0 box-border ${className}`}
      >
        {/* 1. 최고 거래가 단지 */}
        <div
          data-testid="insight-card-new-high"
          onClick={() => handleInsightClick(newHighComplex)}
          onMouseEnter={() => handleInsightHover(newHighComplex)}
          role="button"
          tabIndex={0}
          aria-label={`최고 거래가 ${newHighComplex?.aptName || '해당 없음'} 상세 보기`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleInsightClick(newHighComplex);
            }
          }}
          className="bg-elevated hover:bg-slate-100/90 dark:hover:bg-slate-800/80 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl flex flex-col justify-between h-full min-h-0 overflow-hidden box-border transition-colors duration-150 cursor-pointer text-left group"
        >
          <div className="flex items-center gap-1.5 min-w-0 w-full shrink-0 overflow-hidden">
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0 leading-none whitespace-nowrap">
              최고 거래가
            </span>
            <span className="text-[10.5px] font-medium text-tertiary truncate leading-none whitespace-nowrap">
              {newHighComplex ? formatCompactSpecMeta(newHighComplex) : ''}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2 min-w-0 w-full mt-auto shrink-0 overflow-hidden">
            <span className="text-[12.5px] sm:text-[13.5px] font-bold text-primary truncate leading-tight transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
              {newHighComplex?.aptName || '해당 없음'}
            </span>
            <span className="text-[13px] sm:text-[15px] font-extrabold tabular-nums tracking-tight leading-none whitespace-nowrap shrink-0 text-blue-600 dark:text-blue-400">
              {newHighComplex?.highestPrice ? formatStatsPriceEok(newHighComplex.highestPrice) : '-'}
            </span>
          </div>
        </div>

        {/* 2. 최고 평당가 단지 */}
        <div
          data-testid="insight-card-optimal-gap"
          onClick={() => handleInsightClick(optimalGapComplex)}
          onMouseEnter={() => handleInsightHover(optimalGapComplex)}
          role="button"
          tabIndex={0}
          aria-label={`최고 평당가 ${optimalGapComplex?.aptName || '해당 없음'} 상세 보기`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleInsightClick(optimalGapComplex);
            }
          }}
          className="bg-elevated hover:bg-slate-100/90 dark:hover:bg-slate-800/80 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl flex flex-col justify-between h-full min-h-0 overflow-hidden box-border transition-colors duration-150 cursor-pointer text-left group"
        >
          <div className="flex items-center gap-1.5 min-w-0 w-full shrink-0 overflow-hidden">
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 shrink-0 leading-none whitespace-nowrap">
              최고 평당가
            </span>
            <span className="text-[10.5px] font-medium text-tertiary truncate leading-none whitespace-nowrap">
              {optimalGapComplex ? formatCompactSpecMeta(optimalGapComplex, true) : ''}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2 min-w-0 w-full mt-auto shrink-0 overflow-hidden">
            <span className="text-[12.5px] sm:text-[13.5px] font-bold text-primary truncate leading-tight transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
              {optimalGapComplex?.aptName || '해당 없음'}
            </span>
            <span className="text-[13px] sm:text-[15px] font-extrabold tabular-nums tracking-tight leading-none whitespace-nowrap shrink-0 text-emerald-600 dark:text-emerald-400">
              {topPyeongPrice > 0 ? `${topPyeongPrice.toLocaleString()}만/평` : '-'}
            </span>
          </div>
        </div>

        {/* 3. 거래량 급증 단지 */}
        <div
          data-testid="insight-card-volume-surge"
          onClick={() => handleInsightClick(volumeSurgeComplex)}
          onMouseEnter={() => handleInsightHover(volumeSurgeComplex)}
          role="button"
          tabIndex={0}
          aria-label={`거래량 최다 ${volumeSurgeComplex?.aptName || '해당 없음'} 상세 보기`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleInsightClick(volumeSurgeComplex);
            }
          }}
          className="bg-elevated hover:bg-slate-100/90 dark:hover:bg-slate-800/80 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl flex flex-col justify-between h-full min-h-0 overflow-hidden box-border transition-colors duration-150 cursor-pointer text-left group"
        >
          <div className="flex items-center gap-1.5 min-w-0 w-full shrink-0 overflow-hidden">
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 shrink-0 leading-none whitespace-nowrap">
              거래량 최다
            </span>
            <span className="text-[10.5px] font-medium text-tertiary truncate leading-none whitespace-nowrap">
              {volumeSurgeComplex?.dong || ''}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2 min-w-0 w-full mt-auto shrink-0 overflow-hidden">
            <span className="text-[12.5px] sm:text-[13.5px] font-bold text-primary truncate leading-tight transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
              {volumeSurgeComplex?.aptName || '해당 없음'}
            </span>
            <span className="text-[13px] sm:text-[15px] font-extrabold tabular-nums tracking-tight leading-none whitespace-nowrap shrink-0 text-blue-600 dark:text-blue-400">
              {volumeSurgeComplex?.txCount ? `${volumeSurgeComplex.txCount}건` : '-'}
            </span>
          </div>
        </div>

        {/* 4. 낙폭과대 급매 단지 */}
        <div
          data-testid="insight-card-urgent-bargain"
          onClick={() => handleInsightClick(urgentBargainComplex)}
          onMouseEnter={() => handleInsightHover(urgentBargainComplex)}
          role="button"
          tabIndex={0}
          aria-label={`직전가 대비 하락 ${urgentBargainComplex?.aptName || '해당 없음'} 상세 보기`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleInsightClick(urgentBargainComplex);
            }
          }}
          className="bg-elevated hover:bg-slate-100/90 dark:hover:bg-slate-800/80 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl flex flex-col justify-between h-full min-h-0 overflow-hidden box-border transition-colors duration-150 cursor-pointer text-left group"
        >
          <div className="flex items-center gap-1.5 min-w-0 w-full shrink-0 overflow-hidden">
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 shrink-0 leading-none whitespace-nowrap">
              직전가 대비 하락
            </span>
            <span className="text-[10.5px] font-medium text-tertiary truncate leading-none whitespace-nowrap">
              {urgentBargainComplex?.dong || ''}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2 min-w-0 w-full mt-auto shrink-0 overflow-hidden">
            <span className="text-[12.5px] sm:text-[13.5px] font-bold text-primary truncate leading-tight transition-colors group-hover:text-red-600 dark:group-hover:text-red-400">
              {urgentBargainComplex?.aptName || '해당 없음'}
            </span>
            <span className="text-[13px] sm:text-[15px] font-extrabold tabular-nums tracking-tight leading-none whitespace-nowrap shrink-0 text-red-600 dark:text-red-400">
              {urgentBargainComplex?.urgentSaleDiscountRate
                ? `-${urgentBargainComplex.urgentSaleDiscountRate}%`
                : '-'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 grid-rows-2 gap-2.5 sm:gap-3 h-[148px] sm:h-[152px] lg:h-[152px] shrink-0 box-border ${className}`}>
      {/* Card 1: 상승 거래 비중 */}
      <div className="bg-elevated px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl flex flex-col justify-between h-full min-h-0 overflow-hidden box-border transition-colors duration-150">
        <div className="flex items-center justify-between gap-1.5 w-full min-w-0 shrink-0">
          <span className="text-[11px] text-tertiary font-medium tracking-tight leading-none truncate">
            상승 거래 비중
            <span className="sr-only">신고가 달성</span>
            <span className="sr-only">{computedNewHighCount}건</span>
            <span className="sr-only">
              {newHighChange === 0
                ? '전기 대비 변동 없음'
                : newHighChange > 0
                ? `전기 대비 +${newHighChange}건 상승세`
                : `전기 대비 ${newHighChange}건 하락세`}
            </span>
          </span>
          <span className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded shrink-0 leading-none whitespace-nowrap ${
            risingMetrics.risingRatio >= 50
              ? 'text-red-600 dark:text-red-400 bg-red-500/10'
              : 'text-blue-700 dark:text-blue-400 bg-blue-500/10'
          }`}>
            {risingMetrics.statusLabel}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1.5 sm:gap-2 mt-auto w-full min-w-0 shrink-0">
          <span className={`text-[15px] sm:text-[16px] font-bold tabular-nums leading-none tracking-tight whitespace-nowrap shrink-0 ${
            risingMetrics.risingRatio >= 50
              ? 'text-red-600 dark:text-red-400'
              : 'text-blue-600 dark:text-blue-400'
          }`}>
            {risingMetrics.risingRatio.toFixed(1)}%
          </span>
          <span className="text-[10px] font-medium text-tertiary tabular-nums leading-none truncate">
            상승 {risingMetrics.risingCount.toLocaleString()} · 하락 {risingMetrics.fallingCount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Card 2: 평당 평균 실거래가 */}
      <button
        type="button"
        data-testid="metric-card-mortgage-cta"
        onClick={() => onOpenMortgageModal && onOpenMortgageModal()}
        aria-label="평당 평균 실거래가 기반 주담대 및 정책자금 한도 계산기 열기"
        className="bg-elevated hover:bg-slate-100/90 dark:hover:bg-slate-800/80 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl flex flex-col justify-between h-full min-h-0 overflow-hidden box-border transition-colors duration-150 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-blue-600/20 group"
      >
        <div className="flex items-center justify-between gap-1.5 w-full min-w-0 shrink-0">
          <span className="text-[11px] text-tertiary font-medium tracking-tight leading-none truncate">
            평당 평균 실거래가
          </span>
          <span className="text-[9.5px] font-medium text-tertiary bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded shrink-0 leading-none whitespace-nowrap">
            동탄 전체
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1.5 sm:gap-2 mt-auto w-full min-w-0 shrink-0">
          <span className="text-[15px] sm:text-[16px] font-bold text-primary tabular-nums leading-none tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors whitespace-nowrap shrink-0">
            {computedAvgPyeongPrice.toLocaleString()}만원
          </span>
          <span className="text-[10px] font-medium text-tertiary tabular-nums leading-none truncate">
            84㎡ 약 {(Math.round((computedAvgPyeongPrice * 34) / 1000) / 10).toFixed(1)}억
          </span>
        </div>
      </button>

      {/* Card 3: 평균 전세가율 */}
      <button
        type="button"
        data-testid="metric-card-jeonse-cta"
        onClick={() => onOpenJeonseSafetyModal && onOpenJeonseSafetyModal()}
        aria-label="평균 전세가율 기반 전세보증보험 및 깡통전세 안전진단 계산기 열기"
        className="bg-elevated hover:bg-slate-100/90 dark:hover:bg-slate-800/80 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl flex flex-col justify-between h-full min-h-0 overflow-hidden box-border transition-colors duration-150 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-blue-600/20 group"
      >
        <div className="flex items-center justify-between gap-1.5 w-full min-w-0 shrink-0">
          <span className="text-[11px] text-tertiary font-medium tracking-tight leading-none truncate">
            평균 전세가율
          </span>
          <span className="text-[9.5px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0 leading-none whitespace-nowrap">
            안정권
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1.5 sm:gap-2 mt-auto w-full min-w-0 shrink-0">
          <span className="text-[15px] sm:text-[16px] font-bold text-primary tabular-nums leading-none tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors whitespace-nowrap shrink-0">
            {computedAvgJeonseRate.toFixed(1)}%
          </span>
          <span className="text-[10px] font-medium text-tertiary leading-none truncate">
            매매 대비 전세
          </span>
        </div>
      </button>

      {/* Card 4: 자산 진단 AI CTA */}
      <button
        type="button"
        onClick={() => onOpenSellTimingCalculator && onOpenSellTimingCalculator()}
        aria-label="우리집 적정 가치 및 매도 타이밍 진단 계산기 열기"
        className="bg-elevated hover:bg-slate-100/90 dark:hover:bg-slate-800/80 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl flex flex-col justify-between h-full min-h-0 overflow-hidden box-border transition-colors duration-150 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-blue-600/20 group"
      >
        <div className="flex items-center justify-between gap-1.5 w-full min-w-0 shrink-0">
          <span className="text-[11px] text-tertiary font-medium tracking-tight leading-none truncate">
            자산 진단 시뮬레이터
          </span>
          <span className="text-[9.5px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded shrink-0 leading-none whitespace-nowrap">
            AI 진단
          </span>
        </div>
        <div className="flex items-center justify-between gap-1.5 w-full min-w-0 mt-auto shrink-0">
          <span className="text-[12px] sm:text-[13px] font-bold text-primary leading-none tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
            우리집 적정 가치 & 매도 타이밍
          </span>
        </div>
      </button>
    </div>
  );
});

export default AptMetricCards;
