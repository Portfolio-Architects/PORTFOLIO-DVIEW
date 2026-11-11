import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

describe('Empirical Adversarial Challenge: Milestone 1 Early Morning Pipeline & Timezone Resiliency', () => {
  const workflowPath = path.resolve(__dirname, '../../../.github/workflows/sync-transactions.yml');

  it('AST & Cron Invariants: should strictly contain exactly the 3 early-morning tiers and correct timezones', () => {
    expect(fs.existsSync(workflowPath)).toBe(true);
    const content = fs.readFileSync(workflowPath, 'utf8');
    const doc = yaml.load(content) as any;

    expect(doc).toBeDefined();
    expect(doc.name).toBe('Sync Transactions');

    // 1. Root & Job Timezone definitions
    expect(doc.env?.TZ).toBe('Asia/Seoul');
    expect(doc.jobs?.sync?.env?.TZ).toBe('Asia/Seoul');

    // 2. Schedule triggers check
    expect(Array.isArray(doc.on?.schedule)).toBe(true);
    expect(doc.on.schedule.length).toBe(3);

    const crons = doc.on.schedule.map((s: { cron: string }) => s.cron);
    expect(crons).toEqual([
      '38 20 * * *', // Tier 1: 05:38 KST
      '18 21 * * *', // Tier 2: 06:18 KST
      '38 21 * * *', // Tier 3: 06:38 KST
    ]);

    // 3. Obsolete afternoon cron must NOT exist
    expect(crons).not.toContain('12 9 * * *');
    expect(content).not.toContain('12 9 * * *');

    // 4. Job timeout & concurrency
    expect(doc.jobs.sync['timeout-minutes']).toBe(15);
    expect(doc.concurrency?.group).toBe('sync-transactions-production');
    expect(doc.concurrency?.['cancel-in-progress']).toBe(false);
  });

  it('UTC to KST Mathematical Conversion & 07:00 KST Completion Buffer Proof', () => {
    const DEADLINE_MINUTES_KST = 7 * 60; // 07:00 KST = 420 minutes

    const tiers = [
      { tier: 1, cron: '38 20 * * *', expUtcHour: 20, expUtcMin: 38, expKstHour: 5, expKstMin: 38, expBufferMin: 82 },
      { tier: 2, cron: '18 21 * * *', expUtcHour: 21, expUtcMin: 18, expKstHour: 6, expKstMin: 18, expBufferMin: 42 },
      { tier: 3, cron: '38 21 * * *', expUtcHour: 21, expUtcMin: 38, expKstHour: 6, expKstMin: 38, expBufferMin: 22 },
    ];

    tiers.forEach(({ tier, cron, expUtcHour, expUtcMin, expKstHour, expKstMin, expBufferMin }) => {
      const parts = cron.split(' ');
      const utcMin = parseInt(parts[0], 10);
      const utcHour = parseInt(parts[1], 10);

      expect(utcMin).toBe(expUtcMin);
      expect(utcHour).toBe(expUtcHour);

      // KST is UTC + 9 hours
      const totalUtcMin = utcHour * 60 + utcMin;
      const totalKstMin = (totalUtcMin + 9 * 60) % (24 * 60);

      const kstHour = Math.floor(totalKstMin / 60);
      const kstMin = totalKstMin % 60;

      expect(kstHour).toBe(expKstHour);
      expect(kstMin).toBe(expKstMin);

      // Buffer to 07:00 KST
      const bufferMinutes = DEADLINE_MINUTES_KST - totalKstMin;
      expect(bufferMinutes).toBe(expBufferMin);
      expect(bufferMinutes).toBeGreaterThan(0);
    });

    // Tier 3 Worst-Case Timeout Analysis (15-minute job timeout)
    const tier3StartKstMin = 6 * 60 + 38; // 398 min
    const timeoutMin = 15;
    const tier3WorstCaseFinishKstMin = tier3StartKstMin + timeoutMin; // 413 min = 06:53 KST
    const worstCaseBufferMin = DEADLINE_MINUTES_KST - tier3WorstCaseFinishKstMin;

    expect(worstCaseBufferMin).toBe(7); // 7 full minutes of safety buffer even under complete 15-min timeout!
    expect(tier3WorstCaseFinishKstMin).toBeLessThan(DEADLINE_MINUTES_KST);
  });

  describe('Adversarial Stress Test: Timezone Conversion & Month Rollover under Asia/Seoul', () => {
    const kstFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const utcFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const monthRolloverScenarios = [
      { desc: 'January month-end (31 days)', utcIso: '2026-01-31T20:38:00Z', expKstDate: '2026-02-01', expKstTime: '05:38:00' },
      { desc: 'February non-leap year month-end (28 days)', utcIso: '2025-02-28T20:38:00Z', expKstDate: '2025-03-01', expKstTime: '05:38:00' },
      { desc: 'February leap year month-end (29 days)', utcIso: '2024-02-29T20:38:00Z', expKstDate: '2024-03-01', expKstTime: '05:38:00' },
      { desc: 'April month-end (30 days)', utcIso: '2026-04-30T20:38:00Z', expKstDate: '2026-05-01', expKstTime: '05:38:00' },
      { desc: 'December year-end boundary', utcIso: '2025-12-31T20:38:00Z', expKstDate: '2026-01-01', expKstTime: '05:38:00' },
      { desc: 'Tier 2 time on month-end', utcIso: '2026-03-31T21:18:00Z', expKstDate: '2026-04-01', expKstTime: '06:18:00' },
      { desc: 'Tier 3 time on month-end', utcIso: '2026-03-31T21:38:00Z', expKstDate: '2026-04-01', expKstTime: '06:38:00' },
    ];

    monthRolloverScenarios.forEach(({ desc, utcIso, expKstDate, expKstTime }) => {
      it(`should correctly advance date to ${expKstDate} in Asia/Seoul for ${desc}`, () => {
        const utcDate = new Date(utcIso);

        // Verify UTC evaluation is still on the previous month/day
        const utcFormatted = utcFormatter.format(utcDate);
        const [utcDayPart] = utcFormatted.split(', ');
        expect(utcDayPart).not.toBe(expKstDate); // In UTC, it is still the previous day!

        // Verify Asia/Seoul evaluation advances to the 1st day of the next month
        const kstFormatted = kstFormatter.format(utcDate);
        const [kstDatePart, kstTimePart] = kstFormatted.split(', ');

        expect(kstDatePart).toBe(expKstDate);
        expect(kstTimePart).toBe(expKstTime);
      });
    });

    it('Weekly Sunday Deep Sync: Saturday 20:38 UTC must evaluate to Sunday in Asia/Seoul', () => {
      // 2026-11-14 is Saturday in UTC
      const saturdayUtc = new Date('2026-11-14T20:38:00Z');

      // In UTC, getUTCDay() is 6 (Saturday)
      expect(saturdayUtc.getUTCDay()).toBe(6);

      // In Asia/Seoul, it is 2026-11-15 05:38:00 KST, which is Sunday (day 0)
      const dayOfWeekKst = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Seoul',
        weekday: 'short',
      }).format(saturdayUtc);

      expect(dayOfWeekKst).toBe('Sun');
    });
  });

  describe('Workflow Step Logic & Error Handling Boundaries', () => {
    it('Step 1 must fail fast: No error swallowing (|| echo) permitted in fetch scripts', () => {
      const content = fs.readFileSync(workflowPath, 'utf8');
      const fetchStepMatch = content.match(/- name: Fetch transactions from 국토부 API[\s\S]*?(?=- name:)/);
      expect(fetchStepMatch).not.toBeNull();
      const fetchStep = fetchStepMatch![0];

      // Must NOT contain || echo
      expect(fetchStep).not.toContain('|| echo');
      expect(fetchStep).not.toContain('|| true');

      // Both scripts must be invoked directly
      expect(fetchStep).toContain('node scripts/fetch-transactions.js');
      expect(fetchStep).toContain('node scripts/fetch-rent.js');
    });

    it('Step 3 must reliably signal changes via GITHUB_OUTPUT', () => {
      const content = fs.readFileSync(workflowPath, 'utf8');
      const commitStepMatch = content.match(/- name: Commit and push changes[\s\S]*?(?=- name:)/);
      expect(commitStepMatch).not.toBeNull();
      const commitStep = commitStepMatch![0];

      expect(commitStep).toContain('echo "has_changes=false" >> "$GITHUB_OUTPUT"');
      expect(commitStep).toContain('echo "has_changes=true" >> "$GITHUB_OUTPUT"');
      expect(commitStep).toContain('echo "pushed_sha=$(git rev-parse HEAD)" >> "$GITHUB_OUTPUT"');
    });

    it('Step 3.5 push notification trigger step must be conditionally gated and have dual dispatch', () => {
      const content = fs.readFileSync(workflowPath, 'utf8');
      const pushStepMatch = content.match(/- name: Trigger PWA Push Notifications for New Transactions[\s\S]*?(?=- name:)/);
      expect(pushStepMatch).not.toBeNull();
      const pushStep = pushStepMatch![0];

      // Gating condition
      expect(pushStep).toContain("if: github.event_name != 'push' && (steps.commit_push.outputs.has_changes == 'true' || steps.commit_push.outputs.pushed_sha != '')");

      // CLI runner and API endpoint
      expect(pushStep).toContain('TARGET_DATE=$(date +%Y%m%d)');
      expect(pushStep).toContain('/api/cron/send-tx-notifications?date=${TARGET_DATE}');
    });

    it('Step 5 must trigger alerting on failure', () => {
      const content = fs.readFileSync(workflowPath, 'utf8');
      const failStepMatch = content.match(/- name: Send notification on failure[\s\S]*$/);
      expect(failStepMatch).not.toBeNull();
      const failStep = failStepMatch![0];

      expect(failStep).toContain('if: failure()');
      expect(failStep).toContain('DISCORD_WEBHOOK_URL');
      expect(failStep).toContain('SLACK_WEBHOOK_URL');
    });
  });
});
