import { Metadata } from 'next';
import LoungeDetailClient from '@/components/LoungeDetailClient';
import { adminDb } from '@/lib/firebaseAdmin';
import { headers } from 'next/headers';

export const revalidate = 60; // Cache and revalidate page at most once every 60 seconds
export const dynamicParams = true; // Enable on-demand generation for posts not pre-rendered

export async function generateStaticParams() {
  if (!adminDb) return [];
  try {
    const snap = await adminDb.collection('posts').orderBy('createdAt', 'desc').limit(10).get();
    return snap.docs.map((doc) => ({
      id: doc.id,
    }));
  } catch (error) {
    console.error('Failed to generateStaticParams for lounge posts', error);
    return [];
  }
}

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
  const keywords = ['동탄', 'D-VIEW', '라운지', '실거래가', '부동산', '아파트'];

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
    alternates: {
      canonical: `/lounge/${id}`,
    },
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
  let initialPost: Record<string, any> | undefined = undefined;
  const nonce = (await headers()).get('x-nonce') || undefined;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';

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
            createdAt: data.createdAt ? data.createdAt.toMillis() : null,
          };
        }
      }
    } catch (error) {
      console.error('Failed to fetch initial post in server', error);
    }
  }

  // Generate clean text body for LLM/Search engines by stripping markdown elements
  let cleanContentText = '';
  if (initialPost?.content) {
    const contentWithoutImages = initialPost.content.replace(/!\[.*?\]\(.*?\)/g, '');
    cleanContentText = contentWithoutImages.replace(/[#*`~_\->]/g, '').replace(/\s+/g, ' ').trim();
  }

  const jsonLd = initialPost ? {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    "@id": `${baseUrl}/lounge/${id}`,
    "headline": initialPost.title,
    "articleBody": cleanContentText,
    "datePublished": initialPost.createdAt ? new Date(initialPost.createdAt).toISOString() : undefined,
    "author": {
      "@type": "Person",
      "name": initialPost.author
    },
    "publisher": {
      "@type": "Organization",
      "name": "D-VIEW",
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/logo.png`
      }
    },
    "interactionStatistic": [
      {
        "@type": "InteractionCounter",
        "interactionType": "https://schema.org/ViewAction",
        "userInteractionCount": Number(initialPost.views || 0)
      },
      {
        "@type": "InteractionCounter",
        "interactionType": "https://schema.org/LikeAction",
        "userInteractionCount": Number(initialPost.likes || 0)
      }
    ]
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <LoungeDetailClient postId={id} initialPost={initialPost} />
    </>
  );
}
