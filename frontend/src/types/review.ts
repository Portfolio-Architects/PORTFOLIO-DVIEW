/**
 * @module review
 * @description Canonical domain models for User Reviews (동네 리뷰).
 * Architecture Layer: Domain & Types (zero dependencies, zero logic)
 */

/** User apartment review entity */
export interface UserReview {
  id: string;
  apartmentName: string;
  dong?: string;
  rating: number;
  content: string;
  photoURL?: string;
  author: string;
  authorUid: string;
  verifiedApartment?: string;
  verificationLevel?: string;
  likes: number;
  createdAt?: number | string | unknown;
}

/** Review input submission payload */
export interface ReviewInput {
  apartmentName: string;
  rating: number;
  content: string;
  authorUid: string;
  imageFile?: File;
}
