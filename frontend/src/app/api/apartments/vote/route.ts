import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { normalizeAptName } from '@/lib/utils/apartmentMapping';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const aptName = searchParams.get('aptName');
    if (!aptName) {
      return NextResponse.json({ error: 'aptName is required' }, { status: 400 });
    }

    if (!adminDb) {
      const mockBuy = (aptName.length * 7) % 25 + 5;
      const mockWait = (aptName.length * 3) % 15 + 3;
      return NextResponse.json({ buyCount: mockBuy, waitCount: mockWait });
    }

    const docId = normalizeAptName(aptName);
    const docRef = adminDb.collection('apartmentVotes').doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      const mockBuy = (aptName.length * 7) % 25 + 5;
      const mockWait = (aptName.length * 3) % 15 + 3;
      return NextResponse.json({ buyCount: mockBuy, waitCount: mockWait });
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
      return NextResponse.json({ success: true, mock: true });
    }

    const docId = normalizeAptName(aptName);
    const docRef = adminDb.collection('apartmentVotes').doc(docId);

    await adminDb.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists) {
        const mockBuy = (aptName.length * 7) % 25 + 5;
        const mockWait = (aptName.length * 3) % 15 + 3;
        
        transaction.set(docRef, {
          aptName,
          buyCount: voteType === 'buy' ? mockBuy + 1 : mockBuy,
          waitCount: voteType === 'wait' ? mockWait + 1 : mockWait,
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
