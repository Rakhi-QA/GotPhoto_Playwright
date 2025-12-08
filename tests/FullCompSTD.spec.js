import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { allure } from 'allure-playwright';
import { fileURLToPath } from 'url';
import { saveGeneratedLink } from '../utils/linkStorage.js';
import ftp from 'basic-ftp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GENERATED_FILE = path.resolve(process.cwd(), 'generatedData.json');

test.setTimeout(300000); // 5 minutes

test('Full Composite Standard >> Place Order + FTP Upload + Confirm Image Transferred', async ({ page, request }) => {

  // ====== METADATA ======
  allure.label("Environment", "QA");
  allure.label("Owner", "Rakhi");
  allure.label("Epic", "GotPhoto Full Flow");
  allure.severity("critical");

  let jobId, jobName, generatedLink;

  // ============================================================
  // ========== STEP 1: CREATE JOB VIA API ======================
  // ============================================================

  await allure.step('Create Full Composite job using API', async () => {
    const apiUrl = 'https://staging.production.nextgenphotosolutions.com/Gpservices/pushData';
    jobName = `Test_Staging_${Date.now()}`;

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
          first_name: "Tom",
          last_name: "Smith",
          team_name: "Lions",
          jersey_number: "7",
          team_image: "A.jpg",
          individual_image1: "B.jpg",
          individual_image2: "C.jpg",
          access_code: "T123"
        }
      }
    };

    const response = await request.post(apiUrl, {
      headers: { "Content-Type": "application/json" },
      data: payload
    });

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    console.log("API Response:", body);

    jobId = body.nextgen_job_id || body.job_id;
    generatedLink = body.checkout_url;

    expect(jobId).toBeTruthy();
    expect(generatedLink).toBeTruthy();

    saveGeneratedLink(generatedLink);
  });

  // ===== SAVE FILE =====
  fs.writeFileSync(GENERATED_FILE, JSON.stringify({ jobId, jobName, generatedLink }, null, 2));

  // ============================================================
  // ========== STEP 3: FTP Upload (input/photos) ===============
  // ============================================================

  await allure.step('Upload images to FTP folder (input/photos)', async () => {
    const client = new ftp.Client(30000);
    client.ftp.verbose = true;

    const FTP_HOST = 'staging.production.nextgenphotosolutions.com';
    const FTP_USER = 'imageprocessing@staging.production.nextgenphotosolutions.com';
    const FTP_PASSWORD = '5Z6$7I*L7Z-k';

    const remotePhotosDir = `/gotphoto/input/${jobName}/photos`;
    const localDir = path.resolve(__dirname, '../test-images/images');

    // Check main folder
    if (!fs.existsSync(localDir)) {
      console.warn(`⚠ Main image folder NOT found at ${localDir}. Trying fallback options...`);

      const fallbackCandidates = [
        path.resolve(__dirname, '../test-images/tp-upload'),
        path.resolve(process.cwd(), 'test-images/images')
      ];

      for (const folder of fallbackCandidates) {
        if (fs.existsSync(folder)) {
          console.log(`✔ Using fallback folder: ${folder}`);

          const files = fs.readdirSync(folder).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
          if (files.length === 0) continue;

          try {
            await client.access({
              host: FTP_HOST,
              user: FTP_USER,
              password: FTP_PASSWORD,
              secure: false,
              secureOptions: { rejectUnauthorized: false }
            });

            await client.ensureDir(remotePhotosDir);

            for (const file of files) {
              await client.uploadFrom(path.join(folder, file), file);
              console.log(`✔ Uploaded (fallback): ${file}`);
            }

            client.close();
            return;

          } catch (err) {
            console.log("⚠ Fallback FTP upload failed:", err.message);
            client.close();
          }
        }
      }

      throw new Error("❌ No valid local image folder found.");
    }

    // Main folder upload
    const files = fs.readdirSync(localDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));

    if (files.length === 0) {
      throw new Error(`❌ No images found in: ${localDir}`);
    }

    console.log(`📂 Found ${files.length} images. Starting FTP upload...`);

    try {
      await client.access({
        host: FTP_HOST,
        user: FTP_USER,
        password: FTP_PASSWORD,
        secure: false,
        secureOptions: { rejectUnauthorized: false }
      });

      await client.ensureDir(remotePhotosDir);

      for (const file of files) {
        await client.uploadFrom(path.join(localDir, file), file);
        console.log(`✔ Uploaded: ${file}`);
      }

      console.log(`🎉 FTP Upload Completed Successfully!`);

      allure.attachment(
        "FTP Uploaded Files",
        JSON.stringify(files, null, 2),
        "application/json"
      );

    } catch (err) {
      console.error(`❌ FTP Error: ${err.message}`);
      throw err;

    } finally {
      client.close();
      console.log("🔒 FTP Connection Closed");
    }
  });

  // ============================================================
  // ========== STEP 4: OPEN GENERATED LINK =====================
  // ============================================================

  await allure.step('Open generated checkout link', async () => {
    await page.goto(generatedLink, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
  });

  // ============================================================
  // ========== FULL COMPOSITE ORDER PROCESS ====================
  // ============================================================

  await allure.step('Select Standard Team Build', async () => {
    await page.click('#std_team_up');
  });

  await allure.step('Select Single Template for Organization', async () => {
    await page.click('#bgsinglecheck_s');
  });

  await allure.step('Select Template', async () => {
    await page.selectOption('#bcktemplete', { value: '487' });
  });

  await allure.step('Attach extracted images', async () => {
    await page.click('#extractedimages');
    await page.click('#extractedimagesI');
  });

  await allure.step('Select Full Length Centering', async () => {
    await page.click('#cropimagesfull');
  });

  await allure.step('Select PNG Team Add-On', async () => {
    await page.click('#png_team_add_on');
  });

  await allure.step('Select Team Color', async () => {
    await page.click('#teamcolorY');
  });

  await allure.step('Select Color Correction', async () => {
    await page.click('#ccservices');
  });

  await allure.step('Apply Discount', async () => {
    await page.fill('#discount_code', '100OFF');
    await page.click('#Redeem');
    await page.waitForTimeout(3000);
  });

  await allure.step('Click Pay Now', async () => {
    await page.click('#btnpaynow');
    await page.waitForTimeout(5000);
  });

  // ============================================================
  // ========== Extract NextGen Job No ==========================
  // ============================================================

  let nextgenJobNo = null;

  await allure.step('Extract NextGen Job Number', async () => {
    const html = await page.content();

    let match =
      page.url().match(/jobno=(\d+)/) ||
      html.match(/jobno[:="' ]+(\d+)/i) ||
      html.match(/Order\s*ID[: "'#]+(\d+)/i);

    nextgenJobNo = match ? match[1] : jobId;

    console.log("Extracted NextGen Job No:", nextgenJobNo);
  });

  // ====== Update generatedData.json ======
  await allure.step('Update generatedData.json', async () => {
    const updated = {
      jobId,
      jobName,
      generatedLink,
      nextgen_job_id: nextgenJobNo,
      ftpUploaded: true,
      completedAt: new Date().toISOString()
    };

    fs.writeFileSync(GENERATED_FILE, JSON.stringify(updated, null, 2));
  });

  // ============================================================
  // ========== Call confirmimagetransferred API ================
  // ============================================================

  await allure.step('Call confirmimagetransferred API', async () => {
    const confirmUrl = "https://staging.production.nextgenphotosolutions.com/Gpservices/confirmimagetransferred";

    const resp = await request.post(confirmUrl, {
      headers: { "Content-Type": "application/json" },
      data: {
        api_key: "GP=Ha2xc0Rcc2less2=NG",
        job_id: nextgenJobNo,
        img_transferred: "Y"
      }
    });

    const json = await resp.json();
    console.log("Confirm API Response:", json);

    expect(resp.ok()).toBeTruthy();
  });

  console.log("\n🎉 FULL FLOW COMPLETED: API Job + FTP + Order + Confirm Image Transfer 🎉\n");
});
