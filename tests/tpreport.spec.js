import { test, expect } from '@playwright/test';
import path from 'path';
import { getGeneratedLink } from '../utils/linkStorage.js';
import { fileURLToPath } from 'url';
import { allure } from 'allure-playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.setTimeout(180000); // 3 minutes timeout

test('Validate Traditional Plus flow after generated link (Allure)', async ({ page }) => {

  const generatedLink = await getGeneratedLink();
  console.log('🌐 Opening generated link:', generatedLink);

  // 🩵 Step 1: Open generated link and verify job data
  await allure.step('1️⃣ Open generated link and verify job data', async () => {
    try {
      await page.goto(generatedLink, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForLoadState('domcontentloaded');

      // Handle login redirects
      for (let i = 0; i < 5; i++) {
        const currentUrl = page.url();
        if (!currentUrl.includes('login')) break;
        console.log(`⏳ Redirect attempt ${i + 1}: still on login page...`);
        await page.waitForTimeout(2000);
      }

      let pageTitle = '';
      try {
        pageTitle = await page.title({ timeout: 5000 });
      } catch {
        console.log('⚠️ Page title not found yet — continuing...');
      }

      const currentURL = page.url();
      console.log('📄 Page title:', pageTitle || '(empty)');
      console.log('🔗 Current URL:', currentURL);

      expect(currentURL).toContain('nextgenphotosolutions.com');
      console.log('✅ Page verified and ready for next step.');

      // ✅ Correct Allure attachments
      allure.attachment('Page URL', currentURL, 'text/plain');
      allure.attachment('Page Title', pageTitle, 'text/plain');

    } catch (error) {
      console.error('❌ Error in Step 1:', error);
      throw error;
    }
  });

  // 🩵 Step 2: Select Traditional Plus service option
  await allure.step('2️⃣ Select Traditional Plus service option', async () => {
    try {
      const traditionalPlusCheckbox = page.locator('#ch_tdp');

      await page.waitForSelector('#ch_tdp', { timeout: 15000 });
      await traditionalPlusCheckbox.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);

      try {
        await traditionalPlusCheckbox.click({ timeout: 5000 });
      } catch {
        console.log('⚠️ Normal click failed, using force...');
        await traditionalPlusCheckbox.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        await page.waitForTimeout(1500);
        await traditionalPlusCheckbox.click({ force: true });
      }

      // Handle popup
      page.once('dialog', async dialog => {
        console.log(`🟡 Popup detected: ${dialog.message()}`);
        await dialog.accept();
      });

      await page.waitForTimeout(3000);
      const moveBtn = page.locator('button:has-text("Move team images")');

      if (await moveBtn.isVisible()) {
        await moveBtn.click();
      } else {
        console.log('⚠️ Move team images button not visible');
      }

      // Screenshot for Allure
      const step2shot = await page.screenshot();
      allure.attachment('Traditional Plus Checkbox Selected', step2shot, 'image/png');

    } catch (error) {
      console.error('❌ Error in Step 2:', error);
      throw error;
    }
  });

  // 🩵 Step 3: Attach Extracted Images
  await allure.step('3️⃣ Attach extracted images', async () => {
    try {
      const attachText = 'Attach extracted images to access codes';
      await page.locator(`text=${attachText}`).scrollIntoViewIfNeeded();

      await page.click('#extractedimages');
      await page.waitForSelector('#cropimagesfull', { state: 'visible', timeout: 10000 });
      await page.click('#cropimagesfull');

      allure.attachment('Extracted Images Attached', 'Full Length Centering selected', 'text/plain');

    } catch (error) {
      console.error('❌ Error in Step 3:', error);
      throw error;
    }
  });

  // 🩵 Step 4: Verify Cropping Option
  await allure.step('4️⃣ Verify which cropping option is selected', async () => {
    try {
      const options = ['#cropimagesC', '#cropimagesT', '#cropimagesB'];
      let selectedOption = 'None';

      for (const opt of options) {
        if (await page.locator(opt).isChecked()) {
          selectedOption = opt;
          break;
        }
      }

      allure.attachment('Cropping Option Selected', selectedOption, 'text/plain');

    } catch (error) {
      console.error('❌ Error in Step 4:', error);
      throw error;
    }
  });

  // 🩵 Step 5: Payment Step
  await allure.step('5️⃣ Perform payment using saved card', async () => {
    try {
      await page.locator('text=Use Saved Card details').scrollIntoViewIfNeeded();
      await page.click('#existing');

      await page.waitForSelector('#vaultid123', { state: 'visible', timeout: 10000 });
      await page.selectOption('#vaultid123', { value: 'CARD-5SA93463JU244373UM32TCDY' });

      allure.attachment('Selected Card', 'CARD-5SA93463JU244373UM32TCDY', 'text/plain');

    } catch (error) {
      console.error('❌ Error in Step 5:', error);
      throw error;
    }
  });

  // 🩵 Step 6: Checkout
  await allure.step('6️⃣ Click Checkout and confirm order', async () => {
    try {
      const checkoutBtn = page.locator('#btnpaynow');
      await checkoutBtn.scrollIntoViewIfNeeded();
      await expect(checkoutBtn).toBeVisible({ timeout: 10000 });
      await checkoutBtn.click();

      const step6shot = await page.screenshot();
      allure.attachment('Checkout Completed', step6shot, 'image/png');

    } catch (error) {
      console.error('❌ Error in Step 6:', error);
      throw error;
    }
  });

});
