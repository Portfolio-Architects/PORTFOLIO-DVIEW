import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });

async function main() {
  const { adminDb } = await import('../src/lib/firebaseAdmin');

  if (!adminDb) {
    console.error('❌ Firebase Admin DB is not initialized!');
    return;
  }

  const aptName = '동탄역 예미지 시그너스';
  console.log(`🔄 Starting sync for: ${aptName}`);

  // Load location-scores.json
  const scoresPath = path.resolve(__dirname, '../src/lib/location-scores.json');
  if (!fs.existsSync(scoresPath)) {
    console.error(`❌ Could not find location-scores.json at ${scoresPath}`);
    return;
  }

  const scoresData = JSON.parse(fs.readFileSync(scoresPath, 'utf-8'));
  const scoreData = scoresData[aptName];

  if (!scoreData) {
    console.error(`❌ No data found for ${aptName} in location-scores.json`);
    return;
  }

  // Fetch from Firestore
  const snap = await adminDb.collection('scoutingReports').where('apartmentName', '==', aptName).limit(1).get();
  if (snap.empty) {
    console.error(`❌ Could not find Firestore scoutingReport for: ${aptName}`);
    return;
  }

  const doc = snap.docs[0];
  const data = doc.data();
  const existingMetrics = data.metrics || {};

  const academyCategories = scoreData.academyCategories || {};
  const restaurantCategories = scoreData.restaurantCategories || {};

  const cleanUndefined = (obj: any): any => {
    if (obj === undefined) return null;
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(cleanUndefined).filter(v => v !== undefined);
    return Object.entries(obj).reduce((acc, [key, val]) => {
      if (val !== undefined) acc[key] = cleanUndefined(val);
      return acc;
    }, {} as any);
  };

  const updatedMetrics = cleanUndefined({
    ...existingMetrics,
    academyCategories,
    restaurantCategories,
  });

  await adminDb.collection('scoutingReports').doc(doc.id).update({
    metrics: updatedMetrics,
  });

  console.log(`✅ Successfully updated ${aptName} Firestore metrics with academyCategories and restaurantCategories!`);
  console.log('Academy Categories:', JSON.stringify(academyCategories, null, 2));
  console.log('Restaurant Categories:', JSON.stringify(restaurantCategories, null, 2));
}

main().catch(err => {
  console.error('❌ Failed to sync single report:', err);
  process.exit(1);
});
