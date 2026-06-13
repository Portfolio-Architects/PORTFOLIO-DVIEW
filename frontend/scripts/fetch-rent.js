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
const LAWD_CD = '41597'; // 동탄구
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

  // 1. 최신 전월세 데이터 연월 대신 고정 6개월치 스캔 (인덱스 에러 회피)
  const now = new Date();
  const monthsToSync = new Set();
  
  for (let i = 0; i < 17; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthsToSync.add(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  console.log(`   동기화 대상 월: ${Array.from(monthsToSync).sort().join(', ')}`);

  // 3. API 호출
  let totalNew = 0;
  const syncLog = [];

  for (const ym of Array.from(monthsToSync).sort()) {
    let page = 1;
    let totalCount = 0;
    const monthRecords = [];

    console.log(`\n📅 ${ym} 전월세 처리 중...`);

    do {
      const url = `${API_BASE}?serviceKey=${encodeURIComponent(API_KEY)}&LAWD_CD=${LAWD_CD}&DEAL_YMD=${ym}&pageNo=${page}&numOfRows=1000&_type=json`;

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
          if (text.trim().startsWith('<')) {
            console.error(`   ⚠️ API 응답이 XML 형식입니다 (예상 JSON): ${text.slice(0, 50)}...`);
            text = { response: { header: { resultCode: '99', resultMsg: 'XML 응답이 반환됨' } } };
          } else {
            text = JSON.parse(text);
          }
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
        console.error(`   ❌ API 응답 실패로 해당 연월(${ym}) 건너뜀`);
        break;
      }

      // 에러 응답 체크 (JSON 지원)
      if (text.response?.header?.resultCode !== '000' && text.response?.header?.resultCode !== '00') {
        const errMsg = text.response?.header?.resultMsg || JSON.stringify(text);
        console.error(`   ❌ API 에러: ${errMsg} (아직 인증키가 동기화되지 않았을 수 있습니다.)`);
        break;
      }

      totalCount = text.response?.body?.totalCount || 0;
      if (totalCount === 0) break;

      let items = text.response?.body?.items?.item || [];
      if (!Array.isArray(items)) items = [items];

      for (const item of items) {
        const dong = item.umdNm || '';
        
        // 동탄 지역 필터링
        if (!DONGTAN_DONGS.some(d => dong.includes(d))) continue;

        const aptName = item.aptNm || '';
        const depositStr = String(item.deposit || '0').replace(/,/g, '').trim();
        const monthlyRentStr = String(item.monthlyRent || '0').replace(/,/g, '').trim();
        
        const deposit = parseInt(depositStr, 10) || 0;
        const monthlyRent = parseInt(monthlyRentStr, 10) || 0;
        const dealType = monthlyRent > 0 ? '월세' : '전세';

        const area = parseFloat(item.excluUseAr) || 0;
        const contractDay = String(item.dealDay || '').padStart(2, '0');
        const floor = parseInt(item.floor || '0', 10) || 0;

        const record = {
          sigungu: `경기도 화성시 동탄구 ${dong}`,
          dong,
          aptName,
          area,
          areaPyeong: Math.round(area / 3.3058 * 10) / 10,
          contractYm: ym,
          contractDay,
          contractDate: `${ym}${contractDay}`,
          price: deposit, // 전세 보증금을 기준 가격으로 저장 (UI 매매 호환성)
          deposit: deposit,
          monthlyRent: monthlyRent,
          floor,
          buildYear: parseInt(item.buildYear, 10) || 0,
          dealType: dealType,
          source: 'govt_api_rent',
          reqGb: item.contractType || '',
          rnuYn: item.useRRRight || '',
          _key: `RENT_${aptName}_${ym}_${contractDay}_${area}_${deposit}_${floor}`,
        };

        const parsed = RentTransactionSchema.safeParse(record);
        if (parsed.success) {
          monthRecords.push(parsed.data);
        } else {
          console.warn(`⚠️ [Fetch Rent] Invalid rent transaction record at apt ${aptName}:`, parsed.error.format());
          console.log(`Record Details: ${JSON.stringify(record)}`);
        }
      }

      if (items.length === 0) break; // 무한 루프 방지
      page++;
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
