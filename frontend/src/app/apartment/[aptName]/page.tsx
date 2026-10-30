import { Metadata } from 'next';
import Link from 'next/link';
import { BarChart3, HelpCircle, Building2, MapPin, ArrowRight } from 'lucide-react';
import DashboardClient from '@/components/DashboardClient';
import { AdSlot } from '@/components/ads/AdSlot';
import ReportShareBar from '@/components/common/ReportShareBar';
import type { DashboardInitialDataLocal } from '@/hooks/useDashboardMeta';
import type { LocationScoreItem } from '@/types/transaction';
import { safeJsonLd } from '@/lib/utils/structuredData';
import { dongToZoneId, getZoneById } from '@/lib/zones';
import {
  decodeAptName,
  formatPriceEok,
  getTxSummaryData,
  getApartmentPageData,
  buildApartmentJsonLd,
  buildApartmentSeoMetadata,
  getDefaultApartmentMetadata,
  buildMortgageSsrData,
} from '@/lib/services/apartmentPageService';

function formatWon(val: number): string {
  if (!Number.isFinite(val) || val <= 0) return '0원';
  return `${Math.round(val).toLocaleString('ko-KR')}원`;
}

export const dynamic = 'force-static';
export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const txSummary = await getTxSummaryData();
  const aptNames = Object.keys(txSummary || {});
  return aptNames.map((name) => ({
    aptName: name,
  }));
}

export async function generateMetadata(props: {
  params: Promise<{ aptName: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';

  try {
    const params = props.params ? await props.params : null;

    if (!params?.aptName) {
      return getDefaultApartmentMetadata(baseUrl);
    }

    return await buildApartmentSeoMetadata(params.aptName, undefined, baseUrl);
  } catch {
    try {
      const params = props.params ? await props.params : null;
      return getDefaultApartmentMetadata(baseUrl, params?.aptName ? decodeAptName(params.aptName) : undefined);
    } catch {
      return getDefaultApartmentMetadata(baseUrl);
    }
  }
}

export default async function ApartmentPage(props: { params: Promise<{ aptName: string }> }) {
  let decodedName = '아파트';

  try {
    const params = props.params ? await props.params : null;
    if (params?.aptName) {
      decodedName = decodeAptName(params.aptName);
    }
  } catch {
    // fallback to default
  }

  const pageData = await getApartmentPageData(decodedName);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  const jsonLd = buildApartmentJsonLd(pageData, baseUrl);

  const {
    resolvedTxKey: pageResolvedTxKey,
    aptSummary,
    pyeongSummaries,
    locationScore,
    matchedReportData,
    matchedDongApt,
    aiBriefing,
  } = pageData;

  const aptDong = aptSummary?.dong || matchedDongApt?.dong || matchedReportData?.dong || '';
  const resolvedTxKey = pageResolvedTxKey || matchedDongApt?.txKey || (aptSummary ? decodedName : undefined);
  const sanitizedReport = matchedReportData
    ? JSON.parse(
        JSON.stringify({
          ...matchedReportData,
          id: matchedReportData.id || `report-${decodedName}`,
          createdAt: typeof matchedReportData.createdAt === 'string' ? matchedReportData.createdAt : null,
        })
      )
    : undefined;
  const scopedInitialData: DashboardInitialDataLocal = {
    ...(aptSummary
      ? {
          txSummary: {
            [decodedName]: aptSummary,
            ...(resolvedTxKey && resolvedTxKey !== decodedName ? { [resolvedTxKey]: aptSummary } : {}),
          },
        }
      : {}),
    ...(locationScore ? { locationScores: { [decodedName]: locationScore as LocationScoreItem } } : {}),
    ...(sanitizedReport ? { fieldReports: [sanitizedReport] } : {}),
    ...(aptDong || matchedDongApt
      ? {
          apartmentMeta: {
            [decodedName]: {
              ...(matchedDongApt || {}),
              dong: aptDong,
              txKey: resolvedTxKey || decodedName,
            },
            ...(matchedDongApt?.name && matchedDongApt.name !== decodedName
              ? {
                  [matchedDongApt.name]: {
                    ...matchedDongApt,
                    dong: aptDong,
                    txKey: resolvedTxKey || decodedName,
                  },
                }
              : {}),
          },
        }
      : {}),
  };

  const mortgageSsr =
    pageData.mortgageSsr ||
    buildMortgageSsrData(
      decodedName,
      aptSummary?.latestPrice || (pyeongSummaries.length > 0 ? pyeongSummaries[0].latestPrice : 0),
      aptSummary?.latestRentDeposit || (pyeongSummaries.length > 0 ? pyeongSummaries[0].latestDeposit : 0)
    );

  const parentZoneId = dongToZoneId(aptDong || undefined);
  const parentZone = getZoneById(parentZoneId);
  const allTxSummary = await getTxSummaryData();
  const peerApartments = Object.entries(allTxSummary || {})
    .filter(([name, s]) => {
      if (!s || name === decodedName || name === resolvedTxKey) return false;
      if ((s.latestPrice || 0) <= 0) return false;
      return aptDong ? s.dong === aptDong : true;
    })
    .map(([name, s]) => ({
      name,
      dong: s.dong || aptDong || '동탄',
      latestPrice: s.latestPrice || 0,
      latestPriceStr: s.latestPriceEok || formatPriceEok(s.latestPrice || 0),
      txCount: s.txCount || 0,
    }))
    .sort((a, b) => b.latestPrice - a.latestPrice)
    .slice(0, 8);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />

      {/* Search Engine Optimization & Screen Reader SSR Fallback Block */}
      <div className="sr-only">
        <h1>{decodedName} 아파트 실거래가 및 입지 가치 분석 리포트</h1>
        <p>{aiBriefing}</p>
      </div>

      <DashboardClient initialDashboardData={scopedInitialData} preselectedAptName={decodedName} />

      {/* High-Value Comprehensive Apartment Analysis Report (Visible SSR Content for Users & AdSense Reviewers) */}
      <section className="sr-only">
        <div className="bg-surface border border-border/80 rounded-3xl p-6 sm:p-10 shadow-sm space-y-10">
          
          {/* Header Summary */}
          <div className="border-b border-border/60 pb-6">
            <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[12px] font-extrabold px-3 py-1 rounded-full mb-3 border border-emerald-500/20">
              <BarChart3 size={13} className="shrink-0" />
              <span>D-VIEW 부동산 데이터 랩스 정밀 진단</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
              {decodedName} 아파트 실거래가 및 입지 심층 분석 리포트
            </h1>
            <p className="mt-3 text-secondary text-[14px] sm:text-[15.5px] leading-relaxed max-w-[900px] font-medium">
              {aiBriefing}
            </p>
            <div className="mt-5">
              <ReportShareBar
                title={`${decodedName} 실거래가 및 입지 심층 분석 리포트`}
                summaryLines={[
                  aptDong ? `소속 행정동: 동탄 ${aptDong}` : `분석 대상: 동탄 ${decodedName}`,
                  aptSummary?.latestPrice
                    ? `최근 실거래 매매가: ${aptSummary.latestPriceEok || formatPriceEok(aptSummary.latestPrice)}`
                    : `평형별 실거래가 및 전세가율 정밀 분석`,
                  `30년 만기 원리금균등 월 납부액(LTV 70% 기준): ${formatWon(mortgageSsr.amortization.equalPi.monthlyPaymentWon)}`,
                ]}
                canonicalPath={`/apartment/${encodeURIComponent(decodedName)}`}
                campaign="apt_ssr_report"
              />
            </div>
          </div>

          {/* School & Infrastructure Location Analytics */}
          {locationScore && (
            <div className="space-y-4">
              <h2 className="text-lg sm:text-xl font-extrabold text-primary tracking-tight flex items-center gap-2">
                <span className="w-2 h-5 bg-emerald-500 rounded-full" />
                {decodedName} 학군 및 교통 입지 인프라 팩트체크
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-[13px] text-secondary">
                {locationScore.nearestSchoolNames?.elementary && (
                  <div className="bg-body p-4 rounded-2xl border border-border/50">
                    <span className="text-[11px] font-bold text-tertiary block mb-1">배정 초등학교</span>
                    <strong className="text-primary text-[14px]">{locationScore.nearestSchoolNames.elementary}</strong>
                    <p className="mt-1 text-tertiary">단지 기준 약 {locationScore.distanceToElementary || 0}m (도보 {Math.round((locationScore.distanceToElementary || 0) / 70) || 1}분)</p>
                  </div>
                )}
                {locationScore.nearestSchoolNames?.middle && (
                  <div className="bg-body p-4 rounded-2xl border border-border/50">
                    <span className="text-[11px] font-bold text-tertiary block mb-1">인근 중학교</span>
                    <strong className="text-primary text-[14px]">{locationScore.nearestSchoolNames.middle}</strong>
                    <p className="mt-1 text-tertiary">동탄 학군 내 배정 권역</p>
                  </div>
                )}
                {locationScore.nearestSchoolNames?.high && (
                  <div className="bg-body p-4 rounded-2xl border border-border/50">
                    <span className="text-[11px] font-bold text-tertiary block mb-1">인근 고등학교</span>
                    <strong className="text-primary text-[14px]">{locationScore.nearestSchoolNames.high}</strong>
                    <p className="mt-1 text-tertiary">도보 및 대중교통 통학권</p>
                  </div>
                )}
                {locationScore.nearestStationName && (
                  <div className="bg-body p-4 rounded-2xl border border-border/50">
                    <span className="text-[11px] font-bold text-tertiary block mb-1">대중교통 / 지하철</span>
                    <strong className="text-primary text-[14px]">{locationScore.nearestStationLine || '지하철'} {locationScore.nearestStationName}역</strong>
                    <p className="mt-1 text-tertiary">단지 기준 약 {locationScore.distanceToSubway || 0}m (도보 {Math.round((locationScore.distanceToSubway || 0) / 70) || 1}분)</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* On-site Scouting Assessment */}
          {matchedReportData?.sections && (
            <div className="space-y-4">
              <h2 className="text-lg sm:text-xl font-extrabold text-primary tracking-tight flex items-center gap-2">
                <span className="w-2 h-5 bg-emerald-500 rounded-full" />
                현장 임장 검증 및 정성 평가 종합
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px] text-secondary">
                {matchedReportData.sections.assessment?.synthesis && (
                  <div className="bg-body p-5 rounded-2xl border border-border/50 col-span-1 md:col-span-2">
                    <h3 className="text-sm font-extrabold text-primary mb-2">단지 종합 가치 평가</h3>
                    <p className="leading-relaxed font-medium">{matchedReportData.sections.assessment.synthesis}</p>
                  </div>
                )}
                {matchedReportData.sections.ecosystem?.schoolText && (
                  <div className="bg-body p-5 rounded-2xl border border-border/50">
                    <h3 className="text-sm font-extrabold text-primary mb-2">학군 및 교육 환경</h3>
                    <p className="leading-relaxed font-medium">{matchedReportData.sections.ecosystem.schoolText}</p>
                  </div>
                )}
                {matchedReportData.sections.location?.trafficText && (
                  <div className="bg-body p-5 rounded-2xl border border-border/50">
                    <h3 className="text-sm font-extrabold text-primary mb-2">교통 및 도로 인프라</h3>
                    <p className="leading-relaxed font-medium">{matchedReportData.sections.location.trafficText}</p>
                  </div>
                )}
                {matchedReportData.sections.infra?.parkingText && (
                  <div className="bg-body p-5 rounded-2xl border border-border/50 col-span-1 md:col-span-2">
                    <h3 className="text-sm font-extrabold text-primary mb-2">주차 공간 및 입주민 편의 시설</h3>
                    <p className="leading-relaxed font-medium">{matchedReportData.sections.infra.parkingText}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pyeong-specific Transaction Summary Table (Chapter 02 SSR) */}
          <div id="chapter-02-pyeong-ssr" className="space-y-4">
            <h2 className="text-lg sm:text-xl font-extrabold text-primary tracking-tight flex items-center gap-2">
              <span className="w-2 h-5 bg-emerald-500 rounded-full" />
              {decodedName} 평형별 실거래가 및 전세가율 현황표
            </h2>
            {pyeongSummaries.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-border/60">
                <table className="w-full text-left text-[13px] text-secondary">
                  <thead className="bg-body text-primary font-bold border-b border-border/60">
                    <tr>
                      <th scope="col" className="p-3.5 whitespace-nowrap">평형</th>
                      <th scope="col" className="p-3.5 whitespace-nowrap">전용면적</th>
                      <th scope="col" className="p-3.5 whitespace-nowrap">최근 실거래가</th>
                      <th scope="col" className="p-3.5 whitespace-nowrap">평균 매매가</th>
                      <th scope="col" className="p-3.5 whitespace-nowrap">최고가</th>
                      <th scope="col" className="p-3.5 whitespace-nowrap">최근 전세가</th>
                      <th scope="col" className="p-3.5 whitespace-nowrap">전세가율</th>
                      <th scope="col" className="p-3.5 whitespace-nowrap">거래량</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-medium">
                    {pyeongSummaries.map((p) => (
                      <tr key={p.pyeong} className="hover:bg-black/[0.02] dark:hover:bg-surface/5 transition-colors">
                        <th scope="row" className="p-3.5 font-bold text-primary whitespace-nowrap">{p.pyeong}평형</th>
                        <td className="p-3.5 whitespace-nowrap">{p.areaM2}㎡</td>
                        <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{p.latestPriceStr}</td>
                        <td className="p-3.5 whitespace-nowrap">{p.avgPriceStr}</td>
                        <td className="p-3.5 whitespace-nowrap">{p.maxPriceStr}</td>
                        <td className="p-3.5 whitespace-nowrap">{p.latestDepositStr}</td>
                        <td className="p-3.5 whitespace-nowrap">{p.jeonseRatio > 0 ? `${p.jeonseRatio}%` : '정보 없음'}</td>
                        <td className="p-3.5 whitespace-nowrap">매매 {p.salesCount}건 / 전세 {p.rentCount}건</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-body p-4 rounded-2xl border border-border/50 text-[13px] text-secondary">
                최근 매매가: {aptSummary?.latestPriceEok ? `${aptSummary.latestPriceEok}억` : '정보 없음'} | 
                최근 1개월 평균가: {aptSummary?.avg1MPriceEok ? `${aptSummary.avg1MPriceEok}억` : '정보 없음'} | 
                최근 전세가: {aptSummary?.latestRentDepositEok ? `${aptSummary.latestRentDepositEok}억` : '정보 없음'}
              </div>
            )}
          </div>

          {/* Chapter 02 Post-Table Zero-CLS AdSlot (High-CPC Real Estate Valuation Context) */}
          <div
            data-testid="ssr-adslot-ch02"
            className="w-full min-h-[250px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-4 flex flex-col justify-center overflow-hidden"
          >
            <AdSlot
              slotId="1000000002"
              refreshSlotId="1000000002_ssr_ch02"
              format="rectangle"
              minHeightClass="min-h-[250px]"
              cpaCampaignId="mortgage-refinance"
              apartmentName={decodedName}
            />
          </div>

          {/* Mortgage & Stress DSR Analysis Section (Chapter 05 SSR) */}
          <section id="chapter-05-mortgage-ssr" className="space-y-6 pt-4 border-t border-border/60">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-primary tracking-tight flex items-center gap-2">
                <span className="w-2 h-5 bg-emerald-500 rounded-full" />
                {decodedName} 주택담보대출 상환 시뮬레이션 및 스트레스 DSR 진단
              </h2>
              <p className="mt-2 text-[13px] text-tertiary font-medium">
                대출원금 {formatWon(mortgageSsr.principalWon)}, 30년 만기, 기준금리 4.0%를 가정한 상환방식별 원리금 및 스트레스 DSR 40% 규제 분석표입니다.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Amortization Table */}
              <div className="bg-body p-5 rounded-2xl border border-border/50">
                <h3 className="text-sm font-extrabold text-primary mb-3">1. 상환 방식별 월 납부액 비교</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px] text-secondary">
                    <caption className="sr-only">원리금균등 분할상환 및 원금균등 분할상환 상환 방식별 월 납부액 비교표</caption>
                    <thead className="border-b border-border/60 font-bold text-primary">
                      <tr>
                        <th className="pb-2">방식</th>
                        <th className="pb-2">초기 월납입</th>
                        <th className="pb-2">총 납부액</th>
                        <th className="pb-2">총 이자</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-medium">
                      <tr>
                        <th className="py-2.5 font-bold text-primary">원리금균등 분할상환</th>
                        <td className="py-2.5">{formatWon(mortgageSsr.amortization.equalPi.monthlyPaymentWon)}</td>
                        <td className="py-2.5">{formatWon(mortgageSsr.amortization.equalPi.totalPaymentWon)}</td>
                        <td className="py-2.5 text-emerald-600 dark:text-emerald-400 font-bold">{formatWon(mortgageSsr.amortization.equalPi.totalInterestWon)}</td>
                      </tr>
                      <tr>
                        <th className="py-2.5 font-bold text-primary">원금균등 분할상환</th>
                        <td className="py-2.5">{formatWon(mortgageSsr.amortization.equalP.firstMonthPaymentWon)}</td>
                        <td className="py-2.5">{formatWon(mortgageSsr.amortization.equalP.totalPaymentWon)}</td>
                        <td className="py-2.5 text-emerald-600 dark:text-emerald-400 font-bold">{formatWon(mortgageSsr.amortization.equalP.totalInterestWon)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DSR Table */}
              <div className="bg-body p-5 rounded-2xl border border-border/50">
                <h3 className="text-sm font-extrabold text-primary mb-3">2. 연소득별 스트레스 DSR 40% 한도표</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px] text-secondary">
                    <caption className="sr-only">차주 연소득별 스트레스 DSR 40% 규제 대출한도표</caption>
                    <thead className="border-b border-border/60 font-bold text-primary">
                      <tr>
                        <th className="pb-2">차주 연소득</th>
                        <th className="pb-2">월 최대상환</th>
                        <th className="pb-2">최대 가용 대출액</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-medium">
                      {mortgageSsr.dsrScenarios.map((dsr) => (
                        <tr key={dsr.annualIncomeWon}>
                          <th className="py-2 font-bold text-primary">{formatWon(dsr.annualIncomeWon)}</th>
                          <td className="py-2">{formatWon(dsr.maxMonthlyPaymentWon)}</td>
                          <td className="py-2 font-bold text-emerald-600 dark:text-emerald-400">{formatWon(dsr.maxLoanWon)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Rate Shock Table */}
              <div className="bg-body p-5 rounded-2xl border border-border/50">
                <h3 className="text-sm font-extrabold text-primary mb-3">3. 금리 변동 시나리오별 상환 부담표</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px] text-secondary">
                    <caption className="sr-only">금리 변동 시나리오별 월 원리금 상환액 및 추가 이자 부담표</caption>
                    <thead className="border-b border-border/60 font-bold text-primary">
                      <tr>
                        <th className="pb-2">금리 변동 시나리오</th>
                        <th className="pb-2">적용 금리</th>
                        <th className="pb-2">월 상환액</th>
                        <th className="pb-2">추가 월부담</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-medium">
                      {mortgageSsr.rateShock.scenarios.map((sc) => (
                        <tr key={sc.spreadPercent}>
                          <th className="py-2 font-bold text-primary">+{sc.spreadPercent.toFixed(1)}%p 인상</th>
                          <td className="py-2">{sc.shockedRatePercent.toFixed(1)}%</td>
                          <td className="py-2">{formatWon(sc.monthlyPaymentWon)}</td>
                          <td className="py-2 text-red-600 dark:text-red-400 font-bold">+{formatWon(sc.deltaMonthlyPaymentWon)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Reverse Jeonse Shortfall Table */}
              <div className="bg-body p-5 rounded-2xl border border-border/50">
                <h3 className="text-sm font-extrabold text-primary mb-3">4. 전세보증금 반환대출(역전세) 결손액 진단표</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px] text-secondary">
                    <caption className="sr-only">전세보증금 반환대출(역전세) 결손액 진단표</caption>
                    <thead className="border-b border-border/60 font-bold text-primary">
                      <tr>
                        <th className="pb-2">전세가 하락률</th>
                        <th className="pb-2">하락 후 보증금</th>
                        <th className="pb-2">반환 필요 결손액</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-medium">
                      {mortgageSsr.jeonseShortfalls.map((sf) => (
                        <tr key={sf.declineRate}>
                          <th className="py-2 font-bold text-primary">-{Math.round(sf.declineRate * 100)}% 하락</th>
                          <td className="py-2">{formatWon(sf.depositWon - sf.declineAmountWon)}</td>
                          <td className="py-2 text-red-700 dark:text-red-400 font-bold">{formatWon(sf.shortfallWon)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* FAQ Accordion / List */}
            <div className="bg-body p-5 sm:p-6 rounded-2xl border border-border/50 space-y-3">
              <h3 className="text-sm font-extrabold text-primary mb-2 flex items-center gap-1.5">
                <HelpCircle size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>자주 묻는 금융 및 부동산 질문 (FAQ)</span>
              </h3>
              <dl className="space-y-3 text-[13px]">
                {mortgageSsr.faqList.map((faq) => (
                  <div key={faq.question} className="border-b border-border/40 pb-3 last:border-0 last:pb-0">
                    <dt className="font-bold text-primary flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">Q.</span>
                      {faq.question}
                    </dt>
                    <dd className="mt-1 text-secondary pl-5 leading-relaxed font-medium">
                      {faq.answer}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

          </section>

          {/* Chapter 05 Post-Mortgage Zero-CLS AdSlot (High-CPC Mortgage & DSR Context) */}
          <div
            data-testid="ssr-adslot-ch05"
            className="w-full min-h-[250px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-4 flex flex-col justify-center overflow-hidden"
          >
            <AdSlot
              slotId="1000000002"
              refreshSlotId="1000000002_ssr_ch05"
              format="rectangle"
              minHeightClass="min-h-[250px]"
              cpaCampaignId="jeonse-sentinel"
              apartmentName={decodedName}
            />
          </div>

          {/* Chapter 06 Neighborhood & Zone Internal Link Mesh (SSR Crawl & User Recirculation) */}
          <section
            id="chapter-06-neighborhood-links-ssr"
            aria-label={`${decodedName} 소속 권역 및 인근 단지 비교 리포트`}
            className="space-y-5 pt-4 border-t border-slate-200 dark:border-slate-800"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
                  <MapPin size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    {aptDong ? `동탄 ${aptDong}` : '동탄 권역'} 주요 비교 단지 및 소속 권역 시세 리포트
                  </span>
                </h2>
                <p className="mt-1 text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 font-medium">
                  같은 행정동 및 생활권 내 주요 아파트 단지의 국토교통부 최신 실거래가와 입지 가치를 함께 비교해 보세요.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {parentZone && (
                  <Link
                    href={`/zone/${parentZone.id}`}
                    prefetch={false}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-slate-50 text-xs font-extrabold transition-colors"
                  >
                    <span>{parentZone.name} 전체 단지 보기</span>
                    <ArrowRight size={14} />
                  </Link>
                )}
                <Link
                  href="/explore"
                  prefetch={false}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/60 dark:bg-slate-800 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 text-xs font-extrabold transition-colors"
                >
                  <span>동탄 전체 단지 탐색</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {peerApartments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {peerApartments.map((peer) => (
                  <Link
                    key={peer.name}
                    href={`/apartment/${encodeURIComponent(peer.name)}`}
                    prefetch={false}
                    className="group bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 hover:border-emerald-300 dark:hover:border-emerald-700 rounded-2xl p-4 flex flex-col justify-between gap-2 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                          <Building2 size={12} />
                          <span>{peer.dong}</span>
                        </span>
                        {peer.txCount > 0 && (
                          <span className="font-mono tabular-nums">누적 {peer.txCount}건</span>
                        )}
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-50 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 truncate transition-colors">
                        {peer.name}
                      </h3>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/60">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        최근 실거래가
                      </span>
                      <span className="text-xs sm:text-[13px] font-mono tabular-nums font-extrabold text-emerald-700 dark:text-emerald-400">
                        {peer.latestPriceStr}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

        </div>
      </section>
    </>
  );
}
