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
const { z } = require('zod');

// Zod schema for validation of Apartment Trade Transaction Record before DB upload
const AptTransactionRecordSchema = z.object({
  sigungu: z.string().min(1, '시군구 정보가 누락되었습니다.'),
  dong: z.string().min(1, '법정동명이 누락되었습니다.'),
  aptName: z.string().min(1, '아파트명이 누락되었습니다.'),
  area: z.coerce.number().positive('면적이 유효하지 않습니다.'),
  areaPyeong: z.coerce.number().positive('평수가 유효하지 않습니다.'),
  contractYm: z.string().length(6, '계약년월은 6자리여야 합니다.'),
  contractDay: z.string().length(2, '계약일은 2자리여야 합니다.'),
  contractDate: z.string().length(8, '계약일자는 8자리여야 합니다.'),
  price: z.coerce.number().int().positive('거래가격이 유효하지 않습니다.'),
  floor: z.coerce.number().int('층수 정보가 유효하지 않습니다.'),
  buyer: z.string().optional().default(''),
  seller: z.string().optional().default(''),
  buildYear: z.coerce.number().int().nonnegative('건축년도가 유효하지 않습니다.').default(0),
  roadName: z.string().optional().default(''),
  cancelDate: z.string().optional().default(''),
  dealType: z.string().optional().default(''),
  agentLocation: z.string().optional().default(''),
  registrationDate: z.string().optional().default(''),
  housingType: z.string().optional().default(''),
  source: z.literal('govt_api'),
  _key: z.string().min(1)
});

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

// 헬퍼: 타임아웃 및 지수 백오프 기반 재시도 로직이 탑재된 HTTP 클라이언트
async function fetchWithRetry(url, options = {}, retries = 3, delay = 1500) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        ...options,
        timeout: 25000 // 25초 타임아웃으로 증가
      });
      return response;
    } catch (err) {
      const isLastActive = i === retries - 1;
      const status = err.response ? err.response.status : null;
      console.warn(`   ⚠️ API 호출 시도 ${i + 1}/${retries} 실패: ${err.message} (HTTP status: ${status})`);
      if (isLastActive) throw err;
      
      const backoffDelay = delay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
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

  // 2. 동기화할 월 결정 (당월, 전월, 전전월 총 3개월을 항상 동기화하여 실거래 신고 지연 대응)
  const now = new Date();
  const monthsToSync = new Set();

  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthsToSync.add(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  console.log(`   동기화 대상: ${Array.from(monthsToSync).sort().join(', ')}`);

  // 3. 국토부 API 호출 및 Firestore 쓰기 최적화
  let totalNew = 0;
  const syncLog = [];
  const LAWD_CDS = ['41590', '41597']; // 화성시(기존) 및 동탄구(신설) 모두 스캔

  for (const ym of Array.from(monthsToSync).sort()) {
    const keyOccurrences = new Map();
    // 🔥 최적화: 해당 월에 등록된 기존 Firestore 데이터를 단 한번 쿼리하여 메모리 맵 구축
    // read 횟수는 최소화하고 Firestore 쓰기(Write) 요금을 획기적으로(99%) 감면
    const existingMap = new Map(); // _key -> cancelDate
    try {
      const existingSnap = await collRef
        .where('contractYm', '==', ym)
        .select('cancelDate')
        .get();
      existingSnap.docs.forEach(doc => {
        existingMap.set(doc.id, doc.data().cancelDate || '');
      });
      console.log(`   📂 [${ym}] Firestore 기존 거래 로드 완료: ${existingMap.size}건`);
    } catch (err) {
      console.warn(`   ⚠️ [${ym}] 기존 데이터 조회 실패 (무시하고 전체 덮어쓰기 진행): ${err.message}`);
    }

    for (const currentLawd of LAWD_CDS) {
      let page = 1;
      let totalCount = 0;
      const monthRecords = [];

      console.log(`📅 ${ym} (LAWD_CD: ${currentLawd}) 처리 중...`);

      do {
        const url = `${API_BASE}?serviceKey=${encodeURIComponent(API_KEY)}&LAWD_CD=${currentLawd}&DEAL_YMD=${ym}&pageNo=${page}&numOfRows=1000`;

        const agent = process.env.PROXY_URL ? new HttpsProxyAgent(process.env.PROXY_URL) : undefined;
        try {
          // axios.get 대신 지수 백오프 재시도가 연동된 fetchWithRetry 호출
          const res = await fetchWithRetry(url, { httpAgent: agent, httpsAgent: agent, proxy: false });
          const data = res.data;

          // 에러 응답 체크 (JSON 구조 지원)
          if (data.response?.header?.resultCode !== '000' && data.response?.header?.resultCode !== '00') {
             const errMsg = data.response?.header?.resultMsg || JSON.stringify(data);
             console.error(`   ❌ API 에러: ${errMsg}`);
             syncLog.push(`${ym} (${currentLawd}): API 에러 - ${errMsg}`);
             break;
          }

          const body = data.response?.body;
          if (!body) {
            console.warn(`   ⚠️ API 응답 body가 비어 있습니다.`);
            break;
          }
          totalCount = body.totalCount || 0;
          if (totalCount === 0) break;

          let items = body.items?.item || [];
          if (!Array.isArray(items)) items = [items];

          for (const item of items) {
            const dong = item.umdNm || '';

            // 동탄 권역 속하는 동 이름만 메모리 필터링
            if (!DONGTAN_DONGS.some(d => dong.includes(d))) continue;

            const aptName = item.aptNm || '';
            const priceStr = String(item.dealAmount || '0').replace(/,/g, '').trim();
            const price = parseInt(priceStr, 10) || 0;
            const area = parseFloat(item.excluUseAr) || 0;
            const contractDay = String(item.dealDay || '').padStart(2, '0');
            const floor = parseInt(item.floor || '0', 10) || 0;
            const baseKey = `${aptName}_${ym}_${contractDay}_${area}_${price}_${floor}`;
            const occurrence = (keyOccurrences.get(baseKey) || 0) + 1;
            keyOccurrences.set(baseKey, occurrence);
            const key = occurrence === 1 ? baseKey : `${baseKey}_${occurrence}`;
            const cancelDate = item.cdealDay || '';

            // 🔥 Firestore 쓰기(Write) 요금 초절감 검사: 중복 거래 및 취소 날짜 무변화 시 스킵
            if (existingMap.has(key)) {
              const existingCancelDate = existingMap.get(key);
              if (cancelDate === existingCancelDate) {
                continue; // 이미 데이터가 같으므로 쓰기 버퍼에서 제외
              }
            }

            const record = {
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
              cancelDate,
              dealType: item.cdealType || item.dealingGbn || '',
              agentLocation: item.estateAgentSggNm || '',
              registrationDate: item.rgstDate || '',
              housingType: '',
              source: 'govt_api',
              _key: key,
            };

            const parsed = AptTransactionRecordSchema.safeParse(record);
            if (parsed.success) {
              monthRecords.push(parsed.data);
            } else {
              console.warn(`⚠️ [Fetch Transactions] Invalid trade transaction record at apt ${aptName}:`, parsed.error.format());
              console.log(`Record Details: ${JSON.stringify(record)}`);
            }
          }

          if (items.length === 0) break; // 무한 루프 방지
          page++;
        } catch (err) {
          const status = err.response ? err.response.status : (err.code || 'Unknown');
          syncLog.push(`${ym} (${currentLawd}) page ${page}: HTTP ${status}`);
          console.error(`   ❌ HTTP ${status} - ${err.message}`);
          // 하나의 구역/페이지가 완전히 응답하지 않는 경우 break하여 루프를 안전하게 빠져나가며 다음 지역으로 진행 (전체 프로세스 크래시 방지)
          break;
        }
      } while (page * 1000 <= totalCount + 1000); // numOfRows 기준 안전한 루프 탈출

      // 4. Firestore에 배치 쓰기 (필터링을 거친 새로운 건들만 실질적 쓰기 동작)
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
        syncLog.push(`${ym} (${currentLawd}): ${written}건 실질 쓰기 동기화`);
        console.log(`   ✅ ${written}건 실질 Firestore DB 쓰기 완료`);
      } else {
        syncLog.push(`${ym} (${currentLawd}): 0건 (기존과 모두 동일)`);
        console.log(`   ⏭️  0건 (기존과 모두 동일하여 쓰기 생략)`);
      }
    }
  }

  console.log(`\n🎉 총 ${totalNew}건 Firestore 신규/변경 등록 완료`);
  syncLog.forEach(l => console.log(`   ${l}`));

  process.exit(0);
}

main().catch(err => {
  console.error('❌ 동기화 실패:', err.message);
  process.exit(1);
});
