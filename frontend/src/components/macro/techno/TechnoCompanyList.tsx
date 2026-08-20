import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface SectorData {
  name: string;
  value: number;
  color: string;
  count: number;
  companies: string[];
}

export interface TechnoCompanyListProps {
  sectors: SectorData[];
  expandedSectors: Record<string, boolean>;
  onToggleSector: (name: string) => void;
  visibleCounts: Record<string, number>;
  onLoadMore: (name: string) => void;
}

export const TechnoCompanyList = React.memo(function TechnoCompanyList({
  sectors,
  expandedSectors,
  onToggleSector,
  visibleCounts,
  onLoadMore,
}: TechnoCompanyListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[16px] font-black text-primary">
          동탄 테크노밸리 주요 입주기업 디렉토리
        </h3>
        <span className="text-[12px] font-bold text-tertiary">
          업종별 분류 검색
        </span>
      </div>

      <div className="space-y-3">
        {sectors.map((sector) => {
          const isExpanded = !!expandedSectors[sector.name];
          const count = visibleCounts[sector.name] || 12;
          const displayedCompanies = sector.companies.slice(0, count);
          const hasMore = count < sector.companies.length;

          return (
            <div
              key={sector.name}
              className="rounded-2xl bg-surface border border-border/40 overflow-hidden shadow-sm"
            >
              <button
                onClick={() => onToggleSector(sector.name)}
                className="w-full p-4 sm:p-5 flex items-center justify-between bg-surface hover:bg-body/50 transition-colors text-left cursor-pointer border-none"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: sector.color }}
                  />
                  <div>
                    <span className="text-[14px] sm:text-[15px] font-black text-primary block">
                      {sector.name}
                    </span>
                    <span className="text-[11px] font-bold text-tertiary">
                      {sector.companies.length}개 대표 입주 기업 수록 ({sector.value}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronUp size={18} className="text-secondary" />
                  ) : (
                    <ChevronDown size={18} className="text-secondary" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="p-4 sm:p-5 pt-0 border-t border-border/20 space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {displayedCompanies.map((co, idx) => {
                      const [cName, cAddr] = co.split(' - ');
                      const initial = cName ? cName.charAt(0) : '';
                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-body/60 border border-border/30 hover:border-primary/30 transition-all flex items-center gap-3 min-w-0"
                        >
                          <div
                            className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[12px] font-black text-white shadow-xs"
                            style={{ backgroundColor: sector.color }}
                          >
                            {initial}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[12.5px] font-black text-primary truncate">
                              {cName}
                            </span>
                            {cAddr && (
                              <span className="text-[10px] text-tertiary truncate">
                                {cAddr}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {hasMore && (
                    <div className="flex justify-center pt-2">
                      <button
                        onClick={() => onLoadMore(sector.name)}
                        className="px-4 py-2 rounded-xl bg-body text-[12px] font-bold text-secondary hover:text-primary hover:bg-neutral-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        기업 더보기 (+12)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
