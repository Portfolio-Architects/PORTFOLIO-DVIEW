import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });
process.env.BYPASS_LOCAL_CACHE = 'true';

import { fetchSheetApartmentsByDong, fetchSheetTypeMap } from '../src/lib/services/googleSheets';

// Zod schemas for validation
const TypeMapItemSchema = z.object({
  aptName: z.string().min(1, '아파트명이 누락되었습니다.'),
  area: z.string().min(1, '면적이 누락되었습니다.'),
  typeM2: z.string(),
  typePyeong: z.string()
});

const SheetApartmentSchema = z.object({
  ticker: z.string().optional(),
  name: z.string().min(1, '아파트명이 누락되었습니다.'),
  dong: z.string().min(1, '법정동명이 누락되었습니다.'),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  householdCount: z.coerce.number().int().optional(),
  yearBuilt: z.string().optional(),
  far: z.coerce.number().optional(),
  bcr: z.coerce.number().optional(),
  parkingCount: z.coerce.number().int().optional(),
  parkingPerHousehold: z.coerce.number().optional(),
  brand: z.string().optional(),
  maxFloor: z.coerce.number().int().optional(),
  minFloor: z.coerce.number().int().optional(),
  txKey: z.string().optional(),
  isPublicRental: z.boolean().optional(),
  distanceToStarbucks: z.coerce.number().int().optional(),
  starbucksName: z.string().optional(),
  starbucksAddress: z.string().optional(),
  starbucksCoordinates: z.string().optional(),
  distanceToOliveYoung: z.coerce.number().int().optional(),
  oliveYoungName: z.string().optional(),
  oliveYoungAddress: z.string().optional(),
  oliveYoungCoordinates: z.string().optional(),
  distanceToDaiso: z.coerce.number().int().optional(),
  daisoName: z.string().optional(),
  daisoAddress: z.string().optional(),
  daisoCoordinates: z.string().optional(),
  distanceToMcDonalds: z.coerce.number().int().optional(),
  mcdonaldsName: z.string().optional(),
  mcdonaldsAddress: z.string().optional(),
  mcdonaldsCoordinates: z.string().optional(),
  distanceToSupermarket: z.coerce.number().int().optional(),
  supermarketName: z.string().optional(),
  supermarketAddress: z.string().optional(),
  supermarketCoordinates: z.string().optional()
});

const ApartmentsByDongResultSchema = z.object({
  total: z.coerce.number().int().nonnegative(),
  dongCount: z.coerce.number().int().nonnegative(),
  byDong: z.record(z.string(), z.array(SheetApartmentSchema))
});

async function main() {
  console.log('🔄 Starting Static Data Sync from Google Sheets...');
  
  const publicDataDir = path.resolve(__dirname, '../public/data');
  if (!fs.existsSync(publicDataDir)) {
    fs.mkdirSync(publicDataDir, { recursive: true });
  }

  // 1. Sync Type Map
  console.log('📡 Fetching Type Map from Google Sheets...');
  const typeMapStart = Date.now();
  const typeMap = await fetchSheetTypeMap();
  
  // Zod validation for Type Map
  const typeMapParsed = z.array(TypeMapItemSchema).safeParse(typeMap);
  if (!typeMapParsed.success) {
    console.error('❌ Type Map validation failed:', typeMapParsed.error.format());
    process.exit(1);
  }
  const validatedTypeMap = typeMapParsed.data;

  const typeMapPath = path.join(publicDataDir, 'type-map.json');
  fs.writeFileSync(typeMapPath, JSON.stringify(validatedTypeMap, null, 2), 'utf-8');
  console.log(`✅ Saved ${validatedTypeMap.length} type map items to ${typeMapPath} (${Date.now() - typeMapStart}ms)`);

  // 2. Sync Apartments by Dong
  console.log('📡 Fetching and calculating Apartments by Dong (including distance calculations)...');
  const aptsStart = Date.now();
  const aptsData = await fetchSheetApartmentsByDong();
  
  // Zod validation for Apartments by Dong
  const aptsParsed = ApartmentsByDongResultSchema.safeParse(aptsData);
  if (!aptsParsed.success) {
    console.error('❌ Apartments by Dong validation failed:', aptsParsed.error.format());
    process.exit(1);
  }
  const validatedAptsData = aptsParsed.data;

  const aptsPath = path.join(publicDataDir, 'apartments-by-dong.json');
  fs.writeFileSync(aptsPath, JSON.stringify(validatedAptsData, null, 2), 'utf-8');
  console.log(`✅ Saved ${validatedAptsData.total} apartments across ${validatedAptsData.dongCount} dongs to ${aptsPath} (${Date.now() - aptsStart}ms)`);

  console.log('🎉 Static Data Sync Completed Successfully!');
}

main().catch(err => {
  console.error('❌ Static Data Sync Failed:', err);
  process.exit(1);
});
