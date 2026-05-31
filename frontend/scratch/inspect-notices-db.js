require('dotenv').config({ path: 'frontend/.env.local', override: true });
const admin = require('firebase-admin');

const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'portfolio-dtdls';

if (privateKey && clientEmail) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
    }),
  });
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  admin.initializeApp({
    credential: admin.credential.cert(credentials),
  });
} else {
  console.error('No credentials found in environment.');
  process.exit(1);
}

const db = admin.firestore();

async function main() {
  const snapshot = await db.collection('local_notices')
    .orderBy('date', 'desc')
    .limit(10)
    .get();

  console.log(`Fetched ${snapshot.docs.length} notices:`);
  snapshot.docs.forEach((doc, index) => {
    const data = doc.data();
    console.log(`\n[${index + 1}] ID: ${doc.id}`);
    console.log(`Title: ${data.title}`);
    console.log(`Dept: ${data.dept}`);
    console.log(`Date: ${data.date}`);
    console.log(`Source: ${data.source}`);
    console.log(`URL: ${data.url}`);
  });
}

main().catch(console.error);
