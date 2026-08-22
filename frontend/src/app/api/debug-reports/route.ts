import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebaseAdmin';
import { logger } from '@/lib/services/logger';
import { verifyAdmin } from '@/lib/authUtils';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import type * as admin from 'firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const debugReportsQuerySchema = z.object({
  limit: z.preprocess(
    (val) => (val ? parseInt(val as string, 10) : undefined),
    z.number().int().positive().optional()
  ),
});

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_debug_reports',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      logger.warn('DebugReportsAPI.GET', 'Unauthorized attempt to trigger debug reports fetch');
      return apiError('UNAUTHORIZED', 'Unauthorized: Admin access required', 403);
    }

    const { searchParams } = new URL(request.url);
    const parsedQuery = debugReportsQuerySchema.safeParse({
      limit: searchParams.get('limit') || undefined,
    });

    if (!parsedQuery.success) {
      logger.warn('DebugReportsAPI.GET', 'Invalid query parameters', {
        errors: parsedQuery.error.format(),
      });
      return apiError('BAD_REQUEST', 'Bad Request', 400);
    }

    const { limit } = parsedQuery.data;

    if (!adminDb) {
      logger.error('DebugReportsAPI.GET', 'Admin DB not initialized', {});
      return apiError('DATABASE_UNAVAILABLE', 'Admin DB not initialized', 500);
    }

    let query: admin.firestore.Query<admin.firestore.DocumentData> = adminDb.collection('scoutingReports');
    if (limit) {
      query = query.limit(limit);
    }
    const snapshot = await query.get();

    const reports = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot<admin.firestore.DocumentData>) => ({
      id: doc.id,
      apartmentName: doc.data().apartmentName,
      apartmentNameHex: Buffer.from(doc.data().apartmentName || '').toString('hex'),
      dong: doc.data().dong,
    }));

    logger.info('DebugReportsAPI.GET', 'Successfully fetched debug reports', {
      count: reports.length,
      limit: limit || 'none',
    });

    return apiSuccess({ count: reports.length, reports }, { count: reports.length, reports });
  } catch (error: unknown) {
    logger.error('DebugReportsAPI.GET', 'Error fetching debug reports', {}, error as Error);
    return apiError('INTERNAL_ERROR', 'Failed to fetch debug reports', 500);
  }
}
