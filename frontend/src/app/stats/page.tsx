import React, { Suspense } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import LoungeHeader from '@/components/LoungeHeader';
import MobileDock from '@/components/pwa/MobileDock';
import PageHeroHeader from '@/components/PageHeroHeader';
import { MarketStatsStrong, MarketStatsLight } from '@/components/common/MarketStatsSubtitle';
import { safeJsonLd } from '@/lib/utils/structuredData';
import { getDongtanStationAnalysisData } from '@/lib/stats/dongtanStationDistanceEngine';
import { getDongtan1Vs2ComparisonData } from '@/lib/stats/dongtan1Vs2ComparisonEngine';
import {
  getSchoolDistrictPremiumData,
  getLakeParkPremiumData,
  getBuildingAgeDepreciationData,
} from '@/lib/stats/thematicPriceComparisonEngine';
import { StatsPageClient } from './StatsPageClient';
import { StatsSkeleton } from '@/components/stats/StatsSkeleton';

export const revalidate = 86400;

const STATS_OG_IMAGE_URL = `https://dongtanview.com/api/og?title=${encodeURIComponent(
  '동탄 아파트 통계 · 초품아·호수공원·연식별·동탄1 vs 동탄2 집값 비교 및 동탄역 회귀분석'
)}&subtitle=${encodeURIComponent(
  '국토교통부 127개 단지 약 6.6만건 실거래 기반 입지 테마별 집값 격차 리포트 | D-VIEW'
)}`;

export const metadata: Metadata = {
  title:
    '동탄 아파트 통계 · 동탄1 vs 동탄2 집값 비교 · 초품아·호수공원·연식별·동탄역 거리별 실거래가 · 역세권 프리미엄 회귀분석 (127개 단지) | D-VIEW 통계 랩',
  description:
    '국토교통부 약 6.6만 건 실거래가 및 입지 공공데이터 기반 동탄신도시 127개 아파트 단지 통계 분석 리포트. 동탄1 vs 동탄2 집값 비교, 초품아·학원가 학군 프리미엄, 동탄호수공원 수변 조망권 시세 격차, 연식별(신축·준신축·구축) 감가상각 및 전고점 방어율, 동탄역 거리별 OLS 회귀분석 지표를 제공합니다.',
  keywords: [
    '동탄 아파트 통계',
    '동탄1 동탄2 집값 비교',
    '동탄1신도시 동탄2신도시 시세 차이',
    '동탄1 vs 동탄2 아파트 가격',
    '동탄 초품아 아파트 가격 비교',
    '동탄 학군별 아파트 시세',
    '동탄 학원가 아파트 프리미엄',
    '동탄호수공원 아파트 시세 비교',
    '동탄 수변 조망권 프리미엄',
    '동탄 연식별 집값 격차',
    '동탄 신축 구축 시세 비교',
    '동탄 전고점 대비 회복률',
    '동탄역 거리별 시세',
    '동탄 역세권 프리미엄',
    '동탄 평당가 분석',
    '동탄 아파트 실거래가 통계',
    '동탄 전세가율 통계',
    '동탄 세대수 평당가',
    'D-VIEW 통계 랩',
    '디뷰',
    '동뷰',
    '동탄뷰',
  ],
  alternates: {
    canonical: 'https://dongtanview.com/stats',
  },
  openGraph: {
    title:
      '동탄 아파트 통계 · 동탄1 vs 동탄2 집값 비교 · 초품아·호수공원·연식별·동탄역 거리별 실거래가 · 역세권 프리미엄 회귀분석 (127개 단지) | D-VIEW 통계 랩',
    description:
      '국토교통부 실거래가 및 입지 공공데이터 기반 동탄신도시 127개 아파트 단지 통계 분석 리포트. 초품아·호수공원·연식별 집값 격차, 동탄1 vs 동탄2 집값 비교 및 동탄역 거리별 역세권 프리미엄 OLS 회귀분석 리포트를 제공합니다.',
    url: 'https://dongtanview.com/stats',
    siteName: 'D-VIEW',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: STATS_OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: 'D-VIEW 동탄 아파트 통계 및 입지 테마별 집값 비교 리포트',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title:
      '동탄 아파트 통계 · 초품아·호수공원·연식별·동탄1 vs 동탄2 집값 비교 · 동탄역 회귀분석 | D-VIEW',
    description:
      '국토교통부 실거래가 공공데이터 기반 초품아·호수공원·연식별 집값 격차, 동탄1 vs 동탄2 비교 및 동탄역 역세권 회귀분석 리포트.',
    images: [STATS_OG_IMAGE_URL],
  },
};

export default function StatsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  const initialPayload = getDongtanStationAnalysisData();
  const initialComparisonData = getDongtan1Vs2ComparisonData('all');
  const initialSchoolData = getSchoolDistrictPremiumData('all');
  const initialLakeData = getLakeParkPremiumData('all');
  const initialAgeData = getBuildingAgeDepreciationData('all');
  const { regression, distanceTiers, datasetMeta } = initialPayload;
  const { dongtan1, dongtan2, delta } = initialComparisonData;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${baseUrl}/stats#webpage`,
        url: `${baseUrl}/stats`,
        name: '동탄 아파트 통계 · 동탄1 vs 동탄2 집값 비교 · 초품아·호수공원·연식별·동탄역 거리별 실거래가 · 역세권 프리미엄 회귀분석 (127개 단지) | D-VIEW 통계 랩',
        description:
          '국토교통부 실거래가 및 입지 공공데이터 기반 동탄신도시 127개 아파트 단지 입지 테마별(역세권·초품아·호수공원·연식별·동탄1 vs 동탄2) 통계 분석 리포트.',
        inLanguage: 'ko-KR',
        isPartOf: {
          '@id': `${baseUrl}/#website`,
        },
        breadcrumb: {
          '@id': `${baseUrl}/stats#breadcrumb`,
        },
        publisher: {
          '@type': 'Organization',
          name: 'D-VIEW',
          url: baseUrl,
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${baseUrl}/stats#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: '홈',
            item: baseUrl,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: '아파트 통계',
            item: `${baseUrl}/stats`,
          },
        ],
      },
      {
        '@type': 'Dataset',
        '@id': `${baseUrl}/stats#dataset-dongtan-station-distance`,
        name: '동탄역 거리별 아파트 실거래가 OLS 선형회귀 및 역세권 프리미엄 분석 데이터셋',
        description: `동탄신도시 ${datasetMeta?.totalComplexCount ?? 127}개 단지(${datasetMeta?.totalTxCount ?? 0}건 실거래) 대상 GTX-A·SRT 동탄역 직선거리와 평당 매매가 간 OLS 회귀분석(기울기 ${Math.round(regression.slopeWonPerKm).toLocaleString('ko-KR')}만원/km, 상관계수 r=${regression.pearsonR.toFixed(4)}, 결정계수 R²=${regression.rSquared.toFixed(4)}, 역세권 프리미엄 +${regression.stationPremiumRatePercent.toFixed(1)}%).`,
        url: `${baseUrl}/stats`,
        inLanguage: 'ko-KR',
        isAccessibleForFree: true,
        keywords: [
          '동탄 아파트 통계',
          '동탄역 거리별 실거래가',
          '역세권 프리미엄 회귀분석',
          '동탄 평당가 상관계수',
        ],
        spatialCoverage: {
          '@type': 'Place',
          name: '경기도 화성시 동탄신도시',
        },
        creator: {
          '@type': 'Organization',
          name: 'D-VIEW 부동산 데이터 랩스',
          url: baseUrl,
        },
        variableMeasured: [
          '동탄역 직선거리 (m)',
          '3.3㎡당 가중평균 매매가 (원)',
          'OLS 회귀 기울기 (원/km)',
          '피어슨 상관계수 (r)',
          '결정계수 (R²)',
        ],
      },
      {
        '@type': 'Dataset',
        '@id': `${baseUrl}/stats#dataset-school-district-premium`,
        name: '동탄 초품아(초등학교 도보권)·학군 및 학원가 밀집도별 아파트 집값 격차 데이터셋',
        description: `동탄신도시 ${initialSchoolData.datasetMeta.totalComplexCount}개 단지(1년 매매 ${initialSchoolData.datasetMeta.totalTxCount.toLocaleString('ko-KR')}건) 대상 초품아(${initialSchoolData.chopumaGroup.complexCount}개 단지, 가중평균 ${initialSchoolData.chopumaGroup.weightedAvgPriceEokText}, 평당 ${initialSchoolData.chopumaGroup.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만원) vs 비초품아(${initialSchoolData.generalSchoolGroup.complexCount}개 단지, 가중평균 ${initialSchoolData.generalSchoolGroup.weightedAvgPriceEokText}) 및 학원가 밀집권(${initialSchoolData.academyPrimeGroup.weightedAvgPriceEokText}) 집값·평당가 비교.`,
        url: `${baseUrl}/stats?topic=school-district-premium#school-district-premium`,
        inLanguage: 'ko-KR',
        isAccessibleForFree: true,
        keywords: [
          '동탄 초품아 아파트 가격 비교',
          '동탄 학군별 아파트 시세',
          '동탄 학원가 밀집도 집값 격차',
        ],
        spatialCoverage: {
          '@type': 'Place',
          name: '경기도 화성시 동탄신도시',
        },
        creator: {
          '@type': 'Organization',
          name: 'D-VIEW 부동산 데이터 랩스',
          url: baseUrl,
        },
        variableMeasured: [
          '배정 초등학교 직선거리 (m)',
          '반경 500m 내 학원 수 (개)',
          '초품아 vs 일반 단지 가중평균 매매가 및 평당가',
          '초등학교 학군별 평균 실거래가',
        ],
      },
      {
        '@type': 'Dataset',
        '@id': `${baseUrl}/stats#dataset-lake-park-view-premium`,
        name: '동탄호수공원 수변·도보 생활권 vs 비수변 아파트 집값·회전율 비교 데이터셋',
        description: `동탄호수공원 수변·도보 생활권(${initialLakeData.waterfrontGroup.complexCount}개 단지, 1년 가중평균 ${initialLakeData.waterfrontGroup.weightedAvgPriceEokText}, 평당 ${initialLakeData.waterfrontGroup.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만원, 연간 회전율 ${initialLakeData.waterfrontGroup.avgAnnualTurnoverPercent}%) vs 남동탄 비수변 배후권(${initialLakeData.southHinterlandGroup.complexCount}개 단지, 1년 가중평균 ${initialLakeData.southHinterlandGroup.weightedAvgPriceEokText}) 집값 격차(${initialLakeData.delta.waterfrontVsHinterlandPriceDiffEokText}, +${initialLakeData.delta.waterfrontVsHinterlandPremiumPercent}%).`,
        url: `${baseUrl}/stats?topic=lake-park-view-premium#lake-park-view-premium`,
        inLanguage: 'ko-KR',
        isAccessibleForFree: true,
        keywords: [
          '동탄호수공원 아파트 시세 비교',
          '동탄 수변 조망권 프리미엄',
          '남동탄 호수공원 집값 격차',
        ],
        spatialCoverage: {
          '@type': 'Place',
          name: '경기도 화성시 동탄호수공원 생활권(송동·산척동·장지동)',
        },
        creator: {
          '@type': 'Organization',
          name: 'D-VIEW 부동산 데이터 랩스',
          url: baseUrl,
        },
        variableMeasured: [
          '동탄호수공원 중심 직선거리 (m)',
          '호수 수변권 vs 비수변 1년 가중평균 매매가 (원)',
          '연간 세대수 대비 실거래 회전율 (%)',
          '전고점 대비 시세 방어율 (%)',
        ],
      },
      {
        '@type': 'Dataset',
        '@id': `${baseUrl}/stats#dataset-building-age-depreciation`,
        name: '동탄 연식별(신축·준신축·구축) 아파트 집값 격차 및 전고점 대비 시세 방어율 데이터셋',
        description: `동탄신도시 신축 5년차 이하(${initialAgeData.newBuildGroup.complexCount}개 단지, 가중평균 ${initialAgeData.newBuildGroup.weightedAvgPriceEokText}, 전고점 방어율 ${initialAgeData.newBuildGroup.avgPriceRetentionPercent}%) vs 준신축 6~10년차(${initialAgeData.semiNewGroup.complexCount}개 단지, 가중평균 ${initialAgeData.semiNewGroup.weightedAvgPriceEokText}) vs 구축 16년차 이상(${initialAgeData.oldBuildGroup.complexCount}개 단지, 가중평균 ${initialAgeData.oldBuildGroup.weightedAvgPriceEokText}, 전고점 방어율 ${initialAgeData.oldBuildGroup.avgPriceRetentionPercent}%) 집값 격차(${initialAgeData.delta.newVsOldPriceDiffEokText}, +${initialAgeData.delta.newVsOldPricePremiumPercent}%).`,
        url: `${baseUrl}/stats?topic=building-age-depreciation#building-age-depreciation`,
        inLanguage: 'ko-KR',
        isAccessibleForFree: true,
        keywords: [
          '동탄 연식별 집값 격차',
          '동탄 신축 구축 시세 비교',
          '동탄 아파트 감가상각 전고점 회복률',
        ],
        spatialCoverage: {
          '@type': 'Place',
          name: '경기도 화성시 동탄신도시',
        },
        creator: {
          '@type': 'Organization',
          name: 'D-VIEW 부동산 데이터 랩스',
          url: baseUrl,
        },
        variableMeasured: [
          '준공 연차 (년)',
          '연식 구간별 1년 가중평균 매매가 및 평당가',
          '역대 최고가(전고점) 대비 시세 방어율 (%)',
          '연식 1년당 평당가 변화율 (만원/년)',
        ],
      },
      {
        '@type': 'Dataset',
        '@id': `${baseUrl}/stats#dataset-dongtan-1-vs-2-comparison`,
        name: '동탄1신도시 vs 동탄2신도시 아파트 집값·평당가·예산대별 실거래 비교 데이터셋',
        description: `동탄1신도시(${dongtan1.complexCount}개 단지, 1년 가중평균 ${dongtan1.weightedAvgPriceEokText}, 평당 ${dongtan1.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만원) vs 동탄2신도시(${dongtan2.complexCount}개 단지, 1년 가중평균 ${dongtan2.weightedAvgPriceEokText}, 평당 ${dongtan2.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만원) 집값 격차(${delta.weightedPriceDiffEokText}) 및 법정동·가격대별 실거래 통계.`,
        url: `${baseUrl}/stats?topic=dongtan-1-vs-2-comparison#dongtan-1-vs-2-comparison`,
        inLanguage: 'ko-KR',
        isAccessibleForFree: true,
        keywords: [
          '동탄1 동탄2 집값 비교',
          '동탄1신도시 동탄2신도시 시세',
          '동탄 아파트 가격 비교',
        ],
        spatialCoverage: {
          '@type': 'Place',
          name: '경기도 화성시 동탄1신도시 · 동탄2신도시',
        },
        creator: {
          '@type': 'Organization',
          name: 'D-VIEW 부동산 데이터 랩스',
          url: baseUrl,
        },
        variableMeasured: [
          '동탄1 vs 동탄2 1년 가중평균 매매가 (원)',
          '동탄1 vs 동탄2 3.3㎡당 가중평균 평당가 (만원)',
          '가격대별(6억~15억+) 단지 분포',
          '법정동별 평균 실거래가',
        ],
      },
    ],
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-transparent relative pb-[env(safe-area-inset-bottom)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />

      <LoungeHeader activeTab="stats" />

      <main id="main-content" className="flex-1 w-full max-w-[2000px] mx-auto min-w-0">
        <PageHeroHeader
          title="아파트 통계"
          compactTitle="아파트 통계"
          subtitleStrong={<MarketStatsStrong />}
          subtitleLight={<MarketStatsLight />}
        />

        <div className="flex flex-col px-4 sm:px-6 md:px-10 lg:px-16 pt-3 md:pt-5 pb-6 md:pb-8 lg:pb-10 w-full max-w-full min-w-0 gap-6 box-border">
          <Suspense fallback={<StatsSkeleton />}>
            <StatsPageClient
              initialPayload={initialPayload}
              initialComparisonData={initialComparisonData}
              initialSchoolData={initialSchoolData}
              initialLakeData={initialLakeData}
              initialAgeData={initialAgeData}
            />
          </Suspense>

          {/* Visible SSR Semantic Regression & Thematic Price Comparison Summary (B9 Anti-Cloaking) */}
          <section
            id="stats-ssr-regression-summary"
            aria-label="동탄역 거리별 아파트 가격 회귀분석 요약"
            className="w-full rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-5 sm:p-6 text-xs sm:text-[13px] text-secondary space-y-2.5 tabular-nums"
          >
            <h2 className="text-sm font-extrabold text-primary">
              동탄역 거리별 아파트 실거래가 OLS 선형회귀 요약 ({datasetMeta?.referenceMonthLabel})
            </h2>
            <p className="leading-relaxed">
              표본 단지 수 {datasetMeta?.totalComplexCount ?? 127}개, 분석 실거래 표본 {datasetMeta?.totalTxCount ?? 0}건,
              회귀 방정식 절편 {Math.round(regression.interceptWon).toLocaleString('ko-KR')}만원,
              거리 1km당 가격 변화율 {Math.round(regression.slopeWonPerKm).toLocaleString('ko-KR')}만원,
              피어슨 상관계수 {regression.pearsonR.toFixed(4)}, 결정계수 {regression.rSquared.toFixed(4)},
              1km 이내 역세권 프리미엄 비율 {regression.stationPremiumRatePercent.toFixed(1)}퍼센트.
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-1">
              {distanceTiers.map((tier) => (
                <li
                  key={tier.tierId}
                  className="rounded-xl bg-surface px-3 py-2 text-[11.5px] font-medium text-secondary"
                >
                  {tier.tierLabel}: 표본 {tier.complexCount}개 단지, 거래량 {tier.txVolume}건, 평당 평균가{' '}
                  {Math.round(tier.avgPricePerPyeongWon / 10000).toLocaleString('ko-KR')}만원
                </li>
              ))}
            </ul>
            <div
              id="stats-ssr-dongtan-1-vs-2-summary"
              className="pt-2.5 border-t border-slate-200/70 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <p className="leading-relaxed">
                동탄1신도시({dongtan1.complexCount}개 단지, 1년 가중평균 {dongtan1.weightedAvgPriceEokText}, 평당{' '}
                {dongtan1.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만원) vs 동탄2신도시({dongtan2.complexCount}개 단지, 1년 가중평균{' '}
                {dongtan2.weightedAvgPriceEokText}, 평당 {dongtan2.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만원) 평균 집값 차이{' '}
                {delta.weightedPriceDiffEokText} ({delta.weightedPricePremiumPercent >= 0 ? '+' : ''}
                {delta.weightedPricePremiumPercent}%).
              </p>
              <Link
                href="/guide/dongtan-1-vs-2-comparison" prefetch={false}
                className="shrink-0 font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                동탄1 vs 동탄2 심층 비교 분석글 보기
              </Link>
            </div>

            <div
              id="stats-ssr-school-district-summary"
              className="pt-2.5 border-t border-slate-200/70 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <p className="leading-relaxed">
                Issue #2 초품아·학군 집값 비교: 초품아({initialSchoolData.chopumaGroup.complexCount}개 단지, 가중평균{' '}
                {initialSchoolData.chopumaGroup.weightedAvgPriceEokText}, 평당{' '}
                {initialSchoolData.chopumaGroup.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만원) vs 일반 단지(
                {initialSchoolData.generalSchoolGroup.complexCount}개 단지, 가중평균{' '}
                {initialSchoolData.generalSchoolGroup.weightedAvgPriceEokText}, 평당{' '}
                {initialSchoolData.generalSchoolGroup.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만원), 학원가 밀집권(반경 500m 학원 40개+,{' '}
                {initialSchoolData.academyPrimeGroup.complexCount}개 단지, 가중평균{' '}
                {initialSchoolData.academyPrimeGroup.weightedAvgPriceEokText}) vs 비학원권(
                {initialSchoolData.nonAcademyGroup.weightedAvgPriceEokText}) 집값 차이{' '}
                {initialSchoolData.delta.academyPriceDiffEokText} (+
                {initialSchoolData.delta.academyPricePremiumPercent}%).
              </p>
              <Link
                href="/guide/dongtan-school-zone-top-apartments" prefetch={false}
                className="shrink-0 font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                동탄 초품아·학군 심층 비교 가이드 보기
              </Link>
            </div>

            <div
              id="stats-ssr-lake-park-summary"
              className="pt-2.5 border-t border-slate-200/70 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <p className="leading-relaxed">
                Issue #3 동탄호수공원 조망권 집값 비교: 호수 수변·도보 핵심권(1km 이내,{' '}
                {initialLakeData.waterfrontGroup.complexCount}개 단지, 1년 가중평균{' '}
                {initialLakeData.waterfrontGroup.weightedAvgPriceEokText}, 평당{' '}
                {initialLakeData.waterfrontGroup.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만원, 연간 회전율{' '}
                {initialLakeData.waterfrontGroup.avgAnnualTurnoverPercent}%) vs 남동탄 비수변 배후권(
                {initialLakeData.southHinterlandGroup.complexCount}개 단지, 가중평균{' '}
                {initialLakeData.southHinterlandGroup.weightedAvgPriceEokText}) 평균 집값 격차{' '}
                {initialLakeData.delta.waterfrontVsHinterlandPriceDiffEokText} (+
                {initialLakeData.delta.waterfrontVsHinterlandPremiumPercent}%).
              </p>
              <Link
                href="/guide/dongtan-lake-vs-station-comparison" prefetch={false}
                className="shrink-0 font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                호수공원 vs 동탄역 비교 가이드 보기
              </Link>
            </div>

            <div
              id="stats-ssr-building-age-summary"
              className="pt-2.5 border-t border-slate-200/70 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <p className="leading-relaxed">
                Issue #4 연식별 감가상각·전고점 방어율 비교: 신축 5년차 이하(
                {initialAgeData.newBuildGroup.complexCount}개 단지, 가중평균{' '}
                {initialAgeData.newBuildGroup.weightedAvgPriceEokText}, 평당{' '}
                {initialAgeData.newBuildGroup.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만원, 전고점 방어율{' '}
                {initialAgeData.newBuildGroup.avgPriceRetentionPercent}%) vs 구축 16년차 이상(
                {initialAgeData.oldBuildGroup.complexCount}개 단지, 가중평균{' '}
                {initialAgeData.oldBuildGroup.weightedAvgPriceEokText}, 평당{' '}
                {initialAgeData.oldBuildGroup.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만원, 전고점 방어율{' '}
                {initialAgeData.oldBuildGroup.avgPriceRetentionPercent}%) 평균 집값 격차{' '}
                {initialAgeData.delta.newVsOldPriceDiffEokText} (+
                {initialAgeData.delta.newVsOldPricePremiumPercent}%).
              </p>
              <Link
                href="/guide/dongtan-reconstruction-remodeling-1st-new-town-outlook" prefetch={false}
                className="shrink-0 font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                연식·리모델링 전망 가이드 보기
              </Link>
            </div>
          </section>
        </div>
      </main>

      <MobileDock activeTab="stats" />
    </div>
  );
}
