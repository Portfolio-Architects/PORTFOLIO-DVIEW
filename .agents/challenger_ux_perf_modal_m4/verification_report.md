# E2E Test Verification Report

- **Date of Verification**: 2026-07-17
- **Verification Environment**: Windows 11 / Node.js E2E Harness (Playwright Chromium)
- **Target App**: D-VIEW frontend (Next.js)
- **Test Command Run**: `npx playwright test tests/performance-ux.spec.ts tests/routing-bug.spec.ts`
- **Result**: **5 passed (100% success rate)**
- **Total Duration**: 44.3 seconds

---

## 1. Verified Tests & Direct Outputs

### Test Suite: `tests/performance-ux.spec.ts`

#### Test 1: Donut Chart CSS-only Hover Scale & Style
* **Objective**: Ensure that hover scaling of Recharts donut chart slices uses pure CSS (Tailwind classes) and inline hardware acceleration (`will-change`, 50% origin) to prevent layout reflow offsets.
* **Logs & Observations**:
  ```
  Donut Cell Classes: recharts-sector transition-transform duration-300 transform hover:scale-105 origin-center focus:outline-none cursor-pointer
  Donut Cell Style: outline: none; transform-origin: 50% 50%; will-change: transform;
  ```
* **Status**: **PASS**

#### Test 2: Accordion Lazy Rendering (DOM Node Reduction)
* **Objective**: Confirm that the sector company list accordion lazily renders its contents (i.e. does not mount the child grid DOM node when collapsed, mounts it when expanded, and unmounts it on collapse) to minimize the DOM size.
* **Logs & Observations**:
  ```
  ✅ DOM node reduction verified: Company grid is not mounted when accordion is collapsed.
  ✅ Company grid successfully mounted upon expansion.
  ✅ DOM node reduction verified: Company grid successfully unmounted upon collapse.
  ```
* **Status**: **PASS**

#### Test 3: Responsive Modal Card Padding & iOS Scrolling Momentum
* **Objective**: Verify that the modal's scroll container uses custom scrollbars and has the negative horizontal margins and padding (`-mx-4` and `px-4`) for mobile edge-to-edge bleed scroll, and is scrollable.
* **Logs & Observations**:
  ```
  ✅ Modal scroll container includes the custom-scrollbar class.
  Table scroll container classes: overflow-x-auto custom-scrollbar -mx-4 md:-mx-10 px-4 md:px-10 mt-1
  ```
* **Status**: **PASS**

---

### Test Suite: `tests/routing-bug.spec.ts`

#### Test 4: MOBILE: should navigate from news page to curation page correctly via MobileDock
* **Objective**: Verify that navigating to `/news` and then clicking "아파트 랩" in the mobile navigation dock successfully changes the URL to `/overview` and renders the correct header components.
* **Logs & Observations**:
  ```
  Navigating to /news on mobile
  Current URL on News page: http://localhost:5000/lounge?tab=news
  Clicking Apartment Lab tab in MobileDock...
  URL after clicking Apartment Lab: http://localhost:5000/overview
  Is Overview visible? true
  Is Lounge visible? false
  ```
* **Status**: **PASS**

#### Test 5: MOBILE: should navigate from news page WITH notice query param to curation page correctly via MobileDock
* **Objective**: Verify that when a user is on the news page with a notice query parameter (e.g. `/news?notice=some-notice-id`), they can successfully click the "아파트 랩" navigation tab in the MobileDock and transition cleanly to `/overview` without being stuck on the news tab/lounge view.
* **Logs & Observations**:
  ```
  Navigating to /news?notice=some-notice-id on mobile
  Current URL on News page: http://localhost:5000/lounge?tab=news
  Clicking Apartment Lab tab in MobileDock...
  URL after clicking Apartment Lab: http://localhost:5000/overview
  Is Overview visible? true
  Is Lounge visible? false
  ```
* **Status**: **PASS**

---

## 2. Adversarial Review & Risk Assessment

### Overall Risk Assessment: **LOW**

While all E2E tests have passed under normal local test execution, several architectural constraints and test design assumptions have been identified that could cause future instability or false positives/negatives.

### Challenges & Critical Edge Cases

#### Challenge 1: Hardcoded Wait Timeouts (Hydration Race Condition)
* **Assumption Challenged**: The tests assume hydration is complete and elements are interactive after exactly 3000ms (`await page.waitForTimeout(3000)`).
* **Attack Scenario / Failure Mode**: Under high CPU throttling, slow CI runners, or mobile device simulation, hydration may take longer than 3 seconds. The test may fire a click or hover event before React has finished attaching event listeners, resulting in silent click failures or tests hanging/failing.
* **Blast Radius**: Flaky tests on CI pipelines.
* **Suggested Mitigation**: Instead of arbitrary timeouts (`waitForTimeout(3000)`), wait for specific test attributes or elements that indicate hydration completion (e.g., checking that the interactive state is active, or waiting for a specific custom attribute set on hydration completion).

#### Challenge 2: Language-Dependent Locators (Hardcoded Korean String Queries)
* **Assumption Challenged**: The mobile dock tests query navigation links using hardcoded Korean text: `filter({ hasText: '아파트 랩' })` and `h1` titles containing `D-VIEW 데이터 랩` / `D-VIEW 아파트 랩`.
* **Attack Scenario / Failure Mode**: If D-VIEW adds multi-language localization or updates its navigation label copy to English (e.g. "Apartment Lab" instead of "아파트 랩"), the E2E test suite will break immediately despite the routing functionality being completely healthy.
* **Blast Radius**: Broken test suite upon translation or copy updates.
* **Suggested Mitigation**: Use test-specific data attributes (e.g. `data-testid="mobiledock-apartment-lab"`) instead of relying on visible Korean text labels.

#### Challenge 3: Loose Selector matching for Accordion Node reduction
* **Assumption Challenged**: The lazy rendering accordion test queries the inner grid using `sectorCard.locator('.grid').first()`.
* **Attack Scenario / Failure Mode**: If the layout of the collapsed state is modified such that a helper class or child element uses `.grid` layout (e.g., layout headers or action buttons using CSS grid), the test will match that container and erroneously assert that the company grid is still mounted, leading to a false failure.
* **Blast Radius**: False failures when modifying styling/layout.
* **Suggested Mitigation**: Target the specific content container (e.g., `data-testid="sector-company-grid"`) rather than a generic CSS utility class `.grid`.

#### Challenge 4: Redis Dependency Fallback
* **Assumption Challenged**: The application relies on Upstash Redis caches, which timed out during Test 3 on mobile modal padding verification (`Upstash Redis operation timed out after 1500ms`).
* **Attack Scenario / Failure Mode**: While D-VIEW gracefully fell back to in-memory caching (`ResilientRedis.get` -> Memory Cache), if the memory cache is empty or fails under load, the page contents may not render, causing E2E tests to fail to find the apartment title `동탄역`.
* **Blast Radius**: Temporary UI rendering blank spaces during database timeouts.
* **Suggested Mitigation**: Ensure the mock or local testing environment pre-populates or uses a mock cache provider to avoid outbound network overhead.
