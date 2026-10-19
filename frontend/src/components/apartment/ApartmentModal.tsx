'use client';

import React, { useState, useRef, useMemo, useEffect, useCallback, useDeferredValue } from 'react';
import {
  X, Camera, Building, Info, Shield, ShieldAlert, ChevronDown, ArrowLeft, Download, Check,
  Crown, ChevronRight, Calculator, Bell,
  Activity, Layers, GraduationCap, TrendingUp, Building2, Globe2, FileText
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { normalize84Price } from '@/lib/utils/valuation';
import { normalizeAptName, getDisplayAptName, findTypeMapEntry, isSameApartment } from '@/lib/utils/apartmentMapping';
import type { FieldReportData } from '@/lib/DashboardFacade';
import type { User } from 'firebase/auth';
import { usePreventElasticBounce } from '@/hooks/usePreventElasticBounce';
import { createPortal } from 'react-dom';
import { safeReload } from '@/lib/utils/safeReload';
import { TransactionListSchema } from '@/lib/validation/facade.schemas';
import { logger } from '@/lib/services/logger';
import { useApartmentDetails } from '@/hooks/useApartmentDetails';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useSettingsValues } from '@/contexts/SettingsContext';
import { shareAptToKakao, copyAptSummaryToClipboard } from '@/lib/utils/kakaoShare';
import { trackEvent } from '@/lib/utils/analytics';
import { safeHtml2canvasPro } from '@/lib/utils/html2canvasPatch';
import { usePWA } from '@/components/pwa/PWAProvider';
import { getBrandMultiplier, calculatePremiumScores, calculateEducationScore, calculateInfraScore } from '@/lib/utils/scoring';
import { calculateDynamicDCF } from '@/lib/utils/valuationEngine';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { ApartmentGallery } from '@/components/apartment-modal/ApartmentGallery';
import { ViralPaywallGate } from '@/components/apartment-modal/ViralPaywallGate';
import { AdSlot } from '@/components/ads/AdSlot';
import { ApartmentChapterNavBar } from './ApartmentChapterNavBar';
import { TerminalRecirculationHub } from './TerminalRecirculationHub';
import { adRefreshManager } from '@/lib/ads/adRefreshManager';
import {
  selectRecirculationTargets,
  syncShallowApartmentOpen,
  syncShallowModalCloseToDashboard,
  transitionRecirculationState,
} from '@/lib/ads/recirculationEngine';

import { useApartmentModalState } from './hooks/useApartmentModalState';
import { ApartmentModalHeader } from './ApartmentModalHeader';
import { ApartmentModalTransactionsTable } from './ApartmentModalTransactionsTable';
import { ApartmentModalKakaoCard } from './ApartmentModalKakaoCard';
import { MortgageLdiSentinelCard } from './chapters/MortgageLdiSentinelCard';

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
  <div className="w-full h-[470px] md:h-[530px] flex flex-col gap-6 p-6 border border-border/40 rounded-[20px]">
    <div className="flex justify-between items-center">
      <div className="h-6 w-32 rounded bg-slate-250 dark:bg-slate-800 animate-shimmer" />
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
        <div className="w-10 h-10 rounded-full border-2 border-toss-blue/20 border-t-toss-blue animate-spin" />
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
}: { 
  report: FieldReportData;
  onClose: () => void;
  user: User | null;
  transactions?: TransactionRecord[];
  typeMap: Record<string, Record<string, { typeM2: string; typePyeong: string }>>;
  isLoadingDetail?: boolean;
  isAdmin?: boolean;
  inline?: boolean;
  txSummary?: import('@/lib/types/transaction').AptTxSummary;
  loadAllTransactions?: () => void;
  onRequestLogin?: (message: string) => void;
  onSelectApartment?: (aptName: string, dong?: string) => void;
  onOpenCompare?: (aptName: string, targetAptName?: string) => void;
  onOpenJeonseSafety?: (aptName: string) => void;
  onOpenMortgage?: (aptName: string, priceWon?: number) => void;
  onOpenTaxCalculator?: (aptName: string) => void;
  onOpenSellTimingCalculator?: (aptName: string) => void;
  isTxLoading?: boolean;
  sheetApartments?: Record<string, import('@/lib/dong-apartments').DongApartment[]>;
  nameMapping?: Record<string, string>;
  txSummaryData?: Record<string, import('@/lib/types/transaction').AptTxSummary>;
  locationScores?: Record<string, import('@/lib/types/transaction').LocationScoreItem>;
}) {
  const handleModalClose = useCallback(() => {
    if (!inline) {
      syncShallowModalCloseToDashboard();
    }
    onClose();
  }, [inline, onClose]);

  useSwipeNavigation({ onBack: handleModalClose });


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
  } = useApartmentModalState();

  const [mounted, setMounted] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [chartType, setChartType] = useState<'sale' | 'jeonse'>('sale');
  const [filterOutliers, setFilterOutliers] = useState(false);
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('전체');

  const [activeChapter, setActiveChapter] = useState('chapter-01-overview');
  const [ch02AdRefreshKey, setCh02AdRefreshKey] = useState(0);
  const [ch05AdRefreshKey, setCh05AdRefreshKey] = useState(0);
  const ch02AdContainerRef = useRef<HTMLDivElement | null>(null);
  const ch05AdContainerRef = useRef<HTMLDivElement | null>(null);

  const handleSelectChapter = useCallback((chapterId: string) => {
    setActiveChapter(chapterId);
    const targetElement = document.getElementById(chapterId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    adRefreshManager.onTabSwitch();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    types.add('전체');
    transactions.forEach(t => {
      if (areaUnit === 'm2') {
        types.add(t.areaLabelM2);
      } else {
        types.add(t.areaLabelPyeong);
      }
    });
    return Array.from(types);
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

  const valuation: CalculatedValuation = useMemo(() => {
    const saleTxs = transactions.filter(t => !t.dealType || (t.dealType !== '전세' && t.dealType !== '월세'));
    const jeonseTxs = transactions.filter(t => t.dealType === '전세');
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
  }, [transactions]);

  const jeonseSafetyData: CalculatedJeonseSafety | null = useMemo(() => {
    const saleTxs = transactions.filter(t => !t.dealType || (t.dealType !== '전세' && t.dealType !== '월세'));
    const jeonseTxs = transactions.filter(t => t.dealType === '전세');
    const latestSale = saleTxs[0];
    const latestJeonse = jeonseTxs[0];

    const salePrice = latestSale ? latestSale.price : 0;
    const jeonsePrice = latestJeonse ? latestJeonse.deposit || 0 : 0;

    if (salePrice === 0 && jeonsePrice === 0) return null;
    const ratio = salePrice > 0 ? (jeonsePrice / salePrice) * 100 : 0;
    return { latestPrice: salePrice, latestDeposit: jeonsePrice, ratio };
  }, [transactions]);

  const currentPriceWon = useMemo(() => {
    const rawMan =
      jeonseSafetyData?.latestPrice && jeonseSafetyData.latestPrice > 0
        ? jeonseSafetyData.latestPrice
        : txSummary?.latestPrice || txSummary?.avg1MPrice || txSummary?.avg3MPrice || 0;
    const num = Number(rawMan);
    if (!Number.isFinite(num) || num <= 0) return 0;
    return num < 10_000_000 ? Math.round(num * 10_000) : Math.round(num);
  }, [jeonseSafetyData, txSummary]);

  const recirculationTargets = useMemo(() => {
    return selectRecirculationTargets({
      currentAptName: report.apartmentName,
      currentDong: report.dong || '동탄',
      currentPriceWon,
      sheetApartments: sheetApartments || {},
      txSummaryData: _txSummaryData || txSummaryData || {},
      nameMapping: nameMapping || {},
    });
  }, [
    report.apartmentName,
    report.dong,
    currentPriceWon,
    sheetApartments,
    _txSummaryData,
    txSummaryData,
    nameMapping,
  ]);

  useEffect(() => {
    if (!inline && report.apartmentName) {
      syncShallowApartmentOpen(report.apartmentName, { dong: report.dong });
    }
  }, [inline, report.apartmentName, report.dong]);

  const handleRecircSelectApartment = useCallback(
    (targetAptName: string) => {
      if (onSelectApartment) {
        const targetCandidate = recirculationTargets.find((t) => t.aptName === targetAptName);
        onSelectApartment(targetAptName, targetCandidate?.dong);
      } else {
        syncShallowApartmentOpen(targetAptName, { force: true });
      }
      modalRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [onSelectApartment, recirculationTargets]
  );

  const handleRecircOpenCompare = useCallback(
    (apt1: string, apt2: string) => {
      if (onOpenCompare) {
        onOpenCompare(apt1, apt2);
      } else {
        transitionRecirculationState(
          { status: 'CHAPTER_EXPLORE', apt: apt1 },
          { type: 'CLICK_RECIRC_COMPARE', baseApt: apt1, targetApt: apt2 }
        );
      }
    },
    [onOpenCompare]
  );

  const handleRecircOpenMortgage = useCallback(
    (aptName: string, priceWon: number) => {
      if (onOpenMortgage) {
        onOpenMortgage(aptName, priceWon);
      } else {
        transitionRecirculationState(
          { status: 'CHAPTER_EXPLORE', apt: aptName },
          { type: 'CLICK_RECIRC_MORTGAGE', apt: aptName, priceWon }
        );
      }
    },
    [onOpenMortgage]
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
    if (!modalRef.current) return;
    if (modalRef.current.scrollTop > 400) {
      setShowScrollTop(true);
    } else {
      setShowScrollTop(false);
    }
  }, []);

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
    const el = modalRef.current;
    if (!el) return;

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

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (rId) window.cancelAnimationFrame(rId);
    };
  }, [handleScroll, mountedRef]);

  const handleKakaoShare = useCallback(async () => {
    if (isSharing) return;
    setIsSharing(true);
    trackEvent('share_apartment', { apt_name: report.apartmentName, method: 'kakao' });
    const baseUrl = window.location.origin;

    try {
      const saleTxs = transactions.filter(t => !t.dealType || (t.dealType !== '전세' && t.dealType !== '월세'));
      const jeonseTxs = transactions.filter(t => t.dealType === '전세');
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
  }, [isSharing, report.apartmentName, transactions, valuation.status, valuation.amount, displayAptName, showToast, setIsSharing, mountedRef]);

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
    const saleTxs = transactions.filter(t => !t.dealType || (t.dealType !== '전세' && t.dealType !== '월세'));
    const jeonseTxs = transactions.filter(t => t.dealType === '전세');
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
  }, [report.apartmentName, transactions, eduScoreInfo, infraScoreInfo, displayAptName, valuation.status, valuation.amount, showToast, setCopiedStatus, copiedTimeoutRef, mountedRef]);

  const handleNativeShare = useCallback(async () => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/apartment/${encodeURIComponent(report.apartmentName)}`;
    const title = `${displayAptName} 가치분석 리포트`;
    let desc = '';

    const saleTxs = transactions.filter(t => !t.dealType || (t.dealType !== '전세' && t.dealType !== '월세'));
    const jeonseTxs = transactions.filter(t => t.dealType === '전세');
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
  }, [report.apartmentName, displayAptName, transactions, handleKakaoShare]);

  const handleShareSection = useCallback(async (type: 'childcare' | 'infra') => {
    if (!report.metrics) return;
    const baseUrl = window.location.origin;
    
    if (type === 'childcare' && eduScoreInfo) {
      const grade = eduScoreInfo.grade;
      const score = eduScoreInfo.score;
      const shareUrl = `${baseUrl}/apartment/${encodeURIComponent(report.apartmentName)}?shareType=childcare&grade=${grade}&score=${score}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast("학군·육아 분석 링크가 복사되었습니다!");
      });
    } else if (type === 'infra' && infraScoreInfo) {
      const grade = infraScoreInfo.grade;
      const score = infraScoreInfo.score;
      const shareUrl = `${baseUrl}/apartment/${encodeURIComponent(report.apartmentName)}?shareType=infra&grade=${grade}&score=${score}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast("입지·인프라 분석 링크가 복사되었습니다!");
      });
    }
  }, [report.metrics, report.apartmentName, eduScoreInfo, infraScoreInfo, showToast]);

  const renderTransactionTableNode = useCallback(() => (
    <TransactionTable 
      transactions={filteredTransactions} 
      typeMap={typeMap} 
      chartType={chartType} 
      normalizeAptName={normalizeAptName} 
    />
  ), [filteredTransactions, typeMap, chartType]);

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
    />
  ), [filteredTransactions, chartType, setChartType, displayAptName, report.dong, typeMap, txSummary]);

  const renderTransactionSummaryMetricsNode = useCallback(() => (
    <TransactionSummaryMetrics 
      transactions={filteredTransactions} 
      apartmentName={report.apartmentName}
      typeMap={typeMap}
      filterOutliers={filterOutliers}
      chartType={chartType}
    />
  ), [filteredTransactions, report.apartmentName, typeMap, filterOutliers, chartType]);

  const content = (
    <>
      <ApartmentModalHeader
        report={report}
        displayAptName={displayAptName}
        inline={inline}
        handleNativeShare={handleNativeShare}
        handleCopySummary={handleCopySummary}
        handleDownloadShareCard={handleDownloadShareCard}
        setIsPushModalOpen={setIsPushModalOpen}
        copiedStatus={copiedStatus}
        isToolDropdownOpen={isToolDropdownOpen}
        setIsToolDropdownOpen={setIsToolDropdownOpen}
        toolDropdownRef={toolDropdownRef}
        preloadCalculators={preloadCalculators}
        onOpenCompare={onOpenCompare}
        onOpenJeonseSafety={onOpenJeonseSafety}
        onOpenMortgage={onOpenMortgage}
        onOpenTaxCalculator={onOpenTaxCalculator}
        onOpenSellTimingCalculator={onOpenSellTimingCalculator}
      />

      <ApartmentChapterNavBar
        activeChapter={activeChapter}
        onSelectChapter={handleSelectChapter}
        scrollContainerRef={modalRef}
      />

      {/* Magazine Content Wrapper with 8 Discrete Analytical Chapters */}
      <div className={`${inline ? 'px-2 py-2 md:px-6 md:py-4' : 'px-2 py-2 md:px-3 md:py-3'} flex flex-col gap-8 w-full`}>
        {/* Chapter 01: 개요 및 실거래 궤적 (Overview & Price) */}
        <section
          id="chapter-01-overview"
          data-testid="chapter-01-overview"
          className="scroll-mt-14 snap-start w-full"
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
              renderTransactionSummaryMetrics={() => null}
            />
          </ErrorBoundary>
        </section>

        {/* Chapter 02: 거래량 회전율 분석 (Turnover & Volume) */}
        <section
          id="chapter-02-volume"
          data-testid="chapter-02-volume"
          className="scroll-mt-14 snap-start w-full"
        >
          <div className="flex flex-col gap-3 w-full">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-[18px] md:text-[20px] font-bold text-primary flex items-center gap-2">
                <Activity size={20} className="text-[#057e77] dark:text-emerald-400" />
                거래량 및 회전율 분석
              </h2>
              {txSummary && (
                <span className="text-[12px] sm:text-[13px] font-medium text-tertiary">
                  최근 3개월 {txSummary.avg3MTxCount || 0}건 거래
                </span>
              )}
            </div>
            <ErrorBoundary name="거래량 회전율 분석">
              <TransactionSummaryMetrics 
                transactions={filteredTransactions} 
                apartmentName={report.apartmentName}
                typeMap={typeMap}
                filterOutliers={filterOutliers}
                chartType={chartType}
              />
            </ErrorBoundary>
          </div>
        </section>

        {/* Chapter 02 Native In-Feed AdSense Slot */}
        <div 
          data-testid="apartment-ad-slot-ch02"
          ref={ch02AdContainerRef}
          className="w-full my-6 min-h-[180px] sm:min-h-[220px] md:min-h-[250px] bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl rounded-[20px] border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-5 flex flex-col justify-center items-center shadow-sm overflow-hidden"
        >
          <AdSlot 
            slotId="1000000002"
            refreshSlotId="1000000002_ch02"
            format="in-feed"
            minHeightClass="min-h-[180px] sm:min-h-[220px] md:min-h-[250px]"
            fallbackType="dashboard-promo"
            refreshKey={ch02AdRefreshKey}
            apartmentName={report.apartmentName}
            dong={report.dong || '동탄'}
          />
        </div>

        {/* Chapter 03: 전세가율 갭투자 매트릭스 (Jeonse Gap) */}
        <section
          id="chapter-03-gap"
          data-testid="chapter-03-gap"
          className="scroll-mt-14 snap-start w-full"
        >
          <div className={`${inline ? 'bg-surface' : 'bg-surface/60 dark:bg-surface/35 backdrop-blur-md'} rounded-3xl p-6 md:p-8 shadow-sm border border-border flex flex-col gap-5`}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-[18px] md:text-[20px] font-bold text-primary flex items-center gap-2">
                <Layers size={20} className="text-[#057e77] dark:text-emerald-400" />
                전세가율 및 갭투자 매트릭스
              </h2>
              {jeonseSafetyData && (
                <span className="text-[12px] sm:text-[13px] font-semibold text-secondary">
                  실거래 전세가율 {jeonseSafetyData.ratio.toFixed(1)}%
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              <div className="bg-body border border-border/80 rounded-2xl p-4.5 flex flex-col justify-between shadow-sm">
                <span className="text-[12px] font-bold text-tertiary">실구매 필요차액 (매매-전세 갭)</span>
                <div className="mt-2 text-right">
                  <span className="text-[20px] font-black text-toss-blue tabular-nums">
                    {jeonseSafetyData && jeonseSafetyData.latestPrice > 0 && jeonseSafetyData.latestDeposit > 0
                      ? `${Math.max(0, Math.round((jeonseSafetyData.latestPrice - jeonseSafetyData.latestDeposit) / 10000))}억`
                      : '산정 중'}
                  </span>
                  <span className="text-[12px] font-bold text-secondary ml-1">필요</span>
                </div>
              </div>

              <div className="bg-body border border-border/80 rounded-2xl p-4.5 flex flex-col justify-between shadow-sm">
                <span className="text-[12px] font-bold text-tertiary">실거래 전세가율</span>
                <div className="mt-2 text-right">
                  <span className="text-[20px] font-black text-[#057e77] dark:text-emerald-400 tabular-nums">
                    {jeonseSafetyData && jeonseSafetyData.ratio > 0 ? `${jeonseSafetyData.ratio.toFixed(1)}%` : '데이터 수집 중'}
                  </span>
                  <span className="text-[12px] font-bold text-secondary ml-1">기록</span>
                </div>
              </div>

              <div className="bg-body border border-border/80 rounded-2xl p-4.5 flex flex-col justify-between shadow-sm sm:col-span-2 md:col-span-1">
                <span className="text-[12px] font-bold text-tertiary">DCF 밸류에이션 판정</span>
                <div className="mt-2 text-right">
                  <span className={`text-[18px] font-black tabular-nums ${
                    valuation.status === 'undervalued' ? 'text-emerald-500' :
                    valuation.status === 'overvalued' ? 'text-red-500' : 'text-primary'
                  }`}>
                    {valuation.amount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Chapter 04: 학군 및 하이퍼로컬 인프라 (Schools & Infra) */}
        <section
          id="chapter-04-infra"
          data-testid="chapter-04-infra"
          className="scroll-mt-14 snap-start w-full flex flex-col gap-8"
        >
          {isAnimationFinished ? (
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

        {/* Chapter 05: 주담대 LDI 및 역전세 센티넬 (Mortgage LDI) */}
        <section
          id="chapter-05-mortgage"
          data-testid="chapter-05-mortgage"
          className="scroll-mt-14 snap-start w-full flex flex-col gap-6"
        >
          {isAnimationFinished ? (
            <>
              {/* Mortgage LDI Sentinel Card */}
              <ErrorBoundary name="주담대 LDI 센티넬">
                <MortgageLdiSentinelCard
                  aptName={report.apartmentName}
                  dong={report.dong || '동탄'}
                  latestSalePrice={jeonseSafetyData?.latestPrice}
                  latestDepositPrice={jeonseSafetyData?.latestDeposit}
                  jeonseRatio={jeonseSafetyData?.ratio}
                  householdCount={report.metrics?.householdCount}
                  inline={inline}
                  onOpenMortgageCalculator={onOpenMortgage ? () => onOpenMortgage(report.apartmentName) : undefined}
                />
              </ErrorBoundary>

              {/* Jeonse Safety Section */}
              {jeonseSafetyData && (
                <div className={`${inline ? 'bg-surface' : 'bg-surface/60 dark:bg-surface/35 backdrop-blur-md'} rounded-3xl p-6 md:p-8 shadow-sm border border-border`}>
                  <div className="flex flex-col w-full">
                    <h2 className="text-[18px] font-bold text-primary flex items-center gap-2 mb-6 border-b border-border pb-3">
                      <ShieldAlert size={18} className="text-[#057e77] dark:text-emerald-400"/> 전세 안전성 진단 리포트 & 주담대 LDI
                    </h2>
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

              {/* Calculators CTA */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center items-center w-full">
                {onOpenMortgage && (
                  <button
                    onClick={() => onOpenMortgage(report.apartmentName)}
                    onMouseEnter={preloadCalculators}
                    onFocus={preloadCalculators}
                    className="w-full sm:w-auto px-5 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-extrabold text-[14px] rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer border-none"
                  >
                    <Calculator size={16} />
                    <span>주담대 및 DSR 대출 한도 계산하기</span>
                  </button>
                )}

                {onOpenTaxCalculator && (
                  <button
                    onClick={() => onOpenTaxCalculator(report.apartmentName)}
                    onMouseEnter={preloadCalculators}
                    onFocus={preloadCalculators}
                    className="w-full sm:w-auto px-5 py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-extrabold text-[14px] rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer border-none"
                  >
                    <Calculator size={16} />
                    <span>나의 예상 취득세 및 복비 계산하기</span>
                  </button>
                )}

                {onOpenSellTimingCalculator && (
                  <button
                    onClick={() => onOpenSellTimingCalculator(report.apartmentName)}
                    onMouseEnter={preloadCalculators}
                    onFocus={preloadCalculators}
                    className="w-full sm:w-auto px-5 py-3.5 bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white font-extrabold text-[14px] rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer border-none"
                  >
                    <Calculator size={16} />
                    <span>지금 팔면 호구일까? AI 매도 진단하기</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            transactions.length > 0 && <JeonseSafetySkeleton />
          )}
        </section>

        {/* Chapter 05 Native In-Feed AdSense Slot */}
        <div 
          data-testid="apartment-ad-slot-ch05"
          ref={ch05AdContainerRef}
          className="w-full my-6 min-h-[180px] sm:min-h-[220px] md:min-h-[250px] bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl rounded-[20px] border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-5 flex flex-col justify-center items-center shadow-sm overflow-hidden"
        >
          <AdSlot 
            slotId="1000000002"
            refreshSlotId="1000000002_ch05"
            format="in-feed"
            minHeightClass="min-h-[180px] sm:min-h-[220px] md:min-h-[250px]"
            fallbackType="mbti-promo"
            refreshKey={ch05AdRefreshKey}
            apartmentName={report.apartmentName}
            dong={report.dong || '동탄'}
          />
        </div>

        {/* Chapter 06: 세대수 및 평형별 거래 대장 (Pyeong Ledger) */}
        <section
          id="chapter-06-ledger"
          data-testid="chapter-06-ledger"
          className="scroll-mt-14 snap-start w-full"
        >
          {isAnimationFinished ? (
            <ErrorBoundary name="단지 기본정보 및 평형 대장">
              <ApartmentSpecsSection
                report={report}
                inline={inline}
                displayAptName={displayAptName}
              />
            </ErrorBoundary>
          ) : (
            <div className="w-full h-32 rounded-[20px] border border-border/40 animate-shimmer mt-4" />
          )}
        </section>

        {/* Chapter 07: 거시 체제 및 지역 상관도 (Macro Correlation) */}
        <section
          id="chapter-07-macro"
          data-testid="chapter-07-macro"
          className="scroll-mt-14 snap-start w-full flex flex-col gap-4"
        >
          {isAnimationFinished ? (
            <div className="relative w-full">
              <div>
                <ErrorBoundary name="거시 체제 및 밸류에이션 분석">
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

        {/* Chapter 08: 단지 종합 평가 리포트 (Executive Monograph) */}
        <section
          id="chapter-08-report"
          data-testid="chapter-08-report"
          className="scroll-mt-14 snap-start w-full flex flex-col gap-8"
        >
          {isAnimationFinished ? (
            <>
              {/* Photo Gallery */}
              {report.images && report.images.length > 0 ? (() => {
                const IMAGE_TAG_LABELS: Record<string, string> = {
                  'gateImg': '정문', 'landscapeImg': '조경', 'parkingImg': '주차장',
                  'maintenanceImg': '공용부', 'communityImg': '커뮤니티', 'schoolImg': '통학로', 'commerceImg': '상권',
                };
                const allTags = ['전체', ...Array.from(new Set(report.images.map(img => img.locationTag || '기타')))];
                return (
                  <div className={`${inline ? 'bg-surface' : 'bg-surface/60 dark:bg-surface/35 backdrop-blur-md'} rounded-3xl p-6 md:p-8 shadow-sm overflow-hidden relative`}>
                    <div className="absolute top-6 md:top-8 right-6 md:right-8 flex items-center gap-2 md:gap-3 z-10">
                      <span className="text-[13px] font-bold text-tertiary">{report.images.length}장</span>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsUploadModalOpen(true);
                        }}
                        className="text-[13px] font-bold text-[#057e77] dark:text-emerald-400 bg-emerald-50 dark:bg-[#042820] px-3 py-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-[#063b2f] transition-colors"
                      >
                        + 사진 추가
                      </button>
                    </div>
                    <details className="w-full overflow-hidden" open>
                      <summary className="text-[20px] font-bold text-primary flex items-center gap-2 mb-5 border-b border-border pb-3 cursor-pointer list-none pr-32">
                        <Camera size={20} className="text-[#057e77] dark:text-emerald-400"/>
                        우리 단지 갤러리
                      </summary>
                      <ApartmentGallery aptName={report.apartmentName} images={report.images} tags={allTags} tagLabels={IMAGE_TAG_LABELS} onImageClick={setFullscreenImage} />
                    </details>
                  </div>
                );
              })() : (
                <div className={`${inline ? 'bg-surface' : 'bg-surface/60 dark:bg-surface/35 backdrop-blur-md'} rounded-3xl p-6 md:p-8 shadow-sm overflow-hidden relative group`}>
                  <h2 className="text-[20px] font-bold text-primary flex items-center gap-2 mb-6 border-b border-border pb-3">
                    <Camera size={20} className="text-[#057e77] dark:text-emerald-400"/> 우리 단지 갤러리
                  </h2>
                  <div className="w-full relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#f8f9fa] to-[#f2f4f6] border border-border/40 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.06)] p-8 md:p-12 flex flex-col items-center justify-center min-h-[300px]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#057e77] mix-blend-multiply filter blur-[80px] opacity-[0.03] rounded-full transform translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600 mix-blend-multiply filter blur-[80px] opacity-[0.03] rounded-full transform -translate-x-1/2 translate-y-1/2" />
                    <div className="w-16 h-16 bg-surface shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-border/40 dark:border-white/10 rounded-[20px] flex items-center justify-center mb-5 relative z-10">
                      <Camera className="text-[#057e77] dark:text-emerald-400" size={32} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-[18px] md:text-[20px] font-extrabold text-primary tracking-tight mb-2 relative z-10 text-center break-keep">
                      데이터가 담지 못하는 우리 단지의 진정한 가치
                    </h3>
                    <p className="text-[14px] md:text-[15px] text-secondary font-medium leading-relaxed mb-8 max-w-md relative z-10 text-center break-keep">
                      매수자의 첫인상을 결정하는 대표 이미지 1장.<br className="hidden md:block" />
                      입주민의 시선으로 <strong className="text-[#057e77] dark:text-emerald-400">우리 단지의 품격</strong>을 직접 완성해 주세요.
                    </p>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsUploadModalOpen(true);
                      }}
                      className="group relative z-10 flex items-center gap-2 bg-primary text-surface text-[15px] font-bold px-6 py-3.5 rounded-xl hover:bg-[#057e77] hover:shadow-[0_4px_12px_rgba(0,130,98,0.3)] transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
                    >
                      <span>우리 단지 첫 번째 앰배서더 되기</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#057e77] dark:bg-emerald-400 group-hover:bg-surface animate-pulse" />
                    </button>
                    <p className="text-[12px] text-tertiary font-medium mt-5 relative z-10 text-center">
                      * 고화질 사진이 풍부한 단지는 <span className="text-primary font-bold">인기 단지 탐색 상단에 우선 노출</span>됩니다.
                    </p>
                  </div>
                </div>
              )}

              {/* Scouting Report Detail */}
              <ErrorBoundary name="스카우팅 리포트 상세">
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
        <div className="w-full my-6" data-testid="apartment-modal-ad-slot">
          <AdSlot format="banner" className="w-full" />
        </div>

        {/* Kakao Share CTA */}
        <div className="flex flex-col gap-6 mt-8 mb-4">
          <button 
            onClick={handleKakaoShare}
            disabled={isSharing}
            className="w-full bg-[#FEE500] hover:bg-[#FEE500]/90 text-[#3A1D1D] rounded-[20px] p-5 flex flex-col sm:flex-row items-center justify-between gap-4 cursor-pointer transition-all duration-300 ease-out hover:scale-[1.01] active:scale-[0.99] shadow-[0_12px_40px_rgba(0,0,0,0.06)] group border-none text-left disabled:opacity-85"
          >
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-1">
              <span className="text-[13px] font-bold opacity-80 uppercase tracking-widest">
                {isSharing ? '공유 이미지 카드 준비 중...' : '가장 빠른 동탄 소식'}
              </span>
              <span className="text-[16px] sm:text-[18px] font-extrabold tracking-tight">
                {isSharing ? '잠시만 기다려주시면 카카오톡 전송 창이 열립니다' : '이 아파트 분석 리포트 카톡으로 지인에게 공유하기'}
              </span>
            </div>
            <div className="w-12 h-12 bg-white/40 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
              {isSharing ? (
                <div className="w-5 h-5 border-2 border-[#3A1D1D] border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M12 3c-5.523 0-10 3.492-10 7.8 0 2.766 1.83 5.184 4.542 6.446l-1.155 4.225c-.092.336.262.593.553.424l4.908-3.23c1.127.184 2.308.283 3.528.283 5.523 0 10-3.492 10-7.8s-4.477-7.8-10-7.8z" />
                </svg>
              )}
            </div>
          </button>
        </div>
      </div>
    </>
  );

  if (inline) {
    return (
      <div className="w-full flex flex-col">
        {content}
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

  return createPortal(
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center p-0 md:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={handleModalClose}
    >
      <div 
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full h-full md:h-[94vh] md:max-w-[1275px] bg-surface rounded-none md:rounded-3xl shadow-2xl overflow-y-auto overflow-x-hidden flex flex-col border border-border/80 outline-none"
      >
        <button
          onClick={handleModalClose}
          aria-label="닫기"
          className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-surface/80 hover:bg-surface text-secondary hover:text-primary border border-border shadow-sm transition-all cursor-pointer outline-none"
        >
          <X size={20} />
        </button>


        {content}

        {showScrollTop && (
          <button
            onClick={() => modalRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-50 p-3.5 rounded-full bg-[#057e77] text-white shadow-xl hover:bg-[#046660] transition-all active:scale-95 cursor-pointer border-none"
            aria-label="맨 위로 이동"
          >
            <ArrowLeft size={20} className="rotate-90" />
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
    </div>,
    document.getElementById('modal-root') || document.body
  );
});

export default ApartmentModal;
