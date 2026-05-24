/**
 * @module purchase.repository
 * @description Data Access Layer for purchase records in Firestore.
 * Architecture Layer: Repository (CRUD only)
 */
import { db } from '@/lib/firebaseConfig';
import {
  collection, query, where, getDocs, addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { logger } from '@/lib/services/logger';
import type { Purchase } from '@/lib/types/purchase.types';
import { z } from 'zod';

const PurchaseDataSchema = z.object({
  reportId: z.string()
});

const COLLECTION = 'purchases';

/**
 * Checks if a user has already purchased a specific report.
 * @returns true if purchased (status = 'DONE')
 */
export async function hasPurchased(userId: string, reportId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      where('reportId', '==', reportId),
      where('status', '==', 'DONE')
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (e) {
    logger.error('PurchaseRepo.hasPurchased', 'Query failed', { userId, reportId }, e);
    throw e;
  }
}

/**
 * Creates a purchase record after successful payment confirmation.
 */
export async function createPurchase(purchase: Omit<Purchase, 'id' | 'purchasedAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...purchase,
    purchasedAt: serverTimestamp(),
  });
  logger.info('PurchaseRepo.createPurchase', 'Purchase created', {
    userId: purchase.userId,
    reportId: purchase.reportId,
    orderId: purchase.orderId,
  });
  return docRef.id;
}

/**
 * Gets all purchases for a user (to pre-load unlocked report list).
 * @returns Array of reportIds that this user has purchased
 */
export async function getUserPurchasedReportIds(userId: string): Promise<string[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      where('status', '==', 'DONE')
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(d => PurchaseDataSchema.safeParse(d.data()))
      .filter(result => result.success)
      .map(result => result.data.reportId);
  } catch (e) {
    logger.error('PurchaseRepo.getUserPurchasedReportIds', 'Query failed', { userId }, e);
    throw e;
  }
}
