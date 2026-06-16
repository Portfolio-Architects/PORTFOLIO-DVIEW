'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { GraduationCap, MapPin, HelpCircle, ArrowRight, BookOpen, Share2, Check } from 'lucide-react';
import { DongApartment } from '@/lib/dong-apartments';
import { AptTxSummary } from '@/lib/types/transaction';
import { findTxKey, isSameApartment } from '@/lib/utils/apartmentMapping';

interface ChopoomaCurationProps {
  sheetApartments: Record<string, DongApartment[]>;
  txSummaryData: Record<string, AptTxSummary>;
  nameMapping: Record<string, string>;
  publicRentalSet: Set<string>;
  locationScores: Record<string, any>;
  onSelectApt: (name: string) => void;
}

export default function ChopoomaCuration({
  sheetApartments,
  txSummaryData,
  nameMapping,
  publicRentalSet,
  locationScores,
  onSelectApt,
}: ChopoomaCurationProps) {
  const [showAll, setShowAll] = useState<boolean>(false);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(3); // Default to '전체 (300m)'
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const shareTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const mountedRef = React.useRef(true);

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window === 'undefined') return;

    const shareUrl = window.location.origin + window.location.pathname + window.location.search + '#gap';

    if (shareTimeoutRef.current) {
      clearTimeout(shareTimeoutRef.current);
    }

    navigator.clipboard.writeText(shareUrl).then(() => {
      if (mountedRef.current) {
        setIsCopied(true);
        shareTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) setIsCopied(false);
        }, 2000);
      }
    }).catch(err => {
      console.error('Failed to copy URL:', err);
    });
  };

  // Clean up timer on unmount to prevent memory leaks
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (shareTimeoutRef.current) {
        clearTimeout(shareTimeoutRef.current);
      }
    };
  }, []);

  // Available distance filter steps (in meters)
  const DISTANCE_STEPS = useMemo(() => [
    { label: '100m 미만', min: 0, max: 100, inclusiveMin: false, inclusiveMax: false },
    { label: '100m~200m', min: 100, max: 200, inclusiveMin: true, inclusiveMax: false },
    { label: '200m~300m', min: 200, max: 300, inclusiveMin: true, inclusiveMax: true },
    { label: '전체 (300m)', min: 0, max: 300, inclusiveMin: false, inclusiveMax: true },
  ], []);

  // Parse initial chopoomaStep on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const stepParam = params.get('chopoomaStep');
      if (stepParam) {
        const parsed = parseInt(stepParam, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < DISTANCE_STEPS.length) {
          setSelectedStepIndex(parsed);
        }
      }
    }
  }, [DISTANCE_STEPS]);

  // Sync chopoomaStep state to URL query parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const currentVal = params.get('chopoomaStep');
      if (currentVal !== String(selectedStepIndex)) {
        if (currentVal === null && selectedStepIndex === 3) {
          return;
        }
        params.set('chopoomaStep', String(selectedStepIndex));
        const newUrl = window.location.pathname + '?' + params.toString() + window.location.hash;
        window.history.replaceState(null, '', newUrl);
      }
    }
  }, [selectedStepIndex]);

  // format price helper
  const formatPrice = (priceMan: number) => {
    if (priceMan <= 0) return '실거래 정보 없음';
    const eok = Math.floor(priceMan / 10000);
    const man = priceMan % 10000;
    if (eok > 0) {
      return `${eok}억${man > 0 ? ` ${man.toLocaleString()}` : ''}`;
    }
    return `${priceMan.toLocaleString()}만`;
  };

  // Find all complexes and compute school distance info
  const rawChopoomaList = useMemo(() => {
    const allApts = Object.values(sheetApartments).flat().filter(a => !publicRentalSet.has(a.name));
    
    const enriched = allApts.map(apt => {
      const scoreKey = findTxKey(apt.name, locationScores, nameMapping) || apt.name;
      const scoreData = locationScores[scoreKey];
      const dist = scoreData?.distanceToElementary;
      
      const rawKey = apt.txKey || apt.name;
      const txKey = findTxKey(rawKey, txSummaryData, nameMapping) || rawKey;
      const sum = txSummaryData[txKey];

      const sales = sum ? (sum.avg1MPrice || sum.avg3MPrice || sum.latestPrice || 0) : 0;
      const jeonse = sum ? (sum.avg1MRentDeposit || sum.avg3MRentDeposit || sum.latestRentDeposit || 0) : 0;
      const ratio = sales > 0 && jeonse > 0 ? (jeonse / sales) : 0;

      return {
        apt,
        dist, // Distance to elementary school in meters
        sales,
        jeonse,
        ratio,
      };
    });

    // 초품아 기준: 초등학교까지의 거리가 300m 이하인 아파트
    // 거리 오름차순(가장 가까운 곳 우선) 정렬
    return enriched
      .filter(item => item.dist !== undefined && item.dist > 0 && item.dist <= 300)
      .sort((a, b) => (a.dist || 0) - (b.dist || 0));
  }, [sheetApartments, txSummaryData, nameMapping, publicRentalSet, locationScores]);

  // Filter based on selected distance step
  const chopoomaList = useMemo(() => {
    const step = DISTANCE_STEPS[selectedStepIndex];
    return rawChopoomaList.filter(item => {
      if (item.dist === undefined) return false;
      const minPass = step.inclusiveMin ? item.dist >= step.min : item.dist > step.min;
      const maxPass = step.inclusiveMax ? item.dist <= step.max : item.dist < step.max;
      return minPass && maxPass;
    });
  }, [rawChopoomaList, selectedStepIndex, DISTANCE_STEPS]);

  const visibleList = showAll ? chopoomaList : chopoomaList.slice(0, 6);

  return (
    <div className="w-full bg-surface border border-border rounded-3xl p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-toss-green">
              <GraduationCap className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-[18px] md:text-[20px] font-extrabold text-primary tracking-tight">
                초품아 큐레이션
              </h3>
              <p className="text-[12px] md:text-[13px] font-medium text-tertiary">
                초등학교 도보 5분(300m) 이내 안심 학군 단지 큐레이션
              </p>
            </div>
          </div>
          
          {/* Mobile Share Button */}
          <button
            onClick={handleShare}
            className="sm:hidden flex items-center justify-center w-9 h-9 rounded-xl border border-border/80 hover:border-emerald-500/30 hover:bg-emerald-500/5 text-secondary hover:text-[#0d9488] active:scale-95 transition-all duration-300 relative focus:outline-none"
            title="현재 큐레이션 조건 공유하기"
          >
            <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
              {isCopied ? (
                <Check size={14} className="text-[#0d9488] animate-in zoom-in duration-200" />
              ) : (
                <Share2 size={14} className="animate-in zoom-in duration-200" />
              )}
            </div>
          </button>
        </div>
        
        {/* Distance Selector & Match Count */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto">
          {/* Desktop Share Button */}
          <button
            onClick={handleShare}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-extrabold border border-border/80 hover:border-emerald-500/30 hover:bg-emerald-500/5 text-secondary hover:text-[#0d9488] active:scale-95 transition-all duration-300 relative focus:outline-none shrink-0"
            title="현재 큐레이션 조건 공유하기"
          >
            <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
              {isCopied ? (
                <Check size={14} className="text-[#0d9488] animate-in zoom-in duration-200" />
              ) : (
                <Share2 size={14} className="animate-in zoom-in duration-200" />
              )}
            </div>
            <span>{isCopied ? '링크 복사 완료' : '필터 공유'}</span>
          </button>

          <div className="flex bg-body p-1 rounded-xl items-center gap-0.5 overflow-x-auto no-scrollbar w-full sm:w-auto shadow-inner border border-border/10 max-w-full">
            {DISTANCE_STEPS.map((step, idx) => (
              <button
                key={step.label}
                onClick={() => {
                  setSelectedStepIndex(idx);
                  setShowAll(false);
                }}
                className={`flex-1 sm:flex-none px-2.5 py-1.5 text-[11px] sm:text-[12px] font-extrabold rounded-lg whitespace-nowrap transition-all ${
                  selectedStepIndex === idx
                    ? 'bg-surface text-toss-green shadow-sm'
                    : 'text-tertiary hover:text-secondary'
                }`}
              >
                {step.label}
              </button>
            ))}
          </div>

          <div className="bg-[#e0fbf4] text-[#00b386] px-3 py-1.5 rounded-xl text-[12px] font-extrabold border border-[#00b386]/10 shrink-0 self-start sm:self-auto">
            총 {chopoomaList.length}개 매칭
          </div>
        </div>
      </div>

      {/* Info Warning */}
      <div className="flex items-start gap-2.5 bg-body/60 dark:bg-slate-900/40 p-4 rounded-2xl mb-6 text-[12px] sm:text-[13px] text-secondary border border-border/30">
        <BookOpen className="w-4 h-4 text-tertiary shrink-0 mt-0.5" />
        <p className="leading-relaxed break-keep">
          동탄 실거래 아파트 정보 중 초등학교까지의 직선 및 보행 거리가 300m 이내에 위치하여 아이들이 도로 횡단을 최소화하고 안전하게 통학할 수 있는 1등급 교육환경 단지 목록입니다.
        </p>
      </div>

      {/* Complex List Grid */}
      {chopoomaList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <HelpCircle className="w-8 h-8 text-border mb-3" />
          <p className="text-[14px] font-bold text-secondary">선택한 거리 기준 내 초품아 단지가 없습니다.</p>
          <p className="text-[12px] text-tertiary mt-1">거리 조건을 더 넓게 설정해보세요.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleList.map((item, idx) => {
              const dist = item.dist || 0;
              const walkTime = Math.ceil(dist / 80);
              return (
                <div
                  key={item.apt.name}
                  onClick={() => onSelectApt(item.apt.name)}
                  className="flex flex-col bg-[#fcfdfe]/50 dark:bg-[#151b26]/30 hover:bg-[#ffffff] dark:hover:bg-[#1c2431] border border-border/40 hover:border-[#03c75a]/40 hover:-translate-y-1 hover:shadow-md rounded-2xl p-5 cursor-pointer transition-all duration-300 group"
                >
                  <div className="flex justify-between items-start gap-2 mb-4">
                    <div className="flex flex-col min-w-0 pr-1">
                      <span className="text-[16px] md:text-[18px] font-extrabold text-primary break-keep whitespace-normal group-hover:text-toss-green transition-colors">
                        {item.apt.name}
                      </span>
                      <span className="text-[12px] md:text-[13px] font-semibold text-tertiary mt-0.5">
                        {item.apt.dong} · {item.apt.householdCount || '-'}세대
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 items-end shrink-0">
                      {dist <= 150 ? (
                        <span className="px-2 py-0.5 bg-[#e0fbf4] dark:bg-[#03c75a]/10 text-[#03c75a] text-[10px] sm:text-[11px] font-extrabold rounded-md shrink-0 border border-[#03c75a]/20">
                          초인접 학군
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] sm:text-[11px] font-extrabold rounded-md shrink-0 border border-slate-200 dark:border-slate-700">
                          안심 통학
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Highlight box for School Distance & Walk Time */}
                  <div className="flex justify-between items-center bg-[#f0fbf7] dark:bg-[#1a3c30]/20 rounded-xl p-3.5 border border-[#03c75a]/10 mb-4">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-toss-green dark:text-emerald-400">초등학교 최단거리</span>
                      <span className="text-[18px] md:text-[20px] font-black text-toss-green tracking-tight">
                        {dist}m
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <span className="text-[12px] font-extrabold text-toss-green dark:text-emerald-400">도보 약 {walkTime}분</span>
                      <div className="w-16 h-1.5 bg-border/50 dark:bg-emerald-950 rounded-full mt-1.5 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-400 to-[#03c75a] rounded-full" 
                          style={{ width: `${Math.max(10, 100 - (dist / 3))}%` }}
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
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
                      전세 평균 <strong className="text-primary font-bold">{formatPrice(item.jeonse)}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show more Button */}
          {chopoomaList.length > 6 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full py-3.5 border border-border border-dashed hover:border-secondary/40 hover:bg-body/30 rounded-2xl text-[14px] font-extrabold text-secondary hover:text-primary flex items-center justify-center gap-1.5 transition-all mt-2"
            >
              <span>{showAll ? '접기' : `단지 더 보기 (+${chopoomaList.length - 6}개)`}</span>
              <ArrowRight className={`w-3.5 h-3.5 transition-transform duration-300 ${showAll ? '-rotate-90' : ''}`} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
