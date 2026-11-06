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
import {
  CANONICAL_DONG_APT_LIST,
  CANONICAL_TX_SUMMARY_MAP,
  lookupCanonicalTxKeyForDongApt,
  type CanonicalCatalogAptEntry,
} from './canonicalAptCatalog';

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

import { normalizeAptName, sanitizeAptKey } from '../../../pipeline/core/normalizer';
export { normalizeAptName, sanitizeAptKey };

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
  '여울동금강펜테리움센트럴파크': '동탄2신도시금강펜테리움센트럴파크1',
  '동탄2신도시금강펜테리움센트럴파크Ⅰ': '동탄2신도시금강펜테리움센트럴파크1',
  '여울동반도유보라아이비파크3.0': '반도유보라아이비파크3',
  '여울동센트럴힐즈': '화성동탄2센트럴힐즈동탄아파트',
  '장지동금호어울림레이크': '금호어울림레이크',
  '장지동금호어울림레이크2차': '금호어울림레이크2차',
  '장지동아이파크1단지': '동탄2아이파크1단지',
  '장지동아이파크2단지': '동탄2아이파크2단지',
  '장지동제일풍경채에듀앤파크': '제일풍경채에듀앤파크',
  '장지동호반베르디움': '동탄2신도시호반베르디움33단지',
  '신동디에트르포레': '동탄2디에트르포레',
  '목동금강펜테리움센트럴파크4차': '동탄금강펜테리움센트럴파크4',
  '동탄금강펜테리움센트럴파크Ⅳ': '동탄금강펜테리움센트럴파크4',
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
  '호수공원금강펜테리움센트럴파크Ⅱ': '산척동동탄호수공원금강펜테리움센트럴파크2',
  '호수공원금강펜테리움센트럴파크2': '산척동동탄호수공원금강펜테리움센트럴파크2',
  '산척동,동탄호수공원금강펜테리움센트럴파크Ⅱ': '산척동동탄호수공원금강펜테리움센트럴파크2',
  '동탄호수공원자연&자이': '동탄호수공원자연앤자이',
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
  '장지동금호어울림레이크1차': '금호어울림레이크',
  '금호어울림 레이크 1차': '금호어울림레이크',
  '동탄호수공원금호어울림레이크1차': '금호어울림레이크',
  '동탄역동원로얄듀크비스타': '동탄역동원로얄듀크비스타3차',
  '동탄2LH26단지': '동탄2엘에이치26단지아파트에이65블록',
  '동탄2신도시동탄역디에트르': '동탄2신도시동탄역디에트르퍼스티지',
  '센트럴SE타운': '센트럴S타운',
  '동탄신도시금강펜테리움6차': '금강펜테리움6차센트럴파크',
  '동탄신도시금강펜테리움7차': '동탄신도시금강펜테리움7차센트럴파크',
  '화성동탄2제일풍경채퍼스트': '제일풍경채퍼스티어',
  '동탄역금강펜테리움더시티': '동탄역금강펜테리움더시글로',
  '동탄호수공원계룡리슈빌': '동탄호수공원리슈빌',
  '동탄스카이뷰': '동탄스카이뷰빌딩',
  '동탄현대하이페리온': '동탄하이페리온',
  '에스원센트로벨': '동탄에스원센트로빌',
  '동탄파크릭스A51-1BL': '동탄파크릭스A51-1BL아파트',
  '동탄파크릭스A51-2BL': '동탄파크릭스A51-2BL아파트',
  '동탄파크릭스A52BL': '동탄파크릭스A52BL아파트',
  '동탄파크릭스A55BL': '동탄파크릭스A55BL아파트',
  '숨마데시앙': '동탄숨마데시앙',
  '아테라파밀리에': '동탄아테라파밀리에',
  '새강마을휴먼시아5단지2': '새강마을휴먼시아5단지',
  '서해더블루': '서해더블루106-7',
  '서해더블루90-2번지': '서해더블루90-2',
  '서해더블루93-8번지': '서해더블루93-8',
  '동탄2신도시동원로얄듀크': '동탄역동원로얄듀크1차',
  '동탄시범다은마을메타역세권': '동탄시범다은마을메타역롯데캐슬',
  '동탄시범다은마을센트럴힐': '동탄시범다은마을센트럴파크뷰',
  '시범나루마을동탄역UBO': '동탄나루마을동탄역U.BORA여울숲1.0',
  '능동마을주공': '능동마을주공아파트',
  '능동마을주공7단지': '휴먼시아7단지아파트',
  '동탄숲속마을자연앤데시앙': '자연앤데시앙',
  '동탄푸른마을두산위브': '푸른마을두산위브',
  '동탄푸른마을모아미래도': '푸른마을모아미래도',
  '푸른마을포스코더샵2차': '포스코더샵2차',
  '동탄역시범금강펜테리움센트럴파크3차': '동탄역시범금강펜테리움센트럴파크3',
  '동탄2신도시하우스디더레이크': '동탄2하우스디더레이크',
  '동탄2신도시금강펜테리움센트럴파크1차': '동탄2신도시금강펜테리움센트럴파크1',
  '반도유보라아이비파크3.0': '반도유보라아이비파크3',
  '센트럴힐즈동탄': '화성동탄2센트럴힐즈동탄아파트',
  '동탄역디에트르퍼스티지': '동탄2신도시동탄역디에트르퍼스티지',
  '동탄역남해오네뜨더테라스': '동탄역남해오네띄더테라스',
  'e편한세상동탄': '이편한세상동탄',
  '금강펜테리움센트럴파크4차': '동탄금강펜테리움센트럴파크4',
  '그린힐반도유보라아이비파크10단지': '그린힐반도유보라아이비파크101단지',
  '더레이크파크뷰': '더레이크시티부영1단지',
  '동탄호수공원금강펜테리움센트럴파크2차': '산척동동탄호수공원금강펜테리움센트럴파크2',
  '동탄역센트럴상록': '동탄역센트럴상록아파트',
  '시범다은마을월드메르디앙반도유보라': '동탄시범다은마을월드메르디앙반도유보라',
  '시범한빛마을KCC스위첸': '시범한빛마을케이씨씨스위첸',
  '메타폴리스': 'METAPOLIS',
  '예당마을롯데캐슬': '롯데캐슬',
  '예당마을신일유토빌': '신일유토빌',
  '예당마을우미린제일풍경채': '우미린제일풍경채',
  '화성동탄2제일풍경채퍼스티어': '제일풍경채퍼스티어',
  '동탄신도시금강펜테리움6차센트럴파크': '금강펜테리움6차센트럴파크',
};

const DISPLAY_NAME_MAPPING: Record<string, string> = {
  '동탄풍성신미주': '동탄역 신미주',
  '그린힐반도유보라아이비파크101단지': '그린힐 반도유보라 아이비파크 10단지',
  '그린힐반도유보라아이비파크10.0': '그린힐 반도유보라 아이비파크 10단지',
  '산척동그린힐반도유보라아이비파크10': '그린힐 반도유보라 아이비파크 10단지',
  '레이크힐반도유보라아이비파크10.2': '레이크힐 반도유보라 아이비파크 10.2',
  '산척동레이크힐반도유보라아이비파크10.2': '레이크힐 반도유보라 아이비파크 10.2',
  '동탄역시범금강펜테리움센트럴파크Ⅲ': '동탄역 시범 금강펜테리움 센트럴파크 3차',
  '동탄역시범금강펜테리움센트럴파크3': '동탄역 시범 금강펜테리움 센트럴파크 3차',
  '호수공원금강펜테리움센트럴파크Ⅱ': '동탄호수공원 금강펜테리움 센트럴파크 2차',
  '목동금강펜테리움센트럴파크4차': '금강펜테리움 센트럴파크 4차',
  '힐스테이트동탄역': '힐스테이트 동탄역',
  '동탄역힐스테이트': '힐스테이트 동탄역',
  '목동힐스테이트': '힐스테이트 동탄',
  '목동e편한세상': 'e편한세상 동탄',
  '반송동메타폴리스': '메타폴리스',
  '영천동파크자이': '동탄 파크자이',
  '영천동파크푸르지오': '동탄 파크푸르지오',
  '산척동더샵레이크에듀타운': '동탄 더샵 레이크에듀타운',
};


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

  // 하드코딩 매핑 체크 (양방향 및 공통 타깃)
  if (HARDCODED_MAPPING[a] === b || HARDCODED_MAPPING[b] === a) return true;
  if (HARDCODED_MAPPING[a] && HARDCODED_MAPPING[a] === HARDCODED_MAPPING[b]) return true;

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
    const mapA = mMapping[rName] || mMapping[a] || HARDCODED_MAPPING[a];
    const mapB = mMapping[tName] || mMapping[b] || HARDCODED_MAPPING[b];
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
 * [주의] 긴 접두사가 먼저 오도록 정렬 — 가장 구체적인 것부터 매칭
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
  // 명칭 통일 (앱 <-> 실거래DB 표기 차이)
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
const manualMappingKeyCache = new WeakMap<object, string>();

function getManualMappingKey(manualMapping?: Record<string, string>): string {
  if (!manualMapping) return '';
  const cached = manualMappingKeyCache.get(manualMapping);
  if (cached !== undefined) return cached;
  const keys = Object.keys(manualMapping).sort();
  const serialized = keys.map(k => `${k}:${manualMapping[k]}`).join('|');
  manualMappingKeyCache.set(manualMapping, serialized);
  return serialized;
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
      const sanitizedKey = sanitizeAptKey(key);
      if (sanitizedKey && !(sanitizedKey in normalizedTxMap)) {
        normalizedTxMap[sanitizedKey] = key;
      }

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

  // 1.5단계: 단어 순서 반전 매칭 (예: "동탄역 힐스테이트" <-> "힐스테이트동탄역")
  // 모든 토큰을 보존하는 회전 조합만 검사하여 "동탄 파라곤 3차"가 '3차'를 유실한 채 "동탄파라곤"으로 오매칭되는 현상 방지
  const tokens = vAptName.trim().split(/\s+/);
  if (tokens.length === 2) {
    const revNorm = normalizeAptName(`${tokens[1]}${tokens[0]}`);
    if (revNorm && revNorm in normalizedTxMap) {
      const res = normalizedTxMap[revNorm];
      resolvedMap.set(cacheKey, res);
      return res;
    }
  } else if (tokens.length === 3) {
    const rotations = [
      `${tokens[1]}${tokens[2]}${tokens[0]}`,
      `${tokens[2]}${tokens[0]}${tokens[1]}`,
      `${tokens[2]}${tokens[1]}${tokens[0]}`,
    ];
    for (const candidate of rotations) {
      const revNorm = normalizeAptName(candidate);
      if (revNorm && revNorm in normalizedTxMap) {
        const res = normalizedTxMap[revNorm];
        resolvedMap.set(cacheKey, res);
        return res;
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

export interface CanonicalAptSlugItem {
  name: string;
  dong?: string;
  txKey?: string;
  rawTxKey?: string;
}

export interface ResolveCanonicalAptSlugOptions {
  txKey?: string | null;
  txMap?: Record<string, unknown> | null;
  sheetApartments?: Record<string, CanonicalAptSlugItem[]> | null;
  manualMapping?: Record<string, string> | null;
  dong?: string | null;
}

function decodeCanonicalAptInput(raw: string | undefined | null): string {
  if (typeof raw !== 'string') return '';
  let current = raw.trim();
  if (!current) return '';
  for (let i = 0; i < 3; i++) {
    if (!/%[0-9A-Fa-f]{2}/.test(current)) break;
    try {
      const next = decodeURIComponent(current).trim();
      if (next === current) break;
      current = next;
    } catch {
      break;
    }
  }
  return current.normalize('NFC');
}

function canonDongSlugHint(d?: string | null): string {
  return String(d || '')
    .normalize('NFC')
    .replace(/[0-9동\s]/g, '')
    .replace(/^오산$/, '여울');
}

function isDongHintCompatible(itemDong?: string | null, hintDong?: string | null): boolean {
  if (!hintDong || !itemDong) return true;
  if (itemDong === hintDong) return true;
  const normItem = canonDongSlugHint(itemDong);
  const normHint = canonDongSlugHint(hintDong);
  if (!normItem || !normHint) return true;
  return normItem === normHint;
}

interface PrecomputedDongAptItem extends CanonicalAptSlugItem {
  sanName: string;
  sanTx: string;
  sanRaw: string;
  normName: string;
  normTx: string;
  normRaw: string;
  deepName: string;
  deepTx: string;
}

function toPrecomputedDongAptItem(item: CanonicalAptSlugItem): PrecomputedDongAptItem {
  const normName = normalizeAptName(item.name);
  const normTx = item.txKey ? normalizeAptName(item.txKey) : '';
  return {
    ...item,
    sanName: sanitizeAptKey(item.name),
    sanTx: item.txKey ? sanitizeAptKey(item.txKey) : '',
    sanRaw: item.rawTxKey ? sanitizeAptKey(item.rawTxKey) : '',
    normName,
    normTx,
    normRaw: item.rawTxKey ? normalizeAptName(item.rawTxKey) : '',
    deepName: stripLocationSuffix(deepNormalize(normName)),
    deepTx: normTx ? stripLocationSuffix(deepNormalize(normTx)) : '',
  };
}

let _staticPrecomputedDongApts: ReadonlyArray<PrecomputedDongAptItem> | null = null;
function getStaticPrecomputedDongApts(): ReadonlyArray<PrecomputedDongAptItem> {
  if (!_staticPrecomputedDongApts) {
    _staticPrecomputedDongApts = (
      CANONICAL_DONG_APT_LIST as ReadonlyArray<CanonicalCatalogAptEntry>
    ).map((entry) => toPrecomputedDongAptItem(entry));
  }
  return _staticPrecomputedDongApts;
}

function buildDerivedMappingForCatalog(
  catalog: ReadonlyArray<PrecomputedDongAptItem>,
  effectiveTxMap: Record<string, unknown>
): Record<string, string> {
  const derived: Record<string, string> = {};
  for (const entry of getStaticPrecomputedDongApts()) {
    if (entry.txKey) {
      derived[entry.normName] = entry.txKey;
      derived[entry.name] = entry.txKey;
    }
  }
  for (const a of catalog) {
    if (a.name && a.txKey) {
      const catalogKey = a.dong ? lookupCanonicalTxKeyForDongApt(a.dong, a.name) : undefined;
      const sanKey = a.sanTx || a.txKey;
      const normKey = a.normTx;
      const mappedKey =
        (catalogKey && Object.prototype.hasOwnProperty.call(effectiveTxMap, catalogKey)
          ? catalogKey
          : '') ||
        HARDCODED_MAPPING[sanKey] ||
        HARDCODED_MAPPING[normKey] ||
        (Object.prototype.hasOwnProperty.call(effectiveTxMap, sanKey) ? sanKey : '') ||
        (normKey && Object.prototype.hasOwnProperty.call(effectiveTxMap, normKey) ? normKey : '') ||
        catalogKey ||
        sanKey;
      derived[a.normName] = mappedKey;
      derived[a.name] = mappedKey;
    }
  }
  return derived;
}

let _staticBaseDerivedMapping: Record<string, string> | null = null;
function getStaticBaseDerivedMapping(): Record<string, string> {
  if (!_staticBaseDerivedMapping) {
    _staticBaseDerivedMapping = buildDerivedMappingForCatalog(
      getStaticPrecomputedDongApts(),
      CANONICAL_TX_SUMMARY_MAP as Record<string, unknown>
    );
  }
  return _staticBaseDerivedMapping;
}

const sheetApartmentsCatalogCache = new WeakMap<
  object,
  { stamp: string; list: PrecomputedDongAptItem[] }
>();
const catalogTxMapDerivedCache = new WeakMap<
  object,
  WeakMap<object, { stamp: string; mapping: Record<string, string> }>
>();
const canonicalSlugResultCache = new WeakMap<
  object,
  WeakMap<object, Map<string, string>>
>();

function inspectCallerTxMap(
  txMap: Record<string, unknown> | null
): { hasEntries: boolean; stamp: string } {
  if (!txMap) return { hasEntries: false, stamp: '' };
  if (txMap === (CANONICAL_TX_SUMMARY_MAP as unknown)) {
    return { hasEntries: true, stamp: '' };
  }
  let count = 0;
  let stamp = '';
  for (const key in txMap) {
    if (!Object.prototype.hasOwnProperty.call(txMap, key)) continue;
    count++;
    if (count <= 16) {
      const val = txMap[key] as { dong?: string } | undefined | null;
      const dong = val && typeof val === 'object' && typeof val.dong === 'string' ? val.dong : '';
      stamp += `${key}:${dong};`;
    } else {
      return { hasEntries: true, stamp: '' };
    }
  }
  return { hasEntries: count > 0, stamp };
}

function inspectSheetApartmentsStamp(
  sheetApartments: Record<string, CanonicalAptSlugItem[]> | null | undefined
): string {
  if (!sheetApartments || typeof sheetApartments !== 'object') return '';
  let dongCount = 0;
  let itemCount = 0;
  let stamp = '';
  for (const dong in sheetApartments) {
    if (!Object.prototype.hasOwnProperty.call(sheetApartments, dong)) continue;
    dongCount++;
    if (dongCount > 4) return '';
    const list = sheetApartments[dong];
    if (!Array.isArray(list)) continue;
    for (let i = 0; i < list.length; i++) {
      itemCount++;
      if (itemCount > 16) return '';
      const item = list[i];
      if (item && typeof item.name === 'string') {
        stamp += `${dong}:${item.name}:${item.txKey || ''}:${item.rawTxKey || ''};`;
      }
    }
  }
  return stamp;
}

function getDerivedMappingCached(
  catalog: ReadonlyArray<PrecomputedDongAptItem>,
  effectiveTxMap: Record<string, unknown>,
  combinedStamp: string
): Record<string, string> {
  let byTxMap = catalogTxMapDerivedCache.get(catalog);
  if (!byTxMap) {
    byTxMap = new WeakMap<object, { stamp: string; mapping: Record<string, string> }>();
    catalogTxMapDerivedCache.set(catalog, byTxMap);
  }
  const cached = byTxMap.get(effectiveTxMap);
  if (cached && cached.stamp === combinedStamp) {
    return cached.mapping;
  }
  const mapping = buildDerivedMappingForCatalog(catalog, effectiveTxMap);
  byTxMap.set(effectiveTxMap, { stamp: combinedStamp, mapping });
  return mapping;
}

/**
 * Resolves any display apartment name, percent-encoded path segment, NFD Hangul input, or raw txKey
 * into the single canonical `/apartment/[aptName]` URL slug (matching `tx-summary.json` / `sitemap.ts`).
 *
 * Preserves unrecognized / non-existent inputs verbatim (in NFC) so fallback pages and synthetic unit fixtures
 * never suffer destructive string mangling or cross-complex hijacking.
 */
export function resolveCanonicalAptSlug(
  aptName: string | undefined | null,
  options?: ResolveCanonicalAptSlugOptions
): string {
  const decoded = decodeCanonicalAptInput(aptName);
  if (!decoded) return '';

  const callerTxMap = options?.txMap && typeof options.txMap === 'object' ? options.txMap : null;
  const { hasEntries: hasCallerTxEntries, stamp: txStamp } = inspectCallerTxMap(callerTxMap);
  const effectiveTxMap: Record<string, unknown> =
    hasCallerTxEntries && callerTxMap
      ? callerTxMap
      : (CANONICAL_TX_SUMMARY_MAP as Record<string, unknown>);

  const manualMapping =
    options?.manualMapping && typeof options.manualMapping === 'object'
      ? options.manualMapping
      : undefined;
  const hasSheetApartments = Boolean(
    options?.sheetApartments && typeof options.sheetApartments === 'object'
  );
  const sheetStamp = hasSheetApartments ? inspectSheetApartmentsStamp(options?.sheetApartments) : '';
  const sheetApartmentsKeyObj: object =
    hasSheetApartments && options?.sheetApartments
      ? options.sheetApartments
      : (CANONICAL_DONG_APT_LIST as object);

  // Fast memoized result lookup keyed by (effectiveTxMap, sheetApartmentsObj, manualMappingKey, mutation stamps)
  let bySheetCache = canonicalSlugResultCache.get(effectiveTxMap);
  if (!bySheetCache) {
    bySheetCache = new WeakMap<object, Map<string, string>>();
    canonicalSlugResultCache.set(effectiveTxMap, bySheetCache);
  }
  let resultCacheMap = bySheetCache.get(sheetApartmentsKeyObj);
  if (!resultCacheMap) {
    resultCacheMap = new Map<string, string>();
    bySheetCache.set(sheetApartmentsKeyObj, resultCacheMap);
  }
  const manualKey = manualMapping ? getManualMappingKey(manualMapping) : '';
  const combinedStamp = txStamp || sheetStamp ? `${txStamp}|${sheetStamp}` : '';
  const resultCacheKey = `${decoded}\x1E${options?.dong || ''}\x1E${options?.txKey || ''}\x1E${manualKey}\x1E${combinedStamp}`;
  const cachedSlug = resultCacheMap.get(resultCacheKey);
  if (cachedSlug !== undefined) {
    return cachedSlug;
  }

  const cacheAndReturn = (slug: string): string => {
    resultCacheMap.set(resultCacheKey, slug);
    return slug;
  };

  // 1. Fast path when no manualMapping override is present: already an exact whitespace-free key in effectiveTxMap
  if (
    !manualMapping &&
    !/\s/.test(decoded) &&
    Object.prototype.hasOwnProperty.call(effectiveTxMap, decoded)
  ) {
    const fastEntry = effectiveTxMap[decoded] as { dong?: string } | undefined;
    if (!options?.dong || !fastEntry?.dong || isDongHintCompatible(fastEntry.dong, options.dong)) {
      return cacheAndReturn(decoded);
    }
  }

  const sanDecoded = sanitizeAptKey(decoded);
  const normDecoded = normalizeAptName(decoded);

  // 0. Explicit manualMapping override takes absolute precedence
  if (manualMapping) {
    const directManual =
      manualMapping[decoded] ||
      (normDecoded ? manualMapping[normDecoded] : undefined) ||
      (sanDecoded ? manualMapping[sanDecoded] : undefined);
    if (directManual) {
      const sanManual = sanitizeAptKey(directManual) || directManual;
      if (Object.prototype.hasOwnProperty.call(effectiveTxMap, directManual)) {
        return cacheAndReturn(directManual);
      }
      if (Object.prototype.hasOwnProperty.call(effectiveTxMap, sanManual)) {
        return cacheAndReturn(sanManual);
      }
      return cacheAndReturn(sanManual);
    }
    if (
      !/\s/.test(decoded) &&
      Object.prototype.hasOwnProperty.call(effectiveTxMap, decoded)
    ) {
      const fastEntry = effectiveTxMap[decoded] as { dong?: string } | undefined;
      if (!options?.dong || !fastEntry?.dong || isDongHintCompatible(fastEntry.dong, options.dong)) {
        return cacheAndReturn(decoded);
      }
    }
  }

  // 2. Assemble unified DongApartment catalog (caller sheetApartments prioritized, enriched with static catalog)
  const staticPrecomputedDongApts = getStaticPrecomputedDongApts();
  let allDongApts: ReadonlyArray<PrecomputedDongAptItem>;
  if (hasSheetApartments && options?.sheetApartments) {
    const cachedCatalogEntry = sheetApartmentsCatalogCache.get(options.sheetApartments);
    let cachedCatalog =
      cachedCatalogEntry && cachedCatalogEntry.stamp === sheetStamp
        ? cachedCatalogEntry.list
        : undefined;
    if (!cachedCatalog) {
      cachedCatalog = [];
      const seenDongAptKeys = new Set<string>();
      const callerList = Object.values(options.sheetApartments)
        .flat()
        .filter((a): a is CanonicalAptSlugItem => Boolean(a && typeof a.name === 'string'));
      for (const item of callerList) {
        const normName = item.name.normalize('NFC');
        const normDong = item.dong ? item.dong.normalize('NFC') : undefined;
        const catalogTxKey =
          !item.txKey && normDong ? lookupCanonicalTxKeyForDongApt(normDong, normName) : undefined;
        const enriched: CanonicalAptSlugItem = {
          ...item,
          name: normName,
          dong: normDong,
          txKey: item.txKey ? item.txKey.normalize('NFC') : catalogTxKey,
        };
        cachedCatalog.push(toPrecomputedDongAptItem(enriched));
        seenDongAptKeys.add(`${normDong || ''}::${normName}`);
      }
      for (const staticEntry of staticPrecomputedDongApts) {
        const key = `${staticEntry.dong}::${staticEntry.name}`;
        if (!seenDongAptKeys.has(key)) {
          cachedCatalog.push(staticEntry);
          seenDongAptKeys.add(key);
        }
      }
      sheetApartmentsCatalogCache.set(options.sheetApartments, {
        stamp: sheetStamp,
        list: cachedCatalog,
      });
    }
    allDongApts = cachedCatalog;
  } else {
    allDongApts = staticPrecomputedDongApts;
  }

  // Build derived name -> canonical txKey lookup (cached by (allDongApts, effectiveTxMap))
  let effectiveMapping: Record<string, string>;
  if (!hasSheetApartments && !manualMapping && effectiveTxMap === (CANONICAL_TX_SUMMARY_MAP as Record<string, unknown>)) {
    effectiveMapping = getStaticBaseDerivedMapping();
  } else {
    const baseDerived = getDerivedMappingCached(allDongApts, effectiveTxMap, combinedStamp);
    effectiveMapping = manualMapping ? { ...baseDerived, ...manualMapping } : baseDerived;
  }

  // Strictly ordered 4-tier matching prevents fuzzy prefix-stripping (e.g. '나루마을 신도브래뉴')
  // from hijacking exact/sanitized matches for distinct villages (e.g. '솔빛마을 신도브래뉴')
  const hardcodedTarget =
    (sanDecoded && HARDCODED_MAPPING[sanDecoded]) ||
    (normDecoded && HARDCODED_MAPPING[normDecoded]) ||
    HARDCODED_MAPPING[decoded] ||
    '';
  const deepFullDecoded = normDecoded ? stripLocationSuffix(deepNormalize(normDecoded)) : '';

  const findAcrossTiers = (dongHint?: string): PrecomputedDongAptItem | undefined => {
    const candidates = dongHint
      ? allDongApts.filter((a) => isDongHintCompatible(a.dong, dongHint))
      : allDongApts;
    if (candidates.length === 0) return undefined;

    // Tier 1: Exact string match on display name, canonical txKey, or raw sheet txKey
    const tier1 = candidates.find(
      (a) =>
        a.name === decoded ||
        a.txKey === decoded ||
        (a.rawTxKey !== undefined && a.rawTxKey === decoded)
    );
    if (tier1) return tier1;

    // Tier 2: Whitespace/punctuation sanitized or normalized exact match (no village/location stripping)
    const tier2 = candidates.find((a) => {
      if (
        sanDecoded &&
        (a.sanName === sanDecoded || a.sanTx === sanDecoded || a.sanRaw === sanDecoded)
      ) {
        return true;
      }
      if (
        normDecoded &&
        (a.normName === normDecoded || a.normTx === normDecoded || a.normRaw === normDecoded)
      ) {
        return true;
      }
      if (
        hardcodedTarget &&
        (a.txKey === hardcodedTarget ||
          a.sanTx === hardcodedTarget ||
          a.normTx === hardcodedTarget ||
          a.sanName === hardcodedTarget)
      ) {
        return true;
      }
      return false;
    });
    if (tier2) return tier2;

    // Tier 3: Deep-normalized full name (Roman numerals / trailing '아파트') without stripping location prefixes
    if (deepFullDecoded && deepFullDecoded.length > 2) {
      const tier3 = candidates.find(
        (a) => a.deepName === deepFullDecoded || (Boolean(a.deepTx) && a.deepTx === deepFullDecoded)
      );
      if (tier3) return tier3;
    }

    // Tier 4: Fuzzy location-stripped isSameApartment — accepted ONLY when unambiguous (unique canonical target)
    const tier4Matches = candidates.filter(
      (a) =>
        isSameApartment(a.name, decoded, effectiveMapping, a.dong, dongHint) ||
        Boolean(a.txKey && isSameApartment(a.txKey, decoded, effectiveMapping, a.dong, dongHint))
    );
    if (tier4Matches.length === 1) {
      return tier4Matches[0];
    }
    if (tier4Matches.length > 1) {
      const distinctCanonical = new Set(
        tier4Matches.map((m) => m.sanTx || m.sanName || m.name)
      );
      if (distinctCanonical.size === 1) {
        return tier4Matches[0];
      }
    }

    return undefined;
  };

  let matchedDongApt: PrecomputedDongAptItem | undefined;
  if (options?.dong) {
    matchedDongApt = findAcrossTiers(options.dong);
  }
  if (!matchedDongApt) {
    matchedDongApt = findAcrossTiers();
  }

  // 3. Explicit options.txKey or matched DongApartment canonical txKey
  const matchedCatalogTxKey =
    matchedDongApt?.dong && matchedDongApt?.name
      ? lookupCanonicalTxKeyForDongApt(matchedDongApt.dong, matchedDongApt.name)
      : undefined;
  const candidateRawTxKey =
    decodeCanonicalAptInput(options?.txKey) ||
    decodeCanonicalAptInput(matchedCatalogTxKey) ||
    decodeCanonicalAptInput(matchedDongApt?.txKey);
  let candidateSanitizedTxKey = '';

  if (candidateRawTxKey) {
    const san =
      sanitizeAptKey(candidateRawTxKey) ||
      normalizeAptName(candidateRawTxKey) ||
      candidateRawTxKey;
    const normCandidate = normalizeAptName(candidateRawTxKey);
    candidateSanitizedTxKey =
      HARDCODED_MAPPING[san] ||
      HARDCODED_MAPPING[normCandidate] ||
      (normCandidate && Object.prototype.hasOwnProperty.call(effectiveTxMap, normCandidate)
        ? normCandidate
        : san);

    if (Object.prototype.hasOwnProperty.call(effectiveTxMap, candidateSanitizedTxKey)) {
      return cacheAndReturn(candidateSanitizedTxKey);
    }
    if (Object.prototype.hasOwnProperty.call(effectiveTxMap, san)) {
      return cacheAndReturn(san);
    }
    if (normCandidate && Object.prototype.hasOwnProperty.call(effectiveTxMap, normCandidate)) {
      return cacheAndReturn(normCandidate);
    }
    if (Object.prototype.hasOwnProperty.call(effectiveTxMap, candidateRawTxKey)) {
      return cacheAndReturn(candidateRawTxKey);
    }
  }

  // 3b. Exact key hit in effectiveTxMap when no canonical txKey override exists
  if (Object.prototype.hasOwnProperty.call(effectiveTxMap, decoded)) {
    return cacheAndReturn(decoded);
  }

  // 4. Cascade findTxKey against effectiveTxMap (guarded against cross-complex hijacking)
  const effectiveDong = options?.dong || matchedDongApt?.dong || undefined;
  let claimedByOtherApts: Set<string> | null = null;
  const getClaimedByOtherApts = (): Set<string> => {
    if (!claimedByOtherApts) {
      claimedByOtherApts = new Set<string>();
      if (candidateSanitizedTxKey && allDongApts.length > 0) {
        for (const other of allDongApts) {
          if (other === matchedDongApt || !other.txKey) continue;
          const sanOther = other.sanTx || other.txKey;
          const normOther = other.normTx;
          const mappedOther = HARDCODED_MAPPING[sanOther] || HARDCODED_MAPPING[normOther] || sanOther;
          if (
            sanOther !== candidateSanitizedTxKey &&
            normOther !== candidateSanitizedTxKey &&
            mappedOther !== candidateSanitizedTxKey
          ) {
            claimedByOtherApts.add(sanOther);
            if (normOther) claimedByOtherApts.add(normOther);
            claimedByOtherApts.add(mappedOther);
          }
        }
      }
    }
    return claimedByOtherApts;
  };

  const isValidFuzzyTxHit = (foundKey: string | null | undefined): foundKey is string => {
    if (!foundKey) return false;
    if (candidateSanitizedTxKey && getClaimedByOtherApts().has(foundKey)) {
      return false;
    }
    if (effectiveDong) {
      const txEntry = effectiveTxMap[foundKey] as { dong?: string } | undefined;
      if (txEntry?.dong && !isDongHintCompatible(txEntry.dong, effectiveDong)) {
        return false;
      }
    }
    return true;
  };

  if (candidateRawTxKey) {
    const foundFromTxKey = findTxKey(
      candidateRawTxKey,
      effectiveTxMap,
      effectiveMapping,
      false,
      effectiveDong
    );
    if (isValidFuzzyTxHit(foundFromTxKey)) return cacheAndReturn(foundFromTxKey);
  }

  // Only attempt fuzzy name search against effectiveTxMap when not already matched to a known 0-tx DongApartment
  if (!candidateSanitizedTxKey) {
    const foundFromName = findTxKey(
      decoded,
      effectiveTxMap,
      effectiveMapping,
      false,
      effectiveDong
    );
    if (isValidFuzzyTxHit(foundFromName)) return cacheAndReturn(foundFromName);

    // Fallback to static CANONICAL_TX_SUMMARY_MAP when caller passed a partial/scoped txMap
    // (e.g. 1-key scopedInitialData.txSummary on /apartment/[aptName] before full tx-summary.json loads)
    if (hasCallerTxEntries) {
      const staticTxMap = CANONICAL_TX_SUMMARY_MAP as Record<string, { dong?: string }>;
      if (!/\s/.test(decoded) && Object.prototype.hasOwnProperty.call(staticTxMap, decoded)) {
        const staticEntry = staticTxMap[decoded];
        if (!effectiveDong || !staticEntry?.dong || isDongHintCompatible(staticEntry.dong, effectiveDong)) {
          return cacheAndReturn(decoded);
        }
      }
      const foundFromStaticCatalog = findTxKey(
        decoded,
        staticTxMap,
        effectiveMapping,
        false,
        effectiveDong
      );
      if (foundFromStaticCatalog) {
        const staticEntry = staticTxMap[foundFromStaticCatalog];
        if (!effectiveDong || !staticEntry?.dong || isDongHintCompatible(staticEntry.dong, effectiveDong)) {
          return cacheAndReturn(foundFromStaticCatalog);
        }
      }
    }
  }

  // 5. Pre-sale / 0-transaction complex with known txKey, or static HARDCODED_MAPPING alias
  if (candidateSanitizedTxKey) {
    return cacheAndReturn(candidateSanitizedTxKey);
  }

  if (sanDecoded && HARDCODED_MAPPING[sanDecoded]) {
    return cacheAndReturn(HARDCODED_MAPPING[sanDecoded]);
  }
  if (normDecoded && HARDCODED_MAPPING[normDecoded]) {
    return cacheAndReturn(HARDCODED_MAPPING[normDecoded]);
  }
  if (HARDCODED_MAPPING[decoded]) {
    return cacheAndReturn(HARDCODED_MAPPING[decoded]);
  }

  return cacheAndReturn(decoded);
}

/**
 * Crawler / translator locale noise query parameters (e.g. `?hl=ko-KR`, `?gl=KR`, `?_x_tr_hl=...`)
 * that fragment GA4 page_location / page_path metrics and search engine indexing
 * on `/apartment/[aptName]` URLs without affecting page content.
 */
export const NOISE_APARTMENT_QUERY_PARAMS = [
  'hl',
  'gl',
  '_x_tr_sl',
  '_x_tr_tl',
  '_x_tr_hl',
  '_x_tr_pto',
  '_x_tr_hist',
] as const;

/**
 * Strips crawler/translator noise query parameters (`hl`, `gl`, `_x_tr_*`) from a query string
 * while preserving legitimate campaign and share parameters (`utm_*`, `shareType`, `grade`, `score`, `dview_admin`, etc.).
 * Returns a leading-`?` query string if parameters remain, or `''` if empty.
 */
export function stripApartmentNoiseQueryParams(search: string | null | undefined): string {
  if (!search || typeof search !== 'string') return '';
  const trimmed = search.trim();
  if (!trimmed || trimmed === '?') return '';

  const rawQuery = trimmed.startsWith('?') ? trimmed.slice(1) : trimmed;
  const params = new URLSearchParams(rawQuery);
  let mutated = false;

  for (const key of Array.from(params.keys())) {
    const lower = key.toLowerCase();
    if ((NOISE_APARTMENT_QUERY_PARAMS as readonly string[]).includes(lower)) {
      params.delete(key);
      mutated = true;
    }
  }

  if (!mutated) {
    return trimmed.startsWith('?') ? trimmed : `?${trimmed}`;
  }

  const nextQuery = params.toString();
  return nextQuery ? `?${nextQuery}` : '';
}
