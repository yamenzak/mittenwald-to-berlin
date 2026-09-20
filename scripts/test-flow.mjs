/* The whole thing, from a phone that has never opened it: two questions, and
   then one screen. Anything that needs a second tap to find is a bug. */
import { chromium } from "playwright";

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 390, height: 880 }, deviceScaleFactor: 2, ignoreHTTPSErrors: true });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
const U = "file:///home/user/trip/out/mittenwald-to-berlin.html";
await p.addInitScript(() => { try { if (!sessionStorage.getItem("wiped")) { localStorage.clear(); sessionStorage.setItem("wiped", "1"); } } catch (e) {} });
await p.goto(U + "?at=2026-10-01T09:30:00%2B02:00", { waitUntil: "load" });
await p.waitForTimeout(1600);

const t = async (sel) => (await p.locator(sel).first().textContent() || "").trim();
console.log("lands on step 1:", await t(".setup-head h2"));
console.log("  itineraries:", await p.locator("[data-pick].route").count(),
  "| map lines:", await p.locator("#map path.leaflet-interactive").count(),
  "| legend:", await p.locator(".legend .lg").count());
console.log("  next is held back:", await p.evaluate(() => !!document.querySelector('.nextbar [data-goto="when"]')?.disabled));
console.log("  no navigation bar:", (await p.locator(".tabs").count()) === 0);
await p.screenshot({ path: "shots/w1-pick.png" });

await p.locator("[data-pick].route").nth(1).click(); await p.waitForTimeout(900);
console.log("after picking:", (await t('.nextbar [data-goto="when"]')));
await p.locator('.nextbar [data-goto="when"]').click(); await p.waitForTimeout(700);
console.log("step 2:", await t(".setup-head h2"), "| dates:", await p.locator("[data-setstart]").count(),
  "| beds listed:", await p.locator(".kv").count());
await p.screenshot({ path: "shots/w2-when.png", fullPage: true });

await p.locator('.nextbar [data-goto="day"]').click(); await p.waitForTimeout(1000);
console.log("the app:", await p.evaluate(() => [...document.querySelectorAll(".label")].map((x) => x.textContent.trim())));
console.log("  day chips:", await p.locator("[data-goday]").count(), "| thumbnails:", await p.locator(".wthumb").count());
await p.screenshot({ path: "shots/w3-day.png" });

const meals = async () => p.evaluate(() => [...document.querySelectorAll(".mealcard")].map((x) => x.innerText.replace(/\n+/g, " · ")));

// Every itinerary, end to end: the options a day offers have to start where
// the day before slept, or she is being shown a train from a town she is not in.
for (const id of ["classic", "romantic", "harz", "west", "alps"]) {
  await p.evaluate((x) => {
    localStorage.setItem("mb-preset", JSON.stringify(x));
    localStorage.setItem("mb-setup", "1");
    localStorage.removeItem("mb-routes");
  }, id);
  await p.reload({ waitUntil: "load" }); await p.waitForTimeout(700);
  const rows = [];
  for (let n = 1; n <= 5; n++) {
    await p.locator(`[data-goday="${n}"]`).first().click();
    await p.waitForTimeout(220);
    rows.push(await p.evaluate(() => ({
      opts: [...document.querySelectorAll("[data-route]")].map((x) => x.dataset.route.split(":")[1]),
      on: [...document.querySelectorAll('[data-route][aria-pressed="true"]')].map((x) => x.dataset.route.split(":")[1])[0],
    })));
  }
  await p.locator("#morebtn").click(); await p.waitForTimeout(250);
  await p.locator('#sheet [data-goto="when"]').click(); await p.waitForTimeout(450);
  const beds = await p.evaluate(() => [...document.querySelectorAll(".kv b")].map((x) => x.textContent).join(" · "));
  console.log(`  ${id.padEnd(9)} ` + rows.map((r, i) => `d${i + 1}[${r.opts.join("")}]${r.on || "–"}`).join(" ") + `\n             sleeps: ${beds}`);
  await p.locator('.nextbar [data-goto="day"]').click(); await p.waitForTimeout(400);
}
await p.evaluate(() => { localStorage.removeItem("mb-preset"); localStorage.removeItem("mb-routes"); });
await p.reload({ waitUntil: "load" }); await p.waitForTimeout(600);
await p.locator("[data-pick].route").first().click(); await p.waitForTimeout(500);
await p.locator('.nextbar [data-goto="when"]').click(); await p.waitForTimeout(400);
await p.locator('.nextbar [data-goto="day"]').click(); await p.waitForTimeout(700);

for (const d of [1, 2, 3, 4, 5]) {
  await p.locator(`[data-goday="${d}"]`).click(); await p.waitForTimeout(500);
  console.log(`  day ${d} meals:`, (await meals()).join("  |  ") || "none");
}

// it has to come back where it was left
await p.reload({ waitUntil: "load" }); await p.waitForTimeout(800);
console.log("reopens on the day:", await p.evaluate(() => !!document.querySelector(".tl")));

// and the two questions are still reachable
await p.locator("#morebtn").click(); await p.waitForTimeout(400);
console.log("settings:", await p.evaluate(() => [...document.querySelectorAll("#sheet .btn")].map((x) => x.textContent.trim())));
await p.locator('#sheet [data-goto="pick"]').click(); await p.waitForTimeout(800);
console.log("back at step 1:", await t(".setup-head h2"));

await b.close();
console.log(errs.length ? "\n" + errs.join("\n") : "\nno page errors");
if (errs.length) process.exit(1);
