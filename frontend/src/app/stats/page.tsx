import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Script from 'next/script';
import { readJsonFileCached } from '@/lib/utils/server/fileReader';
import type { RawTransactionRecord } from '@/types/stats';
import type { AptTxSummary, DongtanMacroTrendPoint } from '@/types/transaction';
import StatsDashboardClient from './StatsDashboardClient';
import StatsDashboardSkeleton from './StatsDashboardSkeleton';

export const revalidate = 600; // 10 minutes ISR

export const metadata: Metadata = {
  title: 'D-VIEW 동탄 아파트 종합 통계 리포트 | 권역별 시세·평당가 랭킹·거래량 심층 분석',
  description:
    '동탄1·2 신도시 18개년 17만 건 실거래가 전수 분석. 권역별·평형대별 평균 매매가, 평당가 랭킹 TOP 20, 전세가율 추이 및 급매·신고가 하이퍼로컬 리포트를 제공합니다.',
  alternates: {
    canonical: 'https://dongtanview.com/stats',
  },
  openGraph: {
    title: 'D-VIEW 동탄 아파트 종합 통계 리포트',
    description: '동탄 182개 단지 실거래가 통계·평당가 랭킹·전세가율 심층 대시보드',
    url: 'https://dongtanview.com/stats',
    siteName: 'D-VIEW',
    locale: 'ko_KR',
    type: 'website',
  },
};

async function StatsPageDataLoader() {
  const [recentTransactions, macroTrend, txSummary] = await Promise.all([
    readJsonFileCached<RawTransactionRecord[]>('public/data/recent-transactions.json', []),
    readJsonFileCached<DongtanMacroTrendPoint[]>('public/data/macro-trend.json', []),
    readJsonFileCached<Record<string, AptTxSummary>>('public/data/tx-summary.json', {}),
  ]);

  return (
    <>
      <StatsDashboardClient
        initialTxs={recentTransactions}
        initialMacroTrend={macroTrend}
        initialSummaryMap={txSummary}
      />

      {/* SSR Semantic HTML Fallback for SEO Crawlers (Non-JS Search Engine Discovery) */}
      <div className="sr-only" aria-hidden="true">
        <h2>동탄 신도시 아파트 법정동별 및 주요 단지 통계 요약</h2>
        <table>
          <thead>
            <tr>
              <th>단지명</th>
              <th>법정동</th>
              <th>최근 실거래가</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(txSummary)
              .slice(0, 30)
              .map(([name, item]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{item.dong || ''}</td>
                  <td>{item.latestPrice ? `${item.latestPrice}만원` : '-'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function StatsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: '동탄 신도시 아파트 실거래가 종합 통계 리포트',
    description: '동탄1·2 신도시 아파트 매매 및 전세 실거래가 종합 집계 및 랭킹 데이터',
    url: 'https://dongtanview.com/stats',
    spatialCoverage: '대한민국 경기도 화성시 동탄',
    creator: {
      '@type': 'Organization',
      name: 'D-VIEW',
    },
  };

  return (
    <>
      <Script
        id="stats-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<StatsDashboardSkeleton />}>
        <StatsPageDataLoader />
      </Suspense>
    </>
  );
}
