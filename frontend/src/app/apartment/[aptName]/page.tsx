import { Metadata } from 'next';
import DashboardClient from '@/components/DashboardClient';
import { getInitialData } from '@/lib/services/dashboardData';
import { safeJsonLd } from '@/lib/utils/structuredData';
import {
  decodeAptName,
  getTxSummaryData,
  getApartmentPageData,
  buildApartmentJsonLd,
  buildApartmentSeoMetadata,
  getDefaultApartmentMetadata,
} from '@/lib/services/apartmentPageService';

export const revalidate = 3600;
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
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';

  try {
    const params = props.params ? await props.params : null;
    let searchParams: { [key: string]: string | string[] | undefined } = {};
    try {
      searchParams = props.searchParams ? await props.searchParams : {};
    } catch {
      searchParams = {};
    }

    if (!params?.aptName) {
      return getDefaultApartmentMetadata(baseUrl);
    }

    return await buildApartmentSeoMetadata(params.aptName, searchParams, baseUrl);
  } catch (err) {
    if (err && typeof err === 'object' && ('digest' in err || (err as Error).message?.includes('Dynamic server usage'))) {
      throw err;
    }
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

  const [initialData, pageData] = await Promise.all([
    getInitialData(),
    getApartmentPageData(decodedName),
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  const jsonLd = buildApartmentJsonLd(pageData, baseUrl);

  const {
    aptSummary,
    pyeongSummaries,
    locationScore,
    matchedReportData,
    comments,
    aiBriefing,
  } = pageData;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />

      {/* Search Engine Optimization (SSR Content) */}
      <div className="sr-only" aria-hidden="true">
        <h1>{decodedName} 아파트 실거래가 및 학군 가치 분석 리포트</h1>
        <p>{aiBriefing}</p>

        {comments && comments.length > 0 && (
          <section style={{ marginTop: '20px' }}>
            <h2>{decodedName} 입주민 및 방문객 아파트 이야기 (댓글)</h2>
            <ul>
              {comments.map((c) => (
                <li key={c.id} style={{ marginBottom: '10px' }}>
                  <strong>{c.author}</strong> ({c.createdAt ? String(c.createdAt) : ''}):
                  <p>{c.text}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {locationScore && (
          <section style={{ marginTop: '20px' }}>
            <h2>{decodedName} 학군 및 교통 입지 분석</h2>
            <ul>
              {locationScore.nearestSchoolNames?.elementary && (
                <li>
                  배정 초등학교: {locationScore.nearestSchoolNames.elementary} (단지에서 약 {locationScore.distanceToElementary || 0}m, 도보 약 {Math.round((locationScore.distanceToElementary || 0) / 70) || 1}분)
                </li>
              )}
              {locationScore.nearestSchoolNames?.middle && (
                <li>인근 중학교: {locationScore.nearestSchoolNames.middle}</li>
              )}
              {locationScore.nearestSchoolNames?.high && (
                <li>인근 고등학교: {locationScore.nearestSchoolNames.high}</li>
              )}
              {locationScore.nearestStationName && (
                <li>
                  대중교통: {locationScore.nearestStationLine || '지하철'} {locationScore.nearestStationName}역 (단지에서 약 {locationScore.distanceToSubway || 0}m, 도보 약 {Math.round((locationScore.distanceToSubway || 0) / 70) || 1}분)
                </li>
              )}
            </ul>
          </section>
        )}

        {matchedReportData?.sections && (
          <section style={{ marginTop: '20px' }}>
            <h2>{decodedName} 현장 임장 및 입지 팩트체크</h2>
            {matchedReportData.sections.assessment?.synthesis && (
              <div>
                <h3>종합 가치 평가</h3>
                <p>{matchedReportData.sections.assessment.synthesis}</p>
              </div>
            )}
            {matchedReportData.sections.ecosystem?.schoolText && (
              <div>
                <h3>학군 및 교육 환경</h3>
                <p>{matchedReportData.sections.ecosystem.schoolText}</p>
              </div>
            )}
            {matchedReportData.sections.location?.trafficText && (
              <div>
                <h3>교통 및 도로 인프라</h3>
                <p>{matchedReportData.sections.location.trafficText}</p>
              </div>
            )}
            {matchedReportData.sections.infra?.parkingText && (
              <div>
                <h3>주차 공간 및 편의 시설</h3>
                <p>{matchedReportData.sections.infra.parkingText}</p>
              </div>
            )}
          </section>
        )}

        {pyeongSummaries.length > 0 ? (
          pyeongSummaries.map((p) => (
            <section key={p.pyeong} style={{ marginTop: '20px' }}>
              <h2>{decodedName} {p.pyeong}평형 실거래가 및 전세가율</h2>
              <ul>
                <li>전용면적: {p.areaM2}㎡</li>
                <li>최근 실거래 매매가: {p.latestPriceStr}</li>
                <li>평균 매매 실거래가: {p.avgPriceStr}</li>
                <li>역대 최고 매매가: {p.maxPriceStr}</li>
                <li>최근 전세 거래가: {p.latestDepositStr}</li>
                <li>평균 전세 실거래가: {p.avgDepositStr}</li>
                <li>전세가율: {p.jeonseRatio > 0 ? `${p.jeonseRatio}%` : '정보 없음'}</li>
                <li>누적 거래 건수: 매매 {p.salesCount}건, 전세 {p.rentCount}건</li>
              </ul>
              <p>
                동탄 {decodedName} {p.pyeong}평형은 전용면적 {p.areaM2}㎡ 크기이며,
                {p.latestPriceStr !== '정보 없음' ? ` 최근 실거래가 기준 매매가는 ${p.latestPriceStr} 수준을 기록하고 있고` : ''}
                {p.latestDepositStr !== '정보 없음' ? ` 전세가는 ${p.latestDepositStr} 수준입니다.` : ''}
                {p.jeonseRatio > 0 ? ` 해당 평형의 매매 대비 전세가율은 약 ${p.jeonseRatio}%를 보이고 있습니다.` : ''}
                {p.salesCount > 0 ? ` 누적 매매 실거래 건수는 총 ${p.salesCount}건이 등록되어 데이터 기반의 흐름을 보여줍니다.` : ''}
              </p>
            </section>
          ))
        ) : (
          <div>
            <h2>{decodedName} 실거래 데이터 요약</h2>
            <ul>
              <li>최근 매매가: {aptSummary?.latestPriceEok ? `${aptSummary.latestPriceEok}억` : '정보 없음'}</li>
              <li>최근 1개월 평균가: {aptSummary?.avg1MPriceEok ? `${aptSummary.avg1MPriceEok}억` : '정보 없음'}</li>
              <li>최근 전세가: {aptSummary?.latestRentDepositEok ? `${aptSummary.latestRentDepositEok}억` : '정보 없음'}</li>
            </ul>
          </div>
        )}
      </div>

      <DashboardClient initialDashboardData={initialData} preselectedAptName={decodedName} />
    </>
  );
}
