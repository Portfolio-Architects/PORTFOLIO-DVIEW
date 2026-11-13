import { NextResponse } from 'next/server';
import { getLiveTransactionDelta } from '@/lib/services/liveTransactionOverlay';
import { logger } from '@/lib/services/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'icn1';

/**
 * GET /api/transactions/live-delta
 *
 * Serves CDN-cached post-build Firestore transaction deltas so newly disclosed 05:xx~06:xx KST
 * MOLIT batches appear immediately on D-VIEW before a full static next build finishes.
 */
export async function GET() {
  try {
    const payload = await getLiveTransactionDelta();
    return NextResponse.json(payload, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (err) {
    logger.warn('LiveTransactionDeltaAPI.GET', 'Returning safe empty delta fallback on error', {}, err as Error);
    return NextResponse.json(
      {
        hasDelta: false,
        baselineRegisteredDate: '',
        marketStats: null,
        deltaTransactions: [],
        rawDeltaDocs: [],
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
