/**
 * DVIEW — Ad Money v5.1 Visual-First Copy Diet & Semantic SEO Dual-Layer SSOT
 *
 * Single Source of Truth (SSOT) corresponding to DVIEW_DESIGN.md:
 * - Section 1.6: Visual-First Copy Diet & Semantic SEO Dual-Layer
 * - Section 3.4: Progressive SEO Disclosure Accordion
 * - Section 7.1: Copy Diet Budgets (DVIEW_COPY_BUDGETS)
 * - Section 7.2: Visual Signal First Matrix (getVisualSignalPillClass)
 * - Section 7.3: Semantic SEO Dual-Layer & Anti-Cloaking / Zero-AdSlot Guardrails
 */

export type CopySlotType =
  | 'pageH1'
  | 'sectionTitle'
  | 'sectionSubtitle'
  | 'kpiLabel'
  | 'kpiCaption'
  | 'signalBadge'
  | 'keyTakeaway'
  | 'cardDescription'
  | 'accordionSummary'
  | 'inlineNotice'
  | 'layer1ProseParagraph';

export type ContentLayerTarget = 'layer1-visual-canvas' | 'layer2-seo-accordion';

export interface CopySlotBudgetSpec {
  readonly maxChars: number;
  readonly maxLines: number;
  readonly maxItems?: number;
  readonly targetLayer: ContentLayerTarget;
  readonly truncationClass: string;
}

export const DVIEW_COPY_BUDGETS: Readonly<Record<CopySlotType, CopySlotBudgetSpec>> = {
  pageH1: {
    maxChars: 32,
    maxLines: 2,
    targetLayer: 'layer1-visual-canvas',
    truncationClass: 'line-clamp-2 sm:line-clamp-1',
  },
  sectionTitle: {
    maxChars: 22,
    maxLines: 1,
    targetLayer: 'layer1-visual-canvas',
    truncationClass: 'truncate',
  },
  sectionSubtitle: {
    maxChars: 40,
    maxLines: 1,
    targetLayer: 'layer1-visual-canvas',
    truncationClass: 'line-clamp-1',
  },
  kpiLabel: {
    maxChars: 10,
    maxLines: 1,
    targetLayer: 'layer1-visual-canvas',
    truncationClass: 'whitespace-nowrap truncate',
  },
  kpiCaption: {
    maxChars: 18,
    maxLines: 1,
    targetLayer: 'layer1-visual-canvas',
    truncationClass: 'truncate',
  },
  signalBadge: {
    maxChars: 10,
    maxLines: 1,
    targetLayer: 'layer1-visual-canvas',
    truncationClass: 'whitespace-nowrap',
  },
  keyTakeaway: {
    maxChars: 45,
    maxLines: 2,
    maxItems: 3,
    targetLayer: 'layer1-visual-canvas',
    truncationClass: 'line-clamp-2',
  },
  cardDescription: {
    maxChars: 50,
    maxLines: 2,
    targetLayer: 'layer1-visual-canvas',
    truncationClass: 'line-clamp-2',
  },
  accordionSummary: {
    maxChars: 30,
    maxLines: 1,
    targetLayer: 'layer2-seo-accordion',
    truncationClass: 'truncate',
  },
  inlineNotice: {
    maxChars: 80,
    maxLines: 2,
    targetLayer: 'layer1-visual-canvas',
    truncationClass: 'line-clamp-2',
  },
  layer1ProseParagraph: {
    maxChars: 0,
    maxLines: 0,
    targetLayer: 'layer2-seo-accordion',
    truncationClass: '',
  },
} as const;

export const SINGLE_CARD_SIGNAL_CAP = {
  maxHeroMetrics: 1,
  maxSupportingSignals: 2,
} as const;

export const SEO_FORBIDDEN_CLOAKING_CLASSES = [
  'sr-only',
  '!sr-only',
  'hidden',
  '!hidden',
  'invisible',
  '!invisible',
  'opacity-0',
  '!opacity-0',
  'scale-0',
  'text-[0px]',
] as const;

/**
 * Matches verbose Korean explanatory predicate endings that violate the
 * Section 7.1 Zero Verbose Predicate Rule in Layer 1 micro-copy.
 */
export const VERBOSE_PROSE_ENDING_REGEX =
  /(?:계측합니다|진단합니다|산출합니다|확인할\s*수\s*있습니다|확인하실\s*수\s*있습니다|제공합니다|제공해\s*드립니다|비교해\s*드립니다|나타냅니다|형성합니다|공유합니다|기록\s*중입니다|분석합니다|해설합니다|소요됩니다|상승했습니다|하락했습니다)\s*[.!]?$/u;

/**
 * Strips invisible formatting artifacts (ZWSP, Word Joiner, Soft Hyphen, BOM)
 * while strictly preserving ZWNJ (\u200C) and ZWJ (\u200D) so multi-codepoint
 * Unicode grapheme clusters remain intact under Intl.Segmenter.
 */
const INVISIBLE_FORMAT_ARTIFACTS_REGEX = /[\u00AD\u200B\u2060\uFEFF]/g;
const TRAILING_DANGLING_SEPARATOR_REGEX =
  /[\s·,|/\\\-:;,.~+([<{「『【〈《“‘"']+$/u;

const BRACKET_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['(', ')'],
  ['[', ']'],
  ['{', '}'],
  ['「', '」'],
  ['『', '』'],
  ['【', '】'],
  ['〈', '〉'],
  ['《', '》'],
];

const OPEN_TO_CLOSE_BRACKET = new Map<string, string>(BRACKET_PAIRS);
const CLOSE_TO_OPEN_BRACKET = new Map<string, string>(
  BRACKET_PAIRS.map(([open, close]) => [close, open])
);

const koGraphemeSegmenter: Intl.Segmenter | null =
  typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter('ko', { granularity: 'grapheme' })
    : null;

export function normalizeMicroCopy(text: string): string {
  if (typeof text !== 'string') return '';
  return text.replace(INVISIBLE_FORMAT_ARTIFACTS_REGEX, '').replace(/\s+/g, ' ').trim();
}

export function splitGraphemes(text: string): string[] {
  if (!text) return [];
  if (koGraphemeSegmenter) {
    const out: string[] = [];
    for (const seg of koGraphemeSegmenter.segment(text)) {
      out.push(seg.segment);
    }
    return out;
  }
  return Array.from(text);
}

export function measureCopyLength(text: string): number {
  const normalized = normalizeMicroCopy(text);
  if (!normalized) return 0;
  return splitGraphemes(normalized).length;
}

export function hasVerboseProseEnding(text: string): boolean {
  const normalized = normalizeMicroCopy(text);
  if (!normalized) return false;
  return VERBOSE_PROSE_ENDING_REGEX.test(normalized);
}

function assertValidCopySlot(slot: CopySlotType): CopySlotBudgetSpec {
  const spec = Object.prototype.hasOwnProperty.call(DVIEW_COPY_BUDGETS, slot)
    ? DVIEW_COPY_BUDGETS[slot]
    : undefined;
  if (!spec) {
    throw new RangeError(`Unknown DVIEW CopySlotType: "${String(slot)}"`);
  }
  return spec;
}

function stripTrailingUnclosedBracketClause(text: string): string {
  const stack: Array<{ char: string; index: number }> = [];
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (OPEN_TO_CLOSE_BRACKET.has(ch)) {
      stack.push({ char: ch, index: i });
    } else if (CLOSE_TO_OPEN_BRACKET.has(ch)) {
      const expectedOpen = CLOSE_TO_OPEN_BRACKET.get(ch);
      if (stack.length > 0 && stack[stack.length - 1].char === expectedOpen) {
        stack.pop();
      }
    }
  }
  if (stack.length === 0) {
    return text;
  }
  const earliestUnclosedIndex = stack[0].index;
  const prefix = text
    .slice(0, earliestUnclosedIndex)
    .replace(TRAILING_DANGLING_SEPARATOR_REGEX, '');
  return prefix.length > 0 ? prefix : text;
}

export type CopyRecommendedAction =
  | 'ok'
  | 'compress-or-replace-with-visual-signal'
  | 'move-to-layer2-accordion';

export interface CopyBudgetValidationResult {
  slot: CopySlotType;
  normalizedText: string;
  charCount: number;
  maxChars: number;
  overBy: number;
  withinBudget: boolean;
  hasVerboseEnding: boolean;
  recommendedAction: CopyRecommendedAction;
}

export function checkCopyBudget(
  text: string,
  slot: CopySlotType
): CopyBudgetValidationResult {
  const spec = assertValidCopySlot(slot);
  const normalizedText = normalizeMicroCopy(text);
  const charCount = normalizedText ? splitGraphemes(normalizedText).length : 0;
  const maxChars = spec.maxChars;
  const overBy = Math.max(0, charCount - maxChars);
  const withinBudget = charCount <= maxChars;
  const hasVerboseEnding = hasVerboseProseEnding(normalizedText);

  let recommendedAction: CopyRecommendedAction = 'ok';
  if (!withinBudget || hasVerboseEnding) {
    if (
      slot === 'layer1ProseParagraph' ||
      charCount > DVIEW_COPY_BUDGETS.inlineNotice.maxChars
    ) {
      recommendedAction = 'move-to-layer2-accordion';
    } else {
      recommendedAction = 'compress-or-replace-with-visual-signal';
    }
  }

  return {
    slot,
    normalizedText,
    charCount,
    maxChars,
    overBy,
    withinBudget,
    hasVerboseEnding,
    recommendedAction,
  };
}

export function truncateToCopyBudget(
  text: string,
  slot: CopySlotType,
  ellipsis = '…'
): string {
  const spec = assertValidCopySlot(slot);
  const normalized = normalizeMicroCopy(text);
  if (!normalized || spec.maxChars <= 0) {
    return '';
  }

  const graphemes = splitGraphemes(normalized);
  if (graphemes.length <= spec.maxChars) {
    return normalized;
  }

  let resolvedEllipsis = '…';
  if (typeof ellipsis === 'string') {
    if (ellipsis === '') {
      resolvedEllipsis = '';
    } else {
      const normalizedEllipsis = normalizeMicroCopy(ellipsis);
      resolvedEllipsis = normalizedEllipsis || '…';
    }
  }

  const ellipsisGraphemes = splitGraphemes(resolvedEllipsis);
  if (ellipsisGraphemes.length >= spec.maxChars) {
    return ellipsisGraphemes.slice(0, spec.maxChars).join('');
  }

  const keepCount = spec.maxChars - ellipsisGraphemes.length;
  const rawHead = graphemes.slice(0, keepCount).join('');
  const withoutDanglingSep = rawHead.replace(TRAILING_DANGLING_SEPARATOR_REGEX, '');
  const cleanHead = stripTrailingUnclosedBracketClause(withoutDanglingSep).replace(
    TRAILING_DANGLING_SEPARATOR_REGEX,
    ''
  );
  const finalHead = cleanHead.length > 0 ? cleanHead : rawHead.trimEnd();
  return `${finalHead}${resolvedEllipsis}`;
}

export type VisualSignalTone = 'up' | 'down' | 'safe' | 'neutral';
export type VisualSignalSize = 'xs' | 'sm';

export const DVIEW_VISUAL_SIGNAL_CLASSES = {
  base: 'inline-flex items-center gap-1 font-extrabold tabular-nums whitespace-nowrap shrink-0 select-none',
  size: {
    xs: 'px-1.5 py-0.5 rounded-md text-[11px] leading-tight',
    sm: 'px-2.5 py-1 rounded-lg text-[12px] leading-tight',
  },
  tone: {
    up: 'bg-brand-red-light text-brand-red',
    down: 'bg-brand-blue-light text-brand-blue',
    safe: 'bg-brand-green-light text-brand-green',
    neutral: 'bg-[#f2f4f6] dark:bg-[#202027] text-secondary',
  },
} as const;

export interface VisualSignalPillOptions {
  tone?: VisualSignalTone;
  size?: VisualSignalSize;
  extraClass?: string;
}

export function getVisualSignalPillClass(
  optionsOrTone?: VisualSignalPillOptions | VisualSignalTone,
  extraClassArg = ''
): string {
  const resolved: VisualSignalPillOptions =
    typeof optionsOrTone === 'string'
      ? { tone: optionsOrTone, extraClass: extraClassArg }
      : optionsOrTone || {};
  const { tone = 'neutral', size = 'xs', extraClass = '' } = resolved;

  const safeSize = Object.prototype.hasOwnProperty.call(
    DVIEW_VISUAL_SIGNAL_CLASSES.size,
    size
  )
    ? DVIEW_VISUAL_SIGNAL_CLASSES.size[size]
    : DVIEW_VISUAL_SIGNAL_CLASSES.size.xs;

  const safeTone = Object.prototype.hasOwnProperty.call(
    DVIEW_VISUAL_SIGNAL_CLASSES.tone,
    tone
  )
    ? DVIEW_VISUAL_SIGNAL_CLASSES.tone[tone]
    : DVIEW_VISUAL_SIGNAL_CLASSES.tone.neutral;

  return [
    DVIEW_VISUAL_SIGNAL_CLASSES.base,
    safeSize,
    safeTone,
    typeof extraClass === 'string' ? extraClass.trim() : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export const DVIEW_SEO_ACCORDION_CLASSES = {
  container:
    'group dview-seo-accordion rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] overflow-hidden',
  summary:
    'dview-seo-accordion-summary min-h-[48px] px-[18px] py-3 flex items-center justify-between gap-3 cursor-pointer select-none text-[13px] font-extrabold text-secondary hover:text-primary hover:bg-[#f2f4f6] dark:hover:bg-[#202027] group-open:text-primary',
  chevron:
    'dview-seo-accordion-chevron shrink-0 text-tertiary transition-transform duration-200 group-open:rotate-180 group-open:text-brand',
  body:
    'dview-seo-accordion-body px-[18px] pt-3.5 pb-[18px] border-t border-[#f2f4f6] dark:border-[#202027] text-[12.5px] leading-relaxed text-secondary',
} as const;

export function getSeoAccordionClass(extraClass = ''): string {
  const trimmed = typeof extraClass === 'string' ? extraClass.trim() : '';
  return trimmed
    ? `${DVIEW_SEO_ACCORDION_CLASSES.container} ${trimmed}`
    : DVIEW_SEO_ACCORDION_CLASSES.container;
}

export function getSeoAccordionSummaryClass(extraClass = ''): string {
  const trimmed = typeof extraClass === 'string' ? extraClass.trim() : '';
  return trimmed
    ? `${DVIEW_SEO_ACCORDION_CLASSES.summary} ${trimmed}`
    : DVIEW_SEO_ACCORDION_CLASSES.summary;
}

export function getSeoAccordionChevronClass(extraClass = ''): string {
  const trimmed = typeof extraClass === 'string' ? extraClass.trim() : '';
  return trimmed
    ? `${DVIEW_SEO_ACCORDION_CLASSES.chevron} ${trimmed}`
    : DVIEW_SEO_ACCORDION_CLASSES.chevron;
}

export function getSeoAccordionBodyClass(extraClass = ''): string {
  const trimmed = typeof extraClass === 'string' ? extraClass.trim() : '';
  return trimmed
    ? `${DVIEW_SEO_ACCORDION_CLASSES.body} ${trimmed}`
    : DVIEW_SEO_ACCORDION_CLASSES.body;
}

export type SeoSemanticViolationCode =
  | 'MISSING_OR_MULTIPLE_H1'
  | 'H1_CLOAKED'
  | 'H1_INSIDE_COLLAPSED_ACCORDION'
  | 'ILLEGAL_SR_ONLY_CLOAKING'
  | 'ILLEGAL_PROSE_CLOAKING'
  | 'ADSLOT_INSIDE_ACCORDION';

export interface SeoSemanticViolation {
  code: SeoSemanticViolationCode;
  message: string;
  tagName?: string;
}

export interface SeoSemanticAuditResult {
  valid: boolean;
  h1Count: number;
  accordionCount: number;
  adSlotsInsideAccordionCount: number;
  illegalSrOnlyCount: number;
  illegalProseCloakingCount: number;
  h1InsideCollapsedAccordion: boolean;
  violations: SeoSemanticViolation[];
}

const SR_ONLY_TOKEN_REGEX = /^(?:[a-z0-9-]+:)*!?sr-only$/i;
const RESPONSIVE_UNHIDE_TOKEN_REGEX =
  /^(?:sm|md|lg|xl|2xl):(?:block|inline|inline-block|flex|inline-flex|grid|inline-grid|table|table-row|table-cell|contents)$/i;
const MOBILE_ONLY_HIDDEN_TOKEN_REGEX = /^max-(?:xs|sm|md):!?hidden$/i;
const OFFSCREEN_NEGATIVE_CLASS_REGEX =
  /^(?:[a-z0-9-]+:)*!?(?:-(?:left|right|top|bottom|inset-x|inset-y|indent|ml|mt|translate-x|translate-y)-\[\d{3,}(?:px|vw|vh|rem|em|%)\]|(?:left|right|top|bottom|inset-x|inset-y|indent|ml|mt|translate-x|translate-y)-\[-\d{3,}(?:px|vw|vh|rem|em|%)\])$/i;
const ZERO_FONT_CLASS_REGEX = /^(?:[a-z0-9-]+:)*!?text-\[0(?:px|rem|em|%)?\]$/i;

const INLINE_STYLE_CLOAKING_PATTERNS: ReadonlyArray<RegExp> = [
  /(?:^|;)\s*display\s*:\s*none\b/i,
  /(?:^|;)\s*visibility\s*:\s*(?:hidden|collapse)\b/i,
  /(?:^|;)\s*opacity\s*:\s*0(?:\.0+)?(?:\s*!important)?(?:\s*;|\s*$)/i,
  /(?:^|;)\s*font-size\s*:\s*0(?:px|rem|em|%)?(?:\s*!important)?(?:\s*;|\s*$)/i,
  /(?:^|;)\s*(?:left|right|top|bottom|text-indent|margin-left|margin-top)\s*:\s*-\d{3,}(?:px|vw|vh|rem|em)\b/i,
  /(?:^|;)\s*clip\s*:\s*rect\(\s*0/i,
  /(?:^|;)\s*clip-path\s*:\s*inset\(\s*(?:50%|100%)/i,
];

const NON_CONTENT_AUDIT_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEMPLATE',
  'SVG',
]);

const MAX_LEGAL_CONTROL_SR_ONLY_CHARS = 40;
const MAX_LEGAL_TABLE_CAPTION_SR_ONLY_CHARS = 120;

function collectSelfAndDescendants(root: ParentNode, selector: string): Element[] {
  const out: Element[] = [];
  if (typeof Element !== 'undefined' && root instanceof Element && root.matches(selector)) {
    out.push(root);
  }
  out.push(...Array.from(root.querySelectorAll(selector)));
  return out;
}

function extractMeaningfulAuditText(el: Element): string {
  if (NON_CONTENT_AUDIT_TAGS.has(el.tagName)) {
    return '';
  }
  const chunks: string[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === 3) {
      if (node.nodeValue) chunks.push(node.nodeValue);
      return;
    }
    if (node.nodeType === 1) {
      const childEl = node as Element;
      if (NON_CONTENT_AUDIT_TAGS.has(childEl.tagName)) {
        return;
      }
      for (const grandChild of Array.from(childEl.childNodes)) {
        walk(grandChild);
      }
    }
  };
  walk(el);
  return normalizeMicroCopy(chunks.join(' '));
}

function hasDirectMeaningfulTextNode(el: Element): boolean {
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === 3 && normalizeMicroCopy(child.nodeValue || '').length > 0) {
      return true;
    }
  }
  return false;
}

function hasSrOnlyClassToken(el: Element): boolean {
  for (const token of Array.from(el.classList)) {
    if (SR_ONLY_TOKEN_REGEX.test(token)) {
      return true;
    }
  }
  return false;
}

function hasInlineStyleCloaking(el: Element): boolean {
  if (el.getAttribute('data-cascade-suppressed') === 'true') {
    return false;
  }
  const rawStyle = el.getAttribute('style');
  if (!rawStyle) return false;
  const normalizedStyle = rawStyle.replace(/\s+/g, ' ').trim();
  if (!normalizedStyle) return false;

  for (const pattern of INLINE_STYLE_CLOAKING_PATTERNS) {
    if (pattern.test(normalizedStyle)) {
      return true;
    }
  }

  const hasZeroHeight = /(?:^|;)\s*(?:max-height|height)\s*:\s*0(?:px)?(?:\s*!important)?(?:\s*;|\s*$)/i.test(
    normalizedStyle
  );
  const hasOverflowHidden = /(?:^|;)\s*overflow(?:-[xy])?\s*:\s*hidden\b/i.test(
    normalizedStyle
  );
  return hasZeroHeight && hasOverflowHidden;
}

function isLegitimateScrollRevealChromeBar(el: Element): boolean {
  if (el.tagName !== 'DIV') return false;
  const tokens = Array.from(el.classList);
  const isFixedInactiveChrome =
    tokens.includes('fixed') &&
    tokens.includes('opacity-0') &&
    tokens.includes('pointer-events-none');
  if (!isFixedInactiveChrome) return false;

  if (
    el.querySelector(
      'h1, h2, h3, h4, h5, h6, p, section, article, ul, ol, dl, blockquote, table'
    )
  ) {
    return false;
  }
  return measureCopyLength(extractMeaningfulAuditText(el)) <= DVIEW_COPY_BUDGETS.pageH1.maxChars;
}

function hasNonSrCloakingDirect(
  el: Element,
  options: { strictViewportVisibility?: boolean } = {}
): boolean {
  const { strictViewportVisibility = false } = options;
  if (el.getAttribute('data-cascade-suppressed') === 'true') {
    return false;
  }
  if (el.classList.contains('skip-to-content') && el.tagName === 'A') {
    return false;
  }
  if (!strictViewportVisibility && isLegitimateScrollRevealChromeBar(el)) {
    return false;
  }

  if (el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true') {
    return true;
  }
  if (hasInlineStyleCloaking(el)) {
    return true;
  }

  const tokens = Array.from(el.classList);
  if (tokens.length === 0) return false;

  const hasResponsiveUnhide = tokens.some((t) => RESPONSIVE_UNHIDE_TOKEN_REGEX.test(t));

  for (const token of tokens) {
    if (token === '!hidden') return true;
    if (token === 'hidden') {
      if (strictViewportVisibility || !hasResponsiveUnhide) {
        return true;
      }
    }
    if (MOBILE_ONLY_HIDDEN_TOKEN_REGEX.test(token)) {
      return true;
    }
    if (
      token === 'invisible' ||
      token === '!invisible' ||
      token === 'collapse' ||
      token === 'opacity-0' ||
      token === '!opacity-0' ||
      token === 'scale-0' ||
      token === '!scale-0' ||
      ZERO_FONT_CLASS_REGEX.test(token) ||
      OFFSCREEN_NEGATIVE_CLASS_REGEX.test(token)
    ) {
      return true;
    }
  }

  const hasZeroHeightBox =
    (tokens.includes('h-0') || tokens.includes('max-h-0')) &&
    tokens.includes('overflow-hidden');
  return hasZeroHeightBox;
}

function findOutermostNonSrCloakedAncestor(el: Element, stopAt: ParentNode): Element | null {
  let current: Element | null = el;
  let outermost: Element | null = null;
  while (current) {
    if (hasNonSrCloakingDirect(current)) {
      outermost = current;
    }
    if (current === stopAt) {
      break;
    }
    current = current.parentElement;
  }
  return outermost;
}

function isH1CloakedInAncestry(h1: Element, stopAt: ParentNode): boolean {
  let current: Element | null = h1;
  while (current) {
    if (
      hasSrOnlyClassToken(current) ||
      hasNonSrCloakingDirect(current, { strictViewportVisibility: true })
    ) {
      return true;
    }
    if (current === stopAt) {
      break;
    }
    current = current.parentElement;
  }
  return false;
}

function isLegalAccessibleSrOnly(el: Element): boolean {
  if (el.querySelector('h1, h2, h3, h4, h5, h6, p, section, article, ul, ol, table')) {
    return false;
  }
  const textLen = measureCopyLength(extractMeaningfulAuditText(el));

  if (el.tagName === 'CAPTION' && Boolean(el.closest('table'))) {
    return textLen <= MAX_LEGAL_TABLE_CAPTION_SR_ONLY_CHARS;
  }

  if (el.tagName === 'LABEL') {
    const isBoundFormLabel =
      el.hasAttribute('for') || Boolean(el.querySelector('input, select, textarea'));
    return isBoundFormLabel && textLen <= MAX_LEGAL_CONTROL_SR_ONLY_CHARS;
  }

  if (
    el.tagName === 'SPAN' &&
    Boolean(
      el.closest(
        'button, a, label, summary, [role="button"], [role="tab"], [role="switch"]'
      )
    )
  ) {
    return textLen <= MAX_LEGAL_CONTROL_SR_ONLY_CHARS;
  }

  return false;
}

/**
 * Audits a rendered DOM container against DVIEW_DESIGN.md Section 7.3's
 * 3 Safety Guardrails (Anti-Cloaking, Single Visible H1, Zero-AdSlot Inside <details>).
 */
export function auditSeoSemanticContainer(
  root: ParentNode,
  options: { requireSingleH1?: boolean } = {}
): SeoSemanticAuditResult {
  const { requireSingleH1 = true } = options;
  const violations: SeoSemanticViolation[] = [];

  const h1Elements = collectSelfAndDescendants(root, 'h1');
  const accordions = collectSelfAndDescendants(root, 'details');

  if (requireSingleH1 && h1Elements.length !== 1) {
    violations.push({
      code: 'MISSING_OR_MULTIPLE_H1',
      message: `Expected exactly 1 visible <h1> in Layer 1, found ${h1Elements.length}.`,
      tagName: 'H1',
    });
  }

  let h1InsideCollapsedAccordion = false;
  for (const h1 of h1Elements) {
    if (isH1CloakedInAncestry(h1, root)) {
      violations.push({
        code: 'H1_CLOAKED',
        message: '<h1> or one of its ancestors uses a forbidden cloaking class, attribute, or inline style.',
        tagName: 'H1',
      });
    }
    const parentDetails = h1.closest('details');
    if (parentDetails && !parentDetails.hasAttribute('open')) {
      h1InsideCollapsedAccordion = true;
      violations.push({
        code: 'H1_INSIDE_COLLAPSED_ACCORDION',
        message: '<h1> must be rendered visibly in Layer 1, never inside a collapsed <details> accordion.',
        tagName: 'H1',
      });
    }
  }

  const allElements = collectSelfAndDescendants(root, '*');
  const srOnlyElements = allElements.filter((el) => hasSrOnlyClassToken(el));
  let illegalSrOnlyCount = 0;
  for (const srEl of srOnlyElements) {
    if (!isLegalAccessibleSrOnly(srEl)) {
      illegalSrOnlyCount += 1;
      violations.push({
        code: 'ILLEGAL_SR_ONLY_CLOAKING',
        message: `Illegal .sr-only usage on <${srEl.tagName.toLowerCase()}>; .sr-only is restricted to <table> <caption> or concise (<=40 chars) control labels.`,
        tagName: srEl.tagName,
      });
    }
  }

  const proseCandidates = collectSelfAndDescendants(
    root,
    'h2, h3, h4, h5, h6, p, section, article, blockquote, ul, ol, li, dl, div'
  );
  const flaggedCloakingContainers = new Set<Element>();
  let illegalProseCloakingCount = 0;

  for (const proseEl of proseCandidates) {
    if (hasSrOnlyClassToken(proseEl) || proseEl.closest('[class*="sr-only"]')) {
      if (srOnlyElements.some((srEl) => srEl === proseEl || srEl.contains(proseEl))) {
        continue;
      }
    }
    if (proseEl.tagName === 'DIV' && !hasDirectMeaningfulTextNode(proseEl)) {
      continue;
    }
    if (extractMeaningfulAuditText(proseEl).length === 0) {
      continue;
    }
    const cloakedContainer = findOutermostNonSrCloakedAncestor(proseEl, root);
    if (cloakedContainer && !flaggedCloakingContainers.has(cloakedContainer)) {
      flaggedCloakingContainers.add(cloakedContainer);
      illegalProseCloakingCount += 1;
      violations.push({
        code: 'ILLEGAL_PROSE_CLOAKING',
        message: `Illegal hidden/invisible/opacity-0/inline-style/offscreen cloaking on <${cloakedContainer.tagName.toLowerCase()}> containing SEO text; use native <details> accordion instead.`,
        tagName: cloakedContainer.tagName,
      });
    }
  }

  const adSlotSelector = [
    '[data-testid="ad-slot-container"]',
    '[data-slot-format]',
    'ins.adsbygoogle',
    '[data-ad-slot]',
    '[data-testid="ad-slot"]',
    '[data-testid^="ssr-adslot"]',
    '[data-testid*="adslot"]',
    '[data-slot-id]',
  ].join(', ');

  let adSlotsInsideAccordionCount = 0;
  for (const detailsEl of accordions) {
    const matchedAdNodes = Array.from(detailsEl.querySelectorAll(adSlotSelector));
    const topLevelAdNodes = matchedAdNodes.filter(
      (node) => !matchedAdNodes.some((other) => other !== node && other.contains(node))
    );
    if (topLevelAdNodes.length > 0) {
      adSlotsInsideAccordionCount += topLevelAdNodes.length;
      violations.push({
        code: 'ADSLOT_INSIDE_ACCORDION',
        message: `Found ${topLevelAdNodes.length} AdSlot element(s) inside <details>; accordions yield availableWidth=0 AdSense errors.`,
        tagName: 'DETAILS',
      });
    }
  }

  return {
    valid: violations.length === 0,
    h1Count: h1Elements.length,
    accordionCount: accordions.length,
    adSlotsInsideAccordionCount,
    illegalSrOnlyCount,
    illegalProseCloakingCount,
    h1InsideCollapsedAccordion,
    violations,
  };
}
