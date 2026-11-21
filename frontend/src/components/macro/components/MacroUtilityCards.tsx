import React from 'react';

export interface MacroUtilityCardsProps {
  setIsQuizOpen: (open: boolean) => void;
  onOpenJeonseSafety?: (aptName?: string) => void;
  onOpenMortgage?: (aptName?: string) => void;
  onOpenSellTimingCalculator?: (aptName?: string) => void;
}

export const MacroUtilityCards = React.memo(function MacroUtilityCards({
  setIsQuizOpen,
  onOpenJeonseSafety,
  onOpenMortgage,
  onOpenSellTimingCalculator,
}: MacroUtilityCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6 w-full">
      {/* Card 1: AI Quiz */}
      <button 
        type="button"
        onClick={() => setIsQuizOpen(true)}
        aria-label="나만의 동탄 안심 정착 단지 찾기 Quiz 상세 보기"
        className="text-left w-full flex flex-col justify-between h-full p-6 bg-[#f7f8fa] hover:bg-[#eff1f5] dark:bg-[#151a23] dark:hover:bg-[#1e2532] border border-transparent hover:border-slate-200 dark:hover:border-slate-700/80 rounded-[22px] cursor-pointer hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 group relative overflow-hidden outline-none focus:ring-2 focus:ring-inset focus:ring-slate-400/50"
      >
        <div className="relative z-10 flex flex-col gap-2">
          <h3 className="text-[15.5px] font-black text-primary tracking-tight leading-snug">
            나만의 동탄 안심 정착 단지 찾기 Quiz
          </h3>
          <p className="text-[12.5px] text-secondary font-semibold leading-relaxed break-keep">
            5가지 초간단 질문으로 당신의 예산, 보육 여건(늘봄학교), 자녀 학군(초품아), 교통 인프라에 가장 잘 부합하는 최적의 정주 단지 3곳을 AI 매칭으로 진단해보세요!
          </p>
        </div>

        <div className="mt-6 relative z-10 w-full">
          <div className="w-full py-3 bg-slate-900 dark:bg-white group-hover:bg-slate-800 dark:group-hover:bg-slate-100 text-white dark:text-slate-900 text-[12.5px] font-black rounded-xl transition-colors duration-200 flex items-center justify-center border-none">
            <span>지금 추천 받기</span>
          </div>
        </div>
      </button>

      {/* Card 2: Jeonse Safety */}
      {onOpenJeonseSafety && (
        <button 
          type="button"
          onClick={() => onOpenJeonseSafety()}
          aria-label="전세금 반환 안전진단 및 역전세 계산기 상세 보기"
          className="text-left w-full flex flex-col justify-between h-full p-6 bg-[#f7f8fa] hover:bg-[#eff1f5] dark:bg-[#151a23] dark:hover:bg-[#1e2532] border border-transparent hover:border-slate-200 dark:hover:border-slate-700/80 rounded-[22px] cursor-pointer hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 group relative overflow-hidden outline-none focus:ring-2 focus:ring-inset focus:ring-slate-400/50"
        >
          <div className="relative z-10 flex flex-col gap-2">
            <h3 className="text-[15.5px] font-black text-primary tracking-tight leading-snug">
              전세금 반환 안전진단 & 역전세 계산기
            </h3>
            <p className="text-[12.5px] text-secondary font-semibold leading-relaxed break-keep">
              임차(예정) 중인 단지의 보증금과 시세 변동 추이를 연동 분석하여 계약 만기 시 보증금 미반환(역전세) 리스크 및 대항력 확보 여부를 안전도 4단계로 진단합니다.
            </p>
          </div>

          <div className="mt-6 relative z-10 w-full">
            <div className="w-full py-3 bg-slate-900 dark:bg-white group-hover:bg-slate-800 dark:group-hover:bg-slate-100 text-white dark:text-slate-900 text-[12.5px] font-black rounded-xl transition-colors duration-200 flex items-center justify-center border-none">
              <span>보증금 진단하기</span>
            </div>
          </div>
        </button>
      )}

      {/* Card 3: Mortgage Calculator */}
      {onOpenMortgage && (
        <button 
          type="button"
          onClick={() => onOpenMortgage()}
          aria-label="내집마련 정책자금 대출 계산기 상세 보기"
          className="text-left w-full flex flex-col justify-between h-full p-6 bg-[#f7f8fa] hover:bg-[#eff1f5] dark:bg-[#151a23] dark:hover:bg-[#1e2532] border border-transparent hover:border-slate-200 dark:hover:border-slate-700/80 rounded-[22px] cursor-pointer hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 group relative overflow-hidden outline-none focus:ring-2 focus:ring-inset focus:ring-slate-400/50"
        >
          <div className="relative z-10 flex flex-col gap-2">
            <h3 className="text-[15.5px] font-black text-primary tracking-tight leading-snug">
              내집마련 정책자금 대출 계산기
            </h3>
            <p className="text-[12.5px] text-secondary font-semibold leading-relaxed break-keep">
              가구 소득, 순자산, 자녀 수에 따라 신생아 특례대출, 디딤돌, 보금자리론 등 최적의 정부 저금리 정책 금융 지원 자격을 진단하고 월 원리금 상환 계획을 시뮬레이션합니다.
            </p>
          </div>

          <div className="mt-6 relative z-10 w-full">
            <div className="w-full py-3 bg-slate-900 dark:bg-white group-hover:bg-slate-800 dark:group-hover:bg-slate-100 text-white dark:text-slate-900 text-[12.5px] font-black rounded-xl transition-colors duration-200 flex items-center justify-center border-none">
              <span>대출 한도 조회</span>
            </div>
          </div>
        </button>
      )}

      {/* Card 4: AI Sell Timing & Tax Diagnosis */}
      {onOpenSellTimingCalculator && (
        <button 
          type="button"
          onClick={() => onOpenSellTimingCalculator()}
          aria-label="우리집 적정 가치 및 주거 자산 안정성 진단 상세 보기"
          className="text-left w-full flex flex-col justify-between h-full p-6 bg-[#f7f8fa] hover:bg-[#eff1f5] dark:bg-[#151a23] dark:hover:bg-[#1e2532] border border-transparent hover:border-slate-200 dark:hover:border-slate-700/80 rounded-[22px] cursor-pointer hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 group relative overflow-hidden outline-none focus:ring-2 focus:ring-inset focus:ring-slate-400/50"
        >
          <div className="relative z-10 flex flex-col gap-2">
            <h3 className="text-[15.5px] font-black text-primary tracking-tight leading-snug">
              우리집 적정 가치 & 주거 자산 안정성 진단
            </h3>
            <p className="text-[12.5px] text-secondary font-semibold leading-relaxed break-keep">
              단지별 시세 추이, 매매-전세 차액(안전마진), 거래 회전율을 종합 분석하여 실수요자 관점의 적정 가치를 진단하고 주거 자산의 장기적 재정 안정성을 평가합니다.
            </p>
          </div>

          <div className="mt-6 relative z-10 w-full">
            <div className="w-full py-3 bg-slate-900 dark:bg-white group-hover:bg-slate-800 dark:group-hover:bg-slate-100 text-white dark:text-slate-900 text-[12.5px] font-black rounded-xl transition-colors duration-200 flex items-center justify-center border-none">
              <span>자산 안정성 진단</span>
            </div>
          </div>
        </button>
      )}
    </div>
  );
});
