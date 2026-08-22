/**
 * @module user
 * @description Canonical user and authentication domain models.
 * Architecture Layer: Domain & Types (zero dependencies, zero logic)
 */

/** Apartment resident verification level */
export type VerificationLevel = 'none' | 'self_declared' | 'registry_verified';

/** User profile entity */
export interface UserProfile {
  nickname: string;
  hasSetNickname?: boolean;
  photoURL?: string;
  verifiedApartment?: string;
  verificationLevel?: VerificationLevel;
  createdAt?: number | string | unknown;
  uploaderPoints?: number;
  uploaderTier?: string;
}

/** User permission roles */
export type UserRole = 'user' | 'admin' | 'uploader';

/** Authenticated user session state */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
}
