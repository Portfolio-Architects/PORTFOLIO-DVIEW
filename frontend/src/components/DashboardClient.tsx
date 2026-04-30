'use client';

import { ArrowUp, Building, MapPin, Map as MapIcon, Compass, MessageSquare, Heart, X, FileText,
  LayoutDashboard, UserCircle, Star, Link2, Trash2, LogOut, TrendingUp, ShieldAlert,
  Home, PenLine, Send, Edit3, Shield, ShieldCheck, Building2, Check, Pencil, ChevronDown, Eye, Search } from 'lucide-react';
import { logger } from '@/lib/services/logger';
import Image from 'next/image';
import Link from 'next/link';

import { useDashboardData, dashboardFacade, CommentData, FieldReportData, UserReview } from '@/lib/DashboardFacade';
import ApartmentCard from '@/components/ApartmentCard';
import DongFilterBar from '@/components/DongFilterBar';
import { TrendingTicker } from '@/components/ui/TrendingTicker';
import FloatingUserBar from '@/components/FloatingUserBar';
import MobileDock from '@/components/pwa/MobileDock';
import Footer from '@/components/Footer';
import dynamic from 'next/dynamic';
import PullToRefresh from '@/components/pwa/PullToRefresh';

// Heavy components — loaded on demand (saves ~200KB initial JS)
const FieldReportModal = dynamic(() => import('@/components/ApartmentModal').then(m => ({ default: m.FieldReportModal })), { ssr: false });
const WriteReviewModal = dynamic(() => import('@/components/WriteReviewModal'), { ssr: false });
const AdInquiryModal = dynamic(() => import('@/components/AdInquiryModal'), { ssr: false });
import { DONGS, getDongByName, getDongColor, getAllDongNames } from '@/lib/dongs';
import { ZONES } from '@/lib/zones';
import { buildInitialApartments, type DongApartment } from '@/lib/dong-apartments';

interface StaticApartment { name: string; dong: string; householdCount?: number; yearBuilt?: string; brand?: string; }
import { type AptTxSummary } from '@/lib/transaction-summary';
import { isSameApartment, normalizeAptName, findTxKey, getDisplayAptName, HARDCODED_MAPPING } from '@/lib/utils/apartmentMapping';
import locationScoresData from '@/lib/location-scores.json';
import * as PurchaseRepo from '@/lib/repositories/purchase.repository';
import { useState, useEffect, useMemo, useRef, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { getDisplayName } from '@/lib/types/user.types';
import { FixedSizeList } from 'react-window';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardMeta, type DashboardInitialDataLocal } from '@/hooks/useDashboardMeta';
import { useFavorites } from '@/hooks/useFavorites';
import { useApartmentDetails } from '@/hooks/useApartmentDetails';
import { useComments } from '@/hooks/useComments';
import { usePWA } from '@/components/pwa/PWAProvider';

const DebouncedSearchInput = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  const [localValue, setLocalValue] = useState(value);
  
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      onChange(localValue);
    }, 250); // 250ms debounce
    return () => clearTimeout(handler);
  }, [localValue, onChange]);

  return (
    <div className="relative flex-1 max-w-[180px]">
      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
        <Search size={14} className="text-tertiary" />
      </div>
      <input
        type="text"
        placeholder="아파트 검색"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="w-full bg-[#f2f4f6] text-[13px] text-primary placeholder:text-tertiary rounded-[8px] pl-8 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-toss-blue transition-all"
      />
      {localValue && (
        <button 
          onClick={() => { setLocalValue(''); onChange(''); }}
          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-tertiary hover:text-secondary"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

export default function DashboardClient({ initialDashboardData, preselectedAptName }: { initialDashboardData?: DashboardInitialDataLocal, preselectedAptName?: string }) {
  const router = useRouter();
  const { kpis, newsFeed, fieldReports, userReviews, dongtanApartments, adBanner } = useDashboardData();
  
  // Moduled Hooks Architecture
  const { user, userProfile, anonProfile, purchasedReportIds, handleLogin, handleLogout, refreshPurchasedReports } = useAuth();
  const { sheetApartments, typeMap, nameMapping, publicRentalSet } = useDashboardMeta(initialDashboardData);
  const { userFavorites, favoriteCounts, handleToggleFavorite } = useFavorites(user, initialDashboardData?.favoriteCounts);
  
  const [selectedReport, setSelectedReport] = useState<FieldReportData | null>(null);
  
  const { txSummaryData, fullReportData, modalTransactions, isLoadingDetail, isTxLoading, resolvedReport, aptTxSummary } = useApartmentDetails(
    selectedReport, sheetApartments, nameMapping, user
  );
  
  const { commentsData, commentInput, setCommentInput, handleSubmitComment } = useComments(
    selectedReport, fullReportData, user, handleLogin
  );

  const { triggerCustomA2HSModal } = usePWA();

  const [activeTab, setActiveTab] = useState<'imjang' | 'lounge'>('imjang');
  const [isPending, startTransition] = useTransition();

  const fieldReportsMap = useMemo(() => {
    const map = new Map<string, any>();
    if (!fieldReports || !sheetApartments) return map;
    const allApts = Object.values(sheetApartments).flat();
    allApts.forEach(apt => {
      const report = fieldReports.find(r => isSameApartment(r.apartmentName, apt.name, nameMapping));
      if (report) map.set(apt.name, report);
    });
    return map;
  }, [fieldReports, sheetApartments, nameMapping]);
  const [mounted, setMounted] = useState(false);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      if (window.location.hash === '#imjang') {
        setActiveTab('imjang');
      }

      const handleHashChange = () => {
        startTransition(() => {
          if (window.location.hash === '#lounge') setActiveTab('lounge');
          else if (window.location.hash === '#imjang' || window.location.hash === '') setActiveTab('imjang');
        });
      };
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }
  }, []);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedDong, setSelectedDong] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

  // We are using full-bleed layout, so window scroll won't happen. 
  // We can track internal scrolling if needed, but for now we keep the static header.
  useEffect(() => {
    let ticking = false;
    const scrollContainer = document.getElementById('apartment-list-scroll');
    const handleScroll = (e: Event) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled((e.target as HTMLElement).scrollTop > 80);
          ticking = false;
        });
        ticking = true;
      }
    };
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [mounted, activeTab]);

  const [listSort, setListSort] = useState<'views' | 'likes' | 'name' | 'price-rank' | 'valuation' | 'total-price'>('total-price');
  const [listHeight, setListHeight] = useState(600);
  const [isDesktop, setIsDesktop] = useState(true);
  const leftPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && leftPanelRef.current) {
      const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          // Adjust for header elements inside the left panel (Trending + FilterBar = ~110px)
          const availableHeight = entry.contentRect.height;
          setListHeight(Math.max(400, availableHeight - 110));
          setIsDesktop(window.innerWidth >= 768);
        }
      });
      resizeObserver.observe(leftPanelRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [mounted, activeTab]);

  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const userHasSelected = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return;
    if (userHasSelected.current) return;
    if (selectedReport) return;
    const allApts = Object.values(sheetApartments).flat();
    if (allApts.length === 0) return;
    
    // If preselectedAptName is passed from the SEO page wrapper
    if (preselectedAptName) {
      userHasSelected.current = true;
      const targetApt = allApts.find(a => isSameApartment(a.name, preselectedAptName, nameMapping));
      if (targetApt) {
        const report = fieldReportsMap.get(targetApt.name);
        if (report) {
          setSelectedReport(report);
        } else {
          setSelectedReport({
            id: `stub-${normalizeAptName(targetApt.name)}`,
            apartmentName: targetApt.name,
            dong: targetApt.dong,
            author: '',
            likes: 0,
            commentCount: 0,
            createdAt: null,
            metrics: { ...targetApt, ...((locationScoresData as Record<string, any>)[targetApt.name] || {}) } as unknown as import('@/lib/types/scoutingReport').ObjectiveMetrics,
          });
        }
      }
      return; 
    }

    // Auto-select is disabled so that the Ad slot placeholder remains visible on desktop until a user actively clicks an apartment.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldReports, preselectedAptName]);

  // Handle Browser Back Button for soft-navigation URL routing
  useEffect(() => {
    const handlePopState = () => {
      // If we go back to the root, clear selection (soft close)
      if (window.location.pathname === '/' || window.location.pathname === '') {
        setSelectedReport(null);
        userHasSelected.current = true;
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setSelectedReport]);

  const dongAptCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.entries(sheetApartments).forEach(([dong, apts]) => { 
      counts[dong] = apts.filter(a => !publicRentalSet.has(a.name)).length; 
    });
    return counts;
  }, [sheetApartments, publicRentalSet]);

  const dongReportCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    getAllDongNames().forEach(d => { counts[d] = 0; });
    fieldReports?.forEach(report => {
      if (report.dong) counts[report.dong] = (counts[report.dong] || 0) + 1;
    });
    return counts;
  }, [fieldReports]);

  const filteredReports = useMemo(() => {
    if (!fieldReports) return [];
    if (selectedDong) {
      return fieldReports.filter(r => r.dong === selectedDong);
    }
    return [...fieldReports];
  }, [fieldReports, selectedDong]);

  const [areaUnit, setAreaUnit] = useState<'m2' | 'pyeong'>('m2');

  const rawApts = selectedDong 
    ? (sheetApartments[selectedDong] || [])
    : Object.values(sheetApartments).flat();
    
  const allApts = useMemo(() => rawApts.filter(a => !publicRentalSet.has(a.name)), [rawApts, publicRentalSet]);

  const enrichedApts = useMemo(() => {
    return allApts.map(apt => {
      const overrideKey = HARDCODED_MAPPING[normalizeAptName(apt.name)];
      const rawKey = overrideKey || apt.txKey || apt.name;
      const txKey = findTxKey(rawKey, txSummaryData, nameMapping) || rawKey;
      const sum = txKey ? txSummaryData[txKey] : undefined;
      
      const pyeongPrice = sum?.avg3MPerPyeong || sum?.avg1MPerPyeong || 0;
      
      const sales = sum ? (sum.avg3MPrice || sum.avg1MPrice || sum.latestPrice || 0) : 0;
      const jeonse = sum ? (sum.avg3MRentDeposit || sum.avg1MRentDeposit || sum.latestRentDeposit || 0) : 0;
      const ratio = sales > 0 && jeonse > 0 ? (jeonse / sales) : 0;
      
      return {
        apt,
        pyeongPrice,
        totalPrice: sales,
        ratio,
        hasTx: !!sum && !!(sum.avg1MPrice || sum.latestPrice) && !!(sum.avg1MRentDeposit || sum.latestRentDeposit)
      };
    });
  }, [allApts, txSummaryData, nameMapping]);

  const sortedApts = useMemo(() => {
    let filteredApts = enrichedApts;
    if (listSort === 'valuation') {
      filteredApts = enrichedApts.filter(e => e.hasTx);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().replace(/\s+/g, '');
      filteredApts = filteredApts.filter(e => e.apt.name.toLowerCase().replace(/\s+/g, '').includes(q));
    }

    return [...filteredApts].sort((a, b) => {
      if (listSort === 'total-price') {
        const diff = b.totalPrice - a.totalPrice;
        return diff !== 0 ? diff : a.apt.name.localeCompare(b.apt.name, 'ko');
      }
      if (listSort === 'price-rank') {
        const diff = b.pyeongPrice - a.pyeongPrice;
        return diff !== 0 ? diff : a.apt.name.localeCompare(b.apt.name, 'ko');
      }
      if (listSort === 'valuation') {
        const diff = b.ratio - a.ratio;
        return diff !== 0 ? diff : a.apt.name.localeCompare(b.apt.name, 'ko');
      }
      if (listSort === 'views') {
        const aReport = fieldReportsMap.get(a.apt.name);
        const bReport = fieldReportsMap.get(b.apt.name);
        const diff = (bReport?.viewCount || 0) - (aReport?.viewCount || 0);
        return diff !== 0 ? diff : a.apt.name.localeCompare(b.apt.name, 'ko');
      }
      if (listSort === 'likes') {
        const diff = (favoriteCounts[b.apt.name] || 0) - (favoriteCounts[a.apt.name] || 0);
        return diff !== 0 ? diff : a.apt.name.localeCompare(b.apt.name, 'ko');
      }
      return a.apt.name.localeCompare(b.apt.name, 'ko');
    }).map(e => e.apt);
  }, [enrichedApts, listSort, fieldReportsMap, favoriteCounts, searchQuery]);

  return (
    <PullToRefresh scrollContainerId={activeTab === 'imjang' ? 'apartment-list-scroll' : 'recommend-scroll'}>
      <div className="flex flex-col h-[100dvh] overflow-hidden bg-surface font-sans selection:bg-toss-blue/20">
        
        {/* a11y: Skip to Content */}
        <a href="#main-content" className="skip-to-content">내용으로 건너뛰기</a>

      {/* Dynamic Minimal Sticky Header */}
      <div 
        className={`fixed top-0 inset-x-0 w-full bg-surface/95 backdrop-blur-md border-b border-border shadow-sm z-50 transition-transform duration-300 flex items-center justify-between px-3 md:px-10 lg:px-16 h-[52px] ${
          isScrolled ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <span className="font-extrabold text-primary tracking-tight text-[15px] flex items-center gap-2">
           <img src="/d-view-icon.png" alt="D-VIEW" className="w-[22px] h-[22px] rounded-md" />
           <span className="text-primary">D-VIEW</span>
           <span className="text-tertiary font-normal text-[13px]">|</span>
           <span className="text-secondary font-semibold text-[14px]">동탄 아파트 가치 분석</span>
        </span>
        <div className="flex items-center -mr-1">
          <FloatingUserBar />
        </div>
      </div>
      
      {/* Main Header — Logo + Nav integrated */}
      <header className="shrink-0 bg-surface/95 backdrop-blur-xl border-b border-border relative z-40" role="banner">
        <div className="w-full max-w-[2000px] mx-auto px-3 sm:px-6 md:px-10 lg:px-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between pt-4 pb-3 md:py-4 gap-4 md:gap-0">
            
            {/* Left: Brand */}
            <div className="flex-1 flex items-center justify-between md:justify-start">
              <div 
                className="flex items-center gap-3.5 cursor-pointer group"
                onClick={() => {
                  setSelectedReport(null);
                  window.history.pushState(null, '', '/');
                }}
              >
                <div className="relative shrink-0">
                  <img src="/d-view-icon.png" alt="D-VIEW" className="w-10 h-10 sm:w-11 sm:h-11 rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04] group-hover:-translate-y-0.5 group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-300" />
                </div>
                <div className="flex flex-col justify-center">
                  <h1 className="text-[19px] sm:text-[22px] font-bold tracking-tight text-primary leading-none mb-1.5">
                    동탄 아파트 가치 분석
                  </h1>
                  <div className="hidden sm:flex items-center gap-1.5">
                    <span className="px-1.5 py-[3px] bg-body text-secondary rounded-[4px] text-[10px] font-bold tracking-widest leading-none">
                      DATA LAB
                    </span>
                    <span className="text-[11px] font-semibold text-tertiary tracking-wide">
                      Powered by D-VIEW
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Mobile User Bar */}
              <div className="md:hidden flex items-center -mr-1">
                <FloatingUserBar />
              </div>
            </div>

            {/* Center: Nav Tabs (Segmented Control Style) */}
            <nav className="hidden md:flex shrink-0 items-center gap-1 sm:gap-1.5 bg-body/80 p-1.5 rounded-[16px] overflow-x-auto no-scrollbar" aria-label="메인 메뉴">
              <button
                onClick={() => startTransition(() => setActiveTab('imjang'))}
                className={`flex items-center justify-center min-w-[90px] sm:min-w-[100px] gap-1.5 px-3 py-2.5 text-[13px] sm:text-[14px] font-bold transition-all duration-300 rounded-[12px] ${
                  activeTab === 'imjang'
                    ? 'bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5'
                    : 'text-tertiary hover:text-secondary hover:bg-black/5'
                }`}
              >
                <Home size={16} className={activeTab === 'imjang' ? 'text-primary' : 'text-tertiary group-hover:scale-110 transition-transform duration-200'} />
                <span>아파트 탐색</span>
              </button>
              
              <Link
                href="/lounge"
                className={`flex items-center justify-center min-w-[90px] sm:min-w-[100px] gap-1.5 px-3 py-2.5 text-[13px] sm:text-[14px] font-bold transition-all duration-300 rounded-[12px] text-tertiary hover:text-secondary hover:bg-black/5`}
              >
                <MessageSquare size={16} className="text-tertiary group-hover:scale-110 transition-transform duration-200" />
                <span>커뮤니티</span>
              </Link>
              
              {dashboardFacade.isAdmin(user?.email) && (
                <Link
                  href="/admin"
                  className="flex items-center justify-center min-w-[90px] sm:min-w-[100px] gap-1.5 px-3 py-2.5 text-[13px] sm:text-[14px] font-bold transition-all duration-300 rounded-[12px] text-[#ef4444] hover:bg-black/5"
                >
                  <ShieldCheck size={16} className="text-[#ef4444] transition-transform duration-200" />
                  <span>관리자</span>
                </Link>
              )}
            </nav>

            {/* Right: Desktop User Bar */}
            <div className="hidden md:flex flex-1 items-center justify-end">
              <FloatingUserBar />
            </div>
            
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main id="main-content" className="flex-1 overflow-hidden w-full max-w-[2000px] mx-auto px-3 sm:px-6 md:px-10 lg:px-16 animate-in fade-in duration-500">

        {/* ═══ TAB 1: 단지 분석 ═══ */}
        {mounted && activeTab === 'imjang' && (
        <section className="h-full">
          {/* ── 마스터-디테일 레이아웃 ── */}
          <div className="flex flex-col md:flex-row h-full rounded-none md:rounded-[20px] md:border md:border-border md:shadow-[0_2px_20px_rgba(0,0,0,0.04)] overflow-hidden">
            {/* LEFT: 아파트 리스트 (1/3) */}
            <div id="left-panel-scroll" ref={leftPanelRef} className="w-full md:w-[420px] lg:w-[460px] md:shrink-0 h-full overflow-hidden md:border-r md:border-border flex flex-col bg-surface pb-[100px] md:pb-0 relative">
          {(() => {
            return (
              <>
                {/* 리스트 패널 타이틀 & 검색창 */}
                <div className="bg-surface px-5 py-3 min-h-[54px] flex items-center justify-between w-full border-b border-border shrink-0 gap-3">
                  <span className="text-[16px] font-black text-primary tracking-tight whitespace-nowrap">아파트 단지 목록</span>
                  <DebouncedSearchInput value={searchQuery} onChange={setSearchQuery} />
                </div>

                {/* 아파트 리스트 */}
                <div className="bg-surface flex-1 flex flex-col">
                  {/* 통합 필터 바 — 리스트 상단에 고정 */}
                  <div className="sticky top-0 z-30 bg-surface/95 backdrop-blur-sm border-b border-body px-3 py-2.5">
                    <DongFilterBar
                      selectedDong={selectedDong}
                      onSelectDong={setSelectedDong}
                      totalAptCount={Object.values(sheetApartments).flat().filter(a => !publicRentalSet.has(a.name)).length}
                      dongAptCounts={dongAptCounts}
                      dongReportCounts={dongReportCounts}
                      listSort={listSort}
                      onSortChange={setListSort}
                    />
                    
                    {/* 정렬 배너 제거됨 */}
                  </div>
                  <FixedSizeList
                    className="custom-scrollbar"
                    height={listHeight}
                    itemCount={sortedApts.length + (isDesktop ? 0 : 4)} // Reserve 4 items (328px) for the Footer on mobile
                    itemSize={82}
                    width="100%"
                    overscanCount={5}
                    // @ts-expect-error react-window types missing outerProps
                    outerProps={{ id: 'apartment-list-scroll' }}
                  >
                    {({ index, style }: { index: number; style: React.CSSProperties }) => {
                      if (index === sortedApts.length) {
                        return (
                          <div style={style} className="relative z-0">
                            <div className="absolute top-0 w-full md:hidden">
                              <Footer />
                            </div>
                          </div>
                        );
                      }
                      if (index > sortedApts.length) {
                        return <div style={style} />;
                      }

                      const apt = sortedApts[index];
                      const overrideKey = HARDCODED_MAPPING[normalizeAptName(apt.name)];
                      const rawKey = overrideKey || apt.txKey || apt.name;
                      const txKey = findTxKey(rawKey, txSummaryData, nameMapping) || rawKey;
                      const txSummary = txKey ? txSummaryData[txKey] : undefined;
                      const report = fieldReportsMap.get(apt.name);
                      return (
                        <div style={style}>
                          <ApartmentCard
                            key={apt.name}
                            apt={apt}
                            txSummary={txSummary}
                            report={report}
                            listSort={listSort}
                            isPublicRental={publicRentalSet.has(apt.name)}
                            rank={index + 1}
                            isSelected={!!(selectedReport && isSameApartment(selectedReport.apartmentName, apt.name, nameMapping))}
                            isFavorited={userFavorites.has(apt.name)}
                            favoriteCount={Math.max(userFavorites.has(apt.name) ? 1 : 0, favoriteCounts[apt.name] || 0)}
                              onToggleFavorite={() => {
                                handleToggleFavorite(apt.name, handleLogin);
                              if (!userFavorites.has(apt.name)) {
                                triggerCustomA2HSModal();
                              }
                            }}
                            onClick={() => {
                              userHasSelected.current = true;
                              if (report) {
                                setSelectedReport(report);
                              } else {
                                setSelectedReport({
                                  id: `stub-${normalizeAptName(apt.name)}`,
                                  apartmentName: apt.name,
                                  dong: apt.dong,
                                  author: '',
                                  likes: 0,
                                  commentCount: 0,
                                  createdAt: null,
                                  metrics: { ...apt, ...((locationScoresData as Record<string, any>)[apt.name] || {}) } as unknown as import('@/lib/types/scoutingReport').ObjectiveMetrics,
                                });
                              }
                              // Soft URL update for SEO capturing
                              window.history.pushState(null, '', `/apartment/${encodeURIComponent(apt.name)}`);

                              // Open mobile modal on explicit tap
                              if (typeof window !== 'undefined' && window.innerWidth < 768) {
                                setMobileModalOpen(true);
                              }
                            }}
                            typeMap={typeMap}
                            areaUnit={areaUnit}
                          />
                        </div>
                      );
                    }}
                  </FixedSizeList>
                </div>
              </>
            );
          })()}
            </div>

            {/* RIGHT: 인라인 디테일 패널 (2/3, 데스크톱 전용) */}
            <div className={`hidden md:flex flex-col flex-1 h-full ${resolvedReport ? 'overflow-y-auto' : 'overflow-hidden'} overflow-x-hidden bg-body custom-scrollbar relative`}>
              {resolvedReport ? (
                <>
                  <div className="flex-1 flex flex-col bg-surface">
                    <FieldReportModal 
                      report={resolvedReport} 
                      onClose={() => {
                        setSelectedReport(null);
                        window.history.pushState(null, '', '/');
                      }} 
                      comments={commentsData[resolvedReport.id] || []}
                      commentInput={commentInput[resolvedReport.id] || ''}
                      onCommentChange={(text) => setCommentInput(prev => ({ ...prev, [resolvedReport.id]: text }))}
                      onSubmitComment={() => handleSubmitComment(resolvedReport.id)}
                      user={user}
                      transactions={modalTransactions}
                      typeMap={typeMap}
                      areaUnit={areaUnit}
                      isLoadingDetail={isLoadingDetail}
                      isPurchased={purchasedReportIds.includes(resolvedReport.id)}
                      isAdmin={dashboardFacade.isAdmin(user?.email)}
                      txSummary={aptTxSummary}
                      onPurchaseComplete={() => {
                        if (user) {
                          refreshPurchasedReports();
                        }
                      }}
                      inline
                    />
                  </div>
                  <div className="mt-auto bg-surface w-full">
                    <Footer />
                  </div>
                </>
              ) : (
                <div className="flex flex-col h-full bg-body">
                  <div className="flex-1 w-full bg-gradient-to-br from-[#191f28] to-[#222a35] relative overflow-hidden group flex flex-col items-center justify-center p-8 text-center min-h-[500px]">
                      {/* Background noise/pattern */}
                      <div className="absolute inset-0 bg-black/10 mix-blend-overlay pointer-events-none"></div>
                      <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffffff] rounded-full mix-blend-overlay filter blur-[80px] opacity-10 transform translate-x-1/2 -translate-y-1/2"></div>
                      
                      {/* AD Badge */}
                      <div className="absolute top-5 right-5 bg-surface/10 backdrop-blur-md px-2.5 py-1 rounded text-[11px] text-surface/90 font-extrabold uppercase tracking-widest border border-white/20">
                        AD
                      </div>
                      
                      <div className="relative z-10 w-full max-w-[280px]">
                        <div className="w-16 h-16 bg-surface/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                          <Building2 className="text-surface drop-shadow-sm" size={32} strokeWidth={1.5} />
                        </div>
                        
                        <h3 className="text-[22px] font-extrabold text-surface tracking-tight mb-3 leading-snug">
                          동탄 부동산 핵심 타겟<br/>프리미엄 광고 파트너 모집
                        </h3>
                        
                        <p className="text-[14.5px] text-blue-100/90 font-medium leading-[1.6] mb-8">
                          실거주와 투자를 준비하는 진성 유저들에게<br/>
                          귀사의 브랜드를 가장 효과적으로 각인시키세요.
                        </p>
                        
                        <button 
                          onClick={() => setIsAdModalOpen(true)}
                          className="w-full bg-surface text-primary text-[15px] font-extrabold py-3.5 rounded-xl shadow-[0_4px_14px_0_rgba(255,255,255,0.39)] hover:bg-body hover:shadow-[0_6px_20px_rgba(255,255,255,0.23)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 duration-200">
                          광고/제휴 문의하기
                        </button>
                      </div>
                  </div>
                  <div className="mt-auto">
                    <Footer />
                  </div>
                </div>
              )}
            </div>
          </div>

        </section>
        )}

        {/* 모바일 풀스크린 모달 (md 미만에서만 표시, 사용자 클릭 시에만) */}
        {resolvedReport && mobileModalOpen && (
          <div className="md:hidden">
            <FieldReportModal
              report={resolvedReport}
              onClose={() => {
                setSelectedReport(null);
                setMobileModalOpen(false);
                window.history.pushState(null, '', '/');
              }}
              comments={commentsData[resolvedReport.id] || []}
              commentInput={commentInput[resolvedReport.id] || ''}
              onCommentChange={(text) => setCommentInput(prev => ({ ...prev, [resolvedReport.id]: text }))}
              onSubmitComment={() => handleSubmitComment(resolvedReport.id)}
              user={user}
              transactions={modalTransactions}
              typeMap={typeMap}
              isLoadingDetail={isLoadingDetail}
              isPurchased={purchasedReportIds.includes(resolvedReport.id)}
              isAdmin={dashboardFacade.isAdmin(user?.email)}
              txSummary={aptTxSummary}
              onPurchaseComplete={() => {
                if (user) {
                  refreshPurchasedReports();
                }
              }}
            />
          </div>
        )}

        {/* ═══ TAB 2: 라운지 제거됨 (별도 페이지로 이동) ═══ */}

        {/* ═══ TAB 3: 아파트 추천 (Toss-Style Discovery) 제거됨 ═══ */}
        
        <Footer />
      </main>





      
      {/* Scroll to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed z-50 bottom-24 sm:bottom-8 right-4 sm:right-8 bg-surface text-primary shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-border w-[46px] h-[46px] rounded-full flex items-center justify-center transition-all duration-300 hover:bg-[#f8f9fa] hover:scale-105 active:scale-95 ${
          isScrolled ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-10 opacity-0 pointer-events-none'
        }`}
        aria-label="맨 위로 이동"
        title="맨 위로 이동"
      >
        <ArrowUp size={22} strokeWidth={2.5} />
      </button>

      {showReviewModal && user && (
        <WriteReviewModal onClose={() => setShowReviewModal(false)} userUid={user.uid} />
      )}

      <MobileDock 
        activeTab={activeTab} 
        areaUnit={areaUnit} 
        setAreaUnit={setAreaUnit} 
        onTabClick={(tab) => startTransition(() => setActiveTab(tab))} 
      />

      </div>
      {isAdModalOpen && (
        <AdInquiryModal onClose={() => setIsAdModalOpen(false)} />
      )}
    </PullToRefresh>
  );
}
