'use client';

import { MessageSquare, X, LayoutDashboard, Home, Search, Coins } from 'lucide-react';

import { dashboardFacade, FieldReportData } from '@/lib/DashboardFacade';
import { TrendingTicker } from '@/components/ui/TrendingTicker';
import FloatingUserBar from '@/components/FloatingUserBar';
import MobileDock from '@/components/pwa/MobileDock';
import PageHeroHeader from '@/components/PageHeroHeader';

import dynamic from 'next/dynamic';
import PullToRefresh from '@/components/pwa/PullToRefresh';
import { useSettings } from '@/lib/contexts/SettingsContext';

// Heavy components — loaded on demand (saves ~200KB initial JS)
const FieldReportModal = dynamic(() => import('@/components/ApartmentModal'), { ssr: false });
const WriteReviewModal = dynamic(() => import('@/components/WriteReviewModal'), { ssr: false });
const AdInquiryModal = dynamic(() => import('@/components/AdInquiryModal'), { ssr: false });
const MacroDashboardClient = dynamic(() => import('@/components/MacroDashboardClient'), { ssr: false });
const LoungeContainerClient = dynamic(() => import('@/components/LoungeContainerClient'), { ssr: false });
const TossApartmentExploreClient = dynamic(() => import('@/components/TossApartmentExploreClient'), { ssr: false });
const GapInvestmentExplorer = dynamic(() => import('@/components/GapInvestmentExplorer'), { ssr: false });
const ChopoomaCuration = dynamic(() => import('@/components/ChopoomaCuration'), { ssr: false });
const LocalEventCuration = dynamic(() => import('@/components/LocalEventCuration'), { ssr: false });
const AptCompareModal = dynamic(() => import('@/components/consumer/AptCompareModal'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/30 backdrop-blur-md">
      <div className="bg-surface p-6 rounded-2xl shadow-xl border border-border animate-pulse text-[14px] font-bold text-secondary">
        비교 대시보드 로드 중...
      </div>
    </div>
  )
});


import { DONGS, getAllDongNames } from '@/lib/dongs';

interface StaticApartment { name: string; dong: string; householdCount?: number; yearBuilt?: string; brand?: string; }
import { isSameApartment, normalizeAptName, findTxKey, HARDCODED_MAPPING } from '@/lib/utils/apartmentMapping';
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
import { useAdBlockDetector } from '@/hooks/useAdBlockDetector';
import { useTxData, useLocationScores } from '@/hooks/useStaticData';
import LoginGateModal from '@/components/ui/LoginGateModal';
import * as UserRepo from '@/lib/repositories/user.repository';
import { isValidNickname } from '@/lib/services/nickname.service';

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
        className="w-full bg-body text-body-normal text-primary placeholder:text-tertiary rounded-[8px] pl-8 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-toss-blue transition-all"
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
  
  const [mounted, setMounted] = useState(false);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [showAdBlockBanner, setShowAdBlockBanner] = useState(false);
  const { isAdBlockActive } = useAdBlockDetector();

  useEffect(() => {
    if (!isAdBlockActive || !mounted) return;
    
    const dismissedTime = localStorage.getItem('dview-adblock-banner-dismissed');
    if (dismissedTime) {
      const parsedTime = parseInt(dismissedTime, 10);
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (now - parsedTime < sevenDays) {
        return;
      }
    }
    setShowAdBlockBanner(true);
  }, [isAdBlockActive, mounted]);

  const handleAdBlockBannerClose = () => {
    localStorage.setItem('dview-adblock-banner-dismissed', Date.now().toString());
    setShowAdBlockBanner(false);
  };
  
  // Nickname restriction modal state
  const [newNickname, setNewNickname] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [isSubmittingNickname, setIsSubmittingNickname] = useState(false);

  const showNicknameModal = mounted && !!user && !!userProfile && userProfile.hasSetNickname === false && !dashboardFacade.isAdmin(user.email);

  const handleNicknameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const trimmed = newNickname.trim();
    if (!isValidNickname(trimmed)) {
      setNicknameError('닉네임은 공백 제외 한글, 영문, 숫자, _로만 2자에서 10자여야 합니다.');
      return;
    }
    setIsSubmittingNickname(true);
    setNicknameError('');
    try {
      await UserRepo.updateNickname(user.uid, trimmed);
      window.location.reload();
    } catch (error) {
      console.error('Failed to set nickname:', error);
      setNicknameError('닉네임 설정 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmittingNickname(false);
    }
  };

  const [selectedReport, setSelectedReport] = useState<FieldReportData | null>(null);
  
  // 1:1 아파트 비교 대시보드 상태
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareInitialApt, setCompareInitialApt] = useState<string | undefined>(undefined);
  
  const [isLoginGateOpen, setIsLoginGateOpen] = useState(false);
  const [loginGateMessage, setLoginGateMessage] = useState('');

  const handleRequestLogin = useCallback((message: string) => {
    setLoginGateMessage(message);
    setIsLoginGateOpen(true);
  }, []);
  
  const { txSummary = {}, macroTrend = [], recent7DaysVolume, isLoading: isStaticDataLoading } = useTxData(initialDashboardData?.macroTrend);
  const { locationScores = {} } = useLocationScores();
  
  const getLocScore = (aptName: string) => {
    if (!aptName || !locationScores) return {};
    const matchKey = findTxKey(aptName, locationScores, nameMapping);
    return matchKey ? locationScores[matchKey] : {};
  };
  
  const { txSummaryData, fullReportData, modalTransactions, isLoadingDetail, isTxLoading, resolvedReport, aptTxSummary, loadAllTransactions } = useApartmentDetails(
    selectedReport, sheetApartments, nameMapping, user, txSummary, locationScores
  );
  
  const { commentsData, commentInput, setCommentInput, handleSubmitComment } = useComments(
    selectedReport, fullReportData, user, handleLogin
  );

  const { triggerCustomA2HSModal } = usePWA();

  const [activeTab, setActiveTab] = useState<'overview' | 'imjang' | 'gap' | 'lounge'>('overview');
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


  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const hasCurationParams = params.has('chopoomaStep') || params.has('maxGap');

      if (window.location.hash === '#imjang' || tabParam === 'imjang') {
        setActiveTab('imjang');
      } else if (window.location.hash === '#gap' || tabParam === 'gap' || hasCurationParams) {
        setActiveTab('gap');
      } else if (window.location.hash.startsWith('#lounge') || window.location.hash.includes('post=') || window.location.hash.includes('notice=') || tabParam === 'lounge') {
        setActiveTab('lounge');
      }

      const handleHashChange = () => {
        const queryParams = new URLSearchParams(window.location.search);
        const queryTab = queryParams.get('tab');
        const hasCuration = queryParams.has('chopoomaStep') || queryParams.has('maxGap');

        startTransition(() => {
          if (window.location.hash.startsWith('#lounge') || window.location.hash.includes('post=') || window.location.hash.includes('notice=') || queryTab === 'lounge') {
            setActiveTab('lounge');
          } else if (window.location.hash === '#imjang' || queryTab === 'imjang') {
            setActiveTab('imjang');
          } else if (window.location.hash === '#gap' || queryTab === 'gap' || hasCuration) {
            setActiveTab('gap');
          } else if (window.location.hash === '#overview' || window.location.hash === '' || queryTab === 'overview') {
            setActiveTab('overview');
          }
        });
      };
      window.addEventListener('hashchange', handleHashChange);

      const handleScroll = () => {
        setIsScrolled(window.scrollY > 200);
      };
      window.addEventListener('scroll', handleScroll);

      const handleOpenAdInquiry = () => {
        setIsAdModalOpen(true);
      };
      window.addEventListener('open-ad-inquiry', handleOpenAdInquiry);

      return () => {
        window.removeEventListener('hashchange', handleHashChange);
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('open-ad-inquiry', handleOpenAdInquiry);
      };
    }
  }, []);

  // Handle #apt= hash to open modal automatically (e.g. from Kakao Share)
  useEffect(() => {
    if (!mounted || !sheetApartments) return;
    
    const checkHashForApt = () => {
      const match = window.location.hash.match(/[#&]apt=([^&]+)/);
      if (match) {
        const aptName = decodeURIComponent(match[1]);
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
              metrics: { ...targetApt, ...(getLocScore(targetApt.name) || {}) } as any,
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
            metrics: { ...targetApt, ...(getLocScore(targetApt.name) || {}) } as unknown as import('@/lib/types/scoutingReport').ObjectiveMetrics,
          });
        }
      }
      return; 
    }

    // Auto-select is disabled so that the Ad slot placeholder remains visible on desktop until a user actively clicks an apartment.
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
        metrics: { ...apt, ...(getLocScore(apt.name) || {}) } as unknown as import('@/lib/types/scoutingReport').ObjectiveMetrics,
      });
    }
    // Bypass Next.js completely to avoid any Suspense/Router triggers by pushing a hash state natively
    History.prototype.pushState.call(window.history, null, '', window.location.pathname + window.location.search + `#apt=${encodeURIComponent(apt.name)}`);
    setMobileModalOpen(true);
  }, [fieldReportsMap, setSelectedReport]);

  const handleAptClickByName = useCallback((name: string) => {
    const allApts = Object.values(sheetApartments).flat();
    const targetApt = allApts.find(a => isSameApartment(a.name, name, nameMapping));
    if (targetApt) {
      handleAptClick(targetApt);
    } else {
      handleAptClick({ name, dong: '' });
    }
  }, [sheetApartments, nameMapping, handleAptClick]);

  const handleAptToggleFavorite = useCallback((aptName: string) => {
    handleToggleFavorite(aptName, () => handleRequestLogin('관심 단지를 등록하여 실거래가 변동 알림을 받아보세요.'));
    if (user && !userFavorites.has(aptName)) {
      triggerCustomA2HSModal();
    }
  }, [handleToggleFavorite, handleRequestLogin, user, userFavorites, triggerCustomA2HSModal]);

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

  const popularAptItems = useMemo(() => {
    if (!sheetApartments || !favoriteCounts || !txSummary) return [];

    const apts = Object.values(sheetApartments)
      .flat()
      .filter((apt) => !publicRentalSet.has(apt.name));

    const items = apts.map((apt) => {
      const favCount = favoriteCounts[apt.name] || 0;
      const txKey = findTxKey(apt.name, txSummary, nameMapping);
      const summary = txKey ? txSummary[txKey] : undefined;
      const avg3M = summary?.avg3MTxCount || 0;
      const latestPrice = summary?.latestPriceEok || "";
      const dong = apt.dong || summary?.dong || "";
      return {
        name: apt.name,
        dong,
        favCount,
        avg3M,
        latestPrice,
      };
    });

    // 1차: 관심 등록 수(favCount) 내림차순, 2차: 3개월 거래 회전율(avg3M) 내림차순
    items.sort((a, b) => {
      if (b.favCount !== a.favCount) return b.favCount - a.favCount;
      return b.avg3M - a.avg3M;
    });

    const sliced = items.slice(0, 5);

    return sliced.map((item, index) => {
      return {
        ...item,
        rank: index + 1,
      };
    });
  }, [sheetApartments, favoriteCounts, txSummary, nameMapping, publicRentalSet]);

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
    <>
    <PullToRefresh 
      scrollContainerId={activeTab === 'imjang' ? 'apartment-list-scroll' : activeTab === 'gap' ? 'gap-scroll' : 'recommend-scroll'}
      disabled={mobileModalOpen || !!selectedReport}
    >
      <div className="flex flex-col min-h-[100dvh] bg-surface relative pb-[env(safe-area-inset-bottom)]">
        
        {/* a11y: Skip to Content */}
        <a href="#main-content" className="skip-to-content">내용으로 건너뛰기</a>


      
      {/* Main Header — Logo + Nav integrated */}
      <header className="hidden md:block shrink-0 bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-xl border-b border-border sticky top-0 z-50" role="banner">
        <div className="w-full max-w-[2000px] mx-auto px-3 sm:px-6 md:px-10 lg:px-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-2 md:py-2.5 gap-2 md:gap-0">
            
            {/* Mobile: Top Bar */}
            <div className="md:hidden flex items-center justify-end w-full">
              <FloatingUserBar />
            </div>

            {/* Center: Nav Tabs (Segmented Control Style) */}
            <nav className="hidden md:flex shrink-0 items-center gap-1 sm:gap-1.5 bg-body/80 p-2 rounded-[18px] overflow-x-auto no-scrollbar" aria-label="메인 메뉴">
              <button
                onClick={() => startTransition(() => { setActiveTab('overview'); window.location.hash = 'overview'; })}
                className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-all duration-300 rounded-[12px] ${
                  activeTab === 'overview'
                    ? 'bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5 dark:ring-white/10'
                    : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:bg-surface/5'
                }`}
              >
                <LayoutDashboard size={18} className={activeTab === 'overview' ? 'text-primary' : 'text-tertiary group-hover:scale-110 transition-transform duration-200'} />
                <span>데이터 랩</span>
              </button>
              
              <button
                onClick={() => startTransition(() => { setActiveTab('imjang'); window.location.hash = 'imjang'; })}
                className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-all duration-300 rounded-[12px] ${
                  activeTab === 'imjang'
                    ? 'bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5 dark:ring-white/10'
                    : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:bg-surface/5'
                }`}
              >
                <Home size={18} className={activeTab === 'imjang' ? 'text-primary' : 'text-tertiary group-hover:scale-110 transition-transform duration-200'} />
                <span>아파트 탐색</span>
              </button>
              
              <button
                onClick={() => startTransition(() => { setActiveTab('gap'); window.location.hash = 'gap'; })}
                className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-all duration-300 rounded-[12px] ${
                  activeTab === 'gap'
                    ? 'bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5 dark:ring-white/10'
                    : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:bg-surface/5'
                }`}
              >
                <Coins size={18} className={activeTab === 'gap' ? 'text-primary' : 'text-tertiary group-hover:scale-110 transition-transform duration-200'} />
                <span>큐레이션</span>
              </button>

              <button
                onClick={() => startTransition(() => { setActiveTab('lounge'); window.location.hash = 'lounge'; })}
                className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-all duration-300 rounded-[12px] ${
                  activeTab === 'lounge'
                    ? 'bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5 dark:ring-white/10'
                    : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:bg-surface/5'
                }`}
              >
                <MessageSquare size={18} className={activeTab === 'lounge' ? 'text-primary' : 'text-tertiary group-hover:scale-110 transition-transform duration-200'} />
                <span>커뮤니티</span>
              </button>
              
            </nav>

            {/* Right: Desktop Extra Nav & User Bar */}
            <div className="hidden md:flex items-center justify-end gap-4">
              <FloatingUserBar />
            </div>
            
          </div>
        </div>
      </header>

      {/* 실시간 인기 아파트 티커 */}
      <TrendingTicker popularAptItems={popularAptItems} onSelectApt={handleAptClickByName} />

      {/* Main Container */}
      <main id="main-content" className="flex-1 w-full max-w-[2000px] mx-auto overflow-x-hidden animate-in fade-in duration-500">
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
              fieldReportsMap={fieldReportsMap}
              favoriteCounts={favoriteCounts}
              recent7DaysVolume={recent7DaysVolume}
              onOpenAdModal={() => setIsAdModalOpen(true)}
              onOpenCompare={() => {
                setCompareInitialApt(undefined);
                setIsCompareOpen(true);
              }}
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
              onToggleFavorite={handleAptToggleFavorite}
            />
          </section>
        )}

        {mounted && (
          <section className={`w-full bg-surface ${activeTab === 'gap' ? 'block' : 'hidden'}`}>
            <PageHeroHeader 
              title="D-VIEW 단지 큐레이션"
              subtitleStrong="입지 및 가치 기준 테마별 단지 추천"
              subtitleLight="동탄 실수요자와 투자자를 위한 맞춤형 단지 큐레이션 리포트"
            />
            <div className="w-full px-4 sm:px-6 md:px-10 lg:px-16 pt-3 md:pt-5 pb-16 flex flex-col gap-8">
              <ChopoomaCuration
                sheetApartments={sheetApartments}
                txSummaryData={txSummary}
                nameMapping={nameMapping || {}}
                publicRentalSet={publicRentalSet}
                locationScores={locationScores}
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
                  History.prototype.pushState.call(window.history, null, '', window.location.pathname + window.location.search + `#apt=${encodeURIComponent(name)}`);
                  setMobileModalOpen(true);
                }}
              />

              <GapInvestmentExplorer
                sheetApartments={sheetApartments}
                txSummaryData={txSummary}
                nameMapping={nameMapping || {}}
                publicRentalSet={publicRentalSet}
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
                  History.prototype.pushState.call(window.history, null, '', window.location.pathname + window.location.search + `#apt=${encodeURIComponent(name)}`);
                  setMobileModalOpen(true);
                }}
                onOpenAdModal={() => setIsAdModalOpen(true)}
              />

              <LocalEventCuration 
                txSummaryData={txSummary}
                onSelectApt={handleAptClickByName} 
              />
            </div>
          </section>
        )}

        {/* ═══ TAB 2: 커뮤니티 (라운지) ═══ */}
        {mounted && (
          <section className={`w-full bg-surface ${activeTab === 'lounge' ? 'block' : 'hidden'}`}>
            <LoungeContainerClient initialPosts={[]} onRequestLogin={handleRequestLogin} />
          </section>
        )}


        
        {/* 아파트 모달 (모든 화면 해상도에서 팝업으로 표시) */}
        {resolvedReport && mobileModalOpen && (
          <FieldReportModal
            report={resolvedReport}
            onClose={() => {
              setSelectedReport(null);
              setMobileModalOpen(false);
              
              const currentHash = window.location.hash;
              if (currentHash.includes('post=')) {
                const postMatch = currentHash.match(/#post=([^&]+)/);
                if (postMatch) {
                  window.history.replaceState(null, '', window.location.pathname + window.location.search + `#post=${postMatch[1]}`);
                  return;
                }
              }
              
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
            loadAllTransactions={loadAllTransactions}
            isPurchased={purchasedReportIds.includes(resolvedReport.id)}
            isAdmin={dashboardFacade.isAdmin(user?.email)}
            txSummary={aptTxSummary}
            onPurchaseComplete={() => {
              if (user) {
                refreshPurchasedReports();
              }
            }}
            onOpenAdModal={() => setIsAdModalOpen(true)}
            onRequestLogin={handleRequestLogin}
            onOpenCompare={(aptName) => {
              setCompareInitialApt(aptName);
              setIsCompareOpen(true);
            }}
          />
        )}


      </main>

      {showReviewModal && user && (
        <WriteReviewModal onClose={() => setShowReviewModal(false)} userUid={user.uid} />
      )}

      </div>
    </PullToRefresh>

    {!mobileModalOpen && showAdBlockBanner && (
      <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[480px] bg-slate-900/95 dark:bg-slate-950/95 text-white border border-emerald-500/30 rounded-2xl px-4 py-3.5 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 backdrop-blur-md">
        <div className="flex-1 flex items-start gap-2.5">
          <span className="text-[16px] shrink-0 mt-0.5 select-none">💚</span>
          <div className="flex flex-col gap-0.5">
            <p className="text-[13px] font-black tracking-tight text-emerald-400">
              광고 차단기를 사용 중이신가요?
            </p>
            <p className="text-[11.5px] text-slate-300 leading-normal font-medium">
              DVIEW는 독립적인 연구와 광고 수익으로 운영됩니다. 차단기 예외 등록(화이트리스트)을 해주시면 더 좋은 입지 분석 정보를 제공하는 데 큰 도움이 됩니다.
            </p>
          </div>
        </div>
        <div className="flex items-center shrink-0 ml-1">
          <button 
            onClick={handleAdBlockBannerClose}
            className="text-[11px] font-extrabold text-emerald-400 hover:text-emerald-300 px-2.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/20 hover:border-emerald-500/40 active:scale-95 transition-all focus:outline-none"
          >
            7일간 닫기
          </button>
        </div>
      </div>
    )}

    {!mobileModalOpen && (
      <MobileDock 
        activeTab={activeTab} 
        onTabClick={setActiveTab}
      />
    )}

    {isAdModalOpen && (
      <AdInquiryModal onClose={() => setIsAdModalOpen(false)} />
    )}

    {showNicknameModal && (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 backdrop-blur-md bg-white/70 dark:bg-black/70 animate-in fade-in duration-300">
        <div className="w-full max-w-md bg-surface text-primary rounded-[24px] shadow-2xl p-6 sm:p-8 border border-border transition-all animate-in zoom-in-95 duration-200">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-toss-blue/10 dark:bg-toss-blue/20 text-toss-blue rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={24} />
            </div>
            <h2 className="text-xl font-bold tracking-tight mb-2">반갑습니다! 닉네임을 설정해주세요</h2>
            <p className="text-sm text-tertiary">
              D-VIEW 서비스를 이용하기 위해 사용할 닉네임을 입력해주세요.
            </p>
          </div>

          <form onSubmit={handleNicknameSubmit} className="space-y-4">
            <div>
              <label htmlFor="nickname-input" className="block text-xs font-semibold text-secondary mb-1.5 ml-1">
                닉네임
              </label>
              <input
                id="nickname-input"
                type="text"
                placeholder="2~10자 한글, 영문, 숫자, _"
                value={newNickname}
                onChange={(e) => {
                  setNewNickname(e.target.value);
                  if (nicknameError) setNicknameError('');
                }}
                className="w-full bg-body text-primary border border-border focus:border-toss-blue rounded-[14px] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-toss-blue/20 transition-all font-semibold"
                autoComplete="off"
                required
                disabled={isSubmittingNickname}
              />
              {nicknameError && (
                <p className="text-xs text-red-500 font-semibold mt-2 ml-1 animate-in slide-in-from-top-1 duration-200">
                  {nicknameError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmittingNickname || !newNickname.trim()}
              className="w-full bg-toss-blue text-white rounded-[14px] py-3.5 text-sm font-bold shadow-lg shadow-toss-blue/10 hover:shadow-toss-blue/20 hover:bg-toss-blue-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmittingNickname ? '설정 중...' : '시작하기'}
            </button>
          </form>
        </div>
      </div>
    )}

    <LoginGateModal
      isOpen={isLoginGateOpen}
      onClose={() => setIsLoginGateOpen(false)}
      message={loginGateMessage}
      onLogin={handleLogin}
    />

    {isCompareOpen && (
      <AptCompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        initialAptName={compareInitialApt}
        sheetApartments={sheetApartments}
        txSummaryData={txSummary}
        nameMapping={nameMapping || {}}
        fieldReportsMap={fieldReportsMap}
        typeMap={typeMap}
      />
    )}
    </>
  );
}
