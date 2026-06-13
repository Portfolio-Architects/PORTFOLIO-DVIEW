const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const { z } = require('zod');

// Zod schema to validate uploaded rent CSV records
const RentCsvRecordSchema = z.object({
  dong: z.string().min(1, '법정동명이 누락되었습니다.'),
  aptName: z.string().min(1, '아파트명이 누락되었습니다.'),
  area: z.coerce.number().positive('면적이 유효하지 않습니다.'),
  areaPyeong: z.coerce.number().positive('평수가 유효하지 않습니다.'),
  contractYm: z.string().length(6, '계약년월은 6자리여야 합니다.'),
  contractDay: z.string().min(1, '계약일이 누락되었습니다.').max(2),
  price: z.coerce.number().int().nonnegative('매매가격(보증금)이 유효하지 않습니다.'),
  deposit: z.coerce.number().int().nonnegative('보증금이 유효하지 않습니다.'),
  monthlyRent: z.coerce.number().int().nonnegative('월세가 유효하지 않습니다.'),
  floor: z.coerce.number().int('층수 정보가 유효하지 않습니다.'),
  buildYear: z.coerce.number().int('건축년도가 유효하지 않습니다.'),
  dealType: z.string().min(1, '거래구분이 누락되었습니다.'),
  contractDate: z.string().length(8, '계약일자는 8자리여야 합니다.'),
  source: z.literal('csv_rent_import'),
  reqGb: z.string().optional(),
  rnuYn: z.string().optional()
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

function extractDong(sigungu) {
  const parts = sigungu.split(/\s+/);
  return parts[parts.length - 1] || '';
}

async function main() {
  let csvPath = process.argv[2];
  if (!csvPath) {
    const desktop = path.join(process.env.USERPROFILE || process.env.HOME || '', 'OneDrive', '바탕 화면');
    const files = fs.readdirSync(desktop).filter(f => f.includes('전월세') && f.endsWith('.csv'));
    if (files.length === 0) {
      console.error('❌ 바탕화면에서 전월세 실거래가 CSV를 찾을 수 없습니다');
      process.exit(1);
    }
    csvPath = path.join(desktop, files[files.length - 1]);
  }

  console.log(`📂 CSV 파일 읽는 중: ${csvPath}`);
  
  const buffer = fs.readFileSync(csvPath);
  const content = iconv.decode(buffer, 'euc-kr');
  const lines = content.split('\n').map(l => l.replace(/\r$/, ''));

  console.log(`📋 총 ${lines.length}줄`);

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

  const records = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cols = parseCSV(line);
    if (cols.length < 10) continue;
    
    const no = cols[0];
    if (!no || isNaN(parseInt(no))) continue;

    const sigungu = cols[1] || '';
    const dong = extractDong(sigungu);
    const aptName = (cols[5] || '').trim();
    const dealType = (cols[6] || '').trim(); 
    const area = parseFloat(cols[7]) || 0;
    const contractYm = (cols[8] || '').trim();
    const contractDay = (cols[9] || '').trim();
    const depositStr = (cols[10] || '').replace(/,/g, '').trim();
    const monthlyRentStr = (cols[11] || '').replace(/,/g, '').trim();
    
    const reqGb = (cols[16] || '').trim(); // Q열: 계약구분 (신규/갱신)
    const rnuYn = (cols[17] || '').trim(); // R열: 갱신요구권 사용여부 (사용/미사용)
    
    const deposit = parseInt(depositStr) || 0;
    const monthlyRent = parseInt(monthlyRentStr) || 0;
    const floor = parseInt(cols[12]) || 0;
    const buildYear = parseInt(cols[13]) || 0;
    
    if (!aptName || !contractYm) continue;

    const areaPyeong = Math.round(area / 3.3058 * 10) / 10;

    records.push({
      dong,
      aptName,
      area,
      areaPyeong,
      contractYm,
      contractDay,
      price: deposit,
      deposit: deposit,
      monthlyRent: monthlyRent,
      reqGb,
      rnuYn,
      floor,
      buildYear,
      dealType,
      contractDate: `${contractYm}${contractDay.padStart(2, '0')}`,
      source: 'csv_rent_import',
    });
  }

  console.log(`\n✅ CSV 파싱 완료: ${records.length}건`);

  const db = admin.firestore();

  // 중복 데이터 처리를 위한 고유 문서 ID(Deterministic ID)를 사용합니다.
  // 이 방식을 사용하면 Firestore 읽기 연산(get) 없이 병합(merge: true) 쓰기만 발생합니다.
  console.log(`🔥 결정론적 식별자(Deterministic ID)를 기반으로 Firestore Upsert를 준비합니다...`);

  // CSV 자체의 중복을 제거하기 위한 로컬 Set
  const processedKeys = new Set();
  const uniqueRecords = [];

  for (const record of records) {
    const parsed = RentCsvRecordSchema.safeParse(record);
    if (!parsed.success) {
      console.warn(`⚠️ [Rent CSV Upload Fast] Invalid record format at apt ${record.aptName}:`, parsed.error.format());
      console.log(`Record Details: ${JSON.stringify(record)}`);
      continue;
    }

    const validRecord = parsed.data;

    // 괄호, 특수문자, 공백 등 정규화 함수 (AptName 정규화)
    const normalizeAptName = (name) => name.replace(/\[.*?\]\s*/g, '').replace(/\s+/g, '').replace(/[()（）]/g, '').trim();
    
    const normalizedName = normalizeAptName(validRecord.aptName);
    const docId = `rent_${normalizedName}_${validRecord.contractDate}_${validRecord.floor}_${validRecord.deposit}_${validRecord.monthlyRent}`;
    
    if (!processedKeys.has(docId)) {
      processedKeys.add(docId);
      uniqueRecords.push({ docId, record: validRecord });
    }
  }

  console.log(`\n고유 트랜잭션 수: ${uniqueRecords.length}건 (원본 ${records.length}건)`);

  if (uniqueRecords.length === 0) {
      console.log('업데이트할 내역이 없습니다.');
      process.exit(0);
  }

  console.log('🔥 읽기 비용 없이 Firestore 병합(Merge) 쓰기를 시작합니다...');
  
  const chunks = [];
  for (let i = 0; i < uniqueRecords.length; i += 500) {
      chunks.push(uniqueRecords.slice(i, i + 500));
  }

  let successCount = 0;
  for (let i = 0; i < chunks.length; i++) {
      const batch = db.batch();
      chunks[i].forEach(item => {
          const docRef = db.collection('transactions').doc(item.docId);
          // merge: true 옵션으로 Upsert 수행
          batch.set(docRef, item.record, { merge: true });
      });
      await batch.commit();
      successCount += chunks[i].length;
      console.log(` -> 진행률: 배치 ${i + 1}/${chunks.length} 완료 (${successCount}건)`);
  }

  console.log(`\n🎉 전월세 업로드 완료! (총 ${successCount}건 Upsert 완료, 읽기 비용 0)`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ 실패:', err.message);
  process.exit(1);
});
