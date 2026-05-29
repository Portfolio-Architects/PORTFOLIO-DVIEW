const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local', override: true });

const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
let serviceAccount;

if (fs.existsSync(serviceAccountPath)) {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
} else {
  const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (envKey) {
    serviceAccount = JSON.parse(envKey);
  }
}

if (!admin.apps.length) {
  const config = serviceAccount ? { credential: admin.credential.cert(serviceAccount) } : { projectId: 'portfolio-dtdls' };
  admin.initializeApp(config);
}

const db = admin.firestore();

async function check() {
  console.log('Fetching all sale transactions for 힐스테이트동탄역...');
  const snapshot = await db.collection('transactions')
    .where('aptName', '==', '힐스테이트동탄역')
    .get();

  const txs = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.dealType !== '전세' && data.dealType !== '월세') {
      txs.push({
        ...data,
        id: doc.id
      });
    }
  });

  console.log(`Found ${txs.length} sale transactions.`);

  // 1. Sort by date ascending
  const sortedTxs = txs.sort((a, b) => {
    const d1 = parseInt(a.contractYm + String(a.contractDay).padStart(2, '0'));
    const d2 = parseInt(b.contractYm + String(b.contractDay).padStart(2, '0'));
    return d1 - d2;
  });

  // 2. Filter by area 54.5508 (rounds to 55)
  const group = sortedTxs.filter(t => Math.round(t.area) === 55);
  console.log(`Group of area 55 has ${group.length} transactions.`);

  // Find index of the May 23rd transaction (price 40000)
  const idx = group.findIndex(t => t.contractYm === '202605' && t.contractDay === '23' && t.price === 40000);
  if (idx === -1) {
    console.log('May 23rd transaction not found in group!');
    return;
  }

  const targetTx = group[idx];
  console.log(`\nTarget Transaction: ${targetTx.contractDate}, Floor: ${targetTx.floor}, Price: ${targetTx.price}`);

  // Get window
  const windowTxs = group.slice(Math.max(0, idx - 5), Math.min(group.length, idx + 6));
  console.log('\nWindow Transactions:');
  windowTxs.forEach((t, i) => {
    console.log(`  [${i}] Date: ${t.contractDate}, Floor: ${t.floor}, Price: ${t.price}`);
  });

  const prices = windowTxs.map(wt => wt.price);
  const p = targetTx.price;

  const mean = prices.reduce((sum, val) => sum + val, 0) / prices.length;
  const variance = prices.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  const margin = 2 * Math.max(stdDev, mean * 0.05);
  const diff = Math.abs(p - mean);
  const isKept = diff <= margin;

  console.log(`\nStatistics:`);
  console.log(`  Mean: ${mean.toFixed(2)}`);
  console.log(`  StdDev: ${stdDev.toFixed(2)}`);
  console.log(`  Margin (2 * max(stdDev, mean*0.05)): ${margin.toFixed(2)}`);
  console.log(`  Diff (|Price - Mean|): ${diff.toFixed(2)}`);
  console.log(`  Condition (Diff <= Margin): ${isKept ? 'KEEP' : 'FILTER OUT'}`);
}

check().catch(console.error);
