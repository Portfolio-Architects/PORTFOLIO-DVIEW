'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Check, Share2, ArrowLeft, RefreshCw, Calculator, MessageSquare, Sparkles, TrendingUp, Coins, ShieldAlert, ExternalLink } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { throttle } from '@/lib/utils/firestoreThrottle';
import { DongApartment } from '@/lib/dong-apartments';
import { AptTxSummary } from '@/lib/types/transaction';
import { findTxKey, normalizeAptName, getDisplayAptName } from '@/lib/utils/apartmentMapping';
import { calculateVerdictScore, calculateCapitalGainsTax, VerdictResult, TaxResult } from '@/lib/utils/sellTimingEngine';
import { shareSellTimingToKakao } from '@/lib/utils/kakaoShare';
import { localCache } from '@/lib/utils/localCache';
import { usePWA } from '@/components/pwa/PWAProvider';
import { QuizAnswerSchema } from '@/lib/validation/facade.schemas';
import { logger } from '@/lib/services/logger';

interface SellTimingCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  initialAptName?: string;
  sheetApartments: Record<string, DongApartment[]>;
  txSummaryData: Record<string, AptTxSummary>;
  nameMapping: Record<string, string>;
  userId?: string;
}

// Estimate market price helper (3M avg price fallback)
function getEstimatedMarketPrice(apt: DongApartment, txSummaryData: Record<string, AptTxSummary>, nameMapping: Record<string, string>) {
  const txKey = findTxKey(apt.name, txSummaryData, nameMapping);
  const summary = txKey ? txSummaryData[txKey] : null;
  if (summary) {
    const val = summary.avg3MPrice || summary.avg1MPrice || summary.latestPrice || 0;
    if (val > 0) return val;
  }
  
  // Fallback by dong
  const dong = apt.dong || '';
  if (dong.includes('오산동')) return 95000;
  if (dong.includes('청계동')) return 85000;
  if (dong.includes('송동') || dong.includes('산척동')) return 75000;
  if (dong.includes('목동') || dong.includes('영천동')) return 60000;
  return 55000;
}

// Get 3Y max price helper
function getEstimatedMaxPrice3Y(apt: DongApartment, txSummaryData: Record<string, AptTxSummary>, nameMapping: Record<string, string>) {
  const txKey = findTxKey(apt.name, txSummaryData, nameMapping);
  const summary = txKey ? txSummaryData[txKey] : null;
  if (summary && summary.maxPrice && summary.maxPrice > 0) {
    return summary.maxPrice;
  }
  const current = getEstimatedMarketPrice(apt, txSummaryData, nameMapping);
  return Math.round(current * 1.18); // Default fallback estimate
}

const SellTimingCalculator = React.memo(function SellTimingCalculator({
  isOpen,
  onClose,
  initialAptName,
  sheetApartments,
  txSummaryData,
  nameMapping,
  userId,
}: SellTimingCalculatorProps) {
  const { showToast } = usePWA();
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

  // User inputs
  const [acquisitionPrice, setAcquisitionPrice] = useState<number>(0); // in Man-won
  const [transferPrice, setTransferPrice] = useState<number>(0);       // in Man-won
  const [acquisitionInput, setAcquisitionInput] = useState<string>('');
  const [transferInput, setTransferInput] = useState<string>('');
  
  const [holdingYears, setHoldingYears] = useState<number>(2); //보유연수
  const [resideYears, setResideYears] = useState<number>(1);   //거주연수
  const [isOneHouse, setIsOneHouse] = useState<boolean>(true); //1세대 1주택 여부

  // Sync resideYears constraint
  useEffect(() => {
    if (resideYears > holdingYears) {
      setResideYears(holdingYears);
    }
  }, [holdingYears, resideYears]);

  // Quiz integration states
  const [hasQuizAnswers, setHasQuizAnswers] = useState(false);

  // Diagnosis states
  const [isCalculating, setIsCalculating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const copyTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const calculateTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const mountedRef = React.useRef(true);

  useEffect(() => {
    mountedRef.current = true;
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

  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Focus and Escape key management
  useEffect(() => {
    if (isOpen && mounted) {
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

  const handleAptSelect = (apt: DongApartment) => {
    setSelectedApt(apt);
    setSearchQuery(getDisplayAptName(apt.name));
    setIsFocused(false);
    setShowResult(false);

    const estCurrent = getEstimatedMarketPrice(apt, txSummaryData, nameMapping);
    setTransferPrice(estCurrent);
    setAcquisitionPrice(Math.round(estCurrent * 0.75)); // Default estimate: 25% lower than current
  };

  // Load and map quiz answers on mount/open
  useEffect(() => {
    if (isOpen) {
      try {
        const answers = localCache.get('dview_quiz_answers', QuizAnswerSchema, null);
        if (answers) {
          setHasQuizAnswers(true);
          
          // Map investment style to holding years and house count
          if (answers.investmentStyle === 'gap') {
            setIsOneHouse(false);
            setHoldingYears(1);
          } else {
            setIsOneHouse(true);
            setHoldingYears(3);
            setResideYears(2);
          }

          // Zero-click simulation if initialAptName is present
          if (initialAptName) {
            setIsCalculating(true);
            if (calculateTimeoutRef.current) {
              clearTimeout(calculateTimeoutRef.current);
            }
            calculateTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                setIsCalculating(false);
                setShowResult(true);
              }
              calculateTimeoutRef.current = null;
            }, 1200);
            return () => {
              if (calculateTimeoutRef.current) {
                clearTimeout(calculateTimeoutRef.current);
                calculateTimeoutRef.current = null;
              }
            };
          }
        }
      } catch (e) {
        logger.warn('SellTimingCalculator', 'Failed to parse quiz answers', undefined, e);
      }
    } else {
      setShowResult(false);
      setIsCalculating(false);
      setHasQuizAnswers(false);
    }
  }, [isOpen, initialAptName]);

  // Set initial apartment if passed
  useEffect(() => {
    if (initialAptName && isOpen) {
      const matched = allApartments.find(a => normalizeAptName(a.name) === normalizeAptName(initialAptName));
      if (matched) {
        handleAptSelect(matched);
      }
    }
  }, [initialAptName, allApartments, isOpen]);

  // Sync inputs
  useEffect(() => {
    setAcquisitionInput(acquisitionPrice === 0 ? '' : acquisitionPrice.toLocaleString());
  }, [acquisitionPrice]);

  useEffect(() => {
    setTransferInput(transferPrice === 0 ? '' : transferPrice.toLocaleString());
  }, [transferPrice]);

  const handleAcquisitionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '') {
      setAcquisitionInput('');
      setAcquisitionPrice(0);
      return;
    }
    if (/^\d+$/.test(raw)) {
      const num = Math.min(300000, parseInt(raw, 10));
      setAcquisitionPrice(num);
      setAcquisitionInput(num.toLocaleString());
    }
  };

  const handleTransferChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '') {
      setTransferInput('');
      setTransferPrice(0);
      return;
    }
    if (/^\d+$/.test(raw)) {
      const num = Math.min(300000, parseInt(raw, 10));
      setTransferPrice(num);
      setTransferInput(num.toLocaleString());
    }
  };

  // Lock body scroll
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  // Click outside to close autocomplete dropdown
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

  // Filter list
  const filteredApts = useMemo(() => {
    if (!searchQuery.trim()) return allApartments;
    const query = normalizeAptName(searchQuery);
    return allApartments.filter(a => a.normalizedName.includes(query) || a.dong.includes(searchQuery));
  }, [searchQuery, allApartments]);

  // Run Calculations
  const calculations = useMemo(() => {
    if (!selectedApt || transferPrice <= 0) return null;

    const txKey = findTxKey(selectedApt.name, txSummaryData, nameMapping);
    const summary = txKey ? txSummaryData[txKey] : null;

    const maxPrice3Y = getEstimatedMaxPrice3Y(selectedApt, txSummaryData, nameMapping);
    const txCount3M = summary ? (summary.avg3MTxCount || summary.txCount || 0) : 0;
    const totalGenerations = selectedApt.householdCount || 500;
    
    let jeonseRatio = 60;
    if (summary) {
      const salePrice = summary.avg3MPrice || summary.latestPrice || 0;
      const rentDeposit = summary.avg3MRentDeposit || summary.latestRentDeposit || 0;
      if (salePrice > 0 && rentDeposit > 0) {
        jeonseRatio = Math.round((rentDeposit / salePrice) * 100);
      }
    }

    // 1. Verdict (호구 지수)
    const verdict = calculateVerdictScore({
      currentPrice: transferPrice,
      maxPrice3Y,
      txCount3M,
      totalGenerations,
      jeonseRatio,
    });

    // 2. Tax (양도세)
    const tax = calculateCapitalGainsTax({
      transferPrice,
      acquisitionPrice,
      holdingYears,
      resideYears,
      isOneHouse,
    });

    return { verdict, tax };
  }, [selectedApt, transferPrice, acquisitionPrice, holdingYears, resideYears, isOneHouse, txSummaryData, nameMapping]);

  const handleStartSimulate = () => {
    if (!selectedApt || transferPrice <= 0) return;
    setIsCalculating(true);

    // Logging to Firestore sell_diagnosis_logs
    if (db) {
      const logData = {
        apartmentName: selectedApt.name,
        dong: selectedApt.dong,
        transferPrice,
        acquisitionPrice,
        holdingYears,
        resideYears,
        isOneHouse,
        userId: userId || 'anonymous',
        timestamp: serverTimestamp()
      };
      throttle(() => addDoc(collection(db, 'sell_diagnosis_logs'), logData)).catch(err => {
        logger.warn('SellTimingCalculator', '[CPA Tracker] Failed to log sell diagnosis', { apartmentName: selectedApt?.name }, err);
      });
    }

    if (calculateTimeoutRef.current) {
      clearTimeout(calculateTimeoutRef.current);
      calculateTimeoutRef.current = null;
    }
    calculateTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setIsCalculating(false);
        setShowResult(true);
      }
      calculateTimeoutRef.current = null;
    }, 1200);
  };

  const formatEokMan = (manWon: number) => {
    const eok = Math.floor(manWon / 10000);
    const man = Math.round(manWon % 10000);
    if (eok > 0) {
      return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
    }
    return `${man.toLocaleString()}만원`;
  };

  const handleShare = () => {
    if (!selectedApt || !calculations) return;
    const aptLabel = getDisplayAptName(selectedApt.name);
    const taxRes = calculations.tax;
    const verdictRes = calculations.verdict;

    const text = `[D-VIEW AI 주거 자산 안정성 및 세무 보고서]
단지명: ${aptLabel} (${selectedApt.dong})
취득가격: ${formatEokMan(acquisitionPrice)} | 예상 매도가격: ${formatEokMan(transferPrice)}
보유기간: ${holdingYears}년 (실거주 ${resideYears}년) | 1주택 여부: ${isOneHouse ? '예' : '아니오'}

📊 진단 결과
- 자산 안정성 스코어: ${verdictRes.score}% (${verdictRes.label})
- 판단 근거: ${verdictRes.reason}
- 간이 세액 계산:
  * 양도차익: ${formatEokMan(taxRes.transferProfit)}
  * 과세표준: ${formatEokMan(taxRes.taxableBase)} (세율 ${taxRes.taxRate}%)
  * 납부할 총 세액(지방세 포함): ${formatEokMan(taxRes.totalTax)}
  * 비과세 여부: ${taxRes.isTaxFree ? '대상' : '과세'} (${taxRes.taxFreeReason})

💡 동탄 전문 안심 자문 부동산 상담 및 양도세 1:1 공익 전문 세무 자문은 D-VIEW에서 바로 확인해 보세요!`;

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
    if (!selectedApt || !calculations) return;
    shareSellTimingToKakao({
      aptName: getDisplayAptName(selectedApt.name),
      dong: selectedApt.dong,
      acquisitionPrice,
      transferPrice,
      holdingYears,
      resideYears,
      isOneHouse,
      verdictScore: calculations.verdict.score,
      verdictLabel: calculations.verdict.label,
      totalTax: calculations.tax.totalTax,
    }, showToast);
  };

  const handleB2BClick = (adType: 'broker' | 'tax_expert') => {
    if (db && selectedApt) {
      const clickLog = {
        apartmentName: selectedApt.name,
        dong: selectedApt.dong,
        adType,
        adTitle: adType === 'broker' ? '동탄 제휴 부동산 매물 접수' : '양도세 절세 전문 세무사 1:1 연계',
        userId: userId || 'anonymous',
        deviceType: typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop',
        timestamp: serverTimestamp()
      };
      throttle(() => addDoc(collection(db, 'ad_clicks'), clickLog)).catch(err => {
        logger.warn('SellTimingCalculator', '[CPA Tracker] Failed to log ad click', { apartmentName: selectedApt?.name, adType }, err);
      });
    }

    const link = adType === 'broker'
      ? 'https://m.land.naver.com/' // Placeholder for partner broker landing page
      : 'https://www.nts.go.kr/';  // Placeholder for tax expert consulting landing page
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[12000] flex flex-col justify-end md:justify-center items-center p-0 md:p-6 lg:p-8 animate-in fade-in duration-200">
      {/* Backdrop */}
      <button type="button" className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md border-none cursor-default" onClick={onClose} aria-label="자산 안정성 진단기 창 닫기" />

      {/* Modal Container */}
      <div
        ref={containerRef}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sell-title"
        aria-describedby="sell-desc"
        className="relative bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-white/20 dark:border-white/10 w-full max-w-[550px] h-[92vh] md:h-auto md:min-h-[460px] md:max-h-[85vh] rounded-t-[24px] md:rounded-[24px] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border/40 px-6 py-4 shrink-0 bg-surface/50">
          <div className="flex flex-col gap-0.5">
            <h2 id="sell-title" className="text-[17px] font-black text-primary flex items-center gap-1.5">
              <span>AI 주거 자산 안정성 및 세무 진단기</span>
            </h2>
            <p id="sell-desc" className="text-[12px] font-medium text-tertiary">
              3대 자산 안정성 메트릭 및 양도세 요율을 종합 분석하여 주거 자산 가치를 평가합니다.
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
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {!showResult ? (
            <div className="space-y-5">
              {/* Step 1: Select Apartment */}
              <div className="space-y-2" ref={dropdownRef}>
                <label className="block text-[13px] font-extrabold text-secondary">
                  1. 대상 단지 선택
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
                    className="w-full bg-body border border-transparent focus:border-[#ea6100] focus:bg-surface rounded-xl py-2.5 pl-9 pr-8 text-[13.5px] font-bold text-primary outline-none transition-all placeholder:text-tertiary"
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
                <div className="space-y-4 animate-in fade-in duration-300">
                  {/* Acquisition & Transfer Price Inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-[12.5px] font-extrabold text-secondary">
                        2. 취득 당시 가격
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={acquisitionInput}
                          onChange={handleAcquisitionChange}
                          className="w-full bg-body border border-transparent focus:border-[#ea6100] focus:bg-surface rounded-xl py-2.5 px-3 text-right text-[13.5px] font-bold text-primary outline-none transition-all pr-12"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-tertiary">만원</span>
                      </div>
                      <div className="text-right text-[10px] font-bold text-emerald-600 dark:text-[#ea6100]">
                        {formatEokMan(acquisitionPrice)}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[12.5px] font-extrabold text-secondary">
                        3. 예상 매도 가격
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={transferInput}
                          onChange={handleTransferChange}
                          className="w-full bg-body border border-transparent focus:border-[#ea6100] focus:bg-surface rounded-xl py-2.5 px-3 text-right text-[13.5px] font-bold text-primary outline-none transition-all pr-12"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-tertiary">만원</span>
                      </div>
                      <div className="text-right text-[10px] font-bold text-emerald-600 dark:text-[#ea6100]">
                        {formatEokMan(transferPrice)}
                      </div>
                    </div>
                  </div>

                  {/* holdingYears Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[12.5px] font-extrabold text-secondary">
                      <span>4. 보유 기간</span>
                      <span className="text-primary font-black">{holdingYears}년 보유</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      step="1"
                      value={holdingYears}
                      onChange={(e) => setHoldingYears(parseInt(e.target.value))}
                      className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-[#ea6100]"
                    />
                    <div className="flex justify-between text-[9px] text-tertiary font-bold px-1">
                      <span>0년 (신규취득)</span>
                      <span>2년 (비과세기본)</span>
                      <span>5년</span>
                      <span>10년</span>
                      <span>15년 이상</span>
                    </div>
                  </div>

                  {/* resideYears Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[12.5px] font-extrabold text-secondary">
                      <span>5. 거주 기간</span>
                      <span className="text-primary font-black">{resideYears}년 거주</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={holdingYears}
                      step="1"
                      value={resideYears}
                      onChange={(e) => setResideYears(parseInt(e.target.value))}
                      className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-[#ea6100]"
                    />
                    <div className="flex justify-between text-[9px] text-tertiary font-bold px-1">
                      <span>0년 (미거주)</span>
                      <span>2년 (1주택비과세거주)</span>
                      <span>최대 {holdingYears}년</span>
                    </div>
                  </div>

                  {/* House Count Switcher */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[12.5px] font-extrabold text-secondary">
                      <span>6. 보유 주택 수 (1세대 기준)</span>
                      {hasQuizAnswers && (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-emerald-600 dark:text-[#ea6100] bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          <Sparkles size={11} className="text-emerald-500 fill-emerald-500/30" />
                          <span>퀴즈 성향 연동됨</span>
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsOneHouse(true)}
                        className={`py-2 rounded-xl text-[12.5px] font-extrabold border transition-all cursor-pointer ${
                          isOneHouse
                            ? 'border-[#ea6100] bg-emerald-50/50 dark:bg-emerald-950/10 text-primary'
                            : 'border-border/30 bg-body/60 hover:bg-body text-tertiary'
                        }`}
                      >
                        1세대 1주택 (비과세 혜택 가능)
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsOneHouse(false)}
                        className={`py-2 rounded-xl text-[12.5px] font-extrabold border transition-all cursor-pointer ${
                          !isOneHouse
                            ? 'border-[#ea6100] bg-emerald-50/50 dark:bg-emerald-950/10 text-primary'
                            : 'border-border/30 bg-body/60 hover:bg-body text-tertiary'
                        }`}
                      >
                        다주택자 (과세 대상)
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleStartSimulate}
                    disabled={isCalculating || transferPrice <= 0}
                    className="w-full bg-[#ea6100] hover:bg-[#00b585] text-white py-3.5 rounded-xl text-[14px] font-black shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 mt-4 disabled:opacity-50"
                  >
                    {isCalculating ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>AI 분석 및 양도세 계산 중...</span>
                      </>
                    ) : (
                      <>
                        <span>AI 자산 적정 가치 & 안정성 진단하기</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            calculations && (
              <div className="space-y-6 animate-in zoom-in-95 fade-in duration-300">
                {/* Gauge Section */}
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <svg viewBox="0 0 200 120" className="w-52 h-32 mx-auto">
                      <defs>
                        <linearGradient id="verdictLow" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                        <linearGradient id="verdictMid" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#d97706" />
                        </linearGradient>
                        <linearGradient id="verdictHigh" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#f43f5e" />
                          <stop offset="100%" stopColor="#e11d48" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="rgba(226, 232, 240, 0.5)"
                        strokeWidth="14"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke={
                          calculations.verdict.score >= 70 ? 'url(#verdictHigh)' :
                          calculations.verdict.score >= 40 ? 'url(#verdictMid)' :
                          'url(#verdictLow)'
                        }
                        strokeWidth="14"
                        strokeLinecap="round"
                        strokeDasharray="251.2"
                        strokeDashoffset={251.2 - (251.2 * Math.min(100, calculations.verdict.score)) / 100}
                        className="transition-all duration-1000 ease-out"
                      />
                      <text x="100" y="85" textAnchor="middle" className="text-[24px] font-black fill-primary">
                        {calculations.verdict.score}%
                      </text>
                      <text x="100" y="105" textAnchor="middle" className="text-[11.5px] font-bold fill-tertiary">
                        자산 안정성 스코어
                      </text>
                    </svg>
                  </div>

                  <h3 className="text-[16px] font-black text-primary mt-1 flex items-center gap-1.5 justify-center">
                    <TrendingUp size={18} style={{ color: calculations.verdict.color }} />
                    <span>진단: <span style={{ color: calculations.verdict.color }}>{calculations.verdict.label}</span></span>
                  </h3>
                  <p className="text-[11.5px] text-tertiary font-bold mt-1">
                    {getDisplayAptName(selectedApt!.name)} ({selectedApt!.dong})
                  </p>
                </div>

                {/* Verdict Explanation */}
                <div className="p-4 rounded-2xl bg-body/60 border border-border/30 text-[12.5px] font-bold text-secondary leading-relaxed flex gap-2.5 items-start">
                  <ShieldAlert size={18} className="shrink-0 mt-0.5 text-secondary" />
                  <p className="break-keep font-semibold">{calculations.verdict.reason}</p>
                </div>

                {/* Tax Report Section */}
                <div className="space-y-3">
                  <h4 className="text-[13px] font-extrabold text-primary flex items-center gap-1">
                    <Coins size={15} className="text-amber-500" /> 세무 전략 및 양도소득세 리포트
                  </h4>
                  <div className="bg-body/30 border border-border/20 rounded-xl p-4 text-[12px] font-bold text-secondary space-y-3">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-border/20 pb-3">
                      <div>
                        <span className="text-[11px] text-tertiary font-bold block">전체 양도 차익</span>
                        <span className="text-[13.5px] font-black text-primary block mt-0.5">
                          {formatEokMan(calculations.tax.transferProfit)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-tertiary font-bold block">과세 대상 양도차익</span>
                        <span className="text-[13.5px] font-black text-primary block mt-0.5">
                          {formatEokMan(calculations.tax.taxableProfit)}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="text-[11px] text-tertiary font-bold block">장기보유특별공제</span>
                        <span className="text-[13.5px] font-black text-primary block mt-0.5">
                          -{formatEokMan(calculations.tax.janggiGongje)}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="text-[11px] text-tertiary font-bold block">과세 표준</span>
                        <span className="text-[13.5px] font-black text-primary block mt-0.5">
                          {formatEokMan(calculations.tax.taxableBase)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 pb-1">
                      <div className="flex justify-between items-center text-primary">
                        <span className="text-secondary font-bold">1. 양도소득세 (적용세율 {calculations.tax.taxRate}%)</span>
                        <span className="font-extrabold">{formatEokMan(calculations.tax.computedTax)}</span>
                      </div>
                      <div className="flex justify-between items-center text-primary">
                        <span className="text-secondary font-bold">2. 지방소득세 (양도세의 10%)</span>
                        <span className="font-extrabold">{formatEokMan(calculations.tax.localTax)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[#f43f5e] font-black pt-2 border-t border-border/10 text-[13.5px]">
                        <span>납부할 총 세액 합계</span>
                        <span className="text-right">{formatEokMan(calculations.tax.totalTax)}</span>
                      </div>
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-lg text-[11px] text-emerald-700 dark:text-emerald-400 font-medium leading-normal border border-emerald-500/10">
                      {calculations.tax.taxFreeReason}
                    </div>
                  </div>
                </div>

                {/* B2B 제휴 광고 배너 (CPA) */}
                <div className="space-y-2.5">
                  <h4 className="text-[12px] font-extrabold text-primary">💡 D-VIEW 추천 전문 상담 및 세무 연계</h4>
                  
                  {/* Banner 1: Real Estate Broker */}
                  <button 
                    type="button"
                    onClick={() => handleB2BClick('broker')}
                    className="w-full text-left p-4 rounded-2xl border border-emerald-500/10 bg-gradient-to-br from-emerald-50/40 to-teal-50/20 dark:from-emerald-950/10 dark:to-teal-950/5 hover:border-emerald-500/30 transition-all cursor-pointer flex justify-between items-center group relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-toss-blue"
                    aria-label="동탄 전문 안심 자문 공인중개사 연계"
                  >
                    <div className="space-y-1 text-left min-w-0 pr-4">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9.5px] font-black uppercase tracking-wider">주거 안심 연계</span>
                      <h5 className="text-[13.5px] font-black text-primary group-hover:text-[#ea6100] transition-colors leading-tight">동탄 전문 안심 자문 공인중개사 연계</h5>
                      <p className="text-[11.5px] text-tertiary font-semibold truncate">화성시 거주 실수요자 대상 주거 안심 부동산 상담 서비스 지원</p>
                    </div>
                    <div className="p-2 rounded-xl bg-white/80 dark:bg-surface/80 text-secondary hover:text-primary shrink-0 border border-border/40 shadow-sm active:scale-95 transition-all pointer-events-none">
                      <ExternalLink size={14} />
                    </div>
                  </button>

                  {/* Banner 2: Tax Expert */}
                  <button 
                    type="button"
                    onClick={() => handleB2BClick('tax_expert')}
                    className="w-full text-left p-4 rounded-2xl border border-emerald-500/10 bg-gradient-to-br from-emerald-50/40 to-teal-50/20 dark:from-emerald-950/10 dark:to-teal-950/5 hover:border-emerald-500/30 transition-all cursor-pointer flex justify-between items-center group relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-toss-blue"
                    aria-label="양도소득세 1:1 공익 전문 세무사 연계 상담"
                  >
                    <div className="space-y-1 text-left min-w-0 pr-4">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9.5px] font-black uppercase tracking-wider">세무 자문 연계</span>
                      <h5 className="text-[13.5px] font-black text-primary group-hover:text-emerald-600 transition-colors leading-tight">양도소득세 1:1 공익 전문 세무사 연계 상담</h5>
                      <p className="text-[11.5px] text-tertiary font-semibold truncate">1세대 1주택 비과세 요건 검토 및 세무 행정 자문 연계</p>
                    </div>
                    <div className="p-2 rounded-xl bg-white/80 dark:bg-surface/80 text-secondary hover:text-primary shrink-0 border border-border/40 shadow-sm active:scale-95 transition-all pointer-events-none">
                      <ExternalLink size={14} />
                    </div>
                  </button>
                </div>

                {/* 카카오톡 1-Click 공유 플로팅 버튼 (FAB) */}
                <div className="sticky bottom-2 left-0 right-0 z-30 flex justify-center w-full pointer-events-none mt-4">
                  <button
                    onClick={handleKakaoShare}
                    className="pointer-events-auto bg-[#fee500] hover:bg-[#fddc00] active:scale-95 text-[#191919] font-black text-[13.5px] px-6 py-3.5 rounded-full flex items-center gap-2 shadow-xl shadow-yellow-500/30 transition-all cursor-pointer border-none animate-pulse w-full max-w-md justify-center"
                  >
                    <MessageSquare size={16} className="fill-[#191919] text-[#191919]" />
                    <span>진단 결과 1초 만에 카카오톡으로 공유하기</span>
                  </button>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-2 pt-2 border-t border-border/30">
                  <button
                    onClick={() => setShowResult(false)}
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
            )
          )}
        </div>
      </div>
    </div>,
    document.getElementById('modal-root') || document.body
  );
});

SellTimingCalculator.displayName = 'SellTimingCalculator';
export default SellTimingCalculator;
