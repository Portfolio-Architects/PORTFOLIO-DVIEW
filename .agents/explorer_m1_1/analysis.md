# Technical Analysis Report: R1 Mobile Layout & Outline Defense

**Investigated by:** `explorer_m1_1`  
**Target Project:** D-VIEW Frontend (`frontend/src/`)  
**Scope:** Mobile Viewports (320px ~ 768px portrait & landscape), Flexbox/Grid bounds, `min-w-0` enforcement, overflow clipping, fixed pixel widths, and focus outline defense.  
**Date:** 2026-07-27  

---

## 1. Executive Summary

A comprehensive, read-only code audit was performed across the D-VIEW Next.js frontend codebase (`frontend/src/components/`, `frontend/src/app/`, `frontend/src/styles/`). The investigation focused on identifying layout breaches on mobile screens (specifically 320px, 360px, 375px, and 414px viewports), flexbox text overflow bugs missing `min-w-0`, fixed pixel width elements (`w-[...]`) exceeding container boundaries, and outline clipping issues caused by `overflow-hidden` combined with Tailwind `focus:ring` or `:focus-visible` outline offsets.

### Core Findings Matrix
| Target Category | Key Issue Identified | Severity | Primary File & Line Numbers |
|---|---|---|---|
| **Outline Defense** | Focus ring clipping due to `overflow-hidden` + `focus:ring-2` / `:focus-visible` offset | **High** | `globals.css:178-182`, `MacroDashboardClient.tsx:1978,2018`, `LoungeFeedClient.tsx:225,1108`, `AptRow.tsx:179` |
| **Flex Containers** | Missing `min-w-0` causing text truncation failure and flex box blowout | **Medium-High** | `MacroDashboardClient.tsx:406-411`, `MobileDock.tsx:100-108`, `LoungeFeedClient.tsx:306-316` |
| **Fixed Pixel Widths** | Fixed width elements (`w-[...]`, `min-w-[...]`) breaching 320px viewports | **Medium** | `DashboardClient.tsx:106`, `LoungeFeedClient.tsx:19`, `MacroDashboardClient.tsx:1812`, `TechnoValleyDashboard.tsx:922` |
| **Mobile Dock & Nav** | Dock tab text label squeezing on 320px viewports | **Medium** | `MobileDock.tsx:72-108` |
| **Modal & Backdrop** | Horizontal padding buffer and rounded corner overflow clipping | **Low-Medium** | `LoungeModalBackdrop.tsx:100-113`, `ApartmentModal.tsx:2638` |

---

## 2. Detailed Findings by Category

### Category A: Focus Ring & Outline Overlapping / Clipping Defense

#### Finding A-1: Global Focus Ring Offset Cutoff in Hidden Overflow Containers
* **File Path:** `frontend/src/app/globals.css` (Lines 178–182)
* **Code snippet:**
  ```css
  :focus-visible {
    outline: 2px solid #ea6100;
    outline-offset: 2px;
    border-radius: inherit;
  }
  ```
* **Observation:** The global focus-visible outline adds a 2px solid ring with a `2px` outward offset (`outline-offset: 2px`). This requires a 4px perimeter margin outside the element bounding box.
* **Root Cause & Impact:** When elements have Tailwind utility `overflow-hidden` or `overflow-x-clip`, any child element receiving keyboard focus (or the card container itself receiving `:focus-visible`) has its top, bottom, left, and right focus rings clipped by 2px to 4px.
* **Affected Components:**
  1. `MacroDashboardClient.tsx` (Lines 1978, 2018, 2059, 2100): Interactive card buttons with `group relative overflow-hidden focus:ring-2`. The `overflow-hidden` clips the 2px focus ring.
  2. `LoungeFeedClient.tsx` (Lines 225, 299, 1108, 1235): Community post & notice cards with `relative overflow-hidden focus:ring-2`. Focus ring cut off on all borders.
  3. `AptRow.tsx` (Line 179): Row item buttons with `relative overflow-hidden focus-visible:ring-2`. Focus ring cut off on outer border.
  4. `ApartmentModal.tsx` (Line 2638): Main modal box `<div className="... rounded-[24px] overflow-hidden">` clipping focus rings of internal header and tab controls.
* **Actionable Recommendation:**
  - For card buttons using `overflow-hidden` for hover background effects, replace `overflow-hidden` with `overflow-clip` or separate the background effect wrapper into an inner absolute `inset-0 overflow-hidden` layer, allowing outer element focus rings to render unclipped.
  - Or add inset ring styling: `focus:ring-2 focus:ring-inset` for containers with unavoidable `overflow-hidden`.

---

### Category B: Flexbox & Grid Containers Missing `min-w-0`

#### Finding B-1: `TimelineItemCard` Button Wrapper Missing `min-w-0`
* **File Path:** `frontend/src/components/MacroDashboardClient.tsx` (Lines 406–411)
* **Code snippet:**
  ```tsx
  <button
    type="button"
    onClick={() => onCardClick(item.aptName)}
    className="flex-1 flex items-center justify-between text-left outline-none focus:ring-2 focus:ring-[#ea6100]/50 rounded-lg p-0.5 bg-transparent border-none min-w-0 cursor-pointer overflow-hidden gap-1 sm:gap-2"
  >
    <div className="flex flex-col gap-1 min-w-0 flex-1 overflow-hidden">
      <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 w-full overflow-hidden">
        <span className="text-xs sm:text-sm font-extrabold text-primary ... truncate min-w-0 flex-1">
          {item.displayAptName || item.aptName}
        </span>
  ```
* **Observation:** In `TimelineItemCard`, while inner `<span>` and `<div>` elements have `min-w-0`, the outer flex button item at line 393 (`<div className="flex items-center justify-between ... gap-1.5 sm:gap-3">`) holds the price section at `shrink-0` on the right side.
* **Root Cause & Impact:** On 320px ~ 360px portrait viewports, if an apartment name is long (e.g. "동탄역 시범 한화꿈에그린 프레스티지"), the left flex item can push against the right price column, causing price text or delta badges ("▲ 1억 2,000만") to wrap onto a second line or overflow the card border.
* **Actionable Recommendation:** Ensure the left column `<div>` (Line 409) retains `min-w-0` and set the price wrapper to `shrink-0` with explicit maximum width `max-w-[45%]` on mobile viewports `< 360px`.

#### Finding B-2: `MobileDock` Tab Label Squeezing on 320px Screens
* **File Path:** `frontend/src/components/pwa/MobileDock.tsx` (Lines 72–108)
* **Code snippet:**
  ```tsx
  <div className="flex items-center justify-between w-full min-w-0 gap-0.5">
    {tabs.map((tab) => (
      <Link
        key={tab.id}
        className="group flex flex-1 min-w-0 flex-col items-center justify-center min-h-[48px] rounded-[18px] ... relative"
      >
        <tab.icon size={19} className="..." />
        <span className="text-[10.5px] font-bold tracking-tight relative z-10 whitespace-nowrap">{tab.label}</span>
      </Link>
    ))}
  </div>
  ```
* **Observation:** The mobile dock renders 5 tabs ("테크노 랩", "사무실 탐색", "동탄 라운지", "아파트 랩", "아파트 탐색") side-by-side along with vertical dividers between specific tab groups.
* **Root Cause & Impact:** On a 320px viewport, total available width is 320px minus 20px padding (`px-2.5`) = 300px. 300px / 5 tabs = 60px per tab. "사무실 탐색" (5 Korean characters + tracking) takes approximately 50px-52px. With `whitespace-nowrap` and active state background pills (`inset-0 rounded-[18px]`), tab labels touch the divider lines or get cut off on 320px screens.
* **Actionable Recommendation:**
  - Adjust label typography for small viewports: `text-[9.5px] xs:text-[10.5px] sm:text-[11px]`.
  - Reduce icon size slightly on ultra-small screens: `size={17} sm:size={19}`.
  - Set tab label container with `min-w-0 truncate` to gracefully handle extreme narrow states.

#### Finding B-3: Notice Item Mobile Info Row Missing `min-w-0`
* **File Path:** `frontend/src/components/LoungeFeedClient.tsx` (Lines 306–316)
* **Code snippet:**
  ```tsx
  <div className="flex sm:hidden items-center gap-2">
    <span className="text-[11px] font-extrabold text-emerald-600 tracking-wide">{notice.dept}</span>
    <span className="text-[11px] text-gray-300">|</span>
    <span className="text-[11px] font-semibold text-tertiary truncate max-w-[100px]">{notice.date}</span>
  </div>
  ```
* **Observation:** The department name (`notice.dept`) is not constrained with `truncate` or `max-w-[...]`.
* **Root Cause & Impact:** If department name is long (e.g. "동탄7동 주민자치센터"), it forces the date text off screen on 320px mobile displays.
* **Actionable Recommendation:** Add `min-w-0` to parent div and add `truncate max-w-[90px]` to department span.

---

### Category C: Fixed Pixel Widths Breaching 320px ~ 768px Viewports

#### Finding C-1: `CalculatorLoader` Modal Minimum Width Breach
* **File Paths:** 
  - `frontend/src/components/DashboardClient.tsx` (Line 106)
  - `frontend/src/components/LoungeFeedClient.tsx` (Line 19)
* **Code snippet:**
  ```tsx
  <div className="bg-surface/75 dark:bg-surface/75 border border-border/50 p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] ... flex flex-col items-center gap-5 text-center min-w-[280px] max-w-[320px] backdrop-blur-2xl">
  ```
* **Observation:** Loader dialog uses `min-w-[280px] max-w-[320px]`.
* **Root Cause & Impact:** On a 320px viewport, screen width is 320px. The outer fixed overlay container has padding (`p-4` or `p-6`). A modal card with `max-w-[320px]` plus outer padding equals 352px width, exceeding 320px and causing horizontal screen stretching or off-screen clipping.
* **Actionable Recommendation:** Change card width to `w-[calc(100vw-32px)] max-w-[320px] min-w-[260px]`.

#### Finding C-2: `MacroDashboardClient` Popover Dropdown Overflow
* **File Path:** `frontend/src/components/MacroDashboardClient.tsx` (Line 1812)
* **Code snippet:**
  ```tsx
  <div className="absolute right-0 top-[32px] z-[50] w-[260px] max-h-[320px] overflow-y-auto bg-surface border border-border rounded-2xl shadow-xl p-3 animate-in fade-in slide-in-from-top-2 duration-200">
  ```
* **Observation:** Popover uses `absolute right-0 w-[260px]`.
* **Root Cause & Impact:** If the trigger button is positioned near the left edge of a small mobile screen (e.g. line 1790 selector button `w-[130px]`), a 260px popover anchored to `right-0` extends leftwards by 260px. On 320px screens with 16px section padding, `320px - 16px = 304px`. If the anchor parent is inset, `w-[260px]` can bleed past the left viewport boundary `x < 0`.
* **Actionable Recommendation:** Add `max-w-[calc(100vw-32px)]` to popovers and use `right-0 sm:right-auto sm:left-0` where appropriate.

#### Finding C-3: `TechnoValleyDashboard` Donut Chart Dimensions
* **File Path:** `frontend/src/components/macro/TechnoValleyDashboard.tsx` (Lines 922, 953)
* **Code snippet:**
  ```tsx
  <div className="w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] relative flex items-center justify-center shrink-0">
  ```
* **Observation:** Donut chart SVG container is set to `w-[220px] h-[220px]` on mobile.
* **Root Cause & Impact:** On 320px screen inside a card with `p-4` padding (32px total padding), available width is `320px - 32px = 288px`. A 220px donut leaves only 68px for margins and card borders, pushing the adjacent industry legend text into extreme narrow columns.
* **Actionable Recommendation:** Use responsive sizing: `w-[180px] h-[180px] xs:w-[210px] xs:h-[210px] sm:w-[260px] sm:h-[260px]`.

---

## 3. Component-by-Component Review Summary

| Component Name | Mobile Layout Status | Outline Defense Status | Action Required |
|---|---|---|---|
| `DashboardClient.tsx` | **PASS** (Good max-w-full handling) | **PASS** | Minor fix for `CalculatorLoader` min-w |
| `MacroDashboardClient.tsx` | **WARN** (Popovers & fixed selects) | **WARN** (`overflow-hidden` clips focus rings) | Fix popover width & card focus rings |
| `LoungeModalBackdrop.tsx` | **PASS** (Good portal backdrop) | **WARN** (Modal article clips child rings) | Add ring-inset or padding buffer |
| `MobileDock.tsx` | **WARN** (Tab labels squeeze on 320px) | **PASS** | Scale text to `text-[9.5px]` on `< 360px` |
| `LoungeHeader.tsx` | **PASS** (`hidden md:flex` on desktop) | **PASS** | None |
| `TossApartmentExploreClient.tsx` | **PASS** (Responsive sidebar & drag) | **PASS** | None |
| `AptRow.tsx` | **PASS** (Good flex layout) | **WARN** (`overflow-hidden` clips focus ring) | Remove `overflow-hidden` from button root |
| `ApartmentModal.tsx` | **PASS** (Full mobile bottom sheet) | **PASS** | Safe bottom area inset preserved |
| `TechnoValleyDashboard.tsx` | **WARN** (220px donut SVG on 320px) | **PASS** | Make donut SVG responsive (`w-[180px]`) |

---

## 4. Actionable Remediation Plan for Implementer (M2)

Below are concrete code modifications to resolve all identified issues:

### Fix 1: Focus Ring Unclipping (`globals.css` & Card Utilities)
Create a helper utility class in `globals.css`:
```css
/* Focus Ring Safe Container Utility */
.focus-ring-container {
  position: relative;
  isolation: isolate;
}
.focus-ring-container:focus-visible {
  outline: 2px solid #ea6100;
  outline-offset: 2px;
}
```

### Fix 2: MobileDock Typography & Sizing Scaling (`MobileDock.tsx`)
```tsx
// Lines 100-108 in MobileDock.tsx
<Link
  key={tab.id}
  href={tab.href}
  className="group flex flex-1 min-w-0 flex-col items-center justify-center min-h-[44px] sm:min-h-[48px] rounded-[16px] sm:rounded-[18px] ..."
>
  {isActive && (
    <div className={`absolute inset-0 rounded-[16px] sm:rounded-[18px] ${activeBgClass}`} />
  )}
  <tab.icon size={17} strokeWidth={isActive ? 2.5 : 2} className="mb-0.5 relative z-10 sm:w-[19px] sm:h-[19px]" />
  <span className="text-[9.5px] xs:text-[10.5px] font-bold tracking-tight relative z-10 whitespace-nowrap min-w-0 truncate px-0.5">
    {tab.label}
  </span>
</Link>
```

### Fix 3: Loader Dialog Sizing (`DashboardClient.tsx` & `LoungeFeedClient.tsx`)
```tsx
// Change min-w-[280px] max-w-[320px] to:
className="bg-surface/75 dark:bg-surface/75 border border-border/50 p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-5 text-center w-[calc(100vw-32px)] min-w-[260px] max-w-[320px] backdrop-blur-2xl"
```

### Fix 4: Popover Bounds Defense (`MacroDashboardClient.tsx`)
```tsx
// Line 1812 in MacroDashboardClient.tsx
<div className="absolute right-0 top-[32px] z-[50] w-[260px] max-w-[calc(100vw-32px)] max-h-[320px] overflow-y-auto bg-surface border border-border rounded-2xl shadow-xl p-3 animate-in fade-in slide-in-from-top-2 duration-200">
```

---

## 5. Verification Commands

To verify layout integrity and outline defense after implementation:
1. **Desktop / Mobile Build Check:**
   ```bash
   npm run build
   ```
2. **Playwright Mobile E2E Layout Tests:**
   ```bash
   npx playwright test --project="Mobile Chrome"
   ```
3. **Viewport Spot Inspection:**
   - Test on Chrome DevTools device mode at 320x568 (iPhone SE), 360x640 (Galaxy S8), and 375x667 (iPhone 8).
