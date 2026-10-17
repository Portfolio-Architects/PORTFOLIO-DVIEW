/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * CommonJS export of normalizer for Node.js scripts
 */
const typeMapDataJson = require('../../public/data/type-map.json');

function normalizeAptName(name) {
  if (name === null || name === undefined) return '';
  const parsed = typeof name === 'string' ? name : String(name || '');
  if (!parsed) return '';

  return parsed
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\[.*?\]\s*/g, '')
    .replace(/\s+/g, '')
    .replace(/[()（）]/g, '')
    .replace(/\.{2,}/g, '')
    .replace(/\.+$/, '')
    .trim();
}

function isCancelledTransaction(t) {
  if (!t || typeof t !== 'object') return false;
  if (t.isCanceled === true) return true;
  if (t.cdealType === 'O' || t.cdealType === '해제') return true;

  const isInvalidDate = (v) => {
    if (v === null || v === undefined) return true;
    const s = String(v).trim().toLowerCase();
    return !s || s === '-' || s === 'null' || s === 'undefined' || s === 'nan';
  };

  if (!isInvalidDate(t.cancelDate)) return true;
  if (!isInvalidDate(t.cdealDay)) return true;
  if (!isInvalidDate(t.cancelDealDay)) return true;

  return false;
}

function generateCanonicalTxKey(tx) {
  if (!tx || typeof tx !== 'object') return '';

  const normApt = normalizeAptName(tx.aptName);
  const rawDate = String(tx.dealDate || '').replace(/\D/g, '');
  const cleanDate = rawDate.padEnd(8, '0').slice(0, 8);
  const numArea = Number(tx.area) || 0;
  const cleanArea = numArea.toFixed(2);
  const cleanFloor = Number(tx.floor) || 0;
  const cleanPrice = Number(tx.price) || 0;
  const rawDealType = typeof tx.dealType === 'string' ? tx.dealType.trim() : '';
  const cleanDealType = (rawDealType === '전세' || rawDealType === '월세') ? rawDealType : '매매';

  return `TX_${normApt}_${cleanDate}_${cleanArea}_${cleanFloor}_${cleanPrice}_${cleanDealType}`;
}

const typeMapLookup = {};
for (const item of typeMapDataJson) {
  if (!item.aptName || !item.area) continue;
  const normApt = normalizeAptName(item.aptName);
  if (!typeMapLookup[normApt]) {
    typeMapLookup[normApt] = {};
  }

  let pyeong = null;
  if (item.typeM2) {
    const match = item.typeM2.match(/\d+(\.\d+)?/);
    if (match) {
      pyeong = Math.round(parseFloat(match[0]) * 0.3025 * 10) / 10;
    }
  }
  if (pyeong === null && item.typePyeong) {
    const match = item.typePyeong.match(/\d+(\.\d+)?/);
    if (match) {
      pyeong = Math.round(parseFloat(match[0]) * 10) / 10;
    }
  }
  if (pyeong !== null) {
    typeMapLookup[normApt][item.area] = pyeong;
  }
}

function getSupplyPyeong(aptName, area) {
  if (!area || isNaN(area)) return 0;

  const normApt = normalizeAptName(aptName);
  const aptEntry = typeMapLookup[normApt] || (aptName ? typeMapLookup[aptName] : undefined);

  if (aptEntry) {
    const exactKey = String(area);
    if (aptEntry[exactKey] !== undefined) {
      return aptEntry[exactKey];
    }

    for (const [keyStr, val] of Object.entries(aptEntry)) {
      const keyNum = parseFloat(keyStr);
      if (!isNaN(keyNum) && Math.abs(keyNum - area) < 0.11) {
        return val;
      }
    }
  }

  return Math.round(area * 0.3025 * 1.33 * 10) / 10;
}

function sanitizeAptKey(name) {
  if (!name) return '';
  const normalized = normalizeAptName(name);

  return normalized
    .replace(/Ⅰ/g, '1')
    .replace(/Ⅱ/g, '2')
    .replace(/Ⅲ/g, '3')
    .replace(/Ⅳ/g, '4')
    .replace(/&/g, '앤')
    .replace(/,/g, '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\.{2,}/g, '')
    .replace(/\.+$/, '')
    .trim();
}

function sanitizeAptChunkFileName(rawFileName) {
  if (!rawFileName) return '';
  const isRecent = rawFileName.endsWith('-recent.json');
  const baseName = isRecent
    ? rawFileName.slice(0, -12)
    : (rawFileName.endsWith('.json') ? rawFileName.slice(0, -5) : rawFileName);

  const cleanBase = normalizeAptName(baseName)
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\.{2,}/g, '')
    .replace(/\.+$/, '')
    .trim();

  return isRecent ? `${cleanBase}-recent.json` : `${cleanBase}.json`;
}

module.exports = {
  normalizeAptName,
  isCancelledTransaction,
  generateCanonicalTxKey,
  getSupplyPyeong,
  sanitizeAptKey,
  sanitizeAptChunkFileName,
};
