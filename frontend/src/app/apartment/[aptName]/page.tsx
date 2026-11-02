import { Metadata } from 'next';
import Link from 'next/link';
import { BarChart3, HelpCircle, Building2, MapPin, ArrowRight, BookOpen } from 'lucide-react';
import DashboardClient from '@/components/DashboardClient';
import LoungeHeader from '@/components/LoungeHeader';
import { AdSlot } from '@/components/ads/AdSlot';
import ReportShareBar from '@/components/common/ReportShareBar';
import PreGaCanonicalSync from '@/components/common/PreGaCanonicalSync';
import type { DashboardInitialDataLocal } from '@/hooks/useDashboardMeta';
import type { LocationScoreItem } from '@/types/transaction';
import { safeJsonLd } from '@/lib/utils/structuredData';
import { dongToZoneId, getZoneById } from '@/lib/zones';
import { getRelatedGuidesForApartment } from '@/lib/data/guides';
import {
  decodeAptName,
  formatPriceEok,
  getTxSummaryData,
  getApartmentPageData,
  buildApartmentJsonLd,
  buildApartmentSeoMetadata,
  getDefaultApartmentMetadata,
  buildMortgageSsrData,
  resolveCanonicalAptSlug,
} from '@/lib/services/apartmentPageService';

function formatWon(val: number): string {
  if (!Number.isFinite(val) || val <= 0) return '0원';
  return `${Math.round(val).toLocaleString('ko-KR')}원`;
}

function formatSummaryPriceField(numManwon?: number, eokStr?: string): string {
  if (typeof numManwon === 'number' && Number.isFinite(numManwon) && numManwon > 0) {
    const trimmed = eokStr?.trim();
    if (trimmed && trimmed !== '0' && trimmed !== '0만' && trimmed !== '0억' && trimmed !== '정보 없음') {
      return /[억만]/.test(trimmed) ? trimmed : `${trimmed}억`;
    }
    return formatPriceEok(numManwon);
  }
  const trimmed = eokStr?.trim();
  if (!trimmed || trimmed === '0' || trimmed === '0만' || trimmed === '0억' || trimmed === '정보 없음') {
    return '정보 없음';
  }
  return /[억만]/.test(trimmed) ? trimmed : `${trimmed}억`;
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
  const allTxSummary = await getTxSummaryData();
  const canonicalSlug =
    pageResolvedTxKey ||
    resolveCanonicalAptSlug(decodedName, {
      txKey: matchedDongApt?.txKey,
      txMap: allTxSummary,
      dong: aptDong,
    }) ||
    decodedName;
  const resolvedTxKey =
    pageResolvedTxKey ||
    (canonicalSlug !== decodedName ? canonicalSlug : matchedDongApt?.txKey || (aptSummary ? decodedName : undefined));
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
            [canonicalSlug]: aptSummary,
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
              txKey: canonicalSlug,
            },
            ...(matchedDongApt?.name && matchedDongApt.name !== decodedName
              ? {
                  [matchedDongApt.name]: {
                    ...matchedDongApt,
                    dong: aptDong,
                    txKey: canonicalSlug,
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
  const peerApartments = Object.entries(allTxSummary || {})
    .filter(([name, s]) => {
      if (!s || name === decodedName || name === resolvedTxKey || name === canonicalSlug) return false;
      if ((s.latestPrice || 0) <= 0) return false;
      return aptDong ? s.dong === aptDong : true;
    })
    .map(([name, s]) => {
      const dong = s.dong || aptDong || '동탄';
      return {
        name,
        canonicalSlug: resolveCanonicalAptSlug(name, { txMap: allTxSummary, dong }) || name,
        dong,
        latestPrice: s.latestPrice || 0,
        latestPriceStr: s.latestPriceEok || formatPriceEok(s.latestPrice || 0),
        txCount: s.txCount || 0,
      };
    })
    .sort((a, b) => b.latestPrice - a.latestPrice)
    .slice(0, 8);

  const {
    relatedGuides,
    hasDirectMatch: hasDirectGuideMatch,
    zone: matchedGuideZone,
  } = getRelatedGuidesForApartment({
    aptName: decodedName,
    resolvedTxKey,
    dong: aptDong,
    minPadCount: 3,
  });

  const canonicalPath = `/apartment/${encodeURIComponent(canonicalSlug)}`;

  const currentYear = 2026;
  const yearBuiltNum = matchedDongApt?.yearBuilt ? Number(matchedDongApt.yearBuilt) : 0;
  const buildingAge = yearBuiltNum > 1980 && yearBuiltNum <= currentYear + 3 ? Math.max(0, currentYear - yearBuiltNum) : null;
  const householdCountNum = matchedDongApt?.householdCount ? Number(matchedDongApt.householdCount) : 0;
  const ratioPercent = pageData.analytics?.ratioPercent || 0;
  const realPer =
    ratioPercent > 0 ? (100 / ratioPercent).toFixed(2) : null;
  const dominantPyeong =
    pyeongSummaries.length > 0
      ? [...pyeongSummaries].sort((a, b) => b.salesCount + b.rentCount - (a.salesCount + a.rentCount))[0]
      : null;
  const totalSalesTxCount =
    pyeongSummaries.reduce((acc, p) => acc + (p.salesCount || 0), 0) || aptSummary?.txCount || 0;
  const totalRentTxCount = pyeongSummaries.reduce((acc, p) => acc + (p.rentCount || 0), 0);

  const ageLifecycleComment =
    buildingAge === null
      ? `${decodedName} 단지는 동탄 ${aptDong || '핵심'} 생활권의 기반 시설과 커뮤니티 동선을 공유하며, 실거주 수요층의 꾸준한 거래가 이어지는 단지입니다.`
      : buildingAge <= 5
      ? `${yearBuiltNum}년 준공(연식 약 ${buildingAge}년 차)된 신축급 단지로, 최신 지하주차장 특화 설계와 커뮤니티 시설·조경 프리미엄이 시세 상방 탄력성을 견인하고 있습니다.`
      : buildingAge <= 11
      ? `${yearBuiltNum}년 준공(연식 약 ${buildingAge}년 차)된 준신축 단지로, 단지 내 조경과 인근 상권·학군 인프라가 완전히 정착되어 실거주 만족도와 환금성이 균형을 이루는 시기입니다.`
      : `${yearBuiltNum}년 준공(연식 약 ${buildingAge}년 차)된 성숙기 단지로, 대지지분 가치와 완성된 중심 상권·학군 접근성을 바탕으로 탄탄한 전세 수요와 하방 경직성을 확보하고 있습니다.`;

  const scaleLiquidityComment =
    householdCountNum >= 1000
      ? `총 ${householdCountNum.toLocaleString('ko-KR')}세대 규모의 메가 대단지로, 관리비 절감 효과와 단지 내 커뮤니티 규모 경제는 물론 하락장에서도 거래 절벽 위험이 낮은 대표적 고유동성 단지입니다.`
      : householdCountNum >= 500
      ? `총 ${householdCountNum.toLocaleString('ko-KR')}세대 규모의 중대형 단지로, 안정적인 매물 회전율과 쾌적한 동간 거리를 확보하여 실수요 갈아타기 수요가 두텁게 형성되어 있습니다.`
      : householdCountNum > 0
      ? `총 ${householdCountNum.toLocaleString('ko-KR')}세대 규모의 실속형 단지로, 인근 대단지 생활권의 학군·상업 인프라를 동일하게 누리면서도 합리적인 진입 가격대를 형성하는 것이 강점입니다.`
      : `누적 매매 ${totalSalesTxCount.toLocaleString('ko-KR')}건·전월세 ${totalRentTxCount.toLocaleString('ko-KR')}건의 실거래 데이터가 축적되어 있어 평형별 시세 밴드와 실수요 지지선을 명확히 확인할 수 있습니다.`;

  const safetyMarginManwon = Math.max(
    0,
    (pageData.analytics?.salesVal || aptSummary?.latestPrice || 0) -
      (pageData.analytics?.jeonseVal || aptSummary?.latestRentDeposit || 0)
  );
  const hugEstimatedLimitManwon = Math.round(
    (pageData.analytics?.salesVal || aptSummary?.latestPrice || 0) * 0.68 * 1.26
  );

  const jeonsePerComment =
    ratioPercent >= 70
      ? `현재 전세가율은 ${ratioPercent.toFixed(1)}%(실거주 PER ${realPer}배)로 동탄 평균 대비 높은 실사용 가치를 반영하고 있습니다. 매매가 대비 전세보증금 비율이 높아 자기자본 진입 장벽은 낮으나, 임대차 계약 시에는 HUG 전세보증금 반환보증 한도(추정 ${formatPriceEok(hugEstimatedLimitManwon)})와 등기부 선순위 채권 여부를 반드시 대조해야 합니다.`
      : ratioPercent >= 55
      ? `현재 전세가율은 ${ratioPercent.toFixed(1)}%(실거주 PER ${realPer}배)로 매매가와 전세가 간 안전 마진(${formatPriceEok(safetyMarginManwon)})이 균형 잡힌 표준 안정 구간입니다. 깡통전세 및 역전세 리스크가 낮고 실수요 하방 지지력이 견고하게 작동하는 밸류에이션 영역으로 평가됩니다.`
      : ratioPercent > 0
      ? `현재 전세가율은 ${ratioPercent.toFixed(1)}%(실거주 PER ${realPer}배)로 GTX-A 역세권·호수공원 조망 또는 신축 기대감 등 미래 가치 프리미엄이 매매가에 선반영된 구조입니다. 전세 보증금 안전 마진(${formatPriceEok(safetyMarginManwon)})이 매우 넓어 임차인 보증금 미반환 위험이 극히 낮습니다.`
      : `최근 실거래 매매가(${formatSummaryPriceField(aptSummary?.latestPrice, aptSummary?.latestPriceEok)})와 평형별 전월세 계약을 종합할 때, 자기자본 대비 대출 원리금 상환 비율(DSR 40%)을 중심으로 매수 타당성을 점검하는 것이 유효합니다.`;

  return (
    <>
      <PreGaCanonicalSync canonicalPath={canonicalPath} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />

      <LoungeHeader activeTab="explore" />

      {/* High-Value Comprehensive Apartment Analysis Report (Content-First Visible SSR Report for Users & Search Crawlers) */}
      <section
        id="apt-ssr-comprehensive-report"
        data-testid="apt-ssr-comprehensive-report"
        className="w-full max-w-[2000px] mx-auto px-2 sm:px-6 md:px-10 lg:px-16 py-8 my-6 overflow-x-clip"
      >
        <div className="bg-surface border border-border/80 rounded-3xl p-2 sm:p-10 shadow-sm space-y-10 min-w-0">
          
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
                canonicalPath={`/apartment/${encodeURIComponent(canonicalSlug)}`}
                campaign="apt_ssr_report"
              />
            </div>
          </div>

          {/* Chapter 01 Dynamic Complex-Specific Valuation & Structural Narrative */}
          <section
            id="chapter-01-dynamic-narrative-ssr"
            aria-label={`${decodedName} 단지별 입지·수급·밸류에이션 3대 핵심 해설`}
            className="space-y-4"
          >
            <h2 className="text-lg sm:text-xl font-extrabold text-primary tracking-tight flex items-center gap-2">
              <span className="w-2 h-5 bg-emerald-500 rounded-full" />
              {decodedName} 입지 포지셔닝 및 실거래 밸류에이션 심층 해설
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-[13px] text-secondary">
              <article className="bg-[#f9fafb] dark:bg-[#17171c] p-5 rounded-2xl space-y-2">
                <h3 className="text-sm font-extrabold text-primary">
                  1. {parentZone ? `${parentZone.name}(${aptDong || parentZone.dongLabel})` : `동탄 ${aptDong || '핵심 권역'}`} 입지 포지셔닝
                </h3>
                <p className="leading-relaxed">
                  {parentZone
                    ? `${decodedName} 단지는 ${parentZone.name}(${parentZone.dongLabel}) 권역에 속하며, ${parentZone.description}`
                    : `${decodedName} 단지는 화성시 동탄 ${aptDong || '신도시'} 생활권 내에 위치하여 광역 교통망과 중심 상업·교육 인프라를 공유합니다.`}
                </p>
              </article>

              <article className="bg-[#f9fafb] dark:bg-[#17171c] p-5 rounded-2xl space-y-2">
                <h3 className="text-sm font-extrabold text-primary">
                  2. 연식·세대 규모 및 주력 평형 수급 구조
                </h3>
                <p className="leading-relaxed tabular-nums">
                  {ageLifecycleComment} {scaleLiquidityComment}{' '}
                  {dominantPyeong
                    ? `단지 내 최다 거래 주력 평형은 ${dominantPyeong.pyeong}평형(전용 ${dominantPyeong.areaM2}㎡, 매매 ${dominantPyeong.salesCount}건·전세 ${dominantPyeong.rentCount}건)으로 최근 실거래가 ${dominantPyeong.latestPriceStr}, 평균가 ${dominantPyeong.avgPriceStr}를 기록 중입니다.`
                    : ''}
                </p>
              </article>

              <article className="bg-[#f9fafb] dark:bg-[#17171c] p-5 rounded-2xl space-y-2">
                <h3 className="text-sm font-extrabold text-primary">
                  3. 실거주 PER 및 전세 안전 마진 진단
                </h3>
                <p className="leading-relaxed tabular-nums">
                  {jeonsePerComment}
                </p>
              </article>
            </div>
          </section>

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
                    <p className="mt-1 text-tertiary tabular-nums">단지 기준 약 {locationScore.distanceToElementary || 0}m (도보 {Math.round((locationScore.distanceToElementary || 0) / 70) || 1}분)</p>
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
                    <p className="mt-1 text-tertiary tabular-nums">단지 기준 약 {locationScore.distanceToSubway || 0}m (도보 {Math.round((locationScore.distanceToSubway || 0) / 70) || 1}분)</p>
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
          <div id="chapter-02-pyeong-ssr" className="space-y-4 min-w-0">
            <h2 className="text-lg sm:text-xl font-extrabold text-primary tracking-tight flex items-center gap-2">
              <span className="w-2 h-5 bg-emerald-500 rounded-full" />
              {decodedName} 평형별 실거래가 및 전세가율 현황표
            </h2>
            {pyeongSummaries.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-border/60">
                <table className="w-full text-left text-[13px] text-secondary">
                  <caption className="sr-only">
                    {decodedName} 평형별 전용면적, 최근 실거래가, 평균 매매가, 최고가, 최근 전세가, 전세가율 및 거래량 현황표
                  </caption>
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
                  <tbody className="divide-y divide-border/40 font-medium tabular-nums">
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
              <div className="bg-body p-4 rounded-2xl border border-border/50 text-[13px] text-secondary tabular-nums">
                최근 매매가: {formatSummaryPriceField(aptSummary?.latestPrice, aptSummary?.latestPriceEok)} | 
                최근 1개월 평균가: {formatSummaryPriceField(aptSummary?.avg1MPrice, aptSummary?.avg1MPriceEok)} | 
                최근 전세가: {formatSummaryPriceField(aptSummary?.latestRentDeposit, aptSummary?.latestRentDepositEok)}
              </div>
            )}
          </div>

          {/* Chapter 02 Post-Table Zero-CLS AdSlot (High-CPC Real Estate Valuation Context) */}
          <div
            data-testid="ssr-adslot-ch02"
            className="w-full min-h-[250px] rounded-2xl bg-elevated dark:bg-slate-900 transition-colors flex flex-col justify-center overflow-hidden"
          >
            <AdSlot
              refreshSlotId="1000000002_ssr_ch02"
              format="rectangle"
              minHeightClass="min-h-[250px]"
              cpaCampaignId="mortgage-refinance"
              apartmentName={decodedName}
              dong={aptDong || undefined}
            />
          </div>

          {/* Mortgage & Stress DSR Analysis Section (Chapter 05 SSR) */}
          <section id="chapter-05-mortgage-ssr" className="space-y-6 pt-4 border-t border-border/60 min-w-0">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-primary tracking-tight flex items-center gap-2">
                <span className="w-2 h-5 bg-emerald-500 rounded-full" />
                {decodedName} 주택담보대출 상환 시뮬레이션 및 스트레스 DSR 진단
              </h2>
              <p className="mt-2 text-[13px] text-tertiary font-medium tabular-nums">
                대출원금 {formatWon(mortgageSsr.principalWon)}, 30년 만기, 기준금리 4.0%를 가정한 상환방식별 원리금 및 스트레스 DSR 40% 규제 분석표입니다.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Amortization Table */}
              <div className="bg-body p-5 rounded-2xl border border-border/50 min-w-0">
                <h3 className="text-sm font-extrabold text-primary mb-3">1. 상환 방식별 월 납부액 비교</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px] text-secondary">
                    <caption className="sr-only">{decodedName} 원리금균등 분할상환 및 원금균등 분할상환 상환 방식별 월 납부액 비교표</caption>
                    <thead className="border-b border-border/60 font-bold text-primary">
                      <tr>
                        <th className="pb-2">방식</th>
                        <th className="pb-2">초기 월납입</th>
                        <th className="pb-2">총 납부액</th>
                        <th className="pb-2">총 이자</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-medium tabular-nums">
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
              <div className="bg-body p-5 rounded-2xl border border-border/50 min-w-0">
                <h3 className="text-sm font-extrabold text-primary mb-3">2. 연소득별 스트레스 DSR 40% 한도표</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px] text-secondary">
                    <caption className="sr-only">{decodedName} 차주 연소득별 스트레스 DSR 40% 규제 대출한도표</caption>
                    <thead className="border-b border-border/60 font-bold text-primary">
                      <tr>
                        <th className="pb-2">차주 연소득</th>
                        <th className="pb-2">월 최대상환</th>
                        <th className="pb-2">최대 가용 대출액</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-medium tabular-nums">
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
              <div className="bg-body p-5 rounded-2xl border border-border/50 min-w-0">
                <h3 className="text-sm font-extrabold text-primary mb-3">3. 금리 변동 시나리오별 상환 부담표</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px] text-secondary">
                    <caption className="sr-only">{decodedName} 금리 변동 시나리오별 월 원리금 상환액 및 추가 이자 부담표</caption>
                    <thead className="border-b border-border/60 font-bold text-primary">
                      <tr>
                        <th className="pb-2">금리 변동 시나리오</th>
                        <th className="pb-2">적용 금리</th>
                        <th className="pb-2">월 상환액</th>
                        <th className="pb-2">추가 월부담</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-medium tabular-nums">
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
              <div className="bg-body p-5 rounded-2xl border border-border/50 min-w-0">
                <h3 className="text-sm font-extrabold text-primary mb-3">4. 전세보증금 반환대출(역전세) 결손액 진단표</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px] text-secondary">
                    <caption className="sr-only">{decodedName} 전세보증금 반환대출(역전세) 결손액 진단표</caption>
                    <thead className="border-b border-border/60 font-bold text-primary">
                      <tr>
                        <th className="pb-2">전세가 하락률</th>
                        <th className="pb-2">하락 후 보증금</th>
                        <th className="pb-2">반환 필요 결손액</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-medium tabular-nums">
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
            className="w-full min-h-[250px] rounded-2xl bg-elevated dark:bg-slate-900 transition-colors flex flex-col justify-center overflow-hidden"
          >
            <AdSlot
              refreshSlotId="1000000002_ssr_ch05"
              format="rectangle"
              minHeightClass="min-h-[250px]"
              cpaCampaignId="jeonse-sentinel"
              apartmentName={decodedName}
              dong={aptDong || undefined}
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
                    href={`/apartment/${encodeURIComponent(peer.canonicalSlug)}`}
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
                          <span className="tabular-nums">누적 {peer.txCount}건</span>
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
                      <span className="text-xs sm:text-[13px] tabular-nums font-extrabold text-emerald-700 dark:text-emerald-400">
                        {peer.latestPriceStr}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {relatedGuides.length > 0 && (
              <div
                id="apt-related-guides-ssr"
                className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                    <BookOpen size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>
                      {hasDirectGuideMatch
                        ? `${decodedName} 포함 1:1 실거래 맞대결 비교 가이드`
                        : `${matchedGuideZone?.name || parentZone?.name || aptDong} 권역 1:1 실거래 비교 가이드`}
                    </span>
                  </h3>
                  <Link
                    href="/guide"
                    prefetch={false}
                    className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 shrink-0"
                  >
                    <span>비교 가이드 전체보기</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {relatedGuides.map((guide) => (
                    <Link
                      key={guide.slug}
                      href={`/guide/${guide.slug}`}
                      prefetch={false}
                      className="group bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 hover:border-emerald-300 dark:hover:border-emerald-700 rounded-2xl p-4 flex flex-col justify-between gap-2 transition-colors"
                    >
                      <div className="space-y-1">
                        <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">
                          {guide.category}
                        </span>
                        <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-slate-50 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                          {guide.title}
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 inline-flex items-center gap-1">
                        <span>1:1 비교 리포트 열람</span>
                        <ArrowRight size={11} />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>

        </div>
      </section>

      <DashboardClient
        initialDashboardData={scopedInitialData}
        preselectedAptName={decodedName}
        autoOpenPreselectedModal={false}
        hideHeader={true}
      />
    </>
  );
}
