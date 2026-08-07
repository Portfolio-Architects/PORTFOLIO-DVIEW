// @ts-ignore
const areaConverterJs = require('./areaConverter.js');

/**
 * Calculates or looks up the supply pyeong (공급평형) for a given apartment and exclusive area.
 * 
 * 1. Exact match by aptName & area in type-map.json
 * 2. Fallback tolerance match (< 0.11 m²) in type-map.json
 * 3. Formula fallback: Math.round(area * 0.3025 * 1.33 * 10) / 10
 */
export function getSupplyPyeong(aptName: string, area: number): number {
  return areaConverterJs.getSupplyPyeong(aptName, area);
}

export default getSupplyPyeong;

