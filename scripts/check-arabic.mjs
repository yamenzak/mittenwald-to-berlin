/* What an Arabic reader actually sees.

   A static scan of T("…") misses every call written as a ternary or with a
   variable key, so it said the page was clean while "Next train at" was still
   in English on the front page. This walks every screen and every sheet in
   Arabic and reports any Latin word that is not a proper noun — a place, a
   station, a line number — taken from the plan itself. */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const plan = JSON.parse(readFileSync(new URL("../data/plan.json", import.meta.url), "utf8"));

/* Words that are meant to stay in Latin: everything written on a German
   platform or a train. */
const allow = new Set(["ICE", "IC", "EC", "RE", "RB", "RB6", "S", "U", "DB", "OpenStreetMap",
  "Wikimedia", "Commons", "Google", "Maps", "Bahn", "Hbf", "Hauptbahnhof", "Bahnhof", "EN"]);
const feed = (s) => String(s || "").split(/[^A-Za-zÄÖÜäöüß]+/).forEach((w) => w.length > 1 && allow.add(w));
Object.values(plan.places).forEach((p) => { feed(p.n); feed(p.name); feed(p.stn); feed(p.q); });
Object.values(plan.sights).forEach((x) => feed(x.name));
/* Photographers' names are credited as given; they are not text to translate. */
Object.values(plan.credits || {}).forEach((c) => { feed(c.by); feed(c.lic); });
plan.days.forEach((d) => d.paths.forEach((p) => p.seq.forEach((s) => {
  if (s.kind !== "move" || !s.legs) return;
  s.legs.forEach((l) => { feed(l.line); feed(l.from); feed(l.to); feed(l.towards); });
  feed(s.fromStop); feed(s.toStop);
})));

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 390, height: 880 } });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
await p.goto("file:///home/user/trip/out/mittenwald-to-berlin.html?lang=ar&at=2026-10-02T09:30:00%2B02:00", { waitUntil: "load" });
await p.waitForTimeout(700);

const found = new Map();
async function sweep(where) {
  const words = await p.evaluate(() => {
    const seen = new Set();
    const grab = (root) => {
      const t = root ? root.innerText || "" : "";
      (t.match(/[A-Za-z][A-Za-zÄÖÜäöüß'’]{2,}/g) || []).forEach((w) => seen.add(w));
    };
    grab(document.getElementById("app"));
    grab(document.querySelector(".top"));
    grab(document.querySelector(".nextbar"));
    if (!document.getElementById("sheet").hidden) grab(document.getElementById("sheet"));
    return [...seen];
  });
  for (const w of words) if (!allow.has(w)) {
    if (!found.has(w)) found.set(w, where);
  }
}

const click = async (sel, wait = 600) => {
  const l = p.locator(sel).first();
  if (await l.count() && await l.isVisible().catch(() => false)) { await l.click(); await p.waitForTimeout(wait); return true; }
  return false;
};

await sweep("step 1");
await click("[data-pick].route"); await sweep("step 1, picked");
await click('[data-goto="when"]'); await sweep("step 2");
await click('[data-goto="day"]', 800);
for (const d of [1, 2, 3, 4, 5]) {
  await click(`.days [data-goday="${d}"]`, 600);
  await sweep("day " + d);
  if (d === 1) { await click(".wthumb", 700); await sweep("sight drawer"); await click(".sheetx", 400); }
  if (d === 2) { await click(".tt", 900); await sweep("how often"); await p.keyboard.press("Escape"); await p.waitForTimeout(300); }
  if (d === 3) {
    await click('[data-trouble="missed"]', 2000); await sweep("missed train");
    await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await click('[data-trouble="stay60"]', 2000); await sweep("staying longer");
    await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  }
}
await click("#pulse", 700); await sweep("live info"); await p.keyboard.press("Escape"); await p.waitForTimeout(300);
await click("#morebtn", 600); await sweep("settings");
await click('#sheet [data-goto="pick"]', 700); await sweep("back at step 1");

await b.close();
console.log(`swept every screen in Arabic.`);
if (found.size) {
  console.log(`\n${found.size} English word(s) still showing:`);
  for (const [w, where] of [...found].sort()) console.log(`   ${w.padEnd(24)} (${where})`);
  process.exit(1);
}
console.log("no untranslated text on any screen.");
if (errs.length) { console.error(errs.join("\n")); process.exit(1); }
