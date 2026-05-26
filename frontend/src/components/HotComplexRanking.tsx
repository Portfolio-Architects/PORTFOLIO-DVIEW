'use client';

import React, { useMemo, useState } from 'react';
import { Trophy, Clock, Heart } from 'lucide-react';
import { DongApartment } from '@/lib/dong-apartments';
import { FieldReportData } from '@/lib/types/report.types';
import { AptTxSummary } from '@/lib/types/transaction';
import { findTxKey } from '@/lib/utils/apartmentMapping';

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
  const [activeTab, setActiveTab] = useState<'popular' | 'recent'>('popular');

  // Compute top 5 hot complexes based on traffic and interest
  const hotList = useMemo(() => {
    const allApts = Object.values(sheetApartments).flat();

    const enriched = allApts.map((apt) => {
      const report = fieldReportsMap.get(apt.name);
      const views = report?.viewCount || 0;
      const likes = favoriteCounts[apt.name] || 0;
      
      // Calculate popularity score based purely on actual data
      const score = (likes * 15) + (views * 2);

      return {
        apt,
        score,
        likes,
      };
    });

    return enriched
      .sort((a, b) => {
        if (b.score === a.score) return a.apt.name.localeCompare(b.apt.name);
        return b.score - a.score;
      })
      .slice(0, 5);
  }, [sheetApartments, fieldReportsMap, favoriteCounts]);

  // Compute top 5 recent transaction complexes
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

    const filtered = enriched.filter(item => item.sum && item.sum.latestDate);

    return filtered
      .sort((a, b) => {
        const dateA = String(a.sum!.latestDate).replace(/[^0-9]/g, '');
        const dateB = String(b.sum!.latestDate).replace(/[^0-9]/g, '');
        return dateB.localeCompare(dateA); // 최신 거래일 순
      })
      .slice(0, 5)
      .map(item => {
        const sum = item.sum!;
        
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

        const areaM2 = sum.latestArea ? Math.floor(sum.latestArea) : 0;

        return {
          apt: item.apt,
          latestDate: formattedDate,
          latestPriceEok: sum.latestPriceEok || '-',
          latestFloor: sum.latestFloor || 0,
          areaM2,
        };
      });
  }, [sheetApartments, txSummaryData, nameMapping]);

  return (
    <div className="w-full bg-surface border border-border rounded-3xl overflow-hidden transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
      
      {/* Premium Segmented Underline Tabs */}
      <div className="flex border-b border-border/60 bg-body/25 px-2 pt-2 shrink-0">
        <button
          onClick={() => setActiveTab('popular')}
          className={`flex-1 pb-3 pt-2.5 text-[14px] font-extrabold transition-all relative flex items-center justify-center gap-1.5 focus:outline-none cursor-pointer ${
            activeTab === 'popular' ? 'text-toss-blue font-black' : 'text-tertiary hover:text-secondary'
          }`}
        >
          <Trophy className={`w-4 h-4 transition-transform ${activeTab === 'popular' ? 'scale-110' : 'opacity-70'}`} />
          실시간 인기 단지
          {activeTab === 'popular' && (
            <div className="absolute bottom-0 left-6 right-6 h-[2.5px] bg-toss-blue rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('recent')}
          className={`flex-1 pb-3 pt-2.5 text-[14px] font-extrabold transition-all relative flex items-center justify-center gap-1.5 focus:outline-none cursor-pointer ${
            activeTab === 'recent' ? 'text-toss-blue font-black' : 'text-tertiary hover:text-secondary'
          }`}
        >
          <Clock className={`w-4 h-4 transition-transform ${activeTab === 'recent' ? 'scale-110' : 'opacity-70'}`} />
          최근 실거래 단지
          {activeTab === 'recent' && (
            <div className="absolute bottom-0 left-6 right-6 h-[2.5px] bg-toss-blue rounded-t-full" />
          )}
        </button>
      </div>

      {/* Lists Layout */}
      <div className="p-4 md:p-5 flex flex-col md:flex-row gap-3 md:gap-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-4 w-full">
          {activeTab === 'popular' ? (
            hotList.map((item, index) => {
              const rank = index + 1;
              
              const rankBadgeStyle = 
                rank === 1 ? 'bg-gradient-to-br from-[#ffd700] to-[#ffa500] text-white shadow-sm' :
                rank === 2 ? 'bg-gradient-to-br from-[#e5e4e2] to-[#b0b8c1] text-white shadow-sm' :
                rank === 3 ? 'bg-gradient-to-br from-[#cd7f32] to-[#a0522d] text-white shadow-sm' :
                'bg-body text-secondary border border-border/50';

              return (
                <div
                  key={item.apt.name}
                  onClick={() => onSelectApt(item.apt.name)}
                  className="flex md:flex-col items-center md:items-start justify-between md:justify-between p-3.5 md:p-4 bg-body/40 hover:bg-body hover:scale-[1.02] border border-border/30 hover:border-border/80 rounded-2xl cursor-pointer transition-all duration-300 group"
                >
                  {/* Left (or Top on desktop) Area */}
                  <div className="flex md:flex-col items-center md:items-start gap-3 md:gap-2.5 min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[12px] font-black shrink-0 ${rankBadgeStyle}`}>
                        {rank}
                      </div>
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
                  <div className="flex items-center gap-1 mt-0 md:mt-3.5 text-[11px] font-bold text-tertiary shrink-0">
                    <Heart className="w-3.5 h-3.5 text-toss-red/80 fill-toss-red/10 group-hover:fill-toss-red/25 transition-all" />
                    <span>{item.likes}</span>
                  </div>
                </div>
              );
            })
          ) : (
            recentList.map((item, index) => {
              const badgeStyle = "bg-[#e0fbf4] dark:bg-[#00d29d]/10 text-[#00b386] dark:text-[#00d29d] font-bold border border-transparent";
              
              return (
                <div
                  key={item.apt.name}
                  onClick={() => onSelectApt(item.apt.name)}
                  className="flex md:flex-col items-center md:items-start justify-between md:justify-between p-3.5 md:p-4 bg-body/40 hover:bg-body hover:scale-[1.02] border border-border/30 hover:border-border/80 rounded-2xl cursor-pointer transition-all duration-300 group"
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
                      {item.areaM2 > 0 ? `${item.areaM2}㎡` : ''}{item.latestFloor > 0 ? ` · ${item.latestFloor}층` : ''}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
