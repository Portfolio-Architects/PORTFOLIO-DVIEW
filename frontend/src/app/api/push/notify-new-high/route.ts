import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebaseAdmin';
import webpush from 'web-push';
import { logger } from '@/lib/services/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Firebase Admin and VAPID Keys Check
    if (!db) {
      logger.error('NotifyNewHighAPI.POST', 'Firebase Admin not initialized');
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }
    
    const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
    const privateVapidKey = process.env.VAPID_PRIVATE_KEY || '';
    
    if (!publicVapidKey || !privateVapidKey) {
      logger.warn('NotifyNewHighAPI.POST', 'VAPID keys not configured in env.');
      return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 });
    }
    
    webpush.setVapidDetails(
      'mailto:support@dongtanview.com',
      publicVapidKey,
      privateVapidKey
    );

    // 2. Query transactions from the past 3 days (accommodates weekends and sync lag)
    const now = new Date();
    const threeDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3);
    const dateLimitStr = `${threeDaysAgo.getFullYear()}${String(threeDaysAgo.getMonth() + 1).padStart(2, '0')}${String(threeDaysAgo.getDate()).padStart(2, '0')}`;

    const txSnap = await db.collection('transactions')
      .where('dealType', '==', '매매')
      .where('contractDate', '>=', dateLimitStr)
      .get();

    if (txSnap.empty) {
      logger.info('NotifyNewHighAPI.POST', 'No recent transactions to check');
      return NextResponse.json({ success: true, message: 'No recent transactions to check' });
    }

    const recentTxs = txSnap.docs.map(doc => doc.data());
    const newHighs: any[] = [];

    // 3. Determine if each transaction is a "New High" (historically highest price for its specific size)
    for (const tx of recentTxs) {
      const { aptName, area, price, contractDate, floor } = tx;
      if (!aptName || !area || !price) continue;

      // Query historical transactions for the same complex and unit size, sorted by price descending
      const historySnap = await db.collection('transactions')
        .where('dealType', '==', '매매')
        .where('aptName', '==', aptName)
        .where('area', '==', area)
        .orderBy('price', 'desc')
        .limit(5)
        .get();

      if (historySnap.empty) continue;

      const history = historySnap.docs.map(doc => doc.data());
      
      // If this transaction is currently the highest entry in history
      const isCurrentTxHighest = 
         history[0].contractDate === contractDate && 
         history[0].price === price && 
         history[0].floor === floor;
      
      if (isCurrentTxHighest) {
        let isNewHigh = false;
        let delta = 0;

        if (history.length === 1) {
          isNewHigh = true; // First transaction registered is naturally a new high
        } else {
          // Find the previous record that is NOT the current transaction
          const previousHighest = history.find(h => 
            !(h.contractDate === contractDate && h.price === price && h.floor === floor)
          );
          if (previousHighest && price > previousHighest.price) {
            isNewHigh = true;
            delta = price - previousHighest.price;
          }
        }

        if (isNewHigh) {
          const pyeong = Math.round(area * 0.3025);
          newHighs.push({
            aptName,
            pyeong,
            price,
            delta,
            floor,
            area
          });
        }
      }
    }

    if (newHighs.length === 0) {
      logger.info('NotifyNewHighAPI.POST', 'No new high transactions detected');
      return NextResponse.json({ success: true, message: 'No new high transactions detected' });
    }

    // 4. Select the transaction with the highest price gain (delta) as the main notification
    newHighs.sort((a, b) => b.delta - a.delta);
    const mainHigh = newHighs[0];

    const eok = Math.floor(mainHigh.price / 10000);
    const rem = mainHigh.price % 10000;
    const priceText = `${eok > 0 ? eok + '억' : ''}${rem > 0 ? rem.toLocaleString() + '만' : ''}`;
    
    const deltaEok = Math.floor(mainHigh.delta / 10000);
    const deltaRem = mainHigh.delta % 10000;
    const deltaText = mainHigh.delta > 0 
      ? `(이전 최고가 대비 ${deltaEok > 0 ? deltaEok + '억 ' : ''}${deltaRem > 0 ? deltaRem.toLocaleString() + '만' : ''} 상승!)`
      : '(단지 최초 거래 등록)';

    // 5. Query all push subscriptions
    const subsSnap = await db.collection('push_subscriptions').get();
    
    if (subsSnap.empty) {
      logger.info('NotifyNewHighAPI.POST', 'No push subscribers found', { newHighsDetected: newHighs.length });
      return NextResponse.json({ 
        success: true, 
        message: 'No push subscribers found', 
        newHighsDetected: newHighs.length 
      });
    }

    const notificationPayload = JSON.stringify({
      title: `🛎️ D-VIEW: [${mainHigh.aptName}] ${mainHigh.pyeong}평 ${priceText} 신고가 경신!`,
      body: `실거래가 등록 알림 ${deltaText}. 평형별 입지 분석과 적정 가치를 지금 확인하세요.`,
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://dongtanview.com'}/#apt=${encodeURIComponent(mainHigh.aptName)}`
    });

    let sentCount = 0;
    const promises = subsSnap.docs.map(async (doc) => {
      const data = doc.data();
      const sub = data.subscription;
      try {
        await webpush.sendNotification(sub, notificationPayload);
        sentCount++;
      } catch (err: any) {
        logger.error('NotifyNewHighAPI.POST', 'Failed to send push notification to endpoint', { endpoint: sub.endpoint, statusCode: err.statusCode }, err);
        // Clean up invalid or expired subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
          await doc.ref.delete();
          logger.info('NotifyNewHighAPI.POST', 'Deleted expired subscription', { docId: doc.id });
        }
      }
    });

    await Promise.all(promises);

    logger.info('NotifyNewHighAPI.POST', 'New high notification process completed', { sentCount, newHighsDetected: newHighs.length, notifiedApt: mainHigh.aptName });
    return NextResponse.json({
      success: true,
      sentCount,
      newHighsDetected: newHighs.length,
      notifiedApt: mainHigh.aptName
    });
  } catch (error: any) {
    logger.error('NotifyNewHighAPI.POST', 'Notify New High Error', {}, error);
    return NextResponse.json({ error: 'Failed to process new high notification' }, { status: 500 });
  }
}

