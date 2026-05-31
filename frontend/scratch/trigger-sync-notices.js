const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local', override: true });

function getAdminCredentials() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
    }
  }
  return null;
}

async function main() {
  const url = 'http://localhost:5001/api/cron/sync-local-notices';
  console.log(`Triggering API: ${url}...`);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`API Request failed with HTTP ${res.status}`);
      const text = await res.text();
      console.error('Response text:', text);
      return;
    }

    const data = await res.json();
    console.log('API Response:', JSON.stringify(data, null, 2));

    // Verify Firestore data
    const accountInfo = getAdminCredentials();
    if (!admin.apps.length) {
      if (accountInfo) {
        admin.initializeApp({
          credential: admin.credential.cert(accountInfo),
        });
      } else {
        console.error('No service account found for Firestore verification!');
        return;
      }
    }

    const db = admin.firestore();
    console.log('Verifying Firestore documents under local_notices for "dong_"...');
    
    const snapshot = await db.collection('local_notices')
      .where('source', '==', 'dong')
      .limit(10)
      .get();

    console.log(`Found ${snapshot.size} documents with source "dong".`);
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- Document ID: ${doc.id}`);
      console.log(`  Title: ${data.title}`);
      console.log(`  Dept: ${data.dept}`);
      console.log(`  Date: ${data.date}`);
      console.log(`  isDongtan: ${data.isDongtan}`);
    });

  } catch (error) {
    console.error('Error in test script:', error);
  }
}

main().catch(console.error);
