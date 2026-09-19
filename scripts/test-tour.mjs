import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const errs = [];
const p = await (await b.newContext({ viewport: { width: 390, height: 880 }, deviceScaleFactor: 2 })).newPage();
p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
await p.goto("file:///home/user/trip/out/mittenwald-to-berlin.html?at=2026-10-02T09:30:00%2B02:00", { waitUntil: "load" });
await p.waitForTimeout(1400);
let bad = 0;
for (let i = 0; i < 18; i++) {
  const st = await p.evaluate(() => {
    const h = document.querySelector("#tour h3")?.innerText;
    if (!h) return null;
    const c = document.querySelector("#tour .cut").getBoundingClientRect();
    const say = document.querySelector("#tour .say").getBoundingClientRect();
    // is there actually something under the hole?
    const el = c.width > 8 ? document.elementFromPoint(
      Math.min(innerWidth - 2, Math.max(2, c.left + c.width / 2)),
      Math.min(innerHeight - 2, Math.max(2, c.top + c.height / 2))) : null;
    return { h, w: Math.round(c.width), ht: Math.round(c.height),
      onScreen: say.top >= 0 && say.bottom <= innerHeight + 1,
      under: el ? (el.className || el.tagName).toString().slice(0, 30) : "(centred card)",
      tab: document.querySelector('.tab[aria-selected="true"]')?.innerText.replace(/\n/g, "") };
  });
  if (!st) { console.log("ended after", i); break; }
  const empty = st.w > 8 && st.under === "(centred card)";
  if (empty || !st.onScreen) bad++;
  console.log(`${String(i + 1).padStart(2)} ${st.tab} | ${st.h.slice(0, 36).padEnd(36)} | ${st.w}x${st.ht} over "${st.under}" | card ok ${st.onScreen}`);
  if (i === 1) await p.screenshot({ path: "shots/v4-tour-nav.png" });
  const nx = p.locator('#tour [data-tour="1"]');
  if (!(await nx.isVisible().catch(() => false))) break;
  await nx.click(); await p.waitForTimeout(400);
}
console.log("\nsteps with a hole over nothing or an off-screen card:", bad);
await b.close();
console.log(errs.length ? "ERRORS:\n" + errs.join("\n") : "no page errors");
