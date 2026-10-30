/**
 * @module officeTx.repository
 * @description Data Access Layer for MOLIT public office transactions (XML OpenAPI) and API key handling.
 * Architecture Layer: Repository (Raw I/O & Network requests only)
 */
import axios from 'axios';
import { logger } from '@/lib/services/logger';

const EMPTY_XML_RESPONSE = `<response><header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header><body><items></items></body></response>`;

export async function fetchOfficeXmlFromPublicPortal(lawdCd: string, dealYmd: string): Promise<string> {
  const key = process.env.PUBLIC_DATA_PORTAL_KEY;
  if (!key) {
    logger.warn('officeTx.repository.fetchOfficeXmlFromPublicPortal', 'PUBLIC_DATA_PORTAL_KEY environment variable is not configured. Returning empty response.');
    return EMPTY_XML_RESPONSE;
  }
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
        logger.warn('officeTx.repository.fetchOfficeXmlFromPublicPortal', 'Public API key issue detected, returning empty response without mock data.', { xmlSnippet: xml.substring(0, 200) });
        return EMPTY_XML_RESPONSE;
      }
      return xml;
    }
    logger.warn('officeTx.repository.fetchOfficeXmlFromPublicPortal', 'Invalid API response format, returning empty response.', { status: response.status });
    return EMPTY_XML_RESPONSE;
  } catch (err) {
    logger.error('officeTx.repository.fetchOfficeXmlFromPublicPortal', 'Error during Public API request, returning empty response.', { error: err instanceof Error ? err.message : String(err) });
    return EMPTY_XML_RESPONSE;
  }
}
