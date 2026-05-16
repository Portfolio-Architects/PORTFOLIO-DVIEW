'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Target, Building, Info, ChevronDown, Users, Car, Calendar, Train, GraduationCap, Store, TreePine, Award, ShieldCheck, TrendingUp, X } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import type { FieldReportData } from '@/lib/DashboardFacade';
import { getBrandMultiplier, calculatePremiumScores } from '@/lib/utils/scoring';
import { calculateDynamicDCF, calculateDongSpread, calculateForwardJeonseTrajectory } from '@/lib/utils/valuationEngine';
import { MACRO_CONFIG } from '@/lib/macro-summary';
import type { AptTxSummary } from '@/lib/types/transaction';
import { normalizeAptName } from '@/lib/utils/apartmentMapping';

interface TxRecord {
  dealType?: string;
  price: number;
  deposit?: number;
  monthlyRent?: number;
  contractYm?: string;
  contractDay?: string;
  contractDate?: string;
}

interface Props {
  report: FieldReportData;
  transactions: TxRecord[];
  txSummaryData?: Record<string, AptTxSummary>;
}

// --------------------------------------------------------------------------
// Helper: Gauge Bar UI
// --------------------------------------------------------------------------
const GaugeBar = ({ score, max }: { score: number, max: number }) => {
  const percent = Math.min(100, Math.max(0, (score / max) * 100));
  
  let colorClassText = 'text-toss-red';
  let colorClassBg = 'bg-toss-red';
  
  if (percent >= 80) { colorClassText = 'text-toss-green'; colorClassBg = 'bg-toss-green'; }
  else if (percent >= 50) { colorClassText = 'text-toss-blue'; colorClassBg = 'bg-toss-blue'; }
  else if (percent >= 30) { colorClassText = 'text-[#f59e0b]'; colorClassBg = 'bg-[#f59e0b]'; }

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

// --------------------------------------------------------------------------
// Utility Score V2 엔진 (Max 100점)
// --------------------------------------------------------------------------
function calculateUtilityScoreV2(report: FieldReportData) {
  const m = report.metrics as import('@/lib/types/scoutingReport').ObjectiveMetrics | undefined;
  const premium = calculatePremiumScores(m);
  const d = premium.details;

  if (!d) {
    return {
      total: 0,
      breakDown: { specs: 0, infra: 0 },
      logs: [],
      rawScore: 0,
      isCapped: false,
      maxTotal: 150
    };
  }

  const logs: { icon: React.ElementType; category: string; score: number; max: number; label: string; isInfra: boolean; data?: string; }[] = [
    { icon: Award, category: '브랜드 파워', score: d.brand.score, max: d.brand.max, label: d.brand.label, isInfra: false, data: d.brand.data },
    { icon: Users, category: '단지 규모 (세대수)', score: d.scale.score, max: d.scale.max, label: d.scale.label, isInfra: false, data: d.scale.data },
    { icon: Car, category: '주차 편의성 (세대당)', score: d.parking.score, max: d.parking.max, label: d.parking.label, isInfra: false, data: d.parking.data },
    { icon: Calendar, category: '건축 연식 (감가)', score: d.year.score, max: d.year.max, label: d.year.label, isInfra: false, data: d.year.data },
    { icon: Train, category: 'GTX/SRT 역세권', score: d.gtx.score, max: d.gtx.max, label: d.gtx.label, isInfra: true, data: d.gtx.data },
    { icon: Train, category: '동인선 역세권', score: d.indeokwon.score, max: d.indeokwon.max, label: d.indeokwon.label, isInfra: true, data: d.indeokwon.data },
    { icon: Train, category: '동탄트램 역세권', score: d.tram.score, max: d.tram.max, label: d.tram.label, isInfra: true, data: d.tram.data },
    { icon: GraduationCap, category: '통학 학군 (초등 중심)', score: d.school.score, max: d.school.max, label: d.school.label, isInfra: true, data: d.school.data },
    { icon: Store, category: '거점 상권/학원/앵커', score: d.store.score, max: d.store.max, label: d.store.label, isInfra: true, data: d.store.data },
    { icon: TreePine, category: '자연 환경 (호수/상징공원)', score: d.parkDist.score, max: d.parkDist.max, label: d.parkDist.label, isInfra: true, data: d.parkDist.data },
  ];

  const breakDown = {
    specs: d.brand.score + d.scale.score + d.parking.score + d.year.score,
    infra: d.gtx.score + d.indeokwon.score + d.tram.score + d.school.score + d.store.score + d.parkDist.score
  };

  const maxTotal = logs.reduce((sum, log) => sum + log.max, 0);

  return { total: premium.totalScore, breakDown, logs, rawScore: premium.totalScore, isCapped: false, maxTotal };
}

export default function AdvancedValuationMetrics({ report, transactions, txSummaryData = {} }: Props) {
  const [isRatioModalOpen, setIsRatioModalOpen] = useState(false);
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [macroConfig, setMacroConfig] = useState(MACRO_CONFIG.macroEnvironment);

  useEffect(() => {
    const fetchMacroRates = async () => {
      try {
        const res = await fetch('/api/macro/rates');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setMacroConfig(prev => ({
              ...prev,
              ...(json.data.riskFreeRate ? { riskFreeRate: json.data.riskFreeRate } : {}),
              ...(json.data.fundingCost ? { fundingCost: json.data.fundingCost } : {}),
            }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch real-time macro rates:', err);
      }
    };
    fetchMacroRates();
  }, []);

  // 3개월 기준일 계산 (가치평가 이평선)
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());

  const isRecent = (t: TxRecord) => {
    if (!t.contractYm || t.contractYm.length < 6) return false;
    const y = parseInt(t.contractYm.slice(0, 4));
    const m = parseInt(t.contractYm.slice(4, 6));
    const d = parseInt(t.contractDay || '1');
    const txDate = new Date(y, m - 1, d);
    return txDate >= threeMonthsAgo;
  };

  // 1. Transaction 분리
  const sales = transactions.filter(t => t.dealType !== '전세' && t.dealType !== '월세').sort((a,b) => (b.contractDate || '').localeCompare(a.contractDate || ''));
  const rents = transactions.filter(t => t.dealType === '전세' || t.dealType === '월세').sort((a,b) => (b.contractDate || '').localeCompare(a.contractDate || ''));
  
  const recentSales = sales.filter(isRecent);
  const recentRents = rents.filter(isRecent);

  // 3개월 평균 매매가 (최근 3개월 거래 없으면 가장 마지막 거래 1건 폴백 적용)
  const avg3MSale = recentSales.length > 0
    ? Math.round(recentSales.reduce((sum, t) => sum + t.price, 0) / recentSales.length)
    : (sales.length > 0 ? sales[0].price : 0);
  
  const getJeonseEq = (t: TxRecord) => t.dealType === '월세' 
    ? (t.deposit || 0) + Math.round((t.monthlyRent || 0) * 12 / 0.055) 
    : (t.deposit || t.price || 0);

  // 3개월 평균 전세가 (최근 3개월 거래 없으면 가장 마지막 거래 1건 폴백 적용)
  const avg3MRent = recentRents.length > 0
    ? Math.round(recentRents.reduce((sum, t) => sum + getJeonseEq(t), 0) / recentRents.length)
    : (rents.length > 0 ? getJeonseEq(rents[0]) : 0);

  // 2. 매매가/전세가 배수 계산 (1건 대신 최근 3개월 평균치 적용)
  const realEstatePER = (avg3MSale > 0 && avg3MRent > 0) ? (avg3MSale / avg3MRent) : 0;
  const jeonseRatio = (avg3MSale > 0 && avg3MRent > 0) ? (avg3MRent / avg3MSale) * 100 : 0;

  // --- 동태적 가치평가 및 거시/상대평가 모델 적용 ---
  const dongName = report.apartmentName.includes('동탄') ? '동탄2신도시' : '화성시';
  const pipeline = MACRO_CONFIG.supplyPipelines[dongName] || MACRO_CONFIG.supplyPipelines['화성시'];
  
  // 0. 전월세전환율 동적 스프레드 산출 (입지 및 주택유형 반영)
  let conversionRateSpread = 0;
  const spreadReasons: string[] = [];
  
  if (report.metrics) {
    const m = report.metrics as import('@/lib/types/scoutingReport').ObjectiveMetrics & Record<string, unknown>;
    
    // 교통 (역세권 프리미엄 vs 외곽 패널티)
    if (m.distanceToSubway <= 500) {
      conversionRateSpread -= 0.005;
      spreadReasons.push('역세권(-0.5%p)');
    } else if (m.distanceToSubway > 1200) {
      conversionRateSpread += 0.005;
      spreadReasons.push('외곽(+0.5%p)');
    }

    // 연식 및 브랜드 (신축/랜드마크 프리미엄 vs 구축 패널티)
    const year = m.yearBuilt ? parseInt(String(m.yearBuilt).substring(0, 4)) : new Date().getFullYear();
    const age = new Date().getFullYear() - year + 1;
    const mu = getBrandMultiplier(m.brand || report.apartmentName || '');
    
    if (age <= 5 || mu >= 1.09) {
      conversionRateSpread -= 0.005;
      spreadReasons.push('신축/1군(-0.5%p)');
    } else if (age > 15) {
      conversionRateSpread += 0.005;
      spreadReasons.push('구축감가(+0.5%p)');
    }
  }

  const dynamicConversionRate = Math.max(0.035, Math.min(0.065, macroConfig.jeonseConversionRate + conversionRateSpread));
  const dynamicMacroConfig = { ...macroConfig, jeonseConversionRate: dynamicConversionRate };

  // 1. Dynamic DCF (거시 금리 연동 및 동적 전환율 적용)
  const utilityScoreResult = calculateUtilityScoreV2(report);
  const dcf = calculateDynamicDCF(avg3MRent, dynamicMacroConfig, 1.5, utilityScoreResult.total);
  // 2. Dong Spread (인접 단지 상대평가) - 실제 데이터 연동
  const targetDongMatch = report.apartmentName.match(/\[(.*?)\]/);
  let targetDong = targetDongMatch ? targetDongMatch[1] : '';
  
  // [동] 접두사가 없는 경우, txSummaryData에서 아파트명 매칭으로 dong 역추적
  if (!targetDong) {
    const norm = normalizeAptName(report.apartmentName);
    for (const [key, tx] of Object.entries(txSummaryData)) {
      if (normalizeAptName(key) === norm && tx.dong) {
        targetDong = tx.dong;
        break;
      }
    }
  }
  
  const realDongPERs = Object.values(txSummaryData)
    .filter(tx => tx.dong === targetDong && tx.dong !== '' && (tx.avg3MPrice || 0) > 0 && (tx.avg3MRentDeposit || 0) > 0)
    .map(tx => (tx.avg3MPrice as number) / (tx.avg3MRentDeposit as number));

  const spreadData = calculateDongSpread(realEstatePER, realDongPERs.length > 0 ? realDongPERs : (realEstatePER > 0 ? [realEstatePER] : []));

  // 3. Forward Trajectory (미래 궤적)
  const trajectory = calculateForwardJeonseTrajectory(avg3MRent, pipeline);
  // ---------------------------------------------------

  // 3. 상태 평가 로직
  let statusText = '데이터 부족';
  let statusColor = 'text-tertiary';
  let statusBg = 'bg-body';
  let StatusIcon = Info;
  let descriptionText = '최근 매매/전세 실거래가 데이터가 부족하여 분석할 수 없습니다.';

  if (realEstatePER > 0) {
    if (realEstatePER < 1.4) {
      statusText = '안전구간 (가격 방어력 우수)';
      statusColor = 'text-toss-green';
      statusBg = 'bg-toss-green/10 border-toss-green/20';
      StatusIcon = ShieldCheck;
      descriptionText = '실거주 인기가 높아 전세가와 매매가 차이가 적습니다.\n단, 전세가 하락 시 집값이 크게 흔들릴 수 있습니다.';
    } else if (realEstatePER < 1.6) {
      statusText = '안정구간 (적정 안전마진)';
      statusColor = 'text-[#10b981]';
      statusBg = 'bg-[#10b981]/10 border-[#10b981]/20';
      StatusIcon = ShieldCheck;
      descriptionText = '경제가 흔들려도 집값이 잘 버티며,\n실제로 살고 싶어 하는 수요가 가격을 든든하게 받쳐줍니다.';
    } else if (realEstatePER < 1.8) {
      statusText = '평균구간 (시장의 균형점)';
      statusColor = 'text-toss-blue';
      statusBg = 'bg-toss-blue/10 border-toss-blue/20';
      StatusIcon = Target;
      descriptionText = '수도권 아파트들이 일반적으로 갖춘 가치와\n사람들의 보편적인 선호도를 가장 평범하게 보여줍니다.';
    } else if (realEstatePER <= 2.2) {
      statusText = '성장구간 (미래 기대감 반영)';
      statusColor = 'text-[#f59e0b]';
      statusBg = 'bg-[#f59e0b]/10 border-[#f59e0b]/20';
      StatusIcon = TrendingUp;
      descriptionText = '좋은 학군이나 교통망 덕분에 나중에 집값이 오를 것이란\n기대감이 이미 현재 가격에 포함되어 있습니다.';
    } else {
      statusText = '투자집중구간 (큰 수익 기대)';
      statusColor = 'text-toss-red';
      statusBg = 'bg-toss-red/10 border-[#f04452]/20';
      StatusIcon = TrendingUp;
      descriptionText = '재건축 등 호재를 노린 투자금이 몰린 곳으로,\n은행 금리가 오르면 가격이 급락할 수 있으니 주의하세요.';
    }
  }

  // 가격 포맷 헬퍼 (백만원 단위로 반올림 및 소수점 삭제)
  const formatPrice = (p: number) => {
    if (p === 0) return '정보 없음';
    
    const rounded = Math.round(p / 100) * 100;
    
    if (rounded >= 10000) {
      const eok = Math.floor(rounded / 10000);
      const man = rounded % 10000;
      return man > 0 ? `${eok}억 ${man.toLocaleString()}만` : `${eok}억`;
    }
    return `${rounded.toLocaleString()}만`;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <h2 className="text-[20px] font-bold text-primary flex items-center gap-2">
        <Target size={22} className="text-toss-blue" strokeWidth={2.5} />
        밸류에이션 분석
      </h2>

      {/* Unified Valuation Card */}
      <div className="bg-surface border border-border p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between border-b border-body pb-4 mb-5">
          <h3 className="text-[15px] font-extrabold text-secondary flex items-center gap-1.5">
            매매가/전세가
          </h3>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Data Components (Previously Right) */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="bg-body border border-border rounded-2xl p-5 flex flex-col justify-center gap-5 h-full">
              <h4 className="text-[13px] font-bold text-secondary">기준 실거래 데이터</h4>
              
              <div className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-tertiary font-medium flex items-center gap-1">
                    3개월 평균 매매가
                  </span>
                  <span className="text-[15px] font-extrabold text-primary">{formatPrice(avg3MSale)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-tertiary font-medium flex items-center gap-1">
                    3개월 평균 전세가
                  </span>
                  <span className="text-[15px] font-extrabold text-toss-blue">{formatPrice(avg3MRent)}</span>
                </div>

                <div className="h-px w-full bg-[#e5e8eb] my-1" />
                
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-tertiary font-bold">도출된 전세가율</span>
                  <span className="text-[15px] font-extrabold text-primary bg-surface px-2 py-0.5 rounded shadow-sm border border-border">
                    {jeonseRatio > 0 ? `${jeonseRatio.toFixed(1)}%` : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Main PER Metric Box (Previously Left) */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex flex-col items-center justify-center pb-6">
              <div className="flex items-center justify-center gap-1.5 text-[12px] font-bold text-tertiary mb-1 cursor-pointer hover:text-secondary transition-colors" onClick={() => setIsRatioModalOpen(true)}>
                매매가 ÷ 전세가 배수 
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-body border border-border text-secondary shadow-sm transition-transform hover:scale-105">
                  <Info size={14} strokeWidth={2.5} />
                </span>
              </div>
              {realEstatePER > 0 ? (
                <div className="flex items-end gap-1.5">
                  <span className="text-[56px] font-black text-primary leading-none tracking-tighter">
                    {realEstatePER.toFixed(2)}
                  </span>
                  <span className="text-[18px] font-extrabold text-tertiary mb-2">배</span>
                </div>
              ) : (
                <div className="text-[24px] font-bold text-tertiary my-4">N/A</div>
              )}
            </div>

            {/* Status Alert */}
            {realEstatePER > 0 && (
              <div className={`p-4 rounded-xl border flex gap-3 items-start ${statusBg}`}>
                <StatusIcon size={20} className={`${statusColor} shrink-0 mt-0.5`} />
                <div className="flex flex-col gap-1.5">
                  <h4 className={`text-[14px] font-extrabold ${statusColor}`}>{statusText}</h4>
                  <p className="text-[12.5px] text-secondary leading-relaxed font-medium whitespace-pre-line">
                    {descriptionText}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic DCF Valuation Card */}
      {realEstatePER > 0 && (
        <div className="bg-surface border border-border p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between border-b border-body pb-4 mb-5">
            <h3 className="text-[15px] font-extrabold text-secondary flex items-center gap-1.5">
              금리로 계산한 적정 집값
            </h3>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: Formula & Data Components (Previously Right) */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="bg-body border border-border rounded-2xl p-5 flex flex-col justify-center gap-4 h-full">
                <h4 className="text-[13px] font-bold text-secondary">적용 수식 및 산출 근거</h4>
                
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-tertiary font-medium">기본 투자 요구 이자율 (할인율 r)</span>
                      <span className="text-[13px] font-bold text-primary">{dcf.discountRate.toFixed(2)}%</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#8b95a1] bg-[#f9fafb] px-2 py-1.5 rounded-md mt-0.5 border border-[#e5e8eb]/50">
                      <span>국고채 {macroConfig.riskFreeRate.toFixed(2)}%</span>
                      <span className="text-[#d1d6db]">+</span>
                      <span>리스크 1.50%</span>
                      <span className="text-[#d1d6db]">+</span>
                      <span>조달 페널티({macroConfig.fundingCost.toFixed(2)}%) {(Math.max(0, macroConfig.fundingCost - 4.0) * 0.5).toFixed(2)}%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] text-tertiary font-medium">장기 집값 상승 기대치 (성장률 g)</span>
                      <button 
                        onClick={() => setIsScoreModalOpen(true)}
                        className="text-[11px] text-[#8b95a1] flex items-center gap-1 hover:text-toss-blue transition-colors cursor-pointer text-left"
                      >
                        물가(2.0%) ± 단지 가치평가(Max 1.5%p)
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-[13px] font-bold text-primary">{dcf.growthRate.toFixed(2)}%</span>
                  </div>

                  <div className="h-px w-full bg-[#e5e8eb] my-1" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-secondary font-bold">실질 목표 수익률 (Cap Rate)</span>
                    <span className="text-[14px] font-extrabold text-toss-blue">
                      {dcf.capRate.toFixed(2)}%
                    </span>
                  </div>

                  <div className="flex items-start justify-between mt-2 pt-2 border-t border-border">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] text-tertiary font-medium">1년 치 월세 가치 (환산 임대료)</span>
                      <span className="text-[11px] text-[#8b95a1] break-keep">
                        최근 3개월 평균 전세가 × 전환율 {(dynamicConversionRate * 100).toFixed(1)}% 
                        {spreadReasons.length > 0 ? (
                          <> (기본 5.0% + {spreadReasons.map((r, i) => (
                            <span key={i} className="whitespace-nowrap">
                              {r}{i < spreadReasons.length - 1 ? ', ' : ''}
                            </span>
                          ))})</>
                        ) : ' (기본 5.0%)'}
                      </span>
                    </div>
                    <span className="text-[13px] font-bold text-primary whitespace-nowrap flex-shrink-0 ml-4">{formatPrice(avg3MRent * dynamicConversionRate)}</span>
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] text-tertiary font-medium">수익률 기준 적정 전세가율</span>
                      <span className="text-[11px] text-[#8b95a1] break-keep">
                        Cap Rate({dcf.capRate.toFixed(2)}%) ÷ 전환율({(dynamicConversionRate * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <span className="text-[13px] font-bold text-primary whitespace-nowrap flex-shrink-0 ml-4">{(100 / dcf.fairJeonseMultiple).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Main Cap Rate Box (Previously Left) */}
            <div className="flex-1 flex flex-col">
              <div className="flex-1 flex flex-col items-center justify-center pb-6">
                <div className="text-[13px] font-bold text-tertiary mb-1">
                  적정 집값
                </div>
                <div className="flex items-end gap-1.5">
                  <span className="text-[44px] font-black text-primary leading-none tracking-tighter">
                    {formatPrice(dcf.impliedValue)}
                  </span>
                </div>
                {avg3MSale > 0 && (
                  <div className={`mt-5 w-full max-w-[280px] mx-auto flex flex-col items-center p-5 rounded-2xl shadow-sm ${
                    avg3MSale > dcf.impliedValue ? 'bg-toss-red/5 border border-toss-red/20' : 'bg-toss-blue/5 border border-toss-blue/20'
                  }`}>
                    <div className="flex items-center gap-1.5 text-[13px] font-bold text-tertiary mb-1">
                      <Target size={14} className={avg3MSale > dcf.impliedValue ? 'text-toss-red' : 'text-toss-blue'} />
                      기준가 (3개월 평균)
                    </div>
                    <div className="text-[32px] font-black text-primary mb-3 tracking-tighter">
                      {formatPrice(avg3MSale)}
                    </div>
                    <div className={`px-3.5 py-1.5 rounded-lg text-[13px] font-bold shadow-sm ${
                      avg3MSale > dcf.impliedValue ? 'bg-toss-red/10 text-toss-red' : 'bg-toss-blue/10 text-toss-blue'
                    }`}>
                      적정가 대비 {formatPrice(Math.abs(avg3MSale - dcf.impliedValue))} {avg3MSale > dcf.impliedValue ? '고평가' : '저평가'}
                    </div>
                  </div>
                )}
              </div>

              {/* Status Alert / Brief formula explanation */}
              <button 
                onClick={() => setIsFormulaModalOpen(true)}
                className="mt-auto w-full p-4 rounded-xl border flex items-center justify-between bg-body hover:bg-[#f9fafb] border-border transition-all active:scale-[0.99] group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-toss-blue/10 flex items-center justify-center group-hover:bg-toss-blue/20 transition-colors">
                    <Info size={18} className="text-toss-blue" />
                  </div>
                  <span className="text-[14px] font-extrabold text-secondary">어떻게 계산했나요?</span>
                </div>
                <span className="text-[12px] font-bold text-toss-blue px-3 py-1.5 rounded-lg bg-toss-blue/10">계산식 보기</span>
              </button>
            </div>
          </div>
        </div>
      )}


      {isRatioModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsRatioModalOpen(false)}>
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-body flex justify-between items-center">
              <h3 className="text-[18px] font-bold text-primary">매매가 ÷ 전세가 배수 기준</h3>
              <button onClick={() => setIsRatioModalOpen(false)} className="text-tertiary hover:text-primary transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-6 overflow-y-auto max-h-[85vh]">
              <div className="flex gap-4">
                <div className="w-2.5 h-2.5 rounded-full bg-toss-green mt-1.5 shrink-0" />
                <div>
                  <div className="text-[15px] font-bold text-primary flex items-center gap-1.5">
                    안전구간 (1.4배 미만) <span className="text-[12px] font-medium text-tertiary font-normal">(전세가율 71% 이상)</span>
                  </div>
                  <div className="text-[14px] text-secondary mt-1.5 leading-relaxed">
                    <b className="text-toss-green">집값이 떨어질 위험이 매우 낮습니다.</b> 실거주 인기가 높아 매매가와 전세가의 차이가 적고, 적은 돈으로도 투자(갭투자)하기 좋은 곳들이 모여있습니다.
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-2.5 h-2.5 rounded-full bg-[#10b981] mt-1.5 shrink-0" />
                <div>
                  <div className="text-[15px] font-bold text-primary flex items-center gap-1.5">
                    안정구간 (1.4배 ~ 1.6배) <span className="text-[12px] font-medium text-tertiary font-normal">(전세가율 62~71%)</span>
                  </div>
                  <div className="text-[14px] text-secondary mt-1.5 leading-relaxed">
                    <b className="text-[#10b981]">가격이 든든하게 방어됩니다.</b> 경제가 흔들려도 집값이 잘 버티는 편이며, 사람들이 실제로 살고 싶어 하는 수요가 가격을 탄탄하게 받쳐줍니다.
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-2.5 h-2.5 rounded-full bg-toss-blue mt-1.5 shrink-0" />
                <div>
                  <div className="text-[15px] font-bold text-primary flex items-center gap-1.5">
                    평균구간 (1.6배 ~ 1.8배) <span className="text-[12px] font-medium text-tertiary font-normal">(전세가율 55~62%)</span>
                  </div>
                  <div className="text-[14px] text-secondary mt-1.5 leading-relaxed">
                    <b className="text-toss-blue">시장의 딱 중간 수준입니다.</b> 수도권 아파트들이 일반적으로 가지고 있는 생활 인프라와 사람들의 평범한 선호도가 그대로 반영된 상태입니다.
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] mt-1.5 shrink-0" />
                <div>
                  <div className="text-[15px] font-bold text-primary flex items-center gap-1.5">
                    성장구간 (1.8배 ~ 2.2배) <span className="text-[12px] font-medium text-tertiary font-normal">(전세가율 45~55%)</span>
                  </div>
                  <div className="text-[14px] text-secondary mt-1.5 leading-relaxed">
                    <b className="text-[#f59e0b]">미래에 대한 기대감이 섞여있습니다.</b> 뛰어난 학군이나 새로운 교통망 등 좋은 입지 조건 때문에 나중에 집값이 오를 것이란 기대가 이미 가격에 포함되어 있습니다.
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-2.5 h-2.5 rounded-full bg-toss-red mt-1.5 shrink-0" />
                <div>
                  <div className="text-[15px] font-bold text-primary flex items-center gap-1.5">
                    투자집중구간 (2.2배 초과) <span className="text-[12px] font-medium text-tertiary font-normal">(전세가율 45% 미만)</span>
                  </div>
                  <div className="text-[14px] text-secondary mt-1.5 leading-relaxed">
                    <b className="text-toss-red">큰 수익을 노리는 투자가 집중된 곳입니다.</b> 재건축이나 대형 개발을 바라보는 투자자들이 몰려있어, 현재 살기 좋은 것보다 앞으로 오를 가치에 가격이 맞춰져 있습니다.
                  </div>
                </div>
              </div>

              <div className="mt-2 p-5 rounded-2xl bg-toss-red/5 border border-toss-red/20">
                <div className="text-[14px] font-extrabold text-toss-red mb-3 flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-toss-red/10">
                    <Info size={16} strokeWidth={2.5}/>
                  </div>
                  주의해야 할 숨은 위험
                </div>
                <div className="flex flex-col gap-3">
                  <div className="text-[13px] text-[#4e5968] leading-relaxed">
                    <b className="text-toss-red font-bold">안전구간의 함정:</b> 경제 상황이 나빠져 전세가가 떨어지면, 갭투자한 집주인들이 돈을 돌려주지 못해 헐값에 집을 넘기면서 가격이 무너질 위험이 있습니다.
                  </div>
                  <div className="text-[13px] text-[#4e5968] leading-relaxed">
                    <b className="text-toss-red font-bold">투자집중구간의 함정:</b> 은행 금리가 크게 오르면, 빚을 낸 투자자들의 이자 부담이 커지고 미리 반영되어 있던 기대감(거품)이 사라지면서 집값이 가장 가파르게 떨어질 수 있습니다.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Formula Modal */}
      {isFormulaModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 sm:p-0" onClick={() => setIsFormulaModalOpen(false)}>
          <div 
            className="relative w-full sm:w-[500px] bg-surface rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[85vh] hide-scrollbar"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-toss-blue/10 flex items-center justify-center">
                  <Info size={18} className="text-toss-blue" />
                </div>
                <h3 className="text-[18px] font-extrabold text-primary tracking-tight">어떻게 계산했나요?</h3>
              </div>
              <button onClick={() => setIsFormulaModalOpen(false)} className="p-2 hover:bg-body rounded-full transition-colors active:scale-95">
                <X size={20} className="text-tertiary" />
              </button>
            </div>
            
            <div className="bg-body rounded-2xl p-4 border border-border mb-6">
              <div className="text-[14px] font-extrabold text-primary mb-2 flex items-center gap-1.5">
                적정 집값 = 1년 예상 월세 ÷ 은행 예금이자
              </div>
              <p className="text-[13px] text-secondary leading-relaxed font-medium">
                이 아파트를 매수하는 대신 그 돈을 은행에 넣었을 때 받을 수 있는 이자와, 이 아파트에서 나오는 월세 수익을 비교하여 거꾸로 적정 가격을 계산한 결과입니다.
              </p>
            </div>
            
            <div className="flex flex-col gap-6 px-1">
              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-full bg-toss-blue text-surface flex items-center justify-center text-[12px] font-black shrink-0 mt-0.5 shadow-sm">1</div>
                <div className="flex flex-col gap-1.5 pt-0.5">
                  <span className="text-[14px] font-extrabold text-primary tracking-tight">목표수익 기준 설정</span>
                  <span className="text-[13px] text-secondary font-medium leading-relaxed">
                    은행 금리({macroConfig.riskFreeRate.toFixed(2)}%)만큼은 기본으로 깔고, 부동산 투자의 위험성(1.50%)을 더해 <strong>"최소 이 정도 수익은 나야 해"</strong>라는 기준을 세웁니다.
                  </span>
                  <div className="text-[12px] text-tertiary bg-body p-3 rounded-lg border border-border mt-1 leading-relaxed">
                    ※ 현재 주담대 금리({macroConfig.fundingCost.toFixed(2)}%)가 높아 투자 매력도가 떨어지는 만큼, 기준 수익률을 더 높게 잡았습니다.
                  </div>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-full bg-toss-blue text-surface flex items-center justify-center text-[12px] font-black shrink-0 mt-0.5 shadow-sm">2</div>
                <div className="flex flex-col gap-1.5 pt-0.5">
                  <span className="text-[14px] font-extrabold text-primary tracking-tight">예상 월세 도출</span>
                  <span className="text-[13px] text-secondary font-medium leading-relaxed">
                    최근 전세금을 바탕으로, <strong>"만약 이 집을 전부 월세로 돌린다면 1년에 얼마를 받을 수 있을까?"</strong>를 법정 기준({(dynamicConversionRate * 100).toFixed(1)}%)으로 계산합니다.
                  </span>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-full bg-toss-blue text-surface flex items-center justify-center text-[12px] font-black shrink-0 mt-0.5 shadow-sm">3</div>
                <div className="flex flex-col gap-1.5 pt-0.5">
                  <span className="text-[14px] font-extrabold text-primary tracking-tight">적정 집값 역산</span>
                  <span className="text-[13px] text-secondary font-medium leading-relaxed">
                    매년 꾸준한 월세가 들어오고 집값도 단지 가치에 비례해 매년 오를({dcf.growthRate.toFixed(2)}%) 것이라 가정했을 때, 1단계에서 세운 목표 수익률을 맞추려면 <strong>"지금 당장 얼마에 사야 할까?"</strong>를 계산한 값입니다.
                  </span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setIsFormulaModalOpen(false)}
              className="w-full mt-8 py-4 rounded-2xl font-extrabold text-[15px] bg-primary text-surface hover:bg-[#191f28] active:scale-[0.98] transition-all"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* Score Modal */}
      {isScoreModalOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setIsScoreModalOpen(false)}
        >
          <div 
            className="bg-surface w-full sm:w-[560px] max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#f59e0b]/10 flex items-center justify-center">
                  <Award size={18} className="text-[#f59e0b]" />
                </div>
                <h3 className="text-[18px] font-extrabold text-primary tracking-tight">단지 가치평가 상세</h3>
              </div>
              <button onClick={() => setIsScoreModalOpen(false)} className="p-2 hover:bg-body rounded-full transition-colors active:scale-95">
                <X size={20} className="text-tertiary" />
              </button>
            </div>
            
            <div className="bg-body rounded-2xl p-5 border border-border mb-6">
              <div className="flex items-end gap-2 mb-2">
                <span className="text-[32px] font-extrabold text-primary leading-none">{utilityScoreResult.total}</span>
                <span className="text-[14px] text-tertiary font-bold mb-1">/ {utilityScoreResult.maxTotal}점</span>
              </div>
              <p className="text-[13px] text-secondary leading-relaxed font-medium">
                {utilityScoreResult.total >= 70 ? '뛰어난 상품성과 인프라를 갖춰 평균(2.0%)보다 높은 성장률 프리미엄이 부여됩니다.' : 
                 utilityScoreResult.total >= 50 ? '표준적인 상품성과 인프라를 갖춰 물가상승률(2.0%) 수준의 성장률이 적용됩니다.' : 
                 '단지 스펙 및 인프라 한계로 인해 평균보다 다소 낮은 성장률이 적용됩니다.'}
              </p>
            </div>
            
            <div className="flex flex-col gap-5 px-1">
              {utilityScoreResult.logs.map((log, i) => {
                const Icon = log.icon;
                return (
                  <div key={i} className="flex gap-4 items-start">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${log.isInfra ? 'bg-toss-blue/10 text-toss-blue' : 'bg-[#f59e0b]/10 text-[#f59e0b]'}`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex flex-col gap-1 w-full pt-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] font-bold text-primary">{log.category}</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-[14px] font-extrabold text-secondary">{log.score}</span>
                          <span className="text-[11px] text-tertiary font-medium">/ {log.max}점</span>
                        </div>
                      </div>
                      <span className="text-[13px] text-secondary font-medium">{log.label}</span>
                      {log.data && (
                        <span className="text-[12px] text-toss-blue font-semibold mt-1 px-2.5 py-1 bg-toss-blue/5 rounded border border-toss-blue/10 w-fit">
                          실데이터: {log.data}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <button 
              onClick={() => setIsScoreModalOpen(false)}
              className="w-full mt-8 py-4 rounded-2xl font-extrabold text-[15px] bg-primary text-surface hover:bg-[#191f28] active:scale-[0.98] transition-all"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
