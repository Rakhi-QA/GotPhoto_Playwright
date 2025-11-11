import ftp from "basic-ftp";

const client = new ftp.Client(30000);
client.ftp.verbose = true;

(async () => {
  try {
    await client.access({
      host: "production.nextgenphotosolutions.com",
      user: "prodngps@production.nextgenphotosolutions.com",
      password: "productionFTP@2017",
      secure: true,
      secureOptions: { rejectUnauthorized: false },
      passive: true
    });

    const datePath = "/2025-11-10";
    console.log(`📂 Listing contents of ${datePath}...`);
    const list = await client.list(datePath);

    for (const item of list) {
      console.log(`${item.isDirectory ? "📁" : "📄"} ${item.name}`);
    }

  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    client.close();
  }
})();
