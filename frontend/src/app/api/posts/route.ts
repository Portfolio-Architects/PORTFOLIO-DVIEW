import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

export const dynamic = 'force-dynamic';

const postItemSchema = z.object({
  id: z.string(),
  title: z.string().default(''),
  category: z.string().default('기타'),
  author: z.string().default('익명'),
  imageUrl: z.string().nullable().default(null),
  likes: z.number().default(0),
  views: z.number().default(0),
  commentCount: z.number().default(0),
  createdAt: z.number(),
  meta: z.string(),
  summary: z.string().default('')
});

const postsResponseSchema = z.object({
  status: z.string(),
  posts: z.array(postItemSchema)
});

const PostsQuerySchema = z.object({
  lastCreatedAt: z.string().nullable().optional(),
  limit: z.preprocess(
    (val) => (val ? parseInt(val as string, 10) : undefined),
    z.number().int().min(1).max(100).default(20)
  ),
});

export async function GET(req: Request) {
  try {
    if (!db) {
      logger.warn('PostsAPI.GET', 'Firebase Admin DB not initialized');
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const queryParse = PostsQuerySchema.safeParse({
      lastCreatedAt: searchParams.get('lastCreatedAt'),
      limit: searchParams.get('limit'),
    });

    if (!queryParse.success) {
      logger.warn('PostsAPI.GET', 'Invalid query parameters', { errors: queryParse.error.format() });
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }

    const { lastCreatedAt: lastCreatedAtStr, limit: limitVal } = queryParse.data;

    let q = db.collection('posts')
      .orderBy('createdAt', 'desc')
      .limit(limitVal);

    if (lastCreatedAtStr) {
      const lastCreatedAtMs = parseInt(lastCreatedAtStr, 10);
      if (!isNaN(lastCreatedAtMs)) {
        const lastDate = new Date(lastCreatedAtMs);
        const lastTimestamp = Timestamp.fromDate(lastDate);
        q = q.startAfter(lastTimestamp);
      }
    }

    const snapshot = await q.get();
    
    const posts: z.infer<typeof postItemSchema>[] = [];
    snapshot.docs.forEach(doc => {
      try {
        const data = doc.data();
        const rawContent = data.content || '';
        
        // Extract first markdown image
        const imgMatch = rawContent.match(/!\[.*?\]\((.*?)\)/);
        
        // Format metadata
        const createdAtMs = data.createdAt ? data.createdAt.toMillis() : Date.now();
        const dateStr = new Date(createdAtMs).toLocaleDateString('ko-KR');

        const rawItem = {
          id: doc.id,
          title: data.title || '',
          category: data.category || '기타',
          author: data.authorName || '익명',
          imageUrl: imgMatch ? imgMatch[1] : (data.imageUrl || null),
          likes: data.likes || 0,
          views: data.views || 0,
          commentCount: data.commentCount || 0,
          createdAt: createdAtMs,
          meta: `${dateStr} · ${data.category || '기타'}`,
          summary: rawContent
            .replace(/!\[.*?\]\(.*?\)/g, '')
            .replace(/\[.*?\]\(.*?\)/g, '')
            .replace(/[#*~_\-`(]/g, '')
            .replace(/\s+/g, ' ')
            .replace(/https?:\/\/[^\s]+/g, '')
            .trim()
        };

        const parsedItem = postItemSchema.safeParse(rawItem);
        if (parsedItem.success) {
          posts.push(parsedItem.data);
        } else {
          logger.warn('PostsAPI.GET', `Skipping invalid post item (ID: ${doc.id})`, { errors: parsedItem.error.format() });
        }
      } catch (itemErr) {
        logger.error('PostsAPI.GET', `Error processing doc ${doc.id}`, {}, itemErr as Error);
      }
    });

    const parsedResponse = postsResponseSchema.safeParse({
      status: 'success',
      posts
    });

    const responseData = parsedResponse.success ? parsedResponse.data : {
      status: 'success',
      posts: []
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    logger.error('PostsAPI.GET', 'Fetch posts api error', {}, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
