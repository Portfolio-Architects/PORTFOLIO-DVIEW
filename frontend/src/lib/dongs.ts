/**
 * 동탄2 신도시 11개 법정동 메타데이터
 * zones.ts의 "투자 권역" 개념 대신, 법정동 기반으로 관리
 */

export interface DongInfo {
  id: string;       // URL-safe id
  name: string;     // 법정동명
  color: string;    // 테마 컬러
  emoji: string;    // 대표 이모지
  description: string;
}

export const DONGS: DongInfo[] = [
  { id: 'cheonggyedong', name: '청계동', color: '#ea6100', emoji: '🏙️', description: '동탄역 시범단지 밀집, 학군·상권 최강 지역' },
  { id: 'yeoul',       name: '여울동', color: '#f04452', emoji: '🚇', description: 'GTX-A·SRT 동탄역세권, 서울 출퇴근 핵심' },
  { id: 'yeongcheon',  name: '영천동', color: '#03c75a', emoji: '🏭', description: '삼성반도체 인접, 직주근접 수요 탄탄' },
  { id: 'mokdong',     name: '목동',   color: '#f59e0b', emoji: '🌿', description: '힐스테이트·e편한세상 등 브랜드 단지 밀집' },
  { id: 'songdong',    name: '송동',   color: '#06b6d4', emoji: '🌊', description: '호수공원 남측, 레이크뷰 단지 밀집' },
  { id: 'sancheok',    name: '산척동', color: '#ea6100', emoji: '🏫', description: '호수공원역 주변, 교육·자연 인프라 우수' },
  { id: 'sindong',     name: '신동',   color: '#ec4899', emoji: '🚀', description: '신규 택지, 장기 성장 가능성이 큰 지역' },
  { id: 'jangji',      name: '장지동', color: '#0ea5e9', emoji: '🏞️', description: '동탄호수공원 인접, 쾌적한 자연환경' },
  { id: 'bansong',     name: '반송동', color: '#8b5cf6', emoji: '🏘️', description: '메타폴리스 중심, 동탄1 최대 주거 밀집 지역' },
  { id: 'neungdong',   name: '능동',   color: '#191f28', emoji: '🌳', description: '동탄1 자연환경과 편리한 교통이 어우러진 주거지' },
  { id: 'seokwoo',     name: '석우동', color: '#a855f7', emoji: '🎭', description: '문화·디자인밸리, 1·2신도시 생활권 공유' },
];

/** 동 이름 → DongInfo 조회 */
export function getDongByName(dongName: string): DongInfo | undefined {
  return DONGS.find(d => d.name === dongName);
}

/** 동 ID → DongInfo 조회 */
export function getDongById(dongId: string): DongInfo | undefined {
  return DONGS.find(d => d.id === dongId);
}

/** 동 이름 → 색상 */
export function getDongColor(dongName: string): string {
  return getDongByName(dongName)?.color || '#8b95a1';
}

/** 전체 동 이름 목록 (가나다순) */
export function getAllDongNames(): string[] {
  return DONGS.map(d => d.name).sort((a, b) => a.localeCompare(b, 'ko'));
}
