# DVIEW Frontend Application (`dongtanview.com`)

디뷰(DVIEW) 프론트엔드 애플리케이션은 Next.js 16 (App Router) · React 19 · TypeScript 기반의 동탄 1·2신도시 및 테크노밸리 실거래가 분석 웹 플랫폼입니다.

## 1. 로컬 개발 환경 구동 및 핵심 명령

전용 개발 포트는 **`5000`** 으로 고정되어 있습니다 ([`DVIEW_localhost-open.md`](../.agent/workflows/DVIEW_localhost-open.md)).

```bash
# 로컬 개발 서버 구동 (http://localhost:5000)
npm run dev

# 타입 무결성 검사 (0 에러 필수)
npx tsc --noEmit

# 단위·통합 테스트 실행 (Jest)
npm test

# 루트 엔지니어링 리포트 -> src/data/engineering-report.md 1:1 동기화 및 검증
npm run sync-report
npm run check-report

# 프로덕션 빌드 (prebuild 시 sync-report 자동 선행)
npm run build
```

## 2. 단일 진실 공급원(SSOT) 및 문서 허브

- **에이전트 행동 강령 및 표준 스킬**: [`DVIEW_AGENT.md`](../DVIEW_AGENT.md) · [`DVIEW_DRSP.md`](../.agent/rules/DVIEW_DRSP.md) · [`DVIEW_strict-real-data-only.md`](../.agent/rules/DVIEW_strict-real-data-only.md) · [`dview-real-data-pipeline`](../.agent/skills/dview-real-data-pipeline/SKILL.md) · [`dview-adsense-telemetry`](../.agent/skills/dview-adsense-telemetry/SKILL.md) · [`dview-design-compliance`](../.agent/skills/dview-design-compliance/SKILL.md)
- **디자인 시스템 (`Ad Money v5.1`)**: [`DVIEW_DESIGN.md`](../DVIEW_DESIGN.md) (`Pretendard Variable` 웹폰트 + `tabular-nums` 전용, 고정폭 폰트·이모티콘 배제)
- **보안 정책 및 실패 지식**: [`DVIEW_SECURITY.md`](../DVIEW_SECURITY.md) · [`DEAD_ENDS.md`](../DEAD_ENDS.md)
- **시스템 아키텍처 및 패치노트**: [`DVIEW_PORTFOLIO DVIEW - Engineering Report.md`](../DVIEW_PORTFOLIO%20DVIEW%20-%20Engineering%20Report.md) · [`DVIEW_PORTFOLIO DVIEW - Patch History.md`](../DVIEW_PORTFOLIO%20DVIEW%20-%20Patch%20History.md) · [`DVIEW_PROJECT.md`](../DVIEW_PROJECT.md)
- **전문 기술 가이드 (`docs/`)**: [`adsense-approval-report.md`](../docs/adsense-approval-report.md) · [`molit-crawling-feasibility.md`](../docs/molit-crawling-feasibility.md) · [`firebase-custom-auth-domain.md`](../docs/firebase-custom-auth-domain.md)
