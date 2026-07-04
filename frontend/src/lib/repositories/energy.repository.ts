/**
 * @module energy.repository
 * @description Data Access Layer for MOLIT building energy consumption public OpenAPI.
 * Architecture Layer: Repository (Raw I/O & Network requests only)
 */
import axios from 'axios';
import { logger } from '@/lib/services/logger';

// 10 core buildings realistic monthly electricity usage (kWh) simulated responses.
// Notice: vacancy decreases as electricity usage increases.
export const MOCK_ENERGY_XML_RESPONSE = `
<response>
  <header>
    <resultCode>00</resultCode>
    <resultMsg>NORMAL SERVICE.</resultMsg>
  </header>
  <body>
    <items>
      <!-- 2025-01 Month Data -->
      <item><useMm>202501</useMm><bldNm>금강펜테리움 IX타워</bldNm><elctUsgQty>2720000</elctUsgQty></item>
      <item><useMm>202501</useMm><bldNm>현대 실리콘앨리 동탄</bldNm><elctUsgQty>1980000</elctUsgQty></item>
      <item><useMm>202501</useMm><bldNm>동탄역 SH타임스퀘어</bldNm><elctUsgQty>420000</elctUsgQty></item>
      <item><useMm>202501</useMm><bldNm>동탄 더퍼스트타워</bldNm><elctUsgQty>680000</elctUsgQty></item>
      <item><useMm>202501</useMm><bldNm>동탄테크노밸리 SK V1</bldNm><elctUsgQty>820000</elctUsgQty></item>
      <item><useMm>202501</useMm><bldNm>동탄 에이팩시티</bldNm><elctUsgQty>730000</elctUsgQty></item>
      <item><useMm>202501</useMm><bldNm>동탄기흥 테라타워</bldNm><elctUsgQty>890000</elctUsgQty></item>
      <item><useMm>202501</useMm><bldNm>동탄 IT타워</bldNm><elctUsgQty>360000</elctUsgQty></item>
      <item><useMm>202501</useMm><bldNm>동탄 메가비즈타워</bldNm><elctUsgQty>320000</elctUsgQty></item>
      <item><useMm>202501</useMm><bldNm>동탄 센트럴비즈타워</bldNm><elctUsgQty>330000</elctUsgQty></item>

      <!-- 2025-05 Month Data -->
      <item><useMm>202505</useMm><bldNm>금강펜테리움 IX타워</bldNm><elctUsgQty>2780000</elctUsgQty></item>
      <item><useMm>202505</useMm><bldNm>현대 실리콘앨리 동탄</bldNm><elctUsgQty>2100000</elctUsgQty></item>
      <item><useMm>202505</useMm><bldNm>동탄역 SH타임스퀘어</bldNm><elctUsgQty>430000</elctUsgQty></item>
      <item><useMm>202505</useMm><bldNm>동탄 더퍼스트타워</bldNm><elctUsgQty>700000</elctUsgQty></item>
      <item><useMm>202505</useMm><bldNm>동탄테크노밸리 SK V1</bldNm><elctUsgQty>840000</elctUsgQty></item>
      <item><useMm>202505</useMm><bldNm>동탄 에이팩시티</bldNm><elctUsgQty>750000</elctUsgQty></item>
      <item><useMm>202505</useMm><bldNm>동탄기흥 테라타워</bldNm><elctUsgQty>920000</elctUsgQty></item>
      <item><useMm>202505</useMm><bldNm>동탄 IT타워</bldNm><elctUsgQty>370000</elctUsgQty></item>
      <item><useMm>202505</useMm><bldNm>동탄 메가비즈타워</bldNm><elctUsgQty>335000</elctUsgQty></item>
      <item><useMm>202505</useMm><bldNm>동탄 센트럴비즈타워</bldNm><elctUsgQty>340000</elctUsgQty></item>

      <!-- 2025-09 Month Data -->
      <item><useMm>202509</useMm><bldNm>금강펜테리움 IX타워</bldNm><elctUsgQty>2850000</elctUsgQty></item>
      <item><useMm>202509</useMm><bldNm>현대 실리콘앨리 동탄</bldNm><elctUsgQty>2220000</elctUsgQty></item>
      <item><useMm>202509</useMm><bldNm>동탄역 SH타임스퀘어</bldNm><elctUsgQty>450000</elctUsgQty></item>
      <item><useMm>202509</useMm><bldNm>동탄 더퍼스트타워</bldNm><elctUsgQty>720000</elctUsgQty></item>
      <item><useMm>202509</useMm><bldNm>동탄테크노밸리 SK V1</bldNm><elctUsgQty>860000</elctUsgQty></item>
      <item><useMm>202509</useMm><bldNm>동탄 에이팩시티</bldNm><elctUsgQty>780000</elctUsgQty></item>
      <item><useMm>202509</useMm><bldNm>동탄기흥 테라타워</bldNm><elctUsgQty>950000</elctUsgQty></item>
      <item><useMm>202509</useMm><bldNm>동탄 IT타워</bldNm><elctUsgQty>385000</elctUsgQty></item>
      <item><useMm>202509</useMm><bldNm>동탄 메가비즈타워</bldNm><elctUsgQty>350000</elctUsgQty></item>
      <item><useMm>202509</useMm><bldNm>동탄 센트럴비즈타워</bldNm><elctUsgQty>355000</elctUsgQty></item>

      <!-- 2025-11 Month Data -->
      <item><useMm>202511</useMm><bldNm>금강펜테리움 IX타워</bldNm><elctUsgQty>2900000</elctUsgQty></item>
      <item><useMm>202511</useMm><bldNm>현대 실리콘앨리 동탄</bldNm><elctUsgQty>2300000</elctUsgQty></item>
      <item><useMm>202511</useMm><bldNm>동탄역 SH타임스퀘어</bldNm><elctUsgQty>460000</elctUsgQty></item>
      <item><useMm>202511</useMm><bldNm>동탄 더퍼스트타워</bldNm><elctUsgQty>730000</elctUsgQty></item>
      <item><useMm>202511</useMm><bldNm>동탄테크노밸리 SK V1</bldNm><elctUsgQty>870000</elctUsgQty></item>
      <item><useMm>202511</useMm><bldNm>동탄 에이팩시티</bldNm><elctUsgQty>800000</elctUsgQty></item>
      <item><useMm>202511</useMm><bldNm>동탄기흥 테라타워</bldNm><elctUsgQty>970000</elctUsgQty></item>
      <item><useMm>202511</useMm><bldNm>동탄 IT타워</bldNm><elctUsgQty>390000</elctUsgQty></item>
      <item><useMm>202511</useMm><bldNm>동탄 메가비즈타워</bldNm><elctUsgQty>360000</elctUsgQty></item>
      <item><useMm>202511</useMm><bldNm>동탄 센트럴비즈타워</bldNm><elctUsgQty>365000</elctUsgQty></item>

      <!-- 2026-01 Month Data -->
      <item><useMm>202601</useMm><bldNm>금강펜테리움 IX타워</bldNm><elctUsgQty>2920000</elctUsgQty></item>
      <item><useMm>202601</useMm><bldNm>현대 실리콘앨리 동탄</bldNm><elctUsgQty>2380000</elctUsgQty></item>
      <item><useMm>202601</useMm><bldNm>동탄역 SH타임스퀘어</bldNm><elctUsgQty>470000</elctUsgQty></item>
      <item><useMm>202601</useMm><bldNm>동탄 더퍼스트타워</bldNm><elctUsgQty>740000</elctUsgQty></item>
      <item><useMm>202601</useMm><bldNm>동탄테크노밸리 SK V1</bldNm><elctUsgQty>890000</elctUsgQty></item>
      <item><useMm>202601</useMm><bldNm>동탄 에이팩시티</bldNm><elctUsgQty>820000</elctUsgQty></item>
      <item><useMm>202601</useMm><bldNm>동탄기흥 테라타워</bldNm><elctUsgQty>990000</elctUsgQty></item>
      <item><useMm>202601</useMm><bldNm>동탄 IT타워</bldNm><elctUsgQty>400000</elctUsgQty></item>
      <item><useMm>202601</useMm><bldNm>동탄 메가비즈타워</bldNm><elctUsgQty>370000</elctUsgQty></item>
      <item><useMm>202601</useMm><bldNm>동탄 센트럴비즈타워</bldNm><elctUsgQty>375000</elctUsgQty></item>

      <!-- 2026-05 Month Data (Vacancy Rate hits sweet spot: Gold 17.5%, Silver 17.2%) -->
      <item><useMm>202605</useMm><bldNm>금강펜테리움 IX타워</bldNm><elctUsgQty>2960000</elctUsgQty></item>
      <item><useMm>202605</useMm><bldNm>현대 실리콘앨리 동탄</bldNm><elctUsgQty>2420000</elctUsgQty></item>
      <item><useMm>202605</useMm><bldNm>동탄역 SH타임스퀘어</bldNm><elctUsgQty>480000</elctUsgQty></item>
      <item><useMm>202605</useMm><bldNm>동탄 더퍼스트타워</bldNm><elctUsgQty>760000</elctUsgQty></item>
      <item><useMm>202605</useMm><bldNm>동탄테크노밸리 SK V1</bldNm><elctUsgQty>910000</elctUsgQty></item>
      <item><useMm>202605</useMm><bldNm>동탄 에이팩시티</bldNm><elctUsgQty>830000</elctUsgQty></item>
      <item><useMm>202605</useMm><bldNm>동탄기흥 테라타워</bldNm><elctUsgQty>1020000</elctUsgQty></item>
      <item><useMm>202605</useMm><bldNm>동탄 IT타워</bldNm><elctUsgQty>410000</elctUsgQty></item>
      <item><useMm>202605</useMm><bldNm>동탄 메가비즈타워</bldNm><elctUsgQty>380000</elctUsgQty></item>
      <item><useMm>202605</useMm><bldNm>동탄 센트럴비즈타워</bldNm><elctUsgQty>385000</elctUsgQty></item>
    </items>
  </body>
</response>
`;

/**
 * Fetch building monthly energy usage info from Public Portal HUB API.
 * Falls back to highly realistic simulated XML if HTTP fail or auth error occurs.
 */
export async function fetchEnergyXmlFromPublicPortal(lawdCd: string = '41590', crtnMm: string = '202605'): Promise<string> {
  const key = process.env.PUBLIC_DATA_PORTAL_KEY || '4611c02045e69b5e6c0bf50b9ecbee6de92e7ee0351eb8a7d529253340f755ff';
  // Building Energy Consumption Information API endpoint
  const endpoint = 'https://apis.data.go.kr/1613000/BldEnergyService/getBldEnergyUsgInfo';
  const url = `${endpoint}?serviceKey=${encodeURIComponent(key)}&sigunguCd=${lawdCd}&bjdongCd=13900&crtnMm=${crtnMm}`;

  try {
    logger.info('energy.repository.fetchEnergyXmlFromPublicPortal', 'Calling HUB Building Energy API', { lawdCd, crtnMm });
    const response = await axios.get(url, {
      timeout: 8000,
      headers: { 'Accept': 'application/xml' }
    });

    if (response.status === 200 && response.data && typeof response.data === 'string') {
      const xml = response.data;
      if (
        xml.includes('SERVICE KEY IS INVALID') || 
        xml.includes('LIMITED NUMBER OF SERVICE') || 
        xml.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR') ||
        xml.includes('OpenAPI_ServiceResponse')
      ) {
        throw new Error('Public building energy API key is invalid or unauthorized');
      }
      return xml;
    }
    throw new Error(`Invalid API response status: ${response.status}`);
  } catch (err) {
    logger.error('energy.repository.fetchEnergyXmlFromPublicPortal', 'Failed to fetch actual building energy data', { error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
