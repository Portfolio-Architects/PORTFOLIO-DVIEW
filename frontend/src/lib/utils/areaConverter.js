/* eslint-disable @typescript-eslint/no-require-imports */
let typeMapData = [];
try {
  typeMapData = require('../../../public/data/type-map.json');
} catch {
  try {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(process.cwd(), 'public', 'data', 'type-map.json');
    if (fs.existsSync(filePath)) {
      typeMapData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch {
    // ignore
  }
}

function normalizeAptName(name) {
  if (!name) return '';
  return String(name)
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\[.*?\]\s*/g, '')
    .replace(/\s+/g, '')
    .replace(/[()（）]/g, '')
    .trim();
}

// Internal lookup map: normalized aptName -> { [areaStr]: supplyPyeong }
const typeMapLookup = {};

for (const item of typeMapData) {
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

/**
 * Calculates or looks up the supply pyeong (공급평형) for a given apartment and exclusive area.
 * 
 * 1. Exact match by aptName & area in type-map.json
 * 2. Fallback tolerance match (< 0.11 m²) in type-map.json
 * 3. Formula fallback: Math.round(area * 0.3025 * 1.33 * 10) / 10
 */
function getSupplyPyeong(aptName, area) {
  if (!area || isNaN(area)) return 0;
  
  const normApt = normalizeAptName(aptName);
  const aptEntry = typeMapLookup[normApt] || (aptName ? typeMapLookup[aptName] : undefined);

  if (aptEntry) {
    // 1. Exact match
    const exactKey = String(area);
    if (aptEntry[exactKey] !== undefined) {
      return aptEntry[exactKey];
    }

    // 2. Tolerance match (< 0.11 m²)
    for (const [keyStr, val] of Object.entries(aptEntry)) {
      const keyNum = parseFloat(keyStr);
      if (!isNaN(keyNum) && Math.abs(keyNum - area) < 0.11) {
        return val;
      }
    }
  }

  // 3. Formula fallback
  return Math.round(area * 0.3025 * 1.33 * 10) / 10;
}

module.exports = {
  getSupplyPyeong,
  default: getSupplyPyeong
};
