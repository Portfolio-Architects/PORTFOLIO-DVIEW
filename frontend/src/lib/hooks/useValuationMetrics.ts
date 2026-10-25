'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import useSWR from 'swr';
import type { FieldReportData } from '@/lib/DashboardFacade';
import type { AptTxSummary } from '@/types/transaction';
import { MACRO_CONFIG } from '@/lib/macro-summary';
import { normalizeAptName } from '@/lib/utils/apartmentMapping';
import { logger } from '@/lib/services/logger';
import {
  calculateDynamicDCF,
  calculateDongSpread,
  calculateForwardJeonseTrajectory,
  type DCFResult,
  type DongSpreadResult,
  type ForwardJeonseTrajectoryResult,
} from '@/lib/utils/valuationEngine';
import {
  calculateUtilityScoreV2,
  calculateCommuteAnalysis,
  calculateTransactionValuationStats,
  calculateConversionRateSpread,
  simulateDCFScenario,
  evaluatePERStatus,
  formatValuationPrice,
  generateScenarioReportText,
  generateCommuteReportText,
  generateValuationJsonLd,
  type UtilityScoreV2Result,
  type CommuteAnalysisResult,
  type CommuteDestination,
  type TxRecord,
  type TxValuationStatsResult,
  type SimulatedDCFResult,
  type PERStatusResult,
} from '@/lib/analytics/valuationModels';

export interface MacroRatesResponse {
  success?: boolean;
  data?: {
    riskFreeRate?: number;
    fundingCost?: number;
  };
}

const EMPTY_TX_SUMMARY: Record<string, AptTxSummary> = Object.freeze({});

export interface UseValuationMetricsResult {
  // 거시 및 단지 설정
  macroConfig: typeof MACRO_CONFIG.macroEnvironment;
  dynamicConversionRate: number;
  spreadReasons: string[];
  effectiveConversionRate: number;
  overrideScore: number;

  // 거래 통계 및 PER
  txStats: TxValuationStatsResult;
  perStatus: PERStatusResult;
  hasData: boolean;

  // 도메인 수리 결과
  utilityScoreResult: UtilityScoreV2Result;
  dcf: DCFResult;
  spreadData: DongSpreadResult;
  trajectory: ForwardJeonseTrajectoryResult;
  simulatedDCF: SimulatedDCFResult;
  computedFundingSpread: number;

  // 기준가 대비 괴리
  diff1M: { amount: number; percent: number; isOver: boolean };
  diff3M: { amount: number; percent: number; isOver: boolean };

  // 대화형 컨트롤 상태 및 핸들러
  commuteDest: CommuteDestination;
  setCommuteDest: (dest: CommuteDestination) => void;
  commuteAnalysis: CommuteAnalysisResult;
  simBaseRate: number;
  setSimBaseRate: (val: number) => void;
  simGrowthRate: number;
  setSimGrowthRate: (val: number) => void;

  // UI 모달/아코디언 상태
  isValuationModalOpen: boolean;
  setIsValuationModalOpen: (open: boolean) => void;
  isScoreAccordionOpen: boolean;
  setIsScoreAccordionOpen: (open: boolean) => void;
  handleScoreAccordionToggle: () => void;

  // 클립보드 복사 상태 및 핸들러
  isCopiedScenario: boolean;
  isCopiedCommute: boolean;
  handleCopyScenario: () => void;
  handleCopyCommute: () => void;

  // Helper
  formatPrice: (p: number) => string;

  // SEO
  valuationJsonLd: string | null;
}

export function useValuationMetrics(
  report: FieldReportData,
  transactions: TxRecord[],
  txSummaryData: Record<string, AptTxSummary> = EMPTY_TX_SUMMARY
): UseValuationMetricsResult {
  const [isValuationModalOpen, setIsValuationModalOpen] = useState(false);
  const [isScoreAccordionOpen, setIsScoreAccordionOpen] = useState(false);
  const [macroConfig, setMacroConfig] = useState(MACRO_CONFIG.macroEnvironment);
  const [overrideScore, setOverrideScore] = useState(0);
  const [simBaseRate, setSimBaseRate] = useState(3.25);
  const [simGrowthRate, setSimGrowthRate] = useState(2.0);
  const [isCopiedScenario, setIsCopiedScenario] = useState(false);
  const [commuteDest, setCommuteDest] = useState<CommuteDestination>('gangnam');
  const [isCopiedCommute, setIsCopiedCommute] = useState(false);

  const copiedScenarioTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const copiedCommuteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

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
    };
  }, []);

  // 1. 출퇴근 분석
  const commuteAnalysis = useMemo(() => {
    return calculateCommuteAnalysis(report?.metrics, commuteDest);
  }, [report, commuteDest]);

  // 2. Firestore Valuation Overrides
  useEffect(() => {
    setOverrideScore(prev => (prev === 0 ? prev : 0));
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
          const normName = normalizeAptName(report?.apartmentName || '');
          const targetScore = (data && data[normName] !== undefined) ? Number(data[normName]) : 0;
          setOverrideScore(prev => (prev === targetScore ? prev : targetScore));
        } else {
          setOverrideScore(prev => (prev === 0 ? prev : 0));
        }
      } catch (err) {
        if (active) {
          logger.error('useValuationMetrics', 'Failed to load valuation overrides', { apartmentName: report?.apartmentName }, err);
        }
      }
    };
    if (report?.apartmentName) {
      fetchOverrides();
    }
    return () => {
      active = false;
    };
  }, [report?.apartmentName]);

  // 3. SWR Macro Rates Fetching
  const { data: ratesRes } = useSWR<MacroRatesResponse>(
    '/api/macro/rates',
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) return { success: false };
      return res.json();
    },
    { revalidateOnFocus: false }
  );

  const ratesRiskFreeRate = ratesRes?.data?.riskFreeRate;
  const ratesFundingCost = ratesRes?.data?.fundingCost;
  const isRatesSuccess = ratesRes?.success;
  const hasValidRates =
    typeof ratesRiskFreeRate === 'number' || typeof ratesFundingCost === 'number';

  useEffect(() => {
    if (!isRatesSuccess || !hasValidRates) {
      return;
    }

    setMacroConfig(prev => {
      const nextRiskFreeRate =
        typeof ratesRiskFreeRate === 'number' ? ratesRiskFreeRate : prev.riskFreeRate;
      const nextFundingCost =
        typeof ratesFundingCost === 'number' ? ratesFundingCost : prev.fundingCost;

      if (
        prev.riskFreeRate === nextRiskFreeRate &&
        prev.fundingCost === nextFundingCost
      ) {
        return prev; // Bailout!
      }

      return {
        ...prev,
        riskFreeRate: nextRiskFreeRate,
        fundingCost: nextFundingCost,
      };
    });
  }, [isRatesSuccess, hasValidRates, ratesRiskFreeRate, ratesFundingCost]);

  // 4. 거래 통계 계산
  const txStats = useMemo(() => {
    return calculateTransactionValuationStats(transactions);
  }, [transactions]);

  // 5. 전월세전환율 동적 스프레드
  const { dynamicConversionRate, spreadReasons } = useMemo(() => {
    return calculateConversionRateSpread(
      report?.metrics,
      report?.apartmentName || '',
      macroConfig.jeonseConversionRate
    );
  }, [report, macroConfig.jeonseConversionRate]);

  const dynamicMacroConfig = useMemo(() => {
    if (macroConfig.jeonseConversionRate === dynamicConversionRate) {
      return macroConfig;
    }
    return { ...macroConfig, jeonseConversionRate: dynamicConversionRate };
  }, [macroConfig, dynamicConversionRate]);

  // 6. Utility Score V2
  const utilityScoreResult = useMemo(() => {
    return calculateUtilityScoreV2(report, overrideScore);
  }, [report, overrideScore]);

  // 7. Dynamic DCF
  const dcf = useMemo(() => {
    return calculateDynamicDCF(
      txStats.avg3MRent,
      dynamicMacroConfig,
      report?.metrics,
      1.5,
      utilityScoreResult.total,
      commuteAnalysis.premium
    );
  }, [txStats.avg3MRent, dynamicMacroConfig, report?.metrics, utilityScoreResult.total, commuteAnalysis.premium]);

  const computedFundingSpread = useMemo(() => {
    return dcf.discountRate - macroConfig.riskFreeRate - (dcf.dynamicPremium ?? 1.5);
  }, [dcf.discountRate, macroConfig.riskFreeRate, dcf.dynamicPremium]);

  const effectiveConversionRate = useMemo(() => {
    return dcf.dynamicJeonseConversionRate !== undefined
      ? dcf.dynamicJeonseConversionRate / 100
      : dynamicConversionRate;
  }, [dcf.dynamicJeonseConversionRate, dynamicConversionRate]);

  // 8. Dong Spread
  const spreadData = useMemo(() => {
    const targetDongMatch = report?.apartmentName?.match(/\[(.*?)\]/);
    let targetDong = targetDongMatch ? targetDongMatch[1] : '';

    if (!targetDong && report?.apartmentName) {
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

    return calculateDongSpread(
      txStats.realEstatePER,
      realDongPERs.length > 0 ? realDongPERs : (txStats.realEstatePER > 0 ? [txStats.realEstatePER] : [])
    );
  }, [report?.apartmentName, txSummaryData, txStats.realEstatePER]);

  // 9. Forward Trajectory
  const trajectory = useMemo(() => {
    const dongName = report?.apartmentName?.includes('동탄') ? '동탄2신도시' : '화성시';
    const pipeline = MACRO_CONFIG.supplyPipelines[dongName] || MACRO_CONFIG.supplyPipelines['화성시'];
    return calculateForwardJeonseTrajectory(txStats.avg3MRent, pipeline);
  }, [report?.apartmentName, txStats.avg3MRent]);

  // Sync simGrowthRate with DCF growth rate
  useEffect(() => {
    if (dcf.growthRate > 0) {
      const targetGrowthRate = Math.round(dcf.growthRate * 10) / 10;
      setSimGrowthRate(prev => (prev === targetGrowthRate ? prev : targetGrowthRate));
    }
  }, [dcf.growthRate, report?.apartmentName]);

  // 10. 거시경제 시나리오 시뮬레이션
  const simulatedDCF = useMemo(() => {
    return simulateDCFScenario({
      simBaseRate,
      simGrowthRate,
      macroConfig,
      avg3MRent: txStats.avg3MRent,
      avg3MSale: txStats.avg3MSale,
      dynamicConversionRate,
      commutePremium: commuteAnalysis.premium,
    });
  }, [
    simBaseRate,
    simGrowthRate,
    macroConfig,
    txStats.avg3MRent,
    txStats.avg3MSale,
    dynamicConversionRate,
    commuteAnalysis.premium,
  ]);

  // 11. PER 상태 평가
  const perStatus = useMemo(() => {
    return evaluatePERStatus(txStats.realEstatePER);
  }, [txStats.realEstatePER]);

  // 12. 괴리 계산
  const diff1M = useMemo(() => {
    const amount = txStats.avg1MSale - dcf.impliedValue;
    const percent = dcf.impliedValue > 0 ? (Math.abs(amount) / dcf.impliedValue) * 100 : 0;
    return { amount: Math.abs(amount), percent, isOver: amount > 0 };
  }, [txStats.avg1MSale, dcf.impliedValue]);

  const diff3M = useMemo(() => {
    const amount = txStats.avg3MSale - dcf.impliedValue;
    const percent = dcf.impliedValue > 0 ? (Math.abs(amount) / dcf.impliedValue) * 100 : 0;
    return { amount: Math.abs(amount), percent, isOver: amount > 0 };
  }, [txStats.avg3MSale, dcf.impliedValue]);

  // 13. 클립보드 복사 핸들러
  const handleCopyScenario = useCallback(() => {
    const text = generateScenarioReportText({
      aptName: report?.apartmentName || '',
      simBaseRate,
      simGrowthRate,
      baseFairValue: dcf.impliedValue,
      simFairValue: simulatedDCF.impliedValue,
      simJeonsePrice: simulatedDCF.simJeonsePrice,
      simJeonseRatio: simulatedDCF.simJeonseRatio,
      simGap: simulatedDCF.simGap,
      currentGap: txStats.currentGap,
    });

    if (copiedScenarioTimeoutRef.current) {
      clearTimeout(copiedScenarioTimeoutRef.current);
      copiedScenarioTimeoutRef.current = null;
    }

    navigator.clipboard.writeText(text).then(() => {
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
      logger.error('useValuationMetrics', 'Failed to copy scenario', undefined, err);
    });
  }, [report?.apartmentName, simBaseRate, simGrowthRate, dcf.impliedValue, simulatedDCF, txStats.currentGap]);

  const handleCopyCommute = useCallback(() => {
    const destName = commuteDest === 'gangnam' ? '강남역' : commuteDest === 'pangyo' ? '판교역' : '삼성역';
    const text = generateCommuteReportText({
      aptName: report?.apartmentName || '',
      destLabel: destName,
      analysis: commuteAnalysis,
    });

    if (copiedCommuteTimeoutRef.current) {
      clearTimeout(copiedCommuteTimeoutRef.current);
      copiedCommuteTimeoutRef.current = null;
    }

    navigator.clipboard.writeText(text).then(() => {
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
    }).catch(err => {
      logger.error('useValuationMetrics', 'Failed to copy commute', undefined, err);
    });
  }, [report?.apartmentName, commuteDest, commuteAnalysis]);

  const handleScoreAccordionToggle = useCallback(() => {
    setIsScoreAccordionOpen(prev => !prev);
  }, []);

  // 14. JSON-LD
  const valuationJsonLd = useMemo(() => {
    return generateValuationJsonLd({
      report,
      impliedValue: dcf.impliedValue,
      realEstatePER: txStats.realEstatePER,
      utilityTotal: utilityScoreResult.total,
      utilityMaxTotal: utilityScoreResult.maxTotal,
      spread: spreadData.spread,
    });
  }, [report, dcf.impliedValue, txStats.realEstatePER, utilityScoreResult, spreadData]);

  const hasData = txStats.realEstatePER > 0 || utilityScoreResult.total > 0;

  return {
    macroConfig,
    dynamicConversionRate,
    spreadReasons,
    effectiveConversionRate,
    overrideScore,
    txStats,
    perStatus,
    hasData,
    utilityScoreResult,
    dcf,
    spreadData,
    trajectory,
    simulatedDCF,
    computedFundingSpread,
    diff1M,
    diff3M,
    commuteDest,
    setCommuteDest,
    commuteAnalysis,
    simBaseRate,
    setSimBaseRate,
    simGrowthRate,
    setSimGrowthRate,
    isValuationModalOpen,
    setIsValuationModalOpen,
    isScoreAccordionOpen,
    setIsScoreAccordionOpen,
    handleScoreAccordionToggle,
    isCopiedScenario,
    isCopiedCommute,
    handleCopyScenario,
    handleCopyCommute,
    formatPrice: formatValuationPrice,
    valuationJsonLd,
  };
}
