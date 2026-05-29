import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });

import { fetchSheetApartmentsByDong, fetchSheetTypeMap } from '../src/lib/services/googleSheets';

async function main() {
  console.log('Starting sheet fetch measurement...');
  const start = Date.now();
  
  console.log('Fetching Type Map...');
  const tStart = Date.now();
  const typeMap = await fetchSheetTypeMap();
  console.log(`Type map loaded in ${Date.now() - tStart}ms. Count: ${typeMap.length}`);

  console.log('Fetching Apartments By Dong...');
  const aStart = Date.now();
  const apts = await fetchSheetApartmentsByDong();
  console.log(`Apartments loaded in ${Date.now() - aStart}ms. Total: ${apts.total}, Dongs: ${apts.dongCount}`);

  console.log(`Total time: ${Date.now() - start}ms`);
}

main().catch(console.error);
