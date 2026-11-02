'use client';

import { LayoutDashboard, Home, Newspaper, Building2 } from 'lucide-react';
import Link from 'next/link';

import { dashboardFacade, FieldReportData } from '@/lib/DashboardFacade';
import MobileDock from '@/components/pwa/MobileDock';
import LoungeHeader from '@/components/LoungeHeader';
import PageHeroHeader from '@/components/PageHeroHeader';

import dynamic from 'next/dynamic';
import PullToRefresh from '@/components/pwa/PullToRefresh';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { safeReload } from '@/lib/utils/safeReload';
import { localCache } from '@/lib/utils/localCache';
import { ViewedAptsSchema } from '@/lib/validation/facade.schemas';
import { trackEvent, trackApartmentView } from '@/lib/utils/analytics';
import {
  decodeSafeAptParam,
  syncShallowApartmentOpen,
  syncShallowModalCloseToDashboard,
  transitionRecirculationState,
} from '@/lib/ads/recirculationEngine';
import { logger } from '@/lib/services/logger';
import ApartmentModalSkeleton from '@/components/ui/ApartmentModalSkeleton';
import { type DongApartment } from '@/lib/dong-apartments';
import { type ObjectiveMetrics } from '@/types/report';
import { type LocationScoreItem } from '@/types/transaction';


// LCP Optimization: Skeletons for Heavy Dynamic Components

export const MacroDashboardSkeleton = () => (
  <div className="w-full flex flex-col bg-transparent animate-pulse min-h-[85vh] min-h-[800px] select-none" data-testid="macrodashboard-5zone-skeleton">
    {/* PageHeroHeader Skeleton */}
    <div className="h-[144px] flex flex-col gap-3 sm:gap-4 px-3 sm:px-6 md:px-10 lg:px-16 pt-[28px] md:pt-6 lg:pt-8 pb-1.5 sm:pb-6 w-full max-w-full overflow-x-clip min-w-0 bg-transparent border-b border-border/60 shrink-0">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="w-[36px] h-[36px] min-w-[36px] min-h-[36px] sm:w-[42px] sm:h-[42px] sm:min-w-[42px] sm:min-h-[42px] bg-black/5 dark:bg-surface/5 rounded-xl shrink-0" />
        <div className="w-48 sm:w-64 h-8 bg-black/5 dark:bg-surface/5 rounded-xl" />
      </div>
      <div className="w-72 sm:w-96 h-4 bg-black/5 dark:bg-surface/5 rounded-lg" />
    </div>

    {/* Content Grid Skeleton matching MacroDashboardClient 5-Zone Geometry */}
    <div className="flex flex-col px-4 sm:px-6 md:px-10 lg:px-16 pt-3 md:pt-5 pb-6 md:pb-8 lg:pb-10 w-full min-h-[85vh] min-h-[800px]">
      {/* ═══ Zone 2A: 6:6 Circular Donut Navigator + Connected 4-Card | Trend Chart Hero Skeleton ═══ */}
      <div
        data-testid="skeleton-zone2a-hero"
        className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-0 pb-5 mb-4 border-b border-border items-stretch min-h-[526px]"
      >
        {/* Left 6 Columns (h-[526px]): AptDonutSection (360px) + AptMetricCards (152px) */}
        <div className="lg:col-span-6 flex flex-col gap-3.5 min-w-0 min-h-[526px] pb-5 border-b border-border lg:pb-0 lg:border-b-0 lg:pr-6 xl:pr-8 lg:border-r lg:border-border box-border">
          <div className="h-[360px] rounded-2xl bg-black/5 dark:bg-surface/5 p-4 sm:p-5 flex flex-col justify-between border border-border/30">
            <div className="flex items-center justify-between gap-2">
              <div className="w-44 h-7 bg-black/10 dark:bg-surface/10 rounded-lg" />
              <div className="w-32 h-7 bg-black/10 dark:bg-surface/10 rounded-lg" />
            </div>
            <div className="flex items-center gap-4 flex-1 py-2">
              <div className="flex-1 flex items-center justify-center">
                <div className="w-[208px] h-[208px] sm:w-[226px] sm:h-[226px] lg:w-[174px] lg:h-[174px] xl:w-[220px] xl:h-[220px] 2xl:w-[262px] 2xl:h-[262px] rounded-full border-[20px] border-black/10 dark:border-surface/10 shrink-0" />
              </div>
              <div className="hidden sm:flex flex-col gap-2 sm:w-[268px] md:w-[296px] lg:w-[212px] xl:w-[280px] 2xl:w-[324px] shrink-0">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-6 w-full rounded-xl bg-black/10 dark:bg-surface/10" />
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 h-[152px]">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl bg-black/5 dark:bg-surface/5 p-3 flex flex-col justify-between border border-border/30">
                <div className="w-20 h-3.5 bg-black/10 dark:bg-surface/10 rounded" />
                <div className="w-24 h-5 bg-black/10 dark:bg-surface/10 rounded-lg" />
              </div>
            ))}
          </div>
        </div>

        {/* Right 6 Columns (h-[526px]): MacroChartSection */}
        <div className="lg:col-span-6 flex flex-col gap-6 min-w-0 min-h-[526px] lg:pl-6 xl:pl-8 box-border">
          <div className="h-[526px] rounded-2xl bg-black/5 dark:bg-surface/5 p-4 sm:p-5 flex flex-col justify-between border border-border/30">
            <div className="flex items-center justify-between gap-2">
              <div className="w-40 h-6 bg-black/10 dark:bg-surface/10 rounded-lg" />
              <div className="w-28 h-7 bg-black/10 dark:bg-surface/10 rounded-lg" />
            </div>
            <div className="w-full h-80 bg-black/10 dark:bg-surface/10 rounded-xl" />
          </div>
        </div>
      </div>

      {/* ═══ Prime In-Feed AdSlot 1 Skeleton ═══ */}
      <div
        data-testid="skeleton-hero-ad-slot-1"
        className="w-full h-[140px] sm:h-[160px] rounded-2xl bg-black/5 dark:bg-surface/5 border border-border/30 mb-6"
      />

      {/* ═══ Zone 3: Unified Timeline + Live Ranking Tabs Skeleton ═══ */}
      <div className="w-full min-h-[420px] rounded-2xl bg-black/5 dark:bg-surface/5 p-4 sm:p-6 flex flex-col gap-4 border border-border/30 mb-6">
        <div className="flex items-center justify-between">
          <div className="w-48 h-8 rounded-xl bg-black/10 dark:bg-surface/10" />
          <div className="w-32 h-8 rounded-xl bg-black/10 dark:bg-surface/10" />
        </div>
        <div className="flex flex-col gap-3 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 sm:h-22 w-full rounded-xl bg-black/10 dark:bg-surface/10" />
          ))}
        </div>
      </div>

      {/* ═══ Zone 4A: HighCpcFinanceSection + AdSlot 2 Skeleton ═══ */}
      <div className="w-full flex flex-col gap-6 mb-6">
        <div className="h-[140px] sm:h-[160px] rounded-2xl bg-black/5 dark:bg-surface/5 p-5 flex flex-col justify-between border border-border/30">
          <div className="w-48 h-6 bg-black/10 dark:bg-surface/10 rounded-lg" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 rounded-xl bg-black/10 dark:bg-surface/10" />
            ))}
          </div>
        </div>
        <div className="w-full h-[140px] sm:h-[160px] rounded-2xl bg-black/5 dark:bg-surface/5 border border-border/30" />
      </div>

      {/* ═══ Zone 4B: Curated Guides 3-Pack + 7:5 Retention & Community Hub Skeleton ═══ */}
      <div className="w-full flex flex-col gap-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 sm:h-40 rounded-2xl bg-black/5 dark:bg-surface/5 p-4 flex flex-col justify-between border border-border/30">
              <div className="w-24 h-4 bg-black/10 dark:bg-surface/10 rounded" />
              <div className="w-3/4 h-5 bg-black/10 dark:bg-surface/10 rounded" />
              <div className="w-20 h-4 bg-black/10 dark:bg-surface/10 rounded" />
            </div>
          ))}
        </div>
        <div
          data-testid="skeleton-zone4b-retention"
          className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
        >
          <div className="lg:col-span-7 flex flex-col gap-4 min-w-0">
            <div className="h-44 sm:h-52 rounded-2xl bg-black/5 dark:bg-surface/5 p-4 flex flex-col justify-between border border-border/30">
              <div className="w-40 h-5 bg-black/10 dark:bg-surface/10 rounded" />
              <div className="space-y-2">
                <div className="w-full h-8 bg-black/10 dark:bg-surface/10 rounded-lg" />
                <div className="w-full h-8 bg-black/10 dark:bg-surface/10 rounded-lg" />
              </div>
            </div>
            <div className="h-44 sm:h-52 rounded-2xl bg-black/5 dark:bg-surface/5 p-4 flex flex-col justify-between border border-border/30">
              <div className="w-36 h-5 bg-black/10 dark:bg-surface/10 rounded" />
              <div className="space-y-2">
                <div className="w-full h-8 bg-black/10 dark:bg-surface/10 rounded-lg" />
                <div className="w-32 h-8 bg-black/10 dark:bg-surface/10 rounded-lg" />
              </div>
            </div>
          </div>
          <div className="lg:col-span-5 flex flex-col gap-4 min-w-0">
            <div className="h-[360px] rounded-2xl bg-black/5 dark:bg-surface/5 p-4 sm:p-5 flex flex-col justify-between border border-border/30">
              <div className="flex items-center justify-between">
                <div className="w-32 h-5 bg-black/10 dark:bg-surface/10 rounded" />
                <div className="w-20 h-5 bg-black/10 dark:bg-surface/10 rounded" />
              </div>
              <div className="flex flex-col gap-2.5">
                <div className="w-full h-11 rounded-xl bg-black/10 dark:bg-surface/10" />
                <div className="w-full h-11 rounded-xl bg-black/10 dark:bg-surface/10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const GapExplorerSkeleton = () => (
  <div className="w-full flex flex-col bg-transparent animate-pulse min-h-[85vh] min-h-[800px]">
    <div className="min-h-[156px] sm:min-h-[144px] flex flex-col gap-[19px] sm:gap-[23px] px-4 sm:px-6 md:px-10 lg:px-16 pt-[20px] md:pt-6 lg:pt-8 pb-4 sm:pb-6 w-full border-b border-border/60">
      <div className="w-56 h-8 bg-black/5 dark:bg-surface/5 rounded-xl" />
      <div className="w-80 h-4 bg-black/5 dark:bg-surface/5 rounded-lg" />
    </div>
    <div className="flex flex-col px-4 sm:px-6 md:px-10 lg:px-16 pt-3 md:pt-5 pb-6 w-full min-h-[85vh] min-h-[800px]">
      <div className="flex gap-4 overflow-x-hidden mb-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="w-72 h-44 bg-black/5 dark:bg-surface/5 rounded-2xl shrink-0" />
        ))}
      </div>
      <div className="w-full h-80 bg-black/5 dark:bg-surface/5 rounded-2xl" />
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
const FieldReportModal = dynamic(() => import('@/components/apartment/ApartmentModal').catch(err => {
  logger.warn('DashboardClient.dynamic', 'FieldReportModal Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('FieldReportModal');
  return { default: () => null };
}), { 
  ssr: false,
  loading: () => <ApartmentModalSkeleton />
});


import MacroDashboardClient from '@/components/MacroDashboardClient';

const AptCompareModal = dynamic(() => import('@/components/consumer/AptCompareModal').catch(err => {
  logger.warn('DashboardClient.dynamic', 'AptCompareModal Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('AptCompareModal');
  return { default: () => null };
}), {
  ssr: false,
  loading: () => <CalculatorLoader text="비교 대시보드 로드 중" />
});
const JeonseSafetyCalculator = dynamic(() => import('@/components/consumer/JeonseSafetyCalculator').catch(err => {
  logger.warn('DashboardClient.dynamic', 'JeonseSafetyCalculator Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('JeonseSafetyCalculator');
  return { default: () => null };
}), {
  ssr: false,
  loading: () => <CalculatorLoader text="전세 안전진단 계산기 로드 중" />
});
const MortgageCalculator = dynamic(() => import('@/components/consumer/MortgageCalculator').catch(err => {
  logger.warn('DashboardClient.dynamic', 'MortgageCalculator Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('MortgageCalculator');
  return { default: () => null };
}), {
  ssr: false,
  loading: () => <CalculatorLoader text="대출 계산기 로드 중" />
});

const PropertyTaxCalculator = dynamic(() => import('@/components/consumer/PropertyTaxCalculator').catch(err => {
  logger.warn('DashboardClient.dynamic', 'PropertyTaxCalculator Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('PropertyTaxCalculator');
  return { default: () => null };
}), {
  ssr: false,
  loading: () => <CalculatorLoader text="취득세 계산기 로드 중" />
});

const SellTimingCalculator = dynamic(() => import('@/components/consumer/SellTimingCalculator').catch(err => {
  logger.warn('DashboardClient.dynamic', 'SellTimingCalculator Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('SellTimingCalculator');
  return { default: () => null };
}), {
  ssr: false,
  loading: () => <CalculatorLoader text="매도 진단기 로드 중" />
});

interface StaticApartment { name: string; dong: string; householdCount?: number; yearBuilt?: string; brand?: string; }
import {
  isSameApartment,
  normalizeAptName,
  sanitizeAptKey,
  HARDCODED_MAPPING,
  findTxKey,
  resolveCanonicalAptSlug,
  stripApartmentNoiseQueryParams,
} from '@/lib/utils/apartmentMapping';
import React, { useState, useEffect, useMemo, useRef, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { getDisplayName } from '@/lib/utils/userUtils';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardMeta, type DashboardInitialDataLocal } from '@/hooks/useDashboardMeta';

import { usePreloadApartmentTx } from '@/hooks/usePreloadApartmentTx';
import { usePWA } from '@/components/pwa/PWAProvider';
import { useTxData, useLocationScores } from '@/hooks/useStaticData';
import { preloadApartmentModal, preloadDashboardFeatures } from '@/components/common/ComponentPreloader';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} (${url})`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Expected JSON response from ${url}, received ${contentType || 'non-JSON'}`);
  }
  return res.json();
};

const EMPTY_OBJECT: Record<string, never> = Object.freeze({});
const EMPTY_SET = new Set<string>();
const EMPTY_ARRAY: never[] = [];

function buildStubObjectiveMetrics(
  apt: StaticApartment | DongApartment,
  loc?: LocationScoreItem,
  base?: ObjectiveMetrics
): ObjectiveMetrics {
  const dongApt = apt as DongApartment;
  const parsedYear = apt.yearBuilt ? Number(apt.yearBuilt) : (base?.yearBuilt ?? 0);
  return {
    ...(base || {}),
    brand: apt.brand ?? base?.brand ?? '',
    householdCount: apt.householdCount ?? base?.householdCount ?? 0,
    far: dongApt.far ?? base?.far ?? 0,
    bcr: dongApt.bcr ?? base?.bcr ?? 0,
    parkingCount: dongApt.parkingCount ?? base?.parkingCount,
    parkingPerHousehold: dongApt.parkingPerHousehold ?? base?.parkingPerHousehold ?? 0,
    yearBuilt: Number.isFinite(parsedYear) ? parsedYear : 0,
    minFloor: dongApt.minFloor ?? base?.minFloor,
    maxFloor: dongApt.maxFloor ?? base?.maxFloor,
    distanceToElementary: loc?.distanceToElementary ?? base?.distanceToElementary ?? 0,
    distanceToMiddle: loc?.distanceToMiddle ?? base?.distanceToMiddle ?? 0,
    distanceToHigh: loc?.distanceToHigh ?? base?.distanceToHigh ?? 0,
    distanceToSubway: loc?.distanceToSubway ?? base?.distanceToSubway ?? 0,
    academyDensity: typeof loc?.academyDensity === 'number' ? loc.academyDensity : (base?.academyDensity ?? 0),
    distanceToIndeokwon: loc?.distanceToIndeokwon ?? base?.distanceToIndeokwon,
    distanceToTram: loc?.distanceToTram ?? base?.distanceToTram,
    distanceToStarbucks: loc?.distanceToStarbucks ?? dongApt.distanceToStarbucks ?? base?.distanceToStarbucks,
    distanceToOliveYoung: loc?.distanceToOliveYoung ?? dongApt.distanceToOliveYoung ?? base?.distanceToOliveYoung,
  };
}

const DashboardClient = React.memo(function DashboardClient({ 
  initialDashboardData, 
  preselectedAptName,
  initialTab = 'overview',
  autoOpenPreselectedModal = false,
  hideHeader = false,
}: { 
  initialDashboardData?: DashboardInitialDataLocal, 
  preselectedAptName?: string,
  initialTab?: 'overview' | 'imjang' | 'mbti',
  autoOpenPreselectedModal?: boolean,
  hideHeader?: boolean,
}) {
  const router = useRouter();
  const kpis = initialDashboardData?.kpis || [];
  const fieldReports = initialDashboardData?.fieldReports || [];
  const adBanner = dashboardFacade.getAdBanner();
  // Moduled Hooks Architecture
  const { user, userProfile, anonProfile, handleLogin, handleLogout } = useAuth();
  const { sheetApartments, typeMap, nameMapping, publicRentalSet, triggerFetch, isLoading } = useDashboardMeta(initialDashboardData);
  
  const [mounted, setMounted] = useState(false);
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  
  const [selectedReport, setSelectedReport] = useState<FieldReportData | null>(null);
  
  // 1:1 아파트 비교 대시보드 상태
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareInitialApt, setCompareInitialApt] = useState<string | undefined>(undefined);
  const [compareSecondApt, setCompareSecondApt] = useState<string | undefined>(undefined);
  const returnToAptRef = useRef<string | null>(null);

  
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
  
  const { txSummary: fetchedTxSummary = EMPTY_OBJECT, recentTransactions = [], macroTrend = [], recent7DaysVolume, isLoading: isStaticDataLoading } = useTxData(
    initialDashboardData?.macroTrend,
    preselectedAptName ? undefined : initialDashboardData?.txSummary,
    initialDashboardData?.recent7DaysVolume,
    initialDashboardData?.recentTransactions
  );

  const txSummary = useMemo(
    () =>
      preselectedAptName && initialDashboardData?.txSummary
        ? { ...initialDashboardData.txSummary, ...fetchedTxSummary }
        : fetchedTxSummary,
    [preselectedAptName, initialDashboardData?.txSummary, fetchedTxSummary]
  );

  const filteredRecentTransactions = useMemo(() => {
    if (!recentTransactions || recentTransactions.length === 0) return [];
    if (!nameMapping || Object.keys(nameMapping).length === 0) return recentTransactions;
    
    const targetTxKeys = new Set<string>();
    for (const [key, tKey] of Object.entries(nameMapping)) {
      if (key) {
        targetTxKeys.add(normalizeAptName(key));
        targetTxKeys.add(sanitizeAptKey(key));
      }
      if (tKey) {
        targetTxKeys.add(normalizeAptName(tKey));
        targetTxKeys.add(sanitizeAptKey(tKey));
      }
    }
    for (const [k, v] of Object.entries(HARDCODED_MAPPING)) {
      targetTxKeys.add(normalizeAptName(k));
      targetTxKeys.add(normalizeAptName(v));
      targetTxKeys.add(sanitizeAptKey(k));
      targetTxKeys.add(sanitizeAptKey(v));
    }
    if (txSummary) {
      for (const k of Object.keys(txSummary)) {
        targetTxKeys.add(normalizeAptName(k));
        targetTxKeys.add(sanitizeAptKey(k));
      }
    }

    const filtered = recentTransactions.filter((tx: { aptName?: string; txKey?: string }) => {
      if (!tx) return false;
      const normTxKey = tx.txKey ? normalizeAptName(tx.txKey) : '';
      const normAptName = tx.aptName ? normalizeAptName(tx.aptName) : '';
      const sanTxKey = tx.txKey ? sanitizeAptKey(tx.txKey) : '';
      const sanAptName = tx.aptName ? sanitizeAptKey(tx.aptName) : '';
      return (normTxKey !== '' && targetTxKeys.has(normTxKey)) || 
             (normAptName !== '' && targetTxKeys.has(normAptName)) ||
             (sanTxKey !== '' && targetTxKeys.has(sanTxKey)) ||
             (sanAptName !== '' && targetTxKeys.has(sanAptName));
    });

    return filtered.length > 0 ? filtered : recentTransactions;
  }, [recentTransactions, nameMapping, txSummary]);

  const { locationScores: fetchedLocationScores = EMPTY_OBJECT } = useLocationScores(
    preselectedAptName ? undefined : initialDashboardData?.locationScores
  );

  const locationScores = useMemo(
    () =>
      preselectedAptName && initialDashboardData?.locationScores
        ? { ...initialDashboardData.locationScores, ...fetchedLocationScores }
        : fetchedLocationScores,
    [preselectedAptName, initialDashboardData?.locationScores, fetchedLocationScores]
  );
  
  const getLocScore = useCallback((aptName: string): LocationScoreItem | undefined => {
    if (!aptName || !locationScores) return undefined;
    const matchKey = findTxKey(aptName, locationScores, nameMapping);
    return matchKey ? locationScores[matchKey] : undefined;
  }, [locationScores, nameMapping]);
  
  const preloadApartmentTx = usePreloadApartmentTx(sheetApartments, nameMapping, txSummary);

  const { triggerCustomA2HSModal } = usePWA();

  const [activeTab, setActiveTab] = useState<'overview' | 'imjang' | 'mbti'>(initialTab);
  const [isPending, startTransition] = useTransition();
  const [hasOpenedOverview, setHasOpenedOverview] = useState(initialTab === 'overview');

  useEffect(() => {
    if (activeTab === 'overview') setHasOpenedOverview(true);
  }, [activeTab]);

  // Tab highlight logic removed since boxes are separated now

  // Trigger lazy fetching of detailed sheets data on relevant tab switches or deep-links
  useEffect(() => {
    if (activeTab === 'imjang') {
      triggerFetch();
    } else if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('apt=') || hash.includes('gap') || hash.includes('imjang')) {
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
      } else if (window.location.hash.startsWith('#stats') || tabParam === 'stats') {
        router.replace('/stats');
        return;
      } else if (window.location.hash.startsWith('#office') || window.location.hash.startsWith('#gap') || tabParam === 'office' || tabParam === 'gap' || hasCurationParams) {
        setActiveTab('overview');
      } else if (window.location.hash.startsWith('#mbti') || tabParam === 'mbti') {
        setActiveTab('mbti');
      } else if (window.location.hash.startsWith('#notice=') || tabParam === 'news' || tabParam === 'notices') {
        router.replace('/news');
        return;
      } else if (window.location.hash.startsWith('#lounge') || tabParam === 'lounge' || tabParam === 'talk') {
        setActiveTab('overview');
      }

      // Preload non-essential heavy chunks (modal, extra dashboard features) deferred during idle time
      // to avoid competing with main dashboard hydration and first contentful paint
      const preloadHeavyComponents = () => {
        if (!isMounted) return;
        // Keep essential dashboard chunk loading
        import('@/components/MacroDashboardClient').catch(() => {});

        const deferNonEssential = () => {
          if (!isMounted) return;
          preloadApartmentModal();
          preloadDashboardFeatures();
        };

        if (typeof window !== 'undefined') {
          if ('requestIdleCallback' in window && window.requestIdleCallback) {
            idleId = window.requestIdleCallback(deferNonEssential, { timeout: 3000 });
          } else {
            preloadTimeoutRef.current = setTimeout(deferNonEssential, 3000);
          }
        }
      };
      preloadHeavyComponents();

      const syncTabFromLocation = () => {
        const queryParams = new URLSearchParams(window.location.search);
        const queryTab = queryParams.get('tab');

        if (!isMounted) return;
        startTransition(() => {
          if (window.location.hash.startsWith('#imjang')) {
            setActiveTab('imjang');
          } else if (window.location.hash.startsWith('#mbti')) {
            setActiveTab('mbti');
          } else if (window.location.hash.startsWith('#overview') || window.location.hash.startsWith('#technovalley') || window.location.hash.startsWith('#techno') || window.location.hash.startsWith('#office')) {
            setActiveTab('overview');
          } else if (queryTab === 'imjang') {
            setActiveTab('imjang');
          } else if (queryTab === 'mbti') {
            setActiveTab('mbti');
          } else if (queryTab === 'overview' || window.location.hash === '' || window.location.pathname === '/') {
            setActiveTab('overview');
          } else {
            setActiveTab('overview');
          }
        });
      };
      window.addEventListener('hashchange', syncTabFromLocation, { passive: true });
      window.addEventListener('popstate', syncTabFromLocation, { passive: true });

      return () => {
        isMounted = false;
        mountedRef.current = false;
        if (idleId !== null && window.cancelIdleCallback) {
          window.cancelIdleCallback(idleId);
        }
        window.removeEventListener('hashchange', syncTabFromLocation);
        window.removeEventListener('popstate', syncTabFromLocation);

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
              metrics: buildStubObjectiveMetrics(targetApt, getLocScore(targetApt.name)),
            });
          }
          setMobileModalOpen(true);
          trackEvent('apartment_view', {
            apartment_name: targetApt.name,
            apt_name: targetApt.name,
            dong: targetApt.dong || undefined,
            surface: 'dashboard_hash_modal',
            view_type: 'modal',
            trigger: 'hash_link',
          });
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

  // Scroll to top when tab changes & track event
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (mounted) {
      trackEvent('tab_view', { tab_name: activeTab });
    }
  }, [activeTab, mounted]);

  const getCanonicalAptSlug = useCallback(
    (aptName?: string, dongHint?: string, txKeyHint?: string): string => {
      if (!aptName) return '';
      const metaEntry = initialDashboardData?.apartmentMeta?.[aptName] as Partial<DongApartment> | undefined;
      return (
        resolveCanonicalAptSlug(aptName, {
          txKey: txKeyHint || metaEntry?.txKey,
          txMap: txSummary,
          sheetApartments,
          manualMapping: nameMapping,
          dong: dongHint || metaEntry?.dong,
        }) || aptName
      );
    },
    [initialDashboardData?.apartmentMeta, txSummary, sheetApartments, nameMapping]
  );

  const userHasSelected = useRef(false);

  useEffect(() => {
    if (userHasSelected.current) return;
    if (selectedReport) return;
    const allApts = Object.values(sheetApartments).flat();
    if (allApts.length === 0) return;
    
    // If preselectedAptName is passed from the SEO page wrapper
    if (preselectedAptName) {
      userHasSelected.current = true;
      const metaEntry = initialDashboardData?.apartmentMeta?.[preselectedAptName] as Partial<DongApartment> | undefined;
      const fallbackDong =
        metaEntry?.dong ||
        initialDashboardData?.txSummary?.[preselectedAptName]?.dong ||
        '';
      const targetApt = allApts.find(
        a =>
          isSameApartment(a.name, preselectedAptName, nameMapping, a.dong, fallbackDong || undefined) ||
          (a.txKey
            ? isSameApartment(a.txKey, preselectedAptName, nameMapping, a.dong, fallbackDong || undefined)
            : false) ||
          (metaEntry?.name
            ? isSameApartment(a.name, metaEntry.name, nameMapping, a.dong, fallbackDong || undefined)
            : false)
      );
      const resolvedApt: StaticApartment | DongApartment | undefined = targetApt
        ? {
            ...targetApt,
            ...metaEntry,
            name: targetApt.name,
            dong: targetApt.dong || fallbackDong,
          }
        : fallbackDong || metaEntry || fieldReports.length > 0
        ? {
            ...metaEntry,
            name: metaEntry?.name || preselectedAptName,
            dong: fallbackDong,
          }
        : { name: preselectedAptName, dong: fallbackDong };
      if (resolvedApt) {
        const canonicalSlug = getCanonicalAptSlug(
          resolvedApt.name,
          resolvedApt.dong,
          (targetApt as DongApartment | undefined)?.txKey || metaEntry?.txKey
        );
        if (
          typeof window !== 'undefined' &&
          canonicalSlug &&
          window.location.pathname.startsWith('/apartment/')
        ) {
          const canonicalPath = `/apartment/${encodeURIComponent(canonicalSlug)}`;
          const currentSearch = window.location.search || '';
          const cleanedSearch = stripApartmentNoiseQueryParams(currentSearch);
          if (
            (window.location.pathname !== canonicalPath || cleanedSearch !== currentSearch) &&
            typeof window.history?.replaceState === 'function'
          ) {
            window.history.replaceState(
              window.history.state,
              '',
              `${canonicalPath}${cleanedSearch}${window.location.hash || ''}`
            );
          }
        }
        if (autoOpenPreselectedModal) {
          const report =
            (targetApt && fieldReportsMap.get(targetApt.name)) ||
            fieldReports.find(r => isSameApartment(r.apartmentName, preselectedAptName, nameMapping));
          const locScore = getLocScore(resolvedApt.name) || getLocScore(preselectedAptName);
          setSelectedReport(report || {
            id: `stub-${normalizeAptName(resolvedApt.name)}`,
            apartmentName: resolvedApt.name,
            dong: resolvedApt.dong,
            author: '',
            likes: 0,
            commentCount: 0,
            createdAt: null,
            metrics: buildStubObjectiveMetrics(resolvedApt, locScore),
          });
          triggerFetch();
          setMobileModalOpen(true);
          trackEvent('apartment_view', {
            apartment_name: resolvedApt.name,
            apt_name: resolvedApt.name,
            canonical_slug: canonicalSlug || resolvedApt.name,
            dong: resolvedApt.dong || undefined,
            surface: 'dashboard_preselected_modal',
            view_type: 'modal',
            trigger: 'preselected_apt',
          });
        }
      }
      return; 
    }

    if (typeof window !== 'undefined' && window.innerWidth < 768) return;
    // Auto-select is disabled so that the Ad slot placeholder remains visible on desktop until a user actively clicks an apartment.
  }, [fieldReports, preselectedAptName, autoOpenPreselectedModal, triggerFetch, getCanonicalAptSlug]);

  useEffect(() => {
    if (!selectedReport || selectedReport.metrics?.householdCount) return;
    const allApts = Object.values(sheetApartments).flat();
    if (allApts.length === 0) return;
    const targetApt = allApts.find(a =>
      isSameApartment(a.name, selectedReport.apartmentName, nameMapping, a.dong, selectedReport.dong || undefined)
    );
    if (targetApt && targetApt.householdCount) {
      setSelectedReport(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          dong: prev.dong || targetApt.dong || '',
          metrics: buildStubObjectiveMetrics(targetApt, getLocScore(targetApt.name), prev.metrics),
        };
      });
    }
  }, [sheetApartments, selectedReport, nameMapping, getLocScore]);

  // Handle Browser Back Button for soft-navigation URL routing
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const pathname = window.location.pathname || '/';
      if (pathname.startsWith('/apartment/')) {
        const aptParam = decodeSafeAptParam(pathname.slice('/apartment/'.length));
        setIsCompareOpen(false);
        setIsMortgageOpen(false);
        setIsTaxCalcOpen(false);
        returnToAptRef.current = null;
        if (aptParam) {
          const { sheetApartments: apartments, fieldReportsMap: reportsMap, nameMapping: mapping } = hashStateRef.current;
          const allApts = apartments ? Object.values(apartments).flat() : [];
          const targetApt = allApts.find(
            a =>
              isSameApartment(a.name, aptParam, mapping) ||
              (a.txKey ? isSameApartment(a.txKey, aptParam, mapping) : false)
          );
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
          const report = (targetApt && reportsMap?.get(targetApt.name)) || {
            id: `stub-${normalizeAptName(resolvedName)}`,
            apartmentName: resolvedName,
            dong: resolvedDong,
            author: '',
            likes: 0,
            commentCount: 0,
            createdAt: null,
            metrics: buildStubObjectiveMetrics(
              targetApt || { name: aptParam, dong: '' },
              getLocScore(resolvedName)
            ),
          };
          setSelectedReport(report);
          setMobileModalOpen(true);
          userHasSelected.current = true;
        }
        return;
      }

      // If we go back to the root (no hash), clear selection and close sub-modals (soft close)
      if (!window.location.hash && (pathname === '/' || pathname === '')) {
        returnToAptRef.current = null;
        setIsCompareOpen(false);
        setIsMortgageOpen(false);
        setIsTaxCalcOpen(false);
        setSelectedReport(null);
        setMobileModalOpen(false);
        userHasSelected.current = true;
        syncShallowModalCloseToDashboard();
      }
    };
    window.addEventListener('popstate', handlePopState, { passive: true });
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setSelectedReport, getLocScore, getCanonicalAptSlug]);

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
      metrics: buildStubObjectiveMetrics(apt, getLocScore(apt.name)),
    };
    setSelectedReport(initialReport);

    // Backfill detailed metrics asynchronously if missing (e.g. when entered from quiz before explore data loads)
    if (!apt.householdCount) {
      const controller = new AbortController();
      fetch('/api/apartments-by-dong', { signal: controller.signal })
        .then(res => res.json())
        .then(data => {
          if (data && data.byDong) {
            const allApts = Object.values(data.byDong).flat() as DongApartment[];
            const targetApt = allApts.find(a => isSameApartment(a.name, apt.name, nameMapping, a.dong, apt.dong) || (a.txKey ? isSameApartment(a.txKey, apt.name, nameMapping, a.dong, apt.dong) : false));
            if (targetApt && targetApt.householdCount) {
              setSelectedReport(prev => {
                if (!prev || prev.apartmentName !== apt.name) return prev;
                return {
                  ...prev,
                  metrics: buildStubObjectiveMetrics(targetApt, getLocScore(apt.name), prev.metrics),
                };
              });
            }
          }
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            logger.warn('DashboardClient.handleAptClick', 'Failed to backfill apartment details', undefined, err);
          }
        });
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

    // Shallow Routing & Virtual PV Invariant: synchronize `/apartment/[aptName]` and fire virtual PV + funnel view_apartment
    const canonicalSlug = getCanonicalAptSlug(apt.name, apt.dong, (apt as DongApartment).txKey);
    trackEvent('view_apartment', { apt_name: apt.name, dong: apt.dong || undefined, surface: 'dashboard' });
    trackEvent('apartment_view', {
      apartment_name: apt.name,
      apt_name: apt.name,
      canonical_slug: canonicalSlug,
      dong: apt.dong || undefined,
      surface: 'dashboard',
      view_type: 'modal',
    });
    syncShallowApartmentOpen(apt.name, { dong: apt.dong, canonicalSlug });
    setMobileModalOpen(true);
  }, [fieldReportsMap, setSelectedReport, nameMapping, getLocScore, triggerFetch, getCanonicalAptSlug]);

  const handleAptClickByName = useCallback((name: string, dong?: string) => {
    const allApts = Object.values(sheetApartments).flat();
    const targetApt = allApts.find(a => isSameApartment(a.name, name, nameMapping, a.dong, dong) || (a.txKey ? isSameApartment(a.txKey, name, nameMapping, a.dong, dong) : false));
    if (targetApt) {
      handleAptClick(targetApt);
    } else {
      handleAptClick({ name, dong: dong || '' });
    }
  }, [sheetApartments, nameMapping, handleAptClick]);

  const handleNavigateApartmentPage = useCallback((name: string, dong?: string) => {
    if (!name) return;
    const allApts = Object.values(sheetApartments).flat();
    const targetApt = allApts.find(
      (a) =>
        isSameApartment(a.name, name, nameMapping, a.dong, dong) ||
        (a.txKey ? isSameApartment(a.txKey, name, nameMapping, a.dong, dong) : false)
    );
    const resolvedDong = dong || targetApt?.dong;
    const canonicalSlug = getCanonicalAptSlug(name, resolvedDong, targetApt?.txKey);

    if (typeof window !== 'undefined') {
      try {
        const history = localCache.get('dview_viewed_apts', ViewedAptsSchema, []);
        const updated = [name, ...history.filter((h: string) => h !== name)].slice(0, 10);
        localCache.set('dview_viewed_apts', updated, 604800);
        window.dispatchEvent(new Event('dview_viewed_apts_changed'));
      } catch (e) {
        logger.warn('DashboardClient.handleNavigateApartmentPage', 'LocalStorage write error', undefined, e);
      }
    }

    router.push(`/apartment/${encodeURIComponent(canonicalSlug)}`);
  }, [sheetApartments, nameMapping, getCanonicalAptSlug, router]);

  const handleOpenAdModal = useCallback(() => {}, []);

  const handleOpenCompare = useCallback(
    (aptName?: string, targetAptName?: string) => {
      setIsMortgageOpen(false);
      setIsTaxCalcOpen(false);
      setCompareInitialApt(aptName);
      setCompareSecondApt(targetAptName);
      if ((mobileModalOpen && selectedReport) || returnToAptRef.current) {
        const baseApt = aptName || returnToAptRef.current || selectedReport?.apartmentName || '';
        const canonicalBaseApt = getCanonicalAptSlug(baseApt, selectedReport?.dong);
        const canonicalTargetApt = targetAptName ? getCanonicalAptSlug(targetAptName) : '';
        returnToAptRef.current = canonicalBaseApt;
        setMobileModalOpen(false);
        transitionRecirculationState(
          { status: 'CHAPTER_EXPLORE', apt: canonicalBaseApt },
          {
            type: 'CLICK_RECIRC_COMPARE',
            baseApt: canonicalBaseApt,
            targetApt: canonicalTargetApt,
          }
        );
      } else if (aptName && targetAptName) {
        transitionRecirculationState(
          { status: 'DASHBOARD_IDLE' },
          {
            type: 'CLICK_RECIRC_COMPARE',
            baseApt: getCanonicalAptSlug(aptName),
            targetApt: getCanonicalAptSlug(targetAptName),
          }
        );
      }
      setIsCompareOpen(true);
    },
    [mobileModalOpen, selectedReport, getCanonicalAptSlug]
  );

  const handleCloseCompare = useCallback(() => {
    setIsCompareOpen(false);
    const prevBaseApt = returnToAptRef.current;
    const prevSecondApt = compareSecondApt;
    setCompareSecondApt(undefined);
    if (prevBaseApt) {
      returnToAptRef.current = null;
      transitionRecirculationState(
        { status: 'COMPARE_OPEN', apt1: prevBaseApt, apt2: prevSecondApt || '' },
        { type: 'MODAL_CLOSE' }
      );
      setMobileModalOpen(true);
    }
  }, [compareSecondApt]);

  const handleOpenJeonseSafety = useCallback((aptName?: string) => {
    setJeonseSafetyInitialApt(aptName);
    setIsJeonseSafetyOpen(true);
  }, []);

  const handleOpenMortgage = useCallback(
    (aptName?: string, priceWon?: number) => {
      setIsCompareOpen(false);
      setIsTaxCalcOpen(false);
      setMortgageInitialApt(aptName);
      if ((mobileModalOpen && selectedReport) || returnToAptRef.current) {
        const baseApt = aptName || returnToAptRef.current || selectedReport?.apartmentName || '';
        const canonicalBaseApt = getCanonicalAptSlug(baseApt, selectedReport?.dong);
        returnToAptRef.current = canonicalBaseApt;
        setMobileModalOpen(false);
        transitionRecirculationState(
          { status: 'CHAPTER_EXPLORE', apt: canonicalBaseApt },
          {
            type: 'CLICK_RECIRC_MORTGAGE',
            apt: canonicalBaseApt,
            priceWon,
            calcType: 'mortgage',
          }
        );
      } else if (aptName) {
        transitionRecirculationState(
          { status: 'DASHBOARD_IDLE' },
          {
            type: 'CLICK_RECIRC_MORTGAGE',
            apt: getCanonicalAptSlug(aptName),
            priceWon,
            calcType: 'mortgage',
          }
        );
      }
      setIsMortgageOpen(true);
    },
    [mobileModalOpen, selectedReport, getCanonicalAptSlug]
  );

  const handleCloseMortgage = useCallback(() => {
    setIsMortgageOpen(false);
    const prevBaseApt = returnToAptRef.current;
    if (prevBaseApt) {
      returnToAptRef.current = null;
      transitionRecirculationState(
        { status: 'CALC_OPEN', calcType: 'mortgage', apt: prevBaseApt },
        { type: 'MODAL_CLOSE' }
      );
      setMobileModalOpen(true);
    }
  }, []);

  const handleOpenTaxCalculator = useCallback(
    (aptName?: string) => {
      setIsCompareOpen(false);
      setIsMortgageOpen(false);
      setTaxCalcInitialApt(aptName);
      if ((mobileModalOpen && selectedReport) || returnToAptRef.current) {
        const baseApt = aptName || returnToAptRef.current || selectedReport?.apartmentName || '';
        const canonicalBaseApt = getCanonicalAptSlug(baseApt, selectedReport?.dong);
        returnToAptRef.current = canonicalBaseApt;
        setMobileModalOpen(false);
        transitionRecirculationState(
          { status: 'CHAPTER_EXPLORE', apt: canonicalBaseApt },
          {
            type: 'CLICK_RECIRC_MORTGAGE',
            apt: canonicalBaseApt,
            calcType: 'tax',
          }
        );
      } else if (aptName) {
        transitionRecirculationState(
          { status: 'DASHBOARD_IDLE' },
          {
            type: 'CLICK_RECIRC_MORTGAGE',
            apt: getCanonicalAptSlug(aptName),
            calcType: 'tax',
          }
        );
      }
      setIsTaxCalcOpen(true);
    },
    [mobileModalOpen, selectedReport, getCanonicalAptSlug]
  );

  const handleCloseTaxCalculator = useCallback(() => {
    setIsTaxCalcOpen(false);
    const prevBaseApt = returnToAptRef.current;
    if (prevBaseApt) {
      returnToAptRef.current = null;
      transitionRecirculationState(
        { status: 'CALC_OPEN', calcType: 'tax', apt: prevBaseApt },
        { type: 'MODAL_CLOSE' }
      );
      setMobileModalOpen(true);
    }
  }, []);

  const handleOpenSellTimingCalculator = useCallback((aptName?: string) => {
    setSellTimingInitialApt(aptName);
    setIsSellTimingOpen(true);
  }, []);

  const handleCloseMobileModal = useCallback(() => {
    returnToAptRef.current = null;
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
    
    syncShallowModalCloseToDashboard();
  }, [setSelectedReport]);




  const handleTabChange = useCallback((tab: string) => {
    const targetTab = tab as 'overview' | 'imjang' | 'mbti' | 'guide' | 'stats';
    if (targetTab !== 'guide' && targetTab !== 'stats') {
      setActiveTab(targetTab as 'overview' | 'imjang' | 'mbti');
    } else {
      trackEvent('tab_view', { tab_name: targetTab });
    }
    let href = '/';
    if (targetTab === 'imjang') href = '/explore';
    else if (targetTab === 'mbti') href = '/mbti';
    else if (targetTab === 'guide') href = '/guide';
    else if (targetTab === 'stats') href = '/stats';
    else if (targetTab === 'overview') href = '/';
    window.history.pushState(null, '', href);
    try { router.replace(href, { scroll: false }); } catch (err) {}
  }, [router]);

  // Note: Unused apartment calculations removed to offload CPU and keep bundle thin (TossApartmentExploreClient handles explore view now)

  const memoizedTabContents = useMemo(() => {
    return (
      <div className="grid w-full min-h-[85vh] min-h-[800px] relative bg-transparent min-w-0 max-w-full" style={{ contain: 'layout paint', containIntrinsicSize: '800px' }}>
        {/* ═══ TAB 0: 마크로 대시보드 ═══ */}
        <section className={`w-full col-start-1 row-start-1 min-h-[85vh] min-h-[800px] bg-transparent pb-8 md:pb-0 mb-4 md:mb-0 min-w-0 max-w-full ${activeTab === 'overview' ? 'block' : 'hidden'}`} style={{ contain: 'layout paint', containIntrinsicSize: '800px' }}>
          {(activeTab === 'overview' || hasOpenedOverview) && (
            <ErrorBoundary name="마크로 대시보드">
              <MacroDashboardClient 
                sheetApartments={sheetApartments} 
                txSummaryData={txSummary}
                recentTransactions={filteredRecentTransactions}
                macroTrendData={macroTrend}
                nameMapping={nameMapping || EMPTY_OBJECT}
                publicRentalSet={publicRentalSet}
                fieldReportsMap={fieldReportsMap}
                recent7DaysVolume={recent7DaysVolume}
                typeMap={typeMap}
                initialLocationScores={locationScores}
                onOpenAdModal={handleOpenAdModal}
                onOpenCompare={handleOpenCompare}
                onOpenJeonseSafety={handleOpenJeonseSafety}
                onOpenMortgage={handleOpenMortgage}
                onOpenTaxCalculator={handleOpenTaxCalculator}
                onOpenSellTimingCalculator={handleOpenSellTimingCalculator}
                onNavigateApartmentPage={handleNavigateApartmentPage}
                preloadApartmentTx={preloadApartmentTx}
              />
            </ErrorBoundary>
          )}
        </section>

        {/* ═══ TAB 3: 임장 (탐색) ═══ */}
        <section className={`w-full max-w-full min-w-0 overflow-x-hidden col-start-1 row-start-1 min-h-[85vh] min-h-[800px] bg-transparent ${activeTab === 'imjang' ? 'block' : 'hidden'}`} style={{ contain: 'layout paint', containIntrinsicSize: '800px' }}>
          {activeTab === 'imjang' && (
            <div className="w-full flex flex-col bg-transparent animate-pulse min-h-[85vh] min-h-[800px]" />
          )}
        </section>
      </div>
    );
  }, [
    activeTab,
    mounted,
    sheetApartments,
    filteredRecentTransactions,
    macroTrend,
    nameMapping,
    publicRentalSet,
    fieldReportsMap,
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
    handleNavigateApartmentPage,
    hasOpenedOverview
  ]);

  return (
    <>
    <PullToRefresh 
      scrollContainerId={activeTab === 'imjang' ? 'apartment-list-scroll' : 'recommend-scroll'}
      disabled={mobileModalOpen || !!selectedReport}
    >
      <div className="flex flex-col min-h-[100dvh] bg-transparent relative pb-[env(safe-area-inset-bottom)]">
        
        {/* a11y: Skip to Content */}
        <a href="#main-content" className="skip-to-content">내용으로 건너뛰기</a>


      
      {/* Main Header — Reused LoungeHeader component */}
      {!hideHeader && (
        <LoungeHeader 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
        />
      )}

      {/* Main Container */}
      <main 
        id="main-content" 
        className="flex-1 w-full max-w-[2000px] max-w-full mx-auto min-w-0 min-h-[85vh] min-h-[750px]"
      >
        <div className={`w-full max-w-full min-w-0 min-h-[85vh] min-h-[750px] ${mobileModalOpen ? "invisible" : ""}`}>
          {memoizedTabContents}
        </div>


        {/* 아파트 모달 (모든 화면 해상도에서 팝업으로 표시) */}
        {selectedReport && mobileModalOpen && (
          <ErrorBoundary name="아파트 상세 정보">
            <FieldReportModal
              report={selectedReport}
              onClose={handleCloseMobileModal}
              user={user}
              typeMap={typeMap}
              inline={false}
              sheetApartments={sheetApartments}
              nameMapping={nameMapping || {}}
              txSummaryData={txSummary}
              locationScores={locationScores}
              onSelectApartment={handleAptClickByName}
              onOpenCompare={(aptName, targetAptName) => {
                trackEvent('open_calculator', {
                  calculator_type: 'compare',
                  apt_name: aptName,
                  target_apt_name: targetAptName,
                  surface: 'apartment_modal',
                });
                handleOpenCompare(aptName, targetAptName);
              }}
              onOpenJeonseSafety={(aptName) => {
                trackEvent('open_calculator', {
                  calculator_type: 'jeonse_safety',
                  apt_name: aptName,
                  surface: 'apartment_modal',
                });
                handleOpenJeonseSafety(aptName);
              }}
              onOpenMortgage={(aptName, priceWon) => {
                trackEvent('open_calculator', {
                  calculator_type: 'mortgage',
                  apt_name: aptName,
                  surface: 'apartment_modal',
                });
                handleOpenMortgage(aptName, priceWon);
              }}
              onOpenTaxCalculator={(aptName) => {
                trackEvent('open_calculator', {
                  calculator_type: 'property_tax',
                  apt_name: aptName,
                  surface: 'apartment_modal',
                });
                handleOpenTaxCalculator(aptName);
              }}
              onOpenSellTimingCalculator={(aptName) => {
                trackEvent('open_calculator', {
                  calculator_type: 'sell_timing',
                  apt_name: aptName,
                  surface: 'apartment_modal',
                });
                handleOpenSellTimingCalculator(aptName);
              }}
            />
          </ErrorBoundary>
        )}


      </main>

      </div>
    </PullToRefresh>

    {!mobileModalOpen && (
      <MobileDock 
        activeTab={activeTab} 
        onTabClick={handleTabChange}
      />
    )}

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
                    onClick={handleCloseCompare}
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
          onClose={handleCloseCompare}
          initialAptName={compareInitialApt}
          initialSecondAptName={compareSecondApt}
          onSelectApartment={(targetAptName) => {
            returnToAptRef.current = null;
            setIsCompareOpen(false);
            setCompareSecondApt(undefined);
            handleAptClickByName(targetAptName);
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
            safeReload('JeonseSafetyCalculator_DashboardBoundary');
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
            safeReload('MortgageCalculator_DashboardBoundary');
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

DashboardClient.displayName = 'DashboardClient';
export default DashboardClient;
