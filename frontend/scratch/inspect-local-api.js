async function main() {
  const url = 'http://localhost:5001/api/local-notices';
  console.log(`Fetching local API: ${url}...`);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Request failed with HTTP ${res.status}`);
      return;
    }

    const data = await res.json();
    console.log(`Total notices returned: ${data.notices.length}`);
    console.log(`Last Updated: ${data.lastUpdated}`);

    const dongNotices = data.notices.filter(n => n.source === 'dong');
    console.log(`Dong notices in result: ${dongNotices.length}`);
    dongNotices.forEach(n => {
      console.log(`- [${n.dept}] ${n.title} (${n.date}) [ID: ${n.id}]`);
    });

    console.log('\nAll returned notices (Top 10):');
    data.notices.slice(0, 10).forEach((n, idx) => {
      console.log(`${idx + 1}. [${n.source}] [${n.dept}] ${n.title} (${n.date})`);
    });

  } catch (err) {
    console.error('Error fetching API:', err);
  }
}

main().catch(console.error);
