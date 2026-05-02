const fs = require('fs');

const txContent = fs.readFileSync('frontend/src/lib/transaction-summary.ts', 'utf8');

const startIdx = txContent.indexOf('export const TX_SUMMARY: Record<string, AptTxSummary> = {');
const jsonStr = txContent.substring(txContent.indexOf('{', startIdx));
let summary;
try {
  summary = eval('(' + jsonStr + ')');
} catch (e) {
  console.log("Failed to parse", e.message);
}

console.log("우남:", summary['동탄역시범우남퍼스트빌아파트']?.avg3MPerPyeong);
console.log("더샵:", summary['더샵센트럴시티']?.avg3MPerPyeong);
console.log("롯데:", summary['동탄역롯데캐슬']?.avg3MPerPyeong);
