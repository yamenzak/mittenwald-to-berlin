/* There are no delays to look at before the trip, so the states that matter
   are exercised with a seeded live record and read back off the day page,
   which is now the only place they are said. */
import { chromium } from "playwright";
const file = "file:///home/user/trip/out/mittenwald-to-berlin.html";
const AT = "2026-09-30T12:40:00+02:00";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const errs = [];

async function shot(name, live) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 1000 }, deviceScaleFactor: 2, ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errs.push(name + ": " + e.message));
  await p.addInitScript((l) => {
    try {
      localStorage.clear();
      // Straight into the app, past the two setup questions.
      localStorage.setItem("mb-preset", JSON.stringify("classic"));
      localStorage.setItem("mb-setup", "1");
      localStorage.setItem("mb-live", JSON.stringify(l));
    } catch (e) {}
  }, live);
  await p.goto(file + "?at=" + encodeURIComponent(AT), { waitUntil: "load" });
  await p.waitForTimeout(800);
  const notes = await p.evaluate(() => [...document.querySelectorAll(".tl .note")].map((n) => n.innerText.trim()));
  const pulse = await p.evaluate(() => document.querySelector("#pulse span")?.innerText);
  await p.screenshot({ path: `/home/user/trip/shots/live-${name}.png` });
  console.log(`\n[${name}] indicator: ${JSON.stringify(pulse)}`);
  notes.forEach((n) => console.log("   note: " + n.replace(/\n/g, " ")));
  if (!notes.length && name !== "ontime") errs.push(name + ": nothing said on the day page");
  await ctx.close();
}

// The move in view: Oberammergau -> Murnau, RB63, scheduled 14:40.
const id = "oberammergau>murnau@2026-09-30T12:40:00Z";
const base = { id, at: Date.now(), depDelay: 0, arrDelay: 0, track: "1", trackChanged: false, cancelled: false, gaps: [] };

await shot("ontime", { [id]: { ...base, realDep: "2026-09-30T12:40:00Z", realArr: "2026-09-30T13:22:00Z" } });
await shot("late", { [id]: { ...base, depDelay: 17, arrDelay: 14, realDep: "2026-09-30T12:57:00Z", realArr: "2026-09-30T13:36:00Z" } });
await shot("platform", { [id]: { ...base, track: "4", trackChanged: true, realDep: "2026-09-30T12:40:00Z", realArr: "2026-09-30T13:22:00Z" } });
await shot("cancelled", { [id]: { ...base, cancelled: true, realDep: "2026-09-30T12:40:00Z", realArr: "2026-09-30T13:22:00Z" } });

await b.close();
console.log(errs.length ? "\nERRORS:\n" + errs.join("\n") : "\nno page errors");
if (errs.length) process.exit(1);
