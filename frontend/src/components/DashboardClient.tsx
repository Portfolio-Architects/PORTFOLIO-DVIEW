'use client';

import { MessageSquare, LayoutDashboard, Home, Newspaper, Building2 } from 'lucide-react';
import Link from 'next/link';

import { dashboardFacade, FieldReportData } from '@/lib/DashboardFacade';
import FloatingUserBar from '@/components/FloatingUserBar';
import MobileDock from '@/components/pwa/MobileDock';
import PageHeroHeader from '@/components/PageHeroHeader';

import dynamic from 'next/dynamic';
import PullToRefresh from '@/components/pwa/PullToRefresh';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { safeReload } from '@/lib/utils/safeReload';
import { localCache } from '@/lib/utils/localCache';
import { ViewedAptsSchema } from '@/lib/validation/facade.schemas';
import { trackEvent } from '@/lib/utils/analytics';
import { logger } from '@/lib/services/logger';
import ApartmentModalSkeleton from '@/components/ui/ApartmentModalSkeleton';
import { type DongApartment } from '@/lib/dong-apartments';
import { type ObjectiveMetrics } from '@/lib/types/scoutingReport';

// LCP Optimization: Skeletons for Heavy Dynamic Components

const MacroDashboardSkeleton = () => (
  <div className="w-full flex flex-col bg-transparent animate-pulse px-4 sm:px-6 md:px-10 lg:px-16 pt-3">
    {/* Title */}
    <div className="min-h-[144px] py-6 flex flex-col gap-3">
      <div className="w-64 h-8 bg-black/5 dark:bg-surface/5 rounded-xl" />
      <div className="w-96 h-4 bg-black/5 dark:bg-surface/5 rounded-lg" />
    </div>
    {/* 4 Cards grid */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-24 bg-black/5 dark:bg-surface/5 rounded-2xl" />
      ))}
    </div>
    {/* Hybrid Chart & List */}
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 h-[380px] bg-black/5 dark:bg-surface/5 rounded-2xl" />
      <div className="w-full lg:w-[350px] h-[380px] bg-black/5 dark:bg-surface/5 rounded-2xl" />
    </div>
  </div>
);

const GapExplorerSkeleton = () => (
  <div className="w-full flex flex-col bg-transparent animate-pulse px-4 sm:px-6 md:px-10 lg:px-16 pt-3">
    {/* Title */}
    <div className="min-h-[144px] py-6 flex flex-col gap-3">
      <div className="w-56 h-8 bg-black/5 dark:bg-surface/5 rounded-xl" />
      <div className="w-80 h-4 bg-black/5 dark:bg-surface/5 rounded-lg" />
    </div>
    {/* Recommendation horizontally scrollable boxes */}
    <div className="flex gap-4 overflow-x-hidden mb-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="w-72 h-44 bg-black/5 dark:bg-surface/5 rounded-2xl shrink-0" />
      ))}
    </div>
    {/* Section Card */}
    <div className="w-full h-80 bg-black/5 dark:bg-surface/5 rounded-2xl" />
  </div>
);

const LoungeSkeleton = () => (
  <div className="w-full flex flex-col bg-transparent animate-pulse px-4 sm:px-6 md:px-10 lg:px-16 pt-3">
    {/* Title */}
    <div className="min-h-[144px] py-6 flex flex-col gap-3">
      <div className="w-40 h-8 bg-black/5 dark:bg-surface/5 rounded-xl" />
      <div className="w-64 h-4 bg-black/5 dark:bg-surface/5 rounded-lg" />
    </div>
    {/* Hot Talk boxes */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {[1, 2].map(i => (
        <div key={i} className="h-28 bg-black/5 dark:bg-surface/5 rounded-2xl" />
      ))}
    </div>
    {/* Feed list */}
    <div className="flex flex-col gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="w-full h-32 bg-black/5 dark:bg-surface/5 rounded-2xl" />
      ))}
    </div>
  </div>
);

const CalculatorLoader = ({ text }: { text: string }) => (
  <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/40 backdrop-blur-xl transition-all duration-300">
    <div className="bg-surface/75 dark:bg-surface/75 border border-border/50 p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center gap-5 text-center min-w-[280px] max-w-[320px] backdrop-blur-2xl">
      <div className="relative w-14 h-14 flex items-center justify-center">
        {/* outer spin */}
        <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-toss-blue animate-spin" style={{ animationDuration: '0.8s' }} />
        {/* inner reverse spin */}
        <div className="absolute inset-1.5 rounded-full border-[2px] border-transparent border-b-toss-blue/60 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.2s' }} />
        {/* center emerald diamond */}
        <div className="absolute flex items-center justify-center">
          <svg className="w-5 h-5 text-toss-blue animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3h12l4 6-10 13L2 9z" />
            <path d="M11 3 8 9l4 13 4-13-3-6" />
            <path d="M2 9h20" />
          </svg>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[15px] font-semibold text-primary tracking-tight">
          {text}
        </span>
        <span className="text-[12px] text-secondary/70">
          잠시만 기다려주세요
        </span>
      </div>
    </div>
  </div>
);

// Heavy components — loaded on demand (saves ~200KB initial JS)
const FieldReportModal = dynamic(() => import(/* webpackPreload: false */ '@/components/ApartmentModal').catch(err => {
  logger.warn('DashboardClient.dynamic', 'FieldReportModal Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('FieldReportModal');
  return { default: () => null };
}), { 
  ssr: false,
  loading: () => <ApartmentModalSkeleton />
});
const WriteReviewModal = dynamic(() => import(/* webpackPreload: false */ '@/components/WriteReviewModal').catch(err => {
  logger.warn('DashboardClient.dynamic', 'WriteReviewModal Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('WriteReviewModal');
  return { default: () => null };
}), { 
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/40 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="bg-surface/75 dark:bg-surface/75 border border-border/50 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 text-center min-w-[280px]">
        <div className="w-10 h-10 rounded-full border-2 border-toss-blue/20 border-t-toss-blue animate-spin" />
        <span className="text-[14px] font-semibold text-primary">리뷰 작성기 로드 중</span>
      </div>
    </div>
  )
});


const LoungeContainerClient = dynamic(() => import(/* webpackPreload: false */ '@/components/LoungeContainerClient').catch(err => {
  logger.warn('DashboardClient.dynamic', 'LoungeContainerClient Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('LoungeContainerClient');
  return { default: () => null };
}), { 
  ssr: false,
  loading: () => <LoungeSkeleton />
});

const OfficeExplorerClient = dynamic(() => import(/* webpackPreload: false */ '@/components/OfficeExplorerClient').catch(err => {
  logger.warn('DashboardClient.dynamic', 'OfficeExplorerClient Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('OfficeExplorerClient');
  return { default: () => null };
}), { 
  ssr: false,
  loading: () => <div className="w-full h-80 bg-black/5 dark:bg-surface/5 rounded-2xl animate-pulse" />
});
const AptCompareModal = dynamic(() => import(/* webpackPreload: false */ '@/components/consumer/AptCompareModal').catch(err => {
  logger.warn('DashboardClient.dynamic', 'AptCompareModal Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('AptCompareModal');
  return { default: () => null };
}), {
  ssr: false,
  loading: () => <CalculatorLoader text="비교 대시보드 로드 중" />
});
const JeonseSafetyCalculator = dynamic(() => import(/* webpackPreload: false */ '@/components/consumer/JeonseSafetyCalculator').catch(err => {
  logger.warn('DashboardClient.dynamic', 'JeonseSafetyCalculator Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('JeonseSafetyCalculator');
  return { default: () => null };
}), {
  ssr: false,
  loading: () => <CalculatorLoader text="전세 안전진단 계산기 로드 중" />
});
const MortgageCalculator = dynamic(() => import(/* webpackPreload: false */ '@/components/consumer/MortgageCalculator').catch(err => {
  logger.warn('DashboardClient.dynamic', 'MortgageCalculator Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('MortgageCalculator');
  return { default: () => null };
}), {
  ssr: false,
  loading: () => <CalculatorLoader text="대출 계산기 로드 중" />
});

const PropertyTaxCalculator = dynamic(() => import(/* webpackPreload: false */ '@/components/consumer/PropertyTaxCalculator').catch(err => {
  logger.warn('DashboardClient.dynamic', 'PropertyTaxCalculator Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('PropertyTaxCalculator');
  return { default: () => null };
}), {
  ssr: false,
  loading: () => <CalculatorLoader text="취득세 계산기 로드 중" />
});

const SellTimingCalculator = dynamic(() => import(/* webpackPreload: false */ '@/components/consumer/SellTimingCalculator').catch(err => {
  logger.warn('DashboardClient.dynamic', 'SellTimingCalculator Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('SellTimingCalculator');
  return { default: () => null };
}), {
  ssr: false,
  loading: () => <CalculatorLoader text="매도 진단기 로드 중" />
});

interface StaticApartment { name: string; dong: string; householdCount?: number; yearBuilt?: string; brand?: string; }
import { isSameApartment, normalizeAptName, findTxKey } from '@/lib/utils/apartmentMapping';
import React, { useState, useEffect, useMemo, useRef, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { getDisplayName } from '@/lib/types/user.types';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardMeta, type DashboardInitialDataLocal } from '@/hooks/useDashboardMeta';
import MacroDashboardClient from '@/components/MacroDashboardClient';
import { useFavorites } from '@/hooks/useFavorites';
import { useApartmentDetails } from '@/hooks/useApartmentDetails';
import { useComments } from '@/hooks/useComments';
import { usePWA } from '@/components/pwa/PWAProvider';
import { useTxData, useLocationScores } from '@/hooks/useStaticData';
import LoginGateModal from '@/components/ui/LoginGateModal';
import * as UserRepo from '@/lib/repositories/user.repository';
import { isValidNickname } from '@/lib/services/nickname.service';
import { preloadApartmentModal, preloadDashboardFeatures } from '@/lib/utils/preloadHelpers';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const EMPTY_OBJECT: Record<string, never> = {};
const EMPTY_SET = new Set<string>();
const EMPTY_ARRAY: never[] = [];

const DashboardClient = React.memo(function DashboardClient({ 
  initialDashboardData, 
  preselectedAptName,
  initialTab = 'overview'
}: { 
  initialDashboardData?: DashboardInitialDataLocal, 
  preselectedAptName?: string,
  initialTab?: 'overview' | 'imjang' | 'office' | 'lounge' | 'technovalley'
}) {
  const router = useRouter();
  const kpis = initialDashboardData?.kpis || [];
  const fieldReports = initialDashboardData?.fieldReports || [];
  const adBanner = dashboardFacade.getAdBanner();
  // Moduled Hooks Architecture
  const { user, userProfile, anonProfile, handleLogin, handleLogout } = useAuth();
  const { sheetApartments, typeMap, nameMapping, publicRentalSet, triggerFetch, isLoading } = useDashboardMeta(initialDashboardData);
  const { userFavorites, favoriteCounts, handleToggleFavorite, updateFavoriteOrder, isFavoritesLoading } = useFavorites(user, initialDashboardData?.favoriteCounts);
  
  const [mounted, setMounted] = useState(false);
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  
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
      if (mountedRef.current) {
        window.location.reload();
      }
    } catch (error) {
      logger.error('DashboardClient.handleNicknameSubmit', 'Failed to set nickname', undefined, error);
      if (mountedRef.current) {
        setNicknameError('닉네임 설정 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      if (mountedRef.current) {
        setIsSubmittingNickname(false);
      }
    }
  };

  const [selectedReport, setSelectedReport] = useState<FieldReportData | null>(null);
  
  // 1:1 아파트 비교 대시보드 상태
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareInitialApt, setCompareInitialApt] = useState<string | undefined>(undefined);
  
  // 전세 안전진단 계산기 상태
  const [isJeonseSafetyOpen, setIsJeonseSafetyOpen] = useState(false);
  const [jeonseSafetyInitialApt, setJeonseSafetyInitialApt] = useState<string | undefined>(undefined);
  
  // 대출 계산기 상태
  const [isMortgageOpen, setIsMortgageOpen] = useState(false);
  const [mortgageInitialApt, setMortgageInitialApt] = useState<string | undefined>(undefined);
  
  // 취득세 계산기 상태
  const [isTaxCalcOpen, setIsTaxCalcOpen] = useState(false);
  const [taxCalcInitialApt, setTaxCalcInitialApt] = useState<string | undefined>(undefined);

  // AI 매도 계산기 상태
  const [isSellTimingOpen, setIsSellTimingOpen] = useState(false);
  const [sellTimingInitialApt, setSellTimingInitialApt] = useState<string | undefined>(undefined);
  
  const [isLoginGateOpen, setIsLoginGateOpen] = useState(false);
  const [loginGateMessage, setLoginGateMessage] = useState('');

  const handleRequestLogin = useCallback((message: string) => {
    setLoginGateMessage(message);
    setIsLoginGateOpen(true);
  }, []);
  
  const { txSummary = EMPTY_OBJECT, recentTransactions = [], macroTrend = [], recent7DaysVolume, isLoading: isStaticDataLoading } = useTxData(
    initialDashboardData?.macroTrend,
    initialDashboardData?.txSummary,
    initialDashboardData?.recent7DaysVolume,
    initialDashboardData?.recentTransactions
  );

  const filteredRecentTransactions = useMemo(() => {
    if (!recentTransactions || recentTransactions.length === 0 || !nameMapping) return recentTransactions;
    
    const targetTxKeys = new Set<string>();
    for (const [_, tKey] of Object.entries(nameMapping)) {
      if (tKey) {
        targetTxKeys.add(normalizeAptName(tKey));
      }
    }

    return recentTransactions.filter((tx: { txKey?: string }) => {
      if (!tx || !tx.txKey) return false;
      const normTxKey = normalizeAptName(tx.txKey);
      return targetTxKeys.has(normTxKey);
    });
  }, [recentTransactions, nameMapping]);

  const { locationScores = EMPTY_OBJECT } = useLocationScores();
  
  const getLocScore = useCallback((aptName: string) => {
    if (!aptName || !locationScores) return {};
    const matchKey = findTxKey(aptName, locationScores, nameMapping);
    return matchKey ? locationScores[matchKey] : {};
  }, [locationScores, nameMapping]);
  
  const { txSummaryData, fullReportData, modalTransactions, isLoadingDetail, isTxLoading, resolvedReport, aptTxSummary, loadAllTransactions, preloadApartmentTx } = useApartmentDetails(
    selectedReport, sheetApartments, nameMapping, user, txSummary, locationScores
  );
  
  const { commentsData, commentInput, setCommentInput, handleSubmitComment } = useComments(
    selectedReport, fullReportData, user, handleLogin
  );

  const { triggerCustomA2HSModal } = usePWA();

  const [activeTab, setActiveTab] = useState<'overview' | 'imjang' | 'office' | 'lounge' | 'technovalley'>(initialTab);
  const [isPending, startTransition] = useTransition();

  // Tab highlight logic removed since boxes are separated now

  // Trigger lazy fetching of detailed sheets data on relevant tab switches or deep-links
  useEffect(() => {
    if (activeTab === 'office' || activeTab === 'imjang') {
      triggerFetch();
    } else if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('apt=') || hash.includes('office') || hash.includes('gap') || hash.includes('imjang')) {
        triggerFetch();
      }
    }
  }, [activeTab, triggerFetch]);

  const fieldReportsMap = useMemo(() => {
    const map = new Map<string, FieldReportData>();
    if (!fieldReports || !sheetApartments) return map;
    const allApts = Object.values(sheetApartments).flat();
    allApts.forEach(apt => {
      const report = fieldReports.find(r => isSameApartment(r.apartmentName, apt.name, nameMapping));
      if (report) map.set(apt.name, report);
    });
    return map;
  }, [fieldReports, sheetApartments, nameMapping]);

  const hashStateRef = useRef<{
    mounted: boolean;
    sheetApartments: Record<string, DongApartment[]> | undefined;
    fieldReportsMap: Map<string, FieldReportData> | null;
    nameMapping: Record<string, string> | undefined;
  }>({
    mounted: false,
    sheetApartments: undefined,
    fieldReportsMap: null,
    nameMapping: undefined
  });
  useEffect(() => {
    hashStateRef.current = { mounted, sheetApartments, fieldReportsMap, nameMapping };
  }, [mounted, sheetApartments, fieldReportsMap, nameMapping]);


  useEffect(() => {
    let isMounted = true;
    mountedRef.current = true;
    setMounted(true);
    let idleId: number | null = null;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const searchParam = params.get('search') || params.get('q');
      const hasCurationParams = params.has('chopoomaStep') || params.has('maxGap');

      if (tabParam === 'imjang' || searchParam) {
        const destUrl = `/explore` + (searchParam ? `?search=${encodeURIComponent(searchParam)}` : '');
        router.replace(destUrl);
        return;
      }

      if (window.location.hash.startsWith('#imjang')) {
        router.replace('/explore');
        return;
      } else if (window.location.hash.startsWith('#office') || window.location.hash.startsWith('#gap') || tabParam === 'office' || tabParam === 'gap' || hasCurationParams) {
        setActiveTab('office');
      } else if (window.location.hash.startsWith('#lounge') || window.location.hash.startsWith('#post=') || window.location.hash.startsWith('#notice=') || tabParam === 'lounge' || tabParam === 'talk' || tabParam === 'news' || tabParam === 'notices') {
        setActiveTab('lounge');
      }

      // Preload heavy chunks during idle time to improve LCP & Interaction responsiveness
      const preloadHeavyComponents = () => {
        if (!isMounted) return;
        preloadApartmentModal();
        preloadDashboardFeatures();
      };
      if (process.env.NODE_ENV === 'production') {
        if (window.requestIdleCallback) {
          idleId = window.requestIdleCallback(preloadHeavyComponents, { timeout: 2000 });
        } else {
          if (preloadTimeoutRef.current) {
            clearTimeout(preloadTimeoutRef.current);
            preloadTimeoutRef.current = null;
          }
          preloadTimeoutRef.current = setTimeout(() => {
            preloadHeavyComponents();
            preloadTimeoutRef.current = null;
          }, 1000);
        }
      }

      const handleHashChange = () => {
        const queryParams = new URLSearchParams(window.location.search);
        const queryTab = queryParams.get('tab');
        const hasCuration = queryParams.has('chopoomaStep') || queryParams.has('maxGap');

        if (!isMounted) return;
        startTransition(() => {
          if (window.location.hash.startsWith('#lounge') || window.location.hash.startsWith('#post=') || window.location.hash.startsWith('#notice=') || queryTab === 'lounge') {
            setActiveTab('lounge');
          } else if (window.location.hash.startsWith('#imjang') || queryTab === 'imjang') {
            setActiveTab('imjang');
          } else if (window.location.hash.startsWith('#office') || window.location.hash.startsWith('#gap') || queryTab === 'office' || queryTab === 'gap' || hasCuration) {
            setActiveTab('office');
          } else if (window.location.hash.startsWith('#overview') || window.location.hash === '' || queryTab === 'overview') {
            setActiveTab('overview');
          }
        });
      };
      window.addEventListener('hashchange', handleHashChange, { passive: true });

      let scrollTimeout: number | null = null;
      const handleScroll = () => {
        if (scrollTimeout) return;
        scrollTimeout = window.requestAnimationFrame(() => {
          if (isMounted) {
            setIsScrolled(window.scrollY > 200);
          }
          scrollTimeout = null;
        });
      };
      window.addEventListener('scroll', handleScroll, { passive: true });



      return () => {
        isMounted = false;
        mountedRef.current = false;
        if (idleId !== null && window.cancelIdleCallback) {
          window.cancelIdleCallback(idleId);
        }
        window.removeEventListener('hashchange', handleHashChange);
        window.removeEventListener('scroll', handleScroll);
        if (scrollTimeout) window.cancelAnimationFrame(scrollTimeout);

        if (preloadTimeoutRef.current) {
          clearTimeout(preloadTimeoutRef.current);
          preloadTimeoutRef.current = null;
        }
      };
    }
  }, []);

  // Handle #apt= hash to open modal automatically (e.g. from Kakao Share)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkHashForApt = () => {
      const { mounted: m, sheetApartments: apartments, fieldReportsMap: reportsMap, nameMapping: mapping } = hashStateRef.current;
      if (!m || !apartments || !reportsMap) return;
      
      const match = window.location.hash.match(/[#&]apt=([^&]+)/);
      if (match) {
        const aptName = decodeURIComponent(match[1]);
        const allApts = Object.values(apartments).flat() as DongApartment[];
        const targetApt = allApts.find(a => isSameApartment(a.name, aptName, mapping));
        
        if (targetApt) {
          userHasSelected.current = true;
          const report = reportsMap.get(targetApt.name);
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
              metrics: { ...targetApt, ...(getLocScore(targetApt.name) || {}) } as unknown as ObjectiveMetrics,
            });
          }
          setMobileModalOpen(true);
        }
      }
    };

    if (mounted && sheetApartments) {
      checkHashForApt();
    }
    
    window.addEventListener('hashchange', checkHashForApt, { passive: true });
    return () => window.removeEventListener('hashchange', checkHashForApt);
  }, [mounted, !!sheetApartments]);

  const [isScrolled, setIsScrolled] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);


  const [mobileModalOpen, setMobileModalOpen] = useState(false);

  // Scroll to top when tab changes & track event
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (mounted) {
      trackEvent('tab_view', { tab_name: activeTab });
    }
  }, [activeTab, mounted]);

  const userHasSelected = useRef(false);

  useEffect(() => {
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
        setSelectedReport(report || {
          id: `stub-${normalizeAptName(targetApt.name)}`,
          apartmentName: targetApt.name,
          dong: targetApt.dong,
          author: '',
          likes: 0,
          commentCount: 0,
          createdAt: null,
          metrics: { ...targetApt, ...(getLocScore(targetApt.name) || {}) } as unknown as import('@/lib/types/scoutingReport').ObjectiveMetrics,
        });
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          setMobileModalOpen(true);
        }
      }
      return; 
    }

    if (typeof window !== 'undefined' && window.innerWidth < 768) return;
    // Auto-select is disabled so that the Ad slot placeholder remains visible on desktop until a user actively clicks an apartment.
  }, [fieldReports, preselectedAptName]);

  // Handle Browser Back Button for soft-navigation URL routing
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      // If we go back to the root (no hash), clear selection (soft close)
      if (!window.location.hash && (window.location.pathname === '/' || window.location.pathname === '')) {
        setSelectedReport(null);
        setMobileModalOpen(false);
        userHasSelected.current = true;
      }
    };
    window.addEventListener('popstate', handlePopState, { passive: true });
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setSelectedReport]);

  const handleAptClick = useCallback((apt: StaticApartment) => {
    userHasSelected.current = true;
    triggerFetch(); // Trigger lazy fetching of detailed metadata (typeMap, sheetApartments) immediately on modal entry
    const report = fieldReportsMap.get(apt.name);
    const initialReport = report || {
      id: `stub-${normalizeAptName(apt.name)}`,
      apartmentName: apt.name,
      dong: apt.dong,
      author: '',
      likes: 0,
      commentCount: 0,
      createdAt: null,
      metrics: { ...apt, ...(getLocScore(apt.name) || {}) } as unknown as import('@/lib/types/scoutingReport').ObjectiveMetrics,
    };
    setSelectedReport(initialReport);

    // Backfill detailed metrics asynchronously if missing (e.g. when entered from quiz before explore data loads)
    if (!apt.householdCount) {
      fetch('/api/apartments-by-dong')
        .then(res => res.json())
        .then(data => {
          if (data && data.byDong) {
            const allApts = Object.values(data.byDong).flat() as DongApartment[];
            const targetApt = allApts.find(a => isSameApartment(a.name, apt.name, nameMapping, a.dong, apt.dong));
            if (targetApt && targetApt.householdCount) {
              setSelectedReport(prev => {
                if (!prev || prev.apartmentName !== apt.name) return prev;
                return {
                  ...prev,
                  metrics: {
                    ...prev.metrics,
                    ...targetApt,
                    ...(getLocScore(apt.name) || {})
                  } as unknown as import('@/lib/types/scoutingReport').ObjectiveMetrics,
                };
              });
            }
          }
        })
        .catch(err => logger.warn('DashboardClient.handleAptClick', 'Failed to backfill apartment details', undefined, err));
    }

    // Record viewed history for AI recommendation engine
    if (typeof window !== 'undefined') {
      try {
        const history = localCache.get('dview_viewed_apts', ViewedAptsSchema, []);
        const updated = [apt.name, ...history.filter((h: string) => h !== apt.name)].slice(0, 10);
        localCache.set('dview_viewed_apts', updated, 604800); // 7 days TTL
        window.dispatchEvent(new Event('dview_viewed_apts_changed'));
      } catch (e) {
        logger.warn('DashboardClient.handleAptClick', 'LocalStorage write error', undefined, e);
      }
    }

    // Bypass Next.js completely to avoid any Suspense/Router triggers by pushing a hash state natively
    History.prototype.pushState.call(window.history, null, '', window.location.pathname + window.location.search + `#apt=${encodeURIComponent(apt.name)}`);
    setMobileModalOpen(true);
  }, [fieldReportsMap, setSelectedReport, nameMapping, getLocScore, triggerFetch]);

  const handleAptClickByName = useCallback((name: string, dong?: string) => {
    const allApts = Object.values(sheetApartments).flat();
    const targetApt = allApts.find(a => isSameApartment(a.name, name, nameMapping, a.dong, dong));
    if (targetApt) {
      handleAptClick(targetApt);
    } else {
      handleAptClick({ name, dong: dong || '' });
    }
  }, [sheetApartments, nameMapping, handleAptClick]);

  const handleOpenAdModal = useCallback(() => {}, []);

  const handleOpenCompare = useCallback((aptName?: string) => {
    setCompareInitialApt(aptName);
    setIsCompareOpen(true);
  }, []);

  const handleOpenJeonseSafety = useCallback((aptName?: string) => {
    setJeonseSafetyInitialApt(aptName);
    setIsJeonseSafetyOpen(true);
  }, []);

  const handleOpenMortgage = useCallback((aptName?: string) => {
    setMortgageInitialApt(aptName);
    setIsMortgageOpen(true);
  }, []);

  const handleOpenTaxCalculator = useCallback((aptName?: string) => {
    setTaxCalcInitialApt(aptName);
    setIsTaxCalcOpen(true);
  }, []);

  const handleOpenSellTimingCalculator = useCallback((aptName?: string) => {
    setSellTimingInitialApt(aptName);
    setIsSellTimingOpen(true);
  }, []);

  const handleCloseMobileModal = useCallback(() => {
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
  }, [setSelectedReport]);

  const handleCommentChange = useCallback((text: string) => {
    if (!resolvedReport) return;
    setCommentInput(prev => ({ ...prev, [resolvedReport.id]: text }));
  }, [resolvedReport?.id, setCommentInput]);

  const handleSubmitCommentCallback = useCallback(() => {
    if (!resolvedReport) return;
    handleSubmitComment(resolvedReport.id);
  }, [resolvedReport?.id, handleSubmitComment]);

  const handleAptToggleFavorite = useCallback((aptName: string) => {
    handleToggleFavorite(aptName, () => handleRequestLogin('관심 단지를 등록하여 실거래가 변동 알림을 받아보세요.'));
    if (user && !userFavorites.has(aptName)) {
      triggerCustomA2HSModal();
    }
  }, [handleToggleFavorite, handleRequestLogin, user, userFavorites, triggerCustomA2HSModal]);

  // Note: Unused apartment calculations removed to offload CPU and keep bundle thin (TossApartmentExploreClient handles explore view now)

  const memoizedTabContents = useMemo(() => {
    return (
      <>
        {/* ═══ TAB 0: 마크로 대시보드 ═══ */}
        <section className={`w-full bg-transparent pb-8 md:pb-0 mb-4 md:mb-0 ${activeTab === 'overview' ? 'block' : 'hidden'}`}>
          {activeTab === 'overview' && (
            <ErrorBoundary name="마크로 대시보드">
              <MacroDashboardClient 
                sheetApartments={sheetApartments} 
                txSummaryData={txSummaryData}
                recentTransactions={filteredRecentTransactions}
                macroTrendData={macroTrend}
                nameMapping={nameMapping || EMPTY_OBJECT}
                updateFavoriteOrder={updateFavoriteOrder}
                publicRentalSet={publicRentalSet}
                userFavorites={userFavorites}
                isFavoritesLoading={isFavoritesLoading}
                fieldReportsMap={fieldReportsMap}
                favoriteCounts={favoriteCounts}
                recent7DaysVolume={recent7DaysVolume}
                typeMap={typeMap}
                onOpenAdModal={handleOpenAdModal}
                onOpenCompare={handleOpenCompare}
                onOpenJeonseSafety={handleOpenJeonseSafety}
                onOpenMortgage={handleOpenMortgage}
                onOpenTaxCalculator={handleOpenTaxCalculator}
                onOpenSellTimingCalculator={handleOpenSellTimingCalculator}
                onSelectApt={handleAptClickByName}
                preloadApartmentTx={preloadApartmentTx}
              />
            </ErrorBoundary>
          )}
        </section>


        {/* ═══ TAB 1-2: 사무실 탐색 ═══ */}
        <section className={`w-full bg-transparent ${activeTab === 'office' ? 'block' : 'hidden'}`}>
          {activeTab === 'office' && (
            !mounted ? (
              <div className="w-full h-80 bg-black/5 dark:bg-surface/5 rounded-2xl animate-pulse" />
            ) : (
              <OfficeExplorerClient />
            )
          )}
        </section>

        {/* ═══ TAB 2: 커뮤니티 (라운지) ═══ */}
        <section className={`w-full bg-transparent ${activeTab === 'lounge' ? 'block' : 'hidden'}`}>
          {activeTab === 'lounge' && (
            !mounted ? (
              <LoungeSkeleton />
            ) : (
              <LoungeContainerClient initialPosts={EMPTY_ARRAY} onRequestLogin={handleRequestLogin} />
            )
          )}
        </section>
      </>
    );
  }, [
    activeTab,
    mounted,
    sheetApartments,
    txSummaryData,
    macroTrend,
    nameMapping,
    updateFavoriteOrder,
    publicRentalSet,
    userFavorites,
    isFavoritesLoading,
    fieldReportsMap,
    favoriteCounts,
    recent7DaysVolume,
    typeMap,
    txSummary,
    locationScores,
    handleOpenAdModal,
    handleOpenCompare,
    handleOpenJeonseSafety,
    handleOpenMortgage,
    handleOpenTaxCalculator,
    handleOpenSellTimingCalculator,
    handleAptClickByName,
    handleRequestLogin
  ]);

  return (
    <>
    <PullToRefresh 
      scrollContainerId={activeTab === 'imjang' ? 'apartment-list-scroll' : activeTab === 'office' ? 'office-scroll' : 'recommend-scroll'}
      disabled={mobileModalOpen || !!selectedReport}
    >
      <div className="flex flex-col min-h-[100dvh] bg-transparent relative pb-[env(safe-area-inset-bottom)]">
        
        {/* a11y: Skip to Content */}
        <a href="#main-content" className="skip-to-content">내용으로 건너뛰기</a>


      
      {/* Main Header — Logo + Nav integrated */}
      <header className="hidden md:block shrink-0 bg-surface border-b border-border sticky top-0 z-50" role="banner">
        <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between h-[80px] gap-4 md:gap-0">
            
            {/* Mobile: Top Bar */}
            <div className="md:hidden flex items-center justify-end w-full">
              <FloatingUserBar />
            </div>

            {/* Center: Nav Tabs (Segmented Control Style - Separated Boxes) */}
            <div className="hidden md:flex shrink-0 items-center gap-3" aria-label="메인 메뉴">
              
              {/* Box 1: 테크노 랩 내비 */}
              <nav aria-label="테크노 랩 메뉴" className="flex items-center gap-1 bg-body p-1.5 rounded-[18px] border border-border/40">
                <Link
                  href="/"
                  className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-all duration-300 rounded-[12px] ${
                    activeTab === 'technovalley'
                      ? 'bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5 dark:ring-white/10'
                      : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <LayoutDashboard size={18} className={activeTab === 'technovalley' ? 'text-primary' : 'text-tertiary group-hover:scale-110 transition-transform duration-200'} />
                  <span>테크노 랩</span>
                </Link>

                <button
                  onClick={() => startTransition(() => { setActiveTab('office'); window.location.hash = 'office'; })}
                  className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-all duration-300 rounded-[12px] ${
                    activeTab === 'office'
                      ? 'bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5 dark:ring-white/10'
                      : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <Building2 size={18} className={activeTab === 'office' ? 'text-primary' : 'text-tertiary group-hover:scale-110 transition-transform duration-200'} />
                  <span>사무실 탐색</span>
                </button>
              </nav>

              {/* Box 2: 라운지 */}
              <nav aria-label="라운지 메뉴" className="flex items-center bg-body p-1.5 rounded-[18px] border border-border/40">
                <button
                  onClick={() => startTransition(() => { setActiveTab('lounge'); window.location.hash = 'lounge'; })}
                  className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-all duration-300 rounded-[12px] ${
                    activeTab === 'lounge'
                      ? 'bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5 dark:ring-white/10'
                      : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <MessageSquare size={18} className={activeTab === 'lounge' ? 'text-primary' : 'text-tertiary group-hover:scale-110 transition-transform duration-200'} />
                  <span>동탄 라운지</span>
                </button>
              </nav>

              {/* Box 3: 아파트 내비 */}
              <nav aria-label="아파트 메뉴" className="flex items-center gap-1 bg-body p-1.5 rounded-[18px] border border-border/40">
                <button
                  onClick={() => startTransition(() => { setActiveTab('overview'); window.location.hash = 'overview'; })}
                  className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-all duration-300 rounded-[12px] ${
                    activeTab === 'overview'
                      ? 'bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5 dark:ring-white/10'
                      : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <Building2 size={18} className={activeTab === 'overview' ? 'text-primary' : 'text-tertiary group-hover:scale-110 transition-transform duration-200'} />
                  <span>아파트 랩</span>
                </button>

                <button
                  onClick={() => router.push('/explore')}
                  className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-all duration-300 rounded-[12px] ${
                    activeTab === 'imjang'
                      ? 'bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5 dark:ring-white/10'
                      : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <Home size={18} className={activeTab === 'imjang' ? 'text-primary' : 'text-tertiary group-hover:scale-110 transition-transform duration-200'} />
                  <span>아파트 탐색</span>
                </button>
              </nav>

            </div>

            {/* Right: Desktop Extra Nav & User Bar */}
            <div className="hidden md:flex items-center justify-end gap-4">
              <FloatingUserBar />
            </div>
            
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main 
        id="main-content" 
        className="flex-1 w-full max-w-[2000px] mx-auto overflow-x-hidden animate-in fade-in duration-500"
      >
        <div className={mobileModalOpen ? "invisible" : ""}>
          {memoizedTabContents}
        </div>


        {/* 아파트 모달 (모든 화면 해상도에서 팝업으로 표시) */}
        {resolvedReport && mobileModalOpen && (
          <FieldReportModal
            report={resolvedReport}
            onClose={handleCloseMobileModal}
            comments={commentsData[resolvedReport.id] || []}
            commentInput={commentInput[resolvedReport.id] || ''}
            onCommentChange={handleCommentChange}
            onSubmitComment={handleSubmitCommentCallback}
            user={user}
            transactions={modalTransactions}
            isTxLoading={isTxLoading}
            typeMap={typeMap}
            inline={false}
            isLoadingDetail={isLoadingDetail}
            loadAllTransactions={loadAllTransactions}
            isAdmin={dashboardFacade.isAdmin(user?.email)}
            txSummary={aptTxSummary}
            onRequestLogin={handleRequestLogin}
            onOpenCompare={handleOpenCompare}
            onOpenJeonseSafety={handleOpenJeonseSafety}
            onOpenMortgage={handleOpenMortgage}
            onOpenTaxCalculator={handleOpenTaxCalculator}
            onOpenSellTimingCalculator={handleOpenSellTimingCalculator}
          />
        )}


      </main>

      {showReviewModal && user && (
        <WriteReviewModal onClose={() => setShowReviewModal(false)} userUid={user.uid} />
      )}

      </div>
    </PullToRefresh>

    {!mobileModalOpen && (
      <MobileDock 
        activeTab={activeTab} 
        onTabClick={(tab) => {
          if (tab !== 'lounge' && tab !== 'technovalley' && tab !== 'imjang') {
            setActiveTab(tab);
          }
        }}
      />
    )}



    {showNicknameModal && (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 backdrop-blur-md bg-white/70 dark:bg-black/70 animate-in fade-in duration-300">
        <div className="w-full max-w-md bg-surface text-primary rounded-[24px] shadow-2xl p-6 sm:p-8 border border-border transition-all animate-in zoom-in-95 duration-200">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-[#c44d00]/10 dark:bg-[#ea6100]/10 text-[#c44d00] dark:text-[#ea6100] rounded-full flex items-center justify-center mx-auto mb-4">
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
                className="w-full bg-body text-primary border border-border focus:border-[#c44d00] dark:focus:border-[#ea6100] rounded-[14px] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c44d00]/20 dark:focus:ring-[#ea6100]/20 transition-all font-semibold"
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
              className="w-full bg-[#c44d00] hover:bg-[#9e3c00] dark:bg-[#ff8f00] dark:hover:bg-[#c44d00] text-white rounded-[14px] py-3.5 text-sm font-bold shadow-lg shadow-[#c44d00]/10 dark:shadow-[#ff8f00]/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
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
      <ErrorBoundary
        name="아파트 비교 분석"
        fallback={(error, reset) => {
          if (error && (error.name === 'ChunkLoadError' || error.message?.includes('Loading chunk') || error.message?.includes('Failed to fetch dynamically imported module'))) {
            safeReload('AptCompareModal_DashboardBoundary');
            return null;
          }
          return (
            <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-surface w-full max-w-[400px] rounded-2xl shadow-xl border border-border p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                  <span className="text-xl font-black">!</span>
                </div>
                <h3 className="text-[15px] font-black text-primary mb-1">비교 분석기 로드 실패</h3>
                <p className="text-[12px] font-medium text-tertiary mb-5 leading-normal">
                  비교 분석기를 불러오는 도중 오류가 발생했습니다. 다시 시도해 주시기 바랍니다.
                </p>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={reset}
                    className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-extrabold text-[12px] rounded-xl transition-all cursor-pointer border-none"
                  >
                    다시 시도
                  </button>
                  <button
                    onClick={() => setIsCompareOpen(false)}
                    className="px-4 py-2.5 bg-body hover:bg-border/30 text-secondary font-bold text-[12px] rounded-xl border border-border/20 transition-all cursor-pointer"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          );
        }}
      >
        <AptCompareModal
          isOpen={isCompareOpen}
          onClose={() => setIsCompareOpen(false)}
          initialAptName={compareInitialApt}
          sheetApartments={sheetApartments}
          txSummaryData={txSummary}
          nameMapping={nameMapping || {}}
          fieldReportsMap={fieldReportsMap}
          typeMap={typeMap}
          locationScores={locationScores}
        />
      </ErrorBoundary>
    )}

    {isJeonseSafetyOpen && (
      <ErrorBoundary
        name="전세 안전진단"
        fallback={(error, reset) => {
          if (error && (error.name === 'ChunkLoadError' || error.message?.includes('Loading chunk') || error.message?.includes('Failed to fetch dynamically imported module'))) {
            safeReload('JeonseSafetyCalculator_DashboardBoundary');
            return null;
          }
          return (
            <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-surface w-full max-w-[400px] rounded-2xl shadow-xl border border-border p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                  <span className="text-xl font-black">!</span>
                </div>
                <h3 className="text-[15px] font-black text-primary mb-1">전세 안전진단 로드 실패</h3>
                <p className="text-[12px] font-medium text-tertiary mb-5 leading-normal">
                  전세 안전진단 계산기를 불러오는 도중 오류가 발생했습니다. 다시 시도해 주시기 바랍니다.
                </p>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={reset}
                    className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-extrabold text-[12px] rounded-xl transition-all cursor-pointer border-none"
                  >
                    다시 시도
                  </button>
                  <button
                    onClick={() => setIsJeonseSafetyOpen(false)}
                    className="px-4 py-2.5 bg-body hover:bg-border/30 text-secondary font-bold text-[12px] rounded-xl border border-border/20 transition-all cursor-pointer"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          );
        }}
      >
        <JeonseSafetyCalculator
          isOpen={isJeonseSafetyOpen}
          onClose={() => setIsJeonseSafetyOpen(false)}
          initialAptName={jeonseSafetyInitialApt}
          sheetApartments={sheetApartments}
          txSummaryData={txSummary}
          nameMapping={nameMapping || {}}
          fieldReportsMap={fieldReportsMap}
        />
      </ErrorBoundary>
    )}

    {isMortgageOpen && (
      <ErrorBoundary
        name="대출 한도진단"
        fallback={(error, reset) => {
          if (error && (error.name === 'ChunkLoadError' || error.message?.includes('Loading chunk') || error.message?.includes('Failed to fetch dynamically imported module'))) {
            safeReload('MortgageCalculator_DashboardBoundary');
            return null;
          }
          return (
            <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-surface w-full max-w-[400px] rounded-2xl shadow-xl border border-border p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                  <span className="text-xl font-black">!</span>
                </div>
                <h3 className="text-[15px] font-black text-primary mb-1">대출 계산기 로드 실패</h3>
                <p className="text-[12px] font-medium text-tertiary mb-5 leading-normal">
                  대출 한도진단 계산기를 불러오는 도중 오류가 발생했습니다. 다시 시도해 주시기 바랍니다.
                </p>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={reset}
                    className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-extrabold text-[12px] rounded-xl transition-all cursor-pointer border-none"
                  >
                    다시 시도
                  </button>
                  <button
                    onClick={() => setIsMortgageOpen(false)}
                    className="px-4 py-2.5 bg-body hover:bg-border/30 text-secondary font-bold text-[12px] rounded-xl border border-border/20 transition-all cursor-pointer"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          );
        }}
      >
        <MortgageCalculator
          isOpen={isMortgageOpen}
          onClose={() => setIsMortgageOpen(false)}
          initialAptName={mortgageInitialApt}
          sheetApartments={sheetApartments}
          txSummaryData={txSummary}
          nameMapping={nameMapping || {}}
          fieldReportsMap={fieldReportsMap}
        />
      </ErrorBoundary>
    )}

    {isTaxCalcOpen && (
      <ErrorBoundary
        name="취득세 및 중개보수 계산기"
        fallback={(error, reset) => {
          if (error && (error.name === 'ChunkLoadError' || error.message?.includes('Loading chunk') || error.message?.includes('Failed to fetch dynamically imported module'))) {
            safeReload('PropertyTaxCalculator_DashboardBoundary');
            return null;
          }
          return (
            <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-surface w-full max-w-[400px] rounded-2xl shadow-xl border border-border p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                  <span className="text-xl font-black">!</span>
                </div>
                <h3 className="text-[15px] font-black text-primary mb-1">계산기 로드 실패</h3>
                <p className="text-[12px] font-medium text-tertiary mb-5 leading-normal">
                  취득세 및 중개보수 계산기를 불러오는 도중 오류가 발생했습니다. 다시 시도해 주시기 바랍니다.
                </p>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={reset}
                    className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-extrabold text-[12px] rounded-xl transition-all cursor-pointer border-none"
                  >
                    다시 시도
                  </button>
                  <button
                    onClick={() => setIsTaxCalcOpen(false)}
                    className="px-4 py-2.5 bg-body hover:bg-border/30 text-secondary font-bold text-[12px] rounded-xl border border-border/20 transition-all cursor-pointer"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          );
        }}
      >
        <PropertyTaxCalculator
          isOpen={isTaxCalcOpen}
          onClose={() => setIsTaxCalcOpen(false)}
          initialAptName={taxCalcInitialApt}
          sheetApartments={sheetApartments}
          txSummaryData={txSummary}
          nameMapping={nameMapping || {}}
        />
      </ErrorBoundary>
    )}

    {isSellTimingOpen && (
      <ErrorBoundary
        name="AI 매도 타이밍 및 세무 진단기"
        fallback={(error, reset) => {
          if (error && (error.name === 'ChunkLoadError' || error.message?.includes('Loading chunk') || error.message?.includes('Failed to fetch dynamically imported module'))) {
            safeReload('SellTimingCalculator_DashboardBoundary');
            return null;
          }
          return (
            <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-surface w-full max-w-[400px] rounded-2xl shadow-xl border border-border p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                  <span className="text-xl font-black">!</span>
                </div>
                <h3 className="text-[15px] font-black text-primary mb-1">진단기 로드 실패</h3>
                <p className="text-[12px] font-medium text-tertiary mb-5 leading-normal">
                  AI 매도 타이밍 및 세무 진단기를 불러오는 도중 오류가 발생했습니다. 다시 시도해 주시기 바랍니다.
                </p>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={reset}
                    className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-extrabold text-[12px] rounded-xl transition-all cursor-pointer border-none"
                  >
                    다시 시도
                  </button>
                  <button
                    onClick={() => setIsSellTimingOpen(false)}
                    className="px-4 py-2.5 bg-body hover:bg-border/30 text-secondary font-bold text-[12px] rounded-xl border border-border/20 transition-all cursor-pointer"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          );
        }}
      >
        <SellTimingCalculator
          isOpen={isSellTimingOpen}
          onClose={() => setIsSellTimingOpen(false)}
          initialAptName={sellTimingInitialApt}
          sheetApartments={sheetApartments}
          txSummaryData={txSummary}
          nameMapping={nameMapping || {}}
          userId={user?.uid}
        />
      </ErrorBoundary>
    )}
    </>
  );
});

DashboardClient.displayName = 'DashboardClient';
export default DashboardClient;
