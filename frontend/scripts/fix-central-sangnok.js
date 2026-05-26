require('dotenv').config({ path: '.env.local', override: true });
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

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

async function main() {
  const aptName = '동탄역 센트럴상록아파트';
  console.log(`📡 Fetching fresh location-scores for '${aptName}' from API...`);
  
  const res = await axios.get(`http://localhost:5000/api/location-scores?apartment=${encodeURIComponent(aptName)}&refresh=1`);
  const loc = res.data;
  
  console.log('API Response nearestSchools:', JSON.stringify(loc.nearestSchools, null, 2));
  console.log('API Response nearestStation:', JSON.stringify(loc.nearestStation, null, 2));

  const snap = await db.collection('scoutingReports').where('apartmentName', '==', aptName).limit(1).get();
  if (snap.empty) {
    console.error(`Scouting Report not found for '${aptName}'!`);
    return;
  }

  const doc = snap.docs[0];
  const existingReport = doc.data();
  const existingMetrics = existingReport.metrics || {};

  const nearestSchoolNames = {
    elementary: loc.nearestSchools?.elementary?.name || '',
    middle: loc.nearestSchools?.middle?.name || '',
    high: loc.nearestSchools?.high?.name || '',
  };

  const updatedMetrics = {
    ...existingMetrics,
    nearestSchoolNames,
    nearestStationName: loc.nearestStation?.name || '',
    nearestStationLine: loc.nearestStation?.line || '',
    nearestStationCoords: loc.nearestStation ? `${loc.nearestStation.lat}, ${loc.nearestStation.lng}` : '',
    
    nearestIndeokwonStationName: loc.nearestIndeokwon?.name || '',
    nearestIndeokwonLine: loc.nearestIndeokwon?.line || '',
    nearestIndeokwonCoords: loc.nearestIndeokwon ? `${loc.nearestIndeokwon.lat}, ${loc.nearestIndeokwon.lng}` : '',
    
    nearestTramStationName: loc.nearestTram?.name || '',
    nearestTramLine: loc.nearestTram?.line || '',
    nearestTramCoords: loc.nearestTram ? `${loc.nearestTram.lat}, ${loc.nearestTram.lng}` : '',
  };

  console.log('Updating document in Firestore with metrics:', JSON.stringify(updatedMetrics, null, 2));
  await db.collection('scoutingReports').doc(doc.id).update({
    metrics: updatedMetrics
  });
  
  console.log('🎉 Successfully fixed Central Sangnok metrics!');
}

main().catch(console.error);
