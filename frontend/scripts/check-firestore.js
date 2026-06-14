const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'portfolio-dtdls';

let serviceAccount;
const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');

if (fs.existsSync(serviceAccountPath)) {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
} else if (envKey) {
  serviceAccount = JSON.parse(envKey);
} else if (privateKey && clientEmail) {
  serviceAccount = {
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
  };
}

if (!admin.apps.length) {
  const config = serviceAccount ? { credential: admin.credential.cert(serviceAccount) } : { projectId };
  admin.initializeApp(config);
}

async function check() {
  const db = admin.firestore();
  console.log("Fetching transactions from the last 7 days...");
  
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const y = sevenDaysAgo.getFullYear();
  const m = String(sevenDaysAgo.getMonth() + 1).padStart(2, '0');
  const d = String(sevenDaysAgo.getDate()).padStart(2, '0');
  const cutoffDateStr = `${y}${m}${d}`; // YYYYMMDD
  
  console.log(`Cutoff date: ${cutoffDateStr}`);
  
  const snap = await db.collection('transactions')
    .where('contractDate', '>=', cutoffDateStr)
    .get();
  
  console.log(`Fetched ${snap.size} recent documents.`);
  
  snap.docs.forEach(doc => {
    const d = doc.data();
    // 11억 (price: 110000) 이거나 floor: 9 인 거래 필터링
    if (d.price === 110000 && d.floor === 9) {
      console.log("MATCHING 11억 & 9층:");
      console.log(JSON.stringify({
        id: doc.id,
        aptName: d.aptName,
        dong: d.dong,
        price: d.price,
        contractDate: d.contractDate,
        floor: d.floor,
        area: d.area,
        dealType: d.dealType
      }, null, 2));
    }
  });
  
  process.exit(0);
}
check();
