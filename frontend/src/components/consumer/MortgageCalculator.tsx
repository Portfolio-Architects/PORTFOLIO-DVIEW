'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Check, Share2, ArrowLeft, RefreshCw, Calculator, Award, ChevronDown, MessageSquare, Sparkles } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DongApartment } from '@/lib/dong-apartments';
import { AptTxSummary } from '@/lib/types/transaction';
import { FieldReportData } from '@/lib/types/report.types';
import { findTxKey, normalizeAptName, getDisplayAptName } from '@/lib/utils/apartmentMapping';
import { shareMortgageToKakao } from '@/lib/utils/kakaoShare';
import { localCache } from '@/lib/utils/localCache';
import { usePWA } from '@/components/pwa/PWAProvider';
import { QuizAnswerSchema } from '@/lib/validation/facade.schemas';
import { logger } from '@/lib/services/logger';
import { AdSlot } from '@/components/ads/AdSlot';
import { MACRO_CONFIG } from '@/lib/macro-summary';
import { getRecentApartments, addRecentApartment, removeRecentApartment, clearRecentApartments, type RecentApartmentItem } from '@/lib/utils/recentApartments';

interface MortgageCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  initialAptName?: string;
  sheetApartments: Record<string, DongApartment[]>;
  txSummaryData: Record<string, AptTxSummary>;
  nameMapping: Record<string, string>;
  fieldReportsMap: Map<string, FieldReportData>;
}

// Helper: Estimate market price
function getEstimatedMarketPrice(apt: DongApartment, txSummaryData: Record<string, AptTxSummary>, nameMapping: Record<string, string>) {
  const txKey = findTxKey(apt.name, txSummaryData, nameMapping);
  const summary = txKey ? txSummaryData[txKey] : null;
  if (summary) {
    const val = summary.avg3MPrice || summary.avg1MPrice || summary.latestPrice || 0;
    if (val > 0) return val;
  }
  
  // Fallback estimate by dong
  const dong = apt.dong || '';
  if (dong.includes('오산동')) return 95000;
  if (dong.includes('청계동')) return 85000;
  if (dong.includes('송동') || dong.includes('산척동')) return 75000;
  if (dong.includes('목동') || dong.includes('영천동')) return 60000;
  return 55000;
}

// Helper: Estimate acquisition tax & broker fee (roughly)
function calculateAcquisitionCost(price: number) {
  // price in Man-won
  let taxRate = 0.01; // Under 6亿: 1.1% (including local education tax)
  if (price > 90000) {
    taxRate = 0.03; // Over 9亿: 3.3%
  } else if (price > 60000) {
    // 6亿 to 9억: linear between 1% and 3% (approx 1.1% ~ 3.3%)
    taxRate = 0.01 + ((price - 60000) / 30000) * 0.02;
  }
  
  const tax = Math.round(price * taxRate);
  const brokerFee = Math.round(price * 0.004); // Approx 0.4%
  const otherFee = Math.round(price * 0.002); // Approx 0.2% (legal, etc.)
  
  return {
    tax,
    brokerFee,
    otherFee,
    totalFees: tax + brokerFee + otherFee
  };
}

// Helper: Calculate maximum loan principal (in Man-won) under DSR / DTI + Stress DSR rules
function calculateDsrMaxLoan(
  annualIncomeManWon: number,
  appliedRatePercent: number,
  stressAddPercent: number,
  maturityYears: number,
  dsrRatio = 0.4
): number {
  const effectiveIncome = annualIncomeManWon > 0 ? annualIncomeManWon : 7500;
  const monthlyMaxPayment = (effectiveIncome * dsrRatio) / 12;
  const r = Math.max(0.001, (appliedRatePercent + stressAddPercent) / 100) / 12;
  const n = Math.max(12, maturityYears * 12);
  const powVal = Math.pow(1 + r, n);
  return Math.round(monthlyMaxPayment * ((powVal - 1) / (r * powVal)));
}

const REGION_TABS = [
  { id: 'all', label: '전체 단지', dongs: [] as string[] },
  { id: 'station', label: '동탄역(여울·청계)', dongs: ['여울동', '청계동', '오산동'] },
  { id: 'lake', label: '호수공원(송동·산척·장지)', dongs: ['송동', '산척동', '장지동'] },
  { id: 'east', label: '영천·목동·신동', dongs: ['영천동', '목동', '신동'] },
  { id: 'dongtan1', label: '동탄1(반송·능동·석우)', dongs: ['반송동', '능동', '석우동'] },
] as const;

const HOUSEHOLD_TYPES = [
  { id: 'newborn', label: '신생아 출산 가구', desc: '최근 2년 이내 출산(입양) 가구 (가장 이율이 낮음)' },
  { id: 'newlyweds', label: '신혼부부 가구', desc: '혼인 신고 7년 이내인 부부' },
  { id: 'firsttime', label: '생애최초 무주택 가구', desc: '세대원 전원이 주택을 소유한 적이 없는 가구' },
  { id: 'normal', label: '일반 무주택 가구', desc: '현재 주택이 없는 무주택 세대주' },
] as const;

const MortgageCalculator = React.memo(function MortgageCalculator({
  isOpen,
  onClose,
  initialAptName,
  sheetApartments,
  txSummaryData,
  nameMapping,
  fieldReportsMap,
}: MortgageCalculatorProps) {
  const { showToast } = usePWA();
  const allApartments = useMemo(() => {
    const map = new Map<string, DongApartment & { normalizedName: string }>();
    for (const apt of Object.values(sheetApartments || {}).flat()) {
      const norm = normalizeAptName(apt.name);
      if (norm && !map.has(norm)) {
        map.set(norm, { ...apt, normalizedName: norm });
      }
    }
    for (const [txKey, summary] of Object.entries(txSummaryData || {})) {
      const norm = normalizeAptName(txKey);
      if (norm && !map.has(norm)) {
        map.set(norm, {
          name: getDisplayAptName(txKey),
          dong: summary?.dong || '동탄',
          normalizedName: norm,
        });
      }
    }
    return Array.from(map.values());
  }, [sheetApartments, txSummaryData]);

  const [selectedRegion, setSelectedRegion] = useState<(typeof REGION_TABS)[number]['id']>('all');
  const [recentApts, setRecentApts] = useState<RecentApartmentItem[]>([]);

  // Selected apartment state
  const [selectedApt, setSelectedApt] = useState<DongApartment | null>(null);

  // Search input & focus state
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Wizard Step State
  const [step, setStep] = useState(1); // 1: Apt/Price, 2: Family Status, 3: Income/Assets, 4: Result

  // Inputs
  const [householdType, setHouseholdType] = useState<'single' | 'newborn' | 'newlyweds' | 'firsttime' | 'normal'>('normal');
  const [annualIncome, setAnnualIncome] = useState<string>('7500'); // Man-won
  const [annualIncomeInputValue, setAnnualIncomeInputValue] = useState<string>('7,500'); // For formatted text input
  const [netAssets, setNetAssets] = useState<string>('3.5'); // Eok
  const [netAssetsInputValue, setNetAssetsInputValue] = useState<string>('3.5'); // For formatted text input
  const [childrenCount, setChildrenCount] = useState<number>(0);
  
  // Repayment parameters (in Step 4)
  const [maturityYears, setMaturityYears] = useState<number>(30); // 10, 15, 20, 30
  const [selectedCandidateName, setSelectedCandidateName] = useState<string | null>(null);

  // Quiz state integration
  const [hasQuizAnswers, setHasQuizAnswers] = useState(false);

  // Diagnosis states
  const [isCalculating, setIsCalculating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const copyTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const calculateTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const mountedRef = React.useRef(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    setMounted(true);
    return () => {
      mountedRef.current = false;
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      if (calculateTimeoutRef.current) {
        clearTimeout(calculateTimeoutRef.current);
      }
    };
  }, []);

  // Load and map quiz answers on modal open
  useEffect(() => {
    if (isOpen) {
      try {
        const answers = localCache.get('drive_quiz_answers', QuizAnswerSchema, null);
        if (answers) {
          setHasQuizAnswers(true);
          
          // 1. Map householdType & childrenCount
          if (answers.family === 'baby') {
            setHouseholdType('newborn');
            setChildrenCount(1);
          } else if (answers.family === 'none') {
            setHouseholdType('single');
            setChildrenCount(0);
          } else if (answers.family === 'elementary') {
            setHouseholdType('normal');
            setChildrenCount(1);
          } else if (answers.family === 'middleHigh') {
            setHouseholdType('normal');
            setChildrenCount(2);
          }

          // 2. Map annualIncome & netAssets based on budget
          if (answers.budget === '3eok') {
            setAnnualIncome('4500');
            setNetAssets('1.5');
          } else if (answers.budget === '5eok') {
            setAnnualIncome('6500');
            setNetAssets('2.2');
          } else if (answers.budget === '8eok') {
            setAnnualIncome('8500');
            setNetAssets('3.5');
          } else if (answers.budget === '12eok') {
            setAnnualIncome('11000');
            setNetAssets('5.5');
          } else if (answers.budget === 'unlimited') {
            setAnnualIncome('15000');
            setNetAssets('8.0');
          }
        }
      } catch (e) {
        logger.warn('MortgageCalculator', 'Failed to parse quiz answers', undefined, e);
      }
    } else {
      // Reset state on close
      setStep(1);
      setHasQuizAnswers(false);
      setIsCalculating(false);
    }
  }, [isOpen]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus, Escape key, and Body Scroll Lock management
  useEffect(() => {
    if (isOpen && mounted) {
      const originalOverflow = document.body.style.overflow;
      const originalOverscroll = document.documentElement.style.overscrollBehavior;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overscrollBehavior = 'none';
      setTimeout(() => {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        }
      }, 50);

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = originalOverflow;
        document.documentElement.style.overscrollBehavior = originalOverscroll;
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, mounted, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && containerRef.current) {
      const focusableElements = containerRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length === 0) return;
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }
  };
  useEffect(() => {
    if (isOpen) {
      setRecentApts(getRecentApartments());
    }
  }, [isOpen]);

  const handleAptSelect = (apt: DongApartment) => {
    setSelectedApt(apt);
    setSearchQuery(getDisplayAptName(apt.name));
    setIsFocused(false);
    setRecentApts(addRecentApartment({ name: apt.name, dong: apt.dong }));
  };

  // Set initial apartment if passed
  useEffect(() => {
    if (initialAptName && isOpen) {
      const matched = allApartments.find(a => normalizeAptName(a.name) === normalizeAptName(initialAptName));
      if (matched) {
        handleAptSelect(matched);
      }
    }
  }, [initialAptName, allApartments, isOpen]);

  const formatEokMan = (manWon: number) => {
    const eok = Math.floor(manWon / 10000);
    const man = Math.round(manWon % 10000);
    if (eok > 0) {
      return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
    }
    return `${man.toLocaleString()}만원`;
  };

  // Sync annualIncomeInputValue when annualIncome changes
  useEffect(() => {
    if (!annualIncome) {
      setAnnualIncomeInputValue('');
    } else {
      const parsed = parseInt(annualIncome.replace(/,/g, ''), 10);
      setAnnualIncomeInputValue(isNaN(parsed) ? '' : parsed.toLocaleString());
    }
  }, [annualIncome]);

  // Sync netAssetsInputValue when netAssets changes
  useEffect(() => {
    if (!netAssets) {
      setNetAssetsInputValue('');
    } else {
      const raw = netAssets.replace(/,/g, '');
      const parts = raw.split('.');
      const integerPart = parts[0] ? parseInt(parts[0], 10).toLocaleString() : '';
      setNetAssetsInputValue(parts[1] !== undefined ? `${integerPart}.${parts[1]}` : integerPart);
    }
  }, [netAssets]);

  const handleAnnualIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, '');
    if (rawValue === '') {
      setAnnualIncome('');
      setAnnualIncomeInputValue('');
      return;
    }
    if (/^\d+$/.test(rawValue)) {
      const numValue = parseInt(rawValue, 10);
      const clampedValue = Math.min(200000, numValue);
      setAnnualIncome(clampedValue.toString());
    }
  };

  const handleNetAssetsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, '');
    if (rawValue === '') {
      setNetAssets('');
      setNetAssetsInputValue('');
      return;
    }
    if (/^\d*\.?\d*$/.test(rawValue)) {
      const floatVal = parseFloat(rawValue) || 0;
      if (floatVal <= 1000) {
        setNetAssets(rawValue);
      }
    }
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Handle clicking outside of dropdown to close it
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!isFocused) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isFocused]);

  // Filter list for Apartment Explorer (Region filter + Search query, unlocked when viewing selected apt)
  const filteredApts = useMemo(() => {
    const regionObj = REGION_TABS.find((r) => r.id === selectedRegion);
    const regionPool =
      !regionObj || regionObj.dongs.length === 0
        ? allApartments
        : allApartments.filter((a) => regionObj.dongs.some((d) => a.dong.includes(d)));

    const trimmed = searchQuery.trim();
    const isShowingSelectedName =
      selectedApt && normalizeAptName(trimmed) === normalizeAptName(getDisplayAptName(selectedApt.name));

    if (!trimmed || isShowingSelectedName) {
      return regionPool;
    }
    const query = normalizeAptName(trimmed);
    return regionPool.filter((a) => a.normalizedName.includes(query) || a.dong.includes(trimmed));
  }, [searchQuery, allApartments, selectedRegion, selectedApt]);

  // Retrieve market price
  const marketPrice = useMemo(() => {
    if (!selectedApt) return 0;
    return getEstimatedMarketPrice(selectedApt, txSummaryData, nameMapping);
  }, [selectedApt, txSummaryData, nameMapping]);

  // Reset manual candidate selection when core inputs change
  useEffect(() => {
    setSelectedCandidateName(null);
  }, [selectedApt, householdType, annualIncome, netAssets, childrenCount]);

  // Run calculation logic (Macro-linked rates + Stress DSR + Dynamic Ranking)
  const loanResults = useMemo(() => {
    if (!selectedApt || marketPrice === 0) return null;

    const incomeVal = parseInt(annualIncome.replace(/,/g, ''), 10) || 7500; // Man-won
    const assetsEok = parseFloat(netAssets.replace(/,/g, '')) || 0; // Eok
    const assetsVal = assetsEok * 10000; // Man-won

    // Live macro market environment from MACRO_CONFIG (synced via sync-macro.js)
    const {
      riskFreeRate = 3.25,
      fundingCost = 4.10,
      baseDate = '2026-06-13',
    } = MACRO_CONFIG?.macroEnvironment || {};

    // Market-linked commercial & policy benchmark rates
    const bogeumjariMarketRate = Math.round((riskFreeRate + 0.80) * 100) / 100; // e.g., 4.05%
    const commercialPeriodicRate = Math.round((riskFreeRate + 0.55) * 100) / 100; // 5Y periodic fixed, e.g., 3.80%
    const internetBankMixedRate = Math.round((riskFreeRate + 0.33) * 100) / 100; // Internet bank non-face-to-face, e.g., 3.58%
    const longTermCofixRate = Math.round((fundingCost - 0.15) * 100) / 100; // 40Y COFIX-linked, e.g., 3.95%

    // 1. Check Newborn special loan (신생아 특례 디딤돌)
    const isNewbornEligible =
      householdType === 'newborn' &&
      marketPrice <= 90000 &&
      incomeVal <= 20000 &&
      assetsVal <= 46900;

    // 2. Check Newlyweds loan (신혼부부 전용 디딤돌)
    const isNewlywedsEligible =
      householdType === 'newlyweds' &&
      marketPrice <= 60000 &&
      incomeVal <= 8500 &&
      assetsVal <= 46900;

    // 3. Check General/First-time loan (일반/생애최초 디딤돌)
    const isFirstTime = householdType === 'firsttime';
    const priceLimit = isFirstTime ? 60000 : 50000;
    const incomeLimit = isFirstTime ? 7000 : 6000;
    const isGeneralEligible =
      marketPrice <= priceLimit &&
      incomeVal <= incomeLimit &&
      assetsVal <= 46900;

    // 4. Check Bogeumjari Loan (보금자리론)
    let bogeumjariIncomeLimit = 7000;
    if (householdType === 'newlyweds') bogeumjariIncomeLimit = 8500;
    if (childrenCount >= 3) bogeumjariIncomeLimit = 10000;
    const isBogeumjariEligible =
      marketPrice <= 60000 &&
      incomeVal <= bogeumjariIncomeLimit;

    // Taxes and Fees
    const fees = calculateAcquisitionCost(marketPrice);
    const requiredLoanForPurchase = Math.max(0, marketPrice + fees.totalFees - assetsVal);

    const childCut = childrenCount > 0 ? childrenCount * 0.2 : 0;
    const isFirstTimeBuyerForLtv =
      householdType === 'firsttime' || householdType === 'newborn' || householdType === 'newlyweds';
    const commLtvRatio = isFirstTimeBuyerForLtv ? 0.8 : 0.7;

    interface CandidateOption {
      name: string;
      loanType: 'newborn' | 'newlyweds' | 'general' | 'bogeumjari' | 'commercial';
      isPolicy: boolean;
      ltvLimit: number;
      dsrLimit: number;
      maxLoanAmount: number;
      finalRate: number;
      rateTypeLabel: string;
      summary: string;
      matchBadge: string;
    }

    const candidatePool: CandidateOption[] = [];

    if (isNewbornEligible) {
      const nbRate =
        incomeVal <= 2000 ? 1.6 : incomeVal <= 4000 ? 2.15 : incomeVal <= 6000 ? 2.5 : incomeVal <= 8000 ? 2.8 : incomeVal <= 13000 ? 3.0 : 3.3;
      const finalRate = Math.max(1.2, nbRate - childCut);
      const ltvLimit = Math.min(50000, Math.round(marketPrice * 0.8));
      const dsrLimit = calculateDsrMaxLoan(incomeVal, finalRate, 0, 30, 0.6);
      candidatePool.push({
        name: '신생아 특례 디딤돌대출',
        loanType: 'newborn',
        isPolicy: true,
        ltvLimit,
        dsrLimit,
        maxLoanAmount: Math.min(ltvLimit, dsrLimit),
        finalRate,
        rateTypeLabel: '고정',
        summary: '최저 금리 정책금융 · 스트레스 DSR 면제',
        matchBadge: '정책금융 1순위 · 최저금리 매칭',
      });
    }
    if (isNewlywedsEligible) {
      const nwRate = incomeVal <= 2000 ? 2.15 : incomeVal <= 4000 ? 2.5 : incomeVal <= 7000 ? 3.0 : 3.25;
      const finalRate = Math.max(1.2, nwRate - childCut);
      const ltvLimit = Math.min(40000, Math.round(marketPrice * 0.8));
      const dsrLimit = calculateDsrMaxLoan(incomeVal, finalRate, 0, 30, 0.6);
      candidatePool.push({
        name: '신혼부부 전용 디딤돌대출',
        loanType: 'newlyweds',
        isPolicy: true,
        ltvLimit,
        dsrLimit,
        maxLoanAmount: Math.min(ltvLimit, dsrLimit),
        finalRate,
        rateTypeLabel: '고정',
        summary: '신혼 가구 우대금리 · 최대 4억 한도',
        matchBadge: '신혼 정책금융 · 저금리 매칭',
      });
    }
    if (isGeneralEligible) {
      const genRate = incomeVal <= 2000 ? 2.45 : incomeVal <= 4000 ? 2.8 : incomeVal <= 6000 ? 3.1 : 3.55;
      const finalRate = Math.max(1.2, genRate - childCut);
      const ltvLimit = Math.min(isFirstTime ? 30000 : 25000, Math.round(marketPrice * (isFirstTime ? 0.8 : 0.7)));
      const dsrLimit = calculateDsrMaxLoan(incomeVal, finalRate, 0, 30, 0.6);
      candidatePool.push({
        name: isFirstTime ? '생애최초 디딤돌대출' : '일반 디딤돌대출',
        loanType: 'general',
        isPolicy: true,
        ltvLimit,
        dsrLimit,
        maxLoanAmount: Math.min(ltvLimit, dsrLimit),
        finalRate,
        rateTypeLabel: '고정',
        summary: '무주택 실수요 저금리 정책상품',
        matchBadge: '무주택 정책금융 · 금리우대 매칭',
      });
    }
    if (isBogeumjariEligible) {
      const bgLtv = householdType === 'firsttime' || householdType === 'newborn' ? 0.8 : 0.7;
      const bgMax = householdType === 'newlyweds' ? 42000 : 36000;
      const finalRate = Math.max(1.2, bogeumjariMarketRate - childCut);
      const ltvLimit = Math.min(bgMax, Math.round(marketPrice * bgLtv));
      const dsrLimit = calculateDsrMaxLoan(incomeVal, finalRate, 0, 30, 0.6);
      candidatePool.push({
        name: '아낌e 보금자리론',
        loanType: 'bogeumjari',
        isPolicy: true,
        ltvLimit,
        dsrLimit,
        maxLoanAmount: Math.min(ltvLimit, dsrLimit),
        finalRate,
        rateTypeLabel: '고정',
        summary: '순자산 제한 없음 · DSR 규제 미적용',
        matchBadge: '자산무관 정책금융 · 고정금리 매칭',
      });
    }

    // Commercial & Internet Bank candidates with Stress DSR + LTV limits
    const commPeriodicLtv = Math.round(marketPrice * commLtvRatio);
    const commPeriodicDsr = calculateDsrMaxLoan(incomeVal, commercialPeriodicRate, 0.36, 30, 0.4);
    const commPeriodicMax = Math.min(commPeriodicLtv, commPeriodicDsr);

    const inetMixedLtv = Math.round(marketPrice * 0.7);
    const inetMixedDsr = calculateDsrMaxLoan(incomeVal, internetBankMixedRate, 0.60, 30, 0.4);
    const inetMixedMax = Math.min(inetMixedLtv, inetMixedDsr);

    const longTermLtv = Math.round(marketPrice * commLtvRatio);
    const longTermDsr = calculateDsrMaxLoan(incomeVal, longTermCofixRate, 0.75, 40, 0.4);
    const longTermMax = Math.min(longTermLtv, longTermDsr);

    const commercialCandidates: CandidateOption[] = [
      {
        name: '시중은행 주택담보대출',
        loanType: 'commercial',
        isPolicy: false,
        ltvLimit: commPeriodicLtv,
        dsrLimit: commPeriodicDsr,
        maxLoanAmount: commPeriodicMax,
        finalRate: commercialPeriodicRate,
        rateTypeLabel: '5년 주기형',
        summary: `스트레스 DSR 완화(+0.36%p) · LTV ${Math.round(commLtvRatio * 100)}% 적용`,
        matchBadge: '스트레스 DSR · 한도 우위 매칭',
      },
      {
        name: '인터넷전문은행 주담대 (비대면)',
        loanType: 'commercial',
        isPolicy: false,
        ltvLimit: inetMixedLtv,
        dsrLimit: inetMixedDsr,
        maxLoanAmount: inetMixedMax,
        finalRate: internetBankMixedRate,
        rateTypeLabel: '5년 혼합형',
        summary: '국고채 연동 비대면 최저금리 · 중도상환수수료 감면',
        matchBadge: '자기자본 충분 · 최저금리 자동 매칭',
      },
      {
        name: '시중은행 장기모기지 (만기 40년형)',
        loanType: 'commercial',
        isPolicy: false,
        ltvLimit: longTermLtv,
        dsrLimit: longTermDsr,
        maxLoanAmount: longTermMax,
        finalRate: longTermCofixRate,
        rateTypeLabel: 'COFIX 연동',
        summary: '40년 만기 DSR 한도 극대화 · 월 원리금 부담 최소화',
        matchBadge: '40년 만기 · DSR 한도 극대화 매칭',
      },
    ];

    // Dynamic sorting of commercial candidates based on household income, net assets, and required loan
    const canLowestRateCoverPurchase =
      inetMixedMax >= requiredLoanForPurchase || inetMixedMax >= Math.max(commPeriodicMax, longTermMax);
    if (canLowestRateCoverPurchase) {
      // Rate-priority mode: Household has sufficient assets/income, so lowest interest rate wins
      commercialCandidates.sort((a, b) => a.finalRate - b.finalRate || b.maxLoanAmount - a.maxLoanAmount);
    } else {
      // Limit-priority mode: Household needs maximum loan limit under Stress DSR / LTV
      commercialCandidates.sort((a, b) => b.maxLoanAmount - a.maxLoanAmount || a.finalRate - b.finalRate);
    }

    const rankedPool = [...candidatePool, ...commercialCandidates];
    const primaryCandidate = rankedPool[0];
    const topThree = rankedPool.slice(0, 3);
    const activeCandidate =
      topThree.find((c) => c.name === selectedCandidateName) || primaryCandidate;

    const alternatives = topThree
      .filter((c) => c.name !== primaryCandidate.name)
      .slice(0, 2)
      .map((c, idx) => ({
        rankLabel: `대안 ${idx + 2}`,
        ...c,
      }));

    const ownCapitalRequired = Math.max(0, marketPrice - activeCandidate.maxLoanAmount) + fees.totalFees;

    return {
      loanType: activeCandidate.loanType,
      bestProduct: primaryCandidate.name,
      activeProduct: activeCandidate.name,
      rateTypeLabel: activeCandidate.rateTypeLabel,
      matchBadge: activeCandidate.matchBadge,
      maxLoanAmount: activeCandidate.maxLoanAmount,
      finalRate: activeCandidate.finalRate,
      primaryMaxLoanAmount: primaryCandidate.maxLoanAmount,
      primaryFinalRate: primaryCandidate.finalRate,
      primaryRateTypeLabel: primaryCandidate.rateTypeLabel,
      ownCapitalRequired,
      fees,
      isNewbornEligible,
      isNewlywedsEligible,
      isGeneralEligible,
      isBogeumjariEligible,
      alternatives,
      macroMeta: {
        riskFreeRate,
        fundingCost,
        baseDate,
      },
    };
  }, [selectedApt, marketPrice, householdType, annualIncome, netAssets, childrenCount, selectedCandidateName]);

  // Calculate monthly repayment & chart points
  const repaymentDetails = useMemo(() => {
    if (!loanResults) return null;

    const principal = loanResults.maxLoanAmount * 10000; // convert to Won
    const annualInterestRate = loanResults.finalRate / 100;
    const monthlyInterestRate = isNaN(annualInterestRate) ? 0 : annualInterestRate / 12;
    const totalMonths = isNaN(maturityYears) || maturityYears <= 0 ? 360 : maturityYears * 12;

    // Ensure totalMonths is valid to avoid division by zero
    if (totalMonths <= 0) {
      return { monthlyPayment: 0, chartData: [] };
    }

    // Monthly Payment (Principal + Interest Equal Repayment - 원리금균등상환)
    // Formula: P * r * (1 + r)^n / ((1 + r)^n - 1)
    let monthlyPayment = 0;
    if (monthlyInterestRate > 0) {
      const powVal = Math.pow(1 + monthlyInterestRate, totalMonths);
      const denominator = powVal - 1;
      
      if (Math.abs(denominator) > 1e-10) {
        monthlyPayment = (principal * monthlyInterestRate * powVal) / denominator;
      } else {
        monthlyPayment = principal / totalMonths;
      }
    } else {
      monthlyPayment = principal / totalMonths;
    }

    if (isNaN(monthlyPayment) || !isFinite(monthlyPayment) || monthlyPayment < 0) {
      monthlyPayment = 0;
    }

    // Generate chart data (12 points representing annual intervals)
    const chartData = [];
    let remainingPrincipal = principal;
    let accumulatedInterest = 0;

    // Add starting point
    chartData.push({
      year: '시작',
      '남은 대출 원금': Math.round(principal / 10000),
      '납부한 누적 이자': 0,
    });

    for (let month = 1; month <= totalMonths; month++) {
      const interestForMonth = remainingPrincipal * monthlyInterestRate;
      const principalForMonth = monthlyPayment - interestForMonth;
      remainingPrincipal = Math.max(0, remainingPrincipal - principalForMonth);
      accumulatedInterest += interestForMonth;

      // Capture yearly snapshot (or final month)
      if (month % 12 === 0 || month === totalMonths) {
        const yearNum = Math.ceil(month / 12);
        // Only push every 2-3 years for cleaner charts if duration is 30 years
        const interval = maturityYears === 30 ? 3 : (maturityYears === 20 ? 2 : 1);
        if (yearNum % interval === 0 || month === totalMonths) {
          chartData.push({
            year: `${yearNum}년차`,
            '남은 대출 원금': Math.round(remainingPrincipal / 10000),
            '납부한 누적 이자': Math.round(accumulatedInterest / 10000),
          });
        }
      }
    }

    return {
      monthlyPayment: Math.round(monthlyPayment),
      chartData,
    };
  }, [loanResults, maturityYears]);

  const handleNextStep = () => {
    if (step === 1 && !selectedApt) return;
    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setStep(prev => prev - 1);
  };

  const handleStartSimulate = () => {
    setIsCalculating(true);
    if (calculateTimeoutRef.current) {
      clearTimeout(calculateTimeoutRef.current);
      calculateTimeoutRef.current = null;
    }
    calculateTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setIsCalculating(false);
        setStep(4);
      }
      calculateTimeoutRef.current = null;
    }, 1200); // Premium calculation speed feel
  };

  const handleShare = () => {
    if (!selectedApt || !loanResults || !repaymentDetails) return;
    const aptLabel = getDisplayAptName(selectedApt.name);
    const text = `[D-VIEW 내 집 마련 자금 조달 보고서]
단지명: ${aptLabel} (${selectedApt.dong})
최근 매매 평균시세: ${(marketPrice / 10000).toFixed(1)}억원

추천 대출 상품: [${loanResults.bestProduct}]
- 최대 한도: ${(loanResults.maxLoanAmount / 10000).toFixed(2)}억원
- 적용 이율: ${loanResults.finalRate.toFixed(2)}%
- 만기 ${maturityYears}년 기준 월 원리금: ${(repaymentDetails.monthlyPayment / 10000).toFixed(1)}만원

필요 자기자본(내 돈): ${(loanResults.ownCapitalRequired / 10000).toFixed(2)}억원
(매매 편차 + 취득세/수수료 등 부대비용 ${(loanResults.fees.totalFees / 10000).toFixed(2)}억원 포함)

대출 적합 자격 판정 및 상환 시뮬레이션 상세 내역은 D-VIEW에서 바로 진단해 보세요!`;

    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
    navigator.clipboard.writeText(text).then(() => {
      if (!mountedRef.current) return;
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
      setIsCopied(true);
      copyTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setIsCopied(false);
        }
        copyTimeoutRef.current = null;
      }, 2000);
    });
  };

  const handleKakaoShare = () => {
    if (!selectedApt || !loanResults || !repaymentDetails) return;
    shareMortgageToKakao({
      aptName: getDisplayAptName(selectedApt.name),
      dong: selectedApt.dong,
      marketPrice: marketPrice,
      bestProduct: loanResults.bestProduct,
      maxLoanAmount: loanResults.maxLoanAmount,
      finalRate: loanResults.finalRate,
      monthlyPayment: repaymentDetails.monthlyPayment,
      ownCapitalRequired: loanResults.ownCapitalRequired,
    }, showToast);
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[12000] flex flex-col justify-end md:justify-center items-center p-0 md:p-6 lg:p-8 overscroll-none animate-in fade-in duration-200"
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Backdrop */}
      <button type="button" className="absolute inset-0 bg-slate-900/25 dark:bg-slate-950/55 backdrop-blur-[2px] border-none cursor-default" onClick={onClose} aria-label="주택담보대출 계산기 창 닫기" />

      {/* Modal Container */}
      <div
        ref={containerRef}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="loan-title"
        aria-describedby="loan-desc"
        className={`relative bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/80 w-full ${
          step === 4 ? 'max-w-[580px] md:max-w-[960px]' : 'max-w-[580px]'
        } max-h-[90vh] md:max-h-[88vh] rounded-t-[24px] md:rounded-[20px] flex flex-col shadow-[0_24px_64px_-12px_rgba(15,23,42,0.28)] overflow-hidden transition-[max-width] duration-300`}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800 px-6 py-4 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h2 id="loan-title" className="text-[17px] font-black text-primary tracking-tight flex items-center gap-1.5">
                <span>내 집 마련 대출 자가진단</span>
              </h2>
              <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md tabular-nums">
                STEP {step} / 4
              </span>
            </div>
            <p id="loan-desc" className="text-[12px] font-medium text-tertiary break-keep">
              내 상황에 꼭 맞는 가장 금리가 낮은 대출과 매수 자금 조달 계획을 수립합니다.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-body hover:bg-border/30 text-secondary transition-all"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </header>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar p-6 space-y-6">
          
          {/* STEP 1: Select Apartment (Fixed-Height Zero-CLS Frame + Region Explorer + Recent History) */}
          {step === 1 && (
            <div className="min-h-[440px] flex flex-col justify-between gap-3">
              <div className="space-y-3">
                {/* Search Bar */}
                <div className="space-y-1.5" ref={dropdownRef}>
                  <div className="flex items-center justify-between">
                    <label className="block text-[13px] font-extrabold text-secondary">
                      1. 자금 조달을 설계할 동탄 아파트 선택
                    </label>
                    <span className="text-[10.5px] font-bold text-tertiary">
                      총 {filteredApts.length}개 단지 탐색 가능
                    </span>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" size={16} />
                    <input
                      type="text"
                      placeholder="단지명 또는 동 검색 (예: 힐스테이트, 여울동)"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsFocused(true);
                        if (selectedApt) setSelectedApt(null);
                      }}
                      onFocus={() => setIsFocused(true)}
                      className="w-full bg-body border border-transparent focus:border-blue-600 focus:bg-surface rounded-xl py-2 pl-9 pr-8 text-[13px] font-bold text-primary outline-none transition-all placeholder:text-tertiary"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedApt(null);
                          setIsFocused(true);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary cursor-pointer"
                        aria-label="검색어 지우기"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Recent Selection History Bar */}
                <div
                  className="bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 rounded-xl px-3 py-2"
                  data-testid="recent-apartments-bar"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10.5px] font-extrabold text-secondary">
                      최근 선택한 단지 기록
                    </span>
                    {recentApts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          clearRecentApartments();
                          setRecentApts([]);
                        }}
                        className="text-[10px] font-bold text-tertiary hover:text-secondary cursor-pointer"
                      >
                        전체 삭제
                      </button>
                    )}
                  </div>
                  {recentApts.length > 0 ? (
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                      {recentApts.map((item) => {
                        const matchedApt = allApartments.find(
                          (a) => normalizeAptName(a.name) === normalizeAptName(item.name)
                        ) || { name: item.name, dong: item.dong };
                        const isCurrent =
                          selectedApt && normalizeAptName(selectedApt.name) === normalizeAptName(item.name);
                        return (
                          <div
                            key={item.name}
                            className={`inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-lg border text-[11px] font-bold shrink-0 transition-all ${
                              isCurrent
                                ? 'bg-blue-500/10 border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-secondary hover:border-slate-300'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleAptSelect(matchedApt)}
                              className="cursor-pointer truncate max-w-[140px]"
                            >
                              {getDisplayAptName(item.name)}
                            </button>
                            <button
                              type="button"
                              aria-label={`${item.name} 기록 삭제`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setRecentApts(removeRecentApartment(item.name));
                              }}
                              className="text-tertiary hover:text-secondary p-0.5 cursor-pointer"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[10.5px] text-tertiary font-medium">
                      단지를 선택하면 최근 조회 내역이 이 자리에 자동 기록됩니다.
                    </p>
                  )}
                </div>

                {/* Region Filter Tabs + Fixed-Height Inline Apartment Explorer */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5" data-testid="apt-region-tabs">
                    {REGION_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSelectedRegion(tab.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold shrink-0 transition-all cursor-pointer border ${
                          selectedRegion === tab.id
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-body text-tertiary border-border/40 hover:text-secondary'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div
                    className="h-[148px] bg-surface border border-border/80 rounded-xl overflow-y-auto overscroll-contain py-1 divide-y divide-border/20"
                    data-testid="apt-search-dropdown"
                  >
                    {filteredApts.length > 0 ? (
                      filteredApts.map((apt) => {
                        const isSelected =
                          selectedApt && normalizeAptName(selectedApt.name) === normalizeAptName(apt.name);
                        const estPrice = getEstimatedMarketPrice(apt, txSummaryData, nameMapping);
                        return (
                          <button
                            key={apt.name}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleAptSelect(apt)}
                            className={`w-full text-left px-3.5 py-2 text-[12.5px] font-bold flex items-center justify-between cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-blue-50/70 dark:bg-blue-950/25 text-blue-600 dark:text-blue-400'
                                : 'hover:bg-body text-secondary'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              {isSelected && <Check size={13} className="text-blue-600 shrink-0" />}
                              <span className="truncate">{getDisplayAptName(apt.name)}</span>
                              <span className="text-[10px] text-tertiary px-1.5 py-0.5 bg-body rounded shrink-0">
                                {apt.dong}
                              </span>
                            </div>
                            <span className="text-[11.5px] font-black text-primary tabular-nums shrink-0 ml-2">
                              {(estPrice / 10000).toFixed(1)}억
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="h-full flex items-center justify-center px-4 text-[12px] font-bold text-tertiary text-center">
                        조건에 맞는 단지가 없습니다. 다른 권역이나 검색어를 선택해 보세요.
                      </div>
                    )}
                  </div>
                </div>

                {/* Fixed-slot Market Price Card */}
                <div className="bg-body px-4 py-3 rounded-xl border border-border flex items-center justify-between gap-3 min-h-[64px]">
                  <div>
                    <p className="text-[10.5px] text-tertiary font-bold">최근 3M 매매 평균시세</p>
                    {selectedApt ? (
                      <p className="text-[15px] text-primary font-black mt-0.5 tabular-nums">
                        {(marketPrice / 10000).toFixed(1)}억원
                      </p>
                    ) : (
                      <p className="text-[12.5px] text-tertiary font-bold mt-0.5">
                        위 목록에서 단지를 선택해 주세요
                      </p>
                    )}
                  </div>
                  <span className="text-[10.5px] font-bold bg-[#e8f3ff] text-blue-600 px-2 py-0.5 rounded-md shrink-0">
                    D-VIEW 실거래 기준
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!selectedApt}
                  className="w-full bg-blue-600 hover:bg-[#046862] disabled:opacity-40 disabled:pointer-events-none text-white py-3.5 rounded-xl text-[14px] font-black shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all cursor-pointer border-none flex items-center justify-center gap-1"
                >
                  <span>다음 단계 (가구 요건)</span>
                </button>

                {hasQuizAnswers && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedApt) return;
                      setIsCalculating(true);
                      calculateTimeoutRef.current = setTimeout(() => {
                        setIsCalculating(false);
                        setStep(4);
                      }, 1200);
                    }}
                    disabled={isCalculating || !selectedApt}
                    className="w-full bg-slate-900/95 dark:bg-blue-950/20 hover:bg-slate-800 dark:hover:bg-blue-950/45 disabled:opacity-40 text-blue-600 dark:text-blue-400 border border-blue-600/40 py-3 rounded-xl text-[13.5px] font-black active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sparkles size={14} className="fill-blue-600/30 text-blue-600 dark:text-blue-400" />
                    <span>{isCalculating ? '퀴즈 기반 자동 진단 중...' : '퀴즈 결과로 바로 진단하기 (원클릭)'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Family Status Selection */}
          {step === 2 && (
            <div className="min-h-[440px] flex flex-col justify-between gap-5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-[13px] font-extrabold text-secondary">
                  2. 귀하의 현재 가구 상황을 선택해 주세요
                </label>
                {hasQuizAnswers && (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    <Sparkles size={11} className="fill-emerald-500/30 text-emerald-500" />
                    <span>퀴즈 답변 반영됨</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {HOUSEHOLD_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setHouseholdType(type.id)}
                    className={`w-full text-left p-4 rounded-2xl border text-secondary transition-all cursor-pointer flex flex-col gap-1.5 ${
                      householdType === type.id
                        ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/10 shadow-sm'
                        : 'border-border/30 bg-body/60 hover:bg-body'
                    }`}
                  >
                    <span className="text-[13.5px] font-black text-primary flex items-center justify-between w-full">
                      <span>{type.label}</span>
                      {householdType === type.id && <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]"><Check size={12} strokeWidth={3} /></span>}
                    </span>
                    <span className="text-[11.5px] text-tertiary font-medium">{type.desc}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handlePrevStep}
                  className="flex-1 bg-body hover:bg-border/30 text-secondary py-3.5 rounded-xl text-[13px] font-extrabold transition-all cursor-pointer border border-border/40 flex items-center justify-center gap-1"
                >
                  <ArrowLeft size={14} />
                  <span>이전</span>
                </button>
                <button
                  onClick={handleNextStep}
                  className="flex-[2] bg-blue-600 hover:bg-[#046862] text-white py-3.5 rounded-xl text-[13px] font-black shadow-sm transition-all cursor-pointer border-none"
                >
                  <span>다음 단계 (소득/자산)</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Income, Assets, Kids */}
          {step === 3 && (
            <div className="min-h-[440px] flex flex-col justify-between gap-5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[13px] font-extrabold text-secondary">
                  3. 부부 소득 및 순자산을 입력해 주세요
                </label>
                {hasQuizAnswers && (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    <Sparkles size={11} className="fill-emerald-500/30 text-emerald-500" />
                    <span>퀴즈 답변 반영됨</span>
                  </span>
                )}
              </div>

      {/* Income slider + input */}
              <div className="space-y-2 bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-[12.5px] font-extrabold text-primary">부부합산 연소득 (세전)</span>
                    {hasQuizAnswers && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-0.5 mt-0.5">
                        <Sparkles size={9} className="fill-emerald-500/30 text-emerald-500" /> 설문 기반 자동 입력됨
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                      <Calculator size={11} className="text-emerald-500" />
                      <span>{formatEokMan(parseInt(annualIncome.replace(/,/g, ''), 10) || 0)}/년</span>
                    </span>
                    <div className="relative w-32">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="7,500"
                        value={annualIncomeInputValue}
                        onChange={handleAnnualIncomeChange}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-blue-600 rounded-xl py-1.5 pl-2.5 pr-12 text-right text-[13px] font-black text-primary outline-none transition-all tabular-nums"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10.5px] font-bold text-tertiary pointer-events-none">만원/년</span>
                    </div>
                  </div>
                </div>

                <div className="pt-1 px-0.5">
                  <input
                    type="range"
                    data-testid="mortgage-income-slider"
                    aria-label="부부합산 연소득 슬라이더"
                    min="2000"
                    max="25000"
                    step="500"
                    value={Math.min(25000, Math.max(2000, parseInt(annualIncome.replace(/,/g, ''), 10) || 7500))}
                    onChange={(e) => setAnnualIncome(e.target.value)}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-tertiary font-bold mt-1.5 px-0.5">
                    <button type="button" onClick={() => setAnnualIncome('2000')} className="hover:text-primary cursor-pointer">2,000만</button>
                    <button type="button" onClick={() => setAnnualIncome('6000')} className="hover:text-emerald-600 cursor-pointer">6,000만(일반)</button>
                    <button type="button" onClick={() => setAnnualIncome('8500')} className="hover:text-emerald-600 cursor-pointer">8,500만(신혼)</button>
                    <button type="button" onClick={() => setAnnualIncome('20000')} className="hover:text-emerald-600 cursor-pointer">2억(신생아)</button>
                    <button type="button" onClick={() => setAnnualIncome('25000')} className="hover:text-primary cursor-pointer">2.5억</button>
                  </div>
                </div>

                <p className="text-[10.5px] text-tertiary font-medium pt-0.5">
                  * 슬라이더를 좌우로 움직이거나 구간 라벨을 클릭해 맞벌이 합산 연소득을 설정하세요.
                </p>
              </div>

              {/* Net asset slider + input */}
              <div className="space-y-2 bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-[12.5px] font-extrabold text-primary">가구보유 순자산 규모 (총자산 - 대출채무)</span>
                    {hasQuizAnswers && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-0.5 mt-0.5">
                        <Sparkles size={9} className="fill-emerald-500/30 text-emerald-500" /> 설문 기반 자동 입력됨
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                      <Calculator size={11} className="text-emerald-500" />
                      <span>{formatEokMan(Math.round((parseFloat(netAssets.replace(/,/g, '')) || 0) * 10000))}</span>
                    </span>
                    <div className="relative w-28">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="3.5"
                        value={netAssetsInputValue}
                        onChange={handleNetAssetsChange}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-blue-600 rounded-xl py-1.5 pl-2.5 pr-9 text-right text-[13px] font-black text-primary outline-none transition-all tabular-nums"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10.5px] font-bold text-tertiary pointer-events-none">억원</span>
                    </div>
                  </div>
                </div>

                <div className="pt-1 px-0.5">
                  <input
                    type="range"
                    data-testid="mortgage-assets-slider"
                    aria-label="가구보유 순자산 규모 슬라이더"
                    min="0"
                    max="15"
                    step="0.1"
                    value={Math.min(15, Math.max(0, parseFloat(netAssets.replace(/,/g, '')) || 3.5))}
                    onChange={(e) => setNetAssets(parseFloat(e.target.value).toFixed(1))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-tertiary font-bold mt-1.5 px-0.5">
                    <button type="button" onClick={() => setNetAssets('0.5')} className="hover:text-primary cursor-pointer">5천만</button>
                    <button type="button" onClick={() => setNetAssets('2.5')} className="hover:text-primary cursor-pointer">2.5억</button>
                    <button type="button" onClick={() => setNetAssets('4.6')} className="hover:text-emerald-600 cursor-pointer">4.69억(디딤돌한도)</button>
                    <button type="button" onClick={() => setNetAssets('8.0')} className="hover:text-primary cursor-pointer">8억</button>
                    <button type="button" onClick={() => setNetAssets('15.0')} className="hover:text-primary cursor-pointer">15억+</button>
                  </div>
                </div>

                <p className="text-[10.5px] text-tertiary font-medium pt-0.5">
                  * 2026년 디딤돌대출 자산 한도는 <strong className="text-primary font-extrabold">4억 6,900만원</strong> 이하입니다. (주택도시기금 기준)
                </p>
              </div>
              {/* Kids Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-secondary">미성년 자녀 수 (자녀 수에 따른 금리 우대)</span>
                  {hasQuizAnswers && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-0.5">
                      <Sparkles size={9} className="fill-emerald-500/30 text-emerald-500" /> 설문 기반 자동 입력됨
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map(count => (
                    <button
                      key={count}
                      onClick={() => setChildrenCount(count)}
                      className={`py-2 rounded-xl text-[12.5px] font-extrabold border transition-all cursor-pointer ${
                        childrenCount === count
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/10 text-primary'
                          : 'border-border/30 bg-body/60 hover:bg-body text-tertiary'
                      }`}
                    >
                      {count === 3 ? '3명 이상' : `${count}명`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handlePrevStep}
                  className="flex-1 bg-body hover:bg-border/30 text-secondary py-3.5 rounded-xl text-[13px] font-extrabold transition-all cursor-pointer border border-border/40 flex items-center justify-center gap-1"
                >
                  <ArrowLeft size={14} />
                  <span>이전</span>
                </button>
                <button
                  onClick={handleStartSimulate}
                  disabled={isCalculating || !annualIncome}
                  className="flex-[2] bg-blue-600 hover:bg-[#046862] text-white py-3.5 rounded-xl text-[13.5px] font-black shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isCalculating ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>{hasQuizAnswers ? '퀴즈 기반 자동 진단 중...' : '자금 설계 시뮬레이션 중...'}</span>
                    </>
                  ) : (
                    <>
                      <span>자금 조달 보고서 생성</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Diagnosis Results */}
          {step === 4 && loanResults && repaymentDetails && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start animate-in zoom-in-95 fade-in duration-300">
              {/* Left Column (6 cols): Verdict & Capital Breakdown */}
              <div className="md:col-span-6 space-y-3.5">
                {/* Product Badge & Alternatives Card */}
                <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl flex flex-col gap-2.5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="text-[10.5px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      최적 정책금융 상품 매칭 완료
                    </span>
                    <span
                      className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/75 dark:bg-slate-800 px-2 py-0.5 rounded-md tabular-nums"
                      data-testid="mortgage-macro-rate-badge"
                    >
                      국고채 {loanResults.macroMeta.riskFreeRate.toFixed(2)}% · COFIX {loanResults.macroMeta.fundingCost.toFixed(2)}% 연동
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedCandidateName(loanResults.bestProduct)}
                    className={`w-full text-left rounded-xl p-3 transition-all cursor-pointer border ${
                      loanResults.activeProduct === loanResults.bestProduct
                        ? 'bg-white dark:bg-slate-900 border-blue-600 shadow-sm'
                        : 'bg-white/60 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="inline-flex items-center text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        {loanResults.matchBadge}
                      </span>
                      <span className="text-[10px] font-bold text-tertiary shrink-0">
                        {loanResults.activeProduct === loanResults.bestProduct ? '시뮬레이션 적용 중' : '클릭 시 시뮬레이션 전환'}
                      </span>
                    </div>
                    <h3 className="text-[15px] font-black text-primary break-keep tracking-tight leading-snug">
                      추천: <span className="text-blue-600 dark:text-blue-400">{loanResults.bestProduct}</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3 mt-2.5 pt-2.5 border-t border-slate-200/70 dark:border-slate-800">
                      <div>
                        <span className="text-[10.5px] text-tertiary font-bold block">대출 가능 한도 (LTV·DSR)</span>
                        <span className="text-[15px] font-black text-primary mt-0.5 block tabular-nums tracking-tight">
                          {(loanResults.maxLoanAmount / 10000).toFixed(1)}억원
                        </span>
                      </div>
                      <div className="pl-3 border-l border-slate-200/70 dark:border-slate-800">
                        <span className="text-[10.5px] text-tertiary font-bold block">적용 금리 (시장연동)</span>
                        <span className="text-[15px] font-black text-blue-600 dark:text-blue-400 mt-0.5 block tabular-nums tracking-tight">
                          {loanResults.finalRate.toFixed(2)}% <span className="text-[10px] font-bold text-tertiary">({loanResults.rateTypeLabel})</span>
                        </span>
                      </div>
                    </div>
                  </button>

                  {loanResults.alternatives && loanResults.alternatives.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 space-y-2" data-testid="mortgage-alternatives-list">
                      <div className="flex items-center justify-between px-0.5">
                        <span className="text-[10.5px] font-extrabold text-secondary">
                          차순위 대안 상품 비교 (시장·DSR 연동)
                        </span>
                        <span className="text-[9.5px] font-bold text-tertiary">
                          클릭 시 상환 시뮬레이션 전환
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {loanResults.alternatives.map((alt) => {
                          const isSelected = loanResults.activeProduct === alt.name;
                          return (
                            <button
                              key={alt.name}
                              type="button"
                              onClick={() => setSelectedCandidateName(alt.name)}
                              className={`w-full text-left flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-white dark:bg-slate-900 border-blue-600 shadow-sm'
                                  : 'bg-white/75 dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded shrink-0 ${
                                    isSelected
                                      ? 'bg-blue-600 text-white'
                                      : 'text-slate-600 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-800'
                                  }`}>
                                    {alt.rankLabel}
                                  </span>
                                  <span className="text-[12px] font-extrabold text-primary break-keep truncate">
                                    {alt.name}
                                  </span>
                                </div>
                                <span className="text-[10px] text-tertiary font-medium block mt-0.5 truncate">
                                  {alt.summary}
                                </span>
                              </div>
                              <div className="text-right shrink-0 pl-2.5 border-l border-slate-200/70 dark:border-slate-800">
                                <span className="text-[11.5px] font-black text-primary block tabular-nums">
                                  한도 {(alt.maxLoanAmount / 10000).toFixed(1)}억
                                </span>
                                <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 block tabular-nums">
                                  금리 {alt.finalRate.toFixed(2)}%
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Capital breakdown detail card */}
                <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl space-y-2.5">
                  <h4 className="text-[12.5px] font-extrabold text-primary flex items-center gap-1.5">
                    <Calculator size={14} className="text-blue-600 dark:text-blue-400" /> 총 매수 자금 조달 내역
                  </h4>

                  <div className="grid grid-cols-2 gap-2 text-[12px] font-bold text-secondary bg-white dark:bg-slate-900/70 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    <div className="flex justify-between items-center col-span-2 border-b border-slate-200/60 dark:border-slate-800 pb-2 mb-0.5">
                      <span className="text-tertiary">대상 단지 매매가</span>
                      <span className="text-primary tabular-nums">{(marketPrice / 10000).toFixed(1)}억원</span>
                    </div>
                    <div className="flex justify-between items-center col-span-2">
                      <span className="text-tertiary">1순위 매칭 대출액</span>
                      <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">-{(loanResults.maxLoanAmount / 10000).toFixed(1)}억원</span>
                    </div>
                    <div className="flex justify-between items-center col-span-2">
                      <span className="text-tertiary">취득세 및 부대비용</span>
                      <span className="text-red-500 tabular-nums">+{(loanResults.fees.totalFees / 10000).toFixed(2)}억원</span>
                    </div>
                    <div className="flex justify-between items-center col-span-2 border-t border-slate-200/60 dark:border-slate-800 pt-2 mt-0.5 font-black text-[13px]">
                      <span className="text-primary">필요 자기자본 (실제 내 돈)</span>
                      <span className="text-blue-600 dark:text-blue-400 tabular-nums">{(loanResults.ownCapitalRequired / 10000).toFixed(2)}억원</span>
                    </div>
                  </div>

                  <p className="text-[10.5px] text-tertiary leading-relaxed break-keep px-0.5">
                    * 부대비용은 취득세 약 {(loanResults.fees.tax / 10000).toFixed(2)}억원, 중개보수 약 {(loanResults.fees.brokerFee / 10000).toFixed(1)}만원, 법무비용 등 기타 {(loanResults.fees.otherFee / 10000).toFixed(1)}만원을 합산한 근사값입니다.
                  </p>
                </div>
              </div>

              {/* Right Column (6 cols): Repayment Simulation & AdSlot */}
              <div className="md:col-span-6 space-y-3.5">
                {/* Repayment Selector & Chart Card */}
                <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[12.5px] font-extrabold text-primary">월 고정 상환액 시뮬레이션</h4>
                    <div className="flex bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200/70 dark:border-slate-800">
                      {[10, 20, 30].map(y => (
                        <button
                          key={y}
                          onClick={() => setMaturityYears(y)}
                          className={`px-2.5 py-1 text-[11px] font-extrabold rounded-md transition-all cursor-pointer tabular-nums ${
                            maturityYears === y ? 'bg-blue-600 text-white shadow-sm' : 'text-tertiary hover:text-secondary'
                          }`}
                        >
                          {y}년
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900/70 px-4 py-3 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10.5px] text-tertiary font-bold block">매월 원리금 상환액</span>
                      <span className="text-[16.5px] font-black text-primary block mt-0.5 tabular-nums tracking-tight">
                        {(repaymentDetails.monthlyPayment / 10000).toFixed(1)}만원
                      </span>
                    </div>
                    <div className="text-right pl-3 border-l border-slate-200/70 dark:border-slate-800">
                      <span className="text-[10.5px] text-tertiary font-bold block">상환 방식</span>
                      <span className="text-[12px] font-extrabold text-secondary block mt-0.5">
                        원리금균등분할상환
                      </span>
                    </div>
                  </div>

                  {/* Recharts Area Chart with non-overlapping Legend header */}
                  <div className="w-full bg-white dark:bg-slate-900/70 rounded-xl border border-slate-200/60 dark:border-slate-800 p-3">
                    <div className="flex items-center justify-between mb-2 px-0.5">
                      <span className="text-[10px] font-bold text-tertiary">연차별 잔액 · 누적이자 추이</span>
                      <div className="flex items-center gap-3 text-[10px] font-bold text-tertiary">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-600 rounded-sm" />남은 대출 원금</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500/75 rounded-sm" />납부 누적이자</span>
                      </div>
                    </div>
                    <div className="w-full h-36">
                      {mounted ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                          <AreaChart
                            data={repaymentDetails.chartData}
                            margin={{ top: 6, right: 8, left: 4, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                              </linearGradient>
                              <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f04452" stopOpacity={0.15}/>
                                <stop offset="95%" stopColor="#f04452" stopOpacity={0.0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#888' }} />
                            <YAxis
                              width={40}
                              tickLine={false}
                              axisLine={false}
                              tick={{ fontSize: 9.5, fontWeight: 'bold', fill: '#888' }}
                              tickFormatter={(val: number) => {
                                if (!val || val === 0) return '0';
                                if (val >= 10000) {
                                  const eok = val / 10000;
                                  return Number.isInteger(eok) ? `${eok}억` : `${eok.toFixed(1).replace(/\.0$/, '')}억`;
                                }
                                if (val >= 1000) {
                                  const cheon = val / 1000;
                                  return Number.isInteger(cheon) ? `${cheon}천만` : `${cheon.toFixed(1).replace(/\.0$/, '')}천만`;
                                }
                                return `${val.toLocaleString()}만`;
                              }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                background: 'rgba(255, 255, 255, 0.95)', 
                                border: '1px solid #ddd', 
                                borderRadius: '8px', 
                                fontSize: '11px',
                                fontWeight: 'bold'
                              }} 
                              formatter={(value: any, name: any) => [formatEokMan(Number(value) || 0), name]}
                              isAnimationActive={false}
                            />
                            <Area type="monotone" dataKey="남은 대출 원금" stroke="#2563eb" fillOpacity={1} fill="url(#colorPrincipal)" isAnimationActive={false} />
                            <Area type="monotone" dataKey="납부한 누적 이자" stroke="#f04452" fillOpacity={1} fill="url(#colorInterest)" isAnimationActive={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-body/20 rounded-xl" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Zero-CLS High-CPC Financial AdSlot on Diagnosis Result */}
                <div className="w-full" data-testid="mortgage-result-ad-slot">
                  <AdSlot
                    slotId="1000000002"
                    format="in-feed"
                    apartmentName={selectedApt?.name}
                    dong={selectedApt?.dong}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Docked Footer Action Bar for Step 4 (Prevents scroll overlap) */}
        {step === 4 && loanResults && repaymentDetails && (
          <footer className="shrink-0 border-t border-slate-200/80 dark:border-slate-800 px-6 py-3.5 bg-white dark:bg-slate-900 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 bg-body hover:bg-border/30 text-secondary py-3 rounded-xl text-[13px] font-extrabold transition-all cursor-pointer border border-border/40 flex items-center justify-center gap-1.5 active:scale-95"
            >
              <ArrowLeft size={14} />
              <span>조건 수정</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="flex-1 bg-body hover:bg-border/30 text-secondary py-3 rounded-xl text-[13px] font-extrabold transition-all cursor-pointer border border-border/40 flex items-center justify-center gap-1.5 active:scale-95"
            >
              {isCopied ? (
                <>
                  <Check size={14} className="text-emerald-500" />
                  <span>복사 완료!</span>
                </>
              ) : (
                <>
                  <Share2 size={14} />
                  <span>텍스트 복사</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleKakaoShare}
              className="flex-1 bg-primary hover:bg-primary/90 text-surface py-3 rounded-xl text-[13px] font-extrabold transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
            >
              <MessageSquare size={14} />
              <span>카카오톡 공유</span>
            </button>
          </footer>
        )}
      </div>
    </div>,
    document.getElementById('modal-root') || document.body
  );
});

MortgageCalculator.displayName = 'MortgageCalculator';
export default MortgageCalculator;
