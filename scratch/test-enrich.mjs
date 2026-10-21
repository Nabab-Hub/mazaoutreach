async function test() {
  const testCsv = 'name,email,business,niche,city,website,notes\n' +
    'Dr. Sanjay Singhania,sanjay@singhaniadental.in,Singhania Dental Implant Clinic,,Mumbai,https://singhaniadental.in,\n' +
    'Rohan Verma,rohan@delhicricketeers.org,Delhi Cricketeers Club,,Delhi,https://delhicricketeers.org,\n' +
    'Aarti Designs,aarti@aartiboutique.com,Aarti Designer Boutique & Sarees,,Jaipur,https://aartiboutique.com,\n';

  console.log('Testing CSV upload with missing niches and missing notes...');
  const res = await fetch('http://localhost:3000/api/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      csvContent: testCsv,
      filename: 'ai_enrichment_test.csv',
      autoEnrich: true
    })
  });

  const data = await res.json();
  console.log('Import Status:', res.status, 'Success:', data.success);
  console.log('Imported:', data.imported, 'Enriched Count:', data.enrichedCount);
  console.log('Enrichment details:', JSON.stringify(data.enrichmentDetails, null, 2));
  console.log('Sample Valid Leads:');
  data.sampleValid.forEach(l => {
    console.log({
      name: l.name,
      business: l.businessName,
      niche: l.niche,
      notes: l.notes,
      aiEnriched: l.aiEnriched,
      enrichedFields: l.enrichedFields
    });
  });
}
test().catch(console.error);
