import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });
process.env.BYPASS_LOCAL_CACHE = 'true';

import { fetchSheetApartmentsByDong, fetchSheetTypeMap } from '../src/lib/services/googleSheets';

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
  const typeMapPath = path.join(publicDataDir, 'type-map.json');
  fs.writeFileSync(typeMapPath, JSON.stringify(typeMap, null, 2), 'utf-8');
  console.log(`✅ Saved ${typeMap.length} type map items to ${typeMapPath} (${Date.now() - typeMapStart}ms)`);

  // 2. Sync Apartments by Dong
  console.log('📡 Fetching and calculating Apartments by Dong (including distance calculations)...');
  const aptsStart = Date.now();
  const aptsData = await fetchSheetApartmentsByDong();
  const aptsPath = path.join(publicDataDir, 'apartments-by-dong.json');
  fs.writeFileSync(aptsPath, JSON.stringify(aptsData, null, 2), 'utf-8');
  console.log(`✅ Saved ${aptsData.total} apartments across ${aptsData.dongCount} dongs to ${aptsPath} (${Date.now() - aptsStart}ms)`);

  console.log('🎉 Static Data Sync Completed Successfully!');
}

main().catch(err => {
  console.error('❌ Static Data Sync Failed:', err);
  process.exit(1);
});
