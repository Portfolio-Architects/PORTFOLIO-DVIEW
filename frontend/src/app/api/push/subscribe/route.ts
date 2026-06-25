import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

export const dynamic = 'force-dynamic';

const PushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.record(z.string(), z.string()).optional(),
});

const SubscribeInputSchema = z.object({
  subscription: PushSubscriptionSchema,
  uid: z.string().nullable().optional(),
  apartmentName: z.string().min(1).nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = SubscribeInputSchema.safeParse(body);

    if (!parsed.success) {
      logger.warn('PushSubscribeAPI.POST', 'Invalid subscribe payload', { errors: parsed.error.format() });
      return NextResponse.json({ error: 'Invalid subscription object', details: parsed.error.issues }, { status: 400 });
    }

    const { subscription, uid, apartmentName } = parsed.data;

    if (!db) {
      logger.error('PushSubscribeAPI.POST', 'Firebase Admin not initialized');
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    // Save to Firestore. Document ID is a base64 encoded endpoint to prevent duplicates.
    const endpointHash = Buffer.from(subscription.endpoint).toString('base64').replace(/=/g, '').replace(/\//g, '_');
    
    const updateData: any = {
      subscription,
      uid: uid || null,
      updatedAt: new Date().toISOString()
    };

    if (apartmentName) {
      updateData.apts = admin.firestore.FieldValue.arrayUnion(apartmentName);
    }
    
    await db.collection('push_subscriptions').doc(endpointHash).set(updateData, { merge: true });

    logger.info('PushSubscribeAPI.POST', 'Push subscription registered successfully', { uid, endpointHash, apartmentName });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('PushSubscribeAPI.POST', 'Push Subscribe Error', {}, error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}

