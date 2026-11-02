// Usage: node scripts/shots.mjs <outDir> id1 id2 ...   (app must be running on SHOT_BASE)
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)(process.env.PW_PATH || "playwright");
const BASE = process.env.SHOT_BASE || "http://localhost:3000";
const [out, ...ids] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
for (const id of ids) {
  const [path, name] = id.split("@");
  await page.goto(`${BASE}/showroom/${path}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${out}/${name || path}.png` });
  if (process.env.SHEET) {
    await page.click(".m-more");
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${out}/${name || path}-sheet.png` });
  }
}
await browser.close();
console.log("done", ids.length);
