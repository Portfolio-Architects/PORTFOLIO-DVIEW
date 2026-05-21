import { Metadata } from 'next';
import LoungeDetailClient from '@/components/LoungeDetailClient';
import { adminDb } from '@/lib/firebaseAdmin';

interface Props {
  params: Promise<{ id: string }>;
}

// Next.js 15+ Server Component for dynamic SEO requires await for params
export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { id } = params;
  let title = '동탄 라운지 게시글 | D-VIEW';
  let description = '동탄 주민들의 솔직한 리얼 실거래가 라운지 이야기입니다.';
  let imageUrl: string | undefined = undefined;
  let keywords = ['동탄', 'D-VIEW', '라운지', '실거래가', '부동산', '아파트'];

  if (!id) return { title, description };

  if (adminDb) {
    try {
      const docSnap = await adminDb.collection('posts').doc(id).get();
      if (docSnap.exists) {
        const data = docSnap.data();
        if (data) {
          title = `${data.title} | D-VIEW 라운지`;
          
          if (data.category) keywords.push(data.category);
          if (data.verifiedApartment) keywords.push(data.verifiedApartment);
          
          if (data.content) {
            // Extract the first image URL from markdown
            const imageMatch = data.content.match(/!\[.*?\]\((.*?)\)/);
            if (imageMatch && imageMatch[1]) {
              imageUrl = imageMatch[1];
            }

            // Remove image markdown completely before generating description
            const contentWithoutImages = data.content.replace(/!\[.*?\]\(.*?\)/g, '');
            // Clean other markdown symbols and normalize spaces
            const cleanContent = contentWithoutImages.replace(/[#*`~_\->]/g, '').replace(/\s+/g, ' ').trim();
            // SEO optimal description length is around 155-160 characters
            description = cleanContent.length > 155 ? cleanContent.substring(0, 155) + '...' : cleanContent;
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch post for metadata', error);
    }
  }

  const ogImages = imageUrl ? [{ url: imageUrl, alt: title }] : undefined;

  return {
    title,
    description,
    keywords: keywords.join(', '),
    openGraph: {
      title,
      description,
      siteName: 'D-VIEW',
      locale: 'ko_KR',
      type: 'article',
      ...(ogImages && { images: ogImages }),
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(imageUrl && { images: [imageUrl] }),
    },
  };
}

export default async function LoungePostPage(props: Props) {
  const params = await props.params;
  const { id } = params;
  let initialPost: Record<string, unknown> | undefined = undefined;

  if (adminDb && id) {
    try {
      const docSnap = await adminDb.collection('posts').doc(id).get();
      if (docSnap.exists) {
        const data = docSnap.data();
        if (data) {
          initialPost = {
            id: docSnap.id,
            title: data.title,
            category: data.category,
            content: data.content || '',
            author: data.authorName || '익명',
            likes: data.likes || 0,
            views: data.views || 0,
            authorUid: data.authorUid || null,
            verifiedApartment: data.verifiedApartment || null,
            verificationLevel: data.verificationLevel || null,
            createdAt: data.createdAt ? data.createdAt.toMillis() : Date.now(),
          };
        }
      }
    } catch (error) {
      console.error('Failed to fetch initial post in server', error);
    }
  }

  // Pass the ID and the prefetched data to the client component to render SSR
  return <LoungeDetailClient postId={id} initialPost={initialPost} />;
}
