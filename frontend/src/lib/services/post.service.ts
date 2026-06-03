/**
 * @module post.service
 * @description Business logic for creating posts (orchestrates profile, upload, persistence).
 * Architecture Layer: Service (orchestration of repositories)
 */
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, db } from '@/lib/firebaseConfig';
import { collection, query, where, getDocs, updateDoc, doc, limit, serverTimestamp } from 'firebase/firestore';
import * as PostRepo from '@/lib/repositories/post.repository';
import * as UserRepo from '@/lib/repositories/user.repository';
import * as ApartmentRepo from '@/lib/repositories/apartment.repository';
import { logger } from '@/lib/services/logger';
import { compressImage } from '@/lib/utils/imageCompression';

/**
 * Creates a new community post with optional image upload.
 * Orchestration: 1) Fetch user profile → 2) Upload image → 3) Persist post
 * 
 * @param title - Post title
 * @param category - Category tag (e.g., '교통', '부동산')
 * @param authorUid - Firebase Auth UID
 * @param imageFile - Optional image file to attach
 * @throws Error if any step in the pipeline fails
 */
export async function createPost(
  title: string,
  content: string,
  category: string,
  authorUid: string,
  imageFile?: File,
  authorEmail?: string | null,
  customNickname?: string
): Promise<string> {
  try {
    const { isAdmin } = await import('@/lib/config/admin.config');
    // 1. Resolve user profile for display name
    const profile = await UserRepo.getOrCreateProfile(authorUid);

    // 2. Upload image if provided
    let imageUrl: string | null = null;
    if (imageFile) {
      const compressed = await compressImage(imageFile);
      const storageRef = ref(storage, `posts/${Date.now()}_${imageFile.name}`);
      const snapshot = await uploadBytes(storageRef, compressed);
      imageUrl = await getDownloadURL(snapshot.ref);
      logger.info('PostService.createPost', 'Image uploaded', { imageUrl });
    }

    // 3. Persist to Firestore (include apartment verification if present)
    const isUserAdmin = isAdmin(authorEmail);
    const displayName = isUserAdmin ? '매니저' : (customNickname || profile.nickname || '익명');
    const verifiedApartment = isUserAdmin ? '마스터' : profile.verifiedApartment;
    const verificationLevel = isUserAdmin ? 'registry_verified' : profile.verificationLevel;

    const postId = await PostRepo.createPost({
      title,
      category,
      content,
      authorName: displayName,
      authorUid,
      imageUrl,
      verifiedApartment,
      verificationLevel,
    });

    // Automatically sync manager's scouting report post to scoutingReports collection
    await syncManagerPostToScoutingReport(title, content, category, authorEmail);

    // 4. Trigger Google Search Console Indexing via Backend API asynchronously
    if (typeof window !== 'undefined') {
      const pageUrl = `${window.location.origin}/lounge/${postId}`;
      fetch('/api/admin/search-console/indexing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: pageUrl, action: 'URL_UPDATED' }),
      }).catch(err => {
        logger.error('PostService.createPost', 'Failed to trigger Google Indexing', { pageUrl }, err);
      });
    }

    logger.info('PostService.createPost', 'Post created successfully', { title, category, id: postId });
    return postId;
  } catch (error) {
    logger.error('PostService.createPost', 'Failed to create post', { title, category, authorUid }, error);
    throw error;
  }
}

/**
 * Automatically syncs the manager's scouting report post to the scoutingReports collection.
 * Only works if the author is an admin and the category/title matches scouting report criteria.
 */
export async function syncManagerPostToScoutingReport(
  title: string,
  content: string,
  category: string,
  authorEmail: string | null | undefined,
  providedApartments?: string[]
): Promise<void> {
  try {
    const { isAdmin } = await import('@/lib/config/admin.config');
    if (!isAdmin(authorEmail)) {
      logger.info('PostService.syncManagerPostToScoutingReport', 'User is not admin, skipping sync');
      return;
    }

    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    // Match check: category or title/content keywords
    const isManagerReport = category === '매니저 임장기' || 
                            category === '동탄 임장/분석' || 
                            category === '임장기' || 
                            cleanTitle.includes('매니저') || 
                            cleanTitle.includes('임장기') || 
                            cleanContent.includes('매니저 임장기');

    if (!isManagerReport) {
      logger.info('PostService.syncManagerPostToScoutingReport', 'Post is not classified as manager scouting report, skipping sync');
      return;
    }

    // Resolve apartments
    const apartments = providedApartments || await ApartmentRepo.fetchApartmentNames();
    if (!apartments || apartments.length === 0) {
      logger.warn('PostService.syncManagerPostToScoutingReport', 'No apartments loaded, skipping sync');
      return;
    }

    // Find the best match apartment name
    const scoredApts = apartments.map(apt => {
      const shortName = apt.replace(/\[.*?\]\s*/, '');
      if (!shortName) return { apt, score: 0 };
      const titleMatches = cleanTitle.split(shortName).length - 1;
      const contentMatches = cleanContent.split(shortName).length - 1;
      const score = (titleMatches * 10) + contentMatches;
      return { apt, score };
    }).filter(a => a.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scoredApts.length > 0) {
      const targetAptName = scoredApts[0].apt;
      const q = query(collection(db, 'scoutingReports'), where('apartmentName', '==', targetAptName), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const reportDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, 'scoutingReports', reportDoc.id), {
          premiumContent: cleanContent,
          updatedAt: serverTimestamp()
        });
        logger.info('PostService.syncManagerPostToScoutingReport', `Successfully synced post content to scoutingReports for ${targetAptName}`);
      } else {
        logger.warn('PostService.syncManagerPostToScoutingReport', `No scoutingReport found for ${targetAptName}`);
      }
    } else {
      logger.warn('PostService.syncManagerPostToScoutingReport', 'Could not resolve apartment name from title or content');
    }
  } catch (err) {
    logger.error('PostService.syncManagerPostToScoutingReport', 'Error occurred during sync', undefined, err);
  }
}
