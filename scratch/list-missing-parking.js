const http = require('http');

http.get('http://localhost:5000/api/apartments-by-dong', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const missing = [];
      const ok = [];
      
      if (json.byDong) {
        for (const dong in json.byDong) {
          for (const apt of json.byDong[dong]) {
            if (apt.parkingPerHousehold === undefined || apt.parkingPerHousehold === null) {
              missing.push({ name: apt.name, dong: apt.dong, householdCount: apt.householdCount, parkingCount: apt.parkingCount });
            } else {
              ok.push(apt);
            }
          }
        }
      }
      
      console.log(`Total apartments: ${ok.length + missing.length}`);
      console.log(`Apartments with parking score: ${ok.length}`);
      console.log(`Apartments missing parking score: ${missing.length}`);
      console.log('--- Missing List ---');
      missing.forEach(m => {
        console.log(`[${m.dong}] ${m.name} (세대수: ${m.householdCount ?? '없음'}, 주차대수: ${m.parkingCount ?? '없음'})`);
      });
    } catch (e) {
      console.error('Failed to parse JSON:', e.message);
    }
  });
}).on('error', (err) => {
  console.error('Request error:', err.message);
});
