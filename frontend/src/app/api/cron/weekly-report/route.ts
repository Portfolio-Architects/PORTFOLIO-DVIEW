import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebaseAdmin';
import { sendMail } from '@/lib/mailService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Cron 호출 보안 검사
    const authHeader = request.headers.get('authorization');
    if (
      process.env.NODE_ENV !== 'development' &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Firebase DB not initialized' }, { status: 500 });
    }

    // 2. 최근 7일 날짜 컷오프(YYYYMMDD) 계산
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    const year = cutoff.getFullYear();
    const month = String(cutoff.getMonth() + 1).padStart(2, '0');
    const day = String(cutoff.getDate()).padStart(2, '0');
    const cutoffDateStr = `${year}${month}${day}`;

    console.log(`[WEEKLY-REPORT] Fetching transactions on or after ${cutoffDateStr}`);

    // 3. 최근 7일 내의 거래 데이터 가져오기
    const txSnap = await db.collection('transactions')
      .where('contractDate', '>=', cutoffDateStr)
      .get();

    let saleCount = 0;
    let jeonseCount = 0;
    let rentCount = 0;
    let saleSum = 0;
    let highestSalePrice = 0;
    let highestSaleApt = '';
    let highestSaleArea = 0;
    let highestSaleFloor = 0;

    txSnap.forEach((doc) => {
      const d = doc.data();
      const dealType = d.dealType || '매매';
      const price = d.price || 0;
      const deposit = d.deposit || 0;
      const monthlyRent = d.monthlyRent || 0;

      if (dealType === '매매') {
        saleCount++;
        saleSum += price;
        if (price > highestSalePrice) {
          highestSalePrice = price;
          highestSaleApt = d.aptName || '';
          highestSaleArea = d.areaPyeong || 0;
          highestSaleFloor = d.floor || 0;
        }
      } else if (dealType === '전세') {
        jeonseCount++;
      } else if (dealType === '월세') {
        rentCount++;
      }
    });

    const totalTxCount = saleCount + jeonseCount + rentCount;
    const avgSalePrice = saleCount > 0 ? Math.round(saleSum / saleCount) : 0;

    // 4. 활성 주간 리포트 구독자 리스트 쿼리
    const subSnap = await db.collection('subscriptions')
      .where('status', '==', 'active')
      .where('weekly', '==', true)
      .get();

    const subscribers = subSnap.docs.map(d => d.data().email).filter(Boolean);

    console.log(`[WEEKLY-REPORT] Stats: Total Tx: ${totalTxCount}, Subscribers count: ${subscribers.length}`);

    // 5. 발송 대상이 있고, 해당 주간에 거래가 존재할 때 메일 발송
    if (subscribers.length > 0 && totalTxCount > 0) {
      const nowStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
      
      const highestPriceDisplay = highestSalePrice > 0 
        ? `${Math.floor(highestSalePrice / 10000) > 0 ? Math.floor(highestSalePrice / 10000) + '억 ' : ''}${(highestSalePrice % 10000).toLocaleString()}만원`
        : '없음';

      const avgPriceDisplay = avgSalePrice > 0 
        ? `${Math.floor(avgSalePrice / 10000) > 0 ? Math.floor(avgSalePrice / 10000) + '억 ' : ''}${(avgSalePrice % 10000).toLocaleString()}만원`
        : '없음';

      // 주간 종합 리포트 HTML 본문 디자인
      const reportHtmlBase = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f9fafb; color: #1f2937; line-height: 1.6;">
          <div style="background-color: #ffffff; padding: 40px; border-radius: 28px; border: 1px solid #f1f5f9; box-shadow: 0 4px 10px rgba(0,0,0,0.03);">
            
            <!-- Header -->
            <div style="margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 15px;">
              <span style="font-size: 18px; font-weight: 900; color: #3b82f6; letter-spacing: -0.5px;">D-VIEW 데이터 랩</span>
              <span style="font-size: 12px; color: #94a3b8; font-weight: 500;">주간 부동산 동향</span>
            </div>

            <!-- Title -->
            <h2 style="font-size: 21px; font-weight: 900; color: #111827; margin-top: 0; margin-bottom: 8px; letter-spacing: -0.5px;">
              📊 동탄 부동산 주간 종합 리포트
            </h2>
            <p style="font-size: 13px; color: #64748b; margin-bottom: 30px; line-height: 1.5;">
              ${nowStr} 기준, 최근 7일 동안 감지된 동탄 신도시 부동산 거래 데이터 핵심 분석 리포트입니다.
            </p>

            <!-- Dashboard Card -->
            <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 20px; padding: 24px; margin-bottom: 28px;">
              <h3 style="font-size: 14px; font-weight: 800; color: #334155; margin-top: 0; margin-bottom: 15px; border-left: 3px solid #3b82f6; padding-left: 8px;">Weekly Market Snapshot</h3>
              
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; justify-content: space-between; font-size: 13px;">
                  <span style="color: #64748b;">신규 등록 거래량</span>
                  <span style="font-weight: 700; color: #1e293b;">총 ${totalTxCount}건 (매매 ${saleCount} / 전세 ${jeonseCount} / 월세 ${rentCount})</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 13px; border-top: 1px dashed #e2e8f0; padding-top: 12px;">
                  <span style="color: #64748b;">매매 평균 거래가</span>
                  <span style="font-weight: 700; color: #3b82f6;">${avgPriceDisplay}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 13px; border-top: 1px dashed #e2e8f0; padding-top: 12px;">
                  <span style="color: #64748b;">최고가 매매 단지</span>
                  <span style="font-weight: 700; color: #1e293b;">${highestSaleApt ? `${highestSaleApt} (${highestSaleArea}평, ${highestSaleFloor}층)` : '해당 없음'}</span>
                </div>
                ${highestSalePrice > 0 ? `
                <div style="display: flex; justify-content: space-between; font-size: 13px;">
                  <span style="color: #64748b;">최고가 금액</span>
                  <span style="font-weight: 700; color: #ef4444;">${highestPriceDisplay}</span>
                </div>
                ` : ''}
              </div>
            </div>

            <!-- Insights -->
            <div style="margin-bottom: 30px;">
              <h3 style="font-size: 14px; font-weight: 800; color: #334155; margin-top: 0; margin-bottom: 12px;">💡 주간 마켓 한줄 분석</h3>
              <p style="font-size: 13px; color: #475569; margin: 0; line-height: 1.6; word-break: keep-all;">
                이번 주 동탄 신도시 거래량은 총 ${totalTxCount}건으로 집계되었습니다. 
                ${saleCount > 0 ? `매매 평균 가격은 ${avgPriceDisplay} 선을 형성하였으며, ` : ''} 
                전세 대기 수요의 유입으로 인해 임대차 거래가 꾸준한 활성도를 띄고 있습니다. 
                더욱 자세한 시세 변화 그래프와 평형별 트렌드는 D-VIEW 웹사이트의 '데이터 랩'에서 상시로 확인해 보실 수 있습니다.
              </p>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin-bottom: 35px; margin-top: 20px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'}" style="background-color: #3b82f6; color: white; padding: 14px 30px; border-radius: 14px; text-decoration: none; font-size: 13px; font-weight: 800; display: inline-block; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.2); transition: background-color 0.2s;">D-VIEW 대시보드 바로가기</a>
            </div>

            <!-- Footer -->
            <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.6;">
              본 메일은 D-VIEW 주간 리포트 알림 구독자분들께 발송되는 정보성 메일입니다.<br />
              알림을 원치 않으시면 언제든지 아래 링크를 통해 구독을 해지해 주십시오.<br />
              <a href="UNSUBSCRIBE_LINK_PLACEHOLDER" style="color: #64748b; text-decoration: underline; font-weight: 600; display: inline-block; margin-top: 6px;">[주간 리포트 구독 해지하기]</a>
            </div>

          </div>
        </div>
      `;

      // 각 구독자별로 메일 발송 (구독해지 링크 주입)
      for (const email of subscribers) {
        const unsubscribeLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'}/api/unsubscribe?email=${encodeURIComponent(email)}`;
        const personalizedHtml = reportHtmlBase.replace('UNSUBSCRIBE_LINK_PLACEHOLDER', unsubscribeLink);

        await sendMail({
          to: email,
          subject: `[D-VIEW] 동탄 부동산 주간 종합 리포트 (${nowStr} 기준)`,
          html: personalizedHtml,
        });
      }
    }

    return NextResponse.json({
      success: true,
      subscribersCount: subscribers.length,
      txCount: totalTxCount,
      stats: {
        saleCount,
        jeonseCount,
        rentCount,
        averagePrice: avgSalePrice,
        highestPrice: highestSalePrice,
        highestApt: highestSaleApt
      }
    });

  } catch (error: any) {
    console.error('Weekly Report Error:', error);
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
