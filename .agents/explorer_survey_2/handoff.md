# Handoff Report — Backend API, Repository & Data Layer Survey

**Agent**: Explorer Survey 2  
**Role**: Investigation & Synthesis  
**Target Milestone**: Hwaseong City Hall & Dongtan Administrative Notices Data Integration & Normalization  
**Working Directory**: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\explorer_survey_2`  
**Handoff Type**: Hard (Task Complete)

---

## 1. Observation

### 1.1. Deduplication Engine in `newsData.ts` Drops Non-duplicate Culture & Lecture Events
- **File**: `frontend/src/lib/services/newsData.ts` (Lines 199–222)
- **Observed Code**:
  ```ts
  const uniqueMap = new Map<string, NoticeData>();
  const urlToKey = new Map<string, string>();

  allItems.forEach(item => {
    const titleKey = `${(item.title || '').trim()}_${(item.date || '').trim()}`;
    const urlKey = item.url ? item.url.trim() : '';

    let duplicateKey = uniqueMap.has(titleKey) ? titleKey : null;
    if (!duplicateKey && urlKey && urlToKey.has(urlKey)) {
      duplicateKey = urlToKey.get(urlKey) || null;
    }

    if (duplicateKey) {
      const existing = uniqueMap.get(duplicateKey);
      if (existing) {
        const currentIsPrefixed = item.id.includes('_');
        const existingIsPrefixed = existing.id.includes('_');
        if (currentIsPrefixed && !existingIsPrefixed) {
          uniqueMap.set(duplicateKey, item);
          if (urlKey) urlToKey.set(urlKey, duplicateKey);
        }
      }
    } else {
      uniqueMap.set(titleKey, item);
      if (urlKey) urlToKey.set(urlKey, titleKey);
    }
  });
  ```
- **Finding**: When items share a common portal URL (e.g. `https://reserve.hscity.go.kr/` for resident lectures or `https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1019` for events), `urlToKey.has(urlKey)` is `true`. Because all scraped items have prefixed IDs (`culture_...`), subsequent distinct events are dropped.

### 1.2. Scraper Department Text & Dongtan Filter Mismatch
- **File 1**: `frontend/scripts/fetch-local-notices.js` (Lines 365, 369–384)
- **File 2**: `frontend/src/app/api/cron/sync-local-notices/route.ts` (Lines 651, 655–672)
- **File 3**: `frontend/src/components/LoungeFeedClient.tsx` (Lines 717–724)
- **Observed Code in Scrapers**:
  ```ts
  const dept = $(tds[3]).text().trim();
  ...
  if (originalId && title && link) {
    const isDongtan = checkIfDongtan(title, dept);
    if (isDongtan) {
      notices.push({
        id: `dong_${deptItem.code}_${originalId}`,
        dept, // Raw table string e.g. "총무팀", "맞춤형복지팀"
        ...
      });
    }
  }
  ```
- **Observed Code in `LoungeFeedClient.tsx`**:
  ```ts
  } else if (activeSubCategory === 'town') {
    if (notice.source !== 'dong') return false;
    
    // 2. Dong filtering (only applicable under 'town' category)
    if (activeDongFilter !== 'all') {
      if (notice.dept !== activeDongFilter) return false;
    }
  }
  ```
- **Finding**: `activeDongFilter` checks for `"동탄1동"`, `"동탄2동"`, ..., `"동탄9동"`. When `notice.dept` is saved as `"총무팀"`, the condition `notice.dept !== activeDongFilter` is true, resulting in 0 notices being displayed for specific dong selections.

### 1.3. Zod Enum Inconsistency in `fetch-local-notices.js`
- **File**: `frontend/scripts/fetch-local-notices.js` (Line 25)
- **Observed Code**:
  ```ts
  source: z.enum(['bbs', 'rail', 'dong', 'gosi'])
  ```
- **Comparison**: `frontend/src/lib/validation/facade.schemas.ts:200` defines:
  ```ts
  source: z.enum(['bbs', 'gosi', 'rail', 'dong', 'culture']).optional()
  ```
- **Finding**: `'culture'` is missing from the batch crawler's schema.

### 1.4. Missing SSR Prop Forwarding in `LoungeContainerClient.tsx`
- **File**: `frontend/src/components/LoungeContainerClient.tsx` (Lines 592–594)
- **Observed Code**:
  ```tsx
  {activeTab === 'notices' && (
    <LoungeFeedClient initialPosts={initialPosts} currentTab="동탄구 소식" />
  )}
  ```
- **Comparison**: `frontend/src/app/lounge/page.tsx:67-71` loads `initialNotices` via `getLocalNotices(true)` and passes it to `LoungeContainerClient`:
  ```tsx
  <LoungeContainerClient 
    initialPosts={posts} 
    initialNews={initialNews}
    initialNotices={initialNotices}
    searchParams={resolvedParams} 
  />
  ```
- **Finding**: `LoungeContainerClient` does not pass `initialNotices` into `LoungeFeedClient`. `LoungeFeedClient` has to trigger a client-side fetch from `/api/local-notices`, causing skeleton flashing.

### 1.5. Bypass URL Domain Whitelist Restriction
- **File**: `frontend/src/app/api/bypass-notice/route.ts` (Lines 10–24)
- **Observed Code**:
  ```ts
  const bypassNoticeQuerySchema = z.object({
    url: z.string()
      .url('Invalid URL format.')
      .refine((url) => {
        try {
          const parsed = new URL(url);
          const hostname = parsed.hostname;
          return hostname === 'hscity.go.kr' || hostname.endsWith('.hscity.go.kr');
        } catch {
          return false;
        }
      }, {
        message: 'Invalid target URL domain. Only 화성시청 (hscity.go.kr) URLs are allowed.',
      }),
  });
  ```
- **Finding**: URLs with domains like `https://www.hcf.or.kr` (Hwaseong Cultural Foundation) or `https://dongtanview.com` are rejected with 400 Bad Request.

---

## 2. Logic Chain

1. **Premise 1**: All 5 categories (`gosi`, `bbs`, `rail`, `dong`, `culture`) must be available in `/api/local-notices` and displayed properly when users switch tabs (`시정공고`, `교통·철도`, `동네행정`, `문화·행사`) and select specific Dongtan 1~9 dong filters.
2. **Step 1 (Deduplication Logic)**: In `newsData.ts`, `urlToKey` maps `urlKey -> titleKey`. If 10 culture notices have the same top-level link `https://reserve.hscity.go.kr/`, items 2 to 10 match `urlToKey.has(urlKey)` and are discarded. Thus, valid unique notices are eliminated before reaching the API response.
3. **Step 2 (Dong Department Name Mapping)**: In scrapers (`fetch-local-notices.js` and `sync-local-notices/route.ts`), Source 4 scrapes Dongtan 1~9 boards (`q_deptCode=57700100000` ~ `57700180000`). If `dept` is stored as `"총무팀"`, the UI filter `notice.dept === activeDongFilter` (where `activeDongFilter` is `"동탄1동"`) fails. Furthermore, `checkIfDongtan` skips dong notices without explicit "동탄" keywords. Thus, dong notices are lost at scraping and filtering stages.
4. **Step 3 (Schema Parity)**: If `fetch-local-notices.js` schema does not contain `'culture'`, any culture records processed by it will fail validation.
5. **Step 4 (SSR & Client Performance)**: In `LoungeContainerClient`, not passing `initialNotices` to `LoungeFeedClient` causes an empty initial state and redundant client-side network requests.
6. **Step 5 (Resilience & Fallback)**: If Hwaseong City Hall website times out / blocks IPs and Firestore is empty, `newsData.ts` returns `{ notices: [], lastUpdated: null }`, leaving 4 out of 5 category tabs completely blank. Providing a static backup dataset ensures 100% availability.

---

## 3. Caveats

- **External Site HTML Structure**: Hwaseong City Hall website (`www.hscity.go.kr`) may periodically update its table markup or pagination parameters. The scraper Cheerio selectors use dynamic header matching (`titleIdx`, `deptIdx`, `dateIdx`), which is resilient, but WAF IP throttling can still trigger HTTP 403/429.
- **Client Cache Preloading Key**: `SWRProvider.tsx` preloads `/api/local-notices?dongtan=true`, while `LoungeContainerClient.tsx` requests `/api/local-notices`. Standardizing on `/api/local-notices` maximizes SWR cache hit rates.

---

## 4. Conclusion

To achieve complete data normalization and resilience across the administrative notice pipeline:
1. **Fix `newsData.ts` Deduplication**: Base deduplication on composite key `title + '_' + date` and exact detail URL parameters, preventing false-positive duplicate collapse across shared generic URLs.
2. **Normalize Dong Scraper Output**: In `fetch-local-notices.js` and `sync-local-notices/route.ts` for Source 4, set `dept = deptItem.name` (e.g. `'동탄1동'`), and set `isDongtan = true` unconditionally.
3. **Update Zod Schema in `fetch-local-notices.js`**: Add `'culture'` to `source: z.enum(['bbs', 'rail', 'dong', 'gosi', 'culture'])`.
4. **Wire SSR Props in `LoungeContainerClient.tsx`**: Pass `initialNotices={notices}` to `<LoungeFeedClient>` and accept `initialNotices` in `LoungeFeedClientProps`.
5. **Expand Whitelist in `bypass-notice`**: Allow `*.hscity.go.kr`, `*.hcf.or.kr`, and internal domain `dongtanview.com`.
6. **Implement Fallback Dataset**: Bundle a high-fidelity static backup dataset in `public/data/local-notices-backup.json` and in `newsData.ts` to guarantee all 5 categories render seamlessly during external network or database outages.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Deduplication Bug**:
   Inspect `frontend/src/lib/services/newsData.ts:199-222`. Trace multiple items sharing `url = "https://reserve.hscity.go.kr/"`.
2. **Verify Dong Sub-Filtering Mismatch**:
   Inspect `frontend/src/components/LoungeFeedClient.tsx:721-724` against `frontend/src/app/api/cron/sync-local-notices/route.ts:651`.
3. **Verify Zod Schema Enum**:
   Compare `frontend/scripts/fetch-local-notices.js:25` with `frontend/src/lib/validation/facade.schemas.ts:200`.
4. **Verify SSR Prop Passing**:
   Inspect `frontend/src/components/LoungeContainerClient.tsx:592-594` and `LoungeFeedClientProps` definition.
5. **Run Existing Test Suite**:
   Execute `npm run test` in `frontend/` to check current test coverage and verify no regression occurs.
