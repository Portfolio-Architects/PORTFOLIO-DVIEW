import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebaseAdmin';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { isValidMatchupId } from '@/lib/data/balanceMatchups';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MatchupGetSchema = z.object({
  matchupId: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .refine(isValidMatchupId, 'Invalid matchupId format'),
});

const MatchupPostSchema = z.object({
  matchupId: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .refine(isValidMatchupId, 'Invalid matchupId format'),
  side: z.enum(['left', 'right']),
});

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Firebase timeout')), ms);
  });
  return Promise.race([
    promise
      .then((val) => {
        clearTimeout(timeoutId);
        return val;
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        throw err;
      }),
    timeoutPromise,
  ]);
}

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_matchupvote_get',
      requestsPerLimit: 90,
    });
    if (!rateLimit.success) {
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    const matchupId = request.nextUrl.searchParams.get('matchupId') || '';
    const parsed = MatchupGetSchema.safeParse({ matchupId });
    if (!parsed.success) {
      return apiError('INVALID_PARAMETERS', 'Invalid matchupId parameter', 400, parsed.error.issues);
    }

    const cacheHeaders: ResponseInit = {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    };

    if (!adminDb) {
      return apiSuccess(
        { matchupId: parsed.data.matchupId, leftVotes: 0, rightVotes: 0 },
        { matchupId: parsed.data.matchupId, leftVotes: 0, rightVotes: 0 },
        cacheHeaders
      );
    }

    const timeoutMs = process.env.NODE_ENV === 'development' ? 1000 : 3000;
    const docRef = adminDb.collection('matchupVotes').doc(parsed.data.matchupId);
    const docSnap = await withTimeout(docRef.get(), timeoutMs);

    if (!docSnap.exists) {
      return apiSuccess(
        { matchupId: parsed.data.matchupId, leftVotes: 0, rightVotes: 0 },
        { matchupId: parsed.data.matchupId, leftVotes: 0, rightVotes: 0 },
        cacheHeaders
      );
    }

    const data = docSnap.data() || {};
    const leftVotes = typeof data.leftVotes === 'number' && data.leftVotes >= 0 ? data.leftVotes : 0;
    const rightVotes = typeof data.rightVotes === 'number' && data.rightVotes >= 0 ? data.rightVotes : 0;

    return apiSuccess(
      { matchupId: parsed.data.matchupId, leftVotes, rightVotes },
      { matchupId: parsed.data.matchupId, leftVotes, rightVotes },
      cacheHeaders
    );
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.warn('MatchupVoteAPI.GET', 'Error fetching matchup votes, returning zero counts', {}, err);
    return apiSuccess(
      { leftVotes: 0, rightVotes: 0 },
      { leftVotes: 0, rightVotes: 0 },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        },
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_matchupvote_post',
      requestsPerLimit: 40,
    });
    if (!rateLimit.success) {
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError('MALFORMED_JSON', 'Malformed JSON body payload', 400);
    }

    const parsed = MatchupPostSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('INVALID_PARAMETERS', 'Invalid parameters', 400, parsed.error.issues);
    }

    const { matchupId, side } = parsed.data;

    if (!adminDb) {
      const payload = {
        matchupId,
        leftVotes: side === 'left' ? 1 : 0,
        rightVotes: side === 'right' ? 1 : 0,
      };
      return apiSuccess(payload, payload);
    }

    const docRef = adminDb.collection('matchupVotes').doc(matchupId);
    const updatedCounts = await adminDb.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists) {
        const nextLeft = side === 'left' ? 1 : 0;
        const nextRight = side === 'right' ? 1 : 0;
        transaction.set(docRef, {
          matchupId,
          leftVotes: nextLeft,
          rightVotes: nextRight,
          updatedAt: new Date(),
        });
        return { leftVotes: nextLeft, rightVotes: nextRight };
      }

      const data = docSnap.data() || {};
      const currentLeft = typeof data.leftVotes === 'number' && data.leftVotes >= 0 ? data.leftVotes : 0;
      const currentRight = typeof data.rightVotes === 'number' && data.rightVotes >= 0 ? data.rightVotes : 0;
      const nextLeft = side === 'left' ? currentLeft + 1 : currentLeft;
      const nextRight = side === 'right' ? currentRight + 1 : currentRight;

      transaction.update(docRef, {
        leftVotes: nextLeft,
        rightVotes: nextRight,
        updatedAt: new Date(),
      });
      return { leftVotes: nextLeft, rightVotes: nextRight };
    });

    const payload = {
      matchupId,
      leftVotes: updatedCounts.leftVotes,
      rightVotes: updatedCounts.rightVotes,
    };

    return apiSuccess(payload, payload);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('MatchupVoteAPI.POST', 'Error recording matchup vote', {}, err);
    return apiError('INTERNAL_ERROR', 'Failed to record matchup vote', 500);
  }
}
