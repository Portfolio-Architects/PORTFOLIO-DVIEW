'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Flame, Heart, Clock, MapPin, Building2, TrendingUp, Sparkles } from 'lucide-react';
import PageHeroHeader from './PageHeroHeader';
import { useInView } from 'react-intersection-observer';
import ApartmentCard from './ApartmentCard';
import { FieldReportData } from '@/lib/DashboardFacade';
import type { DongApartment } from '@/lib/dong-apartments';
import type { AptTxSummary } from '@/lib/types/transaction';
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
  // Discovery Categories
  const CATEGORIES = [
    { id: 'over-15-eok', label: '15억 이상 아파트', icon: Sparkles, color: '#eab308', desc: '동탄을 대표하는 하이엔드 랜드마크 아파트 컬렉션' },
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
      if (cat.id === 'over-15-eok') {
        list = list.filter(a => {
          const rawKey = (a as any).txKey || a.name;
          const txKey = findTxKey(rawKey, txSummaryData, nameMapping) || rawKey;
          const summary = txSummaryData[txKey];
          return summary && (summary.avg1MPrice || 0) >= 150000;
        }).sort((a, b) => {
          const rawKeyA = (a as any).txKey || a.name;
          const txKeyA = findTxKey(rawKeyA, txSummaryData, nameMapping) || rawKeyA;
          const priceA = txSummaryData[txKeyA]?.avg1MPrice || 0;
          const rawKeyB = (b as any).txKey || b.name;
          const txKeyB = findTxKey(rawKeyB, txSummaryData, nameMapping) || rawKeyB;
          const priceB = txSummaryData[txKeyB]?.avg1MPrice || 0;
          return priceB - priceA;
        });
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
    <div className="flex flex-col bg-transparent">
      {/* Hero Header */}
      <PageHeroHeader 
        title="D-VIEW 골라보기"
        subtitleStrong="프리미엄 랜드마크 단지 큐레이션"
        subtitleLight="당신의 투자 전략에 딱 맞는 랜드마크 단지를 둘러보세요"
      />

      {CATEGORIES.map((cat, index) => {
        const apts = categoryLists[cat.id];
        if (!apts || apts.length === 0) return null;

        return (
          <NetflixCategoryRow 
            key={cat.id}
            cat={cat}
            index={index}
            apts={apts}
            txSummaryData={txSummaryData}
            nameMapping={nameMapping}
            fieldReportsMap={fieldReportsMap}
            handleSelectApt={handleSelectApt}
          />
        );
      })}
    </div>
  );
}

const NetflixCard = ({ apt, txSummary, report, rank, onClick }: any) => {
  const imageUrl = 
    report?.thumbnail ||
    report?.imageUrl ||
    report?.images?.[0] || 
    report?.sections?.infra?.gateImg || 
    report?.sections?.infra?.gateImgs?.[0] || 
    report?.sections?.infra?.landscapeImg || 
    report?.sections?.infra?.landscapeImgs?.[0] ||
    report?.sections?.ecosystem?.communityImg ||
    report?.sections?.ecosystem?.communityImgs?.[0];
  
  const priceMan = txSummary?.avg1MPrice || 0;
  const eok = Math.floor(priceMan / 10000);
  const remainder = Math.floor(priceMan % 10000);
  const priceText = priceMan > 0 ? `${eok}억${remainder > 0 ? ` ${remainder.toLocaleString()}` : ''}` : '가격 정보 없음';

  const isHero = rank === 1;
  const hasImage = !!imageUrl;

  const titleColor = hasImage ? 'text-white' : 'text-[#191f28]';
  const priceColor = hasImage ? 'text-[#60a5fa]' : 'text-[#3182f6]'; // Lighter blue for dark overlay
  const dongColor = hasImage ? 'text-[#e5e8eb]' : 'text-[#8b95a1]';
  const descColor = hasImage ? 'text-[#d1d6db]' : 'text-[#4e5968]';

  return (
    <div 
      className={`relative shrink-0 rounded-[8px] md:rounded-[12px] overflow-hidden cursor-pointer group shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#e5e8eb] bg-white transition-transform duration-300 hover:scale-[1.03] hover:z-20 ${
        isHero ? 'w-[280px] sm:w-[360px] md:w-[440px] lg:w-[520px] self-stretch' : 'w-[140px] sm:w-[160px] md:w-[180px] lg:w-[220px] aspect-[2/3]'
      }`}
      onClick={() => onClick(apt)}
    >
      {/* Background Image */}
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={apt.name} 
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 bg-white"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
      
      {/* Dark Gradient Overlay for Readability (Only if Image exists) */}
      {hasImage && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
      )}
      
      {/* Top Left Rank (Only for non-hero) */}
      {!isHero && rank != null && (
        <div className="absolute top-0 left-0 text-[#f2f4f6] font-black text-[80px] md:text-[120px] leading-none z-10 -translate-x-2 -translate-y-4" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.1)", WebkitTextStroke: "1px #d1d6db" }}>
          {rank}
        </div>
      )}
      
      {/* Base Content */}
      <div className={`absolute bottom-0 left-0 right-0 z-10 flex flex-col ${isHero ? 'p-5 md:p-8 gap-2' : 'p-3 md:p-5 gap-1'}`}>
        <h4 className={`${titleColor} font-extrabold leading-tight line-clamp-2 ${isHero ? 'text-[22px] md:text-[28px]' : 'text-[16px] md:text-[18px]'}`} style={hasImage ? { textShadow: "0 2px 8px rgba(0,0,0,0.5)" } : {}}>
          {apt.name}
        </h4>
        <div className="flex items-center gap-2">
          <span className={`${priceColor} font-extrabold ${isHero ? 'text-[18px] md:text-[20px]' : 'text-[15px]'}`}>{priceText}</span>
          <span className={`${dongColor} font-medium ${isHero ? 'text-[15px]' : 'text-[13px]'}`}>{apt.dong}</span>
        </div>
        {isHero && (
           <p className={`${descColor} text-[13px] md:text-[15px] font-medium mt-1 line-clamp-2 w-[80%]`}>
             동탄을 대표하는 최고의 하이엔드 아파트입니다. 현재 가장 높은 시세를 형성하고 있습니다.
           </p>
        )}
      </div>
    </div>
  );
};

const NetflixCategoryRow = React.memo(({ cat, apts, txSummaryData, nameMapping, fieldReportsMap, handleSelectApt }: any) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '200px 0px',
  });

  return (
    <div ref={ref} className="pt-6 pb-6 bg-transparent">
      <div className="mb-4 flex flex-col">
         <h3 className="text-[22px] md:text-[26px] font-extrabold text-[#191f28] tracking-tight">
           {cat.label}
         </h3>
      </div>
      
      {inView && (
        <div className="flex items-stretch gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-5 pt-2">
          {apts.map((apt: any, rankIndex: number) => {
             const rawKey = apt.txKey || apt.name;
             const txKey = findTxKey(rawKey, txSummaryData, nameMapping) || rawKey;
             const matchedSummary = txKey ? txSummaryData[txKey] : undefined;
             const matchedReport = fieldReportsMap.get(apt.name);
             return (
               <NetflixCard
                 key={apt.name}
                 apt={apt}
                 txSummary={matchedSummary}
                 report={matchedReport}
                 rank={rankIndex + 1}
                 onClick={handleSelectApt}
               />
             );
          })}
          <div className="w-[16px] md:w-[32px] shrink-0" />
        </div>
      )}
    </div>
  );
});
