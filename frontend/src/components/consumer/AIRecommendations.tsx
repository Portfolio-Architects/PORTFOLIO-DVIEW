'use client';

import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { Sparkles, Share2, Check, ChevronRight, TrendingUp } from 'lucide-react';
import type { DongApartment } from '@/lib/dong-apartments';
import type { AptTxSummary } from '@/lib/types/transaction';
import type { FieldReportData } from '@/lib/types/report.types';
import { findTxKey, normalizeAptName, HARDCODED_MAPPING } from '@/lib/utils/apartmentMapping';
import { shareRecommendationsToKakao } from '@/lib/utils/kakaoShare';
import { getBrandMultiplier } from '@/lib/utils/scoring';

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
  onOpenSellTimingCalculator?: (aptName: string) => void;
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

interface QuizAnswer {
  budget: string;
  family: string;
  transit: string;
  lifestyle: string;
  scaleBrand: string;
  yearBuilt: string;
  investmentStyle: string;
}

function calculateQuizScore(
  apt: DongApartment,
  m: any,
  jeonseRatio: number,
  salesPrice: number,
  answers: QuizAnswer
): number {
  let score = 35; // baseline

  // 1. Budget Question Matching (Total: 25pts)
  if (salesPrice > 0) {
    if (answers.budget === '3eok') {
      if (salesPrice <= 33000) score += 25;
      else if (salesPrice <= 40000) score += 10;
      else score -= 15;
    } else if (answers.budget === '5eok') {
      if (salesPrice > 30000 && salesPrice <= 63000) score += 25;
      else if (salesPrice > 25000 && salesPrice <= 70000) score += 12;
      else score -= 10;
    } else if (answers.budget === '8eok') {
      if (salesPrice > 60000 && salesPrice <= 93000) score += 25;
      else if (salesPrice > 50000 && salesPrice <= 105000) score += 12;
      else score -= 10;
    } else if (answers.budget === '12eok') {
      if (salesPrice > 90000 && salesPrice <= 145000) score += 25;
      else if (salesPrice > 80000 && salesPrice <= 165000) score += 12;
      else score -= 10;
    } else if (answers.budget === 'unlimited') {
      if (salesPrice > 140000) score += 25;
      else if (salesPrice > 110000) score += 15;
      else score += 5;
    }
  } else {
    score += 12; // neutral fallback
  }

  // 2. Family Question Matching (Total: 20pts)
  if (answers.family === 'baby') {
    if ((m.distanceToPark ?? 9999) <= 400) score += 10;
    if (m.parkingPerHousehold >= 1.3) score += 5;
    if (m.householdCount >= 1000) score += 5;
  } else if (answers.family === 'elementary') {
    if (m.distanceToElementary <= 250) score += 20;
    else if (m.distanceToElementary <= 450) score += 12;
    else if (m.distanceToElementary <= 800) score += 5;
  } else if (answers.family === 'middleHigh') {
    if (m.academyDensity >= 50) score += 20;
    else if (m.academyDensity >= 25) score += 12;
    else if (m.academyDensity >= 10) score += 5;
  } else if (answers.family === 'none') {
    if (m.distanceToStarbucks && m.distanceToStarbucks <= 500) score += 10;
    if (m.academyDensity <= 25) score += 10;
  }

  // 3. Transit Question Matching (Total: 20pts)
  if (answers.transit === 'gtx') {
    if (m.distanceToSubway <= 600) score += 20;
    else if (m.distanceToSubway <= 1000) score += 12;
    else if (m.distanceToSubway <= 1500) score += 5;
  } else if (answers.transit === 'indeokwon') {
    if (m.distanceToIndeokwon && m.distanceToIndeokwon <= 600) score += 20;
    else if (m.distanceToIndeokwon && m.distanceToIndeokwon <= 1100) score += 10;
  } else if (answers.transit === 'tram') {
    if (m.distanceToTram && m.distanceToTram <= 400) score += 20;
    else if (m.distanceToTram && m.distanceToTram <= 800) score += 10;
  } else if (answers.transit === 'car') {
    const isNearExpressway = ['오산동', '청계동', '영천동'].includes(apt.dong || '');
    if (m.parkingPerHousehold >= 1.4) score += 12;
    else if (m.parkingPerHousehold >= 1.25) score += 6;
    if (isNearExpressway) score += 8;
    else score += 3;
  }

  // 4. Lifestyle Question Matching (Total: 15pts)
  if (answers.lifestyle === 'nature') {
    if ((m.distanceToPark ?? 9999) <= 300) score += 15;
    else if ((m.distanceToPark ?? 9999) <= 600) score += 8;
  } else if (answers.lifestyle === 'shop') {
    if (m.distanceToStarbucks && m.distanceToStarbucks <= 500) score += 8;
    if (m.academyDensity + (m.householdCount / 100) >= 30) score += 7;
  } else if (answers.lifestyle === 'quiet') {
    if (m.householdCount >= 1000) score += 5;
    if (m.distanceToSubway >= 800) score += 10;
  }

  // 5. Scale & Brand Preference (Total: 10pts)
  if (answers.scaleBrand === 'mega') {
    if (m.householdCount >= 1500) score += 10;
    else if (m.householdCount >= 1000) score += 6;
    else score += 2;
  } else if (answers.scaleBrand === 'brand') {
    const mu = getBrandMultiplier(apt.name);
    if (mu >= 1.05) score += 10;
    else if (mu >= 1.01) score += 6;
    else score += 3;
  } else if (answers.scaleBrand === 'costEffective') {
    if (m.householdCount >= 700 && m.householdCount < 1500) score += 10;
    else score += 4;
  }

  // 6. Year Built Preference (Total: 10pts)
  if (answers.yearBuilt === 'new') {
    if (m.yearBuilt >= 2021) score += 10;
    else if (m.yearBuilt >= 2018) score += 6;
    else score += 2;
  } else if (answers.yearBuilt === 'middle') {
    if (m.yearBuilt >= 2015 && m.yearBuilt < 2021) score += 10;
    else score += 4;
  } else if (answers.yearBuilt === 'established') {
    if (m.yearBuilt < 2015) score += 10;
    else if (m.yearBuilt < 2018) score += 6;
    else score += 2;
  }

  // 7. Investment Style Preference (Total: 10pts)
  if (answers.investmentStyle === 'residence') {
    if (m.distanceToStarbucks && m.distanceToStarbucks <= 600) score += 5;
    if (m.distanceToElementary <= 300) score += 5;
  } else if (answers.investmentStyle === 'gap') {
    if (jeonseRatio >= 70) score += 10;
    else if (jeonseRatio >= 64) score += 6;
    else score += 2;
  } else if (answers.investmentStyle === 'value') {
    const isNearPlannedSubway = (m.distanceToTram && m.distanceToTram <= 400) || (m.distanceToIndeokwon && m.distanceToIndeokwon <= 500);
    if (isNearPlannedSubway) score += 10;
    else score += 4;
  }

  return score;
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
  onOpenSellTimingCalculator,
}: AIRecommendationsProps) {
  const [viewedApts, setViewedApts] = useState<string[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Defer updates of viewed history and quiz answers to maintain 60fps interaction speed
  const deferredViewedApts = useDeferredValue(viewedApts);
  const deferredQuizAnswers = useDeferredValue(quizAnswers);

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

  useEffect(() => {
    const loadQuizAnswers = () => {
      try {
        const answers = JSON.parse(localStorage.getItem('dview_quiz_answers') || 'null');
        setQuizAnswers(answers);
      } catch (e) {
        console.warn('LocalStorage load error (quiz answers):', e);
      }
    };
    loadQuizAnswers();
    window.addEventListener('dview_quiz_answers_changed', loadQuizAnswers);
    return () => window.removeEventListener('dview_quiz_answers_changed', loadQuizAnswers);
  }, []);

  const recommendationResult = useMemo(() => {
    const refsSet = new Set<string>();
    userFavorites.forEach(x => refsSet.add(x));
    deferredViewedApts.forEach(x => refsSet.add(x));

    const allApts = Object.values(sheetApartments).flat();

    // If no history and no quiz answers exist, output fallback popular complexes
    if (refsSet.size === 0 && !deferredQuizAnswers) {
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

        const breakdown = index === 0 ? ['동탄역세권', '대단지'] : (index === 1 ? ['학군우수', '시범단지'] : ['호수공원', '가성비']);

        return {
          name,
          dong: apt?.dong || '동탄동',
          score,
          reason,
          price,
          tag,
          isFallback: true,
          risks: {
            jeonse: 'safe' as const,
            liquidity: 'safe' as const,
          },
          reasonBreakdown: breakdown
        };
      });
      return { items, isFallback: true };
    }

    // Determine if we have history to score against
    const hasHistory = refsSet.size > 0;
    
    let targetPrice = 75000;
    let targetYear = 2018;
    let targetSubway = 2000;
    let targetElementary = 350;
    let targetPark = 500;
    let targetAcademy = 15;
    let targetJeonseRatio = 65;
    let primaryDong = '';

    if (hasHistory) {
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
      targetPrice = priceCount > 0 ? totalPrice / priceCount : 75000;
      targetYear = yearCount > 0 ? totalYear / yearCount : 2018;
      targetSubway = totalSubway / count;
      targetElementary = totalElementary / count;
      targetPark = totalPark / count;
      targetAcademy = totalAcademy / count;
      targetJeonseRatio = jeonseCount > 0 ? totalJeonseRatio / jeonseCount : 65;

      let maxFreq = 0;
      Object.entries(dongFreq).forEach(([dong, freq]) => {
        if (freq > maxFreq) {
          maxFreq = freq;
          primaryDong = dong;
        }
      });
    }

    const candidates = allApts.filter(apt => !refsSet.has(apt.name) && !publicRentalSet.has(apt.name));
    
    const scoredCandidates = candidates.map(apt => {
      const report = fieldReportsMap.get(apt.name);
      const m = getEffectiveMetrics(apt, report);
      
      const txKey = findTxKey(apt.name, txSummaryData, nameMapping);
      const summary = txKey ? txSummaryData[txKey] : null;
      const price = summary ? (summary.avg3MPrice || summary.latestPrice || 0) : 0;
      const rent = summary ? (summary.avg3MRentDeposit || summary.latestRentDeposit || 0) : 0;
      const jeonseRatio = price > 0 && rent > 0 ? (rent / price) * 100 : 0;

      // Compute 3-axis risk metrics
      const jeonseRatePercent = Math.round(jeonseRatio);
      const txCount = summary?.avg3MTxCount || 0;
      const hh = apt.householdCount || 0;

      const isJeonseRisk = jeonseRatePercent >= 80;
      const isJeonseWarning = jeonseRatePercent >= 70 && jeonseRatePercent < 80;
      const isJeonseSafe = jeonseRatePercent < 70;

      const isLiquidityRisk = txCount <= 2;
      const isLiquidityWarning = txCount > 2 && txCount <= 5;
      const isLiquiditySafe = txCount > 5;

      const isVolatilitySafe = hh >= 700;

      const allSafe = isJeonseSafe && isLiquiditySafe && isVolatilitySafe;

      // 1. Calculate History-based Location Fit Score
      let historyScoreNormalized = 0;
      if (hasHistory) {
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

        historyScoreNormalized = Math.min(99, Math.max(52, Math.round((score / 150) * 100)));
      }

      // 2. Calculate Quiz-based Preference Score
      let quizScoreNormalized = 0;
      if (deferredQuizAnswers) {
        const quizRawScore = calculateQuizScore(apt, m, jeonseRatio, price, deferredQuizAnswers);
        quizScoreNormalized = Math.min(99, Math.max(50, Math.round((quizRawScore / 145) * 100)));
      }

      // 3. Merge Scores using Hybrid Weights
      let finalScore = 50;
      if (hasHistory && deferredQuizAnswers) {
        // Hybrid weighting (50% history, 50% quiz)
        finalScore = Math.round(historyScoreNormalized * 0.5 + quizScoreNormalized * 0.5);
      } else if (deferredQuizAnswers) {
        finalScore = quizScoreNormalized;
      } else if (hasHistory) {
        finalScore = historyScoreNormalized;
      }

      // Phase 101: Risk integration penalties and bonuses
      if (deferredQuizAnswers) {
        if (deferredQuizAnswers.investmentStyle === 'gap') {
          if (isJeonseRisk) finalScore -= 15;
          else if (isJeonseWarning) finalScore -= 5;
          
          if (isLiquidityRisk) finalScore -= 8;
        } else if (deferredQuizAnswers.investmentStyle === 'residence') {
          if (isVolatilitySafe) finalScore += 8;
        }
      } else if (hasHistory) {
        if (isJeonseRisk) finalScore -= 5;
        if (isLiquidityRisk) finalScore -= 3;
      }

      finalScore = Math.min(99, Math.max(50, finalScore));

      // 4. Formulate personalized reasons and tags based on quiz parameters
      let reason = '선호하시는 가격대와 연식 조건에 부합하는 균형 잡힌 단지입니다.';
      let tag = '선호매치';

      if (deferredQuizAnswers) {
        if (deferredQuizAnswers.family === 'elementary' && (m.distanceToElementary ?? 350) <= 250) {
          reason = '자녀의 안전한 도보 등하교를 보장하는 단지 직결 안심 초품아 단지입니다.';
          tag = '초품아';
        } else if (deferredQuizAnswers.transit === 'gtx' && (m.distanceToSubway ?? 2000) <= 700) {
          reason = '동탄역 GTX-A 및 SRT 광역 노선 도보 이용이 편리한 역세권 대단지입니다.';
          tag = '광역역세';
        } else if (deferredQuizAnswers.lifestyle === 'nature' && (m.distanceToPark ?? 9999) <= 300) {
          reason = '도보 거리 내 호수공원 및 대형 조경 녹지가 인접해 쾌적한 웰빙 입지입니다.';
          tag = '공세권';
        } else if (deferredQuizAnswers.investmentStyle === 'gap' && jeonseRatio >= 70) {
          reason = '높은 전세가율로 예상 필요 갭이 최소화되는 실투자성 우수 단지입니다.';
          tag = '갭투자';
        } else if (deferredQuizAnswers.yearBuilt === 'new' && (m.yearBuilt ?? 2018) >= 2021) {
          reason = '신축 5년 이내의 준공 연식으로 커뮤니티와 주차 인프라가 우수한 단지입니다.';
          tag = '최신축';
        } else if (deferredQuizAnswers.budget !== 'unlimited' && price > 0) {
          let budgetLimit = 999999;
          if (deferredQuizAnswers.budget === '3eok') budgetLimit = 33000;
          else if (deferredQuizAnswers.budget === '5eok') budgetLimit = 63000;
          else if (deferredQuizAnswers.budget === '8eok') budgetLimit = 93000;
          else if (deferredQuizAnswers.budget === '12eok') budgetLimit = 145000;
          
          if (price <= budgetLimit) {
            reason = '설정하신 매수 가용 예산 범위에 꼭 맞춘 실속형 추천 단지입니다.';
            tag = '예산최적';
          }
        }
      }

      if (tag === '선호매치') {
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
      }

      // Phase 101: 3-axis risk all safe check
      if (allSafe) {
        reason = reason.endsWith('.') ? reason.slice(0, -1) : reason;
        reason += ' 및 3대 핵심 리스크(역전세/유동성/변동성) 진단이 모두 안전한 안심 단지입니다.';
        tag = '안심단지';
      }

      // Formulate reasonBreakdown
      const reasonBreakdown: string[] = [];
      if (allSafe) reasonBreakdown.push('안심단지 🟢');
      
      if (deferredQuizAnswers) {
        if (deferredQuizAnswers.budget !== 'unlimited' && price > 0) {
          let budgetLimit = 999999;
          if (deferredQuizAnswers.budget === '3eok') budgetLimit = 33000;
          else if (deferredQuizAnswers.budget === '5eok') budgetLimit = 63000;
          else if (deferredQuizAnswers.budget === '8eok') budgetLimit = 93000;
          else if (deferredQuizAnswers.budget === '12eok') budgetLimit = 145000;
          if (price <= budgetLimit) reasonBreakdown.push('예산 부합');
        }
        if (deferredQuizAnswers.family === 'elementary' && (m.distanceToElementary ?? 350) <= 250) {
          reasonBreakdown.push('안심 초품아');
        }
        if (deferredQuizAnswers.transit === 'gtx' && (m.distanceToSubway ?? 2000) <= 700) {
          reasonBreakdown.push('동탄역세권');
        }
        if (deferredQuizAnswers.lifestyle === 'nature' && (m.distanceToPark ?? 9999) <= 300) {
          reasonBreakdown.push('숲/공세권');
        }
        if (deferredQuizAnswers.investmentStyle === 'gap' && jeonseRatio >= 70) {
          reasonBreakdown.push('갭투자 유리');
        }
        if (deferredQuizAnswers.yearBuilt === 'new' && (m.yearBuilt ?? 2018) >= 2021) {
          reasonBreakdown.push('신축 선호');
        }
        if (deferredQuizAnswers.scaleBrand === 'brand' && getBrandMultiplier(apt.name) >= 1.05) {
          reasonBreakdown.push('메이저 브랜드');
        }
      }

      // fallback / history-based breakdown items if empty
      if (reasonBreakdown.length === 0) {
        if ((m.distanceToElementary ?? 350) <= 250) reasonBreakdown.push('초품아');
        if ((m.distanceToSubway ?? 2000) <= 600) reasonBreakdown.push('역세권');
        if (jeonseRatio >= 70) reasonBreakdown.push('하방 지지(갭)');
        if ((m.yearBuilt ?? 2018) >= 2021) reasonBreakdown.push('준신축');
        if (m.householdCount >= 1000) reasonBreakdown.push('대단지');
      }

      return {
        name: apt.name,
        dong: apt.dong,
        score: finalScore,
        reason,
        price,
        tag,
        isFallback: false,
        risks: {
          jeonse: isJeonseRisk ? ('danger' as const) : isJeonseWarning ? ('warning' as const) : ('safe' as const),
          liquidity: isLiquidityRisk ? ('danger' as const) : isLiquidityWarning ? ('warning' as const) : ('safe' as const),
        },
        reasonBreakdown
      };
    });

    const sorted = scoredCandidates.sort((a, b) => b.score - a.score).slice(0, 3);
    return { items: sorted, isFallback: false };
  }, [sheetApartments, txSummaryData, nameMapping, publicRentalSet, fieldReportsMap, userFavorites, deferredViewedApts, deferredQuizAnswers]);

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
                {recommendationResult.isFallback 
                  ? '인기단지' 
                  : (viewedApts.length > 0 && quizAnswers) 
                    ? '하이브리드' 
                    : quizAnswers 
                      ? '퀴즈분석' 
                      : '조회분석'}
              </span>
            </div>
            <p className="text-[11.5px] text-tertiary font-bold leading-normal">
              {recommendationResult.isFallback 
                ? '단지를 클릭하거나 퀴즈를 완료하시면 맞춤 추천이 시작됩니다' 
                : (viewedApts.length > 0 && quizAnswers)
                  ? '최근 조회 이력과 라이프스타일 퀴즈 결과를 종합 분석한 단지입니다'
                  : quizAnswers
                    ? '라이프스타일 퀴즈 결과를 분석하여 매칭된 단지입니다'
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
                  {item.reasonBreakdown?.map((b) => (
                    <span key={b} className="text-[9.5px] font-extrabold bg-[#e0fbf4]/60 text-teal-600 dark:bg-emerald-950/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-[4px] border border-teal-500/10">
                      {b}
                    </span>
                  ))}
                </div>
                <p className="text-[12px] text-secondary font-semibold leading-relaxed break-keep">
                  {item.reason}
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto shrink-0 border-t sm:border-t-0 border-border/30 pt-2 sm:pt-0 gap-1 pl-10 sm:pl-0">
              <span className="text-[11px] font-bold text-tertiary whitespace-nowrap shrink-0">
                <span className="text-[10px] mr-1 sm:hidden">매칭률</span>
                <span className="text-[19px] font-black text-[#00d29d] tracking-tighter mr-0.5">{item.score}%</span>
                매칭
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-secondary font-bold">
                  {priceFormatter(item.price)}
                </span>
              </div>
              
              {/* Risks Mini Traffic Lights */}
              <div className="flex gap-1 mt-1 shrink-0">
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-[4px] border ${
                  item.risks.jeonse === 'danger' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200/20' :
                  item.risks.jeonse === 'warning' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200/20' :
                  'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200/20'
                }`}>
                  역전세
                </span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-[4px] border ${
                  item.risks.liquidity === 'danger' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200/20' :
                  item.risks.liquidity === 'warning' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200/20' :
                  'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200/20'
                }`}>
                  유동성
                </span>
              </div>
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
                ? '7가지 질문에 답하고 내 맞춤형 아파트를 찾아보세요' 
                : '1금융 정책자금 금리 시뮬레이션을 즉시 시작합니다'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
