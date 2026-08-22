/**
 * @module traffic.repository
 * @description Data Access Layer for 'daily_stats' Firestore collection.
 * Architecture Layer: Repository
 */
import { db } from '@/lib/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { logger } from '@/lib/services/logger';
import { z } from 'zod';
import { throttle } from '@/lib/utils/firestoreThrottle';
import { getKSTDateString } from '@/lib/utils/date';

export interface RawTrafficDoc {
  id: string;
  data: {
    websiteVisits?: number;
    title?: string;
    type?: string;
    views?: number;
    [key: string]: unknown;
  };
}

interface AdminFirestoreLike {
  collection: (path: string) => {
    doc: (id: string) => {
      set: (data: unknown, options?: unknown) => Promise<unknown>;
      collection: (path: string) => {
        doc: (id: string) => {
          set: (data: unknown, options?: unknown) => Promise<unknown>;
        };
      };
    };
    get: () => Promise<{ docs: Array<{ id: string; data: () => unknown }> }>;
  };
}

// Module-level cache for dynamic firebaseAdmin import
let cachedAdminDb: AdminFirestoreLike | null = null;
let isAdminDbLoaded = false;

async function getAdminDb(): Promise<AdminFirestoreLike | null> {
  if (isAdminDbLoaded) return cachedAdminDb;
  try {
    const { adminDb } = await import('@/lib/firebaseAdmin');
    cachedAdminDb = (adminDb as unknown as AdminFirestoreLike) || null;
  } catch (err) {
    logger.warn('TrafficRepository.getAdminDb', 'Failed to dynamically import @/lib/firebaseAdmin', {}, err as Error);
    cachedAdminDb = null;
  }
  isAdminDbLoaded = true;
  return cachedAdminDb;
}

export const DailyStatSchema = z.object({
  websiteVisits: z.number().default(0),
}).passthrough();

export const ContentViewSchema = z.object({
  title: z.string().default('알 수 없음'),
  type: z.string().default('unknown'),
  views: z.number().default(0),
}).passthrough();

export async function incrementWebsiteVisitDirect(): Promise<void> {
  const adminDb = await getAdminDb();
  if (adminDb) {
    const today = getKSTDateString();
    const { FieldValue } = await import('@/lib/firebaseAdmin');
    const ref = adminDb.collection('daily_stats').doc(today);
    await throttle(() => ref.set({ websiteVisits: FieldValue.increment(1), date: today }, { merge: true }));
  }
}

export async function incrementContentViewDirect(contentId: string, title: string, type: 'lounge' | 'report'): Promise<void> {
  const adminDb = await getAdminDb();
  if (adminDb) {
    const today = getKSTDateString();
    const { FieldValue } = await import('@/lib/firebaseAdmin');
    const ref = adminDb.collection('daily_stats').doc(today).collection('content_views').doc(contentId);
    await throttle(() => ref.set({
      title: title || '알 수 없음',
      type: type || 'unknown',
      views: FieldValue.increment(1)
    }, { merge: true }));
  }
}

export async function incrementWebsiteVisit(): Promise<void> {
  if (typeof window === 'undefined') {
    try {
      await incrementWebsiteVisitDirect();
    } catch (e) {
      logger.error('TrafficRepository.incrementWebsiteVisit', 'Server direct tracking failed', undefined, e);
    }
    return;
  }
  try {
    await fetch('/api/traffic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'websiteVisit' })
    });
  } catch (e) {
    logger.error('TrafficRepository.incrementWebsiteVisit', 'Update failed', undefined, e);
  }
}

export async function incrementContentView(contentId: string, title: string, type: 'lounge' | 'report'): Promise<void> {
  if (typeof window === 'undefined') {
    try {
      await incrementContentViewDirect(contentId, title, type);
    } catch (e) {
      logger.error('TrafficRepository.incrementContentView', 'Server direct tracking failed', { contentId, type }, e);
    }
    return;
  }
  try {
    await fetch('/api/traffic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'contentView', contentId, title, type })
    });
  } catch (e) {
    logger.error('TrafficRepository.incrementContentView', 'Update failed', { contentId, type }, e);
  }
}

export interface DailyStat {
  date: string;
  websiteVisits: number;
}

export interface ContentView {
  id: string; // contentId
  title: string;
  type: string;
  views: number;
}

export async function getDailyVisitStats(): Promise<DailyStat[]> {
  let rawDocs: RawTrafficDoc[] = [];

  if (typeof window === 'undefined') {
    try {
      const adminDb = await getAdminDb();
      if (adminDb) {
        const snap = await throttle(() => adminDb.collection('daily_stats').get());
        rawDocs = snap.docs.map((d) => ({ id: d.id, data: d.data() as RawTrafficDoc['data'] }));
      }
    } catch (adminError) {
      logger.warn('TrafficRepository.getDailyVisitStats', 'Admin SDK fetch failed, falling back', undefined, adminError);
    }
  }

  if (rawDocs.length === 0) {
    try {
      const snap = await throttle(() => getDocs(collection(db, 'daily_stats')));
      rawDocs = snap.docs.map(d => ({ id: d.id, data: d.data() as RawTrafficDoc['data'] }));
    } catch (e) {
      logger.error('TrafficRepository.getDailyVisitStats', 'Fetch failed', undefined, e);
      return [];
    }
  }

  return rawDocs.map(item => {
    const data = item.data;
    const parsed = DailyStatSchema.safeParse(data);
    if (!parsed.success) {
      logger.warn('TrafficRepository.getDailyVisitStats', 'Zod validation failed, using raw fallback', { id: item.id }, parsed.error);
    }
    return {
      date: item.id,
      websiteVisits: parsed.success ? parsed.data.websiteVisits : (data.websiteVisits || 0),
    };
  });
}

/**
 * Fetches content views for a specific date.
 */
export async function getDailyContentViews(dateStr: string): Promise<ContentView[]> {
  let rawDocs: RawTrafficDoc[] = [];

  if (typeof window === 'undefined') {
    try {
      const adminDb = await getAdminDb();
      if (adminDb) {
        const snap = await throttle(() => (adminDb as unknown as { collection: (p: string) => { get: () => Promise<{ docs: Array<{ id: string; data: () => unknown }> }> } }).collection(`daily_stats/${dateStr}/content_views`).get());
        rawDocs = snap.docs.map((d) => ({ id: d.id, data: d.data() as RawTrafficDoc['data'] }));
      }
    } catch (adminError) {
      logger.warn('TrafficRepository.getDailyContentViews', 'Admin SDK fetch failed, falling back', { dateStr }, adminError);
    }
  }

  if (rawDocs.length === 0) {
    try {
      const snap = await throttle(() => getDocs(collection(db, `daily_stats/${dateStr}/content_views`)));
      rawDocs = snap.docs.map(d => ({ id: d.id, data: d.data() as RawTrafficDoc['data'] }));
    } catch (e) {
      logger.error('TrafficRepository.getDailyContentViews', 'Fetch failed', { dateStr }, e);
      return [];
    }
  }

  return rawDocs.map(item => {
    const data = item.data;
    const parsed = ContentViewSchema.safeParse(data);
    if (!parsed.success) {
      logger.warn('TrafficRepository.getDailyContentViews', 'Zod validation failed, using raw fallback', { id: item.id }, parsed.error);
    }
    return {
      id: item.id,
      title: parsed.success ? parsed.data.title : (data.title || '알 수 없음'),
      type: parsed.success ? parsed.data.type : (data.type || 'unknown'),
      views: parsed.success ? parsed.data.views : (data.views || 0),
    };
  }).sort((a, b) => b.views - a.views);
}
