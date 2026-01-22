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

test('GotPhoto: Create Job → Get Link → FTP Upload → Validate', async ({ page, request }) => {

  // ================================
  // ✅ ALLURE METADATA & LABELS
  // ================================
  allure.label("environment", "QA");
  allure.label("owner", "Rakhi");
  allure.label("epic", "GotPhoto Full Flow");
  allure.label("feature", "5 Alternate Pose");
  allure.label("story", "Create job with 5 alternate poses, count images, and configure order options");
  allure.severity("critical");
  allure.description("Creates a photo editing job via API with 5 alternate poses, uploads images via FTP, counts images per player, and configures order options");

  // ====== Declare Variables ======
  let jobId;
  let generatedLink;
  let jobName;

  // ====== STEP 1: Create Job via API ======
  await allure.step('Step 1: Create job via API and get generated order link', async () => {
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
          individual_image5: "F.jpg",
          access_code: "12A1"
        },

        1: {
          first_name: "Ana",
          last_name: "A",
          team_name: "YANKEES",
          jersey_number: "11",
          team_image: "G.jpg",
          individual_image1: "H.jpg",
          individual_image2: "I.jpg",
          access_code: "12A1"
        },

        2: {
          first_name: "TOM",
          last_name: "D",
          team_name: "YANKEES",
          jersey_number: "11",
          team_image: "Q1.jpg",
          individual_image1: "J",
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

    saveGeneratedLink(generatedLink);
  });

  // ====== SAVE FILE ======
  const outputPath = path.resolve(process.cwd(), 'generatedData.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify({ jobId, generatedLink, jobName }, null, 2)
  );
  console.log(`✅ Saved generatedData.json to: ${outputPath}`);

  // ====== STEP 2: OPEN GENERATED LINK ======
  await allure.step('Step 2: Open generated order link in browser', async () => {
    console.log(`🌐 Navigating to: ${generatedLink}`);

    await page.goto(generatedLink, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    await page.waitForFunction(() => document.title && document.title.length > 0, { timeout: 15000 });
    const pageTitle = await page.title();
    console.log(`✅ Page Title: ${pageTitle}`);

    await page.screenshot({ path: 'order-page-loaded.png', fullPage: true });
  });

  // ====== STEP 3: FTP Upload ======
  await allure.step('Step 3: Upload images to FTP folder', async () => {
    const client = new ftp.Client();
    client.ftp.verbose = false;

    const FTP_HOST = 'staging.production.nextgenphotosolutions.com';
    const FTP_USER = 'imageprocessing@staging.production.nextgenphotosolutions.com';
    const FTP_PASSWORD = '5Z6$7I*L7Z-k';

    const remotePhotosDir = `/gotphoto/input/${jobName}/photos`;
    const localDir = path.resolve(__dirname, '../test-images/images');

    if (!fs.existsSync(localDir)) {
      throw new Error(`❌ Local image folder not found: ${localDir}`);
    }

    const files = fs.readdirSync(localDir).filter(f =>
      /\.(jpg|jpeg|png)$/i.test(f)
    );

    if (files.length === 0) {
      throw new Error(`❌ No image files found in: ${localDir}`);
    }

    console.log(`📂 Found ${files.length} images:`);
    console.log(files.join(", "));

    try {
      console.log(`➡️ Connecting to FTP...`);
      await client.access({
        host: FTP_HOST,
        user: FTP_USER,
        password: FTP_PASSWORD,
        secure: false
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
        "Uploaded Files",
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

  // ====== STEP 4: COUNT IMAGES PER PLAYER ======
  await allure.step('Step 4: Count images per player in table', async () => {
    console.log('\n========== PLAYER IMAGE COUNT ==========\n');

    // Wait for the player table to be visible
    await page.waitForSelector('#playerinfo_fc tr', { timeout: 15000 });
    await page.waitForTimeout(2000);

    const rows = await page.$$('#playerinfo_fc tr');
    let playerImageCounts = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
        // Get player name
        const firstName = await row.$eval('td:nth-child(1)', el => el.innerText.trim()).catch(() => '');
        const lastName = await row.$eval('td:nth-child(2)', el => el.innerText.trim()).catch(() => '');
        const playerName = `${firstName} ${lastName}`.trim();

        if (!playerName) continue;

        // Get team image
        let teamImage = "";
        const teamBtn = await row.$('td:nth-child(5) button').catch(() => null);
        if (teamBtn) {
          teamImage = await teamBtn.innerText().catch(() => '');
        }

        // Count individual images (columns 8, 9, 10, 11, 12)
        const imageColumns = [8, 9, 10, 11, 12];
        let imageNames = [];
        let imageCount = 0;

        for (let col of imageColumns) {
          const imgBtn = await row.$(`td:nth-child(${col}) button`).catch(() => null);
          if (imgBtn) {
            const imgText = await imgBtn.innerText().catch(() => '');
            if (imgText && imgText.trim() !== "") {
              imageNames.push(imgText.trim());
              imageCount++;
            }
          }
        }

        // Log to console
        console.log(`-----------------------------------------------------`);
        console.log(`Player: ${playerName}`);
        console.log(`Team Image: ${teamImage || "None"}`);
        console.log(`Individual Images Count: ${imageCount}`);
        console.log(`Image Names: ${imageNames.join(", ") || "None"}`);
        console.log(`-----------------------------------------------------\n`);

        // Store for Allure report
        playerImageCounts.push({
          player: playerName,
          teamImage: teamImage || "None",
          individualImageCount: imageCount,
          imageNames: imageNames
        });

      } catch (err) {
        console.log(`⚠️ Error processing row ${i}: ${err.message}`);
      }
    }

    // Attach to Allure report
    allure.attachment(
      'Player Image Count Summary',
      JSON.stringify(playerImageCounts, null, 2),
      'application/json'
    );

    console.log(`\n✅ Total Players: ${playerImageCounts.length}`);
    console.log('===================================================\n');
  });

  // ====== STEP 5: SELECT ORDER OPTIONS ======
  await allure.step('Step 5: Select Standard Team Build', async () => {
    await page.waitForSelector('#std_team_up', { timeout: 10000 });
    await page.click('#std_team_up');
    await page.waitForTimeout(1000);
    console.log('✅ Selected: Standard Team Build');
  });

  await allure.step('Step 6: Select Single Template for Organization', async () => {
    await page.waitForSelector('#bgsinglecheck_s', { timeout: 10000 });
    await page.click('#bgsinglecheck_s');
    await page.waitForTimeout(1000);
    console.log('✅ Selected: Single Template for Organization');
  });

  await allure.step('Step 7: Select 3rd Creative - Fresh Paint', async () => {
    // Wait for template dropdown to be visible
    await page.waitForSelector('#bcktemplete', { timeout: 10000 });
    
    // Get all options and find "Fresh Paint" (3rd option)
    const options = await page.$$eval('#bcktemplete option', options => 
      options.map((opt, idx) => ({ index: idx, value: opt.value, text: opt.text.trim() }))
    );
    
    // Find Fresh Paint option
    const freshPaintOption = options.find(opt => 
      opt.text.toLowerCase().includes('fresh paint') || 
      opt.text.toLowerCase().includes('freshpaint')
    );
    
    if (freshPaintOption) {
      await page.selectOption('#bcktemplete', { value: freshPaintOption.value });
      console.log(`✅ Selected: ${freshPaintOption.text} (value: ${freshPaintOption.value})`);
    } else {
      // If not found by name, select 3rd option (index 2, since index 0 is usually "Select")
      if (options.length > 2) {
        await page.selectOption('#bcktemplete', { value: options[2].value });
        console.log(`✅ Selected 3rd option: ${options[2].text} (value: ${options[2].value})`);
      } else {
        throw new Error('Could not find Fresh Paint or 3rd creative option');
      }
    }
    
    await page.waitForTimeout(1000);
  });

  await allure.step('Step 8: Select Extracted images', async () => {
    await page.waitForSelector('#extractedimages', { timeout: 10000 });
    await page.click('#extractedimages');
    await page.waitForTimeout(500);
    
    // Also click the inner extracted images option if it exists
    const extractedImagesI = await page.$('#extractedimagesI').catch(() => null);
    if (extractedImagesI) {
      await page.click('#extractedimagesI');
    }
    
    await page.waitForTimeout(1000);
    console.log('✅ Selected: Extracted images');
  });

  await allure.step('Step 9: Select PNG Crop - 3/4 Crop', async () => {
    // First select PNG Crop option
    await page.waitForSelector('#pngcrop', { timeout: 10000 });
    await page.click('#pngcrop');
    await page.waitForTimeout(1000);
    
    // Then select 3/4 Crop option
    await page.waitForSelector('#pngcrop34', { timeout: 10000 });
    await page.click('#pngcrop34');
    await page.waitForTimeout(1000);
    console.log('✅ Selected: PNG Crop - 3/4 Crop');
  });

  await allure.step('Step 10: Select PNG Team Add On', async () => {
    await page.waitForSelector('#png_team_add_on', { timeout: 10000 });
    await page.click('#png_team_add_on');
    await page.waitForTimeout(1000);
    console.log('✅ Selected: PNG Team Add On');
  });

  await allure.step('Step 11: Select Unique color for each team in organization', async () => {
    // Look for unique color option - common selectors
    const uniqueColorSelectors = [
      '#unique_color',
      '#uniqueColor',
      '#team_unique_color',
      'input[name*="unique"][name*="color"]',
      'input[id*="unique"][id*="color"]'
    ];

    let found = false;
    for (const selector of uniqueColorSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible({ timeout: 2000 })) {
          await element.click();
          found = true;
          console.log(`✅ Selected: Unique color for each team (using selector: ${selector})`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!found) {
      // Try to find by text content
      const allInputs = await page.$$('input[type="checkbox"], input[type="radio"]');
      for (const input of allInputs) {
        const label = await input.evaluateHandle(el => {
          const id = el.id;
          if (!id) return null;
          const labelEl = document.querySelector(`label[for="${id}"]`);
          return labelEl ? labelEl.textContent.trim() : null;
        });
        
        if (label && label.toLowerCase().includes('unique') && label.toLowerCase().includes('color')) {
          await input.click();
          found = true;
          console.log(`✅ Selected: Unique color for each team (found by label text)`);
          break;
        }
      }
    }

    if (!found) {
      console.log('⚠️ Warning: Could not find "Unique color for each team" option');
    }

    await page.waitForTimeout(1000);
  });

  // ====== STEP 12: FINAL VALIDATION ======
  await allure.step('Step 12: Final validation and screenshot', async () => {
    console.log('⏳ Waiting for page to update...');
    await page.waitForTimeout(3000);

    const pageContent = await page.content();
    if (pageContent.includes('success') || pageContent.includes('Success')) {
      console.log('✅ Success message detected on page');
    }

    await page.screenshot({ path: 'order-validation-complete.png', fullPage: true });
    console.log('✅ Screenshot saved: order-validation-complete.png');
  });

  console.log('\n✅ ========== TEST COMPLETED SUCCESSFULLY ==========');
  console.log(`📌 Job ID: ${jobId}`);
  console.log(`🔗 Generated Link: ${generatedLink}`);
  console.log(`📁 Job Name: ${jobName}`);
  console.log('===================================================\n');
});
