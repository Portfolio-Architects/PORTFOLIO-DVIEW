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
  console.log('Fetching all sale transactions for "동탄역 반도유보라 아이비파크5.0" to calculate IQR...');

  const snap = await db.collection('transactions')
    .where('aptName', '==', '동탄역 반도유보라 아이비파크5.0')
    .get();

  const prices = [];
  const records = [];

  snap.forEach(doc => {
    const d = doc.data();
    const isRent = d.dealType === '전세' || d.dealType === '월세';
    if (!isRent) {
      const areaKey = Math.round(d.area || 0);
      if (areaKey === 60) {
        prices.push(d.price);
        records.push({
          date: `${d.contractYm}${String(d.contractDay).padStart(2, '0')}`,
          price: d.price,
          floor: d.floor
        });
      }
    }
  });

  // Sort prices
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const count = sortedPrices.length;

  const getPercentile = (arr, val) => {
    if (arr.length === 0) return 0;
    const idx = (arr.length - 1) * val;
    const base = Math.floor(idx);
    const rest = idx - base;
    if (arr[base + 1] !== undefined) {
      return arr[base] + rest * (arr[base + 1] - arr[base]);
    } else {
      return arr[base];
    }
  };

  const q1 = getPercentile(sortedPrices, 0.25);
  const q3 = getPercentile(sortedPrices, 0.75);
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;

  console.log(`Total 24평 Sales Count: ${count}`);
  console.log(`Sorted Prices:`, sortedPrices.slice(0, 30), '...', sortedPrices.slice(-15));
  console.log(`Q1 (25th): ${q1}`);
  console.log(`Q3 (75th): ${q3}`);
  console.log(`IQR: ${iqr}`);
  console.log(`IQR Bounds: lower=${lower}, upper=${upper}`);

  console.log('\nRecent 24평 Sales:');
  records.sort((a, b) => b.date.localeCompare(a.date));
  records.slice(0, 15).forEach(r => {
    const isOut = r.price < lower || r.price > upper;
    console.log(`Date: ${r.date}, Price: ${r.price} (${r.price/10000}억), Floor: ${r.floor}층, Outlier: ${isOut}`);
  });

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
