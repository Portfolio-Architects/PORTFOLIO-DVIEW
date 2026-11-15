/**
 * @file scripts/audit-naver-seo-readiness.ts
 * @description CLI readiness & submission manifest checker for Naver Search Advisor (Yeti, Sitemap, RSS 2.0) and GEO citations.
 * Usage:
 *   npm run seo:naver
 *   npm run seo:naver -- --json
 */
import path from 'path';
import dotenv from 'dotenv';
import { collectAndAuditNaverSeoReadiness } from '@/lib/seo/naverSearchAdvisorAudit';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

async function main() {
  const isJson = process.argv.includes('--json');
  const report = await collectAndAuditNaverSeoReadiness(process.cwd());

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
    if (!report.passed) {
      process.exitCode = 1;
    }
    return;
  }

  console.log('\n=== D-VIEW 네이버 서치어드바이저 & AI 검색(GEO) 색인 준비도 진단 ===');
  console.log(
    `진단 시각: ${report.generatedAt} | 통과율: ${report.passedCount}/${report.totalChecks} (${report.scorePct}%)`
  );
  console.log('----------------------------------------------------------------------');

  for (const check of report.checks) {
    const badge = check.passed ? '[PASS]' : '[FAIL]';
    console.log(`${badge} ${check.label}`);
    console.log(`       -> ${check.summary}`);
    if (!check.passed) {
      for (const issue of check.issues) {
        console.log(`          ! ${issue}`);
      }
    }
  }

  console.log('\n=== 네이버 서치어드바이저 제출 매니페스트 (요청 > 사이트맵 / RSS 제출) ===');
  console.log(`- 소유권 확인 토큰 : ${report.submissionManifest.naverVerificationToken || '(미설정)'}`);
  console.log(
    `- 사이트맵 제출 URL: ${report.submissionManifest.sitemapUrl} (총 ${report.submissionManifest.sitemapTotalUrls}개 정규 URL)`
  );
  console.log(
    `- RSS 제출 URL 1   : ${report.submissionManifest.rssUrl} (${report.submissionManifest.rssItemCount}개 항목)`
  );
  console.log(
    `- RSS 제출 URL 2   : ${report.submissionManifest.feedUrl} (${report.submissionManifest.rssItemCount}개 항목)`
  );
  console.log(
    `- 웹 페이지 우선 수집 요청 URL (${report.submissionManifest.priorityPageFetchUrls.length}개):`
  );
  for (const url of report.submissionManifest.priorityPageFetchUrls) {
    console.log(`  * ${url}`);
  }

  if (!report.passed) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[seo:naver] 진단 실행 중 오류가 발생했습니다:', err);
  process.exitCode = 1;
});
