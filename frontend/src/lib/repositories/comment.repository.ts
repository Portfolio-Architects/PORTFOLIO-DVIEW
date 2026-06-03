/**
 * @module comment.repository
 * @description Data Access Layer for field report comments subcollection.
 * Architecture Layer: Repository (CRUD only)
 */
import { db } from '@/lib/firebaseConfig';
import { collection, onSnapshot, query, orderBy, addDoc, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { logger } from '@/lib/services/logger';
import type { CommentData } from '@/lib/types/report.types';
import { commentConverter } from '@/lib/utils/firestoreConverters';

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
  authorUid: string
): Promise<void> {
  const commentsRef = collection(db, `field_reports/${reportId}/comments`).withConverter(commentConverter);
  await addDoc(commentsRef, {
    text,
    authorName,
    authorUid,
    createdAt: serverTimestamp(),
  });

  // Increment parent report's comment counter
  await updateDoc(doc(db, 'field_reports', reportId), {
    commentCount: increment(1),
  });

  logger.info('CommentRepository.addComment', 'Comment added', { reportId });
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

  return onSnapshot(q, (snapshot) => {
    const comments: CommentData[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      comments.push({
        id: docSnap.id,
        text: data.text,
        author: data.authorName,
        createdAt: data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString('ko-KR') : '방금 전',
      });
    });
    callback(comments);
  });
}

