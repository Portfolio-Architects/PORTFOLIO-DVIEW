import React from 'react';
import { Crown, MessageSquare } from 'lucide-react';

interface ViralPaywallGateProps {
  shareCount: number;
  onShare: () => void;
  onAlternativeUnlock?: () => void;
}

export default function ViralPaywallGate({ shareCount, onShare, onAlternativeUnlock }: ViralPaywallGateProps) {
  const percent = Math.min(100, (shareCount / 3) * 100);
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center bg-[#191f28]/95 dark:bg-zinc-950/95 rounded-2xl border border-emerald-500/40 shadow-xl max-w-md mx-auto my-6 animate-in fade-in zoom-in-95 duration-300 relative z-20">
      <div className="w-11 h-11 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-3 animate-bounce">
        <Crown size={22} className="fill-emerald-400/20" />
      </div>
      <h3 className="text-[15px] font-black text-white tracking-tight mb-1.5 flex items-center gap-1.5">
        <span>🔒 프리미엄 단지 가치분석 잠김</span>
      </h3>
      <p className="text-[12px] text-zinc-300 leading-normal max-w-sm mb-4 break-keep font-medium">
        카카오톡으로 D-VIEW의 아파트 평가 결과를 단 <strong>3번만 공유</strong>해주시거나, 단지 <strong>거주후기(한줄평)를 남겨주시면</strong> 24시간 동안 모든 프리미엄 분석 리포트가 무료로 즉시 잠금 해제됩니다!
      </p>
      
      <div className="w-full bg-zinc-800 rounded-full h-2 mb-2 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500" 
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between w-full text-[11px] font-bold text-emerald-400 mb-4 px-1">
        <span>공유 미션 진행도</span>
        <span>{shareCount} / 3회 공유</span>
      </div>

      <div className="flex flex-col gap-2.5 w-full">
        <button
          onClick={onShare}
          className="w-full bg-[#fee500] hover:bg-[#fee500]/90 text-[#191919] font-black text-[13px] py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer border-none shadow-md"
        >
          <span>💬 카카오톡으로 공유하고 해금</span>
        </button>

        {onAlternativeUnlock && (
          <button
            onClick={onAlternativeUnlock}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[13px] py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer border-none shadow-md shadow-emerald-900/10"
          >
            <MessageSquare size={15} />
            <span>✍️ 거주후기 한 줄 쓰고 즉시 해금</span>
          </button>
        )}
      </div>
    </div>
  );
}
