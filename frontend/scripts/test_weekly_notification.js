const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// 1. Firebase Admin 설정
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  : {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'portfolio-dtdls',
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY).replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
    };

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

// mailService Mocking 함수
async function testMail(to, subject, html) {
  try {
    const dataDir = path.resolve(__dirname, '../public/data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const mockEmailPath = path.join(dataDir, 'mock-emails.json');
    let mockEmails = [];
    if (fs.existsSync(mockEmailPath)) {
      try {
        mockEmails = JSON.parse(fs.readFileSync(mockEmailPath, 'utf-8'));
      } catch (err) {
        mockEmails = [];
      }
    }
    const newMockMail = {
      id: 'test_weekly_' + Date.now().toString(36),
      to,
      subject,
      html,
      sentAt: new Date().toISOString(),
    };
    mockEmails.unshift(newMockMail);
    fs.writeFileSync(mockEmailPath, JSON.stringify(mockEmails, null, 2), 'utf-8');
    console.log(`✅ [Weekly Mock Mail Logged] Subject: "${subject}" to ${to}`);
    return true;
  } catch (error) {
    console.error('❌ Weekly Mock Mail Logging Failed:', error);
    return false;
  }
}

async function runTest() {
  const testEmail = 'weekly-tester@dview.co.kr';
  console.log('🏁 Starting weekly report notification system verification...');

  // 1. 테스트 구독자 등록
  console.log('\nStep 1: Ingesting active weekly subscriber into Firestore...');
  const subRef = db.collection('subscriptions').doc(testEmail);
  await subRef.set({
    email: testEmail,
    realtime: false,
    weekly: true,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  console.log(`✅ Weekly subscriber added: ${testEmail}`);

  // 2. 최근 7일 내의 임시 실거래 데이터 주입
  console.log('\nStep 2: Creating temporary transaction records for weekly stats computation...');
  const now = new Date();
  
  // 오늘 날짜 문자열 계산 (YYYYMMDD)
  const formatYmd = (date) => {
    return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  };

  const todayStr = formatYmd(now);
  const yesterdayStr = formatYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));

  const testTx1Key = 'TEMP_TX_WEEKLY_1';
  const testTx2Key = 'TEMP_TX_WEEKLY_2';

  const tx1Ref = db.collection('transactions').doc(testTx1Key);
  const tx2Ref = db.collection('transactions').doc(testTx2Key);

  // 2건의 매매 데이터 주입 (최고가 14.5억, 평균가 계산 예정)
  await tx1Ref.set({
    aptName: '동탄역 롯데캐슬 임시테스트',
    areaPyeong: 34.2,
    area: 84.82,
    price: 145000,
    floor: 25,
    dealType: '매매',
    contractDate: todayStr,
    contractYm: todayStr.slice(0, 6),
    contractDay: todayStr.slice(6, 8)
  });

  await tx2Ref.set({
    aptName: '시범호반베르디움 임시테스트',
    areaPyeong: 33.1,
    area: 84.45,
    price: 75000,
    floor: 9,
    dealType: '매매',
    contractDate: yesterdayStr,
    contractYm: yesterdayStr.slice(0, 6),
    contractDay: yesterdayStr.slice(6, 8)
  });

  console.log('✅ Temporary transaction documents uploaded.');

  // 3. 최근 7일 날짜 컷오프 계산 및 Firestore 쿼리 (Weekly API의 코어 비즈니스 로직 시뮬레이션)
  console.log('\nStep 3: Simulating core Weekly Cron statistic aggregation...');
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  const cutoffDateStr = formatYmd(cutoff);

  const txSnap = await db.collection('transactions')
    .where('contractDate', '>=', cutoffDateStr)
    .get();

  let saleCount = 0;
  let saleSum = 0;
  let highestSalePrice = 0;
  let highestSaleApt = '';
  let highestSaleArea = 0;
  let highestSaleFloor = 0;

  txSnap.forEach((doc) => {
    const d = doc.data();
    // 임시 테스트 단지만 집계하기 위해 필터링하거나 전체 집계 시뮬레이션
    if (doc.id.includes('TEMP_TX_WEEKLY')) {
      const dealType = d.dealType || '매매';
      const price = d.price || 0;

      if (dealType === '매매') {
        saleCount++;
        saleSum += price;
        if (price > highestSalePrice) {
          highestSalePrice = price;
          highestSaleApt = d.aptName || '';
          highestSaleArea = d.areaPyeong || 0;
          highestSaleFloor = d.floor || 0;
        }
      }
    }
  });

  const avgSalePrice = saleCount > 0 ? Math.round(saleSum / saleCount) : 0;
  console.log(`📊 Aggregated Stats:`);
  console.log(` - Total Injected Sales Count: ${saleCount}`);
  console.log(` - Average Price: ${(avgSalePrice / 10000).toFixed(2)}억 (${avgSalePrice.toLocaleString()}만원)`);
  console.log(` - Highest Price Transaction: ${highestSaleApt} (${highestSaleArea}평, ${highestSaleFloor}층) @ ${(highestSalePrice / 10000).toFixed(2)}억`);

  // 4. 주간 리포트 이메일 작성 및 발송
  console.log('\nStep 4: Compiling weekly report HTML mail template...');
  const highestPriceDisplay = `${Math.floor(highestSalePrice / 10000)}억 ${(highestSalePrice % 10000).toLocaleString()}만원`;
  const avgPriceDisplay = `${Math.floor(avgSalePrice / 10000)}억 ${(avgSalePrice % 10000).toLocaleString()}만원`;
  const nowStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  const alertMailHtml = `
    <div style="padding: 20px; font-family: sans-serif; background-color: #f9fafb;">
      <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 16px; padding: 30px;">
        <h2>📊 D-VIEW 주간 동탄 신도시 부동산 리포트 (테스트)</h2>
        <p>기준 일자: ${nowStr}</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        
        <table cellpadding="6" style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="font-weight: bold; color: #6b7280;">신규 등록 거래량</td>
            <td style="font-weight: bold; text-align: right;">${saleCount}건</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="font-weight: bold; color: #6b7280;">평균 매매 가격</td>
            <td style="font-weight: bold; text-align: right; color: #3b82f6;">${avgPriceDisplay}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="font-weight: bold; color: #6b7280;">최고가 거래 단지</td>
            <td style="font-weight: bold; text-align: right;">${highestSaleApt} (${highestSaleArea}평, ${highestSaleFloor}층)</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="font-weight: bold; color: #6b7280;">최고 거래가</td>
            <td style="font-weight: bold; text-align: right; color: #ef4444;">${highestPriceDisplay}</td>
          </tr>
        </table>
        
        <p style="font-size: 12px; color: #9ca3af; margin-top: 30px;">
          본 메일은 주간 리포트 알림 신청자 대상 발송 시뮬레이션 메일입니다.
        </p>
      </div>
    </div>
  `;

  await testMail(testEmail, `[D-VIEW] 동탄 부동산 주간 종합 리포트 (${nowStr} 기준)`, alertMailHtml);
  console.log('✅ Weekly newsletter dispatch simulated.');

  // 5. 테스트 데이터 삭제 및 클린업
  console.log('\nStep 5: Performing database cleanup (deleting temporary users & transactions)...');
  await subRef.delete();
  await tx1Ref.delete();
  await tx2Ref.delete();
  console.log('✅ Temporary Firestore documents wiped out.');

  console.log('\n🎉 Weekly report notification test successfully finished!');
}

runTest().catch(err => {
  console.error('❌ Weekly report notification test failed:', err);
});
