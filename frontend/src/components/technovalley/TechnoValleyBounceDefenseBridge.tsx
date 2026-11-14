'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
} from 'lucide-react';
import {
  getToggleTrackClass,
  getToggleBtnClass,
} from '@/lib/design-system/controls';
import { trackEvent } from '@/lib/utils/analytics';
import {
  computeJisanQuickTaxSummary,
  type TechnoValleyPeerJisanItem,
} from '@/lib/utils/technovalleyPeerUtils';
import type { TechnoValleyJisan } from '@/lib/services/apartmentPageService';

export interface RelocationSimulatorBridgePayload {
  purchasePriceManwon: number;
  existingLocation: 'overconcentrated' | 'other';
}

declare global {
  interface Window {
    __dviewPendingRelocationSim?: RelocationSimulatorBridgePayload;
  }
}

export interface TechnoValleyBounceDefenseBridgeProps {
  currentJisan?: TechnoValleyJisan | null;
  hasCurrentRealTx?: boolean;
  initialBenchmarkManwon?: number;
  peers: readonly TechnoValleyPeerJisanItem[];
  surface:
    | 'technovalley_hub_top'
    | 'technovalley_query_ssr'
    | 'technovalley_client_query'
    | 'technovalley_detail_ssr';
}

const PRICE_PRESETS_MANWON = [
  { label: '3억', value: 30000 },
  { label: '5억', value: 50000 },
  { label: '10억', value: 100000 },
] as const;

function formatManwonCompact(manwon: number): string {
  const rounded = Math.max(0, Math.round(manwon));
  if (rounded === 0) return '0만원';
  const eok = Math.floor(rounded / 10000);
  const rem = rounded % 10000;
  if (eok === 0) return `${rem.toLocaleString('ko-KR')}만원`;
  if (rem === 0) return `${eok}억원`;
  return `${eok}억 ${rem.toLocaleString('ko-KR')}만원`;
}

export default function TechnoValleyBounceDefenseBridge({
  currentJisan = null,
  hasCurrentRealTx = false,
  initialBenchmarkManwon = 30000,
  peers,
  surface,
}: TechnoValleyBounceDefenseBridgeProps) {
  const safeInitialPrice =
    Number.isFinite(initialBenchmarkManwon) && initialBenchmarkManwon > 0
      ? Math.round(initialBenchmarkManwon)
      : 30000;

  const hasCustomRealTxPreset =
    hasCurrentRealTx &&
    safeInitialPrice > 0 &&
    !PRICE_PRESETS_MANWON.some((p) => p.value === safeInitialPrice);

  const [selectedPriceManwon, setSelectedPriceManwon] = useState<number>(safeInitialPrice);
  const [locationMode, setLocationMode] = useState<'overconcentrated' | 'other'>('overconcentrated');
  const scrollTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setSelectedPriceManwon(safeInitialPrice);
  }, [safeInitialPrice]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const taxPreview = useMemo(
    () => computeJisanQuickTaxSummary(selectedPriceManwon, locationMode, 5000),
    [selectedPriceManwon, locationMode]
  );

  const handleSelectPricePreset = (nextPrice: number) => {
    setSelectedPriceManwon(nextPrice);
    trackEvent('finance_quick_interact', {
      widget_type: 'jisan_tax_quick_bridge',
      calculator_type: 'corporate_tax_simulator',
      surface,
      trigger: 'technovalley_top_bridge',
      action: 'change_price_preset',
      purchase_price_manwon: nextPrice,
      apartment_name: currentJisan?.name || '동탄테크노밸리',
    });
  };

  const handleSelectLocation = (nextLoc: 'overconcentrated' | 'other') => {
    setLocationMode(nextLoc);
    trackEvent('finance_quick_interact', {
      widget_type: 'jisan_tax_quick_bridge',
      calculator_type: 'corporate_tax_simulator',
      surface,
      trigger: 'technovalley_top_bridge',
      action: 'change_relocation_zone',
      existing_location: nextLoc,
      apartment_name: currentJisan?.name || '동탄테크노밸리',
    });
  };

  const handleOpenTaxSimulator = () => {
    const clampedSimPrice = Math.min(
      500000,
      Math.max(5000, Math.round(selectedPriceManwon) || 30000)
    );
    const payload: RelocationSimulatorBridgePayload = {
      purchasePriceManwon: clampedSimPrice,
      existingLocation: locationMode,
    };

    trackEvent('open_calculator', {
      calculator_type: 'corporate_tax_simulator',
      surface,
      trigger: 'technovalley_top_bridge',
      apartment_name: currentJisan?.name || '동탄테크노밸리',
      apt_name: currentJisan?.name || '동탄테크노밸리',
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
          const cleanUrl = `${window.location.pathname}${window.location.search}#tax-simulator`;
          window.history.replaceState(window.history.state, '', cleanUrl);
        }
      } catch {
        // Ignore history state restrictions in sandboxed environments
      }

      const scrollToSim = () => {
        const el = document.getElementById('tax-simulator');
        if (el) {
          if (typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          window.__dviewPendingRelocationSim = undefined;
          return true;
        }
        return false;
      };

      if (!scrollToSim()) {
        if (scrollTimeoutRef.current !== null) {
          window.clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = window.setTimeout(() => {
          scrollTimeoutRef.current = null;
          scrollToSim();
        }, 280);
      }
    }
  };

  const peerHeaderCopy = currentJisan
    ? hasCurrentRealTx
      ? '인근·유사 규모 지식산업센터 실거래·스펙 1:1 비교'
      : '인근·유사 지식산업센터 실거래·스펙 즉시 비교 (매매 신고 완료 센터 우선)'
    : '동탄테크노밸리 핵심 대장 지식산업센터 실거래·스펙 바로가기';

  return (
    <div
      data-testid="technovalley-bounce-defense-bridge"
      data-surface={surface}
      className="w-full rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-3.5 sm:p-4 space-y-3.5 min-h-[156px]"
    >
      {/* 1. Nearby / Comparable Knowledge Industry Center Comparison Bridge */}
      {peers.length > 0 && (
        <div data-testid="technovalley-peer-comparison-strip" className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-extrabold text-primary">
              <Building2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{peerHeaderCopy}</span>
            </div>
            <span className="text-[11px] font-bold text-tertiary tabular-nums">
              국토부 매매 실거래 · FactoryOn 인허가 기준
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
            {peers.map((peer) => (
              <Link
                key={`tv-peer-${peer.slug}`}
                href={`/technovalley/${encodeURIComponent(peer.slug)}`}
                prefetch={false}
                data-testid="technovalley-peer-card"
                onClick={() => {
                  trackEvent('technovalley_bounce_defense_click', {
                    action: 'select_peer_jisan',
                    source_jisan: currentJisan?.name || 'technovalley_hub',
                    target_jisan: peer.jisan.name,
                    target_slug: peer.slug,
                    has_real_tx: peer.hasRealSaleTx,
                    apartment_name: peer.jisan.name,
                    selected_apt: peer.jisan.name,
                    dong: peer.dong || '테크노밸리',
                    trigger: 'technovalley_peer_card',
                    surface,
                  });
                }}
                className="group rounded-xl bg-surface dark:bg-[#202027] hover:bg-slate-50 dark:hover:bg-[#2c2c35] px-3 py-2.5 flex flex-col justify-between gap-1.5 transition-colors min-w-0"
              >
                <div className="flex items-start justify-between gap-1.5 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-tertiary">
                      <span>{peer.dong || '테크노밸리'}</span>
                      <span>·</span>
                      <span>{peer.statusLabel}</span>
                    </div>
                    <div className="text-xs sm:text-[13px] font-black text-primary group-hover:text-emerald-700 dark:group-hover:text-emerald-300 truncate mt-0.5">
                      {peer.displayLabel}
                    </div>
                  </div>
                  <ArrowUpRight
                    size={13}
                    className="text-tertiary group-hover:text-emerald-600 dark:group-hover:text-emerald-400 shrink-0 mt-0.5"
                  />
                </div>

                <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-[#f2f4f6] dark:border-[#2c2c35] text-[11px] tabular-nums">
                  <span className="text-secondary font-semibold truncate">
                    {peer.totalFloorAreaLabel} · {peer.unitCountLabel}
                  </span>
                  {peer.hasRealSaleTx && peer.latestSalePrice ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-extrabold shrink-0">
                      매매 {peer.latestSalePrice}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-secondary font-bold shrink-0">
                      스펙 비교
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 2. One-Line Corporate / Acquisition Tax Benefit Summary & #tax-simulator Jump Bridge */}
      <div
        data-testid="technovalley-tax-inline-bridge"
        className="rounded-xl bg-surface dark:bg-[#202027] px-3.5 py-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3"
      >
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-primary">
              <Landmark size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>법인·입주 세제 감면 즉시 계산</span>
            </span>

            {/* Purchase Price Presets */}
            <div
              role="group"
              aria-label="지식산업센터 취득가 기준 선택"
              className={getToggleTrackClass()}
            >
              {hasCustomRealTxPreset && (
                <button
                  type="button"
                  onClick={() => handleSelectPricePreset(safeInitialPrice)}
                  className={getToggleBtnClass({
                    active: selectedPriceManwon === safeInitialPrice,
                    size: 'sm',
                    tone: 'emerald',
                    extraClass: 'tabular-nums',
                  })}
                >
                  실거래 {formatManwonCompact(safeInitialPrice)}
                </button>
              )}
              {PRICE_PRESETS_MANWON.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handleSelectPricePreset(preset.value)}
                  className={getToggleBtnClass({
                    active: selectedPriceManwon === preset.value,
                    size: 'sm',
                    tone: 'emerald',
                    extraClass: 'tabular-nums',
                  })}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Relocation Origin Toggle */}
            <div
              role="group"
              aria-label="기존 법인 소재지 권역 선택"
              className={getToggleTrackClass()}
            >
              <button
                type="button"
                onClick={() => handleSelectLocation('overconcentrated')}
                className={getToggleBtnClass({
                  active: locationMode === 'overconcentrated',
                  size: 'sm',
                  tone: 'blue',
                })}
              >
                과밀억제권역 이전
              </button>
              <button
                type="button"
                onClick={() => handleSelectLocation('other')}
                className={getToggleBtnClass({
                  active: locationMode === 'other',
                  size: 'sm',
                  tone: 'blue',
                })}
              >
                일반 취득
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-secondary font-semibold tabular-nums">
            <span>
              취득세 35% 감면{' '}
              <strong className="font-black text-emerald-700 dark:text-emerald-300">
                약 {taxPreview.savedAcquisitionTaxManwon.toLocaleString('ko-KR')}만원 절감
              </strong>
            </span>
            <span className="text-tertiary">·</span>
            <span>
              재산세 5년 35% 감면{' '}
              <strong className="font-extrabold text-primary">
                약 {taxPreview.estimatedFiveYearPropertyTaxSavedManwon.toLocaleString('ko-KR')}만원
              </strong>
            </span>
            <span className="text-tertiary">·</span>
            <span>
              법인세{' '}
              <strong className="font-extrabold text-blue-600 dark:text-blue-400">
                {locationMode === 'overconcentrated'
                  ? '4년 100% + 2년 50% 감면'
                  : '감면 대상 외(성장관리권역)'}
              </strong>
            </span>
          </div>
        </div>

        <button
          type="button"
          data-testid="technovalley-open-tax-simulator-cta"
          onClick={handleOpenTaxSimulator}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-colors cursor-pointer shrink-0 whitespace-nowrap"
        >
          <Calculator size={14} className="shrink-0" />
          <span>세제 감면 시뮬레이터 열기</span>
          <ArrowDownRight size={14} className="shrink-0" />
        </button>
      </div>
    </div>
  );
}
