import { Metadata } from 'next';
import { Suspense } from 'react';
import { headers } from 'next/headers';
import NewsClient from './NewsClient';
import { getNewsMainSchema, safeJsonLd } from '@/lib/utils/structuredData';
import { getMacroNews, getLocalNotices } from '@/lib/services/newsData';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'D-VIEW 동탄 소식 | 실시간 부동산 뉴스 & 구정 행정 공지',
  description: '동탄 지역의 실시간 부동산 뉴스 및 화성시/동탄구청의 최신 구정 소식, 고시공고, 행사 축제 일정을 한데 모아 제공합니다.',
  alternates: {
    canonical: '/news',
  },
};

function NewsSkeleton() {
  return (
    <div className="w-full flex flex-col bg-transparent animate-pulse px-4 sm:px-6 md:px-10 lg:px-16 pt-3">
      {/* Page Title Skeleton */}
      <div className="min-h-[144px] py-6 flex flex-col gap-3">
        <div className="w-48 h-8 bg-black/5 dark:bg-surface/5 rounded-xl" />
        <div className="w-72 h-4 bg-black/5 dark:bg-surface/5 rounded-lg" />
      </div>
      {/* Segment Tab Skeleton */}
      <div className="w-64 h-12 bg-black/5 dark:bg-surface/5 rounded-2xl mb-8" />
      {/* Cards grid skeleton */}
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="w-full h-[110px] bg-black/5 dark:bg-surface/5 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

async function NewsDataLoader() {
  const [initialNews, initialNoticesData] = await Promise.all([
    getMacroNews(40).catch(() => []),
    getLocalNotices(true).catch(() => ({ notices: [], lastUpdated: null }))
  ]);

  return (
    <NewsClient 
      initialNews={initialNews} 
      initialNotices={initialNoticesData.notices}
    />
  );
}

export default async function NewsPage() {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') || undefined;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';

  const jsonLd = getNewsMainSchema(baseUrl);

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />
      <Suspense fallback={<NewsSkeleton />}>
        <NewsDataLoader />
      </Suspense>
    </>
  );
}

