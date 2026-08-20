import React from 'react';
import {
  MapPin, School, TreePine, Building2, TrendingUp, Sparkles, Award
} from 'lucide-react';

export interface CompareSpecTableProps {
  apt1Label: string;
  apt2Label: string;
  metrics1: any;
  metrics2: any;
  wins: Record<string, boolean | null>;
  aiFitScores: {
    winner: 'apt1' | 'apt2' | 'tie' | null;
    score1: number;
    score2: number;
  };
  quizAnswers: any;
  getCompareClass: (isApt1: boolean, isWin: boolean | null) => string;
  displayPrice: (price: number) => string;
}

export const CompareSpecTable = React.memo(function CompareSpecTable({
  apt1Label,
  apt2Label,
  metrics1,
  metrics2,
  wins,
  aiFitScores,
  quizAnswers,
  getCompareClass,
  displayPrice,
}: CompareSpecTableProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-[14px] font-extrabold text-primary flex items-center gap-1.5 px-1">
        <Award size={16} className="text-[#ea6100]" />
        <span>1:1 지표 매트릭스 비교</span>
      </h3>

      <div className="overflow-hidden border border-border/30 rounded-2xl shadow-sm bg-surface/40">
        {/* Header row */}
        <div className="grid grid-cols-3 bg-body/50 border-b border-border/30 px-4 py-3 text-[11px] font-extrabold text-tertiary tracking-wider uppercase">
          <div className="flex flex-col justify-center">비교 평가 지표</div>
          <div className="text-center truncate flex flex-col items-center justify-center gap-1">
            {aiFitScores.winner === 'apt1' && (
              <span className="inline-flex items-center gap-1 text-[9px] font-black text-white bg-[#ea6100] px-2 py-0.5 rounded-full shadow-sm animate-pulse mb-1 shrink-0">
                <Sparkles size={8} className="fill-white" />
                <span>AI 맞춤 위너</span>
              </span>
            )}
            <span className="block">{apt1Label}</span>
            {quizAnswers && (
              <span className="text-[9.5px] text-emerald-600 dark:text-[#ea6100] font-bold">
                AI 적합도 {aiFitScores.score1}점
              </span>
            )}
          </div>
          <div className="text-center truncate flex flex-col items-center justify-center gap-1">
            {aiFitScores.winner === 'apt2' && (
              <span className="inline-flex items-center gap-1 text-[9px] font-black text-white bg-[#ea6100] px-2 py-0.5 rounded-full shadow-sm animate-pulse mb-1 shrink-0">
                <Sparkles size={8} className="fill-white" />
                <span>AI 맞춤 위너</span>
              </span>
            )}
            <span className="block">{apt2Label}</span>
            {quizAnswers && (
              <span className="text-[9.5px] text-emerald-600 dark:text-[#ea6100] font-bold">
                AI 적합도 {aiFitScores.score2}점
              </span>
            )}
          </div>
        </div>

        {/* Section: Transit */}
        <div className="bg-[#f8fafc]/30 dark:bg-zinc-950/20 px-4 py-2 border-b border-border/30 text-[11.5px] font-extrabold text-secondary flex items-center gap-1">
          <MapPin size={12} className="text-[#0284c7]" /> 역세권 인프라 (철도 및 트램)
        </div>

        <div className="divide-y divide-border/20">
          {/* GTX Distance */}
          <div className={`grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium transition-colors ${quizAnswers?.transit === 'gtx' ? 'bg-emerald-500/10' : ''}`}>
            <div className="text-secondary font-bold">GTX-A / SRT역 거리</div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.subway)}`}>
              {metrics1.distanceToSubway ? `${metrics1.distanceToSubway}m` : '-'}
            </div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.subway)}`}>
              {metrics2.distanceToSubway ? `${metrics2.distanceToSubway}m` : '-'}
            </div>
          </div>

          {/* Indeokwon Line Distance */}
          <div className={`grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium transition-colors ${quizAnswers?.transit === 'indeokwon' ? 'bg-emerald-500/10' : ''}`}>
            <div className="text-secondary font-bold">동인선 예정역 거리</div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.indeokwon)}`}>
              {metrics1.distanceToIndeokwon ? `${metrics1.distanceToIndeokwon}m` : '-'}
            </div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.indeokwon)}`}>
              {metrics2.distanceToIndeokwon ? `${metrics2.distanceToIndeokwon}m` : '-'}
            </div>
          </div>

          {/* Tram Distance */}
          <div className={`grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium transition-colors ${quizAnswers?.transit === 'tram' ? 'bg-emerald-500/10' : ''}`}>
            <div className="text-secondary font-bold">동탄트램 예정역 거리</div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.tram)}`}>
              {metrics1.distanceToTram ? `${metrics1.distanceToTram}m` : '-'}
            </div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.tram)}`}>
              {metrics2.distanceToTram ? `${metrics2.distanceToTram}m` : '-'}
            </div>
          </div>
        </div>

        {/* Section: Education & Living */}
        <div className="bg-[#f8fafc]/30 dark:bg-zinc-950/20 px-4 py-2 border-b border-t border-border/30 text-[11.5px] font-extrabold text-secondary flex items-center gap-1">
          <School size={12} className="text-[#0ea5e9]" /> 교육 및 생활 인프라 (학교 및 편의시설)
        </div>

        <div className="divide-y divide-border/20">
          <div className={`grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium transition-colors ${(quizAnswers?.family === 'baby' || quizAnswers?.family === 'elementary') ? 'bg-emerald-500/10' : ''}`}>
            <div className="text-secondary font-bold flex items-center gap-1">
              <span>초등학교 도보 통학 거리</span>
            </div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.elementary)}`}>
              {metrics1.distanceToElementary ? `${metrics1.distanceToElementary}m` : '-'}
            </div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.elementary)}`}>
              {metrics2.distanceToElementary ? `${metrics2.distanceToElementary}m` : '-'}
            </div>
          </div>

          <div className={`grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium transition-colors ${quizAnswers?.family === 'middleHigh' ? 'bg-emerald-500/10' : ''}`}>
            <div className="text-secondary font-bold">중학교 도보 통학 거리</div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.middle)}`}>
              {metrics1.distanceToMiddle ? `${metrics1.distanceToMiddle}m` : '-'}
            </div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.middle)}`}>
              {metrics2.distanceToMiddle ? `${metrics2.distanceToMiddle}m` : '-'}
            </div>
          </div>

          <div className={`grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium transition-colors ${quizAnswers?.family === 'middleHigh' ? 'bg-emerald-500/10' : ''}`}>
            <div className="text-secondary font-bold">고등학교 도보 통학 거리</div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.high)}`}>
              {metrics1.distanceToHigh ? `${metrics1.distanceToHigh}m` : '-'}
            </div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.high)}`}>
              {metrics2.distanceToHigh ? `${metrics2.distanceToHigh}m` : '-'}
            </div>
          </div>

          <div className={`grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium transition-colors ${(quizAnswers?.lifestyle === 'nature' || quizAnswers?.family === 'baby' || quizAnswers?.family === 'elementary' || quizAnswers?.family === 'middleHigh') ? 'bg-emerald-500/10' : ''}`}>
            <div className="text-secondary font-bold flex items-center gap-1">
              <TreePine size={13} className="text-emerald-500" />
              <span>공원 도보 거리</span>
            </div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.park)}`}>
              {metrics1.distanceToPark ? `${metrics1.distanceToPark}m` : '-'}
            </div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.park)}`}>
              {metrics2.distanceToPark ? `${metrics2.distanceToPark}m` : '-'}
            </div>
          </div>

          <div className={`grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium transition-colors ${quizAnswers?.lifestyle === 'shop' ? 'bg-emerald-500/10' : ''}`}>
            <div className="text-secondary font-bold">스타벅스 거리</div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.starbucks)}`}>
              {metrics1.distanceToStarbucks ? `${metrics1.distanceToStarbucks}m` : '-'}
            </div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.starbucks)}`}>
              {metrics2.distanceToStarbucks ? `${metrics2.distanceToStarbucks}m` : '-'}
            </div>
          </div>

          <div className={`grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium transition-colors ${quizAnswers?.lifestyle === 'shop' ? 'bg-emerald-500/10' : ''}`}>
            <div className="text-secondary font-bold">올리브영 거리</div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.oliveYoung)}`}>
              {metrics1.distanceToOliveYoung ? `${metrics1.distanceToOliveYoung}m` : '-'}
            </div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.oliveYoung)}`}>
              {metrics2.distanceToOliveYoung ? `${metrics2.distanceToOliveYoung}m` : '-'}
            </div>
          </div>
        </div>

        {/* Section: Specs */}
        <div className="bg-[#f8fafc]/30 dark:bg-zinc-950/20 px-4 py-2 border-b border-t border-border/30 text-[11.5px] font-extrabold text-secondary flex items-center gap-1">
          <Building2 size={12} className="text-[#db2777]" /> 단지 스펙 (규모·연식)
        </div>

        <div className="divide-y divide-border/20">
          <div className="grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium">
            <div className="text-secondary font-bold">단지 세대수</div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.households)}`}>
              {metrics1.householdCount ? `${metrics1.householdCount.toLocaleString()}세대` : '-'}
            </div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.households)}`}>
              {metrics2.householdCount ? `${metrics2.householdCount.toLocaleString()}세대` : '-'}
            </div>
          </div>

          <div className="grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium">
            <div className="text-secondary font-bold">준공 연도</div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.year)}`}>
              {metrics1.rawYearBuilt ? `${metrics1.rawYearBuilt}년` : '-'}
            </div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.year)}`}>
              {metrics2.rawYearBuilt ? `${metrics2.rawYearBuilt}년` : '-'}
            </div>
          </div>

          <div className="grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium">
            <div className="text-secondary font-bold">세대당 주차대수</div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.parking)}`}>
              {metrics1.parkingPerHousehold ? `${metrics1.parkingPerHousehold.toFixed(2)}대` : '-'}
            </div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.parking)}`}>
              {metrics2.parkingPerHousehold ? `${metrics2.parkingPerHousehold.toFixed(2)}대` : '-'}
            </div>
          </div>
        </div>

        {/* Section: Price and Valuation */}
        <div className="bg-[#f8fafc]/30 dark:bg-zinc-950/20 px-4 py-2 border-b border-t border-border/30 text-[11.5px] font-extrabold text-secondary flex items-center gap-1">
          <TrendingUp size={12} className="text-[#ea6100]" /> 가치 & 거래 정보 (최근 3M 기준)
        </div>

        <div className="divide-y divide-border/20">
          <div className="grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium">
            <div className="text-secondary font-bold">평균 매매시세 (3M)</div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.price)}`}>
              {displayPrice(metrics1.avg3MPrice)}
            </div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.price)}`}>
              {displayPrice(metrics2.avg3MPrice)}
            </div>
          </div>

          <div className="grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium">
            <div className="text-secondary font-bold">평균 평당가 (3M)</div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.perPyeong)}`}>
              {metrics1.avg3MPerPyeong ? `${metrics1.avg3MPerPyeong.toLocaleString()}만 원` : '-'}
            </div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.perPyeong)}`}>
              {metrics2.avg3MPerPyeong ? `${metrics2.avg3MPerPyeong.toLocaleString()}만 원` : '-'}
            </div>
          </div>

          <div className="grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium">
            <div className="text-secondary font-bold">평균 전세보증금 (3M)</div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.rent)}`}>
              {displayPrice(metrics1.avg3MRent)}
            </div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.rent)}`}>
              {displayPrice(metrics2.avg3MRent)}
            </div>
          </div>

          <div className="grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium">
            <div className="text-secondary font-bold">평균 전세가율</div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.ratio)}`}>
              {metrics1.jeonseRatio ? `${metrics1.jeonseRatio.toFixed(1)}%` : '-'}
            </div>
            <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.ratio)}`}>
              {metrics2.jeonseRatio ? `${metrics2.jeonseRatio.toFixed(1)}%` : '-'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
