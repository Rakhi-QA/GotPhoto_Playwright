import { test, expect } from '@playwright/test';

test('Login Test', async ({ page }) => {
  // 1. Open https://staging.production.nextgenphotosolutions.com/
  await page.goto('https://staging.production.nextgenphotosolutions.com/');

  // 2. Enter email in email field
  // The input fields don't have explicit labels in the screenshot but we can target them by type
  const emailInput = page.locator('input[type="text"], input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible' });
  await emailInput.fill('rakhiqa@tiuconsulting.com');

  // 3. Enter password
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill('123456');

  // 4. Click login button
  const loginButton = page.getByRole('button', { name: /login/i });
  await loginButton.click();

  // 5. Verify dashboard page is displayed
  // We'll wait for the URL to indicate a successful login, typically containing 'dashboard'
  await expect(page).toHaveURL(/.*dashboard.*/i, { timeout: 15000 });
});
