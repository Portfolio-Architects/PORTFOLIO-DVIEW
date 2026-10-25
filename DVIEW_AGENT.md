# DVIEW (Dongtan View) AI Agent Protocol (Lean Edition)

이 문서는 DVIEW 프로젝트를 담당하는 AI 에이전트의 핵심 행동 강령입니다. 불필요한 토큰 소모와 무한 루프를 배제하고, **구글 애드센스 수익률(AdSense Monetization Yield — RPM, eCPM, CTR, Active Viewability, High-CPC 전환율) 극대화**와 **코드 무결성**에 집중합니다.

---

## 1. 최대 목적함수 (Ultimate Objective Function)

DVIEW의 최우선 목적함수는 동탄 및 반도체 메가 클러스터 초고관여 트래픽을 기반으로 **구글 애드센스 수익률 및 단위 방문자당 순익을 극대화**하는 것입니다:

$$\text{Max } \mathcal{Y}_{\text{AdSense}} = \sum_{s \in \text{Slots}} \Big[ \text{PV} \times \text{AdDensity}(s) \times \text{Viewability}(s) \times \text{CTR}(s) \times \text{CPC}(s) \times (1 - \text{AdBlockRate}) \Big] + \text{Yield}_{\text{NativeCPA}}$$

1. **디자인 시스템 단일 진실 공급원(SSOT)**: 모든 UI/UX 작업은 [`DVIEW_DESIGN.md`](./DVIEW_DESIGN.md)의 **Ad Money (애드 머니)** 디자인 시스템을 준수합니다.
2. **네이티브 콘텐츠-광고 동형화**: 콘텐츠 카드와 광고 슬롯(`AdSlot`)·고단가 CPA 위젯의 곡률(`rounded-2xl`), 보더, 배경 표면 규격을 1:1로 일치시켜 배너 맹목성을 제거하고 CTR을 높입니다.
3. **고단가 금융·부동산 인텐트 연계**: 주담대·대환대출·세무·밸류에이션·테크노밸리 입주 등 고단가(High-CPC) 광고주 입찰 효율을 높이는 시맨틱 구조를 유지합니다.

---

## 2. Stop-the-Line (5대 필수 안전장치)

1. **Zero-Jank & Zero-CLS ($\text{CLS} < 0.001$)**: 광고 슬롯별 최소 높이(`min-h-[140px]`, `min-h-[250px]`, `min-h-[90px]`) 사전 예약 및 매크로 히어로 2열 대칭(`lg:h-[566px]`)을 유지합니다.
2. **Type & Compile 무결성**: `npx tsc --noEmit` 에러 0건을 유지하며 `any` 타입 남용을 금지합니다.
3. **Ad Money 디자인 시스템 준수**: Slate 무채색 베이스와 Trust Blue(`#2563eb`) / Value Emerald(`#059669`) / Alert Red(`#f04452`) 시맨틱 토큰만 사용하며, 유니코드 이모티콘 대신 `lucide-react` 아이콘만 사용합니다.
4. **Strict Real-Data Only**: 추정치, 샘플, Mock 데이터 사용을 엄격히 금지하며, 국토교통부·화성시 등 100% 실제 검증된 공공 데이터만 표시합니다.
5. **AdSense 정책 준수**: 강제 클릭 유도, 광고 가림, 무효 트래픽 유발 행위를 엄격히 금지합니다.

---

## 3. 토큰 효율화 및 개발 수칙 (Token Diet & Engineering Rules)

1. **컨텍스트 및 토큰 다이어트 (Token Efficiency)**:
   - 파일 조회 시 전체 파일을 무분별하게 읽지 않고 필요한 라인 범위(`StartLine`/`EndLine`)만 정밀하게 읽습니다.
   - 사용자가 명시적으로 요청하지 않은 리포트 문서(`Engineering Report.md`, `Patch History.md`, `PROJECT.md` 등)를 매 작업마다 자동으로 읽거나 동시 수정하지 않습니다.
   - 자동 타이머(`schedule`) 연속 예약이나 무한 자기개선 루프를 임의로 가동하지 않으며, 사용자의 요청 범위에만 정확히 집중하여 응답합니다.
2. **데이터 정합성 및 트랜잭션 안전성**:
   - 다중 문서 상태 변경 시 Firestore Transaction(`runTransaction`) 또는 `writeBatch`를 사용합니다.
   - Firestore `updateDoc`에는 `.withConverter()`가 결합되지 않은 순수 `DocumentReference`를 사용합니다.
3. **Git 커밋 및 푸시 수칙**:
   - 사용자가 명시적으로 **"푸시"**(`push`, `git push`)를 지시하지 않은 경우, 원격 저장소 푸시를 자동 실행하지 않고 로컬 커밋(`git commit`)까지만 수행합니다.
