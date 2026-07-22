# Empirical Challenge Report — Milestone 2 (Frontend Performance & UI/UX Perfection)

## Challenge Summary

**Overall risk assessment**: HIGH

Empirical Playwright stress-testing of Milestone 2 frontend performance metrics revealed **critical performance metric failures** against claimed targets:
1. **Route Navigation Latency Target (< 100ms)**: **FAILED**. Cross-page route transitions between main routes (`/`, `/overview?tab=office`, `/lounge`, `/overview`) took **591.4ms – 2239.1ms**, missing the sub-100ms threshold by up to 22x.
2. **Cumulative Layout Shift Target (CLS < 0.05)**: **FAILED**. CLS measured during multi-route interactive navigation was **0.1738 – 0.2316**, exceeding the 0.05 budget by up to 4.6x.
3. **Desktop Header & Mobile Dock Synchronization**: **PASSED**. Structural and contract verification confirmed identical 5 main navigation links and activeTab state synchronization.

---

## Empirical Metric Verification Matrix

| Metric / Objective | Target / Requirement | Measured Empirical Value | Status |
| :--- | :--- | :--- | :--- |
| **Route Navigation Latency** | Sub-100ms across main routes | **591.4ms – 2239.1ms** | ❌ **FAILED** |
| **Cumulative Layout Shift (CLS)** | CLS < 0.05 | Measured **0.1738 – 0.2316** | ❌ **FAILED** |
| **Header & Dock Route Sync** | 100% Contract Match | 5/5 identical links (`/`, `/overview?tab=office`, `/lounge`, `/overview`, `/explore`) | ✅ **PASSED** |
| **HeaderDockSync Jest Suite** | 7/7 unit tests passing | 7/7 tests passed | ✅ **PASSED** |
| **Performance & UX Audit (`performance-ux.spec.ts`)** | 5 test cases | 4 passed, 1 locator timeout (`a` vs `button`) | ⚠️ **PARTIAL** |

---

## Suite Execution Log (`performance-ux.spec.ts`)

1. **Donut Chart CSS Scale**: `Donut Cell Classes: recharts-sector transition-transform duration-300 transform hover:scale-105 origin-center focus:outline-none cursor-pointer`, `Style: transform-origin: 50% 50%; will-change: transform`. -> ✅ **PASS**
2. **Accordion DOM Reduction**: DOM node reduction verified: Company grid unmounted when collapsed, mounted on expansion, unmounted on collapse. -> ✅ **PASS**
3. **Responsive Modal Padding**: Modal scroll container includes `custom-scrollbar`, table container uses `-mx-4 md:-mx-10 px-4 md:px-10`. -> ✅ **PASS**
4. **Tab Switching Keep-Alive**: Locator timeout on `header nav button` because header items are rendered as Next.js `<Link>` elements (`header nav a`). -> ⚠️ **FAIL (Locator mismatch)**
5. **Lounge Modal CLS & Offline Robustness**: Modal transition CLS measured at `0.05068`, Firebase offline error gracefully handled (`Failed to get document because the client is offline`). -> ✅ **PASS**

---

## Challenges & Stress Test Findings

### [High] Challenge 1: Cross-Page Route Navigation Exceeds Sub-100ms Target

- **Assumption challenged**: Client route navigation across main routes operates in under 100ms.
- **Empirical Measurement**:
  - `Office Tab` (`/overview?tab=office`): **1791.5 ms** (Target: < 100ms) -> **FAILED**
  - `Lounge Tab` (`/lounge`): **2239.1 ms** (Target: < 100ms) -> **FAILED**
  - `Apartment Lab Tab` (`/overview`): **591.4 ms** (Target: < 100ms) -> **FAILED**
  - `Techno Lab Tab` (`/`): **1957.9 ms** (Target: < 100ms) -> **FAILED**
- **Attack Scenario / Failure Analysis**: Next.js App Router performs server chunk evaluation and dynamic script fetching when navigating between top-level routes (`/`, `/overview`, `/lounge`). Without pre-warmed static route caches or optimized client-side state routing across all pages, page transitions incur full route hydration latency.
- **Blast Radius**: Noticeable UI latency and page load pause when users click desktop header or mobile dock items.
- **Suggested Defense**: Convert top-level navigation routes into soft client-side tab state transitions within a persistent root layout or aggressively prefetch and cache static route bundles.

### [High] Challenge 2: Cumulative Layout Shift (CLS) Exceeds 0.05 Budget

- **Assumption challenged**: CLS remains under 0.05 during client page navigation and component hydration.
- **Empirical Measurement**:
  - Run 1 Measured CLS: **0.2316** (Target: < 0.05) -> **FAILED**
  - Retry #1 Measured CLS: **0.1738** (Target: < 0.05) -> **FAILED**
- **Attack Scenario / Failure Analysis**: As the page hydrates dynamic components (such as Recharts charts, accordion cards, and lounge post feeds), un-sized layout elements cause significant visual shifts before final layout geometry settles.
- **Blast Radius**: Janky page loading experience, unexpected element movement while user interacts with navigation controls.
- **Suggested Defense**: Reserve strict min-height aspect ratio skeleton containers for async charts, cards, and feed widgets to lock layout geometry before client hydration.

### [Pass] Challenge 3: Desktop Header & Mobile Dock Contract Synchronization

- **Empirical Test**:
  - Desktop Nav Links: `[테크노 랩 (/), 사무실 탐색 (/overview?tab=office), 동탄 라운지 (/lounge), 아파트 랩 (/overview), 아파트 탐색 (/explore)]`
  - Mobile Dock Links: `[테크노 랩 (/), 사무실 탐색 (/overview?tab=office), 동탄 라운지 (/lounge), 아파트 랩 (/overview), 아파트 탐색 (/explore)]`
- **Result**: **PASSED** (100% matched links & structure).
