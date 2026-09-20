/* Where each day's travel starts and ends.

   Resolving by stop name puts Oberammergau in Bern, and for the smaller towns
   the stop index only surfaces bus stops, so this does two things instead:
   it finds the station as an OSM object near the town's real coordinates, and
   it keeps the coordinates rather than a stop id. The planner is then asked to
   route from a point, which is what it is good at — it picks the right platform
   itself, and the answers come back direct instead of via Switzerland. */
import { writeFileSync, readFileSync } from "node:fs";
import { PLACES } from "../data/trip.mjs";

const API = "https://api.transitous.org/api/v1";
const H = { headers: { "User-Agent": "MittenwaldToBerlin/1.0 (family trip page)" } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sights = JSON.parse(readFileSync(new URL("../data/sights.json", import.meta.url), "utf8"));

async function geocode(text, place) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`${API}/geocode?text=${encodeURIComponent(text)}&place=${place}`, H);
    if (r.status === 429 || r.status >= 500) { await sleep(1500 * (i + 1)); continue; }
    return r.json();
  }
  return [];
}
const km = (a, b, c, d) => {
  const R = 6371, t = (x) => (x * Math.PI) / 180;
  const h = Math.sin(t(c - a) / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(t(d - b) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/* Town centres. Wikipedia's article coordinates, except for the three whose
   article is about an abbey or a valley rather than a settlement. */
const CENTRE = { ettal: [47.5692, 11.0946], oberau: [47.5637, 11.1355], seefeld: [47.3294, 11.1883] };
/* Stations verified by hand where the search cannot see them. Ettal has no
   railway at all — the 9606 bus stops at the abbey gate, and that is the stop. */
const PINNED = {
  ettal:        [47.5695, 11.0949, "Ettal, Kloster (bus)"],
  oberau:       [47.5616, 11.1318, "Bahnhof Oberau"],
  oberammergau: [47.5983, 11.0663, "Bahnhof Oberammergau"],
  mittenwald:   [47.4400, 11.2655, "Bahnhof Mittenwald"],
  eisenach:     [50.9744, 10.3268, "Eisenach Hauptbahnhof"],
  weimar:       [50.9930, 11.3253, "Bahnhof Weimar"],
  quedlinburg:  [51.7903, 11.1444, "Bahnhof Quedlinburg"],
  bamberg:      [49.9007, 10.9019, "Bahnhof Bamberg"],
  rothenburg:   [49.3760, 10.1934, "Bahnhof Rothenburg ob der Tauber"],
  donauworth:   [48.7155, 10.7713, "Bahnhof Donauwörth"],
  murnau:       [47.6823, 11.1930, "Bahnhof Murnau"],
  nuremberg:    [49.4455, 11.0823, "Nürnberg Hauptbahnhof"],
  wurzburg:     [49.8017, 9.9356, "Würzburg Hauptbahnhof"],
  heidelberg:   [49.4037, 8.6754, "Heidelberg Hauptbahnhof"],
  fulda:        [50.5544, 9.6836, "Bahnhof Fulda"],
  erfurt:       [50.9723, 11.0380, "Erfurt Hauptbahnhof"],
  naumburg:     [51.1620, 11.7962, "Naumburg (Saale) Hauptbahnhof"],
  magdeburg:    [52.1301, 11.6270, "Magdeburg Hauptbahnhof"],
  berlin:       [52.5250, 13.3694, "Berlin Hauptbahnhof"],
  munich:       [48.14044, 11.55772, "München Hauptbahnhof"],
  augsburg:     [48.36556, 10.88639, "Augsburg Hauptbahnhof"],
  landsberg:    [48.04727, 10.87170, "Bahnhof Landsberg (Lech)"],
  garmisch:     [47.49145, 11.09701, "Bahnhof Garmisch-Partenkirchen"],
  fussen:       [47.57026, 10.69782, "Bahnhof Füssen"],
  seefeld:      [47.32887, 11.18933, "Bahnhof Seefeld in Tirol"],
  friedberg:    [48.35306, 10.97556, "Bahnhof Friedberg (Bayern)"],
  jena:         [50.92417, 11.59139, "Bahnhof Jena Paradies"],
  saalfeld:     [50.65028, 11.36889, "Bahnhof Saalfeld (Saale)"],
  wernigerode:  [51.83394, 10.79358, "Wernigerode Hauptbahnhof"],
  thale:        [51.74889, 11.04389, "Thale Hauptbahnhof"],
  halberstadt:  [51.89306, 11.05917, "Bahnhof Halberstadt"],
  ulm:          [48.39930,  9.98240, "Ulm Hauptbahnhof"],
  esslingen:    [48.74253,  9.30470, "Bahnhof Esslingen (Neckar)"],
  halle:        [51.47750, 11.98720, "Halle (Saale) Hauptbahnhof"],
  leipzig:      [51.34500, 12.38100, "Leipzig Hauptbahnhof"],
};

const out = {};
for (const [k, p] of Object.entries(PLACES)) {
  const c = CENTRE[k] || [sights.places[k]?.lat, sights.places[k]?.lon];

  if (PINNED[k]) {
    const [lat, lon, name] = PINNED[k];
    out[k] = { lat, lon, name, src: "pinned", km: c[0] != null ? +km(c[0], c[1], lat, lon).toFixed(2) : null };
    console.log(`${k.padEnd(14)} ${name.padEnd(36)} pinned`);
    continue;
  }

  const hits = [];
  for (const q of [...new Set([p.stn, `${p.n} Hauptbahnhof`, `${p.n} Bahnhof`])]) {
    for (const r of await geocode(q, `${c[0]},${c[1]}`)) {
      if (r.lat == null) continue;
      const d = km(c[0], c[1], r.lat, r.lon);
      if (d > 4) continue;
      hits.push({ ...r, d });
    }
    await sleep(250);
  }
  const score = (s) => {
    const n = (s.name || "").toLowerCase();
    let v = -s.d;
    if (/hauptbahnhof|hbf/.test(n)) v += 6;
    else if (/^bahnhof|bahnhof$|\bbhf\b|station/.test(n)) v += 4;
    if (/parkplatz|p\+r|carsharing|ehemalig|fahrrad|bushaltestelle|,\s/.test(n)) v -= 4;
    if (n.includes(p.n.toLowerCase().split(/[ -]/)[0])) v += 1.5;
    return v;
  };
  const best = hits.sort((a, b) => score(b) - score(a))[0];
  if (!best) { console.log(`${k.padEnd(14)} NOTHING FOUND — add it to PINNED`); continue; }
  out[k] = { lat: best.lat, lon: best.lon, name: best.name, src: best.type, km: +best.d.toFixed(2) };
  console.log(`${k.padEnd(14)} ${String(best.name).padEnd(36)} ${best.type} ${best.d.toFixed(2)} km`);
}

writeFileSync(new URL("../data/stops.json", import.meta.url), JSON.stringify(out, null, 1));
console.log(`\nwrote ${Object.keys(out).length} stations`);
