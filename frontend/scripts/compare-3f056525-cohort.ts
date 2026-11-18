/**
 * @file scripts/compare-3f056525-cohort.ts
 * @description Live 7-day pre/post cohort telemetry comparison CLI for commit `3f056525`:
 *   - Pre-deployment 7-day baseline: 2026-11-11 ~ 2026-11-17
 *   - Post-deployment 7-day cohort:  2026-11-18 ~ 2026-11-24
 *
 * Usage:
 *   Set-Location frontend; npm run seo:compare-cohort
 *   Set-Location frontend; npm --silent run seo:compare-cohort -- --json
 *   Set-Location frontend; npm run seo:compare-cohort -- --out scratch/cohort-report.json
 *   Set-Location frontend; npm run seo:compare-cohort -- --pre-start 2026-11-11 --pre-end 2026-11-17 --post-start 2026-11-18 --post-end 2026-11-24
 */
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import type { ReleaseCohortComparisonReport } from '@/lib/services/releaseCohortComparison';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

const DEFAULT_PRE_START = '2026-11-11';
const DEFAULT_PRE_END = '2026-11-17';
const DEFAULT_POST_START = '2026-11-18';
const DEFAULT_POST_END = '2026-11-24';
const GUARD_LABEL = '분모 모수 0건(산출 불가)';

interface ParsedCliArgs {
  preStart: string;
  preEnd: string;
  postStart: string;
  postEnd: string;
  asOf?: string;
  outPath?: string;
  json: boolean;
}

function parseCliArgs(argv: ReadonlyArray<string>): ParsedCliArgs {
  let preStart = DEFAULT_PRE_START;
  let preEnd = DEFAULT_PRE_END;
  let postStart = DEFAULT_POST_START;
  let postEnd = DEFAULT_POST_END;
  let asOf: string | undefined;
  let outPath: string | undefined;
  let json = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const [flag, inlineVal] = arg.includes('=') ? arg.split('=', 2) : [arg, undefined];
    const readVal = () => {
      if (inlineVal !== undefined) return inlineVal;
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        i += 1;
        return next;
      }
      return '';
    };

    if (flag === '--json') {
      json = true;
    } else if (flag === '--pre-start') {
      const v = readVal();
      if (v) preStart = v;
    } else if (flag === '--pre-end') {
      const v = readVal();
      if (v) preEnd = v;
    } else if (flag === '--post-start') {
      const v = readVal();
      if (v) postStart = v;
    } else if (flag === '--post-end') {
      const v = readVal();
      if (v) postEnd = v;
    } else if (flag === '--as-of') {
      const v = readVal();
      if (v) asOf = v;
    } else if (flag === '--out') {
      const v = readVal();
      if (v) outPath = v;
    }
  }

  return { preStart, preEnd, postStart, postEnd, asOf, outPath, json };
}

function formatPositionOrDash(pos: number | null): string {
  return pos === null ? '-' : `${pos.toFixed(1)}위`;
}

function formatPosDelta(delta: number | null): string {
  if (delta === null) return GUARD_LABEL;
  if (delta === 0) return '0.0위 (변동 없음)';
  return delta < 0 ? `${delta.toFixed(1)}위 (순위 상승)` : `+${delta.toFixed(1)}위 (순위 하락)`;
}

function formatMaturityGuardedCountDelta(
  preCount: number,
  postCount: number,
  delta: number,
  report: ReleaseCohortComparisonReport
): string {
  if (!report.ga4Status.preOk || !report.ga4Status.postOk) {
    return `Pre ${preCount}세션 -> Post ${postCount}세션 [GA4 API 오류로 증감 비교 보류]`;
  }
  if (report.postMaturity.status !== 'COMPLETE') {
    return `Pre ${preCount}세션 -> Post ${postCount}세션 [사후 진행 중 ${report.postMaturity.elapsedCalendarDays}/${report.postMaturity.totalCalendarDays}일 · 7일 완결 전 단순 합계 비교 보류]`;
  }
  if (report.preMaturity.status !== 'COMPLETE') {
    return `Pre ${preCount}세션 -> Post ${postCount}세션 [사전 미완결 구간 · 단순 합계 비교 보류]`;
  }
  const sign = delta >= 0 ? '+' : '';
  return `Pre ${preCount}세션 -> Post ${postCount}세션 (${sign}${delta}세션)`;
}

function printHumanReadableReport(report: ReleaseCohortComparisonReport): void {
  const { preMaturity, postMaturity, calculatorFunnel, gscCtrLift } = report;

  console.log(
    `\n=== [D-VIEW 실측 코호트 비교] 커밋 ${report.commitHash} (배포: ${report.deployedAtKst}) ===`
  );
  console.log(`조회 기준일(KST): ${report.asOfKstDate} | GA4 속성: ${report.propertyId} | GSC 속성: ${report.gscSiteProperty ?? '미확인'}`);
  console.log(`- 사전 기준선(Pre 7일): ${preMaturity.statusSummaryKo}`);
  console.log(`- 사후 측정군(Post 7일): ${postMaturity.statusSummaryKo}`);

  if (!report.ga4Status.preOk || !report.ga4Status.postOk) {
    console.log(
      `[경고: GA4 API 조회 실패] 사전(${report.ga4Status.preOk ? '정상' : report.ga4Status.preError}) / 사후(${report.ga4Status.postOk ? '정상' : report.ga4Status.postError})`
    );
  }
  if (!report.gscStatus.preOk || !report.gscStatus.postOk) {
    console.log(
      `[경고: GSC API 조회 실패] 사전(${report.gscStatus.preOk ? '정상' : report.gscStatus.preError}) / 사후(${report.gscStatus.postOk ? '정상' : report.gscStatus.postError})${report.gscStatus.activationUrl ? ` | 활성화 URL: ${report.gscStatus.activationUrl}` : ''}`
    );
  }

  console.log('\n------------------------------------------------------------------------');
  console.log('1. [GA4 퍼널] open_calculator 전체 전환율 및 계측 정합성 전후 비교');
  console.log('------------------------------------------------------------------------');
  console.log(
    `  * 세션 기준 전환율(Session CVR): Pre ${calculatorFunnel.overallSessionCvr.preFormatted} -> Post ${calculatorFunnel.overallSessionCvr.postFormatted} | 변화폭: ${calculatorFunnel.overallSessionCvr.deltaFormatted}`
  );
  console.log(
    `  * 페이지뷰 기준 전환율(PV CVR):  Pre ${calculatorFunnel.overallPageViewCvr.preFormatted} -> Post ${calculatorFunnel.overallPageViewCvr.postFormatted} | 변화폭: ${calculatorFunnel.overallPageViewCvr.deltaFormatted}`
  );
  console.log(
    `  * 활성 사용자 기준 전환율:        Pre ${calculatorFunnel.overallUserCvr.preFormatted} -> Post ${calculatorFunnel.overallUserCvr.postFormatted} | 변화폭: ${calculatorFunnel.overallUserCvr.deltaFormatted}`
  );
  console.log(
    `  * 미분류((not set)) 레거시 비중:  Pre ${calculatorFunnel.unattributedNotSetShare.preFormatted} -> Post ${calculatorFunnel.unattributedNotSetShare.postFormatted} | 변화폭: ${calculatorFunnel.unattributedNotSetShare.deltaFormatted}`
  );
  console.log(
    `  * 금융 마이크로 인터랙션(finance_quick_interact): Pre ${calculatorFunnel.preFinanceQuickInteractEvents}건 -> Post ${calculatorFunnel.postFinanceQuickInteractEvents}건`
  );

  console.log('\n[1-A] open_calculator 트리거군별 노출 대비 전환율(Surface Exposure CVR):');
  for (const row of calculatorFunnel.byTriggerFamily) {
    const badge = row.introducedOrHardenedIn3f056525 ? '[3f056525 핵심]' : '[기존 상시]';
    console.log(
      `  - ${badge} ${row.labelKo}\n    분모(${row.denominatorLabelKo}): Pre ${row.surfaceExposureCvr.preFormatted} -> Post ${row.surfaceExposureCvr.postFormatted} | Δ ${row.surfaceExposureCvr.deltaFormatted}`
    );
  }

  if (calculatorFunnel.byRawTrigger.length > 0) {
    console.log('\n[1-B] 관측된 원시 trigger 파라미터별 이벤트·사용자 집계:');
    for (const r of calculatorFunnel.byRawTrigger) {
      console.log(
        `  - trigger="${r.key}": Pre ${r.preEventCount}건(${r.preUsers}명) -> Post ${r.postEventCount}건(${r.postUsers}명) | 세션 CVR Δ ${r.siteSessionCvr.deltaFormatted}`
      );
    }
  }

  console.log('\n[1-C] 계산기 유형(calculator_type)별 전환 분포:');
  for (const r of calculatorFunnel.byCalculatorType) {
    if (r.preEventCount === 0 && r.postEventCount === 0 && r.key === '(not set)') continue;
    console.log(
      `  - ${r.key}: Pre ${r.preEventCount}건(${r.preUsers}명) -> Post ${r.postEventCount}건(${r.postUsers}명) | 세션 CVR: Pre ${r.siteSessionCvr.preFormatted} -> Post ${r.siteSessionCvr.postFormatted}`
    );
  }

  console.log('\n[1-D] 진입 서피스(surface)별 전환 분포 (이벤트 발생 서피스 + 핵심 타깃):');
  for (const r of calculatorFunnel.bySurface) {
    console.log(
      `  - ${r.key}: Pre ${r.preEventCount}건(${r.preUsers}명) -> Post ${r.postEventCount}건(${r.postUsers}명)`
    );
  }

  console.log('\n------------------------------------------------------------------------');
  console.log('2. [GSC + GA4 Organic] 0-Click SEO 스니펫 고도화 라우트·검색어 CTR 전후 비교');
  console.log('------------------------------------------------------------------------');
  console.log(
    `  * 사이트 전체 GSC CTR: Pre ${gscCtrLift.overallPropertyCtr.preFormatted} (평균 ${formatPositionOrDash(gscCtrLift.preAveragePosition)}) -> Post ${gscCtrLift.overallPropertyCtr.postFormatted} (평균 ${formatPositionOrDash(gscCtrLift.postAveragePosition)}) | CTR Δ ${gscCtrLift.overallPropertyCtr.deltaFormatted} | 순위 Δ ${formatPosDelta(gscCtrLift.overallPositionDelta)}`
  );
  console.log(
    `  * 표출 검색어 중 0-Click 수·노출 비중(익명화 쿼리 제외): Pre ${gscCtrLift.preZeroClickQueryCount}개 (${gscCtrLift.zeroClickImpressionShare.preFormatted}) -> Post ${gscCtrLift.postZeroClickQueryCount}개 (${gscCtrLift.zeroClickImpressionShare.postFormatted})`
  );
  console.log(
    `  * 사전 0-Click 코호트 추적: 클릭 전환 성공 ${gscCtrLift.convertedZeroClickQueryCount}개 | 0-Click 유지 ${gscCtrLift.stillZeroClickQueryCount}개 | 사후 노출 집계 대기 ${gscCtrLift.pendingPostImpressionZeroClickCount}개`
  );
  console.log(
    `  * GA4 실시간 자연·AI 검색 유입 세션 합계: ${formatMaturityGuardedCountDelta(
      gscCtrLift.ga4OrganicTotalSessionsPre,
      gscCtrLift.ga4OrganicTotalSessionsPost,
      gscCtrLift.ga4OrganicDeltaSessions,
      report
    )}`
  );
  console.log(
    `  * GA4 전체 세션 대비 자연·AI 검색 비중: Pre ${gscCtrLift.ga4OrganicSessionShare.preFormatted} -> Post ${gscCtrLift.ga4OrganicSessionShare.postFormatted} | Δ ${gscCtrLift.ga4OrganicSessionShare.deltaFormatted}`
  );

  console.log('\n[2-A] 3f056525 타깃 랜딩 라우트별 GSC CTR 및 GA4 자연검색 세션 비교:');
  for (const r of gscCtrLift.byTargetRoute) {
    console.log(
      `  - ${r.labelKo} [${r.routeKey}]\n    GSC: Pre ${r.ctrComparison.preFormatted} (${formatPositionOrDash(r.prePosition)}) -> Post ${r.ctrComparison.postFormatted} (${formatPositionOrDash(r.postPosition)}) | CTR Δ ${r.ctrComparison.deltaFormatted}\n    GA4 자연검색: ${formatMaturityGuardedCountDelta(
        r.preGa4OrganicSessions,
        r.postGa4OrganicSessions,
        r.deltaGa4OrganicSessions,
        report
      )}`
    );
  }

  console.log('\n[2-B] 핵심 타깃 및 상위 0-Click 검색어별 CTR 변화:');
  for (const q of gscCtrLift.byTargetAndTopZeroClickQueries.slice(0, 20)) {
    const tag = q.isCanonicalTarget ? '[타깃]' : '[동적상위]';
    console.log(
      `  - ${tag} "${q.query}" -> ${q.targetRoute} (${q.resolutionState})\n    Pre ${q.ctrComparison.preFormatted} (${formatPositionOrDash(q.prePosition)}) -> Post ${q.ctrComparison.postFormatted} (${formatPositionOrDash(q.postPosition)}) | Δ ${q.ctrComparison.deltaFormatted}`
    );
  }
  console.log('');
}

async function main(): Promise<void> {
  const cli = parseCliArgs(process.argv.slice(2));
  const { analyzeLiveReleaseCohortComparison } = await import(
    '@/lib/services/releaseCohortComparison'
  );
  const report = await analyzeLiveReleaseCohortComparison({
    preWindow: { startDate: cli.preStart, endDate: cli.preEnd },
    postWindow: { startDate: cli.postStart, endDate: cli.postEnd },
    asOfKstDate: cli.asOf,
  });

  if (cli.outPath) {
    const resolvedOut = path.resolve(process.cwd(), cli.outPath);
    fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
    fs.writeFileSync(resolvedOut, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  }

  if (cli.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  printHumanReadableReport(report);
}

main().catch((err: unknown) => {
  console.error(
    '[compare-3f056525-cohort] 실행 실패:',
    err instanceof Error ? err.message : String(err)
  );
  process.exit(1);
});
