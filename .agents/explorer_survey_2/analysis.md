# Deep Investigation & Survey Report: Backend API, Repository & Data Layer

**Document Version**: 1.0.0  
**Target Subsystem**: Hwaseong City Hall & Dongtan Administrative Notices Data Pipeline  
**Investigated Modules**:
- Backend API: `frontend/src/app/api/local-notices/route.ts`
- Repository Layer: `frontend/src/lib/repositories/news.repository.ts`
- Domain Services: `frontend/src/lib/services/newsData.ts`
- Validation & Types: `frontend/src/lib/validation/facade.schemas.ts`, `frontend/src/types/notice.ts`
- Scrapers & Batch Pipeline: `frontend/scripts/fetch-local-notices.js`, `frontend/src/app/api/cron/sync-local-notices/route.ts`
- Redirect & Security: `frontend/src/app/api/bypass-notice/route.ts`
- Client Integration: `LoungeContainerClient.tsx`, `LoungeFeedClient.tsx`, `NewsClient.tsx`, `MacroDashboardClient.tsx`, `LocalEventCuration.tsx`

---

## 1. Executive Summary

This investigation analyzed the end-to-end data lifecycle for the Hwaseong City Hall & Dongtan area local administrative notices—from web scrapers and Firestore/Redis persistence to API routes and frontend rendering across all 5 categories (`gosi`, `bbs`, `rail`, `dong`, `culture`).

Several critical structural bugs and integration disconnects were identified:
1. **URL Collision in Deduplication Engine (`newsData.ts`)**: Generic URLs (such as `https://reserve.hscity.go.kr/` or board index URLs) cause all subsequent culture events, citizen lectures (Dongtan 2~9), and AI market reports to be discarded as duplicate entries.
2. **Dong Sub-Filtering Mismatch (`dept` vs. `activeDongFilter`)**: Scrapers save raw department cell text (e.g. "총무팀", "맞춤형복지팀") rather than standardized dong names ("동탄1동" ~ "동탄9동"). Furthermore, an overly strict `checkIfDongtan` filter discards neighborhood notices lacking the word "동탄". As a result, selecting specific Dong chips in the UI yields 0 matching notices.
3. **Zod Enum Schema Mismatch in Batch Scraper (`fetch-local-notices.js`)**: Missing `'culture'` in `NoticeSchema.source` enum definition.
4. **Missing SSR Prop Forwarding in `LoungeContainerClient.tsx`**: `LoungeContainerClient` receives server-side `initialNotices` from `LoungePage`, but does not pass them down to `LoungeFeedClient`, forcing redundant client fetches and layout skeleton flashing.
5. **Absence of Backend Resilient Fallback Dataset**: If Firestore is empty or external scraping fails, the backend returns empty arrays, leaving 4 out of 5 category tabs completely blank.
6. **Domain Whitelist Restriction in `bypass-notice`**: Rejects valid civic domains such as `https://www.hcf.or.kr` (Hwaseong Cultural Foundation) with 400 Bad Request.

---

## 2. Architecture & Data Flow Map

```
┌────────────────────────────────────────────────────────────────────────┐
│                        External Sources & Generators                   │
│  - Source 1: BBS 1019 (타기관 고시공고)                                │
│  - Source 2: BD_notice (화성시 고시공고)                               │
│  - Source 3: BBS 1131 (철도사업 추진현황)                              │
│  - Source 4: BBS 1049 (동탄 1동~9동 동별 공지)                         │
│  - Source 5: BBS 1154 (동탄트램 추진현황)                              │
│  - Source 6: Hyperlocal Culture & Events Generator                     │
│  - Source 7: AI Real Estate Gap/Risk Report Generator                  │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          Ingestion Layer                               │
│  1. GitHub Actions Script: `frontend/scripts/fetch-local-notices.js`   │
│  2. Cron API Route: `frontend/src/app/api/cron/sync-local-notices`     │
│  - Parses HTML using Cheerio                                           │
│  - Validates with Zod noticeSchema                                     │
│  - Batch writes to Firestore `local_notices` (merge: true)             │
│  - Invalidates Redis cache keys:                                       │
│      DTDLS:cache:localNotices:filterDongtan:true                       │
│      DTDLS:cache:localNotices:filterDongtan:false                      │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Data & Repository Layer                         │
│  1. Firestore Collection: `local_notices`                              │
│  2. Repository: `frontend/src/lib/repositories/news.repository.ts`     │
│     - `fetchRawLocalNotices(filterDongtan)`                            │
│     - Executes 4 parallel queries (city, rail, culture, dong)          │
│  3. Service: `frontend/src/lib/services/newsData.ts`                   │
│     - `getLocalNotices(filterDongtan)`                                 │
│     - Checks Upstash Redis cache (TTL 3600s)                           │
│     - Deduplicates & sorts by date DESC                                │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          Backend API Layer                             │
│  - Endpoint: `GET /api/local-notices?dongtan=true|false`               │
│  - `frontend/src/app/api/local-notices/route.ts`                       │
│  - Rate Limiter (60 req/min), Cache-Control header                     │
│  - Standard Response Envelope: `apiSuccess(responseData)`              │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Presentation & UI Layer                         │
│  - SSR: `src/app/lounge/page.tsx` -> `LoungeContainerClient.tsx`       │
│  - Interactive Feeds: `LoungeFeedClient.tsx` (5 Subcategory Tabs)      │
│  - News Feed: `NewsClient.tsx`                                         │
│  - Macro Dashboard: `MacroDashboardClient.tsx` (Rail & Tram modules)  │
│  - Modal / Detail View & Proxy: `src/app/api/bypass-notice/route.ts`   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Comprehensive Analysis of Core Modules

### 3.1. Firestore Collection & Schema Definitions

#### Target Collection: `local_notices`
- Document ID convention:
  - `gosi_${originalId}` (e.g. `gosi_12345`)
  - `bbs_${originalId}` (e.g. `bbs_67890`)
  - `rail_${originalId}` (e.g. `rail_1131_101`)
  - `rail_1154_${originalId}` (e.g. `rail_1154_205`)
  - `dong_${deptCode}_${originalId}` (e.g. `dong_57700100000_301`)
  - `culture_luna_${YYYYMMDD}` / `culture_lecture_${dong}_${YYYYMMDD}`
  - `ai_report_gap_analysis_${YYYYMMDD}` / `ai_report_ltv_risk_${YYYYMMDD}`

#### Field Schema Matrix:
| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Unique composite document ID |
| `originalId` | `string` | Optional | Source bulletin board raw article number |
| `title` | `string` | Yes | Article headline |
| `url` | `string` | Yes | Full target URL or detail link |
| `dept` | `string` | Yes | Department / Dong identifier (e.g. '동탄1동', '철도전략과') |
| `date` | `string` | Yes | Publication date in `YYYY-MM-DD` |
| `isDongtan` | `boolean` | Yes | Flag indicating Dongtan regional relevance |
| `source` | `enum` | Yes | `'bbs'` \| `'gosi'` \| `'rail'` \| `'dong'` \| `'culture'` |
| `createdAt` | `string` | Optional | ISO timestamp of record insertion |
| `content` | `string` | Optional | Markdown-formatted analysis/summary body |

---

### 3.2. Detailed Analysis of Discrepancies & Deficiencies

#### Issue 1: Malformed Deduplication Logic in `newsData.ts` (Data Loss Bug)
- **Location**: `frontend/src/lib/services/newsData.ts:199-222`
- **Mechanism**:
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
- **Consequence**: When multiple events share a general portal URL (e.g., `https://reserve.hscity.go.kr/` for resident lectures, or `https://www.hscity.go.kr/...bbsCode=1019` for festivals), `urlToKey.has(urlKey)` is `true`. Because all scraped items have prefixed IDs (`culture_...`), the second and subsequent items are dropped. As a result, 8 out of 9 resident center lectures and all but the first Luna show festival disappear from API output!
- **Remedy**: Deduplication should only treat items as duplicate if BOTH `title` and `date` match, or if specific article query parameters in `url` match (not generic domain/index URLs).

---

#### Issue 2: Scraper Department Capture & Dong Filter Collapse
- **Location**: `frontend/scripts/fetch-local-notices.js:365` & `frontend/src/app/api/cron/sync-local-notices/route.ts:651`
- **Mechanism**:
  - For Source 4 (`BBS 1049` for Dongtan 1~9):
    ```ts
    const dept = $(tds[3]).text().trim();
    ```
    On the Hwaseong City Hall website, the 4th column (`dept`) is populated with organizational sub-teams such as "총무팀", "맞춤형복지담당", "관리자", rather than "동탄1동", "동탄2동", etc.
  - Furthermore:
    ```ts
    const isDongtan = checkIfDongtan(title, dept);
    if (isDongtan) { ... }
    ```
    Neighborhood notices (e.g. "2026년도 민방위 훈련 일정 안내") do not contain the word "동탄" in the title or dept, so they are dropped at crawl time.
  - In `LoungeFeedClient.tsx:721-724`:
    ```ts
    if (activeDongFilter !== 'all') {
      if (notice.dept !== activeDongFilter) return false;
    }
    ```
    Because `notice.dept` contains "총무팀" instead of "동탄1동", filtering by dong always returns 0 results.
- **Remedy**:
  1. In the scraper, for Source 4, assign `dept: deptItem.name` (e.g. `'동탄1동'`) so it is normalized.
  2. Set `isDongtan: true` unconditionally for all notices originating from the Dongtan dong boards (`57700100000` ~ `57700180000`).

---

#### Issue 3: Missing Enum Value in `fetch-local-notices.js`
- **Location**: `frontend/scripts/fetch-local-notices.js:25`
- **Code**:
  ```ts
  source: z.enum(['bbs', 'rail', 'dong', 'gosi'])
  ```
- **Discrepancy**: Canonical schema `noticeSchema` in `facade.schemas.ts` and `sync-local-notices/route.ts` includes `'culture'`. If `fetch-local-notices.js` ever processes or syncs culture notices, Zod validation will throw and drop the items.

---

#### Issue 4: Document ID Ordering & Firestore Query Starvation in `news.repository.ts`
- **Location**: `frontend/src/lib/repositories/news.repository.ts:41-45`
- **Mechanism**:
  ```ts
  let dongQuery = localDb.collection('local_notices').where('source', '==', 'dong');
  if (filterDongtan) {
    dongQuery = dongQuery.where('isDongtan', '==', true);
  }
  dongQuery = dongQuery.limit(400);
  ```
  In Firestore, querying without `.orderBy()` returns documents ordered by document ID ascending (`dong_57700100000_...`). Since Dongtan 1 is `57700100000` and Dongtan 9 is `57700180000`, the query retrieves all documents for Dongtan 1~5 before reaching Dongtan 6~9. If document volume exceeds 400, latter dongs are truncated.

---

#### Issue 5: Missing SSR Prop Forwarding to `LoungeFeedClient`
- **Location**: `frontend/src/components/LoungeContainerClient.tsx:592-594`
- **Code**:
  ```tsx
  {activeTab === 'notices' && (
    <LoungeFeedClient initialPosts={initialPosts} currentTab="동탄구 소식" />
  )}
  ```
- **Discrepancy**: `LoungeContainerClient` receives `initialNotices` via SSR from `LoungePage` (`src/app/lounge/page.tsx`), but fails to pass `initialNotices` into `LoungeFeedClient`. `LoungeFeedClientProps` does not declare `initialNotices`. Consequently, `LoungeFeedClient` initializes with `noticesData = []` and performs an unnecessary client-side fetch, causing layout shift and skeleton flash.

---

#### Issue 6: Domain Whitelist Blocking in `/api/bypass-notice`
- **Location**: `frontend/src/app/api/bypass-notice/route.ts:13-24`
- **Code**:
  ```ts
  const hostname = parsed.hostname;
  return hostname === 'hscity.go.kr' || hostname.endsWith('.hscity.go.kr');
  ```
- **Discrepancy**: Events from the Hwaseong Cultural Foundation use `https://www.hcf.or.kr` and internal AI reports link to `https://dongtanview.com`. When clicked, `bypass-notice` responds with 400 Bad Request.

---

#### Issue 7: Resilient Fallback System (R3)
- **Problem**: When Hwaseong City Hall website WAF blocks scraping or if Firestore is empty/unreachable, `newsData.ts` returns `{ notices: [], lastUpdated: null }`.
- **UI State**: Tabs `시정공고` (`city`), `교통·철도` (`rail`), and `동네행정` (`town`) display an empty box ("선택하신 조건에 해당하는 공지사항이 없습니다").
- **Solution Requirement**: Provide a high-fidelity static backup dataset (e.g. `public/data/local-notices-backup.json` or bundled in-memory backup in `newsData.ts`) covering all 5 categories with simulated recent dates and clear indicators, ensuring 100% UI uptime even during complete upstream network isolation.

---

## 4. Verification & Testing Strategy

1. **Unit & Integration Tests**:
   - Test `newsData.getLocalNotices` with mock duplicate URLs to ensure all culture and lecture events are preserved.
   - Test category filtering in `LoungeFeedClient` for all 5 subcategories (`all`, `city`, `rail`, `town`, `culture`).
   - Test dong sub-filtering under `town` category for each dong (`동탄1동` through `동탄9동`).
   - Test `/api/local-notices` response envelope and caching.
   - Test `/api/bypass-notice` with `hscity.go.kr`, `hcf.or.kr`, and `dongtanview.com`.
2. **End-to-End & Browser Tests**:
   - Verify `/lounge?tab=notices` renders without empty screens.
   - Verify card click behavior (culture opens modal, civic notices open bypass/origin).
   - Verify fallback rendering when API returns empty or fails.
