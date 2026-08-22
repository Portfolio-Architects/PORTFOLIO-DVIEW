import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_test_names',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    if (!adminDb) {
      logger.error('TestNamesAPI.GET', 'Admin DB not initialized');
      return apiError('DATABASE_UNAVAILABLE', 'Admin DB not initialized', 500);
    }
    const snap = await adminDb.collection('scoutingReports').get();
    const names = snap.docs.map((d) => ({
      id: d.id,
      apartmentName: d.data().apartmentName,
      dong: d.data().dong,
    }));

    try {
      const scratchDir = path.join(process.cwd(), 'scratch');
      if (!fs.existsSync(scratchDir)) {
        fs.mkdirSync(scratchDir, { recursive: true });
      }
      fs.writeFileSync(path.join(scratchDir, 'test-names-node.json'), JSON.stringify(names, null, 2), 'utf8');
      logger.info('TestNamesAPI.GET', 'Successfully wrote test-names-node.json to scratch directory', { count: names.length });
    } catch (writeErr) {
      logger.warn('TestNamesAPI.GET', 'Failed to write test-names-node.json file', {}, writeErr as Error);
    }

    return apiSuccess(names);
  } catch (error: unknown) {
    logger.error('TestNamesAPI.GET', 'Failed to get test names', {}, error as Error);
    return apiError('INTERNAL_ERROR', 'Failed to get test names', 500);
  }
}
