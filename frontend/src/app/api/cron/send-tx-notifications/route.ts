import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebaseAdmin';
import webpush from 'web-push';
import path from 'path';
import fs from 'fs';
import { logger } from '@/lib/services/logger';

export const dynamic = 'force-dynamic';

// Initialize web-push VAPID details
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BJfvp3-MGu6cXDWL2GGKO019MjQhLFSwk1zvAIo8QgX31bfCwfjOHHr34iJcGYnhxpJBCsPoXeG6CAXql9KR9Xg';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'YCeNPk2VFyunF4yNgdtqThe87T4BCyrsTlPS18K9m7Q';

try {
  webpush.setVapidDetails(
    'mailto:admin@dview.kr',
    vapidPublicKey,
    vapidPrivateKey
  );
} catch (err) {
  logger.error('SendTxNotificationsAPI', 'Failed to set VAPID details', {}, err as Error);
}

interface Transaction {
  aptName: string;
  contractDate: string;
  priceEok: string;
  areaPyeong: number;
  floor: number;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const isDebug = url.searchParams.get('debug') === 'true';
    const forceDate = url.searchParams.get('date'); // Format: YYYYMMDD
    
    // Security check: CRON_SECRET verification
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dview-default-cron-secret-2026';
    const host = req.headers.get('host') || '';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');

    if (!isLocal && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('SendTxNotificationsAPI.GET', 'Unauthorized access attempt blocked');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!db) {
      logger.error('SendTxNotificationsAPI.GET', 'Firebase Admin DB not initialized');
      return NextResponse.json({ error: 'Database uninitialized' }, { status: 500 });
    }

    // 1. Calculate target contract date (Yesterday KST)
    const kstOffset = 9 * 60 * 60 * 1000;
    const nowKst = new Date(Date.now() + kstOffset);
    const yesterdayKst = new Date(nowKst.getTime() - 24 * 60 * 60 * 1000);
    
    const yyyy = yesterdayKst.getFullYear();
    const mm = String(yesterdayKst.getMonth() + 1).padStart(2, '0');
    const dd = String(yesterdayKst.getDate()).padStart(2, '0');
    const defaultTargetDate = `${yyyy}${mm}${dd}`;

    const targetDate = forceDate || defaultTargetDate;
    logger.info('SendTxNotificationsAPI.GET', 'Scanning transactions', { targetDate, isDebug });

    // 2. Load recent transactions from local JSON storage
    const transactionsPath = path.join(process.cwd(), 'public/data/recent-transactions.json');
    if (!fs.existsSync(transactionsPath)) {
      logger.error('SendTxNotificationsAPI.GET', 'recent-transactions.json path not found', { path: transactionsPath });
      return NextResponse.json({ error: 'Transactions data file not found' }, { status: 404 });
    }

    const rawData = fs.readFileSync(transactionsPath, 'utf-8');
    const allTx: Transaction[] = JSON.parse(rawData);

    // 3. Filter transactions matching targetDate
    // If debug=true and no date specified, fallback to taking the last 3 transactions as dry-run mock target
    let targetTx = allTx.filter(t => t.contractDate === targetDate);
    
    if (targetTx.length === 0 && isDebug && !forceDate) {
      targetTx = allTx.slice(0, 3);
      logger.info('SendTxNotificationsAPI.GET', 'No transactions found for date. Debug mode active: using fallback slice', { count: targetTx.length });
    }

    if (targetTx.length === 0) {
      logger.info('SendTxNotificationsAPI.GET', 'No new transactions to notify', { targetDate });
      return NextResponse.json({ success: true, message: 'No new transactions found', sentCount: 0 });
    }

    // Group transactions by apartment complex to prevent duplicate notifications to the same app instance
    const txByApt: Record<string, Transaction[]> = {};
    for (const tx of targetTx) {
      if (!txByApt[tx.aptName]) {
        txByApt[tx.aptName] = [];
      }
      txByApt[tx.aptName].push(tx);
    }

    let totalNotificationsSent = 0;
    let expiredCleanedCount = 0;

    // 4. Query subscriptions and send notifications
    for (const aptName of Object.keys(txByApt)) {
      const aptTransactions = txByApt[aptName];
      
      // Get all active subscriptions listening to this apartment complex
      const subSnapshot = await db.collection('push_subscriptions')
        .where('apts', 'array-contains', aptName)
        .get();

      if (subSnapshot.empty) {
        continue;
      }

      logger.info('SendTxNotificationsAPI.GET', `Found listeners for complex`, { aptName, listenerCount: subSnapshot.size });

      for (const doc of subSnapshot.docs) {
        const subData = doc.data();
        const subscription = subData.subscription;

        if (!subscription || !subscription.endpoint) {
          continue;
        }

        // Send a notification for each new transaction (or summarize if multiple)
        for (const tx of aptTransactions) {
          const payload = JSON.stringify({
            title: '🔔 DVIEW 실거래가 알림',
            body: `${tx.aptName} ${Math.round(tx.areaPyeong)}평형 ${tx.floor}층이 ${tx.priceEok}에 실거래 등록되었습니다!`,
            url: `/apartment/${encodeURIComponent(tx.aptName)}`
          });

          try {
            await webpush.sendNotification(subscription, payload);
            totalNotificationsSent++;
          } catch (err: unknown) {
            // If subscription has expired or is no longer active (410 Gone or 404 Not Found), clean it up
            const hasStatusCode = err && typeof err === 'object' && 'statusCode' in err;
            const statusCode = hasStatusCode ? (err as Record<string, unknown>).statusCode : undefined;
            if (statusCode === 410 || statusCode === 404) {
              await db.collection('push_subscriptions').doc(doc.id).delete();
              expiredCleanedCount++;
            } else {
              logger.warn('SendTxNotificationsAPI.GET', 'Web Push trigger encountered warning', { docId: doc.id, statusCode }, err);
            }
          }
        }
      }
    }

    logger.info('SendTxNotificationsAPI.GET', 'Cron notification run finished', { 
      totalNotificationsSent, 
      expiredCleanedCount 
    });

    return NextResponse.json({ 
      success: true, 
      targetDate, 
      txAnalyzedCount: targetTx.length,
      sentCount: totalNotificationsSent,
      cleanedSubscriptionsCount: expiredCleanedCount
    });

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('SendTxNotificationsAPI.GET', 'Fatal error during notification cron job', {}, err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
