/**
 * @module energy.repository
 * @description Data Access Layer for MOLIT building energy consumption (electricity) public OpenAPI (JSON).
 * Architecture Layer: Repository (Raw I/O & Network requests only)
 */
import axios from 'axios';
import { logger } from '@/lib/services/logger';

/**
 * Fetch building monthly energy usage info from Public Portal HUB API (JSON).
 * Strictly queries Yeongcheon-dong complexes via sigunguCd, bjdongCd, bun, and ji.
 */
export async function fetchEnergyJsonFromPublicPortal(
  lawdCd: string,
  crtnMm: string,
  bun: string,
  ji: string
): Promise<string> {
  const key = process.env.PUBLIC_DATA_PORTAL_KEY || '4611c02045e69b5e6c0bf50b9ecbee6de92e7ee0351eb8a7d529253340f755ff';
  
  // Official 건축HUB 건물에너지정보 서비스 endpoint and getBeElctyUsgInfo (electricity) operation
  const endpoint = 'https://apis.data.go.kr/1613000/BldEngyHubService/getBeElctyUsgInfo';
  const url = `${endpoint}?serviceKey=${encodeURIComponent(key)}&sigunguCd=${lawdCd}&bjdongCd=13100&bun=${bun}&ji=${ji}&useYm=${crtnMm}&_type=json`;

  try {
    logger.info('energy.repository.fetchEnergyJsonFromPublicPortal', 'Calling HUB Building Energy JSON API', { lawdCd, crtnMm, bun, ji });
    const response = await axios.get(url, {
      timeout: 8000
    });

    if (response.status === 200 && response.data) {
      const resData = response.data;
      
      // Check for API Gateway errors inside JSON body
      const header = resData?.response?.header;
      if (header && header.resultCode !== '00') {
        throw new Error(`Public energy API error: ${header.resultMsg}`);
      }
      
      return JSON.stringify(resData);
    }
    throw new Error(`Invalid API response status: ${response.status}`);
  } catch (err) {
    logger.error('energy.repository.fetchEnergyJsonFromPublicPortal', 'Failed to fetch actual building energy JSON data', { error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
