const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local'), override: true });

const serviceAccountKeyJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!serviceAccountKeyJson) {
  console.error('FIREBASE_SERVICE_ACCOUNT_JSON env variable is missing.');
  process.exit(1);
}

const serviceAccountKey = JSON.parse(serviceAccountKeyJson);
admin.initializeApp({ credential: admin.credential.cert(serviceAccountKey) });

async function check() {
  const db = admin.firestore();
  console.log('Querying scoutingReports collection...');
  const snap = await db.collection('scoutingReports').get();
  console.log(`Total reports in Firestore: ${snap.size}`);
  
  snap.docs.forEach(doc => {
    const data = doc.data();
    if (data.apartmentName.includes('신미주') || data.apartmentName.includes('풍성')) {
      console.log(`Found Matching Report [ID: ${doc.id}]:`);
      console.log(`  apartmentName: "${data.apartmentName}"`);
      console.log(`  dong: "${data.dong}"`);
      console.log(`  metrics:`, JSON.stringify(data.metrics, null, 2));
    }
  });
  
  process.exit(0);
}
check().catch(err => {
  console.error(err);
  process.exit(1);
});
