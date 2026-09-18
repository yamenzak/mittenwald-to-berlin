/* Downloads every photo from Wikimedia and re-encodes it small enough to live
   inside the page itself.

   Inlining them matters: she will open this on a train in the Alps with one bar
   of signal, and a page whose pictures are still loading is a page she stops
   trusting. Everything here is sized for how it is actually displayed, so a
   card gets a card-sized photo and nothing carries pixels it never shows.

   The full-resolution original stays on Wikimedia and is fetched only when she
   opens a photo full-screen and has signal. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import sharp from "sharp";

const HERE = (f) => new URL("../data/" + f, import.meta.url).pathname;
const CACHE = new URL("../.imgcache/", import.meta.url).pathname;
mkdirSync(CACHE, { recursive: true });

const plan = JSON.parse(readFileSync(HERE("plan.json"), "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Sizes chosen from the layout: a sight card is never wider than ~190 CSS px,
   a hero is full-bleed. Doubled for retina, then compressed hard. */
const SIZES = { place: { w: 720, q: 56 }, sight: { w: 380, q: 54 } };

/* The API hands back thumbnails with campaign tracking glued on; upstream
   then refuses them. */
const clean = (u) => String(u).split("?")[0].replace("//thumb.wikimedia.org/", "//upload.wikimedia.org/");

async function grab(rawUrl) {
  const url = clean(rawUrl);
  const name = Buffer.from(url).toString("base64url").slice(-60) + ".bin";
  const p = CACHE + name;
  if (existsSync(p)) return readFileSync(p);
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: { "User-Agent": "MittenwaldToBerlin/1.0 (family trip page)" } });
    if (r.ok) { const b = Buffer.from(await r.arrayBuffer()); writeFileSync(p, b); return b; }
    await sleep(1000 * (i + 1));
  }
  throw new Error("could not fetch " + url);
}

async function encode(url, { w, q }) {
  const raw = await grab(url);
  return sharp(raw, { failOn: "none" })
    .rotate()
    .resize({ width: w, height: Math.round(w * 0.72), fit: "cover", position: "attention" })
    .webp({ quality: q, effort: 6, smartSubsample: true })
    .toBuffer();
}

/* Keep anything already encoded. A flaky minute on the network should not cost
   a hundred photographs that were already in hand. */
const out = existsSync(HERE("images.json")) ? JSON.parse(readFileSync(HERE("images.json"), "utf8")) : {};
const had = Object.keys(out).length;
let total = 0, n = 0, failed = [], fresh = 0;

const jobs = [
  ...Object.entries(plan.places).filter(([, p]) => p.photo).map(([k, p]) => ["place:" + k, p.photo, SIZES.place]),
  ...Object.entries(plan.sights).filter(([, s]) => s.photo).map(([k, s]) => ["sight:" + k, s.photo, SIZES.sight]),
];

/* Six at a time. The originals are several megabytes each and fetched once;
   the encode is cheap next to the download. */
const queue = jobs.slice();
async function worker() {
  for (;;) {
    const job = queue.shift();
    if (!job) return;
    const [key, url, size] = job;
    if (out[key] && !process.argv.includes("--force")) { n++; continue; }
    try {
      const buf = await encode(url, size);
      out[key] = "data:image/webp;base64," + buf.toString("base64");
      total += buf.length; n++; fresh++;
      if (fresh % 20 === 0) console.log(`  ${n}/${jobs.length} …`);
    } catch (e) {
      failed.push(`${key}: ${e.message}`);
    }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));

writeFileSync(HERE("images.json"), JSON.stringify(out));
const bytes = Object.values(out).reduce((t, v) => t + v.length, 0);
console.log(`\n${Object.keys(out).length} of ${jobs.length} images (${fresh} new this run)`);
console.log(`${(bytes / 1048576).toFixed(2)} MB inlined, ${(bytes / Object.keys(out).length / 1024).toFixed(1)} KB each`);
if (failed.length) { console.log(`\n${failed.length} failed:`); failed.forEach((f) => console.log("  " + f)); }
