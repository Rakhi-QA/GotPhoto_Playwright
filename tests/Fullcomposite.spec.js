import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { allure } from 'allure-playwright';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.setTimeout(500000); // 3 minutes total timeout

// Resolve candidate locations to avoid cwd mismatch
const CANDIDATE_FILES = [
  path.resolve(process.cwd(), 'generatedData.json'),
  path.resolve(__dirname, '../generatedData.json'),
  path.resolve(__dirname, 'generatedData.json'),
];

async function waitForAnyFile(candidates, timeout = 120000, interval = 500) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        console.log(`✅ Found file at: ${filePath}`);
        return filePath;
      }
    }
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error(`❌ generatedData.json not found after ${timeout} ms. Ensure api_create_and_upload.spec.js ran first.`);
}

test('Complete GotPhoto order placement + Full Composite', async ({ page }) => {
  allure.label({ name: 'Environment', value: 'QA' });
  allure.label({ name: 'Executor', value: 'Rakhi' });
  allure.label({ name: 'Trend', value: 'Stable' });

  // ====== STEP 0: Wait for generated data file ======
  const GENERATED_FILE = await waitForAnyFile(CANDIDATE_FILES, 120000);
  const generatedData = JSON.parse(fs.readFileSync(GENERATED_FILE, 'utf8'));

  // Parse with fallbacks
  const jobId = generatedData.nextgen_job_id || generatedData.jobId || generatedData.job_id || generatedData.id || null;
  const jobName = generatedData.jobName || generatedData.job_name || '';
  const generatedLink = generatedData.generatedLink || generatedData.checkout_url || generatedData.link || null;

  if (!jobId) throw new Error('❌ jobId missing in generatedData.json');
  if (!generatedLink) throw new Error('❌ generatedLink missing in generatedData.json');

  console.log(`\n📌 Job ID: ${jobId}`);
  console.log(`📌 Job Name: ${jobName}`);
  console.log(`🌐 Generated Link: ${generatedLink}\n`);

  // ====== STEP 1: Open generated link ======
  await allure.step('Open generated link in browser', async () => {
    console.log(`🌐 Navigating to: ${generatedLink}`);
     await page.goto(generatedLink, { waitUntil: 'networkidle' }); // ✅ Use networkidle, not load
    await page.waitForTimeout(8000); // ✅ Increase initial wait
    try {
      const pageTitle = await page.title();
      console.log(`✅ Page opened - Title: ${pageTitle}`);
    } catch (e) {
      console.warn('⚠️ Could not get title (page may have redirected). Continuing...');
    }});

  // ====== STEP 2: Select Standard Team Build ======
  await allure.step('Select Standard Team Build', async () => {
    await page.waitForSelector('#std_team_up', { state: 'visible', timeout: 10000 });
    await page.locator('#std_team_up').scrollIntoViewIfNeeded();
    await page.click('#std_team_up');
    console.log('✅ Clicked "Standard Team Build"');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'step2-team-build.png', fullPage: true });
  });

  // ====== STEP 3: Select Single Template for Organization ======
  await allure.step('Select Single Template for Organization', async () => {
    await page.locator('text=Single Template for Organization').scrollIntoViewIfNeeded();
    await page.waitForSelector('#bgsinglecheck_s', { state: 'visible', timeout: 10000 });
    await page.click('#bgsinglecheck_s');
    console.log('✅ Clicked "Single Template for Organization"');
    await page.waitForTimeout(2000);
  });

   // ====== STEP 3.5: Stabilize page after template selection ======
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(3000); // Extra buffer
  // ====== STEP 4: Select template ======
   await allure.step('Select template from dropdown', async () => {
    // Directly scroll the select element into view
    await page.locator('#bcktemplete').first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    
    await page.waitForSelector('#bcktemplete', { state: 'visible', timeout: 15000 });
    await page.selectOption('#bcktemplete', { value: '487' });
    console.log('✅ Selected template "487"');
    await page.waitForTimeout(2000);
  });

  // ====== STEP 5: Attach extracted images ======
  await allure.step('Attach extracted images to access codes', async () => {
    await page.locator('text=Attach extracted images to access codes').scrollIntoViewIfNeeded();
    await page.waitForSelector('#extractedimages', { state: 'visible', timeout: 10000 });
    await page.click('#extractedimages');
    console.log('✅ Clicked "Attach extracted images"');
    await page.waitForTimeout(1000);

    await page.click('#extractedimagesI');
    console.log('✅ Clicked extracted images checkbox');
    await page.waitForTimeout(1000);
  });

  // ====== STEP 6: Full Length Centering ======
  await allure.step('Select Full Length Centering', async () => {
    await page.locator('text=Full Length Centering').scrollIntoViewIfNeeded();
    await page.waitForSelector('#cropimagesfull', { state: 'visible', timeout: 10000 });
    await page.click('#cropimagesfull');
    console.log('✅ Selected "Full Length Centering"');
    await page.waitForTimeout(1000);
  });

  // ====== STEP 7: PNG Team Add On ======
  await allure.step('Select PNG Team Add On', async () => {
    await page.locator('text=PNG Team Add On').scrollIntoViewIfNeeded();
    await page.waitForSelector('#png_team_add_on', { state: 'visible', timeout: 10000 });
    await page.click('#png_team_add_on');
    console.log('✅ Selected "PNG Team Add On"');
    await page.waitForTimeout(1000);
  });

  // ====== STEP 8: Team Color ======
  await allure.step('Select Team Color', async () => {
    await page.locator('text=Unique color for each team in organization').scrollIntoViewIfNeeded();
    await page.waitForSelector('#teamcolorY', { state: 'visible', timeout: 10000 });
    await page.click('#teamcolorY');
    console.log('✅ Selected "Team Color" (Y)');
    await page.waitForTimeout(1000);
  });

  // ====== STEP 9: Color Correction ======
  await allure.step('Select Color Correction', async () => {
    await page.locator('text=Color Correction').scrollIntoViewIfNeeded();
    await page.waitForSelector('#ccservices', { state: 'visible', timeout: 10000 });
    await page.click('#ccservices');
    console.log('✅ Selected "Color Correction"');
    await page.waitForTimeout(1000);
  });

  // ====== STEP 10: Apply Discount Code ======
  await allure.step('Apply discount code', async () => {
    await page.locator('#discount_code').scrollIntoViewIfNeeded();
    await page.fill('#discount_code', '100OFF');
    console.log('✅ Entered discount code: 100OFF');
    await page.waitForTimeout(500);

    await page.click('#Redeem');
    console.log('✅ Clicked Redeem');
    await page.waitForTimeout(3000);
  });

  // ====== STEP 11: Click Pay Now ======
  await allure.step('Click Pay Now to complete order', async () => {
    await page.locator('#btnpaynow').scrollIntoViewIfNeeded();
    await page.click('#btnpaynow');
    console.log('✅ Clicked "Pay Now"');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'step11-after-pay-now.png', fullPage: true });
  });

  // ====== STEP 12: Wait for order confirmation ======
  await allure.step('Wait for order confirmation page', async () => {
    console.log('⏳ Waiting for confirmation page...');
    
    // Try multiple confirmation indicators
    try {
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    } catch (e) {
      console.warn('⚠️ Network idle timeout - continuing anyway');
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'step12-confirmation.png', fullPage: true });
    
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    const pageContent = await page.content();
    
    if (pageContent.includes('success') || pageContent.includes('Thank you') || pageContent.includes('confirmation')) {
      console.log('✅ Confirmation indicators found on page');
    }
  });

  // ====== STEP 13: Extract NextGen Job Number (jobno) ======
  let nextgenJobNo = null;
  await allure.step('Extract NextGen job number from confirmation', async () => {
    const currentUrl = page.url();
    console.log(`🔍 Searching for jobno in URL: ${currentUrl}`);

    // Pattern 1: Extract from URL query parameter (?jobno=XXXX)
    const urlMatch = currentUrl.match(/jobno[=?](\d+)/i);
    if (urlMatch) {
      nextgenJobNo = urlMatch[1];
      console.log(`✅ Extracted jobno from URL: ${nextgenJobNo}`);
    }

    // Pattern 2: Search page content for jobno
    if (!nextgenJobNo) {
      const pageContent = await page.content();
      const contentMatches = [
        pageContent.match(/jobno[=:\s"']*(\d+)/i),
        pageContent.match(/Job\s*No[:\s"']*#?(\d+)/i),
        pageContent.match(/Order\s*ID[:\s"']*#?(\d+)/i),
      ];

      for (const match of contentMatches) {
        if (match && match[1]) {
          nextgenJobNo = match[1];
          console.log(`✅ Extracted jobno from page content: ${nextgenJobNo}`);
          break;
        }
      }
    }

    if (!nextgenJobNo) {
      console.warn('⚠️ NextGen job number not found. Using original jobId for confirmation.');
      nextgenJobNo = jobId;
    }
  });

  // ====== STEP 14: Update generatedData.json with NextGen job number ======
  await allure.step('Update generatedData.json with NextGen job number', async () => {
    const updated = {
      ...generatedData,
      nextgen_job_id: nextgenJobNo,
      nextgenJob: nextgenJobNo,
      orderCompleted: true,
      completedAt: new Date().toISOString()
    };
    fs.writeFileSync(GENERATED_FILE, JSON.stringify(updated, null, 2));
    console.log(`✅ Updated generatedData.json with nextgen_job_id: ${nextgenJobNo}`);
  });

  // ====== STEP 15: Call Confirm Image Transferred API ======
  await allure.step('Confirm images transferred via API', async () => {
    const confirmUrl = 'https://staging.production.nextgenphotosolutions.com/Gpservices/confirmimagetransferred';
    const confirmBody = {
      api_key: 'GP=Ha2xc0Rcc2less2=NG',
      job_id: nextgenJobNo,
      img_transferred: 'Y'
    };

    console.log(`📡 Calling Confirm API with Job ID: ${nextgenJobNo}`);
    console.log(`Request Body:`, JSON.stringify(confirmBody, null, 2));

    const resp = await page.request.post(confirmUrl, {
      headers: { 'Content-Type': 'application/json' },
      data: confirmBody
    });

    const json = await resp.json();
    console.log(`✅ Confirm API Response:`, JSON.stringify(json, null, 2));

    // Verify response
    expect(resp.ok()).toBeTruthy();
    
    if (json.code === 201) {
      console.log('✅ API returned code 201 (Checkout process initiated)');
    } else if (json.code === 200) {
      console.log('✅ API returned code 200 (Success)');
    }

    allure.attachment('Confirm API Response', JSON.stringify(json, null, 2), 'application/json');
  });

  // ====== FINAL SUMMARY ======
  console.log('\n✅ ========== FULL COMPOSITE ORDER TEST COMPLETED ==========');
  console.log(`📌 Original Job ID: ${jobId}`);
  console.log(`📌 NextGen Job ID: ${nextgenJobNo}`);
  console.log(`📌 Job Name: ${jobName}`);
  console.log(`🔗 Generated Link: ${generatedLink}`);
  console.log('✅ ===========================================================\n');
});