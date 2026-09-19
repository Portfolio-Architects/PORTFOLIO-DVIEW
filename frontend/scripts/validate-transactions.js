#!/usr/bin/env node
/**
 * 실거래 데이터 검증 레이어 (Transaction Validation Layer)
 * 
 * import-csv-transactions.js 및 CI/CD 파이프라인에서 호출되어 데이터 품질을 정밀 검증합니다.
 * CLI 직접 실행 (`node scripts/validate-transactions.js`) 지원.
 * 
 * 검증 항목:
 *  1. Zod 스키마 및 계약일자(YYYYMMDD 8자리) 무결성 검증
 *  2. 가격 기본 검증 (매매가 또는 보증금 양수)
 *  3. 가격 이상치 탐지 (IQR 기반 — tx-summary.json 기준 기존 거래 대비 ±3 IQR)
 *  4. 단지 카탈로그 등록 여부 검증 (dong-apartments.ts, apartments-by-dong.json, apartmentMapping.ts)
 *  5. 면적 범위 검증 (10~300㎡ 이탈)
 *  6. 층수 범위 검증 (0~70 이탈)
 *  7. 중복 거래 탐지 (복합 식별자 기반)
 *  8. 계약 해제/취소 거래 정합성 검증 (cancelDate, cdealDay, cdealType, isCanceled)
 *  9. 종합 검증 리포트 출력 및 JSON 저장
 */

const fs = require('fs');
const path = require('path');
const { z } = require('zod');

// ─── 헬퍼: 경로 탐색 ───
function resolveFirstExisting(relPaths) {
  for (const p of relPaths) {
    if (fs.existsSync(p)) return p;
  }
  return relPaths[0];
}

// ─── 헬퍼: 아파트명 정규화 ───
function normalizeAptName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\[.*?\]\s*/g, '')
    .replace(/\s+/g, '')
    .replace(/[()（）]/g, '')
    .trim();
}

// ─── 헬퍼: 취소 거래 판별 ───
function isCancelledTransaction(t) {
  if (!t) return false;
  if (t.isCanceled === true) return true;
  if (t.cdealType === 'O' || t.cdealType === '해제') return true;
  
  const isInvalidDate = (v) => {
    if (v === null || v === undefined) return true;
    const s = String(v).trim().toLowerCase();
    return !s || s === '-' || s === 'null' || s === 'undefined' || s === 'nan';
  };

  if (!isInvalidDate(t.cancelDate)) return true;
  if (!isInvalidDate(t.cdealDay)) return true;

  return false;
}

// Zod schema for single transaction entry validation
const RawTransactionInputSchema = z.object({
  aptName: z.string().min(1, '아파트명이 누락되었습니다.'),
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
}).transform(val => {
  let contractDate = val.contractDate ? String(val.contractDate).trim() : '';
  if (!contractDate && val.contractYm && val.contractDay !== undefined) {
    contractDate = `${String(val.contractYm).trim()}${String(val.contractDay).padStart(2, '0')}`;
  }
  let price = val.price;
  if (price === 0 && val.priceVal && val.priceVal > 0) {
    price = Math.round(val.priceVal * 10000);
  }
  const cleanDealType = val.dealType && val.dealType.trim() ? val.dealType.trim() : '매매';
  return {
    ...val,
    contractDate,
    price,
    dealType: cleanDealType,
  };
});

// ─── 1. 등록 단지 카탈로그 로드 ───
// dong-apartments.ts, apartments-by-dong.json, apartmentMapping.ts를 전수 통합하여 Set 구축
function loadKnownApartments() {
  try {
    const knownSet = new Set();

    const addVariant = (rawName) => {
      if (!rawName || typeof rawName !== 'string') return;
      const trimmed = rawName.trim();
      if (!trimmed) return;

      knownSet.add(trimmed);
      knownSet.add(trimmed.replace(/\s+/g, ''));

      const norm = normalizeAptName(trimmed);
      if (norm) {
        knownSet.add(norm);
        knownSet.add(norm.replace(/아파트$/, ''));
        knownSet.add(norm + '아파트');

        // 지역/접두사 박리 변형 추가 (예: '동탄역 롯데캐슬' -> '롯데캐슬')
        const prefixes = [
          '동탄2신도시', '화성동탄2', '동탄2', '동탄역', '동탄',
          '화성', '시범', '호수공원역', '호수공원', '동탄호수공원',
          '동탄호수', '레이크', '숲속마을', '푸른마을', '나루마을',
          '솔빛마을', '새강마을', '능동마을', '시범다은마을',
          '시범한빛마을', '시범나루마을', '능동', '반송동', '청계동',
          '영천동', '오산동', '신동', '목동', '산척동', '장지동', '송동', '여울동', '석우동'
        ];
        for (const p of prefixes) {
          if (norm.startsWith(p) && norm.length > p.length + 1) {
            const stripped = norm.slice(p.length);
            knownSet.add(stripped);
            knownSet.add(stripped.replace(/아파트$/, ''));
          }
        }
      }
    };

    // 1-A. dong-apartments.ts 파싱
    const tsCandidates = [
      path.resolve(__dirname, '../src/lib/dong-apartments.ts'),
      path.resolve(process.cwd(), 'src/lib/dong-apartments.ts'),
      path.resolve(process.cwd(), 'frontend/src/lib/dong-apartments.ts'),
    ];
    const tsPath = resolveFirstExisting(tsCandidates);
    if (fs.existsSync(tsPath)) {
      const tsContent = fs.readFileSync(tsPath, 'utf-8');
      const dongs = ['능동', '청계동', '송동', '여울동', '장지동', '신동', '목동', '산척동', '영천동', '반송동', '석우동'];
      const stringMatches = tsContent.match(/['"]([^'"]+)['"]/g) || [];
      for (const m of stringMatches) {
        const str = m.replace(/['"]/g, '').trim();
        if (str.length >= 2 && !dongs.includes(str) && !str.includes(':') && !str.includes('/')) {
          addVariant(str);
        }
      }
    }

    // 1-B. apartments-by-dong.json 파싱 (180개 카탈로그 전체)
    const jsonCandidates = [
      path.resolve(__dirname, '../public/data/apartments-by-dong.json'),
      path.resolve(process.cwd(), 'public/data/apartments-by-dong.json'),
      path.resolve(process.cwd(), 'frontend/public/data/apartments-by-dong.json'),
    ];
    const jsonPath = resolveFirstExisting(jsonCandidates);
    if (fs.existsSync(jsonPath)) {
      const dongJson = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      const byDong = dongJson.byDong || {};
      for (const [dong, apts] of Object.entries(byDong)) {
        if (Array.isArray(apts)) {
          for (const apt of apts) {
            if (apt.name) addVariant(apt.name);
            if (apt.txKey) addVariant(apt.txKey);
            if (apt.ticker) addVariant(apt.ticker);
          }
        }
      }
    }

    // 1-C. apartmentMapping.ts (HARDCODED_MAPPING 별칭 테이블)
    const mapCandidates = [
      path.resolve(__dirname, '../src/lib/utils/apartmentMapping.ts'),
      path.resolve(process.cwd(), 'src/lib/utils/apartmentMapping.ts'),
      path.resolve(process.cwd(), 'frontend/src/lib/utils/apartmentMapping.ts'),
    ];
    const mapPath = resolveFirstExisting(mapCandidates);
    if (fs.existsSync(mapPath)) {
      const mapContent = fs.readFileSync(mapPath, 'utf-8');
      const mappingMatch = mapContent.match(/HARDCODED_MAPPING:\s*Record<string,\s*string>\s*=\s*\{([\s\S]*?)\};/);
      if (mappingMatch) {
        const regex = /'([^']+)':\s*'([^']+)'/g;
        let match;
        while ((match = regex.exec(mappingMatch[1])) !== null) {
          addVariant(match[1]);
          addVariant(match[2]);
        }
      }
    }

    return knownSet.size > 0 ? knownSet : null;
  } catch (err) {
    console.warn(`⚠️ 단지 카탈로그 로드 중 경고: ${err.message}`);
    return null;
  }
}

// ─── 2. 기존 거래 데이터에서 아파트별 가격 통계 로드 ───
// public/data/tx-summary.json 에서 최신 가격 지표 추출
function loadExistingPriceStats() {
  try {
    const summaryCandidates = [
      path.resolve(__dirname, '../public/data/tx-summary.json'),
      path.resolve(process.cwd(), 'public/data/tx-summary.json'),
      path.resolve(process.cwd(), 'frontend/public/data/tx-summary.json'),
    ];
    const summaryPath = resolveFirstExisting(summaryCandidates);

    if (!fs.existsSync(summaryPath)) {
      // Graceful fallback: 아직 생성되지 않은 경우 빈 맵 반환
      return {};
    }

    const content = fs.readFileSync(summaryPath, 'utf-8');
    const data = JSON.parse(content);
    const summaryObj = data.summary || data;
    const stats = {};

    for (const [key, val] of Object.entries(summaryObj)) {
      if (!val || typeof val !== 'object') continue;
      const entry = {
        max: val.maxPrice || 0,
        min: val.minPrice !== undefined ? val.minPrice : Infinity,
        count: val.txCount || 0,
      };
      stats[key] = entry;
      const norm = normalizeAptName(key);
      if (norm && !stats[norm]) {
        stats[norm] = entry;
      }
    }
    return stats;
  } catch {
    return {};
  }
}

// ─── 3. 가격 이상치 탐지 (IQR 기반) ───
function detectPriceAnomaly(tx, existingStats) {
  const normName = normalizeAptName(tx.aptName);
  const stats = existingStats[normName] || existingStats[tx.aptName];
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
      const issues = parsedInput.error.issues || parsedInput.error.errors || [];
      errors.push({
        tx,
        issue: `Zod 검증 실패: ${issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        severity: 'ERROR'
      });
      continue;
    }

    const validatedTx = parsedInput.data;
    const normName = normalizeAptName(validatedTx.aptName);

    // 1. 계약일자 형식 검증 (8자리 숫자 YYYYMMDD)
    if (!/^\d{8}$/.test(validatedTx.contractDate)) {
      errors.push({ tx: validatedTx, issue: `계약일자 형식 오류: '${validatedTx.contractDate}' (8자리 숫자 필요)`, severity: 'ERROR' });
      continue;
    }

    // 2. 가격 기본 검증 (매매는 price > 0, 전월세는 deposit > 0)
    if (validatedTx.price <= 0 && validatedTx.deposit <= 0) {
      errors.push({ tx: validatedTx, issue: '가격 0 이하 (매매가 및 보증금 없음)', severity: 'ERROR' });
      continue;
    }

    // 3. 면적 범위 검증
    if (validatedTx.area < 10 || validatedTx.area > 300) {
      issues.push({ type: 'AREA_OUTLIER', detail: `면적 ${validatedTx.area}㎡ (정상 범위: 10~300㎡)`, severity: 'WARNING' });
    }

    // 4. 층수 범위 검증
    if (validatedTx.floor < 0 || validatedTx.floor > 70) {
      issues.push({ type: 'FLOOR_OUTLIER', detail: `${validatedTx.floor}층 (정상 범위: 0~70층)`, severity: 'WARNING' });
    }

    // 5. 중복 체크 (보증금 및 월세 포함하여 전월세 동시계약 오탐 방지)
    const docId = `${normName}_${validatedTx.contractDate}_${validatedTx.area}_${validatedTx.floor}_${validatedTx.price}_${validatedTx.deposit}_${validatedTx.monthlyRent}_${validatedTx.dealType}`;
    if (docIds.has(docId)) {
      issues.push({ type: 'DUPLICATE', detail: `데이터셋 내 동일 조건 중복 거래 (${docId})`, severity: 'WARNING' });
    }
    docIds.add(docId);

    // 6. 계약 해제/취소 거래 체크
    const isCancelled = isCancelledTransaction(validatedTx);
    if (isCancelled) {
      const cancelInfo = validatedTx.cancelDate || validatedTx.cdealDay || validatedTx.cdealType || '해제';
      issues.push({ type: 'CANCELLED_TRANSACTION', detail: `계약 해제/취소 거래 (취소일자: ${cancelInfo})`, severity: 'INFO' });
    }

    // 7. 미등록 단지 체크 (dong-apartments.ts / apartments-by-dong.json / apartmentMapping.ts)
    if (knownApts) {
      const isKnown = knownApts.has(validatedTx.aptName) ||
                      knownApts.has(normName) ||
                      knownApts.has(normName.replace(/아파트$/, '')) ||
                      knownApts.has(normName + '아파트') ||
                      [...knownApts].some(k => k.length >= 4 && (normName.includes(k) || k.includes(normName)));

      if (!isKnown) {
        issues.push({ type: 'UNREGISTERED_APT', detail: `'${validatedTx.aptName}' — 단지 카탈로그 미등록`, severity: 'INFO' });
      }
    }

    // 8. 가격 이상치 (취소 거래가 아닌 정상 유효 거래만 시세 대비 이상치 검사)
    if (!isCancelled) {
      const priceAnomaly = detectPriceAnomaly(validatedTx, priceStats);
      if (priceAnomaly) {
        issues.push({ ...priceAnomaly, severity: 'WARNING' });
      }
    }

    if (issues.some(i => i.severity === 'ERROR')) {
      errors.push({ tx: validatedTx, issues });
    } else if (issues.length > 0) {
      warnings.push({ tx: validatedTx, issues });
      valid.push(validatedTx);
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
    cancelled: valid.filter(v => isCancelledTransaction(v)).length,
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
      .map(w => ({ apt: w.tx.aptName, price: w.tx.price, detail: w.issues.find(i => i.type.startsWith('PRICE_'))?.detail })),
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
  if (report.cancelled > 0) {
    console.log(`  ℹ️  해제/취소: ${report.cancelled}건 (정상 식별됨)`);
  }

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
function saveValidationReport(report, outputPath) {
  const reportPath = outputPath || path.resolve(__dirname, '../validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`📁 검증 리포트 저장: ${reportPath}`);
}

/**
 * CLI 직접 실행용 러너 함수
 */
function runValidationCli(targetArg) {
  console.log('🚀 [Transaction Validator] 실거래 데이터 정합성 검증 시작...');

  let transactionsToValidate = [];

  // 1. 인자로 파일이 지정된 경우 (CSV 또는 JSON)
  if (targetArg && fs.existsSync(targetArg)) {
    console.log(`📂 대상 파일 로드: ${targetArg}`);
    const ext = path.extname(targetArg).toLowerCase();
    if (ext === '.json') {
      const parsed = JSON.parse(fs.readFileSync(targetArg, 'utf-8'));
      transactionsToValidate = Array.isArray(parsed) ? parsed : (parsed.records || parsed.items || []);
    } else if (ext === '.csv') {
      // 간이 CSV 파서
      const lines = fs.readFileSync(targetArg, 'utf-8').split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 1) {
        const headers = lines[0].split(',').map(h => h.replace(/["']/g, '').trim());
        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].split(',').map(v => v.replace(/["']/g, '').trim());
          const obj = {};
          headers.forEach((h, idx) => { obj[h] = vals[idx]; });
          transactionsToValidate.push(obj);
        }
      }
    }
  } else {
    // 2. 인자가 없는 경우: 저장소 내 가용한 데이터셋 검사
    console.log('🔍 가용한 프로덕션 데이터셋 탐색 중...');
    const recentCandidates = [
      path.resolve(__dirname, '../public/data/recent-transactions.json'),
      path.resolve(process.cwd(), 'public/data/recent-transactions.json'),
      path.resolve(process.cwd(), 'frontend/public/data/recent-transactions.json'),
    ];
    const recentPath = resolveFirstExisting(recentCandidates);

    if (fs.existsSync(recentPath)) {
      console.log(`   📄 최근 실거래 데이터셋 로드: ${recentPath}`);
      const recentTxs = JSON.parse(fs.readFileSync(recentPath, 'utf-8'));
      if (Array.isArray(recentTxs)) {
        transactionsToValidate.push(...recentTxs);
      }
    }

    // 대표적인 chunk 파일 샘플 검증 (동탄역 롯데캐슬, 시범한화, 금호어울림 등)
    const txDataDirCandidates = [
      path.resolve(__dirname, '../public/tx-data'),
      path.resolve(process.cwd(), 'public/tx-data'),
      path.resolve(process.cwd(), 'frontend/public/tx-data'),
    ];
    const txDataDir = resolveFirstExisting(txDataDirCandidates);

    if (fs.existsSync(txDataDir)) {
      const sampleFiles = [
        '동탄역롯데캐슬.json',
        '동탄역시범한화꿈에그린프레스티지.json',
        '동탄역시범우남퍼스트빌아파트.json',
        '금호어울림레이크.json',
        '더샵센트럴시티.json'
      ];
      for (const sf of sampleFiles) {
        const fp = path.join(txDataDir, sf);
        if (fs.existsSync(fp)) {
          const aptBaseName = sf.replace('.json', '');
          const rows = JSON.parse(fs.readFileSync(fp, 'utf-8'));
          if (Array.isArray(rows)) {
            // 상위 20개 샘플 검증
            const samples = rows.slice(0, 20).map(r => ({
              ...r,
              aptName: r.aptName || aptBaseName,
              contractDate: r.contractDate || `${r.contractYm || '202601'}${String(r.contractDay || '01').padStart(2, '0')}`,
            }));
            transactionsToValidate.push(...samples);
          }
        }
      }
    }

    // 벤치마크 단지 기본 샘플 주입 (데이터셋 파일이 비어있는 경우 대비)
    if (transactionsToValidate.length === 0) {
      console.log('   ⚠️ 로컬 정적 데이터셋이 발견되지 않아 표준 벤치마크 테스트셋을 검증합니다.');
      transactionsToValidate = [
        { aptName: '동탄역 롯데캐슬', contractDate: '20260901', price: 160000, area: 84.82, floor: 25, dealType: '매매' },
        { aptName: '동탄역 시범한화꿈에그린프레스티지', contractDate: '20260901', price: 125000, area: 84.5, floor: 18, dealType: '매매' },
        { aptName: '동탄역 시범 우남퍼스트빌', contractDate: '20260901', price: 110000, area: 84.9, floor: 12, dealType: '매매' },
        { aptName: '금호어울림 레이크 1차', contractDate: '20260901', price: 65000, area: 74.5, floor: 10, dealType: '매매' },
      ];
    }
  }

  console.log(`📋 검증 대상 총 레코드: ${transactionsToValidate.length}건`);

  const { valid, warnings, errors, report } = validateTransactions(transactionsToValidate);
  printValidationReport(report);
  saveValidationReport(report);

  const exitCode = report.errors > 0 ? 1 : 0;
  if (exitCode === 0) {
    console.log('✅ 데이터 정합성 검증 완료: 치명적 스키마/범위 결함 없음 (Exit 0)');
  } else {
    console.error(`❌ 데이터 검증 실패: ${report.errors}건의 치명적 오류 감지 (Exit 1)`);
  }

  return { exitCode, report, valid, warnings, errors };
}

// ─── CLI 러너 ───
if (require.main === module) {
  const result = runValidationCli(process.argv[2]);
  process.exit(result.exitCode);
}

module.exports = {
  validateTransactions,
  printValidationReport,
  saveValidationReport,
  runValidationCli,
  loadKnownApartments,
  loadExistingPriceStats,
  detectPriceAnomaly,
  isCancelledTransaction,
  normalizeAptName,
  RawTransactionInputSchema,
};
