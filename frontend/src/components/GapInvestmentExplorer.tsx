'use client';

import React, { useState, useMemo } from 'react';
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
  const [selectedIndex, setSelectedIndex] = useState<number>(1); // Default to '1.5억~2억'
  const [showAll, setShowAll] = useState<boolean>(false);

  // Available gap filter steps (in 만원)
  const GAP_STEPS = [
    { label: '1.5억 미만', min: 0, max: 15000 },
    { label: '1.5억~2억', min: 15000, max: 20000 },
    { label: '2억~2.5억', min: 20000, max: 25000 },
    { label: '2.5억~3억', min: 25000, max: 30000 },
    { label: '3억~4억', min: 30000, max: 40000 },
    { label: '4억~6억', min: 40000, max: 60000 },
  ];

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
    const selectedStep = GAP_STEPS[selectedIndex];
    
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

    // Filter complexes that have valid transactions, positive gap, and fall within the selected gap range
    // Sort by jeonse rate descending (highest rate first = best gap candidates)
    return enriched
      .filter(item => item.sales > 0 && item.jeonse > 0 && item.gap > selectedStep.min && item.gap <= selectedStep.max)
      .sort((a, b) => b.ratio - a.ratio);
  }, [sheetApartments, txSummaryData, nameMapping, publicRentalSet, selectedIndex]);

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
        
        {/* Step Selector */}
        <div className="flex bg-body p-1 rounded-xl items-center gap-0.5 self-start sm:self-center overflow-x-auto no-scrollbar max-w-full shadow-inner border border-border/10">
          {GAP_STEPS.map((step, idx) => (
            <button
              key={step.label}
              onClick={() => {
                setSelectedIndex(idx);
                setShowAll(false);
              }}
              className={`px-3.5 py-1.5 text-[12px] sm:text-[13px] font-extrabold rounded-lg whitespace-nowrap transition-all ${
                selectedIndex === idx
                  ? 'bg-surface text-toss-blue shadow-sm'
                  : 'text-tertiary hover:text-secondary'
              }`}
            >
              {step.label}
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
            <NativeAdPlaceholder location="갭투자 탐색기 하단" onClick={onOpenAdModal} />
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
