#!/usr/bin/env node
/**
 * CSV 데이터 검증 레이어
 * 
 * import-csv-transactions.js 에서 호출되어 업로드 전 데이터 품질을 검증합니다.
 * 
 * 검증 항목:
 *  1. 가격 이상치 탐지 (IQR 기반 — 아파트별 기존 거래 대비 ±3 IQR)
 *  2. 미등록 단지 플래그 (dong-apartments.ts에 정의되지 않은 아파트)
 *  3. 면적 범위 검증 (10~300㎡ 이탈)
 *  4. 층수 범위 검증 (0~70 이탈)
 *  5. 중복 거래 탐지 (동일 docId)
 *  6. 검증 리포트 출력 (콘솔 + JSON 파일)
 */

const fs = require('fs');
const path = require('path');
const { z } = require('zod');

// Zod schema for single transaction entry validation before import
const RawTransactionInputSchema = z.object({
  aptName: z.string().min(1, '아파트명이 누락되었습니다.'),
  contractDate: z.string().regex(/^\d{8}$/, '계약일자는 8자리 숫자 형식이어야 합니다.'),
  price: z.coerce.number().nonnegative().default(0),
  deposit: z.coerce.number().nonnegative().default(0),
  monthlyRent: z.coerce.number().nonnegative().default(0),
  area: z.coerce.number().positive('면적은 양수여야 합니다.'),
  floor: z.coerce.number().int('층수는 정수여야 합니다.').default(0),
  dealType: z.string().default('매매')
});

// ─── 1. 미등록 단지 체크 ───
// dong-apartments.ts 에서 빌드된 아파트 목록을 기준으로 매칭
function loadKnownApartments() {
  try {
    const tsPath = path.resolve(__dirname, '../src/lib/dong-apartments.ts');
    const content = fs.readFileSync(tsPath, 'utf-8');
    // 아파트 이름 추출: name: '...'
    const nameRegex = /name:\s*'([^']+)'/g;
    const names = [];
    let match;
    while ((match = nameRegex.exec(content)) !== null) {
      names.push(match[1].replace(/\s+/g, ''));
    }
    return new Set(names);
  } catch {
    console.warn('⚠️ dong-apartments.ts 로드 실패 — 미등록 단지 체크 비활성화');
    return null;
  }
}

// ─── 2. 기존 거래 데이터에서 아파트별 가격 통계 로드 ───
function loadExistingPriceStats() {
  try {
    const summaryPath = path.resolve(__dirname, '../src/lib/transaction-summary.ts');
    const content = fs.readFileSync(summaryPath, 'utf-8');
    // TX_SUMMARY 객체에서 maxPrice, minPrice, txCount 추출
    const jsonMatch = content.match(/export const TX_SUMMARY.*?=\s*(\{[\s\S]*?\});/);
    if (!jsonMatch) return {};
    const data = JSON.parse(jsonMatch[1]);
    const stats = {};
    for (const [key, val] of Object.entries(data)) {
      stats[key] = {
        max: val.maxPrice || 0,
        min: val.minPrice || Infinity,
        count: val.txCount || 0,
      };
    }
    return stats;
  } catch {
    return {};
  }
}

// ─── 3. 가격 이상치 탐지 (IQR 기반) ───
function detectPriceAnomaly(tx, existingStats) {
  const normName = tx.aptName.replace(/\s+/g, '').replace(/[()（）\[\]]/g, '');
  const stats = existingStats[normName];
  if (!stats || stats.count < 5 || tx.price <= 0) return null; // 매매가 아니거나 데이터 부족 시 스킵

  const range = stats.max - stats.min;
  const iqr = range * 0.5; // IQR 근사치
  const lowerBound = stats.min - (iqr * 3);
  const upperBound = stats.max + (iqr * 3);

  if (tx.price < lowerBound) {
    return { type: 'PRICE_TOO_LOW', detail: `${tx.price}만 < 하한 ${Math.round(lowerBound)}만 (기존 ${stats.min}~${stats.max}만)` };
  }
  if (tx.price > upperBound) {
    return { type: 'PRICE_TOO_HIGH', detail: `${tx.price}만 > 상한 ${Math.round(upperBound)}만 (기존 ${stats.min}~${stats.max}만)` };
  }
  return null;
}

/**
 * 메인 검증 함수
 * @param {Array} transactions - 파싱된 거래 배열
 * @returns {{ valid: Array, warnings: Array, errors: Array, report: Object }}
 */
function validateTransactions(transactions) {
  const knownApts = loadKnownApartments();
  const priceStats = loadExistingPriceStats();
  
  const valid = [];
  const warnings = [];
  const errors = [];
  const docIds = new Set();

  for (const tx of transactions) {
    const issues = [];

    // Zod 스키마 검증
    const parsedInput = RawTransactionInputSchema.safeParse(tx);
    if (!parsedInput.success) {
      errors.push({
        tx,
        issue: `Zod 검증 실패: ${parsedInput.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        severity: 'ERROR'
      });
      continue;
    }

    const validatedTx = parsedInput.data;
    const normName = validatedTx.aptName.replace(/\s+/g, '').replace(/[()（）\[\]]/g, '');

    // 1. 가격 기본 검증 (매매는 price > 0, 전월세는 deposit > 0)
    if (validatedTx.price <= 0 && validatedTx.deposit <= 0) {
      errors.push({ tx: validatedTx, issue: '가격 0 이하', severity: 'ERROR' });
      continue;
    }

    // 2. 면적 범위 검증
    if (validatedTx.area < 10 || validatedTx.area > 300) {
      issues.push({ type: 'AREA_OUTLIER', detail: `면적 ${validatedTx.area}㎡ (정상: 10~300)`, severity: 'WARNING' });
    }

    // 3. 층수 범위 검증
    if (validatedTx.floor < 0 || validatedTx.floor > 70) {
      issues.push({ type: 'FLOOR_OUTLIER', detail: `${validatedTx.floor}층 (정상: 0~70)`, severity: 'WARNING' });
    }

    // 4. 중복 체크
    const docId = `${normName}_${validatedTx.contractDate}_${validatedTx.area}_${validatedTx.floor}_${validatedTx.price}`;
    if (docIds.has(docId)) {
      issues.push({ type: 'DUPLICATE', detail: `CSV 내 중복 거래`, severity: 'WARNING' });
    }
    docIds.add(docId);

    // 5. 미등록 단지 체크
    if (knownApts && !knownApts.has(normName)) {
      // 부분 매칭 시도 (아파트명이 포함 관계인지)
      const partialMatch = [...knownApts].find(k => normName.includes(k) || k.includes(normName));
      if (!partialMatch) {
        issues.push({ type: 'UNREGISTERED_APT', detail: `'${validatedTx.aptName}' — dong-apartments.ts 미등록`, severity: 'INFO' });
      }
    }

    // 6. 가격 이상치
    const priceAnomaly = detectPriceAnomaly(validatedTx, priceStats);
    if (priceAnomaly) {
      issues.push({ ...priceAnomaly, severity: 'WARNING' });
    }

    if (issues.some(i => i.severity === 'ERROR')) {
      errors.push({ tx: validatedTx, issues });
    } else if (issues.length > 0) {
      warnings.push({ tx: validatedTx, issues });
      valid.push(validatedTx); // 경고는 통과시키되 보고
    } else {
      valid.push(validatedTx);
    }
  }

  // 검증 리포트 생성
  const report = {
    timestamp: new Date().toISOString(),
    total: transactions.length,
    valid: valid.length,
    warnings: warnings.length,
    errors: errors.length,
    warningDetails: warnings.map(w => ({
      apt: w.tx.aptName,
      date: w.tx.contractDate,
      price: w.tx.price,
      issues: w.issues.map(i => `[${i.type}] ${i.detail}`),
    })),
    errorDetails: errors.map(e => ({
      apt: e.tx?.aptName,
      issue: e.issue || e.issues?.map(i => i.detail).join(', '),
    })),
    unregisteredApts: [...new Set(
      warnings
        .flatMap(w => w.issues)
        .filter(i => i.type === 'UNREGISTERED_APT')
        .map(i => i.detail)
    )],
    priceAnomalies: warnings
      .filter(w => w.issues.some(i => i.type === 'PRICE_TOO_LOW' || i.type === 'PRICE_TOO_HIGH'))
      .map(w => ({ apt: w.tx.aptName, price: w.tx.price, detail: w.issues.find(i => i.type.startsWith('PRICE_')).detail })),
  };

  return { valid, warnings, errors, report };
}

/**
 * 검증 리포트를 콘솔에 출력
 */
function printValidationReport(report) {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║         📊 데이터 검증 리포트             ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`  총 건수: ${report.total}`);
  console.log(`  ✅ 통과: ${report.valid}`);
  console.log(`  ⚠️  경고: ${report.warnings}`);
  console.log(`  ❌ 차단: ${report.errors}`);

  if (report.priceAnomalies.length > 0) {
    console.log(`\n  🔴 가격 이상치 (${report.priceAnomalies.length}건):`);
    for (const a of report.priceAnomalies) {
      console.log(`     ${a.apt}: ${a.detail}`);
    }
  }

  if (report.unregisteredApts.length > 0) {
    console.log(`\n  🟡 미등록 단지 (${report.unregisteredApts.length}건):`);
    for (const apt of report.unregisteredApts) {
      console.log(`     ${apt}`);
    }
  }

  if (report.errors > 0) {
    console.log(`\n  ❌ 차단된 거래:`);
    for (const e of report.errorDetails) {
      console.log(`     ${e.apt}: ${e.issue}`);
    }
  }

  console.log('');
}

/**
 * 검증 리포트를 JSON 파일로 저장
 */
function saveValidationReport(report) {
  const reportPath = path.resolve(__dirname, '../validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`📁 검증 리포트 저장: ${reportPath}`);
}

module.exports = { validateTransactions, printValidationReport, saveValidationReport };
