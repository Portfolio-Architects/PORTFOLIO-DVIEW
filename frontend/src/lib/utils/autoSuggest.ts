import { findTxKey, normalizeAptName } from './apartmentMapping';

const LOCATION_PREFIXES = [
  '숲속마을동탄','푸른마을동탄','나루마을동탄',
  '동탄역시범','동탄시범다은마을','동탄시범한빛마을','동탄시범나루마을',
  '시범다은마을','시범한빛마을','시범나루마을','시범',
  '반탄솔빛마을','솔빛마을','예당마을','새강마을',
  '동탄2신도시','동탄신도시','동탄숲속마을','동탄푸른마을','동탄나루마을',
  '동탄호수공원역','동탄호수공원','동탄호수','동탄역',
  '화성동탄2','능동역','호수공원역','동탄2','동탄',
];
const NAME_SUFFIXES = ['역', '2단지', '1단지', '3단지', '4단지', '5단지', '단지'];

export function stripPrefix(n: string) {
  for (const p of LOCATION_PREFIXES) if (n.startsWith(p) && n.length > p.length) return n.slice(p.length);
  return n;
}

export function stripSuffix(n: string) {
  for (const s of NAME_SUFFIXES) if (n.endsWith(s) && n.length > s.length) return n.slice(0, -s.length);
  return n;
}

export function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return dp[m][n];
}

export function autoSuggest<T>(aptName: string, txSummaryData: Record<string, T>): string | null {
  const exactOrHardcoded = findTxKey(aptName, txSummaryData);
  if (exactOrHardcoded) return exactOrHardcoded;

  const norm = normalizeAptName(aptName);
  const keys = Object.keys(txSummaryData);
  if (!norm || norm.length < 2) return null;
  if (keys.includes(norm)) return norm;
  const stripped = stripPrefix(norm);
  if (stripped !== norm && keys.includes(stripped)) return stripped;
  for (const k of keys) if (stripPrefix(k) === stripped) return k;
  const suffixStripped = stripSuffix(norm);
  if (suffixStripped !== norm && keys.includes(suffixStripped)) return suffixStripped;
  for (const k of keys) if (stripSuffix(k) === suffixStripped) return k;
  const bothStripped = stripSuffix(stripped);
  if (bothStripped !== stripped) {
    for (const k of keys) if (stripSuffix(stripPrefix(k)) === bothStripped) return k;
  }
  const containMatches = keys.filter(k => norm.includes(k) || k.includes(norm));
  if (containMatches.length === 1) return containMatches[0];
  if (containMatches.length > 1) {
    containMatches.sort((a, b) => Math.abs(a.length - norm.length) - Math.abs(b.length - norm.length));
    return containMatches[0];
  }
  const threshold = Math.max(2, Math.floor(norm.length * 0.25));
  let bestKey: string | null = null;
  let bestDist = Infinity;
  for (const k of keys) {
    const dist = editDistance(norm, k);
    if (dist < bestDist && dist <= threshold) { bestDist = dist; bestKey = k; }
  }
  return bestKey;
}
