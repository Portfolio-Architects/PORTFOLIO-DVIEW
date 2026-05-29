import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { subscription, uid } = await req.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    // Save to Firestore. Document ID is a base64 encoded endpoint to prevent duplicates.
    const endpointHash = Buffer.from(subscription.endpoint).toString('base64').replace(/=/g, '').replace(/\//g, '_');
    
    await db.collection('push_subscriptions').doc(endpointHash).set({
      subscription,
      uid: uid || null,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Push Subscribe Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
