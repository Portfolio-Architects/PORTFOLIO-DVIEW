import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { normalizeAptName } from '@/lib/utils/apartmentMapping';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VoteGetSchema = z.object({
  aptName: z.string().nullable().optional(),
});

const VotePostSchema = z.object({
  aptName: z.string().min(1),
  voteType: z.enum(['buy', 'wait']),
});

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_apartmentsvote_get',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    const { searchParams } = request.nextUrl;
    const aptNameParam = searchParams.get('aptName');

    const parsed = VoteGetSchema.safeParse({ aptName: aptNameParam });
    if (!parsed.success) {
      logger.warn('ApartmentVoteAPI.GET', 'Invalid query parameters', { errors: parsed.error.format() });
      return apiError('INVALID_PARAMETERS', 'Invalid parameters', 400);
    }

    const { aptName } = parsed.data;

    if (!adminDb) {
      return apiSuccess({ buyCount: 0, waitCount: 0 }, { buyCount: 0, waitCount: 0 });
    }

    const isDev = process.env.NODE_ENV === 'development';
    const timeoutMs = isDev ? 1000 : 3000;

    const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Firebase timeout')), ms);
      });
      return Promise.race([
        promise.then((val) => {
          clearTimeout(timeoutId);
          return val;
        }).catch((err) => {
          clearTimeout(timeoutId);
          throw err;
        }),
        timeoutPromise,
      ]);
    };

    if (!aptName || aptName === 'global') {
      const snap = await withTimeout(adminDb.collection('apartmentVotes').get(), timeoutMs);
      let buyCount = 0;
      let waitCount = 0;
      snap.forEach((doc) => {
        const data = doc.data();
        buyCount += data.buyCount || 0;
        waitCount += data.waitCount || 0;
      });
      return apiSuccess({ buyCount, waitCount }, { buyCount, waitCount });
    }

    const docId = normalizeAptName(aptName);
    const docRef = adminDb.collection('apartmentVotes').doc(docId);
    const docSnap = await withTimeout(docRef.get(), timeoutMs);

    if (!docSnap.exists) {
      return apiSuccess({ buyCount: 0, waitCount: 0 }, { buyCount: 0, waitCount: 0 });
    }

    const data = docSnap.data() || { buyCount: 0, waitCount: 0 };
    return apiSuccess({
      buyCount: data.buyCount || 0,
      waitCount: data.waitCount || 0,
    }, {
      buyCount: data.buyCount || 0,
      waitCount: data.waitCount || 0,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.warn('ApartmentVoteAPI.GET', 'Error fetching votes, using fallback', {}, err);
    return apiSuccess({ buyCount: 0, waitCount: 0 }, { buyCount: 0, waitCount: 0 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_apartmentsvote_post',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      logger.warn('ApartmentVoteAPI.POST', 'Malformed JSON payload', {});
      return apiError('MALFORMED_JSON', 'Malformed JSON body payload', 400);
    }

    const parsed = VotePostSchema.safeParse(body);
    if (!parsed.success) {
      logger.warn('ApartmentVoteAPI.POST', 'Invalid request body payload', { errors: parsed.error.format() });
      return apiError('INVALID_PARAMETERS', 'Invalid parameters', 400, parsed.error.issues);
    }

    const { aptName, voteType } = parsed.data;

    if (!adminDb) {
      logger.warn('ApartmentVoteAPI.POST', 'adminDb is not configured. Falling back to dummy success responses.');
      const fallbackData = { buyCount: voteType === 'buy' ? 1 : 0, waitCount: voteType === 'wait' ? 1 : 0 };
      return apiSuccess(fallbackData, fallbackData);
    }

    const docId = normalizeAptName(aptName);
    const docRef = adminDb.collection('apartmentVotes').doc(docId);

    await adminDb.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists) {
        transaction.set(docRef, {
          aptName,
          buyCount: voteType === 'buy' ? 1 : 0,
          waitCount: voteType === 'wait' ? 1 : 0,
          updatedAt: new Date(),
        });
      } else {
        const data = docSnap.data() || { buyCount: 0, waitCount: 0 };
        const buyCount = data.buyCount || 0;
        const waitCount = data.waitCount || 0;

        transaction.update(docRef, {
          buyCount: voteType === 'buy' ? buyCount + 1 : buyCount,
          waitCount: voteType === 'wait' ? waitCount + 1 : waitCount,
          updatedAt: new Date(),
        });
      }
    });

    const updatedSnap = await docRef.get();
    const updatedData = updatedSnap.data() || { buyCount: 0, waitCount: 0 };

    logger.info('ApartmentVoteAPI.POST', 'Vote recorded successfully', { aptName, voteType });

    return apiSuccess({
      buyCount: updatedData.buyCount,
      waitCount: updatedData.waitCount,
    }, {
      buyCount: updatedData.buyCount,
      waitCount: updatedData.waitCount,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('ApartmentVoteAPI.POST', 'Error recording vote', {}, err);
    return apiError('INTERNAL_ERROR', 'Failed to record vote', 500);
  }
}
