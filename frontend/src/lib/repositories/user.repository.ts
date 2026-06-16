/**
 * @module user.repository
 * @description Data Access Layer for user profiles in Firestore.
 * Architecture Layer: Repository (CRUD only)
 */
import { db } from '@/lib/firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { logger } from '@/lib/services/logger';
import type { UserProfile, VerificationLevel } from '@/lib/types/user.types';
import { DEFAULT_NICKNAME } from '@/lib/services/nickname.service';
import { getRandomDefaultAvatar } from '@/lib/types/user.types';
import { userProfileConverter } from '@/lib/utils/firestoreConverters';
import { z } from 'zod';

const UserProfileSchema = z.object({
  nickname: z.string().default(DEFAULT_NICKNAME),
  hasSetNickname: z.boolean().default(false),
  photoURL: z.string().optional(),
  verifiedApartment: z.string().optional(),
  verificationLevel: z.enum(['none', 'self_declared', 'registry_verified']).default('none'),
  uploaderPoints: z.number().default(0),
  uploaderTier: z.string().default('초보 임장러'),
}).passthrough();

/**
 * Gets or creates a user profile. On first login, a default nickname is assigned.
 * Supporting server-side (adminDb) and client-side (db) fetches.
 * @param uid - Firebase Auth UID
 * @returns The user's profile
 */
export async function getOrCreateProfile(uid: string): Promise<UserProfile> {
  let docData: any = null;

  if (typeof window === 'undefined') {
    try {
      const { adminDb } = await import('@/lib/firebaseAdmin');
      if (adminDb) {
        const userRef = adminDb.collection('users').doc(uid);
        const userSnap = await userRef.get();
        if (userSnap.exists) {
          docData = userSnap.data();
          if (docData && !docData.photoURL) {
            const randomAvatar = getRandomDefaultAvatar();
            await userRef.update({ photoURL: randomAvatar });
            docData.photoURL = randomAvatar;
          }
        } else {
          const newProfile = {
            nickname: DEFAULT_NICKNAME,
            hasSetNickname: false,
            photoURL: getRandomDefaultAvatar(),
            createdAt: new Date(),
            uploaderPoints: 0,
            uploaderTier: '초보 임장러',
          };
          await userRef.set(newProfile);
          logger.info('UserRepository.getOrCreateProfile', 'New user profile created via Admin DB', { uid, nickname: newProfile.nickname });
          docData = newProfile;
        }
      }
    } catch (adminError) {
      logger.warn('UserRepository.getOrCreateProfile', 'Admin SDK fetch failed, falling back', { uid }, adminError);
    }
  }

  if (!docData) {
    try {
      const userRef = doc(db, 'users', uid).withConverter(userProfileConverter);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        if (!data.photoURL) {
          const randomAvatar = getRandomDefaultAvatar();
          await updateDoc(userRef, { photoURL: randomAvatar });
          data.photoURL = randomAvatar;
        }
        docData = data;
      } else {
        const newProfile: UserProfile = {
          nickname: DEFAULT_NICKNAME,
          hasSetNickname: false,
          photoURL: getRandomDefaultAvatar(),
          createdAt: serverTimestamp(),
          uploaderPoints: 0,
          uploaderTier: '초보 임장러',
        };
        await setDoc(userRef, newProfile);
        logger.info('UserRepository.getOrCreateProfile', 'New user profile created via Client SDK', { uid, nickname: newProfile.nickname });
        docData = {
          nickname: newProfile.nickname,
          photoURL: newProfile.photoURL,
          uploaderPoints: 0,
          uploaderTier: '초보 임장러',
          hasSetNickname: false,
        };
      }
    } catch (e) {
      logger.error('UserRepository.getOrCreateProfile', 'Client SDK fetch failed', { uid }, e);
      // Fallback profile if Firestore itself fails or is offline
      docData = {
        nickname: DEFAULT_NICKNAME,
        photoURL: getRandomDefaultAvatar(),
        uploaderPoints: 0,
        uploaderTier: '초보 임장러',
        hasSetNickname: false,
      };
    }
  }

  const parsed = UserProfileSchema.safeParse(docData);
  if (!parsed.success) {
    logger.warn('UserRepository.getOrCreateProfile', 'Zod validation failed, using raw fallback', { uid }, parsed.error);
    return docData as UserProfile;
  }

  return parsed.data as UserProfile;
}

/**
 * Sets the user's apartment verification.
 */
export async function setApartmentVerification(
  uid: string,
  apartment: string,
  level: VerificationLevel
): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid).withConverter(userProfileConverter);
    await updateDoc(userRef, { verifiedApartment: apartment, verificationLevel: level });
    logger.info('UserRepository.setApartmentVerification', 'Apartment verified', { uid, apartment, level });
  } catch (error) {
    logger.error('UserRepository.setApartmentVerification', 'Failed to set apartment verification', { uid, apartment, level }, error);
    throw error;
  }
}

/**
 * Updates the user's nickname.
 */
export async function updateNickname(uid: string, nickname: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid).withConverter(userProfileConverter);
    await updateDoc(userRef, { nickname, hasSetNickname: true });
    logger.info('UserRepository.updateNickname', 'Nickname updated', { uid, nickname });
  } catch (error) {
    logger.error('UserRepository.updateNickname', 'Failed to update nickname', { uid, nickname }, error);
    throw error;
  }
}

/**
 * Updates the user's profile photo URL.
 */
export async function updatePhotoURL(uid: string, photoURL: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid).withConverter(userProfileConverter);
    await updateDoc(userRef, { photoURL });
    logger.info('UserRepository.updatePhotoURL', 'Photo URL updated', { uid });
  } catch (error) {
    logger.error('UserRepository.updatePhotoURL', 'Failed to update photo URL', { uid }, error);
    throw error;
  }
}



