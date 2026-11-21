import React from 'react';
import { MessageSquare, School, TrendingUp, BarChart3, Share2 } from 'lucide-react';

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
      className="flex flex-col items-center justify-center p-5 sm:p-6 text-center bg-elevated rounded-2xl w-full relative z-20"
    >
      <h3 className="text-[15px] sm:text-[16px] font-bold text-primary tracking-tight mb-1">
        이 단지 핵심 요약 공유
      </h3>

      <p className="text-[12.5px] text-tertiary leading-normal max-w-md mb-4 break-keep font-medium mx-auto">
        초품아·학군, 적정 시세, 거래 흐름을 한눈에 정리해 가족·지인과 나눠 보세요.
      </p>

      {/* 요약 항목 그리드 */}
      <div className="grid grid-cols-3 gap-2 w-full mb-4 text-[11px] font-semibold text-secondary">
        <div className="flex flex-col items-center gap-1 py-2.5 px-2 bg-surface dark:bg-[#1e2532] rounded-xl">
          <School size={15} className="text-secondary mb-0.5" />
          <span className="text-[11.5px] font-bold text-primary">초품아·학군</span>
          <span className="text-[10.5px] text-tertiary font-medium">도보 통학 거리</span>
        </div>
        <div className="flex flex-col items-center gap-1 py-2.5 px-2 bg-surface dark:bg-[#1e2532] rounded-xl">
          <TrendingUp size={15} className="text-secondary mb-0.5" />
          <span className="text-[11.5px] font-bold text-primary">적정 시세</span>
          <span className="text-[10.5px] text-tertiary font-medium">실거래 가격 범위</span>
        </div>
        <div className="flex flex-col items-center gap-1 py-2.5 px-2 bg-surface dark:bg-[#1e2532] rounded-xl">
          <BarChart3 size={15} className="text-secondary mb-0.5" />
          <span className="text-[11.5px] font-bold text-primary">거래 흐름</span>
          <span className="text-[10.5px] text-tertiary font-medium">최근 회전율</span>
        </div>
      </div>

      {/* Live Spark Neutral Ink CTA */}
      <div className="flex flex-col sm:flex-row gap-2 w-full justify-center">
        <button
          type="button"
          onClick={onShare}
          className="flex-1 sm:flex-none sm:min-w-[200px] bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 font-bold text-[13px] py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-colors cursor-pointer border-none"
        >
          <Share2 size={15} />
          <span>카카오톡으로 요약 공유하기</span>
        </button>

        {onAlternativeUnlock && (
          <button
            type="button"
            onClick={onAlternativeUnlock}
            className="flex-1 sm:flex-none bg-transparent hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] text-secondary hover:text-primary font-semibold text-[12.5px] py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 active:scale-[0.98] transition-colors cursor-pointer border-none"
          >
            <MessageSquare size={14} />
            <span>단지 거주후기 남기기</span>
          </button>
        )}
      </div>
    </div>
  );
});

ViralPaywallGate.displayName = 'ViralPaywallGate';
export default ViralPaywallGate;

