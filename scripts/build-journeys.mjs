/* Resolves every move in data/trip.mjs against the real German timetable.

   Source: Transitous (api.transitous.org), a MOTIS instance fed by the official
   DELFI/DB GTFS feeds plus GTFS-Realtime. Free, no key, CORS-open, so the page
   can hit the same API live from the phone.

   Every query is filtered to the modes the ticket actually covers, so no
   itinerary here can put her on an ICE she has no ticket for. For each move we
   keep the chosen connection plus the next few departures, which is what the
   page falls back to when something is late. */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { DAYS, PLACES, TRIP } from "../data/trip.mjs";

const API = "https://api.transitous.org/api/v1";
const OUT = new URL("../data/journeys.json", import.meta.url).pathname;
const STOPS_OUT = new URL("../data/stops.json", import.meta.url).pathname;
const MODES = TRIP.ticket.modes.join(",");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FORCE = process.argv.includes("--force");

async function api(path, params, tries = 5) {
  const u = new URL(API + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(u, { headers: { "User-Agent": "MittenwaldToBerlin/1.0 (family trip page)" } });
      if (r.status === 429 || r.status >= 500) { await sleep(1500 * (i + 1)); continue; }
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      return j;
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(1200 * (i + 1));
    }
  }
  throw new Error("gave up on " + u);
}

/* Stations come from build-stops.mjs, as coordinates. */
const stops = JSON.parse(readFileSync(STOPS_OUT, "utf8"));

/* --- helpers ----------------------------------------------------------- */
const berlinOffset = (iso) => {
  // CEST until 25 Oct 2026, so the whole trip is +02:00. Computed, not assumed.
  const d = new Date(iso + "T12:00:00Z");
  const s = d.toLocaleString("en-US", { timeZone: TRIP.tz, timeZoneName: "longOffset" });
  const m = /GMT([+-]\d\d:\d\d)/.exec(s);
  return m ? m[1] : "+02:00";
};
const hhmm = (isoUtc) =>
  new Date(isoUtc).toLocaleTimeString("en-GB", { timeZone: TRIP.tz, hour: "2-digit", minute: "2-digit" });
const minsBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 60000);

const TRANSIT = (l) => l.mode && l.mode !== "WALK";
/* A leg the ticket does not cover would be a real hazard, so it is checked
   again here rather than trusted to the query filter. */
const COVERED = new Set(TRIP.ticket.modes);
const itinCovered = (it) => it.legs.filter(TRANSIT).every((l) => COVERED.has(l.mode));

function shape(it) {
  const legs = it.legs.filter(TRANSIT).map((l) => ({
    mode: l.mode,
    line: l.routeShortName || l.routeLongName || l.mode,
    headsign: l.headsign || l.to?.name || "",
    from: l.from.name,
    to: l.to.name,
    dep: hhmm(l.scheduledStartTime || l.startTime),
    arr: hhmm(l.scheduledEndTime || l.endTime),
    depIso: l.scheduledStartTime || l.startTime,
    arrIso: l.scheduledEndTime || l.endTime,
    track: l.from.scheduledTrack || l.from.track || null,
    tripId: l.tripId || null,
    dur: minsBetween(l.scheduledStartTime || l.startTime, l.scheduledEndTime || l.endTime),
  }));
  if (!legs.length) return null;
  const walkAtEnd = it.legs.filter((l) => !TRANSIT(l));
  return {
    dep: legs[0].dep,
    arr: legs[legs.length - 1].arr,
    depIso: legs[0].depIso,
    arrIso: legs[legs.length - 1].arrIso,
    dur: minsBetween(legs[0].depIso, legs[legs.length - 1].arrIso),
    changes: legs.length - 1,
    // How long she has at each change. Under 8 minutes is worth flagging.
    gaps: legs.slice(1).map((l, i) => minsBetween(legs[i].arrIso, l.depIso)),
    walkMins: Math.round(walkAtEnd.reduce((t, l) => t + (l.duration || 0), 0) / 60),
    legs,
  };
}

/* --- journeys ---------------------------------------------------------- */
const cache = existsSync(OUT) && !FORCE ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const out = {};
const warn = [];

for (const day of DAYS) {
  const off = berlinOffset(day.iso);
  for (const path of day.paths) {
    let cursor = null; // where we actually are, in real time
    for (let i = 0; i < path.seq.length; i++) {
      const step = path.seq[i];
      if (step.S) { cursor = step; continue; }

      const fromKey = step.via[0];
      const toKey = step.via[step.via.length - 1];
      const key = `${day.n}${path.id}-${i}`;
      const target = step.dep;

      if (cache[key] && cache[key].target === target && cache[key].from === fromKey && cache[key].to === toKey) {
        out[key] = cache[key];
        console.log(`  ${key.padEnd(8)} cached  ${out[key].best?.dep}→${out[key].best?.arr}`);
        continue;
      }

      const a = stops[fromKey], b = stops[toKey];
      if (!a || !b) { warn.push(`${key}: missing stop ${fromKey}/${toKey}`); continue; }

      // Ask from 15 min before the intended departure so the intended train is
      // in the result set along with the ones after it.
      const [h, m] = target.split(":").map(Number);
      const at = new Date(Date.UTC(...day.iso.split("-").map((n, j) => (j === 1 ? +n - 1 : +n)), h, m));
      at.setUTCMinutes(at.getUTCMinutes() - 15 - Number(off.slice(1, 3)) * 60 - Number(off.slice(4)) * (off[0] === "-" ? -1 : 1) * 0);
      const timeParam = `${day.iso}T${String(Math.max(0, h)).padStart(2, "0")}:${String(m).padStart(2, "0")}:00${off}`;

      let res;
      try {
        res = await api("/plan", {
          fromPlace: `${a.lat},${a.lon}`, toPlace: `${b.lat},${b.lon}`, time: timeParam,
          numItineraries: 6, transitModes: MODES, arriveBy: "false",
          maxPreTransitTime: 900, pedestrianProfile: "FOOT",
        });
      } catch (e) {
        warn.push(`${key} ${fromKey}->${toKey}: ${e.message}`);
        console.log(`  ${key.padEnd(8)} FAILED  ${e.message}`);
        continue;
      }
      await sleep(350);

      const shaped = (res.itineraries || []).filter(itinCovered).map(shape).filter(Boolean)
        .sort((x, y) => new Date(x.depIso) - new Date(y.depIso));
      if (!shaped.length) {
        warn.push(`${key} ${fromKey}->${toKey} at ${target}: no covered connection`);
        console.log(`  ${key.padEnd(8)} NONE`);
        continue;
      }

      // Prefer the earliest that leaves at or after the intended time; if the
      // plan was optimistic, take the first one that exists.
      const tmin = h * 60 + m;
      const onOrAfter = shaped.filter((s) => {
        const [hh, mm] = s.dep.split(":").map(Number);
        return hh * 60 + mm >= tmin - 5;
      });
      const pool = onOrAfter.length ? onOrAfter : shaped;
      // Among the first few, prefer fewer changes without losing more than 25 min.
      const head = pool.slice(0, 3);
      const best = head.reduce((x, y) => {
        if (y.changes < x.changes && minsBetween(x.depIso, y.depIso) <= 25) return y;
        return x;
      }, head[0]);

      out[key] = {
        target, from: fromKey, to: toKey,
        fromStop: a.name, toStop: b.name,
        fromLL: [a.lat, a.lon], toLL: [b.lat, b.lon],
        best,
        later: pool.filter((s) => s !== best && new Date(s.depIso) > new Date(best.depIso)).slice(0, 3),
      };
      const tight = best.gaps.filter((g) => g < 8);
      console.log(`  ${key.padEnd(8)} ${fromKey}→${toKey}  ${best.dep}→${best.arr}  ${best.changes} chg  ${best.legs.map((l) => l.line).join(" · ")}${tight.length ? `   TIGHT ${tight.join(",")}min` : ""}`);
    }
  }
}

writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`\nwrote ${OUT} — ${Object.keys(out).length} journeys`);
if (warn.length) { console.log(`\n${warn.length} PROBLEM(S):`); warn.forEach((w) => console.log("  " + w)); }
else console.log("every move resolved to a real, ticket-covered connection.");
