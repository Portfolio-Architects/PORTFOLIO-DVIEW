# Handoff Report: Reviewer M2 — 1 (Hybrid Dashboard UI & State Integration)

- **Author**: `reviewer_m2_1` (`teamwork_preview_reviewer`)
- **Working Directory**: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\reviewer_m2_1`
- **Target Feature**: Milestone 2 Review (F4, F5, F6, F7, F8)
- **Reviewed Worker**: `worker_m2_hybrid_ui_1`
- **Verdict**: `REQUEST_CHANGES`
- **Date**: 2026-09-20T03:30:30Z

---

## Review Summary

**Verdict**: **REQUEST_CHANGES**

The core application logic, UI design, React 18 `useTransition` integration, zero direct Firestore usage, and authoritative vertical sequence in `MacroDashboardClient.tsx` and `StatsOverviewSection.tsx` are exceedingly well-crafted, correct, and robust.

However, running the mandatory verification command:
`npx jest src/components/__tests__/MacroDashboardHybridLayout.test.tsx`
fails with **exit code 1**. While the 2 tests within the suite evaluate and pass, Jest terminates with an unhandled asynchronous leak error:
```
● Cannot log after tests are done. Did you forget to wait for something async in your test?
  Attempted to log "{"timestamp":"...","level":"INFO","context":"ApartmentRepository.fetch","message":"Loaded 180 apartments successfully"}".
```
The test suite omitted mocking `@/lib/repositories/apartment.repository` (a standard pattern followed across all other tests in the repository). As a result, background network/data repository calls attempt to log via `console.log` after the Jest test environment teardown, triggering Jest's error and causing the process to exit with code 1.

---

## 1. Observation

1. **Test Failure on Standalone Execution (`MacroDashboardHybridLayout.test.tsx`)**:
   - Command executed:
     `npx jest src/components/__tests__/MacroDashboardHybridLayout.test.tsx ; echo "EXIT_CODE=$LASTEXITCODE"`
   - Verbatim Output:
     ```
     PASS src/components/__tests__/MacroDashboardHybridLayout.test.tsx
       MacroDashboardClient Authoritative Layout & Hybrid Integration
         √ renders all sections in authoritative order: Hero -> StatsOverviewSection -> AdSlot 1 -> Timeline -> Finance -> Rankings -> AdSlot 2 (1050 ms)
         √ wires onSelectApt from StatsOverviewSection ranking item click up to MacroDashboardClient callback (784 ms)

     Test Suites: 1 passed, 1 total
     Tests:       2 passed, 2 total
     Snapshots:   0 total
     Time:        3.598 s, estimated 4 s
     Ran all test suites matching src/components/__tests__/MacroDashboardHybridLayout.test.tsx.

       ●  Cannot log after tests are done. Did you forget to wait for something async in your test?
         Attempted to log "{"timestamp":"2026-09-20T03:28:48.989Z","level":"INFO","context":"ApartmentRepository.fetch","message":"Loaded 180 apartments successfully"}".

           67 |     case 'WARN': console.warn(output); break;
           68 |     case 'DEBUG': console.debug(output); break;
         > 69 |     default: console.log(output);
              |                      ^
           70 |   }
           71 | }
           72 |

           at console.log (node_modules/@jest/console/build/index.js:311:10)
           at log (src/lib/services/logger.ts:69:22)
           at Object.info (src/lib/services/logger.ts:75:79)
           at Object.fetchApartmentNames (src/lib/repositories/apartment.repository.ts:175:25)

     EXIT_CODE=1
     ```
   - In `frontend/src/components/__tests__/MacroDashboardHybridLayout.test.tsx`, lines 1-30 do not mock `@/lib/repositories/apartment.repository`.
   - In contrast, other tests targeting `MacroDashboardClient` (e.g. `src/__tests__/m2_apt_donut_metric_cards.test.tsx:9-12`, `TimelineIntegration.test.tsx:9-12`) define:
     ```typescript
     jest.mock('@/lib/repositories/apartment.repository', () => ({
       fetchApartmentNames: jest.fn().mockResolvedValue([]),
       fetchAllApartments: jest.fn().mockResolvedValue([]),
     }));
     ```

2. **Component Implementation (`StatsOverviewSection.tsx`)**:
   - `frontend/src/components/stats/StatsOverviewSection.tsx` lines 1-415:
     - 5D filter bar (`region`, `dong`, `pyeong`, `timeframe`, `sort`) wrapped with React 18 `useTransition` (`startTransition`) for sub-300ms non-blocking rendering.
     - 4 core KPI cards (`kpi-total-volume`, `kpi-avg-sale-price`, `kpi-avg-pyeong-price`, `kpi-avg-jeonse-ratio`).
     - Recharts visual charts (`StatsTimeTrendChart`, `StatsPyeongRankingChart`, `StatsVolumeDistributionChart`).
     - 4 Hyperlocal Insight cards (`insight-card-new-high`, `insight-card-optimal-gap`, `insight-card-volume-surge`, `insight-card-urgent-bargain`).
     - Zero direct Firestore calls: All client data is fetched via static JSON chunks (`/data/recent-transactions.json`, `/data/macro-trend.json`, `/data/tx-summary.json`, `/data/transactions-1y.json`) and calculated in-memory via `aggregateStats()`.
     - In-page complex selection: `handleSelectComplex` calls `onSelectApt(aptName, dongVal)`.

3. **MacroDashboardClient Layout Order (`MacroDashboardClient.tsx`)**:
   - `frontend/src/components/MacroDashboardClient.tsx` lines 1538-1730:
     - Top Hero (lines 1539-1607): 2-column layout preserving `AptDonutSection` + `AptMetricCards` (left) and `MacroChartSection` (right).
     - Connected Section immediately below (lines 1610-1620): `<ErrorBoundary name="동탄 실거래 통계 및 인사이트"><StatsOverviewSection onSelectApt={handleSelectApt} ... /></ErrorBoundary>`.
     - Transition Separator (lines 1622-1628): `<AdSlot slotId="1000000001" format="in-feed" className="w-full" />`.
     - Daily Transactions Timeline (lines 1630-1679): `<MacroTimelineView ... />`.
     - High-CPC Finance Section (lines 1682-1689): `<HighCpcFinanceSection ... />`.
     - Realtime Ranking Board (lines 1692-1700): `<RealtimeRankingBoard ... />`.
     - In-Feed AdSlot 2 (lines 1702-1709): `<AdSlot slotId="1000000002" format="in-feed" className="w-full" />`.
     - Notice & Utility Cards (lines 1711-1730): `<TrafficNoticeBoard ... />` and `<MacroUtilityCards ... />`.
   - Prop wiring: `onSelectApt` is wired to `handleAptClickByName` in `DashboardClient.tsx`, which triggers `FieldReportModal`.

4. **Other Verification Commands**:
   - `npx jest src/components/stats/__tests__/StatsOverviewSection.test.tsx`: PASS (10/10 tests, exit code 0).
   - `npx tsc --noEmit`: PASS (0 errors, exit code 0).
   - `npm run lint`: PASS (0 errors, 1 pre-existing warning in unrelated file, exit code 0).
   - `npm run build`: PASS (226 static/dynamic routes generated cleanly, exit code 0).

---

## 2. Findings

### [Critical] Unhandled Async Logger Leak in `MacroDashboardHybridLayout.test.tsx` Causing Jest Exit Code 1

- **What**: Executing `npx jest src/components/__tests__/MacroDashboardHybridLayout.test.tsx` exits with code 1 due to an unhandled asynchronous call logging to the console after test teardown.
- **Where**: `frontend/src/components/__tests__/MacroDashboardHybridLayout.test.tsx`
- **Why**: When `MacroDashboardClient` renders, child widgets initialize `DashboardFacade`, which triggers `ApartmentRepository.fetchApartmentNames()`. Because this repository is not mocked in `MacroDashboardHybridLayout.test.tsx`, the real asynchronous promise completes after Jest has finished running tests, calling `logger.info()`. Jest catches this via `@jest/console` and fails the test suite with exit code 1 (`Cannot log after tests are done. Did you forget to wait for something async in your test?`).
- **Suggestion**: Add the standard mock at the top of `src/components/__tests__/MacroDashboardHybridLayout.test.tsx`:
  ```typescript
  jest.mock('@/lib/repositories/apartment.repository', () => ({
    fetchApartmentNames: jest.fn().mockResolvedValue([]),
    fetchAllApartments: jest.fn().mockResolvedValue([]),
  }));
  ```
  This will prevent unhandled asynchronous I/O and allow the test command to exit cleanly with code 0.

---

## 3. Verified Claims

- **StatsOverviewSection 5D filter bar & 4 core KPIs**: Verified. Tested in `StatsOverviewSection.test.tsx` (10/10 passed).
- **React 18 useTransition responsiveness**: Verified. Filter state updates wrapped in `startTransition`, non-blocking UI.
- **Zero direct Firestore calls**: Verified. Zero imports of Firestore on client in `StatsOverviewSection.tsx`; static CDN JSON caching architecture strictly observed.
- **MacroDashboardClient layout sequence**: Verified. Top hero preserved, followed by StatsOverviewSection, followed by in-feed AdSlot 1000000001, timeline, finance widgets, rankings, AdSlot 1000000002, utility cards.
- **Wiring of onSelectApt to FieldReportModal**: Verified. In `DashboardClient.tsx:564-572`, `handleAptClickByName` sets `selectedReport` and opens `FieldReportModal`.
- **TypeScript compilation**: Verified via `npx tsc --noEmit` (0 errors).
- **ESLint**: Verified via `npm run lint` (0 errors).
- **Production build**: Verified via `npm run build` (226 routes compiled successfully).

---

## 4. Adversarial Review & Challenge Results

### Challenge Summary: Overall Risk Assessment: LOW (Implementation) / HIGH (Test Runner CI Failure)

- **Attack Scenario 1: Standalone Jest test execution in CI/CD pipeline**
  - Scenario: CI runner executes `npx jest src/components/__tests__/MacroDashboardHybridLayout.test.tsx`.
  - Expected: Clean execution with exit code 0.
  - Actual: Process exits with code 1 due to `Cannot log after tests are done`. CI build fails.
  - Mitigation: Mock `@/lib/repositories/apartment.repository` in `MacroDashboardHybridLayout.test.tsx`.

- **Attack Scenario 2: Rapid consecutive filter changes**
  - Scenario: User clicks multiple filter buttons within 50ms.
  - Result: `useTransition` drops outdated transitions and renders latest state without freezing main thread or throwing render race conditions. PASSED.

- **Attack Scenario 3: Empty transaction dataset fallback**
  - Scenario: `recentTransactions` is empty array `[]` and `/data/recent-transactions.json` returns empty.
  - Result: `StatsOverviewSection` displays `0건` and `-` placeholders without unhandled exception. PASSED.

---

## 5. Caveats

No caveats. All files in scope were inspected directly and all verification commands were executed.

---

## 6. Conclusion

The implementation of Milestone 2 (F4, F5, F6, F7, F8) by `worker_m2_hybrid_ui_1` is technically outstanding in both architecture and user experience. However, because `npx jest src/components/__tests__/MacroDashboardHybridLayout.test.tsx` fails with exit code 1 due to the unmocked asynchronous background logger leak, the verdict is **REQUEST_CHANGES**.

Once the worker adds the mock for `@/lib/repositories/apartment.repository` to `src/components/__tests__/MacroDashboardHybridLayout.test.tsx` so that `npx jest src/components/__tests__/MacroDashboardHybridLayout.test.tsx` exits with code 0, Milestone 2 is ready for immediate approval.

---

## 7. Verification Method

To verify the required fix:

```bash
# In frontend directory:
# 1. Run standalone MacroDashboardHybridLayout test and check exit code
npx jest src/components/__tests__/MacroDashboardHybridLayout.test.tsx
echo "Exit code: $LASTEXITCODE"
# Expected: Exit code 0 with 0 errors and no "Cannot log after tests are done"

# 2. Run StatsOverviewSection test
npx jest src/components/stats/__tests__/StatsOverviewSection.test.tsx

# 3. Verify TypeScript compilation
npx tsc --noEmit

# 4. Verify ESLint
npm run lint
```
