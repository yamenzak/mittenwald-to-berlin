/* One file out. She saves it, and it keeps working on a train with no signal. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
const R = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");

const html = R("src/index.html");
const plan = R("data/plan.json");
const img = existsSync(new URL("../data/images.json", import.meta.url)) ? R("data/images.json") : "{}";

const out = html
  .replace("/*__CSS__*/", () => R("src/style.css"))
  .replace("/*__PLAN__*/null", () => plan)
  .replace("/*__IMG__*/null", () => img)
  .replace("/*__APP__*/", () => R("src/app.js"));

mkdirSync(new URL("../out/", import.meta.url), { recursive: true });
const path = new URL("../out/mittenwald-to-berlin.html", import.meta.url).pathname;
writeFileSync(path, out);
console.log(`${path}  ${(Buffer.byteLength(out) / 1048576).toFixed(2)} MB`);
