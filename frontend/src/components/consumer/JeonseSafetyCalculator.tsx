'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, ShieldAlert, Check, Share2, ChevronDown, Award, ArrowLeft, RefreshCw, MessageSquare, Sparkles } from 'lucide-react';
import { DongApartment } from '@/lib/dong-apartments';
import { AptTxSummary } from '@/lib/types/transaction';
import { FieldReportData } from '@/lib/types/report.types';
import { findTxKey, normalizeAptName, getDisplayAptName } from '@/lib/utils/apartmentMapping';
import { shareJeonseSafetyToKakao } from '@/lib/utils/kakaoShare';
import { localCache } from '@/lib/utils/localCache';
import { QuizAnswerSchema } from '@/lib/validation/facade.schemas';
import { logger } from '@/lib/services/logger';
import { usePWA } from '@/components/pwa/PWAProvider';

interface JeonseSafetyCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  initialAptName?: string;
  sheetApartments: Record<string, DongApartment[]>;
  txSummaryData: Record<string, AptTxSummary>;
  nameMapping: Record<string, string>;
  fieldReportsMap: Map<string, FieldReportData>;
}

// Estimate market price helper based on actual summary or dong fallback
function getEstimatedMarketPrice(apt: DongApartment, txSummaryData: Record<string, AptTxSummary>, nameMapping: Record<string, string>) {
  const txKey = findTxKey(apt.name, txSummaryData, nameMapping);
  const summary = txKey ? txSummaryData[txKey] : null;
  if (summary) {
    const val = summary.avg1MPrice || summary.avg3MPrice || summary.latestPrice || 0;
    if (val > 0) return val;
  }
  
  // Fallback estimate by dong
  const dong = apt.dong || '';
  if (dong.includes('오산동')) return 95000; // 동탄역세권 대장
  if (dong.includes('청계동')) return 85000; // 시범단지
  if (dong.includes('송동') || dong.includes('산척동')) return 75000; // 호수공원
  if (dong.includes('목동') || dong.includes('영천동')) return 60000; // 항아리 / 11자
  return 55000; // 일반
}

const JeonseSafetyCalculator = React.memo(function JeonseSafetyCalculator({
  isOpen,
  onClose,
  initialAptName,
  sheetApartments,
  txSummaryData,
  nameMapping,
  fieldReportsMap,
}: JeonseSafetyCalculatorProps) {
  const { showToast } = usePWA();
  // Flatten list of all apartments
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

  // Inputs for Eok & Man
  const [jeonseEok, setJeonseEok] = useState<string>('');
  const [jeonseMan, setJeonseMan] = useState<string>('');
  const [lienEok, setLienEok] = useState<string>('');
  const [lienMan, setLienMan] = useState<string>('');

  // Quiz integration states
  const [hasQuizAnswers, setHasQuizAnswers] = useState(false);
  const [quizBudgetLabel, setQuizBudgetLabel] = useState('');
  const [quizBudgetLimit, setQuizBudgetLimit] = useState(0); // in Man-won

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

  // Checklist states
  const [checklist, setChecklist] = useState({
    taxArrears: false,
    lienExtinguished: false,
    occupancyReport: false,
    insuranceCheck: false,
  });

  const enteredJeonseAmount = useMemo(() => {
    const jEok = parseInt(jeonseEok) || 0;
    const jMan = parseInt(jeonseMan) || 0;
    return jEok * 10000 + jMan;
  }, [jeonseEok, jeonseMan]);

  const isBudgetExceeded = useMemo(() => {
    if (!hasQuizAnswers || quizBudgetLimit <= 0) return false;
    return enteredJeonseAmount > quizBudgetLimit;
  }, [hasQuizAnswers, enteredJeonseAmount, quizBudgetLimit]);

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

    // Auto-populate default Jeonse from transaction data
    const txKey = findTxKey(apt.name, txSummaryData, nameMapping);
    const summary = txKey ? txSummaryData[txKey] : null;
    const defaultJeonse = summary ? (summary.avg3MRentDeposit || summary.avg1MRentDeposit || summary.latestRentDeposit || 0) : 0;

    if (defaultJeonse > 0) {
      setJeonseEok(Math.floor(defaultJeonse / 10000).toString());
      setJeonseMan((defaultJeonse % 10000 === 0 ? '' : defaultJeonse % 10000).toString());
    } else {
      setJeonseEok('');
      setJeonseMan('');
    }
    setLienEok('');
    setLienMan('');
  };

  // Load and map quiz answers on modal open
  useEffect(() => {
    if (isOpen) {
      try {
        const answers = localCache.get('dview_quiz_answers', QuizAnswerSchema, null);
        if (answers) {
          setHasQuizAnswers(true);
          let limitVal = 0;
          let label = '';
          if (answers.budget === '3eok') {
            limitVal = 33000;
            label = '3.3억';
          } else if (answers.budget === '5eok') {
            limitVal = 63000;
            label = '6.3억';
          } else if (answers.budget === '8eok') {
            limitVal = 93000;
            label = '9.3억';
          } else if (answers.budget === '12eok') {
            limitVal = 145000;
            label = '14.5억';
          } else if (answers.budget === 'unlimited') {
            limitVal = 9999999;
            label = '무제한';
          }
          setQuizBudgetLimit(limitVal);
          setQuizBudgetLabel(label);

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
        logger.warn('JeonseSafetyCalculator', 'Failed to parse quiz answers', undefined, e);
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

  // Filter list for Autocomplete
  const filteredApts = useMemo(() => {
    if (!searchQuery.trim()) return allApartments;
    const query = normalizeAptName(searchQuery);
    return allApartments.filter(a => a.normalizedName.includes(query) || a.dong.includes(searchQuery));
  }, [searchQuery, allApartments]);

  // Retrieve market price and calculate debt ratio
  const marketPrice = useMemo(() => {
    if (!selectedApt) return 0;
    return getEstimatedMarketPrice(selectedApt, txSummaryData, nameMapping);
  }, [selectedApt, txSummaryData, nameMapping]);

  const calculationResult = useMemo(() => {
    if (!selectedApt || !marketPrice || isNaN(marketPrice) || marketPrice <= 0) return null;

    const parseAmount = (val: string) => {
      const clean = val.replace(/[^0-9]/g, '');
      const parsed = parseInt(clean, 10);
      return isNaN(parsed) || parsed < 0 ? 0 : parsed;
    };

    const jEok = parseAmount(jeonseEok);
    const jMan = parseAmount(jeonseMan);
    const lEok = parseAmount(lienEok);
    const lMan = parseAmount(lienMan);

    const totalJeonse = jEok * 10000 + jMan;
    const totalLien = lEok * 10000 + lMan;
    const totalDebt = totalJeonse + totalLien;

    const debtRatio = marketPrice > 0 ? (totalDebt / marketPrice) * 100 : 0;

    // Classify risk level
    let riskLevel: 'safe' | 'caution' | 'warning' | 'danger' = 'safe';
    let riskLabel = '안전';
    let riskColor = '#10b981'; // Green
    let riskBg = 'bg-emerald-50 dark:bg-emerald-950/20';
    let riskText = 'text-emerald-600 dark:text-emerald-400';
    let riskBorder = 'border-emerald-500/30';
    let advice = '부채비율이 낮아 경매 낙찰 시에도 전세 보증금 전액을 온전히 배당 환수받을 가능성이 매우 높은 안전한 단지입니다.';

    if (debtRatio >= 80) {
      riskLevel = 'danger';
      riskLabel = '위험 (깡통전세)';
      riskColor = '#f43f5e'; // Red
      riskBg = 'bg-rose-50 dark:bg-rose-950/20';
      riskText = 'text-rose-600 dark:text-rose-400';
      riskBorder = 'border-rose-500/30';
      advice = '보증금과 융자의 합계액이 매매 시세의 80%를 넘어 경매 진행 시 심각한 보증금 유실 위험이 우려됩니다. 보증금을 줄이고 월세로의 전환을 강력히 권장하며, 가급적 이 계약을 피하시는 것이 좋습니다.';
    } else if (debtRatio >= 70) {
      riskLevel = 'warning';
      riskLabel = '경고';
      riskColor = '#f97316'; // Orange
      riskBg = 'bg-orange-50 dark:bg-orange-950/20';
      riskText = 'text-orange-600 dark:text-orange-400';
      riskBorder = 'border-orange-500/30';
      advice = '부채비율이 70%를 상회하여 경매 낙찰 시 전입 상태에 따라 전액 반환이 어려울 수 있습니다. 계약 체결 시 반드시 주택도시보증공사(HUG) 등 전세금 반환보증보험 가입 요건을 충족하는지 사전 확인하십시오.';
    } else if (debtRatio >= 60) {
      riskLevel = 'caution';
      riskLabel = '주의';
      riskColor = '#f59e0b'; // Yellow
      riskBg = 'bg-amber-50 dark:bg-amber-950/20';
      riskText = 'text-amber-600 dark:text-amber-400';
      riskBorder = 'border-amber-500/30';
      advice = '부채비율이 경매 낙찰 통계 평균선(약 60~70%)에 걸쳐 있습니다. 집주인의 세금 체납 여부를 확인하고, 등기부상 선순위 융자 채무가 있는 경우 잔금 시 말소 혹은 대출금 전액 감액 등기를 특약 조건으로 계약해야 안전합니다.';
    }

    return {
      totalJeonse,
      totalLien,
      totalDebt,
      debtRatio,
      riskLevel,
      riskLabel,
      riskColor,
      riskBg,
      riskText,
      riskBorder,
      advice,
    };
  }, [selectedApt, marketPrice, jeonseEok, jeonseMan, lienEok, lienMan]);

  const handleStartDiagnosis = () => {
    if (!selectedApt || !jeonseEok) return;
    setIsCalculating(true);
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
    }, 1200); // 1.2s premium calculation feel
  };

  const handleShare = () => {
    if (!selectedApt || !calculationResult) return;
    const aptLabel = getDisplayAptName(selectedApt.name);
    const text = `[D-VIEW 전세 안전진단 보고서]
단지명: ${aptLabel} (${selectedApt.dong})
최근 3M 매매시세: ${(marketPrice / 10000).toFixed(1)}억원
내 입력 보증금: ${(calculationResult.totalJeonse / 10000).toFixed(1)}억원
선순위 융자금: ${(calculationResult.totalLien / 10000).toFixed(1)}억원

📊 진단 결과: [${calculationResult.riskLabel}] (부채비율 ${calculationResult.debtRatio.toFixed(1)}%)
💡 진단 조언: ${calculationResult.advice}

🔍 실거래가 및 상세 분석 조회는 D-VIEW에서 바로 확인하세요!`;

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
    if (!selectedApt || !calculationResult) return;
    shareJeonseSafetyToKakao({
      aptName: getDisplayAptName(selectedApt.name),
      dong: selectedApt.dong,
      marketPrice: marketPrice,
      jeonseAmount: calculationResult.totalJeonse,
      lienAmount: calculationResult.totalLien,
      debtRatio: calculationResult.debtRatio,
      riskLabel: calculationResult.riskLabel,
      riskLevel: calculationResult.riskLevel,
    }, showToast);
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[12000] flex flex-col justify-end md:justify-center items-center p-0 md:p-6 lg:p-8 animate-in fade-in duration-200">
      {/* Backdrop */}
      <button type="button" className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md border-none cursor-default" onClick={onClose} aria-label="전세 안전 진단 창 닫기" />

      {/* Modal Container */}
      <div
        ref={containerRef}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="jeonse-title"
        aria-describedby="jeonse-desc"
        className="relative bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-white/20 dark:border-white/10 w-full max-w-[550px] h-[92vh] md:h-auto md:min-h-[460px] md:max-h-[85vh] rounded-t-[24px] md:rounded-[24px] flex flex-col shadow-2xl transition-transform duration-300 slide-in-from-bottom overflow-hidden"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border/40 px-6 py-4 shrink-0 bg-surface/50">
          <div className="flex flex-col gap-0.5">
            <h2 id="jeonse-title" className="text-[17px] font-black text-primary flex items-center gap-1.5">
              <span>전세금 깡통전세 안전진단기</span>
            </h2>
            <p id="jeonse-desc" className="text-[12px] font-medium text-tertiary">
              실거래 매매가 대비 전세금과 융자 합계의 위험 비율을 계산합니다.
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
                <label className="block text-[12.5px] font-extrabold text-secondary">
                  1. 안전진단을 진행할 단지 선택
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" size={16} />
                  <input
                    type="text"
                    placeholder="단지명 검색 (예: 롯데캐슬)"
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

              {/* Step 2: Contract Info Input */}
              {selectedApt && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-3 duration-350">
                  {/* Market Price Alert */}
                  <div className="bg-body p-4 rounded-xl border border-border flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] text-tertiary font-bold">최근 3M 매매 평균시세</p>
                      <p className="text-[15px] text-primary font-black mt-0.5">{(marketPrice / 10000).toFixed(1)}억원</p>
                    </div>
                    <span className="text-[10.5px] font-bold bg-[#e8f3ff] text-[#1b64da] px-2 py-0.5 rounded-md">
                      실거래 시세 연동
                    </span>
                  </div>

                  {/* Jeonse Deposit Input */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[12.5px] font-extrabold text-secondary">
                        2. 전세 보증금 입력
                      </label>
                      {isBudgetExceeded && (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md animate-pulse">
                          <ShieldAlert size={11} className="text-rose-500" />
                          <span>유저 설정 예산({quizBudgetLabel}) 초과 단지</span>
                        </span>
                      )}
                      {!isBudgetExceeded && hasQuizAnswers && (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-emerald-600 dark:text-[#00d29d] bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          <Sparkles size={11} className="fill-emerald-500/30 text-emerald-500" />
                          <span>퀴즈 예산 연동됨</span>
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="0"
                          value={jeonseEok}
                          onChange={(e) => setJeonseEok(e.target.value)}
                          className="w-full bg-body border border-transparent focus:border-[#00d29d] focus:bg-surface rounded-xl py-2.5 px-3 text-right text-[13.5px] font-bold text-primary outline-none transition-all"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-tertiary">억</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="0"
                          value={jeonseMan}
                          onChange={(e) => setJeonseMan(e.target.value)}
                          className="w-full bg-body border border-transparent focus:border-[#00d29d] focus:bg-surface rounded-xl py-2.5 px-3 text-right text-[13.5px] font-bold text-primary outline-none transition-all"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-tertiary">만원</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-tertiary font-medium pl-0.5">
                      * 이 단지의 최근 평균 전세보증금이 기본값으로 자동 연동되었습니다.
                    </p>
                  </div>

                  {/* Senior Lien Input */}
                  <div className="space-y-2">
                    <label className="block text-[12.5px] font-extrabold text-secondary flex items-center gap-1.5">
                      <span>3. 선순위 근저당권 설정액 (융자)</span>
                      <span className="text-[10px] text-tertiary font-medium">(등기부등본 확인)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="0"
                          value={lienEok}
                          onChange={(e) => setLienEok(e.target.value)}
                          className="w-full bg-body border border-transparent focus:border-[#00d29d] focus:bg-surface rounded-xl py-2.5 px-3 text-right text-[13.5px] font-bold text-primary outline-none transition-all"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-tertiary">억</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="0"
                          value={lienMan}
                          onChange={(e) => setLienMan(e.target.value)}
                          className="w-full bg-body border border-transparent focus:border-[#00d29d] focus:bg-surface rounded-xl py-2.5 px-3 text-right text-[13.5px] font-bold text-primary outline-none transition-all"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-tertiary">만원</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-tertiary font-medium pl-0.5">
                      * 등기부등본 을구에 기재된 채권최고액(융자) 총합이 있을 경우 입력해 주세요. (없으면 0)
                    </p>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={handleStartDiagnosis}
                    disabled={isCalculating || !jeonseEok}
                    className="w-full bg-[#00d29d] hover:bg-[#00b585] text-white py-3.5 rounded-xl text-[14px] font-black shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition-all cursor-pointer border-none flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isCalculating ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>{hasQuizAnswers ? '퀴즈 기반 자동 진단 중...' : '전세 안전 진단 분석 중...'}</span>
                      </>
                    ) : (
                      <>
                        <span>안전진단 시뮬레이션 개시</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Results Panel */
            calculationResult && (
              <div className="space-y-6 animate-in zoom-in-95 fade-in duration-300">
                {/* SVG Gauge Chart */}
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <svg viewBox="0 0 200 120" className="w-52 h-32 mx-auto">
                      <defs>
                        <linearGradient id="gaugeSafe" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#00d29d" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                        <linearGradient id="gaugeCaution" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#d97706" />
                        </linearGradient>
                        <linearGradient id="gaugeWarning" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#f97316" />
                          <stop offset="100%" stopColor="#ea580c" />
                        </linearGradient>
                        <linearGradient id="gaugeDanger" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#f43f5e" />
                          <stop offset="100%" stopColor="#e11d48" />
                        </linearGradient>
                      </defs>
                      {/* Background Track */}
                      <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="rgba(226, 232, 240, 0.5)"
                        strokeWidth="14"
                        strokeLinecap="round"
                      />
                      {/* Filled Risk Portion */}
                      <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke={
                          calculationResult.riskLevel === 'safe' ? 'url(#gaugeSafe)' :
                          calculationResult.riskLevel === 'caution' ? 'url(#gaugeCaution)' :
                          calculationResult.riskLevel === 'warning' ? 'url(#gaugeWarning)' :
                          'url(#gaugeDanger)'
                        }
                        strokeWidth="14"
                        strokeLinecap="round"
                        strokeDasharray="251.2"
                        strokeDashoffset={251.2 - (251.2 * Math.min(100, calculationResult.debtRatio)) / 100}
                        className="transition-all duration-1000 ease-out"
                      />
                      {/* Text inside */}
                      <text x="100" y="85" textAnchor="middle" className="text-[24px] font-black fill-primary">
                        {Math.round(calculationResult.debtRatio)}%
                      </text>
                      <text x="100" y="105" textAnchor="middle" className="text-[11.5px] font-bold fill-tertiary">
                        부채비율(LTV)
                      </text>
                    </svg>
                  </div>

                  <h3 className="text-[17px] font-black text-primary mt-1">
                    진단 결과: <span style={{ color: calculationResult.riskColor }}>{calculationResult.riskLabel}</span>
                  </h3>
                  <p className="text-[12px] text-tertiary font-bold mt-1">
                    {getDisplayAptName(selectedApt!.name)} ({selectedApt!.dong})
                  </p>
                </div>

                {/* Info Breakdown Grid */}
                <div className="grid grid-cols-2 gap-3 bg-body/60 p-4 rounded-2xl border border-border/30">
                  <div>
                    <span className="text-[11px] text-tertiary font-bold block">3M 매매 평균시세</span>
                    <span className="text-[14px] font-black text-primary block mt-0.5">
                      {(marketPrice / 10000).toFixed(1)}억원
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-tertiary font-bold block">전세 보증금</span>
                    <span className="text-[14px] font-black text-primary block mt-0.5">
                      {(calculationResult.totalJeonse / 10000).toFixed(1)}억원
                    </span>
                  </div>
                  <div className="border-t border-border/30 pt-2.5 mt-1.5 col-span-2 grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-tertiary font-bold block">선순위 융자금</span>
                      <span className="text-[14px] font-black text-primary block mt-0.5">
                        {(calculationResult.totalLien / 10000).toFixed(1)}억원
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-tertiary font-bold block">총 채무액</span>
                      <span className="text-[14px] font-black text-[#f43f5e] block mt-0.5">
                        {(calculationResult.totalDebt / 10000).toFixed(1)}억원
                      </span>
                    </div>
                  </div>
                </div>

                {/* Advice Card */}
                <div className={`p-4 rounded-2xl border ${calculationResult.riskBg} ${calculationResult.riskBorder} ${calculationResult.riskText} text-[12.5px] font-bold leading-relaxed`}>
                  <div className="flex gap-2.5 items-start">
                    <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                    <p className="break-keep font-semibold">{calculationResult.advice}</p>
                  </div>
                </div>

                {/* Checklist Section */}
                <div className="space-y-3">
                  <h4 className="text-[13px] font-extrabold text-primary flex items-center gap-1">
                    <Award size={15} className="text-[#00d29d]" /> 안전 전세계약을 위한 임차인 필수 체크리스트
                  </h4>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2.5 p-3 bg-body hover:bg-body/80 rounded-xl border border-border/20 cursor-pointer transition-colors select-none">
                      <input
                        type="checkbox"
                        checked={checklist.taxArrears}
                        onChange={(e) => setChecklist(prev => ({ ...prev, taxArrears: e.target.checked }))}
                        className="mt-0.5 text-[#00d29d] focus:ring-[#00d29d] border-border rounded"
                      />
                      <div className="text-[11.5px] leading-normal">
                        <span className="font-extrabold text-secondary block">임대인 세금 완납증명서 확인</span>
                        <span className="text-tertiary font-medium">임대인의 국세/지방세 미납 세금이 보증금보다 선순위로 추징될 수 있어 사전 검증이 필요합니다.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 p-3 bg-body hover:bg-body/80 rounded-xl border border-border/20 cursor-pointer transition-colors select-none">
                      <input
                        type="checkbox"
                        checked={checklist.lienExtinguished}
                        onChange={(e) => setChecklist(prev => ({ ...prev, lienExtinguished: e.target.checked }))}
                        className="mt-0.5 text-[#00d29d] focus:ring-[#00d29d] border-border rounded"
                      />
                      <div className="text-[11.5px] leading-normal">
                        <span className="font-extrabold text-secondary block">근저당 말소/감액 등기 특약 조건</span>
                        <span className="text-tertiary font-medium">잔금을 치르는 날 대출금을 상환하고 등기를 말소하거나 금액을 줄이는 의무를 계약서 특약에 기재해야 합니다.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 p-3 bg-body hover:bg-body/80 rounded-xl border border-border/20 cursor-pointer transition-colors select-none">
                      <input
                        type="checkbox"
                        checked={checklist.occupancyReport}
                        onChange={(e) => setChecklist(prev => ({ ...prev, occupancyReport: e.target.checked }))}
                        className="mt-0.5 text-[#00d29d] focus:ring-[#00d29d] border-border rounded"
                      />
                      <div className="text-[11.5px] leading-normal">
                        <span className="font-extrabold text-secondary block">이사 당일 전입신고 및 확정일자 부여</span>
                        <span className="text-tertiary font-medium">제3자 채권에 대한 대항력과 우선변제권을 취득하기 위해 잔금일 동주민센터나 인터넷등기소에서 확정일자를 필히 부여받으십시오.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 p-3 bg-body hover:bg-body/80 rounded-xl border border-border/20 cursor-pointer transition-colors select-none">
                      <input
                        type="checkbox"
                        checked={checklist.insuranceCheck}
                        onChange={(e) => setChecklist(prev => ({ ...prev, insuranceCheck: e.target.checked }))}
                        className="mt-0.5 text-[#00d29d] focus:ring-[#00d29d] border-border rounded"
                      />
                      <div className="text-[11.5px] leading-normal">
                        <span className="font-extrabold text-secondary block">HUG 전세반환보증보험 가입 가부 확인</span>
                        <span className="text-tertiary font-medium">부채비율이 너무 높은 주택은 보증기관에서 반환보험 인수를 거절합니다. 보증에 가입 가능한 한도 내인지 사전 검토하세요.</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setShowResult(false);
                    }}
                    className="flex-1 bg-body hover:bg-border/30 text-secondary py-3 rounded-xl text-[13px] font-extrabold transition-all cursor-pointer border border-border/40 flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <ArrowLeft size={15} />
                    <span>재시뮬레이션</span>
                  </button>

                  <button
                    onClick={handleShare}
                    className="flex-1 bg-body hover:bg-border/30 text-secondary py-3 rounded-xl text-[13px] font-extrabold transition-all cursor-pointer border border-border/40 flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    {isCopied ? (
                      <>
                        <Check size={15} className="text-emerald-500" />
                        <span>복사 완료!</span>
                      </>
                    ) : (
                      <>
                        <Share2 size={15} />
                        <span>텍스트 복사</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleKakaoShare}
                    className="flex-1 bg-primary hover:bg-primary/90 text-surface py-3 rounded-xl text-[13px] font-extrabold transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                  >
                    <MessageSquare size={15} />
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

JeonseSafetyCalculator.displayName = 'JeonseSafetyCalculator';
export default JeonseSafetyCalculator;
