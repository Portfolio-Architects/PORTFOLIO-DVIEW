import { FirestoreDataConverter, DocumentData, QueryDocumentSnapshot, SnapshotOptions, Timestamp } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types/user.types';
import { DEFAULT_NICKNAME } from '@/lib/services/nickname.service';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

// Zod schemas for collection data validation
export const UserProfileSchema = z.object({
  nickname: z.string().min(1, 'Nickname cannot be empty').catch(DEFAULT_NICKNAME),
  hasSetNickname: z.boolean().catch(false),
  photoURL: z.string().optional(),
  verifiedApartment: z.string().optional(),
  verificationLevel: z.enum(['none', 'self_declared', 'registry_verified']).catch('none'),
  createdAt: z.unknown().optional(),
  uploaderPoints: z.number().int().catch(0),
  uploaderTier: z.string().catch('초보 임장러'),
});

/**
 * Firestore Converter for UserProfile collection.
 */
export const userProfileConverter: FirestoreDataConverter<UserProfile> = {
  toFirestore(user: UserProfile): DocumentData {
    const validation = UserProfileSchema.safeParse(user);
    const data = validation.success ? validation.data : user;
    if (!validation.success) {
      logger.warn('firestoreConverters.userProfileConverter.toFirestore', 'UserProfile validation failed for writing', { error: String(validation.error) });
    }
    return {
      nickname: data.nickname,
      hasSetNickname: data.hasSetNickname ?? false,
      photoURL: data.photoURL ?? '',
      verifiedApartment: data.verifiedApartment ?? null,
      verificationLevel: data.verificationLevel ?? 'none',
      createdAt: data.createdAt ?? null,
      uploaderPoints: data.uploaderPoints ?? 0,
      uploaderTier: data.uploaderTier ?? '초보 임장러',
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): UserProfile {
    const data = snapshot.data(options);
    const raw = {
      nickname: data.nickname || DEFAULT_NICKNAME,
      photoURL: data.photoURL || undefined,
      verifiedApartment: data.verifiedApartment || undefined,
      verificationLevel: data.verificationLevel || 'none',
      createdAt: data.createdAt,
      uploaderPoints: data.uploaderPoints ?? 0,
      uploaderTier: data.uploaderTier || '초보 임장러',
      hasSetNickname: data.hasSetNickname ?? false,
    };
    const validation = UserProfileSchema.safeParse(raw);
    if (!validation.success) {
      logger.error('firestoreConverters.userProfileConverter.fromFirestore', 'UserProfile raw data validation failed, using fallback values', { error: String(validation.error), docId: snapshot.id });
    }
    return validation.success ? validation.data : (raw as UserProfile);
  }
};
