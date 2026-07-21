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

