require('dotenv').config({ path: '.env.local', override: true });
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function getAdminCredentials() {
  try {
    const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
      return JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    }
  } catch {}

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch {}
  }

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'portfolio-dtdls';
  
  if (privateKey && clientEmail) {
    return {
      projectId,
      clientEmail,
      client_email: clientEmail, 
      privateKey: privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
      private_key: privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n')
    };
  }

  return null;
}

const accountInfo = getAdminCredentials();
if (!admin.apps.length) {
  if (accountInfo) {
    admin.initializeApp({
      credential: admin.credential.cert(accountInfo),
    });
  } else {
    admin.initializeApp({
      projectId: 'portfolio-dtdls'
    });
  }
}

const db = admin.firestore();

async function check() {
  const snap = await db.collection('scoutingReports').get();
  console.log('Total reports:', snap.size);
  const names = snap.docs.map(doc => doc.data().apartmentName);
  console.log('All Names:', names);
  const matched = names.filter(n => n && n.includes('상록'));
  console.log('Matched containing 상록:', matched);
}

check().catch(console.error);
