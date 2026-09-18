/* Resolves every sight and town in data/trip.mjs against Wikipedia:
   real photo, real coordinates, real one-line description, real licence.
   Anything that does not resolve is printed loudly and left without a photo —
   the page never invents one. */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { PLACES, SIGHTS } from "../data/trip.mjs";

const OUT = new URL("../data/sights.json", import.meta.url).pathname;
const UA = "MittenwaldToBerlin/1.0 (personal family trip page; contact via github)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cache = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { sights: {}, places: {} };

async function getJSON(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA, "Api-User-Agent": UA } });
      if (r.status === 404) return null;
      if (r.status === 429 || r.status >= 500) { await sleep(1200 * (i + 1)); continue; }
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(900 * (i + 1));
    }
  }
  return null;
}

/* Wikipedia's summary endpoint gives us thumbnail, coordinates, wikidata id and
   a first paragraph, in one call. Try German first (these are German subjects and
   the German articles are better), fall back to English. */
async function summary(title) {
  for (const lang of ["de", "en"]) {
    const u = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`;
    const d = await getJSON(u);
    await sleep(120);
    if (!d || d.type === "disambiguation" || !d.title) continue;
    if (!d.thumbnail) continue; // no photo here; try the other language
    return { lang, d };
  }
  // last resort: accept a German article with no photo, so at least the link works
  const d = await getJSON(`https://de.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`);
  return d && d.title ? { lang: "de", d } : null;
}

/* Wikimedia thumbnails are resizable by rewriting the width in the path. */
function thumbAt(src, width) {
  if (!src) return null;
  const m = /^(.*\/)(\d+)px-([^/]+)$/.exec(src);
  if (m) return `${m[1]}${width}px-${m[3]}`;
  return src;
}
function commonsFile(src) {
  if (!src) return null;
  const m = /\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+)/.exec(src);
  return m ? decodeURIComponent(m[1]) : null;
}

/* Licence and author, so the credits page is true rather than decorative. */
async function licences(files) {
  const out = {};
  for (let i = 0; i < files.length; i += 40) {
    const batch = files.slice(i, i + 40);
    const u = "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=extmetadata&iiextmetadatafilter=LicenseShortName|Artist|LicenseUrl&titles=" +
      batch.map((f) => encodeURIComponent("File:" + f)).join("|");
    const d = await getJSON(u);
    await sleep(250);
    const pages = d?.query?.pages || {};
    for (const p of Object.values(pages)) {
      const md = p?.imageinfo?.[0]?.extmetadata;
      if (!md || !p.title) continue;
      const strip = (s) => (s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 90);
      out[p.title.replace(/^File:/, "")] = {
        lic: strip(md.LicenseShortName?.value) || "see Commons",
        by: strip(md.Artist?.value) || "unknown",
      };
    }
  }
  return out;
}

/* A German town article leads with the town's coat of arms, not a photograph of
   it, so the lead image has to be judged before it is trusted. */
const NOT_A_PHOTO = /wappen|coat.?of.?arms|[-_ ]coa[-_. ]|logo|karte$|[-_ ]karte|lageplan|locator|siegel|flagge|flag[-_ ]of|grundriss|stadtplan|emblem|\.svg$/i;
const isPhoto = (file) => !!file && !NOT_A_PHOTO.test(file);

/* When the article has no usable photo, search Commons directly. Still real,
   still attributed — just sourced from the media repository instead. */
async function commonsSearch(term) {
  const u = "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*" +
    "&generator=search&gsrnamespace=6&gsrlimit=8&gsrsearch=" + encodeURIComponent(term) +
    "&prop=imageinfo&iiprop=url|extmetadata&iiextmetadatafilter=LicenseShortName|Artist&iiurlwidth=1000";
  const d = await getJSON(u);
  await sleep(200);
  const pages = Object.values(d?.query?.pages || {});
  const ok = pages.filter((p) => /\.(jpe?g|png)$/i.test(p.title || "") &&
    p.imageinfo?.[0]?.thumburl && isPhoto(p.title.replace(/^File:/, "")));
  if (!ok.length) return null;
  ok.sort((a, b) => (a.index || 99) - (b.index || 99));
  const p = ok[0];
  return { thumb: p.imageinfo[0].thumburl, file: p.title.replace(/^File:/, "") };
}

const fails = [];
const files = new Set();

/* What to look for on Commons when the article itself offers only a crest.
   A town wants a picture of the town; a named building wants itself. */
/* "<town> Altstadt" on Commons is a lottery: for Nuremberg it returns Altdorf
   bei Nürnberg, which is a different town, and for Munich an S-Bahn platform.
   Each hero is therefore aimed at the thing the town is actually known for. */
const TOWNWORD = {
  berlin: "Berlin Brandenburger Tor", munich: "München Marienplatz Neues Rathaus",
  oberammergau: "Oberammergau Dorfstraße Lüftlmalerei", murnau: "Murnau Staffelsee",
  donauworth: "Donauwörth Reichsstraße", ettal: "Kloster Ettal",
  nuremberg: "Nürnberg Altstadt Pegnitz Henkersteg", augsburg: "Augsburg Rathausplatz Perlachturm",
  jena: "Jena Thüringen Stadt", weimar: "Weimar Marktplatz",
  bamberg: "Bamberg Altes Rathaus Regnitz", erfurt: "Erfurt Krämerbrücke",
  naumburg: "Naumburg Saale Markt", saalfeld: "Saalfeld Saale Markt Rathaus",
  friedberg: "Friedberg Bayern Marienplatz", heidelberg: "Heidelberg Schloss Altstadt",
  wurzburg: "Würzburg Alte Mainbrücke Festung", rothenburg: "Rothenburg ob der Tauber Plönlein",
  quedlinburg: "Quedlinburg Fachwerk Markt", magdeburg: "Magdeburg Dom Elbe",
  fulda: "Fulda Dom Stadtschloss", eisenach: "Wartburg Eisenach",
  landsberg: "Landsberg am Lech Hauptplatz", fussen: "Füssen Altstadt Lech",
  garmisch: "Partenkirchen Ludwigstraße", mittenwald: "Mittenwald Obermarkt Karwendel",
  seefeld: "Seefeld in Tirol Ortszentrum", oberau: "Oberau Loisachtal",
};
function fallbackTerm(key, title) {
  const pk = key.startsWith("place:") ? key.slice(6) : key.split("/")[0];
  if (key.startsWith("place:") && TOWNWORD[pk]) return TOWNWORD[pk];
  if (key.startsWith("place:")) return `${title} Altstadt`;
  const name = key.split("/").slice(1).join("/");
  // "Donauwörth Ried island" finds nothing; the German place name does.
  const NAMED = {
    "oberammergau/Woodcarving workshops": "Holzschnitzer Oberammergau Werkstatt",
    "donauworth/Ried island": "Donauwörth Ried Wörnitz",
  };
  return (NAMED[key] || `${title} ${name}`).slice(0, 80);
}

async function resolve(key, title, width, commonsTerm) {
  if (cache.sights[key]?.ok && cache.sights[key].w === title && cache.sights[key].ct === (commonsTerm || null)
      && isPhoto(cache.sights[key].file)) {
    if (cache.sights[key].file) files.add(cache.sights[key].file);
    return cache.sights[key];
  }
  const r = await summary(title);
  if (!r) { fails.push(`${key}  ->  "${title}"  NO ARTICLE`); return { ok: false, w: title }; }
  const { lang, d } = r;
  const src = d.thumbnail?.source || null;
  if (!src && !commonsTerm) fails.push(`${key}  ->  "${d.title}" (${lang})  NO PHOTO`);
  let file = commonsFile(src);
  let img = thumbAt(src, width), imgBig = thumbAt(src, Math.max(width, 1000));
  const term = commonsTerm || (!isPhoto(file) ? fallbackTerm(key, d.title) : null);
  if (term) {
    const c = await commonsSearch(term);
    if (c) { img = thumbAt(c.thumb, width); imgBig = thumbAt(c.thumb, Math.max(width, 1000)); file = c.file; }
    else fails.push(`${key}  ->  "${d.title}" has no photograph and commons search "${term}" found none`);
  }
  if (file) files.add(file);
  return {
    ok: true, w: title, ct: commonsTerm || null, lang,
    title: d.title,
    url: d.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(d.title)}`,
    lat: d.coordinates?.lat ?? null,
    lon: d.coordinates?.lon ?? null,
    wd: d.wikibase_item || null,
    img, imgBig, file,
    // Only English prose reaches the page; the German lead paragraph would be
    // worse than nothing for the person reading it.
    extract: lang === "en" ? (d.extract || "").split(/(?<=[.!?])\s/).slice(0, 2).join(" ").slice(0, 260) : "",
  };
}

const out = { sights: {}, places: {}, credits: {} };

for (const [pk, p] of Object.entries(PLACES)) {
  process.stdout.write(`place ${pk} … `);
  out.places[pk] = await resolve(`place:${pk}`, p.w, 1200, TOWNWORD[pk]);
  console.log(out.places[pk].ok ? (out.places[pk].img ? "photo" : "no photo") : "FAILED");
}

for (const [pk, list] of Object.entries(SIGHTS)) {
  for (const s of list) {
    const key = `${pk}/${s.name}`;
    process.stdout.write(`  ${key} … `);
    out.sights[key] = await resolve(key, s.w, 640, s.cimg);
    console.log(out.sights[key].ok ? (out.sights[key].img ? "photo" : "no photo") : "FAILED");
  }
}

console.log(`\nfetching licences for ${files.size} images …`);
out.credits = await licences([...files]);

writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`\nwrote ${OUT}`);
console.log(`places ${Object.keys(out.places).length}, sights ${Object.keys(out.sights).length}, images ${files.size}`);
if (fails.length) {
  console.log(`\n${fails.length} PROBLEM(S) — fix the titles in data/trip.mjs:`);
  fails.forEach((f) => console.log("  " + f));
} else console.log("\nevery title resolved with a photo.");
