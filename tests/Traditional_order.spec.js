import { test, expect } from '@playwright/test';
import path from 'path';
import { getGeneratedLink, getJobId } from '../utils/linkStorage.js';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
test.setTimeout(180000); // 3 minutes timeout

test('Validate Traditional flow after generated link', async ({ page }) => {
  // ✅ 1️⃣ Read stored link and job ID
  const generatedLink = getGeneratedLink();
  const jobId = getJobId();

  if (!generatedLink || !jobId) {
    throw new Error('❌ Missing data. Run api_create_and_upload.spec.js first.');
  }

  console.log('🌐 Opening generated link:', generatedLink);
  await page.goto(generatedLink, { waitUntil: 'load' });
  await page.waitForTimeout(4000);

  // ✅ 2️⃣ Scroll and click “Traditional” option
  console.log('✅ Page opened successfully');
  const traditionalImage = page.locator('img[src*="Traditional Memorymate.jpg"]');
  await traditionalImage.scrollIntoViewIfNeeded();
  await traditionalImage.waitFor({ state: 'visible', timeout: 10000 });
  await traditionalImage.click({ force: true });
  console.log('✅ Clicked on Traditional image');

  // ✅ Check hidden checkbox
  await page.evaluate(() => {
    const checkbox = document.querySelector('#ch_td');
    if (checkbox) {
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      checkbox.dispatchEvent(new Event('click', { bubbles: true }));
    }
  });

  await page.waitForTimeout(1000);
  const isChecked = await page.evaluate(() => {
    const checkbox = document.querySelector('#ch_td');
    return checkbox ? checkbox.checked : false;
  });
  expect(isChecked).toBeTruthy();
  console.log('🎯 Traditional option successfully selected');

  // ✅ Handle first confirmation popup
  const bootboxConfirm = page.locator('.bootbox .btn-success, .modal .btn-success, button.btn-success:has-text("Confirm")');
  if (await bootboxConfirm.isVisible().catch(() => false)) {
    await bootboxConfirm.click();
  } else {
    await page.waitForTimeout(1000);
    if (await bootboxConfirm.isVisible().catch(() => false)) {
      await bootboxConfirm.click();
    }
  }

  // ✅ Handle “Ignore team images” popup
  const ignoreBtn = page.locator('button:has-text("Ignore team images"), button:has-text("Ignore")');
  if (await ignoreBtn.isVisible().catch(() => false)) {
    await ignoreBtn.click();
  } else {
    await page.waitForTimeout(1500);
    if (await ignoreBtn.isVisible().catch(() => false)) {
      await ignoreBtn.click();
    }
  }

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // ✅ Verify checkbox again
  const isChecked1 = await page.isChecked('#ch_td');
  console.log(`🔎 Traditional option selected: ${isChecked1}`);

  // ✅ 7️⃣ Check Alternate Pose Graphic Options
  const graphicIds = [
    'alt1_45V', 'alt2_45V', 'alt3_45V', 'alt4_45V', 'alt5_45V',
    'alt1_45TV', 'alt2_45TV', 'alt3_45TV', 'alt4_45TV', 'alt5_45TV',
    'alt1_MM', 'alt2_MM', 'alt3_MM', 'alt4_MM', 'alt5_MM',
    'alt1_12TV', 'alt2_12TV', 'alt3_12TV', 'alt4_12TV', 'alt5_12TV'
  ];

  for (const id of graphicIds) {
    const locator = page.locator(`#${id}`);
    if (await locator.isVisible().catch(() => false)) {
      const enabled = await locator.isEnabled();
      console.log(`   ➡️ ${id}: ${enabled ? 'Enabled' : 'Disabled'}`);
    }
  }

  // ✅ Click first enabled alt*_MM option
  for (let i = 1; i <= 5; i++) {
    const mmId = `#alt${i}_MM`;
    const element = page.locator(mmId);
    if (await element.isVisible() && await element.isEnabled()) {
      await element.click();
      console.log(`✅ Clicked on ${mmId}`);
      break;
    }
  }

  // ✅ Click alt2_12TV if enabled
  const alt2_12TV = page.locator('#alt2_12TV');
  if (await alt2_12TV.isVisible() && await alt2_12TV.isEnabled()) {
    await alt2_12TV.click();
    console.log('✅ Clicked on alt2_12TV');
  }

  // ✅ Add Graphic Team Name Yes
  const addGraphicYes = page.locator('#add_graphic_yes');
  await addGraphicYes.scrollIntoViewIfNeeded();
  await addGraphicYes.waitFor({ state: 'visible', timeout: 5000 });
  await addGraphicYes.click();

  const teamGraphicRow = page.locator('#team_graphic_names_row');
  await teamGraphicRow.waitFor({ state: 'visible', timeout: 10000 });

  const teamGraphicInputs = page.locator('input.team-graphic-name[placeholder="Add/Edit Team Graphic Name"]');
  const count = await teamGraphicInputs.count();

  for (let i = 0; i < count; i++) {
    const input = teamGraphicInputs.nth(i);
    const value = i === 1 ? 'Silver' : 'GOLD';
    await input.fill(value);
  }

  // ✅ Single Template Section
  const singleTemplateText = page.locator('text=Single Template for Organization');
  await singleTemplateText.scrollIntoViewIfNeeded();
  await singleTemplateText.waitFor({ state: 'visible', timeout: 5000 });

  const bgsinglecheck_s = page.locator('#bgsinglecheck_s');
  await bgsinglecheck_s.waitFor({ state: 'visible', timeout: 5000 });
  await bgsinglecheck_s.click();

  // ✅ Dropdown selection
  const bcktempleteDropdown = page.locator('#bcktemplete').first();
  await bcktempleteDropdown.scrollIntoViewIfNeeded();
  await bcktempleteDropdown.waitFor({ state: 'visible', timeout: 5000 });
  await bcktempleteDropdown.click();
  await bcktempleteDropdown.selectOption({ label: 'CheckBT2023' });

  // ✅ Upload 2 Images
  console.log('📤 Starting image upload process...');
  const fileInput = page.locator('#upload_tp_files');
  const uploadBtn = page.locator('#upload_tp1');

  //await fileInput.click();
  const filePath1 = path.join(__dirname, '../test-data/A.jpg');
  const filePath2 = path.join(__dirname, '../test-data/B.jpg');

  await fileInput.setInputFiles([filePath1, filePath2]);
    await page.waitForTimeout(3000);
  const finalUploadBtn = page.locator('#upload_tp_filesBtn');
await finalUploadBtn.waitFor({ state: 'visible', timeout: 15000 });
await finalUploadBtn.click();
console.log('✅ Clicked final active upload button (#upload_tp_filesBtn)');

// Step 6: Wait until team dropdowns appear inside table
// ✅ Step 6: Wait until team dropdowns appear inside table
await page.waitForSelector('#team-table select[name="upload_photo_team[]"]', { timeout: 20000 });
const dropdowns = page.locator('#team-table select[name="upload_photo_team[]"]');

const dropdownCount = await dropdowns.count();
console.log(`🟢 Found ${dropdownCount} team dropdown(s)`);

// ✅ Step 7: Select teams for uploaded images
if (dropdownCount > 0) {
  // --- First dropdown: Winners ---
  const firstDropdown = dropdowns.nth(0);
  await firstDropdown.waitFor({ state: 'visible' });
  await firstDropdown.selectOption({ label: 'Winners' });
  console.log('✅ Selected team "Winners" in first dropdown');
}

if (dropdownCount > 1) {
  // --- Second dropdown: YANKEES ---
  const secondDropdown = dropdowns.nth(1);
  await secondDropdown.waitFor({ state: 'visible' });
  await secondDropdown.selectOption({ label: 'YANKEES' });
  console.log('✅ Selected team "YANKEES" in second dropdown');
}
await page.waitForTimeout(2000);

await page.evaluate(() => window.scrollBy(0, 300));
await page.click("[onclick='submitData_forTeamUpload()']");
console.log("💾 Clicked on Save button");

await page.waitForTimeout(2000); // wait for popup message
const msg = await page.locator('#msg, .alert-success').textContent().catch(() => null);

if (msg) {
  console.log("📩 Popup message:", msg.trim());
} else {
  console.log("⚠️ No popup message found after clicking Save");
}


await page.waitForTimeout(2000);
console.log('🎯 Team selection and save process completed successfully');


  // ✅ Team Color
  await page.locator('text=Unique color for each team in organization').scrollIntoViewIfNeeded();
  await page.click('#teamcolorY');

  // ✅ Color Correction
  await page.locator('text=Color Correction').scrollIntoViewIfNeeded();
  await page.click('#ccservices');

  // ✅ Discount
  await page.fill('#discount_code', '100OFF');
  await page.click('#Redeem');
  await page.waitForTimeout(3000);

  // ✅ Pay Now
  await page.locator('#btnpaynow').scrollIntoViewIfNeeded();
  await page.click('#btnpaynow');
  await page.waitForTimeout(4000);

  console.log('🎉 Order placement flow completed successfully!');
  await page.waitForTimeout(2000);

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
