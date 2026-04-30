const tx = require('./src/lib/transaction-summary');
const keys = Object.keys(tx.TX_SUMMARY);
const hanhwa = keys.filter(k => k.includes('한화'));
console.log('한화:', hanhwa);
console.log('프레스티지:', keys.filter(k => k.includes('프레스티지')));
console.log('동탄역시범한화꿈에그린프레스티지 in keys?', keys.includes('동탄역시범한화꿈에그린프레스티지'));
