# Project: DVIEW Cleanup — Admin, Lounge, and Auth Purge

## Architecture
DVIEW is a hyperlocal real estate and apartment analytics platform for Dongtan New City. This project transitioned DVIEW from a hybrid community/admin web portal into a 100% open, public, anonymous, high-performance informational platform.

- **Frontend**: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Lucide Icons, SWR.
- **Data Access**: Static JSON chunks (`public/tx-data/*.json`, `tx-summary.json`, `macro-trend.json`) served via CDN with zero client-side Firestore reads. Local bookmarks via `localStorage`.
- **Administrative Operations**: Shifted 100% to local CLI and antigravity scripts (`npm run sync-all`, `sync-transactions`, `sync-apartments`, `request-indexing`) with zero web admin UI dependency.
- **Authentication**: Fully decoupled and neutralized to static anonymous state (`user: null`, `isLoading: false`) without Firebase Auth network calls.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | Shared Types Migration | Move `KPIData`, `NewsItemData`, `AdBannerData` from `src/types/lounge.ts` to `src/types/dashboard.ts` and update index | M1 | Lounge Survey | DONE |
| 2 | Auth Neutralization | Replace active Firebase Auth in `AuthContext.tsx` & `useAuth.ts` with static anonymous provider; preserve re-exports | M1 | Auth Survey | DONE |
| 3 | Local Bookmarks | Decouple `useFavorites.ts` from `/api/favorite` and use 100% localStorage guest mode | M1 | Auth Survey | DONE |
| 4 | Server Auth Session Removal | Remove `/api/auth/session/route.ts` and auth session cookie management | M1 | Auth Survey | DONE |
| 5 | Admin Pages Deletion | Delete `src/app/admin/*` and `src/app/write-report/*` | M2 | Admin Survey | DONE |
| 6 | Admin APIs Deletion | Delete `src/app/api/admin/*`, `/api/apartments-sync`, and `/api/debug-reports` | M2 | Admin Survey | DONE |
| 7 | Admin Components Deletion | Delete `src/components/admin/*`, `AdminGuard.tsx`, `ReportUI.tsx` | M2 | Admin Survey | DONE |
| 8 | Admin Config & Facade Cleanup | Remove `admin.config.ts`, `verifyAdmin` from `authUtils.ts`, and `isAdmin` from `DashboardFacade.ts` | M2 | Admin Survey | DONE |
| 9 | Local CLI Verification | Verify and document CLI scripts (`sync-all`, `sync-transactions`, etc.) replacing web admin | M2 | Admin Survey | DONE |
| 10 | Lounge Pages Deletion | Delete `src/app/lounge/*` route hierarchy | M3 | Lounge Survey | DONE |
| 11 | Community APIs Deletion | Delete `/api/posts`, `/api/comments`, `/api/push/notify-comment` | M3 | Lounge Survey | DONE |
| 12 | Community Components Deletion | Delete `src/components/lounge/*`, `LoungeContainerClient`, `CommentSection`, `WriteReviewModal`, etc. | M3 | Lounge Survey | DONE |
| 13 | Community Services & Types Deletion | Delete `useComments.ts`, `usePostDetail.ts`, `post.repository.ts`, `comment.repository.ts`, `post.service.ts`, `src/types/lounge.ts` | M3 | Lounge Survey | DONE |
| 14 | Core Consumer Components Refactor | Remove lounge tabs/sections from `DashboardClient.tsx`, `ApartmentModal.tsx`, `apartmentPageService.ts`, etc. | M3 | Lounge Survey | DONE |
| 15 | Lounge Route Redirects | Add permanent redirects for `/lounge` to `/` in `next.config.ts` | M3 | Lounge Survey | DONE |
| 16 | FloatingUserBar & Modals Cleanup | Remove login/avatar triggers and profile modals from `FloatingUserBar.tsx`, delete `LoginGateModal.tsx`, remove nickname setup modals | M4 | Auth Survey | DONE |
| 17 | Navigation Entry Points Cleanup | Clean up `LoungeHeader.tsx`, `MobileDock.tsx`, `Footer.tsx`, `robots.ts` | M4 | Survey Aggregate | DONE |
| 18 | Test Suite Adaptation | Prune deleted lounge/admin tests, update mock assertions, verify passing 100% | M5 | Survey Aggregate | DONE |
| 19 | Build & Lint Gate | Ensure `npm run build`, `npm run lint`, and `npm run test` pass with 0 errors | M5 | ORIGINAL_REQUEST | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Type Relocation & Auth Neutralization Foundation | Extract types from `lounge.ts` into `dashboard.ts`, neutralize `AuthContext`/`useAuth` to static anonymous state, switch `useFavorites` to localStorage, remove session API | none | DONE |
| M2 | Admin Features & Routes Purge | Delete `/admin/*`, `/write-report/*`, `/api/admin/*`, `/components/admin/*`, `AdminGuard.tsx`, admin config & facade references | M1 | DONE |
| M3 | Community / Lounge Features Purge | Delete `/lounge/*`, `/api/posts`, `/api/comments`, community components, hooks, services, update consumer views, add redirects | M1 | DONE |
| M4 | Navigation, Layout & UI Polish | Remove login/avatar/profile buttons from `FloatingUserBar.tsx`, remove `LoginGateModal.tsx`, verify `LoungeHeader`, `MobileDock`, `Footer` | M2, M3 | DONE |
| M5 | Test Suite Adaptation & Full Verification | Update/prune tests, verify `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` pass with 0 errors | M4 | DONE |

## Gate Verification Summary
- **Reviewer 1**: APPROVE
- **Reviewer 2**: APPROVE
- **Challenger 1**: APPROVE
- **Challenger 2**: APPROVE
- **Forensic Auditor**: CLEAN
- **Gate Result**: PASS (Unconditional)

## Code Layout
- `frontend/src/app`: Page routes and layouts.
- `frontend/src/components`: UI components organized by feature.
- `frontend/src/contexts`: React context providers (`AuthContext`, `SettingsContext`, `SearchContext`).
- `frontend/src/hooks`: Custom React hooks (`useAuth`, `useFavorites`, etc.).
- `frontend/src/lib`: Core utilities, facades, and Firebase configurations.
- `frontend/scripts`: Administrative CLI and data sync scripts (`sync-all.js`, `sync-transactions.js`, `sync-apartments.js`, `request-indexing.js`).
- `frontend/src/__tests__`: Jest test suites (121 suites, 1,327 tests 100% passing).
