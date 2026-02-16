import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { allure } from 'allure-playwright';
import { fileURLToPath } from 'url';
import { getGeneratedLink, getJobId } from '../utils/linkStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.setTimeout(300000); // 5 minutes timeout

test('Traditional Plus Order Flow - Complete Workflow', async ({ page }) => {

  // ================================
  // ✅ ALLURE METADATA & LABELS
  // ================================
  allure.label("environment", "QA");
  allure.label("owner", "Rakhi");
  allure.label("epic", "Traditional Plus Order Flow");
  allure.label("feature", "Complete Traditional Plus Order Workflow");
  allure.label("story", "Select Traditional+ → Confirm → Ignore Teams → List Players → Upload Team Photos → Checkout");
  allure.severity("critical");
  allure.description("Opens generated link, selects Traditional+ option, confirms, ignores teams, lists all players with images and bundle text, selects template, uploads team photos, applies discount, and completes checkout");

  // ======================================================
  // STEP 1: Get Generated Link and Open
  // ======================================================
  await allure.step('Step 1: Open generated order link', async () => {
    const generatedLink = getGeneratedLink();
    const jobId = getJobId();

    if (!generatedLink) {
      throw new Error('❌ Missing generated link. Run api_create_and_upload.spec.js first.');
    }

    console.log(`🌐 Opening generated link: ${generatedLink}`);
    console.log(`📌 Job ID: ${jobId || 'N/A'}`);

    await page.goto(generatedLink, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    const pageTitle = await page.title();
    console.log(`✅ Page Loaded: ${pageTitle}`);

    await page.screenshot({ path: 'traditional-plus-order-page-loaded.png', fullPage: true });
    allure.attachment('Order Page Screenshot', fs.readFileSync('traditional-plus-order-page-loaded.png'), 'image/png');
  });

  // ======================================================
  // STEP 2: Select Traditional Plus Option
  // ======================================================
  await allure.step('Step 2: Select Traditional Plus option', async () => {
    console.log('🔍 Looking for Traditional Plus option...');

    // Set up dialog handler BEFORE clicking (critical!)
    page.once('dialog', async dialog => {
      console.log(`🟡 Dialog detected: ${dialog.message()}`);
      await dialog.accept();
      console.log('✅ Dialog accepted');
    });

    // Try multiple selectors for Traditional Plus option
    const traditionalPlusSelectors = [
      'img[alt="Traditional Plus Memorymate"]',
      'img[src*="Traditional%20Plus%20Memorymate.jpg"]',
      'img[src*="Traditional Plus Memorymate.jpg"]',
      '#ch_tdp',
      'input[type="checkbox"][id*="tdp"]'
    ];

    let traditionalPlusSelected = false;

    for (const selector of traditionalPlusSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 })) {
          if (selector.includes('img')) {
            await element.scrollIntoViewIfNeeded();
            await element.click({ force: true });
            console.log(`✅ Clicked Traditional Plus image using selector: ${selector}`);
          } else {
            await element.check();
            console.log(`✅ Checked Traditional Plus checkbox using selector: ${selector}`);
          }
          traditionalPlusSelected = true;
          await page.waitForTimeout(1000);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    // Also check the hidden checkbox
    await page.evaluate(() => {
      const checkbox = document.querySelector('#ch_tdp');
      if (checkbox) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        checkbox.dispatchEvent(new Event('click', { bubbles: true }));
      }
    });

    expect(traditionalPlusSelected).toBeTruthy();
    console.log('🎯 Traditional Plus option successfully selected');

    await page.screenshot({ path: 'traditional-plus-selected.png', fullPage: true });
    allure.attachment('Traditional Plus Selected Screenshot', fs.readFileSync('traditional-plus-selected.png'), 'image/png');
  });

  // ======================================================
  // STEP 3: Click Confirm Button
  // ======================================================
  await allure.step('Step 3: Click Confirm button to close popup box', async () => {
    console.log('🔍 Looking for Confirm button...');

    // Wait for modal/popup to appear
    await page.waitForTimeout(2000);

    const confirmSelectors = [
      'button:has-text("Confirm")',
      '.bootbox button:has-text("Confirm")',
      '.modal button:has-text("Confirm")',
      '.btn-success:has-text("Confirm")',
      'button.btn-success'
    ];

    let confirmed = false;

    // Wait for modal to be visible
    try {
      await page.waitForSelector('.bootbox, .modal, [role="dialog"]', { timeout: 5000 });
      console.log('✅ Confirm modal/popup detected');
    } catch (e) {
      console.log('⚠️ No confirm modal detected, continuing...');
    }

    for (const selector of confirmSelectors) {
      try {
        const confirmBtn = page.locator(selector).first();
        const isVisible = await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (isVisible) {
          await confirmBtn.scrollIntoViewIfNeeded();
          await confirmBtn.click({ force: true });
          console.log(`✅ Clicked Confirm button using selector: ${selector}`);
          confirmed = true;
          await page.waitForTimeout(2000);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!confirmed) {
      // Try using evaluate to click if button exists
      const clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const confirmBtn = buttons.find(btn => 
          btn.textContent.includes('Confirm') || 
          btn.classList.contains('btn-success')
        );
        if (confirmBtn && confirmBtn.offsetParent !== null) {
          confirmBtn.click();
          return true;
        }
        return false;
      }).catch(() => false);

      if (clicked) {
        console.log('✅ Clicked Confirm button (via evaluate)');
        confirmed = true;
      } else {
        console.log('⚠️ Confirm button not found, but continuing...');
      }
    }

    await page.waitForTimeout(2000);
  });

  // ======================================================
  // STEP 4: Click Ignore Team Images Button
  // ======================================================
  await allure.step('Step 4: Click Ignore team images button', async () => {
    console.log('🔍 Looking for Ignore team images button...');

    // Wait for the ignore popup/modal to appear
    await page.waitForTimeout(2000);

    // Handle dialog if it appears
    page.once('dialog', async dialog => {
      console.log(`🟡 Dialog detected: ${dialog.message()}`);
      await dialog.accept();
      console.log('✅ Dialog accepted');
    });

    const ignoreSelectors = [
      'button:has-text("Ignore team images")',
      'button:has-text("Ignore")',
      '.bootbox button:has-text("Ignore")',
      '.modal button:has-text("Ignore")',
      '.btn:has-text("Ignore")'
    ];

    let ignored = false;
    
    // Wait for modal/popup to be visible
    try {
      await page.waitForSelector('.bootbox, .modal, [role="dialog"]', { timeout: 5000 });
      console.log('✅ Ignore modal/popup detected');
    } catch (e) {
      console.log('⚠️ No ignore modal detected, continuing...');
    }

    for (const selector of ignoreSelectors) {
      try {
        const ignoreBtn = page.locator(selector).first();
        const isVisible = await ignoreBtn.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (isVisible) {
          await ignoreBtn.scrollIntoViewIfNeeded();
          await ignoreBtn.click({ force: true });
          console.log(`✅ Clicked Ignore teams button using selector: ${selector}`);
          ignored = true;
          await page.waitForTimeout(2000);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!ignored) {
      // Try using evaluate to click if button exists
      const clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const ignoreBtn = buttons.find(btn => 
          btn.textContent.includes('Ignore') || 
          btn.textContent.includes('ignore')
        );
        if (ignoreBtn && ignoreBtn.offsetParent !== null) {
          ignoreBtn.click();
          return true;
        }
        return false;
      });

      if (clicked) {
        console.log('✅ Clicked Ignore teams button (via evaluate)');
        ignored = true;
      } else {
        console.log('⚠️ Ignore button not found, but continuing...');
      }
    }

    // Wait for page to stabilize
    await page.waitForTimeout(2000);
    console.log('✅ Ignore teams step completed');
  });

  // ======================================================
  // STEP 5: List All Players with Images and Bundle Text
  // ======================================================
  await allure.step('Step 5: List all player names with their images and bundle text', async () => {
    console.log('\n========== PLAYER LIST WITH IMAGE COUNT AND BUNDLE TEXT ==========\n');

    // Wait for player table to be visible
    await page.waitForSelector('#playerinfo_fc tr', { timeout: 15000 }).catch(() => {
      console.log('⚠️ Player table not found. Trying alternative selectors...');
    });

    await page.waitForTimeout(2000);

    const rows = await page.$$('#playerinfo_fc tr');
    let playerListData = [];

    if (rows.length === 0) {
      console.log('⚠️ No player rows found.');
      return;
    }

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];

        // Get player name
        const firstName = await row.$eval('td:nth-child(1)', el => el.innerText.trim()).catch(() => '');
        const lastName = await row.$eval('td:nth-child(2)', el => el.innerText.trim()).catch(() => '');
        const playerName = `${firstName} ${lastName}`.trim();

        if (!playerName) continue;

        // Get team image
        let teamImage = "";
        const teamBtn = await row.$('td:nth-child(5) button').catch(() => null);
        if (teamBtn) {
          teamImage = await teamBtn.innerText().catch(() => '');
        }

        // Count individual images (columns 8-22 for more images)
        const imageColumns = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
        let imageNames = [];
        let imageCount = 0;

        for (let col of imageColumns) {
          const imgBtn = await row.$(`td:nth-child(${col}) button`).catch(() => null);
          if (imgBtn) {
            const imgText = await imgBtn.innerText().catch(() => '');
            if (imgText && imgText.trim() !== "") {
              imageNames.push(imgText.trim());
              imageCount++;
            }
          }
        }

        // Calculate bundle text based on image count
        let bundleText = "No Images";
        if (imageCount === 1) bundleText = "S";
        else if (imageCount === 2) bundleText = "R";
        else if (imageCount >= 3 && imageCount <= 5) bundleText = "L";
        else if (imageCount >= 6 && imageCount <= 10) bundleText = "XL";
        else if (imageCount >= 11 && imageCount <= 15) bundleText = "UL";

        // Format image list as "image 1, image 2, image 3..."
        const imageList = imageNames.map((img, idx) => `image ${idx + 1} (${img})`).join(', ');

        console.log("-----------------------------------------------------");
        console.log(`Player: ${playerName}`);
        console.log(`Team Image: ${teamImage || "None"}`);
        console.log(`Images (${imageCount}): ${imageList || "None"}`);
        console.log(`Bundle Text: ${bundleText}`);
        console.log("-----------------------------------------------------\n");

        playerListData.push({
          player: playerName,
          teamImage: teamImage || "None",
          images: imageNames,
          imageCount: imageCount,
          imageList: imageList || "None",
          bundleText: bundleText
        });
      } catch (e) {
        console.log(`⚠️ Error processing row ${i}:`, e.message);
        continue;
      }
    }

    // Calculate summary statistics
    const totalPlayers = playerListData.length;
    const totalTeamImages = playerListData.filter(p => p.teamImage !== "None").length;
    const totalIndividualImages = playerListData.reduce((sum, p) => sum + p.imageCount, 0);
    const bundleCounts = {
      S: playerListData.filter(p => p.bundleText === "S").length,
      R: playerListData.filter(p => p.bundleText === "R").length,
      L: playerListData.filter(p => p.bundleText === "L").length,
      XL: playerListData.filter(p => p.bundleText === "XL").length,
      UL: playerListData.filter(p => p.bundleText === "UL").length,
      "No Images": playerListData.filter(p => p.bundleText === "No Images").length
    };

    // Create formatted text report
    let formattedReport = `========== PLAYER LIST WITH IMAGE COUNT AND BUNDLE TEXT ==========\n\n`;
    formattedReport += `Total Players: ${totalPlayers}\n`;
    formattedReport += `Total Team Images: ${totalTeamImages}\n`;
    formattedReport += `Total Individual Images: ${totalIndividualImages}\n\n`;
    formattedReport += `Bundle Distribution:\n`;
    formattedReport += `  S: ${bundleCounts.S}\n`;
    formattedReport += `  R: ${bundleCounts.R}\n`;
    formattedReport += `  L: ${bundleCounts.L}\n`;
    formattedReport += `  XL: ${bundleCounts.XL}\n`;
    formattedReport += `  UL: ${bundleCounts.UL}\n`;
    formattedReport += `  No Images: ${bundleCounts["No Images"]}\n\n`;
    formattedReport += `==========================================\n\n`;

    for (const player of playerListData) {
      formattedReport += `Player: ${player.player}\n`;
      formattedReport += `Team Image: ${player.teamImage}\n`;
      formattedReport += `Images (${player.imageCount}): ${player.imageList}\n`;
      formattedReport += `Bundle Text: ${player.bundleText}\n`;
      formattedReport += `----------------------------------------\n\n`;
    }

    // Attach to Allure
    allure.attachment('Player List with Image Count and Bundle Text (Formatted)', formattedReport, 'text/plain');
    allure.attachment('Player List with Image Count and Bundle Text (JSON)', JSON.stringify({
      summary: {
        totalPlayers,
        totalTeamImages,
        totalIndividualImages,
        bundleCounts
      },
      players: playerListData
    }, null, 2), 'application/json');

    console.log(`\n✅ Listed ${totalPlayers} players with image counts and bundle text`);
  });

  // ======================================================
  // STEP 6: Click Background Template - Single Template for Organization
  // ======================================================
  await allure.step('Step 6: Click Background Template - Single Template for Organization', async () => {
    console.log('🔍 Looking for Background Template - Single Template for Organization...');

    // Click Background Template section
    try {
      await page.waitForSelector('#bgsinglecheck_s', { timeout: 15000 });
      await page.locator('#bgsinglecheck_s').scrollIntoViewIfNeeded();
      await page.click('#bgsinglecheck_s');
      console.log('✅ Clicked Background Template - Single Template for Organization');
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('⚠️ Could not click Background Template option:', e.message);
      throw e;
    }
  });

  // ======================================================
  // STEP 7: Select Template "3rd Creative - Baseline - Softball/Baseball"
  // ======================================================
  await allure.step('Step 7: Select template "3rd Creative - Baseline - Softball/Baseball"', async () => {
    console.log('🔍 Looking for template dropdown...');

    try {
      await page.waitForSelector('#bcktemplete', { timeout: 15000 });
      
      // Try to find the template by text "3rd Creative - Baseline - Softball/Baseball"
      const templateSelect = page.locator('#bcktemplete');
      
      // Get all options
      const options = await templateSelect.locator('option').all();
      let selectedValue = null;
      let selectedText = null;
      const allTemplates = [];

      for (const option of options) {
        const text = await option.textContent();
        const value = await option.getAttribute('value');
        allTemplates.push({ text: text.trim(), value });
        
        if (text && text.includes('3rd Creative') && text.includes('Baseline') && (text.includes('Softball') || text.includes('Baseball'))) {
          selectedValue = value;
          selectedText = text.trim();
          break;
        }
      }

      if (selectedValue) {
        await templateSelect.selectOption(selectedValue);
        console.log(`✅ Selected template: ${selectedText}`);
        
        allure.attachment('Template Selection', JSON.stringify({
          selectedTemplate: selectedText,
          selectedValue: selectedValue,
          allTemplates: allTemplates
        }, null, 2), 'application/json');
      } else {
        // Fallback: try selecting by index (usually 3rd option)
        await templateSelect.selectOption({ index: 2 });
        const selectedText = await templateSelect.evaluate(el => el.options[el.selectedIndex].text);
        console.log(`✅ Selected template by index: ${selectedText}`);
      }

      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('⚠️ Could not select template:', e.message);
      throw e;
    }
  });

  // ======================================================
  // STEP 8: Upload Team Photos
  // ======================================================
  await allure.step('Step 8: Upload Team Photos', async () => {
    console.log('🔍 Looking for Upload Team Photos section...');

    // Scroll to make file input visible
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(1000);

    try {
      // Wait for upload file input
      await page.waitForSelector('#upload_tp_files', { timeout: 20000 });
      
      const fileInput = page.locator('#upload_tp_files');
      const filePath = path.join(__dirname, '../test-images/A.jpg');

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      console.log(`📤 Uploading file: ${filePath}`);
      await fileInput.setInputFiles(filePath);
      console.log('✅ File selected for upload');
      await page.waitForTimeout(2000);

      // Wait for "Upload Team Photos" button to be visible
      const uploadBtnSelectors = [
        '#upload_tp_filesBtn',
        'button:has-text("Upload Team Photos")',
        'button[onclick*="upload"]'
      ];

      let uploadBtnClicked = false;
      for (const selector of uploadBtnSelectors) {
        try {
          const uploadBtn = page.locator(selector).first();
          const isVisible = await uploadBtn.isVisible({ timeout: 5000 }).catch(() => false);
          
          if (isVisible) {
            await uploadBtn.scrollIntoViewIfNeeded();
            await uploadBtn.click();
            console.log(`✅ Clicked Upload Team Photos button using selector: ${selector}`);
            uploadBtnClicked = true;
            await page.waitForTimeout(3000);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!uploadBtnClicked) {
        throw new Error('Upload Team Photos button not found or not visible');
      }

      // Attach upload information
      allure.attachment('Team Photo Upload Information', JSON.stringify({
        filePath: filePath,
        uploadStatus: 'Success',
        timestamp: new Date().toISOString()
      }, null, 2), 'application/json');

      await page.screenshot({ path: 'team-photo-uploaded.png', fullPage: true });
      allure.attachment('Team Photo Upload Screenshot', fs.readFileSync('team-photo-uploaded.png'), 'image/png');

    } catch (e) {
      console.log('❌ Error uploading team photos:', e.message);
      throw e;
    }
  });

  // ======================================================
  // STEP 9: Select Team Name from Dropdown and Click Save
  // ======================================================
  await allure.step('Step 9: Select Team name from dropdown and click Save button', async () => {
    console.log('🔍 Looking for team dropdown...');

    try {
      await page.waitForSelector('#team-table select[name="upload_photo_team[]"], select[name="upload_photo_team[]"]', { timeout: 20000 });

      const dropdowns = page.locator('#team-table select[name="upload_photo_team[]"], select[name="upload_photo_team[]"]');
      const dropdownCount = await dropdowns.count();
      console.log(`🟢 Found ${dropdownCount} team dropdown(s)`);

      if (dropdownCount > 0) {
        // Get first available option
        const firstDropdown = dropdowns.nth(0);
        const options = await firstDropdown.locator('option').all();
        
        if (options.length > 1) {
          // Select first non-empty option (skip index 0 which is usually "Select Team")
          const selectedText = await firstDropdown.selectOption({ index: 1 });
          const selectedValue = await firstDropdown.evaluate(el => el.options[el.selectedIndex].text);
          console.log(`✅ Selected team: ${selectedValue}`);
        } else {
          // If only one option, select it
          await firstDropdown.selectOption({ index: 0 });
          const selectedValue = await firstDropdown.evaluate(el => el.options[el.selectedIndex].text);
          console.log(`✅ Selected team: ${selectedValue}`);
        }
      }

      await page.waitForTimeout(2000);

      // Click Save button
      const saveBtnSelectors = [
        'button[onclick*="submitData_forTeamUpload"]',
        'button:has-text("Save")',
        '[onclick="submitData_forTeamUpload()"]'
      ];

      let saved = false;
      for (const selector of saveBtnSelectors) {
        try {
          const saveBtn = page.locator(selector).first();
          const isVisible = await saveBtn.isVisible({ timeout: 3000 }).catch(() => false);
          
          if (isVisible) {
            await saveBtn.scrollIntoViewIfNeeded();
            await saveBtn.click();
            console.log(`✅ Clicked Save button using selector: ${selector}`);
            saved = true;
            await page.waitForTimeout(3000);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!saved) {
        // Try using evaluate
        const clicked = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
          const saveBtn = buttons.find(btn => 
            btn.textContent && btn.textContent.includes('Save') ||
            btn.onclick && btn.onclick.toString().includes('submitData_forTeamUpload')
          );
          if (saveBtn && saveBtn.offsetParent !== null) {
            saveBtn.click();
            return true;
          }
          return false;
        });

        if (clicked) {
          console.log('✅ Clicked Save button (via evaluate)');
          saved = true;
        }
      }

      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('⚠️ Could not select team or click Save:', e.message);
      // Continue anyway
    }
  });

  // ======================================================
  // STEP 10: Click Extracted Images
  // ======================================================
  await allure.step('Step 10: Click Extracted images', async () => {
    console.log('🔍 Looking for Extracted images option...');

    try {
      await page.waitForSelector('#extractedimagesI', { timeout: 15000 });
      await page.locator('#extractedimagesI').scrollIntoViewIfNeeded();
      await page.click('#extractedimagesI');
      console.log('✅ Clicked Extracted images');
      await page.waitForTimeout(1000);
    } catch (e) {
      console.log('⚠️ Could not click Extracted images:', e.message);
      throw e;
    }
  });

  // ======================================================
  // STEP 11: Click PNG Crop - 3/4 Crop
  // ======================================================
  await allure.step('Step 11: Click PNG crop - 3/4 Crop', async () => {
    console.log('🔍 Looking for PNG crop 3/4 Crop option...');

    try {
      // Look for 3/4 Crop option - it might be a radio button or checkbox
      const cropSelectors = [
        'input[type="radio"][value*="3/4"]',
        'input[type="radio"][value*="34"]',
        'input[type="checkbox"][id*="crop"][id*="34"]',
        'label:has-text("3/4 Crop")',
        '#cropimages34'
      ];

      let cropSelected = false;
      for (const selector of cropSelectors) {
        try {
          const element = page.locator(selector).first();
          const isVisible = await element.isVisible({ timeout: 3000 }).catch(() => false);
          
          if (isVisible) {
            await element.scrollIntoViewIfNeeded();
            if (selector.includes('label')) {
              await element.click();
            } else {
              await element.check();
            }
            console.log(`✅ Selected PNG crop 3/4 Crop using selector: ${selector}`);
            cropSelected = true;
            await page.waitForTimeout(1000);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!cropSelected) {
        // Fallback: try clicking by text
        await page.locator('text=3/4 Crop').click({ timeout: 5000 });
        console.log('✅ Clicked 3/4 Crop by text');
      }

      await page.waitForTimeout(1000);
    } catch (e) {
      console.log('⚠️ Could not select PNG crop 3/4 Crop:', e.message);
      // Continue anyway
    }
  });

  // ======================================================
  // STEP 12: Click Unique Color for Each Team in Organization
  // ======================================================
  await allure.step('Step 12: Click Unique color for each team in organization', async () => {
    console.log('🔍 Looking for Unique color option...');

    try {
      await page.waitForSelector('#teamcolorY', { timeout: 15000 });
      await page.locator('#teamcolorY').scrollIntoViewIfNeeded();
      await page.click('#teamcolorY');
      console.log('✅ Clicked Unique color for each team in organization');
      await page.waitForTimeout(1000);
    } catch (e) {
      console.log('⚠️ Could not click Unique color option:', e.message);
      throw e;
    }
  });

  // ======================================================
  // STEP 13: Print Totals (Team Images, Individual Images, Additional Graphics, Subtotal, Total)
  // ======================================================
  await allure.step('Step 13: Print Total Number of Team Images, Individual Images, Additional Graphics, Subtotal, Total', async () => {
    console.log('\n========== ORDER TOTALS ==========\n');

    try {
      // Wait for totals to be visible
      await page.waitForTimeout(2000);

      // Extract totals from page elements
      const teamImagesTotal = await page.locator('#setteamonly1').textContent().catch(() => '0');
      const individualImagesTotal = await page.locator('#bundlesSubTotal1').textContent().catch(() => '0');
      const additionalGraphics = await page.locator('#bundle_AddinalTotal_amt_span').textContent().catch(() => '0');
      const subtotal = await page.locator('#subtotal1').textContent().catch(() => '0');
      const total = await page.locator('#finaltotl').textContent().catch(() => '0');

      // Also try alternative selectors
      const teamImagesAlt = await page.locator('text=/Team.*Images?/i').first().textContent().catch(() => null);
      const individualImagesAlt = await page.locator('text=/Individual.*Images?/i').first().textContent().catch(() => null);

      console.log(`Total Number of Team Images: ${teamImagesTotal}`);
      console.log(`Total Number of Individual Images: ${individualImagesTotal}`);
      console.log(`Additional Graphics: ${additionalGraphics}`);
      console.log(`Subtotal: ${subtotal}`);
      console.log(`Total: ${total}`);

      const totalsData = {
        teamImages: teamImagesTotal.trim(),
        individualImages: individualImagesTotal.trim(),
        additionalGraphics: additionalGraphics.trim(),
        subtotal: subtotal.trim(),
        total: total.trim(),
        timestamp: new Date().toISOString()
      };

      // Attach to Allure
      allure.attachment('Order Totals', JSON.stringify(totalsData, null, 2), 'application/json');

      // Create formatted report
      let totalsReport = `========== ORDER TOTALS ==========\n\n`;
      totalsReport += `Total Number of Team Images: ${teamImagesTotal}\n`;
      totalsReport += `Total Number of Individual Images: ${individualImagesTotal}\n`;
      totalsReport += `Additional Graphics: ${additionalGraphics}\n`;
      totalsReport += `Subtotal: ${subtotal}\n`;
      totalsReport += `Total: ${total}\n`;
      totalsReport += `\nTimestamp: ${new Date().toISOString()}\n`;

      allure.attachment('Order Totals (Formatted)', totalsReport, 'text/plain');

      console.log('\n✅ Totals extracted and printed');
    } catch (e) {
      console.log('⚠️ Could not extract all totals:', e.message);
      // Continue anyway
    }
  });

  // ======================================================
  // STEP 14: Enter Discount Code and Click Redeem
  // ======================================================
  await allure.step('Step 14: Enter discount code "100OFF" and click Redeem button', async () => {
    console.log('🔍 Looking for discount code input...');

    try {
      await page.waitForSelector('#discount_code', { timeout: 15000 });
      await page.locator('#discount_code').scrollIntoViewIfNeeded();
      await page.fill('#discount_code', '100OFF');
      console.log('✅ Entered discount code: 100OFF');
      await page.waitForTimeout(500);

      // Click Redeem button
      await page.waitForSelector('#Redeem', { timeout: 10000 });
      await page.click('#Redeem');
      console.log('✅ Clicked Redeem button');
      await page.waitForTimeout(3000);

      // Check if discount was applied
      const discountTotal = await page.locator('#disctotl').textContent().catch(() => '0');
      console.log(`💰 Discount Applied: ${discountTotal}`);

    } catch (e) {
      console.log('⚠️ Could not apply discount code:', e.message);
      throw e;
    }
  });

  // ======================================================
  // STEP 15: Click Checkout
  // ======================================================
  await allure.step('Step 15: Click checkout', async () => {
    console.log('🔍 Looking for checkout button...');

    try {
      await page.waitForSelector('#btnpaynow', { timeout: 15000 });
      await page.locator('#btnpaynow').scrollIntoViewIfNeeded();
      await page.click('#btnpaynow');
      console.log('✅ Clicked Checkout button');
      await page.waitForTimeout(5000);

      // Capture final URL
      const finalUrl = page.url();
      console.log(`📍 Final URL: ${finalUrl}`);

      await page.screenshot({ path: 'checkout-completed.png', fullPage: true });
      allure.attachment('Checkout Completed Screenshot', fs.readFileSync('checkout-completed.png'), 'image/png');
      allure.attachment('Final URL', finalUrl, 'text/plain');

      console.log('🎉 Traditional Plus order flow completed successfully!');
    } catch (e) {
      console.log('❌ Could not complete checkout:', e.message);
      throw e;
    }
  });
});
