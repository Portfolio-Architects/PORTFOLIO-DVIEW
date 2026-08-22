# Milestone 4 Independent Quality & Adversarial Review Report (Reviewer 2)

## 1. Observation
- **Target Codebase**: `frontend/` (Next.js 16 App Router, TypeScript, TailwindCSS).
- **Scope Under Review**:
  1. Decoupling of domain computation, price analytics, location resolution, and SEO JSON-LD logic from `src/app/apartment/[aptName]/page.tsx` into `src/lib/services/apartmentPageService.ts`.
  2. Standardization of 44 Next.js route handlers under `src/app/api/` with unified response envelope helpers (`apiSuccess`, `apiError`) and resilient IP rate limiting (`checkRateLimit`).
  3. Preservation of UI component contracts, Recharts responsive containers and tooltip contracts, and `data-testid` test bindings across all views.
- **Verification Commands Executed inside `frontend/`**:
  - `npx tsc --noEmit` -> **Exit Code 0** (0 type errors).
  - `npm run lint` -> **Exit Code 0** (0 ESLint errors/warnings).
  - `npx jest src/lib/` -> **38 passed, 38 total** (309 passed tests).
  - `npx jest src/components/ src/hooks/ src/contexts/` -> **31 passed, 31 total** (142 passed tests).
  - `npx jest src/__tests__/` -> **9 passed, 9 total** (187 passed tests, including M1/M2/M3/M4 empirical adversarial challenger suites).
  - `npx jest src/app/` -> **2 passed, 2 total** (18 passed tests).
  - `npm run build` -> **Exit Code 0** (Compiled successfully, static SSG pages generated: 177/177 in 22.2s).
- **Integrity Inspection**:
  - Code inspection verified that `src/lib/services/apartmentPageService.ts` contains genuine business logic (Haversine math, progressive tax thresholds, Schema.org graph builder, local file caching, Redis/Firestore fallbacks).
  - No dummy facade bypasses, hardcoded mock shortcuts, or fabricated test attestations were detected.

## 2. Logic Chain
1. **Separation of Concerns & Page Decoupling**:
   - `src/app/apartment/[aptName]/page.tsx` was reduced from 829 lines of interleaved computation down to 206 lines of pure presentation layout orchestration, JSON-LD script mounting, and SSR fallback content.
   - All domain retrieval and calculation functions (`getTxSummaryData`, `getApartmentTransactions`, `getLocationScore`, `fetchScoutingReportCached`, `getApartmentPageData`, `buildApartmentJsonLd`, `buildApartmentSeoMetadata`) now reside cleanly in `src/lib/services/apartmentPageService.ts`.
2. **Adversarial & Edge Case Robustness**:
   - `decodeAptName` robustly resolves plain Korean, single URL encoded, double URL encoded (`%25EB...`), triple URL encoded, emoji, CJK, Cyrillic, and malformed URI tokens without throwing.
   - When a requested apartment complex does not exist in local static files or database (`public/tx-data/유령단지.json`), the service gracefully falls back to empty transaction lists, default briefing text, and safe default SEO metadata without 500 errors or unhandled rejections.
   - JSON-LD structured data generation safely neutralizes script tag injection vectors (`<script>alert(1)</script>`) via `safeJsonLd` unicode escaping (`\u003cscript\u003e`), ensuring zero XSS vulnerabilities.
3. **API Standardization & Rate Limiter Resilience**:
   - API route handlers consistently use `apiSuccess` and `apiError` returning typed `ApiResponse<T>`.
   - `checkRateLimit` handles Redis unavailability by gracefully falling back to an in-memory sliding window cache with standard HTTP 429 status codes and rate limit headers (`X-RateLimit-*`).
4. **UI & Recharts Compatibility**:
   - All Recharts components (`TransactionChartSection`, `MacroTrendChart`, `ComparePriceHistoryChart`, `CompareRadarChart`, `MortgageCalculator`, `PropertyTaxCalculator`) retain their responsive sizing, axes configuration, tooltip structures, and CSS wrapper classes (`.recharts-wrapper`, `.recharts-surface`).
   - `data-testid` attributes used across test suites (`mock-dashboard-client`, `recharts-tooltip`, etc.) are completely intact.

## 3. Caveats
- Streaming and media binary routes (`/api/og/route.tsx`, `/api/proxy-image/route.ts`, `/api/unsubscribe/route.ts`) intentionally return binary `ImageResponse` / `ArrayBuffer` or HTML redirection responses as necessitated by social media crawlers and browser navigation standards.
- In CI or local offline test environments where Upstash Redis or Firebase Admin credentials are absent, repositories and services degrade safely to in-memory caching and local JSON file reads.

## 4. Conclusion
- **Verdict**: **APPROVE**
- Milestone 4 refactoring satisfies all requirements specified in `PROJECT.md` and `ORIGINAL_REQUEST.md`.
- Layer 3 (Presentation & API Routes) strictly complies with Clean Architecture invariants with zero regressions.

## 5. Verification Method
To independently verify this evaluation, execute the following commands in `frontend/`:
```bash
npx tsc --noEmit
npm run lint
npx jest src/lib/
npx jest src/components/ src/hooks/ src/contexts/
npx jest src/__tests__/
npx jest src/app/
npm run build
```
