import { test, expect } from '@playwright/test';
import fs from 'fs';
import { allure } from 'allure-playwright';

test.setTimeout(180000); // 3 minutes timeout

test('Order Status - Access Active Jobs and Select Job', async ({ page }) => {

  // ================================
  // ✅ ALLURE METADATA & LABELS
  // ================================
  allure.label("environment", "QA");
  allure.label("owner", "Rakhi");
  allure.label("epic", "Order Status Management");
  allure.label("feature", "Access Active Jobs");
  allure.label("story", "Login → Select T&I → Continue → Select Job");
  allure.severity("critical");
  allure.description("Order status: login, T&I, Continue, select job, Request Help (issue, team GOLD, player Devid I), file needed, checkout, payment, submit");

  const ORDER_STATUS_URL = 'https://staging.production.nextgenphotosolutions.com/orderstatus/activejobs';
  const EMAIL = 'rakhiqa@tiuconsulting.com';
  const PASSWORD = '123456';
  const TARGET_JOB_TEXT = 'Test_ALT_FC_26';
  // Request Help form (labels must match UI exactly)
  const REQUEST_HELP = {
    issueValue: '2',           // Design Individual Graphics
    teamLabel: 'GOLD',         // id=section2
    playerLabel: 'Devid I',    // id=player1
  };

  // ======================================================
  // STEP 1: Open Order Status URL
  // ======================================================
  await allure.step('Step 1: Open order status URL in Chrome browser', async () => {
    console.log(`🌐 Opening URL: ${ORDER_STATUS_URL}`);

    await page.goto(ORDER_STATUS_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const pageTitle = await page.title();
    const currentUrl = page.url();
    console.log(`✅ Page Loaded: ${pageTitle}`);
    console.log(`📄 Current URL: ${currentUrl}`);

    await page.screenshot({ path: 'order-status-page-loaded.png', fullPage: true });
    allure.attachment('Order Status Page Screenshot', fs.readFileSync('order-status-page-loaded.png'), 'image/png');
    allure.attachment('Page URL', currentUrl, 'text/plain');
  });

  // ======================================================
  // STEP 2: Login with Email and Password
  // ======================================================
  await allure.step('Step 2: Login with email and password', async () => {
    console.log('🔍 Looking for login form...');

    // Find email field
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[id*="email"]',
      'input[id*="Email"]',
      'input[placeholder*="email" i]',
      '#email',
      '#Email',
      '#username',
      'input[name="username"]'
    ];

    let emailField = null;
    for (const selector of emailSelectors) {
      try {
        const field = page.locator(selector).first();
        if (await field.isVisible({ timeout: 3000 })) {
          await field.fill(EMAIL);
          console.log(`✅ Email filled using selector: ${selector}`);
          emailField = field;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!emailField) {
      throw new Error('❌ Email field not found');
    }

    // Find password field
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[id*="password"]',
      '#password',
      '#Password'
    ];

    let passwordField = null;
    for (const selector of passwordSelectors) {
      try {
        const field = page.locator(selector).first();
        if (await field.isVisible({ timeout: 3000 })) {
          await field.fill(PASSWORD);
          console.log(`✅ Password filled using selector: ${selector}`);
          passwordField = field;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!passwordField) {
      throw new Error('❌ Password field not found');
    }

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'login-credentials-filled.png', fullPage: true });
    allure.attachment('Login Credentials Filled Screenshot', fs.readFileSync('login-credentials-filled.png'), 'image/png');
  });

  // ======================================================
  // STEP 3: Click Login Button
  // ======================================================
  await allure.step('Step 3: Click login button', async () => {
    console.log('🔍 Looking for login button...');

    const loginButtonSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Login")',
      'button:has-text("Sign In")',
      'button:has-text("Log in")',
      '#login',
      '#Login',
      '#btnLogin',
      '#submit',
      'form button',
      'form input[type="submit"]'
    ];

    let loginClicked = false;
    for (const selector of loginButtonSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 3000 })) {
          await button.click();
          console.log(`✅ Login button clicked using selector: ${selector}`);
          loginClicked = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!loginClicked) {
      throw new Error('❌ Login button not found');
    }

    // Wait for navigation after login
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const postLoginUrl = page.url();
    console.log(`📄 Post-login URL: ${postLoginUrl}`);

    // Check if login was successful (not still on login page)
    if (postLoginUrl.includes('/login')) {
      // Check for error messages
      const errorMessages = await page.locator('.error, .alert-danger, [role="alert"]').allTextContents().catch(() => []);
      if (errorMessages.length > 0) {
        console.log('❌ Login error messages:', errorMessages);
        allure.attachment('Login Error Messages', JSON.stringify(errorMessages, null, 2), 'application/json');
      }
      throw new Error(`❌ Login failed - still on login page. URL: ${postLoginUrl}`);
    }

    // Take screenshot with error handling
    try {
      await page.screenshot({ path: 'after-login.png', fullPage: true });
      allure.attachment('After Login Screenshot', fs.readFileSync('after-login.png'), 'image/png');
    } catch (e) {
      console.log('⚠️ Could not take screenshot after login:', e.message);
    }
  });

  // ======================================================
  // STEP 4: Click T&I Radio Button
  // ======================================================
  await allure.step('Step 4: Click T&I radio button', async () => {
    console.log('🔍 Looking for T&I radio button...');

    const tiRadioSelectors = [
      'input[type="radio"][value*="T&I"]',
      'input[type="radio"][value*="TI"]',
      'input[type="radio"][id*="ti"]',
      'input[type="radio"][name*="ti"]',
      'label:has-text("T&I")',
      'label:has-text("T & I")',
      'input[type="radio"]:near(text="T&I")'
    ];

    let tiSelected = false;
    for (const selector of tiRadioSelectors) {
      try {
        const radio = page.locator(selector).first();
        const isVisible = await radio.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (isVisible) {
          await radio.scrollIntoViewIfNeeded();
          if (selector.includes('label')) {
            await radio.click();
          } else {
            await radio.check();
          }
          console.log(`✅ T&I radio button clicked using selector: ${selector}`);
          tiSelected = true;
          await page.waitForTimeout(1000);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!tiSelected) {
      // Try finding by text content
      const clicked = await page.evaluate(() => {
        const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
        for (const radio of radios) {
          const label = radio.closest('label') || document.querySelector(`label[for="${radio.id}"]`);
          if (label && (label.textContent.includes('T&I') || label.textContent.includes('T & I'))) {
            radio.click();
            return true;
          }
        }
        return false;
      });

      if (clicked) {
        console.log('✅ T&I radio button clicked (via evaluate)');
        tiSelected = true;
      }
    }

    if (!tiSelected) {
      throw new Error('❌ T&I radio button not found');
    }

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'ti-radio-selected.png', fullPage: true });
    allure.attachment('T&I Radio Selected Screenshot', fs.readFileSync('ti-radio-selected.png'), 'image/png');
  });

  // ======================================================
  // STEP 5: Click Continue Button
  // ======================================================
  await allure.step('Step 5: Click Continue button', async () => {
    console.log('🔍 Looking for Continue button...');

    const continueSelectors = [
      'button:has-text("Continue")',
      'button:has-text("continue")',
      'input[type="submit"]:has-text("Continue")',
      'button[type="submit"]',
      '#continue',
      '#Continue',
      'button.btn-primary:has-text("Continue")',
      'a:has-text("Continue")'
    ];

    let continueClicked = false;
    for (const selector of continueSelectors) {
      try {
        const button = page.locator(selector).first();
        const isVisible = await button.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (isVisible) {
          await button.scrollIntoViewIfNeeded();
          await button.click();
          console.log(`✅ Continue button clicked using selector: ${selector}`);
          continueClicked = true;
          await page.waitForTimeout(2000);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!continueClicked) {
      // Try using evaluate
      const clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, input[type="submit"]'));
        const continueBtn = buttons.find(btn => 
          btn.textContent && btn.textContent.trim().toLowerCase().includes('continue')
        );
        if (continueBtn && continueBtn.offsetParent !== null) {
          continueBtn.click();
          return true;
        }
        return false;
      });

      if (clicked) {
        console.log('✅ Continue button clicked (via evaluate)');
        continueClicked = true;
      }
    }

    if (!continueClicked) {
      throw new Error('❌ Continue button not found');
    }

    // Wait for page to load after continue
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'after-continue.png', fullPage: true });
    allure.attachment('After Continue Screenshot', fs.readFileSync('after-continue.png'), 'image/png');
  });

  // ======================================================
  // STEP 6: Click Job with Text "Test_ALT_FC_26"
  // ======================================================
  await allure.step(`Step 6: Click job with text "${TARGET_JOB_TEXT}"`, async () => {
    console.log(`🔍 Looking for job: ${TARGET_JOB_TEXT}...`);

    // Wait for job list to load
    await page.waitForTimeout(2000);

    // Try multiple strategies to find the job
    const jobSelectors = [
      `text=${TARGET_JOB_TEXT}`,
      `a:has-text("${TARGET_JOB_TEXT}")`,
      `tr:has-text("${TARGET_JOB_TEXT}")`,
      `td:has-text("${TARGET_JOB_TEXT}")`,
      `div:has-text("${TARGET_JOB_TEXT}")`,
      `span:has-text("${TARGET_JOB_TEXT}")`
    ];

    let jobClicked = false;
    for (const selector of jobSelectors) {
      try {
        const jobElement = page.locator(selector).first();
        const isVisible = await jobElement.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (isVisible) {
          await jobElement.scrollIntoViewIfNeeded();
          await jobElement.click();
          console.log(`✅ Job clicked using selector: ${selector}`);
          jobClicked = true;
          await page.waitForTimeout(2000);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!jobClicked) {
      // Try finding in table rows
      const clicked = await page.evaluate((jobText) => {
        // Look for the text in all clickable elements
        const allElements = Array.from(document.querySelectorAll('a, tr, td, div, span, button'));
        for (const el of allElements) {
          if (el.textContent && el.textContent.includes(jobText)) {
            // If it's a table row, find the link inside it
            if (el.tagName === 'TR') {
              const link = el.querySelector('a');
              if (link) {
                link.click();
                return true;
              }
              el.click();
              return true;
            }
            el.click();
            return true;
          }
        }
        return false;
      }, TARGET_JOB_TEXT);

      if (clicked) {
        console.log(`✅ Job "${TARGET_JOB_TEXT}" clicked (via evaluate)`);
        jobClicked = true;
      }
    }

    if (!jobClicked) {
      // List all visible jobs for debugging
      const allJobs = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('a, tr, td, div'));
        return elements
          .filter(el => el.textContent && el.textContent.trim().length > 0)
          .map(el => el.textContent.trim())
          .filter(text => text.includes('Test_') || text.includes('ALT') || text.includes('FC'))
          .slice(0, 20);
      });

      console.log('📋 Available jobs found:', allJobs);
      allure.attachment('Available Jobs List', JSON.stringify(allJobs, null, 2), 'application/json');

      throw new Error(`❌ Job "${TARGET_JOB_TEXT}" not found. Available jobs: ${allJobs.join(', ')}`);
    }

    // Wait for navigation after clicking job
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const finalUrl = page.url();
    console.log(`📍 Final URL after clicking job: ${finalUrl}`);

    await page.screenshot({ path: 'job-selected.png', fullPage: true });
    allure.attachment('Job Selected Screenshot', fs.readFileSync('job-selected.png'), 'image/png');
    allure.attachment('Final URL', finalUrl, 'text/plain');

    console.log(`✅ Successfully clicked job: ${TARGET_JOB_TEXT}`);
  });

  // ======================================================
  // STEP 7: Click Request Help Tab
  // ======================================================
  await allure.step('Step 7: Click Request help tab', async () => {
    console.log('🔍 Looking for Request help tab...');

    const requestHelpSelectors = [
      'a:has-text("Request help")',
      'button:has-text("Request help")',
      'tab:has-text("Request help")',
      '[role="tab"]:has-text("Request help")',
      'li:has-text("Request help")',
      'div:has-text("Request help")',
      'span:has-text("Request help")'
    ];

    let requestHelpClicked = false;
    for (const selector of requestHelpSelectors) {
      try {
        const tab = page.locator(selector).first();
        const isVisible = await tab.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (isVisible) {
          await tab.scrollIntoViewIfNeeded();
          await tab.click();
          console.log(`✅ Request help tab clicked using selector: ${selector}`);
          requestHelpClicked = true;
          await page.waitForTimeout(2000);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!requestHelpClicked) {
      // Try using evaluate
      const clicked = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('a, button, [role="tab"], li, div, span'));
        const tab = elements.find(el => 
          el.textContent && el.textContent.trim().toLowerCase().includes('request help')
        );
        if (tab && tab.offsetParent !== null) {
          tab.click();
          return true;
        }
        return false;
      });

      if (clicked) {
        console.log('✅ Request help tab clicked (via evaluate)');
        requestHelpClicked = true;
      }
    }

    if (!requestHelpClicked) {
      throw new Error('❌ Request help tab not found');
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'request-help-tab.png', fullPage: true });
    allure.attachment('Request Help Tab Screenshot', fs.readFileSync('request-help-tab.png'), 'image/png');
  });

  // ======================================================
  // STEP 8: Select Issue Dropdown - id="hpcombo", "Design Individual Graphics" value=2
  // ======================================================
  await allure.step('Step 8: Select "Design Individual Graphics" from issue dropdown (id=hpcombo, value=2)', async () => {
    console.log('🔍 Looking for issue dropdown id=hpcombo...');

    await page.waitForTimeout(1500); // Wait for Request Help tab content to load

    const issueDropdown = page.locator('#hpcombo');
    await issueDropdown.waitFor({ state: 'visible', timeout: 5000 });

    await issueDropdown.scrollIntoViewIfNeeded();
    await issueDropdown.selectOption({ value: REQUEST_HELP.issueValue });
    console.log('✅ Issue "Design Individual Graphics" selected (id=hpcombo, value=2)');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'issue-selected.png', fullPage: true });
    allure.attachment('Issue Selected Screenshot', fs.readFileSync('issue-selected.png'), 'image/png');
  });

  // ======================================================
  // STEP 9: Select "GOLD" from Team Dropdown - id="section2"
  // ======================================================
  await allure.step('Step 9: Select GOLD from Team dropdown (id=section2)', async () => {
    console.log('🔍 Looking for Team dropdown id=section2 to select GOLD...');

    const teamDropdown = page.locator('#section2');
    await teamDropdown.waitFor({ state: 'visible', timeout: 5000 });
    await teamDropdown.scrollIntoViewIfNeeded();

    await teamDropdown.selectOption({ label: REQUEST_HELP.teamLabel });
    console.log('✅ GOLD selected from Team dropdown (id=section2)');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'team-gold-selected.png', fullPage: true });
    allure.attachment('Team GOLD Selected Screenshot', fs.readFileSync('team-gold-selected.png'), 'image/png');
  });

  // ======================================================
  // STEP 10: Select "Devid I" from Player Dropdown - id="player1"
  // ======================================================
  await allure.step('Step 10: Select Devid I from player dropdown (id=player1)', async () => {
    console.log('🔍 Looking for player dropdown id=player1 to select Devid I...');

    const playerDropdown = page.locator('#player1');
    await playerDropdown.waitFor({ state: 'visible', timeout: 5000 });
    await playerDropdown.scrollIntoViewIfNeeded();

    await playerDropdown.selectOption({ label: REQUEST_HELP.playerLabel });
    console.log('✅ Devid I selected from player dropdown (id=player1)');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'player-devid-selected.png', fullPage: true });
    allure.attachment('Player Devid I Selected Screenshot', fs.readFileSync('player-devid-selected.png'), 'image/png');
  });

  // ======================================================
  // STEP 11: Check file needed option - value=1, filename="_45TV"
  // ======================================================
  await allure.step('Step 11: Check "_45TV" from file needed option (value=1, filename=_45TV)', async () => {
    console.log('🔍 Looking for checkbox value=1 filename=_45TV...');

    const checkbox = page.locator('input[type="checkbox"][value="1"][filename="_45TV"]').first();
    await checkbox.waitFor({ state: 'visible', timeout: 5000 });

    await checkbox.scrollIntoViewIfNeeded();
    await checkbox.check();
    console.log('✅ _45TV checkbox checked (value=1, filename=_45TV)');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'file-needed-checked.png', fullPage: true });
    allure.attachment('File Needed Checked Screenshot', fs.readFileSync('file-needed-checked.png'), 'image/png');
  });

  // ======================================================
  // STEP 12: Click Check Out Button (value=frm2sbmtNxt)
  // ======================================================
  await allure.step('Step 12: Click Check Out button', async () => {
    console.log('🔍 Looking for Check Out button (value=frm2sbmtNxt)...');

    const checkoutBtn = page.locator('input[value="frm2sbmtNxt"], button[value="frm2sbmtNxt"], #frm2sbmtNxt').first();
    await checkoutBtn.waitFor({ state: 'visible', timeout: 5000 });
    await checkoutBtn.scrollIntoViewIfNeeded();
    await checkoutBtn.click();
    console.log('✅ Check Out button clicked');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'checkout-clicked.png', fullPage: true });
    allure.attachment('Check Out Clicked Screenshot', fs.readFileSync('checkout-clicked.png'), 'image/png');
  });

  // ======================================================
  // STEP 13: Select Payment Method - id=cmbPaymethods, value=1 (Use Saved Card details)
  // ======================================================
  await allure.step('Step 13: Select payment method (id=cmbPaymethods, value=1)', async () => {
    console.log('🔍 Looking for payment method dropdown id=cmbPaymethods...');

    const paymentDropdown = page.locator('#cmbPaymethods');
    await paymentDropdown.waitFor({ state: 'visible', timeout: 5000 });
    await paymentDropdown.scrollIntoViewIfNeeded();
    await paymentDropdown.selectOption({ value: '1' });
    console.log('✅ Use Saved Card details selected (value=1)');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'payment-mode-selected.png', fullPage: true });
    allure.attachment('Payment Method Selected Screenshot', fs.readFileSync('payment-mode-selected.png'), 'image/png');
  });

  // ======================================================
  // STEP 14: Select Card Number - id=vaultid123 (visible after payment method selected)
  // ======================================================
  await allure.step('Step 14: Select card from dropdown (id=vaultid123)', async () => {
    console.log('🔍 Looking for card dropdown id=vaultid123...');

    const cardDropdown = page.locator('#vaultid123');
    await cardDropdown.waitFor({ state: 'visible', timeout: 5000 });
    await cardDropdown.scrollIntoViewIfNeeded();
    // Select first saved card (index 1 = first option after "-- Select --" if present)
    const optionCount = await cardDropdown.locator('option').count();
    if (optionCount > 1) {
      await cardDropdown.selectOption({ index: 1 });
    } else {
      await cardDropdown.selectOption({ index: 0 });
    }
    console.log('✅ Card selected from vaultid123');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'card-number-selected.png', fullPage: true });
    allure.attachment('Card Selected Screenshot', fs.readFileSync('card-number-selected.png'), 'image/png');
  });

  // ======================================================
  // STEP 15: Click Submit Button - id=submitbutton
  // ======================================================
  await allure.step('Step 15: Click submit button (id=submitbutton)', async () => {
    console.log('🔍 Looking for submit button id=submitbutton...');

    const submitBtn = page.locator('#submitbutton');
    await submitBtn.waitFor({ state: 'visible', timeout: 5000 });
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();
    console.log('✅ Submit button clicked');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const finalUrl = page.url();
    console.log(`📍 Final URL after submit: ${finalUrl}`);

    await page.screenshot({ path: 'submit-completed.png', fullPage: true });
    allure.attachment('Submit Completed Screenshot', fs.readFileSync('submit-completed.png'), 'image/png');
    allure.attachment('Final URL After Submit', finalUrl, 'text/plain');

    console.log('✅ Successfully submitted the help request');
  });

  console.log('\n✅ ========== HELP REQUEST TEST COMPLETED ==========');
  console.log('===================================================\n');
});
