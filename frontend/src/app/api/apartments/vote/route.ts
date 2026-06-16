import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { normalizeAptName } from '@/lib/utils/apartmentMapping';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

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
    const { searchParams } = new URL(request.url);
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

    if (!aptName || aptName === 'global') {
      const snap = await adminDb.collection('apartmentVotes').get();
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
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ buyCount: 0, waitCount: 0 });
    }

    const data = docSnap.data() || { buyCount: 0, waitCount: 0 };
    return NextResponse.json({
      buyCount: data.buyCount || 0,
      waitCount: data.waitCount || 0,
    });
  } catch (error: any) {
    logger.error('ApartmentVoteAPI.GET', 'Error fetching votes', {}, error);
    return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
