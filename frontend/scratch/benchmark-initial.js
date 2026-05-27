const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });

const { Redis } = require("@upstash/redis");
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const adminDb = admin.firestore();

const SHEET_ID = '1rKMt-B2FdN5nGaxaU0y2Pqv1WqnEv1AGnY7XXE7pCEE';

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

async function fetchCsv(sheetName) {
  const cacheKey = `DTDLS:cache:sheets:${sheetName}`;
  const start = Date.now();
  
  // Try Redis
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`[Redis HIT] ${sheetName} loaded in ${Date.now() - start}ms`);
      return cached.data;
    }
  } catch (e) {
    console.warn('Redis failed:', e);
  }

  // Go to Google Sheets
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&headers=1&_t=${Date.now()}`;
  const res = await fetch(csvUrl);
  const text = await res.text();
  const rows = text.split('\n').filter(l => l.trim()).map(parseCsvLine).map(row => row.map(v => v.replace(/^"|"$/g, '').trim()));
  console.log(`[Google Live] ${sheetName} loaded in ${Date.now() - start}ms`);

  // Write to Redis
  try {
    await redis.set(cacheKey, { data: rows, timestamp: Date.now() });
  } catch (e) {
    console.warn('Redis write failed:', e);
  }

  return rows;
}

async function runBenchmark() {
  console.log('Running initial data benchmark...');
  const overallStart = Date.now();

  const startFav = Date.now();
  const fetchFavCounts = async () => {
    const cachedCounts = await redis.hgetall('DTDLS:cache:favoriteCounts');
    console.log(`[FavCounts] Done in ${Date.now() - startFav}ms (keys: ${Object.keys(cachedCounts || {}).length})`);
  };

  const startMeta = Date.now();
  const fetchMeta = async () => {
    const doc = await adminDb.doc('settings/apartmentMeta').get();
    console.log(`[Firestore Meta] Done in ${Date.now() - startMeta}ms`);
  };

  const startReports = Date.now();
  const fetchReports = async () => {
    const snap = await adminDb.collection('scoutingReports').orderBy('createdAt', 'desc').limit(30).get();
    console.log(`[Firestore Reports] Done in ${Date.now() - startReports}ms (count: ${snap.docs.length})`);
  };

  const startTypeMap = Date.now();
  const fetchTypeMap = async () => {
    const rows = await fetchCsv('TYPE_MAP');
    console.log(`[TypeMap] Done in ${Date.now() - startTypeMap}ms (rows: ${rows.length})`);
  };

  const startApts = Date.now();
  const fetchApts = async () => {
    const [aptRows, sboydsRows, restRows] = await Promise.all([
      fetchCsv('APARTMENTS'),
      fetchCsv('SBOYDS'),
      fetchCsv('RESTAURANTS')
    ]);
    console.log(`[Apt Sheets Fetched] Done in ${Date.now() - startApts}ms`);
    
    // Now loop
    const parseStart = Date.now();
    // (Simulate parsing and distances loop)
    console.log(`[Apt Loop Processed] Done in ${Date.now() - parseStart}ms`);
  };

  await Promise.all([
    fetchFavCounts(),
    fetchMeta(),
    fetchReports(),
    fetchTypeMap(),
    fetchApts(),
  ]);

  console.log(`\n=============================================`);
  console.log(`Total concurrent getInitialData: ${Date.now() - overallStart}ms`);
  console.log(`=============================================`);
  
  process.exit(0);
}

runBenchmark().catch(console.error);
