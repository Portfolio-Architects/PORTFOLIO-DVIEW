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
  renderTransactionSummaryMetrics: () => React.ReactNode;
}

export const ApartmentModalTransactionsTable = React.memo(function ApartmentModalTransactionsTable({
  inline,
  isAnimationFinished,
  isTxLoading,
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
  return (
    <>
      {/* Hero Section — Layout: Global Filter Bar + (35% table / 65% chart) */}
      <section className="w-full flex flex-col py-4 md:py-6 bg-surface border-b border-border shrink-0 md:h-[700px]">
        {/* Global Real Transaction Filter Bar */}
        {isAnimationFinished && (
          <div className="w-full flex flex-wrap items-center justify-between gap-4 pb-4.5 mb-4.5 border-b border-border/50 shrink-0">
            <div className="flex flex-wrap items-center gap-3">
              {/* Area Type Filter */}
              {areaFilterChips.length > 0 && (
                areaFilterChips.length > 5 ? (
                  <div className="relative shrink-0">
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
                    options={areaFilterChips.map(chip => ({ label: chip, value: chip }))}
                    value={selectedAreaFilter}
                    onChange={(val) => { setSelectedAreaFilter(val); loadAllTransactions?.(); }}
                    className="max-w-full"
                    disabled={areaFilterChips.length === 1 && areaFilterChips[0] === '전체'}
                  />
                )
              )}

              {/* Deal Type Toggle */}
              <SegmentedControl
                options={[
                  { label: '매매', value: 'sale' },
                  { label: '전월세', value: 'jeonse' }
                ]}
                value={chartType}
                onChange={(val) => { setChartType(val as 'sale' | 'jeonse'); loadAllTransactions?.(); }}
              />
            </div>

            {/* Outliers Filter Switch */}
            <div className="flex items-center gap-2 bg-elevated h-[34px] sm:h-[36px] px-3.5 rounded-[10px] shrink-0">
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
          </div>
        )}

        {/* Main Data Area: Table (35%) & Chart (65%) */}
        <div className="w-full flex flex-col-reverse md:flex-row gap-4 md:gap-8 flex-1 min-h-0">
          {/* Left: Transaction Table (35%) */}
          <div className="w-full md:w-[35%] shrink-0 flex flex-col self-start md:self-stretch min-h-[320px] md:h-full">
            {renderTransactionTable()}
          </div>

          {/* Right: Transaction Chart (65%) */}
          <div className="w-full md:w-[65%] flex flex-col min-h-[320px] md:h-full md:self-stretch">
            <ErrorBoundary name="실거래 차트">
              {renderTransactionChart()}
            </ErrorBoundary>
          </div>
        </div>
      </section>

      {/* Summary Metrics Section */}
      {!isAnimationFinished || isTxLoading ? (
        <div className="w-full h-[460px] md:h-[386px] rounded-[20px] border border-border/40 animate-shimmer mt-4" />
      ) : (
        renderTransactionSummaryMetrics()
      )}
    </>
  );
});
