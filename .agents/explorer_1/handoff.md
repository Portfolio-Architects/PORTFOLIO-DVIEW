# Handoff Report: DVIEW Apt Lab Mobile UI Refactoring - Exploration & Analysis

## 1. Observation

A detailed investigation was conducted across the codebase (`frontend/src/components` and `frontend/src/app`) to identify all components rendering apartment transaction cards, timeline items, real estate feeds, badges (such as `신고가`), apartment metadata (dong/pyeong/floor), transaction prices, and detail buttons.

### Key Files & Component Catalog

#### File 1: `frontend/src/components/MacroDashboardClient.tsx`
- **Component**: `TimelineItemCard` (Lines 376–517), `MacroDashboardClient` timeline container (Lines 1690–1737), `InfoBox` (Lines 206–301).
- **Data Interfaces**: `TimelineItem` (Lines 79–94), `RecentTransaction` (Lines 114–130), `AptTransactionRecord` (Lines 132–149).
- **JSX Layout Structure**:
  - `TimelineItemCard` is wrapped in a flex container: `flex items-center justify-between p-2.5 sm:p-3.5 rounded-xl border w-auto max-w-full box-border`.
  - Left column (`flex flex-col gap-1 min-w-0 flex-1 max-w-[45%] sm:max-w-none`):
    - Apartment Display Name (`text-xs sm:text-sm font-extrabold text-primary`).
    - **`신고가` Badge**: Rendered conditionally when `item.type === 'high'` (`text-[8px] sm:text-[9.5px] font-black px-1 sm:px-1.5 py-0.5 rounded bg-rose-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.4)] shrink-0 animate-pulse`).
    - Dong / Pyeong / Floor Info Line (`text-[9.5px] sm:text-[11px] text-tertiary font-bold`): Dong (`item.dong`), Area (`item.areaLabelM2` / `item.areaLabelPyeong` or `㎡`/`평`), Floor (`item.floor` + `층`).
  - Right column (`flex flex-col items-end gap-0.5 shrink-0 ml-0.5 sm:ml-2`):
    - Price (`text-[12.5px] sm:text-[14.5px] font-black`): Highlighted in `text-rose-500` if rising (`isRising`), `text-slate-500` if falling. Mobile optimization replaces `21억 6,000만` with `21.6억`.
    - **Delta Badge**: Shows price change (`▲ X억 Y만` / `▼ X억 Y만` / `보합`) with background `bg-rose-50 text-rose-600` or `bg-slate-100 text-slate-600`.
  - **Details Button**: Independent button (`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-surface border border-border text-[10px] sm:text-[10.5px] font-extrabold text-secondary hover:text-primary`) labeled `상세`.
- **Note on `RealtimeClient.tsx`**: A standalone file named `RealtimeClient.tsx` does not exist in the codebase. Real-time transaction feed and timeline rendering logic is embedded directly within `MacroDashboardClient.tsx` (using `DEFAULT_TIMELINE_APTS` and real-time transaction calculations) and supplemented by API endpoints like `/api/cron/sync-transactions` and `/api/push/notify-new-high`.

---

#### File 2: `frontend/src/components/HotComplexRanking.tsx`
- **Component**: `HotComplexRanking` (Lines 21–352).
- **JSX Layout Structure**:
  - Grid layout: `grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-4 w-full`.
  - Card Button: `flex md:flex-col items-center md:items-start justify-between p-3.5 md:p-4 md:min-h-[148px] bg-body/40 hover:bg-body hover:scale-[1.02] border border-border/30 rounded-2xl cursor-pointer`.
  - Date Badge: `px-1.5 py-0.5 rounded-md text-[10px] bg-[#fff3e0] text-[#008060]` containing `item.latestDate` (e.g., `5.22`).
  - Apartment Name: `text-[14px] md:text-[15px] font-extrabold text-primary group-hover:text-[#c44d00]`.
  - Dong: `text-[11px] md:text-[12px] font-semibold text-tertiary`.
  - Price: `text-[14.5px] md:text-[15.5px] text-[#c44d00] font-extrabold` (e.g. `14억 5,000만`).
  - Specs: `text-[10.5px] md:text-[11.5px] text-tertiary` (`{areaLabel} · {latestFloor}층`).

---

#### File 3: `frontend/src/components/explore/AptRow.tsx`
- **Component**: `AptRow` (Lines 87–253) (Subcomponent of `TossApartmentExploreClient.tsx`).
- **JSX Layout Structure**:
  - Wrapper: `group flex flex-col md:flex-row items-stretch md:items-center justify-between p-4 md:p-5 border border-border rounded-2xl bg-surface`.
  - Rank Badge: `w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-lg font-black`.
  - Apartment Title & Badges:
    - Name: `text-base font-black text-primary`.
    - `InteractiveHeart` favorite toggle button.
    - Badges: `text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-neutral-100 text-secondary` for Dong, Year Built (`10년차`), Household Count (`1,500세대`), Photo count (`Camera` icon), Interest likes (`Heart` count).
  - Price & Metrics Line: `text-[11px] font-bold text-tertiary` displaying 평당 price, 매매 price, 전세 price, 3-month volume/turnover rate.
  - **Action Button**: `text-[12px] font-extrabold text-secondary bg-neutral-50 px-3 py-1.5 rounded-xl border` labeled `상세 분석`.

---

#### File 4: `frontend/src/components/apartment-modal/TransactionTable.tsx`
- **Component**: `TransactionTable` (Lines 36–330), `TransactionRow` (Lines 337–452).
- **JSX Layout Structure**:
  - Row layout: `flex items-center justify-between p-3 md:p-4 border-b border-body bg-surface hover:bg-body`.
  - Column fields:
    1. Contract Date: `w-[74px] md:w-[84px] text-[14px] md:text-[15px] font-bold` (e.g., `26.05.22`). Shows cancellation date strikethrough if canceled (`line-through decoration-red-500`).
    2. Area Label: `w-[48px] md:w-[56px] text-[12.5px] font-bold` (`84㎡` or `34평`).
    3. Floor: `w-[36px] md:w-[48px] text-[14px] md:text-[15px] font-bold` (`15층`).
    4. Deal Type & Price: `w-[90px] md:w-[110px] text-[15px] md:text-[16px] font-black`. Includes Deal Type Badge (`전`, `월`, `매`) and Outlier Indicator (`AlertTriangle` icon with tooltip).

---

#### File 5: `frontend/src/components/apartment-modal/TransactionSummaryMetrics.tsx`
- **Component**: `TransactionSummaryMetrics` (Lines 36–402).
- **JSX Layout Structure**:
  - Real estate gap & Jeonse ratio cards: `grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-5 mt-3`.
  - Gap Card: `bg-body border border-border/80 rounded-2xl p-4.5`, Gap price (`text-[18px] font-black text-toss-blue`).
  - Jeonse Ratio Card: `bg-body border border-border/80 rounded-2xl p-4.5`, Jeonse ratio (`text-[18px] font-black text-[#ea6100]`).
  - Periodical Price Table: Renders 1M, 3M, 6M, 1Y, 3Y, 5Y, 10Y, ALL averages with supply pyeong calculation.

---

#### File 6: `frontend/src/components/GapInvestmentExplorer.tsx`
- **Component**: `GapComplexCard` (Lines 43–120).
- **JSX Layout Structure**:
  - Container: `flex flex-col bg-surface/80 border border-border/40 hover:scale-[1.01] rounded-[20px] p-5`.
  - Header: Apt Name (`text-[16px] md:text-[18px] font-extrabold text-primary`), Dong + Household Count (`text-[12px] md:text-[13px] font-semibold text-secondary/70`), Grade Badge (`🔥 S등급 (우수)` / `✅ A등급 (보통)` / `⚠️ B등급 (관망)`).
  - Gap Price Box: `bg-[#c44d00]/5 rounded-[14px] p-3.5 border border-[#c44d00]/10`, Gap amount (`text-[18px] md:text-[20px] font-black text-[#c44d00]`), Jeonse Ratio (`text-[11px] md:text-[12px] font-bold`).

---

#### File 7: `frontend/src/components/LoungeFeedClient.tsx`
- **Component**: `LoungeFeedClient` (Lines 810–860).
- **JSX Layout Structure**:
  - Community feed items with real estate transaction summaries and high-price transaction references (`신고가 경신 사례`).

---

## 2. Logic Chain

1. **Requirement Verification**: The prompt required identifying and analyzing `MacroDashboardClient.tsx`, `RealtimeClient.tsx`, and all components rendering transaction cards, timeline items, or feeds with apartment badges (`신고가`), dong/pyeong/floor info, transaction prices, and detail buttons.
2. **Codebase Scan**: Using `find_by_name` and `grep_search`, we queried all `.tsx` files in `frontend/src`.
3. **Observation Synthesis**:
   - `RealtimeClient.tsx` as a separate file path was NOT found. Instead, real-time transaction feeds and high-price alerts are rendered within `MacroDashboardClient.tsx` (`TimelineItemCard` component and `displayedTimelineData`) as well as `HotComplexRanking.tsx` and push notification modules (`/api/push/notify-new-high`).
   - `MacroDashboardClient.tsx` defines `TimelineItemCard` (lines 376–517), which contains:
     - `신고가` badge (Line 419: `bg-rose-500 text-white animate-pulse`).
     - Dong / Area (㎡ or 평) / Floor (Lines 427–436).
     - Price with delta badge (`▲`, `▼`, `보합`) (Lines 442–499).
     - Details button (Lines 504–514: `상세`).
   - `AptRow.tsx` (in `components/explore`) renders list rows for complex rankings, complete with dong, year built, household count, photo badges, price metrics, and `상세 분석` button.
   - `HotComplexRanking.tsx` renders real-time recent transaction cards in a 5-column or 1-column grid.
   - `TransactionTable.tsx` & `TransactionSummaryMetrics.tsx` inside `apartment-modal/` handle modal transaction history rows, outlier detection (`AlertTriangle`), cancellation indicators, and gap/jeonse summary cards.

---

## 3. Caveats

- **File Name Ambiguity**: There is no standalone `RealtimeClient.tsx` file in `frontend/src`. All real-time feed features are integrated into `MacroDashboardClient.tsx` and `HotComplexRanking.tsx`.
- **Scope Limit**: Investigation was strictly read-only as required. No production source files were modified.

---

## 4. Conclusion

All components rendering apartment transaction cards, timeline items, real estate feeds, badges (`신고가`), dong/pyeong/floor information, transaction prices, and detail buttons have been cataloged with exact file paths, line numbers, and JSX layout specifications:

1. `frontend/src/components/MacroDashboardClient.tsx` (`TimelineItemCard`, lines 376–517)
2. `frontend/src/components/HotComplexRanking.tsx` (Lines 21–352)
3. `frontend/src/components/explore/AptRow.tsx` (Lines 87–253)
4. `frontend/src/components/apartment-modal/TransactionTable.tsx` (Lines 36–452)
5. `frontend/src/components/apartment-modal/TransactionSummaryMetrics.tsx` (Lines 36–402)
6. `frontend/src/components/GapInvestmentExplorer.tsx` (Lines 43–120)
7. `frontend/src/components/LoungeFeedClient.tsx` (Lines 810–860)

---

## 5. Verification Method

To verify these findings independently:
1. Run `npx jest frontend/src/components/TimelineItemCardRender.test.tsx` to verify `TimelineItemCard` memoization and rendering behavior.
2. Inspect the specified file paths and line numbers using `view_file` to confirm exact JSX element names and class utilities.
