import { FULL_DONG_DATA } from '../frontend/src/lib/dong-apartments';
import { TX_SUMMARY } from '../frontend/src/lib/transaction-summary';
import { findTxKey } from '../frontend/src/lib/utils/apartmentMapping';

function autoSuggest(aptName: string): string | null {
  return findTxKey(aptName, TX_SUMMARY) || null;
}

let mapped = 0, unmapped = 0;
for (const [dong, apts] of Object.entries(FULL_DONG_DATA)) {
  for (const name of apts) {
    const txKey = autoSuggest(name);
    if (txKey && TX_SUMMARY[txKey]) {
      mapped++;
    } else {
      unmapped++;
      console.log(`Unmapped in UI logic: ${name} (suggested: ${txKey})`);
    }
  }
}
console.log(`Total: ${mapped + unmapped}, Mapped: ${mapped}, Unmapped: ${unmapped}`);
