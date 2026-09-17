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

## 2026-09-09T14:04:10Z

동탄 신도시 부동산 가치 분석 웹 앱 'D-VIEW'를 공모전용 테크노밸리 공실률 중심 구성에서 대중적이고 흥미를 유발하는 부동산 정보 플랫폼으로 대대적 개편합니다. 기존 '테크노 랩' 및 '사무실 탐색' 탭/페이지를 완전히 정리하고, 'MBTI 유형별 맞춤 동탄 아파트 추천 및 바이럴 퀴즈' 페이지/기능을 신설하며, 구글 애드센스(Google AdSense) 수익화 광고 슬롯 및 스크립트를 재구축합니다. 밤새도록 집중 작업하여 앱 전반의 사용성과 완성도를 극대화합니다.

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend
Integrity mode: development

## Requirements

### R1. 테크노밸리 및 오피스 공실률 관련 기능 정리 & 네비게이션 개편
- 기존 화성시 공모전용으로 개발되었던 '테크노 랩'(`/technovalley`) 및 '사무실 탐색' 탭/모달/페이지를 정리하고 관련 의존성을 분리합니다.
- 데스크톱 헤더(`LoungeHeader`) 및 모바일 하단 독(`MobileDock`)에서 테크노/사무실 탭을 제거하고, 핵심 아파트 정보와 신설 MBTI 콘텐츠 중심의 직관적인 네비게이션으로 개편합니다.
- 기존 테크노밸리/사무실 URL 접근 시 메인 페이지나 신설 페이지로 안전하게 리다이렉트되어 404 에러나 런타임 오류가 발생하지 않도록 처리합니다.

### R2. MBTI 유형별 맞춤 동탄 아파트 추천 & 바이럴 테스트 기능 신설
- 이용자의 주거 취향과 라이프스타일을 진단하는 간이 성향 테스트(5~7문항) 인터랙션을 신설합니다.
- 16가지 MBTI 유형별로 성향에 어울리는 동탄 신도시 대표 아파트 단지 매칭 큐레이션(단지명, 추천 사유, 주거 환경 특성 등)을 제공합니다.
- 테스트 결과 화면에서 결과 카드 공유(URL 클립보드 복사, 카카오톡/SNS 공유) 기능을 지원하여 바이럴 유입을 극대화합니다.
- 16개 MBTI 유형 전체를 개별적으로 둘러볼 수 있는 큐레이션 도감/목록 탐색 뷰를 제공합니다.

### R3. 구글 애드센스(Google AdSense) 연동 및 반응형 광고 슬롯 배치
- 환경변수(`NEXT_PUBLIC_ADSENSE_CLIENT_ID`)를 통해 구글 공식 애드센스 스크립트를 Next.js 최적화 방식(`next/script`)으로 안전하게 연동하고 `.env.example`에 명시합니다.
- 메인 화면 피드 중간, MBTI 테스트 결과 화면, 아파트 상세 영역 등에 레이아웃 시프트(CLS)를 방지하는 규격화된 반응형 광고 슬롯 컴포넌트를 배치합니다.
- 클라이언트 ID 미설정 상태나 애드블록 환경, 로컬 개발 환경에서도 레이아웃 깨짐 없이 대체 플레이스홀더가 자연스럽게 표시되도록 처리합니다.

### R4. 빌드 무결성 검증 및 기존 아파트 핵심 기능 보존
- 기존 D-VIEW의 핵심 기능인 동탄 아파트 실거래가 조회, 시세 트렌드, 단지 상세 모달, 동별 필터링 기능이 손상되지 않아야 합니다.
- 전체 Next.js 빌드(`npm run build`), TypeScript 컴파일 및 테스트가 일체 에러 없이 완벽히 통과해야 합니다.

## Acceptance Criteria

### Navigation & Cleanup
- [ ] 데스크톱 헤더(`LoungeHeader`) 및 모바일 독(`MobileDock`)에서 테크노 랩/사무실 탭이 깔끔하게 제거되고 신규 MBTI 메뉴가 자연스럽게 배치된다.
- [ ] `/technovalley` 및 오피스 관련 라우트로 접근 시 깨짐 없이 올바른 페이지로 리다이렉트된다.
- [ ] 불필요해진 공실 매칭 관련 UI/컴포넌트 잔재가 정리되어 번들이 최적화된다.

### MBTI Feature
- [ ] 신설된 MBTI 페이지(`/mbti`)에서 5~7개 문항의 성향 진단 퀴즈가 매끄럽게 진행되고 16가지 유형 중 하나로 결과가 도출된다.
- [ ] 16개 모든 MBTI 유형에 대해 어울리는 동탄 아파트 단지와 상세 추천 이유가 충실하게 매칭되어 노출된다.
- [ ] 결과 페이지에서 클립보드 링크 복사 또는 공유 기능이 정상 작동한다.
- [ ] 16가지 유형의 아파트 매칭 결과를 한눈에 탐색할 수 있는 도감 탭/리스트 뷰가 정상 렌더링된다.

### Google AdSense
- [ ] `NEXT_PUBLIC_ADSENSE_CLIENT_ID` 환경변수를 읽어 애드센스 스크립트를 조건부 주입한다.
- [ ] 홈 피드, MBTI 결과 페이지, 상세 모달 등에 반응형 광고 슬롯 컴포넌트가 배치되어 있다.
- [ ] 광고 로드 전후 레이아웃 흔들림(CLS)이 없도록 고정 높이/스켈레톤 처리가 되어 있다.

### Quality & Build Verification
- [ ] `npm run build` 실행 시 에러 없이 성공적으로 정적/동적 페이지가 생성된다.
- [ ] 기존 아파트 단지 검색, 실거래가 차트, 모달 열람 등 기존 핵심 서비스가 정상 동작한다.
- [ ] Jest 단위 테스트(`npm run test`) 실행 시 테스트 스위트가 오류 없이 통과한다.

## 2026-09-16T15:20:16Z

# D-VIEW 메인페이지 애드센스(AdSense) 수익률 극대화 데이터 표출 및 구조 개편

D-VIEW 메인페이지에 고단가(High-CPC) 금융/부동산 타깃 데이터와 사용자 체류시간(Dwell Time)을 극대화하는 실시간 랭킹 위젯을 배치하고, 구글 애드센스 정책을 준수하는 자연스러운 인피드 광고 슬롯을 최적 배치하여 애드센스 수익률(RPM/CTR)을 극대화합니다.

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend
Integrity mode: development

## Requirements

### R1. 고단가(High-CPC) 금융·정책자금 데이터 연계 섹션
메인페이지 상·중단에 고단가 광고 단가(CPC)가 매칭되는 부동산 금융 핵심 데이터 위젯(신생아 특례·디딤돌·보금자리론 등 정책대출 모의계산기 간이 위젯, 전세보증금 반환보증 안심진단 퀵 프리뷰)을 배치하여 금융/대출 관련 고수익 광고 매칭률을 유도합니다.

### R2. 체류시간(Dwell Time) & 페이지뷰(PV) 극대화 실시간 랭킹 보드
사용자가 페이지에 오래 머물고 상호작용하도록 유도하는 동적 랭킹 위젯(동탄 전역 실시간 신고가 갱신 TOP 10, 전세가율/갭 최적 단지 순위, 주간 거래량 급상승 단지)을 메인에 표출하고, 탭 전환 및 단지 클릭 시 상세 분석으로 매끄럽게 연결합니다.

### R3. 애드센스 정책 준수형 반응형 인피드(In-Feed) 및 컨텍스추얼 광고 슬롯 최적화
콘텐츠 탐색 흐름을 방해하지 않으면서 광고 주목도를 높이도록 메인 피드 및 랭킹 섹션 사이에 반응형 인피드 광고 슬롯(AdSlot)을 전략적으로 배치합니다. 모든 광고 슬롯은 Zero-CLS(누적 레이아웃 이동 방지) 최소 높이 스켈레톤과 명확한 구글 가이드라인(스폰서 표시)을 준수합니다.

## Acceptance Criteria

### 기능 및 데이터 정합성
- [ ] 메인페이지에 정책금융/대출 간이 계산 위젯 및 전세보증금 반환보증 프리뷰가 정상 렌더링되며, 클릭 시 상세 기능으로 인터랙션이 동작한다.
- [ ] 실시간 신고가, 갭 순위, 거래량 급상승 랭킹 보드가 정상 표출되고 탭 전환 및 단지 클릭 동작이 무결하게 작동한다.
- [ ] 메인페이지 주요 섹션 흐름 사이에 Zero-CLS 스켈레톤이 적용된 반응형 AdSlot 컴포넌트가 전략적으로 배치된다.

### 성능 및 코드 무결성
- [ ] `npx tsc --noEmit` 실행 시 TypeScript 컴파일 오류가 0건이어야 한다.
- [ ] 기존 및 신규 단위/통합 테스트(`npx jest`)가 100% 통과하여 기존 기능에 회귀 버그가 발생하지 않는다.
- [ ] 모바일 및 데스크톱 뷰포트에서 레이아웃 깨짐(Zero-CLS) 없이 반응형 디자인이 매끄럽게 렌더링된다.

## Verification Resources
- 프로젝트 내 기존 테스트 스위트: `npm test` / `npx jest`
- 타입스크립트 정적 분석: `npx tsc --noEmit`
- 기존 애드센스 광고 슬롯 컴포넌트: `src/components/ads/AdSlot.tsx`
- 기존 금융/진단 모달 자산: `src/components/apartment-modal/` 및 `src/app/calculator/`


