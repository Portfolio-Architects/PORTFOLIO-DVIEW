require('dotenv').config({ path: '.env.local', override: true });
const admin = require('firebase-admin');

const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'portfolio-dtdls';

let serviceAccount;
if (envKey) {
  try {
    serviceAccount = JSON.parse(envKey);
  } catch (e) {
    console.error('Failed to parse envKey', e);
  }
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

const db = admin.firestore();

async function check() {
  const snap = await db.collection('transactions').limit(10).get();
  snap.forEach(d => {
    const data = d.data();
    console.log({
      aptName: data.aptName,
      buildYear: data.buildYear,
      constructionYear: data.constructionYear,
      yearBuilt: data.yearBuilt,
      contractYm: data.contractYm,
      contractDay: data.contractDay,
      dealType: data.dealType,
    });
  });
}

check().catch(console.error);
