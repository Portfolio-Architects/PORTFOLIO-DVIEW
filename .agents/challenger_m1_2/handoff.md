# Milestone M1 Empirical Challenge & Verification Report

**Date**: 2026-08-22  
**Challenger**: Challenger 2 (Empirical Challenger, critic / specialist)  
**Milestone**: M1 (Main Routing & Tab Navigation Reordering)  
**Verdict**: **APPROVE**

---

## 1. Observation

Direct observations obtained through source code inspection, empirical verification script execution, TypeScript type checking, and Jest test suite runs:

1. **Tab Navigation Symmetry (`LoungeHeader` ↔ `MobileDock`)**:
   - **`frontend/src/components/LoungeHeader.tsx`**:
     - Line 72–89: Tab 1: `href="/"`, activeTab `'overview'`, label `'아파트 랩'` (Building2 icon, hs-orange color)
     - Line 92–105: Tab 2: `href="/explore"`, activeTab `'imjang'`, label `'아파트 탐색'` (Home icon, hs-orange color)
     - Line 108–121: Tab 3: `href="/technovalley"`, activeTab `'technovalley'`, label `'테크노 랩'` (LayoutDashboard icon, hs-blue color)
     - Line 124–137: Tab 4: `href="/overview?tab=office"`, activeTab `'office'`, label `'사무실 탐색'` (Building2 icon, hs-blue color)
     - Line 26–33: `handlePopState` synchronously maps `/` -> `'overview'`, `/explore` -> `'imjang'`, `/technovalley` & `/techno` -> `'technovalley'`, `/overview?tab=office` -> `'office'`, `/overview` -> `'overview'`.
   - **`frontend/src/components/pwa/MobileDock.tsx`**:
     - Lines 20–23:
       ```typescript
       { id: 'overview', label: '아파트 랩', icon: Building2, href: '/' },
       { id: 'imjang', label: '아파트 탐색', icon: Home, href: '/explore' },
       { id: 'technovalley', label: '테크노 랩', icon: LayoutDashboard, href: '/technovalley' },
       { id: 'office', label: '사무실 탐색', icon: Building2, href: '/overview?tab=office' },
       ```
     - Line 73: `const showDivider = tab.id === 'imjang';` — renders visual separator between residential tabs and commercial/techno tabs.

2. **Root & Route Component Integrity**:
   - **`frontend/src/app/page.tsx`**:
     - Line 4: Imports `DashboardClient` (Apartment Lab landing).
     - Lines 27–33:
       ```typescript
       export const metadata: Metadata = {
         title: 'D-VIEW 아파트 랩 | 동탄 아파트 실거래가·시세·상대가치 분석 허브',
         description: '동탄 신도시 아파트 실거래 시세 분석, 상승/하락 트렌드, 전세 안전진단부터 실거래가 데이터 분석을 제공합니다.',
         alternates: {
           canonical: 'https://dongtanview.com',
         },
       };
       ```
     - Line 159: Injects `getMainPageSchema(baseUrl)` JSON-LD schema.
     - Lines 107–139: Injects semantic HTML containing Top 10 leaderboards and recent 15 transactions.
   - **`frontend/src/app/technovalley/page.tsx`**:
     - Line 4: Imports `TechnoValleyClient`. No redirects to `/`.
     - Lines 43–49:
       ```typescript
       export const metadata: Metadata = {
         title: 'D-VIEW 테크노 랩 | 동탄 지식산업센터 공실 매칭 & 혜택 센터',
         description: '동탄 테크노밸리 지식산업센터의 공실 해소를 위한 원스톱 솔루션. 빌딩별 공실 정보, 소형 오피스 공동임차 매칭, 입주 혜택 시뮬레이터 및 맞춤형 오피스 핏파인더를 제공합니다.',
         alternates: {
           canonical: 'https://dongtanview.com/technovalley',
         },
       };
       ```
     - Lines 55–97: Injects dedicated Techno Valley JSON-LD WebPage + RealEstateAgent schema.
     - Lines 108–189: Injects semantic HTML table of representative knowledge industry centers and co-working bulletin board.
   - **`frontend/src/app/manifest.ts`**:
     - Lines 44–49: Shortcut for `'동탄 아파트 랩'` points to `url: '/'`.

3. **Empirical Script & Test Results**:
   - Executed empirical assertion suite (`verify-m1.js`): All 18 automated contract assertions passed.
   - TypeScript Static Type Check (`npx tsc --noEmit`): Exited with code 0 (0 compilation errors).
   - Navigation Contract Test (`npm test -- HeaderDockSync.test.tsx`): 1 test suite, 6 tests passed (0 failures).
   - Full Jest Test Suite (`npm test`): 86 test suites, 845 tests passed (100% green, 0 failures).

---

## 2. Logic Chain

1. **User Requirement & Contract Fulfillment**:
   - The user request specified making Apartment Lab the #1 landing at `/` and rearranging the 4 tabs across Desktop Header and Mobile Dock in the order: `[1. 아파트 랩 (/), 2. 아파트 탐색 (/explore), 3. 테크노 랩 (/technovalley), 4. 사무실 탐색 (/overview?tab=office)]`.
   - Inspection confirms both `LoungeHeader` and `MobileDock` strictly follow this order with matching label text, icon assignments, domain-specific color highlights (orange for residential, blue for commercial), and href destinations.
2. **Browser History & URL Synchrony**:
   - Both `LoungeHeader.tsx` and `DashboardClient.tsx` listen to `popstate` and `hashchange` events.
   - Forward/backward navigation between `/`, `/explore`, `/technovalley`, and `/overview?tab=office` accurately updates internal active tab state without flashing or inconsistent state.
3. **SEO & SSR Integrity**:
   - Canonical URLs on `/` (`https://dongtanview.com`) and `/technovalley` (`https://dongtanview.com/technovalley`) prevent duplicate content issues.
   - Semantic HTML and structured data (JSON-LD) are cleanly separated per domain.
4. **Empirical Hardening**:
   - Verified that no regressions were introduced across the entire 86-suite codebase.

---

## 3. Caveats

- `/overview` is preserved as a functional backward-compatible route for external deep-links (e.g., `?tab=office`), which is intended and safe.
- No caveats or blocking issues detected.

---

## 4. Conclusion

**Verdict: APPROVE**

Milestone M1 has met all technical and user-specified acceptance criteria. Routing, tab order, visual indicators, SSR metadata, and browser history synchronization are verified and robust.

---

## 5. Verification Method

To independently verify this verdict:

1. **TypeScript Type Check**:
   ```bash
   cd frontend && npx tsc --noEmit
   ```
   *Expected: Exit code 0, 0 errors.*

2. **Navigation Unit Test**:
   ```bash
   cd frontend && npm test -- HeaderDockSync.test.tsx
   ```
   *Expected: 1 suite passed, 6 tests passed.*

3. **Full Regression Test Suite**:
   ```bash
   cd frontend && npm test
   ```
   *Expected: 86 suites passed, 845 tests passed (100% green).*
