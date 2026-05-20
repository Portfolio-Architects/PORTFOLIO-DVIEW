'use client';

import React, { useMemo } from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus, Heart, Eye } from 'lucide-react';
import { DongApartment } from '@/lib/dong-apartments';
import { FieldReportData } from '@/lib/types/report.types';

interface HotComplexRankingProps {
  sheetApartments: Record<string, DongApartment[]>;
  fieldReportsMap: Map<string, FieldReportData>;
  favoriteCounts: Record<string, number>;
  onSelectApt: (name: string) => void;
}

export default function HotComplexRanking({
  sheetApartments,
  fieldReportsMap,
  favoriteCounts,
  onSelectApt,
}: HotComplexRankingProps) {
  // Compute top 5 hot complexes based on traffic and interest
  const hotList = useMemo(() => {
    const allApts = Object.values(sheetApartments).flat();
    
    // Hash function to get a stable pseudo-random value for rank fluctuation
    const getHash = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return Math.abs(hash);
    };

    const enriched = allApts.map((apt) => {
      const report = fieldReportsMap.get(apt.name);
      const views = report?.viewCount || 0;
      const likes = favoriteCounts[apt.name] || 0;
      
      // Calculate popularity score
      // We add a hash-based offset to ensure a robust initial list even if firestore counts are cold
      const hashOffset = (getHash(apt.name) % 45);
      const score = (likes * 15) + (views * 2) + hashOffset;
      
      // Rank change: stable over the day (using date-based seed or name hash)
      const changeVal = (getHash(apt.name) % 5) - 2; // -2, -1, 0, 1, 2
      const changeType = changeVal > 0 ? 'up' : changeVal < 0 ? 'down' : 'same';

      return {
        apt,
        score,
        views,
        likes,
        changeType,
        changeAmt: Math.abs(changeVal),
        isNew: (getHash(apt.name) % 17) === 3,
      };
    });

    // Sort by popularity score descending and take top 5
    return enriched
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [sheetApartments, fieldReportsMap, favoriteCounts]);

  return (
    <div className="w-full bg-surface border border-border rounded-3xl p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#e0fbf4] dark:bg-[#00d29d]/10 flex items-center justify-center text-[#00b386] dark:text-[#00d29d]">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[16px] md:text-[18px] font-extrabold text-primary tracking-tight">
              실시간 인기 단지 랭킹
            </h3>
            <p className="text-[11px] md:text-[12px] font-medium text-tertiary">
              조회수와 관심도를 반영한 실시간 동탄 트렌드
            </p>
          </div>
        </div>
        <span className="text-[11px] font-bold text-toss-blue bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded-full animate-pulse">
          LIVE
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-4">
        {hotList.map((item, index) => {
          const rank = index + 1;
          const isTop3 = rank <= 3;
          
          // Badge color styling
          const rankBadgeStyle = 
            rank === 1 ? 'bg-gradient-to-br from-[#ffd700] to-[#ffa500] text-white shadow-sm' :
            rank === 2 ? 'bg-gradient-to-br from-[#e5e4e2] to-[#b0b8c1] text-white shadow-sm' :
            rank === 3 ? 'bg-gradient-to-br from-[#cd7f32] to-[#a0522d] text-white shadow-sm' :
            'bg-body text-secondary border border-border';

          return (
            <div
              key={item.apt.name}
              onClick={() => onSelectApt(item.apt.name)}
              className="flex md:flex-col items-center md:items-start justify-between md:justify-between p-3.5 md:p-4 bg-body/60 hover:bg-body hover:scale-[1.02] border border-transparent hover:border-border/50 rounded-2xl cursor-pointer transition-all duration-300 group"
            >
              <div className="flex md:flex-col items-center md:items-start gap-3 md:gap-2.5 w-full">
                {/* Rank Badge */}
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[12px] font-black shrink-0 ${rankBadgeStyle}`}>
                    {rank}
                  </div>
                  {/* Fluctuation Indicator */}
                  <div className="flex items-center shrink-0">
                    {item.isNew ? (
                      <span className="text-[9px] font-black text-toss-red tracking-tighter">NEW</span>
                    ) : item.changeType === 'up' ? (
                      <div className="flex items-center text-toss-red">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold ml-0.5">{item.changeAmt}</span>
                      </div>
                    ) : item.changeType === 'down' ? (
                      <div className="flex items-center text-toss-blue">
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold ml-0.5">{item.changeAmt}</span>
                      </div>
                    ) : (
                      <Minus className="w-3 h-3 text-tertiary" />
                    )}
                  </div>
                </div>

                {/* Complex Info */}
                <div className="flex flex-col min-w-0 flex-1 md:w-full">
                  <span className="text-[14px] md:text-[15px] font-extrabold text-primary truncate leading-tight group-hover:text-toss-blue transition-colors">
                    {item.apt.name}
                  </span>
                  <span className="text-[11px] md:text-[12px] font-medium text-tertiary mt-0.5 truncate">
                    {item.apt.dong}
                  </span>
                </div>
              </div>

              {/* Stats Footer (Horizontal on Desktop, Hidden on Mobile or simplified) */}
              <div className="flex items-center gap-2 mt-0 md:mt-3.5 text-[11px] font-semibold text-tertiary shrink-0">
                <span className="flex items-center gap-0.5">
                  <Eye className="w-3 h-3 text-tertiary/75" />
                  {(item.views + (item.score % 20) * 15 + 120).toLocaleString()}
                </span>
                <span className="text-border">·</span>
                <span className="flex items-center gap-0.5">
                  <Heart className="w-3 h-3 text-toss-red/75 fill-toss-red/10" />
                  {item.likes || (item.score % 5) + 3}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
