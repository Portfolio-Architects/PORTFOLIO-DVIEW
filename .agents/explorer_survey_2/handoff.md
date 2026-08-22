# Handoff Report — Explorer 2: SSOT & Agent Guidelines Architecture

## 1. Observation

### 1.1 Authoritative User Request
- **File**: `ORIGINAL_REQUEST.md` (Lines 139-178)
- **Follow-up Header**: `## Follow-up — 2026-08-22T14:50:24+09:00`
- **Verbatim Objective**:
  > "동탄 거주민 및 반도체 클러스터(삼성전자·기흥/화성/평택 소부장 밸류체인) 종사자를 위한 부동산, 주식/산업, 러닝/산책, 축제/행사, 맛집을 아우르는 '동탄 지역 올인원 하이퍼로컬 슈퍼앱'으로의 서비스 최대 목적함수 확장 및 엔지니어링 리포트 전면 최신화/고도화."
- **5 Core Defined Domains**:
  1. **부동산 (Real Estate)**: 실거래가, 상대가치(Utility Score/PER), 초품아 안심 통학 큐레이션, 단지별 상세 분석
  2. **주식 및 산업 (Stocks & Industry)**: 삼성전자 및 기흥·화성·평택 반도체 소부장(소재·부품·장비) 클러스터 기업 시세, 밸류체인 동향, 임직원 인사이트
  3. **러닝 및 산책 (Running & Trails)**: 동탄호수공원, 치동천, 신리천, 반석산 등 주요 테마별 러닝/산책 코스 실측 거리, 난이도, 편의시설 안내
  4. **축제 및 문화 (Festivals & Events)**: 동탄호수공원 루나쇼 일정, 화성시·동탄출장소 주관 문화행사/주민자치 강좌 큐레이션
  5. **맛집 및 로컬 상권 (Dining & Hotplaces)**: 동탄 영천동/호수공원/카림애비뉴 등 주요 상권별 실방문 인증 맛집, 앵커 테넌트, 키즈 프렌들리 스팟

### 1.2 Existing SSOT & Agent Governance Documents
- **File**: `AGENT.md` (Lines 1-133)
  - Current Title: `# DVIEW (Dongtan Vacancy Info & Estate Web) AI Agent Protocol: Recursive Self-Improvement & Growth Engine`
  - Current Objective (Line 6-18): Anchored narrowly to `2026년 시민·공무원 AI 공모전(화성시 공고 제2026-2236호) 참가 및 동탄 테크노밸리 지식산업센터의 공실 해소`.
  - Recursive Loop (Lines 27-55): Step 1 (가치 평가) focuses only on Jisan office relocation/coworking. Lacks 5-domain viral triggers and multimodal data validation rules.
  - Quality Harness (Lines 101-129): Well-defined Stop-the-Line (Zero-Jank UX, Type/Compile Error, Pastel Cute & Urban Emerald design tokens) and Output & Reasoning Fidelity Harness.
- **File**: `PROJECT.md` (Lines 1-110)
  - Current Scope: Limited exclusively to a single past sprint: `Project: Hwaseong & Dongtan Administrative Network Data Integration & Normalization`.
  - Architecture & Inventory: Only covers crawlers (`fetch-local-notices.js`, `sync-local-notices/route.ts`), Firestore `local_notices`, and `LoungeFeedClient.tsx`. Lacks the overarching system architecture, the 5 domains, cross-domain state management, and full-stack contracts.
- **File**: `PORTFOLIO DVIEW - Patch History.md` (Lines 1-268)
  - Historical Format: Markdown table under `## 1. Release & Refactoring History` using `| YYYY-MM-DD | **Title (English/Phase Code)** | Detailed numbered description |`.
  - Latest Entry (Line 7): `2026-08-21 | **팀워크 다중 에이전트 전면 종합 리팩토링 및 67개 테스트 수트 무결성 완수 (Teamwork Full-Scope Architecture Refactoring & Victory Audit - Phase 998)**`.
- **File**: `PORTFOLIO DVIEW - Engineering Report.md` (Lines 1-305)
  - Current status: Outdated metrics (states 5 test suites / 44 assertions, while codebase currently has 86 suites / 846 tests); lacks the comprehensive 5-domain data flow, B2B CPA targeting, and Super-App multi-phase roadmap.

### 1.3 Baseline Quality Rules Execution & Verification
- **TypeScript Static Compilation**:
  - Command: `npx tsc --noEmit` in `frontend/`
  - Execution Result: Exited with code `0`. **0 TypeScript errors**.
- **Jest Unit Test Suite**:
  - Command: `npm test` in `frontend/`
  - Execution Result: Exited with code `0`.
  - Results: **Test Suites: 86 passed, 86 total | Tests: 846 passed, 846 total | Snapshots: 0 total | Time: 10.003s**.
- **Build & Test Config Files**:
  - `frontend/package.json`: Next.js `16.2.4`, React `19.2.3`, Tailwind CSS `^4.2.1`, Recharts `^3.8.0`, SWR `^2.4.1`, Zod `^4.3.6`, Jest `^30.3.0`, ts-jest `^29.4.6`.
  - `frontend/tsconfig.json`: `strict: true`, `moduleResolution: "bundler"`, `@/*` path mapping to `./src/*`.
  - `frontend/jest.config.ts` & `frontend/jest.setup.ts`: Configured with `ts-jest`, `jsdom`, fetch polyfill, `ResizeObserver`, `IntersectionObserver`, and `matchMedia` stubs.

---

## 2. Logic Chain

1. **Premise 1**: The authoritative user request (`ORIGINAL_REQUEST.md`) redefines D-VIEW's maximum objective function from a niche real estate & vacancy portal into a comprehensive **Dongtan Hyperlocal All-in-One Super-App** spanning 5 distinct domains (Real Estate, Stocks & Industry, Running & Trails, Festivals & Events, Dining & Hotplaces).
2. **Premise 2**: In multi-agent autonomous engineering, `AGENT.md` and `PROJECT.md` serve as the primary Single Source of Truth (SSOT). If `AGENT.md` remains restricted to the old contest/vacancy objective, future autonomous loops will make suboptimal decisions, reject 5-domain enhancements, or misalign growth hacking strategies.
3. **Premise 3**: `PROJECT.md` currently documents only a sub-feature (administrative notice crawler), creating an architectural vacuum. It must be upgraded into the comprehensive platform SSOT encompassing all 5 domains, shared services, caching topologies, API contracts, and phased milestones.
4. **Premise 4**: `PORTFOLIO DVIEW - Patch History.md` maintains a strict chronological record of major system evolution milestones. The Super-App Transformation must be logged as **Phase 999** adhering to the project's established tabular format.
5. **Premise 5**: Current baseline verification proves the repository is in an extraordinarily healthy state (**0 TS errors, 86/86 test suites, 846/846 tests green**). All documentation upgrades must maintain this zero-jank, high-reliability baseline.

---

## 3. Caveats

- **No Source Code Mutation in Exploration Phase**: This investigation is read-only. Actual updates to `AGENT.md`, `PROJECT.md`, `PORTFOLIO DVIEW - Patch History.md`, and `PORTFOLIO DVIEW - Engineering Report.md` will be executed during the implementation phase by designated writer agents.
- **Future Data Source Mocking/Ingestion**: External APIs for semiconductor stocks (e.g. AlphaVantage / Korea Investment API / Google Finance scraping) and trail geo-coordinates will require static seed fallbacks (`/public/data/*.json`) to preserve 100% offline test reliability.
- **Scope Discipline**: 5-domain expansion must follow the phased roadmap (Phase 1: Architecture/SSOT -> Phase 2: Data Pipeline -> Phase 3: UI Tabs) to avoid overwhelming client bundle sizes.

---

## 4. Conclusion & Concrete Document Upgrade Recommendations

### 4.1 Concrete Recommendations for `AGENT.md`

#### A. Revise Section 1: Ultimate Objective Function (최대 목적함수)
- **New Title**: `# DVIEW (Dongtan View) AI Agent Protocol: Hyperlocal Super-App Growth & Self-Improvement Engine`
- **Core Vision**:
  - Redefine primary mission: **"동탄 3040 패밀리 및 반도체 클러스터(삼성전자·기흥/화성/평택 소부장 밸류체인) 임직원의 일상·자산·여가를 아우르는 동탄 지역 올인원 하이퍼로컬 슈퍼앱(Dongtan Super-App)"**.
  - Codify the **5 Core Domains**:
    1. **부동산 (Real Estate Intelligence)**: 실거래가, 상대가치(Utility Score/PER), 초품아 안심 통학 큐레이션, 단지별 상세 분석, 역전세 안전 진단.
    2. **주식 및 산업 (Semiconductor & Industry Hub)**: 삼성전자 및 기흥·화성·평택 반도체 소부장(소재·부품·장비) 밸류체인 시세 동향, 기업 뉴스, 임직원 직무/기술 인사이트.
    3. **러닝 및 산책 (Running & Trails Curation)**: 동탄호수공원, 치동천, 신리천, 반석산 테마별 러닝/산책 코스 실측 거리, 난이도, 편의시설 안내.
    4. **축제 및 문화 (Festivals & Civic Events)**: 동탄호수공원 루나쇼 일정, 화성시·동탄출장소 주관 문화행사/주민자치 강좌 큐레이션.
    5. **맛집 및 로컬 상권 (Dining & Hotplaces)**: 영천동 지산상권, 호수공원, 카림애비뉴 인증 맛집, 앵커 테넌트, 키즈 프렌들리 스팟.

#### B. Upgrade Section 2: 5-Step Recursive Self-Improvement Loop
- **Step 1 (Value Assessment)**: Question updated to: *"이 변경이 동탄 거주민 및 반도체 클러스터 임직원의 일상 편의, 자산 증식, 여가 만족에 실질적인 가치를 제공하는가?"*
- **Step 2 (Growth & Viral Engine)**: Integrate 5-domain viral hooks:
  - Dynamic Kakao share cards (Luna show D-Day counter, Samsung semiconductor rally alert, running trail completion stamp, apartment valuation report).
  - High-CTR microcopy (e.g. "동탄 반도체 소부장 대장주 톱 5", "오늘 호수공원 루나쇼 몇 시?").
- **Step 3 (Data Integrity & Multimodal Accuracy)**:
  - Validate MOLIT real estate XML parsers, stock ticker data format, trail geospatial coordinates, and civic notice scrapers.
  - Zero-Fake-Data principle: fallback to graceful empty states and static seed backups, never synthesize unverified data.
- **Step 4 (Proactive Next-Step Suggestion)**: Agent identifies cross-domain friction points and suggests concrete optimizations.
- **Step 5 (Meta Self-Improvement)**: Continuous synchronization between `AGENT.md`, `PROJECT.md`, `Engineering Report.md`, and `Patch History.md`.

#### C. Preserve Quality & Safety Guardrails
- Maintain Stop-the-Line: 1) Zero-Jank UX (CLS < 0.01, 120fps physics), 2) Type/Compile Error (`tsc --noEmit` 0 errors), 3) Design System consistency (Pastel Cute & Urban Emerald).
- Retain Output & Reasoning Fidelity Harness, atomic transactions, anti-desync rollbacks, and Vercel build bypass rules.

---

### 4.2 Concrete Recommendations for `PROJECT.md`

#### A. Elevate Project Scope
- Title: `# Project: D-VIEW — Dongtan Hyperlocal All-in-One Super-App Platform`
- Replace single crawler focus with comprehensive platform architecture.

#### B. Architecture Blueprint Across 5 Domains
1. **Data Ingestion & Sync Pipeline**:
   - `Real Estate`: `fetch-transactions.js`, `fetch-rent.js`, `sync-macro.js`, `sync-location-scores.js`.
   - `Stocks & Industry`: `sync-semiconductor-stocks.js`, `lib/services/stockData.ts`, static fallback seeds (`public/data/semiconductor-stocks.json`).
   - `Running & Trails`: `lib/services/trailData.ts`, GeoJSON/distance matrix static seeds (`public/data/dongtan-trails.json`).
   - `Festivals & Culture`: `fetch-local-notices.js`, `sync-local-notices/route.ts`, Luna show schedule parser (`lib/services/eventData.ts`).
   - `Dining & Hotplaces`: Google Sheets master sync (`lib/services/diningData.ts`), verified place metadata (`public/data/dongtan-dining.json`).
2. **Backend Services & Resilient API Layer**:
   - Standardized API response envelopes (`apiSuccess` / `apiError`).
   - Upstash Redis L2 caching + Firestore DB + In-memory static fallbacks (Zero blank screen guarantee).
3. **Frontend UI & Navigation Layout**:
   - Toss-style responsive dual navigation: Desktop Header (`LoungeHeader`) & Mobile Dock (`MobileDock`).
   - 5-Domain modular component folders (`components/real-estate/`, `components/industry/`, `components/trails/`, `components/events/`, `components/dining/`).
   - Glassmorphism & Pastel Cute / Urban Emerald design system tokens.

#### C. Updated Milestones
- **M1: Super-App SSOT Architecture & Strategic Blueprint (Current)**: Update `AGENT.md`, `PROJECT.md`, `Engineering Report.md`, and `Patch History.md`.
- **M2: 5-Domain Multi-Pipeline & Seed Data Ingestion**: Establish schemas, mock/static fallback datasets, and service abstractions.
- **M3: Frontend Domain Tabs & Navigation Hydration**: Sub-100ms client routing across 5 domains with mobile dock synchronization.
- **M4: Monetization Engine (AdSense & B2B CPA Targeting)**: Deploy contextual bannerless advertising, semiconductor B2B sponsor cards, and local merchant lead generation.
- **M5: Automated Quality Audit & End-to-End Adversarial Verification**: 100% test pass rate across Jest, Playwright, TypeScript compilation, and accessibility.

#### D. Standardized Interface Contracts
Define TypeScript interfaces for all 5 domains (`RealEstateItem`, `SemiconductorStockItem`, `RunningTrailItem`, `DongtanEventItem`, `DiningPlaceItem`).

---

### 4.3 Concrete Recommendations for `PORTFOLIO DVIEW - Patch History.md`

Add the following standard entry at the top of the table in `## 1. Release & Refactoring History`:

```markdown
| 2026-08-22 | **동탄 하이퍼로컬 올인원 슈퍼앱 최대 목적함수 개정 및 엔지니어링 리포트 전면 고도화 (Dongtan Hyperlocal Super-App Objective Expansion & Full Engineering Report Revamp - Phase 999)** | 1) **서비스 최대 목적함수 공식 개정 (R1)**: 서비스의 정체성을 단순 부동산 분석 허브에서 동탄 3040 패밀리 및 삼성전자/반도체 소부장 클러스터 종사자를 위한 **'동탄 하이퍼로컬 올인원 슈퍼앱(Dongtan Super-App)'**으로 공식 격상하고, 5대 핵심 도메인(부동산, 주식/산업, 러닝/산책, 축제/문화, 맛집/로컬 상권) 체계를 확립했습니다. 2) **엔지니어링 리포트 전면 고도화 (R2)**: `PORTFOLIO DVIEW - Engineering Report.md`에 5대 도메인 시스템 아키텍처, 데이터 파이프라인, 파스텔 큐트 & 어반 에메랄드 디자인 토큰, B2B CPA 타겟팅 수익화 모델 및 3단계 로드맵(Phase 1~3)을 100% 최신화했습니다. 3) **프로젝트 SSOT 및 에이전트 가이드라인 동기화 (R3)**: `AGENT.md` 및 `PROJECT.md`에 슈퍼앱 비전, 5단계 재귀적 자기개선 루프, 도메인별 인터페이스 계약 및 디렉토리 구조를 일관되게 동기화했습니다. 4) **품질 무결성 전수 검증**: TypeScript 컴파일 검사(`npx tsc --noEmit`) 0 에러, Jest 86개 테스트 수트 846개 단위/통합 테스트 🟢 **100% PASS**, Zero-Jank 120fps UX 가이드라인을 완벽히 수호했습니다. |
```

---

## 5. Verification Method

To independently verify these findings:

1. **Verify TypeScript Strict Compilation**:
   ```bash
   cd "c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend"
   npx tsc --noEmit
   ```
   *Expected Output*: Exit code 0, zero diagnostic errors.

2. **Verify Jest Test Suite**:
   ```bash
   cd "c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend"
   npm test
   ```
   *Expected Output*: 86 test suites passed, 846 tests passed (100% green).

3. **Verify SSOT Consistency**:
   - Inspect `AGENT.md` for the 5-domain objective function and recursive loop definition.
   - Inspect `PROJECT.md` for the overarching platform architecture and interface contracts.
   - Inspect `PORTFOLIO DVIEW - Patch History.md` for the Phase 999 milestone log.
   - Inspect `PORTFOLIO DVIEW - Engineering Report.md` for complete 5-domain blueprint alignment.

---
*Report completed by Explorer 2 (SSOT & Agent Guidelines Explorer) on 2026-08-22.*
