'use client';

import React from 'react';
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

  let colorClassText = 'text-toss-red';
  let colorClassBg = 'bg-toss-red';

  if (percent >= 80) {
    colorClassText = 'text-toss-green';
    colorClassBg = 'bg-toss-green';
  } else if (percent >= 50) {
    colorClassText = 'text-toss-blue';
    colorClassBg = 'bg-toss-blue';
  } else if (percent >= 30) {
    colorClassText = 'text-[#f59e0b]';
    colorClassBg = 'bg-[#f59e0b]';
  }

  return (
    <div className="flex flex-col gap-1.5 w-[90px] shrink-0">
      <div className="flex justify-end items-baseline gap-1">
        <span className={`text-[14px] font-extrabold ${colorClassText}`}>{score}</span>
        <span className="text-[10px] text-tertiary font-medium">/ {max}</span>
      </div>
      <div className="w-full h-1.5 bg-body rounded-full overflow-hidden">
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
      <h2 className="text-[20px] font-bold text-primary flex items-center gap-2">
        <Target size={22} className="text-toss-blue" strokeWidth={2.5} />
        밸류에이션 분석
      </h2>

      {vm.hasData ? (
        <div className="bg-surface border border-border rounded-3xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          {/* Card Title */}
          <div className="p-6 border-b border-body bg-body/20">
            <h3 className="text-[16px] font-black text-primary flex items-center gap-2">
              <ShieldCheck size={18} className="text-toss-blue" />
              D-VIEW 종합 가치평가 대시보드
            </h3>
            <p className="text-[12px] text-tertiary mt-1 font-medium">
              실거래 배수(PER), 금리 연동 적정가(DCF), 상품성 점수(Utility Score)를 종합 분석한 결과입니다.
            </p>
          </div>

          <div className="divide-y divide-body">
            {/* Section 1: 실거래가 & PER 배수 */}
            {vm.txStats.realEstatePER > 0 ? (
              <div className="p-6">
                <h4 className="text-[14.5px] md:text-[15px] font-extrabold text-primary mb-4 flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-toss-blue rounded-full inline-block" />
                  1. 실거래 배수 분석 (PER)
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* 1단: 기준 실거래 데이터 */}
                  <div className="flex flex-col justify-center">
                    <div className="bg-body border border-border rounded-2xl p-5 flex flex-col justify-center gap-4 h-full">
                      <h5 className="text-[13.5px] font-extrabold text-secondary">기준 실거래 데이터</h5>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[12.5px] md:text-[13px] text-secondary font-bold">3개월 평균 매매가</span>
                          <span className="text-[14px] md:text-[14.5px] font-extrabold text-primary">{vm.formatPrice(vm.txStats.avg3MSale)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[12.5px] md:text-[13px] text-secondary font-bold">3개월 평균 전세가</span>
                          <span className="text-[14px] md:text-[14.5px] font-extrabold text-emerald-700 dark:text-toss-blue">{vm.formatPrice(vm.txStats.avg3MRent)}</span>
                        </div>
                        <div className="h-px w-full bg-border/60 my-0.5" />
                        <div className="flex items-center justify-between">
                          <span className="text-[12.5px] md:text-[13px] text-secondary font-bold">도출된 전세가율</span>
                          <span className="text-[13.5px] md:text-[14px] font-extrabold text-primary bg-surface px-2 py-0.5 rounded shadow-sm border border-border">
                            {vm.txStats.jeonseRatio > 0 ? `${vm.txStats.jeonseRatio.toFixed(1)}%` : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2단: 실구매 차액(GAP) 분석 */}
                  <div className="flex flex-col justify-center">
                    <div className="bg-body border border-border rounded-2xl p-5 flex flex-col justify-center gap-4 h-full">
                      <h5 className="text-[13.5px] font-extrabold text-secondary flex items-center gap-1.5">
                        <TrendingUp size={15} className="text-toss-blue" />
                        실구매 차액(GAP) 분석
                      </h5>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[12.5px] md:text-[13px] text-secondary font-bold">현재 구매 차액 (매매-전세)</span>
                          <span className="text-[14px] md:text-[14.5px] font-extrabold text-primary">{vm.formatPrice(vm.txStats.currentGap)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[12.5px] md:text-[13px] text-secondary font-bold">1년 전 평균 차액</span>
                          <span className="text-[14px] md:text-[14.5px] font-bold text-tertiary">
                            {vm.txStats.gap1YearAgo !== null ? vm.formatPrice(vm.txStats.gap1YearAgo) : '데이터 부족'}
                          </span>
                        </div>
                        <div className="h-px w-full bg-border/60 my-0.5" />
                        <div className="flex items-center justify-between">
                          <span className="text-[12.5px] md:text-[13px] text-secondary font-bold">차액 변동 트렌드</span>
                          {vm.txStats.gapDelta !== null ? (
                            <span className={`text-[11px] md:text-[11.5px] font-extrabold px-2 py-0.5 rounded shadow-sm border inline-flex items-center gap-1 ${
                              vm.txStats.gapDelta < 0
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                : vm.txStats.gapDelta > 0
                                ? 'bg-red-500/10 text-red-600 border-red-500/20'
                                : 'bg-slate-500/10 text-slate-600 border-slate-500/20'
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
                            <span className="text-[11.5px] text-tertiary">-</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3단: PER 지표 및 AI 진단 */}
                  <div className="flex flex-col justify-center">
                    <div className="bg-body border border-border rounded-2xl p-5 flex flex-col justify-between h-full">
                      <div className="flex flex-col items-center justify-center pb-2">
                        <button
                          type="button"
                          className="text-[11px] font-bold text-tertiary mb-0.5 cursor-pointer hover:text-secondary transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-toss-blue rounded"
                          onClick={() => vm.setIsValuationModalOpen(true)}
                          aria-label="매매가 ÷ 전세가 배수 도움말 모달 열기"
                        >
                          매매가 ÷ 전세가 배수
                        </button>
                        <div className="flex items-end gap-1">
                          <span className="text-[36px] font-black text-primary leading-none tracking-tighter">
                            {vm.txStats.realEstatePER.toFixed(2)}
                          </span>
                          <span className="text-[14px] font-extrabold text-tertiary mb-0.5">배</span>
                        </div>
                      </div>

                      {/* Status Alert */}
                      <div className={`p-3 rounded-xl border flex gap-2 items-start mb-2 ${vm.perStatus.statusBg}`}>
                        <StatusIcon size={16} className={`${vm.perStatus.statusColor} shrink-0 mt-0.5`} />
                        <div className="flex flex-col gap-0.5">
                          <h5 className={`text-[12.5px] font-extrabold ${vm.perStatus.statusColor}`}>{vm.perStatus.statusText}</h5>
                          <p className="text-[11.5px] text-secondary leading-normal font-medium whitespace-pre-line">
                            {vm.perStatus.descriptionText}
                          </p>
                        </div>
                      </div>

                      {/* AI 진단 코멘트 */}
                      <div className="text-[11px] font-bold text-secondary bg-body p-2.5 rounded-xl border border-border/40 leading-relaxed break-keep">
                        <span className="text-blue-600 dark:text-blue-400 font-extrabold mr-1 inline-flex items-center gap-1">
                          <Sparkles size={13} className="text-emerald-500 shrink-0" />
                          <span>D-VIEW AI 진단:</span>
                        </span>
                        {vm.txStats.jeonseRatio >= 75 ? (
                          '매매가와 전세가 차이가 매우 좁아 실구매 부담은 적으나, 깡통전세 및 역전세 발생 리스크가 큰 단지입니다. 임차 시 보증보험 확인이 반드시 필요합니다.'
                        ) : vm.txStats.jeonseRatio >= 65 ? (
                          '실수요 가격 지지층이 튼튼하여 안정적인 실수요 가격 지지력을 갖춘 안심 단지입니다.'
                        ) : vm.txStats.jeonseRatio >= 55 ? (
                          '보편적인 수준의 전세가 비율이며, 단기 시세 상승보다는 실거주 선호도에 기반한 장기 안정을 권장합니다.'
                        ) : (
                          '매매가에 미래 기대 가치가 크게 선반영되어 매매-전세 차액 대비 주거 안정성 확보 비용이 높을 수 있습니다.'
                        )}
                      </div>
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
              <div className="p-6 border-t border-body">
                <h4 className="text-[14.5px] md:text-[15px] font-extrabold text-primary mb-4 flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-[#4196f7] rounded-full inline-block" />
                  교통 입지 가치 및 핵심지 출퇴근 시뮬레이터
                </h4>

                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left: Destination tabs & Details */}
                  <div className="flex-1 flex flex-col gap-4">
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

                    <div className="bg-body border border-border rounded-2xl p-5 flex flex-col gap-3.5">
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
                      <div className="flex items-baseline gap-1">
                        <span className="text-[40px] font-black text-primary leading-none tracking-tighter">
                          {vm.commuteAnalysis.totalTime}
                        </span>
                        <span className="text-[16px] font-extrabold text-tertiary">분</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-body/20 flex flex-col gap-1.5">
                      <h5 className="text-[13px] font-extrabold text-secondary">출퇴근 입지 프리미엄</h5>
                      <div className="text-[12.5px] text-secondary leading-relaxed font-semibold break-keep">
                        {vm.commuteAnalysis.savedTime > 0 ? (
                          <span className="text-toss-green">
                            대중교통 60분 기준선 대비 {vm.commuteAnalysis.savedTime}분 단축! DCF 성장률 프리미엄 +{vm.commuteAnalysis.premium.toFixed(3)}%p가 가산되어 자산 가치를 견인합니다.
                          </span>
                        ) : (
                          <span className="text-tertiary">
                            소요 시간이 60분을 상회하여 자산 가치에 추가 교통 프리미엄이 부여되지 않습니다.
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={vm.handleCopyCommute}
                      className={`w-full py-2.5 rounded-xl font-bold text-[12.5px] transition-all text-center cursor-pointer border ${
                        vm.isCopiedCommute
                          ? 'bg-emerald-50 border-emerald-500/30 text-emerald-600'
                          : 'bg-[#f2f4f6] border-border/20 text-secondary hover:bg-[#e5e8eb]'
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
              <div className="p-6">
                <h4 className="text-[14.5px] md:text-[15px] font-extrabold text-primary mb-4 flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-toss-green rounded-full inline-block" />
                  2. 금리로 계산한 적정 집값 (DCF)
                </h4>
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left: Steps 1-5 */}
                  <div className="flex-1 flex flex-col justify-start">
                    <h5 className="text-[13px] md:text-[13.5px] font-extrabold text-secondary mb-4 ml-1">적용 수식 및 산출 근거</h5>
                    <div className="flex flex-col gap-3.5 relative pl-5 border-l-2 border-border/70 ml-2.5">
                      {/* Step 1 */}
                      <div className="relative">
                        <div className="absolute -left-[27px] top-[16px] w-3 h-3 rounded-full bg-toss-green border-2 border-surface dark:border-surface" />
                        <div className="bg-body/45 dark:bg-slate-800/20 border border-border/60 rounded-xl p-3.5 flex flex-col gap-1 hover:bg-body/60 dark:hover:bg-slate-800/30 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-[12.5px] md:text-[13px] text-secondary font-bold">Step 1. 연간 예상 임대 가치 (Annual Rent)</span>
                            <span className="text-[14px] font-extrabold text-primary">{vm.formatPrice(vm.txStats.avg3MRent * vm.effectiveConversionRate)}</span>
                          </div>
                          <div className="text-[11.5px] md:text-[12px] text-tertiary leading-relaxed">
                            평균 전세 {vm.formatPrice(vm.txStats.avg3MRent)} × 동적 전환율 {(vm.effectiveConversionRate * 100).toFixed(2)}%
                            <span className="text-toss-blue dark:text-toss-blue block font-semibold mt-0.5">(기준금리 및 시장 변동성 연동 보정)</span>
                            {vm.spreadReasons.length > 0 && (
                              <span className="text-toss-blue dark:text-toss-blue block font-semibold mt-0.5">({vm.spreadReasons.join(', ')})</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="relative">
                        <div className="absolute -left-[27px] top-[16px] w-3 h-3 rounded-full bg-toss-green border-2 border-surface dark:border-surface" />
                        <div className="bg-body/45 dark:bg-slate-800/20 border border-border/60 rounded-xl p-3.5 flex flex-col gap-1 hover:bg-body/60 dark:hover:bg-slate-800/30 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-[12.5px] md:text-[13px] text-secondary font-bold">Step 2. 기본 투자 요구 이자율 (할인율 r)</span>
                            <span className="text-[14px] font-extrabold text-primary">{vm.dcf.discountRate.toFixed(2)}%</span>
                          </div>
                          <div className="text-[11.5px] md:text-[12px] text-tertiary leading-relaxed">
                            국고채 {vm.macroConfig.riskFreeRate.toFixed(2)}% + 동적 리스크 {((vm.dcf.dynamicPremium ?? 1.5).toFixed(2))}% <span className="text-tertiary font-normal">(연식/규모 반영)</span> + 조달 스프레드 {Math.max(0, vm.computedFundingSpread).toFixed(2)}%
                          </div>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="relative">
                        <div className="absolute -left-[27px] top-[16px] w-3 h-3 rounded-full bg-toss-green border-2 border-surface dark:border-surface" />
                        <div className="bg-body/45 dark:bg-slate-800/20 border border-border/60 rounded-xl p-3.5 flex flex-col gap-1 hover:bg-body/60 dark:hover:bg-slate-800/30 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-[12.5px] md:text-[13px] text-secondary font-bold">Step 3. 장기 집값 상승 기대치 (성장률 g)</span>
                            <span className="text-[14px] font-extrabold text-primary">{vm.dcf.growthRate.toFixed(2)}%</span>
                          </div>
                          <div className="text-[11.5px] md:text-[12px] text-tertiary leading-relaxed">
                            물가({((vm.macroConfig.baseInflationRate <= 0.1 ? vm.macroConfig.baseInflationRate * 100 : vm.macroConfig.baseInflationRate)).toFixed(1)}%) + 단지 가치(+{((vm.utilityScoreResult.total * 0.01)).toFixed(2)}%p) + 입지 가중(+{Math.max(0, vm.dcf.growthRate - (vm.macroConfig.baseInflationRate <= 0.1 ? vm.macroConfig.baseInflationRate * 100 : vm.macroConfig.baseInflationRate) - vm.utilityScoreResult.total * 0.01).toFixed(2)}%p)
                          </div>
                        </div>
                      </div>

                      {/* Step 4 */}
                      <div className="relative">
                        <div className="absolute -left-[27px] top-[16px] w-3 h-3 rounded-full bg-toss-green border-2 border-surface dark:border-surface" />
                        <div className="bg-body/45 dark:bg-slate-800/20 border border-border/60 rounded-xl p-3.5 flex flex-col gap-1 hover:bg-body/60 dark:hover:bg-slate-800/30 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-[12.5px] md:text-[13px] text-secondary font-bold">Step 4. 순수 자본환원율 (Cap Rate: r - g)</span>
                            <span className="text-[14px] font-extrabold text-primary">{vm.dcf.capRate.toFixed(2)}%</span>
                          </div>
                          <div className="text-[11.5px] md:text-[12px] text-tertiary leading-relaxed">
                            할인율({vm.dcf.discountRate.toFixed(2)}%) - 성장률({vm.dcf.growthRate.toFixed(2)}%) = {(vm.dcf.capRate / 100).toFixed(4)}
                          </div>
                        </div>
                      </div>

                      {/* Step 5 */}
                      <div className="relative">
                        <div className="absolute -left-[27px] top-[16px] w-3 h-3 rounded-full bg-toss-green border-2 border-surface dark:border-surface" />
                        <div className="bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[12.5px] md:text-[13px] text-emerald-800 dark:text-emerald-300 font-bold">Step 5. 최종 도출된 이론 적정가</span>
                            <span className="text-[15px] font-black text-emerald-700 dark:text-emerald-400">{vm.formatPrice(vm.dcf.impliedValue)}</span>
                          </div>
                          <div className="text-[11.5px] md:text-[12px] text-secondary leading-relaxed">
                            연간 임대료({vm.formatPrice(vm.txStats.avg3MRent * vm.effectiveConversionRate)}) ÷ Cap Rate({vm.dcf.capRate.toFixed(2)}%)
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Comparison with Market Price */}
                  <div className="flex-1 flex flex-col justify-start">
                    <h5 className="text-[13px] md:text-[13.5px] font-extrabold text-secondary mb-4 ml-1">적정가 vs 시장 실거래가 대조</h5>
                    <div className="bg-body border border-border rounded-2xl p-5 flex flex-col gap-4 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-bold text-secondary">수익환원법 적정가 (DCF)</span>
                        <span className="text-[20px] font-black text-emerald-600 dark:text-emerald-400">{vm.formatPrice(vm.dcf.impliedValue)}</span>
                      </div>
                      <div className="h-px bg-border/40" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
                        {vm.txStats.avg1MSale > 0 && (
                          <div className={`flex flex-col items-center justify-between p-4 rounded-xl shadow-xs border ${
                            vm.diff1M.isOver
                              ? 'bg-red-500/5 dark:bg-red-950/10 border-red-500/20'
                              : 'bg-emerald-500/5 dark:bg-emerald-950/10 border-emerald-500/20'
                          }`}>
                            <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-secondary mb-2.5 text-center break-keep">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${vm.diff1M.isOver ? 'bg-red-500' : 'bg-emerald-500'}`} />
                              <span>기준가 (1개월): <strong>{vm.formatPrice(vm.txStats.avg1MSale)}</strong></span>
                            </div>
                            <div className={`w-full py-1.5 rounded-lg text-[12.5px] font-extrabold shadow-xs text-center break-keep ${
                              vm.diff1M.isOver ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}>
                              적정가 대비 {vm.diff1M.percent.toFixed(1)}% ({vm.formatPrice(vm.diff1M.amount)}) {vm.diff1M.isOver ? '고평가' : '저평가'}
                            </div>
                          </div>
                        )}

                        {vm.txStats.avg3MSale > 0 && (
                          <div className={`flex flex-col items-center justify-between p-4 rounded-xl shadow-xs border ${
                            vm.diff3M.isOver
                              ? 'bg-red-500/5 dark:bg-red-950/10 border-red-500/20'
                              : 'bg-emerald-500/5 dark:bg-emerald-950/10 border-emerald-500/20'
                          }`}>
                            <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-secondary mb-2.5 text-center break-keep">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${vm.diff3M.isOver ? 'bg-red-500' : 'bg-emerald-500'}`} />
                              <span>기준가 (3개월): <strong>{vm.formatPrice(vm.txStats.avg3MSale)}</strong></span>
                            </div>
                            <div className={`w-full py-1.5 rounded-lg text-[12.5px] font-extrabold shadow-xs text-center break-keep ${
                              vm.diff3M.isOver ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
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
              <div className="p-6 text-center text-tertiary text-[13px]">
                실거래 데이터 부족으로 적정 집값 산출을 제공하지 않습니다.
              </div>
            )}

            {/* Section 3: 거시경제 시나리오 시뮬레이터 & 실구매 부담 분석 */}
            {vm.txStats.realEstatePER > 0 && (
              <div className="p-6">
                <h4 className="text-[14.5px] md:text-[15px] font-extrabold text-primary mb-4 flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-toss-blue rounded-full inline-block" />
                  3. 거시경제 시나리오 시뮬레이터 & 실구매 부담 분석
                </h4>

                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left: Sliders */}
                  <div className="flex-1 flex flex-col gap-5 bg-body border border-border rounded-2xl p-5">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[13px] font-extrabold text-secondary">
                        <span>기준금리 시나리오</span>
                        <span className="text-toss-blue">{vm.simBaseRate.toFixed(2)}%</span>
                      </div>
                      <input
                        type="range"
                        min="1.00"
                        max="5.00"
                        step="0.25"
                        value={vm.simBaseRate}
                        onChange={(e) => vm.setSimBaseRate(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-[#e5e8eb] rounded-lg appearance-none cursor-pointer accent-toss-blue"
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
                        <span className="text-toss-blue">{vm.simGrowthRate.toFixed(1)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="5.0"
                        step="0.1"
                        value={vm.simGrowthRate}
                        onChange={(e) => vm.setSimGrowthRate(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-[#e5e8eb] rounded-lg appearance-none cursor-pointer accent-toss-blue"
                        aria-label="기대상승률 시나리오"
                      />
                      <div className="flex justify-between text-[11px] text-tertiary font-medium">
                        <span>보수적 (0.0%)</span>
                        <span>기본 ({vm.dcf.growthRate.toFixed(1)}%)</span>
                        <span>긍정적 (5.0%)</span>
                      </div>
                    </div>

                    <div className="h-px bg-border/40 my-1" />

                    <div className="flex flex-col gap-1">
                      <span className="text-[12px] text-secondary font-extrabold">시나리오 기본 논리</span>
                      <p className="text-[11.5px] text-tertiary leading-relaxed font-medium">
                        금리 하락 시 전세대출 유동성이 증가하여 전세가가 상승하고, 할인율이 낮아져 자산 적정가가 크게 오릅니다. 반대로 금리 상승 시에는 적정가가 조정을 받으며 필요한 매매-전세 차액(실구매 부담)이 늘어납니다.
                      </p>
                    </div>
                  </div>

                  {/* Right: Simulation Cards */}
                  <div className="flex-1 flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-body border border-border rounded-2xl p-4 flex flex-col gap-1.5">
                        <span className="text-[12px] font-extrabold text-secondary">시뮬레이션 적정가</span>
                        <span className="text-[18px] font-black text-primary">
                          {vm.formatPrice(vm.simulatedDCF.impliedValue)}
                        </span>
                        {vm.dcf.impliedValue > 0 && (
                          <span className={`text-[11.5px] font-bold ${
                            vm.simulatedDCF.impliedValue > vm.dcf.impliedValue ? 'text-toss-green' : vm.simulatedDCF.impliedValue < vm.dcf.impliedValue ? 'text-toss-red' : 'text-secondary'
                          }`}>
                            {vm.simulatedDCF.impliedValue > vm.dcf.impliedValue ? '+' : ''}
                            {(((vm.simulatedDCF.impliedValue - vm.dcf.impliedValue) / vm.dcf.impliedValue) * 100).toFixed(1)}% 변동
                          </span>
                        )}
                      </div>

                      <div className="bg-body border border-border rounded-2xl p-4 flex flex-col gap-1.5">
                        <span className="text-[12px] font-extrabold text-secondary">시뮬레이션 전세가</span>
                        <span className="text-[18px] font-black text-toss-blue">
                          {vm.formatPrice(vm.simulatedDCF.simJeonsePrice)}
                        </span>
                        <span className="text-[11.5px] text-tertiary font-bold">
                          전세가율 {vm.simulatedDCF.simJeonseRatio.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="bg-body border border-border rounded-2xl p-4 flex flex-col gap-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[12.5px] font-extrabold text-secondary font-bold">매매-전세 차액(실구매 부담)</span>
                        <span className="text-[16px] font-black text-primary">
                          {vm.formatPrice(vm.simulatedDCF.simGap)}
                        </span>
                      </div>
                      <div className="h-px bg-border/40" />
                      <div className="flex justify-between items-center text-[12px]">
                        <span className="text-tertiary font-semibold">현재 대비 차액 변동</span>
                        {(() => {
                          const gapDiff = vm.simulatedDCF.simGap - vm.txStats.currentGap;
                          if (gapDiff < 0) {
                            return (
                              <span className="font-extrabold text-toss-green">
                                {vm.formatPrice(Math.abs(gapDiff))} 절감 (실구매 부담 감소)
                              </span>
                            );
                          } else if (gapDiff > 0) {
                            return (
                              <span className="font-extrabold text-toss-red">
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
                      className={`w-full py-3 rounded-xl font-extrabold text-[13.5px] transition-all text-center cursor-pointer border ${
                        vm.isCopiedScenario
                          ? 'bg-emerald-50 border-emerald-500/30 text-emerald-600'
                          : 'bg-[#f2f4f6] border-border/20 text-secondary hover:bg-[#e5e8eb]'
                      }`}
                    >
                      {vm.isCopiedScenario ? '시나리오 분석 보고서 복사 완료!' : '시나리오 분석 보고서 복사하기'}
                    </button>
                  </div>
                </div>

                {/* Sponsored Mortgage Banner */}
                <div className="mt-4 p-4 rounded-2xl border bg-body/30 border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <div className="text-[12px] font-extrabold text-tertiary">
                      [광고] D-VIEW 주택금융 파트너스 추천 대출
                    </div>
                    <div className="text-[13.5px] font-extrabold text-primary">
                      {vm.simBaseRate >= 3.25
                        ? '금리 상승기 추천: 고정금리 안심 전환대출'
                        : '금리 하락기 추천: 변동금리 최적화 대환대출'}
                    </div>
                    <p className="text-[11.5px] text-secondary font-medium">
                      {vm.simBaseRate >= 3.25
                        ? '금리 추가 인상 우려에 대비하여 향후 이자 부담을 고정형으로 동결하는 D-VIEW 단독 제휴 우대상품 (연 3.85%, 중도상환수수료 면제)'
                        : '금리 인하 기조의 혜택을 즉각 수혜받을 수 있는 신규 코픽스 연동형 대출 대환 특가 (연 3.45%, 중도상환수수료 면제)'}
                    </p>
                  </div>
                  <a
                    href="https://dview-loan.toss.im"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto text-center px-4 py-2.5 bg-blue-600 hover:bg-[#046c66] dark:bg-blue-600 dark:hover:bg-blue-500 text-surface font-extrabold text-[12.5px] rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
                  >
                    우대금리 조회하기
                  </a>
                </div>
              </div>
            )}

            {/* Section 4: 단지 상품성 & 인프라 가치평가 (Utility Score) */}
            {vm.utilityScoreResult.total > 0 && (
              <div id="utility-score-section" className="p-6 scroll-mt-20">
                <h4 className="text-[14.5px] md:text-[15px] font-extrabold text-primary mb-4 flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-[#f59e0b] rounded-full inline-block" />
                  4. 단지 상품성 & 인프라 가치평가 (Utility Score)
                </h4>
                <div className="flex flex-col md:flex-row items-stretch gap-6">
                  {/* Left: Score & Progress Bar */}
                  <div className="flex-1 flex flex-col justify-center items-center md:items-start bg-body border border-border rounded-2xl p-5 text-center md:text-left min-w-0">
                    <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider">종합 가치평가 점수</span>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-[44px] font-black text-blue-600 dark:text-blue-400 leading-none tracking-tight">
                        {vm.utilityScoreResult.total}
                      </span>
                      <span className="text-[14px] font-bold text-tertiary">/ {vm.utilityScoreResult.maxTotal}점</span>
                    </div>
                    <div className="w-full bg-[#e5e8eb] h-2.5 rounded-full mt-4 overflow-hidden">
                      <div
                        className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${(vm.utilityScoreResult.total / vm.utilityScoreResult.maxTotal) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Right: Explanation & Accordion Toggle */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-[12px] font-extrabold shadow-sm ${
                          vm.utilityScoreResult.total >= 130
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                            : vm.utilityScoreResult.total >= 100
                            ? 'bg-[#e6f3f0] dark:bg-blue-600/20 text-blue-600 dark:text-blue-400'
                            : 'bg-slate-100 text-blue-600'
                        }`}>
                          {vm.utilityScoreResult.total >= 130 ? '최우수 단지' : vm.utilityScoreResult.total >= 100 ? '우수 단지' : '표준 단지'}
                        </span>
                      </div>
                      <p className="text-[13px] md:text-[13.5px] text-secondary leading-relaxed font-semibold mt-1">
                        {vm.utilityScoreResult.total >= 130
                          ? '동탄 내 최상위권의 상품성과 초역세권 입지를 갖추어, 평균(2.0%)보다 높은 장기 성장률 프리미엄이 반영됩니다.'
                          : vm.utilityScoreResult.total >= 100
                          ? '준수한 단지 스펙과 생활 인프라를 갖추어, 시장 평균 수준의 성장률이 안정적으로 적용됩니다.'
                          : '단지 규모나 연식, 역세권 접근성 등의 제한으로 인해 평균보다 다소 보수적인 성장률이 적용됩니다.'}
                      </p>
                    </div>

                    <button
                      onClick={vm.handleScoreAccordionToggle}
                      className="mt-6 w-full p-4 rounded-xl border flex items-center justify-between bg-body hover:bg-body border-border transition-all active:scale-[0.99] group cursor-pointer"
                    >
                      <span className="text-[14px] font-extrabold text-secondary flex items-center gap-2">
                        <Info size={16} className="text-blue-600 dark:text-blue-400" />
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
                  <div className="mt-6 border-t border-border pt-6 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Specs */}
                      <div className="flex flex-col gap-4">
                        <h4 className="text-[13px] md:text-[13.5px] font-extrabold text-[#f59e0b] border-b border-border pb-2 flex items-center gap-1.5">
                          <Building size={16} />
                          단지 상품성 & 스펙 (4개 지표)
                        </h4>
                        <div className="flex flex-col gap-4">
                          {vm.utilityScoreResult.logs.filter(log => !log.isInfra).map((log, i) => {
                            const Icon = iconMap[log.iconKey] || Award;
                            return (
                              <div key={i} className="bg-body/40 border border-border/60 rounded-2xl p-4 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] flex items-center justify-center shrink-0">
                                      <Icon size={16} />
                                    </div>
                                    <span className="text-[13px] md:text-[13.5px] font-bold text-primary">{log.category}</span>
                                  </div>
                                  <GaugeBar score={log.score} max={log.max} />
                                </div>
                                <span className="text-[12px] md:text-[12.5px] text-secondary font-medium pl-1">{log.label}</span>
                                {log.data && (
                                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold mt-1 px-2.5 py-1 bg-blue-600/5 dark:bg-blue-400/10 rounded border border-blue-600/10 dark:border-blue-400/20 w-fit ml-1">
                                    실데이터: {log.data}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Infra */}
                      <div className="flex flex-col gap-4">
                        <h4 className="text-[13px] md:text-[13.5px] font-extrabold text-blue-600 dark:text-blue-400 border-b border-border pb-2 flex items-center gap-1.5">
                          <MapPin size={16} />
                          주변 인프라 & 교통 입지 (7개 지표)
                        </h4>
                        <div className="flex flex-col gap-4">
                          {vm.utilityScoreResult.logs.filter(log => log.isInfra).map((log, i) => {
                            const Icon = iconMap[log.iconKey] || MapPin;
                            return (
                              <div key={i} className="bg-body/40 border border-border/60 rounded-2xl p-4 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-600/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                      <Icon size={16} />
                                    </div>
                                    <span className="text-[13px] md:text-[13.5px] font-bold text-primary">{log.category}</span>
                                  </div>
                                  <GaugeBar score={log.score} max={log.max} />
                                </div>
                                <span className="text-[12px] md:text-[12.5px] text-secondary font-medium pl-1">{log.label}</span>
                                {log.data && (
                                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold mt-1 px-2.5 py-1 bg-blue-600/5 dark:bg-blue-400/10 rounded border border-blue-600/10 dark:border-blue-400/20 w-fit ml-1">
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
          <div className="p-5 bg-body/20 border-t border-border flex justify-center">
            <button
              onClick={() => vm.setIsValuationModalOpen(true)}
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-[#04635e] dark:bg-blue-600 dark:hover:bg-blue-700 text-surface text-[15px] font-extrabold rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Info size={16} />
              [ 가치평가 상세분석 및 계산법 보기 ]
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-border p-6 py-10 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-body border border-border flex items-center justify-center text-tertiary">
            <Info size={24} className="text-tertiary" />
          </div>
          <div className="flex flex-col gap-1 max-w-sm">
            <h4 className="text-[16px] font-extrabold text-primary">가치평가 데이터 부족</h4>
            <p className="text-[13px] text-tertiary leading-relaxed font-medium">
              최근 실거래 데이터 및 단지 평가 정보가 모두 부족하여 종합 밸류에이션 분석을 제공하기 어렵습니다.
            </p>
          </div>
        </div>
      )}

      {/* Unified Valuation Modal */}
      {vm.isValuationModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm border-none cursor-default"
            onClick={() => vm.setIsValuationModalOpen(false)}
            aria-label="가치평가 상세 분석 창 닫기"
          />
          <div className="relative w-full sm:w-[620px] bg-surface rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col gap-6 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-body pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-600/10 dark:bg-blue-400/10 flex items-center justify-center">
                  <ShieldCheck size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-[18px] font-extrabold text-primary tracking-tight">종합 가치평가 상세 분석</h3>
              </div>
              <button onClick={() => vm.setIsValuationModalOpen(false)} className="p-2 hover:bg-body rounded-full transition-colors active:scale-95 cursor-pointer">
                <X size={20} className="text-tertiary" />
              </button>
            </div>

            {/* Scroll Container */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-6 scrollbar-thin">
              {/* Part 1: DCF Formula */}
              {vm.txStats.realEstatePER > 0 && (
                <div className="flex flex-col gap-4">
                  <h4 className="text-[15px] font-extrabold text-primary flex items-center gap-1.5">
                    <span className="w-1.5 h-3.5 bg-toss-green rounded-full inline-block" />
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
                      <div className="w-5 h-5 rounded-full bg-blue-600 dark:bg-blue-500 text-surface flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5 shadow-sm">1</div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[13px] font-extrabold text-primary">목표수익 기준 설정 (할인율 r: {vm.dcf.discountRate.toFixed(2)}%)</span>
                        <span className="text-[12px] text-secondary font-medium leading-relaxed">
                          은행 예금 금리({vm.macroConfig.riskFreeRate.toFixed(2)}%)에 부동산 투자 위험 리스크(1.50%) 및 조달 페널티를 더해 최소한의 이율 기준을 수립합니다.
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start">
                      <div className="w-5 h-5 rounded-full bg-blue-600 dark:bg-blue-500 text-surface flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5 shadow-sm">2</div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[13px] font-extrabold text-primary">예상 월세 도출 (전환율: {(vm.dynamicConversionRate * 100).toFixed(1)}%)</span>
                        <span className="text-[12px] text-secondary font-medium leading-relaxed">
                          최근 3개월 평균 전세가({vm.formatPrice(vm.txStats.avg3MRent)})에 입지 특성이 반영된 전월세 전환율을 적용하여 1년간 얻을 수 있는 가치로 환산합니다.
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start">
                      <div className="w-5 h-5 rounded-full bg-blue-600 dark:bg-blue-500 text-surface flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5 shadow-sm">3</div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[13px] font-extrabold text-primary">적정가 산정 및 성장률 반영 (장기 성장률 g: {vm.dcf.growthRate.toFixed(2)}%)</span>
                        <span className="text-[12px] text-secondary font-medium leading-relaxed">
                          물가상승률(2.0%)에 아래 **단지 가치평가(Utility Score)** 점수에 따른 가산율을 조합하여 매년 집값의 장기 가치 성장 잠재력을 산정합니다.
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
                    <span className="w-1.5 h-3.5 bg-[#f59e0b] rounded-full inline-block" />
                    2. 단지 상품성 & 인프라 가치평가 (Utility Score)
                  </h4>

                  <div className="bg-body rounded-2xl p-4 border border-border flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1 shrink-0">
                      <div className="flex items-baseline gap-1">
                        <span className="text-[28px] font-black text-blue-600 dark:text-blue-400 leading-none">{vm.utilityScoreResult.total}</span>
                        <span className="text-[12px] text-tertiary font-bold">/ {vm.utilityScoreResult.maxTotal}점</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold w-fit shadow-sm ${
                        vm.utilityScoreResult.total >= 130
                          ? 'bg-[#e6f7f3] dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 font-black'
                          : vm.utilityScoreResult.total >= 100
                          ? 'bg-[#e6f7f3] dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400'
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
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${log.isInfra ? 'bg-blue-600/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400' : 'bg-[#f59e0b]/10 text-[#f59e0b]'}`}>
                            <Icon size={16} />
                          </div>
                          <div className="flex flex-col gap-1 w-full">
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] font-bold text-primary">{log.category}</span>
                              <div className="flex items-baseline gap-0.5">
                                <span className="text-[13px] font-extrabold text-secondary">{log.score}</span>
                                <span className="text-[10px] text-tertiary font-medium">/ {log.max}점</span>
                              </div>
                            </div>
                            <span className="text-[12px] text-secondary font-medium pl-0.5">{log.label}</span>
                            {log.data && (
                              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-1 px-2.5 py-0.5 bg-blue-600/5 dark:bg-blue-400/10 rounded border border-blue-600/10 dark:border-blue-400/20 w-fit ml-0.5">
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
                    <span className="w-1.5 h-3.5 bg-blue-600 dark:bg-blue-400 rounded-full inline-block" />
                    3. 매매가 ÷ 전세가 배수 기준 (PER 구간 가이드)
                  </h4>

                  <div className="flex flex-col gap-4">
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-toss-green mt-2 shrink-0" />
                      <div>
                        <div className="text-[13px] font-bold text-primary flex items-center gap-1.5">
                          안전구간 (1.4배 미만) <span className="text-[11px] text-tertiary font-normal">(전세가율 71% 이상)</span>
                        </div>
                        <div className="text-[12px] text-secondary mt-1 leading-relaxed font-medium">
                          <b className="text-toss-green font-bold">집값이 떨어질 위험이 상대적으로 낮습니다.</b> 실거주 인기가 높아 매매가와 전세가 차이가 적고, 실수요 가격 지지층이 매우 튼튼한 단지입니다.
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#10b981] mt-2 shrink-0" />
                      <div>
                        <div className="text-[13px] font-bold text-primary flex items-center gap-1.5">
                          안정구간 (1.4배 ~ 1.6배) <span className="text-[11px] text-tertiary font-normal">(전세가율 62~71%)</span>
                        </div>
                        <div className="text-[12px] text-secondary mt-1 leading-relaxed font-medium">
                          <b className="text-[#10b981] font-bold">가격이 든든하게 방어됩니다.</b> 경제가 흔들려도 집값이 잘 버티는 편이며, 사람들이 실제로 살고 싶어 하는 수요가 가격을 탄탄하게 받쳐줍니다.
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 mt-2 shrink-0" />
                      <div>
                        <div className="text-[13px] font-bold text-primary flex items-center gap-1.5">
                          평균구간 (1.6배 ~ 1.8배) <span className="text-[11px] text-tertiary font-normal">(전세가율 55~62%)</span>
                        </div>
                        <div className="text-[12px] text-secondary mt-1 leading-relaxed font-medium">
                          <b className="text-blue-600 dark:text-blue-400 font-bold">시장의 딱 중간 수준입니다.</b> 수도권 아파트들이 일반적으로 가지고 있는 생활 인프라와 사람들의 평범한 선호도가 그대로 반영된 상태입니다.
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#f59e0b] mt-2 shrink-0" />
                      <div>
                        <div className="text-[13px] font-bold text-primary flex items-center gap-1.5">
                          성장구간 (1.8배 ~ 2.2배) <span className="text-[11px] text-tertiary font-normal">(전세가율 45~55%)</span>
                        </div>
                        <div className="text-[12px] text-secondary mt-1 leading-relaxed font-medium">
                          <b className="text-[#f59e0b] font-bold">미래에 대한 기대감이 섞여있습니다.</b> 뛰어난 학군이나 새로운 교통망 등 좋은 입지 조건 때문에 나중에 집값이 오를 것이란 기대가 이미 가격에 포함되어 있습니다.
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-toss-red mt-2 shrink-0" />
                      <div>
                        <div className="text-[13px] font-bold text-primary flex items-center gap-1.5">
                          미래선반영구간 (2.2배 초과) <span className="text-[11px] text-tertiary font-normal">(전세가율 45% 미만)</span>
                        </div>
                        <div className="text-[12px] text-secondary mt-1 leading-relaxed font-medium">
                          <b className="text-toss-red font-bold">미래 개발 가치에 대한 기대감이 집중된 곳입니다.</b> 재건축이나 대형 개발 호재를 반영하여, 현재 실거주 편익보다 미래의 희소가치에 가격이 맞춰져 있습니다.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 p-4 rounded-xl bg-toss-red/5 border border-toss-red/20">
                    <div className="text-[13px] font-extrabold text-toss-red mb-2 flex items-center gap-2">
                      <Info size={14} strokeWidth={2.5} />
                      주의해야 할 숨은 위험
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-[12px] text-secondary leading-relaxed">
                        <b className="text-toss-red font-bold">안전구간의 함정:</b> 전세가율이 높은 단지는 경제 상황 악화로 전세가가 하락할 때 임대인이 임대보증금을 원활하게 반환하지 못하는 역전세나 깡통전세 위험이 숨어 있습니다.
                      </p>
                      <p className="text-[12px] text-secondary leading-relaxed">
                        <b className="text-toss-red font-bold">미래선반영구간의 함정:</b> 은행 금리가 크게 오르면, 빚을 낸 실수요자나 투자자들의 이자 부담이 커지고 미리 반영되어 있던 기대감(거품)이 사라지면서 집값이 가장 가파르게 떨어질 수 있습니다.
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
                className="w-full py-4 rounded-2xl font-extrabold text-[15px] bg-primary text-surface hover:bg-[#191f28] active:scale-[0.98] transition-all cursor-pointer"
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
