import ftp from "basic-ftp";
import readline from "readline";

const FTP_CONFIG = {
  host: "production.nextgenphotosolutions.com",
  user: "prodngps@production.nextgenphotosolutions.com",
  password: "productionFTP@2017",
  secure: true,
  secureOptions: { rejectUnauthorized: false },
  passive: true,
};

// Ask user for input
async function ask(promptText) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(promptText, ans => { rl.close(); resolve(ans.trim()); }));
}

// Recursive function to count images in a folder and its subfolders
async function countImagesRecursive(client, path) {
  let jpgCount = 0;
  let pngCount = 0;

  let items;
  try {
    items = await client.list(path);
  } catch {
    console.warn(`⚠️ Folder not found: ${path}`);
    return { jpgCount, pngCount };
  }

  for (const item of items) {
    if (!item.name || item.name === "." || item.name === "..") continue;
    const fullPath = `${path}/${item.name}`;

    if (item.isDirectory) {
      const sub = await countImagesRecursive(client, fullPath);
      jpgCount += sub.jpgCount;
      pngCount += sub.pngCount;
    } else {
      const lower = item.name.toLowerCase();
      if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) jpgCount++;
      if (lower.endsWith(".png")) pngCount++;
    }
  }

  return { jpgCount, pngCount };
}

// Main function
async function main() {
  const dateStr = await ask("📅 Enter date (yyyy-MM-dd): ");
  const client = new ftp.Client(30000);
  client.ftp.verbose = false;

  try {
    console.log("🔌 Connecting to FTP...");
    await client.access(FTP_CONFIG);
    console.log("✅ Connected");

    const basePath = `/${dateStr}`;
    console.log(`📂 Scanning folder: ${basePath}`);

    const orders = await client.list(basePath);
    let totalOrders = 0;
    let totalJpg = 0;
    let totalPng = 0;

    for (const order of orders) {
      if (!order.name || !order.name.startsWith("NGPS")) continue;

      totalOrders++;
      const orderPath = `${basePath}/${order.name}`;
      console.log(`\n➡️ Order: ${order.name}`);

      const gotPhoto = await countImagesRecursive(client, `${orderPath}/GotPhoto`);
      const gotPhotoPng = await countImagesRecursive(client, `${orderPath}/GotPhoto_PNG`);

      const orderJpg = gotPhoto.jpgCount;
      const orderPng = gotPhotoPng.pngCount;

      console.log(`   📸 GotPhoto JPG: ${orderJpg}`);
      console.log(`   🖼️ GotPhoto_PNG PNG: ${orderPng}`);
      console.log(`   🔢 Total images: ${orderJpg + orderPng}`);

      totalJpg += orderJpg;
      totalPng += orderPng;
    }

    console.log("\n📊 Summary:");
    console.log(`   Total Orders: ${totalOrders}`);
    console.log(`   Total JPG: ${totalJpg}`);
    console.log(`   Total PNG: ${totalPng}`);
    console.log(`   Grand Total: ${totalJpg + totalPng}`);

  } catch (err) {
    console.error("❌ FTP Error:", err.message);
  } finally {
    client.close();
    console.log("🔒 FTP connection closed");
  }
}

main();
