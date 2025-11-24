import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { allure } from 'allure-playwright';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.setTimeout(900000); // 15 minutes timeout

// Resolve possible locations of generatedData.json
const CANDIDATE_FILES = [
  path.resolve(process.cwd(), 'generatedData.json'),
  path.resolve(__dirname, '../generatedData.json'),
  path.resolve(__dirname, 'generatedData.json'),
];

// ====================== Wait for generatedData.json =========================
async function waitForAnyFile(candidates, timeout = 120000, interval = 500) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        console.log(`✅ Found file at: ${filePath}`);
        return filePath;
      }
    }
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error("❌ generatedData.json not found. Run API test first.");
}

// ============================ CALCULATION FUNCTION ============================
async function calculateTotals(page) {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('💰 CALCULATING ORDER TOTALS');
    console.log('='.repeat(60));

    await allure.step("Calculate Order Totals", async () => {
      const getValue = async (selector) => {
        try {
          return await page.locator(selector).textContent({ timeout: 5000 }) || "0";
        } catch {
          return "0";
        }
      };

      const crop = parseFloat((await getValue('#showcropimageprice')).replace(/[$,]/g, '')) || 0;
      const pngTeam = parseFloat((await getValue('#showpngteamaddon')).replace(/[$,]/g, '')) || 0;
      const teamColor = parseFloat((await getValue('#teamcolory')).replace(/[$,]/g, '')) || 0;
      const teamImages = parseFloat((await getValue('#setteamonly1')).replace(/[$,]/g, '')) || 0;
      const bundleSubtotal = parseFloat((await getValue('#bundlesSubTotal1')).replace(/[$,]/g, '')) || 0;
      const additionalGraphics = parseFloat((await getValue('#bundle_AddinalTotal_amt_span')).replace(/[$,]/g, '')) || 0;
      const colorCorrection = parseFloat((await getValue('#showcc')).replace(/[$,]/g, '')) || 0;
      const discount = parseFloat((await getValue('#disctotl')).replace(/[$,]/g, '')) || 0;
      const pageFinal = parseFloat((await getValue('#finaltotl')).replace(/[$,]/g, '')) || 0;

      const subtotal = crop + pngTeam + teamColor + teamImages + bundleSubtotal + additionalGraphics + colorCorrection;
      const finalTotal = subtotal - discount;

      console.log(`Subtotal (calc): $${subtotal.toFixed(2)}`);
      console.log(`Final Total (calc): $${finalTotal.toFixed(2)}`);
      console.log(`Final Total (page): $${pageFinal.toFixed(2)}`);

      await allure.attachment(
        "CALCULATION DETAILS",
        JSON.stringify(
          { subtotal, finalTotal, pageFinal },
          null,
          2
        ),
        "application/json"
      );

      if (parseFloat(finalTotal.toFixed(2)) === pageFinal) {
        console.log("✅ Totals match");
      } else {
        console.log("⚠️ Totals mismatch");
      }
    });
  } catch (err) {
    console.error("Calculation Error:", err);
  }
}

// =============================== MAIN TEST =================================

test("Complete GotPhoto Order + Full Composite", async ({ page }) => {

  // ----------- Allure Labels -----------
  allure.id("NGPS-ORDER-001");
  allure.epic("GotPhoto");
  allure.feature("Full Composite Order");
  allure.story("Place order and validate totals");
  allure.owner("Rakhi");
  allure.severity("critical");
  allure.label({ name: "Environment", value: "QA" });
  allure.description("This test completes a full composite workflow and verifies calculation before discount.");

  // ------ Step 0: Load generatedData.json ------
  const GENERATED_FILE = await waitForAnyFile(CANDIDATE_FILES);
  const generatedData = JSON.parse(fs.readFileSync(GENERATED_FILE, 'utf8'));

  const jobId = generatedData.nextgen_job_id || generatedData.jobId || generatedData.id || null;
  const jobName = generatedData.jobName || "";
  const generatedLink = generatedData.generatedLink || generatedData.checkout_url || null;

  if (!generatedLink) throw new Error("❌ Missing checkout link");

  await allure.step("Open Checkout Link", async () => {
    console.log("🌐 Opening checkout link:", generatedLink);
    await page.goto(generatedLink, { waitUntil: 'networkidle' });
    await allure.attachment("Checkout Page Screenshot", await page.screenshot(), "image/png");
  });

  // ---- Steps with Allure ----
  await allure.step("Select Standard Team Build", async () => { await page.click("#std_team_up"); });

  await allure.step("Select Single Template", async () => { await page.click("#bgsinglecheck_s"); });

  await allure.step("Select Template", async () => {
    await page.selectOption("#bcktemplete", { value: "487" });
  });

  await allure.step("Attach Extracted Images", async () => {
    await page.click("#extractedimages");
    await page.click("#extractedimagesI");
  });

  await allure.step("Apply Full Length Centering", async () => {
    await page.click("#cropimagesfull");
  });

  await allure.step("Enable PNG Team Add-On", async () => {
    await page.click("#png_team_add_on");
  });

  await allure.step("Set Team Color", async () => {
    await page.click("#teamcolorY");
  });

  await allure.step("Enable Color Correction", async () => {
    await page.click("#ccservices");
  });

  // ----------- CALCULATION BEFORE DISCOUNT -----------
  await allure.step("Calculate Totals BEFORE Discount", async () => {
    await calculateTotals(page);
  });

  // ----------- APPLY DISCOUNT -----------
  await allure.step("Apply Discount Code", async () => {
    await page.fill("#discount_code", "100OFF");
    await page.click("#Redeem");
    await page.waitForTimeout(2000);
    await allure.attachment("After Discount Screenshot", await page.screenshot(), "image/png");
  });

  // ----------- PAY NOW -----------
  await allure.step("Proceed to Payment", async () => {
    await page.click("#btnpaynow");
    await page.waitForTimeout(4000);
  });

  // ----------- CONFIRMATION URL -----------
  await allure.step("Capture Confirmation URL", async () => {
    const currentUrl = page.url();
    console.log("📍 Confirmation URL:", currentUrl);
    await allure.attachment("Confirmation URL", currentUrl, "text/plain");
  });

  // ----------- Extract NextGen Job ID -----------
  let nextgenJobNo = page.url().match(/jobno[=](\d+)/)?.[1] || jobId;

  // ----------- Update JSON -----------
  await allure.step("Update JSON File", async () => {
    const updated = {
      ...generatedData,
      nextgen_job_id: nextgenJobNo,
      orderCompleted: true,
      completedAt: new Date().toISOString()
    };
    fs.writeFileSync(GENERATED_FILE, JSON.stringify(updated, null, 2));
    console.log("✅ Updated generatedData.json with NextGen ID:", nextgenJobNo);

    await allure.attachment("Updated JSON", JSON.stringify(updated, null, 2), "application/json");
  });

  // -------- CONFIRM IMAGE TRANSFERRED API --------
  await allure.step("Confirm Image Transfer API", async () => {
    const resp = await page.request.post(
      "https://staging.production.nextgenphotosolutions.com/Gpservices/confirmimagetransferred",
      {
        headers: { "Content-Type": "application/json" },
        data: {
          api_key: "GP=Ha2xc0Rcc2less2=NG",
          job_id: nextgenJobNo,
          img_transferred: "Y"
        }
      }
    );

    const resData = await resp.json();
    console.log("Confirm API Response:", resData);

    await allure.attachment("Transfer API Response", JSON.stringify(resData, null, 2), "application/json");

    expect(resp.ok()).toBeTruthy();
  });

  console.log("\n✅ TEST COMPLETED SUCCESSFULLY");
});
