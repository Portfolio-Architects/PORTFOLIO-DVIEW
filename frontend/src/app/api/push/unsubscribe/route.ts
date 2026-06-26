import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

export const dynamic = 'force-dynamic';

const UnsubscribeInputSchema = z.object({
  endpoint: z.string().url(),
  apartmentName: z.string().min(1).optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = UnsubscribeInputSchema.safeParse(body);

    if (!parsed.success) {
      logger.warn('PushUnsubscribeAPI.POST', 'Invalid unsubscribe payload', { errors: parsed.error.format() });
      return NextResponse.json({ error: 'Invalid subscription payload', details: parsed.error.issues }, { status: 400 });
    }

    const { endpoint, apartmentName } = parsed.data;

    if (!db) {
      logger.error('PushUnsubscribeAPI.POST', 'Firebase Admin not initialized');
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    // Document ID is a base64 encoded endpoint to match registration
    const endpointHash = Buffer.from(endpoint).toString('base64').replace(/=/g, '').replace(/\//g, '_');
    const docRef = db.collection('push_subscriptions').doc(endpointHash);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      logger.info('PushUnsubscribeAPI.POST', 'Subscription document not found, doing nothing', { endpointHash });
      return NextResponse.json({ success: true, message: 'Subscription not found' });
    }

    if (apartmentName) {
      // Remove specific apartment from array
      await docRef.update({
        apts: admin.firestore.FieldValue.arrayRemove(apartmentName),
        updatedAt: new Date().toISOString()
      });
      logger.info('PushUnsubscribeAPI.POST', 'Apartment unsubscribed successfully', { uid: docSnap.data()?.uid, endpointHash, apartmentName });
    } else {
      // Delete the entire subscription
      await docRef.delete();
      logger.info('PushUnsubscribeAPI.POST', 'Subscription deleted completely', { uid: docSnap.data()?.uid, endpointHash });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error('PushUnsubscribeAPI.POST', 'Push Unsubscribe Error', {}, error as Error);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}
