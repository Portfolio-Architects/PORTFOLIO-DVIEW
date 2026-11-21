import { NextRequest } from 'next/server';
import webpush from 'web-push';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { adminDb as db } from '@/lib/firebaseAdmin';
import { verifyAuthHeader } from '@/lib/authUtils';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import {
  PushSubscriptionSchema,
  hashPushEndpoint,
  hasValidPushOwnershipCookie,
  legacyBase64EndpointId,
} from '@/lib/push/pushSecurity';
import { configureWebPushVapid } from '@/lib/push/vapidConfig';
import {
  buildGlobalDailySummaryPayload,
  selectGlobalHighlightTransactions,
  type TransactionRecord,
} from '@/app/api/cron/send-tx-notifications/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TestPushInputSchema = z.object({
  subscription: PushSubscriptionSchema,
});

async function isAuthorizedForTestPush(req: NextRequest, endpoint: string): Promise<boolean> {
  if (hasValidPushOwnershipCookie(req, endpoint)) {
    return true;
  }

  try {
    const decoded = await verifyAuthHeader(req);
    if (!decoded?.uid || !db) return false;

    const shaDocId = hashPushEndpoint(endpoint);
    const shaSnap = await db.collection('push_subscriptions').doc(shaDocId).get();
    if (shaSnap.exists && shaSnap.data()?.uid === decoded.uid) {
      return true;
    }

    const legacyId = legacyBase64EndpointId(endpoint);
    const legacySnap = await db.collection('push_subscriptions').doc(legacyId).get();
    if (legacySnap.exists && legacySnap.data()?.uid === decoded.uid) {
      return true;
    }
  } catch {
    // Unauthenticated or invalid Firebase token -> deny
  }

  return false;
}

function loadLatestRealTransactionsSummary(): {
  latestDate: string | null;
  title: string;
  body: string;
  url: string;
  count: number;
} {
  let transactionsPath = path.join(process.cwd(), 'public/data/recent-transactions.json');
  if (!fs.existsSync(transactionsPath)) {
    const fallbackPath = path.join(process.cwd(), 'frontend/public/data/recent-transactions.json');
    if (fs.existsSync(fallbackPath)) {
      transactionsPath = fallbackPath;
    }
  }

  if (fs.existsSync(transactionsPath)) {
    try {
      const allTx = JSON.parse(fs.readFileSync(transactionsPath, 'utf-8')) as TransactionRecord[];
      const latestDate =
        allTx
          .map((t) => t.registeredDate)
          .filter((d): d is string => Boolean(d && /^\d{8}$/.test(d)))
          .sort()
          .pop() || null;

      if (latestDate) {
        const latestTxs = allTx.filter((t) => t.registeredDate === latestDate);
        const highlights = selectGlobalHighlightTransactions(latestTxs);
        const summary = buildGlobalDailySummaryPayload(latestTxs, highlights);
        if (summary) {
          const month = Number(latestDate.slice(4, 6));
          const day = Number(latestDate.slice(6, 8));
          const dateBadge = `${month}/${day}`;
          return {
            latestDate,
            title: '[테스트] 동탄 실거래 알림 연결 완료',
            body: `최근(${dateBadge}) 동탄 매매 ${summary.totalCount}건 · ${summary.body}`,
            url: summary.url,
            count: summary.totalCount,
          };
        }
      }
    } catch (err) {
      logger.warn('PushTestAPI.loadLatest', 'Failed to read recent-transactions.json for test preview', undefined, err as Error);
    }
  }

  return {
    latestDate: null,
    title: '[테스트] 동탄 실거래 알림 연결 완료',
    body: '이 기기에서 매일 오전 7시대 국토부 동탄 매매 실거래 요약을 정상 수신할 수 있습니다.',
    url: '/',
    count: 0,
  };
}

/**
 * Sends a single real Web Push test notification strictly to the caller's own PushSubscription.
 * Never reads or broadcasts to Firestore subscribers.
 */
export async function POST(req: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(req, {
      prefix: 'ratelimit_push_test',
      requestsPerLimit: 10,
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

    const parsed = TestPushInputSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('INVALID_PAYLOAD', '유효한 푸시 구독 정보가 필요합니다.', 400, parsed.error.issues);
    }

    const vapidConfig = configureWebPushVapid(webpush);
    if (!vapidConfig.configured) {
      logger.warn('PushTestAPI.POST', 'VAPID keys are not configured', {
        reason: vapidConfig.reason,
      });
      return apiError(
        'VAPID_NOT_CONFIGURED',
        '서버에 VAPID 알림 키가 아직 설정되지 않았습니다.',
        503
      );
    }

    const authorized = await isAuthorizedForTestPush(req, parsed.data.subscription.endpoint);
    if (!authorized) {
      logger.warn('PushTestAPI.POST', 'Unauthorized self-test push request blocked');
      return apiError(
        'UNAUTHORIZED',
        '알림 소유권 인증이 필요합니다. 알림을 다시 신청한 뒤 테스트해 주세요.',
        401
      );
    }

    const preview = loadLatestRealTransactionsSummary();
    const payload = JSON.stringify({
      title: preview.title,
      body: preview.body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      url: preview.url,
      data: {
        url: preview.url,
        isTest: true,
        latestRegisteredDate: preview.latestDate,
      },
    });

    const result = await webpush.sendNotification(parsed.data.subscription, payload);
    logger.info('PushTestAPI.POST', 'Self-test push notification dispatched', {
      statusCode: result?.statusCode,
      latestRegisteredDate: preview.latestDate,
    });

    return apiSuccess({
      statusCode: result?.statusCode ?? 201,
      title: preview.title,
      body: preview.body,
      latestRegisteredDate: preview.latestDate,
      latestCount: preview.count,
    });
  } catch (err: unknown) {
    const errorObj = err as { statusCode?: number; body?: string; message?: string };
    const statusCode = typeof errorObj?.statusCode === 'number' ? errorObj.statusCode : undefined;

    if (statusCode === 404 || statusCode === 410) {
      return apiError(
        'SUBSCRIPTION_EXPIRED',
        '현재 기기의 알림 구독이 만료되었습니다. 알림을 다시 신청해 주세요.',
        410
      );
    }

    if (statusCode === 401 || statusCode === 403) {
      return apiError(
        'VAPID_KEY_MISMATCH',
        '브라우저 구독 키와 서버 VAPID 키가 일치하지 않습니다. 알림을 껐다가 다시 신청해 주세요.',
        409
      );
    }

    logger.error('PushTestAPI.POST', 'Failed to send self-test push notification', { statusCode }, err as Error);
    return apiError(
      'PUSH_DELIVERY_FAILED',
      '테스트 알림 발송 중 Push 서비스 오류가 발생했습니다.',
      502,
      errorObj?.message
    );
  }
}
