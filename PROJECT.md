# Project: Hwaseong & Dongtan Administrative Network Data Integration & Normalization

## Architecture
- **Crawling & Batch Sync Pipeline**:
  - `frontend/scripts/fetch-local-notices.js`: Node.js standalone batch script run via cron / GitHub Actions.
  - `frontend/src/app/api/cron/sync-local-notices/route.ts`: Next.js Route Handler for on-demand & scheduled crawl synchronization.
  - Data sources:
    1. Hwaseong City Hall BD_notice (`gosi`: 화성시 고시공고)
    2. Hwaseong City Hall BBS 1019 (`bbs`: 타기관 고시공고)
    3. Hwaseong City Hall BBS 1131 (`rail`: 철도사업 추진현황)
    4. Hwaseong City Hall BBS 1154 (`rail`: 동탄트램 추진현황)
    5. Hwaseong City Hall BBS 1049 (`dong`: 동탄 1~9동 동별 공지사항)
    6. Culture / Civic Events & AI Reports (`culture`)
- **Backend Data & API Layer**:
  - `frontend/src/lib/repositories/news.repository.ts`: Raw Firestore repository for `local_notices` collection.
  - `frontend/src/lib/services/newsData.ts`: Service layer providing caching, deduplication, fallback, and category aggregation.
  - `frontend/src/app/api/local-notices/route.ts`: Public GET API returning categorized notices (`rail`, `gosi`, `bbs`, `dong`, `culture`).
  - `frontend/src/app/api/bypass-notice/route.ts`: Anti-WAF proxy route for opening notices safely.
- **Frontend UI & State Layer**:
  - `frontend/src/app/lounge/page.tsx`: SSR page loading initial notices via `getLocalNotices(true)`.
  - `frontend/src/components/LoungeContainerClient.tsx`: Top-level lounge client component holding tab states and forwarding SSR props.
  - `frontend/src/components/LoungeFeedClient.tsx`: Notice feed client component with tab switching (`전체`, `시정공고`, `교통·철도`, `동네행정`, `문화·행사`), Dongtan 1~9 dong filtering, modal viewer, and Kakao share.
- **Resilient Fallback System**:
  - `frontend/public/data/local-notices-backup.json`: Static fallback seed dataset.
  - In-memory fallback provider in `newsData.ts` and `local-notices/route.ts` guaranteeing 0% blank screens during network/DB outages.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Gosi `BD_notice` Extraction Fix | Parse `href="javascript:opGosiView(...)"` as well as `onclick` to extract 100% of Hwaseong gosi items. | M1 | Survey (Explorer 1) |
| 2 | BBS 1154 (동탄트램) 6-Column Alignment | Fix column index mapping for BBS 1154 so `dept` is `담당부서` and `date` is `등록일자` (YYYY-MM-DD), passing Zod regex validation. | M1 | Survey (Explorer 1) |
| 3 | BBS 1049 (동탄 1~9동) Normalization | Normalize `dept` to standardized dong names (`동탄1동`~`동탄9동`) and mark `isDongtan: true` for all 9 boards. | M1 | Survey (Explorer 1, 2) |
| 4 | Batch Script Schema & Culture Parity | Update `fetch-local-notices.js` Zod schema to include `'culture'` in `source` enum and generate culture & AI summaries. | M1 | Survey (Explorer 1, 2) |
| 5 | Deduplication Logic Fix in `newsData.ts` | Fix URL collision bug where generic base URLs caused unrelated culture/lecture notices to be dropped. | M2 | Survey (Explorer 2) |
| 6 | `/api/local-notices` & Repository Integration | Verify Firestore `local_notices` query, Redis caching, and category payload containing `rail`, `gosi`, `bbs`, `dong`, `culture`. | M2 | Survey (Explorer 2) |
| 7 | Anti-WAF Bypass Proxy Whitelist Expansion | Expand allowed domains in `/api/bypass-notice` to include `hcf.or.kr`, `dongtanview.com`, and related civic subdomains. | M2 | Survey (Explorer 2) |
| 8 | SSR Prop Hydration in Lounge Clients | Forward `initialNotices` from `page.tsx` through `LoungeContainerClient.tsx` into `LoungeFeedClient.tsx`. | M3 | Survey (Explorer 3) |
| 9 | Category & Dongtan 1~9 Filtering Normalization | Fix tab switching (`전체`, `시정공고`, `교통·철도`, `동네행정`, `문화·행사`) and Dongtan 1~9 sub-filtering in `LoungeFeedClient.tsx`. | M3 | Survey (Explorer 3) |
| 10 | Dynamic D-Day & Modal / Kakao Share Fix | Replace hardcoded `'2026-06-07'` D-Day reference with dynamic current date; unify modal link routing and Kakao share. | M3 | Survey (Explorer 3) |
| 11 | Static Fallback Data & Graceful Degradation | Build static backup dataset in `public/data/local-notices-backup.json` and fallback resolution in `newsData.ts` when DB is empty / network down. | M4 | Survey (Explorer 1, 2, 3) |
| 12 | End-to-End Verification & Adversarial Coverage | Verify 100% E2E test suite (Tiers 1-4) and Tier 5 adversarial tests across crawlers, API, UI, and fallback. | M5 | User Request / Project Pattern |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Crawling & Parsing Pipeline Normalization | Fix scrapers for BBS 1019, BD_notice, BBS 1131, BBS 1154, BBS 1049, update `fetch-local-notices.js` and `sync-local-notices/route.ts`, normalize Zod schemas. | none | DONE |
| M2 | Repository & Backend API Layer | Fix deduplication in `newsData.ts`, expand `/api/bypass-notice` domain whitelist, normalize `/api/local-notices` response format with Redis/Firestore. | M1 | DONE |
| M3 | Frontend Rendering & Tab Integration | Fix SSR prop hydration in `LoungeContainerClient` / `LoungeFeedClient`, normalize sub-category and Dong 1~9 filtering, fix D-Day calculation and modal/Kakao share. | M2 | DONE |
| M4 | Resilient Fallback System | Implement static backup dataset (`public/data/local-notices-backup.json`) and fallback resolution in `newsData.ts` & `/api/local-notices`. | M2 | DONE |
| M5 | Final Milestone (E2E Test Pass & Adversarial Hardening) | Phase 1: 100% pass of E2E Test Suite (Tiers 1-4). Phase 2: Adversarial Coverage Hardening (Tier 5) with Challenger. | M1, M2, M3, M4, Test Suite | DONE |

---

## Interface Contracts

### Crawler -> Firestore `local_notices`
```typescript
interface LocalNoticeDocument {
  id: string; // e.g. 'gosi_149229', 'rail_1154_123', 'dong_57700100000_456', 'bbs_1019_789', 'culture_101'
  title: string;
  url: string;
  link?: string; // alias for url
  date: string; // YYYY-MM-DD
  dept: string; // Standardized dong name ('동탄1동'~'동탄9동') or department name ('트램건설추진단')
  category: 'gosi' | 'bbs' | 'rail' | 'dong' | 'culture';
  source: 'gosi' | 'bbs' | 'rail' | 'dong' | 'culture';
  isDongtan: boolean;
  viewCount?: number;
  originalId?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
```

### Backend API `/api/local-notices` -> Frontend
```typescript
interface LocalNoticesResponse {
  notices?: LocalNoticeItem[]; // Flat array of all notices
  categorized?: {
    gosi: LocalNoticeItem[];
    bbs: LocalNoticeItem[];
    rail: LocalNoticeItem[];
    dong: LocalNoticeItem[];
    culture: LocalNoticeItem[];
  };
  lastUpdated: string | null;
  fromCache?: boolean;
  fromFallback?: boolean;
  total?: number;
}
```

---

## Code Layout
- `frontend/scripts/fetch-local-notices.js` — Batch scraper script (M1)
- `frontend/src/app/api/cron/sync-local-notices/route.ts` — Internal crawler sync route (M1)
- `frontend/src/lib/services/newsData.ts` — Service layer with deduplication & fallback (M2, M4)
- `frontend/src/lib/repositories/news.repository.ts` — Firestore repository (M2)
- `frontend/src/app/api/local-notices/route.ts` — Public notices API (M2, M4)
- `frontend/src/app/api/bypass-notice/route.ts` — Anti-WAF proxy route (M2)
- `frontend/src/components/LoungeContainerClient.tsx` — SSR container client (M3)
- `frontend/src/components/LoungeFeedClient.tsx` — Lounge notices feed client (M3)
- `frontend/public/data/local-notices-backup.json` — Static backup dataset (M4)
- `frontend/tests/e2e/` — E2E test suite (E2E Testing Track)
