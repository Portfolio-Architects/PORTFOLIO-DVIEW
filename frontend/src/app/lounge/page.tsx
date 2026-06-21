import { Metadata } from 'next';
import LoungeContainerClient from '@/components/LoungeContainerClient';
import { headers } from 'next/headers';
import * as PostRepo from '@/lib/repositories/post.repository';
import { logger } from '@/lib/services/logger';
import { safeJsonLd } from '@/lib/utils/structuredData';
import { getMacroNews, getLocalNotices } from '@/lib/services/newsData';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; title?: string; dept?: string }>;
}): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const noticeId = resolvedParams?.notice;
  const title = resolvedParams?.title;
  const dept = resolvedParams?.dept;

  if (noticeId && title) {
    const ogUrl = `https://dongtanview.com/api/og?type=notice&title=${encodeURIComponent(title)}&dept=${encodeURIComponent(dept || '')}`;
    return {
      title: `[동탄구 소식] ${title} - D-VIEW 라운지`,
      description: `${dept || '동탄구 소식'} - D-VIEW 실시간 행정망 공지사항 안내`,
      alternates: {
        canonical: '/lounge',
      },
      openGraph: {
        title: `[동탄구 소식] ${title}`,
        description: `${dept || '동탄구 소식'} - D-VIEW 실시간 행정망 공지사항 안내`,
        images: [
          {
            url: ogUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
    };
  }

  return {
    title: 'D-VIEW 라운지 | 동탄인들의 부동산 소통 공간',
    description: '동탄 아파트 임장기, 고민상담, 청약 정보 및 실시간 동탄 소식들을 확인해보세요.',
    alternates: {
      canonical: '/lounge',
    },
  };
}

export default async function LoungePage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; title?: string; dept?: string }>;
}) {
  const resolvedParams = await searchParams;
  let posts: Record<string, unknown>[] = [];
  let initialNews: any[] = [];
  let initialNotices: any[] = [];
  let errorMessage: string | null = null;
  
  try {
    const [fetchedPosts, fetchedNews, fetchedNoticesData] = await Promise.all([
      PostRepo.getRecentPosts(50).catch(() => []),
      getMacroNews(40).catch(() => []),
      getLocalNotices(true).catch(() => ({ notices: [], lastUpdated: null }))
    ]);
    posts = fetchedPosts;
    initialNews = fetchedNews;
    initialNotices = fetchedNoticesData.notices;
  } catch (error: unknown) {
    logger.error('LoungePage.fetchData', 'Failed to fetch lounge page data server-side', {}, error as Error);
    errorMessage = 'Failed to load posts. Please try again later.';
  }

  const nonce = (await headers()).get('x-nonce') || undefined;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "D-VIEW 라운지 최신 토크 목록",
    "description": "동탄 아파트 임장기, 고민상담, 청약 정보 및 실시간 동탄 소식들을 확인해보세요.",
    "url": `${baseUrl}/lounge`,
    "numberOfItems": posts.length,
    "itemListElement": posts.map((post: any, idx: number) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "url": `${baseUrl}/lounge/${post.id}`,
      "name": post.title
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />
      <main id="main-content" className="flex-1 w-full max-w-[2000px] mx-auto relative pb-[100px] sm:pb-12 animate-in fade-in duration-500">
        {errorMessage && (
          <div className="bg-red-50 text-red-500 p-4 rounded-xl mb-4 text-sm font-bold border border-red-200">
            🚧 Server Error: {errorMessage}
          </div>
        )}
        <LoungeContainerClient 
          initialPosts={posts as any} 
          initialNews={initialNews}
          initialNotices={initialNotices}
          searchParams={resolvedParams} 
        />
      </main>
    </>
  );
}
