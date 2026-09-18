import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const file = "file://" + new URL("../out/mittenwald-to-berlin.html", import.meta.url).pathname;
mkdirSync(new URL("../shots/", import.meta.url).pathname, { recursive: true });
const S = (n) => new URL("../shots/" + n, import.meta.url).pathname;

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const errs = [];
async function page(vp, at) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, colorScheme: "light" });
  const p = await ctx.newPage();
  p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  p.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));
  await p.goto(file + (at ? "?at=" + encodeURIComponent(at) : ""), { waitUntil: "load" });
  await p.waitForTimeout(900);
  return p;
}
const PHONE = { width: 390, height: 844 };

// 1. today (before the trip)
let p = await page(PHONE);
await p.screenshot({ path: S("01-now-before.png"), fullPage: false });
// 2. mid-trip morning, day 2 in Oberammergau
p = await page(PHONE, "2026-09-30T12:40:00+02:00");
await p.screenshot({ path: S("02-now-inday.png") });
// 3. the day view
await p.click('[data-tab="day"]'); await p.waitForTimeout(500);
await p.screenshot({ path: S("03-day.png"), fullPage: true });
// 4. a sight sheet
await p.click(".sight"); await p.waitForTimeout(600);
await p.screenshot({ path: S("04-sight.png") });
// 5. help
await p.keyboard.press("Escape"); await p.waitForTimeout(400);
await p.click('[data-tab="help"]'); await p.waitForTimeout(400);
await p.screenshot({ path: S("05-help.png") });
// 6. desktop
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const dp = await ctx.newPage();
dp.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));
await dp.goto(file + "?at=2026-10-02T10:00:00%2B02:00", { waitUntil: "load" });
await dp.waitForTimeout(900);
await dp.screenshot({ path: S("06-desktop.png") });
await b.close();
console.log(errs.length ? "ERRORS:\n" + [...new Set(errs)].join("\n") : "no console errors");
