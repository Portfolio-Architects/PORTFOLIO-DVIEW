---
name: dview-adsense-telemetry
description: "디뷰(DVIEW) 구글 애드센스 노출·유효노출(Active Viewability)·CTR·미채결(Unfilled) CPA 폴백 전환 분석 및 GA4 MCP(google-analytics / ga4-mcp) 실시간·퍼널·커스텀 차원 동기화를 수행하는 표준 스킬입니다. 애드센스 수익률 점검, 광고 슬롯 텔레메트리 조회, 금융 계산기·단지 모달 퍼널 분석, GA4 커스텀 차원 등록, 검색 유입 CTR 분석, 또는 애드센스 승인 리포트 갱신 작업 시 반드시 이 스킬을 우선 호출해 실행합니다."
enforces:
  - .agent/rules/DVIEW_DRSP.md
  - .agent/rules/DVIEW_strict-real-data-only.md
  - DVIEW_DESIGN.md
---

# DVIEW AdSense & GA4 Telemetry Skill (`dview-adsense-telemetry`)

본 스킬은 [`DVIEW_AGENT.md`](../../../DVIEW_AGENT.md)의 최상위 목적함수($\text{Max }\mathcal{Y}_{\text{AdSense}} + \text{Yield}_{\text{NativeCPA}}$)를 실측 데이터 기반으로 극대화하기 위해, 전용 [`ga4-mcp`](../../../mcp-servers/ga4-mcp/src/index.ts) 서버 도구와 로컬 진단 스크립트의 정확한 호출 인터페이스 및 해석 기준을 정의합니다.

---

## 1. GA4 MCP 서버 (`ServerName: "google-analytics"`) 표준 도구 인터페이스

- **런타임 `ServerName` 주의**: 서버 소스는 [`mcp-servers/ga4-mcp/src/index.ts`](../../../mcp-servers/ga4-mcp/src/index.ts)(빌드 산출물 `mcp-servers/ga4-mcp/build/index.js`)에 위치하지만, 호스트 MCP 설정에는 **`ServerName: "google-analytics"`** 로 등록되어 있습니다. `call_mcp_tool` 호출 시 `"ga4-mcp"`가 아닌 **`"google-analytics"`** 를 지정해야 합니다.
- **기본 속성 및 인증**: 기본 GA4 `propertyId`는 `527874632`(측정 ID `G-Y17BHJ77W6`)이며, 인증 정보는 `frontend/.env.local`(`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GA_PROPERTY_ID`)에서 자동 로드됩니다.

| 우선순위 | MCP 도구명 (`ServerName: "google-analytics"`) | 핵심 파라미터 (기본값) | 용도 및 반환 데이터 핵심 |
|:---:|:---|:---|:---|
| **1** | `ga4_get_ad_telemetry_report` | `startDate` (`"30daysAgo"`), `endDate` (`"today"`), `limit` (`250`, 최대 `1000`), `propertyId?` | `ad_telemetry` 이벤트 전수 분석. 등록된 커스텀 차원에 따라 `FULL_SLOT_BREAKDOWN` / `PARTIAL_CUSTOM_BREAKDOWN` / `PAGE_DEVICE_FALLBACK` 모드로 자동 동작하며 슬롯·이벤트 유형·CPA 캠페인·디바이스별 집계를 반환합니다. |
| **2** | `ga4_get_dview_funnel_telemetry` | `startDate` (`"30daysAgo"`), `endDate` (`"today"`), `topPagesLimit` (`20`), `propertyId?` | 전체 트래픽 KPI(`activeUsers`, `sessions`, `screenPageViews`, `averageSessionDuration`, `engagementRate`), 일별 추이, 상위 페이지, 이벤트 분포, 인기 검색어(`search_query`), 단지 조회(`apartment_view`) 서피스·뷰타입 전환을 통합 반환합니다. |
| **3** | `ga4_sync_custom_dimensions` | `dryRun` (`false`), `includeExtendedDimensions` (`true`), `includeInteractionDimensions` (`true`), `includeMetrics` (`true`), `propertyId?` | GA4 Admin API v1beta를 통해 DVIEW 이벤트 범위 커스텀 차원 16종(광고 코어 4종 + 확장 3종 + 인터랙션 9종: `search_term`, `surface`, `view_type`, `trigger`, `chapter_id`, `selected_apt`, `zone`, `calculator_type`, `tab_name`) 및 커스텀 지표 2종(`dwell_time_ms`, `intersection_ratio`)을 [`ga4CustomDimensions.ts`](../../../frontend/src/lib/services/ga4CustomDimensions.ts) SSOT와 동일하게 멱등 등록합니다. |
| **4** | `ga4_run_realtime_report` | `dimensions` (`["unifiedScreenName"]`), `metrics` (`["activeUsers", "screenPageViews"]`), `limit` (`50`) | 최근 30분 활성 사용자 및 실시간 화면·이벤트 유입을 즉시 확인합니다. |
| **5** | `ga4_run_report` / `ga4_get_metadata` / `ga4_get_property_admin_info` | `dimensions`, `metrics`, `dimensionFilterField`, `customOnly` 등 | 특정 이벤트(`customEvent:calculator_type`, `customEvent:tab_name` 등) 정밀 필터 쿼리, 등록 차원 메타데이터 검색, 속성·데이터 스트림 설정 점검에 사용합니다. |

---

## 2. 작업 시나리오별 실행 워크플로우 (Audit & Sync Workflows)

### 시나리오 A. 광고 슬롯 수익성 및 CPA 카스케이드 효율 감사
1. `ga4_get_ad_telemetry_report`를 호출해 응답의 `mode`와 `coverage.missingCoreDimensions`를 먼저 확인합니다.
   - `mode`가 `"PAGE_DEVICE_FALLBACK"`이면 커스텀 차원 미등록 상태이므로 슬롯 단위가 아닌 `byPageAndDevice` 기준으로만 해석하고, 시나리오 C에 따라 커스텀 차원 동기화 여부를 안내합니다.
2. `summary.byEventType` 및 `summary.bySlotAndEventType`에서 다음 핵심 지표를 진단하되, **분모 0 가드(Zero-Denominator Guard)** 를 반드시 적용합니다:
   - **유효 노출률 (Active Viewability)**: `IMPRESSION > 0`일 때만 `VIEWABLE_IMPRESSION / IMPRESSION` 산출 (Zero-CLS 사전 높이 예약 및 스크롤 체류 품질 지표)
   - **광고 클릭률 (Slot CTR)**: `VIEWABLE_IMPRESSION > 0`일 때만 `CLICK / VIEWABLE_IMPRESSION` 산출 (`#f9fafb` 소프트 서피스 동형화 효과 지표)
   - **수익 누수 방어율 (Zero-Leakage Cascade)**: `(UNFILLED + ADBLOCK_FALLBACK) > 0`일 때만 `FALLBACK_CLICK / (UNFILLED + ADBLOCK_FALLBACK)` 및 `byCpaCampaign` 전환 비중 산출
   - **분모 0건 예외 처리**: 초기 수집 구간이나 특정 슬롯에서 분모(`IMPRESSION`, `VIEWABLE_IMPRESSION` 등)가 `0`건인 경우 `NaN%`·`Infinity%` 표기를 금지하고 **`"분모 모수 0건(산출 불가)"`** 과 함께 원시 이벤트 건수만 정직하게 병기합니다.
   - **환경별 편차**: `userAgentCategory`(`DESKTOP`, `MOBILE_WEB`, `IN_APP_BROWSER`) 및 `placementSlotId`별 병목 구간을 식별합니다.

### 시나리오 B. 사용자 탐색 · 탭 · 금융 계산기 퍼널 전환 감사
1. `ga4_get_dview_funnel_telemetry`를 호출하여 상위 유입 라우트(`topPages`), 검색어(`topSearchTerms`), `apartmentViewsBySurfaceAndType`(`modal`, `detail_page`, `chart_preview`, `mobile_drawer`, `shortcut`) 흐름을 확인합니다.
2. 금융 퀵바·고단가 CPA 계산기(`customEvent:calculator_type`: `mortgage`, `jeonse_safety`, `property_tax`, `sell_timing`, `compare`, `policy_loan`) 및 상단 탭 전환(`customEvent:tab_name`: `overview`, `imjang`, `stats`, `guide`, `technovalley`, `lounge`)의 세부 비중은 `ga4_run_report`(`metrics: ["eventCount", "totalUsers"]`)로 교차 조회합니다.
3. 유기적 검색 유입(GSC) 대비 미클릭(0-Click) 및 1페이지 저효율 CTR 개선 대상 라우트를 함께 점검할 때는 로컬 CLI를 보조 실행합니다 ([`analyze-gsc-ctr.ts`](../../../frontend/scripts/analyze-gsc-ctr.ts)):
   ```powershell
   Set-Location frontend; npm run seo:ctr
   # GSC 내보내기 CSV 오프라인 분석 시: Set-Location frontend; npm run seo:ctr -- <Queries.csv>
   ```

### 시나리오 C. GA4 커스텀 차원 및 지표 동기화
1. **반드시 `dryRun: true`를 먼저 호출**하여 기존 등록 차원(`alreadyExistingDimensions`)과 신규 생성 예정 목록(`plannedDimensions`, `plannedMetrics`)을 사전 검증합니다.
2. 이상이 없을 때 `dryRun: false`로 실행하거나, 최신 TypeScript 스키마를 즉시 반영하는 로컬 프로비저닝 CLI([`sync-ga4-custom-dimensions.ts`](../../../frontend/scripts/sync-ga4-custom-dimensions.ts))를 실행합니다 (`ga4-mcp` 소스 수정 직후에는 `Set-Location mcp-servers/ga4-mcp; npm run build` 및 MCP 프로세스 재시작 전까지 로컬 CLI가 즉시 최신 차원을 반영합니다):
   ```powershell
   Set-Location frontend; npm run ga4:sync-dimensions -- --dry-run
   Set-Location frontend; npm run ga4:sync-dimensions
   # 코어 4종만 등록 시 --core-only, CI 검증 시 --json --strict 옵션 지원
   ```
3. **권한·API 비활성 예외 처리**:
   - `ERR_GA4_ADMIN_API_DISABLED` (HTTP 403): GCP 프로젝트에서 Google Analytics Admin API 활성화가 필요함을 안내하되, GA4 Data API 리포팅 도구(`ga4_get_ad_telemetry_report`, `ga4_get_dview_funnel_telemetry`)는 정상 동작함을 함께 설명합니다.
   - `ERR_GA4_INSUFFICIENT_ROLE` (HTTP 403): 서비스 계정에 GA4 속성 편집자(Editor) 권한 부여가 필요함을 안내합니다.

---

## 3. 불변 수칙 및 리포트 출력 규격 (Invariants & Reporting)

1. **실측 데이터 전용 (`Strict Real Data Only`)**:
   - GA4에서 수집 모수가 0건이거나 `(not set)`으로 집계된 구간에 대해 예상 CTR, 추정 eCPM, 임의 시뮬레이션 트래픽 수치를 만들어내지 않고 실측된 건수와 집계 기간(`dateRange`)을 정직하게 표기합니다.
2. **애드센스 게시자 정책 수호**:
   - 색인 제외(`noindex`) 라우트인 `/lounge`, `/news`에는 광고 슬롯을 배치하지 않습니다.
   - 접힌 `<details>` 아코디언 내부에는 `AdSlot`을 절대 배치하지 않으며(`availableWidth=0` 에러 및 Viewability 하락 방지), 오클릭을 유도하는 레이아웃이나 문구를 배제합니다.
3. **DRSP v1.0 자연어 소통 및 문서 반영**:
   - MCP 도구가 반환한 내부 에러 코드(`faultVector`, `recoveryInvariant`)를 암호처럼 그대로 복사해 출력하지 않고, **원인이 무엇인지**와 **어떻게 조치할 수 있는지**를 읽기 편한 한국어(`~합니다` 체)와 요약 표로 전달합니다.
   - 사용자가 리포트 문서 반영을 요청한 경우에만 [`docs/adsense-approval-report.md`](../../../docs/adsense-approval-report.md) 또는 [`DVIEW_PORTFOLIO DVIEW - Engineering Report.md`](../../../DVIEW_PORTFOLIO%20DVIEW%20-%20Engineering%20Report.md)(상단 메타데이터 파싱 계약 보존 필수)에 실측 수치를 반영합니다.
4. **텔레메트리 코드 수정 시 검증 명령**:
   ```powershell
   Set-Location frontend; npx tsc --noEmit
   Set-Location frontend; npx jest src/__tests__/ga4_ad_telemetry_and_csp_boost.test.tsx src/__tests__/ga4_funnel_datalayer_integration.test.tsx src/__tests__/m5_ad_telemetry_closed_loop.test.tsx
   ```
