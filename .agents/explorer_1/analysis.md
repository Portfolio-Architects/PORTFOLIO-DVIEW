# DVIEW Codebase Analysis Report

This report documents the architectural findings and UX/theme unification proposals for DVIEW.

---

## 1. Landing Page Structure, Layout, and Above-the-Fold Optimization
The entry point of the DVIEW landing page is `frontend/src/app/page.tsx`, which serves as a server-rendered shell that dynamically hydrates the interactive client features.

### A. Landing Page Component Hierarchy
1. **`page.tsx` (SSR)**:
   - Sets page metadata, SEO titles, descriptions, and injects a structured JSON-LD script for schema.org crawlers.
   - Embeds a visually hidden `sr-only` `aria-hidden` container housing tabular data of major지식산업센터 (Knowledge Industry Centers), recent shared-office roommate posts, and tax benefits details. This guarantees search engines index content immediately without impacting layout performance.
   - Renders a `<Suspense>` wrapper with a custom layout skeleton (`TechnoValleySkeleton`) surrounding `<TechnoValleyClient />`.
2. **`TechnoValleyClient.tsx` (Client Shell)**:
   - Renders `LoungeHeader` (desktop navigation), `PageHeroHeader` (page title & Hwaseong logo banner), dynamic client component `TechnoValleyDashboard` (ssr: false), and `MobileDock` (mobile footer navigation).
3. **`TechnoValleyDashboard.tsx` (Client Dashboard)**:
   - Splitted on desktop as a 12-column grid:
     - **Left Panel (6/12 columns)**: Contains a Recharts Pie Chart (`#donut-chart-card`) representing industry distribution and a 2x2 grid of KPI cards below it (Total Employees, Avg Rent, Avg Vacancy Rate, Avg Company Size).
     - **Right Panel (6/12 columns)**: Contains a Recharts Line Chart showing rent or vacancy rate trends over time, complete with timeframe toggle controls.
   - **Below the Fold**:
     - **Full Width Accordion List (`lg:col-span-12`)**: Searchable list of all registered companies grouped by industry sector.
     - **Relocation Tax Simulator (`lg:col-span-12`)**: The `RelocationTaxSimulator` component which calculates tax relief when relocating a business to Dongtan.

---

### B. Clean Presentation Proposal for Vacancy Resolution & Tax Benefits
Currently, the **Relocation Tax Simulator** is positioned *below the fold* in a full-width container (`mt-6`), and the **Vacancy Resolution** (such as the roommate recruitment board for dividing spaces) is only visible inside the `sr-only` container or the company list accordion.

To present these key conversion tools cleanly and beautifully, we propose the following layout optimizations:
1. **Interactive Above-the-Fold Hero Anchors**:
   - Add two stylized button pills directly within the `PageHeroHeader` or immediately above the Left/Right dashboard panels:
     - 💼 **"법인 세제 감면 계산기"** (Relocation Tax Simulator) -> smooth-scrolls to the simulator.
     - 🤝 **"소형 공동임차 매칭 보드"** (Vacancy Resolution Matching Board) -> smooth-scrolls or opens the recruitment board.
2. **2x2 KPI Grid Integration**:
   - Replace one of the less critical KPI cards (like "Avg Company Size") with an interactive **"내 예상 절세 혜택 알아보기"** call-to-action button card. Upon clicking, it scrolls down to the simulator or launches it in a modal.
3. **Unified Right-Panel Tab Controls**:
   - Allow the Right Panel to toggle between **[추이 분석 차트 (Trend Chart)]**, **[세제 감면 시뮬레이터 (Tax Simulator)]**, and **[공동임차 매칭 보드 (Matching Board)]**. This moves the calculation and resolution features directly *above the fold* without adding vertical clutter.

---

## 2. CSS Variables, Theme Definitions, and Hwaseong BI Colors
DVIEW has migrated to **Tailwind CSS v4** (indicated by `@import "tailwindcss";` in `globals.css` and the `@tailwindcss/postcss` build setup).

### A. Current Color Definitions
In `frontend/src/app/globals.css`, color schemes are defined as CSS variables under `@layer base` and registered as custom colors in `@theme inline`:

| Tailwind Color | CSS Variable | Light Theme Value (root) | Dark Theme Value (.dark) |
|---|---|---|---|
| `hs-blue` | `--hs-blue` | `#004696` (Hwaseong Deep Blue) | `#3d80df` (Brightened Blue) |
| `hs-orange` | `--hs-orange` | `#dc6e2d` (Hwaseong Orange) | `#ea7f44` (Brightened Orange) |
| `hs-blue-light` | `--hs-blue-light` | `#e6eef8` (Pastel Blue Tint) | `#10244c` (Dark Blue Tint) |
| `hs-orange-light`| `--hs-orange-light` | `#fdf0e9` (Pastel Orange Tint) | `#3e1f0e` (Dark Orange Tint) |
| `toss-blue` | `--toss-blue` | `#ea6100` (Amber Orange) | `#ef4444` (Red / Overridden) |
| `toss-green` | `--toss-green` | `#e65100` (Dark Orange) | `#d84315` (Rust Orange) |

*Inconsistency Note*: The legacy variables `--toss-blue` and `--toss-green` have been modified to orange values (`#ea6100` and `#e65100` respectively) to mimic a warm theme. We should refactor these to use the semantic `--hs-blue` and `--hs-orange` variables directly.

### B. Integrating Hwaseong BI Colors in the Bright Theme
The bright theme uses a clean gray base (`--bg-body: #f2f4f6`) and white surfaces (`--bg-surface: #ffffff`).
To integrate the Hwaseong BI Colors beautifully:
- **Primary Brand Branding (`--hs-blue: #004696`)**: Use this for global primary action buttons (e.g. `bg-hs-blue hover:bg-hs-blue/90 text-white`), active header text, and main section headers to assert authority.
- **Accent Branding (`--hs-orange: #dc6e2d`)**: Use this for highlights, interactive sliders, calculations, and tags (e.g. `bg-hs-orange text-white` or `bg-hs-orange-light text-hs-orange`).
- **Interactive States**: Use `bg-hs-blue-light` and `bg-hs-orange-light` as background hover states or card borders to highlight user actions.

---

## 3. Menu Navigation Component Analysis and Unification

### A. Navigation Structures and Route Mappings

| Component | Target Viewport | Tab ID | Route Map | Active Style |
|---|---|---|---|---|
| **`LoungeHeader`** | Desktop / PC | `technovalley`<br>`office`<br>`lounge`<br>`overview`<br>`imjang` | `/`<br>`/overview?tab=office`<br>`/lounge`<br>`/overview`<br>`/explore` | Plain gray segmented boxes:<br>`bg-surface text-primary shadow-sm ring-1` |
| **`MobileDock`** | Mobile / PWA | `technovalley`<br>`office`<br>`lounge`<br>`overview`<br>`imjang` | `/`<br>`/overview?tab=office`<br>`/lounge`<br>`/overview`<br>`/explore` | Branded orange highlight:<br>`text-hs-orange bg-[#fdf0e9] border border-[#dc6e2d]/15` |
| **`PageHeroHeader`** | Both | None | None (Only title banner) | No menus rendered (Uses `border-l-2 border-[#ea6100]` color indicator) |

### B. Menu Unification Plan
- **Route Sync**: The route mapping between `LoungeHeader` and `MobileDock` is already 100% aligned.
- **Active State Style Unification**:
  - `LoungeHeader`'s active state is plain gray, while `MobileDock` uses a styled Hwaseong Orange tint.
  - To unify, `LoungeHeader`'s active states should use the Hwaseong BI color variable. For example:
    - active `technovalley` / `office` tabs: `bg-hs-blue-light text-hs-blue` (representing the Blue-brand Techno Lab).
    - active `overview` / `imjang` tabs: `bg-hs-orange-light text-hs-orange` (representing the Orange-brand Apartment Lab).
- **Hero Border Alignment**:
  - The left vertical accent line in `PageHeroHeader` uses a hardcoded `#ea6100` border. This should be replaced with `border-[var(--hs-orange)]` or `border-[var(--hs-blue)]` to ensure strict theme compliance.

---

## 4. Playwright E2E Diagnostics and Test Audit Setup
DVIEW implements an automated UX self-improvement check via Playwright E2E.

### A. The E2E UX Audit Spec (`frontend/tests/ui-ux-audit.spec.ts`)
The test script runs a complete programmatic audit:
1. **Preparation (`beforeEach`)**:
   - Hooks into the browser page events to capture `console.warn`/`console.error` logs and uncaught runtime page errors.
   - Pre-injects a client-side `PerformanceObserver` to track Web Vitals (LCP, CLS) in the window context.
2. **Setup**:
   - Dismisses first-visit modal layers by inserting key-value pairs in `localStorage` (`dview-welcome-seen = "true"`, `dview-adblock-banner-dismissed = Date.now()`).
3. **Execution**:
   - Navigates to `/overview?tab=imjang` and waits for complete client-side hydration.
   - Finds an apartment listing matching the keyword "동탄역" and triggers a click.
   - Evaluates page navigation timing metrics (`dns`, `tcp`, `ttfb`, `domLoad`, `pageLoad`).
   - Identifies **Layout Overflow (CLS)** by traversing all DOM elements and detecting objects whose bounds exceed the viewport width without a scroll container.
   - Injects `axe-core` from a CDN into the browser to conduct an automated accessibility audit.
   - Aggregates the findings and writes a diagnostic JSON to `frontend/scratch/ui-ux-audit-results.json`.

### B. Build, Test, and Audit Pipeline Commands
- **Launch Development Server**: `npm run dev` (starts on port 5000 with Turbopack).
- **Build Server**: `npm run build` or `npm run build:full` (runs static data syncs before executing Next.js build).
- **Run Unit Tests (Jest)**: `npm run test`.
- **Run E2E Tests (Playwright)**: `npm run test:e2e` (targets `http://localhost:5000`).
- **Audit Pipeline (`npm run audit`)**:
  - Runs `node scripts/audit-pipeline.js`, which chains:
    1. TypeScript compilation check (`tsc --noEmit`).
    2. ESLint code cleanliness verification.
    3. Transaction Data Consistency check (verifies `public/tx-data/*.json` files correspond to `_index.json`).
    4. Asset size budget checks (emits warning if a transaction JSON file exceeds 3MB).
    5. Playwright E2E UX audit execution (`npm run test:e2e`).
    6. Firestore Read/Write volume calculation and monthly budget cost projection.
    7. Calls `generate-ui-ux-report.js` to compile the results.

---

## 5. Next.js and Dependency Configurations

### A. Next.js Config (`next.config.ts`)
- **Optimization settings**:
  - Dynamic module transpilation for `lucide-react`.
  - Next.js images format configuration (favors `avif` and `webp` over png, with optimized quality ratings of `60` and `75`).
  - Webpack watchOptions excludes `.next`, node modules, logs, and database JSON files (`/public/data`, `/public/tx-data`) to prevent infinite dev server rebuild loops on hot-reloading (HMR).
- **Security & Cache Headers**:
  - Injects `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and custom caching parameters for static content.
  - PWA manifest (`manifest.webmanifest`) and service workers (`sw.js`) are configured with `no-store` headers to ensure instant updates.
- **Client Fallbacks**:
  - Maps `firebaseAdmin.ts` to `firebaseAdmin.client.ts` for browser builds and mocks standard Node.js libraries (`net`, `tls`, `fs`, `child_process`) to prevent client compilation errors.

### B. Dependency Management (`package.json`, `tsconfig.json`)
- **Key Versions**: Next.js v16.2.4, React 19.2.3, Tailwind CSS v4.2.1, Recharts v3.8.0.
- **TypeScript Config**:
  - Configured with strict typings enabled (`"strict": true`) and module resolution set to `"bundler"`.
  - **Critical CLS/Build Setup**: The test folders `tests` and config file `playwright.config.ts` are explicitly excluded from `tsconfig.json`. This ensures E2E test scripts do not generate TypeScript compiler blockers or impact build speed.
