import React from 'react';
import { Sparkles, Award, Share2 } from 'lucide-react';
import { DongApartment } from '@/lib/dong-apartments';
import { shareCompareToKakao } from '@/lib/utils/kakaoShare';

export interface CompareInsightCardProps {
  apt1: DongApartment | null;
  apt2: DongApartment | null;
  apt1Label: string;
  apt2Label: string;
  score: { apt1: number; apt2: number };
  showToast: (msg: string) => void;
  handleShare: () => void;
  isCopied: boolean;
}

export const CompareInsightCard = React.memo(function CompareInsightCard({
  apt1,
  apt2,
  apt1Label,
  apt2Label,
  score,
  showToast,
  handleShare,
  isCopied,
}: CompareInsightCardProps) {
  return (
    <div className="bg-elevated border border-border rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-2 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-black tabular-nums">
          <span className="px-2 py-0.5 rounded-full bg-brand-blue-light text-brand-blue border border-brand-blue/20">
            {apt1Label} {score.apt1}개 우세
          </span>
          <span className="text-tertiary font-bold">vs</span>
          <span className="px-2 py-0.5 rounded-full bg-brand-red-light text-brand-red border border-brand-red/20">
            {apt2Label} {score.apt2}개 우세
          </span>
        </div>
        
        <div className="text-[15.5px] font-black text-primary leading-snug flex items-center gap-1.5 flex-wrap">
          {score.apt1 > score.apt2 ? (
            <span className="flex items-center gap-1.5">
              <Sparkles size={16} className="text-brand-blue fill-brand-blue shrink-0" />
              <span><strong className="text-brand-blue font-black">{apt1Label}</strong> 단지가 최종 우세합니다.</span>
            </span>
          ) : score.apt2 > score.apt1 ? (
            <span className="flex items-center gap-1.5">
              <Sparkles size={16} className="text-brand-red fill-brand-red shrink-0" />
              <span><strong className="text-brand-red font-black">{apt2Label}</strong> 단지가 최종 우세합니다.</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Award size={16} className="text-secondary shrink-0" />
              <span>두 단지가 팽팽한 균형을 이룹니다.</span>
            </span>
          )}
        </div>
        <p className="text-[11.5px] font-medium text-tertiary">
          10대 핵심 인프라 및 실거래 가치 지표를 정량적으로 비교 분석한 결과입니다.
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 relative">
        <button
          onClick={() => {
            if (apt1 && apt2) {
              shareCompareToKakao({
                apt1Name: apt1.name,
                apt2Name: apt2.name,
                scoreApt1: score.apt1,
                scoreApt2: score.apt2
              }, showToast);
            }
          }}
          className="px-4 py-2.5 rounded-xl text-[12.5px] font-black bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 shadow-sm active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 select-none transition-colors"
        >
          <Share2 size={14} />
          <span>카카오톡 결과 공유</span>
        </button>

        <div className="relative flex flex-col items-stretch">
          <button
            onClick={handleShare}
            className={`px-4 py-2.5 rounded-xl text-[12.5px] font-black transition-all duration-200 select-none border ${
              isCopied
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent shadow-xs'
                : 'bg-surface hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] text-primary border-border shadow-xs active:scale-95 cursor-pointer'
            }`}
          >
            {isCopied ? '클립보드 복사 완료' : '비교 보고서 복사'}
          </button>
          <div className={`mt-1.5 text-[11px] font-bold text-primary bg-surface px-2.5 py-1.5 rounded-lg border border-border shadow-md text-right transition-all duration-300 absolute top-full right-0 z-50 ${
            isCopied ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-1 invisible'
          } leading-normal max-w-[220px] break-keep`}>
            복사되었습니다. 이제 카카오톡방이나 메모장에 붙여넣기(Ctrl + V) 하실 수 있습니다.
          </div>
        </div>
      </div>
    </div>
  );
});
