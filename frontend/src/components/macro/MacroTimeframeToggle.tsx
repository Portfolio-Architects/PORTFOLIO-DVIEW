import React from 'react';

export type MacroTimeframe = '3M' | '1Y' | '3Y' | 'ALL';

export interface MacroTimeframeToggleProps {
  currentTimeframe: MacroTimeframe;
  onTimeframeChange: (timeframe: MacroTimeframe) => void;
  className?: string;
}

export interface TimeframeOption {
  readonly id: MacroTimeframe;
  readonly label: string;
  readonly description: string;
  readonly daysText: string;
}

export const MACRO_TIMEFRAME_OPTIONS: readonly TimeframeOption[] = [
  { id: '3M', label: '3M', description: '최근 90일', daysText: '최근 90일' },
  { id: '1Y', label: '1Y', description: '최근 365일', daysText: '최근 365일' },
  { id: '3Y', label: '3Y', description: '최근 3년', daysText: '최근 3년' },
  { id: 'ALL', label: 'ALL', description: '전체', daysText: '전체 기간' },
] as const;

export const MacroTimeframeToggle = React.memo(function MacroTimeframeToggle({
  currentTimeframe,
  onTimeframeChange,
  className = '',
}: MacroTimeframeToggleProps) {
  return (
    <div
      role="group"
      aria-label="시계열 분석 기간 선택"
      data-testid="macro-timeframe-toggle"
      className={`inline-flex items-center h-8 sm:h-9 min-h-[32px] sm:min-h-[36px] max-h-[32px] sm:max-h-[36px] p-0.5 sm:p-1 box-border shrink-0 select-none overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-border/50 shadow-inner ${className}`.trim()}
    >
      {MACRO_TIMEFRAME_OPTIONS.map((option) => {
        const isActive = currentTimeframe === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={isActive}
            aria-label={`${option.label} (${option.description})`}
            title={option.description}
            data-testid={`timeframe-btn-${option.id}`}
            data-active={isActive ? 'true' : 'false'}
            onClick={() => onTimeframeChange(option.id)}
            className={`h-7 sm:h-7 px-2.5 sm:px-3 text-[11px] sm:text-[12px] leading-none box-border flex items-center justify-center shrink-0 rounded-lg transition-colors duration-150 ease-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 ${
              isActive
                ? 'bg-surface text-primary shadow-xs font-black dark:bg-zinc-700 dark:text-white'
                : 'text-tertiary hover:text-secondary font-bold'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
});

MacroTimeframeToggle.displayName = 'MacroTimeframeToggle';

export default MacroTimeframeToggle;
