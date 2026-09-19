'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

import PullToRefresh from '@/components/pwa/PullToRefresh';
import PageHeroHeader from '@/components/PageHeroHeader';

import { useAuth } from '@/hooks/useAuth';
import { useDashboardMeta, type DashboardInitialDataLocal } from '@/hooks/useDashboardMeta';
import { useFavorites } from '@/hooks/useFavorites';
import { usePreloadApartmentTx } from '@/hooks/usePreloadApartmentTx';
import { usePWA } from '@/components/pwa/PWAProvider';
import { useTxData, useLocationScores } from '@/hooks/useStaticData';
import { isSameApartment, normalizeAptName, findTxKey } from '@/lib/utils/apartmentMapping';
import { dashboardFacade, FieldReportData } from '@/lib/DashboardFacade';
import { type DongApartment } from '@/lib/dong-apartments';
import { type ObjectiveMetrics } from '@/lib/types/scoutingReport';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { safeReload } from '@/lib/utils/safeReload';
import { localCache } from '@/lib/utils/localCache';
import { ViewedAptsSchema } from '@/lib/validation/facade.schemas';
import { trackEvent } from '@/lib/utils/analytics';
import { logger } from '@/lib/services/logger';
import ApartmentModalSkeleton from '@/components/ui/ApartmentModalSkeleton';

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

          <div className="flex-1 min-h-0 flex flex-col relative py-4">
            {/* Table Body Skeleton: 15 items with precise layout */}
            <div className="w-full flex-1 pt-0">
              <div className="flex flex-col gap-3 w-full animate-pulse">
                {[...Array(15)].map((_, i) => (
                  <div key={i} className="w-full flex flex-col md:flex-row items-stretch md:items-center justify-between p-4 md:p-5 border border-border/85 rounded-2xl bg-surface">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-black/5 dark:bg-surface/5 shrink-0" />
                      <div className="flex flex-col min-w-0 flex-1 gap-2">
                        <div className="w-48 h-5 bg-black/5 dark:bg-surface/5 rounded-lg" />
                        <div className="w-3/4 h-3.5 bg-black/5 dark:bg-surface/5 rounded" />
                      </div>
                    </div>
                    <div className="flex md:flex-col items-end justify-between md:justify-center gap-2.5 mt-4 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-border/40 border-dashed shrink-0 pl-0 md:pl-6 md:w-36">
                      <div className="w-24 h-5 bg-black/5 dark:bg-surface/5 rounded-lg" />
                      <div className="w-20 h-8 bg-black/5 dark:bg-surface/5 rounded-xl" />
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

// Heavy components dynamic load - TossApartmentExploreClient is loaded with SSR enabled to optimize Largest Contentful Paint (LCP) and SEO.
const TossApartmentExploreClient = dynamic(() => import('@/components/TossApartmentExploreClient').catch(err => {
  logger.warn('ExploreClient.dynamic', 'TossApartmentExploreClient Chunk Load failure, page reload initiated', undefined, err);
  safeReload('TossApartmentExploreClient');
  return { default: () => null };
}), { ssr: true, loading: () => <ExploreListSkeleton /> });

const FieldReportModal = dynamic(() => import('@/components/ApartmentModal').catch(err => {
  logger.warn('ExploreClient.dynamic', 'FieldReportModal Chunk Load failure, page reload initiated', undefined, err);
  safeReload('FieldReportModal');
  return { default: () => null };
}), { ssr: false, loading: () => <ApartmentModalSkeleton /> });



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

const AptCompareModal = dynamic(() => import('@/components/consumer/AptCompareModal').catch(err => {
  logger.warn('ExploreClient.dynamic', 'AptCompareModal Chunk Load failure', undefined, err);
  safeReload('AptCompareModal');
  return { default: () => null };
}), {
  ssr: false,
  loading: () => <CalculatorLoader text="비교 대시보드 로드 중" />
});

const JeonseSafetyCalculator = dynamic(() => import('@/components/consumer/JeonseSafetyCalculator').catch(err => {
  logger.warn('ExploreClient.dynamic', 'JeonseSafetyCalculator Chunk Load failure', undefined, err);
  safeReload('JeonseSafetyCalculator');
  return { default: () => null };
}), {
  ssr: false,
  loading: () => <CalculatorLoader text="전세 안전진단 계산기 로드 중" />
});

const MortgageCalculator = dynamic(() => import('@/components/consumer/MortgageCalculator').catch(err => {
  logger.warn('ExploreClient.dynamic', 'MortgageCalculator Chunk Load failure', undefined, err);
  safeReload('MortgageCalculator');
  return { default: () => null };
}), {
  ssr: false,
  loading: () => <CalculatorLoader text="대출 계산기 로드 중" />
});

const PropertyTaxCalculator = dynamic(() => import('@/components/consumer/PropertyTaxCalculator').catch(err => {
  logger.warn('ExploreClient.dynamic', 'PropertyTaxCalculator Chunk Load failure', undefined, err);
  safeReload('PropertyTaxCalculator');
  return { default: () => null };
}), {
  ssr: false,
  loading: () => <CalculatorLoader text="취득세 계산기 로드 중" />
});

const SellTimingCalculator = dynamic(() => import('@/components/consumer/SellTimingCalculator').catch(err => {
  logger.warn('ExploreClient.dynamic', 'SellTimingCalculator Chunk Load failure', undefined, err);
  safeReload('SellTimingCalculator');
  return { default: () => null };
}), {
  ssr: false,
  loading: () => <CalculatorLoader text="매도 진단기 로드 중" />
});

const fetcher = (url: string) => fetch(url).then(res => res.json());

const EMPTY_OBJECT: Record<string, any> = {};

const ExploreClient = React.memo(function ExploreClient({ initialDashboardData }: { initialDashboardData?: DashboardInitialDataLocal }) {
  const fieldReports = initialDashboardData?.fieldReports || [];

  const { user } = useAuth();
  const { sheetApartments, typeMap, nameMapping, publicRentalSet, triggerFetch } = useDashboardMeta(initialDashboardData);
  const { userFavorites, favoriteCounts, handleToggleFavorite, isFavorited, updateFavoriteOrder } = useFavorites(user, initialDashboardData?.favoriteCounts);

  // Trigger lazy fetching of detailed sheets data on mount for the Explore page
  useEffect(() => {
    triggerFetch();
  }, [triggerFetch]);

  const fieldReportsMap = useMemo(() => {
    const map = new Map<string, FieldReportData>();
    if (!fieldReports || !sheetApartments) return map;
    const allApts = Object.values(sheetApartments).flat() as DongApartment[];
    allApts.forEach(apt => {
      const report = fieldReports.find(r => isSameApartment(r.apartmentName, apt.name, nameMapping));
      if (report) map.set(apt.name, report);
    });
    return map;
  }, [fieldReports, sheetApartments, nameMapping]);

  const [mounted, setMounted] = useState(false);
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

  const preloadApartmentTx = usePreloadApartmentTx(sheetApartments, nameMapping, txSummary);

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

      // Preload ApartmentModal sub-components as well for 0ms transition stutter
      import('@/components/apartment-modal/ViralPaywallGate').catch(() => {});
      import('@/components/apartment-modal/JeonseSafetyReport').catch(() => {});
      import('@/components/apartment-modal/TransactionChartSection').catch(() => {});
      import('@/components/apartment-modal/PhotoUploadModal').catch(() => {});
      import('@/components/apartment-modal/BuyOrWaitVote').catch(() => {});
      import('@/components/apartment-modal/EducationAnalysisSection').catch(() => {});
      import('@/components/apartment-modal/InfraAnalysisSection').catch(() => {});
      import('@/components/apartment-modal/ScoutingReportDetailSection').catch(() => {});
      import('@/components/consumer/AdvancedValuationMetrics').catch(() => {});
      import('@/components/consumer/AnchorTenantCard').catch(() => {});
    };

    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      if (window.requestIdleCallback) {
        idleId = window.requestIdleCallback(preloadHeavyChunks, { timeout: 3000 });
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
      if (idleId !== null && window.cancelIdleCallback) {
        window.cancelIdleCallback(idleId);
      }
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
        preloadTimeoutRef.current = null;
      }
    };
  }, []);

  // Handle #apt= hash to open modal automatically
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

  const [mobileModalOpen, setMobileModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
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
        metrics: { ...apt, ...(getLocScore(apt.name) || {}) } as unknown as ObjectiveMetrics,
      });
    }

    if (typeof window !== 'undefined') {
      try {
        const history = localCache.get('dview_viewed_apts', ViewedAptsSchema, []);
        const updated = [apt.name, ...history.filter((h: string) => h !== apt.name)].slice(0, 10);
        localCache.set('dview_viewed_apts', updated, 604800); // 7 days TTL
        window.dispatchEvent(new Event('dview_viewed_apts_changed'));
      } catch (e) {
        logger.warn('ExploreClient.history', 'LocalStorage write error', undefined, e);
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
    const isAdding = !isFavorited(aptName);
    trackEvent('toggle_favorite', { apt_name: aptName, status: isAdding ? 'added' : 'removed' });
    handleToggleFavorite(aptName);
  }, [handleToggleFavorite, isFavorited]);

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
        <div className="flex flex-col min-h-[100dvh] min-h-[800px] bg-transparent relative pb-[env(safe-area-inset-bottom)]">
          <main id="main-content" className="flex-1 w-full max-w-[2000px] mx-auto min-h-[85vh] min-h-[800px]">
            <div className={mobileModalOpen ? "invisible" : ""}>
              <section className="w-full bg-transparent min-h-[85vh] min-h-[800px]">
                <PageHeroHeader 
                  title="D-VIEW 아파트 탐색"
                  subtitleStrong="동탄 아파트 조건별 맞춤 탐색"
                  subtitleLight="입지 점수·학군·동탄역 접근성 기준 조건 비교"
                />
                <ErrorBoundary name="아파트 맞춤 탐색">
                  <TossApartmentExploreClient
                    sheetApartments={sheetApartments}
                    txSummaryData={txSummary}
                    nameMapping={nameMapping || {}}
                    fieldReportsMap={fieldReportsMap}
                    publicRentalSet={publicRentalSet}
                    userFavorites={userFavorites}
                    isFavorited={isFavorited}
                    favoriteCounts={favoriteCounts}
                    typeMap={typeMap}
                    handleSelectApt={handleAptClickByName}
                    onToggleFavorite={handleAptToggleFavorite}
                    onOpenCompare={handleOpenCompare}
                    onOpenJeonseSafety={handleOpenJeonseSafety}
                    onOpenMortgage={handleOpenMortgage}
                    onSearchFocus={triggerFetch}
                    preloadApartmentTx={preloadApartmentTx}
                    updateFavoriteOrder={updateFavoriteOrder}
                  />
                </ErrorBoundary>
              </section>
            </div>


            {/* Apartment Detail Modal */}
            {selectedReport && mobileModalOpen && (
              <ErrorBoundary name="아파트 상세 정보">
                <FieldReportModal
                  report={selectedReport}
                  onClose={() => {
                    setSelectedReport(null);
                    setMobileModalOpen(false);
                    window.history.replaceState(null, '', window.location.pathname + window.location.search);
                  }}
                  user={user}
                  userFavorites={userFavorites}
                  onToggleFavorite={handleAptToggleFavorite}
                  typeMap={typeMap}
                  inline={false}
                  sheetApartments={sheetApartments}
                  nameMapping={nameMapping || {}}
                  txSummaryData={txSummary}
                  locationScores={locationScores}

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
              </ErrorBoundary>
            )}
          </main>
        </div>
      </PullToRefresh>

      {isCompareOpen && (
        <ErrorBoundary
          name="아파트 비교 분석"
          fallback={(error, reset) => {
            if (error && (error.name === 'ChunkLoadError' || error.message?.includes('Loading chunk') || error.message?.includes('Failed to fetch dynamically imported module'))) {
              if (typeof window !== 'undefined') {
                logger.warn('ExploreClient.ErrorBoundary', 'ChunkLoadError caught in AptCompareModal, page reload initiated');
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
                logger.warn('ExploreClient.ErrorBoundary', 'ChunkLoadError caught in JeonseSafetyCalculator, page reload initiated');
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
                logger.warn('ExploreClient.ErrorBoundary', 'ChunkLoadError caught in MortgageCalculator, page reload initiated');
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
                logger.warn('ExploreClient.ErrorBoundary', 'ChunkLoadError caught in PropertyTaxCalculator, page reload initiated');
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
                logger.warn('ExploreClient.ErrorBoundary', 'ChunkLoadError caught in SellTimingCalculator, page reload initiated');
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
