# Infrastructure, Data Access, Repositories, and Hooks Survey Report

**Explorer**: Explorer 2 (Infrastructure, Data Access, Repositories, and Application Hooks Specialist)  
**Date**: 2026-08-21  
**Scope**: `frontend/src/lib/`, `frontend/src/hooks/`, `frontend/src/app/api/`, data pipelines and environment configuration.

---

## Executive Summary

A comprehensive architectural inspection was conducted across the Infrastructure (`src/lib/`), Data Access/Repositories (`src/lib/repositories/`, `src/lib/services/`), Custom Hooks (`src/hooks/`), and Route Handlers (`src/app/api/`).

The codebase shows substantial architectural maturity in several areas (e.g., in-memory L1 cache fallbacks, Zod runtime validation, `useSyncExternalStore` integration, `resilientFetch` retry/backoff, and IndexedDB offline queuing). However, critical layer boundary leaks, upward dependencies, scattered raw data access calls, non-standardized API envelopes, and residual `any` types currently undermine strict separation of concerns and maintainability.

---

## 1. Complete Inventory of Modules

### 1.1 Infrastructure & Core Configuration (`src/lib/`)

| File / Module | Responsibility | Key Dependencies / Protocols | Notes & Health Assessment |
|---|---|---|---|
| `firebaseConfig.ts` | Firebase Web Client SDK initialization (Firestore, Auth, Storage, App Check) | `firebase/app`, `firebase/firestore`, `firebase/auth`, `firebase/storage`, `firebase/app-check`, `zod` | ⚠️ Uses type assertion `as unknown as ReturnType<...>` hiding `null` when env is absent during SSR/test. |
| `firebaseAdmin.ts` | Firebase Admin SDK initialization for Node.js server environments | `firebase-admin`, `path`, `fs`, `zod` | ✅ Validates multi-format credentials (local JSON, Vercel split keys). Configures `preferRest: true`. |
| `firebaseAdmin.client.ts` | Client-side stub for `firebaseAdmin` to prevent bundler leakage | None | ✅ Correctly exports null stubs. |
| `redis.ts` | Upstash Redis connection with `MemoryCacheFallback` and L1 LRU caching | `@upstash/redis`, `serverLruCache`, `zod` | ✅ `ResilientRedisWrapper` with 1500ms timeout & mock fallback. |
| `rate-limit.ts` | Upstash sliding window rate limiter instance | `@upstash/ratelimit`, `rawRedis`, `zod` | ⚠️ Redundant with `src/lib/api/rateLimiter.ts`. |
| `src/lib/api/apiResponse.ts` | Standard Next.js response envelope helpers (`apiSuccess`, `apiError`) | `next/server` | ✅ Clean `{ success, data, meta }` / `{ success, error, code, details }` envelope. |
| `src/lib/api/rateLimiter.ts` | Route handler rate limiter with in-memory fallback & IP extraction | `@upstash/ratelimit`, `apiError` | ✅ Well-structured rate limit checker returning standard 429 response. |
| `src/lib/api/resilientFetch.ts` | HTTP client wrapper with retries, exponential backoff, jitter, and timeout | Native `fetch`, `AbortController`, `logger` | ✅ Robust implementation supporting signal merging and custom retry conditions. |
| `src/lib/config/admin.config.ts` | Admin email authorization constants and checker | None | ⚠️ Hardcoded email list (`ocs5672@gmail.com`). |
| `src/lib/config/api.config.ts` | MOLIT public real estate API configurations | None | ⚠️ Hardcoded public portal key and default query period. |
| `src/lib/contexts/AuthContext.tsx` | React Auth Provider & Playwright E2E Mock Auth Bridge | `firebase/auth`, `DashboardFacade`, `user.repository` | ⚠️ **Layer Violation**: Located inside `src/lib/contexts/` instead of `src/contexts/` or `src/app/providers/`. |
| `src/lib/contexts/SettingsContext.tsx` | React Settings Context (theme, area unit, modal state) | `localCache`, `next/dynamic` | ⚠️ **Severe Layer Violation**: Dynamically imports `@/components/SettingsModal` UI component into `src/lib/`. |
| `src/lib/hooks/useNetworkStatus.ts` | Browser online/offline tracker via `useSyncExternalStore` | `useSyncExternalStore` | ⚠️ Duplicate: Hook placed in `src/lib/hooks/` and re-exported in `src/hooks/`. |
| `DashboardFacade.ts` | Facade orchestrator for dashboard feeds, reports, comments, reviews | Repositories, Services, Subscribable | ⚠️ **Cyclic Dependency**: Re-exports `useDashboardData` from `src/hooks/useDashboardData.ts`. |
| `analytics-service.ts` | Google Analytics 4 Beta Data Client with LKG (Last Known Good) Redis caching | `@google-analytics/data`, `redis` | ✅ Strong fallback resilience with mock fallback generator when credentials are absent. |
| `authUtils.ts` | Server-side Firebase ID token & session cookie verification | `firebaseAdmin`, `zod` | ✅ In-memory claim caching to avoid network latency per request. |
| `apartment-data.ts`, `dong-apartments.ts`, `dongs.ts`, `macro-summary.ts`, `transaction-summary.ts`, `zones.ts` | Static reference data, dong definitions, and regional metadata | None | ⚠️ Discrepancy between `zones.ts` (7 investment zones) and `dongs.ts` (11 legal dongs). |

---

### 1.2 Data Access & Repositories (`src/lib/repositories/`)

| Repository Module | Target Datastore / External System | Key Functions | Major Observations & Deficiencies |
|---|---|---|---|
| `apartment.repository.ts` | Google Sheets `/api/apartments-by-dong`, Firestore `settings/apartmentMeta`, Local fs | `fetchApartmentNames`, `fetchApartmentMeta` | ⚠️ Hybrid SSR/client branching using `readJsonFileCached` vs `fetch()`. |
| `comment.repository.ts` | Firestore `field_reports/{id}/comments` and `lounge_apt_stories` | `addComment`, `listenToComments`, `getComments`, `deleteComment` | ✅ Uses `writeBatch` and `firestoreThrottle`. Double writes comments to `lounge_apt_stories`. |
| `energy.repository.ts` | MOLIT Building Energy Hub OpenAPI (JSON) | `fetchEnergyJsonFromPublicPortal` | ⚠️ Hardcoded API service key fallback. Uses `axios` instead of `resilientFetch`. |
| `favorite.repository.ts` | Firestore `favoriteCounts` collection & Redis | `fetchFavoriteCounts`, `incrementFavoriteCount` | ✅ Implements isomorphic query with Redis cache invalidation. |
| `googleSheets.repository.ts` | Google Spreadsheets CSV endpoints | `fetchCsv` | ✅ Multi-tier caching: In-Memory -> Local FS (`scratch/sheets-cache`) -> Redis -> Live Fetch with Exponential Backoff. |
| `isomorphicHelper.ts` | Redis cache bridge for SSR/Client execution | `executeIsomorphicQuery` | ✅ Safely executes serverQuery on server and clientQuery on client with Redis caching. |
| `location.repository.ts` | Google Sheets POI Tabs (Apartments, Schools, Stations, Academies, Restaurants, Sboyds) | `loadApartments`, `loadSchools`, `loadStations`, `loadAcademies`, `loadRestaurants`, `loadSboyds` | ⚠️ Duplicates CSV fetch retry logic. Embeds business normalization (Baskin Robbins naming) inside repo. |
| `news.repository.ts` | Firestore `local_notices` collection & Redis | `fetchRawLocalNotices`, `getCachedNotices`, `setCachedNotices` | ✅ Uses parallel timeout queries with Zod validation. |
| `officeTx.repository.ts` | MOLIT Office Trade XML OpenAPI | `fetchOfficeXmlFromPublicPortal` | ⚠️ Hardcoded API key fallback. Uses `axios`. Contains 170 lines of static mock XML. |
| `post.repository.ts` | Firestore `posts`, `lounge_apt_stories`, `field_reports` | `listenToPosts`, `createPost`, `incrementPostLike`, `incrementPostView`, `deletePost`, `getPost`, `getRecentPosts` | ⚠️ **Layer Violation**: Imports Lucide-react UI icons (`Train`, `Building`, etc.). Uses `any[]` and contains heavy markdown parsing inside repository. |
| `report.repository.ts` | Firestore `scoutingReports` and `field_reports` | `listenToReports`, `getFullReport`, `getFullReportByApartmentName`, `incrementReportLike`, `incrementReportView`, `fetchRecentScoutingReports`, `saveScoutingReport`, `updateScoutingReport`, `saveFieldReport` | ⚠️ Mixes two collection schemas (`scoutingReports` vs `field_reports`). Uses untyped `any` in parameter types (`saveScoutingReport(reportData: any)`). |
| `review.repository.ts` | Firestore `user_reviews` collection | `listenToReviews`, `getRecentReviews`, `addReview`, `incrementReviewLike`, `deleteReview` | ✅ Real-time listener and Zod schema mapping with fallback. |
| `searchConsole.repository.ts` | Google Search Console API via RSA-SHA256 JWT | `getSearchConsoleStatus`, `fetchSearchConsoleStatusFromGoogle` | ✅ Self-diagnostic mock fallback if service account keys are missing. |
| `storage.repository.ts` | Firebase Storage SDK | `uploadRawBytes`, `deleteRawObject` | ✅ Clean raw storage adapter. |
| `traffic.repository.ts` | Firestore `daily_stats` collection | `incrementWebsiteVisit`, `incrementContentView`, `getDailyVisitStats`, `getDailyContentViews` | ⚠️ **Circular Architecture**: Calls internal HTTP endpoint `fetch('/api/traffic')` from repository. |
| `user.repository.ts` | Firestore `users` collection | `getOrCreateProfile`, `setApartmentVerification`, `updateNickname`, `updatePhotoURL` | ✅ Supports isomorphic Admin SDK and Client SDK execution with throttle. |

---

### 1.3 Application Hooks Layer (`src/hooks/`)

| Custom Hook | Purpose & Data Source | Lifecycle & Synchronization Pattern | Concurrency & Race Condition Safeguards | Leaks & Deficiencies |
|---|---|---|---|---|
| `useApartmentDetails.ts` | Orchestrates apartment transaction history, full report, location scores | SWR for static JSON + Facade promise for report + SWR lazy load | `activeRequestIdRef` increments on param change; `unmounted` guard prevents state update after unmount | Direct `fetch('/api/report-view')` call inside hook. |
| `useAuth.ts` | Re-exports AuthContext state | React Context consumer | Managed by `AuthContext` | None. |
| `useComments.ts` | Real-time comment listener, submission, deletion | Firestore listener via Facade + local input state | `isMountedRef` check; `commentInputRef` prevents re-renders | Direct un-abstracted `fetch('/api/push/notify-comment')` and `fetch('/api/indexing/apartment')`. Native `alert`/`confirm` calls. |
| `useDashboardData.ts` | Subscribes to dashboard reactive stores | `useSyncExternalStore` via `DashboardFacade` | Teardown-safe synchronous external store reading | None. |
| `useDashboardMeta.ts` | Loads apartments by dong, type map, name mappings | SWR + manual lazy fetch trigger | `unmounted` guard | Direct `fetch('/api/explore/search-data')` and `fetch('/api/dashboard-init')`. |
| `useDebounce.ts` | Value debounce | `useEffect` with `setTimeout` | Timer cleared on change/unmount | None. |
| `useFavorites.ts` | Multi-tab guest & user favorites synchronization | `localStorage` + CustomEvents + SWR/REST | `isMountedRef` guard; optimistic UI update with rollback | Direct `fetch('/api/favorite')` and `fetch('/api/favorite-counts')` calls scattered across hook. |
| `useMounted.ts` | SSR hydration mismatch prevention | `useState` + `useEffect` | Sets mounted boolean | None. |
| `useNetworkStatus.ts` | Connectivity monitor | `useSyncExternalStore` | Window online/offline events | Redundant duplicate in `src/lib/hooks/`. |
| `usePreloadApartmentTx.ts` | Preloads apartment JSON transactions | SWR `preload()` | Error-safe try/catch fallback | None. |
| `usePreventElasticBounce.ts` | iOS rubber-banding scroll prevention | Native DOM event listeners | Non-passive touchmove cleanup | None. |
| `useStaticData.ts` | Merges static transaction summaries with live Firestore transactions | SWR + raw Firestore queries | `requestIdleCallback` delayed fetch; memoized merge helpers | ⚠️ **Bypasses Repository**: Executes raw Firestore `getDocs(query(collection(db, 'transactions')))` directly in hook. |
| `useSwipeNavigation.ts` | Mobile edge swipe back navigation | Touch event listeners | Window event teardown | None. |
| `useAdBlockDetector.ts` | Detects adblocker presence | DOM probing | Timeout cleanup | None. |

---

## 2. Key Architectural Issues & Deficiencies

```
[UI Layer (Components / Pages)]
        │
        ▼ ⚠️ Leaks & Violations:
        ├─ Direct raw fetch() to internal API routes without client adapters
        ├─ SettingsContext dynamically imports UI Component (SettingsModal)
        │
[Application / Hook Layer (src/hooks/)]
        │
        ▼ ⚠️ Leaks & Violations:
        ├─ Direct raw Firestore queries in useStaticData.ts
        ├─ Direct un-abstracted fetch('/api/...') in useFavorites, useComments, useApartmentDetails
        ├─ useDashboardData imported into DashboardFacade.ts (Cyclic Dependency)
        │
[Infrastructure & Repositories (src/lib/)]
        │
        ▼ ⚠️ Leaks & Violations:
        ├─ post.repository.ts imports Lucide-react UI icons
        ├─ traffic.repository.ts calls fetch('/api/traffic') instead of direct DB access
        ├─ Untyped `any` in report.repository.ts & post.repository.ts
        ├─ Hardcoded fallback API keys in officeTx, energy, api.config
        │
[Domain Contracts (src/types/ & src/lib/types/)]
        ⚠️ Fragmented type definitions scattered across src/lib/types/ and src/lib/validation/
```

### Critical Findings:

1. **Upward Layer Dependencies & Circularities**:
   - `DashboardFacade.ts` (in `src/lib/`) imports `useDashboardData` from `src/hooks/useDashboardData.ts`.
   - `SettingsContext.tsx` (in `src/lib/contexts/`) imports `SettingsModal` from `src/components/SettingsModal`.
   - `post.repository.ts` (in `src/lib/repositories/`) imports React UI Icon components (`Train`, `Building`, `BookOpen`, `MessageSquare`) from `lucide-react`.
   - `traffic.repository.ts` calls `/api/traffic`, while `/api/traffic` calls Firestore, and `report.repository.ts`/`post.repository.ts` call `traffic.repository.ts`.

2. **Scattered Data Access & Missing Client Adapters**:
   - Custom hooks (`useFavorites`, `useComments`, `useApartmentDetails`, `useDashboardMeta`) make ad-hoc `fetch('/api/...')` calls without an abstracted API Client or Adapter.
   - `useStaticData.ts` bypasses all repository layers and calls Firestore SDK `getDocs(collection(db, 'transactions'))` directly inside a React hook.

3. **Untyped Leaks and Repository Method Signatures**:
   - `report.repository.ts` contains methods typed with `any` (`saveScoutingReport(reportData: any)`, `updateScoutingReport(reportId: string, updateData: any)`, `saveFieldReport(fieldReportData: any)`, `fetchRecentScoutingReports(): Promise<any[]>`).
   - `post.repository.ts` contains `processCombinedPosts(..., rawStories: any[])`.

4. **API Route Response & Rate Limiting Inconsistency**:
   - Route handlers in `src/app/api/` (such as `apartments-by-dong`, `favorite`, `posts`, `comments`) bypass the standard envelope functions `apiSuccess` and `apiError` from `src/lib/api/apiResponse.ts`.
   - Route handlers manually extract IP addresses and call `rateLimiter.limit(...)` rather than utilizing the centralized `checkRateLimit` helper in `src/lib/api/rateLimiter.ts`.
   - Route handlers duplicate database business logic rather than delegating to clean server repositories/services.

5. **Hardcoded Secrets & Environment Fallbacks**:
   - Public portal API keys and credentials are hardcoded as fallbacks in `src/lib/config/api.config.ts`, `src/lib/repositories/officeTx.repository.ts`, `src/lib/repositories/energy.repository.ts`, and `src/app/api/cron/send-tx-notifications/route.ts`.

---

## 3. Recommended Architectural Target State

### 3.1 Strict Layer Isolation Model

1. **Domain Layer (`src/types/`, `src/domain/`)**:
   - Centralize all pure entity definitions, DTOs, value objects, and Zod schemas.
   - Zero dependencies on React, Next.js, Firebase, or UI libraries.

2. **Infrastructure Layer (`src/lib/`, `src/infrastructure/`)**:
   - **Adapters & Repositories**: Pure I/O abstractions (`ApartmentRepository`, `ReportRepository`, `PostRepository`, `FavoriteRepository`, `EnergyAdapter`, `OfficeTxAdapter`, `AnalyticsAdapter`).
   - **Clients**: `resilientFetch`, `redis`, `firebaseConfig` (client), `firebaseAdmin` (server).
   - **No UI imports** (no Lucide icons, no React modals, no custom hooks).

3. **Application & State Layer (`src/hooks/`, `src/contexts/`, `src/services/`)**:
   - React Contexts moved to `src/contexts/` or `src/app/providers/`.
   - Custom hooks consume repository interfaces or unified API client adapters via SWR/TanStack-style query mechanisms.
   - All async network calls in hooks support `AbortController` cancellation and structured error boundaries.

4. **Presentation Layer (`src/components/`, `src/app/`)**:
   - Pure UI and Page orchestration consuming hooks and context providers.
   - Standardized API route handlers (`src/app/api/`) delegating exclusively to server services/repositories and returning `apiSuccess`/`apiError` responses.

---

## 4. Actionable Migration Roadmap

### Milestone 2: Infrastructure & Domain Consolidation
- [ ] Migrate all types from `src/lib/types/` to `src/types/` and replace all `any` occurrences in repositories with strict DTO types.
- [ ] Cleanse `src/lib/`:
  - Move `src/lib/contexts/` to `src/contexts/`.
  - Remove `SettingsModal` dynamic import from `SettingsContext`.
  - Remove `lucide-react` icons from `post.repository.ts`.
  - Remove `useDashboardData` re-export from `DashboardFacade.ts`.
  - Remove duplicate `src/lib/hooks/useNetworkStatus.ts`.
- [ ] Refactor Repositories & Adapters:
  - Separate client-facing and server-facing data access cleanly.
  - Move hardcoded API keys to `.env` validation via Zod config.
  - Standardize MOLIT API calls using `resilientFetch` instead of `axios`.
- [ ] Standardize API Route Handlers (`src/app/api/`):
  - Enforce `checkRateLimit()` across all endpoints.
  - Enforce `apiSuccess()` and `apiError()` response envelopes.
  - Delegate data queries to repositories/services instead of embedding raw Firestore queries in route handlers.

### Milestone 3: Application Hooks & State Decoupling
- [ ] Create a unified `apiClient` / HTTP adapter for client-side API calls.
- [ ] Refactor `useFavorites`, `useComments`, `useApartmentDetails`, and `useDashboardMeta` to use the unified API client with cancellation (`AbortSignal`).
- [ ] Refactor `useStaticData.ts` to call a dedicated `TransactionRepository` rather than raw Firestore queries.
- [ ] Standardize optimistic UI mutations and local storage caching across all interactive hooks.
