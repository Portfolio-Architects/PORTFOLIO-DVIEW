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
