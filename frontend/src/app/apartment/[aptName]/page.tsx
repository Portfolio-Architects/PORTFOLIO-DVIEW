import { Metadata } from 'next';
import { redirect, permanentRedirect } from 'next/navigation';
import DashboardClient from '@/components/DashboardClient';
import LoungeHeader from '@/components/LoungeHeader';
import PreGaCanonicalSync from '@/components/common/PreGaCanonicalSync';
import ApartmentReportPart, {
  type CompactAptPyeongRow,
} from '@/components/apartment/ApartmentReportSections';
import type { DashboardInitialDataLocal } from '@/hooks/useDashboardMeta';
import type { LocationScoreItem } from '@/types/transaction';
import { safeJsonLd } from '@/lib/utils/structuredData';
import { dongToZoneId, getZoneById } from '@/lib/zones';
import { getRelatedGuidesForApartment } from '@/lib/data/guides';
import type { VisualSignalTone } from '@/lib/design-system/copyDiet';
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
  hasVerifiedApartmentSalePrice,
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
export const revalidate = false;
export const dynamicParams = false;

export async function generateStaticParams() {
  const txSummary = await getTxSummaryData();
  const aptNames = Object.keys(txSummary || {});
  const canonicalSlugs = Array.from(
    new Set(
      aptNames.map((name) =>
        (resolveCanonicalAptSlug(name, { txMap: txSummary }) || name).normalize('NFC')
      )
    )
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
    const nfcCanonicalSlug = fastCanonicalSlug.normalize('NFC');
    if (rawDecodedOnce !== nfcCanonicalSlug) {
      permanentRedirect(`/apartment/${encodeURIComponent(nfcCanonicalSlug)}`);
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
  const realPer = ratioPercent > 0 ? (100 / ratioPercent).toFixed(2) : null;
  const dominantPyeong =
    pyeongSummaries.length > 0
      ? [...pyeongSummaries].sort((a, b) => b.salesCount + b.rentCount - (a.salesCount + a.rentCount))[0]
      : null;
  const pyeongSalesTxCount = pyeongSummaries.reduce((acc, p) => acc + (p.salesCount || 0), 0);
  const isApartmentIndexable = hasVerifiedApartmentSalePrice(aptSummary);
  const hasVerifiedSalePrice = Boolean(
    isApartmentIndexable ||
      (pageData.analytics?.maxSalePrice && pageData.analytics.maxSalePrice > 0) ||
      pyeongSalesTxCount > 0
  );
  const totalSalesTxCount = hasVerifiedSalePrice
    ? pyeongSalesTxCount || aptSummary?.txCount || 0
    : pyeongSalesTxCount;
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
      : hasVerifiedSalePrice
      ? `최근 실거래 매매가(${formatSummaryPriceField(aptSummary?.latestPrice, aptSummary?.latestPriceEok)})와 평형별 전월세 계약을 종합할 때, 자기자본 대비 대출 원리금 상환 비율(DSR 40%)을 중심으로 매수 타당성을 점검하는 것이 유효합니다.`
      : `국토교통부 신고 기준 현재 전월세 임대차 계약(최근 보증금 ${formatSummaryPriceField(aptSummary?.latestRentDeposit, aptSummary?.latestRentDepositEok)}) 중심으로 거래되고 있으며, 동일 생활권 전월세 시세 및 보증보험 가입 요건을 중심으로 거주 안정성을 점검하는 것이 유효합니다.`;

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

  const compactPyeongRows: CompactAptPyeongRow[] = pyeongSummaries.map((p) => ({
    pyeong: p.pyeong,
    areaM2: p.areaM2,
    latestPriceStr: p.latestPriceStr,
    avgPriceStr: p.avgPriceStr,
    maxPriceStr: p.maxPriceStr,
    latestDepositStr: p.latestDepositStr,
    jeonseRatio: p.jeonseRatio,
    salesCount: p.salesCount,
    rentCount: p.rentCount,
  }));

  const compactDominantPyeong = dominantPyeong
    ? compactPyeongRows.find((r) => r.pyeong === dominantPyeong.pyeong) || null
    : null;

  const compactParentZone = parentZone
    ? {
        id: parentZone.id,
        name: parentZone.name,
        dongLabel: parentZone.dongLabel,
        description: parentZone.description,
      }
    : null;

  const compactRelatedGuides = relatedGuides.map((g) => ({
    slug: g.slug,
    category: g.category,
    title: g.title,
  }));

  const shareSummaryLines = [
    aptDong ? `소속 행정동: 동탄 ${aptDong}` : `분석 대상: 동탄 ${decodedName}`,
    hasVerifiedSalePrice && aptSummary?.latestPrice
      ? `최근 실거래 매매가: ${aptSummary.latestPriceEok || formatPriceEok(aptSummary.latestPrice)}`
      : aptSummary?.latestRentDeposit
      ? `최근 실거래 보증금: ${aptSummary.latestRentDepositEok || formatPriceEok(aptSummary.latestRentDeposit)}`
      : `평형별 실거래가 및 전세가율 정밀 분석`,
    hasVerifiedSalePrice && mortgageSsr.principalWon > 0
      ? `30년 만기 원리금균등 월 납부액(LTV 70% 기준): ${formatWon(mortgageSsr.amortization.equalPi.monthlyPaymentWon)}`
      : mortgageSsr.principalWon > 0
      ? `전세대출 원리금 상환 시뮬레이션(보증금 80% 기준): 월 ${formatWon(mortgageSsr.amortization.equalPi.monthlyPaymentWon)}`
      : `국토교통부 매매·전월세 실거래 신고 집계 대기 중`,
  ];

  const amortizationRows: Array<readonly string[]> = [
    [
      '원리금균등 분할상환',
      formatWon(mortgageSsr.amortization.equalPi.monthlyPaymentWon),
      formatWon(mortgageSsr.amortization.equalPi.totalPaymentWon),
      formatWon(mortgageSsr.amortization.equalPi.totalInterestWon),
    ],
    [
      '원금균등 분할상환',
      formatWon(mortgageSsr.amortization.equalP.firstMonthPaymentWon),
      formatWon(mortgageSsr.amortization.equalP.totalPaymentWon),
      formatWon(mortgageSsr.amortization.equalP.totalInterestWon),
    ],
  ];

  const dsrRows: Array<readonly string[]> = mortgageSsr.dsrScenarios.map((dsr) => [
    formatWon(dsr.annualIncomeWon),
    formatWon(dsr.maxMonthlyPaymentWon),
    formatWon(dsr.maxLoanWon),
  ]);

  const rateShockRows: Array<readonly string[]> = mortgageSsr.rateShock.scenarios.map((sc) => [
    `+${sc.spreadPercent.toFixed(1)}%p 인상`,
    `${sc.shockedRatePercent.toFixed(1)}%`,
    formatWon(sc.monthlyPaymentWon),
    `+${formatWon(sc.deltaMonthlyPaymentWon)}`,
  ]);

  const shortfallRows: Array<readonly string[]> = mortgageSsr.jeonseShortfalls.map((sf) => [
    `-${Math.round(sf.declineRate * 100)}% 하락`,
    formatWon(sf.depositWon - sf.declineAmountWon),
    formatWon(sf.shortfallWon),
  ]);

  const adsenseApprovalMode = process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE === 'true';

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
        suppressInlineAds={!isApartmentIndexable}
      />

      {/* High-Value Comprehensive Apartment Analysis Report (Content-First Visible SSR Report for Users & Search Crawlers) */}
      <section
        id="apt-ssr-comprehensive-report"
        data-testid="apt-ssr-comprehensive-report"
        className="w-full max-w-[2000px] mx-auto px-2 sm:px-6 md:px-10 lg:px-16 py-8 my-6 overflow-x-clip"
      >
        <div className="bg-surface rounded-3xl p-2 sm:p-8 space-y-8 min-w-0">
          <ApartmentReportPart
            kind="top"
            decodedName={decodedName}
            canonicalSlug={canonicalSlug}
            aptDong={aptDong}
            hasVerifiedSalePrice={hasVerifiedSalePrice}
            latestSalePriceStr={latestSalePriceStr}
            latestRentPriceStr={latestRentPriceStr}
            perPyeongStr={pageData.tradeSummary?.perPyeongStr || undefined}
            benchmarkPriceManwon={
              aptSummary?.latestPrice ||
              (pyeongSummaries.length > 0 ? pyeongSummaries[0].latestPrice : 0)
            }
            ratioPercent={ratioPercent}
            jeonseTone={jeonseTone}
            jeonseStatusLabel={jeonseStatusLabel}
            realPer={realPer}
            subwayWalkMinutes={subwayWalkMinutes}
            elemWalkMinutes={elemWalkMinutes}
            householdCountNum={householdCountNum}
            totalSalesTxCount={totalSalesTxCount}
            yearBuiltNum={yearBuiltNum}
            buildingAge={buildingAge}
            aiBriefing={aiBriefing}
            shareSummaryLines={shareSummaryLines}
            parentZone={compactParentZone}
            dominantPyeong={compactDominantPyeong}
            ageLifecycleComment={ageLifecycleComment}
            scaleLiquidityComment={scaleLiquidityComment}
            jeonsePerComment={jeonsePerComment}
            topGuide={compactRelatedGuides[0] || null}
            relatedGuidesCount={compactRelatedGuides.length}
            hasDirectGuideMatch={hasDirectGuideMatch}
            matchedGuideZoneName={matchedGuideZone?.name}
            locationSpec={
              locationScore
                ? {
                    nearestStationName: locationScore.nearestStationName,
                    nearestStationLine: locationScore.nearestStationLine,
                    distanceToSubway: locationScore.distanceToSubway,
                    distanceToElementary: locationScore.distanceToElementary,
                    elementarySchool: locationScore.nearestSchoolNames?.elementary,
                    middleSchool: locationScore.nearestSchoolNames?.middle,
                    highSchool: locationScore.nearestSchoolNames?.high,
                  }
                : null
            }
            scoutingSections={
              matchedReportData?.sections
                ? {
                    synthesis: matchedReportData.sections.assessment?.synthesis,
                    schoolText: matchedReportData.sections.ecosystem?.schoolText,
                    trafficText: matchedReportData.sections.location?.trafficText,
                    parkingText: matchedReportData.sections.infra?.parkingText,
                  }
                : null
            }
          />

          {/* Pyeong-specific Transaction Summary Table (Chapter 02 SSR) */}
          <div id="chapter-02-pyeong-ssr" className="space-y-4 min-w-0">
            <h2 className="text-lg sm:text-xl font-extrabold text-primary tracking-tight flex items-center gap-2">
              <span className="w-2 h-5 bg-slate-900 dark:bg-slate-100 rounded-full" />
              평형별 실거래가 · 전세가율
            </h2>
            {compactPyeongRows.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl bg-[#f9fafb] dark:bg-[#17171c]">
                <table className="dview-apt-pyeong-tbl w-full text-left text-[13px] text-secondary">
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
                    <ApartmentReportPart kind="pyeong-rows" rows={compactPyeongRows} />
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

          {/* Chapter 02 Post-Table Zero-CLS AdSlot (omitted on noindex zero-sale pages) */}
          {!adsenseApprovalMode && isApartmentIndexable && (
            <ApartmentReportPart kind="ch02-ad" decodedName={decodedName} aptDong={aptDong} />
          )}

          {/* Mortgage & Stress DSR Analysis Section (Chapter 05 SSR) */}
          <section id="chapter-05-mortgage-ssr" className="space-y-6 pt-4 border-t border-border/60 min-w-0">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-primary tracking-tight flex items-center gap-2">
                <span className="w-2 h-5 bg-slate-900 dark:bg-slate-100 rounded-full" />
                {hasVerifiedSalePrice ? '주담대 상환 · DSR 한도 진단' : '전세대출 상환 · DSR 한도 진단'}
              </h2>
              <p className="mt-1.5 text-[12.5px] text-tertiary font-medium tabular-nums">
                {hasVerifiedSalePrice && mortgageSsr.principalWon > 0
                  ? `원금 ${formatWon(mortgageSsr.principalWon)} · 30년 만기 · 금리 4.0% 가정 시뮬레이션 (차주별 한도 상이)`
                  : mortgageSsr.principalWon > 0
                  ? `전세대출 원금 ${formatWon(mortgageSsr.principalWon)} · 금리 4.0% 가정 시뮬레이션 (보증금 80% 기준)`
                  : '국토교통부 매매·전월세 실거래 신고 확인 즉시 실거래 기반 상환액 반영 (현재 실거래 집계 대기 중)'}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Amortization Table */}
              <div className="bg-[#f9fafb] dark:bg-[#17171c] p-5 rounded-2xl min-w-0">
                <h3 className="text-sm font-extrabold text-primary mb-3">1. 상환 방식별 월 납부액 비교</h3>
                <div className="overflow-x-auto">
                  <table className="dview-apt-tbl w-full text-left text-[12px] text-secondary">
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
                      <ApartmentReportPart kind="simple-rows" rows={amortizationRows} lastColTone="emerald" />
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DSR Table */}
              <div className="bg-[#f9fafb] dark:bg-[#17171c] p-5 rounded-2xl min-w-0">
                <h3 className="text-sm font-extrabold text-primary mb-3">2. 연소득별 스트레스 DSR 40% 한도표</h3>
                <div className="overflow-x-auto">
                  <table className="dview-apt-tbl w-full text-left text-[12px] text-secondary">
                    <caption className="sr-only">{decodedName} 연소득별 스트레스 DSR 40% 한도표</caption>
                    <thead className="border-b border-border/60 font-bold text-primary">
                      <tr>
                        <th className="pb-2">차주 연소득</th>
                        <th className="pb-2">월 최대상환</th>
                        <th className="pb-2">최대 가용 대출액</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-medium tabular-nums">
                      <ApartmentReportPart kind="simple-rows" rows={dsrRows} lastColTone="emerald" />
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
                  <table className="dview-apt-tbl w-full text-left text-[12px] text-secondary">
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
                      <ApartmentReportPart kind="simple-rows" rows={rateShockRows} lastColTone="red" />
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Reverse Jeonse Shortfall Table */}
              <div className="bg-[#f9fafb] dark:bg-[#17171c] p-5 rounded-2xl min-w-0">
                <h3 className="text-sm font-extrabold text-primary mb-3">4. 전세보증금 반환대출(역전세) 결손액 진단표</h3>
                <div className="overflow-x-auto">
                  <table className="dview-apt-tbl w-full text-left text-[12px] text-secondary">
                    <caption className="sr-only">{decodedName} 역전세 보증금 반환 결손액 진단표</caption>
                    <thead className="border-b border-border/60 font-bold text-primary">
                      <tr>
                        <th className="pb-2">전세가 하락률</th>
                        <th className="pb-2">하락 후 보증금</th>
                        <th className="pb-2">반환 필요 결손액</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-medium tabular-nums">
                      <ApartmentReportPart kind="simple-rows" rows={shortfallRows} lastColTone="red-dark" />
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Layer 2 Progressive SEO Accordion: Mortgage & Real Estate FAQ */}
            <ApartmentReportPart kind="faq" faqList={mortgageSsr.faqList} />
          </section>

          <ApartmentReportPart
            kind="bottom"
            decodedName={decodedName}
            aptDong={aptDong}
            isApartmentIndexable={isApartmentIndexable}
            adsenseApprovalMode={adsenseApprovalMode}
            parentZone={compactParentZone}
            perPyeongStr={pageData.tradeSummary?.perPyeongStr || undefined}
            sameZoneSimilarPerPyeongTop5={sameZoneSimilarPerPyeongTop5.map((p) => ({
              name: p.name,
              canonicalSlug: p.canonicalSlug,
              dong: p.dong,
              txCount: p.txCount,
              perPyeongStr: p.perPyeongStr,
              latestPriceStr: p.latestPriceStr,
            }))}
            schoolZoneCompetitors={schoolZoneCompetitors.map((p) => ({
              name: p.name,
              canonicalSlug: p.canonicalSlug,
              dong: p.dong,
              matchType: p.matchType,
              elementarySchool: p.elementarySchool,
              middleSchool: p.middleSchool,
              perPyeongStr: p.perPyeongStr,
              latestPriceStr: p.latestPriceStr,
            }))}
            elementarySchool={locationScore?.nearestSchoolNames?.elementary}
            middleSchool={locationScore?.nearestSchoolNames?.middle}
            distanceToElementary={locationScore?.distanceToElementary}
            relatedGuides={compactRelatedGuides}
            hasDirectGuideMatch={hasDirectGuideMatch}
            matchedGuideZoneName={matchedGuideZone?.name}
            yearBuiltNum={yearBuiltNum}
            buildingAge={buildingAge}
          />
        </div>
      </section>
    </>
  );
}
