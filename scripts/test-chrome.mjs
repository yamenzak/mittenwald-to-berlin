import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const errs = [];
const ctx = await b.newContext({ viewport: { width: 390, height: 880 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
await p.goto("file:///home/user/trip/out/mittenwald-to-berlin.html?at=2026-10-02T09:30:00%2B02:00", { waitUntil: "load" });
await p.waitForTimeout(600);

console.log("tabs:", await p.evaluate(() => [...document.querySelectorAll(".tab")].map(t => t.innerText.trim()).join(" / ")));
console.log("help reachable:", await p.evaluate(() => !!document.querySelector('[data-tab="help"]')));

await p.locator("[data-preset]").first().click(); await p.waitForTimeout(600);
console.log("after picking, on:", await p.evaluate(() => document.querySelector('.tab[aria-selected="true"]')?.innerText.trim()));

// the corner button must reach the itineraries from anywhere
await p.click('[data-tab="walk"]'); await p.waitForTimeout(400);
await p.click("#tripsbtn"); await p.waitForTimeout(500);
const onChooser = await p.evaluate(() => /PICK HOW YOU WANT|Four ways across Germany/i.test(document.getElementById("app").innerText));
console.log("corner button reaches the itineraries:", onChooser, "| options:", await p.locator("[data-preset]").count());
await p.screenshot({ path: "shots/c1-chooser.png" });

// and gets out again without changing anything
await p.click('[data-close-choose="1"]'); await p.waitForTimeout(500);
console.log("keep-current returns to:", await p.evaluate(() => document.querySelector('.tab[aria-selected="true"]')?.innerText.trim()));

// switching itinerary from the chooser lands in the trip
await p.click("#tripsbtn"); await p.waitForTimeout(400);
await p.locator("[data-preset]").nth(3).click(); await p.waitForTimeout(600);
console.log("after switching, on:", await p.evaluate(() => document.querySelector('.tab[aria-selected="true"]')?.innerText.trim()),
  "| stored:", await p.evaluate(() => localStorage.getItem("mb-preset")));
console.log("112 still reachable:", await p.evaluate(() => !!document.querySelector('a[href="tel:112"]')));
await p.screenshot({ path: "shots/c2-now.png" });
await b.close();
console.log(errs.length ? "\nERRORS:\n" + errs.join("\n") : "\nno page errors");
