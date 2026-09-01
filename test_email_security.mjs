import assert from 'assert';

const BASE_URL = 'http://localhost:5000';

async function runEmailSecurityTests() {
  console.log('🛡️ Starting Comprehensive Gmail Normalization & Anti-Sybil Security Tests...\n');

  // Test 1: Admin login
  const adminRes = await fetch(`${BASE_URL}/api/auth/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const adminData = await adminRes.json();
  const adminToken = adminData.token;

  // Test 2: Reject Invalid Email Syntax
  console.log('1️⃣ Testing Invalid Email Syntax Rejection...');
  const invalidRes = await fetch(`${BASE_URL}/api/auth/participant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Fake User', email: 'invalid-email-no-at-sign' }),
  });
  assert.strictEqual(invalidRes.status, 400, 'Invalid email must be rejected with 400');
  const invalidJson = await invalidRes.json();
  console.log(`   ✅ Invalid syntax rejected: "${invalidJson.error}"`);

  // Test 3: Reject Disposable / Burner Email Domains
  console.log('\n2️⃣ Testing Disposable / Temporary Burner Email Rejection...');
  const burnerRes = await fetch(`${BASE_URL}/api/auth/participant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Burner User', email: 'test@tempmail.com' }),
  });
  assert.strictEqual(burnerRes.status, 400, 'Disposable email must be rejected with 400');
  const burnerJson = await burnerRes.json();
  console.log(`   ✅ Burner email blocked: "${burnerJson.error}"`);

  // Test 4: Primary Registration with Gmail
  console.log('\n3️⃣ Registering Primary Gmail Candidate (sam.altman@gmail.com)...');
  const reg1Res = await fetch(`${BASE_URL}/api/auth/participant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Sam Altman', email: 'sam.altman@gmail.com' }),
  });
  assert.strictEqual(reg1Res.status, 200);
  const reg1Data = await reg1Res.json();
  assert.strictEqual(reg1Data.isExisting, false);
  const samId = reg1Data.participant.id;
  const samToken = reg1Data.token;
  console.log(`   ✅ Sam registered successfully. Normalized email: ${reg1Data.participant.normalizedEmail}`);

  // Test 5: Dot-trick alias detection
  console.log('\n4️⃣ Testing Gmail Dot-Trick Alias (s.a.m.a.l.t.m.a.n@gmail.com)...');
  const dotRes = await fetch(`${BASE_URL}/api/auth/participant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Sam Impostor 1', email: 's.a.m.a.l.t.m.a.n@gmail.com' }),
  });
  assert.strictEqual(dotRes.status, 200);
  const dotData = await dotRes.json();
  assert.strictEqual(dotData.isExisting, true, 'Dot variation MUST be detected as existing participant!');
  assert.strictEqual(dotData.participant.id, samId, 'Must map to Sam Altman unique ID');
  console.log('   ✅ Dot-trick variation successfully identified as the same user!');

  // Test 6: Plus-tag alias detection
  console.log('\n5️⃣ Testing Gmail Plus-Tag Alias (samaltman+quiz2@googlemail.com)...');
  const plusRes = await fetch(`${BASE_URL}/api/auth/participant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Sam Impostor 2', email: 'samaltman+quiz2@googlemail.com' }),
  });
  assert.strictEqual(plusRes.status, 200);
  const plusData = await plusRes.json();
  assert.strictEqual(plusData.isExisting, true, 'Plus variation MUST be detected as existing participant!');
  assert.strictEqual(plusData.participant.id, samId, 'Must map to Sam Altman unique ID');
  console.log('   ✅ Plus-tag & googlemail.com alias identified as the same user!');

  // Test 7: Sam takes and completes the quiz
  console.log('\n6️⃣ Sam completes the quiz...');
  await fetch(`${BASE_URL}/api/quiz/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${samToken}` },
  });

  for (let q = 1; q <= 10; q++) {
    await fetch(`${BASE_URL}/api/quiz/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${samToken}`,
      },
      body: JSON.stringify({ questionId: q, selectedOption: 'D' }),
    });
  }
  console.log('   ✅ Sam finished quiz (status: COMPLETED).');

  // Test 8: Attempting to retake quiz using original email -> MUST BE BLOCKED
  console.log('\n7️⃣ Testing Retake Prevention (Attempting to re-register with sam.altman@gmail.com)...');
  const retake1Res = await fetch(`${BASE_URL}/api/auth/participant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Sam Altman', email: 'sam.altman@gmail.com' }),
  });
  assert.strictEqual(retake1Res.status, 403, 'Completed quiz retake must return 403 Forbidden');
  const retake1Json = await retake1Res.json();
  console.log(`   ✅ Retake strictly blocked: "${retake1Json.error}"`);

  // Test 9: Attempting to retake quiz using Gmail dot/plus variation -> MUST BE BLOCKED
  console.log('\n8️⃣ Testing Retake Prevention on Dot/Plus Variation (s.a.m.a.l.t.m.a.n+newtry@gmail.com)...');
  const retake2Res = await fetch(`${BASE_URL}/api/auth/participant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Sam Altman', email: 's.a.m.a.l.t.m.a.n+newtry@gmail.com' }),
  });
  assert.strictEqual(retake2Res.status, 403, 'Variation retake must return 403 Forbidden');
  const retake2Json = await retake2Res.json();
  console.log(`   ✅ Alias retake strictly blocked: "${retake2Json.error}"`);

  // Test 10: Admin reset allows clean retake if requested
  console.log('\n9️⃣ Testing Admin Explicit Reset Functionality...');
  const resetRes = await fetch(`${BASE_URL}/api/admin/participants/${samId}/reset`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(resetRes.status, 200);

  // Now Sam can login again
  const afterResetRes = await fetch(`${BASE_URL}/api/auth/participant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Sam Altman', email: 'sam.altman@gmail.com' }),
  });
  assert.strictEqual(afterResetRes.status, 200, 'After admin reset, login should succeed');
  console.log('   ✅ Admin reset successfully unlocked candidate session.');

  console.log('\n================================================================');
  console.log('🛡️ ALL GMAIL NORMALIZATION & ANTI-SYBIL SECURITY TESTS PASSED 100%!');
  console.log('================================================================\n');
}

runEmailSecurityTests().catch((err) => {
  console.error('❌ Email Security Test Failed:', err);
  process.exit(1);
});
