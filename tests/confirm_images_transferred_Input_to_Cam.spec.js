import { test, expect } from '@playwright/test';
import fs from 'fs';

test('Confirm images transferred', async ({ request }) => {
  const generatedData = JSON.parse(fs.readFileSync('generatedData.json', 'utf8'));
  const jobId = generatedData.jobId;

  expect(jobId).toBeTruthy();
  console.log(`📌 Using Job ID: ${jobId}`);

  
  const confirmUrl = 'https://staging.production.nextgenphotosolutions.com/Gpservices/confirmimagetransferred';
  const payload = {
    api_key: 'GP=Ha2xc0Rcc2less2=NG',
    job_id: jobId,
    img_transferred: 'Y'
  };

  console.log('➡️ Calling Confirm API with job ID:', jobId);

  const response = await request.post(confirmUrl, {
    headers: { 'Content-Type': 'application/json' },
    data: payload
  });

  const result = await response.json();
  console.log('✅ Confirm API Response:', result);
expect(response.ok()).toBeTruthy();
  });
