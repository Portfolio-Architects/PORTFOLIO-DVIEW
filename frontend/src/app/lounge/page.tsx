import { adminDb } from '@/lib/firebaseAdmin';
import LoungeContainerClient from '@/components/LoungeContainerClient';

export const dynamic = 'force-dynamic';

export default async function LoungePage() {
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
    <main id="main-content" className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 pt-6 pb-[100px] sm:pb-12 animate-in fade-in duration-500">
      {errorMessage && (
        <div className="bg-red-50 text-red-500 p-4 rounded-xl mb-4 text-sm font-bold border border-red-200">
          🚧 Server Error: {errorMessage}
        </div>
      )}
      <LoungeContainerClient initialPosts={posts as any} />
    </main>
  );
}
