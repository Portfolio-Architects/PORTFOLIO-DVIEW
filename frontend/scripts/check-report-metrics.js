require('dotenv').config({ path: '.env.local', override: true });
const { adminDb } = require('../src/lib/firebaseAdmin');

async function main() {
  if (!adminDb) {
    console.error('No adminDb configured!');
    return;
  }
  const snap = await adminDb.collection('scoutingReports').get();
  console.log(`Found ${snap.size} documents in scoutingReports:`);
  snap.docs.forEach(doc => {
    const data = doc.data();
    console.log(`- ${data.apartmentName} (ID: ${doc.id})`);
    if (data.apartmentName.includes('한화') || data.apartmentName.includes('꿈에그린')) {
       console.log('  Metrics:', JSON.stringify(data.metrics, null, 2));
    }
  });
}

main().catch(console.error);
