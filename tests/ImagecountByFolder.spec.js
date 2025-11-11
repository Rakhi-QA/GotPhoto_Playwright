import { test, expect } from '@playwright/test';
import ftp from 'basic-ftp';

test('📅 Count JPG/PNG images by job for a specific date', async () => {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    console.log('🔌 Connecting to FTP...');
    await client.access({
      host: "ftp.yourserver.com",
      user: "yourUsername",
      password: "yourPassword",
      secure: false
    });

    console.log('✅ Connected to FTP');

    // Step 1: Get all folders (dates)
    const dateFolders = await client.list("/gotphoto/input/");
    console.log('\n📂 Available date folders:');
    for (const folder of dateFolders) {
      if (folder.isDirectory) console.log(`- ${folder.name}`);
    }

    // Step 2: Choose date folder manually (or latest one)
    const dateFolder = "2025-11-10"; // 🔁 change this date manually
    console.log(`\n🗓 Checking jobs under date folder: ${dateFolder}`);

    // Step 3: List all job folders under selected date
    const jobFolders = await client.list(`/gotphoto/input/${dateFolder}/`);

    for (const job of jobFolders) {
      if (job.isDirectory && job.name.startsWith("NGPS")) {
        const jobPath = `/gotphoto/input/${dateFolder}/${job.name}/photos`;
        const images = await client.list(jobPath);

        // Count JPG and PNG separately
        const jpgCount = images.filter(f => f.name.toLowerCase().endsWith('.jpg')).length;
        const pngCount = images.filter(f => f.name.toLowerCase().endsWith('.png')).length;

        console.log(`📸 Job: ${job.name} | JPG: ${jpgCount} | PNG: ${pngCount}`);
      }
    }

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    client.close();
    console.log('\n🔒 FTP connection closed.');
  }
});
