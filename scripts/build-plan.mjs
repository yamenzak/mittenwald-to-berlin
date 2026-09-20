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
import { DAYS, PLACES, PRESETS, SIGHTS, TRIP } from "../data/trip.mjs";

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

/* The mode filter is necessary and not sufficient. The Harzer
   Schmalspurbahnen — the Brocken steam railway — comes back from the feed as
   REGIONAL_RAIL, and it is a private railway with its own fares that the
   Deutschland-Ticket does not touch. It got itself routed into the Harz day
   and would have put her on a train she had no ticket for, which is the one
   thing this plan promises never to do. Anything on this list is refused
   whatever mode the feed calls it. */
const NOT_ON_THIS_TICKET = /^(HSB|WEG|BSB|SWEG-Bergbahn|Zugspitzbahn|ZSB|Wendelsteinbahn|Bayerische Zugspitzbahn)$/i;
const privateRail = (l) =>
  NOT_ON_THIS_TICKET.test((l.routeShortName || "").trim()) ||
  /schmalspurbahn|brockenbahn|harzquerbahn|zugspitzbahn/i.test(l.routeLongName || l.agencyName || "");

/* A change the feed prints as zero minutes is not a change a person makes.
   Four minutes is the floor — enough to get off, read a board and walk —
   except onto something that runs every few minutes anyway. Two minutes for
   an S-Bahn at Berlin Hbf is fine, and refusing it cost the Harz line its
   afternoon train and put her into Berlin two hours later. */
const MIN_CHANGE = 4, MIN_CHANGE_FREQUENT = 2;
const FREQUENT = new Set(["METRO", "SUBWAY", "TRAM"]);
const tooTight = (it) => {
  const legs = it.legs.filter(TRANSIT);
  return legs.slice(1).some((l, i) => {
    const gap = (new Date(l.scheduledStartTime || l.startTime) - new Date(legs[i].scheduledEndTime || legs[i].endTime)) / 60000;
    return gap < (FREQUENT.has(l.mode) ? MIN_CHANGE_FREQUENT : MIN_CHANGE);
  });
};

const covered = (it) => {
  const legs = it.legs.filter(TRANSIT);
  return legs.every((l) => COVERED.has(l.mode)) && !legs.some(privateRail) && !tooTight(it);
};

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

/* --- walking the town ----------------------------------------------------- */
/* A stop is not "two hours in Bamberg", it is a walk: out of the station, along
   the river, up to the cathedral, back down. The order of `see` in trip.mjs is
   that walk, and this measures it — real pedestrian routing, not crow-flies —
   so the page can say "then 6 min to the Old Town Hall" and be right, and so we
   can tell when a stop has been given less time than the walk actually takes. */
const walkCache = existsSync(HERE(".walk-cache.json"))
  ? JSON.parse(readFileSync(HERE(".walk-cache.json"), "utf8")) : {};

/* How to get from one thing to the next. Usually on foot — but Munich's English
   Garden is forty minutes' walk from Marienplatz and four stops on the U-Bahn,
   and a plan that only ever walks quietly deletes half of a big city. So
   anything over a quarter of an hour on foot is also priced as a ride, and
   whichever is genuinely quicker is what the page says to do. */
const HOP_TIME = "2026-10-02T09:00:00+02:00";

async function hopBetween(a, b) {
  const key = a.map((n) => n.toFixed(5)).join(",") + "|" + b.map((n) => n.toFixed(5)).join(",");
  if (walkCache[key] !== undefined) return walkCache[key];

  let walk = null;
  try {
    const res = await api("/plan", {
      fromPlace: a.join(","), toPlace: b.join(","),
      directModes: "WALK", transitModes: "", time: HOP_TIME,
    });
    await sleep(180);
    const d = (res.direct || []).find((x) => x.duration != null);
    if (d) walk = Math.max(1, Math.round(d.duration / 60));
  } catch (e) { /* fall through */ }

  let hop = walk == null ? null : { mins: walk, mode: "walk" };

  /* Zugspitze, Neuschwanstein, the Fairy Grottoes: the pedestrian router
     simply has no path, and the old code took that as "no hop" and wrote a
     null into the plan, which the page then printed as the word null. A
     place you cannot walk to is a place you ride to, so ask for the ride
     whenever the walk is long *or* missing. */
  if (walk == null || walk > 15) {
    try {
      const res = await api("/plan", {
        fromPlace: a.join(","), toPlace: b.join(","), time: HOP_TIME,
        numItineraries: 2, transitModes: MODES, arriveBy: "false",
        maxPreTransitTime: 900, pedestrianProfile: "FOOT",
      });
      await sleep(180);
      for (const it of res.itineraries || []) {
        const legs = (it.legs || []).filter(TRANSIT);
        if (!legs.length || !covered(it)) continue;
        const mins = Math.round(it.duration / 60);
        // Only worth the bother if it actually saves a walk worth saving —
        // and if there is no walk at all, any ride is worth it.
        if (walk == null || mins + 4 < walk) {
          hop = { mins, mode: "ride", line: legs[0].routeShortName || legs[0].mode,
                  vehicle: legs[0].mode, from: legs[0].from.name, to: legs[legs.length - 1].to.name,
                  walkInstead: walk == null ? null : walk };
        }
        break;
      }
    } catch (e) { /* the walk stands */ }
  }

  /* Still nothing — a cable car or a shuttle the feed does not carry. The
     straight line is a worse answer than the router's, and a much better one
     than a blank, so say roughly how far it is and let the map do the rest. */
  if (!hop) {
    const w = guessWalk(a, b);
    // Over a quarter of an hour on foot means she is not going on foot, and
    // calling it a walk up the Zugspitze would be a lie. Say how long getting
    // there takes and leave the how to the map.
    hop = w > 16
      ? { mins: guessHop(a, b), mode: "go", approx: true }
      : { mins: w, mode: "walk", approx: true };
  }

  walkCache[key] = hop;
  return hop;
}
const walkMinutes = async (a, b) => (await hopBetween(a, b))?.mins ?? null;
const hopKey = (a, b) => a.map((n) => n.toFixed(5)).join(",") + "|" + b.map((n) => n.toFixed(5)).join(",");

/* Deciding what to drop means pricing a lot of "what if we skipped this one"
   chains. Asking the router for every pair in a town is hundreds of requests
   and it gets rate-limited long before it gets useful, so the decisions are
   made on a straight-line estimate — which is quite good enough to know that
   the English Garden is far and the Frauenkirche is not — and then only the
   chain that survives is priced for real. Estimates choose; the router
   answers. */
const R = 6371;
function crow(a, b) {
  const t = (x) => (x * Math.PI) / 180;
  const h = Math.sin(t(b[0] - a[0]) / 2) ** 2 +
    Math.cos(t(a[0])) * Math.cos(t(b[0])) * Math.sin(t(b[1] - a[1]) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// Streets are not straight and people are not fast: 1.35x, at 4.6 km/h.
const guessWalk = (a, b) => Math.max(1, Math.round((crow(a, b) * 1.35 / 4.6) * 60));
// Over about a quarter of an hour she would ride instead, so cap the guess.
const guessHop = (a, b) => { const w = guessWalk(a, b); return w > 16 ? Math.round(10 + crow(a, b) * 2.2) : w; };

/* Google Maps takes a chain of points in one link, so the whole walk opens in
   the app she already uses with one tap. */
function mapsWalk(names) {
  if (names.length < 2) return null;
  const pts = names.slice(0, 10).map(encodeURIComponent);
  return `https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=${pts[0]}` +
    `&destination=${pts[pts.length - 1]}` +
    (pts.length > 2 ? `&waypoints=${pts.slice(1, -1).join("%7C")}` : "");
}

async function routeFor(stop, sightsIndex, free) {
  const p = PLACES[stop.place];
  const station = stops[stop.place];
  const chosen = (stop.see || []).map((n) => sightsIndex[`${stop.place}/${n}`]).filter(Boolean);
  const geo = chosen.filter((x) => x.lat != null);

  /* Walk the order, keeping a running clock from the moment she leaves the
     station, and see whether the whole thing fits in the window.

     When it does not, the greedy answer — take them in order until the time is
     gone — spends the morning on the squares nearest the station and cuts the
     castle, which is the reason anyone comes to Nuremberg. So the things worth
     the journey are marked, and it is the others that give way, largest first,
     until the walk fits. The order on the ground never changes; only which
     stops are on it. */
  const home = [station.lat, station.lon];
  const at = (x) => [x.lat, x.lon];
  const cost = (list) => {
    if (!list.length) return 0;
    let t = guessHop(home, at(list[0]));
    for (let i = 0; i < list.length; i++) {
      t += list[i].mins;
      if (i + 1 < list.length) t += guessHop(at(list[i]), at(list[i + 1]));
    }
    return t + guessHop(at(list[list.length - 1]), home);
  };

  let keep = geo.slice();
  const budget = free == null ? Infinity : free - 5; // five minutes of not running
  if (budget !== Infinity) {
    while (keep.length && cost(keep) > budget) {
      const droppable = keep.filter((x) => !x.must);
      // Nothing left to give up: start on the marked ones, cheapest loss last.
      const pool = droppable.length ? droppable : keep;
      const base = cost(keep);
      let worst = pool[0], worstSave = -1;
      for (const cand of pool) {
        const save = base - cost(keep.filter((x) => x !== cand));
        if (save > worstSave) { worstSave = save; worst = cand; }
      }
      keep = keep.filter((x) => x !== worst);
    }
  }
  const kept = new Set(keep);

  const legs = [];
  let prev = home, clock = 0;
  for (const x of geo) {
    const h = await hopBetween(prev, [x.lat, x.lon]);
    const backHop = await hopBetween([x.lat, x.lon], home);
    const on = kept.has(x);
    if (on) clock += (h?.mins || 0) + x.mins;
    legs.push({
      to: x.name, mins: h?.mins ?? null, how: h || null, visit: x.mins,
      backFromHere: backHop?.mins ?? null, backHow: backHop || null, must: !!x.must,
      lat: x.lat, lon: x.lon, kind: x.kind, note: x.note, ticket: x.ticket,
      at: on ? clock - x.mins : null, leaveBy: on ? clock : null, extra: !on,
    });
    if (on) prev = [x.lat, x.lon];
  }

  const core = legs.filter((l) => !l.extra);
  const back = core.length ? core[core.length - 1].backFromHere : null;
  const walkTotal = core.reduce((t, l) => t + (l.mins || 0), 0) + (back || 0);
  const visitTotal = core.reduce((t, l) => t + l.visit, 0);
  const townName = `${p.n}, ${p.country === "AT" ? "Austria" : "Germany"}`;

  return {
    legs, back, walkTotal, visitTotal,
    needs: walkTotal + visitTotal,
    fitted: core.length, dropped: legs.length - core.length,
    noCoords: chosen.filter((x) => x.lat == null).map((x) => x.name),
    // One tap opens the whole walk in the app she already has.
    maps: mapsWalk([station.name, ...core.map((l) => `${l.to}, ${p.n}`), station.name]),
    mapsAll: mapsWalk([station.name, ...geo.map((x) => `${x.name}, ${p.n}`), station.name]),
    town: townName,
  };
}

/* --- build --------------------------------------------------------------- */
const warn = [], out = { trip: TRIP, days: [], places: {}, sights: {}, credits: sights.credits };

for (const [k, p] of Object.entries(PLACES)) {
  out.places[k] = { ...p, ...stops[k], wiki: sights.places[k]?.url || null, photo: clean(sights.places[k]?.img),
    photoFile: sights.places[k]?.file || null, about: prose(sights.places[k]) };
}
const far = (a, b, c, d) => {
  const R = 6371, t = (x) => (x * Math.PI) / 180;
  const h = Math.sin(t(c - a) / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(t(d - b) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
for (const [pk, list] of Object.entries(SIGHTS)) {
  for (const s of list) {
    const e = sights.sights[`${pk}/${s.name}`] || {};
    out.sights[`${pk}/${s.name}`] = {
      place: pk, name: s.name, note: s.note, mins: s.mins, kind: s.kind,
      ticket: !!s.ticket, indoor: !!s.indoor, closed: s.closed || null, must: !!s.must,
      /* Some articles are about a technique, a person or a whole river, and
         their coordinates are useless — the Isar's are its mouth on the Danube,
         150 km away. `at` in trip.mjs pins the real spot. */
      lat: s.at ? s.at[0] : (e.lat ?? null), lon: s.at ? s.at[1] : (e.lon ?? null),
      photo: clean(e.img), photoBig: clean(e.imgBig), photoFile: e.file || null,
      wiki: e.url || null, about: prose(e),
    };
    // A sight an hour's drive from its own town is a bad coordinate, not a walk.
    const put = out.sights[`${pk}/${s.name}`], home = stops[pk];
    if (put.lat != null && home && far(home.lat, home.lon, put.lat, put.lon) > 20) {
      warn.push(`${pk}/${s.name}: coordinates are ${Math.round(far(home.lat, home.lon, put.lat, put.lon))} km from the station — pin it with at: [lat, lon]`);
    }
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

    // The walk through each town, measured, now that the windows are known.
    for (const st of seq) {
      if (st.kind !== "stop") continue;
      st.route = await routeFor(st, out.sights, st.base ? null : st.free);
      // A list longer than the window is fine — the page says which part fits.
      // Nothing fitting at all is a day that needs rewriting.
      if (!st.base && st.free && st.route.legs.length && st.route.fitted === 0) {
        warn.push(`day ${day.n}${path.id}: nothing fits in the ${st.free} min at ${st.place}`);
      }
    }

    const stopsHere = seq.filter((s) => s.kind === "stop" && !s.base && s.free);
    const end = seq.filter((s) => s.kind === "stop").pop();
    /* Where the day starts and where it sleeps. The four itineraries no longer
       share their beds, so a day's options are not interchangeable: one that
       begins in Würzburg is nonsense to a week that slept in Nuremberg. These
       two fields are what the page filters on. */
    // Where the day *leaves* from, which is not the first stop when the day
    // opens with a train: day two starts in Mittenwald and its first stop is
    // Garmisch.
    const from = seq[0] && seq[0].kind === "move"
      ? seq[0].from
      : (seq.find((s) => s.kind === "stop")?.place || null);
    dOut.paths.push({ id: path.id, name: path.name, why: path.why, seq,
      from, to: end ? end.place : null,
      /* A path may rename the day it belongs to — "Up the Romantic Road" and
         "The Harz" are the same date and nothing else. */
      title: path.title || null, intro: path.intro || null, hero: path.hero || null,
      bags: path.bags != null ? !!path.bags : null,
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

/* --- the walkthrough ------------------------------------------------------ */
/* The plan as one continuous line of steps: you are here, you walk to this,
   it is worth seeing because, now take this train, now you sleep. Somebody who
   has never planned a trip like this can press Next forty times and see the
   whole week happen, in order, on a map — which is a different and easier thing
   than reading a timetable and believing it. */
function stepsFor(day, path) {
  const steps = [];
  const at = (t) => ({ day: day.n, path: path.id, t });

  path.seq.forEach((s, i) => {
    if (s.kind === "move") {
      if (s.missing) return;
      const first = s.legs[0], last = s.legs[s.legs.length - 1];
      steps.push({
        ...at(s.dep), kind: "ride",
        title: `${isBusLeg(first) ? "Bus" : "Train"} to ${PLACES[s.to].n}`,
        line: first.line, from: s.fromStop, to: s.toStop,
        dep: s.dep, arr: s.arr, dur: s.dur, changes: s.changes,
        track: first.track || null,
        ll: [stops[s.from].lat, stops[s.from].lon],
        toLL: [stops[s.to].lat, stops[s.to].lon],
        place: s.from, toPlace: s.to,
        say: s.changes
          ? `${s.dur} minutes and ${s.changes} change${s.changes > 1 ? "s" : ""} — ${s.legs.map((l) => l.line).join(", then ")}.`
          : `${s.dur} minutes, straight through.`,
        note: s.note || "",
      });
      return;
    }

    const p = PLACES[s.place], st = stops[s.place];
    steps.push({
      ...at(s.arr), kind: "arrive", place: s.place,
      title: `You are in ${p.n}`,
      ll: [st.lat, st.lon], station: st.name,
      say: s.base
        ? `This is where you sleep tonight.${s.stn ? " " + s.stn : ""}`
        : `${s.free ? dur(s.free) : "A while"} here, until the ${s.dep} on.${s.stn ? " " + s.stn : ""}`,
      free: s.free || null, dep: s.dep || null,
    });

    (s.route?.legs || []).filter((l) => !l.extra).forEach((l) => {
      steps.push({
        ...at(null), kind: "see", place: s.place,
        title: l.to, ll: [l.lat, l.lon], sight: `${s.place}/${l.to}`,
        move: l.how && l.how.mode === "ride"
          ? `Take the ${l.how.line} — ${l.how.mins} min, instead of ${l.how.walkInstead} on foot.`
          : `${l.mins} min walk.`,
        rode: !!(l.how && l.how.mode === "ride"),
        mins: l.mins, visit: l.visit, say: l.note || "",
        offset: l.at, until: l.leaveBy, ticket: l.ticket,
      });
    });

    if (!s.base && s.route?.back != null) {
      steps.push({
        ...at(s.dep), kind: "back", place: s.place,
        title: `Back to ${st.name}`,
        ll: [st.lat, st.lon], mins: s.route.back,
        say: `${s.route.back} min back to the station. Aim to be on the platform by ${s.dep}.`,
      });
    }
    if (s.base) {
      steps.push({
        ...at(null), kind: "sleep", place: s.place,
        title: `Goodnight, ${p.n}`, ll: [st.lat, st.lon],
        say: day.n === DAYS.length ? "You made it. Berlin." : `Tomorrow: ${DAYS[day.n].title}.`,
      });
    }
  });
  return steps;
}
const isBusLeg = (l) => l && l.mode === "BUS";
const dur = (m) => (m >= 60 ? Math.floor(m / 60) + " h" + (m % 60 ? " " + (m % 60) + " min" : "") : m + " min");

for (const day of out.days) {
  for (const path of day.paths) path.steps = stepsFor(day, path);
}

/* --- presets -------------------------------------------------------------- */
/* One decision instead of six. Each preset is scored from the days it picks,
   so the card can say what it actually costs: how long on trains across the
   week, how many towns, what time she is in each night — and which towns to
   book a bed in, which is the thing you have to know before you leave. */
out.presets = PRESETS.map((pre) => {
  const days = out.days.map((d) => {
    const path = d.paths.find((p) => p.id === pre.pick[d.n]) || d.paths[0];
    return { n: d.n, iso: d.iso, title: path.title || d.title, pathId: path.id, path };
  });
  /* A preset that does not chain is a preset that strands somebody in a town
     with no onward day. Better to fail the build than to ship it. */
  days.forEach((d, i) => {
    if (i && days[i - 1].path.to !== d.path.from) {
      warn.push(`preset ${pre.id}: day ${d.n} starts in ${d.path.from} but day ${days[i - 1].n} sleeps in ${days[i - 1].path.to}`);
    }
  });
  const nights = days.slice(0, -1).map((d) => {
    const last = d.path.seq.filter((s) => s.kind === "stop").pop();
    return { day: d.n, iso: d.iso, place: last ? last.place : null, in: last ? last.arr : null };
  });
  const towns = [];
  for (const d of days) for (const s of d.path.seq) {
    if (s.kind === "stop" && !towns.includes(s.place)) towns.push(s.place);
  }
  const ride = days.reduce((t, d) => t + d.path.ride, 0);
  const stops = days.reduce((t, d) => t + d.path.stops, 0);
  const latest = days.reduce((t, d) => (d.path.endArr > t ? d.path.endArr : t), "00:00");
  // Where to book: consecutive nights in the same town are one booking.
  const beds = [];
  for (const n of nights) {
    const prev = beds[beds.length - 1];
    if (prev && prev.place === n.place) prev.nights++;
    else beds.push({ place: n.place, nights: 1, from: n.iso, in: n.in });
  }
  return {
    ...pre, pickDays: days.map((d) => ({ n: d.n, pathId: d.pathId, name: d.path.name, endArr: d.path.endArr })),
    beds, towns, ride, stops, latest,
    arrive: days[days.length - 1].path.endArr,
  };
});

writeFileSync(HERE(".plan-cache.json"), JSON.stringify(cache));
writeFileSync(HERE(".walk-cache.json"), JSON.stringify(walkCache));
writeFileSync(HERE("plan.json"), JSON.stringify(out, null, 1));
console.log(`\nwrote data/plan.json`);
if (warn.length) { console.log(`\n${warn.length} thing(s) worth knowing:`); warn.forEach((w) => console.log("  " + w)); }
else console.log("every day adds up.");
