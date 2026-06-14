import { Metadata } from 'next';
import { Suspense } from 'react';
import { headers } from 'next/headers';
import { getInitialData } from '@/lib/services/dashboardData';
import ExploreClient from './ExploreClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'D-VIEW 아파트 탐색 | 동탄 전역 아파트 실거래가 및 입지 가치 비교',
  description: '동탄 179개 아파트 단지의 실거래가 변동 추이, 평단가 순위, 전세가율 갭투자 리스크 및 입지 가치 분석 표 제공.',
  alternates: {
    canonical: '/explore',
  },
};

function ExploreSkeleton() {
  return (
    <div className="w-full flex flex-col bg-transparent animate-pulse px-4 sm:px-6 md:px-10 lg:px-16 pt-3">
      {/* Page Title Skeleton */}
      <div className="min-h-[144px] py-6 flex flex-col gap-3">
        <div className="w-48 h-8 bg-black/5 dark:bg-surface/5 rounded-xl" />
        <div className="w-72 h-4 bg-black/5 dark:bg-surface/5 rounded-lg" />
      </div>
      {/* Filters bar */}
      <div className="w-full h-12 bg-black/5 dark:bg-surface/5 rounded-2xl mb-6" />
      {/* List items */}
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="w-full h-[66px] bg-black/5 dark:bg-surface/5 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

async function ExploreDataLoader() {
  const initialData = await getInitialData();
  return <ExploreClient initialDashboardData={initialData} />;
}

export default async function ExplorePage() {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') || undefined;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${baseUrl}/explore#webpage`,
    "url": `${baseUrl}/explore`,
    "name": "D-VIEW 아파트 탐색 | 동탄 전역 아파트 실거래가 및 입지 가치 비교",
    "description": "동탄 179개 아파트 단지의 실거래가 변동 추이, 평단가 순위, 전세가율 갭투자 리스크 및 입지 가치 분석 표 제공.",
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "D-VIEW 홈",
          "item": baseUrl
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "아파트 탐색",
          "item": `${baseUrl}/explore`
        }
      ]
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<ExploreSkeleton />}>
        <ExploreDataLoader />
      </Suspense>
    </>
  );
}
