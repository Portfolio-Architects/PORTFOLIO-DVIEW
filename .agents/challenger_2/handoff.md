# Tier 5 White-Box Adversarial Coverage Audit & Edge Case Discovery Report

## 1. Observation

Direct white-box codebase inspection and empirical testing executed on:
- `frontend/src/lib/services/newsData.ts`
- `frontend/src/app/api/local-notices/route.ts`
- `frontend/src/app/api/bypass-notice/route.ts`
- `frontend/src/components/LoungeFeedClient.tsx`
- `frontend/scripts/fetch-local-notices.js`

### Key Codebase Observations:
1. **Notice Detail Modal Omission in `LoungeFeedClient.tsx` (Lines 928-1051 & 1443-1570)**:
   - In `frontend/src/components/LoungeFeedClient.tsx` lines 928-930:
     ```typescript
     if (currentTab === '동탄구 소식') {
       return (
         <div className="flex flex-col gap-4 w-full">
           ...
         </div>
       );
     }
     ```
   - In `NoticeCard` (lines 218-226), clicking a Culture/AI notice sets `window.location.hash = 'notice=' + notice.id`.
   - `useEffect` (lines 533-545) matches the hash and executes `setSelectedNoticeId(noticeId)`.
   - However, the Notice Detail Modal JSX (`{selectedNoticeId && selectedNotice && (<LoungeModalBackdrop ...>}`) is located at **line 1443**, which is placed in the final talk-specific return block.
   - Because `currentTab === '동탄구 소식'` returns early at line 929, the modal is **never rendered** on the `동탄구 소식` (`행정 고시공고`) tab.

2. **Uninvoked Fallback Seed Dataset in `newsData.ts` & `local-notices/route.ts`**:
   - `frontend/src/lib/services/newsData.ts` defines `loadFallbackNotices()` at lines 181-201, reading from `public/data/local-notices-backup.json`.
   - In `newsData.ts` lines 222-224:
     ```typescript
     if (allItems.length === 0) {
       return { notices: [], lastUpdated: null };
     }
     ```
   - If Firestore returns 0 items or times out, `getLocalNotices` returns `{ notices: [], lastUpdated: null }` without calling `loadFallbackNotices()`.
   - In `frontend/src/app/api/local-notices/route.ts` line 4, `loadFallbackNotices` is imported but never invoked in `GET` or in the `catch` block (lines 50-60).

3. **Unhandled Rejection in Cache Write Path in `newsData.ts` (Line 301)**:
   - In `newsData.ts` line 301:
     ```typescript
     await NewsRepo.setCachedNotices(cacheKey, responseData);
     ```
   - This call is awaited directly without a local `try/catch`. If `setCachedNotices` throws or rejects, `getLocalNotices` jumps to the outer catch block (line 304) and returns `{ notices: [], lastUpdated: null }`, discarding already fetched and parsed Firestore notices.

4. **Security & Robustness Verification (`bypass-notice/route.ts` & `local-notices/route.ts`)**:
   - In `frontend/src/app/api/bypass-notice/route.ts`:
     - SSRF/Open-redirect whitelist (`ALLOWED_DOMAINS`) strictly enforces `.hscity.go.kr`, `.hcf.or.kr`, `.dongtanview.com`, `.gyeonggi.go.kr`, `.gg.go.kr`, `.lh.or.kr`, `.molit.go.kr`, `.korea.kr`.
     - Tested 12 malicious injection payloads (IP spoofing, scheme injection `javascript:`, `data:`, `file:`, subdomain attacks) -> 100% intercepted and rejected with HTTP 400.
     - HTML output sanitization uses `escapeHtml()` on meta refresh attributes and `encodeURIComponent()` inside inline `<script nonce="${nonce}">`, preventing attribute and script tag breakouts.
   - In `frontend/src/app/api/local-notices/route.ts`:
     - Query fuzzing across 9 adversarial variants (`?dongtan=false`, `?dongtan=`, `?dongtan=%00`, `?dongtan=invalid`, etc.) safely handled with Zod preprocessor.
     - Dual envelope serialization verified (both `json.data.notices` and top-level `json.notices` available).

---

## 2. Logic Chain

1. **Modal Inaccessibility Logic**:
   - Given: `NoticeCard` sets `window.location.hash = 'notice=' + notice.id` when clicked in `동탄구 소식` feed.
   - Given: `LoungeFeedClient` has an early return block for `currentTab === '동탄구 소식'` (lines 928-1051).
   - Given: The Notice Detail Modal JSX is placed exclusively after line 1053 (line 1443).
   - Therefore: Clicking a Culture or AI notice card on the `동탄구 소식` tab never displays the detail modal.

2. **Fallback Gap Logic**:
   - Given: `PROJECT.md` specifies a resilient fallback mechanism guaranteeing 0% blank screens during DB outages or empty states.
   - Given: `loadFallbackNotices()` exists and successfully loads `local-notices-backup.json`.
   - Given: Neither `newsData.getLocalNotices()` nor `/api/local-notices/route.ts` calls `loadFallbackNotices()` when `allItems.length === 0` or in catch blocks.
   - Therefore: Under a database outage or cold empty collection, the system serves an empty list instead of the static fallback dataset.

3. **Cache Failure Logic**:
   - Given: `await NewsRepo.setCachedNotices(...)` on line 301 is inside the main `try` block of `getLocalNotices`.
   - Given: Outer `catch` block returns `{ notices: [], lastUpdated: null }`.
   - Therefore: Any failure during cache write drops all valid Firestore notices and returns empty data to the caller.

---

## 3. Caveats

- **External Network Dependency**: Live scraping of Hwaseong City Hall website is subject to target server availability and WAF IP throttling.
- **Repository-Level Error Suppression**: `news.repository.ts` internally suppresses `redis.set` errors via `.catch()`, but adding a defensive `try/catch` at the service layer in `newsData.ts` guarantees absolute resilience regardless of mock/transport layer behavior.

---

## 4. Conclusion & Actionable Verdict

### Explicit Verdict: `REQUEST_CHANGES` (Minor Remediation Required)

While core parsers, rate limiting, and security controls are robust (136/136 tests passing across test suites), the following 3 remediation items must be addressed before final signoff:

1. **Remediation 1 (`LoungeFeedClient.tsx`)**:
   - Include `{selectedNoticeId && selectedNotice && (<LoungeModalBackdrop ...>)}` inside the `if (currentTab === '동탄구 소식')` return JSX (or move modal rendering to a shared return wrapper) so clicking notice cards opens the modal in the admin notice tab.
2. **Remediation 2 (`newsData.ts` & `local-notices/route.ts`)**:
   - In `newsData.getLocalNotices()`, when `allItems.length === 0` or when Firestore throws, invoke `loadFallbackNotices()` to return static backup data with `fromFallback: true`.
3. **Remediation 3 (`newsData.ts`)**:
   - Wrap `await NewsRepo.setCachedNotices(cacheKey, responseData)` in a local `try/catch` block so Redis write hiccups never fail the user request.

---

## 5. Verification Method

To independently reproduce and verify these findings:

```bash
# 1. Run Tier 5 Adversarial Coverage Test Suite (41 tests)
cd frontend && npx jest src/__tests__/m5_tier5_adversarial_challenge.test.tsx

# 2. Run Comprehensive E2E Test Suite (95 tests)
cd frontend && npx jest src/__tests__/local-notices-e2e.test.tsx

# 3. Run Combined Suite (136 total tests)
cd frontend && npx jest src/__tests__/local-notices-e2e.test.tsx src/__tests__/m5_tier5_adversarial_challenge.test.tsx
```

All 136 tests executed and passed. Test `4.5` in `m5_tier5_adversarial_challenge.test.tsx` empirically verifies the Notice Modal omission gap under `currentTab="동탄구 소식"`. Test `1.2b` empirically verifies the cache write drop behavior.
