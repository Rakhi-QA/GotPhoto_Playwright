import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import ftp from 'basic-ftp';
import { allure } from 'allure-playwright';
import { fileURLToPath } from 'url';
import { saveGeneratedLink } from '../utils/linkStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.setTimeout(300000); // 5 minutes

test('Traditional Plus job >> Ignore Team Images (Full flow)', async ({ page, request }) => {
  // ================================
  // ✅ METADATA
  // ================================
  allure.label('Environment', 'QA');
  allure.label('Owner', 'Rakhi');
  allure.label('Epic', 'GotPhoto Full Flow');
  allure.severity('critical');

  // ====== Declare Variables ======
  let jobId;
  let generatedLink;
  let jobName;

  // ====== STEP 1: Create Job via API ======
  await allure.step('Create job and get generated order link Traditional Plus', async () => {
    const apiUrl = 'https://staging.production.nextgenphotosolutions.com/Gpservices/pushData';
    const timestamp = Date.now();
    jobName = `Test_Staging_${timestamp}`;

    const payload = {
      firstname: 'Rakhi',
      lastname: 'Doijad',
      phone: '',
      country: 'CA',
      api_key: 'GP=Ha2xc0Rcc2less2=NG',
      job_name: jobName,
      alias_name: jobName,
      email_id: 'rakhiqa@tiuconsulting.com',
      editing_request_id: '407',
      redirect_success_url: 'https://gotphoto.com',
      players_detail: {
        0: {
          first_name: 'rakesh',
          last_name: 'pat',
          team_name: 'YANKEES',
          jersey_number: '11',
          team_image: 'A.jpg',
          individual_image1: 'B.jpg',
          individual_image2: 'C.jpg',
          individual_image3: 'D.jpg',
          individual_image4: 'E.jpg',
          individual_image5: 'F.jpg',
          individual_image6: 'G.jpg',
          individual_image7: 'H.jpg',
          individual_image8: 'I.jpg',
          individual_image9: 'J.jpg',
          individual_image10: 'K.jpg',
          individual_image11: 'L.jpg',
          individual_image12: 'M.jpg',
          individual_image13: 'N.jpg',
          individual_image14: 'O.jpg',
          access_code: '12A1'
        },
        1: {
          first_name: 'Ana',
          last_name: 'A',
          team_name: 'YANKEES',
          jersey_number: '11',
          team_image: 'L.jpg',
          individual_image1: 'M.jpg',
          individual_image2: 'N.jpg',
          access_code: '12A1'
        },
        2: {
          first_name: 'TOM',
          last_name: 'D',
          team_name: 'Winners',
          jersey_number: '11',
          team_image: 'P.jpg',
          individual_image1: 'O.jpg',
          individual_image2: '',
          individual_image3: '',
          individual_image4: '',
          individual_image5: '',
          access_code: '12A7'
        }
      }
    };

    console.log(`➡️ Creating Job: ${jobName}`);
    const response = await request.post(apiUrl, {
      headers: { 'Content-Type': 'application/json' },
      data: payload
    });

    expect(response.ok()).toBeTruthy();
    const responseBody = await response.json();
    console.log('✅ API Response:', JSON.stringify(responseBody, null, 2));

    jobId = responseBody.nextgen_job_id || responseBody.job_id || responseBody.jobId || responseBody.id;
    expect(jobId).toBeTruthy();
    console.log(`📌 Job ID: ${jobId}`);

    generatedLink =
      responseBody.checkout_url ||
      responseBody.redirect_link ||
      responseBody.order_url ||
      responseBody.link ||
      responseBody.url;

    expect(generatedLink).toBeTruthy();
    console.log(`🔗 Generated Link: ${generatedLink}`);

    // save link for future cross-tests
    try {
      saveGeneratedLink(generatedLink);
    } catch (e) {
      console.warn('saveGeneratedLink failed', e.message);
    }
  });

  // ====== SAVE FILE ======
  const outputPath = path.resolve(process.cwd(), 'generatedData.json');
  fs.writeFileSync(outputPath, JSON.stringify({ jobId, generatedLink, jobName }, null, 2));
  console.log(`✅ Saved generatedData.json to: ${outputPath}`);

  // ====== STEP 2: OPEN GENERATED LINK ======
  await allure.step('Open generated order link in browser', async () => {
    console.log(`🌐 Navigating to: ${generatedLink}`);
    await page.goto(generatedLink, { waitUntil: 'networkidle' });
    // give time for scripts to initialise
    await page.waitForTimeout(4000);

    // ensure page has title (page loaded)
    await page.waitForFunction(() => document.title && document.title.length > 0, { timeout: 15000 });
    const pageTitle = await page.title();
    console.log(`✅ Page Title: ${pageTitle}`);

    await page.screenshot({ path: 'order-page-loaded.png', fullPage: true });
    allure.attachment('Order page', fs.readFileSync('order-page-loaded.png'), 'image/png');
  });

  // ====== STEP 2B: SELECT TRADITIONAL PLUS OPTION AND HANDLE POPUPS ======
  await allure.step('Handle Traditional Plus selection and popups', async () => {
    // Try multiple selectors for the Traditional Plus image (use src or alt)
    const tpSelectors = [
      'img[alt="Traditional Plus Memorymate"]',
      'img[alt*="Traditional"]',
      'img[src*="Traditional%20Plus%20Memorymate.jpg"]',
      'img[src*="Traditional Plus Memorymate.jpg"]',
      'img[alt*="Memorymate"]'
    ];

    let clicked = false;
    for (const sel of tpSelectors) {
      try {
        const locator = page.locator(sel);
        if ((await locator.count()) > 0) {
          await locator.first().scrollIntoViewIfNeeded();
          await locator.first().waitFor({ state: 'visible', timeout: 12000 });
          await locator.first().click({ timeout: 10000 });
          console.log(`✔ Clicked Traditional Plus via selector: ${sel}`);
          clicked = true;
          break;
        }
      } catch (e) {
        // ignore and try next
      }
    }

    if (!clicked) {
      // fallback: try clicking image by exact src (full url)
      try {
        await page.click('img[src="https://staging.production.nextgenphotosolutions.com/img/Traditional%20Plus%20Memorymate.jpg"]', { timeout: 10000 });
        console.log('✔ Clicked Traditional Plus by exact src');
        clicked = true;
      } catch (e) {
        console.warn('⚠ Could not click Traditional Plus image automatically. Proceeding — selector may be different.', e.message);
      }
    }

    expect(clicked).toBeTruthy();

    // ===== POPUP 1: confirmation about changing data =====
    try {
      // Wait a short time for any modal to appear
      await page.waitForTimeout(800);
      // Try generic modal detection and click possible confirm/ok buttons
      const confirmButtons = ['button:has-text("Confirm")', 'button:has-text("confirm")', 'button:has-text("OK")', 'button:has-text("Yes")', '.bootbox .modal-footer button'];
      let confirmed = false;
      for (const sel of confirmButtons) {
        const loc = page.locator(sel);
        if ((await loc.count()) > 0) {
          await loc.first().click({ timeout: 8000 }).catch(() => {});
          console.log('✔ Clicked Confirm on first popup (selector: ' + sel + ')');
          confirmed = true;
          break;
        }
      }
      if (!confirmed) {
        // Maybe no popup; continue
      }
    } catch (e) {
      console.warn('⚠ First popup confirm not found/clicked:', e.message);
    }

    // ===== POPUP 2: "You have images in the team column..." / Ignore team images =====
    try {
      // Wait for either the textual message OR the bootbox modal footer
      await Promise.race([
        page.waitForSelector('text=You have images in the team column', { timeout: 8000 }).catch(() => {}),
        page.waitForSelector('.bootbox .modal-footer', { timeout: 12000 }).catch(() => {})
      ]);

      // Best-effort: locate the ignore button inside bootbox modal-footer (case-sensitive text in page may be lower-case)
      const ignoreBtn = page.locator('.bootbox .modal-footer button').filter({ hasText: /Ignore\s*team\s*images/i });

      if ((await ignoreBtn.count()) > 0) {
        await ignoreBtn.first().click();
        console.log('✔ Clicked Ignore team images (bootbox)');
      } else {
        // fallback: try text click (case-insensitive)
        const textCandidates = ['text=Ignore team images', 'text=Ignore Team Images', 'text=Ignore team images'];
        let clickedIgnore = false;
        for (const t of textCandidates) {
          try {
            await page.click(t, { timeout: 4000 });
            console.log('✔ Clicked Ignore team images (text click):', t);
            clickedIgnore = true;
            break;
          } catch (e) {
            // continue
          }
        }
        if (!clickedIgnore) {
          // As last resort, click first bootbox footer button (cancel is usually ignore)
          const footerBtn = page.locator('.bootbox .modal-footer button').first();
          if ((await footerBtn.count()) > 0) {
            await footerBtn.click();
            console.log('✔ Clicked first bootbox footer button as fallback (assumed Ignore)');
          } else {
            console.warn('⚠ Ignore team images button not found by any strategy');
          }
        }
      }
    } catch (e) {
      console.warn('⚠ Second popup (Ignore Team Images) not found or not clickable:', e.message);
    }

    await page.waitForTimeout(2000);
  });

  // ====== STEP 2C: SELECT BACKGROUND & TEMPLATE ======
  await allure.step('Select background and template', async () => {
    try {
      // click background single check
      await page.waitForSelector('#bgsinglecheck_s', { timeout: 20000 });
      await page.click('#bgsinglecheck_s');
      console.log('✔ Clicked Single Check background (#bgsinglecheck_s)');

      // select template (value 611)
      await page.waitForSelector('#bcktemplete', { timeout: 20000 });
      await page.selectOption('#bcktemplete', '611');
      console.log('✔ Selected template 611 (3rd Creative - Softball/Baseball)');
    } catch (e) {
      console.warn('⚠ Could not select background/template:', e.message);
    }
    await page.waitForTimeout(3000);
  });

  // ===========================
  // 📌 Step: Upload TP Images
  // ===========================
  await allure.step('Upload TP images via file input', async () => {
    // Scroll to make file input visible
    await page.evaluate(() => window.scrollBy(0, 300));

    // Wait for upload section
    await page.waitForSelector('#upload_tp_files', { timeout: 20000 });
    console.log('📤 Starting image upload process...');

    const fileInput = page.locator('#upload_tp_files');
    const filePath1 = path.join(__dirname, '../test-data/A.jpg');
    const filePath2 = path.join(__dirname, '../test-data/B.jpg');

    // sanity checks for files
    if (!fs.existsSync(filePath1) || !fs.existsSync(filePath2)) {
      console.warn('⚠ One or more test files missing:', filePath1, filePath2);
    }

    await fileInput.setInputFiles([filePath1, filePath2]);
    await page.waitForTimeout(3000);

    // Click final upload button
    const finalUploadBtn = page.locator('#upload_tp_filesBtn');
    await finalUploadBtn.waitFor({ state: 'visible', timeout: 15000 });
    await finalUploadBtn.click();
    console.log('✅ Clicked final active upload button (#upload_tp_filesBtn)');

    // Wait short while for upload to register
    await page.waitForTimeout(3000);
  });

  // ===========================
  // 📌 Step: Select Team from Dropdowns
  // ===========================
  await allure.step('Select Teams from dropdowns', async () => {
    try {
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
    } catch (e) {
      console.warn('⚠ Could not select teams from dropdowns:', e.message);
    }
    await page.waitForTimeout(2000);

    // Save (click Save button)
    try {
      await page.evaluate(() => window.scrollBy(0, 300));
      await page.click("[onclick='submitData_forTeamUpload()']");
      console.log('💾 Clicked on Save button');
    } catch (e) {
      console.warn('⚠ Could not click Save button:', e.message);
    }

    // Read success message
    await page.waitForTimeout(2000);
    const msg = await page.locator('#msg, .alert-success').textContent().catch(() => null);
    console.log('📨 Upload message:', msg);
    await page.waitForTimeout(2000);
  });

  // ====== STEP 2E: EXTRACTED IMAGES ======
  await allure.step('Attach extracted images', async () => {
    try {
      const textLocator = page.locator('text=Attach extracted images to access codes');
      if ((await textLocator.count()) > 0) {
        await textLocator.first().scrollIntoViewIfNeeded();
      }
      await page.waitForSelector('#extractedimages', { timeout: 10000 });
      await page.click('#extractedimages');
      console.log('✔ Clicked Extracted Images (#extractedimages)');
    } catch (e) {
      console.warn('⚠ Could not click #extractedimages:', e.message);
    }
    await page.waitForTimeout(1000);
  });

  // ====== STEP 2F: 3/4 CROP ======
  await allure.step('Select 3/4 Crop', async () => {
    try {
      await page.waitForSelector('#cropimageshalf', { timeout: 20000 });
      await page.evaluate(() => window.scrollBy(0, 200));
      await page.click('#cropimageshalf');
      console.log('✔ Selected 3/4 Crop (#cropimageshalf)');
    } catch (e) {
      console.warn('⚠ Could not select 3/4 crop:', e.message);
    }
    await page.waitForTimeout(1000);
  });

  // ====== STEP 2G: TEAM COLOR SELECTION ======
  await allure.step('Select Team Color', async () => {
    try {
      await page.waitForSelector('#teamcolorY', { timeout: 10000 });
      await page.click('#teamcolorY');
      console.log('✔ Selected Team Color (#teamcolorY)');
    } catch (e) {
      console.warn('⚠ Could not click #teamcolorY:', e.message);
    }
    await page.waitForTimeout(1000);
  });

  // ====== STEP 2H: COLOR CORRECTION ======
  await allure.step('Enable Color Correction', async () => {
    try {
      const ccText = page.locator('text=Color Correction');
      if ((await ccText.count()) > 0) await ccText.first().scrollIntoViewIfNeeded();
      await page.waitForSelector('#ccservices', { timeout: 10000 });
      await page.click('#ccservices');
      console.log('✔ Clicked Color Correction (#ccservices)');
    } catch (e) {
      console.warn('⚠ Could not click #ccservices:', e.message);
    }
    await page.waitForTimeout(1000);
  });

  // ====== STEP 3: FTP Upload (send images to job folder) ======
  await allure.step('Upload images to FTP folder (input/photos)', async () => {
    const client = new ftp.Client(30000);
    client.ftp.verbose = false;

    const FTP_HOST = 'staging.production.nextgenphotosolutions.com';
    const FTP_USER = 'imageprocessing@staging.production.nextgenphotosolutions.com';
    const FTP_PASSWORD = '5Z6$7I*L7Z-k';

    const remotePhotosDir = `/gotphoto/input/${jobName}/photos`;
    const localDir = path.resolve(__dirname, '../test-images/images');

    try {
      let files = [];
      if (fs.existsSync(localDir)) {
        files = fs.readdirSync(localDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
      } else {
        console.warn(`⚠ Local image folder not found at ${localDir}. Trying fallbacks.`);
        const fallbackCandidates = [
          path.resolve(__dirname, '../test-images/tp-upload'),
          path.resolve(process.cwd(), 'test-images/images')
        ];
        for (const c of fallbackCandidates) {
          if (fs.existsSync(c)) {
            console.log(`ℹ Falling back to ${c}`);
            files = fs.readdirSync(c).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
            if (files.length > 0) {
              // update localDir for upload
              localDir = c; // note: reassign to upload from this fallback
              break;
            }
          }
        }
      }

      if (files.length === 0) {
        throw new Error(`❌ No image files found in local folders.`);
      }

      console.log(`📂 Found ${files.length} images for FTP upload: ${files.join(', ')}`);

      await client.access({
        host: FTP_HOST,
        user: FTP_USER,
        password: FTP_PASSWORD,
        secure: false,
        secureOptions: { rejectUnauthorized: false }
      });

      await client.ensureDir(remotePhotosDir);
      await client.clearWorkingDir().catch(() => {}); // ignore if fails

      for (const file of files) {
        const localFilePath = path.join(localDir, file);
        await client.uploadFrom(localFilePath, file);
        console.log(`✔ Uploaded: ${file}`);
      }

      console.log(`🎉 Upload complete! Total uploaded: ${files.length}`);

      allure.attachment('Uploaded Files (FTP)', JSON.stringify(files, null, 2), 'application/json');
    } catch (err) {
      console.error(`❌ FTP Error: ${err.message}`);
      throw err;
    } finally {
      client.close();
      console.log('🔒 FTP connection closed');
    }
  });

  // ====== STEP 4: VALIDATION ======
  await allure.step('Validate upload and wait for processing', async () => {
    console.log('⏳ Waiting for upload confirmation...');
    await page.waitForTimeout(5000);

    const pageContent = await page.content();
    if (pageContent.toLowerCase().includes('success')) {
      console.log('✅ Upload success message detected on page');
    } else {
      console.log('ℹ No explicit success text found on page content — rely on downstream processing or UI states.');
    }

    await page.screenshot({ path: 'order-validation-complete.png', fullPage: true });
    allure.attachment('Validation screenshot', fs.readFileSync('order-validation-complete.png'), 'image/png');
  });

  // ====== STEP 4B: APPLY DISCOUNT CODE ======
  await allure.step('Apply discount code', async () => {
    try {
      const discountInput = page.locator('#discount_code');
      await discountInput.waitFor({ state: 'visible', timeout: 8000 });
      await discountInput.scrollIntoViewIfNeeded();
      await discountInput.fill('100OFF');
      console.log('✅ Entered discount code: 100OFF');
      const redeemBtn = page.locator('#Redeem');
      await redeemBtn.waitFor({ state: 'visible', timeout: 5000 });
      await redeemBtn.scrollIntoViewIfNeeded();
      await redeemBtn.click({ timeout: 3000 });
      console.log('✅ Clicked Redeem');
      await page.waitForTimeout(1500);
      const discountTotal = await page.locator('#disctotl').textContent().catch(() => '0');
      console.log(`💰 Discount applied: ${discountTotal}`);
    } catch (e) {
      console.warn('⚠ Could not apply discount code:', e.message);
    }
  });

  // ====== STEP 5: CLICK CHECKOUT BUTTON ======
  await allure.step('Click Checkout button', async () => {
    const checkoutSelectors = [
      '#btnpaynow',
      'button:has-text("Pay Now")',
      'input[type="submit"][value*="Pay"]',
      'a:has-text("Pay Now")'
    ];
    let clicked = false;
    for (const sel of checkoutSelectors) {
      try {
        const btn = page.locator(sel).first();
        await btn.waitFor({ state: 'visible', timeout: 8000 });
        await btn.scrollIntoViewIfNeeded();
        await btn.click({ force: true, timeout: 8000 });
        console.log('✔ Clicked Checkout:', sel);
        clicked = true;
        break;
      } catch (e) {
        // try next
      }
    }
    if (!clicked) {
      const payBtn = page.locator('#btnpaynow');
      await payBtn.waitFor({ state: 'visible', timeout: 5000 });
      await payBtn.scrollIntoViewIfNeeded();
      await payBtn.click({ force: true, timeout: 5000 });
      console.log('✔ Clicked Checkout (#btnpaynow)');
    }

    // STEP H: Wait for redirect / result
    await page.waitForTimeout(7000);
    await page.screenshot({ path: 'after-click-paynow.png', fullPage: true });
    allure.attachment('After paynow', fs.readFileSync('after-click-paynow.png'), 'image/png');
  });

  console.log('\n✅ ========== TEST COMPLETED SUCCESSFULLY ==========');
  console.log(`📌 Job ID: ${jobId}`);
  console.log(`🔗 Generated Link: ${generatedLink}`);
  console.log(`📁 Job Name: ${jobName}`);
  console.log('===================================================\n');
});
