# E2E Test Infra: D-VIEW Comprehensive Refactoring

## Test Philosophy
- Opaque-box and white-box multi-tier verification covering unit logic, integration endpoints, state resilience, component rendering, data pipeline generation, and full production build.
- Strict requirement-driven verification across all 4 requirements (R1, R2, R3, R4) with zero regression tolerance.

## Feature Inventory & Test Coverage Mapping
| # | Feature Area | Requirement | Unit Tests | Integration / API Tests | Pipeline / Build Verification |
|---|-------------|-------------|:----------:|:-----------------------:|:-----------------------------:|
| 1 | Area Converter & Foundation | R4 | `src/lib/utils/__tests__/areaConverter.test.ts` | Lint clean (0 errors) | `npx tsc --noEmit` |
| 2 | Pipeline Modularization | R2 | Pipeline unit tests (`outlierFilters`, `macroTrend`, `summarizer`) | Script dry-run | `npm run sync-transactions` (180 chunks) |
| 3 | API Standardization | R2 | API Helper tests (`apiSuccess`, `apiError`) | Route Handler tests (`/api/apt/...`, `/api/technovalley/...`) | Rate limit verification |
| 4 | State & Hooks Race Defense | R3 | Hook unit tests (`useFavorites`, `useApartmentDetails`, `useStaticData`) | SWR / Firestore sync tests | Mock race condition simulation |
| 5 | Component Modularity & UI | R1 | Component tests (`MacroDashboard`, `ApartmentModal`, calculators) | Render & snapshot tests | Turbopack `npm run build` |

## Test Architecture
- **Test Runner**: Jest (`npx jest`) with 51 test suites, 358 existing tests (all preserved green) + new module unit tests.
- **Type Checker**: `npx tsc --noEmit` (0 errors required).
- **Linter**: `npm run lint` (0 errors required).
- **Pipeline Runner**: `npm run sync-transactions` (must generate 180 apartment JSON chunks in `public/tx-data/` and summary JSONs).
- **Build Runner**: `npm run build` (Next.js Turbopack SSG production build of 177 pages).

## Quality Gates & Verification Commands
1. Type Safety: `cd frontend && npx tsc --noEmit`
2. Lint Quality: `cd frontend && npm run lint`
3. Unit & Integration: `cd frontend && npx jest --verbose`
4. Pipeline Output: `cd frontend && npm run sync-transactions`
5. Production Build: `cd frontend && npm run build`
