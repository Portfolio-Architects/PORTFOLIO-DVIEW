import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

describe('Milestone 1 Empirical Challenger: Adversarial Stress Test Suite', () => {
  const workflowPath = path.resolve(__dirname, '../../../.github/workflows/sync-transactions.yml');
  let rawContent: string;
  let parsedDoc: any;

  beforeAll(() => {
    expect(fs.existsSync(workflowPath)).toBe(true);
    rawContent = fs.readFileSync(workflowPath, 'utf8');
    parsedDoc = yaml.load(rawContent);
  });

  describe('1. 3-Tier Early Morning Cron Schedule Invariants', () => {
    it('should have exactly 3 scheduled crons defined in UTC that map to 05:38, 06:18, and 06:38 KST', () => {
      const schedule = parsedDoc.on?.schedule;
      expect(Array.isArray(schedule)).toBe(true);
      expect(schedule.length).toBe(3);

      const crons = schedule.map((s: { cron: string }) => s.cron);
      expect(crons[0]).toBe('38 20 * * *'); // Tier 1: 20:38 UTC = 05:38 KST
      expect(crons[1]).toBe('18 21 * * *'); // Tier 2: 21:18 UTC = 06:18 KST
      expect(crons[2]).toBe('38 21 * * *'); // Tier 3: 21:38 UTC = 06:38 KST

      // Verify Tier 3 gives at least 20 minutes buffer before 07:00 KST
      const tier3MinutesPastMidnight = 6 * 60 + 38; // 398 min
      const deadlineMinutes = 7 * 60; // 420 min
      const buffer = deadlineMinutes - tier3MinutesPastMidnight;
      expect(buffer).toBe(22);
      expect(buffer).toBeGreaterThanOrEqual(20);
    });

    it('should strictly exclude any afternoon or evening cron (e.g., legacy 12 9 * * * / 18:12 KST)', () => {
      expect(rawContent).not.toContain('12 9 * * *');
      expect(rawContent).not.toContain('cron: "12 9 * * *"');
    });

    it('should configure concurrency group with cancel-in-progress: false to avoid corrupting running transactions', () => {
      expect(parsedDoc.concurrency).toBeDefined();
      expect(parsedDoc.concurrency.group).toBe('sync-transactions-production');
      expect(parsedDoc.concurrency['cancel-in-progress']).toBe(false);
    });

    it('should configure 15 minutes timeout to ensure job finishes before 07:00 KST even on Tier 3', () => {
      expect(parsedDoc.jobs?.sync?.['timeout-minutes']).toBe(15);
      // If Tier 3 starts at 06:38 and takes up to 15 min, it completes by 06:53 KST (< 07:00 KST)
      const worstCaseFinishMinutes = 6 * 60 + 38 + 15; // 413 min (06:53 KST)
      expect(worstCaseFinishMinutes).toBeLessThan(7 * 60);
    });
  });

  describe('2. Dual-Level Timezone (Asia/Seoul) Configuration', () => {
    it('should enforce Asia/Seoul at the workflow root env level', () => {
      expect(parsedDoc.env?.TZ).toBe('Asia/Seoul');
    });

    it('should enforce Asia/Seoul at the job env level', () => {
      expect(parsedDoc.jobs?.sync?.env?.TZ).toBe('Asia/Seoul');
    });
  });

  describe('3. Step 1 Fail-Fast Integrity (No Silent Error Swallowing)', () => {
    it('should execute fetch-transactions.js and fetch-rent.js without || echo error suppression', () => {
      const steps = parsedDoc.jobs?.sync?.steps;
      const fetchStep = steps.find((s: any) => s.name === 'Fetch transactions from 국토부 API');
      expect(fetchStep).toBeDefined();

      const runScript = fetchStep.run;
      expect(runScript).toContain('node scripts/fetch-transactions.js');
      expect(runScript).toContain('node scripts/fetch-rent.js');

      // Crucial: Must NOT contain || echo
      expect(runScript).not.toMatch(/node scripts\/fetch-transactions\.js\s*\|\|\s*echo/);
      expect(runScript).not.toMatch(/node scripts\/fetch-rent\.js\s*\|\|\s*echo/);
    });
  });

  describe('4. Step 3 Outputs & Step 3.5 Conditional Push Gating Truth Table', () => {
    function evaluateGhaCondition({
      event_name,
      has_changes,
      pushed_sha
    }: {
      event_name: string;
      has_changes?: string;
      pushed_sha?: string;
    }): boolean {
      // Expression in sync-transactions.yml:
      // if: github.event_name != 'push' && (steps.commit_push.outputs.has_changes == 'true' || steps.commit_push.outputs.pushed_sha != '')
      const isNotPush = event_name !== 'push';
      const hasChanges = has_changes === 'true';
      const hasSha = pushed_sha !== undefined && pushed_sha !== null && pushed_sha.trim() !== '';
      return isNotPush && (hasChanges || hasSha);
    }

    it('should skip Step 3.5 when has_changes is false and pushed_sha is empty on scheduled runs', () => {
      const willRun = evaluateGhaCondition({
        event_name: 'schedule',
        has_changes: 'false',
        pushed_sha: ''
      });
      expect(willRun).toBe(false);
    });

    it('should execute Step 3.5 when has_changes is true and pushed_sha is present on scheduled runs', () => {
      const willRun = evaluateGhaCondition({
        event_name: 'schedule',
        has_changes: 'true',
        pushed_sha: '7a8b9c0d1e2f3a4b5c6d7e8f'
      });
      expect(willRun).toBe(true);
    });

    it('should execute Step 3.5 on workflow_dispatch when changes occur', () => {
      const willRun = evaluateGhaCondition({
        event_name: 'workflow_dispatch',
        has_changes: 'true',
        pushed_sha: '7a8b9c0d1e2f3a4b5c6d7e8f'
      });
      expect(willRun).toBe(true);
    });

    it('should skip Step 3.5 on workflow_dispatch when no changes occur', () => {
      const willRun = evaluateGhaCondition({
        event_name: 'workflow_dispatch',
        has_changes: 'false',
        pushed_sha: ''
      });
      expect(willRun).toBe(false);
    });

    it('should ALWAYS skip Step 3.5 when event is push regardless of commit status', () => {
      expect(evaluateGhaCondition({ event_name: 'push', has_changes: 'true', pushed_sha: '123456' })).toBe(false);
      expect(evaluateGhaCondition({ event_name: 'push', has_changes: 'false', pushed_sha: '' })).toBe(false);
    });

    it('should safely skip when outputs are undefined or malformed', () => {
      expect(evaluateGhaCondition({ event_name: 'schedule', has_changes: undefined, pushed_sha: undefined })).toBe(false);
      expect(evaluateGhaCondition({ event_name: 'schedule', has_changes: '', pushed_sha: '' })).toBe(false);
      expect(evaluateGhaCondition({ event_name: 'schedule', has_changes: 'False', pushed_sha: '' })).toBe(false);
      expect(evaluateGhaCondition({ event_name: 'schedule', has_changes: '0', pushed_sha: '' })).toBe(false);
    });

    it('should verify Step 3 script generates exact has_changes output strings', () => {
      const steps = parsedDoc.jobs?.sync?.steps;
      const commitStep = steps.find((s: any) => s.id === 'commit_push');
      expect(commitStep).toBeDefined();

      const script = commitStep.run;
      expect(script).toContain('has_changes=false');
      expect(script).toContain('has_changes=true');
      expect(script).toContain('pushed_sha=$(git rev-parse HEAD)');
    });
  });

  describe('5. Step 3.5 Push Notification Dispatch Specification', () => {
    let pushStep: any;

    beforeAll(() => {
      const steps = parsedDoc.jobs?.sync?.steps;
      pushStep = steps.find((s: any) => s.id === 'trigger_push_notifications');
      expect(pushStep).toBeDefined();
    });

    it('should contain the exact conditional guard', () => {
      expect(pushStep.if).toBe(
        "github.event_name != 'push' && (steps.commit_push.outputs.has_changes == 'true' || steps.commit_push.outputs.pushed_sha != '')"
      );
    });

    it('should pass required environment secrets to Step 3.5', () => {
      const env = pushStep.env;
      expect(env).toBeDefined();
      expect(env.CRON_SECRET).toContain('secrets.CRON_SECRET');
      expect(env.VERCEL_APP_URL).toBe('https://dongtanview.com');
      expect(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY).toContain('secrets.NEXT_PUBLIC_VAPID_PUBLIC_KEY');
      expect(env.VAPID_PRIVATE_KEY).toContain('secrets.VAPID_PRIVATE_KEY');
      expect(env.FIREBASE_SERVICE_ACCOUNT_KEY).toContain('secrets.FIREBASE_SERVICE_ACCOUNT_KEY');
      expect(env.NEXT_PUBLIC_FIREBASE_PROJECT_ID).toContain('secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    });

    it('should correctly format production API curl request with Bearer token, date param, and 45s timeout', () => {
      const script = pushStep.run;
      expect(script).toContain('APP_URL="${VERCEL_APP_URL:-https://dongtanview.com}"');
      expect(script).toContain('CRON_AUTH="${CRON_SECRET:-dview-default-cron-secret-2026}"');
      expect(script).toContain('TARGET_DATE=$(date +%Y%m%d)');
      expect(script).toContain('curl -sS -m 45 -X GET');
      expect(script).toContain('-H "Authorization: Bearer ${CRON_AUTH}"');
      expect(script).toContain('"${APP_URL}/api/cron/send-tx-notifications?date=${TARGET_DATE}"');
      // Resilient fallback to prevent pipeline failure
      expect(script).toContain('|| echo \'{"error":"CURL_TRIGGER_NOTICE"}\'');
    });

    it('should support local CLI runner scripts if present', () => {
      const script = pushStep.run;
      expect(script).toContain('if [ -f "scripts/send-tx-notifications.js" ]');
      expect(script).toContain('node scripts/send-tx-notifications.js --date="${TARGET_DATE}"');
      expect(script).toContain('elif [ -f "scripts/test-push-notification.js" ]');
      expect(script).toContain('node scripts/test-push-notification.js --send --date="${TARGET_DATE}"');
    });
  });

  describe('6. Step 5 Alerting & Recovery Verification', () => {
    it('should configure failure alerting to Discord/Slack on pipeline errors', () => {
      const steps = parsedDoc.jobs?.sync?.steps;
      const failureStep = steps.find((s: any) => s.name === 'Send notification on failure');
      expect(failureStep).toBeDefined();
      expect(failureStep.if).toBe('failure()');

      const script = failureStep.run;
      expect(script).toContain('DISCORD_WEBHOOK_URL');
      expect(script).toContain('SLACK_WEBHOOK_URL');
    });
  });
});
