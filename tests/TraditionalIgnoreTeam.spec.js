import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import ftp from 'basic-ftp';
import { allure } from 'allure-playwright';
import { fileURLToPath } from 'url';
import { saveGeneratedLink } from '../utils/linkStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.setTimeout(420000); // 7 minutes (FTP upload of many files can take 2+ min)

test('Traditional job >> Ignore Team Images (Full flow)', async ({ page, request }) => {
  // ================================
  // ✅ METADATA
  // ================================
  allure.label('Environment', 'QA');
  allure.label('Owner', 'Rakhi');
  allure.label('Epic', 'GotPhoto Full Flow');
  allure.severity('critical');

  // ====== Declare Variables ======
  let jobId;
  let generatedLink;
  let jobName;
  let playersDetail;

  // ====== STEP 1: Create Job via API ======
  await allure.step('Create job and get generated order link Traditional', async () => {
    const apiUrl = 'https://staging.production.nextgenphotosolutions.com/Gpservices/pushData';
    const timestamp = Date.now();
    jobName = `Test_Staging_${timestamp}`;

    const payload = {
      firstname: 'Rakhi',
      lastname: 'Doijad',
      phone: '',
      country: 'CA',
      api_key: 'GP=Ha2xc0Rcc2less2=NG',
      job_name: jobName,
      alias_name: jobName,
      email_id: 'rakhiqa@tiuconsulting.com',
      editing_request_id: '407',
      redirect_success_url: 'https://gotphoto.com',
      players_detail: {
        0: {
          first_name: 'rakesh',
          last_name: 'pat',
          team_name: 'YANKEES',
          jersey_number: '11',
          team_image: 'A.jpg',
          individual_image1: 'B.jpg',
          individual_image2: 'C.jpg',
          individual_image3: 'D.jpg',
          individual_image4: 'E.jpg',
          individual_image5: 'F.jpg',
          individual_image6: 'G.jpg',
          individual_image7: 'H.jpg',
          individual_image8: 'I.jpg',
          individual_image9: 'J.jpg',
          individual_image10: 'K.jpg',
          individual_image11: 'L.jpg',
          individual_image12: 'M.jpg',
          individual_image13: 'N.jpg',
          individual_image14: 'O.jpg',
          access_code: '12A1'
        },
        1: {
          first_name: 'Ana',
          last_name: 'A',
          team_name: 'YANKEES',
          jersey_number: '11',
          team_image: 'L.jpg',
          individual_image1: 'M.jpg',
          individual_image2: 'N.jpg',
          access_code: '12A1'
        },
        2: {
          first_name: 'TOM',
          last_name: 'D',
          team_name: 'Winners',
          jersey_number: '11',
          team_image: 'P.jpg',
          individual_image1: 'O.jpg',
          individual_image2: '',
          individual_image3: '',
          individual_image4: '',
          individual_image5: '',
          access_code: '12A7'
        }
      }
    };

    console.log(`➡️ Creating Job: ${jobName}`);
    const response = await request.post(apiUrl, {
      headers: { 'Content-Type': 'application/json' },
      data: payload
    });

    expect(response.ok()).toBeTruthy();
    const responseBody = await response.json();
    console.log('✅ API Response:', JSON.stringify(responseBody, null, 2));

    jobId = responseBody.nextgen_job_id || responseBody.job_id || responseBody.jobId || responseBody.id;
    expect(jobId).toBeTruthy();
    console.log(`📌 Job ID: ${jobId}`);

    generatedLink =
      responseBody.checkout_url ||
      responseBody.redirect_link ||
      responseBody.order_url ||
      responseBody.link ||
      responseBody.url;

    expect(generatedLink).toBeTruthy();
    console.log(`🔗 Generated Link: ${generatedLink}`);

    playersDetail = payload.players_detail;

    // save link for future cross-tests
    try {
      saveGeneratedLink(generatedLink);
    } catch (e) {
      console.warn('saveGeneratedLink failed', e.message);
    }
  });

  // ====== SAVE FILE ======
  const outputPath = path.resolve(process.cwd(), 'generatedData.json');
  fs.writeFileSync(outputPath, JSON.stringify({ jobId, generatedLink, jobName }, null, 2));
  console.log(`✅ Saved generatedData.json to: ${outputPath}`);

  // ====== STEP 2: OPEN GENERATED LINK ======
  await allure.step('Open generated order link in browser', async () => {
    console.log(`🌐 Navigating to: ${generatedLink}`);
    await page.goto(generatedLink, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(2000);
    await page.waitForFunction(() => document.title && document.title.length > 0, { timeout: 10000 }).catch(() => {});
    const pageTitle = await page.title();
    console.log(`✅ Page Title: ${pageTitle}`);

    await page.screenshot({ path: 'order-page-loaded.png', fullPage: true });
    allure.attachment('Order page', fs.readFileSync('order-page-loaded.png'), 'image/png');
  });

  // ====== STEP 2A: HANDLE LOGIN PAGE IF PRESENT (then click Confirm) ======
  await allure.step('Handle login page and click Confirm if present', async () => {
    const url = page.url();
    if (!url.includes('login') && !url.includes('Login')) {
      console.log('ℹ Not on login page, skipping login step.');
      return;
    }
    console.log('🔐 Login page detected, filling credentials and clicking Confirm...');

    const email = 'rakhiqa@tiuconsulting.com';
    const password = '123456';

    const emailField = page.locator('input[type="email"], input[name="email"], input[id*="email"], #email, #username').first();
    const passwordField = page.locator('input[type="password"], input[name="password"], #password').first();
    await emailField.waitFor({ state: 'visible', timeout: 10000 });
    await emailField.fill(email);
    await passwordField.fill(password);
    console.log('✔ Filled email and password');
    await page.waitForTimeout(500);

    const confirmOrLoginSelectors = [
      'button:has-text("Confirm")',
      'input[type="submit"][value*="Confirm" i]',
      'button:has-text("Login")',
      'button:has-text("Log in")',
      'input[type="submit"]',
      '#login',
      '#Login',
      'button[type="submit"]',
      '.btn-primary',
      '.btn-success',
      'form button[type="submit"]',
      'a:has-text("Confirm")',
      'button:has-text("confirm")'
    ];
    let submitted = false;
    for (const sel of confirmOrLoginSelectors) {
      try {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await btn.scrollIntoViewIfNeeded();
          await btn.click({ force: true, timeout: 5000 });
          console.log('✔ Clicked Confirm/Login button:', sel);
          submitted = true;
          break;
        }
      } catch (e) {
        // try next
      }
    }
    if (!submitted) {
      throw new Error('Could not find or click Confirm/Login button on login page.');
    }
    await page.waitForTimeout(3000);
    await page.waitForURL(/checkout|order|jobno/i, { timeout: 15000 }).catch(() => {});
    console.log('✔ Post-login URL:', page.url());
  });

  // ====== STEP 2B: SELECT TRADITIONAL OPTION AND HANDLE POPUPS ======
  await allure.step('Select Traditional job and handle popups', async () => {
    // Wait for options to be present
    await page.waitForSelector('img[alt="Traditional Memorymate"], img[src*="Traditional Memorymate"], #ch_td', { state: 'visible', timeout: 15000 }).catch(() => {});

    let clicked = false;

    // 1) Try checkbox #ch_td first (used by app for Traditional)
    try {
      const chTd = page.locator('#ch_td');
      if ((await chTd.count()) > 0) {
        await chTd.scrollIntoViewIfNeeded();
        const visible = await chTd.isVisible().catch(() => false);
        if (visible) {
          await chTd.check({ timeout: 5000 });
          console.log('✔ Selected Traditional via #ch_td checkbox');
          clicked = true;
        } else {
          await page.evaluate(() => {
            const cb = document.querySelector('#ch_td');
            if (cb) {
              cb.checked = true;
              cb.dispatchEvent(new Event('change', { bubbles: true }));
              cb.dispatchEvent(new Event('click', { bubbles: true }));
            }
          });
          console.log('✔ Set Traditional via #ch_td (evaluate)');
          clicked = true;
        }
      }
    } catch (e) {
      // continue to image click
    }

    // 2) If not yet selected, click the Traditional image (not Traditional Plus)
    if (!clicked) {
      const imgSelectors = [
        'img[alt="Traditional Memorymate"]',
        'img[src*="Traditional Memorymate.jpg"]',
        'img[src*="Traditional%20Memorymate.jpg"]'
      ];
      for (const sel of imgSelectors) {
        try {
          const loc = page.locator(sel).first();
          if ((await loc.count()) > 0) {
            const src = (await loc.getAttribute('src')) || '';
            const alt = (await loc.getAttribute('alt')) || '';
            if ((src + alt).toLowerCase().includes('plus')) continue;
            await loc.scrollIntoViewIfNeeded();
            await loc.waitFor({ state: 'visible', timeout: 5000 });
            await loc.click({ force: true, timeout: 5000 });
            console.log('✔ Clicked Traditional image:', sel);
            clicked = true;
            break;
          }
        } catch (e) {
          // next selector
        }
      }
    }

    // 3) Ensure hidden checkbox #ch_td is checked (required by app)
    if (clicked) {
      await page.evaluate(() => {
        const cb = document.querySelector('#ch_td');
        if (cb) {
          cb.checked = true;
          cb.dispatchEvent(new Event('change', { bubbles: true }));
          cb.dispatchEvent(new Event('click', { bubbles: true }));
        }
      });
      await page.waitForTimeout(800);
    }

    if (!clicked) {
      console.warn('⚠ Could not select Traditional option. Proceeding anyway.');
    }

    // ===== POPUP 1: confirmation about changing data — wait for modal then click Confirm =====
    try {
      await page.waitForTimeout(1200);
      // Wait for bootbox/modal to appear
      await page.waitForSelector('.bootbox, .modal.show, .modal.in', { state: 'visible', timeout: 10000 }).catch(() => null);

      const confirmSelectors = [
        '.bootbox .modal-footer button:has-text("Confirm")',
        '.bootbox .btn-primary',
        '.bootbox .btn-success',
        '.modal-footer button:has-text("Confirm")',
        '.modal .btn-primary:has-text("Confirm")',
        'button.bootbox-accept',
        'button:has-text("Confirm")',
        'button:has-text("OK")',
        'button:has-text("Yes")',
        '.bootbox .modal-footer .btn-primary',
        '.bootbox .modal-footer .btn-success'
      ];
      let confirmed = false;
      for (const sel of confirmSelectors) {
        try {
          const loc = page.locator(sel).first();
          await loc.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
          if (await loc.isVisible().catch(() => false)) {
            await loc.scrollIntoViewIfNeeded();
            await loc.click({ force: true, timeout: 5000 });
            console.log('✔ Clicked Confirm on first popup (selector: ' + sel + ')');
            confirmed = true;
            break;
          }
        } catch (e) {
          // next selector
        }
      }
      if (!confirmed) {
        const lastFooter = page.locator('.bootbox .modal-footer button').last();
        if (await lastFooter.isVisible({ timeout: 2000 }).catch(() => false)) {
          await lastFooter.click({ force: true, timeout: 5000 });
          console.log('✔ Clicked last footer button (Confirm)');
        }
      }
      await page.waitForTimeout(600);
    } catch (e) {
      console.warn('⚠ First popup confirm not found/clicked:', e.message);
    }

    // ===== POPUP 2: "You have images in the team column..." / Ignore team images =====
    try {
      // Wait for either the textual message OR the bootbox modal footer
      await Promise.race([
        page.waitForSelector('text=You have images in the team column', { timeout: 8000 }).catch(() => {}),
        page.waitForSelector('.bootbox .modal-footer', { timeout: 12000 }).catch(() => {})
      ]);

      // Best-effort: locate the ignore button inside bootbox modal-footer (case-sensitive text in page may be lower-case)
      const ignoreBtn = page.locator('.bootbox .modal-footer button').filter({ hasText: /Ignore\s*team\s*images/i });

      if ((await ignoreBtn.count()) > 0) {
        await ignoreBtn.first().click();
        console.log('✔ Clicked Ignore team images (bootbox)');
      } else {
        // fallback: try text click (case-insensitive)
        const textCandidates = ['text=Ignore team images', 'text=Ignore Team Images', 'text=Ignore team images'];
        let clickedIgnore = false;
        for (const t of textCandidates) {
          try {
            await page.click(t, { timeout: 4000 });
            console.log('✔ Clicked Ignore team images (text click):', t);
            clickedIgnore = true;
            break;
          } catch (e) {
            // continue
          }
        }
        if (!clickedIgnore) {
          // As last resort, click first bootbox footer button (cancel is usually ignore)
          const footerBtn = page.locator('.bootbox .modal-footer button').first();
          if ((await footerBtn.count()) > 0) {
            await footerBtn.click();
            console.log('✔ Clicked first bootbox footer button as fallback (assumed Ignore)');
          } else {
            console.warn('⚠ Ignore team images button not found by any strategy');
          }
        }
      }
    } catch (e) {
      console.warn('⚠ Second popup (Ignore Team Images) not found or not clickable:', e.message);
    }

    await page.waitForTimeout(1000);
  });

  // ====== STEP 2C: SELECT BACKGROUND & TEMPLATE ======
  await allure.step('Select background and template', async () => {
    try {
      await page.waitForSelector('#bgsinglecheck_s', { timeout: 15000 });
      await page.click('#bgsinglecheck_s');
      console.log('✔ Clicked Single Check background (#bgsinglecheck_s)');
      await page.waitForSelector('#bcktemplete', { timeout: 15000 });
      await page.selectOption('#bcktemplete', '818');
      console.log('✔ Selected template 818 (Test_BG_Dropin Temp_A)');
    } catch (e) {
      if (e.message && /closed|Target page|context or browser has been closed/i.test(e.message)) {
        throw new Error(`Page was closed before or during background/template step. Ensure Traditional option and popups were handled correctly. Original: ${e.message}`);
      }
      console.warn('⚠ Could not select background/template:', e.message);
    }
    await page.waitForTimeout(1500);
  });

  // ===========================
  // 📌 Step: Upload TP Images
  // ===========================
  await allure.step('Upload TP images via file input', async () => {
    // Scroll to make file input visible
    await page.evaluate(() => window.scrollBy(0, 300));

    // Wait for upload section
    await page.waitForSelector('#upload_tp_files', { timeout: 15000 });
    console.log('📤 Starting image upload process...');

    const fileInput = page.locator('#upload_tp_files');
    const filePath1 = path.join(__dirname, '../test-data/A.jpg');
    const filePath2 = path.join(__dirname, '../test-data/B.jpg');

    // sanity checks for files
    if (!fs.existsSync(filePath1) || !fs.existsSync(filePath2)) {
      console.warn('⚠ One or more test files missing:', filePath1, filePath2);
    }

    await fileInput.setInputFiles([filePath1, filePath2]);
    await page.waitForTimeout(1500);
    const finalUploadBtn = page.locator('#upload_tp_filesBtn');
    await finalUploadBtn.waitFor({ state: 'visible', timeout: 10000 });
    await finalUploadBtn.click();
    console.log('✅ Clicked final active upload button (#upload_tp_filesBtn)');
    await page.waitForTimeout(1500);
  });

  // ===========================
  // 📌 Step: Select Team from Dropdowns
  // ===========================
  await allure.step('Select Teams from dropdowns', async () => {
    try {
      await page.waitForSelector('#team-table select[name="upload_photo_team[]"]', { timeout: 15000 });

      const dropdowns = page.locator('#team-table select[name="upload_photo_team[]"]');
      const dropdownCount = await dropdowns.count();
      console.log(`🟢 Found ${dropdownCount} team dropdown(s)`);

      if (dropdownCount > 0) {
        await dropdowns.nth(0).selectOption({ label: 'Winners' });
        console.log('✅ Selected team "Winners" in first dropdown');
      }
      if (dropdownCount > 1) {
        await dropdowns.nth(1).selectOption({ label: 'YANKEES' });
        console.log('✅ Selected team "YANKEES" in second dropdown');
      }
    } catch (e) {
      console.warn('⚠ Could not select teams from dropdowns:', e.message);
    }
    await page.waitForTimeout(1000);

    // Click Save button for team upload (more robust selectors)
    try {
      const saveSelectors = [
        "[onclick='submitData_forTeamUpload()']",
        "button:has-text('Save')",
        "input[type='button'][value*='Save']",
        "input[type='submit'][value*='Save']",
        "#submitData_forTeamUpload"
      ];

      let clickedSave = false;
      for (const sel of saveSelectors) {
        try {
          const btn = page.locator(sel).first();
          if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await btn.scrollIntoViewIfNeeded().catch(() => {});
            await btn.click({ force: true, timeout: 3000 });
            console.log(`💾 Clicked on Save button using selector: ${sel}`);
            clickedSave = true;
            break;
          }
        } catch {
          // try next selector
        }
      }

      if (!clickedSave) {
        // Last-resort: click via DOM evaluate
        await page.evaluate(() => {
          const byOnclick = document.querySelector("[onclick='submitData_forTeamUpload()']");
          const byText = Array.from(document.querySelectorAll('button,input'))
            .find(el => {
              const txt = (el.textContent || (el instanceof HTMLInputElement ? el.value : '') || '').toLowerCase();
              return txt.includes('save');
            });
          const btn = (byOnclick || byText);
          if (btn && btn instanceof HTMLElement) {
            btn.scrollIntoView({ block: 'center' });
            btn.click();
          }
        });
        console.log('💾 Clicked on Save button via evaluate fallback');
      }
    } catch (e) {
      console.warn('⚠ Could not click Save button:', e.message);
    }

    await new Promise(r => setTimeout(r, 1500));
    const msg = await page.locator('#msg, .alert-success').textContent().catch(() => null);
    console.log('📨 Upload message:', msg);
    await new Promise(r => setTimeout(r, 1000));
  });

  // ====== PRINT BUNDLES PER PLAYER (from API payload) ======
  await allure.step('Print bundles per player and list of images', async () => {
    console.log('\n========== BUNDLES PER PLAYER (from API payload) ==========\n');
    const bundleReport = [];
    const keys = Object.keys(playersDetail || {}).filter(k => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
    for (const key of keys) {
      const p = playersDetail[key];
      const firstName = p.first_name || '';
      const lastName = p.last_name || '';
      const playerName = `${firstName} ${lastName}`.trim();
      const teamImage = p.team_image || '';
      const images = [];
      for (let i = 1; i <= 15; i++) {
        const val = p[`individual_image${i}`];
        if (val && String(val).trim()) images.push(`image${i}:${val}`);
      }
      const imageCount = images.length;
      let bundleCode = 'No Images';
      if (imageCount === 1) bundleCode = 'S';
      else if (imageCount === 2) bundleCode = 'R';
      else if (imageCount >= 3 && imageCount <= 5) bundleCode = 'L';
      else if (imageCount >= 6 && imageCount <= 10) bundleCode = 'XL';
      else if (imageCount >= 11 && imageCount <= 15) bundleCode = 'UL';
      const totalImages = (teamImage ? 1 : 0) + imageCount;
      console.log(`Player: ${playerName}`);
      console.log(`  Team Image: ${teamImage || 'None'}`);
      console.log(`  Individual Images: ${images.join(', ') || 'None'}`);
      console.log(`  Image Count: ${imageCount} | Bundle: ${bundleCode} | Total: ${totalImages}`);
      console.log('-----------------------------------------------------');
      bundleReport.push({ player: playerName, teamImage: teamImage || 'None', images, imageCount, bundleCode, totalImages });
    }
    allure.attachment('Bundles per player', JSON.stringify(bundleReport, null, 2), 'application/json');
    console.log('\n✅ Printed bundles for', bundleReport.length, 'players\n');
  });

  
  // ====== STEP 2G: UNIQUE COLOR FOR EACH TEAM IN ORGANIZATION ======
  await allure.step('Select Unique color for each team in organization', async () => {
    console.log('📍 Section: Unique color for each team in organization');
    try {
      await page.waitForSelector('#teamcolorY', { timeout: 10000 });
      await page.click('#teamcolorY');
      console.log('✔ Selected Team Color (#teamcolorY)');
    } catch (e) {
      console.warn('⚠ Could not click #teamcolorY:', e.message);
    }
    await page.waitForTimeout(1000);
  });

  // ====== STEP 2H: COLOR CORRECTION ======
  await allure.step('Enable Color Correction', async () => {
    try {
      const ccText = page.locator('text=Color Correction');
      if ((await ccText.count()) > 0) await ccText.first().scrollIntoViewIfNeeded();
      await page.waitForSelector('#ccservices', { timeout: 10000 });
      await page.click('#ccservices');
      console.log('✔ Clicked Color Correction (#ccservices)');
    } catch (e) {
      console.warn('⚠ Could not click #ccservices:', e.message);
    }
    await page.waitForTimeout(1000);
  });

  // ====== SELECT ALTERNATE POSE GRAPHIC OPTIONS (Images 1-15, 45V & MM if enabled) ======
  await allure.step('Select Alternate Pose Graphic Options for images 1-15 (45V & MM)', async () => {
    console.log('\n========== SELECT ALTERNATE POSE GRAPHIC OPTIONS (45V & MM) ==========\n');
    try {
      const altTable = page.locator('#altPoseTbl');
      await altTable.waitFor({ state: 'visible', timeout: 15000 }).catch(() => null);
      if (await altTable.count() === 0) {
        console.log('ℹ Alternate Pose table (#altPoseTbl) not found. Skipping selection.');
        return;
      }
      await altTable.scrollIntoViewIfNeeded().catch(() => {});

      const idsToSelect = [];
      for (let i = 1; i <= 15; i++) {
        idsToSelect.push(`alt${i}_45V`, `alt${i}_MM`);
      }

      for (const id of idsToSelect) {
        const locator = page.locator(`#${id}`);
        const count = await locator.count();
        if (!count) {
          // console.log(`ℹ Checkbox #${id} not found, skipping.`);
          continue;
        }
        try {
          const disabled = await locator.isDisabled().catch(() => false);
          if (disabled) {
            console.log(`ℹ Checkbox #${id} is disabled; not selecting.`);
            continue;
          }
          await locator.scrollIntoViewIfNeeded().catch(() => {});
          await locator.check({ timeout: 3000 }).catch(async () => {
            await locator.click({ timeout: 3000 });
          });
          console.log(`✔ Selected Alternate Pose checkbox #${id}`);
        } catch (e) {
          console.warn(`⚠ Could not select checkbox #${id}: ${e.message}`);
        }
      }
      console.log('\n✅ Finished selecting Alternate Pose options where enabled.\n');
    } catch (e) {
      console.warn('⚠ Error while selecting Alternate Pose Graphic Options:', e.message);
    }
  });

  // ====== PRINT ALTERNATE POSE GRAPHIC OPTIONS (selected / not selected) ======
  await allure.step('Print Alternate Pose Graphic Options (selected and not selected)', async () => {
    console.log('\n========== ALTERNATE POSE GRAPHIC OPTIONS ==========\n');
    await page.waitForSelector('#altPoseTbl', { timeout: 15000 }).catch(() => null);
    const rows = await page.$$('#altPoseTbl tr').catch(() => []);
    const graphicsSelectionData = [];
    for (let i = 1; i < rows.length - 1; i++) {
      try {
        const row = rows[i];
        const graphicName = await row.$eval('td:first-child', el => el.innerText.trim()).catch(() => '');
        if (!graphicName) continue;
        const checkboxes = await row.$$('input[type="checkbox"]');
        const selectedImages = [];
        const notSelectedImages = [];
        for (let colIndex = 0; colIndex < checkboxes.length; colIndex++) {
          const checkbox = checkboxes[colIndex];
          const checked = await checkbox.isChecked().catch(() => false);
          const disabled = await checkbox.isDisabled().catch(() => false);
          const imageColumn = `Image${colIndex + 1}`;
          if (disabled) continue;
          if (checked) selectedImages.push(imageColumn);
          else notSelectedImages.push(imageColumn);
        }
        console.log(`Graphic: ${graphicName}`);
        console.log(`  Selected For: ${selectedImages.length > 0 ? selectedImages.join(', ') : 'None'}`);
        console.log(`  Not Selected For: ${notSelectedImages.length > 0 ? notSelectedImages.join(', ') : 'None'}`);
        console.log('-----------------------------------------------------');
        graphicsSelectionData.push({ graphicName, selectedFor: selectedImages, notSelectedFor: notSelectedImages });
      } catch (err) {
        console.warn(`⚠ Row ${i}: ${err.message}`);
      }
    }
    if (graphicsSelectionData.length > 0) {
      allure.attachment('Alternate Pose Graphic Options', JSON.stringify(graphicsSelectionData, null, 2), 'application/json');
      console.log(`\n✅ Total graphics: ${graphicsSelectionData.length}\n`);
    } else {
      console.log('ℹ No Alternate Pose Graphics table or rows found (may not exist for Traditional).\n');
    }
  });

 
  

  // ====== STEP 5: APPLY DISCOUNT CODE ======
  await allure.step('Apply discount code', async () => {
    console.log('🔍 Looking for discount code input...');
    try {
      const discountInput = page.locator('#discount_code');
      await discountInput.waitFor({ state: 'visible', timeout: 15000 });
      await discountInput.scrollIntoViewIfNeeded();

      // Ensure field is editable (remove readonly/disabled if present)
      await discountInput.evaluate(el => {
        el.removeAttribute('readonly');
        el.removeAttribute('disabled');
        // @ts-ignore
        el.disabled = false;
      }).catch(() => {});

      await discountInput.fill('');
      await discountInput.fill('100OFF');
      console.log('✅ Entered discount code: 100OFF');

      await new Promise(r => setTimeout(r, 500));

      const redeemBtn = page.locator('#Redeem');
      await redeemBtn.waitFor({ state: 'visible', timeout: 10000 });
      await redeemBtn.scrollIntoViewIfNeeded();
      await redeemBtn.click();
      console.log('✅ Clicked Redeem');

      await new Promise(r => setTimeout(r, 3000));

      const discountTotal = await page.locator('#disctotl').textContent().catch(() => '0');
      console.log(`💰 Discount Applied: ${discountTotal}`);
    } catch (e) {
      console.warn('⚠️ Could not apply discount code:', e.message);
      throw e;
    }
  });

  // ====== STEP 6: CLICK PAY NOW ======
  await allure.step('Click Pay Now to complete order', async () => {
    await page.locator('#btnpaynow').scrollIntoViewIfNeeded();
    await page.click('#btnpaynow');
    console.log('✅ Clicked "Pay Now"');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'after-click-paynow.png', fullPage: true });
    allure.attachment('After paynow', fs.readFileSync('after-click-paynow.png'), 'image/png');
  });

  // ====== STEP 7: WAIT FOR ORDER CONFIRMATION ======
  await allure.step('Wait for order confirmation page', async () => {
    console.log('⏳ Waiting for confirmation page...');

    try {
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    } catch (e) {
      console.warn('⚠️ Network idle timeout - continuing anyway');
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'order-confirmation.png', fullPage: true });
    allure.attachment('Order confirmation', fs.readFileSync('order-confirmation.png'), 'image/png');

    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    const pageContent = await page.content();

    if (pageContent.includes('success') || pageContent.includes('Thank you') || pageContent.includes('confirmation')) {
      console.log('✅ Confirmation indicators found on page');
    }
  });

  // ====== STEP 8: FTP Upload (send images to job folder) ======
  await allure.step('Upload images to FTP folder (input/photos)', async () => {
    const client = new ftp.Client(30000);
    client.ftp.verbose = false;

    const FTP_HOST = 'staging.production.nextgenphotosolutions.com';
    const FTP_USER = 'imageprocessing@staging.production.nextgenphotosolutions.com';
    const FTP_PASSWORD = '5Z6$7I*L7Z-k';

    const remotePhotosDir = `/gotphoto/input/${jobName}/photos`;
    const localDir = path.resolve(__dirname, '../test-images/images');

    try {
      let files = [];
      if (fs.existsSync(localDir)) {
        files = fs.readdirSync(localDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
      } else {
        console.warn(`⚠ Local image folder not found at ${localDir}. Trying fallbacks.`);
        const fallbackCandidates = [
          path.resolve(__dirname, '../test-images/tp-upload'),
          path.resolve(process.cwd(), 'test-images/images')
        ];
        for (const c of fallbackCandidates) {
          if (fs.existsSync(c)) {
            console.log(`ℹ Falling back to ${c}`);
            files = fs.readdirSync(c).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
            if (files.length > 0) {
              // update localDir for upload
              localDir = c; // note: reassign to upload from this fallback
              break;
            }
          }
        }
      }

      if (files.length === 0) {
        throw new Error(`❌ No image files found in local folders.`);
      }

      console.log(`📂 Found ${files.length} images for FTP upload: ${files.join(', ')}`);

      await client.access({
        host: FTP_HOST,
        user: FTP_USER,
        password: FTP_PASSWORD,
        secure: false,
        secureOptions: { rejectUnauthorized: false }
      });

      await client.ensureDir(remotePhotosDir);
      await client.clearWorkingDir().catch(() => {}); // ignore if fails

      for (const file of files) {
        const localFilePath = path.join(localDir, file);
        await client.uploadFrom(localFilePath, file);
        console.log(`✔ Uploaded: ${file}`);
      }

      console.log(`🎉 Upload complete! Total uploaded: ${files.length}`);

      allure.attachment('Uploaded Files (FTP)', JSON.stringify(files, null, 2), 'application/json');
    } catch (err) {
      console.error(`❌ FTP Error: ${err.message}`);
      throw err;
    } finally {
      client.close();
      console.log('🔒 FTP connection closed');
    }
  });

  // ====== STEP 9: CONFIRM IMAGE TRANSFERRED VIA API ======
  await allure.step('Confirm image transferred via API', async () => {
    const confirmUrl = 'https://staging.production.nextgenphotosolutions.com/Gpservices/confirmimagetransferred';
    const payload = {
      api_key: 'GP=Ha2xc0Rcc2less2=NG',
      job_id: String(jobId || ''),
      img_transferred: 'Y'
    };

    console.log('\n📡 Calling Confirm Image Transferred API with payload:', JSON.stringify(payload, null, 2));

    const response = await request.post(confirmUrl, {
      headers: { 'Content-Type': 'application/json' },
      data: payload
    });

    expect(response.ok()).toBeTruthy();

    let responseBody;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = { text: await response.text() };
    }

    console.log('✅ Confirm Image Transferred response:', JSON.stringify(responseBody, null, 2));
    allure.attachment('Confirm Image Transferred Response', JSON.stringify(responseBody, null, 2), 'application/json');
  });

  console.log('\n✅ ========== TEST COMPLETED SUCCESSFULLY ==========');
  console.log(`📌 Job ID: ${jobId}`);
  console.log(`🔗 Generated Link: ${generatedLink}`);
  console.log(`📁 Job Name: ${jobName}`);
  console.log('===================================================\n');
});
