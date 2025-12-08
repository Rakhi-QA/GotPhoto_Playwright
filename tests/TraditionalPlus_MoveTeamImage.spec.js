import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import ftp from 'basic-ftp';
import { allure } from 'allure-playwright';
import { fileURLToPath } from 'url';
import { saveGeneratedLink } from '../utils/linkStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.setTimeout(300000); // 5 minutes timeout

test('Traditional Plus job >> Ignore Team Images ', async ({ page, request }) => {

  // ================================
  // ✅ METADATA
  // ================================
  allure.label("Environment", "QA");
  allure.label("Owner", "Rakhi");
  allure.label("Epic", "GotPhoto Full Flow");
  allure.severity("critical");

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
      firstname: "Rakhi",
      lastname: "Doijad",
      phone: "",
      country: "CA",
      api_key: "GP=Ha2xc0Rcc2less2=NG",
      job_name: jobName,
      alias_name: jobName,
      email_id: "rakhiqa@tiuconsulting.com",
      editing_request_id: "407",
      redirect_success_url: "https://gotphoto.com",
      players_detail: {
        0: {
          first_name: "rakesh",
          last_name: "pat",
          team_name: "YANKEES",
          jersey_number: "11",
          team_image: "A.jpg",
          individual_image1: "B.jpg",
          individual_image2: "C.jpg",
          individual_image3: "D.jpg",
          individual_image4: "E.jpg",
          
          access_code: "12A1"
        },

        1: {
          first_name: "Ana",
          last_name: "A",
          team_name: "YANKEES",
          jersey_number: "11",
          team_image: "L.jpg",
          individual_image1: "M.jpg",
          individual_image2: "N.jpg",
          access_code: "12A1"
        },

        2: {
          first_name: "TOM",
          last_name: "D",
          team_name: "Winners",
          jersey_number: "11",
          team_image: "P.jpg",
          individual_image1: "O.jpg",
          individual_image2: "",
          individual_image3: "",
          individual_image4: "",
          individual_image5: "",
          access_code: "12A7"
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
    try { saveGeneratedLink(generatedLink); } catch (e) { console.warn('saveGeneratedLink failed', e.message); }
  });

  // ====== SAVE FILE ======
  const outputPath = path.resolve(process.cwd(), 'generatedData.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify({ jobId, generatedLink, jobName }, null, 2)
  );
  console.log(`✅ Saved generatedData.json to: ${outputPath}`);

  // ====== STEP 2: OPEN GENERATED LINK ======
  await allure.step('Open generated order link in browser', async () => {
    console.log(`🌐 Navigating to: ${generatedLink}`);

    await page.goto(generatedLink, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // ensure page has title (page loaded)
    await page.waitForFunction(() => document.title && document.title.length > 0, { timeout: 15000 });
    const pageTitle = await page.title();
    console.log(`✅ Page Title: ${pageTitle}`);

    await page.screenshot({ path: 'order-page-loaded.png', fullPage: true });
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
        if (await locator.count() > 0) {
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

    // If nothing clickable, fail fast
    expect(clicked).toBeTruthy();

    // ===== POPUP 1: confirmation about changing data =====
    // Wait for common modal or text showing change warning and then click Confirm
    try {
      // generic modal detection
      await page.waitForSelector('text=Change - data you have entered may not be saved', { timeout: 12000 }).catch(() => {});
      // Try known button text variants
      const confirmButtons = ['button:has-text("Confirm")', 'button:has-text("confirm")', 'button:has-text("OK")', 'button:has-text("Yes")'];
      for (const b of confirmButtons) {
        if ((await page.locator(b).count()) > 0) {
          await page.locator(b).first().click();
          console.log('✔ Clicked Confirm on first popup');
          break;
        }
      }
    } catch (e) {
      console.warn('⚠ First popup confirm not found/clicked:', e.message);
    }

   // ===== POPUP 2: "You have images in the image5 column. Please Move Team Images." =====
try {
  // Wait for popup message from Bootbox
  await page.waitForSelector('text=You have images in the team column', { timeout: 12000 });

  // Look for "Move Team Images" button
  const moveBtn = page.locator('button:has-text("Move team images")');

  if (await moveBtn.count() > 0) {
    await moveBtn.first().click();
    console.log('✔ Clicked Move Team Images');
  } else {
    // Fallback click
    await page.click('text=Move team images', { timeout: 8000 });
    console.log('✔ Clicked Move Team Images (fallback)');
  }

} catch (e) {
  console.warn('⚠ Move Team Images popup not found or not clickable:', e.message);
}

await page.waitForTimeout(2000);

  });

  // ====== STEP 2C: SELECT BACKGROUND & TEMPLATE ======
  await allure.step('Select background and template', async () => {

    // click background single check
    await page.waitForSelector('#bgsinglecheck_s', { timeout: 20000 });
    await page.click('#bgsinglecheck_s');
    console.log("✔ Clicked Single Check background (#bgsinglecheck_s)");

    // select template (value 611)
    await page.waitForSelector('#bcktemplete', { timeout: 20000 });
    await page.selectOption('#bcktemplete', '611');
    console.log("✔ Selected template 611 (3rd Creative - Softball/Baseball)");

    await page.waitForTimeout(3000);
  });

  // ===========================
// 📌 Step: Upload TP Images
// ===========================

// Scroll to make file input visible
await page.evaluate(() => window.scrollBy(0, 300));

// Wait for upload section
await page.waitForSelector('#upload_tp_files', { timeout: 20000 });
console.log('📤 Starting image upload process...');

const fileInput = page.locator('#upload_tp_files');
const uploadBtn = page.locator('#upload_tp1');

// Image paths
const filePath1 = path.join(__dirname, '../test-data/A.jpg');
const filePath2 = path.join(__dirname, '../test-data/B.jpg');

// Upload images
await fileInput.setInputFiles([filePath1, filePath2]);
await page.waitForTimeout(3000);

// Click final upload button
const finalUploadBtn = page.locator('#upload_tp_filesBtn');
await finalUploadBtn.waitFor({ state: 'visible', timeout: 15000 });
await finalUploadBtn.click();
console.log('✅ Clicked final active upload button (#upload_tp_filesBtn)');

// ===========================
// 📌 Step: Select Team from Dropdowns
// ===========================
await page.waitForSelector('#team-table select[name="upload_photo_team[]"]', { timeout: 20000 });

const dropdowns = page.locator('#team-table select[name="upload_photo_team[]"]');
const dropdownCount = await dropdowns.count();
console.log(`🟢 Found ${dropdownCount} team dropdown(s)`);

// First dropdown → Winners
if (dropdownCount > 0) {
  await dropdowns.nth(0).selectOption({ label: 'Winners' });
  console.log('✅ Selected team "Winners" in first dropdown');
}

// Second dropdown → YANKEES
if (dropdownCount > 1) {
  await dropdowns.nth(1).selectOption({ label: 'YANKEES' });
  console.log('✅ Selected team "YANKEES" in second dropdown');
}

await page.waitForTimeout(2000);

// Save
await page.evaluate(() => window.scrollBy(0, 300));
await page.click("[onclick='submitData_forTeamUpload()']");
console.log("💾 Clicked on Save button");

// Read success message
await page.waitForTimeout(2000);
const msg = await page.locator('#msg, .alert-success').textContent().catch(() => null);
console.log("📨 Upload message:", msg);
await page.waitForTimeout(2000);
  // ====== STEP 2E: EXTRACTED IMAGES ======
  await allure.step('Attach extracted images', async () => {
    // scroll to text then click #extractedimages
    try {
      const textLocator = page.locator('text=Attach extracted images to access codes');
      if (await textLocator.count() > 0) {
        await textLocator.first().scrollIntoViewIfNeeded();
      }
      await page.waitForSelector('#extractedimages', { timeout: 10000 });
      await page.click('#extractedimages');
      console.log("✔ Clicked Extracted Images (#extractedimages)");
    } catch (e) {
      console.warn('⚠ Could not click #extractedimages:', e.message);
    }
    await page.waitForTimeout(1000);
  });

 // ====== STEP 2F: 3/4 CROP ======
await allure.step('Select 3/4 Crop', async () => {

  // Wait for element to be available
  await page.waitForSelector('#cropimageshalf', { timeout: 20000 });

  // Scroll slightly to avoid hidden element issue
  await page.evaluate(() => window.scrollBy(0, 200));

  // Click the 3/4 Crop checkbox / button
  await page.click('#cropimageshalf');

  console.log("✔ Selected 3/4 Crop (#cropimageshalf)");

  await page.waitForTimeout(1000);
});


  // ====== STEP 2G: TEAM COLOR SELECTION ======
  await allure.step('Select Team Color', async () => {
    try {
      await page.waitForSelector('#teamcolorY', { timeout: 10000 });
      await page.click('#teamcolorY');
      console.log("✔ Selected Team Color (#teamcolorY)");
    } catch (e) {
      console.warn('⚠ Could not click #teamcolorY:', e.message);
    }
    await page.waitForTimeout(1000);
  });

  // ====== STEP 2H: COLOR CORRECTION ======
  await allure.step('Enable Color Correction', async () => {
    try {
      const ccText = page.locator('text=Color Correction');
      if (await ccText.count() > 0) await ccText.first().scrollIntoViewIfNeeded();
      await page.waitForSelector('#ccservices', { timeout: 10000 });
      await page.click('#ccservices');
      console.log("✔ Clicked Color Correction (#ccservices)");
    } catch (e) {
      console.warn('⚠ Could not click #ccservices:', e.message);
    }
    await page.waitForTimeout(1000);
  });

  // ====== STEP 3: FTP Upload (send images to job folder) ======
  await allure.step('Upload images to FTP folder (input/photos)', async () => {
    const client = new ftp.Client(30000);
    client.ftp.verbose = true;

    const FTP_HOST = 'staging.production.nextgenphotosolutions.com';
    const FTP_USER = 'imageprocessing@staging.production.nextgenphotosolutions.com';
    const FTP_PASSWORD = '5Z6$7I*L7Z-k';

    const remotePhotosDir = `/gotphoto/input/${jobName}/photos`;
    const localDir = path.resolve(__dirname, '../test-images/images');

    if (!fs.existsSync(localDir)) {
      console.warn(`⚠ Local image folder not found at ${localDir}. Attempting to use other candidate folders.`);
      // try fallback folders
      const fallbackCandidates = [
        path.resolve(__dirname, '../test-images/tp-upload'),
        path.resolve(process.cwd(), 'test-images/images')
      ];
      let found = false;
      for (const c of fallbackCandidates) {
        if (fs.existsSync(c)) {
          found = true;
          console.log(`ℹ Falling back to ${c}`);
          const files = fs.readdirSync(c).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
          if (files.length === 0) continue;
          try {
            await client.access({ host: FTP_HOST, user: FTP_USER, password: FTP_PASSWORD, secure: false });
            await client.ensureDir(remotePhotosDir);
            for (const file of files) {
              await client.uploadFrom(path.join(c, file), file);
              console.log(`✔ Uploaded (fallback): ${file}`);
            }
            client.close();
            return;
          } catch (err) {
            client.close();
            console.warn('FTP fallback attempt failed:', err.message);
          }
        }
      }
      if (!found) {
        throw new Error(`❌ No local images folder found for FTP upload. Checked: ${localDir} and fallbacks.`);
      }
    }

    const files = fs.readdirSync(localDir).filter(f =>
      /\.(jpg|jpeg|png)$/i.test(f)
    );

    if (files.length === 0) {
      throw new Error(`❌ No image files found in: ${localDir}`);
    }

    console.log(`📂 Found ${files.length} images for FTP upload: ${files.join(", ")}`);

    try {
      console.log(`➡️ Connecting to FTP...`);
      await client.access({
        host: FTP_HOST,
        user: FTP_USER,
        password: FTP_PASSWORD,
        secure: false,
    secureOptions: { rejectUnauthorized: false }
      });

      console.log(`📁 Creating directory: ${remotePhotosDir}`);
      await client.ensureDir(remotePhotosDir);

      console.log(`⬆️ Uploading images...`);
      for (const file of files) {
        await client.uploadFrom(path.join(localDir, file), file);
        console.log(`✔ Uploaded: ${file}`);
      }

      console.log(`🎉 Upload complete! Total uploaded: ${files.length}`);

      allure.attachment(
        "Uploaded Files (FTP)",
        JSON.stringify(files, null, 2),
        "application/json"
      );

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
    if (pageContent.includes('success') || pageContent.includes('Success')) {
      console.log('✅ Upload success message detected on page');
    } else {
      console.log('ℹ No explicit success text found on page content — rely on downstream processing or UI states.');
    }

    await page.screenshot({ path: 'order-validation-complete.png', fullPage: true });
  });

 //// ====== STEP 5: PAYMENT FORM ENTRY & FINAL CHECKOUT ======
await allure.step('Enter Card Information and Checkout', async () => {

  // STEP A: Click "Enter Card Information Below" (id = cardinfo)
  try {
    await page.waitForSelector('#cardinfo', { timeout: 10000 });
    await page.click('#cardinfo');
    console.log("✔ Clicked 'Enter Card Information Below' (#cardinfo)");

    // wait for form to appear
    await page.waitForTimeout(1500);
  } catch (e) {
    console.warn("⚠ Could not click #cardinfo:", e.message);
  }


  // STEP B: Card Number
  try {
    await page.waitForSelector('#cardnumber1', { timeout: 10000 });
    await page.fill('#cardnumber1', '4669424246660779');
    console.log("✔ Entered card number");
  } catch (e) {
    console.warn("⚠ Card number field not found:", e.message);
  }

  // STEP C: Expiry Month
  try {
    await page.waitForSelector('#month1', { timeout: 10000 });
    await page.selectOption('#month1', '04');
    console.log("✔ Selected expiry month 04");
  } catch (e) {
    console.warn("⚠ Expiry month dropdown not found:", e.message);
  }

  // STEP D: Expiry Year
  try {
    await page.waitForSelector('#year1', { timeout: 10000 });
    await page.selectOption('#year1', '2026');
    console.log("✔ Selected expiry year 2026");
  } catch (e) {
    console.warn("⚠ Expiry year dropdown not found:", e.message);
  }

  // STEP E: CVV
  try {
    await page.waitForSelector('#cvv1', { timeout: 10000 });
    await page.fill('#cvv1', '111');
    console.log("✔ Entered CVV");
  } catch (e) {
    console.warn("⚠ CVV field not found:", e.message);
  }

  // STEP F: Name on card
  try {
    await page.waitForSelector('#name_on_card_first', { timeout: 10000 });
    await page.fill('#name_on_card_first', 'Rakhi');
    await page.fill('#name_on_card_last', 'Doijad');
    console.log("✔ Entered cardholder name");
  } catch (e) {
    console.warn("⚠ Name fields not found:", e.message);
  }


  // STEP G: Scroll to Checkout button and click
  try {
    await page.waitForSelector('#btnpaynow', { timeout: 15000 });
    await page.click('#btnpaynow');
    console.log("✔ Clicked Pay Now / Checkout (#btnpaynow)");
  } catch (e) {
    console.error("❌ Could not click the checkout button:", e.message);
    throw e;
  }

  // STEP H: Wait for redirect
  await page.waitForTimeout(7000);
  await page.screenshot({ path: 'after-click-paynow.png', fullPage: true });

  });



  console.log('\n✅ ========== TEST COMPLETED SUCCESSFULLY ==========');
  console.log(`📌 Job ID: ${jobId}`);
  console.log(`🔗 Generated Link: ${generatedLink}`);
  console.log(`📁 Job Name: ${jobName}`);
  console.log('===================================================\n');
});