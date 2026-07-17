# Plan - Dongtan Techno Valley Vacancy Estimation Algorithm Enhancement

## Objectives
Enhance the Dongtan Techno Valley average vacancy estimation algorithm using a multi-factor hybrid model incorporating:
- Area-based weights (Tx Weight) and GFA (Gross Floor Area) scaling functions.
- NPS (National Pension Service) employment data for macro adjustment.
- Building age (준공 연도) and dynamic turnover / time-series decay model.
- Outlier filtering and fallback smoothing (EMA/moving average).
- Unit testing with 100% pass rate.
- Perfect backward compatibility with the existing JSON payload structure for the dashboard UI.

## Phase 1: Exploration
- **Step 1.1**: Dispatch 3 Explorer subagents to investigate the existing code in `frontend/src/app/api/technovalley/trend/route.ts`, related helper modules, `nps_stats.json`, and any existing mock data or tests.
- **Step 1.2**: Aggregate Explorer findings and synthesize the proposed algorithm architecture and implementation strategy.

## Phase 2: Implementation
- **Step 2.1**: Dispatch a Worker subagent to implement the continuous area weight functions, GFA adjustments, NPS macro bonuses, age-based dynamic turnover, EMA smoothing, and outlier filtering.
- **Step 2.2**: The Worker will also create or update Jest unit tests (`*.test.ts`) validating these requirements (edge cases like 0 transactions, NPS changes, etc.) and run `npm run test` and `npm run audit`.

## Phase 3: Review and Challenge
- **Step 3.1**: Dispatch 2 Reviewer subagents to verify code correctness, robustness, and API backward compatibility.
- **Step 3.2**: Dispatch 2 Challenger subagents to perform empirical validation and check for gaps/edge cases.

## Phase 4: Forensic Audit & Integration Gate
- **Step 4.1**: Dispatch a Forensic Auditor to run integrity checks.
- **Step 4.2**: Evaluate all findings. If any verification fails or the Auditor flags an issue, iterate back to Phase 1/2. Otherwise, complete the milestone.
