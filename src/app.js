/* Mittenwald to Berlin.

   Three things this page has to get right, in order:
     1. What do I do right now, and when do I need to move.
     2. Is that still true — is the train late, has the platform changed.
     3. What is worth seeing while I am here, and what does it look like.

   Everything else is arrangement. The plan is baked in and works with no
   signal; the live layer refines it when there is signal and never replaces
   what she can already read. */
(function () {
  "use strict";

  const D = window.__PLAN__, IMG = window.__IMG__ || {};
  const TZ = D.trip.tz;
  const API = "https://api.transitous.org/api/v1";
  const MODES = D.trip.ticket.modes.join(",");
  /* The mode filter is necessary and not sufficient. The Brocken steam railway
     comes back from the feed as REGIONAL_RAIL and is a private line with its
     own fares, and the Zugspitze rack railway is the same. Everything here
     that suggests a train refuses them by name as well as by mode. */
  const TICKET_MODES = new Set(D.trip.ticket.modes);
  const PRIVATE_RAIL = /^(HSB|WEG|BSB|ZSB|Zugspitzbahn|Wendelsteinbahn)$/i;
  const onTicket = (legs) => legs.length > 0 && legs.every((l) =>
    TICKET_MODES.has(l.mode) && !PRIVATE_RAIL.test((l.routeShortName || "").trim()));

  /* ---------- storage ---------- */
  const qs = new URLSearchParams(location.search);
  const store = {
    get(k, d) { try { const v = localStorage.getItem("mb-" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("mb-" + k, JSON.stringify(v)); } catch (e) {} },
  };
  /* One trip. `chosen` is only ever an override on the day options inside it. */
  const TRIP = (D.presets || [])[0] || { pickDays: [], beds: [] };
  let chosen = store.get("routes", {});
  let ticked = store.get("ticked", {});
  let liveCache = store.get("live", {});

  /* ---------- time ---------- */
  // A ?at= in the address lets the day be previewed before it happens. It is
  // also the only way to test a Tuesday morning in Mittenwald on a Friday.
  const fake = qs.get("at") ? new Date(qs.get("at")) : null;
  const now = () => (fake ? new Date(fake.getTime() + (Date.now() - boot)) : new Date());
  const boot = Date.now();

  /* The trip has one set of dates now, so a plan time and a real time are the
     same instant. The two names stay because the live layer reads better with
     them than without. */
  const realDate = (iso) => iso;
  const realInstant = (isoTime) => isoTime;

  const hhmm = (d) => new Date(d).toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  const dayKey = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: TZ });
  const fmtWeekday = (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
  const fmtDate = (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  // Everything on screen is the date she is actually there, not the baked one.
  const weekday = (iso) => fmtWeekday(realDate(iso));
  const dateShort = (iso) => fmtDate(realDate(iso));
  const mins = (a, b) => Math.round((new Date(b) - new Date(a)) / 60000);
  const dur = (m) => {
    if (m == null) return "";
    const h = Math.floor(m / 60), r = m % 60;
    return (h ? h + " h" : "") + (r ? (h ? " " : "") + r + " min" : (h ? "" : "0 min"));
  };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- helpers ---------- */
  const moveNote = (day, m) => m.note || "";
  const holidayText = (day) => day.holiday || "";
  const stnText = (day, stop) => stop.stn || "";
  const place = (k) => D.places[k] || { n: k };
  /* A day's name and opening line belong to the day unless the option
     renames it — "Up the Romantic Road" and "The Harz" are the same date and
     nothing else about them is the same. */
  const dayText = (d, p) => {
    const path = p || pathOf(d);
    return {
      title: (path && path.title) || d.title,
      intro: (path && path.intro) || d.intro,
    };
  };
  const heroOf = (d, p) => ((p || pathOf(d)).hero) || d.hero;
  const bagsOf = (d, p) => { const x = (p || pathOf(d)).bags; return x == null ? !!d.bags : x; };
  const pathText = (d, p) => p;
  const presetText = (p) => p;

  /* The four itineraries no longer share their beds, so a day's options are
     not all available: one that starts in Würzburg is nonsense to a week that
     slept in Nuremberg. Each day offers only the options that begin where
     yesterday ended. */
  function pathsFor(day) {
    const i = D.days.indexOf(day);
    if (i <= 0) return day.paths;
    const prev = pathOf(D.days[i - 1]);
    const fits = day.paths.filter((p) => !p.from || !prev.to || p.from === prev.to);
    return fits.length ? fits : day.paths;
  }
  /* The itinerary is the source of truth and a per-day choice is an override
     on top of it. Reading `chosen` alone meant that a page opened with an
     itinerary stored but no overrides — a fresh phone, or cleared routes —
     quietly showed the classic days under the Harz's name. */
  const pickId = (day) => chosen[day.n] ||
    (TRIP.pickDays.find((x) => x.n === day.n) || {}).pathId;
  function pathOf(day) {
    const i = D.days.indexOf(day);
    const here = day.paths.find((p) => p.id === pickId(day));
    if (i <= 0) return here || day.paths[0];
    // Resolved back to front, so a change on Wednesday re-decides Thursday.
    const prev = pathOf(D.days[i - 1]);
    const fits = day.paths.filter((p) => !p.from || !prev.to || p.from === prev.to);
    if (!fits.length) return here || day.paths[0];
    return (here && fits.includes(here)) ? here : fits[0];
  }
  const sightOf = (pk, name) => D.sights[pk + "/" + name] || null;
  const photo = (key) => IMG[key] || null;
  const todayDay = () => D.days.find((d) => realDate(d.iso) === dayKey(now()));
  const dayDate = (d) => realDate(d.iso);
  const gmaps = (q) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
  const gdir = (a, b, mode) => `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(a)}&destination=${encodeURIComponent(b)}&travelmode=${mode || "walking"}`;
  const osmAt = (lat, lon) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;

  const ICON = {
    now: '<path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="9"/>',
    days: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 11h18"/>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.4"/><path d="M12 17h.01"/>',
    walk: '<circle cx="13" cy="4" r="1.6"/><path d="m9 21 2-6 3-2-1-4-4 2-1 3"/><path d="m14 13 2 3 1 5"/>',
    train: '<rect x="5" y="3" width="14" height="13" rx="4"/><path d="M5 11h14M8 20l-2 2M16 20l2 2M9 16h.01M15 16h.01"/>',
    bus: '<rect x="4" y="4" width="16" height="13" rx="3"/><path d="M4 11h16M7 20v2M17 20v2M8 15h.01M16 15h.01"/>',
    warn: '<path d="M12 4 3 19h18z"/><path d="M12 10v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    tick: '<path d="m4 12 5 5L20 6"/>',
    pin: '<path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/>',
    tram: '<rect x="5" y="3" width="14" height="13" rx="3"/><path d="M5 10h14M9 3V1.5M15 3V1.5M8 19l-2 3M16 19l2 3"/>',
    prev: '<path d="M15 6 9 12l6 6"/>', next: '<path d="m9 6 6 6-6 6"/>',
    bed: '<path d="M3 7v12M3 12h18v7M21 19v-7a3 3 0 0 0-3-3h-7v3"/><circle cx="7" cy="10" r="1.6"/>',
    eye: '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.6"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
    food: '<path d="M5 3v8a2.5 2.5 0 0 0 5 0V3M7.5 11v10"/><path d="M18 3c-1.7 1.2-2.5 3-2.5 5.5S16.3 12 18 12.5V21"/>',
  };
  const svg = (k, cls) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"${cls ? ` class="${cls}"` : ""} aria-hidden="true">${ICON[k]}</svg>`;

  /* Headsigns come through as raw stop names — "Bahnhof, Murnau a. Staffelsee".
     What she needs is the direction in words she recognises. */
  function towards(leg, fallbackKey) {
    const raw = (leg.towards || "").replace(/^Bahnhof[,\s]+/i, "").replace(/\s*\(.*?\)\s*/g, " ").trim();
    const dest = place(fallbackKey).n;
    if (!raw || raw.length > 34 || raw.toLowerCase().includes("bahnhof")) return dest;
    return raw;
  }

  const isBus = (m) => !!m && (m.bus || (m.legs && m.legs[0] && m.legs[0].mode === "BUS"));
  const vehicle = (m) => (isBus(m) ? "bus" : "train");

  const KIND_EN = { church: "Church", museum: "Museum", palace: "Palace", view: "Viewpoint", nature: "Outdoors", street: "Streets", square: "Square", food: "Food", shop: "Shops", sight: "Sight" };
  const KIND = new Proxy(KIND_EN, { get: (o, k) => o[k] || "Sight" });

  /* ================= live ================= */
  /* MOTIS is asked for the same journey the plan already holds, and the two are
     compared. Only the difference is shown — if nothing has changed she should
     not have to read anything new. */
  let online = navigator.onLine;
  let liveState = { at: 0, status: online ? "idle" : "off" };

  async function motis(path, params, timeoutMs) {
    const u = new URL(API + path);
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs || 12000);
    try {
      const r = await fetch(u, { signal: ctl.signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }

  function moveId(m) { return m.from + ">" + m.to + "@" + m.depIso; }

  /* Look up one move and return only what differs from the plan.

     The search starts twenty minutes before the departure on purpose: asked for
     trains from exactly 08:38, the planner allows for the walk to the platform
     and answers with the 09:05. The train we are asking about has to be inside
     the window or there is nothing to compare against. */
  async function checkMove(m) {
    const dep = realInstant(m.depIso);
    const from = new Date(new Date(dep).getTime() - 20 * 60000).toISOString();
    const res = await motis("/plan", {
      fromPlace: m.fromLL.join(","), toPlace: m.toLL.join(","),
      time: from, numItineraries: 6, transitModes: MODES, arriveBy: "false",
      maxPreTransitTime: 1200, pedestrianProfile: "FOOT",
    });
    const want = m.legs[0];
    const wantDep = realInstant(want.depIso);
    let hit = null;
    for (const it of res.itineraries || []) {
      const first = (it.legs || []).find((l) => l.mode && l.mode !== "WALK");
      if (!first) continue;
      const sameTime = first.scheduledStartTime === wantDep;
      const sameLine = (first.routeShortName || "").replace(/\s*\(\d+\)\s*$/, "") === want.line;
      if (sameTime || (sameLine && Math.abs(mins(wantDep, first.scheduledStartTime || first.startTime)) < 6)) { hit = it; break; }
    }
    if (!hit) {
      // On a date the plan was not built for, this service may simply not run.
      const alt = (res.itineraries || []).find((it) => (it.legs || []).some((l) => l.mode && l.mode !== "WALK"));
      if (false && alt) {
        const legs = alt.legs.filter((l) => l.mode && l.mode !== "WALK");
        return { id: moveId(m), at: Date.now(), replaced: true,
          realDep: legs[0].startTime, realArr: legs[legs.length - 1].endTime,
          line: legs[0].routeShortName || legs[0].mode,
          track: legs[0].from.track || legs[0].from.scheduledTrack || null,
          depDelay: 0, arrDelay: 0, gaps: [] };
      }
      return { id: moveId(m), at: Date.now(), unknown: true };
    }

    const legs = (hit.legs || []).filter((l) => l.mode && l.mode !== "WALK");
    const f = legs[0], last = legs[legs.length - 1];
    const depDelay = mins(f.scheduledStartTime || f.startTime, f.startTime);
    const arrDelay = mins(last.scheduledEndTime || last.endTime, last.endTime);
    const track = f.from.track || f.from.scheduledTrack || null;
    return {
      id: moveId(m), at: Date.now(),
      depDelay: depDelay || 0,
      arrDelay: arrDelay || 0,
      realDep: f.startTime, realArr: last.endTime,
      track, trackChanged: !!(f.from.scheduledTrack && track && f.from.scheduledTrack !== track),
      cancelled: !!(f.cancelled || hit.legs.some((l) => l.cancelled)),
      // A change that realtime has eaten into is the thing most worth saying.
      gaps: legs.slice(1).map((l, i) => mins(legs[i].endTime, l.startTime)),
    };
  }

  /* Only the moves that still matter — today's, from an hour ago onwards. */
  function liveTargets() {
    // Today if she is travelling; otherwise whatever day she is reading, so the
    // step-by-step is live when she looks at it the night before too.
    const day = todayDay() || D.days.find((x) => x.n === openDay) || null;
    if (!day) return [];
    const t = todayDay() ? now() : new Date(realDate(day.iso) + "T00:00:00Z");
    return pathOf(day).seq
      .filter((s) => s.kind === "move" && !s.missing && s.depIso)
      .filter((s) => new Date(realInstant(s.arrIso)) > new Date(t.getTime() - 60 * 60000))
      .slice(0, 4);
  }

  /* Changing a day's route changes which trains matter. An answer that was
     already in flight belongs to the old route and would be written back over
     the new one, which is how the indicator ended up showing a delay for a
     train that is no longer on the plan. Every refresh carries the generation
     it started in, and a stale one is dropped. */
  let liveGen = 0;
  let refreshing = false;
  async function refreshLive(force) {
    const gen = liveGen;
    if (refreshing) return;
    const targets = liveTargets();
    if (!targets.length) { liveState.status = "none"; paintPulse(); return; }
    if (!navigator.onLine) { liveState.status = "off"; paintPulse(); return; }
    refreshing = true; liveState.status = "checking"; paintPulse();
    let ok = 0;
    for (const m of targets) {
      const id = moveId(m), had = liveCache[id];
      if (!force && had && Date.now() - had.at < 60000) { ok++; continue; }
      try {
        const got = await checkMove(m);
        if (gen !== liveGen) { refreshing = false; return; }
        liveCache[id] = got; ok++;
      } catch (e) { /* keep whatever we had; the plan still stands */ }
    }
    if (gen !== liveGen) { refreshing = false; return; }
    store.set("live", liveCache);
    liveState = { at: Date.now(), status: ok ? "ok" : "bad" };
    refreshing = false;
    paintPulse();
    render();
  }

  function liveFor(m) {
    const l = liveCache[moveId(m)];
    if (!l || Date.now() - l.at > 30 * 60000 || l.unknown) return null;
    return l;
  }

  /* The little dot in the corner is the only thing on screen that says whether
     what she is reading is live. Tapping it should say so in words. */
  function showLiveInfo() {
    const s = liveState.status;
    const said = s === "ok" ? `Checked at ${hhmm(liveState.at)}. Delays and platform changes on screen are the real ones.`
      : s === "checking" || s === "idle" ? "Checking with the timetable now."
      : s === "off" ? "No connection, so these are the planned times. They were right when the page was built."
      : s === "none" ? "Nothing to check — there are no trains on your plan today, so what you see is the plan."
      : "Could not reach the timetable just now. The planned times still stand.";
    openSheetRaw(`<div class="grab"></div><div class="sbody">
      <h2>${s === "ok" ? "Live" : s === "off" ? "Offline" : "The plan"}</h2>
      <p class="about" style="color:var(--ink)">${esc(said)}</p>
      <p class="about">A green dot means the times you see have been checked against Deutsche Bahn in the last few minutes. Grey means you are reading the plan as it was built. It checks itself every minute or so while you travel, and you can tap here any time to make it check again.</p>
      <div class="btns" style="padding:14px 0 0"><button class="btn ghost" data-close="1">Close</button></div></div>`);
  }

  function paintPulse() {
    const el = document.getElementById("pulse");
    if (!el) return;
    const s = liveState.status;
    const cls = s === "ok" || s === "checking" ? "" : s === "off" || s === "none" || s === "idle" ? "off" : "bad";
    /* "Plan" beside a grey dot reads like a failure. It is not: on a day with
       no trains there is simply nothing to check, and that is worth saying in
       those words rather than leaving her to guess. */
    const txt = s === "checking" ? "Checking…"
      : s === "ok" ? "Live" + " · " + hhmm(liveState.at)
      : s === "off" ? "Offline — using the plan"
      : s === "none" ? "No trains today"
      : s === "idle" ? "Checking…"
      : "Can't reach the timetable";
    el.className = "pulse " + cls;
    el.innerHTML = `<i></i><span>${esc(txt)}</span>`;
  }

  /* ================= what is happening now ================= */
  /* Reduces the chosen day to a single sentence and a single number: the thing
     she is doing, and the minutes until the thing she must do next. */
  function situation() {
    const t = now();
    const day = todayDay();
    if (!day) {
      const first = D.days[0], last = D.days[D.days.length - 1];
      if (dayKey(t) < first.iso) {
        const days = Math.ceil((new Date(first.iso + "T00:00:00Z") - new Date(dayKey(t) + "T00:00:00Z")) / 86400000);
        return { kind: "before", days, day: first };
      }
      return { kind: "after", day: last };
    }
    const path = pathOf(day);
    const seq = path.seq;

    // The next departure she has to be on.
    const nextMove = seq.find((s) => s.kind === "move" && s.depIso && new Date(realDep(s)) > t);
    // Where she is: the last stop whose arrival has passed.
    let at = null;
    for (const s of seq) {
      if (s.kind !== "stop") continue;
      if (new Date(s.arrIso) <= t) at = s;
    }
    const riding = seq.find((s) => s.kind === "move" && s.depIso &&
      new Date(realDep(s)) <= t && new Date(realArr(s)) > t);

    return { kind: riding ? "riding" : "at", day, path, at, riding, nextMove };
  }
  const realDep = (m) => { const l = liveFor(m); return l && l.realDep ? l.realDep : m.depIso; };
  const realArr = (m) => { const l = liveFor(m); return l && l.realArr ? l.realArr : m.arrIso; };

  /* How long to allow for getting to the platform. Deliberately generous. */
  function leaveBy(m, fromStop) {
    const walk = fromStop && /(\d+)\s*min/.exec(fromStop.stn || "");
    const w = walk ? Math.min(40, +walk[1]) : 12;
    return new Date(new Date(realDep(m)).getTime() - (w + 8) * 60000);
  }

  /* ================= views ================= */
  /* Three screens, in the order they get used: choose the trip, read the day,
     and be guided when the day stops matching the plan. The map lives inside
     the itinerary because it is how you compare one itinerary with another,
     and the old "Walk it" is folded into Guide me, because step-by-step
     directions and "what now" are the same question asked twice. */
  /* Two questions and then one screen. "pick" and "when" are asked once,
     before she leaves; "day" is the app. There is no navigation because
     there is nowhere else to be — the day strip moves between days and the
     button in the corner goes back to the two questions. */
  let openDay = null;
  /* Every screen she can land on, so the arrow in the corner always has
     somewhere to go — including back out of a sheet, and back a step in the
     walkthrough, which is where people press it first. */
  const navStack = [];
  const snapshot = () => ({ openDay });
  function push() {
    const cur = snapshot();
    const top = history[navStack.length - 1];
    if (top && JSON.stringify(top) === JSON.stringify(cur)) return;
    navStack.push(cur);
    if (navStack.length > 60) navStack.shift();
  }
  function goBack() {
    if (!sheet.hidden) return closeSheet();
    const prev = navStack.pop();
    if (!prev) return;
    openDay = prev.openDay;
    render();
  }
  /* The strip under the title is the trip's dates, so it has to move when the
     trip does — it was printing the dates the plan was baked from. */
  function paintDates() {
    const el = document.getElementById("trip-dates");
    if (!el) return;
    el.textContent = dateShort(D.days[0].iso) + " – " + dateShort(D.days[D.days.length - 1].iso) +
      " · " + D.days.length + " days";
  }

  const app = document.getElementById("app");

  /* Re-rendering replaces the whole screen, which used to fling her back to
     the top every time she ticked something off or changed a route. The scroll
     position is kept unless the tap was itself a navigation. */
  let keepScroll = true;
  function go(fn) { keepScroll = false; fn(); keepScroll = true; }

  function render() {
    const y = window.scrollY;
    app.innerHTML = viewDay(openDay || (todayDay() || D.days[0]).n);
    if (keepScroll && y) window.scrollTo(0, y);
    paintDates();
    const tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute("content", getComputedStyle(document.documentElement).getPropertyValue("--chrome").trim() || "#16211C");
    drawMap();
    paintPulse();
  }

  /* What the live layer found, said in the timeline beside the train it is
     about rather than on a screen of its own. */
  function liveAlerts(m) {
    if (!m) return "";
    const l = liveFor(m);
    if (!l) return "";
    const out = [];
    if (l.cancelled) out.push(note("bad", `${(isBus(m) ? "This bus is cancelled" : "This train is cancelled")}. Tap “Find me another way” — it only ever suggests trains your ticket covers.`));
    else if (l.depDelay >= 5) out.push(note("warn", `Running ${l.depDelay} minutes late — leaves ${hhmm(l.realDep)}, in at ${hhmm(l.realArr)}.`));
    if (l.trackChanged) out.push(note("warn", `${(isBus(m) ? "Stop changed to" : "Platform changed to")} ${l.track}. Check the board when you get there.`));
    const tight = (l.gaps || []).filter((g) => g < 6);
    if (tight.length) out.push(note("warn", `One of your changes is down to ${Math.min.apply(null, tight)} minutes. If you miss it, there is another way below.`));
    if ((l.depDelay >= 5 || l.cancelled) && m.later && m.later.length) {
      out.push(`<div class="card"><div class="pad"><div class="label" style="margin-top:0">If this one goes wrong</div>
        ${m.later.map((c) => `<div class="kv"><b>${esc(c.dep)} → ${esc(c.arr)}</b><span>${esc(c.lines.join(" · "))} · ${c.changes ? c.changes + " " + "chg" : "direct"}</span></div>`).join("")}</div>
        <div class="btns"><button class="btn ghost" data-replan="1">Find me another way</button></div></div>`);
    }
    return out.join("");
  }

  function note(kind, text) {
    return `<div class="note ${kind === "warn" ? "" : kind}">${svg(kind === "calm" ? "info" : "warn")}<span>${esc(text)}</span></div>`;
  }

  function heroCard(day, kicker, title, heroKey) {
    const key = heroKey || day.hero;
    const img = photo("place:" + key);
    return `<div class="card hero">
      ${img ? `<img src="${img}" alt="${esc(place(key).n)}">` : `<div style="height:190px;background:var(--hair)"></div>`}
      <div class="veil"></div>
      <div class="cap"><div class="kicker">${esc(kicker)}</div><h2>${esc(title)}</h2></div>
    </div>`;
  }

  function sightCard(pk, s) {
    const key = pk + "/" + s.name;
    const img = photo("sight:" + key);
    const done = !!ticked[key];
    return `<button class="sight${done ? " done" : ""}" data-sight="${esc(key)}">
      ${img ? `<img src="${img}" alt="" loading="lazy">` : `<div style="height:118px"></div>`}
      ${s.ticket ? `<span class="pin">ticket</span>` : ""}
      <span class="sv"><span class="sn">${esc(s.name)}</span>
      <span class="sm">${esc(KIND[s.kind])} · ${s.mins} min</span></span>
    </button>`;
  }

  /* ---------- a day ---------- */
  /* The same day strip the walkthrough has. Reading Thursday and wanting
     Friday should not mean going back to the front page. */
  function dayStrip(cur, attr) {
    return `<div class="days">${D.days.map((d) => `<button class="dchip${dayDate(d) === dayKey(now()) ? " today" : ""}"
      data-${attr}="${d.n}" aria-pressed="${d.n === cur}">Day ${d.n}<small>${dateShort(d.iso)}</small></button>`).join("")}</div>`;
  }

  function viewDay(n) {
    const day = D.days.find((d) => d.n === n) || D.days[0];
    const path = pathOf(day);
    // The plan can be moved onto other dates, so "today" is the shifted date,
    // not the one the plan was baked from.
    const isToday = dayDate(day) === dayKey(now());

    const opts = pathsFor(day);
    /* Some days have no choice left once the itinerary is picked — only one
       option starts in Würzburg. Say what today is rather than showing an
       empty space where the others were. */
    const choose = opts.length < 2 ? "" : `
      <div class="label">Two ways to spend it</div>
      <div class="routes">${opts.map((p) => `
        <button class="route" data-route="${day.n}:${p.id}" aria-pressed="${p.id === path.id}">
          <span class="rn">${esc(pathText(day, p).name)}</span>
          <span class="rw">${esc(pathText(day, p).why)}</span>
          <span class="rs">
            <span class="tag${p.stops > 2 ? " hot" : ""}">${p.stops} stops</span>
            <span class="tag">${dur(p.ride) || "no"} on trains</span>
            <span class="tag">in by ${esc(p.endArr)}</span>
          </span>
        </button>`).join("")}</div>`;

    /* Meals are placed before the timeline is drawn, so each one lands beside
       the town it is actually eaten in. */
    const meals = mealPlan(path);
    const body = path.seq.map((s2, i) => {
      const rows = (meals.get(i) || []).map(mealRow).join("");
      return s2.kind === "stop" ? stopBlock(day, s2, i, isToday) + rows
                                : rows + moveBlock(day, s2, isToday);
    }).join("");

    const last = path.seq.filter((x) => x.kind === "stop").pop();
    return `<div class="wrap">
      ${dayStrip(day.n, "goday")}
      ${heroCard(day, `Day ${day.n} · ${weekday(day.iso)} ${dateShort(day.iso)}`, dayText(day, path).title, heroOf(day, path))}
      <div class="card pad"><p class="lead" style="margin:0">${esc(dayText(day, path).intro)}</p></div>
      ${day.holiday ? note("warn", holidayText(day)) : ""}
      ${bagsOf(day, path) ? note("calm", `Bags come with you today — tonight is ${esc(place(last.place).n)}. Most stations have lockers.`) : ""}
      ${choose}
      <div class="label">The day, in order</div>
      <div class="tl">${body}</div>
      <div class="card"><div id="map"></div></div>
      ${troubleCard()}
      ${footer()}</div>`;
  }

  /* ---------- where there is time to eat ---------- */
  /* A timetable that never mentions food quietly assumes she will work it out
     on a platform. Each meal goes where there is genuinely room for it: the
     part of the day with the longest overlap with the hour people eat in. If
     that turns out to be a train, the page says so and says to buy something
     first, which is the useful version of the same fact. */
  const MEALS = [
    { key: "lunch", label: "Lunch", from: 11 * 60 + 45, to: 14 * 60 + 30, need: 45 },
    { key: "dinner", label: "Dinner", from: 18 * 60, to: 20 * 60 + 45, need: 50 },
  ];
  const hm = (t) => { const [h, m] = String(t || "00:00").split(":").map(Number); return (h || 0) * 60 + (m || 0); };
  const clockOf = (m) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");

  function mealPlan(path) {
    const out = new Map();
    MEALS.forEach((M) => {
      let best = null;
      path.seq.forEach((s2, i) => {
        const a = hm(s2.kind === "stop" ? s2.arr : s2.dep);
        // The last stop of the day has no departure — the evening is hers.
        const b = s2.kind === "stop" ? (s2.dep ? hm(s2.dep) : 22 * 60 + 30) : hm(s2.arr);
        const ov = Math.min(M.to, b) - Math.max(M.from, a);
        if (ov > 0 && (!best || ov > best.ov)) best = { i, ov, s: s2, a };
      });
      if (!best) return;
      const onTrain = best.s.kind === "move";
      const key = onTrain ? best.s.to : best.s.place;
      const rows = out.get(best.i) || [];
      rows.push({
        label: M.label, at: clockOf(Math.max(M.from, best.a)), onTrain, place: key,
        mins: Math.min(best.ov, M.need), short: best.ov < M.need,
        food: onTrain ? null : (best.s.see || []).map((x) => sightOf(key, x)).find((x) => x && x.kind === "food"),
      });
      out.set(best.i, rows);
    });
    return out;
  }

  function mealRow(m) {
    const p = place(m.place);
    const where = m.onTrain
      ? "you will be on the train then — buy something before you board"
      : `in ${p.n}${m.short ? ` · only a short window, so something quick` : ` · about ${m.mins} min`}`;
    const q = m.onTrain ? `Bäckerei Imbiss ${p.name || p.n}` : `Restaurants ${p.name || p.n}`;
    return `<div class="ev meal"><div class="mealcard">
      <span class="mwhen">${esc(m.at)}</span>
      <span class="mtxt"><b>${m.label}</b> — ${esc(where)}
        ${m.food ? `<small>Worth it: ${esc(m.food.name)}</small>` : ""}</span>
      <a class="chip" href="${gmaps(q)}" target="_blank" rel="noopener">${svg("food")} Places to eat</a>
    </div></div>`;
  }

  /* The timeline used to be a list of names with the photographs somewhere
     else. A thumbnail beside each line is the difference between reading a
     schedule and recognising the place when you get there. */
  function walkThumb(pk, name) {
    const s = sightOf(pk, name);
    const img = s && photo("sight:" + pk + "/" + s.name);
    if (!img) return "";
    return `<button class="wthumb" data-sight="${esc(pk + "/" + s.name)}" aria-label="${esc(s.name)}">
      <img src="${img}" alt="" loading="lazy"></button>`;
  }

  const nextMoveAfter = (day, stop) => {
    const seq = pathOf(day).seq;
    const at = seq.indexOf(stop);
    return at < 0 ? null : seq.slice(at + 1).find((x) => x.kind === "move" && !x.missing) || null;
  };

  function stopBlock(day, s, i, isToday) {
    const p = place(s.place);
    const t = now();
    const past = isToday && s.depIso && new Date(s.depIso) < t;
    const here = isToday && new Date(s.arrIso) <= t && (!s.depIso || new Date(s.depIso) > t);
    const sights = (s.see || []).map((n) => sightOf(s.place, n)).filter(Boolean);

    return `<div class="ev ${s.base ? "night" : "town"}${past ? " past" : ""}${here ? " live" : ""}" id="ev-${day.n}-${i}">
      <div class="stopcard">
        <div class="stophead">
          <span class="ttl"><h3>${esc(p.n)}</h3>
            <span class="when">${s.base ? "Arrive" + " " + esc(s.arr) + " · " + "you sleep here"
              : esc(s.arr) + " – " + (nextMoveAfter(day, s) ? timeBtn(s.dep, nextMoveAfter(day, s).from, nextMoveAfter(day, s).to, nextMoveAfter(day, s).depIso) : esc(s.dep))}</span></span>
          ${s.free ? `<span class="free"><b>${dur(s.free)}</b><span>here</span></span>` : ""}
        </div>
        ${s.stn ? `<p class="walknote">${esc(stnText(day, s))}</p>` : ""}
        ${sights.length ? `<div class="rail">${sights.map((x) => sightCard(s.place, x)).join("")}</div>` : ""}
        ${walkPlan(s)}
        <div class="mfoot">
          ${s.route && s.route.maps ? `<a class="chip go" href="${esc(s.route.maps)}" target="_blank" rel="noopener">${svg("route")} Walk this route</a>` : ""}
          <a class="chip" href="${gmaps(p.name || p.n)}" target="_blank" rel="noopener">${svg("pin")} Station</a>
          <a class="chip" href="${gmaps(p.n + ", " + (p.country === "AT" ? "Austria" : "Germany"))}" target="_blank" rel="noopener">${svg("map")} Town</a>
          ${bagsOf(day) && !s.base && s.free ? `<a class="chip" href="${gmaps("Gepäckschließfächer " + (p.name || p.n))}" target="_blank" rel="noopener">Lockers</a>` : ""}
        </div>
      </div></div>`;
  }

  /* The order she actually walks it, with the real minutes between each thing
     and a running clock, so "two hours in Bamberg" becomes something she can
     follow without deciding anything on the pavement. */
  function walkPlan(s) {
    const r = s.route;
    if (!r || !r.legs || !r.legs.length) return "";
    const core = r.legs.filter((l) => !l.extra);
    const extra = r.legs.filter((l) => l.extra);
    if (!core.length) return "";

    const clock = (off) => {
      if (off == null || !s.arrIso) return "";
      return hhmm(new Date(new Date(s.arrIso).getTime() + off * 60000));
    };
    /* A hop the router could not price is a hop we say nothing about rather
       than one we print the word null for. */
    const hop = (l) => {
      if (l.mins == null) return "";
      const approx = l.how && l.how.approx ? "~" : "";
      if (l.how && l.how.mode === "ride") {
        const inst = l.how.walkInstead != null
          ? ` <span style="opacity:.75">(${l.how.walkInstead} min walk)</span>` : "";
        return `<div class="whop">${svg("tram")}<b>${esc(l.how.line)}</b> · ${l.mins} min${inst}</div>`;
      }
      if (l.how && l.how.mode === "go")
        return `<div class="whop">${svg("tram")}${approx}${l.mins} min to get there</div>`;
      return `<div class="whop">${svg("walk")}${approx}${l.mins} min walk</div>`;
    };

    const row = (l, showClock) => {
      const t = sightOf(s.place, l.to) || { name: l.to, note: l.note };
      return `${hop(l)}
      <div class="wrow"><div class="wtime">${showClock ? esc(clock(l.at)) : ""}</div>
        <button class="wbody" data-sight="${esc(s.place + "/" + l.to)}">
          <div class="wname">${esc(t.name)}${l.must ? `<span class="star">worth it</span>` : ""}</div>
          <div class="wsay">${esc(t.note || "")}${l.visit ? ` · about ${l.visit} min${l.ticket ? "، " + "ticket needed" : ""}` : ""}</div>
        </button>
        ${walkThumb(s.place, l.to)}</div>`;
    };

    return `<div class="walkplan">
      ${core.map((l) => row(l, true)).join("")}
      ${r.back != null ? `<div class="whop">${svg("walk")}${r.back} min back to the station</div>` : ""}
      ${extra.length ? `<div class="wextra-head">Only if you are ahead of time</div>
        <div class="wextra">${extra.map((l) => row(l, false)).join("")}</div>` : ""}
    </div>`;
  }

  function moveBlock(day, m, isToday) {
    if (m.missing) return `<div class="ev">${note("bad", `No connection found for ${place(m.from).n} → ${place(m.to).n}.`)}</div>`;
    const l = isToday ? liveFor(m) : null;
    const past = isToday && new Date(realArr(m)) < now();
    const rows = m.legs.map((leg, i) => {
      const gap = i > 0 ? m.gaps[i - 1] : null;
      return (gap != null ? `<div class="change${gap < 8 ? " tight" : ""}">${svg("walk")} ${gap} min to change at ${esc(m.legs[i - 1].to)}${gap < 8 ? " — " + "be ready by the door" : ""}</div>` : "") +
        `<div class="mrow">
          <span class="line${leg.mode === "BUS" ? " bus" : ""}">${esc(leg.line)}</span>
          <span class="leg"><span class="lt">${i === 0 ? timeBtn(leg.dep, m.from, m.to, m.depIso) : esc(leg.dep)} → ${esc(leg.arr)}</span>
          <span class="lp">${esc(leg.from.replace(/^Bahnhof[,\s]+/i, ""))} → ${esc(leg.to.replace(/^Bahnhof[,\s]+/i, ""))}</span></span>
          ${leg.track ? `<span class="plat"><b>${esc(leg.track)}</b><span>plat</span></span>` : ""}
        </div>`;
    }).join("");

    return `<div class="ev${past ? " past" : ""}">
      <div class="move">
        ${rows}
        ${m.note ? `<div class="change">${svg("info")} ${esc(moveNote(day, m))}</div>` : ""}
        <div class="mfoot">
          <span class="chip">${dur(m.dur)} · ${m.changes ? m.changes + " " + (m.changes > 1 ? "changes" : "change") : "direct"}</span>
          <a class="chip" href="${gdir(m.fromStop, m.toStop, "transit")}" target="_blank" rel="noopener">Open in Maps</a>
        </div>
      </div>${isToday ? liveAlerts(m) : ""}</div>`;
  }

  /* ---------- the day on a map ---------- */
  /* One day at a time, which is the only scale that is useful once the line is
     fixed: the towns in order, numbered, with the sights as small dots so the
     map shows what there is to see and not only where the platforms are. */
  let map = null, layer = null;
  function drawMap() {
    const el = document.getElementById("map");
    if (!el) return;
    if (!window.L) {
      el.innerHTML = `<div class="mapfall"><p>The map needs a connection. Every stop still opens in Google Maps.</p></div>`;
      return;
    }
    const day = D.days.find((d) => d.n === (openDay || (todayDay() || D.days[0]).n)) || D.days[0];
    const path = pathOf(day);
    const pts = [];
    path.seq.forEach((st) => {
      if (st.kind !== "stop") return;
      const p = place(st.place);
      if (p.lat != null) pts.push({ ll: [p.lat, p.lon], n: p.n, night: st.base, stop: st });
    });

    if (map) { map.remove(); map = null; }
    // The offline notice may have been painted here a moment ago, before the
    // map script finished loading. Leaflet builds around it rather than over it.
    el.innerHTML = "";
    map = L.map(el, { scrollWheelZoom: false, attributionControl: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    layer = L.layerGroup().addTo(map);

    if (pts.length > 1) L.polyline(pts.map((p) => p.ll), { color: day.c, weight: 4, opacity: .85 }).addTo(layer);
    pts.forEach((p, i) => {
      L.marker(p.ll, {
        icon: L.divIcon({
          className: "", iconSize: [26, 26], iconAnchor: [13, 13],
          html: `<div style="width:26px;height:26px;border-radius:50%;background:${p.night ? day.c : "#fff"};border:3.5px solid ${day.c};display:grid;place-items:center;font:700 12px system-ui;color:${p.night ? "#fff" : day.c};box-shadow:0 2px 8px rgba(0,0,0,.3)">${i + 1}</div>`,
        }),
      }).addTo(layer).bindPopup(`<b>${esc(p.n)}</b><br>${p.stop.base ? "Arrive " + esc(p.stop.arr) + " · you sleep here" : esc(p.stop.arr) + "–" + esc(p.stop.dep)}`);
    });
    path.seq.filter((st) => st.kind === "stop").forEach((st) => {
      (st.see || []).map((n) => sightOf(st.place, n)).filter((x) => x && x.lat).forEach((x) => {
        L.circleMarker([x.lat, x.lon], { radius: 5, color: day.c, weight: 2, fillColor: "#fff", fillOpacity: 1 })
          .addTo(layer).bindPopup(`<b>${esc(x.name)}</b><br>${esc(x.note)}`);
      });
    });

    // The container is still being laid out on the first paint, so the first
    // fit is against the wrong height. Fit again once the browser has settled.
    const fit = () => {
      if (!map) return;
      map.invalidateSize();
      if (pts.length) map.fitBounds(L.latLngBounds(pts.map((p) => p.ll)).pad(0.22));
      else map.setView([50.5, 11], 6);
    };
    fit();
    setTimeout(fit, 60);
  }

  /* ---------- how often does this run ---------- */
  /* Every departure on screen is tappable, because the question people
     actually have about a printed time is "and if I miss it?". The answer is
     the rest of the day's departures on that leg — from the plan instantly,
     then refined against the live timetable. */
  const timeBtn = (hhmmStr, fromKey, toKey, iso, cls) =>
    `<button type="button" class="tt${cls ? " " + cls : ""}" data-freq="${esc(fromKey)}|${esc(toKey)}|${esc(iso || "")}" title="How often does this run?">${esc(hhmmStr)}</button>`;

  async function showFreq(fromKey, toKey, iso) {
    const a = place(fromKey), b = place(toKey);
    const when = iso ? realInstant(iso) : now().toISOString();

    /* What the plan already knows, so there is something on screen at once and
       something at all when there is no signal. */
    const baked = [];
    D.days.forEach((d) => pathOf(d).seq.forEach((m) => {
      if (m.kind !== "move" || m.from !== fromKey || m.to !== toKey) return;
      baked.push({ dep: m.dep, arr: m.arr, lines: m.legs.map((l) => l.line), changes: m.changes, planned: true });
      (m.later || []).forEach((c) => baked.push({ dep: c.dep, arr: c.arr, lines: c.lines, changes: c.changes, planned: true }));
    }));
    const uniq = (rows) => {
      const seen = new Set();
      return rows.filter((r) => (seen.has(r.dep) ? false : (seen.add(r.dep), true)))
        .sort((x, y) => x.dep.localeCompare(y.dep));
    };

    const head = `<div class="grab"></div><div class="sbody">
      <h2>${esc(a.n)} → ${esc(b.n)}</h2>
      <p class="about">How often this runs, and what you would catch if you missed one.</p>`;
    const rows = (list, note) => `${note ? `<p class="about" style="font-size:14px">${esc(note)}</p>` : ""}
      <div style="margin-top:12px">${list.map((r) => `
        <div class="kv"><b${r.now ? ' style="color:var(--accent)"' : ""}>${esc(r.dep)} → ${esc(r.arr)}</b>
          <span>${esc((r.lines || []).join(" · "))}${r.changes ? ` · ${r.changes} chg` : " · " + "direct"}</span></div>`).join("")}</div>`;

    openSheetRaw(head + rows(uniq(baked).slice(0, 8), "From the plan. Checking the live timetable…") +
      `<div class="btns" style="padding:14px 0 0"><button class="btn ghost" data-close="1">Close</button></div></div>`);

    if (!navigator.onLine || a.lat == null || b.lat == null) return;
    try {
      const from = new Date(new Date(when).getTime() - 45 * 60000).toISOString();
      const res = await motis("/plan", {
        fromPlace: [a.lat, a.lon].join(","), toPlace: [b.lat, b.lon].join(","),
        time: from, numItineraries: 9, transitModes: MODES, arriveBy: "false",
        maxPreTransitTime: 1200, pedestrianProfile: "FOOT",
      }, 16000);
      const live = (res.itineraries || []).map((it) => {
        const legs = (it.legs || []).filter((l) => l.mode && l.mode !== "WALK");
        if (!onTicket(legs)) return null;
        return { dep: hhmm(legs[0].startTime), arr: hhmm(legs[legs.length - 1].endTime),
                 lines: legs.map((l) => l.routeShortName || l.mode), changes: legs.length - 1,
                 now: Math.abs(mins(when, legs[0].scheduledStartTime || legs[0].startTime)) < 3 };
      }).filter(Boolean);
      if (!live.length || sheet.hidden) return;
      const gaps = live.slice(1).map((r, i) => {
        const p1 = live[i].dep.split(":"), p2 = r.dep.split(":");
        return (+p2[0] * 60 + +p2[1]) - (+p1[0] * 60 + +p1[1]);
      }).filter((g) => g > 0);
      const typical = gaps.length ? Math.round(gaps.reduce((x, y) => x + y, 0) / gaps.length) : null;
      sheet.innerHTML = head +
        rows(uniq(live).slice(0, 9), typical
          ? `Live from the timetable for the dates you are travelling — about one every ${typical} minutes${typical > 70 ? ", not one to miss" : ""}.`
          : "Live from the timetable for the dates you are travelling" + ".") +
        `<div class="btns" style="padding:14px 0 0"><button class="btn ghost" data-close="1">Close</button></div></div>`;
    } catch (e) { /* the plan's own list is already on screen */ }
  }

  /* The hotel list, which is the thing that has to be booked before anything
     else and is otherwise buried inside five days of timetable. */
  /* Read off the days she has actually chosen rather than off the preset,
     because swapping one day can now move a hotel to a different town — the
     Romantic Road sleeps in Würzburg and the Harz in Quedlinburg, and a stale
     list here is a booking in the wrong place. Consecutive nights in one town
     are one booking. */
  function bedsNow() {
    const out = [];
    D.days.forEach((d, i) => {
      const p = pathOf(d);
      const last = p.seq.filter((x) => x.kind === "stop").pop();
      if (!last) return;
      const prev = out[out.length - 1];
      if (prev && prev.place === last.place) prev.nights++;
      else out.push({ place: last.place, nights: 1, from: d.iso, in: last.arr, last: i === D.days.length - 1 });
    });
    return out;
  }


  const footer = () => `<div class="foot">Real times from the German timetable, regional trains only — never ICE, IC or EC.
    Platforms still change on the day, so glance at the board.
    Emergencies anywhere in Europe: <a href="tel:112">112</a>.
    Photographs from Wikimedia Commons, credited on each card; maps © OpenStreetMap.</div>`;

  /* ---------- sight sheet ---------- */
  const scrim = document.getElementById("scrim");
  const sheet = document.getElementById("sheet");

  function openSight(key) {
    const raw = D.sights[key];
    if (!raw) return;
    // Go through sightOf so the drawer says what the card said.
    const s = sightOf(raw.place, raw.name) || raw;
    const p = place(s.place);
    const img = photo("sight:" + key);
    const done = !!ticked[key];
    const cred = s.photoFile && D.credits[s.photoFile];
    sheet.innerHTML = `<div class="grab"></div>
      <button class="sheetx" data-close="1" aria-label="${esc("Close")}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      ${img ? `<img class="shot" src="${img}" alt="${esc(s.name)}">` : ""}
      <div class="sbody">
        <h2>${esc(s.name)}</h2>
        <div class="meta">
          <span class="tag">${esc(KIND[s.kind] || "Sight")}</span>
          <span class="tag">about ${s.mins} min</span>
          ${s.ticket ? `<span class="tag hot">needs a ticket</span>` : ""}
          ${s.indoor ? `<span class="tag">fine in the rain</span>` : ""}
        </div>
        <p class="about" style="color:var(--ink)">${esc(s.note)}</p>
        ${s.about ? `<p class="about">${esc(s.about)}</p>` : ""}
        <div class="btns" style="padding-left:0;padding-right:0">
          <button class="btn ${done ? "ghost" : "accent"}" data-tick="${esc(key)}">${svg("tick")} ${done ? "Seen it — undo" : "Mark as seen"}</button>
          ${s.lat ? `<a class="btn ghost" href="${gdir(p.name || p.n, s.name + ", " + p.n, "walking")}" target="_blank" rel="noopener">${svg("walk")} Walk here from the station</a>` : ""}
          ${s.lat ? `<a class="btn ghost" href="${osmAt(s.lat, s.lon)}" target="_blank" rel="noopener">${svg("map")} Show on the map</a>` : ""}
          ${s.wiki ? `<a class="btn ghost" href="${esc(s.wiki)}" target="_blank" rel="noopener">${svg("info")} Read more</a>` : ""}
        </div>
        ${cred ? `<p class="credit">Photo: ${esc(cred.by)} · ${esc(cred.lic)} · via Wikimedia Commons</p>` : ""}
      </div>`;
    scrim.hidden = false; sheet.hidden = false;
    requestAnimationFrame(() => { scrim.classList.add("on"); sheet.classList.add("on"); });
  }
  function closeSheet() {
    scrim.classList.remove("on"); sheet.classList.remove("on");
    setTimeout(() => { scrim.hidden = true; sheet.hidden = true; }, 260);
  }

  /* ================= when the day stops going to plan ================= */
  /* A timetable is only useful while it is true. The moment a train is missed,
     or a town turns out to be worth another hour, the printed plan becomes a
     liability — it keeps telling her about a train that has gone.

     So this re-derives the rest of the day from two facts: where she is and
     what time it is now. It asks the real timetable what still runs, fits as
     much of what is left into the time that remains, and says plainly what she
     has to give up. The one thing it never gives up is the last connection of
     the day: the bed, and on the final day, Berlin. */

  function remainingOf(day, path, fromIdx) {
    const seq = path.seq;
    const out = [];
    for (let i = fromIdx; i < seq.length; i++) if (seq[i].kind === "stop") out.push({ i, s: seq[i] });
    return out;
  }

  /* Where the day has to end: tonight's bed, or Berlin on the last day. */
  function anchorOf(path) {
    const stops = path.seq.filter((s) => s.kind === "stop");
    return stops[stops.length - 1] || null;
  }

  async function reflow(opts) {
    const day = todayDay() || D.days[0];
    const path = pathOf(day);
    const anchor = anchorOf(path);
    if (!anchor) return null;
    const t = opts.from || now();

    // Where is she? Whatever she told us, else the last stop she reached.
    let hereKey = opts.place;
    if (!hereKey) {
      for (const s of path.seq) if (s.kind === "stop" && new Date(s.arrIso) <= t) hereKey = s.place;
    }
    hereKey = hereKey || path.seq.find((s) => s.kind === "stop")?.place;
    const here = place(hereKey);

    // Which stops are still ahead of her on today's line.
    const idx = path.seq.findIndex((s) => s.kind === "stop" && s.place === hereKey);
    const ahead = remainingOf(day, path, idx + 1).filter((x) => x.s.place !== anchor.place);

    const dest = place(anchor.place);
    const result = { here, hereKey, dest, destKey: anchor.place, day, path, t, tried: [], keep: [], drop: [], direct: null };

    // The fallback that always exists: give up the rest and go straight there.
    result.direct = await firstCovered(hereKey, anchor.place, t);

    // Then try to keep as many of the remaining stops as the clock allows,
    // dropping from the end — the ones nearest Berlin are the easiest to lose
    // because she is going that way anyway.
    for (let take = ahead.length; take >= 0; take--) {
      const chain = ahead.slice(0, take);
      const legs = [];
      let clock = new Date(t), at = hereKey, ok = true;

      for (const { s } of chain) {
        const c = await firstCovered(at, s.place, clock);
        if (!c) { ok = false; break; }
        legs.push({ to: s.place, conn: c });
        // Give the town the walk its must-sees need, not the whole old plan.
        const need = minimumFor(s);
        clock = new Date(new Date(c.arrIso).getTime() + need * 60000);
        at = s.place;
      }
      if (!ok) continue;
      const last = await firstCovered(at, anchor.place, clock);
      if (!last) continue;
      legs.push({ to: anchor.place, conn: last, final: true });

      result.keep = chain.map((x) => x.s);
      result.drop = ahead.slice(take).map((x) => x.s);
      result.legs = legs;
      result.arrives = last.arr;
      result.arrivesIso = last.arrIso;
      break;
    }
    return result;
  }

  /* The least time a stop is worth getting off the train for: its marked
     must-sees, the walk between them, and the walk back. */
  function minimumFor(stop) {
    const r = stop.route;
    if (!r || !r.legs) return 45;
    const musts = r.legs.filter((l) => l.must);
    const pick = musts.length ? musts : r.legs.slice(0, 1);
    const walk = pick.reduce((t, l) => t + (l.mins || 0), 0) + (r.back || 10);
    return Math.max(30, walk + pick.reduce((t, l) => t + l.visit, 0));
  }

  async function firstCovered(fromKey, toKey, when) {
    const a = place(fromKey), b = place(toKey);
    if (!a.lat || !b.lat) return null;
    const key = `${fromKey}>${toKey}@${Math.floor(new Date(when).getTime() / 300000)}`;
    if (replanCache[key] !== undefined) return replanCache[key];
    try {
      const res = await motis("/plan", {
        fromPlace: [a.lat, a.lon].join(","), toPlace: [b.lat, b.lon].join(","),
        time: new Date(new Date(when).getTime() + 3 * 60000).toISOString(),
        numItineraries: 3, transitModes: MODES, arriveBy: "false",
        maxPreTransitTime: 1500, pedestrianProfile: "FOOT",
      }, 16000);
      for (const it of res.itineraries || []) {
        const legs = (it.legs || []).filter((l) => l.mode && l.mode !== "WALK");
        if (!onTicket(legs)) continue;
        const f = legs[0], last = legs[legs.length - 1];
        replanCache[key] = {
          dep: hhmm(f.startTime), arr: hhmm(last.endTime),
          depIso: f.startTime, arrIso: last.endTime,
          dur: mins(f.startTime, last.endTime), changes: legs.length - 1,
          lines: legs.map((l) => l.routeShortName || l.mode),
          track: f.from.track || f.from.scheduledTrack || null,
          board: f.from.name,
        };
        return replanCache[key];
      }
      replanCache[key] = null;
    } catch (e) { replanCache[key] = null; }
    return replanCache[key];
  }
  let replanCache = {};

  /* ---------- re-plan from where she actually is ---------- */
  async function replan() {
    const s = situation();
    if (!s.day) return;
    const path = s.path, seq = path.seq;
    const target = [...seq].reverse().find((x) => x.kind === "stop" && x.base);
    if (!target) return;
    const dest = place(target.place);

    sheet.innerHTML = `<div class="grab"></div><div class="sbody"><h2>Finding another way</h2>
      <p class="about">Looking for the next trains to ${esc(dest.n)} that your ticket covers…</p></div>`;
    scrim.hidden = false; sheet.hidden = false;
    requestAnimationFrame(() => { scrim.classList.add("on"); sheet.classList.add("on"); });

    let from = null;
    try {
      from = await new Promise((res, rej) => {
        if (!navigator.geolocation) return rej(new Error("no gps"));
        navigator.geolocation.getCurrentPosition((p) => res([p.coords.latitude, p.coords.longitude]), rej, { timeout: 9000, maximumAge: 120000 });
      });
    } catch (e) {
      const at = s.at ? place(s.at.place) : null;
      from = at && at.lat ? [at.lat, at.lon] : null;
    }
    if (!from) { sheet.querySelector(".about").textContent = "I could not work out where you are. Open the day page and take the next train listed."; return; }

    try {
      const res = await motis("/plan", {
        fromPlace: from.join(","), toPlace: [dest.lat, dest.lon].join(","),
        time: new Date(now().getTime() + 4 * 60000).toISOString(),
        numItineraries: 4, transitModes: MODES, arriveBy: "false", maxPreTransitTime: 1800, pedestrianProfile: "FOOT",
      }, 20000);
      const opts = (res.itineraries || [])
        .filter((it) => onTicket(it.legs.filter((l) => l.mode !== "WALK")))
        .slice(0, 4);
      if (!opts.length) { sheet.querySelector(".about").textContent = "Nothing regional comes up from here right now. Ask at the ticket desk — say “Ich habe meinen Anschluss verpasst.”"; return; }
      sheet.innerHTML = `<div class="grab"></div><div class="sbody">
        <h2>Ways to ${esc(dest.n)}</h2>
        <p class="about">From where you are now. Only trains and buses your ticket covers.</p>
        ${opts.map((it) => {
          const L2 = it.legs.filter((l) => l.mode !== "WALK");
          if (!L2.length) return "";
          return `<div class="card" style="box-shadow:none;background:var(--hair)"><div class="pad">
            <div class="kv" style="border:0;padding-top:0"><b style="font-size:19px">${hhmm(L2[0].startTime)} → ${hhmm(L2[L2.length - 1].endTime)}</b>
            <span>${dur(mins(L2[0].startTime, L2[L2.length - 1].endTime))} · ${L2.length - 1 ? L2.length - 1 + " chg" : "direct"}</span></div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${L2.map((l) => `<span class="line${l.mode === "BUS" ? " bus" : ""}" style="min-width:0;font-size:14px;padding:5px 9px">${esc(l.routeShortName || l.mode)}</span>`).join("")}</div>
            <p class="about" style="font-size:14px">Board at ${esc(L2[0].from.name)}${L2[0].from.track ? "، " + "platform" + " " + esc(L2[0].from.track) : ""}.</p>
          </div></div>`;
        }).join("")}
        <div class="btns" style="padding-left:0;padding-right:0"><button class="btn ghost" data-close="1">Close</button></div></div>`;
    } catch (e) {
      sheet.querySelector(".about").textContent = "I could not reach the timetable. Your ticket is valid on the next regional train either way — ask at the desk and say “Ich habe meinen Anschluss verpasst.”";
    }
  }

  /* ---------- "something has changed" ---------- */
  async function showReflow(kind, extraMins) {
    openSheetRaw(`<div class="grab"></div><div class="sbody">
      <h2>${kind === "stay" ? "Staying longer" : "Working out the rest of the day"}</h2>
      <p class="about">Asking the timetable what still runs…</p></div>`);

    const from = kind === "stay" ? new Date(now().getTime() + (extraMins || 60) * 60000) : now();
    let r = null;
    try { r = await reflow({ from }); } catch (e) { /* handled below */ }

    if (!r || !r.legs) {
      sheet.querySelector(".about").textContent =
        "I could not reach the timetable. Your ticket is valid on the next regional train either way — ask at the desk and say “Ich habe meinen Anschluss verpasst.”";
      return;
    }

    const anchorLast = D.days[D.days.length - 1].n === r.day.n;
    const arriveLine = `You would be in ${esc(anchorLast ? place("berlin").n : r.dest.n)} at <b>${esc(r.arrives)}</b> ${anchorLast ? "on the 3rd" : "tonight"}.`;

    openSheetRaw(`<div class="grab"></div><div class="sbody">
      <h2>${kind === "stay" ? `Another ${extraMins} min in ${esc(r.here.n)}` : "Here is the rest of the day"}</h2>
      <p class="about" style="color:var(--ink)">${arriveLine}</p>

      ${r.drop.length ? `<div class="note">${svg("warn")}<span>To do that you would give up
        ${esc(r.drop.map((s) => place(s.place).n).join(" and "))}.</span></div>` :
        `<div class="note calm">${svg("tick")}<span>Nothing has to be given up — the whole day still fits.</span></div>`}

      ${r.legs.map((l) => {
        const c = l.conn;
        return `<div class="card" style="box-shadow:none;background:var(--hair);margin:10px 0"><div class="pad">
          <div class="kv" style="border:0;padding:0">
            <b style="font-size:18px">${esc(c.dep)} → ${esc(c.arr)}</b>
            <span>${esc(place(l.to).n)}${l.final ? " · " + "your bed" : ""}</span></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:9px">
            ${c.lines.map((x) => `<span class="line" style="min-width:0;font-size:13.5px;padding:5px 9px">${esc(x)}</span>`).join("")}
          </div>
          <p class="about" style="font-size:14px;margin-top:8px">Board at ${esc(c.board)}${c.track ? `، platform ${esc(c.track)}` : ""}. ${c.changes ? c.changes + " " + (c.changes > 1 ? "changes" : "change") : "Straight through"}.</p>
        </div></div>`;
      }).join("")}

      ${r.keep.length ? `<p class="about">You still get ${esc(r.keep.map((s) => place(s.place).n).join("، "))}.</p>` : ""}
      ${!anchorLast ? `<p class="about">Berlin on the last day is unaffected — that is a later day.</p>`
        : r.drop.length ? `<p class="about">This still gets you to Berlin today, which is the one thing that has to happen.</p>` : ""}

      <div class="btns" style="padding-left:0;padding-right:0">
        <button class="btn ghost" data-close="1">Close</button>
      </div></div>`);
  }

  function openSheetRaw(html) {
    sheet.innerHTML = html;
    scrim.hidden = false; sheet.hidden = false;
    requestAnimationFrame(() => { scrim.classList.add("on"); sheet.classList.add("on"); });
  }

  /* Everything that is a setting rather than a destination, behind the one
     button in the corner — and the way back to the two questions, which is
     the only navigation the app has left. */
  /* The hotel list lives here now that there is no front page to put it on.
     It is the one thing in the app that has to be true before anyone leaves. */
  function showSettings() {
    const beds = bedsNow();
    openSheetRaw(`<div class="grab"></div><div class="sbody">
      <h2>Where you sleep</h2>
      <div class="card" style="box-shadow:none;background:var(--hair);margin-top:12px"><div class="pad">
        ${beds.map((b) => `<div class="kv"><b>${esc(place(b.place).n)}</b>
          <span>${b.last ? esc(dateShort(b.from)) + " onwards"
            : `${b.nights} ${b.nights > 1 ? "nights" : "night"} from ${esc(dateShort(b.from))}${b.in ? ` · in about ${esc(b.in)}` : ""}`}</span></div>`).join("")}
      </div></div>
      <div class="btns" style="padding:14px 0 0">
        <button class="btn ghost" id="themebtn">${svg("moon")} Light or dark</button>
        <button class="btn ghost" data-close="1">Close</button>
      </div>
    </div>`);
  }

  function troubleCard() {
    if (!todayDay()) return "";
    return `<div class="label">If the day stops going to plan</div>
      <div class="card">
        <div class="btns"><button class="btn ghost" data-trouble="missed">${svg("warn")} I missed my train</button>
        <button class="btn ghost" data-trouble="stay60">${svg("now")} I want another hour here</button>
        <button class="btn ghost" data-trouble="stay120">${svg("now")} Another two hours</button></div>
      </div>`;
  }

  /* ---------- events ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("#morebtn,#pulse,[data-freq],[data-goday],[data-route],[data-sight],[data-tick],[data-replan],[data-close],[data-trouble],#scrim,#themebtn");
    if (!t) return;
    if (t.id === "scrim" || t.dataset.close) return closeSheet();
    if (t.id === "morebtn") return showSettings();
    if (t.id === "pulse") { refreshLive(true); return showLiveInfo(); }
    if (t.id === "themebtn") {
      const cur = document.documentElement.getAttribute("data-theme");
      const next = cur === "dark" ? "light" : cur === "light" ? "" : "dark";
      if (next) document.documentElement.setAttribute("data-theme", next);
      else document.documentElement.removeAttribute("data-theme");
      store.set("theme", next);
      return;
    }
    if (t.dataset.freq) {
      const [f, to, iso] = t.dataset.freq.split("|");
      return showFreq(f, to, iso || null);
    }
    if (t.dataset.goday) { push(); openDay = +t.dataset.goday; return go(() => { window.scrollTo(0, 0); render(); }); }
    if (t.dataset.sight) return openSight(t.dataset.sight);
    if (t.dataset.tick) {
      const k = t.dataset.tick;
      ticked[k] = !ticked[k]; store.set("ticked", ticked);
      closeSheet(); render();
      return;
    }
    if (t.dataset.replan) return replan();
    if (t.dataset.trouble) {
      const v = t.dataset.trouble;
      return showReflow(v === "missed" ? "missed" : "stay", v === "stay120" ? 120 : 60);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") return goBack();
  });
  // Android's back gesture and the browser's back button land here too.
  window.history.replaceState({ mb: 0 }, "");
  window.addEventListener("popstate", () => { window.history.pushState({ mb: 1 }, ""); goBack(); });
  window.history.pushState({ mb: 1 }, "");
  // The map script is deferred, so the first paint can happen without it.
  window.addEventListener("load", () => drawMap());
  window.addEventListener("online", () => { online = true; refreshLive(true); });
  window.addEventListener("offline", () => { online = false; liveState.status = "off"; paintPulse(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { render(); refreshLive(); } });

  /* ---------- go ---------- */
  const savedTheme = store.get("theme", "");
  if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);
  paintDates();

  render();
  refreshLive();
  // "Now" markers in the timeline move on their own.
  setInterval(() => { if (!document.hidden) render(); }, 60000);
  setInterval(() => { if (!document.hidden) refreshLive(); }, 90000);
})();
