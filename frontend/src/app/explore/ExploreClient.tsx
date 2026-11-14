'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

import PullToRefresh from '@/components/pwa/PullToRefresh';
import PageHeroHeader from '@/components/PageHeroHeader';
import { MarketStatsStrong, MarketStatsLight } from '@/components/common/MarketStatsSubtitle';
import { AdSlot } from '@/components/ads/AdSlot';

import { useAuth } from '@/hooks/useAuth';
import { useDashboardMeta, type DashboardInitialDataLocal } from '@/hooks/useDashboardMeta';
import { usePreloadApartmentTx } from '@/hooks/usePreloadApartmentTx';
import { usePWA } from '@/components/pwa/PWAProvider';
import { useTxData, useLocationScores } from '@/hooks/useStaticData';
import {
  isSameApartment,
  normalizeAptName,
  findTxKey,
  resolveCanonicalAptSlug,
  stripApartmentNoiseQueryParams,
} from '@/lib/utils/apartmentMapping';
import { CANONICAL_DONG_APT_LIST } from '@/lib/utils/canonicalAptCatalog';
import { dashboardFacade, FieldReportData } from '@/lib/DashboardFacade';
import { type DongApartment } from '@/lib/dong-apartments';
import { type ObjectiveMetrics } from '@/types/report';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { safeReload } from '@/lib/utils/safeReload';
import { localCache } from '@/lib/utils/localCache';
import { ViewedAptsSchema } from '@/lib/validation/facade.schemas';
import { trackEvent, trackApartmentView } from '@/lib/utils/analytics';
import { logger } from '@/lib/services/logger';
import {
  decodeSafeAptParam,
  syncShallowApartmentOpen,
  syncShallowModalCloseToDashboard,
} from '@/lib/ads/recirculationEngine';
import ApartmentModalSkeleton from '@/components/ui/ApartmentModalSkeleton';
import type { OpenCalculatorModalEventDetail } from '@/components/finance/InlineMortgageDsrBridge';
import {
  consumePendingCalculatorContext,
  parseCalculatorQueryOverrides,
  type PendingCalculatorContextPayload,
} from '@/lib/utils/pendingCalculatorContext';

const ExploreListSkeleton = () => (
  <div className="flex flex-col w-full bg-transparent">
    <div className="w-full px-4 sm:px-6 md:px-10 lg:px-16 pt-3 md:pt-5 pb-8 md:pb-4 bg-transparent flex-1 min-h-0 flex flex-col animate-pulse">
      <div className="flex w-full bg-surface border-t border-border items-stretch flex-1 min-h-0">
        {/* Sidebar Skeleton (Hidden on Mobile) */}
        <aside 
          style={{ width: '240px' }}
          className="hidden md:flex flex-col w-auto shrink-0 border-r border-border bg-surface py-6 pr-5 sticky top-[68px] self-start"
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

// Heavy components dynamic load - TossApartmentExploreClient is loaded with ssr: false to prevent hydration divergence (SEO handled in page.tsx semantic block).
const TossApartmentExploreClient = dynamic(() => import('@/components/TossApartmentExploreClient').catch(err => {
  logger.warn('ExploreClient.dynamic', 'TossApartmentExploreClient Chunk Load failure, page reload initiated', undefined, err);
  safeReload('TossApartmentExploreClient');
  return { default: () => null };
}), { ssr: false, loading: () => <ExploreListSkeleton /> });

const FieldReportModal = dynamic(() => import('@/components/apartment/ApartmentModal').catch(err => {
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
  const [compareSecondApt, setCompareSecondApt] = useState<string | undefined>(undefined);

  const [isJeonseSafetyOpen, setIsJeonseSafetyOpen] = useState(false);
  const [jeonseSafetyInitialApt, setJeonseSafetyInitialApt] = useState<string | undefined>(undefined);

  const [isMortgageOpen, setIsMortgageOpen] = useState(false);
  const [mortgageInitialApt, setMortgageInitialApt] = useState<string | undefined>(undefined);
  const [mortgageInitialPriceManwon, setMortgageInitialPriceManwon] = useState<
    number | undefined
  >(undefined);
  const [mortgageInitialIncomeManwon, setMortgageInitialIncomeManwon] = useState<
    number | undefined
  >(undefined);

  const [isTaxCalcOpen, setIsTaxCalcOpen] = useState(false);
  const [taxCalcInitialApt, setTaxCalcInitialApt] = useState<string | undefined>(undefined);
  const [taxCalcInitialPriceManwon, setTaxCalcInitialPriceManwon] = useState<number | undefined>(
    undefined
  );
  const [taxCalcInitialAreaOver85, setTaxCalcInitialAreaOver85] = useState<boolean | undefined>(
    undefined
  );

  const [isSellTimingOpen, setIsSellTimingOpen] = useState(false);
  const [sellTimingInitialApt, setSellTimingInitialApt] = useState<string | undefined>(undefined);

  const { txSummary = EMPTY_OBJECT } = useTxData(
    initialDashboardData?.macroTrend,
    initialDashboardData?.txSummary,
    initialDashboardData?.recent7DaysVolume,
    undefined,
    { revalidateStaticOnMount: Boolean(initialDashboardData?.isSlimmedSsr) }
  );
  const { locationScores = EMPTY_OBJECT } = useLocationScores();

  const getLocScore = useCallback((aptName: string) => {
    if (!aptName || !locationScores) return {};
    const matchKey = findTxKey(aptName, locationScores, nameMapping);
    return matchKey ? locationScores[matchKey] : {};
  }, [locationScores, nameMapping]);

  const getCanonicalAptSlug = useCallback(
    (name: string, dong?: string, txKey?: string): string => {
      return (
        resolveCanonicalAptSlug(name, {
          txKey,
          txMap: txSummary,
          sheetApartments,
          manualMapping: nameMapping || undefined,
          dong,
        }) || name
      );
    },
    [txSummary, sheetApartments, nameMapping]
  );

  const preloadApartmentTx = usePreloadApartmentTx(sheetApartments, nameMapping, txSummary);

  const { triggerCustomA2HSModal } = usePWA();

  useEffect(() => {
    let isMounted = true;
    setMounted(true);
    let idleId: number | null = null;

    const preloadHeavyChunks = () => {
      if (!isMounted) return;
      import('@/components/TossApartmentExploreClient').catch(() => {});
      import('@/components/apartment/ApartmentModal').catch(() => {});
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

  const returnExplorePathRef = useRef<string>('/explore');

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
        const targetApt =
          allApts.find(
            (a) =>
              isSameApartment(a.name, aptName, mapping) ||
              (a.txKey ? isSameApartment(a.txKey, aptName, mapping) : false)
          ) ||
          (CANONICAL_DONG_APT_LIST.find(
            (a) =>
              isSameApartment(a.name, aptName, mapping) ||
              (a.txKey ? isSameApartment(a.txKey, aptName, mapping) : false) ||
              (a.rawTxKey ? isSameApartment(a.rawTxKey, aptName, mapping) : false)
          ) as DongApartment | undefined);

        if (targetApt) {
          if (window.location.pathname.startsWith('/explore')) {
            returnExplorePathRef.current = `${window.location.pathname}${window.location.search || ''}`;
          }
          const canonicalSlug = getCanonicalAptSlug(
            targetApt.name,
            targetApt.dong,
            targetApt.txKey
          );
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
          trackApartmentView({
            apartment_name: targetApt.name,
            apt_name: targetApt.name,
            canonical_slug: canonicalSlug,
            dong: targetApt.dong || undefined,
            surface: 'explore_hash_modal',
            view_type: 'modal',
            trigger: 'hash_link',
          });
          syncShallowApartmentOpen(targetApt.name, {
            dong: targetApt.dong,
            canonicalSlug,
          });
        }
      }
    };

    if (mounted && sheetApartments) {
      checkHashForApt();
    }
    
    window.addEventListener('hashchange', checkHashForApt, { passive: true });
    return () => window.removeEventListener('hashchange', checkHashForApt);
  }, [mounted, sheetApartments, getCanonicalAptSlug, getLocScore]);

  const [mobileModalOpen, setMobileModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const pathname = window.location.pathname || '/explore';
      const hasCalcQuery = new URLSearchParams(window.location.search || '').has('calc');
      if (pathname.startsWith('/apartment/')) {
        const aptParam = decodeSafeAptParam(pathname.slice('/apartment/'.length));
        if (!hasCalcQuery) {
          setIsCompareOpen(false);
          setIsMortgageOpen(false);
          setIsTaxCalcOpen(false);
          setIsJeonseSafetyOpen(false);
          setIsSellTimingOpen(false);
        }
        if (aptParam) {
          const { sheetApartments: apartments, fieldReportsMap: reportsMap, nameMapping: mapping } = hashStateRef.current;
          const allApts = apartments ? (Object.values(apartments).flat() as DongApartment[]) : [];
          const targetApt =
            allApts.find(
              (a) =>
                isSameApartment(a.name, aptParam, mapping) ||
                (a.txKey ? isSameApartment(a.txKey, aptParam, mapping) : false)
            ) ||
            (CANONICAL_DONG_APT_LIST.find(
              (a) =>
                isSameApartment(a.name, aptParam, mapping) ||
                (a.txKey ? isSameApartment(a.txKey, aptParam, mapping) : false) ||
                (a.rawTxKey ? isSameApartment(a.rawTxKey, aptParam, mapping) : false)
            ) as DongApartment | undefined);
          const resolvedName = targetApt?.name || aptParam;
          const resolvedDong = targetApt?.dong || '';
          const canonicalSlug = getCanonicalAptSlug(resolvedName, resolvedDong, targetApt?.txKey);
          if (canonicalSlug && typeof window.history?.replaceState === 'function') {
            const canonicalPath = `/apartment/${encodeURIComponent(canonicalSlug)}`;
            const currentSearch = window.location.search || '';
            const cleanedSearch = stripApartmentNoiseQueryParams(currentSearch);
            if (window.location.pathname !== canonicalPath || cleanedSearch !== currentSearch) {
              window.history.replaceState(
                window.history.state,
                '',
                `${canonicalPath}${cleanedSearch}${window.location.hash || ''}`
              );
            }
          }
          syncShallowApartmentOpen(resolvedName, {
            dong: resolvedDong,
            canonicalSlug,
          });
          const report = (targetApt && reportsMap?.get(targetApt.name)) || {
            id: `stub-${normalizeAptName(resolvedName)}`,
            apartmentName: resolvedName,
            dong: resolvedDong,
            author: '',
            likes: 0,
            commentCount: 0,
            createdAt: null,
            metrics: { ...(targetApt || { name: aptParam, dong: '' }), ...(getLocScore(resolvedName) || {}) } as unknown as ObjectiveMetrics,
          };
          setSelectedReport(report);
          setMobileModalOpen(true);
        }
        return;
      }

      if (!window.location.hash && !hasCalcQuery && pathname.startsWith('/explore')) {
        const returnPath = `${pathname}${window.location.search || ''}`;
        returnExplorePathRef.current = returnPath;
        syncShallowModalCloseToDashboard(returnPath);
        setIsCompareOpen(false);
        setIsMortgageOpen(false);
        setIsTaxCalcOpen(false);
        setIsJeonseSafetyOpen(false);
        setIsSellTimingOpen(false);
        setSelectedReport(null);
        setMobileModalOpen(false);
      }
    };
    window.addEventListener('popstate', handlePopState, { passive: true });
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getCanonicalAptSlug, getLocScore]);

  const handleAptClick = useCallback((apt: { name: string; dong: string; txKey?: string }) => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/explore')) {
      returnExplorePathRef.current = `${window.location.pathname}${window.location.search || ''}`;
    }
    const canonicalSlug = getCanonicalAptSlug(apt.name, apt.dong, apt.txKey);
    trackApartmentView({
      apartment_name: apt.name,
      apt_name: apt.name,
      canonical_slug: canonicalSlug,
      dong: apt.dong || undefined,
      surface: 'explore_catalog',
      view_type: 'modal',
    });
    syncShallowApartmentOpen(apt.name, { dong: apt.dong, canonicalSlug });
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

    setMobileModalOpen(true);
  }, [fieldReportsMap, getLocScore, getCanonicalAptSlug]);

  const handleAptClickByName = useCallback((name: string, dong?: string) => {
    const allApts = Object.values(sheetApartments).flat();
    const targetApt =
      allApts.find(
        (a) =>
          isSameApartment(a.name, name, nameMapping, a.dong, dong) ||
          (a.txKey ? isSameApartment(a.txKey, name, nameMapping, a.dong, dong) : false)
      ) ||
      (CANONICAL_DONG_APT_LIST.find(
        (a) =>
          isSameApartment(a.name, name, nameMapping, a.dong, dong) ||
          (a.txKey ? isSameApartment(a.txKey, name, nameMapping, a.dong, dong) : false) ||
          (a.rawTxKey ? isSameApartment(a.rawTxKey, name, nameMapping, a.dong, dong) : false)
      ) as DongApartment | undefined);
    if (targetApt) {
      handleAptClick(targetApt);
    } else {
      handleAptClick({ name, dong: dong || '' });
    }
  }, [sheetApartments, nameMapping, handleAptClick]);

  const filterCompatiblePendingContext = useCallback(
    (
      ctx: PendingCalculatorContextPayload | null,
      targetAptName?: string,
      allowDeepLinkEscalation = false
    ): PendingCalculatorContextPayload | null => {
      if (!ctx) return null;
      if (!allowDeepLinkEscalation && ctx.alreadyTrackedOpen) {
        return null;
      }
      const trimmedTarget = targetAptName?.trim() || '';
      const trimmedCtxApt = (ctx.aptName || ctx.canonicalSlug || '').trim();

      if (trimmedTarget) {
        if (!trimmedCtxApt) return null;
        const normTarget = normalizeAptName(trimmedTarget);
        const normCtx = normalizeAptName(trimmedCtxApt);
        const canonTarget = normalizeAptName(resolveCanonicalAptSlug(trimmedTarget));
        const canonCtx = normalizeAptName(resolveCanonicalAptSlug(trimmedCtxApt));
        const isMatch =
          (normTarget !== '' && normTarget === normCtx) ||
          (canonTarget !== '' && canonTarget === canonCtx) ||
          isSameApartment(trimmedTarget, trimmedCtxApt, nameMapping);
        return isMatch ? ctx : null;
      }

      if (trimmedCtxApt) return null;
      return ctx;
    },
    [nameMapping]
  );

  const handleOpenCompare = useCallback(() => {
    setCompareInitialApt(undefined);
    setCompareSecondApt(undefined);
    setIsCompareOpen(true);
  }, []);

  const handleOpenJeonseSafety = useCallback((aptName?: string) => {
    setJeonseSafetyInitialApt(aptName);
    setIsJeonseSafetyOpen(true);
  }, []);

  const handleOpenMortgage = useCallback(
    (
      aptName?: string,
      priceWon?: number,
      preConsumedCtx?: PendingCalculatorContextPayload | null
    ) => {
      const pendingCtx =
        preConsumedCtx !== undefined
          ? preConsumedCtx
          : filterCompatiblePendingContext(consumePendingCalculatorContext(), aptName, false);
      const resolvedApt = aptName || pendingCtx?.aptName || undefined;
      const resolvedPriceManwon =
        typeof priceWon === 'number' && Number.isFinite(priceWon) && priceWon > 0
          ? Math.round(priceWon / 10_000)
          : pendingCtx?.priceManwon &&
              Number.isFinite(pendingCtx.priceManwon) &&
              pendingCtx.priceManwon > 0
            ? Math.round(pendingCtx.priceManwon)
            : undefined;

      setIsCompareOpen(false);
      setIsTaxCalcOpen(false);
      setIsJeonseSafetyOpen(false);
      setIsSellTimingOpen(false);
      setMortgageInitialApt(resolvedApt);
      setMortgageInitialPriceManwon(resolvedPriceManwon);
      setMortgageInitialIncomeManwon(pendingCtx?.annualIncomeManwon);
      setIsMortgageOpen(true);
    },
    [filterCompatiblePendingContext]
  );

  const handleCloseMortgage = useCallback(() => {
    setIsMortgageOpen(false);
    setMortgageInitialApt(undefined);
    setMortgageInitialPriceManwon(undefined);
    setMortgageInitialIncomeManwon(undefined);
  }, []);

  const handleOpenTaxCalculator = useCallback(
    (
      aptName?: string,
      priceWon?: number,
      preConsumedCtx?: PendingCalculatorContextPayload | null
    ) => {
      const pendingCtx =
        preConsumedCtx !== undefined
          ? preConsumedCtx
          : filterCompatiblePendingContext(consumePendingCalculatorContext(), aptName, false);
      const resolvedApt = aptName || pendingCtx?.aptName || undefined;
      const resolvedPriceManwon =
        typeof priceWon === 'number' && Number.isFinite(priceWon) && priceWon > 0
          ? Math.round(priceWon / 10_000)
          : pendingCtx?.priceManwon &&
              Number.isFinite(pendingCtx.priceManwon) &&
              pendingCtx.priceManwon > 0
            ? Math.round(pendingCtx.priceManwon)
            : undefined;

      setIsCompareOpen(false);
      setIsMortgageOpen(false);
      setIsJeonseSafetyOpen(false);
      setIsSellTimingOpen(false);
      setTaxCalcInitialApt(resolvedApt);
      setTaxCalcInitialPriceManwon(resolvedPriceManwon);
      setTaxCalcInitialAreaOver85(pendingCtx?.areaOver85);
      setIsTaxCalcOpen(true);
    },
    [filterCompatiblePendingContext]
  );

  const handleCloseTaxCalculator = useCallback(() => {
    setIsTaxCalcOpen(false);
    setTaxCalcInitialApt(undefined);
    setTaxCalcInitialPriceManwon(undefined);
    setTaxCalcInitialAreaOver85(undefined);
  }, []);

  const handleOpenSellTimingCalculator = useCallback((aptName?: string) => {
    setSellTimingInitialApt(aptName);
    setIsSellTimingOpen(true);
  }, []);

  const handleCatalogOpenCompare = useCallback(() => {
    trackEvent('open_calculator', {
      calculator_type: 'compare',
      surface: 'explore_catalog',
      trigger: 'explore_quick_pill',
    });
    handleOpenCompare();
  }, [handleOpenCompare]);

  const handleCatalogOpenJeonseSafety = useCallback(
    (aptName?: string) => {
      trackEvent('open_calculator', {
        calculator_type: 'jeonse_safety',
        apartment_name: aptName,
        apt_name: aptName,
        surface: 'explore_catalog',
        trigger: 'explore_quick_pill',
      });
      handleOpenJeonseSafety(aptName);
    },
    [handleOpenJeonseSafety]
  );

  const handleCatalogOpenMortgage = useCallback(
    (aptName?: string) => {
      trackEvent('open_calculator', {
        calculator_type: 'mortgage',
        apartment_name: aptName,
        apt_name: aptName,
        surface: 'explore_catalog',
        trigger: 'explore_quick_pill',
      });
      handleOpenMortgage(aptName);
    },
    [handleOpenMortgage]
  );

  const handleCatalogOpenTaxCalculator = useCallback(
    (aptName?: string) => {
      trackEvent('open_calculator', {
        calculator_type: 'property_tax',
        apartment_name: aptName,
        apt_name: aptName,
        surface: 'explore_catalog',
        trigger: 'explore_quick_pill',
      });
      handleOpenTaxCalculator(aptName);
    },
    [handleOpenTaxCalculator]
  );

  const handleCatalogOpenSellTiming = useCallback(
    (aptName?: string) => {
      trackEvent('open_calculator', {
        calculator_type: 'sell_timing',
        apartment_name: aptName,
        apt_name: aptName,
        surface: 'explore_catalog',
        trigger: 'explore_quick_pill',
      });
      handleOpenSellTimingCalculator(aptName);
    },
    [handleOpenSellTimingCalculator]
  );

  const handledQueryCalcRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.__dviewDashboardCalcHostActive = true;

    const handleDirectModalEvent = (e: Event) => {
      const custom = e as CustomEvent<OpenCalculatorModalEventDetail>;
      const detail = custom.detail;
      if (!detail) return;

      const targetApt = detail.aptName || undefined;
      const compatibleCtx = filterCompatiblePendingContext(
        consumePendingCalculatorContext(),
        targetApt,
        true
      );
      const effectiveCtx: PendingCalculatorContextPayload = {
        ...(compatibleCtx || { timestamp: Date.now() }),
        ...(typeof detail.annualIncomeManwon === 'number'
          ? { annualIncomeManwon: detail.annualIncomeManwon }
          : {}),
        ...(typeof detail.areaOver85 === 'boolean'
          ? { areaOver85: detail.areaOver85 }
          : {}),
      };
      const trackedApt = targetApt || selectedReport?.apartmentName || undefined;

      if (!detail.alreadyTrackedOpen && !compatibleCtx?.alreadyTrackedOpen) {
        trackEvent('open_calculator', {
          calculator_type: detail.calcType,
          apartment_name: trackedApt,
          apt_name: trackedApt,
          surface: detail.surface,
          trigger: detail.trigger,
        });
      }

      if (detail.calcType === 'property_tax') {
        handleOpenTaxCalculator(targetApt, detail.priceWon, effectiveCtx);
      } else {
        handleOpenMortgage(targetApt, detail.priceWon, effectiveCtx);
      }
    };

    window.addEventListener('dview:open_calculator_modal', handleDirectModalEvent);
    return () => {
      window.__dviewDashboardCalcHostActive = false;
      window.removeEventListener('dview:open_calculator_modal', handleDirectModalEvent);
    };
  }, [
    filterCompatiblePendingContext,
    selectedReport?.apartmentName,
    handleOpenMortgage,
    handleOpenTaxCalculator,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.location) return;

    const syncCalcFromLocation = () => {
      const rawSearch = window.location.search || '';
      if (!rawSearch) {
        handledQueryCalcRef.current = null;
        return;
      }
      let sp: URLSearchParams;
      let calcParam: string | null = null;
      try {
        sp = new URLSearchParams(rawSearch);
        calcParam = sp.get('calc');
      } catch {
        handledQueryCalcRef.current = null;
        return;
      }
      if (!calcParam) {
        handledQueryCalcRef.current = null;
        return;
      }
      const normalizedCalc = calcParam.trim().toLowerCase();
      if (
        normalizedCalc !== 'mortgage' &&
        normalizedCalc !== 'property_tax' &&
        normalizedCalc !== 'tax' &&
        normalizedCalc !== 'jeonse_safety' &&
        normalizedCalc !== 'sell_timing'
      ) {
        return;
      }

      const dedupeKey = `${window.location.pathname}?calc=${normalizedCalc}`;
      if (handledQueryCalcRef.current === dedupeKey) return;

      const pathname = window.location.pathname || '/explore';
      const hashStr = window.location.hash || '';
      const hashAptMatch = hashStr.match(/[#&]apt=([^&]+)/);
      const urlTargetApt = pathname.startsWith('/apartment/')
        ? decodeSafeAptParam(pathname.slice('/apartment/'.length)) || undefined
        : hashAptMatch
          ? decodeSafeAptParam(hashAptMatch[1]) || selectedReport?.apartmentName || undefined
          : undefined;

      const rawPendingCtx = consumePendingCalculatorContext();
      const queryOverrides = parseCalculatorQueryOverrides(sp);
      const targetApt =
        urlTargetApt ||
        (queryOverrides.priceManwon !== undefined ? undefined : rawPendingCtx?.aptName || undefined);
      const compatiblePendingCtx = filterCompatiblePendingContext(
        rawPendingCtx,
        targetApt,
        true
      );

      const mergedCtx: PendingCalculatorContextPayload | null =
        compatiblePendingCtx ||
        queryOverrides.priceManwon !== undefined ||
        queryOverrides.annualIncomeManwon !== undefined ||
        queryOverrides.areaOver85 !== undefined
          ? {
              ...(compatiblePendingCtx || { timestamp: Date.now() }),
              ...(queryOverrides.priceManwon !== undefined
                ? { priceManwon: queryOverrides.priceManwon }
                : {}),
              ...(queryOverrides.annualIncomeManwon !== undefined
                ? { annualIncomeManwon: queryOverrides.annualIncomeManwon }
                : {}),
              ...(queryOverrides.areaOver85 !== undefined
                ? { areaOver85: queryOverrides.areaOver85 }
                : {}),
            }
          : null;

      const shouldSkipOpenTrack = Boolean(compatiblePendingCtx?.alreadyTrackedOpen);
      handledQueryCalcRef.current = dedupeKey;

      if (normalizedCalc === 'mortgage') {
        if (!shouldSkipOpenTrack) {
          trackEvent('open_calculator', {
            calculator_type: 'mortgage',
            apartment_name: targetApt,
            apt_name: targetApt,
            surface: 'explore_deep_link',
            trigger: 'url_query_deep_link',
          });
        }
        handleOpenMortgage(targetApt, undefined, mergedCtx);
      } else if (normalizedCalc === 'property_tax' || normalizedCalc === 'tax') {
        if (!shouldSkipOpenTrack) {
          trackEvent('open_calculator', {
            calculator_type: 'property_tax',
            apartment_name: targetApt,
            apt_name: targetApt,
            surface: 'explore_deep_link',
            trigger: 'url_query_deep_link',
          });
        }
        handleOpenTaxCalculator(targetApt, undefined, mergedCtx);
      } else if (normalizedCalc === 'jeonse_safety') {
        if (!shouldSkipOpenTrack) {
          trackEvent('open_calculator', {
            calculator_type: 'jeonse_safety',
            apartment_name: targetApt,
            apt_name: targetApt,
            surface: 'explore_deep_link',
            trigger: 'url_query_deep_link',
          });
        }
        handleOpenJeonseSafety(targetApt);
      } else if (normalizedCalc === 'sell_timing') {
        if (!shouldSkipOpenTrack) {
          trackEvent('open_calculator', {
            calculator_type: 'sell_timing',
            apartment_name: targetApt,
            apt_name: targetApt,
            surface: 'explore_deep_link',
            trigger: 'url_query_deep_link',
          });
        }
        handleOpenSellTimingCalculator(targetApt);
      }

      try {
        if (window.history && typeof window.history.replaceState === 'function') {
          sp.delete('calc');
          sp.delete('price');
          sp.delete('income');
          sp.delete('over85');
          const rawNextSearch = sp.toString() ? `?${sp.toString()}` : '';
          const nextSearch = window.location.pathname.startsWith('/apartment/')
            ? stripApartmentNoiseQueryParams(rawNextSearch)
            : rawNextSearch;
          window.history.replaceState(
            window.history.state,
            '',
            `${window.location.pathname}${nextSearch}${window.location.hash || ''}`
          );
          handledQueryCalcRef.current = null;
        }
      } catch {
        // Ignore history restrictions in sandboxed environments
      }
    };

    syncCalcFromLocation();
    window.addEventListener('popstate', syncCalcFromLocation);
    return () => {
      window.removeEventListener('popstate', syncCalcFromLocation);
    };
  }, [
    filterCompatiblePendingContext,
    selectedReport?.apartmentName,
    handleOpenMortgage,
    handleOpenTaxCalculator,
    handleOpenJeonseSafety,
    handleOpenSellTimingCalculator,
  ]);

  const isSplitDetailOpen = Boolean(selectedReport && mobileModalOpen);

  return (
    <>
      <PullToRefresh
        scrollContainerId="apartment-list-scroll"
        disabled={mobileModalOpen || !!selectedReport}
      >
        <div className="flex flex-col min-h-[100dvh] min-h-[800px] bg-transparent relative pb-[env(safe-area-inset-bottom)]">
          <div
            data-testid="master-detail-workspace"
            data-split-open={String(isSplitDetailOpen)}
            className="flex-1 flex flex-col md:flex-row items-start w-full max-w-[2000px] mx-auto min-w-0 relative transition-all duration-300 ease-out"
          >
            {/* Left Master Pane (Explore Catalog) */}
            <div
              data-testid="master-workspace-pane"
              className={`flex-1 min-w-0 max-w-full flex flex-col transition-all duration-300 ease-out ${
                isSplitDetailOpen
                  ? 'w-full md:w-[calc(100%-52vw)] lg:w-[calc(100%-780px)] xl:w-[calc(100%-880px)]'
                  : 'w-full'
              }`}
            >
              <main id="main-content" className="flex-1 w-full max-w-full mx-auto min-w-0 min-h-[85vh] min-h-[800px] transition-all duration-300 ease-out">
                <div>
                  <section className="w-full bg-transparent min-h-[85vh] min-h-[800px]">
                    <PageHeroHeader 
                      title="D-VIEW 아파트 탐색"
                      subtitleStrong={<MarketStatsStrong />}
                      subtitleLight={<MarketStatsLight />}
                      isSplitMode={isSplitDetailOpen}
                    />
                    <ErrorBoundary name="아파트 맞춤 탐색">
                      <TossApartmentExploreClient
                        sheetApartments={sheetApartments}
                        txSummaryData={txSummary}
                        nameMapping={nameMapping || {}}
                        fieldReportsMap={fieldReportsMap}
                        publicRentalSet={publicRentalSet}
                        typeMap={typeMap}
                        handleSelectApt={handleAptClickByName}
                        onOpenCompare={handleCatalogOpenCompare}
                        onOpenJeonseSafety={handleCatalogOpenJeonseSafety}
                        onOpenMortgage={handleCatalogOpenMortgage}
                        onOpenTaxCalculator={handleCatalogOpenTaxCalculator}
                        onOpenSellTimingCalculator={handleCatalogOpenSellTiming}
                        onSearchFocus={triggerFetch}
                        preloadApartmentTx={preloadApartmentTx}
                        isSplitMode={isSplitDetailOpen}
                        inFeedAdSlot={
                          process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true' ? (
                            <div
                              data-testid="explore-infeed-ad-wrapper"
                              className="w-full py-1 empty:hidden"
                            >
                              <AdSlot
                                refreshSlotId="explore_top_infeed"
                                format="in-feed"
                                minHeightClass="min-h-[140px] sm:min-h-[160px]"
                                cpaCampaignId="jeonse-sentinel"
                              />
                            </div>
                          ) : null
                        }
                      />
                    </ErrorBoundary>
                  </section>
                </div>
              </main>
            </div>

            {/* Right Detail Pane (Animated Split Inspector on Desktop / Bottom Sheet on Mobile) */}
            <aside
              data-testid="detail-workspace-pane"
              aria-label="아파트 상세 리포트 인스펙터"
              aria-hidden={!isSplitDetailOpen}
              className={`shrink-0 transition-all duration-300 ease-out ${
                isSplitDetailOpen
                  ? 'w-full md:w-[52vw] lg:w-[780px] xl:w-[880px] md:max-w-[780px] xl:max-w-[880px] md:h-dvh md:max-h-[calc(100dvh-80px)] md:sticky md:top-[80px] md:overflow-hidden opacity-100 z-[60] md:z-40'
                  : 'w-0 max-w-0 h-0 md:h-dvh md:max-h-[calc(100dvh-80px)] md:sticky md:top-[80px] opacity-0 md:translate-x-8 overflow-hidden pointer-events-none border-0'
              }`}
            >
              {isSplitDetailOpen && selectedReport && (
                <ErrorBoundary name="아파트 상세 정보">
                  <FieldReportModal
                    report={selectedReport}
                    onClose={() => {
                      const returnPath =
                        typeof window !== 'undefined' && window.location.pathname.startsWith('/explore')
                          ? `${window.location.pathname}${window.location.search || ''}`
                          : returnExplorePathRef.current || '/explore';
                      syncShallowModalCloseToDashboard(returnPath);
                      setSelectedReport(null);
                      setMobileModalOpen(false);
                    }}
                    user={user}
                    typeMap={typeMap}
                    inline={false}
                    sheetApartments={sheetApartments}
                    nameMapping={nameMapping || {}}
                    txSummaryData={txSummary}
                    locationScores={locationScores}
                    onSelectApartment={handleAptClickByName}

                    onOpenCompare={(aptName, targetAptName) => {
                      setCompareInitialApt(aptName);
                      setCompareSecondApt(targetAptName);
                      setIsCompareOpen(true);
                      trackEvent('open_calculator', {
                        calculator_type: 'compare',
                        apartment_name: aptName,
                        apt_name: aptName,
                        surface: 'explore_modal',
                      });
                    }}
                    onOpenJeonseSafety={(aptName) => {
                      setJeonseSafetyInitialApt(aptName);
                      setIsJeonseSafetyOpen(true);
                      trackEvent('open_calculator', {
                        calculator_type: 'jeonse_safety',
                        apartment_name: aptName,
                        apt_name: aptName,
                        surface: 'explore_modal',
                      });
                    }}
                    onOpenMortgage={(aptName, priceWon, trigger) => {
                      const trackedApt = aptName || selectedReport.apartmentName;
                      trackEvent('open_calculator', {
                        calculator_type: 'mortgage',
                        apartment_name: trackedApt,
                        apt_name: trackedApt,
                        surface: 'explore_modal',
                        trigger: trigger || 'header_tool_menu',
                      });
                      handleOpenMortgage(aptName || undefined, priceWon);
                    }}
                    onOpenTaxCalculator={(aptName, trigger) => {
                      const trackedApt = aptName || selectedReport.apartmentName;
                      trackEvent('open_calculator', {
                        calculator_type: 'property_tax',
                        apartment_name: trackedApt,
                        apt_name: trackedApt,
                        surface: 'explore_modal',
                        trigger: trigger || 'header_tool_menu',
                      });
                      handleOpenTaxCalculator(aptName || undefined);
                    }}
                    onOpenSellTimingCalculator={(aptName) => {
                      setSellTimingInitialApt(aptName);
                      setIsSellTimingOpen(true);
                      trackEvent('open_calculator', {
                        calculator_type: 'sell_timing',
                        apartment_name: aptName,
                        apt_name: aptName,
                        surface: 'explore_modal',
                      });
                    }}
                  />
                </ErrorBoundary>
              )}
            </aside>
          </div>
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
                  <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
                    <span className="text-xl font-black">!</span>
                  </div>
                  <h3 className="text-[15px] font-black text-primary mb-1">비교 분석기 로드 실패</h3>
                  <p className="text-[12px] font-medium text-tertiary mb-5 leading-normal">
                    비교 분석기를 불러오는 도중 오류가 발생했습니다. 다시 시도해 주시기 바랍니다.
                  </p>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={reset}
                      className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-extrabold text-[12px] rounded-xl transition-all cursor-pointer border-none"
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
            onClose={() => {
              setIsCompareOpen(false);
              setCompareSecondApt(undefined);
            }}
            initialAptName={compareInitialApt}
            initialSecondAptName={compareSecondApt}
            onSelectApartment={(aptName) => {
              setIsCompareOpen(false);
              setCompareSecondApt(undefined);
              handleAptClickByName(aptName);
            }}
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
                  <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
                    <span className="text-xl font-black">!</span>
                  </div>
                  <h3 className="text-[15px] font-black text-primary mb-1">전세 안전진단 로드 실패</h3>
                  <p className="text-[12px] font-medium text-tertiary mb-5 leading-normal">
                    전세 안전진단 계산기를 불러오는 도중 오류가 발생했습니다. 다시 시도해 주시기 바랍니다.
                  </p>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={reset}
                      className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-extrabold text-[12px] rounded-xl transition-all cursor-pointer border-none"
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
                  <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
                    <span className="text-xl font-black">!</span>
                  </div>
                  <h3 className="text-[15px] font-black text-primary mb-1">대출 계산기 로드 실패</h3>
                  <p className="text-[12px] font-medium text-tertiary mb-5 leading-normal">
                    대출 한도진단 계산기를 불러오는 도중 오류가 발생했습니다. 다시 시도해 주시기 바랍니다.
                  </p>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={reset}
                      className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-extrabold text-[12px] rounded-xl transition-all cursor-pointer border-none"
                    >
                      다시 시도
                    </button>
                    <button
                      onClick={handleCloseMortgage}
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
            onClose={handleCloseMortgage}
            initialAptName={mortgageInitialApt}
            initialPriceManwon={mortgageInitialPriceManwon}
            initialAnnualIncomeManwon={mortgageInitialIncomeManwon}
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
                  <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
                    <span className="text-xl font-black">!</span>
                  </div>
                  <h3 className="text-[15px] font-black text-primary mb-1">계산기 로드 실패</h3>
                  <p className="text-[12px] font-medium text-tertiary mb-5 leading-normal">
                    취득세 및 중개보수 계산기를 불러오는 도중 오류가 발생했습니다. 다시 시도해 주시기 바랍니다.
                  </p>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={reset}
                      className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-extrabold text-[12px] rounded-xl transition-all cursor-pointer border-none"
                    >
                      다시 시도
                    </button>
                    <button
                      onClick={handleCloseTaxCalculator}
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
            onClose={handleCloseTaxCalculator}
            initialAptName={taxCalcInitialApt}
            initialPriceManwon={taxCalcInitialPriceManwon}
            initialAreaOver85={taxCalcInitialAreaOver85}
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
                  <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
                    <span className="text-xl font-black">!</span>
                  </div>
                  <h3 className="text-[15px] font-black text-primary mb-1">진단기 로드 실패</h3>
                  <p className="text-[12px] font-medium text-tertiary mb-5 leading-normal">
                    AI 매도 타이밍 및 세무 진단기를 불러오는 도중 오류가 발생했습니다. 다시 시도해 주시기 바랍니다.
                  </p>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={reset}
                      className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-extrabold text-[12px] rounded-xl transition-all cursor-pointer border-none"
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
