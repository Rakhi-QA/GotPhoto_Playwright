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

test.setTimeout(300000); // 5 min timeout

test('Full Composite NO Team Move >> Place Order + FTP Upload + Confirm Image Transfer', async ({ page, request }) => {

  // ============================================================
  // ========== METADATA ========================================
  // ============================================================
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
          individual_image3: "G.jpg",
          individual_image4: "H.jpg",
          individual_image5: "I.jpg",
          individual_image6: "J.jpg",
          individual_image7: "K.jpg",
          individual_image8: "L.jpg",
          individual_image9: "M.jpg",
          individual_image10: "N.jpg",
          individual_image11: "O.jpg",
          individual_image12: "P.jpg",
          individual_image13: "Q.jpg",
          individual_image14: "R.jpg",
          individual_image15: "",
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

  // Save generated data
  fs.writeFileSync(GENERATED_FILE, JSON.stringify({ jobId, jobName, generatedLink }, null, 2));

  // ============================================================
  // ========== STEP 2: FTP UPLOAD IMAGES =======================
  // ============================================================

  await allure.step('Upload images to FTP input/photos', async () => {
    const client = new ftp.Client(30000);
    client.ftp.verbose = false;

    const FTP_HOST = 'staging.production.nextgenphotosolutions.com';
    const FTP_USER = 'imageprocessing@staging.production.nextgenphotosolutions.com';
    const FTP_PASSWORD = '5Z6$7I*L7Z-k';

    const remoteDir = `/gotphoto/input/${jobName}/photos`;
    const localDir = path.resolve(__dirname, '../test-images/images');

    const images = fs.readdirSync(localDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
    if (images.length === 0) throw new Error(`❌ No images found inside: ${localDir}`);

    try {
      await client.access({
        host: FTP_HOST,
        user: FTP_USER,
        password: FTP_PASSWORD,
        secure: false,
        secureOptions: { rejectUnauthorized: false }
      });

      await client.ensureDir(remoteDir);

      for (const img of images) {
        await client.uploadFrom(path.join(localDir, img), img);
        console.log(`✔ Uploaded: ${img}`);
      }

      console.log("🎉 FTP Upload Completed");

    } catch (err) {
      console.error("❌ FTP Error:", err.message);
      throw err;
    } finally {
      client.close();
    }
  });

  // ============================================================
  // ========== STEP 3: OPEN CHECKOUT LINK ======================
  // ============================================================

  await allure.step('Open generated checkout link', async () => {
    await page.goto(generatedLink, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#no_team_images_up', { state: 'visible', timeout: 20000 });
    await page.waitForTimeout(300);
  });

  // ============================================================
  // ========== STEP 4: CLICK NO TEAM IMAGES ====================
  // ============================================================

  await allure.step('Click No Team Images', async () => {
    await page.click('#no_team_images_up');
    await page.waitForTimeout(1000);
  });

  // ============================================================
  // ========== CLICK "Move Team Images To Individual Images" (if present) ====
  // ============================================================

  await allure.step('Click Move Team Images To Individual Images (id=moveTeamImages) if present', async () => {
    const moveBtn = page.locator('#moveTeamImages');
    try {
      await moveBtn.waitFor({ state: 'visible', timeout: 8000 });
      await moveBtn.scrollIntoViewIfNeeded();
      await moveBtn.click();
      console.log("✔ Clicked Move Team Images To Individual Images (#moveTeamImages)");
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log("ℹ #moveTeamImages not shown (expected in No Team / Ignore Team Image flow). Proceeding.");
    }
  });

  await page.waitForTimeout(1000);
  // ============================================================
  // ========== ORDER CONFIGURATION STEPS ========================
  // ============================================================

   /*await allure.step('Select Standard Team Build', async () => {
    await page.click('#std_team_up');
  });*/

 await allure.step('Select Single Template for Organization', async () => {
  await page.locator('#bgsinglecheck_s').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('#bgsinglecheck_s').scrollIntoViewIfNeeded();
  await page.click('#bgsinglecheck_s');
  await page.click('#bgsinglecheck_s');
  await page.waitForTimeout(3000);
});

await allure.step('Select Template', async () => {
  // Optional: expand Background Template section if collapsed
  const bgSection = page.locator('text=Background Template').first();
  if (await bgSection.isVisible({ timeout: 2000 }).catch(() => false)) {
    await bgSection.click();
    await page.waitForTimeout(1500);
  }
  const dropdown = page.locator('#bcktemplete').first();
  await dropdown.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await dropdown.waitFor({ state: 'visible', timeout: 25000 });
  await dropdown.selectOption({ value: '487' });
  await page.waitForTimeout(1500);
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
    await page.waitForTimeout(2000);
  });

  await allure.step('Click Pay Now', async () => {
    await page.click('#btnpaynow');
    await page.waitForTimeout(4000);
  });

  // ============================================================
  // ========== STEP 5: EXTRACT NEXTGEN JOB NUMBER ==============
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

  fs.writeFileSync(GENERATED_FILE, JSON.stringify({
    jobId,
    jobName,
    generatedLink,
    nextgen_job_id: nextgenJobNo,
    ftpUploaded: true,
    completedAt: new Date().toISOString()
  }, null, 2));

  // ============================================================
  // ========== STEP 6: CONFIRM IMAGE TRANSFER API ==============
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

    expect(resp.ok()).toBeTruthy();

    console.log("Confirm API Response:", await resp.json());
  });

  console.log("\n🎉 FULL FLOW COMPLETED SUCCESSFULLY 🎉\n");
});

