import React from 'react';
import { ChevronDown } from 'lucide-react';
import SegmentedControl from '@/components/ui/SegmentedControl';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { getControlSelectClass } from '@/lib/design-system/controls';
import type { AptTxSummary, TransactionRecord } from '@/types';

export interface ApartmentModalTransactionsTableProps {
  inline?: boolean;
  isAnimationFinished: boolean;
  isTxLoading?: boolean;
  filteredTransactions: TransactionRecord[];
  typeMap: Record<string, Record<string, { typeM2: string; typePyeong: string }>>;
  chartType: 'sale' | 'jeonse';
  setChartType: (type: 'sale' | 'jeonse') => void;
  normalizeAptName: (name: string) => string;
  displayAptName: string;
  dong: string;
  apartmentName: string;
  txSummary?: AptTxSummary;
  filterOutliers: boolean;
  handleToggleFilter: () => void;
  areaFilterChips: string[];
  selectedAreaFilter: string;
  setSelectedAreaFilter: (val: string) => void;
  loadAllTransactions?: () => void;
  renderTransactionTable: () => React.ReactNode;
  renderTransactionChart: () => React.ReactNode;
  renderTransactionSummaryMetrics?: () => React.ReactNode;
}

export const ApartmentModalTransactionsTable = React.memo(function ApartmentModalTransactionsTable({
  inline,
  isAnimationFinished,
  isTxLoading,
  filteredTransactions,
  filterOutliers,
  handleToggleFilter,
  areaFilterChips,
  selectedAreaFilter,
  setSelectedAreaFilter,
  loadAllTransactions,
  chartType,
  setChartType,
  renderTransactionTable,
  renderTransactionChart,
  renderTransactionSummaryMetrics,
}: ApartmentModalTransactionsTableProps) {
  const showChartLoadingSkeleton = Boolean(isTxLoading && filteredTransactions.length === 0);

  return (
    <>
      {/* Hero Section — Layout: Global Filter Bar + (Inline: 35% table / 65% chart | Inspector: Full-width stacked Chart + Table) */}
      <section
        className={`w-full flex flex-col py-4 md:py-5 bg-surface border-b border-border shrink-0 ${
          inline ? 'md:h-[700px]' : ''
        }`}
      >
        {/* Global Real Transaction Filter Bar (Zero-CLS Fixed Coordinates on Mobile & Desktop) */}
        {isAnimationFinished && (
          <div className="w-full flex flex-wrap items-center gap-x-2.5 gap-y-2.5 pb-4 mb-4 border-b border-border/50 shrink-0">
            {/* 1. Deal Type Toggle — pinned top-left on both mobile & desktop */}
            <div className="order-1 shrink-0">
              <SegmentedControl
                options={[
                  { label: '매매', value: 'sale' },
                  { label: '전월세', value: 'jeonse' }
                ]}
                value={chartType}
                onChange={(val) => { setChartType(val as 'sale' | 'jeonse'); loadAllTransactions?.(); }}
              />
            </div>

            {/* 2. Outliers Filter Switch — pinned top-right on both mobile (Row 1) & desktop */}
            <div className="order-2 sm:order-3 ml-auto flex items-center gap-2 bg-elevated h-[34px] sm:h-[36px] px-3.5 rounded-[10px] shrink-0">
              <span className="text-[12.5px] font-extrabold text-secondary tracking-tight select-none">이상거래 필터</span>
              <button
                onClick={handleToggleFilter}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                  filterOutliers ? 'bg-blue-600 dark:bg-blue-500' : 'bg-secondary/20'
                }`}
                role="switch"
                aria-checked={filterOutliers}
                aria-label="이상거래 필터 활성화"
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    filterOutliers ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 3. Area Type Filter — Row 2 on mobile (reserved h-[34px]), inline middle on desktop (reserved h-[36px]) */}
            <div className="order-3 sm:order-2 w-full sm:w-auto h-[34px] sm:h-[36px] flex items-center overflow-x-auto no-scrollbar shrink-0">
              {areaFilterChips.length > 0 ? (
                areaFilterChips.length > 5 ? (
                  <div key="area-filter-select" className="relative shrink-0">
                    <select
                      value={selectedAreaFilter}
                      onChange={(e) => { setSelectedAreaFilter(e.target.value); loadAllTransactions?.(); }}
                      className={getControlSelectClass('appearance-none pl-3.5 pr-8 disabled:opacity-60 disabled:cursor-not-allowed')}
                      aria-label="평형 타입 필터 선택"
                      disabled={areaFilterChips.length === 1 && areaFilterChips[0] === '전체'}
                    >
                      {areaFilterChips.map(chip => (
                        <option key={chip} value={chip} className="font-medium text-secondary">
                          {chip === '전체' ? '타입: 전체' : `타입: ${chip}`}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-secondary">
                      <ChevronDown size={14} strokeWidth={2.5} />
                    </div>
                  </div>
                ) : (
                  <SegmentedControl
                    key="area-filter-segmented"
                    options={areaFilterChips.map(chip => ({ label: chip, value: chip }))}
                    value={selectedAreaFilter}
                    onChange={(val) => { setSelectedAreaFilter(val); loadAllTransactions?.(); }}
                    className="max-w-full shrink-0"
                    disabled={areaFilterChips.length === 1 && areaFilterChips[0] === '전체'}
                  />
                )
              ) : isTxLoading ? (
                <div
                  key="area-filter-skeleton"
                  aria-hidden="true"
                  className="h-[34px] sm:h-[36px] w-44 rounded-[10px] bg-slate-100 dark:bg-slate-800/60 animate-pulse shrink-0"
                />
              ) : null}
            </div>
          </div>
        )}

        {/* Main Data Area: Inline (35% Table & 65% Chart) vs Inspector (Full-width Stacked Chart & Table) */}
        <div
          className={`w-full flex flex-col-reverse ${
            inline ? 'md:flex-row gap-4 md:gap-8 flex-1 min-h-0' : 'gap-5'
          }`}
        >
          {/* Transaction Table */}
          <div
            className={
              inline
                ? 'w-full md:w-[35%] shrink-0 flex flex-col self-start md:self-stretch min-h-[320px] md:h-full'
                : 'w-full shrink-0 flex flex-col min-h-[320px] h-[360px] md:h-[380px]'
            }
          >
            {renderTransactionTable()}
          </div>

          {/* Transaction Chart */}
          <div
            className={
              inline
                ? 'w-full md:w-[65%] flex flex-col min-h-[580px] md:min-h-0 md:h-full md:self-stretch'
                : 'w-full flex flex-col min-h-[340px] h-[360px] md:h-[400px]'
            }
          >
            {showChartLoadingSkeleton ? (
              <div
                key="tx-chart-loading"
                aria-hidden="true"
                className="w-full flex-1 min-h-[580px] md:min-h-0 md:h-full rounded-2xl border border-border/40 animate-shimmer flex items-center justify-center"
              >
                <span className="text-tertiary text-[12px] font-bold">실거래 시세 차트 불러오는 중...</span>
              </div>
            ) : (
              <ErrorBoundary key="tx-chart-ready" name="실거래 차트">
                {renderTransactionChart()}
              </ErrorBoundary>
            )}
          </div>
        </div>
      </section>

      {/* Summary Metrics Section (only when caller supplies renderTransactionSummaryMetrics) */}
      {renderTransactionSummaryMetrics && (
        !isAnimationFinished || isTxLoading ? (
          <div className="w-full h-[460px] md:h-[386px] rounded-[20px] border border-border/40 animate-shimmer mt-4" />
        ) : (
          renderTransactionSummaryMetrics()
        )
      )}
    </>
  );
});
