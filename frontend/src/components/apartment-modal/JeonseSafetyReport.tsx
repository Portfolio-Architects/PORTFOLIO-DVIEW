'use client';

import React, { useMemo } from 'react';
import { Shield, ShieldAlert, AlertTriangle, Coins, TrendingUp, CheckCircle2, ChevronRight, MessageSquare } from 'lucide-react';
import { shareJeonseSafetyToKakao } from '@/lib/utils/kakaoShare';

interface JeonseSafetyReportProps {
  aptName: string;
  dong?: string;
  ratio: number; // 전세가율 (e.g. 0.72)
  latestPrice: number; // 매매가 (단위: 만원, e.g. 198500)
  latestDeposit: number; // 전세가 (단위: 만원, e.g. 77400)
  volume3M: number;
  householdCount: number;
  onOpenAdModal?: () => void;
}

export default function JeonseSafetyReport({
  aptName,
  dong = '동탄',
  ratio,
  latestPrice,
  latestDeposit,
  volume3M,
  householdCount,
  onOpenAdModal
}: JeonseSafetyReportProps) {
  // Convert ratio to percentage
  const jeonseRatePercent = ratio * 100;

  // 1. Calculate Score Details
  const scoreDetails = useMemo(() => {
    // A. Jeonse Ratio Score (Max 50)
    let ratioScore = 0;
    if (jeonseRatePercent < 60) ratioScore = 50;
    else if (jeonseRatePercent < 70) ratioScore = 40;
    else if (jeonseRatePercent < 80) ratioScore = 25;
    else if (jeonseRatePercent < 90) ratioScore = 10;
    else ratioScore = 0;

    // B. Auction Clearance Margin Score (Max 20)
    // Local clearance rate in Hwaseong-si / Dongtan is approx 78%
    const auctionLimit = latestPrice * 0.78;
    let marginScore = 0;
    if (latestDeposit < auctionLimit) marginScore = 20;
    else if (latestDeposit < latestPrice) marginScore = 10;
    else marginScore = 0;

    // C. Liquidity Score (Max 20)
    let liquidityScore = 0;
    if (volume3M >= 10) liquidityScore = 20;
    else if (volume3M >= 5) liquidityScore = 15;
    else if (volume3M >= 1) liquidityScore = 10;
    else liquidityScore = 5;

    // D. Scale Score (Max 10)
    let scaleScore = 0;
    if (householdCount >= 1000) scaleScore = 10;
    else if (householdCount >= 500) scaleScore = 7;
    else scaleScore = 4;

    const totalScore = ratioScore + marginScore + liquidityScore + scaleScore;

    // Determine Grade & Status
    let grade: 'safe' | 'caution' | 'danger' = 'safe';
    let gradeLabel = '안심 등급';
    let gradeDesc = '보증금 회수 안정성이 매우 높은 단지입니다.';
    let gradeGuide = '전세가율이 보수적이고 거래 회전이 원활하며 대단지 아파트로, 만기 시 전세보증금 회수가 매우 수월할 것으로 기대됩니다. 시중 은행의 대출 심사도 안전하게 통과 가능합니다.';
    
    if (totalScore >= 90) {
      grade = 'safe';
      gradeLabel = '안심 등급';
    } else if (totalScore >= 70) {
      grade = 'caution';
      gradeLabel = '주의 등급';
      gradeDesc = '보증금 반환 조건에 대한 모니터링이 필요합니다.';
      gradeGuide = '전세가율이 다소 높거나 매매 거래량이 일시 정체되어 있습니다. 계약 체결 시 반드시 전세금 반환보증보험 가입 요건(HUG 등)을 선제적으로 조회하고 가입하는 것을 권장합니다.';
    } else {
      grade = 'danger';
      gradeLabel = '위험 등급';
      gradeDesc = '깡통전세 및 보증금 일부 미반환 위험이 큽니다.';
      gradeGuide = '전세가율이 매매가에 근접해 있거나 경매 낙찰 예상가를 초과합니다. 만기 시 보증금 유실 우려가 매우 크므로, 보증 액수를 대폭 낮춘 반전세나 월세 계약으로 전환할 것을 적극 검토하십시오.';
    }

    return {
      totalScore,
      ratioScore,
      marginScore,
      liquidityScore,
      scaleScore,
      grade,
      gradeLabel,
      gradeDesc,
      gradeGuide,
      auctionLimit
    };
  }, [jeonseRatePercent, latestPrice, latestDeposit, volume3M, householdCount]);

  const {
    totalScore,
    ratioScore,
    marginScore,
    liquidityScore,
    scaleScore,
    grade,
    gradeLabel,
    gradeDesc,
    gradeGuide,
    auctionLimit
  } = scoreDetails;

  const styles = {
    safe: {
      themeColor: '#0d9488', // Teal-600
      bgClass: 'bg-teal-50 dark:bg-teal-950/20 border-teal-100 dark:border-teal-900/30',
      textClass: 'text-teal-600 dark:text-teal-400',
      gaugeClass: 'stroke-teal-500',
      icon: <Shield className="text-teal-500 fill-teal-500/10" size={26} />
    },
    caution: {
      themeColor: '#ea580c', // Orange-600
      bgClass: 'bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30',
      textClass: 'text-orange-600 dark:text-orange-400',
      gaugeClass: 'stroke-orange-500',
      icon: <AlertTriangle className="text-orange-500 fill-orange-500/10" size={26} />
    },
    danger: {
      themeColor: '#ef4444', // Red-500
      bgClass: 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30',
      textClass: 'text-rose-600 dark:text-rose-400',
      gaugeClass: 'stroke-rose-500',
      icon: <ShieldAlert className="text-rose-500 fill-rose-500/10" size={26} />
    }
  }[grade];

  const handleKakaoShare = () => {
    shareJeonseSafetyToKakao({
      aptName,
      dong,
      marketPrice: latestPrice,
      jeonseAmount: latestDeposit,
      lienAmount: 0,
      debtRatio: jeonseRatePercent,
      riskLabel: gradeLabel,
      riskLevel: grade,
    });
  };

  // Circle path parameters
  const radius = 50;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, totalScore) / 100) * circumference;

  return (
    <div className="flex flex-col w-full gap-8 mt-4">
      {/* ─── 📊 전세 안전성 스코어 대시보드 ─── */}
      <div>
        <div className="flex items-center gap-2 mb-4 border-l-[3px] border-[#0d9488] pl-2.5">
          <span className="text-[14px] md:text-[15px] font-black text-primary tracking-tight">보증금 반환 안전성 진단</span>
        </div>

        <div className="bg-body border border-border rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-center gap-6">
          {/* SVG Progress Ring */}
          <div className="relative flex items-center justify-center shrink-0 w-32 h-32">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                className="text-slate-100 dark:text-slate-800/80 stroke-current"
                strokeWidth={strokeWidth}
                fill="transparent"
                r={radius}
                cx="64"
                cy="64"
              />
              <circle
                className={`stroke-current transition-all duration-1000 ease-out ${styles.gaugeClass}`}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                r={radius}
                cx="64"
                cy="64"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-[11px] font-black text-secondary tracking-widest leading-none">안심지수</span>
              <span className="text-[28px] font-black tracking-tight text-primary leading-none mt-1 tabular-nums">
                {totalScore}
              </span>
              <span className="text-[10px] font-bold text-secondary opacity-60 leading-none mt-0.5">/ 100점</span>
            </div>
          </div>

          {/* Grade & Description */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              {styles.icon}
              <span className={`text-[17px] font-black tracking-tight ${styles.textClass}`}>
                {gradeLabel} ({totalScore}점)
              </span>
            </div>
            <p className="text-[14px] font-extrabold text-primary mb-2 leading-tight">
              {gradeDesc}
            </p>
            <div className={`p-4 rounded-xl border leading-relaxed text-left ${styles.bgClass}`}>
              <p className="text-[13px] font-medium text-secondary break-keep">
                {gradeGuide}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 📋 4대 안전 진단 영역 리스트 ─── */}
      <div>
        <div className="flex items-center gap-2 mb-4 border-l-[3px] border-[#0d9488] pl-2.5">
          <span className="text-[14px] md:text-[15px] font-black text-primary tracking-tight">진단 부문별 채점 상세</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* 1. 전세가율 */}
          <div className="bg-body border border-border/50 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 size={16} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-extrabold text-secondary">실거래 전세가율</span>
                <span className="text-[11.5px] font-black text-primary tabular-nums">{ratioScore} / 50점</span>
              </div>
              <p className="text-[12px] font-medium text-neutral-600 dark:text-neutral-400 mt-1 leading-normal break-keep">
                이 아파트의 실거래가 전세가율은 **{jeonseRatePercent.toFixed(1)}%**입니다. 
                {jeonseRatePercent >= 80 ? ' 80% 이상의 고위험 깡통전세 구간입니다.' : ' 70% 이하의 비교적 안전한 격차를 유지하고 있습니다.'}
              </p>
            </div>
          </div>

          {/* 2. 경매 낙찰 안전마진 */}
          <div className="bg-body border border-border/50 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0 mt-0.5">
              <Coins className="text-teal-600" size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-extrabold text-secondary">경매 낙찰 보장 마진</span>
                <span className="text-[11.5px] font-black text-primary tabular-nums">{marginScore} / 20점</span>
              </div>
              <p className="text-[12px] font-medium text-neutral-600 dark:text-neutral-400 mt-1 leading-normal break-keep">
                화성시 경매 낙찰기준가(매매가의 78%)는 **{Math.round(auctionLimit).toLocaleString()}만원**입니다. 
                전세금({latestDeposit.toLocaleString()}만원)이 낙찰가보다 {latestDeposit < auctionLimit ? '낮아 안전합니다.' : '높아 경매 진행 시 유실 우려가 있습니다.'}
              </p>
            </div>
          </div>

          {/* 3. 매매 유동성 */}
          <div className="bg-body border border-border/50 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0 mt-0.5">
              <TrendingUp className="text-teal-600" size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-extrabold text-secondary">매매 회전 환금성</span>
                <span className="text-[11.5px] font-black text-primary tabular-nums">{liquidityScore} / 20점</span>
              </div>
              <p className="text-[12px] font-medium text-neutral-600 dark:text-neutral-400 mt-1 leading-normal break-keep">
                최근 3개월 매매 거래량은 **{volume3M}건**입니다. 
                {volume3M >= 5 ? '유동성이 풍부하여 보증금 반환 지연 시 급매 처분 등을 통한 조기 자금 회수가 수월합니다.' : '거래가 뜸하여 자금 회수 정체 리스크가 다소 우려됩니다.'}
              </p>
            </div>
          </div>

          {/* 4. 단지 신뢰도 */}
          <div className="bg-body border border-border/50 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="text-teal-600" size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-extrabold text-secondary">대단지 신뢰 규모</span>
                <span className="text-[11.5px] font-black text-primary tabular-nums">{scaleScore} / 10점</span>
              </div>
              <p className="text-[12px] font-medium text-neutral-600 dark:text-neutral-400 mt-1 leading-normal break-keep">
                본 단지는 총 **{householdCount.toLocaleString()}세대** 대규모 단지입니다. 세대 규모가 클수록 시세 왜곡이나 갑작스러운 하방 위험에 대한 방어력이 높아 보증 위험이 낮아집니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 🏦 B2B 제휴 광고 / 반환보증 진단 안내 배너 (Monetization A/B) ─── */}
      {(grade === 'caution' || grade === 'danger') && (
        <div className="border border-orange-500/20 bg-orange-500/5 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 text-center sm:text-left min-w-0">
            <h5 className="text-[14px] font-black text-primary mb-1">
              ⚠️ 임차인 필수: 전세보증금 반환보증보험 가입 요건 확인
            </h5>
            <p className="text-[12px] font-bold text-secondary">
              전세가율 {jeonseRatePercent.toFixed(1)}%로 HUG 보증보험 가입이 거절되거나 특별 보증이 필요할 수 있습니다. 
            </p>
          </div>
          <button
            onClick={onOpenAdModal}
            className="shrink-0 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold text-[12px] px-4 py-2.5 rounded-xl flex items-center gap-1 active:scale-[0.97] transition-all cursor-pointer border-none shadow-md"
          >
            <span>무료 가입 진단받기</span>
            <ChevronRight size={14} strokeWidth={2.5} />
          </button>
        </div>
      )}
      {/* 카카오톡 1-Click 공유 플로팅 버튼 (FAB) */}
      <div className="sticky bottom-4 left-0 right-0 z-30 flex justify-center w-full pointer-events-none mt-4">
        <button
          onClick={handleKakaoShare}
          className="pointer-events-auto bg-[#fee500] hover:bg-[#fddc00] active:scale-95 text-[#191919] font-black text-[13.5px] px-6 py-3.5 rounded-full flex items-center gap-2 shadow-xl shadow-yellow-500/30 transition-all cursor-pointer border-none animate-pulse"
        >
          <MessageSquare size={16} className="fill-[#191919] text-[#191919]" />
          <span>진단 결과 1초 만에 카카오톡으로 공유하기</span>
        </button>
      </div>
    </div>
  );
}
