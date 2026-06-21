/**
 * @module comment.repository
 * @description Data Access Layer for field report comments subcollection.
 * Architecture Layer: Repository (CRUD only)
 */
import { db } from '@/lib/firebaseConfig';
import { collection, onSnapshot, query, orderBy, addDoc, doc, updateDoc, increment, serverTimestamp, getDocs, writeBatch } from 'firebase/firestore';
import { logger } from '@/lib/services/logger';
import type { CommentData } from '@/lib/types/report.types';
import { commentConverter } from '@/lib/utils/firestoreConverters';
import { z } from 'zod';
import { throttle } from '@/lib/utils/firestoreThrottle';
import { formatTimestamp } from '@/lib/utils/date';

const CommentDataSchema = z.object({
  text: z.string().default(''),
  authorName: z.string().default('익명')
}).passthrough();

/**
 * Adds a comment to a field report's subcollection and increments the comment count.
 * @param reportId - Parent report document ID
 * @param text - Comment text
 * @param authorName - Author's display name (nickname)
 * @param authorUid - Author's Firebase UID
 * @throws FirestoreError if write fails
 */
export async function addComment(
  reportId: string,
  text: string,
  authorName: string,
  authorUid: string,
  apartmentName?: string
): Promise<void> {
  try {
    const batch = writeBatch(db);

    const commentsRef = collection(db, `field_reports/${reportId}/comments`).withConverter(commentConverter);
    const newCommentRef = doc(commentsRef);
    batch.set(newCommentRef, {
      text,
      authorName,
      authorUid,
      createdAt: serverTimestamp(),
    });

    // Double-write to lounge_apt_stories collection
    if (apartmentName) {
      const aptStoriesRef = collection(db, 'lounge_apt_stories');
      const newStoryRef = doc(aptStoriesRef);
      batch.set(newStoryRef, {
        text,
        authorName,
        authorUid,
        apartmentName,
        reportId,
        createdAt: serverTimestamp(),
      });
    }

    // Increment parent report's comment counter
    const parentReportRef = doc(db, 'field_reports', reportId);
    batch.update(parentReportRef, {
      commentCount: increment(1),
    });

    await throttle(() => batch.commit());

    logger.info('CommentRepository.addComment', 'Comment added with atomic writeBatch', { reportId, apartmentName });
  } catch (error) {
    logger.error('CommentRepository.addComment', 'Failed to add comment atomically', { reportId, authorUid }, error);
    throw error;
  }
}

/**
 * Listens to comments on a specific field report in real-time.
 * @param reportId - Parent report document ID
 * @param callback - Invoked with the latest comments array on each change
 * @returns Unsubscribe function
 */
export function listenToComments(
  reportId: string,
  callback: (comments: CommentData[]) => void
): () => void {
  const q = query(
    collection(db, `field_reports/${reportId}/comments`).withConverter(commentConverter),
    orderBy('createdAt', 'asc')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const comments: CommentData[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const mapped: any = {
        id: docSnap.id,
        text: data.text || '',
        authorName: data.authorName || '익명',
        createdAt: formatTimestamp(data.createdAt, '방금 전'),
      };

      const parsed = CommentDataSchema.safeParse(mapped);
      if (parsed.success) {
        comments.push({
          id: mapped.id,
          text: parsed.data.text,
          author: parsed.data.authorName,
          createdAt: mapped.createdAt
        } as CommentData);
      } else {
        logger.warn('CommentRepository.listenToComments', 'Zod validation failed, using raw fallback', { id: docSnap.id }, parsed.error);
        comments.push({
          id: mapped.id,
          text: mapped.text,
          author: mapped.authorName,
          createdAt: mapped.createdAt
        } as CommentData);
      }
    });
    callback(comments);
  }, (error) => {
    logger.error('CommentRepository.listenToComments', 'Real-time listener failed', { reportId }, error);
  });

  return unsubscribe;
}

/**
 * Fetches comments for a specific report. Supporting server-side (adminDb) and client-side (db) fetches.
 */
export async function getComments(reportId: string): Promise<CommentData[]> {
  let rawDocs: any[] = [];

  if (typeof window === 'undefined') {
    try {
      const { adminDb } = await import('@/lib/firebaseAdmin');
      if (adminDb) {
        const snap = await throttle(() => adminDb.collection(`field_reports/${reportId}/comments`)
          .orderBy('createdAt', 'asc')
          .get());
        rawDocs = snap.docs.map(d => ({ id: d.id, data: d.data() }));
      }
    } catch (adminError) {
      logger.warn('CommentRepository.getComments', 'Admin SDK fetch failed, falling back', { reportId }, adminError);
    }
  }

  if (rawDocs.length === 0) {
    try {
      const q = query(
        collection(db, `field_reports/${reportId}/comments`).withConverter(commentConverter),
        orderBy('createdAt', 'asc')
      );
      const snap = await throttle(() => getDocs(q));
      rawDocs = snap.docs.map(d => ({ id: d.id, data: d.data() }));
    } catch (e) {
      logger.error('CommentRepository.getComments', 'Client SDK fetch failed', { reportId }, e);
      return [];
    }
  }

  return rawDocs.map(item => {
    const data = item.data;
    const mapped: any = {
      id: item.id,
      text: data.text || '',
      authorName: data.authorName || '익명',
      createdAt: formatTimestamp(data.createdAt, '방금 전'),
    };

    const parsed = CommentDataSchema.safeParse(mapped);
    if (parsed.success) {
      return {
        id: mapped.id,
        text: parsed.data.text,
        author: parsed.data.authorName,
        createdAt: mapped.createdAt
      } as CommentData;
    } else {
      logger.warn('CommentRepository.getComments', 'Zod validation failed, using raw fallback', { id: item.id }, parsed.error);
      return {
        id: mapped.id,
        text: mapped.text,
        author: mapped.authorName,
        createdAt: mapped.createdAt
      } as CommentData;
    }
  });
}

