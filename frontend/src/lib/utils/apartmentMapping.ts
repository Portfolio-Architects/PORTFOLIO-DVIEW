/**
 * @module apartmentMapping
 * @description Maps app apartment names (e.g. "[오산동] 힐스테이트 동탄역") 
 * to Google Sheets transaction names (e.g. "힐스테이트동탄역").
 * 
 * 핵심 문제: 앱 보고서 이름과 국토교통부 실거래가 이름이 서로 다름.
 * 해결: 정규화 함수로 양쪽 이름을 통일한 뒤 비교.
 */

/**
 * 아파트명 정규화: 공백, 대괄호 동명, 특수문자 제거
 * "[오산동] 힐스테이트 동탄역" → "힐스테이트동탄역"
 * "힐스테이트동탄역" → "힐스테이트동탄역"
 */
export function normalizeAptName(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFC')                      // 한글 자음/모음 분리 현상 변환 (NFD -> NFC)
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // 눈에 보이지 않는 공백 (Zero-width) 제거
    .replace(/\[.*?\]\s*/g, '')            // [오산동] 제거
    .replace(/\s+/g, '')                   // 공백 제거
    .replace(/[()（）]/g, '')               // 괄호 제거
    .trim();
}

export const HARDCODED_MAPPING: Record<string, string> = {
  '그린힐반도유보라아이비파크10.0': '그린힐반도유보라아이비파크101단지',
  '레이크힐반도유보라아이비파크10.0': '레이크힐반도유보라아이비파크10.2',
  '동탄풍성신미주': '동탄역신미주',
  '금호어울림레이크1차': '금호어울림레이크',
  '동탄호수공원금호어울림레이크1차': '금호어울림레이크',
  '능동역센트럴경남아너스빌': '동탄숲속마을자연앤경남아너스빌1115-0',
  '능동역경남아너스빌': '동탄숲속마을자연앤경남아너스빌1124-0',
};

const DISPLAY_NAME_MAPPING: Record<string, string> = {
  '동탄풍성신미주': '동탄역 신미주',
  '그린힐반도유보라아이비파크101단지': '그린힐 반도유보라 아이비파크 10단지',
  '레이크힐반도유보라아이비파크10.2': '레이크힐 반도유보라 아이비파크 10-2단지',
};

/**
 * UI 화면 표시용 아파트 이름 오버라이드
 * Google Sheets에 이전 이름("동탄풍성신미주")이 있을 경우 현재 이름("동탄역 신미주")으로 변환
 */
export function getDisplayAptName(name: string): string {
  if (!name) return '';
  return DISPLAY_NAME_MAPPING[name] || DISPLAY_NAME_MAPPING[normalizeAptName(name)] || name;
}

/**
 * 두 아파트명이 같은 단지인지 확인 (정확 일치 및 수동/예외 매핑 허용)
 */
export function isSameApartment(reportName: string, txName: string, manualMapping?: Record<string, string>): boolean {
  if (!reportName || !txName) return false;
  const a = normalizeAptName(reportName);
  const b = normalizeAptName(txName);
  if (a === b) return true;

  // 하드코딩 매핑 체크 (양방향)
  if (HARDCODED_MAPPING[a] === b || HARDCODED_MAPPING[b] === a) return true;
  
  // 수동 매핑 체크
  if (manualMapping) {
    const mapA = manualMapping[reportName] || manualMapping[a];
    const mapB = manualMapping[txName] || manualMapping[b];
    if (mapA && mapA === b) return true;
    if (mapB && mapB === a) return true;
    if (mapA && mapB && mapA === mapB) return true;
  }
  
  return false;
}

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
  '동탄호수', '동탄역', '능동역', '반송동', '석우동', '청계동', '영천동', '오산동', '산척동', '장지동', '방교동', '금곡동',
  // 3글자
  '동탄2', '능동', '신동', '목동', '송동', '시범', '한빛', '다은', '나루', '숲속', '푸른', '예당', '솔빛', '새강',
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
  return result;
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

export function findTxKey<T>(aptName: string, txMap: Record<string, T>, manualMapping?: Record<string, string>): string | null {
  const norm = normalizeAptName(aptName);

  // 0.5단계: 하드코딩 매핑
  const hardcoded = HARDCODED_MAPPING[norm];
  if (hardcoded && hardcoded in txMap) return hardcoded;

  // 0단계: 수동 매핑 (최우선)
  if (manualMapping) {
    // Check raw first, then normalized
    const mapped = manualMapping[aptName] || manualMapping[norm];
    if (mapped && mapped in txMap) return mapped;
  }

  // 1단계: 정확 매칭
  if (norm in txMap) return norm;

  // 2단계: 접두사 제거 후 매칭
  const stripped = stripLocationPrefix(norm);
  if (stripped !== norm && stripped in txMap) return stripped;

  for (const key of Object.keys(txMap)) {
    if (stripLocationPrefix(key) === stripped) return key;
  }

  // 3단계: 심층 정규화
  const deepNorm = deepNormalize(stripped);
  for (const key of Object.keys(txMap)) {
    // deepNormalize removes '산척동,' BEFORE stripLocationPrefix removes '동탄호수'
    const keyDeep = stripLocationPrefix(deepNormalize(key));
    
    // Fallback: compare exactly what the deepNorm has, 
    // or compare deepNormalize(stripLocationPrefix(key)) just in case.
    if (keyDeep === deepNorm || deepNormalize(stripLocationPrefix(key)) === deepNorm) return key;
  }

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
};

/**
 * 전용면적(㎡)을 타입명으로 변환.
 * 매핑이 없으면 null 반환.
 */
export function getAreaType(aptName: string, areaStr: string): string | null {
  const normalized = normalizeAptName(aptName);
  const typeMap = AREA_TYPE_MAP[normalized];
  if (!typeMap) return null;
  return typeMap[areaStr] || null;
}

export interface TypeMapEntry {
  typeM2: string;
  typePyeong: string;
}

/**
 * 4단계 캐스케이딩 매칭과 numeric tolerance를 결합하여
 * 구글 시트 TYPE_MAP에서 아파트 면적에 매칭되는 타입(TypeMapEntry)을 찾는 강인한 헬퍼 함수
 */
export function findTypeMapEntry(
  typeMap: Record<string, Record<string, TypeMapEntry>> | undefined,
  aptName: string,
  area: number
): TypeMapEntry | null {
  if (!typeMap || !aptName || !area) return null;

  // 1. 아파트명 매칭 시도
  let normApt = normalizeAptName(aptName);
  let aptEntry = typeMap[normApt];

  if (!aptEntry) {
    // exact match 실패 시 findTxKey와 유사한 캐스케이딩 매칭 수행
    const matchedKey = findTxKey(aptName, typeMap);
    if (matchedKey) {
      aptEntry = typeMap[matchedKey];
    }
  }

  if (!aptEntry) return null;

  // 2. 정확 일치 검사
  const exactKey = String(area);
  if (aptEntry[exactKey]) return aptEntry[exactKey];

  // 3. 소수점 미세 차이 허용 (0.11 m² 이내의 차이면 동일 타입으로 판정)
  for (const [keyStr, val] of Object.entries(aptEntry)) {
    const keyNum = parseFloat(keyStr);
    if (!isNaN(keyNum) && Math.abs(keyNum - area) < 0.11) {
      return val;
    }
  }

  return null;
}
