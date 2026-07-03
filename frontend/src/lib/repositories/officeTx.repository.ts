/**
 * @module officeTx.repository
 * @description Data Access Layer for MOLIT public office transactions (XML OpenAPI) and API key handling.
 * Architecture Layer: Repository (Raw I/O & Network requests only)
 */
import axios from 'axios';
import { logger } from '@/lib/services/logger';

export const MOCK_XML_RESPONSE = `
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

export async function fetchOfficeXmlFromPublicPortal(lawdCd: string, dealYmd: string): Promise<string> {
  const key = process.env.PUBLIC_DATA_PORTAL_KEY || '4611c02045e69b5e6c0bf50b9ecbee6de92e7ee0351eb8a7d529253340f755ff';
  const endpoint = 'https://apis.data.go.kr/1613000/RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade';
  const url = `${endpoint}?serviceKey=${encodeURIComponent(key)}&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}`;

  try {
    logger.info('officeTx.repository.fetchOfficeXmlFromPublicPortal', 'Calling MOLIT API', { lawdCd, dealYmd });
    const response = await axios.get(url, { 
      timeout: 8000,
      headers: { 'Accept': 'application/xml' }
    });

    if (response.status === 200 && response.data && typeof response.data === 'string') {
      const xml = response.data;
      if (xml.includes('SERVICE KEY IS INVALID') || xml.includes('LIMITED NUMBER OF SERVICE') || xml.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR')) {
        logger.warn('officeTx.repository.fetchOfficeXmlFromPublicPortal', 'Public API key issue detected, falling back to mock.', { xmlSnippet: xml.substring(0, 200) });
        return MOCK_XML_RESPONSE;
      }
      return xml;
    }
    logger.warn('officeTx.repository.fetchOfficeXmlFromPublicPortal', 'Invalid API response format, falling back to mock.', { status: response.status });
    return MOCK_XML_RESPONSE;
  } catch (err) {
    logger.error('officeTx.repository.fetchOfficeXmlFromPublicPortal', 'Error during Public API request, falling back to mock.', { error: err instanceof Error ? err.message : String(err) });
    return MOCK_XML_RESPONSE;
  }
}
