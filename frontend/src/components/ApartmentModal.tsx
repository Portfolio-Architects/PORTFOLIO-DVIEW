'use client';

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  MapPin, X, Camera,
  Building, Info, Shield, ShieldAlert, Radar, ChevronDown, ArrowLeft, Download, Share, Check,
  Crown, ChevronRight, GraduationCap, Calculator, MessageSquare
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { normalize84Price } from '@/lib/utils/valuation';
import { normalizeAptName, getDisplayAptName, findTypeMapEntry } from '@/lib/utils/apartmentMapping';
import type { CommentData, FieldReportData } from '@/lib/DashboardFacade';
import type { User } from 'firebase/auth';
import { doc, updateDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { createPortal } from 'react-dom';
import { postConverter } from '@/lib/utils/firestoreConverters';
import { safeReload } from '@/lib/utils/safeReload';

const CommentSection = dynamic(() => import('@/components/CommentSection').catch(err => {
  console.warn('CommentSection Chunk Load failure, initiating fallback reload', err);
  safeReload('CommentSection');
  return { default: () => null };
}), { ssr: false });
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import SegmentedControl from './ui/SegmentedControl';
import { ApartmentGallery } from './apartment-modal/ApartmentGallery';
import { TransactionTable } from './apartment-modal/TransactionTable';
const ViralPaywallGate = dynamic(() => import('./apartment-modal/ViralPaywallGate').catch(err => {
  console.warn('ViralPaywallGate Chunk Load failure, initiating fallback reload', err);
  safeReload('ViralPaywallGate');
  return { default: () => null };
}), { ssr: false });
const JeonseSafetyReport = dynamic(() => import('./apartment-modal/JeonseSafetyReport').catch(err => {
  console.warn('JeonseSafetyReport Chunk Load failure, initiating fallback reload', err);
  safeReload('JeonseSafetyReport');
  return { default: () => null };
}), { ssr: false });
const TransactionChartSection = dynamic(() => import('./apartment-modal/TransactionChartSection').then(mod => mod.TransactionChartSection).catch(err => {
  console.warn('TransactionChartSection Chunk Load failure, initiating fallback reload', err);
  safeReload('TransactionChartSection');
  return () => null;
}), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-body/50 rounded-2xl animate-pulse">
      <span className="text-tertiary text-[13px] font-bold">차트 로드 중...</span>
    </div>
  )
});
import { TransactionSummaryMetrics } from './apartment-modal/TransactionSummaryMetrics';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
const PhotoUploadModal = dynamic(() => import('./apartment-modal/PhotoUploadModal').then(mod => mod.PhotoUploadModal).catch(err => {
  console.warn('PhotoUploadModal Chunk Load failure, initiating fallback reload', err);
  safeReload('PhotoUploadModal');
  return () => null;
}), { ssr: false });
import { useSettings } from '@/lib/contexts/SettingsContext';
import { shareAptToKakao } from '@/lib/utils/kakaoShare';
const BuyOrWaitVote = dynamic(() => import('./apartment-modal/BuyOrWaitVote').catch(err => {
  console.warn('BuyOrWaitVote Chunk Load failure, initiating fallback reload', err);
  safeReload('BuyOrWaitVote');
  return { default: () => null };
}), { ssr: false });
import { safeHtml2canvasPro } from '@/lib/utils/html2canvasPatch';
import { usePWA } from '@/components/pwa/PWAProvider';
import LocalEducationAd from '@/components/LocalEducationAd';
import ContextualB2BAdBanner from './apartment-modal/ContextualB2BAdBanner';

import { getBrandMultiplier, calculatePremiumScores } from '@/lib/utils/scoring';
import { calculateDynamicDCF } from '@/lib/utils/valuationEngine';

import ApartmentSpecsSection from './apartment-modal/ApartmentSpecsSection';
const EducationAnalysisSection = dynamic(() => import('./apartment-modal/EducationAnalysisSection').catch(err => {
  console.warn('EducationAnalysisSection Chunk Load failure, initiating fallback reload', err);
  safeReload('EducationAnalysisSection');
  return { default: () => null };
}), { ssr: false });
const InfraAnalysisSection = dynamic(() => import('./apartment-modal/InfraAnalysisSection').catch(err => {
  console.warn('InfraAnalysisSection Chunk Load failure, initiating fallback reload', err);
  safeReload('InfraAnalysisSection');
  return { default: () => null };
}), { ssr: false });
const ScoutingReportDetailSection = dynamic(() => import('./apartment-modal/ScoutingReportDetailSection').catch(err => {
  console.warn('ScoutingReportDetailSection Chunk Load failure, initiating fallback reload', err);
  safeReload('ScoutingReportDetailSection');
  return { default: () => null };
}), { ssr: false });

const AdvancedValuationMetrics = dynamic(() => import('@/components/consumer/AdvancedValuationMetrics').catch(err => {
  console.warn('AdvancedValuationMetrics Chunk Load failure, initiating fallback reload', err);
  safeReload('AdvancedValuationMetrics');
  return { default: () => null };
}), { ssr: false });
const AnchorTenantCard = dynamic(() => import('@/components/consumer/AnchorTenantCard').catch(err => {
  console.warn('AnchorTenantCard Chunk Load failure, initiating fallback reload', err);
  safeReload('AnchorTenantCard');
  return { default: () => null };
}), { ssr: false });
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


const calculateEducationScore = (metrics: any) => {
  if (!metrics) return { score: 0, grade: 'C', description: '정보 부족' };
  
  let score = 0;
  
  // 1. Elementary Distance (max 45 points) - 선형 보간 감쇄 적용
  const elemDist = metrics.distanceToElementary || 9999;
  let elemScore = 0;
  if (elemDist <= 150) elemScore = 45;
  else if (elemDist <= 300) elemScore = 45 - ((elemDist - 150) / 150) * 5;
  else if (elemDist <= 500) elemScore = 40 - ((elemDist - 300) / 200) * 10;
  else if (elemDist <= 800) elemScore = 30 - ((elemDist - 500) / 300) * 15;
  else if (elemDist <= 1500) elemScore = 15 - ((elemDist - 800) / 700) * 10;
  else elemScore = 5;
  score += Math.round(elemScore);
  
  // 2. Middle & High School Accessibility (max 20 points) - 선형 보간 감쇄 적용
  const midDist = metrics.distanceToMiddle || 9999;
  const highDist = metrics.distanceToHigh || 9999;
  
  let midScore = 0;
  if (midDist <= 300) midScore = 10;
  else if (midDist <= 800) midScore = 10 - ((midDist - 300) / 500) * 3;
  else if (midDist <= 1500) midScore = 7 - ((midDist - 800) / 700) * 4;
  else midScore = 3;
  
  let highScore = 0;
  if (highDist <= 400) highScore = 10;
  else if (highDist <= 1000) highScore = 10 - ((highDist - 400) / 600) * 3;
  else if (highDist <= 2000) highScore = 7 - ((highDist - 1000) / 1000) * 4;
  else highScore = 3;
  
  score += Math.round(midScore) + Math.round(highScore);
  
  // 3. Academy Density & Diversity (max 35 points) - 다양성 인센티브 가산
  const density = metrics.academyDensity || 0;
  let baseDensityScore = 0;
  if (density >= 100) baseDensityScore = 30;
  else if (density >= 50) baseDensityScore = 24;
  else if (density >= 20) baseDensityScore = 17;
  else if (density >= 5) baseDensityScore = 8;
  else baseDensityScore = 2;
  
  const categories = metrics.academyCategories || {};
  const categoryCount = Object.keys(categories).length;
  let diversityBonus = 0;
  if (categoryCount >= 6) diversityBonus = 5;
  else if (categoryCount >= 4) diversityBonus = 3;
  else if (categoryCount >= 2) diversityBonus = 1;
  
  score += baseDensityScore + diversityBonus;
  
  // Grade
  let grade = 'C';
  let desc = '보통 수준의 교육 여건';
  if (score >= 90) {
    grade = 'S';
    desc = '최상급 초품아 + 대형 학원가 인접 (최고의 자녀 양육 환경)';
  } else if (score >= 80) {
    grade = 'A';
    desc = '안심 도보 통학 및 우수한 학원가 인프라 완비';
  } else if (score >= 70) {
    grade = 'B';
    desc = '양호한 통학 거리와 균형 잡힌 근린 교육 환경';
  }
  
  return { score, grade, description: desc };
};

const calculateInfraScore = (metrics: any) => {
  if (!metrics) return { score: 0, grade: 'C', description: '정보 부족' };
  
  let score = 0;
  
  // 1. Subway/Rail Accessibility (max 40 points)
  const distances = [
    metrics.distanceToSubway || 9999,
    metrics.distanceToIndeokwon || 9999,
    metrics.distanceToTram || 9999
  ];
  const minRailDist = Math.min(...distances);
  let railScore = 0;
  if (minRailDist <= 400) railScore = 40;
  else if (minRailDist <= 800) railScore = 40 - ((minRailDist - 400) / 400) * 10;
  else if (minRailDist <= 1200) railScore = 30 - ((minRailDist - 800) / 400) * 15;
  else railScore = 10;
  score += Math.round(railScore);
  
  // 2. Convenience (Anchor Tenants) (max 30 points)
  const anchors = [
    metrics.distanceToStarbucks || 9999,
    metrics.distanceToOliveYoung || 9999,
    metrics.distanceToDaiso || 9999,
    metrics.distanceToMcDonalds || 9999
  ];
  let anchorScore = 0;
  anchors.forEach(dist => {
    if (dist <= 300) anchorScore += 7.5;
    else if (dist <= 600) anchorScore += 6;
    else if (dist <= 1000) anchorScore += 4.5;
    else anchorScore += 2;
  });
  score += Math.round(anchorScore);
  
  // 3. Commercial Density (max 30 points)
  const density = metrics.restaurantDensity || 0;
  let densityScore = 0;
  if (density >= 150) densityScore = 30;
  else if (density >= 80) densityScore = 25;
  else if (density >= 30) densityScore = 18;
  else if (density >= 10) densityScore = 10;
  else densityScore = 3;
  score += densityScore;
  
  // Grade
  let grade = 'C';
  let desc = '보통 수준의 생활 인프라';
  if (score >= 90) {
    grade = 'S';
    desc = '초역세권 및 대형 상권 밀집 (최고 수준의 생활 편의성)';
  } else if (score >= 80) {
    grade = 'A';
    desc = '역세권 입지와 스타벅스 등 핵심 상권 완비';
  } else if (score >= 70) {
    grade = 'B';
    desc = '안정적인 대중교통망과 풍부한 근린 상권 보유';
  }
  
  return { score, grade, description: desc };
};

// Removed inline ViralPaywallGate, imported from external file.

function FieldReportModal({ 
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
  const { areaUnit, setAreaUnit } = useSettings();
  const { showToast } = usePWA();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAnimationFinished, setIsAnimationFinished] = useState(false);
  const displayAptName = getDisplayAptName(report.apartmentName);

  useEffect(() => {
    if (mounted) {
      const timer = setTimeout(() => {
        setIsAnimationFinished(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [mounted]);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('sec-summary');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('전체');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  // 금융/분석 툴 드롭다운 상태
  const [isToolDropdownOpen, setIsToolDropdownOpen] = useState(false);
  const toolDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isToolDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (toolDropdownRef.current && !toolDropdownRef.current.contains(e.target as Node)) {
        setIsToolDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isToolDropdownOpen]);

  const [selectedCommentId, setSelectedCommentId] = useState<string | undefined>(undefined);

  const [viralShareCount, setViralShareCount] = useState<number>(0);
  const [isUnlockedByViral, setIsUnlockedByViral] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && report?.apartmentName) {
      const aptName = report.apartmentName;
      const shareKey = `dview-viral-share-count-${aptName}`;
      const unlockKey = `dview-unlocked-apt-${aptName}`;
      
      const savedCount = parseInt(localStorage.getItem(shareKey) || '0', 10);
      setViralShareCount(savedCount);
      
      const unlockedTime = localStorage.getItem(unlockKey);
      if (unlockedTime) {
        const parsedTime = parseInt(unlockedTime, 10);
        if (Date.now() < parsedTime) {
          setIsUnlockedByViral(true);
        } else {
          localStorage.removeItem(unlockKey);
          setIsUnlockedByViral(false);
        }
      } else {
        setIsUnlockedByViral(false);
      }
    }
  }, [report?.apartmentName]);

  const incrementViralShareCount = useCallback(() => {
    if (isUnlockedByViral) return;
    const aptName = report.apartmentName;
    const shareKey = `dview-viral-share-count-${aptName}`;
    const unlockKey = `dview-unlocked-apt-${aptName}`;
    
    const currentCount = parseInt(localStorage.getItem(shareKey) || '0', 10);
    const nextCount = currentCount + 1;
    localStorage.setItem(shareKey, nextCount.toString());
    setViralShareCount(nextCount);
    
    if (nextCount >= 3) {
      const lockExpiry = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem(unlockKey, lockExpiry.toString());
      setIsUnlockedByViral(true);
      showToast("🎉 공유 미션 달성! 24시간 동안 모든 리포트가 무료로 잠금 해제되었습니다.");
    } else {
      showToast(`📢 카카오톡 공유 완료 (${nextCount}/3). 3회 완료 시 무료로 열립니다!`);
    }
  }, [report?.apartmentName, isUnlockedByViral, showToast]);

  const handleAlternativeUnlock = useCallback(() => {
    const target = document.getElementById('sec-comments');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
      showToast("📝 하단 거주후기(댓글) 입력창으로 이동했습니다. 한줄평을 남겨주시면 즉시 해금됩니다!");
    } else {
      showToast("아파트 상세 정보 하단의 댓글/후기 창에 글을 작성해 주세요!");
    }
  }, [showToast]);

  const handleCommentSubmitWithUnlock = useCallback(async () => {
    if (!user) {
      onSubmitComment();
      return;
    }
    if (!commentInput?.trim()) return;

    await onSubmitComment();
    
    // Reward Unlock
    const aptName = report.apartmentName;
    const unlockKey = `dview-unlocked-apt-${aptName}`;
    const lockExpiry = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(unlockKey, lockExpiry.toString());
    setIsUnlockedByViral(true);
    showToast("✍️ 입주민 거주후기(댓글) 작성 감사 혜택! D-VIEW 분석 리포트가 24시간 동안 즉시 해금되었습니다. 💚");
  }, [onSubmitComment, user, commentInput, report?.apartmentName, showToast]);

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

  const getShareText = (theme: 'value' | 'gap' | 'school' | 'deal', priceEok: number, priceMan: number, ratio: number) => {
    const priceStr = priceMan > 0 ? `${priceEok}억 ${priceMan.toLocaleString()}만원` : `${priceEok}억원`;
    const aptName = displayAptName;

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

  // 이상치 필터링 토글 상태
  const [filterOutliers, setFilterOutliers] = useState<boolean>(true);

  // Load outlier filter state from localStorage on mount (hydration-safe)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dview_filter_outliers');
      if (saved === 'false') {
        setFilterOutliers(false);
      }
    } catch (e) {
      console.warn('localStorage is unavailable:', e);
    }
  }, []);

  const handleToggleFilter = () => {
    setFilterOutliers(prev => {
      const next = !prev;
      try {
        localStorage.setItem('dview_filter_outliers', String(next));
      } catch (e) {
        console.warn('Failed to set dview_filter_outliers to localStorage:', e);
      }
      return next;
    });
  };

  const [managerPost, setManagerPost] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
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

        setManagerPost(matchedId ? { id: matchedId, title: matchedTitle } : null);
      } catch (err) {
        console.error('Failed to fetch matching manager post in modal:', err);
      }
    };

    fetchPost();
  }, [report.apartmentName, report.premiumContent]);

  const parsedTitle = useMemo(() => {
    if (!report.premiumContent) return '';
    const match = report.premiumContent.match(/^#+\s+(.*)$/m);
    if (match) {
      return match[1].replace(/^[🏢👑]\s*/, '').trim();
    }
    return '';
  }, [report.premiumContent]);

  // 이상치 제거 (평균 기준 2 표준편차 초과 거래 숨김 - 토글 활성화 시에만 적용)
  const transactions = useMemo(() => {
    if (!rawTransactions || rawTransactions.length === 0) return [];
    
    // 1. 사전 연산: 각 거래 건의 실제 가격/전세전환가 및 타입맵 정보를 미리 연산하여 캐싱
    const mappedTransactions = rawTransactions.map(tx => {
      const t = findTypeMapEntry(typeMap, tx.aptName, tx.area);
      const labelM2 = t ? t.typeM2 : `${tx.area}m²`;
      const labelPyeong = t ? (t.typePyeong || t.typeM2) : `${tx.areaPyeong || Math.round(tx.area * 0.3025)}평`;
      
      // 전세/월세 보증금 전환가 미리 계산
      const calcPrice = (tx.dealType === '전세' || tx.dealType === '월세')
        ? (tx.deposit || 0) + Math.round((tx.monthlyRent || 0) * 12 / 0.055)
        : tx.price;
      
      // 날짜를 YYYYMMDD 형태의 숫자로 캐싱
      const dateNum = parseInt(tx.contractYm + String(tx.contractDay || '01').padStart(2, '0'));

      return {
        ...tx,
        calculatedPrice: calcPrice,
        contractDateNum: dateNum,
        areaLabelM2: labelM2,
        areaLabelPyeong: labelPyeong
      };
    });

    // 롤링 윈도우 기반 시계열 이상치 필터링
    const filterOutliersRolling = (txs: typeof mappedTransactions) => {
      // 1. 시간순(오름차순) 정렬 (캐시된 contractDateNum 활용)
      const sortedTxs = [...txs].sort((a, b) => a.contractDateNum - b.contractDateNum);

      // 2. 면적별 그룹화
      const byArea: Record<number, typeof mappedTransactions> = {};
      sortedTxs.forEach(t => {
        const a = Math.round(t.area);
        if (!byArea[a]) byArea[a] = [];
        byArea[a].push(t);
      });

      const validTxs: typeof mappedTransactions = [];
      Object.values(byArea).forEach(group => {
        const filtered = group.filter((t, idx) => {
          // 앞뒤 5건씩 총 11건의 국소 윈도우 생성
          const windowTxs = group.slice(Math.max(0, idx - 5), Math.min(group.length, idx + 6));
          const p = t.calculatedPrice;
          
          // 현재 분석하려는 항목을 제외한 윈도우의 통계를 활용하여 이상치 탐지의 자가 오염 방지
          const localIdx = idx - Math.max(0, idx - 5);
          const otherPrices = windowTxs.filter((_, wIdx) => wIdx !== localIdx).map(wt => wt.calculatedPrice);
          
          if (otherPrices.length < 3) return true; // 비교 표본이 부족하면 패스
          
          const mean = otherPrices.reduce((sum, val) => sum + val, 0) / otherPrices.length;
          const variance = otherPrices.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / otherPrices.length;
          const stdDev = Math.sqrt(variance);
          
          // 1. 하위 가격(급매 등) 필터링: 최소 5% 편차 여유 기준 2 표준편차 이하인 거래 제외
          if (p < mean) {
            return (mean - p) <= 2 * Math.max(stdDev, mean * 0.05);
          }
          // 2. 상위 가격(기입 오류 또는 10억/110 등 기형 월세 거래) 필터링: 3 표준편차 초과 시 제외
          return (p - mean) <= 3 * Math.max(stdDev, mean * 0.05);
        });
        validTxs.push(...filtered);
      });
      return validTxs;
    };

    const saleTxs = mappedTransactions.filter(t => !t.dealType || (t.dealType !== '전세' && t.dealType !== '월세'));
    const jeonseTxs = mappedTransactions.filter(t => {
      if (t.dealType === '전세') return true;
      if (t.dealType === '월세' && t.monthlyRent && t.monthlyRent > 0) return true;
      return false;
    });

    const finalSale = filterOutliers ? filterOutliersRolling(saleTxs) : saleTxs;
    const finalJeonse = filterOutliers ? filterOutliersRolling(jeonseTxs) : jeonseTxs;

    const combined = [...finalSale, ...finalJeonse];

    // 정렬 (캐시된 contractDateNum 활용하여 내림차순 정렬)
    return combined.sort((a, b) => {
      if (a.contractDateNum !== b.contractDateNum) return b.contractDateNum - a.contractDateNum;
      return b.price - a.price;
    });
  }, [rawTransactions, filterOutliers, typeMap]);

  const valuation = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return { status: 'fair', amount: '0', ratio: 0, priceStr: '0' };
    }

    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const oneMonthAgoNum = oneMonthAgo.getFullYear() * 10000 + (oneMonthAgo.getMonth() + 1) * 100 + oneMonthAgo.getDate();

    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const threeMonthsAgoNum = threeMonthsAgo.getFullYear() * 10000 + (threeMonthsAgo.getMonth() + 1) * 100 + threeMonthsAgo.getDate();

    const isRecent1M = (t: any) => (t.contractDateNum || 0) >= oneMonthAgoNum;
    const isRecent3M = (t: any) => (t.contractDateNum || 0) >= threeMonthsAgoNum;

    const sales = transactions.filter(t => t.dealType !== '전세' && t.dealType !== '월세');
    const rents = transactions.filter(t => t.dealType === '전세' || t.dealType === '월세');

    const recentSales1M = sales.filter(isRecent1M);
    const recentSales3M = sales.filter(isRecent3M);

    const recentRents1M = rents.filter(isRecent1M);
    const recentRents3M = rents.filter(isRecent3M);

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
      const m = report.metrics as any;
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
      const m = report.metrics as any;
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

    let status = 'fair';
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

    return { status, amount, ratio: jeonseRatio, priceStr };
  }, [transactions, report]);

  const jeonseSafetyData = useMemo(() => {
    if (!transactions || transactions.length === 0) return null;
    const sales = transactions.filter(t => t.dealType !== '전세' && t.dealType !== '월세');
    const rents = transactions.filter(t => t.dealType === '전세' || t.dealType === '월세');
    
    const latestSale = sales[0]?.price || 0;
    const latestRent = rents[0] ? (rents[0].calculatedPrice || rents[0].price || 0) : 0;
    
    const ratio = latestSale > 0 ? (latestRent / latestSale) : 0;
    
    return {
      latestPrice: latestSale,
      latestDeposit: latestRent,
      ratio
    };
  }, [transactions]);

  // 특정 평형 필터 칩 목록 (사전 계산된 필드 활용)
  const areaFilterChips = useMemo(() => {
    const rawAreas = Array.from(new Set(transactions.map(tx => {
      return areaUnit === 'm2' ? tx.areaLabelM2! : tx.areaLabelPyeong!;
    })));
    return ['전체', ...rawAreas.sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.match(/\d+/)?.[0] || '0');
      return numA - numB;
    })];
  }, [transactions, areaUnit]);

  // 필터링된 실거래 목록 (사전 계산된 필드 활용)
  const filteredTransactions = useMemo(() => {
    if (selectedAreaFilter === '전체') return transactions;
    return transactions.filter(tx => {
      const label = areaUnit === 'm2' ? tx.areaLabelM2 : tx.areaLabelPyeong;
      return label === selectedAreaFilter;
    });
  }, [transactions, selectedAreaFilter, areaUnit]);

  // Hydration-safe portal mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent body scroll when modal is open (with native mobile support)
  useEffect(() => {
    if (!inline && mounted) {
      const scrollY = window.scrollY;
      
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const originalWidth = document.body.style.width;

      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';

      return () => {
        document.body.style.overflow = originalOverflow || '';
        document.body.style.position = originalPosition || '';
        document.body.style.top = originalTop || '';
        document.body.style.width = originalWidth || '';
        
        window.scrollTo(0, scrollY);
      };
    }
  }, [inline, mounted]);


  const isUnlocked = true;
  const isStub = report.id.startsWith('stub-');
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollToSection = (id: string) => {
    setActiveTab(id);
    if (id === 'sec-summary' && modalRef.current) {
      // Summary = first section, just scroll modal to top
      modalRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = modalRef.current?.querySelector(`#${id}`);
    if (el && modalRef.current) {
      const topPos = el.getBoundingClientRect().top + modalRef.current.scrollTop - modalRef.current.getBoundingClientRect().top - 70;
      modalRef.current.scrollTo({ top: topPos, behavior: 'smooth' });
    }
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
          console.error('Canvas tainting or drawing error:', e);
          window.open(imageUrl, '_blank');
        }
      };
      
      img.onerror = () => {
        console.warn('Canvas download failed due to load error, falling back to original image.');
        window.open(imageUrl, '_blank');
      };
    } catch (error) {
      console.error('Failed to download watermarked image', error);
      window.open(imageUrl, '_blank');
    }
  };

  const handleScroll = () => {
    if (!modalRef.current) return;

    // Top 버튼 상태 감지
    if (modalRef.current.scrollTop > 400) {
      setShowScrollTop(true);
    } else {
      setShowScrollTop(false);
    }

    const sections = ['sec-summary', 'sec-infra-metrics', 'sec-education', 'sec-valuation', 'sec-jeonse-safety', 'sec-photos', 'sec-comments'];
    let current = 'sec-summary';
    for (const id of sections) {
      if (id === 'sec-summary') continue;
      const el = modalRef.current.querySelector(`#${id}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        const containerRect = modalRef.current.getBoundingClientRect();
        if (rect.top - containerRect.top < 300) {
          current = id;
        }
      }
    }
    setActiveTab(current);
  };

  // Unused variables (coverImage, rating, badge color utils, type filter constants) removed to optimize code hygiene.
  const s = report.sections;

  const handleKakaoShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    const shareTheme = getAutoShareTheme();
    const baseUrl = window.location.origin;

    try {
      // Allow React to mount the off-screen share card DOM before capture
      await new Promise(resolve => setTimeout(resolve, 150));

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

      let imageFile: File | undefined = undefined;

      if (shareCardRef.current) {
        // html2canvas를 동적 임포트하여 클라이언트 사이드에서만 실행되도록 함
        const html2canvasProInstance = (await import('html2canvas-pro')).default;
        
        const canvas = await safeHtml2canvasPro(html2canvasProInstance, shareCardRef.current, {
          width: 1200,
          height: 630,
          scale: 1.5, // 1.5배 스케일로 카카오 업로드 용량 제한(5MB) 이내 유지하면서 선명한 화질 확보
          useCORS: true,
          backgroundColor: '#0f172a',
          logging: false
        });

        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/png');
        });

        if (blob) {
          imageFile = new File([blob], `dview_share_${normalizeAptName(report.apartmentName)}.png`, { type: 'image/png' });
        }
      }

      // activeTab에 기반한 동적 분기 처리
      let imageUrl = '';
      let customTitle = '';
      let customDesc = '';

      if (activeTab === 'sec-education' && report.metrics) {
        const eduScoreInfo = calculateEducationScore(report.metrics);
        const grade = eduScoreInfo.grade;
        const score = eduScoreInfo.score;
        imageUrl = `${baseUrl}/api/og?shareType=childcare&grade=${grade}&score=${score}&title=${encodeURIComponent(displayAptName)}`;
        customTitle = `🏫 [육아·학군] ${displayAptName} - ${grade}등급`;
        customDesc = `종합 육아 환경 지수 ${score}점 (${eduScoreInfo.description.split(' (')[0]}). 초등학교 통학 및 학원가 인프라 상세 분석을 D-VIEW에서 확인하세요.`;
      } else if (activeTab === 'sec-infra-metrics' && report.metrics) {
        const infraScoreInfo = calculateInfraScore(report.metrics);
        const grade = infraScoreInfo.grade;
        const score = infraScoreInfo.score;
        imageUrl = `${baseUrl}/api/og?shareType=infra&grade=${grade}&score=${score}&title=${encodeURIComponent(displayAptName)}`;
        customTitle = `🚇 [입지·인프라] ${displayAptName} - ${grade}등급`;
        customDesc = `종합 생활 인프라 지수 ${score}점 (${infraScoreInfo.description.split(' (')[0]}). 대중교통 접근성 및 핵심 상권 밀집 분석을 D-VIEW에서 확인하세요.`;
      } else {
        const shareTexts = getShareText(shareTheme, priceEok, priceMan, ratio);
        const status = ratio >= 65 ? "갭투자추천" : "인기단지";
        imageUrl = `${baseUrl}/api/og?type=apartment&title=${encodeURIComponent(displayAptName)}&price=${encodeURIComponent(priceStr)}&ratio=${ratio.toFixed(1)}&status=${encodeURIComponent(status)}&valStatus=${valuation.status}&valAmount=${encodeURIComponent(valuation.amount)}`;
        customTitle = shareTexts.title;
        customDesc = shareTexts.desc;
      }

      await shareAptToKakao({
        aptName: displayAptName,
        priceEok,
        priceMan,
        ratio,
        imageUrl,
        imageFile,
        customTitle,
        customDesc,
        valStatus: valuation.status,
        valAmount: valuation.amount
      });
      incrementViralShareCount();
    } catch (error) {
      console.error("Kakao share card generation failed:", error);
      showToast("공유 이미지 생성 중 오류가 발생했습니다. 기본 템플릿으로 공유합니다.");
      
      // Fallback
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

      let imageUrl = '';
      let customTitle = '';
      let customDesc = '';

      if (activeTab === 'sec-education' && report.metrics) {
        const eduScoreInfo = calculateEducationScore(report.metrics);
        const grade = eduScoreInfo.grade;
        const score = eduScoreInfo.score;
        imageUrl = `${baseUrl}/api/og?shareType=childcare&grade=${grade}&score=${score}&title=${encodeURIComponent(displayAptName)}`;
        customTitle = `🏫 [육아·학군] ${displayAptName} - ${grade}등급`;
        customDesc = `종합 육아 환경 지수 ${score}점 (${eduScoreInfo.description.split(' (')[0]}). 초등학교 통학 및 학원가 인프라 상세 분석을 D-VIEW에서 확인하세요.`;
      } else if (activeTab === 'sec-infra-metrics' && report.metrics) {
        const infraScoreInfo = calculateInfraScore(report.metrics);
        const grade = infraScoreInfo.grade;
        const score = infraScoreInfo.score;
        imageUrl = `${baseUrl}/api/og?shareType=infra&grade=${grade}&score=${score}&title=${encodeURIComponent(displayAptName)}`;
        customTitle = `🚇 [입지·인프라] ${displayAptName} - ${grade}등급`;
        customDesc = `종합 생활 인프라 지수 ${score}점 (${infraScoreInfo.description.split(' (')[0]}). 대중교통 접근성 및 핵심 상권 밀집 분석을 D-VIEW에서 확인하세요.`;
      } else {
        const shareTexts = getShareText(shareTheme, priceEok, priceMan, ratio);
        const status = ratio >= 65 ? "갭투자추천" : "인기단지";
        imageUrl = `${baseUrl}/api/og?type=apartment&title=${encodeURIComponent(displayAptName)}&price=${encodeURIComponent(priceStr)}&ratio=${ratio.toFixed(1)}&status=${encodeURIComponent(status)}&valStatus=${valuation.status}&valAmount=${encodeURIComponent(valuation.amount)}`;
        customTitle = shareTexts.title;
        customDesc = shareTexts.desc;
      }

      await shareAptToKakao({
        aptName: displayAptName,
        priceEok,
        priceMan,
        ratio,
        imageUrl,
        customTitle,
        customDesc,
        valStatus: valuation.status,
        valAmount: valuation.amount
      });
      incrementViralShareCount();
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownloadShareCard = async () => {
    if (isSharing) return;
    setIsSharing(true);
    showToast("📸 요약 카드 이미지를 생성하고 있습니다...");
    
    try {
      // Allow React to mount the off-screen share card DOM before capture
      await new Promise(resolve => setTimeout(resolve, 200));

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

        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `DVIEW_${normalizeAptName(report.apartmentName)}_요약카드.png`;
        link.href = dataUrl;
        link.click();
        
        showToast("🎉 인포그래픽 요약 카드가 이미지 파일로 저장되었습니다!");
        incrementViralShareCount(); // 통계 증가
      } else {
        showToast("이미지 캡처 대상을 찾을 수 없습니다.");
      }
    } catch (error) {
      console.error("Image card download failed:", error);
      showToast("이미지 카드 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = () => {
    const baseUrl = window.location.origin;
    let shareUrl = `${baseUrl}/apartment/${encodeURIComponent(report.apartmentName)}`;
    if (activeTab === 'sec-education' && report.metrics) {
      const eduScoreInfo = calculateEducationScore(report.metrics);
      shareUrl = `${baseUrl}/apartment/${encodeURIComponent(report.apartmentName)}?shareType=childcare&grade=${eduScoreInfo.grade}&score=${eduScoreInfo.score}`;
    } else if (activeTab === 'sec-infra-metrics' && report.metrics) {
      const infraScoreInfo = calculateInfraScore(report.metrics);
      shareUrl = `${baseUrl}/apartment/${encodeURIComponent(report.apartmentName)}?shareType=infra&grade=${infraScoreInfo.grade}&score=${infraScoreInfo.score}`;
    }

    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast("🎉 단지 분석 링크가 복사되었습니다. 원하는 곳에 붙여넣으세요!");
      setCopiedStatus('all-link');
      setTimeout(() => setCopiedStatus(null), 1500);
    }).catch((err) => {
      console.error("Link copy failed:", err);
      showToast("링크 복사에 실패했습니다.");
    });
  };

  const handleCopySummary = () => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/apartment/${encodeURIComponent(report.apartmentName)}`;
    const latestSale = transactions.find(tx => tx.dealType !== '전세' && tx.dealType !== '월세');
    const latestPrice = latestSale ? (latestSale.priceEok || `${(latestSale.price / 10000).toFixed(1)}억`) : '기록 없음';
    const latestArea = latestSale ? (latestSale.areaLabelM2 || `${latestSale.area}㎡`) : '';

    const eduScoreInfo = report.metrics ? calculateEducationScore(report.metrics) : null;
    const infraScoreInfo = report.metrics ? calculateInfraScore(report.metrics) : null;

    let valuationLabel = '⚖️ 적정 수준 (시세와 적정 가치 균형 상태)';
    if (valuation.status === 'undervalued') {
      valuationLabel = `🟢 저평가 상태 (적정가 대비 약 ${valuation.amount} 메리트!)`;
    } else if (valuation.status === 'overvalued') {
      valuationLabel = `🚨 고평가 상태 (적정가 대비 약 ${valuation.amount} 고평가)`;
    }

    const summaryText = `🏠 [가치분석] 동탄 ${displayAptName} 실거래 & 인프라 요약 📊
🔥 "동탄 입주민 단톡방 및 맘카페 화제의 그 리포트!"
👉 지금 매수해도 안전할까요? 호구 방지 가치분석 결과:

💸 최근 실거래가: ${latestPrice}${latestArea ? ` (전용 ${latestArea})` : ''}
📈 내재가치 평가: ${valuationLabel}
${eduScoreInfo ? `🏫 학군/육아 환경: 🌟 ${eduScoreInfo.score}점 (${eduScoreInfo.grade}등급) - ${eduScoreInfo.description.split(' (')[0]}\n` : ''}${infraScoreInfo ? `🚇 교통/생활 입지: 🛍️ ${infraScoreInfo.score}점 (${infraScoreInfo.grade}등급) - ${infraScoreInfo.description.split(' (')[0]}\n` : ''}
👀 적정 매수가(DCF) 평가 결과 및 학원 셔틀 노선, 대장 단지 비교 분석 완료!
💡 실거래 상승/하락 추이와 학원가, 역세권 미래 호재를 지금 바로 확인해보세요.
👉 ${shareUrl}

#DVIEW #동탄부동산 #가치분석 #아파트실거래 #학세권 #동탄맘 #신혼부부`;

    navigator.clipboard.writeText(summaryText).then(() => {
      showToast("🎉 단톡방용 텍스트 요약본이 클립보드에 복사되었습니다!");
      setCopiedStatus('summary');
      setTimeout(() => setCopiedStatus(null), 1500);
    }).catch((err) => {
      console.error("Summary copy failed:", err);
      showToast("요약본 복사에 실패했습니다.");
    });
  };

  const handleNativeShare = async () => {
    const baseUrl = window.location.origin;
    let shareUrl = `${baseUrl}/apartment/${encodeURIComponent(report.apartmentName)}`;
    let title = `${displayAptName} 가치분석 리포트`;
    let desc = '';

    if (activeTab === 'sec-education' && report.metrics) {
      const eduScoreInfo = calculateEducationScore(report.metrics);
      const grade = eduScoreInfo.grade;
      const score = eduScoreInfo.score;
      shareUrl = `${baseUrl}/apartment/${encodeURIComponent(report.apartmentName)}?shareType=childcare&grade=${grade}&score=${score}`;
      title = `🏫 [육아·학군] ${displayAptName} - ${grade}등급`;
      desc = `종합 육아 환경 지수 ${score}점 (${eduScoreInfo.description.split(' (')[0]}). 초등학교 통학 및 학원가 인프라 상세 분석을 D-VIEW에서 확인하세요.`;
    } else if (activeTab === 'sec-infra-metrics' && report.metrics) {
      const infraScoreInfo = calculateInfraScore(report.metrics);
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
          console.error("Native share failed:", err);
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleShareSection = async (type: 'childcare' | 'infra') => {
    if (!report.metrics) return;
    
    const baseUrl = window.location.origin;
    
    if (type === 'childcare') {
      const eduScoreInfo = calculateEducationScore(report.metrics);
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
              setTimeout(() => setCopiedStatus(null), 1500);
            });
          }
        }
      } else {
        navigator.clipboard.writeText(shareUrl).then(() => {
          showToast("🎉 학군·육아 분석 공유 링크가 복사되었습니다!");
          setCopiedStatus('edu-link');
          setTimeout(() => setCopiedStatus(null), 1500);
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
        incrementViralShareCount();
      } catch (e) {
        console.error(e);
      }
    } else {
      const infraScoreInfo = calculateInfraScore(report.metrics);
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
              setTimeout(() => setCopiedStatus(null), 1500);
            });
          }
        }
      } else {
        navigator.clipboard.writeText(shareUrl).then(() => {
          showToast("🎉 입지·인프라 분석 공유 링크가 복사되었습니다!");
          setCopiedStatus('infra-link');
          setTimeout(() => setCopiedStatus(null), 1500);
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
        incrementViralShareCount();
      } catch (e) {
        console.error(e);
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

          <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap">
            {/* 단일화된 공유하기 버튼 (데스크톱/모바일 전체 지원) */}
            <button
              onClick={handleNativeShare}
              className={`px-4 py-2 rounded-2xl shadow-sm flex items-center gap-1.5 font-extrabold text-[13.5px] border cursor-pointer transform transition-all duration-200 active:scale-[0.94] ${
                copiedStatus === 'all-link'
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/30 text-emerald-800 dark:text-emerald-400'
                  : 'bg-[#f2f4f6] hover:bg-[#e5e8eb] text-secondary border-border/20'
              }`}
              title="아파트 분석 리포트 공유하기"
            >
              {copiedStatus === 'all-link' ? (
                <Check size={15} strokeWidth={2.5} className="text-emerald-500" />
              ) : (
                <Share size={15} strokeWidth={2.5} className="text-secondary/80" />
              )}
              <span>{copiedStatus === 'all-link' ? '복사 완료!' : '공유하기'}</span>
            </button>

            {/* 단톡방 요약 복사 버튼 */}
            <button
              onClick={handleCopySummary}
              className={`px-4 py-2 rounded-2xl shadow-sm flex items-center gap-1.5 font-extrabold text-[13.5px] border cursor-pointer transform transition-all duration-200 active:scale-[0.94] hover:shadow-md ${
                copiedStatus === 'summary'
                  ? 'bg-emerald-100/90 dark:bg-emerald-900/40 border-emerald-500/40 text-emerald-900 dark:text-emerald-300 scale-[1.03]'
                  : 'bg-emerald-50/60 hover:bg-emerald-100/80 dark:bg-emerald-950/15 dark:hover:bg-emerald-900/25 text-emerald-700 dark:text-emerald-300 border-emerald-100/30 dark:border-emerald-900/30'
              }`}
              title="단톡방용 텍스트 요약 복사"
            >
              {copiedStatus === 'summary' ? (
                <Check size={15} strokeWidth={2.5} className="text-emerald-600 dark:text-emerald-400" />
              ) : (
                <MessageSquare size={15} strokeWidth={2.5} className="text-emerald-600 dark:text-emerald-400" />
              )}
              <span>{copiedStatus === 'summary' ? '요약 복사 완료!' : '단톡방 요약 복사'}</span>
            </button>

            {/* 인포그래픽 요약 이미지 다운로드 버튼 */}
            <button
              onClick={handleDownloadShareCard}
              className="px-4 py-2 bg-neutral-100 dark:bg-zinc-900 hover:bg-[#e5e8eb] dark:hover:bg-zinc-800 text-secondary border border-border/20 rounded-2xl shadow-sm flex items-center gap-1.5 font-extrabold text-[13.5px] cursor-pointer transform transition-all duration-200 active:scale-[0.94] hover:shadow-md"
              title="인포그래픽 요약 카드 이미지 다운로드"
            >
              <Camera size={15} strokeWidth={2.5} className="text-secondary/80" />
              <span>이미지 저장</span>
            </button>

            {/* 통합 금융/분석 드롭다운 도구함 */}
            <div className="relative" ref={toolDropdownRef}>
              <button
                onClick={() => setIsToolDropdownOpen(prev => !prev)}
                className={`px-4 py-2 bg-gradient-to-r from-[#008262] to-[#00a37b] hover:from-[#00a37b] hover:to-[#00b386] text-white rounded-2xl shadow-md flex items-center gap-1.5 font-extrabold text-[13.5px] border-none cursor-pointer transform transition-all duration-200 active:scale-[0.94]`}
                title="AI 분석 리포트 및 부동산 금융 계산기 열기"
              >
                <Calculator size={15} />
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
              {areaFilterChips.length > 2 && (
                areaFilterChips.length > 5 ? (
                  <div className="relative shrink-0">
                    <select
                      value={selectedAreaFilter}
                      onChange={(e) => { setSelectedAreaFilter(e.target.value); loadAllTransactions?.(); }}
                      className="appearance-none bg-[#f2f4f6] hover:bg-[#e5e8eb] text-primary pl-4 pr-9 py-2 rounded-2xl transition-all shadow-sm font-extrabold text-[13.5px] border border-border/20 outline-none cursor-pointer"
                      aria-label="평형 타입 필터 선택"
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
            {!isAnimationFinished || isTxLoading ? (
              <div className="w-full h-[408px] md:h-full rounded-2xl bg-neutral-100 dark:bg-zinc-900/40 border border-neutral-100/50 dark:border-zinc-900/20 animate-pulse flex items-center justify-center">
                <span className="text-[12px] font-bold text-tertiary">거래 데이터 분석 중...</span>
              </div>
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
              {!isAnimationFinished || isTxLoading ? (
                <div className="w-full h-[519px] md:h-[544px] rounded-2xl bg-neutral-100 dark:bg-zinc-900/40 border border-neutral-100/50 dark:border-zinc-900/20 animate-pulse flex items-center justify-center">
                  <span className="text-[12px] font-bold text-tertiary">시세 차트 로딩 중...</span>
                </div>
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
        <div className="w-full h-[440px] md:h-[390px] rounded-2xl bg-neutral-100 dark:bg-zinc-900/40 border border-neutral-100/50 dark:border-zinc-900/20 animate-pulse mt-4" />
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
                  { id: 'sec-summary', label: '단지 기본정보', show: true },
                  { id: 'sec-infra-metrics', label: '단지 입지정보', show: !!report.metrics },
                  { id: 'sec-education', label: '학군/육아 분석', show: !!report.metrics },
                  { id: 'sec-valuation', label: '밸류에이션 분석', show: transactions.length > 0 },
                  { id: 'sec-jeonse-safety', label: '전세 안전 진단', show: transactions.length > 0 },
                  { id: 'sec-photos', label: '우리 단지 갤러리', show: true },
                  { id: 'sec-comments', label: '아파트 이야기', show: true },
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

            {/* 1. 단지 기본 명세 (Specs) */}
            <ApartmentSpecsSection
              report={report}
              inline={inline}
              managerPost={managerPost}
              parsedTitle={parsedTitle}
              displayAptName={displayAptName}
              onClose={onClose}
            />

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
              <InfraAnalysisSection
                report={report}
                inline={inline}
                copiedStatus={copiedStatus}
                handleShareSection={handleShareSection}
              />

              {/* 🎓 학군 및 육아 분석 컨테이너 */}
              <EducationAnalysisSection
                report={report}
                isUnlocked={isUnlocked}
                inline={inline}
                viralShareCount={viralShareCount}
                copiedStatus={copiedStatus}
                handleShareSection={handleShareSection}
                handleKakaoShare={handleKakaoShare}
                displayAptName={displayAptName}
              />

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
                  <div className={!isUnlocked ? 'filter blur-sm select-none pointer-events-none opacity-40' : ''}>
                    <ErrorBoundary name="밸류에이션 분석">
                      <AdvancedValuationMetrics report={report} transactions={transactions} />
                    </ErrorBoundary>
                    <BuyOrWaitVote aptName={report.apartmentName} valuationStatus={valuation.status} valuationAmount={valuation.amount} />
                  </div>
                  {!isUnlocked && (
                    <div className="absolute inset-0 flex items-center justify-center p-4 z-10 bg-surface/10 dark:bg-black/10 backdrop-blur-[2px]">
                      <ViralPaywallGate 
                        shareCount={viralShareCount} 
                        onShare={handleKakaoShare} 
                        onAlternativeUnlock={handleAlternativeUnlock} 
                      />
                    </div>
                  )}
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
                      <div className={!isUnlocked ? 'filter blur-sm select-none pointer-events-none opacity-40' : ''}>
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
                      </div>
                      {!isUnlocked && (
                        <div className="absolute inset-0 flex items-center justify-center p-4 z-10 bg-surface/10 dark:bg-black/10 backdrop-blur-[2px]">
                          <ViralPaywallGate 
                            shareCount={viralShareCount} 
                            onShare={handleKakaoShare} 
                            onAlternativeUnlock={handleAlternativeUnlock} 
                          />
                        </div>
                      )}
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

              {/* Comments Section */}
              <section id="sec-comments">
                <ErrorBoundary name="임장기 댓글">
                  <CommentSection
                    comments={comments}
                    commentInput={commentInput}
                    onCommentChange={onCommentChange}
                    onSubmitComment={handleCommentSubmitWithUnlock}
                    user={user}
                    isUnlocked={isUnlocked}
                    selectedCommentId={selectedCommentId}
                    onRequestLogin={onRequestLogin}
                  />
                </ErrorBoundary>
              </section>
            </>
          ) : (
            <div className="w-full py-16 flex flex-col items-center justify-center gap-3 bg-surface/30 rounded-3xl border border-border/50 animate-pulse">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              <span className="text-[13px] font-bold text-secondary">리포트 분석을 구성하는 중...</span>
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
                await updateDoc(doc(db, 'scoutingReports', report.id), {
                  thumbnailUrl: currentImgData.url
                });
                alert('대표 썸네일이 변경되었습니다. 새로고침 시 반영됩니다.');
              } catch (err) {
                console.error(err);
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
      <div ref={modalRef} onScroll={handleScroll} className="bg-surface h-full flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar">
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
          onMouseEnter={loadAllTransactions}
          onTouchStart={loadAllTransactions}
          className={`relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 w-full ${isFullscreen ? 'h-full max-w-none rounded-none' : 'max-w-[1275px] h-[100dvh] md:h-auto md:max-h-[95vh] rounded-none md:rounded-[24px]'} flex flex-col shadow-2xl transition-transform duration-300 ring-1 ring-black/5 dark:ring-white/10 slide-in-from-bottom overflow-hidden`}
        >

          <header className="absolute top-6 right-6 md:top-7 md:right-8 z-[100] hidden md:flex items-center gap-3">
            <button onClick={onClose} className="bg-surface/90 hover:bg-surface text-secondary border border-border w-10 h-10 flex items-center justify-center rounded-full transition-colors shadow-lg shrink-0 group">
              <X size={20} className="group-hover:scale-110 transition-transform" />
            </button>
          </header>
          
          <div ref={modalRef} onScroll={handleScroll} className="w-full h-full overflow-y-auto overflow-x-hidden custom-scrollbar pb-24 md:pb-0 flex flex-col">
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
              >
                <Camera size={24} strokeWidth={2.5} className="text-secondary/80" />
              </button>

              <button
                onClick={handleNativeShare}
                className={`flex-1 h-[56px] text-white font-extrabold text-[15px] sm:text-[16px] rounded-2xl flex items-center justify-center gap-2 transition-all transform duration-200 active:scale-[0.95] ${
                  copiedStatus === 'all-link'
                    ? 'bg-emerald-600 shadow-[0_8px_16px_rgba(16,185,129,0.2)] hover:shadow-[0_10px_20px_rgba(16,185,129,0.3)]'
                    : 'bg-[#008262] active:bg-[#006b50] shadow-[0_8px_16px_rgba(0,130,98,0.2)] hover:shadow-[0_10px_20px_rgba(0,130,98,0.3)] hover:-translate-y-0.5'
                }`}
              >
                {copiedStatus === 'all-link' ? (
                  <Check size={20} strokeWidth={2.5} className="mr-0.5 text-white" />
                ) : (
                  <Share size={20} strokeWidth={2.5} className="mr-0.5" />
                )}
                {copiedStatus === 'all-link' ? '공유 링크 복사 완료!' : '이 아파트 분석 리포트 공유하기'}
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
    </>,
    document.getElementById('modal-root') || document.body
  );
}

export default FieldReportModal;
