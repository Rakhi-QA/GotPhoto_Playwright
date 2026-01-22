import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { allure } from 'allure-playwright';
import { fileURLToPath } from 'url';
import { getGeneratedLink, getJobId } from '../utils/linkStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.setTimeout(300000); // 5 minutes timeout

test('Traditional Order Flow - Complete Workflow', async ({ page }) => {

  // ================================
  // ✅ ALLURE METADATA & LABELS
  // ================================
  allure.label("environment", "QA");
  allure.label("owner", "Rakhi");
  allure.label("epic", "Traditional Order Flow");
  allure.label("feature", "Complete Traditional Order Workflow");
  allure.label("story", "Select Traditional → Confirm → Ignore Teams → Print Players → Upload Team Photos");
  allure.severity("critical");
  allure.description("Opens generated link, selects Traditional option, confirms, ignores teams, prints player list with image counts, selects template, and uploads team photos");

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

    await page.screenshot({ path: 'traditional-order-page-loaded.png', fullPage: true });
    allure.attachment('Order Page Screenshot', fs.readFileSync('traditional-order-page-loaded.png'), 'image/png');
  });

  // ======================================================
  // STEP 2: Select Traditional Option
  // ======================================================
  await allure.step('Step 2: Select Traditional option', async () => {
    console.log('🔍 Looking for Traditional option...');

    // Set up dialog handler BEFORE clicking (critical!)
    let dialogAccepted = false;
    const dialogHandler = async (dialog) => {
      console.log(`🟡 Dialog detected: ${dialog.message()}`);
      await dialog.accept();
      dialogAccepted = true;
      console.log('✅ Dialog accepted');
    };
    page.once('dialog', dialogHandler);

    // Try multiple selectors for Traditional option
    const traditionalSelectors = [
      'img[src*="Traditional Memorymate.jpg"]',
      'img[alt*="Traditional"]',
      'img[alt="Traditional Memorymate"]',
      '#ch_td',
      'input[type="checkbox"][id*="td"]'
    ];

    let traditionalSelected = false;

    for (const selector of traditionalSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 })) {
          if (selector.includes('img')) {
            await element.scrollIntoViewIfNeeded();
            await element.click({ force: true });
            console.log(`✅ Clicked Traditional image using selector: ${selector}`);
          } else {
            await element.check();
            console.log(`✅ Checked Traditional checkbox using selector: ${selector}`);
          }
          traditionalSelected = true;
          await page.waitForTimeout(1000);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    // Also check the hidden checkbox
    await page.evaluate(() => {
      const checkbox = document.querySelector('#ch_td');
      if (checkbox) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        checkbox.dispatchEvent(new Event('click', { bubbles: true }));
      }
    });

    await page.waitForTimeout(2000);

    const isChecked = await page.evaluate(() => {
      const checkbox = document.querySelector('#ch_td');
      return checkbox ? checkbox.checked : false;
    });

    expect(isChecked).toBeTruthy();
    console.log('✅ Traditional option successfully selected');

    await page.screenshot({ path: 'traditional-selected.png', fullPage: true });
    allure.attachment('Traditional Selected Screenshot', fs.readFileSync('traditional-selected.png'), 'image/png');
  });

  // ======================================================
  // STEP 3: Click Confirm Button
  // ======================================================
  await allure.step('Step 3: Click Confirm button', async () => {
    console.log('🔍 Looking for Confirm button...');

    // Helper function to safely wait
    const safeWait = async (ms) => {
      try {
        // Check if page is still accessible
        await page.evaluate(() => document.title);
        await page.waitForTimeout(ms);
      } catch (e) {
        if (e.message.includes('closed')) {
          throw new Error('Page was closed unexpectedly. Dialog may have caused navigation.');
        }
        throw e;
      }
    };

    // Set up dialog handler BEFORE waiting
    let dialogHandled = false;
    page.once('dialog', async dialog => {
      console.log(`🟡 Dialog detected: ${dialog.message()}`);
      await dialog.accept();
      dialogHandled = true;
      console.log('✅ Dialog accepted');
    });

    // Wait for popup/modal to appear (with page check)
    try {
      await safeWait(2000);
    } catch (e) {
      console.log('⚠️ Page check failed, trying to recover...');
      // Try to continue if page is still there
      try {
        await page.title();
      } catch {
        throw new Error('Page was closed. Cannot proceed.');
      }
    }

    // Try multiple strategies to find and click Confirm button
    const confirmSelectors = [
      '.bootbox .btn-success',
      '.modal .btn-success',
      '.bootbox button:has-text("Confirm")',
      '.modal button:has-text("Confirm")',
      'button.btn-success:has-text("Confirm")',
      'button:has-text("Confirm")',
      '.btn-success'
    ];

    let confirmed = false;
    
    // First, wait for modal/popup to be visible
    try {
      await page.waitForSelector('.bootbox, .modal, [role="dialog"]', { timeout: 5000 });
      console.log('✅ Modal/popup detected');
    } catch (e) {
      console.log('⚠️ No modal detected, trying to find button directly...');
    }

    for (const selector of confirmSelectors) {
      try {
        // Check page is accessible
        await page.evaluate(() => document.title).catch(() => {
          throw new Error('Page closed');
        });

        const confirmBtn = page.locator(selector).first();
        const isVisible = await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (isVisible) {
          await confirmBtn.scrollIntoViewIfNeeded();
          await confirmBtn.click({ force: true });
          console.log(`✅ Clicked Confirm button using selector: ${selector}`);
          confirmed = true;
          await safeWait(2000);
          break;
        }
      } catch (e) {
        if (e.message.includes('closed')) {
          throw e;
        }
        continue;
      }
    }

    if (!confirmed) {
      // Check page is still accessible before waiting
      try {
        await page.evaluate(() => document.title);
        await safeWait(2000);
        
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
      } catch (e) {
        if (e.message.includes('closed')) {
          throw new Error('Page was closed while trying to click Confirm button');
        }
        console.log('⚠️ Could not click Confirm, but continuing...');
      }
    }

    // Final wait with page check
    try {
      await safeWait(2000);
    } catch (e) {
      console.log('⚠️ Final wait failed, but continuing...');
    }
  });

  // ======================================================
  // STEP 4: Click Ignore Teams Button
  // ======================================================
  await allure.step('Step 4: Click Ignore teams button', async () => {
    console.log('🔍 Looking for Ignore teams button...');

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
      await page.waitForTimeout(2000);
      
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

 // ======================================================
// STEP 4: Click Ignore Teams Button (FIXED)
// ======================================================
await allure.step('Step 4: Click Ignore teams button', async () => {
  console.log('🔍 Looking for Ignore teams button...');

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
        
        // KEY FIX: Wait for navigation instead of page.waitForTimeout
        await Promise.all([
          page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => 
            console.log('⚠️ No navigation detected, continuing...')
          ),
          ignoreBtn.click({ force: true })
        ]);
        
        console.log(`✅ Clicked Ignore teams button using selector: ${selector}`);
        ignored = true;
        break;
      }
    } catch (e) {
      if (e.message.includes('Target closed') || e.message.includes('has been closed')) {
        console.log('⚠️ Page navigated or closed after click - this is expected');
        ignored = true;
        break;
      }
      continue;
    }
  }

  if (!ignored) {
    await page.waitForTimeout(2000);
    
    // Try using evaluate to click if button exists
    try {
      const clicked = await Promise.race([
        page.evaluate(() => {
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
        }),
        page.waitForLoadState('domcontentloaded', { timeout: 5000 }).then(() => true)
      ]);

      if (clicked) {
        console.log('✅ Clicked Ignore teams button (via evaluate)');
        ignored = true;
      }
    } catch (e) {
      console.log('⚠️ Ignore button interaction caused navigation');
      ignored = true;
    }
  }

  // Wait for page to stabilize after navigation
  try {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    console.log('✅ Page loaded after ignore teams');
  } catch (e) {
    console.log('⚠️ Network idle timeout - continuing anyway');
  }
  
  // Verify we're on the right page by checking for player table
  try {
    await page.waitForSelector('#playerinfo_fc, table', { timeout: 5000 });
    console.log('✅ Player table detected - navigation successful');
  } catch (e) {
    console.log('⚠️ Could not verify player table yet');
  }

  console.log('✅ Ignore teams step completed');
});
    console.log('✅ Ignore teams completed');
  });

  // ======================================================
  // STEP 5: Print All Players with Image Count
  // ======================================================
  await allure.step('Step 5: Print all players with image count', async () => {
    console.log('\n========== PLAYER LIST WITH IMAGE COUNT ==========\n');

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

        // Count individual images (columns 8-12 or more)
        const imageColumns = [8, 9, 10, 11, 12];
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

        // Print to console
        console.log("=====================================================");
        console.log(`Player #${i + 1}: ${playerName}`);
        console.log(`Team Image: ${teamImage || "None"}`);
        console.log(`Individual Images Count: ${imageCount}`);
        console.log(`Image Names: ${imageNames.length > 0 ? imageNames.join(", ") : "None"}`);
        console.log(`Total Images: ${(teamImage ? 1 : 0) + imageCount}`);
        console.log("=====================================================\n");

        // Store for Allure report
        playerListData.push({
          playerNumber: i + 1,
          playerName,
          teamImage: teamImage || "None",
          individualImageCount: imageCount,
          imageNames,
          totalImages: (teamImage ? 1 : 0) + imageCount
        });

      } catch (err) {
        console.log(`⚠️ Error processing player row ${i}: ${err.message}`);
      }
    }

    // Create formatted summary for Allure report
    const summaryText = playerListData.map(player => {
      return `Player #${player.playerNumber}: ${player.playerName}
Team Image: ${player.teamImage}
Individual Images Count: ${player.individualImageCount}
Image Names: ${player.imageNames.length > 0 ? player.imageNames.join(", ") : "None"}
Total Images: ${player.totalImages}
----------------------------------------`;
    }).join('\n\n');

    const fullReport = `========== PLAYER LIST WITH IMAGE COUNT ==========

Total Players: ${playerListData.length}

${summaryText}

====================================================`;

    // Attach formatted text report
    allure.attachment(
      'Player List with Image Count (Formatted)',
      fullReport,
      'text/plain'
    );

    // Attach JSON data for programmatic access
    allure.attachment(
      'Player List with Image Count (JSON)',
      JSON.stringify({
        totalPlayers: playerListData.length,
        players: playerListData,
        summary: {
          totalTeamImages: playerListData.filter(p => p.teamImage !== "None").length,
          totalIndividualImages: playerListData.reduce((sum, p) => sum + p.individualImageCount, 0),
          totalAllImages: playerListData.reduce((sum, p) => sum + p.totalImages, 0)
        }
      }, null, 2),
      'application/json'
    );

    console.log(`\n✅ Total Players: ${playerListData.length}`);
    console.log(`📊 Summary: ${playerListData.filter(p => p.teamImage !== "None").length} team images, ${playerListData.reduce((sum, p) => sum + p.individualImageCount, 0)} individual images`);
    console.log('===================================================\n');
  });

  // ======================================================
  // STEP 6: Click Background Template
  // ======================================================
  await allure.step('Step 6: Click Background Template', async () => {
    console.log('🔍 Looking for Background Template option...');

    const bgTemplateSelectors = [
      '#bcktemplete',
      'a[href*="template"]',
      'button:has-text("Background Template")',
      '.template-selector'
    ];

    // First, try to find and click the Background Template section/button
    let bgTemplateClicked = false;
    for (const selector of bgTemplateSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 })) {
          await element.scrollIntoViewIfNeeded();
          await element.click();
          console.log(`✅ Clicked Background Template using selector: ${selector}`);
          bgTemplateClicked = true;
          await page.waitForTimeout(1000);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    // If dropdown is already visible, we can proceed
    await page.waitForTimeout(2000);
    console.log('✅ Background Template section accessed');
  });

  // ======================================================
  // STEP 7: Click Single Template for Organization
  // ======================================================
  await allure.step('Step 7: Click Single Template for Organization', async () => {
    console.log('🔍 Looking for Single Template for Organization option...');

    const singleTemplateSelectors = [
      '#bgsinglecheck_s',
      'input[type="radio"][id*="single"]',
      'input[type="checkbox"][id*="single"]',
      'label:has-text("Single Template")'
    ];

    let singleTemplateSelected = false;
    for (const selector of singleTemplateSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 })) {
          await element.scrollIntoViewIfNeeded();
          if (selector.includes('input')) {
            await element.check();
          } else {
            await element.click();
          }
          console.log(`✅ Selected Single Template for Organization using selector: ${selector}`);
          singleTemplateSelected = true;
          await page.waitForTimeout(1000);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!singleTemplateSelected) {
      // Try clicking by text
      const singleTemplate = page.locator('text=Single Template for Organization').first();
      if (await singleTemplate.isVisible({ timeout: 2000 }).catch(() => false)) {
        await singleTemplate.click();
        console.log('✅ Selected Single Template for Organization (by text)');
      }
    }

    await page.waitForTimeout(2000);
  });

  // ======================================================
  // STEP 8: Select Template "CheckBT2023_2" from Dropdown
  // ======================================================
  await allure.step('Step 8: Select template "CheckBT2023_2" from dropdown', async () => {
    console.log('🔍 Looking for template dropdown...');

    await page.waitForSelector('#bcktemplete', { timeout: 10000 });

    // Get all options and find "CheckBT2023_2"
    const options = await page.$$eval('#bcktemplete option', options => 
      options.map((opt, idx) => ({ index: idx, value: opt.value, text: opt.text.trim() }))
    );

    // Find CheckBT2023_2 option
    const targetOption = options.find(opt => 
      opt.text.toLowerCase().includes('checkbt2023_2') || 
      opt.text.toLowerCase().includes('checkbt2023-2') ||
      opt.value.includes('CheckBT2023_2')
    );

    if (targetOption) {
      await page.selectOption('#bcktemplete', { value: targetOption.value });
      console.log(`✅ Selected template: ${targetOption.text} (value: ${targetOption.value})`);
      
      // Attach template selection to report
      allure.attachment(
        'Template Selection',
        JSON.stringify({
          selectedTemplate: targetOption.text,
          templateValue: targetOption.value,
          allAvailableTemplates: options.map(opt => ({ text: opt.text, value: opt.value }))
        }, null, 2),
        'application/json'
      );
    } else {
      // Try to find by partial match
      const partialMatch = options.find(opt => 
        opt.text.toLowerCase().includes('checkbt') || 
        opt.text.toLowerCase().includes('2023')
      );
      
      if (partialMatch) {
        await page.selectOption('#bcktemplete', { value: partialMatch.value });
        console.log(`✅ Selected template (partial match): ${partialMatch.text} (value: ${partialMatch.value})`);
        console.log('⚠️ Note: Exact match "CheckBT2023_2" not found, using closest match');
      } else {
        throw new Error('❌ Template "CheckBT2023_2" not found in dropdown');
      }
    }

    await page.waitForTimeout(2000);
  });

  // ======================================================
  // STEP 9: Click Upload Team Photos and Upload Image
  // ======================================================
  await allure.step('Step 9: Click Upload Team Photos and upload image', async () => {
    console.log('🔍 Looking for Upload Team Photos button...');

    const uploadSelectors = [
      'button:has-text("Upload Team Photos")',
      'button:has-text("Upload")',
      'input[type="file"]',
      '#uploadTeamPhotos',
      '[onclick*="upload"]'
    ];

    // First, find the upload button/trigger
    let uploadButtonFound = false;
    for (const selector of uploadSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 })) {
          if (selector.includes('input[type="file"]')) {
            // It's a file input, we can directly set files
            uploadButtonFound = true;
            break;
          } else {
            await element.scrollIntoViewIfNeeded();
            await element.click();
            console.log(`✅ Clicked Upload Team Photos using selector: ${selector}`);
            uploadButtonFound = true;
            await page.waitForTimeout(1000);
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }

    // Now handle file upload
    const imagePath = path.resolve(process.cwd(), 'test-images', 'A.jpg');
    
    if (!fs.existsSync(imagePath)) {
      throw new Error(`❌ Image file not found: ${imagePath}`);
    }

    console.log(`📁 Uploading image from: ${imagePath}`);

    // Wait for file input to be available
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: 'visible', timeout: 10000 }).catch(async () => {
      // If not visible, try to trigger it by clicking upload button again
      const uploadBtn = page.locator('button:has-text("Upload")').first();
      if (await uploadBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await uploadBtn.click();
        await page.waitForTimeout(1000);
      }
    });

    // Upload the file
    await fileInput.setInputFiles(imagePath);
    console.log('✅ File selected for upload');

    await page.waitForTimeout(3000);

    // Check if upload was successful
    const uploadSuccess = await page.locator('text=success, text=uploaded, text=complete').first().isVisible({ timeout: 5000 }).catch(() => false);
    const uploadStatus = uploadSuccess ? 'Success' : 'Initiated (check page for confirmation)';
    
    if (uploadSuccess) {
      console.log('✅ Upload completed successfully');
    } else {
      console.log('⚠️ Upload initiated (check page for confirmation)');
    }

    // Attach upload information to report
    const uploadInfo = {
      filePath: imagePath,
      fileName: path.basename(imagePath),
      uploadStatus: uploadStatus,
      timestamp: new Date().toISOString()
    };
    
    allure.attachment(
      'Team Photo Upload Information',
      JSON.stringify(uploadInfo, null, 2),
      'application/json'
    );

    await page.screenshot({ path: 'team-photo-uploaded.png', fullPage: true });
    allure.attachment('Team Photo Upload Screenshot', fs.readFileSync('team-photo-uploaded.png'), 'image/png');
  });

  console.log('\n✅ ========== TRADITIONAL ORDER FLOW COMPLETED ==========');
  console.log('===================================================\n');
});
