import jisanStatusListRaw from '../../../public/data/jisan-status-list.json';

interface MinimalJisanRecord {
  readonly name?: string;
}

function decodeJisanParamSafely(raw: string): string {
  let current = raw.trim();
  for (let i = 0; i < 3; i++) {
    try {
      const next = decodeURIComponent(current);
      if (next === current) break;
      current = next;
    } catch {
      break;
    }
  }
  return current.trim();
}

function normalizeUnicodeRomanNumerals(input: string): string {
  return input
    .replace(/[\u2162\u2172]/g, '3')
    .replace(/[\u2161\u2171]/g, '2')
    .replace(/[\u2160\u2170]/g, '1');
}

function normalizeJisanLookupKey(input: string): string {
  return normalizeUnicodeRomanNumerals(input)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[-_\s]+/g, '');
}

function normalizeJisanPhoneticKey(input: string): string {
  return normalizeUnicodeRomanNumerals(input)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/지식산업센터/g, '')
    .replace(/주식회사|\(주\)/g, '')
    .replace(/타임스퀘어/g, 'timesquare')
    .replace(/스퀘어/g, 'square')
    .replace(/타워/g, 'tower')
    .replace(/센터/g, 'center')
    .replace(/아이티/g, 'it')
    .replace(/쓰리/g, '3')
    .replace(/투$/g, '2')
    .replace(/[^a-z0-9가-힣]/g, '')
    .replace(/iii$/g, '3')
    .replace(/ii$/g, '2')
    .replace(/(square|tower|center)i$/g, '$11');
}

function normalizeJisanCoreAliasKey(input: string): string {
  const phonetic = normalizeJisanPhoneticKey(input);
  if (!phonetic) return '';
  return phonetic
    .replace(/^(?:신동탄|동탄역|동탄2|동탄)/, '')
    .replace(/동탄$/, '')
    .replace(/center$/, '');
}

interface JisanSlugIndex {
  exactMap: Map<string, string>;
  compactMap: Map<string, string>;
  strippedMap: Map<string, string[]>;
  phoneticMap: Map<string, string[]>;
  coreAliasMap: Map<string, string[]>;
}

let cachedIndex: JisanSlugIndex | null = null;

function getJisanSlugIndex(): JisanSlugIndex {
  if (cachedIndex) return cachedIndex;

  const exactMap = new Map<string, string>();
  const compactMap = new Map<string, string>();
  const strippedMap = new Map<string, string[]>();
  const phoneticMap = new Map<string, string[]>();
  const coreAliasMap = new Map<string, string[]>();

  const pushUnique = (map: Map<string, string[]>, key: string, name: string) => {
    if (!key) return;
    const arr = map.get(key);
    if (arr) {
      if (!arr.includes(name)) arr.push(name);
    } else {
      map.set(key, [name]);
    }
  };

  const records = (Array.isArray(jisanStatusListRaw) ? jisanStatusListRaw : []) as MinimalJisanRecord[];
  for (const item of records) {
    const name = typeof item?.name === 'string' ? item.name.trim() : '';
    if (!name) continue;
    if (!exactMap.has(name)) exactMap.set(name, name);

    const compact = normalizeJisanLookupKey(name);
    if (compact && !compactMap.has(compact)) compactMap.set(compact, name);

    const stripped = compact.replace(/지식산업센터$/g, '');
    if (stripped) pushUnique(strippedMap, stripped, name);

    const phonetic = normalizeJisanPhoneticKey(name);
    if (phonetic) pushUnique(phoneticMap, phonetic, name);

    const coreAlias = normalizeJisanCoreAliasKey(name);
    if (coreAlias) {
      pushUnique(coreAliasMap, coreAlias, name);
      if (coreAlias === 'shtimesquare1') {
        pushUnique(coreAliasMap, 'shtimesquare', name);
      } else if (coreAlias === '금강펜테리움ixtower') {
        pushUnique(coreAliasMap, '금강ixtower', name);
      } else if (coreAlias === '메가비즈towera동') {
        pushUnique(coreAliasMap, '메가비즈tower', name);
      } else if (coreAlias === '현대실리콘앨리') {
        pushUnique(coreAliasMap, '실리콘앨리', name);
      } else if (coreAlias === '루체스타비즈') {
        pushUnique(coreAliasMap, '루체스타', name);
      }
    }
  }

  cachedIndex = {
    exactMap,
    compactMap,
    strippedMap,
    phoneticMap,
    coreAliasMap,
  };
  return cachedIndex;
}

/**
 * Pure Edge-safe resolver that maps legacy `/technovalley?jisan=...` query parameters
 * onto the canonical `/technovalley/[slug]` path segment (56 FactoryOn centers).
 * Returns `null` when empty, untrusted, or unmatched.
 */
export function resolveTechnoValleyJisanCanonicalSlug(rawQuery?: string | null): string | null {
  if (!rawQuery || typeof rawQuery !== 'string') return null;
  const trimmed = rawQuery.trim();
  if (!trimmed || trimmed.length > 200) return null;

  const decoded = decodeJisanParamSafely(trimmed);
  if (!decoded) return null;

  const { exactMap, compactMap, strippedMap, phoneticMap, coreAliasMap } = getJisanSlugIndex();
  let matchedName = exactMap.get(decoded) || null;

  if (!matchedName) {
    const qCompact = normalizeJisanLookupKey(decoded);
    if (!qCompact) return null;

    matchedName = compactMap.get(qCompact) || null;
    if (!matchedName) {
      const qStripped = qCompact.replace(/지식산업센터$/g, '');
      if (qStripped.length >= 2) {
        const strippedMatches = strippedMap.get(qStripped);
        if (strippedMatches && strippedMatches.length === 1) {
          matchedName = strippedMatches[0];
        } else {
          const qPhonetic = normalizeJisanPhoneticKey(decoded);
          if (qPhonetic.length >= 2) {
            const phoneticMatches = phoneticMap.get(qPhonetic);
            if (phoneticMatches && phoneticMatches.length === 1) {
              matchedName = phoneticMatches[0];
            }
          }
          if (!matchedName) {
            const qCore = normalizeJisanCoreAliasKey(decoded);
            if (qCore.length >= 3) {
              const coreMatches = coreAliasMap.get(qCore);
              if (coreMatches && coreMatches.length === 1) {
                matchedName = coreMatches[0];
              }
            }
          }
        }
      }
    }
  }

  if (!matchedName) return null;
  return matchedName.trim().replace(/\s+/g, '-');
}
