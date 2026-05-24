/**
 * @module report.repository
 * @description Data Access Layer for 'scoutingReports' Firestore collection.
 * Architecture Layer: Repository (CRUD only, no business logic)
 */
import { db } from '@/lib/firebaseConfig';
import { collection, onSnapshot, query, limit, doc, updateDoc, increment, getDoc, getDocs, where, QuerySnapshot, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import type { FieldReportData } from '@/lib/types/report.types';

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
        pros: data.premiumContent || '포장 싹 뺀 진짜 동네 아파트 리뷰',
        cons: '',
        rating: 5,
        author: '데이터 랩스',
        likes: data.likes || 0,
        viewCount: data.viewCount || 0,
        commentCount: data.commentCount || 0,
        imageUrl: data.thumbnailUrl || data.imageUrl,
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
    console.trace('[ReportRepo] Invoking callback with mapped.length:', mapped.length);
    callback(mapped);
  }, (error) => {
    console.error('[ReportRepo] onSnapshot error, falling back to unordered query:', error.message);
    // Fallback: query without orderBy (no index needed)
    const fallbackQ = query(collection(db, 'scoutingReports'), limit(30));
    onSnapshot(fallbackQ, (fallbackSnapshot) => {
      const fallbackMapped = mapSnapshot(fallbackSnapshot);
      console.trace('[ReportRepo] Invoking callback from fallback with length:', fallbackMapped.length);
      callback(fallbackMapped);
    }, (fallbackError) => {
      console.error('[ReportRepo] Fallback also failed:', fallbackError.message);
      console.trace('[ReportRepo] Invoking callback from fallback error with length: 0');
      callback([]);
    });
  });
}

/**
 * Fetches a single report's full data (including sections & images) on demand.
 * Used when opening the detail modal — avoids loading heavy data for all 30 reports upfront.
 * @param reportId - The Firestore document ID
 * @returns Full report data, or null if not found
 */
export async function getFullReport(reportId: string): Promise<FieldReportData | null> {
  const docRef = doc(db, 'scoutingReports', reportId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;

  const data = docSnap.data();
  return {
    id: docSnap.id,
    dong: data.dong || '오산동 (동탄역)',
    apartmentName: data.apartmentName,
    sections: data.sections || undefined,
    premiumScores: data.premiumScores,
    premiumContent: data.premiumContent,
    pros: data.premiumContent || '포장 싹 뺀 진짜 동네 아파트 리뷰',
    cons: '',
    rating: 5,
    author: '데이터 랩스',
    likes: data.likes || 0,
    viewCount: data.viewCount || 0,
    commentCount: data.commentCount || 0,
    imageUrl: data.thumbnailUrl || data.imageUrl,
    images: data.images || [],
    metrics: data.metrics,
    scoutingDate: data.scoutingDate || '',
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('ko-KR') : '방금 전',
  };
}

/**
 * Fetches a single report's full data by apartment name.
 * Used to resolve stub reports when the user clicks an apartment that isn't in the top 30 recent reports.
 */
export async function getFullReportByApartmentName(apartmentName: string): Promise<FieldReportData | null> {
  const q = query(collection(db, 'scoutingReports'), where('apartmentName', '==', apartmentName), limit(1));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  
  const docSnap = querySnapshot.docs[0];
  const data = docSnap.data();
  return {
    id: docSnap.id,
    dong: data.dong || '오산동 (동탄역)',
    apartmentName: data.apartmentName,
    sections: data.sections || undefined,
    premiumScores: data.premiumScores,
    premiumContent: data.premiumContent,
    pros: data.premiumContent || '포장 싹 뺀 진짜 동네 아파트 리뷰',
    cons: '',
    rating: 5,
    author: '데이터 랩스',
    likes: data.likes || 0,
    viewCount: data.viewCount || 0,
    commentCount: data.commentCount || 0,
    imageUrl: data.thumbnailUrl || data.imageUrl,
    images: data.images || [],
    metrics: data.metrics,
    scoutingDate: data.scoutingDate || '',
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('ko-KR') : '방금 전',
  };
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
