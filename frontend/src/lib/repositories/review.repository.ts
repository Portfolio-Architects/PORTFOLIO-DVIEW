/**
 * @module review.repository
 * @description Data Access Layer for user reviews (동네 리뷰) in Firestore.
 * Architecture Layer: Repository (CRUD only)
 */
import { db } from '@/lib/firebaseConfig';
import {
  collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, limit,
  doc, updateDoc, increment, deleteDoc, getDocs
} from 'firebase/firestore';
import { logger } from '@/lib/services/logger';
import type { UserReview } from '@/lib/types/review.types';
import { z } from 'zod';

const COLLECTION = 'user_reviews';

const UserReviewSchema = z.object({
  apartmentName: z.string().default(''),
  dong: z.string().default(''),
  rating: z.number().default(5),
  content: z.string().default(''),
  photoURL: z.string().nullable().optional(),
  author: z.string().default('익명'),
  authorUid: z.string().default(''),
  verifiedApartment: z.string().default(''),
  verificationLevel: z.string().default(''),
  likes: z.number().default(0)
}).passthrough();

/**
 * Listens to user reviews in real-time, ordered by newest first.
 */
export function listenToReviews(callback: (reviews: UserReview[]) => void): () => void {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(30));
  return onSnapshot(q, (snapshot) => {
    const reviews: UserReview[] = snapshot.docs.map(d => {
      const data = d.data();
      const dongMatch = data.apartmentName?.match(/\[(.*?)\]/);
      const mapped: any = {
        id: d.id,
        apartmentName: data.apartmentName || '',
        dong: dongMatch?.[1] || data.dong || '',
        rating: data.rating || 5,
        content: data.content || '',
        photoURL: data.photoURL,
        author: data.author || data.authorName || '익명',
        authorUid: data.authorUid || '',
        verifiedApartment: data.verifiedApartment || '',
        verificationLevel: data.verificationLevel || '',
        likes: data.likes || 0,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('ko-KR') : (data.createdAt?.toDate?.() ? data.createdAt.toDate().toLocaleDateString('ko-KR') : ''),
      };

      const parsed = UserReviewSchema.safeParse(mapped);
      if (parsed.success) {
        return {
          ...mapped,
          ...parsed.data
        } as UserReview;
      } else {
        logger.warn('ReviewRepository.listenToReviews', 'Zod validation failed, using raw fallback', { id: d.id }, parsed.error);
        return mapped as UserReview;
      }
    });
    callback(reviews);
  }, (error) => {
    logger.error('ReviewRepository.listenToReviews', 'Real-time review listener failed', undefined, error);
  });
}

/**
 * Fetches recent reviews. Supporting server-side (adminDb) and client-side (db) fetches.
 */
export async function getRecentReviews(limitCount: number = 30): Promise<UserReview[]> {
  let rawDocs: any[] = [];

  if (typeof window === 'undefined') {
    try {
      const { adminDb } = await import('@/lib/firebaseAdmin');
      if (adminDb) {
        const snap = await adminDb.collection(COLLECTION)
          .orderBy('createdAt', 'desc')
          .limit(limitCount)
          .get();
        rawDocs = snap.docs.map(d => ({ id: d.id, data: d.data() }));
      }
    } catch (adminError) {
      logger.warn('ReviewRepository.getRecentReviews', 'Admin SDK fetch failed, falling back', undefined, adminError);
    }
  }

  if (rawDocs.length === 0) {
    try {
      const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(limitCount));
      const snap = await getDocs(q);
      rawDocs = snap.docs.map(d => ({ id: d.id, data: d.data() }));
    } catch (e) {
      logger.error('ReviewRepository.getRecentReviews', 'Client SDK fetch failed', undefined, e);
      return [];
    }
  }

  return rawDocs.map(item => {
    const data = item.data;
    const dongMatch = data.apartmentName?.match(/\[(.*?)\]/);
    const mapped: any = {
      id: item.id,
      apartmentName: data.apartmentName || '',
      dong: dongMatch?.[1] || data.dong || '',
      rating: data.rating || 5,
      content: data.content || '',
      photoURL: data.photoURL,
      author: data.author || data.authorName || '익명',
      authorUid: data.authorUid || '',
      verifiedApartment: data.verifiedApartment || '',
      verificationLevel: data.verificationLevel || '',
      likes: data.likes || 0,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('ko-KR') : (data.createdAt?.toDate?.() ? data.createdAt.toDate().toLocaleDateString('ko-KR') : ''),
    };

    const parsed = UserReviewSchema.safeParse(mapped);
    if (parsed.success) {
      return {
        ...mapped,
        ...parsed.data
      } as UserReview;
    } else {
      logger.warn('ReviewRepository.getRecentReviews', 'Zod validation failed, using raw fallback', { id: item.id }, parsed.error);
      return mapped as UserReview;
    }
  });
}

/**
 * Adds a new user review.
 */
export async function addReview(
  apartmentName: string,
  rating: number,
  content: string,
  authorNickname: string,
  authorUid: string,
  verifiedApartment?: string,
  verificationLevel?: string,
  imageFile?: File,
): Promise<void> {
  try {
    let photoURL: string | undefined;

    // Upload image if provided via unified storage.service
    if (imageFile) {
      const { uploadImage } = await import('@/lib/services/storage.service');
      photoURL = await uploadImage(imageFile, 'user_reviews');
    }

    await addDoc(collection(db, COLLECTION), {
      apartmentName,
      rating,
      content,
      photoURL: photoURL || null,
      author: authorNickname,
      authorUid,
      verifiedApartment: verifiedApartment || '',
      verificationLevel: verificationLevel || '',
      likes: 0,
      createdAt: serverTimestamp(),
    });

    logger.info('ReviewRepository.addReview', 'User review created', { apartmentName, rating });
  } catch (error) {
    logger.error('ReviewRepository.addReview', 'Failed to add user review', { apartmentName, authorUid }, error);
    throw error;
  }
}

/**
 * Increments the like count of a review.
 */
export async function incrementReviewLike(reviewId: string): Promise<void> {
  try {
    const reviewRef = doc(db, COLLECTION, reviewId);
    await updateDoc(reviewRef, { likes: increment(1) });
  } catch (error) {
    logger.error('ReviewRepository.incrementReviewLike', 'Failed to increment review like', { reviewId }, error);
    throw error;
  }
}

/**
 * Deletes a user review by ID.
 * @param reviewId - The Firestore document ID
 * @throws FirestoreError if delete fails
 */
export async function deleteReview(reviewId: string): Promise<void> {
  try {
    const reviewRef = doc(db, COLLECTION, reviewId);
    await deleteDoc(reviewRef);
    logger.info('ReviewRepository.deleteReview', 'Review deleted', { reviewId });
  } catch (error) {
    logger.error('ReviewRepository.deleteReview', 'Failed to delete review', { reviewId }, error);
    throw error;
  }
}

