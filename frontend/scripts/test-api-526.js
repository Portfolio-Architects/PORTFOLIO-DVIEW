require('dotenv').config({ path: '.env.local', override: true });
const axios = require('axios');

const API_KEY = process.env.BUILDING_API_KEY || '';
const API_BASE = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent';

async function test() {
  console.log("Calling MOLIT RENT API for 202605...");
  const LAWD_CDS = ['41590', '41597'];
  
  for (const lawd of LAWD_CDS) {
    const url = `${API_BASE}?serviceKey=${encodeURIComponent(API_KEY)}&LAWD_CD=${lawd}&DEAL_YMD=202605&pageNo=1&numOfRows=1000&_type=json`;
    console.log(`URL for LAWD ${lawd}: ${url}`);
    
    try {
      const res = await axios.get(url, { timeout: 10000 });
      const data = res.data;
      
      console.log(`Response code for ${lawd}:`, data.response?.header?.resultCode);
      const items = data.response?.body?.items?.item || [];
      const itemsArr = Array.isArray(items) ? items : [items];
      
      console.log(`Total rent items fetched for ${lawd}:`, itemsArr.length);
      
      // 5월 26일(dealDay = 26) 데이터만 필터해서 보기
      const filtered = itemsArr.filter(item => String(item.dealDay || '').padStart(2, '0') === '26');
      console.log(`5월 26일 임대차 거래 건수:`, filtered.length);
      filtered.forEach(item => {
        console.log(`- Apt: ${item.aptNm}, Dong: ${item.umdNm}, Deposit: ${item.deposit}, Monthly: ${item.monthlyRent}, Floor: ${item.floor}, Day: ${item.dealDay}`);
      });
    } catch (e) {
      console.error(`Error for ${lawd}:`, e.message);
    }
  }
}

test();
