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

test('Full Composite NO Team Ignore >> Place Order + FTP Upload + Confirm Image Transferred', async ({ page, request }) => {

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
        },
        1: {
          first_name: "Rakhi",
          last_name: "D",
          team_name: "Lions",
          jersey_number: "7",
          team_image: "D.jpg",
          individual_image1: "E.jpg",
          individual_image2: "F.jpg",
          individual_image3: "",
          individual_image4: "",
          individual_image5: "",
          
          access_code: "T124"
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

    const files = fs.readdirSync(localDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));

    if (files.length === 0) {
      throw new Error(`❌ No images found in: ${localDir}`);
    }

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
    } catch (err) {
      console.error(`❌ FTP Error: ${err.message}`);
      throw err;
    } finally {
      client.close();
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

  await allure.step('No Team Images', async () => {
    await page.click('#no_team_images_up');
  });

  // ============================================================
  // ========== POPUP HANDLING ADDED HERE =======================
  // ============================================================

  await allure.step('Handle Team Images Popup', async () => {
    try {
      await page.waitForSelector(
        'text=There are images present in the Image 5 column',
        { timeout: 15000 }
      );

      const ignoreBtn = page.locator('#ignoreTeamImages');

      if (await ignoreBtn.count() > 0) {
        console.log("✔ Popup detected: Clicking Ignore Team Images...");
        await ignoreBtn.click();
        await page.waitForTimeout(2000);
      } else {
        console.log("❌ Ignore button not found — continuing.");
      }

    } catch (err) {
      console.log("⚠ No popup displayed — continuing flow...");
    }
  });

  // ============================================================
  // ========== Continue Order Flow =============================
  // ============================================================

  await page.click('#bgsinglecheck_s');

  await page.selectOption('#bcktemplete', { value: '487' });

  await page.click('#extractedimages');
  await page.click('#extractedimagesI');

  await page.click('#cropimagesfull');
  await page.click('#png_team_add_on');
  await page.click('#teamcolorY');
  await page.click('#ccservices');

  await page.fill('#discount_code', '100OFF');
  await page.click('#Redeem');
  await page.waitForTimeout(3000);

  await page.click('#btnpaynow');
  await page.waitForTimeout(5000);

  // ============================================================
  // ========== Extract NextGen Job No ==========================
  // ============================================================

  let nextgenJobNo = jobId;

  await allure.step('Extract NextGen Job Number', async () => {
    const html = await page.content();

    let match =
      page.url().match(/jobno=(\d+)/) ||
      html.match(/jobno[:="' ]+(\d+)/i) ||
      html.match(/Order\s*ID[: "'#]+(\d+)/i);

    nextgenJobNo = match ? match[1] : jobId;

    console.log("Extracted NextGen Job No:", nextgenJobNo);
  });

  // Update JSON
  fs.writeFileSync(
    GENERATED_FILE,
    JSON.stringify(
      {
        jobId,
        jobName,
        generatedLink,
        nextgen_job_id: nextgenJobNo,
        ftpUploaded: true,
        completedAt: new Date().toISOString()
      },
      null,
      2
    )
  );

  // ============================================================
  // ========== CONFIRM IMAGE TRANSFER API ======================
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

  console.log("\n🎉 FULL FLOW COMPLETED SUCCESSFULLY 🎉\n");
});
