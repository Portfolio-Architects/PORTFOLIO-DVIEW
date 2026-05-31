async function main() {
  const url = 'https://firestore.googleapis.com/v1/projects/portfolio-dtdls/databases/(default)/documents/local_notices?pageSize=30';
  console.log('Fetching from Firestore REST API...');
  const res = await fetch(url);
  if (!res.ok) {
    console.error('Failed to fetch from Firestore REST API:', res.status, await res.text());
    return;
  }

  const data = await res.json();
  const docs = data.documents || [];
  console.log(`Fetched ${docs.length} documents from Firestore.`);

  docs.forEach((doc, idx) => {
    const fields = doc.fields;
    const name = doc.name; // Full path e.g. projects/.../databases/(default)/documents/local_notices/bbs_1234
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
