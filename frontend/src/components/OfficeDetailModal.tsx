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
  PhoneCall
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

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!building) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
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

  if (!mounted || !building) return null;

  const filteredTxs = building.recentTransactions.filter(tx => {
    if (txFilter === 'sale') return tx.type === '매매';
    if (txFilter === 'rent') return tx.type === '임대';
    return true;
  });

  const modalContent = (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center p-3 sm:p-5 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Toast Notification Floating Alert */}
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[13000] bg-zinc-900/95 dark:bg-white/95 text-white dark:text-zinc-900 px-5 py-2.5 rounded-full text-xs font-black shadow-xl border border-white/10 dark:border-black/10 flex items-center gap-2 animate-in slide-in-from-top duration-300">
          <Sparkles size={14} className="text-[#ea6100]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Modal Dialog Box */}
      <div 
        className="bg-surface/95 dark:bg-zinc-900/95 backdrop-blur-2xl w-full max-w-[680px] h-[88vh] max-h-[760px] rounded-[24px] shadow-2xl border border-border/40 dark:border-white/10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative select-none"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Navigation & Actions */}
        <div className="p-5 sm:p-6 pb-4 border-b border-border/40 dark:border-white/10 shrink-0 bg-surface/50 dark:bg-zinc-900/50">
          <div className="flex items-start justify-between gap-4">
            
            {/* Building Identity Title */}
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="p-3.5 bg-gradient-to-br from-[#ea6100]/20 to-[#c44d00]/10 text-[#ea6100] rounded-2xl shrink-0 border border-[#ea6100]/20 shadow-sm">
                <Building2 size={26} />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-md bg-[#ea6100]/10 text-[#ea6100] dark:bg-[#ea6100]/20 border border-[#ea6100]/20">
                    종합 {building.score}점
                  </span>
                  <span className="text-[11px] font-bold text-secondary/70 dark:text-zinc-400">
                    {building.dong}
                  </span>
                  {building.driveIn ? (
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      드라이브인 가능 🚛
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      섹션 오피스 특화 🏢
                    </span>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-black text-primary/95 dark:text-zinc-100 tracking-tight leading-snug mt-1 truncate">
                  {building.name}
                </h3>
                <span className="text-xs font-semibold text-secondary/70 dark:text-zinc-400 mt-0.5">
                  {building.type}
                </span>
              </div>
            </div>

            {/* Quick Control Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={toggleFavorite}
                title="관심 빌딩 저장"
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isFavorite 
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' 
                    : 'bg-body/40 dark:bg-zinc-800/40 border-border/40 dark:border-white/10 text-secondary/70 dark:text-zinc-400 hover:text-rose-500'
                }`}
              >
                <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
              </button>

              <button
                onClick={handleShare}
                title="리포트 공유하기"
                className="p-2.5 rounded-xl bg-body/40 dark:bg-zinc-800/40 border border-border/40 dark:border-white/10 text-secondary/70 dark:text-zinc-400 hover:text-primary transition-all cursor-pointer"
              >
                <Share2 size={18} />
              </button>

              <button
                onClick={onClose}
                title="닫기"
                className="p-2.5 rounded-xl bg-body/40 dark:bg-zinc-800/40 border border-border/40 dark:border-white/10 text-secondary/70 dark:text-zinc-400 hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer ml-1"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Tab Selection Bar (4 Tabs) */}
          <div className="flex gap-1 mt-4 overflow-x-auto no-scrollbar border-b border-border/20 dark:border-white/5 pb-1">
            {[
              { id: 'overview', label: '개요 & 제원', icon: Building },
              { id: 'transactions', label: '실거래 & 시세', icon: TrendingUp },
              { id: 'benefits', label: '입주혜택 & 절세', icon: Calculator },
              { id: 'coleasing', label: '소형 오피스 핏', icon: Users }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                    isActive 
                      ? 'bg-[#ea6100] text-white shadow-md shadow-[#ea6100]/20' 
                      : 'text-secondary/70 dark:text-zinc-400 hover:bg-body/60 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 scrollbar-thin">
          
          {/* TAB 1: OVERVIEW & SPECS */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Score Highlight Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#ea6100]/10 via-[#ea6100]/5 to-transparent border border-[#ea6100]/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#ea6100] text-white rounded-xl shadow-md">
                    <BadgeCheck size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-primary/95 dark:text-zinc-100">D-VIEW 평가 스코어</h4>
                    <p className="text-[11.5px] text-secondary/70 dark:text-zinc-400 mt-0.5">
                      입지, 단지규모, 브랜드, 물류하역 및 임대수익성 종합 평가
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-[#ea6100]">{building.score}점</span>
                  <span className="block text-[10px] font-bold text-secondary/60 dark:text-zinc-400">100점 만점</span>
                </div>
              </div>

              {/* Major Building Specs Grid */}
              <div>
                <h4 className="text-xs font-black text-secondary/90 dark:text-zinc-300 tracking-tight leading-normal mb-3 flex items-center gap-1.5">
                  <Maximize2 size={14} className="text-[#ea6100]" />
                  빌딩 주요 제원
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 bg-body/40 dark:bg-zinc-800/40 border border-border/40 dark:border-white/10 rounded-2xl flex items-center gap-3">
                    <div className="p-2 bg-[#ea6100]/10 text-[#ea6100] rounded-xl shrink-0"><Maximize2 size={16} /></div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-secondary/60 dark:text-zinc-400 font-bold">연면적 (GFA)</span>
                      <span className="text-[12px] text-primary/95 dark:text-zinc-100 font-black mt-0.5 truncate">{building.specs.gfa}</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-body/40 dark:bg-zinc-800/40 border border-border/40 dark:border-white/10 rounded-2xl flex items-center gap-3">
                    <div className="p-2 bg-[#ea6100]/10 text-[#ea6100] rounded-xl shrink-0"><Layers size={16} /></div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-secondary/60 dark:text-zinc-400 font-bold">건물 규모</span>
                      <span className="text-[12px] text-primary/95 dark:text-zinc-100 font-black mt-0.5 truncate">{building.specs.scale}</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-body/40 dark:bg-zinc-800/40 border border-border/40 dark:border-white/10 rounded-2xl flex items-center gap-3">
                    <div className="p-2 bg-[#ea6100]/10 text-[#ea6100] rounded-xl shrink-0"><Car size={16} /></div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-secondary/60 dark:text-zinc-400 font-bold">주차 시설</span>
                      <span className="text-[12px] text-primary/95 dark:text-zinc-100 font-black mt-0.5 truncate">{building.specs.parking}</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-body/40 dark:bg-zinc-800/40 border border-border/40 dark:border-white/10 rounded-2xl flex items-center gap-3">
                    <div className="p-2 bg-[#ea6100]/10 text-[#ea6100] rounded-xl shrink-0"><Calendar size={16} /></div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-secondary/60 dark:text-zinc-400 font-bold">준공 연월</span>
                      <span className="text-[12px] text-primary/95 dark:text-zinc-100 font-black mt-0.5 truncate">{building.specs.completion}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features Tags */}
              <div>
                <h4 className="text-xs font-black text-secondary/90 dark:text-zinc-300 tracking-tight leading-normal mb-2.5">
                  핵심 특화 요소
                </h4>
                <div className="flex flex-wrap gap-2">
                  {building.features.map(feat => (
                    <span 
                      key={feat} 
                      className="text-[11.5px] font-extrabold px-3.5 py-1.5 bg-body/50 dark:bg-zinc-800/50 rounded-xl border border-border/30 dark:border-white/10 text-primary dark:text-zinc-200"
                    >
                      ✓ {feat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Building Description */}
              <div>
                <h4 className="text-xs font-black text-secondary/90 dark:text-zinc-300 tracking-tight leading-normal mb-2">
                  상세 설명
                </h4>
                <p className="text-[13px] leading-relaxed text-secondary/90 dark:text-zinc-300 font-medium bg-body/30 dark:bg-zinc-850/30 p-4 rounded-2xl border border-border/30 dark:border-white/5">
                  {building.desc}
                </p>
              </div>

              {/* Station Proximity & Transit */}
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
          )}

          {/* TAB 2: TRANSACTIONS & RENT */}
          {activeTab === 'transactions' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Rent & Vacancy KPI Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-body/40 dark:bg-zinc-800/40 border border-border/40 dark:border-white/10 rounded-2xl">
                  <span className="text-[11px] font-bold text-secondary/60 dark:text-zinc-400 block">평당 예상 임대료</span>
                  <span className="text-lg font-black text-[#ea6100] mt-1 block">{building.rentPerPy}</span>
                  <span className="text-[10px] text-secondary/50 dark:text-zinc-500 mt-0.5 block">전용면적 기준 월세 추정</span>
                </div>

                <div className="p-4 bg-body/40 dark:bg-zinc-800/40 border border-border/40 dark:border-white/10 rounded-2xl">
                  <span className="text-[11px] font-bold text-secondary/60 dark:text-zinc-400 block">현재 평균 공실률</span>
                  <span className="text-lg font-black text-primary/95 dark:text-zinc-100 mt-1 block">{building.vacancyRate}%</span>
                  <span className="text-[10px] text-secondary/50 dark:text-zinc-500 mt-0.5 block">동탄 테크노밸리 평균 대비 안정적</span>
                </div>
              </div>

              {/* Transactions List Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black text-secondary/90 dark:text-zinc-300 tracking-tight leading-normal">
                    실거래 & 시세 거래 내역
                  </h4>

                  {/* Filter Buttons */}
                  <div className="flex gap-1 bg-body/50 dark:bg-zinc-800/50 p-1 rounded-xl border border-border/30 dark:border-white/5">
                    {[
                      { id: 'all', label: '전체' },
                      { id: 'sale', label: '매매' },
                      { id: 'rent', label: '임대' }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setTxFilter(f.id as any)}
                        className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer ${
                          txFilter === f.id ? 'bg-white dark:bg-zinc-700 text-primary dark:text-white shadow-sm' : 'text-secondary/70 dark:text-zinc-400'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredTxs.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-border/50 dark:border-white/10 rounded-2xl bg-body/20 text-secondary/60 dark:text-zinc-400 text-xs">
                    최근 3개월 간 등록된 거래 내역이 없습니다.
                  </div>
                ) : (
                  <div className="border border-border/40 dark:border-white/10 rounded-2xl overflow-hidden divide-y divide-border/40 dark:divide-white/10 bg-body/20">
                    {filteredTxs.map((tx, idx) => (
                      <div key={idx} className="flex items-center justify-between px-4 py-3.5 text-xs font-bold hover:bg-body/40 dark:hover:bg-zinc-800/40 transition-all">
                        <div className="flex items-center gap-2.5">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            tx.type === '매매' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          }`}>
                            {tx.type}
                          </span>
                          <span className="text-primary/90 dark:text-zinc-200">{tx.sizeSqM}㎡ (실평수)</span>
                          <span className="text-secondary/60 dark:text-zinc-400">{tx.floor}층</span>
                        </div>
                        <div className="text-right">
                          <div className="text-primary/95 dark:text-zinc-100 font-black">{tx.price}</div>
                          <div className="text-[10px] text-secondary/50 dark:text-zinc-500 font-normal">{tx.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: TAX BENEFITS & CALCULATOR */}
          {activeTab === 'benefits' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Key Benefits Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs">
                    <ShieldCheck size={16} />
                    <span>취득세 35%~50% 감면</span>
                  </div>
                  <p className="text-[11.5px] text-secondary/80 dark:text-zinc-300 mt-1.5 leading-relaxed font-medium">
                    최초 분양 및 실입주 시 취득세 감면 혜택 제공 (지방세특례제한법 적용)
                  </p>
                </div>

                <div className="p-4 bg-blue-500/5 dark:bg-blue-500/10 rounded-2xl border border-blue-500/20">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-xs">
                    <Coins size={16} />
                    <span>정책자금 70~80% 융자</span>
                  </div>
                  <p className="text-[11.5px] text-secondary/80 dark:text-zinc-300 mt-1.5 leading-relaxed font-medium">
                    중소기업육성자금 및 시중은행 우대금리 연계 지원
                  </p>
                </div>
              </div>

              {/* Real-time Tax Savings Simulator */}
              <div className="p-5 bg-body/40 dark:bg-zinc-800/40 border border-border/40 dark:border-white/10 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-primary/95 dark:text-zinc-100 flex items-center gap-1.5">
                    <Calculator size={16} className="text-[#ea6100]" />
                    취득세 절감액 즉시 계산기
                  </h4>
                  <span className="text-[11px] font-extrabold text-[#ea6100]">분양/취득 시</span>
                </div>

                {/* Input Slider & Box */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-secondary/70 dark:text-zinc-400 font-bold">예상 취득/매매가 설정:</span>
                    <span className="font-black text-[#ea6100] text-sm">{(priceInput / 10000).toFixed(1)}억 원 ({priceInput.toLocaleString()}만 원)</span>
                  </div>
                  <input
                    type="range"
                    min={10000}
                    max={150000}
                    step={2000}
                    value={priceInput}
                    onChange={(e) => setPriceInput(Number(e.target.value))}
                    className="w-full accent-[#ea6100] cursor-pointer"
                  />
                </div>

                {/* Tax Comparison Results */}
                <div className="grid grid-cols-3 gap-2 pt-2 text-center border-t border-border/30 dark:border-white/10">
                  <div className="p-2.5 bg-body/60 dark:bg-zinc-850/60 rounded-xl">
                    <span className="text-[10px] text-secondary/60 dark:text-zinc-400 block font-bold">일반 취득세 (4.6%)</span>
                    <span className="text-xs font-extrabold text-secondary/80 dark:text-zinc-300 mt-1 block">
                      {(taxSavings.standardTax / 10000).toFixed(0)}만 원
                    </span>
                  </div>

                  <div className="p-2.5 bg-body/60 dark:bg-zinc-850/60 rounded-xl">
                    <span className="text-[10px] text-secondary/60 dark:text-zinc-400 block font-bold">혜택 적용 (2.3%)</span>
                    <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 mt-1 block">
                      {(taxSavings.discountedTax / 10000).toFixed(0)}만 원
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#ea6100]/10 border border-[#ea6100]/30 rounded-xl">
                    <span className="text-[10px] text-[#ea6100] block font-black">절감 세금</span>
                    <span className="text-xs font-black text-[#ea6100] mt-1 block">
                      -{(taxSavings.savedAmount / 10000).toFixed(0)}만 원 🎉
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CO-LEASING & STARTUP FIT */}
          {activeTab === 'coleasing' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              <div className="p-5 bg-gradient-to-br from-brand-orange-light/30 via-body/40 to-body/20 dark:from-[#ea6100]/10 dark:to-zinc-800/40 rounded-2xl border border-[#ea6100]/20 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-[#ea6100] text-white rounded-xl">
                    <Users size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-primary/95 dark:text-zinc-100">소형 오피스 공동임차 매칭 서비스</h4>
                    <p className="text-[11px] text-secondary/70 dark:text-zinc-400 mt-0.5">
                      10평~25평 섹션 오피스 공동 분할 임대로 임대료 50% 절감
                    </p>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-secondary/90 dark:text-zinc-300 font-medium">
                  {building.name}의 섹션 오피스를 공유 공간과 조합하여 소자본 창업자 및 스타트업에 맞춤으로 매칭해 드립니다.
                </p>
              </div>

              {/* Recommended Business Types */}
              <div>
                <h4 className="text-xs font-black text-secondary/90 dark:text-zinc-300 tracking-tight leading-normal mb-2.5">
                  추천 입주 업종 (D-VIEW 데이터 매칭)
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {['IT / 소프트웨어 개발', '바이오 & 헬스케어', '연구개발 (R&D)', '엔지니어링 / 설계', '경영컨설팅 / 전문직', '소형 E-커머스 물류'].map((item, idx) => (
                    <div key={idx} className="p-3 bg-body/40 dark:bg-zinc-800/40 border border-border/30 dark:border-white/10 rounded-xl flex items-center gap-2">
                      <Sparkles size={14} className="text-[#ea6100] shrink-0" />
                      <span className="font-extrabold text-primary/90 dark:text-zinc-200">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Action Bar */}
        <div className="p-4 sm:p-5 border-t border-border/40 dark:border-white/10 bg-surface/50 dark:bg-zinc-900/50 shrink-0 flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-5 py-3.5 bg-body/60 hover:bg-body dark:bg-zinc-800 dark:hover:bg-zinc-750 text-secondary dark:text-zinc-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            닫기
          </button>

          <a
            href="tel:031-000-0000"
            onClick={() => showToast('공실 매칭 전담 센터로 연결됩니다.')}
            className="flex-1 py-3.5 bg-[#ea6100] hover:bg-[#c44d00] text-white font-black text-xs rounded-xl shadow-lg shadow-[#ea6100]/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
          >
            <PhoneCall size={16} />
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
