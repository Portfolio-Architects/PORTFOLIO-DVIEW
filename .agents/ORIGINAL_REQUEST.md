# Original User Request

## Initial Request — 2026-08-22T12:51:19Z

동탄 하이퍼로컬 슈퍼앱 D-VIEW 전반의 앱 구동 속도, 렌더링 런타임 성능(60fps/Zero-Jank), 메모리 사용량 최적화, 초기 로딩 번들 경량화 및 네트워크/오프라인 예외 복구성을 극대화하기 위한 종합 안정성 & 성능 리팩토링을 실시합니다.

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend
Workspace root: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW
Your agent working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\orchestrator_perf_refactor
Authoritative original request: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\ORIGINAL_REQUEST.md

## Requirements

### R1. 렌더링 런타임 및 메모리 누수 방지 최적화
- 메인 대시보드(`MacroDashboardClient`, `TechnoValleyDashboard` 등)와 하위 컴포넌트의 불필요한 재렌더링 경로를 전수 차단합니다 (`React.memo`, `useMemo`, `useCallback` 의존성 배열 및 얕은 비교 정밀화).
- 대용량 실거래 및 단지 리스트 탐색 시 DOM 노드 폭증을 방지하고 이벤트 리스너/IntersectionObserver/타이머 구독 해제 누락을 전수 검사하여 메모리 릭(Memory Leak)을 원천 차단합니다.

### R2. 번들 크기 경량화 및 초기 로딩(FCP / LCP) 가속화
- 초기 로드 시 불필요한 무거운 모달 컴포넌트(`FieldReportModal`, `AptCompareModal`, `SellTimingCalculatorModal`, `AptFitFinder` 등) 및 시각화 라이브러리에 `next/dynamic` 지연 로딩(Code Splitting)과 스켈레톤/플레이스홀더를 적용합니다.
- 메인 번들 청크 크기를 슬림화하여 모바일 저대역폭 환경에서도 즉각적인 First Contentful Paint(FCP < 1.0s)를 달성합니다.

### R3. 데이터 페칭 계층 & SWR/로컬 캐시 동기화 안정화
- SWR, IndexedDB, LocalStorage 데이터 페칭 시 중복 요청(Deduping)과 불필요한 네트워크 트래픽을 방지하고, stale-while-revalidate 캐싱 수명주기를 정밀하게 조정합니다.
- 백그라운드 재동기화 및 탭 포커스 리페칭 시 화면 깜빡임(Flash/Jank) 없는 부드러운 상태 갱신을 보장합니다.

### R4. 컴포넌트별 에러 바운더리 & 네트워크 복구성(Resilience) 강화
- 상위 앱 전체 크래시를 방지하기 위해 핵심 위젯 및 독립 기능 영역별로 `ErrorBoundary`를 배치하고 직관적인 인라인 재시도(Retry) UI를 제공합니다.
- 오프라인 또는 네트워크 순단 발생 시 캐시된 데이터를 기반으로 무중단 렌더링 및 사용자 알림 토스트를 제공합니다.

### R5. 회귀 방지 및 무결성 검증
- 모든 리팩토링 후 기존 비즈니스 로직, 멀티필터, 도넛 차트, 2x2 메트릭 카드 및 PWA 기능의 100% 정상 작동을 보장합니다.

## Acceptance Criteria

### 성능 및 렌더링 벤치마크
- [ ] 대시보드 탭 전환 및 필터 조작 시 불필요한 부모/자식 연쇄 리렌더링이 발생하지 않고 부드러운 프레임레이트(60fps)가 유지되어야 함.
- [ ] 모달 및 무거운 서브컴포넌트가 필요 시점에만 동적으로 로드되어 초기 번들 오버헤드가 감소해야 함.
- [ ] 컴포넌트 마운트/언마운트 사이클 반복 시 메모리 누수 및 미해제 옵저버/리스너가 존재하지 않아야 함.
- [ ] 네트워크 에러 발생 시 전체 페이지 크래시 없이 해당 섹션의 에러 폴백 및 재시도 버튼이 정상 동작해야 함.

### 시스템 품질 및 빌드 검증
- [ ] `npx tsc --noEmit` 실행 시 TypeScript 컴파일 에러 0건.
- [ ] Jest 전체 단위/통합 테스트(`npm test`) 전수 통과 (100% Green, 99+ test suites).
