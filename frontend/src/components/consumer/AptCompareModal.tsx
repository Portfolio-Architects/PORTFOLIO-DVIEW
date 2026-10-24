'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Building2, Sparkles, ArrowUpRight } from 'lucide-react';
import type { DongApartment } from '@/lib/dong-apartments';
import type { AptTxSummary, LocationScoreItem } from '@/lib/types/transaction';
import type { FieldReportData } from '@/lib/types/report.types';
import { usePWA } from '@/components/pwa/PWAProvider';
import { syncShallowApartmentOpen } from '@/lib/ads/recirculationEngine';
import {
  CompareHeaderSearch,
  CompareInsightCard,
  ComparePriceHistoryChart,
  CompareRadarChart,
  CompareSpecTable,
} from './compare';
import { useAptComparison } from './hooks/useAptComparison';

export interface AptCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAptName?: string;
  initialSecondAptName?: string;
  initialAptIds?: string[];
  onSelectApartment?: (aptName: string) => void;
  sheetApartments: Record<string, DongApartment[]>;
  txSummaryData: Record<string, AptTxSummary>;
  nameMapping: Record<string, string>;
  fieldReportsMap: Map<string, FieldReportData>;
  typeMap: Record<string, Record<string, { typeM2: string; typePyeong: string }>>;
  locationScores?: Record<string, LocationScoreItem>;
}

const AptCompareModal = React.memo(function AptCompareModal(props: AptCompareModalProps) {
  const {
    isOpen,
    onClose,
    initialAptName,
    initialSecondAptName,
    initialAptIds,
    onSelectApartment,
    sheetApartments,
    txSummaryData,
    nameMapping,
    fieldReportsMap,
    locationScores = {},
  } = props;

  const { showToast } = usePWA();
  const [mounted, setMounted] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // References
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef1 = useRef<HTMLDivElement>(null);
  const dropdownRef2 = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const effectiveInitialAptIds = useMemo(() => {
    if (initialAptIds && initialAptIds.length > 0) {
      return initialAptIds;
    }
    if (initialAptName && initialSecondAptName) {
      return [initialAptName, initialSecondAptName];
    }
    if (isOpen && typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      const qApt1 = params.get('apt1');
      const qApt2 = params.get('apt2');
      if (initialAptName && qApt2) {
        return [initialAptName, qApt2];
      }
      if (!initialAptName && qApt1 && qApt2) {
        return [qApt1, qApt2];
      }
      const qCompare = params.get('compare');
      if (!initialAptName && qCompare) {
        const parts = qCompare
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (parts.length >= 2) {
          return [parts[0], parts[1]];
        }
      }
    }
    return undefined;
  }, [initialAptIds, initialAptName, initialSecondAptName, isOpen]);

  // Custom Comparison Hook
  const comp = useAptComparison({
    isOpen,
    initialAptName,
    initialAptIds: effectiveInitialAptIds,
    sheetApartments,
    txSummaryData,
    nameMapping,
    fieldReportsMap,
    locationScores,
  });

  const handleReverseEntry = useCallback(
    (targetAptName: string) => {
      if (!targetAptName) return;
      if (onSelectApartment) {
        onSelectApartment(targetAptName);
      } else {
        syncShallowApartmentOpen(targetAptName, { force: true });
        onClose();
      }
    },
    [onSelectApartment, onClose]
  );


  useEffect(() => {
    mountedRef.current = true;
    setMounted(true);
    return () => {
      mountedRef.current = false;
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

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

  // Auto focus first input and handle Escape key
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (firstInputRef.current) {
          firstInputRef.current.focus();
        }
      }, 50);

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (!comp.isFocused1 && !comp.isFocused2) {
            onClose();
          } else {
            comp.setIsFocused1(false);
            comp.setIsFocused2(false);
          }
        }
      };
      window.addEventListener('keydown', handleEscape);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, comp.isFocused1, comp.isFocused2, comp, onClose]);

  // Handle clicking outside of dropdowns to close them
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!comp.isFocused1 && !comp.isFocused2) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (comp.isFocused1 && dropdownRef1.current && !dropdownRef1.current.contains(target)) {
        comp.setIsFocused1(false);
      }
      if (comp.isFocused2 && dropdownRef2.current && !dropdownRef2.current.contains(target)) {
        comp.setIsFocused2(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [comp.isFocused1, comp.isFocused2, comp]);

  // Focus trap inside modal
  const handleFocusTrap = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && containerRef.current) {
      const focusableElements = containerRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

  // Text report clipboard share
  const handleShare = () => {
    if (!comp.apt1 || !comp.apt2 || !comp.metrics1 || !comp.metrics2) return;

    const text = `[D-VIEW 단지 1:1 비교 분석 리포트]

- 비교 대상
단지 A: ${comp.apt1Label}
단지 B: ${comp.apt2Label}

- 종합 비교 결과
${comp.apt1Label} 우세 항목: ${comp.score.apt1}개
${comp.apt2Label} 우세 항목: ${comp.score.apt2}개
최종 결과: ${
      comp.score.apt1 > comp.score.apt2
        ? `${comp.apt1Label} 단지가 더 많은 지표에서 우세합니다.`
        : comp.score.apt2 > comp.score.apt1
        ? `${comp.apt2Label} 단지가 더 많은 지표에서 우세합니다.`
        : '두 단지의 우세 지표 개수가 동일합니다.'
    }

- 주요 입지 및 스펙 비교
1. SRT/GTX-A 역 거리
단지 A: ${comp.metrics1.distanceToSubway ? `${comp.metrics1.distanceToSubway}m` : '-'}
단지 B: ${comp.metrics2.distanceToSubway ? `${comp.metrics2.distanceToSubway}m` : '-'}

2. 동인선 예정역 거리
단지 A: ${comp.metrics1.distanceToIndeokwon ? `${comp.metrics1.distanceToIndeokwon}m` : '-'}
단지 B: ${comp.metrics2.distanceToIndeokwon ? `${comp.metrics2.distanceToIndeokwon}m` : '-'}

3. 동탄트램 예정역 거리
단지 A: ${comp.metrics1.distanceToTram ? `${comp.metrics1.distanceToTram}m` : '-'}
단지 B: ${comp.metrics2.distanceToTram ? `${comp.metrics2.distanceToTram}m` : '-'}

4. 초등학교 도보 통학 거리
단지 A: ${comp.metrics1.distanceToElementary ? `${comp.metrics1.distanceToElementary}m` : '-'}
단지 B: ${comp.metrics2.distanceToElementary ? `${comp.metrics2.distanceToElementary}m` : '-'}

5. 중학교 도보 통학 거리
단지 A: ${comp.metrics1.distanceToMiddle ? `${comp.metrics1.distanceToMiddle}m` : '-'}
단지 B: ${comp.metrics2.distanceToMiddle ? `${comp.metrics2.distanceToMiddle}m` : '-'}

6. 고등학교 도보 통학 거리
단지 A: ${comp.metrics1.distanceToHigh ? `${comp.metrics1.distanceToHigh}m` : '-'}
단지 B: ${comp.metrics2.distanceToHigh ? `${comp.metrics2.distanceToHigh}m` : '-'}

7. 스타벅스 / 올리브영 거리
단지 A: 스타벅스 ${comp.metrics1.distanceToStarbucks ? `${comp.metrics1.distanceToStarbucks}m` : '-'} / 올리브영 ${comp.metrics1.distanceToOliveYoung ? `${comp.metrics1.distanceToOliveYoung}m` : '-'}
단지 B: 스타벅스 ${comp.metrics2.distanceToStarbucks ? `${comp.metrics2.distanceToStarbucks}m` : '-'} / 올리브영 ${comp.metrics2.distanceToOliveYoung ? `${comp.metrics2.distanceToOliveYoung}m` : '-'}

8. 세대수 및 연식
단지 A: ${comp.metrics1.householdCount ? `${comp.metrics1.householdCount.toLocaleString()}세대` : '-'} (${comp.metrics1.yearBuilt ? `${comp.metrics1.yearBuilt}년` : '-'})
단지 B: ${comp.metrics2.householdCount ? `${comp.metrics2.householdCount.toLocaleString()}세대` : '-'} (${comp.metrics2.yearBuilt ? `${comp.metrics2.yearBuilt}년` : '-'})

9. 평균 매매시세 (최근 3개월)
단지 A: ${comp.displayPrice(comp.metrics1.avg3MPrice || 0)}
단지 B: ${comp.displayPrice(comp.metrics2.avg3MPrice || 0)}

10. 평균 평당가 (최근 3개월)
단지 A: ${comp.metrics1.avg3MPerPyeong ? `${comp.metrics1.avg3MPerPyeong.toLocaleString()}만 원` : '-'}
단지 B: ${comp.metrics2.avg3MPerPyeong ? `${comp.metrics2.avg3MPerPyeong.toLocaleString()}만 원` : '-'}

D-VIEW에서 더 자세한 입지 분석과 실거래가 분석을 확인해보세요.`;

    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
    navigator.clipboard.writeText(text).then(() => {
      if (!mountedRef.current) return;
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      setIsCopied(true);
      copyTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setIsCopied(false);
          copyTimeoutRef.current = null;
        }
      }, 2000);
    });
  };

  // Generate JSON-LD structural data
  const jsonLd = useMemo(() => {
    if (!isOpen) return null;

    const elements: Array<Record<string, unknown>> = [];
    if (comp.apt1 && comp.metrics1) {
      elements.push({
        '@type': 'Place',
        name: comp.apt1Label,
        description: `${comp.apt1Label}은(는) ${comp.apt1.dong}에 위치한 단지이며, 3개월 평균 매매 시세는 약 ${(comp.metrics1.avg3MPrice || 0) > 0 ? ((comp.metrics1.avg3MPrice || 0) / 10000).toFixed(1) + '억' : '정보없음'}원, 평당가는 약 ${(comp.metrics1.avg3MPerPyeong || 0) > 0 ? Math.round(comp.metrics1.avg3MPerPyeong || 0).toLocaleString() + '만원' : '정보없음'}입니다.`,
        amenityFeature: [
          {
            '@type': 'LocationFeatureSpecification',
            name: 'GTX-A / SRT역 거리',
            value: comp.metrics1.distanceToSubway ? `${comp.metrics1.distanceToSubway}m` : '정보없음',
          },
          {
            '@type': 'LocationFeatureSpecification',
            name: '초등학교 도보 통학 거리',
            value: comp.metrics1.distanceToElementary ? `${comp.metrics1.distanceToElementary}m` : '정보없음',
          },
        ],
      });
    }
    if (comp.apt2 && comp.metrics2) {
      elements.push({
        '@type': 'Place',
        name: comp.apt2Label,
        description: `${comp.apt2Label}은(는) ${comp.apt2.dong}에 위치한 단지이며, 3개월 평균 매매 시세는 약 ${(comp.metrics2.avg3MPrice || 0) > 0 ? ((comp.metrics2.avg3MPrice || 0) / 10000).toFixed(1) + '억' : '정보없음'}원, 평당가는 약 ${(comp.metrics2.avg3MPerPyeong || 0) > 0 ? Math.round(comp.metrics2.avg3MPerPyeong || 0).toLocaleString() + '만원' : '정보없음'}입니다.`,
        amenityFeature: [
          {
            '@type': 'LocationFeatureSpecification',
            name: 'GTX-A / SRT역 거리',
            value: comp.metrics2.distanceToSubway ? `${comp.metrics2.distanceToSubway}m` : '정보없음',
          },
          {
            '@type': 'LocationFeatureSpecification',
            name: '초등학교 도보 통학 거리',
            value: comp.metrics2.distanceToElementary ? `${comp.metrics2.distanceToElementary}m` : '정보없음',
          },
        ],
      });
    }

    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `DVIEW 아파트 1:1 비교 분석 (${comp.apt1Label} vs ${comp.apt2Label})`,
      description: '동탄 지역 아파트 단지 간의 실거래가 트렌드, 입지 점수, 학군 환경, 대중교통 인프라 등을 1:1로 대조한 종합 분석 리포트입니다.',
      itemListElement: elements.map((el, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        item: el,
      })),
    };
  }, [isOpen, comp.apt1, comp.apt2, comp.metrics1, comp.metrics2, comp.apt1Label, comp.apt2Label]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[12000] flex flex-col justify-end md:justify-center items-center p-0 md:p-6 lg:p-8 overscroll-none animate-in fade-in duration-200"
      onWheel={(e) => e.stopPropagation()}
    >
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md cursor-default focus:outline-none border-none outline-none"
        onClick={onClose}
        aria-label="비교 모달 닫기"
      />

      {/* Modal Container */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-modal-title"
        aria-describedby="compare-modal-desc"
        onKeyDown={handleFocusTrap}
        className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 dark:border-white/10 w-full max-w-[1150px] h-[92vh] md:h-auto md:min-h-[460px] md:max-h-[90vh] rounded-t-[24px] md:rounded-[24px] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border/40 px-6 py-4 shrink-0 bg-surface/50">
          <div className="flex flex-col gap-0.5">
            <h2 id="compare-modal-title" className="text-[17px] font-black text-primary flex items-center gap-1.5">
              <span>1:1 아파트 단지 비교 분석기</span>
            </h2>
            <p id="compare-modal-desc" className="text-[12px] font-medium text-tertiary">
              두 단지의 입지 조건, 단지 규모, 실거래 트렌드를 직관적으로 대조 비교합니다.
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar p-6 space-y-6">
          {/* Subcomponent 1: HeaderSearch */}
          <CompareHeaderSearch
            firstInputRef={firstInputRef}
            searchQuery1={comp.searchQuery1}
            setSearchQuery1={comp.setSearchQuery1}
            apt1={comp.apt1}
            setApt1={comp.setApt1}
            isFocused1={comp.isFocused1}
            setIsFocused1={comp.setIsFocused1}
            dropdownRef1={dropdownRef1}
            handleKeyDown1={comp.handleKeyDown1}
            dropdownOptions1={comp.dropdownOptions1}
            activeIndex1={comp.activeIndex1}
            recentApts={comp.recentApts}
            saveToRecent={comp.saveToRecent}
            searchQuery2={comp.searchQuery2}
            setSearchQuery2={comp.setSearchQuery2}
            apt2={comp.apt2}
            setApt2={comp.setApt2}
            isFocused2={comp.isFocused2}
            setIsFocused2={comp.setIsFocused2}
            dropdownRef2={dropdownRef2}
            handleKeyDown2={comp.handleKeyDown2}
            dropdownOptions2={comp.dropdownOptions2}
            activeIndex2={comp.activeIndex2}
          />

          {/* Placeholder when not both selected */}
          {(!comp.apt1 || !comp.apt2) && (
            <div className="flex flex-col items-center justify-center p-8 bg-body/30 rounded-2xl border border-dashed border-border text-center">
              <Building2 className="w-10 h-10 text-tertiary/75 mb-3" />
              <p className="text-[14px] font-extrabold text-secondary">비교할 단지를 모두 선택해주세요</p>
              <p className="text-[11.5px] font-medium text-tertiary mt-1">상단 자동완성 드롭다운을 통해 두 단지를 선택하면 입지 가치와 차트 비교가 활성화됩니다.</p>
            </div>
          )}

          {/* Active Comparison Body */}
          {comp.apt1 && comp.apt2 && comp.metrics1 && comp.metrics2 && (
            <div className="space-y-6">
              {/* Subcomponent 2: InsightCard */}
              <CompareInsightCard
                apt1={comp.apt1}
                apt2={comp.apt2}
                apt1Label={comp.apt1Label}
                apt2Label={comp.apt2Label}
                score={comp.score}
                showToast={showToast}
                handleShare={handleShare}
                isCopied={isCopied}
              />

              {/* Subcomponent 3: 5-Axis Radar Chart & Gauges */}
              <div className="bg-[#fcfdfe]/50 dark:bg-[#151b26]/30 border border-border/40 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-stretch gap-6">
                {/* 5 Gauge Bars */}
                <div className="flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <h4 className="text-[13px] font-black text-[#057e77] dark:text-emerald-400 tracking-wider uppercase">단지 가치 오각형 분석</h4>
                    <h3 className="text-[16px] font-black text-primary">5대 지표 스펙트럼 대조</h3>
                    <p className="text-[12px] font-medium text-tertiary leading-relaxed break-keep">
                      철도교통, 초·중등 학군, 상권 인프라, 세대당 주차 및 단지 규모, 준공 연식 등 입지를 구성하는 5가지 다차원 가치를 정량화한 분석 차트입니다. 다각형 면적이 넓고 균형 잡힐수록 완성도 높은 입지를 뜻합니다.
                    </p>
                  </div>

                  <div className="space-y-3 border-t border-border/20 pt-4">
                    {comp.radarChartData.map((item) => {
                      const score1 = (item[comp.apt1Label] as number) || 0;
                      const score2 = (item[comp.apt2Label] as number) || 0;
                      const total = score1 + score2 || 1;
                      const ratio1 = (score1 / total) * 100;
                      const ratio2 = (score2 / total) * 100;
                      const isApt1Win = score1 > score2;
                      const isApt2Win = score2 > score1;

                      return (
                        <div key={item.subject} className="space-y-1.5">
                          <div className="flex justify-between items-center text-[11px] font-extrabold">
                            <span className={`flex items-center gap-0.5 transition-colors ${isApt1Win ? 'text-emerald-500 font-black' : 'text-tertiary font-bold'}`}>
                              {isApt1Win && <Sparkles size={10} className="fill-emerald-500 text-emerald-500" />}
                              <span>{score1}점</span>
                            </span>
                            <span className="text-secondary font-bold text-[10.5px]">{item.subject}</span>
                            <span className={`flex items-center gap-0.5 transition-colors ${isApt2Win ? 'text-[#4196f7] font-black' : 'text-tertiary font-bold'}`}>
                              <span>{score2}점</span>
                              {isApt2Win && <Sparkles size={10} className="fill-[#4196f7] text-[#4196f7]" />}
                            </span>
                          </div>

                          <div className="h-2 w-full bg-border/20 dark:bg-slate-800/40 rounded-full overflow-hidden flex relative">
                            <div
                              style={{ width: `${ratio1}%` }}
                              className={`h-full bg-emerald-500 transition-all duration-500 ${isApt1Win ? 'opacity-100' : 'opacity-50'}`}
                            />
                            <div className="w-[1.5px] h-full bg-white dark:slate-900 z-10 shrink-0" />
                            <div
                              style={{ width: `${ratio2}%` }}
                              className={`h-full bg-[#4196f7] transition-all duration-500 ${isApt2Win ? 'opacity-100' : 'opacity-50'}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Radar Chart Container */}
                <div className="w-full md:w-[360px] h-[260px] shrink-0 flex items-center justify-center relative">
                  <CompareRadarChart
                    data={comp.radarDataPoints}
                    apt1Name={comp.apt1Label}
                    apt2Name={comp.apt2Label}
                    className="w-full h-full"
                  />
                </div>
              </div>

              {/* Subcomponent 4: SpecTable */}
              <CompareSpecTable
                apt1Label={comp.apt1Label}
                apt2Label={comp.apt2Label}
                metrics1={comp.metrics1}
                metrics2={comp.metrics2}
                wins={comp.wins}
                aiFitScores={comp.aiFitScores}
                quizAnswers={comp.quizAnswers}
                getCompareClass={comp.getCompareClass}
                displayPrice={comp.displayPrice}
                formatYearBuilt={comp.formatYearBuilt}
              />

              {/* Reverse-Entry Recirculation Card (DESIGN.md Slate/Emerald/Blue compliant) */}
              <div
                data-testid="compare-reverse-entry-bar"
                className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded">
                      DEEP DIVE
                    </span>
                    <span className="text-[12px] font-black text-slate-700 dark:text-slate-300">
                      단독 8챕터 정밀 리포트 역진입
                    </span>
                  </div>
                  <div className="text-[14px] font-extrabold text-slate-900 dark:text-slate-100 leading-snug">
                    비교 완료 단지의 실거래 원장·전세 안전진단·학군 세부 지표 열람
                  </div>
                  <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400">
                    선택한 단지의 8챕터 종합 가치분석 모노그래프로 즉시 전환합니다.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    data-testid="compare-reverse-entry-apt1"
                    onClick={() => comp.apt1 && handleReverseEntry(comp.apt1.name)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12.5px] font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors cursor-pointer"
                  >
                    <span>{comp.apt1Label} 상세 리포트</span>
                    <ArrowUpRight size={14} />
                  </button>
                  <button
                    type="button"
                    data-testid="compare-reverse-entry-apt2"
                    onClick={() => comp.apt2 && handleReverseEntry(comp.apt2.name)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12.5px] font-black bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors cursor-pointer"
                  >
                    <span>{comp.apt2Label} 상세 리포트</span>
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}


          {/* Subcomponent 5: PriceHistoryChart */}
          {comp.apt1 && comp.apt2 && (
            <ComparePriceHistoryChart
              mounted={mounted}
              isTxLoading={comp.isTxLoading}
              combinedChartData={comp.combinedChartData}
              apt1Label={comp.apt1Label}
              apt2Label={comp.apt2Label}
              priceMetric={comp.priceMetric}
              setPriceMetric={comp.setPriceMetric}
              chartType={comp.chartType}
              setChartType={comp.setChartType}
              yAxisDomain={comp.yAxisDomain}
            />
          )}
        </div>
      </div>
    </div>,
    document.getElementById('modal-root') || document.body
  );
});

AptCompareModal.displayName = 'AptCompareModal';
export default AptCompareModal;
