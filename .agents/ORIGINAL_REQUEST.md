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
## 2026-09-19T02:46:51Z

This is a single self-contained fix; keep it small and focused.

Resolve an apartment market price trend data integrity defect where 2020-built complexes (such as 동탄역 힐스테이트) erroneously display synthetic historical prices dating back to 2008 due to unconditional macro trend backfilling. Ensure that individual complex charts only display data starting from the complex's actual first transaction, eliminating any fabricated pre-construction history while preserving valid post-launch monthly interpolations.

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend
Integrity mode: development

## Requirements

### R1. 준공 및 최초 실거래 이전 기간의 과거 데이터 가상 외삽(Backfill) 전면 차단
- 특정 아파트 단지가 선택되었을 때, 해당 단지의 최초 실거래 발생 월 이전 기간에 대해 동탄 전체 매크로 시세를 역산·곱하여 가상의 과거 시세를 생성하는 로직을 제거합니다.
- 단지의 최초 유효 실거래 이전 월에 대해서는 차트 데이터 포인트가 null 또는 미생성 처리되어야 합니다.

### R2. 'ALL' 및 기간 필터 선택 시 x축 렌더링 범위 동적 보정
- 'ALL' 필터 선택 시 차트의 시작점이 매크로 전체 데이터의 시작점(2008년)으로 고정되지 않고, 해당 단지의 최초 유효 실거래 월(동탄역 힐스테이트의 경우 2020년 말)부터 시작되도록 범위를 계산합니다.
- 단축 기간(3M, 6M, 1Y, 3Y, 5Y) 선택 시에도 선택된 기간 내의 유효 거래 데이터를 정확히 반영합니다.

### R3. 최초 거래 이후의 미거래 월(공백기) 보간 유지
- 최초 실거래 발생 이후부터 현재 시점 사이에 실제 거래가 발생하지 않은 월에 대해서는 직전 실거래가 기반의 연속선(보간)을 유지하여 차트의 단절을 방지합니다.

## Acceptance Criteria

### 데이터 정합성 검증
- [ ] '동탄역 힐스테이트' 선택 시 2020년 12월(최초 실거래 발생월) 이전의 데이터 포인트(2008년~2020년 11월)가 차트 데이터에 포함되지 않음
- [ ] 'ALL' 타임프레임 활성화 시 x축 시작 레이블이 2008년이 아닌 2020년 이후 시점으로 렌더링됨
- [ ] 다른 아파트 단지 선택 시에도 각 단지의 최초 실거래 발생 시점 이전의 가상 데이터가 생성되지 않음
- [ ] 최초 실거래 이후 거래가 없는 월은 직전 거래가 기반으로 부드럽게 보간됨

### 회귀 테스트 및 빌드 검증
- [ ] 단위 테스트(`npm test` 또는 Jest 테스트)에서 차트 데이터 생성 및 필터링 로직 검증 통과
- [ ] `npm run build`를 실행하여 TypeScript 타입 오류 및 빌드 오류 없이 정상 완료

## 2026-09-19T03:53:08Z

국토교통부 아파트 실거래가(매매 및 전월세) 수집부터 Firestore 적재, 정적 캐시 생성, 대시보드 반영에 이르는 파이프라인의 업데이트 신속성(수집 주기 최적화 및 지연 최소화)과 데이터 정합성(취소 거래 역반영, 중복 방어, 단지명 매핑 정규화, 이상치 필터링)을 고도화합니다.

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend
Integrity mode: development

## Requirements

### R1. 실거래 데이터 수집 및 동기화 신속성(Timeliness) 고도화
국토교통부 매매 및 전월세 실거래가 데이터를 최신 상태로 지연 없이 동기화할 수 있도록 수집 파이프라인을 최적화하고, 신규 거래 발생 시 서비스 대시보드와 개별 단지별 데이터셋에 신속히 반영되도록 처리 효율을 극대화합니다.

### R2. 계약 해제/취소 및 중복 거래에 대한 정합성(Integrity) 보장
신고 취소 및 계약 해제 거래(해제사유발생일 표기 데이터)가 단지별 통계, 최고가/최저가, 최근 거래 피드, 거시 트렌드 지표에 잔존하거나 왜곡을 일으키지 않도록 정제 및 역반영 메커니즘을 확립하고, 동일 거래의 중복 적재를 원천 차단합니다.

### R3. 단지명 정규화 및 이상치/직거래 필터링 정밀화
공공 API의 아파트 단지명 표기와 서비스 내 179개 단지 카탈로그(`dong-apartments.ts`) 간 매핑 누락을 방지하기 위한 정규화 규칙을 보강하고, 통계 왜곡을 유발하는 비정상 가격 급등락(IQR 및 롤링 윈도우 기반) 데이터를 객관적으로 필터링합니다.

### R4. 파이프라인 검증 및 복원력(Resilience) 보장
공공 API 일시 지연, 타임아웃, 응답 형식(XML/JSON) 불일치 등 외부 장애 요인에도 파이프라인이 크래시 없이 안전하게 복구되어야 하며, 데이터 수집 결과가 Zod 스키마 검증 및 기존 Jest 단위/통합 테스트를 100% 통과하도록 합니다.

## Acceptance Criteria

### 신속성 및 파이프라인 효율
- [ ] 수집 스크립트(`fetch-transactions.js`, `fetch-rent.js`)의 증분 수집 및 쓰기 비용 절감 로직이 유지되면서 실행 지연 없이 안정적으로 완료된다.
- [ ] 동기화 파이프라인(`sync-transactions.js`)을 거쳐 생성되는 대시보드 통계 및 정적 파일(`tx-summary.json`, `recent-transactions.json`, `macro-trend.json`, `public/tx-data/*.json`)이 최신 일자 기준으로 정합하게 빌드된다.

### 데이터 정합성 및 무결성
- [ ] 취소/해제 거래(cdealDay/cdealType 존재 건)가 Firestore 및 최종 정적 요약/최근 거래 목록에서 완전히 제외되거나 취소 상태로 정확히 처리된다.
- [ ] 복합 키(`_key`) 생성 및 Firestore 적재 시 동일 거래 중복 등록 건수가 0건으로 유지된다.
- [ ] 서비스 179개 단지 카탈로그와 국토부 실거래 데이터 간 매핑 누락(Unmapped orphan records)이 발생하지 않는다.
- [ ] 비정상 극단치(이상 급락/급등가)가 통계 산출(평균가, 신고가, 주간 증감률)에서 누락 없이 배제된다.

### 자동화 테스트 및 복원력
- [ ] Jest 파이프라인 테스트(`npm test -- src/__tests__/pipeline.test.ts`) 및 데이터 검증 스크립트(`node scripts/validate-transactions.js`)가 에러 없이 100% 통과(PASS)한다.
- [ ] 외부 API 통신 실패 또는 데이터 포맷 이상 발생 시에도 안전한 로깅과 함께 파이프라인 프로세스가 비정상 종료되지 않는다.

## 2026-09-19T05:29:18Z

동탄 신도시 182개 단지, 18개년(2006~2026) 누적 실거래가 169,777건 전수를 대상으로 분석 범위를 대폭 확장하되, **Firestore 클라우드 비용(Read/Write)을 $0(무료 티어 범위)으로 방어**하는 정적 캐시 아키텍처를 기반으로 전수 장기 통계 리포트, 기간별(90일/1년/3년/전체) 실거래 탐색 및 대용량 브라우저 렌더링 최적화를 구현합니다.

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend
Integrity mode: development

## Requirements

### R1. 18개년 17만 건 전수 실거래가 장기 통계 및 매크로 지표 사전 집계
기존 90일 중심 통계를 넘어, 169,777건 전수 데이터를 기반으로 단지별·평형별 역대 최고가/최저가 전수 기록, 연도별 거래량 추이, 장기 시세 상승률 통계를 빌드 타임에 사전 컴파일하여 클라이언트 성능 저하 없이 즉시 서빙되도록 집계 파이프라인을 고도화합니다.

### R2. 실거래 피드 기간 선택 필터(90일 / 1년 / 3년 / 전체) 및 정적 청크 서빙
기존 90일 고정(`recent-transactions.json`) 서빙 구조에서 탈피하여, 사용자가 원하는 기간(최근 90일, 1년, 3년, 전체)을 선택하여 실거래를 조회할 수 있도록 기간별 분할 정적 청크 또는 온디맨드 로딩 파이프라인을 구축합니다.

### R3. Firestore 비용 제로화 아키텍처 (Zero Direct Client Reads & Incremental Sync)
* **클라이언트 직통 읽기 차단**: 웹 방문자가 17만 건 전수 데이터나 장기 기간 필터를 조회하더라도 브라우저에서 Firestore를 직접 쿼리하지 않고, Vercel CDN 정적 청크 파일(`public/tx-data/*.json` 등)을 통해 서빙하여 클라이언트발 Firestore Read 비용을 0원으로 방어합니다.
* **파이프라인 비용 최적화**: 일일 수집/동기화 시 매번 17만 건 전체를 Firestore에서 Full Scan하지 않고, 로컬 정적 데이터셋과 최근 3개월 증분 델타(`existingMap`) 비교 방식을 유지하여 Firestore 무료 티어(일 50,000 Reads / 20,000 Writes) 내에서 상시 구동되도록 보장합니다.

### R4. 대용량 실거래 조회 시 클라이언트 성능 최적화 (가상화 및 메모리 누수 방지)
기간 확장 시 수천~수만 건의 실거래 데이터가 로드되더라도 초기 페이지 번들 크기(LCP)와 브라우저 반응성(FPS)이 저하되지 않도록 가상화 리스트(Virtual Scrolling) 또는 점진적 렌더링을 적용하여 부드러운 스크롤과 메모리 효율을 보장합니다.

### R5. 전수 데이터 정합성 감사 및 자동화 테스트 100% 통과
17만 건 전수 집계 결과가 취소 거래 제외, 중복 방어, 단지명 매핑 규칙을 완벽히 준수하도록 데이터 검증기(`validate-transactions.js`) 및 Jest 파이프라인 테스트를 확장하고 모든 기존 기능과의 회귀 테스트를 100% 통과하도록 보장합니다.

## Acceptance Criteria

### Firebase 비용 및 서빙 아키텍처
- [ ] 일반 사용자가 기간 필터(전체/3년/1년/90일)를 전환하거나 대량 실거래를 조회할 때 클라이언트에서 발생하는 Firestore Read 요청이 0건이다 (CDN 정적 파일로 서빙).
- [ ] 동기화 스크립트 실행 시 Firestore 읽기/쓰기 연산이 최근 3개월 델타 및 캐시 비교로 제한되어 Firebase 무료 쿼터 내에서 실행 완료된다.

### 전수 데이터 집계 및 파이프라인
- [ ] 182개 단지 169,777건 전수 데이터가 집계 파이프라인(`sync-transactions.js` 등)을 거쳐 역대 누적 통계 지표로 빌드 타임에 컴파일된다.
- [ ] 단지별 역대 최고가 및 장기 상승률 통계가 취소 거래 없이 정합하게 산출된다.

### 기간 필터 및 UI 성능
- [ ] UI 상에서 실거래 피드를 기간별(최근 90일, 1년, 3년, 전체)로 전환하여 조회할 수 있는 필터 컨트롤이 동작한다.
- [ ] 90일 기본 뷰는 기존처럼 100KB 이하의 초경량 로딩을 유지하여 초기 LCP 성능 저하가 발생하지 않는다.
- [ ] 1년/3년/전체 기간 선택 시 온디맨드로 데이터를 불러와 수천 건 이상의 거래 목록이 60fps로 매끄럽게 렌더링된다.

### 정합성 및 테스트
- [ ] Jest 파이프라인 테스트 및 검증 스크립트가 100% 통과(PASS)한다.
- [ ] TypeScript 컴파일(`npx tsc --noEmit`) 에러 0건을 유지한다.

## 2026-09-19T10:34:44Z

DVIEW 서비스에서 관리자 페이지(/admin), 커뮤니티(라운지 및 게시글/댓글), 사용자 로그인/인증(Firebase Auth) 기능을 완전히 제거하고, 기존 관리자 업무는 안티그라비티 및 로컬 CLI 스크립트로 수행할 수 있도록 프론트엔드/백엔드 코드베이스를 경량화 및 정리합니다.

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend
Integrity mode: development

## Requirements

### R1. Remove Admin Features and Routes
Completely remove the web administrator interface (`/admin/*`) and its backend API endpoints (`/api/admin/*`). All administrative operations previously handled through the web UI (such as data inspection, manual updates, and reports) must be manageable purely via local scripts and development tools without requiring web-based admin pages.

### R2. Remove Community (Lounge) Features and Routes
Completely remove community and lounge features across the application. This includes deleting the lounge pages (`/lounge/*`), post creation and feed components, comment systems, and related community API endpoints (`/api/posts`, `/api/comments`), as well as removing lounge tabs, links, and navigation items from headers, navigation docks, and dashboards.

### R3. Remove User Authentication and Login System
Completely remove user authentication and login functionality from the client and server. The application must operate purely as an open, public informational service without login modals, Google Auth popups/redirects, session cookies, auth contexts/guards, user profiles, or user-specific state.

### R4. Navigation, UI, and Test Suite Maintenance
Update application layout, navigation components, and header/dock bars so no broken links or orphaned UI triggers for admin, community, or login remain. Clean up or adapt existing unit and integration tests to match the removed features and ensure that the build and test suites pass without regression in the remaining core features.

## Acceptance Criteria

### Build & Typecheck
- [ ] `npm run build` succeeds with exit code 0 and zero TypeScript or Next.js build errors.
- [ ] `npm run lint` succeeds with no linting errors related to removed features or unused imports.

### Admin Removal Verification
- [ ] Accessing `/admin` routes no longer serves an admin portal (routes are deleted or return 404).
- [ ] Backend routes under `/api/admin` are removed.
- [ ] Navigation bars, footers, and dashboards contain no links or buttons leading to the admin portal.

### Community & Lounge Removal Verification
- [ ] Accessing `/lounge` routes or related community views returns 404 or redirects cleanly to the main dashboard.
- [ ] Backend routes for community posts (`/api/posts`) and comments (`/api/comments`) are removed.
- [ ] Dashboard tabs and mobile dock navigation no longer show "라운지" (Lounge) or community entry points.

### Authentication & Login Removal Verification
- [ ] Header, floating bars, and modals contain no "로그인" (Login) or "로그아웃" (Logout) buttons or user avatar triggers.
- [ ] Session cookie endpoints (`/api/auth/session`) and client-side auth providers (`AuthProvider`, `AdminGuard`, `useAuth`) are removed or neutralized to public anonymous state with no Firebase Auth network dependency.
- [ ] The app renders all primary non-community features (Apartment details, Transactions, Macro trends, Techno Valley, MBTI) seamlessly without prompting for authentication.

### Test Integrity
- [ ] `npm run test` executes successfully without failing due to missing admin/lounge/auth components or outdated mock assertions.

## 2026-09-19T13:40:53Z

동탄 신도시 아파트 실거래가 데이터를 기반으로 종합 통계 분석 리포트 대시보드를 구축하여 사용자의 체류 시간(Dwell Time)을 극대화하고, 인피드/인라인 애드센스 광고 배치를 통해 수익률을 극대화합니다.

Working directory: c:/Users/ocs56/OneDrive/바탕 화면/PORTFOLIO/PORTFOLIO - DVIEW/frontend
Integrity mode: development

## Requirements

### R1. 동탄 부동산 실거래가 통계 분석 엔진
동탄1·2 신도시 및 법정동별 실거래 데이터(매매/전세)를 바탕으로 기간별(1개월/3개월/6개월/1년/전체), 평형대별 거래량, 평균 매매가, 평당가 랭킹, 전세가율, 신고가/신저가/급매 변동률을 산출하는 통계 분석 로직을 제공합니다.

### R2. 체류 시간 증대를 위한 인터랙티브 통계 리포트 대시보드 UI
사용자가 권역, 평형, 기간, 정렬 조건을 실시간으로 탐색할 수 있는 시각화 차트(시계열 추이, 거래량 분포, 평당가 랭킹) 및 핵심 하이퍼로컬 인사이트 요약 카드를 직관적인 반응형 웹 인터페이스로 제공합니다.

### R3. 애드센스 수익 최적화 및 UX 조화형 광고 배치
통계 리포트 섹션 및 차트 카드 사이에 자연스럽게 노출되는 인피드/인라인 애드센스 슬롯을 구현하고, 누적 레이아웃 이동(CLS) 방지 및 애드센스 정책을 준수하는 반응형 광고 플레이스홀더를 제공합니다.

### R4. 데이터 무결성 및 인프라 제약
기존 정적 데이터셋(`public/data/*.json`) 및 동기화 파이프라인과 완벽히 호환되어야 하며, 외부 클라우드 무단 쓰기나 불필요한 네트워크 비용 없이 클라이언트/정적 빌드 고성능을 유지해야 합니다.

## Acceptance Criteria

### 통계 분석 정확성 및 데이터 처리
- [ ] 권역별(동탄1/동탄2/법정동), 평형대별, 기간별 실거래가 통계 지표(평균 매매가, 평당가, 전세가율, 거래량 변동률)가 오차 없이 산출되어 화면에 표시된다.
- [ ] 결측치 또는 거래 데이터가 부족한 단지/기간 선택 시 앱이 충돌하지 않고 안정적인 예외 처리 및 안내 메시지를 표시한다.

### 체류 시간 및 사용자 인터랙션
- [ ] 권역/기간/평형 필터 변경 시 통계 차트와 테이블이 즉각(300ms 이내) 갱신되며, 데이터 로딩 상태에 대한 스켈레톤 UI가 제공된다.
- [ ] 모바일과 데스크톱 환경 모두에서 차트 툴팁, 데이터 정렬, 단지별 상세 통계 탐색이 끊김 없이 매끄럽게 동작한다.

### 애드센스 배치 및 레이아웃 안정성
- [ ] 통계 대시보드 본문 및 리포트 섹션 사이에 규격에 맞는 인피드/인라인 광고 슬롯이 배치된다.
- [ ] 광고 로딩 전후 레이아웃이 급격하게 흔들리지 않도록 고정 높이 또는 반응형 종횡비(Aspect Ratio) 컨테이너가 유지된다 (CLS < 0.1).

### 코드 품질 및 회귀 방지
- [ ] 기존 테스트 스위트를 포함하여 신규 통계/광고 컴포넌트 단위 테스트(`npm run test`)가 100% 통과한다.
- [ ] `npx tsc --noEmit` 실행 시 TypeScript 컴파일 에러가 0건이어야 한다.
- [ ] `npm run lint` 실행 시 ESLint 검사를 0건의 에러로 통과해야 한다.
- [ ] `npm run build` 실행 시 프로덕션 빌드가 성공적으로 완료되어야 한다.



