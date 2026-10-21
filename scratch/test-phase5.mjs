async function test() {
  console.log('--- 1. Testing GET /api/reports ---');
  const resReports = await fetch('http://localhost:3000/api/reports');
  const dataReports = await resReports.json();
  console.log('Reports Status:', resReports.status, 'Success:', dataReports.success);
  console.log('Overview:', dataReports.report.overview);
  console.log('Niches:', dataReports.report.nicheBreakdown.map(n => ({ niche: n.niche, replies: n.replies, rate: n.replyRate })));

  console.log('\n--- 2. Testing POST /api/reports (dispatch_digest) ---');
  const resDigest = await fetch('http://localhost:3000/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'dispatch_digest' })
  });
  const dataDigest = await resDigest.json();
  console.log('Digest Status:', resDigest.status, 'Message:', dataDigest.message);

  console.log('\n--- 3. Testing GET /api/followups ---');
  const resFollowups = await fetch('http://localhost:3000/api/followups');
  const dataFollowups = await resFollowups.json();
  console.log('Followups Status:', resFollowups.status, 'Due candidates:', dataFollowups.totalDue);

  console.log('\n--- 4. Testing POST /api/followups (generate_for_lead) ---');
  const resGen = await fetch('http://localhost:3000/api/followups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'generate_for_lead',
      leadId: 'lead-1',
      followUpNumber: 1
    })
  });
  const dataGen = await resGen.json();
  console.log('Follow-up Draft Status:', resGen.status, 'Success:', dataGen.success);
  if (dataGen.draft) {
    console.log('Draft Subject:', dataGen.draft.subject);
    console.log('Draft Snippet:', dataGen.draft.body.slice(0, 150).replace(/\n/g, ' '));
  }

  console.log('\n--- 5. Testing Route /reports HTTP Status ---');
  const resPage = await fetch('http://localhost:3000/reports');
  console.log('/reports Page Status:', resPage.status);
}
test().catch(console.error);
