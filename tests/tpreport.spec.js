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

      // Handle possible login redirects
      for (let i = 0; i < 5; i++) {
        const currentUrl = await page.url();
        if (!currentUrl.includes('login')) break;
        console.log(`⏳ Redirect attempt ${i + 1}: still on login page...`);
        await page.waitForTimeout(2000);
      }

      // Safely read title and URL
      let pageTitle = '';
      try {
        pageTitle = await page.title({ timeout: 5000 });
      } catch {
        console.log('⚠️ Page title not found yet — continuing...');
      }

      const currentURL = await page.url();
      console.log('📄 Page title:', pageTitle || '(empty)');
      console.log('🔗 Current URL:', currentURL);
      expect(currentURL).toContain('nextgenphotosolutions.com');
      console.log('✅ Page verified and ready for next step.');

      // ✅ Use allure.addAttachment instead of allure.attach
      await allure.addAttachment('Page URL', currentURL);
      await allure.addAttachment('Page Title', pageTitle);
    } catch (error) {
      console.error('❌ Error in Step 1:', error);
      throw error;
    }
  });

  // 🩵 Step 2: Select “Traditional Plus” Option
  await allure.step('2️⃣ Select Traditional Plus service option', async () => {
    try {
      const traditionalPlusCheckbox = page.locator('#ch_tdp');

      console.log('🔎 Checking visibility of Traditional Plus checkbox...');
      await page.waitForSelector('#ch_tdp', { timeout: 15000 });

      // Scroll into view if needed
      await traditionalPlusCheckbox.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);

      // Try clicking the element robustly
      try {
        await traditionalPlusCheckbox.click({ timeout: 5000 });
        console.log('🎯 Clicked Traditional Plus checkbox normally');
      } catch (e) {
        console.log('⚠️ Normal click failed, trying force click...');
        await traditionalPlusCheckbox.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        await page.waitForTimeout(1500);
        await traditionalPlusCheckbox.click({ force: true });
        console.log('✅ Force-clicked Traditional Plus checkbox');
      }

      // Handle popup "Change - data may not be saved"
      page.once('dialog', async dialog => {
        console.log(`🟡 Popup detected: ${dialog.message()}`);
        await dialog.accept();
        console.log('✅ Confirmed popup');
      });

      // Optional "Move team images" button
      await page.waitForTimeout(3000);
      const moveBtn = page.locator('button:has-text("Move team images")');
      if (await moveBtn.isVisible()) {
        await moveBtn.click();
        console.log('✅ Clicked "Move team images" button');
      } else {
        console.log('⚠️ Move team images button not visible');
      }

      // ✅ Use allure.addAttachment for screenshot
      await allure.addAttachment('Traditional Plus Checkbox Selected', await page.screenshot({ path: 'step2.png' }));
    } catch (error) {
      console.error('❌ Error in Step 2:', error);
      throw error;
    }
  });

  // 🩵 Step 3: Attach Extracted Images
  await allure.step('3️⃣ Attach extracted images', async () => {
    try {
      const attachText = 'Attach extracted images to access codes';
      const attachLocator = page.locator(`text=${attachText}`);
      await attachLocator.scrollIntoViewIfNeeded();
      console.log(`📜 Scrolled to: ${attachText}`);

      await page.click('#extractedimages');
      console.log('✅ Clicked Extracted Images option');

      await page.waitForSelector('#cropimagesfull', { state: 'visible', timeout: 10000 });
      await page.click('#cropimagesfull');
      console.log('✅ Selected Full Length Centering');

      // ✅ Use allure.addAttachment
      await allure.addAttachment('Extracted Images Attached', 'Full Length Centering selected');
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
          console.log(`🎯 Selected cropping option: ${opt}`);
          break;
        }
      }

      // ✅ Use allure.addAttachment
      await allure.addAttachment('Cropping Option', selectedOption);
    } catch (error) {
      console.error('❌ Error in Step 4:', error);
      throw error;
    }
  });

  // 🩵 Step 5: Payment Step
  await allure.step('5️⃣ Perform payment using saved card', async () => {
    try {
      const savedCardText = page.locator('text=Use Saved Card details');
      await savedCardText.scrollIntoViewIfNeeded();
      console.log('💳 Scrolled to "Use Saved Card details"');

      await page.click('#existing');
      console.log('✅ Selected "Use Saved Card details" option');

      await page.waitForSelector('#vaultid123', { state: 'visible', timeout: 10000 });
      await page.selectOption('#vaultid123', { value: 'CARD-5SA93463JU244373UM32TCDY' });
      console.log('💰 Selected saved card: CARD-5SA93463JU244373UM32TCDY');

      // ✅ Use allure.addAttachment
      await allure.addAttachment('Selected Card', 'CARD-5SA93463JU244373UM32TCDY');
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
      console.log('🛒 Clicked on Checkout button successfully');

      // ✅ Use allure.addAttachment for screenshot
      await allure.addAttachment('Checkout Completed', await page.screenshot({ path: 'step6.png' }));
    } catch (error) {
      console.error('❌ Error in Step 6:', error);
      throw error;
    }
    
  });
});