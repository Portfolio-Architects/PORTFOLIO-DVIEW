import React from 'react';
import { Crown } from 'lucide-react';

interface ViralPaywallGateProps {
  shareCount: number;
  onShare: () => void;
}

export default function ViralPaywallGate({ shareCount, onShare }: ViralPaywallGateProps) {
  const percent = Math.min(100, (shareCount / 3) * 100);
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center bg-slate-900/95 dark:bg-slate-950/95 rounded-2xl border border-emerald-500/30 shadow-xl max-w-md mx-auto my-6 animate-in fade-in zoom-in-95 duration-300 relative z-20">
      <div className="w-11 h-11 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-3 animate-bounce">
        <Crown size={22} className="fill-emerald-400/20" />
      </div>
      <h3 className="text-[15px] font-black text-white tracking-tight mb-1.5 flex items-center gap-1.5">
        <span>🔒 프리미엄 단지 가치분석 잠김</span>
      </h3>
      <p className="text-[12px] text-slate-300 leading-normal max-w-sm mb-4 break-keep font-medium">
        카카오톡으로 D-VIEW의 아파트 평가 결과를 단 <strong>3번만 공유</strong>해주시면, 24시간 동안 이 단지의 모든 프리미엄 분석 리포트가 무료로 즉시 잠금 해제됩니다!
      </p>
      
      <div className="w-full bg-slate-800 rounded-full h-2 mb-2 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500" 
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-[11.5px] font-bold text-emerald-400 mb-4">
        현재 미션 완료도: {shareCount} / 3회 공유 완료
      </span>

      <button
        onClick={onShare}
        className="w-full bg-[#fee500] hover:bg-[#fee500]/90 text-[#191919] font-black text-[13px] py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer border-none shadow-md"
      >
        <span>💬 카카오톡으로 공유하고 해금하기</span>
      </button>
    </div>
  );
}
