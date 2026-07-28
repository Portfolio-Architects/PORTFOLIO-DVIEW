# Handoff Report: R1 Mobile Layout & Outline Defense

**Agent:** `explorer_m1_1`  
**Milestone:** M1 (Read-Only Investigation & Analysis)  
**Working Directory:** `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\explorer_m1_1`  
**Date:** 2026-07-27  

---

## 1. Observation

Direct code inspection of `frontend/src/` revealed the following specific file paths, line numbers, and verbatim CSS/Tailwind class structures:

1. **Global Focus Outline & Clipping:**
   - File `frontend/src/app/globals.css`, Lines 178–182:
     ```css
     :focus-visible {
       outline: 2px solid #ea6100;
       outline-offset: 2px;
       border-radius: inherit;
     }
     ```
   - File `frontend/src/components/MacroDashboardClient.tsx`, Lines 1978, 2018, 2059, 2100:
     ```tsx
     className="... cursor-pointer hover:-translate-y-1 active:scale-[0.99] transition-all duration-300 group relative overflow-hidden outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent"
     ```
   - File `frontend/src/components/LoungeFeedClient.tsx`, Lines 225, 299, 1108, 1235:
     ```tsx
     className="... cursor-pointer group w-full text-left outline-none focus:ring-2 focus:ring-[#c44d00]/30 ... rounded-[24px] relative overflow-hidden"
     ```
   - File `frontend/src/components/explore/AptRow.tsx`, Line 179:
     ```tsx
     className="group flex ... rounded-2xl bg-surface ... relative overflow-hidden w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50"
     ```

2. **Flexbox `min-w-0` Omissions:**
   - File `frontend/src/components/MacroDashboardClient.tsx`, Lines 406–411:
     - Outer `<button>` at line 406 has `flex-1 flex items-center justify-between ... min-w-0`, but left flex column inside `<div className="flex flex-col gap-1 min-w-0 flex-1 overflow-hidden">` can push against right price column on ultra-narrow viewports (< 360px).
   - File `frontend/src/components/pwa/MobileDock.tsx`, Lines 72–108:
     - Line 72: `<div className="flex items-center justify-between w-full min-w-0 gap-0.5">`
     - Line 108: `<span className="text-[10.5px] font-bold tracking-tight relative z-10 whitespace-nowrap">{tab.label}</span>`
     - On 320px screen (300px net available width), 5 tabs ("테크노 랩", "사무실 탐색", "동탄 라운지", "아파트 랩", "아파트 탐색") with `whitespace-nowrap` consume 50px-52px each plus icon & dividers, leading to label collision or clipping on 320px viewports.
   - File `frontend/src/components/LoungeFeedClient.tsx`, Lines 306–316:
     - `<div className="flex sm:hidden items-center gap-2">` holding department name (`notice.dept`) without `truncate` or `min-w-0` on parent container.

3. **Fixed Pixel Width Violations:**
   - File `frontend/src/components/DashboardClient.tsx` (Line 106) & `LoungeFeedClient.tsx` (Line 19):
     ```tsx
     className="... min-w-[280px] max-w-[320px] backdrop-blur-2xl"
     ```
     On a 320px mobile display with outer padding (e.g. `p-4` = 32px), `max-w-[320px]` creates a card width of 320px + padding = 352px, exceeding 320px viewport boundaries.
   - File `frontend/src/components/MacroDashboardClient.tsx`, Line 1812:
     ```tsx
     className="absolute right-0 top-[32px] z-[50] w-[260px] max-h-[320px] ..."
     ```
     Popover with `w-[260px]` anchored to `right-0` can extend past the left screen edge on 320px viewports when the parent container has margin/padding.
   - File `frontend/src/components/macro/TechnoValleyDashboard.tsx`, Line 922:
     ```tsx
     className="w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] relative flex items-center justify-center shrink-0"
     ```
     Fixed 220px donut chart container on 320px screen leaves only 68px for card padding and legend grid layout.

---

## 2. Logic Chain

1. **Observation:** `globals.css:178-182` sets `outline-offset: 2px` for `:focus-visible`, while multiple component cards (`MacroDashboardClient.tsx:1978`, `LoungeFeedClient.tsx:1108`, `AptRow.tsx:179`) combine `overflow-hidden` with `focus:ring-2` / `focus-visible:ring-2`.
2. **Logic:** In CSS geometry, `overflow-hidden` clips any content rendering outside an element's bounding box. An outline with offset 2px renders 4px beyond the border. Therefore, combining `overflow-hidden` on interactive card containers physically cuts off focus ring indicators, violating accessible outline defense rules.

3. **Observation:** `MobileDock.tsx:108` applies `whitespace-nowrap` to 5 tab label strings rendered inside a 320px wide fixed bottom navigation dock (`px-2.5` padding = 300px usable width).
4. **Logic:** 300px divided by 5 tabs yields 60px max width per tab. Korean text strings such as "사무실 탐색" (5 chars * ~10.5px font size = ~52px width) combined with icons (19px) and vertical dividers leave 0px safety margin. On 320px devices (iPhone SE 1st gen, Galaxy Fold outer display), text labels get squeezed or clipped against tab borders.

5. **Observation:** `DashboardClient.tsx:106` sets `CalculatorLoader` dialog card bounds to `min-w-[280px] max-w-[320px]`.
6. **Logic:** On a 320px screen, any outer container padding (e.g. 16px on each side) subtracts 32px from the screen width, leaving 288px. Specifying `max-w-[320px]` causes the modal box to be wider than the available content area (288px), causing horizontal scrollbars or off-screen clipping.

---

## 3. Caveats

- **Device Hardware Testing:** Investigation was performed via static code analysis and structural layout tracing in CODE_ONLY mode without physical iOS Safari or Android Chrome rendering runtime.
- **Dynamic Content Variances:** Real API response lengths for apartment names or community post titles could vary. The recommendations account for worst-case long Korean strings.
- **Third-Party Libraries:** Recharts SVG containers use custom global style overrides (`globals.css:246-254`) to strip default SVG focus rings (`outline: none !important`). This is intentional to prevent black rectangle artifacts on touch tap in Recharts.

---

## 4. Conclusion

The frontend codebase has a strong mobile-first foundation with clean Tailwind responsive utility usage (`sm:`, `md:`, `lg:`). However, 4 specific layout defense deficiencies exist that require targeted remediation by the implementer in M2:
1. Focus ring clipping caused by `overflow-hidden` on interactive cards with `focus:ring-2`.
2. Mobile dock label crowding on 320px viewports.
3. Fixed width modal loaders (`max-w-[320px]`) and popover menus (`w-[260px]`) breaching 320px screen bounds.
4. Selective missing `min-w-0` on mobile notice list flex items.

Detailed fix recommendations and code diff proposals have been written to `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\explorer_m1_1\analysis.md`.

---

## 5. Verification Method

1. **Static Analysis & Inspection:**
   - Inspect `frontend/src/app/globals.css` and check focus ring definitions.
   - Inspect `frontend/src/components/pwa/MobileDock.tsx` lines 72-108.
   - Inspect `frontend/src/components/MacroDashboardClient.tsx` lines 1812 & 1978.
2. **Build Verification:**
   ```bash
   npm run build
   ```
3. **Playwright Mobile E2E Layout Test:**
   ```bash
   npx playwright test --project="Mobile Chrome"
   ```
4. **Invalidation Conditions:**
   - Any horizontal scrollbar appearing on `html` or `body` at 320px viewport width.
   - Any clipped focus outline when pressing Tab key to navigate card items.
