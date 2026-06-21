'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { DongApartment } from '@/lib/dong-apartments';
import { FieldReportData } from '@/lib/types/report.types';
import { AptTxSummary } from '@/lib/types/transaction';
import { findTxKey } from '@/lib/utils/apartmentMapping';
import { useSettingsValues } from '@/lib/contexts/SettingsContext';


interface HotComplexRankingProps {
  sheetApartments: Record<string, DongApartment[]>;
  fieldReportsMap: Map<string, FieldReportData>;
  favoriteCounts: Record<string, number>;
  onSelectApt: (name: string) => void;
  txSummaryData: Record<string, AptTxSummary>;
  nameMapping: Record<string, string>;
}

const HotComplexRanking = React.memo(function HotComplexRanking({
  sheetApartments,
  fieldReportsMap,
  favoriteCounts,
  onSelectApt,
  txSummaryData,
  nameMapping,
}: HotComplexRankingProps) {
  const { areaUnit } = useSettingsValues();
  const [visibleCount, setVisibleCount] = useState(5);
  const [rollingIndex, setRollingIndex] = useState(0);

  // Compute recent transaction complexes (Sorted by Date desc, then Price desc)
  const recentList = useMemo(() => {
    const allApts = Object.values(sheetApartments).flat();
    
    const enriched = allApts.map((apt) => {
      const rawKey = apt.txKey || apt.name;
      const txKey = findTxKey(rawKey, txSummaryData, nameMapping) || rawKey;
      const sum = txSummaryData[txKey];
      return {
        apt,
        sum,
      };
    });

    // 1) Find the latest transaction date in data to avoid hydration mismatch
    let maxDate = new Date(0);
    enriched.forEach((item) => {
      if (item.sum && item.sum.latestDate) {
        const clean = String(item.sum.latestDate).replace(/[^0-9]/g, '');
        if (clean.length === 8) {
          const y = parseInt(clean.substring(0, 4), 10);
          const m = parseInt(clean.substring(4, 6), 10) - 1;
          const d = parseInt(clean.substring(6, 8), 10);
          const txDate = new Date(y, m, d);
          if (txDate > maxDate) {
            maxDate = txDate;
          }
        }
      }
    });

    const baseDate = maxDate.getTime() > 0 ? maxDate : new Date();
    const oneMonthAgo = new Date(baseDate);
    oneMonthAgo.setMonth(baseDate.getMonth() - 1);

    // 2) Filter by latestDate >= oneMonthAgo
    const filtered = enriched.filter((item): item is { apt: DongApartment; sum: AptTxSummary } => {
      if (!item.sum || !item.sum.latestDate) return false;
      const clean = String(item.sum.latestDate).replace(/[^0-9]/g, '');
      if (clean.length === 8) {
        const y = parseInt(clean.substring(0, 4), 10);
        const m = parseInt(clean.substring(4, 6), 10) - 1;
        const d = parseInt(clean.substring(6, 8), 10);
        const txDate = new Date(y, m, d);
        return txDate >= oneMonthAgo;
      }
      return false;
    });

    return filtered
      .sort((a, b) => {
        const dateA = String(a.sum.latestDate).replace(/[^0-9]/g, '');
        const dateB = String(b.sum.latestDate).replace(/[^0-9]/g, '');
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA); // 최신 거래일 순
        }
        // 일자가 같으면 실거래가 높은 순
        const priceA = a.sum.latestPrice || 0;
        const priceB = b.sum.latestPrice || 0;
        return priceB - priceA;
      })
      .map(item => {
        const sum = item.sum;
        
        // 날짜 포맷팅: "20260522" or "2026-05-22" -> "5.22"
        let formattedDate = '';
        const dateStr = String(sum.latestDate).replace(/[^0-9]/g, '');
        if (dateStr.length === 8) {
          const month = parseInt(dateStr.substring(4, 6), 10);
          const day = parseInt(dateStr.substring(6, 8), 10);
          formattedDate = `${month}.${day}`;
        } else if (sum.latestDate && sum.latestDate.includes('-')) {
          const parts = sum.latestDate.split('-');
          if (parts.length === 3) {
            formattedDate = `${parseInt(parts[1], 10)}.${parseInt(parts[2], 10)}`;
          }
        }
        
        if (!formattedDate) {
          formattedDate = sum.latestDate || '';
        }
 
        const areaVal = sum.latestArea || 0;
        let areaLabel = '';
        if (areaVal > 0) {
          if (areaUnit === 'm2') {
            areaLabel = `${Math.round(areaVal * 3.3058)}㎡`;
          } else {
            areaLabel = `${Math.round(areaVal)}평`;
          }
        }
 
        return {
          apt: item.apt,
          latestDate: formattedDate,
          latestPriceEok: sum.latestPriceEok || '-',
          latestFloor: sum.latestFloor || 0,
          areaLabel,
        };
      });
  }, [sheetApartments, txSummaryData, nameMapping, areaUnit]);

  // 랭킹 배너 자동 롤링 setInterval 타이머 unmount 시점 clearTimeout/clearInterval 안전 클린업 검증 탑재
  useEffect(() => {
    if (recentList.length === 0) return;
    
    let intervalId: NodeJS.Timeout | null = null;
    
    const startTimer = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        setRollingIndex((prev) => (prev + 1) % Math.min(recentList.length, 5));
      }, 3000);
    };
    
    const stopTimer = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        stopTimer();
      } else {
        startTimer();
      }
    };
    
    if (typeof document !== 'undefined') {
      if (document.visibilityState !== 'hidden') {
        startTimer();
      }
      document.addEventListener('visibilitychange', handleVisibilityChange);
    } else {
      startTimer();
    }
    
    return () => {
      stopTimer();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [recentList.length]);

  const displayList = recentList.slice(0, visibleCount);
  const hasMore = recentList.length > visibleCount;
 
  return (
    <div className="w-full bg-surface border border-border rounded-3xl overflow-hidden transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
      
      {/* Premium Underline Title */}
      <div className="flex border-b border-border/60 bg-body/25 px-5 py-3.5 shrink-0 items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#008060] animate-pulse" />
          <span className="text-[14.5px] font-black text-primary">최근 실거래 단지</span>
        </div>
        {recentList.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 text-[12px] text-[#008060] dark:text-[#00d29d] font-bold h-5 overflow-hidden relative">
            <span className="text-[10px] bg-[#e0fbf4] dark:bg-[#00d29d]/10 px-1 py-0.5 rounded mr-1">HOT</span>
            <div 
              className="flex flex-col transition-transform duration-500 ease-in-out"
              style={{ transform: `translateY(-${rollingIndex * 20}px)` }}
            >
              {recentList.slice(0, 5).map((item, idx) => (
                <div key={idx} className="h-5 flex items-center gap-1 cursor-pointer hover:underline" onClick={() => onSelectApt(item.apt.name)}>
                  <span>{item.apt.name}</span>
                  <span className="text-secondary font-extrabold">{item.latestPriceEok}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
 
      {/* Lists Layout */}
      <div className="p-4 md:p-5 flex flex-col md:flex-row gap-3 md:gap-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-4 w-full">
          {displayList.map((item, index) => {
            const badgeStyle = "bg-[#e0fbf4] dark:bg-[#00d29d]/10 text-[#008060] dark:text-[#00d29d] font-bold border border-transparent";
            
            return (
              <div
                key={item.apt.name}
                onClick={() => onSelectApt(item.apt.name)}
                className="flex md:flex-col items-center md:items-start justify-between p-3.5 md:p-4 md:min-h-[148px] bg-body/40 hover:bg-body hover:scale-[1.02] border border-border/30 hover:border-border/80 rounded-2xl cursor-pointer transition-all duration-300 group"
              >
                {/* Left (or Top on desktop) Area */}
                <div className="flex md:flex-col items-center md:items-start gap-3 md:gap-2.5 min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className={`px-1.5 py-0.5 rounded-md text-[10px] shrink-0 ${badgeStyle}`}>
                      {item.latestDate}
                    </div>
                  </div>
 
                  <div className="flex flex-col min-w-0">
                    <span className="text-[14px] md:text-[15px] font-extrabold text-primary break-keep whitespace-normal leading-tight group-hover:text-[#008262] dark:group-hover:text-[#00d29d] transition-colors">
                      {item.apt.name}
                    </span>
                    <span className="text-[11px] md:text-[12px] font-semibold text-tertiary mt-0.5">
                      {item.apt.dong}
                    </span>
                  </div>
                </div>
 
                {/* Right (or Bottom on desktop) Area */}
                <div className="flex md:flex-row items-end md:items-center md:justify-between w-auto md:w-full mt-0 md:mt-3.5 px-0 shrink-0 gap-1.5 md:gap-0 flex-col md:flex-row text-right">
                  <span className="text-[14.5px] md:text-[15.5px] text-[#008262] dark:text-[#00d29d] font-extrabold leading-none">
                    {item.latestPriceEok}
                  </span>
                  <span className="text-tertiary font-semibold text-[10.5px] md:text-[11.5px] leading-none mt-1 md:mt-0">
                    {item.areaLabel}{item.latestFloor > 0 ? ` · ${item.latestFloor}층` : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Show More / Fold Button */}
      {(recentList.length > 5) && (
        <div className="border-t border-border/40 flex">
          {hasMore ? (
            <button
              onClick={() => setVisibleCount(prev => Math.min(prev + 15, recentList.length))}
              className="flex-1 py-4 text-center text-[13.5px] font-extrabold text-[#008060] dark:text-[#00d29d] hover:bg-emerald-500/5 active:bg-emerald-500/10 transition-all flex items-center justify-center gap-1 focus:outline-none"
            >
              실거래 이력 더보기 ({Math.min(15, recentList.length - visibleCount)}개 더보기, {visibleCount}/{recentList.length}) <ChevronDown className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setVisibleCount(5)}
              className="flex-1 py-4 text-center text-[13.5px] font-extrabold text-tertiary hover:bg-body/45 active:bg-body/90 transition-all flex items-center justify-center gap-1 focus:outline-none"
            >
              접기 <ChevronUp className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
});

HotComplexRanking.displayName = 'HotComplexRanking';
export default HotComplexRanking;
