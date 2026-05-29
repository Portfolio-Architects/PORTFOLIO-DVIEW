import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebaseAdmin';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { reportId, commentText, authorName, commentAuthorUid } = await req.json();

    if (!reportId || !commentText || !authorName) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    // 1. Fetch the field report to find its author's UID
    const reportRef = db.collection('field_reports').doc(reportId);
    const reportSnap = await reportRef.get();
    
    if (!reportSnap.exists) {
      return NextResponse.json({ error: 'Field report not found' }, { status: 404 });
    }

    const reportData = reportSnap.data()!;
    const reportAuthorUid = reportData.authorUid;
    const apartmentName = reportData.apartmentName;

    // 2. Prevent sending notification to oneself
    if (!reportAuthorUid || reportAuthorUid === commentAuthorUid) {
      return NextResponse.json({ success: true, message: 'Self-comment or no author UID' });
    }

    // 3. Configure web-push
    const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
    const privateVapidKey = process.env.VAPID_PRIVATE_KEY || '';

    if (!publicVapidKey || !privateVapidKey) {
      console.warn('[PUSH] VAPID keys not configured in env.');
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
        console.error('[PUSH] Failed to send to endpoint:', sub.endpoint, err);
        // If subscription is expired or invalid, remove it
        if (err.statusCode === 410 || err.statusCode === 404) {
          await doc.ref.delete();
          console.log('[PUSH] Deleted expired subscription:', doc.id);
        }
      }
    });

    await Promise.all(promises);

    return NextResponse.json({ success: true, sentCount });
  } catch (error: any) {
    console.error('Notify Comment Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
