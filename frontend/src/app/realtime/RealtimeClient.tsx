'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import dynamic from 'next/dynamic';

import { MessageSquare, Calendar, ShieldAlert, ArrowUpRight, ArrowDownRight, TrendingUp, Sparkles, Building, Landmark, Filter } from 'lucide-react';

import LoginGateModal from '@/components/ui/LoginGateModal';
import PageHeroHeader from '@/components/PageHeroHeader';
import PullToRefresh from '@/components/pwa/PullToRefresh';
import RealtimeSummaryCards from '@/components/RealtimeSummaryCards';

import { useAuth } from '@/hooks/useAuth';
import { useDashboardMeta, type DashboardInitialDataLocal } from '@/hooks/useDashboardMeta';
import { useFavorites } from '@/hooks/useFavorites';
import { useApartmentDetails } from '@/hooks/useApartmentDetails';
import { useComments } from '@/hooks/useComments';
import { usePWA } from '@/components/pwa/PWAProvider';
import { useAdBlockDetector } from '@/hooks/useAdBlockDetector';
import { useTxData, useLocationScores } from '@/hooks/useStaticData';
import { isSameApartment, normalizeAptName, findTxKey, findTypeMapEntry } from '@/lib/utils/apartmentMapping';
import { DongApartment } from '@/lib/dong-apartments';
import { dashboardFacade, FieldReportData } from '@/lib/DashboardFacade';
import * as UserRepo from '@/lib/repositories/user.repository';
import { isValidNickname } from '@/lib/services/nickname.service';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

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

// Heavy components dynamic load
const FieldReportModal = dynamic(() => import('@/components/ApartmentModal').catch(err => {
  console.warn('FieldReportModal Chunk Load failure, page reload initiated', err);
  if (typeof window !== 'undefined') window.location.reload();
  return { default: () => null };
}), { ssr: false, loading: () => <ModalSkeleton /> });

const AdInquiryModal = dynamic(() => import('@/components/AdInquiryModal').catch(err => {
  console.warn('AdInquiryModal Chunk Load failure', err);
  if (typeof window !== 'undefined') window.location.reload();
  return { default: () => null };
}), { ssr: false });

const B2BConsumerAdModal = dynamic(() => import('@/components/consumer/B2BConsumerAdModal').catch(err => {
  console.warn('B2BConsumerAdModal Chunk Load failure', err);
  if (typeof window !== 'undefined') window.location.reload();
  return { default: () => null };
}), { ssr: false });

const AptCompareModal = dynamic(() => import('@/components/consumer/AptCompareModal').catch(err => {
  console.warn('AptCompareModal Chunk Load failure', err);
  if (typeof window !== 'undefined') window.location.reload();
  return { default: () => null };
}), { ssr: false });

const JeonseSafetyCalculator = dynamic(() => import('@/components/consumer/JeonseSafetyCalculator').catch(err => {
  console.warn('JeonseSafetyCalculator Chunk Load failure', err);
  if (typeof window !== 'undefined') window.location.reload();
  return { default: () => null };
}), { ssr: false });

const MortgageCalculator = dynamic(() => import('@/components/consumer/MortgageCalculator').catch(err => {
  console.warn('MortgageCalculator Chunk Load failure', err);
  if (typeof window !== 'undefined') window.location.reload();
  return { default: () => null };
}), { ssr: false });

const PropertyTaxCalculator = dynamic(() => import('@/components/consumer/PropertyTaxCalculator').catch(err => {
  console.warn('PropertyTaxCalculator Chunk Load failure', err);
  if (typeof window !== 'undefined') window.location.reload();
  return { default: () => null };
}), { ssr: false });

const SellTimingCalculator = dynamic(() => import('@/components/consumer/SellTimingCalculator').catch(err => {
  console.warn('SellTimingCalculator Chunk Load failure', err);
  if (typeof window !== 'undefined') window.location.reload();
  return { default: () => null };
}), { ssr: false });

// Helper to format Date
const parseDateHelper = (dateStr?: string | number, latestDateStr?: string) => {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (str.length === 8) {
    const y = parseInt(str.substring(0, 4));
    const m = parseInt(str.substring(4, 6)) - 1;
    const d = parseInt(str.substring(6, 8));
    return new Date(y, m, d);
  }
  return null;
};

const parsePriceEokHelper = (priceEokStr?: string | number) => {
  if (!priceEokStr) return 0;
  if (typeof priceEokStr === 'number') return priceEokStr;
  
  let total = 0;
  const clean = String(priceEokStr).replace(/,/g, '').trim();
  if (clean.includes('억')) {
    const parts = clean.split('억');
    total += parseFloat(parts[0]) || 0;
    if (parts[1]) {
      const tenMillion = parseFloat(parts[1].replace(/[^0-9.]/g, '')) || 0;
      total += tenMillion / 10000;
    }
  } else {
    const val = parseFloat(clean.replace(/[^0-9.]/g, '')) || 0;
    if (val >= 100) {
      total = val / 10000;
    } else {
      total = val;
    }
  }
  return total;
};

const formatDeltaPrice = (deltaVal: number) => {
  if (deltaVal >= 1) {
    const eok = Math.floor(deltaVal);
    const man = Math.round((deltaVal - eok) * 10000);
    return `${eok}억${man > 0 ? ` ${man.toLocaleString()}만` : ''} 상승`;
  }
  const man = Math.round(deltaVal * 10000);
  return `${man.toLocaleString()}만 상승`;
};

interface TimelineItem {
  aptName: string;
  dong: string;
  priceEok: number | string;
  priceVal: number;
  areaPyeong: number;
  area: number;
  floor: number;
  type: string;
  delta: number;
  deltaPercent: number;
  prevPriceVal?: number;
  areaLabelM2: string;
  areaLabelPyeong: string;
}

export default function RealtimeClient({ initialDashboardData }: { initialDashboardData?: DashboardInitialDataLocal }) {
  const fieldReports = initialDashboardData?.fieldReports || [];

  const { user, userProfile, handleLogin } = useAuth();
  const { sheetApartments, typeMap, nameMapping, publicRentalSet } = useDashboardMeta(initialDashboardData);
  const { userFavorites, favoriteCounts, handleToggleFavorite } = useFavorites(user, initialDashboardData?.favoriteCounts);

  const [mounted, setMounted] = useState(false);
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

  const { txSummary = {} } = useTxData(
    initialDashboardData?.macroTrend,
    initialDashboardData?.txSummary,
    initialDashboardData?.recent7DaysVolume
  );
  const { locationScores = {} } = useLocationScores();

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

  // 4차 속도 개선: 아파트 이름 매핑 및 O(1) 해시 맵 캐싱
  const apartmentsMap = useMemo(() => {
    const map = new Map<string, any>();
    if (!sheetApartments) return map;
    
    const setIfEmptyOrReal = (key: string, apt: any) => {
      const existing = map.get(key);
      const isNewReal = apt.lat !== 0 && apt.latitude !== 0 && apt.lat !== undefined && apt.latitude !== undefined;
      const isExistingFallback = !existing || existing.lat === 0 || existing.latitude === 0 || !existing.lat;
      
      if (!existing || (isNewReal && isExistingFallback)) {
        map.set(key, apt);
      }
    };

    Object.values(sheetApartments).flat().forEach(apt => {
      setIfEmptyOrReal(normalizeAptName(apt.name), apt);
      setIfEmptyOrReal(apt.name, apt);
      if (apt.txKey) {
        setIfEmptyOrReal(normalizeAptName(apt.txKey), apt);
        setIfEmptyOrReal(apt.txKey, apt);
      }
    });
    return map;
  }, [sheetApartments]);

  const findApartmentMeta = useCallback((aptName: string) => {
    if (!apartmentsMap || apartmentsMap.size === 0) return null;
    const norm = normalizeAptName(aptName);
    let apt = apartmentsMap.get(norm) || apartmentsMap.get(aptName);
    if (!apt && nameMapping) {
      const alias = nameMapping[norm] || nameMapping[aptName];
      if (alias) {
        apt = apartmentsMap.get(normalizeAptName(alias)) || apartmentsMap.get(alias);
      }
    }
    return apt || null;
  }, [apartmentsMap, nameMapping]);

  const fieldReportsMap = useMemo(() => {
    const map = new Map<string, any>();
    if (!fieldReports || !sheetApartments) return map;
    
    fieldReports.forEach(report => {
      const apt = findApartmentMeta(report.apartmentName);
      if (apt) {
        map.set(apt.name, report);
      }
    });
    return map;
  }, [fieldReports, sheetApartments, findApartmentMeta]);

  const [selectedDong, setSelectedDong] = useState('all');
  const [selectedPyeong, setSelectedPyeong] = useState('all');
  const [selectedPrice, setSelectedPrice] = useState('all');

  // 법정동 리스트 동적 추출
  const dongList = useMemo(() => {
    if (!sheetApartments) return [];
    const dongs = new Set<string>();
    Object.values(sheetApartments).flat().forEach(apt => {
      if (apt.dong) dongs.add(apt.dong);
    });
    return ['all', ...Array.from(dongs).sort()];
  }, [sheetApartments]);

  // 필터 매칭 헬퍼 함수
  const isTxMatchingFilters = useCallback((tx: { dong: string; areaPyeong: number; priceVal: number }) => {
    if (selectedDong !== 'all' && tx.dong !== selectedDong) return false;

    if (selectedPyeong !== 'all') {
      const p = tx.areaPyeong;
      if (selectedPyeong === 'under20' && p >= 20) return false;
      if (selectedPyeong === '20s' && (p < 20 || p >= 30)) return false;
      if (selectedPyeong === '30s' && (p < 30 || p >= 40)) return false;
      if (selectedPyeong === 'over40' && p < 40) return false;
    }

    if (selectedPrice !== 'all') {
      const pVal = tx.priceVal;
      if (selectedPrice === 'under6' && pVal > 6) return false;
      if (selectedPrice === '6to9' && (pVal <= 6 || pVal > 9)) return false;
      if (selectedPrice === '9to12' && (pVal <= 9 || pVal > 12)) return false;
      if (selectedPrice === 'over12' && pVal <= 12) return false;
    }

    return true;
  }, [selectedDong, selectedPyeong, selectedPrice]);

  useEffect(() => {
    setMounted(true);

    // 4차 속도 개선: 브라우저 유휴 시간(Idle time)에 무거운 계산기/비교 모달 청크들을 백그라운드 프리로드
    const preloadHeavyChunks = () => {
      import('@/components/ApartmentModal').catch(() => {});
      import('@/components/consumer/AptCompareModal').catch(() => {});
      import('@/components/consumer/JeonseSafetyCalculator').catch(() => {});
      import('@/components/consumer/MortgageCalculator').catch(() => {});
      import('@/components/consumer/PropertyTaxCalculator').catch(() => {});
      import('@/components/consumer/SellTimingCalculator').catch(() => {});
    };

    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(preloadHeavyChunks, { timeout: 3000 });
      } else {
        setTimeout(preloadHeavyChunks, 2000);
      }
    }
  }, []);

  // Handle #apt= hash to open modal automatically
  useEffect(() => {
    if (!mounted || !sheetApartments) return;

    const checkHashForApt = () => {
      const match = window.location.hash.match(/[#&]apt=([^&]+)/);
      if (match) {
        const aptName = decodeURIComponent(match[1]);
        const allApts = Object.values(sheetApartments).flat();
        const targetApt = allApts.find(a => isSameApartment(a.name, aptName, nameMapping));

        if (targetApt) {
          const report = fieldReportsMap.get(targetApt.name);
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

    checkHashForApt();
    window.addEventListener('hashchange', checkHashForApt);
    return () => window.removeEventListener('hashchange', checkHashForApt);
  }, [mounted, sheetApartments, fieldReportsMap, nameMapping]);

  const [mobileModalOpen, setMobileModalOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      if (!window.location.hash && (window.location.pathname === '/realtime')) {
        setSelectedReport(null);
        setMobileModalOpen(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleAptClick = useCallback((apt: { name: string; dong: string }) => {
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
        const history = JSON.parse(localStorage.getItem('dview_viewed_apts') || '[]');
        const updated = [apt.name, ...history.filter((h: string) => h !== apt.name)].slice(0, 10);
        localStorage.setItem('dview_viewed_apts', JSON.stringify(updated));
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
    handleToggleFavorite(aptName, () => handleRequestLogin('관심 단지를 등록하여 실거래가 변동 알림을 받아보세요.'));
    if (user && !userFavorites.has(aptName)) {
      triggerCustomA2HSModal();
    }
  }, [handleToggleFavorite, handleRequestLogin, user, userFavorites, triggerCustomA2HSModal]);

  // 1. 직전 거래 대비 변동폭 및 최고가 경신(신고가) 여부를 포함하는 전체 실거래 목록 가공
  interface TxWithDelta {
    aptName: string;
    dong: string;
    date: string;
    dateLabel: string;
    priceEok: string;
    priceVal: number;
    areaPyeong: number;
    area: number;
    floor: number;
    dealType?: string;
    prevPriceVal?: number;
    delta?: number;
    deltaPercent?: number;
    isNewHigh: boolean;
    newHighDelta?: number;
  }

  const processedTransactionsList = useMemo(() => {
    if (!sheetApartments || !txSummary) return [];
    const list: TxWithDelta[] = [];

    Object.entries(txSummary).forEach(([txKey, sum]: [string, any]) => {
      const apt = findApartmentMeta(txKey);
      if (!apt) return;
      if (publicRentalSet && publicRentalSet.has && publicRentalSet.has(apt.name)) return;

      if (sum.recent && sum.recent.length > 0) {
        sum.recent.forEach((tx: any) => {
          list.push({
            aptName: apt.name,
            dong: apt.dong || sum.dong || '',
            date: tx.contractDate || '',
            dateLabel: tx.dateLabel || '',
            priceEok: tx.priceEok,
            priceVal: tx.priceVal || 0,
            areaPyeong: tx.areaPyeong,
            area: tx.area,
            floor: tx.floor,
            dealType: tx.dealType || '매매',
            prevPriceVal: tx.prevPriceVal,
            delta: tx.delta || 0,
            deltaPercent: tx.deltaPercent || 0,
            isNewHigh: !!tx.isNewHigh,
            newHighDelta: tx.newHighDelta
          });
        });
      }
    });

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [sheetApartments, txSummary, findApartmentMeta, publicRentalSet]);

  // 2. 가공된 processedTransactionsList에서 신고가(isNewHigh)들만 필터링하여 일자별 타임라인 구성
  const dailyTimelineData = useMemo(() => {
    const timelineGroups: Record<string, { dateStr: string; timestamp: number; items: TimelineItem[] }> = {};

    const allApts = Object.values(sheetApartments).flat();
    const normalizedAptMap = new Map<string, DongApartment>();
    allApts.forEach(a => {
      normalizedAptMap.set(normalizeAptName(a.name), a);
    });

    processedTransactionsList.forEach((tx) => {
      if (!tx.isNewHigh) return; // 신고가 경신 거래만 대상
      
      const dt = parseDateHelper(tx.date);
      if (!dt) return;

      const dateKey = tx.date;
      if (!timelineGroups[dateKey]) {
        const daysOfWeek = ["일", "월", "화", "수", "목", "금", "토"];
        const dayName = daysOfWeek[dt.getDay()];
        const month = dt.getMonth() + 1;
        const dateVal = dt.getDate();
        const dateStr = `${month}월 ${dateVal}일 (${dayName})`;

        timelineGroups[dateKey] = {
          dateStr,
          timestamp: dt.getTime(),
          items: []
        };
      }

      const normName = normalizeAptName(tx.aptName);
      const targetApt = normalizedAptMap.get(normName) || allApts.find(a => isSameApartment(a.name, tx.aptName, nameMapping));
      const t = typeMap && targetApt ? findTypeMapEntry(typeMap, targetApt.name, tx.area) : null;
      const labelM2 = t ? t.typeM2 : `${tx.area}㎡`;
      const labelPyeong = t ? (t.typePyeong || t.typeM2) : `${Math.round(tx.areaPyeong)}평`;

      timelineGroups[dateKey].items.push({
        aptName: tx.aptName,
        dong: tx.dong,
        priceEok: tx.priceEok,
        priceVal: tx.priceVal,
        areaPyeong: tx.areaPyeong,
        area: tx.area,
        floor: tx.floor,
        type: "high",
        delta: tx.newHighDelta || 0,
        deltaPercent: tx.prevPriceVal && tx.newHighDelta ? (tx.newHighDelta / tx.prevPriceVal) * 100 : 0,
        prevPriceVal: tx.prevPriceVal,
        areaLabelM2: labelM2,
        areaLabelPyeong: labelPyeong,
      });
    });

    return Object.values(timelineGroups).sort((a, b) => b.timestamp - a.timestamp);
  }, [processedTransactionsList, sheetApartments, typeMap, nameMapping]);

  // 3. 신고가 데이터 필터링 적용
  const filteredTimelineData = useMemo(() => {
    return dailyTimelineData
      .map(group => {
        const filteredItems = group.items.filter(item => 
          isTxMatchingFilters({
            dong: item.dong,
            areaPyeong: item.areaPyeong,
            priceVal: item.priceVal
          })
        );
        return {
          ...group,
          items: filteredItems
        };
      })
      .filter(group => group.items.length > 0);
  }, [dailyTimelineData, isTxMatchingFilters]);

  // 4. 실거래 목록 필터링 및 슬라이싱 (50건 제한)
  const filteredTransactionsList = useMemo(() => {
    return processedTransactionsList.filter(isTxMatchingFilters).slice(0, 50);
  }, [processedTransactionsList, isTxMatchingFilters]);

  // 4.5. 필터링된 실거래 목록을 날짜별 그룹으로 그루핑 (UI 일원화)
  const dailyTransactionsData = useMemo(() => {
    const groups: Record<string, { dateStr: string; timestamp: number; items: TxWithDelta[] }> = {};

    filteredTransactionsList.forEach((tx) => {
      const dt = parseDateHelper(tx.date);
      if (!dt) return;

      const dateKey = tx.date;
      if (!groups[dateKey]) {
        const daysOfWeek = ["일", "월", "화", "수", "목", "금", "토"];
        const dayName = daysOfWeek[dt.getDay()];
        const month = dt.getMonth() + 1;
        const dateVal = dt.getDate();
        const dateStr = `${month}월 ${dateVal}일 (${dayName})`;

        groups[dateKey] = {
          dateStr,
          timestamp: dt.getTime(),
          items: []
        };
      }

      groups[dateKey].items.push(tx);
    });

    return Object.values(groups).sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredTransactionsList]);

  // 5. 실거래 대시보드 메트릭 연산 (선택된 필터 조건 기준 리액티브 연산)
  const dashboardMetrics = useMemo(() => {
    const targetList = processedTransactionsList.filter(isTxMatchingFilters);

    if (targetList.length === 0) {
      return {
        recent7DaysCount: 0,
        prev7DaysCount: 0,
        recent30DaysCount: 0,
        newHighCount30Days: 0,
        newHighRatio30Days: 0,
        upTransactionsCount30Days: 0,
        upTransactionsRatio30Days: 0,
      };
    }

    let latestTime = 0;
    targetList.forEach(tx => {
      const dt = parseDateHelper(tx.date);
      if (dt && dt.getTime() > latestTime) {
        latestTime = dt.getTime();
      }
    });

    const oneDayMs = 24 * 60 * 60 * 1000;
    const refDate = latestTime > 0 ? new Date(latestTime) : new Date();
    
    const sevenDaysAgo = new Date(refDate.getTime() - 7 * oneDayMs);
    const fourteenDaysAgo = new Date(refDate.getTime() - 14 * oneDayMs);
    const thirtyDaysAgo = new Date(refDate.getTime() - 30 * oneDayMs);

    let recent7DaysCount = 0;
    let prev7DaysCount = 0;
    let recent30DaysCount = 0;
    let newHighCount30Days = 0;
    let upTransactionsCount30Days = 0;
    let upTransactionsWithPrevCount30Days = 0;

    targetList.forEach(tx => {
      const dt = parseDateHelper(tx.date);
      if (!dt) return;
      const t = dt.getTime();

      if (t >= sevenDaysAgo.getTime() && t <= refDate.getTime()) {
        recent7DaysCount++;
      } else if (t >= fourteenDaysAgo.getTime() && t < sevenDaysAgo.getTime()) {
        prev7DaysCount++;
      }

      if (t >= thirtyDaysAgo.getTime() && t <= refDate.getTime()) {
        recent30DaysCount++;
        if (tx.isNewHigh) {
          newHighCount30Days++;
        }
        if (tx.delta !== undefined) {
          upTransactionsWithPrevCount30Days++;
          if (tx.delta > 0) {
            upTransactionsCount30Days++;
          }
        }
      }
    });

    const newHighRatio30Days = recent30DaysCount > 0 ? (newHighCount30Days / recent30DaysCount) * 100 : 0;
    const upTransactionsRatio30Days = upTransactionsWithPrevCount30Days > 0 ? (upTransactionsCount30Days / upTransactionsWithPrevCount30Days) * 100 : 0;

    return {
      recent7DaysCount,
      prev7DaysCount,
      recent30DaysCount,
      newHighCount30Days,
      newHighRatio30Days,
      upTransactionsCount30Days,
      upTransactionsRatio30Days
    };
  }, [processedTransactionsList, isTxMatchingFilters]);



  return (
    <>
      <PullToRefresh
        scrollContainerId="realtime-scroll-container"
        disabled={mobileModalOpen || !!selectedReport}
      >
        <div 
          id="realtime-scroll-container"
          className="flex flex-col min-h-[100dvh] bg-surface relative pb-[env(safe-area-inset-bottom)] overflow-y-auto"
        >
          <main id="main-content" className="flex-1 w-full max-w-[2000px] mx-auto overflow-x-hidden animate-in fade-in duration-500 pb-16">
            
            {/* Page Title Header */}
            <div className="shrink-0">
              <PageHeroHeader 
                title="D-VIEW 실거래"
                subtitleStrong="동탄 실시간 실거래 정보"
                subtitleLight="최근 1개월 내의 아파트 실거래 변동 및 신고가 타임라인을 파악하세요"
              />
            </div>

            {/* Realtime Summary Metrics Dashboard */}
            <div className="w-full px-4 sm:px-6 md:px-10 lg:px-16 pt-4 shrink-0">
              <RealtimeSummaryCards metrics={dashboardMetrics} />
            </div>

            {/* Realtime Filter Section */}
            <div className="w-full px-4 sm:px-6 md:px-10 lg:px-16 pt-6 flex flex-col gap-4 shrink-0 bg-transparent">
              <div className="flex flex-col gap-3 bg-surface/40 backdrop-blur-md border border-border/60 rounded-2xl p-4 sm:p-5 shadow-sm">
                
                {/* 1. 법정동 필터 */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-[12px] font-black text-secondary shrink-0 w-16 sm:w-20 flex items-center gap-1">
                    <Filter size={12} className="text-tertiary" />
                    법정동
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
                    {dongList.map((d) => (
                      <button
                        key={d}
                        onClick={() => setSelectedDong(d)}
                        className={`text-[11.5px] font-extrabold px-3 py-1.5 rounded-full border transition-all duration-200 whitespace-nowrap focus:outline-none ${
                          selectedDong === d
                            ? 'bg-[#008262] text-white border-[#008262] dark:bg-[#00b386] dark:border-[#00b386] shadow-sm shadow-[#008262]/20'
                            : 'bg-body/70 text-secondary border-border/50 hover:bg-border/30'
                        }`}
                      >
                        {d === 'all' ? '전체' : d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. 평형대 필터 */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 border-t border-border/30 sm:border-none">
                  <span className="text-[12px] font-black text-secondary shrink-0 w-16 sm:w-20 flex items-center gap-1">
                    <Filter size={12} className="text-tertiary" />
                    평형대
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
                    {[
                      { key: 'all', label: '전체' },
                      { key: 'under20', label: '20평 미만' },
                      { key: '20s', label: '20평대' },
                      { key: '30s', label: '30평대 (국평)' },
                      { key: 'over40', label: '40평대 이상' },
                    ].map((p) => (
                      <button
                        key={p.key}
                        onClick={() => setSelectedPyeong(p.key)}
                        className={`text-[11.5px] font-extrabold px-3 py-1.5 rounded-full border transition-all duration-200 whitespace-nowrap focus:outline-none ${
                          selectedPyeong === p.key
                            ? 'bg-[#008262] text-white border-[#008262] dark:bg-[#00b386] dark:border-[#00b386] shadow-sm shadow-[#008262]/20'
                            : 'bg-body/70 text-secondary border-border/50 hover:bg-border/30'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. 금액 필터 */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 border-t border-border/30 sm:border-none">
                  <span className="text-[12px] font-black text-secondary shrink-0 w-16 sm:w-20 flex items-center gap-1">
                    <Filter size={12} className="text-tertiary" />
                    매매가
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
                    {[
                      { key: 'all', label: '전체' },
                      { key: 'under6', label: '6억 이하' },
                      { key: '6to9', label: '6억~9억' },
                      { key: '9to12', label: '9억~12억' },
                      { key: 'over12', label: '12억 초과' },
                    ].map((pr) => (
                      <button
                        key={pr.key}
                        onClick={() => setSelectedPrice(pr.key)}
                        className={`text-[11.5px] font-extrabold px-3 py-1.5 rounded-full border transition-all duration-200 whitespace-nowrap focus:outline-none ${
                          selectedPrice === pr.key
                            ? 'bg-[#008262] text-white border-[#008262] dark:bg-[#00b386] dark:border-[#00b386] shadow-sm shadow-[#008262]/20'
                            : 'bg-body/70 text-secondary border-border/50 hover:bg-border/30'
                        }`}
                      >
                        {pr.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>



            {/* 2. 2-Column Layout for Timeline and Overall Feed */}
            <div className="w-full px-4 sm:px-6 md:px-10 lg:px-16 pt-6 md:pt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              
              {/* Left Column: Recent Transactions Feed (Latest 50 Transactions) */}
              <div className="flex flex-col bg-surface rounded-2xl border border-border/80 shadow-sm px-5 py-6 min-h-[500px]">
                <div className="flex justify-between items-center gap-2 mb-4 pb-2 border-b border-border/40">
                  <h2 className="text-[16px] sm:text-[18px] font-extrabold text-primary tracking-tight flex items-center gap-2">
                    <TrendingUp size={18} className="text-[#008262] dark:text-[#00d29d]" />
                    최근 실거래 목록
                  </h2>
                  <span className="text-[11px] text-tertiary font-extrabold bg-body px-2.5 py-1 rounded-lg shrink-0">
                    최근 {filteredTransactionsList.length}건
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[500px] pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full flex flex-col gap-4 mt-2">
                  {dailyTransactionsData.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-tertiary text-[14px]">
                      조건에 부합하는 최근 실거래 데이터가 없습니다.
                    </div>
                  ) : (
                    dailyTransactionsData.map((group) => (
                      <div key={group.dateStr} className="flex flex-col gap-2 relative pl-4 border-l-2 border-border/80">
                        {/* Timeline Dot */}
                        <div className="absolute left-[-6px] top-1.5 w-[10px] h-[10px] rounded-full bg-border border-2 border-surface" />
                        
                        {/* Date Heading */}
                        <h3 className="text-[13px] font-black text-secondary flex items-center gap-1.5 mb-1">
                          <Calendar size={13} className="text-tertiary" />
                          {group.dateStr}
                        </h3>

                        {/* Items */}
                        <div className="flex flex-col gap-2">
                          {group.items.map((tx, idx) => (
                            <div
                              key={`${tx.aptName}-${idx}`}
                              onClick={() => handleAptClickByName(tx.aptName)}
                              className="flex flex-col p-3 rounded-xl cursor-pointer bg-body hover:bg-body/80 border border-border/40 hover:border-[#008262]/20 dark:hover:border-[#00d29d]/20 shadow-sm transition-all duration-200 hover:-translate-y-0.5 group gap-1.5"
                            >
                              {/* Name & Badges */}
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[13px] font-extrabold text-primary group-hover:text-[#008262] dark:group-hover:text-[#00d29d] transition-colors leading-tight truncate max-w-[70%]">
                                  {tx.aptName}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {tx.delta !== undefined ? (
                                    tx.delta > 0 ? (
                                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/20 shrink-0 whitespace-nowrap flex items-center">
                                        <ArrowUpRight size={11} className="mr-0.5" />
                                        +{formatPriceValue(tx.delta)}
                                      </span>
                                    ) : tx.delta < 0 ? (
                                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/20 shrink-0 whitespace-nowrap flex items-center">
                                        <ArrowDownRight size={11} className="mr-0.5" />
                                        -{formatPriceValue(Math.abs(tx.delta))}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700/10 shrink-0 whitespace-nowrap">
                                        보합
                                      </span>
                                    )
                                  ) : null}

                                  {tx.dealType && (
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded text-secondary bg-surface border border-border/50 shrink-0 whitespace-nowrap">
                                      {tx.dealType}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Spec and Price */}
                              <div className="flex items-center justify-between text-[11px] text-tertiary font-semibold">
                                <span>
                                  {tx.dong} • {Math.round(tx.areaPyeong)}평 • {tx.floor}층
                                </span>
                                <span className="text-primary font-black text-[12.5px]">
                                  {formatPriceValue(tx.priceVal)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Daily New High Prices Timeline */}
              <div className="flex flex-col bg-surface rounded-2xl border border-border/80 shadow-sm px-5 py-6 min-h-[500px]">
                <div className="flex justify-between items-center gap-2 mb-4 pb-2 border-b border-border/40">
                  <h2 className="text-[16px] sm:text-[18px] font-extrabold text-primary tracking-tight flex items-center gap-2">
                    <Sparkles size={18} className="text-amber-500 fill-amber-100" />
                    일자별 신고가 단지
                  </h2>
                  <span className="text-[11px] text-red-500 font-extrabold bg-red-50 dark:bg-red-950/20 px-2.5 py-1 rounded-lg shrink-0">
                    신고가 경신
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[500px] pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full flex flex-col gap-4 mt-2">
                  {filteredTimelineData.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-tertiary text-[14px]">
                      조건에 부합하는 신고가 거래가 없습니다.
                    </div>
                  ) : (
                    filteredTimelineData.map((group) => (
                      <div key={group.dateStr} className="flex flex-col gap-2 relative pl-4 border-l-2 border-border/80">
                        {/* Timeline Dot */}
                        <div className="absolute left-[-6px] top-1.5 w-[10px] h-[10px] rounded-full bg-border border-2 border-surface" />
                        
                        {/* Date Heading */}
                        <h3 className="text-[13px] font-black text-secondary flex items-center gap-1.5 mb-1">
                          <Calendar size={13} className="text-tertiary" />
                          {group.dateStr}
                        </h3>

                        {/* Items */}
                        <div className="flex flex-col gap-2">
                          {group.items.map((item, idx) => (
                            <div
                              key={`${item.aptName}-${idx}`}
                              onClick={() => handleAptClickByName(item.aptName)}
                              className="flex flex-col p-3 rounded-xl cursor-pointer bg-body hover:bg-body/80 border border-border/40 hover:border-[#008262]/20 dark:hover:border-[#00d29d]/20 shadow-sm transition-all duration-200 hover:-translate-y-0.5 group gap-1.5"
                            >
                              {/* Name & High Price Badge */}
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[13px] font-extrabold text-primary group-hover:text-[#008262] dark:group-hover:text-[#00d29d] transition-colors leading-tight truncate max-w-[70%]">
                                  {item.aptName}
                                </span>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/20 shrink-0 whitespace-nowrap">
                                  {item.delta && item.delta > 0 
                                    ? `+${formatPriceValue(item.delta)}${item.deltaPercent ? ` (${item.deltaPercent.toFixed(1)}%)` : ''}`
                                    : '신고가'}
                                </span>
                              </div>

                              {/* Spec and Price */}
                              <div className="flex items-center justify-between text-[11px] text-tertiary font-semibold">
                                <span>
                                  {item.dong} • {item.areaLabelPyeong} • {item.floor}층
                                </span>
                                <span className="text-primary font-black text-[12.5px]">
                                  {formatPriceValue(item.priceVal)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

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
                }}
                onOpenJeonseSafety={(aptName) => {
                  setJeonseSafetyInitialApt(aptName);
                  setIsJeonseSafetyOpen(true);
                }}
                onOpenMortgage={(aptName) => {
                  setMortgageInitialApt(aptName);
                  setIsMortgageOpen(true);
                }}
                onOpenTaxCalculator={(aptName) => {
                  setTaxCalcInitialApt(aptName);
                  setIsTaxCalcOpen(true);
                }}
                onOpenSellTimingCalculator={(aptName) => {
                  setSellTimingInitialApt(aptName);
                  setIsSellTimingOpen(true);
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
                DVIEW는 광고 수익으로 운영됩니다. 차단기 예외 등록을 해주시면 입지 분석 정보를 제공하는 데 큰 도움이 됩니다.
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
                window.location.reload();
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
                  <div className="flex gap-2 w-full">
                    <button onClick={reset} className="flex-1 py-2.5 bg-[#008262] text-white font-extrabold text-[12px] rounded-xl transition-all border-none">다시 시도</button>
                    <button onClick={() => setIsCompareOpen(false)} className="px-4 py-2.5 bg-body text-secondary font-bold text-[12px] rounded-xl border border-border/20 transition-all">닫기</button>
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
              if (typeof window !== 'undefined') window.location.reload();
              return null;
            }
            return (
              <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                <div className="bg-surface w-full max-w-[400px] rounded-2xl shadow-xl border border-border p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                    <span className="text-xl font-black">!</span>
                  </div>
                  <h3 className="text-[15px] font-black text-primary mb-1">안전진단 로드 실패</h3>
                  <div className="flex gap-2 w-full">
                    <button onClick={reset} className="flex-1 py-2.5 bg-[#008262] text-white font-extrabold text-[12px] rounded-xl transition-all border-none">다시 시도</button>
                    <button onClick={() => setIsJeonseSafetyOpen(false)} className="px-4 py-2.5 bg-body text-secondary font-bold text-[12px] rounded-xl border border-border/20 transition-all">닫기</button>
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
              if (typeof window !== 'undefined') window.location.reload();
              return null;
            }
            return (
              <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                <div className="bg-surface w-full max-w-[400px] rounded-2xl shadow-xl border border-border p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                    <span className="text-xl font-black">!</span>
                  </div>
                  <h3 className="text-[15px] font-black text-primary mb-1">대출 계산기 로드 실패</h3>
                  <div className="flex gap-2 w-full">
                    <button onClick={reset} className="flex-1 py-2.5 bg-[#008262] text-white font-extrabold text-[12px] rounded-xl transition-all border-none">다시 시도</button>
                    <button onClick={() => setIsMortgageOpen(false)} className="px-4 py-2.5 bg-body text-secondary font-bold text-[12px] rounded-xl border border-border/20 transition-all">닫기</button>
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
          name="취득세 계산기"
          fallback={(error, reset) => {
            if (error && (error.name === 'ChunkLoadError' || error.message?.includes('Loading chunk') || error.message?.includes('Failed to fetch dynamically imported module'))) {
              if (typeof window !== 'undefined') window.location.reload();
              return null;
            }
            return (
              <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                <div className="bg-surface w-full max-w-[400px] rounded-2xl shadow-xl border border-border p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                    <span className="text-xl font-black">!</span>
                  </div>
                  <h3 className="text-[15px] font-black text-primary mb-1">계산기 로드 실패</h3>
                  <div className="flex gap-2 w-full">
                    <button onClick={reset} className="flex-1 py-2.5 bg-[#008262] text-white font-extrabold text-[12px] rounded-xl transition-all border-none">다시 시도</button>
                    <button onClick={() => setIsTaxCalcOpen(false)} className="px-4 py-2.5 bg-body text-secondary font-bold text-[12px] rounded-xl border border-border/20 transition-all">닫기</button>
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
          name="AI 매도 타이밍 진단기"
          fallback={(error, reset) => {
            if (error && (error.name === 'ChunkLoadError' || error.message?.includes('Loading chunk') || error.message?.includes('Failed to fetch dynamically imported module'))) {
              if (typeof window !== 'undefined') window.location.reload();
              return null;
            }
            return (
              <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                <div className="bg-surface w-full max-w-[400px] rounded-2xl shadow-xl border border-border p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                    <span className="text-xl font-black">!</span>
                  </div>
                  <h3 className="text-[15px] font-black text-primary mb-1">진단기 로드 실패</h3>
                  <div className="flex gap-2 w-full">
                    <button onClick={reset} className="flex-1 py-2.5 bg-[#008262] text-white font-extrabold text-[12px] rounded-xl transition-all border-none">다시 시도</button>
                    <button onClick={() => setIsSellTimingOpen(false)} className="px-4 py-2.5 bg-body text-secondary font-bold text-[12px] rounded-xl border border-border/20 transition-all">닫기</button>
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
}

// Format Price helper
const formatPriceValue = (priceVal: number) => {
  if (priceVal >= 1) {
    const eok = Math.floor(priceVal);
    const man = Math.round((priceVal - eok) * 10000);
    return `${eok}억${man > 0 ? ` ${man.toLocaleString()}` : ''}`;
  }
  const man = Math.round(priceVal * 10000);
  return `${man.toLocaleString()}`;
};
