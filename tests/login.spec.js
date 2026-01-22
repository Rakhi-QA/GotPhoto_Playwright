import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

test.setTimeout(60000); // 1 minute timeout per test

const LOGIN_URL = 'https://staging.production.nextgenphotosolutions.com/';
const VALID_EMAIL = 'rakhiqa@tiuconsulting.com';
const VALID_PASSWORD = '123456';

// ============================================================
// ========== HELPER FUNCTIONS ===============================
// ============================================================

/**
 * Find and return email field locator
 */
async function findEmailField(page) {
  const emailSelectors = [
    'input[type="email"]',
    'input[name="email"]',
    'input[id*="email"]',
    'input[id*="Email"]',
    'input[placeholder*="email" i]',
    'input[placeholder*="Email" i]',
    '#email',
    '#Email',
    '#username',
    '#user_email',
    'input[name="username"]',
    'input[id="username"]'
  ];

  for (const selector of emailSelectors) {
    try {
      const field = page.locator(selector).first();
      if (await field.isVisible({ timeout: 2000 })) {
        console.log(`✅ Email field found using selector: ${selector}`);
        return field;
      }
    } catch (e) {
      continue;
    }
  }
  throw new Error('❌ Email field not found. Please check the page selectors.');
}

/**
 * Find and return password field locator
 */
async function findPasswordField(page) {
  const passwordSelectors = [
    'input[type="password"]',
    'input[name="password"]',
    'input[id*="password"]',
    'input[id*="Password"]',
    'input[placeholder*="password" i]',
    '#password',
    '#Password'
  ];

  for (const selector of passwordSelectors) {
    try {
      const field = page.locator(selector).first();
      if (await field.isVisible({ timeout: 2000 })) {
        console.log(`✅ Password field found using selector: ${selector}`);
        return field;
      }
    } catch (e) {
      continue;
    }
  }
  throw new Error('❌ Password field not found. Please check the page selectors.');
}

/**
 * Find and click login button
 */
async function clickLoginButton(page) {
  const loginButtonSelectors = [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Login")',
    'button:has-text("Sign In")',
    'button:has-text("Log in")',
    'button:has-text("LOGIN")',
    '#login',
    '#Login',
    '#btnLogin',
    '#submit',
    '#signin',
    'form button',
    'form input[type="submit"]',
    'button.btn-primary',
    'input.btn-primary'
  ];

  for (const selector of loginButtonSelectors) {
    try {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 2000 })) {
        await button.click();
        console.log(`✅ Login button clicked using selector: ${selector}`);
        return true;
      }
    } catch (e) {
      continue;
    }
  }
  throw new Error('❌ Login button not found. Please check the page selectors.');
}

/**
 * Navigate to login page
 */
async function navigateToLoginPage(page) {
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const currentUrl = page.url();
  console.log('📄 Current URL:', currentUrl);
  expect(currentUrl).toContain('nextgenphotosolutions.com');
  return currentUrl;
}

/**
 * Check if error message is displayed
 */
async function checkErrorMessage(page, expectedErrorText = null) {
  const errorSelectors = [
    '.error',
    '.alert-danger',
    '.alert-error',
    '.error-message',
    '[role="alert"]',
    '.invalid-feedback',
    '.text-danger',
    '#error',
    '#Error'
  ];

  for (const selector of errorSelectors) {
    try {
      const errorElement = page.locator(selector).first();
      if (await errorElement.isVisible({ timeout: 2000 })) {
        const errorText = await errorElement.textContent();
        console.log(`⚠️ Error message found: ${errorText}`);
        if (expectedErrorText) {
          expect(errorText).toContain(expectedErrorText);
        }
        return errorText;
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

/**
 * Check if still on login page
 */
async function isOnLoginPage(page) {
  const currentUrl = page.url();
  const pageTitle = await page.title().catch(() => '');
  const hasPasswordField = await page.locator('input[type="password"]').isVisible().catch(() => false);
  
  return currentUrl.includes('/login') || 
         pageTitle.toLowerCase().includes('login') ||
         hasPasswordField;
}

// ============================================================
// ========== POSITIVE TEST CASE =============================
// ============================================================
// Scenario: User logs in with valid email & password.
// Expected: Login succeeds and user is navigated away from login page.

test('Auth | Login | Valid credentials (happy path)', async ({ page }) => {
  
  // Standard Allure labels (lowercase keys so they show correctly in Epics/Features/Stories)
  allure.label("environment", "QA");
  allure.label("owner", "Rakhi");
  allure.label("epic", "Authentication");
  allure.label("feature", "Login");
  allure.label("story", "User can log in with valid credentials");
  allure.severity("critical");
  allure.label("Test Type", "Positive");
  allure.description("Happy-path login: verify that a user can log in successfully using a valid email and password.");

  await allure.step('Step 1: Open login page', async () => {
    const currentUrl = await navigateToLoginPage(page);
    allure.attachment('Login Page URL', currentUrl, 'text/plain');
    allure.attachment('Login Page Screenshot', await page.screenshot(), 'image/png');
  });

  await allure.step('Step 2: Enter valid credentials', async () => {
    const emailField = await findEmailField(page);
    const passwordField = await findPasswordField(page);
    
    await emailField.fill(VALID_EMAIL);
    await passwordField.fill(VALID_PASSWORD);
    
    allure.attachment('Before Login Screenshot', await page.screenshot(), 'image/png');
    console.log(`✅ Filled email: ${VALID_EMAIL}`);
    console.log(`✅ Filled password: ${'*'.repeat(VALID_PASSWORD.length)}`);
  });

  await allure.step('Step 3: Submit login form', async () => {
    await clickLoginButton(page);
    await page.waitForTimeout(3000); // Wait for navigation
  });

  await allure.step('Step 4: Verify successful login', async () => {
    const currentUrl = page.url();
    const pageTitle = await page.title().catch(() => '');
    const stillOnLoginPage = await isOnLoginPage(page);
    
    console.log('📄 Post-login URL:', currentUrl);
    console.log('📄 Page Title:', pageTitle);

    expect(stillOnLoginPage).toBeFalsy();
    expect(currentUrl).toContain('nextgenphotosolutions.com');

    allure.attachment('After Login Screenshot', await page.screenshot(), 'image/png');
    allure.attachment('Post-Login URL', currentUrl, 'text/plain');
    allure.attachment('Page Title', pageTitle, 'text/plain');

    console.log('✅ Login successful!');
  });

  console.log('\n🎉 POSITIVE LOGIN TEST COMPLETED SUCCESSFULLY 🎉\n');
});

// ============================================================
// ========== NEGATIVE TEST CASES =============================
// ============================================================

// Scenario: User enters an invalid email with a valid password.
// Expected: Login is rejected and an error message is shown.
test('Auth | Login | Invalid email with valid password', async ({ page }) => {
  
  allure.label("environment", "QA");
  allure.label("owner", "Rakhi");
  allure.label("epic", "Authentication");
  allure.label("feature", "Login");
  allure.label("story", "Login is rejected when email is invalid");
  allure.severity("normal");
  allure.label("Test Type", "Negative");
  allure.description("Verify that login fails when the user enters an invalid email with a correct password.");

  await allure.step('Step 1: Open login page', async () => {
    await navigateToLoginPage(page);
    allure.attachment('Login Page Screenshot', await page.screenshot(), 'image/png');
  });

  await allure.step('Step 2: Enter invalid email and valid password', async () => {
    const emailField = await findEmailField(page);
    const passwordField = await findPasswordField(page);
    
    await emailField.fill('invalid@email.com');
    await passwordField.fill(VALID_PASSWORD);
    
    allure.attachment('Before Login Attempt Screenshot', await page.screenshot(), 'image/png');
  });

  await allure.step('Step 3: Submit login form', async () => {
    await clickLoginButton(page);
    await page.waitForTimeout(2000);
  });

  await allure.step('Step 4: Verify login failed and error message displayed', async () => {
    const stillOnLoginPage = await isOnLoginPage(page);
    const errorMessage = await checkErrorMessage(page);
    
    expect(stillOnLoginPage).toBeTruthy();
    expect(errorMessage).toBeTruthy();
    
    allure.attachment('Error Screenshot', await page.screenshot(), 'image/png');
    allure.attachment('Error Message', errorMessage || 'No error message found', 'text/plain');
    
    console.log('✅ Login correctly rejected with invalid email');
  });
});

// Scenario: User enters a valid email but an incorrect password.
// Expected: Login is rejected and an error message is shown.
test('Auth | Login | Valid email with invalid password', async ({ page }) => {
  
  allure.label("environment", "QA");
  allure.label("owner", "Rakhi");
  allure.label("epic", "Authentication");
  allure.label("feature", "Login");
  allure.label("story", "Login is rejected when password is invalid");
  allure.severity("normal");
  allure.label("Test Type", "Negative");
  allure.description("Verify that login fails when the user enters a valid email but an incorrect password.");

  await allure.step('Step 1: Open login page', async () => {
    await navigateToLoginPage(page);
  });

  await allure.step('Step 2: Enter valid email and invalid password', async () => {
    const emailField = await findEmailField(page);
    const passwordField = await findPasswordField(page);
    
    await emailField.fill(VALID_EMAIL);
    await passwordField.fill('wrongpassword123');
    
    allure.attachment('Before Login Attempt Screenshot', await page.screenshot(), 'image/png');
  });

  await allure.step('Step 3: Submit login form', async () => {
    await clickLoginButton(page);
    await page.waitForTimeout(2000);
  });

  await allure.step('Step 4: Verify login failed and error message displayed', async () => {
    const stillOnLoginPage = await isOnLoginPage(page);
    const errorMessage = await checkErrorMessage(page);
    
    expect(stillOnLoginPage).toBeTruthy();
    expect(errorMessage).toBeTruthy();
    
    allure.attachment('Error Screenshot', await page.screenshot(), 'image/png');
    allure.attachment('Error Message', errorMessage || 'No error message found', 'text/plain');
    
    console.log('✅ Login correctly rejected with invalid password');
  });
});

// Scenario: User leaves the email field blank.
// Expected: Form is not accepted; validation or error message appears.
test('Auth | Login | Empty email with valid password', async ({ page }) => {
  
  allure.label("environment", "QA");
  allure.label("owner", "Rakhi");
  allure.label("epic", "Authentication");
  allure.label("Feature", "Login");
  allure.label("Story", "Email field is required");
  allure.severity("normal");
  allure.label("Test Type", "Negative");
  allure.description("Verify that login is prevented when the email field is left empty.");

  await allure.step('Step 1: Open login page', async () => {
    await navigateToLoginPage(page);
  });

  await allure.step('Step 2: Leave email empty and enter valid password', async () => {
    const emailField = await findEmailField(page);
    const passwordField = await findPasswordField(page);
    
    await emailField.fill('');
    await passwordField.fill(VALID_PASSWORD);
    
    allure.attachment('Before Login Attempt Screenshot', await page.screenshot(), 'image/png');
  });

  await allure.step('Step 3: Submit login form', async () => {
    await clickLoginButton(page);
    await page.waitForTimeout(2000);
  });

  await allure.step('Step 4: Verify login failed (validation error or still on login page)', async () => {
    const stillOnLoginPage = await isOnLoginPage(page);
    const errorMessage = await checkErrorMessage(page);
    
    // Should either show validation error or stay on login page
    expect(stillOnLoginPage || errorMessage).toBeTruthy();
    
    allure.attachment('Error Screenshot', await page.screenshot(), 'image/png');
    allure.attachment('Error Message', errorMessage || 'Validation prevented submission', 'text/plain');
    
    console.log('✅ Login correctly prevented with empty email');
  });
});

// Scenario: User leaves the password field blank.
// Expected: Form is not accepted; validation or error message appears.
test('Auth | Login | Valid email with empty password', async ({ page }) => {
  
  allure.label("environment", "QA");
  allure.label("owner", "Rakhi");
  allure.label("epic", "Authentication");
  allure.label("Feature", "Login");
  allure.label("Story", "Password field is required");
  allure.severity("normal");
  allure.label("Test Type", "Negative");
  allure.description("Verify that login is prevented when the password field is left empty.");

  await allure.step('Step 1: Open login page', async () => {
    await navigateToLoginPage(page);
  });

  await allure.step('Step 2: Enter valid email and leave password empty', async () => {
    const emailField = await findEmailField(page);
    const passwordField = await findPasswordField(page);
    
    await emailField.fill(VALID_EMAIL);
    await passwordField.fill('');
    
    allure.attachment('Before Login Attempt Screenshot', await page.screenshot(), 'image/png');
  });

  await allure.step('Step 3: Submit login form', async () => {
    await clickLoginButton(page);
    await page.waitForTimeout(2000);
  });

  await allure.step('Step 4: Verify login failed (validation error or still on login page)', async () => {
    const stillOnLoginPage = await isOnLoginPage(page);
    const errorMessage = await checkErrorMessage(page);
    
    // Should either show validation error or stay on login page
    expect(stillOnLoginPage || errorMessage).toBeTruthy();
    
    allure.attachment('Error Screenshot', await page.screenshot(), 'image/png');
    allure.attachment('Error Message', errorMessage || 'Validation prevented submission', 'text/plain');
    
    console.log('✅ Login correctly prevented with empty password');
  });
});

// Scenario: User leaves both email and password blank.
// Expected: Form is not accepted; validation or error message appears.
test('Auth | Login | Empty email and empty password', async ({ page }) => {
  
  allure.label("environment", "QA");
  allure.label("owner", "Rakhi");
  allure.label("epic", "Authentication");
  allure.label("feature", "Login");
  allure.label("story", "Both email and password are required");
  allure.severity("normal");
  allure.label("Test Type", "Negative");
  allure.description("Verify that login is prevented when both email and password fields are left empty.");

  await allure.step('Step 1: Open login page', async () => {
    await navigateToLoginPage(page);
  });

  await allure.step('Step 2: Leave both email and password empty', async () => {
    const emailField = await findEmailField(page);
    const passwordField = await findPasswordField(page);
    
    await emailField.fill('');
    await passwordField.fill('');
    
    allure.attachment('Before Login Attempt Screenshot', await page.screenshot(), 'image/png');
  });

  await allure.step('Step 3: Submit login form', async () => {
    await clickLoginButton(page);
    await page.waitForTimeout(2000);
  });

  await allure.step('Step 4: Verify login failed (validation error or still on login page)', async () => {
    const stillOnLoginPage = await isOnLoginPage(page);
    const errorMessage = await checkErrorMessage(page);
    
    // Should either show validation error or stay on login page
    expect(stillOnLoginPage || errorMessage).toBeTruthy();
    
    allure.attachment('Error Screenshot', await page.screenshot(), 'image/png');
    allure.attachment('Error Message', errorMessage || 'Validation prevented submission', 'text/plain');
    
    console.log('✅ Login correctly prevented with empty credentials');
  });
});

// Scenario: User enters an email that does not match a valid format.
// Expected: Form is rejected; validation is triggered or login fails.
test('Auth | Login | Invalid email format', async ({ page }) => {
  
  allure.label("environment", "QA");
  allure.label("owner", "Rakhi");
  allure.label("epic", "Authentication");
  allure.label("feature", "Login");
  allure.label("story", "Email is validated for correct format");
  allure.severity("normal");
  allure.label("Test Type", "Negative");
  allure.description("Verify that login is prevented when the email does not match a valid email format.");

  await allure.step('Step 1: Open login page', async () => {
    await navigateToLoginPage(page);
  });

  await allure.step('Step 2: Enter invalid email format and valid password', async () => {
    const emailField = await findEmailField(page);
    const passwordField = await findPasswordField(page);
    
    await emailField.fill('invalid-email-format');
    await passwordField.fill(VALID_PASSWORD);
    
    allure.attachment('Before Login Attempt Screenshot', await page.screenshot(), 'image/png');
  });

  await allure.step('Step 3: Submit login form', async () => {
    await clickLoginButton(page);
    await page.waitForTimeout(2000);
  });

  await allure.step('Step 4: Verify login failed (validation error or still on login page)', async () => {
    const stillOnLoginPage = await isOnLoginPage(page);
    const errorMessage = await checkErrorMessage(page);
    
    // Should either show validation error or stay on login page
    expect(stillOnLoginPage || errorMessage).toBeTruthy();
    
    allure.attachment('Error Screenshot', await page.screenshot(), 'image/png');
    allure.attachment('Error Message', errorMessage || 'Validation prevented submission', 'text/plain');
    
    console.log('✅ Login correctly prevented with invalid email format');
  });
});

// Scenario: Attacker tries SQL injection via email and password fields.
// Expected: Login is rejected and application handles input safely.
test('Security | Login | SQL injection attempt is rejected', async ({ page }) => {
  
  allure.label("environment", "QA");
  allure.label("owner", "Rakhi");
  allure.label("epic", "Authentication");
  allure.label("feature", "Login Security");
  allure.label("story", "Login is protected from SQL injection");
  allure.severity("high");
  allure.label("Test Type", "Negative - Security");
  allure.description("Security test: verify that SQL injection payloads in the login form do not allow unauthorized access.");

  await allure.step('Step 1: Open login page', async () => {
    await navigateToLoginPage(page);
  });

  await allure.step('Step 2: Enter SQL injection payload in email and password', async () => {
    const emailField = await findEmailField(page);
    const passwordField = await findPasswordField(page);
    
    await emailField.fill("admin' OR '1'='1");
    await passwordField.fill("' OR '1'='1");
    
    allure.attachment('Before Login Attempt Screenshot', await page.screenshot(), 'image/png');
  });

  await allure.step('Step 3: Submit login form', async () => {
    await clickLoginButton(page);
    await page.waitForTimeout(2000);
  });

  await allure.step('Step 4: Verify SQL injection attempt failed', async () => {
    const stillOnLoginPage = await isOnLoginPage(page);
    const errorMessage = await checkErrorMessage(page);
    
    // Should reject SQL injection attempt
    expect(stillOnLoginPage || errorMessage).toBeTruthy();
    
    allure.attachment('Security Test Screenshot', await page.screenshot(), 'image/png');
    allure.attachment('Error Message', errorMessage || 'SQL injection prevented', 'text/plain');
    
    console.log('✅ SQL injection attempt correctly rejected');
  });
});

// Scenario: Attacker tries to inject JavaScript via the email field.
// Expected: Login is rejected or input is escaped; no script execution.
test('Security | Login | XSS attempt is handled safely', async ({ page }) => {
  
  allure.label("environment", "QA");
  allure.label("owner", "Rakhi");
  allure.label("epic", "Authentication");
  allure.label("feature", "Login Security");
  allure.label("story", "Login is protected from XSS");
  allure.severity("high");
  allure.label("Test Type", "Negative - Security");
  allure.description("Security test: verify that XSS payloads in the login form are handled safely and do not execute.");

  await allure.step('Step 1: Open login page', async () => {
    await navigateToLoginPage(page);
  });

  await allure.step('Step 2: Enter XSS payload in email field', async () => {
    const emailField = await findEmailField(page);
    const passwordField = await findPasswordField(page);
    
    await emailField.fill('<script>alert("XSS")</script>');
    await passwordField.fill(VALID_PASSWORD);
    
    allure.attachment('Before Login Attempt Screenshot', await page.screenshot(), 'image/png');
  });

  await allure.step('Step 3: Submit login form', async () => {
    await clickLoginButton(page);
    await page.waitForTimeout(2000);
  });

  await allure.step('Step 4: Verify XSS attempt handled safely', async () => {
    const stillOnLoginPage = await isOnLoginPage(page);
    const errorMessage = await checkErrorMessage(page);
    
    // Should reject XSS attempt or handle it safely
    expect(stillOnLoginPage || errorMessage).toBeTruthy();
    
    allure.attachment('Security Test Screenshot', await page.screenshot(), 'image/png');
    allure.attachment('Error Message', errorMessage || 'XSS attempt handled', 'text/plain');
    
    console.log('✅ XSS attempt correctly handled');
  });
});

// Scenario: User enters a password containing only special characters.
// Expected: Login is rejected and user remains on the login page.
test('Auth | Login | Special characters only in password', async ({ page }) => {
  
  allure.label("environment", "QA");
  allure.label("owner", "Rakhi");
  allure.label("epic", "Authentication");
  allure.label("feature", "Login");
  allure.label("story", "Password rules - special characters only");
  allure.severity("normal");
  allure.label("Test Type", "Negative");
  allure.description("Verify that login fails when the password consists only of special characters.");

  await allure.step('Step 1: Open login page', async () => {
    await navigateToLoginPage(page);
  });

  await allure.step('Step 2: Enter valid email and password with special characters only', async () => {
    const emailField = await findEmailField(page);
    const passwordField = await findPasswordField(page);
    
    await emailField.fill(VALID_EMAIL);
    await passwordField.fill('!@#$%^&*()');
    
    allure.attachment('Before Login Attempt Screenshot', await page.screenshot(), 'image/png');
  });

  await allure.step('Step 3: Submit login form', async () => {
    await clickLoginButton(page);
    await page.waitForTimeout(2000);
  });

  await allure.step('Step 4: Verify login failed with special character password', async () => {
    const stillOnLoginPage = await isOnLoginPage(page);
    const errorMessage = await checkErrorMessage(page);
    
    expect(stillOnLoginPage).toBeTruthy();
    
    allure.attachment('Error Screenshot', await page.screenshot(), 'image/png');
    allure.attachment('Error Message', errorMessage || 'Login failed', 'text/plain');
    
    console.log('✅ Login correctly rejected with special character password');
  });
});
