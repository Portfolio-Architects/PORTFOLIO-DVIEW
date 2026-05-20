#!/usr/bin/env node
/**
 * 🔄 국토부 실거래가 API → Firestore 동기화
 * 
 * 사용법: node scripts/fetch-transactions.js
 * 
 * 국토부 실거래가 공공데이터 API에서 동탄구(화성시) 최신 거래 데이터를 가져와
 * Firestore 'transactions' 컬렉션에 upsert합니다.
 * 
 * 환경변수:
 *   BUILDING_API_KEY — 공공데이터포털 인증키
 */

require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { HttpsProxyAgent } = require('https-proxy-agent');
const axios = require('axios');

const API_KEY = process.env.BUILDING_API_KEY || '';
const DONGTAN_DONGS = ['반송동', '능동', '청계동', '영천동', '오산동', '신동', '목동', '산척동', '장지동', '송동', '방교동', '금곡동', '여울동'];
const API_BASE = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev';

function formatPriceEok(priceMan) {
  const eok = Math.floor(priceMan / 10000);
  const remainder = priceMan % 10000;
  if (eok === 0) return `${priceMan.toLocaleString()}만`;
  if (remainder === 0) return `${eok}억`;
  return `${eok}억${remainder.toLocaleString()}`;
}

async function main() {
  if (!API_KEY) {
    console.error('❌ BUILDING_API_KEY 환경변수가 설정되지 않았습니다.');
    console.error('   공공데이터포털에서 발급받은 인증키를 설정해주세요.');
    process.exit(1);
  }

  console.log('📡 국토부 실거래가 API에서 데이터 수집 중...');

  const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
  let serviceAccount;

  const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
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
    console.warn('⚠️ 인증 정보를 찾을 수 없습니다. (CI/CD 환경 등)');
    console.warn('   기본 자격 증명(Default Credentials)으로 초기화를 시도합니다.');
  }

  if (!admin.apps.length) {
    const config = serviceAccount ? { credential: admin.credential.cert(serviceAccount) } : { projectId };
    admin.initializeApp(config);
  }
  const db = admin.firestore();

  const collRef = db.collection('transactions');

  // 1. Firestore에서 최신 거래 날짜 확인
  const latestSnap = await collRef.orderBy('contractDate', 'desc').limit(1).get();
  let latestYm = '';
  if (!latestSnap.empty) {
    latestYm = latestSnap.docs[0].data().contractYm || '';
  }
  console.log(`   최신 Firestore 데이터: ${latestYm || '없음'}`);

  // 2. 동기화할 월 결정
  const now = new Date();
  const currentYm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthsToSync = new Set();

  if (latestYm) monthsToSync.add(latestYm); // 최신 월 재동기화
  monthsToSync.add(currentYm);               // 현재 월

  // 월초면 전월도 포함 (국토부 데이터 지연 대응)
  if (now.getDate() <= 20) {
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    monthsToSync.add(`${prevDate.getFullYear()}${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
  }

  console.log(`   동기화 대상: ${Array.from(monthsToSync).sort().join(', ')}`);

  // 3. 국토부 API 호출
  let totalNew = 0;
  const syncLog = [];
  const LAWD_CDS = ['41590', '41597']; // 화성시(기존) 및 동탄구(신설) 모두 스캔

  for (const ym of Array.from(monthsToSync).sort()) {
    for (const currentLawd of LAWD_CDS) {
      let page = 1;
      let totalCount = 0;
      const monthRecords = [];

      console.log(`\n📅 ${ym} (LAWD_CD: ${currentLawd}) 처리 중...`);

      do {
        const url = `${API_BASE}?serviceKey=${encodeURIComponent(API_KEY)}&LAWD_CD=${currentLawd}&DEAL_YMD=${ym}&pageNo=${page}&numOfRows=1000`;

        const agent = process.env.PROXY_URL ? new HttpsProxyAgent(process.env.PROXY_URL) : undefined;
        try {
        const res = await axios.get(url, { httpAgent: agent, httpsAgent: agent, proxy: false });
        const data = res.data;

        // 에러 응답 체크 (JSON 구조 지원)
        if (data.response?.header?.resultCode !== '000' && data.response?.header?.resultCode !== '00') {
           const errMsg = data.response?.header?.resultMsg || JSON.stringify(data);
           console.error(`   ❌ API 에러: ${errMsg}`);
           syncLog.push(`${ym} (${currentLawd}): API 에러 - ${errMsg}`);
           break;
        }

        totalCount = data.response?.body?.totalCount || 0;
        if (totalCount === 0) break;

        let items = data.response?.body?.items?.item || [];
        if (!Array.isArray(items)) items = [items];

        for (const item of items) {
          const dong = item.umdNm || '';

          // 🔥 치명적 버그 수정: 동탄 권역 속하는 동 이름만 메모리 필터링
          if (!DONGTAN_DONGS.some(d => dong.includes(d))) continue;

          const aptName = item.aptNm || '';
          const priceStr = String(item.dealAmount || '0').replace(/,/g, '').trim();
          const price = parseInt(priceStr, 10) || 0;
          const area = parseFloat(item.excluUseAr) || 0;
          const contractDay = String(item.dealDay || '').padStart(2, '0');
          const floor = parseInt(item.floor || '0', 10) || 0;

          monthRecords.push({
            sigungu: `경기도 화성시 동탄구 ${dong}`,
            dong,
            aptName,
            area,
            areaPyeong: Math.round(area / 3.3058 * 10) / 10,
            contractYm: ym,
            contractDay,
            contractDate: `${ym}${contractDay}`,
            price,
            floor,
            buyer: item.buyerGbn || '',
            seller: item.slerGbn || '',
            buildYear: parseInt(item.buildYear, 10) || 0,
            roadName: item.roadNm || '',
            cancelDate: item.cdealDay || '',
            dealType: item.cdealType || item.dealingGbn || '',
            agentLocation: item.estateAgentSggNm || '',
            registrationDate: item.rgstDate || '',
            housingType: '',
            source: 'govt_api',
            _key: `${aptName}_${ym}_${contractDay}_${area}_${price}_${floor}`,
          });
        }

        if (items.length === 0) break; // 무한 루프 방지
        page++;
      } catch (err) {
        const status = err.response ? err.response.status : (err.code || 'Unknown');
        syncLog.push(`${ym} (${currentLawd}) page ${page}: HTTP ${status}`);
        console.error(`   ❌ HTTP ${status} - ${err.message}`);
        break;
      }
    } while (page * 1000 <= totalCount + 1000); // numOfRows 기준 안전한 루프 탈출

      // 4. Firestore에 배치 쓰기
      if (monthRecords.length > 0) {
        const BATCH_SIZE = 500;
        let written = 0;
        for (let i = 0; i < monthRecords.length; i += BATCH_SIZE) {
          const batch = db.batch();
          const slice = monthRecords.slice(i, i + BATCH_SIZE);
          for (const r of slice) {
            batch.set(collRef.doc(r._key), r, { merge: true });
          }
          await batch.commit();
          written += slice.length;
        }
        totalNew += written;
        syncLog.push(`${ym} (${currentLawd}): ${written}건 동기화`);
        console.log(`   ✅ ${written}건 동기화 완료`);
      } else {
        syncLog.push(`${ym} (${currentLawd}): 0건`);
        console.log(`   ⏭️  0건`);
      }
    }
  }

  console.log(`\n🎉 총 ${totalNew}건 Firestore 동기화 완료`);
  syncLog.forEach(l => console.log(`   ${l}`));

  process.exit(0);
}

main().catch(err => {
  console.error('❌ 동기화 실패:', err.message);
  process.exit(1);
});
