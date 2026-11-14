# DVIEW (Dongtan View) AI Agent Protocol (Lean Edition)

이 문서는 DVIEW 프로젝트를 담당하는 AI 에이전트의 핵심 행동 강령입니다. 불필요한 토큰 소모와 무한 루프를 배제하고, **구글 애드센스 수익률(AdSense Monetization Yield — RPM, eCPM, CTR, Active Viewability, High-CPC 전환율) 극대화**와 **코드 무결성**에 집중합니다.

---

## 1. 최대 목적함수 (Ultimate Objective Function)

DVIEW의 최우선 목적함수는 동탄 및 반도체 메가 클러스터 초고관여 트래픽을 기반으로 **구글 애드센스 수익률 및 단위 방문자당 순익을 극대화**하는 것입니다:

$$\text{Max } \mathcal{Y}_{\text{AdSense}} = \sum_{s \in \text{Slots}} \Big[ \text{PV} \times \text{AdDensity}(s) \times \text{Viewability}(s) \times \text{CTR}(s) \times \text{CPC}(s) \times (1 - \text{AdBlockRate}) \Big] + \text{Yield}_{\text{NativeCPA}}$$

1. **디자인 시스템 단일 진실 공급원(SSOT)**: 모든 UI/UX 작업은 [`DVIEW_DESIGN.md`](./DVIEW_DESIGN.md)의 **Ad Money v5.1 (애드 머니)** 디자인 시스템을 준수합니다.
2. **네이티브 콘텐츠-광고 동형화**: 핵심 인터랙티브 블록과 광고 슬롯(`AdSlot`)·고단가 CPA 위젯의 보더리스 소프트 서피스(`bg-[#f9fafb] dark:bg-[#17171c]`, `rounded-2xl`, 외곽 보더·그림자 무적용) 규격을 1:1로 일치시켜 배너 맹목성을 제거하고 CTR을 높입니다.
3. **고단가 금융·부동산 인텐트 연계**: 주담대·대환대출·세무·밸류에이션·테크노밸리 입주 등 고단가(High-CPC) 광고주 입찰 효율을 높이는 시맨틱 구조를 유지합니다.

---

## 2. Stop-the-Line (5대 필수 안전장치)

1. **Zero-Jank & Zero-CLS ($\text{CLS} < 0.001$)**: 광고 슬롯별 최소 높이(`min-h-[140px]`, `min-h-[250px]`, `min-h-[90px]`) 사전 예약 및 매크로 히어로 2열 대칭(`lg:h-[526px]`)을 유지합니다.
2. **Type & Compile 무결성**: `frontend` 디렉토리 기준 `npx tsc --noEmit` 에러 0건을 유지하며 `any` 타입 남용을 금지합니다.
3. **Ad Money 디자인 시스템·소통 프로토콜 및 폰트 수칙 준수 ([`.agent/rules/DVIEW_DRSP.md`](./.agent/rules/DVIEW_DRSP.md))**: Slate/Toss 무채색 베이스와 Toss/Trust Blue(`#3182f6` / `#2563eb`) / Value Emerald(`#059669`) / Alert Red(`#f04452`) 시맨틱 토큰만 사용하며, 유니코드 이모티콘 대신 `lucide-react` 아이콘만 사용합니다. **굴림체(`GulimChe`), `Consolas`, `Courier New` 등 시스템 고정폭(`monospace`) 폴백 폰트 사용을 전면 금지**하고 모든 텍스트·숫자·단위는 **Pretendard Variable (`var(--font-pretendard)`) + `tabular-nums`**로 통일합니다.
4. **Strict Real-Data Only ([`.agent/rules/DVIEW_strict-real-data-only.md`](./.agent/rules/DVIEW_strict-real-data-only.md))**: 추정치, 샘플, Mock 데이터 사용을 엄격히 금지하며, 국토교통부·화성시 등 100% 실제 검증된 공공 데이터만 표시합니다.
5. **AdSense 정책 및 보안 준수 ([`DVIEW_SECURITY.md`](./DVIEW_SECURITY.md))**: 강제 클릭 유도, 광고 가림, 무효 트래픽 유발 및 서버 전용 시크릿 클라이언트 노출 행위를 엄격히 금지합니다.

---

## 3. 토큰 효율화 및 개발 수칙 (Token Diet & Engineering Rules)

1. **컨텍스트 및 토큰 다이어트 (Token Efficiency & Runtime Report Contract)**:
   - 파일 조회 시 전체 파일을 무분별하게 읽지 않고 필요한 라인 범위(`StartLine`/`EndLine`)만 정밀하게 읽습니다.
   - 사용자가 명시적으로 요청하지 않은 리포트 문서([`DVIEW_PORTFOLIO DVIEW - Engineering Report.md`](./DVIEW_PORTFOLIO%20DVIEW%20-%20Engineering%20Report.md), [`DVIEW_PORTFOLIO DVIEW - Patch History.md`](./DVIEW_PORTFOLIO%20DVIEW%20-%20Patch%20History.md), [`DVIEW_PROJECT.md`](./DVIEW_PROJECT.md) 등)를 매 작업마다 자동으로 읽거나 동시 수정하지 않습니다.
   - `DVIEW_PORTFOLIO DVIEW - Engineering Report.md`는 `getEngineeringReport.ts` 및 `ReportClient.tsx`(`EngineeringReportClient.tsx`)를 통해 웹 화면에 직접 파싱·렌더링되므로, 수정 시 상단 제목(`# ... PORTFOLIO DVIEW ...`) 및 메타데이터(`> **Date**: ... | **Grade**: ... | **Branch**: ... | **Status**: ...`) 규격을 임의로 훼손하지 않습니다.
   - 자동 타이머(`schedule`) 연속 예약이나 무한 자기개선 루프를 임의로 가동하지 않으며, 사용자의 요청 범위에만 정확히 집중하여 응답합니다.
2. **프로젝트 표준 스킬·루트 SSOT 및 데드엔드 우선 참조**:
   - 실거래가 파이프라인, 애드센스·GA4 텔레메트리, 디자인 검증 등 도구 작업 수행 시 루트 `.agent/skills/` 내 프로젝트 전용 스킬 3종([`dview-real-data-pipeline`](./.agent/skills/dview-real-data-pipeline/SKILL.md), [`dview-adsense-telemetry`](./.agent/skills/dview-adsense-telemetry/SKILL.md), [`dview-design-compliance`](./.agent/skills/dview-design-compliance/SKILL.md)), 루트 `.agent/workflows/`([`DVIEW_git-push.md`](./.agent/workflows/DVIEW_git-push.md), [`DVIEW_localhost-open.md`](./.agent/workflows/DVIEW_localhost-open.md)) 및 재시도 금지 실패 기록([`DEAD_ENDS.md`](./DEAD_ENDS.md))을 단일 진실 공급원(SSOT)으로 우선 참조합니다.
3. **데이터 정합성 및 트랜잭션 안전성**:
   - 다중 문서 상태 변경 시 Firestore Transaction(`runTransaction`) 또는 `writeBatch`를 사용합니다.
   - Firestore `updateDoc`에는 `.withConverter()`가 결합되지 않은 순수 `DocumentReference`를 사용합니다.
4. **Git 커밋 및 푸시 수칙 ([`.agent/workflows/DVIEW_git-push.md`](./.agent/workflows/DVIEW_git-push.md))**:
   - 사용자가 명시적으로 **"푸시"**(`push`, `git push`)를 지시하지 않은 경우, 원격 저장소 푸시를 자동 실행하지 않고 로컬 커밋(`git commit`)까지만 수행합니다.
