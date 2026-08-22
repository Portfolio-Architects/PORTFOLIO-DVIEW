# [D-VIEW] Hwaseong City Hall & Dongtan Administrative Notices Crawling/Parsing Pipeline Analysis

**Investigation Date**: 2026-08-22  
**Target Scope**: Hwaseong City Hall administrative network notices crawler, scrapers (BBS 1019, BD_notice, BBS 1131, BBS 1154, BBS 1049 Dongtan 1~9), batch scripts (`fetch-local-notices.js`), sync routes (`sync-local-notices/route.ts`), repository & data layer (`news.repository.ts`, `newsData.ts`), API endpoints (`/api/local-notices`, `/api/bypass-notice`), and UI client rendering (`LoungeFeedClient.tsx`, `LoungeContainerClient.tsx`).

---

## 1. Executive Summary & Architecture Flow

The D-VIEW local administrative notice pipeline automates the ingestion, normalization, indexing, and presentation of municipal notices, transportation updates, district-level administrative news, and cultural events across the Dongtan new town region.

### End-to-End Data Pipeline Architecture

```
                                  [ External Targets ]
  ┌─────────────────────────────────┬─────────────────────────────────┬───────────────────────────────┐
  │ Hwaseong BBS 1019 (타기관공고)   │ Hwaseong BD_notice (시정고시공고) │ Hwaseong BBS 1131 (철도사업)   │
  │ Hwaseong BBS 1154 (트램추진현황) │ Hwaseong BBS 1049 (동탄1~9동)     │ D-VIEW Hyperlocal Culture Gen │
  └─────────────────────────────────┴─────────────────────────────────┴───────────────────────────────┘
                                                  │
                                                  ▼
                        ┌──────────────────────────────────────────────────┐
                        │   Ingestion & Scraping Pipeline (Cheerio/Fetch)  │
                        │   - scripts/fetch-local-notices.js (Batch CLI)   │
                        │   - api/cron/sync-local-notices/route.ts (Cron)  │
                        └──────────────────────────────────────────────────┘
                                                  │
                                      [ Zod Schema Validation ]
                                                  │
                                                  ▼
                         ┌────────────────────────────────────────────────┐
                         │              Storage & Caching Layer           │
                         │   1. Firestore (`local_notices` collection)    │
                         │   2. Redis Cache (`DTDLS:cache:localNotices:*`)│
                         │   3. Static Fallback (`local-events.json` etc) │
                         └────────────────────────────────────────────────┘
                                                  │
                                                  ▼
                         ┌────────────────────────────────────────────────┐
                         │             Repository & Service Layer         │
                         │   - news.repository.ts (Firestore / Redis I/O) │
                         │   - newsData.ts (De-duplication & Ordering)    │
                         └────────────────────────────────────────────────┘
                                                  │
                                                  ▼
                         ┌────────────────────────────────────────────────┐
                         │                  API Layer                     │
                         │   - GET /api/local-notices                     │
                         │   - GET /api/bypass-notice                     │
                         └────────────────────────────────────────────────┘
                                                  │
                                                  ▼
                         ┌────────────────────────────────────────────────┐
                         │               Frontend Presentation            │
                         │   - LoungeContainerClient.tsx (Tab Router)     │
                         │   - LoungeFeedClient.tsx (Notice / Dong Filter)│
                         │   - LocalEventCuration.tsx (Hyperlocal Cards)  │
                         └────────────────────────────────────────────────┘
```

---

## 2. In-Depth Source & Scraper Markup Investigation

We conducted live DOM and HTTP inspections against all official Hwaseong City Hall endpoints. The findings for each source are detailed below:

### 2.1. Source 1: 타기관 고시공고 (BBS 1019)
- **URL**: `https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1019`
- **HTTP Status / Encoding**: `200 OK`, `Content-Type: text/html;charset=UTF-8`
- **Table Structure**: 5 Columns:
  1. `tds[0]`: 순번 (`originalId`, e.g. `12655`)
  2. `tds[1]`: 첨부 파일 아이콘 / 공란
  3. `tds[2]`: 제목 (`title`, containing `<a href="/www/user/bbs/BD_selectBbs.do?q_bbsCode=1019&q_bbscttSn=...">`)
  4. `tds[3]`: 담당부서 (`dept`, e.g. `평생학습과`)
  5. `tds[4]`: 등록일자 (`date`, `YYYY-MM-DD`, e.g. `2026-08-20`)
- **ID & Source Convention**: `id: bbs_${originalId}`, `source: 'bbs'`
- **Filtering Logic**: Evaluated via `checkIfDongtan(title, dept)` against `DONGTAN_KEYWORDS`.

### 2.2. Source 2: 화성시 공식 고시공고 (Gosi BD_notice) — **CRITICAL DEFECT IDENTIFIED**
- **URL**: `https://www.hscity.go.kr/www/gosi/BD_notice.do?q_currPage=${page}&q_cp=${page}`
- **Table Structure**: 5 Columns:
  1. `tds[0]`: 고시공고번호 (e.g. `화성시 고시 제2026-725호`)
  2. `tds[1]`: 제목 (`title`, containing `<a href="javascript:opGosiView('149229');">...</a>`)
  3. `tds[2]`: 담당부서 (`dept`, e.g. `보건정책과`)
  4. `tds[3]`: 게재(공고)일자 (`date`, `YYYY-MM-DD`, e.g. `2026-08-20`)
  5. `tds[4]`: 게재기간
- **Root Cause of Extraction Failure**:
  - Both `fetch-local-notices.js` (line 418) and `sync-local-notices/route.ts` (line 723) execute:
    ```javascript
    const onclick = aTag.attr('onclick') || '';
    const idMatch = onclick.match(/opGosiView\('([^']+)'\)/);
    if (!idMatch) return;
    ```
  - **Direct Empirical Proof**: In the actual Hwaseong City Hall markup, `opGosiView('149229')` is in the `href` attribute (`<a href="javascript:opGosiView('149229');">`), while `aTag.attr('onclick')` is `undefined`.
  - **Result**: `idMatch` is `null`, triggering immediate `return`. **100% of Gosi notices were dropped**, resulting in **0 records** in Firestore for `source: 'gosi'`.
- **Required Fix**:
  ```javascript
  const onclick = aTag.attr('onclick') || '';
  const href = aTag.attr('href') || '';
  const rawTarget = `${onclick} ${href}`;
  const idMatch = rawTarget.match(/opGosiView\('([^']+)'\)/);
  if (!idMatch) return;
  const originalId = idMatch[1];
  const absoluteUrl = `https://www.hscity.go.kr/www/gosi/BD_selectNoticeDetail.do?q_notAncmtMgtNo=${originalId}`;
  ```

### 2.3. Source 3: 철도사업 추진현황 (BBS 1131)
- **URL**: `https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1131`
- **Table Structure**: 5 Columns:
  1. `tds[0]`: 순번 (`originalId`, e.g. `13`)
  2. `tds[1]`: 첨부 파일 아이콘 / 공란
  3. `tds[2]`: 제목 (`title`, e.g. `삼성~동탄 광역급행철도(GTX-A) 추진현황`)
  4. `tds[3]`: 담당부서 (`dept`, e.g. `철도전략과`)
  5. `tds[4]`: 등록일자 (`date`, `YYYY-MM-DD`, e.g. `2026-06-05`)
- **ID & Source Convention**: `id: rail_${originalId}`, `source: 'rail'`, `dept: dept || '철도전략과'`, `isDongtan: true`.

### 2.4. Source 5: 동탄트램 추진현황 (BBS 1154) — **CRITICAL DEFECT IDENTIFIED**
- **URL**: `https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1154`
- **Table Structure**: **6 Columns** (Distinct from 5-column boards):
  1. `tds[0]`: 순번 (`84`)
  2. `tds[1]`: 첨부 파일 아이콘 / 공란
  3. `tds[2]`: 제목 (`동탄트램 추진현황(2026년 8월 3주)`)
  4. `tds[3]`: **조회수** (`119`) ⚠️
  5. `tds[4]`: **담당부서** (`트램건설추진단`) ⚠️
  6. `tds[5]`: **등록일자** (`2026-08-21`) ⚠️
- **Root Cause of Parser Defect**:
  - `sync-local-notices/route.ts` lines 560-569 hardcoded 5-column indices:
    ```javascript
    const dept = $(tds[3]).text().trim(); // Extracted '119' (view count)
    const date = $(tds[4]).text().trim(); // Extracted '트램건설추진단' (dept name)
    ```
  - **Impact**:
    1. In `fetch-local-notices.js`: Zod schema `date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` failed validation on `'트램건설추진단'`, dropping all tram notices.
    2. In `sync-local-notices/route.ts`: It wrote `date: '트램건설추진단'` to Firestore, corrupting sorting and rendering.
- **Required Fix**:
  - Implement dynamic header index detection or handle 6-column tables explicitly:
    ```javascript
    // For 6-column table:
    // If tds.length >= 6: tds[2] = title, tds[4] = dept, tds[5] = date
    // Or dynamic header search: titleIdx = headers.findIndex(h => h.includes('제목')), deptIdx = headers.findIndex(h => h.includes('부서')), dateIdx = headers.findIndex(h => h.includes('등록') || h.includes('일자'))
    ```

### 2.5. Source 4: 동탄 1~9동 동별 공지사항 (BBS 1049)
- **URL**: `https://www.hscity.go.kr/dongtan/user/bbs/BD_selectBbsList.do?q_bbsCode=1049&q_deptCode=${code}`
- **Dept Codes**:
  - `57700100000`: 동탄1동
  - `57700110000`: 동탄2동
  - `57700120000`: 동탄3동
  - `57700130000`: 동탄4동
  - `57700140000`: 동탄5동
  - `57700150000`: 동탄6동
  - `57700160000`: 동탄7동
  - `57700170000`: 동탄8동
  - `57700180000`: 동탄9동
- **Table Structure**: 5 Columns (`[순번, 첨부, 제목, 담당부서, 등록일자]`).
- **Normalization Need**:
  - In `LoungeFeedClient.tsx`, sub-filtering for dong notices filters by `activeDongFilter` (`동탄1동`, `동탄2동`, ..., `동탄9동`).
  - Scraper must ensure `dept: deptItem.name` (or `parsedDept.includes('동탄') ? parsedDept : deptItem.name`), `isDongtan: true`, `source: 'dong'`, and ID format `dong_${deptItem.code}_${originalId}`.

---

## 3. Discrepancy & Gap Matrix: `fetch-local-notices.js` vs `sync-local-notices/route.ts`

| Feature / Property | `scripts/fetch-local-notices.js` | `api/cron/sync-local-notices/route.ts` | Discrepancy / Risk |
|---|---|---|---|
| **Zod Schema `source` Enum** | `['bbs', 'rail', 'dong', 'gosi']` (Missing `'culture'`) | `['bbs', 'gosi', 'rail', 'dong', 'culture']` | `fetch-local-notices.js` rejects any culture notices |
| **Culture Event Generation** | ❌ Not implemented | ✅ `generateCultureEvents()` implemented | GitHub Actions batch script does not ingest culture data |
| **AI Market Report Generation** | ❌ Not implemented | ✅ `generateAIReports(TX_SUMMARY)` | GitHub Actions batch script does not ingest AI reports |
| **BBS 1154 (Tram) Column Handling** | Dynamic headers attempted, but fragile | Hardcoded 5 columns (`tds[3]` dept, `tds[4]` date) | Corrupted date / Zod validation failure |
| **Gosi (`BD_notice`) ID Extraction** | Only `onclick.match(...)` | Only `onclick.match(...)` | 100% data loss (opGosiView is in `href`) |
| **BBS 1049 Dong Filtering** | Uses `checkIfDongtan(title, dept)` | Uses `checkIfDongtan(title, dept)` | May omit notices lacking dong keywords |
| **Timeout Configuration** | 5000ms | 3000ms | 3000ms may trigger timeout on slow portal responses |
| **Redis Cache Invalidation** | Invalidates `DTDLS:cache:localNotices:filterDongtan:*` | Invalidates `DTDLS:cache:localNotices:filterDongtan:*` | Consistent |
| **WAF Protection / Cooldown** | None (CLI) | 30s development cooldown + rate limiter | API protected from rapid dev reload locks |

---

## 4. Storage, Repository, & API Analysis

### 4.1. Firestore Current Data Distribution
Live inspection via Firestore REST API revealed:
- `source: 'bbs'`: 15 documents
- `source: 'gosi'`: **0 documents** (due to `onclick` vs `href` bug)
- `source: 'rail'`: 81 documents
- `source: 'dong'`: 184 documents
- `source: 'culture'`: **0 documents** in Firestore (only exists in static/runtime)

### 4.2. Repository (`news.repository.ts`) & Service (`newsData.ts`) Layer
- **Query Pattern**:
  ```typescript
  let cityQuery = localDb.collection('local_notices').where('source', 'in', ['gosi', 'bbs']);
  let railQuery = localDb.collection('local_notices').where('source', '==', 'rail');
  let cultureQuery = localDb.collection('local_notices').where('source', '==', 'culture');
  let dongQuery = localDb.collection('local_notices').where('source', '==', 'dong');
  ```
- **Sorting & Limits**:
  - `cityQuery.limit(150)`, `railQuery.limit(150)`, `cultureQuery.limit(150)`, `dongQuery.limit(400)`.
  - In-memory sorting: `b.date.localeCompare(a.date)` in `getTopN`.
  - **Observation**: If records exceed the limit, without `.orderBy('date', 'desc')` in Firestore, Firestore returns docs ordered by Document ID, potentially cutting off newer records.
- **De-duplication**:
  - De-duplicates by `${title}_${date}` and `urlKey`.
  - Prefers prefixed document IDs (`bbs_`, `gosi_`, `dong_`, `rail_`).

### 4.3. API Endpoint (`/api/local-notices`)
- Query Schema: `dongtan=true|false`.
- Cache Header: `Cache-Control: public, s-maxage=600, stale-while-revalidate=300`.
- Failure Mode: Returns `{ notices: [], lastUpdated: null }` if database fails or is empty.

### 4.4. Security Redirect (`/api/bypass-notice`)
- Validates URL: `hscity.go.kr` domain restriction.
- Features: `<meta name="referrer" content="no-referrer" />` and `<meta http-equiv="refresh" />` with JS fallback, preventing government portal WAF referrer blocks.

---

## 5. Frontend Client Architecture & Tab Rendering Analysis

### 5.1. Tab Navigation & State Machine
1. **Lounge Top-Level Tabs** (`LoungeContainerClient.tsx`):
   - `talk` (커뮤니티)
   - `news` (실시간 뉴스)
   - `notices` (행정 고시공고) -> Renders `<LoungeFeedClient currentTab="동탄구 소식" />`

2. **Notice Sub-Category Filtering** (`LoungeFeedClient.tsx`):
   - `all` (전체): Renders all sources (`gosi`, `bbs`, `rail`, `dong`, `culture`).
   - `city` (시정공고): `source === 'gosi' || source === 'bbs'`.
   - `rail` (교통·철도): `source === 'rail'`.
   - `town` (동네행정): `source === 'dong'`. Activates 2nd-level dong pill filters (`동탄1동` ~ `동탄9동`).
   - `culture` (문화·행사): `source === 'culture'`.

### 5.2. Card Rendering & Interaction
- **Culture Cards**: Renders D-Day badges (`D-Day`, `D-X`, `접수 D-X`, `종료됨`), price/department badges, and interactive buttons ("카카오톡 공유", "링크 복사"). Clicking opens the detail modal or external site.
- **Regular Notice Cards**: Renders index badge, department, title, and date. Clicking redirects to `/api/bypass-notice?url=...`.
- **AI Report Cards**: Renders Markdown report inside detail modal with direct links to value calculators and gap investment dashboard.

---

## 6. Comprehensive Recommendations for Implementation (R1, R2, R3)

### R1. Crawling & Parsing Pipeline Normalization
1. **Fix Source 2 (Gosi `BD_notice`)**:
   - Inspect both `href` and `onclick` for `opGosiView('...')`. Construct `https://www.hscity.go.kr/www/gosi/BD_selectNoticeDetail.do?q_notAncmtMgtNo=${originalId}`.
2. **Fix Source 5 (BBS 1154 Tram)**:
   - Handle 6-column structure: extract `tds[2]` as title, `tds[4]` as dept (`트램건설추진단`), `tds[5]` as date.
3. **Normalize Source 4 (BBS 1049 Dong notices)**:
   - Always set `isDongtan = true`, set `dept = deptItem.name` (e.g. `동탄1동`), and extract link cleanly.
4. **Unify `fetch-local-notices.js` and `sync-local-notices/route.ts`**:
   - Update `NoticeSchema` in `fetch-local-notices.js` to allow `z.enum(['bbs', 'gosi', 'rail', 'dong', 'culture'])`.
   - Include `generateCultureEvents()` and `generateAIReports(TX_SUMMARY)` in `fetch-local-notices.js`.

### R2. Repository & Lounge API Tab Integration
1. **Pass All 5 Categories to Frontend**:
   - Ensure `/api/local-notices` returns items across `gosi`, `bbs`, `rail`, `dong`, `culture`.
2. **Tab & Sub-filter Robustness**:
   - In `LoungeFeedClient.tsx`, verify that selecting `시정공고`, `교통·철도`, `동네행정` (with any of 동탄 1~9동), and `문화·행사` displays non-empty, properly styled cards.

### R3. Resilient Fallback System
1. **Static Fallback Dataset**:
   - Create a static fallback file (e.g. `public/data/local-notices-fallback.json` or fallback loader in `newsData.ts`) containing curated notices across all categories (`gosi`, `rail`, `dong 1~9동`, `culture`).
2. **Tiered Fallback Flow**:
   - `Redis Cache` -> `Firestore DB` -> `Static Backup JSON` -> `Graceful Guidance UI`.
   - If external network or Firestore fails, the API gracefully hydrates from the fallback JSON, preventing empty screens.
