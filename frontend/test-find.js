const fs = require('fs');
const path = require('path');
const { findTxKey, normalizeAptName } = require('./src/lib/utils/apartmentMapping');
const { TX_SUMMARY } = require('./src/lib/transaction-summary');

const apt = {
  name: "동탄역 시범 한화꿈에그린 프레스티지",
  dong: "청계동",
  txKey: "동탄역 시범한화 꿈에그린 프레스티지"
};

const nameMapping = {
  "동탄역 시범 한화꿈에그린 프레스티지": "동탄역 시범한화 꿈에그린 프레스티지"
};

const rawTxKey = apt.txKey || apt.name;
const txKey = findTxKey(rawTxKey, TX_SUMMARY, nameMapping) || rawTxKey;
const matchedSummary = txKey ? TX_SUMMARY[txKey] : undefined;

console.log('rawTxKey:', rawTxKey);
console.log('txKey:', txKey);
console.log('matchedSummary is defined:', !!matchedSummary);
if (matchedSummary) {
  console.log('avg1MPerPyeong:', matchedSummary.avg1MPerPyeong);
}
