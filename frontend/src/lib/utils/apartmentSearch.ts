import { getDisplayAptName, HARDCODED_MAPPING } from './apartmentMapping';

export interface SearchableApartmentTarget {
  name: string;
  displayName?: string;
  dong?: string;
  txKey?: string;
  extraTerms?: string[];
}

export interface HighlightSegment {
  text: string;
  highlighted: boolean;
}

const CHOSUNG_LIST = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ',
  'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const;

const COMPOUND_PREFIXES = [
  '동탄2신도시',
  '동탄신도시',
  '동탄호수공원',
  '호수공원역',
  '시범한빛마을',
  '시범다은마을',
  '동탄호수',
  '호수공원',
  '동탄역',
  '능동역',
  '동탄2',
  '동탄',
  '시범',
  '청계동',
  '여울동',
  '오산동',
  '영천동',
  '반송동',
  '산척동',
  '장지동',
  '석우동',
  '목동',
  '신동',
  '송동',
  '능동',
] as const;

function isChosungJamo(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return code >= 0x3131 && code <= 0x314e;
}

export function getChosungOfChar(ch: string): string {
  if (!ch) return '';
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    return CHOSUNG_LIST[Math.floor((code - 0xac00) / 588)];
  }
  return ch.toLowerCase();
}

export function extractChosung(text: string | undefined | null): string {
  if (!text) return '';
  const cleaned = text
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\s()（）\[\],·-]+/g, '');
  let out = '';
  for (let i = 0; i < cleaned.length; i++) {
    out += getChosungOfChar(cleaned[i]);
  }
  return out;
}

export function foldSearchText(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\[.*?\]\s*/g, '')
    .replace(/Ⅰ/g, '1')
    .replace(/Ⅱ/g, '2')
    .replace(/Ⅲ/g, '3')
    .replace(/Ⅳ/g, '4')
    .replace(/(^|[\s가-힣])iv(?=\s|$|차|단지)/gi, '$14')
    .replace(/(^|[\s가-힣])iii(?=\s|$|차|단지)/gi, '$13')
    .replace(/(^|[\s가-힣])ii(?=\s|$|차|단지)/gi, '$12')
    .replace(/&/g, '앤')
    .replace(/u\.?bora/gi, '유보라')
    .replace(/e편한/gi, '이편한')
    .replace(/엘에이치/g, 'lh')
    .replace(/케이씨씨/g, 'kcc')
    .replace(/에스클래스/g, 's클래스')
    .replace(/the\s*lake/gi, '더레이크')
    .replace(/metapolis/gi, '메타폴리스')
    .replace(/[\s()（）\[\],·-]+/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/\.+$/, '')
    .trim();
}

// Build bidirectional alias lookup graph once from HARDCODED_MAPPING
const ALIAS_GRAPH = new Map<string, Set<string>>();
for (const [alias, canonical] of Object.entries(HARDCODED_MAPPING)) {
  const fa = foldSearchText(alias);
  const fc = foldSearchText(canonical);
  if (!fa || !fc || fa === fc) continue;
  if (!ALIAS_GRAPH.has(fa)) ALIAS_GRAPH.set(fa, new Set());
  if (!ALIAS_GRAPH.has(fc)) ALIAS_GRAPH.set(fc, new Set());
  ALIAS_GRAPH.get(fa)!.add(fc);
  ALIAS_GRAPH.get(fc)!.add(fa);
}

function getLinkedAliases(foldedNames: string[]): string[] {
  const aliases = new Set<string>();
  for (const name of foldedNames) {
    if (!name) continue;
    const linked = ALIAS_GRAPH.get(name);
    if (linked) {
      linked.forEach((a) => aliases.add(a));
    }
  }
  return Array.from(aliases);
}

/**
 * Character-level substring matcher supporting full Hangul syllables,
 * pure chosung queries ("ㅎㅅㅌㅇㅌ"), and live Korean IME trailing jamo ("힐ㅅ").
 */
export function findTokenMatchIndex(foldedTarget: string, foldedToken: string): number {
  if (!foldedTarget || !foldedToken) return -1;
  if (foldedToken.length > foldedTarget.length) return -1;

  if (!/[ㄱ-ㅎ]/.test(foldedToken)) {
    return foldedTarget.indexOf(foldedToken);
  }

  const maxStart = foldedTarget.length - foldedToken.length;
  for (let i = 0; i <= maxStart; i++) {
    let ok = true;
    for (let j = 0; j < foldedToken.length; j++) {
      const qCh = foldedToken[j];
      const tCh = foldedTarget[i + j];
      if (isChosungJamo(qCh)) {
        if (getChosungOfChar(tCh) !== qCh) {
          ok = false;
          break;
        }
      } else if (tCh !== qCh) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }
  return -1;
}

function expandHistoricalDongTerms(dong: string | undefined): string[] {
  if (!dong) return [];
  const folded = foldSearchText(dong);
  if (!folded) return [];
  if (folded === '여울동') return ['여울동', '오산동'];
  if (folded === '오산동') return ['오산동', '여울동'];
  return [folded];
}

function splitCompoundQuery(foldedQuery: string): [string, string] | null {
  for (const prefix of COMPOUND_PREFIXES) {
    const foldedPrefix = foldSearchText(prefix);
    if (
      foldedQuery.startsWith(foldedPrefix) &&
      foldedQuery.length > foldedPrefix.length
    ) {
      const rest = foldedQuery.slice(foldedPrefix.length);
      if (rest.length >= 1) {
        return [foldedPrefix, rest];
      }
    }
  }
  return null;
}

export function scoreApartmentMatch(
  target: SearchableApartmentTarget,
  rawQuery: string
): number {
  const trimmed = rawQuery?.trim();
  if (!trimmed) return 0;

  const displayName = target.displayName || getDisplayAptName(target.name);
  const foldedDisplay = foldSearchText(displayName);
  const foldedRaw = foldSearchText(target.name);
  const foldedTxKey = foldSearchText(target.txKey);
  const dongTerms = expandHistoricalDongTerms(target.dong);
  const extraFolded = (target.extraTerms || []).map(foldSearchText).filter(Boolean);
  const aliases = getLinkedAliases([foldedDisplay, foldedRaw, foldedTxKey]);

  const primaryNameFields = [foldedDisplay, foldedRaw].filter(Boolean);
  const allSearchFields = [
    ...primaryNameFields,
    foldedTxKey,
    ...dongTerms,
    ...aliases,
    ...extraFolded,
  ].filter(Boolean);

  if (allSearchFields.length === 0) return 0;

  const fullFoldedQuery = foldSearchText(trimmed);
  if (!fullFoldedQuery) return 0;

  const hasChosungInFull = /[ㄱ-ㅎ]/.test(fullFoldedQuery);

  // 1. Exact / Contiguous match on display or raw name
  if (!hasChosungInFull) {
    if (foldedDisplay === fullFoldedQuery) return 1000;
    if (foldedRaw === fullFoldedQuery || foldedTxKey === fullFoldedQuery) return 950;
    if (aliases.includes(fullFoldedQuery)) return 920;

    if (foldedDisplay.startsWith(fullFoldedQuery)) {
      return 850 - Math.min(40, Math.max(0, foldedDisplay.length - fullFoldedQuery.length));
    }
    if (foldedRaw.startsWith(fullFoldedQuery)) {
      return 810 - Math.min(40, Math.max(0, foldedRaw.length - fullFoldedQuery.length));
    }

    const displayIdx = foldedDisplay.indexOf(fullFoldedQuery);
    if (displayIdx > 0) {
      return 740 - Math.min(40, displayIdx);
    }
    if (foldedRaw.includes(fullFoldedQuery)) return 700;
    if (foldedTxKey && foldedTxKey.includes(fullFoldedQuery)) return 660;
    if (aliases.some((a) => a.includes(fullFoldedQuery))) return 650;
    if (dongTerms.some((d) => d === fullFoldedQuery)) return 460;
    if (dongTerms.some((d) => d.includes(fullFoldedQuery))) return 420;
  } else {
    // Single contiguous chosung / IME match on display or raw name
    const chosungDisplayIdx = findTokenMatchIndex(foldedDisplay, fullFoldedQuery);
    if (chosungDisplayIdx === 0) {
      return foldedDisplay.length === fullFoldedQuery.length ? 560 : 520;
    }
    if (chosungDisplayIdx > 0) return 480;
    if (findTokenMatchIndex(foldedRaw, fullFoldedQuery) >= 0) return 460;
    if (aliases.some((a) => findTokenMatchIndex(a, fullFoldedQuery) >= 0)) return 440;
  }

  // 2. Multi-token order-independent match (e.g. "동탄역 힐스테이트", "동탄역 우남", "동탄역 ㄹㄷㅋㅅ")
  const rawTokens = trimmed.split(/\s+/).map(foldSearchText).filter(Boolean);
  if (rawTokens.length > 1) {
    let allMatchedInDisplay = true;
    let anyChosungToken = false;

    for (const token of rawTokens) {
      if (/[ㄱ-ㅎ]/.test(token)) anyChosungToken = true;
      const matchedInDisplay = findTokenMatchIndex(foldedDisplay, token) >= 0;
      if (!matchedInDisplay) {
        allMatchedInDisplay = false;
      }
      const matchedAnywhere =
        matchedInDisplay ||
        allSearchFields.some((field) => findTokenMatchIndex(field, token) >= 0);
      if (!matchedAnywhere) {
        return 0;
      }
    }

    if (allMatchedInDisplay) {
      const lengthPenalty = Math.min(40, Math.max(0, foldedDisplay.length - fullFoldedQuery.length));
      return (anyChosungToken ? 500 : 640) - lengthPenalty;
    }
    return anyChosungToken ? 430 : 560;
  }

  // 3. Compound no-space reversed/abbreviated query fallback (e.g. "동탄역우남", "시범더샵")
  const compoundTokens = splitCompoundQuery(fullFoldedQuery);
  if (compoundTokens) {
    const [prefixToken, restToken] = compoundTokens;
    const prefixMatched = allSearchFields.some((f) => findTokenMatchIndex(f, prefixToken) >= 0);
    const restMatched = allSearchFields.some((f) => findTokenMatchIndex(f, restToken) >= 0);
    if (prefixMatched && restMatched) {
      const bothInDisplay =
        findTokenMatchIndex(foldedDisplay, prefixToken) >= 0 &&
        findTokenMatchIndex(foldedDisplay, restToken) >= 0;
      return bothInDisplay ? 590 : 530;
    }
  }

  // 4. Extra terms fallback (e.g. tags, MBTI code)
  if (extraFolded.some((term) => findTokenMatchIndex(term, fullFoldedQuery) >= 0)) {
    return 380;
  }

  return 0;
}

export function matchesApartmentSearch(
  target: SearchableApartmentTarget,
  rawQuery: string
): boolean {
  const trimmed = rawQuery?.trim();
  if (!trimmed) return true;
  return scoreApartmentMatch(target, trimmed) > 0;
}

export function filterAndRankApartments<T>(
  items: readonly T[],
  rawQuery: string,
  toTarget: (item: T) => SearchableApartmentTarget = (item) =>
    item as unknown as SearchableApartmentTarget
): T[] {
  const trimmed = rawQuery?.trim();
  if (!trimmed) return [...items];

  const scored: Array<{ item: T; score: number; displayName: string }> = [];
  for (const item of items) {
    const target = toTarget(item);
    const score = scoreApartmentMatch(target, trimmed);
    if (score > 0) {
      scored.push({
        item,
        score,
        displayName: target.displayName || getDisplayAptName(target.name),
      });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.displayName.length !== b.displayName.length) {
      return a.displayName.length - b.displayName.length;
    }
    return a.displayName.localeCompare(b.displayName, 'ko');
  });

  return scored.map((entry) => entry.item);
}

/**
 * Splits `displayText` into highlighted/unhighlighted segments for safe React rendering.
 * Preserves 100% of original characters and spacing in `displayText`.
 */
export function getHighlightSegments(
  displayText: string,
  rawQuery: string
): HighlightSegment[] {
  if (!displayText) return [];
  const trimmed = rawQuery?.trim();
  if (!trimmed) return [{ text: displayText, highlighted: false }];

  // Build non-whitespace character map back to original string indices
  const nonSpaceChars: Array<{ origIdx: number; foldedChar: string }> = [];
  for (let i = 0; i < displayText.length; i++) {
    const ch = displayText[i];
    if (/\s/.test(ch)) continue;
    let foldedChar = ch.normalize('NFC').toLowerCase();
    if (foldedChar === '&') foldedChar = '앤';
    else if (foldedChar === 'ⅰ') foldedChar = '1';
    else if (foldedChar === 'ⅱ') foldedChar = '2';
    else if (foldedChar === 'ⅲ') foldedChar = '3';
    else if (foldedChar === 'ⅳ') foldedChar = '4';
    else if (
      foldedChar === 'e' &&
      displayText.slice(i + 1, i + 3) === '편한'
    ) {
      foldedChar = '이';
    }
    nonSpaceChars.push({ origIdx: i, foldedChar });
  }

  if (nonSpaceChars.length === 0) {
    return [{ text: displayText, highlighted: false }];
  }

  const compactFolded = nonSpaceChars.map((c) => c.foldedChar).join('');
  const mask = new Array<boolean>(displayText.length).fill(false);

  let tokens = trimmed.split(/\s+/).map(foldSearchText).filter(Boolean);
  if (tokens.length === 1 && findTokenMatchIndex(compactFolded, tokens[0]) < 0) {
    const compound = splitCompoundQuery(tokens[0]);
    if (compound) {
      tokens = [compound[0], compound[1]];
    }
  }

  for (const token of tokens) {
    if (!token) continue;
    const matchStart = findTokenMatchIndex(compactFolded, token);
    if (matchStart >= 0) {
      const origStart = nonSpaceChars[matchStart].origIdx;
      const origEnd = nonSpaceChars[matchStart + token.length - 1].origIdx;
      for (let idx = origStart; idx <= origEnd; idx++) {
        mask[idx] = true;
      }
    }
  }

  if (!mask.some(Boolean)) {
    return [{ text: displayText, highlighted: false }];
  }

  const segments: HighlightSegment[] = [];
  let currentHighlighted = mask[0];
  let currentStart = 0;

  for (let i = 1; i < displayText.length; i++) {
    if (mask[i] !== currentHighlighted) {
      segments.push({
        text: displayText.slice(currentStart, i),
        highlighted: currentHighlighted,
      });
      currentHighlighted = mask[i];
      currentStart = i;
    }
  }
  segments.push({
    text: displayText.slice(currentStart),
    highlighted: currentHighlighted,
  });

  return segments;
}
