/* One fixed trip, one screen. It opens on the day and there is nothing to set up.
   The check that matters most is that every day's options start where the night
   before ended, and that the hotel list matches. */
import { chromium } from "playwright";

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 390, height: 880 }, deviceScaleFactor: 2, ignoreHTTPSErrors: true });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
await p.addInitScript(() => { try { if (!sessionStorage.getItem("wiped")) { localStorage.clear(); sessionStorage.setItem("wiped", "1"); } } catch (e) {} });
await p.goto("file:///home/user/trip/out/mittenwald-to-berlin.html?at=2026-10-01T09:30:00%2B02:00", { waitUntil: "load" });
await p.waitForTimeout(1600);

console.log("opens straight on the day:", await p.evaluate(() => !!document.querySelector(".tl")));
console.log("  no wizard:", await p.evaluate(() => !document.querySelector(".setup-head") && !document.querySelector(".nextbar")));
console.log("  no date picker:", await p.evaluate(() => !document.querySelector("[data-setstart]")));
console.log("  day chips:", await p.locator("[data-goday]").count(), "| thumbnails:", await p.locator(".wthumb").count());
await p.screenshot({ path: "shots/w1-day.png" });

for (let n = 1; n <= 5; n++) {
  await p.locator(`[data-goday="${n}"]`).first().click();
  await p.waitForTimeout(400);
  const r = await p.evaluate(() => ({
    title: document.querySelector(".hero .cap h2")?.textContent,
    stops: [...document.querySelectorAll(".ev.town h3, .ev.night h3")].map((x) => x.textContent),
    opts: [...document.querySelectorAll("[data-route]")].map((x) => x.dataset.route.split(":")[1]),
    meals: [...document.querySelectorAll(".mealcard")].map((x) => x.innerText.replace(/\n+/g, " · ")),
  }));
  const map = await p.evaluate(() => document.querySelectorAll("#map path.leaflet-interactive, #map .leaflet-marker-icon").length);
  console.log(`\n  day ${n}  ${r.title}   [${r.opts.join(" ") || "no choice"}]  map: ${map} shapes`);
  if (!map) errs.push(`day ${n}: nothing drawn on the map`);
  console.log(`     ${r.stops.join(" → ")}`);
  r.meals.forEach((m) => console.log(`     ${m}`));
}

await p.locator("#morebtn").click(); await p.waitForTimeout(400);
console.log("\n  where you sleep:", await p.evaluate(() => [...document.querySelectorAll("#sheet .kv")].map((x) => x.innerText.replace(/\n/g, " ")).join("  |  ")));
await p.keyboard.press("Escape"); await p.waitForTimeout(300);

await p.reload({ waitUntil: "load" }); await p.waitForTimeout(700);
console.log("  reopens on the day:", await p.evaluate(() => !!document.querySelector(".tl")));

await b.close();
console.log(errs.length ? "\n" + errs.join("\n") : "\nno page errors");
if (errs.length) process.exit(1);
