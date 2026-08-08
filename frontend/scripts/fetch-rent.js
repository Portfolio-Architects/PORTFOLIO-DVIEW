#!/usr/bin/env node
/**
 * 🔄 국토부 전월세 실거래가 API → Firestore 동기화
 * 
 * 사용법: node scripts/fetch-rent.js
 * 
 * 국토부 전월세 실거래가 공공데이터 API에서 동탄구(화성시) 최신 전월세 거래 데이터를 가져와
 * Firestore 'transactions' 컬렉션에 upsert합니다.
 */

require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
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

const API_KEY = process.env.BUILDING_API_KEY || '4611c02045e69b5e6c0bf50b9ecbee6de92e7ee0351eb8a7d529253340f755ff';
const LAWD_CDS = ['41590', '41597']; // 화성시 및 동탄구 모두 스캔
const API_BASE = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent';

const DONGTAN_DONGS = ['반송동', '능동', '청계동', '영천동', '오산동', '신동', '목동', '산척동', '장지동', '송동', '방교동', '금곡동', '여울동'];

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

  // 1. 최신 전월세 데이터 연월 스캔 (기본 6개월, --full 옵션 시 17개월)
  const isFullSync = process.argv.includes('--full');
  const monthCount = isFullSync ? 17 : 6;
  const now = new Date();
  const monthsToSync = new Set();
  
  for (let i = 0; i < monthCount; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthsToSync.add(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const sortedMonths = Array.from(monthsToSync).sort((a, b) => b.localeCompare(a));
  console.log(`   동기화 대상 월: ${sortedMonths.join(', ')}`);

  // 3. API 호출
  let totalNew = 0;

  for (const ym of sortedMonths) {
    console.log(`\n📅 ${ym} 전월세 처리 중...`);
    const monthRecords = [];

    for (const currentLawd of LAWD_CDS) {
      let page = 1;
      let totalCount = 0;

      do {
        const url = `${API_BASE}?serviceKey=${encodeURIComponent(API_KEY)}&LAWD_CD=${currentLawd}&DEAL_YMD=${ym}&pageNo=${page}&numOfRows=1000&_type=json`;

        let text = '';
        let success = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          let timeoutId;
          try {
            const controller = new AbortController();
            timeoutId = setTimeout(() => controller.abort(), 15000);
            const res = await fetch(url, { signal: controller.signal });
            if (!res.ok) {
              console.error(`   ❌ HTTP ${res.status}`);
              clearTimeout(timeoutId);
              break;
            }
            text = await res.text();
            clearTimeout(timeoutId);
            success = true;
            break;
          } catch (e) {
            if (timeoutId) clearTimeout(timeoutId);
            console.error(`   ⚠️ API 호출 지연 (시도 ${attempt}/3)... ${e.message}`);
            await new Promise(r => setTimeout(r, 2000));
          }
        }

        if (!success) {
          console.error(`   ❌ API 응답 실패로 (${ym}, ${currentLawd}) 건너뜀`);
          break;
        }

        const isXml = text.trim().startsWith('<');

        if (isXml) {
          // XML response handling
          const resultCodeMatch = text.match(/<resultCode>([^<]*)<\/resultCode>/);
          const resultMsgMatch = text.match(/<resultMsg>([^<]*)<\/resultMsg>/);
          const resultCode = resultCodeMatch ? resultCodeMatch[1].trim() : '';
          const resultMsg = resultMsgMatch ? resultMsgMatch[1].trim() : '';

          if (resultCode && resultCode !== '00' && resultCode !== '000') {
            console.error(`   ❌ Gov API Rent Error [${resultCode}]: ${resultMsg}`);
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

            const _key = `RENT_${aptName}_${ym}_${contractDay}_${area}_${deposit}_${monthlyRent}_${floor}`;
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
              console.warn(`⚠️ [Fetch Rent XML] Invalid rent transaction record at apt ${aptName}:`, parsed.error.format());
            }
          }
          if (itemsXml.length === 0) break;
        } else {
          // JSON response handling
          let jsonObj;
          try {
            jsonObj = JSON.parse(text);
          } catch (e) {
            console.error(`   ❌ JSON 파싱 실패: ${e.message}`);
            break;
          }

          const resultCode = jsonObj.response?.header?.resultCode;
          if (resultCode !== '000' && resultCode !== '00') {
            const errMsg = jsonObj.response?.header?.resultMsg || JSON.stringify(jsonObj);
            console.error(`   ❌ API 에러: ${errMsg}`);
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
            const monthlyRentStr = getJsonVal(item, 'monthlyRent', '월세금액', '월세').replace(/,/g, '').trim();

            const deposit = parseInt(depositStr, 10) || 0;
            const monthlyRent = parseInt(monthlyRentStr, 10) || 0;
            const dealType = monthlyRent > 0 ? '월세' : '전세';

            const area = parseFloat(getJsonVal(item, 'excluUseAr', '전용면적')) || 0;
            const contractDay = getJsonVal(item, 'dealDay', '일').padStart(2, '0');
            const floor = parseInt(getJsonVal(item, 'floor', '층'), 10) || 0;

            const _key = `RENT_${aptName}_${ym}_${contractDay}_${area}_${deposit}_${monthlyRent}_${floor}`;
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
              console.warn(`⚠️ [Fetch Rent JSON] Invalid rent transaction record at apt ${aptName}:`, parsed.error.format());
            }
          }
          if (items.length === 0) break;
        }

        page++;
      } while (page * 1000 <= totalCount + 1000);
    }

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
      console.log(`   ✅ ${written}건 (동탄지역 전월세) 동기화 완료`);
    } else {
      console.log(`   ⏭️  0건 (동탄지역 전월세 없음)`);
    }
  }

  console.log(`\n🎉 총 ${totalNew}건 전월세 Firestore 동기화 완료`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ 동기화 실패:', err.message);
  process.exit(1);
});
