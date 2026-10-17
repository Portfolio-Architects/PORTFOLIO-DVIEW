# Project: DVIEW Platform Full-Stack Architectural Refactoring

## Architecture
- **Presentation Architecture** (`frontend/src/components/`):
  - Strict domain boundaries: `apartment/`, `macro/`, `consumer/`, `stats/`, `ads/`.
  - Pure presentation components decoupled from state/data-fetching via custom hooks (`useAptComparison`, `useMacroTrends`, `useValuation`).
  - Elimination of reverse/duplicate bridges and dead components (`adsense-sections/`, `FloatingUserBar.tsx`).
- **Data Pipeline Architecture** (`frontend/pipeline/` & `scripts/`):
  - Unified TypeScript pipeline core (`pipeline/core/normalizer.ts`): Single source of truth for `normalizeAptName`, `isCancelledTransaction`, and deterministic `TX_` hash keys.
  - Deterministic Firestore storage in canonical `transactions` collection.
  - Idempotent JSON generation targeting `frontend/public/data/` and `frontend/public/tx-data/` with sanitized filename invariants.
  - Clean operational CLI runner (`pipeline/cli.ts` / `npm run pipeline`).
- **Static Quality & Testing Architecture**:
  - Zero ESLint errors (React 19 / Next 16 compliant `react-hooks/refs` and `react/display-name`).
  - Static type safety with `npx tsc --noEmit` exit code 0 and elimination of `any` casts.
  - Zero-regression test suite coverage across 162+ Jest test suites and Playwright E2E suites.
  - Preservation of zero-CLS layout invariants (580px symmetrical hero geometry) and AdSense slots (1000000001, 1000000002).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | ESLint Zero-Error & React Hook/Ref Compliance | Fix 6 `react/display-name` errors in `MacroTrendChart.tsx`, 4 `react-hooks/refs` errors in `ApartmentChapterNavBar.tsx`, remove unused eslint-disable | M1 | Survey 3 & ORIGINAL_REQUEST §R3 |
| F2 | Legacy Bridge & Dead Code Elimination | Eliminate reverse/duplicate bridges (`MacroTrendChart.tsx`, `AptDonutSection.tsx`, `AptMetricCards.tsx`, `ApartmentModal.tsx`), delete unreferenced dead code (`adsense-sections/`, `FloatingUserBar.tsx`), deduplicate `preload.ts` & `OfflineBanner.tsx` | M2 | Survey 1 & ORIGINAL_REQUEST §R1 |
| F3 | Domain Decoupling & Modularization | Decouple `AptCompareModal.tsx` by integrating `components/consumer/compare/*` (5 modules) and extracting `useAptComparison` hook; decouple `AdvancedValuationMetrics.tsx` math logic and SWR fetching | M3 | Survey 1 & ORIGINAL_REQUEST §R1 |
| F4 | Data Pipeline Consolidation & Core Normalizer | Unify `normalizer.ts`, eliminate CJS/TS adapter hacks (`areaConverter.js`), establish typed CLI runner, remove CPU spin in `fileGenerators.js`, deprecate duplicate hotfix scripts | M4 | Survey 2 & ORIGINAL_REQUEST §R2 |
| F5 | Firestore Collection & JSON Output Unification | Consolidate Firestore storage to `transactions` collection with deterministic Doc IDs, sanitize `public/tx-data/` pathological filenames, migrate frozen `transaction-summary.ts` consumers | M4 | Survey 2 & ORIGINAL_REQUEST §R2 |
| F6 | Test Suite Regression Remediation | Resolve 9 failing Jest suites (update 5 navigation suites to 4-tab `/guide`, align AdSense script contract, align SSR DOM IDs, fix UI label contracts, stabilize worker SLA) | M5 | Survey 3 & ORIGINAL_REQUEST §R4 |
| F7 | Static Type Hardening & Build Verification | Eliminate `any` casts in core modules, verify `tsc --noEmit` and `npm run build` exit code 0, preserve zero-CLS hero layout (580px) and AdSense slots | M6 | Survey 3 & ORIGINAL_REQUEST §R3, §R4 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Static Code Quality & Lint Remediation | ESLint zero errors (`MacroTrendChart.tsx`, `ApartmentChapterNavBar.tsx`), React hook rules | None | DONE |
| M2 | Legacy Bridge & Dead Code Elimination | Consolidate duplicate bridges, delete dead code, deduplicate utilities, update import paths | M1 | DONE |
| M3 | Domain Decoupling & Modularization | Decouple `AptCompareModal.tsx` and `AdvancedValuationMetrics.tsx` into modular components and hooks | M2 | DONE |
| M4 | Data Pipeline & Output Consolidation | Unified normalizer, typed CLI runner, Firestore collection unification, JSON sanitizer | None | DONE |
| M5 | Test Suite Alignment & Regression Fix | Fix 9 failing test suites, achieve 100% pass across all 162 Jest test suites | M1, M2, M3, M4 | DONE |
| M6 | Final Verification & Adversarial Hardening | Pass 100% E2E test suite (Tiers 1-4), Tier 5 adversarial coverage hardening, `npm run build` exit code 0 | M5 | DONE |

## Interface Contracts
### Data Pipeline Normalizer ↔ Pipeline Scripts & Frontend
- Location: `frontend/pipeline/core/normalizer.ts` (or `@/lib/normalizer`)
- Signatures:
  ```typescript
  export function normalizeAptName(rawName: string): string;
  export function isCancelledTransaction(tx: { cdealType?: string; cdealDay?: string; cancelDealDay?: string }): boolean;
  export function generateCanonicalTxKey(tx: {
    aptName: string;
    dealDate: string;
    area: number | string;
    floor: number | string;
    price: number | string;
    dealType?: string;
  }): string;
  ```

### AptComparison Hook ↔ AptCompareModal
- Location: `frontend/src/components/consumer/hooks/useAptComparison.ts`
- Signature:
  ```typescript
  export interface AptComparisonState {
    apartments: ApartmentData[];
    isLoading: boolean;
    error: Error | null;
    selectedAptIds: string[];
    addApartment: (aptId: string) => void;
    removeApartment: (aptId: string) => void;
  }
  export function useAptComparison(initialAptIds?: string[]): AptComparisonState;
  ```

### MacroTrendChart Subcomponents
- Location: `frontend/src/components/macro/MacroTrendChart.tsx`
- Invariant: All memoized custom renderers (e.g. vertex dots, reference areas) must have explicit `displayName` assigned to comply with `react/display-name`.

## Code Layout
- `frontend/src/components/macro/MacroTrendChart.tsx`: Canonical chart implementation (with displayName, ReferenceArea/Lines).
- `frontend/src/components/macro/AptDonutSection.tsx`: Canonical donut section (flattened).
- `frontend/src/components/macro/AptMetricCards.tsx`: Canonical metric cards (flattened).
- `frontend/src/components/apartment/ApartmentModal.tsx`: Canonical modal implementation.
- `frontend/src/components/consumer/AptCompareModal.tsx`: Modularized compare modal consuming `compare/*` and `useAptComparison`.
- `frontend/src/components/consumer/compare/`: Compare subcomponents (HeaderSearch, InsightCard, PriceHistoryChart, RadarChart, SpecTable).
- `frontend/pipeline/core/normalizer.ts`: Consolidated normalization and transaction filtering.
- `frontend/pipeline/cli.ts`: Consolidated typed pipeline runner.
- `frontend/src/lib/firebaseAdmin.ts`: Single source of truth for Firebase Admin SDK credentials.
- `frontend/public/data/`: Consolidated static JSON outputs (`tx-summary.json`, `recent-transactions.json`, `macro-trend.json`).
- `frontend/public/tx-data/`: Sanitized per-apartment transaction chunks.
