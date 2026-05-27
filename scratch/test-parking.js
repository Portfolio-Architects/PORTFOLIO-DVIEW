const http = require('http');

http.get('http://localhost:5000/api/apartments-by-dong', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Success! Keys in response:', Object.keys(json));
      if (json.byDong && json.byDong['산척동']) {
        const apt = json.byDong['산척동'].find(a => a.name.includes('서희스타힐스'));
        if (apt) {
          console.log('Found apartment:', apt);
        } else {
          console.log('Apartment not found in 산척동. List:', json.byDong['산척동'].map(a => a.name));
        }
      } else {
        console.log('No 산척동 in byDong');
      }
    } catch (e) {
      console.error('Failed to parse JSON:', e.message);
    }
  });
}).on('error', (err) => {
  console.error('Request error:', err.message);
});
