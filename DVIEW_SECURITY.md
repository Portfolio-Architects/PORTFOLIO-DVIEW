# DVIEW Security Policy & Production Hardening Specification

> **상위 SSOT 및 상호 참조**
> - **대상 서비스**: 디뷰 (DVIEW · [https://dongtanview.com](https://dongtanview.com))
> - **준수 표준**: [`DVIEW_AGENT.md`](./DVIEW_AGENT.md) · [`DVIEW_DESIGN.md`](./DVIEW_DESIGN.md) · [`.agent/rules/DVIEW_DRSP.md`](./.agent/rules/DVIEW_DRSP.md) · [`.agent/rules/DVIEW_strict-real-data-only.md`](./.agent/rules/DVIEW_strict-real-data-only.md)
> - **연계 리포트 및 실패 지식**: [`DVIEW_PORTFOLIO DVIEW - Engineering Report.md`](./DVIEW_PORTFOLIO%20DVIEW%20-%20Engineering%20Report.md) · [`docs/adsense-approval-report.md`](./docs/adsense-approval-report.md) · [`docs/firebase-custom-auth-domain.md`](./docs/firebase-custom-auth-domain.md) · [`DEAD_ENDS.md`](./DEAD_ENDS.md)

본 문서는 디뷰(DVIEW) 프로덕션 환경의 데이터베이스 권한 제어, 미들웨어·인증 경계, 공공 API 및 서비스 계정 시크릿 격리, 그리고 Google AdSense 게시자 정책 컴플라이언스 아키텍처를 정의하는 보안 단일 진실 공급원(SSOT)입니다.

---

## 1. 지원 버전 및 보안 취약점 제보 절차 (Supported Versions & Vulnerability Disclosure)

### 1.1 보안 업데이트 지원 범위

| 버전 / 브랜치 | 아키텍처 기준 | 보안 패치 지원 여부 | 비고 |
|:---|:---|:---:|:---|
| **`master` (v5.1 Production)** | Next.js 16 App Router · React 19 · Ad Money v5.1 | **지원 (Active)** | `https://dongtanview.com` 현행 프로덕션 브랜치 |
| `v5.0.x` | Ad Money v5.0 초기 전환 빌드 | 미지원 (Deprecated) | v5.1 단일 브랜치로 통합 완료 |
| `< v5.0` | 레거시 아키텍처 및 구버전 어드민 빌드 | 미지원 (End-of-Life) | 보안 표면 축소 및 모듈화로 폐기 |

### 1.2 취약점 제보 채널 및 처리 원칙

1. **비공개 제보 원칙**: 인증 우회, 데이터베이스 권한 노출, 시크릿 유출, XSS/CSRF/SSRF 등 보안 취약점을 발견한 경우 공개 이슈나 커뮤니티 라운지(`/lounge`)에 게시하지 않고 아래 공식 채널로 비공개 제보합니다.
   - **보안 및 개인정보 보호 담당 이메일**: `ocs5672@gmail.com` ([`frontend/src/app/privacy/page.tsx`](./frontend/src/app/privacy/page.tsx) 제7조 개인정보 보호책임자 기준)
   - **웹 고객지원 채널**: `/contact` ([`frontend/src/app/contact/page.tsx`](./frontend/src/app/contact/page.tsx))
2. **대응 SLA**:
   - **접수 확인 및 초기 분류**: 영업일 기준 **48시간 이내** 회신
   - **치명적(Critical/High) 취약점 핫픽스**: 재현 확인 후 **7일 이내** 서버·규칙 패치 배포 및 시크릿 로테이션 수행
   - **사후 기록**: 재발 방지가 필요한 구조적 취약점 및 실패 패턴은 [`DEAD_ENDS.md`](./DEAD_ENDS.md)에 비식별화하여 등재합니다.

---

## 2. Firebase Security Rules 최소 권한 통제 (`firestore.rules` & `storage.rules`)

클라이언트 SDK에서 직접 접근 가능한 Firebase 리소스는 [`firebase.json`](./firebase.json)에 연결된 [`firestore.rules`](./firestore.rules) 및 [`storage.rules`](./storage.rules)를 통해 경로별 최소 권한(Least Privilege) 원칙으로 통제합니다.

### 2.1 Cloud Firestore 권한 매트릭스 ([`firestore.rules`](./firestore.rules))

> **핵심 설계 원칙 (No Global Read Wildcard)**: Firestore Security Rules는 복수의 `match` 블록이 일치할 때 논리합(`OR`)으로 권한을 평가하므로, 루트 와일드카드(`/{document=**}`)에 공개 읽기를 부여하지 않고 공개 조회 대상 컬렉션만 명시적으로 화이트리스트 지정합니다.

| 컬렉션 경로 | Read 권한 | Create 권한 | Update / Delete 권한 | 핵심 보안 불변식 |
|:---|:---|:---|:---|:---|
| `/users/{userId}` | 본인(`uid == userId`) 또는 `admin` | 본인 또는 `admin` | 본인 또는 `admin` | 타 사용자 프로필 열람·변조 원천 차단 |
| `/field_reports/{reportId}` · `/scoutingReports/{reportId}` | 전체 공개 (`true`) | 인증 사용자 (`auth != null`, `authorUid` 일치 검증) | 작성자(`authorUid`)·`admin`, 또는 카운터 정수 증감(`±1`) 단독 변경만 허용 | `hasOnly(['commentCount', 'views', 'viewCount', 'likes'])` + `isValidCounterField`(`int >= 0`, `Δ ∈ [-1, 1]`) 검증 |
| `/field_reports/{reportId}/comments/{commentId}` | 전체 공개 (`true`) | 인증 사용자 (`auth != null`, `authorUid` 일치 검증) | 작성자(`authorUid`) 또는 `admin` | 댓글 작성자 본인 사칭 방지 및 타인 수정·삭제 차단 |
| `/user_reviews/{reviewId}` · `/reviews/{reviewId}` | 전체 공개 (`true`) | 인증 사용자 (`auth != null`, `authorUid` 일치 검증) | 작성자(`authorUid`)·`admin`, 또는 `likes` 정수 증감(`±1`)만 허용 | 단지 리뷰 소유권 및 `authorUid` 일치 강제 |
| `/adInquiries/{inquiryId}` · `/ad_inquiries/{inquiryId}` | `token.admin == true` 전용 | 전체 공개 (`true`, 필드 수·문자열 길이 검증) | `token.admin == true` 전용 | 고객·광고 문의 내역의 외부 열람 원천 차단 (Write-Only Intake) |
| `/pending_photos/{photoId}` · `/sell_diagnosis_logs/{logId}` | `token.admin == true` 전용 | 클라이언트 단방향 접수 (Firebase Storage HTTPS URL·필드 수·길이 제한) | `token.admin == true` 전용 | 임의 외부·스크립트 URL 주입 및 제보 내역 외부 열람 차단 (Write-Only Queue) |
| `/transactions/*` · `/transactionSync/*` · `/apartments/*` · `/settings/*` · `/local_notices/*` · `/daily_stats/**` · `/favoriteCounts/*` | 전체 공개 (`true`) | `token.admin == true` (`favoriteCounts`는 `count` 정수 증감 허용) | `token.admin == true` (`favoriteCounts`는 `isValidCounterField` 허용) | 실거래·단지 메타 등 공공 데이터 클라이언트 임의 변조 차단 |
| `/{document=**}` (기본 차단 폴백) | `token.admin == true` 전용 | `token.admin == true` 전용 | `token.admin == true` 전용 | `board_posts`(`authorTokenHash`), `push_subscriptions`, `subscriptions`, `ad_clicks` 등 서버 전용 컬렉션 클라이언트 직접 조회·쓰기 전면 차단 |

### 2.2 Cloud Storage 권한 매트릭스 ([`storage.rules`](./storage.rules))

- **사용자 소유 버킷 경로** (`/profiles/{uid}/{fileName}`, `/reports/{uid}/{fileName}`, `/posts/{uid}/{fileName}`, `/reviews/{uid}/{fileName}`): 공개 읽기(`allow read: if true`)를 허용하되, 생성·수정은 본인 세션(`request.auth.uid == uid`)이면서 **`image/(jpeg|jpg|png|webp|gif|avif|heic|heif)` 래스터 이미지 MIME 화이트리스트(`image/svg+xml` 차단) 및 `0B < size <= 10MB`(`isValidImageUpload()`)** 조건을 충족할 때만 허용합니다.
- **서비스 업로드 폴더 경로** (`/field_reports/{fileName}`, `/user_reviews/{fileName}`, `/user_pending_photos/{fileName}` — [`storage.service.ts`](./frontend/src/lib/services/storage.service.ts)): 공개 읽기 및 `isValidImageUpload()`(래스터 이미지 화이트리스트, `<= 10MB`) 기반 단방향 생성만 허용(`/field_reports`·`/user_reviews`는 `isSignedIn()` 필수, 비인증 제보 경로 `/user_pending_photos` 포함 전 구간 `image/svg+xml` Stored XSS 원천 차단)하며, 덮어쓰기·삭제는 `token.admin == true` 관리자로 제한합니다.
- **미정의 경로 기본 차단 (`/{allPaths=**}`)**: 명시되지 않은 모든 스토리지 경로는 읽기·쓰기 모두 `request.auth.token.admin == true` 관리자 클레임 보유 세션으로만 제한합니다.
- **서버 트랜잭션 무결성**: 서버 사이드 다중 문서 상태 변경 시 반드시 `runTransaction` 또는 `writeBatch`를 사용하며, `updateDoc` 호출 시 `.withConverter()`가 결합되지 않은 순수 `DocumentReference`만 사용합니다 ([`DVIEW_AGENT.md`](./DVIEW_AGENT.md) §3.3).

---

## 3. 관리자 표면 제거, 미들웨어 방어 및 인증 경계 (Edge Security & Auth Boundaries)

### 3.1 공개 익명 서비스 전환 및 관리자 라우트 표면 원천 제거 (Zero-Admin-Surface)

- 과거 운영되던 웹 관리자 페이지(`/admin/*`)와 클라이언트 `AdminGuard` UI 컴포넌트는 무차별 대입 공격 및 클라이언트 라우팅 우회 표면을 원천 제거하기 위해 폐기되었습니다.
- 현행 [`frontend/src/lib/config/admin.config.ts`](./frontend/src/lib/config/admin.config.ts)는 퍼블릭 익명 서비스 모드로 중립화(`ADMIN_EMAILS = []`, `isAdmin() === false`)되어 있으며, 모든 관리자급 데이터 적재·수정은 서버 전용 Firebase Admin SDK([`frontend/src/lib/firebaseAdmin.ts`](./frontend/src/lib/firebaseAdmin.ts)) 및 로컬 MCP(`firebase-mcp`)를 통해서만 수행됩니다.
- **관리자 기기 내부 트래픽·광고 오클릭 원천 배제 ([`frontend/src/lib/utils/adminExclusion.ts`](./frontend/src/lib/utils/adminExclusion.ts))**:
  - `<head>` 동기 프리하이드레이션 가드 스크립트(`buildPreHydrationAdminGuardScript`)가 `gtag.js` 초기화 이전에 실행되어 `?dview_admin=1|0|status` 토글을 처리하고, `dview_is_admin` 쿠키·스토리지 및 `window['ga-disable-<GA_ID>'] = true` 플래그를 즉시 설정한 뒤 쿼리 파라미터를 URL에서 제거합니다.
  - 서버 사이드 광고 클릭 수집 엔드포인트([`frontend/src/app/api/ads/click/route.ts`](./frontend/src/app/api/ads/click/route.ts)) 역시 `isRequestFromExcludedAdmin(request)`를 검증하여 운영자 기기에서 발생한 이벤트를 Firestore `ad_clicks` 적재 대상에서 즉시 제외(`admin_excluded`)합니다.

### 3.2 HTTP 보안 헤더, Edge 프록시·SSRF 방어 및 분산 Rate Limiting ([`frontend/next.config.ts`](./frontend/next.config.ts) & [`frontend/src/proxy.ts`](./frontend/src/proxy.ts))

1. **전 구간 HTTP 보안 헤더 강제 (`next.config.ts` `headers()` `/:path*` + `proxy.ts`)**:
   - `Content-Security-Policy`: 허용된 스크립트·프레임·커넥트 도메인 화이트리스트 강제, `object-src 'none'`, `base-uri 'self' https://dongtanview.com`, `frame-ancestors` 애드센스 미리보기 도메인 한정 허용, `upgrade-insecure-requests` 적용
   - `Strict-Transport-Security`: `max-age=31536000; includeSubDomains; preload` (전 구간 HTTPS 강제)
   - `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`
   - `Cross-Origin-Opener-Policy: same-origin-allow-popups` (Spectre 격리 및 Firebase OAuth 팝업 호환 보장 — 커스텀 인증 도메인 설계는 [`docs/firebase-custom-auth-domain.md`](./docs/firebase-custom-auth-domain.md) 참조)
2. **선택적 Edge 프록시 매처, 엄격한 `Origin` 호스트 검증 및 분산 Rate Limit**:
   - `proxy.ts`의 `config.matcher`(`/?tab=imjang`, `/api/bypass-notice`)는 정적 ISR 상세 페이지 조회 시 불필요한 서버리스 CPU 기동을 배제하도록 최소화되어 있으며, API 요청에 `Origin` 헤더가 존재할 때 `new URL(origin).hostname`이 허용 도메인(`dongtanview.com`, `dview.kr`, `vercel.app`, Google/AdSense 도메인 등)과 정확히 일치하지 않으면(`Referer` 쿼리 위장 우회 불허) 즉시 `403 Forbidden`을 반환합니다.
   - 개별 `/api/*` 라우트의 `checkRateLimit`([`frontend/src/lib/api/rateLimiter.ts`](./frontend/src/lib/api/rateLimiter.ts)) 및 Upstash Redis 슬라이딩 윈도우(`DTDLS:ratelimit`) 가드로 비정상 봇 트래픽에 `429 Too Many Requests`를 응답합니다.
   - 이미지 프록시([`frontend/src/app/api/proxy-image/route.ts`](./frontend/src/app/api/proxy-image/route.ts))는 `https:` 표준 포트(`443`) 전용 강제, 사설·루프백·클라우드 메타데이터 IP(`127.0.0.0/8`, `10.0.0.0/8`, `169.254.169.254`, `::1` 등) 및 내부 `/api/*` 재귀 프록시 차단, 허용 이미지 도메인 화이트리스트, 리다이렉트 차단(`redirect: 'error'`), 8종 래스터 이미지 MIME(`image/(jpeg|jpg|png|webp|gif|avif|heic|heif)`, `10MB` 스트리밍 상한) 검증 및 `Content-Security-Policy: default-src 'none'; sandbox` 헤더로 SSRF·메모리 고갈 및 Stored/Reflected XSS를 원천 차단합니다.

### 3.3 Cron 배치·세션 쿠키·익명 커뮤니티 인증 경계

- **배치 Cron·푸시 엔드포인트 인가 ([`frontend/src/app/api/cron/sync-transactions/route.ts`](./frontend/src/app/api/cron/sync-transactions/route.ts), [`sync-local-notices/route.ts`](./frontend/src/app/api/cron/sync-local-notices/route.ts), [`send-tx-notifications/route.ts`](./frontend/src/app/api/cron/send-tx-notifications/route.ts), [`frontend/src/app/api/push/notify-new-high/route.ts`](./frontend/src/app/api/push/notify-new-high/route.ts))**: 프로덕션 환경에서 `Authorization: Bearer ${CRON_SECRET}` 또는 `x-building-api-key` 헤더를 검증하고 `NODE_ENV === 'production'`에서 `Host: localhost` 위장을 차단하며, 미인가 호출은 `401 Unauthorized`로 즉시 거부합니다.
- **서버 세션 검증 ([`frontend/src/lib/authUtils.ts`](./frontend/src/lib/authUtils.ts))**: `__Secure-DVIEW-Session` HttpOnly 보안 쿠키를 최우선 검증하며, 60초 주기로 Firebase 토큰 폐기 여부(`verifySessionCookie(..., true)`)와 Zod `DecodedTokenSchema` 무결성을 확인합니다.
- **익명 라운지 작성자 해시 및 위치정보 비저장 원칙 ([`frontend/src/lib/board/boardAuth.ts`](./frontend/src/lib/board/boardAuth.ts))**: 라운지 게시글·댓글 소유권은 256비트 암호학적 난수(`crypto.randomBytes(32)`) 원본을 서버 DB에 저장하지 않고 단방향 SHA-256 해시(`authorTokenHash`) 및 상수 시간 비교(`crypto.timingSafeEqual`)로만 대조하며, 동탄 거주지 GPS 인증 시 위·경도 원본 좌표는 법정동 판정 즉시 메모리에서 파기하여 영구 저장하지 않습니다.

---

## 4. 공공 API 키 및 서버 시크릿 환경변수 격리 (API Key & Secret Isolation)

### 4.1 서버 전용 시크릿 vs 클라이언트 공개 환경변수 분리 원칙

| 구분 | 환경변수 식별자 | 허용 실행 컨텍스트 | 보안 통제 수칙 |
|:---|:---|:---|:---|
| **공공·금융 OpenAPI 시크릿** | `BUILDING_API_KEY`, `PUBLIC_DATA_PORTAL_KEY`, `ECOS_API_KEY` | Node.js 서버 런타임 / GitHub Actions 전용 | `NEXT_PUBLIC_` 접두사 부여 절대 금지. 브라우저 직접 호출 차단 |
| **Firebase·Google 서비스 계정** | `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_ADMIN_PRIVATE_KEY`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` | 서버 전용 ([`frontend/src/lib/firebaseAdmin.ts`](./frontend/src/lib/firebaseAdmin.ts)) 및 로컬 MCP | Zod `FirebaseAdminCredentialsSchema` 검증 후 `preferRest: true` 초기화 |
| **인프라·배치·푸시 비밀키** | `CRON_SECRET`, `UPSTASH_REDIS_REST_TOKEN`, `VAPID_PRIVATE_KEY`, `VERCEL_DEPLOY_HOOK_URL` | 서버 API 라우트 / 배포 파이프라인 전용 | 클라이언트 번들 import 금지 및 로그 마스킹 유지 |
| **클라이언트 공개 식별자** | `NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_ADSENSE_CLIENT_ID`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | 브라우저 + SSR 공용 ([`frontend/.env.example`](./frontend/.env.example)) | Google Cloud / Firebase 콘솔에서 HTTP Referrer(`dongtanview.com/*`) 및 App Check 도메인 제한 적용 |

### 4.2 클라이언트 번들 유출 원천 차단 및 Git 시크릿 위생

1. **번들러 서버 모듈 알리아스 격리 ([`frontend/next.config.ts`](./frontend/next.config.ts))**:
   - `serverExternalPackages`에 `firebase-admin`, `google-auth-library` 등을 격리하고, Turbopack(`turbopack.resolveAlias`) 및 Webpack(`!isServer` alias)에서 `@/lib/firebaseAdmin`을 빈 스텁 모듈인 [`frontend/src/lib/firebaseAdmin.client.ts`](./frontend/src/lib/firebaseAdmin.client.ts)로 강제 치환하여 서버 인증 로직이 브라우저 번들에 포함되는 현상을 원천 차단합니다.
   - 프로덕션 빌드에서 `productionBrowserSourceMaps: false`를 강제하여 클라이언트 소스맵 역공학을 차단합니다.
2. **저장소 시크릿 커밋 차단 ([`.gitignore`](./.gitignore) & [`frontend/.gitignore`](./frontend/.gitignore))**:
   - `.env*`(`!.env.example` 제외), `serviceAccountKey.json`, `portfolio-dtdls-firebase-adminsdk-*.json`, `*.pem` 파일은 Git 추적에서 영구 배제하며, 로컬 개발 시 `frontend/.env.local`, CI/CD 실행 시 [`.github/workflows/sync-transactions.yml`](./.github/workflows/sync-transactions.yml)의 GitHub Encrypted Secrets 및 Vercel 환경변수만 사용합니다.

---

## 5. Google AdSense 게시자 정책 및 컴플라이언스 (Publisher Policy Compliance)

구글 애드센스 수익 극대화 목적함수($\text{Max }\mathcal{Y}_{\text{AdSense}}$)가 계정 정지나 정책 위반으로 훼손되지 않도록 다음 4대 게시자 정책 가드레일을 상시 강제합니다 (상세 실측은 [`docs/adsense-approval-report.md`](./docs/adsense-approval-report.md) 참조).

1. **공식 판매자 인증 및 크롤러 투명성 ([`frontend/public/ads.txt`](./frontend/public/ads.txt) & [`frontend/src/app/robots.ts`](./frontend/src/app/robots.ts))**:
   - 루트 `/ads.txt`에 공식 게시자 레코드(`google.com, pub-1103228112872356, DIRECT, f08c47fec0942fa0`)를 서빙하여 인벤토리 위변조(Spoofing)를 방지합니다.
   - `robots.ts`에서 `Mediapartners-Google` 봇에 전체 공개 라우트(`/`) 접근을 전면 허용하되, 내부 관리용 엔드포인트(`/api/cron/`, `/api/ads/`, `/api/push/`, `/api/indexing/`)는 색인 대상에서 명시적으로 제외합니다.
2. **무효 트래픽(IVT) 및 우발적 오클릭 방어**:
   - 모든 광고 슬롯(`AdSlot`)은 포맷별 사전 높이 예약([`frontend/src/components/ads/core/adSlotGeometry.ts`](./frontend/src/components/ads/core/adSlotGeometry.ts), `min-h-[140px]`, `min-h-[250px]`, `min-h-[90px]`)으로 레이아웃 밀림에 의한 오클릭($\text{CLS} < 0.001$)을 원천 차단합니다.
   - MRC 유효 노출 표준(`>= 50%` 면적 가시성 및 `>= 1,000ms` 연속 체류 — [`frontend/src/components/ads/core/useAdSlotViewability.ts`](./frontend/src/components/ads/core/useAdSlotViewability.ts)) 충족 시에만 유효 노출을 계측하며, CPA 폴백 전환 이후 뒤늦게 도착한 지연 광고 응답(`late-fill`)은 [`frontend/src/components/ads/core/useInsDomInterceptor.ts`](./frontend/src/components/ads/core/useInsDomInterceptor.ts)에서 즉시 폐기하여 화면 겹침을 방지합니다.
   - 모바일 스티키 앵커 슬롯은 데스크톱 뷰포트 송출을 차단하고 하단 내비게이션 독과 안전 간격을 유지하며, 내부 가이드 프리뷰 클릭(`GUIDE_PREVIEW_CLICK`)과 운영자 기기 클릭(`admin_excluded`)을 광고 클릭 집계에서 엄격히 분리합니다.
3. **클로킹(Cloaking) 금지 및 비색인·심사 모드 보호**:
   - SSR 시맨틱 본문에 `sr-only`, `opacity-0`, `invisible`, `hidden`, `aria-hidden="true"` 등을 적용해 크롤러와 실제 사용자 화면을 다르게 구성하는 클로킹 행위를 전면 금지하며, [`frontend/src/lib/design-system/copyDiet.ts`](./frontend/src/lib/design-system/copyDiet.ts)의 `SEO_FORBIDDEN_CLOAKING_CLASSES` 및 `auditSeoSemanticContainer`로 상시 검증합니다.
   - `noindex` 라우트(`/lounge`, `/news`)에는 애드센스 광고 슬롯을 배치하지 않으며, 심사 모드(`NEXT_PUBLIC_ADSENSE_APPROVAL_MODE=true`) 활성화 시 빈 회색 광고 박스가 남지 않도록 컨테이너 자체를 미렌더링 처리합니다.
4. **투명한 개인정보처리방침 및 법적 고지**:
   - [`frontend/src/app/privacy/page.tsx`](./frontend/src/app/privacy/page.tsx) 제8조(Google AdSense 광고 및 쿠키 운영 고지)를 통해 서드파티 광고 쿠키 사용 원리와 이용자 맞춤형 광고 설정 해제(Opt-out) 방법을 상시 고지하며, 이용약관([`frontend/src/app/terms/page.tsx`](./frontend/src/app/terms/page.tsx))의 투자 판단 면책 조항 및 [`DVIEW_strict-real-data-only.md`](./.agent/rules/DVIEW_strict-real-data-only.md)의 100% 공공 실데이터 원칙을 함께 준수합니다.
