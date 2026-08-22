# Handoff Report — Hwaseong City Hall & Dongtan Notices Crawling/Parsing Survey

- **Agent**: Explorer Survey 1 (`explorer_survey_1`)
- **Parent ID**: `0a92a9d3-876b-4a1e-9ca3-3dbd776e18b4`
- **Date**: 2026-08-22
- **Milestone**: Survey & Investigation (R1 Crawling/Scraping/Batch pipeline)
- **Report File**: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\explorer_survey_1\handoff.md`
- **Analysis File**: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\explorer_survey_1\analysis.md`

---

## 1. Observation

Direct observations and evidence collected from code inspection and live endpoint probing:

1. **Gosi `BD_notice` Complete Data Loss**:
   - `fetch-local-notices.js` (lines 418-420) & `sync-local-notices/route.ts` (lines 723-725):
     ```javascript
     const onclick = aTag.attr('onclick') || '';
     const idMatch = onclick.match(/opGosiView\('([^']+)'\)/);
     if (!idMatch) return;
     ```
   - Live Hwaseong City Hall `BD_notice.do` markup verification (`node scratch/test-gosi-extraction.js`):
     - `aTag.attr('onclick')`: `undefined`
     - `aTag.attr('href')`: `"javascript:opGosiView('149229');"`
     - Onclick match count: `0`, Href match count: `10`.
     - Direct query to Firestore: `source: 'gosi'` has **0 documents**.

2. **BBS 1154 (동탄트램) 6-Column Parser Offset Bug**:
   - Live probing of `BD_selectBbsList.do?q_bbsCode=1154`:
     - Columns: `[순번(0), 첨부(1), 제목(2), 조회수(3), 담당부서(4), 등록일자(5)]`.
     - `sync-local-notices/route.ts` (lines 560-569) extracts `tds[3]` as dept (view count `119`) and `tds[4]` as date (`트램건설추진단`).
     - In `fetch-local-notices.js`, Zod regex `^\d{4}-\d{2}-\d{2}$` rejected `date = '트램건설추진단'`, dropping all tram notices.
     - In `sync-local-notices/route.ts`, it wrote `date: '트램건설추진단'` to Firestore.

3. **BBS 1049 (동탄 1~9동) Normalization & Filtering**:
   - Probing 9 dong codes (`57700100000` to `57700180000`) confirmed 10 notices per dong page.
   - `LoungeFeedClient.tsx` line 722 filters sub-dong notices with `notice.dept === activeDongFilter` (e.g. `'동탄1동'`).
   - Scrapers must guarantee `dept: deptItem.name` (`동탄1동` ~ `동탄9동`) and `isDongtan: true`.

4. **Schema & Feature Mismatch between Batch and API**:
   - `fetch-local-notices.js` line 25: `source: z.enum(['bbs', 'rail', 'dong', 'gosi'])` misses `'culture'`.
   - `fetch-local-notices.js` lacks `generateCultureEvents()` and `generateAIReports(TX_SUMMARY)`.

5. **Lack of Static Fallback Hydration**:
   - `/api/local-notices` and `newsData.ts` return `{ notices: [], lastUpdated: null }` if Firestore is empty or fails, causing empty tabs in the UI.

---

## 2. Logic Chain

1. **From Observation 1 (Gosi extraction)**: Checking `onclick` instead of `href` causes `idMatch` to be null on every row. Fixing the regex check to inspect `aTag.attr('href') || aTag.attr('onclick')` will immediately restore 100% extraction of `gosi` notices.
2. **From Observation 2 (Tram table offset)**: Since BBS 1154 has a 6th column (`조회수`), mapping `tds[2] -> title`, `tds[4] -> dept`, `tds[5] -> date` will restore proper date formatting (`YYYY-MM-DD`) and pass Zod regex validation.
3. **From Observation 3 (Dongtan 1~9 dong)**: Explicitly tagging `dept: deptItem.name` aligns crawled documents with `LoungeFeedClient.tsx`'s 9-dong tab filter (`동탄1동` ~ `동탄9동`), eliminating blank screens when users switch dong sub-filters.
4. **From Observation 4 (Batch/API parity)**: Updating `NoticeSchema` in `fetch-local-notices.js` to include `culture` and adding event generators ensures automated GitHub Actions runs keep culture and AI reports up to date in Firestore.
5. **From Observation 5 (Fallback architecture)**: Introducing a static fallback dataset (`public/data/local-notices-fallback.json` or fallback mechanism in `newsData.ts`) ensures that when external portals or databases fail, users still see rich, curated notices across all categories.

---

## 3. Caveats

- **Hwaseong Portal WAF Rate Limiting**: Sending too many concurrent requests to `hscity.go.kr` can trigger IP rate-limiting or 429/403 responses. All crawlers must retain sequential requests with slight delays (100–300ms) or rate limit controls.
- **Table Structure Changes**: If Hwaseong City Hall redesigns their board markup, static column indexing might shift again. Dynamic header searching (`headers.findIndex`) combined with explicit column fallbacks provides maximum resilience.
- **Composite Index in Firestore**: If `.orderBy('date', 'desc')` is added to compound queries in Firestore (`where('source', 'in', [...]).where('isDongtan', '==', true)`), a Firestore composite index must exist. If not, in-memory sorting with sufficient fetch limits or single-field range queries must be maintained.

---

## 4. Conclusion

The root causes for missing categories and empty screens in the administrative notice tab have been pinpointed with precision:
1. `gosi` notices failed due to extracting `opGosiView` from `onclick` instead of `href`.
2. `rail` tram notices failed due to 6-column offset indexing swapping `dept` and `date`.
3. `dong` notices suffered from potential keyword filtering omissions and unnormalized `dept` values.
4. `culture` notices were omitted from `fetch-local-notices.js` due to schema restrictions.
5. Absence of a static fallback dataset caused empty states when database or network was degraded.

All fixes are straightforward, fully backwards-compatible, and will normalize the entire flow across crawling, storage, API, and frontend presentation.

---

## 5. Verification Method

To independently verify these findings:
1. **Gosi Extraction Test**:
   ```bash
   node scratch/test-gosi-extraction.js
   ```
   *Expected result*: `onclick matches=0, href matches=10`.
2. **Dongtan 1~9 Dong Extraction Test**:
   ```bash
   node scratch/test-dongtan-boards.js
   ```
   *Expected result*: Confirms all 9 dong boards return valid 5-column HTML.
3. **Firestore Current State Query**:
   ```bash
   node scratch/test-firestore-sources.js
   ```
   *Expected result*: `source 'gosi': 0`, `source 'culture': 0`, `source 'rail': 81`, `source 'dong': 184`, `source 'bbs': 15`.
4. **Frontend Unit Tests**:
   ```bash
   npm test -- LoungeFeedClient.test.tsx --watchAll=false
   ```
   *Expected result*: 3 passing tests for Lounge notices and D-Day curation rendering.
