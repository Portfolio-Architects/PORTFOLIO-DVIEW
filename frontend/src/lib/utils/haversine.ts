/**
 * @module haversine
 * @description Haversine formula for calculating great-circle distance
 * between two points on Earth's surface.
 * Used for apartment-to-POI distance calculations.
 */

import { z } from 'zod';
import { logger } from '@/lib/services/logger';

/** Earth's mean radius in meters */
const EARTH_RADIUS_M = 6_371_000;

/** Zod schema for geographic coordinates */
export const CoordSchema = z.object({
  lat: z.union([z.string(), z.number()]).transform(val => Number(val)).refine(val => !isNaN(val) && val >= -90 && val <= 90),
  lng: z.union([z.string(), z.number()]).transform(val => Number(val)).refine(val => !isNaN(val) && val >= -180 && val <= 180),
});

/** A geographic coordinate (latitude, longitude in degrees) */
export type Coord = z.infer<typeof CoordSchema>;

/**
 * Calculates the Haversine distance between two coordinates.
 * @returns Distance in meters (rounded to nearest integer)
 */
export function haversineDistance(a: any, b: any): number {
  const parsedA = CoordSchema.safeParse(a);
  const parsedB = CoordSchema.safeParse(b);
  if (!parsedA.success || !parsedB.success) {
    return 0;
  }
  const coordA = parsedA.data;
  const coordB = parsedB.data;

  const dLat = toRad(coordB.lat - coordA.lat);
  const dLng = toRad(coordB.lng - coordA.lng);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);

  const h = sinLat * sinLat +
    Math.cos(toRad(coordA.lat)) * Math.cos(toRad(coordB.lat)) * sinLng * sinLng;

  // Prevent Math.asin(Math.sqrt(h)) from returning NaN if h is slightly out of [0, 1] bounds due to precision errors
  const clampedH = Math.max(0, Math.min(1, h));
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(clampedH)));
}

/**
 * Finds the nearest POI from a list and returns its name + distance.
 */
export function findNearest<T extends Coord & { name: string }>(
  origin: Coord,
  pois: T[]
): (T & { distance: number }) | null {
  const parsedOrigin = CoordSchema.safeParse(origin);
  if (!parsedOrigin.success) {
    logger.warn('haversine.findNearest', 'Invalid origin coordinate', { origin, error: String(parsedOrigin.error) });
    return null;
  }
  const vOrigin = parsedOrigin.data;
  if (!pois || pois.length === 0) return null;

  let nearest: T | null = null;
  let minDist = Infinity;

  for (const poi of pois) {
    const parsedPoi = CoordSchema.safeParse(poi);
    if (!parsedPoi.success) {
      logger.warn('haversine.findNearest', `Invalid POI coordinate for ${poi?.name}`, { poi, error: String(parsedPoi.error) });
      continue;
    }
    const dist = haversineDistance(vOrigin, parsedPoi.data);
    if (dist < minDist) {
      minDist = dist;
      nearest = poi;
    }
  }

  if (!nearest) return null;
  return { ...nearest, distance: minDist };
}

/**
 * Counts POIs within a given radius (meters) from origin.
 */
export function countWithinRadius(origin: Coord, pois: Coord[], radiusM: number): number {
  const parsedOrigin = CoordSchema.safeParse(origin);
  if (!parsedOrigin.success) return 0;
  const vOrigin = parsedOrigin.data;

  if (!pois || !Array.isArray(pois)) return 0;
  return pois.filter(p => {
    const parsedP = CoordSchema.safeParse(p);
    return parsedP.success && haversineDistance(vOrigin, parsedP.data) <= radiusM;
  }).length;
}

/**
 * Parses a "lat, lng" string into a Coord object.
 * Supports both "37.2083, 127.0588" and separate lat/lng values.
 */
export function parseCoordString(coordStr: string): Coord | null {
  if (!coordStr || typeof coordStr !== 'string') return null;
  // Clean brackets, parentheses, braces, and spaces
  const cleaned = coordStr.replace(/[\[\]\(\)\{\}\s]/g, '');
  const parts = cleaned.split(',').map(s => parseFloat(s));
  if (parts.length >= 2) {
    const parsed = CoordSchema.safeParse({ lat: parts[0], lng: parts[1] });
    if (parsed.success) {
      return parsed.data;
    }
  }
  return null;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

