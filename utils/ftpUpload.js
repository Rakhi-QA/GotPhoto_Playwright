import ftp from "basic-ftp";
import fs from "fs";
import path from "path";

/**
 * Uploads images to /gotphoto/input/<jobName>/photos
 */
export async function uploadImagesToFTP(jobName) {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    // ✅ Connect to FTP
    await client.access({
      host: "staging.production.nextgenphotosolutions.com",   // 🔹 change to your FTP host
      user: "imageprocessing@staging.production.nextgenphotosolutions.com",          // 🔹 change to your FTP username
      password: "5Z6$7I*L7Z-k",      // 🔹 change to your FTP password
      secure: false
    });

    // ✅ Folder path on FTP
    const jobFolder = `/gotphoto/input/${jobName}/photos`;

    // ✅ Create the folder if it doesn’t exist
    await client.ensureDir(jobFolder);
    console.log(`📁 Created folder on FTP: ${jobFolder}`);

    // ✅ Local folder containing your images
    const localImageFolder = path.resolve("test-images"); // make sure this folder exists in your project

    // ✅ Upload all images from local folder
    const files = fs.readdirSync(localImageFolder);
    for (const file of files) {
      const localFilePath = path.join(localImageFolder, file);
      await client.uploadFrom(localFilePath, `${jobFolder}/${file}`);
      console.log(`✅ Uploaded: ${file}`);
    }

    console.log("🎉 All images uploaded successfully!");
  } catch (err) {
    console.error("❌ FTP upload failed:", err);
  }

  client.close();
}
