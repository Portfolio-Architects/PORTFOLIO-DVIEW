import { Metadata } from 'next';
import LoungeContainerClient from '@/components/LoungeContainerClient';
import { getRecentPosts, type RecentLoungeItem } from '@/lib/repositories/post.repository';
import { logger } from '@/lib/services/logger';
import { safeJsonLd, getLoungeMainSchema } from '@/lib/utils/structuredData';
import { getMacroNews, getLocalNotices, type NewsItem, type NoticeData } from '@/lib/services/newsData';

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
        canonical: 'https://dongtanview.com/lounge',
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
      canonical: 'https://dongtanview.com/lounge',
    },
  };
}

export default async function LoungePage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; title?: string; dept?: string }>;
}) {
  const resolvedParams = await searchParams;
  let posts: RecentLoungeItem[] = [];
  let initialNews: NewsItem[] = [];
  let initialNotices: NoticeData[] = [];
  let errorMessage: string | null = null;
  
  try {
    const [fetchedPosts, fetchedNews, fetchedNoticesData] = await Promise.all([
      getRecentPosts(50).catch(() => []),
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

  const nonce = undefined;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "D-VIEW 라운지 최신 토크 목록",
    "description": "동탄 아파트 임장기, 고민상담, 청약 정보 및 실시간 동탄 소식들을 확인해보세요.",
    "url": `${baseUrl}/lounge`,
    "numberOfItems": posts.length,
    "itemListElement": posts.map((post: RecentLoungeItem, idx: number) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "url": `${baseUrl}/lounge/${post.id}`,
      "name": post.title
    }))
  };

  const mainSchema = getLoungeMainSchema(baseUrl);

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={safeJsonLd(mainSchema)}
      />
      
      {/* Search Engine Optimization (SSR Content) */}
      <div className="sr-only" aria-hidden="true">
        <h1>D-VIEW 주민 라운지 - 실시간 부동산 토크 및 지역 뉴스</h1>
        <p>동탄 신도시 주민들이 직접 작성하는 솔직한 아파트 임장기, 거주 후기, 고민상담과 실시간 행정망 공지사항, 거시 뉴스 피드</p>
        
        <section>
          <h2>주민 라운지 최신 토크 피드</h2>
          <ul>
            {posts.map((post: RecentLoungeItem) => (
              <li key={post.id}>
                <strong>{post.title}</strong> (카테고리: {post.category || '일반'}, 작성자: {post.author})
                <p>{post.content ? post.content.substring(0, 100) : ''}</p>
              </li>
            ))}
          </ul>
        </section>

        {initialNews.length > 0 && (
          <section style={{ marginTop: '20px' }}>
            <h2>실시간 부동산 & 금융 핵심 뉴스</h2>
            <ul>
              {initialNews.slice(0, 20).map((news: NewsItem, idx: number) => (
                <li key={idx}>
                  <strong>{news.title}</strong> (매체: {news.sub || '언론사'}, 등록일: {news.pubDate || ''})
                </li>
              ))}
            </ul>
          </section>
        )}

        {initialNotices.length > 0 && (
          <section style={{ marginTop: '20px' }}>
            <h2>동탄구 행정망 실시간 공지사항</h2>
            <ul>
              {initialNotices.slice(0, 20).map((notice: NoticeData, idx: number) => (
                <li key={idx}>
                  <strong>{notice.title}</strong> (등록부서: {notice.dept || '행정부서'}, 등록일: {notice.date || ''})
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <main id="main-content" className="flex-1 w-full max-w-[2000px] mx-auto relative pb-[100px] sm:pb-12 animate-in fade-in duration-500">
        {errorMessage && (
          <div className="bg-red-50 text-red-500 p-4 rounded-xl mb-4 text-sm font-bold border border-red-200">
            🚧 Server Error: {errorMessage}
          </div>
        )}
        <LoungeContainerClient 
          initialPosts={posts} 
          initialNews={initialNews}
          initialNotices={initialNotices}
          searchParams={resolvedParams} 
        />
      </main>
    </>
  );
}
