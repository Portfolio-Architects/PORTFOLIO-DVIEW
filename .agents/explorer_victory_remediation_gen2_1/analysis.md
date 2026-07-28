# Explorer 1 Analysis: Next.js API Route Prerender & Runtime Configuration Remediation

**Date**: 2026-07-28  
**Agent**: Explorer 1 (API Route Investigation Specialist)  
**Project**: PORTFOLIO - DVIEW (`frontend/src/app/api/`)

---

## 1. Executive Summary

During Generation 2 audit execution, `npm run build` failed with exit code 1 due to a static prerendering error in Next.js page collection:
```text
Error occurred prerendering page "/api/proxy-image". Read more: https://nextjs.org/docs/messages/prerender-error
Error: Cannot find module '...\frontend\.next\server\app\api\proxy-image\route.js'
Export encountered an error on /api/proxy-image/route: /api/proxy-image, exiting the build.
```

Our thorough codebase audit of all 43 API routes in `frontend/src/app/api/` (plus `frontend/src/app/feed.xml/route.ts`) revealed:
1. **Critical Defect**: `/api/proxy-image/route.ts`, `/api/explore/search-data/route.ts`, `/api/technovalley/center-specs/route.ts`, and `/api/technovalley/transactions/route.ts` lacked both `export const runtime = 'nodejs';` and `export const dynamic = 'force-dynamic';`.
2. **Runtime Inconsistency**: 35 out of 43 API routes lacked `export const runtime = 'nodejs';`, exposing them to Edge runtime compilation fallbacks or bundler ambiguities when loading Node.js native modules (`firebase-admin`, `redis`, `zod`, `crypto`, `fs`, `buffer`, etc.).
3. **Remediation Target**: Explicitly applying `export const runtime = 'nodejs';` and `export const dynamic = 'force-dynamic';` across all API route handlers will guarantee Next.js static build bypasses prerendering for dynamic API routes, achieving 100% clean static page collection for 181/181 pages with exit code 0.

---

## 2. Forensic Audit Findings & Root Cause Analysis

### 2.1 Why `/api/proxy-image` Failed Prerendering
When `next build` executes, Next.js inspects every route handler under `src/app/`. If a route does not export `export const dynamic = 'force-dynamic';`, Next.js attempts static page generation (prerendering) at build time.

In `frontend/src/app/api/proxy-image/route.ts`:
- The GET handler reads `request.nextUrl.searchParams.get('url')` and performs remote HTTP `fetch(url)`.
- During build-time static generation, request parameters are missing/empty, causing module execution or fetch failure. Next.js fails to emit `.next/server/app/api/proxy-image/route.js`, crashing `npm run build` with exit code 1.

### 2.2 Why `export const runtime = 'nodejs';` is Mandatory Across All API Routes
Next.js App Router allows routes to execute in either `'edge'` or `'nodejs'` runtime environments.
- Routes missing `export const runtime = 'nodejs';` can default to Edge runtime under certain Vercel/Next.js bundler configurations.
- API routes in D-VIEW rely heavily on Node.js-specific capabilities (`firebaseAdmin`, `redis`, `zod`, Node standard libraries).
- Explicitly setting `export const runtime = 'nodejs';` ensures Next.js bundles and executes the route handler strictly in Node.js server context, eliminating Edge runtime conflicts and module resolution errors.

---

## 3. Comprehensive API Route Inventory & Classification

All 43 route handlers in `frontend/src/app/api/` + 1 feed route handler were inspected and classified into 4 distinct categories:

### Category 1: Fully Configured Routes (4 Files — Compliant)
These routes already export both `runtime = 'nodejs'` and `dynamic = 'force-dynamic'`:
1. `src/app/api/admin/sync-reports/route.ts`
2. `src/app/api/location-scores/route.ts`
3. `src/app/api/og/route.tsx`
4. `src/app/api/type-map/route.ts`

---

### Category 2: Missing `export const runtime = 'nodejs';` (35 Files — Action Required)
These routes already export `dynamic = 'force-dynamic'`, but are missing `runtime = 'nodejs'`:
1. `src/app/api/admin/analytics/route.ts`
2. `src/app/api/admin/search-console/indexing/route.ts`
3. `src/app/api/admin/search-console/route.ts`
4. `src/app/api/ads/click/route.ts`
5. `src/app/api/apartments/vote/route.ts`
6. `src/app/api/apartments-by-dong/route.ts`
7. `src/app/api/apartments-sync/route.ts`
8. `src/app/api/auth/session/route.ts`
9. `src/app/api/bypass-notice/route.ts`
10. `src/app/api/comments/route.ts`
11. `src/app/api/cron/send-tx-notifications/route.ts`
12. `src/app/api/cron/sync-local-notices/route.ts`
13. `src/app/api/cron/sync-transactions/route.ts`
14. `src/app/api/dashboard-init/route.ts`
15. `src/app/api/debug-reports/route.ts`
16. `src/app/api/favorite/route.ts`
17. `src/app/api/favorite-counts/route.ts`
18. `src/app/api/indexing/apartment/route.ts`
19. `src/app/api/local-notices/route.ts`
20. `src/app/api/macro/news/route.ts`
21. `src/app/api/macro/rates/route.ts`
22. `src/app/api/posts/route.ts`
23. `src/app/api/public/analytics/route.ts`
24. `src/app/api/push/notify-comment/route.ts`
25. `src/app/api/push/notify-new-high/route.ts`
26. `src/app/api/push/subscribe/route.ts`
27. `src/app/api/push/unsubscribe/route.ts`
28. `src/app/api/report-view/route.ts`
29. `src/app/api/subscribe/route.ts`
30. `src/app/api/technovalley/industry-distribution/route.ts`
31. `src/app/api/technovalley/trend/route.ts`
32. `src/app/api/test-names/route.ts`
33. `src/app/api/traffic/route.ts`
34. `src/app/api/transaction-summary/route.ts`
35. `src/app/api/unsubscribe/route.ts`

---

### Category 3: Missing BOTH `runtime` AND `dynamic` (4 Files — High Priority Fix Required)
These routes lack both route segment configurations:
1. `src/app/api/proxy-image/route.ts` (Direct cause of build prerender failure)
2. `src/app/api/explore/search-data/route.ts`
3. `src/app/api/technovalley/center-specs/route.ts`
4. `src/app/api/technovalley/transactions/route.ts`

---

### Category 4: Route Handlers Outside `api/` (1 File — Recommended Update)
1. `src/app/feed.xml/route.ts` (currently exports `revalidate = 1800`; should add `export const runtime = 'nodejs';` to ensure Node.js environment for Firebase Admin).

---

## 4. Step-by-Step Remediation Plan for Worker / Implementer

The implementer should execute the following modifications:

### Step 1: Fix Category 3 Routes (High Priority Prerender Fixes)
Add the following exports near top of each file (below imports):
```typescript
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```
Target Files:
- `frontend/src/app/api/proxy-image/route.ts`
- `frontend/src/app/api/explore/search-data/route.ts`
- `frontend/src/app/api/technovalley/center-specs/route.ts`
- `frontend/src/app/api/technovalley/transactions/route.ts`

### Step 2: Fix Category 2 Routes (Node Runtime Enforcement)
Add `export const runtime = 'nodejs';` alongside existing `export const dynamic = 'force-dynamic';` in all 35 Category 2 files listed above.

### Step 3: Fix Category 4 Route
Add `export const runtime = 'nodejs';` to `frontend/src/app/feed.xml/route.ts`.

### Step 4: Verification
Execute:
```bash
npm --prefix frontend run build
```
Verify output confirms clean build with exit code 0 and 181/181 static pages collected cleanly.

---

## 5. Summary Matrix

| Metric | Pre-Remediation | Target Post-Remediation |
|---|---|---|
| Total API Routes Audited | 43 (+1 RSS) | 43 (+1 RSS) |
| Routes with `runtime = 'nodejs'` | 4 | 44 |
| Routes with `dynamic = 'force-dynamic'` | 39 | 43 (+1 revalidate RSS) |
| `npm run build` Exit Code | 1 (Prerender Error) | 0 (Success) |
| Static Page Collection | Failed at `/api/proxy-image` | 181/181 pages succeeded |
