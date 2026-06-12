import React from 'react';
import { Building, Crown, ChevronRight } from 'lucide-react';

interface ApartmentSpecsSectionProps {
  report: any;
  inline?: boolean;
  managerPost: any;
  parsedTitle: string;
  displayAptName: string;
  onClose: () => void;
}

export default function ApartmentSpecsSection({
  report,
  inline = false,
  managerPost,
  parsedTitle,
  displayAptName,
  onClose,
}: ApartmentSpecsSectionProps) {
  if (!report.metrics) return null;

  return (
    <section 
      id="sec-specs" 
      className={`${inline ? 'bg-surface' : 'bg-surface/60 dark:bg-surface/35 backdrop-blur-md'} rounded-3xl p-6 md:p-8 shadow-sm border border-border`}
    >
      <h2 className="text-title-lg font-bold text-primary flex items-center gap-2 mb-5 border-b border-border pb-3">
        <Building size={18} className="text-toss-blue"/> 단지 기본정보
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <div className="bg-body p-3.5 sm:p-4 rounded-xl border border-border">
          <p className="text-body-sm text-tertiary font-bold mb-1 whitespace-nowrap apt-spec-label">단지명 / 시공사</p>
          <p className="text-body-normal text-primary font-bold apt-spec-value break-keep">
            {displayAptName} {report.metrics.brand && <span className="block text-body-sm text-secondary font-medium mt-0.5 apt-spec-label">({report.metrics.brand})</span>}
          </p>
        </div>
        <div className="bg-body p-3.5 sm:p-4 rounded-xl border border-border">
          <p className="text-body-sm text-tertiary font-bold mb-1 whitespace-nowrap apt-spec-label">사용승인일 (연차)</p>
          <p className="text-body-normal text-primary font-bold apt-spec-value">
            {report.metrics.yearBuilt ? (() => {
              const ybStr = String(report.metrics.yearBuilt);
              const now = new Date();
              const currentYear = now.getFullYear();
              const currentMonth = now.getMonth() + 1;
              
              if (ybStr.length >= 6) {
                const year = parseInt(ybStr.substring(0, 4));
                const month = parseInt(ybStr.substring(4, 6));
                const elapsedMonths = (currentYear - year) * 12 + (currentMonth - month);
                
                let ageStr = '';
                if (elapsedMonths < 0) {
                  ageStr = '입주 전';
                } else if (elapsedMonths === 0) {
                  ageStr = '신축 1개월 미만';
                } else {
                  const y = Math.floor(elapsedMonths / 12);
                  const m = elapsedMonths % 12;
                  if (y > 0 && m > 0) ageStr = `${y}년 ${m}개월차`;
                  else if (y > 0) ageStr = `${y}년차`;
                  else ageStr = `${m}개월차`;
                }
                return <>{year}년 {month}월 <span className="block text-body-sm text-toss-blue font-medium mt-0.5 apt-spec-label">({ageStr})</span></>;
              }
              
              const year = parseInt(ybStr);
              const age = currentYear - year + 1;
              return <>{year}년 <span className="block text-body-sm text-toss-blue font-medium mt-0.5 apt-spec-label">({age}년차)</span></>;
            })() : '-'}
          </p>
        </div>
        <div className="bg-body p-3.5 sm:p-4 rounded-xl border border-border">
          <p className="text-body-sm text-tertiary font-bold mb-1 whitespace-nowrap apt-spec-label">규모 (세대/층)</p>
          <p className="text-body-normal text-primary font-bold apt-spec-value">
            {report.metrics.householdCount ? `${report.metrics.householdCount}세대` : '-'} <span className="block text-tertiary text-body-sm font-medium mt-0.5 apt-spec-label">/ {report.metrics.maxFloor ? `최고 ${report.metrics.maxFloor}층` : '-'}</span>
          </p>
        </div>
        <div className="bg-body p-3.5 sm:p-4 rounded-xl border border-border">
          <p className="text-body-sm text-tertiary font-bold mb-1 whitespace-nowrap apt-spec-label">용적률 / 건폐율</p>
          <p className="text-body-normal text-primary font-bold apt-spec-value">
            {report.metrics.far ? `${report.metrics.far}%` : '-'} <span className="block text-tertiary text-body-sm font-medium mt-0.5 apt-spec-label">/ {report.metrics.bcr ? `${report.metrics.bcr}%` : '-'}</span>
          </p>
        </div>
        <div className="bg-body p-3.5 sm:p-4 rounded-xl border border-border col-span-2 sm:col-span-1">
          <p className="text-body-sm text-tertiary font-bold mb-1 whitespace-nowrap apt-spec-label">주차대수 (세대당)</p>
          <p className="text-body-normal text-primary font-bold apt-spec-value">
            {report.metrics.parkingCount ? `${report.metrics.parkingCount}대` : '-'} <span className="block text-tertiary text-body-sm font-medium mt-0.5 apt-spec-label">/ {report.metrics.parkingPerHousehold ? `${report.metrics.parkingPerHousehold}대` : '-'}</span>
          </p>
        </div>
      </div>

      {/* Premium Scouting Report Banner for high visibility */}
      {report.premiumContent && (
        <div className="mt-6 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4 w-full sm:w-auto min-w-0">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Crown size={24} className="text-emerald-600 fill-emerald-600/30" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-extrabold text-primary leading-snug break-keep whitespace-normal sm:truncate mt-0.5">
                {managerPost?.title || parsedTitle || `${displayAptName} 매니저 임장기`}
              </h3>
              <p className="text-[12.5px] text-secondary mt-1 break-keep whitespace-normal sm:truncate">
                D-VIEW 매니저가 직접 현장에서 검증한 대장 단지의 가치 평가 리포트
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (managerPost?.id) {
                window.location.hash = `#post=${managerPost.id}`;
                onClose();
              } else {
                window.location.hash = '#lounge';
                onClose();
              }
            }}
            className="w-full sm:w-auto shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[13px] px-4.5 py-3 rounded-xl transition-all shadow-md shadow-emerald-500/10 active:scale-98 flex items-center justify-center gap-1 border-none cursor-pointer"
          >
            <span>임장기 보러가기</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </section>
  );
}
