/**
 * @module report-view API
 * @description Tracks report views with IP-based daily dedup and admin exclusion.
 * 
 * POST /api/report-view
 * Body: { reportId: string, userEmail?: string }
 * 
 * Anti-abuse rules:
 * - IP hashed (SHA-256) for privacy
 * - Same IP + same report => max 1 view per day
 * - Admin emails are excluded from counting
 */
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createHash } from 'crypto';
import { ADMIN_EMAILS } from '@/lib/config/admin.config';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { getKSTDateString } from '@/lib/utils/date';
import { rateLimiter } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// 보안: NoSQL Injection 및 오버플로우 방어용 스키마 검증
const reportViewSchema = z.object({
  reportId: z.string().min(1).max(100).trim(),
  userEmail: z.string().max(100).optional(),
});

/** Lazy-init Firebase Admin (avoids build-time execution) */
function getAdminDb() {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}

export async function POST(request: NextRequest) {
  try {
    if (rateLimiter) {
      const forwarded = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const rawIp = realIp || forwarded?.split(',')[0]?.trim() || '127.0.0.1';
      const { success } = await rateLimiter.limit(`ratelimit_reportview_${rawIp}`);
      if (!success) {
        logger.warn('ReportViewAPI.POST', 'Rate limit exceeded', { ip: rawIp });
        return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
      }
    }

    let rawBody: unknown;
    try {
      const text = await request.text();
      if (!text.trim()) {
        logger.warn('ReportViewAPI.POST', 'Empty request body', {});
        return NextResponse.json({ error: 'Bad Request: Empty Payload' }, { status: 400 });
      }
      rawBody = JSON.parse(text);
    } catch (jsonErr) {
      logger.warn('ReportViewAPI.POST', 'Invalid JSON format', {}, jsonErr as Error);
      return NextResponse.json({ error: 'Bad Request: Invalid JSON' }, { status: 400 });
    }

    const parsed = reportViewSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Bad Request: Invalid Payload', details: parsed.error.issues }, { status: 400 });
    }
    const { reportId, userEmail } = parsed.data;

    // ── Admin exclusion ──
    if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
      return NextResponse.json({ counted: false, reason: 'admin' });
    }

    // ── Extract & hash client IP (Spoofing Protection prioritized) ──
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const rawIp = realIp || forwarded?.split(',')[0]?.trim() || 'unknown';
    const ipHash = createHash('sha256').update(rawIp).digest('hex').slice(0, 16);

    // ── Daily dedup key: reportId_ipHash_YYYY-MM-DD ──
    const today = getKSTDateString();
    const dedupKey = `${reportId}_${ipHash}_${today}`;

    const adminDb = getAdminDb();
    const viewRef = adminDb.collection('reportViews').doc(dedupKey);
    const reportDocRef = adminDb.collection('scoutingReports').doc(reportId);
    const dailyStatsRef = adminDb.doc(`daily_stats/${today}/content_views/${reportId}`);

    const result = await adminDb.runTransaction(async (transaction) => {
      const viewSnap = await transaction.get(viewRef);
      if (viewSnap.exists) {
        return { success: false, reason: 'duplicate' as const };
      }

      const reportSnap = await transaction.get(reportDocRef);
      if (!reportSnap.exists) {
        return { success: false, reason: 'not_found' as const };
      }

      const title = reportSnap.data()?.apartmentName || '알 수 없는 단지';

      transaction.set(viewRef, {
        reportId,
        ipHash,
        createdAt: FieldValue.serverTimestamp(),
      });

      transaction.update(reportDocRef, {
        viewCount: FieldValue.increment(1),
      });

      transaction.set(
        dailyStatsRef,
        {
          title,
          type: 'report',
          views: FieldValue.increment(1)
        },
        { merge: true }
      );

      return { success: true };
    });

    if (!result.success) {
      if (result.reason === 'duplicate') {
        return NextResponse.json({ counted: false, reason: 'duplicate' });
      }
      if (result.reason === 'not_found') {
        logger.warn('ReportViewAPI.POST', 'Scouting report not found', { reportId });
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ counted: true });
  } catch (error: unknown) {
    logger.error('ReportViewAPI.POST', 'Failed to track report view', {}, error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
