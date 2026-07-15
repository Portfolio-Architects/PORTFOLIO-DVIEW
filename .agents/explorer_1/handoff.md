# Handoff Report — Codebase Analysis

## 1. Observation
- **Landing Page Hierarchy**:
  - `frontend/src/app/page.tsx` renders a `<Suspense fallback={<TechnoValleySkeleton />}>` containing `<TechnoValleyClient />` (line 166-168).
  - `frontend/src/app/technovalley/TechnoValleyClient.tsx` dynamically imports `TechnoValleyDashboard` with `ssr: false` and a loading placeholder `w-full min-h-[450px]` (line 9-19).
- **Relocation Tax Simulator**:
  - `frontend/src/components/macro/RelocationTaxSimulator.tsx` calculates tax benefits using `corpTaxSavings = annualCorpTax * 5` (line 28), `acquisitionTaxSavings = purchasePrice * 0.046 * 0.35` (line 35), and `propTaxSavings = annualPropTax * 0.35 * 5` (line 40). It renders below the fold at the bottom of `TechnoValleyDashboard.tsx` inside `<div className="lg:col-span-12 mt-6"><RelocationTaxSimulator /></div>` (line 1493-1495).
- **CSS Theme Definitions**:
  - `frontend/src/app/globals.css` imports `@import "tailwindcss";` (line 1), defining Tailwind CSS v4 variables mapping to Hwaseong City BI colors:
    ```css
    --hs-blue: #004696;
    --hs-orange: #dc6e2d;
    --hs-blue-light: #e6eef8;
    --hs-orange-light: #fdf0e9;
    ``` (lines 58-61).
  - Legacy variable `--toss-blue` is overridden to `#ea6100` (line 50).
- **Navigation Menu & Active States**:
  - `frontend/src/components/LoungeHeader.tsx` (line 25-138) maps desktop links. Active tabs use a plain gray theme:
    `bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5 dark:ring-white/10`
  - `frontend/src/components/pwa/MobileDock.tsx` (line 57-125) maps mobile dock links. Active tabs use Hwaseong orange tint:
    `text-hs-orange bg-[#fdf0e9] border border-[#dc6e2d]/15`
  - Both map exact routes: `/` (technovalley), `/overview?tab=office` (office), `/lounge` (lounge), `/overview` (overview), `/explore` (imjang).
  - `frontend/src/components/PageHeroHeader.tsx` has no navigation menu but uses hardcoded color `border-[#ea6100]` for its subtitle left-border (line 115).
- **Playwright Test Audit**:
  - `frontend/tests/ui-ux-audit.spec.ts` captures console errors (line 11-15), initializes `webVitals = { lcp: 0, cls: 0 }` (line 22), measures navigation timings (line 77-84), audits horizontal layout overflows (line 86-126), and runs `axe-core` accessibility checks (line 135-156).
  - Tests config `frontend/playwright.config.ts` runs on `http://localhost:5000` (line 12) reusing dev server (`npm run dev`).
  - Diagnostic script `frontend/scripts/audit-pipeline.js` executes TypeScript checks, ESLint, data consistency, asset sizes, Playwright tests, and Firestore costs (lines 382-392).
- **TS Configurations**:
  - `frontend/tsconfig.json` excludes test files from compilation:
    ```json
    "exclude": [
      "node_modules",
      "tests",
      "playwright.config.ts"
    ]
    ``` (lines 40-44).

---

## 2. Logic Chain
1. **Above-the-Fold Optimization**:
   - The landing page's above-the-fold layout consists of `LoungeHeader`, `PageHeroHeader`, the dashboard Left Panel (industry pie chart and KPI grid), and Right Panel (trend line chart).
   - Because the `RelocationTaxSimulator` is placed below the fold, user engagement with tax calculations is delayed.
   - Therefore, introducing hero anchors, replacing a KPI card with an action, or providing a right-panel tab toggle will draw attention to the simulator immediately.
2. **Theme Integration**:
   - The Hwaseong City BI colors (`--hs-blue` and `--hs-orange`) are already registered in the CSS/Tailwind configuration.
   - However, `--toss-blue` is mapped to an orange shade (`#ea6100`), which is semantically confusing.
   - Replacing legacy hardcoded orange color values with their corresponding semantic variables (`var(--hs-orange)` and `var(--hs-blue)`) will establish a unified, branded look.
3. **Menu Unification**:
   - The route structures of `LoungeHeader` and `MobileDock` are completely aligned.
   - The discrepancy lies in the active styles: `MobileDock` uses Hwaseong orange tint active states, whereas `LoungeHeader` uses plain gray shadow active states.
   - Unifying them to use Hwaseong BI accents (blue and orange tints) will create a consistent desktop and mobile aesthetic.
4. **Playwright Tests**:
   - The test script `ui-ux-audit.spec.ts` executes custom diagnostics (console capture, Web Vitals, overflows, Axe-core).
   - Excluding these tests in `tsconfig.json` ensures that test dependencies do not interfere with standard build workflows, maintaining fast compilation speeds.

---

## 3. Caveats
- Firestore cost audit requires a local `serviceAccountKey.json` or `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable to run; otherwise, it is skipped in `audit-pipeline.js`.
- The horizontal layout overflow check is a custom script inside the page evaluation and might not catch overflow items rendered dynamically after initial load.
- It is assumed that Next.js Turbopack dev mode on port 5000 is available when running local E2E tests.

---

## 4. Conclusion
The codebase is structurally robust and utilizes Tailwind CSS v4 efficiently. Unifying navigation menu active styling and replacing hardcoded orange elements with semantic Hwaseong BI colors will enhance theme consistency. Repositioning or tab-binding the tax calculator and vacancy matching board above the fold will improve key page conversions.

---

## 5. Verification Method
- **Verify test run**: Run `npm run test:e2e` inside `frontend/` to run Playwright tests.
- **Verify full audit**: Run `npm run audit` (or `node scripts/audit-pipeline.js`) to execute the type checks, lint checks, data consistency checks, bundle checks, and E2E UX audits.
- **Files to Inspect**:
  - `frontend/src/app/globals.css` (verify variables `--hs-blue` and `--hs-orange`).
  - `frontend/src/components/LoungeHeader.tsx` (verify desktop menu active states).
  - `frontend/src/components/pwa/MobileDock.tsx` (verify mobile menu active states).
  - `frontend/scratch/ui-ux-audit-results.json` (inspect E2E diagnostic logs).
