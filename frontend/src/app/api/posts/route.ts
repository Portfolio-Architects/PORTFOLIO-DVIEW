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
  summary: z.string().default(''),
  apartmentName: z.string().optional()
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
    const adminDb = db;

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

    let q = adminDb.collection('posts')
      .orderBy('createdAt', 'desc')
      .limit(limitVal);

    // Bypass Firestore COLLECTION_GROUP_DESC index error by removing orderBy/startAfter.
    // Query a fixed limit, then filter and sort in-memory.
    const commentQ = adminDb.collectionGroup('comments')
      .limit(200);

    if (lastCreatedAtStr) {
      const lastCreatedAtMs = parseInt(lastCreatedAtStr, 10);
      if (!isNaN(lastCreatedAtMs)) {
        const lastDate = new Date(lastCreatedAtMs);
        const lastTimestamp = Timestamp.fromDate(lastDate);
        q = q.startAfter(lastTimestamp);
      }
    }

    const [postSnapshot, commentSnapshot] = await Promise.all([
      q.get(),
      commentQ.get()
    ]);
    
    const postsList: any[] = [];
    postSnapshot.docs.forEach(doc => {
      try {
        const data = doc.data();
        const rawContent = data.content || '';
        const imgMatch = rawContent.match(/!\[.*?\]\((.*?)\)/);
        const createdAtMs = data.createdAt ? data.createdAt.toMillis() : Date.now();
        const dateStr = new Date(createdAtMs).toLocaleDateString('ko-KR');

        postsList.push({
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
        });
      } catch (itemErr) {
        logger.error('PostsAPI.GET', `Error processing post doc ${doc.id}`, {}, itemErr as Error);
      }
    });

    const commentsList: any[] = [];
    const parentIdsToResolve = new Set<string>();
    commentSnapshot.docs.forEach(doc => {
      const parentRef = doc.ref.parent.parent;
      if (parentRef && parentRef.parent.id === 'field_reports') {
        parentIdsToResolve.add(parentRef.id);
      }
    });

    const parentMap = new Map<string, string>();
    if (parentIdsToResolve.size > 0) {
      try {
        const parentSnaps = await Promise.all(
          Array.from(parentIdsToResolve).map(id => adminDb.collection('field_reports').doc(id).get())
        );
        parentSnaps.forEach(snap => {
          if (snap.exists) {
            parentMap.set(snap.id, snap.data()?.apartmentName || '알 수 없는 단지');
          }
        });
      } catch (err) {
        logger.error('PostsAPI.GET', 'Error resolving parent field reports', {}, err as Error);
      }
    }

    const lastCreatedAtMs = lastCreatedAtStr ? parseInt(lastCreatedAtStr, 10) : NaN;

    commentSnapshot.docs.forEach(doc => {
      try {
        const parentRef = doc.ref.parent.parent;
        if (parentRef && parentRef.parent.id === 'field_reports') {
          const data = doc.data();
          const apartmentName = parentMap.get(parentRef.id) || '알 수 없는 단지';
          const createdAtMs = data.createdAt ? data.createdAt.toMillis() : Date.now();
          
          // In-memory pagination filtering
          if (!isNaN(lastCreatedAtMs) && createdAtMs >= lastCreatedAtMs) {
            return;
          }

          const dateStr = new Date(createdAtMs).toLocaleDateString('ko-KR');

          commentsList.push({
            id: `comment-${doc.id}`,
            title: `[${apartmentName}] ${data.text || ''}`,
            category: '아파트 이야기',
            author: data.authorName || '익명',
            imageUrl: null,
            likes: 0,
            views: 0,
            commentCount: 0,
            createdAt: createdAtMs,
            meta: `${dateStr} · 아파트 이야기`,
            summary: data.text || '',
            apartmentName
          });
        }
      } catch (itemErr) {
        logger.error('PostsAPI.GET', `Error processing comment doc ${doc.id}`, {}, itemErr as Error);
      }
    });

    const combined = [...postsList, ...commentsList]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limitVal);

    const posts: z.infer<typeof postItemSchema>[] = [];
    combined.forEach(item => {
      const parsedItem = postItemSchema.safeParse(item);
      if (parsedItem.success) {
        posts.push(parsedItem.data);
      } else {
        logger.warn('PostsAPI.GET', `Skipping invalid merged item (ID: ${item.id})`, { errors: parsedItem.error.format() });
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
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!db) {
      logger.warn('PostsAPI.POST', 'Firebase Admin DB not initialized');
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }
    const adminDb = db;

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

    const docRef = await adminDb.collection('posts').add({
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

    // Invalidate lounge recent posts cache in Redis to keep the feed fresh
    try {
      const { redis } = await import('@/lib/redis');
      if (redis) {
        await redis.del('DTDLS:cache:loungeRecentPosts:30').catch(() => {});
      }
    } catch (cacheErr) {
      logger.warn('PostsAPI.POST', 'Failed to invalidate lounge recent posts cache', {}, cacheErr as Error);
    }

    logger.info('PostsAPI.POST', 'Post created via background sync API', { id: docRef.id });
    return NextResponse.json({ status: 'success', id: docRef.id });
  } catch (error: any) {
    logger.error('PostsAPI.POST', 'Create post api error', {}, error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
