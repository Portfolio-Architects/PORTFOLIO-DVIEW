import React from 'react';
import { Compass, Shield, Calculator, TrendingUp, ChevronRight } from 'lucide-react';

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
        className="text-left w-full flex flex-col justify-between h-full p-6 bg-gradient-to-br from-[#ea6100]/8 to-surface dark:from-[#ea6100]/4 border border-[#ea6100]/15 hover:border-[#ea6100]/40 rounded-[22px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] cursor-pointer hover:-translate-y-1 active:scale-[0.99] transition-all duration-300 group relative overflow-hidden outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500/50 focus:border-transparent"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#ea6100]/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-[#ea6100]/10 dark:bg-[#ea6100]/15 text-[#ff8f00] dark:text-[#ea6100] rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
              <Compass size={18} />
            </div>
            <span className="text-[10px] font-black bg-[#ffebed] text-[#ff4b5c] px-2.5 py-1 rounded-full tracking-wide uppercase shadow-sm">New 콘텐츠</span>
          </div>
          
          <div className="flex flex-col gap-2 mt-2">
            <h3 className="text-[15.5px] font-black text-primary tracking-tight leading-snug">
              나만의 동탄 안심 정착 단지 찾기 Quiz
            </h3>
            <p className="text-[12.5px] text-secondary font-semibold leading-relaxed break-keep">
              5가지 초간단 질문으로 당신의 예산, 보육 여건(늘봄학교), 자녀 학군(초품아), 교통 인프라에 가장 잘 부합하는 최적의 정주 단지 3곳을 AI 매칭으로 진단해보세요!
            </p>
          </div>
        </div>

        <div className="mt-6 relative z-10 w-full">
          <div className="w-full py-3 bg-slate-900 dark:bg-slate-800 hover:bg-[#ea6100] dark:hover:bg-[#ea6100] text-white text-[12.5px] font-black rounded-xl shadow-sm transition-all duration-300 flex items-center justify-center gap-1.5 border-none">
            <span>지금 추천 받기</span>
            <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </button>

      {/* Card 2: Jeonse Safety */}
      {onOpenJeonseSafety && (
        <button 
          type="button"
          onClick={() => onOpenJeonseSafety()}
          aria-label="전세금 반환 안전진단 및 역전세 계산기 상세 보기"
          className="text-left w-full flex flex-col justify-between h-full p-6 bg-gradient-to-br from-emerald-500/8 to-surface dark:from-emerald-500/4 border border-emerald-500/15 hover:border-emerald-500/40 rounded-[22px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] cursor-pointer hover:-translate-y-1 active:scale-[0.99] transition-all duration-300 group relative overflow-hidden outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500/50 focus:border-transparent"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <Shield size={18} />
              </div>
              <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 px-2.5 py-1 rounded-full tracking-wide uppercase shadow-sm">D-VIEW 안전</span>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <h3 className="text-[15.5px] font-black text-primary tracking-tight leading-snug">
                전세금 반환 안전진단 & 역전세 계산기
              </h3>
              <p className="text-[12.5px] text-secondary font-semibold leading-relaxed break-keep">
                임차(예정) 중인 단지의 보증금과 시세 변동 추이를 연동 분석하여 계약 만기 시 보증금 미반환(역전세) 리스크 및 대항력 확보 여부를 안전도 4단계로 진단합니다.
              </p>
            </div>
          </div>

          <div className="mt-6 relative z-10 w-full">
            <div className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[12.5px] font-black rounded-xl shadow-sm transition-all duration-300 flex items-center justify-center gap-1.5 border-none">
              <span>보증금 진단하기</span>
              <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
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
          className="text-left w-full flex flex-col justify-between h-full p-6 bg-gradient-to-br from-emerald-500/8 to-surface dark:from-emerald-500/4 border border-emerald-500/15 hover:border-emerald-500/40 rounded-[22px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] cursor-pointer hover:-translate-y-1 active:scale-[0.99] transition-all duration-300 group relative overflow-hidden outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500/50 focus:border-transparent"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <Calculator size={18} />
              </div>
              <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 px-2.5 py-1 rounded-full tracking-wide uppercase shadow-sm">D-VIEW 금융</span>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <h3 className="text-[15.5px] font-black text-primary tracking-tight leading-snug">
                내집마련 정책자금 대출 계산기
              </h3>
              <p className="text-[12.5px] text-secondary font-semibold leading-relaxed break-keep">
                가구 소득, 순자산, 자녀 수에 따라 신생아 특례대출, 디딤돌, 보금자리론 등 최적의 정부 저금리 정책 금융 지원 자격을 진단하고 월 원리금 상환 계획을 시뮬레이션합니다.
              </p>
            </div>
          </div>

          <div className="mt-6 relative z-10 w-full">
            <div className="w-full py-3 bg-[#c44d00] hover:bg-[#00a37b] text-white text-[12.5px] font-black rounded-xl shadow-sm transition-all duration-300 flex items-center justify-center gap-1.5 border-none">
              <span>대출 한도 조회</span>
              <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
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
          className="text-left w-full flex flex-col justify-between h-full p-6 bg-gradient-to-br from-rose-500/8 to-surface dark:from-rose-500/4 border border-rose-500/15 hover:border-rose-500/40 rounded-[22px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] cursor-pointer hover:-translate-y-1 active:scale-[0.99] transition-all duration-300 group relative overflow-hidden outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500/50 focus:border-transparent"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-rose-500/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <TrendingUp size={18} />
              </div>
              <span className="text-[10px] font-black bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 px-2.5 py-1 rounded-full tracking-wide uppercase shadow-sm">D-VIEW 자산</span>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <h3 className="text-[15.5px] font-black text-primary tracking-tight leading-snug">
                우리집 적정 가치 & 주거 자산 안정성 진단
              </h3>
              <p className="text-[12.5px] text-secondary font-semibold leading-relaxed break-keep">
                단지별 시세 추이, 매매-전세 차액(안전마진), 거래 회전율을 종합 분석하여 실수요자 관점의 적정 가치를 진단하고 주거 자산의 장기적 재정 안정성을 평가합니다.
              </p>
            </div>
          </div>

          <div className="mt-6 relative z-10 w-full">
            <div className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white text-[12.5px] font-black rounded-xl shadow-sm transition-all duration-300 flex items-center justify-center gap-1.5 border-none">
              <span>자산 안정성 진단</span>
              <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </button>
      )}
    </div>
  );
});
