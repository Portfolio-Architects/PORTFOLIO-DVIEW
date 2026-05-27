import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });

import { fetchSheetApartmentsByDong, fetchSheetTypeMap } from '../src/lib/services/googleSheets';

async function run() {
  console.log('--- RUN 1 (Cold or Redis HIT) ---');
  let start = Date.now();
  const [apts1, typeMap1] = await Promise.all([
    fetchSheetApartmentsByDong(),
    fetchSheetTypeMap()
  ]);
  console.log(`Run 1 complete in ${Date.now() - start}ms`);

  console.log('\n--- RUN 2 (Warm - In Memory Cache) ---');
  start = Date.now();
  const [apts2, typeMap2] = await Promise.all([
    fetchSheetApartmentsByDong(),
    fetchSheetTypeMap()
  ]);
  console.log(`Run 2 complete in ${Date.now() - start}ms`);
}

run().catch(console.error);
