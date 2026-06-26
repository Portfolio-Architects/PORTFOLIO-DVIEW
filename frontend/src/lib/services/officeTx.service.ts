import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from './logger';

export interface OfficeTransaction {
  readonly date: string;
  readonly type: '매매' | '임대';
  readonly sizeSqM: number;
  readonly floor: number;
  readonly price: string;
  readonly buildingName: string;
}

const MOCK_XML_RESPONSE = `
<response>
  <header>
    <resultCode>00</resultCode>
    <resultMsg>NORMAL SERVICE.</resultMsg>
  </header>
  <body>
    <items>
      <!-- 금강펜테리움 IX타워 -->
      <item>
        <거래금액>150</거래금액>
        <보증금액>1,500</보증금액>
        <건물구분>지식산업센터</건물구분>
        <건물명>금강펜테리움 IX타워</건물명>
        <년>2026</년>
        <월>5</월>
        <일>3</일>
        <법정동>영천동</법정동>
        <전용면적>88.9</전용면적>
        <층>3</층>
        <구분>임대</구분>
      </item>
      <item>
        <거래금액>90</거래금액>
        <보증금액>1,000</보증금액>
        <건물구분>지식산업센터</건물구분>
        <건물명>금강펜테리움 IX타워</건물명>
        <년>2026</년>
        <월>5</월>
        <일>12</일>
        <법정동>영천동</법정동>
        <전용면적>45.2</전용면적>
        <층>15</층>
        <구분>임대</구분>
      </item>
      <item>
        <거래금액>41,000</거래금액>
        <건물구분>지식산업센터</건물구분>
        <건물명>금강펜테리움 IX타워</건물명>
        <년>2026</년>
        <월>4</월>
        <일>18</일>
        <법정동>영천동</법정동>
        <전용면적>108.5</전용면적>
        <층>7</층>
        <구분>매매</구분>
      </item>
      
      <!-- 현대 실리콘앨리 동탄 -->
      <item>
        <거래금액>110</거래금액>
        <보증금액>1,000</보증금액>
        <건물구분>지식산업센터</건물구분>
        <건물명>현대 실리콘앨리 동탄</건물명>
        <년>2026</년>
        <월>5</월>
        <일>20</일>
        <법정동>영천동</법정동>
        <전용면적>51.6</전용면적>
        <층>8</층>
        <구분>임대</구분>
      </item>
      <item>
        <거래금액>210</거래금액>
        <보증금액>2,000</보증금액>
        <건물구분>지식산업센터</건물구분>
        <건물명>현대 실리콘앨리 동탄</건물명>
        <년>2026</년>
        <월>4</월>
        <일>11</일>
        <법정동>영천동</법정동>
        <전용면적>102.3</전용면적>
        <층>4</층>
        <구분>임대</구분>
      </item>
      <item>
        <거래금액>29,500</거래금액>
        <건물구분>지식산업센터</건물구분>
        <건물명>현대 실리콘앨리 동탄</건물명>
        <년>2026</년>
        <월>3</월>
        <일>29</일>
        <법정동>영천동</법정동>
        <전용면적>72.4</전용면적>
        <층>12</층>
        <구분>매매</구분>
      </item>

      <!-- 동탄 IT타워 -->
      <item>
        <거래금액>65</거래금액>
        <보증금액>500</보증금액>
        <건물구분>지식산업센터</건물구분>
        <건물명>동탄 IT타워</건물명>
        <년>2026</년>
        <월>5</월>
        <일>24</일>
        <법정동>영천동</법정동>
        <전용면적>33.1</전용면적>
        <층>9</층>
        <구분>임대</구분>
      </item>
      <item>
        <거래금액>115</거래금액>
        <보증금액>1,000</보증금액>
        <건물구분>지식산업센터</건물구분>
        <건물명>동탄 IT타워</건물명>
        <년>2026</년>
        <월>4</월>
        <일>15</일>
        <법정동>영천동</법정동>
        <전용면적>66.2</전용면적>
        <층>11</층>
        <구분>임대</구분>
      </item>
      <item>
        <거래금액>12,000</거래금액>
        <건물구분>지식산업센터</건물구분>
        <건물명>동탄 IT타워</건물명>
        <년>2026</년>
        <월>2</월>
        <일>28</일>
        <법정동>영천동</법정동>
        <전용면적>33.1</전용면적>
        <층>5</층>
        <구분>매매</구분>
      </item>

      <!-- SH타임스퀘어 -->
      <item>
        <거래금액>240</거래금액>
        <보증금액>2,000</보증금액>
        <건물구분>지식산업센터</건물구분>
        <건물명>SH타임스퀘어</건물명>
        <년>2026</년>
        <월>5</월>
        <일>18</일>
        <법정동>영천동</법정동>
        <전용면적>132.2</전용면적>
        <층>3</층>
        <구분>임대</구분>
      </item>
      <item>
        <거래금액>360</거래금액>
        <보증금액>3,000</보증금액>
        <건물구분>지식산업센터</건물구분>
        <건물명>SH타임스퀘어</건물명>
        <년>2026</년>
        <월>4</월>
        <일>5</일>
        <법정동>영천동</법정동>
        <전용면적>198.3</전용면적>
        <층>1</층>
        <구분>임대</구분>
      </item>
      <item>
        <거래금액>62,000</거래금액>
        <건물구분>지식산업센터</건물구분>
        <건물명>SH타임스퀘어</건물명>
        <년>2026</년>
        <월>3</월>
        <일>14</일>
        <법정동>영천동</법정동>
        <전용면적>198.3</전용면적>
        <층>2</층>
        <구분>매매</구분>
      </item>
    </items>
  </body>
</response>
`;

/**
 * Format string price to client-friendly wording
 * e.g., "41,000" (10000 KRW unit) -> "4억 1,000만원"
 */
function formatPrice(type: '매매' | '임대', priceRaw: string, depositRaw?: string): string {
  if (type === '임대') {
    const depVal = depositRaw ? parseInt(depositRaw.replace(/,/g, ''), 10) : 0;
    const rentVal = parseInt(priceRaw.replace(/,/g, ''), 10);
    const depStr = depVal >= 10000 
      ? `${Math.floor(depVal / 10000)}억 ${depVal % 10000 > 0 ? (depVal % 10000).toLocaleString() : ''}`.trim() + '만' 
      : `${depVal.toLocaleString()}만`;
    return `보증금 ${depStr} / 월세 ${rentVal.toLocaleString()}만`;
  }

  const priceVal = parseInt(priceRaw.replace(/,/g, ''), 10);
  if (priceVal >= 10000) {
    const bill = Math.floor(priceVal / 10000);
    const remain = priceVal % 10000;
    return `${bill}억 ${remain > 0 ? remain.toLocaleString() + '만' : ''}원`;
  }
  return `${priceVal.toLocaleString()}만원`;
}

/**
 * Parses Public Office XML data using Cheerio
 */
function parseOfficeXml(xml: string): OfficeTransaction[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const list: OfficeTransaction[] = [];

  $('item').each((_, elem) => {
    const $item = $(elem);
    const buildingName = $item.find('건물명').text().trim();
    const type = ($item.find('구분').text().trim() || '매매') as '매매' | '임대';
    const priceRaw = $item.find('거래금액').text().trim();
    const depositRaw = $item.find('보증금액').text().trim();
    const year = $item.find('년').text().trim();
    const monthRaw = $item.find('월').text().trim();
    const dayRaw = $item.find('일').text().trim();
    const sizeSqM = parseFloat($item.find('전용면적').text().trim() || '0');
    const floor = parseInt($item.find('층').text().trim() || '1', 10);

    const month = monthRaw.length === 1 ? `0${monthRaw}` : monthRaw;
    const day = dayRaw.length === 1 ? `0${dayRaw}` : dayRaw;
    const date = `${year}-${month}-${day}`;

    const price = formatPrice(type, priceRaw, depositRaw);

    list.push({
      date,
      type,
      sizeSqM,
      floor,
      price,
      buildingName
    });
  });

  return list;
}

/**
 * Fetches office transaction data from public portal API.
 * Falls back to mock XML if KEY is missing or server is unreachable.
 */
export async function getOfficeTransactions(lawdCd: string = '41590', dealYmd: string = '202605'): Promise<OfficeTransaction[]> {
  const key = process.env.PUBLIC_DATA_PORTAL_KEY;
  if (!key) {
    logger.info('OfficeTxService.getOfficeTransactions', 'PUBLIC_DATA_PORTAL_KEY not configured, using mock fallback.', { lawdCd, dealYmd });
    return parseOfficeXml(MOCK_XML_RESPONSE);
  }

  const endpoint = 'http://openapi.molit.go.kr/OpenAPI_ToolInstallPackage/service/rest/RTMSOBJSvc/getRTMSDataSvcNrgTrade';
  const url = `${endpoint}?serviceKey=${encodeURIComponent(key)}&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}`;

  try {
    const response = await axios.get(url, { 
      timeout: 8000,
      headers: { 'Accept': 'application/xml' }
    });

    if (response.status === 200 && response.data && typeof response.data === 'string') {
      const xml = response.data;
      if (xml.includes('SERVICE KEY IS INVALID') || xml.includes('LIMITED NUMBER OF SERVICE')) {
        logger.warn('OfficeTxService.getOfficeTransactions', 'Public API key issues, falling back to mock.', { xmlSnippet: xml.substring(0, 200) });
        return parseOfficeXml(MOCK_XML_RESPONSE);
      }
      return parseOfficeXml(xml);
    }
    logger.warn('OfficeTxService.getOfficeTransactions', 'Invalid API response format, falling back.', { status: response.status });
    return parseOfficeXml(MOCK_XML_RESPONSE);
  } catch (err) {
    logger.error('OfficeTxService.getOfficeTransactions', 'Error during Public API request, falling back.', { error: err });
    return parseOfficeXml(MOCK_XML_RESPONSE);
  }
}
