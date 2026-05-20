'use client';

import React, { useState, useMemo } from 'react';
import { Sparkles, Coins, HelpCircle, ArrowRight } from 'lucide-react';
import { DongApartment } from '@/lib/dong-apartments';
import { AptTxSummary } from '@/lib/types/transaction';
import { findTxKey } from '@/lib/utils/apartmentMapping';

interface GapInvestmentExplorerProps {
  sheetApartments: Record<string, DongApartment[]>;
  txSummaryData: Record<string, AptTxSummary>;
  nameMapping: Record<string, string>;
  publicRentalSet: Set<string>;
  onSelectApt: (name: string) => void;
}

export default function GapInvestmentExplorer({
  sheetApartments,
  txSummaryData,
  nameMapping,
  publicRentalSet,
  onSelectApt,
}: GapInvestmentExplorerProps) {
  const [maxGap, setMaxGap] = useState<number>(20000); // Default max gap: 2억원 (in 만원)
  const [showAll, setShowAll] = useState<boolean>(false);

  // Available gap filter steps (in 만원)
  const GAP_STEPS = [
    { label: '5천만', value: 5000 },
    { label: '1억', value: 10000 },
    { label: '1.5억', value: 15000 },
    { label: '2억', value: 20000 },
    { label: '2.5억', value: 25000 },
    { label: '3억', value: 30000 },
    { label: '4억', value: 40000 },
    { label: '5억', value: 50000 },
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

    // Filter complexes that have valid transactions, positive gap, and gap <= selected maxGap
    // Sort by jeonse rate descending (highest rate first = best gap candidates)
    return enriched
      .filter(item => item.sales > 0 && item.jeonse > 0 && item.gap > 0 && item.gap <= maxGap)
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
            <h3 className="text-[16px] md:text-[18px] font-extrabold text-primary tracking-tight">
              소액 갭투자 탐색기
            </h3>
            <p className="text-[11px] md:text-[12px] font-medium text-tertiary">
              실거래가 기준 투자금별 동탄 아파트 매칭
            </p>
          </div>
        </div>
        
        {/* Step Selector */}
        <div className="flex bg-body/80 p-1 rounded-xl items-center gap-0.5 self-start sm:self-center overflow-x-auto no-scrollbar max-w-full">
          {GAP_STEPS.map(step => (
            <button
              key={step.value}
              onClick={() => {
                setMaxGap(step.value);
                setShowAll(false);
              }}
              className={`px-2.5 py-1 text-[11px] md:text-[12px] font-extrabold rounded-lg whitespace-nowrap transition-all ${
                maxGap === step.value
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
      <div className="flex items-start gap-2 bg-body p-3.5 rounded-2xl mb-6 text-[12px] text-secondary font-medium">
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
            {visibleList.map(item => {
              const jeonseRatePercent = Math.round(item.ratio * 100);
              return (
                <div
                  key={item.apt.name}
                  onClick={() => onSelectApt(item.apt.name)}
                  className="flex flex-col bg-body/30 hover:bg-body border border-border/40 hover:border-border rounded-2xl p-4 cursor-pointer transition-all duration-300 group"
                >
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[14px] md:text-[15px] font-extrabold text-primary truncate group-hover:text-toss-blue transition-colors">
                        {item.apt.name}
                      </span>
                      <span className="text-[11px] md:text-[12px] font-semibold text-tertiary mt-0.5">
                        {item.apt.dong} · {item.apt.householdCount || '-'}세대
                      </span>
                    </div>
                    {jeonseRatePercent >= 70 && (
                      <span className="px-2 py-0.5 bg-[#e0fbf4] text-[#00b386] text-[10px] font-black rounded-md shrink-0">
                        전세율 우수
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center bg-surface/50 border border-border/20 rounded-xl p-3 mb-3">
                    <div className="flex flex-col items-center flex-1">
                      <span className="text-[10px] font-bold text-tertiary mb-0.5">매매 평균</span>
                      <span className="text-[12px] md:text-[13px] font-bold text-primary">{formatPrice(item.sales)}</span>
                    </div>
                    <div className="w-[1px] h-6 bg-border/40" />
                    <div className="flex flex-col items-center flex-1">
                      <span className="text-[10px] font-bold text-tertiary mb-0.5">전세 평균</span>
                      <span className="text-[12px] md:text-[13px] font-bold text-primary">{formatPrice(item.jeonse)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-auto">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-tertiary">필요 투자금 (갭)</span>
                      <span className="text-[15px] md:text-[16px] font-black text-toss-blue tracking-tight">
                        {formatPrice(item.gap)}
                      </span>
                    </div>
                    
                    {/* Jeonse Rate horizontal visual bar */}
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-tertiary">전세율 {jeonseRatePercent}%</span>
                      <div className="w-16 h-1.5 bg-border/50 rounded-full mt-1.5 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-400 to-toss-blue rounded-full" 
                          style={{ width: `${Math.min(jeonseRatePercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show more Button */}
          {gapList.length > 6 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full py-3.5 border border-border border-dashed hover:border-secondary/40 hover:bg-body/30 rounded-2xl text-[13px] font-extrabold text-secondary hover:text-primary flex items-center justify-center gap-1.5 transition-all mt-2"
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
