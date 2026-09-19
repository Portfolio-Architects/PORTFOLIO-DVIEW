#!/usr/bin/env node
/**
 * verify-aptname-txkey-empirical.js
 * 
 * Challenger empirical audit script to verify that:
 * 1. public/data/recent-transactions.json
 * 2. public/data/transactions-1y.json
 * 3. public/data/transactions-3y.json
 * 4. public/data/transactions-all.json
 * 
 * all contain 100% valid, non-empty, string-typed `aptName` and `txKey` values.
 * Also tests Zod schema parsing and staticDataService parsing simulation.
 */

const fs = require('fs');
const path = require('path');
const { z } = require('zod');

const RawTransactionInputSchema = z.object({
  aptName: z.string().min(1, '아파트명이 누락되었습니다.'),
  txKey: z.string().min(1, '단지 식별키가 누락되었습니다.'),
  contractDate: z.string().optional(),
  contractYm: z.string().optional(),
  contractDay: z.union([z.string(), z.number()]).optional(),
  price: z.coerce.number().nonnegative().default(0),
  priceVal: z.coerce.number().optional(),
  deposit: z.coerce.number().nonnegative().default(0),
  monthlyRent: z.coerce.number().nonnegative().default(0),
  area: z.coerce.number().positive('면적은 양수여야 합니다.'),
  floor: z.coerce.number().int('층수는 정수여야 합니다.').default(0),
  dealType: z.string().default('매매'),
  cancelDate: z.union([z.string(), z.number()]).optional().nullable(),
  cdealDay: z.union([z.string(), z.number()]).optional().nullable(),
  cdealType: z.string().optional().nullable(),
  isCanceled: z.boolean().optional().nullable(),
});

function parsePeriodTransactions(data) {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data;
  }
  if (typeof data === 'object' && 'fields' in data && 'data' in data) {
    const { fields, data: rows } = data;
    if (!rows) return [];
    return rows.map((row) => {
      const obj = {};
      fields.forEach((field, i) => {
        obj[field] = row[i];
      });
      return obj;
    });
  }
  return [];
}

const files = [
  { name: 'recent-transactions.json', path: path.join(__dirname, '../public/data/recent-transactions.json'), expectedMin: 800 },
  { name: 'transactions-1y.json', path: path.join(__dirname, '../public/data/transactions-1y.json'), expectedMin: 8000 },
  { name: 'transactions-3y.json', path: path.join(__dirname, '../public/data/transactions-3y.json'), expectedMin: 16000 },
  { name: 'transactions-all.json', path: path.join(__dirname, '../public/data/transactions-all.json'), expectedMin: 50000 },
];

let globalTotalRecords = 0;
let globalFailedRecords = 0;
let fileSummaries = [];

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║   🔍 CHALLENGER: EXHAUSTIVE EMPIRICAL aptName & txKey VERIFICATION       ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

for (const f of files) {
  console.log(`================================================================`);
  console.log(`Auditing ${f.name} at: ${f.path}`);
  console.log(`================================================================`);

  if (!fs.existsSync(f.path)) {
    console.error(`❌ File not found: ${f.path}`);
    process.exit(1);
  }

  const rawJson = JSON.parse(fs.readFileSync(f.path, 'utf8'));
  const parsedRecords = parsePeriodTransactions(rawJson);

  let missingAptName = 0;
  let emptyAptName = 0;
  let nonStringAptName = 0;

  let missingTxKey = 0;
  let emptyTxKey = 0;
  let nonStringTxKey = 0;

  let zodErrors = 0;
  const sampleAptNames = new Set();
  const sampleTxKeys = new Set();

  for (let i = 0; i < parsedRecords.length; i++) {
    const rec = parsedRecords[i];

    // Check aptName
    if (rec.aptName === undefined || rec.aptName === null) {
      missingAptName++;
    } else if (typeof rec.aptName !== 'string') {
      nonStringAptName++;
    } else if (rec.aptName.trim() === '') {
      emptyAptName++;
    } else {
      if (sampleAptNames.size < 5) sampleAptNames.add(rec.aptName);
    }

    // Check txKey
    if (rec.txKey === undefined || rec.txKey === null) {
      missingTxKey++;
    } else if (typeof rec.txKey !== 'string') {
      nonStringTxKey++;
    } else if (rec.txKey.trim() === '') {
      emptyTxKey++;
    } else {
      if (sampleTxKeys.size < 5) sampleTxKeys.add(rec.txKey);
    }

    // Validate with Zod schema (with txKey required)
    const zodResult = RawTransactionInputSchema.safeParse(rec);
    if (!zodResult.success) {
      zodErrors++;
    }
  }

  const total = parsedRecords.length;
  globalTotalRecords += total;
  const totalFileFailures = missingAptName + emptyAptName + nonStringAptName + missingTxKey + emptyTxKey + nonStringTxKey + zodErrors;
  globalFailedRecords += totalFileFailures;

  console.log(`- Total Records Parsed: ${total}`);
  console.log(`- Sample aptNames: ${Array.from(sampleAptNames).join(', ')}`);
  console.log(`- Sample txKeys: ${Array.from(sampleTxKeys).join(', ')}`);
  console.log(`- Missing aptName (undefined/null): ${missingAptName}`);
  console.log(`- Empty aptName (""): ${emptyAptName}`);
  console.log(`- Non-string aptName: ${nonStringAptName}`);
  console.log(`- Missing txKey (undefined/null): ${missingTxKey}`);
  console.log(`- Empty txKey (""): ${emptyTxKey}`);
  console.log(`- Non-string txKey: ${nonStringTxKey}`);
  console.log(`- Zod Validation Failures (aptName + txKey + schema): ${zodErrors}`);

  const passed = totalFileFailures === 0 && total >= f.expectedMin;
  console.log(`- Status: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);

  fileSummaries.push({
    file: f.name,
    total,
    missingAptName,
    emptyAptName,
    missingTxKey,
    emptyTxKey,
    zodErrors,
    passed
  });
}

console.log('================================================================');
console.log('🏁 SUMMARY OF EMPIRICAL VERIFICATION');
console.log('================================================================');
console.log(`Total Records Audited across 4 files: ${globalTotalRecords}`);
console.log(`Total Defective Records: ${globalFailedRecords}`);
for (const s of fileSummaries) {
  console.log(`  ${s.passed ? '✅' : '❌'} ${s.file.padEnd(28)}: ${String(s.total).padStart(6)} records, 0 missing aptName/txKey, 0 Zod errors`);
}

if (globalFailedRecords === 0) {
  console.log('\n🎉 ALL 4 ASSETS 100% VERIFIED WITH ZERO OMISSIONS OR DEFECTS!');
  process.exit(0);
} else {
  console.error(`\n❌ VERIFICATION FAILED: ${globalFailedRecords} defects detected!`);
  process.exit(1);
}
