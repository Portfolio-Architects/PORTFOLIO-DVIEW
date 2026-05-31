require('dotenv').config({ path: 'frontend/.env.local', override: true });
// Since we require firebaseAdmin, we need to handle TS module alias or just load TS files with ts-node if we can, 
// or register ts-node. Let's register ts-node in the script to handle src/lib/firebaseAdmin.ts imports.
require('ts-node').register({
  compilerOptions: {
    module: 'commonjs',
  },
});
const { adminDb } = require('../frontend/src/lib/firebaseAdmin');

async function main() {
  if (!adminDb) {
    console.error('No adminDb configured!');
    return;
  }
  const snap = await adminDb.collection('scoutingReports').where('apartmentName', '==', '동탄역 시범 한화꿈에그린 프레스티지').limit(1).get();
  if (snap.empty) {
    console.log('Report not found for 동탄역 시범 한화꿈에그린 프레스티지! (Using stub)');
    return;
  }

  const doc = snap.docs[0];
  console.log(`Document ID: ${doc.id}`);
  const data = doc.data();
  console.log('Metrics in Firestore:');
  console.log(JSON.stringify(data.metrics, null, 2));
}

main().catch(console.error);
