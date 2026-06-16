/**
 * @module post.repository
 * @description Data Access Layer for 'posts' Firestore collection.
 * Architecture Layer: Repository (CRUD only, no business logic)
 * 
 * Rationale: Isolates Firestore-specific operations so the Service layer
 * remains database-agnostic. Enables future migration to another DB.
 */
import { db } from '@/lib/firebaseConfig';
import { collection, onSnapshot, query, orderBy, limit, addDoc, doc, updateDoc, increment, deleteDoc, serverTimestamp, getDoc, getDocs } from 'firebase/firestore';
import { logger } from '@/lib/services/logger';
import type { NewsItemData } from '@/lib/types/dashboard.types';
import { Train, Building, BookOpen, MessageSquare } from 'lucide-react';
import { postConverter, PostDocument } from '@/lib/utils/firestoreConverters';
import { z } from 'zod';
import { throttle } from '@/lib/utils/firestoreThrottle';

export const PostDataSchema = z.object({
  title: z.string().default(''),
  category: z.string().default('자유'),
  content: z.string().default(''),
  authorName: z.string().default('익명'),
  authorUid: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  verifiedApartment: z.string().nullable().optional(),
  verificationLevel: z.string().nullable().optional(),
  likes: z.number().default(0),
  views: z.number().default(0),
  commentCount: z.number().default(0),
}).passthrough();


/**
 * Listens to the 'posts' collection in real-time.
 * @param callback - Invoked with the latest posts array on each change
 * @returns Unsubscribe function
 */
export function listenToPosts(callback: (posts: NewsItemData[]) => void): () => void {
  const q = query(
    collection(db, 'posts').withConverter(postConverter),
    orderBy('createdAt', 'desc'),
    limit(30)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const posts: NewsItemData[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      let icon = MessageSquare;
      let tagClass = 'tag-culture';

      if (data.category === '교통') { icon = Train; tagClass = 'tag-traffic'; }
      else if (data.category === '부동산') { icon = Building; tagClass = 'tag-realestate'; }
      else if (data.category === '교육') { icon = BookOpen; tagClass = 'tag-edu'; }

      const dateStr = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString('ko-KR') : '방금 전';

      posts.push({
        id: docSnap.id,
        title: data.title,
        meta: `${dateStr} · ${data.category}`,
        content: data.content || undefined,
        author: data.authorName || '익명',
        imageUrl: data.imageUrl || undefined,
        tagClass,
        icon,
        likes: data.likes || 0,
        views: data.views || 0,
        authorUid: data.authorUid || undefined,
        verifiedApartment: data.verifiedApartment || undefined,
        verificationLevel: data.verificationLevel || undefined,
      });
    });

    callback(posts);
  }, (error) => {
    logger.error('PostRepository.listenToPosts', 'Real-time post listener failed', undefined, error);
  });

  return unsubscribe;
}

/**
 * Creates a new post document in Firestore.
 * @param data - Post data to persist
 * @returns The new document ID
 * @throws FirestoreError if write fails
 */
export async function createPost(data: {
  title: string;
  category: string;
  content?: string;
  authorName: string;
  authorUid: string;
  imageUrl: string | null;
  verifiedApartment?: string;
  verificationLevel?: string;
}): Promise<string> {
  try {
    const docRef = await throttle(() => addDoc(collection(db, 'posts').withConverter(postConverter), {
      ...data,
      likes: 0,
      views: 0,
      createdAt: serverTimestamp(),
    } as PostDocument));
    logger.info('PostRepository.createPost', 'Post created', { id: docRef.id });
    return docRef.id;
  } catch (error) {
    logger.error('PostRepository.createPost', 'Failed to create post in Firestore', { title: data.title, authorUid: data.authorUid }, error);
    throw error;
  }
}

async function invalidatePostCache(postId: string): Promise<void> {
  if (typeof window === 'undefined') {
    try {
      const { redis } = await import('@/lib/redis');
      if (redis) {
        await redis.del(`DTDLS:cache:loungePost:${postId}`).catch(() => {});
      }
    } catch (_) {}
  }
}

/**
 * Increments the like counter on a post.
 * @param postId - The Firestore document ID
 * @throws FirestoreError if update fails
 */
export async function incrementPostLike(postId: string): Promise<void> {
  try {
    const postRef = doc(db, 'posts', postId).withConverter(postConverter);
    await throttle(() => updateDoc(postRef, { likes: increment(1) }));
    await invalidatePostCache(postId);
  } catch (error) {
    logger.error('PostRepository.incrementPostLike', 'Failed to increment post like', { postId }, error);
    throw error;
  }
}

import * as TrafficRepo from '@/lib/repositories/traffic.repository';

/**
 * Increments the view counter on a post.
 * @param postId - The Firestore document ID
 * @param title - The post title for daily stats
 * @throws FirestoreError if update fails
 */
export async function incrementPostView(postId: string, title: string = '알 수 없는 글'): Promise<void> {
  try {
    const postRef = doc(db, 'posts', postId).withConverter(postConverter);
    await throttle(() => updateDoc(postRef, { views: increment(1) }));
    await TrafficRepo.incrementContentView(postId, title, 'lounge');
    await invalidatePostCache(postId);
  } catch (error) {
    logger.error('PostRepository.incrementPostView', 'Failed to increment post view', { postId }, error);
    throw error;
  }
}

/**
 * Deletes a post document from Firestore.
 * @param postId - The Firestore document ID
 * @throws FirestoreError if delete fails
 */
export async function deletePost(postId: string): Promise<void> {
  try {
    const postRef = doc(db, 'posts', postId).withConverter(postConverter);
    await throttle(() => deleteDoc(postRef));
    logger.info('PostRepository.deletePost', 'Post deleted', { postId });
    await invalidatePostCache(postId);
  } catch (error) {
    logger.error('PostRepository.deletePost', 'Failed to delete post from Firestore', { postId }, error);
    throw error;
  }
}


/**
 * Fetches a single post. Supporting server-side (adminDb) and client-side (db) fetches.
 */
export async function getPost(postId: string): Promise<any | null> {
  const cacheKey = `DTDLS:cache:loungePost:${postId}`;

  if (typeof window === 'undefined') {
    try {
      const { redis } = await import('@/lib/redis');
      if (redis) {
        const cached = await redis.get<any>(cacheKey);
        if (cached !== null) {
          if (cached === 'null') return null;
          return cached;
        }
      }
    } catch (e) {
      logger.warn('PostRepository.getPost', 'Redis read error', { postId }, e as Error);
    }
  }

  let docData: any = null;

  if (typeof window === 'undefined') {
    try {
      const { adminDb } = await import('@/lib/firebaseAdmin');
      if (adminDb) {
        const snap = await throttle(() => adminDb.collection('posts').doc(postId).get());
        if (snap.exists) {
          docData = { id: snap.id, ...snap.data() };
        }
      }
    } catch (adminError) {
      logger.warn('PostRepository.getPost', 'Admin SDK fetch failed, falling back', { postId }, adminError);
    }
  }

  if (!docData) {
    try {
      const docRef = doc(db, 'posts', postId).withConverter(postConverter);
      const snap = await throttle(() => getDoc(docRef));
      if (snap.exists()) {
        docData = { id: snap.id, ...snap.data() };
      }
    } catch (e) {
      logger.error('PostRepository.getPost', 'Client SDK fetch failed', { postId }, e);
      if (typeof window === 'undefined') {
        try {
          const { redis } = await import('@/lib/redis');
          if (redis) {
            await redis.set(cacheKey, 'null', { ex: 60 }).catch(() => {});
          }
        } catch (_) {}
      }
      return null;
    }
  }

  if (!docData) {
    if (typeof window === 'undefined') {
      try {
        const { redis } = await import('@/lib/redis');
        if (redis) {
          await redis.set(cacheKey, 'null', { ex: 60 }).catch(() => {});
        }
      } catch (_) {}
    }
    return null;
  }

  const parsed = PostDataSchema.safeParse(docData);
  if (!parsed.success) {
    logger.warn('PostRepository.getPost', 'Zod validation failed, using fallback/raw', { postId }, parsed.error);
  }

  const data = parsed.success ? parsed.data : docData;
  const createdAtVal = docData.createdAt;
  let createdAtMillis = null;

  if (createdAtVal) {
    if (typeof createdAtVal.toMillis === 'function') {
      createdAtMillis = createdAtVal.toMillis();
    } else if (createdAtVal instanceof Date) {
      createdAtMillis = createdAtVal.getTime();
    } else if (typeof createdAtVal.toDate === 'function') {
      createdAtMillis = createdAtVal.toDate().getTime();
    } else if (typeof createdAtVal === 'number') {
      createdAtMillis = createdAtVal;
    } else if (typeof createdAtVal === 'object' && createdAtVal._seconds) {
      createdAtMillis = createdAtVal._seconds * 1000;
    }
  }

  const result = {
    id: docData.id,
    title: data.title || '',
    category: data.category || '',
    content: data.content || '',
    author: data.authorName || '익명',
    likes: data.likes || 0,
    views: data.views || 0,
    authorUid: data.authorUid || null,
    verifiedApartment: data.verifiedApartment || null,
    verificationLevel: data.verificationLevel || null,
    createdAt: createdAtMillis,
  };

  if (typeof window === 'undefined') {
    try {
      const { redis } = await import('@/lib/redis');
      if (redis) {
        await redis.set(cacheKey, result, { ex: 15 }).catch(err =>
          logger.warn('PostRepository.getPost', 'Redis write error', { postId }, err as Error)
        );
      }
    } catch (_) {}
  }

  return result;
}

/**
 * Fetches recent posts. Supporting server-side (adminDb) and client-side (db) fetches.
 */
export async function getRecentPosts(limitCount: number = 30): Promise<any[]> {
  const cacheKey = `DTDLS:cache:loungeRecentPosts:${limitCount}`;
  
  if (typeof window === 'undefined') {
    try {
      const { redis } = await import('@/lib/redis');
      if (redis) {
        const cached = await redis.get<any[]>(cacheKey);
        if (cached) {
          return cached;
        }
      }
    } catch (e) {
      logger.warn('PostRepository.getRecentPosts', 'Redis read error', { limitCount }, e as Error);
    }
  }

  let rawDocs: any[] = [];

  if (typeof window === 'undefined') {
    try {
      const { adminDb } = await import('@/lib/firebaseAdmin');
      if (adminDb) {
        const snap = await throttle(() => adminDb.collection('posts')
          .orderBy('createdAt', 'desc')
          .limit(limitCount)
          .get());
        rawDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (adminError) {
      logger.warn('PostRepository.getRecentPosts', 'Admin SDK fetch failed, falling back', undefined, adminError);
    }
  }

  if (rawDocs.length === 0) {
    try {
      const q = query(
        collection(db, 'posts').withConverter(postConverter),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const snap = await throttle(() => getDocs(q));
      rawDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      logger.error('PostRepository.getRecentPosts', 'Client SDK fetch failed', undefined, e);
      return [];
    }
  }

  const posts = rawDocs.map(docData => {
    const parsed = PostDataSchema.safeParse(docData);
    if (!parsed.success) {
      logger.warn('PostRepository.getRecentPosts', 'Zod validation failed, using fallback/raw', { id: docData.id }, parsed.error);
    }

    const data = parsed.success ? parsed.data : docData;
    const createdAtVal = docData.createdAt;
    let createdAtMillis = null;

    if (createdAtVal) {
      if (typeof createdAtVal.toMillis === 'function') {
        createdAtMillis = createdAtVal.toMillis();
      } else if (createdAtVal instanceof Date) {
        createdAtMillis = createdAtVal.getTime();
      } else if (typeof createdAtVal.toDate === 'function') {
        createdAtMillis = createdAtVal.toDate().getTime();
      } else if (typeof createdAtVal === 'number') {
        createdAtMillis = createdAtVal;
      } else if (typeof createdAtVal === 'object' && createdAtVal._seconds) {
        createdAtMillis = createdAtVal._seconds * 1000;
      }
    }

    const rawContent = data.content || '';
    const imgMatch = rawContent.match(/!\[.*?\]\((.*?)\)/);
    const imageUrl = imgMatch ? imgMatch[1] : null;

    const summary = rawContent
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/[#*~_\-`(]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/https?:\/\/[^\s]+/g, '')
      .trim();

    return {
      id: docData.id,
      title: data.title || '',
      summary,
      imageUrl: imageUrl || data.imageUrl || null,
      category: data.category || '',
      author: data.authorName || '익명',
      meta: createdAtMillis ? `${new Date(createdAtMillis).toLocaleDateString('ko-KR')} · ${data.category || ''}` : `방금 전 · ${data.category || ''}`,
      views: data.views || 0,
      likes: data.likes || 0,
      commentCount: data.commentCount || 0,
      createdAt: createdAtMillis,
      authorUid: data.authorUid || null,
      verifiedApartment: data.verifiedApartment || null,
      verificationLevel: data.verificationLevel || null,
    };
  });

  if (typeof window === 'undefined' && posts.length > 0) {
    try {
      const { redis } = await import('@/lib/redis');
      if (redis) {
        await redis.set(cacheKey, posts, { ex: 30 }).catch(err =>
          logger.warn('PostRepository.getRecentPosts', 'Redis write error', { limitCount }, err as Error)
        );
      }
    } catch (e) {
      // Ignore dynamic import error if any
    }
  }

  return posts;
}


