const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

const serviceAccount = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'portfolio-dtdls',
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY).replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function main() {
  const db = admin.firestore();
  console.log('Querying posts...');
  const snap = await db.collection('posts').get();
  
  snap.forEach(doc => {
    const d = doc.data();
    console.log(`ID: ${doc.id}`);
    console.log(`Title: ${d.title}`);
    console.log(`Views: ${d.views} (${typeof d.views})`);
    console.log(`Likes: ${d.likes} (${typeof d.likes})`);
    console.log(`CommentCount: ${d.commentCount} (${typeof d.commentCount})`);
    console.log('-------------------------------');
  });

  process.exit(0);
}
main().catch(err => {
  console.error(err);
  process.exit(1);
});
