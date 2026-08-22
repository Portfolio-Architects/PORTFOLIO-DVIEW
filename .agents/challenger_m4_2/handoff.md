# Milestone 4 Challenger 2 Empirical Verification Report

## 1. Observation
- **Scope & Targets**:
  - `src/lib/services/apartmentPageService.ts` (Domain Service for Apartment Pages)
  - `src/app/apartment/[aptName]/page.tsx` (SSR Page & Layout Component)
  - `src/lib/utils/structuredData.ts` (Schema.org JSON-LD & XSS Defense)
  - `src/lib/utils/analyticsUtils.ts` (Price Analytics, Pyeong Summaries, AI Briefings)
- **Empirical Test Suite**:
  - Created and executed adversarial empirical test harness: `frontend/src/__tests__/m4_challenger2_empirical_apartmentPage.test.tsx` containing 28 rigorous test cases.
- **Verification Gates & Execution Results**:
  - `npx tsc --noEmit` -> **Exit Code 0** (0 type errors)
  - `npm run lint` -> **Exit Code 0** (0 ESLint errors/warnings)
  - `npm run build` -> **Exit Code 0** (`✓ Generating static pages using 15 workers (177/177) in 40s`, static routes compiled and prerendered cleanly)
  - `npx jest src/__tests__/m4_challenger2_empirical_apartmentPage.test.tsx --runInBand --forceExit` -> **PASS (28 passed, 28 total)**
  - `npx jest src/lib/ --forceExit` -> **PASS (38 passed, 38 total, 309 passed tests)**
  - `npx jest src/components/ src/hooks/ src/contexts/ --forceExit` -> **PASS (31 passed, 31 total, 142 passed tests)**
  - `npx jest src/__tests__/m4_challenger_adversarial.test.tsx --runInBand --forceExit` -> **PASS (1 passed, 23 passed tests)**
  - `npx jest src/app/ --runInBand --forceExit` -> **PASS (2 passed, 2 total, 18 passed tests)**

## 2. Logic Chain
1. **Apartment Name & Unicode Robustness**:
   - `decodeAptName` was stress-tested against single (`%EB%8F%99...`), double (`%25EB...`), and triple URI-encoded sequences, emoji (`동탄역🏢숲속마을🌲`), CJK (`東灘역`), Cyrillic (`동탄역Д`), accented characters (`Café 동탄`), zero-width spaces (`\u200B`), malformed percent sequences (`%ZZ`), and HTML script tags. All decoded cleanly without exceptions or runtime crashes.
2. **Missing Record & Data Corruption Resilience**:
   - Tested `getApartmentPageData` with non-existent complexes (`존재하지않는유령단지_999`), missing `txSummary` records, empty/corrupted transaction arrays (zero/negative areas, NaN prices), and null location scores.
   - The service returned well-formed fallback `ApartmentPageData` structures with safe zero/empty defaults rather than throwing unhandled rejections.
3. **SEO Metadata & OpenGraph Generation**:
   - `buildApartmentSeoMetadata` and `getDefaultApartmentMetadata` were validated with valid complex names, empty names, and dynamic search parameters (`shareType`, `grade`, `score`).
   - Metadata correctly rendered canonical URLs (`https://dongtanview.com/apartment/{encodedName}`), localized OpenGraph titles, descriptions, and dynamic OG image generation parameters.
4. **Structured Data & Schema.org XSS Immunity**:
   - `buildApartmentJsonLd` generated standard Schema.org graphs containing `WebPage`, `ApartmentComplex`, `SingleFamilyResidence`, and `RealEstateAgent` nodes.
   - `safeJsonLd` sanitized all special characters (`<` -> `\u003c`, `>` -> `\u003e`, `&` -> `\u0026`), guaranteeing that script injection vectors in user or report data cannot break out of `<script type="application/ld+json">` tags.
5. **SSR Static Generation Completeness**:
   - `generateStaticParams` verified matching all entries in `tx-summary.json`.
   - `npm run build` completed static page generation for all 177 pages in 40s without failing any route prerendering.

## 3. Caveats
- Firestore in offline/test mode logs intentional fallback warnings when credentials are not supplied, falling back to local cached static files as designed.
- In Next.js SSR, `DashboardClient` receives fallback `initialDashboardData` when non-existent apartment names are queried, rendering the main dashboard with safe pre-selection fallback.

## 4. Conclusion
**VERDICT: APPROVE**

The presentation and domain service layer (`src/lib/services/apartmentPageService.ts` and `src/app/apartment/[aptName]/page.tsx`) demonstrates exceptional robustness, strict type safety, complete Schema.org structured data compliance, XSS immunity, and flawless SSR static route generation across all 177 apartment pages.

## 5. Verification Method
To independently reproduce this verification, run the following commands inside `frontend/`:
```bash
npx tsc --noEmit
npm run lint
npx jest src/__tests__/m4_challenger2_empirical_apartmentPage.test.tsx --runInBand --forceExit
npm run build
```
