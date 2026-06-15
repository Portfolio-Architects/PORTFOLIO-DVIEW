/**
 * @module report.repository
 * @description Data Access Layer for 'scoutingReports' Firestore collection.
 * Architecture Layer: Repository (CRUD only, no business logic)
 */
import { db } from '@/lib/firebaseConfig';
import { collection, onSnapshot, query, limit, doc, updateDoc, increment, getDoc, getDocs, where, QuerySnapshot, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import type { FieldReportData } from '@/lib/types/report.types';
import { logger } from '@/lib/services/logger';
import { z } from 'zod';

const ReportSpecsSchema = z.object({
  builtYear: z.string().default(''),
  scale: z.string().default(''),
  farBuild: z.string().default(''),
  parkingRatio: z.string().default(''),
}).passthrough();

const ReportInfraSchema = z.object({
  gateText: z.string().default(''),
  gateImgs: z.array(z.string()).optional(),
  gateRating: z.number().optional(),
  landscapeText: z.string().default(''),
  landscapeImgs: z.array(z.string()).optional(),
  landscapeRating: z.number().optional(),
  parkingText: z.string().default(''),
  parkingImgs: z.array(z.string()).optional(),
  parkingRating: z.number().optional(),
  maintenanceText: z.string().default(''),
  maintenanceImgs: z.array(z.string()).optional(),
  maintenanceRating: z.number().optional(),
}).passthrough();

const ReportEcosystemSchema = z.object({
  communityText: z.string().default(''),
  communityImgs: z.array(z.string()).optional(),
  communityRating: z.number().optional(),
  schoolText: z.string().default(''),
  schoolImgs: z.array(z.string()).optional(),
  schoolRating: z.number().optional(),
  commerceText: z.string().default(''),
  commerceImgs: z.array(z.string()).optional(),
  commerceRating: z.number().optional(),
}).passthrough();

const ReportLocationSchema = z.object({
  trafficText: z.string().default(''),
  trafficRating: z.number().optional(),
  developmentText: z.string().default(''),
  developmentRating: z.number().optional(),
}).passthrough();

const ReportAssessmentSchema = z.object({
  alphaDriver: z.string().default(''),
  systemicRisk: z.string().default(''),
  synthesis: z.string().default(''),
  probability: z.string().default(''),
  autoGrade: z.string().optional(),
}).passthrough();

const ReportSectionsSchema = z.object({
  specs: ReportSpecsSchema.optional(),
  infra: ReportInfraSchema.optional(),
  ecosystem: ReportEcosystemSchema.optional(),
  location: ReportLocationSchema.optional(),
  assessment: ReportAssessmentSchema.optional(),
}).passthrough();

const FieldReportDataSchema = z.object({
  dong: z.string().default('오산동 (동탄역)'),
  apartmentName: z.string(),
  sections: ReportSectionsSchema.optional(),
  premiumScores: z.any().optional(),
  metrics: z.any().optional(),
  premiumContent: z.string().optional(),
  author: z.string().default('데이터 랩스'),
  likes: z.number().default(0),
  commentCount: z.number().default(0),
  viewCount: z.number().default(0),
  images: z.array(z.any()).default([]),
  scoutingDate: z.string().default('')
}).passthrough();


/**
 * Listens to the 'scoutingReports' collection in real-time.
 * Maps only lightweight fields needed for list cards.
 * Heavy fields (sections, images) are loaded on-demand via getFullReport().
 * @param callback - Invoked with the latest reports array on each change
 * @returns Unsubscribe function
 */
export function listenToReports(callback: (reports: FieldReportData[]) => void): () => void {
  const q = query(collection(db, 'scoutingReports'), limit(30));

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
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('ko-KR') : '방금 전',
        // keep raw timestamp for sorting
        _rawTimestamp: data.createdAt?.toDate ? data.createdAt.toDate().getTime() : 0, 
      } as FieldReportData & { _rawTimestamp: number });
    });
    return reports.sort((a, b) => (b as FieldReportData & { _rawTimestamp: number })._rawTimestamp - (a as FieldReportData & { _rawTimestamp: number })._rawTimestamp);
  };

  return onSnapshot(q, (snapshot) => {
    const mapped = mapSnapshot(snapshot);
    logger.debug('ReportRepository.listenToScoutingReports', 'Invoking callback with mapped reports', { count: mapped.length });
    callback(mapped);
  }, (error) => {
    logger.error('ReportRepository.listenToScoutingReports', 'onSnapshot error, falling back to unordered query', {}, error);
    // Fallback: query without orderBy (no index needed)
    const fallbackQ = query(collection(db, 'scoutingReports'), limit(30));
    onSnapshot(fallbackQ, (fallbackSnapshot) => {
      const fallbackMapped = mapSnapshot(fallbackSnapshot);
      logger.debug('ReportRepository.listenToScoutingReports', 'Invoking callback from fallback', { count: fallbackMapped.length });
      callback(fallbackMapped);
    }, (fallbackError) => {
      logger.error('ReportRepository.listenToScoutingReports', 'Fallback also failed', {}, fallbackError);
      logger.debug('ReportRepository.listenToScoutingReports', 'Invoking callback from fallback error with length 0');
      callback([]);
    });
  });

}

export async function getFullReport(reportId: string): Promise<FieldReportData | null> {
  let rawReport: any = null;

  if (typeof window === 'undefined') {
    try {
      const { adminDb } = await import('@/lib/firebaseAdmin');
      if (adminDb) {
        const docRef = adminDb.collection('scoutingReports').doc(reportId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) return null;

        const data = docSnap.data();
        if (!data) return null;

        const createdAtDate = data.createdAt ? (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : new Date(data.createdAt)) : null;

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
          createdAt: createdAtDate ? createdAtDate.toLocaleDateString('ko-KR') : '방금 전',
        };
      }
    } catch (adminError) {
      logger.warn('ReportRepository.getFullReport', 'Admin SDK fetch failed, falling back', undefined, adminError);
    }
  }

  if (!rawReport) {
    const docRef = doc(db, 'scoutingReports', reportId);
    const docSnap = await getDoc(docRef);
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
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('ko-KR') : '방금 전',
    };
  }

  const parsed = FieldReportDataSchema.safeParse(rawReport);
  if (parsed.success) {
    return {
      ...rawReport,
      ...parsed.data
    };
  } else {
    logger.warn('ReportRepository.getFullReport', 'Zod validation failed, using raw fallback', { reportId }, parsed.error);
    return rawReport;
  }
}

/**
 * Fetches a single report's full data by apartment name.
 * Used to resolve stub reports when the user clicks an apartment that isn't in the top 30 recent reports.
 */
export async function getFullReportByApartmentName(apartmentName: string): Promise<FieldReportData | null> {
  let rawReport: any = null;

  if (typeof window === 'undefined') {
    try {
      const { adminDb } = await import('@/lib/firebaseAdmin');
      if (adminDb) {
        const querySnapshot = await adminDb.collection('scoutingReports')
          .where('apartmentName', '==', apartmentName)
          .limit(1)
          .get();
        if (querySnapshot.empty) return null;

        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();

        const createdAtDate = data.createdAt ? (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : new Date(data.createdAt)) : null;

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
          createdAt: createdAtDate ? createdAtDate.toLocaleDateString('ko-KR') : '방금 전',
        };
      }
    } catch (adminError) {
      logger.warn('ReportRepository.getFullReportByApartmentName', 'Admin SDK fetch failed, falling back', undefined, adminError);
    }
  }

  if (!rawReport) {
    const q = query(collection(db, 'scoutingReports'), where('apartmentName', '==', apartmentName), limit(1));
    const querySnapshot = await getDocs(q);
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
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('ko-KR') : '방금 전',
    };
  }

  const parsed = FieldReportDataSchema.safeParse(rawReport);
  if (parsed.success) {
    return {
      ...rawReport,
      ...parsed.data
    };
  } else {
    logger.warn('ReportRepository.getFullReportByApartmentName', 'Zod validation failed, using raw fallback', { apartmentName }, parsed.error);
    return rawReport;
  }
}

import * as TrafficRepo from '@/lib/repositories/traffic.repository';

/**
 * Increments the like counter on a field report.
 * @param reportId - The Firestore document ID
 * @throws FirestoreError if update fails
 */
export async function incrementReportLike(reportId: string): Promise<void> {
  const reportRef = doc(db, 'field_reports', reportId);
  await updateDoc(reportRef, { likes: increment(1) });
}

/**
 * Increments the view counter on a field report globally and daily.
 * @param reportId - The Firestore document ID
 * @param title - The title of the report
 * @throws FirestoreError if update fails
 */
export async function incrementReportView(reportId: string, title: string = '알 수 없는 리포트'): Promise<void> {
  // Update global counter in scoutingReports (or field_reports depending on which collection is used)
  const reportRef = doc(db, 'scoutingReports', reportId);
  await updateDoc(reportRef, { viewCount: increment(1) }).catch(() => {
    // some are in field_reports
    const fbRef = doc(db, 'field_reports', reportId);
    return updateDoc(fbRef, { viewCount: increment(1) }).catch(() => {});
  });
  
  await TrafficRepo.incrementContentView(reportId, title, 'report');
}
