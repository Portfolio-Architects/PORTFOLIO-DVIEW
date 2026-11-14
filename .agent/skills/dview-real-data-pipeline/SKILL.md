---
name: dview-real-data-pipeline
description: "디뷰(DVIEW) 국토교통부 매매·전월세 실거래가 수집, Firestore 동기화, 정적 JSON 캐시(tx-summary·청크) 생성, Google Sheets 카탈로그·타입맵 동기화 및 Zod·IQR 무결성 검증을 수행하는 표준 스킬입니다. 실거래가 수집, 전월세 파이프라인, 아파트 시세 캐시 갱신, 단지 카탈로그 정합성 점검, 또는 상업용(지식산업센터) 실거래 데이터 연동 작업이 언급될 때 반드시 이 스킬을 우선 호출해 실행합니다."
enforces:
  - .agent/rules/DVIEW_DRSP.md
  - .agent/rules/DVIEW_strict-real-data-only.md
  - DVIEW_DESIGN.md
---

# DVIEW Real-Data Pipeline Skill (`dview-real-data-pipeline`)

본 스킬은 [`DVIEW_AGENT.md`](../../../DVIEW_AGENT.md) 및 [`DVIEW_strict-real-data-only.md`](../../rules/DVIEW_strict-real-data-only.md)에 따라 **100% 국토교통부·공공기관 검증 공식 데이터**만 수집·검증·동기화하기 위한 표준 실행 절차와 서킷 브레이커 계약을 정의합니다.

---

## 1. 작업 디렉토리 및 공공 API 환경변수 전제 (Execution Context)

- 모든 파이프라인 스크립트와 `package.json`, `.env.local`은 `frontend/` 하위에 위치합니다. 다수 스크립트가 `dotenv.config({ path: '.env.local' })`로 현재 작업 디렉토리 기준 환경변수를 로드하므로, 루트 세션에서 명령을 실행할 때는 반드시 `Set-Location frontend;`를 선행합니다.
- **공공데이터포털 인증키 구분**:
  - `BUILDING_API_KEY`: 아파트 매매([`fetch-transactions.js`](../../../frontend/scripts/fetch-transactions.js)) · 아파트 전월세([`fetch-rent.js`](../../../frontend/scripts/fetch-rent.js)) 수집에서 참조합니다.
  - `PUBLIC_DATA_PORTAL_KEY`: 상업·업무용 매매 실거래가([`officeTx.repository.ts`](../../../frontend/src/lib/repositories/officeTx.repository.ts), `RTMSDataSvcNrgTrade`) 및 국민연금 사업장 고용 데이터([`sync-nps.js`](../../../frontend/scripts/sync-nps.js))에서 참조합니다.

---

## 2. 표준 파이프라인 실행 절차 (Step-by-Step Workflow)

### Step 1. 국토부 OpenAPI 실거래가 수집 (`Firestore` Upsert)
1. **아파트 매매 실거래가 수집** ([`fetch-transactions.js`](../../../frontend/scripts/fetch-transactions.js), `RTMSDataSvcAptTradeDev`):
   ```powershell
   Set-Location frontend; npm run fetch-transactions
   # 직접 호출: Set-Location frontend; node scripts/fetch-transactions.js
   ```
2. **아파트 전월세 실거래가 수집** ([`fetch-rent.js`](../../../frontend/scripts/fetch-rent.js), `RTMSDataSvcAptRent`, 화성시 `41590` · 동탄구 `41597` 스캔):
   ```powershell
   Set-Location frontend; npm run fetch-rent
   # 전체 기간 스캔 시: Set-Location frontend; node scripts/fetch-rent.js --full
   ```
3. **매매 + 전월세 일괄 수집**:
   ```powershell
   Set-Location frontend; npm run fetch-all
   ```
- 수집 타당성 및 공공 API 호출 주기 배경이 필요한 경우 [`docs/molit-crawling-feasibility.md`](../../../docs/molit-crawling-feasibility.md) 및 [`DEAD_ENDS.md`](../../../DEAD_ENDS.md)(웹 직접 스크래핑 차단 사례)를 부분 조회합니다.

### Step 2. Google Sheets 카탈로그·타입맵 및 도메인 보조 정적 데이터 동기화
- 단지 카탈로그(`public/data/apartments-by-dong.json`, 184개 단지·인프라 실거리 포함) 및 평형 타입맵(`public/data/type-map.json`)을 갱신할 때 [`sync-static-data.ts`](../../../frontend/scripts/sync-static-data.ts)를 실행합니다:
  ```powershell
  Set-Location frontend; npm run sync-static
  ```
- 국민연금 사업장([`sync-nps.js`](../../../frontend/scripts/sync-nps.js)), 단지 메타([`sync-apartments.js`](../../../frontend/scripts/sync-apartments.js)), 입지 점수([`sync-location-scores.js`](../../../frontend/scripts/sync-location-scores.js)), 지자체 고시공고([`fetch-local-notices.js`](../../../frontend/scripts/fetch-local-notices.js)), 거시 금리·공급 지표([`sync-macro.js`](../../../frontend/scripts/sync-macro.js))까지 포함한 전체 정적 파이프라인 일괄 동기화는 `Set-Location frontend; npm run sync-all`을 사용합니다.

### Step 3. 정적 JSON 요약 및 단지별 청크 생성
- Firestore `transactions` 및 `transactionSync` 컬렉션을 읽어 `public/data/tx-summary.json`, `recent-transactions.json`, `transactions-{1y,3y,all}.json`, `macro-trend.json`, `market-stats.json` 및 `public/tx-data/*.json` 단지별 청크를 생성합니다 ([`sync-transactions.js`](../../../frontend/scripts/sync-transactions.js), [`pipeline/cli.ts`](../../../frontend/pipeline/cli.ts)):
  ```powershell
  Set-Location frontend; npm run sync-transactions
  # 전체 재빌드 시: Set-Location frontend; node scripts/sync-transactions.js --full
  # 레거시/비정상 청크 파일명 정규화 병합 시: Set-Location frontend; npx tsx pipeline/cli.ts sanitize
  ```

### Step 4. 데이터 품질 및 이상치 정밀 검증 (Validation Layer)
- [`validate-transactions.js`](../../../frontend/scripts/validate-transactions.js)를 통해 8대 무결성 항목(Zod 스키마 및 8자리 계약일자, 양수 가격, 기존 시세 대비 `±3 IQR` 이상치, 카탈로그 등록 단지 매핑, 전용면적 `10~300㎡`, 층수 `0~70층`, 복합키 중복, 계약 해제·취소 `cancelDate`/`cdealType` 정합성)을 검증합니다:
  ```powershell
  # 데이터 갱신 후 공식 리포트(frontend/validation-report.json)까지 갱신할 때:
  Set-Location frontend; node scripts/validate-transactions.js
  # Git 추적 파일(validation-report.json) 변경 없이 읽기 전용으로 검증할 때:
  Set-Location frontend; node -e "const { validateTransactions } = require('./scripts/validate-transactions'); const raw = require('./public/data/recent-transactions.json'); const list = Array.isArray(raw) ? raw : raw.transactions; const { report } = validateTransactions(list); console.log({ total: report.total, valid: report.valid, warnings: report.warnings, errors: report.errors }); process.exit(report.errors > 0 ? 1 : 0);"
  ```

---

## 3. MCP 서버 및 외부 데이터 연동 계약 (`firebase-mcp` · `portfolio-google-sheets`)

- **Firestore MCP 연동 주의**:
  - 호스트 런타임에는 공식 Firebase MCP가 **`ServerName: "firebase-mcp-server"`** (`firebase-tools mcp`)로 등록되어 있습니다.
  - 저장소 내 커스텀 서버([`mcp-servers/firebase-mcp/src/index.ts`](../../../mcp-servers/firebase-mcp/src/index.ts) — `firebase_query`, `firebase_get_doc`)는 `mcp_config.json`에 별도 마운트된 환경에서만 직접 호출 가능하며, 미등록 시 `firebase-mcp-server` 도구 또는 `frontend/scripts/` 내 Firebase Admin 스크립트로 조회합니다.
- **Google Sheets 원본 점검 (`ServerName: "portfolio-google-sheets"`)**:
  - `debug_sheet_range`(`spreadsheetId: "1rKMt-B2FdN5nGaxaU0y2Pqv1WqnEv1AGnY7XXE7pCEE"`, 시트 탭 `apartments` · `TYPE_MAP`)로 시트 원본 범위를 확인할 수 있습니다. 호스트 프로세스 CWD에 `credentials.json`이 없어 `-32603 Auth failed`가 반환될 경우 `frontend/.env.local`을 사용하는 `Set-Location frontend; npm run sync-static`으로 검증합니다.
- **트랜잭션 안전성 수칙**: 다중 문서를 변경할 때는 반드시 `runTransaction` 또는 `writeBatch`를 사용하며, `updateDoc`에는 `.withConverter()`가 붙지 않은 순수 `DocumentReference`만 전달합니다.

---

## 4. 절대 무결성 가드 및 서킷 브레이커 (Stop-the-Line)

1. **Strict Real Data Only (가짜·추정 데이터 전면 금지)**:
   - 국토교통부 OpenAPI 응답 지연, 인증키 오류, 또는 특정 기간 거래 0건 발생 시 **절대로 임의의 샘플·추정치·보간 시세·Mock JSON을 생성하거나 주입하지 않고 즉시 작업을 중단(Stop-the-Line)**한 뒤 원인을 보고합니다.
   - **상업·업무용(동탄테크노밸리 지식산업센터) 스코프 ([`officeTx.repository.ts`](../../../frontend/src/lib/repositories/officeTx.repository.ts))**: 국가 공식 신고 제도가 없는 상업용 임대차(전월세) 추정 데이터는 일체 생성·표시하지 않으며, 오직 국토부 상업·업무용 매매 실거래가(`RTMSDataSvcNrgTrade`, `PUBLIC_DATA_PORTAL_KEY`) 공식 데이터만 취급합니다. 실거래가 없는 경우 `"등록된 실거래 내역이 없습니다."`만 정직하게 노출합니다.
2. **2중 서킷 브레이커 기준 (`verifySummaryIntegrity` 보존)**:
   - **절대 임계치 가드 (`ABSOLUTE_THRESHOLD_BREACH`)**: 감지 단지 수 `< 120개`(실제 184개), 매매 거래 `< 40,000건`, 전월세 거래 `< 60,000건` 중 하나라도 미달하면 프로덕션 정적 캐시 덮어쓰기를 즉시 차단합니다.
   - **상대 급감 가드 (`RELATIVE_SALE_DROP_BREACH` / `RELATIVE_RENT_DROP_BREACH`)**: 직전 `tx-summary.json` 스냅샷 대비 매매 또는 전월세 건수가 **2%를 초과하여 급감(`< prev * 0.98`)**하면 파일 출력을 차단합니다. 이 임계치를 통과시키기 위해 가드 수치를 임의로 낮추지 않습니다.

---

## 5. 완료 검증 기준 및 이력 관리 (Exit Criteria)

1. `validateTransactions` 검증 결과가 **`errors: 0` (`Exit 0`)** 임을 확인합니다.
2. 파이프라인 또는 상업용 리포지토리 로직을 수정한 경우 다음 테스트와 타입 검사를 통과해야 합니다:
   ```powershell
   Set-Location frontend; npx tsc --noEmit
   Set-Location frontend; npx jest src/__tests__/pipeline.test.ts src/__tests__/adversarial-pipeline.test.ts
   ```
   (전체 정합성 감사가 필요한 경우 `Set-Location frontend; npm run audit` — [`audit-pipeline.js`](../../../frontend/scripts/audit-pipeline.js) 활용)
3. **토큰 다이어트 준수**: 파이프라인 실행 결과를 [`DVIEW_PORTFOLIO DVIEW - Patch History.md`](../../../DVIEW_PORTFOLIO%20DVIEW%20-%20Patch%20History.md)나 엔지니어링 리포트에 기록하는 작업은 **사용자의 명시적 요청이 있을 때만** 단 1회 원자적으로 수행하며, 결과 보고는 [`DVIEW_DRSP.md`](../../rules/DVIEW_DRSP.md)에 따라 명확하고 읽기 편한 한국어(`~합니다` 체)로 전달합니다.
