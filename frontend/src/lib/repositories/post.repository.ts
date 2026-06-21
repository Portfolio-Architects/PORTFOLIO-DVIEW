/**
 * @module post.repository
 * @description Data Access Layer for 'posts' Firestore collection.
 * Architecture Layer: Repository (CRUD only, no business logic)
 * 
 * Rationale: Isolates Firestore-specific operations so the Service layer
 * remains database-agnostic. Enables future migration to another DB.
 */
import { db } from '@/lib/firebaseConfig';
import { collection, onSnapshot, query, orderBy, limit, addDoc, doc, updateDoc, increment, deleteDoc, serverTimestamp, getDoc, getDocs, collectionGroup } from 'firebase/firestore';
import { logger } from '@/lib/services/logger';
import type { NewsItemData } from '@/lib/types/dashboard.types';
import { Train, Building, BookOpen, MessageSquare } from 'lucide-react';
import { postConverter, PostDocument } from '@/lib/utils/firestoreConverters';
import { throttle } from '@/lib/utils/firestoreThrottle';
import { PostDataSchema } from '@/lib/validation/facade.schemas';
import { executeIsomorphicQuery } from './isomorphicHelper';


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
    const postRef = doc(db, 'posts', postId);
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
  // Fire and forget: run view increment, traffic api, and cache invalidation asynchronously
  (async () => {
    try {
      const postRef = doc(db, 'posts', postId);
      await throttle(() => updateDoc(postRef, { views: increment(1) }));
      await TrafficRepo.incrementContentView(postId, title, 'lounge');
      await invalidatePostCache(postId);
    } catch (innerError) {
      logger.error('PostRepository.incrementPostView', 'Asynchronous view count pipeline failed', { postId }, innerError);
    }
  })();
}

/**
 * Deletes a post document from Firestore.
 * @param postId - The Firestore document ID
 * @throws FirestoreError if delete fails
 */
export async function deletePost(postId: string): Promise<void> {
  try {
    const postRef = doc(db, 'posts', postId).withConverter(postConverter);
    const snap = await throttle(() => getDoc(postRef));
    if (snap.exists()) {
      const data = snap.data();
      if (data?.imageUrl) {
        const { deleteImage } = await import('@/lib/services/storage.service');
        // Run asynchronously in the background to avoid blocking post deletion
        deleteImage(data.imageUrl).catch(() => {});
      }
    }
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

  const docData = await executeIsomorphicQuery<any>({
    cacheKey,
    cacheEx: 15,
    serverQuery: async () => {
      const { adminDb } = await import('@/lib/firebaseAdmin');
      if (!adminDb) return null;
      const snap = await throttle(() => adminDb.collection('posts').doc(postId).get());
      if (snap.exists) {
        return { id: snap.id, ...snap.data() };
      }
      return null;
    },
    clientQuery: async () => {
      const docRef = doc(db, 'posts', postId).withConverter(postConverter);
      const snap = await throttle(() => getDoc(docRef));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
      return null;
    }
  });

  if (!docData) return null;

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

  return {
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
}

export async function getRecentPosts(limitCount: number = 30): Promise<any[]> {
  const cacheKey = `DTDLS:cache:loungeRecentPosts:${limitCount}`;

  const result = await executeIsomorphicQuery<any[]>({
    cacheKey,
    cacheEx: 30,
    serverQuery: async () => {
      const { adminDb } = await import('@/lib/firebaseAdmin');
      if (!adminDb) return null;
      
      const [postsSnap, commentsSnap] = await Promise.all([
        throttle(() => adminDb.collection('posts')
          .orderBy('createdAt', 'desc')
          .limit(limitCount)
          .get()),
        throttle(() => adminDb.collectionGroup('comments')
          .orderBy('createdAt', 'desc')
          .limit(100)
          .get())
      ]);
      const rawPosts = postsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const rawComments = commentsSnap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() }));
      
      return processCombinedPosts(rawPosts, rawComments, limitCount);
    },
    clientQuery: async () => {
      const [postsSnap, commentsSnap] = await Promise.all([
        throttle(() => getDocs(query(
          collection(db, 'posts').withConverter(postConverter),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        ))),
        throttle(() => getDocs(query(
          collectionGroup(db, 'comments'),
          orderBy('createdAt', 'desc'),
          limit(100)
        )))
      ]);
      const rawPosts = postsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const rawComments = commentsSnap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() }));
      
      return processCombinedPosts(rawPosts, rawComments, limitCount);
    }
  });

  return result || [];
}

async function processCombinedPosts(rawPosts: any[], rawComments: any[], limitCount: number): Promise<any[]> {
  // Filter comments to only include those under field_reports
  const filteredComments = rawComments.filter(c => {
    const parentRef = c.ref?.parent?.parent;
    return parentRef && parentRef.parent?.id === 'field_reports';
  });

  // Resolve parent report names
  const parentIds = Array.from(new Set(filteredComments.map(c => c.ref.parent.parent.id)));
  const parentMap = new Map<string, string>();
  if (parentIds.length > 0) {
    if (typeof window === 'undefined') {
      try {
        const { adminDb } = await import('@/lib/firebaseAdmin');
        if (adminDb) {
          const snaps = await Promise.all(parentIds.map(id => adminDb.collection('field_reports').doc(id).get()));
          snaps.forEach(s => {
            if (s.exists) parentMap.set(s.id, s.data()?.apartmentName || '알 수 없는 단지');
          });
        }
      } catch (_) {}
    } else {
      try {
        const snaps = await Promise.all(parentIds.map(id => getDoc(doc(db, 'field_reports', id))));
        snaps.forEach(s => {
          if (s.exists()) parentMap.set(s.id, s.data()?.apartmentName || '알 수 없는 단지');
        });
      } catch (_) {}
    }
  }

  const postsList = rawPosts.map(docData => {
    const parsed = PostDataSchema.safeParse(docData);
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

  const commentsList = filteredComments.map(c => {
    const parentId = c.ref.parent.parent.id;
    const apartmentName = parentMap.get(parentId) || '알 수 없는 단지';
    const createdAtVal = c.createdAt;
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

    const dateStr = createdAtMillis ? new Date(createdAtMillis).toLocaleDateString('ko-KR') : '방금 전';

    return {
      id: `comment-${c.id}`,
      title: `[${apartmentName}] ${c.text || ''}`,
      summary: c.text || '',
      imageUrl: null,
      category: '아파트 이야기',
      author: c.authorName || '익명',
      meta: `${dateStr} · 아파트 이야기`,
      views: 0,
      likes: 0,
      commentCount: 0,
      createdAt: createdAtMillis,
      authorUid: c.authorUid || null,
      apartmentName
    };
  });

  return [...postsList, ...commentsList]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, limitCount);
}



