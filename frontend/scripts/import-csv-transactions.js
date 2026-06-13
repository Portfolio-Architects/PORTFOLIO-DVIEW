#!/usr/bin/env node
/**
 * 국토교통부 실거래가 CSV → Firestore 업로드 + transaction-summary.ts 재생성
 * 
 * 사용법: node scripts/import-csv-transactions.js <csv파일경로>
 * 
 * 1. CSV 파일 파싱 (EUC-KR → UTF-8)
 * 2. Firestore 'transactions' 컬렉션에 중복 체크 후 신규 건만 추가
 * 3. sync-transactions.js 와 동일한 로직으로 transaction-summary.ts 재생성
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

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
const iconv = require('iconv-lite');
const { validateTransactions, printValidationReport, saveValidationReport } = require('./validate-transactions');
const { z } = require('zod');

// Zod schema for validation of CSV Import Transaction Record
const CsvImportRecordSchema = z.object({
  aptName: z.string().min(1, '아파트명이 누락되었습니다.'),
  contractYm: z.string().length(6, '계약년월은 6자리여야 합니다.'),
  contractDay: z.string().length(2, '계약일은 2자리여야 합니다.'),
  price: z.coerce.number().int().nonnegative('거래가격이 유효하지 않습니다.'),
  deposit: z.coerce.number().int().nonnegative('보증금이 유효하지 않습니다.'),
  monthlyRent: z.coerce.number().int().nonnegative('월세가 유효하지 않습니다.'),
  dealType: z.string().min(1, '거래구분이 누락되었습니다.'),
  area: z.coerce.number().positive('면적이 유효하지 않습니다.'),
  areaPyeong: z.coerce.number().positive('평수가 유효하지 않습니다.'),
  floor: z.coerce.number().int('층수 정보가 유효하지 않습니다.'),
  dong: z.string().min(1, '법정동명이 누락되었습니다.'),
  contractDate: z.string().length(8, '계약일자는 8자리여야 합니다.')
});

const OUTPUT_PATH = path.resolve(__dirname, '../src/lib/transaction-summary.ts');

function formatPriceEok(priceMan) {
  const eok = Math.floor(priceMan / 10000);
  const remainder = priceMan % 10000;
  if (eok === 0) return `${priceMan.toLocaleString()}만`;
  if (remainder === 0) return `${eok}억`;
  return `${eok}억${remainder.toLocaleString()}`;
}

function normalizeAptName(name) {
  return name.replace(/\[.*?\]\s*/g, '').replace(/\s+/g, '').replace(/[()（）]/g, '').trim();
}

/** CSV 파싱 — 쉼표 포함된 따옴표 필드 지원 */
function parseCsvLine(line) {
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

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('사용법: node scripts/import-csv-transactions.js <CSV파일경로>');
    process.exit(1);
  }

  // 1. CSV 파싱
  console.log(`📂 CSV 파일 읽는 중: ${csvPath}`);
  const buf = fs.readFileSync(csvPath);
  const txt = iconv.decode(buf, 'euc-kr');
  const lines = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // 헤더 행 찾기 ("NO" 로 시작하는 줄)
  const headerIdx = lines.findIndex(l => l.startsWith('"NO"'));
  if (headerIdx < 0) {
    console.error('❌ CSV 헤더를 찾을 수 없습니다.');
    process.exit(1);
  }

  const headers = parseCsvLine(lines[headerIdx]);
  const idx = (name) => headers.findIndex(h => h.includes(name));
  
  const iSigungu = idx('시군구');
  const iAptName = headers.findIndex(h => h.includes('아파트') || h.includes('단지명'));
  const iArea = idx('전용면적');
  const iContractYm = idx('계약년월');
  const iContractDay = idx('계약일');
  const iFloor = idx('층');
  
  const iPrice = idx('거래금액'); // 매매
  const iDealType = idx('전월세구분'); // 전월세
  const iDeposit = idx('보증금'); // 전월세
  const iMonthlyRent = idx('월세'); // 전월세
  
  if (iSigungu < 0 || iAptName < 0 || iContractYm < 0) {
    console.error('❌ 필수 칼럼을 찾을 수 없습니다.');
    process.exit(1);
  }

  const dataLines = lines.slice(headerIdx + 1);
  console.log(`📋 데이터 행: ${dataLines.length}건`);

  const newTxs = [];
  for (const line of dataLines) {
    const cols = parseCsvLine(line);
    if (cols.length < 5) continue;

    const sigungu = cols[iSigungu] || '';
    const aptName = cols[iAptName] || '';
    const areaStr = cols[iArea] || '0';
    const contractYm = cols[iContractYm] || '';
    const contractDay = (cols[iContractDay] || '').padStart(2, '0');
    const floor = parseInt(cols[iFloor]) || 0;

    // 동탄 지역 필터링 (경기도 화성시 동탄구, 화성시 영천동 등 동탄 신도시 소속 지역만)
    if (!sigungu.includes('화성시') || (!sigungu.includes('동탄') && !sigungu.includes('영천') && !sigungu.includes('오산') && !sigungu.includes('청계') && !sigungu.includes('목동') && !sigungu.includes('산척') && !sigungu.includes('방교') && !sigungu.includes('장지') && !sigungu.includes('송동') && !sigungu.includes('능동') && !sigungu.includes('반송') && !sigungu.includes('석우'))) {
      continue;
    }

    let price = 0, deposit = 0, monthlyRent = 0, dealType = '매매';

    if (iPrice >= 0) {
      price = parseInt((cols[iPrice] || '').replace(/,/g, '')) || 0;
    }
    if (iDealType >= 0) {
      dealType = cols[iDealType] || '';
      deposit = parseInt((cols[iDeposit] || '').replace(/,/g, '')) || 0;
      monthlyRent = parseInt((cols[iMonthlyRent] || '').replace(/,/g, '')) || 0;
    }

    if (price === 0 && deposit === 0) continue;

    const area = parseFloat(areaStr) || 0;
    const areaPyeong = Math.round(area / 3.306 * 10) / 10;

    const dongParts = sigungu.split(' ');
    const dong = dongParts[dongParts.length - 1] || '';

    const record = {
      aptName: aptName.trim(),
      contractYm,
      contractDay,
      price,
      deposit,
      monthlyRent,
      dealType,
      area,
      areaPyeong,
      floor,
      dong,
      contractDate: `${contractYm}${contractDay}`,
    };

    const parsed = CsvImportRecordSchema.safeParse(record);
    if (parsed.success) {
      newTxs.push(parsed.data);
    } else {
      console.warn(`⚠️ [CSV Import] Invalid transaction record format at apt ${aptName}:`, parsed.error.format());
      console.log(`Record Details: ${JSON.stringify(record)}`);
    }
  }

  console.log(`✅ 파싱 완료: ${newTxs.length}건 신규 거래`);

  // 1.5. 데이터 검증
  console.log('\n🔍 데이터 검증 중...');
  const { valid: validTxs, report: validationReport } = validateTransactions(newTxs);
  printValidationReport(validationReport);
  saveValidationReport(validationReport);

  if (validationReport.errors > 0) {
    console.log(`⚠️ ${validationReport.errors}건 차단됨 — 유효한 ${validTxs.length}건만 업로드합니다.`);
  }

  // 2. Firestore에 업로드 (검증 통과 건만)
  console.log('\n📡 Firestore 연결 중...');
  if (!admin.apps.length) {
    const creds = getAdminCredentials();
    if (creds) {
      admin.initializeApp({ credential: admin.credential.cert(creds) });
    } else {
      admin.initializeApp({ projectId: 'portfolio-dtdls' });
    }
  }
  const db = admin.firestore();

  let uploaded = 0;
  let skipped = 0;

  try {
    const batch = db.batch();
    for (const tx of validTxs) {
      const docId = `${normalizeAptName(tx.aptName)}_${tx.contractDate}_${tx.area}_${tx.floor}_${tx.price}`;
      const docRef = db.collection('transactions').doc(docId);
      batch.set(docRef, tx, { merge: true });
      uploaded++;
    }
    await batch.commit();
  } catch (err) {
    console.error(`⚠️ 일괄 업로드 실패 — ${err.message}`);
    skipped = validTxs.length;
  }

  console.log(`📤 Firestore 업로드: ${uploaded}건 성공, ${skipped}건 스킵`);

  // 3. 전체 데이터 다시 읽어서 transaction-summary.ts 재생성 -> sync-transactions.js 로 일임
  console.log('\n✅ Firestore에만 업로드했습니다. 프론트엔드 UI용 JSON 갱신을 위해 "node scripts/sync-transactions.js" 를 별도로 실행하세요!');

  process.exit(0);
}

main().catch(err => {
  console.error('❌ 실패:', err.message);
  process.exit(1);
});
