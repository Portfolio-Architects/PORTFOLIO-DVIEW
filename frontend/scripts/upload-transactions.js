/**
 * CSV → Firestore 업로더
 * 국토교통부 실거래가 CSV를 읽어서 Firestore 'transactions' 컬렉션에 저장
 * 
 * 사용법: node scripts/upload-transactions.js <csv파일경로>
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const { z } = require('zod');

// Zod schema to validate uploaded transaction CSV records
const UploadTransactionRecordSchema = z.object({
  dong: z.string().min(1, '법정동명이 누락되었습니다.'),
  aptName: z.string().min(1, '아파트명이 누락되었습니다.'),
  area: z.coerce.number().positive('면적이 유효하지 않습니다.'),
  areaPyeong: z.coerce.number().positive('평수가 유효하지 않습니다.'),
  contractYm: z.string().length(6, '계약년월은 6자리여야 합니다.'),
  contractDay: z.string().min(1, '계약일이 누락되었습니다.').max(2),
  price: z.coerce.number().int().nonnegative('거래가격이 유효하지 않습니다.'),
  floor: z.coerce.number().int('층수 정보가 유효하지 않습니다.'),
  buildYear: z.coerce.number().int('건축년도가 유효하지 않습니다.'),
  dealType: z.string().min(1, '거래구분이 누락되었습니다.'),
  contractDate: z.string().length(8, '계약일자는 8자리여야 합니다.')
});

function getAdminCredentials() {
  try {
    const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
      return JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    }
  } catch {
    // ignore
  }

  // Load from local .env.local if exists
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const lines = content.split('\n');
      const env = {};
      lines.forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
          env[key] = val;
        }
      });
      
      if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        try {
          return JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
        } catch (e) {
          console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e);
        }
      }
      
      const privateKey = env.FIREBASE_ADMIN_PRIVATE_KEY || env.GOOGLE_PRIVATE_KEY;
      const clientEmail = env.FIREBASE_ADMIN_CLIENT_EMAIL || env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'portfolio-dtdls';
      
      if (privateKey && clientEmail) {
        return {
          projectId,
          clientEmail,
          client_email: clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
          private_key: privateKey.replace(/\\n/g, '\n')
        };
      }
    }
  } catch (e) {
    console.error('Env load error:', e);
  }

  return null;
}

if (!admin.apps.length) {
  const creds = getAdminCredentials();
  if (creds) {
    admin.initializeApp({ credential: admin.credential.cert(creds) });
  } else {
    admin.initializeApp({ projectId: 'portfolio-dtdls' });
  }
}

function parseCSV(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// 동 이름 추출 (시군구에서)
function extractDong(sigungu) {
  // "경기도 화성시 동탄구 여울동" → "여울동"
  const parts = sigungu.split(/\s+/);
  return parts[parts.length - 1] || '';
}

async function main() {
  // CSV 경로: CLI 인자 또는 바탕화면에서 자동 탐색
  let csvPath = process.argv[2];
  if (!csvPath) {
    const desktop = path.join(process.env.USERPROFILE || '', 'OneDrive', '바탕 화면');
    const files = fs.readdirSync(desktop).filter(f => f.includes('실거래가') && f.endsWith('.csv'));
    if (files.length === 0) {
      console.error('❌ 바탕화면에서 실거래가 CSV를 찾을 수 없습니다');
      process.exit(1);
    }
    csvPath = path.join(desktop, files[files.length - 1]); // 가장 최근 파일
  }

  console.log(`📂 CSV 파일 읽는 중: ${csvPath}`);
  
  // EUC-KR 인코딩으로 읽기
  const buffer = fs.readFileSync(csvPath);
  const content = iconv.decode(buffer, 'euc-kr');
  const lines = content.split('\n').map(l => l.replace(/\r$/, ''));

  console.log(`📋 총 ${lines.length}줄`);

  // 헤더 찾기 (NO로 시작하는 줄)
  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const parsed = parseCSV(lines[i]);
    if (parsed[0] === 'NO' || parsed[0] === '"NO"') {
      headerIdx = i;
      break;
    }
  }
  
  if (headerIdx === -1) {
    console.error('❌ 헤더를 찾을 수 없습니다');
    process.exit(1);
  }

  const header = parseCSV(lines[headerIdx]);
  console.log(`📊 헤더 (${headerIdx}번째 줄): ${header.join(' | ')}`);

  // 데이터 파싱
  const records = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cols = parseCSV(line);
    if (cols.length < 12) continue;
    
    const no = cols[0];
    if (!no || isNaN(parseInt(no))) continue; // 숫자가 아니면 스킵

    const sigungu = cols[1] || '';
    const dong = extractDong(sigungu);
    const aptName = (cols[5] || '').trim();
    const area = parseFloat(cols[6]) || 0;
    const contractYm = (cols[7] || '').trim();
    const contractDay = (cols[8] || '').trim();
    const priceStr = (cols[9] || '').replace(/,/g, '').trim();
    const price = parseInt(priceStr) || 0;
    const floor = parseInt(cols[11]) || 0;
    const buildYear = parseInt(cols[14]) || 0;
    const dealType = (cols[17] || '').trim();
    
    if (!aptName || !contractYm || price === 0) continue;

    // 평수 계산 (전용면적 ÷ 3.3058)
    const areaPyeong = Math.round(area / 3.3058 * 10) / 10;

    records.push({
      dong,
      aptName,
      area,
      areaPyeong,
      contractYm,
      contractDay,
      price,
      floor,
      buildYear,
      dealType,
      // contractDate for ordering
      contractDate: `${contractYm}${contractDay.padStart(2, '0')}`,
    });
  }

  console.log(`\n✅ 파싱 완료: ${records.length}건`);
  
  // 미리보기
  console.log('\n📋 미리보기 (처음 5건):');
  records.slice(0, 5).forEach((r, i) => {
    const eok = Math.floor(r.price / 10000);
    const rem = r.price % 10000;
    const priceStr = eok > 0 ? (rem > 0 ? `${eok}억${rem.toLocaleString()}` : `${eok}억`) : `${r.price.toLocaleString()}만`;
    console.log(`  ${i+1}. ${r.aptName} | ${r.contractYm}.${r.contractDay} | ${priceStr} | ${r.areaPyeong}평 | ${r.floor}층 | ${r.dong}`);
  });

  // 아파트별 통계
  const byApt = {};
  records.forEach(r => {
    if (!byApt[r.aptName]) byApt[r.aptName] = 0;
    byApt[r.aptName]++;
  });
  console.log(`\n📊 아파트별 거래 건수:`);
  Object.entries(byApt).sort((a, b) => b[1] - a[1]).forEach(([apt, cnt]) => {
    console.log(`  ${apt}: ${cnt}건`);
  });

  // Firestore 업로드
  console.log('\n🔥 Firestore에 업로드 중...');
  const db = admin.firestore();
  const collRef = db.collection('transactions');

  let uploaded = 0;
  let skipped = 0;

  for (const record of records) {
    const parsed = UploadTransactionRecordSchema.safeParse(record);
    if (!parsed.success) {
      console.warn(`⚠️ [Transactions CSV Upload] Invalid record format at apt ${record.aptName}:`, parsed.error.format());
      console.log(`Record Details: ${JSON.stringify(record)}`);
      continue;
    }

    const validRecord = parsed.data;

    const dupSnap = await collRef
      .where('aptName', '==', validRecord.aptName)
      .where('contractDate', '==', validRecord.contractDate)
      .where('price', '==', validRecord.price)
      .where('floor', '==', validRecord.floor)
      .get();
    
    if (!dupSnap.empty) {
      skipped++;
      continue;
    }

    await collRef.add(validRecord);
    uploaded++;
  }

  console.log(`\n🎉 업로드 완료!`);
  console.log(`  ✅ 신규 추가: ${uploaded}건`);
  console.log(`  ⏭️ 중복 스킵: ${skipped}건`);

  process.exit(0);
}

main().catch(err => {
  console.error('❌ 실패:', err.message);
  process.exit(1);
});
