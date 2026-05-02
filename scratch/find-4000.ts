import { TX_SUMMARY } from '../frontend/src/lib/transaction-summary';

const results = [];

for (const [name, tx] of Object.entries(TX_SUMMARY)) {
  const pyeongPrice = tx.avg3MPerPyeong || tx.avg1MPerPyeong || (tx.latestArea ? tx.latestPrice / (tx.latestArea / 3.3058) : 0);
  if (pyeongPrice >= 4000) {
    results.push({ name, pyeongPrice });
  }
}

results.sort((a, b) => b.pyeongPrice - a.pyeongPrice);

console.log(`평당 4,000만 이상 아파트 목록 (${results.length}곳):`);
results.forEach(r => {
  console.log(`- ${r.name} : ${Math.round(r.pyeongPrice)}만원/평`);
});
