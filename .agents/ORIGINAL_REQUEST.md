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

## 2026-08-04T10:46:18Z

재귀적 자기개선(Recursive Self-Improvement) 시스템을 구현합니다. 에이전트/알고리즘이 자신의 코드와 로직을 분석, 테스트, 평가하고 정량적 성과에 따라 자가 수정 및 성능 향상을 반복하는 자율 루프 시스템을 구축합니다.

Working directory: C:/Users/ocs56/OneDrive/바탕 화면/PORTFOLIO/PORTFOLIO - DVIEW/recursive_self_improvement
Integrity mode: development

## Requirements

### R1. 재귀적 자기개선 루프 (Recursive Self-Improvement Engine)
대상이 되는 시스템/코드/알고리즘을 실행하고, 실행 결과를 수집하며, 실패 원인이나 성능 목표 격차를 분석하여 코드를 자동 수정 및 리팩토링한 후 재실행하는 자율 반복 루프(Self-Improvement Loop)를 구축합니다.

### R2. 자동화 검증 및 성능 측정 시스템 (Evaluation & Verification Framework)
프로그램 실행 결과, 단위 테스트 통과율, 실행 시간, 메모리 효율 등 객관적이고 정량적인 메트릭을 측정하는 검증 엔진을 포함해야 합니다. 개선 시도가 정량적 지표를 향상시키지 못한 경우 롤백(Rollback) 또는 대체 개선안 탐색 메커니즘을 제공해야 합니다.

### R3. 이력 관리 및 개선 리포트 생성 (Improvement History & Auditability)
각 반복(Iteration) 별 변경 내역(Diff), 측정된 지표 변화, 개선 전략 Rationale, 최종 성과 분석 리포트를 자동으로 기록하고 보존해야 합니다.

## Acceptance Criteria

### 자가 개선 루프 실행 가능성 (Self-Improvement Loop Functionality)
- [ ] 베이스라인(Baseline) 코드 대비 최소 1회 이상의 성공적인 자가 분석 -> 자가 수정 -> 정량적 성과 향상 검증 루프가 완결될 것.
- [ ] 무한 루프 방지 및 안전 종료 조건(최대 반복 횟수 제한, 목표 성과 달성 시 종료, 성능 저하 시 이전 상태 복구)이 정상 작동할 것.

### 정량적 평가 및 롤백 검증 (Quantitative Verification & Rollback)
- [ ] 테스트 케이스 통과율 및 실행 성능(시간/메모리/정확도)을 객관적으로 측정하는 자동화 스크립트 또는 벤치마크 루틴이 존재할 것.
- [ ] 무효한 코드 변경(컴파일/실행 에러 발생 또는 성능 저하) 발생 시 이를 감지하고 안전하게 롤백하는 메커니즘이 구현될 것.

### 결과 보고서 및 기록 (Documentation & Audit Log)
- [ ] 실행 과정 전체의 이력과 세대별(Generation/Iteration) 성과 변동 추이가 markdown 리포트로 저장될 것.

