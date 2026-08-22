/**
 * @module api.config
 * @description External API configuration (MOLIT Real Estate API).
 * Architecture Layer: Config (externalized constants)
 * 
 * Rationale: API keys and endpoint parameters were hardcoded
 * in DashboardFacade.fetchDongtanApartments(). Extracting enables:
 * - Key rotation without code changes
 * - Environment-specific configuration
 * - Easy testing with mock endpoints
 */

/** MOLIT 공공데이터 실거래가 API 설정 */
export const MOLIT_API_CONFIG = {
  /** API Service Key (공공데이터포털 발급) */
  get serviceKey(): string {
    return process.env.PUBLIC_DATA_PORTAL_KEY || '';
  },
  /** 법정동 코드 (화성시: 41590) */
  lawdCode: '41590',
  /** 거래년월 (조회 기준 YYYYMM) */
  dealYearMonth: '202401',
  /** API Base URL */
  baseUrl: 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev',
  /** 요청 타임아웃 (ms) */
  timeoutMs: 3000,
  /** 한 페이지당 최대 결과 수 */
  numOfRows: 1000,
} as const;

/** Fallback 아파트 목록 (API 실패 시 사용) */
export const FALLBACK_APARTMENTS: readonly string[] = [
  "[오산동] 동탄역 롯데캐슬", "[청계동] 동탄역 시범더샵센트럴시티", "[청계동] 동탄역 시범한화꿈에그린프레스티지",
  "[오산동] 동탄역 반도유보라 아이비파크 5.0", "[오산동] 동탄역 반도유보라 아이비파크 6.0",
  "[오산동] 동탄역 반도유보라 아이비파크 7.0", "[오산동] 동탄역 반도유보라 아이비파크 8.0",
  "[영천동] 동탄역 센트럴푸르지오", "[송동] 동탄린스트라우스더레이크", "[산척동] 동탄호수공원 아이파크"
];
