import ftp from "basic-ftp";
import readline from "readline";

// ✅ Updated FTP configuration
const FTP_CONFIG = {
    host: "production.nextgenphotosolutions.com",
    user: "prodngps@production.nextgenphotosolutions.com",
    password: "productionFTP@2017",
    secure: true, // Use FTPS for secure connection
    secureOptions: { rejectUnauthorized: false }, // allow self-signed certs
    timeout: 30000, // 30 seconds
    passive: true,
};

// 🔹 Ask for user input
async function ask(promptText) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(promptText, ans => { rl.close(); resolve(ans.trim()); }));
}

// 🔹 Recursive image counter
async function countImagesRecursive(client, path, folderName = null) {
    let jpgCount = 0;
    let pngCount = 0;
    let subfolderCounts = [];

    let items;
    try {
        items = await client.list(path);
    } catch (err) {
        console.log(`⚠️ Folder not found or access denied: ${path}`);
        return { jpgCount: 0, pngCount: 0, subfolderCounts: [] };
    }

    for (const item of items) {
        if (!item.name || item.name === "." || item.name === "..") continue;

        const fullPath = `${path}/${item.name}`;
        let isDir = item.isDirectory;

        // Force directory check
        if (!isDir) {
            try {
                const current = await client.pwd();
                const ok = await client.cd(fullPath).then(() => true).catch(() => false);
                if (ok) {
                    isDir = true;
                    await client.cd(current);
                }
            } catch {}
        }

        if (isDir) {
            // Recursive call for subfolder
            const result = await countImagesRecursive(client, fullPath, item.name);
            jpgCount += result.jpgCount;
            pngCount += result.pngCount;

            if (result.jpgCount + result.pngCount > 0) {
                subfolderCounts.push({ folder: item.name, jpg: result.jpgCount, png: result.pngCount });
            }
        } else {
            const lower = item.name.toLowerCase();
            if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) jpgCount++;
            if (lower.endsWith(".png")) pngCount++;
        }
    }

    return { jpgCount, pngCount, subfolderCounts };
}

// 🔹 Main logic
async function main() {
    const dateStr = await ask("📅 Enter date (yyyy-MM-dd): ");
    const client = new ftp.Client(30000);
    client.ftp.verbose = true; // enable logs

    try {
        console.log("🔌 Connecting to FTP...");
        await client.access(FTP_CONFIG);
        console.log("✅ Connected successfully!");

        const basePath = `/${dateStr}`;
        console.log(`📂 Scanning date folder: ${basePath}`);

        let orders;
        try {
            orders = await client.list(basePath);
        } catch (err) {
            console.error(`❌ Cannot list folder: ${basePath}`);
            return;
        }

        let totalOrders = 0;
        let totalJpg = 0;
        let totalPng = 0;

        for (const order of orders) {
            if (!order.name || !order.name.startsWith("NGPS")) continue;

            totalOrders++;
            const orderPath = `${basePath}/${order.name}`;
            console.log(`\n➡️ Order: ${order.name}`);

            // GotPhoto folder
            const gotPhotoResult = await countImagesRecursive(client, `${orderPath}/GotPhoto`);
            console.log(`   GotPhoto (JPG): ${gotPhotoResult.jpgCount}`);
            if (gotPhotoResult.subfolderCounts.length > 0) {
                console.log("     📁 Subfolders:");
                for (const sf of gotPhotoResult.subfolderCounts) {
                    console.log(`       ${sf.folder}: JPG=${sf.jpg}, PNG=${sf.png}`);
                }
            }

            // GotPhoto_PNG folder
            const gotPhotoPngResult = await countImagesRecursive(client, `${orderPath}/GotPhoto_PNG`);
            console.log(`   GotPhoto_PNG (PNG): ${gotPhotoPngResult.pngCount}`);
            if (gotPhotoPngResult.subfolderCounts.length > 0) {
                console.log("     📁 Subfolders:");
                for (const sf of gotPhotoPngResult.subfolderCounts) {
                    console.log(`       ${sf.folder}: JPG=${sf.jpg}, PNG=${sf.png}`);
                }
            }

            const orderTotal = gotPhotoResult.jpgCount + gotPhotoPngResult.pngCount;
            console.log(`   Total images for ${order.name}: ${orderTotal}`);

            totalJpg += gotPhotoResult.jpgCount;
            totalPng += gotPhotoPngResult.pngCount;
        }

        // 🔹 Summary
        console.log("\n📌 Summary:");
        console.log(`Total Orders: ${totalOrders}`);
        console.log(`Total JPG: ${totalJpg}`);
        console.log(`Total PNG: ${totalPng}`);
        console.log(`Grand Total: ${totalJpg + totalPng}`);

    } catch (err) {
        console.error("❌ FTP Error:", err.message);
    } finally {
        client.close();
        console.log("🔒 FTP connection closed");
    }
}

main();
