/**
 * @module dashboard
 * @description Canonical domain models for Macro/Main Dashboard KPI cards, News items, and Ad banners.
 * Architecture Layer: Domain & Types (zero dependencies, zero logic)
 */

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
