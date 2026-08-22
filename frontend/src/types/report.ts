/**
 * @module report
 * @description Canonical domain models for Field Reports, Scouting Reports, Objective Metrics, and Photo Meta.
 * Architecture Layer: Domain & Types (zero dependencies, zero logic)
 */

import type { PremiumScores } from './valuation';

/** Image metadata for report galleries */
export interface ImageMeta {
  url: string;
  caption: string;
  locationTag?: string;
  isPremium?: boolean;
  capturedAt?: string;
  uploaderName?: string;
}

/** Form photo upload item */
export interface PhotoItem {
  file?: File;
  previewUrl?: string;
  url: string;
  caption: string;
  locationTag: string;
  isPremium: boolean;
  capturedAt?: string;
}

/** Field Report Image (normalized) */
export interface FieldReportImage {
  url: string;
  caption: string;
  locationTag: string;
  isPremium: boolean;
  capturedAt?: string;
  uploaderName?: string;
}

/** 25+ quantitative spatial and facility distance metrics */
export interface ObjectiveMetrics {
  brand: string;
  householdCount: number;
  far: number;
  bcr: number;
  parkingCount?: number;
  jeonseRate?: number;
  parkingPerHousehold: number;
  yearBuilt: number;
  minFloor?: number;
  maxFloor?: number;
  coordinates?: string;
  distanceToElementary: number;
  distanceToMiddle: number;
  distanceToHigh: number;
  distanceToSubway: number;
  academyDensity: number;
  academyCategories?: Record<string, number>;
  restaurantDensity?: number;
  restaurantCategories?: Record<string, number>;
  distanceToIndeokwon?: number;
  distanceToTram?: number;
  distanceToStarbucks?: number;
  starbucksName?: string;
  starbucksAddress?: string;
  starbucksCoordinates?: string;
  distanceToMcDonalds?: number;
  mcdonaldsName?: string;
  mcdonaldsAddress?: string;
  mcdonaldsCoordinates?: string;
  distanceToOliveYoung?: number;
  oliveYoungName?: string;
  oliveYoungAddress?: string;
  oliveYoungCoordinates?: string;
  distanceToDaiso?: number;
  daisoName?: string;
  daisoAddress?: string;
  daisoCoordinates?: string;
  distanceToSupermarket?: number;
  supermarketName?: string;
  supermarketAddress?: string;
  supermarketCoordinates?: string;
  distanceToPark?: number;
  nearestSchoolNames?: {
    elementary?: string;
    middle?: string;
    high?: string;
  };
  nearestStationName?: string;
  nearestStationLine?: string;
  nearestStationCoords?: string;
  nearestIndeokwonStationName?: string;
  nearestIndeokwonLine?: string;
  nearestIndeokwonCoords?: string;
  nearestTramStationName?: string;
  nearestTramLine?: string;
  nearestTramCoords?: string;
}

/** In-report advertisement banner slot */
export interface AdSlot {
  bannerUrl: string;
  targetLink: string;
  isActive: boolean;
}

/** Architectural specs section of field report */
export interface ReportSpecs {
  builtYear: string;
  scale: string;
  farBuild: string;
  parkingRatio: string;
  [key: string]: unknown;
}

/** Infrastructure section of field report */
export interface ReportInfra {
  gateText: string;
  gateImgs?: string[];
  gateRating?: number;
  landscapeText: string;
  landscapeImgs?: string[];
  landscapeRating?: number;
  parkingText: string;
  parkingImgs?: string[];
  parkingRating?: number;
  maintenanceText: string;
  maintenanceImgs?: string[];
  maintenanceRating?: number;
  // Legacy single-image compat
  gateImg?: string;
  landscapeImg?: string;
  parkingImg?: string;
  maintenanceImg?: string;
  [key: string]: unknown;
}

/** Living ecosystem section of field report */
export interface ReportEcosystem {
  communityText: string;
  communityImgs?: string[];
  communityRating?: number;
  schoolText: string;
  schoolImgs?: string[];
  schoolRating?: number;
  commerceText: string;
  commerceImgs?: string[];
  commerceRating?: number;
  // Legacy single-image compat
  communityImg?: string;
  schoolImg?: string;
  commerceImg?: string;
  [key: string]: unknown;
}

/** Location & traffic section of field report */
export interface ReportLocation {
  trafficText: string;
  trafficRating?: number;
  developmentText: string;
  developmentRating?: number;
  [key: string]: unknown;
}

/** Future assessment & alpha analysis section */
export interface ReportAssessment {
  alphaDriver: string;
  systemicRisk: string;
  synthesis: string;
  probability: string;
  autoGrade?: string;
  [key: string]: unknown;
}

/** Complete structured section tree of field report */
export interface ReportSections {
  specs: ReportSpecs;
  infra: ReportInfra;
  ecosystem: ReportEcosystem;
  location: ReportLocation;
  assessment: ReportAssessment;
}

/** Report comment item */
export interface CommentData {
  id: string;
  text: string;
  author: string;
  authorUid?: string;
  createdAt?: number | string | unknown;
  apartmentName?: string;
}

/** Scouting report domain entity */
export interface ScoutingReport {
  id?: string;
  dong: string;
  apartmentName: string;
  thumbnailUrl: string;
  images: ImageMeta[];
  metrics: ObjectiveMetrics;
  premiumContent?: string;
  premiumScores?: PremiumScores | null;
  isPremium: boolean;
  adSlot?: AdSlot;
  authorUid: string;
  createdAt: number;
  updatedAt: number;
}

/** Complete field report presentation & domain model */
export interface FieldReportData {
  id: string;
  dong?: string;
  apartmentName: string;
  sections?: ReportSections;
  premiumScores?: PremiumScores | null;
  metrics?: ObjectiveMetrics;
  premiumContent?: string;
  author: string;
  likes: number;
  commentCount: number;
  viewCount?: number;
  comments?: CommentData[];
  thumbnail?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  images?: (Required<Pick<ImageMeta, 'url' | 'caption' | 'locationTag' | 'isPremium'>> & Pick<ImageMeta, 'uploaderName' | 'capturedAt'>)[];
  scoutingDate?: string;
  createdAt?: number | string | unknown;
  pros?: string;
  cons?: string;
  rating?: number;
  _rawTimestamp?: number;
}
