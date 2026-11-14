import React from 'react';
import fs from 'fs';
import path from 'path';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdSlot from '@/components/ads/AdSlot';
import ApartmentPage from '@/app/apartment/[aptName]/page';
import StatsPage from '@/app/stats/page';
import {
  DVIEW_COPY_BUDGETS,
  SINGLE_CARD_SIGNAL_CAP,
  normalizeMicroCopy,
  splitGraphemes,
  measureCopyLength,
  hasVerboseProseEnding,
  checkCopyBudget,
  truncateToCopyBudget,
  getVisualSignalPillClass,
  getSeoAccordionClass,
  getSeoAccordionSummaryClass,
  getSeoAccordionChevronClass,
  getSeoAccordionBodyClass,
  auditSeoSemanticContainer,
  type CopySlotType,
} from './copyDiet';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/stats',
}));

jest.mock('@/components/DashboardClient', () => {
  return function MockDashboardClient() {
    return <div data-testid="mock-dashboard-client">Dashboard Client</div>;
  };
});

const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
const PROHIBITED_TAILWIND_COLOR_REGEX =
  /(?:^|[\s"'`:])(?:bg-|text-|border-|from-|to-|via-|ring-)?(?:pink|purple|fuchsia|violet|indigo|yellow|orange|amber|rose|teal|cyan|sky|green|zinc|neutral|stone|gray)-(?:\d+|\*)/;

describe('Ad Money v5.1 Copy Diet, Visual Signal & Semantic SEO Dual-Layer SSOT', () => {
  const repoRoot = path.resolve(__dirname, '../../../..');
  const designDocPath = path.join(repoRoot, 'DVIEW_DESIGN.md');
  const copyDietTsPath = path.resolve(__dirname, './copyDiet.ts');
  const globalsCssPath = path.resolve(__dirname, '../../app/globals.css');
  const txSummaryPath = path.resolve(__dirname, '../../../public/data/tx-summary.json');
  const aptsByDongPath = path.resolve(__dirname, '../../../public/data/apartments-by-dong.json');
  const jisanListPath = path.resolve(__dirname, '../../../public/data/jisan-status-list.json');

  beforeAll(() => {
    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      configurable: true,
      value: class MockIntersectionObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    });
  });

  describe('1. DVIEW_DESIGN.md <-> copyDiet.ts <-> globals.css 1:1 Specification Sync', () => {
    const designMd = fs.readFileSync(designDocPath, 'utf8');
    const copyDietSource = fs.readFileSync(copyDietTsPath, 'utf8');
    const cssContent = fs.readFileSync(globalsCssPath, 'utf8');

    it('codifies all 3 core pillars (Copy Diet, Visual Signal First, Semantic SEO Accordion) in DVIEW_DESIGN.md', () => {
      expect(designMd).toContain('Ad Money (애드 머니 v5.1)');
      expect(designMd).toContain('### 1.6 Visual-First Copy Diet & Semantic SEO Dual-Layer');
      expect(designMd).toContain('### 3.4 Progressive SEO Disclosure Accordion');
      expect(designMd).toContain(
        '## 7. Copy Diet, Visual-First Signal & Semantic SEO Dual-Layer Specification'
      );
      expect(designMd).toContain('### 7.1 Copy Diet Budgets');
      expect(designMd).toContain('### 7.2 Visual Signal First Matrix');
      expect(designMd).toContain('### 7.3 Semantic SEO Dual-Layer & Native `<details>` Accordion Rules');
    });

    it('keeps every DVIEW_COPY_BUDGETS maxChars threshold AND every [금지]/[권장] example in exact mathematical sync with Section 7.1', () => {
      const slots = Object.keys(DVIEW_COPY_BUDGETS) as CopySlotType[];
      expect(slots.length).toBe(11);

      for (const slot of slots) {
        const expectedMax = DVIEW_COPY_BUDGETS[slot].maxChars;
        const rowRegex = new RegExp(
          `\\|\\s*\`${slot}\`\\s*\\|[^|]+\\|\\s*\\*\\*${expectedMax}자(?:\\s*\\([^)]*\\))?\\*\\*\\s*\\|([^\\n]+)`
        );
        const match = designMd.match(rowRegex);
        expect(match).not.toBeNull();

        if (slot === 'layer1ProseParagraph') {
          continue;
        }

        const rowTail = match![1];
        const forbiddenMatch = rowTail.match(/`\[금지\]`\s*`([^`]+)`\s*\((\d+)자\)/);
        const recommendedMatch = rowTail.match(/`\[권장\]`\s*`([^`]+)`\s*\((\d+)/);

        expect(forbiddenMatch).not.toBeNull();
        expect(recommendedMatch).not.toBeNull();

        const [, forbiddenText, forbiddenDocCount] = forbiddenMatch!;
        const [, recommendedText, recommendedDocCount] = recommendedMatch!;

        expect(measureCopyLength(forbiddenText)).toBe(Number(forbiddenDocCount));
        const forbiddenCheck = checkCopyBudget(forbiddenText, slot);
        expect(!forbiddenCheck.withinBudget || forbiddenCheck.hasVerboseEnding).toBe(true);

        expect(measureCopyLength(recommendedText)).toBe(Number(recommendedDocCount));
        const recommendedCheck = checkCopyBudget(recommendedText, slot);
        expect(recommendedCheck.withinBudget).toBe(true);
        expect(recommendedCheck.hasVerboseEnding).toBe(false);
        expect(recommendedCheck.recommendedAction).toBe('ok');
      }
    });

    it('enforces Zero Unicode Emoji Policy and Zero Prohibited Color Tokens across DVIEW_DESIGN.md and copyDiet.ts', () => {
      expect(designMd).not.toMatch(EMOJI_REGEX);
      expect(copyDietSource).not.toMatch(EMOJI_REGEX);
      expect(copyDietSource).not.toMatch(PROHIBITED_TAILWIND_COLOR_REGEX);
      expect(copyDietSource).not.toContain('font-mono');

      const nonProhibitedListLines = designMd
        .split(/\r?\n/)
        .filter((line) => !line.includes('**금지 목록**:'));
      for (const line of nonProhibitedListLines) {
        expect(line).not.toMatch(PROHIBITED_TAILWIND_COLOR_REGEX);
      }
    });

    it('defines .dview-seo-accordion rules inside @layer components in globals.css with rotate: 180deg (avoiding 360deg transform+rotate collision) and without @apply', () => {
      expect(cssContent).toContain('@layer components');
      expect(cssContent).toContain('.dview-seo-accordion');
      expect(cssContent).toContain('.dview-seo-accordion-summary');
      expect(cssContent).toContain('-webkit-tap-highlight-color: transparent');
      expect(cssContent).toContain('.dview-seo-accordion-summary::-webkit-details-marker');
      expect(cssContent).toContain('.dview-seo-accordion-summary::marker');
      expect(cssContent).toContain('.dview-seo-accordion-chevron');
      expect(cssContent).toContain('.dview-seo-accordion[open] .dview-seo-accordion-chevron');
      expect(cssContent).toContain('rotate: 180deg;');
      expect(cssContent).not.toContain('transform: rotate(180deg)');
      expect(cssContent).toContain('.dview-seo-accordion-body');
      expect(cssContent).not.toContain('@apply');
    });
  });

  describe('2. Real Dongtan Dataset (tx-summary, apartments-by-dong, jisan-status-list) Empirical Calibration', () => {
    it('accommodates all 185 tx-summary keys (up to 21 chars), 183 display apartment names (up to 22 chars), and 56 TechnoValley complexes within pageH1 32-char ceiling', () => {
      const txRaw = JSON.parse(fs.readFileSync(txSummaryPath, 'utf8'));
      const summaryMap = txRaw.summary || txRaw;
      const txNames = Object.keys(summaryMap);
      expect(txNames.length).toBeGreaterThanOrEqual(185);

      const byDongRaw = JSON.parse(fs.readFileSync(aptsByDongPath, 'utf8'));
      const byDongMap = byDongRaw.byDong || byDongRaw.apartments || byDongRaw;
      const dongDisplayNames = Object.values(byDongMap)
        .filter(Array.isArray)
        .flat()
        .map((apt: { name?: string }) => String(apt?.name || ''))
        .filter(Boolean);
      expect(dongDisplayNames.length).toBeGreaterThanOrEqual(183);
      expect(Math.max(...dongDisplayNames.map((n) => measureCopyLength(n)))).toBe(22);

      const jisanRaw = JSON.parse(fs.readFileSync(jisanListPath, 'utf8'));
      const jisanList = Array.isArray(jisanRaw) ? jisanRaw : jisanRaw.items || [];
      const jisanNames = jisanList
        .map((j: { name?: string }) => String(j?.name || ''))
        .filter(Boolean);
      expect(jisanNames.length).toBe(56);

      for (const entityName of [...txNames, ...dongDisplayNames, ...jisanNames]) {
        const conciseH1 = `${entityName} 실거래 · 입지`;
        const validation = checkCopyBudget(conciseH1, 'pageH1');
        expect(validation.withinBudget).toBe(true);
        expect(validation.hasVerboseEnding).toBe(false);
        expect(validation.recommendedAction).toBe('ok');
      }
    });
  });

  describe('3. Copy Measurement, ZWJ Grapheme Preservation, Boundary Validation & Safe Truncation', () => {
    it('strips invisible format artifacts while strictly preserving Unicode ZWJ/ZWNJ grapheme clusters', () => {
      expect(normalizeMicroCopy('')).toBe('');
      expect(normalizeMicroCopy('   \n\t  ')).toBe('');
      expect(normalizeMicroCopy('\uFEFF동탄역\u200B\u2060\u00AD   롯데캐슬\n실거래  ')).toBe(
        '동탄역 롯데캐슬 실거래'
      );
      expect(normalizeMicroCopy(null as unknown as string)).toBe('');
      expect(normalizeMicroCopy(undefined as unknown as string)).toBe('');
      expect(splitGraphemes('')).toEqual([]);
      expect(measureCopyLength('   ')).toBe(0);

      // ZWJ multi-codepoint cluster must stay 1 grapheme, never torn into 4 codepoints
      const zwjCluster = '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}';
      expect(normalizeMicroCopy(zwjCluster)).toBe(zwjCluster);
      expect(measureCopyLength(zwjCluster)).toBe(1);
      expect(measureCopyLength(`${zwjCluster} 가나다`)).toBe(5);
    });

    it('enforces exact maxChars boundaries (maxChars - 1, maxChars, maxChars + 1) across all slots', () => {
      const slots = Object.keys(DVIEW_COPY_BUDGETS) as CopySlotType[];

      for (const slot of slots) {
        const max = DVIEW_COPY_BUDGETS[slot].maxChars;
        if (max === 0) {
          const emptyRes = checkCopyBudget('   ', slot);
          expect(emptyRes.withinBudget).toBe(true);
          expect(emptyRes.overBy).toBe(0);
          expect(emptyRes.recommendedAction).toBe('ok');

          const oneCharRes = checkCopyBudget('가', slot);
          expect(oneCharRes.withinBudget).toBe(false);
          expect(oneCharRes.overBy).toBe(1);
          expect(oneCharRes.recommendedAction).toBe('move-to-layer2-accordion');
          continue;
        }

        const under = '가'.repeat(max - 1);
        const exact = '가'.repeat(max);
        const over = '가'.repeat(max + 1);

        expect(checkCopyBudget(under, slot)).toMatchObject({
          withinBudget: true,
          charCount: max - 1,
          overBy: 0,
          recommendedAction: 'ok',
        });
        expect(checkCopyBudget(exact, slot)).toMatchObject({
          withinBudget: true,
          charCount: max,
          overBy: 0,
          recommendedAction: 'ok',
        });
        expect(checkCopyBudget(over, slot)).toMatchObject({
          withinBudget: false,
          charCount: max + 1,
          overBy: 1,
          recommendedAction:
            max + 1 > DVIEW_COPY_BUDGETS.inlineNotice.maxChars
              ? 'move-to-layer2-accordion'
              : 'compress-or-replace-with-visual-signal',
        });
      }
    });

    it('flags verbose Korean predicate endings even when charCount is under maxChars', () => {
      expect(hasVerboseProseEnding('실수요 지지력을 계측합니다.')).toBe(true);
      expect(hasVerboseProseEnding('자금 리스크를 진단합니다')).toBe(true);
      expect(hasVerboseProseEnding('상세 내역을 확인할 수 있습니다!')).toBe(true);
      expect(hasVerboseProseEnding('+3.4% · 전월 대비')).toBe(false);
      expect(hasVerboseProseEnding('동탄역 420m · 도보 6분')).toBe(false);

      const shortButVerbose = checkCopyBudget('리스크를 진단합니다', 'sectionSubtitle');
      expect(shortButVerbose.withinBudget).toBe(true);
      expect(shortButVerbose.hasVerboseEnding).toBe(true);
      expect(shortButVerbose.recommendedAction).toBe('compress-or-replace-with-visual-signal');
    });

    it('rejects unknown or prototype-polluting slot keys with RangeError', () => {
      expect(() => checkCopyBudget('테스트', 'nonExistentSlot' as CopySlotType)).toThrow(
        RangeError
      );
      expect(() => checkCopyBudget('테스트', 'toString' as CopySlotType)).toThrow(RangeError);
      expect(() => checkCopyBudget('테스트', '__proto__' as CopySlotType)).toThrow(RangeError);
      expect(() => truncateToCopyBudget('테스트', 'constructor' as CopySlotType)).toThrow(
        RangeError
      );
    });

    it('guarantees measureCopyLength(truncateToCopyBudget(text, slot)) <= maxChars and strips dangling operators and unclosed bracket clauses', () => {
      expect(truncateToCopyBudget('', 'kpiLabel')).toBe('');
      expect(truncateToCopyBudget('1개월 평균 매매', 'kpiLabel')).toBe('1개월 평균 매매');
      expect(truncateToCopyBudget('장문 해설 문단입니다.', 'layer1ProseParagraph')).toBe('');

      const overKpi = truncateToCopyBudget('최근 1개월 실거래 평균 매매가격', 'kpiLabel');
      expect(overKpi.endsWith('…')).toBe(true);
      expect(measureCopyLength(overKpi)).toBeLessThanOrEqual(DVIEW_COPY_BUDGETS.kpiLabel.maxChars);
      expect(checkCopyBudget(overKpi, 'kpiLabel').withinBudget).toBe(true);

      // Dangling middle-dot / tilde / CJK corner bracket right before cut point is stripped cleanly
      const danglingSep = truncateToCopyBudget('동탄역 · 도보 6분 역세권 프리미엄', 'kpiLabel');
      expect(danglingSep).not.toMatch(/[·\s(~+「]…$/);
      expect(measureCopyLength(danglingSep)).toBeLessThanOrEqual(
        DVIEW_COPY_BUDGETS.kpiLabel.maxChars
      );

      const danglingCorner = truncateToCopyBudget('전세가율 안전 「HUG 보증」', 'signalBadge');
      expect(danglingCorner).toBe('전세가율 안전…');
      expect(measureCopyLength(danglingCorner)).toBeLessThanOrEqual(
        DVIEW_COPY_BUDGETS.signalBadge.maxChars
      );

      const danglingTilde = truncateToCopyBudget('전세가율 65 ~ 74% 지지대', 'signalBadge');
      expect(danglingTilde).not.toContain('~…');
      expect(measureCopyLength(danglingTilde)).toBeLessThanOrEqual(
        DVIEW_COPY_BUDGETS.signalBadge.maxChars
      );

      // Unclosed mid-word parenthesis "(HU…" is stripped back to "전세 안전…", while balanced "(주)" prefix stays intact
      const unclosedParen = truncateToCopyBudget('전세 안전 (HUG 보증 기준)', 'kpiLabel');
      expect(unclosedParen).toBe('전세 안전…');
      expect(measureCopyLength(unclosedParen)).toBeLessThanOrEqual(
        DVIEW_COPY_BUDGETS.kpiLabel.maxChars
      );

      const balancedPrefix = truncateToCopyBudget('(주)유앤미개발 지식산업센터 현황', 'kpiLabel');
      expect(balancedPrefix.startsWith('(주)유앤미개발')).toBe(true);
      expect(measureCopyLength(balancedPrefix)).toBeLessThanOrEqual(
        DVIEW_COPY_BUDGETS.kpiLabel.maxChars
      );

      // Whitespace-only ellipsis falls back to '…', empty '' ellipsis truncates cleanly, oversized ellipsis stays within budget
      const spaceEllipsis = truncateToCopyBudget('전세가율 안전 구간 진입 완료', 'signalBadge', '   ');
      expect(spaceEllipsis.endsWith('…')).toBe(true);
      expect(measureCopyLength(spaceEllipsis)).toBeLessThanOrEqual(
        DVIEW_COPY_BUDGETS.signalBadge.maxChars
      );

      const noEllipsis = truncateToCopyBudget('전세가율 안전 구간 진입 완료', 'signalBadge', '');
      expect(measureCopyLength(noEllipsis)).toBeLessThanOrEqual(
        DVIEW_COPY_BUDGETS.signalBadge.maxChars
      );

      const threeDot = truncateToCopyBudget('전세가율 안전 구간 진입 완료', 'signalBadge', '...');
      expect(measureCopyLength(threeDot)).toBeLessThanOrEqual(
        DVIEW_COPY_BUDGETS.signalBadge.maxChars
      );

      const oversizedEllipsis = truncateToCopyBudget(
        '전세가율 안전 구간 진입 완료',
        'signalBadge',
        '............'
      );
      expect(measureCopyLength(oversizedEllipsis)).toBe(DVIEW_COPY_BUDGETS.signalBadge.maxChars);
    });
  });

  describe('4. Visual Signal Pill & Progressive SEO Accordion Helpers', () => {
    it('builds visual signal pills with tabular-nums, non-elevated neutral contrast token, and safe runtime fallbacks', () => {
      expect(SINGLE_CARD_SIGNAL_CAP).toEqual({
        maxHeroMetrics: 1,
        maxSupportingSignals: 2,
      });

      const upCls = getVisualSignalPillClass('up', 'ml-1');
      expect(upCls).toContain('tabular-nums');
      expect(upCls).toContain('bg-brand-red-light');
      expect(upCls).toContain('text-brand-red');
      expect(upCls).toContain('ml-1');

      const downCls = getVisualSignalPillClass({ tone: 'down', size: 'sm' });
      expect(downCls).toContain('bg-brand-blue-light');
      expect(downCls).toContain('text-brand-blue');
      expect(downCls).toContain('text-[12px]');

      const safeCls = getVisualSignalPillClass('safe');
      expect(safeCls).toContain('bg-brand-green-light');
      expect(safeCls).toContain('text-brand-green');

      const neutralCls = getVisualSignalPillClass('neutral');
      expect(neutralCls).toContain('bg-[#f2f4f6]');
      expect(neutralCls).toContain('dark:bg-[#202027]');
      expect(neutralCls).not.toContain('bg-elevated');

      const fallbackCls = getVisualSignalPillClass({
        tone: 'toString' as unknown as 'neutral',
        size: '__proto__' as unknown as 'xs',
      });
      expect(fallbackCls).toContain('bg-[#f2f4f6]');
      expect(fallbackCls).toContain('text-secondary');
    });

    it('builds soft-surface native <details>/<summary> SEO accordion classes with Tailwind v4 group-open cascade parity', () => {
      const containerCls = getSeoAccordionClass('mt-4');
      expect(containerCls).toContain('group');
      expect(containerCls).toContain('dview-seo-accordion');
      expect(containerCls).toContain('bg-[#f9fafb]');
      expect(containerCls).toContain('dark:bg-[#17171c]');
      expect(containerCls).toContain('rounded-2xl');
      expect(containerCls).toContain('mt-4');

      const summaryCls = getSeoAccordionSummaryClass();
      expect(summaryCls).toContain('dview-seo-accordion-summary');
      expect(summaryCls).toContain('min-h-[48px]');
      expect(summaryCls).toContain('group-open:text-primary');

      const chevronCls = getSeoAccordionChevronClass();
      expect(chevronCls).toContain('dview-seo-accordion-chevron');
      expect(chevronCls).toContain('group-open:rotate-180');
      expect(chevronCls).toContain('group-open:text-brand');

      expect(getSeoAccordionBodyClass()).toContain('dview-seo-accordion-body');
    });
  });

  describe('5. Hardened Semantic SEO Dual-Layer & Anti-Cloaking / AdSlot Guardrail Auditor', () => {
    it('passes a compliant Dual-Layer layout and preserves 100% SSR crawlable text inside collapsed <details>', () => {
      const { container } = render(
        <main>
          <a href="#main-body" className="skip-to-content">
            본문 바로가기
          </a>
          <header>
            <h1>동탄역롯데캐슬 실거래 · 입지</h1>
            <label htmlFor="apt-search" className="sr-only">
              단지명 검색
            </label>
            <input id="apt-search" type="search" />
            <button type="button" aria-label="알림">
              <svg aria-hidden="true" />
              <span className="sr-only">관심 단지 알림 열기</span>
            </button>
          </header>

          {/* Layer 1: Visual Decision Canvas + Semantic Table (real 동탄역롯데캐슬 84.70㎡ max 22억2,500) + Visible AdSlot */}
          <section id="main-body">
            <h2>평형별 실거래 · 전세가율</h2>
            <table>
              <caption className="sr-only">동탄역롯데캐슬 평형별 실거래가 및 전세가율 표</caption>
              <thead>
                <tr>
                  <th scope="col">전용면적</th>
                  <th scope="col">최고 실거래</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">84.70㎡</th>
                  <td>22억2,500</td>
                </tr>
              </tbody>
            </table>
            <div data-testid="ssr-adslot-ch02" className="min-h-[250px]">
              <AdSlot format="banner" />
            </div>
          </section>

          {/* Layer 2: Progressive SEO Disclosure Accordion (collapsed by default) */}
          <details className={getSeoAccordionClass()}>
            <summary className={getSeoAccordionSummaryClass()}>
              <span>밸류에이션 산출 기준 · 입지 해설 더보기</span>
              <svg aria-hidden="true" className={getSeoAccordionChevronClass()} />
            </summary>
            <div className={getSeoAccordionBodyClass()}>
              <p>
                동탄역 복합환승센터(GTX-A·SRT) 직결 역세권 입지와 초등학교 배정 학군 데이터를 결합한 정량 분석 해설입니다.
              </p>
            </div>
          </details>
        </main>
      );

      const detailsEl = container.querySelector('details') as HTMLDetailsElement;
      expect(detailsEl).not.toBeNull();
      expect(detailsEl.open).toBe(false);
      expect(container.textContent).toContain('동탄역 복합환승센터(GTX-A·SRT) 직결 역세권 입지');

      const audit = auditSeoSemanticContainer(container);
      expect(audit.valid).toBe(true);
      expect(audit.h1Count).toBe(1);
      expect(audit.accordionCount).toBe(1);
      expect(audit.adSlotsInsideAccordionCount).toBe(0);
      expect(audit.illegalSrOnlyCount).toBe(0);
      expect(audit.illegalProseCloakingCount).toBe(0);
      expect(audit.violations).toEqual([]);
    });

    it('detects inline-style cloaking, offscreen negative classes, hidden <div>/<ul> prose, .sr-only stuffing on <a>/<label>, and real <AdSlot /> inside <details> without double-counting', () => {
      // Case A: Inline-style cloaked H1 + !sr-only bypass
      const { container: inlineCloakedH1 } = render(
        <div style={{ display: 'none' }}>
          <h1 className="!sr-only">인라인 스타일로 숨긴 H1</h1>
        </div>
      );
      const resA = auditSeoSemanticContainer(inlineCloakedH1.firstElementChild!);
      expect(resA.valid).toBe(false);
      expect(resA.violations.map((v) => v.code)).toEqual(
        expect.arrayContaining(['H1_CLOAKED', 'ILLEGAL_SR_ONLY_CLOAKING'])
      );

      // Case B: Responsive mobile-hidden H1 (violates Google Mobile-First Indexing)
      const { container: mobileHiddenH1 } = render(
        <div className="hidden md:block">
          <h1>데스크톱에서만 보이는 H1</h1>
        </div>
      );
      const resMobileH1 = auditSeoSemanticContainer(mobileHiddenH1);
      expect(resMobileH1.valid).toBe(false);
      expect(resMobileH1.violations.map((v) => v.code)).toContain('H1_CLOAKED');

      // Case C: Real <AdSlot /> (placeholder mode without ins.adsbygoogle) inside <details>,
      // plus inline style font-size:0, offscreen -left-[9999px], hidden <div>, and <a> .sr-only keyword stuffing
      const { container: adversarialDom } = render(
        <div>
          <h1>동탄역롯데캐슬 실거래 · 입지</h1>
          <a href="/explore">
            탐색
            <span className="sr-only">
              동탄 아파트 시세 실거래가 전세가율 학군 역세권 비교 키워드 스터핑 장문 은닉 텍스트입니다
            </span>
          </a>
          <label className="sr-only">연결된 입력 필드 없는 숨김 레이블</label>
          <div className="hidden">DIV에 직접 넣은 숨김 키워드 스터핑 텍스트</div>
          <div style={{ fontSize: 0 }}>
            <p>폰트 크기 0으로 숨긴 스팸 문단</p>
          </div>
          <section className="-left-[9999px] absolute">
            <h2>음수 오프스크린 좌표로 숨긴 제목</h2>
          </section>
          <ul style={{ opacity: 0 }}>
            <li>투명도 0 인라인 스타일 리스트</li>
          </ul>
          <details className={getSeoAccordionClass()}>
            <summary>상세 해설</summary>
            <div data-testid="ssr-adslot-nested">
              <AdSlot format="in-feed" />
            </div>
          </details>
        </div>
      );

      const resC = auditSeoSemanticContainer(adversarialDom);
      expect(resC.valid).toBe(false);
      expect(resC.adSlotsInsideAccordionCount).toBe(1);
      expect(resC.illegalSrOnlyCount).toBe(2);
      expect(resC.illegalProseCloakingCount).toBe(4);
      expect(resC.violations.map((v) => v.code)).toEqual(
        expect.arrayContaining([
          'ILLEGAL_SR_ONLY_CLOAKING',
          'ILLEGAL_PROSE_CLOAKING',
          'ADSLOT_INSIDE_ACCORDION',
        ])
      );
    });

    it('passes real production <StatsPage /> and <ApartmentPage /> SSR renders with zero false-positive violations', async () => {
      const { container: statsContainer, unmount: unmountStats } = render(<StatsPage />);
      const statsAudit = auditSeoSemanticContainer(statsContainer);
      expect(statsAudit.valid).toBe(true);
      expect(statsAudit.violations).toEqual([]);
      unmountStats();

      const aptJsx = await ApartmentPage({
        params: Promise.resolve({ aptName: encodeURIComponent('동탄역롯데캐슬') }),
      });
      const { container: aptContainer, unmount: unmountApt } = render(aptJsx);
      const aptAudit = auditSeoSemanticContainer(aptContainer);
      expect(aptAudit.valid).toBe(true);
      expect(aptAudit.violations).toEqual([]);
      unmountApt();
    });
  });
});
