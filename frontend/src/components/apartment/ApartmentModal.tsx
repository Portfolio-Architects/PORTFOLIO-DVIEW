'use client';

import React, { useState, useRef, useMemo, useEffect, useCallback, useDeferredValue } from 'react';
import {
  X, Camera, Building, Info, Shield, ShieldAlert, ChevronDown, ArrowLeft, Download, Check,
  Crown, ChevronRight, Calculator, Bell
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { normalize84Price } from '@/lib/utils/valuation';
import { normalizeAptName, getDisplayAptName, findTypeMapEntry, isSameApartment } from '@/lib/utils/apartmentMapping';
import type { CommentData, FieldReportData } from '@/lib/DashboardFacade';
import type { User } from 'firebase/auth';
import { doc, updateDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { throttle } from '@/lib/utils/firestoreThrottle';
import { usePreventElasticBounce } from '@/hooks/usePreventElasticBounce';
import { createPortal } from 'react-dom';
import { postConverter } from '@/lib/utils/firestoreConverters';
import { safeReload } from '@/lib/utils/safeReload';
import { TransactionListSchema } from '@/lib/validation/facade.schemas';
import { logger } from '@/lib/services/logger';
import { useApartmentDetails } from '@/hooks/useApartmentDetails';
import { useComments } from '@/hooks/useComments';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useSettingsValues } from '@/lib/contexts/SettingsContext';
import { shareAptToKakao, copyAptSummaryToClipboard } from '@/lib/utils/kakaoShare';
import { trackEvent } from '@/lib/utils/analytics';
import { safeHtml2canvasPro } from '@/lib/utils/html2canvasPatch';
import { usePWA } from '@/components/pwa/PWAProvider';
import PushSubscriptionModal from '@/components/pwa/PushSubscriptionModal';
import { getBrandMultiplier, calculatePremiumScores, calculateEducationScore, calculateInfraScore } from '@/lib/utils/scoring';
import { calculateDynamicDCF } from '@/lib/utils/valuationEngine';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { ApartmentGallery } from '@/components/apartment-modal/ApartmentGallery';

import { useApartmentModalState } from './hooks/useApartmentModalState';
import { ApartmentModalHeader } from './ApartmentModalHeader';
import { ApartmentModalTransactionsTable } from './ApartmentModalTransactionsTable';
import { ApartmentModalKakaoCard } from './ApartmentModalKakaoCard';

const CommentSkeleton = () => (
  <div className="w-full flex flex-col gap-4 mt-4 h-[250px]">
    <div className="h-6 rounded-xl w-32 mb-2 animate-shimmer" />
    <div className="flex gap-3">
      <div className="flex-1 h-12 rounded-xl animate-shimmer" />
      <div className="w-16 h-12 rounded-xl animate-shimmer" />
    </div>
    <div className="w-full flex-1 rounded-[20px] border border-border/40 animate-shimmer" />
  </div>
);

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
      <div className="h-6 w-32 rounded bg-neutral-250 dark:bg-zinc-800 animate-shimmer" />
      <div className="flex gap-2">
        <div className="h-8 w-16 rounded-lg bg-neutral-200 dark:bg-zinc-800 animate-shimmer" />
        <div className="h-8 w-16 rounded-lg bg-neutral-200 dark:bg-zinc-800 animate-shimmer" />
      </div>
    </div>
    <div className="flex-1 w-full rounded-[20px] relative overflow-hidden flex items-end p-4 border border-border/20">
      <div className="w-full h-full flex items-end justify-between gap-2">
        {[30, 45, 60, 40, 75, 50, 90, 65, 80, 55, 70, 85].map((h, i) => (
          <div 
            key={i} 
            style={{ height: `${h}%` }} 
            className="flex-1 rounded-t bg-neutral-200/50 dark:bg-zinc-800/40 animate-shimmer" 
          />
        ))}
      </div>
    </div>
  </div>
);

const CommentSection = dynamic(() => import('@/components/CommentSection').catch(err => {
  logger.warn('ApartmentModal.dynamic', 'CommentSection Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('CommentSection');
  return { default: () => null };
}), { 
  ssr: false, 
  loading: () => <CommentSkeleton /> 
});

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
  comments: rawCommentsProp,
  commentInput: rawCommentInputProp,
  onCommentChange: rawOnCommentChangeProp,
  onSubmitComment: rawOnSubmitCommentProp,
  onDeleteComment: rawOnDeleteCommentProp,
  user,
  transactions: rawTransactionsProp,
  typeMap,
  isAdmin,
  inline,
  txSummary: txSummaryProp,
  loadAllTransactions: loadAllTransactionsProp,
  onRequestLogin,
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
  userFavorites,
  onToggleFavorite,
}: { 
  report: FieldReportData;
  onClose: () => void;
  comments?: CommentData[];
  commentInput?: string;
  onCommentChange?: (text: string) => void;
  onSubmitComment?: () => void;
  onDeleteComment?: (commentId: string, text: string) => void;
  user: User | null;
  transactions?: TransactionRecord[];
  typeMap: Record<string, Record<string, { typeM2: string; typePyeong: string }>>;
  isLoadingDetail?: boolean;
  isAdmin?: boolean;
  inline?: boolean;
  txSummary?: import('@/lib/types/transaction').AptTxSummary;
  loadAllTransactions?: () => void;
  onRequestLogin?: (message: string) => void;
  onOpenCompare?: (aptName: string) => void;
  onOpenJeonseSafety?: (aptName: string) => void;
  onOpenMortgage?: (aptName: string) => void;
  onOpenTaxCalculator?: (aptName: string) => void;
  onOpenSellTimingCalculator?: (aptName: string) => void;
  isTxLoading?: boolean;
  sheetApartments?: Record<string, import('@/lib/dong-apartments').DongApartment[]>;
  nameMapping?: Record<string, string>;
  txSummaryData?: Record<string, import('@/lib/types/transaction').AptTxSummary>;
  locationScores?: Record<string, import('@/lib/types/transaction').LocationScoreItem>;
  userFavorites?: Set<string>;
  onToggleFavorite?: (aptName: string) => void;
}) {
  useSwipeNavigation({ onBack: onClose });

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

  const { 
    commentsData, 
    commentInput: commentsInputMap, 
    setCommentInput: setCommentsInputMap, 
    handleSubmitComment, 
    handleDeleteComment 
  } = useComments(
    rawReport, 
    fullReportData, 
    user, 
    () => { if (onRequestLogin) onRequestLogin('댓글을 작성하려면 로그인이 필요합니다.'); }
  );

  const activeReportId = report.id;
  const modalComments = commentsData[activeReportId] || [];
  const modalCommentInput = commentsInputMap[activeReportId] || '';

  const comments = rawCommentsProp || modalComments;
  const commentInput = rawCommentInputProp !== undefined ? rawCommentInputProp : modalCommentInput;
  const onCommentChange = rawOnCommentChangeProp || ((text: string) => setCommentsInputMap(prev => ({ ...prev, [activeReportId]: text })));
  const onSubmitComment = rawOnSubmitCommentProp || (() => { handleSubmitComment(activeReportId); });
  const onDeleteComment = rawOnDeleteCommentProp || ((commentId: string, text: string) => { handleDeleteComment(activeReportId, commentId, text); });

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
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [chartType, setChartType] = useState<'sale' | 'jeonse'>('sale');
  const [filterOutliers, setFilterOutliers] = useState(false);
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('전체');

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

  const scrollToSection = useCallback((sectionId: string) => {
    if (!modalRef.current) return;
    const el = modalRef.current.querySelector(`#${sectionId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveTab(sectionId);
    }
  }, [setActiveTab]);

  const handleScroll = useCallback(() => {
    if (!modalRef.current) return;
    if (modalRef.current.scrollTop > 400) {
      setShowScrollTop(true);
    } else {
      setShowScrollTop(false);
    }
    const sections = ['sec-comments', 'sec-summary', 'sec-infra-metrics', 'sec-education', 'sec-valuation', 'sec-jeonse-safety', 'sec-photos'];
    let current = 'sec-comments';
    for (const id of sections) {
      if (id === 'sec-comments') continue;
      const el = modalRef.current.querySelector(`#${id}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        const containerRect = modalRef.current.getBoundingClientRect();
        if (rect.top - containerRect.top < 300) {
          current = id;
        }
      }
    }
    setActiveTab(prev => (prev !== current ? current : prev));
  }, [setActiveTab]);

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
    showToast("📸 요약 카드 이미지를 생성하고 있습니다...");
    
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
        
        showToast("🎉 인포그래픽 요약 카드가 이미지 파일로 저장되었습니다!");
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
      customDesc += `🏫 학군/육아 환경: 🌟 ${eduScoreInfo.score}점 (${eduScoreInfo.grade}등급) - ${eduScoreInfo.description.split(' (')[0]}\n`;
    }
    if (infraScoreInfo) {
      customDesc += `🚇 교통/생활 입지: 🛍️ ${infraScoreInfo.score}점 (${infraScoreInfo.grade}등급) - ${infraScoreInfo.description.split(' (')[0]}\n`;
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
      showToast("🎉 단톡방용 요약본 복사 완료!");
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
        showToast("🎉 학군·육아 분석 링크가 복사되었습니다!");
      });
    } else if (type === 'infra' && infraScoreInfo) {
      const grade = infraScoreInfo.grade;
      const score = infraScoreInfo.score;
      const shareUrl = `${baseUrl}/apartment/${encodeURIComponent(report.apartmentName)}?shareType=infra&grade=${grade}&score=${score}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast("🎉 입지·인프라 분석 링크가 복사되었습니다!");
      });
    }
  }, [report.metrics, report.apartmentName, eduScoreInfo, infraScoreInfo, showToast]);

  const isFavoritedModal = useMemo(() => {
    if (!userFavorites || !report.apartmentName) return false;
    const targetNorm = normalizeAptName(report.apartmentName);
    return Array.from(userFavorites).some(
      item => normalizeAptName(item) === targetNorm || isSameApartment(item, report.apartmentName, nameMapping)
    );
  }, [userFavorites, report.apartmentName, nameMapping]);

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
        isFavoritedModal={isFavoritedModal}
        onToggleFavorite={onToggleFavorite}
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
        renderTransactionSummaryMetrics={renderTransactionSummaryMetricsNode}
      />

      {/* Sticky Section Nav */}
      <nav className="sticky top-0 z-[60] bg-surface/95 backdrop-blur-md border-b border-border px-4 md:px-8 pt-[16px] md:pt-[20px] pb-0 shadow-sm shadow-[#191f28]/5">
        <div role="tablist" className="flex gap-6 overflow-x-auto scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden w-full relative">
          {(() => {
            const tabs = [
              { id: 'sec-comments', label: '아파트 이야기', show: true },
              { id: 'sec-summary', label: '단지 기본정보', show: true },
              { id: 'sec-infra-metrics', label: '단지 입지정보', show: !!report.metrics },
              { id: 'sec-education', label: '학군/육아 분석', show: !!report.metrics },
              { id: 'sec-valuation', label: '밸류에이션 분석', show: transactions.length > 0 },
              { id: 'sec-jeonse-safety', label: '전세 안전 진단', show: transactions.length > 0 },
              { id: 'sec-photos', label: '우리 단지 갤러리', show: true },
            ].filter(t => t.show);

            return tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => scrollToSection(tab.id)}
                  role="tab"
                  aria-selected={isActive}
                  className={`relative shrink-0 pb-[16px] md:pb-[20px] text-[14.5px] font-extrabold tracking-wider transition-all duration-300 ease-out hover:scale-[1.01] active:scale-[0.99] outline-none ${
                     isActive ? 'text-primary' : 'text-tertiary hover:text-primary'
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-[3px] bg-primary rounded-t-sm" />
                  )}
                </button>
              );
            });
          })()}
        </div>
      </nav>

      {/* Magazine Content Wrapper */}
      <div className={`${inline ? 'px-2 py-2 md:px-6 md:py-4' : 'px-2 py-2 md:px-3 md:py-3'} flex flex-col gap-8 w-full`}>
        {/* Comments Section */}
        <section id="sec-comments" className="scroll-mt-14 snap-start">
          <ErrorBoundary name="임장기 댓글">
            <LazyRender estimatedHeight={250}>
              <CommentSection
                comments={comments}
                commentInput={commentInput}
                onCommentChange={onCommentChange}
                onSubmitComment={onSubmitComment}
                user={user}
                isUnlocked={true}
                selectedCommentId={selectedCommentId || undefined}
                onRequestLogin={onRequestLogin}
                onDeleteComment={onDeleteComment}
              />
            </LazyRender>
          </ErrorBoundary>
        </section>

        {/* 1. Specs Section */}
        <div id="sec-summary" className="scroll-mt-14 snap-start">
          <ApartmentSpecsSection
            report={report}
            inline={inline}
            displayAptName={displayAptName}
          />
        </div>

        {isAnimationFinished ? (
          <>
            {/* Location & Infra Section */}
            <LazyRender estimatedHeight={350}>
              <InfraAnalysisSection
                report={report}
                inline={inline}
                copiedStatus={copiedStatus}
                handleShareSection={handleShareSection}
              />
            </LazyRender>

            {/* Education & Childcare Section */}
            <LazyRender estimatedHeight={350}>
              <EducationAnalysisSection
                report={report}
                inline={inline}
                copiedStatus={copiedStatus}
                handleShareSection={handleShareSection}
                displayAptName={displayAptName}
              />
            </LazyRender>

            {/* Valuation Analysis Section */}
            <section id="sec-valuation" className="mb-2 scroll-mt-14 scroll-mb-6 snap-start">
              <div className="relative w-full">
                <div>
                  <ErrorBoundary name="밸류에이션 분석">
                    <LazyRender estimatedHeight={400}>
                      <AdvancedValuationMetrics key={report.id || report.apartmentName} report={report} transactions={transactions} />
                    </LazyRender>
                  </ErrorBoundary>
                  <BuyOrWaitVote aptName={report.apartmentName} valuationStatus={valuation.status} valuationAmount={valuation.amount} />
                </div>
              </div>

              {onOpenTaxCalculator && (
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => onOpenTaxCalculator(report.apartmentName)}
                    onMouseEnter={preloadCalculators}
                    onFocus={preloadCalculators}
                    className="w-full max-w-md py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-extrabold text-[14px] rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer border-none"
                  >
                    <Calculator size={16} />
                    <span>나의 예상 취득세 및 복비 계산하기</span>
                  </button>
                </div>
              )}

              {onOpenSellTimingCalculator && (
                <div className="mt-3 flex justify-center">
                  <button
                    onClick={() => onOpenSellTimingCalculator(report.apartmentName)}
                    onMouseEnter={preloadCalculators}
                    onFocus={preloadCalculators}
                    className="w-full max-w-md py-3.5 bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white font-extrabold text-[14px] rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer border-none"
                  >
                    <Calculator size={16} />
                    <span>지금 팔면 호구일까? AI 매도 진단하기</span>
                  </button>
                </div>
              )}
            </section>

            {/* Jeonse Safety Section */}
            {jeonseSafetyData && (
              <section id="sec-jeonse-safety" className={`${inline ? 'bg-surface' : 'bg-surface/60 dark:bg-surface/35 backdrop-blur-md'} rounded-3xl p-6 md:p-8 shadow-sm border border-border scroll-mt-14 snap-start`}>
                <div className="flex flex-col w-full">
                  <h2 className="text-[18px] font-bold text-primary flex items-center gap-2 mb-6 border-b border-border pb-3">
                    <Shield size={18} className="text-[#ea6100]"/> 전세 안전성 진단 리포트
                  </h2>
                  <div className="relative w-full">
                    <div>
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
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Photo Gallery */}
            {report.images && report.images.length > 0 ? (() => {
              const IMAGE_TAG_LABELS: Record<string, string> = {
                'gateImg': '정문', 'landscapeImg': '조경', 'parkingImg': '주차장',
                'maintenanceImg': '공용부', 'communityImg': '커뮤니티', 'schoolImg': '통학로', 'commerceImg': '상권',
              };
              const allTags = ['전체', ...Array.from(new Set(report.images.map(img => img.locationTag || '기타')))];
              return (
                <section id="sec-photos" className={`${inline ? 'bg-surface' : 'bg-surface/60 dark:bg-surface/35 backdrop-blur-md'} rounded-3xl p-6 md:p-8 shadow-sm scroll-mt-14 overflow-hidden relative snap-start`}>
                  <div className="absolute top-6 md:top-8 right-6 md:right-8 flex items-center gap-2 md:gap-3 z-10">
                    <span className="text-[13px] font-bold text-tertiary">{report.images.length}장</span>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsUploadModalOpen(true);
                      }}
                      className="text-[13px] font-bold text-[#c44d00] dark:text-[#ea6100] bg-[#e6f3f0] dark:bg-[#042820] px-3 py-1.5 rounded-lg hover:bg-[#ccebe3] dark:hover:bg-[#063b2f] transition-colors"
                    >
                      + 사진 추가
                    </button>
                  </div>
                  <details className="w-full overflow-hidden" open>
                    <summary className="text-[20px] font-bold text-primary flex items-center gap-2 mb-5 border-b border-border pb-3 cursor-pointer list-none pr-32">
                      <Camera size={20} className="text-[#c44d00] dark:text-[#ea6100]"/>
                      우리 단지 갤러리
                    </summary>
                    <ApartmentGallery aptName={report.apartmentName} images={report.images} tags={allTags} tagLabels={IMAGE_TAG_LABELS} onImageClick={setFullscreenImage} />
                  </details>
                </section>
              );
            })() : (
              <section id="sec-photos" className={`${inline ? 'bg-surface' : 'bg-surface/60 dark:bg-surface/35 backdrop-blur-md'} rounded-3xl p-6 md:p-8 shadow-sm scroll-mt-14 overflow-hidden relative group snap-start`}>
                <h2 className="text-[20px] font-bold text-primary flex items-center gap-2 mb-6 border-b border-border pb-3">
                  <Camera size={20} className="text-[#c44d00] dark:text-[#ea6100]"/> 우리 단지 갤러리
                </h2>
                <div className="w-full relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#f8f9fa] to-[#f2f4f6] border border-border/40 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.06)] p-8 md:p-12 flex flex-col items-center justify-center min-h-[300px]">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#c44d00] mix-blend-multiply filter blur-[80px] opacity-[0.03] rounded-full transform translate-x-1/2 -translate-y-1/2" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#7c3aed] mix-blend-multiply filter blur-[80px] opacity-[0.03] rounded-full transform -translate-x-1/2 translate-y-1/2" />
                  <div className="w-16 h-16 bg-surface shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-border/40 dark:border-white/10 rounded-[20px] flex items-center justify-center mb-5 relative z-10">
                    <Camera className="text-[#c44d00] dark:text-[#ea6100]" size={32} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-[18px] md:text-[20px] font-extrabold text-primary tracking-tight mb-2 relative z-10 text-center break-keep">
                    데이터가 담지 못하는 우리 단지의 진정한 가치
                  </h3>
                  <p className="text-[14px] md:text-[15px] text-secondary font-medium leading-relaxed mb-8 max-w-md relative z-10 text-center break-keep">
                    매수자의 첫인상을 결정하는 대표 이미지 1장.<br className="hidden md:block" />
                    입주민의 시선으로 <strong className="text-[#c44d00] dark:text-[#ea6100]">우리 단지의 품격</strong>을 직접 완성해 주세요.
                  </p>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsUploadModalOpen(true);
                    }}
                    className="group relative z-10 flex items-center gap-2 bg-primary text-surface text-[15px] font-bold px-6 py-3.5 rounded-xl hover:bg-[#c44d00] hover:shadow-[0_4px_12px_rgba(0,130,98,0.3)] transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    <span>우리 단지 첫 번째 앰배서더 되기</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c44d00] dark:bg-[#ea6100] group-hover:bg-surface animate-pulse" />
                  </button>
                  <p className="text-[12px] text-tertiary font-medium mt-5 relative z-10 text-center">
                    * 고화질 사진이 풍부한 단지는 <span className="text-primary font-bold">인기 단지 탐색 상단에 우선 노출</span>됩니다.
                  </p>
                </div>
              </section>
            )}

            <ScoutingReportDetailSection report={report} inline={inline} />

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
          </>
        ) : (
          <div className="w-full flex flex-col gap-10">
            <InfraAnalysisSkeleton />
            {report.metrics && <EducationAnalysisSkeleton />}
            {transactions.length > 0 && <AdvancedValuationSkeleton />}
            {transactions.length > 0 && <JeonseSafetySkeleton />}
            <ScoutingReportDetailSkeleton />
          </div>
        )}
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
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full h-full md:h-[94vh] md:max-w-[1275px] bg-surface rounded-none md:rounded-3xl shadow-2xl overflow-y-auto overflow-x-hidden flex flex-col border border-border/80 outline-none"
      >
        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-surface/80 hover:bg-surface text-secondary hover:text-primary border border-border shadow-sm transition-all cursor-pointer outline-none"
        >
          <X size={20} />
        </button>

        {content}

        {showScrollTop && (
          <button
            onClick={() => modalRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-50 p-3.5 rounded-full bg-[#ea6100] text-white shadow-xl hover:bg-[#ea6100]/90 transition-all active:scale-95 cursor-pointer border-none"
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
