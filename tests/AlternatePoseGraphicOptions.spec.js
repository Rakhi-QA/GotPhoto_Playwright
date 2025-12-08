// ========================= IMPORTS =========================
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { allure } from 'allure-playwright';
import { fileURLToPath } from 'url';
import { saveGeneratedLink } from '../utils/linkStorage.js';
test.describe.configure({ mode: 'parallel' });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.setTimeout(300000); // 5 minutes timeout

// ========================= MAIN TEST =========================
test('GotPhoto: Create Job → Get Link → Count Images → Print Graphics → Validate', async ({ page, request }) => {

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
        2: { first_name: "Tom", last_name: "D", team_name: "Gold", jersey_number: "22", team_image: "F.jpg", individual_image1: "G.jpg", individual_image2: "H.jpg", individual_image3: "I.jpg", individual_image4: "J.jpg", access_code: "12A1" },
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
    await page.waitForTimeout(6000);
  });

  // ========================================================================
  // ⭐ STEP 3A: GRAPHICS (SELECTED / NOT SELECTED) EXTRACTION ⭐
  // ========================================================================
  await allure.step('Extract selected / not selected graphics from table', async () => {

    console.log("\n========== GRAPHICS SELECTION DETAILS ==========\n");

    const rows = await page.$$('#altPoseTbl tr');

    for (let i = 1; i < rows.length - 1; i++) {

      const row = rows[i];

      const graphicName = await row.$eval('td:first-child', el => el.innerText.trim());

      const checkboxes = await row.$$('input[type="checkbox"]');

      let selectedImages = [];
      let notSelectedImages = [];
      let disabledImages = [];

      for (let colIndex = 0; colIndex < checkboxes.length; colIndex++) {
        const checkbox = checkboxes[colIndex];

        const checked = await checkbox.isChecked();
        const disabled = await checkbox.isDisabled();
        const imageColumn = `Image${colIndex + 1}`;

        if (disabled) {
          disabledImages.push(imageColumn);
        } else if (checked) {
          selectedImages.push(imageColumn);
        } else {
          notSelectedImages.push(imageColumn);
        }
      }

      console.log(`\nGraphic: ${graphicName}`);
      console.log(`✔ Selected For: ${selectedImages.join(", ") || "None"}`);
      console.log(`✖ Not Selected For: ${notSelectedImages.join(", ") || "None"}`);
      console.log(`🚫 Disabled: ${disabledImages.join(", ") || "None"}`);
    }

    console.log("\n=================================================\n");
  });
// ========================================================================
// STEP 3B: LIST IMAGE NAMES + BUNDLE LOGIC + AMOUNTS
// ========================================================================
await allure.step('List image names + bundle calculation', async () => {

  const rows = await page.$$('#playerinfo_fc tr');

  console.log(`\n===== PLAYER IMAGE DETAILS (${rows.length} players) =====\n`);

  // For Allure: store complete results
  let allureData = [];

  for (let i = 0; i < rows.length; i++) {

    const row = rows[i];

    const firstName = await row.$eval('td:nth-child(1)', el => el.innerText.trim());
    const lastName = await row.$eval('td:nth-child(2)', el => el.innerText.trim());

    // TEAM IMAGE
    let teamImage = "";
    const teamBtn = await row.$('td:nth-child(5) button');
    if (teamBtn) teamImage = await teamBtn.innerText();

    // PLAYER IMAGES
    const imageColumns = [8, 9, 10, 11, 12];
    let imageNames = [];

    for (let col of imageColumns) {
      const imgBtn = await row.$(`td:nth-child(${col}) button`);
      if (imgBtn) {
        const imgText = await imgBtn.innerText();
        if (imgText.trim() !== "") imageNames.push(imgText.trim());
      }
    }

    const imageCount = imageNames.length;

    // =======================================================
    // NEW BUNDLE + PRICE LOGIC
    // =======================================================
    let bundleSymbol = "";
    let bundleAmount = "";

    if (imageCount === 1) {
      bundleSymbol = "S";
      bundleAmount = "$1.00";
    }
    else if (imageCount === 2) {
      bundleSymbol = "R";
      bundleAmount = "$1.80";
    }
    else if (imageCount >= 3 && imageCount <= 5) {
      bundleSymbol = "L";
      bundleAmount = "$3.50";
    }
    else if (imageCount >= 6 && imageCount <= 10) {
      bundleSymbol = "XL";
      bundleAmount = "$5.80";
    }
    else if (imageCount >= 11 && imageCount <= 15) {
      bundleSymbol = "UL";
      bundleAmount = "$8.10";
    }
    else {
      bundleSymbol = "No Images";
      bundleAmount = "$0.00";
    }

    // =======================================================
    // PRINT TO CONSOLE
    // =======================================================
    console.log("-----------------------------------------------------");
    console.log(`Player: ${firstName} ${lastName}`);
    console.log(`Team Image: ${teamImage || "None"}`);
    console.log(`Images (${imageCount}): ${imageNames.join(", ") || "None"}`);
    console.log(`Bundle Symbol: ${bundleSymbol}`);
    console.log(`Bundle Amount: ${bundleAmount}`);
    console.log("-----------------------------------------------------\n");

    // =======================================================
    // PUSH TO ALLURE REPORT DATA
    // =======================================================
    allureData.push({
      player: `${firstName} ${lastName}`,
      teamImage: teamImage || "None",
      imageCount,
      images: imageNames,
      bundleSymbol,
      bundleAmount
    });
  }

  // Attach complete bundle report to Allure
  allure.attachment(
    'Player Bundle Summary',
    JSON.stringify(allureData, null, 2),
    'application/json'
  );
});


  // ========================================================================
  // STEP 4: FINAL VALIDATION
  // ========================================================================
  await allure.step('Final validation screenshot', async () => {
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'order-validation-complete.png', fullPage: true });
  });

});
