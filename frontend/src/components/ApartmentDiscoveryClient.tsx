'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Flame, Heart, Clock, MapPin, Building2, TrendingUp, Sparkles, TrendingDown, Coins, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
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
    { id: 'over-12-eok', label: '12억 이상 아파트', icon: Sparkles, color: '#eab308', desc: '동탄을 대표하는 프리미엄 랜드마크 아파트 컬렉션' },
    { id: 'biggest-drop', label: '최고가 대비 하락폭 TOP', icon: TrendingDown, color: '#ef4444', desc: '고점 대비 가장 많이 하락한 단지' },
    { id: 'high-jeonse-rate', label: '전세가율 60% 이상', icon: Coins, color: '#3b82f6', desc: '안전 마진이 확보된 갭투자 유망 단지' },
    { id: 'most-traded', label: '최근 3개월 거래량 TOP', icon: Activity, color: '#10b981', desc: '요즘 동탄에서 가장 뜨거운 단지' },
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
      if (cat.id === 'over-12-eok') {
        list = list.filter(a => {
          const rawKey = (a as any).txKey || a.name;
          const txKey = findTxKey(rawKey, txSummaryData, nameMapping) || rawKey;
          const summary = txSummaryData[txKey];
          return summary && (summary.avg1MPrice || 0) >= 120000;
        }).sort((a, b) => {
          const txKeyA = findTxKey((a as any).txKey || a.name, txSummaryData, nameMapping) || (a as any).txKey || a.name;
          const priceA = txSummaryData[txKeyA]?.avg1MPrice || 0;
          const txKeyB = findTxKey((b as any).txKey || b.name, txSummaryData, nameMapping) || (b as any).txKey || b.name;
          const priceB = txSummaryData[txKeyB]?.avg1MPrice || 0;
          return priceB - priceA;
        }).slice(0, 15);
      } else if (cat.id === 'biggest-drop') {
        list = list.filter(a => {
          const rawKey = (a as any).txKey || a.name;
          const txKey = findTxKey(rawKey, txSummaryData, nameMapping) || rawKey;
          const summary = txSummaryData[txKey];
          return summary && summary.maxPrice && summary.avg1MPrice && summary.maxPrice > summary.avg1MPrice;
        }).sort((a, b) => {
          const txKeyA = findTxKey((a as any).txKey || a.name, txSummaryData, nameMapping) || (a as any).txKey || a.name;
          const summaryA = txSummaryData[txKeyA];
          const dropA = summaryA ? (summaryA.maxPrice - summaryA.avg1MPrice) / summaryA.maxPrice : 0;
          
          const txKeyB = findTxKey((b as any).txKey || b.name, txSummaryData, nameMapping) || (b as any).txKey || b.name;
          const summaryB = txSummaryData[txKeyB];
          const dropB = summaryB ? (summaryB.maxPrice - summaryB.avg1MPrice) / summaryB.maxPrice : 0;
          
          return dropB - dropA;
        }).slice(0, 15);
      } else if (cat.id === 'high-jeonse-rate') {
        list = list.filter(a => {
          const rawKey = (a as any).txKey || a.name;
          const txKey = findTxKey(rawKey, txSummaryData, nameMapping) || rawKey;
          const summary = txSummaryData[txKey];
          return summary && summary.avg1MPrice && summary.avg1MRentDeposit && (summary.avg1MRentDeposit / summary.avg1MPrice) >= 0.6;
        }).sort((a, b) => {
          const txKeyA = findTxKey((a as any).txKey || a.name, txSummaryData, nameMapping) || (a as any).txKey || a.name;
          const summaryA = txSummaryData[txKeyA];
          const rateA = summaryA ? summaryA.avg1MRentDeposit! / summaryA.avg1MPrice! : 0;
          
          const txKeyB = findTxKey((b as any).txKey || b.name, txSummaryData, nameMapping) || (b as any).txKey || b.name;
          const summaryB = txSummaryData[txKeyB];
          const rateB = summaryB ? summaryB.avg1MRentDeposit! / summaryB.avg1MPrice! : 0;
          
          return rateB - rateA;
        }).slice(0, 15);
      } else if (cat.id === 'most-traded') {
        list = list.filter(a => {
          const rawKey = (a as any).txKey || a.name;
          const txKey = findTxKey(rawKey, txSummaryData, nameMapping) || rawKey;
          const summary = txSummaryData[txKey];
          return summary && summary.avg3MTxCount && summary.avg3MTxCount > 0;
        }).sort((a, b) => {
          const txKeyA = findTxKey((a as any).txKey || a.name, txSummaryData, nameMapping) || (a as any).txKey || a.name;
          const countA = txSummaryData[txKeyA]?.avg3MTxCount || 0;
          
          const txKeyB = findTxKey((b as any).txKey || b.name, txSummaryData, nameMapping) || (b as any).txKey || b.name;
          const countB = txSummaryData[txKeyB]?.avg3MTxCount || 0;
          
          return countB - countA;
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
    <div className="flex flex-col h-full bg-[#f8f9fa] overflow-y-auto custom-scrollbar">
      {/* Hero Header */}
      <PageHeroHeader 
        title="D-VIEW 골라보기"
        subtitleStrong="프리미엄 랜드마크 단지 큐레이션"
        subtitleLight="당신의 투자 전략에 딱 맞는 랜드마크 단지를 둘러보세요"
      />

      <div className="pt-6">
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
      
      {/* Bottom Padding */}
      <div className="h-[80px] shrink-0 bg-transparent" />
    </div>
  );
}

const NetflixCard = ({ cat, apt, txSummary, report, rank, onClick }: any) => {
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
      className={`relative shrink-0 rounded-[8px] md:rounded-[12px] overflow-hidden cursor-pointer group shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#e5e8eb] bg-white transition-all duration-300 hover:scale-[1.05] hover:!z-[999] hover:shadow-2xl w-[224px] sm:w-[288px] md:w-[352px] lg:w-[416px] aspect-[4/3] snap-center ${
        rank > 1 ? '-ml-[45px] sm:-ml-[58px] md:-ml-[70px] lg:-ml-[83px]' : ''
      }`}
      style={{ zIndex: 100 - rank }}
      onClick={() => onClick(apt)}
    >
      {/* Background Image */}
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={apt.name} 
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 bg-white"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
      
      {/* Dark Gradient Overlay for Readability (Only if Image exists) */}
      {hasImage && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none transition-opacity duration-300 group-hover:opacity-90" />
      )}
      
      {/* Top Left Rank */}
      {rank != null && (
        <div className="absolute top-3 left-3 md:top-4 md:left-4 bg-black/60 backdrop-blur-md rounded-full px-3 py-1 z-10 border border-white/10 shadow-lg">
          <span className="text-white font-extrabold text-[14px] md:text-[16px] italic">{rank}위</span>
        </div>
      )}
      
      {/* Base Content */}
      <div className={`absolute bottom-0 left-0 right-0 z-10 flex flex-col p-4 md:p-6 gap-1 md:gap-2 transition-transform duration-300 group-hover:-translate-y-2`}>
        <h4 className={`${titleColor} font-extrabold leading-tight line-clamp-2 break-keep text-[18px] md:text-[24px]`} style={hasImage ? { textShadow: "0 2px 8px rgba(0,0,0,0.5)" } : {}}>
          {apt.name}
        </h4>
        <div className="flex items-center gap-2">
          <span className={`${priceColor} font-extrabold text-[16px] md:text-[18px]`}>{priceText}</span>
          <span className={`${dongColor} font-medium text-[13px] md:text-[14px]`}>{apt.dong}</span>
        </div>
        <p className={`${descColor} text-[12px] md:text-[14px] font-medium mt-1 line-clamp-2 w-[90%] opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
          {cat?.desc || '동탄을 대표하는 프리미엄 아파트입니다.'}
        </p>
      </div>
    </div>
  );
};

const NetflixCategoryRow = React.memo(({ cat, apts, txSummaryData, nameMapping, fieldReportsMap, handleSelectApt }: any) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '200px 0px',
  });
  
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current && scrollContainerRef.current.firstElementChild) {
      const { scrollLeft } = scrollContainerRef.current;
      // 첫 번째 자식은 Hero 카드이므로(너비가 2배 이상 넓음), 두 번째 일반 카드의 너비를 측정해야 합니다.
      const targetElement = (scrollContainerRef.current.children.length > 1 
        ? scrollContainerRef.current.children[1] 
        : scrollContainerRef.current.firstElementChild) as HTMLElement;
      
      const cardWidth = targetElement.offsetWidth;
      // md:gap-4 is 16px
      const gap = 16;
      const scrollAmount = (cardWidth + gap) * 2;
      
      scrollContainerRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div ref={ref} className="py-2 mb-2 bg-transparent relative group">
      <div className="px-4 sm:px-6 md:px-10 lg:px-16 mb-2 flex flex-col">
         <h3 className="text-[22px] md:text-[26px] font-extrabold text-[#191f28] tracking-tight">
           {cat.label}
         </h3>
      </div>
      
      {inView && (
        <div className="relative">
          <button 
            onClick={() => handleScroll('left')}
            className="absolute left-0 top-0 bottom-0 z-30 w-16 bg-gradient-to-r from-white via-white/80 to-transparent flex items-center justify-start pl-2 sm:pl-4 md:pl-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:flex"
            aria-label="이전"
          >
            <div className="bg-white rounded-full p-2 shadow-md border border-gray-100 text-gray-700 hover:text-black hover:scale-110 transition-transform flex items-center justify-center -ml-2">
              <ChevronLeft className="w-6 h-6" />
            </div>
          </button>
          
          <button 
            onClick={() => handleScroll('right')}
            className="absolute right-0 top-0 bottom-0 z-30 w-16 bg-gradient-to-l from-white via-white/80 to-transparent flex items-center justify-end pr-2 sm:pr-4 md:pr-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:flex"
            aria-label="다음"
          >
            <div className="bg-white rounded-full p-2 shadow-md border border-gray-100 text-gray-700 hover:text-black hover:scale-110 transition-transform flex items-center justify-center -mr-2">
              <ChevronRight className="w-6 h-6" />
            </div>
          </button>

          <div 
            ref={scrollContainerRef}
            className="flex items-stretch overflow-x-auto snap-x snap-mandatory hide-scrollbar px-4 sm:px-6 md:px-10 lg:px-16 pb-6 pt-4 scroll-smooth"
          >
            {apts.map((apt: any, rankIndex: number) => {
               const rawKey = apt.txKey || apt.name;
               const txKey = findTxKey(rawKey, txSummaryData, nameMapping) || rawKey;
               const matchedSummary = txKey ? txSummaryData[txKey] : undefined;
               const matchedReport = fieldReportsMap.get(apt.name);
               return (
                 <NetflixCard
                   key={apt.name}
                   cat={cat}
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
        </div>
      )}
    </div>
  );
});
