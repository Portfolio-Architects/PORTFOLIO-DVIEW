import {
  hasVerboseProseEnding,
  normalizeMicroCopy,
  truncateToCopyBudget,
  VERBOSE_PROSE_ENDING_REGEX,
} from '@/lib/design-system/copyDiet';

export const GUIDE_CATEGORY_SHORT_LABELS: Readonly<Record<string, string>> = {
  '입지 분석 리포트': '입지 분석 리포트',
  '교통망 심층 분석': '교통망 심층 분석',
  '금융·가치평가 리포트': '금융·가치평가',
  '예산별 단지 랭킹': '예산별 단지 랭킹',
  '권역 맞대결 리포트': '권역 맞대결 리포트',
  '학군·초품아 리포트': '학군·초품아 리포트',
  '역세권 대장 비교': '역세권 대장 비교',
  '직주근접 비교 리포트': '직주근접 비교',
  '금융 및 전세 안전 진단': '전세 안전 진단',
  '세제 및 부동산 정책': '세제·정책 분석',
  '금융 및 대출 분석': '금융 및 대출 분석',
  '지식산업센터·기업 이전': '지산·기업 이전',
  '학군 및 보육 인프라': '학군·보육 환경',
  '권역 및 신축 입주 분석': '권역·신축 분석',
  '시장 수급 및 밸류에이션': '수급·밸류에이션',
  '도시계획 및 인프라 호재': '도시계획·호재',
};

export const GUIDE_CARD_TITLE_MAP: Readonly<Record<string, string>> = {
  'dongtan-1-vs-2-comparison': '1동탄 vs 2동탄 실거래가·학군·인프라 비교',
  'gtx-a-tram-rail-network': 'GTX-A 동탄역·트램 1·2호선 노선별 수혜 단지 총정리',
  'stress-dsr-valuation-guide': '2026 스트레스 DSR 40%·실거주 PER 저평가 분석',
  'dongtan-budget-tier-ranking': '동탄 예산별(6억·9억·12억대) 실거래 랭킹·갈아타기',
  'dongtan-lake-vs-station-comparison': '동탄역 vs 동탄호수공원 실거래가·학군·생활권 비교',
  'dongtan-school-zone-top-apartments': '동탄 학군지 TOP 4·초품아 실거래가·학원가 분석',
  'dongtan-station-gbcx-vs-sibeom-comparison': '동탄역 광비콤 vs 청계동 시범 4대장 실거래·학군 비교',
  'dongtan-job-proximity-commuter-comparison': '동탄 직주근접 3대 생활권: 영천·목동·석우능동 비교',
  'dongtan-jeonse-hug-126-safety-manual': '동탄 전세보증보험 126% 룰·권역별 안전 마진 매뉴얼',
  'dongtan-acquisition-property-tax-2026-guide': '동탄 아파트 취득세·재산세·종부세 구간별 세액 분석',
  'dongtan-first-home-policy-loan-comparison': '신생아 특례·보금자리론 vs 주담대·동탄 9억 이하 전략',
  'dongtan-technovalley-corporate-relocation-tax': '동탄테크노밸리 지산 56곳 기업 세제 혜택·배후 단지',
  'dongtan-elementary-cho-pum-a-safety-index': '동탄 초품아 보행 안전 지수·라이딩 제로 단지 TOP',
  'dongtan-new-town-culture-sin-dong-valuation': '동탄2 신주거문화타운(신동) vs 목동 신축 가치 비교',
  'dongtan-indeogwon-line-station-impact-analysis': '동인선 정거장 반경 500m 역세권 수혜 단지·시세 분석',
  'dongtan-pyeong-supply-structure-24-34-40-analysis': '동탄 평형별(59·84·102㎡+) 공급 구조와 대형 프리미엄',
  'dongtan-gyeongbu-underground-park-urban-renewal': '경부고속도로 지하화·상부 공원 연결과 서동탄·동탄역 가치',
  'dongtan-apartments-per-valuation-methodology': '실거주 PER(매매가÷전세가) 기반 동탄 저평가 단지 발굴',
  'dongtan-yeoul-park-medical-welfare-zone-analysis': '동탄 여울공원·대형 병원·오산천 수변 벨트 가치 분석',
  'dongtan-reconstruction-remodeling-1st-new-town-outlook': '1동탄 준공 20년차(반송·능동·석우동) 정비·대지지분 분석',
  'dongtan-station-transfer-hub-gtx-a-samseong-commute-analysis': 'GTX-A 삼성역 무정차 통과 일정·동탄역 4중 환승 비교',
  'seoul-bundang-suwon-relocation-to-dongtan-zone-comparison': '서울·분당·판교·영통 갈아타기 동탄 5대 생활권 매칭',
  'dongtan-middle-high-school-progression-12year-edu-belt-guide': '동탄 중·고교 진학 동선 및 12년 원스톱 학군지 비교',
  'byeongjeom-dome-stadium-hwaseong-court-dongtan-impact': '화성시법원 병점 확정·병점역 돔구장 공모 쟁점 분석',
  'dongtan-bundang-sinbundang-semiconductor-line-5th-rail-plan': '분당선·신분당선 예타 및 5차 철도망 반도체선 총정리',
};

export const GUIDE_CARD_SUMMARY_MAP: Readonly<Record<string, string>> = {
  'dongtan-1-vs-2-comparison': '1동탄 상권·학원가 vs 2동탄 GTX-A·신축 실거래가·전세가율 비교',
  'gtx-a-tram-rail-network': 'GTX-A 수서 20분·삼성 무정차 일정 및 트램 34개 역세권 수혜',
  'stress-dsr-valuation-guide': 'DSR 40% 한도 축소 대비 실거주 PER 저평가 단지 선별 기준',
  'dongtan-budget-tier-ranking': '6억·9억·12억 예산 구간별 실거래 대표 단지·전세가율 랭킹',
  'dongtan-lake-vs-station-comparison': '동탄역 역세권 vs 호수공원 워터프론트 실거래가·학군 맞대결',
  'dongtan-school-zone-top-apartments': '청계·솔빛·에듀타운·목동 4대 학군지 초품아·학원가 실거래 비교',
  'dongtan-station-gbcx-vs-sibeom-comparison': '여울동 광비콤 주상복합 vs 청계동 시범 4대장 시세·학군 비교',
  'dongtan-job-proximity-commuter-comparison': '영천동·목동·석우능동 3대 직주근접 축 실거래가·통근 거리 비교',
  'dongtan-jeonse-hug-126-safety-manual': '공시가 140%×90%(126% 룰) 기반 권역별 전세 안전 마진 점검',
  'dongtan-acquisition-property-tax-2026-guide': '6억~20억 가격대별 취득세율·재산세·종부세 실부담액 구간표',
  'dongtan-first-home-policy-loan-comparison': '신생아 특례·보금자리론 vs 주담대 금리 및 9억 이하 매수 전략',
  'dongtan-technovalley-corporate-relocation-tax': '지산 56곳 기업 이전 취득·재산세 감면 및 영천·청계 배후단지',
  'dongtan-elementary-cho-pum-a-safety-index': '무차도 그린웨이 초품아 보행 안전 지수 및 학원가 도보권 단지',
  'dongtan-new-town-culture-sin-dong-valuation': '신동 신주거문화타운 초기 시세 및 목동·산척동 완성형 단지 비교',
  'dongtan-indeogwon-line-station-impact-analysis': '동인선 정거장 반경 500m 능동·반송·석우동 역세권 수혜 분석',
  'dongtan-pyeong-supply-structure-24-34-40-analysis': '전용 59·84·102㎡+ 평형별 공급 희소성 및 거래 회전율 비교',
  'dongtan-gyeongbu-underground-park-urban-renewal': '경부고속도로 지하화·상부 공원 연결에 따른 동탄역 동서권 통합',
  'dongtan-apartments-per-valuation-methodology': '매매가÷전세가(실거주 PER) 기반 동탄 7대 권역 밸류에이션',
  'dongtan-yeoul-park-medical-welfare-zone-analysis': '여울공원·오산천 수변축과 동탄2 대형 종합병원 유치 파급 효과',
  'dongtan-reconstruction-remodeling-1st-new-town-outlook': '준공 20년차 1동탄 반송·능동·석우동 대지지분·정비 잠재력',
  'dongtan-station-transfer-hub-gtx-a-samseong-commute-analysis': '2027 상반기 무정차·2028 정차 일정 및 동탄역 4중 환승 실거래 비교',
  'seoul-bundang-suwon-relocation-to-dongtan-zone-comparison': '서울·분당·수원 갈아타기 수요자용 동탄 5대 생활권 예산 매칭',
  'dongtan-middle-high-school-progression-12year-edu-belt-guide': '초품아부터 중·고교 진학까지 12년 원스톱 4대 학군 벨트 비교',
  'byeongjeom-dome-stadium-hwaseong-court-dongtan-impact': '화성시법원 2032 개원 확정·병점 돔구장 공모 쟁점과 동탄1 실거래',
  'dongtan-bundang-sinbundang-semiconductor-line-5th-rail-plan': '분당선·신분당선 4차 예타 현황과 12월 5차 철도망 반도체선·JTX 점검',
};

const POTENTIAL_VERBOSE_TAIL_END_REGEX = /(?:니다|세요)\s?[.!]?$/u;
const VERBOSE_PREDICATE_TAIL_REGEX =
  /(?:(?:^|\s)(?:[가-힣]+(?:할|실|될|받을|볼|줄|낼|갈|올)\s?수\s?(?:있습니다|없습니다)|[가-힣]*(?:해|시켜|하여|해서)\s?(?:드립니다|줍니다|봅니다|보세요|있습니다|(?:드리고|주고|보고|하고)\s?(?:있습니다|계십니다))|[가-힣]+(?:하고|되고|보고|주고|드리고)\s?(?:있습니다|계십니다)|[가-힣]+\s+중입니다|중입니다)|(?<![가-힣])[가-힣]*(?:습니다|합니다|드립니다|됩니다|했습니다|있습니다|없습니다|냅니다|봅니다|줍니다|집니다|갑니다|옵니다|바랍니다|하세요|보세요)|입니다)\s?[.!]?$/u;

// O(1)-bounded tail matchers used when an adversarial trailing Hangul word exceeds 160 chars.
const LONG_TOKEN_MULTIWORD_TAIL_REGEX =
  /(?:(?:할|실|될|받을|볼|줄|낼|갈|올)\s?수\s?(?:있습니다|없습니다)|(?:해|시켜|하여|해서)\s?(?:드립니다|줍니다|봅니다|보세요|있습니다|(?:드리고|주고|보고|하고)\s?(?:있습니다|계십니다))|(?:하고|되고|보고|주고|드리고)\s?(?:있습니다|계십니다)|\s+중입니다)$/u;
const LONG_TOKEN_SINGLE_PREDICATE_SUFFIX_REGEX =
  /(?:습니다|합니다|드립니다|됩니다|했습니다|있습니다|없습니다|냅니다|봅니다|줍니다|집니다|갑니다|옵니다|바랍니다|하세요|보세요)$/u;

const DANGLING_CONNECTIVE_TAIL_REGEX =
  /에\s?(?:대해서?|대하여|대한|관해서?|관하여|관해|따라)$/u;
const TONG_WIHAE_CONNECTIVE_REGEX =
  /(?:^|\s|(?<=[을를]))(?:통해|위해)$/u;

const NOUN_ENDING_IN_EUL_REGEX = /(?:마을|가을|노을|겨울|거울|저울|고을)$/u;
const NOUN_ENDING_IN_EUN_NEUN_REGEX = /(?:보은|사은|시은|가은|다은)$/u;
const MEANINGFUL_SUMMARY_TEXT_REGEX = /[가-힣A-Za-z0-9]/u;
const EDGE_PUNCTUATION_CHARS = new Set([
  '·',
  ',',
  '|',
  '/',
  '\\',
  '-',
  ':',
  ';',
  '.',
  '~',
]);
const DEFAULT_SUMMARY_FALLBACK = '실거래·입지 핵심 요약';
const PREDICATE_WINDOW_MAX_CHARS = 160;

function isHangulSyllableCode(code: number): boolean {
  return code >= 0xac00 && code <= 0xd7a3;
}

function isWhitespaceChar(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v';
}

function hasPotentialVerboseEnding(text: string): boolean {
  if (text.length < 2) return false;
  const tail = text.length > 8 ? text.slice(-8) : text;
  return POTENTIAL_VERBOSE_TAIL_END_REGEX.test(tail);
}

/**
 * Finds the start index covering at most the last 3 whitespace-separated tokens
 * (including the leading whitespace character when not at index 0 so `(?:^|\s)`
 * and `(?<![가-힣])` boundaries remain identical to full-string matching).
 */
function findTrailingPredicateWindowStart(text: string): number {
  const minIdx = Math.max(0, text.length - PREDICATE_WINDOW_MAX_CHARS);
  let idx = text.length - 1;
  while (idx >= minIdx && isWhitespaceChar(text[idx])) {
    idx -= 1;
  }
  let spacesFound = 0;
  while (idx >= minIdx) {
    if (isWhitespaceChar(text[idx])) {
      spacesFound += 1;
      if (spacesFound === 3) {
        return idx;
      }
      while (idx > minIdx && isWhitespaceChar(text[idx - 1])) {
        idx -= 1;
      }
    }
    idx -= 1;
  }
  return minIdx === 0 ? 0 : -1;
}

function stripLongTrailingPredicateLinear(text: string): string {
  // Trim optional trailing `\s?[.!]?$`
  let coreEnd = text.length;
  if (coreEnd > 0 && (text[coreEnd - 1] === '.' || text[coreEnd - 1] === '!')) {
    coreEnd -= 1;
  }
  if (coreEnd > 0 && isWhitespaceChar(text[coreEnd - 1])) {
    coreEnd -= 1;
  }
  if (coreEnd < 2) return text;

  const coreTailStart = Math.max(0, coreEnd - 40);
  const coreTail = text.slice(coreTailStart, coreEnd);

  // 1. Multi-word predicate (`[가-힣]+할 수 있습니다`, `[가-힣]*해 드리고 있습니다`, `[가-힣]+ 중입니다`, `중입니다`)
  const multiMatch = LONG_TOKEN_MULTIWORD_TAIL_REGEX.exec(coreTail);
  if (multiMatch) {
    const stemEnd = coreTailStart + multiMatch.index;
    let stemStart = stemEnd;
    while (stemStart > 0 && isHangulSyllableCode(text.charCodeAt(stemStart - 1))) {
      stemStart -= 1;
    }
    const requiresStem = !/^(?:해|시켜|하여|해서)/u.test(multiMatch[0]);
    const hasValidStem = !requiresStem || stemStart < stemEnd;
    if (hasValidStem) {
      if (stemStart === 0) {
        return '';
      }
      if (isWhitespaceChar(text[stemStart - 1])) {
        return text.slice(0, stemStart - 1);
      }
    }
  }
  if (
    coreTail.endsWith('중입니다') &&
    (coreEnd === 4 || isWhitespaceChar(text[coreEnd - 5]))
  ) {
    return coreEnd === 4 ? '' : text.slice(0, coreEnd - 5);
  }

  // 2. Single-word Hangul predicate (`(?<![가-힣])[가-힣]*(?:습니다|합니다|...)`)
  const singleMatch = LONG_TOKEN_SINGLE_PREDICATE_SUFFIX_REGEX.exec(coreTail);
  if (singleMatch) {
    const suffixStart = coreTailStart + singleMatch.index;
    let wordStart = suffixStart;
    while (wordStart > 0 && isHangulSyllableCode(text.charCodeAt(wordStart - 1))) {
      wordStart -= 1;
    }
    return text.slice(0, wordStart);
  }

  // 3. Literal `입니다`
  if (coreTail.endsWith('입니다')) {
    return text.slice(0, coreEnd - 3);
  }

  return text;
}

function stripVerbosePredicateOnce(text: string): string {
  if (!hasPotentialVerboseEnding(text)) {
    return text;
  }

  // Step 1: VERBOSE_PROSE_ENDING_REGEX (max match length <= 13 chars on normalized text)
  const proseStart = Math.max(0, text.length - 32);
  const proseTail = text.slice(proseStart);
  const proseReplaced = proseTail.replace(VERBOSE_PROSE_ENDING_REGEX, '');
  const afterProse =
    proseReplaced !== proseTail ? text.slice(0, proseStart) + proseReplaced : text;

  if (!hasPotentialVerboseEnding(afterProse)) {
    return afterProse;
  }

  // Step 2: VERBOSE_PREDICATE_TAIL_REGEX on bounded trailing window (<= 160 chars)
  // or linear single-pass fallback for adversarial multi-thousand-char tokens.
  const windowStart = findTrailingPredicateWindowStart(afterProse);
  if (windowStart >= 0) {
    const windowTail = afterProse.slice(windowStart);
    const replaced = windowTail.replace(VERBOSE_PREDICATE_TAIL_REGEX, '');
    return replaced !== windowTail ? afterProse.slice(0, windowStart) + replaced : afterProse;
  }

  return stripLongTrailingPredicateLinear(afterProse);
}

function hasVerbosePredicateTail(text: string): boolean {
  if (!hasPotentialVerboseEnding(text)) {
    return false;
  }
  return stripVerbosePredicateOnce(text) !== text;
}

function stripDanglingConnectiveOnce(text: string): string {
  const tailStart = Math.max(0, text.length - 24);
  const tail = text.slice(tailStart);
  const replaced = tail
    .replace(DANGLING_CONNECTIVE_TAIL_REGEX, '')
    .replace(TONG_WIHAE_CONNECTIVE_REGEX, '');
  return replaced !== tail ? text.slice(0, tailStart) + replaced : text;
}

function trimSummaryEdges(text: string): string {
  let start = 0;
  let end = text.length;
  while (
    start < end &&
    (text[start].trim() === '' || EDGE_PUNCTUATION_CHARS.has(text[start]))
  ) {
    start += 1;
  }
  while (
    end > start &&
    (text[end - 1].trim() === '' || EDGE_PUNCTUATION_CHARS.has(text[end - 1]))
  ) {
    end -= 1;
  }
  return text.slice(start, end);
}

function hasMeaningfulSummaryText(text: string): boolean {
  return MEANINGFUL_SUMMARY_TEXT_REGEX.test(text);
}

export function getCompactGuideCategory(category: string): string {
  const shortLabel = GUIDE_CATEGORY_SHORT_LABELS[category] ?? category;
  return truncateToCopyBudget(shortLabel, 'signalBadge');
}

export function getGuideCardTitle(slug: string, fallbackTitle: string): string {
  return GUIDE_CARD_TITLE_MAP[slug] ?? fallbackTitle;
}

export function getGuideCardSummary(
  slug: string,
  subtitle: string,
  description: string,
  fallbackLabel = DEFAULT_SUMMARY_FALLBACK
): string {
  const curated = GUIDE_CARD_SUMMARY_MAP[slug];
  if (curated) {
    return truncateToCopyBudget(curated, 'cardDescription');
  }

  const normalizedSubtitle = trimSummaryEdges(normalizeMicroCopy(subtitle));
  let raw = '';
  if (hasMeaningfulSummaryText(normalizedSubtitle)) {
    raw = normalizedSubtitle;
  } else {
    const normalizedDescription = trimSummaryEdges(normalizeMicroCopy(description));
    if (hasMeaningfulSummaryText(normalizedDescription)) {
      raw = normalizedDescription;
    }
  }
  let current = raw;
  let strippedPredicate = false;

  for (let pass = 0; pass < 3 && current.length > 0; pass += 1) {
    const next = trimSummaryEdges(stripVerbosePredicateOnce(current));
    if (next === current) {
      break;
    }
    current = next;
    strippedPredicate = true;
  }

  if (strippedPredicate) {
    current = trimSummaryEdges(current);
    for (let pass = 0; pass < 3 && current.length > 0; pass += 1) {
      const next = trimSummaryEdges(stripDanglingConnectiveOnce(current));
      if (next === current) {
        break;
      }
      current = next;
    }
    const tailCheck = current.length > 16 ? current.slice(-16) : current;
    if (/[가-힣0-9A-Za-z%㎡)\]]를$/u.test(tailCheck)) {
      current = current.slice(0, -1).trim();
    } else if (
      /[가-힣0-9A-Za-z%㎡)\]]을$/u.test(tailCheck) &&
      !NOUN_ENDING_IN_EUL_REGEX.test(tailCheck)
    ) {
      current = current.slice(0, -1).trim();
    } else if (
      /[가-힣0-9A-Za-z%㎡)\]](?:은|는)$/u.test(tailCheck) &&
      !NOUN_ENDING_IN_EUN_NEUN_REGEX.test(tailCheck)
    ) {
      current = current.slice(0, -1).trim();
    }
    current = trimSummaryEdges(current);
  }

  const normalizedFallback = trimSummaryEdges(normalizeMicroCopy(fallbackLabel));
  const fallbackTail =
    normalizedFallback.length > 64 ? normalizedFallback.slice(-64) : normalizedFallback;
  const resolvedFallback =
    hasMeaningfulSummaryText(normalizedFallback) &&
    !hasVerboseProseEnding(fallbackTail) &&
    !hasVerbosePredicateTail(normalizedFallback)
      ? normalizedFallback
      : DEFAULT_SUMMARY_FALLBACK;
  const currentTail = current.length > 64 ? current.slice(-64) : current;
  const safeText =
    hasMeaningfulSummaryText(current) &&
    !hasVerboseProseEnding(currentTail) &&
    !hasVerbosePredicateTail(current)
      ? current
      : resolvedFallback;

  return truncateToCopyBudget(safeText, 'cardDescription');
}
