const fs = require('fs');

const txContent = fs.readFileSync('frontend/src/lib/transaction-summary.ts', 'utf8');

const startIdx = txContent.indexOf('export const TX_SUMMARY: Record<string, AptTxSummary> = {');
const jsonStr = txContent.substring(txContent.indexOf('{', startIdx));
let summary;
try {
  summary = eval('(' + jsonStr + ')');
} catch (e) {
}

const unam = summary['동탄역시범우남퍼스트빌아파트'];
console.log('Unam:', unam?.avg3MPerPyeong, unam?.avg1MPerPyeong, unam?.latestPrice, unam?.latestArea);
