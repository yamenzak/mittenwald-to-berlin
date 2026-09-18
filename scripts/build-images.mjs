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
/* Two widths each: what we ask Wikimedia for (a size it actually serves) and
   what we keep (what the layout displays, doubled for retina). Downloading
   bigger and shrinking locally gives a visibly cleaner result than asking for
   the small one, and costs nothing in the page. */
const SIZES = { place: { dl: 800, w: 700, q: 52 }, sight: { dl: 500, w: 340, q: 50 } };

/* Wikimedia only serves thumbnails at a fixed set of widths, and only up to the
   size of the original — ask for 720 and it answers "use the listed sizes", ask
   for 800 of a 600px photo and it says the same. So candidates are tried
   largest first and the first width that exists wins. */
const STANDARD = [1280, 1024, 800, 640, 500, 320, 250, 200];
function candidates(url, want) {
  const m = /^(.*\/)(\d+)px-([^/?]+)$/.exec(url);
  if (!m) return [url];
  const [, base, native, file] = m;
  return [...new Set([...STANDARD.filter((w) => w <= want), +native])]
    .filter((w) => w > 0).sort((a, b) => b - a)
    .map((w) => `${base}${w}px-${file}`);
}

/* The API hands back thumbnails with campaign tracking glued on; upstream
   then refuses them. */
const clean = (u) => String(u).split("?")[0].replace("//thumb.wikimedia.org/", "//upload.wikimedia.org/");

async function grab(rawUrl, want) {
  const url = clean(rawUrl);
  const p = CACHE + Buffer.from(url + "|" + want).toString("base64url").slice(-60) + ".bin";
  if (existsSync(p)) return readFileSync(p);
  const H = { headers: { "User-Agent": "MittenwaldToBerlin/1.0 (family trip page)" } };
  let last = "no candidates";
  for (const u of candidates(url, want)) {
    for (let i = 0; i < 3; i++) {
      let r;
      try { r = await fetch(u, H); } catch (e) { last = e.message; await sleep(700 * (i + 1)); continue; }
      if (r.ok) { const b = Buffer.from(await r.arrayBuffer()); writeFileSync(p, b); return b; }
      last = "HTTP " + r.status;
      if (r.status === 400 || r.status === 404) break; // wrong width — try the next size down
      await sleep(900 * (i + 1));
    }
  }
  throw new Error(last + " \u00b7 " + url.slice(-64));
}

async function encode(url, { dl, w, q }) {
  const raw = await grab(url, dl);
  return sharp(raw, { failOn: "none" })
    .rotate()
    .resize({ width: w, height: Math.round(w * 0.72), fit: "cover", position: "attention" })
    .webp({ quality: q, effort: 6, smartSubsample: true })
    .toBuffer();
}

/* Keep anything already encoded. A flaky minute on the network should not cost
   a hundred photographs that were already in hand. */
const out = existsSync(HERE("images.json")) ? JSON.parse(readFileSync(HERE("images.json"), "utf8")) : {};
/* Which photo each key was built from. Without this, swapping a town's hero
   for a better one changes the plan but silently leaves the old picture in the
   page, because the key is still present. */
const srcOf = existsSync(HERE(".image-src.json")) ? JSON.parse(readFileSync(HERE(".image-src.json"), "utf8")) : {};
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
    if (out[key] && srcOf[key] === clean(url) && !process.argv.includes("--force")) { n++; continue; }
    try {
      const buf = await encode(url, size);
      out[key] = "data:image/webp;base64," + buf.toString("base64");
      srcOf[key] = clean(url);
      total += buf.length; n++; fresh++;
      if (fresh % 20 === 0) console.log(`  ${n}/${jobs.length} …`);
    } catch (e) {
      failed.push(`${key}: ${e.message}`);
    }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));

writeFileSync(HERE("images.json"), JSON.stringify(out));
writeFileSync(HERE(".image-src.json"), JSON.stringify(srcOf));
const bytes = Object.values(out).reduce((t, v) => t + v.length, 0);
console.log(`\n${Object.keys(out).length} of ${jobs.length} images (${fresh} new this run)`);
console.log(`${(bytes / 1048576).toFixed(2)} MB inlined, ${(bytes / Object.keys(out).length / 1024).toFixed(1)} KB each`);
if (failed.length) { console.log(`\n${failed.length} failed:`); failed.forEach((f) => console.log("  " + f)); }
