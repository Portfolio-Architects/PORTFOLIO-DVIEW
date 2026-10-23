# Project: DVIEW Platform Production Monetization & Pipeline Enhancement (R1~R6)

## Architecture
- **Real-Time Data Pipeline Architecture** (`frontend/scripts/`, `frontend/src/app/api/cron/`):
  - 실거래가 국토부 등록일자(`registeredDate: YYYYMMDD`, `registeredDateLabel: MM.DD`) 도입 및 스키마 확장 (`transaction.ts`).
  - Git Auto-Sync 이력(`3e76c71e` 등) 기반 실데이터 결정론적 역추적 주입 및 커밋 이전 과거 데이터의 `registrationDate || contractDate` 결정론적 폴백 완료.
  - 정적 데이터 캐시(`recent-transactions.json`, `transactions-1y.json`, `transactions-3y.json`, `transactions-all.json`, `public/tx-data/*.json` 450개 청크 173,333건) 전수 무결성 보존 완료.
- **Ad Core & Singleton Runtime Architecture** (`frontend/src/hooks/useAdBlockDetector.ts`, `frontend/src/components/ads/`):
  - $\mathcal{O}(1)$ 싱글톤 AdBlock 감지 엔진: React 19 `useSyncExternalStore` 기반 전역 스토어, 단일 bait DOM($N_{\text{bait}} \le [1, \pm 0, \text{개}]$), 단일 타이머, 리플로우 오버헤드 $\mathcal{O}(N) \to \mathcal{O}(1)$ 전환.
  - `AdSlot.tsx` 8개 서브모듈(`core/` 4개 훅/유틸, `views/` 4개 프레젠테이션) 분리 및 Facade 컴포넌트 조합 구조, 기존 38개 public export 심볼 100% 하위 호환성 보존.
- **Monetization & Semantic Recovery Architecture**:
  - `isAdBlockActive === true` 및 Unfilled 캐스케이드의 고단가 CPA 캠페인 일원화 (`CPA_CAMPAIGN_CATALOG` 4대 캠페인 연동, `UnifiedCpaFallbackCard` 구조).
  - `/api/ads/click`, `ADBLOCK_FALLBACK`, `FALLBACK_CLICK` 텔레메트리 폐쇄 루프 속성 무결성 확보.
  - `/explore`, `/news` 라우트의 Zero-CLS (`min-h-[140px] sm:min-h-[160px]`, `format="in-feed"`) 광고 인벤토리 배치.
  - `explore/page.tsx`, `overview/page.tsx` 내 SSR 데이터 블록 `aria-hidden="true"` 마스킹 전면 제거 및 표준 시맨틱 섹션/테이블 아키텍처 전환 (Mediapartners-Google 색인 보장, Cloaking 방지).
- **Performance & Invariant Guardrails**:
  - 메인 스레드 TBT/INP 최적화: `ApartmentModal.tsx` 8개 챕터 지연 마운트, `MacroDashboardClient.tsx` 연산 메모이제이션.
  - `DESIGN.md` 3대 불변식 보존: `body.is-scrolling` 120fps 스크롤 백드롭 필터 억제, `lg:h-[566px]` 히어로 2열 높이 대칭 편차 $\Delta H = [0, \pm 0, \text{px}]$, Zero-CLS ($CLS < 0.001$).
  - TypeScript, ESLint, 전체 Jest 테스트 스위트, 프로덕션 빌드 종료 코드 `[0, ±0, code]`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | 국토부 등록일 파이프라인 및 스키마 확장 | `registeredDate`(`YYYYMMDD`), `registeredDateLabel`(`MM.DD`) 타입 선언 및 파이프라인 수집/직렬화 주입 | M1 | ORIGINAL_REQUEST §R1 |
| F2 | 실데이터 역추적 주입 및 타임라인 UI 표출 전환 | Git 커밋 이력(`3e76c71e`) 역추적 주입, 폴백 보존, 타임라인 등록일 기준 정렬 및 계약일(`계약일 MM.DD`) 병기 표출 | M1 | ORIGINAL_REQUEST §R1 |
| F3 | O(1) 싱글톤 AdBlock 감지 엔진 구축 | `useAdBlockDetector.ts` 단일 bait DOM($\le 1$개), 단일 타이머, 전역 상태 구독 구조 리팩토링 | M2 | ORIGINAL_REQUEST §R2 |
| F4 | AdSlot.tsx 모듈 분리 및 100% 하위 호환성 | `core/` 4개, `views/` 4개 서브모듈 분리, Facade AdSlot 구성 및 38개 public export 심볼 전수 보존 | M2 | ORIGINAL_REQUEST §R2 |
| F5 | AdBlock/Unfilled 고단가 CPA 통합 및 텔레메트리 | `isAdBlockActive` 및 Unfilled 시 `CPA_CAMPAIGN_CATALOG` 카드 일원화 및 `/api/ads/click` 비콘 속성 전송 보장 | M3 | ORIGINAL_REQUEST §R3 |
| F6 | 인벤토리 사각지대 해소 및 SSR Cloaking 제거 | `/explore`, `/news` Zero-CLS 슬롯 배치 및 SSR `aria-hidden` 마스킹 전면 제거/시맨틱 복원 | M3 | ORIGINAL_REQUEST §R4 |
| F7 | 메인 스레드 최적화 및 프로덕션 무결성 검증 | TBT/INP 감축, 120fps/566px 대칭/Zero-CLS 불변식 보존, `tsc`, `lint`, 전체 Jest, `build` 전수 통과 | M4 | ORIGINAL_REQUEST §R5, §R6 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Transaction registeredDate Pipeline & Timeline UI | F1, F2: 파이프라인 등록일 주입, Git 역추적, 타임라인 UI 정렬/병기 표출 (Gate 2 통과 완료) | none | **DONE** |
| M2 | O(1) Singleton AdBlock Detector & AdSlot Modularization | F3, F4: 싱글톤 감지기, `AdSlot.tsx` 8개 서브모듈 분리 및 38개 export 보존 | none | **DONE** |
| M3 | Unified CPA Fallback, Route Inventory & SSR Semantic Restoration | F5, F6: 고단가 CPA 통합, /explore 및 /news 슬롯 배치, SSR `aria-hidden` 제거 | M2 | **DONE** |
| M4 | Performance Optimization, Guardrails & Production Build Verification | F7: 메인 스레드 최적화, 3대 불변식 검증, `tsc`, `lint`, 전체 테스트, `build` 완결 | M1, M2, M3 | **DONE** |

## Interface Contracts
### Transaction Data Model Contract
- Location: `frontend/src/types/transaction.ts`, `frontend/src/lib/types/transaction.ts`
- Signatures:
  ```typescript
  export interface TransactionRecord {
    contractDate?: string; // YYYYMMDD
    dateLabel?: string;     // MM.DD
    registeredDate?: string; // YYYYMMDD (국토부 전산 등재일)
    registeredDateLabel?: string; // MM.DD
    // ... 기존 필드 100% 보존
  }
  ```

### AdBlock Detector Singleton Contract
- Location: `frontend/src/hooks/useAdBlockDetector.ts`
- Signatures:
  ```typescript
  export interface AdBlockDetectorState {
    isAdBlockActive: boolean;
    isLoading: boolean;
  }
  export function useAdBlockDetector(): AdBlockDetectorState;
  ```

### AdSlot Modular Architecture & Re-Export Contract
- Location: `frontend/src/components/ads/AdSlot.tsx`
- Invariant: 기존 38개 public export 심볼(컴포넌트, Props 인터페이스, 헬퍼 함수, Zod 스키마, 상태머신 클래스) 100% re-export 유지.

## Code Layout
- `frontend/src/types/transaction.ts`: 트랜잭션 타입 정의 (`registeredDate`, `registeredDateLabel` 포함)
- `frontend/scripts/fetch-transactions.js`: 수집 파이프라인
- `frontend/scripts/sync-transactions.js`: 동기화 파이프라인
- `frontend/scripts/pipeline/apartmentSummarizer.js`: 집계 파이프라인
- `frontend/scripts/pipeline/fileGenerators.js`: 정적 파일 생성기
- `frontend/src/app/api/cron/sync-transactions/route.ts`: Cron 동기화 라우트
- `frontend/src/components/MacroDashboardClient.tsx`: 매크로 대시보드
- `frontend/src/components/macro/components/MacroTimelineView.tsx`: 타임라인 뷰
- `frontend/src/hooks/useAdBlockDetector.ts`: 싱글톤 AdBlock 감지 훅
- `frontend/src/components/ads/AdSlot.tsx`: 광고 슬롯 최상위 Facade
- `frontend/src/components/ads/core/`: 광고 코어 로직 (뷰어빌리티, 캐스케이드, 인터셉터, 지오메트리)
- `frontend/src/components/ads/views/`: 광고 뷰 컴포넌트 (AdBlockView, CascadeFallbackView, PlaceholderView, SkeletonView)
- `frontend/src/app/explore/page.tsx` & `ExploreClient.tsx`: 탐색 페이지
- `frontend/src/app/news/page.tsx` & `NewsClient.tsx`: 뉴스 페이지
- `frontend/src/app/overview/page.tsx`: 오버뷰 페이지
