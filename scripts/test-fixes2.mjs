/* The things reported from the phone: the live indicator after changing an
   option, the page jumping to the top, a drawer with no way out, and pictures
   that did not load. */
import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const errs = [];
async function page(q) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 880 }, deviceScaleFactor: 2, ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto("file:///home/user/trip/out/mittenwald-to-berlin.html" + q, { waitUntil: "load" });
  await p.waitForTimeout(900);
  return p;
}

// Changing a day's option keeps your place and does not reset the indicator.
const p = await page("?at=2026-09-29T15:30:00%2B02:00");
await p.evaluate(() => window.scrollTo(0, 900)); await p.waitForTimeout(250);
const before = await p.evaluate(() => Math.round(window.scrollY));
await p.locator("[data-route]").nth(1).click(); await p.waitForTimeout(900);
console.log(`scroll kept when changing a day's option: ${before} -> ${await p.evaluate(() => Math.round(window.scrollY))}`);
console.log("indicator after the change:", JSON.stringify(await p.evaluate(() => document.querySelector("#pulse span")?.innerText)));

// Playwright scrolls a target into view before clicking, so the reading that
// matters is taken after the drawer is already open.
await p.locator(".wthumb").first().click(); await p.waitForTimeout(600);
const b2 = await p.evaluate(() => Math.round(window.scrollY));
console.log("drawer has a close button:", (await p.locator(".sheetx").count()) === 1);
await p.locator(".sheetx").click(); await p.waitForTimeout(500);
console.log(`scroll kept through the drawer: ${b2} -> ${await p.evaluate(() => Math.round(window.scrollY))}`);

// Pictures, on the fullest day
const q = await page("?at=2026-09-30T09:30:00%2B02:00");
await q.locator('[data-goday="2"]').first().click(); await q.waitForTimeout(800);
const imgs = await q.evaluate(() => {
  const t = [...document.querySelectorAll(".wthumb img")], s = [...document.querySelectorAll(".sight img")];
  return { thumbs: t.length, thumbsBroken: t.filter((i) => i.complete && i.naturalWidth === 0).length,
           cards: s.length, cardsBroken: s.filter((i) => i.complete && i.naturalWidth === 0).length };
});
console.log("images:", JSON.stringify(imgs));
if (imgs.thumbsBroken || imgs.cardsBroken) errs.push("broken images on the day page");
await q.screenshot({ path: "shots/x1-day.png" });

// The hotel list is the one thing that has to be right before leaving.
await q.locator("#morebtn").click(); await q.waitForTimeout(400);
const beds = await q.evaluate(() => [...document.querySelectorAll("#sheet .kv b")].map((x) => x.textContent));
console.log("where you sleep:", beds.join(" · "));
if (beds.length < 4) errs.push("hotel list is short");

await b.close();
console.log(errs.length ? "\nERRORS:\n" + [...new Set(errs)].join("\n") : "\nno page errors");
if (errs.length) process.exit(1);
