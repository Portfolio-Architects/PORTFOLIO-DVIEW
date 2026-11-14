import { Metadata } from 'next';
import Link from 'next/link';
import { redirect, permanentRedirect } from 'next/navigation';
import {
  BarChart3,
  HelpCircle,
  Building2,
  MapPin,
  ArrowRight,
  BookOpen,
  GraduationCap,
  ChevronDown,
  TrainFront,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
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
  getSeoAccordionClass,
  getSeoAccordionSummaryClass,
  getSeoAccordionChevronClass,
  getSeoAccordionBodyClass,
  getVisualSignalPillClass,
  type VisualSignalTone,
} from '@/lib/design-system/copyDiet';
import {
  decodeAptName,
  formatPriceEok,
  getTxSummaryData,
  getApartmentsByDongData,
  getLocationScoresData,
  getApartmentPageData,
  buildApartmentJsonLd,
  buildApartmentSeoMetadata,
  getDefaultApartmentMetadata,
  buildMortgageSsrData,
  resolveCanonicalAptSlug,
  selectApartmentComparisonPeers,
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
export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  const txSummary = await getTxSummaryData();
  const aptNames = Object.keys(txSummary || {});
  const canonicalSlugs = Array.from(
    new Set(aptNames.map((name) => resolveCanonicalAptSlug(name, { txMap: txSummary }) || name))
  );
  return canonicalSlugs.map((aptName) => ({
    aptName,
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

export default async function ApartmentPage(props: {
  params: Promise<{ aptName: string }>;
  enforceCanonicalRedirect?: boolean;
}) {
  let decodedName = '아파트';
  let rawAptParam = '';

  try {
    const params = props.params ? await props.params : null;
    if (params?.aptName) {
      rawAptParam = params.aptName;
      decodedName = decodeAptName(params.aptName);
    }
  } catch {
    // fallback to default
  }

  if (process.env.NODE_ENV !== 'test' || props.enforceCanonicalRedirect) {
    const fastTxSummary = await getTxSummaryData();
    const fastCanonicalSlug = resolveCanonicalAptSlug(rawAptParam || decodedName, {
      txMap: fastTxSummary,
    });
    if (!fastCanonicalSlug || !fastTxSummary?.[fastCanonicalSlug]) {
      redirect('/explore');
    }
    let rawDecodedOnce = rawAptParam;
    try {
      rawDecodedOnce = decodeURIComponent(rawAptParam);
    } catch {
      // ignore malformed URI sequence
    }
    if (rawDecodedOnce !== fastCanonicalSlug) {
      permanentRedirect(`/apartment/${encodeURIComponent(fastCanonicalSlug)}`);
    }
  }

  const pageData = await getApartmentPageData(decodedName);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  const jsonLd = buildApartmentJsonLd(pageData, baseUrl);

  const {
    canonicalSlug: pageCanonicalSlug,
    resolvedTxKey: pageResolvedTxKey,
    aptSummary,
    pyeongSummaries,
    locationScore,
    matchedReportData,
    matchedDongApt,
    aiBriefing,
  } = pageData;

  const aptDong = aptSummary?.dong || matchedDongApt?.dong || matchedReportData?.dong || '';
  const [allTxSummary, allByDong, allLocationScores] = await Promise.all([
    getTxSummaryData(),
    getApartmentsByDongData(),
    getLocationScoresData(),
  ]);
  const canonicalSlug =
    pageCanonicalSlug ||
    pageResolvedTxKey ||
    resolveCanonicalAptSlug(decodedName, {
      txKey: matchedDongApt?.txKey,
      txMap: allTxSummary,
      sheetApartments: allByDong,
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
  };

  const mortgageSsr =
    pageData.mortgageSsr ||
    buildMortgageSsrData(
      decodedName,
      aptSummary?.latestPrice || (pyeongSummaries.length > 0 ? pyeongSummaries[0].latestPrice : 0),
      aptSummary?.latestRentDeposit || (pyeongSummaries.length > 0 ? pyeongSummaries[0].latestDeposit : 0),
      {
        aptSummary,
        pyeongSummaries,
        locationScore,
        analytics: pageData.analytics,
        txs: pageData.txs,
        tradeSummary: pageData.tradeSummary,
      }
    );

  const parentZoneId = aptDong ? dongToZoneId(aptDong) : null;
  const parentZone = parentZoneId ? getZoneById(parentZoneId) : undefined;
  const { sameZoneSimilarPerPyeongTop5, schoolZoneCompetitors } = selectApartmentComparisonPeers({
    aptName: decodedName,
    canonicalSlug,
    resolvedTxKey,
    aptDong,
    targetPerPyeongManwon: pageData.tradeSummary?.perPyeongManwon,
    locationScore,
    allTxSummary,
    byDong: allByDong,
    allLocationScores,
  });

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

  const latestSalePriceStr = formatSummaryPriceField(aptSummary?.latestPrice, aptSummary?.latestPriceEok);
  const latestRentPriceStr = formatSummaryPriceField(
    aptSummary?.latestRentDeposit,
    aptSummary?.latestRentDepositEok
  );
  const jeonseTone: VisualSignalTone =
    ratioPercent <= 0 ? 'neutral' : ratioPercent < 60 ? 'safe' : ratioPercent < 70 ? 'down' : 'up';
  const jeonseStatusLabel =
    ratioPercent <= 0 ? '산출 대기' : ratioPercent < 60 ? '안전 구간' : ratioPercent < 70 ? '적정 구간' : '주의 구간';
  const subwayWalkMinutes =
    typeof locationScore?.distanceToSubway === 'number' && locationScore.distanceToSubway > 0
      ? Math.max(1, Math.round(locationScore.distanceToSubway / 70))
      : null;
  const elemWalkMinutes =
    typeof locationScore?.distanceToElementary === 'number' && locationScore.distanceToElementary > 0
      ? Math.max(1, Math.round(locationScore.distanceToElementary / 70))
      : null;

  return (
    <>
      <PreGaCanonicalSync canonicalPath={canonicalPath} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />

      <LoungeHeader activeTab="explore" />

      <DashboardClient
        initialDashboardData={scopedInitialData}
        preselectedAptName={decodedName}
        autoOpenPreselectedModal={false}
        hideHeader={true}
      />

      {/* High-Value Comprehensive Apartment Analysis Report (Content-First Visible SSR Report for Users & Search Crawlers) */}
      <section
        id="apt-ssr-comprehensive-report"
        data-testid="apt-ssr-comprehensive-report"
        className="w-full max-w-[2000px] mx-auto px-2 sm:px-6 md:px-10 lg:px-16 py-8 my-6 overflow-x-clip"
      >
        <div className="bg-surface rounded-3xl p-2 sm:p-8 space-y-8 min-w-0">
          
          {/* Header Summary + Layer 1 3-Second Visual Signal Strip */}
          <div className="border-b border-border/60 pb-6">
            <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[12px] font-extrabold px-3 py-1 rounded-full mb-3">
              <BarChart3 size={13} className="shrink-0" />
              <span>D-VIEW 부동산 데이터 랩스 정밀 진단</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tight line-clamp-2 sm:line-clamp-1">
              {decodedName} 아파트 실거래가 및 입지 심층 분석 리포트
            </h1>

            {/* Layer 1: 3-Second Visual Decision KPI & Signal Strip */}
            <div
              data-testid="apt-visual-signal-strip"
              className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2.5 min-w-0"
            >
              {/* Card 1: Latest Real Sale Price */}
              <div className="rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-3.5 sm:p-4 flex flex-col justify-between gap-2 min-w-0">
                <span className="text-[11px] font-bold text-tertiary truncate">최근 실거래</span>
                <div className="text-base sm:text-lg font-black text-primary tabular-nums truncate">
                  {latestSalePriceStr}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={getVisualSignalPillClass('safe', 'tabular-nums')}>
                    <TrendingUp size={11} className="shrink-0" />
                    <span>
                      {pageData.tradeSummary?.perPyeongStr &&
                      pageData.tradeSummary.perPyeongStr.length <= 7
                        ? `평당 ${pageData.tradeSummary.perPyeongStr}`
                        : pageData.tradeSummary?.perPyeongStr
                        ? '평당가 기준'
                        : '전월세 참고'}
                    </span>
                  </span>
                  {(!pageData.tradeSummary?.perPyeongStr ||
                    pageData.tradeSummary.perPyeongStr.length > 7) && (
                    <span className="text-[11px] font-semibold text-secondary tabular-nums truncate">
                      {pageData.tradeSummary?.perPyeongStr || latestRentPriceStr}
                    </span>
                  )}
                </div>
              </div>

              {/* Card 2: Jeonse Ratio 3-Step Visual Gauge & Safety Badge */}
              <div className="rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-3.5 sm:p-4 flex flex-col justify-between gap-2 min-w-0">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[11px] font-bold text-tertiary truncate">전세가율 진단</span>
                  <span className={getVisualSignalPillClass(jeonseTone)}>
                    {ratioPercent >= 70 ? (
                      <AlertTriangle size={11} className="shrink-0" />
                    ) : (
                      <ShieldCheck size={11} className="shrink-0" />
                    )}
                    <span>{jeonseStatusLabel}</span>
                  </span>
                </div>
                <div className="text-base sm:text-lg font-black text-primary tabular-nums truncate">
                  {ratioPercent > 0 ? `${ratioPercent.toFixed(1)}%` : '정보 없음'}
                </div>
                <div
                  data-testid="apt-jeonse-3step-gauge"
                  className="grid grid-cols-3 gap-1 h-1.5 w-full"
                >
                  <span
                    className={`rounded-full ${
                      ratioPercent > 0
                        ? 'bg-emerald-600 dark:bg-emerald-400'
                        : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                  <span
                    className={`rounded-full ${
                      ratioPercent >= 60
                        ? 'bg-blue-600 dark:bg-blue-400'
                        : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                  <span
                    className={`rounded-full ${
                      ratioPercent >= 70 ? 'bg-brand-red' : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Card 3: Subway & Elementary School Walking Spec Chips */}
              <div className="rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-3.5 sm:p-4 flex flex-col justify-between gap-1.5 min-w-0">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[11px] font-bold text-tertiary truncate">교통 · 초등학군</span>
                  <span
                    className={getVisualSignalPillClass(
                      subwayWalkMinutes && subwayWalkMinutes <= 10
                        ? 'down'
                        : elemWalkMinutes && elemWalkMinutes <= 7
                        ? 'safe'
                        : 'neutral',
                      'tabular-nums shrink-0'
                    )}
                  >
                    {subwayWalkMinutes ? (
                      <TrainFront size={11} className="shrink-0" />
                    ) : (
                      <GraduationCap size={11} className="shrink-0" />
                    )}
                    <span>
                      {subwayWalkMinutes
                        ? `역 도보 ${subwayWalkMinutes}분`
                        : elemWalkMinutes
                        ? `초교 ${elemWalkMinutes}분`
                        : '입지 스펙'}
                    </span>
                  </span>
                </div>
                <div className="text-sm sm:text-base font-black text-primary truncate">
                  {locationScore?.nearestStationName
                    ? `${locationScore.nearestStationName}역`
                    : locationScore?.nearestSchoolNames?.elementary || '역세권 정보 없음'}
                </div>
                <span className="text-[11px] font-semibold text-secondary tabular-nums truncate">
                  {locationScore?.nearestSchoolNames?.elementary
                    ? `${locationScore.nearestSchoolNames.elementary}${
                        elemWalkMinutes ? ` · 도보 ${elemWalkMinutes}분` : ''
                      }`
                    : '학군 정보 없음'}
                </span>
              </div>

              {/* Card 4: Scale & Building Age Spec */}
              <div className="rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-3.5 sm:p-4 flex flex-col justify-between gap-2 min-w-0">
                <span className="text-[11px] font-bold text-tertiary truncate">세대 · 준공연식</span>
                <div className="text-base sm:text-lg font-black text-primary tabular-nums truncate">
                  {householdCountNum > 0
                    ? `${householdCountNum.toLocaleString('ko-KR')}세대`
                    : `매매 ${totalSalesTxCount.toLocaleString('ko-KR')}건`}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={getVisualSignalPillClass('neutral', 'tabular-nums')}>
                    <span>
                      {yearBuiltNum > 0 && buildingAge !== null
                        ? `준공 ${buildingAge}년차`
                        : aptDong && aptDong.length <= 6
                        ? `동탄 ${aptDong}`
                        : '실거래 기준'}
                    </span>
                  </span>
                  {yearBuiltNum > 0 && (
                    <span className="text-[11px] font-semibold text-tertiary tabular-nums">
                      {yearBuiltNum}년
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Layer 2: Progressive SEO Accordion for AI Market Briefing */}
            <details className={getSeoAccordionClass('mt-3.5 bg-[#f9fafb] dark:bg-[#17171c]')}>
              <summary className={getSeoAccordionSummaryClass()}>
                <span>실거래 · 입지 핵심 브리핑 더보기</span>
                <ChevronDown size={16} className={getSeoAccordionChevronClass()} />
              </summary>
              <div className={getSeoAccordionBodyClass()}>
                <p className="text-secondary text-[13px] sm:text-[14px] leading-relaxed font-medium tabular-nums">
                  {aiBriefing}
                </p>
              </div>
            </details>

            <div className="mt-4">
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
            className="space-y-3.5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-primary tracking-tight flex items-center gap-2">
                <span className="w-2 h-5 bg-emerald-500 rounded-full" />
                입지 · 수급 · 밸류에이션 요약
              </h2>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={getVisualSignalPillClass('neutral')}>
                  {aptDong && aptDong.length <= 6 ? `동탄 ${aptDong}` : '동탄 권역'}
                </span>
                <span className={getVisualSignalPillClass('down', 'tabular-nums')}>
                  {dominantPyeong
                    ? `주력 ${dominantPyeong.pyeong}평형`
                    : `매매 ${totalSalesTxCount}건`}
                </span>
                {realPer && (
                  <span className={getVisualSignalPillClass(jeonseTone, 'tabular-nums')}>
                    {String(realPer).length <= 5 ? `PER ${realPer}배` : 'PER 산출'}
                  </span>
                )}
                {dominantPyeong && (
                  <span className="text-[11.5px] font-bold text-secondary tabular-nums">
                    평균 {dominantPyeong.avgPriceStr}
                  </span>
                )}
              </div>
            </div>

            <details className={getSeoAccordionClass('bg-[#f9fafb] dark:bg-[#17171c]')}>
              <summary className={getSeoAccordionSummaryClass()}>
                <span>밸류에이션 산출 기준 · 입지 해설 더보기</span>
                <ChevronDown size={16} className={getSeoAccordionChevronClass()} />
              </summary>
              <div className={getSeoAccordionBodyClass('space-y-3')}>
                <h3 className="text-xs sm:text-sm font-extrabold text-primary">
                  {decodedName} 입지 포지셔닝 및 실거래 밸류에이션 심층 해설
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-[13px] text-secondary">
                  <article className="bg-surface dark:bg-[#1e1e24] p-4 rounded-2xl space-y-2">
                    <h3 className="text-sm font-extrabold text-primary">
                      1. {parentZone ? `${parentZone.name}(${aptDong || parentZone.dongLabel})` : `동탄 ${aptDong || '핵심 권역'}`} 입지 포지셔닝
                    </h3>
                    <p className="leading-relaxed">
                      {parentZone
                        ? `${decodedName} 단지는 ${parentZone.name}(${parentZone.dongLabel}) 권역에 속하며, ${parentZone.description}`
                        : `${decodedName} 단지는 화성시 동탄 ${aptDong || '신도시'} 생활권 내에 위치하여 광역 교통망과 중심 상업·교육 인프라를 공유합니다.`}
                    </p>
                  </article>

                  <article className="bg-surface dark:bg-[#1e1e24] p-4 rounded-2xl space-y-2">
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

                  <article className="bg-surface dark:bg-[#1e1e24] p-4 rounded-2xl space-y-2">
                    <h3 className="text-sm font-extrabold text-primary">
                      3. 실거주 PER 및 전세 안전 마진 진단
                    </h3>
                    <p className="leading-relaxed tabular-nums">
                      {jeonsePerComment}
                    </p>
                  </article>
                </div>
              </div>
            </details>

            {relatedGuides.length > 0 && (
              <div
                data-testid="apt-top-guide-anchor-card"
                className="rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">
                    <BookOpen size={13} className="shrink-0" />
                    <span>
                      {hasDirectGuideMatch
                        ? `${decodedName} 수록 1:1 비교 가이드`
                        : `${matchedGuideZone?.name || parentZone?.name || aptDong} 권역 1:1 비교 가이드`}
                    </span>
                  </div>
                  <p className="text-xs sm:text-[13px] font-extrabold text-primary">
                    {relatedGuides[0].title}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Link
                    href={`/guide/${relatedGuides[0].slug}`}
                    prefetch={false}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-colors"
                  >
                    <span>심층 비교 리포트 읽기</span>
                    <ArrowRight size={13} />
                  </Link>
                  <a
                    href="#apt-related-guides-ssr"
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-surface border border-border/70 text-secondary hover:text-primary text-xs font-bold transition-colors"
                  >
                    <span>연관 가이드 {relatedGuides.length}편 보기</span>
                  </a>
                </div>
              </div>
            )}
          </section>

          {/* School & Infrastructure Location Analytics (Visual Signal Spec Cards) */}
          {locationScore && (
            <div className="space-y-3.5">
              <h2 className="text-lg sm:text-xl font-extrabold text-primary tracking-tight flex items-center gap-2">
                <span className="w-2 h-5 bg-emerald-500 rounded-full" />
                학군 · 교통 인프라 스펙
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[13px] text-secondary">
                {locationScore.nearestSchoolNames?.elementary && (
                  <div className="bg-[#f9fafb] dark:bg-[#17171c] p-4 rounded-2xl flex flex-col justify-between gap-2">
                    <span className="text-[11px] font-bold text-tertiary">배정 초등학교</span>
                    <strong className="text-primary text-[14px] truncate">{locationScore.nearestSchoolNames.elementary}</strong>
                    <div className="flex items-center justify-between gap-2">
                      <span className={getVisualSignalPillClass('safe', 'tabular-nums w-fit')}>
                        <GraduationCap size={11} className="shrink-0" />
                        <span>도보 {Math.round((locationScore.distanceToElementary || 0) / 70) || 1}분</span>
                      </span>
                      <span className="text-[11px] font-bold text-tertiary tabular-nums">
                        {Math.round(locationScore.distanceToElementary || 0)}m
                      </span>
                    </div>
                  </div>
                )}
                {locationScore.nearestSchoolNames?.middle && (
                  <div className="bg-[#f9fafb] dark:bg-[#17171c] p-4 rounded-2xl flex flex-col justify-between gap-2">
                    <span className="text-[11px] font-bold text-tertiary">인근 중학교</span>
                    <strong className="text-primary text-[14px] truncate">{locationScore.nearestSchoolNames.middle}</strong>
                    <span className={getVisualSignalPillClass('neutral', 'w-fit')}>
                      <GraduationCap size={11} className="shrink-0" />
                      <span>배정 학군권</span>
                    </span>
                  </div>
                )}
                {locationScore.nearestSchoolNames?.high && (
                  <div className="bg-[#f9fafb] dark:bg-[#17171c] p-4 rounded-2xl flex flex-col justify-between gap-2">
                    <span className="text-[11px] font-bold text-tertiary">인근 고등학교</span>
                    <strong className="text-primary text-[14px] truncate">{locationScore.nearestSchoolNames.high}</strong>
                    <span className={getVisualSignalPillClass('neutral', 'w-fit')}>
                      <GraduationCap size={11} className="shrink-0" />
                      <span>통학 생활권</span>
                    </span>
                  </div>
                )}
                {locationScore.nearestStationName && (
                  <div className="bg-[#f9fafb] dark:bg-[#17171c] p-4 rounded-2xl flex flex-col justify-between gap-2">
                    <span className="text-[11px] font-bold text-tertiary">대중교통 · 철도</span>
                    <strong className="text-primary text-[14px] truncate">
                      {locationScore.nearestStationLine || '지하철'} {locationScore.nearestStationName}역
                    </strong>
                    <div className="flex items-center justify-between gap-2">
                      <span className={getVisualSignalPillClass('down', 'tabular-nums w-fit')}>
                        <TrainFront size={11} className="shrink-0" />
                        <span>도보 {Math.round((locationScore.distanceToSubway || 0) / 70) || 1}분</span>
                      </span>
                      <span className="text-[11px] font-bold text-tertiary tabular-nums">
                        {Math.round(locationScore.distanceToSubway || 0)}m
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* On-site Scouting Assessment (Layer 2 Progressive SEO Accordion) */}
          {matchedReportData?.sections && (
            <div className="space-y-3">
              <h2 className="text-lg sm:text-xl font-extrabold text-primary tracking-tight flex items-center gap-2">
                <span className="w-2 h-5 bg-emerald-500 rounded-full" />
                현장 임장 정성 평가
              </h2>
              <details className={getSeoAccordionClass('bg-[#f9fafb] dark:bg-[#17171c]')}>
                <summary className={getSeoAccordionSummaryClass()}>
                  <span>현장 임장 검증 · 정성 해설 더보기</span>
                  <ChevronDown size={16} className={getSeoAccordionChevronClass()} />
                </summary>
                <div className={getSeoAccordionBodyClass()}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px] text-secondary">
                    {matchedReportData.sections.assessment?.synthesis && (
                      <div className="bg-surface dark:bg-[#1e1e24] p-4 rounded-2xl col-span-1 md:col-span-2">
                        <h3 className="text-sm font-extrabold text-primary mb-1.5">단지 종합 가치 평가</h3>
                        <p className="leading-relaxed font-medium">{matchedReportData.sections.assessment.synthesis}</p>
                      </div>
                    )}
                    {matchedReportData.sections.ecosystem?.schoolText && (
                      <div className="bg-surface dark:bg-[#1e1e24] p-4 rounded-2xl">
                        <h3 className="text-sm font-extrabold text-primary mb-1.5">학군 및 교육 환경</h3>
                        <p className="leading-relaxed font-medium">{matchedReportData.sections.ecosystem.schoolText}</p>
                      </div>
                    )}
                    {matchedReportData.sections.location?.trafficText && (
                      <div className="bg-surface dark:bg-[#1e1e24] p-4 rounded-2xl">
                        <h3 className="text-sm font-extrabold text-primary mb-1.5">교통 및 도로 인프라</h3>
                        <p className="leading-relaxed font-medium">{matchedReportData.sections.location.trafficText}</p>
                      </div>
                    )}
                    {matchedReportData.sections.infra?.parkingText && (
                      <div className="bg-surface dark:bg-[#1e1e24] p-4 rounded-2xl col-span-1 md:col-span-2">
                        <h3 className="text-sm font-extrabold text-primary mb-1.5">주차 공간 및 입주민 편의 시설</h3>
                        <p className="leading-relaxed font-medium">{matchedReportData.sections.infra.parkingText}</p>
                      </div>
                    )}
                  </div>
                </div>
              </details>
            </div>
          )}

          {/* Pyeong-specific Transaction Summary Table (Chapter 02 SSR) */}
          <div id="chapter-02-pyeong-ssr" className="space-y-4 min-w-0">
            <h2 className="text-lg sm:text-xl font-extrabold text-primary tracking-tight flex items-center gap-2">
              <span className="w-2 h-5 bg-emerald-500 rounded-full" />
              평형별 실거래가 · 전세가율
            </h2>
            {pyeongSummaries.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl bg-[#f9fafb] dark:bg-[#17171c]">
                <table className="w-full text-left text-[13px] text-secondary">
                  <caption className="sr-only">{decodedName} 평형별 실거래가 · 전세가율 현황표</caption>
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
          {process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true' && (
            <div
              data-testid="ssr-adslot-ch02"
              className="w-full min-h-[250px] rounded-2xl bg-elevated dark:bg-slate-900 transition-colors flex flex-col justify-center overflow-hidden empty:hidden"
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
          )}

          {/* Mortgage & Stress DSR Analysis Section (Chapter 05 SSR) */}
          <section id="chapter-05-mortgage-ssr" className="space-y-6 pt-4 border-t border-border/60 min-w-0">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-primary tracking-tight flex items-center gap-2">
                <span className="w-2 h-5 bg-emerald-500 rounded-full" />
                주담대 상환 · DSR 한도 진단
              </h2>
              <p className="mt-1.5 text-[12.5px] text-tertiary font-medium tabular-nums">
                원금 {formatWon(mortgageSsr.principalWon)} · 30년 만기 · 금리 4.0% 가정 시뮬레이션 (차주별 한도 상이)
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Amortization Table */}
              <div className="bg-[#f9fafb] dark:bg-[#17171c] p-5 rounded-2xl min-w-0">
                <h3 className="text-sm font-extrabold text-primary mb-3">1. 상환 방식별 월 납부액 비교</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px] text-secondary">
                    <caption className="sr-only">{decodedName} 상환 방식별 월 납부액 비교표</caption>
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
              <div className="bg-[#f9fafb] dark:bg-[#17171c] p-5 rounded-2xl min-w-0">
                <h3 className="text-sm font-extrabold text-primary mb-3">2. 연소득별 스트레스 DSR 40% 한도표</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px] text-secondary">
                    <caption className="sr-only">{decodedName} 연소득별 스트레스 DSR 40% 한도표</caption>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Rate Shock Table */}
              <div className="bg-[#f9fafb] dark:bg-[#17171c] p-5 rounded-2xl min-w-0">
                <h3 className="text-sm font-extrabold text-primary mb-3">3. 금리 변동 시나리오별 상환 부담표</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px] text-secondary">
                    <caption className="sr-only">{decodedName} 금리 변동 시나리오별 월 상환 부담표</caption>
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
              <div className="bg-[#f9fafb] dark:bg-[#17171c] p-5 rounded-2xl min-w-0">
                <h3 className="text-sm font-extrabold text-primary mb-3">4. 전세보증금 반환대출(역전세) 결손액 진단표</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px] text-secondary">
                    <caption className="sr-only">{decodedName} 역전세 보증금 반환 결손액 진단표</caption>
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

            {/* Layer 2 Progressive SEO Accordion: Mortgage & Real Estate FAQ */}
            <details className={getSeoAccordionClass('bg-[#f9fafb] dark:bg-[#17171c]')}>
              <summary className={getSeoAccordionSummaryClass()}>
                <span className="inline-flex items-center gap-1.5">
                  <HelpCircle size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>주담대 · 전세 안전 FAQ 4선 더보기</span>
                </span>
                <ChevronDown size={16} className={getSeoAccordionChevronClass()} />
              </summary>
              <div className={getSeoAccordionBodyClass()}>
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
            </details>

          </section>

          {/* Chapter 05 Post-Mortgage Zero-CLS AdSlot (High-CPC Mortgage & DSR Context) */}
          {process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true' && (
            <div
              data-testid="ssr-adslot-ch05"
              className="w-full min-h-[250px] rounded-2xl bg-elevated dark:bg-slate-900 transition-colors flex flex-col justify-center overflow-hidden empty:hidden"
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
          )}

          {/* Chapter 06 Neighborhood & Zone Internal Link Mesh (SSR Crawl & User Recirculation) */}
          <section
            id="chapter-06-neighborhood-links-ssr"
            aria-label={`${decodedName} 소속 권역 및 인근 단지 비교 리포트`}
            className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-800"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
                  <MapPin size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>인근 유사 평당가 · 학군 비교</span>
                </h2>
                <p className="mt-1 text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 font-medium">
                  동일 권역 평당가 근접 TOP 5 · 배정 학군 경쟁 단지 1:1 시세
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

            {sameZoneSimilarPerPyeongTop5.length > 0 && (
              <div
                id="apt-similar-per-pyeong-top5-ssr"
                data-testid="apt-similar-per-pyeong-top5-ssr"
                className="space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                    <Building2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      같은 동(권역) 내 평당가 유사 단지 TOP 5
                      {pageData.tradeSummary?.perPyeongStr
                        ? ` (기준 평당가 ${pageData.tradeSummary.perPyeongStr})`
                        : ''}
                    </span>
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    국토부 실거래 평당가 근접순
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {sameZoneSimilarPerPyeongTop5.map((peer, idx) => (
                    <Link
                      key={peer.canonicalSlug}
                      href={`/apartment/${encodeURIComponent(peer.canonicalSlug)}`}
                      prefetch={false}
                      className="group bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 hover:border-emerald-300 dark:hover:border-emerald-700 rounded-2xl p-4 flex flex-col justify-between gap-2.5 transition-colors"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-extrabold tabular-nums">
                            TOP {idx + 1} · {peer.dong}
                          </span>
                          {peer.txCount > 0 && (
                            <span className="tabular-nums">누적 {peer.txCount}건</span>
                          )}
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-50 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 truncate transition-colors">
                          {peer.name}
                        </h4>
                      </div>
                      <div className="space-y-1 pt-2 border-t border-slate-200/80 dark:border-slate-700/60 text-xs tabular-nums">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            평당가
                          </span>
                          <span className="font-extrabold text-slate-900 dark:text-slate-100">
                            {peer.perPyeongStr}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            최근 실거래가
                          </span>
                          <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                            {peer.latestPriceStr}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {schoolZoneCompetitors.length > 0 && (
              <div
                id="apt-school-zone-competitors-ssr"
                data-testid="apt-school-zone-competitors-ssr"
                className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                    <GraduationCap size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>
                      인접 학군 경쟁 단지 비교
                      {locationScore?.nearestSchoolNames?.elementary
                        ? ` (${locationScore.nearestSchoolNames.elementary}${
                            locationScore.nearestSchoolNames.middle
                              ? ` · ${locationScore.nearestSchoolNames.middle}`
                              : ''
                          })`
                        : ''}
                    </span>
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    동일 배정 초등학교 · 중학교 학군 기준
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {schoolZoneCompetitors.map((peer) => (
                    <Link
                      key={peer.canonicalSlug}
                      href={`/apartment/${encodeURIComponent(peer.canonicalSlug)}`}
                      prefetch={false}
                      className="group bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 hover:border-blue-300 dark:hover:border-blue-700 rounded-2xl p-4 flex flex-col justify-between gap-2.5 transition-colors"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 font-extrabold">
                            {peer.matchType}
                          </span>
                          <span>{peer.dong}</span>
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-50 group-hover:text-blue-700 dark:group-hover:text-blue-400 truncate transition-colors">
                          {peer.name}
                        </h4>
                        <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 truncate">
                          배정초: {peer.elementarySchool}
                          {peer.middleSchool ? ` · ${peer.middleSchool}` : ''}
                        </p>
                      </div>
                      <div className="space-y-1 pt-2 border-t border-slate-200/80 dark:border-slate-700/60 text-xs tabular-nums">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            평당가
                          </span>
                          <span className="font-extrabold text-slate-900 dark:text-slate-100">
                            {peer.perPyeongStr}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            최근 실거래가
                          </span>
                          <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                            {peer.latestPriceStr}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
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

            {/* Thematic House Price Comparison Hub Bridge (SSR Internal Link Mesh to /stats Issues #2, #3, #4, #5) */}
            <div
              id="apt-thematic-stats-bridge-ssr"
              data-testid="apt-thematic-stats-bridge-ssr"
              className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <BarChart3 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    {decodedName} 입지 테마별 집값 비교 통계 리포트 (초품아·호수공원·연식별·동탄1 vs 2)
                  </span>
                </h3>
                <Link
                  href="/stats"
                  prefetch={false}
                  className="text-xs font-extrabold text-blue-700 dark:text-blue-400 hover:underline inline-flex items-center gap-1 shrink-0"
                >
                  <span>아파트 통계 전체보기</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 tabular-nums">
                <Link
                  href="/stats?topic=school-district-premium#school-district-premium"
                  prefetch={false}
                  className="group bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 hover:border-blue-300 dark:hover:border-blue-700 rounded-2xl p-4 flex flex-col justify-between gap-2 transition-colors"
                >
                  <div className="space-y-1">
                    <span className="text-[11px] font-extrabold text-blue-700 dark:text-blue-400">
                      Issue #2 · 초품아·학군 프리미엄
                    </span>
                    <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-slate-50 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors leading-snug">
                      초품아 vs 일반 단지 · 학원가 밀집도별 집값 격차 비교
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                      {locationScore?.nearestSchoolNames?.elementary
                        ? `${locationScore.nearestSchoolNames.elementary}${
                            typeof locationScore.distanceToElementary === 'number'
                              ? ` (${locationScore.distanceToElementary}m)`
                              : ''
                          }`
                        : '배정 초등학교 도보권'}{' '}
                      학군 시세 위치 확인
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 inline-flex items-center gap-1">
                    <span>학군별 집값 통계 열기</span>
                    <ArrowRight size={11} />
                  </span>
                </Link>

                <Link
                  href="/stats?topic=lake-park-view-premium#lake-park-view-premium"
                  prefetch={false}
                  className="group bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 hover:border-emerald-300 dark:hover:border-emerald-700 rounded-2xl p-4 flex flex-col justify-between gap-2 transition-colors"
                >
                  <div className="space-y-1">
                    <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">
                      Issue #3 · 호수공원 조망권 비교
                    </span>
                    <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-slate-50 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                      동탄호수공원 수변·도보권 vs 비수변 집값·회전율 비교
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                      {aptDong ? `동탄 ${aptDong}` : '동탄 권역'} 대비 수변 랜드마크 평당가·회전율 격차 확인
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                    <span>호수공원 집값 통계 열기</span>
                    <ArrowRight size={11} />
                  </span>
                </Link>

                <Link
                  href="/stats?topic=building-age-depreciation#building-age-depreciation"
                  prefetch={false}
                  className="group bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 hover:border-blue-300 dark:hover:border-blue-700 rounded-2xl p-4 flex flex-col justify-between gap-2 transition-colors"
                >
                  <div className="space-y-1">
                    <span className="text-[11px] font-extrabold text-blue-700 dark:text-blue-400">
                      Issue #4 · 연식별 감가·방어율 비교
                    </span>
                    <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-slate-50 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors leading-snug">
                      신축(5년 이하) vs 준신축 vs 구축 집값·전고점 방어율 비교
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                      {yearBuiltNum > 0 && buildingAge !== null
                        ? `${yearBuiltNum}년 준공(${buildingAge}년차) 연식 구간 시세 방어율 비교`
                        : '준공 연차별 감가상각 및 시세 방어율 비교'}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 inline-flex items-center gap-1">
                    <span>연식별 집값 통계 열기</span>
                    <ArrowRight size={11} />
                  </span>
                </Link>

                <Link
                  href="/stats?topic=dongtan-1-vs-2-comparison#dongtan-1-vs-2-comparison"
                  prefetch={false}
                  className="group bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 hover:border-emerald-300 dark:hover:border-emerald-700 rounded-2xl p-4 flex flex-col justify-between gap-2 transition-colors"
                >
                  <div className="space-y-1">
                    <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">
                      VS 특집 · 동탄1 vs 동탄2 집값 비교
                    </span>
                    <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-slate-50 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                      동탄1신도시 vs 동탄2신도시 평형별·예산대별 실거래 비교
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                      법정동별 평균 매매가 및 6억~15억+ 예산대별 단지 분포 비교
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                    <span>동탄1 vs 2 통계 열기</span>
                    <ArrowRight size={11} />
                  </span>
                </Link>
              </div>
            </div>
          </section>

        </div>
      </section>
    </>
  );
}
