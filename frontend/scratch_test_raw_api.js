const apiKey = '4611c02045e69b5e6c0bf50b9ecbee6de92e7ee0351eb8a7d529253340f755ff';

async function testCenterQuery() {
  console.log('Testing query by Knowledge Center name...');
  const key = encodeURIComponent('cond[지식산업센터명::LIKE]');
  const value = encodeURIComponent('금강펜테리움');
  
  const url = `https://api.odcloud.kr/api/15106170/v1/uddi:c5988948-73f2-41dd-af38-c0f1cee398b1?page=1&perPage=50&${key}=${value}&serviceKey=${apiKey}`;
  
  try {
    const res = await fetch(url);
    console.log('Response Status:', res.status);
    const json = await res.json();
    console.log('Returned count:', json.currentCount);
    console.log('Total matching count:', json.matchCount || json.totalCount);
    console.log('Sample companies in 금강펜테리움:');
    json.data?.forEach(item => {
      console.log(`- ${item['회사명']} | ${item['지식산업센터명']} | ${item['공장주소']}`);
    });
  } catch (err) {
    console.error('Error querying by center name:', err);
  }
}

testCenterQuery();
