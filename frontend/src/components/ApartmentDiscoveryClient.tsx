'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Flame, Heart, Clock, MapPin, Building2, TrendingUp, Sparkles } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import ApartmentCard from './ApartmentCard';
import { FieldReportData } from '@/lib/DashboardFacade';
import type { DongApartment } from '@/lib/dong-apartments';
import type { AptTxSummary } from '@/lib/transaction-summary';
import { isSameApartment, findTxKey, getDisplayAptName } from '@/lib/utils/apartmentMapping';
import { useSettings } from '@/lib/contexts/SettingsContext';

interface DiscoveryProps {
  sheetApartments: Record<string, DongApartment[]>;
  fieldReports: FieldReportData[];
  userFavorites: Set<string>;
  nameMapping: Record<string, string>;
  publicRentalSet: Set<string>;
  txSummaryData: Record<string, AptTxSummary>;
  favoriteCounts: Record<string, number>;
  onToggleFavorite: (name: string) => void;
  onSelectReport: (report: FieldReportData | {id: string, apartmentName: string, dong: string, author: string, likes: number, commentCount: number, createdAt: null, metrics: unknown}) => void;
  typeMap: Record<string, Record<string, { typeM2: string; typePyeong: string }>>;
}

const formatPriceEok = (priceMan: number) => {
  if (!priceMan) return '-';
  const eok = Math.floor(priceMan / 10000);
  const remainder = Math.floor(priceMan % 10000);
  if (eok === 0) return `${remainder.toLocaleString()}만`;
  if (remainder === 0) return `${eok}억`;
  return `${eok}억 ${remainder.toLocaleString()}만`;
};

export default function ApartmentDiscoveryClient({
  sheetApartments,
  fieldReports,
  userFavorites,
  nameMapping,
  publicRentalSet,
  txSummaryData,
  favoriteCounts,
  onToggleFavorite,
  onSelectReport,
  typeMap
}: DiscoveryProps) {
  const { areaUnit } = useSettings();
  // Discovery Categories (Extended for Real Estate)
  const CATEGORIES = [
    { id: 'price-rank', label: '평당가 랭킹', icon: TrendingUp, color: '#8b5cf6', desc: '최근 1개월 평균 평당가 랭킹 최상위' },
    { id: 'jeonse-gap', label: '전세가율 높은', icon: Sparkles, color: '#059669', desc: '실투자금이 적게 드는 갭투자 추천 단지' },
    { id: 'mega-scale', label: '대단지 프리미엄', icon: Building2, color: '#d97706', desc: '1,500세대 이상 초대형 매머드급 단지' },
    { id: 'new-built', label: '신축 아파트', icon: MapPin, color: '#2563eb', desc: '준공 5년 이내의 쾌적한 신축 아파트' },
    { id: 'popular', label: '인기 단지', icon: Flame, color: '#f04452', desc: '현재 D-VIEW에서 가장 많이 조회된 단지' },
    { id: 'favorites', label: '내 관심 단지', icon: Heart, color: '#ff3b30', desc: '내가 하트를 눌러 찜한 단지들' },
    { id: 'recent', label: '최신 업데이트', icon: Clock, color: '#3182f6', desc: '가장 최근에 현장 임장기가 올라온 단지' },
  ];

  // Flatten apartments
  const allApts = useMemo(() => Object.values(sheetApartments).flat(), [sheetApartments]);

  // Pre-compute O(1) Hash Map for fieldReports
  const fieldReportsMap = useMemo(() => {
    const map = new Map<string, FieldReportData>();
    if (!fieldReports || !allApts) return map;
    allApts.forEach(apt => {
      const report = fieldReports.find(r => isSameApartment(r.apartmentName, apt.name, nameMapping));
      if (report) map.set(apt.name, report);
    });
    return map;
  }, [fieldReports, allApts, nameMapping]);

  // Pre-compute Top 10 lists for ALL categories
  const categoryLists = useMemo(() => {
    const lists: Record<string, DongApartment[]> = {};

    CATEGORIES.forEach(cat => {
      let list = [...allApts];
      if (cat.id === 'price-rank') {
        list = list.sort((a, b) => {
          const rawKeyA = (a as any).txKey || a.name;
          const txKeyA = findTxKey(rawKeyA, txSummaryData, nameMapping) || rawKeyA;
          const pyeongA = txSummaryData[txKeyA]?.avg1MPerPyeong || 0;
          const rawKeyB = (b as any).txKey || b.name;
          const txKeyB = findTxKey(rawKeyB, txSummaryData, nameMapping) || rawKeyB;
          const pyeongB = txSummaryData[txKeyB]?.avg1MPerPyeong || 0;
          const diff = pyeongB - pyeongA;
          return diff !== 0 ? diff : a.name.localeCompare(b.name, 'ko');
        }).slice(0, 15);
      } else if (cat.id === 'jeonse-gap') {
        list = list.filter(a => {
          const rawKey = (a as any).txKey || a.name;
          const txKey = findTxKey(rawKey, txSummaryData, nameMapping) || rawKey;
          const summary = txSummaryData[txKey];
          return summary && (summary.avg1MRentDeposit || 0) > 0 && (summary.avg1MPrice || 0) > 0;
        }).sort((a, b) => {
          const getRate = (apt: any) => {
            const rawKey = apt.txKey || apt.name;
            const txKey = findTxKey(rawKey, txSummaryData, nameMapping) || rawKey;
            const summary = txSummaryData[txKey];
            return (summary?.avg1MRentDeposit || 0) / (summary?.avg1MPrice || 1);
          };
          return getRate(b) - getRate(a);
        }).slice(0, 15);
      } else if (cat.id === 'mega-scale') {
        list = list.filter(a => (a.householdCount || 0) >= 1500)
          .sort((a, b) => (b.householdCount || 0) - (a.householdCount || 0))
          .slice(0, 15);
      } else if (cat.id === 'new-built') {
        const currentYear = new Date().getFullYear();
        list = list.filter(a => {
          const yb = parseInt(a.yearBuilt?.substring(0, 4) || '0');
          return yb > 0 && (currentYear - yb) <= 5;
        }).sort((a, b) => {
          const yA = parseInt(a.yearBuilt?.substring(0, 4) || '0');
          const yB = parseInt(b.yearBuilt?.substring(0, 4) || '0');
          return yB - yA;
        }).slice(0, 15);
      } else if (cat.id === 'popular') {
        list = list.sort((a, b) => {
          const rA = fieldReportsMap.get(a.name);
          const rB = fieldReportsMap.get(b.name);
          const diff = (rB?.viewCount || 0) - (rA?.viewCount || 0);
          return diff !== 0 ? diff : a.name.localeCompare(b.name, 'ko');
        }).slice(0, 15);
      } else if (cat.id === 'favorites') {
        list = list.filter(a => userFavorites.has(a.name));
      } else if (cat.id === 'recent') {
        const reportedApts = list.filter(a => fieldReportsMap.has(a.name));
        list = reportedApts.sort((a, b) => {
          const rA = fieldReportsMap.get(a.name);
          const rB = fieldReportsMap.get(b.name);
          const tA = rA?.createdAt ? new Date(rA.createdAt as string | number).getTime() : 0;
          const tB = rB?.createdAt ? new Date(rB.createdAt as string | number).getTime() : 0;
          return tB - tA;
        }).slice(0, 15);
      }
      lists[cat.id] = list as DongApartment[];
    });

    return lists;
  }, [allApts, fieldReportsMap, userFavorites, txSummaryData, nameMapping]);

  const handleSelectApt = useCallback((apt: { name: string; dong: string; }) => {
    const report = fieldReportsMap.get(apt.name);
    if (report) {
      onSelectReport(report);
    } else {
      onSelectReport({
        id: `stub-${apt.name}`,
        apartmentName: apt.name,
        dong: apt.dong,
        author: '',
        likes: 0,
        commentCount: 0,
        createdAt: null,
        metrics: apt as unknown as import('@/lib/types/scoutingReport').ObjectiveMetrics,
      });
    }
  }, [fieldReportsMap, onSelectReport]);

  return (
    <div className="flex flex-col h-full bg-body overflow-y-auto custom-scrollbar">
      {/* Hero Header */}
      <div className="bg-surface px-3 sm:px-6 md:px-10 lg:px-16 py-6 md:py-10 mb-2 shrink-0">
        <h2 className="text-[26px] md:text-[32px] font-extrabold text-[#191f28] mb-2 tracking-tight">골라보기</h2>
        <p className="text-[15px] md:text-[17px] text-[#4e5968] font-medium">당신의 투자 전략에 딱 맞는 단지를 둘러보세요.</p>
      </div>

      {CATEGORIES.map((cat, index) => {
        const apts = categoryLists[cat.id];
        if (!apts || apts.length === 0) return null;

        return (
          <CategoryRow 
            key={cat.id}
            cat={cat}
            index={index}
            apts={apts}
            txSummaryData={txSummaryData}
            nameMapping={nameMapping}
            fieldReportsMap={fieldReportsMap}
            publicRentalSet={publicRentalSet}
            userFavorites={userFavorites}
            favoriteCounts={favoriteCounts}
            typeMap={typeMap}
            handleSelectApt={handleSelectApt}
            onToggleFavorite={onToggleFavorite}
          />
        );
      })}
      
      {/* Bottom Padding */}
      <div className="h-[80px] shrink-0 bg-transparent" />
    </div>
  );
}

const CategoryRow = React.memo(({ cat, index, apts, txSummaryData, nameMapping, fieldReportsMap, publicRentalSet, userFavorites, favoriteCounts, typeMap, handleSelectApt, onToggleFavorite }: any) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '200px 0px',
  });

  const isOdd = index % 2 === 1;
  const bgColor = isOdd ? 'bg-body' : 'bg-surface';

  return (
    <div ref={ref} className={`${bgColor} py-6 mb-2 min-h-[220px]`}>
      <div className="px-3 sm:px-6 md:px-10 lg:px-16 mb-5 flex flex-col">
         <div className="flex items-center gap-2 mb-1.5">
           <div className="p-1.5 rounded-lg shadow-sm bg-surface" style={{ color: cat.color }}>
             <cat.icon size={22} />
           </div>
           <h3 className="text-[20px] md:text-[22px] font-extrabold text-[#191f28] tracking-tight">{cat.label}</h3>
         </div>
         <p className="text-[14px] text-[#8b95a1] ml-[38px] font-medium">{cat.desc}</p>
      </div>
      
      {inView && (
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar px-3 sm:px-6 md:px-10 lg:px-16 pb-4">
          {apts.map((apt: any, rankIndex: number) => {
             const rawKey = apt.txKey || apt.name;
             const txKey = findTxKey(rawKey, txSummaryData, nameMapping) || rawKey;
             const matchedSummary = txKey ? txSummaryData[txKey] : undefined;
             const matchedReport = fieldReportsMap.get(apt.name);
             return (
               <div key={apt.name} className="w-[300px] shrink-0 snap-start bg-surface rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-border overflow-hidden transform transition-transform hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(0,0,0,0.1)]">
                 <ApartmentCard
                   apt={apt}
                   txSummary={matchedSummary}
                   report={matchedReport}
                   isPublicRental={publicRentalSet.has(apt.name)}
                   onClick={handleSelectApt}
                   rank={cat.id === 'price-rank' || cat.id === 'popular' || cat.id === 'jeonse-gap' ? rankIndex + 1 : undefined}
                   isFavorited={userFavorites.has(apt.name)}
                   favoriteCount={favoriteCounts[apt.name] || 0}
                   onToggleFavorite={onToggleFavorite}
                   typeMap={typeMap}
                   listSort={cat.id}
                 />
               </div>
             );
          })}
          <div className="w-[16px] shrink-0" />
        </div>
      )}
    </div>
  );
});
