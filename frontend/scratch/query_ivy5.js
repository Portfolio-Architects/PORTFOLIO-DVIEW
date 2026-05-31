const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

let serviceAccount;
const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (envKey) {
  serviceAccount = JSON.parse(envKey);
} else {
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

async function main() {
  const db = admin.firestore();
  console.log('Querying transactions for Ivy Park 5.0...');

  // Search by normal, normalized or contains
  const queryNames = [
    '동탄역 반도유보라 아이비파크 5.0',
    '동탄역 반도유보라 아이비파크5.0',
    '동탄역반도유보라아이비파크5.0',
    '동탄역 반도유보라 아이비파크 5.0 아파트'
  ];

  console.log('--- Checking collection "transactions" ---');
  for (const name of queryNames) {
    const snap = await db.collection('transactions')
      .where('aptName', '==', name)
      .get();
    if (snap.size > 0) {
      console.log(`Found ${snap.size} docs for aptName: "${name}"`);
      snap.forEach(doc => {
        const d = doc.data();
        if (d.contractYm === '202605') {
          console.log(`Date: ${d.contractYm}${d.contractDay}, Price: ${d.price}, Deposit: ${d.deposit}, Floor: ${d.floor}, DealType: ${d.dealType}, CancelDate: ${d.cancelDate}, ReqGb: ${d.reqGb}`);
        }
      });
    }
  }

  console.log('--- Checking collection "transactionSync" ---');
  for (const name of queryNames) {
    const snap1 = await db.collection('transactionSync')
      .where('apartmentName', '==', name)
      .get();
    if (snap1.size > 0) {
      console.log(`Found ${snap1.size} docs (apartmentName) for name: "${name}"`);
      snap1.forEach(doc => {
        const d = doc.data();
        if (d.contractYm === '202605') {
          console.log(`Date: ${d.contractYm}${d.contractDay}, Price: ${d.price}, Deposit: ${d.deposit}, Floor: ${d.floor}, DealType: ${d.dealType}, CancelDate: ${d.cancelDate}, ReqGb: ${d.reqGb}, rnuYn: ${d.rnuYn}`);
        }
      });
    }

    const snap2 = await db.collection('transactionSync')
      .where('aptName', '==', name)
      .get();
    if (snap2.size > 0) {
      console.log(`Found ${snap2.size} docs (aptName) for name: "${name}"`);
      snap2.forEach(doc => {
        const d = doc.data();
        if (d.contractYm === '202605') {
          console.log(`Date: ${d.contractYm}${d.contractDay}, Price: ${d.price}, Deposit: ${d.deposit}, Floor: ${d.floor}, DealType: ${d.dealType}, CancelDate: ${d.cancelDate}, ReqGb: ${d.reqGb}, rnuYn: ${d.rnuYn}`);
        }
      });
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
