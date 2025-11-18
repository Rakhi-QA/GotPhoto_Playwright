// ========================= IMPORTS =========================
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

// ========================= MAIN TEST =========================

test('GotPhoto: Create Job → Get Link → Count Images → FTP Upload → Validate', async ({ page, request }) => {

  allure.label({ name: 'Environment', value: 'QA' });
  allure.label({ name: 'Executor', value: 'Rakhi' });

  let jobId;
  let generatedLink;
  let jobName;

  // ========================================================================
  // STEP 1: API CALL → CREATE JOB
  // ========================================================================
  await allure.step('Create job and get generated order link', async () => {

    const apiUrl = 'https://staging.production.nextgenphotosolutions.com/Gpservices/pushData';
    const timestamp = Date.now();
    jobName = `Test_Staging_${timestamp}`;

    const payload = {
      firstname: "Rakhi",
      lastname: "Doijad",
      country: "CA",
      api_key: "GP=Ha2xc0Rcc2less2=NG",
      job_name: jobName,
      alias_name: jobName,
      email_id: "rakhiqa@tiuconsulting.com",
      editing_request_id: "407",
      redirect_success_url: "https://gotphoto.com",
      players_detail: {
        0: { first_name: "rakesh", last_name: "pat", team_name: "YANKEES", jersey_number: "11", team_image: "A.jpg", individual_image1: "B.jpg", access_code: "12A1" },
        1: { first_name: "Ana", last_name: "A", team_name: "YANKEES", jersey_number: "11", team_image: "C.jpg", individual_image1: "D.jpg", individual_image2: "E.jpg", access_code: "12A1" },
        2: { first_name: "Tom", last_name: "D", team_name: "Gold", jersey_number: "22", team_image: "F.jpg", individual_image1: "G.jpg", individual_image2: "H.jpg",individual_image3: "I.jpg",individual_image4: "J.jpg", access_code: "12A1" },
     
    }
    };

    console.log(`➡️ Creating Job: ${jobName}`);

    const response = await request.post(apiUrl, {
      headers: { 'Content-Type': 'application/json' },
      data: payload
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    jobId = body.nextgen_job_id || body.job_id;
    generatedLink = body.checkout_url;

    console.log("Generated Link:", generatedLink);
    expect(generatedLink).toBeTruthy();

    saveGeneratedLink(generatedLink);
  });

  fs.writeFileSync('generatedData.json', JSON.stringify({ jobId, generatedLink, jobName }, null, 2));

  // ========================================================================
  // STEP 2: OPEN GENERATED LINK
  // ========================================================================
  await allure.step('Open generated order link in browser', async () => {
    await page.goto(generatedLink, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
  });

  // ========================================================================
  // ⭐ STEP 3: LIST IMAGE NAMES + COUNT + BUNDLE LOGIC ⭐
  // ========================================================================
  await allure.step('List image names + bundle calculation', async () => {

    const rows = await page.$$('#playerinfo_fc tr');

    console.log(`\n===== PLAYER IMAGE DETAILS (${rows.length} players) =====\n`);

    for (let i = 0; i < rows.length; i++) {

      const row = rows[i];

      // Get name
      const firstName = await row.$eval('td:nth-child(1)', el => el.innerText.trim());
      const lastName = await row.$eval('td:nth-child(2)', el => el.innerText.trim());

      // TEAM IMAGE
      let teamImage = "";
      const teamBtn = await row.$('td:nth-child(5) button');
      if (teamBtn) {
        teamImage = await teamBtn.innerText();
      }

      // INDIVIDUAL IMAGES → Image1 to Image5
      const imageColumns = [8, 9, 10, 11, 12];
      let imageNames = [];

      for (let col of imageColumns) {
        const imgBtn = await row.$(`td:nth-child(${col}) button`);
        if (imgBtn) {
          const imgText = await imgBtn.innerText();
          if (imgText.trim() !== "") imageNames.push(imgText.trim());
        }
      }

      // COUNT IMAGES
      const imageCount = imageNames.length;

      // BUNDLE SYMBOL LOGIC
      let bundleSymbol = "";
      if (imageCount === 1) bundleSymbol = "S";
      else if (imageCount === 2) bundleSymbol = "R";
      else if (imageCount >= 3) bundleSymbol = "L";
      else bundleSymbol = "No Images";

      // PRINT RESULTS
      console.log("-----------------------------------------------------");
      console.log(`Player: ${firstName} ${lastName}`);
      console.log(`Team Image: ${teamImage || "None"}`);
      console.log(`Images (${imageCount}): ${imageNames.join(", ") || "None"}`);
      console.log(`Bundle Symbol (Calculated): ${bundleSymbol}`);
      console.log("-----------------------------------------------------\n");
    }
  });

  // ========================================================================
  // STEP 4: FTP UPLOAD
  // ========================================================================
  await allure.step('Upload images to FTP folder', async () => {
    const client = new ftp.Client();
    client.ftp.verbose = true;

    const FTP_HOST = 'staging.production.nextgenphotosolutions.com';
    const FTP_USER = 'imageprocessing@staging.production.nextgenphotosolutions.com';
    const FTP_PASSWORD = '5Z6$7I*L7Z-k';

    const remotePath = `/gotphoto/input/${jobName}/photos`;

    const localDir = path.resolve(__dirname, '../test-images');
    if (!fs.existsSync(localDir)) throw new Error(`Missing folder: ${localDir}`);

    const files = fs.readdirSync(localDir).filter(f => /\.(jpg|png)$/i.test(f));

    try {
      await client.access({ host: FTP_HOST, user: FTP_USER, password: FTP_PASSWORD, secure: false });
      await client.ensureDir(remotePath);
      await client.cd(remotePath);

      for (const file of files) {
        await client.uploadFrom(path.join(localDir, file), file);
        await new Promise(r => setTimeout(r, 300));
      }

    } finally {
      client.close();
    }
  });

  // ========================================================================
  // STEP 5: FINAL VALIDATION
  // ========================================================================
  await allure.step('Final validation screenshot', async () => {
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'order-validation-complete.png', fullPage: true });
  });

});
