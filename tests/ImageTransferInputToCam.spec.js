// ===============================
// confirmImageTransferred.spec.js
// ===============================

import { test, expect } from '@playwright/test';
import fs from 'fs';

test('Confirm Images Transferred API', async ({ request }) => {

  // ---------------------------------------
  // 1️⃣ Read jobId from generatedData.json
  // ---------------------------------------
  const dataPath = 'generatedData.json';

  if (!fs.existsSync(dataPath)) {
    throw new Error(`❌ ${dataPath} not found! Run your main test first.`);
  }

  const generatedData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const jobId = generatedData.jobId;

  expect(jobId).toBeTruthy();
  console.log(`📌 Using Job ID from file: ${jobId}`);


  // ---------------------------------------
  // 2️⃣ Confirm Images Transferred API Call
  // ---------------------------------------
  const apiUrl =
    'https://staging.production.nextgenphotosolutions.com/Gpservices/confirmimagetransferred';

  const payload = {
    api_key: 'GP=Ha2xc0Rcc2less2=NG',
    job_id: jobId,
    img_transferred: 'Y'
  };

  console.log("➡️ Sending Confirm Image Transferred API request...");

  const response = await request.post(apiUrl, {
    headers: { 'Content-Type': 'application/json' },
    data: payload
  });

  expect(response.ok()).toBeTruthy(); // validates 200 OK

  const result = await response.json();
  console.log("✅ Confirm API Response:", result);


  // ---------------------------------------
  // 3️⃣ API Response Validation
  // ---------------------------------------
  expect(result).toHaveProperty('status');
  expect(result.status.toLowerCase()).toContain('success');

  console.log("🎉 Image Transfer Confirmed Successfully!");
});
