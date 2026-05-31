async function main() {
  const url = 'https://firestore.googleapis.com/v1/projects/portfolio-dtdls/databases/(default)/documents:runQuery';
  const query = {
    structuredQuery: {
      from: [{ collectionId: 'local_notices' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'title' },
          op: 'EQUAL',
          value: { stringValue: '「화성동탄2 C27블록」공공분양 장애인 특별공급 안내' }
        }
      }
    }
  };

  console.log('Searching for C27 notices in Firestore...');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query)
  });

  const data = await res.json();
  data.forEach((result, idx) => {
    const doc = result.document;
    if (!doc) return;
    console.log(`\n[${idx + 1}] ID: ${doc.name.split('/').pop()}`);
    console.log(JSON.stringify(doc.fields, null, 2));
  });
}

main().catch(console.error);
