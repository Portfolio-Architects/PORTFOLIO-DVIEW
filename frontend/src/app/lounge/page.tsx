import { Metadata } from 'next';
import LoungeContainerClient from '@/components/LoungeContainerClient';
import { headers } from 'next/headers';
import * as PostRepo from '@/lib/repositories/post.repository';

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
  let errorMessage: string | null = null;
  
  try {
    posts = await PostRepo.getRecentPosts(50);
  } catch (error: unknown) {
    console.error('Failed to fetch lounge posts server-side', error);
    errorMessage = (error as Error)?.message || String(error);
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main id="main-content" className="flex-1 w-full max-w-[2000px] mx-auto relative pb-[100px] sm:pb-12 animate-in fade-in duration-500">
        {errorMessage && (
          <div className="bg-red-50 text-red-500 p-4 rounded-xl mb-4 text-sm font-bold border border-red-200">
            🚧 Server Error: {errorMessage}
          </div>
        )}
        <LoungeContainerClient initialPosts={posts as any} searchParams={resolvedParams} />
      </main>
    </>
  );
}
