import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { normalizeAptName } from '@/lib/utils/apartmentMapping';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { rateLimiter } from '@/lib/rate-limit';

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
    if (rateLimiter) {
      const forwarded = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const rawIp = realIp || forwarded?.split(',')[0]?.trim() || '127.0.0.1';
      const { success } = await rateLimiter.limit(`ratelimit_apartmentsvote_get_${rawIp}`);
      if (!success) {
        logger.warn('ApartmentVoteAPI.GET', 'Rate limit exceeded', { ip: rawIp });
        return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
      }
    }

    const { searchParams } = request.nextUrl;
    const aptNameParam = searchParams.get('aptName');

    const parsed = VoteGetSchema.safeParse({ aptName: aptNameParam });
    if (!parsed.success) {
      logger.warn('ApartmentVoteAPI.GET', 'Invalid query parameters', { errors: parsed.error.format() });
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const { aptName } = parsed.data;

    if (!adminDb) {
      return NextResponse.json({ buyCount: 0, waitCount: 0 });
    }

    const isDev = process.env.NODE_ENV === 'development';
    const timeoutMs = isDev ? 1000 : 3000;

    const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
      let timeoutId: any;
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
        timeoutPromise
      ]);
    };

    if (!aptName || aptName === 'global') {
      const snap = await withTimeout(adminDb.collection('apartmentVotes').get(), timeoutMs);
      let buyCount = 0;
      let waitCount = 0;
      snap.forEach(doc => {
        const data = doc.data();
        buyCount += data.buyCount || 0;
        waitCount += data.waitCount || 0;
      });
      return NextResponse.json({ buyCount, waitCount });
    }

    const docId = normalizeAptName(aptName);
    const docRef = adminDb.collection('apartmentVotes').doc(docId);
    const docSnap = await withTimeout(docRef.get(), timeoutMs);

    if (!docSnap.exists) {
      return NextResponse.json({ buyCount: 0, waitCount: 0 });
    }

    const data = docSnap.data() || { buyCount: 0, waitCount: 0 };
    return NextResponse.json({
      buyCount: data.buyCount || 0,
      waitCount: data.waitCount || 0,
    });
  } catch (error: any) {
    logger.warn('ApartmentVoteAPI.GET', 'Error fetching votes, using fallback', {}, error);
    return NextResponse.json({ buyCount: 0, waitCount: 0 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (rateLimiter) {
      const forwarded = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const rawIp = realIp || forwarded?.split(',')[0]?.trim() || '127.0.0.1';
      const { success } = await rateLimiter.limit(`ratelimit_apartmentsvote_post_${rawIp}`);
      if (!success) {
        logger.warn('ApartmentVoteAPI.POST', 'Rate limit exceeded', { ip: rawIp });
        return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
      }
    }

    let body: any;
    try {
      body = await request.json();
    } catch (jsonErr) {
      logger.warn('ApartmentVoteAPI.POST', 'Malformed JSON payload', {});
      return NextResponse.json({ error: 'Malformed JSON body payload' }, { status: 400 });
    }

    const parsed = VotePostSchema.safeParse(body);
    
    if (!parsed.success) {
      logger.warn('ApartmentVoteAPI.POST', 'Invalid request body payload', { errors: parsed.error.format() });
      return NextResponse.json({ error: 'Invalid parameters', details: parsed.error.issues }, { status: 400 });
    }

    const { aptName, voteType } = parsed.data;

    if (!adminDb) {
      logger.warn('ApartmentVoteAPI.POST', 'adminDb is not configured. Falling back to dummy success responses.');
      return NextResponse.json({ success: true, buyCount: voteType === 'buy' ? 1 : 0, waitCount: voteType === 'wait' ? 1 : 0 });
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

    return NextResponse.json({
      success: true,
      buyCount: updatedData.buyCount,
      waitCount: updatedData.waitCount,
    });
  } catch (error: any) {
    logger.error('ApartmentVoteAPI.POST', 'Error recording vote', {}, error);
    return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 });
  }
}
