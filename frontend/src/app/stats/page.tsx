import React, { Suspense } from 'react';
import { Metadata } from 'next';
import LoungeHeader from '@/components/LoungeHeader';
import MobileDock from '@/components/pwa/MobileDock';
import PageHeroHeader from '@/components/PageHeroHeader';
import { MarketStatsStrong, MarketStatsLight } from '@/components/common/MarketStatsSubtitle';
import { safeJsonLd } from '@/lib/utils/structuredData';
import { getDongtanStationAnalysisData } from '@/lib/stats/dongtanStationDistanceEngine';
import { StatsPageClient } from './StatsPageClient';
import { StatsSkeleton } from '@/components/stats/StatsSkeleton';

export const metadata: Metadata = {
  title: '동탄 아파트 통계 & 실거래가 분석 리포트 | D-VIEW 통계 랩',
  description: '100% 국토교통부 실거래가 및 입지 공공데이터 기반 동탄신도시 아파트 통계 분석 리포트. 동탄역 거리별 가격 상관관계 및 역세권 프리미엄 OLS 회귀분석 리포트를 제공합니다.',
  alternates: {
    canonical: 'https://dongtanview.com/stats',
  },
  openGraph: {
    title: '동탄 아파트 통계 & 실거래가 분석 리포트 | D-VIEW 통계 랩',
    description: '100% 국토교통부 실거래가 및 입지 공공데이터 기반 동탄신도시 아파트 통계 분석 리포트. 동탄역 거리별 가격 상관관계 및 역세권 프리미엄 OLS 회귀분석 리포트를 제공합니다.',
    url: 'https://dongtanview.com/stats',
    siteName: 'D-VIEW',
    locale: 'ko_KR',
    type: 'website',
  },
};

export default function StatsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  const initialPayload = getDongtanStationAnalysisData();
  const { regression, distanceTiers, datasetMeta } = initialPayload;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${baseUrl}/stats#webpage`,
        url: `${baseUrl}/stats`,
        name: '동탄 아파트 통계 & 실거래가 분석 리포트 | D-VIEW 통계 랩',
        description: '100% 국토교통부 실거래가 및 입지 공공데이터 기반 동탄신도시 아파트 통계 분석 리포트.',
        publisher: {
          '@type': 'Organization',
          name: 'D-VIEW',
          url: baseUrl,
        },
      },
      {
        '@type': 'Dataset',
        '@id': `${baseUrl}/stats#dataset-dongtan-station-distance`,
        name: '동탄역 거리별 아파트 실거래가 OLS 선형회귀 및 역세권 프리미엄 분석 데이터셋',
        description: `동탄신도시 ${datasetMeta?.totalComplexCount ?? 127}개 단지(${datasetMeta?.totalTxCount ?? 0}건 실거래) 대상 GTX-A·SRT 동탄역 직선거리와 평당 매매가 간 OLS 회귀분석(기울기 ${Math.round(regression.slopeWonPerKm).toLocaleString('ko-KR')}만원/km, 상관계수 r=${regression.pearsonR.toFixed(4)}, 결정계수 R²=${regression.rSquared.toFixed(4)}, 역세권 프리미엄 +${regression.stationPremiumRatePercent.toFixed(1)}%).`,
        url: `${baseUrl}/stats`,
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
          subtitleLight={<MarketStatsLight text="100% 국토교통부 실거래가 기반 동탄신도시 통계 리서치 허브" />}
        />

        <div className="flex flex-col px-4 sm:px-6 md:px-10 lg:px-16 pt-3 md:pt-5 pb-6 md:pb-8 lg:pb-10 w-full max-w-full min-w-0 gap-6 box-border">
          <Suspense fallback={<StatsSkeleton />}>
            <StatsPageClient initialPayload={initialPayload} />
          </Suspense>

          {/* Visible SSR Semantic Regression & Distance Tier Summary (B9 Anti-Cloaking) */}
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
          </section>
        </div>
      </main>

      <MobileDock activeTab="stats" />
    </div>
  );
}
