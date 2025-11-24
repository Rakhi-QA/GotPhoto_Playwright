// ========================= IMPORTS =========================
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { allure } from 'allure-playwright';
import { fileURLToPath } from 'url';
import { saveGeneratedLink } from '../utils/linkStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.setTimeout(300000); // 5 minutes timeout

// ========================= CALCULATION FUNCTION =========================
/**
 * Calculate totals from the page elements
 */
async function calculateTotals(page) {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('💰 CALCULATING TOTALS');
    console.log('='.repeat(60));

    // Get all the elements by their IDs
    const showcropimageprice = await page.locator('#showcropimageprice').textContent() || '0';
    const showpngteamaddon = await page.locator('#showpngteamaddon').textContent() || '0';
    const teamcolory = await page.locator('#teamcolory').textContent() || '0';
    const setteamonly1 = await page.locator('#setteamonly1').textContent() || '0';
    const bundlesSubTotal1 = await page.locator('#bundlesSubTotal1').textContent() || '0';
    const bundle_AddinalTotal_amt_span = await page.locator('#bundle_AddinalTotal_amt_span').textContent() || '0';
    const showcc = await page.locator('#showcc').textContent() || '0';
    const subtotal1 = await page.locator('#subtotal1').textContent() || '0';
    const disctotl = await page.locator('#disctotl').textContent() || '0';
    const finaltotl = await page.locator('#finaltotl').textContent() || '0';

    // Parse values
    const crop = parseFloat(showcropimageprice.replace('$', '').trim()) || 0;
    const pngTeam = parseFloat(showpngteamaddon.replace('$', '').trim()) || 0;
    const teamColor = parseFloat(teamcolory.replace('$', '').trim()) || 0;
    const teamImages = parseFloat(setteamonly1.replace('$', '').trim()) || 0;
    const bundleSubtotal = parseFloat(bundlesSubTotal1.replace('$', '').trim()) || 0;
    const additionalGraphics = parseFloat(bundle_AddinalTotal_amt_span.replace('$', '').trim()) || 0;
    const colorCorrection = parseFloat(showcc.replace('$', '').trim()) || 0;
    const subtotal = parseFloat(subtotal1.replace('$', '').trim()) || 0;
    const discount = parseFloat(disctotl.replace('$', '').trim()) || 0;
    const finalTotal = parseFloat(finaltotl.replace('$', '').trim()) || 0;

    // Calculate the total
    const calculatedSubtotal = crop + pngTeam + teamColor + teamImages + bundleSubtotal + additionalGraphics + colorCorrection;
    const calculatedFinalTotal = calculatedSubtotal - discount;

    // Display breakdown
    console.log('\n📋 PRICE BREAKDOWN:');
    console.log('-'.repeat(60));
    console.log(`  PNG Crop Image Price        : $${crop.toFixed(2)}`);
    console.log(`  PNG Team Add On             : $${pngTeam.toFixed(2)}`);
    console.log(`  Unique Color for Each Team  : $${teamColor.toFixed(2)}`);
    console.log(`  Total Number of Team Images : $${teamImages.toFixed(2)}`);
    console.log(`  Bundle Subtotal             : $${bundleSubtotal.toFixed(2)}`);
    console.log(`  Additional Graphics        : $${additionalGraphics.toFixed(2)}`);
    console.log(`  Color Correction            : $${colorCorrection.toFixed(2)}`);
    console.log('-'.repeat(60));
    console.log(`  Calculated Subtotal         : $${calculatedSubtotal.toFixed(2)}`);
    console.log(`  Page Subtotal               : $${subtotal.toFixed(2)}`);
    console.log('-'.repeat(60));
    console.log(`  Discount                    : $${discount.toFixed(2)}`);
    console.log('-'.repeat(60));
    console.log(`  Calculated Final Total      : $${calculatedFinalTotal.toFixed(2)}`);
    console.log(`  Page Final Total            : $${finalTotal.toFixed(2)}`);

    // Compare totals
    if (calculatedFinalTotal.toFixed(2) === finalTotal.toFixed(2)) {
      console.log('✅ Final totals match!');
    } else {
      console.log('⚠️ Final totals do NOT match!');
    }

  } catch (error) {
    console.error('Error calculating totals:', error);
  }
}

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
  // STEP 3B: LIST IMAGE NAMES + BUNDLE LOGIC
  // ========================================================================
  await allure.step('List image names + bundle calculation', async () => {

    const rows = await page.$$('#playerinfo_fc tr');

    console.log(`\n===== PLAYER IMAGE DETAILS (${rows.length} players) =====\n`);

    for (let i = 0; i < rows.length; i++) {

      const row = rows[i];

      const firstName = await row.$eval('td:nth-child(1)', el => el.innerText.trim());
      const lastName = await row.$eval('td:nth-child(2)', el => el.innerText.trim());

      let teamImage = "";
      const teamBtn = await row.$('td:nth-child(5) button');
      if (teamBtn) teamImage = await teamBtn.innerText();

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

      let bundleSymbol = "";
      if (imageCount === 1) bundleSymbol = "S";
      else if (imageCount === 2) bundleSymbol = "R";
      else if (imageCount >= 3) bundleSymbol = "L";
      else bundleSymbol = "No Images";

      console.log("-----------------------------------------------------");
      console.log(`Player: ${firstName} ${lastName}`);
      console.log(`Team Image: ${teamImage || "None"}`);
      console.log(`Images (${imageCount}): ${imageNames.join(", ") || "None"}`);
      console.log(`Bundle Symbol (Calculated): ${bundleSymbol}`);
      console.log("-----------------------------------------------------\n");
    }
  });

  // ========================================================================
  // STEP 4: FINAL VALIDATION
  // ========================================================================
  await allure.step('Final validation screenshot', async () => {
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'order-validation-complete.png', fullPage: true });
  });

  // ========================================================================
  // STEP 5: CALCULATE AND PRINT TOTALS
  // ========================================================================
  await allure.step('Calculate and print totals', async () => {
    await calculateTotals(page);
  });
});