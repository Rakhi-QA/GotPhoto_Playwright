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

  allure.label({ name: 'Environment', value: 'QA' });
  allure.label({ name: 'Executor', value: 'Rakhi' });
  allure.label({ name: 'Trend', value: 'Stable' });

  // ====== Declare Variables Globally ======
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
          access_code: "12A1" 
        },
        1: { 
          first_name: "Ana", 
          last_name: "A", 
          team_name: "YANKEES", 
          jersey_number: "11", 
          team_image: "C.jpg", 
          individual_image1: "D.jpg", 
          individual_image2: "E.jpg", 
          access_code: "12A1" 
        }
      }
    };

    console.log(`➡️ Creating Job: ${jobName}`);

    const response = await request.post(apiUrl, {
      headers: { 'Content-Type': 'application/json' },
      data: payload
    });

    // ✅ Validate response
    expect(response.ok()).toBeTruthy();
    const responseBody = await response.json();
    console.log('✅ API Response:', JSON.stringify(responseBody, null, 2));

    // ✅ Extract jobId (handle different response keys)
   jobId = responseBody.nextgen_job_id || responseBody.job_id || responseBody.jobId || responseBody.id;
    expect(jobId).toBeTruthy();
    console.log(`📌 Job ID: ${jobId}`);

    // ✅ Extract generatedLink (handle different response keys)
    generatedLink = 
      responseBody.checkout_url ||
      responseBody.redirect_link ||
      responseBody.order_url ||
      responseBody.link ||
      responseBody.url;

    expect(generatedLink).toBeTruthy();
    console.log(`🔗 Generated Link: ${generatedLink}`);

    // ✅ Save link to utility for other tests
    saveGeneratedLink(generatedLink);
  });

  // ✅ SAVE jobId, generatedLink, jobName to file for downstream tests
  const outputPath = path.resolve(process.cwd(), 'generatedData.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify({ jobId, generatedLink, jobName }, null, 2)
  );
  console.log(`✅ Saved generatedData.json to: ${outputPath}`);

  // ====== STEP 2: Open the Generated Link ======
  await allure.step('Open generated order link in browser', async () => {
    console.log(`🌐 Navigating to: ${generatedLink}`);
    
    await page.goto(generatedLink, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // ✅ Wait for page to fully load
    await page.waitForFunction(() => document.title && document.title.length > 0, { timeout: 15000 });
    const pageTitle = await page.title();
    console.log(`✅ Page Title: ${pageTitle}`);
    
    // ✅ Take screenshot for debugging
    await page.screenshot({ path: 'order-page-loaded.png', fullPage: true });
    console.log('📸 Screenshot saved: order-page-loaded.png');
  });

  // ====== STEP 3: FTP Upload ======
  await allure.step('Upload images to FTP folder', async () => {
    const client = new ftp.Client();
    client.ftp.verbose = true;

    const FTP_HOST = 'staging.production.nextgenphotosolutions.com';
    const FTP_USER = 'imageprocessing@staging.production.nextgenphotosolutions.com';
    const FTP_PASSWORD = '5Z6$7I*L7Z-k';
    const FTP_SECURE = false;

    const remotePhotosDir = `/gotphoto/input/${jobName}/photos`;
    const localDir = path.resolve(__dirname, '../test-images');

    // ✅ Validate local directory exists
    if (!fs.existsSync(localDir)) {
      throw new Error(`❌ Local image folder not found: ${localDir}`);
    }

    // ✅ Get list of image files
    const files = fs.readdirSync(localDir).filter(f => /\.(jpg|png)$/i.test(f));
    if (files.length === 0) {
      throw new Error(`❌ No image files (.jpg, .png) found in: ${localDir}`);
    }

    console.log(`📂 Found ${files.length} images to upload: ${files.join(', ')}`);

    try {
      console.log(`➡️ Connecting to FTP: ${FTP_HOST}`);
      
      await client.access({
        host: FTP_HOST,
        user: FTP_USER,
        password: FTP_PASSWORD,
        secure: FTP_SECURE
      });

      console.log(`📁 Creating remote directory: ${remotePhotosDir}`);
      await client.ensureDir(remotePhotosDir);
      await client.cd(remotePhotosDir);

      // ✅ Upload each file
      for (const file of files) {
        const localPath = path.join(localDir, file);
        console.log(`⬆️ Uploading: ${file}`);
        
        await client.uploadFrom(localPath, file);
        await new Promise(r => setTimeout(r, 300)); // Delay between uploads
      }

      console.log(`🎉 FTP upload complete! Uploaded ${files.length} files.`);
      allure.attachment('Uploaded Files', JSON.stringify(files, null, 2), 'application/json');

    } catch (err) {
      console.error(`❌ FTP Error: ${err.message}`);
      throw err;
    } finally {
      client.close();
      console.log('🔒 FTP connection closed');
    }
  });

  // ====== STEP 4: Validate ======
  await allure.step('Validate upload and wait for processing', async () => {
    console.log('⏳ Waiting for upload confirmation...');
    await page.waitForTimeout(5000);
    
    // ✅ Optional: Add assertion for confirmation message on page
    const pageContent = await page.content();
    if (pageContent.includes('success') || pageContent.includes('Success')) {
      console.log('✅ Upload success message detected on page');
    }
    
    console.log('✅ Validation step completed');
    
    // ✅ Take final screenshot
    await page.screenshot({ path: 'order-validation-complete.png', fullPage: true });
  });

  console.log('\n✅ ========== TEST COMPLETED SUCCESSFULLY ==========');
  console.log(`📌 Job ID: ${jobId}`);
  console.log(`🔗 Generated Link: ${generatedLink}`);
  console.log(`📁 Job Name: ${jobName}`);
  console.log('✅ ==============================================\n');
});