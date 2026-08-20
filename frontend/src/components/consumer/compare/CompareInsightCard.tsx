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
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/10 border border-emerald-500/20 dark:border-emerald-500/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-2 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 tracking-wider uppercase bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 rounded-md">
            종합 분석 결과 판정
          </span>
          <div className="flex items-center gap-1.5 text-[10px] font-black">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-[#ea6100] border border-emerald-500/20">
              {apt1Label} {score.apt1}개 우세
            </span>
            <span className="text-tertiary font-bold">vs</span>
            <span className="px-2 py-0.5 rounded-full bg-toss-blue/10 dark:bg-toss-blue/20 text-toss-blue border border-toss-blue/20">
              {apt2Label} {score.apt2}개 우세
            </span>
          </div>
        </div>
        
        <div className="text-[15.5px] font-black text-primary leading-snug flex items-center gap-1.5 flex-wrap">
          {score.apt1 > score.apt2 ? (
            <span className="flex items-center gap-1.5">
              <Sparkles size={16} className="text-emerald-500 fill-emerald-500 shrink-0" />
              <span><strong className="text-emerald-500 font-black">{apt1Label}</strong> 단지가 최종 우세합니다.</span>
            </span>
          ) : score.apt2 > score.apt1 ? (
            <span className="flex items-center gap-1.5">
              <Sparkles size={16} className="text-toss-blue fill-toss-blue shrink-0" />
              <span><strong className="text-toss-blue font-black">{apt2Label}</strong> 단지가 최종 우세합니다.</span>
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
          className="px-4 py-2.5 rounded-xl text-[12.5px] font-black bg-[#FEE500] hover:bg-[#FEE500]/95 text-[#3A1D1D] shadow-md hover:shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 select-none"
        >
          <Share2 size={14} />
          <span>카카오톡 결과 공유</span>
        </button>

        <div className="relative flex flex-col items-stretch">
          <button
            onClick={handleShare}
            className={`px-4 py-2.5 rounded-xl text-[12.5px] font-black transition-all duration-200 select-none ${
              isCopied
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md hover:shadow-lg active:scale-95 cursor-pointer'
            }`}
          >
            {isCopied ? '클립보드 복사 완료' : '비교 보고서 복사'}
          </button>
          <div className={`mt-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 text-right transition-all duration-300 absolute top-full right-0 z-50 ${
            isCopied ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-1 invisible'
          } leading-normal max-w-[220px] break-keep`}>
            복사되었습니다. 이제 카카오톡방이나 메모장에 붙여넣기(Ctrl + V) 하실 수 있습니다.
          </div>
        </div>
      </div>
    </div>
  );
});
