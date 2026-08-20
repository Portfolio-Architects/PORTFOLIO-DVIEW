#!/usr/bin/env node
/**
 * 🔄 Firestore → transaction-summary.ts 동기화 스크립트
 * 
 * 사용법: npm run sync-transactions [--full]
 * 
 * Firestore 'transactions' & 'transactionSync' 컬렉션에서 실거래가 데이터를 읽어
 * 아파트별 요약, 거시 트렌드, 최근 90일 거래 목록, 아파트별 청크 JSON 파일을 생성합니다.
 */

require('dotenv').config({ path: '.env.local', override: true });
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { z } = require('zod');

// Modularized Pipeline Components
const { filterOutliersRolling } = require('./pipeline/outlierFilters');
const {
  initMacroTrendData,
  accumulateMacroTrend,
  calculateRecent7DaysVolume,
  generateMacroTrendSeries
} = require('./pipeline/macroTrendCalculator');
const {
  formatPriceEok,
  parseYYYYMMDD,
  normalizeAptName,
  calculateApartmentSummary,
  formatRecentTransactions
} = require('./pipeline/apartmentSummarizer');
const {
  writeSummaryFiles,
  writeApartmentChunks
} = require('./pipeline/fileGenerators');

// Firestore 'transactions' & 'transactionSync' 레코드 검증을 위한 Zod 스키마
const TransactionRecordSchema = z.object({
  aptName: z.string().min(1, '아파트명이 누락되었습니다.'),
  contractYm: z.string().min(6, '계약년월은 6자 이상이어야 합니다.').regex(/^\d+$/, '숫자 형식이어야 합니다.'),
  contractDay: z.union([z.number(), z.string()]).optional().nullable(),
  price: z.union([z.number(), z.string()]).optional().nullable(),
  deposit: z.union([z.number(), z.string()]).optional().nullable(),
  monthlyRent: z.union([z.number(), z.string()]).optional().nullable(),
  dealType: z.string().default('매매'),
  area: z.union([z.number(), z.string()]).optional().nullable(),
  areaPyeong: z.union([z.number(), z.string()]).optional().nullable(),
  floor: z.union([z.number(), z.string()]).optional().nullable(),
  dong: z.string().optional().nullable(),
  buildYear: z.union([z.number(), z.string()]).optional().nullable(),
  cancelDate: z.string().optional().nullable(),
});

const OUTPUT_PATH = path.resolve(__dirname, '../public/data/tx-summary.json');
const RECENT_TX_OUTPUT_PATH = path.resolve(__dirname, '../public/data/recent-transactions.json');
const MACRO_TREND_OUTPUT_PATH = path.resolve(__dirname, '../public/data/macro-trend.json');
const TX_DATA_DIR = path.resolve(__dirname, '../public/tx-data');

const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
let serviceAccount;

const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'portfolio-dtdls';

if (fs.existsSync(serviceAccountPath)) {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
} else if (envKey) {
  try {
    serviceAccount = JSON.parse(envKey);
  } catch (e) {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT 환경 변수 파싱 실패', e);
  }
} else if (privateKey && clientEmail) {
  serviceAccount = {
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
  };
} else {
  console.log('⚠️ 인증 정보를 찾을 수 없습니다. (CI/CD 환경 등)');
  console.log('   Firestore 동기화를 건너뜁니다.');
  process.exit(0);
}

if (!admin.apps.length) {
  const config = serviceAccount ? { credential: admin.credential.cert(serviceAccount) } : { projectId };
  admin.initializeApp(config);
}

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

async function fetchTypeMap() {
  const typeMap = {};
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=TYPE_MAP`;
    const res = await fetch(csvUrl);
    if (res.ok) {
      const csvText = await res.text();
      const lines = csvText.split('\n').filter(l => l.trim());
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        if (cols.length < 3) continue;
        const aptName = normalizeAptName(cols[1] || '');
        const area = (cols[2] || '').trim();
        const typeM2Str = (cols[3] || '').trim();
        if (aptName && area && typeM2Str) {
          if (!typeMap[aptName]) typeMap[aptName] = {};
          const match = typeM2Str.match(/\d+(\.\d+)?/);
          if (match) {
            typeMap[aptName][area] = parseFloat(match[0]) * 0.3025;
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to fetch typeMap', e);
  }
  return typeMap;
}

async function fetchDongMap() {
  const dongMap = {};
  const validTxKeys = new Set();
  const allAptTxKeys = new Set();
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=apartments`;
    const res = await fetch(csvUrl);
    if (res.ok) {
      const csvText = await res.text();
      const lines = csvText.split('\n').filter(l => l.trim());
      if (lines.length < 2) return { dongMap, validTxKeys, allAptTxKeys };
      
      const headers = parseCsvLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
      const nameIdx = headers.findIndex(h => h === '아파트명' || h === 'name' || h === '이름');
      const dongIdx = headers.findIndex(h => h === 'dong' || h === '동');
      const txKeyIdx = headers.findIndex(h => h === 'txkey');
      
      if (nameIdx === -1) {
        console.warn('⚠️ apartments 시트에서 아파트명 컬럼을 찾지 못했습니다.');
        return { dongMap, validTxKeys, allAptTxKeys };
      }
      
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]).map(c => c.replace(/^"|"$/g, '').trim());
        const name = cols[nameIdx];
        const dong = dongIdx !== -1 ? cols[dongIdx] : '';
        let txKey = txKeyIdx !== -1 ? cols[txKeyIdx] : '';
        
        if (name) {
          const normName = normalizeAptName(name);
          if (dong) dongMap[normName] = dong;
          if (!txKey) txKey = name;
          validTxKeys.add(normalizeAptName(txKey));
          validTxKeys.add(normName);
          allAptTxKeys.add(txKey);
        }
      }
    }
  } catch (e) {
    console.error('⚠️ 법정동 매핑 다운로드 실패:', e.message);
  }
  return { dongMap, validTxKeys, allAptTxKeys };
}

function getLocalAptTxKeys() {
  const keys = new Set();
  try {
    const aptsPath = path.resolve(__dirname, '../public/data/apartments-by-dong.json');
    if (fs.existsSync(aptsPath)) {
      const data = JSON.parse(fs.readFileSync(aptsPath, 'utf-8'));
      if (data && data.byDong) {
        Object.values(data.byDong).forEach(apts => {
          apts.forEach(apt => {
            if (apt.txKey) {
              keys.add(apt.txKey);
            } else if (apt.name) {
              keys.add(apt.name);
            }
          });
        });
      }
    }
  } catch (err) {
    console.error('⚠️ 로컬 apartments-by-dong.json 파싱 실패:', err.message);
  }
  return keys;
}

async function main() {
  const processedDocIds = new Set();
  let isFullSync = process.argv.includes('--full');
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  const cutoffYm = `${threeMonthsAgo.getFullYear()}${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}`;
  const cutoffDate = `${cutoffYm}01`;

  const byApt = {};

  if (!isFullSync && fs.existsSync(path.join(TX_DATA_DIR, '_index.json'))) {
    console.log('📥 [Incremental] 로컬 JSON 캐시(기존 실거래가)를 로드합니다...');
    try {
      const index = JSON.parse(fs.readFileSync(path.join(TX_DATA_DIR, '_index.json'), 'utf8'));
      for (const aptName of index) {
        const filepath = path.join(TX_DATA_DIR, `${aptName}.json`);
        if (fs.existsSync(filepath)) {
          const records = JSON.parse(fs.readFileSync(filepath, 'utf8'));
          byApt[aptName] = records
            .map(d => ({
              ...d,
              contractDate: d.contractDate || `${d.contractYm || ''}${String(d.contractDay || '').padStart(2, '0')}`,
              dong: d.dong || ''
            }))
            .filter(d => {
              const hasValidYm = d.contractYm && d.contractYm.length === 6 && /^\d{6}$/.test(d.contractYm);
              return hasValidYm && d.contractDate < cutoffDate;
            });
        }
      }
      console.log(`✅ ${Object.keys(byApt).length}개 아파트의 기존 데이터 로드 완료`);
    } catch (e) {
      console.warn('⚠️ 로컬 캐시 로드 중 오류 발생, Full Sync로 전환합니다.', e);
      isFullSync = true;
    }
  } else {
    console.log('🚀 [Full Sync] 로컬 캐시를 무시하고 전체 데이터를 처음부터 다시 동기화합니다...');
  }

  console.log(`📡 Firestore에서 실거래가 데이터 읽는 중... (Incremental: ${!isFullSync ? cutoffDate + ' 이후' : '전체'})`);
  
  const db = admin.firestore();
  
  let collRef = db.collection('transactions');
  if (!isFullSync) {
    collRef = collRef.where('contractDate', '>=', cutoffDate);
  }
  const snapshot = await collRef.orderBy('contractDate', 'desc').get();

  console.log(`📋 transactions 컬렉션에서 ${snapshot.size}건 로드 완료`);

  snapshot.forEach((docSnap) => {
    const d = docSnap.data();
    const aptName = d.aptName || '';

    const rawRecord = {
      aptName,
      contractYm: d.contractYm || '',
      contractDay: d.contractDay,
      price: d.price,
      deposit: d.deposit,
      monthlyRent: d.monthlyRent,
      dealType: d.dealType || '매매',
      area: d.area,
      areaPyeong: d.areaPyeong,
      floor: d.floor,
      dong: d.dong,
      buildYear: d.buildYear || d.constructionYear,
      cancelDate: d.cancelDate,
    };

    const parsed = TransactionRecordSchema.safeParse(rawRecord);
    if (!parsed.success) {
      console.warn(`[Sync Transactions] Skipping invalid transaction at doc ${docSnap.id}:`, parsed.error.format());
      return;
    }

    const validData = parsed.data;

    // Filter out transactions that occurred before completion/built year
    const buildYear = parseInt(validData.buildYear, 10) || 0;
    const contractYear = validData.contractYm ? parseInt(validData.contractYm.substring(0, 4), 10) : 0;
    if (buildYear > 0 && contractYear > 0 && contractYear < buildYear) {
      return; // Skip pre-completion transaction
    }

    const key = normalizeAptName(validData.aptName);
    if (!byApt[key]) byApt[key] = [];    
    
    const cDate = `${validData.contractYm}${String(validData.contractDay || '').padStart(2, '0')}`;
    
    if (processedDocIds.has(docSnap.id)) {
      return;
    }
    processedDocIds.add(docSnap.id);

    byApt[key].push({
      aptName: validData.aptName,
      contractYm: validData.contractYm,
      contractDay: validData.contractDay || '',
      price: validData.price || 0,
      priceEok: (validData.dealType === '전세' || validData.dealType === '월세') 
        ? formatPriceEok(validData.deposit || 0) + (validData.monthlyRent ? `/${validData.monthlyRent}` : '')
        : formatPriceEok(validData.price || 0),
      deposit: validData.deposit || 0,
      monthlyRent: validData.monthlyRent || 0,
      reqGb: d.reqGb || '',
      rnuYn: d.rnuYn || '',
      area: validData.area || 0,
      areaPyeong: validData.areaPyeong || 0,
      floor: validData.floor || 0,
      dong: validData.dong || '',
      dealType: validData.dealType,
      contractDate: cDate,
      cancelDate: validData.cancelDate || '',
    });
  });

  console.log(`📡 Firestore transactionSync (임대차 등) 로딩 중... (Incremental: ${!isFullSync ? cutoffYm + ' 이후' : '전체'})`);
  let syncRef = db.collection('transactionSync');
  if (!isFullSync) {
    syncRef = syncRef.where('contractYm', '>=', cutoffYm);
  }
  const syncSnap = await syncRef.orderBy('contractYm', 'desc').get();
  console.log(`📋 transactionSync 컬렉션에서 ${syncSnap.size}건 로드 완료`);

  syncSnap.forEach((docSnap) => {
    const d = docSnap.data();
    const aptName = d.apartmentName || d.aptName || '';

    const rawRecord = {
      aptName,
      contractYm: d.contractYm || '',
      contractDay: d.contractDay,
      price: d.price,
      deposit: d.deposit,
      monthlyRent: d.monthlyRent,
      dealType: d.dealType || '매매',
      area: d.area,
      areaPyeong: d.areaPyeong,
      floor: d.floor,
      dong: d.dong,
      buildYear: d.buildYear || d.constructionYear,
      cancelDate: d.cancelDate,
    };

    const parsed = TransactionRecordSchema.safeParse(rawRecord);
    if (!parsed.success) {
      console.warn(`[Sync Transactions] Skipping invalid sync record at doc ${docSnap.id}:`, parsed.error.format());
      return;
    }

    const validData = parsed.data;

    const buildYear = parseInt(validData.buildYear, 10) || 0;
    const contractYear = validData.contractYm ? parseInt(validData.contractYm.substring(0, 4), 10) : 0;
    if (buildYear > 0 && contractYear > 0 && contractYear < buildYear) {
      return;
    }

    const key = normalizeAptName(validData.aptName);
    if (!byApt[key]) byApt[key] = [];    
    
    const cDate = d.contractDate || `${validData.contractYm}${String(validData.contractDay || '').padStart(2, '0')}`;
    
    if (processedDocIds.has(docSnap.id)) {
      return;
    }
    processedDocIds.add(docSnap.id);

    byApt[key].push({
      aptName: validData.aptName,
      contractYm: validData.contractYm,
      contractDay: validData.contractDay || '',
      price: validData.price || 0,
      priceEok: (validData.dealType === '전세' || validData.dealType === '월세') 
        ? formatPriceEok(validData.deposit || 0) + (validData.monthlyRent ? `/${validData.monthlyRent}` : '')
        : formatPriceEok(validData.price || 0),
      deposit: validData.deposit || 0,
      monthlyRent: validData.monthlyRent || 0,
      reqGb: d.reqGb || '',
      rnuYn: d.rnuYn || '',
      area: validData.area || 0,
      areaPyeong: validData.areaPyeong || 0,
      floor: validData.floor || 0,
      dong: validData.dong || '',
      dealType: validData.dealType,
      contractDate: cDate,
      cancelDate: validData.cancelDate || '',
    });
  });

  // raw 거래 데이터 중복 제거
  console.log('🧹 raw 거래 데이터 중복 제거 수행 중...');
  const getRichnessScore = (item, isRent) => {
    let score = 0;
    const dt = item.dealType ? item.dealType.trim() : '';
    if (dt && dt !== '' && dt !== '매매' && dt !== '전세' && dt !== '월세') {
      score += 2;
    }
    if (item.reqGb && item.reqGb.trim() && item.reqGb.trim() !== '-') {
      score += 1;
    }
    if (item.rnuYn && item.rnuYn.trim() && item.rnuYn.trim() !== '-') {
      score += 1;
    }
    if (isRent && Number(item.price) > 0) {
      score += 1;
    }
    return score;
  };

  for (const aptName of Object.keys(byApt)) {
    const seen = new Map();
    for (const t of byApt[aptName]) {
      let normalizedDealType = t.dealType ? t.dealType.trim() : '';
      if (normalizedDealType !== '전세' && normalizedDealType !== '월세') {
        normalizedDealType = '매매';
      }
      const isRent = normalizedDealType === '전세' || normalizedDealType === '월세';
      const cleanPrice = isRent ? 0 : (Number(t.price) || 0);
      const cleanDeposit = isRent ? (Number(t.deposit) || 0) : 0;
      const cleanRent = isRent ? (Number(t.monthlyRent) || 0) : 0;
      const cleanDay = String(t.contractDay || '').trim().padStart(2, '0');
      const cleanFloor = Number(t.floor) || 0;

      const key = `${t.contractYm}_${cleanDay}_${cleanPrice}_${cleanDeposit}_${cleanRent}_${Math.round(t.area * 100) / 100}_${cleanFloor}_${normalizedDealType}`;

      if (!seen.has(key)) {
        seen.set(key, t);
      } else {
        const existing = seen.get(key);
        const existingScore = getRichnessScore(existing, isRent);
        const newScore = getRichnessScore(t, isRent);
        if (newScore > existingScore) {
          seen.set(key, t);
        }
      }
    }
    byApt[aptName] = Array.from(seen.values());
  }

  // 아파트별 요약 계산
  const summaries = {};
  let aptCount = 0;

  console.log('🔗 타입 맵 다운로드 중 (공급면적 기준 평당가 계산)...');
  const typeMap = await fetchTypeMap();

  console.log('🗺️ 법정동 매핑 다운로드 중...');
  const { dongMap, validTxKeys, allAptTxKeys } = await fetchDongMap();
  console.log(`   ${Object.keys(dongMap).length}개 아파트-동 매핑 로드 완료. 유효 아파트: ${validTxKeys.size}개. 원본 txKey: ${allAptTxKeys.size}개`);

  // 18년(216개월) 거시 트렌드 수집용 객체 초기화
  const { macroTrendData, trendMonths } = initMacroTrendData(216, 2, now);

  // 필터링된 아파트 목록
  const filteredApts = Object.keys(byApt).filter(aptName => validTxKeys.has(aptName) || validTxKeys.has(normalizeAptName(aptName)));
  console.log(`🧹 전체 ${Object.keys(byApt).length}개 중 동탄 지역 ${filteredApts.length}개 아파트만 필터링 완료`);

  const allSaleTxs = [];

  for (const aptName of filteredApts) {
    const txs = byApt[aptName];
    const rawRentTxs = txs.filter(t => {
      if (t.dealType === '전세') return true;
      if (t.dealType === '월세' && t.monthlyRent && t.monthlyRent > 0) return true;
      return false;
    });
    const rawSaleTxs = txs.filter(t => t.dealType !== '전세' && t.dealType !== '월세');
    
    if (rawSaleTxs.length === 0 && rawRentTxs.length === 0) continue;

    // 롤링 윈도우 기반 이상치 필터링
    const saleTxs = filterOutliersRolling(rawSaleTxs);
    const rentTxs = filterOutliersRolling(rawRentTxs);
    allSaleTxs.push(...saleTxs);

    // 공급면적(분양평수) 평당 가격으로 재조정
    const getSupplyPyeong = (t) => {
      const dbAptName = normalizeAptName(aptName);
      const supplyPyeong = typeMap[dbAptName]?.[String(t.area)];
      if (supplyPyeong) return supplyPyeong;
      return t.area * 0.3025 * 1.33; // Fallback
    };
    
    txs.forEach(t => { t.areaPyeong = getSupplyPyeong(t); });
    saleTxs.forEach(t => { t.areaPyeong = getSupplyPyeong(t); });
    rentTxs.forEach(t => { t.areaPyeong = getSupplyPyeong(t); });

    // 거시 트렌드 누적
    accumulateMacroTrend(macroTrendData, trendMonths, saleTxs, rentTxs);

    // 단지별 통계 요약 계산
    summaries[aptName] = calculateApartmentSummary(aptName, saleTxs, rentTxs, dongMap, now);
    aptCount++;
  }

  console.log(`\n✅ 요약 완료: ${aptCount}개 아파트 (매매+전월세 통합)`);

  // 최근 7일 거래량 및 WoW 추세 계산
  const recent7DaysVolume = calculateRecent7DaysVolume(allSaleTxs, parseYYYYMMDD);

  // 거시 트렌드 시계열 배열 생성
  const dongtanMacroTrend = generateMacroTrendSeries(macroTrendData, trendMonths);

  // 최근 90일 매매 실거래 플랫 리스트 생성
  const recentTransactions = formatRecentTransactions(allSaleTxs, now, 1000);

  // 요약 및 트렌드 JSON 파일 출력
  writeSummaryFiles({
    summaryPath: OUTPUT_PATH,
    recentTxPath: RECENT_TX_OUTPUT_PATH,
    macroTrendPath: MACRO_TREND_OUTPUT_PATH
  }, {
    summary: summaries,
    recent7DaysVolume,
    recentTransactions,
    dongtanMacroTrend
  });

  console.log(`🎉 동기화 완료!`);

  // 아파트별 JSON 청크 생성 (public/tx-data/*.json)
  const localApts = getLocalAptTxKeys();
  const combinedApts = new Set([
    ...(allAptTxKeys ? Array.from(allAptTxKeys) : []),
    ...(localApts ? Array.from(localApts) : [])
  ]);
  const targetApts = (combinedApts.size > 0 ? Array.from(combinedApts) : filteredApts).filter(Boolean);

  const chunkResult = writeApartmentChunks(TX_DATA_DIR, targetApts, byApt, isFullSync);

  console.log(`📁 JSON 청크: ${TX_DATA_DIR}`);
  console.log(`   ${chunkResult.chunkCount}개 아파트, ${chunkResult.totalRecords}건, 총 ${Math.round(chunkResult.totalSizeKB)}KB`);
  console.log(`   (기존 16MB .ts → ${Math.round(chunkResult.totalSizeKB)}KB 분할)`);

  process.exit(0);
}

main().catch(err => {
  console.error('❌ 동기화 실패:', err.message);
  process.exit(1);
});
