'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Sparkles, Coins, HelpCircle, ArrowRight } from 'lucide-react';
import { DongApartment } from '@/lib/dong-apartments';
import { AptTxSummary } from '@/lib/types/transaction';
import { findTxKey } from '@/lib/utils/apartmentMapping';
import { NativeAdPlaceholder } from '@/components/ui/NativeAdPlaceholder';

interface GapInvestmentExplorerProps {
  sheetApartments: Record<string, DongApartment[]>;
  txSummaryData: Record<string, AptTxSummary>;
  nameMapping: Record<string, string>;
  publicRentalSet: Set<string>;
  onSelectApt: (name: string) => void;
  onOpenAdModal?: () => void;
}

export default function GapInvestmentExplorer({
  sheetApartments,
  txSummaryData,
  nameMapping,
  publicRentalSet,
  onSelectApt,
  onOpenAdModal,
}: GapInvestmentExplorerProps) {
  const [maxGap, setMaxGap] = useState<number>(20000); // Default to 2억 (20,000만원)
  const [showAll, setShowAll] = useState<boolean>(false);

  // Parse initial maxGap on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const gapParam = params.get('maxGap');
      if (gapParam) {
        const parsed = parseInt(gapParam, 10);
        if (!isNaN(parsed) && parsed >= 3000 && parsed <= 60000) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setMaxGap(parsed);
        }
      }
    }
  }, []);

  // Sync maxGap state to URL query parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const currentVal = params.get('maxGap');
      if (currentVal !== String(maxGap)) {
        params.set('maxGap', String(maxGap));
        const newUrl = window.location.pathname + '?' + params.toString() + window.location.hash;
        window.history.replaceState(null, '', newUrl);
      }
    }
  }, [maxGap]);

  const PRESETS = [
    { label: '1.5억', value: 15000 },
    { label: '2억', value: 20000 },
    { label: '2.5억', value: 25000 },
    { label: '3억', value: 30000 },
    { label: '4억', value: 40000 },
    { label: '전체', value: 60000 },
  ];

  const formatGapLabel = (valMan: number) => {
    if (valMan >= 60000) return '전체';
    const eok = Math.floor(valMan / 10000);
    const man = valMan % 10000;
    if (eok > 0) {
      return `${eok}억${man > 0 ? ` ${man.toLocaleString()}` : ''}원 이하`;
    }
    return `${valMan.toLocaleString()}만원 이하`;
  };

  // format price helper
  const formatPrice = (priceMan: number) => {
    const eok = Math.floor(priceMan / 10000);
    const man = priceMan % 10000;
    if (eok > 0) {
      return `${eok}억${man > 0 ? ` ${man.toLocaleString()}` : ''}`;
    }
    return `${priceMan.toLocaleString()}만`;
  };

  // Find all complexes and compute their gap info
  const gapList = useMemo(() => {
    const allApts = Object.values(sheetApartments).flat().filter(a => !publicRentalSet.has(a.name));
    
    const enriched = allApts.map(apt => {
      const rawKey = apt.txKey || apt.name;
      const txKey = findTxKey(rawKey, txSummaryData, nameMapping) || rawKey;
      const sum = txSummaryData[txKey];

      const sales = sum ? (sum.avg3MPrice || sum.avg1MPrice || sum.latestPrice || 0) : 0;
      const jeonse = sum ? (sum.avg3MRentDeposit || sum.avg1MRentDeposit || sum.latestRentDeposit || 0) : 0;
      
      const gap = sales > 0 && jeonse > 0 ? sales - jeonse : 0;
      const ratio = sales > 0 && jeonse > 0 ? (jeonse / sales) : 0;

      return {
        apt,
        sales,
        jeonse,
        gap,
        ratio,
      };
    });

    // Filter complexes that have valid transactions, positive gap, and fall below or equal to maxGap
    // Sort by jeonse rate descending (highest rate first = best gap candidates)
    return enriched
      .filter(item => item.sales > 0 && item.jeonse > 0 && item.gap > 0 && (maxGap >= 60000 || item.gap <= maxGap))
      .sort((a, b) => b.ratio - a.ratio);
  }, [sheetApartments, txSummaryData, nameMapping, publicRentalSet, maxGap]);

  const visibleList = showAll ? gapList : gapList.slice(0, 6);

  return (
    <div className="w-full bg-surface border border-border rounded-3xl p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-toss-blue">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[18px] md:text-[20px] font-extrabold text-primary tracking-tight">
              갭투자 큐레이션
            </h3>
            <p className="text-[12px] md:text-[13px] font-medium text-tertiary">
              실거래가 기준 투자금별 동탄 아파트 큐레이션
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic Budget Controller Panel */}
      <div className="flex flex-col gap-5 bg-body/40 dark:bg-[#121824]/20 p-5 rounded-2xl border border-border/30 mb-6 shadow-sm">
        {/* Slider & Numeric input */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Slider input */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex justify-between items-baseline">
              <span className="text-[13px] md:text-[14px] font-extrabold text-secondary">최대 투자금 (갭)</span>
              <span className="text-[18px] md:text-[20px] font-black text-toss-blue tracking-tight">
                {formatGapLabel(maxGap)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="3000"
                max="60000"
                step="500"
                value={maxGap}
                onChange={(e) => {
                  setMaxGap(Number(e.target.value));
                  setShowAll(false);
                }}
                className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-[#3182f6] transition-all bg-slate-100 dark:bg-slate-800"
                style={{
                  background: `linear-gradient(to right, #3182f6 0%, #3182f6 ${((maxGap - 3000) / (60000 - 3000)) * 100}%, rgba(156, 163, 175, 0.2) ${((maxGap - 3000) / (60000 - 3000)) * 100}%, rgba(156, 163, 175, 0.2) 100%)`
                }}
              />
            </div>
          </div>

          {/* Direct Input & Match Count */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 bg-surface border border-border/60 rounded-xl px-3.5 py-2.5 focus-within:ring-1 focus-within:ring-[#3182f6] shadow-sm">
              <input
                type="number"
                min="0"
                max="60000"
                step="500"
                value={maxGap >= 60000 ? '' : maxGap}
                placeholder={maxGap >= 60000 ? '전체' : '예산 입력'}
                onChange={(e) => {
                  const val = e.target.value === '' ? 60000 : Number(e.target.value);
                  setMaxGap(Math.min(60000, val));
                  setShowAll(false);
                }}
                className="w-20 bg-transparent text-right font-black text-primary text-[14px] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-[12px] font-bold text-tertiary">만원</span>
            </div>

            <div className="bg-[#e8f3ff] dark:bg-[#3182f6]/10 text-toss-blue px-3 py-2.5 rounded-xl text-[12px] md:text-[13px] font-extrabold border border-[#3182f6]/10 shrink-0">
              총 {gapList.length}개 매칭
            </div>
          </div>
        </div>

        {/* Preset Quick Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3.5 border-t border-border/20">
          <span className="text-[11.5px] font-bold text-tertiary mr-1.5">빠른 선택</span>
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                setMaxGap(preset.value);
                setShowAll(false);
              }}
              className={`px-3.5 py-1.5 text-[12px] font-extrabold rounded-lg transition-all border ${
                maxGap === preset.value
                  ? 'bg-[#3182f6] text-white border-[#3182f6] shadow-sm'
                  : 'bg-surface text-secondary hover:text-primary border-border/60'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Info Warning */}
      <div className="flex items-start gap-2.5 bg-body/60 dark:bg-slate-900/40 p-4 rounded-2xl mb-6 text-[12px] sm:text-[13px] text-secondary border border-border/30">
        <HelpCircle className="w-4 h-4 text-tertiary shrink-0 mt-0.5" />
        <p className="leading-relaxed break-keep">
          최근 3개월 실거래가(매매 및 전세) 평균을 기초로 계산한 투자금액(갭) 정보입니다. 직거래나 비정상 거래는 제외될 수 있으며 실제 매물 가격과는 차이가 있을 수 있습니다.
        </p>
      </div>

      {/* Complex List Grid */}
      {gapList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Sparkles className="w-8 h-8 text-border mb-3" />
          <p className="text-[14px] font-bold text-secondary">선택한 투자금 한도 내 단지가 없습니다.</p>
          <p className="text-[12px] text-tertiary mt-1">투자 예산을 조금 더 올려보세요.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleList.map((item, idx) => {
              const jeonseRatePercent = Math.round(item.ratio * 100);
              return (
                <div
                  key={item.apt.name}
                  onClick={() => onSelectApt(item.apt.name)}
                  className="flex flex-col bg-[#fcfdfe]/50 dark:bg-[#151b26]/30 hover:bg-[#ffffff] dark:hover:bg-[#1c2431] border border-border/40 hover:border-[#3182f6]/40 hover:-translate-y-1 hover:shadow-md rounded-2xl p-5 cursor-pointer transition-all duration-300 group"
                >
                  <div className="flex justify-between items-start gap-2 mb-4">
                    <div className="flex flex-col min-w-0 pr-1">
                      <span className="text-[16px] md:text-[18px] font-extrabold text-primary truncate group-hover:text-toss-blue transition-colors">
                        {item.apt.name}
                      </span>
                      <span className="text-[12px] md:text-[13px] font-semibold text-tertiary mt-0.5">
                        {item.apt.dong} · {item.apt.householdCount || '-'}세대
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 items-end shrink-0">
                      {jeonseRatePercent >= 70 && (
                        <span className="px-2 py-0.5 bg-[#e0fbf4] dark:bg-[#00b386]/10 text-[#00b386] text-[10px] sm:text-[11px] font-extrabold rounded-md shrink-0 border border-[#00b386]/20">
                          저평가 단지
                        </span>
                      )}
                      {idx === 0 && (
                        <span className="px-2 py-0.5 bg-[#e8f3ff] dark:bg-[#3182f6]/10 text-[#3182f6] text-[10px] sm:text-[11px] font-extrabold rounded-md shrink-0 border border-[#3182f6]/20">
                          최선호 단지
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Highlight box for Required Budget & Jeonse Rate */}
                  <div className="flex justify-between items-center bg-[#f2f8ff] dark:bg-[#1a2b4c]/30 rounded-xl p-3.5 border border-[#3182f6]/10 mb-4">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-[#3182f6]/80 dark:text-[#3182f6]">필요 투자금 (갭)</span>
                      <span className="text-[18px] md:text-[20px] font-black text-[#3182f6] tracking-tight">
                        {formatPrice(item.gap)}
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] md:text-[12px] font-bold text-[#3182f6]/80 dark:text-[#3182f6]">전세율 {jeonseRatePercent}%</span>
                      <div className="w-16 h-1.5 bg-border/50 dark:bg-[#3182f6]/10 rounded-full mt-1.5 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-400 to-[#3182f6] rounded-full" 
                          style={{ width: `${Math.min(jeonseRatePercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Horizontal compare list for sales & rent averages */}
                  <div className="flex justify-between items-center text-[12.5px] sm:text-[13px] text-secondary font-medium mt-auto border-t border-border/20 pt-3 px-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400/60" />
                      매매 평균 <strong className="text-primary font-bold">{formatPrice(item.sales)}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
                      전세 평균 <strong className="text-primary font-bold">{formatPrice(item.jeonse)}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="my-2">
            <NativeAdPlaceholder 
              location="갭투자 탐색기 하단" 
              onClick={onOpenAdModal} 
              adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_GAP_EXPLORER || "test-gap-explorer-slot"}
            />
          </div>

          {/* Show more Button */}
          {gapList.length > 6 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full py-3.5 border border-border border-dashed hover:border-secondary/40 hover:bg-body/30 rounded-2xl text-[14px] font-extrabold text-secondary hover:text-primary flex items-center justify-center gap-1.5 transition-all mt-2"
            >
              <span>{showAll ? '접기' : `단지 더 보기 (+${gapList.length - 6}개)`}</span>
              <ArrowRight className={`w-3.5 h-3.5 transition-transform duration-300 ${showAll ? '-rotate-90' : ''}`} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
