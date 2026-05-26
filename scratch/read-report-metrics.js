require('dotenv').config({ path: '.env.local', override: true });
const { adminDb } = require('../frontend/src/lib/firebaseAdmin');

async function main() {
  if (!adminDb) {
    console.error('No adminDb configured!');
    return;
  }
  const snap = await adminDb.collection('scoutingReports').where('apartmentName', '==', '동탄역 롯데캐슬').limit(1).get();
  if (snap.empty) {
    console.error('Report not found for 동탄역 롯데캐슬!');
    return;
  }

  const doc = snap.docs[0];
  console.log(`Document ID: ${doc.id}`);
  const data = doc.data();
  console.log('Metrics in Firestore:');
  console.log(JSON.stringify(data.metrics, null, 2));
}

main().catch(console.error);
