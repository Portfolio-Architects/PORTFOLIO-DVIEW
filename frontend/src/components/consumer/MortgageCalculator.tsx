'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Search, Check, Share2, ArrowLeft, RefreshCw, Calculator, Award, ChevronDown, MessageSquare, Sparkles } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DongApartment } from '@/lib/dong-apartments';
import { AptTxSummary } from '@/lib/types/transaction';
import { FieldReportData } from '@/lib/types/report.types';
import { findTxKey, normalizeAptName, getDisplayAptName } from '@/lib/utils/apartmentMapping';
import { shareMortgageToKakao } from '@/lib/utils/kakaoShare';
import { localCache } from '@/lib/utils/localCache';
import { QuizAnswerSchema } from '@/lib/validation/facade.schemas';
import { logger } from '@/lib/services/logger';

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

const MortgageCalculator = React.memo(function MortgageCalculator({
  isOpen,
  onClose,
  initialAptName,
  sheetApartments,
  txSummaryData,
  nameMapping,
  fieldReportsMap,
}: MortgageCalculatorProps) {
  const allApartments = useMemo(() => {
    return Object.values(sheetApartments).flat().map(a => ({
      ...a,
      normalizedName: normalizeAptName(a.name)
    }));
  }, [sheetApartments]);

  // Selected apartment state
  const [selectedApt, setSelectedApt] = useState<DongApartment | null>(null);

  // Search input & focus state
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Wizard Step State
  const [step, setStep] = useState(1); // 1: Apt/Price, 2: Family Status, 3: Income/Assets, 4: Result

  // Inputs
  const [householdType, setHouseholdType] = useState<'single' | 'newborn' | 'newlyweds' | 'firsttime' | 'normal'>('normal');
  const [annualIncome, setAnnualIncome] = useState<string>(''); // Man-won
  const [annualIncomeInputValue, setAnnualIncomeInputValue] = useState<string>(''); // For formatted text input
  const [netAssets, setNetAssets] = useState<string>(''); // Eok
  const [netAssetsInputValue, setNetAssetsInputValue] = useState<string>(''); // For formatted text input
  const [childrenCount, setChildrenCount] = useState<number>(0);
  
  // Repayment parameters (in Step 4)
  const [maturityYears, setMaturityYears] = useState<number>(30); // 10, 15, 20, 30

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
        const answers = localCache.get('dview_quiz_answers', QuizAnswerSchema, null);
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
  const handleAptSelect = (apt: DongApartment) => {
    setSelectedApt(apt);
    setSearchQuery(getDisplayAptName(apt.name));
    setIsFocused(false);
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
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Handle clicking outside of dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Filter list for Autocomplete
  const filteredApts = useMemo(() => {
    if (!searchQuery.trim()) return allApartments;
    const query = normalizeAptName(searchQuery);
    return allApartments.filter(a => a.normalizedName.includes(query) || a.dong.includes(searchQuery));
  }, [searchQuery, allApartments]);

  // Retrieve market price
  const marketPrice = useMemo(() => {
    if (!selectedApt) return 0;
    return getEstimatedMarketPrice(selectedApt, txSummaryData, nameMapping);
  }, [selectedApt, txSummaryData, nameMapping]);

  // Run calculation logic
  const loanResults = useMemo(() => {
    if (!selectedApt || marketPrice === 0) return null;

    const incomeVal = parseInt(annualIncome) || 0; // Man-won
    const assetsEok = parseFloat(netAssets) || 0; // Eok
    const assetsVal = assetsEok * 10000; // Man-won

    // 1. Check Newborn special loan (신생아 특례 디딤돌)
    // Limits: Price <= 9억, Income <= 2억, Assets <= 4.69억
    const isNewbornEligible = 
      householdType === 'newborn' &&
      marketPrice <= 90000 &&
      incomeVal <= 20000 &&
      assetsVal <= 46900;

    // 2. Check Newlyweds loan (신혼부부 전용 디딤돌)
    // Limits: Price <= 6억, Income <= 8.5천, Assets <= 4.69억
    const isNewlywedsEligible =
      householdType === 'newlyweds' &&
      marketPrice <= 60000 &&
      incomeVal <= 8500 &&
      assetsVal <= 46900;

    // 3. Check General/First-time loan (일반/생애최초 디딤돌)
    // Limits: Price <= 5억 (First-time <= 6억), Income <= 6천 (First-time <= 7천), Assets <= 4.69억
    const isFirstTime = householdType === 'firsttime';
    const priceLimit = isFirstTime ? 60000 : 50000;
    const incomeLimit = isFirstTime ? 7000 : 6000;
    const isGeneralEligible =
      marketPrice <= priceLimit &&
      incomeVal <= incomeLimit &&
      assetsVal <= 46900;

    // 4. Check Bogeumjari Loan (보금자리론)
    // Limits: Price <= 6억, Income <= 7천 (Newlyweds 8.5천, 3-children 1억), no asset test
    let bogeumjariIncomeLimit = 7000;
    if (householdType === 'newlyweds') bogeumjariIncomeLimit = 8500;
    if (childrenCount >= 3) bogeumjariIncomeLimit = 10000;
    const isBogeumjariEligible =
      marketPrice <= 60000 &&
      incomeVal <= bogeumjariIncomeLimit;

    // Select the best product
    let bestProduct = '시중은행 주택담보대출';
    let baseRate = 3.8; // default commercial rate
    let maxLoanAmount = Math.round(marketPrice * 0.7); // standard LTV 70%
    let loanType: 'newborn' | 'newlyweds' | 'general' | 'bogeumjari' | 'commercial' = 'commercial';

    if (isNewbornEligible) {
      bestProduct = '신생아 특례 디딤돌대출';
      loanType = 'newborn';
      maxLoanAmount = Math.min(50000, Math.round(marketPrice * 0.8)); // Newborn LTV 80%, max 5억
      // Rate estimation (1.6% ~ 3.3%)
      if (incomeVal <= 2000) baseRate = 1.6;
      else if (incomeVal <= 4000) baseRate = 2.15;
      else if (incomeVal <= 6000) baseRate = 2.5;
      else if (incomeVal <= 8000) baseRate = 2.8;
      else if (incomeVal <= 13000) baseRate = 3.0;
      else baseRate = 3.3;
    } else if (isNewlywedsEligible) {
      bestProduct = '신혼부부 전용 디딤돌대출';
      loanType = 'newlyweds';
      maxLoanAmount = Math.min(40000, Math.round(marketPrice * 0.8)); // Newlyweds LTV 80%, max 4억
      // Rate (2.15% ~ 3.25%)
      if (incomeVal <= 2000) baseRate = 2.15;
      else if (incomeVal <= 4000) baseRate = 2.5;
      else if (incomeVal <= 7000) baseRate = 3.0;
      else baseRate = 3.25;
    } else if (isGeneralEligible) {
      bestProduct = isFirstTime ? '생애최초 디딤돌대출' : '일반 디딤돌대출';
      loanType = 'general';
      const ltvRatio = isFirstTime ? 0.8 : 0.7;
      const absoluteMax = isFirstTime ? 30000 : 25000;
      maxLoanAmount = Math.min(absoluteMax, Math.round(marketPrice * ltvRatio));
      // Rate (2.45% ~ 3.55%)
      if (incomeVal <= 2000) baseRate = 2.45;
      else if (incomeVal <= 4000) baseRate = 2.8;
      else if (incomeVal <= 6000) baseRate = 3.1;
      else baseRate = 3.55;
    } else if (isBogeumjariEligible) {
      bestProduct = '아낌e 보금자리론';
      loanType = 'bogeumjari';
      const isFirstTimeBuyer = householdType === 'firsttime' || householdType === 'newborn';
      const ltvRatio = isFirstTimeBuyer ? 0.8 : 0.7;
      const bogeumjariAbsoluteMax = householdType === 'newlyweds' ? 42000 : 36000;
      maxLoanAmount = Math.min(bogeumjariAbsoluteMax, Math.round(marketPrice * ltvRatio));
      baseRate = 4.2; // typical rate
    } else {
      // Fallback: Commercial Mortgage
      // LTV 70% or 80% if first-time
      const isFirstTimeBuyer = householdType === 'firsttime' || householdType === 'newborn' || householdType === 'newlyweds';
      const ltvRatio = isFirstTimeBuyer ? 0.8 : 0.7;
      maxLoanAmount = Math.round(marketPrice * ltvRatio);
      baseRate = 3.8;
    }

    // Apply children rate cuts for policy loans (-0.2% per child, newborn/newweds/general)
    let finalRate = baseRate;
    if (loanType !== 'commercial' && childrenCount > 0) {
      // Newborn/newweds/general child cuts
      const cut = childrenCount * 0.2;
      finalRate = Math.max(1.2, baseRate - cut); // floor at 1.2%
    }

    // Taxes and Fees
    const fees = calculateAcquisitionCost(marketPrice);
    
    // Total capital required
    const ownCapitalRequired = Math.max(0, marketPrice - maxLoanAmount) + fees.totalFees;

    return {
      loanType,
      bestProduct,
      maxLoanAmount,
      finalRate,
      ownCapitalRequired,
      fees,
      isNewbornEligible,
      isNewlywedsEligible,
      isGeneralEligible,
      isBogeumjariEligible
    };
  }, [selectedApt, marketPrice, householdType, annualIncome, netAssets, childrenCount]);

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

✅ 추천 대출 상품: [${loanResults.bestProduct}]
- 최대 한도: ${(loanResults.maxLoanAmount / 10000).toFixed(2)}억원
- 적용 이율: ${loanResults.finalRate.toFixed(2)}%
- 만기 ${maturityYears}년 기준 월 원리금: ${(repaymentDetails.monthlyPayment / 10000).toFixed(1)}만원

🏠 필요 자기자본(내 돈): ${(loanResults.ownCapitalRequired / 10000).toFixed(2)}억원
(매매 편차 + 취득세/수수료 등 부대비용 ${(loanResults.fees.totalFees / 10000).toFixed(2)}억원 포함)

💡 대출 적합 자격 판정 및 상환 시뮬레이션 상세 내역은 D-VIEW에서 바로 진단해 보세요!`;

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
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[12000] flex flex-col justify-end md:justify-center items-center p-0 md:p-6 lg:p-8 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md" onClick={onClose} />

      {/* Modal Container */}
      <div
        ref={containerRef}
        className="relative bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-white/20 dark:border-white/10 w-full max-w-[550px] h-[92vh] md:h-auto md:min-h-[460px] md:max-h-[85vh] rounded-t-[24px] md:rounded-[24px] flex flex-col shadow-2xl transition-transform duration-300 slide-in-from-bottom overflow-hidden"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border/40 px-6 py-4 shrink-0 bg-surface/50">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[17px] font-black text-primary flex items-center gap-1.5">
              <span>내 집 마련 대출 자가진단</span>
            </h2>
            <p className="text-[12px] font-medium text-tertiary">
              내 상황에 꼭 맞는 가장 금리가 낮은 대출과 매수 자금 조달 계획을 수립합니다.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-body hover:bg-border/30 text-secondary transition-all"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </header>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          
          {/* STEP 1: Select Apartment */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-2" ref={dropdownRef}>
                <label className="block text-[13px] font-extrabold text-secondary">
                  1. 자금 조달을 설계할 동탄 아파트 선택
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" size={16} />
                  <input
                    type="text"
                    placeholder="단지명 검색 (예: 동탄역 시범)"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (selectedApt) setSelectedApt(null);
                    }}
                    onFocus={() => setIsFocused(true)}
                    className="w-full bg-body border border-transparent focus:border-[#00d29d] focus:bg-surface rounded-xl py-2.5 pl-9 pr-8 text-[13.5px] font-bold text-primary outline-none transition-all placeholder:text-tertiary"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedApt(null);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary"
                    >
                      <X size={14} />
                    </button>
                  )}

                  {isFocused && (
                    <div className="absolute left-0 right-0 mt-1 bg-surface border border-border shadow-xl rounded-xl z-50 overflow-y-auto max-h-[180px] py-1">
                      {filteredApts.length > 0 ? (
                        filteredApts.map(apt => (
                          <button
                            key={apt.name}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleAptSelect(apt)}
                            className="w-full text-left px-4 py-2.5 text-[13px] font-bold hover:bg-body text-secondary flex items-center justify-between"
                          >
                            <span>{getDisplayAptName(apt.name)}</span>
                            <span className="text-[10px] text-tertiary px-1.5 py-0.5 bg-body rounded">{apt.dong}</span>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-2.5 text-[12px] font-bold text-tertiary text-center">검색 결과가 없습니다</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {selectedApt && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-3 duration-350">
                  <div className="bg-body p-4 rounded-xl border border-border flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] text-tertiary font-bold">최근 3M 매매 평균시세</p>
                      <p className="text-[15.5px] text-primary font-black mt-0.5">{(marketPrice / 10000).toFixed(1)}억원</p>
                    </div>
                    <span className="text-[10.5px] font-bold bg-[#e8f3ff] text-[#1b64da] px-2 py-0.5 rounded-md">
                      D-VIEW 실거래 기준
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleNextStep}
                      className="w-full bg-[#00d29d] hover:bg-[#00b585] text-white py-3.5 rounded-xl text-[14px] font-black shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition-all cursor-pointer border-none flex items-center justify-center gap-1 mt-2"
                    >
                      <span>다음 단계 (가구 요건)</span>
                    </button>

                    {hasQuizAnswers && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCalculating(true);
                          calculateTimeoutRef.current = setTimeout(() => {
                            setIsCalculating(false);
                            setStep(4);
                          }, 1200);
                        }}
                        disabled={isCalculating}
                        className="w-full bg-zinc-900/95 dark:bg-emerald-950/20 hover:bg-zinc-800 dark:hover:bg-emerald-950/45 text-[#00d29d] border border-[#00d29d]/40 py-3.5 rounded-xl text-[14px] font-black active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Sparkles size={14} className="fill-[#00d29d]/30 text-[#00d29d]" />
                        <span>{isCalculating ? '퀴즈 기반 자동 진단 중...' : '퀴즈 결과로 바로 진단하기 (원클릭)'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Family Status Selection */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-[13px] font-extrabold text-secondary">
                  2. 귀하의 현재 가구 상황을 선택해 주세요
                </label>
                {hasQuizAnswers && (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-emerald-600 dark:text-[#00d29d] bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    <Sparkles size={11} className="fill-emerald-500/30 text-emerald-500" />
                    <span>퀴즈 답변 반영됨</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {[
                  { id: 'newborn', label: '신생아 출산 가구', desc: '최근 2년 이내 출산(입양) 가구 (가장 이율이 낮음)' },
                  { id: 'newweds', label: '신혼부부 가구', desc: '혼인 신고 7년 이내인 부부' },
                  { id: 'firsttime', label: '생애최초 무주택 가구', desc: '세대원 전원이 주택을 소유한 적이 없는 가구' },
                  { id: 'normal', label: '일반 무주택 가구', desc: '현재 주택이 없는 무주택 세대주' },
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setHouseholdType(type.id as any)}
                    className={`w-full text-left p-4 rounded-2xl border text-secondary transition-all cursor-pointer flex flex-col gap-1.5 ${
                      householdType === type.id
                        ? 'border-[#00d29d] bg-emerald-50/40 dark:bg-emerald-950/10 shadow-sm'
                        : 'border-border/30 bg-body/60 hover:bg-body'
                    }`}
                  >
                    <span className="text-[13.5px] font-black text-primary flex items-center justify-between w-full">
                      <span>{type.label}</span>
                      {householdType === type.id && <span className="w-5 h-5 rounded-full bg-[#00d29d] text-white flex items-center justify-center text-[10px]"><Check size={12} strokeWidth={3} /></span>}
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
                  className="flex-[2] bg-[#00d29d] hover:bg-[#00b585] text-white py-3.5 rounded-xl text-[13px] font-black shadow-sm transition-all cursor-pointer border-none"
                >
                  <span>다음 단계 (소득/자산)</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Income, Assets, Kids */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[13px] font-extrabold text-secondary">
                  3. 부부 소득 및 순자산을 입력해 주세요
                </label>
                {hasQuizAnswers && (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-emerald-600 dark:text-[#00d29d] bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    <Sparkles size={11} className="fill-emerald-500/30 text-emerald-500" />
                    <span>퀴즈 답변 반영됨</span>
                  </span>
                )}
              </div>

              {/* Income input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-secondary">부부합산 연소득 (세전)</span>
                  {hasQuizAnswers && (
                    <span className="text-[10px] text-emerald-600 dark:text-[#00d29d] font-black flex items-center gap-0.5">
                      <Sparkles size={9} className="fill-emerald-500/30 text-emerald-500" /> 설문 기반 자동 입력됨
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="예: 7,500"
                    value={annualIncomeInputValue}
                    onChange={handleAnnualIncomeChange}
                    className="w-full bg-body border border-transparent focus:border-[#00d29d] focus:bg-surface rounded-xl py-2.5 px-3 text-right text-[13.5px] font-bold text-primary outline-none transition-all pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-tertiary">만원/년</span>
                </div>
                {annualIncome ? (
                  <div className="mt-1 flex items-center justify-end pr-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-emerald-600 dark:text-[#00d29d] bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      <Calculator size={10} className="text-emerald-500" />
                      <span>한글 읽기: {formatEokMan(parseInt(annualIncome.replace(/,/g, ''), 10) || 0)}/년</span>
                    </span>
                  </div>
                ) : null}
                <p className="text-[10.5px] text-tertiary font-medium pl-0.5">
                  * 디딤돌대출 자격 판단 기준이 됩니다. (맞벌이 소득 환산액)
                </p>
              </div>

              {/* Net asset input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-secondary">가구보유 순자산 규모 (총자산 - 대출채무)</span>
                  {hasQuizAnswers && (
                    <span className="text-[10px] text-emerald-600 dark:text-[#00d29d] font-black flex items-center gap-0.5">
                      <Sparkles size={9} className="fill-emerald-500/30 text-emerald-500" /> 설문 기반 자동 입력됨
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="예: 3.5"
                    value={netAssetsInputValue}
                    onChange={handleNetAssetsChange}
                    className="w-full bg-body border border-transparent focus:border-[#00d29d] focus:bg-surface rounded-xl py-2.5 px-3 text-right text-[13.5px] font-bold text-primary outline-none transition-all pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-tertiary">억원</span>
                </div>
                {netAssets ? (
                  <div className="mt-1 flex items-center justify-end pr-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-emerald-600 dark:text-[#00d29d] bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      <Calculator size={10} className="text-emerald-500" />
                      <span>한글 읽기: {formatEokMan(Math.round((parseFloat(netAssets.replace(/,/g, '')) || 0) * 10000))}</span>
                    </span>
                  </div>
                ) : null}
                <p className="text-[10.5px] text-tertiary font-medium pl-0.5">
                  * 2026년 디딤돌대출 자산 한도는 **4억 6,900만원** 이하입니다. (주택도시기금 기준)
                </p>
              </div>

              {/* Kids Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-secondary">미성년 자녀 수 (자녀 수에 따른 금리 우대)</span>
                  {hasQuizAnswers && (
                    <span className="text-[10px] text-emerald-600 dark:text-[#00d29d] font-black flex items-center gap-0.5">
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
                          ? 'border-[#00d29d] bg-emerald-50/50 dark:bg-emerald-950/10 text-primary'
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
                  className="flex-[2] bg-[#00d29d] hover:bg-[#00b585] text-white py-3.5 rounded-xl text-[13.5px] font-black shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 disabled:opacity-50"
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
            <div className="space-y-6 animate-in zoom-in-95 fade-in duration-300">
              
              {/* Product Badge Area */}
              <div className="bg-body/70 border border-border/40 p-5 rounded-2xl flex flex-col gap-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                <span className="text-[10px] font-black text-emerald-600 dark:text-[#00d29d] bg-emerald-500/10 px-2 py-0.5 rounded-md self-start">
                  최적 정책금융 상품 매칭 완료
                </span>
                <h3 className="text-[16px] font-black text-primary mt-1">
                  추천: <span className="text-emerald-500">{loanResults.bestProduct}</span>
                </h3>
                <div className="grid grid-cols-2 gap-4 mt-2 border-t border-border/30 pt-3">
                  <div>
                    <span className="text-[11px] text-tertiary font-bold block">대출 가능 한도</span>
                    <span className="text-[14.5px] font-black text-primary mt-0.5 block">
                      {(loanResults.maxLoanAmount / 10000).toFixed(1)}억원
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-tertiary font-bold block">적용 금리</span>
                    <span className="text-[14.5px] font-black text-[#1b64da] mt-0.5 block">
                      {loanResults.finalRate.toFixed(2)}% <span className="text-[10px] text-tertiary">(고정)</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Capital breakdown detail */}
              <div className="space-y-3">
                <h4 className="text-[12.5px] font-extrabold text-primary flex items-center gap-1.5">
                  <Calculator size={14} className="text-[#00d29d]" /> 총 매수 자금 조달 내역
                </h4>

                <div className="grid grid-cols-2 gap-2 text-[12px] font-bold text-secondary bg-body/30 p-4 rounded-xl border border-border/20">
                  <div className="flex justify-between col-span-2 border-b border-border/30 pb-2 mb-1">
                    <span className="text-tertiary">대상 단지 매매가</span>
                    <span className="text-primary">{(marketPrice / 10000).toFixed(1)}억원</span>
                  </div>
                  <div className="flex justify-between col-span-2">
                    <span className="text-tertiary">1순위 매칭 대출액</span>
                    <span className="text-emerald-600">-{(loanResults.maxLoanAmount / 10000).toFixed(1)}억원</span>
                  </div>
                  <div className="flex justify-between col-span-2">
                    <span className="text-tertiary">취득세 및 부대비용</span>
                    <span className="text-[#f43f5e]">+{(loanResults.fees.totalFees / 10000).toFixed(2)}억원</span>
                  </div>
                  <div className="flex justify-between col-span-2 border-t border-border/30 pt-2 mt-1 font-black text-[13px]">
                    <span className="text-primary">필요 자기자본 (실제 내 돈)</span>
                    <span className="text-[#1b64da]">{(loanResults.ownCapitalRequired / 10000).toFixed(2)}억원</span>
                  </div>
                </div>

                {/* Cost breakdown alert */}
                <div className="text-[10.5px] text-tertiary leading-relaxed px-1">
                  * 부대비용은 취득세 약 {(loanResults.fees.tax / 10000).toFixed(2)}억원, 중개보수 약 {(loanResults.fees.brokerFee / 10000).toFixed(1)}만원, 법무비용 등 기타 {(loanResults.fees.otherFee / 10000).toFixed(1)}만원을 합산한 근사값입니다.
                </div>
              </div>

              {/* Repayment Selector & Result */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-[12.5px] font-extrabold text-primary">월 고정 상환액 시뮬레이션</h4>
                  {/* Maturity selector */}
                  <div className="flex bg-body rounded-lg p-0.5 border border-border/20">
                    {[10, 20, 30].map(y => (
                      <button
                        key={y}
                        onClick={() => setMaturityYears(y)}
                        className={`px-2.5 py-1 text-[11px] font-extrabold rounded-md transition-all cursor-pointer ${
                          maturityYears === y ? 'bg-surface text-primary shadow-sm' : 'text-tertiary hover:text-secondary'
                        }`}
                      >
                        {y}년
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-body p-4 rounded-xl border border-border/20 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-tertiary font-bold block">매월 원리금 상환액</span>
                    <span className="text-[16px] font-black text-primary block mt-0.5">
                      {(repaymentDetails.monthlyPayment / 10000).toFixed(1)}만원
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-tertiary font-bold block">상환 방식</span>
                    <span className="text-[12px] font-bold text-secondary block mt-0.5">
                      원리금균등분할상환
                    </span>
                  </div>
                </div>

                {/* Recharts Area Chart */}
                <div className="w-full h-36 bg-body/20 rounded-xl border border-border/20 p-2.5 relative">
                  <div className="absolute top-2 left-3 text-[10px] font-bold text-tertiary flex gap-3">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#00d29d] rounded" />남은 대출 원금</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#f43f5e]/70 rounded" />납부 누적이자</span>
                  </div>
                  {mounted ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                      <AreaChart
                        data={repaymentDetails.chartData}
                        margin={{ top: 20, right: 5, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00d29d" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#00d29d" stopOpacity={0.0}/>
                          </linearGradient>
                          <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#888' }} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#888' }} />
                        <Tooltip 
                          contentStyle={{ 
                            background: 'rgba(255, 255, 255, 0.95)', 
                            border: '1px solid #ddd', 
                            borderRadius: '8px', 
                            fontSize: '11px',
                            fontWeight: 'bold'
                          }} 
                        />
                        <Area type="monotone" dataKey="남은 대출 원금" stroke="#00d29d" fillOpacity={1} fill="url(#colorPrincipal)" />
                        <Area type="monotone" dataKey="납부한 누적 이자" stroke="#f43f5e" fillOpacity={1} fill="url(#colorInterest)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-body/20 rounded-xl" />
                  )}
                </div>
              </div>

              {/* Action buttons */}
               <div className="flex gap-2 pt-2 border-t border-border/30">
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-body hover:bg-border/30 text-secondary py-3.5 rounded-xl text-[13px] font-extrabold transition-all cursor-pointer border border-border/40 flex items-center justify-center gap-1 active:scale-95"
                >
                  <ArrowLeft size={14} />
                  <span>조건 수정</span>
                </button>

                <button
                  onClick={handleShare}
                  className="flex-1 bg-body hover:bg-border/30 text-secondary py-3.5 rounded-xl text-[13px] font-extrabold transition-all cursor-pointer border border-border/40 flex items-center justify-center gap-1.5 active:scale-95"
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
                  onClick={handleKakaoShare}
                  className="flex-1 bg-primary hover:bg-primary/90 text-surface py-3.5 rounded-xl text-[13px] font-extrabold transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                >
                  <MessageSquare size={14} />
                  <span>카카오톡 공유</span>
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
});

MortgageCalculator.displayName = 'MortgageCalculator';
export default MortgageCalculator;
