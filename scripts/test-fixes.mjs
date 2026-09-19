/* The four things this round was meant to fix, checked the way she would hit
   them: the arrow in the corner, the map staying in its box, live times in the
   walkthrough, and the plan working on dates it was not built for. */
import { chromium } from "playwright";
const file = "file:///home/user/trip/out/mittenwald-to-berlin.html";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const errs = [];

async function open(at, scheme) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 880 }, deviceScaleFactor: 2, colorScheme: scheme || "light" });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
  await p.goto(file + (at ? "?at=" + encodeURIComponent(at) : ""), { waitUntil: "load" });
  await p.waitForTimeout(600);
  await p.locator("[data-preset]").first().click().catch(() => {});
  await p.waitForTimeout(500);
  return p;
}

// 1. back button
let p = await open("2026-10-02T09:30:00+02:00");
const backAtStart = await p.locator("#backbtn").isDisabled();
await p.click('[data-tab="day"]'); await p.waitForTimeout(400);
const backEnabled = !(await p.locator("#backbtn").isDisabled());
await p.click("#backbtn"); await p.waitForTimeout(400);
const backWorked = await p.evaluate(() => document.querySelector('.tab[aria-selected="true"]')?.innerText.trim());
console.log("back: disabled at start", backAtStart, "| enabled after nav", backEnabled, "| returns to", backWorked);

// 2. chrome follows the theme
const lightBar = await p.evaluate(() => getComputedStyle(document.querySelector(".top")).backgroundColor);
const p2 = await open("2026-10-02T09:30:00+02:00", "dark");
const darkBar = await p2.evaluate(() => getComputedStyle(document.querySelector(".top")).backgroundColor);
console.log("chrome light:", lightBar, "| dark:", darkBar);
await p.screenshot({ path: "shots/f1-chrome-light.png" });
await p2.screenshot({ path: "shots/f2-chrome-dark.png" });

// 3. map must not sit above the tab bar
await p.click('[data-tab="walk"]'); await p.waitForTimeout(700);
const stack = await p.evaluate(() => {
  const m = document.getElementById("wtmap");
  const cs = m ? getComputedStyle(m) : null;
  const tabs = getComputedStyle(document.querySelector(".tabs"));
  return { mapZ: cs?.zIndex, mapIsolation: cs?.isolation, tabsZ: tabs.zIndex };
});
console.log("stacking:", JSON.stringify(stack));
// whatever is under the tab bar must be the tab bar
const hitTabs = await p.evaluate(() => {
  const t = document.querySelector(".tabs").getBoundingClientRect();
  const el = document.elementFromPoint(t.left + t.width / 2, t.top + t.height / 2);
  return el?.closest(".tabs") ? "tabs on top" : "SOMETHING ELSE: " + el?.className;
});
console.log("hit test over tab bar:", hitTabs);

// 4. the plan on different dates
await p.click("#datebtn"); await p.waitForTimeout(500);
const dateOpts = await p.locator("[data-setstart]").count();
await p.screenshot({ path: "shots/f3-dates.png" });
await p.locator("[data-setstart]").last().click(); await p.waitForTimeout(700);
const shiftedHeader = await p.evaluate(() => document.querySelector(".top .sub")?.innerText);
const shiftedDay = await p.evaluate(() => {
  const t = document.getElementById("app").innerText;
  const m = t.match(/DAY \d · [A-Z]{3} \d+ [A-Z]{3}/);
  return m ? m[0] : t.slice(0, 60).replace(/\n/g, " ");
});
console.log("date options:", dateOpts, "| after shift, header:", shiftedHeader, "| day line:", shiftedDay);

await b.close();
console.log(errs.length ? "\nERRORS:\n" + [...new Set(errs)].join("\n") : "\nno page errors");
