'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Sparkles, HelpCircle, X, ChevronRight, ChevronLeft, Building2, Coins, GraduationCap, Train, TreePine, Check, Share2, Award, Heart, ShieldAlert } from 'lucide-react';
import { DongApartment } from '@/lib/dong-apartments';
import { AptTxSummary } from '@/lib/types/transaction';
import { FieldReportData } from '@/lib/types/report.types';
import { findTxKey, normalizeAptName, HARDCODED_MAPPING } from '@/lib/utils/apartmentMapping';
import { getBrandMultiplier } from '@/lib/utils/scoring';

interface AptFitFinderProps {
  sheetApartments: Record<string, DongApartment[]>;
  txSummaryData: Record<string, AptTxSummary>;
  nameMapping: Record<string, string>;
  publicRentalSet: Set<string>;
  fieldReportsMap: Map<string, FieldReportData>;
  onSelectApt: (name: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface QuizAnswer {
  budget: string;
  family: string;
  transit: string;
  lifestyle: string;
  priority: string;
}

// Fallback metrics estimator for apartments without Firestore scouting reports
function getEffectiveMetrics(apt: DongApartment, report: FieldReportData | undefined) {
  if (report?.metrics) {
    return report.metrics;
  }
  
  // Estimate based on brand, dong, and basic info
  const name = apt.name;
  const brand = apt.brand || '';
  const householdCount = apt.householdCount || 800;
  const yearBuiltStr = apt.yearBuilt || '2018';
  const yearBuilt = parseInt(yearBuiltStr.substring(0, 4)) || 2018;
  const parkingPerHousehold = 1.25; // default fallback
  
  // Approximate distance based on dong
  let distanceToSubway = 2000;
  let distanceToElementary = 350;
  let distanceToPark = 500;
  let academyDensity = 15;
  const distanceToIndeokwon = 2000;
  const distanceToTram = 500;
  let distanceToStarbucks = 800;
  
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

export default function AptFitFinder({
  sheetApartments,
  txSummaryData,
  nameMapping,
  publicRentalSet,
  fieldReportsMap,
  onSelectApt,
  isOpen,
  onClose
}: AptFitFinderProps) {
  const [step, setStep] = useState<number>(0); // 0: Intro, 1-5: Qs, 6: Calculating, 7: Results
  const [answers, setAnswers] = useState<QuizAnswer>({
    budget: '',
    family: '',
    transit: '',
    lifestyle: '',
    priority: '',
  });
  const [isCopied, setIsCopied] = useState(false);

  // Auto transition from calculating screen to results
  useEffect(() => {
    if (step === 6) {
      const timer = setTimeout(() => {
        setStep(7);
      }, 1800); // 1.8s for premium loading feel
      return () => clearTimeout(timer);
    }
  }, [step]);

  if (!isOpen) return null;

  const handleSelectOption = (key: keyof QuizAnswer, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(prev => prev - 1);
  };

  const handleReset = () => {
    setAnswers({
      budget: '',
      family: '',
      transit: '',
      lifestyle: '',
      priority: '',
    });
    setStep(0);
  };

  const handleShare = () => {
    if (typeof window === 'undefined') return;
    const shareUrl = window.location.origin + window.location.pathname + '?tab=overview#fit-quiz';
    navigator.clipboard.writeText(shareUrl).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy share link:', err);
    });
  };

  // Main matching algorithm logic
  const topRecommendations = useMemo(() => {
    if (step !== 7) return [];

    const apts = Object.values(sheetApartments)
      .flat()
      .filter(apt => !publicRentalSet.has(apt.name));

    const scoredApts = apts.map(apt => {
      const report = fieldReportsMap.get(apt.name);
      const m = getEffectiveMetrics(apt, report);
      
      const normName = normalizeAptName(apt.name);
      const overrideKey = HARDCODED_MAPPING[normName];
      const txKey = findTxKey(overrideKey || apt.name, txSummaryData, nameMapping) || normName;
      const summary = txSummaryData[txKey];
      
      const salesPrice = summary ? (summary.avg3MPrice || summary.latestPrice || 0) : 0;
      const rentPrice = summary ? (summary.avg3MRentDeposit || summary.latestRentDeposit || 0) : 0;
      const jeonseRatio = salesPrice > 0 && rentPrice > 0 ? (rentPrice / salesPrice) * 100 : 0;

      let score = 45; // baseline

      // 1. Budget Question Matching (Total: 25pts)
      if (salesPrice > 0) {
        if (answers.budget === '3eok') {
          if (salesPrice <= 33000) score += 25;
          else if (salesPrice <= 40000) score += 10;
          else score -= 15;
        } else if (answers.budget === '5eok') {
          if (salesPrice > 30000 && salesPrice <= 53000) score += 25;
          else if (salesPrice > 25000 && salesPrice <= 60000) score += 12;
          else score -= 10;
        } else if (answers.budget === '8eok') {
          if (salesPrice > 50000 && salesPrice <= 83000) score += 25;
          else if (salesPrice > 42000 && salesPrice <= 92000) score += 12;
          else score -= 10;
        } else if (answers.budget === '12eok') {
          if (salesPrice > 80000 && salesPrice <= 125000) score += 25;
          else if (salesPrice > 70000 && salesPrice <= 140000) score += 12;
          else score -= 10;
        } else if (answers.budget === 'unlimited') {
          if (salesPrice > 120000) score += 25;
          else if (salesPrice > 95000) score += 15;
          else score += 5;
        }
      } else {
        score += 12; // neutral fallback
      }

      // 2. Family Question Matching (Total: 20pts)
      if (answers.family === 'baby') {
        if ((m.distanceToPark ?? 9999) <= 500) score += 10;
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
        score += 8; // neutral
      }

      // 3. Transit Question Matching (Total: 20pts)
      if (answers.transit === 'gtx') {
        if (m.distanceToSubway <= 500) score += 20;
        else if (m.distanceToSubway <= 900) score += 12;
        else if (m.distanceToSubway <= 1400) score += 5;
      } else if (answers.transit === 'indeokwon') {
        if (m.distanceToIndeokwon && m.distanceToIndeokwon <= 600) score += 20;
        else if (m.distanceToIndeokwon && m.distanceToIndeokwon <= 1100) score += 10;
      } else if (answers.transit === 'tram') {
        if (m.distanceToTram && m.distanceToTram <= 400) score += 20;
        else if (m.distanceToTram && m.distanceToTram <= 800) score += 10;
      } else if (answers.transit === 'car') {
        if (m.parkingPerHousehold >= 1.45) score += 20;
        else if (m.parkingPerHousehold >= 1.3) score += 12;
        else if (m.parkingPerHousehold >= 1.2) score += 5;
      }

      // 4. Lifestyle Question Matching (Total: 15pts)
      if (answers.lifestyle === 'nature') {
        if ((m.distanceToPark ?? 9999) <= 300) score += 15;
        else if ((m.distanceToPark ?? 9999) <= 600) score += 8;
      } else if (answers.lifestyle === 'shop') {
        if (m.distanceToStarbucks && m.distanceToStarbucks <= 500) score += 8;
        if (m.academyDensity + (m.householdCount / 100) >= 30) score += 7;
      } else if (answers.lifestyle === 'quiet') {
        if (m.householdCount >= 1200) score += 8;
        if (m.yearBuilt >= 2017) score += 7;
      }

      // 5. Priority Question Matching (Total: 20pts)
      if (answers.priority === 'new') {
        if (m.yearBuilt >= 2021) score += 20;
        else if (m.yearBuilt >= 2018) score += 12;
        else if (m.yearBuilt >= 2015) score += 5;
      } else if (answers.priority === 'brandScale') {
        const mu = getBrandMultiplier(apt.name);
        if (mu >= 1.05) score += 10;
        if (m.householdCount >= 1500) score += 10;
        else if (m.householdCount >= 1000) score += 5;
      } else if (answers.priority === 'gap') {
        if (jeonseRatio >= 72) score += 20;
        else if (jeonseRatio >= 65) score += 12;
        else if (jeonseRatio >= 60) score += 5;
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

      // Max absolute score is 120 (45 baseline + 75 from matched weights). Normalize to percentage.
      const matchPercentage = Math.min(99, Math.max(48, Math.round((score / 120) * 100)));

      return {
        apt,
        metrics: m,
        salesPrice,
        jeonseRatio,
        matchPercentage,
        tags: tags.slice(0, 3),
      };
    });

    // Sort by match percentage (descending)
    return scoredApts
      .sort((a, b) => b.matchPercentage - a.matchPercentage)
      .slice(0, 3);
  }, [step, sheetApartments, publicRentalSet, fieldReportsMap, nameMapping, txSummaryData, answers]);

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
        className="w-full sm:w-[500px] bg-white dark:bg-zinc-950 border-t sm:border border-neutral-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-[460px] max-h-[90vh] relative animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-100 dark:border-zinc-900 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#00d29d] animate-pulse" />
            <span className="font-extrabold text-[16px] text-primary tracking-tight">나만의 동탄 찰떡 아파트 찾기</span>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-zinc-900 rounded-full transition-colors active:scale-95 cursor-pointer"
          >
            <X className="w-5 h-5 text-tertiary" />
          </button>
        </div>

        {/* Dynamic Step View */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center min-h-[360px]">
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
                  5가지 선택을 기반으로 AI가 100여 개 아파트 단지 중<br />
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
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-[#00d29d] px-2 py-0.5 bg-[#00d29d]/10 rounded-md">Q1. 예산</span>
                <span className="text-[12.5px] text-tertiary font-bold">1 / 5</span>
              </div>
              <h3 className="text-[18px] font-black text-primary leading-tight">
                최대 가용 가능한 아파트 매매가는?
              </h3>
              <div className="flex flex-col gap-2.5 mt-2">
                {[
                  { value: '3eok', label: '3억 원 이하', desc: '실속형 가성비 내 집 마련 / 갭투자' },
                  { value: '5eok', label: '3억 ~ 5억 원', desc: '안정적인 가격대의 가성비 대표 단지' },
                  { value: '8eok', label: '5억 ~ 8억 원', desc: '역세권 및 동탄 중심부 준신축 대표 단지' },
                  { value: '12eok', label: '8억 ~ 12억 원', desc: '동탄역 인근 시범단지 등 최고 인프라 선호 단지' },
                  { value: 'unlimited', label: '12억 원 초과 / 무제한', desc: '초고가 동탄 대장 랜드마크 뷰 단지' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleSelectOption('budget', opt.value)}
                    className="w-full text-left p-4 bg-neutral-50 hover:bg-[#00d29d]/5 border border-transparent hover:border-[#00d29d]/20 dark:bg-zinc-900/50 dark:hover:bg-[#00d29d]/10 dark:hover:border-[#00d29d]/30 rounded-2xl transition-all group flex flex-col gap-1 cursor-pointer"
                  >
                    <span className="text-[14.5px] font-extrabold text-primary group-hover:text-[#00d29d] transition-colors">{opt.label}</span>
                    <span className="text-[11.5px] text-tertiary font-medium">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Family/Education Question */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-[#00d29d] px-2 py-0.5 bg-[#00d29d]/10 rounded-md">Q2. 자녀/학군</span>
                <span className="text-[12.5px] text-tertiary font-bold">2 / 5</span>
              </div>
              <h3 className="text-[18px] font-black text-primary leading-tight">
                가장 중요한 교육 환경이나 자녀 여건은?
              </h3>
              <div className="flex flex-col gap-2.5 mt-2">
                {[
                  { value: 'none', label: '1인 가구 / 자녀 없음', desc: '상권 생활 편의 및 조용하고 아늑한 생활', icon: Heart },
                  { value: 'baby', label: '영유아 자녀 (보육/안전 중심)', desc: '단지 내 어린이집, 넉넉한 주차, 인접 공원', icon: TreePine },
                  { value: 'elementary', label: '초등학생 자녀 (안심 도보 통학)', desc: '단지 바로 옆 초등학교(초품아) 우선 배정 단지', icon: GraduationCap },
                  { value: 'middleHigh', label: '중고등 자녀 (대형 학원가 인접)', desc: '밀집된 학원가 셔틀 도보 접근성 및 사교육 학군', icon: Award },
                ].map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleSelectOption('family', opt.value)}
                      className="w-full text-left p-4 bg-neutral-50 hover:bg-[#00d29d]/5 border border-transparent hover:border-[#00d29d]/20 dark:bg-zinc-900/50 dark:hover:bg-[#00d29d]/10 dark:hover:border-[#00d29d]/30 rounded-2xl transition-all group flex items-center gap-4 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 shadow-sm border border-neutral-100 dark:border-zinc-700/60 flex items-center justify-center text-secondary group-hover:text-[#00d29d] group-hover:scale-105 transition-all shrink-0">
                        <Icon size={18} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[14.5px] font-extrabold text-primary group-hover:text-[#00d29d] transition-colors">{opt.label}</span>
                        <span className="text-[11.5px] text-tertiary font-medium">{opt.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button onClick={handleBack} className="self-start flex items-center gap-1 text-[12.5px] text-tertiary font-bold hover:text-secondary mt-1 cursor-pointer">
                <ChevronLeft size={14} /> 이전 단계로
              </button>
            </div>
          )}

          {/* STEP 3: Transit Question */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-[#00d29d] px-2 py-0.5 bg-[#00d29d]/10 rounded-md">Q3. 교통</span>
                <span className="text-[12.5px] text-tertiary font-bold">3 / 5</span>
              </div>
              <h3 className="text-[18px] font-black text-primary leading-tight">
                출퇴근 시 가장 선호하는 교통 요건은?
              </h3>
              <div className="flex flex-col gap-2.5 mt-2">
                {[
                  { value: 'gtx', label: 'GTX-A / SRT (광역 초고속 교통)', desc: '동탄역 도보권 / 서울 강남 20분대 속성 출퇴근', icon: Train },
                  { value: 'indeokwon', label: '동탄인덕원선 (경기서남부 연결)', desc: '수원, 인덕원 연동 개통 예정지 인접', icon: Train },
                  { value: 'tram', label: '동탄 트램 (도시 내부 순환)', desc: '도심 속을 순환하는 미래형 노면전차 인접', icon: Train },
                  { value: 'car', label: '자차 운행 위주 (쾌적한 주차)', desc: '세대당 주차 대수 1.4대 이상의 넓은 주차 공간', icon: Building2 },
                ].map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleSelectOption('transit', opt.value)}
                      className="w-full text-left p-4 bg-neutral-50 hover:bg-[#00d29d]/5 border border-transparent hover:border-[#00d29d]/20 dark:bg-zinc-900/50 dark:hover:bg-[#00d29d]/10 dark:hover:border-[#00d29d]/30 rounded-2xl transition-all group flex items-center gap-4 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 shadow-sm border border-neutral-100 dark:border-zinc-700/60 flex items-center justify-center text-secondary group-hover:text-[#00d29d] group-hover:scale-105 transition-all shrink-0">
                        <Icon size={18} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[14.5px] font-extrabold text-primary group-hover:text-[#00d29d] transition-colors">{opt.label}</span>
                        <span className="text-[11.5px] text-tertiary font-medium">{opt.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button onClick={handleBack} className="self-start flex items-center gap-1 text-[12.5px] text-tertiary font-bold hover:text-secondary mt-1 cursor-pointer">
                <ChevronLeft size={14} /> 이전 단계로
              </button>
            </div>
          )}

          {/* STEP 4: Lifestyle Question */}
          {step === 4 && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-[#00d29d] px-2 py-0.5 bg-[#00d29d]/10 rounded-md">Q4. 라이프스타일</span>
                <span className="text-[12.5px] text-tertiary font-bold">4 / 5</span>
              </div>
              <h3 className="text-[18px] font-black text-primary leading-tight">
                일상의 삶의 질을 높이는 최적의 장소는?
              </h3>
              <div className="flex flex-col gap-2.5 mt-2">
                {[
                  { value: 'nature', label: '공원 및 호수공원 숲세권 산책', desc: '동탄호수공원, 여울공원 등 도보 300m 이내 산책로', icon: TreePine },
                  { value: 'shop', label: '스타벅스 / 롯데백화점 중심가 쇼핑', desc: '도보로 커피, 브런치, 쇼핑이 가능한 슬세권 상권', icon: Coins },
                  { value: 'quiet', label: '단지 내 조경 및 넓은 쾌적한 쉼', desc: '소음 없는 동간 배치, 조용한 분위기, 대단지 산책', icon: Building2 },
                ].map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleSelectOption('lifestyle', opt.value)}
                      className="w-full text-left p-4 bg-neutral-50 hover:bg-[#00d29d]/5 border border-transparent hover:border-[#00d29d]/20 dark:bg-zinc-900/50 dark:hover:bg-[#00d29d]/10 dark:hover:border-[#00d29d]/30 rounded-2xl transition-all group flex items-center gap-4 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 shadow-sm border border-neutral-100 dark:border-zinc-700/60 flex items-center justify-center text-secondary group-hover:text-[#00d29d] group-hover:scale-105 transition-all shrink-0">
                        <Icon size={18} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[14.5px] font-extrabold text-primary group-hover:text-[#00d29d] transition-colors">{opt.label}</span>
                        <span className="text-[11.5px] text-tertiary font-medium">{opt.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button onClick={handleBack} className="self-start flex items-center gap-1 text-[12.5px] text-tertiary font-bold hover:text-secondary mt-1 cursor-pointer">
                <ChevronLeft size={14} /> 이전 단계로
              </button>
            </div>
          )}

          {/* STEP 5: Priority Question */}
          {step === 5 && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-[#00d29d] px-2 py-0.5 bg-[#00d29d]/10 rounded-md">Q5. 최우선 가치</span>
                <span className="text-[12.5px] text-tertiary font-bold">5 / 5</span>
              </div>
              <h3 className="text-[18px] font-black text-primary leading-tight">
                아파트 선택 시 절대 타협할 수 없는 최고 가치는?
              </h3>
              <div className="flex flex-col gap-2.5 mt-2">
                {[
                  { value: 'new', label: '무조건 신축! 세련된 설계', desc: '감가 없는 연식, 첨단 스마트홈, 최신 커뮤니티', icon: Sparkles },
                  { value: 'brandScale', label: '대단지 스펙 & 1군 브랜드', desc: '1000세대 이상의 환금성과 리딩 랜드마크 브랜드', icon: Award },
                  { value: 'gap', label: '안전마진 가성비 & 갭투자', desc: '전세가율 65% 이상으로 하방 가격 방어가 탄탄한 곳', icon: Coins },
                ].map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleSelectOption('priority', opt.value)}
                      className="w-full text-left p-4 bg-neutral-50 hover:bg-[#00d29d]/5 border border-transparent hover:border-[#00d29d]/20 dark:bg-zinc-900/50 dark:hover:bg-[#00d29d]/10 dark:hover:border-[#00d29d]/30 rounded-2xl transition-all group flex items-center gap-4 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 shadow-sm border border-neutral-100 dark:border-zinc-700/60 flex items-center justify-center text-secondary group-hover:text-[#00d29d] group-hover:scale-105 transition-all shrink-0">
                        <Icon size={18} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[14.5px] font-extrabold text-primary group-hover:text-[#00d29d] transition-colors">{opt.label}</span>
                        <span className="text-[11.5px] text-tertiary font-medium">{opt.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button onClick={handleBack} className="self-start flex items-center gap-1 text-[12.5px] text-tertiary font-bold hover:text-secondary mt-1 cursor-pointer">
                <ChevronLeft size={14} /> 이전 단계로
              </button>
            </div>
          )}

          {/* STEP 6: Loading/Calculating */}
          {step === 6 && (
            <div className="flex flex-col items-center justify-center gap-6 py-10">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-[#00d29d]/20 border-t-[#00d29d] animate-spin" />
                <Sparkles className="w-6 h-6 text-[#00d29d] animate-pulse" />
              </div>
              <div className="flex flex-col gap-2 text-center">
                <h4 className="text-[16px] font-black text-primary">당신의 라이프스타일 분석 중...</h4>
                <p className="text-[12.5px] text-tertiary font-semibold">동탄 100여 개 아파트 단지 실거래가 및 인프라 점수를 매칭하고 있습니다.</p>
              </div>
            </div>
          )}

          {/* STEP 7: Recommendation Results */}
          {step === 7 && (
            <div className="flex flex-col gap-5 py-2">
              <div className="text-center mb-1">
                <span className="text-[11px] font-extrabold text-[#00d29d] tracking-wider uppercase bg-[#00d29d]/10 px-2.5 py-1 rounded-full">AI 매칭 분석 완료</span>
                <h3 className="text-[19px] font-black text-primary tracking-tight mt-2.5">당신에게 제안하는 찰떡 단지 TOP 3</h3>
              </div>

              {/* Suggestions Cards Grid */}
              <div className="flex flex-col gap-3">
                {topRecommendations.map((item, index) => (
                  <div
                    key={item.apt.name}
                    onClick={() => {
                      onSelectApt(item.apt.name);
                      onClose();
                    }}
                    className="group border border-neutral-100 hover:border-[#00d29d]/30 dark:border-zinc-900 dark:hover:border-[#00d29d]/40 p-4 rounded-2xl bg-neutral-50/50 hover:bg-[#e0fbf4]/10 dark:bg-zinc-900/30 dark:hover:bg-emerald-950/10 cursor-pointer transition-all flex items-center justify-between gap-4 active:scale-[0.99] relative overflow-hidden"
                  >
                    {/* Background glow for rank 1 */}
                    {index === 0 && (
                      <div className="absolute top-0 right-0 w-24 h-24 bg-[#00d29d]/5 rounded-full blur-2xl pointer-events-none" />
                    )}
                    
                    <div className="flex items-center gap-3 min-w-0">
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
                          <h4 className="text-[14.5px] font-extrabold text-primary group-hover:text-[#00d29d] transition-colors truncate max-w-[180px] sm:max-w-[220px]" title={item.apt.name}>
                            {item.apt.name}
                          </h4>
                          <span className="text-[10.5px] text-tertiary font-bold shrink-0">{item.apt.dong}</span>
                        </div>
                        {/* Metrics snippet */}
                        <div className="text-[11.5px] text-secondary font-bold flex items-center gap-1.5 flex-wrap">
                          <span>평균가: {priceFormatter(item.salesPrice)}</span>
                          {item.jeonseRatio > 0 && (
                            <>
                              <span className="text-neutral-300 dark:text-zinc-700">|</span>
                              <span>전세가율: {item.jeonseRatio.toFixed(0)}%</span>
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

                    {/* Match Score Badge */}
                    <div className="flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] text-tertiary font-bold tracking-tight">매칭률</span>
                      <span className="text-[20px] font-black text-[#00d29d] tracking-tighter tabular-nums">{item.matchPercentage}%</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Actions */}
              <div className="flex gap-3 mt-3 shrink-0">
                <button
                  onClick={handleReset}
                  className="flex-1 py-3.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-secondary dark:text-zinc-300 text-[13.5px] font-extrabold rounded-xl transition-all cursor-pointer text-center"
                >
                  다시 검사하기
                </button>
                <button
                  onClick={handleShare}
                  className="flex-1 py-3.5 bg-[#00d29d] hover:bg-[#00b386] text-white text-[13.5px] font-extrabold rounded-xl transition-all shadow-md shadow-[#00d29d]/10 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isCopied ? (
                    <>
                      <Check size={15} />
                      <span>복사 완료!</span>
                    </>
                  ) : (
                    <>
                      <Share2 size={15} />
                      <span>결과 링크 공유</span>
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
}
