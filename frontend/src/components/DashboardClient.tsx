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

import dynamic from 'next/dynamic';
import PullToRefresh from '@/components/pwa/PullToRefresh';
import { useSettings } from '@/lib/contexts/SettingsContext';

// Heavy components — loaded on demand (saves ~200KB initial JS)
const FieldReportModal = dynamic(() => import('@/components/ApartmentModal'), { ssr: false });
const WriteReviewModal = dynamic(() => import('@/components/WriteReviewModal'), { ssr: false });
const AdInquiryModal = dynamic(() => import('@/components/AdInquiryModal'), { ssr: false });
const ApartmentDiscoveryClient = dynamic(() => import('@/components/ApartmentDiscoveryClient'), { ssr: false });
const MacroDashboardClient = dynamic(() => import('@/components/MacroDashboardClient'), { ssr: false });
const LoungeContainerClient = dynamic(() => import('@/components/LoungeContainerClient'), { ssr: false });
const TossApartmentExploreClient = dynamic(() => import('@/components/TossApartmentExploreClient'), { ssr: false });
import { DONGS, getDongByName, getDongColor, getAllDongNames } from '@/lib/dongs';
import { ZONES } from '@/lib/zones';
import { buildInitialApartments, type DongApartment } from '@/lib/dong-apartments';

interface StaticApartment { name: string; dong: string; householdCount?: number; yearBuilt?: string; brand?: string; }
import { type AptTxSummary } from '@/lib/types/transaction';
import { isSameApartment, normalizeAptName, findTxKey, getDisplayAptName, HARDCODED_MAPPING } from '@/lib/utils/apartmentMapping';
import * as PurchaseRepo from '@/lib/repositories/purchase.repository';
import { useState, useEffect, useMemo, useRef, useCallback, useTransition, useDeferredValue } from 'react';
import { useRouter } from 'next/navigation';
import { getDisplayName } from '@/lib/types/user.types';
import { FixedSizeList } from 'react-window';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardMeta, type DashboardInitialDataLocal } from '@/hooks/useDashboardMeta';
import { useFavorites } from '@/hooks/useFavorites';
import { useApartmentDetails } from '@/hooks/useApartmentDetails';
import { useComments } from '@/hooks/useComments';
import { usePWA } from '@/components/pwa/PWAProvider';
import { useTxData, useLocationScores } from '@/hooks/useStaticData';

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
  const kpis = initialDashboardData?.kpis || [];
  const fieldReports = initialDashboardData?.fieldReports || [];
  const adBanner = dashboardFacade.getAdBanner();
  // Moduled Hooks Architecture
  const { user, userProfile, anonProfile, purchasedReportIds, handleLogin, handleLogout, refreshPurchasedReports } = useAuth();
  const { sheetApartments, typeMap, nameMapping, publicRentalSet } = useDashboardMeta(initialDashboardData);
  const { userFavorites, favoriteCounts, handleToggleFavorite } = useFavorites(user, initialDashboardData?.favoriteCounts);
  
  const [selectedReport, setSelectedReport] = useState<FieldReportData | null>(null);
  
  const { txSummary = {}, macroTrend = [], isLoading: isStaticDataLoading } = useTxData();
  const { locationScores = {} } = useLocationScores();
  
  const { txSummaryData, fullReportData, modalTransactions, isLoadingDetail, isTxLoading, resolvedReport, aptTxSummary } = useApartmentDetails(
    selectedReport, sheetApartments, nameMapping, user, txSummary
  );
  
  const { commentsData, commentInput, setCommentInput, handleSubmitComment } = useComments(
    selectedReport, fullReportData, user, handleLogin
  );

  const { triggerCustomA2HSModal } = usePWA();

  const [activeTab, setActiveTab] = useState<'overview' | 'imjang' | 'lounge' | 'discover'>('overview');
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
      } else if (window.location.hash === '#discover') {
        setActiveTab('discover');
      } else if (window.location.hash.startsWith('#lounge')) {
        setActiveTab('lounge');
      }

      const handleHashChange = () => {
        startTransition(() => {
          if (window.location.hash.startsWith('#lounge')) setActiveTab('lounge');
          else if (window.location.hash === '#discover') setActiveTab('discover');
          else if (window.location.hash === '#imjang') setActiveTab('imjang');
          else if (window.location.hash === '#overview' || window.location.hash === '') setActiveTab('overview');
        });
      };
      window.addEventListener('hashchange', handleHashChange);

      const handleScroll = () => {
        setIsScrolled(window.scrollY > 200);
      };
      window.addEventListener('scroll', handleScroll);

      return () => {
        window.removeEventListener('hashchange', handleHashChange);
        window.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);

  // Handle #apt= hash to open modal automatically (e.g. from Kakao Share)
  useEffect(() => {
    if (!mounted || !sheetApartments) return;
    
    const checkHashForApt = () => {
      if (window.location.hash.startsWith('#apt=')) {
        const aptName = decodeURIComponent(window.location.hash.replace('#apt=', ''));
        const allApts = Object.values(sheetApartments).flat();
        const targetApt = allApts.find(a => isSameApartment(a.name, aptName, nameMapping));
        
        if (targetApt) {
          userHasSelected.current = true;
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
              metrics: { ...targetApt, ...((locationScores as Record<string, any>)[targetApt.name] || {}) } as any,
            });
          }
          setMobileModalOpen(true);
        }
      }
    };

    // Check once on mount/data-load
    checkHashForApt();
    
    window.addEventListener('hashchange', checkHashForApt);
    return () => window.removeEventListener('hashchange', checkHashForApt);
  }, [mounted, sheetApartments, fieldReportsMap, nameMapping]);

  const [isScrolled, setIsScrolled] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedDong, setSelectedDong] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');


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

  // Scroll to top when tab changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);

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
            metrics: { ...targetApt, ...((locationScores as Record<string, any>)[targetApt.name] || {}) } as unknown as import('@/lib/types/scoutingReport').ObjectiveMetrics,
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
      // If we go back to the root (no hash), clear selection (soft close)
      if (!window.location.hash && (window.location.pathname === '/' || window.location.pathname === '')) {
        setSelectedReport(null);
        setMobileModalOpen(false);
        userHasSelected.current = true;
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setSelectedReport]);

  const handleAptClick = useCallback((apt: StaticApartment) => {
    userHasSelected.current = true;
    const report = fieldReportsMap.get(apt.name);
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
        metrics: { ...apt, ...((locationScores as Record<string, any>)[apt.name] || {}) } as unknown as import('@/lib/types/scoutingReport').ObjectiveMetrics,
      });
    }
    // Bypass Next.js completely to avoid any Suspense/Router triggers by pushing a hash state natively
    History.prototype.pushState.call(window.history, null, '', window.location.pathname + window.location.search + `#apt=${encodeURIComponent(apt.name)}`);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileModalOpen(true);
    }
  }, [fieldReportsMap, setSelectedReport]);

  const handleAptToggleFavorite = useCallback((aptName: string) => {
    handleToggleFavorite(aptName, handleLogin);
    if (!userFavorites.has(aptName)) {
      triggerCustomA2HSModal();
    }
  }, [handleToggleFavorite, handleLogin, userFavorites, triggerCustomA2HSModal]);

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

  const { areaUnit } = useSettings();

  const rawApts = useMemo(() => {
    return selectedDong 
      ? (sheetApartments[selectedDong] || [])
      : Object.values(sheetApartments).flat();
  }, [sheetApartments, selectedDong]);
    
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

  const baseSortedApts = useMemo(() => {
    let filteredApts = enrichedApts;
    if (listSort === 'valuation') {
      filteredApts = enrichedApts.filter(e => e.hasTx);
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
  }, [enrichedApts, listSort, fieldReportsMap, favoriteCounts]);

  const deferredSearchQuery = useDeferredValue(searchQuery);

  const sortedApts = useMemo(() => {
    if (deferredSearchQuery.trim() === '') return baseSortedApts;
    const q = deferredSearchQuery.toLowerCase().replace(/\s+/g, '');
    return baseSortedApts.filter(apt => apt.name.toLowerCase().replace(/\s+/g, '').includes(q) || (apt.brand && apt.brand.toLowerCase().replace(/\s+/g, '').includes(q)));
  }, [baseSortedApts, deferredSearchQuery]);

  return (
    <PullToRefresh 
      scrollContainerId={activeTab === 'imjang' ? 'apartment-list-scroll' : 'recommend-scroll'}
      disabled={mobileModalOpen || !!selectedReport}
    >
      <div className="flex flex-col min-h-[100dvh] bg-surface relative pb-[env(safe-area-inset-bottom)] overflow-x-hidden">
        
        {/* a11y: Skip to Content */}
        <a href="#main-content" className="skip-to-content">내용으로 건너뛰기</a>


      
      {/* Main Header — Logo + Nav integrated */}
      <header className="hidden md:block shrink-0 bg-surface/95 backdrop-blur-xl border-b border-border sticky top-0 z-40" role="banner">
        <div className="w-full max-w-[2000px] mx-auto px-3 sm:px-6 md:px-10 lg:px-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-2 md:py-2.5 gap-2 md:gap-0">
            
            {/* Mobile: Top Bar */}
            <div className="md:hidden flex items-center justify-end w-full">
              <FloatingUserBar />
            </div>

            {/* Center: Nav Tabs (Segmented Control Style) */}
            <nav className="hidden md:flex shrink-0 items-center gap-1 sm:gap-1.5 bg-body/80 p-1.5 rounded-[16px] overflow-x-auto no-scrollbar" aria-label="메인 메뉴">
              <button
                onClick={() => startTransition(() => { setActiveTab('overview'); window.location.hash = 'overview'; })}
                className={`flex items-center justify-center min-w-[80px] sm:min-w-[90px] gap-1.5 px-3 py-1.5 text-[12px] sm:text-[13px] font-bold transition-all duration-300 rounded-[10px] ${
                  activeTab === 'overview'
                    ? 'bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5'
                    : 'text-tertiary hover:text-secondary hover:bg-black/5'
                }`}
              >
                <LayoutDashboard size={16} className={activeTab === 'overview' ? 'text-primary' : 'text-tertiary group-hover:scale-110 transition-transform duration-200'} />
                <span>데이터 랩</span>
              </button>
              
              <button
                onClick={() => startTransition(() => { setActiveTab('imjang'); window.location.hash = 'imjang'; })}
                className={`flex items-center justify-center min-w-[80px] sm:min-w-[90px] gap-1.5 px-3 py-1.5 text-[12px] sm:text-[13px] font-bold transition-all duration-300 rounded-[10px] ${
                  activeTab === 'imjang'
                    ? 'bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5'
                    : 'text-tertiary hover:text-secondary hover:bg-black/5'
                }`}
              >
                <Home size={16} className={activeTab === 'imjang' ? 'text-primary' : 'text-tertiary group-hover:scale-110 transition-transform duration-200'} />
                <span>아파트 탐색</span>
              </button>
              
              <button
                onClick={() => startTransition(() => { setActiveTab('discover'); window.location.hash = 'discover'; })}
                className={`flex items-center justify-center min-w-[80px] sm:min-w-[90px] gap-1.5 px-3 py-1.5 text-[12px] sm:text-[13px] font-bold transition-all duration-300 rounded-[10px] ${
                  activeTab === 'discover'
                    ? 'bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5'
                    : 'text-tertiary hover:text-secondary hover:bg-black/5'
                }`}
              >
                <Compass size={16} className={activeTab === 'discover' ? 'text-primary' : 'text-tertiary group-hover:scale-110 transition-transform duration-200'} />
                <span>골라보기</span>
              </button>

              <button
                onClick={() => startTransition(() => { setActiveTab('lounge'); window.location.hash = 'lounge'; })}
                className={`flex items-center justify-center min-w-[80px] sm:min-w-[90px] gap-1.5 px-3 py-1.5 text-[12px] sm:text-[13px] font-bold transition-all duration-300 rounded-[10px] ${
                  activeTab === 'lounge'
                    ? 'bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5'
                    : 'text-tertiary hover:text-secondary hover:bg-black/5'
                }`}
              >
                <MessageSquare size={16} className={activeTab === 'lounge' ? 'text-primary' : 'text-tertiary group-hover:scale-110 transition-transform duration-200'} />
                <span>커뮤니티</span>
              </button>
              
            </nav>

            {/* Right: Desktop User Bar */}
            <div className="hidden md:flex items-center justify-end">
              <FloatingUserBar />
            </div>
            
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main id="main-content" className="flex-1 w-full max-w-[2000px] mx-auto animate-in fade-in duration-500">
        {/* ═══ TAB 0: 마크로 대시보드 ═══ */}
        {mounted && (
          <section className={`w-full bg-surface pb-8 md:pb-0 rounded-b-[24px] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] md:shadow-none mb-4 md:mb-0 ${activeTab === 'overview' ? 'block' : 'hidden'}`}>
            <MacroDashboardClient 
              sheetApartments={sheetApartments} 
              txSummaryData={txSummaryData}
              macroTrendData={macroTrend}
              nameMapping={nameMapping || {}}
              publicRentalSet={publicRentalSet}
              userFavorites={userFavorites}
              onOpenAdModal={() => setIsAdModalOpen(true)}
              onSelectApt={(name: string) => {
                userHasSelected.current = true;
                const report = fieldReportsMap.get(name);
                if (report) {
                  setSelectedReport(report);
                } else {
                  const targetApt = Object.values(sheetApartments).flat().find(a => a.name === name) || { name, dong: '' } as any;
                  setSelectedReport({
                    id: `stub-${name.replace(/\s+/g, '')}`,
                    apartmentName: name,
                    dong: targetApt.dong,
                    author: '',
                    likes: 0,
                    commentCount: 0,
                    createdAt: null,
                    metrics: { ...targetApt } as any,
                  });
                }
                // Bypass Next.js completely to avoid any Suspense/Router triggers by pushing a hash state natively
                History.prototype.pushState.call(window.history, null, '', window.location.pathname + window.location.search + `#apt=${encodeURIComponent(name)}`);
                setMobileModalOpen(true);
              }}
            />
          </section>
        )}

        {/* ═══ TAB 1: 아파트 탐색 (Toss-style 골라보기 테이블) ═══ */}
        {mounted && (
          <section className={`w-full bg-surface ${activeTab === 'imjang' ? 'block' : 'hidden'}`}>
            <TossApartmentExploreClient
              sheetApartments={sheetApartments}
              txSummaryData={txSummaryData}
              nameMapping={nameMapping || {}}
              fieldReportsMap={fieldReportsMap}
              publicRentalSet={publicRentalSet}
              userFavorites={userFavorites}
              favoriteCounts={favoriteCounts}
              typeMap={typeMap}
              handleSelectApt={(name: string) => {
                const report = fieldReportsMap.get(name);
                if (report) {
                  setSelectedReport(report);
                  setMobileModalOpen(true);
                  window.history.pushState(null, '', window.location.pathname + window.location.search + `#apt=${encodeURIComponent(name)}`);
                } else {
                  // Fallback for apartments without reports, we still want to show the modal with basic transaction data
                  setSelectedReport({
                    id: `temp-${name}`,
                    apartmentName: name,
                    title: `${name} 정보`,
                    content: '아직 작성된 현장 임장기가 없습니다.',
                    createdAt: Date.now(),
                    dong: DONGS.find(d => sheetApartments[d.name]?.some(a => a.name === name))?.name || '',
                    author: '',
                    authorName: '',
                    viewCount: 0,
                    likeCount: 0,
                  } as any);
                  setMobileModalOpen(true);
                  window.history.pushState(null, '', window.location.pathname + window.location.search + `#apt=${encodeURIComponent(name)}`);
                }
              }}
              onToggleFavorite={(name: string) => handleToggleFavorite(name, handleLogin)}
            />
        {/* ═══ TAB 2: 커뮤니티 (라운지) ═══ */}
        {mounted && (
          <section className={`w-full bg-surface ${activeTab === 'lounge' ? 'block' : 'hidden'}`}>
            <LoungeContainerClient initialPosts={[]} />
          </section>
        )}

        {/* ═══ TAB 3: 아파트 추천 (Toss-Style Discovery) ═══ */}
        {mounted && (
          <section className={`w-full ${activeTab === 'discover' ? 'block' : 'hidden'}`}>
            <ApartmentDiscoveryClient
              sheetApartments={sheetApartments}
              fieldReports={fieldReports}
              userFavorites={userFavorites}
              nameMapping={nameMapping || {}}
              publicRentalSet={publicRentalSet}
              txSummaryData={txSummaryData}
              favoriteCounts={favoriteCounts}
              onToggleFavorite={(name) => handleToggleFavorite(name, handleLogin)}
              onSelectReport={setSelectedReport as any}
              typeMap={typeMap}
            />
          </section>
        )}
        
        {/* 아파트 모달 (모든 화면 해상도에서 팝업으로 표시) */}
        {resolvedReport && mobileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full h-full md:max-w-[700px] md:max-h-[90vh] md:h-auto bg-surface md:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              <FieldReportModal
              report={resolvedReport}
              onClose={() => {
                setSelectedReport(null);
                setMobileModalOpen(false);
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
              }}
              comments={commentsData[resolvedReport.id] || []}
              commentInput={commentInput[resolvedReport.id] || ''}
              onCommentChange={(text) => setCommentInput(prev => ({ ...prev, [resolvedReport.id]: text }))}
              onSubmitComment={() => handleSubmitComment(resolvedReport.id)}
              user={user}
              transactions={modalTransactions}
              typeMap={typeMap}
              inline={false}
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
          </div>
        )}
      </main>

      {showReviewModal && user && (
        <WriteReviewModal onClose={() => setShowReviewModal(false)} userUid={user.uid} />
      )}

      <MobileDock 
        activeTab={activeTab} 
        onTabClick={setActiveTab}
      />

      </div>
      {isAdModalOpen && (
        <AdInquiryModal onClose={() => setIsAdModalOpen(false)} />
      )}
    </PullToRefresh>
  );
}
