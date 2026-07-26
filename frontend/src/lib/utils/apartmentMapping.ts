/**
 * @module apartmentMapping
 * @description Maps app apartment names (e.g. "[오산동] 힐스테이트 동탄역") 
 * to Google Sheets transaction names (e.g. "힐스테이트동탄역").
 * 
 * 핵심 문제: 앱 보고서 이름과 국토교통부 실거래가 이름이 서로 다름.
 * 해결: 정규화 함수로 양쪽 이름을 통일한 뒤 비교.
 */

import { z } from 'zod';
import { logger } from '@/lib/services/logger';

// Zod validation schemas
export const ManualMappingSchema = z.record(z.string(), z.string());
export const HardcodedMappingSchema = z.record(z.string(), z.string());
export const DisplayNameMappingSchema = z.record(z.string(), z.string());
export const AreaTypeMapSchema = z.record(z.string(), z.record(z.string(), z.string()));

export const IsSameApartmentParamsSchema = z.object({
  reportName: z.string().nullable().optional(),
  txName: z.string().nullable().optional(),
  manualMapping: ManualMappingSchema.optional(),
  reportDong: z.string().nullable().optional(),
  txDong: z.string().nullable().optional(),
});

export const FindTxKeyParamsSchema = z.object({
  aptName: z.string(),
  txMap: z.record(z.string(), z.unknown()),
  manualMapping: ManualMappingSchema.optional(),
  isRetry: z.boolean().optional(),
  aptDongInput: z.string().nullable().optional(),
});

export const GetAreaTypeParamsSchema = z.object({
  aptName: z.string(),
  areaStr: z.string(),
});

export const TypeMapEntrySchema = z.object({
  typeM2: z.string(),
  typePyeong: z.string(),
});
export type TypeMapEntry = z.infer<typeof TypeMapEntrySchema>;

export const FindTypeMapEntryParamsSchema = z.object({
  aptName: z.string(),
  area: z.union([z.string(), z.number()]).transform(val => Number(val) || 0),
});

export const LocationPrefixesSchema = z.array(z.string());
export const LocationSuffixesSchema = z.array(z.string());
export const RomanMapSchema = z.record(z.string(), z.string());

/**
 * 아파트명 정규화: 공백, 대괄호 동명, 특수문자 제거
 * "[오산동] 힐스테이트 동탄역" → "힐스테이트동탄역"
 * "힐스테이트동탄역" → "힐스테이트동탄역"
 */
export function normalizeAptName(name: string | undefined | null): string {
  const parsed = typeof name === 'string' ? name : (z.string().catch('').parse(name) || '');
  if (!parsed) return '';
  return parsed
    .normalize('NFC')                      // 한글 자음/모음 분리 현상 변환 (NFD -> NFC)
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // 눈에 보이지 않는 공백 (Zero-width) 제거
    .replace(/\[.*?\]\s*/g, '')            // [오산동] 제거
    .replace(/\s+/g, '')                   // 공백 제거
    .replace(/[()（）]/g, '')               // 괄호 제거
    .trim();
}

export const HARDCODED_MAPPING: Record<string, string> = {
  '능동숲속마을광명메이루즈': '동탄숲속마을광명메이루즈',
  '능동숲속마을모아미래도1단지': '동탄숲속마을모아미래도1단지',
  '능동숲속마을모아미래도2단지': '동탄숲속마을모아미래도2단지',
  '능동숲속마을자연앤데시앙': '자연앤데시앙',
  '능동푸른마을두산위브': '푸른마을두산위브',
  '능동푸른마을모아미래도': '푸른마을모아미래도',
  '능동푸른마을신일해피트리': '동탄푸른마을신일해피트리',
  '능동푸른마을포스코더샵2차': '포스코더샵2차',
  '능동역경남아너스빌': '동탄숲속마을자연앤경남아너스빌1124-0',
  '능동역센트럴경남아너스빌': '동탄숲속마을자연앤경남아너스빌1115-0',
  '능동역숲속마을리체더포레스트': '동탄숲속마을능동역리체더포레스트',
  '능동역이지더원': '능동마을이지더원',
  '동탄역롯데캐슬알바트로스': '롯데캐슬알바트로스',
  '동탄역시범금강펜테리움센트럴파크Ⅲ': '동탄역시범금강펜테리움센트럴파크3',
  '동탄역시범대원칸타빌': '동탄역시범대원칸타빌아파트',
  '동탄역시범더샵센트럴시티': '더샵센트럴시티',
  '동탄역시범리슈빌': '동탄역시범리슈빌아파트',
  '동탄역시범반도유보라아이비파크4.0': '시범반도유보라아이비파크4.0',
  '동탄역시범예미지': '동탄역시범예미지아파트',
  '동탄역시범우남퍼스트빌': '동탄역시범우남퍼스트빌아파트',
  '동탄역KCC스위첸': 'KCC스위첸아파트',
  '송동린스트라우스더레이크': '동탄린스트라우스더레이크',
  '송동하우스디더레이크': '동탄2하우스디더레이크',
  '동탄역삼정그린코아더베스트': '동탄역삼정그린코아',
  '여울동금강펜테리움센트럴파크': '동탄2신도시금강펜테리움센트럴파크Ⅰ',
  '여울동반도유보라아이비파크3.0': '반도유보라아이비파크3',
  '여울동센트럴힐즈': '화성동탄2센트럴힐즈동탄아파트',
  '장지동금호어울림레이크': '금호어울림레이크',
  '장지동금호어울림레이크2차': '금호어울림레이크2차',
  '장지동아이파크1단지': '동탄2아이파크1단지',
  '장지동아이파크2단지': '동탄2아이파크2단지',
  '장지동제일풍경채에듀앤파크': '제일풍경채에듀앤파크',
  '장지동호반베르디움': '동탄2신도시호반베르디움33단지',
  '신동디에트르포레': '동탄2디에트르포레',
  '목동금강펜테리움센트럴파크4차': '동탄금강펜테리움센트럴파크Ⅳ',
  '목동동원로얄듀크2차': '동탄동원로얄듀크2차',
  '목동르파비스': '르파비스',
  '목동베라체': '동탄2신도시베라체',
  '목동한신더휴': '한신더휴',
  '목동호반베르디움2차': '동탄2신도시호반베르디움22단지',
  '목동호반베르디움센트럴포레': '호반베르디움센트럴포레',
  '목동힐스테이트': '힐스테이트동탄',
  '목동e편한세상': '이편한세상동탄',
  '산척동그린힐반도유보라아이비파크10': '그린힐반도유보라아이비파크101단지',
  '산척동더레이크파크뷰': '더레이크시티부영1단지',
  '산척동더레이크팰리스': '동탄더레이크팰리스',
  '산척동더레이크시티부영2단지': '더레이크시티부영2단지',
  '산척동더샵레이크에듀타운': '동탄더샵레이크에듀타운',
  '산척동레이크힐반도유보라아이비파크10.2': '레이크힐반도유보라아이비파크10.2',
  '산척동서희스타힐스엔에이치에프': '서희스타힐스엔에이치에프',
  '산척동중흥에스클래스에듀하이': '중흥에스클래스에듀하이',
  '호수공원금강펜테리움센트럴파크Ⅱ': '산척동,동탄호수공원금강펜테리움센트럴파크Ⅱ',
  '호수공원역레이크시티': '더레이크시티부영6단지',
  '호수공원역센트리체': '더레이크시티부영5단지',
  '동탄역센트럴자이': '동탄역센트럴자이A-10',
  '동탄역힐스테이트': '힐스테이트동탄역',
  '영천동동원로얄듀크포레4차': '동탄2신도시4차동원로얄듀크포레',
  '영천동파크자이': '동탄파크자이',
  '영천동파크푸르지오': '동탄파크푸르지오',
  '나루마을동탄역유보라여울숲1.0': '동탄나루마을동탄역U.BORA여울숲1.0',
  '나루마을동탄역유보라여울숲2.0': '나루마을월드메르디앙반도유보라',
  '반송동나루마을신도브래뉴': '나루마을신도브래뉴',
  '반송동나루마을한화꿈에그린': '나루마을한화꿈에그린',
  '반송동나루마을한화꿈에그린우림필유': '나루마을한화꿈에그린우림필유',
  '반송동메타폴리스': 'METAPOLIS',
  '반송동센트럴포레스트': '동탄센트럴포레스트',
  '반송동솔빛마을경남아너스빌': '솔빛마을경남아너스빌',
  '반송동솔빛마을서해그랑블': '솔빛마을서해그랑블',
  '반송동솔빛마을신도브래뉴': '솔빛마을신도브래뉴',
  '반송동솔빛마을쌍용예가': '솔빛마을쌍용예가',
  '반송동시범다은마을동탄포스코더샵': '시범다은마을포스코더샵',
  '반송동시범다은마을메타역롯데캐슬': '동탄시범다은마을메타역롯데캐슬',
  '반송동시범다은마을삼성래미안': '시범다은마을삼성래미안',
  '반송동시범다은마을센트럴파크뷰': '동탄시범다은마을센트럴파크뷰',
  '반송동시범다은마을우남퍼스트빌': '시범다은마을우남퍼스트빌',
  '반송동시범다은마을월드메르디앙': '동탄시범다은마을월드메르디앙반도유보라',
  '반송동시범한빛마을금호어울림': '시범한빛마을금호어울림',
  '반송동시범한빛마을삼부르네상스': '시범한빛마을삼부르네상스',
  '반송동시범한빛마을아이파크': '시범한빛마을동탄아이파크',
  '반송동시범한빛마을한화꿈에그린': '시범한빛마을한화꿈에그린',
  '반송동시범한빛마을KCC스위첸': '시범한빛마을케이씨씨스위첸',
  '석우동예당마을롯데캐슬': '롯데캐슬',
  '석우동예당마을신일유토빌': '신일유토빌',
  '석우동예당마을우미린제일풍경채': '우미린제일풍경채',
  '예당마을푸르지오': '푸르지오',
  '그린힐반도유보라아이비파크10.0': '그린힐반도유보라아이비파크101단지',
  '레이크힐반도유보라아이비파크10.0': '레이크힐반도유보라아이비파크10.2',
  '동탄풍성신미주': '동탄역신미주',
  '금호어울림레이크1차': '금호어울림레이크',
  '동탄호수공원금호어울림레이크1차': '금호어울림레이크',
  '동탄역동원로얄듀크비스타': '동탄역동원로얄듀크비스타3차',
};

const DISPLAY_NAME_MAPPING: Record<string, string> = {
  '동탄풍성신미주': '동탄역 신미주',
  '그린힐반도유보라아이비파크101단지': '그린힐 반도유보라 아이비파크 10단지',
  '레이크힐반도유보라아이비파크10.2': '레이크힐 반도유보라 아이비파크 10-2단지',
  '동탄역시범금강펜테리움센트럴파크Ⅲ': '동탄역 시범 금강펜테리움 센트럴파크 3차',
  '동탄역시범금강펜테리움센트럴파크3': '동탄역 시범 금강펜테리움 센트럴파크 3차',
  '호수공원금강펜테리움센트럴파크Ⅱ': '동탄호수공원 금강펜테리움 센트럴파크 2차',
  '목동금강펜테리움센트럴파크4차': '금강펜테리움 센트럴파크 4차',
  '힐스테이트동탄역': '동탄역 힐스테이트',
};

// Validate mapping structures at startup
const validatedHardcoded = HardcodedMappingSchema.safeParse(HARDCODED_MAPPING);
if (!validatedHardcoded.success) {
  logger.error('apartmentMapping', 'HARDCODED_MAPPING static data validation failed', { error: String(validatedHardcoded.error) });
}

const validatedDisplay = DisplayNameMappingSchema.safeParse(DISPLAY_NAME_MAPPING);
if (!validatedDisplay.success) {
  logger.error('apartmentMapping', 'DISPLAY_NAME_MAPPING static data validation failed', { error: String(validatedDisplay.error) });
}

/**
 * UI 화면 표시용 아파트 이름 오버라이드
 * Google Sheets에 이전 이름("동탄풍성신미주")이 있을 경우 현재 이름("동탄역 신미주")으로 변환
 */
export function getDisplayAptName(name: string | undefined | null): string {
  const parsed = typeof name === 'string' ? name : (z.string().catch('').parse(name) || '');
  if (!parsed) return '';
  return DISPLAY_NAME_MAPPING[parsed] || DISPLAY_NAME_MAPPING[normalizeAptName(parsed)] || parsed;
}

/**
 * 두 아파트명이 같은 단지인지 확인 (정확 일치 및 수동/예외 매핑 허용)
 */
export function isSameApartment(
  reportName: string | undefined | null,
  txName: string | undefined | null,
  manualMapping?: Record<string, string>,
  reportDong?: string | null,
  txDong?: string | null
): boolean {
  let rName = reportName;
  let tName = txName;
  let mMapping = manualMapping;
  let rDongInput = reportDong;
  let tDongInput = txDong;

  const isFastPath = (reportName === undefined || reportName === null || typeof reportName === 'string') &&
                     (txName === undefined || txName === null || typeof txName === 'string') &&
                     (!manualMapping || typeof manualMapping === 'object') &&
                     (reportDong === undefined || reportDong === null || typeof reportDong === 'string') &&
                     (txDong === undefined || txDong === null || typeof txDong === 'string');

  if (!isFastPath) {
    const validation = IsSameApartmentParamsSchema.safeParse({ reportName, txName, manualMapping, reportDong, txDong });
    if (!validation.success) {
      logger.warn('apartmentMapping.isSameApartment', 'Parameter validation failed', { error: String(validation.error) });
      return false;
    }
    rName = validation.data.reportName;
    tName = validation.data.txName;
    mMapping = validation.data.manualMapping;
    rDongInput = validation.data.reportDong;
    tDongInput = validation.data.txDong;
  }
  if (!rName || !tName) return false;

  const rDong = rDongInput || extractDong(rName);
  const tDong = tDongInput || extractDong(tName);
  if (rDong && tDong && rDong !== tDong) return false;

  const a = normalizeAptName(rName);
  const b = normalizeAptName(tName);
  if (a === b) return true;

  // 하드코딩 매핑 체크 (양방향)
  if (HARDCODED_MAPPING[a] === b || HARDCODED_MAPPING[b] === a) return true;

  // 심층 정규화 비교 (로마숫자, '차' 등)
  const da = deepNormalize(a);
  const db = deepNormalize(b);
  if (da === db) return true;

  // 위치 접두사 및 접미사 제거 후 비교
  const sa = stripLocationSuffix(stripLocationPrefix(a));
  const sb = stripLocationSuffix(stripLocationPrefix(b));
  if (sa && sb && sa === sb) {
    const isGenericBrand = BRAND_NAMES.has(sa) || BRAND_NAMES.has(sb) || sa.length <= 3 || sb.length <= 3;
    if (!isGenericBrand || (rDong && tDong && rDong === tDong)) {
      return true;
    }
  }

  const dsa = deepNormalize(sa);
  const dsb = deepNormalize(sb);
  if (dsa && dsb && dsa === dsb) {
    const isGenericBrand = BRAND_NAMES.has(dsa) || BRAND_NAMES.has(dsb) || dsa.length <= 3 || dsb.length <= 3;
    if (!isGenericBrand || (rDong && tDong && rDong === tDong)) {
      return true;
    }
  }
  
  // 수동 매핑 체크
  if (mMapping) {
    const mapA = mMapping[rName] || mMapping[a];
    const mapB = mMapping[tName] || mMapping[b];
    if (mapA && mapA === b) return true;
    if (mapB && mapB === a) return true;
    if (mapA && mapB && mapA === mapB) return true;
  }
  
  return false;
}

const BRAND_NAMES = new Set([
  '롯데캐슬', '푸르지오', '자이', '아이파크', 'e편한세상', '이편한세상', '힐스테이트',
  '금강펜테리움', '반도유보라', '호반베르디움', '더샵', '래미안', '호반', '금강', '반도', '한화',
  '포레나', '자이파밀리에', '레이크자이', '우남퍼스트빌', '하우스디', '신미주', '상록', '경남아너스빌',
  '이지더원', '센트럴힐즈', '서해그랑블', '에일린의뜰', '제일풍경채', '디에트르', 'KCC스위첸', '스위첸',
  '자연앤푸르지오', '자연앤', '대원칸타빌', '대원', '풍성신미주', '풍성', '모아미래도', '모아',
  '광명메이루즈', '광명', '동원로얄듀크', '동원', '호반써밋', '써밋', '꿈에그린', '부영', '사랑으로부영',
  '사랑으로', '예미지', '행복주택'
]);

/**
 * 위치 접두사 제거: 국토교통부 실거래 DB와 앱 이름 간의 접두사 차이 해소
 * "동탄역롯데캐슬알바트로스" → "롯데캐슬알바트로스"
 * "동탄2신도시금강펜테리움" → "금강펜테리움"
 * 
 * ⚠️ 긴 접두사가 먼저 오도록 정렬 — 가장 구체적인 것부터 매칭
 */
// 아파트명에서 지역, 역명, 법정동, 마을명 접두사를 제거하기 위한 목록 (가장 긴 패턴부터 내림차순 정렬)
const LOCATION_PREFIXES = [
  // 9글자
  '동탄시범다은마을', '동탄시범한빛마을', '동탄시범나루마을',
  // 8글자
  '동탄호수공원역',
  // 7글자
  '동탄호수공원', '동탄2신도시', '동탄숲속마을', '동탄푸른마을', '동탄나루마을', '반탄솔빛마을',
  // 6글자
  '숲속마을동탄', '푸른마을동탄', '나루마을동탄', '시범다은마을', '시범한빛마을', '시범나루마을', '동탄신도시',
  // 5글자
  '화성동탄2', '호수공원역', '솔빛마을', '예당마을', '새강마을', '동탄역시범', '한빛마을', '다은마을', '나루마을', '숲속마을', '푸른마을',
  // 4글자
  '동탄호수', '동탄역', '능동역', '반송동', '석우동', '청계동', '영천동', '오산동', '산척동', '장지동', '방교동', '금곡동', '여울동', '호수공원',
  // 3글자
  '동탄2', '능동', '신동', '목동', '송동', '시범', '한빛', '다은', '나루', '숲속', '푸른', '예당', '솔빛', '새강', '여울',
  // 2글자
  '동탄',
];

/**
 * 아파트명 접두사(동명, 마을명, 지역명 등)를 반복적으로 제거하여 순수 단지명만 추출합니다.
 * (예: "반송동시범한빛마을KCC스위첸" -> "반송동" 제거 -> "시범한빛마을KCC스위첸" -> "시범한빛마을" 제거 -> "KCC스위첸")
 */
function stripLocationPrefix(normalized: string): string {
  let current = normalized;
  let replaced = true;
  while (replaced) {
    replaced = false;
    for (const prefix of LOCATION_PREFIXES) {
      if (current.startsWith(prefix) && current.length > prefix.length) {
        current = current.slice(prefix.length);
        replaced = true;
        break; // 루프를 다시 처음부터 돌며 또 다른 접두사가 더 있는지 체크
      }
    }
  }
  return current;
}

const LOCATION_SUFFIXES = [
  '동탄2신도시', '동탄신도시', '2신도시', '신도시', '동탄역', '동탄2', '동탄'
];

const validatedPrefixes = LocationPrefixesSchema.safeParse(LOCATION_PREFIXES);
if (!validatedPrefixes.success) {
  logger.error('apartmentMapping', 'LOCATION_PREFIXES static data validation failed', { error: String(validatedPrefixes.error) });
}

const validatedSuffixes = LocationSuffixesSchema.safeParse(LOCATION_SUFFIXES);
if (!validatedSuffixes.success) {
  logger.error('apartmentMapping', 'LOCATION_SUFFIXES static data validation failed', { error: String(validatedSuffixes.error) });
}

function stripLocationSuffix(normalized: string): string {
  let current = normalized;
  let replaced = true;
  while (replaced) {
    replaced = false;
    for (const suffix of LOCATION_SUFFIXES) {
      if (current.endsWith(suffix) && current.length > suffix.length) {
        current = current.slice(0, -suffix.length);
        replaced = true;
        break;
      }
    }
  }
  return current;
}

/**
 * 심층 정규화: 다양한 명칭 차이를 통일
 * - "산척동," 등 TX 키의 동명 콤마 접두사 제거
 * - 로마숫자 → 아라비아 (Ⅳ → 4)
 * - "N차" → "N"
 * - "아파트" 접미사 제거
 * - "N번지" → "N"
 * - 소수점 ".0" 제거 (3.0 → 3)
 */
const ROMAN_MAP: Record<string, string> = {
  'Ⅰ': '1', 'Ⅱ': '2', 'Ⅲ': '3', 'Ⅳ': '4', 'Ⅴ': '5',
  'Ⅵ': '6', 'Ⅶ': '7', 'Ⅷ': '8', 'Ⅸ': '9', 'Ⅹ': '10',
};

const validatedRomanMap = RomanMapSchema.safeParse(ROMAN_MAP);
if (!validatedRomanMap.success) {
  logger.error('apartmentMapping', 'ROMAN_MAP static data validation failed', { error: String(validatedRomanMap.error) });
}

function deepNormalize(name: string): string {
  let result = name;
  // "동명," 접두사 제거 (TX 키에 "산척동,동탄호수공원..." 형태 있음)
  result = result.replace(/^[가-힣]+,/g, '');
  // 로마숫자 → 아라비아숫자
  for (const [roman, arabic] of Object.entries(ROMAN_MAP)) {
    result = result.replace(roman, arabic);
  }
  // "N차" → "N"
  result = result.replace(/(\d+)차/g, '$1');
  // "아파트" 제거
  result = result.replace(/아파트/g, '');
  // "N번지" → "N"
  result = result.replace(/(\d+)번지/g, '$1');
  // ".0" 제거 (3.0 → 3, but keep 10.0 → 10)
  result = result.replace(/\.0(?=$|[^0-9])/g, '');
  // 명칭 통일 (앱 ↔ 실거래DB 표기 차이)
  result = result.replace(/스위콈/g, '스위첸');
  result = result.replace(/케이씨씨/g, 'KCC');
  result = result.replace(/S클래스/g, '에스클래스');
  return result;
}

interface TxKeyInfo {
  originalKey: string;
  normKey: string;
  keyStripped: string;
  keyDeep: string;
  keyDeepAlt: string;
  keyDong: string | null;
}

// WeakMap caches for findTxKey performance optimization
const txMapNormalizedKeysCache = new WeakMap<object, Record<string, string>>();
const txMapInfoCache = new WeakMap<object, TxKeyInfo[]>();
const resolvedTxKeyCache = new WeakMap<object, Map<string, string | null>>();

function getManualMappingKey(manualMapping?: Record<string, string>): string {
  if (!manualMapping) return '';
  const keys = Object.keys(manualMapping).sort();
  return keys.map(k => `${k}:${manualMapping[k]}`).join('|');
}

/**
 * 4단계 캐스케이딩 매칭으로 TX_SUMMARY / TX_RECORDS 키를 찾는 함수
 * 
 * 0단계: 수동 매핑 테이블 (관리자가 Firestore에서 설정)
 * 1단계: 정규화 후 정확 매칭  
 * 2단계: 양쪽 모두 위치 접두사 제거 후 정확 매칭
 * 3단계: 심층 정규화 (로마숫자, 차, 아파트, 번지, 콤마접두사 등) 후 매칭
 * 
 * @returns 매칭된 키 (없으면 null)
 */
function extractDong(name: string): string | null {
  const dongs = ['오산동', '청계동', '영천동', '송동', '목동', '산척동', '장지동', '신동', '반송동', '석우동', '능동', '방교동', '금곡동', '여울동'];
  for (const dong of dongs) {
    if (name.includes(dong)) {
      return dong;
    }
  }

  // 마을 이름 기준 법정동 유추 (Heuristic Mapping)
  if (name.includes('한빛마을') || name.includes('다은마을') || name.includes('나루마을') || name.includes('솔빛마을')) {
    return '반송동';
  }
  if (name.includes('예당마을')) {
    return '석우동';
  }
  if (name.includes('새강마을') || name.includes('숲속마을') || name.includes('푸른마을')) {
    return '능동';
  }

  return null;
}

export function findTxKey<T>(
  aptName: string, 
  txMap: Record<string, T>, 
  manualMapping?: Record<string, string>,
  isRetry = false,
  aptDongInput?: string | null
): string | null {
  let vAptName = aptName;
  let vManualMapping = manualMapping;
  let vIsRetry = isRetry;
  let vAptDongInput = aptDongInput;

  const isFastPath = typeof aptName === 'string' && txMap && typeof txMap === 'object' && (!manualMapping || typeof manualMapping === 'object') && (aptDongInput === undefined || aptDongInput === null || typeof aptDongInput === 'string');

  if (!isFastPath) {
    const validation = FindTxKeyParamsSchema.safeParse({ aptName, txMap, manualMapping, isRetry, aptDongInput });
    if (!validation.success) {
      logger.warn('apartmentMapping.findTxKey', 'Parameter validation failed', { error: String(validation.error) });
      return null;
    }
    vAptName = validation.data.aptName;
    vManualMapping = validation.data.manualMapping;
    vIsRetry = validation.data.isRetry || false;
    vAptDongInput = validation.data.aptDongInput;
  }

  if (!vAptName || !txMap || typeof txMap !== 'object') return null;

  // 1. Get or build normalized txMap keys cache (using original txMap reference for WeakMap caching)
  let normalizedTxMap = txMapNormalizedKeysCache.get(txMap);
  let infoList = txMapInfoCache.get(txMap);

  if (!normalizedTxMap || !infoList) {
    normalizedTxMap = {};
    infoList = [];
    for (const key of Object.keys(txMap)) {
      const normKey = normalizeAptName(key);
      normalizedTxMap[normKey] = key;

      const keyStripped = stripLocationSuffix(stripLocationPrefix(normKey));
      const keyDeep = stripLocationSuffix(stripLocationPrefix(deepNormalize(normKey)));
      const keyDeepAlt = deepNormalize(keyStripped);

      const keyObj = txMap[key] as Record<string, unknown> | undefined | null;
      const keyDong = (keyObj && typeof keyObj === 'object' && typeof keyObj.dong === 'string' && keyObj.dong)
        ? keyObj.dong
        : extractDong(key);

      infoList.push({
        originalKey: key,
        normKey,
        keyStripped,
        keyDeep,
        keyDeepAlt,
        keyDong
      });
    }
    txMapNormalizedKeysCache.set(txMap, normalizedTxMap);
    txMapInfoCache.set(txMap, infoList);
  }

  // 2. Get or build resolved tx keys cache
  let resolvedMap = resolvedTxKeyCache.get(txMap);
  if (!resolvedMap) {
    resolvedMap = new Map<string, string | null>();
    resolvedTxKeyCache.set(txMap, resolvedMap);
  }

  const manualMappingKey = getManualMappingKey(vManualMapping);
  const cacheKey = `${vAptName}\x1E${manualMappingKey}\x1E${vIsRetry}\x1E${vAptDongInput || ''}`;
  if (resolvedMap.has(cacheKey)) {
    return resolvedMap.get(cacheKey) ?? null;
  }

  const norm = normalizeAptName(vAptName);

  // 0.5단계: 하드코딩 매핑
  const hardcoded = HARDCODED_MAPPING[norm];
  if (hardcoded) {
    if (hardcoded in normalizedTxMap) {
      const res = normalizedTxMap[hardcoded];
      resolvedMap.set(cacheKey, res);
      return res;
    }
    if (!vIsRetry) {
      const resolved = findTxKey(hardcoded, txMap, vManualMapping, true, vAptDongInput);
      if (resolved) {
        resolvedMap.set(cacheKey, resolved);
        return resolved;
      }
    }
  }

  // 0단계: 수동 매핑 (최우선)
  if (vManualMapping) {
    let mapped = vManualMapping[vAptName] || vManualMapping[norm];
    if (!mapped) {
      // isSameApartment를 활용한 역방향 매핑 키 탐색 시도
      const matchedKey = Object.keys(vManualMapping).find(k => {
        const mappedTarget = vManualMapping![k];
        const targetObj = txMap[mappedTarget] as Record<string, unknown> | undefined | null;
        const targetDong = (targetObj && typeof targetObj === 'object' && typeof targetObj.dong === 'string' && targetObj.dong)
          ? targetObj.dong
          : undefined;
        return isSameApartment(k, vAptName, vManualMapping, targetDong, vAptDongInput);
      });
      if (matchedKey) {
        mapped = vManualMapping[matchedKey];
      }
    }
    if (mapped && mapped in normalizedTxMap) {
      const res = normalizedTxMap[mapped];
      resolvedMap.set(cacheKey, res);
      return res;
    }
  }

  // 1단계: 정확 매칭
  if (norm in normalizedTxMap) {
    const res = normalizedTxMap[norm];
    resolvedMap.set(cacheKey, res);
    return res;
  }

  // 1.5단계: 단어 순서 반전 매칭 (예: "동탄역 힐스테이트" ↔ "힐스테이트동탄역")
  const tokens = vAptName.trim().split(/\s+/);
  if (tokens.length >= 2) {
    for (let i = 0; i < tokens.length; i++) {
      for (let j = 0; j < tokens.length; j++) {
        if (i !== j) {
          const revNorm = normalizeAptName(`${tokens[i]}${tokens[j]}`);
          if (revNorm && revNorm in normalizedTxMap) {
            const res = normalizedTxMap[revNorm];
            resolvedMap.set(cacheKey, res);
            return res;
          }
        }
      }
    }
  }

  // 2단계: 접두사 및 접미사 제거 후 매칭
  const stripped = stripLocationSuffix(stripLocationPrefix(norm));
  const aptDong = vAptDongInput || extractDong(vAptName);

  if (stripped !== norm && stripped in normalizedTxMap) {
    const res = normalizedTxMap[stripped];
    const resObj = txMap[res] as Record<string, unknown> | undefined | null;
    const keyDong = (resObj && typeof resObj === 'object' && typeof resObj.dong === 'string' && resObj.dong)
      ? resObj.dong
      : extractDong(res);
    if (!aptDong || !keyDong || aptDong === keyDong) {
      const isGeneric = BRAND_NAMES.has(stripped) || stripped.length <= 3;
      if (!isGeneric || (aptDong && keyDong && aptDong === keyDong)) {
        resolvedMap.set(cacheKey, res);
        return res;
      }
    }
  }

  for (const info of infoList) {
    if (aptDong && info.keyDong && aptDong !== info.keyDong) continue;

    if (info.keyStripped === stripped) {
      const isGeneric = BRAND_NAMES.has(stripped) || stripped.length <= 3;
      if (!isGeneric || (aptDong && info.keyDong && aptDong === info.keyDong)) {
        const res = info.originalKey;
        resolvedMap.set(cacheKey, res);
        return res;
      }
    }
  }

  // 3단계: 심층 정규화
  const deepNorm = deepNormalize(stripped);
  for (const info of infoList) {
    if (aptDong && info.keyDong && aptDong !== info.keyDong) continue;

    if (info.keyDeep === deepNorm || info.keyDeepAlt === deepNorm) {
      const isGeneric = BRAND_NAMES.has(deepNorm) || deepNorm.length <= 3;
      if (!isGeneric || (aptDong && info.keyDong && aptDong === info.keyDong)) {
        const res = info.originalKey;
        resolvedMap.set(cacheKey, res);
        return res;
      }
    }
  }

  resolvedMap.set(cacheKey, null);
  return null;
}

/**
 * 전용면적 → 타입 변환 매핑
 * 아파트별 전용면적을 타입 코드로 변환
 */
const AREA_TYPE_MAP: Record<string, Record<string, string>> = {
  '힐스테이트동탄역': {
    '54.5533': '78A',
    '54.4202': '78B',
    '54.5508': '77C',
    '54.9749': '78D',
  },
  '동탄역힐스테이트': {
    '54.5533': '78A',
    '54.4202': '78B',
    '54.5508': '77C',
    '54.9749': '78D',
  },
};

const validatedAreaTypeMap = AreaTypeMapSchema.safeParse(AREA_TYPE_MAP);
if (!validatedAreaTypeMap.success) {
  logger.error('apartmentMapping', 'AREA_TYPE_MAP static data validation failed', { error: String(validatedAreaTypeMap.error) });
}

/**
 * 전용면적(㎡)을 타입명으로 변환.
 * 매핑이 없으면 null 반환.
 */
export function getAreaType(aptName: string, areaStr: string): string | null {
  let vAptName = aptName;
  let vAreaStr = areaStr;

  const isFastPath = typeof aptName === 'string' && typeof areaStr === 'string';

  if (!isFastPath) {
    const validation = GetAreaTypeParamsSchema.safeParse({ aptName, areaStr });
    if (!validation.success) {
      logger.warn('apartmentMapping.getAreaType', 'Parameter validation failed', { error: String(validation.error) });
      return null;
    }
    vAptName = validation.data.aptName;
    vAreaStr = validation.data.areaStr;
  }

  const normalized = normalizeAptName(vAptName);
  const typeMap = AREA_TYPE_MAP[normalized];
  if (!typeMap) return null;
  return typeMap[vAreaStr] || null;
}

// A module-level cache to avoid repeating findTxKey scans on every transaction lookup
const resolvedAptEntryCache = new Map<string, Record<string, TypeMapEntry> | null>();

/**
 * 4단계 캐스케이딩 매칭과 numeric tolerance를 결합하여
 * 구글 시트 TYPE_MAP에서 아파트 면적에 매칭되는 타입(TypeMapEntry)을 찾는 강인한 헬퍼 함수
 */
export function findTypeMapEntry(
  typeMap: Record<string, Record<string, TypeMapEntry>> | undefined,
  aptName: string,
  area: number
): TypeMapEntry | null {
  let vAptName = aptName;
  let vArea = area;

  const isFastPath = typeof aptName === 'string' && typeof area === 'number';

  if (!isFastPath) {
    const validation = FindTypeMapEntryParamsSchema.safeParse({ aptName, area });
    if (!validation.success) {
      logger.warn('apartmentMapping.findTypeMapEntry', 'Invalid basic parameters', { error: String(validation.error) });
      return null;
    }
    vAptName = validation.data.aptName;
    vArea = validation.data.area;
  }

  if (!typeMap || typeof typeMap !== 'object' || !vAptName || !vArea) return null;

  // Cache lookups using vAptName as key
  let aptEntry = resolvedAptEntryCache.get(vAptName);

  if (aptEntry === undefined) {
    const normApt = normalizeAptName(vAptName);
    let rawEntry = typeMap[normApt] || null;

    if (!rawEntry) {
      // exact match 실패 시 findTxKey와 유사한 캐스케이딩 매칭 수행
      const matchedKey = findTxKey(vAptName, typeMap);
      if (matchedKey) {
        rawEntry = typeMap[matchedKey] || null;
      }
    }

    // Validate retrieved rawEntry using Zod
    if (rawEntry) {
      const entryValidation = z.record(z.string(), TypeMapEntrySchema).safeParse(rawEntry);
      if (entryValidation.success) {
        aptEntry = entryValidation.data;
      } else {
        logger.warn('apartmentMapping.findTypeMapEntry', `Invalid type map entry for ${vAptName}`, { error: String(entryValidation.error) });
        aptEntry = null;
      }
    } else {
      aptEntry = null;
    }
    
    if (aptEntry !== null) {
      resolvedAptEntryCache.set(vAptName, aptEntry);
    }
  }

  if (!aptEntry) return null;

  // 2. 정확 일치 검사
  const exactKey = String(vArea);
  if (aptEntry[exactKey]) return aptEntry[exactKey];

  // 3. 소수점 미세 차이 허용 (0.11 m² 이내의 차이면 동일 타입으로 판정)
  for (const [keyStr, val] of Object.entries(aptEntry)) {
    const keyNum = parseFloat(keyStr);
    if (!isNaN(keyNum) && Math.abs(keyNum - vArea) < 0.11) {
      return val;
    }
  }

  return null;
}
