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
  allure.description("Opens order status page, logs in, selects T&I radio button, continues, and selects specific job");

  const ORDER_STATUS_URL = 'https://staging.production.nextgenphotosolutions.com/orderstatus/activejobs';
  const EMAIL = 'rakhiqa@tiuconsuting.com'; // User specified email
  const PASSWORD = '123456';
  const TARGET_JOB_TEXT = 'Test_ALT_FC_26';

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

    await page.screenshot({ path: 'after-login.png', fullPage: true });
    allure.attachment('After Login Screenshot', fs.readFileSync('after-login.png'), 'image/png');
  });

  // ======================================================
  // STEP 4: Click T&I Radio Button
  // ======================================================
  await allure.step('Step 4: Click T&I radio button', async () => {
    console.log('🔍 Looking for T&I radio button...');

    const tiRadioSelectors = [
      'input[type="radio"][value*="T&I"]',
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

  console.log('\n✅ ========== ORDER STATUS TEST COMPLETED ==========');
  console.log('===================================================\n');
});
