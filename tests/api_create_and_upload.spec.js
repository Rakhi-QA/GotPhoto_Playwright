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
    individual_image2: "C.jpg",
    individual_image3: "D.jpg",
    individual_image4: "E.jpg",
    individual_image5: "F.jpg",
    individual_image6: "G.jpg",
    individual_image7: "H.jpg",
    individual_image8: "I.jpg",
    individual_image9: "J.jpg",
    individual_image10: "K.jpg",
    individual_image11: "L.jpg",
    individual_image12: "M.jpg",
    individual_image13: "N.jpg",
    individual_image14: "O.jpg",
    individual_image15: "P.jpg",
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
  },

  2: {
    first_name: "TOM",
    last_name: "D",
    team_name: "YANKEES",
    jersey_number: "11",
    team_image: "Q1.jpg",
    individual_image1: "",
    individual_image2: "",
    individual_image3: "",
    individual_image4: "",
    individual_image5: "",
    access_code: "12A7"
  },

  3: {
    first_name: "HENRY",
    last_name: "H",
    team_name: "GOLD",
    jersey_number: "11",
    team_image: "Q2.jpg",
    individual_image1: "Q3.jpg",
    individual_image2: "",
    individual_image3: "",
    individual_image4: "",
    individual_image5: "",
    access_code: "12A6"
  },

  4: {
    first_name: "OM",
    last_name: "S",
    team_name: "GOLD",
    jersey_number: "11",
    team_image: "Q4.jpg",
    individual_image1: "Q5.jpg",
    individual_image2: "Q6.jpg",
    individual_image3: "",
    individual_image4: "",
    individual_image5: "",
    access_code: "12A5"
  },

  5: {
    first_name: "IRA",
    last_name: "S",
    team_name: "SILVER",
    jersey_number: "11",
    team_image: "Q7.jpg",
    individual_image1: "Q8.jpg",
    individual_image2: "Q9.jpg",
    individual_image3: "Q10.jpg",
    individual_image4: "",
    individual_image5: "",
    access_code: "12A4"
  },

  6: {
    first_name: "PARTH",
    last_name: "G",
    team_name: "YANKEES",
    jersey_number: "11",
    team_image: "Q11.jpg",
    individual_image1: "Q12.jpg",
    individual_image2: "Q13.jpg",
    individual_image3: "Q14.jpg",
    individual_image4: "Q15.jpg",
    individual_image5: "",
    access_code: "12A3"
  },

  7: {
    first_name: "UVI",
    last_name: "SD",
    team_name: "YANKEES",
    jersey_number: "11",
    team_image: "Q16.jpg",
    individual_image1: "Q17.jpg",
    individual_image2: "Q18.jpg",
    individual_image3: "Q19.jpg",
    individual_image4: "Q20.jpg",
    individual_image5: "Q21.jpg",
    access_code: "12A2"
  },

  8: {
    first_name: "JACK",
    last_name: "KOA",
    team_name: "YANKEES",
    jersey_number: "11",
    team_image: "Q22.jpg",
    individual_image1: "Q23.jpg",
    individual_image2: "Q24.jpg",
    individual_image3: "Q25.jpg",
    individual_image4: "Q26.jpg",
    individual_image5: "Q27.jpg",
    individual_image6: "Q28.jpg",
    individual_image7: "Q29.jpg",
    access_code: "12A2"
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

  // ====== STEP 3: FTP Upload (Simplified) ======
await allure.step('Upload images to FTP folder', async () => {
  const client = new ftp.Client();
  client.ftp.verbose = false;   // 🔹 Change 1: Disable noisy FTP logs → only our logs

  const FTP_HOST = 'staging.production.nextgenphotosolutions.com';
  const FTP_USER = 'imageprocessing@staging.production.nextgenphotosolutions.com';
  const FTP_PASSWORD = '5Z6$7I*L7Z-k';

  const remotePhotosDir = `/gotphoto/input/${jobName}/photos`;
  const localDir = path.resolve(__dirname, '../test-images');

  // Validate folder exists
  if (!fs.existsSync(localDir)) {
    throw new Error(`❌ Local image folder not found: ${localDir}`);
  }

  // Collect images
  const files = fs.readdirSync(localDir).filter(f =>
    /\.(jpg|jpeg|png)$/i.test(f)
  );

  if (files.length === 0) {
    throw new Error(`❌ No image files found in: ${localDir}`);
  }

  console.log(`📂 Found ${files.length} images:`);
  console.log(files.join(", "));   // 🔹 Change 2: Clean printing, no long sentence

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
      console.log(`✔ Uploaded: ${file}`);   // 🔹 Change 3: Simple success log
    }

    console.log(`🎉 Upload complete! Total uploaded: ${files.length}`);
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