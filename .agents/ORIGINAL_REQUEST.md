# Original User Request

## 2026-08-01T07:25:37Z

디뷰 아파트랩 모바일 뷰에서 아파트 이름 생략(...) 및 신고가 뱃지 겹침으로 인한 가독성 저하 문제를 1행 [신고가 뱃지 + 동/평형], 2행 [아파트 Full Name]의 2행 수직 레이아웃 개편으로 해결합니다.

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW
Integrity mode: development

## Requirements

### R1. 모바일 아파트 카드 2행 수직 레이아웃 개편
모바일 화면(width < 480px)에서 아파트 카드 내 텍스트 레이아웃을 2행 구조로 변경합니다.
- 1행: [신고가 뱃지] + [동 / 평형 / 층수] 정보
- 2행: [아파트 Full Name] (가로 공간 전체 활용으로 말줄임 최소화)

### R2. 가격 및 상세 버튼 Alignment 최적화
아파트명이 2행 구조로 확장됨에 따라 우측 가격 영역(거래가, 변동폭) 및 [상세] 버튼과의 수직 정렬(vertical alignment)과 여백 패딩을 균형 있게 조정합니다.

### R3. 피드 UI 일관성 유지
`MacroDashboardClient.tsx`, `RealtimeClient.tsx` 등 모바일 뷰포트에서 실거래가/신고가 타임라인 카드를 렌더링하는 모든 화면에 동일한 디자인 규격을 일관되게 이식합니다.

## Acceptance Criteria

### UI & Layout
- [ ] 모바일 뷰포트(360px ~ 430px)에서 아파트 이름이 불필요하게 3~4글자로 조기 생략되지 않고 시원하게 보일 것
- [ ] 신고가 뱃지가 아파트명을 가리거나 축소시키지 않고 1행에 독립적으로 시인성 좋게 배치될 것
- [ ] 우측 가격(억/만원) 및 상승/하락 변동 폭, [상세] 버튼 간의 레이아웃 중첩/깨짐이 없을 것

### Quality & Integrity
- [ ] TypeScript 정적 타입 검사 (`npx tsc --noEmit`) 100% 통과
- [ ] Next.js 프로덕션 빌드 (`npm run build`) 무결성 패스
