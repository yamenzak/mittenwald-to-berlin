import { chromium } from "playwright";
const file = "file:///home/user/trip/out/mittenwald-to-berlin.html";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto(file + "?at=2026-09-30T12:40:00%2B02:00", { waitUntil: "load" });
await p.click('[data-tab="day"]'); await p.waitForTimeout(600);
await p.locator(".routes").screenshot({ path: "/home/user/trip/shots/z-routes.png" });
await p.locator(".move").nth(3).screenshot({ path: "/home/user/trip/shots/z-move.png" });
// how many sight images actually have data
const stats = await p.evaluate(() => {
  const im = [...document.querySelectorAll(".sight img")];
  return { total: im.length, withSrc: im.filter(i => i.src && i.src.startsWith("data:")).length,
           broken: im.filter(i => i.complete && i.naturalWidth === 0).length };
});
console.log(JSON.stringify(stats));
await b.close();
