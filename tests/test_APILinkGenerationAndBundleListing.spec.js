// ========================================================================
// gotphoto-order-flow.spec.js
// Full test: Create Job -> Open Link -> Bundle+Price Logic -> FTP Upload -> Validate
// ========================================================================
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import ftp from 'basic-ftp';
import { allure } from 'allure-playwright';
import { fileURLToPath } from 'url';
import { saveGeneratedLink } from '../utils/linkStorage.js';
test.describe.configure({ mode: 'parallel' });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.setTimeout(300000); // 5 minutes

test('GotPhoto - Create Job Link + Bundle Price + FTP Upload + Validation', async ({ page, request }) => {

  // ======================================================
  // ✅ ALLURE METADATA & LABELS
  // ======================================================
  allure.label("environment", "QA");
  allure.label("owner", "Rakhi");
  allure.label("epic", "GotPhoto Automation Framework");
  allure.label("feature", "End-to-End Order Workflow");
  allure.label("story", "Create Job → Print Player Images → Process Bundle → Upload Images → Validate");
  allure.severity("critical");
  allure.description("Creates a photo editing job via API, prints all player image data, calculates bundles, uploads images via FTP, and validates the complete workflow");





  // Global vars
  let jobId;
  let generatedLink;
  let jobName;
  let playersDetail; // Store players data for later use

  // ======================================================
  // STEP 1: API Job Creation
  // ======================================================
  await allure.step('Step 1: Create job via API and retrieve generated checkout link', async () => {
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
      players_detail: (playersDetail = {
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
        1: { first_name: "Ana", last_name: "A", team_name: "YANKEES", jersey_number: "11", team_image: "C.jpg", individual_image1: "D.jpg", individual_image2: "E.jpg", access_code: "12A1" },
        2: { first_name: "TOM", last_name: "D", team_name: "YANKEES", jersey_number: "11", team_image: "Q1.jpg", individual_image1: "", access_code: "12A7" },
        3: { first_name: "HENRY", last_name: "H", team_name: "GOLD", jersey_number: "11", team_image: "Q2.jpg", individual_image1: "Q3.jpg", access_code: "12A6" },
        4: { first_name: "OM", last_name: "S", team_name: "GOLD", jersey_number: "11", team_image: "Q4.jpg", individual_image1: "Q5.jpg", individual_image2: "Q6.jpg", access_code: "12A5" },
        5: { first_name: "IRA", last_name: "S", team_name: "SILVER", jersey_number: "11", team_image: "Q7.jpg", individual_image1: "Q8.jpg", individual_image2: "Q9.jpg", individual_image3: "Q10.jpg", access_code: "12A4" },
        6: { first_name: "PARTH", last_name: "G", team_name: "YANKEES", jersey_number: "11", team_image: "Q11.jpg", individual_image1: "Q12.jpg", individual_image2: "Q13.jpg", individual_image3: "Q14.jpg", individual_image4: "Q15.jpg", access_code: "12A3" },
        7: { first_name: "UVI", last_name: "SD", team_name: "YANKEES", jersey_number: "11", team_image: "Q16.jpg", individual_image1: "Q17.jpg", individual_image2: "Q18.jpg", individual_image3: "Q19.jpg", individual_image4: "Q20.jpg", individual_image5: "Q21.jpg", access_code: "12A2" },
        8: { first_name: "JACK", last_name: "KOA", team_name: "YANKEES", jersey_number: "11", team_image: "Q22.jpg", individual_image1: "Q23.jpg", individual_image2: "Q24.jpg", individual_image3: "Q25.jpg", individual_image4: "Q26.jpg", individual_image5: "Q27.jpg", individual_image6: "Q28.jpg", individual_image7: "Q29.jpg", access_code: "12A2" }
      })
    };

    console.log(`➡️ Creating Job: ${jobName}`);

    const response = await request.post(apiUrl, {
      headers: { 'Content-Type': 'application/json' },
      data: payload
    });

    expect(response.ok()).toBeTruthy();

    const responseBody = await response.json();
    console.log('✅ API Response:', JSON.stringify(responseBody, null, 2));
    allure.attachment('API Response', JSON.stringify(responseBody, null, 2), 'application/json');

    jobId = responseBody.nextgen_job_id || responseBody.job_id || responseBody.jobId || responseBody.id;
    expect(jobId).toBeTruthy();

    generatedLink =
      responseBody.checkout_url ||
      responseBody.redirect_link ||
      responseBody.order_url ||
      responseBody.link ||
      responseBody.url;

    expect(generatedLink).toBeTruthy();
    console.log(`🔗 Generated Link: ${generatedLink}`);

    saveGeneratedLink(generatedLink);
  });

  // ======================================================
  // STEP 2: Print Player Images Data from API Payload
  // ======================================================
  await allure.step('Step 2: Print all player images data from API payload', async () => {
    console.log('\n========== PLAYER IMAGES DATA (FROM API PAYLOAD) ==========\n');

    let playerImageData = [];

    for (const [playerIndex, player] of Object.entries(playersDetail)) {
      const playerName = `${player.first_name} ${player.last_name}`.trim();
      const teamImage = player.team_image || "None";
      
      // Collect all individual images
      const individualImages = [];
      for (let i = 1; i <= 15; i++) {
        const imageKey = `individual_image${i}`;
        if (player[imageKey] && player[imageKey].trim() !== "") {
          individualImages.push(player[imageKey]);
        }
      }

      const imageCount = individualImages.length;
      const totalImages = (teamImage !== "None" ? 1 : 0) + imageCount;

      // Calculate Bundle Code based on individual image count
      let bundleCode = "";
      if (imageCount === 1) {
        bundleCode = "S";
      } else if (imageCount === 2) {
        bundleCode = "R";
      } else if (imageCount >= 3 && imageCount <= 5) {
        bundleCode = "L";
      } else if (imageCount >= 6 && imageCount <= 10) {
        bundleCode = "XL";
      } else if (imageCount >= 11 && imageCount <= 15) {
        bundleCode = "UL";
      } else {
        bundleCode = "No Images";
      }

      // Print to console
      console.log("=====================================================");
      console.log(`Player #${playerIndex}: ${playerName}`);
      console.log(`Team Name: ${player.team_name}`);
      console.log(`Jersey Number: ${player.jersey_number}`);
      console.log(`Access Code: ${player.access_code}`);
      console.log(`Team Image: ${teamImage}`);
      console.log(`Individual Images Count: ${imageCount}`);
      console.log(`Individual Images: ${individualImages.length > 0 ? individualImages.join(", ") : "None"}`);
      console.log(`Total Images (Team + Individual): ${totalImages}`);
      console.log(`Bundle Code: ${bundleCode}`);
      console.log("=====================================================\n");

      // Store for Allure report
      playerImageData.push({
        playerIndex: parseInt(playerIndex),
        playerName,
        teamName: player.team_name,
        jerseyNumber: player.jersey_number,
        accessCode: player.access_code,
        teamImage,
        individualImages,
        individualImageCount: imageCount,
        totalImages,
        bundleCode
      });
    }

    // Attach to Allure report
    allure.attachment(
      'Player Images Data (From API Payload)',
      JSON.stringify(playerImageData, null, 2),
      'application/json'
    );

    console.log(`\n✅ Total Players: ${playerImageData.length}`);
    console.log('===================================================\n');
  });

  // Save job details for debugging
  const outputPath = path.resolve(process.cwd(), 'generatedData.json');
  fs.writeFileSync(outputPath, JSON.stringify({ jobId, generatedLink, jobName }, null, 2));
  console.log(`✅ Saved generatedData.json to: ${outputPath}`);

  // ======================================================
  // STEP 3: Open the Generated Link
  // ======================================================
  await allure.step('Step 3: Open generated order link in browser', async () => {
    console.log(`🌐 Opening URL: ${generatedLink}`);

    await page.goto(generatedLink, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    const title = await page.title();
    console.log(`📄 Page Loaded: ${title}`);

    await page.screenshot({ path: 'order-page-loaded.png', fullPage: true });
    allure.attachment('Order Page Screenshot', fs.readFileSync('order-page-loaded.png'), 'image/png');
  });

  // ======================================================
  // STEP 4: Extract Alternate Pose Graphic Options Selection
  // ======================================================
  await allure.step('Step 4: Extract Alternate Pose Graphic Options - Selected/Not Selected', async () => {
    console.log('\n========== ALTERNATE POSE GRAPHIC OPTIONS SELECTION ==========\n');

    // Wait for the graphics table to be visible
    await page.waitForSelector('#altPoseTbl', { timeout: 15000 }).catch(() => {
      console.log('⚠️ Alternate Pose Graphics table not found. Skipping graphics extraction.');
      return;
    });

    await page.waitForTimeout(2000);

    const rows = await page.$$('#altPoseTbl tr');
    let graphicsSelectionData = [];

    if (rows.length === 0) {
      console.log('⚠️ No graphics rows found in table.');
      return;
    }

    for (let i = 1; i < rows.length - 1; i++) {
      try {
        const row = rows[i];
        const graphicName = await row.$eval('td:first-child', el => el.innerText.trim()).catch(() => '');
        
        if (!graphicName) continue;

        const checkboxes = await row.$$('input[type="checkbox"]');
        
        let selectedImages = [];
        let notSelectedImages = [];
        let disabledImages = [];

        for (let colIndex = 0; colIndex < checkboxes.length; colIndex++) {
          const checkbox = checkboxes[colIndex];
          const checked = await checkbox.isChecked().catch(() => false);
          const disabled = await checkbox.isDisabled().catch(() => false);
          const imageColumn = `Image${colIndex + 1}`;

          if (disabled) {
            disabledImages.push(imageColumn);
          } else if (checked) {
            selectedImages.push(imageColumn);
          } else {
            notSelectedImages.push(imageColumn);
          }
        }

        // Print to console
        console.log("=====================================================");
        console.log(`Graphic: ${graphicName}`);
        console.log(`✔ Selected For: ${selectedImages.length > 0 ? selectedImages.join(", ") : "None"}`);
        console.log(`✖ Not Selected For: ${notSelectedImages.length > 0 ? notSelectedImages.join(", ") : "None"}`);
        console.log(`🚫 Disabled: ${disabledImages.length > 0 ? disabledImages.join(", ") : "None"}`);
        console.log("=====================================================\n");

        // Store for Allure report
        graphicsSelectionData.push({
          graphicName,
          selectedFor: selectedImages,
          notSelectedFor: notSelectedImages,
          disabled: disabledImages,
          selectedCount: selectedImages.length,
          notSelectedCount: notSelectedImages.length,
          disabledCount: disabledImages.length
        });

      } catch (err) {
        console.log(`⚠️ Error processing graphics row ${i}: ${err.message}`);
      }
    }

    // Attach to Allure report
    if (graphicsSelectionData.length > 0) {
      allure.attachment(
        'Alternate Pose Graphic Options Selection',
        JSON.stringify(graphicsSelectionData, null, 2),
        'application/json'
      );
      console.log(`\n✅ Total Graphics: ${graphicsSelectionData.length}`);
    } else {
      console.log('\n⚠️ No graphics data extracted.');
    }

    console.log('===================================================\n');
  });

  // ======================================================
  // STEP 5: Bundle + Price Logic for all players
  // ======================================================
  await allure.step('Step 5: Bundle & Price Calculation for all players', async () => {

    const rows = await page.$$('#playerinfo_fc tr');

    const allureData = [];

    for (let i = 0; i < rows.length; i++) {

      const row = rows[i];

      const firstName = await row.$eval('td:nth-child(1)', el => el.innerText.trim());
      const lastName = await row.$eval('td:nth-child(2)', el => el.innerText.trim());

      let teamImage = "";
      const teamBtn = await row.$('td:nth-child(5) button');
      if (teamBtn) teamImage = await teamBtn.innerText();

      const imageColumns = [8,9,10,11,12,13,14,15,16,17,18,19,20];
      const imageNames = [];

      for (const col of imageColumns) {
        const img = await row.$(`td:nth-child(${col}) button`);
        if (img) {
          const val = await img.innerText();
          if (val.trim()) imageNames.push(val.trim());
        }
      }

      const count = imageNames.length;

      let bundleSymbol = "No Images";
      let bundleAmount = "$0.00";

      if (count === 1) { bundleSymbol = "S"; bundleAmount = "$1.00"; }
      if (count === 2) { bundleSymbol = "R"; bundleAmount = "$1.80"; }
      if (count >= 3 && count <= 5) { bundleSymbol = "L"; bundleAmount = "$3.50"; }
      if (count >= 6 && count <= 10) { bundleSymbol = "XL"; bundleAmount = "$5.80"; }
      if (count >= 11 && count <= 15) { bundleSymbol = "UL"; bundleAmount = "$8.10"; }

      console.log("-----------------------------------------------------");
      console.log(`Player: ${firstName} ${lastName}`);
      console.log(`Team Image: ${teamImage || "None"}`);
      console.log(`Images (${count}): ${imageNames.join(", ") || "None"}`);
      console.log(`Bundle Symbol: ${bundleSymbol}`);
      console.log(`Bundle Amount: ${bundleAmount}`);
      console.log("-----------------------------------------------------\n");

      allureData.push({
        player: `${firstName} ${lastName}`,
        teamImage,
        images: imageNames,
        count,
        bundleSymbol,
        bundleAmount
      });
    }

    allure.attachment('Bundle Summary', JSON.stringify(allureData, null, 2), 'application/json');
  });

  // ======================================================
  // STEP 6: FTP Upload
  // ======================================================
  await allure.step('Step 6: Upload all images for the job via FTP', async () => {

    const client = new ftp.Client();
    client.ftp.verbose = false;

    const FTP_HOST = 'staging.production.nextgenphotosolutions.com';
    const FTP_USER = 'imageprocessing@staging.production.nextgenphotosolutions.com';
    const FTP_PASSWORD = '5Z6$7I*L7Z-k';

    const remotePhotosDir = `/gotphoto/input/${jobName}/photos`;
    const localDir = path.resolve(__dirname, '../test-images/images');

    if (!fs.existsSync(localDir)) {
      throw new Error(`Local image folder not found: ${localDir}`);
    }

    const files = fs.readdirSync(localDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));

    try {
      await client.access({
        host: FTP_HOST,
        user: FTP_USER,
        password: FTP_PASSWORD,
        secure: false
      });

      await client.ensureDir(remotePhotosDir);
      await client.cd(remotePhotosDir);

      for (const f of files) {
        await client.uploadFrom(path.join(localDir, f), f);
      }

      allure.attachment('Uploaded Files', JSON.stringify(files, null, 2), 'application/json');

    } finally {
      client.close();
    }
  });

  // ======================================================
  // STEP 7: Validation
  // ======================================================
  await allure.step('Step 7: Validate successful upload & page status', async () => {

    await page.waitForTimeout(4000);

    const pageContent = await page.content();

    if (pageContent.toLowerCase().includes('success')) {
      console.log('Success message detected.');
    }

    await page.screenshot({ path: 'final-validation.png', fullPage: true });

    allure.attachment('Final Validation Screenshot', fs.readFileSync('final-validation.png'), 'image/png');
  });

  console.log(`
  ========== TEST COMPLETED ==========
  Job ID: ${jobId}
  Link: ${generatedLink}
  Job Name: ${jobName}
  ====================================
  `);
});
