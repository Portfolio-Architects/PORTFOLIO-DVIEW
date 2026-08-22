# Original User Request

## Initial Request — 2026-08-22T03:47:05Z

You are the Project Orchestrator for this task.

Working Directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW
Your Metadata Directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\orchestrator_1
Original Request Path: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\ORIGINAL_REQUEST.md
Integrity Mode: demo

## Task Overview
Resolve data integration errors for Hwaseong City Hall and Dongtan area administrative network in D-VIEW Lounge (/lounge?tab=notices) '행정 고시공고' tab (시정공고, 교통·철도, 동네행정, 문화·행사), and normalize the entire flow from crawler/pipeline to frontend rendering and fallback handling.

## Requirements
R1. Crawling & Parsing Pipeline Normalization
- Fix scrapers for Hwaseong City Hall BBS 1019 (타기관 고시공고), BD_notice (화성시 고시공고), BBS 1131 (철도사업 추진현황), BBS 1154 (동탄트램 추진현황), BBS 1049 (동탄 1~9동 동별 공지사항) based on HTML structure and encoding.
- Ensure batch script `fetch-local-notices.js` and internal API `sync-local-notices/route.ts` parse data properly and populate Firestore `local_notices` and Redis cache.

R2. Lounge Admin Notice Tab & API Integration
- Validate `/api/local-notices` endpoint, repository layer (`news.repository.ts`, `newsData.ts`), and pass all categories (`gosi`, `bbs`, `rail`, `dong`, `culture`) to frontend.
- Fix `LoungeFeedClient.tsx` and `LoungeContainerClient.tsx` tab switching (`전체`, `시정공고`, `교통·철도`, `동네행정`, `문화·행사`) and Dongtan 1~9 sub-filtering so valid cards render without empty screens.

R3. Fallback System for Outages / Network Block / Empty DB
- Implement resilient fallback mechanism so if Hwaseong City Hall WAF blocks or times out or DB is empty, user sees up-to-date static backup data / guidance rather than blank screen.

## Acceptance Criteria
- Valid items extracted & pass Zod schema.
- Firestore & Redis loading runs without error.
- `/api/local-notices` returns JSON containing `rail`, `gosi`, `bbs`, `dong`, `culture`.
- All tabs and subcategories render cards properly.
- Card click opens source / modal / Kakao share correctly.
- Fallback data displays gracefully when external network fails.

Please maintain your plan.md, progress.md, and briefing in your metadata directory and report back when finished.
