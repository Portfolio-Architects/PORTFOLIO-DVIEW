'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  X,
  Maximize2,
  Layers,
  Car,
  Calendar,
  Heart,
  Share2,
  Check,
  TrendingUp,
  Percent,
  Coins,
  ShieldCheck,
  Building,
  Users,
  Calculator,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Info,
  BadgeCheck,
  PhoneCall,
  MapPin,
  Clock,
  CheckCircle2
} from 'lucide-react';

export interface OfficeTransaction {
  readonly date: string;
  readonly type: '매매' | '임대';
  readonly sizeSqM: number;
  readonly floor: number;
  readonly price: string;
}

export interface OfficeBuilding {
  name: string;
  type: string;
  dong: '동탄영천동' | '동탄오산동' | '동탄목동' | '동탄장지동';
  rentPerPy: string;
  features: string[];
  driveIn: boolean;
  stationDistance: 'very-close' | 'close' | 'moderate';
  desc: string;
  imgPlaceholder: string;
  score: number;
  totalUnits: number;
  vacancyRate: number;
  recentTransactions: OfficeTransaction[];
  specs: {
    gfa: string;
    scale: string;
    parking: string;
    completion: string;
  };
}

interface OfficeDetailModalProps {
  building: OfficeBuilding | null;
  onClose: () => void;
}

export default function OfficeDetailModal({ building, onClose }: OfficeDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'benefits' | 'coleasing'>('overview');
  const [isFavorite, setIsFavorite] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Tax Simulator state
  const [priceInput, setPriceInput] = useState<number>(30000); // 3억원 (만원 단위)
  const [txFilter, setTxFilter] = useState<'all' | 'sale' | 'rent'>('all');
  const [apiTxs, setApiTxs] = useState<OfficeTransaction[]>([]);
  const [isLoadingTxs, setIsLoadingTxs] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync Favorite state with localStorage
  useEffect(() => {
    if (!building) return;
    try {
      const saved = localStorage.getItem('dview_office_favorites');
      if (saved) {
        const list: string[] = JSON.parse(saved);
        setIsFavorite(list.includes(building.name));
      }
    } catch (e) {
      console.error(e);
    }
  }, [building]);

  // Lock body & html scroll when modal is open
  useEffect(() => {
    if (!building) return;
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalBodyOverflow || '';
      document.documentElement.style.overflow = originalHtmlOverflow || '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [building, onClose]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2400);
  };

  const toggleFavorite = () => {
    if (!building) return;
    try {
      const saved = localStorage.getItem('dview_office_favorites');
      let list: string[] = saved ? JSON.parse(saved) : [];
      if (list.includes(building.name)) {
        list = list.filter(n => n !== building.name);
        setIsFavorite(false);
        showToast('관심 빌딩에서 삭제되었습니다.');
      } else {
        list.push(building.name);
        setIsFavorite(true);
        showToast('관심 빌딩에 추가되었습니다.');
      }
      localStorage.setItem('dview_office_favorites', JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = async () => {
    if (!building) return;
    const shareUrl = `${window.location.origin}/overview?tab=office#building=${encodeURIComponent(building.name)}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      showToast('빌딩 상세 리포트 링크가 클립보드에 복사되었습니다.');
    } else {
      showToast('링크 공유를 이용할 수 없습니다.');
    }
  };

  // Tax calculations for benefit simulator
  const taxSavings = useMemo(() => {
    const rawPrice = priceInput * 10000; // Won
    const standardTax = rawPrice * 0.046; // Standard 4.6%
    const discountedTax = rawPrice * 0.023; // 50% discount (2.3%)
    const savedAmount = standardTax - discountedTax;
    return {
      standardTax,
      discountedTax,
      savedAmount
    };
  }, [priceInput]);

  useEffect(() => {
    if (!building) return;
    let isMounted = true;
    setIsLoadingTxs(true);

    fetch('/api/technovalley/transactions?lawdCd=41591&dealYmd=all')
      .then(res => res.ok ? res.json() : [])
      .then((data: OfficeTransaction[]) => {
        if (!isMounted || !Array.isArray(data)) return;
        const norm = (s: string) => s.replace(/동탄|\s+/g, '').toLowerCase();
        const targetKey = norm(building.name);
        
        const matched = data.filter(tx => {
          const bKey = norm(tx.buildingName || '');
          if (!bKey) return false;
          return bKey.includes(targetKey) || targetKey.includes(bKey);
        });

        if (matched.length > 0) {
          setApiTxs(matched);
        }
      })
      .catch(err => {
        console.error('Failed to fetch dynamic office transactions:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingTxs(false);
      });

    return () => { isMounted = false; };
  }, [building]);

  const allMergedTxs = useMemo(() => {
    const staticTxs = building?.recentTransactions || [];
    const merged = [...apiTxs];
    
    staticTxs.forEach(st => {
      const exists = merged.some(mt => mt.date === st.date && mt.price === st.price && mt.floor === st.floor);
      if (!exists) merged.push(st);
    });

    return merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [building, apiTxs]);

  if (!mounted || !building) return null;

  const filteredTxs = allMergedTxs.filter(tx => {
    if (txFilter === 'sale') return tx.type === '매매';
    if (txFilter === 'rent') return tx.type === '임대';
    return true;
  });

  const modalContent = (
    <div 
      className="fixed inset-0 z-[12000] flex items-center justify-center p-0 md:p-5 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overscroll-contain"
      onWheel={(e) => e.stopPropagation()}
    >
      
      {/* Toast Notification Floating Alert */}
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[13000] bg-zinc-900/95 dark:bg-white/95 text-white dark:text-zinc-900 px-5 py-2.5 rounded-full text-xs font-black shadow-xl border border-white/10 dark:border-black/10 flex items-center gap-2 animate-in slide-in-from-top duration-300">
          <Sparkles size={14} className="text-[#ea6100]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Wide Modal Dialog Box (Matched with ApartmentModal max-w-[1275px]) */}
      <div 
        className="bg-surface/95 dark:bg-zinc-900/95 backdrop-blur-2xl w-full max-w-[1275px] h-[100dvh] md:h-[90vh] md:max-h-[95vh] rounded-none md:rounded-[24px] shadow-2xl border border-border/40 dark:border-white/10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative select-none"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Navigation & Actions */}
        <div className="p-5 sm:p-7 pb-4 border-b border-border/40 dark:border-white/10 shrink-0 bg-surface/50 dark:bg-zinc-900/50">
          <div className="flex items-start justify-between gap-4">
            
            {/* Building Identity Title */}
            <div className="flex items-start gap-4 min-w-0">
              <div className="p-4 bg-gradient-to-br from-[#ea6100]/20 to-[#c44d00]/10 text-[#ea6100] rounded-2xl shrink-0 border border-[#ea6100]/20 shadow-md">
                <Building2 size={30} />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs font-black px-3 py-1 rounded-lg bg-[#ea6100]/10 text-[#ea6100] dark:bg-[#ea6100]/20 border border-[#ea6100]/20">
                    종합 {building.score}점
                  </span>
                  <span className="text-xs font-bold text-secondary/70 dark:text-zinc-400">
                    {building.dong}
                  </span>
                  {building.driveIn ? (
                    <span className="text-xs font-black px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      드라이브인 가능 🚛
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-3 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      섹션 오피스 특화 🏢
                    </span>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-primary/95 dark:text-zinc-100 tracking-tight leading-snug mt-1 truncate">
                  {building.name}
                </h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap text-xs sm:text-sm font-semibold text-secondary/70 dark:text-zinc-400">
                  <span>{building.type}</span>
                  <span className="text-border dark:text-zinc-700">•</span>
                  <span className="flex items-center gap-1 font-bold text-primary/90 dark:text-zinc-200">
                    <MapPin size={14} className="text-[#ea6100] shrink-0" />
                    <span>{building.address || `경기도 화성시 ${building.dong}`}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Control Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={toggleFavorite}
                title="관심 빌딩 저장"
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                  isFavorite 
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 shadow-sm' 
                    : 'bg-body/40 dark:bg-zinc-800/40 border-border/40 dark:border-white/10 text-secondary/70 dark:text-zinc-400 hover:text-rose-500'
                }`}
              >
                <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
              </button>

              <button
                onClick={handleShare}
                title="리포트 공유하기"
                className="p-3 rounded-2xl bg-body/40 dark:bg-zinc-800/40 border border-border/40 dark:border-white/10 text-secondary/70 dark:text-zinc-400 hover:text-primary transition-all cursor-pointer"
              >
                <Share2 size={20} />
              </button>

              <button
                onClick={onClose}
                title="닫기"
                className="p-3 rounded-2xl bg-body/40 dark:bg-zinc-800/40 border border-border/40 dark:border-white/10 text-secondary/70 dark:text-zinc-400 hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer ml-1"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Tab Selection Bar (4 Tabs) */}
          <div className="flex gap-2 mt-5 overflow-x-auto no-scrollbar border-b border-border/20 dark:border-white/5 pb-1">
            {[
              { id: 'overview', label: '개요 & 제원 분석', icon: Building },
              { id: 'transactions', label: '국토부 매매 실거래가', icon: TrendingUp },
              { id: 'benefits', label: '입주혜택 & 절세 계산기', icon: Calculator },
              { id: 'coleasing', label: '소형 오피스 공동임차 핏', icon: Users }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                    isActive 
                      ? 'bg-[#ea6100] text-white shadow-lg shadow-[#ea6100]/25 scale-[1.01]' 
                      : 'text-secondary/70 dark:text-zinc-400 hover:bg-body/60 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Tab Content Area (Wide Layout with Overscroll Lock) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 scrollbar-thin overscroll-contain">
          
          {/* TAB 1: OVERVIEW & SPECS */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Score Highlight Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-[#ea6100]/15 via-[#ea6100]/5 to-transparent border border-[#ea6100]/25 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#ea6100] text-white rounded-2xl shadow-md">
                    <BadgeCheck size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-primary/95 dark:text-zinc-100">D-VIEW 밸류에이션 종합 스코어</h4>
                    <p className="text-xs text-secondary/70 dark:text-zinc-400 mt-0.5">
                      입지, 단지 규모, 주요 시공사 브랜드 파워, 드라이브인 물류 동선 및 예상 수익률 종합 평가
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black text-[#ea6100]">{building.score}점</span>
                  <span className="block text-xs font-bold text-secondary/60 dark:text-zinc-400">상위 랜드마크</span>
                </div>
              </div>

              {/* 4 Major Building Specs Grid (Wide 4 columns) */}
              <div>
                <h4 className="text-xs sm:text-sm font-black text-secondary/90 dark:text-zinc-300 tracking-tight leading-normal mb-3 flex items-center gap-1.5">
                  <Maximize2 size={16} className="text-[#ea6100]" />
                  빌딩 핵심 제원
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-body/40 dark:bg-zinc-800/40 border border-border/40 dark:border-white/10 rounded-2xl flex items-center gap-3.5">
                    <div className="p-2.5 bg-[#ea6100]/10 text-[#ea6100] rounded-xl shrink-0"><Maximize2 size={18} /></div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] text-secondary/60 dark:text-zinc-400 font-bold">연면적 (GFA)</span>
                      <span className="text-xs sm:text-sm text-primary/95 dark:text-zinc-100 font-black mt-0.5 truncate">{building.specs.gfa}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-body/40 dark:bg-zinc-800/40 border border-border/40 dark:border-white/10 rounded-2xl flex items-center gap-3.5">
                    <div className="p-2.5 bg-[#ea6100]/10 text-[#ea6100] rounded-xl shrink-0"><Layers size={18} /></div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] text-secondary/60 dark:text-zinc-400 font-bold">건물 규모</span>
                      <span className="text-xs sm:text-sm text-primary/95 dark:text-zinc-100 font-black mt-0.5 truncate">{building.specs.scale}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-body/40 dark:bg-zinc-800/40 border border-border/40 dark:border-white/10 rounded-2xl flex items-center gap-3.5">
                    <div className="p-2.5 bg-[#ea6100]/10 text-[#ea6100] rounded-xl shrink-0"><Car size={18} /></div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] text-secondary/60 dark:text-zinc-400 font-bold">주차 시설</span>
                      <span className="text-xs sm:text-sm text-primary/95 dark:text-zinc-100 font-black mt-0.5 truncate">{building.specs.parking}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-body/40 dark:bg-zinc-800/40 border border-border/40 dark:border-white/10 rounded-2xl flex items-center gap-3.5">
                    <div className="p-2.5 bg-[#ea6100]/10 text-[#ea6100] rounded-xl shrink-0"><Calendar size={18} /></div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-secondary/60 dark:text-zinc-400 font-bold">준공 연월</span>
                      <span className="text-xs sm:text-sm text-primary/95 dark:text-zinc-100 font-black mt-0.5 truncate">{building.specs.completion}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wide 2-Column Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Column (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Building Description */}
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-secondary/90 dark:text-zinc-300 tracking-tight leading-normal mb-2.5">
                      단지 개요 및 특징
                    </h4>
                    <p className="text-xs sm:text-sm leading-relaxed text-secondary/90 dark:text-zinc-300 font-medium bg-body/30 dark:bg-zinc-850/30 p-5 rounded-2xl border border-border/30 dark:border-white/5">
                      {building.desc}
                    </p>
                  </div>

                  {/* Features Tags */}
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-secondary/90 dark:text-zinc-300 tracking-tight leading-normal mb-2.5">
                      핵심 특화 요소
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {building.features.map(feat => (
                        <span 
                          key={feat} 
                          className="text-xs font-extrabold px-4 py-2 bg-body/50 dark:bg-zinc-800/50 rounded-xl border border-border/30 dark:border-white/10 text-primary dark:text-zinc-200"
                        >
                          ✓ {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column (5 cols) */}
                <div className="lg:col-span-5 space-y-5">
                  {/* Brand & Location Card */}
                  <div className="p-5 bg-body/40 dark:bg-zinc-800/40 border border-border/40 dark:border-white/10 rounded-2xl space-y-3">
                    <h4 className="text-xs font-black text-secondary/90 dark:text-zinc-300 flex items-center gap-2">
                      <MapPin size={16} className="text-[#ea6100]" />
                      입지 및 입주사 분석
                    </h4>
                    <div className="space-y-2 text-xs text-secondary/80 dark:text-zinc-300">
                      <div className="flex justify-between items-center py-1 border-b border-border/20 dark:border-white/5">
                        <span className="font-bold">행정구역:</span>
                        <span className="font-black text-primary dark:text-white">{building.dong}</span>
                      </div>
                      <div className="flex justify-between items-start py-1 border-b border-border/20 dark:border-white/5 gap-3">
                        <span className="font-bold shrink-0">소재지 주소:</span>
                        <span className="font-black text-primary dark:text-white text-right flex items-center justify-end gap-1">
                          <MapPin size={12} className="text-[#ea6100] shrink-0" />
                          <span>{building.address || `경기도 화성시 ${building.dong}`}</span>
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/20 dark:border-white/5">
                        <span className="font-bold">총 공급 호수:</span>
                        <span className="font-black text-primary dark:text-white">{building.totalUnits.toLocaleString()} 호실</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="font-bold">주요 특징:</span>
                        <span className="font-black text-[#ea6100]">{building.driveIn ? '물류/하역 특화' : '오피스형 특화'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Transit Box */}
                  <div className="p-4 bg-blue-500/5 dark:bg-blue-500/10 rounded-2xl border border-blue-500/20 flex items-center gap-3">
                    <Info size={18} className="text-blue-500 shrink-0" />
                    <div className="text-xs">
                      <span className="font-extrabold text-blue-600 dark:text-blue-400">교통 입지 안내: </span>
                      <span className="text-secondary/80 dark:text-zinc-300 font-medium">
                        {building.stationDistance === 'very-close' 
                          ? '동탄역 도보 10분 이내 초역세권 단지입니다.' 
                          : '동탄역 및 경부고속도로 기흥동탄IC 접근성이 우수한 비즈니스 입지입니다.'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: TRANSACTIONS & RENT */}
          {activeTab === 'transactions' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Rent & Vacancy KPI Cards (3 columns wide) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 bg-body/40 dark:bg-zinc-800/40 border border-border/40 dark:border-white/10 rounded-2xl">
                  <span className="text-xs font-bold text-secondary/60 dark:text-zinc-400 block">평당 예상 임대료</span>
                  <span className="text-xl font-black text-[#ea6100] mt-1 block">{building.rentPerPy}</span>
                  <span className="text-[11px] text-secondary/50 dark:text-zinc-500 mt-0.5 block">전용면적 기준 월세 추정</span>
                </div>

                <div className="p-5 bg-body/40 dark:bg-zinc-800/40 border border-border/40 dark:border-white/10 rounded-2xl">
                  <span className="text-xs font-bold text-secondary/60 dark:text-zinc-400 block">현재 평균 공실률</span>
                  <span className="text-xl font-black text-primary/95 dark:text-zinc-100 mt-1 block">{building.vacancyRate}%</span>
                  <span className="text-[11px] text-secondary/50 dark:text-zinc-500 mt-0.5 block">동탄 테크노밸리 평균 대비 안정권</span>
                </div>

                <div className="p-5 bg-body/40 dark:bg-zinc-800/40 border border-border/40 dark:border-white/10 rounded-2xl">
                  <span className="text-xs font-bold text-secondary/60 dark:text-zinc-400 block">추천 사무실 면적</span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">15평 ~ 35평</span>
                  <span className="text-[11px] text-secondary/50 dark:text-zinc-500 mt-0.5 block">섹션 오피스 분할 최적</span>
                </div>
              </div>

              {/* Transactions Table Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs sm:text-sm font-black text-secondary/90 dark:text-zinc-300 tracking-tight leading-normal flex items-center gap-2">
                    <span>국토교통부 매매 실거래가 내역</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      100% 검증 공공데이터
                    </span>
                  </h4>

                  {/* Filter Buttons */}
                  <div className="flex gap-1 bg-body/50 dark:bg-zinc-800/50 p-1.5 rounded-xl border border-border/30 dark:border-white/5">
                    {[
                      { id: 'all', label: '전체' },
                      { id: 'sale', label: '매매' }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setTxFilter(f.id as any)}
                        className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                          txFilter === f.id ? 'bg-white dark:bg-zinc-700 text-primary dark:text-white shadow-sm' : 'text-secondary/70 dark:text-zinc-400'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {isLoadingTxs ? (
                  <div className="p-10 text-center border border-dashed border-border/50 dark:border-white/10 rounded-2xl bg-body/20 text-secondary/60 dark:text-zinc-400 text-xs flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-[#ea6100] border-t-transparent rounded-full animate-spin"></span>
                    <span>국토교통부 매매 실거래가 데이터를 실시간 조회 중입니다...</span>
                  </div>
                ) : filteredTxs.length === 0 ? (
                  <div className="p-10 text-center border border-dashed border-border/50 dark:border-white/10 rounded-2xl bg-body/20 text-secondary/60 dark:text-zinc-400 text-xs space-y-1">
                    <p className="font-extrabold text-secondary/80 dark:text-zinc-300">국토교통부에 신고 등록된 매매 실거래 내역이 없습니다.</p>
                    <p className="text-[11px] text-secondary/50 dark:text-zinc-500">
                      * 상업·업무용 부동산은 법적으로 매매 거래 신고건만 공개되며, 임대차 거래는 공공 신고 대상이 아닙니다.
                    </p>
                  </div>
                ) : (
                  <div className="border border-border/40 dark:border-white/10 rounded-2xl overflow-hidden divide-y divide-border/40 dark:divide-white/10 bg-body/20">
                    <div className="grid grid-cols-12 px-5 py-3 text-[11px] font-bold text-secondary/60 dark:text-zinc-400 bg-body/40 dark:bg-zinc-800/40">
                      <div className="col-span-3">거래 유형 / 날짜</div>
                      <div className="col-span-4">실평수 (전용면적)</div>
                      <div className="col-span-2 text-center">층수</div>
                      <div className="col-span-3 text-right">거래금액 / 보증금·월세</div>
                    </div>
                    {filteredTxs.map((tx, idx) => (
                      <div key={idx} className="grid grid-cols-12 items-center px-5 py-4 text-xs font-bold hover:bg-body/40 dark:hover:bg-zinc-800/40 transition-all">
                        <div className="col-span-3 flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md ${
                            tx.type === '매매' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          }`}>
                            {tx.type}
                          </span>
                          <span className="text-secondary/60 dark:text-zinc-400 text-[11px]">{tx.date}</span>
                        </div>
                        <div className="col-span-4 text-primary/90 dark:text-zinc-200 font-extrabold">
                          {tx.sizeSqM}㎡ (약 {Math.round(tx.sizeSqM * 0.3025)}평)
                        </div>
                        <div className="col-span-2 text-center text-secondary/70 dark:text-zinc-400">
                          {tx.floor}층
                        </div>
                        <div className="col-span-3 text-right text-primary/95 dark:text-zinc-100 font-black text-sm">
                          {tx.price}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: TAX BENEFITS & CALCULATOR (2 Columns Wide) */}
          {activeTab === 'benefits' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Side: 4 Tax Benefits Cards (col-span-5) */}
                <div className="lg:col-span-5 space-y-3.5">
                  <h4 className="text-xs sm:text-sm font-black text-secondary/90 dark:text-zinc-300 mb-1">
                    동탄 지산 4대 핵심 법율 혜택
                  </h4>

                  <div className="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs sm:text-sm">
                      <ShieldCheck size={18} />
                      <span>취득세 35% ~ 50% 감면</span>
                    </div>
                    <p className="text-xs text-secondary/80 dark:text-zinc-300 mt-1.5 leading-relaxed font-medium">
                      지식산업센터 최초 분양 및 실입주 기업 대상 취득세 감면 (지방세특례제한법)
                    </p>
                  </div>

                  <div className="p-4 bg-blue-500/5 dark:bg-blue-500/10 rounded-2xl border border-blue-500/20">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-xs sm:text-sm">
                      <Coins size={18} />
                      <span>재산세 35% 감면</span>
                    </div>
                    <p className="text-xs text-secondary/80 dark:text-zinc-300 mt-1.5 leading-relaxed font-medium">
                      입주 후 5년 간 보유 재산세 35% 감면 혜택 제공
                    </p>
                  </div>

                  <div className="p-4 bg-purple-500/5 dark:bg-purple-500/10 rounded-2xl border border-purple-500/20">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-black text-xs sm:text-sm">
                      <Sparkles size={18} />
                      <span>수도권 이전 시 법인세 100% 감면</span>
                    </div>
                    <p className="text-xs text-secondary/80 dark:text-zinc-300 mt-1.5 leading-relaxed font-medium">
                      과밀억제권역(서울/성남)에서 동탄 이전 시 5년간 법인세 100% 감면 (이후 2년 50%)
                    </p>
                  </div>

                  <div className="p-4 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl border border-amber-500/20">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-xs sm:text-sm">
                      <TrendingUp size={18} />
                      <span>정책자금 70% ~ 80% 융자</span>
                    </div>
                    <p className="text-xs text-secondary/80 dark:text-zinc-300 mt-1.5 leading-relaxed font-medium">
                      경기도 중소기업육성자금 및 시중은행 저리 장기 융자 연결
                    </p>
                  </div>
                </div>

                {/* Right Side: Real-time Tax Calculator (col-span-7) */}
                <div className="lg:col-span-7 p-6 bg-body/40 dark:bg-zinc-800/40 border border-border/40 dark:border-white/10 rounded-2xl space-y-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-primary/95 dark:text-zinc-100 flex items-center gap-2">
                      <Calculator size={20} className="text-[#ea6100]" />
                      취득세 절감액 즉시 시뮬레이터
                    </h4>
                    <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#ea6100]/10 text-[#ea6100]">
                      실시간 계산기
                    </span>
                  </div>

                  {/* Input Slider & Box */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="text-secondary/70 dark:text-zinc-400 font-bold">예상 취득/분양가 금액 설정:</span>
                      <span className="font-black text-[#ea6100] text-base sm:text-lg">{(priceInput / 10000).toFixed(1)}억 원 ({(priceInput * 10000).toLocaleString()} 원)</span>
                    </div>
                    <input
                      type="range"
                      min={10000}
                      max={200000}
                      step={2000}
                      value={priceInput}
                      onChange={(e) => setPriceInput(Number(e.target.value))}
                      className="w-full accent-[#ea6100] cursor-pointer h-2 bg-body/80 rounded-lg"
                    />
                  </div>

                  {/* Tax Comparison Results Grid */}
                  <div className="grid grid-cols-3 gap-3 pt-3 text-center border-t border-border/30 dark:border-white/10">
                    <div className="p-4 bg-body/60 dark:bg-zinc-850/60 rounded-2xl">
                      <span className="text-xs text-secondary/60 dark:text-zinc-400 block font-bold">일반 취득세 (4.6%)</span>
                      <span className="text-sm sm:text-base font-extrabold text-secondary/80 dark:text-zinc-300 mt-1 block">
                        {(taxSavings.standardTax / 10000).toFixed(0)}만 원
                      </span>
                    </div>

                    <div className="p-4 bg-body/60 dark:bg-zinc-850/60 rounded-2xl">
                      <span className="text-xs text-secondary/60 dark:text-zinc-400 block font-bold">혜택 적용 (2.3%)</span>
                      <span className="text-sm sm:text-base font-extrabold text-blue-600 dark:text-blue-400 mt-1 block">
                        {(taxSavings.discountedTax / 10000).toFixed(0)}만 원
                      </span>
                    </div>

                    <div className="p-4 bg-[#ea6100]/10 border border-[#ea6100]/30 rounded-2xl">
                      <span className="text-xs text-[#ea6100] block font-black">절감되는 세금</span>
                      <span className="text-sm sm:text-base font-black text-[#ea6100] mt-1 block">
                        -{(taxSavings.savedAmount / 10000).toFixed(0)}만 원 🎉
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-[#ea6100]/5 rounded-xl border border-[#ea6100]/20 flex items-center justify-between">
                    <span className="text-xs font-bold text-secondary dark:text-zinc-300">
                      💡 법인세 100% 감면 대상 기업인 경우 5년간 수억 원의 절세 효과가 추가로 발생합니다.
                    </span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: CO-LEASING & STARTUP FIT */}
          {activeTab === 'coleasing' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Left: Co-leasing Intro */}
                <div className="p-6 bg-gradient-to-br from-brand-orange-light/30 via-body/40 to-body/20 dark:from-[#ea6100]/10 dark:to-zinc-800/40 rounded-2xl border border-[#ea6100]/20 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-[#ea6100] text-white rounded-2xl">
                        <Users size={22} />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-black text-primary/95 dark:text-zinc-100">소형 오피스 공동임차 매칭 서비스</h4>
                        <p className="text-xs text-secondary/70 dark:text-zinc-400 mt-0.5">
                          10평~25평 섹션 오피스 분할 공동 사용으로 임대료 50% 절감
                        </p>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm leading-relaxed text-secondary/90 dark:text-zinc-300 font-medium">
                      {building.name}의 오피스 호실을 분할하여 공용 라운지, 회의실, 택배 하역장 등의 부대 시설은 공유하고, 독자적인 전용 업무 공간을 확보하는 소형 스타트업/소호 오피스 메이트 매칭입니다.
                    </p>
                  </div>

                  <a
                    href="tel:031-000-0000"
                    onClick={() => showToast('공동임차 신청 상담 센터로 연결됩니다.')}
                    className="w-full py-3.5 bg-[#ea6100] hover:bg-[#c44d00] text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
                  >
                    <span>공동임차 오피스 메이트 매칭 신청하기</span>
                    <ArrowRight size={16} />
                  </a>
                </div>

                {/* Right: Recommended Business Types */}
                <div className="space-y-3">
                  <h4 className="text-xs sm:text-sm font-black text-secondary/90 dark:text-zinc-300 tracking-tight leading-normal">
                    추천 입주 업종 (D-VIEW 빅데이터 매칭)
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {[
                      'IT / 소프트웨어 개발', 
                      '바이오 & 헬스케어', 
                      '연구개발 (R&D 센터)', 
                      '엔지니어링 / 종합설계', 
                      '경영컨설팅 / 전문직', 
                      '소형 E-커머스 물류'
                    ].map((item, idx) => (
                      <div key={idx} className="p-4 bg-body/40 dark:bg-zinc-800/40 border border-border/30 dark:border-white/10 rounded-xl flex items-center gap-2.5">
                        <Sparkles size={16} className="text-[#ea6100] shrink-0" />
                        <span className="font-black text-primary/90 dark:text-zinc-200">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Footer Action Bar */}
        <div className="p-5 sm:p-6 border-t border-border/40 dark:border-white/10 bg-surface/50 dark:bg-zinc-900/50 shrink-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-6 py-3.5 bg-body/60 hover:bg-body dark:bg-zinc-800 dark:hover:bg-zinc-750 text-secondary dark:text-zinc-300 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer"
            >
              닫기
            </button>

            <button
              onClick={toggleFavorite}
              className={`px-4 py-3.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                isFavorite 
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' 
                  : 'bg-body/40 dark:bg-zinc-800/40 border-border/40 dark:border-white/10 text-secondary/70 dark:text-zinc-400'
              }`}
            >
              <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
              <span className="hidden sm:inline">{isFavorite ? '보관됨' : '관심 빌딩'}</span>
            </button>
          </div>

          <a
            href="tel:031-000-0000"
            onClick={() => showToast('공실 매칭 전담 센터로 연결됩니다.')}
            className="py-3.5 px-6 sm:px-8 bg-[#ea6100] hover:bg-[#c44d00] text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-[#ea6100]/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
          >
            <PhoneCall size={18} />
            <span>맞춤 공실 / 임대 매칭 상담 신청</span>
          </a>
        </div>

      </div>
    </div>
  );

  return createPortal(
    modalContent,
    document.getElementById('modal-root') || document.body
  );
}
