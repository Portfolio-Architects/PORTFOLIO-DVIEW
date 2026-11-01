/**
 * DVIEW Anonymous Board Domain Engine (Milestone 2)
 *
 * 1. 183 Dongtan complexes + '동탄 예비입주민' Title Registry (184 selectable titles)
 * 2. 56 unmapped complexes vs 127 geocoded complexes categorization
 * 3. Deterministic Spherical Haversine Distance Engine (R = 6,371,000m, threshold <= 300m)
 * 4. Zero GPS Persistence Guarantee: Coordinates are transient in-memory only and NEVER persisted
 * 5. 30-Day Title Locking Anti-Impersonation Engine (2,592,000,000 ms)
 */

import { BoardAuthorProfile } from '@/types/board';
import apartmentsByDongData from '../../../public/data/apartments-by-dong.json';

export type { BoardAuthorProfile };

/**
 * 가상 타이틀 상수 (동탄 거주 예정자, 청약 대기자, 비거주 일반 시민용)
 */
export const VIRTUAL_PROSPECTIVE_RESIDENT_TITLE = '동탄 예비입주민';

/**
 * 지구 평균 반지름 (구면 모델, 미터 단위)
 * dongtanStationDistanceEngine.ts와 100% 동일한 R=6,371,000m 상수 유지
 */
export const EARTH_RADIUS_METERS = 6371000;

/**
 * GPS 아파트 단지 위치 인증 반경 임계값 (300미터 이내)
 */
export const GPS_VERIFICATION_THRESHOLD_METERS = 300;

/**
 * 30일 단지 타이틀 변경 잠금 기간 (밀리초 단위: 30일 = 2,592,000,000 ms)
 */
export const TITLE_LOCK_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * 아파트 단지 메타데이터 구조체
 */
export interface ComplexMetadata {
  name: string;
  dong: string;
  lat: number;
  lng: number;
  hasCoords: boolean;
  householdCount?: number;
  yearBuilt?: string;
  txKey?: string;
}

/**
 * GPS 위치 인증 결과 구조체
 * 엄격한 제로 지속성 원칙: 사용자의 위도/경도(lat, lng)는 절대 이 객체에 포함되지 않음
 */
export interface LocationVerificationResult {
  verified: boolean;
  distanceMeters?: number;
  code?: 'COORDINATES_UNAVAILABLE' | 'OUT_OF_RANGE' | 'INVALID_COMPLEX' | 'INVALID_COORDINATES';
  message: string;
}

/**
 * 30일 타이틀 고정 검사 결과 구조체
 */
export interface TitleLockCheckResult {
  allowed: boolean;
  reason?: 'TITLE_LOCKED_30_DAYS';
  daysRemaining?: number;
}

// ============================================================================
// 1. Title Registry & Complex Indexing
// ============================================================================

interface RawApartmentItem {
  name: string;
  dong?: string;
  lat?: number;
  lng?: number;
  householdCount?: number;
  yearBuilt?: string;
  txKey?: string;
}

const complexRegistryMap = new Map<string, ComplexMetadata>();
const allComplexesList: ComplexMetadata[] = [];
const allSelectableTitlesList: string[] = [];

// Build static registry from apartments-by-dong.json
(function initRegistry() {
  const byDong = apartmentsByDongData.byDong as Record<string, RawApartmentItem[]>;

  for (const [dongName, list] of Object.entries(byDong)) {
    for (const item of list) {
      const lat = typeof item.lat === 'number' && Number.isFinite(item.lat) ? item.lat : 0;
      const lng = typeof item.lng === 'number' && Number.isFinite(item.lng) ? item.lng : 0;
      const hasCoords = lat > 0 && lng > 0;

      const metadata: ComplexMetadata = {
        name: item.name.trim(),
        dong: item.dong?.trim() || dongName,
        lat,
        lng,
        hasCoords,
        householdCount: item.householdCount,
        yearBuilt: item.yearBuilt,
        txKey: item.txKey,
      };

      if (!complexRegistryMap.has(metadata.name)) {
        complexRegistryMap.set(metadata.name, metadata);
        allComplexesList.push(metadata);
        allSelectableTitlesList.push(metadata.name);
      }
    }
  }

  // Append virtual title to selectable titles list (183 complexes + 1 virtual = 184 total)
  if (!allSelectableTitlesList.includes(VIRTUAL_PROSPECTIVE_RESIDENT_TITLE)) {
    allSelectableTitlesList.push(VIRTUAL_PROSPECTIVE_RESIDENT_TITLE);
  }
})();

/**
 * 전체 184개 선택 가능 타이틀 목록 반환 (183개 실제 단지 + '동탄 예비입주민')
 */
export function getAllSelectableTitles(): string[] {
  return [...allSelectableTitlesList];
}

/**
 * 전체 183개 아파트 단지 메타데이터 목록 반환
 */
export function getAllComplexes(): ComplexMetadata[] {
  return allComplexesList.map((c) => ({ ...c }));
}

/**
 * 127개 지오코딩 좌표 등록 단지 목록 반환 (lat > 0, lng > 0)
 */
export function getGeocodedComplexes(): ComplexMetadata[] {
  return allComplexesList.filter((c) => c.hasCoords).map((c) => ({ ...c }));
}

/**
 * 56개 좌표 미등록 단지 목록 반환 (lat === 0, lng === 0)
 */
export function getUnmappedComplexes(): ComplexMetadata[] {
  return allComplexesList.filter((c) => !c.hasCoords).map((c) => ({ ...c }));
}

/**
 * 단지명으로 메타데이터 조회. 존재하지 않거나 가상 타이틀인 경우 null 반환
 */
export function getComplexData(name: string): ComplexMetadata | null {
  if (!name || typeof name !== 'string') return null;
  const found = complexRegistryMap.get(name.trim());
  return found ? { ...found } : null;
}

/**
 * 해당 단지가 공식 좌표가 등록되지 않은 56개 단지 중 하나인지 판별 (lat === 0 && lng === 0)
 */
export function isUnmappedComplex(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const complex = complexRegistryMap.get(name.trim());
  if (!complex) return false;
  return complex.lat === 0 && complex.lng === 0;
}

/**
 * 해당 단지가 공식 좌표가 등록된 127개 단지 중 하나인지 판별 (lat > 0 && lng > 0)
 */
export function isGeocodedComplex(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const complex = complexRegistryMap.get(name.trim());
  if (!complex) return false;
  return complex.lat > 0 && complex.lng > 0;
}

// ============================================================================
// 2. Deterministic Spherical Haversine GPS Distance & Verification
// ============================================================================

/**
 * 두 WGS84 좌표 사이의 구면 대원 거리(Great-circle distance)를 하버사인(Haversine) 공식으로 계산 (미터 단위)
 * R = 6,371,000m
 */
export function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lng1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lng2)
  ) {
    return 0;
  }
  if (lat1 === lat2 && lng1 === lng2) {
    return 0;
  }

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLng / 2) ** 2;

  // Numerical precision guard against floating-point inaccuracies
  const clampedA = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(Math.max(0, 1 - clampedA)));

  return EARTH_RADIUS_METERS * c;
}

/**
 * 사용자의 실시간 GPS 좌표와 선택 단지 중심 좌표 간 300m 반경 검증 수행
 *
 * 엄격한 개인정보 보호 및 제로 지속성(Zero Persistence):
 * userLat, userLng 매개변수는 이 함수 실행 메모리 스택에서 일회성 계산용으로만 사용되며,
 * 어떠한 객체, 파일, 쿠키, DB 또는 반환 결과에도 저장되거나 유출되지 않습니다.
 */
export function verifyComplexLocation(
  complexName: string,
  userLat: number,
  userLng: number
): LocationVerificationResult {
  if (!complexName || typeof complexName !== 'string') {
    return {
      verified: false,
      code: 'INVALID_COMPLEX',
      message: '단지명을 입력해주세요.',
    };
  }

  const trimmedName = complexName.trim();

  // 1. 가상 타이틀 '동탄 예비입주민' 처리
  if (trimmedName === VIRTUAL_PROSPECTIVE_RESIDENT_TITLE) {
    return {
      verified: false,
      code: 'COORDINATES_UNAVAILABLE',
      message: '동탄 예비입주민 타이틀은 위치 인증 대상이 아닙니다.',
    };
  }

  // 2. 단지 등록 여부 확인
  const complex = complexRegistryMap.get(trimmedName);
  if (!complex) {
    return {
      verified: false,
      code: 'INVALID_COMPLEX',
      message: '존재하지 않거나 등록되지 않은 단지명입니다.',
    };
  }

  // 3. 좌표 미등록 56개 단지 처리
  if (!complex.hasCoords || (complex.lat === 0 && complex.lng === 0)) {
    return {
      verified: false,
      code: 'COORDINATES_UNAVAILABLE',
      message: '해당 단지는 공식 위치 좌표가 등록되지 않아 GPS 인증이 지원되지 않습니다.',
    };
  }

  // 4. 입력 좌표 유효성 검사
  if (
    !Number.isFinite(userLat) ||
    !Number.isFinite(userLng) ||
    userLat < -90 ||
    userLat > 90 ||
    userLng < -180 ||
    userLng > 180 ||
    (userLat === 0 && userLng === 0)
  ) {
    return {
      verified: false,
      code: 'INVALID_COORDINATES',
      message: '유효하지 않은 GPS 좌표입니다.',
    };
  }

  // 5. 127개 좌표 등록 단지 하버사인 거리 계산 및 300m 판정
  const distance = calculateHaversineDistance(userLat, userLng, complex.lat, complex.lng);
  const roundedMeters = Math.round(distance);

  if (distance <= GPS_VERIFICATION_THRESHOLD_METERS) {
    return {
      verified: true,
      distanceMeters: roundedMeters,
      message: '단지 위치 인증이 완료되었습니다 (300m 이내).',
    };
  } else {
    return {
      verified: false,
      distanceMeters: roundedMeters,
      code: 'OUT_OF_RANGE',
      message: '단지 반경 300m 이내에 위치하지 않습니다.',
    };
  }
}

// ============================================================================
// 3. 30-Day Title Locking & Anti-Impersonation Engine
// ============================================================================

/**
 * 작성자의 30일 타이틀 고정 잠금 상태 검사
 *
 * 규칙:
 * 1. 프로필이 없거나 만료(now >= profile.titleExpiresAt)된 경우: 변경 허용 (allowed = true)
 * 2. 잠금 유효 기간(now < profile.titleExpiresAt) 중:
 *    - 요청한 타이틀이 기존 고정 타이틀과 동일한 경우: 허용 (allowed = true)
 *    - 요청한 타이틀이 기존 고정 타이틀과 다른 경우: 거부 (allowed = false, reason = 'TITLE_LOCKED_30_DAYS', 남은 일수 반환)
 */
export function checkTitleLock(
  profile: BoardAuthorProfile | null | undefined,
  requestedTitle: string,
  now: number = Date.now()
): TitleLockCheckResult {
  if (!profile || !profile.titleExpiresAt || now >= profile.titleExpiresAt) {
    return { allowed: true };
  }

  const cleanRequested = (requestedTitle || '').trim();
  const currentTitle = (profile.selectedTitle || '').trim();

  if (cleanRequested === currentTitle) {
    return { allowed: true };
  }

  // 30일 잠금 중 다른 타이틀로 변경 시도 -> 거부
  const msRemaining = profile.titleExpiresAt - now;
  const daysRemaining = Math.max(1, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));

  return {
    allowed: false,
    reason: 'TITLE_LOCKED_30_DAYS',
    daysRemaining,
  };
}
