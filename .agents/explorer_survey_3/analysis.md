# Frontend UI and Client State Investigation Analysis: D-VIEW Lounge Administrative Notices

## 1. Executive Summary

This investigation analyzed the frontend rendering pipeline, client state management, sub-tab categorization, search/filtering, modal routing, and external link navigation for the **행정 고시공고 (Local Government & Administrative Notices)** tab in D-VIEW Lounge (`/lounge?tab=notices`).

### Key Findings at a Glance
1. **Hydration & State Disconnection**: `app/lounge/page.tsx` performs server-side fetching via `getLocalNotices(true)` and passes `initialNotices` to `LoungeContainerClient`. However, `LoungeContainerClient` **does not pass `initialNotices` to `LoungeFeedClient`**, because `LoungeFeedClientProps` only accepts `initialPosts` and `currentTab`. Consequently, `LoungeFeedClient` initializes its `noticesData` state to `[]` (empty array) and triggers a redundant client-side fetch. If that fetch is slow, unpopulated, or blocked, users experience a flash of empty state or a permanent blank notice list.
2. **Missing Outage/Empty DB Fallback**: `/api/local-notices` and `newsData.ts` return `{ notices: [], lastUpdated: null }` when Firestore is cold, empty, or uninitialized, with no static seed fallback data. Unlike the macro news tab (which falls back to rich static items), the notice tab renders an empty placeholder (`선택하신 조건에 해당하는 공지사항이 없습니다.`).
3. **Dual Modal & Routing Inconsistencies**: Both `LoungeContainerClient` (lines 598–674) and `LoungeFeedClient` (lines 1436–1571) contain full Notice Detail Modals responding to `?notice=ID` and `#notice=ID`. `LoungeContainerClient` links directly to `selectedNotice.url` without the `/api/bypass-notice` proxy, making users vulnerable to Hwaseong City Hall WAF referrer blocking. In contrast, `LoungeFeedClient` correctly routes through `/api/bypass-notice`.
4. **Hardcoded Mock Dates in UI**: `LoungeFeedClient.tsx` (line 191) calculates D-Day badges using a hardcoded static mock date (`const today = new Date('2026-06-07')`) rather than dynamic system time `new Date()`.
5. **No Shared Custom Hook**: Multiple components (`LoungeContainerClient`, `LoungeFeedClient`, `NewsClient`, `LocalEventCuration`, `MacroDashboardClient`) implement disparate fetch/SWR logic with divergent cache keys (`/api/local-notices` vs `/api/local-notices?dongtan=true`).

---

## 2. Component Hierarchy & Data Flow Architecture

```
app/lounge/page.tsx (Server Component)
 │
 ├── [SSR Fetch] Promise.all([ getRecentPosts(50), getMacroNews(40), getLocalNotices(true) ])
 │    └── Injects JSON-LD (Schema.org) & SEO sr-only structured items
 │
 └── <LoungeContainerClient> (Client Container)
      │ Props: { initialPosts, initialNews, initialNotices, searchParams }
      │ Top-level Segmented Tabs:
      │   ├─ 'talk'    -> <LoungeFeedClient currentTab="모든 이야기" /> + <LoungeComposeClient /> + Sidebar
      │   ├─ 'news'    -> Realtime News Feed (Subtabs: 테크노밸리 & 산업 / 부동산 & 정책)
      │   └─ 'notices' -> <LoungeFeedClient currentTab="동탄구 소식" />
      │
      └── <LoungeFeedClient> (Client Feed & Sub-tab Filtering)
           │ Internal State: noticesData (LocalNoticeItem[]), activeSubCategory, activeDongFilter
           │ Sub-Tabs:
           │   ├─ 'all'     (전체)
           │   ├─ 'city'    (시정공고) -> source === 'gosi' || source === 'bbs'
           │   ├─ 'rail'    (교통·철도) -> source === 'rail'
           │   ├─ 'town'    (동네행정) -> source === 'dong' + (동탄1동 ~ 동탄9동)
           │   └─ 'culture' (문화·행사) -> source === 'culture'
           │
           ├── <NoticeCard> (Regular Notice Card vs Culture/Lecture Card with D-Day & Actions)
           └── Notice Detail Modal (AI Markdown Viewer + Action Links + Kakao Share)
```

---

## 3. Detailed Technical Analysis of Subsystems

### 3.1 Tab Switching & Category Mapping Logic

| Sub-Category ID | Korean Label | Source Filter Criteria | Data Origin |
|---|---|---|---|
| `all` | 전체 | All items in `noticesData` | Combined Firestore & Local Events |
| `city` | 시정공고 | `notice.source === 'gosi' \|\| notice.source === 'bbs'` | Hwaseong City Hall BBS 1019 & Gosi BD_notice + AI Reports |
| `rail` | 교통·철도 | `notice.source === 'rail'` | Hwaseong Rail Project BBS 1131 & Dongtan Tram BBS 1154 |
| `town` | 동네행정 | `notice.source === 'dong'` (+ `notice.dept === activeDongFilter`) | Dongtan 1~9 Dong BBS 1049 |
| `culture` | 문화·행사 | `notice.source === 'culture'` | `public/data/local-events.json` + Generated Luna/Lectures |

#### Dong Filtering Sub-Tab (`town`)
- When `activeSubCategory === 'town'`, a secondary pill selector is displayed: `['all', '동탄1동', '동탄2동', '동탄3동', '동탄4동', '동탄5동', '동탄6동', '동탄7동', '동탄8동', '동탄9동']`.
- In `LoungeFeedClient.tsx` (lines 721–724):
  ```typescript
  if (activeDongFilter !== 'all') {
    if (notice.dept !== activeDongFilter) return false;
  }
  ```
- **Scraper / DB Dependency**: If `dept` in Firestore is stored as `"민원봉사팀"` or `"동탄1동장"` instead of `"동탄1동"`, clicking the `"동탄1동"` pill results in 0 matches. Scrapers and fallback data must guarantee `dept` is normalized to the exact string `"동탄N동"`.

---

### 3.2 Card Rendering & UI Types

`LoungeFeedClient.tsx` implements two distinct card visual layouts inside `<NoticeCard>`:

#### Type A: Culture & Lecture Card (`source === 'culture'`)
- **Lecture Cards (`[강좌]` in title)**:
  - Header: D-Day badge (`접수 D-X`, `접수 마감`, `접수 종료`), `주민센터 강좌` chip, registration open date.
  - Body: Stripped title (`title.replace(/\[강좌\]\s*/, '')`), description of resident center program benefits.
  - Footer: Fee info (`💵 수강료: 무료 ~ 3만원 선`), Organizer (`📍 주관: ${notice.dept} 주민센터`).
  - Action Buttons: `카카오톡 공유` (Yellow button) and `링크 복사` (Surface border button).
  - Click Action: Sets `window.location.hash = 'notice=' + notice.id`, opening the AI Markdown Modal.
- **Festival / Performance Cards (`[루나쇼]`, `[버스킹]`, `[축제]`)**:
  - Header: D-Day badge (`D-X`, `오늘 개최`, `종료됨`), Department chip (`동탄호수공원`, `여울공원 야외음악당`, etc.), Event date.
  - Body: Event title, lifestyle & spectator parking recommendation summary.
  - Footer: Fee (`무료`), Organizer.
  - Click Action: Opens the detail modal with rich guidance.

#### Type B: Administrative Notice Card (`bbs`, `gosi`, `rail`, `dong`)
- Header: Numbered badge (`idx + 1`), Department pill (`bg-emerald-500/10 text-emerald-600`), Date (`YYYY-MM-DD`), and `동탄` badge when `isDongtan === true`.
- Body: Title in bold typography with line truncation.
- Click Action: Direct external link via `<a href="/api/bypass-notice?url=${encodeURIComponent(notice.url)}" target="_blank" rel="noopener noreferrer">`.

---

### 3.3 Modal View & Deep-Linking Routing

- **Trigger Mechanisms**:
  1. Hash-based: `window.location.hash = '#notice=12345'`
  2. Query Param-based: `?notice=12345` (e.g. from Kakao shared links)
  3. Direct Hash Anchor: `#lounge-notices-rail` sets `activeSubCategory = 'rail'`, `#lounge-notices-culture` sets `activeSubCategory = 'culture'`.
- **Modal Content Presentation**:
  - If `notice.content` is present: `MarkdownViewer` renders Markdown headings, bold text, AI bullet points, and CTA conversion links (`AI 매도 적합성 계산기`, `전세율 대시보드`).
  - If `notice.content` is empty: Renders D-VIEW AI Insight box explaining the context and providing direct link to `/api/bypass-notice`.
- **Duplicate Modal Issue**: `LoungeContainerClient` renders an overlay modal when `noticeId` is in query params, while `LoungeFeedClient` renders its own modal when `selectedNoticeId` is populated. When visiting `/lounge?notice=xxx`, both components attempt to handle the notice modal simultaneously.

---

### 3.4 External Link Navigation & WAF Bypass Proxy

- **Mechanism**: `/api/bypass-notice?url=<encoded_url>`
  - Uses `no-referrer` meta header and HTTP refresh redirect.
  - Bypasses Hwaseong City Hall WAF anti-scraping and cross-domain referrer blocking.
  - Security check validates domain matches `hscity.go.kr` or `*.hscity.go.kr` using Zod `.refine()`.

---

### 3.5 Kakao Share & Clipboard Fallback

- **Function**: `shareLocalNoticeToKakao` in `lib/utils/kakaoShare.ts`
  - Validates payload with `ShareLocalNoticeParamsSchema`.
  - Distinguishes between AI reports (`type=event`, `ai_report_share`), Culture notices (`type=event`, `culture_share`), and Administrative notices (`type=notice`, `notice_share`).
  - Dynamically loads Kakao JavaScript SDK (`https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js`) with 5-second polling safeguard.
  - If SDK load fails (e.g., ad-blocker or offline), automatically executes fallback via `copyTextToClipboardDirect()` and prompts user with toast notification.
  - Dynamic OG image generated at `/api/og?type=notice&title=...&dept=...&date=...`.

---

## 4. Root Cause Analysis: Why Empty Screens Occur

| # | Root Cause | Impact | Specific Code Reference |
|---|---|---|---|
| 1 | **Prop Dropping**: `LoungeContainerClient` does not forward SSR `initialNotices` to `LoungeFeedClient`. | `LoungeFeedClient` starts with `noticesData = []`, requiring a second client fetch that flashes empty or stays blank if network fails. | `LoungeContainerClient.tsx:593`, `LoungeFeedClient.tsx:105, 343` |
| 2 | **No Static Seed Fallback in DB Service**: `newsData.ts` and `news.repository.ts` return `{ notices: [] }` on Firestore cold start, network timeout, or empty DB. | `/api/local-notices` returns empty array, leaving `city`, `rail`, `town` sub-tabs with 0 items. | `newsData.ts:192–194`, `news.repository.ts:22–24` |
| 3 | **Scraper Dept Discrepancies**: Non-normalized `dept` names from external HTML tables. | `activeDongFilter` strict equality check (`notice.dept !== activeDongFilter`) drops notices from dong sub-tabs. | `LoungeFeedClient.tsx:722`, `sync-local-notices/route.ts:667` |
| 4 | **Static Mock Date in D-Day Calculation**: `const today = new Date('2026-06-07')` in `LoungeFeedClient.tsx`. | D-Day badges calculate incorrectly relative to a fixed past date. | `LoungeFeedClient.tsx:191` |
| 5 | **Missing Bypass on Container Modal**: `LoungeContainerClient` modal uses `href={selectedNotice.url}` directly. | Users clicking source links from the container modal face WAF 403 Forbidden or referrer blocks. | `LoungeContainerClient.tsx:643, 657` |

---

## 5. Architectural Recommendations & Action Plan

### 5.1 Implement Unified `useLocalNotices` Custom Hook
Create `frontend/src/hooks/useLocalNotices.ts` encapsulating:
- SWR query with standardized cache key (`/api/local-notices?dongtan=true`).
- SSR `initialData` hydration.
- Offline/error fallback to bundled static notices dataset.

### 5.2 Prop Flow Normalization in `LoungeContainerClient` & `LoungeFeedClient`
- Update `LoungeFeedClientProps` to include `initialNotices?: LocalNoticeItem[]`.
- Pass `initialNotices` from `LoungeContainerClient`:
  ```tsx
  <LoungeFeedClient initialPosts={initialPosts} initialNotices={notices} currentTab="동탄구 소식" />
  ```
- Initialize `noticesData` state with `initialNotices || []` to prevent empty flashes.

### 5.3 Implement Resilient Seed Fallback in `newsData.ts` / `/api/local-notices`
- Embed a canonical fallback array containing verified notices for all 5 categories (`gosi`, `bbs`, `rail`, `dong` [1~9동], `culture`).
- When Firestore returns 0 items or throws a timeout exception, seamlessly return the seed fallback with `source: 'static_fallback'`.

### 5.4 Consolidate Modal Rendering & Normalize Links
- Remove duplicate modal in `LoungeContainerClient` or route it directly to the shared Notice Modal.
- Wrap all external source links in `/api/bypass-notice?url=${encodeURIComponent(url)}`.
- Replace hardcoded `'2026-06-07'` with dynamic `new Date()` in D-Day calculations.
