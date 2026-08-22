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
import { NextRequest } from 'next/server';
import { adminDb, FieldValue } from '@/lib/firebaseAdmin';
import { createHash } from 'crypto';
import { ADMIN_EMAILS } from '@/lib/config/admin.config';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { getKSTDateString } from '@/lib/utils/date';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const reportViewSchema = z.object({
  reportId: z.string().min(1).max(100).trim(),
  userEmail: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_reportview',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      logger.warn('ReportViewAPI.POST', 'Rate limit exceeded');
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    let rawBody: unknown;
    try {
      const text = await request.text();
      if (!text.trim()) {
        logger.warn('ReportViewAPI.POST', 'Empty request body', {});
        return apiError('BAD_REQUEST', 'Bad Request: Empty Payload', 400);
      }
      rawBody = JSON.parse(text);
    } catch (jsonErr) {
      logger.warn('ReportViewAPI.POST', 'Invalid JSON format', {}, jsonErr as Error);
      return apiError('BAD_REQUEST', 'Bad Request: Invalid JSON', 400);
    }

    const parsed = reportViewSchema.safeParse(rawBody);
    if (!parsed.success) {
      return apiError('INVALID_PAYLOAD', 'Bad Request: Invalid Payload', 400, parsed.error.issues);
    }
    const { reportId, userEmail } = parsed.data;

    // ── Admin exclusion ──
    if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
      return apiSuccess({ counted: false, reason: 'admin' }, { counted: false, reason: 'admin' });
    }

    // ── Extract & hash client IP ──
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const rawIp = realIp || forwarded?.split(',')[0]?.trim() || 'unknown';
    const ipHash = createHash('sha256').update(rawIp).digest('hex').slice(0, 16);

    // ── Daily dedup key: reportId_ipHash_YYYY-MM-DD ──
    const today = getKSTDateString();
    const dedupKey = `${reportId}_${ipHash}_${today}`;

    if (!adminDb) {
      logger.error('ReportViewAPI.POST', 'Admin DB not initialized', {});
      return apiError('DATABASE_UNAVAILABLE', 'DB not initialized', 500);
    }

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
          views: FieldValue.increment(1),
        },
        { merge: true }
      );

      return { success: true };
    });

    if (!result.success) {
      if (result.reason === 'duplicate') {
        return apiSuccess({ counted: false, reason: 'duplicate' }, { counted: false, reason: 'duplicate' });
      }
      if (result.reason === 'not_found') {
        logger.warn('ReportViewAPI.POST', 'Scouting report not found', { reportId });
        return apiError('NOT_FOUND', 'Report not found', 404);
      }
    }

    return apiSuccess({ counted: true }, { counted: true });
  } catch (error: unknown) {
    logger.error('ReportViewAPI.POST', 'Failed to track report view', {}, error as Error);
    return apiError('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
