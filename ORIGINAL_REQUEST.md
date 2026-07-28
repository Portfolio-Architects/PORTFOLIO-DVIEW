# Original User Request

## Initial Request — 2026-07-18T00:13:52+09:00

D-VIEW 웹 애플리케이션의 전체 페이지(메인, 테크노밸리, 라운지, 뉴스 등) 간 이동 및 탭 전환 속도를 극대화하고, 모바일/데스크톱 뷰포트에서 버벅임 없는(Zero-Jank) 트랜지션 및 내비게이션 환경을 구현하는 UX 최적화 프로젝트입니다.

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend
Integrity mode: development

## Requirements

### R1. 페이지 간 전환 반응성 극대화 (Zero-Delay Navigation)
- Next.js 라우터/Link 기반 프리프레임/프리페치 메커니즘을 고도화하여 페이지 간 이동 딜레이를 최소화합니다.
- 마우스 호버(Hover) 시 Programmatic Prefetch를 활성화하여 리소스 로드 속도를 단축합니다.
- 페이지 전환 시 불필요한 데이터 중복 요청 및 상태 리셋을 방지하도록 SWR/React Context 수준의 캐싱을 점검 및 보강합니다.
- 서비스 워커(`public/sw.js`) 캐싱 정책을 개선하여 정적 JS 청크 및 데이터 JSON 파일의 로딩 속도를 가속합니다.

### R2. 탭 및 모달 진입/이탈 트랜지션 최적화 (Zero-Jank Transitions)
- 메인 데이터 랩 탭 전환(데이터 랩 ↔ 아파트 랩 ↔ 테크노밸리 랩 등) 및 스티키 헤더 동작 시 지연(Lag)과 Cumulative Layout Shift(CLS) 현상을 완전히 배제합니다.
- 주민 라운지(커뮤니티) 피드 및 상세 글 모달 진입/이탈 시의 렌더링 병목을 제거하고 부드러운 애니메이션 프레임(60fps)을 보장합니다.

### R3. 빌드 및 E2E 테스트 안정성 확보 (Verification & Build Stability)
- 모든 코드 수정 후 Next.js 프로덕션 빌드(`npm run build`)가 정상 작동해야 하며, TypeScript 컴파일 에러나 ESLint 위반이 없어야 합니다.
- 기존의 Playwright E2E 성능/라우팅 테스트 및 웹 접근성 자동 Audit 파이프라인(`npm run test:e2e` 또는 관련 스펙)을 100% 통과해야 합니다.

## Acceptance Criteria

### Build & Compilation
- [ ] `npm run build` 실행 시 컴파일 에러나 경고 없이 빌드가 완벽히 성공해야 함.

### E2E & Routing Verification
- [ ] `npm run test:e2e` 실행 시 `performance-ux.spec.ts` 및 `routing-bug.spec.ts`를 포함한 모든 E2E 테스트 스위트가 에러 없이 성공적으로 완료되어야 함.

### Performance & Transition UX
- [ ] 페이지/탭 간 이동 및 모달 호출 시 레이아웃 번쩍임(Layout Shift) 또는 멈춤 현상(Lag)이 없어야 함.
- [ ] 마우스 호버 및 포커스 시점에 백그라운드 프리로드/프리페칭이 정상적으로 개시되는지 코드 및 동작 수준에서 보장되어야 함.
- [ ] 탭 전환 및 페이지 이동 후 스크롤 위치가 정상적으로 처리되고, 스티키 헤더의 정합성이 유지되어야 함.

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

## Follow-up — 2026-07-22T07:19:44Z

Refactor the D-VIEW Real Estate & Techno-Valley Data Analytics Web Application (`frontend/`) and its Python Self-Improvement Loop (`self_improvement_loop/`) to achieve competition-winning quality (sub-100ms navigation, zero-jank glassmorphism UI/UX, 100% test coverage, and recursive feedback loops).

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW
Integrity mode: development

## Requirements

### R1. Web App Performance & UI/UX Perfection (Next.js App Router)
Refactor `frontend/src/` to ensure sub-100ms client route navigation across main routes (`technovalley`, `office`, `lounge`, `overview`, `imjang`), zero Cumulative Layout Shift (CLS < 0.05), seamless desktop header & mobile dock state synchronization, prefetching, and dark/light glassmorphism visual polish.

### R2. Recursive Feedback & Self-Improvement Loop Engine
Harden and expand the Python self-improvement engine (`self_improvement_loop/`) including `engine.py`, `simulator.py`, and `vcs.py`. Ensure automated code evaluation, recursive feedback ingestion, regression guardrails with automatic rollback, and continuous metric optimization.

### R3. Automated Test Verification & Forensic Audit
Ensure 100% test pass rate across all unit and integration test suites (`npm test`, `npx playwright test`, `pytest self_improvement_loop/`) and clean TypeScript build (`npm run build`). Generate a comprehensive forensic audit report summarizing performance gains, verification proof, and system architecture.

## Acceptance Criteria

### Web App Performance & UI Polish
- [ ] `npm run build` inside `frontend/` succeeds without TypeScript compilation errors or warnings.
- [ ] Route navigation transitions between all main sections (`technovalley`, `office`, `lounge`, `overview`, `imjang`) render seamlessly under 100ms.
- [ ] Visual layout shift score (CLS) stays strictly below 0.05 during interactive state changes and tab switches.
- [ ] Desktop `LoungeHeader` and `MobileDock` maintain 100% active route and state indicator synchronization.

### Self-Improvement & Recursive Feedback Engine
- [ ] `pytest self_improvement_loop/` executes cleanly with 100% passing tests.
- [ ] Simulation engine (`simulator.py`) demonstrates multi-iteration recursive feedback loops with automated metrics scoring and rollback safety.

### Verification & Forensic Integrity
- [ ] Jest unit tests (`npm test` in `frontend/`) and Playwright E2E tests (`npx playwright test`) pass with zero failing assertions.
- [ ] Final architecture summary and test result verification log generated.

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

