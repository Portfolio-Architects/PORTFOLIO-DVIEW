const fs = require('fs');
const path = require('path');
const { findTxKey } = require('../src/lib/utils/apartmentMapping');
const { APARTMENTS_BY_DONG } = require('../src/lib/apartment-data');

// 1. tx-summary.json 로드
const txSummaryPath = path.resolve(__dirname, '../public/data/tx-summary.json');
const txData = JSON.parse(fs.readFileSync(txSummaryPath, 'utf8'));
const summary = txData.summary;

// 2. allApts 수집
const allApts = Object.values(APARTMENTS_BY_DONG).flat();

// 3. HotComplexRanking 의 recentList 로직 모사
const enriched = allApts.map((apt) => {
  const rawKey = apt.txKey || apt.name;
  const txKey = findTxKey(rawKey, summary, {}) || rawKey;
  const sum = summary[txKey];
  return {
    apt,
    sum,
  };
});

const filtered = enriched.filter(item => item.sum && item.sum.latestDate);

const recentList = filtered
  .sort((a, b) => {
    const dateA = String(a.sum.latestDate).replace(/[^0-9]/g, '');
    const dateB = String(b.sum.latestDate).replace(/[^0-9]/g, '');
    return dateB.localeCompare(dateA);
  })
  .slice(0, 10)
  .map((item, index) => {
    const sum = item.sum;
    let formattedDate = '';
    const dateStr = String(sum.latestDate).replace(/[^0-9]/g, '');
    if (dateStr.length === 8) {
      const month = parseInt(dateStr.substring(4, 6), 10);
      const day = parseInt(dateStr.substring(6, 8), 10);
      formattedDate = `${month}.${day}`;
    }
    return {
      rank: index + 1,
      name: item.apt.name,
      dong: item.apt.dong,
      latestDate: formattedDate,
      latestPriceEok: sum.latestPriceEok
    };
  });

console.log('=== Expected HotComplexRanking recentList (Top 10) ===');
recentList.forEach(item => {
  console.log(`${item.rank}. ${item.name} (${item.dong}) - Date: ${item.latestDate}, Price: ${item.latestPriceEok}`);
});
