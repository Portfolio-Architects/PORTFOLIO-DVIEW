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

const PostCreateSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(20000),
  category: z.string().min(1),
  authorUid: z.string().min(1),
  authorName: z.string().optional().default('익명'),
  verifiedApartment: z.string().optional().default(''),
  verificationLevel: z.string().optional().default(''),
  imageUrl: z.string().nullable().optional().default(null),
});

let cachedData: any = null;
let lastCacheTime = 0;
const CACHE_TTL = 15000; // 15 seconds

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

    // Cache key checks: apply only for default first page to preserve fresh paging and compose updates
    const isFirstPage = !lastCreatedAtStr && limitVal === 20;
    const now = Date.now();
    if (isFirstPage && cachedData && (now - lastCacheTime < CACHE_TTL)) {
      return NextResponse.json(cachedData);
    }

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

    if (isFirstPage) {
      cachedData = responseData;
      lastCacheTime = now;
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    logger.error('PostsAPI.GET', 'Fetch posts api error', {}, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!db) {
      logger.warn('PostsAPI.POST', 'Firebase Admin DB not initialized');
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    const body = await req.json();
    const parsed = PostCreateSchema.safeParse(body);
    
    if (!parsed.success) {
      logger.warn('PostsAPI.POST', 'Invalid post creation payload', { errors: parsed.error.format() });
      return NextResponse.json({ error: 'Invalid request payload', details: parsed.error.issues }, { status: 400 });
    }

    const { 
      title, 
      content, 
      category, 
      authorUid, 
      authorName, 
      verifiedApartment, 
      verificationLevel, 
      imageUrl 
    } = parsed.data;

    const docRef = await db.collection('posts').add({
      title,
      content,
      category,
      authorUid,
      authorName,
      verifiedApartment,
      verificationLevel,
      imageUrl,
      likes: 0,
      views: 0,
      commentCount: 0,
      createdAt: Timestamp.now(),
    });

    logger.info('PostsAPI.POST', 'Post created via background sync API', { id: docRef.id });
    return NextResponse.json({ status: 'success', id: docRef.id });
  } catch (error: any) {
    logger.error('PostsAPI.POST', 'Create post api error', {}, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
