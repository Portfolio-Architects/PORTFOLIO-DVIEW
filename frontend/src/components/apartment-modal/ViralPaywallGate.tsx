import React from 'react';
import { MessageSquare, School, TrendingUp, BarChart3, MessageCircle, Sparkles } from 'lucide-react';

export interface ViralPaywallGateProps {
  shareCount?: number;
  onShare: () => void;
  onAlternativeUnlock?: () => void;
}

export const ViralPaywallGate = React.memo(function ViralPaywallGate({
  shareCount: _shareCount,
  onShare,
  onAlternativeUnlock,
}: ViralPaywallGateProps) {
  return (
    <div
      data-testid="viral-paywall-gate"
      className="flex flex-col items-center justify-center p-5 sm:p-6 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm max-w-md mx-auto my-6 relative z-20"
    >
      {/* 프리뷰 인디케이터 */}
      <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-3 mx-auto border border-emerald-200/50 dark:border-emerald-800/40">
        <Sparkles size={18} />
      </div>

      <h3 className="text-[15px] sm:text-[16px] font-bold text-slate-900 dark:text-slate-50 tracking-tight mb-1.5">
        단지 정밀 가치분석 인사이트
      </h3>

      <p className="text-[12px] sm:text-[12.5px] text-slate-600 dark:text-slate-400 leading-normal max-w-sm mb-4 break-keep font-medium mx-auto">
        실거래 빅데이터 기반 초품아 학군, 적정가 밸류에이션, 대기수요 지표를 요약 분석합니다.
      </p>

      {/* 가치 제안 프리뷰 카드 그리드 */}
      <div className="grid grid-cols-3 gap-2 w-full mb-5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
        <div className="flex flex-col items-center gap-1 py-2.5 px-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          <School size={16} className="text-emerald-600 dark:text-emerald-400 mb-0.5" />
          <span className="text-[11px] font-bold">초품아·학군</span>
          <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-normal">도보 통학 안전성</span>
        </div>
        <div className="flex flex-col items-center gap-1 py-2.5 px-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400 mb-0.5" />
          <span className="text-[11px] font-bold">적정 밸류</span>
          <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-normal">실거래 가격 밴드</span>
        </div>
        <div className="flex flex-col items-center gap-1 py-2.5 px-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          <BarChart3 size={16} className="text-emerald-600 dark:text-emerald-400 mb-0.5" />
          <span className="text-[11px] font-bold">대기수요</span>
          <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-normal">거래 회전율 지수</span>
        </div>
      </div>

      {/* 직관적 단일 액션 CTA */}
      <div className="flex flex-col gap-2 w-full">
        <button
          type="button"
          onClick={onShare}
          className="w-full bg-[#fee500] hover:bg-[#fee500]/90 text-[#191919] font-bold text-[13px] py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer border-none shadow-xs"
        >
          <MessageCircle size={16} />
          <span>카카오톡으로 공유하고 리포트 열람</span>
        </button>

        {onAlternativeUnlock && (
          <button
            type="button"
            onClick={onAlternativeUnlock}
            className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[12px] py-2.5 rounded-xl flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
          >
            <MessageSquare size={14} />
            <span>단지 거주후기 등록 후 바로 열람</span>
          </button>
        )}
      </div>
    </div>
  );
});

ViralPaywallGate.displayName = 'ViralPaywallGate';
export default ViralPaywallGate;

