// Records a short demo video of each theme: entrance, background drift, details sheet.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)(process.env.PW_PATH || "playwright");
const BASE = process.env.SHOT_BASE || "http://localhost:3000";
const [out, ...ids] = process.argv.slice(2);
const browser = await chromium.launch();
for (const id of ids) {
  // warm up fonts/compile so the recording starts clean
  const warm = await browser.newPage();
  await warm.goto(`${BASE}/showroom/${id}`, { waitUntil: "networkidle" });
  await warm.close();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, recordVideo: { dir: out, size: { width: 390, height: 844 } } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/showroom/${id}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(5200);
  await page.click(".m-more");
  await page.waitForTimeout(1800);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1000);
  const v = page.video();
  await ctx.close();
  const p = await v.path();
  const fs = await import("node:fs");
  fs.renameSync(p, `${out}/${id}.webm`);
}
await browser.close();
console.log("done");
