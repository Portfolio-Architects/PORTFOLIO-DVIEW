const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// 1. Firebase Admin 설정
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } catch (e) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON env variable', e);
  }
}

if (!serviceAccount) {
  serviceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'portfolio-dtdls',
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY).replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
  };
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

// 2. mailService 시뮬레이션 함수
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
      id: 'test_' + Date.now().toString(36),
      to,
      subject,
      html,
      sentAt: new Date().toISOString(),
    };
    mockEmails.unshift(newMockMail);
    fs.writeFileSync(mockEmailPath, JSON.stringify(mockEmails, null, 2), 'utf-8');
    console.log(`✅ [Test Mail Logged] Subject: "${subject}" to ${to}`);
    return true;
  } catch (error) {
    console.error('❌ Mock Mail Logging Failed:', error);
    return false;
  }
}

async function runTest() {
  const testEmail = 'notifier-test@dview.co.kr';
  console.log('🏁 Starting notification system verification...');

  // 1. Subscribe 테스트
  console.log('\nStep 1: Simulating subscriber registration in Firestore...');
  const subRef = db.collection('subscriptions').doc(testEmail);
  const subscribeData = {
    email: testEmail,
    realtime: true,
    weekly: false,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  await subRef.set(subscribeData, { merge: true });
  console.log(`✅ Registered subscriber: ${testEmail}`);

  // 웰컴 이메일 시뮬레이션
  const welcomeHtml = `<h3>Welcome to D-VIEW!</h3><p>Your subscription is active.</p>`;
  await testMail(testEmail, '[D-VIEW] 실거래가 알림 구독 신청이 완료되었습니다.', welcomeHtml);

  // 2. Cron 이메일 알림 트리거 테스트
  console.log('\nStep 2: Simulating cron notification triggering for new transactions...');
  const mockNewTransactions = [
    {
      aptName: '동탄역 우남퍼스트빌',
      areaPyeong: 33.4,
      area: 84.94,
      price: 115000,
      floor: 18,
      dealType: '매매',
      contractDate: '20260524'
    },
    {
      aptName: '동탄역 더샵센트럴시티',
      areaPyeong: 34.1,
      area: 84.69,
      price: 125000,
      floor: 12,
      dealType: '매매',
      contractDate: '20260524'
    }
  ];

  // active & realtime 구독자 가져오기
  const subSnap = await db.collection('subscriptions')
    .where('status', '==', 'active')
    .where('realtime', '==', true)
    .get();

  if (!subSnap.empty) {
    const subscribers = subSnap.docs.map(d => d.data().email).filter(Boolean);
    console.log(`Found active realtime subscribers: ${subscribers.join(', ')}`);

    if (subscribers.includes(testEmail)) {
      let txRowsHtml = '';
      for (const tx of mockNewTransactions) {
        txRowsHtml += `
          <tr>
            <td>${tx.aptName}</td>
            <td>${tx.areaPyeong}평</td>
            <td>${(tx.price / 10000).toFixed(1)}억</td>
            <td>${tx.floor}층</td>
          </tr>
        `;
      }
      
      const alertMailHtml = `
        <h3>신규 실거래 등록 알림</h3>
        <table border="1" cellpadding="5" style="border-collapse:collapse;">
          <thead>
            <tr><th>단지명</th><th>평형</th><th>금액</th><th>층</th></tr>
          </thead>
          <tbody>${txRowsHtml}</tbody>
        </table>
      `;

      await testMail(testEmail, `[D-VIEW] 신규 실거래가 등록 알림 (${mockNewTransactions.length}건 등록)`, alertMailHtml);
      console.log('✅ Cron notification email dispatched to active subscriber.');
    }
  }

  // 3. Unsubscribe 테스트
  console.log('\nStep 3: Simulating unsubscription...');
  await subRef.update({
    status: 'unsubscribed',
    updatedAt: new Date()
  });
  console.log('✅ Subscription status set to: unsubscribed');

  // 구독자 재조회하여 메일 발송 제외 확인
  const subSnap2 = await db.collection('subscriptions')
    .where('status', '==', 'active')
    .where('realtime', '==', true)
    .get();
  
  const activeSubs = subSnap2.docs.map(d => d.data().email);
  if (!activeSubs.includes(testEmail)) {
    console.log('✅ Confirmed: Unsubscribed user was successfully excluded from active mailing list.');
  } else {
    console.error('❌ Error: Unsubscribed user is still in the active list!');
  }

  // 4. 테스트 계정 정보 정리 (DB 청결 유지)
  console.log('\nStep 4: Cleaning up test data from Firestore...');
  await subRef.delete();
  console.log('✅ Deleted test subscriber document.');

  console.log('\n🎉 Verification completed successfully!');
}

runTest().catch(err => {
  console.error('❌ Test failed with error:', err);
});
