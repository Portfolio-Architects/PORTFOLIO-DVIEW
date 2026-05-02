'use client';

import React, { memo } from 'react';

import { FileText, Heart } from 'lucide-react';
import { normalize84Price } from '@/lib/utils/valuation';
import type { AptTxSummary } from '@/lib/transaction-summary';
import type { FieldReportData } from '@/lib/DashboardFacade';
import { useSettings } from '@/lib/contexts/SettingsContext';

interface StaticApartment {
  name: string;
  dong: string;
  householdCount?: number;
  yearBuilt?: string;
  brand?: string;
}

interface ApartmentCardProps {
  apt: StaticApartment;
  txSummary?: AptTxSummary;
  report?: FieldReportData;
  isPublicRental: boolean;
  onClick: (apt: StaticApartment) => void;
  rank?: number;
  isSelected?: boolean;
  isFavorited?: boolean;
  favoriteCount?: number;
  onToggleFavorite?: (aptName: string) => void;
  typeMap?: Record<string, Record<string, { typeM2: string; typePyeong: string }>>;
  listSort?: string;
}

const ApartmentCard = memo(function ApartmentCard({ apt, txSummary, report, isPublicRental, onClick, rank, isSelected, isFavorited, favoriteCount, onToggleFavorite, typeMap, listSort }: ApartmentCardProps) {
  const { areaUnit } = useSettings();
  // 사진 갯수 계산
  let photoCount = 0;
  if (report?.images?.length) {
    photoCount = report.images.length;
  } else {
    if (report?.imageUrl) photoCount += 1;
    if (report?.sections?.infra?.gateImg) photoCount += 1;
    if (report?.sections?.infra?.gateImgs?.length) photoCount += report.sections.infra.gateImgs.length;
    if (report?.sections?.infra?.landscapeImg) photoCount += 1;
    if (report?.sections?.infra?.landscapeImgs?.length) photoCount += report.sections.infra.landscapeImgs.length;
    if (report?.sections?.infra?.parkingImg) photoCount += 1;
    if (report?.sections?.ecosystem?.communityImg) photoCount += 1;
    if (report?.sections?.ecosystem?.schoolImg) photoCount += 1;
    if (report?.sections?.ecosystem?.commerceImg) photoCount += 1;
  }

  const hasPhotos = photoCount > 0;

  // 입지 분석(metrics) 유무 확인 (기본 건축정보를 제외한 실제 주변 인프라 입지 데이터가 있는지)
  const m = report?.metrics;
  const hasAnalysis = !!m && !!(
    m.distanceToElementary || m.distanceToMiddle || m.distanceToHigh ||
    m.distanceToSubway || m.distanceToIndeokwon || m.distanceToTram ||
    m.academyDensity || m.restaurantDensity ||
    m.distanceToStarbucks || m.distanceToMcDonalds || m.distanceToOliveYoung ||
    m.distanceToDaiso || m.distanceToSupermarket
  );

  // 84㎡ 정규화 가격
  const norm84Label = (() => {
    if (!txSummary?.recent?.[0]) return null;
    const r = txSummary.recent[0];
    const priceMatch = r.priceEok.match(/(\d+)억([\d,]*)/);
    if (!priceMatch) return null;
    const priceMan = parseInt(priceMatch[1]) * 10000 + parseInt((priceMatch[2] || '0').replace(/,/g, ''));
    const norm84 = normalize84Price(priceMan, r.area);
    const eok = Math.floor(norm84 / 10000);
    const rem = norm84 % 10000;
    return `${eok > 0 ? `${eok}억` : ''}${rem > 0 ? rem.toLocaleString() : ''}`;
  })();

  return (
    <div
      onClick={() => onClick(apt)}
      className={`relative flex items-center gap-3 px-4 py-3.5 transition-all duration-150 cursor-pointer hover:bg-body active:bg-body border-b border-body last:border-b-0 group ${
        !hasAnalysis && !hasPhotos && !txSummary ? 'opacity-60' : ''
      } ${
        isSelected ? 'bg-[#f8faff]' : ''
      }`}
    >
      {/* 선택 액센트 바 */}
      {isSelected && (
        <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-toss-blue" />
      )}
      {/* 순위 */}
      {rank != null && (
        <span className="text-sm font-extrabold text-tertiary w-7 text-center shrink-0 tabular-nums">
          {rank}
        </span>
      )}

      {/* 아파트 정보 */}
      <div className="flex-1 min-w-0 pr-2 flex flex-col justify-center">
        <h4 className="text-[15px] font-extrabold text-primary truncate group-hover:text-toss-blue transition-colors leading-tight">
          {apt.name}
        </h4>
        
        <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto hide-scrollbar">
          <span className="text-[11px] font-medium text-tertiary shrink-0">{apt.dong}</span>
          

          {hasPhotos && (
            <span className="inline-flex items-center gap-0.5 bg-[#fff4e6] text-[#ff8a3d] text-[11px] font-bold px-1.5 py-[2px] rounded shrink-0 leading-tight">
              사진 {photoCount}
            </span>
          )}
          {(!hasAnalysis && !hasPhotos) && isPublicRental && (
            <span className="text-[11px] font-bold bg-body text-tertiary px-1.5 py-[1px] rounded shrink-0 leading-tight">공공</span>
          )}
        </div>
      </div>

      {/* 가격 영역 */}
      <div className="flex items-center shrink-0">
        {txSummary ? (
          <div className="text-right min-w-[65px]">
            <div className="flex justify-end items-baseline text-[15px] leading-none mb-1">
              {(() => {
                let eok = 0;
                let rem = 0;
                let hasValue = false;
                
                if ((txSummary.avg3MPrice || 0) > 0 || (txSummary.avg1MPrice || 0) > 0) {
                  const price = txSummary.avg3MPrice || txSummary.avg1MPrice || 0;
                  const rounded = Math.round(price / 100) * 100;
                  eok = Math.floor(rounded / 10000);
                  rem = rounded % 10000;
                  hasValue = true;
                } else if (txSummary.recent && txSummary.recent.length > 0) {
                  const r = txSummary.recent[0].priceEok;
                  const match = r.match(/(\d+)억\s*([\d,]*)/);
                  if (match) {
                    eok = parseInt(match[1]);
                    rem = parseInt((match[2] || '0').replace(/,/g, ''));
                    hasValue = true;
                  } else if (r.includes('만')) {
                    eok = 0;
                    rem = parseInt(r.replace(/[^\d]/g, ''));
                    hasValue = true;
                  } else if (!isNaN(parseInt(r))) {
                    eok = 0;
                    rem = parseInt(r);
                    hasValue = true;
                  }
                }
                
                if (hasValue) {
                   return (
                     <>
                       <span className="font-extrabold text-primary tabular-nums">{eok >= 1 ? `${eok}억` : ''}</span>
                       <span className={`inline-block text-left font-bold tabular-nums ml-[2px] ${eok > 0 ? 'w-[32px] text-[13px] text-secondary' : 'text-[15px] text-primary'}`}>
                         {rem > 0 ? (eok === 0 ? `${rem.toLocaleString()}만` : rem.toLocaleString()) : (eok === 0 ? '0' : '')}
                       </span>
                     </>
                   );
                }

                if (txSummary && (txSummary.latestRentDeposit || 0) > 0) {
                  return <span className="font-extrabold text-primary text-[14.5px] tracking-tight">{`전/월세 ${txSummary.latestRentDepositEok}`}</span>;
                }
                return <span className="font-extrabold text-primary">-</span>;
              })()}
            </div>
            <div className="flex items-center justify-end gap-1.5">
              {(() => {
                if (listSort === 'valuation') {
                  const sales = txSummary.avg3MPrice || txSummary.avg1MPrice || txSummary.latestPrice || 0;
                  const jeonse = txSummary.avg3MRentDeposit || txSummary.avg1MRentDeposit || txSummary.latestRentDeposit || 0;
                  if (sales > 0 && jeonse > 0) {
                    const ratio = (jeonse / sales) * 100;
                    return <span className="text-xs font-bold text-toss-blue">전세가율 {ratio.toFixed(1)}%</span>;
                  }
                }

                // 1. If we have 3-month average, display the accurate 3-month per-pyeong calculation
                if ((txSummary.avg3MPrice || 0) > 0 && (txSummary.avg3MPerPyeong || 0) > 0) {
                  return <span className="text-xs font-bold text-toss-blue">{txSummary.avg3MPerPyeong!.toLocaleString()}만/평</span>;
                } else if ((txSummary.avg1MPrice || 0) > 0 && (txSummary.avg1MPerPyeong || 0) > 0) {
                  return <span className="text-xs font-bold text-toss-blue">{txSummary.avg1MPerPyeong!.toLocaleString()}만/평</span>;
                }

                // 2. Otherwise, if we have recent transaction, calculate per-pyeong of that specific transaction
                if (txSummary.recent && txSummary.recent.length > 0) {
                  const r = txSummary.recent[0];
                  let priceMan = 0;
                  const match = r.priceEok.match(/(\d+)억\s*([\d,]*)/);
                  if (match) {
                    priceMan = parseInt(match[1]) * 10000 + parseInt((match[2] || '0').replace(/,/g, ''));
                  } else if (r.priceEok.includes('만')) {
                    priceMan = parseInt(r.priceEok.replace(/[^\d]/g, ''));
                  }
                  
                  if (priceMan > 0 && r.areaPyeong > 0) {
                    return <span className="text-xs font-bold text-toss-blue">{Math.round(priceMan / r.areaPyeong).toLocaleString()}만/평</span>;
                  }
                }
                
                return null;
              })()}
            </div>
          </div>
        ) : (
          <span className="text-xs text-toss-gray">—</span>
        )}
      </div>

      {/* ♡ 가격 투표 / 관심 등록 버튼 (Gamification) */}
      {onToggleFavorite && (
        <div className="flex flex-col items-center justify-center shrink-0 ml-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(apt.name); }}
            className={`w-10 h-10 flex flex-col items-center justify-center gap-0.5 rounded-lg transition-all ${
              isFavorited 
                ? 'bg-[#fff0f0] text-[#ff3b30]' 
                : 'bg-body text-tertiary hover:bg-[#e5e8eb] hover:text-secondary'
            }`}
            title={isFavorited ? '관심 해제' : '관심 등록'}
          >
            <span className="flex items-center justify-center leading-none h-[14px]"><Heart size={14} fill={isFavorited ? 'currentColor' : 'none'} strokeWidth={2.5} /></span>
            {favoriteCount != null ? (
              <span className="text-[9px] font-extrabold tabular-nums leading-none mt-0.5">
                {favoriteCount}
              </span>
            ) : (
              <span className="text-[8px] font-bold leading-none mt-0.5">투표</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
});

export default ApartmentCard;
