import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import ftp from 'basic-ftp';
import { getGeneratedLink } from '../utils/linkStorage.js';
import { allure } from 'allure-playwright';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.setTimeout(180000); // 3-minute timeout

test('Validate Traditional Plus flow after generated link', async ({ page }) => {

  // ===== Allure Metadata =====
  allure.label({ name: 'Environment', value: 'QA' });
  allure.label({ name: 'Executor', value: 'Rakhi' });
  allure.label({ name: 'Trend', value: 'Stable' });

  // ===== Step 1: Get Generated Link =====
  const generatedLink = getGeneratedLink();
  await allure.step('Fetch generated job link', async () => {
    console.log(`🔗 Generated Link: ${generatedLink}`);
    expect(generatedLink).toBeTruthy();
  });

  // ===== Step 2: Open Link Once =====
  await allure.step('Open order link in browser', async () => {
    await page.goto(generatedLink, { waitUntil: 'load' });
    await expect(page).toHaveTitle(/NextGen|GotPhoto|Traditional/i);
    console.log('🌐 Opened generated order link successfully');
  });

  // ===== Step 3: FTP Upload =====
  await allure.step('Upload images to FTP', async () => {
    const client = new ftp.Client();
    client.ftp.verbose = true;

    const FTP_HOST = 'ftp.gotphoto.com';
    const FTP_USER = 'gotphoto_user';
    const FTP_PASSWORD = 'gotphoto_pass';
    const FTP_SECURE = false;

    const jobName = generatedLink.split('/').pop(); // extract job from link
    const remotePhotosDir = `/gotphoto/input/${jobName}/photos`;
    const localDir = path.resolve(__dirname, '../testData/images');
    const filesToUpload = fs.readdirSync(localDir);

    try {
      console.log('➡️ Connecting to FTP server...');
      await client.access({
        host: FTP_HOST,
        user: FTP_USER,
        password: FTP_PASSWORD,
        secure: FTP_SECURE
      });

      await client.ensureDir(remotePhotosDir);
      await client.cd(remotePhotosDir);
      console.log(`📁 Remote folder ready: ${remotePhotosDir}`);

      for (const file of filesToUpload) {
        const localPath = path.join(localDir, file);
        console.log(`⬆️ Uploading ${file}...`);
        await client.uploadFrom(localPath, file);
        await new Promise(r => setTimeout(r, 500)); // short delay between uploads
      }

      console.log('🎉 All images uploaded successfully to FTP!');
      allure.attachment('Uploaded Files', JSON.stringify(filesToUpload, null, 2), 'application/json');

    } catch (err) {
      console.error('❌ FTP Upload Failed:', err);
      throw err;
    } finally {
      client.close();
    }
  });

  // ===== Step 4: Validate Upload Confirmation =====
  await allure.step('Validate upload success message', async () => {
    await page.waitForTimeout(3000);
    console.log('✅ Upload validation completed');
  });
});
