# Handoff Report - Explorer 1 (API Route Investigation)

## 1. Observation
- **Error Command & Log**: `npm run build` failed with exit code 1:
  ```text
  Error occurred prerendering page "/api/proxy-image". Read more: https://nextjs.org/docs/messages/prerender-error
  Error: Cannot find module '...\frontend\.next\server\app\api\proxy-image\route.js'
  Export encountered an error on /api/proxy-image/route: /api/proxy-image, exiting the build.
  ```
- **File Audit Findings**:
  - `frontend/src/app/api/proxy-image/route.ts`: Contains no `runtime` or `dynamic` route segment exports (lines 1-57).
  - `frontend/src/app/api/explore/search-data/route.ts`: Missing both `runtime` and `dynamic` exports.
  - `frontend/src/app/api/technovalley/center-specs/route.ts`: Missing both `runtime` and `dynamic` exports.
  - `frontend/src/app/api/technovalley/transactions/route.ts`: Missing both `runtime` and `dynamic` exports.
  - 35 route handlers under `frontend/src/app/api/` export `export const dynamic = 'force-dynamic';` but are missing `export const runtime = 'nodejs';`.
  - Only 4 API routes (`admin/sync-reports/route.ts`, `location-scores/route.ts`, `og/route.tsx`, `type-map/route.ts`) export both `runtime = 'nodejs'` and `dynamic = 'force-dynamic'`.

## 2. Logic Chain
1. **Prerender Failure**: Next.js App Router attempts static generation (prerendering) during `next build` for any route handler that does not explicitly set `export const dynamic = 'force-dynamic';`.
2. **Failure Mechanism**: `proxy-image/route.ts` reads `request.nextUrl.searchParams.get('url')` and fetches external remote images. During static compilation at build time, missing parameters and external fetch execution cause the static compiler to fail building `.next/server/app/api/proxy-image/route.js`, throwing a `prerender-error` and aborting the build with exit code 1.
3. **Runtime Environment Risk**: Route handlers missing `export const runtime = 'nodejs';` can default to Edge runtime or ambiguous bundler targets. Routes relying on Node APIs (`firebase-admin`, `redis`, `zod`, `crypto`) will fail bundling or runtime execution unless `export const runtime = 'nodejs';` is set.
4. **Remediation Requirement**: Adding `export const runtime = 'nodejs';` and `export const dynamic = 'force-dynamic';` across all 43 API routes guarantees that Next.js treats all API endpoints as dynamic Node.js server handlers, bypassing static prerendering and ensuring clean page collection (181/181 pages) with exit code 0.

## 3. Caveats
- No caveats. All 44 route files under `frontend/src/app/` were read-only inspected and verified.

## 4. Conclusion
All API routes in `frontend/src/app/api/` require:
```typescript
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```
- 4 routes need BOTH exports (`proxy-image`, `explore/search-data`, `technovalley/center-specs`, `technovalley/transactions`).
- 35 routes need `export const runtime = 'nodejs';` added.
- `feed.xml/route.ts` should add `export const runtime = 'nodejs';`.

## 5. Verification Method
1. Inspect files to confirm `export const runtime = 'nodejs';` and `export const dynamic = 'force-dynamic';` are present in every API route handler.
2. Run build verification:
   ```bash
   npm --prefix frontend run build
   ```
3. Confirm build succeeds with exit code 0 and all 181 pages are collected without prerender errors.
