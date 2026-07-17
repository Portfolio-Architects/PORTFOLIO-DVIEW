# Original User Request

## 2026-07-16T13:54:58Z

동탄 테크노밸리 지식산업센터 데이터 시각화 페이지인 '테크노 랩'의 UI/UX를 고도화하고, 불필요한 상단 내비게이션 버튼을 제거하여 정보 밀도와 비주얼 완성도를 화성시 BI 테마에 어울리게 극대화합니다. 특히, 구동 속도 저하를 유발하는 요소를 철저히 차단하고 렌더링 속도 최적화를 병행합니다.

Working directory: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW`
Integrity mode: development

## Requirements

### R1. 상단 내비게이션 버튼 제거
- `frontend/src/app/technovalley/TechnoValleyClient.tsx` 파일의 히어로 영역 하단(`bottomContent`)에 위치한 두 개의 버튼("📊 세제 혜택 시뮬레이터", "🤝 소호 공동임차 매칭")을 완전히 제거합니다.

### R2. 화성시 BI 기반 도넛 차트 컬러 및 초고속 호버 인터랙션
- `TechnoValleyDashboard.tsx` 내의 업종 분포 도넛 차트(`PieChart`) 색상 팔레트를 화성시 BI 공식 색상 테마(파랑 `--hs-blue`: `#004696` 및 주황 `--hs-orange`: `#dc6e2d`)와 조화를 이루도록 전면 개편합니다.
  - 대표 예시: 반도체·첨단제조는 Hwaseong Blue, IT·소프트웨어는 Hwaseong Orange, 지식기반 서비스는 연한 파랑/스카이, 바이오는 에메랄드/그린, 기타 정밀기기는 세련된 뉴트럴 그레이 계열로 맵핑합니다.
- **구동 속도 최적화**: Recharts 호버 시 JS 상태 변화에 따른 전체 컴포넌트 리렌더링(Reflow) 부하를 방지하기 위해, 슬라이스 확대 및 강조 효과는 GPU 가속이 가능한 순수 CSS transition/transform (`transition-transform duration-300 transform hover:scale-105 origin-center`) 및 SVG 클래스 기반 스타일링을 우선 적용하여 프레임 저하 없는 60fps 인터랙션을 확보합니다.

### R3. 입주 기업 아코디언 및 검색 필터 UX & 렌더링 속도 고도화
- 지식산업센터 입주 기업 업종별 아코디언 리스트와 검색 필터 영역의 UI를 고도화하고 DOM 최적화를 수행합니다.
- **DOM 노드 다이어트**: 아코디언이 접혀 있는 상태에서는 수백 개의 기업 리스트 DOM 노드를 그리거나 마운트하지 않는 **지연 렌더링(Lazy Rendering)** 방식을 적용하여 초기 페이지 로딩 및 렌더링 속도를 획기적으로 개선합니다.
- 아코디언 내부의 기업 정보 카드 컴포넌트를 기존의 평평한 디자인에서 은은한 그림자(shadow-sm)와 호버 시 스케일 업(`hover:scale-[1.01]`), 테두리가 화성시 테마색(`hs-blue/30` 또는 `hs-orange/30`)으로 부드럽게 강조되도록 세련되게 다듬습니다.

### R4. 실거래가/공실률 추이 그래프 선 부드러움 처리 및 경고 예방
- `TechnoValleyDashboard.tsx` 하단의 추이 그래프(`LineChart`) 꺾은선 스타일을 기존 `monotone`에서 좀 더 자연스럽게 이어지는 `natural` 형태로 이식하여 시각적 논리 흐름을 완성합니다.
- Recharts의 `ResponsiveContainer`에서 빌드 시 또는 브라우저 크기 조정 시 발생할 수 있는 크기 오류/경고를 사전에 완벽히 차단(`minWidth={0}`, `minHeight={0}`)하고 최적화합니다.

### R5. 모바일/데스크톱 뷰포트 반응성 및 빌드 정합성 확보
- 모바일 환경에서의 터치 감도, 스크롤 마찰력(momentum), 카드 간 간격(Padding/Margin) 등을 세밀하게 튜닝하여 모바일 웹앱 환경에서의 유연함을 극대화합니다.
- 수정이 완료된 후 `frontend` 디렉토리에서 `npm run audit`을 실행하여 컴파일, 린트, 테스트 패스를 전수 통과하는지 검증합니다.

## Acceptance Criteria

### 테크노 랩 히어로 및 그리드
- [ ] 테크노 랩 페이지(`/` 또는 `/technovalley`) 진입 시 상단에 있던 "세제 혜택 시뮬레이터" 및 "소호 공동임차 매칭" 2개 버튼이 화면에서 완벽하게 보이지 않아야 합니다.
- [ ] 하단 2x2 KPI 카드와 하단 세제 혜택 시뮬레이터 영역은 제거되지 않고 정상 작동해야 합니다.

### 도넛 차트 및 그래프 (성능 기준 추가)
- [ ] 도넛 차트의 색상이 화성시 BI 테마(Blue, Orange 계열 등)로 세련되게 조화되며, 각 섹터 호버 시 시각적 반응(Scale or Stroke 변화)이 리렌더링 버벅임 없이 GPU 가속(CSS)을 통해 60fps 수준으로 매끄럽게 연출됩니다.
- [ ] 아코디언이 닫힌 상태에서는 내부 기업 리스트 노드가 생성되지 않아, 초기 등재 DOM 노드 수가 절감되고 구동 속도가 개선됩니다.
- [ ] 트렌드 그래프의 선 연결 타입이 `natural`로 변경되어 꺾임선이 부드럽게 표현됩니다.
- [ ] 빌드(`npm run build`) 및 무결성 진단(`npm run audit`) 파이프라인이 에러 없이 통과해야 합니다.

## Follow-up — 2026-07-17T03:24:01Z

Enhance the community tab design and UX of the D-VIEW Lounge page to create a premium, visually engaging, and highly functional user experience.

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW
Integrity mode: development

## Requirements

### R1. High-Fidelity Community Card Grid Layout
- Enhance the visual layout of SOHO co-leasing matching cards and Apartment Stories list to use responsive grid structures on desktop and list layouts on mobile.
- Add premium hover states, smooth spring scaling transitions, and visually refined shadow/border styling using the HSL design tokens.

### R2. Interactive Write Forms & Sleek Modals
- Redesign the post creation write form (Lounge Compose Client) and detail dialog modals with modern animation transitions, glassmorphic backdrops, and polished typography.
- Ensure proper W3C WAI-ARIA labels are assigned to the form input elements to maintain accessibility.

### R3. Desktop-Optimized Sticky Sidebar
- Integrate a sticky, responsive sidebar layout on desktop screen sizes displaying:
  1. "실시간 인기 토크" (Hot Topics) calculated from `hotPosts`.
  2. "오늘의 소호 매칭 현황" (SOHO Matching Stats) summary.
  3. Safe shortcut widgets to real estate calculators (e.g. Jeonse safety, mortgage calculator).

## Acceptance Criteria

### UI/UX & Layout Quality
- [ ] Segmented tab switches and sub-tab selection controls render cleanly with no jitter or height collapse.
- [ ] Post cards, stories widget, and status badges display cleanly with cohesive pastel/emerald visual themes.
- [ ] The desktop sidebar sticks on scroll when resolution is greater than 1024px (`lg:` breakpoint) and hides cleanly on smaller viewports.
- [ ] Interactive form inputs, buttons, and close actions support micro-animations and proper active/focus visual cues.

### Technical & Verification
- [ ] App builds successfully without compile errors: `npm run build` or `npx tsc --noEmit` returns exit code 0.
- [ ] Playwright E2E tests and Jest unit tests pass successfully.


## 2026-07-17T04:29:42Z

이 프로젝트는 동탄 아파트 실거래 데이터 분석 플랫폼 'D-VIEW'의 '아파트 랩'(/overview) 페이지 내 전체 레이어 컴포넌트의 렌더링 성능을 심층 분석하고, 메인 스레드 블로킹, 불필요한 재렌더링, 레이아웃 흔들림(CLS), 번들 크기를 최적화하여 서비스 진입 및 상호작용 속도를 극대화하는 것을 목표로 합니다.

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend
Integrity mode: development

## Requirements

### R1. 레이어 컴포넌트 렌더링 병목 분석
- 아파트 랩(/overview) 진입 및 지도/대시보드 상호작용 시 발생하는 렌더링 병목(예: 대규모 리스트 렌더링으로 인한 Main Thread Blocking, 잦은 State 변경에 의한 하위 컴포넌트의 무의미한 Re-rendering 등)을 분석합니다.

### R2. 컴포넌트 렌더링 최적화 및 메모이제이션 적용
- 대량의 데이터나 복잡한 UI를 다루는 컴포넌트들에 대해 `React.memo`, `useMemo`, `useCallback` 등을 적절히 적용하고 상태 구조를 개선하여 렌더링 성능을 개선합니다.
- 필요한 경우 화면에 보이지 않는 요소나 긴 리스트 아이템들에 대해 가상화(Virtualization) 또는 지연 렌더링(Lazy Rendering) 기법을 적용합니다.

### R3. 번들 크기 최소화 및 코드 분할
- `MacroDashboardClient` 내부의 독립적인 대형 하위 컴포넌트(예: 필터, 트렌드 분석, 부동산 계산기 위젯 등)들을 추가적으로 분리하여 동적 로딩(`dynamic()`)을 적용하고 초기 로드 비용을 추가로 줄입니다.

### R4. 기존 기능 및 사용자 경험(UX) 무결성 유지
- 성능 최적화 작업이 진행된 후에도 지도 탐색, 아파트 상세 조회, 전세 안전진단 등 기존의 모든 핵심 기능이 깨짐 없이 부드럽게 작동해야 합니다.

## Acceptance Criteria

### 빌드 및 구동 안정성
- [ ] 성능 최적화 후 전체 애플리케이션 빌드(`npm run build`)가 정상적으로 성공하는지 검증.
- [ ] '아파트 랩'(/overview) 페이지 로드 및 탭 스위칭이 정상적으로 구동되고 콘솔에 렌더링 관련 런타임 에러가 발생하지 않는지 검증.

### 성능 최적화 검증
- [ ] 불필요하게 쪼개지지 않은 무거운 컴포넌트들의 추가적인 코드 분할(Code Splitting)이 성공적으로 적용되었는지 검증.
- [ ] UI 상호작용 시 지연(Lag)이 최소화되고 부드러운 전환이 보장되는지 검증.

## 2026-07-17T04:46:26Z

D-VIEW 웹 애플리케이션의 페이지 간 전환 및 모달(ApartmentModal) 출력 반응 속도를 높이기 위한 전체 레이어 최적화 및 리팩토링 프로젝트입니다. 

Working directory: c:/Users/ocs56/OneDrive/바탕 화면/PORTFOLIO/PORTFOLIO - DVIEW
Integrity mode: development

## Requirements

### R1. 페이지 전환 최적화 (Page Transition Optimization)
- Next.js 라우터/Link 기반 프리프레임/프리페치(`Link` 컴포넌트 프리페치 최적화, 마우스 호버 시 programmatic prefetch 적용)를 최적화하여 페이지 전환 시 딜레이를 최소화합니다.
- 서비스 워커(`public/sw.js`) 캐싱 정책을 개선하여 정적 JS 청크 및 데이터 JSON 파일의 로딩 속도를 향상시킵니다.
- 페이지 전환 시 불필요하게 데이터가 중복 요청되거나 상태가 리셋되는 현상을 방지하도록 SWR/React Context 수준의 캐싱을 점검하고 보완합니다.

### R2. 모달 출력 속도 최적화 (Modal Render Speed Optimization)
- `ApartmentModal` 및 그 내부의 무거운 컴포넌트(차트, 댓글 리스트, 사진 업로드, 부가 정보 계산기 등)를 dynamic import를 사용하여 효율적으로 분할 로딩합니다.
- 모달이 열리기 전에 마우스 호버(hover)나 포커스 시점에 핵심 청크 및 데이터를 미리 불러오는 프리로드(preload) 메커니즘을 고도화합니다.
- 렌더링 병목을 유발하는 컴포넌트(리차트, 테이블 뷰 등)에 `React.memo`, `useMemo`, `useCallback` 등을 적용하여 중복 렌더링과 버벅임(Jank) 현상을 해결합니다.

### R3. 빌드 안정성 및 성능 검증 (Verification & Build Stability)
- 리팩토링 이후 Next.js 프로덕션 빌드(`npm run build`)가 오류 없이 정상 완료되어야 합니다.
- 기존의 Playwright E2E 성능 테스트 및 라우팅 테스트(`performance-ux.spec.ts`, `routing-bug.spec.ts`)를 모두 성공적으로 통과해야 합니다.
- 필요 시, 최적화 전후 성능 차이를 정량적으로 측정할 수 있는 커스텀 벤치마크 스크립트를 실행하여 로딩 시간 단축 여부를 검증합니다.

## Acceptance Criteria

### Build & Test Stability
- [ ] `npm run build` 명령어 실행 시 컴파일 에러나 경고 없이 빌드가 성공해야 함
- [ ] `npm run test:e2e` 실행 시 `performance-ux.spec.ts` 및 `routing-bug.spec.ts` 테스트가 실패 없이 완료되어야 함

### Performance Optimization
- [ ] `ApartmentModal` 호출 시 메인 모달 프레임과 스켈레톤이 즉시(100ms 이내) 렌더링되어야 함
- [ ] 페이지 내 마우스 호버 시 해당 링크의 데이터와 JS 청크 프리로드가 백그라운드에서 동작해야 함
- [ ] 사용되지 않는 탭의 무거운 라이브러리(Recharts 등)와 컴포넌트가 모달 오픈 초기 시점에 번들을 막지 않도록 lazy 로딩이 정상 작동해야 함
