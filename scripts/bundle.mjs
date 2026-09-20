/* One file out. She saves it, and it keeps working on a train with no signal. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
const R = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");

const html = R("src/index.html");
/* The Arabic edition is baked into plan.json by the planner, which needs the
   network and several minutes. Reading ar.mjs here as well means a wording fix
   costs a second — the trap being that a translation looked wrong on screen
   while it was already right in the file. */
const { AR } = await import("../data/ar.mjs");
const planned = JSON.parse(R("data/plan.json"));
planned.ar = AR;
const plan = JSON.stringify(planned);
const img = existsSync(new URL("../data/images.json", import.meta.url)) ? R("data/images.json") : "{}";

const out = html
  .replace("/*__CSS__*/", () => R("src/style.css"))
  .replace("/*__PLAN__*/null", () => plan)
  .replace("/*__IMG__*/null", () => img)
  .replace("/*__APP__*/", () => R("src/app.js"));

mkdirSync(new URL("../out/", import.meta.url), { recursive: true });
const path = new URL("../out/mittenwald-to-berlin.html", import.meta.url).pathname;
writeFileSync(path, out);
// Also at the repo root, so GitHub Pages serves it with no configuration.
writeFileSync(new URL("../index.html", import.meta.url).pathname, out);
console.log(`${path}  ${(Buffer.byteLength(out) / 1048576).toFixed(2)} MB`);
