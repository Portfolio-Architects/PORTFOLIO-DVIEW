import React, { Suspense } from 'react';
import { Metadata } from 'next';
import LoungeHeader from '@/components/LoungeHeader';
import MobileDock from '@/components/pwa/MobileDock';
import PageHeroHeader from '@/components/PageHeroHeader';
import { MarketStatsStrong, MarketStatsLight } from '@/components/common/MarketStatsSubtitle';
import { safeJsonLd } from '@/lib/utils/structuredData';
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

  const jsonLd = {
    '@context': 'https://schema.org',
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
            <StatsPageClient />
          </Suspense>
        </div>
      </main>

      <MobileDock activeTab="stats" />
    </div>
  );
}
