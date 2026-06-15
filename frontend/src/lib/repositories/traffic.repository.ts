/**
 * @module traffic.repository
 * @description Data Access Layer for 'daily_stats' Firestore collection.
 * Architecture Layer: Repository
 */
import { db } from '@/lib/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { logger } from '@/lib/services/logger';
import { z } from 'zod';

export const DailyStatSchema = z.object({
  websiteVisits: z.number().default(0),
}).passthrough();

export const ContentViewSchema = z.object({
  title: z.string().default('알 수 없음'),
  type: z.string().default('unknown'),
  views: z.number().default(0),
}).passthrough();

export async function incrementWebsiteVisit(): Promise<void> {
  if (typeof window === 'undefined') return;
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
  if (typeof window === 'undefined') return;
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
  let rawDocs: any[] = [];

  if (typeof window === 'undefined') {
    try {
      const { adminDb } = await import('@/lib/firebaseAdmin');
      if (adminDb) {
        const snap = await adminDb.collection('daily_stats').get();
        rawDocs = snap.docs.map(d => ({ id: d.id, data: d.data() }));
      }
    } catch (adminError) {
      logger.warn('TrafficRepository.getDailyVisitStats', 'Admin SDK fetch failed, falling back', undefined, adminError);
    }
  }

  if (rawDocs.length === 0) {
    try {
      const snap = await getDocs(collection(db, 'daily_stats'));
      rawDocs = snap.docs.map(d => ({ id: d.id, data: d.data() }));
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
  let rawDocs: any[] = [];

  if (typeof window === 'undefined') {
    try {
      const { adminDb } = await import('@/lib/firebaseAdmin');
      if (adminDb) {
        const snap = await adminDb.collection(`daily_stats/${dateStr}/content_views`).get();
        rawDocs = snap.docs.map(d => ({ id: d.id, data: d.data() }));
      }
    } catch (adminError) {
      logger.warn('TrafficRepository.getDailyContentViews', 'Admin SDK fetch failed, falling back', { dateStr }, adminError);
    }
  }

  if (rawDocs.length === 0) {
    try {
      const snap = await getDocs(collection(db, `daily_stats/${dateStr}/content_views`));
      rawDocs = snap.docs.map(d => ({ id: d.id, data: d.data() }));
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
