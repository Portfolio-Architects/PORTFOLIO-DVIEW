'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Calculator,
  Landmark,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  calculateEqualPrincipalAndInterest,
  calculateEqualPrincipal,
  calculateDsrMaxLoan,
  type RepaymentType,
} from '@/lib/services/mortgage/mortgageEngine';
import {
  getToggleTrackClass,
  getToggleBtnClass,
} from '@/lib/design-system/controls';
import { trackEvent } from '@/lib/utils/analytics';
import {
  persistPendingCalculatorContext,
  type PendingCalculatorContextPayload,
} from '@/lib/utils/pendingCalculatorContext';

export type { PendingCalculatorContextPayload };

export type InlineFinanceBridgeSurface =
  | 'apartment_modal_top'
  | 'apartment_inline_top'
  | 'apartment_ssr_top'
  | 'guide_top_summary'
  | 'guide_mid_conversion';

export interface OpenCalculatorModalEventDetail {
  calcType: 'mortgage' | 'property_tax';
  aptName?: string;
  priceWon?: number;
  annualIncomeManwon?: number;
  areaOver85?: boolean;
  surface: InlineFinanceBridgeSurface;
  trigger: string;
  alreadyTrackedOpen?: boolean;
}

export interface InlineMortgageDsrBridgeProps {
  apartmentName?: string;
  canonicalSlug?: string;
  dong?: string;
  /** Verified MOLIT sale price in 만원 (e.g. 145000 = 14.5억). Never pass fabricated/mock values. */
  benchmarkPriceManwon?: number;
  guideSlug?: string;
  surface: InlineFinanceBridgeSurface;
  trigger: string;
  defaultFocus?: 'mortgage' | 'tax';
  compact?: boolean;
  onOpenMortgage?: (aptName: string, priceWon?: number, trigger?: string) => void;
  onOpenTaxCalculator?: (aptName: string, trigger?: string) => void;
}

const LTV_OPTIONS = [50, 60, 70] as const;
const INCOME_OPTIONS_MANWON = [
  { label: '6천', value: 6000 },
  { label: '8천', value: 8000 },
  { label: '1억', value: 10000 },
] as const;
const FALLBACK_PRICE_TIERS_MANWON = [
  { label: '6억', value: 60000 },
  { label: '9억', value: 90000 },
  { label: '12억', value: 120000 },
] as const;
const MATURITY_YEARS_OPTIONS = [20, 30, 40] as const;

export type TaxHouseholdTier = '1house' | 'first_home' | 'multi_8' | 'corp_12';

export function computeStatutoryResidentialAcquisitionTax(
  priceWon: number,
  tier: TaxHouseholdTier = '1house',
  areaOver85 = false
): { totalTaxWon: number; effectiveRatePct: number; firstHomeSavedWon: number } {
  if (!Number.isFinite(priceWon) || priceWon <= 0) {
    return { totalTaxWon: 0, effectiveRatePct: 0, firstHomeSavedWon: 0 };
  }

  if (tier === 'multi_8') {
    const ratePct = areaOver85 ? 9.0 : 8.4;
    const total = Math.round(priceWon * (ratePct * 0.01));
    return { totalTaxWon: total, effectiveRatePct: ratePct, firstHomeSavedWon: 0 };
  }
  if (tier === 'corp_12') {
    const ratePct = areaOver85 ? 13.4 : 12.4;
    const total = Math.round(priceWon * (ratePct * 0.01));
    return { totalTaxWon: total, effectiveRatePct: ratePct, firstHomeSavedWon: 0 };
  }

  // Statutory non-adjusted 1·2-household rate (지방세법 제11조 + 지방교육세 10% + 전용 85㎡ 초과 시 농특세 0.2%p)
  const priceEok = priceWon / 100_000_000;
  let baseRatePct = 1.0;
  if (priceWon <= 600_000_000) {
    baseRatePct = 1.0;
  } else if (priceWon <= 900_000_000) {
    baseRatePct = Math.min(3.0, Math.max(1.0, (priceEok * 2) / 3 - 3));
  } else {
    baseRatePct = 3.0;
  }

  const ruralSpecialRatePct = areaOver85 ? 0.2 : 0;
  const rawTotalRatePct = baseRatePct * 1.1 + ruralSpecialRatePct;
  const effectiveRatePct = Math.round(rawTotalRatePct * 100) / 100;
  const standardTotalWon = Math.round(priceWon * rawTotalRatePct * 0.01);

  // 생애최초 주택 구입 취득세 최대 200만원 감면 (12억 이하 요건 반영)
  if (tier === 'first_home' && priceWon <= 1_200_000_000) {
    const saved = Math.min(2_000_000, standardTotalWon);
    return {
      totalTaxWon: Math.max(0, standardTotalWon - saved),
      effectiveRatePct,
      firstHomeSavedWon: saved,
    };
  }

  return {
    totalTaxWon: standardTotalWon,
    effectiveRatePct,
    firstHomeSavedWon: 0,
  };
}

function formatManwonLabel(manwon: number): string {
  const safe = Number.isFinite(manwon) && manwon > 0 ? Math.round(manwon) : 0;
  if (safe === 0) return '0원';
  const eok = Math.floor(safe / 10000);
  const rem = safe % 10000;
  if (eok === 0) return `${rem.toLocaleString('ko-KR')}만원`;
  if (rem === 0) return `${eok}억`;
  const cheon = Math.round(rem / 1000);
  if (rem % 1000 === 0 && cheon > 0 && cheon < 10) {
    return `${eok}.${cheon}억`;
  }
  return `${eok}억 ${rem.toLocaleString('ko-KR')}만`;
}

export default function InlineMortgageDsrBridge({
  apartmentName,
  canonicalSlug,
  dong,
  benchmarkPriceManwon,
  guideSlug,
  surface,
  trigger,
  defaultFocus = 'mortgage',
  compact = false,
  onOpenMortgage,
  onOpenTaxCalculator,
}: InlineMortgageDsrBridgeProps) {
  const hasVerifiedPrice =
    typeof benchmarkPriceManwon === 'number' &&
    Number.isFinite(benchmarkPriceManwon) &&
    benchmarkPriceManwon > 0;

  const verifiedPriceManwon = hasVerifiedPrice ? Math.round(benchmarkPriceManwon!) : 0;
  const isGuideSurface = surface === 'guide_top_summary' || surface === 'guide_mid_conversion';

  const [priceSource, setPriceSource] = useState<'verified' | 'tier'>(
    hasVerifiedPrice ? 'verified' : 'tier'
  );
  const [fallbackTierManwon, setFallbackTierManwon] = useState<number>(90000);
  const [ltvPercent, setLtvPercent] = useState<(typeof LTV_OPTIONS)[number]>(70);
  const [annualIncomeManwon, setAnnualIncomeManwon] = useState<number>(8000);

  // Standalone inline precision drawer states (used on /guide/[slug] and SSR top where modal host is absent)
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'mortgage' | 'tax'>(defaultFocus);
  const [annualRatePct, setAnnualRatePct] = useState<number>(4.0);
  const [maturityYears, setMaturityYears] = useState<(typeof MATURITY_YEARS_OPTIONS)[number]>(30);
  const [repaymentType, setRepaymentType] = useState<RepaymentType>(
    'EQUAL_PRINCIPAL_AND_INTEREST'
  );
  const [taxTier, setTaxTier] = useState<TaxHouseholdTier>('1house');
  const [areaOver85, setAreaOver85] = useState<boolean>(false);

  useEffect(() => {
    setActiveDrawerTab(defaultFocus);
  }, [defaultFocus]);

  useEffect(() => {
    setPriceSource(hasVerifiedPrice ? 'verified' : 'tier');
  }, [hasVerifiedPrice, verifiedPriceManwon]);

  const isUsingVerifiedPrice = hasVerifiedPrice && priceSource === 'verified';
  const effectivePriceManwon = isUsingVerifiedPrice ? verifiedPriceManwon : fallbackTierManwon;
  const effectivePriceWon = Math.max(0, effectivePriceManwon * 10_000);
  const loanPrincipalWon = Math.round(effectivePriceWon * (ltvPercent / 100));
  const loanPrincipalManwon = Math.round(loanPrincipalWon / 10_000);
  const annualIncomeWon = Math.max(0, annualIncomeManwon * 10_000);

  const calcMetrics = useMemo(() => {
    const safeRate = Math.min(20, Math.max(0.5, Number.isFinite(annualRatePct) ? annualRatePct : 4.0));
    const equalPi = calculateEqualPrincipalAndInterest({
      principalWon: loanPrincipalWon,
      annualRatePercent: safeRate,
      loanPeriodYears: maturityYears,
      repaymentType: 'EQUAL_PRINCIPAL_AND_INTEREST',
    });
    const equalP = calculateEqualPrincipal({
      principalWon: loanPrincipalWon,
      annualRatePercent: safeRate,
      loanPeriodYears: maturityYears,
      repaymentType: 'EQUAL_PRINCIPAL',
    });
    const dsr = calculateDsrMaxLoan({
      annualIncomeWon,
      baseRatePercent: safeRate,
      loanPeriodYears: maturityYears,
      repaymentType,
      stressSpreadPercent: 1.2,
      dsrLimitRatio: 0.4,
    });
    const acqTax = computeStatutoryResidentialAcquisitionTax(
      effectivePriceWon,
      taxTier,
      areaOver85
    );

    const primaryMonthlyWon =
      repaymentType === 'EQUAL_PRINCIPAL_AND_INTEREST'
        ? equalPi.monthlyPaymentWon
        : equalP.firstMonthPaymentWon;
    const totalInterestWon =
      repaymentType === 'EQUAL_PRINCIPAL_AND_INTEREST'
        ? equalPi.totalInterestWon
        : equalP.totalInterestWon;

    const effectiveAllowedLoanWon = Math.min(loanPrincipalWon, dsr.maxLoanWon);
    const requiredCashWon = Math.max(0, effectivePriceWon - effectiveAllowedLoanWon);
    const isWithinDsr = loanPrincipalWon <= dsr.maxLoanWon;

    return {
      monthlyPaymentManwon: Math.round(primaryMonthlyWon / 10_000),
      totalInterestManwon: Math.round(totalInterestWon / 10_000),
      dsrMaxLoanManwon: Math.round(dsr.maxLoanWon / 10_000),
      dsrStressRatePct: dsr.stressRatePercent,
      requiredCashManwon: Math.round(requiredCashWon / 10_000),
      isWithinDsr,
      acqTaxManwon: Math.round(acqTax.totalTaxWon / 10_000),
      acqEffectiveRatePct: acqTax.effectiveRatePct,
      firstHomeSavedManwon: Math.round(acqTax.firstHomeSavedWon / 10_000),
    };
  }, [
    loanPrincipalWon,
    annualRatePct,
    maturityYears,
    annualIncomeWon,
    repaymentType,
    effectivePriceWon,
    taxTier,
    areaOver85,
  ]);

  const emitQuickInteract = (action: string, extra?: Record<string, string | number | boolean>) => {
    trackEvent('finance_quick_interact', {
      widget_type: 'inline_mortgage_dsr_bridge',
      calculator_type: activeDrawerTab === 'tax' ? 'property_tax' : 'mortgage',
      surface,
      trigger,
      action,
      apartment_name: apartmentName || undefined,
      guide_slug: guideSlug || undefined,
      ...extra,
    });
  };

  const persistPendingCalcContext = (alreadyTrackedOpen = false) => {
    persistPendingCalculatorContext({
      aptName: isUsingVerifiedPrice ? apartmentName || undefined : undefined,
      canonicalSlug: isUsingVerifiedPrice ? canonicalSlug || undefined : undefined,
      priceManwon: effectivePriceManwon,
      annualIncomeManwon,
      areaOver85,
      alreadyTrackedOpen,
    });
  };

  const handlePrimaryMortgageCta = () => {
    if (onOpenMortgage) {
      persistPendingCalcContext(false);
      onOpenMortgage(
        isUsingVerifiedPrice ? apartmentName || '' : '',
        effectivePriceWon,
        trigger
      );
      return;
    }

    const willOpenOrSwitch = !isDrawerOpen || activeDrawerTab !== 'mortgage';
    if (willOpenOrSwitch) {
      trackEvent('open_calculator', {
        calculator_type: 'mortgage',
        surface,
        trigger,
        apartment_name: apartmentName || undefined,
        apt_name: apartmentName || undefined,
        dong: dong || undefined,
        guide_slug: guideSlug || undefined,
        benchmark_price_manwon: effectivePriceManwon,
      });
      setActiveDrawerTab('mortgage');
      setIsDrawerOpen(true);
    } else {
      setIsDrawerOpen(false);
    }
  };

  const handleSecondaryTaxCta = () => {
    const taxTrigger = `${trigger}_tax`;
    if (onOpenTaxCalculator) {
      persistPendingCalcContext(false);
      onOpenTaxCalculator(
        isUsingVerifiedPrice ? apartmentName || '' : '',
        taxTrigger
      );
      return;
    }

    const willOpenOrSwitch = !isDrawerOpen || activeDrawerTab !== 'tax';
    if (willOpenOrSwitch) {
      trackEvent('open_calculator', {
        calculator_type: 'property_tax',
        surface,
        trigger: taxTrigger,
        apartment_name: apartmentName || undefined,
        apt_name: apartmentName || undefined,
        dong: dong || undefined,
        guide_slug: guideSlug || undefined,
        benchmark_price_manwon: effectivePriceManwon,
      });
      setActiveDrawerTab('tax');
      setIsDrawerOpen(true);
    } else {
      setIsDrawerOpen(false);
    }
  };

  const resolvedSlug = isUsingVerifiedPrice ? canonicalSlug || apartmentName || '' : '';
  const deepLinkCalcParam = activeDrawerTab === 'tax' ? 'property_tax' : 'mortgage';
  const deepLinkHref = resolvedSlug
    ? `/apartment/${encodeURIComponent(resolvedSlug)}?calc=${deepLinkCalcParam}`
    : `/?calc=${deepLinkCalcParam}`;

  const handleDeepLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    persistPendingCalcContext(true);
    emitQuickInteract('escalate_to_full_modal', {
      target_calc: deepLinkCalcParam,
      price_manwon: effectivePriceManwon,
    });

    if (typeof window !== 'undefined' && window.__dviewDashboardCalcHostActive) {
      e.preventDefault();
      window.dispatchEvent(
        new CustomEvent<OpenCalculatorModalEventDetail>('dview:open_calculator_modal', {
          detail: {
            calcType: deepLinkCalcParam,
            aptName: isUsingVerifiedPrice
              ? apartmentName || canonicalSlug || undefined
              : undefined,
            priceWon: effectivePriceWon,
            annualIncomeManwon,
            areaOver85,
            surface,
            trigger: `${trigger}_drawer_deeplink`,
            alreadyTrackedOpen: true,
          },
        })
      );
    }
  };

  return (
    <div
      data-testid="inline-mortgage-dsr-bridge"
      data-surface={surface}
      className={`w-full rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] ${
        compact ? 'p-3 sm:p-3.5' : 'p-3.5 sm:p-4'
      } space-y-2.5 min-h-[68px]`}
    >
      {/* Top 1-Line Instant DSR 40% & Monthly Payment Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
        <div className="flex flex-col gap-2 min-w-0">
          {/* Controls Row */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[11px] font-extrabold tabular-nums">
              <Calculator size={12} className="shrink-0" />
              <span>
                {isUsingVerifiedPrice
                  ? `${apartmentName ? `${apartmentName} · ` : ''}실거래 ${formatManwonLabel(effectivePriceManwon)}`
                  : `예산 기준 ${formatManwonLabel(effectivePriceManwon)}`}
              </span>
            </span>

            {(!hasVerifiedPrice || isGuideSurface) && (
              <div
                role="group"
                aria-label="시뮬레이션 기준 매매가 선택"
                className={getToggleTrackClass()}
              >
                {hasVerifiedPrice && isGuideSurface && (
                  <button
                    type="button"
                    onClick={() => {
                      setPriceSource('verified');
                      emitQuickInteract('change_price_tier', {
                        price_manwon: verifiedPriceManwon,
                        price_source: 'verified',
                      });
                    }}
                    className={getToggleBtnClass({
                      active: isUsingVerifiedPrice,
                      size: 'sm',
                      tone: 'emerald',
                      extraClass: 'tabular-nums',
                    })}
                  >
                    실거래 {formatManwonLabel(verifiedPriceManwon)}
                  </button>
                )}
                {FALLBACK_PRICE_TIERS_MANWON.filter(
                  (tier) => !(hasVerifiedPrice && isGuideSurface && tier.value === verifiedPriceManwon)
                ).map((tier) => (
                  <button
                    key={tier.value}
                    type="button"
                    onClick={() => {
                      setPriceSource('tier');
                      setFallbackTierManwon(tier.value);
                      emitQuickInteract('change_price_tier', {
                        price_manwon: tier.value,
                        price_source: 'tier',
                      });
                    }}
                    className={getToggleBtnClass({
                      active: !isUsingVerifiedPrice && fallbackTierManwon === tier.value,
                      size: 'sm',
                      tone: 'neutral',
                      extraClass: 'tabular-nums',
                    })}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            )}

            {/* LTV Toggle */}
            <div
              role="group"
              aria-label="주택담보대출 LTV 비율 선택"
              className={getToggleTrackClass()}
            >
              {LTV_OPTIONS.map((ltv) => (
                <button
                  key={ltv}
                  type="button"
                  onClick={() => {
                    setLtvPercent(ltv);
                    emitQuickInteract('change_ltv', { ltv_pct: ltv });
                  }}
                  className={getToggleBtnClass({
                    active: ltvPercent === ltv,
                    size: 'sm',
                    tone: 'blue',
                    extraClass: 'tabular-nums',
                  })}
                >
                  LTV {ltv}%
                </button>
              ))}
            </div>

            {/* Annual Income Toggle */}
            <div
              role="group"
              aria-label="연소득 구간 선택"
              className={getToggleTrackClass()}
            >
              {INCOME_OPTIONS_MANWON.map((inc) => (
                <button
                  key={inc.value}
                  type="button"
                  onClick={() => {
                    setAnnualIncomeManwon(inc.value);
                    emitQuickInteract('change_income', { annual_income_manwon: inc.value });
                  }}
                  className={getToggleBtnClass({
                    active: annualIncomeManwon === inc.value,
                    size: 'sm',
                    tone: 'emerald',
                    extraClass: 'tabular-nums',
                  })}
                >
                  소득 {inc.label}
                </button>
              ))}
            </div>
          </div>

          {/* 1-Line Instant KPI Output */}
          <div
            data-testid="inline-mortgage-dsr-kpi-line"
            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-secondary font-semibold tabular-nums"
          >
            <span>
              원금 <strong className="font-extrabold text-primary">{formatManwonLabel(loanPrincipalManwon)}</strong>
            </span>
            <span className="text-tertiary">·</span>
            <span>
              월 상환{' '}
              <strong className="font-black text-blue-600 dark:text-blue-400">
                약 {calcMetrics.monthlyPaymentManwon.toLocaleString('ko-KR')}만원
              </strong>
            </span>
            <span className="text-tertiary">·</span>
            <span className="inline-flex items-center gap-1">
              <span>DSR 40% 한도</span>
              <strong className="font-black text-emerald-700 dark:text-emerald-300">
                {formatManwonLabel(calcMetrics.dsrMaxLoanManwon)}
              </strong>
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10.5px] font-extrabold ${
                  calcMetrics.isWithinDsr
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400'
                }`}
              >
                {calcMetrics.isWithinDsr ? (
                  <ShieldCheck size={11} className="shrink-0" />
                ) : (
                  <AlertTriangle size={11} className="shrink-0" />
                )}
                <span>{calcMetrics.isWithinDsr ? '한도 이내' : '한도 초과'}</span>
              </span>
            </span>
            <span className="text-tertiary">·</span>
            <span>
              취득세{' '}
              <strong className="font-extrabold text-primary">
                약 {calcMetrics.acqTaxManwon.toLocaleString('ko-KR')}만원
              </strong>{' '}
              <span className="text-[10.5px] font-bold text-tertiary">
                ({areaOver85 ? '85㎡↑' : '85㎡↓'})
              </span>
            </span>
          </div>
        </div>

        {/* Conversion CTA Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            data-testid="inline-mortgage-dsr-open-btn"
            onClick={handlePrimaryMortgageCta}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap ${
              defaultFocus === 'tax'
                ? 'bg-surface dark:bg-[#202027] hover:bg-slate-100 dark:hover:bg-[#2c2c35] text-primary'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Calculator size={13} className="shrink-0" />
            <span>주담대·DSR 계산기</span>
            {!onOpenMortgage &&
              (isDrawerOpen && activeDrawerTab === 'mortgage' ? (
                <ChevronUp size={13} className="shrink-0" />
              ) : (
                <ChevronDown size={13} className="shrink-0" />
              ))}
          </button>

          <button
            type="button"
            data-testid="inline-tax-calc-open-btn"
            onClick={handleSecondaryTaxCta}
            className={`inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap ${
              defaultFocus === 'tax'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-surface dark:bg-[#202027] hover:bg-slate-100 dark:hover:bg-[#2c2c35] text-secondary hover:text-primary'
            }`}
          >
            <Landmark size={13} className="shrink-0" />
            <span>취득세 계산기</span>
            {!onOpenTaxCalculator &&
              (isDrawerOpen && activeDrawerTab === 'tax' ? (
                <ChevronUp size={13} className="shrink-0" />
              ) : (
                <ChevronDown size={13} className="shrink-0" />
              ))}
          </button>
        </div>
      </div>

      {/* Standalone Precision Calculator Drawer (for SSR Guide & SSR Apartment Report surfaces) */}
      {isDrawerOpen && (!onOpenMortgage || !onOpenTaxCalculator) && (
        <div
          data-testid="inline-precision-calc-drawer"
          className="rounded-xl bg-surface dark:bg-[#202027] p-3.5 sm:p-4 space-y-3 tabular-nums"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div role="group" aria-label="정밀 계산기 모드 전환" className={getToggleTrackClass()}>
              <button
                type="button"
                onClick={() => setActiveDrawerTab('mortgage')}
                className={getToggleBtnClass({
                  active: activeDrawerTab === 'mortgage',
                  size: 'sm',
                  tone: 'blue',
                })}
              >
                주담대 · 스트레스 DSR
              </button>
              <button
                type="button"
                onClick={() => setActiveDrawerTab('tax')}
                className={getToggleBtnClass({
                  active: activeDrawerTab === 'tax',
                  size: 'sm',
                  tone: 'emerald',
                })}
              >
                취득세 · 생애최초 감면
              </button>
            </div>

            <Link
              href={deepLinkHref}
              prefetch={false}
              data-testid="inline-calc-deep-link-cta"
              onClick={handleDeepLinkClick}
              className="inline-flex items-center gap-1 text-[11.5px] font-extrabold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <span>
                {isUsingVerifiedPrice && apartmentName
                  ? `${apartmentName} 전체 시뮬레이터 열기`
                  : '전체 금융 계산기 모달 열기'}
              </span>
              <ArrowUpRight size={12} className="shrink-0" />
            </Link>
          </div>

          {activeDrawerTab === 'mortgage' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Interest Rate Control */}
                <div className="rounded-xl bg-[#f9fafb] dark:bg-[#17171c] p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-secondary">
                    <span>대출 금리 (연)</span>
                    <strong className="text-blue-600 dark:text-blue-400 font-black">
                      {annualRatePct.toFixed(1)}%
                    </strong>
                  </div>
                  <input
                    type="range"
                    aria-label="대출 연금리 조절"
                    min="2.5"
                    max="6.5"
                    step="0.1"
                    value={annualRatePct}
                    onChange={(e) => setAnnualRatePct(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="text-[10.5px] text-tertiary font-semibold">
                    스트레스 금리 {calcMetrics.dsrStressRatePct.toFixed(1)}% 적용
                  </div>
                </div>

                {/* Maturity Years Control */}
                <div className="rounded-xl bg-[#f9fafb] dark:bg-[#17171c] p-2.5 space-y-1.5">
                  <div className="text-[11px] font-bold text-secondary">대출 만기</div>
                  <div className={getToggleTrackClass('w-full grid grid-cols-3')}>
                    {MATURITY_YEARS_OPTIONS.map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setMaturityYears(yr)}
                        className={getToggleBtnClass({
                          active: maturityYears === yr,
                          size: 'sm',
                          tone: 'blue',
                        })}
                      >
                        {yr}년
                      </button>
                    ))}
                  </div>
                </div>

                {/* Repayment Type Control */}
                <div className="rounded-xl bg-[#f9fafb] dark:bg-[#17171c] p-2.5 space-y-1.5">
                  <div className="text-[11px] font-bold text-secondary">상환 방식</div>
                  <div className={getToggleTrackClass('w-full grid grid-cols-2')}>
                    <button
                      type="button"
                      onClick={() => setRepaymentType('EQUAL_PRINCIPAL_AND_INTEREST')}
                      className={getToggleBtnClass({
                        active: repaymentType === 'EQUAL_PRINCIPAL_AND_INTEREST',
                        size: 'sm',
                        tone: 'blue',
                      })}
                    >
                      원리금균등
                    </button>
                    <button
                      type="button"
                      onClick={() => setRepaymentType('EQUAL_PRINCIPAL')}
                      className={getToggleBtnClass({
                        active: repaymentType === 'EQUAL_PRINCIPAL',
                        size: 'sm',
                        tone: 'blue',
                      })}
                    >
                      원금균등
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="rounded-xl bg-[#f9fafb] dark:bg-[#17171c] p-2.5">
                  <div className="text-[10.5px] font-bold text-tertiary">초회 월 상환액</div>
                  <div className="mt-0.5 text-sm font-black text-blue-600 dark:text-blue-400">
                    {calcMetrics.monthlyPaymentManwon.toLocaleString('ko-KR')}만원
                  </div>
                </div>
                <div className="rounded-xl bg-[#f9fafb] dark:bg-[#17171c] p-2.5">
                  <div className="text-[10.5px] font-bold text-tertiary">스트레스 DSR 한도</div>
                  <div className="mt-0.5 text-sm font-black text-emerald-700 dark:text-emerald-300">
                    {formatManwonLabel(calcMetrics.dsrMaxLoanManwon)}
                  </div>
                </div>
                <div className="rounded-xl bg-[#f9fafb] dark:bg-[#17171c] p-2.5">
                  <div className="text-[10.5px] font-bold text-tertiary">최소 필요 현금</div>
                  <div className="mt-0.5 text-sm font-black text-primary">
                    {formatManwonLabel(calcMetrics.requiredCashManwon)}
                  </div>
                </div>
                <div className="rounded-xl bg-[#f9fafb] dark:bg-[#17171c] p-2.5">
                  <div className="text-[10.5px] font-bold text-tertiary">만기 총 이자</div>
                  <div className="mt-0.5 text-sm font-black text-secondary">
                    {formatManwonLabel(calcMetrics.totalInterestManwon)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-secondary">보유 주택 기준:</span>
                  <div className={getToggleTrackClass('flex-wrap')}>
                    {(
                      [
                        { id: '1house', label: '비조정 1·2주택' },
                        { id: 'first_home', label: '생애최초 감면' },
                        {
                          id: 'multi_8',
                          label: `3주택 중과 (${areaOver85 ? '9.0%' : '8.4%'})`,
                        },
                        {
                          id: 'corp_12',
                          label: `4주택·법인 (${areaOver85 ? '13.4%' : '12.4%'})`,
                        },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setTaxTier(opt.id);
                          emitQuickInteract('change_tax_tier', { tax_tier: opt.id });
                        }}
                        className={getToggleBtnClass({
                          active: taxTier === opt.id,
                          size: 'sm',
                          tone: 'emerald',
                          extraClass: 'tabular-nums',
                        })}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  role="group"
                  aria-label="전용면적 농어촌특별세 기준 선택"
                  className={getToggleTrackClass()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setAreaOver85(false);
                      emitQuickInteract('change_area_over_85', { area_over_85: false });
                    }}
                    className={getToggleBtnClass({
                      active: !areaOver85,
                      size: 'sm',
                      tone: 'blue',
                      extraClass: 'tabular-nums',
                    })}
                  >
                    85㎡ 이하
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAreaOver85(true);
                      emitQuickInteract('change_area_over_85', { area_over_85: true });
                    }}
                    className={getToggleBtnClass({
                      active: areaOver85,
                      size: 'sm',
                      tone: 'blue',
                      extraClass: 'tabular-nums',
                    })}
                  >
                    85㎡ 초과
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="rounded-xl bg-[#f9fafb] dark:bg-[#17171c] p-2.5">
                  <div className="text-[10.5px] font-bold text-tertiary">취득 기준가</div>
                  <div className="mt-0.5 text-sm font-black text-primary">
                    {formatManwonLabel(effectivePriceManwon)}
                  </div>
                </div>
                <div className="rounded-xl bg-[#f9fafb] dark:bg-[#17171c] p-2.5">
                  <div className="text-[10.5px] font-bold text-tertiary">적용 실효세율 (교육세 포함)</div>
                  <div className="mt-0.5 text-sm font-black text-blue-600 dark:text-blue-400">
                    {calcMetrics.acqEffectiveRatePct}%
                  </div>
                </div>
                <div className="rounded-xl bg-[#f9fafb] dark:bg-[#17171c] p-2.5">
                  <div className="text-[10.5px] font-bold text-tertiary">예상 납부 취득세</div>
                  <div className="mt-0.5 text-sm font-black text-emerald-700 dark:text-emerald-300">
                    {calcMetrics.acqTaxManwon.toLocaleString('ko-KR')}만원
                    {calcMetrics.firstHomeSavedManwon > 0 && (
                      <span className="ml-1 text-[11px] font-bold text-secondary">
                        (-{calcMetrics.firstHomeSavedManwon}만 감면)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
