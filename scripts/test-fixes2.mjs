/* The six things reported: the indicator after changing an option, the page
   jumping to the top, Arabic cards that were still left-to-right, a drawer
   with no way out, pictures that vanished in Arabic, and a link that opens in
   Arabic by itself. */
import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const errs = [];
async function page(q) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 880 }, deviceScaleFactor: 2, ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
  await p.addInitScript(() => { try { if (!sessionStorage.getItem("wiped")) { localStorage.clear(); sessionStorage.setItem("wiped", "1"); } } catch (e) {} });
  await p.goto("file:///home/user/trip/out/mittenwald-to-berlin.html" + q, { waitUntil: "load" });
  await p.waitForTimeout(700);
  return p;
}

// 1 + 2: choosing an option keeps your place and does not reset the indicator
let p = await page("?at=2026-10-02T09:30:00%2B02:00");
await p.locator("[data-pick].route").first().click(); await p.waitForTimeout(600);
await p.click('[data-goto="when"]'); await p.waitForTimeout(500);
await p.click('[data-goto="day"]'); await p.waitForTimeout(800);
await p.evaluate(() => window.scrollTo(0, 900)); await p.waitForTimeout(250);
const before = await p.evaluate(() => Math.round(window.scrollY));
await p.locator("[data-route]").nth(1).click(); await p.waitForTimeout(900);
const after = await p.evaluate(() => Math.round(window.scrollY));
console.log(`scroll kept when changing a day's option: ${before} -> ${after}`);
const pulse = await p.evaluate(() => document.querySelector("#pulse span")?.innerText);
console.log("indicator after the change:", JSON.stringify(pulse));

// ticking a sight off should not move the page either
// Playwright scrolls a target into view before clicking it, so the reading
// that matters is taken after the drawer is already open.
await p.locator(".wthumb").first().click(); await p.waitForTimeout(600);
const b2 = await p.evaluate(() => Math.round(window.scrollY));
const hasX = await p.locator(".sheetx").count();
console.log("drawer has a close button:", hasX === 1);
await p.locator(".sheetx").click(); await p.waitForTimeout(500);
console.log(`scroll kept through the drawer: ${b2} -> ${await p.evaluate(() => Math.round(window.scrollY))}`);

// 3 + 5: Arabic, straight from the link
const q = await page("?lang=ar&at=2026-10-02T09:30:00%2B02:00");
console.log("opens in Arabic from the link:", await q.evaluate(() => document.documentElement.getAttribute("dir")));
await q.locator("[data-pick].route").first().click(); await q.waitForTimeout(700);
const card = await q.evaluate(() => {
  const el = document.querySelector("[data-pick].route");
  return { align: getComputedStyle(el).textAlign, dir: getComputedStyle(el).direction };
});
console.log("preset card:", JSON.stringify(card));
await q.click('[data-goto="when"]'); await q.waitForTimeout(500);
await q.click('[data-goto="day"]'); await q.waitForTimeout(900);
const imgs = await q.evaluate(() => {
  const t = [...document.querySelectorAll(".wthumb img")], s = [...document.querySelectorAll(".sight img")];
  return { thumbs: t.length, thumbsBroken: t.filter(i => i.complete && i.naturalWidth === 0).length,
           cards: s.length, cardsBroken: s.filter(i => i.complete && i.naturalWidth === 0).length };
});
console.log("arabic images:", JSON.stringify(imgs));
await q.screenshot({ path: "shots/x1-ar-day.png" });
await q.locator("#morebtn").click(); await q.waitForTimeout(400);
await q.locator('#sheet [data-goto="pick"]').click(); await q.waitForTimeout(1400);
console.log("arabic map draws:", await q.locator("#map path.leaflet-interactive").count());
await q.screenshot({ path: "shots/x2-ar-trip.png" });
await b.close();
console.log(errs.length ? "\nERRORS:\n" + [...new Set(errs)].join("\n") : "\nno page errors");
