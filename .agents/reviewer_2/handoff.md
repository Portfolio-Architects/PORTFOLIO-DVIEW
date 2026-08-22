# Quality & Adversarial Review Report: Milestones M1-M4

**Reviewer**: Reviewer 2 (Reviewer & Adversarial Critic)  
**Target**: Milestones M1, M2, M3, M4 (Hwaseong & Dongtan Administrative Notice Data Normalization)  
**Verdict**: **APPROVE**  
**Date**: 2026-08-22

---

## 1. Executive Summary & Verdict

- **Final Verdict**: **APPROVE**
- **Overall Risk Assessment**: **LOW**
- **Integrity Assessment**: **PASS** (No hardcoded test outputs, no facade shortcuts, genuine parsing/repository/caching/fallback implementations)
- **Test Pass Rate**: 100% (95/95 E2E tests in `src/__tests__/local-notices-e2e.test.tsx`, 3/3 in `src/components/LoungeFeedClient.test.tsx`, 0 failures)

The implementation across Milestones M1, M2, M3, and M4 satisfies all functional, architectural, and security requirements defined in `PROJECT.md` and `ORIGINAL_REQUEST.md`. Data pipeline scraping, Zod schema validation, backend repository and caching layers, SSR prop forwarding, UI filtering, D-Day computation, anti-WAF proxy redirection, and static fallback mechanisms are fully implemented, robustly resilient against network outages, and verified.

---

## 2. 5-Component Review & Evidence Chain

### 1. Observation

Direct code inspections and test executions confirmed the following:

1. **Milestone M1 (Scraper & Parser Pipeline Normalization)**:
   - `frontend/scripts/fetch-local-notices.js` & `frontend/src/app/api/cron/sync-local-notices/route.ts`:
     - Zod schema (`NoticeSchema` / `noticeItemSchema`) enforces `id`, `originalId`, `title`, `url` (valid URL), `dept`, `date` (`^\d{4}-\d{2}-\d{2}$`), `isDongtan`, `source` (`'bbs' | 'gosi' | 'rail' | 'dong' | 'culture'`), `createdAt`, and optional `content`.
     - **BBS 1154 (동탄트램)**: Parses 6-column table headers dynamically, extracts department (`tds[4]` or `tds[3]`) and date (`tds[5]` or `tds[4]`), with regex date matching `/\d{4}-\d{2}-\d{2}/` and fallback department `'트램건설추진단'`.
     - **BBS 1049 (동탄 1~9동)**: Scrapes all 9 distinct department codes (`57700100000` through `57700180000`), standardizes department names (`동탄1동`~`동탄9동`), and sets `isDongtan: true`.
     - **Gosi (`BD_notice`)**: Parses `opGosiView('...')` from both `href` and `onclick` attributes and formats canonical URL `https://www.hscity.go.kr/www/gosi/BD_selectNoticeDetail.do?q_notAncmtMgtNo=${originalId}`.
     - **Culture & AI Generation**: `generateCultureEvents()` generates recurring Luna Fountain Show and Busking fixtures; `generateAIReports()` analyzes `TX_SUMMARY` to generate 전세가율 stability reports with structured Markdown.

2. **Milestone M2 (Backend API & Repository Layer)**:
   - `frontend/src/lib/services/newsData.ts`:
     - Deduplication logic uses compound key `${title}_${date}` and URL index mapping.
     - `isGenericUrl` guard prevents distinct events sharing root/base URLs (`/`, `/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1019`) from being dropped.
     - Sorting orders items primarily by `date` DESC and secondarily by `id` DESC.
     - Safe error handling: Redis read/write errors are caught and logged without aborting; Firestore outages return `{ notices: [], lastUpdated: null }`.
   - `frontend/src/lib/repositories/news.repository.ts`:
     - Queries `local_notices` with `where('isDongtan', '==', true)` and limits.
     - Wraps Firestore queries in `withTimeout` (5s in production, 10s in dev).
   - `frontend/src/app/api/local-notices/route.ts`:
     - Rate-limited endpoint returning `Cache-Control: public, s-maxage=600, stale-while-revalidate=300`.
     - Error handler returns safe JSON envelope (`source: 'fallback_error'`).
   - `frontend/src/app/api/bypass-notice/route.ts`:
     - Protocol restriction (`http:`, `https:` only).
     - Whitelist validation (`ALLOWED_DOMAINS` matching hostname or `.domain` suffix).
     - HTML special character escaping (`escapeHtml`) preventing reflected XSS in meta refresh tag.
     - Safe JS redirection via `decodeURIComponent("${encodeURIComponent(targetUrl)}")`.

3. **Milestone M3 (Frontend Rendering & UI State)**:
   - `frontend/src/app/lounge/page.tsx`:
     - Fetches `getLocalNotices(true)` in parallel with posts and news during SSR.
     - Forwards `initialNotices` to `LoungeContainerClient`.
   - `frontend/src/components/LoungeContainerClient.tsx`:
     - Initializes SWR with `fallbackData: initialNotices`.
     - Forwards `initialNotices` to `LoungeFeedClient`.
     - Handles `searchParams.tab === 'notices'` and modal opening via `searchParams.notice`.
   - `frontend/src/components/LoungeFeedClient.tsx`:
     - State `noticesData` initialized synchronously with `initialNotices`.
     - Dynamic D-Day calculation (`getDDayText`) computes real-time time-until-event from current `new Date()`.
     - Sub-category filtering: `all` (전체), `city` (시정공고: gosi/bbs), `rail` (교통·철도: rail), `town` (동네행정: dong), `culture` (문화·행사: culture).
     - Under `town`, renders Dongtan 1~9 dong filter chips.
     - Detail modal supports Markdown rendering via `MarkdownViewer`, external WAF bypass links, and Kakao SDK / clipboard share.

4. **Milestone M4 (Resilient Fallback System)**:
   - `frontend/public/data/local-notices-backup.json`: Contains 23 verified backup records covering all 5 categories (`gosi`, `bbs`, `rail`, `dong` 1~9동, `culture`).
   - In-memory and local-events fallback ensures 0% blank screens during external network failures or cold-start empty DB states.

---

### 2. Logic Chain

1. **Parser Resilience (M1)**: By querying table column headers dynamically and applying regex fallbacks on date extraction, markup variations between Hwaseong City Hall BBS boards (5-column vs 6-column) are normalized without runtime exceptions.
2. **Data Integrity & Deduplication (M2)**: Compound `${title}_${date}` hashing eliminates duplicates while `isGenericUrl` ensures independent cultural events and lectures sharing the booking portal root URL are preserved.
3. **SSR & Hydration Fluidity (M3)**: Passing `initialNotices` from Next.js server component to client state eliminates the loading skeleton flash and guarantees immediate SEO indexability.
4. **Security Hardening (M2)**: Whitelisting authorized civic domains (`hscity.go.kr`, `hcf.or.kr`, `dongtanview.com`, etc.) and escaping HTML prevents open redirect and reflected XSS attacks on `/api/bypass-notice`.
5. **Zero Blank Screen Guarantee (M4)**: Combining static backup datasets, SWR fallback data, and friendly empty-state UI handlers guarantees seamless user experience regardless of Firestore connectivity or external WAF blocking.

---

### 3. Caveats & Edge Cases Analyzed

1. **Upstream HTML Redesign Risk**:
   - *Risk*: If Hwaseong City Hall completely overhauls its markup (e.g. from table layout to div-based SPA).
   - *Mitigation*: The scraper includes try-catch per page, logs structured errors, sends administrator email alerts via `sendMail`, and the frontend seamlessly degrades to `local-notices-backup.json`.
2. **Client-Side Kakao SDK Availability**:
   - *Risk*: Kakao JS SDK may fail to initialize in offline or strict ad-blocker environments.
   - *Mitigation*: `shareLocalNoticeToKakao` catches exceptions and gracefully falls back to clipboard URL copy with a toast notification.
3. **Timer Handle Polyfill in JSDOM**:
   - *Observation*: JSDOM logs a `MessagePort` open handle from React 18 Scheduler during test teardown.
   - *Assessment*: Standard test environment behavior; `--forceExit` closes worker cleanly. No application-level memory leaks detected in production code.

---

### 4. Conclusion

All features across Milestones M1, M2, M3, and M4 have been thoroughly verified against functional specifications, edge cases, security constraints, and data integrity standards.

- **Verdict**: **APPROVE**

---

### 5. Verification Method

To independently verify the test suite:

```bash
# 1. Run local notices E2E test suite (95 tests)
cd frontend && npx jest src/__tests__/local-notices-e2e.test.tsx --watchAll=false --forceExit

# 2. Run LoungeFeedClient unit tests (3 tests)
cd frontend && npx jest src/components/LoungeFeedClient.test.tsx --watchAll=false

# 3. Run combined test verification
cd frontend && npx jest src/__tests__/local-notices-e2e.test.tsx src/components/LoungeFeedClient.test.tsx --watchAll=false --forceExit
```
