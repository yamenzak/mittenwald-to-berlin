import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const errs = [];
const ctx = await b.newContext({ viewport: { width: 390, height: 880 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
await p.addInitScript(() => { try { localStorage.setItem("mb-toured", "1"); } catch (e) {} });
await p.goto("file:///home/user/trip/out/mittenwald-to-berlin.html?at=2026-10-02T09:30:00%2B02:00", { waitUntil: "load" });
await p.waitForTimeout(600);
await p.locator("[data-preset]").first().click(); await p.waitForTimeout(500);

console.log("english tabs:", await p.evaluate(() => [...document.querySelectorAll(".tab .lbl")].map(x => x.textContent).join(" / ")));
await p.click("#langbtn"); await p.waitForTimeout(700);
const st = await p.evaluate(() => ({
  dir: document.documentElement.getAttribute("dir"),
  lang: document.documentElement.getAttribute("lang"),
  tabs: [...document.querySelectorAll(".tab .lbl")].map(x => x.textContent).join(" / "),
  title: document.querySelector(".top h1")?.textContent,
  head: document.querySelector(".headline .big")?.textContent,
  body: document.getElementById("app").innerText.slice(0, 200).replace(/\n/g, " | "),
}));
console.log(JSON.stringify(st, null, 1));
// how much English is left on an Arabic screen
const leftover = await p.evaluate(() => {
  const t = document.getElementById("app").innerText;
  const words = t.match(/\b[A-Za-z][a-z]{3,}\b/g) || [];
  return [...new Set(words)].slice(0, 25);
});
console.log("english words still on the page:", leftover.join(", ") || "none");
await p.screenshot({ path: "shots/a1-ar-now.png" });

await p.click('[data-tab="day"]'); await p.waitForTimeout(500);
await p.screenshot({ path: "shots/a2-ar-day.png" });
await p.click('[data-tab="walk"]'); await p.waitForTimeout(600);
console.log("walk kind:", await p.evaluate(() => document.querySelector(".wt .kind")?.textContent + " / " + document.querySelector(".wt h2")?.textContent));
await p.screenshot({ path: "shots/a3-ar-walk.png" });

// the tour in Arabic
await p.evaluate(() => localStorage.removeItem("mb-toured"));
await p.click("#tripsbtn"); await p.waitForTimeout(400);
await p.click("#starttour"); await p.waitForTimeout(900);
console.log("tour step 1:", await p.evaluate(() => document.querySelector("#tour h3")?.textContent));
await p.screenshot({ path: "shots/a4-ar-tour.png" });
await b.close();
console.log(errs.length ? "\nERRORS:\n" + errs.join("\n") : "\nno page errors");
