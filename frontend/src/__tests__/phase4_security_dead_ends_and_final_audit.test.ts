/**
 * @jest-environment node
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { getEngineeringReport } from '@/app/actions/getEngineeringReport';
import { GET as sendTxNotificationsGet } from '@/app/api/cron/send-tx-notifications/route';
import {
  GET as proxyImageGet,
  isForbiddenIpOrHost,
  validateProxyImageTargetUrl,
} from '@/app/api/proxy-image/route';
import {
  POST as notifyNewHighPost,
  isAuthorizedNotifyNewHighRequest,
} from '@/app/api/push/notify-new-high/route';
import robots from '@/app/robots';
import {
  canDelete,
  extractAuthorToken,
  generateAuthorToken,
  hashAuthorToken,
} from '@/lib/board/boardAuth';
import { ADMIN_EMAILS, isAdmin } from '@/lib/config/admin.config';
import {
  SEO_FORBIDDEN_CLOAKING_CLASSES,
  auditSeoSemanticContainer,
} from '@/lib/design-system/copyDiet';
import * as firebaseAdminClientStub from '@/lib/firebaseAdmin.client';
import * as StorageRepo from '@/lib/repositories/storage.repository';
import {
  buildPreHydrationAdminGuardScript,
  hasAdminExclusionCookie,
  isRequestFromExcludedAdmin,
} from '@/lib/utils/adminExclusion';
import * as imageCompressionModule from '@/lib/utils/imageCompression';
import { ALLOWED_RASTER_IMAGE_MIME_TYPES, uploadImage } from '@/lib/services/storage.service';
import { proxy } from '@/proxy';
import { extractRelativeMarkdownLinks } from './agent_skills_ssot_bindings.test';

const FRONTEND_ROOT = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(FRONTEND_ROOT, '..');
const EMOJI_PICTOGRAPH_REGEX = /\p{Extended_Pictographic}/u;

const LEGACY_UNPREFIXED_PATTERNS = [
  /(?<![A-Za-z0-9_-])AGENT\.md\b/,
  /(?<![A-Za-z0-9_-])PROJECT\.md\b/,
  /(?<![A-Za-z0-9_-])DESIGN\.md\b/,
  /(?<![A-Za-z0-9_-])SECURITY\.md\b/,
  /(?<![A-Za-z0-9_-])strict-real-data-only\.md\b/,
  /(?<![A-Za-z0-9_-])PORTFOLIO DVIEW - Engineering Report\.md/,
  /(?<![A-Za-z0-9_-])PORTFOLIO DVIEW - Patch History\.md/,
];

function collectNonTestSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectNonTestSourceFiles(full, acc);
    } else if (
      /\.(ts|tsx|js|jsx|mjs)$/.test(entry.name) &&
      !entry.name.includes('.test.') &&
      !entry.name.includes('.spec.')
    ) {
      acc.push(full);
    }
  }
  return acc;
}

interface ParsedRuleBlock {
  fullPattern: string;
  allows: Array<{ ops: string[]; expr: string }>;
}

/**
 * Strips `//` line comments and `/* ... *\/` block comments outside quoted string literals
 * so commented-out predicates can never masquerade as active Firebase Security Rules.
 */
function stripFirebaseRuleComments(source: string): string {
  let out = '';
  let inQuote: string | null = null;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (inQuote) {
      out += ch;
      if (ch === '\\' && i + 1 < source.length) {
        out += source[i + 1];
        i++;
        continue;
      }
      if (ch === inQuote) inQuote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      inQuote = ch;
      out += ch;
      continue;
    }
    if (ch === '/' && source[i + 1] === '/') {
      i += 2;
      while (i < source.length && source[i] !== '\n') i++;
      if (i < source.length) out += '\n';
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      i += 2;
      let closed = false;
      while (i < source.length) {
        if (source[i] === '*' && source[i + 1] === '/') {
          i++;
          closed = true;
          break;
        }
        if (source[i] === '\n') out += '\n';
        i++;
      }
      if (!closed) {
        throw new Error('Unclosed block comment in Firebase rules');
      }
      continue;
    }
    out += ch;
  }
  return out;
}

function findClosingRuleBrace(text: string, openIdx: number): number {
  let depth = 0;
  let inQuote: string | null = null;
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === inQuote) inQuote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      inQuote = ch;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error(`Unclosed brace in Firebase rules at index ${openIdx}`);
}

function hasDisjunctionOutsideQuotes(expr: string): boolean {
  let inQuote: string | null = null;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (inQuote) {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === inQuote) inQuote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      inQuote = ch;
      continue;
    }
    if (ch === '|' && expr[i + 1] === '|') return true;
  }
  return false;
}

/**
 * Parses nested `match /segment/{param} { allow ... }` blocks from Firebase Rules v2
 * (Firestore & Storage) so tests can evaluate Firebase's real logical-OR multi-match semantics.
 */
function parseFirebaseRuleBlocks(rulesSource: string, rootPrefix: string): ParsedRuleBlock[] {
  const cleaned = stripFirebaseRuleComments(rulesSource);

  const blocks: ParsedRuleBlock[] = [];

  function walkBody(body: string, prefix: string): void {
    let cursor = 0;
    while (cursor < body.length) {
      const nextMatch = body.slice(cursor).match(/\b(function|match|allow)\b/);
      if (!nextMatch || nextMatch.index === undefined) break;
      const kw = nextMatch[1];
      const kwStart = cursor + nextMatch.index;

      if (kw === 'function') {
        const braceOpen = body.indexOf('{', kwStart);
        const braceClose = findClosingRuleBrace(body, braceOpen);
        cursor = braceClose + 1;
        continue;
      }

      if (kw === 'match') {
        const afterMatch = body.slice(kwStart + 'match'.length);
        const headerMatch = afterMatch.match(/^\s*(\/\S+)\s*\{/);
        if (!headerMatch) {
          throw new Error(`Malformed match header near: ${afterMatch.slice(0, 60)}`);
        }
        const rawSegment = headerMatch[1].trim();
        const braceOpen = kwStart + 'match'.length + headerMatch[0].length - 1;
        const braceClose = findClosingRuleBrace(body, braceOpen);
        const innerBody = body.slice(braceOpen + 1, braceClose);
        const combinedPattern = `${prefix}${rawSegment}`;
        blocks.push({ fullPattern: combinedPattern, allows: [] });
        walkBody(innerBody, combinedPattern);
        cursor = braceClose + 1;
        continue;
      }

      // allow <ops>: if <expr>;
      const semiIdx = body.indexOf(';', kwStart);
      const stmt = body.slice(kwStart, semiIdx);
      const allowMatch = stmt.match(/^allow\s+([^:]+):\s*if\s+([\s\S]+)$/);
      if (allowMatch) {
        const rawOps = allowMatch[1].split(',').map((s) => s.trim());
        const expandedOps: string[] = [];
        for (const op of rawOps) {
          if (op === 'read') expandedOps.push('get', 'list');
          else if (op === 'write') expandedOps.push('create', 'update', 'delete');
          else expandedOps.push(op);
        }
        const ownerBlock = [...blocks].reverse().find((b) => b.fullPattern === prefix);
        if (ownerBlock) {
          ownerBlock.allows.push({ ops: expandedOps, expr: allowMatch[2].trim() });
        }
      }
      cursor = semiIdx + 1;
    }
  }

  const rootMarkerRe = new RegExp(`match\\s+${rootPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{`);
  const rootMatch = rootMarkerRe.exec(cleaned);
  if (!rootMatch) {
    throw new Error(`Root match ${rootPrefix} not found in rules`);
  }
  const openBrace = rootMatch.index + rootMatch[0].length - 1;
  const closeBrace = findClosingRuleBrace(cleaned, openBrace);
  walkBody(cleaned.slice(openBrace + 1, closeBrace), '');
  return blocks;
}

function matchRulePath(
  pattern: string,
  targetPath: string
): Record<string, string> | null {
  const pSegs = pattern.split('/').filter(Boolean);
  const tSegs = targetPath.split('/').filter(Boolean);
  const params: Record<string, string> = {};

  for (let i = 0; i < pSegs.length; i++) {
    const ps = pSegs[i];
    const globMatch = ps.match(/^\{([a-zA-Z0-9_]+)=\*\*\}$/);
    if (globMatch) {
      if (i >= tSegs.length) return null;
      params[globMatch[1]] = tSegs.slice(i).join('/');
      return params;
    }
    if (i >= tSegs.length) return null;
    const paramMatch = ps.match(/^\{([a-zA-Z0-9_]+)\}$/);
    if (paramMatch) {
      params[paramMatch[1]] = tSegs[i];
    } else if (ps !== tSegs[i]) {
      return null;
    }
  }

  return pSegs.length === tSegs.length ? params : null;
}

interface SimAuth {
  uid: string;
  token?: { admin?: boolean };
}

interface SimRequestContext {
  auth: SimAuth | null;
  op: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  existingData?: Record<string, unknown>;
  incomingData?: Record<string, unknown>;
  incomingMeta?: { size: number; contentType: string | null } | null;
}

interface StorageImageUploadMatcher {
  mimeWholeStringRegex: RegExp;
  requiresResourceNonNull: boolean;
  requiresPositiveSize: boolean;
  requiresNonNullContentType: boolean;
  maxBytes: number;
}

/**
 * Extracts the exact `isValidImageUpload()` predicate from `storage.rules` after stripping
 * comments, failing closed on `||` disjunctions or multiple `contentType.matches(...)` clauses.
 */
function parseStorageImageUploadMatcher(storageSource: string): StorageImageUploadMatcher {
  const cleaned = stripFirebaseRuleComments(storageSource);
  const headerRe = /\bfunction\s+isValidImageUpload\s*\(\s*\)\s*\{/;
  const headerMatch = headerRe.exec(cleaned);
  if (!headerMatch) {
    throw new Error('function isValidImageUpload() not found in storage.rules');
  }
  const openBrace = headerMatch.index + headerMatch[0].length - 1;
  const closeBrace = findClosingRuleBrace(cleaned, openBrace);
  const fnBody = cleaned.slice(openBrace + 1, closeBrace);

  const returnMatch = fnBody.match(/\breturn\s+([\s\S]+?)\s*;/);
  if (!returnMatch) {
    throw new Error('return statement not found in isValidImageUpload()');
  }
  const returnExpr = returnMatch[1];
  if (hasDisjunctionOutsideQuotes(returnExpr)) {
    throw new Error('Unsafe logical OR (||) disjunction detected inside isValidImageUpload()');
  }

  const mimeMatches = Array.from(
    returnExpr.matchAll(/request\.resource\.contentType\.matches\(\s*'([^']+)'\s*\)/g)
  );
  if (mimeMatches.length !== 1) {
    throw new Error(
      `Expected exactly 1 request.resource.contentType.matches(...) in isValidImageUpload(), found ${mimeMatches.length}`
    );
  }
  const sizeCapMatch = returnExpr.match(
    /request\.resource\.size\s*<=\s*(\d+)\s*\*\s*(\d+)\s*\*\s*(\d+)/
  );
  if (!sizeCapMatch) {
    throw new Error('request.resource.size <= ... cap not found in isValidImageUpload()');
  }
  const maxBytes = Number(sizeCapMatch[1]) * Number(sizeCapMatch[2]) * Number(sizeCapMatch[3]);
  const requiresResourceNonNull = /request\.resource\s*!=\s*null/.test(returnExpr);
  const requiresPositiveSize = /request\.resource\.size\s*>\s*0/.test(returnExpr);
  const requiresNonNullContentType = /request\.resource\.contentType\s*!=\s*null/.test(returnExpr);
  const unescapedMimePattern = mimeMatches[0][1].replace(/\\\\/g, '\\');
  const mimeWholeStringRegex = new RegExp(`^(?:${unescapedMimePattern})$`);
  return {
    mimeWholeStringRegex,
    requiresResourceNonNull,
    requiresPositiveSize,
    requiresNonNullContentType,
    maxBytes,
  };
}

/**
 * Evaluates all matching `match` blocks using Firebase's exact OR-combination rule:
 * access is ALLOWED if and only if AT LEAST ONE matching rule evaluates to true.
 */
function evaluateRuleset(
  blocks: ParsedRuleBlock[],
  ctx: SimRequestContext,
  imageMatcher?: StorageImageUploadMatcher
): boolean {
  const isSignedIn = () => ctx.auth !== null;
  const isAdminFn = () => ctx.auth !== null && ctx.auth.token?.admin === true;
  const existing = ctx.existingData ?? {};
  const incoming = ctx.incomingData ?? {};

  const isValidCounterField = (field: string): boolean => {
    if (!(field in incoming)) return true;
    const nextVal = incoming[field];
    if (typeof nextVal !== 'number' || !Number.isInteger(nextVal) || nextVal < 0) {
      return false;
    }
    if (!(field in existing) || typeof existing[field] !== 'number' || !Number.isInteger(existing[field])) {
      return true;
    }
    const delta = nextVal - (existing[field] as number);
    return delta >= -1 && delta <= 1;
  };

  const isValidImageUpload = (): boolean => {
    if (!imageMatcher) return false;
    if (!ctx.incomingMeta) return false;
    if (imageMatcher.requiresPositiveSize && ctx.incomingMeta.size <= 0) return false;
    if (ctx.incomingMeta.size > imageMatcher.maxBytes) return false;
    if (ctx.incomingMeta.contentType === null) return false;
    return imageMatcher.mimeWholeStringRegex.test(ctx.incomingMeta.contentType);
  };

  const affectedKeys = (): Set<string> => {
    const keys = new Set<string>();
    for (const k of new Set([...Object.keys(existing), ...Object.keys(incoming)])) {
      if (existing[k] !== incoming[k]) keys.add(k);
    }
    return keys;
  };

  for (const block of blocks) {
    const params = matchRulePath(block.fullPattern, ctx.path);
    if (!params) continue;

    for (const allow of block.allows) {
      if (!allow.ops.includes(ctx.op)) continue;

      const expr = allow.expr;
      let matched = false;

      if (expr === 'true') {
        matched = true;
      } else if (expr === 'isAdmin()') {
        matched = isAdminFn();
      } else if (expr === 'isSignedIn()') {
        matched = isSignedIn();
      } else if (expr === 'isValidImageUpload()') {
        matched = isValidImageUpload();
      } else if (expr === 'isSignedIn() && isValidImageUpload()') {
        matched = isSignedIn() && isValidImageUpload();
      } else if (expr === 'isSignedIn() && request.auth.uid == uid && isValidImageUpload()') {
        matched = Boolean(isSignedIn() && ctx.auth!.uid === params.uid && isValidImageUpload());
      } else if (expr === 'isSignedIn() && (request.auth.uid == uid || isAdmin())') {
        matched = Boolean(isSignedIn() && (ctx.auth!.uid === params.uid || isAdminFn()));
      } else if (expr === 'isSignedIn() && (request.auth.uid == userId || isAdmin())') {
        matched = Boolean(isSignedIn() && (ctx.auth!.uid === params.userId || isAdminFn()));
      } else if (
        expr.includes('request.auth.uid == resource.data.authorUid || isAdmin()') &&
        !expr.includes('affectedKeys()')
      ) {
        matched = Boolean(isSignedIn() && (ctx.auth!.uid === existing.authorUid || isAdminFn()));
      } else if (
        expr.includes("!( 'authorUid' in request.resource.data )") ||
        expr.includes("!('authorUid' in request.resource.data)")
      ) {
        matched = Boolean(
          isSignedIn() &&
            (!('authorUid' in incoming) || incoming.authorUid === ctx.auth!.uid || isAdminFn())
        );
      } else if (expr.includes('affectedKeys().hasOnly')) {
        const listMatch = expr.match(/hasOnly\(\[([^\]]+)\]\)/);
        const allowedList = listMatch
          ? listMatch[1].split(',').map((s) => s.trim().replace(/^'|'$/g, ''))
          : [];
        const diff = affectedKeys();
        const onlyAllowedKeys =
          diff.size > 0 && Array.from(diff).every((k) => allowedList.includes(k));
        const countersValid = allowedList.every((k) =>
          expr.includes(`isValidCounterField('${k}')`) ? isValidCounterField(k) : true
        );
        const ownerOrAdmin = expr.includes('resource.data.authorUid')
          ? Boolean(isSignedIn() && (ctx.auth!.uid === existing.authorUid || isAdminFn()))
          : isAdminFn();
        matched = ownerOrAdmin || (onlyAllowedKeys && countersValid);
      } else if (expr.includes("hasAll(['companyName', 'contactInfo', 'message'])")) {
        const keyCapOk = expr.includes('keys().size() <= 20')
          ? Object.keys(incoming).length <= 20
          : true;
        matched =
          keyCapOk &&
          typeof incoming.companyName === 'string' &&
          incoming.companyName.length <= 200 &&
          typeof incoming.contactInfo === 'string' &&
          incoming.contactInfo.length <= 320 &&
          typeof incoming.message === 'string' &&
          incoming.message.length <= 5000;
      } else if (expr.includes("!('companyName' in request.resource.data)")) {
        matched =
          Object.keys(incoming).length <= 20 &&
          (!('companyName' in incoming) ||
            (typeof incoming.companyName === 'string' && incoming.companyName.length <= 200)) &&
          (!('contactInfo' in incoming) ||
            (typeof incoming.contactInfo === 'string' && incoming.contactInfo.length <= 320)) &&
          (!('message' in incoming) ||
            (typeof incoming.message === 'string' && incoming.message.length <= 5000));
      } else if (expr.includes('request.resource.data.url is string')) {
        const urlRegexMatch = expr.match(/request\.resource\.data\.url\.matches\(\s*'([^']+)'\s*\)/);
        const urlValid = urlRegexMatch
          ? typeof incoming.url === 'string' &&
            new RegExp(`^(?:${urlRegexMatch[1].replace(/\\\\/g, '\\')})$`).test(incoming.url)
          : typeof incoming.url === 'string';
        const keyCapOk = expr.includes('keys().size() <= 20')
          ? Object.keys(incoming).length <= 20
          : true;
        const captionOk = expr.includes("'caption' in request.resource.data")
          ? !('caption' in incoming) ||
            (typeof incoming.caption === 'string' && incoming.caption.length <= 500)
          : true;
        matched =
          keyCapOk &&
          urlValid &&
          typeof incoming.url === 'string' &&
          incoming.url.length <= 2048 &&
          typeof incoming.apartmentName === 'string' &&
          incoming.apartmentName.length <= 200 &&
          captionOk;
      } else if (expr.includes('request.resource.data.keys().size() <= 25')) {
        matched = Object.keys(incoming).length <= 25;
      } else if (expr.includes("hasOnly(['aptName', 'count'])")) {
        const keys = Object.keys(incoming);
        matched =
          isAdminFn() ||
          (keys.length === 2 &&
            keys.includes('aptName') &&
            keys.includes('count') &&
            typeof incoming.aptName === 'string' &&
            incoming.count === 1);
      } else if (expr.includes('request.auth != null && request.auth.token.admin == true')) {
        matched = isAdminFn();
      } else {
        throw new Error(`Unhandled rule expression in test evaluator: ${expr}`);
      }

      if (matched) return true;
    }
  }

  return false;
}

describe('DVIEW Phase 4 — Security Policy (DVIEW_SECURITY.md), Dead Ends (DEAD_ENDS.md) & Final Integrity Audit', () => {
  describe('1. DVIEW_SECURITY.md Empirical Hardening & Real Rule/Endpoint Enforcement', () => {
    const securityPath = path.join(REPO_ROOT, 'DVIEW_SECURITY.md');
    const securityMd = fs.readFileSync(securityPath, 'utf8');

    it('eliminates all GitHub default template placeholders, emojis, and legacy unprefixed doc names while keeping lean token budget', () => {
      expect(securityMd).not.toContain('Use this section to tell people');
      expect(securityMd).not.toContain('Tell them where to go');
      expect(securityMd).not.toContain(':white_check_mark:');
      expect(securityMd).not.toContain(':x:');
      expect(EMOJI_PICTOGRAPH_REGEX.test(securityMd)).toBe(false);

      for (const regex of LEGACY_UNPREFIXED_PATTERNS) {
        expect(regex.test(securityMd)).toBe(false);
      }

      const lines = securityMd.replace(/\r\n/g, '\n').split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(80);
      expect(lines.length).toBeLessThanOrEqual(200);
      expect(fs.statSync(securityPath).size).toBeLessThan(20 * 1024);

      const relLinks = extractRelativeMarkdownLinks(securityMd);
      expect(relLinks.length).toBeGreaterThanOrEqual(15);
      for (const relTarget of relLinks) {
        const resolved = path.resolve(path.dirname(securityPath), relTarget);
        expect(fs.existsSync(resolved)).toBe(true);
      }
    });

    it('evaluates firestore.rules & storage.rules under Firebase OR-semantics to block wildcard leaks, counter tampering, and non-image uploads', () => {
      const firebaseJson = JSON.parse(
        fs.readFileSync(path.join(REPO_ROOT, 'firebase.json'), 'utf8')
      ) as { firestore: { rules: string }; storage: { rules: string } };
      expect(firebaseJson.firestore.rules).toBe('firestore.rules');
      expect(firebaseJson.storage.rules).toBe('storage.rules');

      const firestoreSource = fs.readFileSync(path.join(REPO_ROOT, 'firestore.rules'), 'utf8');
      const storageSource = fs.readFileSync(path.join(REPO_ROOT, 'storage.rules'), 'utf8');

      const fsBlocks = parseFirebaseRuleBlocks(firestoreSource, '/databases/{database}/documents');
      const stBlocks = parseFirebaseRuleBlocks(storageSource, '/b/{bucket}/o');

      // 1) Regression proof: if /{document=**} ever granted `allow read: if true`, OR-semantics would leak /users!
      const buggyBlocks: ParsedRuleBlock[] = [
        ...fsBlocks,
        { fullPattern: '/{document=**}', allows: [{ ops: ['get', 'list'], expr: 'true' }] },
      ];
      expect(
        evaluateRuleset(buggyBlocks, { auth: null, op: 'get', path: '/users/victim_uid' })
      ).toBe(true);

      // 2) Live firestore.rules MUST DENY unauthenticated & cross-user reads on private/server-only collections
      for (const privatePath of [
        '/users/victim_uid',
        '/adInquiries/inq_1',
        '/ad_inquiries/inq_1',
        '/pending_photos/photo_1',
        '/sell_diagnosis_logs/log_1',
        '/board_posts/post_1',
        '/board_comments/comment_1',
        '/board_author_profiles/hash_1',
        '/push_subscriptions/sub_1',
        '/subscriptions/sub_1',
        '/ad_clicks/click_1',
      ]) {
        expect(
          evaluateRuleset(fsBlocks, { auth: null, op: 'get', path: privatePath })
        ).toBe(false);
        expect(
          evaluateRuleset(fsBlocks, { auth: { uid: 'intruder_uid' }, op: 'get', path: privatePath })
        ).toBe(false);
        expect(
          evaluateRuleset(fsBlocks, {
            auth: { uid: 'admin_uid', token: { admin: true } },
            op: 'get',
            path: privatePath,
          })
        ).toBe(true);
      }

      // 3) Owner profile read/write allowed for self, denied for other users
      expect(
        evaluateRuleset(fsBlocks, { auth: { uid: 'user_a' }, op: 'get', path: '/users/user_a' })
      ).toBe(true);
      expect(
        evaluateRuleset(fsBlocks, { auth: { uid: 'user_b' }, op: 'update', path: '/users/user_a' })
      ).toBe(false);

      // 4) ContactClient 'adInquiries' write-only intake: valid create allowed, oversized/malformed denied, read denied
      expect(
        evaluateRuleset(fsBlocks, {
          auth: null,
          op: 'create',
          path: '/adInquiries/new_1',
          incomingData: {
            companyName: '[데이터 오류 제보] 홍길동',
            contactInfo: 'user@example.com',
            message: '동탄역 시범단지 도보 시간 정정 요청합니다.',
            status: 'pending',
          },
        })
      ).toBe(true);
      expect(
        evaluateRuleset(fsBlocks, {
          auth: null,
          op: 'create',
          path: '/adInquiries/spam_1',
          incomingData: {
            companyName: 'Spam',
            contactInfo: 'spam@example.com',
            message: 'X'.repeat(6000),
          },
        })
      ).toBe(false);

      // 5) Counter updates on field_reports, scoutingReports, user_reviews: +1 int allowed; negative, string, +1000, or body tamper denied
      const baseReport = { authorUid: 'owner_1', title: '원본 임장기', likes: 10, views: 20, viewCount: 20, commentCount: 2 };
      expect(
        evaluateRuleset(fsBlocks, {
          auth: null,
          op: 'update',
          path: '/field_reports/rep_1',
          existingData: baseReport,
          incomingData: { ...baseReport, likes: 11 },
        })
      ).toBe(true);
      expect(
        evaluateRuleset(fsBlocks, {
          auth: null,
          op: 'update',
          path: '/field_reports/rep_1',
          existingData: baseReport,
          incomingData: { ...baseReport, viewCount: 21 },
        })
      ).toBe(true);
      expect(
        evaluateRuleset(fsBlocks, {
          auth: null,
          op: 'update',
          path: '/field_reports/rep_1',
          existingData: baseReport,
          incomingData: { ...baseReport, likes: -999999 },
        })
      ).toBe(false);
      expect(
        evaluateRuleset(fsBlocks, {
          auth: null,
          op: 'update',
          path: '/field_reports/rep_1',
          existingData: baseReport,
          incomingData: { ...baseReport, views: 'injected_string' },
        })
      ).toBe(false);
      expect(
        evaluateRuleset(fsBlocks, {
          auth: null,
          op: 'update',
          path: '/field_reports/rep_1',
          existingData: baseReport,
          incomingData: { ...baseReport, likes: 1000 },
        })
      ).toBe(false);
      expect(
        evaluateRuleset(fsBlocks, {
          auth: null,
          op: 'update',
          path: '/field_reports/rep_1',
          existingData: baseReport,
          incomingData: { ...baseReport, title: '변조된 제목', likes: 11 },
        })
      ).toBe(false);

      // 6) Public market collections allow read, block unauthenticated write
      expect(
        evaluateRuleset(fsBlocks, { auth: null, op: 'get', path: '/transactions/tx_1' })
      ).toBe(true);
      expect(
        evaluateRuleset(fsBlocks, {
          auth: { uid: 'normal_user' },
          op: 'update',
          path: '/transactions/tx_1',
        })
      ).toBe(false);

      // 6b) Write-only intake & ownership anti-spoofing hardening:
      //     - `ad_inquiries` enforces <=20 keys and field length caps (no unbounded `allow create: if true`)
      //     - `pending_photos` enforces Firebase Storage HTTPS URL domain, <=20 keys, and <=500-char caption
      //     - `scoutingReports` and `field_reports/{id}/comments` block `authorUid` impersonation on create
      expect(
        evaluateRuleset(fsBlocks, {
          auth: null,
          op: 'create',
          path: '/ad_inquiries/legit_1',
          incomingData: {
            companyName: '동탄 공인중개사',
            contactInfo: '010-1234-5678',
            message: '배너 광고 문의드립니다.',
          },
        })
      ).toBe(true);
      expect(
        evaluateRuleset(fsBlocks, {
          auth: null,
          op: 'create',
          path: '/ad_inquiries/spam_oversized',
          incomingData: {
            companyName: 'Spam',
            contactInfo: 'spam@example.com',
            message: 'X'.repeat(6000),
          },
        })
      ).toBe(false);
      const tooManyInquiryKeys: Record<string, unknown> = { message: 'ok' };
      for (let i = 0; i < 25; i++) tooManyInquiryKeys[`junk_${i}`] = i;
      expect(
        evaluateRuleset(fsBlocks, {
          auth: null,
          op: 'create',
          path: '/ad_inquiries/spam_keys',
          incomingData: tooManyInquiryKeys,
        })
      ).toBe(false);

      expect(
        evaluateRuleset(fsBlocks, {
          auth: null,
          op: 'create',
          path: '/pending_photos/legit_photo_1',
          incomingData: {
            apartmentId: 'apt_1',
            apartmentName: '동탄역롯데캐슬',
            url: 'https://firebasestorage.googleapis.com/v0/b/portfolio-dtdls.appspot.com/o/user_pending_photos%2F170000-abc.jpg?alt=media',
            locationTag: '단지 외관 / 정문',
            locationTagId: 'gate',
            caption: '정문 전경 사진입니다.',
            status: 'pending',
            createdAt: 'SERVER_TIMESTAMP',
            uploaderUid: 'anonymous',
            uploaderEmail: 'anonymous',
            uploaderName: '익명',
          },
        })
      ).toBe(true);
      for (const maliciousPhotoUrl of [
        'javascript:alert(document.cookie)',
        'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+PC9zdmc+',
        'https://evil.example.com/xss.svg',
        'http://firebasestorage.googleapis.com/v0/b/portfolio-dtdls/o/a.jpg',
      ]) {
        expect(
          evaluateRuleset(fsBlocks, {
            auth: null,
            op: 'create',
            path: '/pending_photos/xss_attempt',
            incomingData: {
              apartmentName: '동탄역롯데캐슬',
              url: maliciousPhotoUrl,
            },
          })
        ).toBe(false);
      }
      expect(
        evaluateRuleset(fsBlocks, {
          auth: null,
          op: 'create',
          path: '/pending_photos/oversized_caption',
          incomingData: {
            apartmentName: '동탄역롯데캐슬',
            url: 'https://storage.googleapis.com/portfolio-dtdls.appspot.com/user_pending_photos/a.jpg',
            caption: 'C'.repeat(501),
          },
        })
      ).toBe(false);

      for (const spoofTargetPath of [
        '/scoutingReports/sr_1',
        '/field_reports/rep_1/comments/c_1',
      ]) {
        expect(
          evaluateRuleset(fsBlocks, {
            auth: { uid: 'intruder_uid' },
            op: 'create',
            path: spoofTargetPath,
            incomingData: { authorUid: 'victim_uid', content: '사칭 작성 테스트' },
          })
        ).toBe(false);
        expect(
          evaluateRuleset(fsBlocks, {
            auth: { uid: 'intruder_uid' },
            op: 'create',
            path: spoofTargetPath,
            incomingData: { authorUid: 'intruder_uid', content: '본인 정상 작성' },
          })
        ).toBe(true);
      }

      // 7) Storage rules: owner & service upload paths enforce raster MIME whitelist (blocking image/svg+xml Stored XSS) & 0B < size <= 10MB
      expect(storageSource).not.toContain("matches('image/.*')");
      expect(storageSource).toContain("matches('image/(jpeg|jpg|png|webp|gif|avif|heic|heif)')");
      expect(securityMd).not.toContain('`image/*`');
      expect(securityMd).toContain('image/(jpeg|jpg|png|webp|gif|avif|heic|heif)');
      expect(securityMd).toContain('image/svg+xml');

      const stImageMatcher = parseStorageImageUploadMatcher(storageSource);
      expect(stImageMatcher.requiresResourceNonNull).toBe(true);
      expect(stImageMatcher.requiresPositiveSize).toBe(true);
      expect(stImageMatcher.requiresNonNullContentType).toBe(true);
      expect(stImageMatcher.maxBytes).toBe(10 * 1024 * 1024);

      // Fail-closed parser guards against commented-out predicates, duplicate `.matches()`, and `||` disjunctions
      const commentedOutWhitelistSource = `
        function isValidImageUpload() {
          return request.resource != null
            // && request.resource.size > 0
            // && request.resource.contentType.matches('image/(jpeg|png)')
            && request.resource.size <= 10 * 1024 * 1024
            && request.resource.contentType.matches('image/.*');
        }
      `;
      const parsedCommentedSource = parseStorageImageUploadMatcher(commentedOutWhitelistSource);
      expect(parsedCommentedSource.requiresPositiveSize).toBe(false);
      expect(parsedCommentedSource.mimeWholeStringRegex.test('image/svg+xml')).toBe(true);

      expect(() =>
        parseStorageImageUploadMatcher(`
          function isValidImageUpload() {
            return request.resource != null
              && (request.resource.size <= 10 * 1024 * 1024 || true)
              && request.resource.contentType.matches('image/jpeg');
          }
        `)
      ).toThrow(/disjunction/i);
      expect(() =>
        parseStorageImageUploadMatcher(`
          function isValidImageUpload() {
            return request.resource != null
              && request.resource.size <= 10 * 1024 * 1024
              && request.resource.contentType.matches('image/jpeg')
              && request.resource.contentType.matches('image/.*');
          }
        `)
      ).toThrow(/Expected exactly 1/);

      // Regression proof: legacy `image/.*` would have allowed unauthenticated Stored XSS via /user_pending_photos/xss.svg
      const legacyInsecureImageMatcher = parseStorageImageUploadMatcher(
        "function isValidImageUpload() { return request.resource != null && request.resource.size <= 10 * 1024 * 1024 && request.resource.contentType.matches('image/.*'); }"
      );
      expect(
        evaluateRuleset(
          stBlocks,
          {
            auth: null,
            op: 'create',
            path: '/user_pending_photos/xss.svg',
            incomingMeta: { size: 512, contentType: 'image/svg+xml' },
          },
          legacyInsecureImageMatcher
        )
      ).toBe(true);

      // Live storage.rules MUST DENY image/svg+xml & non-raster payloads across ALL upload buckets (including unauthenticated /user_pending_photos)
      for (const targetUpload of [
        { auth: null, path: '/user_pending_photos/xss.svg' },
        { auth: { uid: 'u1' }, path: '/user_pending_photos/xss.svg' },
        { auth: { uid: 'u1' }, path: '/profiles/u1/xss.svg' },
        { auth: { uid: 'u1' }, path: '/reports/u1/xss.svg' },
        { auth: { uid: 'u1' }, path: '/posts/u1/xss.svg' },
        { auth: { uid: 'u1' }, path: '/reviews/u1/xss.svg' },
        { auth: { uid: 'u1' }, path: '/field_reports/xss.svg' },
        { auth: { uid: 'u1' }, path: '/user_reviews/xss.svg' },
      ]) {
        for (const forbiddenMime of [
          'image/svg+xml',
          'image/svg+xml;charset=utf-8',
          'image/xml',
          'text/html',
          'application/xhtml+xml',
          'application/octet-stream',
          'image/jpeg/svg+xml',
          'text/html;image/jpeg',
          '',
        ]) {
          expect(
            evaluateRuleset(
              stBlocks,
              {
                auth: targetUpload.auth,
                op: 'create',
                path: targetUpload.path,
                incomingMeta: { size: 1024, contentType: forbiddenMime },
              },
              stImageMatcher
            )
          ).toBe(false);
        }
      }

      // Null contentType, null incomingMeta, 0-byte, negative size, and >10MB boundary checks
      expect(
        evaluateRuleset(
          stBlocks,
          {
            auth: null,
            op: 'create',
            path: '/user_pending_photos/null-mime.jpg',
            incomingMeta: { size: 1024, contentType: null },
          },
          stImageMatcher
        )
      ).toBe(false);
      expect(
        evaluateRuleset(
          stBlocks,
          {
            auth: null,
            op: 'create',
            path: '/user_pending_photos/no-meta.jpg',
            incomingMeta: null,
          },
          stImageMatcher
        )
      ).toBe(false);
      expect(
        evaluateRuleset(
          stBlocks,
          {
            auth: null,
            op: 'create',
            path: '/user_pending_photos/empty.jpg',
            incomingMeta: { size: 0, contentType: 'image/jpeg' },
          },
          stImageMatcher
        )
      ).toBe(false);
      expect(
        evaluateRuleset(
          stBlocks,
          {
            auth: null,
            op: 'create',
            path: '/user_pending_photos/exact-10mb.heic',
            incomingMeta: { size: 10 * 1024 * 1024, contentType: 'image/heic' },
          },
          stImageMatcher
        )
      ).toBe(true);
      expect(
        evaluateRuleset(
          stBlocks,
          {
            auth: null,
            op: 'create',
            path: '/user_pending_photos/over-10mb-by-1b.heic',
            incomingMeta: { size: 10 * 1024 * 1024 + 1, contentType: 'image/heic' },
          },
          stImageMatcher
        )
      ).toBe(false);
      expect(
        evaluateRuleset(
          stBlocks,
          {
            auth: null,
            op: 'update',
            path: '/user_pending_photos/exact-10mb.heic',
            incomingMeta: { size: 1024, contentType: 'image/jpeg' },
          },
          stImageMatcher
        )
      ).toBe(false);

      // All 8 whitelisted raster MIME types succeed on legitimate upload paths
      for (const validMime of [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/avif',
        'image/heic',
        'image/heif',
      ]) {
        expect(
          evaluateRuleset(
            stBlocks,
            {
              auth: { uid: 'u1' },
              op: 'create',
              path: '/profiles/u1/avatar.img',
              incomingMeta: { size: 512 * 1024, contentType: validMime },
            },
            stImageMatcher
          )
        ).toBe(true);
        expect(
          evaluateRuleset(
            stBlocks,
            {
              auth: null,
              op: 'create',
              path: '/user_pending_photos/pending.img',
              incomingMeta: { size: 512 * 1024, contentType: validMime },
            },
            stImageMatcher
          )
        ).toBe(true);
      }

      expect(
        evaluateRuleset(
          stBlocks,
          {
            auth: { uid: 'u1' },
            op: 'create',
            path: '/field_reports/170000-photo.jpg',
            incomingMeta: { size: 2 * 1024 * 1024, contentType: 'image/jpeg' },
          },
          stImageMatcher
        )
      ).toBe(true);
      expect(
        evaluateRuleset(
          stBlocks,
          {
            auth: null,
            op: 'create',
            path: '/field_reports/unauth-photo.jpg',
            incomingMeta: { size: 1024, contentType: 'image/jpeg' },
          },
          stImageMatcher
        )
      ).toBe(false);
      expect(
        evaluateRuleset(
          stBlocks,
          {
            auth: { uid: 'u1' },
            op: 'create',
            path: '/user_reviews/oversized.png',
            incomingMeta: { size: 15 * 1024 * 1024, contentType: 'image/png' },
          },
          stImageMatcher
        )
      ).toBe(false);
      expect(
        evaluateRuleset(
          stBlocks,
          {
            auth: { uid: 'u1' },
            op: 'delete',
            path: '/user_reviews/170000-photo.jpg',
          },
          stImageMatcher
        )
      ).toBe(false);
      expect(
        evaluateRuleset(
          stBlocks,
          {
            auth: { uid: 'u1' },
            op: 'get',
            path: '/internal_backups/dump.json',
          },
          stImageMatcher
        )
      ).toBe(false);
    });

    it('verifies Zero-Admin-Surface, pre-hydration exclusion, constant-time/safe boardAuth, proxy Origin anti-spoofing, Cron Host guard, and SSRF/XSS-safe proxy-image', async () => {
      // 1) Public anonymous mode: zero /admin UI route and neutralized admin.config.ts
      expect(fs.existsSync(path.join(FRONTEND_ROOT, 'src', 'app', 'admin'))).toBe(false);
      expect(ADMIN_EMAILS).toEqual([]);
      expect(isAdmin()).toBe(false);
      expect(isAdmin('ocs5672@gmail.com')).toBe(false);

      // 2) Pre-hydration admin exclusion boundary & edge cases
      expect(hasAdminExclusionCookie(undefined)).toBe(false);
      expect(hasAdminExclusionCookie('dview_is_admin=false; theme=dark')).toBe(false);
      expect(hasAdminExclusionCookie('dview_is_admin_other=true')).toBe(false);
      expect(hasAdminExclusionCookie('foo=bar; dview_is_admin=true; baz=1')).toBe(true);
      expect(
        isRequestFromExcludedAdmin({
          cookies: {
            get: () => {
              throw new Error('edge cookie getter failure');
            },
          },
          headers: { get: () => 'a=1; dview_is_admin=1' },
        })
      ).toBe(true);

      const guardScript = buildPreHydrationAdminGuardScript('G-Y17BHJ77W6');
      expect(guardScript).toContain('ga-disable-');
      expect(guardScript).toContain('G-Y17BHJ77W6');

      // 3) Anonymous Lounge CSPRNG + SHA-256 + malformed URI cookie resilience + timing-safe compare
      const tokenA = generateAuthorToken();
      const tokenB = generateAuthorToken();
      expect(tokenA).toMatch(/^[0-9a-f]{64}$/);
      expect(tokenA).not.toBe(tokenB);

      expect(() => hashAuthorToken('')).toThrow(/Valid author token/);
      expect(() => hashAuthorToken('   ')).toThrow(/Valid author token/);

      const hashA = hashAuthorToken(`  ${tokenA}  `);
      expect(canDelete(null, { authorTokenHash: hashA })).toBe(false);
      expect(canDelete('short', { authorTokenHash: hashA })).toBe(false);
      expect(canDelete(hashAuthorToken(tokenB), { authorTokenHash: hashA })).toBe(false);
      expect(canDelete(hashA, { authorTokenHash: hashA })).toBe(true);

      const malformedCookieReq = new Request('https://dongtanview.com/api/board/posts', {
        headers: { cookie: 'dview_author_token=%E0%A4%A' },
      });
      expect(() => extractAuthorToken(malformedCookieReq)).not.toThrow();
      expect(extractAuthorToken(malformedCookieReq)).toBe('%E0%A4%A');

      // 4) Edge proxy Origin anti-spoofing (blocks Referer query bypass & suffix spoofing)
      const spoofedRefererReq = new NextRequest('https://dongtanview.com/api/bypass-notice', {
        headers: {
          origin: 'https://evil-scraper.example.com',
          referer: 'https://evil-scraper.example.com/scrape?target=dongtanview.com',
        },
      });
      expect((await proxy(spoofedRefererReq)).status).toBe(403);

      const suffixSpoofReq = new NextRequest('https://dongtanview.com/api/bypass-notice', {
        headers: { origin: 'https://dongtanview.com.evil.example.com' },
      });
      expect((await proxy(suffixSpoofReq)).status).toBe(403);

      const prefixSpoofReq = new NextRequest('https://dongtanview.com/api/bypass-notice', {
        headers: { origin: 'https://evil-dongtanview.com' },
      });
      expect((await proxy(prefixSpoofReq)).status).toBe(403);

      const legitOriginReq = new NextRequest('https://dongtanview.com/api/bypass-notice', {
        headers: { origin: 'https://dongtanview.com' },
      });
      expect((await proxy(legitOriginReq)).status).not.toBe(403);

      // 5) Cron send-tx-notifications & POST /api/push/notify-new-high block unauthenticated & spoofed Host/User-Agent in production
      const origNodeEnv = process.env.NODE_ENV;
      const origCronSecret = process.env.CRON_SECRET;
      const origBuildingKey = process.env.BUILDING_API_KEY;
      try {
        (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
        process.env.CRON_SECRET = 'prod-super-secret';
        process.env.BUILDING_API_KEY = 'prod-building-key';

        const spoofedHostCronReq = new NextRequest(
          'https://dongtanview.com/api/cron/send-tx-notifications?dryRun=true',
          { headers: { host: 'localhost:5000' } }
        );
        const cronRes = await sendTxNotificationsGet(spoofedHostCronReq);
        expect(cronRes.status).toBe(401);

        const unauthPushReq = new NextRequest('https://dongtanview.com/api/push/notify-new-high', {
          method: 'POST',
        });
        expect((await notifyNewHighPost(unauthPushReq)).status).toBe(401);

        const spoofedHostPushReq = new NextRequest(
          'https://dongtanview.com/api/push/notify-new-high',
          {
            method: 'POST',
            headers: {
              host: 'localhost:5000',
              'user-agent': 'vercel-cron/1.0',
              'x-vercel-cron': '1',
            },
          }
        );
        expect((await notifyNewHighPost(spoofedHostPushReq)).status).toBe(401);

        const validBearerPushReq = new NextRequest(
          'https://dongtanview.com/api/push/notify-new-high',
          {
            method: 'POST',
            headers: { authorization: 'Bearer prod-super-secret' },
          }
        );
        expect(isAuthorizedNotifyNewHighRequest(validBearerPushReq)).toBe(true);

        const validApiKeyPushReq = new NextRequest(
          'https://dongtanview.com/api/push/notify-new-high',
          {
            method: 'POST',
            headers: { 'x-building-api-key': 'prod-building-key' },
          }
        );
        expect(isAuthorizedNotifyNewHighRequest(validApiKeyPushReq)).toBe(true);
      } finally {
        (process.env as Record<string, string | undefined>).NODE_ENV = origNodeEnv;
        if (origCronSecret === undefined) delete process.env.CRON_SECRET;
        else process.env.CRON_SECRET = origCronSecret;
        if (origBuildingKey === undefined) delete process.env.BUILDING_API_KEY;
        else process.env.BUILDING_API_KEY = origBuildingKey;
      }

      // 6) /api/proxy-image SSRF, port-scan, self-recursive API amplification, chunked DoS & Stored/Reflected XSS defense
      expect(isForbiddenIpOrHost('127.0.0.1')).toBe(true);
      expect(isForbiddenIpOrHost('169.254.169.254')).toBe(true);
      expect(isForbiddenIpOrHost('10.0.0.8')).toBe(true);
      expect(isForbiddenIpOrHost('172.16.5.4')).toBe(true);
      expect(isForbiddenIpOrHost('192.168.1.1')).toBe(true);
      expect(isForbiddenIpOrHost('::1')).toBe(true);
      expect(isForbiddenIpOrHost('metadata.google.internal')).toBe(true);
      expect(validateProxyImageTargetUrl('http://firebasestorage.googleapis.com/a.jpg').valid).toBe(
        false
      );
      expect(validateProxyImageTargetUrl('https://169.254.169.254/latest/meta-data/').valid).toBe(
        false
      );
      expect(validateProxyImageTargetUrl('https://evil.example.com/xss.png').valid).toBe(false);
      expect(validateProxyImageTargetUrl('https://dongtanview.com:6379/probe.jpg').valid).toBe(
        false
      );
      expect(
        validateProxyImageTargetUrl('https://firebasestorage.googleapis.com:8443/v0/b/a.jpg').valid
      ).toBe(false);
      expect(
        validateProxyImageTargetUrl(
          'https://dongtanview.com/api/proxy-image?url=https%3A%2F%2Fdongtanview.com%2Flogo.png'
        ).valid
      ).toBe(false);
      expect(validateProxyImageTargetUrl('https://sub.dview.kr/api/bypass-notice').valid).toBe(
        false
      );
      expect(validateProxyImageTargetUrl('https://dongtanview.com/images/og-banner.png').valid).toBe(
        true
      );
      expect(
        validateProxyImageTargetUrl(
          'https://firebasestorage.googleapis.com/v0/b/portfolio-dtdls/o/img.webp'
        ).valid
      ).toBe(true);

      const ssrfReq = new NextRequest(
        'https://dongtanview.com/api/proxy-image?url=' +
          encodeURIComponent('https://169.254.169.254/latest/meta-data/')
      );
      expect((await proxyImageGet(ssrfReq)).status).toBe(403);

      const portScanProxyReq = new NextRequest(
        'https://dongtanview.com/api/proxy-image?url=' +
          encodeURIComponent('https://dongtanview.com:6379/probe.jpg')
      );
      expect((await proxyImageGet(portScanProxyReq)).status).toBe(403);

      const recursiveSelfProxyReq = new NextRequest(
        'https://dongtanview.com/api/proxy-image?url=' +
          encodeURIComponent('https://dongtanview.com/api/proxy-image?url=https://dview.kr/a.png')
      );
      expect((await proxyImageGet(recursiveSelfProxyReq)).status).toBe(403);

      const origFetch = global.fetch;
      try {
        global.fetch = jest.fn().mockResolvedValueOnce(
          new Response('<svg onload="alert(1)"></svg>', {
            status: 200,
            headers: { 'content-type': 'image/svg+xml' },
          })
        );
        const svgXssReq = new NextRequest(
          'https://dongtanview.com/api/proxy-image?url=' +
            encodeURIComponent(
              'https://firebasestorage.googleapis.com/v0/b/portfolio-dtdls/o/evil.svg'
            )
        );
        expect((await proxyImageGet(svgXssReq)).status).toBe(415);

        global.fetch = jest.fn().mockResolvedValueOnce(
          new Response(new Uint8Array([137, 80, 78, 71]), {
            status: 200,
            headers: { 'content-type': 'image/png' },
          })
        );
        const safePngReq = new NextRequest(
          'https://dongtanview.com/api/proxy-image?url=' +
            encodeURIComponent(
              'https://firebasestorage.googleapis.com/v0/b/portfolio-dtdls/o/ok.png'
            )
        );
        const safePngRes = await proxyImageGet(safePngReq);
        expect(safePngRes.status).toBe(200);
        expect(safePngRes.headers.get('x-content-type-options')).toBe('nosniff');
        expect(safePngRes.headers.get('content-security-policy')).toContain("default-src 'none'");

        global.fetch = jest.fn().mockResolvedValueOnce(
          new Response(new Uint8Array([0, 0, 0, 24]), {
            status: 200,
            headers: { 'content-type': 'image/heic' },
          })
        );
        const safeHeicReq = new NextRequest(
          'https://dongtanview.com/api/proxy-image?url=' +
            encodeURIComponent(
              'https://firebasestorage.googleapis.com/v0/b/portfolio-dtdls/o/ios.heic'
            )
        );
        expect((await proxyImageGet(safeHeicReq)).status).toBe(200);

        // Chunked >10MB response WITHOUT Content-Length header must cancel stream immediately with 413
        let chunksPulled = 0;
        let streamCancelled = false;
        const threeMbChunk = new Uint8Array(3 * 1024 * 1024);
        const oversizedChunkedStream = new ReadableStream<Uint8Array>({
          pull(controller) {
            chunksPulled += 1;
            if (chunksPulled <= 10) {
              controller.enqueue(threeMbChunk);
            } else {
              controller.close();
            }
          },
          cancel() {
            streamCancelled = true;
          },
        });
        global.fetch = jest.fn().mockResolvedValueOnce(
          new Response(oversizedChunkedStream, {
            status: 200,
            headers: { 'content-type': 'image/jpeg' },
          })
        );
        const chunkedBombReq = new NextRequest(
          'https://dongtanview.com/api/proxy-image?url=' +
            encodeURIComponent(
              'https://firebasestorage.googleapis.com/v0/b/portfolio-dtdls/o/chunked-bomb.jpg'
            )
        );
        const chunkedBombRes = await proxyImageGet(chunkedBombReq);
        expect(chunkedBombRes.status).toBe(413);
        expect(streamCancelled).toBe(true);
        expect(chunksPulled).toBeLessThanOrEqual(5);
      } finally {
        global.fetch = origFetch;
      }

      // 7) storage.service.ts uploadImage client-side defense-in-depth rejects SVG & enforces normalized metadata + post-compression size
      expect(ALLOWED_RASTER_IMAGE_MIME_TYPES.has('image/svg+xml')).toBe(false);
      expect(ALLOWED_RASTER_IMAGE_MIME_TYPES.has('image/heic')).toBe(true);
      await expect(
        uploadImage(
          new File(['<svg onload="alert(1)"></svg>'], 'xss.svg', { type: 'image/svg+xml' }),
          'user_pending_photos'
        )
      ).rejects.toThrow(/Unsupported image MIME type/);
      await expect(
        uploadImage(new File([], 'empty.jpg', { type: 'image/jpeg' }), 'user_pending_photos')
      ).rejects.toThrow(/Invalid image file size/);

      const compressSpy = jest.spyOn(imageCompressionModule, 'compressImage');
      const uploadRawSpy = jest.spyOn(StorageRepo, 'uploadRawBytes');
      try {
        compressSpy.mockResolvedValueOnce(
          new File([new Uint8Array([255, 216, 255, 224])], 'compressed', {
            type: 'IMAGE/JPEG; charset=utf-8',
          })
        );
        uploadRawSpy.mockResolvedValueOnce(
          'https://firebasestorage.googleapis.com/v0/b/portfolio-dtdls.appspot.com/o/user_pending_photos%2F1.jpg?alt=media'
        );
        const uploadedUrl = await uploadImage(
          new File([new Uint8Array([137, 80, 78, 71])], 'screenshot.png', { type: 'image/png' }),
          'user_pending_photos'
        );
        expect(uploadedUrl).toContain('https://firebasestorage.googleapis.com/');
        expect(uploadRawSpy).toHaveBeenCalledTimes(1);
        const [uploadedPath, , uploadedMeta] = uploadRawSpy.mock.calls[0];
        expect(uploadedPath).toMatch(/^user_pending_photos\/\d+-[a-z0-9]+\.jpg$/);
        expect(uploadedMeta).toEqual({ contentType: 'image/jpeg' });

        compressSpy.mockResolvedValueOnce(new File([], 'zero.jpg', { type: 'image/jpeg' }));
        await expect(
          uploadImage(
            new File([new Uint8Array([255, 216, 255])], 'valid.jpg', { type: 'image/jpeg' }),
            'user_pending_photos'
          )
        ).rejects.toThrow(/Invalid compressed image file size/);
      } finally {
        compressSpy.mockRestore();
        uploadRawSpy.mockRestore();
      }
    });

    it('enforces client-bundle Firebase Admin isolation, clean UTF-8 .gitignore hygiene, and AdSense publisher compliance', () => {
      expect(firebaseAdminClientStub).toEqual({
        adminAuth: null,
        adminDb: null,
        FieldValue: null,
        Timestamp: null,
        admin: null,
      });

      const nextConfigText = fs.readFileSync(path.join(FRONTEND_ROOT, 'next.config.ts'), 'utf8');
      const proxyText = fs.readFileSync(path.join(FRONTEND_ROOT, 'src', 'proxy.ts'), 'utf8');
      expect(nextConfigText).toContain('productionBrowserSourceMaps: false');
      expect(nextConfigText).toContain("'./src/lib/firebaseAdmin.client.ts'");
      expect(nextConfigText).toContain('Strict-Transport-Security');
      expect(nextConfigText).toContain('same-origin-allow-popups');
      expect(proxyText).toContain('Content-Security-Policy');
      expect(proxyText).toContain('X-Content-Type-Options');

      const adsTxt = fs.readFileSync(path.join(FRONTEND_ROOT, 'public', 'ads.txt'), 'utf8').trim();
      expect(adsTxt).toBe('google.com, pub-1103228112872356, DIRECT, f08c47fec0942fa0');
      expect(securityMd).toContain('pub-1103228112872356');

      const robotsConfig = robots();
      const rulesArray = Array.isArray(robotsConfig.rules)
        ? robotsConfig.rules
        : [robotsConfig.rules];
      const mediaPartnersRule = rulesArray.find((r) => r.userAgent === 'Mediapartners-Google');
      expect(mediaPartnersRule?.allow).toBe('/');
      const wildcardRule = rulesArray.find((r) => r.userAgent === '*');
      expect(wildcardRule?.disallow).toEqual(
        expect.arrayContaining(['/api/cron/', '/api/ads/', '/api/push/', '/api/indexing/'])
      );

      expect(SEO_FORBIDDEN_CLOAKING_CLASSES).toEqual(
        expect.arrayContaining(['sr-only', 'opacity-0', 'invisible', 'hidden'])
      );
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { JSDOM } = require('jsdom') as {
        JSDOM: new (html: string) => { window: { document: Document } };
      };
      const cloakedDoc = new JSDOM(
        '<main><h1 class="sr-only">Cloaked Title</h1><p class="opacity-0">Hidden SEO prose</p></main>'
      ).window.document;
      const cloakedAudit = auditSeoSemanticContainer(cloakedDoc.querySelector('main')!);
      expect(cloakedAudit.valid).toBe(false);
      expect(cloakedAudit.violations.map((v) => v.code)).toEqual(
        expect.arrayContaining(['H1_CLOAKED', 'ILLEGAL_PROSE_CLOAKING'])
      );

      const privacySource = fs.readFileSync(
        path.join(FRONTEND_ROOT, 'src', 'app', 'privacy', 'page.tsx'),
        'utf8'
      );
      expect(privacySource).toContain('ocs5672@gmail.com');
      expect(privacySource).toContain('제8조 (Google AdSense 광고 및 쿠키 운영 고지)');
      expect(securityMd).toContain('ocs5672@gmail.com');
      expect(securityMd).toContain('제8조');

      // Both root and frontend .gitignore must be pure UTF-8 without null bytes
      const rootGitignoreBuf = fs.readFileSync(path.join(REPO_ROOT, '.gitignore'));
      const frontendGitignoreBuf = fs.readFileSync(path.join(FRONTEND_ROOT, '.gitignore'));
      expect(rootGitignoreBuf.includes(0)).toBe(false);
      expect(frontendGitignoreBuf.includes(0)).toBe(false);

      const checkIgnored = (relPath: string): boolean => {
        try {
          execFileSync('git', ['check-ignore', '-q', relPath], { cwd: REPO_ROOT });
          return true;
        } catch {
          return false;
        }
      };
      expect(checkIgnored('DEAD_ENDS.md')).toBe(false);
      expect(checkIgnored('DVIEW_SECURITY.md')).toBe(false);
      expect(checkIgnored('frontend/.env.example')).toBe(false);
      expect(checkIgnored('frontend/.env.local')).toBe(true);
      expect(checkIgnored('serviceAccountKey.json')).toBe(true);
      expect(checkIgnored('frontend/serviceAccountKey.json')).toBe(true);
      expect(checkIgnored('portfolio-dtdls-firebase-adminsdk-test.json')).toBe(true);
      expect(checkIgnored('frontend/portfolio-dtdls-firebase-adminsdk-test.json')).toBe(true);
    });
  });

  describe('2. DEAD_ENDS.md Empirical Anti-Pattern Registry & Active Guardrail Enforcement', () => {
    const deadEndsPath = path.join(REPO_ROOT, 'DEAD_ENDS.md');
    const deadEndsMd = fs.readFileSync(deadEndsPath, 'utf8');

    it('documents all 5 canonical dead ends (DE-01 ~ DE-05) cleanly without emojis or broken links within lean token budget', () => {
      expect(EMOJI_PICTOGRAPH_REGEX.test(deadEndsMd)).toBe(false);
      for (const regex of LEGACY_UNPREFIXED_PATTERNS) {
        expect(regex.test(deadEndsMd)).toBe(false);
      }

      const lines = deadEndsMd.replace(/\r\n/g, '\n').split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(70);
      expect(lines.length).toBeLessThanOrEqual(200);
      expect(fs.statSync(deadEndsPath).size).toBeLessThan(20 * 1024);

      for (const id of ['DE-01', 'DE-02', 'DE-03', 'DE-04', 'DE-05']) {
        const occurrences = deadEndsMd.split(id).length - 1;
        expect(occurrences).toBeGreaterThanOrEqual(2);
      }

      const relLinks = extractRelativeMarkdownLinks(deadEndsMd);
      expect(relLinks.length).toBeGreaterThanOrEqual(15);
      for (const relTarget of relLinks) {
        const resolved = path.resolve(path.dirname(deadEndsPath), relTarget);
        expect(fs.existsSync(resolved)).toBe(true);
      }
    });

    it('enforces every active guardrail cited in DE-01 through DE-05 across the live repository (including bare monospace check)', () => {
      const syncWorkflow = fs.readFileSync(
        path.join(REPO_ROOT, '.github', 'workflows', 'sync-transactions.yml'),
        'utf8'
      );
      expect(syncWorkflow).toContain("TZ: 'Asia/Seoul'");
      expect(syncWorkflow).toContain("cron: '38 20 * * *'");
      expect(syncWorkflow).toContain("cron: '18 21 * * *'");
      expect(syncWorkflow).toContain("cron: '38 21 * * *'");

      const officeRepo = fs.readFileSync(
        path.join(FRONTEND_ROOT, 'src', 'lib', 'repositories', 'officeTx.repository.ts'),
        'utf8'
      );
      const technoClient = fs.readFileSync(
        path.join(FRONTEND_ROOT, 'src', 'app', 'technovalley', 'TechnoValleyClient.tsx'),
        'utf8'
      );
      expect(officeRepo).toContain('RTMSDataSvcNrgTrade');
      expect(technoClient).toContain('등록된 실거래 내역이 없습니다.');

      // DE-03: Zero legacy monospace / fixed-width fonts across ALL non-test source files in frontend/src
      const prodSourceFiles = collectNonTestSourceFiles(path.join(FRONTEND_ROOT, 'src'));
      expect(prodSourceFiles.length).toBeGreaterThanOrEqual(150);
      const legacyFontRegex =
        /\b(?:font-mono|ui-monospace|monospace|Gulim|GulimChe|Dotum|DotumChe|Batang|BatangChe|Consolas)\b|Courier New/i;
      const fontViolations: string[] = [];
      for (const absFile of prodSourceFiles) {
        const text = fs.readFileSync(absFile, 'utf8');
        if (legacyFontRegex.test(text)) {
          fontViolations.push(path.relative(FRONTEND_ROOT, absFile).replace(/\\/g, '/'));
        }
      }
      expect(fontViolations).toEqual([]);

      expect(fs.existsSync(path.join(FRONTEND_ROOT, '.agent'))).toBe(false);
      expect(fs.existsSync(path.join(FRONTEND_ROOT, '.agents'))).toBe(false);
      expect(
        fs.statSync(path.join(REPO_ROOT, 'DVIEW_PORTFOLIO DVIEW - Patch History.md')).size
      ).toBeLessThan(30 * 1024);

      const adBlockHook = fs.readFileSync(
        path.join(FRONTEND_ROOT, 'src', 'hooks', 'useAdBlockDetector.ts'),
        'utf8'
      );
      expect(adBlockHook).toContain('useSyncExternalStore');
      expect(
        fs.existsSync(path.join(FRONTEND_ROOT, 'src', 'components', 'ads', 'core', 'adSlotGeometry.ts'))
      ).toBe(true);
      expect(
        fs.existsSync(
          path.join(FRONTEND_ROOT, 'src', 'components', 'ads', 'views', 'AdSlotCascadeFallbackView.tsx')
        )
      ).toBe(true);
    });
  });

  describe('3. Roadmap Closure (§6.1~§6.4) & Token Diet Acceptance Benchmark (§7.1~§7.4)', () => {
    it('completes 100% of roadmap items in AGENT_SKILL_REPORT_OPTIMIZATION_PLAN.md and exposes Security & Dead Ends across all SSOT hubs', async () => {
      const masterPlan = fs.readFileSync(
        path.join(REPO_ROOT, 'AGENT_SKILL_REPORT_OPTIMIZATION_PLAN.md'),
        'utf8'
      );
      const completedBoxes = masterPlan.match(/^- \[x\] /gm) ?? [];
      const remainingBoxes = masterPlan.match(/^- \[ \] /gm) ?? [];
      expect(completedBoxes.length).toBe(13);
      expect(remainingBoxes).toEqual([]);

      const agentMd = fs.readFileSync(path.join(REPO_ROOT, 'DVIEW_AGENT.md'), 'utf8');
      expect(agentMd).toContain('./DVIEW_SECURITY.md');
      expect(agentMd).toContain('./DEAD_ENDS.md');

      const projectMd = fs.readFileSync(path.join(REPO_ROOT, 'DVIEW_PROJECT.md'), 'utf8');
      expect(projectMd).toContain('./DVIEW_SECURITY.md');
      expect(projectMd).toContain('./DEAD_ENDS.md');

      const frontendReadme = fs.readFileSync(path.join(FRONTEND_ROOT, 'README.md'), 'utf8');
      expect(frontendReadme).toContain('../DVIEW_SECURITY.md');
      expect(frontendReadme).toContain('../DEAD_ENDS.md');

      const pipelineSkillMd = fs.readFileSync(
        path.join(REPO_ROOT, '.agent', 'skills', 'dview-real-data-pipeline', 'SKILL.md'),
        'utf8'
      );
      expect(pipelineSkillMd).toContain('../../../DEAD_ENDS.md');

      const liveReport = await getEngineeringReport();
      expect(liveReport.metadata.grade).toBe('S+');
      expect(liveReport.metadata.branch).toBe('master');
      expect(liveReport.markdownContent).toContain('[`DVIEW_SECURITY.md`](./DVIEW_SECURITY.md)');
      expect(liveReport.markdownContent).toContain('[`DEAD_ENDS.md`](./DEAD_ENDS.md)');
    });

    it('achieves >80% context & history token footprint reduction compared to pre-optimization baseline', () => {
      const alwaysOnRules = [
        path.join(REPO_ROOT, '.agent', 'rules', 'DVIEW_DRSP.md'),
        path.join(REPO_ROOT, '.agent', 'rules', 'DVIEW_strict-real-data-only.md'),
      ];
      const alwaysOnBytes = alwaysOnRules.reduce((sum, p) => sum + fs.statSync(p).size, 0);
      expect(alwaysOnBytes).toBeLessThan(6 * 1024);

      const startupDocs = [
        path.join(REPO_ROOT, 'DVIEW_AGENT.md'),
        ...alwaysOnRules,
        path.join(REPO_ROOT, '.agent', 'workflows', 'DVIEW_git-push.md'),
        path.join(REPO_ROOT, '.agent', 'workflows', 'DVIEW_localhost-open.md'),
      ];
      const startupBytes = startupDocs.reduce((sum, p) => sum + fs.statSync(p).size, 0);
      expect(startupBytes).toBeLessThan(16 * 1024);

      const legacyPatchHistoryBaselineBytes = 296 * 1024;
      const activeKnowledgeBytes =
        fs.statSync(path.join(REPO_ROOT, 'DVIEW_PORTFOLIO DVIEW - Patch History.md')).size +
        fs.statSync(path.join(REPO_ROOT, 'DVIEW_SECURITY.md')).size +
        fs.statSync(path.join(REPO_ROOT, 'DEAD_ENDS.md')).size;

      const reductionRatio = 1 - activeKnowledgeBytes / legacyPatchHistoryBaselineBytes;
      expect(reductionRatio).toBeGreaterThan(0.8);
    });
  });
});
