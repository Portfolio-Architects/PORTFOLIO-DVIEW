# Project: D-VIEW Comprehensive Refactoring Master Plan

## Architecture
- **Framework**: Next.js 16.2.6 (App Router, Turbopack) + React 19 + TypeScript + Tailwind CSS
- **Data Stores**: Firebase Firestore + Upstash Redis (Multi-tier cache: LRU -> Redis -> In-Memory) + Static JSON Chunks (`public/tx-data/*.json`)
- **Backend API**: Route Handlers under `src/app/api/` with unified response envelope and rate limiting
- **Data Pipeline**: Sync scripts in `scripts/` (Google Sheets + MOLIT Open Data -> Firestore -> JSON Chunk generators)

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | ESLint & AreaConverter TS Migration | Migrate `areaConverter.ts` to pure ESM TS, fix test unused directives, achieve 0 lint errors | M1 | Survey 2/3 (DONE) |
| 2 | Strict Types & Global Declarations | Expand `global.d.ts`, eliminate `as any` in repositories and hooks, enforce type safety | M1 | Survey 3 (DONE) |
| 3 | Pipeline Script Modularization | Decompose 1,204-line `sync-transactions.js` into modular SRP units with isolated unit tests | M2 | Survey 2 (DONE) |
| 4 | API Layer Standardization & Resilience | Standardize Route Handlers (`apiSuccess`, `apiError`, rate limiting, resilient fetch) | M2 | Survey 2 (DONE) |
| 5 | Custom Hooks Race Condition Defense | Harden `useApartmentDetails`, `useFavorites`, `useStaticData`, deduplicate preloading | M3 | Survey 3 (DONE) |
| 6 | MacroDashboardClient Modularization | Decompose 2,422-line `MacroDashboardClient.tsx` into sub-components, custom hooks, and memoized views | M4 | Survey 1 (DONE) |
| 7 | ApartmentModal & Modals Modularization | Decompose 2,960-line `ApartmentModal.tsx` & `AptCompareModal.tsx`, extract Kakao share card & tabs | M4 | Survey 1 (DONE) |
| 8 | Complex Dashboards & Calculators | Modularize `TechnoValleyDashboard`, `AdvancedValuationMetrics`, and consumer calculators | M4 | Survey 1 (DONE) |
| 9 | Full Regression Suite & Verification | Execute `tsc`, `lint`, `jest` (67 suites, 491+ tests), `sync-transactions`, and Turbopack `build` | M5 | Survey 1/2/3 (DONE) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Lint Fixes, Foundation & Strict Types | Fix areaConverter ESM TS, clean ESLint, add global types, remove unnecessary `as any` | none | DONE |
| M2 | Pipeline Modularization & API Standardization | Decompose `sync-transactions.js`, standardize Route Handlers (`src/app/api`), resilient fetch | M1 | DONE |
| M3 | Custom Hooks & State Race Condition Defense | Harden `useApartmentDetails`, `useFavorites`, `useStaticData`, eliminate waterfalls & race hazards | M1 | DONE |
| M4 | Frontend Monolith Modularization & Rendering | Decompose `MacroDashboardClient`, `ApartmentModal`, `AptCompareModal`, `TechnoValleyDashboard`, calculators | M1, M3 | DONE |
| M5 | E2E Integration, Dual-Track Gate & Audit | Verify 100% tests, 0 lint/type errors, pipeline generation, production build, forensic audit | M1, M2, M3, M4 | DONE |

## Interface Contracts
### API Standard Response Envelope
```typescript
interface ApiResponseSuccess<T> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    timestamp: string;
    cached?: boolean;
  };
}

interface ApiResponseError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

### Pipeline Module Decomposition
- `scripts/pipeline/outlierFilters.ts` / `.js`: 11-point rolling window outlier filters and IQR bounding.
- `scripts/pipeline/macroTrendCalculator.ts` / `.js`: Macro trend and time-series volume aggregators.
- `scripts/pipeline/apartmentSummarizer.ts` / `.js`: Price metrics, recent transaction formatting, summary generators.
- `scripts/pipeline/fileGenerators.ts` / `.js`: JSON chunk writing to `public/tx-data/` and summary files.

### Component Decomposition Contract
- All refactored subcomponents MUST preserve 100% existing prop types and test-ids.
- Dynamic imports (`dynamic(() => import(...))`) MUST be preserved for heavy modals and calculators.
- Leaf nodes (charts, table rows, cards) MUST use `React.memo` with proper comparison or stable callbacks.

## Code Layout
```
frontend/
├── scripts/
│   ├── pipeline/            # Modularized pipeline units (outlierFilters, macroTrendCalculator, etc.)
│   ├── sync-transactions.js # Lightweight orchestrator entry point
│   ├── fetch-transactions.js
│   └── fetch-rent.js
├── src/
│   ├── app/
│   │   ├── api/             # Standardized Next.js Route Handlers
│   │   └── ...
│   ├── components/
│   │   ├── macro/           # MacroDashboard modular subcomponents
│   │   ├── apartment/       # ApartmentModal modular subcomponents
│   │   ├── consumer/        # Calculators & valuation modular subcomponents
│   │   └── ...
│   ├── hooks/               # Hardened custom hooks with race condition protection
│   ├── lib/
│   │   ├── api/             # apiSuccess, apiError, rateLimit, resilient fetch helpers
│   │   ├── utils/           # Pure ESM TypeScript utilities
│   │   └── ...
│   └── types/               # Strict TypeScript definitions & global ambient types
```
