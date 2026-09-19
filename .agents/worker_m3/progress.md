# Progress — Worker (Milestone 3: Community / Lounge Features Purge)

Last visited: 2026-09-19T20:38:30+09:00

## Phase 1: Type Migration & Safe Relocation
- [x] Migrate `KPIData`, `NewsItemData`, `AdBannerData` from `src/types/lounge.ts` to `src/types/dashboard.ts`
- [x] Update `src/lib/types/dashboard.types.ts` and `src/types/index.ts`
- [x] Verify TypeScript types compilation

## Phase 2: Consumer Components & Facades Refactoring
- [x] Update `src/components/DashboardClient.tsx` (remove lounge tab, write review modal, lounge imports)
- [x] Update `src/components/apartment/ApartmentModal.tsx` (remove CommentSection, useComments, '아파트 이야기' tab)
- [x] Update `src/lib/services/apartmentPageService.ts` and `src/app/apartment/[aptName]/page.tsx`
- [x] Update `src/components/MacroDashboardClient.tsx` (remove /api/posts SWR fetch, LoungeTalkWidget)
- [x] Update Navigation: `LoungeHeader.tsx`, `MobileDock.tsx`, `RegionAccordion.tsx`, `ContactClient.tsx`, `src/app/news/page.tsx`
- [x] Update Preloaders: `src/lib/preload.ts`, `src/components/common/preload.ts`, `src/app/explore/ExploreClient.tsx`, `src/app/zone/[id]/ZoneDetailClient.tsx`
- [x] Update Utilities & Facades: `firestoreConverters.ts`, `structuredData.ts`, `kakaoShare.ts`, `facade.schemas.ts`, `DashboardFacade.ts`
- [x] Update `src/app/sitemap.ts`, `next.config.ts` (301 redirects), `firestore.rules`

## Phase 3: File Deletions
- [x] Delete `src/app/lounge/` route hierarchy (`layout.tsx`, `page.tsx`, `@modal/`, `[id]/`)
- [x] Delete APIs: `/api/posts/`, `/api/comments/`, `/api/push/notify-comment/`
- [x] Delete Components: `LoungeContainerClient`, `LoungeFeedClient`, `LoungeDetailClient`, `LoungeComposeClient`, `LoungeModalBackdrop`, `LoungeSkeleton`, `AptStoriesWidget`, `CommentSection`, `WriteReviewModal`, `LoungeTalkWidget`
- [x] Delete Hooks/Services/Repositories: `useComments.ts`, `usePostDetail.ts`, `post.repository.ts`, `comment.repository.ts`, `post.service.ts`
- [x] Delete `src/types/lounge.ts`
- [x] Delete dedicated tests: `LoungeFeedClient.test.tsx`, `usePostDetail.test.ts`

## Phase 4: Test Suite Pruning & Final Verification
- [x] Prune/adapt test files:
  - `src/lib/utils/structuredData.test.ts`
  - `src/lib/validation/facade.schemas.test.ts`
  - `src/r3_r4_empirical_stress.test.tsx`
  - `src/m1_empirical_verification.test.ts`
  - `src/__tests__/m2_challenger_adversarial.test.ts`
  - `src/__tests__/m3_challenger_adversarial.test.tsx`
  - `src/__tests__/m4_challenger2_empirical_apartmentPage.test.tsx`
  - `src/__tests__/m4_challenger_api_routes_empirical.test.ts`
  - `src/__tests__/adsense_integration.test.tsx`
  - `src/__tests__/m5_tier5_adversarial_challenge.test.tsx`
  - `src/__tests__/local-notices-e2e.test.tsx`
- [x] Verify `npx tsc --noEmit` -> Code 0 (0 errors)
- [x] Verify `npm test` -> 120 passed, 120 total suites (1,311 tests passed, 100%)
- [x] Verify `npm run build` -> Code 0 (Production build completely successful, 225/225 pages generated)
- [x] Generate `handoff.md` and send completion message to parent
