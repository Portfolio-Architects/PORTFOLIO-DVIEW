## 2026-07-14T14:30:25Z
Please implement the R1, R2, and R3 optimizations for the DVIEW application.
Your working directory is: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_1

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Specific requirements:
1. R1: Hwaseong public contest theme colors and Above-the-Fold UX
   - Apply bright theme colors in DVIEW landing page.
   - In frontend/src/components/macro/TechnoValleyDashboard.tsx, add `id="tax-simulator"` to the tax simulator card wrapper (near line 1493).
   - In frontend/src/app/technovalley/TechnoValleyClient.tsx, update PageHeroHeader to render bottomContent with two stylized button pills:
     * "💼 법인 세제 감면 계산기" -> scrolls smoothly to "#tax-simulator".
     * "🤝 소형 공동임차 매칭 보드" -> links to "/overview?tab=office".
     Ensure the pills are styled beautifully with Hwaseong BI Colors (e.g. blue and orange).
   - In frontend/src/components/macro/TechnoValleyDashboard.tsx, replace the less critical KPI Card 4 ("기업별 평균 고용 규모", line 1090) with an interactive button/card for the Tax Simulator: "법인 세제 감면 계산기: 내 예상 절세 혜택 알아보기 (클릭 시 이동)" that smooth scrolls to "#tax-simulator".
   - Replace any other hardcoded legacy orange colors in dashboard elements and charts to use Hwaseong BI Colors (--hs-blue and --hs-orange).

2. R2: Navigation structures & Active states
   - LoungeHeader (frontend/src/components/LoungeHeader.tsx): Update active tab styles to use Hwaseong blue/orange light backgrounds and text.
     * Active 'technovalley' and 'office' tabs (Techno Lab): bg-hs-blue-light text-hs-blue font-extrabold shadow-[0_2px_12px_rgba(0,0,0,0.06)]
     * Active 'overview' and 'imjang' tabs (Apartment Lab): bg-hs-orange-light text-hs-orange font-extrabold shadow-[0_2px_12px_rgba(0,0,0,0.06)]
     * Active 'lounge' tab (Dongtan Lounge): bg-hs-blue-light text-hs-blue font-extrabold shadow-[0_2px_12px_rgba(0,0,0,0.06)]
     * Active tab icons must use the corresponding text color instead of text-primary (e.g. text-hs-blue or text-hs-orange).
   - MobileDock (frontend/src/components/pwa/MobileDock.tsx): Update active tab styles to match LoungeHeader active colors.
     * Active 'technovalley' and 'office' tabs: text-hs-blue bg-hs-blue-light border border-hs-blue/15
     * Active 'overview' and 'imjang' tabs: text-hs-orange bg-hs-orange-light border border-hs-orange/15
     * Active 'lounge' tab: text-hs-blue bg-hs-blue-light border border-hs-blue/15
   - PageHeroHeader (frontend/src/components/PageHeroHeader.tsx): Change subtitle border color from hardcoded "border-[#ea6100]" to "border-[var(--hs-orange)]".

3. R3: CLS Prevention & Stability
   - Refactor skeleton loading components or transitions if needed to eliminate layout shifts (CLS) on tab transitions and page load.
   - Verify layout stability using Playwright test.

4. Verification
   - Run unit tests and Playwright E2E tests: npm run test:e2e
   - Run the audit pipeline: npm run audit (which checks typescript, eslint, data consistency, and E2E audits).
   - Build frontend: npm run build
   Ensure all checks compile and pass successfully.

Write a handoff report at c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_1\handoff.md when you are finished. Send a message to me (conversation ID: 0adc2a81-b532-4c1e-a82b-98a1911b9989) with the path and summary when complete.
