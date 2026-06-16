import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebaseAdmin';
import webpush from 'web-push';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

export const dynamic = 'force-dynamic';

const NotifyCommentInputSchema = z.object({
  reportId: z.string(),
  commentText: z.string(),
  authorName: z.string(),
  commentAuthorUid: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = NotifyCommentInputSchema.safeParse(body);

    if (!parsed.success) {
      logger.warn('NotifyCommentAPI.POST', 'Invalid notify-comment payload', { errors: parsed.error.format() });
      return NextResponse.json({ error: 'Missing or invalid required parameters', details: parsed.error.issues }, { status: 400 });
    }

    const { reportId, commentText, authorName, commentAuthorUid } = parsed.data;

    if (!db) {
      logger.error('NotifyCommentAPI.POST', 'Firebase Admin not initialized');
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    // 1. Fetch the field report to find its author's UID
    const reportRef = db.collection('field_reports').doc(reportId);
    const reportSnap = await reportRef.get();
    
    if (!reportSnap.exists) {
      logger.warn('NotifyCommentAPI.POST', 'Field report not found', { reportId });
      return NextResponse.json({ error: 'Field report not found' }, { status: 404 });
    }

    const reportData = reportSnap.data()!;
    const reportAuthorUid = reportData.authorUid;
    const apartmentName = reportData.apartmentName;

    // 2. Prevent sending notification to oneself
    if (!reportAuthorUid || reportAuthorUid === commentAuthorUid) {
      logger.info('NotifyCommentAPI.POST', 'Skipping notification: self-comment or no author UID', { reportId, reportAuthorUid, commentAuthorUid });
      return NextResponse.json({ success: true, message: 'Self-comment or no author UID' });
    }

    // 3. Configure web-push
    const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
    const privateVapidKey = process.env.VAPID_PRIVATE_KEY || '';

    if (!publicVapidKey || !privateVapidKey) {
      logger.warn('NotifyCommentAPI.POST', 'VAPID keys not configured in env.');
      return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 });
    }

    webpush.setVapidDetails(
      'mailto:support@dongtanview.com',
      publicVapidKey,
      privateVapidKey
    );

    // 4. Query subscriptions for the report author
    const subsSnap = await db.collection('push_subscriptions')
      .where('uid', '==', reportAuthorUid)
      .get();

    if (subsSnap.empty) {
      logger.info('NotifyCommentAPI.POST', 'No subscriptions found for report author', { reportAuthorUid });
      return NextResponse.json({ success: true, message: 'No subscriptions found for report author' });
    }

    const notificationPayload = JSON.stringify({
      title: `💬 D-VIEW: 내 임장기에 댓글이 달렸습니다!`,
      body: `${authorName}: ${commentText.substring(0, 60)}${commentText.length > 60 ? '...' : ''}`,
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'}/#apt=${encodeURIComponent(apartmentName)}`
    });

    let sentCount = 0;
    const promises = subsSnap.docs.map(async (doc) => {
      const data = doc.data();
      const sub = data.subscription;
      try {
        await webpush.sendNotification(sub, notificationPayload);
        sentCount++;
      } catch (err: any) {
        logger.error('NotifyCommentAPI.POST', 'Failed to send push notification to endpoint', { endpoint: sub.endpoint, statusCode: err.statusCode }, err);
        // If subscription is expired or invalid, remove it
        if (err.statusCode === 410 || err.statusCode === 404) {
          await doc.ref.delete();
          logger.info('NotifyCommentAPI.POST', 'Deleted expired subscription', { docId: doc.id });
        }
      }
    });

    await Promise.all(promises);

    logger.info('NotifyCommentAPI.POST', 'Push notifications process completed', { sentCount, reportAuthorUid });
    return NextResponse.json({ success: true, sentCount });
  } catch (error: any) {
    logger.error('NotifyCommentAPI.POST', 'Notify Comment Error', {}, error);
    return NextResponse.json({ error: 'Failed to process push notification' }, { status: 500 });
  }
}

