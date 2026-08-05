# Execution Plan: Apartment Rent Transaction Data Optimization

## Objective
Optimize apartment rent transaction data workflow from MOLIT public API collection/sync scripts to Firestore DB upserts and Next.js UI component rendering (`TransactionTable`, `TransactionChartSection`, `TransactionSummaryMetrics`).

## Workflow Strategy (Project Pattern)
- **Phase 0**: Parallel Survey & Codebase Exploration (3 Explorers) — DONE
- **Phase 1**: Rent Data Collection & Script Fixes (R1 Implementation Loop) — DONE
- **Phase 2**: Firestore Upsert & Data Integrity Optimization (R2 Implementation Loop) — DONE
- **Phase 3**: Frontend Integration & UI Verification (R3 Implementation Loop) — DONE
- **Phase 4**: End-to-End Verification & Forensic Audit (`npx tsc --noEmit`, `npm run build`, `teamwork_preview_auditor`) — DONE

## Acceptance Criteria Checklist
- [x] R1: Rent data collection scripts & API routes execute without error and parse latest month rent data from MOLIT API.
- [x] R2: Firestore DB upsert generates unique `_key` values without duplicate data or missing fields, correctly mapping area/pyeong.
- [x] R3: Frontend components (`TransactionTable`, `TransactionChartSection`, `TransactionSummaryMetrics`) accurately display rent data and metrics.
- [x] Build & Integrity: `npx tsc --noEmit` and `npm run build` pass, Forensic Audit verdict is CLEAN.
