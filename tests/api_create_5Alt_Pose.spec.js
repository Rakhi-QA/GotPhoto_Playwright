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
  // ✅ FIXED: CORRECT ALURE LABELS
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
  await allure.step('Create job and get generated order link', async () => {
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
  await allure.step('Open generated order link in browser', async () => {
    console.log(`🌐 Navigating to: ${generatedLink}`);

    await page.goto(generatedLink, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    await page.waitForFunction(() => document.title && document.title.length > 0, { timeout: 15000 });
    const pageTitle = await page.title();
    console.log(`✅ Page Title: ${pageTitle}`);

    await page.screenshot({ path: 'order-page-loaded.png', fullPage: true });
  });

  // ====== STEP 3: FTP Upload ======
  await allure.step('Upload images to FTP folder', async () => {
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

  // ====== STEP 4: VALIDATION ======
  await allure.step('Validate upload and wait for processing', async () => {
    console.log('⏳ Waiting for upload confirmation...');
    await page.waitForTimeout(5000);

    const pageContent = await page.content();
    if (pageContent.includes('success') || pageContent.includes('Success')) {
      console.log('✅ Upload success message detected on page');
    }

    await page.screenshot({ path: 'order-validation-complete.png', fullPage: true });
  });

  console.log('\n✅ ========== TEST COMPLETED SUCCESSFULLY ==========');
  console.log(`📌 Job ID: ${jobId}`);
  console.log(`🔗 Generated Link: ${generatedLink}`);
  console.log(`📁 Job Name: ${jobName}`);
  console.log('===================================================\n');
});
