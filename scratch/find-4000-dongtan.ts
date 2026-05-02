import { TX_SUMMARY } from '../frontend/src/lib/transaction-summary';
import { FULL_DONG_DATA } from '../frontend/src/lib/dong-apartments';

const validNames = new Set(Object.values(FULL_DONG_DATA).flat().map(name => name.replace(/\s+/g, '')));

const results = [];

for (const [name, tx] of Object.entries(TX_SUMMARY)) {
  const normName = name.replace(/\s+/g, '');
  if (!validNames.has(normName) && !validNames.has(normName.replace(/아파트$/, ''))) {
    // We should be more careful, but let's just see. Actually, let's just use the logic from the app.
  }
}

// Better logic: iterate through FULL_DONG_DATA
import { normalizeAptName } from '../frontend/src/lib/utils/apartmentMapping';

Object.entries(FULL_DONG_DATA).forEach(([dong, apts]) => {
  apts.forEach(aptName => {
    const tx = TX_SUMMARY[aptName] || TX_SUMMARY[normalizeAptName(aptName)];
    if (tx) {
      const pyeongPrice = tx.avg3MPerPyeong || tx.avg1MPerPyeong || (tx.latestArea ? tx.latestPrice / (tx.latestArea / 3.3058) : 0);
      if (pyeongPrice >= 4000) {
        results.push({ name: aptName, dong, pyeongPrice });
      }
    }
  });
});

results.sort((a, b) => b.pyeongPrice - a.pyeongPrice);

console.log(`동탄 내 평당 4,000만 이상 아파트 목록 (${results.length}곳):`);
results.forEach(r => {
  console.log(`- [${r.dong}] ${r.name} : ${Math.round(r.pyeongPrice)}만원/평`);
});
