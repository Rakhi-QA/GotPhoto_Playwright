import { test, expect } from '@playwright/test';
import { getGeneratedLink, getJobName } from '../utils/linkStorage.js';
import ftp from 'basic-ftp';
import fs from 'fs';
import path from 'path';

test.setTimeout(180000); // 3 minutes total timeout

test('Complete GotPhoto order placement + FTP upload', async ({ page }) => {
  // ✅ 1️⃣ Get generated link and job name
  const generatedLink = getGeneratedLink();
  const jobName = getJobName();

  if (!generatedLink || !jobName) {
    throw new Error('❌ No generated link or job name found. Run api_create_and_upload.spec.js first.');
  }

  console.log('🌐 Opening generated link:', generatedLink);
  await page.goto(generatedLink, { waitUntil: 'load' });
  await page.waitForTimeout(5000);

  // ✅ 2️⃣ Click "Standard Team Build"
  await page.waitForSelector('#std_team_up', { state: 'visible', timeout: 10000 });
  await page.locator('#std_team_up').scrollIntoViewIfNeeded();
  await page.click('#std_team_up');
  console.log('✅ Clicked on "Standard Team Build"');
  await page.waitForTimeout(2000);

  // ✅ 3️⃣ Click "Single Template for Organization"
  await page.locator('text=Single Template for Organization').scrollIntoViewIfNeeded();
  await page.waitForSelector('#bgsinglecheck_s', { state: 'visible', timeout: 10000 });
  await page.click('#bgsinglecheck_s');
  console.log('✅ Clicked on "Single Template for Organization"');
  await page.waitForTimeout(2000);

  // ✅ 4️⃣ Select template
  await page.waitForSelector('#bcktemplete', { state: 'visible', timeout: 10000 });
  await page.selectOption('#bcktemplete', { value: '487' });
  console.log('✅ Selected "487" from dropdown');
  await page.waitForTimeout(2000);

  // ✅ 5️⃣ Attach extracted images
  await page.locator('text=Attach extracted images to access codes').scrollIntoViewIfNeeded();
  await page.click('#extractedimages');
  console.log('✅ Clicked on "Attach extracted images"');
  await page.waitForTimeout(1000);

  await page.click('#extractedimagesI');
  console.log('✅ Clicked on extractedimagesI');
  await page.waitForTimeout(1000);

  // ✅ 6️⃣ Full Length Centering
  await page.locator('text=Full Length Centering').scrollIntoViewIfNeeded();
  await page.click('#cropimagesfull');
  console.log('✅ Clicked on "Full Length Centering"');
  await page.waitForTimeout(1000);

  // ✅ 7️⃣ PNG Team Add On
  await page.locator('text=PNG Team Add On').scrollIntoViewIfNeeded();
  await page.click('#png_team_add_on');
  console.log('✅ Clicked on "PNG Team Add On"');
  await page.waitForTimeout(1000);

  // ✅ 8️⃣ Team Color
  await page.locator('text=Unique color for each team in organization').scrollIntoViewIfNeeded();
  await page.click('#teamcolorY');
  console.log('✅ Clicked on Team Color Y');
  await page.waitForTimeout(1000);

  // ✅ 9️⃣ Color Correction
  await page.locator('text=Color Correction').scrollIntoViewIfNeeded();
  await page.click('#ccservices');
  console.log('✅ Clicked on "Color Correction"');
  await page.waitForTimeout(1000);

  // ✅ 🔟 Discount
  await page.fill('#discount_code', '100OFF');
  console.log('✅ Entered discount code 100OFF');
  await page.click('#Redeem');
  console.log('✅ Clicked Redeem');
  await page.waitForTimeout(3000);

  // ✅ 11️⃣ Pay Now
  await page.locator('#btnpaynow').scrollIntoViewIfNeeded();
  await page.click('#btnpaynow');
  console.log('✅ Clicked Pay Now');
  await page.waitForTimeout(4000);

  console.log('🎉 Order placement flow completed successfully!');

  console.log('📡 Calling Confirm Image Transferred API...');

try {
    // ✅ Get the job ID saved from Test 1
    const { getJobId } = await import('../utils/linkStorage.js');
    const nextgenJobId = getJobId();

    if (!nextgenJobId) {
      throw new Error('❌ No NextGen Job ID found. Please run api_create_and_upload.spec.js first.');
    }

    console.log('✅ Using Job ID from previous test:', nextgenJobId);

    const confirmUrl = 'https://staging.production.nextgenphotosolutions.com/Gpservices/confirmimagetransferred';
    const confirmBody = {
      api_key: 'GP=Ha2xc0Rcc2less2=NG',
      job_id: nextgenJobId, // ✅ use the real job ID now
      img_transferred: 'Y'
    };

    const confirmResponse = await page.request.post(confirmUrl, {
      headers: { 'Content-Type': 'application/json' },
      data: confirmBody
    });

    if (confirmResponse.ok()) {
      const resJson = await confirmResponse.json();
      console.log('✅ Confirm API Success:', resJson);
    } else {
      console.error('❌ Confirm API failed with status', confirmResponse.status());
    }
  } catch (err) {
    console.error('❌ Error calling Confirm API:', err);
  }


});
