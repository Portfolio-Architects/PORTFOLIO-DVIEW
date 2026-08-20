import React from 'react';
import { Building2, Percent, Coins, Users } from 'lucide-react';

export interface TechnoMetricCardsProps {
  totalCompanies?: number;
  avgVacancy?: number;
  avgRent?: number;
  totalWorkers?: number;
}

export const TechnoMetricCards = React.memo(function TechnoMetricCards({
  totalCompanies = 1931,
  avgVacancy = 18.2,
  avgRent = 3.15,
  totalWorkers = 45000,
}: TechnoMetricCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {/* Metric 1: Total Companies */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border/40 shadow-sm flex flex-col justify-between gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] sm:text-[13px] font-extrabold text-tertiary">입주 기업수</span>
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Building2 size={16} />
          </div>
        </div>
        <div>
          <div className="text-[20px] sm:text-[24px] font-black text-primary tracking-tight">
            {totalCompanies.toLocaleString()}개사
          </div>
          <p className="text-[11px] font-bold text-secondary mt-0.5">반도체/IT/바이오 집적</p>
        </div>
      </div>

      {/* Metric 2: Vacancy Rate */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border/40 shadow-sm flex flex-col justify-between gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] sm:text-[13px] font-extrabold text-tertiary">평균 공실률</span>
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Percent size={16} />
          </div>
        </div>
        <div>
          <div className="text-[20px] sm:text-[24px] font-black text-primary tracking-tight">
            {avgVacancy.toFixed(1)}%
          </div>
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">전기 대비 -1.4%p 하락세</p>
        </div>
      </div>

      {/* Metric 3: Average Rent */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border/40 shadow-sm flex flex-col justify-between gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] sm:text-[13px] font-extrabold text-tertiary">평균 평당 임대료</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Coins size={16} />
          </div>
        </div>
        <div>
          <div className="text-[20px] sm:text-[24px] font-black text-primary tracking-tight">
            {avgRent.toFixed(2)}만원
          </div>
          <p className="text-[11px] font-bold text-secondary mt-0.5">전용 평당 환산 기준</p>
        </div>
      </div>

      {/* Metric 4: Estimated Workers */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border/40 shadow-sm flex flex-col justify-between gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] sm:text-[13px] font-extrabold text-tertiary">추정 근무자수</span>
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Users size={16} />
          </div>
        </div>
        <div>
          <div className="text-[20px] sm:text-[24px] font-black text-primary tracking-tight">
            약 {(totalWorkers / 10000).toFixed(1)}만명
          </div>
          <p className="text-[11px] font-bold text-secondary mt-0.5">배후 주거수요 창출원</p>
        </div>
      </div>
    </div>
  );
});
