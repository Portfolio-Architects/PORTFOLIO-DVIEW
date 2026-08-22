# Project: D-VIEW Hyperlocal SuperApp Performance & Stability Refactoring

## Architecture
D-VIEW is a Next.js (App Router) hyperlocal real estate and commercial analytics web application.
- **Frontend Core**: `frontend/src/app` (pages & layouts), `frontend/src/components` (domain dashboards, explorers, modals, charts, widgets)
- **Data & Caching Layer**: `frontend/src/lib` (SWR caching, IndexedDB offlineQueue, localCache Zod persistence, data-fetchers)
- **Error Boundaries & Offline**: `ErrorBoundary.tsx`, `ChartErrorBoundary.tsx`, `OfflineBanner.tsx`, Service Worker (`sw.js`)
- **Testing Architecture**: Jest + React Testing Library + MSW (`frontend/__tests__`, 102+ test suites, 1055+ unit/integration tests)

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---|---|---|---|
| 1 | `TechnoValleyDashboard` Memoization & Subcomponent Extraction | Prevent full LineChart/Donut re-render on search keystroke with `React.memo`, `useDeferredValue`, and extracted subcomponents | M1 (DONE) | Survey R1 |
| 2 | `MacroDashboardClient` Prop Stability & `useCallback` | Eliminate inline arrow functions and fallback objects passed to memoized children (`AptFitFinder`, `MacroUtilityCards`, `MacroTimelineView`) | M1 (DONE) | Survey R1 |
| 3 | `DashboardClient` Stable Navigation Callbacks | Memoize `onTabChange` and `onTabClick` handlers for `LoungeHeader` and `MobileDock` | M1 (DONE) | Survey R1 |
| 4 | Root Layout Modal Code-Splitting | Convert statically imported modals in `layout.tsx` (`SettingsModal`, `WelcomeModal`, `CustomA2HSModal`) to `next/dynamic` | M2 (DONE) | Survey R2 |
| 5 | Modal & Heavy Component Dynamic Imports | Lazy load `OfficeDetailModal`, `PushSubscriptionModal`, and optimize `AptDonutSection` recharts bundling | M2 (DONE) | Survey R2 |
| 6 | Heavy PDF Library Lazy Loading | Convert static `jsPDF` top-level imports in `EngineeringReportClient.tsx` and `ReportClient.tsx` to dynamic `await import('jspdf')` inside export click handler | M2 (DONE) | Survey R2 |
| 7 | Next.js Build & Package Optimization | Add `recharts` to `experimental.optimizePackageImports` in `next.config.ts` and streamline `preload.ts` | M2 (DONE) | Survey R2 |
| 8 | Comprehensive ErrorBoundary Coverage | Wrap tabs (`OfficeExplorerClient`, `LoungeContainerClient`), widgets in `MacroDashboardClient` and `TechnoValleyDashboard`, `TossApartmentExploreClient`, and `ApartmentModal` in isolated `ErrorBoundary` & `ChartErrorBoundary` | M3 | Survey R4 |
| 9 | SWR, Cache Synchronization & Open Handle Resolution | Ensure SWR stale-while-revalidate lifecycle integrity and fix test suite open handles (`local-notices-e2e.test.tsx`, `m5_tier5_adversarial_challenge.test.tsx`) | M3 | Survey R3 & Test |
| 10 | 100% Green Test Suite & Adversarial Quality Assurance | Pass all 99+ Jest test suites (100% pass rate) with zero TypeScript compiler errors and adversarial stress-testing | M4 | Survey R5 & All |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | M1: Rendering Runtime & Re-render Elimination | `TechnoValleyDashboard.tsx`, `MacroDashboardClient.tsx`, `DashboardClient.tsx` | none | DONE |
| 2 | M2: Bundle Size & Dynamic Code Splitting | `layout.tsx`, `OfficeExplorerClient.tsx`, `ApartmentModal.tsx`, `EngineeringReportClient.tsx`, `ReportClient.tsx`, `next.config.ts`, `preload.ts` | none | DONE |
| 3 | M3: ErrorBoundary Coverage & Cache Stability | `DashboardClient.tsx`, `MacroDashboardClient.tsx`, `TechnoValleyDashboard.tsx`, `ExploreClient.tsx`, `ApartmentModal.tsx`, open handle cleanups in test files | M1, M2 | PLANNED |
| 4 | M4: Final Full Test Suite Pass & Adversarial Hardening | Jest 102+ test suites (100% green), `npx tsc --noEmit` 0 errors, Next.js build clean, adversarial stress testing | M1, M2, M3 | PLANNED |

## Interface Contracts
### `TechnoValleyDashboard` Subcomponents ↔ Parent
- `TechnoTrendChartSection`: props `{ monthlyTrend: Array<{ month: string; companies: number; employees: number }> }`
- `TechnoCompanySection`: props `{ companies: TechnoCompany[]; searchQuery: string; onSearchChange: (q: string) => void; selectedCategory: string; onSelectCategory: (c: string) => void }`

### ErrorBoundary ↔ Widget Components
- `ErrorBoundary`: props `{ fallbackTitle?: string; fallbackMessage?: string; children: ReactNode; onReset?: () => void }`
- `ChartErrorBoundary`: props `{ chartTitle?: string; children: ReactNode }`

## Code Layout
- `frontend/src/components/macro/`: Macro dashboard components and charts
- `frontend/src/components/office/`: Office explorer and TechnoValley components
- `frontend/src/components/apartment/`: Apartment exploration and detail modals
- `frontend/src/components/ui/`: Error boundaries, modals, and shared widgets
- `frontend/src/lib/`: Data caching, SWR provider, and utilities
- `frontend/__tests__/`: Jest test suites
