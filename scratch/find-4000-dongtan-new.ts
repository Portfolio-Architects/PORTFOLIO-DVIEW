import { TX_SUMMARY } from '../frontend/src/lib/transaction-summary';
import { FULL_DONG_DATA } from '../frontend/src/lib/dong-apartments';
import { findTxKey } from '../frontend/src/lib/utils/apartmentMapping';

const results = [];

Object.entries(FULL_DONG_DATA).forEach(([dong, apts]) => {
  apts.forEach(aptName => {
    const key = findTxKey(aptName, TX_SUMMARY);
    const tx = key ? TX_SUMMARY[key] : undefined;
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
