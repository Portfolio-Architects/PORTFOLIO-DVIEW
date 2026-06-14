'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  Sparkles, 
  Coins, 
  HelpCircle, 
  ArrowRight, 
  Share2, 
  Check,
  MapPin,
  ArrowUpDown,
  Percent,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Info
} from 'lucide-react';
import { DongApartment } from '@/lib/dong-apartments';
import { AptTxSummary } from '@/lib/types/transaction';
import { findTxKey } from '@/lib/utils/apartmentMapping';
import { NativeAdPlaceholder } from '@/components/ui/NativeAdPlaceholder';

interface GapInvestmentExplorerProps {
  sheetApartments: Record<string, DongApartment[]>;
  txSummaryData: Record<string, AptTxSummary>;
  nameMapping: Record<string, string>;
  publicRentalSet: Set<string>;
  onSelectApt: (name: string) => void;
  onOpenAdModal?: () => void;
}

export default function GapInvestmentExplorer({
  sheetApartments,
  txSummaryData,
  nameMapping,
  publicRentalSet,
  onSelectApt,
  onOpenAdModal,
}: GapInvestmentExplorerProps) {
  const [localMaxGap, setLocalMaxGap] = useState<number>(20000);
  const [maxGap, setMaxGap] = useState<number>(20000); // Filter value
  const debouncedMaxGap = useDebounce(localMaxGap, 200);
  
  // New filters & sorting states
  const [selectedDong, setSelectedDong] = useState<string | null>(null);
  const [minJeonseRate, setMinJeonseRate] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('gapScore');
  const [expandedApt, setExpandedApt] = useState<string | null>(null);

  const [showAll, setShowAll] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window === 'undefined') return;

    const shareUrl = window.location.origin + window.location.pathname + window.location.search + '#gap';

    navigator.clipboard.writeText(shareUrl).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy URL:', err);
    });
  };

  // Parse initial query params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      
      const gapParam = params.get('maxGap');
      if (gapParam) {
        const parsed = parseInt(gapParam, 10);
        if (!isNaN(parsed) && parsed >= 3000 && parsed <= 60000) {
          setMaxGap(parsed);
          setLocalMaxGap(parsed);
        }
      }

      const dongParam = params.get('dong');
      if (dongParam) {
        setSelectedDong(dongParam);
      }

      const minJeonseParam = params.get('minJeonse');
      if (minJeonseParam) {
        const parsed = parseInt(minJeonseParam, 10);
        if (!isNaN(parsed) && [0, 60, 70, 80].includes(parsed)) {
          setMinJeonseRate(parsed);
        }
      }

      const sortByParam = params.get('sortBy');
      if (sortByParam) {
        if (['gapScore', 'gapAsc', 'ratioDesc', 'pyeongPriceAsc', 'householdCountDesc'].includes(sortByParam)) {
          setSortBy(sortByParam);
        }
      }
    }
  }, []);

  // Sync debounced values to filter
  useEffect(() => {
    setMaxGap(debouncedMaxGap);
  }, [debouncedMaxGap]);

  // Sync state variables to URL query parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      let changed = false;

      const currentGap = params.get('maxGap');
      if (currentGap !== String(maxGap)) {
        if (!(currentGap === null && maxGap === 20000)) {
          params.set('maxGap', String(maxGap));
          changed = true;
        }
      }

      const currentDong = params.get('dong');
      if (currentDong !== selectedDong) {
        if (selectedDong) {
          params.set('dong', selectedDong);
        } else {
          params.delete('dong');
        }
        changed = true;
      }

      const currentMinJeonse = params.get('minJeonse');
      if (currentMinJeonse !== String(minJeonseRate)) {
        if (minJeonseRate > 0) {
          params.set('minJeonse', String(minJeonseRate));
        } else {
          params.delete('minJeonse');
        }
        changed = true;
      }

      const currentSortBy = params.get('sortBy');
      if (currentSortBy !== sortBy) {
        if (sortBy !== 'gapScore') {
          params.set('sortBy', sortBy);
        } else {
          params.delete('sortBy');
        }
        changed = true;
      }

      if (changed) {
        const newUrl = window.location.pathname + '?' + params.toString() + window.location.hash;
        window.history.replaceState(null, '', newUrl);
      }
    }
  }, [maxGap, selectedDong, minJeonseRate, sortBy]);

  const PRESETS = [
    { label: '1.5억', value: 15000 },
    { label: '2억', value: 20000 },
    { label: '2.5억', value: 25000 },
    { label: '3억', value: 30000 },
    { label: '4억', value: 40000 },
    { label: '전체', value: 60000 },
  ];

  const formatGapLabel = (valMan: number) => {
    if (valMan >= 60000) return '전체';
    const eok = Math.floor(valMan / 10000);
    const man = valMan % 10000;
    if (eok > 0) {
      return `${eok}억${man > 0 ? ` ${man.toLocaleString()}` : ''}원 이하`;
    }
    return `${valMan.toLocaleString()}만원 이하`;
  };

  const formatPrice = (priceMan: number) => {
    const eok = Math.floor(priceMan / 10000);
    const man = priceMan % 10000;
    if (eok > 0) {
      return `${eok}억${man > 0 ? ` ${man.toLocaleString()}` : ''}`;
    }
    return `${priceMan.toLocaleString()}만`;
  };

  // Find all complexes, compute their gap info, and collect overall stats in a single pass
  const gapData = useMemo(() => {
    const allApts = Object.values(sheetApartments).flat().filter(a => !publicRentalSet.has(a.name));
    
    const items = allApts.map(apt => {
      const rawKey = apt.txKey || apt.name;
      const txKey = findTxKey(rawKey, txSummaryData, nameMapping) || rawKey;
      const sum = txSummaryData[txKey];

      let sales = sum ? (sum.avg1MPrice || sum.avg3MPrice || sum.latestPrice || 0) : 0;
      if (isNaN(sales) || sales < 0) sales = 0;

      let jeonse = sum ? (sum.avg1MRentDeposit || sum.avg3MRentDeposit || sum.latestRentDeposit || 0) : 0;
      if (isNaN(jeonse) || jeonse < 0) jeonse = 0;

      let pyeongPrice = sum ? (sum.avg1MPerPyeong || sum.avg3MPerPyeong || 0) : 0;
      if (isNaN(pyeongPrice) || pyeongPrice < 0) pyeongPrice = 0;
      
      const gap = sales > 0 && jeonse > 0 ? sales - jeonse : 0;
      const rawRatio = sales > 0 && jeonse > 0 ? (jeonse / sales) : 0;
      const ratio = isNaN(rawRatio) || !isFinite(rawRatio) ? 0 : rawRatio;

      // 갭투자 적합성 지수(Gap Score) 연산 도입
      // 1) 전세가율 점수 (55%): 50%일 때 0점, 80% 이상일 때 100점
      const ratioScore = Math.max(0, Math.min(100, ((ratio - 0.5) / 0.3) * 100));

      // 2) 최근 30일 거래 회전율 활성 점수 (25%) (30일 거래량 미존재 시 90일 보완 적용)
      const txCount = sum?.avg1MTxCount || sum?.avg3MTxCount || 0;
      let txScore = 0;
      if (txCount >= 10) txScore = 100;
      else if (txCount >= 5) txScore = 90;
      else if (txCount >= 3) txScore = 70;
      else if (txCount >= 1) txScore = 40;
      else txScore = 0;

      // 3) 단지 규모 세대수 점수 (20%)
      const hh = apt.householdCount || 0;
      let hhScore = 0;
      if (hh >= 1000) hhScore = 100;
      else if (hh >= 500) hhScore = 80;
      else if (hh >= 300) hhScore = 60;
      else if (hh >= 100) hhScore = 40;
      else hhScore = 20;

      const gapScore = Math.round(ratioScore * 0.55 + txScore * 0.25 + hhScore * 0.20);

      return {
        apt,
        sales,
        jeonse,
        gap,
        ratio,
        gapScore,
        txCount,
        pyeongPrice,
      };
    }).filter(item => item.sales > 0 && item.jeonse > 0 && item.gap > 0 && !isNaN(item.gap) && !isNaN(item.ratio));

    // Collect all statistics in a single O(N) pass to prevent multiple array traversals
    let ratioSum = 0;
    let validRatioCount = 0;
    let lowGap = 0;
    let highRatioCount = 0;
    let minGapVal = Infinity;
    let minGapObj: any = null;
    const dongSet = new Set<string>();

    items.forEach(item => {
      // 1. ratio statistics
      if (!isNaN(item.ratio) && isFinite(item.ratio)) {
        ratioSum += item.ratio;
        validRatioCount++;
      }
      // 2. low gap count
      if (item.gap <= 15000) {
        lowGap++;
      }
      // 3. high ratio count
      if (item.ratio >= 0.7) {
        highRatioCount++;
      }
      // 4. track min gap (O(N) search instead of O(N log N) sort)
      if (item.gap < minGapVal) {
        minGapVal = item.gap;
        minGapObj = item;
      }
      // 5. collect dongs
      if (item.apt.dong) {
        dongSet.add(item.apt.dong);
      }
    });

    const avgJeonseRateVal = validRatioCount > 0 ? Math.round((ratioSum / validRatioCount) * 100) : 0;
    const highJeonseRatioVal = items.length > 0 ? Math.round((highRatioCount / items.length) * 100) : 0;
    const sortedDongs = Array.from(dongSet).sort();

    return {
      items,
      avgJeonseRate: avgJeonseRateVal,
      lowGapCount: lowGap,
      highJeonseRatio: highJeonseRatioVal,
      minGapItem: minGapObj,
      dongsList: sortedDongs
    };
  }, [sheetApartments, txSummaryData, nameMapping, publicRentalSet]);

  const {
    items: allValidGapItems,
    avgJeonseRate,
    lowGapCount,
    highJeonseRatio,
    minGapItem,
    dongsList
  } = gapData;

  // Filter and Sort the Gap list
  const gapList = useMemo(() => {
    let filtered = allValidGapItems;

    // 1. Budget Filter
    if (maxGap < 60000) {
      filtered = filtered.filter(item => item.gap <= maxGap);
    }

    // 2. Dong Filter
    if (selectedDong) {
      filtered = filtered.filter(item => item.apt.dong === selectedDong);
    }

    // 3. Min Jeonse Rate Filter
    if (minJeonseRate > 0) {
      filtered = filtered.filter(item => item.ratio >= (minJeonseRate / 100));
    }

    // 4. Sort
    return [...filtered].sort((a, b) => {
      if (sortBy === 'gapAsc') {
        return a.gap - b.gap;
      }
      if (sortBy === 'ratioDesc') {
        return b.ratio - a.ratio;
      }
      if (sortBy === 'pyeongPriceAsc') {
        if (a.pyeongPrice === 0) return 1;
        if (b.pyeongPrice === 0) return -1;
        return a.pyeongPrice - b.pyeongPrice;
      }
      if (sortBy === 'householdCountDesc') {
        const hhA = a.apt.householdCount || 0;
        const hhB = b.apt.householdCount || 0;
        return hhB - hhA;
      }
      // default: gapScore desc
      return b.gapScore - a.gapScore;
    });
  }, [allValidGapItems, maxGap, selectedDong, minJeonseRate, sortBy]);

  const visibleList = showAll ? gapList : gapList.slice(0, 6);

  return (
    <div className="w-full bg-surface border border-border rounded-3xl p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#e6f3f0] dark:bg-[#042820] flex items-center justify-center text-[#008262] dark:text-[#00d29d]">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[18px] md:text-[20px] font-extrabold text-primary tracking-tight">
                갭투자 큐레이션
              </h3>
              <p className="text-[12px] md:text-[13px] font-medium text-tertiary">
                실거래가 기준 투자금 및 리스크 다차원 분석 대시보드
              </p>
            </div>
          </div>
          
          {/* Mobile Share Button */}
          <button
            onClick={handleShare}
            className="sm:hidden flex items-center justify-center w-9 h-9 rounded-xl border border-border/80 hover:border-[#008262]/30 hover:bg-[#008262]/5 text-secondary hover:text-[#008262] dark:hover:text-[#00d29d] active:scale-95 transition-all duration-300 relative focus:outline-none"
            title="현재 큐레이션 조건 공유하기"
          >
            <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
              {isCopied ? (
                <Check size={14} className="text-[#008262] dark:text-[#00d29d] animate-in zoom-in duration-200" />
              ) : (
                <Share2 size={14} className="animate-in zoom-in duration-200" />
              )}
            </div>
          </button>
        </div>

        {/* Desktop Share Button */}
        <button
          onClick={handleShare}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-extrabold border border-border/80 hover:border-[#008262]/30 hover:bg-[#008262]/5 text-secondary hover:text-[#008262] dark:hover:text-[#00d29d] active:scale-95 transition-all duration-300 relative focus:outline-none shrink-0"
          title="현재 큐레이션 조건 공유하기"
        >
          <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
            {isCopied ? (
              <Check size={14} className="text-[#008262] dark:text-[#00d29d] animate-in zoom-in duration-200" />
            ) : (
              <Share2 size={14} className="animate-in zoom-in duration-200" />
            )}
          </div>
          <span>{isCopied ? '링크 복사 완료' : '필터 공유'}</span>
        </button>
      </div>

      {/* 갭투자 종합 현황판 (Analytics Board) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-body/35 dark:bg-[#121824]/10 border border-border/40 rounded-2xl p-4 flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <span className="text-[11.5px] font-extrabold text-tertiary flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 text-[#008262] dark:text-[#00d29d]" />
            평균 전세가율
          </span>
          <div className="flex items-baseline gap-1.5 mt-2.5">
            <span className="text-[20px] font-black text-primary tracking-tight">
              {avgJeonseRate}%
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              avgJeonseRate >= 70 ? 'bg-[#fffbeb] text-[#d97706] dark:bg-[#d97706]/10' : 'bg-[#e6f3f0] text-[#008262] dark:bg-[#042820] dark:text-[#00d29d]'
            }`}>
              {avgJeonseRate >= 70 ? '안정성 관망' : '갭투자 용이'}
            </span>
          </div>
        </div>

        <div className="bg-body/35 dark:bg-[#121824]/10 border border-border/40 rounded-2xl p-4 flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <span className="text-[11.5px] font-extrabold text-tertiary flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-emerald-500" />
            소액 갭투자 단지
          </span>
          <div className="flex items-baseline gap-1 mt-2.5">
            <span className="text-[20px] font-black text-primary tracking-tight">
              {lowGapCount}개
            </span>
            <span className="text-[10.5px] font-bold text-tertiary">
              (전체 {allValidGapItems.length > 0 ? Math.round((lowGapCount / allValidGapItems.length) * 100) : 0}%)
            </span>
          </div>
        </div>

        <div className="bg-body/35 dark:bg-[#121824]/10 border border-border/40 rounded-2xl p-4 flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <span className="text-[11.5px] font-extrabold text-tertiary flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            전세율 70%+ 단지
          </span>
          <div className="flex items-baseline gap-1 mt-2.5">
            <span className="text-[20px] font-black text-primary tracking-tight">
              {highJeonseRatio}%
            </span>
            <span className="text-[10.5px] font-bold text-tertiary">
              의 비중
            </span>
          </div>
        </div>

        <div className="bg-body/35 dark:bg-[#121824]/10 border border-border/40 rounded-2xl p-4 flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <span className="text-[11.5px] font-extrabold text-tertiary flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            최소 갭 단지
          </span>
          <div className="flex flex-col mt-1">
            {minGapItem ? (
              <>
                <span className="text-[13px] font-black text-primary truncate max-w-full">
                  {minGapItem.apt.name}
                </span>
                <span className="text-[12px] font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                  갭 {formatPrice(minGapItem.gap)}
                </span>
              </>
            ) : (
              <span className="text-[13px] font-bold text-tertiary mt-1">없음</span>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Budget Controller Panel */}
      <div className="flex flex-col gap-5 bg-body/40 dark:bg-[#121824]/20 p-5 rounded-2xl border border-border/30 mb-6 shadow-sm">
        {/* Slider & Numeric input */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Slider input */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex justify-between items-baseline">
              <span className="text-[13px] md:text-[14px] font-extrabold text-secondary">최대 투자금 (갭)</span>
              <span className="text-[18px] md:text-[20px] font-black text-[#008262] dark:text-[#00d29d] tracking-tight">
                {formatGapLabel(localMaxGap)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="3000"
                max="60000"
                step="500"
                value={localMaxGap}
                onChange={(e) => {
                  setLocalMaxGap(Number(e.target.value));
                  setShowAll(false);
                }}
                className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-[#008262] dark:accent-[#00d29d] transition-all bg-slate-100 dark:bg-slate-800"
                style={{
                  background: `linear-gradient(to right, #008262 0%, #008262 ${((localMaxGap - 3000) / (60000 - 3000)) * 100}%, rgba(156, 163, 175, 0.2) ${((localMaxGap - 3000) / (60000 - 3000)) * 100}%, rgba(156, 163, 175, 0.2) 100%)`
                }}
              />
            </div>
          </div>

          {/* Direct Input & Match Count */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 bg-surface border border-border/60 rounded-xl px-3.5 py-2.5 focus-within:ring-1 focus-within:ring-[#008262] dark:focus-within:ring-[#00d29d] shadow-sm">
              <input
                type="number"
                min="0"
                max="60000"
                step="500"
                value={localMaxGap >= 60000 ? '' : localMaxGap}
                placeholder={localMaxGap >= 60000 ? '전체' : '예산 입력'}
                onChange={(e) => {
                  const val = e.target.value === '' ? 60000 : Number(e.target.value);
                  setLocalMaxGap(Math.min(60000, val));
                  setShowAll(false);
                }}
                className="w-20 bg-transparent text-right font-black text-primary text-[14px] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-[12px] font-bold text-tertiary">만원</span>
            </div>

            <div className="bg-[#e6f3f0] dark:bg-[#008262]/10 text-[#008262] dark:text-[#00d29d] px-3 py-2.5 rounded-xl text-[12px] md:text-[13px] font-extrabold border border-[#008262]/10 dark:border-[#00d29d]/10 shrink-0">
              총 {gapList.length}개 매칭
            </div>
          </div>
        </div>

        {/* Preset Quick Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3.5 border-t border-border/20">
          <span className="text-[11.5px] font-bold text-tertiary mr-1.5">빠른 선택</span>
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                setLocalMaxGap(preset.value);
                setMaxGap(preset.value);
                setShowAll(false);
              }}
              className={`px-3.5 py-1.5 text-[12px] font-extrabold rounded-lg transition-all border ${
                localMaxGap === preset.value
                  ? 'bg-[#008262] text-white border-[#008262] shadow-sm'
                  : 'bg-surface text-secondary hover:text-primary border-border/60'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 다차원 필터링 및 정렬 패널 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* 행정동 필터 */}
        <div className="flex-1 flex flex-col gap-1.5">
          <label htmlFor="dong-filter-select" className="text-[11.5px] font-bold text-secondary flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-tertiary" />
            행정동 필터
          </label>
          <div className="relative">
            <select
              id="dong-filter-select"
              value={selectedDong || ''}
              onChange={(e) => {
                setSelectedDong(e.target.value || null);
                setShowAll(false);
              }}
              className="w-full bg-surface border border-border/80 hover:border-emerald-500/30 text-primary rounded-xl px-3.5 py-2.5 text-[12.5px] font-extrabold focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none cursor-pointer"
            >
              <option value="">전체 행정동</option>
              {dongsList.map(dong => (
                <option key={dong} value={dong}>{dong}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-tertiary absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* 최소 전세가율 필터 */}
        <div className="flex-1 flex flex-col gap-1.5">
          <label htmlFor="jeonse-filter-select" className="text-[11.5px] font-bold text-secondary flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 text-tertiary" />
            최소 전세가율
          </label>
          <div className="relative">
            <select
              id="jeonse-filter-select"
              value={minJeonseRate}
              onChange={(e) => {
                setMinJeonseRate(Number(e.target.value));
                setShowAll(false);
              }}
              className="w-full bg-surface border border-border/80 hover:border-emerald-500/30 text-primary rounded-xl px-3.5 py-2.5 text-[12.5px] font-extrabold focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none cursor-pointer"
            >
              <option value="0">전체 전세율</option>
              <option value="60">60% 이상</option>
              <option value="70">70% 이상</option>
              <option value="80">80% 이상</option>
            </select>
            <ChevronDown className="w-4 h-4 text-tertiary absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* 정렬 조건 */}
        <div className="flex-1 flex flex-col gap-1.5">
          <label htmlFor="sort-select" className="text-[11.5px] font-bold text-secondary flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-tertiary" />
            정렬 기준
          </label>
          <div className="relative">
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setShowAll(false);
              }}
              className="w-full bg-surface border border-border/80 hover:border-emerald-500/30 text-primary rounded-xl px-3.5 py-2.5 text-[12.5px] font-extrabold focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none cursor-pointer"
            >
              <option value="gapScore">🔥 갭투자 지수 순</option>
              <option value="gapAsc">💸 투자금 낮은 순</option>
              <option value="ratioDesc">📈 전세가율 높은 순</option>
              <option value="pyeongPriceAsc">📉 평당가 낮은 순</option>
              <option value="householdCountDesc">🏢 세대수 많은 순</option>
            </select>
            <ChevronDown className="w-4 h-4 text-tertiary absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Info Warning */}
      <div className="flex items-start gap-2.5 bg-body/60 dark:bg-slate-900/40 p-4 rounded-2xl mb-6 text-[12px] sm:text-[13px] text-secondary border border-border/30">
        <HelpCircle className="w-4 h-4 text-tertiary shrink-0 mt-0.5" />
        <p className="leading-relaxed break-keep">
          최근 1개월(없을 시 3개월) 실거래가(매매 및 전세) 평균을 기초로 계산한 투자금액(갭) 정보입니다. 직거래나 비정상 거래는 제외될 수 있으며 실제 매물 가격과는 차이가 있을 수 있습니다.
        </p>
      </div>

      {/* Complex List Grid */}
      {gapList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Sparkles className="w-8 h-8 text-border mb-3" />
          <p className="text-[14px] font-bold text-secondary">조건에 매칭되는 단지가 없습니다.</p>
          <p className="text-[12px] text-tertiary mt-1">투자 예산이나 필터링 조건을 변경해 보세요.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleList.map((item, idx) => {
              const jeonseRatePercent = Math.round(item.ratio * 100);
              return (
                <div
                  key={item.apt.name}
                  onClick={() => onSelectApt(item.apt.name)}
                  data-testid="complex-card"
                  className="flex flex-col bg-[#fcfdfe]/50 dark:bg-[#151b26]/30 hover:bg-[#ffffff] dark:hover:bg-[#1c2431] border border-border/40 hover:border-[#008262]/40 hover:-translate-y-1 hover:shadow-md rounded-2xl p-5 cursor-pointer transition-all duration-300 group"
                >
                  <div className="flex justify-between items-start gap-2 mb-4">
                    <div className="flex flex-col min-w-0 pr-1">
                      <span 
                        data-testid="complex-name"
                        className="text-[16px] md:text-[18px] font-extrabold text-primary break-keep whitespace-normal group-hover:text-[#008262] dark:group-hover:text-[#00d29d] transition-colors"
                      >
                        {item.apt.name}
                      </span>
                      <span className="text-[12px] md:text-[13px] font-semibold text-tertiary mt-0.5">
                        {item.apt.dong} · {item.apt.householdCount || '-'}세대
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 items-end shrink-0">
                      <span className={`px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold rounded-md shrink-0 border ${
                        item.gapScore >= 80 ? 'bg-[#e0fbf4] dark:bg-[#00b386]/10 text-[#00b386] border-[#00b386]/20' :
                        item.gapScore >= 60 ? 'bg-[#e6f3f0] dark:bg-[#008262]/10 text-[#008262] dark:text-[#00d29d] border-[#008262]/20 dark:border-[#00d29d]/20' :
                        'bg-[#fffbeb] dark:bg-[#d97706]/10 text-[#d97706] border-[#d97706]/20'
                      }`}>
                        {item.gapScore >= 80 ? '🔥 GAP 우수' : item.gapScore >= 60 ? '✅ GAP 보통' : '⚠️ 관망 권장'}
                      </span>
                      <span className="text-[10px] font-bold text-tertiary">
                        지수 {item.gapScore}점
                      </span>
                    </div>
                  </div>

                  {/* Highlight box for Required Budget & Jeonse Rate */}
                  <div className="flex justify-between items-center bg-[#e8f8f5] dark:bg-[#042820]/30 rounded-xl p-3.5 border border-[#008262]/10 mb-4">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-[#008262]/80 dark:text-[#00d29d]">필요 투자금 (갭)</span>
                      <span className="text-[18px] md:text-[20px] font-black text-[#008262] dark:text-[#00d29d] tracking-tight">
                        {formatPrice(item.gap)}
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] md:text-[12px] font-bold text-[#008262]/80 dark:text-[#00d29d]">전세율 {jeonseRatePercent}%</span>
                      <div className="w-16 h-1.5 bg-border/50 dark:bg-[#008262]/10 rounded-full mt-1.5 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-400 to-[#008262]" 
                          style={{ width: `${Math.min(jeonseRatePercent, 100)}%` }}
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

                  {/* 3대 리스크 진단 헤더 */}
                  <div className="flex items-center justify-between border-t border-border/20 pt-3 mt-3 mb-1">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setExpandedApt(expandedApt === item.apt.name ? null : item.apt.name);
                      }}
                      data-testid="risk-btn"
                      className="flex items-center gap-1 text-[11px] font-black text-secondary hover:text-[#008262] dark:hover:text-[#00d29d] transition-colors focus:outline-none"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-tertiary" />
                      <span>3대 리스크 진단</span>
                      {expandedApt === item.apt.name ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                    
                    {/* Compact pills */}
                    <div className="flex gap-1 shrink-0">
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                        jeonseRatePercent >= 80 ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-200/20' :
                        jeonseRatePercent >= 70 ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/20' :
                        'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200/20'
                      }`}>
                        역전세
                      </span>
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                        item.txCount <= 2 ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-200/20' :
                        item.txCount <= 5 ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/20' :
                        'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200/20'
                      }`}>
                        유동성
                      </span>
                    </div>
                  </div>

                  {/* 상세 3대 리스크 진단 리포트 */}
                  {expandedApt === item.apt.name && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="bg-body/50 dark:bg-[#121824]/20 border border-border/30 rounded-xl p-3 mt-2.5 space-y-2.5 animate-in slide-in-from-top-1 duration-200 text-left"
                    >
                      {/* 역전세 리스크 */}
                      <div className="flex items-start gap-2 text-[11.5px] leading-relaxed">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${
                          jeonseRatePercent >= 80 ? 'bg-rose-500 animate-pulse' :
                          jeonseRatePercent >= 70 ? 'bg-amber-500' :
                          'bg-emerald-500'
                        }`} />
                        <div className="flex-1">
                          <p className="font-extrabold text-primary">
                            역전세 리스크: {' '}
                            <span className={
                              jeonseRatePercent >= 80 ? 'text-rose-500 font-black' :
                              jeonseRatePercent >= 70 ? 'text-amber-600 dark:text-amber-400 font-black' :
                              'text-emerald-600 dark:text-emerald-400 font-black'
                            }>
                              {jeonseRatePercent >= 80 ? '위험' : jeonseRatePercent >= 70 ? '주의' : '안전'}
                            </span>
                          </p>
                          <p className="text-tertiary font-semibold mt-0.5 leading-normal">
                            {jeonseRatePercent >= 80 
                              ? '전세가율이 80% 이상으로 매매가 하락 시 보증금 미반환 위험(깡통전세)이 매우 높습니다.'
                              : jeonseRatePercent >= 70 
                              ? '전세가율이 70% 이상으로 전세 시세 하락 시 역전세 노출 가능성이 있습니다.'
                              : '매매가 대비 보증금 완충 마진이 30% 이상 확보되어 전세금 반환 리스크가 낮습니다.'}
                          </p>
                        </div>
                      </div>

                      {/* 유동성 리스크 */}
                      <div className="flex items-start gap-2 text-[11.5px] leading-relaxed">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${
                          item.txCount <= 2 ? 'bg-rose-500' :
                          item.txCount <= 5 ? 'bg-amber-500' :
                          'bg-emerald-500'
                        }`} />
                        <div className="flex-1">
                          <p className="font-extrabold text-primary">
                            유동성 리스크: {' '}
                            <span className={
                              item.txCount <= 2 ? 'text-rose-500 font-black' :
                              item.txCount <= 5 ? 'text-amber-600 dark:text-amber-400 font-black' :
                              'text-emerald-600 dark:text-emerald-400 font-black'
                            }>
                              {item.txCount <= 2 ? '높음' : item.txCount <= 5 ? '보통' : '낮음'}
                            </span>
                          </p>
                          <p className="text-tertiary font-semibold mt-0.5 leading-normal">
                            {item.txCount <= 2 
                              ? '최근 30일(혹은 3개월) 실거래가 2건 이하로, 매도 시 자금 회수 및 엑시트가 지연될 수 있습니다.'
                              : item.txCount <= 5 
                              ? '최근 30일(혹은 3개월) 3~5건 거래가 발생하여, 표준적인 시장 환금성을 보입니다.'
                              : '최근 30일(혹은 3개월) 6건 이상으로 거래가 활발하여 언제든 자금 회수(Exit)가 용이합니다.'}
                          </p>
                        </div>
                      </div>

                      {/* 가격 변동성 리스크 */}
                      {(() => {
                        const hh = item.apt.householdCount || 0;
                        return (
                          <div className="flex items-start gap-2 text-[11.5px] leading-relaxed">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${
                              hh < 300 ? 'bg-rose-500' :
                              hh < 700 ? 'bg-amber-500' :
                              'bg-emerald-500'
                            }`} />
                            <div className="flex-1">
                              <p className="font-extrabold text-primary">
                                가격 변동성 (방어력): {' '}
                                <span className={
                                  hh < 300 ? 'text-rose-500 font-black' :
                                  hh < 700 ? 'text-amber-600 dark:text-amber-400 font-black' :
                                  'text-emerald-600 dark:text-emerald-400 font-black'
                                }>
                                  {hh < 300 ? '높음' : hh < 700 ? '보통' : '낮음'}
                                </span>
                              </p>
                              <p className="text-tertiary font-semibold mt-0.5 leading-normal">
                                {hh < 300 
                                  ? '300세대 미만 소단지로, 시세 왜곡 및 불황기 가격 하락 방어력이 취약할 수 있습니다.'
                                  : hh < 700 
                                  ? '300~700세대 중형 단지로, 시세 안정성이 보통 수준입니다.'
                                  : '700세대 이상 대단지 브랜드 타운으로, 불황기에도 가격 방어 및 수요 확보가 우수합니다.'}
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="my-2">
            <NativeAdPlaceholder 
              location="갭투자 탐색기 하단" 
              onClick={onOpenAdModal} 
              adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_GAP_EXPLORER || "test-gap-explorer-slot"}
              isCompact={true}
            />
          </div>

          {/* Show more Button */}
          {gapList.length > 6 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full py-3.5 border border-border border-dashed hover:border-secondary/40 hover:bg-body/30 rounded-2xl text-[14px] font-extrabold text-secondary hover:text-primary flex items-center justify-center gap-1.5 transition-all mt-2"
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
