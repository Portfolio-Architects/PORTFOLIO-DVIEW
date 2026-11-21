'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { HelpCircle, Check, Copy, ArrowUpRight, Landmark } from 'lucide-react';
import type { RelocationSimulatorBridgePayload } from '@/components/technovalley/TechnoValleyBounceDefenseBridge';
import { trackEvent } from '@/lib/utils/analytics';
import {
  CPA_CAMPAIGN_CATALOG,
  buildCpaAttributedTargetUrl,
  sendTelemetry,
} from '@/lib/ads/cascadeFallback';
import { getToggleTrackClass, getToggleBtnClass } from '@/lib/design-system/controls';

const CORP_TAX_PRESETS_MANWON: ReadonlyArray<{ label: string; value: number }> = [
  { label: '세액 3,000만', value: 3000 },
  { label: '세액 8,000만', value: 8000 },
  { label: '세액 1.5억', value: 15000 },
  { label: '세액 3억', value: 30000 },
];

const PURCHASE_PRICE_PRESETS_MANWON: ReadonlyArray<{ label: string; value: number }> = [
  { label: '매입 3억', value: 30000 },
  { label: '매입 5억', value: 50000 },
  { label: '매입 10억', value: 100000 },
  { label: '매입 20억', value: 200000 },
];

export interface RelocationTaxSimulatorProps {
  initialPurchasePriceManwon?: number;
  initialLocation?: 'overconcentrated' | 'other';
  centerName?: string | null;
}

export default function RelocationTaxSimulator({
  initialPurchasePriceManwon,
  initialLocation = 'overconcentrated',
  centerName,
}: RelocationTaxSimulatorProps = {}) {
  const attributedCenterName = useMemo(
    () => centerName?.trim() || '동탄테크노밸리',
    [centerName]
  );
  const attributedCenterNameRef = useRef<string>(attributedCenterName);
  attributedCenterNameRef.current = attributedCenterName;

  // 1. Inputs
  const [existingLocation, setExistingLocation] = useState<'overconcentrated' | 'other'>(initialLocation);

  // Timer refs to prevent memory leaks in async handlers on unmount
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sliderPendingTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const sliderPendingValuesRef = useRef<Record<string, number>>({});
  const hasUserEditedPriceRef = useRef<boolean>(false);

  useEffect(() => {
    const pendingTimers = sliderPendingTimersRef.current;
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      Object.values(pendingTimers).forEach((timer) => clearTimeout(timer));
    };
  }, []);
  const simulatorRootRef = useRef<HTMLDivElement | null>(null);
  const [annualCorpTax, setAnnualCorpTax] = useState<number>(8000); // 단위: 만원 (기본 8,000만원)
  const [purchasePrice, setPurchasePrice] = useState<number>(() => {
    if (
      typeof initialPurchasePriceManwon === 'number' &&
      Number.isFinite(initialPurchasePriceManwon) &&
      initialPurchasePriceManwon > 0
    ) {
      return Math.min(500000, Math.max(5000, Math.round(initialPurchasePriceManwon)));
    }
    return 60000;
  }); // 단위: 만원 (기본 6억원)
  const [annualPropTax, setAnnualPropTax] = useState<number>(() => {
    if (
      typeof initialPurchasePriceManwon === 'number' &&
      Number.isFinite(initialPurchasePriceManwon) &&
      initialPurchasePriceManwon > 0
    ) {
      const clamped = Math.min(500000, Math.max(5000, Math.round(initialPurchasePriceManwon)));
      return Math.min(3000, Math.max(20, Math.round(clamped * 0.0025)));
    }
    return 200;
  }); // 단위: 만원 (기본 200만원)

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const applyPayload = (payload?: RelocationSimulatorBridgePayload | null) => {
      if (!payload) return;
      if (
        typeof payload.purchasePriceManwon === 'number' &&
        Number.isFinite(payload.purchasePriceManwon) &&
        payload.purchasePriceManwon > 0
      ) {
        hasUserEditedPriceRef.current = true;
        const clamped = Math.min(500000, Math.max(5000, Math.round(payload.purchasePriceManwon)));
        setPurchasePrice(clamped);
        setAnnualPropTax(Math.min(3000, Math.max(20, Math.round(clamped * 0.0025))));
      }
      if (payload.existingLocation === 'overconcentrated' || payload.existingLocation === 'other') {
        setExistingLocation(payload.existingLocation);
      }
    };

    const hadPendingPayload = Boolean(window.__dviewPendingRelocationSim);
    if (window.__dviewPendingRelocationSim) {
      applyPayload(window.__dviewPendingRelocationSim);
      window.__dviewPendingRelocationSim = undefined;
    }

    if (hadPendingPayload || window.location.hash === '#tax-simulator') {
      const target = document.getElementById('tax-simulator') ?? simulatorRootRef.current;
      if (target && typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    const handleBridgeEvent = (e: Event) => {
      const custom = e as CustomEvent<RelocationSimulatorBridgePayload>;
      applyPayload(custom.detail);
      window.__dviewPendingRelocationSim = undefined;
    };

    window.addEventListener('dview:set_relocation_sim_price', handleBridgeEvent);
    return () => {
      window.removeEventListener('dview:set_relocation_sim_price', handleBridgeEvent);
    };
  }, []);

  useEffect(() => {
    if (hasUserEditedPriceRef.current) return;
    if (
      typeof initialPurchasePriceManwon === 'number' &&
      Number.isFinite(initialPurchasePriceManwon) &&
      initialPurchasePriceManwon > 0
    ) {
      const clamped = Math.min(500000, Math.max(5000, Math.round(initialPurchasePriceManwon)));
      setPurchasePrice(clamped);
      setAnnualPropTax(Math.min(3000, Math.max(20, Math.round(clamped * 0.0025))));
    }
  }, [initialPurchasePriceManwon]);

  const [isCopied, setIsCopied] = useState(false);
  const lastSliderTrackAtRef = useRef<Record<string, number>>({});

  const emitQuickInteract = (action: string, extra?: Record<string, unknown>) => {
    const targetName = attributedCenterNameRef.current;
    trackEvent('finance_quick_interact', {
      widget_type: 'relocation_tax_simulator',
      calculator_type: 'corporate_tax_simulator',
      surface: 'relocation_tax_simulator',
      trigger: 'simulator_input',
      action,
      apartment_name: targetName,
      apt_name: targetName,
      ...extra,
    });
  };

  const flushSliderInteract = (
    field: 'annual_corp_tax' | 'purchase_price' | 'annual_prop_tax'
  ) => {
    const pendingTimer = sliderPendingTimersRef.current[field];
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      delete sliderPendingTimersRef.current[field];
    }
    const pendingValue = sliderPendingValuesRef.current[field];
    if (pendingValue === undefined) return;
    delete sliderPendingValuesRef.current[field];
    lastSliderTrackAtRef.current[field] = Date.now();
    emitQuickInteract(`change_${field}`, { [field]: pendingValue });
  };

  const emitSliderInteract = (field: 'annual_corp_tax' | 'purchase_price' | 'annual_prop_tax', value: number) => {
    const now = Date.now();
    const prev = lastSliderTrackAtRef.current[field] ?? 0;
    if (now - prev >= 800) {
      if (sliderPendingTimersRef.current[field]) {
        clearTimeout(sliderPendingTimersRef.current[field]);
        delete sliderPendingTimersRef.current[field];
      }
      delete sliderPendingValuesRef.current[field];
      lastSliderTrackAtRef.current[field] = now;
      emitQuickInteract(`change_${field}`, { [field]: value });
      return;
    }
    sliderPendingValuesRef.current[field] = value;
    if (sliderPendingTimersRef.current[field]) {
      clearTimeout(sliderPendingTimersRef.current[field]);
    }
    sliderPendingTimersRef.current[field] = setTimeout(() => {
      flushSliderInteract(field);
    }, 350);
  };

  // 2. Calculation Logic
  // 법인세 감면: 수도권 과밀억제권역에서 이전 시 4년간 100%, 이후 2년간 50% 감면 (합산 5년치 수준의 절세액)
  const corpTaxSavings = useMemo(() => {
    if (existingLocation !== 'overconcentrated') return 0;
    return annualCorpTax * 5; // (annualCorpTax * 4 * 100%) + (annualCorpTax * 2 * 50%) = annualCorpTax * 5
  }, [existingLocation, annualCorpTax]);

  // 취득세 감면: 지식산업센터 최초 분양 취득 시 취득세(기본 4.6%)의 35% 감면 (지방세특례제한법 제58조의2)
  const acquisitionTaxSavings = useMemo(() => {
    const standardAcqTaxRate = 0.046; // 4.6%
    const standardAcqTax = Math.round(purchasePrice * standardAcqTaxRate);
    return Math.round(standardAcqTax * 0.35); // 35% 감면액
  }, [purchasePrice]);

  // 재산세 감면: 지식산업센터 취득 후 직접 사용 시 재산세의 35%를 5년간 감면
  const propTaxSavings = useMemo(() => {
    return Math.round(annualPropTax * 0.35 * 5); // 35% * 5개년
  }, [annualPropTax]);

  // 총 합산 절세 혜택
  const totalSavings = useMemo(() => {
    return corpTaxSavings + acquisitionTaxSavings + propTaxSavings;
  }, [corpTaxSavings, acquisitionTaxSavings, propTaxSavings]);

  // 가격 포맷팅 (원 단위 한글)
  const formatKoreanPrice = (valueManWon: number) => {
    const rounded = Math.round(valueManWon);
    if (rounded === 0) return '0원';
    const eok = Math.floor(rounded / 10000);
    const remainder = rounded % 10000;
    
    if (eok === 0) return `${remainder.toLocaleString()}만 원`;
    if (remainder === 0) return `${eok}억 원`;
    return `${eok}억 ${remainder.toLocaleString()}만 원`;
  };

  const b2bGuideCpaUrl = useMemo(
    () =>
      buildCpaAttributedTargetUrl(CPA_CAMPAIGN_CATALOG['corporate-relocation'], {
        slotId: 'technovalley_simulator_cta',
        apartmentName: attributedCenterName,
        includeContextParams: true,
      }),
    [attributedCenterName]
  );

  const handleLocationSelect = (nextLoc: 'overconcentrated' | 'other') => {
    setExistingLocation(nextLoc);
    emitQuickInteract('change_relocation_zone', { existing_location: nextLoc });
  };

  const handleSelectCorpTaxPreset = (valueManwon: number) => {
    setAnnualCorpTax(valueManwon);
    emitQuickInteract('select_corp_tax_preset', { annual_corp_tax: valueManwon });
  };

  const handleSelectPricePreset = (valueManwon: number) => {
    hasUserEditedPriceRef.current = true;
    setPurchasePrice(valueManwon);
    setAnnualPropTax(Math.min(3000, Math.max(20, Math.round(valueManwon * 0.0025))));
    emitQuickInteract('select_purchase_price_preset', { purchase_price_manwon: valueManwon });
  };

  const handleCopy = () => {
    const text = `[D-VIEW 동탄 지산 세제 혜택 시뮬레이션 결과]\n` +
      `- 이전 조건: ${existingLocation === 'overconcentrated' ? '수도권 과밀억제권역 -> 동탄 테크노밸리' : '기타 지역 -> 동탄 테크노밸리'}\n` +
      `- 연간 법인세: ${formatKoreanPrice(annualCorpTax)}\n` +
      `- 지산 매입가: ${formatKoreanPrice(purchasePrice)}\n` +
      `----------------------------------------\n` +
      `총 절세 혜택 규모: ${formatKoreanPrice(totalSavings)}\n` +
      `  - 법인세/소득세 감면 (6개년): ${formatKoreanPrice(corpTaxSavings)}\n` +
      `  - 취득세 감면 (최초 1회): ${formatKoreanPrice(acquisitionTaxSavings)}\n` +
      `  - 재산세 감면 (5개년 누적): ${formatKoreanPrice(propTaxSavings)}\n` +
      `* 본 결과는 지방세특례제한법 및 조세특례제한법 기준 시뮬레이션 추정치입니다.`;

    emitQuickInteract('copy_tax_report', { total_savings_manwon: totalSavings });

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
      }
      setIsCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => {
        setIsCopied(false);
        copyTimeoutRef.current = null;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleSimulatorB2bCpaClick = () => {
    trackEvent('open_calculator', {
      calculator_type: 'corporate_tax_simulator',
      surface: 'relocation_tax_simulator_cta',
      trigger: 'simulator_b2b_cpa_cta',
      apartment_name: attributedCenterName,
      apt_name: attributedCenterName,
      total_savings_manwon: totalSavings,
    });
    sendTelemetry({
      eventType: 'FALLBACK_CLICK',
      slotId: 'technovalley_simulator_cta',
      placementSlotId: 'technovalley_simulator_cta',
      campaignId: 'corporate-relocation',
      apartmentName: attributedCenterName,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <div
      ref={simulatorRootRef}
      className="bg-surface border border-border/80 p-6 sm:p-8 rounded-[32px] shadow-sm flex flex-col gap-6 animate-in fade-in duration-300 hover:shadow-md transition-all scroll-mt-20 sm:scroll-mt-24"
    >
      
      {/* Unified Main Header */}
      <div className="flex flex-col gap-1 border-b border-border/40 pb-5">
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <h3 className="text-[14.5px] sm:text-[16px] font-black text-primary tracking-tight break-keep" title="테크노밸리 이전 세금 감면 시뮬레이터">
            테크노밸리 이전 세금 감면 시뮬레이터
          </h3>
        </div>
        <p className="text-[11.5px] text-tertiary font-bold mt-0.5 leading-normal">
          현재 법인 소재지와 예상 자산 규모에 기반해 법적 세제 감면 총액을 실시간으로 분석합니다.
        </p>
      </div>

      {/* Grid containing Inputs & Outputs with Divider */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 lg:divide-x lg:divide-border/40">
        
        {/* ═══ LEFT COLUMN: Input Form (Step 1) ═══ */}
        <div className="flex flex-col gap-5 min-w-0">
          {/* Step 1 Title */}
          <div className="text-[13px] font-black text-primary flex items-center gap-2 mb-1">
            <span className="w-5 h-5 rounded-full bg-[#eff1f5] dark:bg-[#1e2532] text-primary flex items-center justify-center text-[10px] font-black">1</span>
            <span>이전 조건 및 자산 정보 입력</span>
          </div>
 
          {/* Input 1: Location Toggle */}
          <div className="p-4 bg-elevated rounded-2xl flex flex-col gap-3 min-w-0">
            <div className="text-[11.5px] font-black text-secondary flex items-center gap-1">
              <span>기존 법인(사업자) 소재지</span>
              <div className="group relative cursor-pointer">
                <HelpCircle size={13} className="text-tertiary" />
                <div className="absolute left-0 bottom-full mb-1.5 w-[280px] p-2.5 bg-slate-900 text-white text-[10px] rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-20 leading-normal font-bold">
                  서울 및 수도권 주요 도시(과밀억제권역)에서 이전하는 법인은 법인세/소득세 감면 대상이 됩니다.
                </div>
              </div>
            </div>
            <div className={getToggleTrackClass('grid grid-cols-1 sm:grid-cols-2 w-full')}>
              <button
                type="button"
                onClick={() => handleLocationSelect('overconcentrated')}
                className={getToggleBtnClass({
                  active: existingLocation === 'overconcentrated',
                  tone: 'neutral',
                  size: 'md',
                  extraClass: 'w-full !whitespace-normal break-keep text-center text-[10.5px] sm:text-[11.5px]',
                })}
              >
                수도권 과밀억제권역 (서울/인천 등)
              </button>
              <button
                type="button"
                onClick={() => handleLocationSelect('other')}
                className={getToggleBtnClass({
                  active: existingLocation === 'other',
                  tone: 'neutral',
                  size: 'md',
                  extraClass: 'w-full !whitespace-normal break-keep text-center text-[10.5px] sm:text-[11.5px]',
                })}
              >
                기타 지역 (성장관리권역/수도권 외)
              </button>
            </div>
          </div>
 
          {/* Input 2: Corp Tax Slider */}
          <div className={`p-4 bg-elevated rounded-2xl flex flex-col gap-3 transition-opacity ${
            existingLocation !== 'overconcentrated' ? 'opacity-60' : ''
          }`}>
            <div className="flex justify-between items-center text-[11.5px] font-black">
              <span className="text-secondary">연평균 법인세 (또는 사업소득세)</span>
              <span className="text-primary text-[13px] font-black tabular-nums">{formatKoreanPrice(annualCorpTax)}</span>
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="연평균 법인세 빠른 선택">
              {CORP_TAX_PRESETS_MANWON.map((preset) => {
                const active = annualCorpTax === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    disabled={existingLocation !== 'overconcentrated'}
                    onClick={() => handleSelectCorpTaxPreset(preset.value)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-colors cursor-pointer tabular-nums disabled:opacity-40 disabled:cursor-not-allowed ${
                      active
                        ? 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900'
                        : 'bg-surface hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] text-secondary hover:text-primary border border-border/60'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <input
              type="range"
              aria-label="연평균 법인세 또는 사업소득세 슬라이더"
              min="500"
              max="50000"
              step="500"
              value={annualCorpTax}
              onChange={(e) => {
                const val = Number(e.target.value);
                setAnnualCorpTax(val);
                emitSliderInteract('annual_corp_tax', val);
              }}
              onPointerUp={() => flushSliderInteract('annual_corp_tax')}
              onKeyUp={() => flushSliderInteract('annual_corp_tax')}
              onBlur={() => flushSliderInteract('annual_corp_tax')}
              disabled={existingLocation !== 'overconcentrated'}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-900 dark:accent-slate-100 disabled:opacity-40"
            />
            {existingLocation !== 'overconcentrated' ? (
              <span className="text-[9.5px] text-tertiary font-bold flex items-start gap-1">
                <span>※</span>
                <span>과밀억제권역 외 이전 시 법인세 감면 혜택은 대상 외이므로 계산에서 제외됩니다.</span>
              </span>
            ) : (
              <span className="text-[9.5px] text-tertiary font-bold flex items-start gap-1 opacity-0 pointer-events-none">
                <span>&nbsp;</span>
              </span>
            )}
          </div>
 
          {/* Input 3: Jisan Purchase Price */}
          <div className="p-4 bg-elevated rounded-2xl flex flex-col gap-3">
            <div className="flex justify-between items-center text-[11.5px] font-black">
              <span className="text-secondary">동탄 지식산업센터 매입(취득) 가격</span>
              <span className="text-primary text-[13px] font-black tabular-nums">{formatKoreanPrice(purchasePrice)}</span>
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="매입가 빠른 선택">
              {PURCHASE_PRICE_PRESETS_MANWON.map((preset) => {
                const active = purchasePrice === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handleSelectPricePreset(preset.value)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-colors cursor-pointer tabular-nums ${
                      active
                        ? 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900'
                        : 'bg-surface hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] text-secondary hover:text-primary border border-border/60'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <input
              type="range"
              aria-label="동탄 지식산업센터 매입 가격 슬라이더"
              min="5000"
              max="500000"
              step={purchasePrice % 5000 === 0 ? 5000 : 100}
              value={purchasePrice}
              onChange={(e) => {
                hasUserEditedPriceRef.current = true;
                const val = Number(e.target.value);
                setPurchasePrice(val);
                emitSliderInteract('purchase_price', val);
              }}
              onPointerUp={() => flushSliderInteract('purchase_price')}
              onKeyUp={() => flushSliderInteract('purchase_price')}
              onBlur={() => flushSliderInteract('purchase_price')}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-900 dark:accent-slate-100"
            />
            <span className="text-[9.5px] text-tertiary font-bold flex items-start gap-1">
              <span>※</span>
              <span>매매(취득)가 기준으로 35% 취득세 지방세 감면이 계산됩니다. (기본 취득세율 4.6% 기준)</span>
            </span>
          </div>
 
          {/* Input 4: Property Tax Slider */}
          <div className="p-4 bg-elevated rounded-2xl flex flex-col gap-3">
            <div className="flex justify-between items-center text-[11.5px] font-black">
              <span className="text-secondary">연간 예상 재산세 납부액</span>
              <span className="text-primary text-[13px] font-black tabular-nums">{formatKoreanPrice(annualPropTax)}</span>
            </div>
            <input
              type="range"
              aria-label="연간 예상 재산세 납부액 슬라이더"
              min="20"
              max="3000"
              step={annualPropTax % 20 === 0 ? 20 : 1}
              value={annualPropTax}
              onChange={(e) => {
                const val = Number(e.target.value);
                setAnnualPropTax(val);
                emitSliderInteract('annual_prop_tax', val);
              }}
              onPointerUp={() => flushSliderInteract('annual_prop_tax')}
              onKeyUp={() => flushSliderInteract('annual_prop_tax')}
              onBlur={() => flushSliderInteract('annual_prop_tax')}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-900 dark:accent-slate-100"
            />
            <span className="text-[9.5px] text-tertiary font-bold flex items-start gap-1">
              <span>※</span>
              <span>지식산업센터 최초 취득 직접 사용 시, 5년간 재산세의 35%가 감면됩니다.</span>
            </span>
          </div>
        </div>
 
        {/* ═══ RIGHT COLUMN: Results Infographic (Step 2) ═══ */}
        <div className="lg:pl-10 flex flex-col justify-between min-h-[500px] tabular-nums">
          <div>
            {/* Step 2 Title */}
            <div className="text-[13px] font-black text-primary flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-full bg-[#eff1f5] dark:bg-[#1e2532] text-primary flex items-center justify-center text-[10px] font-black">2</span>
              <span>예상 절세 혜택 분석 결과</span>
            </div>
 
            {/* Big Score Board */}
            <div className="bg-elevated p-6 sm:p-7 rounded-3xl flex flex-col items-center justify-center text-center my-2 select-none">
              <span className="text-[10.5px] text-tertiary font-extrabold uppercase tracking-wider mb-2">
                6개년 총 절세 추정치
              </span>
              <span className="text-[28px] sm:text-[34px] font-black text-primary tracking-tight leading-none my-1">
                {formatKoreanPrice(totalSavings)}
              </span>
              <span className="text-[11.5px] text-tertiary font-bold mt-2.5 leading-relaxed">
                지방세특례제한법 및 조례 감면 비율이 실시간 합산 적용되었습니다.
              </span>
            </div>
 
            {/* Breakdown Items */}
            <div className="flex flex-col gap-3 my-4">
              
              {/* Corp Tax Savings */}
              <div className="flex items-center justify-between p-4 bg-elevated rounded-2xl transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-blue" />
                  <div className="flex flex-col">
                    <span className="text-[13px] font-black text-primary">법인세 / 소득세 감면 (6개년)</span>
                    <span className="text-[10.5px] text-tertiary font-bold mt-0.5">이전 후 최초 4년 100%, 이후 2년 50%</span>
                  </div>
                </div>
                <span className="text-[14.5px] font-black text-primary shrink-0 pl-2">
                  {formatKoreanPrice(corpTaxSavings)}
                </span>
              </div>
 
              {/* Acquisition Tax Savings */}
              <div className="flex items-center justify-between p-4 bg-elevated rounded-2xl transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <div className="flex flex-col">
                    <span className="text-[13px] font-black text-primary">취득세 감면 (최초 1회)</span>
                    <span className="text-[10.5px] text-tertiary font-bold mt-0.5">분양 취득 사업용 직접 사용 시 35% 감면</span>
                  </div>
                </div>
                <span className="text-[14.5px] font-black text-primary shrink-0 pl-2">
                  {formatKoreanPrice(acquisitionTaxSavings)}
                </span>
              </div>
 
              {/* Property Tax Savings */}
              <div className="flex items-center justify-between p-4 bg-elevated rounded-2xl transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                  <div className="flex flex-col">
                    <span className="text-[13px] font-black text-primary">재산세 감면 (5개년 누적)</span>
                    <span className="text-[10.5px] text-tertiary font-bold mt-0.5">최초 취득 사용 시 5년간 35% 감면</span>
                  </div>
                </div>
                <span className="text-[14.5px] font-black text-primary shrink-0 pl-2">
                  {formatKoreanPrice(propTaxSavings)}
                </span>
              </div>
            </div>
          </div>

        {/* Action Buttons & B2B CPA Guide Funnel (Ad Money v6.0 Live Spark) */}
        <div className="flex flex-col gap-2.5 mt-4 pt-4 border-t border-border/40">
          <a
            href={b2bGuideCpaUrl}
            data-testid="relocation-sim-b2b-cpa-cta"
            onClick={handleSimulatorB2bCpaClick}
            className="w-full flex items-center justify-between gap-3 py-3 px-4 rounded-2xl bg-elevated hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] transition-colors text-left"
          >
            <div className="min-w-0 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-[#eff1f5] dark:bg-[#1e2532] text-primary flex items-center justify-center shrink-0">
                <Landmark size={15} />
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] font-extrabold text-primary truncate">
                  예상 절세 {formatKoreanPrice(totalSavings)} 적용 요건·정책자금 한도 확인
                </p>
                <p className="text-[11px] font-medium text-tertiary truncate">
                  과밀억제권역 이전 법인세 100%·분양가 80% 시설자금 실전 가이드
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-[11.5px] font-extrabold shrink-0">
              <span>가이드 보기</span>
              <ArrowUpRight size={13} className="shrink-0" />
            </span>
          </a>

          <button
            type="button"
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-2xl bg-elevated hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] text-[12px] font-extrabold text-secondary hover:text-primary cursor-pointer transition-all active:scale-[0.98]"
          >
            {isCopied ? (
              <>
                <Check size={15} className="text-primary" />
                <span>복사 완료!</span>
              </>
            ) : (
              <>
                <Copy size={15} />
                <span>결과 텍스트 복사</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
