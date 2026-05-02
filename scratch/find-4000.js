const fs = require('fs');

const txContent = fs.readFileSync('frontend/src/lib/transaction-summary.ts', 'utf8');

const startIdx = txContent.indexOf('export const TX_SUMMARY: Record<string, AptTxSummary> = {');
if (startIdx === -1) {
  console.log("Could not find TX_SUMMARY");
  process.exit(1);
}

const jsonStr = txContent.substring(txContent.indexOf('{', startIdx));
let summary;
try {
  summary = eval('(' + jsonStr + ')');
} catch (e) {
  console.log("Failed to parse", e.message);
  process.exit(1);
}

const results = [];

for (const [name, tx] of Object.entries(summary)) {
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
