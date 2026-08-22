/**
 * @module apartment
 * @description Canonical domain models for Apartment complexes, metadata, and POI geographic data.
 * Architecture Layer: Domain & Types (zero dependencies, zero logic)
 */

/** Canonical Dong Apartment Complex model */
export interface DongApartment {
  name: string;
  dong: string;
  householdCount?: number;
  yearBuilt?: string;
  brand?: string;
  lat?: number;
  lng?: number;
  txKey?: string;
  isPublicRental?: boolean;
  far?: number;
  bcr?: number;
  parkingPerHousehold?: number;
  parkingCount?: number;
  maxFloor?: number;
  minFloor?: number;
}

/** Static apartment representation for lightweight lookup */
export interface StaticApartment {
  name: string;
  dong: string;
  householdCount?: number;
  yearBuilt?: string;
  brand?: string;
  lat?: number;
  lng?: number;
  txKey?: string;
}

/** Full Google Sheets apartment dataset entry */
export interface SheetApartment {
  ticker?: string | null;
  name: string;
  dong: string;
  lat: number;
  lng: number;
  householdCount?: number | null;
  yearBuilt?: string | null;
  far?: number | null;
  bcr?: number | null;
  parkingCount?: number | null;
  parkingPerHousehold?: number | null;
  brand?: string | null;
  maxFloor?: number | null;
  minFloor?: number | null;
  txKey?: string | null;
  isPublicRental?: boolean | null;
  starbucksName?: string | null;
  starbucksAddress?: string | null;
  starbucksCoordinates?: string | null;
  distanceToStarbucks?: number | null;
  mcdonaldsName?: string | null;
  mcdonaldsAddress?: string | null;
  mcdonaldsCoordinates?: string | null;
  distanceToMcDonalds?: number | null;
  oliveYoungName?: string | null;
  oliveYoungAddress?: string | null;
  oliveYoungCoordinates?: string | null;
  distanceToOliveYoung?: number | null;
  daisoName?: string | null;
  daisoAddress?: string | null;
  daisoCoordinates?: string | null;
  distanceToDaiso?: number | null;
  supermarketName?: string | null;
  supermarketAddress?: string | null;
  supermarketCoordinates?: string | null;
  distanceToSupermarket?: number | null;
}

/** Apartment metadata item for architectural specs */
export interface ApartmentMetaItem {
  dong?: string;
  txKey?: string;
  isPublicRental?: boolean;
  householdCount?: number;
  yearBuilt?: string;
  brand?: string;
  far?: number;
  bcr?: number;
  parkingPerHousehold?: number;
}

export type AptMeta = ApartmentMetaItem;
export type ApartmentMeta = Record<string, ApartmentMetaItem>;

/** Apartment area/pyeong mapping entry */
export interface TypeMapItem {
  aptName: string;
  area: string;
  typeM2: string;
  typePyeong: string;
}

export type TypeMapEntry = TypeMapItem;

/** Generic Point of Interest (POI) data */
export interface POIData {
  name: string;
  lat: number;
  lng: number;
  address?: string;
}

/** School Point of Interest */
export interface SchoolPOI extends POIData {
  type: string;
}

/** Railway/Subway Station Point of Interest */
export interface StationPOI extends POIData {
  line: string;
}

/** Academy/Hagwon Point of Interest */
export interface AcademyPOI extends POIData {
  category: string;
}

/** Restaurant Point of Interest */
export interface RestaurantPOI extends POIData {
  category: string;
}

/** Apartment Point of Interest */
export interface ApartmentPOI extends POIData {
  householdCount?: number;
  yearBuilt?: string;
  far?: number;
  bcr?: number;
  parkingCount?: number;
  brand?: string;
}

/** Location score distance metrics item */
export interface LocationScoreItem {
  distanceToSubway?: number;
  distanceToElementary?: number;
  distanceToMiddle?: number;
  distanceToHigh?: number;
  distanceToStarbucks?: number;
  distanceToOliveYoung?: number;
  distanceToIndeokwon?: number;
  distanceToTram?: number;
  [key: string]: unknown;
}

export type LocationScore = LocationScoreItem;
