import { FirestoreDataConverter, DocumentData, QueryDocumentSnapshot, SnapshotOptions } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types/user.types';
import { DEFAULT_NICKNAME } from '@/lib/services/nickname.service';

/**
 * Firestore Converter for UserProfile collection.
 */
export const userProfileConverter: FirestoreDataConverter<UserProfile> = {
  toFirestore(user: UserProfile): DocumentData {
    return {
      nickname: user.nickname,
      hasSetNickname: user.hasSetNickname ?? false,
      photoURL: user.photoURL ?? '',
      verifiedApartment: user.verifiedApartment ?? null,
      verificationLevel: user.verificationLevel ?? 'none',
      createdAt: user.createdAt ?? null,
      uploaderPoints: user.uploaderPoints ?? 0,
      uploaderTier: user.uploaderTier ?? '초보 임장러',
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): UserProfile {
    const data = snapshot.data(options);
    return {
      nickname: data.nickname || DEFAULT_NICKNAME,
      photoURL: data.photoURL || undefined,
      verifiedApartment: data.verifiedApartment || undefined,
      verificationLevel: data.verificationLevel || 'none',
      createdAt: data.createdAt,
      uploaderPoints: data.uploaderPoints ?? 0,
      uploaderTier: data.uploaderTier || '초보 임장러',
      hasSetNickname: data.hasSetNickname ?? false,
    };
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
  createdAt: any;
}

/**
 * Firestore Converter for Comment collection.
 */
export const commentConverter: FirestoreDataConverter<CommentDocument> = {
  toFirestore(comment: CommentDocument): DocumentData {
    return {
      text: comment.text,
      authorName: comment.authorName,
      authorUid: comment.authorUid,
      createdAt: comment.createdAt ?? null,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): CommentDocument {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      text: data.text || '',
      authorName: data.authorName || '익명',
      authorUid: data.authorUid || '',
      createdAt: data.createdAt,
    };
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
  createdAt: any;
}

/**
 * Firestore Converter for Post collection.
 */
export const postConverter: FirestoreDataConverter<PostDocument> = {
  toFirestore(post: PostDocument): DocumentData {
    return {
      title: post.title,
      category: post.category,
      content: post.content ?? null,
      authorName: post.authorName,
      authorUid: post.authorUid,
      imageUrl: post.imageUrl ?? null,
      verifiedApartment: post.verifiedApartment ?? null,
      verificationLevel: post.verificationLevel ?? null,
      likes: post.likes,
      views: post.views,
      createdAt: post.createdAt ?? null,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): PostDocument {
    const data = snapshot.data(options);
    return {
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
  }
};
