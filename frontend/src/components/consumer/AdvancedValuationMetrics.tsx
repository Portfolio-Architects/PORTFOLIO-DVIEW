'use client';

import React from 'react';
import Link from 'next/link';
import {
  Target,
  Building,
  Info,
  ChevronDown,
  Users,
  Car,
  Calendar,
  Train,
  GraduationCap,
  Store,
  TreePine,
  Award,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Sparkles,
  X,
  MapPin,
} from 'lucide-react';
import type { FieldReportData } from '@/lib/DashboardFacade';
import type { AptTxSummary } from '@/types/transaction';
import { getToggleTrackClass, getToggleBtnClass } from '@/lib/design-system/controls';
import {
  getSeoAccordionClass,
  getSeoAccordionSummaryClass,
  getSeoAccordionBodyClass,
  getSeoAccordionChevronClass,
} from '@/lib/design-system/copyDiet';
import { useValuationMetrics } from '@/lib/hooks/useValuationMetrics';
import type { TxRecord, UtilityMetricIconKey } from '@/lib/analytics/valuationModels';

export interface AdvancedValuationMetricsProps {
  report: FieldReportData;
  transactions: TxRecord[];
  txSummaryData?: Record<string, AptTxSummary>;
}

const iconMap: Record<UtilityMetricIconKey, React.ElementType> = {
  award: Award,
  users: Users,
  car: Car,
  calendar: Calendar,
  train: Train,
  'graduation-cap': GraduationCap,
  store: Store,
  'tree-pine': TreePine,
};

const GaugeBar = ({ score, max }: { score: number; max: number }) => {
  const percent = Math.min(100, Math.max(0, (score / max) * 100));

  let colorClassText = 'text-brand-red';
  let colorClassBg = 'bg-brand-red';

  if (percent >= 80) {
    colorClassText = 'text-brand-blue';
    colorClassBg = 'bg-brand-blue';
  } else if (percent >= 50) {
    colorClassText = 'text-primary';
    colorClassBg = 'bg-slate-900 dark:bg-slate-100';
  } else if (percent >= 30) {
    colorClassText = 'text-secondary';
    colorClassBg = 'bg-slate-400 dark:bg-slate-500';
  }

  return (
    <div className="flex flex-col gap-1.5 w-[90px] shrink-0 tabular-nums">
      <div className="flex justify-end items-baseline gap-1">
        <span className={`text-[14px] font-extrabold ${colorClassText}`}>{score}</span>
        <span className="text-[10px] text-tertiary font-medium">/ {max}</span>
      </div>
      <div className="w-full h-1.5 bg-[#eff1f5] dark:bg-[#1e2532] rounded-full overflow-hidden">
        <div className={`h-full ${colorClassBg} rounded-full transition-all duration-700 ease-out`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

const EMPTY_TX_SUMMARY: Record<string, AptTxSummary> = Object.freeze({});

const AdvancedValuationMetrics = React.memo(function AdvancedValuationMetrics({
  report,
  transactions,
  txSummaryData = EMPTY_TX_SUMMARY,
}: AdvancedValuationMetricsProps) {
  const vm = useValuationMetrics(report, transactions, txSummaryData);

  const StatusIcon =
    vm.perStatus.category === 'safe' || vm.perStatus.category === 'stable'
      ? ShieldCheck
      : vm.perStatus.category === 'average'
      ? Target
      : vm.perStatus.category === 'growth' || vm.perStatus.category === 'speculative'
      ? TrendingUp
      : Info;

  return (
    <div className="flex flex-col gap-6">
      {vm.valuationJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: vm.valuationJsonLd }}
        />
      )}

      {/* Header */}
      <h2 className="text-[18px] md:text-[20px] font-extrabold tracking-tight text-primary">
        적정가 · 금리 분석
      </h2>

      {vm.hasData ? (
        <div className="bg-surface overflow-hidden">
          {/* Card Title */}
          <div className="pb-4 border-b border-border">
            <h3 className="text-[15px] font-bold text-primary">
              적정가 · 상품성 요약
            </h3>
            <p className="text-[12px] text-tertiary mt-0.5 font-medium">
              실거래 PER · 금리별 적정가 · 상품성 점수
            </p>
          </div>

          <div className="divide-y divide-border">
            {/* Section 1: 실거래가 & PER 배수 */}
            {vm.txStats.realEstatePER > 0 ? (
              <div className="py-6">
                <h4 className="text-[14.5px] font-bold text-primary mb-4">
                  1. 실거래 배수 분석 (PER)
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* 1단: 기준 실거래 데이터 */}
                  <div className="flex flex-col justify-center">
                    <div className="bg-elevated rounded-2xl p-5 flex flex-col justify-center gap-3.5 h-full tabular-nums">
                      <h5 className="text-[13px] font-bold text-secondary">기준 실거래 데이터</h5>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[12.5px] text-tertiary font-semibold">3개월 평균 매매가</span>
                          <span className="text-[14px] font-bold text-primary">{vm.formatPrice(vm.txStats.avg3MSale)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[12.5px] text-tertiary font-semibold">3개월 평균 전세가</span>
                          <span className="text-[14px] font-bold text-primary">{vm.formatPrice(vm.txStats.avg3MRent)}</span>
                        </div>
                        <div className="h-px w-full bg-border" />
                        <div className="flex items-center justify-between">
                          <span className="text-[12.5px] text-tertiary font-semibold">전세가율</span>
                          <span className="text-[14px] font-extrabold text-primary">
                            {vm.txStats.jeonseRatio > 0 ? `${vm.txStats.jeonseRatio.toFixed(1)}%` : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2단: 실구매 차액(GAP) 분석 */}
                  <div className="flex flex-col justify-center">
                    <div className="bg-elevated rounded-2xl p-5 flex flex-col justify-center gap-3.5 h-full tabular-nums">
                      <h5 className="text-[13px] font-bold text-secondary">
                        매매-전세 차이 (갭)
                      </h5>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[12.5px] text-tertiary font-semibold">현재 차이 (매매-전세)</span>
                          <span className="text-[14px] font-bold text-primary">{vm.formatPrice(vm.txStats.currentGap)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[12.5px] text-tertiary font-semibold">1년 전 평균 차이</span>
                          <span className="text-[14px] font-semibold text-tertiary">
                            {vm.txStats.gap1YearAgo !== null ? vm.formatPrice(vm.txStats.gap1YearAgo) : '데이터 부족'}
                          </span>
                        </div>
                        <div className="h-px w-full bg-border" />
                        <div className="flex items-center justify-between">
                          <span className="text-[12.5px] text-tertiary font-semibold">변동 추이</span>
                          {vm.txStats.gapDelta !== null ? (
                            <span className={`text-[12px] font-bold inline-flex items-center gap-1 ${
                              vm.txStats.gapDelta < 0
                                ? 'text-brand-blue'
                                : vm.txStats.gapDelta > 0
                                ? 'text-brand-red'
                                : 'text-secondary'
                            }`}>
                              {vm.txStats.gapDelta < 0 ? (
                                <>
                                  <TrendingDown size={13} className="shrink-0" />
                                  <span>{vm.formatPrice(Math.abs(vm.txStats.gapDelta))} 축소</span>
                                </>
                              ) : vm.txStats.gapDelta > 0 ? (
                                <>
                                  <TrendingUp size={13} className="shrink-0" />
                                  <span>{vm.formatPrice(vm.txStats.gapDelta)} 확대</span>
                                </>
                              ) : (
                                '변동 없음'
                              )}
                            </span>
                          ) : (
                            <span className="text-[12px] text-tertiary">-</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3단: PER 지표 및 진단 */}
                  <div className="flex flex-col justify-center">
                    <div className="bg-elevated rounded-2xl p-5 flex flex-col justify-between h-full">
                      <div className="flex flex-col items-center justify-center pb-2">
                        <button
                          type="button"
                          className="text-[11px] font-bold text-tertiary mb-0.5 cursor-pointer hover:text-primary transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-900/20 dark:focus-visible:ring-white/25 rounded"
                          onClick={() => vm.setIsValuationModalOpen(true)}
                          aria-label="매매가 ÷ 전세가 배수 도움말 모달 열기"
                        >
                          매매가 ÷ 전세가 배수
                        </button>
                        <div className="flex items-end gap-1 tabular-nums">
                          <span className="text-[36px] font-black text-primary leading-none tracking-tighter">
                            {vm.txStats.realEstatePER.toFixed(2)}
                          </span>
                          <span className="text-[14px] font-extrabold text-tertiary mb-0.5">배</span>
                        </div>
                      </div>

                      {/* Status Signal */}
                      <div className={`p-3 rounded-xl border flex gap-2 items-center mb-2 ${vm.perStatus.statusBg}`}>
                        <StatusIcon size={16} className={`${vm.perStatus.statusColor} shrink-0`} />
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <h5 className={`text-[12.5px] font-extrabold ${vm.perStatus.statusColor}`}>{vm.perStatus.statusText}</h5>
                          <p className="text-[11px] font-bold text-secondary">
                            {vm.txStats.jeonseRatio >= 75
                              ? '전세가율 75%+ · 보증보험 가입 필수 점검'
                              : vm.txStats.jeonseRatio >= 65
                              ? '전세가율 65%+ · 탄탄한 실수요 하방 지지'
                              : vm.txStats.jeonseRatio >= 55
                              ? '전세가율 55%+ · 실거주 장기 보유 권장'
                              : '미래가치 선반영 · 매매-전세 갭 유의'}
                          </p>
                        </div>
                      </div>

                      {/* Layer 2: PER & AI 진단 상세 아코디언 */}
                      <details className={getSeoAccordionClass('bg-surface/80')}>
                        <summary className={getSeoAccordionSummaryClass('min-h-[36px] px-3 py-2 text-[11px]')}>
                          <span className="inline-flex items-center gap-1">
                            <Sparkles size={13} className="text-secondary shrink-0" />
                            <span>PER · 전세가율 해설 더보기</span>
                          </span>
                          <ChevronDown size={14} className={getSeoAccordionChevronClass()} />
                        </summary>
                        <div className={getSeoAccordionBodyClass('px-3 py-2.5 text-[11.5px] space-y-1.5')}>
                          <p className="whitespace-pre-line">{vm.perStatus.descriptionText}</p>
                          <p className="text-slate-600 dark:text-slate-300">
                            {vm.txStats.jeonseRatio >= 75
                              ? '매매가와 전세가 차이가 매우 좁아 실구매 부담은 적으나, 깡통전세 및 역전세 발생 리스크가 큰 단지입니다. 임차 시 보증보험 확인이 반드시 필요합니다.'
                              : vm.txStats.jeonseRatio >= 65
                              ? '실수요 가격 지지층이 튼튼하여 안정적인 실수요 가격 지지력을 갖춘 안심 단지입니다.'
                              : vm.txStats.jeonseRatio >= 55
                              ? '보편적인 수준의 전세가 비율이며, 단기 시세 상승보다는 실거주 선호도에 기반한 장기 안정을 권장합니다.'
                              : '매매가에 미래 기대 가치가 크게 선반영되어 매매-전세 차액 대비 주거 안정성 확보 비용이 높을 수 있습니다.'}
                          </p>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-tertiary text-[13px]">
                실거래 데이터 부족으로 배수 분석을 제공하지 않습니다.
              </div>
            )}

            {/* Section 1-2: 핵심지 출퇴근 시뮬레이터 */}
            {vm.txStats.realEstatePER > 0 ? (
              <div className="py-6">
                <h4 className="text-[14.5px] font-bold text-primary mb-4">
                  주요 업무지구 출퇴근 시간
                </h4>

                <div className="flex flex-col lg:flex-row gap-5">
                  {/* Left: Destination tabs & Details */}
                  <div className="flex-1 flex flex-col gap-3.5">
                    <div className={getToggleTrackClass('w-full')}>
                      {([
                        { id: 'gangnam', label: '강남역' },
                        { id: 'pangyo', label: '판교역' },
                        { id: 'samseong', label: '삼성역' },
                      ] as const).map(dest => (
                        <button
                          key={dest.id}
                          type="button"
                          onClick={() => vm.setCommuteDest(dest.id)}
                          className={getToggleBtnClass({
                            active: vm.commuteDest === dest.id,
                            extraClass: 'flex-1',
                          })}
                        >
                          {dest.label}
                        </button>
                      ))}
                    </div>

                    <div className="bg-elevated rounded-2xl p-5 flex flex-col gap-3 tabular-nums">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[12.5px] gap-1 sm:gap-2">
                        <span className="text-tertiary font-bold shrink-0 whitespace-nowrap">최적 대중교통 경로</span>
                        <span className="font-bold text-secondary text-left sm:text-right break-keep">{vm.commuteAnalysis.method}</span>
                      </div>
                      <div className="h-px w-full bg-border/40" />
                      <div className="flex justify-between items-center text-[12.5px] gap-2">
                        <span className="text-tertiary font-bold shrink-0 whitespace-nowrap">동탄역 연계 (트램/도보)</span>
                        <span className="font-extrabold text-primary shrink-0 whitespace-nowrap">{vm.commuteAnalysis.linkTime}분</span>
                      </div>
                      <div className="flex justify-between items-center text-[12.5px] gap-2">
                        <span className="text-tertiary font-bold shrink-0 whitespace-nowrap">광역철도 탑승 (GTX-A 등)</span>
                        <span className="font-extrabold text-primary shrink-0 whitespace-nowrap">{vm.commuteAnalysis.transitTime}분</span>
                      </div>
                      <div className="flex justify-between items-center text-[12.5px] gap-2">
                        <span className="text-tertiary font-bold shrink-0 whitespace-nowrap">목적지 하차 후 이동</span>
                        <span className="font-extrabold text-primary shrink-0 whitespace-nowrap">8분 (고정)</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Simulation result Box */}
                  <div className="flex-1 flex flex-col justify-center gap-4">
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-[13px] font-bold text-tertiary mb-1">예상 출퇴근 시간</span>
                      <div className="flex items-baseline gap-1 tabular-nums">
                        <span className="text-[40px] font-black text-primary leading-none tracking-tighter">
                          {vm.commuteAnalysis.totalTime}
                        </span>
                        <span className="text-[16px] font-extrabold text-tertiary">분</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-elevated flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="text-[13px] font-bold text-secondary">출퇴근 입지 프리미엄</h5>
                        <span className={`text-[11.5px] font-extrabold tabular-nums ${vm.commuteAnalysis.savedTime > 0 ? 'text-brand-blue' : 'text-tertiary'}`}>
                          {vm.commuteAnalysis.savedTime > 0
                            ? `${vm.commuteAnalysis.savedTime}분 단축 · +${vm.commuteAnalysis.premium.toFixed(3)}%p`
                            : '60분 초과 · 가산 없음'}
                        </span>
                      </div>
                      <details className={getSeoAccordionClass('bg-surface')}>
                        <summary className={getSeoAccordionSummaryClass('min-h-[34px] px-3 py-1.5 text-[11px]')}>
                          <span>출퇴근 프리미엄 산정 기준 더보기</span>
                          <ChevronDown size={14} className={getSeoAccordionChevronClass()} />
                        </summary>
                        <div className={getSeoAccordionBodyClass('px-3 py-2 text-[11.5px]')}>
                          {vm.commuteAnalysis.savedTime > 0 ? (
                            <p>
                              대중교통 60분 기준선 대비 {vm.commuteAnalysis.savedTime}분 단축되어 DCF 장기 성장률 프리미엄 +{vm.commuteAnalysis.premium.toFixed(3)}%p가 가산됩니다.
                            </p>
                          ) : (
                            <p>
                              소요 시간이 60분 기준선을 상회하여 자산 가치 산출 시 추가 교통 프리미엄이 부여되지 않습니다.
                            </p>
                          )}
                        </div>
                      </details>
                    </div>

                    <button
                      onClick={vm.handleCopyCommute}
                      className={`w-full py-2.5 rounded-xl font-bold text-[12.5px] transition-colors text-center cursor-pointer border-none ${
                        vm.isCopiedCommute
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                          : 'bg-[#eff1f5] hover:bg-slate-200 dark:bg-[#1e2532] dark:hover:bg-[#252c3d] text-secondary hover:text-primary'
                      }`}
                    >
                      {vm.isCopiedCommute ? '출퇴근 분석 보고서 복사 완료!' : '출퇴근 분석 보고서 복사'}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Section 2: 금리 연동 적정가 (DCF) */}
            {vm.txStats.realEstatePER > 0 ? (
              <div className="py-6">
                <h4 className="text-[14.5px] font-bold text-primary mb-4">
                  2. 금리로 계산한 적정 집값 (DCF)
                </h4>
                <div className="flex flex-col lg:flex-row gap-5">
                  {/* Left: Final DCF Summary + Collapsible Steps 1-4 */}
                  <div className="flex-1 flex flex-col justify-start gap-3">
                    <h5 className="text-[13px] font-bold text-secondary">적용 수식 및 산출 근거</h5>
                    <div className="bg-elevated border border-border rounded-2xl p-4 flex flex-col gap-1.5 tabular-nums">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-secondary font-bold">최종 도출 이론 적정가</span>
                        <span className="text-[17px] font-black text-primary">{vm.formatPrice(vm.dcf.impliedValue)}</span>
                      </div>
                      <div className="text-[11.5px] text-secondary font-medium">
                        연 임대료 {vm.formatPrice(vm.txStats.avg3MRent * vm.effectiveConversionRate)} ÷ Cap Rate {vm.dcf.capRate.toFixed(2)}%
                      </div>
                    </div>

                    <details className={getSeoAccordionClass('bg-elevated')}>
                      <summary className={getSeoAccordionSummaryClass()}>
                        <span>DCF 4단계 산출 수식 더보기</span>
                        <ChevronDown size={15} className={getSeoAccordionChevronClass()} />
                      </summary>
                      <div className={getSeoAccordionBodyClass('space-y-3 tabular-nums')}>
                        {/* Step 1 */}
                        <div className="bg-surface rounded-xl p-3 flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] text-secondary font-bold">Step 1. 연간 예상 임대 가치 (Annual Rent)</span>
                            <span className="text-[13px] font-extrabold text-primary">{vm.formatPrice(vm.txStats.avg3MRent * vm.effectiveConversionRate)}</span>
                          </div>
                          <div className="text-[11.5px] text-tertiary leading-relaxed">
                            평균 전세 {vm.formatPrice(vm.txStats.avg3MRent)} × 동적 전환율 {(vm.effectiveConversionRate * 100).toFixed(2)}%
                            {vm.spreadReasons.length > 0 && (
                              <span className="text-secondary block font-semibold mt-0.5">({vm.spreadReasons.join(', ')})</span>
                            )}
                          </div>
                        </div>

                        {/* Step 2 */}
                        <div className="bg-surface rounded-xl p-3 flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] text-secondary font-bold">Step 2. 기본 투자 요구 이자율 (할인율 r)</span>
                            <span className="text-[13px] font-extrabold text-primary">{vm.dcf.discountRate.toFixed(2)}%</span>
                          </div>
                          <div className="text-[11.5px] text-tertiary leading-relaxed">
                            국고채 {vm.macroConfig.riskFreeRate.toFixed(2)}% + 동적 리스크 {((vm.dcf.dynamicPremium ?? 1.5).toFixed(2))}% + 조달 스프레드 {Math.max(0, vm.computedFundingSpread).toFixed(2)}%
                          </div>
                        </div>

                        {/* Step 3 */}
                        <div className="bg-surface rounded-xl p-3 flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] text-secondary font-bold">Step 3. 장기 집값 상승 기대치 (성장률 g)</span>
                            <span className="text-[13px] font-extrabold text-primary">{vm.dcf.growthRate.toFixed(2)}%</span>
                          </div>
                          <div className="text-[11.5px] text-tertiary leading-relaxed">
                            물가({((vm.macroConfig.baseInflationRate <= 0.1 ? vm.macroConfig.baseInflationRate * 100 : vm.macroConfig.baseInflationRate)).toFixed(1)}%) + 단지 가치(+{((vm.utilityScoreResult.total * 0.01)).toFixed(2)}%p) + 입지 가중(+{Math.max(0, vm.dcf.growthRate - (vm.macroConfig.baseInflationRate <= 0.1 ? vm.macroConfig.baseInflationRate * 100 : vm.macroConfig.baseInflationRate) - vm.utilityScoreResult.total * 0.01).toFixed(2)}%p)
                          </div>
                        </div>

                        {/* Step 4 */}
                        <div className="bg-surface rounded-xl p-3 flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] text-secondary font-bold">Step 4. 순수 자본환원율 (Cap Rate: r - g)</span>
                            <span className="text-[13px] font-extrabold text-primary">{vm.dcf.capRate.toFixed(2)}%</span>
                          </div>
                          <div className="text-[11.5px] text-tertiary leading-relaxed">
                            할인율({vm.dcf.discountRate.toFixed(2)}%) - 성장률({vm.dcf.growthRate.toFixed(2)}%) = {(vm.dcf.capRate / 100).toFixed(4)}
                          </div>
                        </div>
                      </div>
                    </details>
                  </div>

                  {/* Right Column: Comparison with Market Price */}
                  <div className="flex-1 flex flex-col justify-start">
                    <h5 className="text-[13px] font-bold text-secondary mb-3">적정가 vs 시장 실거래가 대조</h5>
                    <div className="bg-elevated rounded-2xl p-5 flex flex-col gap-4 tabular-nums">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-bold text-secondary">수익환원법 적정가 (DCF)</span>
                        <span className="text-[20px] font-black text-primary">{vm.formatPrice(vm.dcf.impliedValue)}</span>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                        {vm.txStats.avg1MSale > 0 && (
                          <div className={`flex flex-col items-center justify-between p-4 rounded-xl ${
                            vm.diff1M.isOver
                              ? 'bg-brand-red-light'
                              : 'bg-brand-blue-light'
                          }`}>
                            <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-secondary mb-2 text-center break-keep">
                              <span>기준가 (1개월): <strong>{vm.formatPrice(vm.txStats.avg1MSale)}</strong></span>
                            </div>
                            <div className={`w-full py-1.5 rounded-lg text-[12.5px] font-extrabold text-center break-keep ${
                              vm.diff1M.isOver ? 'text-brand-red' : 'text-brand-blue'
                            }`}>
                              적정가 대비 {vm.diff1M.percent.toFixed(1)}% ({vm.formatPrice(vm.diff1M.amount)}) {vm.diff1M.isOver ? '고평가' : '저평가'}
                            </div>
                          </div>
                        )}

                        {vm.txStats.avg3MSale > 0 && (
                          <div className={`flex flex-col items-center justify-between p-4 rounded-xl ${
                            vm.diff3M.isOver
                              ? 'bg-brand-red-light'
                              : 'bg-brand-blue-light'
                          }`}>
                            <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-secondary mb-2 text-center break-keep">
                              <span>기준가 (3개월): <strong>{vm.formatPrice(vm.txStats.avg3MSale)}</strong></span>
                            </div>
                            <div className={`w-full py-1.5 rounded-lg text-[12.5px] font-extrabold text-center break-keep ${
                              vm.diff3M.isOver ? 'text-brand-red' : 'text-brand-blue'
                            }`}>
                              적정가 대비 {vm.diff3M.percent.toFixed(1)}% ({vm.formatPrice(vm.diff3M.amount)}) {vm.diff3M.isOver ? '고평가' : '저평가'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-tertiary text-[13px]">
                실거래 데이터 부족으로 적정 집값 산출을 제공하지 않습니다.
              </div>
            )}

            {/* Section 3: 금리 변동별 적정가 시뮬레이션 */}
            {vm.txStats.realEstatePER > 0 && (
              <div className="py-6">
                <h4 className="text-[14.5px] font-bold text-primary mb-4">
                  3. 금리 변동별 적정가 시뮬레이션
                </h4>

                <div className="flex flex-col lg:flex-row gap-5">
                  {/* Left: Sliders */}
                  <div className="flex-1 flex flex-col gap-5 bg-elevated rounded-2xl p-5 tabular-nums">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[13px] font-extrabold text-secondary">
                        <span>기준금리 시나리오</span>
                        <span className="text-primary">{vm.simBaseRate.toFixed(2)}%</span>
                      </div>
                      <input
                        type="range"
                        min="1.00"
                        max="5.00"
                        step="0.25"
                        value={vm.simBaseRate}
                        onChange={(e) => vm.setSimBaseRate(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-[#eff1f5] dark:bg-[#1e2532] rounded-lg appearance-none cursor-pointer accent-slate-900 dark:accent-slate-100"
                        aria-label="기준금리 시나리오"
                      />
                      <div className="flex justify-between text-[11px] text-tertiary font-medium">
                        <span>금리인하 (1.00%)</span>
                        <span>현재 (3.25%)</span>
                        <span>금리인상 (5.00%)</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[13px] font-extrabold text-secondary">
                        <span>기대상승률 시나리오</span>
                        <span className="text-primary">{vm.simGrowthRate.toFixed(1)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="5.0"
                        step="0.1"
                        value={vm.simGrowthRate}
                        onChange={(e) => vm.setSimGrowthRate(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-[#eff1f5] dark:bg-[#1e2532] rounded-lg appearance-none cursor-pointer accent-slate-900 dark:accent-slate-100"
                        aria-label="기대상승률 시나리오"
                      />
                      <div className="flex justify-between text-[11px] text-tertiary font-medium">
                        <span>보수적 (0.0%)</span>
                        <span>기본 ({vm.dcf.growthRate.toFixed(1)}%)</span>
                        <span>긍정적 (5.0%)</span>
                      </div>
                    </div>

                    <details className={getSeoAccordionClass('bg-surface/80')}>
                      <summary className={getSeoAccordionSummaryClass('min-h-[34px] px-3 py-1.5 text-[11px]')}>
                        <span>금리 · 전세가 시나리오 원리 더보기</span>
                        <ChevronDown size={14} className={getSeoAccordionChevronClass()} />
                      </summary>
                      <div className={getSeoAccordionBodyClass('px-3 py-2 text-[11.5px]')}>
                        <p>
                          금리 하락 시 전세대출 유동성이 증가하여 전세가가 상승하고, 할인율이 낮아져 자산 적정가가 크게 오릅니다. 반대로 금리 상승 시에는 적정가가 조정을 받으며 필요한 매매-전세 차액(실구매 부담)이 늘어납니다.
                        </p>
                      </div>
                    </details>
                  </div>

                  {/* Right: Simulation Cards */}
                  <div className="flex-1 flex flex-col gap-3.5 tabular-nums">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-elevated rounded-2xl p-4 flex flex-col gap-1.5">
                        <span className="text-[12px] font-bold text-secondary">시뮬레이션 적정가</span>
                        <span className="text-[18px] font-black text-primary">
                          {vm.formatPrice(vm.simulatedDCF.impliedValue)}
                        </span>
                        {vm.dcf.impliedValue > 0 && (
                          <span className={`text-[11.5px] font-bold ${
                            vm.simulatedDCF.impliedValue > vm.dcf.impliedValue ? 'text-brand-red' : vm.simulatedDCF.impliedValue < vm.dcf.impliedValue ? 'text-brand-blue' : 'text-secondary'
                          }`}>
                            {vm.simulatedDCF.impliedValue > vm.dcf.impliedValue ? '+' : ''}
                            {(((vm.simulatedDCF.impliedValue - vm.dcf.impliedValue) / vm.dcf.impliedValue) * 100).toFixed(1)}% 변동
                          </span>
                        )}
                      </div>

                      <div className="bg-elevated rounded-2xl p-4 flex flex-col gap-1.5">
                        <span className="text-[12px] font-bold text-secondary">시뮬레이션 전세가</span>
                        <span className="text-[18px] font-black text-primary">
                          {vm.formatPrice(vm.simulatedDCF.simJeonsePrice)}
                        </span>
                        <span className="text-[11.5px] text-tertiary font-bold">
                          전세가율 {vm.simulatedDCF.simJeonseRatio.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="bg-elevated rounded-2xl p-4 flex flex-col gap-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[12.5px] font-bold text-secondary">매매-전세 차액(실구매 부담)</span>
                        <span className="text-[16px] font-black text-primary">
                          {vm.formatPrice(vm.simulatedDCF.simGap)}
                        </span>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex justify-between items-center text-[12px]">
                        <span className="text-tertiary font-semibold">현재 대비 차액 변동</span>
                        {(() => {
                          const gapDiff = vm.simulatedDCF.simGap - vm.txStats.currentGap;
                          if (gapDiff < 0) {
                            return (
                              <span className="font-extrabold text-brand-blue">
                                {vm.formatPrice(Math.abs(gapDiff))} 절감 (실구매 부담 감소)
                              </span>
                            );
                          } else if (gapDiff > 0) {
                            return (
                              <span className="font-extrabold text-brand-red">
                                {vm.formatPrice(gapDiff)} 추가 필요 (실구매 부담 증가)
                              </span>
                            );
                          }
                          return <span className="font-bold text-secondary">변동 없음</span>;
                        })()}
                      </div>
                    </div>

                    <button
                      onClick={vm.handleCopyScenario}
                      className={`w-full py-2.5 rounded-xl font-bold text-[13px] transition-colors text-center cursor-pointer border-none ${
                        vm.isCopiedScenario
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                          : 'bg-[#eff1f5] hover:bg-slate-200 dark:bg-[#1e2532] dark:hover:bg-[#252c3d] text-secondary hover:text-primary'
                      }`}
                    >
                      {vm.isCopiedScenario ? '시나리오 분석 보고서 복사 완료!' : '시나리오 분석 보고서 복사하기'}
                    </button>
                  </div>
                </div>

                {/* Stress DSR Financial Guide Recirculation Card */}
                <div className="mt-4 p-4 rounded-2xl bg-elevated flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <div className="text-[11px] font-bold text-tertiary">
                      참고 가이드 · 스트레스 DSR 2단계
                    </div>
                    <div className="text-[13.5px] font-bold text-primary">
                      {vm.simBaseRate >= 3.25
                        ? '금리 상승기 고정·주기형 한도 방어 전략'
                        : '금리 하락기 변동·혼합형 상환액 점검'}
                    </div>
                    <p className="text-[11.5px] text-secondary font-medium">
                      {vm.simBaseRate >= 3.25
                        ? '스트레스 가산금리 반영 시 소득별 주담대 한도 축소 폭 점검'
                        : '기준금리 인하 시나리오별 월 원리금 및 DSR 40% 여유분 비교'}
                    </p>
                  </div>
                  <Link
                    href="/guide/stress-dsr-valuation-guide" prefetch={false}
                    className="w-full sm:w-auto text-center px-3.5 py-2 bg-surface hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] text-primary border border-border font-bold text-[12px] rounded-[10px] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    스트레스 DSR 대출 가이드 보기
                  </Link>
                </div>
              </div>
            )}

            {/* Section 4: 단지 상품성 & 인프라 가치평가 (Utility Score) */}
            {vm.utilityScoreResult.total > 0 && (
              <div id="utility-score-section" className="py-6 scroll-mt-20">
                <h4 className="text-[14.5px] font-bold text-primary mb-4">
                  4. 단지 상품성 · 입지 점수
                </h4>
                <div className="flex flex-col md:flex-row items-stretch gap-5">
                  {/* Left: Score & Progress Bar */}
                  <div className="flex-1 flex flex-col justify-center items-center md:items-start bg-elevated rounded-2xl p-5 text-center md:text-left min-w-0 tabular-nums">
                    <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider">종합 가치평가 점수</span>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-[44px] font-black text-primary leading-none tracking-tight">
                        {vm.utilityScoreResult.total}
                      </span>
                      <span className="text-[14px] font-bold text-tertiary">/ {vm.utilityScoreResult.maxTotal}점</span>
                    </div>
                    <div className="w-full bg-[#eff1f5] dark:bg-[#1e2532] h-2.5 rounded-full mt-4 overflow-hidden">
                      <div
                        className="bg-slate-900 dark:bg-slate-100 h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${(vm.utilityScoreResult.total / vm.utilityScoreResult.maxTotal) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Right: Explanation & Accordion Toggle */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-[12px] font-extrabold shadow-xs ${
                          vm.utilityScoreResult.total >= 130
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                            : 'bg-[#eff1f5] dark:bg-[#1e2532] text-secondary'
                        }`}>
                          {vm.utilityScoreResult.total >= 130 ? '최우수 단지' : vm.utilityScoreResult.total >= 100 ? '우수 단지' : '표준 단지'}
                        </span>
                      </div>
                      <p className="text-[13px] md:text-[13.5px] text-secondary leading-relaxed font-semibold mt-1">
                        {vm.utilityScoreResult.total >= 130
                          ? '최상위 상품성 · 초역세권 입지 · 장기 성장률 가산 적용'
                          : vm.utilityScoreResult.total >= 100
                          ? '우수 단지 스펙 · 생활 인프라 · 시장 평균 성장률 적용'
                          : '단지 규모 · 연식 반영 · 보수적 장기 성장률 적용'}
                      </p>
                      <details className={getSeoAccordionClass('bg-body/50 mt-1')}>
                        <summary className={getSeoAccordionSummaryClass('min-h-[34px] px-3 py-1.5 text-[11px]')}>
                          <span>상품성 성장률 반영 기준 더보기</span>
                          <ChevronDown size={14} className={getSeoAccordionChevronClass()} />
                        </summary>
                        <div className={getSeoAccordionBodyClass('px-3 py-2 text-[11.5px]')}>
                          <p>
                            {vm.utilityScoreResult.total >= 130
                              ? '동탄 내 최상위권의 상품성과 초역세권 입지를 갖추어, 평균(2.0%)보다 높은 장기 성장률 프리미엄이 반영됩니다.'
                              : vm.utilityScoreResult.total >= 100
                              ? '준수한 단지 스펙과 생활 인프라를 갖추어, 시장 평균 수준의 성장률이 안정적으로 적용됩니다.'
                              : '단지 규모나 연식, 역세권 접근성 등의 제한으로 인해 평균보다 다소 보수적인 성장률이 적용됩니다.'}
                          </p>
                        </div>
                      </details>
                    </div>

                    <button
                      onClick={vm.handleScoreAccordionToggle}
                      className="mt-4 w-full px-4 py-3.5 rounded-xl flex items-center justify-between bg-elevated hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] border-none transition-colors active:scale-[0.99] group cursor-pointer"
                    >
                      <span className="text-[13.5px] font-bold text-secondary group-hover:text-primary flex items-center gap-2">
                        <Info size={15} className="text-secondary" />
                        세부 가치평가 내역 {vm.isScoreAccordionOpen ? '접기' : '펼치기'} (11개 항목)
                      </span>
                      <ChevronDown
                        size={16}
                        className={`text-tertiary transition-transform duration-300 ${vm.isScoreAccordionOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </div>
                </div>

                {/* Accordion Content */}
                {vm.isScoreAccordionOpen && (
                  <div className="mt-5 border-t border-border pt-5 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Specs */}
                      <div className="flex flex-col gap-3">
                        <h4 className="text-[13px] font-bold text-secondary pb-1.5 border-b border-border flex items-center gap-1.5">
                          <Building size={15} />
                          단지 상품성 & 스펙 (4개 지표)
                        </h4>
                        <div className="flex flex-col gap-3">
                          {vm.utilityScoreResult.logs.filter(log => !log.isInfra).map((log, i) => {
                            const Icon = iconMap[log.iconKey] || Award;
                            return (
                              <div key={i} className="bg-elevated rounded-2xl p-4 flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-surface text-primary flex items-center justify-center shrink-0">
                                      <Icon size={14} />
                                    </div>
                                    <span className="text-[13px] font-bold text-primary">{log.category}</span>
                                  </div>
                                  <GaugeBar score={log.score} max={log.max} />
                                </div>
                                <span className="text-[12px] text-secondary font-medium">{log.label}</span>
                                {log.data && (
                                  <span className="text-[11px] text-tertiary font-semibold tabular-nums">
                                    실데이터: {log.data}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Infra */}
                      <div className="flex flex-col gap-3">
                        <h4 className="text-[13px] font-bold text-secondary pb-1.5 border-b border-border flex items-center gap-1.5">
                          <MapPin size={15} />
                          주변 인프라 & 교통 입지 (7개 지표)
                        </h4>
                        <div className="flex flex-col gap-3">
                          {vm.utilityScoreResult.logs.filter(log => log.isInfra).map((log, i) => {
                            const Icon = iconMap[log.iconKey] || MapPin;
                            return (
                              <div key={i} className="bg-elevated rounded-2xl p-4 flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-surface text-primary flex items-center justify-center shrink-0">
                                      <Icon size={14} />
                                    </div>
                                    <span className="text-[13px] font-bold text-primary">{log.category}</span>
                                  </div>
                                  <GaugeBar score={log.score} max={log.max} />
                                </div>
                                <span className="text-[12px] text-secondary font-medium">{log.label}</span>
                                {log.data && (
                                  <span className="text-[11px] text-tertiary font-semibold tabular-nums">
                                    실데이터: {log.data}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-4 border-t border-border flex justify-center">
            <button
              type="button"
              onClick={() => vm.setIsValuationModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3 bg-[#eff1f5] hover:bg-slate-200 dark:bg-[#1e2532] dark:hover:bg-[#252c3d] text-primary text-[13.5px] font-bold rounded-xl border-none active:scale-[0.98] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Info size={15} className="text-secondary" />
              가치평가 상세분석 및 계산법 보기
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-elevated p-6 py-10 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-surface flex items-center justify-center text-tertiary">
            <Info size={20} className="text-tertiary" />
          </div>
          <div className="flex flex-col gap-1 max-w-sm">
            <h4 className="text-[15px] font-bold text-primary">가치평가 데이터 부족</h4>
            <p className="text-[13px] text-tertiary leading-relaxed font-medium break-keep">
              최근 실거래와 단지 평가 정보가 부족해 적정가를 계산하기 어렵습니다.
            </p>
          </div>
        </div>
      )}

      {/* Unified Valuation Modal (Elevated above MobileDock z-[10000] & ApartmentModal z-[10010]) */}
      {vm.isValuationModalOpen && (
        <div
          data-scroll-interactive="true"
          role="dialog"
          aria-modal="true"
          aria-label="종합 가치평가 상세 분석"
          className="fixed inset-0 z-[11000] flex items-end sm:items-center justify-center p-0 sm:p-4 overscroll-none animate-in fade-in duration-200"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm border-none cursor-default"
            onClick={() => vm.setIsValuationModalOpen(false)}
            aria-label="가치평가 상세 분석 창 닫기"
          />
          <div className="relative w-full sm:w-[620px] bg-surface rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] sm:pb-6 shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col gap-5 sm:gap-6 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
            <div className="sm:hidden w-full -mt-1 flex justify-center shrink-0" aria-hidden="true">
              <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-body pb-3.5 sm:pb-4 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#eff1f5] dark:bg-[#1e2532] flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} className="text-primary" />
                </div>
                <h3 className="text-[16.5px] sm:text-[18px] font-extrabold text-primary tracking-tight truncate">종합 가치평가 상세 분석</h3>
              </div>
              <button
                type="button"
                aria-label="가치평가 상세 분석 닫기"
                onClick={() => vm.setIsValuationModalOpen(false)}
                className="w-9 h-9 inline-flex items-center justify-center hover:bg-body rounded-full transition-colors active:scale-95 cursor-pointer shrink-0 touch-manipulation"
              >
                <X size={20} className="text-tertiary" />
              </button>
            </div>

            {/* Scroll Container */}
            <div className="flex-1 overflow-y-auto overscroll-contain pr-1 flex flex-col gap-6 scrollbar-thin">
              {/* Part 1: DCF Formula */}
              {vm.txStats.realEstatePER > 0 && (
                <div className="flex flex-col gap-4">
                  <h4 className="text-[15px] font-extrabold text-primary flex items-center gap-1.5">
                    <span className="w-1.5 h-3.5 bg-primary rounded-full inline-block" />
                    1. 적정 집값 계산법 (수익환원법)
                  </h4>

                  <div className="bg-body rounded-2xl p-4 border border-border">
                    <div className="text-[13.5px] font-extrabold text-primary mb-2">
                      적정 집값 = 1년 예상 월세 ÷ 은행 예금이자
                    </div>
                    <p className="text-[12.5px] text-secondary leading-relaxed font-medium">
                      이 아파트를 매수하는 대신 그 돈을 은행에 넣었을 때 받을 수 있는 이자와, 이 아파트에서 발생하는 임대 가치(전세 기반 가상 월세)를 비교해 적정 가격을 계산합니다.
                    </p>
                  </div>

                  <div className="flex flex-col gap-4 bg-body/30 rounded-2xl p-4 border border-border/60">
                    <div className="flex gap-3 items-start">
                      <div className="w-5 h-5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5 shadow-sm">1</div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[13px] font-extrabold text-primary">목표수익 기준 설정 (할인율 r: {vm.dcf.discountRate.toFixed(2)}%)</span>
                        <span className="text-[12px] text-secondary font-medium leading-relaxed">
                          은행 예금 금리({vm.macroConfig.riskFreeRate.toFixed(2)}%)에 부동산 투자 위험 리스크(1.50%) 및 조달 페널티를 더해 최소한의 이율 기준을 수립합니다.
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start">
                      <div className="w-5 h-5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5 shadow-sm">2</div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[13px] font-extrabold text-primary">예상 월세 도출 (전환율: {(vm.dynamicConversionRate * 100).toFixed(1)}%)</span>
                        <span className="text-[12px] text-secondary font-medium leading-relaxed">
                          최근 3개월 평균 전세가({vm.formatPrice(vm.txStats.avg3MRent)})에 입지 특성이 반영된 전월세 전환율을 적용하여 1년간 얻을 수 있는 가치로 환산합니다.
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start">
                      <div className="w-5 h-5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5 shadow-sm">3</div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[13px] font-extrabold text-primary">적정가 산정 및 성장률 반영 (장기 성장률 g: {vm.dcf.growthRate.toFixed(2)}%)</span>
                        <span className="text-[12px] text-secondary font-medium leading-relaxed">
                          물가상승률(2.0%)에 아래 <strong className="font-extrabold text-primary">단지 가치평가(Utility Score)</strong> 점수에 따른 가산율을 조합하여 매년 집값의 장기 가치 성장 잠재력을 산정합니다.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {vm.txStats.realEstatePER > 0 && <hr className="border-border/60" />}

              {/* Part 2: Utility Score Detailed Items */}
              {vm.utilityScoreResult.total > 0 && (
                <div className="flex flex-col gap-4">
                  <h4 className="text-[15px] font-extrabold text-primary flex items-center gap-1.5">
                    <span className="w-1.5 h-3.5 bg-primary rounded-full inline-block" />
                    2. 단지 상품성 & 인프라 가치평가 (Utility Score)
                  </h4>

                  <div className="bg-body rounded-2xl p-4 border border-border flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1 shrink-0 tabular-nums">
                      <div className="flex items-baseline gap-1">
                        <span className="text-[28px] font-black text-primary leading-none">{vm.utilityScoreResult.total}</span>
                        <span className="text-[12px] text-tertiary font-bold">/ {vm.utilityScoreResult.maxTotal}점</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold w-fit shadow-xs ${
                        vm.utilityScoreResult.total >= 130
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-black'
                          : 'bg-[#eff1f5] dark:bg-[#1e2532] text-secondary'
                      }`}>
                        {vm.utilityScoreResult.total >= 130 ? '최우수 단지' : vm.utilityScoreResult.total >= 100 ? '우수 단지' : '표준 단지'}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-secondary leading-relaxed font-semibold">
                      {vm.utilityScoreResult.total >= 130
                        ? '동탄 내 최상위권의 상품성과 초역세권 입지로 장기 성장률 프리미엄이 반영됩니다.'
                        : vm.utilityScoreResult.total >= 100
                        ? '준수한 스펙과 생활 인프라로 시장 평균 수준의 성장률이 안정적으로 적용됩니다.'
                        : '단지 규모나 연식 등의 제한으로 평균보다 다소 보수적인 성장률이 적용됩니다.'}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3.5 border border-border/50 rounded-2xl p-3 bg-body/10">
                    {vm.utilityScoreResult.logs.map((log, i) => {
                      const Icon = iconMap[log.iconKey] || Award;
                      return (
                        <div key={i} className="flex gap-3.5 items-start p-3 bg-surface hover:bg-body/35 rounded-xl border border-border/40 transition-colors">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#eff1f5] dark:bg-[#1e2532] text-primary">
                            <Icon size={16} />
                          </div>
                          <div className="flex flex-col gap-1 w-full">
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] font-bold text-primary">{log.category}</span>
                              <div className="flex items-baseline gap-0.5 tabular-nums">
                                <span className="text-[13px] font-extrabold text-secondary">{log.score}</span>
                                <span className="text-[10px] text-tertiary font-medium">/ {log.max}점</span>
                              </div>
                            </div>
                            <span className="text-[12px] text-secondary font-medium pl-0.5">{log.label}</span>
                            {log.data && (
                              <span className="text-[11px] text-secondary font-semibold mt-1 px-2.5 py-0.5 bg-[#eff1f5] dark:bg-[#1e2532] rounded w-fit ml-0.5 tabular-nums">
                                실데이터: {log.data}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {vm.txStats.realEstatePER > 0 && <hr className="border-border/60" />}

              {/* Part 3: PER Range Guides */}
              {vm.txStats.realEstatePER > 0 && (
                <div className="flex flex-col gap-4">
                  <h4 className="text-[15px] font-extrabold text-primary flex items-center gap-1.5">
                    <span className="w-1.5 h-3.5 bg-primary rounded-full inline-block" />
                    3. 매매가 ÷ 전세가 배수 기준 (PER 구간 가이드)
                  </h4>

                  <div className="flex flex-col gap-4">
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-brand-green mt-2 shrink-0" />
                      <div>
                        <div className="text-[13px] font-bold text-primary flex items-center gap-1.5">
                          안전구간 (1.4배 미만) <span className="text-[11px] text-tertiary font-normal">(전세가율 71% 이상)</span>
                        </div>
                        <div className="text-[12px] text-secondary mt-1 leading-relaxed font-medium">
                          <b className="text-brand-green font-bold">집값이 떨어질 위험이 상대적으로 낮습니다.</b> 실거주 인기가 높아 매매가와 전세가 차이가 적고, 실수요 가격 지지층이 매우 튼튼한 단지입니다.
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-brand-green mt-2 shrink-0" />
                      <div>
                        <div className="text-[13px] font-bold text-primary flex items-center gap-1.5">
                          안정구간 (1.4배 ~ 1.6배) <span className="text-[11px] text-tertiary font-normal">(전세가율 62~71%)</span>
                        </div>
                        <div className="text-[12px] text-secondary mt-1 leading-relaxed font-medium">
                          <b className="text-brand-green font-bold">가격이 든든하게 방어됩니다.</b> 경제가 흔들려도 집값이 잘 버티는 편이며, 사람들이 실제로 살고 싶어 하는 수요가 가격을 탄탄하게 받쳐줍니다.
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-slate-500 mt-2 shrink-0" />
                      <div>
                        <div className="text-[13px] font-bold text-primary flex items-center gap-1.5">
                          평균구간 (1.6배 ~ 1.8배) <span className="text-[11px] text-tertiary font-normal">(전세가율 55~62%)</span>
                        </div>
                        <div className="text-[12px] text-secondary mt-1 leading-relaxed font-medium">
                          <b className="text-primary font-bold">시장의 딱 중간 수준입니다.</b> 수도권 아파트들이 일반적으로 가지고 있는 생활 인프라와 사람들의 평범한 선호도가 그대로 반영된 상태입니다.
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-brand-blue mt-2 shrink-0" />
                      <div>
                        <div className="text-[13px] font-bold text-primary flex items-center gap-1.5">
                          성장구간 (1.8배 ~ 2.2배) <span className="text-[11px] text-tertiary font-normal">(전세가율 45~55%)</span>
                        </div>
                        <div className="text-[12px] text-secondary mt-1 leading-relaxed font-medium">
                          <b className="text-brand-blue font-bold">미래에 대한 기대감이 섞여있습니다.</b> 뛰어난 학군이나 새로운 교통망 등 좋은 입지 조건 때문에 나중에 집값이 오를 것이란 기대가 이미 가격에 포함되어 있습니다.
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-brand-red mt-2 shrink-0" />
                      <div>
                        <div className="text-[13px] font-bold text-primary flex items-center gap-1.5">
                          미래선반영구간 (2.2배 초과) <span className="text-[11px] text-tertiary font-normal">(전세가율 45% 미만)</span>
                        </div>
                        <div className="text-[12px] text-secondary mt-1 leading-relaxed font-medium">
                          <b className="text-brand-red font-bold">미래 개발 가치에 대한 기대감이 집중된 곳입니다.</b> 재건축이나 대형 개발 호재를 반영하여, 현재 실거주 편익보다 미래의 희소가치에 가격이 맞춰져 있습니다.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 p-4 rounded-xl bg-brand-red-light border border-brand-red/20">
                    <div className="text-[13px] font-extrabold text-brand-red mb-2 flex items-center gap-2">
                      <Info size={14} strokeWidth={2.5} />
                      주의해야 할 숨은 위험
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-[12px] text-secondary leading-relaxed">
                        <b className="text-brand-red font-bold">안전구간의 함정:</b> 전세가율이 높은 단지는 경제 상황 악화로 전세가가 하락할 때 임대인이 임대보증금을 원활하게 반환하지 못하는 역전세나 깡통전세 위험이 숨어 있습니다.
                      </p>
                      <p className="text-[12px] text-secondary leading-relaxed">
                        <b className="text-brand-red font-bold">미래선반영구간의 함정:</b> 은행 금리가 크게 오르면, 빚을 낸 실수요자나 투자자들의 이자 부담이 커지고 미리 반영되어 있던 기대감(거품)이 사라지면서 집값이 가장 가파르게 떨어질 수 있습니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Button */}
            <div className="mt-auto pt-4 border-t border-border shrink-0">
              <button
                onClick={() => vm.setIsValuationModalOpen(false)}
                className="w-full py-4 rounded-2xl font-extrabold text-[15px] bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 active:scale-[0.98] transition-all cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

AdvancedValuationMetrics.displayName = 'AdvancedValuationMetrics';
export default AdvancedValuationMetrics;
