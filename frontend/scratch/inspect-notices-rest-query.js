async function main() {
  const url = 'https://firestore.googleapis.com/v1/projects/portfolio-dtdls/databases/(default)/documents:runQuery';
  const query = {
    structuredQuery: {
      from: [{ collectionId: 'local_notices' }],
      orderBy: [{ field: { fieldPath: 'date' }, direction: 'DESCENDING' }],
      limit: 10
    }
  };

  console.log('Sending structured query to Firestore REST API...');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query)
  });

  if (!res.ok) {
    console.error('Failed to query Firestore REST API:', res.status, await res.text());
    return;
  }

  const data = await res.json();
  console.log(`Received ${data.length} results.`);

  data.forEach((result, idx) => {
    const doc = result.document;
    if (!doc) return;
    const fields = doc.fields;
    const name = doc.name;
    const id = name.split('/').pop();
    const title = fields.title?.stringValue || '';
    const dept = fields.dept?.stringValue || '';
    const date = fields.date?.stringValue || '';
    const source = fields.source?.stringValue || '';
    const urlVal = fields.url?.stringValue || '';

    console.log(`\n[${idx + 1}] ID: ${id}`);
    console.log(`Title: ${title}`);
    console.log(`Dept: ${dept}`);
    console.log(`Date: ${date}`);
    console.log(`Source: ${source}`);
    console.log(`URL: ${urlVal}`);
  });
}

main().catch(console.error);
