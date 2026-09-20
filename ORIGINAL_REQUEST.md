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

## Follow-up — 2026-08-22T14:50:24+09:00

동탄 거주민 및 반도체 클러스터(삼성전자·기흥/화성/평택 소부장 밸류체인) 종사자를 위한 부동산, 주식/산업, 러닝/산책, 축제/행사, 맛집을 아우르는 '동탄 지역 올인원 하이퍼로컬 슈퍼앱'으로의 서비스 최대 목적함수 확장 및 엔지니어링 리포트 전면 최신화/고도화.

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW
Integrity mode: development

## Requirements

### R1. 서비스 최대 목적함수 공식 개정 및 비전 수립
- 서비스의 정체성을 단순 '부동산 가치분석 허브'에서 동탄 3040 패밀리 및 반도체 산업 종사자의 일상·자산·여가를 책임지는 **'동탄 하이퍼로컬 올인원 슈퍼앱(Dongtan Super-App)'**으로 공식 재선언.
- 5대 핵심 도메인 확장 정의:
  1. **부동산 (Real Estate)**: 실거래가, 상대가치(Utility Score/PER), 초품아 안심 통학 큐레이션, 단지별 상세 분석
  2. **주식 및 산업 (Stocks & Industry)**: 삼성전자 및 기흥·화성·평택 반도체 소부장(소재·부품·장비) 클러스터 기업 시세, 밸류체인 동향, 임직원 인사이트
  3. **러닝 및 산책 (Running & Trails)**: 동탄호수공원, 치동천, 신리천, 반석산 등 주요 테마별 러닝/산책 코스 실측 거리, 난이도, 편의시설 안내
  4. **축제 및 문화 (Festivals & Events)**: 동탄호수공원 루나쇼 일정, 화성시·동탄출장소 주관 문화행사/주민자치 강좌 큐레이션
  5. **맛집 및 로컬 상권 (Dining & Hotplaces)**: 동탄 영천동/호수공원/카림애비뉴 등 주요 상권별 실방문 인증 맛집, 앵커 테넌트, 키즈 프렌들리 스팟

### R2. 엔지니어링 리포트 (`PORTFOLIO DVIEW - Engineering Report.md`) 전면 고도화
- **Executive Summary & Tech Stack**: 5대 도메인 확장에 따른 시스템 아키텍처, 데이터 파이프라인(공공데이터, 증권 API, 로컬 문화 포털) 다변화 설계 반영.
- **도메인별 데이터 소스 & UI/UX 로드맵**:
  - 파스텔톤 귀여운(Cute) 컨셉 & Urban Emerald 디자인 시스템의 신규 도메인 컴포넌트 확장 규칙 정립.
  - 수익화(Monetization) 모델 확장: 구글 애드센스 + 반도체 직장인/지역 소상공인 맞춤 B2B CPA 타겟팅 광고 모델 구체화.
- **Future Roadmap (단계별 실행 계획)**: 슈퍼앱 전환을 위한 1단계(문서/기획/IA) → 2단계(데이터셋 및 API 연동) → 3단계(UI 탭 및 위젯 릴리즈) 세부 마일스톤 업데이트.

### R3. 프로젝트 SSOT 및 에이전트 가이드라인 동기화
- `AGENT.md`, `PROJECT.md`, `PORTFOLIO DVIEW - Patch History.md` 등 프로젝트 핵심 문서에 개정된 최대 목적함수와 아키텍처 원칙을 일관되게 동기화.
- 기존의 무결성 원칙(TypeScript Strict Type, Jest 단위 테스트 100% 통과, Zero-Jank 120fps UX)을 슈퍼앱 전 영역의 품질 지표로 계승.

## Acceptance Criteria

### 엔지니어링 리포트 및 기획 무결성
- [ ] `PORTFOLIO DVIEW - Engineering Report.md`에 5대 도메인(부동산, 주식/소부장, 러닝, 축제, 맛집)에 대한 비즈니스 목적함수, 정보 아키텍처(IA), 데이터 파이프라인 설계, 로드맵이 누락 없이 상세하게 작성되어야 함.
- [ ] `AGENT.md` 및 `PROJECT.md`에 개정된 슈퍼앱 비전과 에이전트 자율 개선 루프가 명시되어야 함.
- [ ] `PORTFOLIO DVIEW - Patch History.md`에 이번 목적함수 고도화 및 엔지니어링 리포트 개정 내역이 표준 포맷으로 기록되어야 함.

### 시스템 품질 및 빌드 검증
- [ ] TypeScript 컴파일 검사 (`npx tsc --noEmit`) 에러 0건 유지.
- [ ] Jest 단위 테스트 스위트 전수 통과 확인.

## Follow-up — 2026-08-22T16:03:20+09:00

동탄 하이퍼로컬 슈퍼앱 D-VIEW의 메인 랜딩 페이지를 '아파트 랩(Apartment Lab)'으로 전면 재배치하고, '일자별 최근 실거래(Daily Real Transactions)' 컴포넌트의 UX/UI를 동탄 주민과 투자자가 직관적으로 탐색할 수 있도록 프리미엄 금융/부동산 앱 수준(토스/직방/호갱노노급)으로 전면 고도화한다.

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW
Integrity mode: development

## Requirements

### R1. 메인 라우팅 및 탭 우선순위 재배치 (아파트 랩 1순위화)
- 루트 경로(`/`)에 **아파트 랩(Apartment Lab, 매크로 대시보드 및 실거래/시세 허브)**을 기본 렌더링하고, 기존 테크노 랩은 `/techno` (또는 지정 서브 랩)으로 배치.
- 상단 헤더(`LoungeHeader`) 및 모바일 하단 독(`MobileDock`)의 탭 순서를 **[1. 아파트 랩, 2. 아파트 탐색, 3. 테크노 랩, 4. 사무실 탐색]**으로 일관되게 재배열.
- URL 딥링크, 브라우저 히스토리 (`pushState`/`popstate`), PWA 바로가기 숏컷 및 `HeaderDockSync.test.tsx` 동기화 무결성 보장.

### R2. '일자별 최근 실거래' UX/UI 전면 고도화
- **스마트 멀티 필터 바 구축**:
  - 권역/동 필터 (동탄1/2동 및 개별 동 선택 드롭다운/칩)
  - 평형대 필터 (소형 20평 미만, 중소형 20평대, 국평 30평대, 대형 40평대 이상)
  - 거래 유형 필터 (전체, 신고가🔥, 상승거래, 하락/급매거래)
- **일자별 타임라인 그룹핑 & 거래 요약 헤더**:
  - 일자별 섹션 상단에 당일 거래 건수 및 평균 거래가 요약 뱃지 제공 (예: `8월 21일 (목) · 총 4건 거래`)
  - 날짜 헤더 스티키(Sticky) 지원으로 스크롤 시에도 현재 탐색 중인 거래 일자를 명확히 인지.
- **실거래 카드 타이포그래피 & 시각 정보 계층 고도화**:
  - 거래 가격(`OO억 O,OOO만`)의 볼드한 시인성 강화 및 직전 실거래 대비 상승/하락폭(%), 신고가 뱃지 정돈.
  - 전용면적(㎡) / 공급면적(평) 단위 원클릭 토글 실시간 반영.
  - 카드 클릭 시 해당 아파트 단지의 종합 밸류에이션 분석 모달(`FieldReportModal`)로 매끄럽게 연결.
  - 카드 호버/터치 시 차트 추세선 하이라이트 인터랙션 유지 및 지연 시간(Zero-Jank) 최적화.
- **페이지네이션 및 성능 최적화**:
  - 답답한 더보기 버튼을 직관적인 무한 스크롤 / 인피니트 뷰 또는 세련된 가상화 리스트로 개편하여 수백 건의 거래도 120fps 부드러운 스크롤 보장.

### R3. 일관된 세련된 디자인 시스템 (#fcfbfa 웜 화이트 테마 및 스티키 헤더 연동)
- 개편된 `#fcfbfa` 초경량 웜 화이트 테마 및 소프트 라운딩(`rounded-2xl`), 서브틀 보더(`--border-color`), 글래스모피즘과 완벽한 시각적 통일성 유지.
- 데스크톱 스티키 헤더 및 모바일 제스처 독과의 레이아웃 충돌 제로 보장.

## Acceptance Criteria

### 라우팅 및 네비게이션 무결성
- [ ] 브라우저에서 `http://localhost:5000/` 접속 시 **아파트 랩**이 즉시 기본 표시되어야 함.
- [ ] 데스크톱 헤더 및 모바일 독의 1번 탭이 **'아파트 랩'**으로 일치하고, 탭 전환이 깜빡임 없이 즉각 반응해야 함.
- [ ] `HeaderDockSync.test.tsx`가 개정된 탭 순서로 100% 통과해야 함.

### 일자별 실거래 UX/UI 고도화 검증
- [ ] 동별, 평형별, 거래타입별(신고가/상승/하락) 필터 적용 시 실거래 리스트가 지연 없이 정확히 필터링되어야 함.
- [ ] 일자별 그룹 헤더에 날짜 및 거래 요약 정보가 깔끔하게 노출되어야 함.
- [ ] 실거래 카드 클릭 시 해당 아파트의 상세 분석 모달이 정상 오픈되어야 함.

### 시스템 품질 및 빌드 검증
- [ ] `npx tsc --noEmit` 실행 시 TypeScript 컴파일 에러 0건.
- [ ] `npm test` 전체 단위/통합 테스트 스위트 전수 통과 (86+ Suites, 100% Green).

## Follow-up — 2026-08-22T20:13:27+09:00

동탄 하이퍼로컬 슈퍼앱 D-VIEW의 아파트 랩(Apartment Lab) 메인 피드 하단 '일자별 최근 실거래(MacroTimelineView)' 섹션의 컴포넌트 아키텍처 및 UX를 고도화하여, 스마트 원터치 필터 칩 바, 실시간 검색 및 다중 정렬, 카드/컴팩트 리스트 뷰 전환 토글, 일자별 거래 요약 헤더(최고가 하이라이트), 관심 단지 토글 및 상세 리포트 연동 기능을 구현합니다.

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend
Integrity mode: development

## Requirements

### R1. 스마트 원터치 필터 칩 바 & 검색/다중 정렬 시스템
- [전체, 동탄1, 동탄2, 신고가🔥, 30평대 국평, 10억 클럽, 대장단지] 등의 원터치 퀵 필터 칩 바를 제공하고, 기존 권역/법정동/단지 드롭다운과 유기적으로 동기화합니다.
- 단지명 실시간 인라인 검색창과 다중 정렬 기준(최신 계약순, 실거래가 높은순, 상승률 높은순, 전용면적순) 선택 기능을 지원합니다.

### R2. 와이드 카드 그리드 뷰 vs 컴팩트 리스트 뷰 모드 토글
- 사용자가 데이터 탐색 목적에 따라 카드 그리드 뷰(3열 와이드 카드 형태)와 컴팩트 리스트 뷰(다량의 거래를 한눈에 스캔하는 테이블/행 형태)를 원터치로 전환할 수 있는 뷰 모드 컨트롤러를 제공합니다.
- 모바일과 데스크톱 뷰포트에서 각각 최적화된 레이아웃과 서체 스케일을 유지합니다.

### R3. 일자별 거래 요약 헤더 & 최고가 하이라이트 배지
- 스티키 일자 헤더에 당일 총 거래 건수, 평균 실거래가 요약뿐만 아니라 당일 최고가 거래 단지 하이라이트 배지(예: 👑 최고가: 동탄역 롯데캐슬 16.5억)를 직관적으로 표시합니다.

### R4. 실거래 카드/리스트 인터랙션 확장 및 모달 딥링크
- 개별 실거래 아이템에 관심 단지(즐겨찾기 하트) 토글 버튼, 직전 실거래 대비 변동폭 및 평당 환산가 안내, 클릭 시 해당 단지의 상세 분석 리포트(`FieldReportModal` / `AptModal`) 원터치 진입 인터랙션을 지원합니다.

### R5. 제로 레이아웃 시프트(CLS < 0.01) 및 성능 최적화
- `#fcfbfa` 초경량 웜 화이트 테마, 다크 모드, `rounded-2xl` 라운딩, 스티키 헤더 고정, 무한 스크롤/가상화 및 60fps 부드러운 스크롤 성능을 완벽히 유지합니다.

## Acceptance Criteria

### 데이터 연동 및 UI/UX 인터랙션 검증
- [ ] 원터치 필터 칩(전체, 동탄1/2, 신고가, 30평대, 10억+ 등) 및 검색/정렬 조건 변경 시 실거래 목록이 실시간으로 정확하게 필터링 및 재정렬되어야 함.
- [ ] 뷰 모드 토글(카드 뷰 / 리스트 뷰) 전환 시 레이아웃 시프트 없이 즉시 반응하고 현재 필터 상태가 온전히 유지되어야 함.
- [ ] 일자별 헤더에 당일 거래량, 평균가, 최고가 단지 하이라이트가 데이터 기반으로 정확히 렌더링되어야 함.
- [ ] 실거래 항목 클릭 시 단지 상세 모달이 정상 오픈되고, 즐겨찾기 토글이 정상 동작해야 함.
- [ ] 모바일/데스크톱 환경에서 스티키 헤더 및 반응형 레이아웃이 깨짐 없이 동작해야 함.

### 시스템 품질 및 테스트 통과
- [ ] `npx tsc --noEmit` 실행 시 TypeScript 컴파일 에러 0건.
- [ ] Jest 단위/통합 테스트(`npm test`) 전수 통과 (100% Green).

## Follow-up — 2026-08-22T12:50:40Z

동탄 하이퍼로컬 슈퍼앱 D-VIEW 전반의 앱 구동 속도, 렌더링 런타임 성능(60fps/Zero-Jank), 메모리 사용량 최적화, 초기 로딩 번들 경량화 및 네트워크/오프라인 예외 복구성을 극대화하기 위한 종합 안정성 & 성능 리팩토링을 실시합니다.

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend
Integrity mode: development

## Requirements

### R1. 렌더링 런타임 및 메모리 누수 방지 최적화
- 메인 대시보드(`MacroDashboardClient`, `TechnoValleyDashboard` 등)와 하위 컴포넌트의 불필요한 재렌더링 경로를 전수 차단합니다 (`React.memo`, `useMemo`, `useCallback` 의존성 배열 및 얕은 비교 정밀화).
- 대용량 실거래 및 단지 리스트 탐색 시 DOM 노드 폭증을 방지하고 이벤트 리스너/IntersectionObserver/타이머 구독 해제 누락을 전수 검사하여 메모리 릭(Memory Leak)을 원천 차단합니다.

### R2. 번들 크기 경량화 및 초기 로딩(FCP / LCP) 가속화
- 초기 로드 시 불필요한 무거운 모달 컴포넌트(`FieldReportModal`, `AptCompareModal`, `SellTimingCalculatorModal`, `AptFitFinder` 등) 및 시각화 라이브러리에 `next/dynamic` 지연 로딩(Code Splitting)과 스켈레톤/플레이스홀더를 적용합니다.
- 메인 번들 청크 크기를 슬림화하여 모바일 저대역폭 환경에서도 즉각적인 First Contentful Paint(FCP < 1.0s)를 달성합니다.

### R3. 데이터 페칭 계층 & SWR/로컬 캐시 동기화 안정화
- SWR, IndexedDB, LocalStorage 데이터 페칭 시 중복 요청(Deduping)과 불필요한 네트워크 트래픽을 방지하고, stale-while-revalidate 캐싱 수명주기를 정밀하게 조정합니다.
- 백그라운드 재동기화 및 탭 포커스 리페칭 시 화면 깜빡임(Flash/Jank) 없는 부드러운 상태 갱신을 보장합니다.

### R4. 컴포넌트별 에러 바운더리 & 네트워크 복구성(Resilience) 강화
- 상위 앱 전체 크래시를 방지하기 위해 핵심 위젯 및 독립 기능 영역별로 `ErrorBoundary`를 배치하고 직관적인 인라인 재시도(Retry) UI를 제공합니다.
- 오프라인 또는 네트워크 순단 발생 시 캐시된 데이터를 기반으로 무중단 렌더링 및 사용자 알림 토스트를 제공합니다.

### R5. 회귀 방지 및 무결성 검증
- 모든 리팩토링 후 기존 비즈니스 로직, 멀티필터, 도넛 차트, 2x2 메트릭 카드 및 PWA 기능의 100% 정상 작동을 보장합니다.

## Acceptance Criteria

### 성능 및 렌더링 벤치마크
- [ ] 대시보드 탭 전환 및 필터 조작 시 불필요한 부모/자식 연쇄 리렌더링이 발생하지 않고 부드러운 프레임레이트(60fps)가 유지되어야 함.
- [ ] 모달 및 무거운 서브컴포넌트가 필요 시점에만 동적으로 로드되어 초기 번들 오버헤드가 감소해야 함.
- [ ] 컴포넌트 마운트/언마운트 사이클 반복 시 메모리 누수 및 미해제 옵저버/리스너가 존재하지 않아야 함.
- [ ] 네트워크 에러 발생 시 전체 페이지 크래시 없이 해당 섹션의 에러 폴백 및 재시도 버튼이 정상 동작해야 함.

### 시스템 품질 및 빌드 검증
- [ ] `npx tsc --noEmit` 실행 시 TypeScript 컴파일 에러 0건.
- [ ] Jest 전체 단위/통합 테스트(`npm test`) 전수 통과 (100% Green, 99+ test suites).

## 2026-09-16T15:20:16Z

# D-VIEW 메인페이지 애드센스(AdSense) 수익률 극대화 데이터 표출 및 구조 개편

D-VIEW 메인페이지에 고단가(High-CPC) 금융/부동산 타깃 데이터와 사용자 체류시간(Dwell Time)을 극대화하는 실시간 랭킹 위젯을 배치하고, 구글 애드센스 정책을 준수하는 자연스러운 인피드 광고 슬롯을 최적 배치하여 애드센스 수익률(RPM/CTR)을 극대화합니다.

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend
Integrity mode: development

## Requirements

### R1. 고단가(High-CPC) 금융·정책자금 데이터 연계 섹션
메인페이지 상·중단에 고단가 광고 단가(CPC)가 매칭되는 부동산 금융 핵심 데이터 위젯(신생아 특례·디딤돌·보금자리론 등 정책대출 모의계산기 간이 위젯, 전세보증금 반환보증 안심진단 퀵 프리뷰)을 배치하여 금융/대출 관련 고수익 광고 매칭률을 유도합니다.

### R2. 체류시간(Dwell Time) & 페이지뷰(PV) 극대화 실시간 랭킹 보드
사용자가 페이지에 오래 머물고 상호작용하도록 유도하는 동적 랭킹 위젯(동탄 전역 실시간 신고가 갱신 TOP 10, 전세가율/갭 최적 단지 순위, 주간 거래량 급상승 단지)을 메인에 표출하고, 탭 전환 및 단지 클릭 시 상세 분석으로 매끄럽게 연결합니다.

### R3. 애드센스 정책 준수형 반응형 인피드(In-Feed) 및 컨텍스추얼 광고 슬롯 최적화
콘텐츠 탐색 흐름을 방해하지 않으면서 광고 주목도를 높이도록 메인 피드 및 랭킹 섹션 사이에 반응형 인피드 광고 슬롯(AdSlot)을 전략적으로 배치합니다. 모든 광고 슬롯은 Zero-CLS(누적 레이아웃 이동 방지) 최소 높이 스켈레톤과 명확한 구글 가이드라인(스폰서 표시)을 준수합니다.

## Acceptance Criteria

### 기능 및 데이터 정합성
- [ ] 메인페이지에 정책금융/대출 간이 계산 위젯 및 전세보증금 반환보증 프리뷰가 정상 렌더링되며, 클릭 시 상세 기능으로 인터랙션이 동작한다.
- [ ] 실시간 신고가, 갭 순위, 거래량 급상승 랭킹 보드가 정상 표출되고 탭 전환 및 단지 클릭 동작이 무결하게 작동한다.
- [ ] 메인페이지 주요 섹션 흐름 사이에 Zero-CLS 스켈레톤이 적용된 반응형 AdSlot 컴포넌트가 전략적으로 배치된다.

### 성능 및 코드 무결성
- [ ] `npx tsc --noEmit` 실행 시 TypeScript 컴파일 오류가 0건이어야 한다.
- [ ] 기존 및 신규 단위/통합 테스트(`npx jest`)가 100% 통과하여 기존 기능에 회귀 버그가 발생하지 않는다.
- [ ] 모바일 및 데스크톱 뷰포트에서 레이아웃 깨짐(Zero-CLS) 없이 반응형 디자인이 매끄럽게 렌더링된다.

## Verification Resources
- 프로젝트 내 기존 테스트 스위트: `npm test` / `npx jest`
- 타입스크립트 정적 분석: `npx tsc --noEmit`
- 기존 애드센스 광고 슬롯 컴포넌트: `src/components/ads/AdSlot.tsx`
- 기존 금융/진단 모달 자산: `src/components/apartment-modal/` 및 `src/app/calculator/`
## 2026-09-19T02:46:51Z

This is a single self-contained fix; keep it small and focused.

Resolve an apartment market price trend data integrity defect where 2020-built complexes (such as 동탄역 힐스테이트) erroneously display synthetic historical prices dating back to 2008 due to unconditional macro trend backfilling. Ensure that individual complex charts only display data starting from the complex's actual first transaction, eliminating any fabricated pre-construction history while preserving valid post-launch monthly interpolations.

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend
Integrity mode: development

## Requirements

### R1. 준공 및 최초 실거래 이전 기간의 과거 데이터 가상 외삽(Backfill) 전면 차단
- 특정 아파트 단지가 선택되었을 때, 해당 단지의 최초 실거래 발생 월 이전 기간에 대해 동탄 전체 매크로 시세를 역산·곱하여 가상의 과거 시세를 생성하는 로직을 제거합니다.
- 단지의 최초 유효 실거래 이전 월에 대해서는 차트 데이터 포인트가 null 또는 미생성 처리되어야 합니다.

### R2. 'ALL' 및 기간 필터 선택 시 x축 렌더링 범위 동적 보정
- 'ALL' 필터 선택 시 차트의 시작점이 매크로 전체 데이터의 시작점(2008년)으로 고정되지 않고, 해당 단지의 최초 유효 실거래 월(동탄역 힐스테이트의 경우 2020년 말)부터 시작되도록 범위를 계산합니다.
- 단축 기간(3M, 6M, 1Y, 3Y, 5Y) 선택 시에도 선택된 기간 내의 유효 거래 데이터를 정확히 반영합니다.

### R3. 최초 거래 이후의 미거래 월(공백기) 보간 유지
- 최초 실거래 발생 이후부터 현재 시점 사이에 실제 거래가 발생하지 않은 월에 대해서는 직전 실거래가 기반의 연속선(보간)을 유지하여 차트의 단절을 방지합니다.

## Acceptance Criteria

### 데이터 정합성 검증
- [ ] '동탄역 힐스테이트' 선택 시 2020년 12월(최초 실거래 발생월) 이전의 데이터 포인트(2008년~2020년 11월)가 차트 데이터에 포함되지 않음
- [ ] 'ALL' 타임프레임 활성화 시 x축 시작 레이블이 2008년이 아닌 2020년 이후 시점으로 렌더링됨
- [ ] 다른 아파트 단지 선택 시에도 각 단지의 최초 실거래 발생 시점 이전의 가상 데이터가 생성되지 않음
- [ ] 최초 실거래 이후 거래가 없는 월은 직전 거래가 기반으로 부드럽게 보간됨

### 회귀 테스트 및 빌드 검증
- [ ] 단위 테스트(`npm test` 또는 Jest 테스트)에서 차트 데이터 생성 및 필터링 로직 검증 통과
- [ ] `npm run build`를 실행하여 TypeScript 타입 오류 및 빌드 오류 없이 정상 완료

## 2026-09-19T03:53:08Z

국토교통부 아파트 실거래가(매매 및 전월세) 수집부터 Firestore 적재, 정적 캐시 생성, 대시보드 반영에 이르는 파이프라인의 업데이트 신속성(수집 주기 최적화 및 지연 최소화)과 데이터 정합성(취소 거래 역반영, 중복 방어, 단지명 매핑 정규화, 이상치 필터링)을 고도화합니다.

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend
Integrity mode: development

## Requirements

### R1. 실거래 데이터 수집 및 동기화 신속성(Timeliness) 고도화
국토교통부 매매 및 전월세 실거래가 데이터를 최신 상태로 지연 없이 동기화할 수 있도록 수집 파이프라인을 최적화하고, 신규 거래 발생 시 서비스 대시보드와 개별 단지별 데이터셋에 신속히 반영되도록 처리 효율을 극대화합니다.

### R2. 계약 해제/취소 및 중복 거래에 대한 정합성(Integrity) 보장
신고 취소 및 계약 해제 거래(해제사유발생일 표기 데이터)가 단지별 통계, 최고가/최저가, 최근 거래 피드, 거시 트렌드 지표에 잔존하거나 왜곡을 일으키지 않도록 정제 및 역반영 메커니즘을 확립하고, 동일 거래의 중복 적재를 원천 차단합니다.

### R3. 단지명 정규화 및 이상치/직거래 필터링 정밀화
공공 API의 아파트 단지명 표기와 서비스 내 179개 단지 카탈로그(`dong-apartments.ts`) 간 매핑 누락을 방지하기 위한 정규화 규칙을 보강하고, 통계 왜곡을 유발하는 비정상 가격 급등락(IQR 및 롤링 윈도우 기반) 데이터를 객관적으로 필터링합니다.

### R4. 파이프라인 검증 및 복원력(Resilience) 보장
공공 API 일시 지연, 타임아웃, 응답 형식(XML/JSON) 불일치 등 외부 장애 요인에도 파이프라인이 크래시 없이 안전하게 복구되어야 하며, 데이터 수집 결과가 Zod 스키마 검증 및 기존 Jest 단위/통합 테스트를 100% 통과하도록 합니다.

## Acceptance Criteria

### 신속성 및 파이프라인 효율
- [ ] 수집 스크립트(`fetch-transactions.js`, `fetch-rent.js`)의 증분 수집 및 쓰기 비용 절감 로직이 유지되면서 실행 지연 없이 안정적으로 완료된다.
- [ ] 동기화 파이프라인(`sync-transactions.js`)을 거쳐 생성되는 대시보드 통계 및 정적 파일(`tx-summary.json`, `recent-transactions.json`, `macro-trend.json`, `public/tx-data/*.json`)이 최신 일자 기준으로 정합하게 빌드된다.

### 데이터 정합성 및 무결성
- [ ] 취소/해제 거래(cdealDay/cdealType 존재 건)가 Firestore 및 최종 정적 요약/최근 거래 목록에서 완전히 제외되거나 취소 상태로 정확히 처리된다.
- [ ] 복합 키(`_key`) 생성 및 Firestore 적재 시 동일 거래 중복 등록 건수가 0건으로 유지된다.
- [ ] 서비스 179개 단지 카탈로그와 국토부 실거래 데이터 간 매핑 누락(Unmapped orphan records)이 발생하지 않는다.
- [ ] 비정상 극단치(이상 급락/급등가)가 통계 산출(평균가, 신고가, 주간 증감률)에서 누락 없이 배제된다.

### 자동화 테스트 및 복원력
- [ ] Jest 파이프라인 테스트(`npm test -- src/__tests__/pipeline.test.ts`) 및 데이터 검증 스크립트(`node scripts/validate-transactions.js`)가 에러 없이 100% 통과(PASS)한다.
- [ ] 외부 API 통신 실패 또는 데이터 포맷 이상 발생 시에도 안전한 로깅과 함께 파이프라인 프로세스가 비정상 종료되지 않는다.

## 2026-09-19T05:29:18Z

동탄 신도시 182개 단지, 18개년(2006~2026) 누적 실거래가 169,777건 전수를 대상으로 분석 범위를 대폭 확장하되, **Firestore 클라우드 비용(Read/Write)을 $0(무료 티어 범위)으로 방어**하는 정적 캐시 아키텍처를 기반으로 전수 장기 통계 리포트, 기간별(90일/1년/3년/전체) 실거래 탐색 및 대용량 브라우저 렌더링 최적화를 구현합니다.

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend
Integrity mode: development

## Requirements

### R1. 18개년 17만 건 전수 실거래가 장기 통계 및 매크로 지표 사전 집계
기존 90일 중심 통계를 넘어, 169,777건 전수 데이터를 기반으로 단지별·평형별 역대 최고가/최저가 전수 기록, 연도별 거래량 추이, 장기 시세 상승률 통계를 빌드 타임에 사전 컴파일하여 클라이언트 성능 저하 없이 즉시 서빙되도록 집계 파이프라인을 고도화합니다.

### R2. 실거래 피드 기간 선택 필터(90일 / 1년 / 3년 / 전체) 및 정적 청크 서빙
기존 90일 고정(`recent-transactions.json`) 서빙 구조에서 탈피하여, 사용자가 원하는 기간(최근 90일, 1년, 3년, 전체)을 선택하여 실거래를 조회할 수 있도록 기간별 분할 정적 청크 또는 온디맨드 로딩 파이프라인을 구축합니다.

### R3. Firestore 비용 제로화 아키텍처 (Zero Direct Client Reads & Incremental Sync)
* **클라이언트 직통 읽기 차단**: 웹 방문자가 17만 건 전수 데이터나 장기 기간 필터를 조회하더라도 브라우저에서 Firestore를 직접 쿼리하지 않고, Vercel CDN 정적 청크 파일(`public/tx-data/*.json` 등)을 통해 서빙하여 클라이언트발 Firestore Read 비용을 0원으로 방어합니다.
* **파이프라인 비용 최적화**: 일일 수집/동기화 시 매번 17만 건 전체를 Firestore에서 Full Scan하지 않고, 로컬 정적 데이터셋과 최근 3개월 증분 델타(`existingMap`) 비교 방식을 유지하여 Firestore 무료 티어(일 50,000 Reads / 20,000 Writes) 내에서 상시 구동되도록 보장합니다.

### R4. 대용량 실거래 조회 시 클라이언트 성능 최적화 (가상화 및 메모리 누수 방지)
기간 확장 시 수천~수만 건의 실거래 데이터가 로드되더라도 초기 페이지 번들 크기(LCP)와 브라우저 반응성(FPS)이 저하되지 않도록 가상화 리스트(Virtual Scrolling) 또는 점진적 렌더링을 적용하여 부드러운 스크롤과 메모리 효율을 보장합니다.

### R5. 전수 데이터 정합성 감사 및 자동화 테스트 100% 통과
17만 건 전수 집계 결과가 취소 거래 제외, 중복 방어, 단지명 매핑 규칙을 완벽히 준수하도록 데이터 검증기(`validate-transactions.js`) 및 Jest 파이프라인 테스트를 확장하고 모든 기존 기능과의 회귀 테스트를 100% 통과하도록 보장합니다.

## Acceptance Criteria

### Firebase 비용 및 서빙 아키텍처
- [ ] 일반 사용자가 기간 필터(전체/3년/1년/90일)를 전환하거나 대량 실거래를 조회할 때 클라이언트에서 발생하는 Firestore Read 요청이 0건이다 (CDN 정적 파일로 서빙).
- [ ] 동기화 스크립트 실행 시 Firestore 읽기/쓰기 연산이 최근 3개월 델타 및 캐시 비교로 제한되어 Firebase 무료 쿼터 내에서 실행 완료된다.

### 전수 데이터 집계 및 파이프라인
- [ ] 182개 단지 169,777건 전수 데이터가 집계 파이프라인(`sync-transactions.js` 등)을 거쳐 역대 누적 통계 지표로 빌드 타임에 컴파일된다.
- [ ] 단지별 역대 최고가 및 장기 상승률 통계가 취소 거래 없이 정합하게 산출된다.

### 기간 필터 및 UI 성능
- [ ] UI 상에서 실거래 피드를 기간별(최근 90일, 1년, 3년, 전체)로 전환하여 조회할 수 있는 필터 컨트롤이 동작한다.
- [ ] 90일 기본 뷰는 기존처럼 100KB 이하의 초경량 로딩을 유지하여 초기 LCP 성능 저하가 발생하지 않는다.
- [ ] 1년/3년/전체 기간 선택 시 온디맨드로 데이터를 불러와 수천 건 이상의 거래 목록이 60fps로 매끄럽게 렌더링된다.

### 정합성 및 테스트
- [ ] Jest 파이프라인 테스트 및 검증 스크립트가 100% 통과(PASS)한다.
- [ ] TypeScript 컴파일(`npx tsc --noEmit`) 에러 0건을 유지한다.

## 2026-09-19T10:34:44Z

DVIEW 서비스에서 관리자 페이지(/admin), 커뮤니티(라운지 및 게시글/댓글), 사용자 로그인/인증(Firebase Auth) 기능을 완전히 제거하고, 기존 관리자 업무는 안티그라비티 및 로컬 CLI 스크립트로 수행할 수 있도록 프론트엔드/백엔드 코드베이스를 경량화 및 정리합니다.

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend
Integrity mode: development

## Requirements

### R1. Remove Admin Features and Routes
Completely remove the web administrator interface (`/admin/*`) and its backend API endpoints (`/api/admin/*`). All administrative operations previously handled through the web UI (such as data inspection, manual updates, and reports) must be manageable purely via local scripts and development tools without requiring web-based admin pages.

### R2. Remove Community (Lounge) Features and Routes
Completely remove community and lounge features across the application. This includes deleting the lounge pages (`/lounge/*`), post creation and feed components, comment systems, and related community API endpoints (`/api/posts`, `/api/comments`), as well as removing lounge tabs, links, and navigation items from headers, navigation docks, and dashboards.

### R3. Remove User Authentication and Login System
Completely remove user authentication and login functionality from the client and server. The application must operate purely as an open, public informational service without login modals, Google Auth popups/redirects, session cookies, auth contexts/guards, user profiles, or user-specific state.

### R4. Navigation, UI, and Test Suite Maintenance
Update application layout, navigation components, and header/dock bars so no broken links or orphaned UI triggers for admin, community, or login remain. Clean up or adapt existing unit and integration tests to match the removed features and ensure that the build and test suites pass without regression in the remaining core features.

## Acceptance Criteria

### Build & Typecheck
- [ ] `npm run build` succeeds with exit code 0 and zero TypeScript or Next.js build errors.
- [ ] `npm run lint` succeeds with no linting errors related to removed features or unused imports.

### Admin Removal Verification
- [ ] Accessing `/admin` routes no longer serves an admin portal (routes are deleted or return 404).
- [ ] Backend routes under `/api/admin` are removed.
- [ ] Navigation bars, footers, and dashboards contain no links or buttons leading to the admin portal.

### Community & Lounge Removal Verification
- [ ] Accessing `/lounge` routes or related community views returns 404 or redirects cleanly to the main dashboard.
- [ ] Backend routes for community posts (`/api/posts`) and comments (`/api/comments`) are removed.
- [ ] Dashboard tabs and mobile dock navigation no longer show "라운지" (Lounge) or community entry points.

### Authentication & Login Removal Verification
- [ ] Header, floating bars, and modals contain no "로그인" (Login) or "로그아웃" (Logout) buttons or user avatar triggers.
- [ ] Session cookie endpoints (`/api/auth/session`) and client-side auth providers (`AuthProvider`, `AdminGuard`, `useAuth`) are removed or neutralized to public anonymous state with no Firebase Auth network dependency.
- [ ] The app renders all primary non-community features (Apartment details, Transactions, Macro trends, Techno Valley, MBTI) seamlessly without prompting for authentication.

### Test Integrity
- [ ] `npm run test` executes successfully without failing due to missing admin/lounge/auth components or outdated mock assertions.

## 2026-09-19T13:40:53Z

동탄 신도시 아파트 실거래가 데이터를 기반으로 종합 통계 분석 리포트 대시보드를 구축하여 사용자의 체류 시간(Dwell Time)을 극대화하고, 인피드/인라인 애드센스 광고 배치를 통해 수익률을 극대화합니다.

Working directory: c:/Users/ocs56/OneDrive/바탕 화면/PORTFOLIO/PORTFOLIO - DVIEW/frontend
Integrity mode: development

## Requirements

### R1. 동탄 부동산 실거래가 통계 분석 엔진
동탄1·2 신도시 및 법정동별 실거래 데이터(매매/전세)를 바탕으로 기간별(1개월/3개월/6개월/1년/전체), 평형대별 거래량, 평균 매매가, 평당가 랭킹, 전세가율, 신고가/신저가/급매 변동률을 산출하는 통계 분석 로직을 제공합니다.

### R2. 체류 시간 증대를 위한 인터랙티브 통계 리포트 대시보드 UI
사용자가 권역, 평형, 기간, 정렬 조건을 실시간으로 탐색할 수 있는 시각화 차트(시계열 추이, 거래량 분포, 평당가 랭킹) 및 핵심 하이퍼로컬 인사이트 요약 카드를 직관적인 반응형 웹 인터페이스로 제공합니다.

### R3. 애드센스 수익 최적화 및 UX 조화형 광고 배치
통계 리포트 섹션 및 차트 카드 사이에 자연스럽게 노출되는 인피드/인라인 애드센스 슬롯을 구현하고, 누적 레이아웃 이동(CLS) 방지 및 애드센스 정책을 준수하는 반응형 광고 플레이스홀더를 제공합니다.

### R4. 데이터 무결성 및 인프라 제약
기존 정적 데이터셋(`public/data/*.json`) 및 동기화 파이프라인과 완벽히 호환되어야 하며, 외부 클라우드 무단 쓰기나 불필요한 네트워크 비용 없이 클라이언트/정적 빌드 고성능을 유지해야 합니다.

## Acceptance Criteria

### 통계 분석 정확성 및 데이터 처리
- [ ] 권역별(동탄1/동탄2/법정동), 평형대별, 기간별 실거래가 통계 지표(평균 매매가, 평당가, 전세가율, 거래량 변동률)가 오차 없이 산출되어 화면에 표시된다.
- [ ] 결측치 또는 거래 데이터가 부족한 단지/기간 선택 시 앱이 충돌하지 않고 안정적인 예외 처리 및 안내 메시지를 표시한다.

### 체류 시간 및 사용자 인터랙션
- [ ] 권역/기간/평형 필터 변경 시 통계 차트와 테이블이 즉각(300ms 이내) 갱신되며, 데이터 로딩 상태에 대한 스켈레톤 UI가 제공된다.
- [ ] 모바일과 데스크톱 환경 모두에서 차트 툴팁, 데이터 정렬, 단지별 상세 통계 탐색이 끊김 없이 매끄럽게 동작한다.

### 애드센스 배치 및 레이아웃 안정성
- [ ] 통계 대시보드 본문 및 리포트 섹션 사이에 규격에 맞는 인피드/인라인 광고 슬롯이 배치된다.
- [ ] 광고 로딩 전후 레이아웃이 급격하게 흔들리지 않도록 고정 높이 또는 반응형 종횡비(Aspect Ratio) 컨테이너가 유지된다 (CLS < 0.1).

### 코드 품질 및 회귀 방지
- [ ] 기존 테스트 스위트를 포함하여 신규 통계/광고 컴포넌트 단위 테스트(`npm run test`)가 100% 통과한다.
- [ ] `npx tsc --noEmit` 실행 시 TypeScript 컴파일 에러가 0건이어야 한다.
- [ ] `npm run lint` 실행 시 ESLint 검사를 0건의 에러로 통과해야 한다.
- [ ] `npm run build` 실행 시 프로덕션 빌드가 성공적으로 완료되어야 한다.

## 2026-09-20T02:44:52Z

독립 분리되어 있던 '/stats(통계 리포트)' 페이지를 메인 홈인 '아파트 랩(/)' 페이지에 유기적으로 통합하여, 첫 진입 화면에서 동탄 전역의 실거래 통계 지표·시각화 차트·하이퍼로컬 인사이트·개별 단지 시세를 원스톱으로 제공하고 인라인 애드센스를 최적화 배치하여 체류 시간과 광고 수익을 극대화합니다.

Working directory: c:/Users/ocs56/OneDrive/바탕 화면/PORTFOLIO/PORTFOLIO - DVIEW/frontend
Integrity mode: development

## Requirements

### R1. 아파트 랩(/) 원페이지 하이브리드 대시보드 구축
메인 화면 상단에 4대 핵심 KPI(총 거래량, 평균 매매가, 평당가, 전세가율), 5차원 필터 바, 시계열 추이/평당가 랭킹/거래량 분포 차트 및 하이퍼로컬 인사이트 카드를 전면 배치하고, 하단에 개별 단지 시세 추이, 평형별 수요 도넛 차트, AI 시뮬레이터를 자연스럽게 결합하는 원페이지 하이브리드 대시보드를 구축합니다.

### R2. 체류 시간(Dwell Time) 증대를 위한 인터랙티브 탐색 UX
다차원 필터(권역, 법정동, 평형, 거래유형, 기간) 조작 시 차트와 테이블이 즉각(300ms 이내) 갱신되도록 반응성을 최적화하며, 모바일(320px)부터 데스크톱까지 단일 흐름으로 막힘없이 스크롤 탐색할 수 있는 반응형 레이아웃을 제공합니다.

### R3. 애드센스 인라인 최적화 & /stats 301 리다이렉트 및 내비게이션 정리
통계 차트와 하단 단지 분석/시뮬레이터 섹션 사이에 뷰어빌리티를 극대화하는 인라인 애드센스 슬롯을 배치하고 CLS 0 유지를 위한 고정 바운딩 박스를 적용합니다. 기존 `/stats` 경로는 메인 홈(`/`)으로 301 영구 리다이렉트(Permanent Redirect) 처리하고, 글로벌 내비게이션(헤더 및 하단 모바일 독)을 [아파트 랩 | 아파트 탐색 | 단지 MBTI] 3탭 체제로 슬림화합니다.

### R4. 데이터 무결성 및 고성능 인프라 제약
기존 정적 데이터셋(`public/data/*.json`) 및 클라이언트 연산 엔진(`statsEngine.ts`)을 활용하여 클라이언트 직접 Firestore 호출(비용 발생) 없이 제로 코스트 초고속 아키텍처를 유지합니다.

## Acceptance Criteria

### 대시보드 통합 및 시각화 기능
- [ ] 메인 홈(`/`) 첫 화면에 4대 통계 KPI, 다차원 필터, 시계열 추이 차트, 평당가 랭킹 차트, 하이퍼로컬 인사이트 카드 및 개별 단지 시세 분석이 단일 페이지 내에서 유기적으로 정상 렌더링된다.
- [ ] 권역, 기간, 평형 필터 변경 시 차트와 데이터가 300ms 이내에 즉각 반응하며, 빈 상태(Empty state) 및 로딩 스켈레톤이 매끄럽게 동작한다.

### 내비게이션 및 URL 리다이렉트
- [ ] `/stats` URL 접근 시 메인 페이지(`/`)로 301 영구 리다이렉트(Permanent Redirect)된다.
- [ ] 상단 헤더(`LoungeHeader.tsx`) 및 모바일 하단 독(`MobileDock.tsx`)의 내비게이션 탭이 [아파트 랩 | 아파트 탐색 | 단지 MBTI] 3탭 구조로 일관되게 동기화된다.

### 애드센스 배치 및 레이아웃 안정성
- [ ] 통계 차트 섹션과 하단 단지 분석 섹션 사이에 인라인 애드센스 슬롯이 적절히 배치된다.
- [ ] 광고 로딩 전후 레이아웃이 급격하게 흔들리지 않도록 고정 높이 바운딩 박스 컨테이너가 유지된다 (CLS < 0.01).

### 코드 품질 및 빌드 검증
- [ ] 기존 188개 테스트를 포함하여 페이지 통합에 따른 테스트 스위트(`npm run test`)가 100% 통과한다.
- [ ] `npx tsc --noEmit` 실행 시 TypeScript 컴파일 에러가 0건이어야 한다.
- [ ] `npm run lint` 실행 시 ESLint 검사를 0건의 에러로 통과해야 한다.
- [ ] `npm run build` 실행 시 전체 페이지 정적/동적 프로덕션 빌드가 성공(Exit code 0)해야 한다.

## 2026-09-20T02:55:46Z

[User Layout Constraint Update]
사용자 피드백이 반영되었습니다:
"개별 단지 시세 추이, 평형별 수요 도넛 차트(소형 KPI 카드 4개 포함) 상단 레이아웃 형태는 유지해줄수 있어? 아니면 이 도넛차트와 개별단지 시세 추이 그래프를 추천안에 맞게 출력 내용을 바꿔도 됨"

지침:
1. 아파트 랩(/) 기존 상단의 시그니처 2열 레이아웃(좌측: 평형별 수요 도넛 차트 + 소형 KPI 카드 4개, 우측: 개별 단지 시세 추이 차트)의 형태와 UI 구성을 그대로 상단에 보존합니다. (필요 시 통계 데이터 엔진과 조화롭게 출력 내용 연계 가능)
2. 그 아래 섹션으로 동탄 전역 다차원 통계 필터 바, 4대 KPI 요약(총거래량, 평균매매가, 평당가, 전세가율), 하이퍼로컬 인사이트 카드 4종, 평당가 랭킹 차트, 거래량 분포 차트 및 인라인 애드센스 슬롯이 자연스러운 시선 흐름으로 스크롤 연결되도록 구성해 주세요.
3. prompt_draft.md R1 요구사항에 이 내용이 반영되었습니다. PROJECT.md 및 구현 마일스톤에 즉시 반영하여 진행해 주시기 바랍니다.
