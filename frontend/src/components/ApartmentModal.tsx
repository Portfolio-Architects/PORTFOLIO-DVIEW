'use client';

import React, { useState, useRef, useMemo, useEffect, useCallback, useDeferredValue } from 'react';
import {
  MapPin, X, Camera,
  Building, Info, Shield, ShieldAlert, Radar, ChevronDown, ArrowLeft, Download, Share, Check,
  Crown, ChevronRight, GraduationCap, Calculator, MessageSquare, Bell
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { normalize84Price } from '@/lib/utils/valuation';
import { normalizeAptName, getDisplayAptName, findTypeMapEntry } from '@/lib/utils/apartmentMapping';
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

const CommentSkeleton = () => (
  <div className="w-full flex flex-col gap-4 mt-4">
    <div className="h-6 rounded-xl w-32 mb-2 animate-shimmer" />
    <div className="flex gap-3">
      <div className="flex-1 h-12 rounded-xl animate-shimmer" />
      <div className="w-16 h-12 rounded-xl animate-shimmer" />
    </div>
    <div className="w-full h-24 rounded-2xl border border-border/40 animate-shimmer" />
  </div>
);

const JeonseSafetySkeleton = () => (
  <div className="w-full flex flex-col gap-4 mt-4">
    <div className="h-6 rounded-xl w-40 mb-2 animate-shimmer" />
    <div className="w-full h-36 rounded-2xl border border-border/40 animate-shimmer" />
  </div>
);

const EducationAnalysisSkeleton = () => (
  <div className="w-full flex flex-col gap-4 mt-4">
    <div className="h-6 rounded-xl w-40 mb-2 animate-shimmer" />
    <div className="w-full h-40 rounded-2xl border border-border/40 animate-shimmer" />
  </div>
);

const InfraAnalysisSkeleton = () => (
  <div className="w-full flex flex-col gap-4 mt-4">
    <div className="h-6 rounded-xl w-40 mb-2 animate-shimmer" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="h-32 rounded-2xl border border-border/40 animate-shimmer" />
      <div className="h-32 rounded-2xl border border-border/40 animate-shimmer" />
    </div>
  </div>
);

const ScoutingReportDetailSkeleton = () => (
  <div className="w-full flex flex-col gap-4 mt-4">
    <div className="h-6 rounded-xl w-40 mb-2 animate-shimmer" />
    <div className="w-full h-36 rounded-2xl border border-border/40 animate-shimmer" />
  </div>
);

const AdvancedValuationSkeleton = () => (
  <div className="w-full flex flex-col gap-4 mt-4">
    <div className="h-6 rounded-xl w-40 mb-2 animate-shimmer" />
    <div className="w-full h-48 rounded-2xl border border-border/40 animate-shimmer" />
  </div>
);

const AnchorTenantSkeleton = () => (
  <div className="w-full h-24 rounded-2xl border border-border/40 animate-shimmer mt-4" />
);

const TransactionTableSkeleton = () => (
  <div className="w-full h-[401px] md:h-full flex flex-col gap-4 p-5 border border-border/40 rounded-2xl">
    <div className="h-6 w-28 rounded-xl animate-shimmer mb-2" />
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
  <div className="w-full h-[549px] md:h-[578px] flex flex-col gap-6 p-6 border border-border/40 rounded-2xl">
    <div className="flex justify-between items-center">
      <div className="h-6 w-32 rounded bg-neutral-250 dark:bg-zinc-800 animate-shimmer" />
      <div className="flex gap-2">
        <div className="h-8 w-16 rounded-lg bg-neutral-200 dark:bg-zinc-800 animate-shimmer" />
        <div className="h-8 w-16 rounded-lg bg-neutral-200 dark:bg-zinc-800 animate-shimmer" />
      </div>
    </div>
    <div className="flex-1 w-full rounded-xl relative overflow-hidden flex items-end p-4 border border-border/20">
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
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import SegmentedControl from './ui/SegmentedControl';
import { ApartmentGallery } from './apartment-modal/ApartmentGallery';
import { TransactionTable } from './apartment-modal/TransactionTable';

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
import { TransactionSummaryMetrics } from './apartment-modal/TransactionSummaryMetrics';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
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
import { useSettingsValues } from '@/lib/contexts/SettingsContext';
import { shareAptToKakao, copyAptSummaryToClipboard } from '@/lib/utils/kakaoShare';
import { trackEvent } from '@/lib/utils/analytics';
const BuyOrWaitVote = dynamic(() => import('@/components/apartment-modal/BuyOrWaitVote').catch(err => {
  logger.warn('ApartmentModal.dynamic', 'BuyOrWaitVote Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('BuyOrWaitVote');
  return { default: () => null };
}), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-[142px] mt-6 rounded-2xl border border-border/40 animate-shimmer" />
  )
});
import { safeHtml2canvasPro } from '@/lib/utils/html2canvasPatch';
import { usePWA } from '@/components/pwa/PWAProvider';
import PushSubscriptionModal from './pwa/PushSubscriptionModal';
import LocalEducationAd from '@/components/LocalEducationAd';
import ContextualB2BAdBanner from './apartment-modal/ContextualB2BAdBanner';

import { getBrandMultiplier, calculatePremiumScores, calculateEducationScore, calculateInfraScore } from '@/lib/utils/scoring';
import { calculateDynamicDCF } from '@/lib/utils/valuationEngine';

import ApartmentSpecsSection from './apartment-modal/ApartmentSpecsSection';
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
const AnchorTenantCard = dynamic(() => import('@/components/consumer/AnchorTenantCard').catch(err => {
  logger.warn('ApartmentModal.dynamic', 'AnchorTenantCard Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('AnchorTenantCard');
  return { default: () => null };
}), { 
  ssr: false,
  loading: () => <AnchorTenantSkeleton />
});
import { NativeAdPlaceholder } from '@/components/ui/NativeAdPlaceholder';

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

// ── LAZY RENDER WRAPPER FOR PERFORMANCE OPTIMIZATION ──
// Defers rendering of heavy components below the fold until they are close to the viewport.
// Prevents thread-blocking (page freeze) when mounting the large ApartmentModal.
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
      { rootMargin: '250px' } // 250px before entering viewport
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
          className="w-full border border-border/40 rounded-2xl animate-shimmer flex items-center justify-center" 
          style={{ height: `${estimatedHeight}px` }}
        >
          <span className="text-tertiary text-[12px] font-bold">콘텐츠 구성 중...</span>
        </div>
      )}
    </div>
  );
});


// Removed inline ViralPaywallGate, imported from external file.

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

const FieldReportModal = React.memo(function FieldReportModal({ 
  report, 
  onClose,
  comments,
  commentInput,
  onCommentChange,
  onSubmitComment,
  user,
  transactions: rawTransactions,
  typeMap,
  isAdmin,
  inline,
  txSummary,
  onOpenAdModal,
  onOpenConsumerAdModal,
  loadAllTransactions,
  onRequestLogin,
  onOpenCompare,
  onOpenJeonseSafety,
  onOpenMortgage,
  onOpenTaxCalculator,
  onOpenSellTimingCalculator,
  isTxLoading
}: { 
  report: FieldReportData;
  onClose: () => void;
  comments: CommentData[];
  commentInput: string;
  onCommentChange: (text: string) => void;
  onSubmitComment: () => void;
  user: User | null;
  transactions: TransactionRecord[];
  typeMap: Record<string, Record<string, { typeM2: string; typePyeong: string }>>;
  isLoadingDetail?: boolean;
  isAdmin?: boolean;
  inline?: boolean;
  txSummary?: any;
  onOpenAdModal?: () => void;
  onOpenConsumerAdModal?: (adType: 'insurance' | 'interior' | 'academy' | 'cleaning', adTitle: string) => void;
  loadAllTransactions?: () => void;
  onRequestLogin?: (message: string) => void;
  onOpenCompare?: (aptName: string) => void;
  onOpenJeonseSafety?: (aptName: string) => void;
  onOpenMortgage?: (aptName: string) => void;
  onOpenTaxCalculator?: (aptName: string) => void;
  onOpenSellTimingCalculator?: (aptName: string) => void;
  isTxLoading?: boolean;
}) {
  useSwipeNavigation({ onBack: onClose });
  const { areaUnit, setAreaUnit } = useSettingsValues();
  const { showToast } = usePWA();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const mountedRef = useRef(true);
  const [isAnimationFinished, setIsAnimationFinished] = useState(false);
  const displayAptName = getDisplayAptName(report.apartmentName);

  const [calculatedTransactions, setCalculatedTransactions] = useState<EnrichedTransaction[]>([]);
  const [calculatedValuation, setCalculatedValuation] = useState<CalculatedValuation>({ status: 'fair', amount: '0', ratio: 0, priceStr: '0' });
  const [calculatedJeonseSafety, setCalculatedJeonseSafety] = useState<CalculatedJeonseSafety | null>(null);
  const [calculatedAreaFilterChips, setCalculatedAreaFilterChips] = useState<string[]>(['전체']);

  // 3대 입지 및 교육 스코어 연산 결과 useMemo로 캐싱하여 불필요한 재계산 오버헤드 차단
  const eduScoreInfo = useMemo(() => {
    if (!isAnimationFinished) return null;
    return report.metrics ? calculateEducationScore(report.metrics) : null;
  }, [report.metrics, isAnimationFinished]);

  const infraScoreInfo = useMemo(() => {
    if (!isAnimationFinished) return null;
    return report.metrics ? calculateInfraScore(report.metrics) : null;
  }, [report.metrics, isAnimationFinished]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (mounted) {
      const timer = setTimeout(() => {
        setIsAnimationFinished(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [mounted]);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('sec-comments');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);
  const copiedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeTabTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shareActionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
        copiedTimeoutRef.current = null;
      }
      if (activeTabTimeoutRef.current) {
        clearTimeout(activeTabTimeoutRef.current);
        activeTabTimeoutRef.current = null;
      }
      if (shareActionTimeoutRef.current) {
        clearTimeout(shareActionTimeoutRef.current);
        shareActionTimeoutRef.current = null;
      }
    };
  }, []);

  // Track activeTab switches
  useEffect(() => {
    if (mounted && report?.apartmentName) {
      trackEvent('apt_tab_switch', {
        apt_name: report.apartmentName,
        tab_name: activeTab
      });
    }
  }, [activeTab, mounted, report?.apartmentName]);

  // Track photo upload request modal opens
  useEffect(() => {
    if (isUploadModalOpen && report?.apartmentName) {
      trackEvent('request_photo_upload', { apt_name: report.apartmentName });
    }
  }, [isUploadModalOpen, report?.apartmentName]);

  // Preload heavy sub-components of ApartmentModal to prevent ChunkLoadErrors on scroll
  useEffect(() => {
    if (!isAnimationFinished) return; // Delay component preloading until slide-in animation is fully complete

    let active = true;
    let idleId: number | null = null;
    let timerId: NodeJS.Timeout | null = null;

    const preloadAptModalChunks = () => {
      if (!active) return;
      import('@/components/CommentSection').catch(() => {});
      import('./apartment-modal/ViralPaywallGate').catch(() => {});
      import('./apartment-modal/JeonseSafetyReport').catch(() => {});
      import('./apartment-modal/TransactionChartSection').catch(() => {});
      import('./apartment-modal/PhotoUploadModal').catch(() => {});
      import('./apartment-modal/BuyOrWaitVote').catch(() => {});
      import('./apartment-modal/EducationAnalysisSection').catch(() => {});
      import('./apartment-modal/InfraAnalysisSection').catch(() => {});
      import('./apartment-modal/ScoutingReportDetailSection').catch(() => {});
      import('@/components/consumer/AdvancedValuationMetrics').catch(() => {});
      import('@/components/consumer/AnchorTenantCard').catch(() => {});
    };

    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      if ('requestIdleCallback' in window) {
        idleId = (window as any).requestIdleCallback(preloadAptModalChunks, { timeout: 2000 });
      } else {
        timerId = setTimeout(preloadAptModalChunks, 1000);
      }
    }

    return () => {
      active = false;
      if (idleId !== null && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleId);
      }
      if (timerId !== null) {
        clearTimeout(timerId);
      }
    };
  }, [isAnimationFinished]);
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('전체');
  const deferredAreaFilter = useDeferredValue(selectedAreaFilter);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  // 금융/분석 툴 드롭다운 상태
  const [isToolDropdownOpen, setIsToolDropdownOpen] = useState(false);
  const toolDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!isToolDropdownOpen) return;
    const handleClickOutside = (e: Event) => {
      if (toolDropdownRef.current && !toolDropdownRef.current.contains(e.target as Node)) {
        setIsToolDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isToolDropdownOpen]);

  const [selectedCommentId, setSelectedCommentId] = useState<string | undefined>(undefined);


  const getAutoShareTheme = (): 'value' | 'gap' | 'school' | 'deal' => {
    const saleTxs = transactions.filter(t => !t.dealType || (t.dealType !== '전세' && t.dealType !== '월세'));
    const jeonseTxs = transactions.filter(t => t.dealType === '전세');
    const latestSale = saleTxs[0];
    const latestJeonse = jeonseTxs[0];
    const price = latestSale ? latestSale.price : 0;
    const jeonsePrice = latestJeonse ? latestJeonse.deposit || 0 : 0;
    const ratio = price > 0 && jeonsePrice > 0 ? (jeonsePrice / price) * 100 : 0;

    if (ratio >= 65) {
      return 'gap';
    }

    if (report.metrics) {
      const edu = calculateEducationScore(report.metrics);
      if (edu.score >= 80) {
        return 'school';
      }
    }

    if (txSummary && txSummary.maxPrice > 0 && txSummary.avg1MPrice > 0) {
      const dropRatio = (txSummary.maxPrice - txSummary.avg1MPrice) / txSummary.maxPrice;
      if (dropRatio >= 0.1) {
        return 'deal';
      }
    }

    return 'value';
  };

  const getShareText = (
    theme: 'value' | 'gap' | 'school' | 'deal', 
    priceEok: number, 
    priceMan: number, 
    ratio: number,
    valStatus?: string,
    valAmount?: string
  ) => {
    const priceStr = priceMan > 0 ? `${priceEok}억 ${priceMan.toLocaleString()}만원` : `${priceEok}억원`;
    const aptName = displayAptName;

    // 만약 가치평가 결과가 있고 저평가/고평가 상태라면 'value' 테마 시 바이럴 텍스트 특화
    if (theme === 'value' && valStatus === 'undervalued' && valAmount) {
      return {
        title: `🔥 적정가 대비 ${valAmount} 저평가! ${aptName} 가치분석 리포트`,
        desc: `최근 실거래 ${priceStr}, 전세가율 ${ratio.toFixed(1)}%. DCF 엔진 진단 결과 메리트 있는 저평가 구간입니다. D-VIEW에서 정밀 보고서를 확인하세요.`
      };
    } else if (theme === 'value' && valStatus === 'overvalued' && valAmount) {
      return {
        title: `⚠️ 적정가 대비 ${valAmount} 고평가 주의! ${aptName} 가치분석`,
        desc: `최근 실거래 ${priceStr}, 전세가율 ${ratio.toFixed(1)}%. 현재 시세가 적정 가치를 다소 상회하고 있습니다. 매수 대기자라면 D-VIEW 분석 리포트를 확인해 보세요.`
      };
    }

    switch (theme) {
      case 'gap':
        return {
          title: `💸 실투자금 얼마? ${aptName} 갭투자 가치분석`,
          desc: `최근 실거래 ${priceStr}, 전세가율 ${ratio.toFixed(1)}%! 내 예산 맞춤 소액 갭투자 진단 결과를 D-VIEW에서 1초 만에 조회해보세요.`
        };
      case 'school':
        return {
          title: `🏫 동탄 맘카페 난리난 초품아/학세권 분석: ${aptName}`,
          desc: `안심 도보 통학로 및 학원가 셔틀 정보 탑재. 최근 실거래 ${priceStr}, 전세가율 ${ratio.toFixed(1)}%의 상세 분석을 지금 확인해보세요.`
        };
      case 'deal':
        return {
          title: `📉 고점 대비 얼마나 빠졌을까? ${aptName} 실거래 분석`,
          desc: `최근 실거래 ${priceStr} (전세가율 ${ratio.toFixed(1)}%). 역대 최고가 대비 하락폭과 급매물 매수 타이밍을 D-VIEW에서 체크하세요.`
        };
      case 'value':
      default:
        return {
          title: `🧐 지금 사면 호구될까? ${aptName} 가치분석 리포트`,
          desc: `최근 실거래 ${priceStr}, 전세가율 ${ratio.toFixed(1)}%\n적정 가치 평가(DCF) 엔진이 계산한 적정 매수가를 지금 D-VIEW에서 확인해보세요.`
        };
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const commentId = params.get('selectedCommentId');
      if (commentId) {
        setSelectedCommentId(commentId);
        const timer = setTimeout(() => {
          const el = document.getElementById(`comment-${commentId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [comments]);

  // 차트 매매/전월세 토글
  const [chartType, setChartType] = useState<'sale' | 'jeonse'>('sale');

  // 이상치 필터링 토글 상태 (CLS 방지 및 Hydration Safe)
  const [filterOutliers, setFilterOutliers] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('dview_filter_outliers');
        return saved !== 'false';
      } catch (e) {
        return true;
      }
    }
    return true;
  });
  const deferredFilterOutliers = useDeferredValue(filterOutliers);

  const handleToggleFilter = () => {
    setFilterOutliers(prev => {
      const next = !prev;
      try {
        localStorage.setItem('dview_filter_outliers', String(next));
      } catch (e) {
        logger.warn('ApartmentModal.localStorage', 'Failed to set dview_filter_outliers to localStorage', undefined, e);
      }
      return next;
    });
  };

  const [managerPost, setManagerPost] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    let active = true;
    if (!report.premiumContent || !report.apartmentName) return;

    const fetchPost = async () => {
      try {
        const shortName = report.apartmentName.replace(/\[.*?\]\s*/, '');
        let matchedId: string | null = null;
        let matchedTitle = '';

        // 1. Try querying by verifiedApartment directly (O(1) direct match)
        const qApt1 = query(
          collection(db, 'posts').withConverter(postConverter),
          where('category', '==', '매니저 임장기'),
          where('verifiedApartment', '==', report.apartmentName),
          limit(1)
        );
        let snap = await getDocs(qApt1);
        if (!active) return;
        if (!snap.empty) {
          matchedId = snap.docs[0].id;
          matchedTitle = snap.docs[0].data().title;
        }

        if (!matchedId) {
          const qApt2 = query(
            collection(db, 'posts').withConverter(postConverter),
            where('category', '==', '매니저 임장기'),
            where('verifiedApartment', '==', shortName),
            limit(1)
          );
          snap = await getDocs(qApt2);
          if (!active) return;
          if (!snap.empty) {
            matchedId = snap.docs[0].id;
            matchedTitle = snap.docs[0].data().title;
          }
        }

        // 2. Fallback: Query up to 20 manager posts without full scan
        if (!matchedId) {
          const q1 = query(
            collection(db, 'posts').withConverter(postConverter),
            where('category', '==', '매니저 임장기'),
            limit(20)
          );
          const snap1 = await getDocs(q1);
          if (!active) return;
          snap1.forEach((d) => {
            if (matchedId) return;
            const data = d.data();
            const t = data.title || '';
            const c = data.content || '';
            if (t.includes(shortName) || c.includes(shortName)) {
              matchedId = d.id;
              matchedTitle = t;
            }
          });
        }

        // 3. Try querying category "동탄 임장/분석" with verifiedApartment
        if (!matchedId) {
          const qApt3 = query(
            collection(db, 'posts').withConverter(postConverter),
            where('category', '==', '동탄 임장/분석'),
            where('verifiedApartment', '==', report.apartmentName),
            limit(1)
          );
          snap = await getDocs(qApt3);
          if (!active) return;
          if (!snap.empty) {
            matchedId = snap.docs[0].id;
            matchedTitle = snap.docs[0].data().title;
          }
        }

        if (!matchedId) {
          const qApt4 = query(
            collection(db, 'posts').withConverter(postConverter),
            where('category', '==', '동탄 임장/분석'),
            where('verifiedApartment', '==', shortName),
            limit(1)
          );
          snap = await getDocs(qApt4);
          if (!active) return;
          if (!snap.empty) {
            matchedId = snap.docs[0].id;
            matchedTitle = snap.docs[0].data().title;
          }
        }

        // 4. Fallback for lounge posts (limit 20) to prevent giant network payload
        if (!matchedId) {
          const q2 = query(
            collection(db, 'posts').withConverter(postConverter),
            where('category', '==', '동탄 임장/분석'),
            limit(20)
          );
          const snap2 = await getDocs(q2);
          if (!active) return;
          snap2.forEach((d) => {
            if (matchedId) return;
            const data = d.data();
            const t = data.title || '';
            const c = data.content || '';
            if (t.includes(shortName) || c.includes(shortName)) {
              matchedId = d.id;
              matchedTitle = t;
            }
          });
        }

        if (active) {
          setManagerPost(matchedId ? { id: matchedId, title: matchedTitle } : null);
        }
      } catch (err) {
        if (active) {
          logger.error('ApartmentModal.fetchPost', 'Failed to fetch matching manager post in modal', undefined, err);
        }
      }
    };

    fetchPost();
    return () => {
      active = false;
    };
  }, [report.apartmentName, report.premiumContent]);

  const parsedTitle = useMemo(() => {
    if (!report.premiumContent) return '';
    const match = report.premiumContent.match(/^#+\s+(.*)$/m);
    if (match) {
      return match[1].replace(/^[🏢👑]\s*/, '').trim();
    }
    return '';
  }, [report.premiumContent]);

  // ── 비동기 실거래가 분석 및 밸류에이션 계산 파이프라인 (requestIdleCallback 활용) ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isAnimationFinished || !rawTransactions || rawTransactions.length === 0) {
      setCalculatedTransactions([]);
      setCalculatedValuation({ status: 'fair', amount: '0', ratio: 0, priceStr: '0' });
      setCalculatedJeonseSafety(null);
      setCalculatedAreaFilterChips(['전체']);
      return;
    }

    let active = true;

    const runCalculation = () => {
      if (!active) return;

      // 1. safeTransactions (Zod 검증을 스킵한 초고속 필터링)
      const safeTxs = Array.isArray(rawTransactions)
        ? rawTransactions.filter(tx => tx && typeof tx === 'object' && tx.price !== undefined) as TransactionRecord[]
        : [];

      // 2. enrichedTransactions
      const enrichedTxs: EnrichedTransaction[] = safeTxs.map(tx => {
        const t = findTypeMapEntry(typeMap, tx.aptName, tx.area);
        const labelM2 = t ? t.typeM2 : `${tx.area}m²`;
        const labelPyeong = t ? (t.typePyeong || t.typeM2) : `${tx.areaPyeong || Math.round(tx.area * 0.3025)}평`;
        
        const calcPrice = (tx.dealType === '전세' || tx.dealType === '월세')
          ? (tx.deposit || 0) + Math.round((tx.monthlyRent || 0) * 12 / 0.055)
           : tx.price;
        
        const dateNum = parseInt(tx.contractYm + String(tx.contractDay || '01').padStart(2, '0'));

        return {
          ...tx,
          calculatedPrice: calcPrice,
          contractDateNum: dateNum,
          areaLabelM2: labelM2,
          areaLabelPyeong: labelPyeong
        };
      });

      // 3. transactions (이상치 필터링)
      const filterOutliersRolling = (txs: typeof enrichedTxs) => {
        const sortedTxs = [...txs].sort((a, b) => a.contractDateNum - b.contractDateNum);
        const byArea: Record<number, typeof enrichedTxs> = {};
        const sortedLen = sortedTxs.length;
        for (let i = 0; i < sortedLen; i++) {
          const t = sortedTxs[i];
          const a = Math.round(Number(t.area || 0));
          if (!byArea[a]) byArea[a] = [];
          byArea[a].push(t);
        }

        const validTxs: typeof enrichedTxs = [];
        const areas = Object.keys(byArea);
        const areasLen = areas.length;

        for (let aIdx = 0; aIdx < areasLen; aIdx++) {
          const group = byArea[Number(areas[aIdx])];
          const groupLen = group.length;

          for (let idx = 0; idx < groupLen; idx++) {
            const t = group[idx];
            const start = Math.max(0, idx - 5);
            const end = Math.min(groupLen, idx + 6);
            
            let sum = 0;
            let count = 0;
            for (let w = start; w < end; w++) {
              const item = group[w];
              if (w !== idx && item) {
                sum += item.calculatedPrice;
                count++;
              }
            }
            
            if (count < 3) {
              validTxs.push(t);
              continue;
            }
            
            const mean = sum / count;
            let sumSqDiff = 0;
            for (let w = start; w < end; w++) {
              const item = group[w];
              if (w !== idx && item) {
                sumSqDiff += Math.pow(item.calculatedPrice - mean, 2);
              }
            }
            const variance = sumSqDiff / count;
            const stdDev = Math.sqrt(variance);
            const p = t.calculatedPrice;
            
            if (p < mean) {
              if ((mean - p) <= 2 * Math.max(stdDev, mean * 0.05)) {
                validTxs.push(t);
              }
            } else {
              if ((p - mean) <= 3 * Math.max(stdDev, mean * 0.05)) {
                validTxs.push(t);
              }
            }
          }
        }
        return validTxs;
      };

      const saleTxs = enrichedTxs.filter(t => !t.dealType || (t.dealType !== '전세' && t.dealType !== '월세'));
      const jeonseTxs = enrichedTxs.filter(t => {
        if (t.dealType === '전세') return true;
        if (t.dealType === '월세' && t.monthlyRent && t.monthlyRent > 0) return true;
        return false;
      });

      const finalSale = deferredFilterOutliers ? filterOutliersRolling(saleTxs) : saleTxs;
      const finalJeonse = deferredFilterOutliers ? filterOutliersRolling(jeonseTxs) : jeonseTxs;
      const combined = [...finalSale, ...finalJeonse];
      const sortedCombined = combined.sort((a, b) => {
        if (a.contractDateNum !== b.contractDateNum) return b.contractDateNum - a.contractDateNum;
        return b.price - a.price;
      });

      if (!active) return;
      setCalculatedTransactions(sortedCombined);

      // 4. Valuation 계산
      const sales = sortedCombined.filter(t => t.dealType !== '전세' && t.dealType !== '월세');
      const rents = sortedCombined.filter(t => t.dealType === '전세' || t.dealType === '월세');

      const parseDateNum = (num: number) => {
        const y = Math.floor(num / 10000);
        const m = Math.floor((num % 10000) / 100) - 1;
        const d = num % 100;
        return new Date(y, m, d);
      };

      const saleBaseDate = sales.length > 0 ? parseDateNum(sales[0].contractDateNum || 0) : new Date();
      const rentBaseDate = rents.length > 0 ? parseDateNum(rents[0].contractDateNum || 0) : new Date();

      const oneMonthAgoSale = new Date(saleBaseDate.getFullYear(), saleBaseDate.getMonth() - 1, saleBaseDate.getDate());
      const oneMonthAgoSaleNum = oneMonthAgoSale.getFullYear() * 10000 + (oneMonthAgoSale.getMonth() + 1) * 100 + oneMonthAgoSale.getDate();
      const threeMonthsAgoSale = new Date(saleBaseDate.getFullYear(), saleBaseDate.getMonth() - 3, saleBaseDate.getDate());
      const threeMonthsAgoSaleNum = threeMonthsAgoSale.getFullYear() * 10000 + (threeMonthsAgoSale.getMonth() + 1) * 100 + threeMonthsAgoSale.getDate();

      const oneMonthAgoRent = new Date(rentBaseDate.getFullYear(), rentBaseDate.getMonth() - 1, rentBaseDate.getDate());
      const oneMonthAgoRentNum = oneMonthAgoRent.getFullYear() * 10000 + (oneMonthAgoRent.getMonth() + 1) * 100 + oneMonthAgoRent.getDate();
      const threeMonthsAgoRent = new Date(rentBaseDate.getFullYear(), rentBaseDate.getMonth() - 3, rentBaseDate.getDate());
      const threeMonthsAgoRentNum = threeMonthsAgoRent.getFullYear() * 10000 + (threeMonthsAgoRent.getMonth() + 1) * 100 + threeMonthsAgoRent.getDate();

      const recentSales1M = sales.filter(t => (t.contractDateNum || 0) >= oneMonthAgoSaleNum);
      const recentSales3M = sales.filter(t => (t.contractDateNum || 0) >= threeMonthsAgoSaleNum);
      const recentRents1M = rents.filter(t => (t.contractDateNum || 0) >= oneMonthAgoRentNum);
      const recentRents3M = rents.filter(t => (t.contractDateNum || 0) >= threeMonthsAgoRentNum);

      const avg3MSale = recentSales1M.length > 0
        ? Math.round(recentSales1M.reduce((sum, t) => sum + t.price, 0) / recentSales1M.length)
        : (recentSales3M.length > 0
          ? Math.round(recentSales3M.reduce((sum, t) => sum + t.price, 0) / recentSales3M.length)
          : (sales.length > 0 ? sales[0].price : 0));

      const getJeonseEq = (t: any) => t.calculatedPrice || t.price || 0;

      const avg3MRent = recentRents1M.length > 0
        ? Math.round(recentRents1M.reduce((sum, t) => sum + getJeonseEq(t), 0) / recentRents1M.length)
        : (recentRents3M.length > 0
          ? Math.round(recentRents3M.reduce((sum, t) => sum + getJeonseEq(t), 0) / recentRents3M.length)
          : (rents.length > 0 ? getJeonseEq(rents[0]) : 0));

      const jeonseRatio = (avg3MSale > 0 && avg3MRent > 0) ? (avg3MRent / avg3MSale) * 100 : 0;

      const macroConfig = {
        riskFreeRate: 3.25,
        fundingCost: 3.8,
        jeonseConversionRate: 0.055,
        baseInflationRate: 2.0,
        baseDate: ''
      };

      let conversionRateSpread = 0;
      if (report.metrics) {
        const m = report.metrics;
        if (m.distanceToSubway && m.distanceToSubway <= 500) {
          conversionRateSpread -= 0.005;
        } else if (m.distanceToSubway && m.distanceToSubway > 1200) {
          conversionRateSpread += 0.005;
        }

        const year = m.yearBuilt ? parseInt(String(m.yearBuilt).substring(0, 4)) : new Date().getFullYear();
        const age = !isNaN(year) ? new Date().getFullYear() - year + 1 : 10;
        const mu = getBrandMultiplier(m.brand || report.apartmentName || '');
        
        if (age <= 5 || mu >= 1.09) {
          conversionRateSpread -= 0.005;
        } else if (age > 15) {
          conversionRateSpread += 0.005;
        }
      }

      const dynamicConversionRate = Math.max(0.035, Math.min(0.065, macroConfig.jeonseConversionRate + conversionRateSpread));
      const dynamicMacroConfig = { ...macroConfig, jeonseConversionRate: dynamicConversionRate };

      let utilityScore = 50;
      if (report.metrics) {
        const premium = calculatePremiumScores(report.metrics);
        utilityScore = premium.totalScore;
      }

      let savedTime = 0;
      if (report.metrics) {
        const m = report.metrics;
        const distSubway = typeof m.distanceToSubway === 'number' ? m.distanceToSubway : 2000;
        const distTram = typeof m.distanceToTram === 'number' ? m.distanceToTram : 1000;
        const walkToSubway = distSubway / 80;
        const tramToSubway = distTram / 250 + 5;
        const linkTimeToSubway = Math.min(walkToSubway, tramToSubway);
        const totalTime = Math.round(linkTimeToSubway) + 42 + 8;
        savedTime = Math.max(0, 60 - totalTime);
      }
      const transitPremium = savedTime * 0.015;

      const dcf = calculateDynamicDCF(avg3MRent, dynamicMacroConfig, 1.5, utilityScore, transitPremium);

      const priceEok = Math.floor(avg3MSale / 10000);
      const priceMan = avg3MSale % 10000;
      const priceStr = priceMan > 0 ? `${priceEok}억 ${priceMan.toLocaleString()}만원` : `${priceEok}억원`;

      let status: 'undervalued' | 'overvalued' | 'fair' = 'fair';
      let amount = '0';

      if (avg3MSale > 0 && dcf.impliedValue > 0) {
        const diff = Math.abs(avg3MSale - dcf.impliedValue);
        const diffEok = Math.floor(diff / 10000);
        const diffMan = Math.round(diff % 10000);
        
        let amountStr = '';
        if (diffEok > 0) {
          amountStr = diffMan > 0 ? `${diffEok}억 ${diffMan.toLocaleString()}만원` : `${diffEok}억원`;
        } else {
          amountStr = `${diffMan.toLocaleString()}만원`;
        }
        amount = amountStr;

        if (avg3MSale > dcf.impliedValue) {
          status = 'overvalued';
        } else if (avg3MSale < dcf.impliedValue) {
          status = 'undervalued';
        }
      }

      if (!active) return;
      setCalculatedValuation({ status, amount, ratio: jeonseRatio, priceStr });

      // 5. Jeonse Safety 계산
      const latestSale = sales[0]?.price || 0;
      const latestRent = rents[0] ? (rents[0].calculatedPrice || rents[0].price || 0) : 0;
      const safetyRatio = latestSale > 0 ? (latestRent / latestSale) : 0;

      setCalculatedJeonseSafety({
        latestPrice: latestSale,
        latestDeposit: latestRent,
        ratio: safetyRatio
      });

      // 6. Area Filter Chips 계산
      const rawAreas = Array.from(new Set(enrichedTxs.map(tx => {
        return areaUnit === 'm2' ? tx.areaLabelM2 : tx.areaLabelPyeong;
      })));
      const validAreas = rawAreas.filter((a): a is string => !!a);
      const chips = ['전체', ...validAreas.sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB;
      })];

      setCalculatedAreaFilterChips(chips);
    };

    let idleId: number | null = null;
    let timerId: NodeJS.Timeout | null = null;

    if ('requestIdleCallback' in window) {
      idleId = (window as any).requestIdleCallback(runCalculation);
    } else {
      timerId = setTimeout(runCalculation, 50);
    }

    return () => {
      active = false;
      if (idleId !== null && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleId);
      }
      if (timerId !== null) {
        clearTimeout(timerId);
      }
    };
  }, [isAnimationFinished, rawTransactions, report, typeMap, deferredFilterOutliers, areaUnit]);

  const transactions = calculatedTransactions;
  const valuation = calculatedValuation;
  const jeonseSafetyData = calculatedJeonseSafety;
  const areaFilterChips = calculatedAreaFilterChips;

  // 필터링된 실거래 목록 (사전 계산된 필드 활용)
  const filteredTransactions = useMemo(() => {
    if (!isAnimationFinished) return [];
    if (deferredAreaFilter === '전체') return transactions;
    return transactions.filter(tx => {
      const label = areaUnit === 'm2' ? tx.areaLabelM2 : tx.areaLabelPyeong;
      return label === deferredAreaFilter;
    });
  }, [transactions, deferredAreaFilter, areaUnit, isAnimationFinished]);

  // Hydration-safe portal mount
  useEffect(() => {
    mountedRef.current = true;
    setMounted(true);
    
    // Preload critical dynamic components immediately on modal mount
    (TransactionChartSection as any).preload?.();
    (CommentSection as any).preload?.();
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isStub = report.id.startsWith('stub-');
  const modalRef = useRef<HTMLDivElement>(null);
  usePreventElasticBounce(modalRef);

  // Prevent body scroll when modal is open without causing global layout thrashing
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (inline || !isAnimationFinished) return;
    
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    // Prevent scrolling on background, header, footer (anything outside modalRef)
    const handleTouchMove = (e: TouchEvent) => {
      if (modalRef.current && modalRef.current.contains(e.target as Node)) {
        return;
      }
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.body.style.overflow = originalOverflow || '';
      document.body.style.paddingRight = originalPaddingRight || '';
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [inline, isAnimationFinished]);
  const scrollToSection = (id: string) => {
    if (activeTabTimeoutRef.current) {
      clearTimeout(activeTabTimeoutRef.current);
    }

    if (id === 'sec-comments' && modalRef.current) {
      // Comments = first section, just scroll modal to top
      modalRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = modalRef.current?.querySelector(`#${id}`);
      if (el && modalRef.current) {
        const topPos = el.getBoundingClientRect().top + modalRef.current.scrollTop - modalRef.current.getBoundingClientRect().top - 70;
        modalRef.current.scrollTo({ top: topPos, behavior: 'smooth' });
      }
    }

    // Delay activeTab state update to prevent rendering workload from blocking the initial scroll animation
    if (activeTabTimeoutRef.current) {
      clearTimeout(activeTabTimeoutRef.current);
      activeTabTimeoutRef.current = null;
    }
    activeTabTimeoutRef.current = setTimeout(() => {
      setActiveTab(id);
      activeTabTimeoutRef.current = null;
    }, 150);
  };

  const handleDownloadWatermarkedImage = async (imageUrl: string) => {
    try {
      const img = new window.Image();
      
      // Use custom API route to fetch the image with CORS headers
      img.crossOrigin = 'anonymous';
      img.src = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          
          ctx.drawImage(img, 0, 0);
          
          // Add subtle dark background for text readability
          const textMargin = canvas.width * 0.03;
          const fontSize = Math.max(canvas.width * 0.025, 14);
          
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          
          const uploaderName = '';
          const watermarkText = uploaderName ? `D-VIEW x ${uploaderName}` : 'D-VIEW';
          
          const textMetrics = ctx.measureText(watermarkText);
          const bgPaddingX = fontSize * 0.8;
          const bgPaddingY = fontSize * 0.5;
          const bgWidth = textMetrics.width + (bgPaddingX * 2);
          const bgHeight = fontSize + (bgPaddingY * 2);
          
          const bgX = canvas.width - textMargin - bgWidth;
          const bgY = canvas.height - textMargin - bgHeight;
          
          // Draw rounded rectangle background
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.beginPath();
          ctx.roundRect(bgX, bgY, bgWidth, bgHeight, fontSize * 0.4);
          ctx.fill();
          
          // Draw text
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          
          if ('letterSpacing' in ctx) {
            (ctx as any).letterSpacing = '0.1em';
          }
          
          ctx.fillText(watermarkText, canvas.width - textMargin - bgPaddingX, canvas.height - textMargin - bgPaddingY);
          ctx.restore();
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `D-VIEW_${displayAptName}.jpg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (e) {
          logger.error('ApartmentModal.downloadImage', 'Canvas tainting or drawing error', undefined, e);
          window.open(imageUrl, '_blank', 'noopener,noreferrer');
        }
      };
      
      img.onerror = () => {
        logger.warn('ApartmentModal.downloadImage', 'Canvas download failed due to load error, falling back to original image');
        window.open(imageUrl, '_blank', 'noopener,noreferrer');
      };
    } catch (error) {
      logger.error('ApartmentModal.downloadImage', 'Failed to download watermarked image', undefined, error);
      window.open(imageUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleScroll = useCallback(() => {
    if (!modalRef.current) return;

    // Top 버튼 상태 감지
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
    setActiveTab(prev => {
      if (prev !== current) return current;
      return prev;
    });
  }, []);

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
  }, [handleScroll, mounted, inline]);

  // Unused variables (coverImage, rating, badge color utils, type filter constants) removed to optimize code hygiene.
  const s = report.sections;

  const handleKakaoShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    trackEvent('share_apartment', { apt_name: report.apartmentName, method: 'kakao' });
    const shareTheme = getAutoShareTheme();
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

      const shareTheme = getAutoShareTheme();
      const shareTexts = getShareText(shareTheme, priceEok, priceMan, ratio, valuation.status, valuation.amount);
      const status = ratio >= 65 ? "갭투자추천" : "인기단지";

      // html2canvas 연산 없이, 서버 사이드 Dynamic OG Image API(/api/og) URL을 직접 빌드하여 즉각 공유 창 연결 (캐시 방지 타임스탬프 탑재)
      let imageUrl = `${baseUrl}/api/og?type=apartment&title=${encodeURIComponent(displayAptName)}&price=${encodeURIComponent(priceStr)}&ratio=${ratio.toFixed(1)}&status=${encodeURIComponent(status)}&valStatus=${valuation.status || ''}&valAmount=${encodeURIComponent(valuation.amount || '')}&t=${Date.now()}`;

      if (activeTab === 'sec-education' && eduScoreInfo) {
        const grade = eduScoreInfo.grade;
        const score = eduScoreInfo.score;
        imageUrl = `${baseUrl}/api/og?shareType=childcare&grade=${grade}&score=${score}&title=${encodeURIComponent(displayAptName)}&t=${Date.now()}`;
      } else if (activeTab === 'sec-infra-metrics' && infraScoreInfo) {
        const grade = infraScoreInfo.grade;
        const score = infraScoreInfo.score;
        imageUrl = `${baseUrl}/api/og?shareType=infra&grade=${grade}&score=${score}&title=${encodeURIComponent(displayAptName)}&t=${Date.now()}`;
      }

      await shareAptToKakao({
        aptName: displayAptName,
        priceEok,
        priceMan,
        ratio,
        imageUrl,
        customTitle: shareTexts.title,
        customDesc: shareTexts.desc,
        valStatus: valuation.status || undefined,
        valAmount: valuation.amount || undefined
      });
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
  };

  const handleDownloadShareCard = async () => {
    if (isSharing) return;
    setIsSharing(true);
    showToast("📸 요약 카드 이미지를 생성하고 있습니다...");
    
    try {
      if (shareActionTimeoutRef.current) {
        clearTimeout(shareActionTimeoutRef.current);
      }
      // Allow React to mount the off-screen share card DOM before capture
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
          scale: 2.0, // 고화질 저장용 2.0 스케일
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
        showToast("이미지 저장 중 오류가 발생했습니다. 상단의 '단톡방 요약 복사'를 통해 텍스트로 공유해 보세요!");
      }
    } finally {
      if (mountedRef.current) {
        setIsSharing(false);
      }
    }
  };

  const fallbackCopyTextToClipboard = (text: string): boolean => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  };

  const handleCopyLink = () => {
    trackEvent('share_apartment', { apt_name: report.apartmentName, method: 'copy_url' });
    const baseUrl = window.location.origin;
    let shareUrl = `${baseUrl}/apartment/${encodeURIComponent(report.apartmentName)}`;
    if (activeTab === 'sec-education' && eduScoreInfo) {
      shareUrl = `${baseUrl}/apartment/${encodeURIComponent(report.apartmentName)}?shareType=childcare&grade=${eduScoreInfo.grade}&score=${eduScoreInfo.score}`;
    } else if (activeTab === 'sec-infra-metrics' && infraScoreInfo) {
      shareUrl = `${baseUrl}/apartment/${encodeURIComponent(report.apartmentName)}?shareType=infra&grade=${infraScoreInfo.grade}&score=${infraScoreInfo.score}`;
    }

    const executeSuccess = () => {
      if (!mountedRef.current) return;
      showToast("🎉 단지 분석 링크가 복사되었습니다. 원하는 곳에 붙여넣으세요!");
      setCopiedStatus('all-link');
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
    };

    if (copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = null;
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(shareUrl).then(executeSuccess).catch((err) => {
        logger.warn('ApartmentModal.copyLink', 'Clipboard API failed, trying fallback copy', undefined, err);
        if (fallbackCopyTextToClipboard(shareUrl)) {
          executeSuccess();
        } else {
          showToast("링크 복사에 실패했습니다.");
        }
      });
    } else {
      if (fallbackCopyTextToClipboard(shareUrl)) {
        executeSuccess();
      } else {
        showToast("링크 복사에 실패했습니다.");
      }
    }
  };

  const handleCopySummary = async () => {
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
    
    // Calculate maximum sale price
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
      showToast("🎉 단톡방용 요약본 복사 완료! 원하는 단톡방이나 맘카페에 붙여넣기(Ctrl+V) 하세요.");
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
  };

  const handleNativeShare = async () => {
    const baseUrl = window.location.origin;
    let shareUrl = `${baseUrl}/apartment/${encodeURIComponent(report.apartmentName)}`;
    let title = `${displayAptName} 가치분석 리포트`;
    let desc = '';

    if (activeTab === 'sec-education' && eduScoreInfo) {
      const grade = eduScoreInfo.grade;
      const score = eduScoreInfo.score;
      shareUrl = `${baseUrl}/apartment/${encodeURIComponent(report.apartmentName)}?shareType=childcare&grade=${grade}&score=${score}`;
      title = `🏫 [육아·학군] ${displayAptName} - ${grade}등급`;
      desc = `종합 육아 환경 지수 ${score}점 (${eduScoreInfo.description.split(' (')[0]}). 초등학교 통학 및 학원가 인프라 상세 분석을 D-VIEW에서 확인하세요.`;
    } else if (activeTab === 'sec-infra-metrics' && infraScoreInfo) {
      const grade = infraScoreInfo.grade;
      const score = infraScoreInfo.score;
      shareUrl = `${baseUrl}/apartment/${encodeURIComponent(report.apartmentName)}?shareType=infra&grade=${grade}&score=${score}`;
      title = `🚇 [입지·인프라] ${displayAptName} - ${grade}등급`;
      desc = `종합 생활 인프라 지수 ${score}점 (${infraScoreInfo.description.split(' (')[0]}). 대중교통 접근성 및 핵심 상권 밀집 분석을 D-VIEW에서 확인하세요.`;
    } else {
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

      desc = `실거래가 ${priceStr}, 전세가율 ${ratio.toFixed(1)}%\nDVIEW에서 ${displayAptName} 단지의 입지, 학군, 실거래가 밸류에이션 리포트를 지금 확인해보세요.`;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: desc,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          logger.error('ApartmentModal.nativeShare', 'Native share failed', undefined, err);
          handleKakaoShare();
        }
      }
    } else {
      handleKakaoShare();
    }
  };

  const handleShareSection = async (type: 'childcare' | 'infra') => {
    if (!report.metrics) return;
    
    const baseUrl = window.location.origin;
    
    if (type === 'childcare' && eduScoreInfo) {
      const grade = eduScoreInfo.grade;
      const score = eduScoreInfo.score;
      const shareUrl = `${baseUrl}/apartment/${encodeURIComponent(report.apartmentName)}?shareType=childcare&grade=${grade}&score=${score}`;
      
      const customTitle = `🏫 [육아·학군] ${displayAptName} - ${grade}등급`;
      const customDesc = `종합 육아 환경 지수 ${score}점 (${eduScoreInfo.description.split(' (')[0]}). 초등학교 통학 및 학원가 인프라 상세 분석을 D-VIEW에서 확인하세요.`;
      const imageUrl = `${baseUrl}/api/og?shareType=childcare&grade=${grade}&score=${score}&title=${encodeURIComponent(displayAptName)}`;
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: customTitle,
            text: customDesc,
            url: shareUrl
          });
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            navigator.clipboard.writeText(shareUrl).then(() => {
              showToast("🎉 학군·육아 분석 공유 링크가 복사되었습니다!");
              setCopiedStatus('edu-link');
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
            });
          }
        }
      } else {
        navigator.clipboard.writeText(shareUrl).then(() => {
          showToast("🎉 학군·육아 분석 공유 링크가 복사되었습니다!");
          setCopiedStatus('edu-link');
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
        });
      }
      
      try {
        await shareAptToKakao({
          aptName: report.apartmentName,
          priceEok: 0,
          priceMan: 0,
          ratio: 0,
          imageUrl,
          customTitle,
          customDesc
        });
      } catch (e) {
        logger.error('ApartmentModal.shareSection.childcare', 'Failed to share childcare section to Kakao', undefined, e);
      }
    } else if (infraScoreInfo) {
      const grade = infraScoreInfo.grade;
      const score = infraScoreInfo.score;
      const shareUrl = `${baseUrl}/apartment/${encodeURIComponent(report.apartmentName)}?shareType=infra&grade=${grade}&score=${score}`;
      
      const customTitle = `🚇 [입지·인프라] ${displayAptName} - ${grade}등급`;
      const customDesc = `종합 생활 인프라 지수 ${score}점 (${infraScoreInfo.description.split(' (')[0]}). 대중교통 접근성 및 핵심 상권 밀집 분석을 D-VIEW에서 확인하세요.`;
      const imageUrl = `${baseUrl}/api/og?shareType=infra&grade=${grade}&score=${score}&title=${encodeURIComponent(displayAptName)}`;
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: customTitle,
            text: customDesc,
            url: shareUrl
          });
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            navigator.clipboard.writeText(shareUrl).then(() => {
              showToast("🎉 입지·인프라 분석 공유 링크가 복사되었습니다!");
              setCopiedStatus('infra-link');
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
            });
          }
        }
      } else {
        navigator.clipboard.writeText(shareUrl).then(() => {
          showToast("🎉 입지·인프라 분석 공유 링크가 복사되었습니다!");
          setCopiedStatus('infra-link');
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
        });
      }
      
      try {
        await shareAptToKakao({
          aptName: report.apartmentName,
          priceEok: 0,
          priceMan: 0,
          ratio: 0,
          imageUrl,
          customTitle,
          customDesc
        });
      } catch (e) {
        logger.error('ApartmentModal.shareSection.infra', 'Failed to share infra section to Kakao', undefined, e);
      }
    }
  };


  const content = (
    <>
      {/* ── Unified Header ── */}
      <header className={`w-full ${inline ? 'bg-surface' : 'bg-surface/70 dark:bg-surface/40 backdrop-blur-md'} pt-8 md:pt-10 pb-6 px-4 md:px-10 border-b border-border rounded-t-none md:rounded-t-3xl relative z-20`}>
        <div className="w-full flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5 flex-1 min-w-0 lg:min-w-[450px]">
            <div className="flex items-center gap-2">
              <span className="bg-body text-secondary text-sm font-bold px-3 py-1 rounded-full whitespace-nowrap shrink-0">{report.dong || '동탄'}</span>
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayAptName + (displayAptName.includes('아파트') ? '' : ' 아파트'))}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#1b64da] bg-[#e8f3ff] hover:bg-[#dbeafe] px-2.5 py-1 rounded-full transition-all shrink-0 group border border-[#1b64da]/20"
                title="구글 지도에서 아파트 위치 보기"
              >
                <MapPin className="w-3 h-3 group-hover:scale-105 transition-transform" />
                <span>지도보기</span>
              </a>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-[28px] xl:text-[32px] min-[1400px]:text-[36px] font-extrabold leading-[1.25] tracking-tight text-primary w-full min-w-0">
              <span className="break-keep break-words block w-full">{displayAptName}</span>
            </h1>
          </div>

          <div 
            className="flex items-center gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 py-1.5 w-[calc(100%+2rem)] shrink-0 lg:w-auto lg:overflow-x-visible lg:px-0 lg:mx-0 select-none"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* 단일화된 공유하기 버튼 (데스크톱/모바일 전체 지원) — 모바일은 하단 스티키 바와 중복되므로 hidden 처리 */}
            <button
              onClick={handleNativeShare}
              className={`h-10 px-4 rounded-[12px] shadow-sm hidden lg:flex items-center gap-1.5 font-extrabold text-[13px] border-none cursor-pointer transform transition-all duration-200 active:scale-[0.94] shrink-0 ${
                copiedStatus === 'all-link'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-[#f2f4f6] hover:bg-[#e5e8eb] dark:bg-zinc-800 dark:hover:bg-zinc-700 text-secondary'
              }`}
              title="아파트 분석 리포트 공유하기"
            >
              {copiedStatus === 'all-link' ? (
                <Check size={14} strokeWidth={2.5} className="text-white" />
              ) : (
                <Share size={14} strokeWidth={2.5} className="text-secondary/80" />
              )}
              <span>{copiedStatus === 'all-link' ? '링크 복사 완료!' : '공유하기'}</span>
            </button>

            {/* 단톡방 요약 복사 버튼 — 모바일은 하단 스티키 바와 중복되므로 hidden 처리 */}
            <button
              onClick={handleCopySummary}
              className={`h-10 px-4 rounded-[12px] shadow-sm hidden lg:flex items-center gap-1.5 font-extrabold text-[13px] border cursor-pointer transform transition-all duration-200 active:scale-[0.94] shrink-0 ${
                copiedStatus === 'summary'
                  ? 'bg-emerald-500 text-white border-transparent shadow-md'
                  : 'bg-emerald-50/50 hover:bg-emerald-100/60 dark:bg-emerald-950/10 dark:hover:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/10'
              }`}
              title="단톡방용 텍스트 요약 복사"
            >
              {copiedStatus === 'summary' ? (
                <Check size={14} strokeWidth={2.5} className="text-white" />
              ) : (
                <MessageSquare size={14} strokeWidth={2.5} className="text-emerald-600 dark:text-emerald-400" />
              )}
              <span>{copiedStatus === 'summary' ? '요약 복사 완료!' : '단톡방 요약 복사'}</span>
            </button>

            {/* 인포그래픽 요약 이미지 다운로드 버튼 — 모바일은 하단 스티키 바와 중복되므로 hidden 처리 */}
            <button
              onClick={handleDownloadShareCard}
              className="h-10 px-4 bg-[#f2f4f6] hover:bg-[#e5e8eb] dark:bg-zinc-800 dark:hover:bg-zinc-700 text-secondary border-none rounded-[12px] shadow-sm hidden lg:flex items-center gap-1.5 font-extrabold text-[13px] cursor-pointer transform transition-all duration-200 active:scale-[0.94] shrink-0"
              title="인포그래픽 요약 카드 이미지 다운로드"
            >
              <Camera size={14} strokeWidth={2.5} className="text-secondary/80" />
              <span>이미지 저장</span>
            </button>

            {/* 실거래 변동 알림 받기 버튼 */}
            <button
              onClick={() => setIsPushModalOpen(true)}
              className="h-10 px-4 bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-800 dark:hover:bg-emerald-900 text-white rounded-[12px] shadow-sm flex items-center gap-1.5 font-extrabold text-[13px] border-none cursor-pointer transform transition-all duration-200 active:scale-[0.94] shrink-0"
              title="실거래 변동 Web Push 알림 받기"
            >
              <Bell size={14} strokeWidth={2.5} className="animate-pulse" />
              <span className="text-white">실거래 알림 받기</span>
            </button>


            {/* 통합 금융/분석 드롭다운 도구함 */}
            <div className="relative shrink-0" ref={toolDropdownRef}>
              <button
                onClick={() => setIsToolDropdownOpen(prev => !prev)}
                className={`h-10 px-4 bg-gradient-to-r from-emerald-700 to-teal-600 hover:from-emerald-600 hover:to-teal-500 text-white rounded-[12px] shadow-md flex items-center gap-1.5 font-extrabold text-[13px] border-none cursor-pointer transform transition-all duration-200 active:scale-[0.94]`}
                title="AI 분석 리포트 및 부동산 금융 계산기 열기"
              >
                <Calculator size={14} />
                <span>분석 및 금융 도구</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isToolDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isToolDropdownOpen && (
                <div className="absolute right-0 mt-2.5 w-[240px] bg-surface border border-border rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.15)] py-2 z-[100] animate-in fade-in slide-in-from-top-3 duration-200">
                  <div className="px-4 py-1.5 text-[11px] font-black text-tertiary border-b border-border/40 select-none uppercase tracking-wider">
                    AI 진단 & 금융 계산기
                  </div>
                  
                  {onOpenCompare && (
                    <button
                      onClick={() => { onOpenCompare(report.apartmentName); setIsToolDropdownOpen(false); }}
                      className="w-full text-left px-4 py-3 text-[13.5px] font-bold text-secondary hover:bg-body hover:text-primary transition-colors flex items-center gap-2 border-none bg-transparent"
                    >
                      <Radar size={15} className="text-[#008262]" />
                      <div className="flex flex-col">
                        <span>단지 1:1 비교</span>
                      </div>
                    </button>
                  )}

                  {onOpenJeonseSafety && (
                    <button
                      onClick={() => { onOpenJeonseSafety(report.apartmentName); setIsToolDropdownOpen(false); }}
                      className="w-full text-left px-4 py-3 text-[13.5px] font-bold text-secondary hover:bg-body hover:text-primary transition-colors flex items-center gap-2 border-none bg-transparent"
                    >
                      <Shield size={15} className="text-[#00b386]" />
                      <div className="flex flex-col">
                        <span>전세 안전진단</span>
                      </div>
                    </button>
                  )}

                  {onOpenMortgage && (
                    <button
                      onClick={() => { onOpenMortgage(report.apartmentName); setIsToolDropdownOpen(false); }}
                      className="w-full text-left px-4 py-3 text-[13.5px] font-bold text-secondary hover:bg-body hover:text-primary transition-colors flex items-center gap-2 border-none bg-transparent"
                    >
                      <Calculator size={15} className="text-[#008262]" />
                      <div className="flex flex-col">
                        <span>대출 계산기</span>
                      </div>
                    </button>
                  )}

                  {onOpenTaxCalculator && (
                    <button
                      onClick={() => { onOpenTaxCalculator(report.apartmentName); setIsToolDropdownOpen(false); }}
                      className="w-full text-left px-4 py-3 text-[13.5px] font-bold text-secondary hover:bg-body hover:text-primary transition-colors flex items-center gap-2 border-none bg-transparent"
                    >
                      <GraduationCap size={15} className="text-[#00b386]" />
                      <div className="flex flex-col">
                        <span>취득세 계산기</span>
                      </div>
                    </button>
                  )}

                  {onOpenSellTimingCalculator && (
                    <button
                      onClick={() => { onOpenSellTimingCalculator(report.apartmentName); setIsToolDropdownOpen(false); }}
                      className="w-full text-left px-4 py-3 text-[13.5px] font-bold text-secondary hover:bg-body hover:text-primary transition-colors flex items-center gap-2 border-none bg-transparent"
                    >
                      <ShieldAlert size={15} className="text-[#f04452]" />
                      <div className="flex flex-col">
                        <span>AI 매도 진단기</span>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section — Layout: Global Filter Bar + (35% table / 65% chart) */}
      <section className={`w-full flex flex-col p-4 ${inline ? 'bg-surface md:p-6 border-b border-body' : 'bg-surface/60 dark:bg-surface/30 backdrop-blur-md md:px-10 md:py-6 border-b border-border'} shrink-0 md:h-[700px]`}>
        
        {/* 글로벌 실거래 필터 바 */}
        {isAnimationFinished && (
          <div className="w-full flex flex-wrap items-center justify-between gap-4 pb-4.5 mb-4.5 border-b border-border/50 shrink-0">
            <div className="flex flex-wrap items-center gap-3">
              {/* 평형 필터 (5개 초과 시 드롭다운, 5개 이하 시 칩스 형식) */}
              {areaFilterChips.length > 0 && (
                areaFilterChips.length > 5 ? (
                  <div className="relative shrink-0">
                    <select
                      value={selectedAreaFilter}
                      onChange={(e) => { setSelectedAreaFilter(e.target.value); loadAllTransactions?.(); }}
                      className="appearance-none bg-[#f2f4f6] hover:bg-[#e5e8eb] text-primary pl-4 pr-9 py-2 rounded-2xl transition-all shadow-sm font-extrabold text-[13.5px] border border-border/20 outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      aria-label="평형 타입 필터 선택"
                      disabled={areaFilterChips.length === 1 && areaFilterChips[0] === '전체'}
                    >
                      {areaFilterChips.map(chip => (
                         <option key={chip} value={chip} className="font-medium text-secondary">
                          {chip === '전체' ? '타입: 전체' : `타입: ${chip}`}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary">
                      <ChevronDown size={14} strokeWidth={2.5} />
                    </div>
                  </div>
                ) : (
                  <SegmentedControl
                    options={areaFilterChips.map(chip => ({ label: chip, value: chip }))}
                    value={selectedAreaFilter}
                    onChange={(val) => { setSelectedAreaFilter(val); loadAllTransactions?.(); }}
                    className="max-w-full"
                    disabled={areaFilterChips.length === 1 && areaFilterChips[0] === '전체'}
                  />
                )
              )}

              {/* 매매/전월세 토글 */}
              <SegmentedControl
                options={[
                  { label: '매매', value: 'sale' },
                  { label: '전월세', value: 'jeonse' }
                ]}
                value={chartType}
                onChange={(val) => { setChartType(val); loadAllTransactions?.(); }}
              />
            </div>

            {/* 이상 거래 필터 스위치 */}
            <div className="flex items-center gap-2 bg-[#f2f4f6] px-3.5 py-2 rounded-2xl border border-border/20 shadow-sm shrink-0">
              <span className="text-[12.5px] font-extrabold text-secondary tracking-tight select-none">이상거래 필터</span>
              <button
                onClick={handleToggleFilter}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                  filterOutliers ? 'bg-[#008262] dark:bg-[#00d29d]' : 'bg-secondary/20'
                }`}
                role="switch"
                aria-checked={filterOutliers}
                aria-label="이상거래 필터 활성화"
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    filterOutliers ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* 메인 데이터 영역: 테이블(35%) 및 차트(65%) */}
        <div className="w-full flex flex-col-reverse md:flex-row gap-4 md:gap-8 flex-1 min-h-0">
          
          {/* Left: 실거래가 전체 리스트 (35%) */}
          <div className="w-full md:w-[35%] shrink-0 flex flex-col self-start md:self-stretch min-h-[320px] md:h-full">
            {isTxLoading ? (
              <TransactionTableSkeleton />
            ) : (
              <TransactionTable 
                transactions={filteredTransactions} 
                typeMap={typeMap} 
                chartType={chartType} 
                normalizeAptName={normalizeAptName} 
              />
            )}
          </div>

          {/* Right: 실거래가 차트 (65%) */}
          <div className="w-full md:w-[65%] flex flex-col min-h-[320px] md:h-full md:self-stretch">
            <ErrorBoundary name="실거래 차트">
              {isTxLoading ? (
                <TransactionChartSkeleton />
              ) : (
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
              )}
            </ErrorBoundary>
          </div>

        </div>
      </section>

      {/* ── 평형별 최근 거래가 + 기간별 평균 ── */}
      {!isAnimationFinished || isTxLoading ? (
        <div className="w-full h-[460px] md:h-[386px] rounded-2xl border border-border/40 animate-shimmer mt-4" />
      ) : (
        <TransactionSummaryMetrics 
          transactions={transactions} 
          apartmentName={report.apartmentName}
          typeMap={typeMap}
        />
      )}

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
                      className={`relative shrink-0 pb-[16px] md:pb-[20px] text-[14.5px] font-extrabold tracking-wider transition-all duration-200 outline-none ${
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

            {/* Comments Section (Moved to top) */}
            <section id="sec-comments" className="scroll-mt-14">
              <ErrorBoundary name="임장기 댓글">
                <LazyRender estimatedHeight={250}>
                  <CommentSection
                    comments={comments}
                    commentInput={commentInput}
                    onCommentChange={onCommentChange}
                    onSubmitComment={onSubmitComment}
                    user={user}
                    isUnlocked={true}
                    selectedCommentId={selectedCommentId}
                    onRequestLogin={onRequestLogin}
                  />
                </LazyRender>
              </ErrorBoundary>
            </section>

            {/* 1. 단지 기본 명세 (Specs) */}
            <div id="sec-summary" className="scroll-mt-14">
              <ApartmentSpecsSection
                report={report}
                inline={inline}
                displayAptName={displayAptName}
              />
            </div>

              {/* 🎯 아파트별 1:1 컨텍스트 타겟팅 B2B CPA 광고 배너 연동 (105차) */}
              {report.metrics && (
                <div className="mb-2">
                  <ContextualB2BAdBanner
                    apartmentName={report.apartmentName}
                    dong={report.dong || '오산동'}
                    yearBuilt={report.metrics.yearBuilt}
                    distanceToElementary={report.metrics.distanceToElementary}
                    jeonseRate={jeonseSafetyData?.ratio}
                    userId={user?.uid}
                    onOpenAdModal={onOpenAdModal}
                    onOpenConsumerAdModal={onOpenConsumerAdModal}
                  />
                </div>
              )}

            {/* ── PAYWALL GATE — 비활성화 (프리미엄 콘텐츠 전면 공개 중) ──
             * TODO: 유료 모델 전환 시 이 블록 복원
             * 원본: isPurchased/isAdmin 체크 후 PaymentButton 표시
             */}





          {isAnimationFinished ? (
            <>
              {/* 단지 입지정보 컨테이너 (교통 + 생활 인프라 + 앵커 테넌트 묶음) */}
              <LazyRender estimatedHeight={350}>
                <InfraAnalysisSection
                  report={report}
                  inline={inline}
                  copiedStatus={copiedStatus}
                  handleShareSection={handleShareSection}
                />
              </LazyRender>

              {/* 🎓 학군 및 육아 분석 컨테이너 */}
              <LazyRender estimatedHeight={350}>
                <EducationAnalysisSection
                  report={report}
                  inline={inline}
                  copiedStatus={copiedStatus}
                  handleShareSection={handleShareSection}
                  displayAptName={displayAptName}
                />
              </LazyRender>

              {/* 모달 중간 네이티브/AdSense 광고 삽입 (수익화 채널 2배 강화) */}
              <div className="px-3 md:px-4 py-1.5 md:py-1 w-full my-2">
                <NativeAdPlaceholder 
                  location="단지 리포트 모달 중간" 
                  onClick={onOpenAdModal} 
                  metrics={report.metrics} 
                  adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_APT_MODAL_MID || "test-apt-modal-mid-slot"} 
                  isCompact={true}
                />
              </div>

              {/* 밸류에이션 리포트 (P/U Ratio & PER) */}
              <section id="sec-valuation" className="mb-2 scroll-mt-14 scroll-mb-6">
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

                {/* 취득세 및 복비 계산기 연동 버튼 */}
                {onOpenTaxCalculator && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() => onOpenTaxCalculator(report.apartmentName)}
                      className="w-full max-w-md py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-extrabold text-[14px] rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer border-none"
                    >
                      <Calculator size={16} />
                      <span>나의 예상 취득세 및 복비 계산하기</span>
                    </button>
                  </div>
                )}

                {/* AI 매도 진단기 연동 버튼 */}
                {onOpenSellTimingCalculator && (
                  <div className="mt-3 flex justify-center">
                    <button
                      onClick={() => onOpenSellTimingCalculator(report.apartmentName)}
                      className="w-full max-w-md py-3.5 bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white font-extrabold text-[14px] rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer border-none"
                    >
                      <Calculator size={16} />
                      <span>지금 팔면 호구일까? AI 매도 진단하기</span>
                    </button>
                  </div>
                )}
              </section>

              {/* 전세사기 위험도 스코어링 및 깡통전세 자동 진단 시스템 */}
              {jeonseSafetyData && (
                <section id="sec-jeonse-safety" className={`${inline ? 'bg-surface' : 'bg-surface/60 dark:bg-surface/35 backdrop-blur-md'} rounded-3xl p-6 md:p-8 shadow-sm border border-border scroll-mt-14`}>
                  <div className="flex flex-col w-full">
                    <h2 className="text-[18px] font-bold text-primary flex items-center gap-2 mb-6 border-b border-border pb-3">
                      <Shield size={18} className="text-[#0d9488]"/> 전세 안전성 진단 리포트
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
                            onOpenAdModal={onOpenAdModal}
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
                  <section id="sec-photos" className={`${inline ? 'bg-surface' : 'bg-surface/60 dark:bg-surface/35 backdrop-blur-md'} rounded-3xl p-6 md:p-8 shadow-sm scroll-mt-14 overflow-hidden relative`}>
                    <div className="absolute top-6 md:top-8 right-6 md:right-8 flex items-center gap-2 md:gap-3 z-10">
                      <span className="text-[13px] font-bold text-tertiary">{report.images.length}장</span>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsUploadModalOpen(true);
                        }}
                        className="text-[13px] font-bold text-[#008262] dark:text-[#00d29d] bg-[#e6f3f0] dark:bg-[#042820] px-3 py-1.5 rounded-lg hover:bg-[#ccebe3] dark:hover:bg-[#063b2f] transition-colors"
                      >
                        + 사진 추가
                      </button>
                    </div>
                    <details className="w-full overflow-hidden" open>
                      <summary className="text-[20px] font-bold text-primary flex items-center gap-2 mb-5 border-b border-border pb-3 cursor-pointer list-none pr-32">
                        <Camera size={20} className="text-[#008262] dark:text-[#00d29d]"/>
                        우리 단지 갤러리
                      </summary>
                      <ApartmentGallery aptName={report.apartmentName} images={report.images} tags={allTags} tagLabels={IMAGE_TAG_LABELS} onImageClick={setFullscreenImage} />
                    </details>
                  </section>
                );
              })() : (
                <section id="sec-photos" className={`${inline ? 'bg-surface' : 'bg-surface/60 dark:bg-surface/35 backdrop-blur-md'} rounded-3xl p-6 md:p-8 shadow-sm scroll-mt-14 overflow-hidden relative group`}>
                  <h2 className="text-[20px] font-bold text-primary flex items-center gap-2 mb-6 border-b border-border pb-3">
                    <Camera size={20} className="text-[#008262] dark:text-[#00d29d]"/> 우리 단지 갤러리
                  </h2>
                  <div className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#f8f9fa] to-[#f2f4f6] border border-border p-8 md:p-12 flex flex-col items-center justify-center min-h-[300px]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#008262] mix-blend-multiply filter blur-[80px] opacity-[0.03] rounded-full transform translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#7c3aed] mix-blend-multiply filter blur-[80px] opacity-[0.03] rounded-full transform -translate-x-1/2 translate-y-1/2" />
                    <div className="w-16 h-16 bg-surface shadow-sm border border-border rounded-2xl flex items-center justify-center mb-5 relative z-10">
                      <Camera className="text-[#008262] dark:text-[#00d29d]" size={32} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-[18px] md:text-[20px] font-extrabold text-primary tracking-tight mb-2 relative z-10 text-center break-keep">
                      데이터가 담지 못하는 우리 단지의 진정한 가치
                    </h3>
                    <p className="text-[14px] md:text-[15px] text-secondary font-medium leading-relaxed mb-8 max-w-md relative z-10 text-center break-keep">
                      매수자의 첫인상을 결정하는 대표 이미지 1장.<br className="hidden md:block" />
                      입주민의 시선으로 <strong className="text-[#008262] dark:text-[#00d29d]">우리 단지의 품격</strong>을 직접 완성해 주세요.
                    </p>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsUploadModalOpen(true);
                      }}
                      className="group relative z-10 flex items-center gap-2 bg-primary text-surface text-[15px] font-bold px-6 py-3.5 rounded-xl hover:bg-[#008262] hover:shadow-[0_4px_12px_rgba(0,130,98,0.3)] transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                      <span>우리 단지 첫 번째 앰배서더 되기</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#008262] dark:bg-[#00d29d] group-hover:bg-surface animate-pulse" />
                    </button>
                    <p className="text-[12px] text-tertiary font-medium mt-5 relative z-10 text-center">
                      * 고화질 사진이 풍부한 단지는 <span className="text-primary font-bold">인기 단지 탐색 상단에 우선 노출</span>됩니다.
                    </p>
                  </div>
                </section>
              )}

              <ScoutingReportDetailSection report={report} inline={inline} />

              {/* In-content Viral CTA & AdSense Placeholder */}
              <div className="flex flex-col gap-6 mt-8 mb-4">
                <button 
                  onClick={handleKakaoShare}
                  disabled={isSharing}
                  className="w-full bg-[#FEE500] hover:bg-[#FEE500]/90 text-[#3A1D1D] rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 cursor-pointer transition-colors shadow-sm group border-none text-left disabled:opacity-85"
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

                <NativeAdPlaceholder 
                  location="단지 리포트 모달" 
                  onClick={onOpenAdModal} 
                  metrics={report.metrics} 
                  adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_APT_MODAL || "test-apt-modal-slot"} 
                  isCompact={true}
                />
              </div>


            </>
          ) : (
            <div className="w-full flex flex-col gap-10">
              {/* 입지 분석 Skeleton */}
              <InfraAnalysisSkeleton />
              
              {/* 학군 정보 Skeleton */}
              {report.metrics && <EducationAnalysisSkeleton />}
              
              {/* 밸류에이션 Skeleton */}
              {transactions.length > 0 && <AdvancedValuationSkeleton />}
              
              {/* 전세 안전진단 Skeleton */}
              {transactions.length > 0 && <JeonseSafetySkeleton />}
              
              {/* 임장 총평 Skeleton */}
              <ScoutingReportDetailSkeleton />
            </div>
          )}

          </div>
    </>
  );

  // --- Image Navigation Logic ---
  const images = report?.images || [];
  const currentImageIndex = images.findIndex(img => img.url === fullscreenImage);
  const hasImages = images.length > 0;
  
  const handleNextImage = React.useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (hasImages && currentImageIndex !== -1 && currentImageIndex < images.length - 1) {
      setFullscreenImage(images[currentImageIndex + 1].url);
    }
  }, [hasImages, currentImageIndex, images]);

  const handlePrevImage = React.useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (hasImages && currentImageIndex > 0) {
      setFullscreenImage(images[currentImageIndex - 1].url);
    }
  }, [hasImages, currentImageIndex, images]);

  // Keyboard navigation & preloading
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!fullscreenImage || !hasImages) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNextImage();
      if (e.key === 'ArrowLeft') handlePrevImage();
      if (e.key === 'Escape') setFullscreenImage(null);
    };

    window.addEventListener('keydown', handleKeyDown);

    // Preload next and previous images
    if (currentImageIndex !== -1) {
      if (currentImageIndex > 0) {
        const prevImg = new window.Image();
        prevImg.src = images[currentImageIndex - 1].url;
      }
      if (currentImageIndex < images.length - 1) {
        const nextImg = new window.Image();
        nextImg.src = images[currentImageIndex + 1].url;
      }
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenImage, hasImages, currentImageIndex, handleNextImage, handlePrevImage, images]);

  const FullscreenOverlay = () => {
    if (!fullscreenImage) return null;
    const currentImgData = report?.images?.[currentImageIndex];
    return (
      <div 
        className="fixed inset-0 z-[99999] bg-black/95 flex items-center justify-center animate-in fade-in duration-200"
        onClick={() => setFullscreenImage(null)}
      >
        <button 
          className="absolute top-6 right-6 z-50 text-surface/50 hover:text-surface p-2 rounded-full bg-surface/10 hover:bg-surface/20 transition-colors"
          onClick={(e) => { e.stopPropagation(); setFullscreenImage(null); }}
        >
          <X size={24} />
        </button>
        <button 
          className="absolute top-6 right-20 z-50 text-surface/50 hover:text-surface p-2 rounded-full bg-surface/10 hover:bg-surface/20 transition-colors"
          onClick={(e) => { e.stopPropagation(); handleDownloadWatermarkedImage(fullscreenImage); }}
          title="이미지 저장 (워터마크 포함)"
        >
          <Download size={24} />
        </button>

        {isAdmin && (
          <button 
            className="absolute top-6 right-36 z-50 text-white hover:text-[#00d29d] dark:hover:text-[#00d29d] p-2 rounded-full bg-surface/10 hover:bg-surface/30 transition-colors flex items-center gap-2 px-4 border border-white/20"
            onClick={async (e) => { 
              e.stopPropagation(); 
              if (!currentImgData?.url || !report?.id) return;
              if (report.id.startsWith('stub-')) {
                alert('해당 아파트의 리포트가 아직 생성되지 않았습니다.');
                return;
              }
              if (!confirm('이 사진을 아파트 카드의 대표 썸네일로 설정하시겠습니까?')) return;
              try {
                await throttle(() => updateDoc(doc(db, 'scoutingReports', report.id), {
                  thumbnailUrl: currentImgData.url
                }));
                alert('대표 썸네일이 변경되었습니다. 새로고침 시 반영됩니다.');
              } catch (err) {
                logger.error('ApartmentModal.setThumbnail', 'Failed to set thumbnail', { reportId: report.id, thumbnailUrl: currentImgData.url }, err);
                alert('썸네일 설정에 실패했습니다.');
              }
            }}
            title="대표 썸네일로 설정"
          >
            <span className="text-sm font-bold">대표 사진 설정</span>
          </button>
        )}

        {/* Left Arrow */}
        {currentImageIndex > 0 && (
          <button
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-50 text-surface/50 hover:text-surface p-3 rounded-full bg-black/20 hover:bg-surface/20 transition-colors"
            onClick={handlePrevImage}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        )}

        {/* Right Arrow */}
        {hasImages && currentImageIndex < images.length - 1 && (
          <button
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-50 text-surface/50 hover:text-surface p-3 rounded-full bg-black/20 hover:bg-surface/20 transition-colors"
            onClick={handleNextImage}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        )}

        <div className="relative flex flex-col items-center justify-center w-full h-full" onClick={(e) => e.stopPropagation()} onContextMenu={(e) => e.preventDefault()}>
          <div className="relative flex items-center justify-center">
            {/* Use standard img with fetchPriority for faster loading than Next/Image in this specific raw URL context */}
            <img 
              src={fullscreenImage} 
              alt="임장 사진 전체 화면 확대 보기"
              fetchPriority="high"
              decoding="async"
              className="max-w-[95vw] max-h-[85vh] object-contain select-none shadow-2xl pointer-events-none transition-opacity duration-300"
            />
            {/* Subtle Corner Watermark */}
            <div className="absolute right-4 bottom-4 pointer-events-none z-20">
              <span className="text-surface/70 font-bold text-sm md:text-base tracking-widest select-none drop-shadow-xl bg-black/40 px-3 py-1.5 rounded-lg backdrop-blur-md border border-white/10">
                {currentImgData?.uploaderName ? `D-VIEW x ${currentImgData.uploaderName}` : 'D-VIEW'}
              </span>
            </div>
          </div>
          
          {/* Metadata Footer */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
            <div className="bg-black/60 backdrop-blur-md px-6 py-2.5 rounded-full flex items-center gap-3 border border-white/10 shadow-lg">
              <span className="text-surface/90 text-[13px] font-bold">
                {currentImageIndex + 1} <span className="text-surface/40 font-normal">/ {images.length}</span>
              </span>
              {currentImgData?.locationTag && (
                <>
                  <span className="w-1 h-1 rounded-full bg-surface/30" />
                  <span className="text-surface/80 text-[13px] font-medium">{currentImgData.locationTag}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Return: inline panel vs modal overlay ──
  if (inline) {
    return (
      <div ref={modalRef} className="bg-surface h-full flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar">
        {content}
        <FullscreenOverlay />
        
        {/* Upload Modal */}
        {isUploadModalOpen && (
          <PhotoUploadModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            apartmentId={report.id}
            apartmentName={report.apartmentName}
            user={user}
          />
        )}
      </div>
    );
  }

  // Use Portal for the modal to escape CSS containing blocks (transforms)
  if (!mounted) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[11000] flex flex-col justify-end md:items-center md:justify-center p-0 md:p-6 lg:p-8 animate-in fade-in duration-200" style={{ position: 'fixed' }}>
        <div className="absolute inset-0 bg-black/30 dark:bg-black/55 backdrop-blur-md" onClick={onClose} />
        
        <article 
          className={`relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 w-full ${isFullscreen ? 'h-full max-w-none rounded-none' : 'max-w-[1275px] h-[100dvh] md:h-auto md:max-h-[95vh] rounded-none md:rounded-[24px]'} flex flex-col shadow-2xl transition-transform duration-300 ring-1 ring-black/5 dark:ring-white/10 slide-in-from-bottom overflow-hidden`}
        >

          <header className="absolute top-6 right-6 md:top-7 md:right-8 z-[100] hidden md:flex items-center gap-3">
            <button onClick={onClose} aria-label="닫기" className="bg-surface/90 hover:bg-surface text-secondary border border-border w-10 h-10 flex items-center justify-center rounded-full transition-colors shadow-lg shrink-0 group">
              <X size={20} className="group-hover:scale-110 transition-transform" />
            </button>
          </header>
          
          <div ref={modalRef} className="w-full h-full overflow-y-auto overflow-x-hidden custom-scrollbar pb-24 md:pb-0 flex flex-col">
            <div id="pdf-report-content" className={`flex flex-col ${inline ? 'bg-body' : 'bg-transparent'} w-full`}>
              {content}
            </div>
            {/* 하단 고정 버튼 영역 침범 방지용 여백 (모바일 전용) */}
            <div className="h-28 md:hidden shrink-0" />
          </div>

          {/* Top Floating Button */}
          {showScrollTop && (
            <button
              onClick={() => modalRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
              className="fixed bottom-[calc(104px+env(safe-area-inset-bottom))] md:bottom-8 right-6 z-[100] w-12 h-12 bg-surface hover:bg-[#e5e8eb] text-secondary border border-border rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer group"
              title="맨 위로 이동"
              aria-label="맨 위로 이동"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
            </button>
          )}

          {/* Mobile Sticky CTA (공유하기) */}
          <footer className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] bg-surface/80 backdrop-blur-md border-t border-border md:hidden z-[100] shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={onClose}
                className="w-[56px] h-[56px] bg-body hover:bg-[#e5e8eb] text-secondary rounded-2xl flex items-center justify-center transition-colors shrink-0 shadow-sm"
                title="뒤로가기"
                aria-label="뒤로가기"
              >
                <ArrowLeft size={24} strokeWidth={2.5} />
              </button>

              {/* 단톡방 요약 복사 (모바일 숏컷) */}
              <button
                onClick={handleCopySummary}
                className={`w-[56px] h-[56px] rounded-2xl flex items-center justify-center transition-all shrink-0 shadow-sm border transform duration-200 active:scale-[0.94] ${
                  copiedStatus === 'summary'
                    ? 'bg-emerald-100/80 dark:bg-emerald-900/35 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 scale-[1.05]'
                    : 'bg-emerald-50/50 hover:bg-[#e5e8eb] dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-300 border-emerald-100/30'
                }`}
                title="단톡방용 텍스트 요약 복사"
                aria-label="단톡방용 텍스트 요약 복사"
              >
                {copiedStatus === 'summary' ? (
                  <Check size={24} strokeWidth={2.5} className="text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <MessageSquare size={24} strokeWidth={2.5} className="text-emerald-600 dark:text-emerald-400" />
                )}
              </button>
              
              {/* 인포그래픽 요약 이미지 다운로드 (모바일 숏컷) */}
              <button
                onClick={handleDownloadShareCard}
                className="w-[56px] h-[56px] bg-neutral-100 dark:bg-zinc-900 hover:bg-[#e5e8eb] text-secondary rounded-2xl flex items-center justify-center transition-colors shrink-0 shadow-sm border border-border/20 cursor-pointer active:scale-95 transform transition-all duration-200"
                title="인포그래픽 요약 카드 이미지 다운로드"
                aria-label="인포그래픽 요약 카드 이미지 다운로드"
              >
                <Camera size={24} strokeWidth={2.5} className="text-secondary/80" />
              </button>

              <button
                onClick={handleNativeShare}
                className={`flex-1 h-[56px] text-white font-extrabold text-[14px] sm:text-[16px] rounded-2xl flex items-center justify-center gap-2 transition-all transform duration-200 active:scale-[0.95] break-keep text-center px-2 ${
                  copiedStatus === 'all-link'
                    ? 'bg-emerald-600 shadow-[0_8px_16px_rgba(16,185,129,0.2)] hover:shadow-[0_10px_20px_rgba(16,185,129,0.3)]'
                    : 'bg-[#008262] active:bg-[#006b50] shadow-[0_8px_16px_rgba(0,130,98,0.2)] hover:shadow-[0_10px_20px_rgba(0,130,98,0.3)] hover:-translate-y-0.5'
                }`}
              >
                {copiedStatus === 'all-link' ? (
                  <Check size={18} strokeWidth={2.5} className="shrink-0 text-white" />
                ) : (
                  <Share size={18} strokeWidth={2.5} className="shrink-0" />
                )}
                <span className="break-keep leading-tight">{copiedStatus === 'all-link' ? '공유 링크 복사 완료!' : '분석 리포트 공유하기'}</span>
              </button>
            </div>
          </footer>
        </article>
      </div>
      
      {/* Upload Modal */}
      {isUploadModalOpen && (
        <PhotoUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          apartmentId={report.id}
          apartmentName={report.apartmentName}
          user={user}
        />
      )}
      
      {/* ─── Kakao Share Off-screen Visual Card (1200x630) ─── */}
      {isSharing && (
        <div
          ref={shareCardRef}
          style={{
            position: 'absolute',
            left: '-9999px',
            top: '-9999px',
            width: '1200px',
            height: '630px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            boxSizing: 'border-box',
          }}
          className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white p-16 flex flex-col justify-between"
        >
        {/* Top Header */}
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00d29d] flex items-center justify-center shadow-lg shadow-[#00d29d]/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <span className="text-[#00d29d] text-[20px] font-black tracking-wider uppercase block leading-none">D-VIEW</span>
              <span className="text-slate-400 text-[13px] font-bold block leading-none mt-1">동탄 부동산 가치분석 플랫폼</span>
            </div>
          </div>
          <div className="bg-[#1e293b] border border-slate-800/80 rounded-full px-5 py-2">
            <span className="text-slate-300 text-[14px] font-bold">실거래 가치분석 리포트</span>
          </div>
        </div>

        {/* Center Content */}
        <div className="grid grid-cols-12 gap-8 items-center my-6">
          {/* Left: Apt Name & Info */}
          <div className="col-span-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="bg-[#00d29d]/15 text-[#00d29d] text-[14px] font-black px-3.5 py-1.5 rounded-full border border-[#00d29d]/30">
                {report.dong || '동탄'}
              </span>
              {report.metrics?.yearBuilt && (
                <span className="bg-slate-800 text-slate-400 text-[14px] font-bold px-3.5 py-1.5 rounded-full">
                  {String(report.metrics.yearBuilt).substring(0, 4)}년 입주
                </span>
              )}
              {calculatedValuation?.status === 'undervalued' && (
                <span className="bg-emerald-500/20 text-[#00d29d] text-[14px] font-black px-3.5 py-1.5 rounded-full border border-emerald-500/30">
                  저평가 메리트 🟢
                </span>
              )}
              {calculatedValuation?.status === 'overvalued' && (
                <span className="bg-rose-500/20 text-rose-400 text-[14px] font-black px-3.5 py-1.5 rounded-full border border-rose-500/30">
                  시세 고평가 🚨
                </span>
              )}
              {calculatedValuation?.status === 'fair' && (
                <span className="bg-slate-800 text-slate-300 text-[14px] font-black px-3.5 py-1.5 rounded-full">
                  적정 시세 ⚖️
                </span>
              )}
            </div>
            <h1 className="text-[44px] font-black leading-tight tracking-tight text-white drop-shadow-sm">
              {displayAptName}
            </h1>
            <div className="flex items-center gap-2 text-slate-400 text-[15px] font-semibold">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#00d29d]">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.08-.417-.507-.65-.913-.485a4.5 4.5 0 00-2.836 2.836c-.166.406.067.833.485.913a.75.75 0 01.614.93L9.61 16.57a.75.75 0 11-1.46-.388l1.378-5.182a.75.75 0 111.46.388L9.61 16.57a.75.75 0 11-1.46-.388l1.378-5.182z" clipRule="evenodd" />
              </svg>
              입지평점: {report.premiumScores?.totalPremiumScore ? `${report.premiumScores.totalPremiumScore.toFixed(1)} / 100` : '90.0 / 100'}
            </div>
          </div>

          {/* Right: Metrics Grid */}
          <div className="col-span-6 grid grid-cols-2 gap-4">
            {/* Metric 1: Sale Price */}
            <div className="bg-[#1e293b]/60 border border-slate-800/80 rounded-3xl p-6 flex flex-col gap-1.5">
              <span className="text-slate-400 text-[14px] font-bold">최근 실거래 매매가</span>
              <span className="text-[28px] font-black text-white tracking-tight">
                {(() => {
                  const saleTxs = transactions.filter(t => !t.dealType || (t.dealType !== '전세' && t.dealType !== '월세'));
                  if (saleTxs.length === 0) return '-';
                  const p = saleTxs[0].price;
                  const eok = Math.floor(p / 10000);
                  const man = p % 10000;
                  return `${eok}억${man > 0 ? ` ${man.toLocaleString()}` : ''}`;
                })()}
              </span>
            </div>

            {/* Metric 2: Jeonse Price */}
            <div className="bg-[#1e293b]/60 border border-slate-800/80 rounded-3xl p-6 flex flex-col gap-1.5">
              <span className="text-slate-400 text-[14px] font-bold">최근 실거래 전세가</span>
              <span className="text-[28px] font-black text-white tracking-tight">
                {(() => {
                  const jeonseTxs = transactions.filter(t => t.dealType === '전세');
                  if (jeonseTxs.length === 0) return '-';
                  const p = jeonseTxs[0].deposit || 0;
                  const eok = Math.floor(p / 10000);
                  const man = p % 10000;
                  return `${eok}억${man > 0 ? ` ${man.toLocaleString()}` : ''}`;
                })()}
              </span>
            </div>

            {/* Metric 3: Gap Investment */}
            <div className="bg-[#00d29d]/10 border border-[#00d29d]/20 rounded-3xl p-6 flex flex-col gap-1.5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#00d29d]/5 rounded-full blur-xl -mr-6 -mt-6"></div>
              <span className="text-[#00d29d] text-[14px] font-extrabold flex items-center gap-1">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
                </svg>
                갭투자 필요자금
              </span>
              <span className="text-[30px] font-black text-[#00d29d] tracking-tight">
                {(() => {
                  const saleTxs = transactions.filter(t => !t.dealType || (t.dealType !== '전세' && t.dealType !== '월세'));
                  const jeonseTxs = transactions.filter(t => t.dealType === '전세');
                  if (saleTxs.length === 0 || jeonseTxs.length === 0) return '-';
                  const salePrice = saleTxs[0].price;
                  const jeonsePrice = jeonseTxs[0].deposit || 0;
                  const gap = salePrice - jeonsePrice;
                  if (gap <= 0) return '갭 없음';
                  const eok = Math.floor(gap / 10000);
                  const man = gap % 10000;
                  return `${eok}억${man > 0 ? ` ${man.toLocaleString()}` : ''}`;
                })()}
              </span>
            </div>

            {/* Metric 4: Jeonse Ratio */}
            <div className="bg-[#1e293b]/60 border border-slate-800/80 rounded-3xl p-6 flex flex-col gap-1.5">
              <span className="text-slate-400 text-[14px] font-bold">전세가율 (매매 대비 전세)</span>
              <span className="text-[28px] font-black text-white tracking-tight">
                {(() => {
                  const saleTxs = transactions.filter(t => !t.dealType || (t.dealType !== '전세' && t.dealType !== '월세'));
                  const jeonseTxs = transactions.filter(t => t.dealType === '전세');
                  if (saleTxs.length === 0 || jeonseTxs.length === 0) return '-';
                  const salePrice = saleTxs[0].price;
                  const jeonsePrice = jeonseTxs[0].deposit || 0;
                  const ratio = (jeonsePrice / salePrice) * 100;
                  return `${ratio.toFixed(1)}%`;
                })()}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="flex justify-between items-center w-full border-t border-slate-800/80 pt-6">
          <div className="flex items-center gap-2 text-slate-400 text-[14px] font-bold">
            <span>지금 D-VIEW 모바일 앱/웹에서 실시간 동탄 갭투자 분석 지표를 확인하세요.</span>
          </div>
          <div className="text-[#00d29d] text-[16px] font-black tracking-wider uppercase">
            DONGTANVIEW.COM
          </div>
        </div>
      </div>
      )}

      <FullscreenOverlay />

      <PushSubscriptionModal 
        isOpen={isPushModalOpen}
        onClose={() => setIsPushModalOpen(false)}
        aptName={displayAptName}
      />
    </>,
    document.getElementById('modal-root') || document.body
  );
});

FieldReportModal.displayName = 'FieldReportModal';
export default FieldReportModal;
