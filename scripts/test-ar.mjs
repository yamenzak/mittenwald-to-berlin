/* The Arabic edition of the two questions and the day, and the switch that
   gets there from inside the app. */
import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const errs = [];
const ctx = await b.newContext({ viewport: { width: 390, height: 880 }, deviceScaleFactor: 2, ignoreHTTPSErrors: true });
const p = await ctx.newPage();
p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
await p.addInitScript(() => { try { if (!sessionStorage.getItem("wiped")) { localStorage.clear(); sessionStorage.setItem("wiped", "1"); } } catch (e) {} });
const U = "file:///home/user/trip/out/mittenwald-to-berlin.html";
await p.goto(U + "?at=2026-10-02T09:30:00%2B02:00", { waitUntil: "load" });
await p.waitForTimeout(700);

// switching language from inside the app, not from the link
await p.click("#morebtn"); await p.waitForTimeout(400);
await p.click("#langbtn2"); await p.waitForTimeout(900);
console.log("after the switch:", await p.evaluate(() => ({
  dir: document.documentElement.getAttribute("dir"),
  lang: document.documentElement.getAttribute("lang"),
  step: document.querySelector(".setup-head h2")?.textContent,
  next: document.querySelector('[data-goto="when"]')?.textContent.trim(),
})));
await p.waitForTimeout(1200);
await p.screenshot({ path: "shots/ar1-pick.png" });

await p.locator("[data-pick].route").first().click(); await p.waitForTimeout(800);
await p.locator(".nextbar [data-goto=\"when\"]").click(); await p.waitForTimeout(600);
await p.screenshot({ path: "shots/ar2-when.png", fullPage: true });
await p.locator(".nextbar [data-goto=\"day\"]").click(); await p.waitForTimeout(900);
console.log("the day in Arabic:", await p.evaluate(() => [...document.querySelectorAll(".label")].map((x) => x.textContent.trim())));
console.log("meals:", await p.evaluate(() => [...document.querySelectorAll(".mealcard")].map((x) => x.innerText.replace(/\n+/g, " · "))));
await p.screenshot({ path: "shots/ar3-day.png" });

// and the link straight into Arabic still works
const q = await ctx.newPage();
await q.goto(U + "?lang=ar&at=2026-10-02T09:30:00%2B02:00", { waitUntil: "load" });
await q.waitForTimeout(700);
console.log("from the link:", await q.evaluate(() => document.documentElement.getAttribute("dir")));

await b.close();
console.log(errs.length ? "\n" + errs.join("\n") : "\nno page errors");
if (errs.length) process.exit(1);
