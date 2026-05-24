
const { TX_SUMMARY } = require('../src/lib/transaction-summary');
const keys = Object.keys(TX_SUMMARY);
const matches = keys.filter(k => k.includes('힐스테이트'));
console.log("Matches found:", matches);
