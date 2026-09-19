import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const errs = [];
const ctx = await b.newContext({ viewport: { width: 390, height: 880 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.addInitScript(() => { try { localStorage.setItem("mb-toured", "1"); } catch (e) {} });
p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
await p.goto("file:///home/user/trip/out/mittenwald-to-berlin.html?at=2026-10-02T09:30:00%2B02:00", { waitUntil: "load" });
await p.waitForTimeout(600);
await p.locator("[data-preset]").first().click(); await p.waitForTimeout(600);

// 1. days on the day page
await p.click('[data-tab="day"]'); await p.waitForTimeout(500);
const chips = await p.locator('.days [data-goday]').count();
const before = await p.evaluate(() => document.querySelector(".hero h2")?.innerText);
await p.locator('.days [data-goday="2"]').click(); await p.waitForTimeout(400);
const after = await p.evaluate(() => document.querySelector(".hero h2")?.innerText);
console.log("day chips:", chips, "|", before, "->", after);
await p.screenshot({ path: "shots/r1-day.png" });

// 2. all days on the map
await p.click('[data-tab="map"]'); await p.waitForTimeout(500);
const hasAll = await p.locator('[data-mapday="0"]').count();
await p.locator('[data-mapday="0"]').click(); await p.waitForTimeout(600);
const cap = await p.evaluate(() => document.querySelector("#map + .pad h3")?.innerText + " | " + document.querySelector("#map + .pad .lead")?.innerText);
const legend = await p.locator(".legend span").count();
console.log("all-days option:", hasAll, "| caption:", cap, "| legend entries:", legend);

// 3. tappable times
await p.click('[data-tab="day"]'); await p.waitForTimeout(500);
const times = await p.locator(".tt").count();
await p.locator(".tt").first().click(); await p.waitForTimeout(800);
const freqTitle = await p.evaluate(() => document.querySelector("#sheet h2")?.innerText);
const freqRows = await p.locator("#sheet .kv").count();
console.log("tappable times:", times, "| sheet:", freqTitle, "| departures listed:", freqRows);
await p.screenshot({ path: "shots/r2-freq.png" });
await p.click('[data-close="1"]'); await p.waitForTimeout(400);

// 4. the indicator explains itself
await p.click("#pulse"); await p.waitForTimeout(700);
console.log("pulse sheet:", await p.evaluate(() => document.querySelector("#sheet h2")?.innerText + " — " + document.querySelector("#sheet .about")?.innerText.slice(0, 70)));
await b.close();
console.log(errs.length ? "\nERRORS:\n" + errs.join("\n") : "\nno page errors");
