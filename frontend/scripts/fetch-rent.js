#!/usr/bin/env node
/**
 * 🔄 국토부 전월세 실거래가 API → Firestore 동기화
 * 
 * 사용법: node scripts/fetch-rent.js [--full]
 * 
 * 국토부 전월세 실거래가 공공데이터 API에서 동탄구(화성시) 최신 전월세 거래 데이터를 가져와
 * Firestore 'transactions' 컬렉션에 upsert합니다.
 */

require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
let HttpsProxyAgent = null;
function getProxyAgent() {
  if (process.env.PROXY_URL) {
    if (!HttpsProxyAgent) {
      try {
        HttpsProxyAgent = require('https-proxy-agent').HttpsProxyAgent;
      } catch {
        return undefined;
      }
    }
    return HttpsProxyAgent ? new HttpsProxyAgent(process.env.PROXY_URL) : undefined;
  }
  return undefined;
}
const axios = require('axios');
const { z } = require('zod');
const { getSupplyPyeong } = require('../src/lib/utils/areaConverter');

// Zod schema for validation of Rent Transaction Record before DB upload
const RentTransactionSchema = z.object({
  sigungu: z.string().min(1, '시군구 정보가 누락되었습니다.'),
  dong: z.string().min(1, '법정동명이 누락되었습니다.'),
  aptName: z.string().min(1, '아파트명이 누락되었습니다.'),
  area: z.coerce.number().positive('면적이 유효하지 않습니다.'),
  areaPyeong: z.coerce.number().positive('평수가 유효하지 않습니다.'),
  contractYm: z.string().length(6, '계약년월은 6자리여야 합니다.'),
  contractDay: z.string().length(2, '계약일은 2자리여야 합니다.'),
  contractDate: z.string().length(8, '계약일자는 8자리여야 합니다.'),
  price: z.coerce.number().int().nonnegative('보증금/가격이 유효하지 않습니다.'),
  deposit: z.coerce.number().int().nonnegative('보증금이 유효하지 않습니다.'),
  monthlyRent: z.coerce.number().int().nonnegative('월세가 유효하지 않습니다.'),
  floor: z.coerce.number().int('층수 정보가 유효하지 않습니다.'),
  buildYear: z.coerce.number().int().nonnegative('건축년도가 유효하지 않습니다.').default(0),
  dealType: z.enum(['전세', '월세']),
  source: z.literal('govt_api_rent'),
  reqGb: z.string().optional().default(''),
  rnuYn: z.string().optional().default(''),
  _key: z.string().min(1)
});

const API_KEY = process.env.BUILDING_API_KEY || '';
const LAWD_CDS = ['41590', '41597']; // 화성시 및 동탄구 모두 스캔
const API_BASE = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent';
const DONGTAN_DONGS = ['반송동', '능동', '청계동', '영천동', '오산동', '신동', '목동', '산척동', '장지동', '송동', '방교동', '금곡동', '여울동'];

// 헬퍼: 타임아웃 및 지수 백오프 기반 재시도 로직이 탑재된 HTTP 클라이언트
async function fetchWithRetry(url, options = {}, retries = 3, delay = 1500) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        ...options,
        timeout: 25000 // 25초 타임아웃
      });
      return response;
    } catch (err) {
      const isLastActive = i === retries - 1;
      const status = err.response ? err.response.status : (err.code || 'TIMEOUT_OR_NET_ERR');
      const isTimeout = err.code === 'ECONNABORTED' || (err.message && err.message.toLowerCase().includes('timeout'));
      const errorLabel = isTimeout ? '네트워크 타임아웃(25s 초과)' : (err.message || '네트워크 연결 오류');
      console.warn(`   ⚠️ [Rent API] 호출 시도 ${i + 1}/${retries} 실패: ${errorLabel} (HTTP status/Code: ${status})`);
      if (isLastActive) throw err;
      
      const backoffDelay = delay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
}

async function main() {
  if (!API_KEY) {
    console.error('❌ BUILDING_API_KEY 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  console.log('📡 국토부 전월세 API에서 데이터 수집 중...');

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

  // 1. 최신 전월세 데이터 연월 스캔 (기본 3개월, --full 옵션 시 17개월)
  const isFullSync = process.argv.includes('--full');
  const monthCount = isFullSync ? 17 : 3;
  const now = new Date();
  const monthsToSync = new Set();
  
  for (let i = 0; i < monthCount; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthsToSync.add(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const sortedMonths = Array.from(monthsToSync).sort((a, b) => b.localeCompare(a));
  console.log(`   동기화 대상 월: ${sortedMonths.join(', ')}`);

  // 2. API 호출 및 Firestore 중복 제거 쓰기
  let totalNew = 0;

  for (const ym of sortedMonths) {
    console.log(`\n📅 ${ym} 전월세 처리 중...`);
    const monthRecords = [];
    const keyOccurrences = new Map();
    const seenRawTxKeys = new Set();

    // 기존 Firestore에 저장된 해당 월 키 조회
    const existingMap = new Set();
    try {
      const existingSnap = await collRef
        .where('contractYm', '==', ym)
        .where('source', '==', 'govt_api_rent')
        .select('_key')
        .get();
      existingSnap.docs.forEach(doc => {
        existingMap.add(doc.id);
      });
      console.log(`   📂 [${ym}] Firestore 기존 전월세 로드: ${existingMap.size}건`);
    } catch (err) {
      console.warn(`   ⚠️ [${ym}] 기존 전월세 데이터 조회 실패: ${err.message}`);
    }

    for (const currentLawd of LAWD_CDS) {
      let page = 1;
      let totalCount = 0;
      const currentDistrictOccurrences = new Map();

      do {
        const url = `${API_BASE}?serviceKey=${encodeURIComponent(API_KEY)}&LAWD_CD=${currentLawd}&DEAL_YMD=${ym}&pageNo=${page}&numOfRows=1000&_type=json`;
        const agent = getProxyAgent();

        let rawData;
        try {
          const res = await fetchWithRetry(url, { httpAgent: agent, httpsAgent: agent, proxy: false });
          rawData = res.data;
        } catch (err) {
          const status = err.response ? err.response.status : (err.code || 'TIMEOUT_OR_NET_ERR');
          const isTimeout = err.code === 'ECONNABORTED' || (err.message && err.message.toLowerCase().includes('timeout'));
          const desc = isTimeout ? '네트워크 타임아웃(25초 초과)' : err.message;
          console.warn(`   ⚠️ [Rent API] (${ym}, ${currentLawd}) page ${page} 오류로 건너뜀 (안전 복구): ${desc} (Status/Code: ${status})`);
          break;
        }

        const text = typeof rawData === 'string' ? rawData : JSON.stringify(rawData);
        const isXml = typeof rawData === 'string' && rawData.trim().startsWith('<');

        if (isXml) {
          // XML response handling (e.g. '00', '99', '30', '01' 등 에러 코드 전수 매칭)
          const resultCodeMatch = text.match(/<resultCode>([^<]*)<\/resultCode>/i) ||
                                  text.match(/<returnReasonCode>([^<]*)<\/returnReasonCode>/i);
          const resultMsgMatch = text.match(/<resultMsg>([^<]*)<\/resultMsg>/i) ||
                                 text.match(/<returnAuthMsg>([^<]*)<\/returnAuthMsg>/i) ||
                                 text.match(/<errMsg>([^<]*)<\/errMsg>/i);
          const resultCode = resultCodeMatch ? resultCodeMatch[1].trim() : '';
          const resultMsg = resultMsgMatch ? resultMsgMatch[1].trim() : '';

          if (resultCode && resultCode !== '00' && resultCode !== '000') {
            console.warn(`   ⚠️ Gov API Rent Error Envelope [${resultCode}]: ${resultMsg || '공공 API 오류 응답'}`);
            break;
          }

          if (text.includes('<OpenAPI_ServiceResponse>') || text.includes('<cmmMsgHeader>')) {
            const errMsg = resultMsg || 'OpenAPI Gateway Error';
            console.warn(`   ⚠️ Gov API Rent Gateway Error: ${errMsg}`);
            break;
          }

          const totalMatch = text.match(/<totalCount>(\d+)<\/totalCount>/);
          totalCount = totalMatch ? parseInt(totalMatch[1], 10) : 0;
          if (totalCount === 0) break;

          const itemsXml = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
          for (const itemXml of itemsXml) {
            const tagMap = new Map();
            const tagRegex = /<([^>]+)>([^<]*)<\/\1>/g;
            let tagMatch;
            while ((tagMatch = tagRegex.exec(itemXml)) !== null) {
              tagMap.set(tagMatch[1], tagMatch[2].trim());
            }
            const getTag = (...keys) => {
              for (const k of keys) {
                const val = tagMap.get(k);
                if (val !== undefined && val !== null && val !== '') return val;
              }
              return '';
            };

            const dong = getTag('umdNm', '법정동', 'dong');
            if (!DONGTAN_DONGS.some(d => dong.includes(d))) continue;

            const aptName = getTag('aptNm', '아파트');
            const depositStr = getTag('deposit', '보증금액', '보증금').replace(/,/g, '').trim();
            const monthlyRentStr = getTag('monthlyRent', '월세금액', '월세') ? getTag('monthlyRent', '월세금액', '월세').replace(/,/g, '').trim() : '0';

            const deposit = parseInt(depositStr, 10) || 0;
            const monthlyRent = parseInt(monthlyRentStr, 10) || 0;
            const dealType = monthlyRent > 0 ? '월세' : '전세';

            const area = parseFloat(getTag('excluUseAr', '전용면적')) || 0;
            const contractDay = getTag('dealDay', '일').padStart(2, '0');
            const floor = parseInt(getTag('floor', '층'), 10) || 0;

            const baseKey = `RENT_${aptName}_${ym}_${contractDay}_${area}_${deposit}_${monthlyRent}_${floor}`;
            const currentDistrictCount = (currentDistrictOccurrences.get(baseKey) || 0) + 1;
            currentDistrictOccurrences.set(baseKey, currentDistrictCount);
            const txIdentifier = `${baseKey}_${currentDistrictCount}`;

            if (seenRawTxKeys.has(txIdentifier)) {
              continue; // 다른 LAWD_CD에서 이미 수집된 중복 전월세 건너뜀
            }
            seenRawTxKeys.add(txIdentifier);

            const occurrence = (keyOccurrences.get(baseKey) || 0) + 1;
            keyOccurrences.set(baseKey, occurrence);
            const _key = occurrence === 1 ? baseKey : `${baseKey}_${occurrence}`;

            if (existingMap.has(_key)) {
              continue; // 이미 저장된 동일 건 건너뜀
            }

            const record = {
              sigungu: `경기도 화성시 동탄구 ${dong}`,
              dong,
              aptName,
              area,
              areaPyeong: getSupplyPyeong(aptName, area),
              contractYm: ym,
              contractDay,
              contractDate: `${ym}${contractDay}`,
              price: deposit,
              deposit,
              monthlyRent,
              floor,
              buildYear: parseInt(getTag('buildYear', '건축년도'), 10) || 0,
              dealType,
              source: 'govt_api_rent',
              reqGb: getTag('contractType', '계약구분') || '',
              rnuYn: getTag('useRRRight', '갱신요구권사용여부') || '',
              _key,
            };

            const parsed = RentTransactionSchema.safeParse(record);
            if (parsed.success) {
              monthRecords.push(parsed.data);
            } else {
              console.warn(`⚠️ [Fetch Rent XML] Invalid record:`, parsed.error.format());
            }
          }
          if (itemsXml.length === 0) break;
        } else {
          // JSON response handling
          const jsonObj = rawData;

          const jsonResultCode = jsonObj.response?.header?.resultCode ||
                                 jsonObj.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnReasonCode;
          const jsonResultMsg = jsonObj.response?.header?.resultMsg ||
                                jsonObj.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnAuthMsg ||
                                jsonObj.OpenAPI_ServiceResponse?.cmmMsgHeader?.errMsg;

          if (jsonResultCode && jsonResultCode !== '000' && jsonResultCode !== '00') {
            const errMsg = jsonResultMsg || JSON.stringify(jsonObj);
            console.warn(`   ⚠️ Gov API Rent JSON 에러 [${jsonResultCode}]: ${errMsg}`);
            break;
          }

          totalCount = jsonObj.response?.body?.totalCount || 0;
          if (totalCount === 0) break;

          let items = jsonObj.response?.body?.items?.item || [];
          if (!Array.isArray(items)) items = [items];

          const getJsonVal = (item, ...keys) => {
            for (const k of keys) {
              if (item[k] !== undefined && item[k] !== null && item[k] !== '') {
                return String(item[k]).trim();
              }
            }
            return '';
          };

          for (const item of items) {
            const dong = getJsonVal(item, 'umdNm', '법정동', 'dong');
            if (!DONGTAN_DONGS.some(d => dong.includes(d))) continue;

            const aptName = getJsonVal(item, 'aptNm', '아파트');
            const depositStr = getJsonVal(item, 'deposit', '보증금액', '보증금').replace(/,/g, '').trim();
            const monthlyRentStr = getJsonVal(item, 'monthlyRent', '월세금액', '월세') ? getJsonVal(item, 'monthlyRent', '월세금액', '월세').replace(/,/g, '').trim() : '0';

            const deposit = parseInt(depositStr, 10) || 0;
            const monthlyRent = parseInt(monthlyRentStr, 10) || 0;
            const dealType = monthlyRent > 0 ? '월세' : '전세';

            const area = parseFloat(getJsonVal(item, 'excluUseAr', '전용면적')) || 0;
            const contractDay = getJsonVal(item, 'dealDay', '일').padStart(2, '0');
            const floor = parseInt(getJsonVal(item, 'floor', '층'), 10) || 0;

            const baseKey = `RENT_${aptName}_${ym}_${contractDay}_${area}_${deposit}_${monthlyRent}_${floor}`;
            const currentDistrictCount = (currentDistrictOccurrences.get(baseKey) || 0) + 1;
            currentDistrictOccurrences.set(baseKey, currentDistrictCount);
            const txIdentifier = `${baseKey}_${currentDistrictCount}`;

            if (seenRawTxKeys.has(txIdentifier)) {
              continue; // 다른 LAWD_CD에서 이미 수집된 중복 전월세 건너뜀
            }
            seenRawTxKeys.add(txIdentifier);

            const occurrence = (keyOccurrences.get(baseKey) || 0) + 1;
            keyOccurrences.set(baseKey, occurrence);
            const _key = occurrence === 1 ? baseKey : `${baseKey}_${occurrence}`;

            if (existingMap.has(_key)) {
              continue;
            }

            const record = {
              sigungu: `경기도 화성시 동탄구 ${dong}`,
              dong,
              aptName,
              area,
              areaPyeong: getSupplyPyeong(aptName, area),
              contractYm: ym,
              contractDay,
              contractDate: `${ym}${contractDay}`,
              price: deposit,
              deposit,
              monthlyRent,
              floor,
              buildYear: parseInt(getJsonVal(item, 'buildYear', '건축년도'), 10) || 0,
              dealType,
              source: 'govt_api_rent',
              reqGb: getJsonVal(item, 'contractType', '계약구분') || '',
              rnuYn: getJsonVal(item, 'useRRRight', '갱신요구권사용여부') || '',
              _key,
            };

            const parsed = RentTransactionSchema.safeParse(record);
            if (parsed.success) {
              monthRecords.push(parsed.data);
            } else {
              console.warn(`⚠️ [Fetch Rent JSON] Invalid record:`, parsed.error.format());
            }
          }
          if (items.length === 0) break;
        }

        page++;
      } while (page * 1000 <= totalCount + 1000);
    }

    // 4. Firestore에 배치 쓰기 (신규 건만)
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
      console.log(`   ✅ ${written}건 (동탄지역 전월세) 동기화 완료`);
    } else {
      console.log(`   ⏭️  0건 (동탄지역 전월세 없음)`);
    }
  }

  console.log(`\n🎉 총 ${totalNew}건 전월세 Firestore 동기화 완료`);
  process.exit(0);
}

module.exports = {
  RentTransactionSchema,
  fetchWithRetry,
  main,
};

if (require.main === module) {
  main().catch(err => {
    console.error('❌ 동기화 실패:', err.message);
    process.exit(1);
  });
}
