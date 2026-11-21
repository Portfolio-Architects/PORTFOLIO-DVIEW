'use client';

import React, { useState, useRef, useMemo, useEffect, useCallback, useDeferredValue } from 'react';
import { X, Camera, ArrowLeft } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { normalize84Price } from '@/lib/utils/valuation';
import {
  normalizeAptName,
  getDisplayAptName,
  findTypeMapEntry,
  isSameApartment,
  resolveCanonicalAptSlug,
  stripApartmentNoiseQueryParams,
} from '@/lib/utils/apartmentMapping';
import type { FieldReportData } from '@/lib/DashboardFacade';
import type { User } from 'firebase/auth';
import { usePreventElasticBounce } from '@/hooks/usePreventElasticBounce';
import { acquireBodyScrollLock } from '@/lib/utils/bodyScrollLock';
import { safeReload } from '@/lib/utils/safeReload';
import { TransactionListSchema } from '@/lib/validation/facade.schemas';
import { logger } from '@/lib/services/logger';
import { useApartmentDetails } from '@/hooks/useApartmentDetails';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useSettingsValues } from '@/contexts/SettingsContext';
import { shareAptToKakao, copyAptSummaryToClipboard } from '@/lib/utils/kakaoShare';
import { trackEvent, trackApartmentView } from '@/lib/utils/analytics';
import { safeHtml2canvasPro } from '@/lib/utils/html2canvasPatch';
import { usePWA } from '@/components/pwa/PWAProvider';
import { getBrandMultiplier, calculatePremiumScores, calculateEducationScore, calculateInfraScore } from '@/lib/utils/scoring';
import { calculateDynamicDCF } from '@/lib/utils/valuationEngine';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { ApartmentGallery } from '@/components/apartment-modal/ApartmentGallery';
import { ViralPaywallGate } from '@/components/apartment-modal/ViralPaywallGate';
import { AdSlot } from '@/components/ads/AdSlot';
import { ApartmentChapterNavBar, APARTMENT_CHAPTERS } from './ApartmentChapterNavBar';
import { TerminalRecirculationHub } from './TerminalRecirculationHub';
import { adRefreshManager } from '@/lib/ads/adRefreshManager';
import {
  decodeSafeAptParam,
  selectRecirculationTargets,
  syncShallowApartmentOpen,
  syncShallowModalCloseToDashboard,
  transitionRecirculationState,
} from '@/lib/ads/recirculationEngine';

import { useApartmentModalState } from './hooks/useApartmentModalState';
import { ApartmentModalHeader } from './ApartmentModalHeader';
import { ApartmentLandingRetentionStrip } from './ApartmentLandingRetentionStrip';
import { ApartmentModalTransactionsTable } from './ApartmentModalTransactionsTable';
import { ApartmentModalKakaoCard } from './ApartmentModalKakaoCard';
import { MortgageLdiSentinelCard } from './chapters/MortgageLdiSentinelCard';
import InlineMortgageDsrBridge from '@/components/finance/InlineMortgageDsrBridge';

const JeonseSafetySkeleton = () => (
  <div className="w-full flex flex-col gap-4 mt-4 h-[300px]">
    <div className="h-6 rounded-xl w-40 mb-2 animate-shimmer" />
    <div className="w-full flex-1 rounded-[20px] border border-border/40 animate-shimmer" />
  </div>
);

const EducationAnalysisSkeleton = () => (
  <div className="w-full flex flex-col gap-4 mt-4 h-[350px]">
    <div className="h-6 rounded-xl w-40 mb-2 animate-shimmer" />
    <div className="w-full flex-1 rounded-[20px] border border-border/40 animate-shimmer" />
  </div>
);

const InfraAnalysisSkeleton = () => (
  <div className="w-full flex flex-col gap-4 mt-4 h-[350px]">
    <div className="h-6 rounded-xl w-40 mb-2 animate-shimmer" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
      <div className="rounded-[20px] border border-border/40 animate-shimmer" />
      <div className="rounded-[20px] border border-border/40 animate-shimmer hidden md:block" />
    </div>
  </div>
);

const ScoutingReportDetailSkeleton = () => (
  <div className="w-full flex flex-col gap-4 mt-4 h-[300px]">
    <div className="h-6 rounded-xl w-40 mb-2 animate-shimmer" />
    <div className="w-full flex-1 rounded-[20px] border border-border/40 animate-shimmer" />
  </div>
);

const AdvancedValuationSkeleton = () => (
  <div className="w-full flex flex-col gap-4 mt-4 h-[400px]">
    <div className="h-6 rounded-xl w-40 mb-2 animate-shimmer" />
    <div className="w-full flex-1 rounded-[20px] border border-border/40 animate-shimmer" />
  </div>
);

const TransactionTableSkeleton = () => (
  <div className="w-full h-[401px] md:h-full flex flex-col gap-4 p-5 border border-border/40 rounded-[20px]">
    <h2 className="text-[14px] font-bold text-secondary shrink-0 mb-2">실거래가 (로딩 중...)</h2>
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="flex justify-between items-center py-3 border-b border-border/20">
        <div className="h-4 w-20 rounded-lg animate-shimmer" />
        <div className="h-4 w-12 rounded-lg animate-shimmer" />
        <div className="h-4 w-24 rounded-lg animate-shimmer" />
      </div>
    ))}
  </div>
);

const TransactionChartSkeleton = () => (
  <div className="w-full flex-1 h-full min-h-[390px] md:min-h-0 flex flex-col gap-6 p-6 border border-border/40 rounded-[20px]">
    <div className="flex justify-between items-center">
      <div className="h-6 w-32 rounded bg-slate-200 dark:bg-slate-800 animate-shimmer" />
      <div className="flex gap-2">
        <div className="h-8 w-16 rounded-lg bg-slate-200 dark:bg-slate-800 animate-shimmer" />
        <div className="h-8 w-16 rounded-lg bg-slate-200 dark:bg-slate-800 animate-shimmer" />
      </div>
    </div>
    <div className="flex-1 w-full rounded-[20px] relative overflow-hidden flex items-end p-4 border border-border/20">
      <div className="w-full h-full flex items-end justify-between gap-2">
        {[30, 45, 60, 40, 75, 50, 90, 65, 80, 55, 70, 85].map((h, i) => (
          <div 
            key={i} 
            style={{ height: `${h}%` }} 
            className="flex-1 rounded-t bg-slate-200/50 dark:bg-slate-800/40 animate-shimmer" 
          />
        ))}
      </div>
    </div>
  </div>
);

const TransactionTable = dynamic(() => import('@/components/apartment-modal/TransactionTable').then(mod => mod.TransactionTable).catch(err => {
  logger.warn('ApartmentModal.dynamic', 'TransactionTable Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('TransactionTable');
  return () => null;
}), { 
  ssr: false, 
  loading: () => <TransactionTableSkeleton /> 
});

const JeonseSafetyReport = dynamic(() => import('@/components/apartment-modal/JeonseSafetyReport').catch(err => {
  logger.warn('ApartmentModal.dynamic', 'JeonseSafetyReport Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('JeonseSafetyReport');
  return { default: () => null };
}), { 
  ssr: false, 
  loading: () => <JeonseSafetySkeleton /> 
});

const TransactionChartSection = dynamic(() => import('@/components/apartment-modal/TransactionChartSection').then(mod => mod.TransactionChartSection).catch(err => {
  logger.warn('ApartmentModal.dynamic', 'TransactionChartSection Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('TransactionChartSection');
  return () => null;
}), { 
  ssr: false, 
  loading: () => <TransactionChartSkeleton /> 
});

const TransactionSummaryMetrics = dynamic(() => import('@/components/apartment-modal/TransactionSummaryMetrics').then(mod => mod.TransactionSummaryMetrics).catch(err => {
  logger.warn('ApartmentModal.dynamic', 'TransactionSummaryMetrics Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('TransactionSummaryMetrics');
  return () => null;
}), { 
  ssr: false, 
  loading: () => <div className="w-full h-[460px] md:h-[386px] rounded-[20px] border border-border/40 animate-shimmer mt-4" /> 
});

const PhotoUploadModal = dynamic(() => import('@/components/apartment-modal/PhotoUploadModal').then(mod => mod.PhotoUploadModal).catch(err => {
  logger.warn('ApartmentModal.dynamic', 'PhotoUploadModal Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('PhotoUploadModal');
  return () => null;
}), { 
  ssr: false, 
  loading: () => (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/40 backdrop-blur-xl">
      <div className="bg-surface/75 dark:bg-surface/75 border border-border/50 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 text-center min-w-[280px]">
        <div className="w-10 h-10 rounded-full border-2 border-slate-300 dark:border-slate-700 border-t-slate-900 dark:border-t-slate-100 animate-spin" />
        <span className="text-[14px] font-semibold text-primary">사진 등록기 로드 중</span>
      </div>
    </div>
  ) 
});

const BuyOrWaitVote = dynamic(() => import('@/components/apartment-modal/BuyOrWaitVote').catch(err => {
  logger.warn('ApartmentModal.dynamic', 'BuyOrWaitVote Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('BuyOrWaitVote');
  return { default: () => null };
}), { 
  ssr: false, 
  loading: () => <div className="w-full h-[142px] mt-6 rounded-[20px] border border-border/40 animate-shimmer" /> 
});

const ApartmentSpecsSection = dynamic(() => import('@/components/apartment-modal/ApartmentSpecsSection').catch(err => {
  logger.warn('ApartmentModal.dynamic', 'ApartmentSpecsSection Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('ApartmentSpecsSection');
  return { default: () => null };
}), { 
  ssr: false, 
  loading: () => <div className="w-full h-32 rounded-[20px] border border-border/40 animate-shimmer mt-4" /> 
});

const EducationAnalysisSection = dynamic(() => import('@/components/apartment-modal/EducationAnalysisSection').catch(err => {
  logger.warn('ApartmentModal.dynamic', 'EducationAnalysisSection Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('EducationAnalysisSection');
  return { default: () => null };
}), { 
  ssr: false, 
  loading: () => <EducationAnalysisSkeleton /> 
});

const InfraAnalysisSection = dynamic(() => import('@/components/apartment-modal/InfraAnalysisSection').catch(err => {
  logger.warn('ApartmentModal.dynamic', 'InfraAnalysisSection Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('InfraAnalysisSection');
  return { default: () => null };
}), { 
  ssr: false, 
  loading: () => <InfraAnalysisSkeleton /> 
});

const ScoutingReportDetailSection = dynamic(() => import('@/components/apartment-modal/ScoutingReportDetailSection').catch(err => {
  logger.warn('ApartmentModal.dynamic', 'ScoutingReportDetailSection Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('ScoutingReportDetailSection');
  return { default: () => null };
}), { 
  ssr: false, 
  loading: () => <ScoutingReportDetailSkeleton /> 
});

const AdvancedValuationMetrics = dynamic(() => import('@/components/consumer/AdvancedValuationMetrics').catch(err => {
  logger.warn('ApartmentModal.dynamic', 'AdvancedValuationMetrics Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('AdvancedValuationMetrics');
  return { default: () => null };
}), { 
  ssr: false, 
  loading: () => <AdvancedValuationSkeleton /> 
});

const PushSubscriptionModal = dynamic(() => import('@/components/pwa/PushSubscriptionModal').catch(err => {
  logger.warn('ApartmentModal.dynamic', 'PushSubscriptionModal Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('PushSubscriptionModal');
  return { default: () => null };
}), { 
  ssr: false 
});

interface TransactionRecord {
  dong: string;
  aptName: string;
  area: number;
  areaPyeong: number;
  contractYm: string;
  contractDay: string;
  price: number;
  priceEok: string;
  deposit?: number;
  monthlyRent?: number;
  floor: number;
  buildYear: number;
  dealType: string;
  reqGb?: string;
  rnuYn?: string;
  cancelDate?: string;
  isOutlier?: boolean;
  areaLabelM2?: string;
  areaLabelPyeong?: string;
}

const LazyRender = React.memo(function LazyRender({ 
  children, 
  estimatedHeight = 250 
}: { 
  children: React.ReactNode; 
  estimatedHeight?: number; 
}) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    function handleIntersect([entry]: IntersectionObserverEntry[]) {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }

    const observer = new IntersectionObserver(
      handleIntersect,
      { rootMargin: '250px' }
    );

    const el = containerRef.current;
    if (el) {
      observer.observe(el);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} style={{ minHeight: isVisible ? 'auto' : `${estimatedHeight}px` }}>
      {isVisible ? children : (
        <div 
          className="w-full border border-border/40 rounded-[20px] animate-shimmer flex items-center justify-center" 
          style={{ height: `${estimatedHeight}px` }}
        >
          <span className="text-tertiary text-[12px] font-bold">콘텐츠 구성 중...</span>
        </div>
      )}
    </div>
  );
});

interface CalculatedValuation {
  status: 'undervalued' | 'overvalued' | 'fair';
  amount: string;
  ratio: number;
  priceStr: string;
}

interface CalculatedJeonseSafety {
  latestPrice: number;
  latestDeposit: number;
  ratio: number;
}

interface EnrichedTransaction extends TransactionRecord {
  areaLabelM2: string;
  areaLabelPyeong: string;
  calculatedPrice: number;
  contractDateNum: number;
}

const ApartmentModal = React.memo(function ApartmentModal({ 
  report: rawReport, 
  onClose,
  user,
  transactions: rawTransactionsProp,
  typeMap,
  isAdmin,
  inline,
  txSummary: txSummaryProp,
  loadAllTransactions: loadAllTransactionsProp,
  onRequestLogin,
  onSelectApartment,
  onOpenCompare,
  onOpenJeonseSafety,
  onOpenMortgage,
  onOpenTaxCalculator,
  onOpenSellTimingCalculator,
  isTxLoading: isTxLoadingProp,
  isLoadingDetail: isLoadingDetailProp,
  sheetApartments,
  nameMapping,
  txSummaryData,
  locationScores,
  suppressAds = false,
}: { 
  report: FieldReportData;
  onClose: () => void;
  user: User | null;
  transactions?: TransactionRecord[];
  typeMap: Record<string, Record<string, { typeM2: string; typePyeong: string }>>;
  isLoadingDetail?: boolean;
  isAdmin?: boolean;
  inline?: boolean;
  txSummary?: import('@/types/transaction').AptTxSummary;
  loadAllTransactions?: () => void;
  onRequestLogin?: (message: string) => void;
  onSelectApartment?: (aptName: string, dong?: string) => void;
  onOpenCompare?: (aptName: string, targetAptName?: string, trigger?: string) => void;
  onOpenJeonseSafety?: (aptName: string, trigger?: string) => void;
  onOpenMortgage?: (aptName: string, priceWon?: number, trigger?: string) => void;
  onOpenTaxCalculator?: (aptName: string, trigger?: string) => void;
  onOpenSellTimingCalculator?: (aptName: string, trigger?: string) => void;
  isTxLoading?: boolean;
  sheetApartments?: Record<string, import('@/lib/dong-apartments').DongApartment[]>;
  nameMapping?: Record<string, string>;
  txSummaryData?: Record<string, import('@/types/transaction').AptTxSummary>;
  locationScores?: Record<string, import('@/types/transaction').LocationScoreItem>;
  suppressAds?: boolean;
}) {
  const handleModalClose = useCallback(() => {
    if (!inline) {
      syncShallowModalCloseToDashboard();
    }
    onClose();
  }, [inline, onClose]);

  useSwipeNavigation({ onBack: handleModalClose, enabled: !inline });


  const { 
    txSummaryData: _txSummaryData, 
    fullReportData, 
    modalTransactions, 
    isLoadingDetail: hookIsLoadingDetail, 
    isTxLoading: hookIsTxLoading, 
    resolvedReport, 
    aptTxSummary, 
    loadAllTransactions: hookLoadAllTransactions 
  } = useApartmentDetails(
    rawReport, 
    sheetApartments || {}, 
    nameMapping, 
    user, 
    txSummaryData || {}, 
    locationScores || {}
  );

  const report = resolvedReport || rawReport;
  const rawTransactions = rawTransactionsProp !== undefined ? rawTransactionsProp : (modalTransactions || []);
  const txSummary = txSummaryProp !== undefined ? txSummaryProp : aptTxSummary;
  const isTxLoading = isTxLoadingProp !== undefined ? isTxLoadingProp : hookIsTxLoading;
  const _isLoadingDetail = isLoadingDetailProp !== undefined ? isLoadingDetailProp : hookIsLoadingDetail;
  const loadAllTransactions = loadAllTransactionsProp !== undefined ? loadAllTransactionsProp : hookLoadAllTransactions;

  const { areaUnit } = useSettingsValues();
  const { showToast } = usePWA();
  const backdropRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  usePreventElasticBounce(modalRef);

  const {
    activeTab,
    setActiveTab,
    isSharing,
    setIsSharing,
    copiedStatus,
    setCopiedStatus,
    isPhotoModalOpen: isUploadModalOpen,
    setIsPhotoModalOpen: setIsUploadModalOpen,
    isPushModalOpen,
    setIsPushModalOpen,
    isToolDropdownOpen,
    setIsToolDropdownOpen,
    isAnimationFinished,
    copiedTimeoutRef,
    shareActionTimeoutRef,
    shareCardRef,
    toolDropdownRef,
    mountedRef,
  } = useApartmentModalState({ inline });

  const [mounted, setMounted] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [chartType, setChartType] = useState<'sale' | 'jeonse'>('sale');
  const [filterOutliers, setFilterOutliers] = useState(false);
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('전체');

  const [activeChapter, setActiveChapter] = useState('chapter-01-overview');
  const [mountedChapters, setMountedChapters] = useState<Set<string>>(
    () => new Set(['chapter-01-overview'])
  );
  const [ch02AdRefreshKey, setCh02AdRefreshKey] = useState(0);
  const [ch05AdRefreshKey, setCh05AdRefreshKey] = useState(0);
  const ch02AdContainerRef = useRef<HTMLDivElement | null>(null);
  const ch05AdContainerRef = useRef<HTMLDivElement | null>(null);

  const isChapterMounted = useCallback(
    (chapterId: string) => mountedChapters.has(chapterId) || activeChapter === chapterId,
    [mountedChapters, activeChapter]
  );

  const handleSelectChapter = useCallback((chapterId: string) => {
    setActiveChapter(chapterId);
    setMountedChapters((prev) => {
      if (prev.has(chapterId)) return prev;
      const next = new Set(prev);
      next.add(chapterId);
      return next;
    });
    if (report?.apartmentName) {
      trackEvent('apartment_modal_chapter_view', {
        apartment_name: report.apartmentName,
        apt_name: report.apartmentName,
        chapter_id: chapterId,
        dong: report.dong || undefined,
        surface: inline ? 'apartment_ssr_page' : 'apartment_modal',
      });
    }
    adRefreshManager.onTabSwitch();
  }, [inline, report?.apartmentName, report?.dong]);

  // Synchronize activeChapter into mountedChapters set
  useEffect(() => {
    setMountedChapters((prev) => {
      if (prev.has(activeChapter)) return prev;
      const next = new Set(prev);
      next.add(activeChapter);
      return next;
    });
  }, [activeChapter]);

  // Reset area filter, active chapter, and drawer scroll position when switching apartments
  useEffect(() => {
    setSelectedAreaFilter('전체');
    setActiveChapter('chapter-01-overview');
    setShowScrollTop(false);
    if (!inline && modalRef.current) {
      if (typeof modalRef.current.scrollTo === 'function') {
        modalRef.current.scrollTo({ top: 0, behavior: 'auto' });
      } else {
        modalRef.current.scrollTop = 0;
      }
    }
  }, [report?.apartmentName, inline]);

  // Viewport proximity observation for pre-mounting chapters within 350px
  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      setMountedChapters(new Set(APARTMENT_CHAPTERS.map((c) => c.id)));
      return;
    }

    const rootEl = inline ? null : (modalRef.current || null);
    const chapterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.id) {
            const chapterId = entry.target.id;
            setMountedChapters((prev) => {
              if (prev.has(chapterId)) return prev;
              const next = new Set(prev);
              next.add(chapterId);
              return next;
            });
          }
        });
      },
      {
        root: rootEl,
        rootMargin: '350px 0px 350px 0px',
        threshold: 0,
      }
    );

    const registerChapterTargets = () => {
      APARTMENT_CHAPTERS.forEach((chapter) => {
        const el = rootEl
          ? (rootEl.querySelector(`#${chapter.id}`) as HTMLElement | null)
          : document.getElementById(chapter.id);
        if (el) {
          chapterObserver.observe(el);
        }
      });
    };

    registerChapterTargets();
    const t1 = setTimeout(registerChapterTargets, 200);

    return () => {
      clearTimeout(t1);
      chapterObserver.disconnect();
    };
  }, [inline]);

  // Progressive idle background mounting for remaining unmounted chapters
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const unmountedChapters = APARTMENT_CHAPTERS.map((c) => c.id).filter((id) => !mountedChapters.has(id));
    if (unmountedChapters.length === 0) return;

    const mountNextChapter = () => {
      if (cancelled) return;
      setMountedChapters((prev) => {
        const remaining = APARTMENT_CHAPTERS.find((c) => !prev.has(c.id));
        if (!remaining) return prev;
        const next = new Set(prev);
        next.add(remaining.id);
        return next;
      });
    };

    if ('requestIdleCallback' in window) {
      idleId = (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(
        () => {
          mountNextChapter();
        },
        { timeout: 1200 }
      );
    } else {
      timeoutId = setTimeout(mountNextChapter, 800);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && 'cancelIdleCallback' in window) {
        (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [mountedChapters]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (rawTransactionsProp === undefined && report?.apartmentName && typeof hookLoadAllTransactions === 'function') {
      hookLoadAllTransactions();
    }
  }, [rawTransactionsProp, report?.apartmentName, hookLoadAllTransactions]);

  const displayAptName = useMemo(() => {
    return getDisplayAptName(report.apartmentName);
  }, [report.apartmentName]);

  const transactions: EnrichedTransaction[] = useMemo(() => {
    return (rawTransactions || []).map((t) => {
      const typeInfo = typeMap ? findTypeMapEntry(typeMap, t.aptName || report.apartmentName, t.area) : null;
      const areaLabelM2 = typeInfo ? typeInfo.typeM2 : `${t.area}㎡`;
      const areaLabelPyeong = typeInfo ? (typeInfo.typePyeong || typeInfo.typeM2) : `${Math.round(t.areaPyeong)}평`;
      const calculatedPrice = t.price || t.deposit || 0;
      const contractDateNum = parseInt(`${t.contractYm || '202401'}${String(t.contractDay || '01').padStart(2, '0')}`, 10);
      return {
        ...t,
        areaLabelM2,
        areaLabelPyeong,
        calculatedPrice,
        contractDateNum,
      };
    });
  }, [rawTransactions, report.apartmentName, typeMap]);

  const areaFilterChips = useMemo(() => {
    const types = new Set<string>();
    transactions.forEach(t => {
      if (areaUnit === 'm2') {
        if (t.areaLabelM2) types.add(t.areaLabelM2);
      } else {
        if (t.areaLabelPyeong) types.add(t.areaLabelPyeong);
      }
    });
    const sortedTypes = Array.from(types).sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB;
      }
      return a.localeCompare(b, 'ko');
    });
    return ['전체', ...sortedTypes];
  }, [transactions, areaUnit]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filterOutliers && t.isOutlier) return false;
      if (selectedAreaFilter !== '전체') {
        const label = areaUnit === 'm2' ? t.areaLabelM2 : t.areaLabelPyeong;
        if (label !== selectedAreaFilter) return false;
      }
      return true;
    });
  }, [transactions, filterOutliers, selectedAreaFilter, areaUnit]);

  const isActiveTransaction = useCallback((t: { cancelDate?: string; isCanceled?: boolean }) => {
    if (t.isCanceled === true) return false;
    const raw = String(t.cancelDate || '').trim();
    if (!raw || raw === '-' || raw === 'null' || raw === 'undefined' || raw === 'nan' || raw === 'none') return true;
    return !(/\d{2}[.\-/]?\d{2}[.\-/]?\d{2}/.test(raw) || raw === '취소' || raw === 'O' || raw === '해제');
  }, []);

  const valuation: CalculatedValuation = useMemo(() => {
    const saleTxs = transactions.filter(t => isActiveTransaction(t) && (!t.dealType || (t.dealType !== '전세' && t.dealType !== '월세')));
    const jeonseTxs = transactions.filter(t => isActiveTransaction(t) && t.dealType === '전세');
    const latestSale = saleTxs[0];
    const latestJeonse = jeonseTxs[0];

    const salePrice = latestSale ? latestSale.price : 0;
    const jeonsePrice = latestJeonse ? latestJeonse.deposit || 0 : 0;

    if (salePrice === 0 || jeonsePrice === 0) {
      return { status: 'fair', amount: '적정 시세 수준', ratio: 0, priceStr: '시세 산정 중' };
    }

    const dcf = calculateDynamicDCF(jeonsePrice, {
      baseDate: '2026-06',
      riskFreeRate: 0.035,
      fundingCost: 0.045,
      jeonseConversionRate: 0.055,
      baseInflationRate: 2.0,
    });

    const fairPrice = dcf.impliedValue;
    const diffPercent = ((salePrice - fairPrice) / fairPrice) * 100;

    if (diffPercent < -7) {
      return { status: 'undervalued', amount: `${Math.abs(Math.round(diffPercent))}% 저평가`, ratio: diffPercent, priceStr: `${Math.round(fairPrice / 10000)}억` };
    } else if (diffPercent > 7) {
      return { status: 'overvalued', amount: `${Math.round(diffPercent)}% 고평가`, ratio: diffPercent, priceStr: `${Math.round(fairPrice / 10000)}억` };
    }
    return { status: 'fair', amount: '적정 가치 형성', ratio: diffPercent, priceStr: `${Math.round(fairPrice / 10000)}억` };
  }, [transactions, isActiveTransaction]);

  const jeonseSafetyData: CalculatedJeonseSafety | null = useMemo(() => {
    const saleTxs = transactions.filter(t => isActiveTransaction(t) && (!t.dealType || (t.dealType !== '전세' && t.dealType !== '월세')));
    const jeonseTxs = transactions.filter(t => isActiveTransaction(t) && t.dealType === '전세');
    const latestSale = saleTxs[0];
    const latestJeonse = jeonseTxs[0];

    const salePrice = latestSale ? latestSale.price : 0;
    const jeonsePrice = latestJeonse ? latestJeonse.deposit || 0 : 0;

    if (salePrice === 0 && jeonsePrice === 0) return null;
    const ratio = salePrice > 0 ? (jeonsePrice / salePrice) * 100 : 0;
    return { latestPrice: salePrice, latestDeposit: jeonsePrice, ratio };
  }, [transactions, isActiveTransaction]);

  const currentPriceWon = useMemo(() => {
    const rawMan =
      jeonseSafetyData?.latestPrice && jeonseSafetyData.latestPrice > 0
        ? jeonseSafetyData.latestPrice
        : txSummary?.latestPrice || txSummary?.avg1MPrice || txSummary?.avg3MPrice || 0;
    const num = Number(rawMan);
    if (!Number.isFinite(num) || num <= 0) return 0;
    return num < 10_000_000 ? Math.round(num * 10_000) : Math.round(num);
  }, [jeonseSafetyData, txSummary]);

  const effectiveTxSummaryMap = useMemo(
    () =>
      _txSummaryData && Object.keys(_txSummaryData).length > 0
        ? _txSummaryData
        : txSummaryData || {},
    [_txSummaryData, txSummaryData]
  );

  const canonicalAptSlug = useMemo(
    () =>
      resolveCanonicalAptSlug(report.apartmentName, {
        txKey: report.txKey,
        txMap: effectiveTxSummaryMap,
        sheetApartments,
        manualMapping: nameMapping,
        dong: report.dong,
      }) || report.apartmentName,
    [report.apartmentName, report.txKey, report.dong, effectiveTxSummaryMap, sheetApartments, nameMapping]
  );

  const recirculationTargets = useMemo(() => {
    return selectRecirculationTargets({
      currentAptName: report.apartmentName,
      currentDong: report.dong || '동탄',
      currentPriceWon,
      sheetApartments: sheetApartments || {},
      txSummaryData: effectiveTxSummaryMap,
      nameMapping: nameMapping || {},
    });
  }, [
    report.apartmentName,
    report.dong,
    currentPriceWon,
    sheetApartments,
    effectiveTxSummaryMap,
    nameMapping,
  ]);

  useEffect(() => {
    if (!report.apartmentName) return;
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/apartment/')) {
      const currentUrlApt = decodeSafeAptParam(
        window.location.pathname.slice('/apartment/'.length)
      );
      const isCurrentSameApt =
        Boolean(currentUrlApt) &&
        (currentUrlApt === canonicalAptSlug ||
          currentUrlApt === report.apartmentName ||
          isSameApartment(
            currentUrlApt,
            report.apartmentName,
            nameMapping,
            undefined,
            report.dong || undefined
          ) ||
          isSameApartment(
            currentUrlApt,
            canonicalAptSlug,
            nameMapping,
            undefined,
            report.dong || undefined
          ));
      if (isCurrentSameApt) {
        const canonicalPath = `/apartment/${encodeURIComponent(canonicalAptSlug)}`;
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
    }
    if (!inline) {
      syncShallowApartmentOpen(report.apartmentName, {
        dong: report.dong,
        canonicalSlug: canonicalAptSlug,
      });
    }
  }, [inline, report.apartmentName, report.dong, canonicalAptSlug, nameMapping]);

  const lastTrackedAptViewRef = useRef<string>('');
  useEffect(() => {
    const aptName = report?.apartmentName?.trim();
    if (!aptName) return;
    const identityKey = (canonicalAptSlug || aptName).replace(/\s+/g, '').toLowerCase();
    const viewKey = `${inline ? 'inline' : 'modal'}:${identityKey}`;
    if (lastTrackedAptViewRef.current === viewKey) return;
    lastTrackedAptViewRef.current = viewKey;
    trackApartmentView({
      apartment_name: aptName,
      apt_name: aptName,
      canonical_slug: canonicalAptSlug || aptName,
      dong: report.dong || undefined,
      surface: inline ? 'apartment_ssr_page' : 'apartment_modal',
      view_type: inline ? 'inline_report' : 'modal',
    });
  }, [inline, report?.apartmentName, report?.dong, canonicalAptSlug]);

  // Lock outer document scroll across both desktop & mobile while the overlay drawer is open
  // (ref-counted with scrollbar width compensation so stacked modals never prematurely unlock or shift layout)
  useEffect(() => {
    if (inline || typeof document === 'undefined') return;
    return acquireBodyScrollLock();
  }, [inline]);

  // Dismiss overlay drawer with Escape key while respecting stacked dropdowns / child / calculator modals
  useEffect(() => {
    if (inline || typeof window === 'undefined' || typeof document === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      if (isToolDropdownOpen) {
        e.preventDefault();
        setIsToolDropdownOpen(false);
        return;
      }

      if (fullscreenImage) {
        e.preventDefault();
        setFullscreenImage(null);
        return;
      }

      if (isUploadModalOpen || isPushModalOpen) return;

      const openDialogs = Array.from(
        document.querySelectorAll('[role="dialog"][aria-modal="true"]')
      );
      const topDialog = openDialogs[openDialogs.length - 1];
      if (topDialog && backdropRef.current && topDialog !== backdropRef.current) {
        return;
      }

      e.preventDefault();
      handleModalClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    inline,
    isToolDropdownOpen,
    setIsToolDropdownOpen,
    fullscreenImage,
    isUploadModalOpen,
    isPushModalOpen,
    handleModalClose,
  ]);

  const handleRecircSelectApartment = useCallback(
    (targetAptName: string) => {
      const targetCandidate = recirculationTargets.find((t) => t.aptName === targetAptName);
      if (onSelectApartment) {
        onSelectApartment(targetAptName, targetCandidate?.dong);
      } else {
        const targetSlug =
          resolveCanonicalAptSlug(targetAptName, {
            txMap: effectiveTxSummaryMap,
            sheetApartments,
            manualMapping: nameMapping,
            dong: targetCandidate?.dong,
          }) || targetAptName;
        syncShallowApartmentOpen(targetAptName, { force: true, canonicalSlug: targetSlug });
      }
      if (inline && typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        modalRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [inline, onSelectApartment, recirculationTargets, effectiveTxSummaryMap, sheetApartments, nameMapping]
  );

  const handleRecircOpenCompare = useCallback(
    (apt1: string, apt2: string) => {
      if (onOpenCompare) {
        onOpenCompare(apt1, apt2);
      } else {
        const slug1 =
          resolveCanonicalAptSlug(apt1, {
            txMap: effectiveTxSummaryMap,
            sheetApartments,
            manualMapping: nameMapping,
            dong: report.dong,
          }) || apt1;
        const slug2 =
          resolveCanonicalAptSlug(apt2, {
            txMap: effectiveTxSummaryMap,
            sheetApartments,
            manualMapping: nameMapping,
          }) || apt2;
        transitionRecirculationState(
          { status: 'CHAPTER_EXPLORE', apt: slug1 },
          { type: 'CLICK_RECIRC_COMPARE', baseApt: slug1, targetApt: slug2 }
        );
      }
    },
    [onOpenCompare, effectiveTxSummaryMap, sheetApartments, nameMapping, report.dong]
  );

  const handleRecircOpenMortgage = useCallback(
    (aptName: string, priceWon: number) => {
      if (onOpenMortgage) {
        onOpenMortgage(aptName, priceWon);
      } else {
        const slug =
          resolveCanonicalAptSlug(aptName, {
            txMap: effectiveTxSummaryMap,
            sheetApartments,
            manualMapping: nameMapping,
            dong: report.dong,
          }) || aptName;
        transitionRecirculationState(
          { status: 'CHAPTER_EXPLORE', apt: slug },
          { type: 'CLICK_RECIRC_MORTGAGE', apt: slug, priceWon }
        );
      }
    },
    [onOpenMortgage, effectiveTxSummaryMap, sheetApartments, nameMapping, report.dong]
  );

  const eduScoreInfo = useMemo(() => {
    if (!report.metrics) return null;
    const s = calculateEducationScore(report.metrics);
    return {
      score: s.score,
      grade: s.grade,
      description: s.description || `${s.grade}등급 교육 환경`,
    };
  }, [report.metrics]);

  const infraScoreInfo = useMemo(() => {
    if (!report.metrics) return null;
    const s = calculateInfraScore(report.metrics);
    return {
      score: s.score,
      grade: s.grade,
      description: s.description || `${s.grade}등급 입지 인프라`,
    };
  }, [report.metrics]);

  const preloadCalculators = useCallback(() => {
    import('@/components/consumer/AptCompareModal').catch(() => {});
    import('@/components/consumer/JeonseSafetyCalculator').catch(() => {});
    import('@/components/consumer/MortgageCalculator').catch(() => {});
    import('@/components/consumer/PropertyTaxCalculator').catch(() => {});
    import('@/components/consumer/SellTimingCalculator').catch(() => {});
  }, []);

  const handleToggleFilter = useCallback(() => {
    setFilterOutliers(prev => !prev);
  }, []);

  const handleScroll = useCallback(() => {
    if (inline) {
      if (typeof window !== 'undefined') {
        setShowScrollTop(window.scrollY > 400);
      }
      return;
    }
    if (!modalRef.current) return;
    if (modalRef.current.scrollTop > 400) {
      setShowScrollTop(true);
    } else {
      setShowScrollTop(false);
    }
  }, [inline]);

  useEffect(() => {

    const slotCh02Id = '1000000002_ch02';
    const slotCh05Id = '1000000002_ch05';

    adRefreshManager.registerSlot(slotCh02Id, {
      domElement: ch02AdContainerRef.current,
      onRefreshKeyChange: setCh02AdRefreshKey,
      onRefresh: setCh02AdRefreshKey,
    });

    adRefreshManager.registerSlot(slotCh05Id, {
      domElement: ch05AdContainerRef.current,
      onRefreshKeyChange: setCh05AdRefreshKey,
      onRefresh: setCh05AdRefreshKey,
    });

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      const rootEl = inline ? null : (modalRef.current || null);
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.target === ch02AdContainerRef.current) {
              adRefreshManager.updateIntersection(slotCh02Id, entry.intersectionRatio);
            } else if (entry.target === ch05AdContainerRef.current) {
              adRefreshManager.updateIntersection(slotCh05Id, entry.intersectionRatio);
            }
          });
        },
        {
          root: rootEl,
          threshold: [0, 0.25, 0.5, 0.75, 1.0],
        }
      );

      if (ch02AdContainerRef.current) {
        observer.observe(ch02AdContainerRef.current);
      }
      if (ch05AdContainerRef.current) {
        observer.observe(ch05AdContainerRef.current);
      }
    }

    return () => {
      observer?.disconnect();
      adRefreshManager.unregisterSlot(slotCh02Id);
      adRefreshManager.unregisterSlot(slotCh05Id);
    };
  }, [inline]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const scrollTarget: HTMLElement | Window | null = inline ? window : modalRef.current;
    if (!scrollTarget) return;

    let ticking = false;
    let rId: number | null = null;
    const onScroll = () => {
      if (!ticking) {
        rId = window.requestAnimationFrame(() => {
          if (mountedRef.current) {
            handleScroll();
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    scrollTarget.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scrollTarget.removeEventListener('scroll', onScroll);
      if (rId) window.cancelAnimationFrame(rId);
    };
  }, [inline, handleScroll, mountedRef]);

  const handleKakaoShare = useCallback(async () => {
    if (isSharing) return;
    setIsSharing(true);
    trackEvent('share_apartment', { apt_name: report.apartmentName, method: 'kakao' });
    const baseUrl = window.location.origin;

    try {
      const saleTxs = transactions.filter(t => isActiveTransaction(t) && (!t.dealType || (t.dealType !== '전세' && t.dealType !== '월세')));
      const jeonseTxs = transactions.filter(t => isActiveTransaction(t) && t.dealType === '전세');
      const latestSale = saleTxs[0];
      const latestJeonse = jeonseTxs[0];

      const price = latestSale ? latestSale.price : 0;
      const jeonsePrice = latestJeonse ? latestJeonse.deposit || 0 : 0;
      
      const priceEok = Math.floor(price / 10000);
      const priceMan = price % 10000;
      const ratio = price > 0 && jeonsePrice > 0 ? (jeonsePrice / price) * 100 : 0;
      const priceStr = priceMan > 0 ? `${priceEok}억 ${priceMan.toLocaleString()}만원` : `${priceEok}억원`;

      const status = ratio >= 65 ? "실수요안심" : "인기단지";
      const imageUrl = `${baseUrl}/api/og?type=apartment&title=${encodeURIComponent(displayAptName)}&price=${encodeURIComponent(priceStr)}&ratio=${ratio.toFixed(1)}&status=${encodeURIComponent(status)}&valStatus=${valuation.status || ''}&valAmount=${encodeURIComponent(valuation.amount || '')}&t=${Date.now()}`;

      await shareAptToKakao({
        aptName: displayAptName,
        canonicalSlug: canonicalAptSlug,
        priceEok,
        priceMan,
        ratio,
        imageUrl,
        customTitle: `${displayAptName} 가치분석 리포트`,
        customDesc: `실거래가 ${priceStr}, 전세가율 ${ratio.toFixed(1)}%. D-VIEW에서 확인해보세요.`,
        valStatus: valuation.status || undefined,
        valAmount: valuation.amount || undefined
      }, showToast);
    } catch (error) {
      logger.error('ApartmentModal.shareKakao', 'Kakao share card generation failed', undefined, error);
      if (mountedRef.current) {
        showToast("공유를 처리하는 도중 오류가 발생했습니다.");
      }
    } finally {
      if (mountedRef.current) {
        setIsSharing(false);
      }
    }
  }, [isSharing, report.apartmentName, canonicalAptSlug, transactions, valuation.status, valuation.amount, displayAptName, showToast, setIsSharing, mountedRef]);

  const handleDownloadShareCard = useCallback(async () => {
    if (isSharing) return;
    setIsSharing(true);
    showToast("요약 카드 이미지를 생성하고 있습니다...");
    
    try {
      if (shareActionTimeoutRef.current) {
        clearTimeout(shareActionTimeoutRef.current);
      }
      await new Promise<void>((resolve) => {
        shareActionTimeoutRef.current = setTimeout(() => {
          shareActionTimeoutRef.current = null;
          resolve();
        }, 200);
      });
      if (!mountedRef.current) return;

      if (shareCardRef.current) {
        const html2canvasProInstance = (await import('html2canvas-pro')).default;
        
        const canvas = await safeHtml2canvasPro(html2canvasProInstance, shareCardRef.current, {
          width: 1200,
          height: 630,
          scale: 2.0,
          useCORS: true,
          backgroundColor: '#0f172a',
          logging: false
        });

        if (!mountedRef.current) return;

        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `DVIEW_${normalizeAptName(report.apartmentName)}_요약카드.png`;
        link.href = dataUrl;
        link.click();
        trackEvent('share_apartment', { apt_name: report.apartmentName, method: 'download_card' });
        
        showToast("인포그래픽 요약 카드가 이미지 파일로 저장되었습니다.");
      } else {
        showToast("이미지 캡처 대상을 찾을 수 없습니다.");
      }
    } catch (error) {
      logger.error('ApartmentModal.downloadCard', 'Image card download failed', undefined, error);
      if (mountedRef.current) {
        showToast("이미지 저장 중 오류가 발생했습니다.");
      }
    } finally {
      if (mountedRef.current) {
        setIsSharing(false);
      }
    }
  }, [isSharing, report.apartmentName, showToast, setIsSharing, shareActionTimeoutRef, mountedRef, shareCardRef]);

  const handleCopySummary = useCallback(async () => {
    trackEvent('share_apartment', { apt_name: report.apartmentName, method: 'copy_summary' });
    const saleTxs = transactions.filter(t => isActiveTransaction(t) && (!t.dealType || (t.dealType !== '전세' && t.dealType !== '월세')));
    const jeonseTxs = transactions.filter(t => isActiveTransaction(t) && t.dealType === '전세');
    const latestSale = saleTxs[0];
    const latestJeonse = jeonseTxs[0];
    const price = latestSale ? latestSale.price : 0;
    const jeonsePrice = latestJeonse ? latestJeonse.deposit || 0 : 0;
    const priceEok = Math.floor(price / 10000);
    const priceMan = price % 10000;
    const ratio = price > 0 && jeonsePrice > 0 ? (jeonsePrice / price) * 100 : 0;
    
    const salePrices = saleTxs.map(t => t.price).filter(p => p > 0);
    const maxPrice = salePrices.length > 0 ? Math.max(...salePrices) : 0;
    const maxPriceEok = maxPrice > 0 ? maxPrice / 10000 : undefined;

    let customDesc = '';
    if (eduScoreInfo) {
      customDesc += `학군/육아 환경: ${eduScoreInfo.score}점 (${eduScoreInfo.grade}등급) - ${eduScoreInfo.description.split(' (')[0]}\n`;
    }
    if (infraScoreInfo) {
      customDesc += `교통/생활 입지: ${infraScoreInfo.score}점 (${infraScoreInfo.grade}등급) - ${infraScoreInfo.description.split(' (')[0]}\n`;
    }

    if (copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = null;
    }

    const success = await copyAptSummaryToClipboard({
      aptName: displayAptName,
      canonicalSlug: canonicalAptSlug,
      priceEok,
      priceMan,
      ratio,
      valStatus: valuation.status,
      valAmount: valuation.amount,
      customDesc,
      maxPrice: maxPriceEok
    });

    if (success) {
      if (!mountedRef.current) return;
      showToast("단톡방용 요약본 복사 완료!");
      setCopiedStatus('summary');
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
        copiedTimeoutRef.current = null;
      }
      copiedTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setCopiedStatus(null);
          copiedTimeoutRef.current = null;
        }
      }, 1500);
    } else {
      showToast("요약본 복사에 실패했습니다.");
    }
  }, [report.apartmentName, canonicalAptSlug, transactions, eduScoreInfo, infraScoreInfo, displayAptName, valuation.status, valuation.amount, showToast, setCopiedStatus, copiedTimeoutRef, mountedRef]);

  const handleNativeShare = useCallback(async () => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/apartment/${encodeURIComponent(canonicalAptSlug)}`;
    const title = `${displayAptName} 가치분석 리포트`;
    let desc = '';

    const saleTxs = transactions.filter(t => isActiveTransaction(t) && (!t.dealType || (t.dealType !== '전세' && t.dealType !== '월세')));
    const jeonseTxs = transactions.filter(t => isActiveTransaction(t) && t.dealType === '전세');
    const latestSale = saleTxs[0];
    const latestJeonse = jeonseTxs[0];

    const price = latestSale ? latestSale.price : 0;
    const jeonsePrice = latestJeonse ? latestJeonse.deposit || 0 : 0;
    
    const priceEok = Math.floor(price / 10000);
    const priceMan = price % 10000;
    const ratio = price > 0 && jeonsePrice > 0 ? (jeonsePrice / price) * 100 : 0;
    const priceStr = priceMan > 0 ? `${priceEok}억 ${priceMan.toLocaleString()}만원` : `${priceEok}억원`;

    desc = `실거래가 ${priceStr}, 전세가율 ${ratio.toFixed(1)}%. DVIEW에서 리포트를 확인해보세요.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: desc,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          handleKakaoShare();
        }
      }
    } else {
      handleKakaoShare();
    }
  }, [canonicalAptSlug, displayAptName, transactions, handleKakaoShare]);

  const handleShareSection = useCallback(async (type: 'childcare' | 'infra') => {
    if (!report.metrics) return;
    const baseUrl = window.location.origin;
    
    if (type === 'childcare' && eduScoreInfo) {
      const grade = eduScoreInfo.grade;
      const score = eduScoreInfo.score;
      const shareUrl = `${baseUrl}/apartment/${encodeURIComponent(canonicalAptSlug)}?shareType=childcare&grade=${grade}&score=${score}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast("학군·육아 분석 링크가 복사되었습니다!");
      });
    } else if (type === 'infra' && infraScoreInfo) {
      const grade = infraScoreInfo.grade;
      const score = infraScoreInfo.score;
      const shareUrl = `${baseUrl}/apartment/${encodeURIComponent(canonicalAptSlug)}?shareType=infra&grade=${grade}&score=${score}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast("입지·인프라 분석 링크가 복사되었습니다!");
      });
    }
  }, [report.metrics, canonicalAptSlug, eduScoreInfo, infraScoreInfo, showToast]);

  const renderTransactionTableNode = useCallback(() => (
    <TransactionTable 
      transactions={filteredTransactions} 
      typeMap={typeMap} 
      chartType={chartType} 
      normalizeAptName={normalizeAptName} 
      loadAllTransactions={loadAllTransactions}
      compact={!inline}
    />
  ), [filteredTransactions, typeMap, chartType, loadAllTransactions, inline]);

  const renderTransactionChartNode = useCallback(() => (
    <TransactionChartSection 
      transactions={filteredTransactions} 
      chartType={chartType} 
      setChartType={setChartType}
      displayAptName={displayAptName} 
      dong={report.dong || '동탄'}
      typeMap={typeMap} 
      normalizeAptName={normalizeAptName} 
      txSummary={txSummary}
      compact={!inline}
    />
  ), [filteredTransactions, chartType, setChartType, displayAptName, report.dong, typeMap, txSummary, inline]);

  const renderTransactionSummaryMetricsNode = useCallback(() => (
    <TransactionSummaryMetrics 
      transactions={filteredTransactions} 
      apartmentName={report.apartmentName}
      typeMap={typeMap}
      filterOutliers={filterOutliers}
      chartType={chartType}
    />
  ), [filteredTransactions, report.apartmentName, typeMap, filterOutliers, chartType]);

  const chapterScrollMarginClass = inline ? 'scroll-mt-14 md:scroll-mt-36' : 'scroll-mt-3';

  const retentionAndBridgeBlock = (
    <div className={inline ? '-mb-4 w-full space-y-3' : 'w-full'}>
      <ApartmentLandingRetentionStrip
        currentAptName={report.apartmentName}
        currentDong={report.dong || '동탄'}
        targets={recirculationTargets}
        txSummaryData={effectiveTxSummaryMap}
        nameMapping={nameMapping}
        inline={inline}
        hideFavoriteAction={!inline}
        onSelectPeer={handleRecircSelectApartment}
        onOpenCompare={handleRecircOpenCompare}
        onOpenPushModal={() => setIsPushModalOpen(true)}
      />
      {inline && (
        <InlineMortgageDsrBridge
          apartmentName={displayAptName}
          canonicalSlug={canonicalAptSlug}
          dong={report.dong || undefined}
          benchmarkPriceManwon={jeonseSafetyData?.latestPrice || txSummary?.latestPrice || 0}
          surface="apartment_inline_top"
          trigger="apartment_inline_top_bridge"
          compact
          onOpenMortgage={
            onOpenMortgage
              ? (bridgedApt, priceWon, trig) =>
                  onOpenMortgage(bridgedApt ? report.apartmentName : '', priceWon, trig)
              : undefined
          }
          onOpenTaxCalculator={
            onOpenTaxCalculator
              ? (bridgedApt, trig) =>
                  onOpenTaxCalculator(bridgedApt ? report.apartmentName : '', trig)
              : undefined
          }
          onOpenJeonseSafety={
            onOpenJeonseSafety
              ? (bridgedApt, trig) =>
                  onOpenJeonseSafety(bridgedApt ? report.apartmentName : '', trig)
              : undefined
          }
        />
      )}
    </div>
  );

  const headerAndNav = (
    <>
      <ApartmentModalHeader
        report={report}
        displayAptName={displayAptName}
        inline={inline}
        onBack={inline ? handleModalClose : undefined}
        handleNativeShare={handleNativeShare}
        handleCopySummary={handleCopySummary}
        handleDownloadShareCard={handleDownloadShareCard}
        setIsPushModalOpen={setIsPushModalOpen}
        copiedStatus={copiedStatus}
        isToolDropdownOpen={isToolDropdownOpen}
        setIsToolDropdownOpen={setIsToolDropdownOpen}
        toolDropdownRef={toolDropdownRef}
        preloadCalculators={preloadCalculators}
        verifiedSalePriceManwon={jeonseSafetyData?.latestPrice || txSummary?.latestPrice || 0}
        onOpenCompare={onOpenCompare}
        onOpenJeonseSafety={onOpenJeonseSafety}
        onOpenMortgage={onOpenMortgage}
        onOpenTaxCalculator={onOpenTaxCalculator}
        onOpenSellTimingCalculator={onOpenSellTimingCalculator}
      />

      <ApartmentChapterNavBar
        activeChapter={activeChapter}
        onSelectChapter={handleSelectChapter}
        scrollContainerRef={inline ? undefined : modalRef}
        compact={!inline}
        className={inline ? 'md:top-[80px]' : ''}
      />
    </>
  );

  const magazineBody = (
    <>
      {/* Magazine Content Wrapper with 8 Discrete Analytical Chapters */}
      <div className={`${inline ? 'px-2 py-2 md:px-6 md:py-4 gap-8' : 'px-4 sm:px-6 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+48px)] md:px-7 md:pt-4 md:pb-12 gap-8 md:gap-10'} flex flex-col w-full`}>
        {inline && retentionAndBridgeBlock}

        {/* Chapter 01: 시세·실거래 */}
        <section
          id="chapter-01-overview"
          data-testid="chapter-01-overview"
          className={`${chapterScrollMarginClass} snap-start w-full`}
        >
          <ErrorBoundary name="실거래가 내역 및 시세 차트">
            <ApartmentModalTransactionsTable
              inline={inline}
              isAnimationFinished={isAnimationFinished}
              isTxLoading={isTxLoading}
              filteredTransactions={filteredTransactions}
              typeMap={typeMap}
              chartType={chartType}
              setChartType={setChartType}
              normalizeAptName={normalizeAptName}
              displayAptName={displayAptName}
              dong={report.dong || '동탄'}
              apartmentName={report.apartmentName}
              txSummary={txSummary}
              filterOutliers={filterOutliers}
              handleToggleFilter={handleToggleFilter}
              areaFilterChips={areaFilterChips}
              selectedAreaFilter={selectedAreaFilter}
              setSelectedAreaFilter={setSelectedAreaFilter}
              loadAllTransactions={loadAllTransactions}
              renderTransactionTable={renderTransactionTableNode}
              renderTransactionChart={renderTransactionChartNode}
            />
          </ErrorBoundary>
        </section>

        {/* Overlay drawer (!inline): Calm peer comparison strip below Chapter 01 */}
        {!inline && retentionAndBridgeBlock}

        {/* Chapter 02: 거래량 */}
        <section
          id="chapter-02-volume"
          data-testid="chapter-02-volume"
          className={`${chapterScrollMarginClass} snap-start w-full pt-6 border-t border-border`}
        >
          <div className="flex flex-col gap-3 w-full">
            <div className="flex items-baseline justify-between gap-2 pb-1">
              <h2 className="text-[18px] md:text-[20px] font-extrabold tracking-tight text-primary">
                거래량 · 기간별 시세
              </h2>
              {txSummary && (
                <span className="text-[12px] sm:text-[13px] font-medium text-tertiary tabular-nums">
                  최근 3개월 {txSummary.avg3MTxCount || 0}건
                </span>
              )}
            </div>
            {isChapterMounted('chapter-02-volume') && (!isTxLoading || filteredTransactions.length > 0) ? (
              <ErrorBoundary key="ch02-ready" name="거래량 분석">
                <TransactionSummaryMetrics 
                  transactions={filteredTransactions} 
                  apartmentName={report.apartmentName}
                  typeMap={typeMap}
                  filterOutliers={filterOutliers}
                  chartType={chartType}
                />
              </ErrorBoundary>
            ) : (
              <div
                key="ch02-loading"
                className="w-full h-[520px] sm:h-[430px] rounded-2xl bg-elevated animate-shimmer flex items-center justify-center"
              >
                <span className="text-tertiary text-[12px] font-bold">거래량 분석 로딩 중...</span>
              </div>
            )}
          </div>
        </section>

        {/* Chapter 02 Native In-Feed AdSense Slot */}
        {process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true' && !suppressAds && (
          <div 
            data-testid="apartment-ad-slot-ch02"
            ref={ch02AdContainerRef}
            className="w-full my-6 min-h-[180px] sm:min-h-[220px] md:min-h-[250px] bg-elevated dark:bg-slate-900 rounded-2xl flex flex-col justify-center items-center overflow-hidden empty:hidden"
          >
            <AdSlot 
              refreshSlotId="1000000002_ch02"
              format="in-feed"
              minHeightClass="min-h-[180px] sm:min-h-[220px] md:min-h-[250px]"
              fallbackType="dashboard-promo"
              refreshKey={ch02AdRefreshKey}
              apartmentName={report.apartmentName}
              dong={report.dong || '동탄'}
            />
          </div>
        )}

        {/* Chapter 03: 전세·갭 */}
        <section
          id="chapter-03-gap"
          data-testid="chapter-03-gap"
          className={`${chapterScrollMarginClass} snap-start w-full pt-6 border-t border-border`}
        >
          <div className="bg-surface flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-[18px] md:text-[20px] font-extrabold tracking-tight text-primary">
                전세 · 갭 요약
              </h2>
              {jeonseSafetyData && (
                <span className="text-[12px] sm:text-[13px] font-medium text-tertiary tabular-nums">
                  전세가율 {jeonseSafetyData.ratio.toFixed(1)}%
                </span>
              )}
            </div>

            {isChapterMounted('chapter-03-gap') ? (
              <div key="ch03-ready" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-elevated rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-2">
                  <span className="text-[12px] font-semibold text-tertiary">매매-전세 차이 (갭)</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[20px] font-black text-primary tabular-nums">
                      {jeonseSafetyData && jeonseSafetyData.latestPrice > 0 && jeonseSafetyData.latestDeposit > 0
                        ? `${Math.max(0, Math.round((jeonseSafetyData.latestPrice - jeonseSafetyData.latestDeposit) / 10000))}억`
                        : '산정 중'}
                    </span>
                    {jeonseSafetyData && jeonseSafetyData.latestPrice > 0 && jeonseSafetyData.latestDeposit > 0 && (
                      <span className="text-[12px] font-semibold text-tertiary">필요</span>
                    )}
                  </div>
                </div>

                <div className="bg-elevated rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-2">
                  <span className="text-[12px] font-semibold text-tertiary">전세가율</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[20px] font-black text-primary tabular-nums">
                      {jeonseSafetyData && jeonseSafetyData.ratio > 0 ? `${jeonseSafetyData.ratio.toFixed(1)}%` : '집계 중'}
                    </span>
                  </div>
                </div>

                <div className="bg-elevated rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-2 sm:col-span-2 md:col-span-1">
                  <span className="text-[12px] font-semibold text-tertiary">적정가 대비</span>
                  <div>
                    <span className={`text-[18px] font-black tabular-nums ${
                      valuation.status === 'undervalued' ? 'text-brand-blue' :
                      valuation.status === 'overvalued' ? 'text-brand-red' : 'text-primary'
                    }`}>
                      {valuation.amount}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div key="ch03-loading" className="w-full h-28 rounded-2xl bg-elevated animate-shimmer flex items-center justify-center">
                <span className="text-tertiary text-[12px] font-bold">전세·갭 정보 불러오는 중...</span>
              </div>
            )}
          </div>
        </section>

        {/* Chapter 04: 학군·입지 */}
        <section
          id="chapter-04-infra"
          data-testid="chapter-04-infra"
          className={`${chapterScrollMarginClass} snap-start w-full flex flex-col gap-8 pt-6 border-t border-border`}
        >
          {isAnimationFinished && isChapterMounted('chapter-04-infra') ? (
            <>
              {/* Location & Infra Section */}
              <ErrorBoundary name="입지·인프라 분석">
                <LazyRender estimatedHeight={350}>
                  <InfraAnalysisSection
                    report={report}
                    inline={inline}
                    copiedStatus={copiedStatus}
                    handleShareSection={handleShareSection}
                  />
                </LazyRender>
              </ErrorBoundary>

              {/* Education & Childcare Section */}
              <ErrorBoundary name="학군·육아 분석">
                <LazyRender estimatedHeight={350}>
                  <EducationAnalysisSection
                    report={report}
                    inline={inline}
                    copiedStatus={copiedStatus}
                    handleShareSection={handleShareSection}
                    displayAptName={displayAptName}
                  />
                </LazyRender>
              </ErrorBoundary>
            </>
          ) : (
            <div className="w-full flex flex-col gap-6">
              <InfraAnalysisSkeleton />
              {report.metrics && <EducationAnalysisSkeleton />}
            </div>
          )}
        </section>

        {/* Chapter 05: 대출·전세안전 */}
        <section
          id="chapter-05-mortgage"
          data-testid="chapter-05-mortgage"
          className={`${chapterScrollMarginClass} snap-start w-full flex flex-col gap-8 pt-6 border-t border-border`}
        >
          {isAnimationFinished && isChapterMounted('chapter-05-mortgage') ? (
            <>
              {/* Interactive Mortgage & DSR Simulator */}
              <ErrorBoundary name="대출·DSR 시뮬레이터">
                <MortgageLdiSentinelCard
                  aptName={report.apartmentName}
                  dong={report.dong || '동탄'}
                  latestSalePrice={jeonseSafetyData?.latestPrice}
                  latestDepositPrice={jeonseSafetyData?.latestDeposit}
                  jeonseRatio={jeonseSafetyData?.ratio}
                  householdCount={report.metrics?.householdCount}
                  inline={inline}
                  onOpenMortgageCalculator={
                    onOpenMortgage
                      ? () =>
                          onOpenMortgage(
                            report.apartmentName,
                            currentPriceWon > 0 ? currentPriceWon : undefined,
                            'chapter05_sentinel_cta'
                          )
                      : undefined
                  }
                />
              </ErrorBoundary>

              {/* Jeonse Safety Section */}
              {jeonseSafetyData && (
                <div className="bg-surface pt-6 border-t border-border">
                  <div className="flex flex-col w-full">
                    <div className="flex items-center justify-between gap-2 mb-5">
                      <h2 className="text-[18px] md:text-[20px] font-extrabold tracking-tight text-primary">
                        전세 보증금 안전진단
                      </h2>
                      {onOpenJeonseSafety && (
                        <button
                          type="button"
                          data-testid="chapter05-jeonse-safety-cta"
                          onClick={() => onOpenJeonseSafety(report.apartmentName, 'chapter05_cta')}
                          onMouseEnter={preloadCalculators}
                          onFocus={preloadCalculators}
                          className="h-8 px-3 rounded-lg bg-[#eff1f5] hover:bg-[#e4e8ef] dark:bg-[#1e2532] dark:hover:bg-[#252c3d] text-secondary hover:text-primary text-[12px] font-semibold border-none cursor-pointer transition-colors whitespace-nowrap shrink-0"
                        >
                          전세 안전 계산기
                        </button>
                      )}
                    </div>
                    <div className="relative w-full">
                      <div>
                        <ErrorBoundary name="전세 안전성 진단">
                          <LazyRender estimatedHeight={300}>
                            <JeonseSafetyReport
                              aptName={report.apartmentName}
                              dong={report.dong || '동탄'}
                              ratio={jeonseSafetyData.ratio}
                              latestPrice={jeonseSafetyData.latestPrice}
                              latestDeposit={jeonseSafetyData.latestDeposit}
                              volume3M={txSummary ? (txSummary.avg1MTxCount || txSummary.avg3MTxCount || 0) : 0}
                              householdCount={report.metrics?.householdCount || 0}
                            />
                          </LazyRender>
                        </ErrorBoundary>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            transactions.length > 0 && <JeonseSafetySkeleton />
          )}
        </section>

        {/* Chapter 05 Native In-Feed AdSense Slot */}
        {process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true' && !suppressAds && (
          <div 
            data-testid="apartment-ad-slot-ch05"
            ref={ch05AdContainerRef}
            className="w-full my-6 min-h-[180px] sm:min-h-[220px] md:min-h-[250px] bg-elevated dark:bg-slate-900 rounded-2xl flex flex-col justify-center items-center overflow-hidden empty:hidden"
          >
            <AdSlot 
              refreshSlotId="1000000002_ch05"
              format="in-feed"
              minHeightClass="min-h-[180px] sm:min-h-[220px] md:min-h-[250px]"
              fallbackType="mbti-promo"
              refreshKey={ch05AdRefreshKey}
              apartmentName={report.apartmentName}
              dong={report.dong || '동탄'}
            />
          </div>
        )}

        {/* Chapter 06: 단지정보 */}
        <section
          id="chapter-06-ledger"
          data-testid="chapter-06-ledger"
          className={`${chapterScrollMarginClass} snap-start w-full pt-6 border-t border-border`}
        >
          {isAnimationFinished && isChapterMounted('chapter-06-ledger') ? (
            <ErrorBoundary name="단지 기본정보">
              <ApartmentSpecsSection
                report={report}
                inline={inline}
                displayAptName={displayAptName}
              />
            </ErrorBoundary>
          ) : (
            <div className="w-full h-32 rounded-2xl bg-elevated animate-shimmer mt-2" />
          )}
        </section>

        {/* Chapter 07: 적정가·금리 */}
        <section
          id="chapter-07-macro"
          data-testid="chapter-07-macro"
          className={`${chapterScrollMarginClass} snap-start w-full flex flex-col gap-6 pt-6 border-t border-border`}
        >
          {isAnimationFinished && isChapterMounted('chapter-07-macro') ? (
            <div className="relative w-full">
              <div>
                <ErrorBoundary name="적정가·금리 분석">
                  <LazyRender estimatedHeight={400}>
                    <AdvancedValuationMetrics key={report.id || report.apartmentName} report={report} transactions={transactions} />
                  </LazyRender>
                </ErrorBoundary>
                <BuyOrWaitVote aptName={report.apartmentName} valuationStatus={valuation.status} valuationAmount={valuation.amount} />
              </div>
            </div>
          ) : (
            transactions.length > 0 && <AdvancedValuationSkeleton />
          )}
        </section>

        {/* Chapter 08: 임장·후기 */}
        <section
          id="chapter-08-report"
          data-testid="chapter-08-report"
          className={`${chapterScrollMarginClass} snap-start w-full flex flex-col gap-8 pt-6 border-t border-border`}
        >
          {isAnimationFinished && isChapterMounted('chapter-08-report') ? (
            <>
              {/* Photo Gallery */}
              {report.images && report.images.length > 0 ? (() => {
                const IMAGE_TAG_LABELS: Record<string, string> = {
                  'gateImg': '정문', 'landscapeImg': '조경', 'parkingImg': '주차장',
                  'maintenanceImg': '공용부', 'communityImg': '커뮤니티', 'schoolImg': '통학로', 'commerceImg': '상권',
                };
                const allTags = ['전체', ...Array.from(new Set(report.images.map(img => img.locationTag || '기타')))];
                return (
                  <div className="bg-surface overflow-hidden relative">
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <h2 className="text-[18px] md:text-[20px] font-extrabold tracking-tight text-primary">
                        단지 사진 <span className="text-[14px] font-semibold text-tertiary tabular-nums ml-1">{report.images.length}장</span>
                      </h2>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsUploadModalOpen(true);
                        }}
                        className="h-8 px-3 rounded-lg bg-[#eff1f5] hover:bg-[#e4e8ef] dark:bg-[#1e2532] dark:hover:bg-[#252c3d] text-secondary hover:text-primary text-[12px] font-semibold border-none cursor-pointer transition-colors"
                      >
                        + 사진 올리기
                      </button>
                    </div>
                    <ApartmentGallery aptName={report.apartmentName} images={report.images} tags={allTags} tagLabels={IMAGE_TAG_LABELS} onImageClick={setFullscreenImage} />
                  </div>
                );
              })() : (
                <div className="bg-surface overflow-hidden">
                  <h2 className="text-[18px] md:text-[20px] font-extrabold tracking-tight text-primary mb-4">
                    단지 사진
                  </h2>
                  <div className="w-full rounded-2xl bg-elevated px-6 py-8 md:py-10 flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-surface dark:bg-[#1e2532] flex items-center justify-center text-tertiary">
                      <Camera size={22} strokeWidth={1.8} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-[15px] md:text-[16px] font-bold text-primary tracking-tight break-keep">
                        아직 등록된 단지 사진이 없어요
                      </h3>
                      <p className="text-[13px] text-tertiary font-medium break-keep">
                        정문·조경·주차장 사진을 올려주시면 다른 분들에게 도움이 됩니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsUploadModalOpen(true);
                      }}
                      className="mt-1 h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-[13px] font-bold border-none cursor-pointer transition-colors"
                    >
                      첫 사진 올리기
                    </button>
                  </div>
                </div>
              )}

              {/* Scouting Report Detail */}
              <ErrorBoundary name="현장 임장 상세">
                <ScoutingReportDetailSection report={report} inline={inline} />
              </ErrorBoundary>
            </>
          ) : (
            <ScoutingReportDetailSkeleton />
          )}

          {/* Chapter 08 Viral Paywall Gate */}
          <ViralPaywallGate onShare={handleKakaoShare} />

          {/* Chapter 08 Terminal 3-Way Recirculation Hub */}
          <TerminalRecirculationHub
            currentAptName={report.apartmentName}
            currentDong={report.dong || '동탄'}
            currentPriceWon={currentPriceWon}
            targets={recirculationTargets}
            onSelectApartment={handleRecircSelectApartment}
            onOpenCompare={handleRecircOpenCompare}
            onOpenMortgage={handleRecircOpenMortgage}
          />
        </section>

        {/* AdSense Responsive Slot */}
        {process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true' && !suppressAds && (
          <div className="w-full my-6 empty:hidden" data-testid="apartment-modal-ad-slot">
            <AdSlot format="banner" className="w-full" />
          </div>
        )}
      </div>
    </>
  );

  if (inline) {
    return (
      <div key="apartment-inline-report" data-testid="apartment-inline-report" className="w-full flex flex-col">
        {headerAndNav}
        {magazineBody}
        {showScrollTop && (
          <button
            type="button"
            data-scroll-interactive="true"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="hidden md:inline-flex fixed bottom-6 right-5 z-50 p-2.5 rounded-full bg-surface/95 dark:bg-[#1e2532]/95 text-secondary hover:text-primary border border-border shadow-sm transition-colors active:scale-95 cursor-pointer"
            aria-label="맨 위로 이동"
          >
            <ArrowLeft size={18} className="rotate-90" />
          </button>
        )}
        <PhotoUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          apartmentId={report.id}
          apartmentName={report.apartmentName}
          user={user}
        />
        <PushSubscriptionModal 
          isOpen={isPushModalOpen}
          onClose={() => setIsPushModalOpen(false)}
          aptName={displayAptName}
          canonicalSlug={canonicalAptSlug}
          dong={report.dong || undefined}
        />
        {mounted && (
          <ApartmentModalKakaoCard
            shareCardRef={shareCardRef}
            report={report}
            displayAptName={displayAptName}
            transactions={transactions}
            valuation={valuation}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <div
        ref={backdropRef}
        data-testid="apartment-inspector-backdrop"
        data-scroll-interactive="true"
        role="dialog"
        aria-modal="true"
        aria-label={`${displayAptName} 상세 분석 시트`}
        className="fixed inset-0 z-[10010] flex items-end md:items-stretch justify-center md:justify-end p-0 bg-black/50 md:bg-black/35 backdrop-blur-[2px] overscroll-none animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleModalClose();
          }
        }}
      >
        <div
          data-testid="apartment-inspector-panel"
          onClick={(e) => e.stopPropagation()}
          className="relative w-full md:w-[min(92vw,780px)] lg:w-[780px] xl:w-[880px] md:min-w-[380px] lg:min-w-[780px] xl:min-w-[880px] shrink-0 h-[94dvh] max-h-[94dvh] md:h-dvh md:max-h-dvh md:max-w-[780px] xl:max-w-[880px] bg-surface rounded-t-3xl md:rounded-none md:rounded-l-3xl shadow-2xl overflow-hidden flex flex-col border-t md:border-t-0 md:border-l border-border/80 outline-none animate-in slide-in-from-bottom md:slide-in-from-right duration-300"
        >
          {/* Fixed Top Chrome: Complex Header, Close Button & Chapter Nav stay pinned during scroll */}
          <div
            data-testid="apartment-drawer-sticky-chrome"
            data-scroll-interactive="true"
            className="relative shrink-0 z-[70] bg-surface"
          >
            <div className="md:hidden w-full pt-2 pb-0.5 flex justify-center shrink-0 bg-surface" aria-hidden="true">
              <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>
            <button
              type="button"
              onClick={handleModalClose}
              aria-label="닫기"
              title="닫기 (ESC)"
              className="absolute top-3.5 md:top-3.5 right-3.5 md:right-5 z-[80] p-2 rounded-xl bg-transparent hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] text-tertiary hover:text-primary border-none transition-colors active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 dark:focus-visible:ring-white/30"
            >
              <X size={20} />
            </button>

            {headerAndNav}
          </div>

          {/* Single Scrollable Drawer Body — Eliminates outer/nested scroll collisions */}
          <div
            ref={modalRef}
            data-testid="apartment-inspector-scroll-body"
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain custom-scrollbar relative"
            style={{ WebkitOverflowScrolling: 'touch', scrollbarGutter: 'stable' }}
          >
            {magazineBody}
          </div>

          {showScrollTop && (
            <button
              type="button"
              data-scroll-interactive="true"
              onClick={() => modalRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
              className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+20px)] md:bottom-5 right-4 md:right-5 z-[75] w-10 h-10 inline-flex items-center justify-center rounded-full bg-surface/95 dark:bg-[#1e2532]/95 text-secondary hover:text-primary border border-border shadow-sm transition-colors active:scale-95 cursor-pointer touch-manipulation"
              aria-label="맨 위로 이동"
            >
              <ArrowLeft size={16} className="rotate-90" />
            </button>
          )}
        </div>
      </div>

      <PhotoUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        apartmentId={report.id}
        apartmentName={report.apartmentName}
        user={user}
      />

      <PushSubscriptionModal
        isOpen={isPushModalOpen}
        onClose={() => setIsPushModalOpen(false)}
        aptName={displayAptName}
        canonicalSlug={canonicalAptSlug}
        dong={report.dong || undefined}
      />

      {mounted && (
        <ApartmentModalKakaoCard
          shareCardRef={shareCardRef}
          report={report}
          displayAptName={displayAptName}
          transactions={transactions}
          valuation={valuation}
        />
      )}
    </>
  );
});

export default ApartmentModal;
