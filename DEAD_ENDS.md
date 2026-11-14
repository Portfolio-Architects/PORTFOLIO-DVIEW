# DVIEW Engineering Dead Ends & Anti-Pattern Registry

> **상위 SSOT 및 상호 참조**
> - **대상 서비스**: 디뷰 (DVIEW · [https://dongtanview.com](https://dongtanview.com))
> - **준수 표준**: [`DVIEW_AGENT.md`](./DVIEW_AGENT.md) · [`DVIEW_DESIGN.md`](./DVIEW_DESIGN.md) · [`.agent/rules/DVIEW_DRSP.md`](./.agent/rules/DVIEW_DRSP.md) · [`.agent/rules/DVIEW_strict-real-data-only.md`](./.agent/rules/DVIEW_strict-real-data-only.md)
> - **연계 정책 및 리포트**: [`DVIEW_SECURITY.md`](./DVIEW_SECURITY.md) · [`DVIEW_PORTFOLIO DVIEW - Engineering Report.md`](./DVIEW_PORTFOLIO%20DVIEW%20-%20Engineering%20Report.md) · [`docs/molit-crawling-feasibility.md`](./docs/molit-crawling-feasibility.md)

본 문서는 DVIEW 플랫폼 구축·고도화 과정에서 실제로 시도되었거나 검토되었으나 **법적·기술적·성능적 결함으로 인해 영구 폐기된 실패 경로(Dead Ends)**를 기록한 재발 방지 지식 베이스입니다. 후속 작업에 투입되는 모든 에이전트는 아래 접근법을 절대 재시도하지 않으며, 확립된 표준 해법(Canonical Resolution)만 따릅니다.

---

## 1. 검증된 5대 데드엔드 요약 매트릭스 (Dead Ends Log)

| ID | 시도한 접근법 (Approach Tried) | 실패 원인 및 치명적 부작용 (Why It Failed) | 확립된 표준 해법 및 방어 자산 (Canonical Resolution & Files) |
|:---:|:---|:---|:---|
| **DE-01** | 국토교통부 실거래가 공개시스템 웹(`rtms.molit.go.kr`) 직접 스크래핑 (`Puppeteer` / `Playwright` / `Cheerio`) 및 새벽 점검 시간대·UTC 기준 호출 | 이용약관 제14조 위반(법적 리스크), 클라우드 WAF·봇 탐지 및 IP 차단, 마크업 변경 시 파이프라인 마비, NIRS 점검(00:00~04:00 KST) `502/504` 에러 및 UTC 월초 날짜 누락 | 공공데이터포털 공식 REST OpenAPI + `TZ: 'Asia/Seoul'` 3단계 비정각 Cron(`05:38`·`06:18`·`06:38` KST) + 2중 서킷 브레이커 ([`docs/molit-crawling-feasibility.md`](./docs/molit-crawling-feasibility.md), [`.github/workflows/sync-transactions.yml`](./.github/workflows/sync-transactions.yml)) |
| **DE-02** | 상업·업무용 부동산(지식산업센터·오피스) 임대차(전월세) 추정 시세 산출 및 거래 공백 구간 샘플·Mock 데이터 폴백 | 상업용 임대차는 국가 공식 실거래 신고 의무가 없어 공공 원천 데이터 부재. 수익률 역산 추정치·샘플 노출 시 허위 정보 오인, 투자 손실 분쟁 및 플랫폼 신뢰도 붕괴 초래 | 100% 국토부 공식 상업·업무용 매매 실거래(`RTMSDataSvcNrgTrade`)만 바인딩하고 미존재 시 `"등록된 실거래 내역이 없습니다."` 정직 표출 ([`.agent/rules/DVIEW_strict-real-data-only.md`](./.agent/rules/DVIEW_strict-real-data-only.md), [`frontend/src/lib/repositories/officeTx.repository.ts`](./frontend/src/lib/repositories/officeTx.repository.ts)) |
| **DE-03** | 가격·평단가·수익률 숫자 정렬을 위한 시스템 고정폭 폰트(`font-mono`, `ui-monospace`, `Consolas`, `GulimChe`) 강제 적용 | OS·브라우저별 `Consolas`, `Courier New`, `굴림체` 폴백 시 글리프 폭 팽창으로 모바일 카드 줄바꿈 깨짐, 한글 단위(`억`·`만원`·`평`)와의 베이스라인 이질감 및 디자인 품질 저하 | 전역 레거시 고정폭 폰트 전면 금지 및 **Pretendard Variable (`var(--font-pretendard)`) + `tabular-nums`** 단일 체계 확립 ([`.agent/rules/DVIEW_DRSP.md`](./.agent/rules/DVIEW_DRSP.md), [`DVIEW_DESIGN.md`](./DVIEW_DESIGN.md), [`.agent/skills/dview-design-compliance/SKILL.md`](./.agent/skills/dview-design-compliance/SKILL.md)) |
| **DE-04** | 하위 `frontend/.agent/` 중복 워크플로우 방치 및 매 Git 커밋 시 대형 엔지니어링 리포트·패치 히스토리(296KB) 자동 수정 강제 | 매 커밋마다 수만 토큰 소모, 에이전트 무한 수정 루프 유발, 런타임 파싱 헤더 계약(`getEngineeringReport.ts`) 훼손 위험 및 루트-프론트엔드 리포트 이중 소스 드리프트 발생 | `frontend/.agent/` 영구 제거, [`.agent/workflows/DVIEW_git-push.md`](./.agent/workflows/DVIEW_git-push.md) 린 로컬 커밋화, 패치 이력 아카이브 분리([`docs/archive/patch-history-v1.md`](./docs/archive/patch-history-v1.md)), [`frontend/scripts/sync-engineering-report.js`](./frontend/scripts/sync-engineering-report.js) 자동 동기화 |
| **DE-05** | 단일 거대 컴포넌트(`MacroDashboardClient.tsx`, `ApartmentModal.tsx`, `AdSlot.tsx`) 전역 상태 집중, 슬롯별 개별 AdBlock 감지 및 SSR `aria-hidden` 마스킹 | 리렌더링 범위 폭발로 메인 스레드 TBT/INP 악화, 슬롯 수($N$) 비례 강제 리플로우($\mathcal{O}(N)$) 발생, 그리고 SSR 본문 `aria-hidden="true"` 적용 시 `Mediapartners-Google` 클로킹 오탐 위험 발생 | 도메인 서브컴포넌트·8개 챕터 지연 마운트 분리, React 19 `useSyncExternalStore` 기반 $\mathcal{O}(1)$ 싱글톤 [`useAdBlockDetector.ts`](./frontend/src/hooks/useAdBlockDetector.ts), `AdSlot` 8개 서브모듈화 및 시맨틱 아코디언([`frontend/src/lib/design-system/copyDiet.ts`](./frontend/src/lib/design-system/copyDiet.ts)) 전환 |

---

## 2. 사례별 기술 포렌식 및 재발 방지 상세 (Detailed Forensic Analysis)

### 2.1 [DE-01] 국토교통부 웹 직접 스크래핑 차단 및 새벽 배치 경계 버그

- **실패 경위**: 공공데이터포털 API 게이트웨이 동기화보다 30분가량 빠르게 데이터를 얻기 위해 국토부 실거래가 공개시스템 웹(`rtms.molit.go.kr`)을 헤드리스 브라우저 및 HTML 파서로 직접 수집하는 방안을 검토·시도하였으나, 클라우드 WAF의 봇 핑거프린트 탐지(CAPTCHA·TCP Reset·IP 차단)와 이용약관 제14조(매크로·크롤링 금지) 법적 위반 위험으로 프로덕션 운영이 불가능함을 확인했습니다. 또한 초기 단일 UTC 스케줄에서는 NIRS 정기점검(00:00~04:00 KST) 응답 오류와 `date -u` 사용에 따른 매월 1일 아침 당월 거래 누락 버그가 확인되었습니다.
- **재발 방지 가드**:
  1. 오직 공공데이터포털 공식 인증키 기반 REST OpenAPI([`frontend/scripts/fetch-transactions.js`](./frontend/scripts/fetch-transactions.js), [`frontend/scripts/fetch-rent.js`](./frontend/scripts/fetch-rent.js))만 호출합니다.
  2. [`.github/workflows/sync-transactions.yml`](./.github/workflows/sync-transactions.yml)에 `TZ: 'Asia/Seoul'`을 고정하고 NIRS 점검 종료 직후인 `05:38`·`06:18`·`06:38` KST 비정각 3단계 스케줄로 구동합니다.
  3. API 장애 시 빈 데이터가 정적 캐시를 덮어쓰지 못하도록 [`frontend/scripts/sync-transactions.js`](./frontend/scripts/sync-transactions.js)의 2중 서킷 브레이커(단지 `< 120개`, 매매 `< 40,000건`, 전월세 `< 60,000건`, 직전 대비 `> 2%` 급감 차단)를 상시 유지합니다 ([`.agent/skills/dview-real-data-pipeline/SKILL.md`](./.agent/skills/dview-real-data-pipeline/SKILL.md)).

### 2.2 [DE-02] 상업·업무용 부동산 임대차(전월세) 추정 시세 산출 폐기

- **실패 경위**: 동탄테크노밸리 지식산업센터·오피스 섹션 구축 초기, 상업용 부동산의 임대료 정보를 함께 보여주기 위해 주변 수익률이나 평당 호가를 바탕으로 전월세 추정치를 역산하거나 샘플 데이터를 채우는 방식이 논의되었으나, 상업용 임대차는 주택 임대차와 달리 국가 공식 실거래 신고 제도가 없어 객관적 검증이 불가능하며 이용자 오인 및 법적 책임을 유발하는 치명적 결함으로 판정되었습니다.
- **재발 방지 가드**:
  1. [`.agent/rules/DVIEW_strict-real-data-only.md`](./.agent/rules/DVIEW_strict-real-data-only.md)에 따라 서비스 전역에서 추정값·샘플·Mock·보간 시세 생성을 전면 금지합니다.
  2. 상업용 부동산 실거래([`frontend/src/lib/repositories/officeTx.repository.ts`](./frontend/src/lib/repositories/officeTx.repository.ts), [`frontend/src/app/api/technovalley/transactions/route.ts`](./frontend/src/app/api/technovalley/transactions/route.ts), [`frontend/src/app/technovalley/TechnoValleyClient.tsx`](./frontend/src/app/technovalley/TechnoValleyClient.tsx))는 국토교통부 공식 상업·업무용 매매 실거래가 OpenAPI(`RTMSDataSvcNrgTrade`) 실데이터 전용으로만 운영하며, 매매 내역이 없는 경우 `"등록된 실거래 내역이 없습니다."` 메시지만 노출합니다.

### 2.3 [DE-03] 숫자 표기용 시스템 고정폭 폰트(`font-mono`) 레이아웃 왜곡

- **실패 경위**: 실거래가 테이블과 금융 계산기 숫자의 자릿수 정렬을 위해 Tailwind `font-mono`(`ui-monospace`, `Consolas`, `Courier New` 폴백)를 적용했을 때, 운영체제별 글리프 자간 편차로 좁은 모바일 카드에서 줄바꿈이 깨지고, 한글 단위(`억원`, `만원`, `평`)에 레거시 시스템 고정폭 폰트(`굴림체` 등)가 섞여 토스형 금융 캔버스 일관성이 심각하게 훼손되었습니다.
- **재발 방지 가드**:
  1. 서비스 전역([`frontend/src/app/globals.css`](./frontend/src/app/globals.css) 및 모든 컴포넌트)에서 `font-mono`, `ui-monospace`, `Consolas`, `Courier New`, `GulimChe`, `DotumChe`, `BatangChe` 사용을 금지합니다.
  2. 모든 가격·수익률·면적 수치 정렬은 **Pretendard Variable (`var(--font-pretendard)`) + `tabular-nums` (`font-variant-numeric: tabular-nums`)** 조합만 사용하며, [`.agent/skills/dview-design-compliance/SKILL.md`](./.agent/skills/dview-design-compliance/SKILL.md) 정규식 스캔 및 Jest 가드레일 테스트로 차단합니다.

### 2.4 [DE-04] 매 Git 커밋 시 대형 리포트 강제 수정 및 중복 워크플로우 충돌

- **실패 경위**: 과거 `frontend/.agent/workflows/`에 남아 있던 구버전 워크플로우가 모든 코드 커밋마다 `DVIEW_PORTFOLIO DVIEW - Engineering Report.md`와 296KB 규모의 `DVIEW_PORTFOLIO DVIEW - Patch History.md`를 읽고 수정하도록 강제하여, 경미한 UI 패치에도 컨텍스트 한도가 급격히 소진되고 에이전트가 리포트 동기화 루프에 갇히거나 `getEngineeringReport.ts`의 상단 메타데이터 파싱 계약을 깨뜨리는 부작용이 발생했습니다.
- **재발 방지 가드**:
  1. 하위 중복 폴더(`frontend/.agent/`, `frontend/.agents/`)는 영구 삭제 상태를 유지하며 루트 `.agent/`만 유일한 SSOT로 참조합니다.
  2. 사용자의 명시적 요청이 없는 한 리포트 문서를 매 작업마다 자동 수정하지 않으며([`DVIEW_AGENT.md`](./DVIEW_AGENT.md) §3.1), 과거 패치 231건은 [`docs/archive/patch-history-v1.md`](./docs/archive/patch-history-v1.md)로 분리해 활성 [`DVIEW_PORTFOLIO DVIEW - Patch History.md`](./DVIEW_PORTFOLIO%20DVIEW%20-%20Patch%20History.md)를 30KB 미만으로 유지합니다.
  3. 엔지니어링 리포트 수정 시 반드시 `Set-Location frontend; npm run sync-report`([`frontend/scripts/sync-engineering-report.js`](./frontend/scripts/sync-engineering-report.js))를 실행해 상단 메타데이터 계약과 폴백 사본([`frontend/src/data/engineering-report.md`](./frontend/src/data/engineering-report.md))의 1:1 정합성을 검증합니다.

### 2.5 [DE-05] 단일 거대 모놀리식 상태 집중 및 SSR `aria-hidden` 클로킹 위험

- **실패 경위**: 대시보드·단지 상세 모달·광고 슬롯의 모든 상태와 이펙트를 단일 거대 파일 내부에 집중시켰을 때 하위 인터랙션마다 전체 트리가 리렌더링되어 TBT/INP가 저하되었고, 각 `AdSlot` 인스턴스가 개별적으로 bait DOM 삽입·타이머 구동·`offsetHeight` 조회를 수행해 슬롯 수에 비례하는 레이아웃 스래싱($\mathcal{O}(N)$)이 발생했습니다. 아울러 시각적 밀도를 줄이려 SSR 데이터 섹션에 `aria-hidden="true"`를 부여했던 방식은 애드센스 심사 봇(`Mediapartners-Google`)의 클로킹 의심 사유가 됨을 확인했습니다.
- **재발 방지 가드**:
  1. [`frontend/src/components/apartment/ApartmentModal.tsx`](./frontend/src/components/apartment/ApartmentModal.tsx)의 8개 챕터 지연 마운트와 [`frontend/src/components/MacroDashboardClient.tsx`](./frontend/src/components/MacroDashboardClient.tsx)의 도메인 서브뷰([`frontend/src/components/macro/components/MacroTimelineView.tsx`](./frontend/src/components/macro/components/MacroTimelineView.tsx) 등) 분리 구조를 유지합니다.
  2. AdBlock 감지는 단일 bait DOM($\le 1$개)·단일 타이머 기반 $\mathcal{O}(1)$ 싱글톤 훅([`frontend/src/hooks/useAdBlockDetector.ts`](./frontend/src/hooks/useAdBlockDetector.ts))만 구독하며, [`frontend/src/components/ads/AdSlot.tsx`](./frontend/src/components/ads/AdSlot.tsx)는 `core/` 4종·`views/` 4종 모듈 분리 및 38개 export 하위 호환 계약을 보존합니다 ([`DVIEW_PROJECT.md`](./DVIEW_PROJECT.md)).
  3. 장문 SEO·데이터 해설은 `aria-hidden`이나 `sr-only`로 숨기지 않고 [`frontend/src/lib/design-system/copyDiet.ts`](./frontend/src/lib/design-system/copyDiet.ts)의 표준 `<details>/<summary>` 시맨틱 아코디언(`getSeoAccordionClass`)으로만 구성합니다.

---

## 3. 에이전트 사전 차단 수칙 (Pre-Execution Stop-the-Line Checklist)

새로운 기능 구현이나 리팩토링에 착수하기 전, 아래 5개 질문 중 하나라도 해당하면 즉시 설계를 중단하고 표준 해법으로 우회합니다.

1. 공공기관 웹페이지를 브라우저 자동화나 HTML 파싱으로 직접 크롤링하려 하는가? $\rightarrow$ **즉시 중단 (공식 OpenAPI + 서킷 브레이커만 사용)**
2. 공식 공공데이터가 없는 항목을 추정식·샘플·Mock 값으로 채우려 하는가? $\rightarrow$ **즉시 중단 (`"등록된 실거래 내역이 없습니다."` 등 정직한 빈 상태 표출)**
3. 숫자 정렬을 위해 `font-mono` 또는 시스템 고정폭 폰트를 추가하려 하는가? $\rightarrow$ **즉시 중단 (`Pretendard Variable + tabular-nums` 적용)**
4. 사용자 요청 없이 대형 리포트를 매 커밋마다 자동 편집하거나 하위 폴더에 `.agent` 사본을 만들려 하는가? $\rightarrow$ **즉시 중단 (루트 `.agent/` SSOT 및 린 커밋 준수)**
5. 단일 컴포넌트에 수백 라인의 이종 상태를 병합하거나 SSR 콘텐츠를 `aria-hidden`/`sr-only`로 가려 밀도를 낮추려 하는가? $\rightarrow$ **즉시 중단 (도메인 서브컴포넌트 분리 및 `<details>` 시맨틱 아코디언 사용)**
