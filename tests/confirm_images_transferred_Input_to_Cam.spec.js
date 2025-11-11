import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

test('Confirm images transferred after order placed', async ({ request }) => {
  const jobId = process.env.NEXTGEN_JOB_ID;

  if (!jobId) {
    throw new Error('❌ No job ID found. Run job creation test first.');
  }

  console.log('✅ Using NextGen Job ID:', jobId);

  const confirmUrl = 'https://staging.production.nextgenphotosolutions.com/Gpservices/confirmimagetransferred';
  const body = {
    api_key: 'GP=Ha2xc0Rcc2less2=NG',
    job_id: jobId,
    img_transferred: 'Y'
  };

  console.log('➡️ Calling Confirm API:', confirmUrl);
  console.log('📦 Body:', body);

  const response = await request.post(confirmUrl, {
    headers: { 'Content-Type': 'application/json' },
    data: body
  });

  expect(response.ok()).toBeTruthy();
  const json = await response.json();
  console.log('✅ Confirm API Response:', json);
});
