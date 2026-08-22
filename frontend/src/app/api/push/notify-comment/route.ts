import { NextRequest } from 'next/server';
import { adminDb as db } from '@/lib/firebaseAdmin';
import webpush from 'web-push';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NotifyCommentInputSchema = z.object({
  reportId: z.string(),
  commentText: z.string(),
  authorName: z.string(),
  commentAuthorUid: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(req, {
      prefix: 'ratelimit_push_notify_comment',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError('BAD_REQUEST', 'Invalid JSON body structure', 400);
    }

    const parsed = NotifyCommentInputSchema.safeParse(body);

    if (!parsed.success) {
      logger.warn('NotifyCommentAPI.POST', 'Invalid notify-comment payload', { errors: parsed.error.format() });
      return apiError('INVALID_PAYLOAD', 'Missing or invalid required parameters', 400, parsed.error.issues);
    }

    const { reportId, commentText, authorName, commentAuthorUid } = parsed.data;

    if (!db) {
      logger.error('NotifyCommentAPI.POST', 'Firebase Admin not initialized');
      return apiError('DATABASE_UNAVAILABLE', 'Firebase Admin not initialized', 500);
    }

    // 1. Fetch the field report to find its author's UID
    let reportRef = db.collection('field_reports').doc(reportId);
    let reportSnap = await reportRef.get();

    if (!reportSnap.exists) {
      const scoutingRef = db.collection('scoutingReports').doc(reportId);
      const scoutingSnap = await scoutingRef.get();
      if (scoutingSnap.exists) {
        reportRef = scoutingRef;
        reportSnap = scoutingSnap;
      } else {
        logger.warn('NotifyCommentAPI.POST', 'Field report not found in both collections', { reportId });
        return apiError('NOT_FOUND', 'Field report not found', 404);
      }
    }

    const reportData = reportSnap.data()!;
    const reportAuthorUid = reportData.authorUid;
    const apartmentName = reportData.apartmentName;

    // 2. Prevent sending notification to oneself
    if (!reportAuthorUid || reportAuthorUid === commentAuthorUid) {
      logger.info('NotifyCommentAPI.POST', 'Skipping notification: self-comment or no author UID', { reportId, reportAuthorUid, commentAuthorUid });
      return apiSuccess({ message: 'Self-comment or no author UID' }, { message: 'Self-comment or no author UID' });
    }

    // 3. Configure web-push
    const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
    const privateVapidKey = process.env.VAPID_PRIVATE_KEY || '';

    if (!publicVapidKey || !privateVapidKey) {
      logger.warn('NotifyCommentAPI.POST', 'VAPID keys not configured in env.');
      return apiError('SERVICE_UNAVAILABLE', 'VAPID keys not configured', 500);
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
      return apiSuccess({ message: 'No subscriptions found for report author' }, { message: 'No subscriptions found for report author' });
    }

    const notificationPayload = JSON.stringify({
      title: `💬 D-VIEW: 내 임장기에 댓글이 달렸습니다!`,
      body: `${authorName}: ${commentText.substring(0, 60)}${commentText.length > 60 ? '...' : ''}`,
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'}/overview#apt=${encodeURIComponent(apartmentName)}`,
    });

    let sentCount = 0;
    const promises = subsSnap.docs.map(async (doc) => {
      const data = doc.data();
      const sub = data.subscription;
      try {
        await webpush.sendNotification(sub, notificationPayload);
        sentCount++;
      } catch (err: unknown) {
        const webPushError = err as { statusCode?: number };
        logger.error('NotifyCommentAPI.POST', 'Failed to send push notification to endpoint', { endpoint: sub.endpoint, statusCode: webPushError.statusCode }, err as Error);
        if (webPushError.statusCode === 410 || webPushError.statusCode === 404) {
          await doc.ref.delete();
          logger.info('NotifyCommentAPI.POST', 'Deleted expired subscription', { docId: doc.id });
        }
      }
    });

    await Promise.all(promises);

    logger.info('NotifyCommentAPI.POST', 'Push notifications process completed', { sentCount, reportAuthorUid });
    return apiSuccess({ sentCount }, { sentCount });
  } catch (error: unknown) {
    logger.error('NotifyCommentAPI.POST', 'Notify Comment Error', {}, error as Error);
    return apiError('INTERNAL_ERROR', 'Failed to process push notification', 500);
  }
}
