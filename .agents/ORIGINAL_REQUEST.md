# Original User Request

## Initial Request — 2026-07-21T12:30:38Z

Refactor and upgrade the D-VIEW (디뷰) Real Estate & Techno-Valley Data Analytics Web Application to achieve a competition-winning (공모전 우승) standard across visual aesthetic design, sub-100ms navigation performance, modular architecture, and zero-error testing.

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW
Integrity mode: development

## Requirements

### R1. UI/UX Aesthetic & Visual Polish (Competition Top-Tier Standard)
- Transform key components (DashboardClient, MacroDashboardClient, LoungeModal, MobileDock, LoungeHeader) into modern, highly-polished user interfaces using dark/light theme consistency, smooth Glassmorphism cards, micro-interactions, clean typography, and interactive data visualization.
- Ensure all charts, tables, and maps adapt seamlessly across desktop, tablet, and mobile displays without horizontal scroll breaks or dynamic layout shifts (Cumulative Layout Shift < 0.05).

### R2. Sub-100ms Zero-Delay & Zero-Jank Navigation
- Enhance prefetching (Next.js Link hover prefetching & SWR cache strategies) and optimize client-side data state updates.
- Eliminate tab-switching delays across Data Lab, Apartment Lab, Technovalley, and Lounge detail modals.
- Ensure scroll positions, sticky headers, and active state indicators in the top bar and mobile dock remain strictly synchronized.

### R3. Modular Architecture, Type Safety & Strict Standardizing
- Enforce strict TypeScript typing across all components, API hooks, and data models.
- Clearly separate React Server Components (RSC) and Client Components with minimal client bundle size footprint.

### R4. Automated Testing & End-to-End Quality Verification
- Verify that npm run build in frontend/ passes without any TypeScript or linter errors.
- Ensure all unit tests (npm test) and E2E Playwright tests (npx playwright test) pass cleanly.

## Acceptance Criteria

### Automated Build & Test Passing
- [ ] npm run build in frontend/ succeeds with exit code 0 and zero TypeScript compiler warnings.
- [ ] All Jest unit tests pass with 100% success rate (npm test).
- [ ] Playwright E2E tests (npx playwright test) complete without failure.

### Visual & Interactive Precision
- [ ] Zero layout shift (CLS = 0) observed during tab navigation and modal transitions.
- [ ] Responsive design verified for Mobile Dock and Desktop Header matching active routes.
- [ ] Interactive chart and filtering widgets render smoothly with hover tooltips and dynamic animations.

## Follow-up — 2026-07-21T13:26:44Z

Audit, verify, and harden the data integrity, calculation consistency, and algorithm correctness across all data models, API parsers, tax simulation formulas, and analytics score computations in the D-VIEW (디뷰) Web Application.

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW
Integrity mode: development

## Requirements

### R1. Tax Benefit & Business Matching Algorithm Verification
- Audit tax reduction simulation formulas (acquisition tax, property tax, corporate tax reduction rates for Dongtan Techno-Valley migration) to match official local tax ordinances without precision drift.
- Verify Office FitFinder and Share-Office roommate matching algorithms for logical consistency and accurate scoring calculation.

### R2. Data Pipeline & Schema Integrity (SSOT & Public API Parsers)
- Audit data mapping and Zod validation schemas across Google Sheets SSOT, Ministry of Land XML transaction APIs, Hwaseong enterprise data, and Firestore DB.
- Ensure Upstash Redis L2 caching and SWR synchronization do not introduce stale data or desynchronization bugs.

### R3. Comprehensive Automated Audit Suite (npm run audit & Jest)
- Implement rigorous Jest unit and integration tests covering every data formula, parser edge-case, and schema validator.
- Ensure npm run audit executes cleanly with 100% pass rate across TypeScript compilation, ESLint, data consistency, and E2E test suites.

## Acceptance Criteria

### Data & Algorithm Precision
- [ ] All tax reduction simulation results match official tax ordinance formulas with 0 precision error.
- [ ] Data parsers handle all edge-case XML/JSON responses cleanly without falling back to corrupted or unvalidated states.

### Automated Test Passing
- [ ] npm run audit in frontend/ succeeds with exit code 0.
- [ ] All Jest unit/data tests (npm test) pass with 100% success rate.
- [ ] Zero TypeScript or linter warnings across data layer services and facades.

## Follow-up — 2026-07-27T14:48:57Z

디뷰(DVIEW) 웹/앱에서 최근 발생했던 모바일 뷰 컨텐츠 아웃라인 침범/깨짐 오류와 그래프 출력 오류의 재발을 방지하기 위한 코드 최적화, 렌더링 방어 로직 강화 및 구조적 리팩토링 수행

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW
Integrity mode: development

## Requirements

### R1. 모바일 레이아웃 및 아웃라인 방어 구조 리팩토링
- 다양한 모바일 디바이스 뷰포트(320px ~ 768px 및 가로/세로 모드)에서 컨텐츠 요소가 뷰포트를 벗어나거나 아웃라인이 겹치는 현상 차단.
- Flexbox/Grid container의 min-width: 0, overflow 관리 및 상대 단위(vw, %, rem) 기반 반응형 CSS 스타일 구조화.

### R2. 그래프/차트 렌더링 파이프라인 방어 로직 및 모듈화
- 모바일 뷰 동적 리사이즈(ResizeObserver/OrientationChange) 시 차트 Canvas/SVG 렌더링 시점 및 Dimension 계산 보장.
- 차트 데이터 입력값이 null, undefined, empty array, 또는 뷰포트 폭보다 지나치게 작거나/크더라도 에러 없이 Fallback UI가 정상 노출되도록 예외 처리 강화.
- 그래프 연산 로직과 UI DOM/Canvas 드로잉 로직 분리.

### R3. 모바일 성능 최적화 및 회귀 방지 구조 검증
- 모바일 디바이스 렌더링 시 불필요한 리렌더링 및 layout thrashing(리플로우) 최소화.
- 리팩토링된 모바일 컨텐츠 아웃라인 및 그래프 출력에 대한 검증용 테스트 코드/체크리스트 마련.

## Acceptance Criteria

### 모바일 UI & 레이아웃 검증
- [ ] 320px ~ 768px 및 화면 회전 시 컨텐츠 아웃라인 침범, 가로 스크롤 의도치 않은 발생 0건.
- [ ] 모바일 뷰 조작 시 UI element의 clipping 또는 overlapping 현상 없음.

### 그래프 출력 및 예외 처리 검증
- [ ] 차트 렌더링 데이터 부재 또는 이상값 입력 시 콘솔 에러 발생 없이 Fallback UI 또는 안전한 메시지 표출.
- [ ] 뷰포트 Resize 이벤트 연속 발생 시 차트가 비정상적으로 왜곡되거나 깨지지 않고 정해진 아웃라인 내에 안정적으로 렌더링.

## Follow-up — 2026-07-28T10:41:05Z

디뷰(DVIEW) 웹/앱 모바일 뷰 및 그래프 시스템의 2차 재귀적 자기개선(Recursive Self-Improvement) 루프 구동: 프레임 렌더링 성능 극대화, 메모리/네트워크 방어 로직 고도화 및 자동화 벤치마크/회귀 테스트 체계 완비

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW
Integrity mode: development

## Requirements

### R1. 모바일 UI 프레임 & 렌더링 퍼포먼스 극대화 (60FPS 보장)
- 모바일 디바이스 인터랙션(터치 스크롤, 모달 오픈, 탭 전환) 시 불필요한 메인 쓰레드 블로킹 제거 및 Layout Shift (CLS) 0 달성.
- CSS transform/opacity 렌더링 최적화 및 모바일 터치 제스처 반응성 강화.

### R2. 차트 대용량 데이터 스트리밍 & 메모리 누수 방어 고도화
- 실시간 또는 대용량 그래프 포인트 업데이트 시 메모리 누수(Memory Leak) 완전 방지 및 GC 압박 감소.
- Unmount / Viewport departure 시 애니메이션 프레임(requestAnimationFrame) 및 Event Listener 완전 해제 구조 검증.

### R3. 네트워크 지연/오프라인 상태 렌더링 방어 & 상태 복구
- 모바일 3G/Slow-network 및 순간 오프라인 전환 시 차트 및 모바일 컨텐츠의 Skeleton / Stale-While-Revalidate 방어 UI 노출.
- 네트워크 재연결 시 상태 자동 복구(Auto-Reconnection Sync) 파이프라인 적용.

### R4. 2차 회귀 검증 & 자동 벤치마크 스크립트 구축
- 모바일 뷰포트 & 그래프 렌더링 성능 벤치마크 검증 스크립트 작성 및 전체 단위/통합 테스트 green 상태 유지.

## Acceptance Criteria

### 모바일 UI/UX 성능 검증
- [ ] 모바일 터치 인터랙션 시 Frame Drop 최소화 (60FPS 유지) 및 CLS (Cumulative Layout Shift) < 0.01.
- [ ] 화면 전환 및 모달 토글 시 렌더링 딜레이 100ms 이내 유지.

### 그래프 메모리 & 네트워크 방어 검증
- [ ] 대용량 그래프 재렌더링 10회 연속 실행 후에도 Heap Memory 증가율 5% 이내 제어 (메모리 누수 0건).
- [ ] 오프라인/네트워크 오류 시 에러 화면 대신 Skeleton/Stale 캐시 데이터 노출 및 자동 재연결 복구 동작 성공.


