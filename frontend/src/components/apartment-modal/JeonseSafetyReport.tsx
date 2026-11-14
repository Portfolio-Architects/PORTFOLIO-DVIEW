'use client';

import React, { useMemo } from 'react';
import { Shield, ShieldAlert, AlertTriangle, Coins, TrendingUp, CheckCircle2, ChevronRight, ChevronDown, MessageSquare } from 'lucide-react';
import { shareJeonseSafetyToKakao } from '@/lib/utils/kakaoShare';
import { usePWA } from '@/components/pwa/PWAProvider';
import {
  getSeoAccordionClass,
  getSeoAccordionSummaryClass,
  getSeoAccordionBodyClass,
  getSeoAccordionChevronClass,
} from '@/lib/design-system/copyDiet';

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

const JeonseSafetyReport = React.memo(function JeonseSafetyReport({
  aptName,
  dong = '동탄',
  ratio,
  latestPrice,
  latestDeposit,
  volume3M,
  householdCount,
  onOpenAdModal
}: JeonseSafetyReportProps) {
  const { showToast } = usePWA();
  // Safe Fallback for inputs
  const safeLatestPrice = Math.max(0, latestPrice || 0);
  const safeLatestDeposit = Math.max(0, latestDeposit || 0);
  const safeVolume3M = Math.max(0, volume3M || 0);
  const safeHouseholdCount = Math.max(0, householdCount || 0);

  const safeRatio = useMemo(() => {
    if (typeof ratio === 'number' && !isNaN(ratio) && ratio > 0) {
      return ratio;
    }
    if (safeLatestPrice > 0) {
      return safeLatestDeposit / safeLatestPrice;
    }
    return 0;
  }, [ratio, safeLatestPrice, safeLatestDeposit]);

  // Convert ratio to percentage
  const jeonseRatePercent = safeRatio * 100;

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
    const auctionLimit = safeLatestPrice * 0.78;
    let marginScore = 0;
    if (safeLatestPrice === 0 || safeLatestDeposit === 0) {
      marginScore = 0; // 데이터 결측 시 마진 점수는 0점 처리
    } else if (safeLatestDeposit < auctionLimit) {
      marginScore = 20;
    } else if (safeLatestDeposit < safeLatestPrice) {
      marginScore = 10;
    } else {
      marginScore = 0;
    }

    // C. Liquidity Score (Max 20)
    let liquidityScore = 0;
    if (safeVolume3M >= 10) liquidityScore = 20;
    else if (safeVolume3M >= 5) liquidityScore = 15;
    else if (safeVolume3M >= 1) liquidityScore = 10;
    else liquidityScore = 5;

    // D. Scale Score (Max 10)
    let scaleScore = 0;
    if (safeHouseholdCount >= 1000) scaleScore = 10;
    else if (safeHouseholdCount >= 500) scaleScore = 7;
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
  }, [jeonseRatePercent, safeLatestPrice, safeLatestDeposit, safeVolume3M, safeHouseholdCount]);

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
      themeColor: '#2563eb', // Teal-600
      bgClass: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30',
      textClass: 'text-emerald-700 dark:text-emerald-400 font-extrabold',
      gaugeClass: 'stroke-emerald-500',
      icon: <Shield className="text-emerald-500 fill-emerald-500/10" size={26} />
    },
    caution: {
      themeColor: '#dc2626',
      bgClass: 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30',
      textClass: 'text-red-800 dark:text-red-400 font-extrabold',
      gaugeClass: 'stroke-red-500',
      icon: <AlertTriangle className="text-red-500 fill-red-500/10" size={26} />
    },
    danger: {
      themeColor: '#ef4444', // Red-500
      bgClass: 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30',
      textClass: 'text-red-800 dark:text-red-400 font-extrabold',
      gaugeClass: 'stroke-red-500',
      icon: <ShieldAlert className="text-red-500 fill-red-500/10" size={26} />
    }
  }[grade];

  const handleKakaoShare = () => {
    shareJeonseSafetyToKakao({
      aptName,
      dong,
      marketPrice: safeLatestPrice,
      jeonseAmount: safeLatestDeposit,
      lienAmount: 0,
      debtRatio: jeonseRatePercent,
      riskLabel: gradeLabel,
      riskLevel: grade,
    }, showToast);
  };

  // Circle path parameters
  const radius = 50;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, totalScore) / 100) * circumference;

  // Generate JSON-LD structural data for Jeonse Safety (SEO/Rich Snippets)
  const jsonLd = useMemo(() => {
    return {
      "@context": "https://schema.org",
      "@type": "Place",
      "name": `${aptName} 단지 전세 보증금 반환 안전성 진단 리포트`,
      "description": `단지명: ${aptName} (${dong}), 실거래 매매가 약 ${(safeLatestPrice / 10000).toFixed(1)}억, 전세가 약 ${(safeLatestDeposit / 10000).toFixed(1)}억 기준으로 분석한 전세 안전 등급(${gradeLabel}) 및 안심지수(${totalScore}점) 분석 결과입니다.`,
      "amenityFeature": [
        {
          "@type": "LocationFeatureSpecification",
          "name": "전세가율 진단",
          "value": `전세가율 ${jeonseRatePercent.toFixed(1)}% (채점: ${ratioScore}/50점)`
        },
        {
          "@type": "LocationFeatureSpecification",
          "name": "경매 낙찰 마진",
          "value": `예상 경매 낙찰가 ${(auctionLimit / 10000).toFixed(1)}억 대비 보증금 안전도 (채점: ${marginScore}/20점)`
        },
        {
          "@type": "LocationFeatureSpecification",
          "name": "매매 유동성 및 회전률",
          "value": `최근 3개월 매매 거래량 ${safeVolume3M}건 (채점: ${liquidityScore}/20점)`
        },
        {
          "@type": "LocationFeatureSpecification",
          "name": "단지 규모 안정성",
          "value": `총 ${safeHouseholdCount.toLocaleString()}세대 규모 (채점: ${scaleScore}/10점)`
        }
      ]
    };
  }, [aptName, dong, safeLatestPrice, safeLatestDeposit, gradeLabel, totalScore, jeonseRatePercent, ratioScore, auctionLimit, marginScore, safeVolume3M, liquidityScore, safeHouseholdCount, scaleScore]);

  return (
    <div className="flex flex-col w-full gap-8 mt-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* ─── 전세 안전성 스코어 대시보드 ─── */}
      <div>
        <div className="flex items-center gap-2 mb-4 border-l-[3px] border-blue-600 pl-2.5">
          <span className="text-[14px] md:text-[15px] font-black text-primary tracking-tight">보증금 반환 안전성 진단</span>
        </div>

        <div className="bg-body border border-border rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-center gap-6">
          {/* SVG Progress Ring */}
          <div 
            className="relative flex items-center justify-center shrink-0 w-32 h-32"
            role="img"
            aria-label={`전세 안심지수 ${totalScore}점`}
            aria-describedby="jeonse-safety-description"
          >
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
              <span className={`text-[17px] font-black tracking-tight tabular-nums ${styles.textClass}`}>
                {gradeLabel} ({totalScore}점)
              </span>
            </div>
            <p id="jeonse-safety-description" className="text-[14px] font-extrabold text-primary mb-2 leading-tight">
              {gradeDesc}
            </p>
            <details className={getSeoAccordionClass(`text-left ${styles.bgClass}`)}>
              <summary className={getSeoAccordionSummaryClass()}>
                <span>진단 기준 · 대응 가이드 더보기</span>
                <ChevronDown size={15} className={getSeoAccordionChevronClass()} />
              </summary>
              <div className={getSeoAccordionBodyClass()}>
                <p className="text-[13px] font-medium text-secondary break-keep leading-relaxed">
                  {gradeGuide}
                </p>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* ─── 4대 안전 진단 영역 리스트 ─── */}
      <div>
        <div className="flex items-center gap-2 mb-4 border-l-[3px] border-blue-600 pl-2.5">
          <span className="text-[14px] md:text-[15px] font-black text-primary tracking-tight">진단 부문별 채점 상세</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 tabular-nums">
          {/* 1. 전세가율 */}
          <div className="bg-[#f9fafb] dark:bg-[#17171c] rounded-2xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 size={16} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-extrabold text-secondary">실거래 전세가율</span>
                <span className="text-[11.5px] font-black text-primary tabular-nums">{ratioScore} / 50점</span>
              </div>
              <p className="text-[12px] font-bold text-slate-600 dark:text-slate-400 mt-1 leading-normal break-keep">
                전세가율 {jeonseRatePercent.toFixed(1)}% ·{' '}
                {jeonseRatePercent >= 80
                  ? '고위험 구간'
                  : jeonseRatePercent >= 60
                  ? '모니터링 구간'
                  : '안전 격차 유지'}
              </p>
            </div>
          </div>

          {/* 2. 경매 낙찰 안전마진 */}
          <div className="bg-[#f9fafb] dark:bg-[#17171c] rounded-2xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <Coins className="text-emerald-600" size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-extrabold text-secondary">경매 낙찰 보장 마진</span>
                <span className="text-[11.5px] font-black text-primary tabular-nums">{marginScore} / 20점</span>
              </div>
              <p className="text-[12px] font-bold text-slate-600 dark:text-slate-400 mt-1 leading-normal break-keep">
                낙찰기준 {Math.round(auctionLimit).toLocaleString()}만원 ·{' '}
                {safeLatestDeposit < auctionLimit ? '보증금 안전권' : '유실 주의 구간'}
              </p>
            </div>
          </div>

          {/* 3. 매매 유동성 */}
          <div className="bg-[#f9fafb] dark:bg-[#17171c] rounded-2xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <TrendingUp className="text-emerald-600" size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-extrabold text-secondary">매매 회전 환금성</span>
                <span className="text-[11.5px] font-black text-primary tabular-nums">{liquidityScore} / 20점</span>
              </div>
              <p className="text-[12px] font-bold text-slate-600 dark:text-slate-400 mt-1 leading-normal break-keep">
                최근 3개월 {safeVolume3M}건 · {safeVolume3M >= 5 ? '환금성 우수' : '회전 정체 주의'}
              </p>
            </div>
          </div>

          {/* 4. 단지 신뢰도 */}
          <div className="bg-[#f9fafb] dark:bg-[#17171c] rounded-2xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="text-emerald-600" size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-extrabold text-secondary">대단지 신뢰 규모</span>
                <span className="text-[11.5px] font-black text-primary tabular-nums">{scaleScore} / 10점</span>
              </div>
              <p className="text-[12px] font-bold text-slate-600 dark:text-slate-400 mt-1 leading-normal break-keep">
                총 {safeHouseholdCount.toLocaleString()}세대 ·{' '}
                {safeHouseholdCount >= 1000
                  ? '대단지 시세 방어 우수'
                  : safeHouseholdCount >= 500
                  ? '중견 단지 규모'
                  : '소규모 변동성 주의'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── HUG 반환보증 공식 가이드 안내 배너 ─── */}
      {(grade === 'caution' || grade === 'danger') && (
        <div className="border border-red-500/20 bg-red-500/5 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 text-center sm:text-left min-w-0">
            <p className="text-[14px] font-black text-primary mb-1 flex items-center gap-1.5 justify-center sm:justify-start">
              <AlertTriangle size={15} className="text-red-500 shrink-0" />
              <span>임차인 필수: 전세보증금 반환보증보험 가입 요건 확인</span>
            </p>
            <p className="text-[12px] font-bold text-secondary tabular-nums">
              전세가율 {jeonseRatePercent.toFixed(1)}% · HUG 반환보증 가입 가능 여부 사전 점검 필수
            </p>
          </div>
          <button
            onClick={() => window.open('https://www.khug.or.kr/web/ig/dr/igdr000001.jsp', '_blank', 'noopener,noreferrer')}
            className="shrink-0 bg-red-600 hover:bg-red-500 text-white font-extrabold text-[12px] px-4 py-2.5 rounded-xl flex items-center gap-1 active:scale-[0.97] transition-all cursor-pointer border-none shadow-md"
          >
            <span>HUG 공식 기준 확인</span>
            <ChevronRight size={14} strokeWidth={2.5} />
          </button>
        </div>
      )}
      {/* 카카오톡 1-Click 공유 플로팅 버튼 (FAB) */}
      <div className="sticky bottom-4 left-0 right-0 z-30 flex justify-center w-full pointer-events-none mt-4">
        <button
          onClick={handleKakaoShare}
          className="pointer-events-auto bg-[#fee500] hover:bg-[#fddc00] active:scale-95 text-[#191919] font-black text-[13.5px] px-6 py-3.5 rounded-full flex items-center gap-2 shadow-xl shadow-slate-900/15 transition-all cursor-pointer border-none animate-pulse"
        >
          <MessageSquare size={16} className="fill-[#191919] text-[#191919]" />
          <span>진단 결과 1초 만에 카카오톡으로 공유하기</span>
        </button>
      </div>
    </div>
  );
});

JeonseSafetyReport.displayName = 'JeonseSafetyReport';
export default JeonseSafetyReport;
