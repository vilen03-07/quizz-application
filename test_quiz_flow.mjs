import assert from 'assert';

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('🧪 Starting Automated End-to-End Verification of AAA Quiz System...\n');

  // Test 1: Admin Authentication
  console.log('1️⃣ Testing Admin Authentication...');
  const adminAuthRes = await fetch(`${BASE_URL}/api/auth/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  assert.strictEqual(adminAuthRes.status, 200, 'Admin login failed');
  const adminData = await adminAuthRes.json();
  assert.ok(adminData.token, 'Missing admin token');
  console.log('   ✅ Admin successfully authenticated. JWT Token obtained.');

  // Test 2: Participant Registration
  console.log('\n2️⃣ Testing Participant Registration (Alice Quantum)...');
  const regRes = await fetch(`${BASE_URL}/api/auth/participant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice Quantum',
      email: 'alice@quantum.tech',
      department: 'Robotics Lab',
      avatar: 'avatar-1',
    }),
  });
  assert.strictEqual(regRes.status, 200, 'Participant registration failed');
  const aliceData = await regRes.json();
  const aliceToken = aliceData.token;
  assert.ok(aliceToken, 'Missing alice token');
  console.log(`   ✅ Alice registered successfully with ID: ${aliceData.participant.id}`);

  // Test 3: Start Quiz
  console.log('\n3️⃣ Testing Quiz Start & Active Question Fetch...');
  const startRes = await fetch(`${BASE_URL}/api/quiz/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  assert.strictEqual(startRes.status, 200, 'Quiz start failed');
  const startData = await startRes.json();
  assert.strictEqual(startData.currentQuestionIndex, 0);
  assert.strictEqual(startData.question.id, 1);
  assert.strictEqual(startData.question.options.length, 4);
  assert.strictEqual(startData.question.correctAnswer, undefined, 'CRITICAL: Correct answer MUST NOT be leaked to client!');
  console.log('   ✅ Q1 fetched securely without leaking correct answer.');

  // Test 4: Submit Answer for Q1
  console.log('\n4️⃣ Testing Q1 Answer Submission (Correct Answer: D - Biometric Scanner)...');
  const submitQ1Res = await fetch(`${BASE_URL}/api/quiz/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aliceToken}`,
    },
    body: JSON.stringify({
      questionId: 1,
      selectedOption: 'D',
    }),
  });
  assert.strictEqual(submitQ1Res.status, 200, 'Q1 submission failed');
  const q1Result = await submitQ1Res.json();
  assert.strictEqual(q1Result.currentScore, 10, 'Score should be 10 for correct answer');
  assert.strictEqual(q1Result.nextQuestionIndex, 1, 'Should advance to Q2 (index 1)');
  console.log('   ✅ Q1 answer locked and accepted. Current Score: 10/100.');

  // Test 5: Anti-Retry Guarantee (Duplicate Submission Test)
  console.log('\n5️⃣ Testing Anti-Retry Lock (Attempting to re-submit Q1)...');
  const duplicateRes = await fetch(`${BASE_URL}/api/quiz/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aliceToken}`,
    },
    body: JSON.stringify({
      questionId: 1,
      selectedOption: 'A',
    }),
  });
  assert.strictEqual(duplicateRes.status, 400, 'Duplicate submission must be rejected with 400');
  const duplicateErr = await duplicateRes.json();
  console.log(`   ✅ Retry successfully blocked by server: "${duplicateErr.error}"`);

  // Test 6: Anti-Cheat Violation Logging
  console.log('\n6️⃣ Testing Anti-Cheat Tab-Switch Violation Logger...');
  const violationRes = await fetch(`${BASE_URL}/api/quiz/violation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aliceToken}`,
    },
    body: JSON.stringify({
      type: 'TAB_SWITCH',
      details: 'Participant switched window to search answers',
    }),
  });
  assert.strictEqual(violationRes.status, 200);
  console.log('   ✅ Integrity violation logged and queued for live admin stream.');

  // Test 7: Complete Remaining Questions (Q2 to Q10)
  console.log('\n7️⃣ Answering remaining questions for Alice (Q2 to Q10)...');
  const correctKeys = {
    2: 'A', // Iris Scanner
    3: 'C', // VR Headset
    4: 'D', // Network Hub
    5: 'B', // Microchip
    6: 'B', // SIM Card Tray
    7: 'D', // Camera Sensor
    8: 'B', // Optical Fiber
    9: 'B', // Motherboard
    10: 'D', // Joystick
  };

  for (let qId = 2; qId <= 10; qId++) {
    const subRes = await fetch(`${BASE_URL}/api/quiz/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        questionId: qId,
        selectedOption: correctKeys[qId],
      }),
    });
    assert.strictEqual(subRes.status, 200, `Failed submitting Q${qId}`);
    const subData = await subRes.json();
    if (qId === 10) {
      assert.strictEqual(subData.isComplete, true, 'Quiz should be complete after Q10');
      assert.strictEqual(subData.currentScore, 100, 'Final score should be 100');
    }
  }
  console.log('   ✅ Alice answered all 10 questions perfectly. Final Score: 100/100!');

  // Test 8: Quiz Review Debrief
  console.log('\n8️⃣ Testing Post-Quiz Review & Explanations API...');
  const reviewRes = await fetch(`${BASE_URL}/api/quiz/review`, {
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  assert.strictEqual(reviewRes.status, 200);
  const reviewData = await reviewRes.json();
  assert.strictEqual(reviewData.review.length, 10);
  assert.strictEqual(reviewData.participant.score, 100);
  console.log('   ✅ Full debrief with 10 question explanations retrieved successfully.');

  // Test 9: Admin Live Snapshot & Heatmaps
  console.log('\n9️⃣ Testing Admin Live Streaming Snapshot & Question Heatmaps...');
  const adminSnapRes = await fetch(`${BASE_URL}/api/admin/snapshot`, {
    headers: { Authorization: `Bearer ${adminData.token}` },
  });
  assert.strictEqual(adminSnapRes.status, 200);
  const snap = await adminSnapRes.json();
  assert.ok(snap.participants.length >= 1);
  assert.strictEqual(snap.leaderboard[0].name, 'Alice Quantum');
  assert.strictEqual(snap.leaderboard[0].score, 100);
  assert.strictEqual(snap.questionAnalytics.length, 10);
  console.log('   ✅ Admin snapshot verified: Alice is #1 on Leaderboard with 100 pts.');

  // Test 10: Admin CSV Export
  console.log('\n🔟 Testing Admin CSV Leaderboard Export...');
  const csvRes = await fetch(`${BASE_URL}/api/admin/export/csv`, {
    headers: { Authorization: `Bearer ${adminData.token}` },
  });
  assert.strictEqual(csvRes.status, 200);
  const csvText = await csvRes.text();
  assert.ok(csvText.includes('Rank,Name,Email,Department,Score'));
  assert.ok(csvText.includes('Alice Quantum'));
  console.log('   ✅ CSV Export contains valid headers and participant records.');

  console.log('\n========================================================');
  console.log('🎉 ALL 10 AUTOMATED VERIFICATION TESTS PASSED WITH 100% SUCCESS!');
  console.log('========================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Verification Test Failed:', err);
  process.exit(1);
});
