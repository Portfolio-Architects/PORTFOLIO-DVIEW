const fs = require('fs');
const path = require('path');

// 1. tx-summary.json 로드
const txSummaryPath = path.resolve(__dirname, '../public/data/tx-summary.json');
const txData = JSON.parse(fs.readFileSync(txSummaryPath, 'utf8'));
const summary = txData.summary;

// 2. 아파트 목록 배열로 변환 후 latestDate 순 정렬
const aptList = [];
for (const [aptName, sum] of Object.entries(summary)) {
  if (sum.latestDate) {
    aptList.push({
      name: aptName,
      latestDate: sum.latestDate,
      latestPriceEok: sum.latestPriceEok,
      dong: sum.dong
    });
  }
}

// 정렬: 최신 날짜순
aptList.sort((a, b) => {
  const dateA = String(a.latestDate).replace(/[^0-9]/g, '');
  const dateB = String(b.latestDate).replace(/[^0-9]/g, '');
  return dateB.localeCompare(dateA);
});

console.log('=== Top 10 Recent Transactions in tx-summary.json ===');
aptList.slice(0, 10).forEach((apt, idx) => {
  console.log(`${idx + 1}. ${apt.name} (${apt.dong}) - Date: ${apt.latestDate}, Price: ${apt.latestPriceEok}`);
});
