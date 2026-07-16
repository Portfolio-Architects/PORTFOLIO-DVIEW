## 2026-07-16T14:00:52Z
Your working directory is: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_m2

Please implement the following changes in the codebase:

### 1. API Route Color Updates
File: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend\src\app\api\technovalley\industry-distribution\route.ts`
- In `FALLBACK_DATA` (lines 6-12) and `calculatedData` (lines 404-440), update the colors for the sectors to map to Hwaseong Brand Identity:
  - '반도체·첨단제조': change color from `#9a3412` to `#004696` (Hwaseong Blue)
  - 'IT·소프트웨어': change color from `#ea580c` to `#dc6e2d` (Hwaseong Orange)
  - '바이오·헬스케어': change color from `#f59e0b` to `#10b981` (Emerald)
  - '지식기반 서비스': change color from `#fdba74` to `#38bdf8` (Light Blue/Sky)
  - '정밀기기 및 기타': change color from `#e7e5e4` to `#78716c` (Neutral Gray)

### 2. Remove Navigation Buttons in Hero
File: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend\src\app\technovalley\TechnoValleyClient.tsx`
- Remove the two navigation buttons inside `bottomContent` completely.
- Clean up the unused helper `handleScrollToTaxSimulator` (lines 35-41) and the unused import of `Link` from `next/link`.
- Set `bottomContent={null}` or `bottomContent={undefined}` in `<PageHeroHeader />`.

### 3. Dashboard UI/UX & Performance Optimizations
File: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend\src\components\macro\TechnoValleyDashboard.tsx`
- Update `DONUT_DATA` static array (lines 70-76) colors to match the new colors:
  - '반도체·첨단제조': `#004696`
  - 'IT·소프트웨어': `#dc6e2d`
  - '바이오·헬스케어': `#10b981`
  - '지식기반 서비스': `#38bdf8`
  - '정밀기기 및 기타': `#78716c`
- In the Donut `PieChart` cell rendering loop (around lines 929-943), apply GPU-accelerated CSS styling for 60fps hover interaction. Add `className="transition-transform duration-300 transform hover:scale-105 origin-center focus:outline-none cursor-pointer"` to the `<Cell>` elements. Also, set `style={{ outline: 'none', transformOrigin: 'center' }}` (or `transformOrigin: '50% 50%', willChange: 'transform'`) to ensure standard, smooth SVG centering transformation.
- In `CompanyCard` (lines 581-610), update the card layout styles. Add dynamic Hwaseong border color highlighting on hover. Decide border color based on the `sectorColor` parameter:
  ```typescript
  const isBlueTheme = sectorColor === '#004696' || sectorColor === '#38bdf8';
  const hoverBorderClass = isBlueTheme 
    ? 'hover:border-hs-blue/30 dark:hover:border-hs-blue/20' 
    : 'hover:border-hs-orange/30 dark:hover:border-hs-orange/20';
  ```
  And apply it as `hover:shadow-sm hover:scale-[1.01] transition-all flex items-center gap-3 min-w-0 ${hoverBorderClass}` to the wrapping `div`.
- For the two `LineChart` components (main dashboard around lines 1264-1339 and modal around lines 1649-1717), change the line interpolation curve type from `"monotone"` to `"natural"` on all `<Line>` elements.
- For the modal body container (around line 1600), change `scrollbar-thin` to `custom-scrollbar` in the `className` to enable iOS momentum scrolling.
- Optimize the three main card wrappers inside the dashboard to use responsive paddings. In lines 900, 1162, and 1360, change the padding class from `p-6 rounded-[24px]` to `p-4 sm:p-6 rounded-[20px] sm:rounded-[24px]`.

### Verification & Testing
- Inside `frontend/`, run `npm run build` to verify the build is 100% clean and compile-ready.
- Inside `frontend/`, run `npm run audit` to verify linting and diagnostics.
- Write a detailed handoff report in `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_m2\handoff.md`.

MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.
