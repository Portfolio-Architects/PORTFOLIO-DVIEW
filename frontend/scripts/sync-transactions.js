#!/usr/bin/env node
/**
 * 🔄 Firestore → transaction-summary.ts 동기화 스크립트
 * 
 * 사용법: npm run sync-transactions
 * 
 * Firestore 'transactions' 컬렉션에서 실거래가 데이터를 읽어
 * 아파트별 요약 (최근가, 최고가, 최저가, 건수, 최근 3건)을
 * frontend/src/lib/transaction-summary.ts 파일로 자동 생성합니다.
 * 
 * → Vercel CPU 사용 0, 메인 페이지 즉시 렌더링
 */

require('dotenv').config({ path: '.env.local', override: true });
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.resolve(__dirname, '../public/data/tx-summary.json');

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

function formatPriceEok(priceMan) {
  const eok = Math.floor(priceMan / 10000);
  const remainder = priceMan % 10000;
  if (eok === 0) return `${priceMan.toLocaleString()}만`;
  if (remainder === 0) return `${eok}억`;
  return `${eok}억${remainder.toLocaleString()}`;
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
  } catch(e) {
    console.error('Failed to fetch typeMap', e);
  }
  return typeMap;
}

/** page.tsx와 동일한 정규화 — 공백·괄호·[동이름] 제거 */
function normalizeAptName(name) {
  return name
    .replace(/\[.*?\]\s*/g, '')
    .replace(/\s+/g, '')
    .replace(/[()（）]/g, '')
    .trim();
}

/**
 * Google Sheets 'apartments' 탭에서 아파트명 → 법정동 매핑 테이블 구축
 * 컬럼: 아파트명, dong(법정동)
 */
async function fetchDongMap() {
  const dongMap = {};
  const validTxKeys = new Set();
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=apartments`;
    const res = await fetch(csvUrl);
    if (res.ok) {
      const csvText = await res.text();
      const lines = csvText.split('\n').filter(l => l.trim());
      if (lines.length < 2) return { dongMap, validTxKeys };
      
      const headers = parseCsvLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
      const nameIdx = headers.findIndex(h => h === '아파트명' || h === 'name' || h === '이름');
      const dongIdx = headers.findIndex(h => h === 'dong' || h === '동');
      const txKeyIdx = headers.findIndex(h => h === 'txkey');
      
      if (nameIdx === -1) {
        console.warn('⚠️ apartments 시트에서 아파트명 컬럼을 찾지 못했습니다.');
        return { dongMap, validTxKeys };
      }
      
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]).map(c => c.replace(/^"|"$/g, '').trim());
        const name = cols[nameIdx];
        const dong = dongIdx !== -1 ? cols[dongIdx] : '';
        let txKey = txKeyIdx !== -1 ? cols[txKeyIdx] : '';
        
        if (name) {
          const normName = normalizeAptName(name);
          if (dong) dongMap[normName] = dong;
          if (!txKey) txKey = normName;
          validTxKeys.add(normalizeAptName(txKey));
          validTxKeys.add(normName);
        }
      }
    }
  } catch(e) {
    console.error('⚠️ 법정동 매핑 다운로드 실패:', e.message);
  }
  return { dongMap, validTxKeys };
}

async function main() {
  let isFullSync = process.argv.includes('--full');
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  const cutoffYm = `${threeMonthsAgo.getFullYear()}${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}`;
  const cutoffDate = `${cutoffYm}${String(threeMonthsAgo.getDate()).padStart(2, '0')}`;

  const TX_DATA_DIR = path.resolve(__dirname, '../public/tx-data');
  const byApt = {};

  if (!isFullSync && fs.existsSync(path.join(TX_DATA_DIR, '_index.json'))) {
    console.log('📥 [Incremental] 로컬 JSON 캐시(기존 실거래가)를 로드합니다...');
    try {
      const index = JSON.parse(fs.readFileSync(path.join(TX_DATA_DIR, '_index.json'), 'utf8'));
      for (const aptName of index) {
        const filepath = path.join(TX_DATA_DIR, `${aptName}.json`);
        if (fs.existsSync(filepath)) {
          const records = JSON.parse(fs.readFileSync(filepath, 'utf8'));
          byApt[aptName] = records.map(d => ({
            ...d,
            contractDate: d.contractDate || `${d.contractYm}${String(d.contractDay).padStart(2, '0')}`,
            dong: d.dong || ''
          }));
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
    if (!aptName) return;

    // Filter out transactions that occurred before completion/built year
    const buildYear = parseInt(d.buildYear || d.constructionYear, 10) || 0;
    const contractYear = d.contractYm ? parseInt(d.contractYm.substring(0, 4), 10) : 0;
    if (buildYear > 0 && contractYear > 0 && contractYear < buildYear) {
      return; // Skip pre-completion transaction
    }

    const key = normalizeAptName(aptName);
    if (!byApt[key]) byApt[key] = [];    
    
    const cDate = `${d.contractYm || ''}${String(d.contractDay || '').padStart(2, '0')}`;
    
    // 심화된 중복 방지 (기본 transactions 컬렉션 내에서도 중복 방지)
    const isDup = byApt[key].some(t => 
      t.contractDate === cDate && 
      t.area === (d.area || 0) && 
      Math.abs(t.floor - (d.floor || 0)) < 1 &&
      ((t.price === (d.price || 0) && t.price > 0) || (t.deposit === (d.deposit || 0) && t.deposit > 0))
    );

    if (!isDup) {
      byApt[key].push({
        contractYm: d.contractYm || '',
        contractDay: d.contractDay || '',
        price: d.price || 0,
        priceEok: (d.dealType === '전세' || d.dealType === '월세') 
          ? formatPriceEok(d.deposit || 0) + (d.monthlyRent ? `/${d.monthlyRent}` : '')
          : formatPriceEok(d.price || 0),
        deposit: d.deposit || 0,
        monthlyRent: d.monthlyRent || 0,
        reqGb: d.reqGb || '',
        rnuYn: d.rnuYn || '',
        area: d.area || 0,
        areaPyeong: d.areaPyeong || 0,
        floor: d.floor || 0,
        dong: d.dong || '',
        dealType: d.dealType || '매매',
        contractDate: cDate,
      });
    }
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
    if (!aptName) return;

    // Filter out transactions that occurred before completion/built year
    const buildYear = parseInt(d.buildYear || d.constructionYear, 10) || 0;
    const contractYear = d.contractYm ? parseInt(d.contractYm.substring(0, 4), 10) : 0;
    if (buildYear > 0 && contractYear > 0 && contractYear < buildYear) {
      return; // Skip pre-completion transaction
    }

    const key = normalizeAptName(aptName);
    if (!byApt[key]) byApt[key] = [];    
    
    const cDate = d.contractDate || `${d.contractYm || ''}${String(d.contractDay || '').padStart(2, '0')}`;
    
    // 심화된 중복 방지: 날짜, 면적, 가격(또는 보증금), 층수가 동일하면 완벽히 같은 거래로 간주 (dealType 표기법 차이 무시)
    const isDup = byApt[key].some(t => 
      t.contractDate === cDate && 
      t.area === d.area && 
      Math.abs(t.floor - d.floor) < 1 &&
      ((t.price === d.price && t.price > 0) || (t.deposit === d.deposit && t.deposit > 0))
    );

    if (!isDup) {
      byApt[key].push({
        contractYm: d.contractYm || '',
        contractDay: d.contractDay || '',
        price: d.price || 0,
        priceEok: (d.dealType === '전세' || d.dealType === '월세') 
          ? formatPriceEok(d.deposit || 0) + (d.monthlyRent ? `/${d.monthlyRent}` : '')
          : formatPriceEok(d.price || 0),
        deposit: d.deposit || 0,
        monthlyRent: d.monthlyRent || 0,
        reqGb: d.reqGb || '',
        rnuYn: d.rnuYn || '',
        area: d.area || 0,
        areaPyeong: d.areaPyeong || 0,
        floor: d.floor || 0,
        dong: d.dong || '',
        dealType: d.dealType || '매매',
        contractDate: cDate,
      });
    }
  });

  // 아파트별 요약 계산
  const summaries = {};
  let aptCount = 0;

  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

  console.log('🔗 타입 맵 다운로드 중 (공급면적 기준 평당가 계산)...');
  const typeMap = await fetchTypeMap();

  // 법정동 매핑 다운로드 (Google Sheets apartments 탭)
  console.log('🗺️ 법정동 매핑 다운로드 중...');
  const { dongMap, validTxKeys } = await fetchDongMap();
  console.log(`   ${Object.keys(dongMap).length}개 아파트-동 매핑 로드 완료. 유효 아파트: ${validTxKeys.size}개`);

  // ── 10년(120개월) 거시 트렌드 (월별 평균가) 수집용 객체 초기화 ──
  // 상수 바스켓 지수(Constant Basket Index): 국민평형(30~36평) 단지들의 각 월별 가장 최근 실거래가를 누적합니다.
  // 실거래가 신고 지연(최대 30일)으로 인한 최근 달의 통계 왜곡(급락 착시)을 방지하기 위해 2개월 오프셋 적용
  const macroTrendData = {};
  const trendMonths = [];
  const REPORTING_LAG_MONTHS = 2; // 2개월 전을 가장 최신 달로 취급
  for (let i = 119; i >= 0; i--) { // 10년 치 데이터
    const d = new Date(now.getFullYear(), now.getMonth() - REPORTING_LAG_MONTHS - i, 1);
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const label = `${yy}.${mm}`; // 23.01 형식
    macroTrendData[ym] = { name: label, sumPrice: 0, aptCount: 0, sumJeonse: 0, jeonseCount: 0 };
    trendMonths.push(ym);
  }

  // 필터링된 아파트 목록
  const filteredApts = Object.keys(byApt).filter(aptName => validTxKeys.has(aptName) || validTxKeys.has(normalizeAptName(aptName)));
  console.log(`🧹 전체 ${Object.keys(byApt).length}개 중 동탄 지역 ${filteredApts.length}개 아파트만 필터링 완료`);

  for (const aptName of filteredApts) {
    const txs = byApt[aptName];
    // 매매와 전월세 분리 ('전세', '월세'가 명시된 것만 임대차 거래로 치고 나머지는 모두 매매로 취급)
    const rawRentTxs = txs.filter(t => {
      if (t.dealType === '전세') return true;
      if (t.dealType === '월세' && t.monthlyRent && t.monthlyRent > 0) return true;
      return false;
    });
    const rawSaleTxs = txs.filter(t => t.dealType !== '전세' && t.dealType !== '월세');
    
    // 매매/임대 데이터가 둘 다 없으면 스킵
    if (rawSaleTxs.length === 0 && rawRentTxs.length === 0) continue;

    // 롤링 윈도우 기반 시계열 이상치 필터링 (최근 11건 기준 국소적 평균/표준편차 적용)
    const filterOutliersRolling = (txs) => {
      const sortedTxs = [...txs].sort((a, b) => {
        const d1 = parseInt(a.contractYm + String(a.contractDay).padStart(2, '0'));
        const d2 = parseInt(b.contractYm + String(b.contractDay).padStart(2, '0'));
        return d1 - d2;
      });

      const byArea = {};
      sortedTxs.forEach(t => {
        const a = Math.round(t.area);
        if (!byArea[a]) byArea[a] = [];
        byArea[a].push(t);
      });

      const validTxs = [];
      Object.values(byArea).forEach(group => {
        const filtered = group.filter((t, idx) => {
          const windowTxs = group.slice(Math.max(0, idx - 5), Math.min(group.length, idx + 6));
          const prices = windowTxs.map(wt => {
            return (wt.dealType === '전세' || wt.dealType === '월세') 
              ? (wt.deposit || 0) + Math.round((wt.monthlyRent || 0) * 12 / 0.055)
              : wt.price;
          });
          const p = (t.dealType === '전세' || t.dealType === '월세') 
            ? (t.deposit || 0) + Math.round((t.monthlyRent || 0) * 12 / 0.055)
            : t.price;
          
          if (prices.length < 4) return true;
          
          const mean = prices.reduce((sum, val) => sum + val, 0) / prices.length;
          const variance = prices.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / prices.length;
          const stdDev = Math.sqrt(variance);
          
          return Math.abs(p - mean) <= 2 * Math.max(stdDev, mean * 0.05);
        });
        validTxs.push(...filtered);
      });
      return validTxs;
    };

    const saleTxs = filterOutliersRolling(rawSaleTxs);
    const rentTxs = filterOutliersRolling(rawRentTxs);

    // 공급면적(분양평수) 평당 가격으로 재조정 (DB의 d.areaPyeong는 전용면적 기반이므로 치명적인 왜곡 발생 방지)
    const getSupplyPyeong = (t) => {
      const dbAptName = normalizeAptName(aptName);
      const supplyPyeong = typeMap[dbAptName]?.[String(t.area)];
      if (supplyPyeong) return supplyPyeong;
      return t.area * 0.3025 * 1.33; // Fallback
    };
    
    txs.forEach(t => { t.areaPyeong = getSupplyPyeong(t); });

    // --- 동탄 전체 가격 지수(거시 트렌드) 계산 ---
    const standardTxs = saleTxs.filter(t => t.areaPyeong >= 30 && t.areaPyeong <= 36);
    standardTxs.sort((a, b) => b.contractDate.localeCompare(a.contractDate));

    if (standardTxs.length > 0) {
      trendMonths.forEach(ym => {
        const latestTx = standardTxs.find(t => t.contractYm <= ym);
        if (latestTx) {
          macroTrendData[ym].sumPrice += latestTx.price;
          macroTrendData[ym].aptCount += 1;
        }
      });
    }

    // --- 동탄 전체 전세 가격 지수(거시 트렌드) 계산 ---
    const standardJeonseTxs = rentTxs.filter(t => t.areaPyeong >= 30 && t.areaPyeong <= 36 && t.deposit > 0 && (!t.monthlyRent || t.monthlyRent === 0));
    standardJeonseTxs.sort((a, b) => b.contractDate.localeCompare(a.contractDate));

    if (standardJeonseTxs.length > 0) {
      trendMonths.forEach(ym => {
        const latestTx = standardJeonseTxs.find(t => t.contractYm <= ym);
        if (latestTx) {
          macroTrendData[ym].sumJeonse += latestTx.deposit;
          macroTrendData[ym].jeonseCount += 1;
        }
      });
    }

    // --- 매매 요약 ---
    const prices = saleTxs.map(t => t.price).filter(p => p > 0);
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    
    // contractDate 기준으로 내림차순 정렬
    saleTxs.sort((a, b) => b.contractDate.localeCompare(a.contractDate));
    const latestTx = saleTxs.length > 0 ? saleTxs[0] : null;

    const oneMonthAgoSale = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const threeMonthsAgoSale = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());

    const recentMonthSale = saleTxs.filter(t => {
      if (!t.contractYm || t.contractYm.length < 6) return false;
      const y = parseInt(t.contractYm.slice(0, 4));
      const m = parseInt(t.contractYm.slice(4, 6));
      const d = parseInt(t.contractDay) || 1;
      const txDate = new Date(y, m - 1, d);
      return txDate >= oneMonthAgoSale && t.price > 0 && t.areaPyeong > 0;
    });

    const recent3MonthSale = saleTxs.filter(t => {
      if (!t.contractYm || t.contractYm.length < 6) return false;
      const y = parseInt(t.contractYm.slice(0, 4));
      const m = parseInt(t.contractYm.slice(4, 6));
      const d = parseInt(t.contractDay) || 1;
      const txDate = new Date(y, m - 1, d);
      return txDate >= threeMonthsAgoSale && t.price > 0 && t.areaPyeong > 0;
    });

    let avg1MPriceRaw = 0;
    if (recentMonthSale.length > 0) {
      avg1MPriceRaw = recentMonthSale.reduce((s, t) => s + t.price, 0) / recentMonthSale.length;
    } else if (latestTx && latestTx.price > 0) {
      avg1MPriceRaw = latestTx.price;
    }
    const avg1MPrice = Math.round(avg1MPriceRaw / 100) * 100;
    
    let avg3MPriceRaw = 0;
    if (recent3MonthSale.length > 0) {
      avg3MPriceRaw = recent3MonthSale.reduce((s, t) => s + t.price, 0) / recent3MonthSale.length;
    } else if (latestTx && latestTx.price > 0) {
      avg3MPriceRaw = latestTx.price;
    }
    const avg3MPrice = Math.round(avg3MPriceRaw / 100) * 100;

    let avg1MPerPyeongRaw = 0;
    if (recentMonthSale.length > 0) {
      avg1MPerPyeongRaw = recentMonthSale.reduce((s, t) => s + t.price / t.areaPyeong, 0) / recentMonthSale.length;
    } else if (latestTx && latestTx.areaPyeong > 0) {
      avg1MPerPyeongRaw = latestTx.price / latestTx.areaPyeong;
    }
    const avg1MPerPyeong = Math.round(avg1MPerPyeongRaw);
    
    let avg3MPerPyeongRaw = 0;
    if (recent3MonthSale.length > 0) {
      avg3MPerPyeongRaw = recent3MonthSale.reduce((s, t) => s + t.price / t.areaPyeong, 0) / recent3MonthSale.length;
    } else if (latestTx && latestTx.areaPyeong > 0) {
      avg3MPerPyeongRaw = latestTx.price / latestTx.areaPyeong;
    }
    const avg3MPerPyeong = Math.round(avg3MPerPyeongRaw);

    // --- 전월세 요약 ---
    rentTxs.sort((a, b) => b.contractDate.localeCompare(a.contractDate));
    const latestRentTx = rentTxs.filter(t => t.deposit > 0)[0];
    
    const oneMonthAgoRent = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const threeMonthsAgoRent = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());

    const recentMonthRent = rentTxs.filter(t => {
      if (!t.contractYm || t.contractYm.length < 6) return false;
      const y = parseInt(t.contractYm.slice(0, 4));
      const m = parseInt(t.contractYm.slice(4, 6));
      const d = parseInt(t.contractDay) || 1;
      const txDate = new Date(y, m - 1, d);
      return txDate >= oneMonthAgoRent && t.deposit > 0; // 전세 위주
    });
    
    const recent3MonthRent = rentTxs.filter(t => {
      if (!t.contractYm || t.contractYm.length < 6) return false;
      const y = parseInt(t.contractYm.slice(0, 4));
      const m = parseInt(t.contractYm.slice(4, 6));
      const d = parseInt(t.contractDay) || 1;
      const txDate = new Date(y, m - 1, d);
      return txDate >= threeMonthsAgoRent && t.deposit > 0;
    });

    let avg1MDepositRaw = 0;
    const getConvertedDeposit = (t) => t.deposit + (t.monthlyRent ? Math.round(t.monthlyRent * 12 / 0.055) : 0);
    if (recentMonthRent.length > 0) {
      avg1MDepositRaw = recentMonthRent.reduce((s, t) => s + getConvertedDeposit(t), 0) / recentMonthRent.length;
    } else if (latestRentTx && latestRentTx.deposit > 0) {
      avg1MDepositRaw = getConvertedDeposit(latestRentTx);
    }
    const avg1MDeposit = Math.round(avg1MDepositRaw / 100) * 100;
    
    let avg3MDepositRaw = 0;
    if (recent3MonthRent.length > 0) {
      avg3MDepositRaw = recent3MonthRent.reduce((s, t) => s + getConvertedDeposit(t), 0) / recent3MonthRent.length;
    } else if (latestRentTx && latestRentTx.deposit > 0) {
      avg3MDepositRaw = getConvertedDeposit(latestRentTx);
    }
    const avg3MDeposit = Math.round(avg3MDepositRaw / 100) * 100;

    const maxPriceByArea = {};
    saleTxs.forEach(t => {
      if (t.price > 0 && t.area > 0) {
        const areaKey = (Math.round(t.area * 100) / 100).toFixed(2);
        if (!maxPriceByArea[areaKey] || t.price > maxPriceByArea[areaKey]) {
          maxPriceByArea[areaKey] = t.price;
        }
      }
    });

    summaries[aptName] = {
      // 법정동 (Google Sheets apartments 탭 우선, 없으면 거래 데이터 폴백)
      dong: dongMap[normalizeAptName(aptName)] || (saleTxs.length > 0 ? saleTxs[0].dong : (rentTxs.length > 0 ? rentTxs[0].dong : '')),
      // 매매 데이터
      latestPrice: latestTx ? latestTx.price : 0,
      latestPriceEok: latestTx ? latestTx.priceEok : "0",
      latestArea: latestTx ? latestTx.areaPyeong : 0,
      latestFloor: latestTx ? latestTx.floor : 0,
      latestDate: latestTx ? `${latestTx.contractYm}${latestTx.contractDay}` : "",
      maxPrice,
      maxPriceEok: maxPrice > 0 ? formatPriceEok(maxPrice) : "0",
      maxPriceByArea,
      minPrice,
      minPriceEok: minPrice > 0 ? formatPriceEok(minPrice) : "0",
      txCount: saleTxs.length,
      avg1MPrice,
      avg1MPriceEok: formatPriceEok(avg1MPrice),
      avg1MPerPyeong,
      avg1MTxCount: recentMonthSale.length,
      avg3MPrice,
      avg3MPriceEok: formatPriceEok(avg3MPrice),
      avg3MPerPyeong,
      avg3MTxCount: recent3MonthSale.length,
      recent: saleTxs.slice(0, 25).map(t => ({
        date: `${t.contractYm.slice(4)}.${t.contractDay}`,
        priceEok: t.priceEok,
        areaPyeong: t.areaPyeong,
        floor: t.floor,
        area: t.area,
      })),
      
      // 전월세 데이터
      rentTxCount: rentTxs.length,
      latestRentDeposit: latestRentTx ? latestRentTx.deposit : 0,
      latestRentDepositEok: latestRentTx ? formatPriceEok(latestRentTx.deposit) : "0",
      latestRentMonthly: latestRentTx ? latestRentTx.monthlyRent : 0,
      latestRentDate: latestRentTx ? `${latestRentTx.contractYm}${latestRentTx.contractDay}` : "",
      avg1MRentDeposit: avg1MDeposit,
      avg1MRentDepositEok: formatPriceEok(avg1MDeposit),
      avg3MRentDeposit: avg3MDeposit,
      avg3MRentDepositEok: formatPriceEok(avg3MDeposit),
    };
    aptCount++;
  }

  console.log(`\n✅ 요약 완료: ${aptCount}개 아파트 (매매+전월세 통합)`);

  // ── 거시 트렌드 배열 생성 ──
  let lastValidPrice = 0;
  let lastValidJeonse = 0;
  const dongtanMacroTrend = trendMonths.map(ym => {
    const data = macroTrendData[ym];
    let avgPriceMan = data.aptCount > 0 ? data.sumPrice / data.aptCount : 0;
    let avgJeonseMan = data.jeonseCount > 0 ? data.sumJeonse / data.jeonseCount : 0;
    
    if (avgPriceMan === 0 && lastValidPrice > 0) {
      avgPriceMan = lastValidPrice; // 거래가 아직 없는 최근 월은 직전 월 데이터로 폴백
    } else if (avgPriceMan > 0) {
      lastValidPrice = avgPriceMan;
    }

    if (avgJeonseMan === 0 && lastValidJeonse > 0) {
      avgJeonseMan = lastValidJeonse; // 거래가 아직 없는 최근 월은 직전 월 데이터로 폴백
    } else if (avgJeonseMan > 0) {
      lastValidJeonse = avgJeonseMan;
    }
    
    // 억 단위 변환 (예: 53200 만원 -> 53.2 억 -> 5.3)
    const avgPriceEok = Math.round(avgPriceMan / 1000) / 10;
    const avgJeonseEok = Math.round(avgJeonseMan / 1000) / 10;
    return {
      name: data.name,
      '동탄 아파트 전체': avgPriceEok,
      '동탄 아파트 전세 평균': avgJeonseEok
    };
  });

  const outputData = {
    summary: summaries
  };

  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(outputData, null, 2), 'utf-8');
  console.log(`📁 파일 생성: ${OUTPUT_PATH}`);

  const MACRO_TREND_OUTPUT_PATH = path.resolve(__dirname, '../public/data/macro-trend.json');
  fs.writeFileSync(MACRO_TREND_OUTPUT_PATH, JSON.stringify(dongtanMacroTrend, null, 2), 'utf-8');
  console.log(`📁 파일 생성: ${MACRO_TREND_OUTPUT_PATH}`);
  console.log(`🎉 동기화 완료!`);
  

  // ── 아파트별 JSON 청크 생성 (public/tx-data/*.json) ──
  // 기존 16MB 단일 .ts 파일 대신 아파트별 개별 JSON 파일로 분할
  // → 모달에서 해당 아파트만 fetch('/tx-data/{aptKey}.json')로 로딩 (~100KB)
  
  // 디렉토리 초기화 (Full Sync 시에만)
  if (isFullSync && fs.existsSync(TX_DATA_DIR)) {
    fs.rmSync(TX_DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(TX_DATA_DIR)) {
    fs.mkdirSync(TX_DATA_DIR, { recursive: true });
  }

  let totalRecords = 0;
  let totalSizeKB = 0;
  let chunkCount = 0;

  for (const aptName of filteredApts) {
    const txs = byApt[aptName];
    const records = txs.map(t => ({
      contractYm: t.contractYm,
      contractDay: t.contractDay,
      price: t.price,
      priceEok: (t.dealType === '전세' || t.dealType === '월세') 
        ? formatPriceEok(t.deposit || 0) + (t.monthlyRent ? ` / ${t.monthlyRent}만` : '')
        : formatPriceEok(t.price || 0),
      deposit: t.deposit || 0,
      monthlyRent: t.monthlyRent || 0,
      reqGb: t.reqGb || '',
      rnuYn: t.rnuYn || '',
      area: t.area,
      areaPyeong: t.areaPyeong,
      floor: t.floor,
      dealType: t.dealType || '',
    }));

    // 파일명: 정규화된 아파트명 (URL-safe)
    const filename = `${aptName}.json`;
    const filepath = path.join(TX_DATA_DIR, filename);
    const json = JSON.stringify(records);
    
    fs.writeFileSync(filepath, json, 'utf-8');

    // 최근 거래 내역만 포함하는 경량 JSON 파일 생성 (최근 15건)
    const filenameRecent = `${aptName}-recent.json`;
    const filepathRecent = path.join(TX_DATA_DIR, filenameRecent);
    const jsonRecent = JSON.stringify(records.slice(0, 15));
    fs.writeFileSync(filepathRecent, jsonRecent, 'utf-8');
    
    totalRecords += records.length;
    totalSizeKB += (json.length + jsonRecent.length) / 1024;
    chunkCount++;
  }

  // 인덱스 파일 생성 (어떤 아파트들이 있는지 목록)
  const index = filteredApts;
  fs.writeFileSync(
    path.join(TX_DATA_DIR, '_index.json'),
    JSON.stringify(index),
    'utf-8'
  );

  console.log(`📁 JSON 청크: ${TX_DATA_DIR}`);
  console.log(`   ${chunkCount}개 아파트, ${totalRecords}건, 총 ${Math.round(totalSizeKB)}KB`);
  console.log(`   (기존 16MB .ts → ${Math.round(totalSizeKB)}KB 분할)`);

  process.exit(0);
}

main().catch(err => {
  console.error('❌ 동기화 실패:', err.message);
  process.exit(1);
});
