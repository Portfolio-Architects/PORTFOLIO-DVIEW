const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.PUBLIC_DATA_PORTAL_KEY || '4611c02045e69b5e6c0bf50b9ecbee6de92e7ee0351eb8a7d529253340f755ff';

const BUILDING_MAPPING = [
  { key: '금강 IX', jibunIncludes: '844' },
  { key: '실리콘앨리', jibunIncludes: '823' },
  { key: 'SH타임', jibunIncludes: '853' },
  { key: '더퍼스트', jibunIncludes: '835' },
  { key: 'SK V1', jibunIncludes: '836' },
  { key: '에이팩시티', jibunIncludes: '838' },
  { key: '테라타워', jibunIncludes: '824' },
  { key: 'IT타워', jibunIncludes: '826' },
  { key: '메가비즈타워', jibunIncludes: '852' },
  { key: '비즈타워', jibunIncludes: '851' }
];

async function getLatestUddiPath() {
  console.log('Fetching latest UDDI path from Swagger docs...');
  try {
    const res = await axios.get('https://infuser.odcloud.kr/oas/docs?namespace=15083277/v1', { timeout: 10000 });
    const paths = Object.keys(res.data.paths);
    
    // Sort paths by summary description (e.g. "국민연금공단_국민연금 가입 사업장 내역_20260623") descending
    const summaries = paths.map(p => ({ path: p, summary: res.data.paths[p].get.summary }));
    summaries.sort((a, b) => b.summary.localeCompare(a.summary));
    
    if (summaries.length > 0) {
      console.log(`Found latest API: ${summaries[0].summary}`);
      return summaries[0].path; // e.g., "/15083277/v1/uddi:b2243a59-a261-4dc6-a4f3-cfcbc478d231"
    }
  } catch (err) {
    console.warn('Failed to fetch dynamic UDDI, falling back to 2026-06-23 version.', err.message);
  }
  return '/15083277/v1/uddi:b2243a59-a261-4dc6-a4f3-cfcbc478d231';
}

async function syncNpsData() {
  console.log('Starting NPS Data Sync for Yeongcheon-dong...');
  
  const endpointPath = await getLatestUddiPath();
  const url = `https://api.odcloud.kr/api${endpointPath}`;
  
  let page = 1;
  const perPage = 3000;
  let allRecords = [];
  let hasMore = true;

  while (hasMore) {
    console.log(`Fetching page ${page}...`);
    try {
      const response = await axios.get(url, {
        params: {
          serviceKey: API_KEY,
          page,
          perPage,
          returnType: 'JSON',
          'cond[사업장지번상세주소::LIKE]': '영천동'
        },
        timeout: 15000
      });

      const data = response.data.data || [];
      if (data.length === 0) {
        hasMore = false;
        break;
      }

      allRecords = allRecords.concat(data);
      console.log(`Received ${data.length} records. Total so far: ${allRecords.length}`);

      if (data.length < perPage) {
        hasMore = false;
      } else {
        page++;
      }
    } catch (err) {
      console.error('API Error during NPS fetch:', err.response ? err.response.data : err.message);
      hasMore = false;
      break;
    }
  }

  console.log(`\nFetch complete. Processing ${allRecords.length} total active companies in Yeongcheon-dong.`);

  const stats = {
    yeongcheonDong: {
      companiesCount: 0,
      totalEmployees: 0,
      newHires: 0,
      departures: 0
    }
  };

  allRecords.forEach(record => {
    const jibun = record['사업장지번상세주소'] || '';
    if (!jibun.includes('화성시') || !jibun.includes('영천동')) {
      return; // Skip other Yeongcheon-dongs (e.g., Seodaemun-gu)
    }

    const employees = parseInt(record['가입자수'], 10) || 0;
    const newH = parseInt(record['신규취득자수'], 10) || 0;
    const dep = parseInt(record['상실가입자수'], 10) || 0;

    stats.yeongcheonDong.companiesCount++;
    stats.yeongcheonDong.totalEmployees += employees;
    stats.yeongcheonDong.newHires += newH;
    stats.yeongcheonDong.departures += dep;
  });

  const outPath = path.join(__dirname, '../src/lib/data/nps_stats.json');
  
  // Ensure directory exists
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const finalData = {
    updatedAt: new Date().toISOString(),
    sourceEndpoint: endpointPath,
    stats
  };

  fs.writeFileSync(outPath, JSON.stringify(finalData, null, 2), 'utf-8');
  console.log(`\nSuccessfully wrote NPS stats to ${outPath}`);
  console.log(JSON.stringify(stats, null, 2));
}

syncNpsData().catch(err => {
  console.error('Fatal error during sync-nps:', err);
  process.exit(1);
});
