'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Coins, HelpCircle, Check, Copy, Share2 } from 'lucide-react';

export default function RelocationTaxSimulator() {
  // 1. Inputs
  const [existingLocation, setExistingLocation] = useState<'overconcentrated' | 'other'>('overconcentrated');

  // Timer refs to prevent memory leaks in async handlers on unmount
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);
  const [annualCorpTax, setAnnualCorpTax] = useState<number>(8000); // 단위: 만원 (기본 8,000만원)
  const [purchasePrice, setPurchasePrice] = useState<number>(60000); // 단위: 만원 (기본 6억원)
  const [annualPropTax, setAnnualPropTax] = useState<number>(200); // 단위: 만원 (기본 200만원)

  const [isCopied, setIsCopied] = useState(false);

  // 2. Calculation Logic
  // 법인세 감면: 수도권 과밀억제권역에서 이전 시 4년간 100%, 이후 2년간 50% 감면 (합산 5년치 수준의 절세액)
  const corpTaxSavings = useMemo(() => {
    if (existingLocation !== 'overconcentrated') return 0;
    return annualCorpTax * 5; // (annualCorpTax * 4 * 100%) + (annualCorpTax * 2 * 50%) = annualCorpTax * 5
  }, [existingLocation, annualCorpTax]);

  // 취득세 감면: 지식산업센터 최초 분양 취득 시 취득세(기본 4.6%)의 35% 감면 (지방세특례제한법 제58조의2)
  const acquisitionTaxSavings = useMemo(() => {
    const standardAcqTaxRate = 0.046; // 4.6%
    const standardAcqTax = purchasePrice * standardAcqTaxRate;
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

  const handleCopy = () => {
    const text = `[D-VIEW 동탄 지산 세제 혜택 시뮬레이션 결과]\n` +
      `- 이전 조건: ${existingLocation === 'overconcentrated' ? '수도권 과밀억제권역 ➡️ 동탄 테크노밸리' : '기타 지역 ➡️ 동탄 테크노밸리'}\n` +
      `- 연간 법인세: ${formatKoreanPrice(annualCorpTax)}\n` +
      `- 지산 매입가: ${formatKoreanPrice(purchasePrice)}\n` +
      `----------------------------------------\n` +
      `💡 총 절세 혜택 규모: ${formatKoreanPrice(totalSavings)}\n` +
      `  - 법인세/소득세 감면 (6개년): ${formatKoreanPrice(corpTaxSavings)}\n` +
      `  - 취득세 감면 (최초 1회): ${formatKoreanPrice(acquisitionTaxSavings)}\n` +
      `  - 재산세 감면 (5개년 누적): ${formatKoreanPrice(propTaxSavings)}\n` +
      `* 본 결과는 지방세특례제한법 및 조세특례제한법 기준 시뮬레이션 추정치입니다.`;

    try {
      navigator.clipboard.writeText(text);
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

  return (
    <div className="bg-surface border border-border/80 p-6 sm:p-8 rounded-[32px] shadow-sm flex flex-col gap-6 animate-in fade-in duration-300 hover:shadow-md transition-all">
      
      {/* Unified Main Header */}
      <div className="flex flex-col gap-1 border-b border-border/40 pb-5">
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <span className="w-2.5 h-2.5 rounded-full bg-hs-orange animate-pulse shrink-0" />
          <h3 className="text-[14.5px] sm:text-[16px] font-black text-primary tracking-tight break-keep" title="테크노밸리 이전 세금 감면 시뮬레이터">
            테크노밸리 이전 세금 감면 시뮬레이터
          </h3>
          <span className="text-[9.5px] font-extrabold text-[#00a37b] dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full select-none shrink-0">
            실시간 연산
          </span>
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
            <span className="w-5 h-5 rounded-full bg-hs-orange/10 text-hs-orange flex items-center justify-center text-[10px] font-black">1</span>
            <span>이전 조건 및 자산 정보 입력</span>
          </div>
 
          {/* Input 1: Location Toggle */}
          <div className="p-4 bg-body/40 border border-border/40 rounded-2xl flex flex-col gap-3 shadow-sm min-w-0">
            <div className="text-[11.5px] font-black text-secondary flex items-center gap-1">
              <span>기존 법인(사업자) 소재지</span>
              <div className="group relative cursor-pointer">
                <HelpCircle size={13} className="text-tertiary" />
                <div className="absolute left-0 bottom-full mb-1.5 w-[280px] p-2.5 bg-neutral-900 text-white text-[10px] rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-20 leading-normal font-bold">
                  서울 및 수도권 주요 도시(과밀억제권역)에서 이전하는 법인은 법인세/소득세 감면 대상이 됩니다.
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-1 bg-body/80 p-1 border border-border/40 rounded-xl shadow-inner">
              <button
                type="button"
                onClick={() => setExistingLocation('overconcentrated')}
                className={`py-2 px-2.5 text-[10.5px] sm:text-[11.5px] font-black rounded-lg transition-all cursor-pointer break-keep text-center ${
                  existingLocation === 'overconcentrated'
                    ? 'bg-surface text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                    : 'text-tertiary hover:text-secondary'
                }`}
              >
                수도권 과밀억제권역 (서울/인천 등)
              </button>
              <button
                type="button"
                onClick={() => setExistingLocation('other')}
                className={`py-2 px-2.5 text-[10.5px] sm:text-[11.5px] font-black rounded-lg transition-all cursor-pointer break-keep text-center ${
                  existingLocation === 'other'
                    ? 'bg-surface text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                    : 'text-tertiary hover:text-secondary'
                }`}
              >
                기타 지역 (성장관리권역/수도권 외)
              </button>
            </div>
          </div>
 
          {/* Input 2: Corp Tax Slider */}
          <div className={`p-4 bg-body/40 border rounded-2xl flex flex-col gap-3 transition-all shadow-sm ${
            existingLocation !== 'overconcentrated' ? 'border-border/20 opacity-60' : 'border-border/40'
          }`}>
            <div className="flex justify-between items-center text-[11.5px] font-black">
              <span className="text-secondary">연평균 법인세 (또는 사업소득세)</span>
              <span className="text-hs-orange text-[13px] font-black">{formatKoreanPrice(annualCorpTax)}</span>
            </div>
            <input
              type="range"
              min="500"
              max="50000"
              step="500"
              value={annualCorpTax}
              onChange={(e) => setAnnualCorpTax(Number(e.target.value))}
              disabled={existingLocation !== 'overconcentrated'}
              className="w-full h-1.5 bg-neutral-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-hs-orange disabled:opacity-40"
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
          <div className="p-4 bg-body/40 border border-border/40 rounded-2xl flex flex-col gap-3 shadow-sm">
            <div className="flex justify-between items-center text-[11.5px] font-black">
              <span className="text-secondary">동탄 지식산업센터 매입(취득) 가격</span>
              <span className="text-hs-orange text-[13px] font-black">{formatKoreanPrice(purchasePrice)}</span>
            </div>
            <input
              type="range"
              min="10000"
              max="500000"
              step="5000"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(Number(e.target.value))}
              className="w-full h-1.5 bg-neutral-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-hs-orange"
            />
            <span className="text-[9.5px] text-tertiary font-bold flex items-start gap-1">
              <span>※</span>
              <span>매매(취득)가 기준으로 35% 취득세 지방세 감면이 계산됩니다. (기본 취득세율 4.6% 기준)</span>
            </span>
          </div>
 
          {/* Input 4: Property Tax Slider */}
          <div className="p-4 bg-body/40 border border-border/40 rounded-2xl flex flex-col gap-3 shadow-sm">
            <div className="flex justify-between items-center text-[11.5px] font-black">
              <span className="text-secondary">연간 예상 재산세 납부액</span>
              <span className="text-hs-orange text-[13px] font-black">{formatKoreanPrice(annualPropTax)}</span>
            </div>
            <input
              type="range"
              min="20"
              max="3000"
              step="20"
              value={annualPropTax}
              onChange={(e) => setAnnualPropTax(Number(e.target.value))}
              className="w-full h-1.5 bg-neutral-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-hs-orange"
            />
            <span className="text-[9.5px] text-tertiary font-bold flex items-start gap-1">
              <span>※</span>
              <span>지식산업센터 최초 취득 직접 사용 시, 5년간 재산세의 35%가 감면됩니다.</span>
            </span>
          </div>
        </div>
 
        {/* ═══ RIGHT COLUMN: Results Infographic (Step 2) ═══ */}
        <div className="lg:pl-10 flex flex-col justify-between min-h-[500px]">
          <div>
            {/* Step 2 Title */}
            <div className="text-[13px] font-black text-primary flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-[#00a37b] flex items-center justify-center text-[10px] font-black">2</span>
              <span>예상 절세 혜택 분석 결과</span>
            </div>
 
            {/* Big Score Board */}
            <div className="bg-body/80 p-6 sm:p-7 rounded-3xl border border-border/80 flex flex-col items-center justify-center text-center my-2 select-none">
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
              <div className="flex items-center justify-between p-4 bg-body/40 border border-border/60 rounded-2xl hover:border-border/80 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-hs-orange" />
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
              <div className="flex items-center justify-between p-4 bg-body/40 border border-border/60 rounded-2xl hover:border-border/80 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00a37b]" />
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
              <div className="flex items-center justify-between p-4 bg-body/40 border border-border/60 rounded-2xl hover:border-border/80 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
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

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-border/40">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl border border-border/80 bg-body hover:bg-neutral-100 dark:hover:bg-zinc-800 text-[12px] font-extrabold text-secondary cursor-pointer transition-all active:scale-[0.98]"
          >
            {isCopied ? (
              <>
                <Check size={15} className="text-emerald-500" />
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
