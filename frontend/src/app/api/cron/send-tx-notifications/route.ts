import { NextRequest } from 'next/server';
import { adminDb as db } from '@/lib/firebaseAdmin';
import webpush from 'web-push';
import path from 'path';
import fs from 'fs';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { getConfiguredCronSecret, isAuthorizedCronBearerRequest } from '@/lib/api/cronAuth';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { isValidPushSubscriptionStrict } from '@/lib/push/pushSecurity';
import {
  getDisplayAptName,
  resolveCanonicalAptSlug,
  resolvePushSubscriptionAptAliases,
} from '@/lib/utils/apartmentMapping';
import { CANONICAL_DONG_APT_LIST } from '@/lib/utils/canonicalAptCatalog';
import { getTodayYmdKST } from '@/lib/todayUpdateEvaluator';
import { configureWebPushVapid, getVapidConfig } from '@/lib/push/vapidConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
 * Validates push subscription structure and strict Web Push host allowlist before dispatch.
 */
export function isValidPushSubscription(sub: unknown): sub is PushSubscriptionData {
  return isValidPushSubscriptionStrict(sub);
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
 * Builds a single concise Dongtan-wide daily morning summary payload strictly from real MOLIT sale records.
 */
export interface GlobalDailySummaryPayload {
  title: string;
  body: string;
  url: string;
  totalCount: number;
  distinctAptsCount: number;
  newHighCount: number;
  topAptName: string;
  topCanonicalSlug: string;
}

function resolveReadableAptDisplayName(aptName: string, canonicalSlug: string): string {
  const catalogEntry = CANONICAL_DONG_APT_LIST.find(
    (entry) => entry.txKey === canonicalSlug || entry.rawTxKey === aptName || entry.name === aptName
  );
  return catalogEntry?.name || getDisplayAptName(canonicalSlug) || getDisplayAptName(aptName) || aptName;
}

export function buildGlobalDailySummaryPayload(
  targetTx: TransactionRecord[],
  globalHighlights: TransactionRecord[]
): GlobalDailySummaryPayload | null {
  if (!targetTx || targetTx.length === 0 || !globalHighlights || globalHighlights.length === 0) {
    return null;
  }

  const totalCount = targetTx.length;
  const distinctAptsCount = new Set(targetTx.map((t) => t.aptName).filter(Boolean)).size;
  const marketTxs = targetTx.filter((t) => t.dealType !== '직거래');
  const effectivePool = marketTxs.length > 0 ? marketTxs : targetTx;
  const newHighCount = effectivePool.filter((t) => Boolean(t.isNewHigh)).length;

  const topTx = globalHighlights[0];
  const topCanonicalSlug =
    resolveCanonicalAptSlug(topTx.aptName, { txKey: topTx.txKey, dong: topTx.dong }) || topTx.aptName;
  const topDisplayName = resolveReadableAptDisplayName(topTx.aptName, topCanonicalSlug);
  const pyeongText = topTx.areaPyeong ? `${Math.round(topTx.areaPyeong)}평` : '';
  const floorText = topTx.floor ? `${topTx.floor}층` : '';
  const topDetail = [topDisplayName, pyeongText, floorText, topTx.priceEok].filter(Boolean).join(' ');

  const title =
    newHighCount > 0
      ? `[동탄 실거래] 오늘 매매 ${totalCount}건 · 신고가 ${newHighCount}건`
      : `[동탄 실거래] 오늘 매매 ${totalCount}건 등록`;

  let body: string;
  if (totalCount === 1) {
    body = topTx.isNewHigh ? `신고가: ${topDetail}` : `주요 거래: ${topDetail}`;
  } else if (newHighCount > 0) {
    body =
      distinctAptsCount > 1
        ? `대표 신고가 ${topDetail} 외 ${distinctAptsCount}개 단지 ${totalCount}건`
        : `대표 신고가 ${topDetail} 외 ${totalCount - 1}건`;
  } else {
    body =
      distinctAptsCount > 1
        ? `최고가 ${topDetail} 외 ${distinctAptsCount}개 단지 ${totalCount - 1}건`
        : `최고가 ${topDetail} 외 ${totalCount - 1}건`;
  }

  const url = totalCount === 1 ? `/apartment/${encodeURIComponent(topCanonicalSlug)}` : '/';

  return {
    title,
    body,
    url,
    totalCount,
    distinctAptsCount,
    newHighCount,
    topAptName: topTx.aptName,
    topCanonicalSlug,
  };
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

    // 2. Authorization Verification (strict fail-closed Bearer CRON_SECRET only)
    if (!isAuthorizedCronBearerRequest(req)) {
      if (!getConfiguredCronSecret()) {
        logger.error('SendTxNotificationsAPI.GET', 'CRON_SECRET is not configured — failing closed');
      }
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

    // 5.1 Live Firestore Fallback if static JSON rebuild is still in progress at 07:00 KST
    if (targetTx.length === 0) {
      try {
        const liveSnap = await firestore
          .collection('transactions')
          .where('registeredDate', '==', targetDate)
          .get();
        if (!liveSnap.empty) {
          const liveItems: TransactionRecord[] = [];
          for (const doc of liveSnap.docs) {
            const d = doc.data() as Record<string, unknown>;
            const dealType = String(d.dealType || '매매');
            if (dealType === '전세' || dealType === '월세') continue;
            const cancelDate = String(d.cancelDate || d.cdealDay || '').trim();
            const cdealType = String(d.cdealType || '').trim();
            if (cdealType === 'O' || cdealType === '해제' || (cancelDate && cancelDate !== '-' && cancelDate !== 'null')) continue;

            const priceMan = Number(d.price || 0);
            if (!priceMan || priceMan <= 0) continue;
            const eok = Math.floor(priceMan / 10000);
            const rem = priceMan % 10000;
            const priceEok = eok === 0 ? `${priceMan.toLocaleString()}만` : rem === 0 ? `${eok}억` : `${eok}억 ${rem.toLocaleString()}만`;

            liveItems.push({
              aptName: String(d.aptName || ''),
              txKey: String(d._key || doc.id || ''),
              dong: String(d.dong || ''),
              contractDate: String(d.contractDate || ''),
              registeredDate: String(d.registeredDate || targetDate),
              priceVal: priceMan / 10000,
              priceEok,
              area: Number(d.area || 0),
              areaPyeong: Number(d.areaPyeong || 0),
              floor: Number(d.floor || 0),
              dealType,
              isNewHigh: Boolean(d.isNewHigh),
            });
          }
          if (liveItems.length > 0) {
            targetTx = liveItems;
            logger.info('SendTxNotificationsAPI.GET', 'Loaded today registered transactions from live Firestore fallback', {
              targetDate,
              count: liveItems.length,
            });
          }
        }
      } catch (liveErr) {
        logger.warn('SendTxNotificationsAPI.GET', 'Live Firestore fallback skipped', { targetDate }, liveErr as Error);
      }
    }

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

    // 8. Dispatch Preparation & Persistent Daily Deduplication Invariants
    const deliveredKeys = new Set<string>();
    const deviceSentCount = new Map<string, number>();
    const persistedKeys = new Set<string>();
    const persistedDeviceCounts = new Map<string, number>();
    const MAX_NOTIFICATIONS_PER_DEVICE = 2; // Strict anti-spam capping

    if (!isDryRun) {
      try {
        const logDocRef = firestore.collection('push_dispatch_logs').doc(targetDate) as unknown as {
          get?: () => Promise<{ exists?: boolean; data?: () => Record<string, unknown> | undefined }>;
        };
        if (typeof logDocRef?.get === 'function') {
          const logSnap = await logDocRef.get();
          if (logSnap?.exists && typeof logSnap.data === 'function') {
            const logData = logSnap.data() || {};
            const prevKeys = Array.isArray(logData.deliveredKeys) ? (logData.deliveredKeys as string[]) : [];
            prevKeys.forEach((k) => {
              deliveredKeys.add(k);
              persistedKeys.add(k);
            });
            const prevCounts = (logData.deviceCounts as Record<string, number>) || {};
            Object.entries(prevCounts).forEach(([docId, cnt]) => {
              if (typeof cnt === 'number') {
                deviceSentCount.set(docId, cnt);
                persistedDeviceCounts.set(docId, cnt);
              }
            });
          }
        }
      } catch (dedupReadErr) {
        logger.warn('SendTxNotificationsAPI.GET', 'Skipped persistent deduplication read', { targetDate }, dedupReadErr as Error);
      }
    }

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

    // 8.1 Build tasks for apartment-specific subscribers (matches canonical txKey, spaced displayName, and raw MOLIT aptName)
    for (const aptName of Object.keys(txByApt)) {
      const aptTransactions = txByApt[aptName];
      const sampleTx = aptTransactions[0];
      const aptAliases = resolvePushSubscriptionAptAliases(aptName, {
        txKey: sampleTx?.txKey,
        dong: sampleTx?.dong,
      });

      let subSnapshot;
      if (aptAliases.length > 1) {
        try {
          subSnapshot = await firestore
            .collection('push_subscriptions')
            .where('apts', 'array-contains-any', aptAliases)
            .get();
        } catch {
          subSnapshot = await firestore
            .collection('push_subscriptions')
            .where('apts', 'array-contains', aptName)
            .get();
        }
      } else {
        subSnapshot = await firestore
          .collection('push_subscriptions')
          .where('apts', 'array-contains', aptName)
          .get();
      }

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
          const displayAptName = resolveReadableAptDisplayName(tx.aptName, canonicalTxSlug);
          const pyeongText = tx.areaPyeong ? `${Math.round(tx.areaPyeong)}평 ` : '';
          const floorText = tx.floor ? `${tx.floor}층 ` : '';
          const title = tx.isNewHigh ? '[신고가] D-VIEW 관심단지 실거래' : '[D-VIEW] 관심단지 실거래 등록';
          const body = tx.isNewHigh
            ? `${displayAptName} ${pyeongText}${floorText}${tx.priceEok} 신고가 등록`
            : `${displayAptName} ${pyeongText}${floorText}${tx.priceEok} 매매 실거래 등록`;

          const payload = JSON.stringify({
            title,
            body,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            url: `/apartment/${encodeURIComponent(canonicalTxSlug)}`,
            data: {
              url: `/apartment/${encodeURIComponent(canonicalTxSlug)}`,
              aptName: displayAptName,
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

    // 8.2 Build tasks for global "동탄 전체" subscribers (1 consolidated real-data daily summary per device)
    const globalSummary = buildGlobalDailySummaryPayload(targetTx, globalHighlights);
    if (globalSummary) {
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
        const topTx = globalHighlights[0];
        for (const doc of globalSnapshot.docs) {
          const subData = doc.data() as PushSubscriptionDoc;
          const subscription = subData.subscription;
          if (!isValidPushSubscription(subscription)) continue;

          const count = deviceSentCount.get(doc.id) || 0;
          if (count >= MAX_NOTIFICATIONS_PER_DEVICE) continue;

          // If today only has 1 transaction in all of Dongtan and this device already received
          // an apartment-specific notification for that exact transaction, skip duplicate summary.
          const singleTxKey = `${doc.id}__${topTx.txKey || topTx.aptName}_${topTx.floor}_${topTx.priceEok}`;
          if (targetTx.length === 1 && deliveredKeys.has(singleTxKey)) continue;

          const deliveryKey = `${doc.id}__global_summary_${targetDate}`;
          if (deliveredKeys.has(deliveryKey)) continue;

          const payload = JSON.stringify({
            title: globalSummary.title,
            body: globalSummary.body,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            url: globalSummary.url,
            data: {
              url: globalSummary.url,
              aptName: '동탄 전체',
              targetDate,
              totalCount: globalSummary.totalCount,
              newHighCount: globalSummary.newHighCount,
            },
          });

          dispatchQueue.push({
            docId: doc.id,
            subscription,
            payload,
            deliveryKey,
            recipientType: 'global',
            aptName: '동탄 전체',
            title: globalSummary.title,
            body: globalSummary.body,
          });

          deliveredKeys.add(deliveryKey);
          deviceSentCount.set(doc.id, count + 1);
        }
      }
    }

    // 9. Dispatch Execution: Dry-Run vs Real Transmission
    let totalNotificationsSent = 0;
    let expiredCleanedCount = 0;
    const samplePayloads: Array<{ recipientType: string; aptName: string; title: string; body: string }> = [];
    const vapidSnapshot = getVapidConfig();

    if (isDryRun) {
      logger.info('SendTxNotificationsAPI.GET', '[DRY_RUN] Simulated push dispatch summary', {
        targetDate,
        totalTasksQueued: dispatchQueue.length,
        uniqueDevices: deviceSentCount.size,
        vapidConfigured: vapidSnapshot.isConfigured,
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
        vapidConfigured: vapidSnapshot.isConfigured,
        targetDate,
        todayYmdKST,
        txAnalyzedCount: targetTx.length,
        distinctAptsCount: Object.keys(txByApt).length,
        newHighCount: globalSummary?.newHighCount ?? 0,
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

    const vapidConfig = configureWebPushVapid(webpush);
    if (!vapidConfig.configured) {
      logger.error('SendTxNotificationsAPI.GET', 'VAPID keys are not configured for live dispatch', {
        targetDate,
        reason: vapidConfig.reason,
      });
      return apiError(
        'VAPID_NOT_CONFIGURED',
        'VAPID keys are not configured on server',
        503
      );
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
            persistedKeys.add(task.deliveryKey);
            persistedDeviceCounts.set(task.docId, (persistedDeviceCounts.get(task.docId) || 0) + 1);
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

    if (totalNotificationsSent > 0) {
      try {
        const logDocRef = firestore.collection('push_dispatch_logs').doc(targetDate) as unknown as {
          set?: (data: Record<string, unknown>, opts?: { merge?: boolean }) => Promise<unknown>;
        };
        if (typeof logDocRef?.set === 'function') {
          await logDocRef.set(
            {
              targetDate,
              deliveredKeys: Array.from(persistedKeys),
              deviceCounts: Object.fromEntries(persistedDeviceCounts),
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      } catch (dedupWriteErr) {
        logger.warn('SendTxNotificationsAPI.GET', 'Skipped persistent deduplication write', { targetDate }, dedupWriteErr as Error);
      }
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
