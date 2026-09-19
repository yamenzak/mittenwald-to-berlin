import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const errs = [];
const ctx = await b.newContext({ viewport: { width: 390, height: 880 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
await p.goto("file:///home/user/trip/out/mittenwald-to-berlin.html?at=2026-10-02T09:30:00%2B02:00", { waitUntil: "load" });
await p.waitForTimeout(1400); // the tour starts itself on a first visit

const started = await p.evaluate(() => document.getElementById("tour")?.classList.contains("on"));
console.log("tour auto-starts on a first visit:", started);

for (let i = 0; i < 14; i++) {
  const st = await p.evaluate(() => {
    const t = document.querySelector("#tour .step")?.innerText;
    const h = document.querySelector("#tour h3")?.innerText;
    const c = document.querySelector("#tour .cut");
    const r = c ? { w: Math.round(c.getBoundingClientRect().width), h: Math.round(c.getBoundingClientRect().height) } : null;
    const say = document.querySelector("#tour .say")?.getBoundingClientRect();
    const onScreen = say ? (say.top >= 0 && say.bottom <= innerHeight + 1) : false;
    return { t, h, cut: r, cardOnScreen: onScreen, view: document.querySelector('.tab[aria-selected="true"]')?.innerText.trim() };
  });
  if (!st.t) { console.log("tour ended after", i, "steps"); break; }
  console.log(`${String(i + 1).padStart(2)} ${st.t} | ${st.h} | tab=${st.view} | cut ${st.cut?.w}x${st.cut?.h} | card on screen: ${st.cardOnScreen}`);
  if (i === 3) await p.screenshot({ path: "shots/t1-tour.png" });
  const nx = p.locator('#tour [data-tour="1"]');
  if (!(await nx.count()) || !(await nx.isVisible().catch(() => false))) { console.log("Next not clickable at step", i + 1); break; }
  await nx.click(); await p.waitForTimeout(450);
}
const gone = await p.evaluate(() => !document.getElementById("tour").classList.contains("on"));
console.log("tour closes at the end:", gone, "| remembered:", await p.evaluate(() => localStorage.getItem("mb-toured")));
await b.close();
console.log(errs.length ? "\nERRORS:\n" + errs.join("\n") : "\nno page errors");
