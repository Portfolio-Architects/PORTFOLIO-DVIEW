/**
 * Pure Mathematical Valuation & Domain Models
 * Invariant: Zero React, zero JSX, zero Lucide dependencies.
 */

import type { FieldReportData } from '@/lib/DashboardFacade';
import type { ObjectiveMetrics } from '@/lib/types/scoutingReport';
import { getBrandMultiplier, calculatePremiumScores } from '@/lib/utils/scoring';
import { filterOutliersIQR } from '@/lib/utils/outlierFilter';

export type UtilityMetricIconKey =
  | 'award'
  | 'users'
  | 'car'
  | 'calendar'
  | 'train'
  | 'graduation-cap'
  | 'store'
  | 'tree-pine';

export interface UtilityScoreLogItem {
  iconKey: UtilityMetricIconKey;
  category: string;
  score: number;
  max: number;
  label: string;
  isInfra: boolean;
  data?: string;
}

export interface UtilityScoreV2Result {
  total: number;
  rawScore: number;
  maxTotal: number;
  isCapped: boolean;
  breakDown: {
    specs: number;
    infra: number;
  };
  logs: UtilityScoreLogItem[];
}

export function calculateUtilityScoreV2(
  report: FieldReportData,
  overrideScore: number = 0
): UtilityScoreV2Result {
  const m = report?.metrics as ObjectiveMetrics | undefined;
  const premium = calculatePremiumScores(m);
  const d = premium.details;

  if (!d) {
    return {
      total: 0,
      breakDown: { specs: 0, infra: 0 },
      logs: [],
      rawScore: 0,
      isCapped: false,
      maxTotal: 150,
    };
  }

  const logs: UtilityScoreLogItem[] = [
    { iconKey: 'award', category: '브랜드 파워', score: d.brand.score, max: d.brand.max, label: d.brand.label, isInfra: false, data: d.brand.data },
    { iconKey: 'users', category: '단지 규모 (세대수)', score: d.scale.score, max: d.scale.max, label: d.scale.label, isInfra: false, data: d.scale.data },
    { iconKey: 'car', category: '주차 편의성 (세대당)', score: d.parking.score, max: d.parking.max, label: d.parking.label, isInfra: false, data: d.parking.data },
    { iconKey: 'calendar', category: '건축 연식 (감가)', score: d.year.score, max: d.year.max, label: d.year.label, isInfra: false, data: d.year.data },
    { iconKey: 'train', category: 'GTX/SRT 역세권', score: d.gtx.score, max: d.gtx.max, label: d.gtx.label, isInfra: true, data: d.gtx.data },
    { iconKey: 'train', category: '동인선 역세권', score: d.indeokwon.score, max: d.indeokwon.max, label: d.indeokwon.label, isInfra: true, data: d.indeokwon.data },
    { iconKey: 'train', category: '동탄트램 역세권', score: d.tram.score, max: d.tram.max, label: d.tram.label, isInfra: true, data: d.tram.data },
    { iconKey: 'graduation-cap', category: '통학 학군 (초등 중심)', score: d.school.score, max: d.school.max, label: d.school.label, isInfra: true, data: d.school.data },
    { iconKey: 'graduation-cap', category: '사교육 학군 (학원가)', score: d.academy.score, max: d.academy.max, label: d.academy.label, isInfra: true, data: d.academy.data },
    { iconKey: 'store', category: '거점 상권/학원/앵커', score: d.store.score, max: d.store.max, label: d.store.label, isInfra: true, data: d.store.data },
    { iconKey: 'tree-pine', category: '자연 환경 (호수/상징공원)', score: d.parkDist.score, max: d.parkDist.max, label: d.parkDist.label, isInfra: true, data: d.parkDist.data },
  ];

  if (overrideScore !== 0) {
    logs.push({
      iconKey: 'award',
      category: '어드민 수동 보정',
      score: overrideScore,
      max: Math.abs(overrideScore),
      label: `실수요자 투표 반영 어드민 수동 보정 (${overrideScore > 0 ? '+' : ''}${overrideScore}점)`,
      isInfra: false,
    });
  }

  const breakDown = {
    specs: d.brand.score + d.scale.score + d.parking.score + d.year.score + (overrideScore !== 0 ? overrideScore : 0),
    infra: d.gtx.score + d.indeokwon.score + d.tram.score + d.school.score + d.store.score + d.parkDist.score,
  };

  const maxTotal = logs.reduce((sum, log) => sum + log.max, 0);
  const adjustedTotal = Math.max(0, Math.min(maxTotal, premium.totalScore + overrideScore));

  return { total: adjustedTotal, breakDown, logs, rawScore: adjustedTotal, isCapped: false, maxTotal };
}

export type CommuteDestination = 'gangnam' | 'pangyo' | 'samseong';

export interface CommuteAnalysisResult {
  linkTime: number;
  transitTime: number;
  totalTime: number;
  savedTime: number;
  premium: number;
  method: string;
}

export function calculateCommuteAnalysis(
  metrics: Partial<ObjectiveMetrics> | undefined,
  destination: CommuteDestination = 'gangnam'
): CommuteAnalysisResult {
  const distSubway = typeof metrics?.distanceToSubway === 'number' ? metrics.distanceToSubway : 2000;
  const distTram = typeof metrics?.distanceToTram === 'number' ? metrics.distanceToTram : 1000;

  const walkToSubway = distSubway / 80;
  const tramToSubway = distTram / 250 + 5;
  const linkTimeToSubway = Math.min(walkToSubway, tramToSubway);

  let transitTime = 42;
  let method = '동탄역 연계 + GTX-A + 수인분당선';

  if (destination === 'gangnam') {
    transitTime = 42;
    method = '동탄역 연계 + GTX-A + 수인분당선';
  } else if (destination === 'pangyo') {
    transitTime = 20;
    method = '동탄역 연계 + GTX-A + 경강선';
  } else if (destination === 'samseong') {
    transitTime = 22;
    method = '동탄역 연계 + GTX-A';
  }

  const linkTime = Math.round(linkTimeToSubway);
  const totalTime = linkTime + transitTime + 8;
  const savedTime = Math.max(0, 60 - totalTime);
  const premium = savedTime * 0.015;

  return {
    linkTime,
    transitTime,
    totalTime,
    savedTime,
    premium,
    method,
  };
}

export interface TxRecord {
  dealType?: string;
  price: number;
  deposit?: number;
  monthlyRent?: number;
  contractYm?: string;
  contractDay?: string;
  contractDate?: string;
}

export interface TxValuationStatsResult {
  salesCount: number;
  rentsCount: number;
  validSalesCount: number;
  validRentsCount: number;
  avg1MSale: number;
  avg3MSale: number;
  avg3MRent: number;
  realEstatePER: number;
  jeonseRatio: number;
  currentGap: number;
  gap1YearAgo: number | null;
  gapDelta: number | null;
}

export function calculateTransactionValuationStats(
  transactions: TxRecord[],
  baseDate: Date = new Date()
): TxValuationStatsResult {
  const txList = Array.isArray(transactions) ? transactions : [];
  const sales = txList
    .filter(t => t && t.dealType !== '전세' && t.dealType !== '월세')
    .sort((a, b) => (b.contractDate || '').localeCompare(a.contractDate || ''));

  const rents = txList
    .filter(t => t && (t.dealType === '전세' || t.dealType === '월세'))
    .sort((a, b) => (b.contractDate || '').localeCompare(a.contractDate || ''));

  const getJeonseEq = (t: TxRecord) =>
    t.dealType === '월세'
      ? (t.deposit || 0) + Math.round(((t.monthlyRent || 0) * 12) / 0.055)
      : t.deposit || t.price || 0;

  const validSales = filterOutliersIQR(sales, t => t.price, 1.5, 3.5);
  const validRents = filterOutliersIQR(rents, t => getJeonseEq(t), 3.0, 5.0);

  const oneMonthAgoSale = new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, baseDate.getDate());
  const threeMonthsAgoSale = new Date(baseDate.getFullYear(), baseDate.getMonth() - 3, baseDate.getDate());
  const threeMonthsAgoRent = new Date(baseDate.getFullYear(), baseDate.getMonth() - 3, baseDate.getDate());

  const isWithinWindow = (t: TxRecord, cutoff: Date) => {
    if (!t.contractYm || t.contractYm.length < 6) return false;
    const y = parseInt(t.contractYm.slice(0, 4), 10);
    const m = parseInt(t.contractYm.slice(4, 6), 10);
    const d = parseInt(t.contractDay || '1', 10);
    const txDate = new Date(y, m - 1, d);
    return txDate >= cutoff;
  };

  const recent1MSales = validSales.filter(t => isWithinWindow(t, oneMonthAgoSale));
  const recent3MSales = validSales.filter(t => isWithinWindow(t, threeMonthsAgoSale));
  const recentRents = validRents.filter(t => isWithinWindow(t, threeMonthsAgoRent));

  const avg1MSale = recent1MSales.length > 0
    ? Math.round(recent1MSales.reduce((sum, t) => sum + t.price, 0) / recent1MSales.length)
    : (validSales.length > 0 ? validSales[0].price : 0);

  const avg3MSale = recent3MSales.length > 0
    ? Math.round(recent3MSales.reduce((sum, t) => sum + t.price, 0) / recent3MSales.length)
    : (validSales.length > 0 ? validSales[0].price : 0);

  const avg3MRent = recentRents.length > 0
    ? Math.round(recentRents.reduce((sum, t) => sum + getJeonseEq(t), 0) / recentRents.length)
    : (validRents.length > 0 ? getJeonseEq(validRents[0]) : 0);

  const realEstatePER = (avg3MSale > 0 && avg3MRent > 0) ? (avg3MSale / avg3MRent) : 0;
  const jeonseRatio = (avg3MSale > 0 && avg3MRent > 0) ? (avg3MRent / avg3MSale) * 100 : 0;
  const currentGap = avg3MSale - avg3MRent;

  // 1-year ago gap
  let gap1YearAgo: number | null = null;
  let gapDelta: number | null = null;

  if (sales.length > 0 && rents.length > 0) {
    const targetDate = new Date(baseDate.getTime());
    targetDate.setFullYear(targetDate.getFullYear() - 1);

    const rangeStart = new Date(targetDate.getTime() - 90 * 24 * 60 * 60 * 1000);
    const rangeEnd = new Date(targetDate.getTime() + 90 * 24 * 60 * 60 * 1000);

    const checkPastRange = (t: TxRecord) => {
      if (!t.contractYm || t.contractYm.length < 6) return false;
      const y = parseInt(t.contractYm.slice(0, 4), 10);
      const m = parseInt(t.contractYm.slice(4, 6), 10);
      const d = parseInt(t.contractDay || '1', 10);
      const txDate = new Date(y, m - 1, d);
      return txDate >= rangeStart && txDate <= rangeEnd;
    };

    const pastSales = sales.filter(checkPastRange);
    const pastRents = rents.filter(checkPastRange);

    const pastAvgSale = pastSales.length > 0
      ? Math.round(pastSales.reduce((sum, t) => sum + t.price, 0) / pastSales.length)
      : 0;

    const pastAvgRent = pastRents.length > 0
      ? Math.round(pastRents.reduce((sum, t) => sum + getJeonseEq(t), 0) / pastRents.length)
      : 0;

    if (pastAvgSale > 0 && pastAvgRent > 0) {
      const pastGap = pastAvgSale - pastAvgRent;
      gap1YearAgo = pastGap;
      gapDelta = currentGap - pastGap;
    }
  }

  return {
    salesCount: sales.length,
    rentsCount: rents.length,
    validSalesCount: validSales.length,
    validRentsCount: validRents.length,
    avg1MSale,
    avg3MSale,
    avg3MRent,
    realEstatePER,
    jeonseRatio,
    currentGap,
    gap1YearAgo,
    gapDelta,
  };
}

export interface ConversionRateSpreadResult {
  dynamicConversionRate: number;
  spreadReasons: string[];
}

export function calculateConversionRateSpread(
  metrics: Partial<ObjectiveMetrics> | undefined,
  aptName: string,
  baseRate: number = 0.045
): ConversionRateSpreadResult {
  let conversionRateSpread = 0;
  const spreadReasons: string[] = [];

  if (metrics) {
    if (typeof metrics.distanceToSubway === 'number') {
      if (metrics.distanceToSubway <= 500) {
        conversionRateSpread -= 0.005;
        spreadReasons.push('역세권(-0.5%p)');
      } else if (metrics.distanceToSubway > 1200) {
        conversionRateSpread += 0.005;
        spreadReasons.push('외곽(+0.5%p)');
      }
    }

    const year = metrics.yearBuilt ? parseInt(String(metrics.yearBuilt).substring(0, 4), 10) : new Date().getFullYear();
    const age = !isNaN(year) ? new Date().getFullYear() - year + 1 : 10;
    const mu = getBrandMultiplier(metrics.brand || aptName || '');

    if (age <= 5 || mu >= 1.09) {
      conversionRateSpread -= 0.005;
      spreadReasons.push('신축/1군(-0.5%p)');
    } else if (age > 15) {
      conversionRateSpread += 0.005;
      spreadReasons.push('구축감가(+0.5%p)');
    }
  }

  const dynamicConversionRate = Math.max(0.035, Math.min(0.065, baseRate + conversionRateSpread));

  return { dynamicConversionRate, spreadReasons };
}

export interface SimulationParams {
  simBaseRate: number;
  simGrowthRate: number;
  macroConfig: {
    riskFreeRate: number;
    fundingCost: number;
  };
  avg3MRent: number;
  avg3MSale: number;
  dynamicConversionRate: number;
  commutePremium: number;
}

export interface SimulatedDCFResult {
  discountRate: number;
  growthRate: number;
  capRate: number;
  impliedValue: number;
  simJeonsePrice: number;
  simGap: number;
  simJeonseRatio: number;
}

export function simulateDCFScenario(params: SimulationParams): SimulatedDCFResult {
  const {
    simBaseRate,
    simGrowthRate,
    macroConfig,
    avg3MRent,
    avg3MSale,
    dynamicConversionRate,
    commutePremium,
  } = params;

  const baseRateDiff = simBaseRate - 3.25;
  const simRiskFree = Math.max(0.5, macroConfig.riskFreeRate + baseRateDiff);
  const simFunding = Math.max(1.0, macroConfig.fundingCost + baseRateDiff);

  const fundingSpread = Math.max(0, simFunding - 4.0) * 0.5;
  const discountRate = (simRiskFree + 1.5 + fundingSpread) / 100;

  const growthRate = (simGrowthRate + commutePremium) / 100;
  const capRate = Math.max(0.01, discountRate - growthRate);
  const annualRent = avg3MRent * dynamicConversionRate;
  const impliedValue = capRate > 0 ? annualRent / capRate : 0;

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
    simJeonseRatio,
  };
}

export type PERStatusCategory =
  | 'safe'
  | 'stable'
  | 'average'
  | 'growth'
  | 'speculative'
  | 'insufficient';

export interface PERStatusResult {
  category: PERStatusCategory;
  statusText: string;
  statusColor: string;
  statusBg: string;
  descriptionText: string;
}

export function evaluatePERStatus(realEstatePER: number): PERStatusResult {
  if (realEstatePER <= 0) {
    return {
      category: 'insufficient',
      statusText: '데이터 부족',
      statusColor: 'text-tertiary',
      statusBg: 'bg-body',
      descriptionText: '최근 매매/전세 실거래가 데이터가 부족하여 분석할 수 없습니다.',
    };
  }

  if (realEstatePER < 1.4) {
    return {
      category: 'safe',
      statusText: '안전구간 (가격 방어력 우수)',
      statusColor: 'text-toss-green',
      statusBg: 'bg-toss-green/10 border-toss-green/20',
      descriptionText: '실거주 인기가 높아 전세가와 매매가 차이가 적습니다.\n단, 전세가 하락 시 집값이 크게 흔들릴 수 있습니다.',
    };
  }

  if (realEstatePER < 1.6) {
    return {
      category: 'stable',
      statusText: '안정구간 (적정 안전마진)',
      statusColor: 'text-[#10b981]',
      statusBg: 'bg-[#10b981]/10 border-[#10b981]/20',
      descriptionText: '경제가 흔들려도 집값이 잘 버티며,\n실제로 살고 싶어 하는 수요가 가격을 든든하게 받쳐줍니다.',
    };
  }

  if (realEstatePER < 1.8) {
    return {
      category: 'average',
      statusText: '평균구간 (시장의 균형점)',
      statusColor: 'text-toss-blue',
      statusBg: 'bg-toss-blue/10 border-toss-blue/20',
      descriptionText: '수도권 아파트들이 일반적으로 갖춘 가치와\n사람들의 보편적인 선호도를 가장 평범하게 보여줍니다.',
    };
  }

  if (realEstatePER <= 2.2) {
    return {
      category: 'growth',
      statusText: '성장구간 (미래 기대감 반영)',
      statusColor: 'text-[#f59e0b]',
      statusBg: 'bg-[#f59e0b]/10 border-[#f59e0b]/20',
      descriptionText: '좋은 학군이나 교통망 덕분에 나중에 집값이 오를 것이란\n기대감이 이미 현재 가격에 포함되어 있습니다.',
    };
  }

  return {
    category: 'speculative',
    statusText: '투자집중구간 (큰 수익 기대)',
    statusColor: 'text-toss-red',
    statusBg: 'bg-toss-red/10 border-[#f04452]/20',
    descriptionText: '재건축 등 호재를 노린 투자금이 몰린 곳으로,\n은행 금리가 오르면 가격이 급락할 수 있으니 주의하세요.',
  };
}

export function formatValuationPrice(p: number): string {
  if (p === 0) return '정보 없음';
  const rounded = Math.round(p / 100) * 100;
  if (rounded >= 10000) {
    const eok = Math.floor(rounded / 10000);
    const man = rounded % 10000;
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만` : `${eok}억`;
  }
  return `${rounded.toLocaleString()}만`;
}

export function generateScenarioReportText(params: {
  aptName: string;
  simBaseRate: number;
  simGrowthRate: number;
  baseFairValue: number;
  simFairValue: number;
  simJeonsePrice: number;
  simJeonseRatio: number;
  simGap: number;
  currentGap: number;
}): string {
  const {
    aptName,
    simBaseRate,
    simGrowthRate,
    baseFairValue,
    simFairValue,
    simJeonsePrice,
    simJeonseRatio,
    simGap,
    currentGap,
  } = params;

  const rateStatus = simBaseRate > 3.25 ? '금리 인상기' : simBaseRate < 3.25 ? '금리 인하기' : '금리 유지';
  const fairChangePercent = baseFairValue > 0 ? ((simFairValue - baseFairValue) / baseFairValue) * 100 : 0;
  const fairChangeText = fairChangePercent > 0
    ? `현재 대비 +${fairChangePercent.toFixed(1)}% 상승`
    : fairChangePercent < 0
      ? `현재 대비 ${fairChangePercent.toFixed(1)}% 하락`
      : '변동 없음';

  const gapDiff = simGap - currentGap;
  const gapDiffText = gapDiff > 0
    ? `필요한 구매차액 ${formatValuationPrice(gapDiff)} 증가`
    : gapDiff < 0
      ? `필요한 구매차액 ${formatValuationPrice(Math.abs(gapDiff))} 감소 (절감)`
      : '구매차액 변동 없음';

  return `[D-VIEW 가치평가 시나리오 분석 리포트]
단지명: ${aptName}
시나리오 적용: 기준금리 ${simBaseRate.toFixed(2)}% (상태: ${rateStatus}), 기대상승률 ${simGrowthRate.toFixed(1)}%

[분석 결과]
- 시뮬레이션 적정가 (DCF): ${formatValuationPrice(simFairValue)} (${fairChangeText})
- 시뮬레이션 전세가: ${formatValuationPrice(simJeonsePrice)} (전세가율: ${simJeonseRatio.toFixed(1)}%)
- 시뮬레이션 구매차액: ${formatValuationPrice(simGap)} (${gapDiffText})

본 리포트는 D-VIEW 밸류에이션 엔진으로 작성되었습니다.`;
}

export function generateCommuteReportText(params: {
  aptName: string;
  destLabel: string;
  analysis: CommuteAnalysisResult;
}): string {
  const { aptName, destLabel, analysis } = params;
  return `[D-VIEW 직주근접 출퇴근 분석]
단지명: ${aptName}
목적지: ${destLabel}
연계 방식: ${analysis.method}
소요 시간: 동탄역까지 ${analysis.linkTime}분 + 대중교통 ${analysis.transitTime}분 = 총 ${analysis.totalTime}분
교통 프리미엄: 60분 기준 ${analysis.savedTime}분 단축 (연 +${(analysis.premium * 100).toFixed(2)}%p 성장률 가산)
`;
}

export function generateValuationJsonLd(params: {
  report: FieldReportData;
  impliedValue: number;
  realEstatePER: number;
  utilityTotal: number;
  utilityMaxTotal: number;
  spread: number;
}): string | null {
  const { report, impliedValue, realEstatePER, utilityTotal, utilityMaxTotal, spread } = params;
  if (!report) return null;

  const aptName = report.apartmentName;
  const dong = report.dong || '';

  const impliedValueStr = impliedValue ? `${impliedValue.toFixed(1)}억 원` : '연산 불가';
  const perStr = realEstatePER ? `${realEstatePER.toFixed(1)}배` : '연산 불가';
  const scoreStr = utilityTotal ? `${utilityTotal}점` : '연산 불가';
  const spreadStr = spread ? `${spread > 0 ? '+' : ''}${spread.toFixed(2)}배` : '0.00배';

  const valuationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: aptName,
    address: {
      '@type': 'PostalAddress',
      addressLocality: '화성시',
      addressRegion: '경기도',
      streetAddress: dong,
      addressCountry: 'KR',
    },
    url: `https://dongtanview.com/apartment/${encodeURIComponent(aptName)}`,
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: '입지 내재 가치 스코어 (Utility Score V2)',
        value: scoreStr,
        maxValue: utilityMaxTotal || 150,
      },
      {
        '@type': 'PropertyValue',
        name: 'DCF 모델 내재가치 평가액',
        value: impliedValueStr,
      },
      {
        '@type': 'PropertyValue',
        name: '실거주 PER',
        value: perStr,
      },
      {
        '@type': 'PropertyValue',
        name: '동탄 법정동 스프레드 대비 고평가율',
        value: spreadStr,
      },
    ],
  };

  return JSON.stringify(valuationSchema);
}
