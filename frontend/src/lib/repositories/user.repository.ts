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

/**
 * Gets or creates a user profile. On first login, a default nickname is assigned.
 * @param uid - Firebase Auth UID
 * @returns The user's profile
 */
export async function getOrCreateProfile(uid: string): Promise<UserProfile> {
  const userRef = doc(db, 'users', uid).withConverter(userProfileConverter);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    // If an existing user somehow doesn't have a photoURL, assign one and save it.
    if (!data.photoURL) {
      const randomAvatar = getRandomDefaultAvatar();
      await updateDoc(userRef, { photoURL: randomAvatar });
      data.photoURL = randomAvatar;
    }
    return data;
  }

  // First login — generate a profile
  const newProfile: UserProfile = {
    nickname: DEFAULT_NICKNAME,
    hasSetNickname: false,
    photoURL: getRandomDefaultAvatar(),
    createdAt: serverTimestamp(),
    uploaderPoints: 0,
    uploaderTier: '초보 임장러',
  };
  await setDoc(userRef, newProfile);
  logger.info('UserRepository.getOrCreateProfile', 'New user profile created', { uid, nickname: newProfile.nickname });
  return { 
    nickname: newProfile.nickname, 
    photoURL: newProfile.photoURL, 
    uploaderPoints: 0, 
    uploaderTier: '초보 임장러',
    hasSetNickname: false
  };
}

/**
 * Sets the user's apartment verification.
 */
export async function setApartmentVerification(
  uid: string,
  apartment: string,
  level: VerificationLevel
): Promise<void> {
  const userRef = doc(db, 'users', uid).withConverter(userProfileConverter);
  await updateDoc(userRef, { verifiedApartment: apartment, verificationLevel: level });
  logger.info('UserRepository.setApartmentVerification', 'Apartment verified', { uid, apartment, level });
}

/**
 * Updates the user's nickname.
 */
export async function updateNickname(uid: string, nickname: string): Promise<void> {
  const userRef = doc(db, 'users', uid).withConverter(userProfileConverter);
  await updateDoc(userRef, { nickname, hasSetNickname: true });
  logger.info('UserRepository.updateNickname', 'Nickname updated', { uid, nickname });
}

/**
 * Updates the user's profile photo URL.
 */
export async function updatePhotoURL(uid: string, photoURL: string): Promise<void> {
  const userRef = doc(db, 'users', uid).withConverter(userProfileConverter);
  await updateDoc(userRef, { photoURL });
  logger.info('UserRepository.updatePhotoURL', 'Photo URL updated', { uid });
}


