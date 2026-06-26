// 동탄2신도시 7대 투자 권역 정의
// dong 필드 → zone 매핑 + 각 권역별 설명 및 메타데이터

export interface ZoneInfo {
  id: string;
  name: string;
  dongLabel: string; // 괄호 안 행정동 표시
  description: string;
  color: string; // 테마 컬러 (배지 등)
}

export const ZONES: ZoneInfo[] = [
  {
    id: 'metropolis',
    name: '메타폴리스 & 중상지구',
    dongLabel: '동탄 1동',
    description: '이미 다 갖춰진 동탄1신도시의 중심지. 상권·교통·학군이 안정적이라 가격 방어력이 가장 강한 지역.',
    color: '#191f28',
  },
  {
    id: 'community',
    name: '커뮤니티시범단지',
    dongLabel: '동탄 4동',
    description: '살기 좋은 주거 핵심 지역. 학교·공원·편의시설이 가까워 실거주 만족도가 높은 곳.',
    color: '#ea6100',
  },
  {
    id: 'gbcx',
    name: '광역비즈니스콤플렉스',
    dongLabel: '동탄 6동 · 오산동',
    description: 'GTX-A, SRT 동탄역 중심. 서울 출퇴근이 편리해 수요가 꾸준한 역세권 지역.',
    color: '#f04452',
  },
  {
    id: 'techno',
    name: '동탄테크노밸리',
    dongLabel: '영천동',
    description: '삼성반도체 등 산업단지 인접. 직주근접 수요가 탄탄한 산업·연구 배후 지역.',
    color: '#03c75a',
  },
  {
    id: 'culture',
    name: '문화디자인밸리',
    dongLabel: '1·2신도시 경계',
    description: '동탄1·2신도시 사이에 위치. 양쪽 생활 인프라를 모두 누릴 수 있는 문화·주거 복합 지역.',
    color: '#8b5cf6',
  },
  {
    id: 'waterfront',
    name: '워터프론트콤플렉스',
    dongLabel: '동탄 7동 · 송동',
    description: '동탄호수공원과 대형 상업시설 인접. 쾌적한 환경과 편리한 생활이 공존하는 지역.',
    color: '#0ea5e9',
  },
  {
    id: 'newtown',
    name: '신주거문화타운',
    dongLabel: '동탄 8·9동',
    description: '아직 개발 중인 외곽 신규 택지. 현재 가격이 저렴해 장기적으로 성장 가능성이 큰 지역.',
    color: '#f59e0b',
  },
];

// 관리자 폼의 dong 값 → zone id 매핑
// apartments/route.ts의 FULL_DONG_DATA 키 기준
const DONG_TO_ZONE_MAP: Record<string, string> = {
  // 메타폴리스 및 중심상업지구
  '목동': 'metropolis',
  '능동': 'metropolis',
  '반송동': 'metropolis',

  // 커뮤니티시범단지
  '청계동': 'community',

  // 광역비즈니스콤플렉스 (동탄역세권)
  '여울동': 'gbcx',

  // 동탄테크노밸리
  '영천동': 'techno',

  // 문화디자인밸리
  '석우동': 'culture',
  '장지동': 'culture',

  // 워터프론트콤플렉스 (호수공원)
  '송동': 'waterfront',
  '산척동': 'waterfront',

  // 신주거문화타운
  '신동': 'newtown',
};

/**
 * dong 문자열을 zone id로 변환
 * 매핑에 없으면 '기타' → 가장 가까운 권역으로 fallback
 */
export function dongToZoneId(dong: string | undefined): string {
  if (!dong) return 'gbcx'; // 기본값: 광역비즈니스콤플렉스
  return DONG_TO_ZONE_MAP[dong] || 'gbcx';
}

export function getZoneById(zoneId: string): ZoneInfo | undefined {
  return ZONES.find(z => z.id === zoneId);
}

// 관리자 폼에서 사용할 dong → zone 이름 표시용
export function getDongZoneLabel(dong: string): string {
  const zoneId = DONG_TO_ZONE_MAP[dong];
  if (!zoneId) return '';
  const zone = getZoneById(zoneId);
  return zone ? zone.name : '';
}

// 특정 권역에 속하는 동 목록 반환
export function getDongsForZone(zoneId: string): string[] {
  return Object.entries(DONG_TO_ZONE_MAP)
    .filter(([, z]) => z === zoneId)
    .map(([dong]) => dong)
    .sort((a, b) => a.localeCompare(b, 'ko'));
}

// 특정 동의 권역 색상 반환
export function getZoneColorForDong(dong: string): string {
  const zoneId = DONG_TO_ZONE_MAP[dong];
  if (!zoneId) return '#8b95a1';
  const zone = ZONES.find(z => z.id === zoneId);
  return zone?.color || '#8b95a1';
}

// 전체 동 목록 (가나다순)
export function getAllDongs(): string[] {
  return Object.keys(DONG_TO_ZONE_MAP).sort((a, b) => a.localeCompare(b, 'ko'));
}
