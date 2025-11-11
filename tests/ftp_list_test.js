import ftp from "basic-ftp";

const JOB_NAME = "NGPS27660"; // 👈 change to one job name from your list
const DATE_PATH = "/2025-11-10";

const client = new ftp.Client(30000);
client.ftp.verbose = false;

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

    const jobPath = `${DATE_PATH}/${JOB_NAME}`;
    console.log(`📂 Listing inside: ${jobPath}`);
    const list = await client.list(jobPath);

    for (const item of list) {
      console.log(`${item.isDirectory ? "📁" : "📄"} ${item.name}`);
    }

  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    client.close();
  }
})();
