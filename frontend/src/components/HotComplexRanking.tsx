'use client';

import React, { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { DongApartment } from '@/lib/dong-apartments';
import { FieldReportData } from '@/lib/types/report.types';
import { AptTxSummary } from '@/lib/types/transaction';
import { findTxKey } from '@/lib/utils/apartmentMapping';
import { useSettings } from '@/lib/contexts/SettingsContext';


interface HotComplexRankingProps {
  sheetApartments: Record<string, DongApartment[]>;
  fieldReportsMap: Map<string, FieldReportData>;
  favoriteCounts: Record<string, number>;
  onSelectApt: (name: string) => void;
  txSummaryData: Record<string, AptTxSummary>;
  nameMapping: Record<string, string>;
}

export default function HotComplexRanking({
  sheetApartments,
  fieldReportsMap,
  favoriteCounts,
  onSelectApt,
  txSummaryData,
  nameMapping,
}: HotComplexRankingProps) {
  const { areaUnit } = useSettings();

  // Compute top 5 recent transaction complexes (Sorted by Date desc, then Price desc)
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

    const filtered = enriched.filter((item): item is { apt: DongApartment; sum: AptTxSummary } => !!(item.sum && item.sum.latestDate));

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
      .slice(0, 5)
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
 
  return (
    <div className="w-full bg-surface border border-border rounded-3xl overflow-hidden transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
      
      {/* Premium Underline Title */}
      <div className="flex border-b border-border/60 bg-body/25 px-5 py-3.5 shrink-0 items-center gap-2">
        <Clock className="w-4 h-4 text-[#00b386] animate-pulse" />
        <span className="text-[14.5px] font-black text-primary">최근 실거래 단지</span>
      </div>
 
      {/* Lists Layout */}
      <div className="p-4 md:p-5 flex flex-col md:flex-row gap-3 md:gap-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-4 w-full">
          {recentList.map((item, index) => {
            const badgeStyle = "bg-[#e0fbf4] dark:bg-[#00d29d]/10 text-[#00b386] dark:text-[#00d29d] font-bold border border-transparent";
            
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
                    {index === 0 && (
                      <span className="text-[9px] font-bold text-toss-red bg-red-50 dark:bg-red-950/20 px-1 py-0.5 rounded animate-pulse">
                        NEW
                      </span>
                    )}
                  </div>
 
                  <div className="flex flex-col min-w-0">
                    <span className="text-[14px] md:text-[15px] font-extrabold text-primary truncate leading-tight group-hover:text-toss-blue transition-colors">
                      {item.apt.name}
                    </span>
                    <span className="text-[11px] md:text-[12px] font-semibold text-tertiary mt-0.5">
                      {item.apt.dong}
                    </span>
                  </div>
                </div>
 
                {/* Right (or Bottom on desktop) Area */}
                <div className="flex md:flex-row items-end md:items-center md:justify-between w-auto md:w-full mt-0 md:mt-3.5 px-0 shrink-0 gap-1.5 md:gap-0 flex-col md:flex-row text-right">
                  <span className="text-[14.5px] md:text-[15.5px] text-toss-blue font-extrabold leading-none">
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
    </div>
  );
}
