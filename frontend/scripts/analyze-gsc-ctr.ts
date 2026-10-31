/**
 * @file scripts/analyze-gsc-ctr.ts
 * @description CLI diagnostic for D-VIEW Google Search Console query impressions & CTR boost opportunities.
 * Supports:
 *   1. Offline GSC CSV/TSV export: `npm run seo:ctr -- path/to/Queries.csv`
 *   2. Live Google Search Console API (`searchconsole.googleapis.com`) + Live GA4 Organic Search fallback: `npm run seo:ctr`
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import type { CtrOpportunityReport } from '@/lib/services/searchConsoleCtr';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

function loadKnownApartmentKeys(): string[] {
  try {
    const summaryPath = path.resolve(process.cwd(), 'public/data/tx-summary.json');
    if (!fs.existsSync(summaryPath)) return [];
    const raw = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
    const summaryObj = raw?.summary && typeof raw.summary === 'object' ? raw.summary : raw;
    return Object.keys(summaryObj || {});
  } catch {
    return [];
  }
}

function printOpportunityReport(label: string, report: CtrOpportunityReport) {
  console.log(`\n=== ${label} ===`);
  console.log(
    `총 분석 검색어: ${report.totalQueries}개 | 총 클릭: ${report.totalClicks}회 | 총 노출: ${report.totalImpressions}회 | 평균 CTR: ${report.overallCtr}%`
  );

  if (report.zeroClickOpportunities.length > 0) {
    console.log(`\n[1순위] 노출 후 미클릭(0-Click) 검색어 TOP 10 (${report.zeroClickOpportunities.length}개):`);
    for (const item of report.zeroClickOpportunities.slice(0, 10)) {
      console.log(
        `  - "${item.query}" | 노출 ${item.impressions}회 | 순위 ${item.position}위 (기대 CTR ${item.expectedCtr}%) -> ${item.targetRoute}\n    조치: ${item.recommendedAction}`
      );
    }
  }

  if (report.lowCtrPage1Opportunities.length > 0) {
    console.log(`\n[2순위] 1페이지 노출 중이나 기대 CTR 미달 검색어 TOP 10 (${report.lowCtrPage1Opportunities.length}개):`);
    for (const item of report.lowCtrPage1Opportunities.slice(0, 10)) {
      console.log(
        `  - "${item.query}" | 클릭 ${item.clicks}/${item.impressions} (${item.ctr}% vs 기대 ${item.expectedCtr}%) | 순위 ${item.position}위 -> ${item.targetRoute}\n    조치: ${item.recommendedAction}`
      );
    }
  }

  if (report.strikingDistanceOpportunities.length > 0) {
    console.log(`\n[3순위] 2페이지(11~20위) 도약 후보 검색어 TOP 10 (${report.strikingDistanceOpportunities.length}개):`);
    for (const item of report.strikingDistanceOpportunities.slice(0, 10)) {
      console.log(
        `  - "${item.query}" | 노출 ${item.impressions}회 | 순위 ${item.position}위 -> ${item.targetRoute}\n    조치: ${item.recommendedAction}`
      );
    }
  }
}

async function printLiveGa4OrganicLandingPages() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n').replace(/"/g, '');
  const prop = process.env.GA_PROPERTY_ID;
  if (!email || !key || !prop) {
    console.log('\n[GA4 Organic Fallback] GA_PROPERTY_ID 또는 서비스 계정 환경변수가 설정되지 않았습니다.');
    return;
  }

  try {
    const client = new BetaAnalyticsDataClient({
      credentials: { client_email: email, private_key: key },
    });
    const [report] = await client.runReport({
      property: `properties/${prop}`,
      dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'sessionSourceMedium' }, { name: 'pagePath' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'screenPageViews' }, { name: 'averageSessionDuration' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 40,
    });

    interface Ga4ReportRow {
      dimensionValues?: Array<{ value?: string | null }> | null;
      metricValues?: Array<{ value?: string | null }> | null;
    }

    const organicRows = ((report.rows || []) as Ga4ReportRow[]).filter((r: Ga4ReportRow) => {
      const sm = r.dimensionValues?.[0]?.value || '';
      return sm.includes('organic') || sm.includes('search') || sm.includes('chatgpt');
    });

    console.log('\n=== [실측 GA4] 최근 28일 자연 검색(Google/Naver/Bing) 및 AI 검색 유입 랜딩 페이지 ===');
    for (const r of organicRows) {
      const sm = r.dimensionValues?.[0]?.value || '';
      const pagePath = r.dimensionValues?.[1]?.value || '';
      const sessions = r.metricValues?.[0]?.value || '0';
      const views = r.metricValues?.[2]?.value || '0';
      const avgSec = Math.round(Number(r.metricValues?.[3]?.value || 0));
      console.log(`  - [${sm}] ${pagePath} | 세션 ${sessions} | 조회수 ${views} | 평균 체류 ${avgSec}초`);
    }
  } catch (err) {
    console.log('\n[GA4 Organic Fallback] 조회 실패:', err instanceof Error ? err.message : String(err));
  }
}

async function main() {
  const {
    parseGscQueriesInput,
    classifyCtrOpportunities,
    analyzeLiveSearchConsoleCtr,
  } = await import('@/lib/services/searchConsoleCtr');

  const knownApartmentKeys = loadKnownApartmentKeys();
  const csvArg = process.argv[2];

  if (csvArg) {
    const targetPath = path.resolve(process.cwd(), csvArg);
    if (!fs.existsSync(targetPath)) {
      console.error(`파일을 찾을 수 없습니다: ${targetPath}`);
      process.exit(1);
    }
    const rawText = fs.readFileSync(targetPath, 'utf-8');
    const parsedRows = parseGscQueriesInput(rawText);
    const report = classifyCtrOpportunities(parsedRows, {
      minImpressions: 1,
      knownApartmentKeys,
    });
    printOpportunityReport(`서치 콘솔 내보내기 파일 분석 (${path.basename(targetPath)})`, report);
    return;
  }

  const { fetchStatus, report } = await analyzeLiveSearchConsoleCtr({
    days: 28,
    rowLimit: 250,
    minImpressions: 1,
    knownApartmentKeys,
  });

  if (fetchStatus.ok) {
    printOpportunityReport(`Google Search Console 실시간 API (${fetchStatus.siteProperty})`, report);
  } else {
    console.log('\n=== [Google Search Console API 연동 상태 진단] ===');
    console.log(`상태 코드: ${fetchStatus.errorCode}`);
    if (fetchStatus.attemptedAccounts && fetchStatus.attemptedAccounts.length > 0) {
      for (const acc of fetchStatus.attemptedAccounts) {
        console.log(`- 서비스 계정: ${acc.serviceAccountEmail} (${acc.errorCode})`);
        if (acc.activationUrl) {
          console.log(`  1-Click API 활성화 URL: ${acc.activationUrl}`);
        } else if (acc.message) {
          console.log(`  상세 메시지: ${acc.message}`);
        }
      }
      if (fetchStatus.activationUrl && fetchStatus.serviceAccountEmail) {
        console.log(
          `안내: 위 GCP 콘솔 링크에서 Search Console API를 '사용(Enable)'하고, 서치 콘솔 [설정 -> 사용자 및 권한]에 '${fetchStatus.serviceAccountEmail}'을(를) 읽기 권한으로 추가하면 검색어 목록을 자동 수집합니다.`
        );
      }
    } else {
      if (fetchStatus.serviceAccountEmail) {
        console.log(`서비스 계정: ${fetchStatus.serviceAccountEmail}`);
      }
      if (fetchStatus.activationUrl) {
        console.log(`1-Click API 활성화 URL: ${fetchStatus.activationUrl}`);
      } else if (fetchStatus.message) {
        console.log(`상세 메시지: ${fetchStatus.message}`);
      }
    }
    console.log(`오프라인 분석 방법: 서치 콘솔 [실적 -> 검색어 -> 내보내기(CSV)] 후 'npm run seo:ctr -- Queries.csv' 실행`);
  }

  await printLiveGa4OrganicLandingPages();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
