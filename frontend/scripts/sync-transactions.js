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
  normalizeRegisteredDate,
  calculateApartmentSummary,
  formatRecentTransactions,
  formatPeriodTransactions
} = require('./pipeline/apartmentSummarizer');
const {
  writeSummaryFiles,
  writeApartmentChunks,
  migrateLegacyPathologicalFiles
} = require('./pipeline/fileGenerators');
const { sanitizeAptKey, getSupplyPyeong } = require('../pipeline/core/normalizer');

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
  cdealDay: z.string().optional().nullable(),
  cdealType: z.string().optional().nullable(),
  isCanceled: z.boolean().optional().nullable(),
  contractDate: z.string().optional().nullable(),
  registeredDate: z.string().optional().nullable(),
  registeredDateLabel: z.string().optional().nullable(),
  registrationDate: z.string().optional().nullable(),
});

const OUTPUT_PATH = path.resolve(__dirname, '../public/data/tx-summary.json');
const RECENT_TX_OUTPUT_PATH = path.resolve(__dirname, '../public/data/recent-transactions.json');
const PERIOD_1Y_OUTPUT_PATH = path.resolve(__dirname, '../public/data/transactions-1y.json');
const PERIOD_3Y_OUTPUT_PATH = path.resolve(__dirname, '../public/data/transactions-3y.json');
const PERIOD_ALL_OUTPUT_PATH = path.resolve(__dirname, '../public/data/transactions-all.json');
const MACRO_TREND_OUTPUT_PATH = path.resolve(__dirname, '../public/data/macro-trend.json');
const TX_DATA_DIR = path.resolve(__dirname, '../public/tx-data');

const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
let serviceAccount;
let isOffline = process.env.OFFLINE_MODE === 'true';

const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'portfolio-dtdls';

if (!isOffline) {
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
    console.log('ℹ️ Firebase 인증 정보 미감지: 로컬 정적 청크(public/tx-data/*.json) 기반 오프라인 모드로 실행합니다.');
    isOffline = true;
  }
}

if (serviceAccount && typeof serviceAccount.private_key === 'string') {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

if (!isOffline && !admin.apps.length) {
  try {
    const config = serviceAccount ? { credential: admin.credential.cert(serviceAccount) } : { projectId };
    admin.initializeApp(config);
    try {
      admin.firestore().settings({ ignoreUndefinedProperties: true, preferRest: true });
    } catch {
      // settings already applied
    }
  } catch (err) {
    console.warn('⚠️ Firebase Admin 초기화 실패, 오프라인 모드로 전환합니다:', err.message);
    isOffline = true;
  }
}

const SHEET_ID = '1rKMt-B2FdN5nGaxaU0y2Pqv1WqnEv1AGnY7XXE7pCEE';

const DEFAULT_DONG_MAP = {
  '서해더블루90-2': '반송동',
  '서해더블루106-7': '반송동',
  '서해더블루93-8': '반송동',
  '동탄하이페리온': '반송동',
  '동탄2엘에이치씨26단지행복주택': '송동',
  '동탄2엘에이치26단지아파트에이65블록': '송동',
  '화성동탄2하우스디엔에이치에프': '산척동',
  '화성동탄2엘에이치35단지3511-15': '산척동',
  '화성동탄2엘에이치35단지3501-7': '산척동',
  '화성동탄2LH2단지': '영천동',
  '동탄2LH2단지': '영천동',
  '엔에이치에프엘크루': '장지동',
  '센트럴써밋': '산척동',
  '동탄2엘에이치행복주택28단지': '장지동',
  '동탄2엘에이치4단지': '영천동',
  '동탄2엘에이치40단지': '신동',
  '동탄2엘에이치1단지에이6블록': '영천동',
  '동탄2신동포레경기행복주택': '신동',
  '동탄2LH38단지': '신동',
  '동탄238단지행복주택A-54BL': '신동',
  '새강마을휴먼시아5단지': '반송동',
  '동탄호수공원경기행복주택': '산척동',
  '휴먼시아7단지아파트': '능동',
  '화성동탄상록리슈빌아파트영구임대': '영천동',
  '동탄에스원센트로빌': '반송동',
  '동탄신도시금강펜테리움7차센트럴파크': '신동',
  '엔에이치에프경남아너스빌': '목동',
  '동탄능동마을상록예가': '능동',
  '동탄호수공원리슈빌': '장지동',
  '센트럴S타운': '반송동',
  '금강펜테리움6차센트럴파크': '신동',
  '동탄스카이뷰빌딩': '반송동',
  '에스원스마트빌': '능동',
  '동탄파크릭스A51-1BL아파트': '신동',
  '동탄파크릭스A51-2BL아파트': '신동',
  '동탄파크릭스A52BL아파트': '신동',
  '동탄파크릭스A55BL아파트': '신동',
  '동탄숨마데시앙': '신동',
  '능동마을주공아파트': '능동',
  '제일풍경채퍼스티어': '신동',
  '동탄역금강펜테리움더시글로': '영천동',
  '동탄아테라파밀리에': '신동',
  '동탄호수공원자연앤자이': '장지동',
  '풍림아이원THELAKE': '장지동',
  '동탄역자이': '영천동',
};

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

function getCanonicalAptKey(name) {
  let key = sanitizeAptKey(name);
  if (key.includes('금호어울림레이크1차')) {
    key = '금호어울림레이크';
  }
  return key;
}

async function fetchTypeMap() {
  const typeMap = {};
  try {
    const localTypeMapPath = path.resolve(__dirname, '../public/data/type-map.json');
    if (fs.existsSync(localTypeMapPath)) {
      const localItems = JSON.parse(fs.readFileSync(localTypeMapPath, 'utf-8'));
      if (Array.isArray(localItems)) {
        for (const item of localItems) {
          if (!item.aptName || !item.area) continue;
          const aptName = normalizeAptName(item.aptName);
          const canonName = getCanonicalAptKey(item.aptName);
          const area = String(item.area).trim();
          const typeM2Str = String(item.typeM2 || '').trim();
          if (aptName && area && typeM2Str) {
            const match = typeM2Str.match(/\d+(\.\d+)?/);
            if (match) {
              const val = parseFloat(match[0]) * 0.3025;
              if (!typeMap[aptName]) typeMap[aptName] = {};
              typeMap[aptName][area] = val;
              if (canonName) {
                if (!typeMap[canonName]) typeMap[canonName] = {};
                typeMap[canonName][area] = val;
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('⚠️ 로컬 type-map.json 로드 경고:', e.message);
  }
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=TYPE_MAP`;
    const res = await fetch(csvUrl, { signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined });
    if (res.ok) {
      const csvText = await res.text();
      const lines = csvText.split('\n').filter(l => l.trim());
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        if (cols.length < 3) continue;
        const rawAptName = cols[1] || '';
        const aptName = normalizeAptName(rawAptName);
        const canonName = getCanonicalAptKey(rawAptName);
        const area = (cols[2] || '').trim();
        const typeM2Str = (cols[3] || '').trim();
        if (aptName && area && typeM2Str) {
          const match = typeM2Str.match(/\d+(\.\d+)?/);
          if (match) {
            const val = parseFloat(match[0]) * 0.3025;
            if (!typeMap[aptName]) typeMap[aptName] = {};
            typeMap[aptName][area] = val;
            if (canonName) {
              if (!typeMap[canonName]) typeMap[canonName] = {};
              typeMap[canonName][area] = val;
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('⚠️ Google Sheets TYPE_MAP 다운로드 실패, 기본 평당가 추정 로직으로 폴백합니다:', e.message);
  }
  return typeMap;
}

function loadLocalDongMap() {
  const dongMap = { ...DEFAULT_DONG_MAP };
  const validTxKeys = new Set(Object.keys(DEFAULT_DONG_MAP));
  const allAptTxKeys = new Set(Object.keys(DEFAULT_DONG_MAP));
  try {
    if (fs.existsSync(OUTPUT_PATH)) {
      const existingSummary = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
      if (existingSummary && existingSummary.summary) {
        for (const [k, v] of Object.entries(existingSummary.summary)) {
          if (v && v.dong && String(v.dong).trim()) {
            const d = String(v.dong).trim();
            dongMap[k] = d;
            dongMap[normalizeAptName(k)] = d;
            dongMap[getCanonicalAptKey(k)] = d;
          }
        }
      }
    }
  } catch {
    // ignore existing summary parse error
  }
  try {
    const aptsPath = path.resolve(__dirname, '../public/data/apartments-by-dong.json');
    if (fs.existsSync(aptsPath)) {
      const data = JSON.parse(fs.readFileSync(aptsPath, 'utf-8'));
      if (data && data.byDong) {
        for (const [dong, apts] of Object.entries(data.byDong)) {
          for (const apt of apts) {
            const name = apt.name || '';
            const txKey = apt.txKey || name;
            const normName = normalizeAptName(name);
            const canonName = getCanonicalAptKey(name);
            const normTxKey = normalizeAptName(txKey);
            const canonTxKey = getCanonicalAptKey(txKey);
            if (dong) {
              if (normName) dongMap[normName] = dong;
              if (canonName) dongMap[canonName] = dong;
              if (normTxKey) dongMap[normTxKey] = dong;
              if (canonTxKey) dongMap[canonTxKey] = dong;
            }
            if (normTxKey) {
              validTxKeys.add(normTxKey);
              allAptTxKeys.add(normTxKey);
            }
            if (canonTxKey) {
              validTxKeys.add(canonTxKey);
              allAptTxKeys.add(canonTxKey);
            }
            if (normName) {
              validTxKeys.add(normName);
            }
            if (canonName) {
              validTxKeys.add(canonName);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('⚠️ 로컬 apartments-by-dong.json 파싱 실패:', err.message);
  }
  return { dongMap, validTxKeys, allAptTxKeys };
}

async function fetchDongMap() {
  const localData = loadLocalDongMap();
  const dongMap = { ...localData.dongMap };
  const validTxKeys = new Set(localData.validTxKeys);
  const allAptTxKeys = new Set(localData.allAptTxKeys);

  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=apartments`;
    const res = await fetch(csvUrl, { signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined });
    if (res.ok) {
      const csvText = await res.text();
      const lines = csvText.split('\n').filter(l => l.trim());
      if (lines.length >= 2) {
        const headers = parseCsvLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
        const nameIdx = headers.findIndex(h => h === '아파트명' || h === 'name' || h === '이름');
        const dongIdx = headers.findIndex(h => h === 'dong' || h === '동');
        const txKeyIdx = headers.findIndex(h => h === 'txkey');
        
        if (nameIdx !== -1) {
          for (let i = 1; i < lines.length; i++) {
            const cols = parseCsvLine(lines[i]).map(c => c.replace(/^"|"$/g, '').trim());
            const name = cols[nameIdx];
            const dong = dongIdx !== -1 ? cols[dongIdx] : '';
            let txKey = txKeyIdx !== -1 ? cols[txKeyIdx] : '';
            
            if (name) {
              const normName = normalizeAptName(name);
              const canonName = getCanonicalAptKey(name);
              if (dong) {
                if (normName) dongMap[normName] = dong;
                if (canonName) dongMap[canonName] = dong;
              }
              if (!txKey) txKey = name;
              const normTxKey = normalizeAptName(txKey);
              const canonTxKey = getCanonicalAptKey(txKey);
              if (dong) {
                if (normTxKey) dongMap[normTxKey] = dong;
                if (canonTxKey) dongMap[canonTxKey] = dong;
              }
              validTxKeys.add(normTxKey);
              validTxKeys.add(canonTxKey);
              validTxKeys.add(normName);
              validTxKeys.add(canonName);
              allAptTxKeys.add(canonTxKey);
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('⚠️ Google Sheets 법정동 매핑 다운로드 실패, 로컬 apartments-by-dong.json으로 폴백합니다:', e.message);
  }
  return { dongMap, validTxKeys, allAptTxKeys };
}

function getLocalAptTxKeys() {
  return loadLocalDongMap().allAptTxKeys;
}

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

const DONGTAN_DONGS = ['반송동', '능동', '청계동', '영천동', '오산동', '신동', '목동', '산척동', '장지동', '송동', '방교동', '금곡동', '여울동', '석우동'];
const MOLIT_LAWD_CDS = ['41590', '41597'];
const MOLIT_TRADE_URL = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev';
const MOLIT_RENT_URL = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent';

function extractMolitItems(rawData) {
  const text = typeof rawData === 'string' ? rawData : JSON.stringify(rawData);
  const isXml = typeof rawData === 'string' && rawData.trim().startsWith('<');
  if (isXml) {
    const resultCodeMatch = text.match(/<resultCode>([^<]*)<\/resultCode>/i) ||
                            text.match(/<returnReasonCode>([^<]*)<\/returnReasonCode>/i);
    const resultCode = resultCodeMatch ? resultCodeMatch[1].trim() : '';
    if ((resultCode && resultCode !== '00' && resultCode !== '000') || text.includes('<OpenAPI_ServiceResponse>') || text.includes('<cmmMsgHeader>')) {
      return { totalCount: 0, items: [], isError: true };
    }
    const totalMatch = text.match(/<totalCount>(\d+)<\/totalCount>/);
    const totalCount = totalMatch ? parseInt(totalMatch[1], 10) : 0;
    if (totalCount === 0) return { totalCount: 0, items: [], isError: false };
    const itemsXml = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
    const items = itemsXml.map((itemXml) => {
      const tagMap = {};
      const tagRegex = /<([^>]+)>([^<]*)<\/\1>/g;
      let tagMatch;
      while ((tagMatch = tagRegex.exec(itemXml)) !== null) {
        tagMap[tagMatch[1]] = tagMatch[2].trim();
      }
      return tagMap;
    });
    return { totalCount, items, isError: false };
  }
  const jsonResultCode = rawData?.response?.header?.resultCode || rawData?.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnReasonCode;
  if (jsonResultCode && jsonResultCode !== '000' && jsonResultCode !== '00') {
    return { totalCount: 0, items: [], isError: true };
  }
  const body = rawData?.response?.body;
  if (!body) return { totalCount: 0, items: [], isError: false };
  const totalCount = Number(body.totalCount) || 0;
  let items = body.items?.item || [];
  if (!Array.isArray(items)) items = items ? [items] : [];
  return { totalCount, items, isError: false };
}

function getMolitField(item, ...keys) {
  for (const k of keys) {
    if (item && item[k] !== undefined && item[k] !== null && String(item[k]).trim() !== '') {
      return String(item[k]).trim();
    }
  }
  return '';
}

async function fetchRecentMolitDirect(byApt, now = new Date()) {
  const { fetchWithRetry: fetchTradeWithRetry, DEFAULT_API_KEY } = require('./fetch-transactions');
  const { fetchWithRetry: fetchRentWithRetry } = require('./fetch-rent');
  const apiKey = (process.env.BUILDING_API_KEY || DEFAULT_API_KEY).trim();
  if (!apiKey) return { tradeAdded: 0, rentAdded: 0 };

  const targetMonths = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    targetMonths.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  targetMonths.sort();

  console.log(`📡 국토부 OpenAPI 직통/릴레이 최신 실거래 보강 수집 중 (${targetMonths.join(', ')})...`);
  let tradeAdded = 0;
  let rentAdded = 0;

  for (const ym of targetMonths) {
    const seenTradeIds = new Set();
    for (const lawdCd of MOLIT_LAWD_CDS) {
      let page = 1;
      let totalCount = 0;
      const districtOcc = new Map();
      do {
        const url = `${MOLIT_TRADE_URL}?serviceKey=${encodeURIComponent(apiKey)}&LAWD_CD=${lawdCd}&DEAL_YMD=${ym}&pageNo=${page}&numOfRows=1000&_type=json`;
        try {
          const res = await fetchTradeWithRetry(url, { timeout: 10000 }, 2, 800);
          const parsedEnv = extractMolitItems(res.data);
          if (parsedEnv.isError || parsedEnv.totalCount === 0 || parsedEnv.items.length === 0) break;
          totalCount = parsedEnv.totalCount;

          for (const item of parsedEnv.items) {
            const dong = getMolitField(item, 'umdNm', '법정동', 'dong');
            if (!DONGTAN_DONGS.some(d => dong.includes(d))) continue;
            const aptName = getMolitField(item, 'aptNm', '아파트');
            const price = parseInt(getMolitField(item, 'dealAmount', '거래금액').replace(/,/g, ''), 10) || 0;
            const area = parseFloat(getMolitField(item, 'excluUseAr', '전용면적')) || 0;
            const contractDay = getMolitField(item, 'dealDay', '일').padStart(2, '0');
            const floor = parseInt(getMolitField(item, 'floor', '층'), 10) || 0;
            const buildYear = parseInt(getMolitField(item, 'buildYear', '건축년도'), 10) || 0;
            const contractYear = parseInt(ym.substring(0, 4), 10) || 0;
            if (buildYear > 0 && contractYear > 0 && contractYear < buildYear) continue;

            const baseKey = `${aptName}_${ym}_${contractDay}_${area}_${price}_${floor}`;
            const occ = (districtOcc.get(baseKey) || 0) + 1;
            districtOcc.set(baseKey, occ);
            const txId = `${baseKey}_${occ}`;
            if (seenTradeIds.has(txId)) continue;
            seenTradeIds.add(txId);

            const cancelDate = getMolitField(item, 'cdealDay', '해제사유발생일');
            const cdealType = getMolitField(item, 'cdealType', '해제여부');
            const dealingGbn = getMolitField(item, 'dealingGbn', '거래유형');
            const dealType = dealingGbn || (cdealType && cdealType !== 'O' && cdealType !== '해제' ? cdealType : '') || '매매';

            const rawRecord = {
              aptName,
              contractYm: ym,
              contractDay,
              price,
              deposit: 0,
              monthlyRent: 0,
              dealType,
              area,
              areaPyeong: 0,
              floor,
              dong,
              buildYear,
              cancelDate,
              cdealDay: cancelDate,
              cdealType,
            };
            const valid = TransactionRecordSchema.safeParse(rawRecord);
            if (!valid.success) continue;

            const rgstDate = getMolitField(item, 'rgstDate', '등기일자');
            const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
            const todayKst = `${kstNow.getUTCFullYear()}${String(kstNow.getUTCMonth() + 1).padStart(2, '0')}${String(kstNow.getUTCDate()).padStart(2, '0')}`;
            const registeredDate = rgstDate && rgstDate.length === 8 ? rgstDate : todayKst;
            const registeredDateLabel = `${registeredDate.slice(4, 6)}.${registeredDate.slice(6, 8)}`;

            const key = getCanonicalAptKey(aptName);
            if (!byApt[key]) byApt[key] = [];
            const isCanceled = isCancelledTransaction(rawRecord);
            byApt[key].push({
              aptName,
              contractYm: ym,
              contractDay,
              price,
              priceEok: formatPriceEok(price),
              deposit: 0,
              monthlyRent: 0,
              reqGb: '',
              rnuYn: '',
              area,
              areaPyeong: 0,
              floor,
              dong,
              dealType,
              contractDate: `${ym}${contractDay}`,
              registeredDate,
              registeredDateLabel,
              cancelDate: cancelDate || (isCanceled ? '취소' : ''),
              cdealDay: cancelDate,
              cdealType,
              isCanceled,
            });
            tradeAdded++;
          }
          page++;
        } catch (err) {
          console.warn(`   ⚠️ [Direct Trade Sync] ${ym} (${lawdCd}) page ${page} 스킵: ${err.message}`);
          break;
        }
      } while ((page - 1) * 1000 < totalCount);
    }

    const seenRentIds = new Set();
    for (const lawdCd of MOLIT_LAWD_CDS) {
      let page = 1;
      let totalCount = 0;
      const districtOcc = new Map();
      do {
        const url = `${MOLIT_RENT_URL}?serviceKey=${encodeURIComponent(apiKey)}&LAWD_CD=${lawdCd}&DEAL_YMD=${ym}&pageNo=${page}&numOfRows=1000&_type=json`;
        try {
          const res = await fetchRentWithRetry(url, { timeout: 10000 }, 2, 800);
          const parsedEnv = extractMolitItems(res.data);
          if (parsedEnv.isError || parsedEnv.totalCount === 0 || parsedEnv.items.length === 0) break;
          totalCount = parsedEnv.totalCount;

          for (const item of parsedEnv.items) {
            const dong = getMolitField(item, 'umdNm', '법정동', 'dong');
            if (!DONGTAN_DONGS.some(d => dong.includes(d))) continue;
            const aptName = getMolitField(item, 'aptNm', '아파트');
            const deposit = parseInt(getMolitField(item, 'deposit', '보증금액', '보증금').replace(/,/g, ''), 10) || 0;
            const monthlyRent = parseInt(getMolitField(item, 'monthlyRent', '월세금액', '월세').replace(/,/g, ''), 10) || 0;
            const dealType = monthlyRent > 0 ? '월세' : '전세';
            const area = parseFloat(getMolitField(item, 'excluUseAr', '전용면적')) || 0;
            const contractDay = getMolitField(item, 'dealDay', '일').padStart(2, '0');
            const floor = parseInt(getMolitField(item, 'floor', '층'), 10) || 0;
            const buildYear = parseInt(getMolitField(item, 'buildYear', '건축년도'), 10) || 0;
            const contractYear = parseInt(ym.substring(0, 4), 10) || 0;
            if (buildYear > 0 && contractYear > 0 && contractYear < buildYear) continue;

            const baseKey = `RENT_${aptName}_${ym}_${contractDay}_${area}_${deposit}_${monthlyRent}_${floor}`;
            const occ = (districtOcc.get(baseKey) || 0) + 1;
            districtOcc.set(baseKey, occ);
            const txId = `${baseKey}_${occ}`;
            if (seenRentIds.has(txId)) continue;
            seenRentIds.add(txId);

            const reqGb = getMolitField(item, 'contractType', '계약구분');
            const rnuYn = getMolitField(item, 'useRRRight', '갱신요구권사용여부');

            const rawRecord = {
              aptName,
              contractYm: ym,
              contractDay,
              price: deposit,
              deposit,
              monthlyRent,
              dealType,
              area,
              areaPyeong: 0,
              floor,
              dong,
              buildYear,
            };
            const valid = TransactionRecordSchema.safeParse(rawRecord);
            if (!valid.success) continue;

            const key = getCanonicalAptKey(aptName);
            if (!byApt[key]) byApt[key] = [];
            byApt[key].push({
              aptName,
              contractYm: ym,
              contractDay,
              price: deposit,
              priceEok: formatPriceEok(deposit) + (monthlyRent ? `/${monthlyRent}` : ''),
              deposit,
              monthlyRent,
              reqGb,
              rnuYn,
              area,
              areaPyeong: 0,
              floor,
              dong,
              dealType,
              contractDate: `${ym}${contractDay}`,
              cancelDate: '',
              cdealDay: '',
              cdealType: '',
              isCanceled: false,
            });
            rentAdded++;
          }
          page++;
        } catch (err) {
          console.warn(`   ⚠️ [Direct Rent Sync] ${ym} (${lawdCd}) page ${page} 스킵: ${err.message}`);
          break;
        }
      } while ((page - 1) * 1000 < totalCount);
    }
  }
  console.log(`   ✅ 국토부 최신 실거래 보강 완료: 매매 ${tradeAdded}건, 전월세 ${rentAdded}건 병합`);
  return { tradeAdded, rentAdded };
}

async function main() {
  const processedDocIds = new Set();
  let isFullSync = process.argv.includes('--full');
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  const cutoffYm = `${threeMonthsAgo.getFullYear()}${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}`;
  const cutoffDate = `${cutoffYm}01`;

  const byApt = {};

  if (!isFullSync && fs.existsSync(TX_DATA_DIR)) {
    console.log('📥 [Incremental] 로컬 JSON 캐시(기존 실거래가)를 로드합니다...');
    migrateLegacyPathologicalFiles(TX_DATA_DIR);
    let indexList = [];
    const indexPath = path.join(TX_DATA_DIR, '_index.json');
    if (fs.existsSync(indexPath)) {
      try {
        indexList = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      } catch (e) {
        console.warn('⚠️ 로컬 _index.json 파싱 실패, 디렉토리 파일 목록에서 재구성합니다:', e.message);
      }
    }
    // Reconstruct / supplement index from fs.readdirSync(TX_DATA_DIR) to ensure all complexes are loaded
    const diskFiles = fs.readdirSync(TX_DATA_DIR)
      .filter(f => f.endsWith('.json') && !f.endsWith('-recent.json') && f !== '_index.json')
      .map(f => f.replace('.json', ''));
    indexList = Array.from(new Set([...(Array.isArray(indexList) ? indexList : []), ...diskFiles]));

    for (const aptName of indexList) {
      let filepath = path.join(TX_DATA_DIR, `${aptName}.json`);
      if (!fs.existsSync(filepath)) {
        filepath = path.join(TX_DATA_DIR, `${getCanonicalAptKey(aptName)}.json`);
      }
      if (!fs.existsSync(filepath)) {
        filepath = path.join(TX_DATA_DIR, `${normalizeAptName(aptName)}.json`);
      }
      if (fs.existsSync(filepath)) {
        try {
          const canonicalKey = getCanonicalAptKey(aptName);
          const records = JSON.parse(fs.readFileSync(filepath, 'utf8'));
          const filteredRecords = records
            .map(d => {
              const contractDate = d.contractDate || `${d.contractYm || ''}${String(d.contractDay || '').padStart(2, '0')}`;
              const registeredDate = normalizeRegisteredDate(d.registeredDate || d.registrationDate, contractDate);
              const registeredDateLabel = d.registeredDateLabel || (registeredDate && registeredDate.length >= 8 ? `${registeredDate.slice(4, 6)}.${registeredDate.slice(6, 8)}` : '');
              return {
                ...d,
                aptName: d.aptName || canonicalKey,
                txKey: canonicalKey,
                isCanceled: isCancelledTransaction(d),
                contractDate,
                registeredDate,
                registeredDateLabel,
                dong: d.dong || ''
              };
            })
            .filter(d => {
              const hasValidYm = d.contractYm && d.contractYm.length === 6 && /^\d{6}$/.test(d.contractYm);
              return Boolean(hasValidYm);
            });
          if (!byApt[canonicalKey]) byApt[canonicalKey] = [];
          byApt[canonicalKey].push(...filteredRecords);
        } catch (err) {
          console.warn(`⚠️ ${aptName}.json 로드 중 오류:`, err.message);
        }
      }
    }
    console.log(`✅ ${Object.keys(byApt).length}개 아파트의 기존 데이터 로드 완료 (모든 키 정규화 완료)`);
  } else if (isFullSync) {
    if (!process.env.ALLOW_EXPENSIVE_FULL_SYNC) {
      console.warn('⚠️ ALLOW_EXPENSIVE_FULL_SYNC 미설정: 전체 스캔(17만 건) 방지를 위해 로컬 캐시 기반으로 안전하게 컴파일합니다.');
      isFullSync = false;
    } else {
      console.log('🚀 [Full Sync] 로컬 캐시를 무시하고 전체 데이터를 처음부터 다시 동기화합니다...');
    }
  }

  if (!isOffline && !isFullSync) {
    console.log(`📡 Firestore에서 실거래가 데이터 읽는 중... (Incremental: ${cutoffDate + ' 이후'})`);
    try {
      const db = admin.firestore();
      let collRef = db.collection('transactions');
      collRef = collRef.where('contractDate', '>=', cutoffDate);
      const snapshot = await collRef.orderBy('contractDate', 'desc').get();
      console.log(`📋 transactions 컬렉션에서 ${snapshot.size}건 로드 완료`);

      snapshot.forEach((docSnap) => {
    const d = docSnap.data();
    const aptName = d.aptName || '';

    const rawDealType =
      d.dealingGbn === '직거래' || d.dealType === '직거래' || d.isDirectDeal === true
        ? '직거래'
        : d.dealingGbn === '중개거래' && (!d.dealType || d.dealType.trim() === '매매')
          ? '중개거래'
          : (d.dealType && d.dealType.trim()) || '매매';

    const rawRecord = {
      aptName,
      contractYm: d.contractYm || '',
      contractDay: d.contractDay,
      price: d.price,
      deposit: d.deposit,
      monthlyRent: d.monthlyRent,
      dealType: rawDealType,
      area: d.area,
      areaPyeong: d.areaPyeong,
      floor: d.floor,
      dong: d.dong,
      buildYear: d.buildYear || d.constructionYear,
      cancelDate: d.cancelDate || d.cdealDay || '',
      cdealDay: d.cdealDay,
      cdealType: d.cdealType,
      isCanceled: d.isCanceled,
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

    const key = getCanonicalAptKey(validData.aptName);
    if (!byApt[key]) byApt[key] = [];    
    
    const cDate = `${validData.contractYm}${String(validData.contractDay || '').padStart(2, '0')}`;
    
    if (processedDocIds.has(docSnap.id)) {
      return;
    }
    processedDocIds.add(docSnap.id);

    const isCanceled = isCancelledTransaction(validData) || isCancelledTransaction(d);

    const regDate = normalizeRegisteredDate(d.registeredDate || d.registrationDate || validData.registeredDate || validData.registrationDate, cDate);
    const regDateLabel = d.registeredDateLabel || validData.registeredDateLabel || (regDate && regDate.length >= 8 ? `${regDate.slice(4, 6)}.${regDate.slice(6, 8)}` : '');

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
      isDirectDeal: validData.dealType === '직거래' || d.isDirectDeal === true,
      contractDate: cDate,
      registeredDate: regDate,
      registeredDateLabel: regDateLabel,
      cancelDate: validData.cancelDate || d.cdealDay || (isCanceled ? '취소' : ''),
      cdealDay: d.cdealDay || '',
      cdealType: d.cdealType || '',
      isCanceled,
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

    const rawSyncDealType =
      d.dealingGbn === '직거래' || d.dealType === '직거래' || d.isDirectDeal === true
        ? '직거래'
        : d.dealingGbn === '중개거래' && (!d.dealType || d.dealType.trim() === '매매')
          ? '중개거래'
          : (d.dealType && d.dealType.trim()) || '매매';

    const rawRecord = {
      aptName,
      contractYm: d.contractYm || '',
      contractDay: d.contractDay,
      price: d.price,
      deposit: d.deposit,
      monthlyRent: d.monthlyRent,
      dealType: rawSyncDealType,
      area: d.area,
      areaPyeong: d.areaPyeong,
      floor: d.floor,
      dong: d.dong,
      buildYear: d.buildYear || d.constructionYear,
      cancelDate: d.cancelDate || d.cdealDay || '',
      cdealDay: d.cdealDay,
      cdealType: d.cdealType,
      isCanceled: d.isCanceled,
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

    const key = getCanonicalAptKey(validData.aptName);
    if (!byApt[key]) byApt[key] = [];    
    
    const cDate = d.contractDate || `${validData.contractYm}${String(validData.contractDay || '').padStart(2, '0')}`;
    
    if (processedDocIds.has(docSnap.id)) {
      return;
    }
    processedDocIds.add(docSnap.id);

    const isCanceled = isCancelledTransaction(validData) || isCancelledTransaction(d);

    const regDate = normalizeRegisteredDate(d.registeredDate || d.registrationDate || validData.registeredDate || validData.registrationDate, cDate);
    const regDateLabel = d.registeredDateLabel || validData.registeredDateLabel || (regDate && regDate.length >= 8 ? `${regDate.slice(4, 6)}.${regDate.slice(6, 8)}` : '');

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
      isDirectDeal: validData.dealType === '직거래' || d.isDirectDeal === true,
      contractDate: cDate,
      registeredDate: regDate,
      registeredDateLabel: regDateLabel,
      cancelDate: validData.cancelDate || d.cdealDay || (isCanceled ? '취소' : ''),
      cdealDay: d.cdealDay || '',
      cdealType: d.cdealType || '',
      isCanceled,
    });
  });
    } catch (err) {
      console.warn('⚠️ Firestore 실거래가 로드 실패/오프라인 모드, 로컬 데이터로 계속 진행합니다:', err.message);
    }
  }

  if (process.env.OFFLINE_MODE !== 'true' && process.env.SKIP_MOLIT_DIRECT_FETCH !== 'true') {
    await fetchRecentMolitDirect(byApt, now);
  }

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
    if (isCancelledTransaction(item)) {
      score += 5; // 취소 정보가 누락되지 않도록 가중치 부여
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
        const winner = newScore >= existingScore ? t : existing;
        if (isCancelledTransaction(existing) || isCancelledTransaction(t)) {
          winner.isCanceled = true;
          if (!winner.cancelDate) {
            winner.cancelDate = t.cancelDate || existing.cancelDate || t.cdealDay || existing.cdealDay || '취소';
          }
          if (!winner.cdealDay && (t.cdealDay || existing.cdealDay)) {
            winner.cdealDay = t.cdealDay || existing.cdealDay;
          }
          if (!winner.cdealType && (t.cdealType || existing.cdealType)) {
            winner.cdealType = t.cdealType || existing.cdealType;
          }
        }
        if (
          existing.dealType === '직거래' ||
          existing.dealingGbn === '직거래' ||
          existing.isDirectDeal === true ||
          t.dealType === '직거래' ||
          t.dealingGbn === '직거래' ||
          t.isDirectDeal === true
        ) {
          winner.dealType = '직거래';
          winner.isDirectDeal = true;
        } else if (
          winner.dealType === '매매' &&
          (existing.dealType === '중개거래' || t.dealType === '중개거래')
        ) {
          winner.dealType = '중개거래';
        }
        if (!winner.dong && (t.dong || existing.dong)) {
          winner.dong = t.dong || existing.dong;
        }
        winner.registeredDate = normalizeRegisteredDate(winner.registeredDate || existing.registeredDate || t.registeredDate, winner.contractDate);
        winner.registeredDateLabel = winner.registeredDateLabel || existing.registeredDateLabel || t.registeredDateLabel || (winner.registeredDate && winner.registeredDate.length >= 8 ? `${winner.registeredDate.slice(4, 6)}.${winner.registeredDate.slice(6, 8)}` : '');
        seen.set(key, winner);
      }
    }
    byApt[aptName] = Array.from(seen.values());
  }

  // 아파트별 요약 계산
  const summaries = {};
  let aptCount = 0;

  let typeMap = {};
  try {
    console.log('🔗 타입 맵 다운로드 중 (공급면적 기준 평당가 계산)...');
    typeMap = await fetchTypeMap();
  } catch (err) {
    console.warn('⚠️ fetchTypeMap 실패, 기본 추정 로직 사용:', err.message);
  }

  let dongMapResult = { dongMap: {}, validTxKeys: new Set(), allAptTxKeys: new Set() };
  try {
    console.log('🗺️ 법정동 매핑 다운로드 중...');
    dongMapResult = await fetchDongMap();
  } catch (err) {
    console.warn('⚠️ fetchDongMap 실패, 로컬 캐시 사용:', err.message);
    dongMapResult = loadLocalDongMap();
  }
  const { dongMap, validTxKeys, allAptTxKeys } = dongMapResult;
  console.log(`   ${Object.keys(dongMap).length}개 아파트-동 매핑 로드 완료. 유효 아파트: ${validTxKeys.size}개. 원본 txKey: ${allAptTxKeys.size}개`);

  // Guarantee all complexes in byApt / TX_DATA_DIR are preserved in validTxKeys and allAptTxKeys
  Object.keys(byApt).forEach(k => {
    const canonK = getCanonicalAptKey(k);
    validTxKeys.add(k);
    validTxKeys.add(canonK);
    validTxKeys.add(normalizeAptName(k));
    allAptTxKeys.add(canonK);
  });

  // 18년(216개월) 거시 트렌드 수집용 객체 초기화
  const { macroTrendData, trendMonths } = initMacroTrendData(216, 2, now);

  // 필터링된 아파트 목록
  const filteredApts = Object.keys(byApt).filter(aptName => validTxKeys.has(aptName) || validTxKeys.has(normalizeAptName(aptName)) || validTxKeys.has(getCanonicalAptKey(aptName)));
  console.log(`🧹 전체 ${Object.keys(byApt).length}개 중 동탄 지역 ${filteredApts.length}개 아파트만 필터링 완료`);

  const allSaleTxs = [];

  for (const aptName of filteredApts) {
    const txs = byApt[aptName];
    // 취소/해제 거래를 요약, 거시 트렌드, 최근 거래 피드 생성에서 원천 배제
    const activeTxs = txs.filter(t => !isCancelledTransaction(t));
    const rawRentTxs = activeTxs.filter(t => {
      if (t.dealType === '전세') return true;
      if (t.dealType === '월세' && t.monthlyRent && t.monthlyRent > 0) return true;
      return false;
    });
    const rawSaleTxs = activeTxs.filter(t => t.dealType !== '전세' && t.dealType !== '월세');
    
    if (rawSaleTxs.length === 0 && rawRentTxs.length === 0) continue;

    // 롤링 윈도우 기반 이상치 필터링
    const saleTxs = filterOutliersRolling(rawSaleTxs);
    const rentTxs = filterOutliersRolling(rawRentTxs);
    allSaleTxs.push(...saleTxs);

    // 공급면적(분양평수) 평당 가격으로 재조정 (normalizer.getSupplyPyeong 단일 진실 공급원 통합)
    txs.forEach(t => { t.areaPyeong = getSupplyPyeong(aptName, t.area, typeMap); });
    saleTxs.forEach(t => { t.areaPyeong = getSupplyPyeong(aptName, t.area, typeMap); });
    rentTxs.forEach(t => { t.areaPyeong = getSupplyPyeong(aptName, t.area, typeMap); });

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

  // 기간별 매매 실거래 리스트 생성 (90일/1년/3년/전체)
  const transactions1y = formatPeriodTransactions(allSaleTxs, '1y', now, false);
  const transactions3y = formatPeriodTransactions(allSaleTxs, '3y', now, false);
  const transactionsAll = formatPeriodTransactions(allSaleTxs, 'all', now, true); // compact tuple

  // 요약 및 트렌드 JSON 파일 출력
  writeSummaryFiles({
    summaryPath: OUTPUT_PATH,
    recentTxPath: RECENT_TX_OUTPUT_PATH,
    macroTrendPath: MACRO_TREND_OUTPUT_PATH,
    period1yPath: PERIOD_1Y_OUTPUT_PATH,
    period3yPath: PERIOD_3Y_OUTPUT_PATH,
    periodAllPath: PERIOD_ALL_OUTPUT_PATH,
  }, {
    summary: summaries,
    recent7DaysVolume,
    recentTransactions,
    dongtanMacroTrend,
    transactions1y,
    transactions3y,
    transactionsAll,
  });

  console.log(`🎉 동기화 완료!`);

  // 아파트별 JSON 청크 생성 (public/tx-data/*.json)
  const localApts = getLocalAptTxKeys();
  const combinedApts = new Set([
    ...(allAptTxKeys ? Array.from(allAptTxKeys) : []),
    ...(localApts ? Array.from(localApts) : []),
    ...filteredApts
  ]);
  const targetApts = Array.from(new Set(
    (combinedApts.size > 0 ? Array.from(combinedApts) : filteredApts)
      .filter(Boolean)
      .map(k => getCanonicalAptKey(k))
  ));

  const chunkResult = writeApartmentChunks(TX_DATA_DIR, targetApts, byApt, isFullSync);

  console.log(`📁 JSON 청크: ${TX_DATA_DIR}`);
  console.log(`   ${chunkResult.chunkCount}개 아파트, ${chunkResult.totalRecords}건, 총 ${Math.round(chunkResult.totalSizeKB)}KB`);
  console.log(`   (기존 16MB .ts → ${Math.round(chunkResult.totalSizeKB)}KB 분할)`);

  process.exit(0);
}

module.exports = {
  main,
  fetchRecentMolitDirect,
  extractMolitItems,
  isCancelledTransaction,
  getCanonicalAptKey,
};

if (require.main === module) {
  main().catch(err => {
    console.error('❌ 동기화 실패:', err.message);
    process.exit(1);
  });
}

