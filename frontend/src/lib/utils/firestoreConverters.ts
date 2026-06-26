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

export const CommentDocumentSchema = z.object({
  id: z.string().optional(),
  text: z.string().catch(''),
  authorName: z.string().catch('익명'),
  authorUid: z.string().catch(''),
  createdAt: z.unknown(),
});

export const PostDocumentSchema = z.object({
  id: z.string().optional(),
  title: z.string().catch(''),
  category: z.string().catch(''),
  content: z.string().optional(),
  authorName: z.string().catch('익명'),
  authorUid: z.string().catch(''),
  imageUrl: z.string().nullable().catch(null),
  verifiedApartment: z.string().optional(),
  verificationLevel: z.string().optional(),
  likes: z.number().int().catch(0),
  views: z.number().int().catch(0),
  createdAt: z.unknown(),
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

/**
 * Type representing a comment document in Firestore.
 */
export interface CommentDocument {
  id?: string;
  text: string;
  authorName: string;
  authorUid: string;
  createdAt: Timestamp | null | undefined;
}

/**
 * Firestore Converter for Comment collection.
 */
export const commentConverter: FirestoreDataConverter<CommentDocument> = {
  toFirestore(comment: CommentDocument): DocumentData {
    const validation = CommentDocumentSchema.safeParse(comment);
    const data = validation.success ? validation.data : comment;
    if (!validation.success) {
      logger.warn('firestoreConverters.commentConverter.toFirestore', 'Comment validation failed for writing', { error: String(validation.error) });
    }
    return {
      text: data.text,
      authorName: data.authorName,
      authorUid: data.authorUid,
      createdAt: data.createdAt ?? null,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): CommentDocument {
    const data = snapshot.data(options);
    const raw = {
      id: snapshot.id,
      text: data.text || '',
      authorName: data.authorName || '익명',
      authorUid: data.authorUid || '',
      createdAt: data.createdAt,
    };
    const validation = CommentDocumentSchema.safeParse(raw);
    if (!validation.success) {
      logger.error('firestoreConverters.commentConverter.fromFirestore', 'Comment raw data validation failed, using fallback values', { error: String(validation.error), docId: snapshot.id });
    }
    return validation.success ? (validation.data as CommentDocument) : (raw as CommentDocument);
  }
};

/**
 * Type representing a post document in Firestore.
 */
export interface PostDocument {
  id?: string;
  title: string;
  category: string;
  content?: string;
  authorName: string;
  authorUid: string;
  imageUrl: string | null;
  verifiedApartment?: string;
  verificationLevel?: string;
  likes: number;
  views: number;
  createdAt: Timestamp | null | undefined;
}

/**
 * Firestore Converter for Post collection.
 */
export const postConverter: FirestoreDataConverter<PostDocument> = {
  toFirestore(post: PostDocument): DocumentData {
    const validation = PostDocumentSchema.safeParse(post);
    const data = validation.success ? validation.data : post;
    if (!validation.success) {
      logger.warn('firestoreConverters.postConverter.toFirestore', 'Post validation failed for writing', { error: String(validation.error) });
    }
    return {
      title: data.title,
      category: data.category,
      content: data.content ?? null,
      authorName: data.authorName,
      authorUid: data.authorUid,
      imageUrl: data.imageUrl ?? null,
      verifiedApartment: data.verifiedApartment ?? null,
      verificationLevel: data.verificationLevel ?? null,
      likes: data.likes,
      views: data.views,
      createdAt: data.createdAt ?? null,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): PostDocument {
    const data = snapshot.data(options);
    const raw = {
      id: snapshot.id,
      title: data.title || '',
      category: data.category || '',
      content: data.content || undefined,
      authorName: data.authorName || '익명',
      authorUid: data.authorUid || '',
      imageUrl: data.imageUrl || null,
      verifiedApartment: data.verifiedApartment || undefined,
      verificationLevel: data.verificationLevel || undefined,
      likes: data.likes ?? 0,
      views: data.views ?? 0,
      createdAt: data.createdAt,
    };
    const validation = PostDocumentSchema.safeParse(raw);
    if (!validation.success) {
      logger.error('firestoreConverters.postConverter.fromFirestore', 'Post raw data validation failed, using fallback values', { error: String(validation.error), docId: snapshot.id });
    }
    return validation.success ? (validation.data as PostDocument) : (raw as PostDocument);
  }
};
