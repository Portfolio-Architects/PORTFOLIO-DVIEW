import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { normalizeAptName } from '@/lib/utils/apartmentMapping';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const aptName = searchParams.get('aptName');

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
    console.error('Error fetching votes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { aptName, voteType } = body;

    if (!aptName || !['buy', 'wait'].includes(voteType)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    if (!adminDb) {
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

    return NextResponse.json({
      success: true,
      buyCount: updatedData.buyCount,
      waitCount: updatedData.waitCount,
    });
  } catch (error: any) {
    console.error('Error recording vote:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
