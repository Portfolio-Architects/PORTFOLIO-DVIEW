import { getOfficeTransactions } from './officeTx.service';
import * as OfficeTxRepo from '@/lib/repositories/officeTx.repository';

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

describe('officeTx.service XML parser hardening', () => {
  afterEach(() => {
    jest.clearAllMocks();
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
});
