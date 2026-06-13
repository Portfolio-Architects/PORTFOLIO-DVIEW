const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { z } = require('zod');

// Zod schema for validation of CSV Import TransactionSync Record
const CsvTransactionSyncRecordSchema = z.object({
  apartmentName: z.string().min(1, '아파트명이 누락되었습니다.'),
  dong: z.string().min(1, '법정동명이 누락되었습니다.'),
  contractYm: z.string().length(6, '계약년월은 6자리여야 합니다.'),
  contractDay: z.string().length(2, '계약일은 2자리여야 합니다.'),
  contractDate: z.string().length(8, '계약일자는 8자리여야 합니다.'),
  deposit: z.coerce.number().int().nonnegative('보증금이 유효하지 않습니다.'),
  monthlyRent: z.coerce.number().int().nonnegative('월세가 유효하지 않습니다.'),
  price: z.coerce.number().int().nonnegative().default(0),
  dealType: z.string().min(1, '거래구분이 누락되었습니다.'),
  area: z.coerce.number().positive('면적이 유효하지 않습니다.'),
  areaPyeong: z.coerce.number().positive('평수가 유효하지 않습니다.'),
  floor: z.coerce.number().int('층수 정보가 유효하지 않습니다.'),
  source: z.literal('csv_import')
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

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node scripts/import-csv.js <path_to_csv>');
  process.exit(1);
}

const resolvedPath = path.resolve(csvPath);
console.log('Reading CSV from: ' + resolvedPath);

const pyScript = `
import pandas as pd
import json
import sys

csv_file = sys.argv[1]
try:
    df = pd.read_csv(csv_file, encoding='cp949', skiprows=15)
    df = df.fillna(0)
    
    records = []
    for _, row in df.iterrows():
        ym = str(row.get('계약년월', ''))
        if not ym: continue
            
        deposit_str = str(row.get('보증금(만원)', '0')).replace(',', '')
        rent_str = str(row.get('월세금(만원)', '0')).replace(',', '')
        
        deposit = int(deposit_str) if deposit_str.isdigit() else 0
        rent = int(rent_str) if rent_str.isdigit() else 0
        
        apt_name = str(row.get('단지명', '')).strip()
        dong = str(row.get('시군구', '')).split(' ')[-1]
        if dong == '동탄구': dong = ''
            
        contractDay = str(row.get('계약일', '')).zfill(2)
        
        record = {
            'apartmentName': apt_name,
            'dong': dong,
            'contractYm': ym,
            'contractDay': contractDay,
            'contractDate': ym + contractDay,
            'deposit': deposit,
            'monthlyRent': rent,
            'price': 0,
            'dealType': str(row.get('전월세구분', '')).strip(),
            'area': float(row.get('전용면적(㎡)', 0)),
            'areaPyeong': round(float(row.get('전용면적(㎡)', 0)) / 3.3058, 1),
            'floor': int(row.get('층', 0)) if row.get('층', 0) != 0 else 0,
            'source': 'csv_import'
        }
        records.append(record)
        
    print(json.dumps(records, ensure_ascii=False))
except Exception as e:
    sys.stderr.write(str(e))
    sys.exit(1)
`;

const pyPath = path.join(__dirname, 'temp_parser.py');
fs.writeFileSync(pyPath, pyScript, 'utf8');

let stdout;
try {
  stdout = execSync(`python "${pyPath}" "${resolvedPath}"`, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 50 });
} catch (e) {
  console.error('Python parsing failed:', e.message);
  process.exit(1);
}

fs.unlinkSync(pyPath);

const records = JSON.parse(stdout);
console.log(`Parsed ${records.length} records successfully.`);

// Initialize Firebase Admin
if (!admin.apps.length) {
  const creds = getAdminCredentials();
  if (creds) {
    admin.initializeApp({ credential: admin.credential.cert(creds) });
  } else {
    admin.initializeApp({ projectId: 'portfolio-dtdls' });
  }
}

const db = admin.firestore();

async function upload() {
  const collRef = db.collection('transactionSync');
  let batches = [];
  let currentBatch = db.batch();
  let count = 0;

  for (const record of records) {
    const parsed = CsvTransactionSyncRecordSchema.safeParse(record);
    if (!parsed.success) {
      console.warn(`⚠️ [CSV Import Sync] Invalid transactionSync record format at apt ${record.apartmentName}:`, parsed.error.format());
      console.log(`Record Details: ${JSON.stringify(record)}`);
      continue;
    }

    const validRecord = parsed.data;
    const docId = `${validRecord.apartmentName}_${validRecord.contractDate}_${validRecord.area}_${validRecord.floor}_${validRecord.dealType}`.replace(/[\//]/g, '');
    const docRef = collRef.doc(docId);
    currentBatch.set(docRef, validRecord, { merge: true });
    count++;
    
    if (count % 400 === 0) {
      batches.push(currentBatch);
      currentBatch = db.batch();
    }
  }
  if (count % 400 !== 0) {
    batches.push(currentBatch);
  }

  let i = 1;
  for (const batch of batches) {
    await batch.commit();
    console.log(`Batch ${i++} / ${batches.length} committed.`);
  }
  console.log('All done!');
  process.exit(0);
}

upload().catch(console.error);
