import { NextRequest } from 'next/server';
import { adminDb as db } from '@/lib/firebaseAdmin';
import webpush from 'web-push';
import path from 'path';
import fs from 'fs';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { resolveCanonicalAptSlug } from '@/lib/utils/apartmentMapping';
import { getTodayYmdKST } from '@/lib/todayUpdateEvaluator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// VAPID configuration
const vapidPublicKey =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BJfvp3-MGu6cXDWL2GGKO019MjQhLFSwk1zvAIo8QgX31bfCwfjOHHr34iJcGYnhxpJBCsPoXeG6CAXql9KR9Xg';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'YCeNPk2VFyunF4yNgdtqThe87T4BCyrsTlPS18K9m7Q';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@dview.kr';

try {
  if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  }
} catch (err) {
  logger.error('SendTxNotificationsAPI', 'Failed to configure VAPID details', {}, err as Error);
}

export interface TransactionRecord {
  aptName: string;
  txKey?: string;
  dong?: string;
  date?: string;
  contractDate: string;
  registeredDate?: string;
  registeredDateLabel?: string;
  priceVal?: number;
  priceEok: string;
  area?: number;
  areaPyeong: number;
  floor: number;
  dealType?: string;
  isNewHigh?: boolean;
  newHighDelta?: number;
  prevPriceVal?: number;
  delta?: number;
  deltaPercent?: number;
  dateLabel?: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushSubscriptionDoc {
  subscription: PushSubscriptionData;
  uid?: string | null;
  updatedAt?: string;
  apts?: string[];
}

/**
 * Validates basic push subscription structure before dispatch.
 */
export function isValidPushSubscription(sub: unknown): sub is PushSubscriptionData {
  if (!sub || typeof sub !== 'object') return false;
  const s = sub as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  return (
    typeof s.endpoint === 'string' &&
    s.endpoint.startsWith('http') &&
    typeof s.keys?.p256dh === 'string' &&
    Boolean(s.keys.p256dh) &&
    typeof s.keys?.auth === 'string' &&
    Boolean(s.keys.auth)
  );
}

/**
 * Selects up to 2 representative highlight transactions for global "동탄 전체" subscribers.
 * Priority 1: New highs (`isNewHigh === true`), sorted by priceVal descending.
 * Priority 2: Highest price transaction (`priceVal` descending) if no new highs exist today.
 */
export function selectGlobalHighlightTransactions(txs: TransactionRecord[]): TransactionRecord[] {
  if (!txs || txs.length === 0) return [];

  // Exclude direct trades (직거래) from top highlights to preserve real-market fidelity
  const marketTxs = txs.filter((t) => t.dealType !== '직거래');
  const pool = marketTxs.length > 0 ? marketTxs : txs;

  const newHighs = pool.filter((t) => Boolean(t.isNewHigh));
  if (newHighs.length > 0) {
    return [...newHighs].sort((a, b) => (b.priceVal || 0) - (a.priceVal || 0)).slice(0, 2);
  }

  return [...pool].sort((a, b) => (b.priceVal || 0) - (a.priceVal || 0)).slice(0, 1);
}

/**
 * Chunks array into smaller batches for controlled concurrency.
 */
export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function GET(req: NextRequest) {
  try {
    // 1. Rate Limiting Check
    const rateLimit = await checkRateLimit(req, {
      prefix: 'ratelimit_cron_tx_notify',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    const url = new URL(req.url);
    const isDebug = url.searchParams.get('debug') === 'true';
    const forceDate = url.searchParams.get('date');
    const isDryRunParam =
      url.searchParams.get('dryRun') === 'true' ||
      url.searchParams.get('dry_run') === 'true' ||
      url.searchParams.get('dryrun') === 'true';
    const isDryRunEnv = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
    const isDryRun = isDryRunParam || isDryRunEnv;

    // 2. Authorization Verification
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dview-default-cron-secret-2026';
    const host = req.headers.get('host') || '';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    const queryAuth = url.searchParams.get('auth');
    const isAuthorized = isLocal || authHeader === `Bearer ${cronSecret}` || queryAuth === cronSecret;

    if (!isAuthorized) {
      logger.warn('SendTxNotificationsAPI.GET', 'Unauthorized access attempt blocked');
      return apiError('UNAUTHORIZED', 'Unauthorized', 401);
    }

    if (!db) {
      logger.error('SendTxNotificationsAPI.GET', 'Firebase Admin DB not initialized');
      return apiError('DATABASE_UNAVAILABLE', 'Database uninitialized', 500);
    }
    const firestore = db;

    // 3. Target Date Resolution (Asia/Seoul registeredDate)
    const todayYmdKST = getTodayYmdKST();
    const targetDate = forceDate && /^\d{8}$/.test(forceDate) ? forceDate : todayYmdKST;

    logger.info('SendTxNotificationsAPI.GET', 'Starting transaction notification run', {
      targetDate,
      todayYmdKST,
      isDryRun,
      isDebug,
    });

    // 4. Load recent transactions JSON data
    let transactionsPath = path.join(process.cwd(), 'public/data/recent-transactions.json');
    if (!fs.existsSync(transactionsPath)) {
      const fallbackPath = path.join(process.cwd(), 'frontend/public/data/recent-transactions.json');
      if (fs.existsSync(fallbackPath)) {
        transactionsPath = fallbackPath;
      } else {
        logger.error('SendTxNotificationsAPI.GET', 'recent-transactions.json not found', { path: transactionsPath });
        return apiError('NOT_FOUND', 'Transactions data file not found', 404);
      }
    }

    const rawData = fs.readFileSync(transactionsPath, 'utf-8');
    const allTx: TransactionRecord[] = JSON.parse(rawData);

    // 5. Date Filtering Fix: Evaluate registeredDate === targetDate
    let targetTx = allTx.filter((t) => {
      if (t.registeredDate && /^\d{8}$/.test(t.registeredDate)) {
        return t.registeredDate === targetDate;
      }
      // Fallback for legacy items lacking registeredDate
      return t.contractDate === targetDate;
    });

    // Debug mode fallback slice
    if (targetTx.length === 0 && isDebug && !forceDate) {
      targetTx = allTx.slice(0, 3);
      logger.info('SendTxNotificationsAPI.GET', 'Debug mode: using fallback transaction slice', {
        count: targetTx.length,
      });
    }

    if (targetTx.length === 0) {
      logger.info('SendTxNotificationsAPI.GET', 'No new registered transactions for date', { targetDate });
      return apiSuccess({
        message: 'No new registered transactions found',
        targetDate,
        todayYmdKST,
        isDryRun,
        txAnalyzedCount: 0,
        sentCount: 0,
      }, {
        message: 'No new registered transactions found',
        sentCount: 0,
      });
    }

    // 6. Group Transactions by Apartment
    const txByApt: Record<string, TransactionRecord[]> = {};
    for (const tx of targetTx) {
      if (!tx.aptName) continue;
      if (!txByApt[tx.aptName]) {
        txByApt[tx.aptName] = [];
      }
      txByApt[tx.aptName].push(tx);
    }

    // 7. Select Global Highlights for "동탄 전체" subscribers
    const globalHighlights = selectGlobalHighlightTransactions(targetTx);

    // 8. Dispatch Preparation & Deduplication Invariants
    const deliveredKeys = new Set<string>();
    const deviceSentCount = new Map<string, number>();
    const MAX_NOTIFICATIONS_PER_DEVICE = 2; // Strict anti-spam capping

    interface DispatchTask {
      docId: string;
      subscription: PushSubscriptionData;
      payload: string;
      deliveryKey: string;
      recipientType: 'apartment' | 'global';
      aptName: string;
      title: string;
      body: string;
    }

    const dispatchQueue: DispatchTask[] = [];

    // 8.1 Build tasks for apartment-specific subscribers
    for (const aptName of Object.keys(txByApt)) {
      const aptTransactions = txByApt[aptName];
      const subSnapshot = await firestore
        .collection('push_subscriptions')
        .where('apts', 'array-contains', aptName)
        .get();

      if (subSnapshot.empty) continue;

      for (const doc of subSnapshot.docs) {
        const subData = doc.data() as PushSubscriptionDoc;
        const subscription = subData.subscription;
        if (!isValidPushSubscription(subscription)) continue;

        for (const tx of aptTransactions) {
          const count = deviceSentCount.get(doc.id) || 0;
          if (count >= MAX_NOTIFICATIONS_PER_DEVICE) break;

          const deliveryKey = `${doc.id}__${tx.txKey || tx.aptName}_${tx.floor}_${tx.priceEok}`;
          if (deliveredKeys.has(deliveryKey)) continue;

          const canonicalTxSlug =
            resolveCanonicalAptSlug(tx.aptName, { txKey: tx.txKey, dong: tx.dong }) || tx.aptName;
          const pyeongText = tx.areaPyeong ? `${Math.round(tx.areaPyeong)}평형 ` : '';
          const floorText = tx.floor ? `${tx.floor}층 ` : '';
          const title = tx.isNewHigh ? '[신고가] D-VIEW 실거래가 알림' : '[D-VIEW] 실거래가 등록 알림';
          const body = tx.isNewHigh
            ? `${tx.aptName} ${pyeongText}${floorText}${tx.priceEok} 신고가 등록!`
            : `${tx.aptName} ${pyeongText}${floorText}${tx.priceEok} 실거래가 등록되었습니다.`;

          const payload = JSON.stringify({
            title,
            body,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            url: `/apartment/${encodeURIComponent(canonicalTxSlug)}`,
            data: {
              url: `/apartment/${encodeURIComponent(canonicalTxSlug)}`,
              aptName: tx.aptName,
              txKey: tx.txKey,
            },
          });

          dispatchQueue.push({
            docId: doc.id,
            subscription,
            payload,
            deliveryKey,
            recipientType: 'apartment',
            aptName: tx.aptName,
            title,
            body,
          });

          deliveredKeys.add(deliveryKey);
          deviceSentCount.set(doc.id, count + 1);
        }
      }
    }

    // 8.2 Build tasks for global "동탄 전체" subscribers
    if (globalHighlights.length > 0) {
      let globalSnapshot;
      try {
        globalSnapshot = await firestore
          .collection('push_subscriptions')
          .where('apts', 'array-contains-any', ['동탄 전체', '동탄 전역'])
          .get();
      } catch {
        // Fallback for mock environments that only support array-contains
        globalSnapshot = await firestore
          .collection('push_subscriptions')
          .where('apts', 'array-contains', '동탄 전체')
          .get();
      }

      if (!globalSnapshot.empty) {
        for (const doc of globalSnapshot.docs) {
          const subData = doc.data() as PushSubscriptionDoc;
          const subscription = subData.subscription;
          if (!isValidPushSubscription(subscription)) continue;

          for (const tx of globalHighlights) {
            const count = deviceSentCount.get(doc.id) || 0;
            if (count >= MAX_NOTIFICATIONS_PER_DEVICE) break;

            const deliveryKey = `${doc.id}__${tx.txKey || tx.aptName}_${tx.floor}_${tx.priceEok}`;
            // If already notified through specific apartment subscription, skip to prevent duplicate ping
            if (deliveredKeys.has(deliveryKey)) continue;

            const canonicalTxSlug =
              resolveCanonicalAptSlug(tx.aptName, { txKey: tx.txKey, dong: tx.dong }) || tx.aptName;
            const pyeongText = tx.areaPyeong ? `${Math.round(tx.areaPyeong)}평형 ` : '';
            const floorText = tx.floor ? `${tx.floor}층 ` : '';
            const title = tx.isNewHigh ? '[동탄 신고가] D-VIEW 실거래 알림' : '[동탄 주요거래] D-VIEW 실거래 알림';
            const body = tx.isNewHigh
              ? `${tx.aptName} ${pyeongText}${floorText}${tx.priceEok} 신고가 경신!`
              : `${tx.aptName} ${pyeongText}${floorText}${tx.priceEok} 실거래 등록`;

            const payload = JSON.stringify({
              title,
              body,
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              url: `/apartment/${encodeURIComponent(canonicalTxSlug)}`,
              data: {
                url: `/apartment/${encodeURIComponent(canonicalTxSlug)}`,
                aptName: tx.aptName,
                txKey: tx.txKey,
              },
            });

            dispatchQueue.push({
              docId: doc.id,
              subscription,
              payload,
              deliveryKey,
              recipientType: 'global',
              aptName: tx.aptName,
              title,
              body,
            });

            deliveredKeys.add(deliveryKey);
            deviceSentCount.set(doc.id, count + 1);
          }
        }
      }
    }

    // 9. Dispatch Execution: Dry-Run vs Real Transmission
    let totalNotificationsSent = 0;
    let expiredCleanedCount = 0;
    const samplePayloads: Array<{ recipientType: string; aptName: string; title: string; body: string }> = [];

    if (isDryRun) {
      logger.info('SendTxNotificationsAPI.GET', '[DRY_RUN] Simulated push dispatch summary', {
        targetDate,
        totalTasksQueued: dispatchQueue.length,
        uniqueDevices: deviceSentCount.size,
      });

      for (const task of dispatchQueue.slice(0, 5)) {
        samplePayloads.push({
          recipientType: task.recipientType,
          aptName: task.aptName,
          title: task.title,
          body: task.body,
        });
      }

      return apiSuccess({
        dryRun: true,
        targetDate,
        todayYmdKST,
        txAnalyzedCount: targetTx.length,
        distinctAptsCount: Object.keys(txByApt).length,
        globalHighlightsCount: globalHighlights.length,
        totalTasksQueued: dispatchQueue.length,
        simulatedSentCount: dispatchQueue.length,
        uniqueDevicesTargeted: deviceSentCount.size,
        samplePayloads,
        cleanedSubscriptionsCount: 0,
      }, {
        dryRun: true,
        targetDate,
        sentCount: dispatchQueue.length,
      });
    }

    // Real WebPush Execution in Bounded Batches of 10
    const BATCH_SIZE = 10;
    const batches = chunkArray(dispatchQueue, BATCH_SIZE);
    const cleanedDocIds = new Set<string>();

    for (const batch of batches) {
      await Promise.allSettled(
        batch.map(async (task) => {
          try {
            await webpush.sendNotification(task.subscription, task.payload);
            totalNotificationsSent++;
          } catch (err: unknown) {
            const errorObj = err as { statusCode?: number };
            const statusCode = typeof errorObj?.statusCode === 'number' ? errorObj.statusCode : undefined;

            if (statusCode === 410 || statusCode === 404) {
              if (!cleanedDocIds.has(task.docId)) {
                cleanedDocIds.add(task.docId);
                try {
                  await firestore.collection('push_subscriptions').doc(task.docId).delete();
                  expiredCleanedCount++;
                  logger.info('SendTxNotificationsAPI.GET', 'Purged expired subscription doc (410/404)', {
                    docId: task.docId,
                    statusCode,
                  });
                } catch (delErr) {
                  logger.warn('SendTxNotificationsAPI.GET', 'Failed to purge expired doc', { docId: task.docId }, delErr as Error);
                }
              }
            } else if (statusCode === 429) {
              logger.warn('SendTxNotificationsAPI.GET', 'Web Push rate limited (429)', { docId: task.docId });
            } else {
              logger.warn('SendTxNotificationsAPI.GET', 'Web Push send failed', { docId: task.docId, statusCode }, err as Error);
            }
          }
        })
      );
    }

    logger.info('SendTxNotificationsAPI.GET', 'Push notification run finished', {
      targetDate,
      totalNotificationsSent,
      expiredCleanedCount,
      uniqueDevices: deviceSentCount.size,
    });

    return apiSuccess({
      dryRun: false,
      targetDate,
      todayYmdKST,
      txAnalyzedCount: targetTx.length,
      distinctAptsCount: Object.keys(txByApt).length,
      globalHighlightsCount: globalHighlights.length,
      sentCount: totalNotificationsSent,
      cleanedSubscriptionsCount: expiredCleanedCount,
      uniqueDevicesTargeted: deviceSentCount.size,
    }, {
      targetDate,
      sentCount: totalNotificationsSent,
      cleanedSubscriptionsCount: expiredCleanedCount,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('SendTxNotificationsAPI.GET', 'Fatal error during notification cron run', {}, err);
    return apiError('INTERNAL_ERROR', 'Internal Server Error', 500, err.message);
  }
}
