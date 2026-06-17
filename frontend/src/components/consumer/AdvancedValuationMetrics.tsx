'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Target, Building, Info, ChevronDown, Users, Car, Calendar, Train, GraduationCap, Store, TreePine, Award, ShieldCheck, TrendingUp, X, MapPin } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import type { FieldReportData } from '@/lib/DashboardFacade';
import { getBrandMultiplier, calculatePremiumScores } from '@/lib/utils/scoring';
import { calculateDynamicDCF, calculateDongSpread, calculateForwardJeonseTrajectory } from '@/lib/utils/valuationEngine';
import { MACRO_CONFIG } from '@/lib/macro-summary';
import type { AptTxSummary } from '@/lib/types/transaction';
import { normalizeAptName } from '@/lib/utils/apartmentMapping';

interface TxRecord {
  dealType?: string;
  price: number;
  deposit?: number;
  monthlyRent?: number;
  contractYm?: string;
  contractDay?: string;
  contractDate?: string;
}

interface Props {
  report: FieldReportData;
  transactions: TxRecord[];
  txSummaryData?: Record<string, AptTxSummary>;
}

// --------------------------------------------------------------------------
// Helper: Gauge Bar UI
// --------------------------------------------------------------------------
const GaugeBar = ({ score, max }: { score: number, max: number }) => {
  const percent = Math.min(100, Math.max(0, (score / max) * 100));
  
  let colorClassText = 'text-toss-red';
  let colorClassBg = 'bg-toss-red';
  
  if (percent >= 80) { colorClassText = 'text-toss-green'; colorClassBg = 'bg-toss-green'; }
  else if (percent >= 50) { colorClassText = 'text-toss-blue'; colorClassBg = 'bg-toss-blue'; }
  else if (percent >= 30) { colorClassText = 'text-[#f59e0b]'; colorClassBg = 'bg-[#f59e0b]'; }

  return (
    <div className="flex flex-col gap-1.5 w-[90px] shrink-0">
      <div className="flex justify-end items-baseline gap-1">
        <span className={`text-[14px] font-extrabold ${colorClassText}`}>{score}</span>
        <span className="text-[10px] text-tertiary font-medium">/ {max}</span>
      </div>
      <div className="w-full h-1.5 bg-body rounded-full overflow-hidden">
        <div className={`h-full ${colorClassBg} rounded-full transition-all duration-700 ease-out`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

// --------------------------------------------------------------------------
// Utility Score V2 엔진 (Max 100점)
// --------------------------------------------------------------------------
function calculateUtilityScoreV2(report: FieldReportData, overrideScore: number = 0) {
  const m = report.metrics as import('@/lib/types/scoutingReport').ObjectiveMetrics | undefined;
  const premium = calculatePremiumScores(m);
  const d = premium.details;

  if (!d) {
    return {
      total: 0,
      breakDown: { specs: 0, infra: 0 },
      logs: [],
      rawScore: 0,
      isCapped: false,
      maxTotal: 150
    };
  }

  const logs: { icon: React.ElementType; category: string; score: number; max: number; label: string; isInfra: boolean; data?: string; }[] = [
    { icon: Award, category: '브랜드 파워', score: d.brand.score, max: d.brand.max, label: d.brand.label, isInfra: false, data: d.brand.data },
    { icon: Users, category: '단지 규모 (세대수)', score: d.scale.score, max: d.scale.max, label: d.scale.label, isInfra: false, data: d.scale.data },
    { icon: Car, category: '주차 편의성 (세대당)', score: d.parking.score, max: d.parking.max, label: d.parking.label, isInfra: false, data: d.parking.data },
    { icon: Calendar, category: '건축 연식 (감가)', score: d.year.score, max: d.year.max, label: d.year.label, isInfra: false, data: d.year.data },
    { icon: Train, category: 'GTX/SRT 역세권', score: d.gtx.score, max: d.gtx.max, label: d.gtx.label, isInfra: true, data: d.gtx.data },
    { icon: Train, category: '동인선 역세권', score: d.indeokwon.score, max: d.indeokwon.max, label: d.indeokwon.label, isInfra: true, data: d.indeokwon.data },
    { icon: Train, category: '동탄트램 역세권', score: d.tram.score, max: d.tram.max, label: d.tram.label, isInfra: true, data: d.tram.data },
    { icon: GraduationCap, category: '통학 학군 (초등 중심)', score: d.school.score, max: d.school.max, label: d.school.label, isInfra: true, data: d.school.data },
    { icon: GraduationCap, category: '사교육 학군 (학원가)', score: d.academy.score, max: d.academy.max, label: d.academy.label, isInfra: true, data: d.academy.data },
    { icon: Store, category: '거점 상권/학원/앵커', score: d.store.score, max: d.store.max, label: d.store.label, isInfra: true, data: d.store.data },
    { icon: TreePine, category: '자연 환경 (호수/상징공원)', score: d.parkDist.score, max: d.parkDist.max, label: d.parkDist.label, isInfra: true, data: d.parkDist.data },
  ];

  if (overrideScore !== 0) {
    logs.push({
      icon: Award,
      category: '어드민 수동 보정',
      score: overrideScore,
      max: Math.abs(overrideScore),
      label: `실수요자 투표 반영 어드민 수동 보정 (${overrideScore > 0 ? '+' : ''}${overrideScore}점)`,
      isInfra: false
    });
  }

  const breakDown = {
    specs: d.brand.score + d.scale.score + d.parking.score + d.year.score + (overrideScore !== 0 ? overrideScore : 0),
    infra: d.gtx.score + d.indeokwon.score + d.tram.score + d.school.score + d.store.score + d.parkDist.score
  };

  const maxTotal = logs.reduce((sum, log) => sum + log.max, 0);
  const adjustedTotal = Math.max(0, Math.min(maxTotal, premium.totalScore + overrideScore));

  return { total: adjustedTotal, breakDown, logs, rawScore: adjustedTotal, isCapped: false, maxTotal };
}

const AdvancedValuationMetrics = React.memo(function AdvancedValuationMetrics({ report, transactions, txSummaryData = {} }: Props) {
  const [isValuationModalOpen, setIsValuationModalOpen] = useState(false);
  const [isScoreAccordionOpen, setIsScoreAccordionOpen] = useState(false);
  const [macroConfig, setMacroConfig] = useState(MACRO_CONFIG.macroEnvironment);
  const [overrideScore, setOverrideScore] = useState(0);
  const [simBaseRate, setSimBaseRate] = useState(3.25);
  const [simGrowthRate, setSimGrowthRate] = useState(2.0);
  const [isCopiedScenario, setIsCopiedScenario] = useState(false);
  const [commuteDest, setCommuteDest] = useState<'gangnam' | 'pangyo' | 'samseong'>('gangnam');
  const [isCopiedCommute, setIsCopiedCommute] = useState(false);

  const copiedScenarioTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const copiedCommuteTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const mountedRef = React.useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (copiedScenarioTimeoutRef.current) {
        clearTimeout(copiedScenarioTimeoutRef.current);
      }
      if (copiedCommuteTimeoutRef.current) {
        clearTimeout(copiedCommuteTimeoutRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // 1. 단지별 출퇴근 시간 및 교통 프리미엄 계산
  const commuteAnalysis = useMemo(() => {
    if (!report || !report.metrics) {
      return {
        linkTime: 20,
        transitTime: 42,
        totalTime: 70,
        savedTime: 0,
        premium: 0,
        method: '도보/트램 연계 + 광역버스'
      };
    }

    const m = report.metrics as any;
    const distSubway = typeof m.distanceToSubway === 'number' ? m.distanceToSubway : 2000;
    const distTram = typeof m.distanceToTram === 'number' ? m.distanceToTram : 1000;

    // 동탄역까지의 최적 연계 시간 (분)
    const walkToSubway = distSubway / 80; // 분 (도보 80m/min)
    const tramToSubway = distTram / 250 + 5; // 분 (트램 250m/min + 대기/환승 5분)
    const linkTimeToSubway = Math.min(walkToSubway, tramToSubway);

    let transitTime = 42; // 기본 강남역
    let method = '동탄역 연계 + GTX-A';

    if (commuteDest === 'gangnam') {
      transitTime = 42; // GTX-A 수서 + 수인분당선/2호선 환승
      method = '동탄역 연계 + GTX-A + 수인분당선';
    } else if (commuteDest === 'pangyo') {
      transitTime = 20; // GTX-A 성남 + 경강선 환승
      method = '동탄역 연계 + GTX-A + 경강선';
    } else if (commuteDest === 'samseong') {
      transitTime = 22; // GTX-A 삼성역 직통
      method = '동탄역 연계 + GTX-A';
    }

    const linkTime = Math.round(linkTimeToSubway);
    const totalTime = linkTime + transitTime + 8; // 목적지 도보 8분 고정 가산
    const savedTime = Math.max(0, 60 - totalTime); // 60분 기준 단축 시간
    const premium = savedTime * 0.015; // 10분 단축 시 +0.15%p 성장률 프리미엄

    return {
      linkTime,
      transitTime,
      totalTime,
      savedTime,
      premium,
      method
    };
  }, [report, commuteDest]);

  useEffect(() => {
    let active = true;
    const fetchOverrides = async () => {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebaseConfig');
        const docRef = doc(db, 'settings/valuation_overrides');
        const docSnap = await getDoc(docRef);
        if (!active) return;
        if (docSnap.exists()) {
          const data = docSnap.data();
          const normName = normalizeAptName(report.apartmentName);
          if (data && data[normName] !== undefined) {
            setOverrideScore(Number(data[normName]));
          } else {
            setOverrideScore(0);
          }
        } else {
          setOverrideScore(0);
        }
      } catch (err) {
        if (active) {
          console.error('Failed to load valuation overrides:', err);
        }
      }
    };
    fetchOverrides();
    return () => {
      active = false;
    };
  }, [report.apartmentName]);

  useEffect(() => {
    let active = true;
    const fetchMacroRates = async () => {
      try {
        const res = await fetch('/api/macro/rates');
        if (res.ok) {
          const json = await res.json();
          if (active && json.success && json.data) {
            setMacroConfig(prev => ({
              ...prev,
              ...(json.data.riskFreeRate ? { riskFreeRate: json.data.riskFreeRate } : {}),
              ...(json.data.fundingCost ? { fundingCost: json.data.fundingCost } : {}),
            }));
          }
        }
      } catch (err) {
        if (active) {
          console.error('Failed to fetch real-time macro rates:', err);
        }
      }
    };
    fetchMacroRates();
    return () => {
      active = false;
    };
  }, []);

  // 3개월 기준일 계산 (가치평가 이평선)
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());

  const isRecent = (t: TxRecord) => {
    if (!t.contractYm || t.contractYm.length < 6) return false;
    const y = parseInt(t.contractYm.slice(0, 4));
    const m = parseInt(t.contractYm.slice(4, 6));
    const d = parseInt(t.contractDay || '1');
    const txDate = new Date(y, m - 1, d);
    return txDate >= threeMonthsAgo;
  };

  // 1. Transaction 분리
  const txList = Array.isArray(transactions) ? transactions : [];
  const sales = txList.filter(t => t && t.dealType !== '전세' && t.dealType !== '월세').sort((a,b) => (b.contractDate || '').localeCompare(a.contractDate || ''));
  const rents = txList.filter(t => t && (t.dealType === '전세' || t.dealType === '월세')).sort((a,b) => (b.contractDate || '').localeCompare(a.contractDate || ''));
  
  const recentSales = sales.filter(isRecent);
  const recentRents = rents.filter(isRecent);

  // 3개월 평균 매매가 (최근 3개월 거래 없으면 가장 마지막 거래 1건 폴백 적용)
  const avg3MSale = recentSales.length > 0
    ? Math.round(recentSales.reduce((sum, t) => sum + t.price, 0) / recentSales.length)
    : (sales.length > 0 ? sales[0].price : 0);
  
  const getJeonseEq = (t: TxRecord) => t.dealType === '월세' 
    ? (t.deposit || 0) + Math.round((t.monthlyRent || 0) * 12 / 0.055) 
    : (t.deposit || t.price || 0);

  // 3개월 평균 전세가 (최근 3개월 거래 없으면 가장 마지막 거래 1건 폴백 적용)
  const avg3MRent = recentRents.length > 0
    ? Math.round(recentRents.reduce((sum, t) => sum + getJeonseEq(t), 0) / recentRents.length)
    : (rents.length > 0 ? getJeonseEq(rents[0]) : 0);

  // 2. 매매가/전세가 배수 계산 (1건 대신 최근 3개월 평균치 적용)
  const realEstatePER = (avg3MSale > 0 && avg3MRent > 0) ? (avg3MSale / avg3MRent) : 0;
  const jeonseRatio = (avg3MSale > 0 && avg3MRent > 0) ? (avg3MRent / avg3MSale) * 100 : 0;

  // --- 동태적 가치평가 및 거시/상대평가 모델 적용 ---
  const dongName = report.apartmentName.includes('동탄') ? '동탄2신도시' : '화성시';
  const pipeline = MACRO_CONFIG.supplyPipelines[dongName] || MACRO_CONFIG.supplyPipelines['화성시'];
  
  // 0. 전월세전환율 동적 스프레드 산출 (입지 및 주택유형 반영)
  let conversionRateSpread = 0;
  const spreadReasons: string[] = [];
  
  if (report && report.metrics) {
    const m = report.metrics as import('@/lib/types/scoutingReport').ObjectiveMetrics & Record<string, unknown>;
    
    // 교통 (역세권 프리미엄 vs 외곽 패널티)
    if (m && typeof m.distanceToSubway === 'number') {
      if (m.distanceToSubway <= 500) {
        conversionRateSpread -= 0.005;
        spreadReasons.push('역세권(-0.5%p)');
      } else if (m.distanceToSubway > 1200) {
        conversionRateSpread += 0.005;
        spreadReasons.push('외곽(+0.5%p)');
      }
    }

    // 연식 및 브랜드 (신축/랜드마크 프리미엄 vs 구축 패널티)
    if (m) {
      const year = m.yearBuilt ? parseInt(String(m.yearBuilt).substring(0, 4)) : new Date().getFullYear();
      const age = !isNaN(year) ? new Date().getFullYear() - year + 1 : 10;
      const mu = getBrandMultiplier(m.brand || report.apartmentName || '');
      
      if (age <= 5 || mu >= 1.09) {
        conversionRateSpread -= 0.005;
        spreadReasons.push('신축/1군(-0.5%p)');
      } else if (age > 15) {
        conversionRateSpread += 0.005;
        spreadReasons.push('구축감가(+0.5%p)');
      }
    }
  }

  const dynamicConversionRate = Math.max(0.035, Math.min(0.065, macroConfig.jeonseConversionRate + conversionRateSpread));
  const dynamicMacroConfig = { ...macroConfig, jeonseConversionRate: dynamicConversionRate };

  // 1. Dynamic DCF (거시 금리 연동 및 동적 전환율 적용)
  const utilityScoreResult = calculateUtilityScoreV2(report, overrideScore);
  const dcf = calculateDynamicDCF(avg3MRent, dynamicMacroConfig, 1.5, utilityScoreResult.total, commuteAnalysis.premium);
  // 2. Dong Spread (인접 단지 상대평가) - 실제 데이터 연동
  const targetDongMatch = report.apartmentName.match(/\[(.*?)\]/);
  let targetDong = targetDongMatch ? targetDongMatch[1] : '';
  
  // [동] 접두사가 없는 경우, txSummaryData에서 아파트명 매칭으로 dong 역추적
  if (!targetDong) {
    const norm = normalizeAptName(report.apartmentName);
    for (const [key, tx] of Object.entries(txSummaryData)) {
      if (normalizeAptName(key) === norm && tx.dong) {
        targetDong = tx.dong;
        break;
      }
    }
  }
  
  const realDongPERs = Object.values(txSummaryData)
    .filter(tx => tx.dong === targetDong && tx.dong !== '' && (tx.avg3MPrice || 0) > 0 && (tx.avg3MRentDeposit || 0) > 0)
    .map(tx => (tx.avg3MPrice as number) / (tx.avg3MRentDeposit as number));

  const spreadData = calculateDongSpread(realEstatePER, realDongPERs.length > 0 ? realDongPERs : (realEstatePER > 0 ? [realEstatePER] : []));

  // 3. Forward Trajectory (미래 궤적)
  const trajectory = calculateForwardJeonseTrajectory(avg3MRent, pipeline);
  // ---------------------------------------------------

  useEffect(() => {
    if (dcf.growthRate > 0) {
      setSimGrowthRate(Math.round(dcf.growthRate * 10) / 10);
    }
  }, [dcf.growthRate, report.apartmentName]);

  // 4. 거시경제 시나리오 시뮬레이션
  const simulatedDCF = useMemo(() => {
    const baseRateDiff = simBaseRate - 3.25;
    const simRiskFree = Math.max(0.5, macroConfig.riskFreeRate + baseRateDiff);
    const simFunding = Math.max(1.0, macroConfig.fundingCost + baseRateDiff);

    const fundingSpread = Math.max(0, simFunding - 4.0) * 0.5;
    const discountRate = (simRiskFree + 1.5 + fundingSpread) / 100;

    const growthRate = (simGrowthRate + commuteAnalysis.premium) / 100;
    const capRate = Math.max(0.01, discountRate - growthRate);
    const annualRent = avg3MRent * dynamicConversionRate;
    const impliedValue = annualRent / capRate;

    const simJeonsePrice = Math.max(0, Math.round(avg3MRent * (1 - baseRateDiff * 0.06)));
    const simGap = Math.max(0, avg3MSale - simJeonsePrice);
    const simJeonseRatio = avg3MSale > 0 ? (simJeonsePrice / avg3MSale) * 100 : 0;

    return {
      discountRate: discountRate * 100,
      growthRate: growthRate * 100,
      capRate: capRate * 100,
      impliedValue,
      simJeonsePrice,
      simGap,
      simJeonseRatio
    };
  }, [simBaseRate, simGrowthRate, macroConfig, avg3MRent, dynamicConversionRate, avg3MSale]);

  const handleCopyScenario = () => {
    const rateStatus = simBaseRate > 3.25 ? '금리 인상기' : simBaseRate < 3.25 ? '금리 인하기' : '금리 유지';
    const fairChangePercent = dcf.impliedValue > 0 ? ((simulatedDCF.impliedValue - dcf.impliedValue) / dcf.impliedValue) * 100 : 0;
    const fairChangeText = fairChangePercent > 0 
      ? `현재 대비 +${fairChangePercent.toFixed(1)}% 상승` 
      : fairChangePercent < 0 
        ? `현재 대비 ${fairChangePercent.toFixed(1)}% 하락` 
        : '변동 없음';

    const currentGap = avg3MSale - avg3MRent;
    const gapDiff = simulatedDCF.simGap - currentGap;
    const gapDiffText = gapDiff > 0 
      ? `필요한 갭투자금 ${formatPrice(gapDiff)} 증가` 
      : gapDiff < 0 
        ? `필요한 갭투자금 ${formatPrice(Math.abs(gapDiff))} 감소 (절감)` 
        : '갭투자금 변동 없음';

    const reportText = `[D-VIEW 가치평가 시나리오 분석 리포트]
단지명: ${report.apartmentName}
시나리오 적용: 기준금리 ${simBaseRate.toFixed(2)}% (상태: ${rateStatus}), 기대상승률 ${simGrowthRate.toFixed(1)}%

[분석 결과]
- 시뮬레이션 적정가 (DCF): ${formatPrice(simulatedDCF.impliedValue)} (${fairChangeText})
- 시뮬레이션 전세가: ${formatPrice(simulatedDCF.simJeonsePrice)} (전세가율: ${simulatedDCF.simJeonseRatio.toFixed(1)}%)
- 시뮬레이션 갭투자금: ${formatPrice(simulatedDCF.simGap)} (${gapDiffText})

본 리포트는 D-VIEW 밸류에이션 엔진으로 작성되었습니다.`;

    if (copiedScenarioTimeoutRef.current) {
      clearTimeout(copiedScenarioTimeoutRef.current);
      copiedScenarioTimeoutRef.current = null;
    }
    navigator.clipboard.writeText(reportText).then(() => {
      if (!mountedRef.current) return;
      if (copiedScenarioTimeoutRef.current) {
        clearTimeout(copiedScenarioTimeoutRef.current);
      }
      setIsCopiedScenario(true);
      copiedScenarioTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setIsCopiedScenario(false);
          copiedScenarioTimeoutRef.current = null;
        }
      }, 2000);
    }).catch(err => {
      console.error('시나리오 복사 실패:', err);
    });
  };

  // 5. 상태 평가 로직
  let statusText = '데이터 부족';
  let statusColor = 'text-tertiary';
  let statusBg = 'bg-body';
  let StatusIcon = Info;
  let descriptionText = '최근 매매/전세 실거래가 데이터가 부족하여 분석할 수 없습니다.';

  if (realEstatePER > 0) {
    if (realEstatePER < 1.4) {
      statusText = '안전구간 (가격 방어력 우수)';
      statusColor = 'text-toss-green';
      statusBg = 'bg-toss-green/10 border-toss-green/20';
      StatusIcon = ShieldCheck;
      descriptionText = '실거주 인기가 높아 전세가와 매매가 차이가 적습니다.\n단, 전세가 하락 시 집값이 크게 흔들릴 수 있습니다.';
    } else if (realEstatePER < 1.6) {
      statusText = '안정구간 (적정 안전마진)';
      statusColor = 'text-[#10b981]';
      statusBg = 'bg-[#10b981]/10 border-[#10b981]/20';
      StatusIcon = ShieldCheck;
      descriptionText = '경제가 흔들려도 집값이 잘 버티며,\n실제로 살고 싶어 하는 수요가 가격을 든든하게 받쳐줍니다.';
    } else if (realEstatePER < 1.8) {
      statusText = '평균구간 (시장의 균형점)';
      statusColor = 'text-toss-blue';
      statusBg = 'bg-toss-blue/10 border-toss-blue/20';
      StatusIcon = Target;
      descriptionText = '수도권 아파트들이 일반적으로 갖춘 가치와\n사람들의 보편적인 선호도를 가장 평범하게 보여줍니다.';
    } else if (realEstatePER <= 2.2) {
      statusText = '성장구간 (미래 기대감 반영)';
      statusColor = 'text-[#f59e0b]';
      statusBg = 'bg-[#f59e0b]/10 border-[#f59e0b]/20';
      StatusIcon = TrendingUp;
      descriptionText = '좋은 학군이나 교통망 덕분에 나중에 집값이 오를 것이란\n기대감이 이미 현재 가격에 포함되어 있습니다.';
    } else {
      statusText = '투자집중구간 (큰 수익 기대)';
      statusColor = 'text-toss-red';
      statusBg = 'bg-toss-red/10 border-[#f04452]/20';
      StatusIcon = TrendingUp;
      descriptionText = '재건축 등 호재를 노린 투자금이 몰린 곳으로,\n은행 금리가 오르면 가격이 급락할 수 있으니 주의하세요.';
    }
  }

  // 가격 포맷 헬퍼 (백만원 단위로 반올림 및 소수점 삭제)
  const formatPrice = (p: number) => {
    if (p === 0) return '정보 없음';
    
    const rounded = Math.round(p / 100) * 100;
    
    if (rounded >= 10000) {
      const eok = Math.floor(rounded / 10000);
      const man = rounded % 10000;
      return man > 0 ? `${eok}억 ${man.toLocaleString()}만` : `${eok}억`;
    }
    return `${rounded.toLocaleString()}만`;
  };

  const hasData = realEstatePER > 0 || utilityScoreResult.total > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <h2 className="text-[20px] font-bold text-primary flex items-center gap-2">
        <Target size={22} className="text-toss-blue" strokeWidth={2.5} />
        밸류에이션 분석
      </h2>

      {hasData ? (
        <div className="bg-surface border border-border rounded-3xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          {/* Card Title */}
          <div className="p-6 border-b border-body bg-body/20">
            <h3 className="text-[16px] font-black text-primary flex items-center gap-2">
              <ShieldCheck size={18} className="text-toss-blue" />
              D-VIEW 종합 가치평가 대시보드
            </h3>
            <p className="text-[12px] text-tertiary mt-1 font-medium">
              실거래 배수(PER), 금리 연동 적정가(DCF), 상품성 점수(Utility Score)를 종합 분석한 결과입니다.
            </p>
          </div>

          <div className="divide-y divide-body">
            {/* Section 1: 실거래가 & PER 배수 */}
            {realEstatePER > 0 ? (
              <div className="p-6">
                <h4 className="text-[14.5px] md:text-[15px] font-extrabold text-primary mb-4 flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-toss-blue rounded-full inline-block" />
                  1. 실거래 배수 분석 (PER)
                </h4>
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left: Data Components */}
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="bg-body border border-border rounded-2xl p-5 flex flex-col justify-center gap-4 h-full">
                      <h5 className="text-[13px] md:text-[13.5px] font-extrabold text-secondary">기준 실거래 데이터</h5>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[12.5px] md:text-[13px] text-secondary font-bold">3개월 평균 매매가</span>
                          <span className="text-[14.5px] md:text-[15px] font-extrabold text-primary">{formatPrice(avg3MSale)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[12.5px] md:text-[13px] text-secondary font-bold">3개월 평균 전세가</span>
                          <span className="text-[14.5px] md:text-[15px] font-extrabold text-emerald-700 dark:text-toss-blue">{formatPrice(avg3MRent)}</span>
                        </div>
                        <div className="h-px w-full bg-border/60 my-0.5" />
                        <div className="flex items-center justify-between">
                          <span className="text-[12.5px] md:text-[13px] text-secondary font-bold">도출된 전세가율</span>
                          <span className="text-[14.5px] md:text-[15px] font-extrabold text-primary bg-surface px-2 py-0.5 rounded shadow-sm border border-border">
                            {jeonseRatio > 0 ? `${jeonseRatio.toFixed(1)}%` : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Right: Main PER Metric Box */}
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex flex-col items-center justify-center pb-4">
                      <div className="text-[12px] font-bold text-tertiary mb-1 cursor-pointer hover:text-secondary transition-colors" onClick={() => setIsValuationModalOpen(true)}>
                        매매가 ÷ 전세가 배수
                      </div>
                      <div className="flex items-end gap-1.5">
                        <span className="text-[44px] font-black text-primary leading-none tracking-tighter">
                          {realEstatePER.toFixed(2)}
                        </span>
                        <span className="text-[16px] font-extrabold text-tertiary mb-1">배</span>
                      </div>
                    </div>
                    {/* Status Alert */}
                    <div className={`p-4 rounded-xl border flex gap-3 items-start ${statusBg}`}>
                      <StatusIcon size={20} className={`${statusColor} shrink-0 mt-0.5`} />
                      <div className="flex flex-col gap-1.5">
                        <h5 className={`text-[14px] font-extrabold ${statusColor}`}>{statusText}</h5>
                        <p className="text-[12.5px] text-secondary leading-relaxed font-medium whitespace-pre-line">
                          {descriptionText}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-tertiary text-[13px]">
                실거래 데이터 부족으로 배수 분석을 제공하지 않습니다.
              </div>
            )}

            {/* Section 1-2: 핵심지 출퇴근 시뮬레이터 */}
            {realEstatePER > 0 ? (
              <div className="p-6 border-t border-body">
                <h4 className="text-[14.5px] md:text-[15px] font-extrabold text-primary mb-4 flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-[#4196f7] rounded-full inline-block" />
                  교통 입지 가치 및 핵심지 출퇴근 시뮬레이터
                </h4>

                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left: Destination tabs & Simulator details */}
                  <div className="flex-1 flex flex-col gap-4">
                    <div className="flex bg-[#f2f4f6] dark:bg-zinc-800 p-0.5 rounded-xl border border-border/10">
                      {[
                        { id: 'gangnam', label: '강남역' },
                        { id: 'pangyo', label: '판교역' },
                        { id: 'samseong', label: '삼성역' }
                      ].map(dest => (
                        <button
                          key={dest.id}
                          type="button"
                          onClick={() => setCommuteDest(dest.id as any)}
                          className={`flex-1 py-2 rounded-lg text-[12px] font-bold transition-all cursor-pointer border-none ${
                            commuteDest === dest.id
                              ? 'bg-white dark:bg-zinc-700 text-primary shadow-sm'
                              : 'text-secondary hover:text-primary bg-transparent'
                          }`}
                        >
                          {dest.label}
                        </button>
                      ))}
                    </div>

                    <div className="bg-body border border-border rounded-2xl p-5 flex flex-col gap-3.5">
                      <div className="flex justify-between items-center text-[12.5px]">
                        <span className="text-tertiary font-bold">최적 대중교통 경로</span>
                        <span className="font-bold text-secondary text-right">{commuteAnalysis.method}</span>
                      </div>
                      <div className="h-px w-full bg-border/40" />
                      <div className="flex justify-between items-center text-[12.5px]">
                        <span className="text-tertiary font-bold">동탄역 연계 (트램/도보)</span>
                        <span className="font-extrabold text-primary">{commuteAnalysis.linkTime}분</span>
                      </div>
                      <div className="flex justify-between items-center text-[12.5px]">
                        <span className="text-tertiary font-bold">광역철도 탑승 (GTX-A 등)</span>
                        <span className="font-extrabold text-primary">{commuteAnalysis.transitTime}분</span>
                      </div>
                      <div className="flex justify-between items-center text-[12.5px]">
                        <span className="text-tertiary font-bold">목적지 하차 후 이동</span>
                        <span className="font-extrabold text-primary">8분 (고정)</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Simulation result Box */}
                  <div className="flex-1 flex flex-col justify-center gap-4">
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-[13px] font-bold text-tertiary mb-1">예상 출퇴근 시간</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[40px] font-black text-primary leading-none tracking-tighter">
                          {commuteAnalysis.totalTime}
                        </span>
                        <span className="text-[16px] font-extrabold text-tertiary">분</span>
                      </div>
                    </div>

                    {/* Premium Impact Box */}
                    <div className="p-4 rounded-xl border border-border bg-body/20 flex flex-col gap-1.5">
                      <h5 className="text-[13px] font-extrabold text-secondary">출퇴근 입지 프리미엄</h5>
                      <div className="text-[12.5px] text-secondary leading-relaxed font-semibold">
                        {commuteAnalysis.savedTime > 0 ? (
                          <span className="text-toss-green">
                            대중교통 60분 기준선 대비 {commuteAnalysis.savedTime}분 단축! DCF 성장률 프리미엄 +{commuteAnalysis.premium.toFixed(3)}%p가 가산되어 자산 가치를 견인합니다.
                          </span>
                        ) : (
                          <span className="text-tertiary">
                            소요 시간이 60분을 상회하여 자산 가치에 추가 교통 프리미엄이 부여되지 않습니다.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Report Copy Button */}
                    <button
                      onClick={() => {
                        const destName = commuteDest === 'gangnam' ? '강남역' : commuteDest === 'pangyo' ? '판교역' : '삼성역';
                        const premiumText = commuteAnalysis.savedTime > 0 
                          ? `성장률 프리미엄 +${commuteAnalysis.premium.toFixed(3)}%p 반영` 
                          : '추가 프리미엄 없음';
                        const reportText = `[D-VIEW 핵심지 출퇴근 가치 분석 리포트]
단지명: ${report.apartmentName}
목적지: ${destName}
출퇴근 최적 경로: ${commuteAnalysis.method}
소요 시간: 연계 ${commuteAnalysis.linkTime}분 + 철도 ${commuteAnalysis.transitTime}분 + 하차 후 도보 8분 = 총 ${commuteAnalysis.totalTime}분
가치 반영: ${premiumText} (60분선 대비 ${commuteAnalysis.savedTime}분 단축)

D-VIEW 밸류에이션 엔진으로 계산된 직주근접 정량 평가 결과입니다.`;
                        if (copiedCommuteTimeoutRef.current) {
                          clearTimeout(copiedCommuteTimeoutRef.current);
                          copiedCommuteTimeoutRef.current = null;
                        }
                        navigator.clipboard.writeText(reportText).then(() => {
                          if (!mountedRef.current) return;
                          if (copiedCommuteTimeoutRef.current) {
                            clearTimeout(copiedCommuteTimeoutRef.current);
                          }
                          setIsCopiedCommute(true);
                          copiedCommuteTimeoutRef.current = setTimeout(() => {
                            if (mountedRef.current) {
                              setIsCopiedCommute(false);
                              copiedCommuteTimeoutRef.current = null;
                            }
                          }, 2000);
                        });
                      }}
                      className={`w-full py-2.5 rounded-xl font-bold text-[12.5px] transition-all text-center cursor-pointer border ${
                        isCopiedCommute
                          ? 'bg-emerald-50 border-emerald-500/30 text-emerald-600'
                          : 'bg-[#f2f4f6] border-border/20 text-secondary hover:bg-[#e5e8eb]'
                      }`}
                    >
                      {isCopiedCommute ? '출퇴근 분석 보고서 복사 완료!' : '출퇴근 분석 보고서 복사'}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Section 2: 금리 연동 적정가 (DCF) */}
            {realEstatePER > 0 ? (
              <div className="p-6">
                <h4 className="text-[14.5px] md:text-[15px] font-extrabold text-primary mb-4 flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-toss-green rounded-full inline-block" />
                  2. 금리로 계산한 적정 집값 (DCF)
                </h4>
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left: Formula & Data Components */}
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="bg-body border border-border rounded-2xl p-5 flex flex-col justify-center gap-3.5 h-full">
                      <h5 className="text-[13px] md:text-[13.5px] font-extrabold text-secondary">적용 수식 및 산출 근거</h5>
                      <div className="flex flex-col gap-3.5">
                        {/* 연간 예상 임대 가치 (Annual Rent) */}
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[12.5px] md:text-[13px] text-tertiary font-bold">연간 예상 임대 가치 (Annual Rent)</span>
                            <span className="text-[14.5px] md:text-[15px] font-black text-primary">
                              {formatPrice(avg3MRent * dynamicConversionRate)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11.5px] md:text-[12px] text-secondary bg-body px-3 py-1.5 rounded-xl mt-1 border border-border/30 flex-wrap">
                            <span>평균 전세 {formatPrice(avg3MRent)}</span>
                            <span className="text-[#d1d6db]">×</span>
                            <span>전환율 {(dynamicConversionRate * 100).toFixed(1)}%</span>
                            {spreadReasons.length > 0 && (
                              <span className="text-toss-blue">({spreadReasons.join(', ')})</span>
                            )}
                          </div>
                        </div>

                        {/* 기본 투자 요구 이자율 (할인율 r) */}
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[12.5px] md:text-[13px] text-tertiary font-bold">기본 투자 요구 이자율 (할인율 r)</span>
                            <span className="text-[14.5px] md:text-[15px] font-black text-primary">{dcf.discountRate.toFixed(2)}%</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11.5px] md:text-[12px] text-secondary bg-body px-3 py-1.5 rounded-xl mt-1 border border-border/30 flex-wrap">
                            <span>국고채 {macroConfig.riskFreeRate.toFixed(2)}%</span>
                            <span className="text-[#d1d6db]">+</span>
                            <span>리스크 1.50%</span>
                            <span className="text-[#d1d6db]">+</span>
                            <span>조달 페널티({macroConfig.fundingCost.toFixed(2)}%) {(Math.max(0, macroConfig.fundingCost - 4.0) * 0.5).toFixed(2)}%</span>
                          </div>
                        </div>

                        {/* 장기 집값 상승 기대치 (성장률 g) */}
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[12.5px] md:text-[13px] text-tertiary font-bold">장기 집값 상승 기대치 (성장률 g)</span>
                            <span className="text-[14.5px] md:text-[15px] font-black text-primary">{dcf.growthRate.toFixed(2)}%</span>
                          </div>
                          <button 
                            onClick={() => {
                              setIsScoreAccordionOpen(true);
                              if (scrollTimeoutRef.current) {
                                clearTimeout(scrollTimeoutRef.current);
                              }
                              scrollTimeoutRef.current = setTimeout(() => {
                                document.getElementById('utility-score-section')?.scrollIntoView({ behavior: 'smooth' });
                                scrollTimeoutRef.current = null;
                              }, 50);
                            }}
                            className="flex items-center gap-1.5 text-[11.5px] md:text-[12px] text-secondary bg-body px-3 py-1.5 rounded-xl mt-1 border border-border/30 hover:underline hover:text-toss-blue transition-colors cursor-pointer text-left font-bold w-full"
                          >
                            물가({(macroConfig.baseInflationRate <= 0.1 ? macroConfig.baseInflationRate * 100 : macroConfig.baseInflationRate).toFixed(1)}%) + 단지 가치(+{(utilityScoreResult.total * 0.01).toFixed(2)}%p)
                          </button>
                        </div>

                        <div className="h-px w-full bg-border/60 my-0.5" />
                        
                        {/* 실질 목표 수익률 (Cap Rate) */}
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[12.5px] md:text-[13px] text-secondary font-extrabold">실질 목표 수익률 (Cap Rate)</span>
                            <span className="text-[14.5px] md:text-[15px] font-black text-[#00b386]">{dcf.capRate.toFixed(2)}%</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11.5px] md:text-[12px] text-secondary bg-body px-3 py-1.5 rounded-xl mt-1 border border-border/30">
                            <span>할인율 {dcf.discountRate.toFixed(2)}%</span>
                            <span className="text-[#d1d6db]">-</span>
                            <span>성장률 {dcf.growthRate.toFixed(2)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Right: Main Cap Rate Box */}
                  <div className="flex-1 flex flex-col justify-center gap-4">
                    <div className="flex flex-col items-center justify-center pb-2">
                      <span className="text-[13px] md:text-[13.5px] font-bold text-tertiary mb-1">적정 집값</span>
                      <span className="text-[36px] font-black text-primary leading-none tracking-tighter">
                        {formatPrice(dcf.impliedValue)}
                      </span>
                    </div>

                    {/* Step 5. 최종 적정 집값 산출 과정 */}
                    <div className="bg-body border border-border/80 rounded-2xl p-4 flex flex-col gap-2.5">
                      <div className="text-[13px] md:text-[13.5px] font-extrabold text-secondary flex items-center gap-1.5">
                        <span className="w-1 h-3 bg-toss-blue rounded-full inline-block" />
                        Step 5. 최종 적정 집값 산출
                      </div>
                      <div className="flex flex-col gap-1 text-[12.5px] md:text-[13px] text-tertiary leading-relaxed">
                        <div className="flex justify-between items-center text-[13px] md:text-[13.5px] font-bold text-primary mb-0.5">
                          <span>적정 집값 공식</span>
                          <span>연간 임대료 ÷ Cap Rate</span>
                        </div>
                        <div className="h-px bg-border/40 my-1" />
                        <div className="flex justify-between">
                          <span>연간 예상 임대료</span>
                          <span className="font-semibold text-secondary">
                            {(avg3MRent * dynamicConversionRate).toFixed(2)}만 원
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>자본환원율 (Cap Rate)</span>
                          <span className="font-semibold text-secondary">
                            {dcf.capRate.toFixed(2)}% ({(dcf.capRate / 100).toFixed(4)})
                          </span>
                        </div>
                        <div className="flex justify-between text-primary font-medium mt-1">
                          <span>이론 계산치</span>
                          <span className="font-extrabold text-[#f04452]">
                            ≈ {Math.round(dcf.impliedValue * 10000).toLocaleString()}원
                          </span>
                        </div>
                        <p className="text-[11.5px] md:text-[12px] text-tertiary leading-normal mt-1 border-t border-border/30 pt-1.5">
                          위 이론 계산치를 억/백만 원 단위로 반올림하여 최종적으로 <strong className="text-secondary font-bold">{formatPrice(dcf.impliedValue)}</strong>이 도출되었습니다.
                        </p>
                      </div>
                    </div>

                    {avg3MSale > 0 && (
                      <div className={`w-full flex flex-col items-center p-5 rounded-2xl shadow-sm ${
                        avg3MSale > dcf.impliedValue ? 'bg-toss-red/5 border border-toss-red/20' : 'bg-toss-blue/5 border border-toss-blue/20'
                      }`}>
                        <div className="flex items-center gap-1.5 text-[14px] font-bold text-secondary mb-2">
                          <Target size={15} className={avg3MSale > dcf.impliedValue ? 'text-toss-red' : 'text-toss-blue'} />
                          기준가 (3개월 평균): <span className="text-primary font-black ml-0.5">{formatPrice(avg3MSale)}</span>
                        </div>
                        <div className={`px-4 py-2 rounded-xl text-[14.5px] font-extrabold shadow-sm ${
                          avg3MSale > dcf.impliedValue ? 'bg-toss-red/10 text-toss-red' : 'bg-toss-blue/10 text-toss-blue'
                        }`}>
                          적정가 대비 {formatPrice(Math.abs(avg3MSale - dcf.impliedValue))} {avg3MSale > dcf.impliedValue ? '고평가' : '저평가'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-tertiary text-[13px]">
                실거래 데이터 부족으로 적정 집값 산출을 제공하지 않습니다.
              </div>
            )}

            {/* Section 3: 거시경제 시나리오 시뮬레이터 & 갭투자 분석 */}
            {realEstatePER > 0 && (
              <div className="p-6">
                <h4 className="text-[14.5px] md:text-[15px] font-extrabold text-primary mb-4 flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-toss-blue rounded-full inline-block" />
                  3. 거시경제 시나리오 시뮬레이터 & 갭투자 분석
                </h4>
                
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left Column: Sliders */}
                  <div className="flex-1 flex flex-col gap-5 bg-body border border-border rounded-2xl p-5">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[13px] font-extrabold text-secondary">
                        <span>기준금리 시나리오</span>
                        <span className="text-toss-blue">{simBaseRate.toFixed(2)}%</span>
                      </div>
                      <input
                        type="range"
                        min="1.00"
                        max="5.00"
                        step="0.25"
                        value={simBaseRate}
                        onChange={(e) => setSimBaseRate(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-[#e5e8eb] rounded-lg appearance-none cursor-pointer accent-toss-blue"
                        aria-label="기준금리 시나리오"
                      />
                      <div className="flex justify-between text-[11px] text-tertiary font-medium">
                        <span>금리인하 (1.00%)</span>
                        <span>현재 (3.25%)</span>
                        <span>금리인상 (5.00%)</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[13px] font-extrabold text-secondary">
                        <span>기대상승률 시나리오</span>
                        <span className="text-toss-blue">{simGrowthRate.toFixed(1)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="5.0"
                        step="0.1"
                        value={simGrowthRate}
                        onChange={(e) => setSimGrowthRate(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-[#e5e8eb] rounded-lg appearance-none cursor-pointer accent-toss-blue"
                        aria-label="기대상승률 시나리오"
                      />
                      <div className="flex justify-between text-[11px] text-tertiary font-medium">
                        <span>보수적 (0.0%)</span>
                        <span>기본 ({dcf.growthRate.toFixed(1)}%)</span>
                        <span>긍정적 (5.0%)</span>
                      </div>
                    </div>

                    <div className="h-px bg-border/40 my-1" />

                    <div className="flex flex-col gap-1">
                      <span className="text-[12px] text-secondary font-extrabold">시나리오 기본 논리</span>
                      <p className="text-[11.5px] text-tertiary leading-relaxed font-medium">
                        금리 하락 시 전세대출 유동성이 증가하여 전세가가 상승하고, 할인율이 낮아져 자산 적정가가 크게 오릅니다. 반대로 금리 상승 시에는 적정가가 조정을 받으며 필요한 갭투자금 부담이 늘어납니다.
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Comparison Cards */}
                  <div className="flex-1 flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      {/* Sim Fair Value Card */}
                      <div className="bg-body border border-border rounded-2xl p-4 flex flex-col gap-1.5">
                        <span className="text-[12px] font-extrabold text-secondary">시뮬레이션 적정가</span>
                        <span className="text-[18px] font-black text-primary">
                          {formatPrice(simulatedDCF.impliedValue)}
                        </span>
                        {dcf.impliedValue > 0 && (
                          <span className={`text-[11.5px] font-bold ${
                            simulatedDCF.impliedValue > dcf.impliedValue ? 'text-toss-green' : simulatedDCF.impliedValue < dcf.impliedValue ? 'text-toss-red' : 'text-secondary'
                          }`}>
                            {simulatedDCF.impliedValue > dcf.impliedValue ? '+' : ''}
                            {(((simulatedDCF.impliedValue - dcf.impliedValue) / dcf.impliedValue) * 100).toFixed(1)}% 변동
                          </span>
                        )}
                      </div>

                      {/* Sim Jeonse Price Card */}
                      <div className="bg-body border border-border rounded-2xl p-4 flex flex-col gap-1.5">
                        <span className="text-[12px] font-extrabold text-secondary">시뮬레이션 전세가</span>
                        <span className="text-[18px] font-black text-toss-blue">
                          {formatPrice(simulatedDCF.simJeonsePrice)}
                        </span>
                        <span className="text-[11.5px] text-tertiary font-bold">
                          전세가율 {simulatedDCF.simJeonseRatio.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Gap Investment Analyzer Card */}
                    <div className="bg-body border border-border rounded-2xl p-4 flex flex-col gap-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[12.5px] font-extrabold text-secondary font-bold">필요한 갭투자금</span>
                        <span className="text-[16px] font-black text-primary">
                          {formatPrice(simulatedDCF.simGap)}
                        </span>
                      </div>
                      <div className="h-px bg-border/40" />
                      <div className="flex justify-between items-center text-[12px]">
                        <span className="text-tertiary font-semibold">현재 대비 갭투자금 변동</span>
                        {(() => {
                          const currentGap = avg3MSale - avg3MRent;
                          const gapDiff = simulatedDCF.simGap - currentGap;
                          if (gapDiff < 0) {
                            return (
                              <span className="font-extrabold text-toss-green">
                                {formatPrice(Math.abs(gapDiff))} 절감 (투자 매력 상승)
                              </span>
                            );
                          } else if (gapDiff > 0) {
                            return (
                              <span className="font-extrabold text-toss-red">
                                {formatPrice(gapDiff)} 추가 필요 (자금 부담 증가)
                              </span>
                            );
                          } else {
                            return <span className="font-bold text-secondary">변동 없음</span>;
                          }
                        })()}
                      </div>
                    </div>

                    {/* Scenario Copy CTA */}
                    <button
                      onClick={handleCopyScenario}
                      className={`w-full py-3 rounded-xl font-extrabold text-[13.5px] transition-all text-center cursor-pointer border ${
                        isCopiedScenario 
                          ? 'bg-emerald-50 border-emerald-500/30 text-emerald-600'
                          : 'bg-[#f2f4f6] border-border/20 text-secondary hover:bg-[#e5e8eb]'
                      }`}
                    >
                      {isCopiedScenario ? '시나리오 분석 보고서 복사 완료!' : '시나리오 분석 보고서 복사하기'}
                    </button>
                  </div>
                </div>

                {/* Contextual Sponsored Mortgage Banner */}
                <div className="mt-4 p-4 rounded-2xl border bg-body/30 border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <div className="text-[12px] font-extrabold text-tertiary">
                      [광고] D-VIEW 주택금융 파트너스 추천 대출
                    </div>
                    <div className="text-[13.5px] font-extrabold text-primary">
                      {simBaseRate >= 3.25 
                        ? '금리 상승기 추천: 고정금리 안심 전환대출'
                        : '금리 하락기 추천: 변동금리 최적화 대환대출'
                      }
                    </div>
                    <p className="text-[11.5px] text-secondary font-medium">
                      {simBaseRate >= 3.25
                        ? '금리 추가 인상 우려에 대비하여 향후 이자 부담을 고정형으로 동결하는 D-VIEW 단독 제휴 우대상품 (연 3.85%, 중도상환수수료 면제)'
                        : '금리 인하 기조의 혜택을 즉각 수혜받을 수 있는 신규 코픽스 연동형 대출 대환 특가 (연 3.45%, 중도상환수수료 면제)'
                      }
                    </p>
                  </div>
                  <a
                    href="https://dview-loan.toss.im"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto text-center px-4 py-2.5 bg-[#008262] dark:bg-[#00b386] text-surface font-extrabold text-[12.5px] rounded-xl hover:bg-[#006950] dark:hover:bg-[#008262] transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
                  >
                    우대금리 조회하기
                  </a>
                </div>
              </div>
            )}

            {/* Section 4: 단지 상품성 & 인프라 가치평가 (Utility Score) */}
            {utilityScoreResult.total > 0 && (
              <div id="utility-score-section" className="p-6 scroll-mt-20">
                <h4 className="text-[14.5px] md:text-[15px] font-extrabold text-primary mb-4 flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-[#f59e0b] rounded-full inline-block" />
                  4. 단지 상품성 & 인프라 가치평가 (Utility Score)
                </h4>
                <div className="flex flex-col md:flex-row items-stretch gap-6">
                  {/* Left: Big Score & Progress Bar */}
                  <div className="flex-1 flex flex-col justify-center items-center md:items-start bg-body border border-border rounded-2xl p-5 text-center md:text-left min-w-0">
                    <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider">종합 가치평가 점수</span>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-[44px] font-black text-[#008262] dark:text-[#00d29d] leading-none tracking-tight">
                        {utilityScoreResult.total}
                      </span>
                      <span className="text-[14px] font-bold text-tertiary">/ {utilityScoreResult.maxTotal}점</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-[#e5e8eb] h-2.5 rounded-full mt-4 overflow-hidden">
                      <div 
                        className="bg-[#008262] dark:bg-[#00b386] h-full rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${(utilityScoreResult.total / utilityScoreResult.maxTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                  {/* Right: Explanation & Accordion Toggle */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-[12px] font-extrabold shadow-sm ${
                          utilityScoreResult.total >= 130 
                            ? 'bg-[#e0fbf4] text-[#00b386]' 
                            : utilityScoreResult.total >= 100 
                              ? 'bg-[#e6f3f0] dark:bg-[#008262]/10 text-[#008262] dark:text-[#00d29d]' 
                              : 'bg-orange-50 text-orange-500'
                        }`}>
                          {utilityScoreResult.total >= 130 ? '최우수 단지' : utilityScoreResult.total >= 100 ? '우수 단지' : '표준 단지'}
                        </span>
                      </div>
                      <p className="text-[13px] md:text-[13.5px] text-secondary leading-relaxed font-semibold mt-1">
                        {utilityScoreResult.total >= 130 ? '동탄 내 최상위권의 상품성과 초역세권 입지를 갖추어, 평균(2.0%)보다 높은 장기 성장률 프리미엄이 반영됩니다.' : 
                         utilityScoreResult.total >= 100 ? '준수한 단지 스펙과 생활 인프라를 갖추어, 시장 평균 수준의 성장률이 안정적으로 적용됩니다.' : 
                         '단지 규모나 연식, 역세권 접근성 등의 제한으로 인해 평균보다 다소 보수적인 성장률이 적용됩니다.'}
                      </p>
                    </div>

                    <button
                      onClick={() => setIsScoreAccordionOpen(!isScoreAccordionOpen)}
                      className="mt-6 w-full p-4 rounded-xl border flex items-center justify-between bg-body hover:bg-body border-border transition-all active:scale-[0.99] group cursor-pointer"
                    >
                      <span className="text-[14px] font-extrabold text-secondary flex items-center gap-2">
                        <Info size={16} className="text-[#008262] dark:text-[#00d29d]" />
                        세부 가치평가 내역 {isScoreAccordionOpen ? '접기' : '펼치기'} (11개 항목)
                      </span>
                      <ChevronDown 
                        size={16} 
                        className={`text-tertiary transition-transform duration-300 ${isScoreAccordionOpen ? 'rotate-180' : ''}`} 
                      />
                    </button>
                  </div>
                </div>

                {/* Accordion Content: 11 Items Detailed List */}
                {isScoreAccordionOpen && (
                  <div className="mt-6 border-t border-border pt-6 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Section 1: 단지 기본 스펙 (Specs) */}
                      <div className="flex flex-col gap-4">
                        <h4 className="text-[13px] md:text-[13.5px] font-extrabold text-[#f59e0b] border-b border-border pb-2 flex items-center gap-1.5">
                          <Building size={16} />
                          단지 상품성 & 스펙 (4개 지표)
                        </h4>
                        <div className="flex flex-col gap-4">
                          {utilityScoreResult.logs.filter(log => !log.isInfra).map((log, i) => {
                            const Icon = log.icon;
                            return (
                              <div key={i} className="bg-body/40 border border-border/60 rounded-2xl p-4 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] flex items-center justify-center shrink-0">
                                      <Icon size={16} />
                                    </div>
                                    <span className="text-[13px] md:text-[13.5px] font-bold text-primary">{log.category}</span>
                                  </div>
                                  <div className="flex items-baseline gap-0.5">
                                    <span className="text-[14px] font-black text-secondary">{log.score}</span>
                                    <span className="text-[11px] text-tertiary">/ {log.max}점</span>
                                  </div>
                                </div>
                                <span className="text-[12px] md:text-[12.5px] text-secondary font-medium pl-1">{log.label}</span>
                                {log.data && (
                                  <span className="text-[11px] text-[#008262] dark:text-[#00d29d] font-bold mt-1 px-2.5 py-1 bg-[#008262]/5 dark:bg-[#00d29d]/5 rounded border border-[#008262]/10 dark:border-[#00d29d]/10 w-fit ml-1">
                                    실데이터: {log.data}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Section 2: 주변 인프라 & 입지 (Infra) */}
                      <div className="flex flex-col gap-4">
                        <h4 className="text-[13px] md:text-[13.5px] font-extrabold text-[#008262] dark:text-[#00d29d] border-b border-border pb-2 flex items-center gap-1.5">
                          <MapPin size={16} />
                          주변 인프라 & 교통 입지 (7개 지표)
                        </h4>
                        <div className="flex flex-col gap-4">
                          {utilityScoreResult.logs.filter(log => log.isInfra).map((log, i) => {
                            const Icon = log.icon;
                            return (
                              <div key={i} className="bg-body/40 border border-border/60 rounded-2xl p-4 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-[#008262]/10 dark:bg-[#00d29d]/10 text-[#008262] dark:text-[#00d29d] flex items-center justify-center shrink-0">
                                      <Icon size={16} />
                                    </div>
                                    <span className="text-[13px] md:text-[13.5px] font-bold text-primary">{log.category}</span>
                                  </div>
                                  <div className="flex items-baseline gap-0.5">
                                    <span className="text-[14px] font-black text-secondary">{log.score}</span>
                                    <span className="text-[11px] text-tertiary">/ {log.max}점</span>
                                  </div>
                                </div>
                                <span className="text-[12px] md:text-[12.5px] text-secondary font-medium pl-1">{log.label}</span>
                                {log.data && (
                                  <span className="text-[11px] text-[#008262] dark:text-[#00d29d] font-bold mt-1 px-2.5 py-1 bg-[#008262]/5 dark:bg-[#00d29d]/5 rounded border border-[#008262]/10 dark:border-[#00d29d]/10 w-fit ml-1">
                                    실데이터: {log.data}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Unified Action Button at bottom of card */}
          <div className="p-5 bg-body/20 border-t border-border flex justify-center">
            <button
              onClick={() => setIsValuationModalOpen(true)}
              className="w-full sm:w-auto px-8 py-4 bg-[#008262] hover:bg-[#006950] dark:bg-[#00b386] dark:hover:bg-[#008262] text-surface text-[15px] font-extrabold rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Info size={16} />
              [ 가치평가 상세분석 및 계산법 보기 ]
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-border p-6 py-10 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-body border border-border flex items-center justify-center text-tertiary">
            <Info size={24} className="text-tertiary" />
          </div>
          <div className="flex flex-col gap-1 max-w-sm">
            <h4 className="text-[16px] font-extrabold text-primary">가치평가 데이터 부족</h4>
            <p className="text-[13px] text-tertiary leading-relaxed font-medium">
              최근 실거래 데이터 및 단지 평가 정보가 모두 부족하여 종합 밸류에이션 분석을 제공하기 어렵습니다.
            </p>
          </div>
        </div>
      )}

      {/* Unified Valuation Modal (tabless vertical scroll view) */}
      {isValuationModalOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200" 
          onClick={() => setIsValuationModalOpen(false)}
        >
          <div 
            className="relative w-full sm:w-[620px] bg-surface rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col gap-6 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-body pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#008262]/10 dark:bg-[#00d29d]/10 flex items-center justify-center">
                  <ShieldCheck size={18} className="text-[#008262] dark:text-[#00d29d]" />
                </div>
                <h3 className="text-[18px] font-extrabold text-primary tracking-tight">종합 가치평가 상세 분석</h3>
              </div>
              <button onClick={() => setIsValuationModalOpen(false)} className="p-2 hover:bg-body rounded-full transition-colors active:scale-95 cursor-pointer">
                <X size={20} className="text-tertiary" />
              </button>
            </div>

            {/* Scroll Container */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-6 scrollbar-thin">
              
              {/* Part 1: DCF Formula & Calculation */}
              {realEstatePER > 0 && (
                <div className="flex flex-col gap-4">
                  <h4 className="text-[15px] font-extrabold text-primary flex items-center gap-1.5">
                    <span className="w-1.5 h-3.5 bg-toss-green rounded-full inline-block" />
                    1. 적정 집값 계산법 (수익환원법)
                  </h4>
                  
                  <div className="bg-body rounded-2xl p-4 border border-border">
                    <div className="text-[13.5px] font-extrabold text-primary mb-2">
                      적정 집값 = 1년 예상 월세 ÷ 은행 예금이자
                    </div>
                    <p className="text-[12.5px] text-secondary leading-relaxed font-medium">
                      이 아파트를 매수하는 대신 그 돈을 은행에 넣었을 때 받을 수 있는 이자와, 이 아파트에서 발생하는 임대 가치(전세 기반 가상 월세)를 비교해 적정 가격을 계산합니다.
                    </p>
                  </div>

                  {/* 3 Steps */}
                  <div className="flex flex-col gap-4 bg-body/30 rounded-2xl p-4 border border-border/60">
                    <div className="flex gap-3 items-start">
                      <div className="w-5 h-5 rounded-full bg-[#008262] dark:bg-[#00b386] text-surface flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5 shadow-sm">1</div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[13px] font-extrabold text-primary">목표수익 기준 설정 (할인율 r: {dcf.discountRate.toFixed(2)}%)</span>
                        <span className="text-[12px] text-secondary font-medium leading-relaxed">
                          은행 예금 금리({macroConfig.riskFreeRate.toFixed(2)}%)에 부동산 투자 위험 리스크(1.50%) 및 조달 페널티를 더해 최소한의 이율 기준을 수립합니다.
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start">
                      <div className="w-5 h-5 rounded-full bg-[#008262] dark:bg-[#00b386] text-surface flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5 shadow-sm">2</div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[13px] font-extrabold text-primary">예상 월세 도출 (전환율: {(dynamicConversionRate * 100).toFixed(1)}%)</span>
                        <span className="text-[12px] text-secondary font-medium leading-relaxed">
                          최근 3개월 평균 전세가({formatPrice(avg3MRent)})에 입지 특성이 반영된 전월세 전환율을 적용하여 1년간 얻을 수 있는 가치로 환산합니다.
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start">
                      <div className="w-5 h-5 rounded-full bg-[#008262] dark:bg-[#00b386] text-surface flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5 shadow-sm">3</div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[13px] font-extrabold text-primary">적정가 산정 및 성장률 반영 (장기 성장률 g: {dcf.growthRate.toFixed(2)}%)</span>
                        <span className="text-[12px] text-secondary font-medium leading-relaxed">
                          물가상승률(2.0%)에 아래 **단지 가치평가(Utility Score)** 점수에 따른 가산율을 조합하여 매년 집값의 장기 가치 성장 잠재력을 산정합니다.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {realEstatePER > 0 && <hr className="border-border/60" />}

              {/* Part 2: Utility Score Detailed Items */}
              {utilityScoreResult.total > 0 && (
                <div className="flex flex-col gap-4">
                  <h4 className="text-[15px] font-extrabold text-primary flex items-center gap-1.5">
                    <span className="w-1.5 h-3.5 bg-[#f59e0b] rounded-full inline-block" />
                    2. 단지 상품성 & 인프라 가치평가 (Utility Score)
                  </h4>
                  
                  {/* Score Summary Banner */}
                  <div className="bg-body rounded-2xl p-4 border border-border flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1 shrink-0">
                      <div className="flex items-baseline gap-1">
                        <span className="text-[28px] font-black text-[#008262] dark:text-[#00d29d] leading-none">{utilityScoreResult.total}</span>
                        <span className="text-[12px] text-tertiary font-bold">/ {utilityScoreResult.maxTotal}점</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold w-fit shadow-sm ${
                        utilityScoreResult.total >= 130 
                          ? 'bg-[#e0fbf4] text-[#00b386]' 
                          : utilityScoreResult.total >= 100 
                            ? 'bg-[#e6f3f0] dark:bg-[#008262]/10 text-[#008262] dark:text-[#00d29d]' 
                            : 'bg-orange-50 text-orange-500'
                      }`}>
                        {utilityScoreResult.total >= 130 ? '최우수 단지' : utilityScoreResult.total >= 100 ? '우수 단지' : '표준 단지'}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-secondary leading-relaxed font-semibold">
                      {utilityScoreResult.total >= 130 ? '동탄 내 최상위권의 상품성과 초역세권 입지로 장기 성장률 프리미엄이 반영됩니다.' : 
                       utilityScoreResult.total >= 100 ? '준수한 스펙과 생활 인프라로 시장 평균 수준의 성장률이 안정적으로 적용됩니다.' : 
                       '단지 규모나 연식 등의 제한으로 평균보다 다소 보수적인 성장률이 적용됩니다.'}
                    </p>
                  </div>

                  {/* 11 Metric Items (Scrollable sub-area) */}
                  <div className="flex flex-col gap-3.5 border border-border/50 rounded-2xl p-3 bg-body/10">
                    {utilityScoreResult.logs.map((log, i) => {
                      const Icon = log.icon;
                      return (
                        <div key={i} className="flex gap-3.5 items-start p-3 bg-surface hover:bg-body/35 rounded-xl border border-border/40 transition-colors">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${log.isInfra ? 'bg-[#008262]/10 dark:bg-[#00d29d]/10 text-[#008262] dark:text-[#00d29d]' : 'bg-[#f59e0b]/10 text-[#f59e0b]'}`}>
                            <Icon size={16} />
                          </div>
                          <div className="flex flex-col gap-1 w-full">
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] font-bold text-primary">{log.category}</span>
                              <div className="flex items-baseline gap-0.5">
                                <span className="text-[13px] font-extrabold text-secondary">{log.score}</span>
                                <span className="text-[10px] text-tertiary font-medium">/ {log.max}점</span>
                              </div>
                            </div>
                            <span className="text-[12px] text-secondary font-medium pl-0.5">{log.label}</span>
                            {log.data && (
                              <span className="text-[11px] text-[#008262] dark:text-[#00d29d] font-semibold mt-1 px-2.5 py-0.5 bg-[#008262]/5 dark:bg-[#00d29d]/5 rounded border border-[#008262]/10 dark:border-[#00d29d]/10 w-fit ml-0.5">
                                실데이터: {log.data}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {realEstatePER > 0 && <hr className="border-border/60" />}

              {/* Part 3: PER Range Guides */}
              {realEstatePER > 0 && (
                <div className="flex flex-col gap-4">
                  <h4 className="text-[15px] font-extrabold text-primary flex items-center gap-1.5">
                    <span className="w-1.5 h-3.5 bg-[#008262] dark:bg-[#00b386] rounded-full inline-block" />
                    3. 매매가 ÷ 전세가 배수 기준 (PER 구간 가이드)
                  </h4>
                  
                  <div className="flex flex-col gap-4">
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-toss-green mt-2 shrink-0" />
                      <div>
                        <div className="text-[13px] font-bold text-primary flex items-center gap-1.5">
                          안전구간 (1.4배 미만) <span className="text-[11px] text-tertiary font-normal">(전세가율 71% 이상)</span>
                        </div>
                        <div className="text-[12px] text-secondary mt-1 leading-relaxed font-medium">
                          <b className="text-toss-green font-bold">집값이 떨어질 위험이 매우 낮습니다.</b> 실거주 인기가 높아 매매가 and 전세가의 차이가 적고, 적은 돈으로도 투자(갭투자)하기 좋은 곳들이 모여있습니다.
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#10b981] mt-2 shrink-0" />
                      <div>
                        <div className="text-[13px] font-bold text-primary flex items-center gap-1.5">
                          안정구간 (1.4배 ~ 1.6배) <span className="text-[11px] text-tertiary font-normal">(전세가율 62~71%)</span>
                        </div>
                        <div className="text-[12px] text-secondary mt-1 leading-relaxed font-medium">
                          <b className="text-[#10b981] font-bold">가격이 든든하게 방어됩니다.</b> 경제가 흔들려도 집값이 잘 버티는 편이며, 사람들이 실제로 살고 싶어 하는 수요가 가격을 탄탄하게 받쳐줍니다.
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#008262] dark:bg-[#00b386] mt-2 shrink-0" />
                      <div>
                        <div className="text-[13px] font-bold text-primary flex items-center gap-1.5">
                          평균구간 (1.6배 ~ 1.8배) <span className="text-[11px] text-tertiary font-normal">(전세가율 55~62%)</span>
                        </div>
                        <div className="text-[12px] text-secondary mt-1 leading-relaxed font-medium">
                          <b className="text-[#008262] dark:text-[#00d29d] font-bold">시장의 딱 중간 수준입니다.</b> 수도권 아파트들이 일반적으로 가지고 있는 생활 인프라와 사람들의 평범한 선호도가 그대로 반영된 상태입니다.
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#f59e0b] mt-2 shrink-0" />
                      <div>
                        <div className="text-[13px] font-bold text-primary flex items-center gap-1.5">
                          성장구간 (1.8배 ~ 2.2배) <span className="text-[11px] text-tertiary font-normal">(전세가율 45~55%)</span>
                        </div>
                        <div className="text-[12px] text-secondary mt-1 leading-relaxed font-medium">
                          <b className="text-[#f59e0b] font-bold">미래에 대한 기대감이 섞여있습니다.</b> 뛰어난 학군이나 새로운 교통망 등 좋은 입지 조건 때문에 나중에 집값이 오를 것이란 기대가 이미 가격에 포함되어 있습니다.
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-toss-red mt-2 shrink-0" />
                      <div>
                        <div className="text-[13px] font-bold text-primary flex items-center gap-1.5">
                          투자집중구간 (2.2배 초과) <span className="text-[11px] text-tertiary font-normal">(전세가율 45% 미만)</span>
                        </div>
                        <div className="text-[12px] text-secondary mt-1 leading-relaxed font-medium">
                          <b className="text-toss-red font-bold">큰 수익을 노리는 투자가 집중된 곳입니다.</b> 재건축이나 대형 개발을 바라보는 투자자들이 몰려있어, 현재 살기 좋은 것보다 앞으로 오를 가치에 가격이 맞춰져 있습니다.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 p-4 rounded-xl bg-toss-red/5 border border-toss-red/20">
                    <div className="text-[13px] font-extrabold text-toss-red mb-2 flex items-center gap-2">
                      <Info size={14} strokeWidth={2.5}/>
                      주의해야 할 숨은 위험
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-[12px] text-secondary leading-relaxed">
                        <b className="text-toss-red font-bold">안전구간의 함정:</b> 경제 상황이 나빠져 전세가가 떨어지면, 갭투자한 집주인들이 돈을 돌려주지 못해 헐값에 집을 넘기면서 가격이 무너질 위험이 있습니다.
                      </p>
                      <p className="text-[12px] text-secondary leading-relaxed">
                        <b className="text-toss-red font-bold">투자집중구간의 함정:</b> 은행 금리가 크게 오르면, 빚을 낸 투자자들의 이자 부담이 커지고 미리 반영되어 있던 기대감(거품)이 사라지면서 집값이 가장 가파르게 떨어질 수 있습니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Button */}
            <div className="mt-auto pt-4 border-t border-border shrink-0">
              <button 
                onClick={() => setIsValuationModalOpen(false)}
                className="w-full py-4 rounded-2xl font-extrabold text-[15px] bg-primary text-surface hover:bg-[#191f28] active:scale-[0.98] transition-all cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

AdvancedValuationMetrics.displayName = 'AdvancedValuationMetrics';
export default AdvancedValuationMetrics;
