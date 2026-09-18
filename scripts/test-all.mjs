/* Walks the whole page the way she would: pick a preset, read a day, press
   Next through the walkthrough, open the recovery screen. Anything that throws
   here would have been found by her, on a platform, instead. */
import { chromium } from "playwright";
const file = "file:///home/user/trip/out/mittenwald-to-berlin.html";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const errs = [];
const ctx = await b.newContext({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
p.on("console", (m) => { if (m.type() === "error" && !/CERT|ERR_/.test(m.text())) errs.push("CONSOLE " + m.text()); });

await p.goto(file + "?at=2026-10-02T09:30:00%2B02:00", { waitUntil: "load" });
await p.waitForTimeout(700);

// first run should offer the presets
const presets = await p.locator("[data-preset]").count();
console.log("preset cards:", presets);
await p.screenshot({ path: "shots/n1-presets.png" });

await p.locator("[data-preset]").first().click();
await p.waitForTimeout(700);
await p.screenshot({ path: "shots/n2-now.png" });
const beds = await p.evaluate(() => /WHERE YOU SLEEP/i.test(document.body.innerText));
console.log("beds card shown:", beds);

// the day, with its walking plan
await p.click('[data-tab="day"]'); await p.waitForTimeout(600);
const walkRows = await p.locator(".walkplan .wrow").count();
const rideHops = await p.evaluate(() => [...document.querySelectorAll(".whop b")].length);
const mapsBtn = await p.locator(".chip.go").count();
console.log("walk rows:", walkRows, "| in-town rides shown:", rideHops, "| route buttons:", mapsBtn);
await p.screenshot({ path: "shots/n3-day.png", fullPage: false });

// the walkthrough — press Next a good many times
await p.click('[data-tab="walk"]'); await p.waitForTimeout(700);
await p.screenshot({ path: "shots/n4-walk.png" });
let steps = 0;
for (let i = 0; i < 45; i++) {
  const btn = p.locator('[data-wt="1"]');
  if (await btn.isDisabled().catch(() => true)) break;
  await btn.click(); await p.waitForTimeout(120); steps++;
}
console.log("walkthrough Next presses that worked:", steps);
const wtText = await p.evaluate(() => document.querySelector(".wt h2")?.innerText);
console.log("ended on step:", wtText);
await p.screenshot({ path: "shots/n5-walk-later.png" });

// back a few
for (let i = 0; i < 5; i++) {
  const back = p.locator('[data-wt="-1"]');
  if (await back.isDisabled().catch(() => true)) break;
  await back.click(); await p.waitForTimeout(100);
}

// the recovery screen
await p.click('[data-tab="now"]'); await p.waitForTimeout(400);
const trouble = await p.locator("[data-trouble]").count();
console.log("recovery buttons:", trouble);

await b.close();
console.log(errs.length ? "\nERRORS:\n" + [...new Set(errs)].join("\n") : "\nno page errors anywhere");
