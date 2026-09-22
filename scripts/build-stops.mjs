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
const CENTRE = { ettal: [47.5692, 11.0946], mxp: [45.6306, 8.7281], portofino: [44.3032, 9.2097] };
/* Stations verified by hand where the search cannot see them. Ettal has no
   railway at all — the 9606 bus stops at the abbey gate, and that is the stop. */
const PINNED = {
  mxp:           [45.63060,  8.72810, "Malpensa Aeroporto Terminal 1"],
  milan:         [45.48620,  9.20500, "Milano Centrale"],
  genoa:         [44.41700,  8.92000, "Genova Piazza Principe"],
  smargherita:   [44.33450,  9.20930, "S. Margherita Ligure-Portofino"],
  portofino:     [44.30340,  9.20970, "Portofino, Piazzetta (bus)"],
  verona:        [45.42880, 10.98200, "Verona Porta Nuova"],
  bolzano:       [46.49500, 11.35600, "Bolzano/Bozen"],
  ortisei:       [46.57600, 11.67200, "Ortisei/St. Ulrich, bus station"],
  scristina:     [46.55900, 11.72000, "S. Cristina Valgardena, bus station"],
  innsbruck:     [47.26320, 11.40100, "Innsbruck Hauptbahnhof"],
  mittenwald:    [47.44000, 11.26550, "Bahnhof Mittenwald"],
  garmisch:      [47.49145, 11.09701, "Bahnhof Garmisch-Partenkirchen"],
  ettal:         [47.56950, 11.09490, "Ettal, Kloster (bus)"],
  munich:        [48.14044, 11.55772, "München Hauptbahnhof"],
  rosenheim:     [47.85060, 12.12220, "Bahnhof Rosenheim"],
  berchtesgaden: [47.62900, 13.00000, "Berchtesgaden Hauptbahnhof"],
  konigssee:     [47.58700, 12.98800, "Königssee, Seelände (bus)"],
  salzburg:      [47.81300, 13.04600, "Salzburg Hauptbahnhof"],
  lindau:        [47.54500,  9.68100, "Lindau-Insel"],
  freiburg:      [47.99700,  7.84100, "Freiburg (Breisgau) Hauptbahnhof"],
  strasbourg:    [48.58500,  7.73400, "Strasbourg Gare Centrale"],
  colmar:        [48.07300,  7.34600, "Gare de Colmar"],
  heidelberg:    [49.40370,  8.67540, "Heidelberg Hauptbahnhof"],
  nuremberg:     [49.44550, 11.08230, "Nürnberg Hauptbahnhof"],
  berlin:        [52.52500, 13.36940, "Berlin Hauptbahnhof"],
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
