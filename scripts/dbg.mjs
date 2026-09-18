import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 390, height: 900 } });
await p.goto("file:///home/user/trip/out/mittenwald-to-berlin.html?at=2026-10-02T09:30:00%2B02:00", { waitUntil: "load" });
await p.waitForTimeout(600);
await p.locator("[data-preset]").first().click(); await p.waitForTimeout(400);
await p.click('[data-tab="walk"]'); await p.waitForTimeout(500);
for (let i = 0; i < 50; i++) {
  const s = await p.evaluate(() => {
    const day = document.querySelector('.dchip[aria-pressed="true"]')?.innerText.replace(/\n/g," ");
    const num = document.querySelector(".wtbar .num")?.innerText;
    const h = document.querySelector(".wt h2")?.innerText;
    return `${day} | ${num} | ${h}`;
  });
  if (i % 6 === 0 || i > 40) console.log(String(i).padStart(2), s);
  const btn = p.locator('[data-wt="1"]');
  if (await btn.isDisabled().catch(() => true)) { console.log("NEXT disabled at press", i); break; }
  await btn.click(); await p.waitForTimeout(90);
}
await b.close();
