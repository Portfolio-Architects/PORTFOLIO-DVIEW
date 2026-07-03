/**
 * @module report.repository
 * @description Data Access Layer for 'scoutingReports' Firestore collection.
 * Architecture Layer: Repository (CRUD only, no business logic)
 */
import { db } from '@/lib/firebaseConfig';
import { collection, onSnapshot, query, limit, doc, updateDoc, increment, getDoc, getDocs, where, QuerySnapshot, DocumentData, QueryDocumentSnapshot, orderBy } from 'firebase/firestore';
import type { FieldReportData } from '@/lib/types/report.types';
import { logger } from '@/lib/services/logger';
import { z } from 'zod';
import { formatTimestamp, parseTimestampToMillis } from '@/lib/utils/date';
import { throttle } from '@/lib/utils/firestoreThrottle';
import { FieldReportDataSchema } from '@/lib/validation/facade.schemas';
import { executeIsomorphicQuery } from './isomorphicHelper';
import type * as admin from 'firebase-admin';

// Module-level cache for dynamic firebaseAdmin import
let cachedAdminDb: admin.firestore.Firestore | null = null;
let isAdminDbLoaded = false;

async function getAdminDb(): Promise<admin.firestore.Firestore | null> {
  if (typeof window === 'undefined') {
    if (isAdminDbLoaded) return cachedAdminDb;
    try {
      const { adminDb } = await import('@/lib/firebaseAdmin');
      cachedAdminDb = (adminDb as admin.firestore.Firestore) || null;
    } catch (err) {
      logger.warn('ReportRepository.getAdminDb', 'Failed to dynamically import @/lib/firebaseAdmin', {}, err as Error);
      cachedAdminDb = null;
    }
    isAdminDbLoaded = true;
    return cachedAdminDb;
  }
  return null;
}



/**
 * Listens to the 'scoutingReports' collection in real-time.
 * Maps only lightweight fields needed for list cards.
 * Heavy fields (sections, images) are loaded on-demand via getFullReport().
 * @param callback - Invoked with the latest reports array on each change
 * @returns Unsubscribe function
 */
export function listenToReports(callback: (reports: FieldReportData[]) => void): () => void {
  const q = query(
    collection(db, 'scoutingReports'),
    orderBy('createdAt', 'desc'),
    limit(30)
  );

  const mapSnapshot = (snapshot: QuerySnapshot<DocumentData>): FieldReportData[] => {
    const reports: FieldReportData[] = [];
    snapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
      const data = docSnap.data();
      reports.push({
        id: docSnap.id,
        dong: data.dong || '오산동 (동탄역)',
        apartmentName: data.apartmentName,
        premiumScores: data.premiumScores,
        premiumContent: data.premiumContent,
        author: '데이터 랩스',
        likes: data.likes || 0,
        viewCount: data.viewCount || 0,
        commentCount: data.commentCount || 0,
        images: data.images || [],
        metrics: data.metrics,
        scoutingDate: data.scoutingDate || '',
        createdAt: formatTimestamp(data.createdAt, '방금 전'),
        // keep raw timestamp for sorting
        _rawTimestamp: parseTimestampToMillis(data.createdAt, 0), 
      } as FieldReportData & { _rawTimestamp: number });
    });
    return reports.sort((a, b) => (b as FieldReportData & { _rawTimestamp: number })._rawTimestamp - (a as FieldReportData & { _rawTimestamp: number })._rawTimestamp);
  };

  let primaryUnsubscribed = false;
  let fallbackUnsubscribe: (() => void) | null = null;

  const unsubPrimary = onSnapshot(q, (snapshot) => {
    const mapped = mapSnapshot(snapshot);
    logger.debug('ReportRepository.listenToScoutingReports', 'Invoking callback with mapped reports', { count: mapped.length });
    callback(mapped);
  }, (error) => {
    logger.error('ReportRepository.listenToScoutingReports', 'onSnapshot error, falling back to unordered query', {}, error);
    if (primaryUnsubscribed) return;

    // Fallback: query without orderBy (no index needed)
    const fallbackQ = query(collection(db, 'scoutingReports'), limit(30));
    const unsubFallback = onSnapshot(fallbackQ, (fallbackSnapshot) => {
      const fallbackMapped = mapSnapshot(fallbackSnapshot);
      logger.debug('ReportRepository.listenToScoutingReports', 'Invoking callback from fallback', { count: fallbackMapped.length });
      callback(fallbackMapped);
    }, (fallbackError) => {
      logger.error('ReportRepository.listenToScoutingReports', 'Fallback also failed', {}, fallbackError);
      logger.debug('ReportRepository.listenToScoutingReports', 'Invoking callback from fallback error with length 0');
      callback([]);
    });

    fallbackUnsubscribe = unsubFallback;
  });

  return () => {
    primaryUnsubscribed = true;
    unsubPrimary();
    if (fallbackUnsubscribe) {
      fallbackUnsubscribe();
    }
  };
}

export async function getFullReport(reportId: string): Promise<FieldReportData | null> {
  let rawReport: Record<string, unknown> | null = null;

  if (typeof window === 'undefined') {
    try {
      const adminDb = await getAdminDb();
      if (adminDb) {
        const docRef = adminDb.collection('scoutingReports').doc(reportId);
        const docSnap = await throttle<admin.firestore.DocumentSnapshot>(() => docRef.get());
        if (!docSnap.exists) return null;

        const data = docSnap.data();
        if (!data) return null;

        rawReport = {
          id: docSnap.id,
          dong: data.dong || '오산동 (동탄역)',
          apartmentName: data.apartmentName,
          sections: data.sections || undefined,
          premiumScores: data.premiumScores,
          premiumContent: data.premiumContent,
          author: '데이터 랩스',
          likes: data.likes || 0,
          viewCount: data.viewCount || 0,
          commentCount: data.commentCount || 0,
          images: data.images || [],
          metrics: data.metrics,
          scoutingDate: data.scoutingDate || '',
          createdAt: formatTimestamp(data.createdAt, '방금 전'),
        };
      }
    } catch (adminError) {
      logger.warn('ReportRepository.getFullReport', 'Admin SDK fetch failed, falling back', undefined, adminError);
    }
  }

  if (!rawReport) {
    const docRef = doc(db, 'scoutingReports', reportId);
    const docSnap = await throttle(() => getDoc(docRef));
    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    rawReport = {
      id: docSnap.id,
      dong: data.dong || '오산동 (동탄역)',
      apartmentName: data.apartmentName,
      sections: data.sections || undefined,
      premiumScores: data.premiumScores,
      premiumContent: data.premiumContent,
      author: '데이터 랩스',
      likes: data.likes || 0,
      viewCount: data.viewCount || 0,
      commentCount: data.commentCount || 0,
      images: data.images || [],
      metrics: data.metrics,
      scoutingDate: data.scoutingDate || '',
      createdAt: formatTimestamp(data.createdAt, '방금 전'),
    };
  }

  const parsed = FieldReportDataSchema.safeParse(rawReport);
  if (parsed.success) {
    return {
      ...rawReport,
      ...parsed.data
    } as unknown as FieldReportData;
  } else {
    logger.warn('ReportRepository.getFullReport', 'Zod validation failed, using raw fallback', { reportId }, parsed.error);
    return rawReport as unknown as FieldReportData;
  }
}

/**
 * Fetches a single report's full data by apartment name.
 * Used to resolve stub reports when the user clicks an apartment that isn't in the top 30 recent reports.
 */
export async function getFullReportByApartmentName(apartmentName: string): Promise<FieldReportData | null> {
  let rawReport: Record<string, unknown> | null = null;

  if (typeof window === 'undefined') {
    try {
      const adminDb = await getAdminDb();
      if (adminDb) {
        const querySnapshot = await throttle<admin.firestore.QuerySnapshot>(() => adminDb.collection('scoutingReports')
          .where('apartmentName', '==', apartmentName)
          .limit(1)
          .get());
        if (querySnapshot.empty) return null;

        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();

        rawReport = {
          id: docSnap.id,
          dong: data.dong || '오산동 (동탄역)',
          apartmentName: data.apartmentName,
          sections: data.sections || undefined,
          premiumScores: data.premiumScores,
          premiumContent: data.premiumContent,
          author: '데이터 랩스',
          likes: data.likes || 0,
          viewCount: data.viewCount || 0,
          commentCount: data.commentCount || 0,
          images: data.images || [],
          metrics: data.metrics,
          scoutingDate: data.scoutingDate || '',
          createdAt: formatTimestamp(data.createdAt, '방금 전'),
        };
      }
    } catch (adminError) {
      logger.warn('ReportRepository.getFullReportByApartmentName', 'Admin SDK fetch failed, falling back', undefined, adminError);
    }
  }

  if (!rawReport) {
    const q = query(collection(db, 'scoutingReports'), where('apartmentName', '==', apartmentName), limit(1));
    const querySnapshot = await throttle(() => getDocs(q));
    if (querySnapshot.empty) return null;
    
    const docSnap = querySnapshot.docs[0];
    const data = docSnap.data();
    rawReport = {
      id: docSnap.id,
      dong: data.dong || '오산동 (동탄역)',
      apartmentName: data.apartmentName,
      sections: data.sections || undefined,
      premiumScores: data.premiumScores,
      premiumContent: data.premiumContent,
      author: '데이터 랩스',
      likes: data.likes || 0,
      viewCount: data.viewCount || 0,
      commentCount: data.commentCount || 0,
      images: data.images || [],
      metrics: data.metrics,
      scoutingDate: data.scoutingDate || '',
      createdAt: formatTimestamp(data.createdAt, '방금 전'),
    };
  }

  const parsed = FieldReportDataSchema.safeParse(rawReport);
  if (parsed.success) {
    return {
      ...rawReport,
      ...parsed.data
    } as unknown as FieldReportData;
  } else {
    logger.warn('ReportRepository.getFullReportByApartmentName', 'Zod validation failed, using raw fallback', { apartmentName }, parsed.error);
    return rawReport as unknown as FieldReportData;
  }
}

import * as TrafficRepo from '@/lib/repositories/traffic.repository';

/**
 * Increments the like counter on a field report.
 * @param reportId - The Firestore document ID
 * @throws FirestoreError if update fails
 */
export async function incrementReportLike(reportId: string): Promise<void> {
  try {
    const reportRef = doc(db, 'field_reports', reportId);
    await throttle(() => updateDoc(reportRef, { likes: increment(1) }));
  } catch (error) {
    logger.error('ReportRepository.incrementReportLike', 'Failed to increment report like', { reportId }, error);
    throw error;
  }
}

/**
 * Increments the view counter on a field report globally and daily.
 * @param reportId - The Firestore document ID
 * @param title - The title of the report
 * @throws FirestoreError if update fails
 */
export async function incrementReportView(reportId: string, title: string = '알 수 없는 리포트'): Promise<void> {
  // Fire and forget: run database and traffic updates asynchronously in the background
  (async () => {
    try {
      const reportRef = doc(db, 'scoutingReports', reportId);
      await throttle(() => updateDoc(reportRef, { viewCount: increment(1) })).catch((error) => {
        // some are in field_reports
        const fbRef = doc(db, 'field_reports', reportId);
        return throttle(() => updateDoc(fbRef, { viewCount: increment(1) })).catch((fbError) => {
          logger.error('ReportRepository.incrementReportView', 'Failed to increment report view in both collections', { reportId }, fbError);
        });
      });
      
      await TrafficRepo.incrementContentView(reportId, title, 'report');
    } catch (innerError) {
      logger.error('ReportRepository.incrementReportView', 'Asynchronous view count pipeline failed', { reportId }, innerError);
    }
  })();
}

/**
 * Fetches recent scouting reports isomorphically.
 */
export async function fetchRecentScoutingReports(limitCount: number = 30): Promise<any[]> {
  const cacheKey = `DTDLS:cache:fieldReports:${limitCount}`;
  
  const result = await executeIsomorphicQuery<any[]>({
    cacheKey,
    cacheEx: 120,
    serverQuery: async () => {
      const adminDb = await getAdminDb();
      if (!adminDb) return null;
      
      const snap = await throttle<admin.firestore.QuerySnapshot>(() => adminDb.collection('scoutingReports')
        .orderBy('createdAt', 'desc')
        .limit(limitCount)
        .get());
        
      return snap.docs.map(docSnap => {
        const data = docSnap.data();
        const createdAtStr = formatTimestamp(data.createdAt, '방금 전');
        const rawTimestamp = parseTimestampToMillis(data.createdAt, 0);
        return {
          id: docSnap.id,
          dong: (data.dong as string) || '오산동 (동탄역)',
          apartmentName: data.apartmentName as string,
          premiumScores: data.premiumScores,
          premiumContent: data.premiumContent as string | undefined,
          pros: (data.premiumContent as string) || '포장 싹 뺀 진짜 동네 아파트 리뷰',
          cons: '',
          rating: 5,
          author: '데이터 랩스',
          likes: (data.likes as number) || 0,
          viewCount: (data.viewCount as number) || 0,
          commentCount: (data.commentCount as number) || 0,
          imageUrl: (data.thumbnailUrl as string | undefined) || (data.imageUrl as string | undefined),
          images: ((data.images as unknown[]) || []).map(img => {
            const i = img as Record<string, unknown>;
            return {
              url: String(i.url || ''),
              caption: String(i.caption || ''),
              locationTag: String(i.locationTag || ''),
              isPremium: Boolean(i.isPremium || false),
              capturedAt: i.capturedAt ? String(i.capturedAt) : undefined,
              uploaderName: i.uploaderName ? String(i.uploaderName) : undefined,
            };
          }),
          metrics: data.metrics,
          scoutingDate: (data.scoutingDate as string) || '',
          createdAt: createdAtStr,
          _rawTimestamp: rawTimestamp
        };
      });
    },
    clientQuery: async () => {
      const q = query(
        collection(db, 'scoutingReports'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const snap = await throttle(() => getDocs(q));
      return snap.docs.map(docSnap => {
        const data = docSnap.data();
        const createdAtStr = formatTimestamp(data.createdAt, '방금 전');
        const rawTimestamp = parseTimestampToMillis(data.createdAt, 0);
        return {
          id: docSnap.id,
          dong: (data.dong as string) || '오산동 (동탄역)',
          apartmentName: data.apartmentName as string,
          premiumScores: data.premiumScores,
          premiumContent: data.premiumContent as string | undefined,
          pros: (data.premiumContent as string) || '포장 싹 뺀 진짜 동네 아파트 리뷰',
          cons: '',
          rating: 5,
          author: '데이터 랩스',
          likes: (data.likes as number) || 0,
          viewCount: (data.viewCount as number) || 0,
          commentCount: (data.commentCount as number) || 0,
          imageUrl: (data.thumbnailUrl as string | undefined) || (data.imageUrl as string | undefined),
          images: ((data.images as unknown[]) || []).map(img => {
            const i = img as Record<string, unknown>;
            return {
              url: String(i.url || ''),
              caption: String(i.caption || ''),
              locationTag: String(i.locationTag || ''),
              isPremium: Boolean(i.isPremium || false),
              capturedAt: i.capturedAt ? String(i.capturedAt) : undefined,
              uploaderName: i.uploaderName ? String(i.uploaderName) : undefined,
            };
          }),
          metrics: data.metrics,
          scoutingDate: (data.scoutingDate as string) || '',
          createdAt: createdAtStr,
          _rawTimestamp: rawTimestamp
        };
      });
    },
    fallbackValue: []
  });

  return result || [];
}


