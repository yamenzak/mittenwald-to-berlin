import { readFileSync } from "node:fs";
const API = "https://api.transitous.org/api/v1";
const H = { headers: { "User-Agent": "MittenwaldToBerlin/1.0 (family trip page)" } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MODES = "REGIONAL_RAIL,REGIONAL_FAST_RAIL,METRO,SUBWAY,TRAM,BUS";
const COV = new Set(MODES.split(","));
const S = JSON.parse(readFileSync(new URL("../data/stops.json", import.meta.url), "utf8"));
Object.assign(S, {
  dessau:  { lat: 51.83970, lon: 12.23500 },
  leipzig: { lat: 51.34500, lon: 12.38100 },
  potsdam: { lat: 52.39150, lon: 13.06700 },
});
async function plan(a, b, time) {
  const q = new URLSearchParams({ fromPlace: `${S[a].lat},${S[a].lon}`, toPlace: `${S[b].lat},${S[b].lon}`,
    time, numItineraries: "5", transitModes: MODES, arriveBy: "false", maxPreTransitTime: "1800", pedestrianProfile: "FOOT" });
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`${API}/plan?${q}`, H);
    if (r.status === 429 || r.status >= 500) { await sleep(1800 * (i + 1)); continue; }
    if (!r.ok) return { error: r.status };
    return r.json();
  }
  return { error: "gave up" };
}
// 3 October 2026 is the holiday — a Sunday timetable. Ask about the real day.
const TIME = "2026-10-03T08:00:00+02:00";
for (const [a, b] of [["weimar","halle"],["erfurt","halle"],["weimar","leipzig"],
                      ["halle","leipzig"],["leipzig","berlin"],["halle","berlin"]]) {
  const res = await plan(a, b, TIME); await sleep(400);
  if (res.error) { console.log(`${a} → ${b}: ERROR ${res.error}`); continue; }
  const ok = (res.itineraries || []).filter((it) => {
    const L = it.legs.filter((l) => l.mode !== "WALK");
    return L.length && L.every((l) => COV.has(l.mode));
  });
  if (!ok.length) { console.log(`${a.padEnd(10)} → ${b.padEnd(10)} none`); continue; }
  const best = ok.reduce((x, y) => (y.duration < x.duration ? y : x));
  const L = best.legs.filter((l) => l.mode !== "WALK");
  const h = Math.floor(best.duration / 3600), m = Math.round((best.duration % 3600) / 60);
  console.log(`${a.padEnd(10)} → ${b.padEnd(10)} ${h}h${String(m).padStart(2,"0")}  ${L.length-1} chg  ${L.map(l=>l.routeShortName||l.mode).join(" · ")}`);
}
