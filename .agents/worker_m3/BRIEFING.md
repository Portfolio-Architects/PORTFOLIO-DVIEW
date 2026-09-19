# BRIEFING — 2026-09-19T20:38:30+09:00

## Mission
Execute Milestone 3: Community / Lounge Features Purge for D-VIEW (Remove lounge routes, APIs, components, hooks, services, repositories, type migration, test pruning, 301 redirects).

## 🔒 My Identity
- Archetype: Worker (implementer, qa, specialist)
- Roles: implementer, qa, specialist
- Working directory: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_m3`
- Original parent: da9374d7-02d0-4544-a7c6-dc957200cd5c
- Milestone: M3 (Application & Hooks Layer Refactoring)
- Parent (2026-09-19): 4221d0a5-4abc-4d55-842d-af41a849b34b
- Current Milestone: Milestone 3 — Community / Lounge Features Purge

## 🔒 Key Constraints
- Decouple hooks from raw Firestore queries (`useStaticData.ts` -> client repository/service with in-memory caching and offline/local fallback).
- Create typed client API client (`src/lib/api/apiClient.ts`) wrapping `fetch` with envelope handling, error extraction, abort signal support, timeout management.
- Refactor `useFavorites.ts`, `useComments.ts`, `useApartmentDetails.ts`, `usePostDetail.ts` to use typed data fetching.
- Ensure race condition, cancellation & lifecycle management across hooks (`useApartmentDetails`, `useMacroData`, `useTechnoValleyData`, `useFavorites`, `useStaticData`).
- Preserve all existing hook signatures, return parameters, and event callbacks (0 regressions).
- Integrity mandate: No dummy/facade implementations, genuine logic, real state and behavior.
- Full verification: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- [M3 Purge] Delete entire `src/app/lounge/` route hierarchy (`layout.tsx`, `page.tsx`, `@modal/`, `[id]/`).
- [M3 Purge] Delete APIs: `/api/posts/`, `/api/comments/`, `/api/push/notify-comment/`.
- [M3 Purge] Delete components: `LoungeContainerClient`, `LoungeFeedClient`, `LoungeDetailClient`, `LoungeComposeClient`, `LoungeModalBackdrop`, `LoungeSkeleton`, `AptStoriesWidget`, `CommentSection`, `WriteReviewModal`, `src/components/lounge/`.
- [M3 Purge] Delete hooks/services/repositories: `useComments.ts`, `usePostDetail.ts`, `post.repository.ts`, `comment.repository.ts`, `post.service.ts`.
- [M3 Purge] CRITICAL: Migrate `KPIData`, `NewsItemData`, `AdBannerData` from `src/types/lounge.ts` to `src/types/dashboard.ts` BEFORE deleting `src/types/lounge.ts`! Update `src/lib/types/dashboard.types.ts` and `src/types/index.ts`.
- [M3 Purge] Update `DashboardClient.tsx`, `ApartmentModal.tsx`, `apartmentPageService.ts`, `apartment/[aptName]/page.tsx`, `MacroDashboardClient.tsx`, `preload.ts`, facades, `sitemap.ts`, `next.config.ts` (301 redirects).
- [M3 Purge] Prune/adapt tests: delete `LoungeFeedClient.test.tsx`, `usePostDetail.test.ts`, prune `local-notices-e2e.test.tsx`, `m4_challenger`, `r3_r4`, `structuredData`, etc.
- [M3 Purge] STRICTLY PRESERVE: Local Notices (`/api/local-notices`, `localNoticesService.ts`), Scouting Reports (`/report`), Apartment Core, Reviews collection.

## Current Parent
- Conversation ID: 4221d0a5-4abc-4d55-842d-af41a849b34b
- Updated: 2026-09-19T20:38:30+09:00

## Task Summary
- **What to build**: Complete Community / Lounge Features Purge for D-VIEW.
- **Success criteria**:
  - Safe migration of domain types (`KPIData`, `NewsItemData`, `AdBannerData`) to `src/types/dashboard.ts`.
  - Removal of `/lounge` routes, community APIs (`/api/posts`, `/api/comments`, `/api/push/notify-comment`), lounge components, hooks, services, repositories, schemas, and rules.
  - 301 permanent redirects for `/lounge` and `/lounge/:path*` to `/` in `next.config.ts`.
  - Clean `npx tsc --noEmit` (0 errors), 100% test pass rate (`npm test` 120/120 suites, 1,311 tests), and successful production build (`npm run build`).
  - Strict preservation of Local Notices, Scouting Reports, Apartment Core, and user Reviews.

## Key Decisions Made
- Migrated `KPIData`, `NewsItemData`, and `AdBannerData` to `src/types/dashboard.ts` and re-exported from barrel `src/types/index.ts` and `src/lib/types/dashboard.types.ts` prior to deleting `src/types/lounge.ts`.
- Replaced dead community/lounge links in headers, docks, accordions, and share helpers with canonical `/news` or `/` destinations.
- Configured 301 permanent redirects in `next.config.ts` for `/lounge` and `/lounge/:path*` to `/`.
- Pruned community/lounge dead code from consumer components (`DashboardClient`, `ApartmentModal`, `apartmentPageService`, `MacroDashboardClient`, `DashboardFacade`, `sitemap`, `firestore.rules`).
- Pruned 11 test suites of dead lounge imports and assertions while preserving 100% of underlying domain, scraper, API, and UI behavior.

## Artifact Index
- `.agents/worker_m3/DISPATCH.md` — Task assignment
- `.agents/worker_m3/BRIEFING.md` — Persistent state and situational awareness
- `.agents/worker_m3/progress.md` — Execution log and milestone tracker
- `.agents/worker_m3/handoff.md` — Final 5-component handoff report

## Change Tracker
- **Files Deleted**:
  - `src/app/lounge/` (entire folder: `layout.tsx`, `page.tsx`, `@modal/`, `[id]/`)
  - `src/app/api/posts/` & `src/app/api/comments/` & `src/app/api/push/notify-comment/`
  - Components: `LoungeContainerClient.tsx`, `LoungeFeedClient.tsx`, `LoungeDetailClient.tsx`, `LoungeComposeClient.tsx`, `LoungeModalBackdrop.tsx`, `LoungeTalkWidget.tsx`, `LoungeSkeleton.tsx`, `AptStoriesWidget.tsx`, `CommentSection.tsx`, `WriteReviewModal.tsx`
  - Hooks: `useComments.ts`, `usePostDetail.ts`
  - Repositories/Services: `post.repository.ts`, `comment.repository.ts`, `post.service.ts`
  - Types: `src/types/lounge.ts`
  - Tests: `LoungeFeedClient.test.tsx`, `usePostDetail.test.ts`
- **Files Modified / Preserved**:
  - `src/types/dashboard.ts`, `src/types/index.ts`, `src/lib/types/dashboard.types.ts`
  - `src/components/DashboardClient.tsx`, `src/components/apartment/ApartmentModal.tsx`, `src/app/apartment/[aptName]/page.tsx`
  - `src/lib/services/apartmentPageService.ts`, `src/components/MacroDashboardClient.tsx`
  - `src/components/LoungeHeader.tsx`, `src/components/common/MobileDock.tsx`, `src/components/common/RegionAccordion.tsx`, `src/components/contact/ContactClient.tsx`, `src/app/news/page.tsx`
  - `src/lib/preload.ts`, `src/components/common/preload.ts`, `src/app/explore/ExploreClient.tsx`, `src/app/zone/[id]/ZoneDetailClient.tsx`
  - `src/lib/utils/firestoreConverters.ts`, `src/lib/utils/structuredData.ts`, `src/lib/utils/kakaoShare.ts`, `src/lib/validation/facade.schemas.ts`, `src/lib/DashboardFacade.ts`
  - `src/app/sitemap.ts`, `next.config.ts`, `firestore.rules`
  - 11 test files pruned of lounge mocks/assertions.
- **Build status**: PASS (tsc: 0 errors; jest: 120/120 suites passed, 1,311 tests passed; next build: 225/225 pages generated, exit 0).
- **Pending issues**: None.

## Quality Status
- **Build/test result**: 120 test suites passed, 1,311 tests passed (100% pass rate).
- **Lint/Type status**: 0 errors, 0 warnings.
- **Tests added/modified**: 11 test suites cleanly adapted; zero regressions.

## Loaded Skills
- None
