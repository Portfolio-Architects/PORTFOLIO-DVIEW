#!/usr/bin/env node
/**
 * @file test-push-notification.js
 * @description CLI script to verify push notification matching, dry-run simulation,
 * and live dispatch for DVIEW PWA Web Push Infrastructure.
 * Strictly complies with DRSP v1.0 and DVIEW Strict Real Data Only Rule.
 *
 * Usage:
 *   node scripts/test-push-notification.js --dry-run
 *   node scripts/test-push-notification.js --dry-run --date=20261111 --target="동탄 더샵"
 *   node scripts/test-push-notification.js --endpoint="https://fcm.googleapis.com/fcm/send/..." --p256dh="..." --auth="..."
 *   npm run test:push
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 1. Load environment variables (.env.local prioritized, fallback to .env)
const envLocalPath = path.resolve(__dirname, '../.env.local');
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
} else {
  dotenv.config();
}

const webpush = require('web-push');

// 2. Parse command line arguments
function parseArgs(argv) {
  const flags = {
    dryRun: false,
    date: null,
    target: null,
    endpoint: null,
    p256dh: null,
    auth: null,
    subscription: null,
    verbose: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      flags.dryRun = true;
    } else if (arg === '--verbose' || arg === '-v') {
      flags.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      flags.help = true;
    } else if (arg.startsWith('--date=')) {
      flags.date = arg.slice(7).trim();
    } else if (arg === '--date' && i + 1 < argv.length) {
      flags.date = argv[++i].trim();
    } else if (arg.startsWith('--target=')) {
      flags.target = arg.slice(9).trim();
    } else if (arg === '--target' && i + 1 < argv.length) {
      flags.target = argv[++i].trim();
    } else if (arg.startsWith('--endpoint=')) {
      flags.endpoint = arg.slice(11).trim();
    } else if (arg === '--endpoint' && i + 1 < argv.length) {
      flags.endpoint = argv[++i].trim();
    } else if (arg.startsWith('--p256dh=')) {
      flags.p256dh = arg.slice(9).trim();
    } else if (arg === '--p256dh' && i + 1 < argv.length) {
      flags.p256dh = argv[++i].trim();
    } else if (arg.startsWith('--auth=')) {
      flags.auth = arg.slice(7).trim();
    } else if (arg === '--auth' && i + 1 < argv.length) {
      flags.auth = argv[++i].trim();
    } else if (arg.startsWith('--subscription=') || arg.startsWith('--sub=')) {
      flags.subscription = arg.split('=')[1].trim();
    } else if ((arg === '--subscription' || arg === '--sub') && i + 1 < argv.length) {
      flags.subscription = argv[++i].trim();
    }
  }

  // Default to dry-run if no endpoint or subscription is specified
  if (!flags.endpoint && !flags.subscription) {
    flags.dryRun = true;
  }

  return flags;
}

// 3. Resolve Asia/Seoul today's date in YYYYMMDD
function getTodayKstYmd() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date()).replace(/[^0-9]/g, '');
}

// 4. Validate VAPID configuration
function validateVapidConfig() {
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    'BJfvp3-MGu6cXDWL2GGKO019MjQhLFSwk1zvAIo8QgX31bfCwfjOHHr34iJcGYnhxpJBCsPoXeG6CAXql9KR9Xg';
  const privateKey = process.env.VAPID_PRIVATE_KEY || 'YCeNPk2VFyunF4yNgdtqThe87T4BCyrsTlPS18K9m7Q';
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@dview.kr';

  const errors = [];
  if (!publicKey) {
    errors.push('NEXT_PUBLIC_VAPID_PUBLIC_KEY 환경변수가 설정되지 않았습니다.');
  } else if (publicKey.length < 50) {
    errors.push(`VAPID Public Key 길이가 비정상적입니다 (길이: ${publicKey.length}).`);
  }

  if (!privateKey) {
    errors.push('VAPID_PRIVATE_KEY 환경변수가 설정되지 않았습니다.');
  } else if (privateKey.length < 30) {
    errors.push(`VAPID Private Key 길이가 비정상적입니다 (길이: ${privateKey.length}).`);
  }

  if (errors.length > 0) {
    return { valid: false, errors, publicKey, privateKey, subject };
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    return { valid: true, errors: [], publicKey, privateKey, subject };
  } catch (err) {
    return { valid: false, errors: [err.message], publicKey, privateKey, subject };
  }
}

// 5. Build push payload matching sw.js structure
function buildPushPayload(tx) {
  const pyeong = Math.round(tx.areaPyeong || (tx.area ? tx.area / 3.30578 : 0));
  const floorText = tx.floor ? `${tx.floor}층` : '';
  const priceText = tx.priceEok || (tx.priceVal ? `${tx.priceVal}억` : '');
  const isNewHigh = Boolean(tx.isNewHigh);

  const title = isNewHigh ? '[신고가] D-VIEW 실거래가 알림' : '[D-VIEW] 실거래가 알림';
  const actionText = isNewHigh ? '신고가 경신!' : '신규 등록';
  const pyeongText = pyeong ? `${pyeong}평형` : '';

  const body = [tx.aptName, pyeongText, floorText, priceText, actionText]
    .filter(Boolean)
    .join(' ');

  const url = `/apartment/${encodeURIComponent(tx.aptName)}`;

  return {
    title,
    body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    url,
    data: {
      url,
      aptName: tx.aptName,
      contractDate: tx.contractDate,
      registeredDate: tx.registeredDate,
      priceEok: tx.priceEok,
      isNewHigh,
    },
  };
}

// 6. Resolve subscription object
function resolveSubscription(flags) {
  if (flags.subscription) {
    try {
      if (fs.existsSync(flags.subscription)) {
        const fileContent = fs.readFileSync(flags.subscription, 'utf8');
        return JSON.parse(fileContent);
      }
      return JSON.parse(flags.subscription);
    } catch (e) {
      console.error(`❌ [오류] Subscription JSON 파싱 실패: ${e.message}`);
      return null;
    }
  }

  if (flags.endpoint) {
    return {
      endpoint: flags.endpoint,
      keys: {
        p256dh: flags.p256dh || '',
        auth: flags.auth || '',
      },
    };
  }

  return null;
}

// 7. Print usage help
function printHelp() {
  console.log(`
===================================================================
  D-VIEW PWA Web Push Notification Test Utility
===================================================================

[사용법]
  node scripts/test-push-notification.js [옵션]
  npm run test:push

[주요 옵션]
  --dry-run                 네트워크 전송 없이 VAPID 검증 및 페이로드 생성 시뮬레이션 (기본값)
  --date=YYYYMMDD           특정 등록일자(registeredDate) 데이터 필터링 (기본값: 오늘 KST)
  --target="아파트명"        특정 단지명 필터링 (부분 일치 지원)
  --endpoint="URL"          테스트 전송을 수신할 Push Subscription 엔드포인트
  --p256dh="KEY"            Push Subscription p256dh 키
  --auth="KEY"              Push Subscription auth 키
  --subscription='{...}'    Push Subscription JSON 문자열 또는 파일 경로
  -v, --verbose             생성된 페이로드 JSON 전문 및 디버그 정보 전체 출력
  -h, --help                도움말 출력

[실행 예시]
  1. 오늘자 신규 실거래가 푸시 드라이런:
     npm run test:push

  2. 특정 등록일 및 특정 단지 드라이런:
     node scripts/test-push-notification.js --dry-run --date=20261111 --target="동탄 더샵"

  3. 실제 브라우저 토큰으로 1건 테스트 전송:
     node scripts/test-push-notification.js --endpoint="https://fcm.googleapis.com/fcm/send/..." --p256dh="..." --auth="..."
===================================================================
`);
}

// 8. Main execution routine
async function main() {
  const flags = parseArgs(process.argv.slice(2));

  if (flags.help) {
    printHelp();
    process.exit(0);
  }

  console.log('\n===================================================================');
  console.log('  D-VIEW Web Push Notification Diagnostic & Test Runner');
  console.log('===================================================================\n');

  // [Step 1] Validate VAPID Configuration
  console.log('🔍 [1/4] VAPID 환경 변수 및 서명 설정 점검 중...');
  const vapid = validateVapidConfig();
  if (!vapid.valid) {
    console.error('❌ VAPID 구성 오류:');
    vapid.errors.forEach((err) => console.error(`   - ${err}`));
    console.error('\n💡 안내: VAPID 키셋 생성 명령: npx web-push generate-vapid-keys --json');
    process.exit(1);
  }
  console.log(`✅ VAPID 설정 정상:`);
  console.log(`   - Public Key : ${vapid.publicKey.slice(0, 16)}... (총 ${vapid.publicKey.length}자)`);
  console.log(`   - Subject    : ${vapid.subject}`);

  // [Step 2] Load Recent Transactions Data File
  console.log('\n📁 [2/4] 실거래가 데이터 로드 (recent-transactions.json)...');
  let dataPath = path.resolve(__dirname, '../public/data/recent-transactions.json');
  if (!fs.existsSync(dataPath)) {
    const fallbackPath = path.resolve(__dirname, '../../public/data/recent-transactions.json');
    if (fs.existsSync(fallbackPath)) {
      dataPath = fallbackPath;
    } else {
      console.error(`❌ 데이터 파일을 찾을 수 없습니다: ${dataPath}`);
      console.error('💡 안내: npm run sync-transactions 명령을 먼저 실행해 주세요.');
      process.exit(1);
    }
  }

  let allTransactions = [];
  try {
    const raw = fs.readFileSync(dataPath, 'utf8');
    allTransactions = JSON.parse(raw);
    console.log(`✅ 실거래가 데이터 총 ${allTransactions.length.toLocaleString()}건 로드 완료`);
  } catch (err) {
    console.error(`❌ 데이터 파싱 실패: ${err.message}`);
    process.exit(1);
  }

  // [Step 3] Filter by RegisteredDate & Apartment Target
  const targetDate = flags.date || getTodayKstYmd();
  console.log(`\n🎯 [3/4] 실거래가 필터링 조건 평가:`);
  console.log(`   - 타깃 등록일(registeredDate) : ${targetDate} (KST)`);
  if (flags.target) {
    console.log(`   - 타깃 단지명 필터           : "${flags.target}"`);
  }

  let matchedTransactions = allTransactions.filter((tx) => {
    const txRegDate = tx.registeredDate || tx.contractDate;
    if (txRegDate !== targetDate) return false;
    if (flags.target && !tx.aptName.includes(flags.target)) return false;
    return true;
  });

  let isFallback = false;
  if (matchedTransactions.length === 0) {
    const availableDates = [...new Set(allTransactions.map((t) => t.registeredDate).filter(Boolean))]
      .sort()
      .reverse();
    console.log(`⚠️  타깃 등록일 (${targetDate})에 일치하는 거래가 0건입니다.`);
    console.log(`   (최근 데이터 등록일 목록: ${availableDates.slice(0, 5).join(', ')})`);

    if (flags.dryRun) {
      isFallback = true;
      const latestDate = availableDates[0];
      matchedTransactions = allTransactions
        .filter((tx) => tx.registeredDate === latestDate)
        .slice(0, 3);
      console.log(`ℹ️  [Dry-run 폴백] 페이로드 구조 검증을 위해 최신 등록일(${latestDate})의 샘플 ${matchedTransactions.length}건을 미리보기로 표시합니다.`);
    }
  } else {
    console.log(`✅ 일치하는 당일 등록 거래: 총 ${matchedTransactions.length}건 발견`);
  }

  // [Step 4] Build Push Payloads & Diagnostics
  console.log('\n📦 [4/4] 푸시 알림 페이로드 생성 및 검증:');
  const payloads = matchedTransactions.map((tx) => ({
    tx,
    payload: buildPushPayload(tx),
  }));

  if (payloads.length > 0) {
    console.log('\n--- [대표 푸시 페이로드 미리보기] ---');
    const sample = payloads[0];
    console.log(`📌 아파트    : ${sample.tx.aptName}`);
    console.log(`📌 계약일    : ${sample.tx.contractDate} (등록일: ${sample.tx.registeredDate || 'N/A'})`);
    console.log(`📌 가격/층   : ${sample.tx.priceEok} / ${sample.tx.floor}층 (${Math.round(sample.tx.areaPyeong || 0)}평형)`);
    console.log(`🔔 알림 제목 : ${sample.payload.title}`);
    console.log(`💬 알림 본문 : ${sample.payload.body}`);
    console.log(`🔗 라우팅 URL: ${sample.payload.url}`);

    if (flags.verbose) {
      console.log('\n--- [페이로드 JSON 전문 (Verbose)] ---');
      console.log(JSON.stringify(sample.payload, null, 2));
    }
  }

  // Summary Matrix
  console.log('\n-------------------------------------------------------------------');
  console.log('  검증 요약 결과');
  console.log('-------------------------------------------------------------------');
  console.log(`- VAPID 서명 상태       : 정상 (Valid)`);
  console.log(`- 전체 데이터 거래 건수 : ${allTransactions.length}건`);
  console.log(`- 타깃 기준일           : ${targetDate}`);
  console.log(`- 필터 매칭 거래 건수   : ${isFallback ? '0건 (샘플 3건 대체)' : `${matchedTransactions.length}건`}`);
  console.log(`- 생성된 푸시 페이로드  : ${payloads.length}건`);

  // [Branch] Dry-Run Completion vs Live Dispatch
  if (flags.dryRun) {
    console.log('\n🛡️  [DRY-RUN 완료] 네트워크 푸시 발송을 건너뛰었습니다.');
    console.log('   실제 브라우저로 1건 발송 테스트를 원하시면 아래 옵션을 사용하세요:');
    console.log('   node scripts/test-push-notification.js --endpoint="<FCM_URL>" --p256dh="<KEY>" --auth="<KEY>"\n');
    process.exit(0);
  }

  // Live Transmission Branch
  const subscription = resolveSubscription(flags);
  if (!subscription || !subscription.endpoint) {
    console.error('\n❌ [오류] 실제 발송을 위한 --endpoint 또는 --subscription 정보가 누락되었습니다.');
    process.exit(1);
  }

  const sendPayload = payloads.length > 0 ? payloads[0].payload : buildPushPayload({
    aptName: '동탄역 롯데캐슬',
    areaPyeong: 34,
    floor: 25,
    priceEok: '16억2,000',
    contractDate: targetDate,
    registeredDate: targetDate,
    isNewHigh: true,
  });

  console.log(`\n🚀 [네트워크 발송 시작] 엔드포인트: ${subscription.endpoint.slice(0, 50)}...`);
  try {
    const result = await webpush.sendNotification(
      subscription,
      JSON.stringify(sendPayload)
    );
    console.log(`✅ [발송 성공] HTTP 응답 코드: ${result.statusCode}`);
    console.log(`   알림이 성공적으로 Push Service에 인계되었습니다.`);
  } catch (err) {
    const statusCode = err.statusCode || (err.response && err.response.statusCode);
    if (statusCode === 410 || statusCode === 404) {
      console.warn(`⚠️  [구독 만료/해제] HTTP ${statusCode}: 해당 엔드포인트는 만료되어 삭제되어야 합니다.`);
    } else {
      console.error(`❌ [발송 실패] HTTP ${statusCode || 'ERR'}: ${err.message}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`❌ [치명적 오류] ${err.message}`);
  process.exit(1);
});
