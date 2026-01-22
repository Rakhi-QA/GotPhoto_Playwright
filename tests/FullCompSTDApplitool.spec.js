import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { allure } from 'allure-playwright';
import { fileURLToPath } from 'url';
import { saveGeneratedLink } from '../utils/linkStorage.js';
import ftp from 'basic-ftp';

// ✅ Applitools imports
import { Eyes, ClassicRunner, Target } from '@applitools/eyes-playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GENERATED_FILE = path.resolve(process.cwd(), 'generatedData.json');

test.setTimeout(300000);

test('Full Composite Standard >> Place Order + FTP Upload + Confirm Image Transferred (With Applitools)', async ({ page, request }) => {

  // ====== ALLURE METADATA ======
  allure.label("Environment", "QA");
  allure.label("Owner", "Rakhi");
  allure.label("Epic", "GotPhoto Full Flow");
  allure.severity("critical");

  let jobId, jobName, generatedLink;

  // ================= APPLITOOLS SETUP =================
  const runner = new ClassicRunner();
  const eyes = new Eyes(runner);

  // ===================================================
  // STEP 1: CREATE JOB VIA API
  // ===================================================
  await allure.step('Create job using API', async () => {

    jobName = `Test_Staging_${Date.now()}`;

    const response = await request.post(
      'https://staging.production.nextgenphotosolutions.com/Gpservices/pushData',
      {
        headers: { "Content-Type": "application/json" },
        data: {
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
        }
      }
    );

    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    jobId = body.nextgen_job_id || body.job_id;
    generatedLink = body.checkout_url;

    expect(jobId).toBeTruthy();
    expect(generatedLink).toBeTruthy();

    saveGeneratedLink(generatedLink);
  });

  fs.writeFileSync(GENERATED_FILE, JSON.stringify({ jobId, jobName, generatedLink }, null, 2));

  // ===================================================
  // STEP 2: FTP UPLOAD
  // ===================================================
  await allure.step('Upload images to FTP', async () => {

    const client = new ftp.Client();
    const localDir = path.resolve(__dirname, '../test-images/images');
    const remoteDir = `/gotphoto/input/${jobName}/photos`;

    await client.access({
      host: 'staging.production.nextgenphotosolutions.com',
      user: 'imageprocessing@staging.production.nextgenphotosolutions.com',
      password: '5Z6$7I*L7Z-k',
      secure: false
    });

    await client.ensureDir(remoteDir);

    for (const file of fs.readdirSync(localDir)) {
      await client.uploadFrom(path.join(localDir, file), file);
    }

    client.close();
  });

  // ===================================================
  // STEP 3: OPEN CHECKOUT LINK + APPLITOOLS START
  // ===================================================
  await allure.step('Open checkout page', async () => {
    await page.goto(generatedLink, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
  });

  // 🔍 OPEN APPLITOOLS EYES
  await eyes.open(
    page,
    'NextGen GotPhoto',
    'Full Composite Checkout UI',
    { width: 1400, height: 900 }
  );

  // 📸 CHECK CHECKOUT PAGE UI
  await eyes.check(
    'Checkout Page UI',
    Target.window().fully()
  );

  // ===================================================
  // STEP 4: ORDER FLOW
  // ===================================================
  await page.click('#std_team_up');
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

  // 📸 CHECK CONFIRMATION PAGE UI
  await eyes.check(
    'Order Confirmation UI',
    Target.window().fully()
  );

  // ===================================================
  // STEP 5: EXTRACT JOB NUMBER
  // ===================================================
  let nextgenJobNo;
  const html = await page.content();
  const match = html.match(/jobno[:="' ]+(\d+)/i);
  nextgenJobNo = match ? match[1] : jobId;

  // ===================================================
  // STEP 6: CONFIRM IMAGE TRANSFER API
  // ===================================================
  await request.post(
    'https://staging.production.nextgenphotosolutions.com/Gpservices/confirmimagetransferred',
    {
      headers: { "Content-Type": "application/json" },
      data: {
        api_key: "GP=Ha2xc0Rcc2less2=NG",
        job_id: nextgenJobNo,
        img_transferred: "Y"
      }
    }
  );

  // ================= CLOSE APPLITOOLS =================
  await eyes.close();
  await runner.getAllTestResults();

  console.log("🎉 FULL FLOW WITH APPLITOOLS COMPLETED 🎉");
});
