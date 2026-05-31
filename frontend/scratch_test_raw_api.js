const http = require('http');
const fs = require('fs');

http.get('http://localhost:5000/api/local-notices', (res) => {
  let data = [];
  res.on('data', (chunk) => {
    data.push(chunk);
  });
  res.on('end', () => {
    const buffer = Buffer.concat(data);
    fs.writeFileSync('raw_api_response.json', buffer);
    console.log('Saved raw response to raw_api_response.json');
    process.exit(0);
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
