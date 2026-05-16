const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('No serviceAccountKey.json found.');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function resetLikes() {
  const postsRef = db.collection('posts');
  const snapshot = await postsRef.get();
  
  if (snapshot.empty) {
    console.log('No posts found.');
    return;
  }
  
  let count = 0;
  const batch = db.batch();
  
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, { likes: 0 });
    count++;
  });
  
  await batch.commit();
  console.log(`Successfully reset likes to 0 for ${count} posts.`);
}

resetLikes().catch(console.error);
