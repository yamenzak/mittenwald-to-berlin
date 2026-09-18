/* Turns the intent in data/trip.mjs into a real, self-consistent day.

   The times written by hand are a wish: "about two hours in Oberammergau,
   then on to Murnau". What actually runs is a different matter, so each day is
   walked in order and every move is planned from the moment she is genuinely
   free to leave — the previous train's real arrival plus the time she wanted in
   that town. The answer is a day whose numbers add up, built from the timetable
   rather than from optimism.

   Source: Transitous (api.transitous.org), MOTIS over the official DELFI/DB
   feeds with GTFS-Realtime. Free, keyless and CORS-open, so the page queries
   the same service live from her phone.

   Every query is restricted to the modes her ticket covers, and each returned
   itinerary is checked again before it is accepted. Nothing in this file can
   put her on an ICE she has no ticket for. */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { DAYS, PLACES, SIGHTS, TRIP } from "../data/trip.mjs";

const API = "https://api.transitous.org/api/v1";
const HERE = (f) => new URL("../data/" + f, import.meta.url).pathname;
const MODES = TRIP.ticket.modes.join(",");
const COVERED = new Set(TRIP.ticket.modes);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FORCE = process.argv.includes("--force");

const clean = (u) => (u ? String(u).split("?")[0] : null);
/* Wikipedia's lead paragraph only reaches the page in English. A German
   paragraph in front of an English reader is worse than no paragraph. */
const prose = (e) => (e && e.lang === "en" ? e.extract || "" : "");
const stops = JSON.parse(readFileSync(HERE("stops.json"), "utf8"));
const sights = JSON.parse(readFileSync(HERE("sights.json"), "utf8"));
const cache = existsSync(HERE(".plan-cache.json")) && !FORCE
  ? JSON.parse(readFileSync(HERE(".plan-cache.json"), "utf8")) : {};

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

/* --- time ---------------------------------------------------------------- */
const offsetOn = (iso) => {
  const s = new Date(iso + "T12:00:00Z").toLocaleString("en-US", { timeZone: TRIP.tz, timeZoneName: "longOffset" });
  return (/GMT([+-]\d\d:\d\d)/.exec(s) || [, "+02:00"])[1];
};
const local = (isoUtc) => new Date(isoUtc).toLocaleTimeString("en-GB", { timeZone: TRIP.tz, hour: "2-digit", minute: "2-digit" });
const mins = (t) => { const m = /^(\d\d):(\d\d)$/.exec(t || ""); return m ? +m[1] * 60 + +m[2] : null; };
const at = (iso, hhmm) => new Date(`${iso}T${hhmm}:00${offsetOn(iso)}`);
const between = (a, b) => Math.round((new Date(b) - new Date(a)) / 60000);

/* --- itineraries --------------------------------------------------------- */
const TRANSIT = (l) => l.mode && l.mode !== "WALK";
const covered = (it) => it.legs.filter(TRANSIT).every((l) => COVERED.has(l.mode));

function shape(it) {
  const legs = it.legs.filter(TRANSIT).map((l) => ({
    mode: l.mode,
    line: (l.routeShortName || l.routeLongName || l.mode).replace(/\s*\(\d+\)\s*$/, ""),
    towards: l.headsign || l.to?.name || "",
    from: l.from.name, to: l.to.name,
    dep: local(l.scheduledStartTime || l.startTime),
    arr: local(l.scheduledEndTime || l.endTime),
    depIso: l.scheduledStartTime || l.startTime,
    arrIso: l.scheduledEndTime || l.endTime,
    track: l.from.scheduledTrack || l.from.track || null,
    tripId: l.tripId || null,
  }));
  if (!legs.length) return null;
  const last = legs[legs.length - 1];
  return {
    dep: legs[0].dep, arr: last.arr,
    depIso: legs[0].depIso, arrIso: last.arrIso,
    dur: between(legs[0].depIso, last.arrIso),
    changes: legs.length - 1,
    gaps: legs.slice(1).map((l, i) => between(legs[i].arrIso, l.depIso)),
    legs,
  };
}

async function connections(fromKey, toKey, whenIso) {
  const a = stops[fromKey], b = stops[toKey];
  const ck = `${fromKey}|${toKey}|${whenIso}`;
  if (cache[ck]) return cache[ck];
  const res = await api("/plan", {
    fromPlace: `${a.lat},${a.lon}`, toPlace: `${b.lat},${b.lon}`,
    time: whenIso, numItineraries: 8, transitModes: MODES,
    arriveBy: "false", maxPreTransitTime: 1200, pedestrianProfile: "FOOT",
  });
  await sleep(350);
  const list = (res.itineraries || []).filter(covered).map(shape).filter(Boolean)
    .sort((x, y) => new Date(x.depIso) - new Date(y.depIso));
  cache[ck] = list;
  return list;
}

/* --- build --------------------------------------------------------------- */
const warn = [], out = { trip: TRIP, days: [], places: {}, sights: {}, credits: sights.credits };

for (const [k, p] of Object.entries(PLACES)) {
  out.places[k] = { ...p, ...stops[k], wiki: sights.places[k]?.url || null, photo: clean(sights.places[k]?.img),
    photoFile: sights.places[k]?.file || null, about: prose(sights.places[k]) };
}
for (const [pk, list] of Object.entries(SIGHTS)) {
  for (const s of list) {
    const e = sights.sights[`${pk}/${s.name}`] || {};
    out.sights[`${pk}/${s.name}`] = {
      place: pk, name: s.name, note: s.note, mins: s.mins, kind: s.kind,
      ticket: !!s.ticket, indoor: !!s.indoor, closed: s.closed || null,
      lat: e.lat ?? null, lon: e.lon ?? null,
      photo: clean(e.img), photoBig: clean(e.imgBig), photoFile: e.file || null,
      wiki: e.url || null, about: prose(e),
    };
  }
}

for (const day of DAYS) {
  const dOut = { ...day, paths: [] };
  console.log(`\nDay ${day.n} ${day.iso} — ${day.title}`);

  for (const path of day.paths) {
    const seq = [];
    // A path that starts with a move has no arrival to chain from, so it starts
    // at the hour it was written for.
    const first = path.seq[0];
    let clock = first.S ? null : at(day.iso, first.dep).toISOString();
    let ride = 0;

    for (let i = 0; i < path.seq.length; i++) {
      const step = path.seq[i];

      if (step.S) {
        const arrIso = clock || at(day.iso, step.arr).toISOString();
        // How long she asked to have here. Overnight stops have no departure.
        const want = step.dep ? mins(step.dep) - mins(step.arr) : null;
        seq.push({ kind: "stop", place: step.S, stn: step.stn || "", see: step.see || [],
                   base: !!step.base, arrIso, want });
        clock = want == null ? arrIso : new Date(new Date(arrIso).getTime() + want * 60000).toISOString();
        continue;
      }

      const from = step.via[0], to = step.via[step.via.length - 1];
      const prev = [...seq].reverse().find((x) => x.kind === "stop");
      // Waiting for the departure she wrote down can cost two hours when the
      // line is two-hourly, so the search starts a little earlier and then takes
      // whatever runs closest to the time she wanted — cutting a stop 25 minutes
      // short beats arriving somewhere at ten at night.
      const want = prev && prev.want ? prev.want : null;
      const minDwell = want == null ? 0 : (want <= 60 ? want : Math.max(45, Math.round(want * 0.6)));
      const earliest = prev ? new Date(new Date(prev.arrIso).getTime() + minDwell * 60000) : new Date(clock);
      const wantedDep = new Date(clock);

      // Search around the time she meant to leave, not from the earliest she
      // possibly could — asking from six hours out returns the next six trains
      // and none of them is the one she wants.
      const searchFrom = new Date(Math.max(+earliest, +wantedDep - 75 * 60000));

      let list = [];
      try { list = await connections(from, to, searchFrom.toISOString()); }
      catch (e) { warn.push(`day ${day.n}${path.id}: ${from}→${to} — ${e.message}`); }

      let usable = list.filter((c) => new Date(c.depIso) >= earliest);
      if (!usable.length && list.length) usable = list;
      if (!usable.length) {
        warn.push(`day ${day.n}${path.id}: no covered connection ${from}→${to} after ${local(searchFrom.toISOString())}`);
        seq.push({ kind: "move", from, to, note: step.x || "", bus: step.M === "Bus", missing: true });
        continue;
      }
      const cost = (c) => Math.abs(new Date(c.depIso) - wantedDep) / 60000 + c.changes * 6;
      const best = usable.reduce((x, y) => (cost(y) < cost(x) ? y : x), usable[0]);

      ride += best.dur;
      seq.push({
        kind: "move", from, to, note: step.x || "", bus: step.M === "Bus",
        fromStop: stops[from].name, toStop: stops[to].name,
        fromLL: [stops[from].lat, stops[from].lon], toLL: [stops[to].lat, stops[to].lon],
        ...best,
        wanted: local(wantedDep.toISOString()),
        later: usable.filter((c) => new Date(c.depIso) > new Date(best.depIso)).slice(0, 3)
          .map(({ dep, arr, dur, changes, legs }) => ({ dep, arr, dur, changes, lines: legs.map((l) => l.line) })),
      });
      clock = best.arrIso;
    }

    // Now that the real trains are known, a stop's window is arrival to the
    // departure of the train she actually catches.
    for (let i = 0; i < seq.length; i++) {
      const s = seq[i];
      if (s.kind !== "stop") continue;
      const nextMove = seq.slice(i + 1).find((x) => x.kind === "move");
      s.arr = local(s.arrIso);
      if (s.base || !nextMove || nextMove.missing) { s.free = null; s.dep = null; continue; }
      s.depIso = nextMove.depIso;
      s.dep = nextMove.dep;
      s.free = between(s.arrIso, nextMove.depIso);
      if (s.want && s.free < Math.min(25, s.want)) {
        warn.push(`day ${day.n}${path.id}: only ${s.free} min in ${s.place} (wanted ${s.want})`);
      }
    }

    const stopsHere = seq.filter((s) => s.kind === "stop" && !s.base && s.free);
    const end = seq.filter((s) => s.kind === "stop").pop();
    dOut.paths.push({ id: path.id, name: path.name, why: path.why, seq,
      ride, stops: stopsHere.length, endArr: end ? end.arr : null,
      startDep: seq.find((s) => s.kind === "move")?.dep || seq[0]?.arr || null });

    console.log(`  ${path.id} ${path.name.padEnd(30)} ${stopsHere.length} stops · ${Math.floor(ride / 60)}h${String(ride % 60).padStart(2, "0")} riding · ends ${end?.arr}`);
    for (const s of seq) {
      if (s.kind === "stop") console.log(`      ${String(s.place).padEnd(14)} ${s.arr}${s.dep ? "–" + s.dep : "  (night)"}   ${s.free ? s.free + " min" : ""}`);
      else if (s.missing) console.log(`      ---> ${s.from}→${s.to}  NO CONNECTION`);
      else console.log(`      ---> ${s.dep}–${s.arr}  ${s.legs.map((l) => l.line).join(" · ")}${s.gaps.some((g) => g < 8) ? `  TIGHT ${s.gaps.filter((g) => g < 8).join(",")}min` : ""}`);
    }
  }
  out.days.push(dOut);
}

writeFileSync(HERE(".plan-cache.json"), JSON.stringify(cache));
writeFileSync(HERE("plan.json"), JSON.stringify(out, null, 1));
console.log(`\nwrote data/plan.json`);
if (warn.length) { console.log(`\n${warn.length} thing(s) worth knowing:`); warn.forEach((w) => console.log("  " + w)); }
else console.log("every day adds up.");
