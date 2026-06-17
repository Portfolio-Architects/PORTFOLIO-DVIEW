'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Sparkles, HelpCircle, X, ChevronRight, ChevronLeft, Building2, Coins, GraduationCap, Train, TreePine, Check, Share2, Award, Heart, ShieldAlert, Compass, MessageSquare, RefreshCw } from 'lucide-react';
import { DongApartment } from '@/lib/dong-apartments';
import { AptTxSummary } from '@/lib/types/transaction';
import { FieldReportData } from '@/lib/types/report.types';
import { findTxKey, normalizeAptName, HARDCODED_MAPPING } from '@/lib/utils/apartmentMapping';
import { getBrandMultiplier } from '@/lib/utils/scoring';
import { shareRecommendationsToKakao } from '@/lib/utils/kakaoShare';
import { localCache } from '@/lib/utils/localCache';

interface AptFitFinderProps {
  sheetApartments: Record<string, DongApartment[]>;
  txSummaryData: Record<string, AptTxSummary>;
  nameMapping: Record<string, string>;
  publicRentalSet: Set<string>;
  fieldReportsMap: Map<string, FieldReportData>;
  onSelectApt: (name: string) => void;
  isOpen: boolean;
  onClose: () => void;
  locationScores?: Record<string, any>;
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

// Fallback metrics estimator for apartments without Firestore scouting reports
function getEffectiveMetrics(
  apt: DongApartment,
  report: FieldReportData | undefined,
  locationScores?: Record<string, any>,
  nameMapping?: Record<string, string>
) {
  if (report?.metrics) {
    return report.metrics;
  }
  
  // Estimate/Look up based on locationScores
  const name = apt.name;
  const brand = apt.brand || '';
  const householdCount = apt.householdCount || 800;
  const yearBuiltStr = apt.yearBuilt || '2018';
  const yearBuilt = parseInt(yearBuiltStr.substring(0, 4)) || 2018;
  const parkingPerHousehold = 1.25; // default fallback
  
  // Find exact coordinate scores if locationScores is provided
  let locScore: any = null;
  if (locationScores) {
    const matchKey = findTxKey(name, locationScores, nameMapping || {});
    if (matchKey) {
      locScore = locationScores[matchKey];
    }
  }

  // Default values before dong-based fallback
  let distanceToSubway = locScore?.distanceToSubway ?? 2000;
  let distanceToElementary = locScore?.distanceToElementary ?? 350;
  let distanceToPark = 500;
  let academyDensity = locScore?.academyDensity ?? 15;
  const distanceToIndeokwon = locScore?.distanceToIndeokwon ?? 2000;
  const distanceToTram = locScore?.distanceToTram ?? 500;
  let distanceToStarbucks = locScore?.distanceToStarbucks ?? 800;
  
  if (!locScore) {
    const dong = apt.dong || '';
    if (dong.includes('오산동')) {
      distanceToSubway = 500; // Close to Dongtan Station
      distanceToPark = 400; // 여울공원
      academyDensity = 25;
      distanceToStarbucks = 400;
      distanceToElementary = 300;
    } else if (dong.includes('송동') || dong.includes('산척동')) {
      distanceToSubway = 2500; 
      distanceToPark = 250; // 동탄호수공원
      academyDensity = 30; // 호수공원 상권
      distanceToStarbucks = 450;
      distanceToElementary = 400;
    } else if (dong.includes('청계동')) {
      distanceToSubway = 1200; // 시범단지
      distanceToPark = 350; // 청계중앙공원
      academyDensity = 75; // 카림애비뉴 학원가 밀집
      distanceToStarbucks = 300;
      distanceToElementary = 200;
    } else if (dong.includes('영천동')) {
      distanceToSubway = 1800;
      distanceToPark = 500;
      academyDensity = 45; // 11자 상가 학원가
      distanceToStarbucks = 500;
      distanceToElementary = 300;
    } else if (dong.includes('목동')) {
      distanceToSubway = 2800;
      distanceToPark = 400;
      academyDensity = 55; // 목동 항아리 상권 학원가
      distanceToStarbucks = 600;
      distanceToElementary = 250;
    } else if (dong.includes('방교동') || dong.includes('금곡동')) {
      distanceToSubway = 3000;
      distanceToPark = 800;
      academyDensity = 5;
      distanceToStarbucks = 1200;
      distanceToElementary = 600;
    }
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

const AptFitFinder = React.memo(function AptFitFinder({
  sheetApartments,
  txSummaryData,
  nameMapping,
  publicRentalSet,
  fieldReportsMap,
  onSelectApt,
  isOpen,
  onClose,
  locationScores,
}: AptFitFinderProps) {
  const [step, setStep] = useState<number>(0); // 0: Intro, 1-7: Qs, 8: Calculating, 9: Results
  const [answers, setAnswers] = useState<QuizAnswer>({
    budget: '',
    family: '',
    transit: '',
    lifestyle: '',
    scaleBrand: '',
    yearBuilt: '',
    investmentStyle: '',
  });
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const shareTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const mountedRef = React.useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (shareTimeoutRef.current) {
        clearTimeout(shareTimeoutRef.current);
      }
    };
  }, []);

  // Auto transition from calculating screen to results
  useEffect(() => {
    if (step === 8) {
      const timer = setTimeout(() => {
        setStep(9);
      }, 1800); // 1.8s for premium loading feel
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Save quiz answers to localStorage when quiz matches are completed (step 9)
  useEffect(() => {
    if (step === 9) {
      try {
        localCache.set('dview_quiz_answers', answers, 604800); // 7 days TTL
        window.dispatchEvent(new Event('dview_quiz_answers_changed'));
      } catch (e) {
        console.warn('LocalStorage save error (quiz answers):', e);
      }
    }
  }, [step, answers]);

  if (!isOpen) return null;

  const handleSelectOption = (key: keyof QuizAnswer, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(prev => prev - 1);
  };

  const handleReset = () => {
    try {
      localCache.remove('dview_quiz_answers');
      window.dispatchEvent(new Event('dview_quiz_answers_changed'));
    } catch (e) {
      console.warn('LocalStorage remove error (quiz answers):', e);
    }
    setAnswers({
      budget: '',
      family: '',
      transit: '',
      lifestyle: '',
      scaleBrand: '',
      yearBuilt: '',
      investmentStyle: '',
    });
    setStep(0);
  };

  const handleShare = () => {
    if (typeof window === 'undefined') return;
    const shareUrl = window.location.origin + window.location.pathname + '?tab=overview#fit-quiz';
    if (shareTimeoutRef.current) {
      clearTimeout(shareTimeoutRef.current);
      shareTimeoutRef.current = null;
    }
    navigator.clipboard.writeText(shareUrl).then(() => {
      if (!mountedRef.current) return;
      if (shareTimeoutRef.current) {
        clearTimeout(shareTimeoutRef.current);
      }
      setIsCopied(true);
      shareTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setIsCopied(false);
          shareTimeoutRef.current = null;
        }
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy share link:', err);
    });
  };

  const handleKakaoShare = () => {
    if (topRecommendations.length < 3) return;
    shareRecommendationsToKakao({
      apt1: topRecommendations[0].apt.name,
      score1: topRecommendations[0].matchPercentage,
      apt2: topRecommendations[1].apt.name,
      score2: topRecommendations[1].matchPercentage,
      apt3: topRecommendations[2].apt.name,
      score3: topRecommendations[2].matchPercentage,
    });
  };

  // Precompute static apartment metrics & price lookups to reduce CPU load when answers/step changes
  const precomputedApts = useMemo(() => {
    const apts = Object.values(sheetApartments)
      .flat()
      .filter(apt => !publicRentalSet.has(apt.name));

    return apts.map(apt => {
      const report = fieldReportsMap.get(apt.name);
      const m = getEffectiveMetrics(apt, report, locationScores, nameMapping);
      
      const normName = normalizeAptName(apt.name);
      const overrideKey = HARDCODED_MAPPING[normName];
      const txKey = findTxKey(overrideKey || apt.name, txSummaryData, nameMapping) || normName;
      const summary = txSummaryData[txKey];
      
      const salesPrice = summary ? (summary.avg3MPrice || summary.latestPrice || 0) : 0;
      const rentPrice = summary ? (summary.avg3MRentDeposit || summary.latestRentDeposit || 0) : 0;
      const jeonseRatio = salesPrice > 0 && rentPrice > 0 ? (rentPrice / salesPrice) * 100 : 0;

      return {
        apt,
        m,
        salesPrice,
        jeonseRatio
      };
    });
  }, [sheetApartments, publicRentalSet, fieldReportsMap, locationScores, nameMapping, txSummaryData]);

  // Main matching algorithm logic
  const topRecommendations = useMemo(() => {
    if (step !== 9) return [];

    const scoredApts = precomputedApts.map(({ apt, m, salesPrice, jeonseRatio }) => {
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

      // Calculate dynamic matching labels
      const tags: string[] = [];
      if (m.distanceToSubway <= 500) tags.push('역세권');
      if (m.distanceToElementary <= 250) tags.push('초품아');
      if ((m.distanceToPark ?? 9999) <= 300) tags.push('공세권');
      if (m.parkingPerHousehold >= 1.4) tags.push('주차편리');
      if (m.householdCount >= 1500) tags.push('대단지');
      if (m.yearBuilt >= 2021) tags.push('신축');
      if (jeonseRatio >= 70) tags.push('가성비');
      if (m.distanceToStarbucks && m.distanceToStarbucks <= 500) tags.push('스세권');

      // Max absolute score is 145 (35 baseline + 110 from matched weights). Normalize to percentage.
      const matchPercentage = Math.min(99, Math.max(50, Math.round((score / 145) * 100)));

      // 4-Dimensional normalized sub-scores for breakdown (0-100)
      let budgetScoreVal = 50;
      if (salesPrice > 0) {
        if (answers.budget === '3eok') {
          if (salesPrice <= 33000) budgetScoreVal = 100;
          else if (salesPrice <= 40000) budgetScoreVal = 60;
          else budgetScoreVal = 15;
        } else if (answers.budget === '5eok') {
          if (salesPrice > 30000 && salesPrice <= 63000) budgetScoreVal = 100;
          else if (salesPrice > 25000 && salesPrice <= 70000) budgetScoreVal = 60;
          else budgetScoreVal = 15;
        } else if (answers.budget === '8eok') {
          if (salesPrice > 60000 && salesPrice <= 93000) budgetScoreVal = 100;
          else if (salesPrice > 50000 && salesPrice <= 105000) budgetScoreVal = 60;
          else budgetScoreVal = 15;
        } else if (answers.budget === '12eok') {
          if (salesPrice > 90000 && salesPrice <= 145000) budgetScoreVal = 100;
          else if (salesPrice > 80000 && salesPrice <= 165000) budgetScoreVal = 60;
          else budgetScoreVal = 15;
        } else if (answers.budget === 'unlimited') {
          if (salesPrice > 140000) budgetScoreVal = 100;
          else if (salesPrice > 110000) budgetScoreVal = 80;
          else budgetScoreVal = 40;
        }
      }

      let transitScoreVal = 30;
      if (answers.transit === 'gtx') {
        if (m.distanceToSubway <= 600) transitScoreVal = 100;
        else if (m.distanceToSubway <= 1000) transitScoreVal = 70;
        else if (m.distanceToSubway <= 1500) transitScoreVal = 40;
        else transitScoreVal = 20;
      } else if (answers.transit === 'indeokwon') {
        if (m.distanceToIndeokwon && m.distanceToIndeokwon <= 600) transitScoreVal = 100;
        else if (m.distanceToIndeokwon && m.distanceToIndeokwon <= 1100) transitScoreVal = 60;
        else transitScoreVal = 20;
      } else if (answers.transit === 'tram') {
        if (m.distanceToTram && m.distanceToTram <= 400) transitScoreVal = 100;
        else if (m.distanceToTram && m.distanceToTram <= 800) transitScoreVal = 60;
        else transitScoreVal = 20;
      } else if (answers.transit === 'car') {
        const isNearExpressway = ['오산동', '청계동', '영천동'].includes(apt.dong || '');
        let carScore = 0;
        if (m.parkingPerHousehold >= 1.4) carScore += 60;
        else if (m.parkingPerHousehold >= 1.25) carScore += 30;
        if (isNearExpressway) carScore += 40;
        else carScore += 15;
        transitScoreVal = Math.min(100, carScore);
      }

      let educationScoreVal = 30;
      if (answers.family === 'baby') {
        let babyScore = 0;
        if ((m.distanceToPark ?? 9999) <= 400) babyScore += 50;
        if (m.parkingPerHousehold >= 1.3) babyScore += 25;
        if (m.householdCount >= 1000) babyScore += 25;
        educationScoreVal = babyScore;
      } else if (answers.family === 'elementary') {
        if (m.distanceToElementary <= 250) educationScoreVal = 100;
        else if (m.distanceToElementary <= 450) educationScoreVal = 70;
        else if (m.distanceToElementary <= 800) educationScoreVal = 40;
        else educationScoreVal = 20;
      } else if (answers.family === 'middleHigh') {
        if (m.academyDensity >= 50) educationScoreVal = 100;
        else if (m.academyDensity >= 25) educationScoreVal = 70;
        else if (m.academyDensity >= 10) educationScoreVal = 40;
        else educationScoreVal = 20;
      } else if (answers.family === 'none') {
        let noneScore = 0;
        if (m.distanceToStarbucks && m.distanceToStarbucks <= 500) noneScore += 50;
        if (m.academyDensity <= 25) noneScore += 50;
        educationScoreVal = noneScore;
      }

      let lifestyleAcc = 0;
      if (answers.lifestyle === 'nature') {
        if ((m.distanceToPark ?? 9999) <= 300) lifestyleAcc += 15;
        else if ((m.distanceToPark ?? 9999) <= 600) lifestyleAcc += 8;
      } else if (answers.lifestyle === 'shop') {
        if (m.distanceToStarbucks && m.distanceToStarbucks <= 500) lifestyleAcc += 8;
        if (m.academyDensity + (m.householdCount / 100) >= 30) lifestyleAcc += 7;
      } else if (answers.lifestyle === 'quiet') {
        if (m.householdCount >= 1000) lifestyleAcc += 5;
        if (m.distanceToSubway >= 800) lifestyleAcc += 10;
      }

      if (answers.scaleBrand === 'mega') {
        if (m.householdCount >= 1500) lifestyleAcc += 10;
        else if (m.householdCount >= 1000) lifestyleAcc += 6;
        else lifestyleAcc += 2;
      } else if (answers.scaleBrand === 'brand') {
        const mu = getBrandMultiplier(apt.name);
        if (mu >= 1.05) lifestyleAcc += 10;
        else if (mu >= 1.01) lifestyleAcc += 6;
        else lifestyleAcc += 3;
      } else if (answers.scaleBrand === 'costEffective') {
        if (m.householdCount >= 700 && m.householdCount < 1500) lifestyleAcc += 10;
        else lifestyleAcc += 4;
      }

      if (answers.yearBuilt === 'new') {
        if (m.yearBuilt >= 2021) lifestyleAcc += 10;
        else if (m.yearBuilt >= 2018) lifestyleAcc += 6;
        else lifestyleAcc += 2;
      } else if (answers.yearBuilt === 'middle') {
        if (m.yearBuilt >= 2015 && m.yearBuilt < 2021) lifestyleAcc += 10;
        else lifestyleAcc += 4;
      } else if (answers.yearBuilt === 'established') {
        if (m.yearBuilt < 2015) lifestyleAcc += 10;
        else if (m.yearBuilt < 2018) lifestyleAcc += 6;
        else lifestyleAcc += 2;
      }

      if (answers.investmentStyle === 'residence') {
        if (m.distanceToStarbucks && m.distanceToStarbucks <= 600) lifestyleAcc += 5;
        if (m.distanceToElementary <= 300) lifestyleAcc += 5;
      } else if (answers.investmentStyle === 'gap') {
        if (jeonseRatio >= 70) lifestyleAcc += 10;
        else if (jeonseRatio >= 64) lifestyleAcc += 6;
        else lifestyleAcc += 2;
      } else if (answers.investmentStyle === 'value') {
        const isNearPlannedSubway = (m.distanceToTram && m.distanceToTram <= 400) || (m.distanceToIndeokwon && m.distanceToIndeokwon <= 500);
        if (isNearPlannedSubway) lifestyleAcc += 10;
        else lifestyleAcc += 4;
      }
      const lifestyleScoreVal = Math.min(99, Math.max(30, Math.round((lifestyleAcc / 45) * 100)));

      return {
        apt,
        metrics: m,
        salesPrice,
        jeonseRatio,
        matchPercentage,
        tags: tags.slice(0, 3),
        scores: {
          budget: budgetScoreVal,
          transit: transitScoreVal,
          education: educationScoreVal,
          lifestyle: lifestyleScoreVal,
        }
      };
    });

    // Sort by match percentage (descending)
    return scoredApts
      .sort((a, b) => b.matchPercentage - a.matchPercentage)
      .slice(0, 3);
  }, [step, precomputedApts, answers]);

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
    <div 
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="w-full sm:w-[500px] bg-white dark:bg-zinc-950 border-t sm:border border-neutral-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-[420px] sm:min-h-[460px] max-h-[92vh] sm:max-h-[90vh] relative animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3.5 sm:px-6 sm:py-4 border-b border-neutral-100 dark:border-zinc-900 shrink-0">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#00d29d] animate-pulse" />
            <span className="font-extrabold text-[15px] sm:text-[16px] text-primary tracking-tight">나만의 동탄 찰떡 아파트 찾기</span>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-zinc-900 rounded-full transition-colors active:scale-95 cursor-pointer"
          >
            <X className="w-5 h-5 text-tertiary" />
          </button>
        </div>

        {/* Dynamic Step View */}
        <div className="flex-1 overflow-y-auto scrollbar-none p-5 sm:p-6 flex flex-col justify-center min-h-[320px] sm:min-h-[360px]">

          {/* STEP 0: Intro Screen */}
          {step === 0 && (
            <div className="flex flex-col items-center text-center gap-6 py-4">
              <div className="w-16 h-16 bg-gradient-to-tr from-[#00d29d]/20 to-[#4196f7]/20 dark:from-[#00d29d]/10 dark:to-[#4196f7]/10 text-[#00d29d] rounded-2xl flex items-center justify-center shadow-inner scale-110">
                <Building2 size={32} />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-[20px] font-black text-primary tracking-tight leading-snug">
                  나의 라이프스타일에 딱 맞는<br />동탄 최고의 아파트는 어디일까요?
                </h3>
                <p className="text-[13.5px] text-secondary font-semibold leading-relaxed max-w-sm">
                  가용 예산, 아이 교육, 역세권 출퇴근, 조경 등<br />
                  7가지 선택을 기반으로 AI가 100여 개 아파트 단지 중<br />
                  가장 매칭률이 높은 찰떡 단지를 찾아 드립니다.
                </p>
              </div>
              <button
                onClick={() => setStep(1)}
                className="w-full mt-4 py-4 bg-[#00d29d] hover:bg-[#00b386] active:scale-[0.98] text-white text-[15px] font-extrabold rounded-2xl transition-all shadow-md shadow-[#00d29d]/15 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>찰떡 단지 매칭 시작하기</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* STEP 1: Budget Question */}
          {step === 1 && (
            <div className="flex flex-col gap-4 sm:gap-5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-[#00d29d] px-2 py-0.5 bg-[#00d29d]/10 rounded-md">Q1. 예산</span>
                <span className="text-[12.5px] text-tertiary font-bold">1 / 7</span>
              </div>
              <h3 className="text-[16.5px] sm:text-[18px] font-black text-primary leading-tight">
                최대 가용 가능한 아파트 매매가는?
              </h3>
              <div className="flex flex-col gap-2 mt-1.5">
                {[
                  { value: '3eok', label: '3억 원 이하', desc: '남동탄·능동의 실속형 가성비 단지 및 소형 갭투자' },
                  { value: '5eok', label: '3억 ~ 6억 원', desc: '대중적인 인기의 신도시 준신축 및 남동탄 실속 대표 단지' },
                  { value: '8eok', label: '6억 ~ 9억 원', desc: '동탄역 접근성이 우수한 준신축 및 호수공원 인기 단지' },
                  { value: '12eok', label: '9억 ~ 14억 원', desc: '동탄역 시범단지 등 우수한 입지의 핵심 대장 단지' },
                  { value: 'unlimited', label: '14억 원 초과 / 무제한', desc: '동탄역 초역세권 및 호수공원 조망의 하이엔드 랜드마크' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleSelectOption('budget', opt.value)}
                    className="w-full text-left py-2.5 px-3.5 sm:p-4 bg-neutral-50 hover:bg-[#00d29d]/5 border border-transparent hover:border-[#00d29d]/20 dark:bg-zinc-900/50 dark:hover:bg-[#00d29d]/10 dark:hover:border-[#00d29d]/30 rounded-2xl transition-all group flex flex-col gap-0.5 sm:gap-1 cursor-pointer"
                  >
                    <span className="text-[13.5px] sm:text-[14.5px] font-extrabold text-primary group-hover:text-[#00d29d] transition-colors">{opt.label}</span>
                    <span className="text-[10.5px] sm:text-[11.5px] text-tertiary font-medium">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Family/Education Question */}
          {step === 2 && (
            <div className="flex flex-col gap-4 sm:gap-5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-[#00d29d] px-2 py-0.5 bg-[#00d29d]/10 rounded-md">Q2. 자녀/학군</span>
                <span className="text-[12.5px] text-tertiary font-bold">2 / 7</span>
              </div>
              <h3 className="text-[16.5px] sm:text-[18px] font-black text-primary leading-tight">
                가장 중요한 교육 환경이나 자녀 여건은?
              </h3>
              <div className="flex flex-col gap-2 mt-1.5">
                {[
                  { value: 'none', label: '1인 가구 / 자녀 없음', desc: '편리한 역세권 슬세권 상권과 조용하고 쾌적한 나만의 쉼터', icon: Heart },
                  { value: 'baby', label: '영유아 자녀 (보육 및 안심 환경)', desc: '단지 내 국공립 어린이집, 지상 차 없는 도로, 유모차 산책 공원', icon: TreePine },
                  { value: 'elementary', label: '초등학생 자녀 (안전한 초품아)', desc: '큰길을 건너지 않고 안전하게 등교할 수 있는 초품아 단지', icon: GraduationCap },
                  { value: 'middleHigh', label: '중·고등 자녀 (명문 학원가 인접)', desc: '카림애비뉴·남동탄·11자 상가 등 밀집된 학원가 셔틀 및 도보 접근성', icon: Award },
                ].map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleSelectOption('family', opt.value)}
                      className="w-full text-left py-2.5 px-3.5 sm:p-4 bg-neutral-50 hover:bg-[#00d29d]/5 border border-transparent hover:border-[#00d29d]/20 dark:bg-zinc-900/50 dark:hover:bg-[#00d29d]/10 dark:hover:border-[#00d29d]/30 rounded-2xl transition-all group flex items-center gap-3.5 cursor-pointer"
                    >
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-800 shadow-sm border border-neutral-100 dark:border-zinc-700/60 flex items-center justify-center text-secondary group-hover:text-[#00d29d] group-hover:scale-105 transition-all shrink-0">
                        <Icon size={16} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13.5px] sm:text-[14.5px] font-extrabold text-primary group-hover:text-[#00d29d] transition-colors">{opt.label}</span>
                        <span className="text-[10.5px] sm:text-[11.5px] text-tertiary font-medium">{opt.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button onClick={handleBack} className="self-start flex items-center gap-1 text-[12px] sm:text-[12.5px] text-tertiary font-bold hover:text-secondary mt-1 cursor-pointer">
                <ChevronLeft size={14} /> 이전 단계로
              </button>
            </div>
          )}

          {/* STEP 3: Transit Question */}
          {step === 3 && (
            <div className="flex flex-col gap-4 sm:gap-5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-[#00d29d] px-2 py-0.5 bg-[#00d29d]/10 rounded-md">Q3. 교통</span>
                <span className="text-[12.5px] text-tertiary font-bold">3 / 7</span>
              </div>
              <h3 className="text-[16.5px] sm:text-[18px] font-black text-primary leading-tight">
                출퇴근 시 가장 선호하는 교통 요건은?
              </h3>
              <div className="flex flex-col gap-2 mt-1.5">
                {[
                  { value: 'gtx', label: '서울 강남 / 삼성역 광역 통근', desc: '동탄역 GTX-A 및 SRT 도보 역세권으로 서울 강남 20분대 도달', icon: Train },
                  { value: 'indeokwon', label: '수원 / 판교 / 경기서남부 통근', desc: '개통 예정인 동탄인덕원선 역세권으로 인근 주요 도시 연계', icon: Train },
                  { value: 'tram', label: '동탄 신도시 내부 순환 통근', desc: '단지 바로 앞 동탄 트램(정거장) 예정으로 시내 대중교통 최적화', icon: Train },
                  { value: 'car', label: '자차 위주 통근 및 편리한 주차', desc: '세대당 주차 1.4대 이상 여유 공간 및 고속도로 IC 진입 최적', icon: Building2 },
                ].map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleSelectOption('transit', opt.value)}
                      className="w-full text-left py-2.5 px-3.5 sm:p-4 bg-neutral-50 hover:bg-[#00d29d]/5 border border-transparent hover:border-[#00d29d]/20 dark:bg-zinc-900/50 dark:hover:bg-[#00d29d]/10 dark:hover:border-[#00d29d]/30 rounded-2xl transition-all group flex items-center gap-3.5 cursor-pointer"
                    >
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-800 shadow-sm border border-neutral-100 dark:border-zinc-700/60 flex items-center justify-center text-secondary group-hover:text-[#00d29d] group-hover:scale-105 transition-all shrink-0">
                        <Icon size={16} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13.5px] sm:text-[14.5px] font-extrabold text-primary group-hover:text-[#00d29d] transition-colors">{opt.label}</span>
                        <span className="text-[10.5px] sm:text-[11.5px] text-tertiary font-medium">{opt.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button onClick={handleBack} className="self-start flex items-center gap-1 text-[12px] sm:text-[12.5px] text-tertiary font-bold hover:text-secondary mt-1 cursor-pointer">
                <ChevronLeft size={14} /> 이전 단계로
              </button>
            </div>
          )}

          {/* STEP 4: Lifestyle Question */}
          {step === 4 && (
            <div className="flex flex-col gap-4 sm:gap-5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-[#00d29d] px-2 py-0.5 bg-[#00d29d]/10 rounded-md">Q4. 라이프스타일</span>
                <span className="text-[12.5px] text-tertiary font-bold">4 / 7</span>
              </div>
              <h3 className="text-[16.5px] sm:text-[18px] font-black text-primary leading-tight">
                일상의 삶의 질을 높이는 최적의 장소는?
              </h3>
              <div className="flex flex-col gap-2 mt-1.5">
                {[
                  { value: 'nature', label: '동탄호수공원 & 여울공원 숲세권', desc: '도보 300m 이내의 호수공원 랜드마크 및 대규모 공원 산책', icon: TreePine },
                  { value: 'shop', label: '롯데백화점 & 카림상권 중심 인프라', desc: '스타벅스, 롯데백화점, 앨리스빌 등 편리한 도보 슬세권 쇼핑', icon: Coins },
                  { value: 'quiet', label: '넓은 동간 거리와 공원형 조경 쉼터', desc: '동탄순환대로 인접 소음이 없고 단지 내 웅장한 조경 산책로', icon: Building2 },
                ].map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleSelectOption('lifestyle', opt.value)}
                      className="w-full text-left py-2.5 px-3.5 sm:p-4 bg-neutral-50 hover:bg-[#00d29d]/5 border border-transparent hover:border-[#00d29d]/20 dark:bg-zinc-900/50 dark:hover:bg-[#00d29d]/10 dark:hover:border-[#00d29d]/30 rounded-2xl transition-all group flex items-center gap-3.5 cursor-pointer"
                    >
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-800 shadow-sm border border-neutral-100 dark:border-zinc-700/60 flex items-center justify-center text-secondary group-hover:text-[#00d29d] group-hover:scale-105 transition-all shrink-0">
                        <Icon size={16} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13.5px] sm:text-[14.5px] font-extrabold text-primary group-hover:text-[#00d29d] transition-colors">{opt.label}</span>
                        <span className="text-[10.5px] sm:text-[11.5px] text-tertiary font-medium">{opt.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button onClick={handleBack} className="self-start flex items-center gap-1 text-[12px] sm:text-[12.5px] text-tertiary font-bold hover:text-secondary mt-1 cursor-pointer">
                <ChevronLeft size={14} /> 이전 단계로
              </button>
            </div>
          )}

          {/* STEP 5: Scale & Brand Question */}
          {step === 5 && (
            <div className="flex flex-col gap-4 sm:gap-5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-[#00d29d] px-2 py-0.5 bg-[#00d29d]/10 rounded-md">Q5. 단지 규모/브랜드</span>
                <span className="text-[12.5px] text-tertiary font-bold">5 / 7</span>
              </div>
              <h3 className="text-[16.5px] sm:text-[18px] font-black text-primary leading-tight">
                선호하는 단지 규모 및 브랜드 타입은?
              </h3>
              <div className="flex flex-col gap-2 mt-1.5">
                {[
                  { value: 'mega', label: '1,500세대 이상 초대형 랜드마크', desc: '대규모 커뮤니티 시설, 넓은 조경 면적 및 풍부한 환금성 확보', icon: Building2 },
                  { value: 'brand', label: '1군 메이저 브랜드 대장 아파트', desc: '자이·힐스테이트·더샵 등 시공 브랜드 가치와 품질 신뢰도', icon: Award },
                  { value: 'costEffective', label: '700~1,500세대 실속형 중단지', desc: '주거 밀도가 쾌적하고 조용한 실속 있는 생활 밀착형 단지', icon: Coins },
                ].map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleSelectOption('scaleBrand', opt.value)}
                      className="w-full text-left py-2.5 px-3.5 sm:p-4 bg-neutral-50 hover:bg-[#00d29d]/5 border border-transparent hover:border-[#00d29d]/20 dark:bg-zinc-900/50 dark:hover:bg-[#00d29d]/10 dark:hover:border-[#00d29d]/30 rounded-2xl transition-all group flex items-center gap-3.5 cursor-pointer"
                    >
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-800 shadow-sm border border-neutral-100 dark:border-zinc-700/60 flex items-center justify-center text-secondary group-hover:text-[#00d29d] group-hover:scale-105 transition-all shrink-0">
                        <Icon size={16} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13.5px] sm:text-[14.5px] font-extrabold text-primary group-hover:text-[#00d29d] transition-colors">{opt.label}</span>
                        <span className="text-[10.5px] sm:text-[11.5px] text-tertiary font-medium">{opt.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button onClick={handleBack} className="self-start flex items-center gap-1 text-[12px] sm:text-[12.5px] text-tertiary font-bold hover:text-secondary mt-1 cursor-pointer">
                <ChevronLeft size={14} /> 이전 단계로
              </button>
            </div>
          )}

          {/* STEP 6: Year Built Question */}
          {step === 6 && (
            <div className="flex flex-col gap-4 sm:gap-5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-[#00d29d] px-2 py-0.5 bg-[#00d29d]/10 rounded-md">Q6. 연식/트렌드</span>
                <span className="text-[12.5px] text-tertiary font-bold">6 / 7</span>
              </div>
              <h3 className="text-[16.5px] sm:text-[18px] font-black text-primary leading-tight">
                선호하는 아파트의 준공 연식은?
              </h3>
              <div className="flex flex-col gap-2 mt-1.5">
                {[
                  { value: 'new', label: '준공 5년 이내의 최신축', desc: '최신 스마트홈 IoT, 커뮤니티 시설 및 지상 차 없는 쾌적 단지', icon: Sparkles },
                  { value: 'middle', label: '5~10년 차 검증된 준신축', desc: '단지 내 나무 및 정원이 자리잡고 생활권 인프라가 완성된 환경', icon: Building2 },
                  { value: 'established', label: '10년 차 이상 구축 가성비', desc: '평형대가 넓게 뽑히고 입지 대비 실거래가 메리트가 높은 단지', icon: Coins },
                ].map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleSelectOption('yearBuilt', opt.value)}
                      className="w-full text-left py-2.5 px-3.5 sm:p-4 bg-neutral-50 hover:bg-[#00d29d]/5 border border-transparent hover:border-[#00d29d]/20 dark:bg-zinc-900/50 dark:hover:bg-[#00d29d]/10 dark:hover:border-[#00d29d]/30 rounded-2xl transition-all group flex items-center gap-3.5 cursor-pointer"
                    >
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-800 shadow-sm border border-neutral-100 dark:border-zinc-700/60 flex items-center justify-center text-secondary group-hover:text-[#00d29d] group-hover:scale-105 transition-all shrink-0">
                        <Icon size={16} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13.5px] sm:text-[14.5px] font-extrabold text-primary group-hover:text-[#00d29d] transition-colors">{opt.label}</span>
                        <span className="text-[10.5px] sm:text-[11.5px] text-tertiary font-medium">{opt.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button onClick={handleBack} className="self-start flex items-center gap-1 text-[12px] sm:text-[12.5px] text-tertiary font-bold hover:text-secondary mt-1 cursor-pointer">
                <ChevronLeft size={14} /> 이전 단계로
              </button>
            </div>
          )}

          {/* STEP 7: Investment Style Question */}
          {step === 7 && (
            <div className="flex flex-col gap-4 sm:gap-5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-[#00d29d] px-2 py-0.5 bg-[#00d29d]/10 rounded-md">Q7. 투자/자금 성향</span>
                <span className="text-[12.5px] text-tertiary font-bold">7 / 7</span>
              </div>
              <h3 className="text-[16.5px] sm:text-[18px] font-black text-primary leading-tight">
                자산 가치 증식 및 투자 자금 운용 스타일은?
              </h3>
              <div className="flex flex-col gap-2 mt-1.5">
                {[
                  { value: 'residence', label: '실거주 편의성 최우선 (교통/학군)', desc: '생활 밀착형 인프라와 주거 안정성에 초점을 둔 실사용 가치', icon: Heart },
                  { value: 'gap', label: '소액 갭투자 및 전세가율 가성비 우선', desc: '전세가율이 높고 실투자금이 상대적으로 작게 묶이는 소액 투자', icon: Coins },
                  { value: 'value', label: '교통망 추가 예정 호재 (미래 가치)', desc: '인덕원선·트램 예정역 반경 인접 등 중장기 시세 분출 기대', icon: Train },
                ].map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleSelectOption('investmentStyle', opt.value)}
                      className="w-full text-left py-2.5 px-3.5 sm:p-4 bg-neutral-50 hover:bg-[#00d29d]/5 border border-transparent hover:border-[#00d29d]/20 dark:bg-zinc-900/50 dark:hover:bg-[#00d29d]/10 dark:hover:border-[#00d29d]/30 rounded-2xl transition-all group flex items-center gap-3.5 cursor-pointer"
                    >
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-800 shadow-sm border border-neutral-100 dark:border-zinc-700/60 flex items-center justify-center text-secondary group-hover:text-[#00d29d] group-hover:scale-105 transition-all shrink-0">
                        <Icon size={16} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13.5px] sm:text-[14.5px] font-extrabold text-primary group-hover:text-[#00d29d] transition-colors">{opt.label}</span>
                        <span className="text-[10.5px] sm:text-[11.5px] text-tertiary font-medium">{opt.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button onClick={handleBack} className="self-start flex items-center gap-1 text-[12px] sm:text-[12.5px] text-tertiary font-bold hover:text-secondary mt-1 cursor-pointer">
                <ChevronLeft size={14} /> 이전 단계로
              </button>
            </div>
          )}

          {/* STEP 8: Loading/Calculating */}
          {step === 8 && (
            <div className="flex flex-col items-center justify-center gap-6 py-10">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-[#00d29d]/20 border-t-[#00d29d] animate-spin" />
                <Compass className="w-6 h-6 text-[#00d29d] animate-pulse" />
              </div>
              <div className="flex flex-col gap-2 text-center">
                <h4 className="text-[16px] font-black text-primary">당신의 라이프스타일 분석 중...</h4>
                <p className="text-[12.5px] text-tertiary font-semibold">동탄 100여 개 아파트 단지 실거래가 및 인프라 점수를 매칭하고 있습니다.</p>
              </div>
            </div>
          )}

          {/* STEP 9: Recommendation Results */}
          {step === 9 && (
            <div className="flex flex-col gap-5 py-2">
              <div className="text-center mb-1">
                <span className="text-[11px] font-extrabold text-[#00d29d] tracking-wider uppercase bg-[#00d29d]/10 px-2.5 py-1 rounded-full">AI 매칭 분석 완료</span>
                <h3 className="text-[19px] font-black text-primary tracking-tight mt-2.5">당신에게 제안하는 찰떡 단지 TOP 3</h3>
              </div>

              {/* Suggestions Cards Grid */}
              <div className="flex flex-col gap-3">
                {topRecommendations.map((item, index) => {
                  const isExpanded = expandedIndex === index;
                  return (
                    <div
                      key={item.apt.name}
                      className={`group border border-neutral-100 dark:border-zinc-900 rounded-2xl bg-neutral-50/50 dark:bg-zinc-900/30 overflow-hidden transition-all duration-300 ${
                        isExpanded 
                          ? 'ring-1 ring-[#00d29d]/50 shadow-md bg-white dark:bg-zinc-950/80' 
                          : 'hover:border-[#00d29d]/30 dark:hover:border-[#00d29d]/40'
                      }`}
                    >
                      {/* Main Card Header (Clickable to toggle accordion) */}
                      <div 
                        onClick={() => setExpandedIndex(isExpanded ? null : index)}
                        className="p-4 flex items-center justify-between gap-4 cursor-pointer active:scale-[0.99] transition-all relative"
                      >
                        {/* Background glow for rank 1 */}
                        {index === 0 && (
                          <div className="absolute top-0 right-0 w-24 h-24 bg-[#00d29d]/5 rounded-full blur-2xl pointer-events-none" />
                        )}
                        
                        <div className="flex items-center gap-3 min-w-0 relative z-10">
                          {/* Rank Indicator */}
                          <div className={`w-8 h-8 rounded-full font-black text-[14px] flex items-center justify-center shrink-0 shadow-sm border ${
                            index === 0 
                              ? 'bg-[#00d29d] text-white border-transparent' 
                              : 'bg-white text-secondary dark:bg-zinc-800 border-neutral-100 dark:border-zinc-700'
                          }`}>
                            {index + 1}
                          </div>
                          
                          {/* Info */}
                          <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <h4 className="text-[14.5px] font-extrabold text-primary group-hover:text-[#00d29d] transition-colors truncate max-w-[150px] sm:max-w-[200px]" title={item.apt.name}>
                                {item.apt.name}
                              </h4>
                              <span className="text-[10.5px] text-tertiary font-bold shrink-0">{item.apt.dong}</span>
                            </div>
                            {/* Metrics snippet */}
                            <div className="text-[11px] sm:text-[11.5px] text-secondary font-bold flex items-center gap-1.5 flex-wrap">
                              <span>평균가: {priceFormatter(item.salesPrice)}</span>
                              {item.jeonseRatio > 0 && (
                                <>
                                  <span className="text-neutral-300 dark:text-zinc-700">|</span>
                                  <span>전세율: {item.jeonseRatio.toFixed(0)}%</span>
                                </>
                              )}
                            </div>
                            {/* Matching Tags */}
                            <div className="flex gap-1.5 mt-0.5">
                              {item.tags.map(tag => (
                                <span key={tag} className="text-[9.5px] font-extrabold px-1.5 py-0.5 bg-neutral-100 dark:bg-zinc-800/80 text-secondary dark:text-zinc-300 rounded-[4px] tracking-wide">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Match Score Badge & Toggle indicator */}
                        <div className="flex items-center gap-2 shrink-0 relative z-10">
                          <div className="flex flex-col items-end justify-center shrink-0 whitespace-nowrap">
                            <span className="text-[9px] text-tertiary font-bold tracking-tight whitespace-nowrap">매칭률</span>
                            <span className="text-[18px] sm:text-[20px] font-black text-[#00d29d] tracking-tighter tabular-nums whitespace-nowrap">{item.matchPercentage}%</span>
                          </div>
                          <ChevronRight 
                            size={16} 
                            className={`text-tertiary transition-transform duration-300 ${isExpanded ? 'rotate-90 text-[#00d29d]' : ''}`} 
                          />
                        </div>
                      </div>

                      {/* Accordion Detail Breakdown Panel */}
                      <div 
                        className={`transition-all duration-300 ease-in-out overflow-hidden ${
                          isExpanded ? 'max-h-[300px] border-t border-neutral-100 dark:border-zinc-900 bg-neutral-50/30 dark:bg-zinc-950/20' : 'max-h-0'
                        }`}
                      >
                        <div className="p-4 flex flex-col gap-3.5">
                          <div className="text-[11.5px] font-black text-secondary tracking-tight">지표별 매칭 분석 결과</div>
                          
                          {/* 2x2 Grid of Progress Bars */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                            {/* Budget Fit */}
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between items-center text-[10.5px] font-bold text-secondary">
                                <span className="flex items-center gap-1"><Coins size={12} className="text-amber-500" /> 자금 적합성</span>
                                <span className="font-extrabold text-primary">{item.scores.budget}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-neutral-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500" 
                                  style={{ width: `${item.scores.budget}%` }}
                                />
                              </div>
                            </div>

                            {/* Transit Fit */}
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between items-center text-[10.5px] font-bold text-secondary">
                                <span className="flex items-center gap-1"><Train size={12} className="text-[#008262]" /> 교통 편의성</span>
                                <span className="font-extrabold text-primary">{item.scores.transit}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-neutral-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-[#008262] to-[#00d29d] rounded-full transition-all duration-500" 
                                  style={{ width: `${item.scores.transit}%` }}
                                />
                              </div>
                            </div>

                            {/* Education Fit */}
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between items-center text-[10.5px] font-bold text-secondary">
                                <span className="flex items-center gap-1"><GraduationCap size={12} className="text-emerald-500" /> 교육/보육</span>
                                <span className="font-extrabold text-primary">{item.scores.education}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-neutral-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-emerald-400 to-[#00d29d] rounded-full transition-all duration-500" 
                                  style={{ width: `${item.scores.education}%` }}
                                />
                              </div>
                            </div>

                            {/* Lifestyle Fit */}
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between items-center text-[10.5px] font-bold text-secondary">
                                <span className="flex items-center gap-1"><Sparkles size={12} className="text-[#a855f7]" /> 라이프스타일</span>
                                <span className="font-extrabold text-primary">{item.scores.lifestyle}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-neutral-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-[#c084fc] to-[#a855f7] rounded-full transition-all duration-500" 
                                  style={{ width: `${item.scores.lifestyle}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Action Button: View Details */}
                          <button
                            onClick={() => {
                              onSelectApt(item.apt.name);
                              onClose();
                            }}
                            className="w-full py-2.5 bg-[#00d29d] hover:bg-[#00b386] active:scale-[0.98] text-white text-[12px] font-extrabold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer mt-1"
                          >
                            <span>단지 상세 보고서 바로가기</span>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Actions */}
              <div className="flex gap-2 mt-3 shrink-0">
                <button
                  onClick={handleReset}
                  className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-secondary dark:text-zinc-300 text-[12.5px] font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95 border border-transparent"
                >
                  <RefreshCw size={14} />
                  <span>다시 검사</span>
                </button>

                <button
                  onClick={handleKakaoShare}
                  className="flex-1 py-3 bg-[#FEE500] hover:bg-[#FEE500]/90 text-[#3A1D1D] text-[12.5px] font-extrabold rounded-xl transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer border-none shadow-sm font-black"
                >
                  <MessageSquare size={14} />
                  <span>카카오 공유</span>
                </button>

                <button
                  onClick={handleShare}
                  className="flex-1 py-3 bg-neutral-50 hover:bg-neutral-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-850 text-secondary dark:text-zinc-300 text-[12.5px] font-extrabold rounded-xl transition-all cursor-pointer border border-neutral-200/50 dark:border-zinc-800 flex items-center justify-center gap-1 active:scale-95"
                >
                  {isCopied ? (
                    <>
                      <Check size={14} className="text-emerald-500" />
                      <span>복사 완료</span>
                    </>
                  ) : (
                    <>
                      <Share2 size={14} />
                      <span>링크 복사</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

AptFitFinder.displayName = 'AptFitFinder';
export default AptFitFinder;
