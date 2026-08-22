/**
 * @module lounge
 * @description Canonical domain models for Community Lounge Posts, Comments, Stories, and KPI Data.
 * Architecture Layer: Domain & Types (zero dependencies, zero logic)
 */

/** Post entity stored in Firestore and consumed by Lounge feeds */
export interface LoungePost {
  id: string;
  title: string;
  content: string;
  category: string;
  authorName: string;
  authorUid?: string | null;
  imageUrl?: string | null;
  verifiedApartment?: string | null;
  verificationLevel?: string | null;
  likes: number;
  views: number;
  commentCount: number;
  createdAt?: number | string | unknown;
  updatedAt?: number | string | unknown;
  authorEmail?: string | null;
  isNotice?: boolean;
  customNickname?: string;
}

export type Post = LoungePost;

/** Detailed view payload for a single Lounge Post */
export interface PostDetail {
  id: string;
  title: string;
  content: string;
  category: string;
  author: string;
  authorUid?: string;
  authorEmail?: string | null;
  imageUrl?: string;
  verifiedApartment?: string;
  verificationLevel?: string;
  likes: number;
  views: number;
  commentCount: number;
  createdAt?: number | string | unknown;
  comments?: PostComment[];
}

/** Recent lounge feed item for dashboard rendering */
export interface RecentLoungeItem {
  id: string;
  title: string;
  meta: string;
  content?: string;
  author: string;
  imageUrl?: string;
  tagClass: string;
  likes?: number;
  views?: number;
  authorUid?: string;
  verifiedApartment?: string;
  verificationLevel?: string;
  category?: string;
  commentCount?: number;
  createdAt?: number | string | unknown;
}

/** Comment on a Lounge Post */
export interface PostComment {
  id: string;
  postId?: string;
  text: string;
  author: string;
  authorUid?: string;
  createdAt?: number | string | unknown;
  apartmentName?: string;
  likes?: number;
}

/** Story snippet for apartment complex */
export interface AptStory {
  id: string;
  apartmentName: string;
  dong: string;
  title: string;
  content: string;
  imageUrl?: string;
  author: string;
  authorUid?: string;
  likes: number;
  createdAt: number;
}

/** Combined post item for unified feeds */
export interface CombinedPostItem {
  id: string;
  title: string;
  content: string;
  category: string;
  author: string;
  authorUid?: string;
  imageUrl?: string;
  verifiedApartment?: string;
  verificationLevel?: string;
  likes: number;
  views: number;
  commentCount: number;
  createdAt: number;
  source: 'post' | 'notice';
  url?: string;
}

/** Pure domain KPI Card data model (no ReactNode or ElementType leaks) */
export interface KPIData {
  id: string;
  title: string;
  subtitle: string;
  badgeText?: string;
  badgeStyle?: string;
  mainValue: string;
  subValue: string;
  description: string;
  icon: string;
  gradientBackground: string;
  borderColor: string;
  titleColor: string;
}

/** Pure domain News/Lounge item data model (no ElementType leaks) */
export interface NewsItemData {
  id: string;
  title: string;
  meta: string;
  content?: string;
  author: string;
  imageUrl?: string;
  tagClass: string;
  icon?: string | unknown;
  likes?: number;
  views?: number;
  authorUid?: string;
  verifiedApartment?: string;
  verificationLevel?: string;
  category?: string;
}

/** Pure domain Ad Banner Data */
export interface AdBannerData {
  title: string;
  description: string;
  buttonText: string;
}
