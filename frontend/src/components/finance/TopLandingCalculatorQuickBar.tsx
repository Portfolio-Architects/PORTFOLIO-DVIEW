'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Calculator,
  Landmark,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import type { RelocationSimulatorBridgePayload } from '@/components/technovalley/TechnoValleyBounceDefenseBridge';
import { getVisualSignalPillClass } from '@/lib/design-system/copyDiet';
import { trackEvent } from '@/lib/utils/analytics';
import { persistPendingCalculatorContext } from '@/lib/utils/pendingCalculatorContext';

export const OPEN_INLINE_FINANCE_DRAWER_EVENT = 'dview:open_inline_finance_drawer';

export interface OpenInlineFinanceDrawerDetail {
  targetId?: string;
  tab: 'mortgage' | 'tax';
  alreadyTrackedOpen?: boolean;
}

export interface TopLandingCalculatorQuickBarProps {
  variant: 'technovalley' | 'guide';
  surface: string;
  /** Verified residential display name (guide) or Knowledge Industry Center name (technovalley). */
  targetName?: string;
  /** Verified canonical apartment slug (residential only). */
  canonicalSlug?: string;
  dong?: string;
  /** Verified MOLIT sale price in 만원 (positive finite number only). */
  benchmarkPriceManwon?: number;
  guideSlug?: string;
  /** Highlights corporate_tax_simulator ahead of residential calculators (e.g. corporate relocation guides). */
  emphasizeCorporateTax?: boolean;
  /** Target element ID for in-page InlineMortgageDsrBridge drawer sync on guide routes. */
  inlineBridgeTargetId?: string;
  className?: string;
}

function isModifiedLinkClick(e: React.MouseEvent<HTMLAnchorElement>): boolean {
  return Boolean(
    e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      (typeof e.button === 'number' && e.button !== 0)
  );
}

function prefersReducedMotionNow(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return Boolean(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch {
    return false;
  }
}

export default function TopLandingCalculatorQuickBar({
  variant,
  surface,
  targetName,
  canonicalSlug,
  dong,
  benchmarkPriceManwon,
  guideSlug,
  emphasizeCorporateTax = false,
  inlineBridgeTargetId = 'guide-top-finance-bridge',
  className = '',
}: TopLandingCalculatorQuickBarProps) {
  const scrollRetryTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (scrollRetryTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(scrollRetryTimerRef.current);
        scrollRetryTimerRef.current = null;
      }
    };
  }, []);

  const safeTargetName = targetName?.trim() || undefined;
  const safeCanonicalSlug = canonicalSlug?.trim() || undefined;
  const safeDong = dong?.trim() || undefined;
  const safePriceManwon =
    typeof benchmarkPriceManwon === 'number' &&
    Number.isFinite(benchmarkPriceManwon) &&
    benchmarkPriceManwon > 0
      ? Math.round(benchmarkPriceManwon)
      : undefined;

  const residentialMortgageHref = safeCanonicalSlug
    ? `/apartment/${encodeURIComponent(safeCanonicalSlug)}?calc=mortgage`
    : '/?calc=mortgage';

  const scrollToTaxSimulatorWithRetry = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const behavior: ScrollBehavior = prefersReducedMotionNow() ? 'auto' : 'smooth';

    const tryFocusSimulator = (): boolean => {
      const simEl = document.getElementById('tax-simulator');
      if (!simEl) return false;
      if (typeof simEl.scrollIntoView === 'function') {
        simEl.scrollIntoView({ behavior, block: 'start' });
      }
      if (typeof (simEl as HTMLElement).focus === 'function') {
        (simEl as HTMLElement).focus({ preventScroll: true });
      }
      window.__dviewPendingRelocationSim = undefined;
      return true;
    };

    if (tryFocusSimulator()) return;

    if (scrollRetryTimerRef.current !== null) {
      window.clearTimeout(scrollRetryTimerRef.current);
      scrollRetryTimerRef.current = null;
    }

    const delays = [120, 300, 700, 1200];
    let step = 0;
    const scheduleNext = () => {
      if (step >= delays.length) return;
      const delay = delays[step++];
      scrollRetryTimerRef.current = window.setTimeout(() => {
        scrollRetryTimerRef.current = null;
        if (!tryFocusSimulator()) {
          scheduleNext();
        }
      }, delay);
    };
    scheduleNext();
  };

  const handleTechnoValleyCorporateTaxClick = () => {
    const attributedCenter = safeTargetName || '동탄테크노밸리';
    const clampedSimPrice = Math.min(500000, Math.max(5000, safePriceManwon ?? 30000));
    const payload: RelocationSimulatorBridgePayload = {
      purchasePriceManwon: clampedSimPrice,
      existingLocation: 'overconcentrated',
    };

    trackEvent('open_calculator', {
      calculator_type: 'corporate_tax_simulator',
      surface,
      trigger: 'top_quick_bar_corporate_tax',
      apartment_name: attributedCenter,
      apt_name: attributedCenter,
      purchase_price_manwon: clampedSimPrice,
    });

    if (typeof window !== 'undefined') {
      window.__dviewPendingRelocationSim = payload;
      window.dispatchEvent(
        new CustomEvent<RelocationSimulatorBridgePayload>('dview:set_relocation_sim_price', {
          detail: payload,
        })
      );
      try {
        if (window.history && typeof window.history.replaceState === 'function') {
          const nextUrl = `${window.location.pathname}${window.location.search}#tax-simulator`;
          window.history.replaceState(window.history.state, '', nextUrl);
        }
      } catch {
        // Ignore history restrictions in sandboxed environments
      }
      scrollToTaxSimulatorWithRetry();
    }
  };

  const handleTechnoValleyMortgageLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isModifiedLinkClick(e)) return;
    const attributedCenter = safeTargetName || '동탄테크노밸리';
    persistPendingCalculatorContext({
      alreadyTrackedOpen: true,
    });
    trackEvent('open_calculator', {
      calculator_type: 'mortgage',
      surface,
      trigger: 'top_quick_bar_mortgage',
      apartment_name: attributedCenter,
      apt_name: attributedCenter,
    });
  };

  const handleGuideInlineCalculatorClick = (tab: 'mortgage' | 'tax') => {
    const calcType = tab === 'tax' ? 'property_tax' : 'mortgage';
    const triggerName =
      tab === 'tax' ? 'guide_top_quick_bar_tax' : 'guide_top_quick_bar_mortgage';

    trackEvent('open_calculator', {
      calculator_type: calcType,
      surface,
      trigger: triggerName,
      ...(guideSlug ? { guide_slug: guideSlug } : {}),
      ...(safeTargetName ? { apartment_name: safeTargetName, apt_name: safeTargetName } : {}),
      ...(safeDong ? { dong: safeDong } : {}),
      ...(safePriceManwon ? { benchmark_price_manwon: safePriceManwon } : {}),
    });

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const targetEl = document.getElementById(inlineBridgeTargetId);
      if (targetEl) {
        window.dispatchEvent(
          new CustomEvent<OpenInlineFinanceDrawerDetail>(OPEN_INLINE_FINANCE_DRAWER_EVENT, {
            detail: {
              targetId: inlineBridgeTargetId,
              tab,
              alreadyTrackedOpen: true,
            },
          })
        );
        if (typeof targetEl.scrollIntoView === 'function') {
          targetEl.scrollIntoView({
            behavior: prefersReducedMotionNow() ? 'auto' : 'smooth',
            block: 'start',
          });
        }
        try {
          window.history?.replaceState?.(
            window.history.state,
            '',
            `${window.location.pathname}${window.location.search}#${inlineBridgeTargetId}`
          );
        } catch {
          // Ignore sandboxed history errors
        }
        return;
      }

      persistPendingCalculatorContext({
        aptName: safeTargetName,
        canonicalSlug: safeCanonicalSlug,
        priceManwon: safePriceManwon,
        alreadyTrackedOpen: true,
      });
      const fallbackHref =
        tab === 'tax'
          ? safeCanonicalSlug
            ? `/apartment/${encodeURIComponent(safeCanonicalSlug)}?calc=property_tax`
            : '/?calc=property_tax'
          : residentialMortgageHref;
      try {
        window.location.assign(fallbackHref);
      } catch {
        // Ignore navigation errors in test/sandboxed environments
      }
    }
  };

  const handleGuideCorporateTaxLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isModifiedLinkClick(e)) return;
    if (typeof window !== 'undefined') {
      window.__dviewPendingRelocationSim = {
        purchasePriceManwon: 30000,
        existingLocation: 'overconcentrated',
      };
    }
    trackEvent('open_calculator', {
      calculator_type: 'corporate_tax_simulator',
      surface,
      trigger: 'guide_top_quick_bar_corporate_tax',
      ...(guideSlug ? { guide_slug: guideSlug } : {}),
      apartment_name: '동탄테크노밸리',
      apt_name: '동탄테크노밸리',
    });
  };

  if (variant === 'technovalley') {
    return (
      <section
        data-testid="top-landing-calculator-quick-bar"
        data-variant="technovalley"
        data-surface={surface}
        aria-label="동탄테크노밸리 금융 계산기 퀵 진입 바"
        className={`w-full rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] px-3.5 py-2.5 sm:px-4 sm:py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 min-h-[56px] box-border ${className}`}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className={getVisualSignalPillClass({ tone: 'safe', size: 'xs' })}>
            <Calculator size={12} className="shrink-0" />
            <span>금융 퀵 계산기</span>
          </span>
          <span className="text-xs sm:text-[13px] font-extrabold text-primary truncate tabular-nums">
            {safeTargetName
              ? `${safeTargetName} · 취득세 35% 감면 · 배후 주거 주담대`
              : '법인·취득세 35% 감면 · 배후 주거 주담대 DSR'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0 min-w-0 max-w-full">
          <button
            type="button"
            data-testid="top-calc-quick-corporate-tax-btn"
            onClick={handleTechnoValleyCorporateTaxClick}
            className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11.5px] sm:text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap max-w-full"
          >
            <Landmark size={13} className="shrink-0" />
            <span>법인·취득세 35% 감면 계산</span>
            <ArrowDownRight size={13} className="shrink-0" />
          </button>

          <Link
            href="/?calc=mortgage"
            prefetch={false}
            data-testid="top-calc-quick-mortgage-btn"
            onClick={handleTechnoValleyMortgageLinkClick}
            className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11.5px] sm:text-xs font-extrabold transition-colors whitespace-nowrap max-w-full"
          >
            <Calculator size={13} className="shrink-0" />
            <span>배후 주거 주담대·DSR 계산</span>
            <ArrowUpRight size={13} className="shrink-0" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="top-landing-calculator-quick-bar"
      data-variant="guide"
      data-surface={surface}
      aria-label="리포트 상단 금융 계산기 퀵 진입 바"
      className={`w-full rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] px-3 py-2.5 sm:px-4 sm:py-3 flex flex-col xl:flex-row xl:items-center justify-between gap-2 min-h-[56px] box-border ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={getVisualSignalPillClass({
            tone: emphasizeCorporateTax ? 'safe' : 'down',
            size: 'xs',
          })}
        >
          <Calculator size={12} className="shrink-0" />
          <span>금융 퀵 계산기</span>
        </span>
        <span className="text-xs sm:text-[13px] font-extrabold text-primary truncate tabular-nums">
          {safeTargetName
            ? `${safeTargetName} 기준 주담대 DSR 40% · 취득세 · 법인 세제`
            : '주담대 스트레스 DSR 40% · 취득세 · 법인 세제'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0 min-w-0 max-w-full">
        {emphasizeCorporateTax && (
          <Link
            href="/technovalley#tax-simulator"
            prefetch={false}
            data-testid="top-calc-quick-corporate-tax-btn"
            onClick={handleGuideCorporateTaxLinkClick}
            className="inline-flex items-center justify-center gap-1 min-h-[34px] sm:min-h-[36px] px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11.5px] sm:text-xs font-extrabold transition-colors whitespace-nowrap"
          >
            <Landmark size={13} className="shrink-0" />
            <span>법인·지산 세제 시뮬레이터</span>
            <ArrowUpRight size={13} className="shrink-0" />
          </Link>
        )}

        <button
          type="button"
          data-testid="top-calc-quick-mortgage-btn"
          onClick={() => handleGuideInlineCalculatorClick('mortgage')}
          className="inline-flex items-center justify-center gap-1 min-h-[34px] sm:min-h-[36px] px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11.5px] sm:text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap"
        >
          <Calculator size={13} className="shrink-0" />
          <span>주담대·DSR 계산</span>
          <ArrowDownRight size={13} className="shrink-0" />
        </button>

        <button
          type="button"
          data-testid="top-calc-quick-tax-btn"
          onClick={() => handleGuideInlineCalculatorClick('tax')}
          className="inline-flex items-center justify-center gap-1 min-h-[34px] sm:min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-surface dark:bg-[#202027] hover:bg-[#f2f4f6] dark:hover:bg-[#2c2c35] text-primary text-[11.5px] sm:text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap"
        >
          <Landmark size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>취득세 계산</span>
        </button>

        {!emphasizeCorporateTax && (
          <Link
            href="/technovalley#tax-simulator"
            prefetch={false}
            data-testid="top-calc-quick-corporate-tax-btn"
            onClick={handleGuideCorporateTaxLinkClick}
            className="inline-flex items-center justify-center gap-1 min-h-[34px] sm:min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-surface dark:bg-[#202027] hover:bg-[#f2f4f6] dark:hover:bg-[#2c2c35] text-secondary hover:text-primary text-[11.5px] sm:text-xs font-extrabold transition-colors whitespace-nowrap"
          >
            <Landmark size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>법인·지산 세제 시뮬레이터</span>
            <ArrowUpRight size={12} className="shrink-0" />
          </Link>
        )}
      </div>
    </section>
  );
}
