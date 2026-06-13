import React from 'react';
import { Crown, MessageSquare, School, TrendingUp, BarChart3 } from 'lucide-react';

interface ViralPaywallGateProps {
  shareCount: number;
  onShare: () => void;
  onAlternativeUnlock?: () => void;
}

export default function ViralPaywallGate({ shareCount, onShare, onAlternativeUnlock }: ViralPaywallGateProps) {
  const percent = Math.min(100, (shareCount / 3) * 100);

  // 공유 횟수에 따른 동적 응원 메시지
  const getMotivationalMessage = () => {
    if (shareCount === 0) return "단 3번의 카카오 공유로 모든 리포트 해금! 🔓";
    if (shareCount === 1) return "좋아요! 첫 공유 완료, 2번 더 남았습니다 🚀";
    if (shareCount === 2) return "마지막 딱 1번만 더 공유하면 해금됩니다! ⚡";
    return "축하합니다! 해금 조건이 완료되었습니다 🎉";
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center bg-[#191f28]/95 dark:bg-zinc-950/95 rounded-2xl border border-emerald-500/40 shadow-xl max-w-md mx-auto my-6 animate-in fade-in zoom-in-95 duration-300 relative z-20">
      
      {/* 왕관 뱃지 */}
      <div className="w-11 h-11 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-3 animate-bounce">
        <Crown size={22} className="fill-emerald-400/20" />
      </div>

      <h3 className="text-[15px] font-black text-white tracking-tight mb-2 flex items-center gap-1.5">
        <span>🔒 프리미엄 단지 가치분석 잠김</span>
      </h3>

      <p className="text-[12.5px] text-zinc-300 leading-normal max-w-sm mb-4 break-keep font-semibold">
        D-VIEW의 분석 결과를 카카오톡으로 <strong>3회 공유</strong>해주시거나, 단지 <strong>거주후기를 남겨주시면</strong> 24시간 동안 모든 프리미엄 리포트를 무료로 보실 수 있습니다.
      </p>

      {/* 해금 시 열람 가능한 혜택 요약 뱃지 그리드 (게이미피케이션 가치 제안) */}
      <div className="grid grid-cols-3 gap-2 w-full mb-5 text-[11px] font-extrabold text-slate-300">
        <div className="flex flex-col items-center gap-1.5 py-2.5 px-1 bg-white/5 dark:bg-zinc-900/50 rounded-xl border border-white/10">
          <School size={15} className="text-emerald-400" />
          <span>초품아·학군 입지</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 py-2.5 px-1 bg-white/5 dark:bg-zinc-900/50 rounded-xl border border-white/10">
          <TrendingUp size={15} className="text-emerald-400" />
          <span>적정가 밸류에이션</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 py-2.5 px-1 bg-white/5 dark:bg-zinc-900/50 rounded-xl border border-white/10">
          <BarChart3 size={15} className="text-emerald-400" />
          <span>대기수요 스코어</span>
        </div>
      </div>

      {/* 응원 메시지 */}
      <div className="text-[11.5px] font-bold text-emerald-300 mb-1.5 w-full text-left px-1">
        {getMotivationalMessage()}
      </div>
      
      {/* 프로그레스 바 */}
      <div className="w-full bg-zinc-800 rounded-full h-2 mb-1.5 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500" 
          style={{ width: `${percent}%` }}
        />
      </div>
      
      <div className="flex justify-between w-full text-[11px] font-bold text-zinc-400 mb-4 px-1">
        <span>공유 진행도</span>
        <span className="text-emerald-400">{shareCount} / 3회</span>
      </div>

      <div className="flex flex-col gap-2.5 w-full">
        <button
          onClick={onShare}
          className="w-full bg-[#fee500] hover:bg-[#fee500]/90 text-[#191919] font-black text-[13px] py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer border-none shadow-md"
        >
          <span>💬 카카오톡으로 공유하고 해금</span>
        </button>

        {onAlternativeUnlock && (
          <div className="relative w-full">
            {/* 10초 완료 추천 배지 */}
            <div className="absolute -top-2.5 right-3 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full z-10 shadow-sm animate-pulse">
              10초 완료 추천!
            </div>
            <button
              onClick={onAlternativeUnlock}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[13px] py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer border-none shadow-md shadow-emerald-900/10"
            >
              <MessageSquare size={15} />
              <span>✍️ 거주후기 한 줄 쓰고 즉시 해금</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
