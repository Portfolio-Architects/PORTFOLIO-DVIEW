'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

import { MessageSquare } from 'lucide-react';

import LoginGateModal from '@/components/ui/LoginGateModal';
import PullToRefresh from '@/components/pwa/PullToRefresh';
import PageHeroHeader from '@/components/PageHeroHeader';

import { useAuth } from '@/hooks/useAuth';
import { useDashboardMeta, type DashboardInitialDataLocal } from '@/hooks/useDashboardMeta';
import { useFavorites } from '@/hooks/useFavorites';
import { useApartmentDetails } from '@/hooks/useApartmentDetails';
import { useComments } from '@/hooks/useComments';
import { usePWA } from '@/components/pwa/PWAProvider';
import { useAdBlockDetector } from '@/hooks/useAdBlockDetector';
import { useTxData, useLocationScores } from '@/hooks/useStaticData';
import { isSameApartment, normalizeAptName, findTxKey } from '@/lib/utils/apartmentMapping';
import { dashboardFacade, FieldReportData } from '@/lib/DashboardFacade';
import * as UserRepo from '@/lib/repositories/user.repository';
import { isValidNickname } from '@/lib/services/nickname.service';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { safeReload } from '@/lib/utils/safeReload';
import { localCache } from '@/lib/utils/localCache';
import { ViewedAptsSchema } from '@/lib/validation/facade.schemas';
import { trackEvent } from '@/lib/utils/analytics';

const ExploreListSkeleton = () => (
  <div className="flex flex-col w-full bg-transparent">
    <div className="w-full px-4 sm:px-6 md:px-10 lg:px-16 pt-3 md:pt-5 pb-8 md:pb-4 bg-transparent flex-1 min-h-0 flex flex-col animate-pulse">
      <div className="flex w-full bg-surface md:rounded-2xl md:border md:border-border/80 md:shadow-sm items-stretch flex-1 min-h-0">
        {/* Sidebar Skeleton (Hidden on Mobile) */}
        <aside 
          style={{ width: '240px' }}
          className="hidden md:flex flex-col w-auto shrink-0 border-r border-border bg-neutral-50/40 dark:bg-zinc-900/10 py-6 px-4 sticky top-[68px] self-start md:rounded-l-2xl"
        >
          <div className="mb-6">
            <div className="w-16 h-4 bg-black/5 dark:bg-surface/5 rounded mb-3" />
            <div className="flex flex-col gap-1">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="w-full h-[36px] bg-black/5 dark:bg-surface/5 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="mb-6">
            <div className="w-20 h-4 bg-black/5 dark:bg-surface/5 rounded mb-3" />
            <div className="flex flex-col gap-1">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-full h-[36px] bg-black/5 dark:bg-surface/5 rounded-xl" />
              ))}
            </div>
          </div>
        </aside>

        {/* Drag Splitter Resizer Skeleton */}
        <div className="hidden md:block w-1 bg-border/80 shrink-0" />

        {/* Main Table Area Skeleton */}
        <div className="flex-1 flex flex-col bg-transparent min-w-0 md:pl-6 lg:pl-8 md:pr-6 lg:pr-8 py-2 md:rounded-r-2xl">
          {/* Title, Total count and Search Bar Skeleton */}
          <div className="px-0 py-3 md:py-4 border-b border-border flex flex-col md:flex-row md:justify-between md:items-end gap-3 md:gap-4 shrink-0 bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-md relative z-30">
            <div className="flex flex-row justify-between items-center md:flex-col md:items-start w-full md:w-auto">
              <div className="w-40 h-8 bg-black/5 dark:bg-surface/5 rounded-xl" />
              <div className="w-20 h-4 bg-black/5 dark:bg-surface/5 rounded mt-2 hidden md:block" />
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-2.5 w-full md:w-auto shrink-0">
              <div className="w-full md:w-[220px] h-[38px] bg-black/5 dark:bg-surface/5 rounded-xl" />
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar shrink-0 py-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-[100px] h-[36px] bg-black/5 dark:bg-surface/5 rounded-full shrink-0" />
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col relative">
            {/* Table Header Skeleton (Desktop Only) */}
            <div className="hidden md:flex sticky top-[68px] z-20 bg-surface/90 backdrop-blur-md items-center md:pl-8 md:pr-[47px] py-3.5 border-b border-neutral-100 dark:border-zinc-900/40 text-[12.5px] font-extrabold text-neutral-500 dark:text-neutral-400 shrink-0 select-none shadow-sm">
              <div className="w-[36px] shrink-0" />
              <div className="w-[40px] text-center shrink-0">순위</div>
              <div className="flex-1 min-w-[120px] ml-2 text-left">단지명</div>
              <div className="w-[105px] text-right pr-2 shrink-0 hidden xl:block">연식</div>
              <div className="w-[100px] text-right pr-2 shrink-0">매매가</div>
              <div className="w-[85px] text-right pr-2 shrink-0">평당가</div>
              <div className="w-[110px] text-right pr-2 shrink-0 hidden lg:block">전세가</div>
              <div className="w-[80px] text-right pr-2 shrink-0 hidden xl:block">세대수</div>
              <div className="w-[100px] text-right pr-2 shrink-0 hidden xl:block">거래량</div>
            </div>

            {/* Table Body Skeleton: 15 items with precise height (66px for desktop, 64px for mobile) */}
            <div className="w-full flex-1 pt-1.5">
              <div className="flex flex-col w-full">
                {[...Array(15)].map((_, i) => (
                  <div key={i} className="w-full flex flex-col px-0 md:px-4 py-0.5 md:py-1">
                    {/* Desktop item skeleton */}
                    <div className="hidden md:flex items-center md:px-4 h-[66px] border border-neutral-100/70 dark:border-zinc-900/40 rounded-2xl bg-white dark:bg-zinc-950">
                      <div className="w-[36px] shrink-0 h-4 bg-black/5 dark:bg-surface/5 rounded" />
                      <div className="w-[40px] shrink-0 h-4 bg-black/5 dark:bg-surface/5 rounded mx-auto" />
                      <div className="flex-1 min-w-[120px] ml-2 h-5 bg-black/5 dark:bg-surface/5 rounded" />
                      <div className="w-[105px] shrink-0 h-4 bg-black/5 dark:bg-surface/5 rounded ml-2 hidden xl:block" />
                      <div className="w-[100px] shrink-0 h-5 bg-black/5 dark:bg-surface/5 rounded ml-2" />
                      <div className="w-[85px] shrink-0 h-4 bg-black/5 dark:bg-surface/5 rounded ml-2" />
                      <div className="w-[110px] shrink-0 h-4 bg-black/5 dark:bg-surface/5 rounded ml-2 hidden lg:block" />
                      <div className="w-[80px] shrink-0 h-4 bg-black/5 dark:bg-surface/5 rounded ml-2 hidden xl:block" />
                      <div className="w-[100px] shrink-0 h-4 bg-black/5 dark:bg-surface/5 rounded ml-2 hidden xl:block" />
                    </div>
                    {/* Mobile item skeleton */}
                    <div className="flex md:hidden items-center justify-between px-4 h-[64px] border-b border-neutral-100/40 dark:border-zinc-900/10 bg-white dark:bg-zinc-950">
                      <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                        <div className="w-[20px] h-[20px] rounded-full bg-black/5 dark:bg-surface/5 shrink-0" />
                        <div className="flex flex-col flex-1 min-w-0 gap-1.5">
                          <div className="w-1/2 h-4 bg-black/5 dark:bg-surface/5 rounded" />
                          <div className="w-3/4 h-3 bg-black/5 dark:bg-surface/5 rounded" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="w-14 h-4 bg-black/5 dark:bg-surface/5 rounded" />
                          <div className="w-10 h-3 bg-black/5 dark:bg-surface/5 rounded" />
                        </div>
                        <div className="w-[16px] h-[16px] rounded-full bg-black/5 dark:bg-surface/5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ModalSkeleton = () => (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-pulse p-4">
    <div className="bg-surface w-full max-w-[1200px] h-[90vh] rounded-3xl shadow-2xl border border-border/80 p-6 flex flex-col gap-4">
      <div className="w-1/3 h-10 bg-body rounded-xl animate-pulse" />
      <div className="w-1/4 h-5 bg-body rounded-lg animate-pulse" />
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <div className="h-full bg-body rounded-2xl animate-pulse" />
        <div className="h-full bg-body rounded-2xl animate-pulse" />
      </div>
    </div>
  </div>
);

// Heavy components dynamic load - TossApartmentExploreClient is loaded with SSR enabled to optimize Largest Contentful Paint (LCP) and SEO.
const TossApartmentExploreClient = dynamic(() => import('@/components/TossApartmentExploreClient').catch(err => {
  console.warn('TossApartmentExploreClient Chunk Load failure, page reload initiated', err);
  safeReload('TossApartmentExploreClient');
  return { default: () => null };
}), { ssr: true, loading: () => <ExploreListSkeleton /> });

const FieldReportModal = dynamic(() => import('@/components/ApartmentModal').catch(err => {
  console.warn('FieldReportModal Chunk Load failure, page reload initiated', err);
  safeReload('FieldReportModal');
  return { default: () => null };
}), { ssr: false, loading: () => <ModalSkeleton /> });

const AdInquiryModal = dynamic(() => import('@/components/AdInquiryModal').catch(err => {
  console.warn('AdInquiryModal Chunk Load failure', err);
  safeReload('AdInquiryModal');
  return { default: () => null };
}), { ssr: false });

const B2BConsumerAdModal = dynamic(() => import('@/components/consumer/B2BConsumerAdModal').catch(err => {
  console.warn('B2BConsumerAdModal Chunk Load failure', err);
  safeReload('B2BConsumerAdModal');
  return { default: () => null };
}), { ssr: false });

const AptCompareModal = dynamic(() => import('@/components/consumer/AptCompareModal').catch(err => {
  console.warn('AptCompareModal Chunk Load failure', err);
  safeReload('AptCompareModal');
  return { default: () => null };
}), { ssr: false });

const JeonseSafetyCalculator = dynamic(() => import('@/components/consumer/JeonseSafetyCalculator').catch(err => {
  console.warn('JeonseSafetyCalculator Chunk Load failure', err);
  safeReload('JeonseSafetyCalculator');
  return { default: () => null };
}), { ssr: false });

const MortgageCalculator = dynamic(() => import('@/components/consumer/MortgageCalculator').catch(err => {
  console.warn('MortgageCalculator Chunk Load failure', err);
  safeReload('MortgageCalculator');
  return { default: () => null };
}), { ssr: false });

const PropertyTaxCalculator = dynamic(() => import('@/components/consumer/PropertyTaxCalculator').catch(err => {
  console.warn('PropertyTaxCalculator Chunk Load failure', err);
  safeReload('PropertyTaxCalculator');
  return { default: () => null };
}), { ssr: false });

const SellTimingCalculator = dynamic(() => import('@/components/consumer/SellTimingCalculator').catch(err => {
  console.warn('SellTimingCalculator Chunk Load failure', err);
  safeReload('SellTimingCalculator');
  return { default: () => null };
}), { ssr: false });

const fetcher = (url: string) => fetch(url).then(res => res.json());

const EMPTY_OBJECT: Record<string, any> = {};

const ExploreClient = React.memo(function ExploreClient({ initialDashboardData }: { initialDashboardData?: DashboardInitialDataLocal }) {
  const fieldReports = initialDashboardData?.fieldReports || [];

  const { user, userProfile, handleLogin } = useAuth();
  const { sheetApartments, typeMap, nameMapping, publicRentalSet, triggerFetch } = useDashboardMeta(initialDashboardData);
  const { userFavorites, favoriteCounts, handleToggleFavorite } = useFavorites(user, initialDashboardData?.favoriteCounts);

  // Trigger lazy fetching of detailed sheets data on mount for the Explore page
  useEffect(() => {
    triggerFetch();
  }, [triggerFetch]);

  const fieldReportsMap = useMemo(() => {
    const map = new Map<string, any>();
    if (!fieldReports || !sheetApartments) return map;
    const allApts = Object.values(sheetApartments).flat() as any[];
    allApts.forEach(apt => {
      const report = fieldReports.find(r => isSameApartment(r.apartmentName, apt.name, nameMapping));
      if (report) map.set(apt.name, report);
    });
    return map;
  }, [fieldReports, sheetApartments, nameMapping]);

  const [mounted, setMounted] = useState(false);
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hashStateRef = useRef<{ mounted: boolean; sheetApartments: any; fieldReportsMap: any; nameMapping: any }>({
    mounted: false,
    sheetApartments: null,
    fieldReportsMap: null,
    nameMapping: null
  });
  useEffect(() => {
    hashStateRef.current = { mounted, sheetApartments, fieldReportsMap, nameMapping };
  }, [mounted, sheetApartments, fieldReportsMap, nameMapping]);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [isConsumerAdModalOpen, setIsConsumerAdModalOpen] = useState(false);
  const [consumerAdInfo, setConsumerAdInfo] = useState<{ adType: 'insurance' | 'interior' | 'academy' | 'cleaning'; adTitle: string } | null>(null);

  const handleOpenConsumerAdModal = useCallback((adType: 'insurance' | 'interior' | 'academy' | 'cleaning', adTitle: string) => {
    setConsumerAdInfo({ adType, adTitle });
    setIsConsumerAdModalOpen(true);
  }, []);

  const [showAdBlockBanner, setShowAdBlockBanner] = useState(false);
  const { isAdBlockActive } = useAdBlockDetector();

  useEffect(() => {
    if (!isAdBlockActive || !mounted) return;
    const dismissedTime = localStorage.getItem('dview-adblock-banner-dismissed');
    if (dismissedTime) {
      const parsedTime = parseInt(dismissedTime, 10);
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (now - parsedTime < sevenDays) return;
    }
    setShowAdBlockBanner(true);
  }, [isAdBlockActive, mounted]);

  const handleAdBlockBannerClose = () => {
    localStorage.setItem('dview-adblock-banner-dismissed', Date.now().toString());
    setShowAdBlockBanner(false);
  };

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

  // Modals status
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareInitialApt, setCompareInitialApt] = useState<string | undefined>(undefined);

  const [isJeonseSafetyOpen, setIsJeonseSafetyOpen] = useState(false);
  const [jeonseSafetyInitialApt, setJeonseSafetyInitialApt] = useState<string | undefined>(undefined);

  const [isMortgageOpen, setIsMortgageOpen] = useState(false);
  const [mortgageInitialApt, setMortgageInitialApt] = useState<string | undefined>(undefined);

  const [isTaxCalcOpen, setIsTaxCalcOpen] = useState(false);
  const [taxCalcInitialApt, setTaxCalcInitialApt] = useState<string | undefined>(undefined);

  const [isSellTimingOpen, setIsSellTimingOpen] = useState(false);
  const [sellTimingInitialApt, setSellTimingInitialApt] = useState<string | undefined>(undefined);

  const [isLoginGateOpen, setIsLoginGateOpen] = useState(false);
  const [loginGateMessage, setLoginGateMessage] = useState('');

  const handleRequestLogin = useCallback((message: string) => {
    setLoginGateMessage(message);
    setIsLoginGateOpen(true);
  }, []);

  const { txSummary = EMPTY_OBJECT } = useTxData(
    initialDashboardData?.macroTrend,
    initialDashboardData?.txSummary,
    initialDashboardData?.recent7DaysVolume
  );
  const { locationScores = EMPTY_OBJECT } = useLocationScores();

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

  useEffect(() => {
    let isMounted = true;
    setMounted(true);
    let idleId: number | null = null;

    const preloadHeavyChunks = () => {
      if (!isMounted) return;
      import('@/components/TossApartmentExploreClient').catch(() => {});
      import('@/components/ApartmentModal').catch(() => {});
      import('@/components/consumer/AptCompareModal').catch(() => {});
      import('@/components/consumer/JeonseSafetyCalculator').catch(() => {});
      import('@/components/consumer/MortgageCalculator').catch(() => {});
      import('@/components/consumer/PropertyTaxCalculator').catch(() => {});
      import('@/components/consumer/SellTimingCalculator').catch(() => {});
    };

    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      if ('requestIdleCallback' in window) {
        idleId = (window as any).requestIdleCallback(preloadHeavyChunks, { timeout: 3000 });
      } else {
        if (preloadTimeoutRef.current) {
          clearTimeout(preloadTimeoutRef.current);
          preloadTimeoutRef.current = null;
        }
        preloadTimeoutRef.current = setTimeout(() => {
          preloadHeavyChunks();
          preloadTimeoutRef.current = null;
        }, 2000);
      }
    }

    // Memory leak prevention: cancel active idle callbacks and timeouts on unmount
    return () => {
      isMounted = false;
      if (idleId !== null && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleId);
      }
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
        preloadTimeoutRef.current = null;
      }
    };
  }, []);

  // Handle #apt= hash to open modal automatically
  useEffect(() => {
    const checkHashForApt = () => {
      const { mounted: m, sheetApartments: apartments, fieldReportsMap: reportsMap, nameMapping: mapping } = hashStateRef.current;
      if (!m || !apartments) return;

      const match = window.location.hash.match(/[#&]apt=([^&]+)/);
      if (match) {
        const aptName = decodeURIComponent(match[1]);
        const allApts = Object.values(apartments).flat() as any[];
        const targetApt = allApts.find(a => isSameApartment(a.name, aptName, mapping));

        if (targetApt) {
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
              metrics: { ...targetApt, ...(getLocScore(targetApt.name) || {}) } as any,
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

  const [mobileModalOpen, setMobileModalOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      if (!window.location.hash && (window.location.pathname === '/explore')) {
        setSelectedReport(null);
        setMobileModalOpen(false);
      }
    };
    window.addEventListener('popstate', handlePopState, { passive: true });
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleAptClick = useCallback((apt: { name: string; dong: string }) => {
    trackEvent('view_apartment', { apt_name: apt.name });
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
        metrics: { ...apt, ...(getLocScore(apt.name) || {}) } as any,
      });
    }

    if (typeof window !== 'undefined') {
      try {
        const history = localCache.get('dview_viewed_apts', ViewedAptsSchema, []);
        const updated = [apt.name, ...history.filter((h: string) => h !== apt.name)].slice(0, 10);
        localCache.set('dview_viewed_apts', updated, 604800); // 7 days TTL
        window.dispatchEvent(new Event('dview_viewed_apts_changed'));
      } catch (e) {
        console.warn('LocalStorage write error:', e);
      }
    }

    History.prototype.pushState.call(window.history, null, '', window.location.pathname + window.location.search + `#apt=${encodeURIComponent(apt.name)}`);
    setMobileModalOpen(true);
  }, [fieldReportsMap]);

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
    const isAdding = !userFavorites.has(aptName);
    trackEvent('toggle_favorite', { apt_name: aptName, status: isAdding ? 'added' : 'removed' });
    handleToggleFavorite(aptName, () => handleRequestLogin('관심 단지를 등록하여 실거래가 변동 알림을 받아보세요.'));
    if (user && !userFavorites.has(aptName)) {
      triggerCustomA2HSModal();
    }
  }, [handleToggleFavorite, handleRequestLogin, user, userFavorites, triggerCustomA2HSModal]);

  const handleOpenCompare = useCallback(() => {
    setCompareInitialApt(undefined);
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

  return (
    <>
      <PullToRefresh
        scrollContainerId="apartment-list-scroll"
        disabled={mobileModalOpen || !!selectedReport}
      >
        <div className="flex flex-col min-h-[100dvh] bg-surface relative pb-[env(safe-area-inset-bottom)]">
          <main id="main-content" className="flex-1 w-full max-w-[2000px] mx-auto overflow-x-hidden animate-in fade-in duration-500">
            <div className={mobileModalOpen ? "invisible" : ""}>
              <section className="w-full bg-transparent">
                <PageHeroHeader 
                  title="D-VIEW 아파트 탐색"
                  subtitleStrong="동탄 전역 아파트 비교 분석"
                  subtitleLight="시세, 거래량, 관심도 등 다양한 지표로 아파트를 탐색하세요"
                />
                <TossApartmentExploreClient
                  sheetApartments={sheetApartments}
                  txSummaryData={txSummaryData}
                  nameMapping={nameMapping || {}}
                  fieldReportsMap={fieldReportsMap}
                  publicRentalSet={publicRentalSet}
                  userFavorites={userFavorites}
                  favoriteCounts={favoriteCounts}
                  typeMap={typeMap}
                  handleSelectApt={handleAptClickByName}
                  onToggleFavorite={handleAptToggleFavorite}
                  onOpenCompare={handleOpenCompare}
                  onOpenJeonseSafety={handleOpenJeonseSafety}
                  onOpenMortgage={handleOpenMortgage}
                  onSearchFocus={triggerFetch}
                />
              </section>
            </div>


            {/* Apartment Detail Modal */}
            {resolvedReport && mobileModalOpen && (
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
                isTxLoading={isTxLoading}
                typeMap={typeMap}
                inline={false}
                isLoadingDetail={isLoadingDetail}
                loadAllTransactions={loadAllTransactions}
                isAdmin={dashboardFacade.isAdmin(user?.email)}
                txSummary={aptTxSummary}
                onOpenAdModal={() => setIsAdModalOpen(true)}
                onOpenConsumerAdModal={handleOpenConsumerAdModal}
                onRequestLogin={handleRequestLogin}
                onOpenCompare={(aptName) => {
                  setCompareInitialApt(aptName);
                  setIsCompareOpen(true);
                  trackEvent('open_calculator', { calculator_type: 'compare', apt_name: aptName });
                }}
                onOpenJeonseSafety={(aptName) => {
                  setJeonseSafetyInitialApt(aptName);
                  setIsJeonseSafetyOpen(true);
                  trackEvent('open_calculator', { calculator_type: 'jeonse_safety', apt_name: aptName });
                }}
                onOpenMortgage={(aptName) => {
                  setMortgageInitialApt(aptName);
                  setIsMortgageOpen(true);
                  trackEvent('open_calculator', { calculator_type: 'mortgage', apt_name: aptName });
                }}
                onOpenTaxCalculator={(aptName) => {
                  setTaxCalcInitialApt(aptName);
                  setIsTaxCalcOpen(true);
                  trackEvent('open_calculator', { calculator_type: 'property_tax', apt_name: aptName });
                }}
                onOpenSellTimingCalculator={(aptName) => {
                  setSellTimingInitialApt(aptName);
                  setIsSellTimingOpen(true);
                  trackEvent('open_calculator', { calculator_type: 'sell_timing', apt_name: aptName });
                }}
              />
            )}
          </main>
        </div>
      </PullToRefresh>

      {!mobileModalOpen && showAdBlockBanner && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[480px] bg-slate-900/95 dark:bg-slate-950/95 text-white border border-emerald-500/30 rounded-2xl px-4 py-3.5 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 backdrop-blur-md">
          <div className="flex-1 flex items-start gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-2 select-none" />
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

      {isAdModalOpen && (
        <AdInquiryModal onClose={() => setIsAdModalOpen(false)} />
      )}

      {isConsumerAdModalOpen && consumerAdInfo && selectedReport && (
        <B2BConsumerAdModal
          onClose={() => {
            setIsConsumerAdModalOpen(false);
            setConsumerAdInfo(null);
          }}
          adType={consumerAdInfo.adType}
          adTitle={consumerAdInfo.adTitle}
          apartmentName={selectedReport.apartmentName}
          dong={selectedReport.dong || '오산동'}
          yearBuilt={selectedReport.metrics?.yearBuilt}
        />
      )}

      {showNicknameModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 backdrop-blur-md bg-white/70 dark:bg-black/70 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-surface text-primary rounded-[24px] shadow-2xl p-6 sm:p-8 border border-border transition-all animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-[#008262]/10 dark:bg-[#00d29d]/10 text-[#008262] dark:text-[#00d29d] rounded-full flex items-center justify-center mx-auto mb-4">
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
                  className="w-full bg-body text-primary border border-border focus:border-[#008262] dark:focus:border-[#00d29d] rounded-[14px] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008262]/20 dark:focus:ring-[#00d29d]/20 transition-all font-semibold"
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
                className="w-full bg-[#008262] hover:bg-[#006950] dark:bg-[#00b386] dark:hover:bg-[#008262] text-white rounded-[14px] py-3.5 text-sm font-bold shadow-lg shadow-[#008262]/10 dark:shadow-[#00b386]/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
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
              if (typeof window !== 'undefined') {
                console.warn('ChunkLoadError caught in AptCompareModal. Reloading page...');
                safeReload('AptCompareModal_ExploreBoundary');
              }
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
              if (typeof window !== 'undefined') {
                console.warn('ChunkLoadError caught in JeonseSafetyCalculator. Reloading page...');
                safeReload('JeonseSafetyCalculator_ExploreBoundary');
              }
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
              if (typeof window !== 'undefined') {
                console.warn('ChunkLoadError caught in MortgageCalculator. Reloading page...');
                safeReload('MortgageCalculator_ExploreBoundary');
              }
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
              if (typeof window !== 'undefined') {
                console.warn('ChunkLoadError caught in PropertyTaxCalculator. Reloading page...');
                safeReload('PropertyTaxCalculator_ExploreBoundary');
              }
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
              if (typeof window !== 'undefined') {
                console.warn('ChunkLoadError caught in SellTimingCalculator. Reloading page...');
                safeReload('SellTimingCalculator_ExploreBoundary');
              }
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

ExploreClient.displayName = 'ExploreClient';

export default ExploreClient;
