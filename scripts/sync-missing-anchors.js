/**
 * scripts/sync-missing-anchors.js
 * Automatically checks the user's Google Sheet "테크노밸리_입주기업" tab
 * and appends high-fidelity geolocated representative anchors (like Jahwa Electronics R&D Center)
 * if they are missing, preventing the need for manual copy-pasting.
 */
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
const envLocalPath = path.resolve(__dirname, '../frontend/.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const matched = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
    if (matched) {
      const key = matched[1];
      let value = matched[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

const SHEET_ID = '1rKMt-B2FdN5nGaxaU0y2Pqv1WqnEv1AGnY7XXE7pCEE';

const REPRE_ANCHORS = [
  { category: '반도체·첨단제조', name: '자화전자 R&D센터 동탄연구소', address: '경기도 화성시 동탄대로23길 41' },
  { category: '반도체·첨단제조', name: '도쿄일렉트론코리아', address: '경기도 화성시 동탄첨단산업1로 27, 금강펜테리움 IX타워' },
  { category: '반도체·첨단제조', name: '어플라이드 머티리얼즈 코리아', address: '경기도 화성시 동탄기흥로 614-26, 자사빌딩' },
  { category: '반도체·첨단제조', name: '에이에스엠코리아', address: '경기도 화성시 동탄기흥로 635, 자사빌딩' },
  { category: '반도체·첨단제조', name: '케이씨텍', address: '경기도 화성시 동탄기흥로 642, 자사빌딩' },
  { category: '반도체·첨단제조', name: '서플러스글로벌', address: '경기도 화성시 동탄대로22길 32, 자사빌딩' },
  { category: '반도체·첨단제조', name: '에스앤에스텍', address: '경기도 화성시 동탄첨단산업1로 27, 금강펜테리움 IX타워' },
  { category: '바이오·헬스케어', name: '우정바이오', address: '경기도 화성시 동탄기흥로 593-8, 우정바이오 신약클러스터' },
  { category: '바이오·헬스케어', name: '한미약품 연구센터', address: '경기도 화성시 동탄대로22길 125, 한미약품 연구센터' },
  { category: '바이오·헬스케어', name: '서린바이오', address: '경기도 화성시 동탄대로21길 15, 서린바이오 글로벌센터' },
  { category: '바이오·헬스케어', name: '녹십자웰빙', address: '경기도 화성시 동탄첨단산업1로 27, 금강펜테리움 IX타워' },
  { category: '지식기반 서비스', name: '기술보증기금 동탄', address: '경기도 화성시 동탄대로21길 26, SH타임스퀘어' },
  { category: '지식기반 서비스', name: '특허법인 지산', address: '경기도 화성시 동탄첨단산업1로 27, 금강펜테리움 IX타워' },
  { category: '정밀기기 및 기타', name: '신도리코 R&D', address: '경기도 화성시 동탄기흥로 568, 자사빌딩' },
  { category: 'IT·소프트웨어', name: '한국아이티에스', address: '경기도 화성시 동탄대로22길 17, 자사빌딩' },
  { category: 'IT·소프트웨어', name: '위즈코리아', address: '경기도 화성시 동탄대로21길 26, SH타임스퀘어' },
  { category: 'IT·소프트웨어', name: '제이앤제이 테크', address: '경기도 화성시 동탄대로21길 26, SH타임스퀘어' }
];

function cleanCompanyName(name) {
  return name.replace(/\(주\)|주식회사/g, '').trim();
}

async function main() {
  const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    console.error('Missing Google Service Account credentials in .env.local');
    process.exit(1);
  }

  const formattedKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '');
  const serviceAccountAuth = new JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: formattedKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
  console.log('Connecting to Google Spreadsheet...');
  await doc.loadInfo();
  
  const tabName = '테크노밸리_입주기업';
  let sheet = doc.sheetsByTitle[tabName];
  if (!sheet) {
    console.log(`Tab "${tabName}" not found. Creating it...`);
    sheet = await doc.addSheet({ title: tabName, headerValues: ['구분', '회사명', '주소'] });
  }

  console.log(`Reading rows from tab "${tabName}"...`);
  const rows = await sheet.getRows();
  
  // Scrape column headers to find correct keys
  const headers = sheet.headerValues;
  const col = (names) => headers.find(h => names.includes(h.toLowerCase().trim())) || headers[0];
  const catCol = col(['구분', '분류', 'category']);
  const nameCol = col(['회사명', '기업명', '상호', 'name']);
  const addrCol = col(['주소', '입주건물', '건물명', 'building', 'address']);

  console.log(`Mapped columns: 구분='${catCol}', 회사명='${nameCol}', 주소='${addrCol}'`);

  const existingCleanNames = new Set();
  rows.forEach(row => {
    const rawName = row.get(nameCol);
    if (rawName) {
      existingCleanNames.add(cleanCompanyName(rawName));
    }
  });

  let appendedCount = 0;
  for (const item of REPRE_ANCHORS) {
    const cleanName = cleanCompanyName(item.name);
    if (!existingCleanNames.has(cleanName)) {
      console.log(`Appending missing anchor: ${item.name} (${item.category})`);
      const newRow = {};
      newRow[catCol] = item.category;
      newRow[nameCol] = item.name;
      newRow[addrCol] = item.address;
      await sheet.addRow(newRow);
      existingCleanNames.add(cleanName);
      appendedCount++;
    }
  }

  console.log(`Finished. Appended ${appendedCount} missing anchor companies.`);
}

main().catch(err => {
  console.error('Error running script:', err);
  process.exit(1);
});
