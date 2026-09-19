import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const errs = [];
const ctx = await b.newContext({ viewport: { width: 390, height: 880 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
await p.addInitScript(() => { try { localStorage.setItem("mb-toured", "1"); } catch (e) {} });
await p.goto("file:///home/user/trip/out/mittenwald-to-berlin.html?at=2026-10-02T09:30:00%2B02:00", { waitUntil: "load" });
await p.waitForTimeout(700);

console.log("tabs:", await p.evaluate(() => [...document.querySelectorAll(".tab")].map(t => t.innerText.replace(/\n/g, "")).join(" | ")));
console.log("lands on:", await p.evaluate(() => document.querySelector('.tab[aria-selected="true"]')?.innerText.replace(/\n/g, "")));
console.log("presets on step 1:", await p.locator("[data-preset]").count());
await p.locator("[data-preset]").first().click(); await p.waitForTimeout(800);
console.log("map on step 1:", await p.locator("#map").count(), "| start options:", await p.locator("[data-setstart]").count(), "| beds:", await p.evaluate(() => /WHERE YOU SLEEP|أين تنامين/i.test(document.body.innerText)));
await p.screenshot({ path: "shots/v1-trip.png" });

await p.click('[data-tab="day"]'); await p.waitForTimeout(600);
console.log("day: chips", await p.locator('.days [data-goday]').count(), "| thumbnails", await p.locator(".wthumb").count());
await p.screenshot({ path: "shots/v2-day.png", fullPage: false });
await p.locator(".wthumb").first().click(); await p.waitForTimeout(600);
console.log("thumbnail opens:", await p.evaluate(() => document.querySelector("#sheet h2")?.innerText));
await p.keyboard.press("Escape"); await p.waitForTimeout(400);

await p.click('[data-tab="now"]'); await p.waitForTimeout(600);
console.log("guide toggle:", await p.locator("[data-guide]").count(), "| locate button:", await p.locator("[data-locate]").count(), "| trouble:", await p.locator("[data-trouble]").count());
await p.screenshot({ path: "shots/v3-now.png" });
await p.locator('[data-guide="steps"]').click(); await p.waitForTimeout(700);
console.log("step-by-step:", await p.evaluate(() => document.querySelector(".wt h2")?.innerText), "| next:", await p.locator('[data-wt="1"]').count());

await p.click("#morebtn"); await p.waitForTimeout(600);
console.log("settings has:", await p.evaluate(() => [...document.querySelectorAll("#sheet .btn")].map(x => x.innerText.trim()).join(" / ")));
await b.close();
console.log(errs.length ? "\nERRORS:\n" + errs.join("\n") : "\nno page errors");
