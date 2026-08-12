# Project: PORTFOLIO - DVIEW

## Architecture
- **Framework**: Next.js 16.2.4 (App Router), React 19, TypeScript 5.x, Tailwind CSS 4, SWR 2.4, Firebase Admin / Client (Firestore)
- **State & Data Flow**:
  - Favorite State: `useFavorites.ts` hook syncs client state with `POST /api/favorite` (Firestore `favorites` collection) and `localStorage` (`dview_guest_favorites`).
  - Apartment Lab (Overview): `overview/page.tsx` -> `DashboardClient.tsx` -> `MacroDashboardClient.tsx` -> `MacroTrendChart.tsx`.
  - Data Sources: Firestore `transactions` collection + static fallback JSON files (`public/data/recent-transactions.json`, `public/tx-data/*.json`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1. Favorite Complex Add/Delete & Persistence | Fix favorite saving/deletion & page refresh state loss in `useFavorites.ts` and `/api/favorite` | M1 | Survey |
| 2 | R2. Apartment Lab Right Graph Integration | Fix right chart rendering based on favorite complexes & transaction data with fallbacks in `MacroDashboardClient.tsx` | M2 | Survey |
| 3 | R3. Apartment Lab Left Tab Recent Transactions Update | Fix left tab recent transactions updates, date grouping & cutoff window in `useStaticData.ts` & `DashboardClient.tsx` | M3 | Survey |
| 4 | E2E & Integration Verification | Comprehensive end-to-end verification, unit tests, and empirical test runner across all requirements | M4 | Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Favorite Complex Persistence | Fix `useFavorites.ts` and `POST /api/favorite` transaction logic | none | DONE |
| 2 | M2: Apartment Lab Right Graph Integration | Fix `MacroDashboardClient.tsx` selection effect & chart data guards | M1 | DONE |
| 3 | M3: Apartment Lab Left Tab Recent Transactions | Fix `useStaticData.ts` cutoff date, grouping keys & filter fallbacks | none | DONE |
| 4 | M4: E2E & Final Integration Verification | Run test suite, verify acceptance criteria for R1, R2, R3 | M1, M2, M3 | DONE |

## Interface Contracts
### Favorites API & Hook ↔ UI Components
- `POST /api/favorite`: Request body `{ aptName: string, action?: 'add' | 'remove' | 'toggle' }`. Returns `{ success: true, favorited: boolean, aptName: string }`.
- `useFavorites(user, initialFavoriteCounts)`: Returns `{ userFavorites: Set<string>, favoriteCounts: Record<string, number>, isFavorited: (name: string) => boolean, handleAptToggleFavorite: (name: string) => Promise<void> }`.
- `MacroDashboardClient`: Consumes `userFavorites: Set<string>`, `selectedTimelineApt: string | null`, `txSummaryData`, `recentTransactions`.

## Code Layout
- `frontend/src/app/api/favorite/route.ts` — Favorites API transaction endpoint
- `frontend/src/hooks/useFavorites.ts` — Client favorites state & guest sync hook
- `frontend/src/hooks/useStaticData.ts` — SWR data hooks & Firestore transaction query fetcher
- `frontend/src/components/MacroDashboardClient.tsx` — Apartment Lab dashboard & right trend chart integrator
- `frontend/src/components/DashboardClient.tsx` — Overview wrapper & transaction filtering
- `frontend/src/components/TossApartmentExploreClient.tsx` — Search tab UI & favorite toggles
