# DISPATCH: Milestone 1 Worker — Statistics Analysis Engine Implementation

## Milestone
Milestone 1: Statistics Analysis Engine (`src/types/stats.ts`, `src/lib/analytics/statsEngine.ts`, `src/lib/analytics/statsEngine.test.ts`)

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Context & Input Documents
- Working Directory: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_worker_m1_1`
- Frontend Root: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend`
- Authoritative Original Request: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\ORIGINAL_REQUEST.md` (Section ## 2026-09-19T13:40:53Z)
- Project Document: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\orchestrator_stats_adsense\PROJECT.md`
- Explorer 1 (Types): `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_explorer_m1_1\analysis.md`
- Explorer 2 (Formulas & Functions): `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_explorer_m1_2\analysis.md`
- Explorer 3 (Edge Cases & Tests): `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_explorer_m1_3\analysis.md`

## Exclusive Write Ownership
You exclusively own and may modify or create:
- `frontend/src/types/stats.ts`
- `frontend/src/lib/analytics/statsEngine.ts`
- `frontend/src/lib/analytics/statsEngine.test.ts`
Do NOT edit other components or navigation files in this milestone.

## Implementation Requirements
1. **`frontend/src/types/stats.ts`**:
   - Define exact types specified in `PROJECT.md § Interface Contracts` and Explorer 1 analysis:
     `RegionFilter`, `PyeongFilter`, `TimeframeFilter`, `SortOption`, `ComplexStatItem`, `MacroTimeSeriesPoint`, `VolumeDistributionItem`, `HyperlocalInsightCardsData`, `StatsAggregateResult`, `IStatsDataLoader`, `StatsFilterState`.
2. **`frontend/src/lib/analytics/statsEngine.ts`**:
   - Implement the 6 pure functions + robust helper utilities:
     1. `filterTransactions(transactions, filters)`:
        - Region / Dong filtering: Dongtan 1 (반송동, 석우동, 능동), Dongtan 2 (청계동, 여울동, 영천동, 목동, 산척동, 장지동, 송동, 신동), and legal dongs with symmetrical `normalizeDongName('오산동') === '여울동'`.
        - Pyeong filtering: 소형(<=60㎡), 중소형(60~85㎡), 중대형(85~102㎡), 대형(>102㎡).
        - Timeframe filtering: 1M (30d), 3M (90d), 6M (180d), 1Y (365d), ALL, based on relative `referenceDate` or maximum transaction contractDate.
        - Cancellation exclusion: Exclude transactions where `isCanceled`, `cdealType === 'O' | '해제'`, `cancelDate`, or `cdealDay` is present.
        - Outlier exclusion: Exclude flagged outliers (`isOutlier === true`) or extreme prices (<1000만원 or >1000000만원) and direct deals.
     2. `computeMacroTimeSeries(transactions, macroTrend, timeframe)`:
        - Monthly bucketing for volume, avg sale price, and rent index integration.
     3. `computeComplexRankings(transactions, options)`:
        - Group by complex (`aptKey` / `aptName`), compute volume, average price, average pyeong price (`3.30578`), jeonse ratio, new highs, and sort by chosen criteria.
     4. `computeVolumeDistribution(transactions, groupBy)`:
        - Compute volume and percentage by pyeong tier or region.
     5. `computeHyperlocalInsights(complexStats, transactions, summaryMap)`:
        - Top 4 KPI insights: `newHighComplex`, `optimalGapComplex`, `volumeSurgeComplex`, `urgentBargainComplex`.
     6. `aggregateStatistics(rawData, filters)`:
        - Master aggregator combining all metrics.
        - Safe handling for empty datasets ($N = 0$) returning `EMPTY_STATS_RESULT` without throwing errors or producing `NaN`/`Infinity`.
3. **`frontend/src/lib/analytics/statsEngine.test.ts`**:
   - Implement comprehensive Jest unit tests covering all formulas, filter combinations, edge cases (empty data, cancellation filtering, dong normalization), and performance benchmarks (<5ms).
4. **Verification**:
   - Run `npx tsc --noEmit` to verify type integrity.
   - Run `npm test -- src/lib/analytics/statsEngine.test.ts` and ensure 100% tests pass.
   - Run `npm test -- src/__tests__/stats_report_e2e.test.tsx` to verify alignment with E2E test contracts.
   - Deliver `handoff.md` with verification commands and outputs.

## 2026-09-19T13:54:19Z
You are the Worker for Milestone 1 (Statistics Analysis Engine).
Your working directory is: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_worker_m1_1
Original Request Path: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\ORIGINAL_REQUEST.md
Project Document Path: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\orchestrator_stats_adsense\PROJECT.md
Scope & Exclusive File Ownership:
- frontend/src/types/stats.ts
- frontend/src/lib/analytics/statsEngine.ts
- frontend/src/lib/analytics/statsEngine.test.ts
Verify with npx tsc --noEmit and npm test -- src/lib/analytics/statsEngine.test.ts. Ensure all tests pass with 0 errors.
Deliver handoff.md and send a completion message back to parent orchestrator.
