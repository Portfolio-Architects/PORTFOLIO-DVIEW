# Handoff Report — Frontend UI & Client State Investigation

**Agent**: explorer_survey_3  
**Role**: Frontend UI & Client State Investigator  
**Target Milestone**: D-VIEW Lounge Administrative Notices Investigation  
**Date**: 2026-08-22  

---

## 1. Observation

1. **Prop Disconnection in `LoungeContainerClient.tsx` & `LoungeFeedClient.tsx`**:
   - `frontend/src/app/lounge/page.tsx` (lines 64–71, 160–165):
     ```typescript
     const [fetchedPosts, fetchedNews, fetchedNoticesData] = await Promise.all([
       getRecentPosts(50).catch(() => []),
       getMacroNews(40).catch(() => []),
       getLocalNotices(true).catch(() => ({ notices: [], lastUpdated: null }))
     ]);
     ...
     <LoungeContainerClient 
       initialPosts={posts} 
       initialNews={initialNews}
       initialNotices={initialNotices}
       searchParams={resolvedParams} 
     />
     ```
   - `frontend/src/components/LoungeContainerClient.tsx` (line 593):
     ```tsx
     {activeTab === 'notices' && (
       <LoungeFeedClient initialPosts={initialPosts} currentTab="동탄구 소식" />
     )}
     ```
   - `frontend/src/components/LoungeFeedClient.tsx` (lines 105–108, 343, 501):
     ```typescript
     interface LoungeFeedClientProps {
       initialPosts: Post[];
       currentTab: string;
     }
     ...
     const LoungeFeedClient = React.memo(function LoungeFeedClient({ initialPosts, currentTab }: LoungeFeedClientProps) {
       ...
       const [noticesData, setNoticesData] = useState<LocalNoticeItem[]>([]);
     ```
     Observed: `initialNotices` is received in `LoungeContainerClient` but never forwarded into `LoungeFeedClient`. `LoungeFeedClient` unconditionally initializes `noticesData` to `[]`.

2. **Empty DB Fallback Absence in `newsData.ts` & `news.repository.ts`**:
   - `frontend/src/lib/repositories/news.repository.ts` (lines 20–24):
     ```typescript
     if (!db) {
       logger.warn('news.repository.fetchRawLocalNotices', 'Firebase Admin DB not initialized. Returning empty results.');
       return { cityItems: [], railItems: [], cultureItems: [], dongItems: [] };
     }
     ```
   - `frontend/src/lib/services/newsData.ts` (lines 191–194):
     ```typescript
     if (allItems.length === 0) {
       return { notices: [], lastUpdated: null };
     }
     ```
     Observed: When Firestore is unpopulated or fails, `getLocalNotices` returns `{ notices: [] }` without any fallback seed notices for `rail`, `gosi`, `bbs`, `dong`, `culture`.

3. **Sub-Tab Filtering & Dong Specificity in `LoungeFeedClient.tsx`**:
   - `frontend/src/components/LoungeFeedClient.tsx` (lines 708–727):
     ```typescript
     const filteredNotices = useMemo(() => {
       return noticesData.filter(notice => {
         if (activeSubCategory === 'city') {
           if (notice.source !== 'gosi' && notice.source !== 'bbs') return false;
         } else if (activeSubCategory === 'rail') {
           if (notice.source !== 'rail') return false;
         } else if (activeSubCategory === 'culture') {
           if (notice.source !== 'culture') return false;
         } else if (activeSubCategory === 'town') {
           if (notice.source !== 'dong') return false;
           if (activeDongFilter !== 'all') {
             if (notice.dept !== activeDongFilter) return false;
           }
         }
         return true;
       });
     }, [noticesData, activeSubCategory, activeDongFilter]);
     ```
     Observed: `town` sub-filtering relies on `notice.dept === activeDongFilter` where `activeDongFilter` is `'동탄1동'` ~ `'동탄9동'`.

4. **Hardcoded Mock Date in `LoungeFeedClient.tsx`**:
   - `frontend/src/components/LoungeFeedClient.tsx` (lines 190–193):
     ```typescript
     const getDDayText = (dateStr: string) => {
       const target = new Date(dateStr);
       const today = new Date('2026-06-07');
       today.setHours(0, 0, 0, 0);
     ```
     Observed: Hardcoded reference date `'2026-06-07'` causes inaccurate D-Day badge computations.

5. **Dual Modal & Link Bypass**:
   - `frontend/src/components/LoungeContainerClient.tsx` (lines 598–674): Modal uses raw `href={selectedNotice.url}` (lines 643, 657).
   - `frontend/src/components/LoungeFeedClient.tsx` (lines 1436–1571): Modal uses `/api/bypass-notice?url=...` (line 1509).
   - Observed: Duplicate modal declarations exist across container and feed, with container bypassing proxy protections.

6. **Test Suite Status**:
   - Ran `npx jest LoungeFeedClient`:
     - Command: `npx jest LoungeFeedClient`
     - Result: `PASS src/components/LoungeFeedClient.test.tsx` (3 tests passed).

---

## 2. Logic Chain

1. **From Observation 1**: Because `LoungeContainerClient` ignores `initialNotices` when rendering `<LoungeFeedClient currentTab="동탄구 소식" />`, `LoungeFeedClient` mounts with `noticesData = []`. It must issue a client-side `fetch('/api/local-notices')`.
2. **From Observation 2**: If Firestore is cold, empty, or during initial deployment/network failure, `/api/local-notices` returns `{ notices: [] }`.
3. **Connecting Step 1 & 2**: When `noticesData` is empty or only contains local events (`culture`), selecting `city`, `rail`, or `town` results in `filteredNotices.length === 0`. The UI displays the empty box ("선택하신 조건에 해당하는 공지사항이 없습니다."), causing the empty screen bug.
4. **From Observation 3**: Under `town`, filtering expects `notice.dept` to match `"동탄1동"` ~ `"동탄9동"`. If scraper data fails to normalize department names, dong sub-tabs will render 0 items.
5. **From Observation 4 & 5**: Hardcoded dates produce stale D-Day tags, and direct `selectedNotice.url` links in `LoungeContainerClient` bypass the anti-WAF proxy `/api/bypass-notice`, creating broken external navigation when clicked.

---

## 3. Caveats

- Scraper behavior and Firestore population depend on server execution environments (cron jobs and GitHub Actions).
- Local testing confirmed JSDOM unit tests pass, but end-to-end integration requires backend crawler synchronization with mock/live data.
- No other unknown areas in frontend notice presentation were identified.

---

## 4. Conclusion

The empty screen issues in the D-VIEW Lounge administrative notice tab are caused by:
1. Client hydration disconnect (dropping `initialNotices` props across container and feed).
2. Absence of a static fallback dataset in `newsData.ts` / `/api/local-notices` when the database is empty or network times out.
3. Dual modal handling and non-proxied external links in `LoungeContainerClient`.
4. Stale mock reference dates in D-Day badge calculation.

### Concrete Recommendations for Implementation:
1. **Create `frontend/src/hooks/useLocalNotices.ts`**: Standardize SWR fetching (`/api/local-notices?dongtan=true`), deduping, and fallback state.
2. **Prop Hydration in `LoungeFeedClient`**: Update `LoungeFeedClientProps` to accept `initialNotices` and initialize `noticesData` with `initialNotices || []`.
3. **Add Seed Fallback in `newsData.ts`**: Return rich static fallback notices for `gosi`, `bbs`, `rail`, `dong` (1~9동), and `culture` when database returns empty.
4. **Unify Modal & Bypass Links**: Ensure all external links route through `/api/bypass-notice` and replace `'2026-06-07'` with `new Date()`.

---

## 5. Verification Method

1. **Unit Test Verification**:
   ```bash
   npx jest LoungeFeedClient
   ```
2. **Inspection Targets**:
   - `frontend/src/app/lounge/page.tsx`
   - `frontend/src/components/LoungeContainerClient.tsx`
   - `frontend/src/components/LoungeFeedClient.tsx`
   - `frontend/src/lib/services/newsData.ts`
   - `frontend/src/app/api/local-notices/route.ts`
   - `frontend/src/lib/utils/kakaoShare.ts`
3. **Invalidation Condition**: If `LoungeFeedClient` is rendered with `initialNotices` passed from `page.tsx`, and `/api/local-notices` returns seed fallback data even with Firestore offline, an empty screen will not occur under any tab (`all`, `city`, `rail`, `town`, `culture`).
