'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  MapPin, X, Camera,
  Building, Info, ShieldAlert, Radar, ChevronDown, ArrowLeft, Download, Share,
  Crown, ChevronRight, GraduationCap
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { normalize84Price } from '@/lib/utils/valuation';
import { normalizeAptName, getDisplayAptName, findTypeMapEntry } from '@/lib/utils/apartmentMapping';
import type { CommentData, FieldReportData } from '@/lib/DashboardFacade';
import type { User } from 'firebase/auth';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { createPortal } from 'react-dom';
import CommentSection from '@/components/CommentSection';
import { ApartmentGallery } from './apartment-modal/ApartmentGallery';
import { TransactionTable } from './apartment-modal/TransactionTable';
const TransactionChartSection = dynamic(() => import('./apartment-modal/TransactionChartSection').then(mod => mod.TransactionChartSection), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-body/50 rounded-2xl animate-pulse">
      <span className="text-tertiary text-[13px] font-bold">차트 로드 중...</span>
    </div>
  )
});
import { TransactionSummaryMetrics } from './apartment-modal/TransactionSummaryMetrics';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { PhotoUploadModal } from './apartment-modal/PhotoUploadModal';
import { useSettings } from '@/lib/contexts/SettingsContext';
import { shareAptToKakao } from '@/lib/utils/kakaoShare';
import BuyOrWaitVote from './apartment-modal/BuyOrWaitVote';
import { safeHtml2canvasPro } from '@/lib/utils/html2canvasPatch';

const AdvancedValuationMetrics = dynamic(() => import('@/components/consumer/AdvancedValuationMetrics'), { ssr: false });
const AnchorTenantCard = dynamic(() => import('@/components/consumer/AnchorTenantCard'), { ssr: false });
// PaymentButton 비활성화 (Vercel Hobby Plan 호환성 — 추후 유료 모델 전환 시 복원)
// const PaymentButton = dynamic(() => import('@/components/PaymentButton'), { ssr: false });
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
  onOpenAdModal
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
  isPurchased?: boolean;
  isAdmin?: boolean;
  onPurchaseComplete?: () => void;
  inline?: boolean;
  txSummary?: any;
  onOpenAdModal?: () => void;
}) {
  useSwipeNavigation({ onBack: onClose });
  const { areaUnit, setAreaUnit } = useSettings();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const displayAptName = getDisplayAptName(report.apartmentName);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('sec-summary');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('전체');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

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

  const getShareText = (theme: 'value' | 'gap' | 'school' | 'deal', priceEok: number, priceMan: number, ratio: number) => {
    const priceStr = priceMan > 0 ? `${priceEok}억 ${priceMan.toLocaleString()}만원` : `${priceEok}억원`;
    const aptName = displayAptName;

    switch (theme) {
      case 'gap':
        return {
          title: `🚀 갭투자 추천! ${aptName}`,
          desc: `최근 실거래가 ${priceStr}, 전세가율 ${ratio.toFixed(1)}%! 예산 맞춤 갭투자 가능 여부를 D-VIEW에서 바로 조회해보세요.`
        };
      case 'school':
        return {
          title: `🏫 학세권&초품아 정보: ${aptName}`,
          desc: `도보 통학이 가능한 학군 분석 완료. 최근 실거래 ${priceStr}, 전세가율 ${ratio.toFixed(1)}% 정보를 지금 확인해보세요.`
        };
      case 'deal':
        return {
          title: `📉 최신 실거래 정보: ${aptName}`,
          desc: `최근 실거래 ${priceStr} (전세가율 ${ratio.toFixed(1)}%). 급매 여부 및 세부 등락 트렌드를 D-VIEW에서 체크하세요.`
        };
      case 'value':
      default:
        return {
          title: `🧐 지금 사면 호구일까? ${aptName} 가치분석`,
          desc: `최근 실거래가 ${priceStr}, 전세가율 ${ratio.toFixed(1)}%\n현재 D-VIEW에서 10년 치 트렌드를 확인하세요.`
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
        
        // 1. Try querying category "매니저 임장기"
        const q1 = query(collection(db, 'posts'), where('category', '==', '매니저 임장기'));
        const snap1 = await getDocs(q1);
        let matchedId = null;
        let matchedTitle = '';
        
        snap1.forEach((d: any) => {
          const data = d.data();
          const t = data.title || '';
          const c = data.content || '';
          if (t.includes(shortName) || c.includes(shortName)) {
            matchedId = d.id;
            matchedTitle = t;
          }
        });

        // 2. Try querying category "동탄 임장/분석" if not found
        if (!matchedId) {
          const q2 = query(collection(db, 'posts'), where('category', '==', '동탄 임장/분석'));
          const snap2 = await getDocs(q2);
          snap2.forEach((d: any) => {
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
    
    // 롤링 윈도우 기반 시계열 이상치 필터링 (최근 11건 기준 국소적 평균/표준편차 적용)
    const filterOutliersRolling = (txs: TransactionRecord[]) => {
      // 1. 시간순(오름차순) 정렬
      const sortedTxs = [...txs].sort((a, b) => {
        const d1 = parseInt(a.contractYm + String(a.contractDay).padStart(2, '0'));
        const d2 = parseInt(b.contractYm + String(b.contractDay).padStart(2, '0'));
        return d1 - d2;
      });

      // 2. 면적별 그룹화
      const byArea: Record<number, TransactionRecord[]> = {};
      sortedTxs.forEach(t => {
        const a = Math.round(t.area);
        if (!byArea[a]) byArea[a] = [];
        byArea[a].push(t);
      });

      const validTxs: TransactionRecord[] = [];
      Object.values(byArea).forEach(group => {
        const filtered = group.filter((t, idx) => {
          // 앞뒤 5건씩 총 11건의 국소 윈도우 생성
          const windowTxs = group.slice(Math.max(0, idx - 5), Math.min(group.length, idx + 6));
          const prices = windowTxs.map(wt => {
            return (wt.dealType === '전세' || wt.dealType === '월세') 
              ? (wt.deposit || 0) + Math.round((wt.monthlyRent || 0) * 12 / 0.055)
              : wt.price;
          });
          const p = (t.dealType === '전세' || t.dealType === '월세') 
            ? (t.deposit || 0) + Math.round((t.monthlyRent || 0) * 12 / 0.055)
            : t.price;
          
          if (prices.length < 4) return true; // 비교 표본이 부족하면 패스
          
          const mean = prices.reduce((sum, val) => sum + val, 0) / prices.length;
          const variance = prices.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / prices.length;
          const stdDev = Math.sqrt(variance);
          
          // 최소 5%의 편차 여유를 두어 안정된 가격대에서의 미세한 변동이 삭제되는 것 방지
          return Math.abs(p - mean) <= 2 * Math.max(stdDev, mean * 0.05);
        });
        validTxs.push(...filtered);
      });
      return validTxs;
    };

    const saleTxs = rawTransactions.filter(t => !t.dealType || (t.dealType !== '전세' && t.dealType !== '월세'));
    const jeonseTxs = rawTransactions.filter(t => {
      if (t.dealType === '전세') return true;
      if (t.dealType === '월세' && t.monthlyRent && t.monthlyRent > 0) return true;
      return false;
    });

    const finalSale = filterOutliers ? filterOutliersRolling(saleTxs) : saleTxs;
    const finalJeonse = filterOutliers ? filterOutliersRolling(jeonseTxs) : jeonseTxs;

    const combined = [...finalSale, ...finalJeonse];

    return combined.sort((a, b) => {
      const da = a.contractYm + String(a.contractDay).padStart(2, '0');
      const db = b.contractYm + String(b.contractDay).padStart(2, '0');
      if (da !== db) return parseInt(db) - parseInt(da);
      return b.price - a.price;
    });
  }, [rawTransactions, filterOutliers]);

  // 특정 평형 필터 칩 목록
  const areaFilterChips = useMemo(() => {
    const rawAreas = Array.from(new Set(transactions.map(tx => {
      const t = findTypeMapEntry(typeMap, tx.aptName, tx.area);
      return t ? (areaUnit === 'm2' ? t.typeM2 : (t.typePyeong || t.typeM2)) : (areaUnit === 'm2' ? `${tx.area}m²` : `${tx.areaPyeong}평`);
    })));
    return ['전체', ...rawAreas.sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.match(/\d+/)?.[0] || '0');
      return numA - numB;
    })];
  }, [transactions, typeMap, areaUnit]);

  // 필터링된 실거래 목록
  const filteredTransactions = useMemo(() => {
    if (selectedAreaFilter === '전체') return transactions;
    return transactions.filter(tx => {
      const t = findTypeMapEntry(typeMap, tx.aptName, tx.area);
      const label = t ? (areaUnit === 'm2' ? t.typeM2 : (t.typePyeong || t.typeM2)) : (areaUnit === 'm2' ? `${tx.area}m²` : `${tx.areaPyeong}평`);
      return label === selectedAreaFilter;
    });
  }, [transactions, selectedAreaFilter, typeMap, areaUnit]);

  // Hydration-safe portal mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!inline && mounted) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [inline, mounted]);


  // TODO: 유료 모델 전환 시 아래 라인 복원
  // const isUnlocked = !!(isPurchased || isAdmin);
  const isUnlocked = true; // 프리미엄 콘텐츠 전면 개방 (Vercel Hobby Plan 대응)
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

    const sections = ['sec-summary', 'sec-infra-metrics', 'sec-education', 'sec-valuation', 'sec-photos', 'sec-comments'];
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

      const shareTexts = getShareText(shareTheme, priceEok, priceMan, ratio);
      const encodedTitle = encodeURIComponent(shareTexts.title);
      const encodedDesc = encodeURIComponent(`실거래가 ${priceEok}억${priceMan > 0 ? ` ${priceMan.toLocaleString()}만` : ''}원, 전세가율 ${ratio.toFixed(1)}%`);

      await shareAptToKakao({
        aptName: displayAptName,
        priceEok,
        priceMan,
        ratio,
        imageUrl: `https://dongtanview.com/api/og?title=${encodedTitle}&subtitle=${encodedDesc}`,
        imageFile,
        customTitle: shareTexts.title,
        customDesc: shareTexts.desc
      });
    } catch (error) {
      console.error("Kakao share card generation failed:", error);
      alert("공유 이미지 생성 중 오류가 발생했습니다. 기본 템플릿으로 공유합니다.");
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
      
      const shareTexts = getShareText(shareTheme, priceEok, priceMan, ratio);
      const encodedTitle = encodeURIComponent(shareTexts.title);
      const encodedDesc = encodeURIComponent(`실거래가 ${priceEok}억${priceMan > 0 ? ` ${priceMan.toLocaleString()}만` : ''}원, 전세가율 ${ratio.toFixed(1)}%`);

      await shareAptToKakao({
        aptName: displayAptName,
        priceEok,
        priceMan,
        ratio,
        imageUrl: `https://dongtanview.com/api/og?title=${encodedTitle}&subtitle=${encodedDesc}`,
        customTitle: shareTexts.title,
        customDesc: shareTexts.desc
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/#apt=${encodeURIComponent(report.apartmentName)}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("단지 링크가 복사되었습니다. 원하는 곳에 붙여넣기 하세요!");
    }).catch((err) => {
      console.error("Link copy failed:", err);
      alert("링크 복사에 실패했습니다.");
    });
  };

  const handleNativeShare = async () => {
    const shareUrl = `${window.location.origin}/#apt=${encodeURIComponent(report.apartmentName)}`;
    const title = `${displayAptName} 가치분석 리포트`;
    
    // Extract price and jeonse logic identical to kakao share
    const saleTxs = transactions.filter(t => !t.dealType || (t.dealType !== '전세' && t.dealType !== '월세'));
    const jeonseTxs = transactions.filter(t => t.dealType === '전세');
    const latestSale = saleTxs[0];
    const latestJeonse = jeonseTxs[0];

    const price = latestSale ? latestSale.price : 0;
    const jeonsePrice = latestJeonse ? latestJeonse.deposit || 0 : 0;
    
    const priceEok = Math.floor(price / 10000);
    const priceMan = price % 10000;
    const ratio = price > 0 && jeonsePrice > 0 ? (jeonsePrice / price) * 100 : 0;

    const desc = `실거래가 ${priceEok}억${priceMan > 0 ? ` ${priceMan.toLocaleString()}만` : ''}원, 전세가율 ${ratio.toFixed(1)}%\nDVIEW에서 ${displayAptName} 단지의 입지, 학군, 실거래가 밸류에이션 리포트를 지금 확인해보세요.`;

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


  const content = (
    <>
      {/* ── Unified Header ── */}
      <div className="w-full bg-surface pt-8 md:pt-10 pb-6 px-4 md:px-10 border-b border-border rounded-t-none md:rounded-t-3xl relative z-20">
        <div className="w-full flex flex-col lg:flex-row lg:items-end justify-between gap-4">
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
            <h1 className="text-3xl sm:text-4xl md:text-[40px] font-extrabold leading-tight tracking-tight text-primary flex items-center gap-2 w-full min-w-0 flex-wrap">
              <span className="truncate">{displayAptName}</span>
            </h1>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap w-full lg:w-auto">
            {/* 평형 필터 (5개 초과 시 드롭다운, 5개 이하 시 칩스 형식) */}
            {areaFilterChips.length > 2 && (
              areaFilterChips.length > 5 ? (
                <div className="relative shrink-0">
                  <select
                    value={selectedAreaFilter}
                    onChange={(e) => setSelectedAreaFilter(e.target.value)}
                    className="appearance-none bg-[#f2f4f6] hover:bg-[#e5e8eb] text-primary pl-4 pr-9 py-2 rounded-2xl transition-all shadow-sm font-extrabold text-[13.5px] border border-border/20 outline-none cursor-pointer"
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
                <div className="bg-[#f2f4f6] p-0.5 rounded-2xl flex items-center shadow-inner border border-border/20 gap-0.5 overflow-x-auto max-w-full [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {areaFilterChips.map(chip => {
                    const isActive = selectedAreaFilter === chip;
                    return (
                      <button
                        key={chip}
                        onClick={() => setSelectedAreaFilter(chip)}
                        className={`shrink-0 px-4 py-2 rounded-xl text-[13.5px] font-extrabold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-surface text-primary shadow-sm border-none'
                            : 'text-tertiary hover:text-secondary'
                        }`}
                      >
                        {chip}
                      </button>
                    );
                  })}
                </div>
              )
            )}

            {/* 매매/전월세 토글 */}
            <div className="bg-[#f2f4f6] p-0.5 rounded-2xl flex items-center shadow-inner border border-border/20">
              <button onClick={() => setChartType('sale')} className={`px-4 py-2 rounded-xl text-[13.5px] font-extrabold transition-all ${chartType === 'sale' ? 'bg-surface text-primary shadow-sm border-none' : 'text-tertiary hover:text-secondary'}`}>매매</button>
              <button onClick={() => setChartType('jeonse')} className={`px-4 py-2 rounded-xl text-[13.5px] font-extrabold transition-all ${chartType === 'jeonse' ? 'bg-surface text-primary shadow-sm border-none' : 'text-tertiary hover:text-secondary'}`}>전월세</button>
            </div>

            {/* 이상 거래 필터 스위치 */}
            <div className="flex items-center gap-2 bg-[#f2f4f6] px-3.5 py-2 rounded-2xl border border-border/20 shadow-sm shrink-0">
              <span className="text-[12.5px] font-extrabold text-secondary tracking-tight select-none">이상거래 필터</span>
              <button
                onClick={handleToggleFilter}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                  filterOutliers ? 'bg-toss-blue' : 'bg-secondary/20'
                }`}
                role="switch"
                aria-checked={filterOutliers}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    filterOutliers ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 단일화된 공유하기 버튼 (데스크톱/모바일 전체 지원) */}
            <button
              onClick={handleNativeShare}
              className="bg-[#f2f4f6] hover:bg-[#e5e8eb] text-secondary px-4 py-2 rounded-2xl transition-all shadow-sm flex items-center gap-1.5 font-extrabold text-[13.5px] border border-border/20 active:scale-[0.98] cursor-pointer"
              title="아파트 분석 리포트 공유하기"
            >
              <Share size={15} strokeWidth={2.5} className="text-secondary/80" />
              <span>공유하기</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hero Section — Layout: 35% table / 65% chart */}
      <div className={`bg-surface w-full flex flex-col md:flex-row p-4 ${inline ? 'md:p-6' : 'md:px-10 md:py-6'} gap-4 md:gap-8 shrink-0 ${inline ? 'border-b border-body' : 'border-b border-border'}`}>
        
        {/* Left: 실거래가 전체 리스트 (35%) */}
        <div className="w-full md:w-[35%] shrink-0 flex flex-col self-start md:self-stretch">
          <TransactionTable 
            transactions={filteredTransactions} 
            typeMap={typeMap} 
            chartType={chartType} 
            normalizeAptName={normalizeAptName} 
          />
        </div>

        {/* Right: 실거래가 차트 (65%) */}
        <div className="w-full md:w-[65%] flex flex-col">
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
        </div>
      </div>

          {/* ── 평형별 최근 거래가 + 기간별 평균 ── */}
          <TransactionSummaryMetrics 
            transactions={transactions} 
            apartmentName={report.apartmentName}
            typeMap={typeMap}
          />

          {/* Sticky Section Nav */}
          <nav className="sticky top-0 z-[60] bg-surface/95 backdrop-blur-md border-b border-border px-4 md:px-8 pt-[16px] md:pt-[20px] pb-0 shadow-sm shadow-[#191f28]/5">
            <div className="flex gap-6 overflow-x-auto scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden w-full relative">
              {(() => {
                const tabs = [
                  { id: 'sec-summary', label: '단지 기본정보', show: true },
                  { id: 'sec-infra-metrics', label: '단지 입지정보', show: !!report.metrics },
                  { id: 'sec-education', label: '학군/육아 분석', show: !!report.metrics },
                  { id: 'sec-valuation', label: '밸류에이션 분석', show: transactions.length > 0 },
                  { id: 'sec-photos', label: '우리 단지 갤러리', show: true },
                  { id: 'sec-comments', label: '아파트 이야기', show: true },
                ].filter(t => t.show);

                return tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => scrollToSection(tab.id)}
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
            {report.metrics && (
              <div id="sec-specs" className="bg-surface rounded-3xl p-6 md:p-8 shadow-sm border border-border">
                 <h2 className="text-title-lg font-bold text-primary flex items-center gap-2 mb-5 border-b border-border pb-3">
                   <Building size={18} className="text-toss-blue"/> 단지 기본정보
                 </h2>
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                    <div className="bg-body p-3.5 sm:p-4 rounded-xl border border-border">
                      <p className="text-body-sm text-tertiary font-bold mb-1 whitespace-nowrap apt-spec-label">단지명 / 시공사</p>
                      <p className="text-body-normal text-primary font-bold apt-spec-value break-keep">{displayAptName} {report.metrics.brand && <span className="block text-body-sm text-secondary font-medium mt-0.5 apt-spec-label">({report.metrics.brand})</span>}</p>
                    </div>
                    <div className="bg-body p-3.5 sm:p-4 rounded-xl border border-border">
                      <p className="text-body-sm text-tertiary font-bold mb-1 whitespace-nowrap apt-spec-label">사용승인일 (연차)</p>
                      <p className="text-body-normal text-primary font-bold apt-spec-value">
                        {report.metrics.yearBuilt ? (() => {
                          const ybStr = String(report.metrics.yearBuilt);
                          const now = new Date();
                          const currentYear = now.getFullYear();
                          const currentMonth = now.getMonth() + 1;
                          
                          if (ybStr.length >= 6) {
                            const year = parseInt(ybStr.substring(0, 4));
                            const month = parseInt(ybStr.substring(4, 6));
                            const elapsedMonths = (currentYear - year) * 12 + (currentMonth - month);
                            
                            let ageStr = '';
                            if (elapsedMonths < 0) {
                              ageStr = '입주 전';
                            } else if (elapsedMonths === 0) {
                              ageStr = '신축 1개월 미만';
                            } else {
                              const y = Math.floor(elapsedMonths / 12);
                              const m = elapsedMonths % 12;
                              if (y > 0 && m > 0) ageStr = `${y}년 ${m}개월차`;
                              else if (y > 0) ageStr = `${y}년차`;
                              else ageStr = `${m}개월차`;
                            }
                            return <>{year}년 {month}월 <span className="block text-body-sm text-toss-blue font-medium mt-0.5 apt-spec-label">({ageStr})</span></>;
                          }
                          
                          const year = parseInt(ybStr);
                          const age = currentYear - year + 1;
                          return <>{year}년 <span className="block text-body-sm text-toss-blue font-medium mt-0.5 apt-spec-label">({age}년차)</span></>;
                        })() : '-'}
                      </p>
                    </div>
                    <div className="bg-body p-3.5 sm:p-4 rounded-xl border border-border">
                      <p className="text-body-sm text-tertiary font-bold mb-1 whitespace-nowrap apt-spec-label">규모 (세대/층)</p>
                      <p className="text-body-normal text-primary font-bold apt-spec-value">{report.metrics.householdCount ? `${report.metrics.householdCount}세대` : '-'} <span className="block text-tertiary text-body-sm font-medium mt-0.5 apt-spec-label">/ {report.metrics.maxFloor ? `최고 ${report.metrics.maxFloor}층` : '-'}</span></p>
                    </div>
                    <div className="bg-body p-3.5 sm:p-4 rounded-xl border border-border">
                      <p className="text-body-sm text-tertiary font-bold mb-1 whitespace-nowrap apt-spec-label">용적률 / 건폐율</p>
                      <p className="text-body-normal text-primary font-bold apt-spec-value">{report.metrics.far ? `${report.metrics.far}%` : '-'} <span className="block text-tertiary text-body-sm font-medium mt-0.5 apt-spec-label">/ {report.metrics.bcr ? `${report.metrics.bcr}%` : '-'}</span></p>
                    </div>
                    <div className="bg-body p-3.5 sm:p-4 rounded-xl border border-border col-span-2 sm:col-span-1">
                      <p className="text-body-sm text-tertiary font-bold mb-1 whitespace-nowrap apt-spec-label">주차대수 (세대당)</p>
                      <p className="text-body-normal text-primary font-bold apt-spec-value">{report.metrics.parkingCount ? `${report.metrics.parkingCount}대` : '-'} <span className="block text-tertiary text-body-sm font-medium mt-0.5 apt-spec-label">/ {report.metrics.parkingPerHousehold ? `${report.metrics.parkingPerHousehold}대` : '-'}</span></p>
                    </div>
                 </div>

                 {/* Premium Scouting Report Banner for high visibility */}
                 {report.premiumContent && (
                   <div className="mt-6 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-sm">
                     <div className="flex items-center gap-4 w-full sm:w-auto min-w-0">
                       <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                         <Crown size={24} className="text-emerald-600 fill-emerald-600/30" />
                       </div>
                       <div className="flex-1 min-w-0">
                         <h3 className="text-[15px] font-extrabold text-primary leading-snug break-keep whitespace-normal sm:truncate mt-0.5">
                           {managerPost?.title || parsedTitle || `${displayAptName} 매니저 임장기`}
                         </h3>
                         <p className="text-[12.5px] text-secondary mt-1 break-keep whitespace-normal sm:truncate">
                           D-VIEW 매니저가 직접 현장에서 검증한 대장 단지의 가치 평가 리포트
                         </p>
                       </div>
                     </div>
                     <button
                       onClick={() => {
                         if (managerPost?.id) {
                           window.location.hash = `#post=${managerPost.id}`;
                           onClose();
                         } else {
                           window.location.hash = '#lounge';
                           onClose();
                         }
                       }}
                       className="w-full sm:w-auto shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[13px] px-4.5 py-3 rounded-xl transition-all shadow-md shadow-emerald-500/10 active:scale-98 flex items-center justify-center gap-1 border-none cursor-pointer"
                     >
                       <span>임장기 보러가기</span>
                       <ChevronRight size={14} />
                     </button>
                   </div>
                 )}
              </div>
            )}

            {/* ── PAYWALL GATE — 비활성화 (프리미엄 콘텐츠 전면 공개 중) ──
             * TODO: 유료 모델 전환 시 이 블록 복원
             * 원본: isPurchased/isAdmin 체크 후 PaymentButton 표시
             */}





          {/* 단지 입지정보 컨테이너 (교통 + 생활 인프라 + 앵커 테넌트 묶음) */}
          <div id="sec-infra-metrics" className="bg-surface rounded-3xl p-6 md:p-8 shadow-sm border border-border flex flex-col gap-10 scroll-mt-14">
            {/* Location Infrastructure Info — Enhanced Design v2 */}
            {report.metrics && (report.metrics.distanceToSubway || report.metrics.restaurantDensity) && (
              <div className="flex flex-col w-full">
                <h2 className="text-[18px] font-bold text-primary flex items-center gap-2 mb-6 border-b border-border pb-3">
                  <MapPin size={18} className="text-toss-blue"/> 단지 입지정보
                </h2>

                {/* ─── 🚇 교통 Section ─── */}
                {(report.metrics.distanceToSubway > 0 || (report.metrics.distanceToIndeokwon != null && report.metrics.distanceToIndeokwon > 0) || (report.metrics.distanceToTram != null && report.metrics.distanceToTram > 0)) && (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4 border-l-[3px] border-[#00d29d] pl-2.5">
                      <span className="text-[14px] md:text-[15px] font-black text-primary tracking-tight">교통망 정보</span>
                    </div>
                    <div className="flex overflow-x-auto custom-scrollbar gap-3 pb-2 sm:grid sm:grid-cols-3 md:gap-3">
                      {[
                        { label: report.metrics.nearestStationLine || 'GTX-A / SRT', dist: report.metrics.distanceToSubway, name: report.metrics.nearestStationName, coords: report.metrics.nearestStationCoords, color: '#00d29d', bgFrom: '#eef6ff', bgTo: '#dbeafe' },
                        { label: report.metrics.nearestIndeokwonLine || '인덕원선', dist: report.metrics.distanceToIndeokwon, name: report.metrics.nearestIndeokwonStationName, coords: report.metrics.nearestIndeokwonCoords, color: '#7c3aed', bgFrom: '#f5f3ff', bgTo: '#ede9fe' },
                        { label: report.metrics.nearestTramLine || '동탄트램', dist: report.metrics.distanceToTram, name: report.metrics.nearestTramStationName, coords: report.metrics.nearestTramCoords, color: '#0891b2', bgFrom: '#ecfeff', bgTo: '#cffafe' },
                      ].filter(s => s.dist != null && s.dist > 0).map(station => (
                        <div key={station.label} className="w-[150px] shrink-0 sm:w-auto bg-body rounded-2xl p-4 md:p-5 flex flex-col hover:bg-surface hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 group ring-1 ring-black/5 dark:ring-white/10">
                          <div className="flex items-center justify-between mb-2 md:mb-3">
                            <span className="text-[13px] md:text-[14px] font-extrabold text-secondary/80 truncate pr-1">
                              {station.label}
                            </span>
                            {station.dist! <= 400 ? (
                              <span className="relative flex h-2 w-2 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: station.color }}></span>
                                <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: station.color }}></span>
                              </span>
                            ) : (
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: station.color }} />
                            )}
                          </div>
                          <div className="flex flex-col lg:flex-row lg:items-baseline gap-1.5 lg:gap-2 mt-1 lg:mt-0">
                            <div className="flex items-baseline gap-0.5">
                              <span className="text-[24px] md:text-[32px] font-extrabold text-primary tracking-tight tabular-nums leading-none">
                                {Math.round(station.dist!).toLocaleString()}
                              </span>
                              <span className="text-[12px] md:text-[14px] font-bold text-secondary mt-auto pb-0.5">
                                m
                              </span>
                            </div>
                            <span 
                              className="text-[11px] md:text-[12px] px-2 py-0.5 rounded-md w-fit whitespace-nowrap font-bold shadow-sm"
                              style={{ backgroundColor: station.bgFrom, color: station.color }}
                            >
                              도보 {Math.ceil(station.dist! / 80)}분
                            </span>
                          </div>
                          {station.name && (
                            <a 
                              href={station.coords ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(station.coords)}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(station.name + (station.name.includes('정거장') ? ' 동탄' : ' 역'))}`}
                              target="_blank" rel="noopener noreferrer"
                              className="text-[11px] md:text-[12px] flex items-center justify-center gap-1 font-bold mt-3 md:mt-4 rounded-xl px-2.5 py-2 text-center text-secondary transition-all duration-300 hover:scale-[1.02] active:scale-95 bg-surface border border-border shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[color:var(--hover-color)] hover:text-[color:var(--hover-color)]"
                              style={{ '--hover-color': station.color } as React.CSSProperties}
                              title={`${station.name} 구글 지도에서 보기`}
                            >
                              <MapPin size={12} className="shrink-0 md:w-3.5 md:h-3.5" />
                              <span className="truncate leading-tight block">{station.name}</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── 🏪 생활 인프라 Section ─── */}
                {report.metrics.restaurantDensity != null && report.metrics.restaurantDensity > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4 border-l-[3px] border-[#f59e0b] pl-2.5">
                      <span className="text-[14px] md:text-[15px] font-black text-primary tracking-tight">생활권 인프라</span>
                    </div>
                    <div className="flex overflow-x-auto custom-scrollbar gap-3 pb-2 sm:grid sm:grid-cols-1 md:gap-3">
                      {/* Restaurant/Cafe Density */}
                      <div className="w-full bg-body rounded-2xl p-4 md:p-5 flex flex-col hover:bg-surface hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 group ring-1 ring-black/5 dark:ring-white/10">
                        <div className="flex items-center justify-between mb-2 md:mb-3">
                          <span className="text-[13px] md:text-[14px] font-extrabold text-secondary/80 truncate pr-1">
                            음식점·카페·500m
                          </span>
                          <span className="w-2 h-2 rounded-full shrink-0 bg-[#f59e0b]" />
                        </div>
                        <div className="flex items-baseline gap-0.5 mb-3 md:mb-4 whitespace-nowrap">
                          <span className="text-[24px] md:text-[32px] font-extrabold text-primary tracking-tight tabular-nums leading-none">{report.metrics.restaurantDensity}</span>
                          <span className="text-[12px] md:text-[14px] font-bold text-secondary ml-1 pb-0.5">개</span>
                        </div>
                        {report.metrics.restaurantCategories && Object.keys(report.metrics.restaurantCategories).length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 mt-auto">
                            {Object.entries(report.metrics.restaurantCategories)
                              .sort(([,a], [,b]) => (b as number) - (a as number))
                              .slice(0, 5)
                              .map(([cat, cnt]) => (
                                <div key={cat} className="flex justify-between items-center bg-surface/60 hover:bg-surface border border-border/20 rounded-xl px-3 py-1.5 transition-all duration-200">
                                  <span className="text-[11px] md:text-[13px] font-bold text-secondary truncate mr-2">{cat}</span>
                                  <span className="font-extrabold text-[11px] md:text-[13px] text-toss-blue shrink-0 tabular-nums">{cnt as number}개</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Anchor Tenant Metrics — 주요 편의시설 접근성 시각화 */}
            {report.metrics && (
              <AnchorTenantCard
                distanceToStarbucks={report.metrics.distanceToStarbucks}
                starbucksName={report.metrics.starbucksName}
                starbucksAddress={report.metrics.starbucksAddress}
                starbucksCoordinates={report.metrics.starbucksCoordinates}
                distanceToOliveYoung={report.metrics.distanceToOliveYoung}
                oliveYoungName={report.metrics.oliveYoungName}
                oliveYoungAddress={report.metrics.oliveYoungAddress}
                oliveYoungCoordinates={report.metrics.oliveYoungCoordinates}
                distanceToDaiso={report.metrics.distanceToDaiso}
                daisoName={report.metrics.daisoName}
                daisoAddress={report.metrics.daisoAddress}
                daisoCoordinates={report.metrics.daisoCoordinates}
                distanceToMcDonalds={report.metrics.distanceToMcDonalds}
                mcdonaldsName={report.metrics.mcdonaldsName}
                mcdonaldsAddress={report.metrics.mcdonaldsAddress}
                mcdonaldsCoordinates={report.metrics.mcdonaldsCoordinates}
              />
            )}
          </div>

          {/* 🎓 학군 및 육아 분석 컨테이너 */}
          <div id="sec-education" className="bg-surface rounded-3xl p-6 md:p-8 shadow-sm border border-border flex flex-col gap-10 scroll-mt-14">
            {report.metrics && (
              <div className="flex flex-col w-full">
                <h2 className="text-[18px] font-bold text-primary flex items-center gap-2 mb-6 border-b border-border pb-3">
                  <GraduationCap size={18} className="text-[#0d9488]"/> 학군/육아 분석
                </h2>

                {/* ─── 👶 육아 친화도 지수 (Childcare Index) ─── */}
                {(() => {
                  const eduScoreInfo = calculateEducationScore(report.metrics);
                  const scoreColors: Record<string, { bg: string; text: string; border: string; descBg: string; scoreText: string }> = {
                    S: { bg: 'bg-[#fdf2f8]', text: 'text-[#db2777]', border: 'border-[#fbcfe8]/50', descBg: 'bg-[#db2777]/5', scoreText: 'text-[#db2777]' },
                    A: { bg: 'bg-[#ecfdf5]', text: 'text-[#059669]', border: 'border-[#a7f3d0]/50', descBg: 'bg-[#059669]/5', scoreText: 'text-[#059669]' },
                    B: { bg: 'bg-[#fffbeb]', text: 'text-[#d97706]', border: 'border-[#fde68a]/50', descBg: 'bg-[#d97706]/5', scoreText: 'text-[#d97706]' },
                    C: { bg: 'bg-[#f8fafc]', text: 'text-[#475569]', border: 'border-[#e2e8f0]/50', descBg: 'bg-[#475569]/5', scoreText: 'text-[#475569]' }
                  };
                  const colors = scoreColors[eduScoreInfo.grade] || scoreColors.C;
                  
                  return (
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-4 border-l-[3px] border-[#0d9488] pl-2.5">
                        <span className="text-[14px] md:text-[15px] font-black text-primary tracking-tight">육아 친화 지표</span>
                      </div>
                      
                      <div className="bg-body rounded-2xl p-5 md:p-6 border border-border flex flex-col md:flex-row items-center gap-6">
                        <div className="flex flex-col items-center justify-center shrink-0">
                          <div className={`w-24 h-24 rounded-full flex flex-col items-center justify-center border-4 ${colors.border} ${colors.bg} shadow-sm relative group`}>
                            <span className="text-[12px] font-extrabold text-secondary tracking-wider">GRADE</span>
                            <span className={`text-[36px] font-black leading-none ${colors.text} -mt-0.5`}>{eduScoreInfo.grade}</span>
                          </div>
                        </div>
                        
                        <div className="flex-1 w-full text-center md:text-left">
                          <div className="flex flex-col md:flex-row md:items-baseline justify-center md:justify-start gap-1 mb-2">
                            <span className="text-[16px] font-bold text-secondary">종합 육아 환경 지수:</span>
                            <div className="flex items-baseline justify-center gap-0.5">
                              <span className={`text-[28px] font-black tracking-tight ${colors.scoreText}`}>{eduScoreInfo.score}</span>
                              <span className="text-[14px] font-bold text-secondary">/ 100 점</span>
                            </div>
                          </div>
                          
                          <div className={`p-4 rounded-xl ${colors.descBg} border border-[#0d9488]/10 text-left`}>
                            <p className="text-[14px] font-bold text-primary mb-1">D-VIEW 자녀양육 환경 리포트</p>
                            <p className="text-[13px] font-medium text-secondary leading-relaxed break-keep">
                              {eduScoreInfo.description} (초등학교까지의 실제 도보 안심 통학 요건, 인근 중고교 접근성 및 500m 반경 내 교육 학원 인프라 밀집도를 종합 연산한 지표입니다.)
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ─── 🏫 배정 학교 정보 (Assigned Schools) ─── */}
                {(report.metrics.distanceToElementary > 0 || report.metrics.distanceToMiddle > 0 || report.metrics.distanceToHigh > 0) && (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4 border-l-[3px] border-[#0d9488] pl-2.5">
                      <span className="text-[14px] md:text-[15px] font-black text-primary tracking-tight">안심 학군 배정 정보</span>
                    </div>
                    <div className="flex overflow-x-auto custom-scrollbar gap-3 pb-2 sm:grid sm:grid-cols-3 md:gap-3">
                      {[
                        { label: '배정 초등학교', dist: report.metrics.distanceToElementary, name: report.metrics.nearestSchoolNames?.elementary },
                        { label: '인근 중학교', dist: report.metrics.distanceToMiddle, name: report.metrics.nearestSchoolNames?.middle },
                        { label: '인근 고등학교', dist: report.metrics.distanceToHigh, name: report.metrics.nearestSchoolNames?.high },
                      ].filter(s => s.dist && s.dist > 0).map(school => {
                        const grade = school.dist! <= 300 ? 'excellent' : school.dist! <= 700 ? 'good' : school.dist! <= 1000 ? 'average' : 'far';
                        const gradeStyles = {
                          excellent: { dot: 'bg-teal-500', timeBadge: 'bg-[#f0fdfa] text-teal-600', linkBadge: 'bg-surface border border-border text-secondary hover:text-teal-600 hover:border-teal-500/30 shadow-sm' },
                          good: { dot: 'bg-[#22c55e]', timeBadge: 'bg-[#f0fdf4] text-[#16a34a]', linkBadge: 'bg-surface border border-border text-secondary hover:text-[#16a34a] hover:border-[#16a34a]/30 shadow-sm' },
                          average: { dot: 'bg-[#f59e0b]', timeBadge: 'bg-[#fefce8] text-[#ca8a04]', linkBadge: 'bg-surface border border-border text-secondary hover:text-[#ca8a04] hover:border-[#ca8a04]/30 shadow-sm' },
                          far: { dot: 'bg-[#ef4444]', timeBadge: 'bg-[#fef2f2] text-[#dc2626]', linkBadge: 'bg-surface border border-border text-secondary hover:text-[#dc2626] hover:border-[#dc2626]/30 shadow-sm' },
                        };
                        const s = gradeStyles[grade];
                        return (
                          <div key={school.label} className="w-[150px] shrink-0 sm:w-auto bg-body rounded-2xl p-4 md:p-5 flex flex-col hover:bg-surface hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 group ring-1 ring-black/5 dark:ring-white/10">
                            <div className="flex items-center justify-between mb-2 md:mb-3">
                              <span className="text-[13px] md:text-[14px] font-extrabold text-secondary/80 truncate pr-1">
                                {school.label}
                              </span>
                              {grade === 'excellent' ? (
                                <span className="relative flex h-2 w-2 shrink-0">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-500 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                                </span>
                              ) : (
                                <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                              )}
                            </div>
                            <div className="flex flex-col lg:flex-row lg:items-baseline gap-1.5 lg:gap-2 mt-1 lg:mt-0">
                              <div className="flex items-baseline gap-0.5">
                                <span className="text-[24px] md:text-[32px] font-extrabold text-primary tracking-tight tabular-nums leading-none">
                                  {Math.round(school.dist!).toLocaleString()}
                                </span>
                                <span className="text-[12px] md:text-[14px] font-bold text-secondary mt-auto pb-0.5">
                                  m
                                </span>
                              </div>
                              <span className={`text-[11px] md:text-[12px] px-2 py-0.5 rounded-md w-fit whitespace-nowrap font-bold ${s.timeBadge} shadow-sm`}>도보 {Math.ceil(school.dist! / 80)}분</span>
                            </div>
                            {school.name && (
                              <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(school.name + ' 화성시')}`}
                                target="_blank" rel="noopener noreferrer"
                                className={`text-[11px] md:text-[12px] flex items-center justify-center gap-1 font-bold mt-3 md:mt-4 ${s.linkBadge} rounded-xl px-2.5 py-2 text-center transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-[0_2px_8px_rgba(0,0,0,0.02)]`}
                                title={`${school.name} 구글 지도에서 보기`}
                              >
                                <MapPin size={12} className="shrink-0 md:w-3.5 md:h-3.5" />
                                <span className="truncate leading-tight block">{school.name}</span>
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ─── 📚 주변 학원가 분석 (Academy Density) ─── */}
                {report.metrics.academyDensity > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4 border-l-[3px] border-[#0d9488] pl-2.5">
                      <span className="text-[14px] md:text-[15px] font-black text-primary tracking-tight">주변 학원가 구성 (500m 반경)</span>
                    </div>
                    
                    <div className="bg-body rounded-2xl p-5 md:p-6 border border-border flex flex-col gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
                          <GraduationCap className="text-teal-600" size={24} />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-secondary leading-none">500m 반경 교육시설</p>
                          <div className="flex items-baseline gap-0.5 mt-1.5">
                            <span className="text-[26px] font-black text-primary tracking-tight leading-none">{report.metrics.academyDensity}</span>
                            <span className="text-[13px] font-bold text-secondary ml-1">개소 밀집</span>
                          </div>
                        </div>
                      </div>
                      
                      {report.metrics.academyCategories && Object.keys(report.metrics.academyCategories).length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {Object.entries(report.metrics.academyCategories)
                            .sort(([,a], [,b]) => (b as number) - (a as number))
                            .map(([cat, cnt]) => {
                              let theme = { bg: 'bg-[#f0fdfa]/50 text-teal-600 border-[#ccfbf1]/40', tag: '학업' };
                              
                              if (cat.includes('음악') || cat.includes('미술') || cat.includes('피아노') || cat.includes('예술') || cat.includes('그림') || cat.includes('무용')) {
                                theme = { bg: 'bg-[#fdf2f8]/50 text-[#db2777] border-[#fbcfe8]/40', tag: '예체능' };
                              } else if (cat.includes('태권도') || cat.includes('무술') || cat.includes('체육') || cat.includes('스포츠') || cat.includes('축구') || cat.includes('레크리에이션')) {
                                theme = { bg: 'bg-[#fff7ed]/50 text-[#ea580c] border-[#ffedd5]/40', tag: '체육/활동' };
                              } else if (cat.includes('요가') || cat.includes('필라테스') || cat.includes('헬스')) {
                                theme = { bg: 'bg-[#f0f9ff]/50 text-[#0284c7] border-[#e0f2fe]/40', tag: '건강/취미' };
                              }
                              
                              return (
                                <div key={cat} className={`flex justify-between items-center ${theme.bg} border rounded-xl px-4 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm`}>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[13px] font-extrabold text-primary truncate leading-tight">{cat}</span>
                                    <span className="text-[10px] font-bold opacity-60 mt-0.5 leading-none">{theme.tag}</span>
                                  </div>
                                  <span className="font-black text-[14px] shrink-0 tabular-nums pl-2">{cnt as number}개</span>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

            {/* 밸류에이션 리포트 (P/U Ratio & PER) */}
            <div id="sec-valuation" className="mb-2 scroll-mt-14 scroll-mb-6">
              <AdvancedValuationMetrics report={report} transactions={transactions} />
              <BuyOrWaitVote aptName={report.apartmentName} />
            </div>

            {/* Photo Gallery — Category Tab Grid (100+ photos) or Empty State */}
            {report.images && report.images.length > 0 ? (() => {
              const IMAGE_TAG_LABELS: Record<string, string> = {
                'gateImg': '정문', 'landscapeImg': '조경', 'parkingImg': '주차장',
                'maintenanceImg': '공용부', 'communityImg': '커뮤니티', 'schoolImg': '통학로', 'commerceImg': '상권',
              };
              const allTags = ['전체', ...Array.from(new Set(report.images.map(img => img.locationTag || '기타')))];
              return (
                <div id="sec-photos" className="bg-surface rounded-3xl p-6 md:p-8 shadow-sm scroll-mt-14 relative">
                  <div className="absolute top-6 md:top-8 right-6 md:right-8 flex items-center gap-2 md:gap-3 z-10">
                    <span className="text-[13px] font-bold text-tertiary">{report.images.length}장</span>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsUploadModalOpen(true);
                      }}
                      className="text-[13px] font-bold text-toss-blue bg-toss-blue-light px-3 py-1.5 rounded-lg hover:bg-[#d1e7ff] transition-colors"
                    >
                      + 사진 추가
                    </button>
                  </div>
                  <details open>
                    <summary className="text-[20px] font-bold text-primary flex items-center gap-2 mb-5 border-b border-border pb-3 cursor-pointer list-none pr-32">
                      <Camera size={20} className="text-toss-blue"/>
                      우리 단지 갤러리
                    </summary>

                    {/* Category Filter Chips */}
                    <ApartmentGallery aptName={report.apartmentName} images={report.images} tags={allTags} tagLabels={IMAGE_TAG_LABELS} onImageClick={setFullscreenImage} />
                  </details>
                </div>
              );
            })() : (
              <div id="sec-photos" className="bg-surface rounded-3xl p-6 md:p-8 shadow-sm scroll-mt-14 overflow-hidden relative group">
                <h2 className="text-[20px] font-bold text-primary flex items-center gap-2 mb-6 border-b border-border pb-3">
                  <Camera size={20} className="text-toss-blue"/> 우리 단지 갤러리
                </h2>
                <div className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#f8f9fa] to-[#f2f4f6] border border-border p-8 md:p-12 flex flex-col items-center justify-center min-h-[300px]">
                  {/* Glassmorphism subtle background effects */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-toss-blue mix-blend-multiply filter blur-[80px] opacity-[0.03] rounded-full transform translate-x-1/2 -translate-y-1/2" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#7c3aed] mix-blend-multiply filter blur-[80px] opacity-[0.03] rounded-full transform -translate-x-1/2 translate-y-1/2" />
                  
                  <div className="w-16 h-16 bg-surface shadow-sm border border-border rounded-2xl flex items-center justify-center mb-5 relative z-10">
                    <Camera className="text-toss-blue" size={32} strokeWidth={1.5} />
                  </div>
                  
                  <h3 className="text-[18px] md:text-[20px] font-extrabold text-primary tracking-tight mb-2 relative z-10 text-center break-keep">
                    데이터가 담지 못하는 우리 단지의 진정한 가치
                  </h3>
                  <p className="text-[14px] md:text-[15px] text-secondary font-medium leading-relaxed mb-8 max-w-md relative z-10 text-center break-keep">
                    매수자의 첫인상을 결정하는 대표 이미지 1장.<br className="hidden md:block" />
                    입주민의 시선으로 <strong className="text-toss-blue">우리 단지의 품격</strong>을 직접 완성해 주세요.
                  </p>
                  
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsUploadModalOpen(true);
                    }}
                    className="group relative z-10 flex items-center gap-2 bg-primary text-surface text-[15px] font-bold px-6 py-3.5 rounded-xl hover:bg-toss-blue hover:shadow-[0_4px_12px_rgba(49,130,246,0.3)] transition-all duration-300 transform hover:-translate-y-0.5"
                  >
                    <span>우리 단지 첫 번째 앰배서더 되기</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-toss-blue group-hover:bg-surface animate-pulse" />
                  </button>
                  
                  <p className="text-[12px] text-tertiary font-medium mt-5 relative z-10 text-center">
                    * 고화질 사진이 풍부한 단지는 <span className="text-primary font-bold">인기 단지 탐색 상단에 우선 노출</span>됩니다.
                  </p>
                </div>
              </div>
            )}

            {!s ? null : (() => {
              const renderWatermark = () => {
                return (
                  <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4 flex items-center gap-2 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity z-10">
                    <span className="font-extrabold text-white/70 text-[14px] md:text-[16px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] select-none tracking-tighter">
                      D-VIEW
                    </span>
                  </div>
                );
              };

              return (
              // Advanced Template Render (요약은 위로 이동됨)
              <>

                {/* 2. 단지 기본정보 (Specs) */}
                <div id="sec-specs" className="bg-surface rounded-3xl p-6 md:p-8 shadow-sm scroll-mt-14">
                   <h2 className="text-[20px] font-bold text-primary flex items-center gap-2 mb-6 border-b border-border pb-3"><Building size={20} className="text-toss-blue"/> 단지 기본정보</h2>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-body p-4 rounded-xl border border-border">
                        <p className="text-[12px] text-tertiary font-bold mb-1">준공 연월 / 연차</p>
                        <p className="text-[15px] text-primary font-medium">{s.specs.builtYear || '-'}</p>
                      </div>
                      <div className="bg-body p-4 rounded-xl border border-border">
                        <p className="text-[12px] text-tertiary font-bold mb-1">규모 (세대/동)</p>
                        <p className="text-[15px] text-primary font-medium">{s.specs.scale || '-'}</p>
                      </div>
                      <div className="bg-body p-4 rounded-xl border border-border">
                        <p className="text-[12px] text-tertiary font-bold mb-1">용적률 / 건폐율</p>
                        <p className="text-[15px] text-primary font-medium">{s.specs.farBuild || '-'}</p>
                      </div>
                      <div className="bg-body p-4 rounded-xl border border-border">
                        <p className="text-[12px] text-tertiary font-bold mb-1">세대당 주차 (지하%)</p>
                        <p className="text-[15px] text-primary font-medium">{s.specs.parkingRatio || '-'}</p>
                      </div>
                   </div>
                </div>

                {/* 3. 물리적 인프라 & 조경 */}
                <div id="sec-infra" className="bg-surface rounded-3xl p-6 md:p-8 shadow-sm scroll-mt-14">
                   <h2 className="text-[20px] font-bold text-primary flex items-center gap-2 mb-6 border-b border-border pb-3"><Camera size={20} className="text-toss-blue"/> 현장 인프라 둘러보기</h2>
                   <div className="flex flex-col gap-8">
                      {/* Gate */}
                      {(s.infra.gateText || s.infra.gateImg) && (
                        <div className="flex flex-col md:flex-row gap-6">
                          {s.infra.gateImg && <div className="relative w-full md:w-[280px] h-[200px] rounded-2xl overflow-hidden shadow-sm bg-body group"><Image src={s.infra.gateImg} alt="진입로/문주" fill sizes="280px" className="object-cover" />{renderWatermark()}</div>}
                          <div>
                            <h4 className="text-[15px] font-bold text-primary mb-2 bg-body inline-block px-3 py-1 rounded-lg">진입로 및 정문</h4>
                            <p className="text-[15px] text-secondary leading-relaxed whitespace-pre-wrap">{s.infra.gateText || '사진만 제공됨'}</p>
                          </div>
                        </div>
                      )}
                      {/* Landscaping */}
                      {(s.infra.landscapeText || s.infra.landscapeImg) && (
                        <div className="flex flex-col md:flex-row-reverse gap-6 pt-6 border-t border-body">
                          {s.infra.landscapeImg && <div className="relative w-full md:w-[280px] h-[200px] rounded-2xl overflow-hidden shadow-sm bg-body group"><Image src={s.infra.landscapeImg} alt="조경/지형" fill sizes="280px" className="object-cover" />{renderWatermark()}</div>}
                          <div>
                            <h4 className="text-[15px] font-bold text-primary mb-2 bg-body inline-block px-3 py-1 rounded-lg">단지 조경 및 지형</h4>
                            <p className="text-[15px] text-secondary leading-relaxed whitespace-pre-wrap">{s.infra.landscapeText || '사진만 제공됨'}</p>
                          </div>
                        </div>
                      )}
                      {/* Parking & Maintenance ... (Skip strict layout for brevity, just render them similarly) */}
                       {(s.infra.parkingText || s.infra.parkingImg) && (
                        <div className="flex flex-col md:flex-row gap-6 pt-6 border-t border-body">
                          {s.infra.parkingImg && <div className="relative w-full md:w-[280px] h-[200px] rounded-2xl overflow-hidden shadow-sm bg-body group"><Image src={s.infra.parkingImg} alt="지하주차장" fill sizes="280px" className="object-cover" />{renderWatermark()}</div>}
                          <div>
                            <h4 className="text-[15px] font-bold text-primary mb-2 bg-body inline-block px-3 py-1 rounded-lg">지하주차장 인프라</h4>
                            <p className="text-[15px] text-secondary leading-relaxed whitespace-pre-wrap">{s.infra.parkingText || '사진만 제공됨'}</p>
                          </div>
                        </div>
                      )}
                   </div>
                </div>

                 {/* 4. Ecosystem */}
                <div id="sec-eco" className="bg-surface rounded-3xl p-6 md:p-8 shadow-sm scroll-mt-14">
                   <h2 className="text-[20px] font-bold text-primary flex items-center gap-2 mb-6 border-b border-border pb-3"><Info size={20} className="text-toss-blue"/> 생활 편의시설 및 거시 입지</h2>
                   <div className="flex flex-col gap-8">
                      {(s.ecosystem.schoolText || s.ecosystem.schoolImg) && (
                        <div className="flex flex-col md:flex-row gap-6">
                          {s.ecosystem.schoolImg && <div className="relative w-full md:w-[280px] h-[200px] rounded-2xl overflow-hidden shadow-sm bg-body group"><Image src={s.ecosystem.schoolImg} alt="학군" fill sizes="280px" className="object-cover" />{renderWatermark()}</div>}
                          <div>
                            <h4 className="text-[15px] font-bold text-primary mb-2 bg-[#f8f9fa] border border-border inline-block px-3 py-1 rounded-lg">학군 및 통학로</h4>
                            <p className="text-[15px] text-secondary leading-relaxed whitespace-pre-wrap">{s.ecosystem.schoolText}</p>
                          </div>
                        </div>
                      )}
                      {(s.ecosystem.commerceText || s.ecosystem.commerceImg) && (
                        <div className="flex flex-col md:flex-row-reverse gap-6 pt-6 border-t border-body">
                          {s.ecosystem.commerceImg && <div className="relative w-full md:w-[280px] h-[200px] rounded-2xl overflow-hidden shadow-sm bg-body group"><Image src={s.ecosystem.commerceImg} alt="상권" fill sizes="280px" className="object-cover" />{renderWatermark()}</div>}
                          <div>
                            <h4 className="text-[15px] font-bold text-primary mb-2 bg-[#f8f9fa] border border-border inline-block px-3 py-1 rounded-lg">동네 상권</h4>
                            <p className="text-[15px] text-secondary leading-relaxed whitespace-pre-wrap">{s.ecosystem.commerceText}</p>
                          </div>
                        </div>
                      )}
                   </div>
                </div>

                 {/* 5. 최종 결론 */}
                <div id="sec-conclusion" className="bg-surface rounded-3xl p-6 md:p-8 shadow-sm scroll-mt-14">
                   <h2 className="text-[20px] font-bold text-primary flex items-center gap-2 mb-6 border-b border-border pb-3"><ShieldAlert size={20} className="text-toss-blue"/> 최종 매수 타당성 평가</h2>
                   <div className="flex flex-col gap-4">
                      <div className="bg-primary p-6 rounded-2xl text-surface">
                        <h4 className="text-[13px] font-bold text-tertiary mb-2">교통 및 개발 호재</h4>
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap mb-4 pb-4 border-b border-white/10">{s.location.trafficText || '-'}</p>
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{s.location.developmentText || '-'}</p>
                      </div>
                      <div className="p-6 rounded-2xl border-2 border-[#191f28] bg-[#fdfdfd]">
                        <h4 className="text-[16px] font-extrabold text-primary mb-2">💡 최종 결론</h4>
                        <p className="text-[15px] text-secondary leading-relaxed whitespace-pre-wrap">{s.assessment.synthesis || '-'}</p>
                        
                        {s.assessment.probability && (
                          <div className="mt-6 p-4 bg-toss-blue-light rounded-xl flex items-start gap-3">
                             <Radar size={20} className="text-toss-blue shrink-0 mt-0.5" />
                             <div>
                               <h5 className="text-[13px] font-bold text-toss-blue mb-1">향후 가격 전망</h5>
                               <p className="text-[14px] text-primary leading-snug">{s.assessment.probability}</p>
                             </div>
                          </div>
                        )}
                      </div>
                   </div>
                </div>
              </>
            )})()}

            {/* In-content Viral CTA & AdSense Placeholder */}
            <div className="flex flex-col gap-6 mt-8 mb-4">

              {/* 1. Viral Share CTA (Desktop/Mobile In-content) */}
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

              {/* 2. Native Ad Placeholder (AdSense Test) */}
              <NativeAdPlaceholder 
                location="단지 리포트 모달" 
                onClick={onOpenAdModal} 
                metrics={report.metrics} 
                adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_APT_MODAL || "test-apt-modal-slot"} 
              />
            </div>

            {/* Comments Section */}
            <div id="sec-comments">
              <CommentSection
                comments={comments}
                commentInput={commentInput}
                onCommentChange={onCommentChange}
                onSubmitComment={onSubmitComment}
                user={user}
                isUnlocked={isUnlocked}
                selectedCommentId={selectedCommentId}
              />
            </div>

          </div>
    </>
  );

  // --- Image Navigation Logic ---
  const currentImageIndex = report?.images?.findIndex(img => img.url === fullscreenImage) ?? -1;
  const hasImages = report?.images && report.images.length > 0;
  
  const handleNextImage = React.useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (hasImages && currentImageIndex !== -1 && currentImageIndex < report.images!.length - 1) {
      setFullscreenImage(report.images![currentImageIndex + 1].url);
    }
  }, [hasImages, currentImageIndex, report?.images]);

  const handlePrevImage = React.useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (hasImages && currentImageIndex > 0) {
      setFullscreenImage(report.images![currentImageIndex - 1].url);
    }
  }, [hasImages, currentImageIndex, report?.images]);

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
        prevImg.src = report.images![currentImageIndex - 1].url;
      }
      if (currentImageIndex < report.images!.length - 1) {
        const nextImg = new window.Image();
        nextImg.src = report.images![currentImageIndex + 1].url;
      }
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenImage, hasImages, currentImageIndex, handleNextImage, handlePrevImage, report?.images]);

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
            className="absolute top-6 right-36 z-50 text-white hover:text-toss-blue p-2 rounded-full bg-surface/10 hover:bg-surface/30 transition-colors flex items-center gap-2 px-4 border border-white/20"
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
        {hasImages && currentImageIndex < report!.images!.length - 1 && (
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
              alt="Fullscreen view"
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
                {currentImageIndex + 1} <span className="text-surface/40 font-normal">/ {report!.images!.length}</span>
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
      <div className="fixed inset-0 z-[9999] flex flex-col justify-end md:items-center md:justify-center p-0 md:p-6 lg:p-8 animate-in fade-in duration-200" style={{ position: 'fixed' }}>
        <div className="absolute inset-0 bg-primary/60 backdrop-blur-sm" onClick={onClose} />
        
        <div className={`relative bg-body w-full ${isFullscreen ? 'h-full max-w-none rounded-none' : 'max-w-[1275px] h-[100dvh] md:h-auto md:max-h-[95vh] rounded-none md:rounded-[24px]'} flex flex-col shadow-2xl transition-transform duration-300 ring-1 ring-black/5 dark:ring-white/10 slide-in-from-bottom overflow-hidden`}>

          <div className="absolute top-6 right-6 md:top-7 md:right-8 z-[100] hidden md:flex items-center gap-3">
            <button onClick={onClose} className="bg-surface/90 hover:bg-surface text-secondary border border-border w-10 h-10 flex items-center justify-center rounded-full transition-colors shadow-lg shrink-0 group">
              <X size={20} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>
          
          <div ref={modalRef} onScroll={handleScroll} className="w-full h-full overflow-y-auto overflow-x-hidden custom-scrollbar pb-24 md:pb-0 flex flex-col">
            <div id="pdf-report-content" className="flex flex-col bg-body w-full">
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
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface/80 backdrop-blur-md border-t border-border md:hidden z-[100] pb-safe shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={onClose}
                className="w-[56px] h-[56px] bg-body hover:bg-[#e5e8eb] text-secondary rounded-2xl flex items-center justify-center transition-colors shrink-0 shadow-sm"
                title="뒤로가기"
              >
                <ArrowLeft size={24} strokeWidth={2.5} />
              </button>
              
              <button
                onClick={handleNativeShare}
                className="flex-1 h-[56px] bg-toss-blue active:bg-toss-blue/90 text-white font-extrabold text-[15px] sm:text-[16px] rounded-2xl flex items-center justify-center gap-2 shadow-[0_8px_16px_rgba(49,130,246,0.2)] hover:shadow-[0_10px_20px_rgba(49,130,246,0.3)] transition-all transform hover:-translate-y-0.5"
              >
                <Share size={20} strokeWidth={2.5} className="mr-0.5" />
                이 아파트 분석 리포트 공유하기
              </button>
            </div>
          </div>
        </div>
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
              입지평점: {report.premiumScores?.totalPremiumScore ? `${report.premiumScores.totalPremiumScore.toFixed(1)} / 100` : `${report.rating || 4.5} / 5.0`}
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

      <FullscreenOverlay />
    </>,
    document.getElementById('modal-root') || document.body
  );
}

export default FieldReportModal;
