const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  : {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'portfolio-dtdls',
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || '').replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
    };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function main() {
  const db = admin.firestore();
  console.log('Querying specific scoutingReport...');
  const snap = await db.collection('scoutingReports').where('apartmentName', '==', '동탄 레이크 자연앤푸르지오').get();
  
  if (snap.empty) {
    console.log('No report found with name: 동탄 레이크 자연앤푸르지오');
  } else {
    snap.forEach(doc => {
      const data = doc.data();
      console.log(`Found: ID=${doc.id}, Name="${data.apartmentName}"`);
      console.log(`Metrics:`, JSON.stringify(data.metrics, null, 2));
    });
  }
  
  process.exit(0);
}
main().catch(console.error);

