import { test, expect } from '@playwright/test';
import path from 'path';
import { getGeneratedLink, getJobId } from '../utils/linkStorage.js';
import { fileURLToPath } from 'url';
import { allure } from 'allure-playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.setTimeout(180000); // 3 minutes timeout

test.beforeEach(async () => {
  allure.label({ name: 'Environment', value: 'QA' });
  allure.label({ name: 'Executors', value: 'Rakhi' });
  allure.label({ name: 'Trend', value: 'Stable' });
});

test('Validate Traditional flow after generated link', async ({ page }) => {
  allure.epic('Traditional Flow');
  allure.story('Complete Order Placement Flow');

  // ✅ Validate prerequisite data exists
  const generatedLink = getGeneratedLink();
  const jobId = getJobId();
  expect(generatedLink).toBeTruthy();
  expect(jobId).toBeTruthy();

  console.log('🌐 Opening generated link:', generatedLink);
  await page.goto(generatedLink, { waitUntil: 'networkidle' });
  allure.step('Opened generated link');

  // ✅ Use reliable locator for Traditional option
  const traditionalImage = page.locator('img[alt="Traditional Memorymate"]');
  await traditionalImage.scrollIntoViewIfNeeded();
  await traditionalImage.waitFor({ state: 'visible', timeout: 10000 });
  await traditionalImage.click({ force: true });
  console.log('✅ Clicked on Traditional image');
  allure.step('Clicked Traditional image');

  // ✅ Check hidden checkbox with explicit wait
  const checkbox = page.locator('#ch_td');
  await checkbox.waitFor({ state: 'visible', timeout: 5000 });
  await checkbox.check();
  expect(await checkbox.isChecked()).toBeTruthy();
  console.log('🎯 Traditional option successfully selected');
  allure.step('Selected Traditional checkbox');

  // ✅ Handle confirmation popup with explicit wait
  const bootboxConfirm = page.locator('button:has-text("Confirm")');
  await bootboxConfirm.waitFor({ state: 'visible', timeout: 5000 });
  await bootboxConfirm.click();
  allure.step('Handled confirmation popup');

  // ✅ Handle "Ignore team images" popup
  const ignoreBtn = page.locator('button:has-text("Ignore")');
  await ignoreBtn.waitFor({ state: 'visible', timeout: 5000 });
  await ignoreBtn.click();
  allure.step('Handled Ignore team images popup');

  // ✅ Verify checkbox state
  expect(await checkbox.isChecked()).toBeTruthy();
  console.log('🔎 Traditional option selected');
  allure.step('Verified Traditional checkbox is selected');

  // ✅ Alternate Pose Graphic Options
  const graphicIds = [
    'alt1_45V', 'alt2_45V', 'alt3_45V', 'alt4_45V', 'alt5_45V',
    'alt1_45TV', 'alt2_45TV', 'alt3_45TV', 'alt4_45TV', 'alt5_45TV',
    'alt1_MM', 'alt2_MM', 'alt3_MM', 'alt4_MM', 'alt5_MM',
    'alt1_12TV', 'alt2_12TV', 'alt3_12TV', 'alt4_12TV', 'alt5_12TV'
  ];

  for (const id of graphicIds) {
    const locator = page.locator(`#${id}`);
    if (await locator.isVisible()) {
      const enabled = await locator.isEnabled();
      console.log(`   ➡️ ${id}: ${enabled ? 'Enabled' : 'Disabled'}`);
    }
  }
  allure.step('Checked all graphic options visibility');

  // ✅ Click first enabled alt*_MM option
  for (let i = 1; i <= 5; i++) {
    const mmId = `#alt${i}_MM`;
    const element = page.locator(mmId);
    if (await element.isVisible() && await element.isEnabled()) {
      await element.click();
      console.log(`✅ Clicked on ${mmId}`);
      allure.step(`Clicked on ${mmId}`);
      break;
    }
  }

  // ✅ Click alt2_12TV if enabled
  const alt2_12TV = page.locator('#alt2_12TV');
  if (await alt2_12TV.isVisible() && await alt2_12TV.isEnabled()) {
    await alt2_12TV.click();
    console.log('✅ Clicked on alt2_12TV');
    allure.step('Clicked alt2_12TV');
  }

  // ✅ Add Graphic Team Name Yes
  const addGraphicYes = page.locator('#add_graphic_yes');
  await addGraphicYes.scrollIntoViewIfNeeded();
  await addGraphicYes.waitFor({ state: 'visible', timeout: 5000 });
  await addGraphicYes.click();
  allure.step('Clicked Add Graphic Yes');

  const teamGraphicRow = page.locator('#team_graphic_names_row');
  await teamGraphicRow.waitFor({ state: 'visible', timeout: 10000 });

  const teamGraphicInputs = page.locator('input.team-graphic-name[placeholder="Add/Edit Team Graphic Name"]');
  const count = await teamGraphicInputs.count();

  for (let i = 0; i < count; i++) {
    const input = teamGraphicInputs.nth(i);
    const value = i === 1 ? 'Silver' : 'GOLD';
    await input.fill(value);
  }
  allure.step('Filled team graphic names');

  // ✅ Single Template Section
  const singleTemplateText = page.locator('text=Single Template for Organization');
  await singleTemplateText.scrollIntoViewIfNeeded();
  await singleTemplateText.waitFor({ state: 'visible', timeout: 5000 });

  const bgsinglecheck_s = page.locator('#bgsinglecheck_s');
  await bgsinglecheck_s.waitFor({ state: 'visible', timeout: 5000 });
  await bgsinglecheck_s.check();
  allure.step('Selected Single Template');

  const bcktempleteDropdown = page.locator('#bcktemplete').first();
  await bcktempleteDropdown.scrollIntoViewIfNeeded();
  await bcktempleteDropdown.waitFor({ state: 'visible', timeout: 5000 });
  await bcktempleteDropdown.selectOption({ label: 'CheckBT2023' });
  allure.step('Selected template from dropdown');

  // ✅ Upload 2 Images with validation
  console.log('📤 Starting image upload process...');
  const fileInput = page.locator('#upload_tp_files');
  await fileInput.waitFor({ state: 'visible', timeout: 10000 });
  const filePath1 = path.join(__dirname, '../test-data/A.jpg');
  const filePath2 = path.join(__dirname, '../test-data/B.jpg');
  await fileInput.setInputFiles([filePath1, filePath2]);

  const finalUploadBtn = page.locator('#upload_tp_filesBtn');
  await finalUploadBtn.waitFor({ state: 'enabled', timeout: 15000 });
  await finalUploadBtn.click();
  console.log('✅ Clicked final active upload button (#upload_tp_filesBtn)');
  allure.step('Uploaded images');

  // ✅ Select teams for uploaded images
  await page.waitForSelector('#team-table select[name="upload_photo_team[]"]', { timeout: 20000 });
  const dropdowns = page.locator('#team-table select[name="upload_photo_team[]"]');
  const dropdownCount = await dropdowns.count();
  console.log(`🟢 Found ${dropdownCount} team dropdown(s)`);

  if (dropdownCount > 0) {
    await dropdowns.nth(0).selectOption({ label: 'Winners' });
    console.log('✅ Selected team "Winners" in first dropdown');
  }
  if (dropdownCount > 1) {
    await dropdowns.nth(1).selectOption({ label: 'YANKEES' });
    console.log('✅ Selected team "YANKEES" in second dropdown');
  }
  allure.step('Selected teams for images');

  await page.evaluate(() => window.scrollBy(0, 300));
  await page.click("[onclick='submitData_forTeamUpload()']");
  console.log("💾 Clicked on Save button");
  allure.step('Clicked Save button after team selection');

  // ✅ Team Color, Color Correction, Discount, Pay Now
  await page.locator('#teamcolorY').check();
  await page.locator('#ccservices').check();
  await page.fill('#discount_code', '100OFF');
  await page.click('#Redeem');
  await page.locator('#btnpaynow').scrollIntoViewIfNeeded();
  await page.click('#btnpaynow');
  await page.waitForLoadState('networkidle');
  allure.step('Completed Color, Discount, Payment');

  // ✅ Confirm Image Transferred API
  try {
    const nextgenJobId = getJobId();
    expect(nextgenJobId).toBeTruthy();

    const confirmUrl = 'https://staging.production.nextgenphotosolutions.com/Gpservices/confirmimagetransferred';
    const confirmBody = {
      api_key: 'GP=Ha2xc0Rcc2less2=NG',
      job_id: nextgenJobId,
      img_transferred: 'Y'
    };

    const confirmResponse = await page.request.post(confirmUrl, {
      headers: { 'Content-Type': 'application/json' },
      data: confirmBody
    });

    expect(confirmResponse.status()).toBe(200);
    const resJson = await confirmResponse.json();
    console.log('✅ Confirm API Success:', resJson);
    allure.step('Confirm Image Transferred API Success');
  } catch (err) {
    console.error('❌ Error calling Confirm API:', err);
    allure.step('Confirm API Exception');
    throw err;
  }

  console.log('🎉 Order placement flow completed successfully!');
});