import { adminDb } from '../src/lib/firebaseAdmin';

async function resetLikes() {
  if (!adminDb) {
    console.error('No adminDb found. Cannot connect to Firestore.');
    return;
  }
  
  try {
    const postsRef = adminDb.collection('posts');
    const snapshot = await postsRef.get();
    
    if (snapshot.empty) {
      console.log('No posts found.');
      return;
    }
    
    let count = 0;
    const batch = adminDb.batch();
    
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { likes: 0 });
      count++;
    });
    
    await batch.commit();
    console.log(`Successfully reset likes to 0 for ${count} posts.`);
  } catch (error) {
    console.error('Error resetting likes:', error);
  }
}

resetLikes();
