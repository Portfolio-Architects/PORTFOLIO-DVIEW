'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Check, Share2, ArrowLeft, RefreshCw, Calculator, MessageSquare, Sparkles } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { DongApartment } from '@/lib/dong-apartments';
import { AptTxSummary } from '@/lib/types/transaction';
import { findTxKey, normalizeAptName, getDisplayAptName } from '@/lib/utils/apartmentMapping';
import { shareTaxToKakao } from '@/lib/utils/kakaoShare';
import { localCache } from '@/lib/utils/localCache';
import { QuizAnswerSchema } from '@/lib/validation/facade.schemas';
import { usePWA } from '@/components/pwa/PWAProvider';
import { logger } from '@/lib/services/logger';

interface PropertyTaxCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  initialAptName?: string;
  sheetApartments: Record<string, DongApartment[]>;
  txSummaryData: Record<string, AptTxSummary>;
  nameMapping: Record<string, string>;
}

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

const PropertyTaxCalculator = React.memo(function PropertyTaxCalculator({
  isOpen,
  onClose,
  initialAptName,
  sheetApartments,
  txSummaryData,
  nameMapping,
}: PropertyTaxCalculatorProps) {
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

  // Inputs
  const [acquisitionPrice, setAcquisitionPrice] = useState<number>(0); // in Man-won
  const [inputValue, setInputValue] = useState<string>(''); // comma-formatted string for input
  const [ownedHouses, setOwnedHouses] = useState<number>(1); // 1, 2, 3, 4 (4 means 4 or more)
  const [exclusiveArea, setExclusiveArea] = useState<'85under' | '85over'>('85under');

  // Quiz state integration
  const [hasQuizAnswers, setHasQuizAnswers] = useState(false);

  // Diagnosis states
  const [isCalculating, setIsCalculating] = useState(false);
  const [showResult, setShowResult] = useState(false);
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

  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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

    const price = getEstimatedMarketPrice(apt, txSummaryData, nameMapping);
    setAcquisitionPrice(price);
  };

  // Load and map quiz answers on modal mount/open
  useEffect(() => {
    if (isOpen) {
      try {
        const answers = localCache.get('drive_quiz_answers', QuizAnswerSchema, null);
        if (answers) {
          setHasQuizAnswers(true);
          
          // 1. Map ownedHouses: if investmentStyle is 'gap', set to 2, else 1
          if (answers.investmentStyle === 'gap') {
            setOwnedHouses(2);
          } else {
            setOwnedHouses(1);
          }

          // 2. Map exclusiveArea: if large family and high budget, set to 85over
          const isLargeFamily = answers.family === 'middleHigh' || answers.family === 'elementary';
          const isHighBudget = answers.budget === '12eok' || answers.budget === 'unlimited';
          if (isLargeFamily && isHighBudget) {
            setExclusiveArea('85over');
          } else {
            setExclusiveArea('85under');
          }

          // 3. Zero-click simulation if initialAptName is present
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
        logger.warn('PropertyTaxCalculator', 'Failed to parse quiz answers', undefined, e);
      }
    } else {
      // Reset state on close
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

  // Sync inputValue when acquisitionPrice changes from slider, external initial load, or select
  useEffect(() => {
    if (acquisitionPrice === 0) {
      setInputValue('');
    } else {
      setInputValue(acquisitionPrice.toLocaleString());
    }
  }, [acquisitionPrice]);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, '');
    if (rawValue === '') {
      setInputValue('');
      setAcquisitionPrice(0);
      return;
    }
    
    if (/^\d+$/.test(rawValue)) {
      const numValue = parseInt(rawValue, 10);
      const clampedValue = Math.min(250000, numValue);
      setAcquisitionPrice(clampedValue);
      setInputValue(clampedValue.toLocaleString());
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

  // Filter list for Autocomplete
  const filteredApts = useMemo(() => {
    if (!searchQuery.trim()) return allApartments;
    const query = normalizeAptName(searchQuery);
    return allApartments.filter(a => a.normalizedName.includes(query) || a.dong.includes(searchQuery));
  }, [searchQuery, allApartments]);

  // Tax calculations
  const taxResults = useMemo(() => {
    if (acquisitionPrice <= 0) return null;

    const priceEok = acquisitionPrice / 10000;
    
    // 1. Acquisition Tax Rate (취득세율)
    let acqTaxRate = 1;
    if (ownedHouses === 1 || ownedHouses === 2) {
      // Non-adjusted area (Dongtan) 1 and 2 houses share the same rate
      if (priceEok <= 6) {
        acqTaxRate = 1;
      } else if (priceEok <= 9) {
        acqTaxRate = priceEok * (2 / 3) - 3;
      } else {
        acqTaxRate = 3;
      }
    } else if (ownedHouses === 3) {
      acqTaxRate = 8;
    } else {
      acqTaxRate = 12;
    }

    // Round tax rate to 2 decimal places
    acqTaxRate = Math.round(acqTaxRate * 100) / 100;

    // 2. Taxes in Man-won
    const acquisitionTax = Math.round(acquisitionPrice * (acqTaxRate / 100));
    
    // 지방교육세 = 취득세율의 10%
    const localEducationTaxRate = acqTaxRate * 0.1;
    const localEducationTax = Math.round(acquisitionPrice * (localEducationTaxRate / 100));

    // 농어촌특별세 = 85m2 초과 시 0.2%, 이하 시 0%
    const ruralSpecialTaxRate = exclusiveArea === '85over' ? 0.2 : 0;
    const ruralSpecialTax = Math.round(acquisitionPrice * (ruralSpecialTaxRate / 100));

    const totalTax = acquisitionTax + localEducationTax + ruralSpecialTax;

    // 3. Broker Fee
    let brokerFeeRate = 0.4;
    let brokerFee = 0;
    if (acquisitionPrice < 5000) {
      brokerFeeRate = 0.6;
      brokerFee = Math.min(acquisitionPrice * 0.006, 25);
    } else if (acquisitionPrice < 20000) {
      brokerFeeRate = 0.5;
      brokerFee = Math.min(acquisitionPrice * 0.005, 80);
    } else if (acquisitionPrice < 90000) {
      brokerFeeRate = 0.4;
      brokerFee = acquisitionPrice * 0.004;
    } else if (acquisitionPrice < 120000) {
      brokerFeeRate = 0.5;
      brokerFee = acquisitionPrice * 0.005;
    } else if (acquisitionPrice < 150000) {
      brokerFeeRate = 0.6;
      brokerFee = acquisitionPrice * 0.006;
    } else {
      brokerFeeRate = 0.7;
      brokerFee = acquisitionPrice * 0.007;
    }

    brokerFee = Math.round(brokerFee);
    const totalCost = totalTax + brokerFee;

    return {
      acqTaxRate,
      localEducationTaxRate: Math.round(localEducationTaxRate * 100) / 100,
      ruralSpecialTaxRate,
      brokerFeeRate,
      acquisitionTax,
      localEducationTax,
      ruralSpecialTax,
      totalTax,
      brokerFee,
      totalCost,
    };
  }, [acquisitionPrice, ownedHouses, exclusiveArea]);

  const chartData = useMemo(() => {
    if (!taxResults) return [];
    return [
      { name: '매매 가액', value: acquisitionPrice, color: '#ea6100', gradientUrl: 'url(#colorAcq)' },
      { name: '세금 합계', value: taxResults.totalTax, color: '#f43f5e', gradientUrl: 'url(#colorTax)' },
      { name: '중개수수료', value: taxResults.brokerFee, color: '#64748b', gradientUrl: 'url(#colorFee)' },
    ];
  }, [taxResults, acquisitionPrice]);

  const handleStartSimulate = () => {
    if (!selectedApt || acquisitionPrice <= 0) return;
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
    if (!selectedApt || !taxResults) return;
    const aptLabel = getDisplayAptName(selectedApt.name);
    const housesStr = `${ownedHouses}주택`;
    const areaStr = exclusiveArea === '85under' ? '85㎡ 이하' : '85㎡ 초과';
    const text = `[D-VIEW 취득세 및 중개보수 보고서]
단지명: ${aptLabel} (${selectedApt.dong})
매매가액: ${formatEokMan(acquisitionPrice)}

📊 진단 결과 (${housesStr} | ${areaStr})
- 취득세 등 세금 합계: ${formatEokMan(taxResults.totalTax)}
  * 취득세: ${formatEokMan(taxResults.acquisitionTax)} (${taxResults.acqTaxRate}%)
  * 지방교육세: ${formatEokMan(taxResults.localEducationTax)}
  * 농어촌특별세: ${formatEokMan(taxResults.ruralSpecialTax)}
- 부동산 중개보수 (최대): ${formatEokMan(taxResults.brokerFee)} (${taxResults.brokerFeeRate}%)
- 총 소요 부대비용: ${formatEokMan(taxResults.totalCost)}
- 최종 인수 총자금: ${formatEokMan(acquisitionPrice + taxResults.totalCost)}

💡 세금 계산 및 중개보수 정밀 진단 상세 내역은 D-VIEW에서 확인해 보세요!`;

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
    if (!selectedApt || !taxResults) return;
    shareTaxToKakao({
      aptName: getDisplayAptName(selectedApt.name),
      dong: selectedApt.dong,
      marketPrice: acquisitionPrice,
      ownedHouses,
      exclusiveArea,
      acquisitionTax: taxResults.acquisitionTax,
      localEducationTax: taxResults.localEducationTax,
      ruralSpecialTax: taxResults.ruralSpecialTax,
      brokerFee: taxResults.brokerFee,
      totalCost: taxResults.totalCost,
    }, showToast);
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[12000] flex flex-col justify-end md:justify-center items-center p-0 md:p-6 lg:p-8 animate-in fade-in duration-200">
      {/* Backdrop */}
      <button type="button" className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md border-none cursor-default" onClick={onClose} aria-label="보유세 계산기 창 닫기" />

      {/* Modal Container */}
      <div
        ref={containerRef}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tax-title"
        aria-describedby="tax-desc"
        className="relative bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-white/20 dark:border-white/10 w-full max-w-[550px] h-[92vh] md:h-auto md:min-h-[460px] md:max-h-[85vh] rounded-t-[24px] md:rounded-[24px] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border/40 px-6 py-4 shrink-0 bg-surface/50">
          <div className="flex flex-col gap-0.5">
            <h2 id="tax-title" className="text-[17px] font-black text-primary flex items-center gap-1.5">
              <span>취득세 및 중개보수 계산기</span>
            </h2>
            <p id="tax-desc" className="text-[12px] font-medium text-tertiary">
              한국 현행 세법(동탄 비조정 대상지) 및 법정 중개요율을 기반으로 총 부대비용을 계산합니다.
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
              {/* Apartment Select */}
              <div className="space-y-2" ref={dropdownRef}>
                <label className="block text-[13px] font-extrabold text-secondary">
                  1. 대상 동탄 아파트 단지 선택
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
                  {/* Acquisition Price Input */}
                  <div className="space-y-1.5">
                    <span className="text-[12px] font-bold text-secondary">2. 매매 가액 입력</span>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="예: 75,000"
                        value={inputValue}
                        onChange={handlePriceChange}
                        className="w-full bg-body border border-transparent focus:border-[#ea6100] focus:bg-surface rounded-xl py-2.5 px-3 text-right text-[13.5px] font-bold text-primary outline-none transition-all pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-tertiary">만원</span>
                    </div>
                    {acquisitionPrice > 0 && (
                      <div className="mt-1 flex items-center justify-end pr-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-[#ea6100] bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          <Calculator size={11} className="text-emerald-500" />
                          <span>한글 읽기: {formatEokMan(acquisitionPrice)}</span>
                        </span>
                      </div>
                    )}
                    {/* Slider for price */}
                    <div className="pt-2 px-1">
                      <input
                        type="range"
                        min="10000"
                        max="250000"
                        step="1000"
                        value={acquisitionPrice || 10000}
                        onChange={(e) => setAcquisitionPrice(parseInt(e.target.value))}
                        className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-[#ea6100]"
                      />
                      <div className="flex justify-between text-[10px] text-tertiary mt-1 font-medium">
                        <span>1억원</span>
                        <span>10억원</span>
                        <span>25억원</span>
                      </div>
                    </div>
                  </div>

                  {/* Owned Houses Count */}
                  <div className="space-y-1.5">
                    <div className="text-[12px] font-bold text-secondary flex items-center justify-between">
                      <span>3. 취득 후 보유 주택 수 (비조정지역 기준)</span>
                      {hasQuizAnswers && (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-emerald-600 dark:text-[#ea6100] bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          <Sparkles size={11} className="fill-emerald-500/30 text-emerald-500" />
                          <span>퀴즈 답변 반영됨</span>
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setOwnedHouses(num)}
                          className={`py-2 rounded-xl text-[12.5px] font-extrabold border transition-all cursor-pointer ${
                            ownedHouses === num
                              ? 'border-[#ea6100] bg-emerald-50/50 dark:bg-emerald-950/10 text-primary'
                              : 'border-border/30 bg-body/60 hover:bg-body text-tertiary'
                          }`}
                        >
                          {num === 4 ? '4주택 이상' : `${num}주택`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Exclusive Area Size */}
                  <div className="space-y-1.5">
                    <div className="text-[12px] font-bold text-secondary flex items-center justify-between">
                      <span>4. 전용 면적 구분</span>
                      {hasQuizAnswers && (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-emerald-600 dark:text-[#ea6100] bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          <Sparkles size={11} className="fill-emerald-500/30 text-emerald-500" />
                          <span>퀴즈 답변 반영됨</span>
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setExclusiveArea('85under')}
                        className={`py-2.5 rounded-xl text-[12.5px] font-extrabold border transition-all cursor-pointer ${
                          exclusiveArea === '85under'
                            ? 'border-[#ea6100] bg-emerald-50/50 dark:bg-emerald-950/10 text-primary'
                              : 'border-border/30 bg-body/60 hover:bg-body text-tertiary'
                        }`}
                      >
                        전용 85㎡ 이하 (농특별세 면제)
                      </button>
                      <button
                        type="button"
                        onClick={() => setExclusiveArea('85over')}
                        className={`py-2.5 rounded-xl text-[12.5px] font-extrabold border transition-all cursor-pointer ${
                          exclusiveArea === '85over'
                            ? 'border-[#ea6100] bg-emerald-50/50 dark:bg-emerald-950/10 text-primary'
                              : 'border-border/30 bg-body/60 hover:bg-body text-tertiary'
                        }`}
                      >
                        전용 85㎡ 초과 (농특별세 0.2%)
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleStartSimulate}
                    disabled={isCalculating || acquisitionPrice <= 0}
                    className="w-full bg-[#ea6100] hover:bg-[#00b585] text-white py-3.5 rounded-xl text-[14px] font-black shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 mt-4 disabled:opacity-50"
                  >
                    {isCalculating ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>{hasQuizAnswers ? '퀴즈 기반 자동 진단 중...' : '부대비용 계산 중...'}</span>
                      </>
                    ) : (
                      <>
                        <span>세금 및 중개보수 계산하기</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            taxResults && (
              <div className="space-y-6 animate-in zoom-in-95 fade-in duration-300">
                {/* Result Headline Card */}
                <div className="bg-body/70 border border-border/40 p-5 rounded-2xl flex flex-col gap-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                  <span className="text-[10px] font-black text-emerald-600 dark:text-[#ea6100] bg-emerald-500/10 px-2 py-0.5 rounded-md self-start">
                    자금 계획 부대비용 리포트
                  </span>
                  <h3 className="text-[15px] font-black text-primary mt-1">
                    최종 소요 부대비용: <span className="text-[#f43f5e]">{formatEokMan(taxResults.totalCost)}</span>
                  </h3>
                  <p className="text-[11.5px] font-medium text-tertiary">
                    매수 단지 가액 {formatEokMan(acquisitionPrice)} 포함 시 최종 인수 금액은{' '}
                    <span className="font-extrabold text-primary">
                      {formatEokMan(acquisitionPrice + taxResults.totalCost)}
                    </span>
                    입니다.
                  </p>
                </div>

                {/* Pie Chart Visualization */}
                <div className="space-y-3">
                  <h4 className="text-[12.5px] font-extrabold text-primary flex items-center gap-1.5">
                    <Calculator size={14} className="text-[#ea6100]" /> 총 소요 자금 비중 분석
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-body/20 p-4 rounded-xl border border-border/20">
                    <div className="w-full h-32 relative flex items-center justify-center">
                      {mounted ? (
                        <PieChart width={128} height={128}>
                          <defs>
                            <linearGradient id="colorAcq" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ea6100" stopOpacity={1}/>
                              <stop offset="95%" stopColor="#059669" stopOpacity={1}/>
                            </linearGradient>
                            <linearGradient id="colorTax" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f43f5e" stopOpacity={1}/>
                              <stop offset="95%" stopColor="#be123c" stopOpacity={1}/>
                            </linearGradient>
                            <linearGradient id="colorFee" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#64748b" stopOpacity={1}/>
                              <stop offset="95%" stopColor="#475569" stopOpacity={1}/>
                            </linearGradient>
                          </defs>
                          <Pie
                            data={chartData}
                            cx={64}
                            cy={64}
                            innerRadius={30}
                            outerRadius={45}
                            paddingAngle={0}
                            dataKey="value"
                            isAnimationActive={false}
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.gradientUrl} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: unknown) => [formatEokMan(Number(value) || 0), '']}
                            contentStyle={{
                              background: 'rgba(255, 255, 255, 0.95)',
                              border: '1px solid #ddd',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                            }}
                          />
                        </PieChart>
                      ) : (
                        <div className="w-20 h-20 rounded-full border-[12px] border-border/10 animate-pulse" />
                      )}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[9px] font-bold text-tertiary">부대비용</span>
                        <span className="text-[10px] font-black text-[#f43f5e]">
                          {((taxResults.totalCost / (acquisitionPrice + taxResults.totalCost)) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="text-[11.5px] font-bold text-secondary space-y-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#ea6100]" />
                        <span className="text-tertiary">매매 가액:</span>
                        <span className="ml-auto text-primary">{formatEokMan(acquisitionPrice)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
                        <span className="text-tertiary">세금 합계:</span>
                        <span className="ml-auto text-primary">{formatEokMan(taxResults.totalTax)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#64748b]" />
                        <span className="text-tertiary">중개수수료:</span>
                        <span className="ml-auto text-primary">{formatEokMan(taxResults.brokerFee)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-[12.5px] font-extrabold text-primary">항목별 정밀 세액 내역</h4>
                  <div className="bg-body/30 border border-border/20 rounded-xl p-4 text-[12px] font-bold text-secondary space-y-2.5">
                    {/* Tax Section */}
                    <div className="border-b border-border/20 pb-2.5 space-y-2">
                      <div className="flex justify-between text-[11px] text-tertiary">
                        <span>세부 세금 항목</span>
                        <span>세율</span>
                        <span className="text-right">계산 세액</span>
                      </div>
                      <div className="flex justify-between items-center text-primary">
                        <span className="text-secondary font-bold">1. 취득세</span>
                        <span className="text-tertiary font-semibold">{taxResults.acqTaxRate}%</span>
                        <span className="font-extrabold">{formatEokMan(taxResults.acquisitionTax)}</span>
                      </div>
                      <div className="flex justify-between items-center text-primary">
                        <span className="text-secondary font-bold">2. 지방교육세</span>
                        <span className="text-tertiary font-semibold">{taxResults.localEducationTaxRate}%</span>
                        <span className="font-extrabold">{formatEokMan(taxResults.localEducationTax)}</span>
                      </div>
                      <div className="flex justify-between items-center text-primary">
                        <span className="text-secondary font-bold">3. 농어촌특별세</span>
                        <span className="text-tertiary font-semibold">{taxResults.ruralSpecialTaxRate}%</span>
                        <span className="font-extrabold">{formatEokMan(taxResults.ruralSpecialTax)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[#f43f5e] font-black pt-1">
                        <span>세금 합계액</span>
                        <span className="text-right">{formatEokMan(taxResults.totalTax)}</span>
                      </div>
                    </div>

                    {/* Brokerage Section */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] text-tertiary">
                        <span>부동산 중개보수 (상한 요율 기준)</span>
                        <span>요율</span>
                        <span className="text-right">수수료액</span>
                      </div>
                      <div className="flex justify-between items-center text-primary">
                        <span className="text-secondary font-bold">공인중개사 중개수수료</span>
                        <span className="text-tertiary font-semibold">{taxResults.brokerFeeRate}%</span>
                        <span className="font-extrabold">{formatEokMan(taxResults.brokerFee)}</span>
                      </div>
                      <p className="text-[10.5px] text-tertiary font-medium pl-0.5 leading-relaxed">
                        * 중개수수료는 지방자치단체 조례로 정한 최대 요율을 적용한 금액이며 부가가치세(10%)는 별도입니다.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Buttons */}
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

PropertyTaxCalculator.displayName = 'PropertyTaxCalculator';
export default PropertyTaxCalculator;
