const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const https = require('https');

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

const API_KEY = '4611c02045e69b5e6c0bf50b9ecbee6de92e7ee0351eb8a7d529253340f755ff';
const LAWD_CD = '41590'; // 화성시 전체
const DONGTAN_DONGS = ['반송동', '능동', '청계동', '영천동', '오산동', '신동', '목동', '산척동', '장지동', '송동', '방교동', '금곡동', '여울동'];

// Sleep helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      return text;
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(1000 * (i + 1));
    }
  }
}

async function run() {
  const months = [];
  for (let year = 2005; year <= 2019; year++) {
    for (let month = 1; month <= 12; month++) {
      months.push(`${year}${String(month).padStart(2, '0')}`);
    }
  }

  const collRef = db.collection('transactionSync');
  let totalSaved = 0;

  for (const ym of months) {
    console.log(`Fetching ${ym}...`);
    let page = 1;
    let totalCount = 1; // dummy start
    let monthRecords = [];

    do {
      const url = `https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent?serviceKey=${API_KEY}&LAWD_CD=${LAWD_CD}&DEAL_YMD=${ym}&pageNo=${page}&numOfRows=1000`;
      
      const text = await fetchWithRetry(url);
      
      const totalMatch = text.match(/<totalCount>(\d+)<\/totalCount>/);
      totalCount = totalMatch ? parseInt(totalMatch[1], 10) : 0;
      
      if (totalCount === 0) break;

      const items = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
      
      for (const itemXml of items) {
        const tagMap = new Map();
        const tagRegex = /<([^>]+)>([^<]*)<\/\1>/g;
        let tagMatch;
        while ((tagMatch = tagRegex.exec(itemXml)) !== null) {
          tagMap.set(tagMatch[1], tagMatch[2].trim());
        }
        
        const get = (tag) => tagMap.get(tag) || '';

        let dongRaw = get('법정동') || get('umdNm');
        if (!dongRaw) dongRaw = get('dong') || '';
        dongRaw = dongRaw.trim();
        
        // Filter Dongtan dongs
        if (!DONGTAN_DONGS.some(d => dongRaw.includes(d))) {
          continue;
        }

        const aptName = get('아파트') || get('aptNm');
        const area = parseFloat(get('전용면적') || get('excluUseAr')) || 0;
        const depositStr = (get('보증금액') || get('deposit') || '').replace(/,/g, '');
        const rentStr = (get('월세금액') || get('monthlyRent') || '').replace(/,/g, '');
        
        const deposit = parseInt(depositStr, 10) || 0;
        const monthlyRent = parseInt(rentStr, 10) || 0;
        
        const floor = parseInt(get('층') || get('floor'), 10) || 0;
        const contractDay = (get('일') || get('dealDay')).padStart(2, '0');
        const contractYm = get('년') ? `${get('년')}${get('월').padStart(2, '0')}` : ym;
        const contractDate = `${contractYm}${contractDay}`;

        // Determine deal type
        const dealType = monthlyRent > 0 ? '월세' : '전세';

        const record = {
          apartmentName: aptName,
          dong: dongRaw,
          contractYm,
          contractDay,
          contractDate,
          deposit,
          monthlyRent,
          price: 0,
          dealType,
          area,
          areaPyeong: Math.round((area / 3.3058) * 10) / 10,
          floor,
          source: 'historical_api'
        };

        const docId = `${record.apartmentName}_${record.contractDate}_${record.area}_${record.floor}_${record.dealType}`.replace(/[\//]/g, '');
        record._id = docId;
        
        monthRecords.push(record);
      }
      
      if (items.length < 1000) {
        break;
      }
      page++;
      await sleep(100);
    } while (true);

    if (monthRecords.length > 0) {
      let batches = [];
      let currentBatch = db.batch();
      let count = 0;
      
      for (const record of monthRecords) {
        const docRef = collRef.doc(record._id);
        const data = { ...record };
        delete data._id; // don't save docId inside data
        currentBatch.set(docRef, data, { merge: true });
        count++;
        
        if (count % 400 === 0) {
          batches.push(currentBatch);
          currentBatch = db.batch();
        }
      }
      if (count % 400 !== 0) {
        batches.push(currentBatch);
      }
      
      for (const batch of batches) {
        await batch.commit();
      }
      totalSaved += monthRecords.length;
      console.log(`  -> Saved ${monthRecords.length} records for ${ym}.`);
    } else {
      console.log(`  -> No records found for ${ym}.`);
    }

    await sleep(200); // sleep between months
  }

  console.log(`Done! Total saved: ${totalSaved}`);
  process.exit(0);
}

run().catch(console.error);
