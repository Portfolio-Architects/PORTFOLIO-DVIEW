import { Metadata } from 'next';
import { adminDb } from '@/lib/firebaseAdmin';
import LoungeContainerClient from '@/components/LoungeContainerClient';

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
    if (adminDb) {
      const snap = await adminDb.collection('posts').orderBy('createdAt', 'desc').limit(50).get();
      posts = snap.docs.map(doc => {
        const data = doc.data();
        const rawContent = data.content || '';
        
        // Extract first image
        const imgMatch = rawContent.match(/!\[.*?\]\((.*?)\)/);
        const imageUrl = imgMatch ? imgMatch[1] : null;
        
        // Clean text content for summary
        const summary = rawContent.replace(/!\[.*?\]\(.*?\)/g, '').replace(/\[.*?\]\(.*?\)/g, '').replace(/[#*~_\-`(]/g, '').replace(/\s+/g, ' ').replace(/https?:\/\/[^\s]+/g, '').trim();

        // Safely handle createdAt
        let createdAtMillis = 0;
        if (data.createdAt) {
          if (typeof data.createdAt.toMillis === 'function') {
            createdAtMillis = data.createdAt.toMillis();
          } else if (data.createdAt instanceof Date) {
            createdAtMillis = data.createdAt.getTime();
          } else if (typeof data.createdAt === 'number') {
            createdAtMillis = data.createdAt;
          }
        }

        return {
          id: doc.id,
          title: data.title || '',
          summary,
          imageUrl,
          category: data.category || '',
          author: data.authorName || data.author || '익명',
          meta: data.meta || '',
          views: data.views || 0,
          likes: data.likes || 0,
          createdAt: createdAtMillis,
        };
      });
    } else {
      errorMessage = "adminDb is null";
    }
  } catch (error: unknown) {
    console.error('Failed to fetch lounge posts server-side', error);
    errorMessage = (error as Error)?.message || String(error);
  }

  return (
    <main id="main-content" className="flex-1 w-full max-w-[2000px] mx-auto relative pb-[100px] sm:pb-12 animate-in fade-in duration-500">
      {errorMessage && (
        <div className="bg-red-50 text-red-500 p-4 rounded-xl mb-4 text-sm font-bold border border-red-200">
          🚧 Server Error: {errorMessage}
        </div>
      )}
      <LoungeContainerClient initialPosts={posts as any} searchParams={resolvedParams} />
    </main>
  );
}
