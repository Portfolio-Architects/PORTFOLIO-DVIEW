'use client';

/**
 * @module MortgageLdiSentinelCard
 * @description Chapter 05: 주담대 LDI 및 역전세 센티넬 대화형 분석 컴포넌트.
 * 원리금균등/원금균등 상환 궤적, 스트레스 DSR 40% 규제 한도 역산 게이지,
 * 금리 충격 민감도(+1.0%p~+3.0%p) 히트맵, 역전세 결손액 진단을 실시간 시뮬레이션.
 *
 * Epistemic Invariants:
 * 1. Arctic Lumina 글래스모피즘 표면 토큰 불변성 준수.
 * 2. 금융 수리 엔진(mortgageEngine.ts) 닫힌 형식 공식 완전 연동.
 * 3. NaN, Infinity, 음수 부동소수점 예외 차단 가드(Sanitization).
 * 4. HODEP v2.2 실증적 무채색 어휘 및 체언/명사형 종결 규격 적용.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  ShieldAlert,
  Calculator,
  TrendingUp,
  AlertTriangle,
  Percent,
  Landmark,
  Activity,
  CheckCircle2,
  Info,
  ArrowRight,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import {
  calculateMortgageLoan,
  calculateDsrMaxLoan,
  calculateInterestRateShock,
  calculateJeonseShortfall,
  RepaymentType,
} from '@/lib/services/mortgage/mortgageEngine';

// ============================================================================
// Props & State Interface Definitions
// ============================================================================

export interface MortgageLdiSentinelCardProps {
  aptName: string;
  dong?: string;
  latestSalePrice?: number;      // 만원 단위 (예: 198500 = 19.85억)
  latestDepositPrice?: number;   // 만원 단위 (예: 77400 = 7.74억)
  jeonseRatio?: number;          // % 단위 (예: 39.0)
  householdCount?: number;       // 단지 세대수
  inline?: boolean;              // 인라인 렌더링 플래그
  onOpenMortgageCalculator?: (aptName: string) => void; // 심층 계산기 모달 트리거
}

const TENOR_OPTIONS = [10, 20, 30, 40, 50] as const;
const JEONSE_SHOCK_OPTIONS = [5, 10, 15, 20, 25, 30] as const;

// ============================================================================
// Sanitization & Numeric Formatting Helpers
// ============================================================================

function sanitizeFinite(val: number, fallback: number = 0): number {
  return Number.isFinite(val) && !Number.isNaN(val) ? val : fallback;
}

function formatManwonToKorean(val: number): string {
  const safeVal = Math.max(0, sanitizeFinite(val));
  if (safeVal === 0) return '0만원';
  const eok = Math.floor(safeVal / 10000);
  const rem = Math.round(safeVal % 10000);
  if (eok > 0 && rem > 0) return `${eok}억 ${rem.toLocaleString()}만원`;
  if (eok > 0) return `${eok}억원`;
  return `${rem.toLocaleString()}만원`;
}

function formatWon(val: number): string {
  const safeVal = Math.max(0, sanitizeFinite(val));
  return `₩${Math.round(safeVal).toLocaleString()}`;
}

// ============================================================================
// Component Implementation
// ============================================================================

export const MortgageLdiSentinelCard: React.FC<MortgageLdiSentinelCardProps> = ({
  aptName,
  dong = '동탄',
  latestSalePrice,
  latestDepositPrice,
  jeonseRatio,
  householdCount,
  inline = false,
  onOpenMortgageCalculator,
}) => {
  // 기준 매매가 및 전세가 확정 (결측 시 정책적 표준 중간값 폴백 적용)
  const baselineSalePrice = useMemo(() => {
    return typeof latestSalePrice === 'number' && latestSalePrice > 0 ? latestSalePrice : 70000;
  }, [latestSalePrice]);

  const baselineDepositPrice = useMemo(() => {
    return typeof latestDepositPrice === 'number' && latestDepositPrice > 0 ? latestDepositPrice : 45000;
  }, [latestDepositPrice]);

  // 초기 대출 원금 산출: 실거래가의 60% (LTV 60% 가정, 1,000만원 단위 반올림)
  const initialPrincipalManwon = useMemo(() => {
    const raw = Math.round((baselineSalePrice * 0.6) / 1000) * 1000;
    return Math.max(1000, Math.min(200000, raw));
  }, [baselineSalePrice]);

  // 대화형 제어 상태
  const [principalManwon, setPrincipalManwon] = useState<number>(initialPrincipalManwon);
  const [annualIncomeManwon, setAnnualIncomeManwon] = useState<number>(7000); // 7,000만원
  const [annualRatePercent, setAnnualRatePercent] = useState<number>(4.2);   // 4.2%
  const [loanPeriodYears, setLoanPeriodYears] = useState<number>(30);        // 30년
  const [repaymentType, setRepaymentType] = useState<RepaymentType>('EQUAL_PRINCIPAL_AND_INTEREST');
  const [jeonseShockRate, setJeonseShockRate] = useState<number>(15);        // 15% 하락
  const [liquidReservesManwon, setLiquidReservesManwon] = useState<number>(0); // 유동성 준비금

  // 단위 환산 (만원 -> 원)
  const principalWon = useMemo(() => Math.max(0, principalManwon * 10000), [principalManwon]);
  const annualIncomeWon = useMemo(() => Math.max(0, annualIncomeManwon * 10000), [annualIncomeManwon]);
  const depositWon = useMemo(() => Math.max(0, baselineDepositPrice * 10000), [baselineDepositPrice]);
  const reservesWon = useMemo(() => Math.max(0, liquidReservesManwon * 10000), [liquidReservesManwon]);

  // 1. 주택담보대출 상환 계산 (현재 선택 방식)
  const mortgageResult = useMemo(() => {
    return calculateMortgageLoan({
      principalWon,
      annualRatePercent,
      loanPeriodYears,
      repaymentType,
    });
  }, [principalWon, annualRatePercent, loanPeriodYears, repaymentType]);

  // 2. 대안 상환 방식 계산 (이자 절감액 비교 산출용)
  const alternativeRepaymentType: RepaymentType = useMemo(() => {
    return repaymentType === 'EQUAL_PRINCIPAL_AND_INTEREST'
      ? 'EQUAL_PRINCIPAL'
      : 'EQUAL_PRINCIPAL_AND_INTEREST';
  }, [repaymentType]);

  const alternativeMortgageResult = useMemo(() => {
    return calculateMortgageLoan({
      principalWon,
      annualRatePercent,
      loanPeriodYears,
      repaymentType: alternativeRepaymentType,
    });
  }, [principalWon, annualRatePercent, loanPeriodYears, alternativeRepaymentType]);

  // 총이자 차액 산출 (원리금균등 대비 원금균등 이자 절감액)
  const interestDeltaWon = useMemo(() => {
    return Math.abs(mortgageResult.totalInterestWon - alternativeMortgageResult.totalInterestWon);
  }, [mortgageResult.totalInterestWon, alternativeMortgageResult.totalInterestWon]);

  // 3. 스트레스 DSR 40% 규제 한도 역산 (스트레스 가산금리 +1.2%p 기본)
  const dsrLimitResult = useMemo(() => {
    return calculateDsrMaxLoan({
      annualIncomeWon,
      baseRatePercent: annualRatePercent,
      loanPeriodYears,
      repaymentType,
      stressSpreadPercent: 1.2,
      dsrLimitRatio: 0.40,
    });
  }, [annualIncomeWon, annualRatePercent, loanPeriodYears, repaymentType]);

  // 현재 대출의 스트레스 DSR 산정: 스트레스 금리(R + 1.2%p) 적용 시 연간 원리금 상환액 기준
  const currentStressCalc = useMemo(() => {
    return calculateMortgageLoan({
      principalWon,
      annualRatePercent: annualRatePercent + 1.2,
      loanPeriodYears,
      repaymentType,
    });
  }, [principalWon, annualRatePercent, loanPeriodYears, repaymentType]);

  const currentAnnualDebtServiceWon = useMemo(() => {
    if (repaymentType === 'EQUAL_PRINCIPAL') {
      // 1년차 12개월분 상환액 (또는 월평균 * 12)
      return currentStressCalc.averageMonthlyPaymentWon * 12;
    }
    return currentStressCalc.monthlyPaymentWon * 12;
  }, [repaymentType, currentStressCalc]);

  const currentDsrPercent = useMemo(() => {
    if (annualIncomeWon <= 0) return 0;
    const ratio = (currentAnnualDebtServiceWon / annualIncomeWon) * 100;
    return sanitizeFinite(Math.round(ratio * 10) / 10);
  }, [currentAnnualDebtServiceWon, annualIncomeWon]);

  // DSR 상태 판정
  const dsrStatus = useMemo(() => {
    if (currentDsrPercent > 40.0) {
      return {
        label: '규제 한도 초과',
        color: 'text-rose-600 dark:text-rose-400',
        badgeBg: 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        barColor: 'bg-rose-500',
        isExceeded: true,
      };
    }
    if (currentDsrPercent >= 35.0) {
      return {
        label: '한도 주의 구간',
        color: 'text-amber-600 dark:text-amber-400',
        badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        barColor: 'bg-amber-500',
        isExceeded: false,
      };
    }
    return {
      label: '한도 여유 (안정)',
      color: 'text-emerald-600 dark:text-emerald-400',
      badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      barColor: 'bg-emerald-500',
      isExceeded: false,
    };
  }, [currentDsrPercent]);

  // 가용 한도 대비 차액 (만원)
  const maxLoanManwon = useMemo(() => Math.round(dsrLimitResult.maxLoanWon / 10000), [dsrLimitResult.maxLoanWon]);
  const loanMarginManwon = useMemo(() => maxLoanManwon - principalManwon, [maxLoanManwon, principalManwon]);

  // 4. 금리 충격 민감도 히트맵 (+1.0%p, +1.5%p, +2.0%p, +3.0%p)
  const rateShockResult = useMemo(() => {
    return calculateInterestRateShock({
      principalWon,
      baseRatePercent: annualRatePercent,
      loanPeriodYears,
      repaymentType,
      shockSpreads: [1.0, 1.5, 2.0, 3.0],
    });
  }, [principalWon, annualRatePercent, loanPeriodYears, repaymentType]);

  // 5. 역전세 결손액 센티넬
  const jeonseShortfallResult = useMemo(() => {
    return calculateJeonseShortfall({
      depositWon,
      declineRate: jeonseShockRate / 100,
      reservesWon,
    });
  }, [depositWon, jeonseShockRate, reservesWon]);

  const shortfallManwon = useMemo(() => {
    return Math.round(jeonseShortfallResult.shortfallWon / 10000);
  }, [jeonseShortfallResult.shortfallWon]);

  // 이벤트 핸들러
  const handlePrincipalChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPrincipalManwon(sanitizeFinite(Number(e.target.value), 42000));
  }, []);

  const handleIncomeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAnnualIncomeManwon(sanitizeFinite(Number(e.target.value), 7000));
  }, []);

  const handleRateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAnnualRatePercent(sanitizeFinite(Number(e.target.value), 4.2));
  }, []);

  const handleRepaymentToggle = useCallback((type: RepaymentType) => {
    setRepaymentType(type);
  }, []);

  const handleTenorChange = useCallback((tenor: number) => {
    setLoanPeriodYears(tenor);
  }, []);

  const handleShockRateChange = useCallback((rate: number) => {
    setJeonseShockRate(rate);
  }, []);

  return (
    <div
      data-testid="mortgage-ldi-sentinel-card"
      className="w-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl rounded-[20px] border border-slate-200/80 dark:border-slate-800/80 p-5 md:p-8 shadow-sm flex flex-col gap-6 text-slate-800 dark:text-slate-100"
    >
      {/* 1. 헤더 영역 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">
            <Landmark size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[18px] font-bold tracking-tight text-slate-900 dark:text-slate-50">
                주담대 LDI 및 스트레스 DSR 센티넬
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                실시간 수리 엔진
              </span>
            </div>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
              단지 실거래 기준 대출 상환액 역산, 스트레스 DSR 40% 한도 게이지 및 역전세 결손액 감응도 진단
            </p>
          </div>
        </div>

        {onOpenMortgageCalculator && (
          <button
            type="button"
            onClick={() => onOpenMortgageCalculator(aptName)}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-bold rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 transition-colors cursor-pointer"
          >
            <Calculator size={14} />
            <span>정밀 계산기 모달</span>
          </button>
        )}
      </div>

      {/* 2. 대화형 제어 패널 (슬라이더 및 상환 방식/기간 토글) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-4 sm:p-5">
        {/* 좌측: 상환 방식 토글 및 대출 기간 칩 (5열) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div>
            <label className="text-[12px] font-bold text-slate-600 dark:text-slate-300 mb-1.5 block">
              상환 방식 선택
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-200/70 dark:bg-slate-900/60 p-1 rounded-xl">
              <button
                type="button"
                data-testid="repayment-amortizing-btn"
                onClick={() => handleRepaymentToggle('EQUAL_PRINCIPAL_AND_INTEREST')}
                className={`py-2 px-3 text-[13px] font-bold rounded-lg transition-all ${
                  repaymentType === 'EQUAL_PRINCIPAL_AND_INTEREST'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                원리금균등
              </button>
              <button
                type="button"
                data-testid="repayment-principal-btn"
                onClick={() => handleRepaymentToggle('EQUAL_PRINCIPAL')}
                className={`py-2 px-3 text-[13px] font-bold rounded-lg transition-all ${
                  repaymentType === 'EQUAL_PRINCIPAL'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                원금균등
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              {repaymentType === 'EQUAL_PRINCIPAL_AND_INTEREST'
                ? '매월 원리금 합계액 일정, 초기 이자 비중 우세'
                : '원금 균등 분할 상환, 회차별 상환액 점진적 감소'}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-300">
                대출 기간 (만기)
              </label>
              <span className="text-[12px] font-mono font-bold text-blue-600 dark:text-blue-400">
                {loanPeriodYears}년 ({loanPeriodYears * 12}개월)
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TENOR_OPTIONS.map((years) => (
                <button
                  key={years}
                  type="button"
                  data-testid={`tenor-${years}-btn`}
                  onClick={() => handleTenorChange(years)}
                  className={`flex-1 py-1.5 px-2 text-[12px] font-mono font-bold rounded-lg border transition-all ${
                    loanPeriodYears === years
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {years}년
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 우측: 원금, 연소득, 금리 슬라이더 (7열) */}
        <div className="lg:col-span-7 flex flex-col gap-3.5 justify-center">
          {/* 대출 원금 슬라이더 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300">
                대출 원금
              </span>
              <span className="text-[13px] font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {formatManwonToKorean(principalManwon)}
              </span>
            </div>
            <input
              type="range"
              data-testid="principal-slider"
              min={1000}
              max={200000}
              step={1000}
              value={principalManwon}
              onChange={handlePrincipalChange}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
              <span>1,000만</span>
              <span>10억</span>
              <span>20억</span>
            </div>
          </div>

          {/* 연소득 슬라이더 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300">
                차주 연소득
              </span>
              <span className="text-[13px] font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {formatManwonToKorean(annualIncomeManwon)}
              </span>
            </div>
            <input
              type="range"
              data-testid="income-slider"
              min={2000}
              max={30000}
              step={500}
              value={annualIncomeManwon}
              onChange={handleIncomeChange}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
              <span>2,000만</span>
              <span>1.5억</span>
              <span>3억</span>
            </div>
          </div>

          {/* 적용 금리 슬라이더 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300">
                대출 기본 금리
              </span>
              <span className="text-[13px] font-mono font-bold tabular-nums text-blue-600 dark:text-blue-400">
                {annualRatePercent.toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              data-testid="rate-slider"
              min={2.0}
              max={8.0}
              step={0.1}
              value={annualRatePercent}
              onChange={handleRateChange}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
              <span>2.0%</span>
              <span>5.0%</span>
              <span>8.0%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 핵심 상환액 및 총이자 비교 지표 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* 카드 1: 월 상환액 */}
        <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400">
              {repaymentType === 'EQUAL_PRINCIPAL_AND_INTEREST' ? '월 상환액 (고정)' : '1회차 월 상환액'}
            </span>
            <Activity size={16} className="text-blue-500" />
          </div>
          <div className="mt-2.5">
            <div className="text-[20px] md:text-[22px] font-extrabold font-mono tabular-nums text-slate-900 dark:text-slate-50">
              {repaymentType === 'EQUAL_PRINCIPAL_AND_INTEREST'
                ? formatWon(mortgageResult.monthlyPaymentWon)
                : formatWon(mortgageResult.firstMonthPaymentWon)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {repaymentType === 'EQUAL_PRINCIPAL' && (
                <span>만기 회차: {formatWon(mortgageResult.lastMonthPaymentWon)} /월</span>
              )}
              {repaymentType === 'EQUAL_PRINCIPAL_AND_INTEREST' && (
                <span>연간 상환액: {formatWon(mortgageResult.monthlyPaymentWon * 12)}</span>
              )}
            </div>
          </div>
        </div>

        {/* 카드 2: 총 대출 이자 */}
        <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400">
              총 납부 이자액
            </span>
            <Percent size={16} className="text-amber-500" />
          </div>
          <div className="mt-2.5">
            <div className="text-[20px] md:text-[22px] font-extrabold font-mono tabular-nums text-slate-900 dark:text-slate-50">
              {formatWon(mortgageResult.totalInterestWon)}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
              {repaymentType === 'EQUAL_PRINCIPAL'
                ? `원리금균등 대비 ₩${Math.round(interestDeltaWon / 10000).toLocaleString()}만원 이자 절감`
                : `원금균등 전환 시 ₩${Math.round(interestDeltaWon / 10000).toLocaleString()}만원 이자 절감`}
            </div>
          </div>
        </div>

        {/* 카드 3: 총 상환 총액 */}
        <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400">
              원리금 총 상환액
            </span>
            <Landmark size={16} className="text-slate-500" />
          </div>
          <div className="mt-2.5">
            <div className="text-[20px] md:text-[22px] font-extrabold font-mono tabular-nums text-slate-900 dark:text-slate-50">
              {formatWon(mortgageResult.totalPaymentWon)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              원금 {formatManwonToKorean(principalManwon)} + 이자 {formatWon(mortgageResult.totalInterestWon)}
            </div>
          </div>
        </div>
      </div>

      {/* 4. 스트레스 DSR 40% 규제 한도 게이지 모듈 */}
      <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-5 flex flex-col gap-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-blue-600 dark:text-blue-400" />
            <h4 className="text-[14px] font-bold text-slate-900 dark:text-slate-100">
              스트레스 DSR 40% 규제 한도 게이지
            </h4>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              (스트레스 가산금리 +1.2%p 적용: {dsrLimitResult.stressRatePercent.toFixed(1)}%)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              data-testid="dsr-status-badge"
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border ${dsrStatus.badgeBg}`}
            >
              {dsrStatus.label}
            </span>
            <span className="text-[14px] font-mono font-extrabold tabular-nums text-slate-900 dark:text-slate-50">
              DSR {currentDsrPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* 프로그레스 바 및 40% 규제선 마커 */}
        <div className="relative w-full pt-4 pb-2">
          {/* 규제 기준선 40% 마커 레이블 */}
          <div
            className="absolute top-0 text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 flex flex-col items-center -translate-x-1/2 pointer-events-none"
            style={{ left: `${(40 / 60) * 100}%` }}
          >
            <span>규제 상한 40.0%</span>
            <div className="w-0.5 h-2 bg-rose-500 mt-0.5" />
          </div>

          {/* 게이지 트랙 */}
          <div className="w-full h-3.5 bg-slate-200 dark:bg-slate-700/70 rounded-full overflow-hidden relative">
            <div
              data-testid="dsr-progress-bar"
              className={`h-full transition-all duration-300 rounded-full ${dsrStatus.barColor}`}
              style={{ width: `${Math.min(100, (currentDsrPercent / 60) * 100)}%` }}
            />
          </div>

          {/* 눈금자 라벨 */}
          <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
            <span>0%</span>
            <span>20%</span>
            <span>40% (법정 규제)</span>
            <span>60%</span>
          </div>
        </div>

        {/* 대출 가능 한도 통계 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[12px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">차주 소득 기반 최대 대출 한도 (P_max)</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
              {formatManwonToKorean(maxLoanManwon)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">현재 원금 대비 한도 여력</span>
            <span
              className={`font-mono font-bold ${
                loanMarginManwon >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {loanMarginManwon >= 0
                ? `+${formatManwonToKorean(loanMarginManwon)} 여유`
                : `${formatManwonToKorean(Math.abs(loanMarginManwon))} 초과`}
            </span>
          </div>
        </div>
      </div>

      {/* 5. 금리 충격 민감도 히트맵 (+1.0%p, +1.5%p, +2.0%p, +3.0%p) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-amber-500" />
            <h4 className="text-[14px] font-bold text-slate-900 dark:text-slate-100">
              금리 충격 민감도 히트맵 (Interest Rate Shock)
            </h4>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            기준금리 인상 시 추가 상환 부담 벡터
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {rateShockResult.scenarios.map((sc) => {
            const isHighSeverity = sc.spreadPercent >= 2.0;
            return (
              <div
                key={sc.spreadPercent}
                data-testid={`rate-shock-card-${sc.spreadPercent}`}
                className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                  isHighSeverity
                    ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-800/60'
                    : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-800/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded ${
                      isHighSeverity
                        ? 'bg-rose-200/70 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                        : 'bg-amber-200/70 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                    }`}
                  >
                    +{sc.spreadPercent.toFixed(1)}%p
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                    {sc.shockedRatePercent.toFixed(1)}%
                  </span>
                </div>

                <div className="mt-2.5">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">월 상환 증가액</div>
                  <div
                    className={`text-[15px] font-mono font-extrabold tabular-nums ${
                      isHighSeverity
                        ? 'text-rose-700 dark:text-rose-300'
                        : 'text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    +{formatWon(sc.deltaMonthlyPaymentWon)}/월
                  </div>
                </div>

                <div className="mt-1 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>연 부담</span>
                  <span>+{formatWon(sc.deltaAnnualPaymentWon)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. 역전세 결손액 센티넬 (Reverse Jeonse Shortfall) */}
      <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-5 flex flex-col gap-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle
              size={18}
              className={
                jeonseShortfallResult.hasShortfall
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }
            />
            <h4 className="text-[14px] font-bold text-slate-900 dark:text-slate-100">
              역전세 보증금 결손액 센티넬 (Reverse Jeonse Shortfall)
            </h4>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">단지 전세가 기준:</span>
            <span className="text-[12px] font-mono font-bold text-slate-900 dark:text-slate-100">
              {formatManwonToKorean(baselineDepositPrice)}
            </span>
          </div>
        </div>

        {/* 전세 하락률 시나리오 칩 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-bold text-slate-600 dark:text-slate-400">
            시뮬레이션 전세 하락률:
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {JEONSE_SHOCK_OPTIONS.map((rate) => (
              <button
                key={rate}
                type="button"
                data-testid={`jeonse-shock-${rate}-btn`}
                onClick={() => handleShockRateChange(rate)}
                className={`py-1 px-2.5 text-[11px] font-mono font-bold rounded-lg border transition-all ${
                  jeonseShockRate === rate
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                -{rate}%
              </button>
            ))}
          </div>
        </div>

        {/* 결손액 결과 안내 카드 */}
        <div
          data-testid="jeonse-shortfall-alert"
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            jeonseShortfallResult.hasShortfall
              ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {jeonseShortfallResult.hasShortfall ? (
              <AlertTriangle size={20} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="text-[13px] font-bold">
                {jeonseShortfallResult.hasShortfall
                  ? `만기 시 보증금 반환 결손액 발생 위험 (${jeonseShockRate}% 하락 시)`
                  : '유동성 방어선 정상 (결손 미발생)'}
              </div>
              <p className="text-[11px] opacity-90 mt-0.5">
                {jeonseShortfallResult.hasShortfall
                  ? '임차인 퇴거 시 보증금 차액 마련을 위해 전세보증금 반환대출(DSR 40% 규제 적용) 또는 자기자본 확보 필요.'
                  : '현재 조건에서는 추가 자금 조달 없이 기존 보증금 및 유동성 자본으로 반환 대응 가능.'}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[11px] opacity-80">예상 반환 결손액</div>
            <div className="text-[18px] font-mono font-extrabold tabular-nums">
              {formatWon(jeonseShortfallResult.shortfallWon)}
            </div>
            <div className="text-[10px] opacity-75 font-mono">
              ({formatManwonToKorean(shortfallManwon)})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MortgageLdiSentinelCard;
