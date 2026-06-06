'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Share2, Check, ChevronRight, TrendingUp } from 'lucide-react';
import type { DongApartment } from '@/lib/dong-apartments';
import type { AptTxSummary } from '@/lib/types/transaction';
import type { FieldReportData } from '@/lib/types/report.types';
import { findTxKey, normalizeAptName } from '@/lib/utils/apartmentMapping';
import { shareRecommendationsToKakao } from '@/lib/utils/kakaoShare';

interface AIRecommendationsProps {
  sheetApartments: Record<string, DongApartment[]>;
  txSummaryData: Record<string, AptTxSummary>;
  nameMapping?: Record<string, string>;
  publicRentalSet: Set<string>;
  fieldReportsMap: Map<string, FieldReportData>;
  userFavorites: Set<string>;
  onSelectApt?: (name: string) => void;
  onOpenTaxCalculator?: (aptName: string) => void;
  onOpenMortgage?: (aptName: string) => void;
}

function getEffectiveMetrics(apt: DongApartment, report: FieldReportData | undefined) {
  if (report?.metrics) {
    return report.metrics;
  }
  
  const brand = apt.brand || '';
  const householdCount = apt.householdCount || 800;
  const yearBuiltStr = apt.yearBuilt || '2018';
  const yearBuilt = parseInt(yearBuiltStr.substring(0, 4)) || 2018;
  const parkingPerHousehold = 1.25;
  
  let distanceToSubway = 2000;
  let distanceToElementary = 350;
  let distanceToPark = 500;
  let academyDensity = 15;
  const distanceToIndeokwon = 2000;
  const distanceToTram = 500;
  let distanceToStarbucks = 800;
  
  const dong = apt.dong || '';
  if (dong.includes('오산동')) {
    distanceToSubway = 500;
    distanceToPark = 400;
    academyDensity = 25;
    distanceToStarbucks = 400;
    distanceToElementary = 300;
  } else if (dong.includes('송동') || dong.includes('산척동')) {
    distanceToSubway = 2500;
    distanceToPark = 250;
    academyDensity = 30;
    distanceToStarbucks = 450;
    distanceToElementary = 400;
  } else if (dong.includes('청계동')) {
    distanceToSubway = 1200;
    distanceToPark = 350;
    academyDensity = 75;
    distanceToStarbucks = 300;
    distanceToElementary = 200;
  } else if (dong.includes('영천동')) {
    distanceToSubway = 1800;
    distanceToPark = 500;
    academyDensity = 45;
    distanceToStarbucks = 500;
    distanceToElementary = 300;
  } else if (dong.includes('목동')) {
    distanceToSubway = 2800;
    distanceToPark = 400;
    academyDensity = 55;
    distanceToStarbucks = 600;
    distanceToElementary = 250;
  } else if (dong.includes('방교동') || dong.includes('금곡동')) {
    distanceToSubway = 3000;
    distanceToPark = 800;
    academyDensity = 5;
    distanceToStarbucks = 1200;
    distanceToElementary = 600;
  }
  
  return {
    brand,
    householdCount,
    parkingPerHousehold,
    yearBuilt,
    distanceToElementary,
    distanceToSubway,
    academyDensity,
    distanceToPark,
    distanceToIndeokwon,
    distanceToTram,
    distanceToStarbucks
  };
}

export default function AIRecommendations({
  sheetApartments,
  txSummaryData,
  nameMapping = {},
  publicRentalSet,
  fieldReportsMap,
  userFavorites,
  onSelectApt,
  onOpenTaxCalculator,
  onOpenMortgage,
}: AIRecommendationsProps) {
  const [viewedApts, setViewedApts] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const loadViewed = () => {
      try {
        const history = JSON.parse(localStorage.getItem('dview_viewed_apts') || '[]');
        setViewedApts(history);
      } catch (e) {
        console.warn('LocalStorage load error:', e);
      }
    };
    loadViewed();
    window.addEventListener('dview_viewed_apts_changed', loadViewed);
    return () => window.removeEventListener('dview_viewed_apts_changed', loadViewed);
  }, []);

  const recommendationResult = useMemo(() => {
    const refsSet = new Set<string>();
    userFavorites.forEach(x => refsSet.add(x));
    viewedApts.forEach(x => refsSet.add(x));

    const allApts = Object.values(sheetApartments).flat();

    if (refsSet.size === 0) {
      const fallbackNames = ['동탄역더샵센트럴시티', '동탄역시범우남퍼스트빌', '동탄호수공원하우스디더레이크'];
      const items = fallbackNames.map((name, index) => {
        const apt = allApts.find(a => normalizeAptName(a.name) === normalizeAptName(name));
        const score = 98 - index * 3;
        const txKey = findTxKey(name, txSummaryData, nameMapping);
        const summary = txKey ? txSummaryData[txKey] : null;
        const price = summary ? (summary.avg3MPrice || summary.latestPrice || 0) : 0;
        
        let reason = '동탄역 도보 5분 거리의 초역세권 대표 대단지입니다.';
        let tag = '초역세권';
        if (index === 1) {
          reason = '동탄역시범단지 내 학군과 교통의 핵심 요충지입니다.';
          tag = '학군우수';
        } else if (index === 2) {
          reason = '호수공원 조경과 쾌적한 인프라를 갖춘 가성비 우수 단지입니다.';
          tag = '호수공원';
        }

        return {
          name,
          dong: apt?.dong || '동탄동',
          score,
          reason,
          price,
          tag,
          isFallback: true,
        };
      });
      return { items, isFallback: true };
    }

    const refAptsData = allApts.filter(apt => refsSet.has(apt.name));
    
    let totalPrice = 0;
    let priceCount = 0;
    let totalYear = 0;
    let yearCount = 0;
    let totalSubway = 0;
    let totalElementary = 0;
    let totalPark = 0;
    let totalAcademy = 0;
    let totalJeonseRatio = 0;
    let jeonseCount = 0;
    const dongFreq: Record<string, number> = {};

    refAptsData.forEach(apt => {
      const report = fieldReportsMap.get(apt.name);
      const m = getEffectiveMetrics(apt, report);
      
      const txKey = findTxKey(apt.name, txSummaryData, nameMapping);
      const summary = txKey ? txSummaryData[txKey] : null;
      const price = summary ? (summary.avg3MPrice || summary.latestPrice || 0) : 0;
      const rent = summary ? (summary.avg3MRentDeposit || summary.latestRentDeposit || 0) : 0;
      
      if (price > 0) {
        totalPrice += price;
        priceCount++;
      }
      if ((m.yearBuilt ?? 0) > 0) {
        totalYear += m.yearBuilt ?? 2018;
        yearCount++;
      }
      if (price > 0 && rent > 0) {
        totalJeonseRatio += (rent / price) * 100;
        jeonseCount++;
      }

      totalSubway += m.distanceToSubway ?? 2000;
      totalElementary += m.distanceToElementary ?? 350;
      totalPark += m.distanceToPark ?? 500;
      totalAcademy += m.academyDensity ?? 15;

      const dong = apt.dong || '';
      dongFreq[dong] = (dongFreq[dong] || 0) + 1;
    });

    const count = refAptsData.length;
    const targetPrice = priceCount > 0 ? totalPrice / priceCount : 75000;
    const targetYear = yearCount > 0 ? totalYear / yearCount : 2018;
    const targetSubway = totalSubway / count;
    const targetElementary = totalElementary / count;
    const targetPark = totalPark / count;
    const targetAcademy = totalAcademy / count;
    const targetJeonseRatio = jeonseCount > 0 ? totalJeonseRatio / jeonseCount : 65;

    let primaryDong = '';
    let maxFreq = 0;
    Object.entries(dongFreq).forEach(([dong, freq]) => {
      if (freq > maxFreq) {
        maxFreq = freq;
        primaryDong = dong;
      }
    });

    const candidates = allApts.filter(apt => !refsSet.has(apt.name) && !publicRentalSet.has(apt.name));
    
    const scoredCandidates = candidates.map(apt => {
      const report = fieldReportsMap.get(apt.name);
      const m = getEffectiveMetrics(apt, report);
      
      const txKey = findTxKey(apt.name, txSummaryData, nameMapping);
      const summary = txKey ? txSummaryData[txKey] : null;
      const price = summary ? (summary.avg3MPrice || summary.latestPrice || 0) : 0;
      const rent = summary ? (summary.avg3MRentDeposit || summary.latestRentDeposit || 0) : 0;
      const jeonseRatio = price > 0 && rent > 0 ? (rent / price) * 100 : 0;

      let score = 50;

      if (primaryDong && apt.dong === primaryDong) {
        score += 15;
      }

      if (price > 0 && targetPrice > 0) {
        const priceDiffRatio = Math.abs(price - targetPrice) / targetPrice;
        if (priceDiffRatio <= 0.1) score += 25;
        else if (priceDiffRatio <= 0.25) score += 15;
        else if (priceDiffRatio <= 0.4) score += 8;
      }

      const yearDiff = Math.abs((m.yearBuilt ?? 2018) - targetYear);
      if (yearDiff <= 2) score += 12;
      else if (yearDiff <= 5) score += 6;

      if (targetSubway <= 700 && (m.distanceToSubway ?? 2000) <= 700) {
        score += 15;
      } else {
        const subwayDiff = Math.abs((m.distanceToSubway ?? 2000) - targetSubway);
        if (subwayDiff <= 300) score += 10;
        else if (subwayDiff <= 600) score += 5;
      }

      if (targetElementary <= 250 && (m.distanceToElementary ?? 350) <= 250) {
        score += 15;
      } else {
        const schoolDiff = Math.abs((m.distanceToElementary ?? 350) - targetElementary);
        if (schoolDiff <= 100) score += 10;
        else if (schoolDiff <= 250) score += 5;
      }

      if (targetPark <= 350 && (m.distanceToPark ?? 500) <= 350) {
        score += 8;
      }

      if (targetJeonseRatio >= 70 && jeonseRatio >= 70) {
        score += 10;
      }

      let reason = '선호하시는 가격대와 연식 조건에 부합하는 균형 잡힌 단지입니다.';
      let tag = '선호매치';

      if (primaryDong && apt.dong === primaryDong && (m.distanceToSubway ?? 2000) <= 700) {
        reason = `선호하시는 ${apt.dong} 생활권 내 교통이 편리한 역세권 단지입니다.`;
        tag = '생활권역';
      } else if ((m.distanceToElementary ?? 350) <= 250 && (m.distanceToSubway ?? 2000) <= 800) {
        reason = '초등학교 등하교가 안전하고 지하철역 접근성도 뛰어난 복합 추천 단지입니다.';
        tag = '초품역세';
      } else if ((m.distanceToElementary ?? 350) <= 250) {
        reason = '아이들이 큰 길을 건너지 않고 안전하게 통학할 수 있는 안심 초품아 단지입니다.';
        tag = '초품아';
      } else if ((m.distanceToSubway ?? 2000) <= 600) {
        reason = '동탄역 및 대중교통 노선이 가까워 강남권 출퇴근이 용이한 추천 단지입니다.';
        tag = '역세권';
      } else if (jeonseRatio >= 70) {
        reason = '높은 전세가율로 갭투자가 용이하며 매매 가격 하방 지지력이 탄탄한 단지입니다.';
        tag = '투자우수';
      } else if ((m.yearBuilt ?? 2018) >= 2021) {
        reason = '연식이 매우 짧고 스마트 인프라가 완비된 쾌적한 최신축 아파트 단지입니다.';
        tag = '최신축';
      }

      const matchPercentage = Math.min(99, Math.max(52, Math.round((score / 150) * 100)));

      return {
        name: apt.name,
        dong: apt.dong,
        score: matchPercentage,
        reason,
        price,
        tag,
        isFallback: false,
      };
    });

    const sorted = scoredCandidates.sort((a, b) => b.score - a.score).slice(0, 3);
    return { items: sorted, isFallback: false };
  }, [sheetApartments, txSummaryData, nameMapping, publicRentalSet, fieldReportsMap, userFavorites, viewedApts]);

  const handleShare = () => {
    if (recommendationResult.items.length < 3) return;
    const { items, isFallback } = recommendationResult;
    shareRecommendationsToKakao({
      apt1: items[0].name,
      score1: items[0].score,
      apt2: items[1].name,
      score2: items[1].score,
      apt3: items[2].name,
      score3: items[2].score,
      fallback: isFallback,
    });
  };

  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    const shareUrl = window.location.origin + '/?from=ai_recommend';
    navigator.clipboard.writeText(shareUrl).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => console.error('Link copy failed:', err));
  };

  const priceFormatter = (priceMan: number) => {
    if (!priceMan || priceMan === 0) return '실거래 정보 없음';
    const rounded = Math.round(priceMan / 100) * 100;
    if (rounded >= 10000) {
      const eok = Math.floor(rounded / 10000);
      const man = rounded % 10000;
      return man > 0 ? `${eok}억 ${man.toLocaleString()}만` : `${eok}억`;
    }
    return `${rounded.toLocaleString()}만`;
  };

  return (
    <div className="flex flex-col bg-surface rounded-2xl shadow-sm border border-border px-5 py-6 w-full relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex justify-between items-center gap-2 mb-5">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-teal-50 dark:bg-teal-950/20 text-[#00d29d] rounded-xl flex items-center justify-center shadow-inner shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[17px] sm:text-[18px] font-extrabold text-primary tracking-tight whitespace-nowrap">
                AI 맞춤 아파트 추천
              </h2>
              <span className="text-[10px] font-black bg-[#00d29d]/10 text-[#00d29d] px-2 py-0.5 rounded-[6px] tracking-wider uppercase">
                {recommendationResult.isFallback ? '인기단지' : '개인화 분석'}
              </span>
            </div>
            <p className="text-[11.5px] text-tertiary font-bold leading-normal">
              {recommendationResult.isFallback 
                ? '단지를 클릭해 상세 정보를 둘러보시면 분석 추천이 시작됩니다' 
                : '최근 조회 및 즐겨찾기 이력을 분석하여 추출한 최적의 단지입니다'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleShare}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-lg text-secondary hover:text-[#00d29d] transition-all cursor-pointer"
            title="카카오톡 결과 공유"
          >
            <Share2 size={16} />
          </button>
          <button
            onClick={handleCopyLink}
            className="px-2.5 py-1.5 bg-body hover:bg-body/80 text-secondary text-[11.5px] font-extrabold rounded-md transition-all border border-border/30 cursor-pointer"
          >
            {isCopied ? '복사 완료' : '링크 복사'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {recommendationResult.items.map((item, index) => (
          <div
            key={item.name}
            onClick={() => onSelectApt && onSelectApt(item.name)}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-border/50 hover:border-[#00d29d]/30 bg-body/20 hover:bg-[#e0fbf4]/5 dark:hover:bg-emerald-950/5 cursor-pointer transition-all duration-200 gap-3 group"
          >
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className={`w-7 h-7 rounded-lg font-black text-[12px] flex items-center justify-center shrink-0 border ${
                index === 0 
                  ? 'bg-[#00d29d] text-white border-transparent' 
                  : 'bg-surface text-secondary dark:bg-zinc-900 border-border/40'
              }`}>
                {index + 1}
              </div>

              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="font-extrabold text-[14.5px] text-primary group-hover:text-[#00d29d] transition-colors truncate">
                    {item.name}
                  </span>
                  <span className="text-[11px] text-tertiary font-bold">{item.dong}</span>
                  <span className="text-[10px] font-extrabold bg-body text-secondary px-1.5 py-0.5 rounded-[4px]">
                    #{item.tag}
                  </span>
                </div>
                <p className="text-[12px] text-secondary font-semibold leading-relaxed break-keep">
                  {item.reason}
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto shrink-0 border-t sm:border-t-0 border-border/30 pt-2 sm:pt-0 gap-1 pl-10 sm:pl-0">
              <div className="flex items-baseline gap-0.5">
                <span className="text-[10px] text-tertiary font-bold tracking-tight mr-1 sm:hidden">매칭률</span>
                <span className="text-[19px] font-black text-[#00d29d] tracking-tighter">{item.score}%</span>
                <span className="text-[11px] font-bold text-tertiary">매칭</span>
              </div>
              <span className="text-[11px] text-secondary font-bold">
                {priceFormatter(item.price)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-border/40 pt-4">
        <div 
          onClick={() => {
            if (recommendationResult.isFallback) {
              if (typeof window !== 'undefined') window.location.hash = '#fit-quiz';
            } else if (onOpenMortgage) {
              onOpenMortgage(recommendationResult.items[0].name);
            }
          }}
          className="flex items-center gap-3.5 px-4 py-3 bg-gradient-to-r from-[#00d29d]/8 to-surface dark:from-[#00d29d]/4 border border-[#00d29d]/15 hover:border-[#00d29d]/40 rounded-xl shadow-[0_2px_12px_rgba(13,148,136,0.02)] hover:shadow-[0_4px_16px_rgba(13,148,136,0.06)] cursor-pointer hover:scale-[1.005] active:scale-[0.995] transition-all duration-200 group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-teal-500/10 rounded-full blur-xl pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="w-9 h-9 bg-teal-50 dark:bg-[#00d29d]/15 text-[#00d29d] dark:text-[#00d29d] rounded-lg flex items-center justify-center shadow-inner shrink-0 group-hover:scale-105 transition-transform">
            <TrendingUp size={16} />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-extrabold text-[#00d29d] dark:text-[#00d29d] bg-[#00d29d]/10 px-2 py-0.5 rounded-[5px] tracking-wider uppercase shrink-0">
                제휴 연계
              </span>
              <span className="text-[12.5px] font-extrabold text-primary tracking-tight truncate">
                {recommendationResult.isFallback 
                  ? '나만의 라이프스타일 퀴즈 풀기' 
                  : `${recommendationResult.items[0].name} 최적 대출 한도 조회`}
              </span>
            </div>
            <p className="text-[11.5px] text-secondary font-bold group-hover:text-[#00d29d] dark:group-hover:text-[#00d29d] transition-colors leading-tight">
              {recommendationResult.isFallback 
                ? '5가지 질문에 답하고 내 맞춤형 아파트를 찾아보세요' 
                : '1금융 정책자금 금리 시뮬레이션을 즉시 시작합니다'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
