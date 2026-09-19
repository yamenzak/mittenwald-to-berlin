/* There is nothing late eleven days out, so the walkthrough's live path is
   exercised with a seeded record, the same way the front page was. */
import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const AT = "2026-10-02T08:10:00+02:00";

async function run(name, live) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.addInitScript((l) => {
    try {
      localStorage.setItem("mb-preset", JSON.stringify("classic"));
      localStorage.setItem("mb-routes", JSON.stringify({ 1: "A", 2: "A", 3: "A", 4: "A", 5: "A" }));
      localStorage.setItem("mb-live", JSON.stringify(l));
    } catch (e) {}
  }, live);
  await p.goto("file:///home/user/trip/out/mittenwald-to-berlin.html?at=" + encodeURIComponent(AT), { waitUntil: "load" });
  await p.waitForTimeout(700);
  await p.click('[data-tab="walk"]'); await p.waitForTimeout(500);
  // walk forward to the first ride step of day 4
  for (let i = 0; i < 30; i++) {
    const k = await p.evaluate(() => document.querySelector(".wt .kind")?.innerText || "");
    if (/NOW TRAVEL/i.test(k)) break;
    const btn = p.locator('[data-wt="1"]');
    if (await btn.isDisabled().catch(() => true)) break;
    await btn.click(); await p.waitForTimeout(80);
  }
  const txt = await p.evaluate(() => document.querySelector(".wt .howto")?.innerText.replace(/\n/g, " "));
  const notes = await p.evaluate(() => [...document.querySelectorAll(".wt ~ * .note, .wt .note")].map((n) => n.innerText.trim()));
  console.log(`[${name}] ${txt}`);
  notes.forEach((n) => console.log("     note: " + n));
  await ctx.close();
}

const id = "mittenwald>garmisch@2026-09-30T06:36:00Z";
const base = { id, at: Date.now(), depDelay: 0, arrDelay: 0, track: "3", trackChanged: false, cancelled: false, gaps: [] };
await run("on time", { [id]: { ...base, realDep: "2026-09-30T06:36:00Z", realArr: "2026-09-30T07:00:00Z" } });
await run("22 late", { [id]: { ...base, depDelay: 22, arrDelay: 20, realDep: "2026-09-30T06:58:00Z", realArr: "2026-09-30T07:20:00Z" } });
await run("platform", { [id]: { ...base, track: "5", trackChanged: true, realDep: "2026-09-30T06:36:00Z", realArr: "2026-09-30T07:00:00Z" } });
await b.close();
