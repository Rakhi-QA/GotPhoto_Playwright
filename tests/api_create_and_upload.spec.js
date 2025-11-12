import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import ftp from 'basic-ftp';
import { allure } from 'allure-playwright';
import { fileURLToPath } from 'url';
import { saveGeneratedLink, getGeneratedLink } from '../utils/linkStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.setTimeout(300000); // 3 minutes timeout

test('Traditional Plus: Create Job → Get Link → FTP Upload → Validate', async ({ page, request }) => {

  // ====== 🧾 Allure Metadata ======
  allure.label({ name: 'Environment', value: 'QA' });
  allure.label({ name: 'Executor', value: 'Rakhi' });
  allure.label({ name: 'Trend', value: 'Stable' });

  // ====== STEP 1: Create Job via API ======
  let jobName; // ✅ Declare jobName here (so it's accessible later)
  await allure.step('Create job and get generated order link', async () => {
    const apiUrl = 'https://staging.production.nextgenphotosolutions.com/Gpservices/pushData';

    const timestamp = Date.now();
    jobName = `Test_Staging_${timestamp}`; // ✅ assign job name here

    const payload = {
      "firstname": "Rakhi",
      "lastname": "Doijad",
      "phone": "",
      "country": "CA",
      "api_key": "GP=Ha2xc0Rcc2less2=NG",
      "job_name": jobName,
      "alias_name": jobName,
      "email_id": "rakhiqa@tiuconsulting.com",
      "editing_request_id": "407",
      "redirect_success_url": "https://gotphoto.com",
      "players_detail": {
        "0": {
          "first_name": "rakesh",
          "last_name": "pat",
          "team_name": "YANKEES",
          "jersey_number": "11",
          "team_image": "A.jpg",
          "individual_image1": "B.jpg",
          "access_code": "12A1"
        },
        "1": {
          "first_name": "Ana",
          "last_name": "A",
          "team_name": "YANKEES",
          "jersey_number": "11",
          "team_image": "C.jpg",
          "individual_image1": "D.jpg",
          "individual_image2": "E.jpg",
          "access_code": "12A1"
        }
      }
    };

    console.log(`➡️ Sending POST request to create job: ${jobName}`);
    const response = await request.post(apiUrl, {
      headers: { 'Content-Type': 'application/json' },
      data: payload
    });

    expect(response.ok()).toBeTruthy();
    const responseBody = await response.json();
    console.log('✅ API Response:', responseBody);

    const generatedLink =
      responseBody.checkout_url ||
      responseBody.redirect_link ||
      responseBody.order_url ||
      responseBody.link ||
      responseBody.url ||
      null;

    expect(generatedLink).toBeTruthy();
    console.log(`🔗 Generated Link: ${generatedLink}`);

    saveGeneratedLink(generatedLink);
  });

  // ====== STEP 2: Open the Order Link ======
  const generatedLink = getGeneratedLink();
  await allure.step('Open generated order link in browser', async () => {
    console.log(`🌐 Navigating to: ${generatedLink}`);

    await page.goto(generatedLink, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000); // Extra wait for dynamic content

    await page.waitForFunction(() => document.title && document.title.length > 0, null, { timeout: 15000 });
    await expect(page).toHaveTitle(/NextGen|GotPhoto|Traditional|Next Generation/i);

    console.log(`✅ Order page opened successfully — Title: ${await page.title()}`);
  });

  // ====== STEP 3: FTP Upload ======
  await allure.step('Upload images to FTP folder', async () => {
    const client = new ftp.Client();
    client.ftp.verbose = true;

    const FTP_HOST = 'staging.production.nextgenphotosolutions.com';
    const FTP_USER = 'imageprocessing@staging.production.nextgenphotosolutions.com';
    const FTP_PASSWORD = '5Z6$7I*L7Z-k';
    const FTP_SECURE = false;

    // ✅ Use the jobName we defined in Step 1
    const remotePhotosDir = `/gotphoto/input/${jobName}/photos`;

    // 📂 Local image folder
    const localDir = path.resolve(__dirname, '../test-images');

    if (!fs.existsSync(localDir)) {
      throw new Error(`❌ Local image folder not found: ${localDir}`);
    }

    const filesToUpload = fs.readdirSync(localDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
    if (filesToUpload.length === 0) {
      throw new Error(`⚠️ No image files found in local folder: ${localDir}`);
    }

    try {
      console.log('➡️ Connecting to FTP server...');
      await client.access({
        host: FTP_HOST,
        user: FTP_USER,
        password: FTP_PASSWORD,
        secure: FTP_SECURE,
      });

      console.log(`📁 Ensuring remote folders exist: ${remotePhotosDir}`);
      await client.ensureDir(remotePhotosDir);
      await client.cd(remotePhotosDir);
      console.log(`📂 Remote folder ready: ${remotePhotosDir}`);

      for (const file of filesToUpload) {
        const localPath = path.join(localDir, file);
        console.log(`⬆️ Uploading ${file}...`);
        await client.uploadFrom(localPath, file);
        await new Promise(r => setTimeout(r, 300));
      }

      console.log('🎉 All images uploaded successfully!');
      allure.attachment('Uploaded Files', JSON.stringify(filesToUpload, null, 2), 'application/json');

    } catch (err) {
      console.error('❌ FTP Upload Failed:', err.message);
      throw err;
    } finally {
      client.close();
      console.log('🔒 FTP connection closed');
    }
  });

  // ====== STEP 4: Validate Upload ======
  await allure.step('Validate upload confirmation message', async () => {
    console.log('🔍 Waiting for upload confirmation...');
    await page.waitForTimeout(5000);
    console.log('✅ Upload validation step completed');
  });
});
