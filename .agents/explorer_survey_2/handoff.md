# Handoff Report — Infrastructure, Data Access, Repositories, and Hooks Survey

**Author**: Explorer 2  
**Role**: Teamwork Explorer (Investigator & Synthesizer)  
**Date**: 2026-08-21  
**Handoff Type**: Hard (Task Complete)

---

## 1. Observation

Direct code observations with exact file paths and line numbers:

1. **Upward Layer Dependencies & Circularities**:
   - `frontend/src/lib/DashboardFacade.ts:516`:
     ```typescript
     // --- React Hook (re-exported for backward compatibility) ---
     export { useDashboardData } from '@/hooks/useDashboardData';
     ```
     `DashboardFacade` in the infrastructure layer (`src/lib/`) directly imports and re-exports a React hook from the application hook layer (`src/hooks/`).
   - `frontend/src/lib/contexts/SettingsContext.tsx:9-13`:
     ```typescript
     const SettingsModal = dynamic(() => import('@/components/SettingsModal').catch(err => {
       logger.warn('SettingsContext.SettingsModal', 'SettingsModal Chunk Load failure, initiating fallback reload', undefined, err);
       safeReload('SettingsModal');
       return { default: () => null };
     }), {
     ```
     `SettingsContext` in `src/lib/contexts/` directly imports a React UI modal component from `src/components/SettingsModal`.
   - `frontend/src/lib/repositories/post.repository.ts:13`:
     ```typescript
     import { Train, Building, BookOpen, MessageSquare } from 'lucide-react';
     ```
     A repository data access module imports React icon presentation components.
   - `frontend/src/lib/repositories/traffic.repository.ts:57`:
     ```typescript
     await fetch('/api/traffic', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ action: 'websiteVisit' })
     });
     ```
     A repository calls an internal Next.js HTTP Route Handler (`/api/traffic`), which in turn calls Firestore Admin SDK. `report.repository.ts:300` and `post.repository.ts:272` also call `TrafficRepo.incrementContentView`, forming an indirect HTTP loop.

2. **Scattered Data Access & Missing Client Adapters in Hooks**:
   - `frontend/src/hooks/useStaticData.ts:3-4, 265-275`:
     ```typescript
     import { collection, query, where, getDocs } from 'firebase/firestore';
     import { db } from '@/lib/firebaseConfig';
     ...
     const q = query(
       collection(db, 'transactions'),
       where('contractDate', '>=', cutoffDateStr)
     );
     const snap = await getDocs(q);
     ```
     `useStaticData.ts` executes raw client-side Firestore queries directly inside a custom React hook without utilizing any repository or data adapter.
   - `frontend/src/hooks/useComments.ts:89, 105`:
     ```typescript
     await fetch('/api/push/notify-comment', { ... });
     fetch('/api/indexing/apartment', { ... });
     ```
   - `frontend/src/hooks/useFavorites.ts:80, 122, 151, 260, 291`:
     Direct raw `fetch('/api/favorite-counts')` and `fetch('/api/favorite')` calls scattered across multiple effects and callbacks without an API client wrapper.

3. **Untyped `any` Types in Repository Contracts**:
   - `frontend/src/lib/repositories/report.repository.ts:310, 413, 431, 448`:
     ```typescript
     export async function fetchRecentScoutingReports(limitCount: number = 30): Promise<any[]>
     export async function saveScoutingReport(reportData: any): Promise<string>
     export async function updateScoutingReport(reportId: string, updateData: any): Promise<void>
     export async function saveFieldReport(fieldReportData: any): Promise<string>
     ```
   - `frontend/src/lib/repositories/post.repository.ts:431`:
     ```typescript
     async function processCombinedPosts(..., rawStories: any[], limitCount: number)
     ```

4. **Hardcoded Fallback API Keys in Source Files**:
   - `frontend/src/lib/repositories/officeTx.repository.ts:184`:
     ```typescript
     const key = process.env.PUBLIC_DATA_PORTAL_KEY || '4611c02045e69b5e6c0bf50b9ecbee6de92e7ee0351eb8a7d529253340f755ff';
     ```
   - `frontend/src/lib/repositories/energy.repository.ts:19`:
     ```typescript
     const key = process.env.PUBLIC_DATA_PORTAL_KEY || '4611c02045e69b5e6c0bf50b9ecbee6de92e7ee0351eb8a7d529253340f755ff';
     ```
   - `frontend/src/lib/config/api.config.ts:16`:
     ```typescript
     serviceKey: '4611c02045e69b5e6c0bf50b9ecbee6de92e7ee0351eb8a7d529253340f755ff',
     ```

5. **Inconsistent API Route Response Envelope & Rate Limiting**:
   - `frontend/src/app/api/apartments-by-dong/route.ts:20, 22, 47`:
     Direct `rateLimiter.limit(...)` call instead of `checkRateLimit()`, returns `{ error: 'Too Many Requests' }` and `{ error: 'Failed to load apartments' }` instead of using `apiError()`.
   - `frontend/src/app/api/favorite/route.ts:77-106`:
     Route handler directly executes Firestore Admin transactions (`adminDb.runTransaction`), Redis operations (`redis.hincrby`), and returns `{ favorited }` instead of using `apiSuccess()`.

---

## 2. Logic Chain

1. **Premise**: Architectural cleanliness requires strict unidirectional dependency flow: Presentation (`src/components/`, `src/app/`) → Application / State (`src/hooks/`, `src/contexts/`) → Infrastructure / Repositories (`src/lib/`, `src/repositories/`) → Domain (`src/types/`, `src/domain/`).
2. **From Observation 1**: When `DashboardFacade` re-exports `useDashboardData`, `SettingsContext` renders `SettingsModal`, and `post.repository` imports Lucide icons, lower layers depend directly on higher-level Presentation/Application constructs. This creates circular build dependencies and hinders modular tree-shaking and isolation.
3. **From Observation 2**: When custom hooks perform raw Firestore queries (`useStaticData`) and scattered `fetch()` calls (`useFavorites`, `useComments`), the data fetching layer cannot be tested in isolation, mocked cleanly in SSR/E2E, or centralized for global retry, caching, and auth token management.
4. **From Observation 3**: When repository methods accept or return `any`, domain type safety is lost at the data boundary, allowing schema drift and runtime type assertion errors.
5. **From Observation 4**: Hardcoded fallback API keys in repositories violate secure configuration standards and prevent dynamic environment key rotation.
6. **From Observation 5**: When API routes bypass `apiSuccess`/`apiError` and `checkRateLimit`, client adapters cannot rely on a uniform response contract (`{ success, data, error, meta }`), leading to defensive ad-hoc parsing across UI hooks.
7. **Conclusion**: Establishing explicit repository/adapter interfaces, isolating React contexts into an application layer, creating a unified HTTP client adapter, and enforcing API envelope standardization will eliminate all circularities and satisfy R1, R2, and R3.

---

## 3. Caveats

1. **Static Data Fallbacks**: Several services (`googleSheets.ts`, `dashboardData.ts`) rely on static JSON files in `public/data/` (e.g., `apartments-by-dong.json`, `macro-trend.json`, `type-map.json`) as fallbacks. Refactoring must preserve these local cache fallbacks so that offline and test environments function seamlessly.
2. **E2E Mock Auth Bridge**: `AuthContext.tsx` contains special mock auth hooks (`window.__E2E_MOCK_AUTH__`) tailored for Playwright testing. Any relocation of `AuthContext` must preserve this interface.
3. **Double-Write Operations**: `comment.repository.ts` writes atomically to both `field_reports/{id}/comments` and `lounge_apt_stories`. This behavioral double-write is intentional for cross-feed discovery and must be preserved during repository restructuring.

---

## 4. Conclusion

The data and infrastructure layer is functionally resilient (supported by Upstash Redis fallbacks, in-memory caching, firestore throttles, and offline queues), but requires systematic structural realignment across Milestones 2 and 3:

1. **Milestone 2 Priority**:
   - Extract domain types and DTOs into `src/types/`.
   - Remove upward and circular dependencies (`SettingsModal` from `SettingsContext`, `useDashboardData` from `DashboardFacade`, Lucide icons from `post.repository`).
   - Move `src/lib/contexts/` to `src/contexts/`.
   - Clean up hardcoded API keys into Zod-validated environment configurations.
   - Standardize all API route handlers with `checkRateLimit` and `apiSuccess`/`apiError`.

2. **Milestone 3 Priority**:
   - Create a typed `ApiClient` / Adapter layer for client-side HTTP calls.
   - Refactor `useStaticData.ts` to consume a dedicated repository rather than raw Firestore queries.
   - Standardize `AbortController` cancellation and cache invalidation policies across all custom hooks.

---

## 5. Verification Method

To verify these observations and subsequent refactoring implementations:

1. **Static Type Check**:
   ```bash
   npx tsc --noEmit
   ```
2. **Lint & Layer Dependency Verification**:
   ```bash
   npm run lint
   ```
3. **Automated Unit & Integration Test Suite**:
   ```bash
   npm test
   ```
4. **Production Build Validation**:
   ```bash
   npm run build
   ```
5. **Key Files to Inspect for Verification**:
   - `frontend/src/lib/DashboardFacade.ts` (Verify no hooks re-exported)
   - `frontend/src/lib/contexts/SettingsContext.tsx` (Verify no UI components imported)
   - `frontend/src/lib/repositories/post.repository.ts` (Verify no Lucide icons imported)
   - `frontend/src/hooks/useStaticData.ts` (Verify no raw `firebase/firestore` queries)
   - `frontend/src/lib/repositories/report.repository.ts` (Verify all `any` types replaced with strict DTOs)
   - `frontend/src/app/api/favorite/route.ts` & `apartments-by-dong/route.ts` (Verify standard response envelopes)
