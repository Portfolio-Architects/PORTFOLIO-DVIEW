import fs from 'fs';
import path from 'path';
import {
  getOfficeTransactions,
  getRecentMonths,
  OFFICE_TX_CACHE_TTL_SECONDS,
  RECENT_OFFICE_MONTHS_COUNT,
} from './officeTx.service';
import * as OfficeTxRepo from '@/lib/repositories/officeTx.repository';
import { redis } from '@/lib/redis';
import { INITIAL_POSTS } from '@/components/macro/CoLeasingBoard';

jest.mock('@/lib/repositories/officeTx.repository');

jest.mock('cheerio', () => {
  return {
    load: (xml: string) => {
      const itemXmls: string[] = [];
      if (xml && typeof xml === 'string') {
        const matches = xml.match(/<item>[\s\S]*?<\/item>/g);
        if (matches) {
          itemXmls.push(...matches);
        }
      }

      const getTagText = (itemXml: string, tag: string): string => {
        const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
        const match = itemXml.match(regex);
        return match ? match[1].trim() : '';
      };

      const instance = (selector: string | any) => {
        if (selector === 'item') {
          return {
            each: (cb: (idx: number, elem: any) => void) => {
              itemXmls.forEach((item, idx) => cb(idx, item));
            }
          };
        }
        if (typeof selector === 'string' && selector.startsWith('<item>')) {
          return {
            find: (tag: string) => ({
              text: () => getTagText(selector, tag)
            })
          };
        }
        return {
          text: () => '',
          find: () => ({ text: () => '' })
        };
      };

      return instance;
    }
  };
});

describe('officeTx.service XML parser hardening & P0-3 dynamic months / Redis caching', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('handles complete valid XML without errors', async () => {
    const validXml = `
      <response>
        <body>
          <items>
            <item>
              <건물명>금강IX타워</건물명>
              <구분>매매</구분>
              <거래금액>45,000</거래금액>
              <년>2026</년>
              <월>5</월>
              <일>12</일>
              <전용면적>48.5</전용면적>
              <층>12</층>
              <지번>844</지번>
            </item>
          </items>
        </body>
      </response>
    `;

    (OfficeTxRepo.fetchOfficeXmlFromPublicPortal as jest.Mock).mockResolvedValue(validXml);

    const result = await getOfficeTransactions('41590', '202605');
    expect(result).toHaveLength(1);
    expect(result[0].buildingName).toBe('금강IX타워');
    expect(result[0].priceRaw).toBe(45000);
    expect(result[0].price).toBe('4억 5,000만원');
    expect(result[0].date).toBe('2026-05-12');
  });

  it('sanitizes missing and empty XML tags without outputting NaN or NaN만원', async () => {
    const corruptXml = `
      <response>
        <body>
          <items>
            <item>
              <건물명></건물명>
              <구분></구분>
              <거래금액></거래금액>
              <보증금액>invalid</보증금액>
              <년></년>
              <월></월>
              <일></일>
              <전용면적>abc</전용면적>
              <층>xyz</층>
            </item>
          </items>
        </body>
      </response>
    `;

    (OfficeTxRepo.fetchOfficeXmlFromPublicPortal as jest.Mock).mockResolvedValue(corruptXml);

    const result = await getOfficeTransactions('41590', '202605');
    expect(result).toHaveLength(1);
    expect(result[0].buildingName).toBe('미상 건물');
    expect(result[0].priceRaw).toBe(0);
    expect(result[0].price).toBe('0원');
    expect(result[0].sizeSqM).toBe(0);
    expect(result[0].floor).toBe(1);
    expect(result[0].price).not.toContain('NaN');
  });

  it('handles empty or malformed XML response gracefully', async () => {
    (OfficeTxRepo.fetchOfficeXmlFromPublicPortal as jest.Mock).mockResolvedValue('');

    const result = await getOfficeTransactions('41590', '202605');
    expect(result).toEqual([]);
  });

  describe('P0-3: Dynamic recentMonths & 24-hour Upstash Redis caching', () => {
    it('dynamically computes recent 6 months across year boundaries and month-end dates without overflow', () => {
      expect(RECENT_OFFICE_MONTHS_COUNT).toBe(6);
      expect(OFFICE_TX_CACHE_TTL_SECONDS).toBe(86400);

      // Standard mid-year / November date
      const nov2026 = getRecentMonths(6, new Date(2026, 10, 2));
      expect(nov2026).toEqual(['202611', '202610', '202609', '202608', '202607', '202606']);

      // Year boundary rollover (Feb 2026 -> Sep 2025)
      const feb2026 = getRecentMonths(6, new Date(2026, 1, 15));
      expect(feb2026).toEqual(['202602', '202601', '202512', '202511', '202510', '202509']);

      // Month-end boundary safety (March 31 must include 202602 and not skip February)
      const mar31 = getRecentMonths(6, new Date(2026, 2, 31));
      expect(mar31).toEqual(['202603', '202602', '202601', '202512', '202511', '202510']);

      // Leap-year February 29 boundary safety
      const leapFeb29 = getRecentMonths(6, new Date(2024, 1, 29));
      expect(leapFeb29).toEqual(['202402', '202401', '202312', '202311', '202310', '202309']);

      // Dec 31 and Jan 1 boundary safety
      const dec31 = getRecentMonths(6, new Date(2025, 11, 31));
      expect(dec31).toEqual(['202512', '202511', '202510', '202509', '202508', '202507']);
      const jan1 = getRecentMonths(6, new Date(2026, 0, 1));
      expect(jan1).toEqual(['202601', '202512', '202511', '202510', '202509', '202508']);

      // Non-integer float count is floored safely
      expect(getRecentMonths(2.7, new Date(2026, 10, 2))).toEqual(['202611', '202610']);
      expect(getRecentMonths(0.9, new Date(2026, 10, 2))).toEqual([]);

      // Invalid Date fallback (never produces 'NaNNaN')
      const invalidDateMonths = getRecentMonths(6, new Date('invalid-date'));
      expect(invalidDateMonths).toHaveLength(6);
      invalidDateMonths.forEach((ym) => {
        expect(ym).toMatch(/^\d{6}$/);
        expect(ym).not.toContain('NaN');
      });

      // Edge cases: count <= 0 or NaN
      expect(getRecentMonths(0, new Date(2026, 10, 2))).toEqual([]);
      expect(getRecentMonths(-3, new Date(2026, 10, 2))).toEqual([]);
      expect(getRecentMonths(NaN, new Date(2026, 10, 2))).toEqual([]);
    });

    it('fetches dynamic recent 6 months (never hardcoded 202307~202406) when dealYmd is "all"', async () => {
      (OfficeTxRepo.fetchOfficeXmlFromPublicPortal as jest.Mock).mockResolvedValue('');

      await getOfficeTransactions('41590', 'all');

      const expectedMonths = getRecentMonths(6);
      expect(OfficeTxRepo.fetchOfficeXmlFromPublicPortal).toHaveBeenCalledTimes(6);
      const calledMonths = (OfficeTxRepo.fetchOfficeXmlFromPublicPortal as jest.Mock).mock.calls.map(
        (call: [string, string]) => call[1]
      );
      expect(calledMonths).toEqual(expectedMonths);
      expect(calledMonths).not.toContain('202307');
      expect(calledMonths).not.toContain('202406');
    });

    it('caches and serves dealYmd="all" results in Upstash Redis with 24-hour (86400s) TTL', async () => {
      const sampleXml = `
        <response>
          <body>
            <items>
              <item>
                <건물명>현대 실리콘앨리</건물명>
                <구분>매매</구분>
                <거래금액>32,000</거래금액>
                <년>2026</년>
                <월>10</월>
                <일>15</일>
                <전용면적>50.0</전용면적>
                <층>10</층>
                <지번>823</지번>
              </item>
            </items>
          </body>
        </response>
      `;

      const getSpy = jest.spyOn(redis, 'get').mockResolvedValueOnce(null);
      const setSpy = jest.spyOn(redis, 'set').mockResolvedValueOnce('OK');

      (OfficeTxRepo.fetchOfficeXmlFromPublicPortal as jest.Mock).mockImplementation(
        async (_lawdCd: string, ym: string) => (ym === getRecentMonths(6)[0] ? sampleXml : '')
      );

      // 1. Cache Miss -> fetches from portal & sets 24h Redis cache
      const missResult = await getOfficeTransactions('41591', 'all');
      expect(missResult).toHaveLength(1);
      expect(missResult[0].buildingName).toBe('현대 실리콘앨리');
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(setSpy).toHaveBeenCalledTimes(1);
      expect(setSpy).toHaveBeenCalledWith(
        expect.stringContaining('DTDLS:cache:officeTx:41591:all:'),
        missResult,
        { ex: 86400 }
      );

      // 2. Cache Hit -> returns directly from Redis without calling portal
      (OfficeTxRepo.fetchOfficeXmlFromPublicPortal as jest.Mock).mockClear();
      getSpy.mockResolvedValueOnce(missResult);

      const hitResult = await getOfficeTransactions('41591', 'all');
      expect(hitResult).toEqual(missResult);
      expect(OfficeTxRepo.fetchOfficeXmlFromPublicPortal).not.toHaveBeenCalled();
    });

    it('falls back gracefully to public portal API when Redis read or write throws and when one of the 6 parallel months fails', async () => {
      const sampleXml = `
        <response>
          <body>
            <items>
              <item>
                <건물명>동탄 SK V1</건물명>
                <구분>매매</구분>
                <거래금액>28,000</거래금액>
                <년>2026</년>
                <월>9</월>
                <일>20</일>
                <전용면적>42.0</전용면적>
                <층>8</층>
                <지번>836</지번>
              </item>
            </items>
          </body>
        </response>
      `;

      jest.spyOn(redis, 'get').mockRejectedValueOnce(new Error('Redis connection error'));
      jest.spyOn(redis, 'set').mockRejectedValueOnce(new Error('Redis write timeout'));
      (OfficeTxRepo.fetchOfficeXmlFromPublicPortal as jest.Mock).mockResolvedValue(sampleXml);

      const result = await getOfficeTransactions('41591', '202609');
      expect(result).toHaveLength(1);
      expect(result[0].buildingName).toBe('동탄 SK V1');

      // Also verify dealYmd="all" when one monthly request throws timeout and Redis is unreachable
      jest.spyOn(redis, 'get').mockRejectedValueOnce(new Error('Redis down'));
      jest.spyOn(redis, 'set').mockRejectedValueOnce(new Error('Redis down'));
      const recent = getRecentMonths(6);
      (OfficeTxRepo.fetchOfficeXmlFromPublicPortal as jest.Mock).mockImplementation(
        async (_lawdCd: string, ym: string) => {
          if (ym === recent[0]) throw new Error('MOLIT 8000ms timeout');
          if (ym === recent[1]) return sampleXml;
          return '';
        }
      );

      const allRes = await getOfficeTransactions('41591', 'all');
      expect(allRes).toHaveLength(1);
      expect(allRes[0].buildingName).toBe('동탄 SK V1');
    });
  });

  describe('P0-3 & Guardrail C: Strict Real Data Only & Personal Data Protection', () => {
    it('ensures CoLeasingBoard INITIAL_POSTS is empty, contains no mock badges, and adheres to Ad Money tokens', () => {
      expect(INITIAL_POSTS).toEqual([]);

      const coLeasingPath = path.resolve(__dirname, '../../components/macro/CoLeasingBoard.tsx');
      const content = fs.readFileSync(coLeasingPath, 'utf8');
      expect(content).not.toContain('가상 데이터');
      expect(content).not.toContain('isMock');
      expect(content).not.toContain('accent-hs-orange');
      expect(content).toContain('accent-emerald-600');
      expect(content).toContain('tabular-nums');
      expect(content).toContain('등록된 공동 임차 모집글이 없습니다.');
    });

    it('ensures public/data/mock-emails.json is permanently deleted and sendMail never recreates it', async () => {
      const mockEmailPath = path.resolve(__dirname, '../../../public/data/mock-emails.json');
      expect(fs.existsSync(mockEmailPath)).toBe(false);

      const { sendMail } = await import('@/lib/utils/server/mailService');
      const prevHost = process.env.SMTP_HOST;
      delete process.env.SMTP_HOST;
      try {
        const ok = await sendMail({
          to: 'user@example.com',
          subject: 'Test Subject',
          html: '<p>Test</p>',
        });
        expect(ok).toBe(true);
        expect(fs.existsSync(mockEmailPath)).toBe(false);
      } finally {
        if (prevHost !== undefined) process.env.SMTP_HOST = prevHost;
      }
    });

    it('ensures OfficeDetailModal unwraps /api/technovalley/transactions { success, data } envelope and resets state across buildings', () => {
      const modalPath = path.resolve(__dirname, '../../components/OfficeDetailModal.tsx');
      const modalContent = fs.readFileSync(modalPath, 'utf8');
      expect(modalContent).toContain('Array.isArray(payload.data)');
      expect(modalContent).toContain('펜테리움');
      expect(modalContent).toContain('setApiTxs(matched)');
    });
  });
});

