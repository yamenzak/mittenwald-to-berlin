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

  /* ---------- storage ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("mb-" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("mb-" + k, JSON.stringify(v)); } catch (e) {} },
  };
  /* ---------- العربية ---------- */
  /* One file, one link, a switch inside it. Anything without a translation
     falls back to the English rather than vanishing, so the page is never
     blank in a place I have not reached yet. */
  const AR = D.ar || null;
  let lang = store.get("lang", (navigator.language || "").startsWith("ar") && AR ? "ar" : "en");
  const ar = () => lang === "ar" && !!AR;
  const T = (en) => (ar() && AR.ui[en]) || en;
  function setLang(next) {
    lang = next; store.set("lang", next);
    applyLang();
    render();
  }
  function applyLang() {
    const b = document.getElementById("langbtn");
    if (b) { b.innerHTML = ar() ? '<b style="font:700 12px/1 system-ui">EN</b>' : '<b style="font:700 15px/1 system-ui">ع</b>'; }
    const r = document.documentElement;
    r.setAttribute("lang", ar() ? "ar" : "en");
    r.setAttribute("dir", ar() ? "rtl" : "ltr");
    document.querySelectorAll("[data-tab]").forEach((b) => {
      const key = { trip: "Itinerary", day: "The day", now: "Guide me" }[b.dataset.tab];
      const label = b.querySelector("span.lbl");
      if (label && key) label.textContent = T(key);
    });
    const h = document.querySelector(".top h1");
    if (h) h.textContent = T("Mittenwald to Berlin");
  }

  let preset = store.get("preset", null);
  let chosen = store.get("routes", {});
  /* A preset is the whole trip, already balanced. Picking one sets every day;
     changing a single day afterwards is still allowed and just means she has
     stepped off the preset, which the page says rather than hides. */
  const presetOf = (id) => (D.presets || []).find((p) => p.id === id) || null;
  function applyPreset(id) {
    const p = presetOf(id);
    if (!p) return;
    liveGen++;
    preset = id; chosen = {};
    p.pickDays.forEach((d) => { chosen[d.n] = d.pathId; });
    store.set("preset", preset); store.set("routes", chosen);
    liveCache = {}; store.set("live", {});
  }
  const offPreset = () => {
    const p = presetOf(preset);
    return !!p && p.pickDays.some((d) => (chosen[d.n] || d.pathId) !== d.pathId);
  };
  let ticked = store.get("ticked", {});
  let liveCache = store.get("live", {});

  /* ---------- time ---------- */
  // A ?at= in the address lets the day be previewed before it happens. It is
  // also the only way to test a Tuesday morning in Mittenwald on a Friday.
  const qs = new URLSearchParams(location.search);
  const fake = qs.get("at") ? new Date(qs.get("at")) : null;
  const now = () => (fake ? new Date(fake.getTime() + (Date.now() - boot)) : new Date());
  const boot = Date.now();

  /* The plan was built for 29 September. If she travels a week later — or a day
     early, or the flight moves — the dates in the file stop matching the dates
     she is living in, and an app that insists otherwise is useless on the day.
     So the whole plan slides: day 1 is whatever date she says it is, and every
     live lookup asks the timetable about the real date rather than the one the
     plan was baked from. */
  const DAY_MS = 86400000;
  const planStart = D.days[0].iso;
  let startIso = store.get("start", planStart);
  const shiftDays = () =>
    Math.round((Date.parse(startIso + "T12:00:00Z") - Date.parse(planStart + "T12:00:00Z")) / DAY_MS);
  const shifted = () => shiftDays() !== 0;
  /* A plan date -> the date she is actually there. */
  const realDate = (iso) =>
    new Date(Date.parse(iso + "T12:00:00Z") + shiftDays() * DAY_MS).toISOString().slice(0, 10);
  /* An instant in the baked plan -> the same clock time on the real date. */
  const realInstant = (isoTime) =>
    new Date(new Date(isoTime).getTime() + shiftDays() * DAY_MS).toISOString();
  function setStart(iso) {
    startIso = iso; store.set("start", iso);
    liveGen++;
    liveCache = {}; store.set("live", {});
    replanCache = {};
  }

  const hhmm = (d) => new Date(d).toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  const dayKey = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: TZ });
  const loc = () => (ar() ? "ar" : "en-GB");
  const fmtWeekday = (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString(loc(), { weekday: "short", timeZone: "UTC" });
  const fmtDate = (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString(loc(), { day: "numeric", month: "short", timeZone: "UTC" });
  // Everything on screen is the date she is actually there, not the baked one.
  const weekday = (iso) => fmtWeekday(realDate(iso));
  const dateShort = (iso) => fmtDate(realDate(iso));
  const mins = (a, b) => Math.round((new Date(b) - new Date(a)) / 60000);
  const dur = (m) => {
    if (m == null) return "";
    const h = Math.floor(m / 60), r = m % 60;
    if (ar()) return (h ? `${h} س` : "") + (r ? (h ? " " : "") + `${r} د` : h ? "" : "٠ د");
    return (h ? h + " h" : "") + (r ? (h ? " " : "") + r + " min" : (h ? "" : "0 min"));
  };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- helpers ---------- */
  /* Instructions and the walkthrough's own sentences are written at build time
     in English. Rather than translate the built strings, the Arabic ones are
     rebuilt here from the same facts. */
  const stnText = (day, stop) => {
    if (!ar()) return stop.stn || "";
    const k = `${day.n}${pathOf(day).id}-${pathOf(day).seq.indexOf(stop)}`;
    return (AR.stn && AR.stn[k]) || stop.stn || "";
  };

  function saidFor(st) {
    if (!ar()) return st.say || "";
    const p = place(st.place || st.toPlace);
    if (st.kind === "arrive") {
      return st.free
        ? `${dur(st.free)} ${T("here")}، ${T("until the")} ${st.dep}.`
        : T("This is where you sleep tonight.");
    }
    if (st.kind === "ride") {
      return st.changes
        ? `${st.dur} ${T("minutes")} و${st.changes} ${T(st.changes > 1 ? "changes" : "change")} — ${st.line}.`
        : `${st.dur} ${T("minutes")}، ${T("direct")}.`;
    }
    if (st.kind === "back") return `${st.mins} ${T("min back to the station")}. ${T("Be on the platform by")} ${st.t || ""}.`;
    if (st.kind === "sleep") return T("Goodnight");
    return st.say || "";
  }

  const place = (k) => {
    const p = D.places[k];
    if (!p) return { n: k };
    return ar() && AR.places[k] ? { ...p, n: AR.places[k] } : p;
  };
  const dayText = (d) => (ar() && AR.days[d.n]) || d;
  const pathText = (d, p) => (ar() && AR.paths[`${d.n}${p.id}`]) || p;
  const presetText = (p) => (ar() && AR.presets[p.id]) || p;
  const pathOf = (day) => day.paths.find((p) => p.id === chosen[day.n]) || day.paths[0];
  const sightOf = (pk, name) => {
    const s = D.sights[pk + "/" + name];
    if (!s) return null;
    const t = ar() && AR.sights[pk + "/" + name];
    return t ? { ...s, name: t.name, note: t.note, en: s.name } : s;
  };
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
  const KIND = new Proxy(KIND_EN, { get: (o, k) => T(o[k] || "Sight") });

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
      if (shifted() && alt) {
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
    // walkthrough is live when she looks at it the night before too.
    const day = todayDay() || (view === "walk" ? D.days.find((x) => x.n === wtDay) : null);
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
    if (view === "now" || view === "day") render();
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
      : s === "checking" ? "Checking with the timetable now."
      : s === "off" ? "No connection, so these are the planned times. They were right when the page was built."
      : s === "none" ? "Nothing to check yet — you are not travelling today, so these are the planned times."
      : "Could not reach the timetable just now. The planned times still stand.";
    openSheetRaw(`<div class="grab"></div><div class="sbody">
      <h2>${s === "ok" ? "Live" : s === "off" ? "Offline" : "The plan"}</h2>
      <p class="about" style="color:var(--ink)">${esc(said)}</p>
      <p class="about">A green dot means the times you see have been checked against Deutsche Bahn in the last few minutes.
        Grey means you are reading the plan as it was built. It checks itself every minute or so while you travel,
        and you can tap here any time to make it check again.</p>
      <div class="btns" style="padding:14px 0 0"><button class="btn ghost" data-close="1">${T("Close")}</button></div></div>`);
  }

  function paintPulse() {
    const el = document.getElementById("pulse");
    if (!el) return;
    const s = liveState.status;
    const cls = s === "ok" || s === "checking" ? "" : s === "off" || s === "none" ? "off" : "bad";
    const txt = s === "checking" ? "Checking…"
      : s === "ok" ? "Live · " + hhmm(liveState.at)
      : s === "off" ? "Offline — using the plan"
      : s === "none" ? "Plan"
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
  let view = "trip";
  let openDay = null;
  let mapDay = 0; // 0 means the whole trip
  /* Every screen she can land on, so the arrow in the corner always has
     somewhere to go — including back out of a sheet, and back a step in the
     walkthrough, which is where people press it first. */
  const navStack = [];
  const snapshot = () => ({ view, openDay, wtDay, wtStep });
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
    view = prev.view; openDay = prev.openDay; wtDay = prev.wtDay; wtStep = prev.wtStep;
    render();
  }
  /* The strip under the title is the trip's dates, so it has to move when the
     trip does — it was printing the dates the plan was baked from. */
  function paintDates() {
    const el = document.getElementById("trip-dates");
    if (!el) return;
    el.textContent = dateShort(D.days[0].iso) + " – " + dateShort(D.days[D.days.length - 1].iso) +
      " · " + D.days.length + " days" + (shifted() ? " · moved" : "");
  }

  function paintBack() {
    const b = document.getElementById("tripsbtn");
    if (b) b.setAttribute("aria-pressed", String(view === "choose"));
  }
  const app = document.getElementById("app");

  function render() {
    if (view === "trip") app.innerHTML = viewTrip();
    else if (view === "day") app.innerHTML = viewDay(openDay || (todayDay() || D.days[0]).n);
    else app.innerHTML = viewNow();
    document.querySelectorAll(".tab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === view)));
    paintBack();
    paintDates();
    const tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute("content", getComputedStyle(document.documentElement).getPropertyValue("--chrome").trim() || "#16211C");
    if (view === "trip") drawMap();
    if (view === "now" && guideMode === "steps") drawWalkMap();
    paintPulse();
  }

  /* ---------- choosing a trip ---------- */
  /* Shown until a preset is picked, and reachable afterwards. Each card is
     costed from the real days behind it, so the promise on the front matches
     what the timetable actually does — and it names the hotel towns, which is
     the part that has to be decided before anyone leaves. */
  function viewPresets(inline) {
    const list = D.presets || [];
    if (!list.length) return "";
    return `${inline ? `<div class="label">${T("Change the trip")}</div>` : ""}
      <div class="routes">${list.map((p) => `
        <button class="route" data-preset="${esc(p.id)}" aria-pressed="${p.id === preset}">
          <span class="rn">${esc(presetText(p).name)}</span>
          <span class="rw">${esc(presetText(p).why)}</span>
          <span class="rs">
            <span class="tag hot">${p.towns.length} ${T("towns")}</span>
            <span class="tag">${dur(p.ride)} ${T("on trains, all week")}</span>
            <span class="tag">${T("in Berlin")} ${esc(p.arrive)}</span>
          </span>
          <span class="beds">${p.beds.map((b) => `<span class="bed"><b>${esc(place(b.place).n)}</b>${b.nights > 1 ? ` · ${b.nights} nights` : ""}</span>`).join("")}</span>
        </button>`).join("")}</div>`;
  }

  /* Step one: which way across, and which day it starts. Everything needed to
     book a hotel lives here, and the map shows the shape of the choice. */
  function viewTrip() {
    const d = D.days[0];
    const p = presetOf(preset);
    return `<div class="wrap">
      ${heroCard(d, T("Step 1"), T("Pick how you want the week to go"))}
      <div class="card pad"><p class="lead" style="margin:0">${T("chooser-intro")}</p></div>
      <div class="label">${T("Choose your trip")}</div>
      ${viewPresets(false)}
      ${p ? `<div class="label">${T("The whole trip on the map")}</div>
        <div class="card"><div id="map"></div>
          <div class="pad">${mapCaption()}</div></div>` : ""}
      ${startCard()}
      ${bedsCard()}
      ${ticketNote()}
      <div class="btns" style="padding:8px 0 0"><button class="btn ghost" id="starttour" type="button">${svg("help")} ${T("Show me how this works")}</button></div>
      ${footer()}</div>`;
  }

  function mapCaption() {
    const all = mapDay === 0;
    const day = all ? null : D.days.find((x) => x.n === mapDay);
    const totals = D.days.reduce((t, x) => { const q = pathOf(x); return { ride: t.ride + q.ride, stops: t.stops + q.stops }; }, { ride: 0, stops: 0 });
    const chips = `<div class="days" style="padding:0 0 10px">
      <button class="dchip" data-mapday="0" aria-pressed="${all}">${T("All days")}</button>
      ${D.days.map((x) => `<button class="dchip" data-mapday="${x.n}" aria-pressed="${x.n === mapDay}">${T("Day")} ${x.n}</button>`).join("")}</div>`;
    return chips + (all
      ? `<p class="lead" style="margin:0">${totals.stops} ${T("stops")} · ${dur(totals.ride)} ${T("on trains, all week")}.
         <span style="opacity:.8">${T("The bigger dots are where you sleep.")}</span></p>
         <div class="legend">${D.days.map((x) => `<span><i style="width:11px;height:11px;border-radius:50%;background:${x.c};display:inline-block"></i>${T("Day")} ${x.n}</span>`).join("")}</div>`
      : `<p class="lead" style="margin:0"><b>${esc(dayText(day).title)}</b> — ${esc(pathText(day, pathOf(day)).name)}</p>`);
  }

  /* Which day the trip starts on. It was hidden behind an icon in the chrome;
     it belongs beside the choice it changes. */
  function startCard() {
    const opts = [-7, -2, -1, 0, 1, 2, 7].map((k) => ({
      iso: new Date(Date.parse(planStart + "T12:00:00Z") + k * DAY_MS).toISOString().slice(0, 10), k,
    }));
    return `<div class="label">${T("When does it start?")}</div>
      <div class="card"><div class="pad" style="padding-bottom:8px">
        <p class="lead" style="margin:0">${T("start-intro")}</p></div>
        <div class="days" style="padding:0 16px 14px">
          ${opts.map((o) => `<button class="dchip" data-setstart="${o.iso}" aria-pressed="${o.iso === startIso}">
            ${esc(fmtWeekday(o.iso))} ${esc(fmtDate(o.iso))}<small>${o.k === 0 ? T("As planned")
              : o.k > 0 ? "+" + o.k : String(o.k)}</small></button>`).join("")}
        </div>
        <div class="pad" style="padding-top:0">
          <label style="font-size:14px;color:var(--soft-ink)">${T("Or pick the day you arrive in Mittenwald")}
            <input type="date" id="startpick" value="${esc(startIso)}"
              style="display:block;margin-top:8px;width:100%;min-height:48px;padding:0 12px;border-radius:13px;border:1.5px solid var(--line);background:var(--card);color:var(--ink);font:inherit"></label>
        </div>
      </div>`;
  }

  /* ---------- step 3: guide me ---------- */
  /* One screen for "I am lost, what now". It has two faces — the summary, and
     the same day as a sequence you press through — and a switch between them,
     because the answer to being lost is sometimes one sentence and sometimes a
     list of eleven. Location is asked for here and only here, when she presses
     the button that needs it. */
  function viewNow() {
    if (!preset && (D.presets || []).length) { view = "trip"; return viewTrip(); }
    const toggle = `<div class="seg" role="group">
      <button type="button" data-guide="now" aria-pressed="${guideMode === "now"}">${T("What now")}</button>
      <button type="button" data-guide="steps" aria-pressed="${guideMode === "steps"}">${T("Step by step")}</button>
    </div>`;
    if (guideMode === "steps") return `<div class="wrap">${toggle}${viewWalkBody()}</div>`;
    return `<div class="wrap">${toggle}${viewNowBody()}</div>`;
  }

  /* Where the phone says she is, against where the plan says she should be. */
  async function locate() {
    guideAsked = true;
    try {
      const pos = await new Promise((res, rej) => {
        if (!navigator.geolocation) return rej(new Error("no gps"));
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000, maximumAge: 60000 });
      });
      guideFix = { lat: pos.coords.latitude, lon: pos.coords.longitude, at: Date.now() };
    } catch (e) {
      guideFix = { failed: true, at: Date.now() };
    }
    render();
  }

  const km = (a, b, c, d) => {
    const R = 6371, r = (x) => (x * Math.PI) / 180;
    const h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  /* Nearest town on the whole trip, so "you seem to be in Bamberg" is something
     the page can say rather than something she has to tell it. */
  function whereAmI() {
    if (!guideFix || guideFix.failed) return null;
    let best = null;
    for (const [k, p] of Object.entries(D.places)) {
      if (p.lat == null) continue;
      const d = km(guideFix.lat, guideFix.lon, p.lat, p.lon);
      if (!best || d < best.d) best = { key: k, d };
    }
    return best && best.d < 40 ? best : { key: null, d: best ? best.d : null };
  }

  function locateCard() {
    const day = todayDay();
    if (!guideFix) {
      return `<div class="card"><div class="pad" style="padding-bottom:6px">
        <p class="lead" style="margin:0">${T("locate-ask")}</p></div>
        <div class="btns"><button class="btn accent" data-locate="1">${svg("pin")} ${T("Where am I?")}</button></div></div>`;
    }
    if (guideFix.failed) return note("calm", T("locate-failed"));
    const here = whereAmI();
    const onPlan = day && here && here.key && pathOf(day).seq.some((x) => x.kind === "stop" && x.place === here.key);
    return `<div class="card"><div class="pad">
      <div class="what" style="color:var(--accent);font-size:13px;font-weight:700;letter-spacing:.09em;text-transform:uppercase">${T("Where you are")}</div>
      <div style="font-size:22px;font-weight:700;margin-top:4px">${here && here.key ? esc(place(here.key).n) : T("Somewhere off the route")}</div>
      <p class="lead" style="margin-top:6px">${here && here.key
        ? (onPlan ? T("on-plan") : T("off-plan"))
        : T("far-off-plan")}</p>
      </div>
      <div class="btns"><button class="btn ghost" data-locate="1">${T("Check again")}</button></div></div>`;
  }

  function viewNowBody() {
    const s = situation();

    if (s.kind === "before") {
      const d = s.day, p = pathOf(d);
      return `<div class="wrap">
        ${heroCard(d, `${s.days} day${s.days === 1 ? "" : "s"} to go`, d.title)}
        <div class="card"><div class="headline">
          <div class="what">First day</div>
          <div class="big">${esc(d.title)}</div>
          <p class="why">${esc(d.intro)}</p>
        </div>
        ${ticketNote()}
        <div class="btns two"><button class="btn accent" data-startwalk="1">${svg("route")} Walk me through it</button><button class="btn ghost" data-goday="${d.n}">See day 1</button></div>
        </div>
        ${overviewList()}
        ${footer()}</div>`;
    }
    if (s.kind === "after") {
      return `${heroCard(s.day, T("The trip"), T("You made it. Berlin."))}
        <div class="card pad"><p class="lead">Seven days, twenty-four towns. Everything is still here if you want to look back at it.</p></div>
        ${overviewList()}${footer()}`;
    }

    const { day, path, at, riding, nextMove } = s;
    const t = now();
    let head = "", count = "", strip = "";

    if (riding) {
      const l = liveFor(riding);
      const left = mins(t, realArr(riding));
      head = `<div class="what">${T(isBus(riding) ? "On the bus" : "On the train")}</div>
        <div class="big">${esc(place(riding.to).n)}</div>
        <p class="why">${T("arriving")} ${hhmm(realArr(riding))}${l && l.arrDelay > 2 ? ` — ${l.arrDelay} ${T("min late")}` : ""}.</p>`;
      count = pill(left, T("until you arrive"), left < 6 ? "now" : "go");
      strip = legStrip(riding, l);
    } else if (nextMove) {
      const go = leaveBy(nextMove, at);
      const toGo = mins(t, go);
      const l = liveFor(nextMove);
      const gone = l && l.cancelled;
      head = `<div class="what">${at ? T("You are in") + " " + esc(place(at.place).n) : T("Next")}</div>
        <div class="big">${gone ? T(isBus(nextMove) ? "The bus is cancelled" : "The train is cancelled")
          : toGo > 0 ? T(isBus(nextMove) ? "Next bus at" : "Next train at") + " " + hhmm(realDep(nextMove))
          : T(isBus(nextMove) ? "Head for the bus stop" : "Head for the station")}</div>
        <p class="why">${gone ? `${esc(nextMove.legs[0].line)} ${T("is not running. There is another way below.")}`
          : `${esc(place(nextMove.to).n)}، ${T("arriving")} ${hhmm(realArr(nextMove))}.${at && at.stn ? " " + esc(stnText(day, at)) : ""}`}</p>`;
      count = gone ? ""
        : toGo > 0 ? pill(toGo, T("until you should set off"), toGo > 45 ? "go" : toGo > 12 ? "soon" : "now")
        : pill(Math.max(0, mins(t, realDep(nextMove))), T("until it leaves"), "now");
      strip = legStrip(nextMove, l);
    } else if (at) {
      head = `<div class="what">${T("Tonight")}</div>
        <div class="big">${esc(place(at.place).n)}</div>
        <p class="why">${T("Nothing more to catch today.")} ${esc(dayText(day).intro)}</p>`;
      count = "";
      strip = "";
    }

    const alerts = liveAlerts(nextMove || riding);
    const suggest = at && !riding ? suggestions(at, nextMove) : "";

    return `${heroCard(day, `${T("Day")} ${day.n} · ${weekday(day.iso)} ${dateShort(day.iso)}`, dayText(day).title)}
      <div class="card">
        <div class="headline">${head}${count}</div>
        ${strip}
        <div class="btns two">
          ${nextMove ? `<a class="btn accent" href="${gdir("my location", (at && place(at.place).name) || nextMove.fromStop, "walking")}" target="_blank" rel="noopener">${svg("walk")} ${T(isBus(nextMove) ? "Walk me to the bus stop" : "Walk me to the station")}</a>` : ""}
          <button class="btn ghost" data-startwalk="1">${svg("route")} ${T("Walk me through the day")}</button>
          <button class="btn ghost" data-goday="${day.n}">${T("The whole day")}</button>
        </div>
      </div>
      ${alerts}
      ${day.holiday ? note("warn", day.holiday) : ""}
      ${locateCard()}
      ${suggest}
      ${shiftNote()}
      ${troubleCard()}
      ${footer()}`;
  }

  const pill = (m, label, tone) =>
    `<div class="countdown ${tone}"><span class="n">${m <= 0 ? T("now") : m < 60 ? m : Math.floor(m / 60) + (ar() ? "س" : "h") + String(m % 60).padStart(2, "0")}</span><span class="u">${m > 0 && m < 60 ? T("minutes") + " " : ""}${esc(label)}</span></div>`;

  function legStrip(m, l) {
    const f = m.legs[0];
    const late = l && l.depDelay > 2;
    return `<div class="train">
      <span class="line${m.bus || f.mode === "BUS" ? " bus" : ""}">${esc(f.line)}</span>
      <span class="mid">
        <span class="t">${late ? `<s>${esc(f.dep)}</s><em>${hhmm(l.realDep)}</em>` : timeBtn(f.dep, m.from, m.to, m.depIso)} → ${esc(m.arr)}</span>
        <span class="d">${T("towards")} ${esc(towards(f, m.to))}${m.changes ? ` · ${m.changes} ${T(m.changes > 1 ? "changes" : "change")}` : " · " + T("direct")}</span>
      </span>
      ${(l && l.track) || f.track ? `<span class="plat${l && l.trackChanged ? " changed" : ""}"><b>${esc((l && l.track) || f.track)}</b><span>${l && l.trackChanged ? (isBus(m) ? "new stop" : "new plat") : isBus(m) ? "stop" : "platform"}</span></span>` : ""}
    </div>`;
  }

  function liveAlerts(m) {
    if (!m) return "";
    const l = liveFor(m);
    if (!l) return liveState.status === "off"
      ? note("calm", "You are offline, so these are the planned times. They were right when the page was built.")
      : "";
    const out = [];
    if (l.cancelled) out.push(note("bad", `This ${vehicle(m)} is cancelled.`.slice(0, -1) + `. Tap "Find me another way" below — it only ever suggests trains and buses your ticket covers.`));
    else if (l.depDelay >= 5) out.push(note("warn", `Running ${l.depDelay} minutes late. It now leaves at ${hhmm(l.realDep)} and gets in at ${hhmm(l.realArr)}.`));
    if (l.trackChanged) out.push(note("warn", `${isBus(m) ? "Stop" : "Platform"} changed to ${l.track}. Check the board when you get there.`));
    const tight = (l.gaps || []).filter((g) => g < 6);
    if (tight.length) out.push(note("warn", `One of your changes is down to ${Math.min.apply(null, tight)} minutes. If you miss it, the next connection is below.`));
    if ((l.depDelay >= 5 || l.cancelled) && m.later && m.later.length) {
      out.push(`<div class="card"><div class="pad"><div class="label" style="margin-top:0">If this one goes wrong</div>
        ${m.later.map((c) => `<div class="kv"><b>${esc(c.dep)} → ${esc(c.arr)}</b><span>${esc(c.lines.join(" · "))} · ${c.changes ? c.changes + " chg" : "direct"}</span></div>`).join("")}</div>
        <div class="btns"><button class="btn ghost" data-replan="1">Find me another way</button></div></div>`);
    }
    return out.join("");
  }

  function note(kind, text) {
    return `<div class="note ${kind === "warn" ? "" : kind}">${svg(kind === "calm" ? "info" : "warn")}<span>${esc(text)}</span></div>`;
  }
  const ticketNote = () => note("calm", ar() ? T("ticket-note") : D.trip.ticket.excluded);

  function heroCard(day, kicker, title) {
    const img = photo("place:" + day.hero);
    return `<div class="card hero">
      ${img ? `<img src="${img}" alt="${esc(place(day.hero).n)}">` : `<div style="height:190px;background:var(--hair)"></div>`}
      <div class="veil"></div>
      <div class="cap"><div class="kicker">${esc(kicker)}</div><h2>${esc(title)}</h2></div>
    </div>`;
  }

  /* ---------- what is worth doing right now ---------- */
  /* Ranked by the time she actually has left in this town, whether the place is
     open on this weekday, and whether it is the sort of thing to do after dark. */
  function suggestions(stop, nextMove) {
    const list = (stop.see || []).map((n) => sightOf(stop.place, n)).filter(Boolean);
    if (!list.length) return "";
    const t = now();
    const until = nextMove ? mins(t, leaveBy(nextMove, stop)) : 240;
    const dow = new Date(dayKey(t) + "T12:00:00Z").getUTCDay();
    const hour = +hhmm(t).slice(0, 2);
    const dark = hour >= 19 || hour < 8;

    const scored = list.map((s) => {
      let v = 0;
      const key = stop.place + "/" + s.name;
      if (ticked[key]) v -= 100;
      if (s.mins <= until - 15) v += 30; else v -= (s.mins - until) / 3;
      if (s.closed && s.closed.includes(dow)) v -= 60;
      if (dark && (s.kind === "museum" || s.kind === "palace" || s.kind === "view")) v -= 25;
      if (dark && (s.kind === "food" || s.kind === "square" || s.kind === "street")) v += 15;
      if (hour >= 12 && hour <= 14 && s.kind === "food") v += 20;
      if (s.ticket) v -= 5;
      return { s, v, key };
    }).sort((a, b) => b.v - a.v);

    const top = scored.filter((x) => x.v > -40).slice(0, 3);
    if (!top.length) return "";
    const head = ar()
      ? `${dur(until)} ${T("here")}. ${T("Worth doing now:")}`
      : until < 45 ? `You have about ${until} minutes. These are close.`
      : `You have ${dur(until)} here. Worth doing now:`;

    return `<div class="label">${T("Right now in")} ${esc(place(stop.place).n)}</div>
      <div class="card"><div class="pad" style="padding-bottom:6px"><p class="lead" style="margin:0">${esc(head)}</p></div>
      <div class="rail">${top.map((x) => sightCard(stop.place, x.s)).join("")}</div></div>`;
  }

  function sightCard(pk, s) {
    const key = pk + "/" + s.name;
    const img = photo("sight:" + key);
    const done = !!ticked[key];
    return `<button class="sight${done ? " done" : ""}" data-sight="${esc(key)}">
      ${img ? `<img src="${img}" alt="" loading="lazy">` : `<div style="height:118px"></div>`}
      ${s.ticket ? `<span class="pin">ticket</span>` : ""}
      <span class="sv"><span class="sn">${esc(s.name)}</span>
      <span class="sm">${esc(KIND[s.kind])} · ${s.mins} ${T("min")}</span></span>
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
    const isToday = day.iso === dayKey(now());

    const pre = presetOf(preset);
    const onPreset = pre ? (pre.pickDays.find((x) => x.n === day.n) || {}).pathId : null;
    const routes = `<div class="label">${day.paths.length === 1 ? T("The plan")
      : pre ? `This day, within “${esc(presetText(pre).name)}”` : T("Choose how to spend it")}</div>
      ${pre && onPreset && path.id !== onPreset
        ? note("calm", `You have swapped this day out of “${presetText(pre).name}”. That can change where you sleep — check the hotel list on the front page.`)
        : ""}
      <div class="routes">${day.paths.map((p) => `
        <button class="route" data-route="${day.n}:${p.id}" aria-pressed="${p.id === path.id}">
          <span class="rn">${esc(pathText(day, p).name)}</span>
          <span class="rw">${esc(pathText(day, p).why)}</span>
          <span class="rs">
            <span class="tag${p.stops > 2 ? " hot" : ""}">${p.stops} ${T("stops")}</span>
            <span class="tag">${dur(p.ride) || "no"} on trains</span>
            <span class="tag">in by ${esc(p.endArr)}</span>
          </span>
        </button>`).join("")}</div>`;

    const body = path.seq.map((s, i) => s.kind === "stop" ? stopBlock(day, s, i, isToday) : moveBlock(day, s, isToday)).join("");

    return `<div class="wrap">
      ${dayStrip(day.n, "goday")}
      ${heroCard(day, `${T("Day")} ${day.n} · ${weekday(day.iso)} ${dateShort(day.iso)}`, dayText(day).title)}
      <div class="card pad"><p class="lead" style="margin:0">${esc(dayText(day).intro)}</p></div>
      ${shiftNote()}
      ${day.holiday ? note("warn", day.holiday) : ""}
      ${day.bags ? note("calm", "You change hotel today — the bags come with you. Most stations have lockers if you want to drop them before wandering.") : ""}
      ${routes}
      <div class="label">${T("The day, in order")}</div>
      <div class="tl">${body}</div>
      ${footer()}</div>`;
  }

  /* The timeline used to be a list of names with the photographs somewhere
     else. A thumbnail beside each line is the difference between reading a
     schedule and recognising the place when you get there. */
  function walkThumb(pk, name) {
    const s = sightOf(pk, name);
    const img = s && photo("sight:" + pk + "/" + (s.en || s.name));
    if (!img) return "";
    return `<button class="wthumb" data-sight="${esc(pk + "/" + (s.en || s.name))}" aria-label="${esc(s.name)}">
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
            <span class="when">${s.base ? "Arrive " + esc(s.arr) + " · you sleep here"
              : esc(s.arr) + " – " + (nextMoveAfter(day, s) ? timeBtn(s.dep, nextMoveAfter(day, s).from, nextMoveAfter(day, s).to, nextMoveAfter(day, s).depIso) : esc(s.dep))}</span></span>
          ${s.free ? `<span class="free"><b>${dur(s.free)}</b><span>here</span></span>` : ""}
        </div>
        ${s.stn ? `<p class="walknote">${esc(stnText(day, s))}</p>` : ""}
        ${sights.length ? `<div class="rail">${sights.map((x) => sightCard(s.place, x)).join("")}</div>` : ""}
        ${walkPlan(s)}
        <div class="mfoot">
          ${s.route && s.route.maps ? `<a class="chip go" href="${esc(s.route.maps)}" target="_blank" rel="noopener">${svg("route")} ${T("Walk this route")}</a>` : ""}
          <a class="chip" href="${gmaps(p.name || p.n)}" target="_blank" rel="noopener">${svg("pin")} ${T("Station")}</a>
          <a class="chip" href="${gmaps(p.n + ", " + (p.country === "AT" ? "Austria" : "Germany"))}" target="_blank" rel="noopener">${svg("map")} ${T("Town")}</a>
          ${day.bags && !s.base && s.free ? `<a class="chip" href="${gmaps("Gepäckschließfächer " + (p.name || p.n))}" target="_blank" rel="noopener">${T("Lockers")}</a>` : ""}
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
    const hop = (l) => l.how && l.how.mode === "ride"
      ? `<div class="whop">${svg("tram")}<b>${esc(l.how.line)}</b> · ${l.mins} min <span style="opacity:.75">(${l.how.walkInstead} min on foot)</span></div>`
      : `<div class="whop">${svg("walk")}${l.mins} min walk</div>`;

    const row = (l, showClock) => {
      const t = sightOf(s.place, l.to) || { name: l.to, note: l.note };
      return `${hop(l)}
      <div class="wrow"><div class="wtime">${showClock ? esc(clock(l.at)) : ""}</div>
        <button class="wbody" data-sight="${esc(s.place + "/" + l.to)}">
          <div class="wname">${esc(t.name)}${l.must ? `<span class="star">${T("worth it")}</span>` : ""}</div>
          <div class="wsay">${esc(t.note || "")}${l.visit ? ` · ${T("about")} ${l.visit} ${T("min")}${l.ticket ? "، " + T("ticket needed") : ""}` : ""}</div>
        </button>
        ${walkThumb(s.place, l.to)}</div>`;
    };

    return `<div class="walkplan">
      ${core.map((l) => row(l, true)).join("")}
      ${r.back != null ? `<div class="whop">${svg("walk")}${r.back} min back to the station</div>` : ""}
      ${extra.length ? `<div class="wextra-head">${T("Only if you are ahead of time")}</div>
        <div class="wextra">${extra.map((l) => row(l, false)).join("")}</div>` : ""}
    </div>`;
  }

  function moveBlock(day, m, isToday) {
    if (m.missing) return `<div class="ev">${note("bad", `No connection found for ${place(m.from).n} to ${place(m.to).n}. Check DB Navigator.`)}</div>`;
    const l = isToday ? liveFor(m) : null;
    const past = isToday && new Date(realArr(m)) < now();
    const rows = m.legs.map((leg, i) => {
      const gap = i > 0 ? m.gaps[i - 1] : null;
      return (gap != null ? `<div class="change${gap < 8 ? " tight" : ""}">${svg("walk")} ${gap} min to change at ${esc(m.legs[i - 1].to)}${gap < 8 ? " — be ready by the door" : ""}</div>` : "") +
        `<div class="mrow">
          <span class="line${leg.mode === "BUS" ? " bus" : ""}">${esc(leg.line)}</span>
          <span class="leg"><span class="lt">${i === 0 ? timeBtn(leg.dep, m.from, m.to, m.depIso) : esc(leg.dep)} → ${esc(leg.arr)}</span>
          <span class="lp">${esc(leg.from.replace(/^Bahnhof[,\s]+/i, ""))} → ${esc(leg.to.replace(/^Bahnhof[,\s]+/i, ""))}</span></span>
          ${leg.track ? `<span class="plat"><b>${esc(leg.track)}</b><span>plat</span></span>` : ""}
        </div>`;
    }).join("");

    return `<div class="ev${past ? " past" : ""}">
      <div class="move">
        ${l && l.depDelay >= 5 ? `<div class="change tight">${svg("warn")} Running ${l.depDelay} min late — leaves ${hhmm(l.realDep)}</div>` : ""}
        ${rows}
        ${m.note ? `<div class="change">${svg("info")} ${esc(m.note)}</div>` : ""}
        <div class="mfoot">
          <span class="chip">${dur(m.dur)} · ${m.changes ? m.changes + " change" + (m.changes > 1 ? "s" : "") : "direct"}</span>
          <a class="chip" href="${gdir(m.fromStop, m.toStop, "transit")}" target="_blank" rel="noopener">Open in Maps</a>
        </div>
      </div></div>`;
  }

  /* ================= the walkthrough ================= */
  /* The whole week as one line of steps you press Next through: where you are,
     what you walk to, why it is worth walking to, which train, where you sleep.
     Reading a timetable and believing it is a skill; pressing Next is not. */
  let wtDay = 1, wtStep = 0;

  const allSteps = (dayN) => {
    const d = D.days.find((x) => x.n === dayN) || D.days[0];
    return pathOf(d).steps || [];
  };

  function wtGo(delta) {
    let steps = allSteps(wtDay);
    let i = wtStep + delta;
    if (i < 0) {
      if (wtDay <= D.days[0].n) return;
      wtDay--; steps = allSteps(wtDay); i = steps.length - 1;
    } else if (i >= steps.length) {
      const last = D.days[D.days.length - 1].n;
      if (wtDay >= last) return;
      wtDay++; i = 0;
    }
    wtStep = i;
    render();
    const el = document.getElementById("wt-top");
    if (el) el.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  const WT = {
    arrive: { kind: "You are here", icon: "pin" },
    see: { kind: "Go and see", icon: "eye" },
    ride: { kind: "Now travel", icon: "train" },
    back: { kind: "Head back", icon: "walk" },
    sleep: { kind: "End of the day", icon: "bed" },
  };
  const wtKind = (k) => T((WT[k] || WT.see).kind);

  function wtPhoto(st) {
    if (st.sight) { const p = photo("sight:" + st.sight); if (p) return p; }
    if (st.place) { const p = photo("place:" + st.place); if (p) return p; }
    if (st.toPlace) return photo("place:" + st.toPlace);
    return null;
  }

  /* A step and the move it came from, so the walkthrough can show the same
     live times as the front page instead of a printed schedule that has moved
     on without it. */
  function moveForStep(day, st) {
    if (st.kind !== "ride") return null;
    return pathOf(day).seq.find((x) => x.kind === "move" && !x.missing &&
      x.from === st.place && x.to === st.toPlace && x.dep === st.dep) || null;
  }

  function viewWalkBody() {
    const day = D.days.find((x) => x.n === wtDay) || D.days[0];
    const steps = allSteps(wtDay);
    if (!steps.length) return `<div class="card pad">${T("Nothing to walk through on this day.")}</div>`;
    wtStep = Math.min(wtStep, steps.length - 1);
    const st = steps[wtStep];
    const meta = WT[st.kind] || WT.see;
    const img = wtPhoto(st);
    const total = steps.length;

    const done = allSteps; // keep the linter honest
    const first = wtDay === D.days[0].n && wtStep === 0;
    const last = wtDay === D.days[D.days.length - 1].n && wtStep === total - 1;

    const mv = moveForStep(day, st);
    const lv = mv ? liveFor(mv) : null;
    const late = lv && lv.depDelay >= 2;
    const plat = (lv && lv.track) || st.track;

    const howto = st.kind === "ride"
      ? `<div class="howto">${svg(st.line && /^\d/.test(String(st.line)) ? "bus" : "train")}<span>
          <b>${esc((lv && lv.line) || st.line)}</b> from ${esc(st.from)}${plat ? `, platform ${esc(plat)}` : ""}
          at ${late ? `<s style="opacity:.6">${esc(st.dep)}</s> <em style="font-style:normal;color:var(--stop)">${esc(hhmm(lv.realDep))}</em>` : timeBtn(st.dep, st.place, st.toPlace, mv ? mv.depIso : null)}
          — in at ${lv && lv.realArr ? esc(hhmm(lv.realArr)) : esc(st.arr)}.</span></div>
        ${lv && lv.cancelled ? note("bad", "This one is cancelled. Open Now and tap “Find me another way”.")
          : late ? note("warn", `Running ${lv.depDelay} min late.`)
          : lv && lv.trackChanged ? note("warn", `Platform changed to ${lv.track}.`)
          : lv && lv.replaced ? note("calm", `On your date this service is different — the ${lv.line} at ${hhmm(lv.realDep)} is the one that runs.`)
          : ""}`
      : st.kind === "see" && st.move
      ? `<div class="howto">${svg(st.rode ? "tram" : "walk")}<span>${esc(st.move)}${st.visit ? ` Give it about ${st.visit} min.` : ""}</span></div>`
      : st.kind === "back"
      ? `<div class="howto">${svg("walk")}<span>${esc(st.say)}</span></div>`
      : "";

    return `<div id="wt-top">
      ${dayStrip(wtDay, "wtday")}
      <div class="card wt">
        ${img ? `<div class="shotwrap"><img class="shot" src="${img}" alt=""><span class="badge">Day ${day.n} · ${esc(day.title)}</span></div>` : ""}
        <div class="pad">
          <div class="kind">${esc(wtKind(st.kind))}${st.t ? " · " + esc(st.t) : ""}</div>
          <h2>${esc(st.kind === "arrive" ? `${T("You are in")} ${place(st.place).n}`
          : st.kind === "ride" ? `${T("Now travel")} — ${place(st.toPlace).n}`
          : st.kind === "back" ? `${T("Head back")} — ${place(st.place).n}`
          : st.kind === "sleep" ? `${T("Goodnight")}، ${place(st.place).n}`
          : (sightOf(st.place, st.title) || {}).name || st.title)}</h2>
          ${saidFor(st) || st.say ? `<p class="say">${esc(saidFor(st) || st.say)}</p>` : ""}
          ${howto}
          ${st.sight && D.sights[st.sight] ? `<div class="btns" style="padding:14px 0 0"><button class="btn ghost" data-sight="${esc(st.sight)}">${svg("info")} More about ${esc(st.title)}</button></div>` : ""}
        </div>
        <div id="wtmap"></div>
      </div>
      <div class="wtbar"><span class="num">${wtStep + 1} / ${total}</span>
        <span class="track"><span class="fill" style="width:${Math.round(((wtStep + 1) / total) * 100)}%"></span></span></div>
      <div class="wtnav">
        <button class="btn ghost" data-wt="-1"${first ? " disabled style=\"opacity:.45\"" : ""}>${svg("prev")} Back</button>
        <button class="btn accent" data-wt="1"${last ? " disabled style=\"opacity:.45\"" : ""}>Next ${svg("next")}</button>
      </div>
      <div class="foot">Press Next to walk the whole week, one move at a time. Every time and platform here is the real timetable for your dates.</div>
    </div>`;
  }

  let wtMap = null;
  function drawWalkMap() {
    const el = document.getElementById("wtmap");
    if (!el) return;
    if (!window.L) { el.style.display = "none"; return; }
    const steps = allSteps(wtDay);
    const st = steps[wtStep];
    if (!st || !st.ll) { el.style.display = "none"; return; }
    const day = D.days.find((x) => x.n === wtDay);
    if (wtMap) { wtMap.remove(); wtMap = null; }
    wtMap = L.map(el, { scrollWheelZoom: false, zoomControl: false, attributionControl: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(wtMap);

    // the thread of the day so far, so she can see where this step sits
    const line = steps.filter((x) => x.ll).map((x) => x.ll);
    if (line.length > 1) L.polyline(line, { color: day.c, weight: 3, opacity: .35 }).addTo(wtMap);
    steps.forEach((x, i) => {
      if (!x.ll || i > wtStep) return;
      L.circleMarker(x.ll, { radius: i === wtStep ? 9 : 4, color: day.c, weight: i === wtStep ? 4 : 2,
        fillColor: i === wtStep ? "#fff" : day.c, fillOpacity: 1 }).addTo(wtMap);
    });
    if (st.kind === "ride" && st.toLL) {
      L.polyline([st.ll, st.toLL], { color: day.c, weight: 4 }).addTo(wtMap);
      wtMap.fitBounds(L.latLngBounds([st.ll, st.toLL]).pad(0.35));
    } else {
      wtMap.setView(st.ll, 15);
    }
  }

  /* ---------- map ---------- */

  let map = null, layer = null;
  function drawMap() {
    const el = document.getElementById("map");
    if (!el) return;
    if (!window.L) {
      el.innerHTML = `<div class="mapfall"><p>${esc(ar() ? T("map-offline") : "The map needs a connection. Every stop still opens in Google Maps from the day page.")}</p></div>`;
      return;
    }
    if (mapDay === 0) return drawWholeTrip(el);
    const day = D.days.find((d) => d.n === (mapDay || (todayDay() || D.days[0]).n)) || D.days[0];
    const path = pathOf(day);
    const pts = [];
    path.seq.forEach((s) => {
      if (s.kind === "stop") { const p = place(s.place); if (p.lat) pts.push({ ll: [p.lat, p.lon], n: p.n, night: s.base, stop: s }); }
    });
    if (map) { map.remove(); map = null; }
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
      }).addTo(layer).bindPopup(`<b>${esc(p.n)}</b><br>${p.stop.base ? "Arrive " + esc(p.stop.arr) + " · overnight" : esc(p.stop.arr) + "–" + esc(p.stop.dep)}`);
    });
    // Sights of the day, so the map shows what there is to see, not just stations.
    path.seq.filter((s) => s.kind === "stop").forEach((s) => {
      (s.see || []).map((n) => sightOf(s.place, n)).filter((x) => x && x.lat).forEach((x) => {
        L.circleMarker([x.lat, x.lon], { radius: 5, color: day.c, weight: 2, fillColor: "#fff", fillOpacity: 1 })
          .addTo(layer).bindPopup(`<b>${esc(x.name)}</b><br>${esc(x.note)}`);
      });
    });
    if (pts.length) map.fitBounds(L.latLngBounds(pts.map((p) => p.ll)).pad(0.25));
    else map.setView([50.5, 11], 6);
  }

  /* The whole week at once: five coloured threads down the country, with the
     towns she sleeps in marked heavier than the ones she passes through. */
  function drawWholeTrip(el) {
    if (map) { map.remove(); map = null; }
    map = L.map(el, { scrollWheelZoom: false, attributionControl: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    layer = L.layerGroup().addTo(map);
    const bounds = [];
    D.days.forEach((d) => {
      const path = pathOf(d);
      const pts = [];
      path.seq.forEach((s) => {
        if (s.kind !== "stop") return;
        const p = place(s.place);
        if (p.lat == null) return;
        pts.push([p.lat, p.lon]);
        bounds.push([p.lat, p.lon]);
        L.circleMarker([p.lat, p.lon], {
          radius: s.base ? 7 : 4.5, color: d.c, weight: s.base ? 3.5 : 2,
          fillColor: s.base ? d.c : "#fff", fillOpacity: 1,
        }).addTo(layer).bindPopup(`<b>${esc(p.n)}</b><br>Day ${d.n}${s.base ? " · you sleep here" : ""}`);
      });
      if (pts.length > 1) L.polyline(pts, { color: d.c, weight: 4, opacity: .8 }).addTo(layer);
    });
    if (bounds.length) map.fitBounds(L.latLngBounds(bounds).pad(0.12));
    else map.setView([50.5, 11], 6);
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
          <span>${esc((r.lines || []).join(" · "))}${r.changes ? ` · ${r.changes} chg` : " · direct"}</span></div>`).join("")}</div>`;

    openSheetRaw(head + rows(uniq(baked).slice(0, 8), "From the plan. Checking the live timetable…") +
      `<div class="btns" style="padding:14px 0 0"><button class="btn ghost" data-close="1">${T("Close")}</button></div></div>`);

    if (!navigator.onLine || a.lat == null || b.lat == null) return;
    try {
      const from = new Date(new Date(when).getTime() - 45 * 60000).toISOString();
      const res = await motis("/plan", {
        fromPlace: [a.lat, a.lon].join(","), toPlace: [b.lat, b.lon].join(","),
        time: from, numItineraries: 9, transitModes: MODES, arriveBy: "false",
        maxPreTransitTime: 1200, pedestrianProfile: "FOOT",
      }, 16000);
      const cov = new Set(D.trip.ticket.modes);
      const live = (res.itineraries || []).map((it) => {
        const legs = (it.legs || []).filter((l) => l.mode && l.mode !== "WALK");
        if (!legs.length || !legs.every((l) => cov.has(l.mode))) return null;
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
          ? `Live from the timetable${shifted() ? " for the dates you are travelling" : ""} — about one every ${typical} minutes${typical > 70 ? ", so this is not one to miss" : ""}.`
          : `Live from the timetable${shifted() ? " for the dates you are travelling" : ""}.`) +
        `<div class="btns" style="padding:14px 0 0"><button class="btn ghost" data-close="1">${T("Close")}</button></div></div>`;
    } catch (e) { /* the plan's own list is already on screen */ }
  }

  /* ================= the tour ================= */
  /* For someone who has not used an app before, and who is about to rely on
     this one in a country whose language she does not read. It drives the app
     itself — switching screens, opening the thing it is describing — so she
     sees the real page underneath rather than a picture of it. */
  /* The tour's job is to teach the three buttons at the bottom, in order, and
     it is written against elements that are always on the screen it names —
     the old one pointed at a card that had scrolled away and left a hole over
     nothing. Each step says which screen it belongs on and waits for it. */
  const TOUR = [
    { view: "trip", at: null,
      title: "This is your whole week",
      body: "Mittenwald to Berlin, five days, already planned. There are three buttons along the bottom and nothing else to learn. I will show you each one." },
    { view: "trip", at: '.tabs', gap: 10,
      title: "Three buttons, in order",
      body: "One, two, three, left to right. One is your trip. Two is today. Three is for when something goes wrong. You will mostly live on button two." },
    { view: "trip", at: '.tab[data-tab="trip"]',
      title: "Button one — the itinerary",
      body: "You are on it now. This is where you choose the shape of the week, and it is the only screen you need before you leave home." },
    { view: "trip", at: "[data-preset]",
      title: "Pick a way across",
      body: "Four versions of the same week. Each says how many towns you stop in, how long you sit on trains, and what time you reach Berlin. If you are unsure, the first is the safe one." },
    { view: "trip", at: ".beds", scroll: true,
      title: "These are your hotels",
      body: "The towns you sleep in, written on every card. Book these and the week is fixed. Everything else can still change on the day." },
    { view: "trip", at: "#map", scroll: true,
      title: "And this is the shape of it",
      body: "The whole line down the country. Tap a day above the map to see just that day. The bigger dots are where you sleep." },
    { view: "day", at: '.tab[data-tab="day"]',
      title: "Button two — the day",
      body: "This is the screen for the morning: everything today, in the order it happens. It is the one you will open most." },
    { view: "day", at: ".days", scroll: true,
      title: "Move between days here",
      body: "Tap any day along the top. You do not have to go back anywhere to read tomorrow." },
    { view: "day", at: ".tl", scroll: true,
      title: "The day, in order",
      body: "Each town, what to walk to, how many minutes between them, and the trains in between. Tap a photograph to read about that place." },
    { view: "now", at: '.tab[data-tab="now"]',
      title: "Button three — guide me",
      body: "For when you are lost, late, or not sure what to do next. You do not need it on a good day." },
    { view: "now", at: ".seg", scroll: true,
      title: "It answers in two ways",
      body: "“What now” is one sentence: where you are and when to move. “Step by step” walks you through the rest of the day one move at a time, with Next and Back." },
    { view: "now", at: "[data-locate]", scroll: true,
      title: "It can find you",
      body: "Press this and the phone tells it where you are. It will say which town you are in and whether that is where the plan expects you." },
    { view: "now", at: "[data-trouble]", scroll: true,
      title: "If a train is missed",
      body: "Press one of these. It asks the railway what still runs and tells you honestly what you would have to give up — and it never gives up getting you to your bed." },
    { view: "trip", at: "#pulse",
      title: "This dot means the times are live",
      body: "Green: checked against the railway a minute ago, delays and all. Grey: no signal, so you are reading the plan. Tap it to ask again." },
    { view: "trip", at: "#morebtn",
      title: "And everything else is in here",
      body: "Language, light or dark, and this tour again whenever you want it. Nothing in there can break anything." },
    { view: "trip", at: null,
      title: "That is all of it",
      body: "Have a wonderful trip. All of this works without signal — only the live times need a connection." },
  ];

  let guideMode = store.get("guidemode", "now"); // "now" | "steps"
  let guideFix = null;   // where the phone says she is
  let guideAsked = false;

  let tourAt = -1;
  const tourEl = () => document.getElementById("tour");

  function startTour() {
    tourAt = 0;
    store.set("toured", 1);
    paintTour();
  }
  function endTour() {
    tourAt = -1;
    const el = tourEl();
    if (el) el.classList.remove("on");
    document.body.style.overflow = "";
  }
  function tourStep(delta) {
    const next = tourAt + delta;
    if (next < 0) return;
    if (next >= TOUR.length) return endTour();
    tourAt = next;
    paintTour();
  }

  function paintTour() {
    const el = tourEl();
    if (!el || tourAt < 0) return;
    const step = ar() && AR.tour[tourAt] ? { ...TOUR[tourAt], ...AR.tour[tourAt] } : TOUR[tourAt];

    // Put the app on the screen this step is about, and give it a trip to talk
    // about if she has not chosen one yet.
    // Give the tour something to point at: several steps describe parts of the
    // page that only exist once a trip is chosen.
    let needsPaint = false;
    if (!preset) { applyPreset((D.presets[0] || {}).id); needsPaint = true; }
    if (step.view && view !== step.view) {
      view = step.view;
      if (step.view === "now") guideMode = "now";
      needsPaint = true;
    }
    if (needsPaint) render();

    el.classList.add("on");
    document.body.style.overflow = "hidden";

    const cut = el.querySelector(".cut");
    const say = el.querySelector(".say");
    const target = step.at ? document.querySelector(step.at) : null;

    if (target && step.scroll !== false) {
      target.scrollIntoView({ block: "center", behavior: "auto" });
    }
    // Let the scroll settle before measuring, or the hole lands in the wrong place.
    setTimeout(() => {
      const r = target ? target.getBoundingClientRect() : null;
      const visible = r && r.height > 4 && r.width > 4 && r.bottom > 0 && r.top < innerHeight;
      if (visible) {
        const g = step.gap || 6;
        cut.className = "cut";
        cut.style.top = Math.max(4, r.top - g) + "px";
        cut.style.left = Math.max(4, r.left - g) + "px";
        cut.style.width = Math.min(innerWidth - 8, r.width + g * 2) + "px";
        cut.style.height = Math.min(innerHeight - 8, r.height + g * 2) + "px";
      } else {
        cut.className = "cut none";
        cut.style.top = "50%"; cut.style.left = "50%";
        cut.style.width = "0px"; cut.style.height = "0px";
      }

      say.innerHTML = `<div class="step">${T("Step")} ${tourAt + 1} ${T("of")} ${TOUR.length}</div>
        <h3>${esc(step.title)}</h3>
        <p>${esc(step.body)}</p>
        <div class="row">
          ${tourAt > 0 ? `<button class="btn ghost" data-tour="-1">${T("Back")}</button>` : ""}
          <button class="btn accent" data-tour="1">${tourAt === TOUR.length - 1 ? T("Done") : T("Next")}</button>
          <button class="skip" data-tour="end">${T("Skip")}</button>
        </div>
        <div class="dots">${TOUR.map((_, i) => `<i class="${i === tourAt ? "on" : ""}"></i>`).join("")}</div>`;

      // Sit the card clear of the thing it is pointing at.
      const h = say.offsetHeight || 240;
      const below = r && r.bottom + 16 + h < innerHeight - 10;
      const above = r && r.top - 16 - h > 10;
      let top = visible
        ? (below ? r.bottom + 14 : above ? r.top - h - 14 : (innerHeight - h) / 2)
        : (innerHeight - h) / 2;
      // Whatever the geometry says, the card has to be fully on the screen.
      top = Math.min(Math.max(12, top), Math.max(12, innerHeight - h - 12));
      say.style.top = top + "px";
    }, target ? 180 : 0);
  }

  /* ---------- overview ---------- */
  function overviewList() {
    return `<div class="label">${T("The whole week")}</div>
      <div class="routes">${D.days.map((d) => {
        const p = pathOf(d);
        return `<button class="route" data-goday="${d.n}">
          <span class="rn">${esc(dateShort(d.iso))} · ${esc(dayText(d).title)}</span>
          <span class="rw">${esc(pathText(d, p).name)} — ${esc(place(d.sleep.toLowerCase()).n || d.sleep)}</span>
          <span class="rs"><span class="tag">${p.stops} stop${p.stops === 1 ? "" : "s"}</span><span class="tag">${dur(p.ride) || "no"} riding</span></span>
        </button>`;
      }).join("")}</div>`;
  }

  /* The hotel list, which is the thing that has to be booked before anything
     else and is otherwise buried inside five days of timetable. */
  function bedsCard() {
    const p = presetOf(preset);
    if (!p) return "";
    return `<div class="label">${T("Where you sleep")}</div>
      <div class="card"><div class="pad">
        ${p.beds.map((b) => `<div class="kv"><b>${esc(place(b.place).n)}</b>
          <span>${b.nights} ${T(b.nights > 1 ? "nights" : "night")} ${T("from")} ${esc(dateShort(b.from))}${b.in ? ` · ${T("in about")} ${esc(b.in)}` : ""}</span></div>`).join("")}
        <div class="kv"><b>${esc(place("berlin").n)}</b><span>${T("from")} ${esc(dateShort(D.days[D.days.length - 1].iso))}</span></div>
      </div>
      ${offPreset() ? `<div class="note">${svg("info")}<span>You have changed a day since picking “${esc(p.name)}”, so a hotel town may have moved. Check the list above against your bookings.</span></div>` : ""}
      </div>`;
  }

  const footer = () => ar()
    ? `<div class="foot">الأوقات حقيقية — مأخوذة من جدول القطارات الألماني لتواريخك، ومقتصرة على ما تغطيه تذكرتك.
        قد تتغيّر الأرصفة في يومها، فألقي نظرة على اللوحة في المحطة.
        تذكرتك لا تغطي قطارات ICE أو IC أو EC؛ ولن يضعك هذا الدليل في أيٍّ منها أبداً.
        في حالة الطوارئ في أي مكان في أوروبا، اتصلي بـ <a href="tel:112">112</a>.
        الصور من ويكيميديا كومنز، وكل صورة منسوبة إلى مصوّرها في بطاقتها؛ الخرائط من OpenStreetMap.</div>`
    : `<div class="foot">Times are real — checked against the German timetable for your dates and filtered to what your ticket covers.
    Platforms can still change on the day, so glance at the board.
    Your ticket does not cover ICE, IC or EC; nothing here will put you on one.
    In an emergency anywhere in Europe, dial <a href="tel:112">112</a>.
    Photographs from Wikimedia Commons, each credited on its own card; maps © OpenStreetMap contributors.</div>`;

  /* ---------- sight sheet ---------- */
  const scrim = document.getElementById("scrim");
  const sheet = document.getElementById("sheet");

  function openSight(key) {
    const s = D.sights[key];
    if (!s) return;
    const p = place(s.place);
    const img = photo("sight:" + key);
    const done = !!ticked[key];
    const cred = s.photoFile && D.credits[s.photoFile];
    sheet.innerHTML = `<div class="grab"></div>
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
          <button class="btn ${done ? "ghost" : "accent"}" data-tick="${esc(key)}">${svg("tick")} ${done ? T("Seen it — undo") : T("Mark as seen")}</button>
          ${s.lat ? `<a class="btn ghost" href="${gdir(p.name || p.n, s.name + ", " + p.n, "walking")}" target="_blank" rel="noopener">${svg("walk")} ${T("Walk here from the station")}</a>` : ""}
          ${s.lat ? `<a class="btn ghost" href="${osmAt(s.lat, s.lon)}" target="_blank" rel="noopener">${svg("map")} ${T("Show on the map")}</a>` : ""}
          ${s.wiki ? `<a class="btn ghost" href="${esc(s.wiki)}" target="_blank" rel="noopener">${svg("info")} ${T("Read more")}</a>` : ""}
        </div>
        ${cred ? `<p class="credit">Photo: ${esc(cred.by)} · ${esc(cred.lic)} · via Wikimedia Commons</p>` : ""}
      </div>`;
    scrim.hidden = false; sheet.hidden = false;
    paintBack();
    requestAnimationFrame(() => { scrim.classList.add("on"); sheet.classList.add("on"); });
  }
  function closeSheet() {
    scrim.classList.remove("on"); sheet.classList.remove("on");
    setTimeout(() => { scrim.hidden = true; sheet.hidden = true; paintBack(); }, 260);
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
      const cov = new Set(D.trip.ticket.modes);
      for (const it of res.itineraries || []) {
        const legs = (it.legs || []).filter((l) => l.mode && l.mode !== "WALK");
        if (!legs.length || !legs.every((l) => cov.has(l.mode))) continue;
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
      const cov = new Set(D.trip.ticket.modes);
      const opts = (res.itineraries || [])
        .filter((it) => it.legs.filter((l) => l.mode !== "WALK").every((l) => cov.has(l.mode)))
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
            <p class="about" style="font-size:14px">Board at ${esc(L2[0].from.name)}${L2[0].from.track ? ", platform " + esc(L2[0].from.track) : ""}.</p>
          </div></div>`;
        }).join("")}
        <div class="btns" style="padding-left:0;padding-right:0"><button class="btn ghost" data-close="1">${T("Close")}</button></div></div>`;
    } catch (e) {
      sheet.querySelector(".about").textContent = "Could not reach the timetable. Ask at the ticket desk — your ticket is still valid on the next regional train.";
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
    const arriveLine = anchorLast
      ? `You would be in Berlin at <b>${esc(r.arrives)}</b> on the 3rd.`
      : `You would be in ${esc(r.dest.n)} at <b>${esc(r.arrives)}</b> tonight.`;

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
            <span>${esc(place(l.to).n)}${l.final ? " · your bed" : ""}</span></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:9px">
            ${c.lines.map((x) => `<span class="line" style="min-width:0;font-size:13.5px;padding:5px 9px">${esc(x)}</span>`).join("")}
          </div>
          <p class="about" style="font-size:14px;margin-top:8px">Board at ${esc(c.board)}${c.track ? `, platform ${esc(c.track)}` : ""}. ${c.changes ? c.changes + " change" + (c.changes > 1 ? "s" : "") : "Straight through"}.</p>
        </div></div>`;
      }).join("")}

      ${r.keep.length ? `<p class="about">You still get ${esc(r.keep.map((s) => place(s.place).n).join(", "))}.</p>` : ""}
      ${!anchorLast ? `<p class="about">Berlin by the end of the 3rd is unaffected — that is a later day.</p>`
        : r.drop.length ? `<p class="about">This still gets you to Berlin today, which is the one thing that has to happen.</p>` : ""}

      <div class="btns" style="padding-left:0;padding-right:0">
        <button class="btn ghost" data-close="1">${T("Close")}</button>
      </div></div>`);
  }

  function openSheetRaw(html) {
    sheet.innerHTML = html;
    scrim.hidden = false; sheet.hidden = false;
    requestAnimationFrame(() => { scrim.classList.add("on"); sheet.classList.add("on"); });
  }

  /* Moving the whole plan onto the dates she is actually travelling. The
     offsets are the ones people really need — a day either way, or a week —
     plus whatever date she types. */
  /* Everything that is a setting rather than a destination, behind the one
     button in the corner. Replaying the tour lives here too, because the first
     thing anyone asks after a tour is how to see it again. */
  function showSettings() {
    const themeNow = document.documentElement.getAttribute("data-theme") || T("Match my phone");
    openSheetRaw(`<div class="grab"></div><div class="sbody">
      <h2>${T("Settings")}</h2>
      <div class="btns" style="padding:14px 0 0">
        <button class="btn ghost" id="langbtn2">${ar() ? "Switch to English" : "التبديل إلى العربية"}</button>
        <button class="btn ghost" id="themebtn">${svg("moon")} ${T("Light or dark")}</button>
        <button class="btn accent" id="starttour">${svg("help")} ${T("Show me how this works")}</button>
      </div>
      <p class="about" style="margin-top:16px">${T("settings-note")}</p>
      <div class="btns" style="padding:8px 0 0"><button class="btn ghost" data-close="1">${T("Close")}</button></div>
    </div>`);
    const lb = document.getElementById("langbtn2");
    if (lb) lb.addEventListener("click", () => { closeSheet(); setLang(ar() ? "en" : "ar"); });
  }

  function showDates() {
    const cur = startIso, planned = planStart;
    const opts = [-7, -2, -1, 0, 1, 2, 7].map((k) => {
      const iso = new Date(Date.parse(planned + "T12:00:00Z") + k * DAY_MS).toISOString().slice(0, 10);
      return { iso, k };
    });
    openSheetRaw(`<div class="grab"></div><div class="sbody">
      <h2>${T("When are you actually going?")}</h2>
      <p class="about">The plan was built for ${esc(fmtDate(planned))}. Move it and every day moves with it —
        and the live times are then looked up for the dates you are really there.</p>
      <div class="routes" style="margin-top:14px">
        ${opts.map((o) => `<button class="route" data-setstart="${o.iso}" aria-pressed="${o.iso === cur}">
          <span class="rn">${esc(fmtWeekday(o.iso))} ${esc(fmtDate(o.iso))}</span>
          <span class="rw">${o.k === 0 ? "As planned" : o.k > 0 ? `${o.k} day${o.k > 1 ? "s" : ""} later` : `${-o.k} day${o.k < -1 ? "s" : ""} earlier`}
            — in Berlin ${esc(fmtDate(new Date(Date.parse(o.iso + "T12:00:00Z") + (D.days.length - 1) * DAY_MS).toISOString().slice(0, 10)))}</span>
        </button>`).join("")}
      </div>
      <div class="pad" style="padding:16px 0 0">
        <label style="font-size:14px;color:var(--soft-ink)">Or pick the day you arrive in Mittenwald
          <input type="date" id="startpick" value="${esc(cur)}"
            style="display:block;margin-top:8px;width:100%;min-height:48px;padding:0 12px;border-radius:13px;border:1.5px solid var(--line);background:var(--card);color:var(--ink);font:inherit"></label>
      </div>
      <div class="btns" style="padding-left:0;padding-right:0">
        <button class="btn ghost" data-close="1">${T("Close")}</button>
      </div></div>`);
    const inp = document.getElementById("startpick");
    if (inp) inp.addEventListener("change", () => {
      if (!inp.value) return;
      setStart(inp.value); closeSheet(); render(); refreshLive(true);
    });
  }

  /* Said once, near the top, whenever the dates have been moved — so a time on
     screen is never silently about a different day than the one she is in. */
  function shiftNote() {
    if (!shifted()) return "";
    const k = shiftDays();
    return note("calm", `These dates are moved ${Math.abs(k)} day${Math.abs(k) > 1 ? "s" : ""} ${k > 0 ? "later" : "earlier"} than the plan was built for. Times are being checked live against the dates you are actually travelling.`);
  }

  function troubleCard() {
    if (!todayDay()) return "";
    return `<div class="label">${T("If the day stops going to plan")}</div>
      <div class="card"><div class="pad" style="padding-bottom:4px">
        <p class="lead" style="margin:0">${T("Tell me what happened and I will work out the rest of the day from the real timetable — and say what has to give.")}</p></div>
        <div class="btns"><button class="btn ghost" data-trouble="missed">${svg("warn")} ${T("I missed my train")}</button>
        <button class="btn ghost" data-trouble="stay60">${svg("now")} ${T("I want another hour here")}</button>
        <button class="btn ghost" data-trouble="stay120">${svg("now")} ${T("Another two hours")}</button></div>
      </div>`;
  }

  /* ---------- events ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("#morebtn,[data-guide],[data-locate],[data-tour],#starttour,#pulse,[data-freq],[data-setstart],[data-tab],[data-goday],[data-route],[data-sight],[data-tick],[data-mapday],[data-replan],[data-close],[data-wt],[data-wtday],[data-startwalk],[data-trouble],[data-preset],#scrim,#themebtn,#refresh");
    if (!t) return;
    if (t.id === "scrim" || t.dataset.close) return closeSheet();
    if (t.id === "morebtn") return showSettings();
    if (t.dataset.setstart) { setStart(t.dataset.setstart); closeSheet(); render(); refreshLive(true); return; }
    if (t.dataset.tour) {
      return t.dataset.tour === "end" ? endTour() : tourStep(+t.dataset.tour);
    }
    if (t.id === "starttour") return startTour();
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
    if (t.dataset.tab) { push(); view = t.dataset.tab; window.scrollTo(0, 0); return render(); }
    if (t.dataset.guide) {
      guideMode = t.dataset.guide; store.set("guidemode", guideMode);
      if (guideMode === "steps") { const d = todayDay(); wtDay = d ? d.n : (wtDay || D.days[0].n); }
      return render();
    }
    if (t.dataset.locate) return locate();
    if (t.dataset.goday) { push(); view = "day"; openDay = +t.dataset.goday; window.scrollTo(0, 0); return render(); }
    if (t.dataset.mapday != null) { mapDay = +t.dataset.mapday; return render(); }
    if (t.dataset.wt) { if (+t.dataset.wt > 0) push(); return wtGo(+t.dataset.wt); }
    if (t.dataset.wtday) { push(); wtDay = +t.dataset.wtday; wtStep = 0; window.scrollTo(0, 0); return render(); }
    if (t.dataset.startwalk) {
      push();
      const d = todayDay(); wtDay = d ? d.n : D.days[0].n; wtStep = 0;
      view = "now"; guideMode = "steps"; store.set("guidemode", "steps");
      window.scrollTo(0, 0); return render();
    }
    if (t.dataset.route) {
      const [n, id] = t.dataset.route.split(":");
      chosen[n] = id; store.set("routes", chosen);
      if (+n === wtDay) wtStep = 0;
      liveGen++; liveState = { at: 0, status: navigator.onLine ? "idle" : "off" };
      liveCache = {}; store.set("live", {});
      render(); refreshLive(true);
      return;
    }
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
    if (t.dataset.preset) {
      applyPreset(t.dataset.preset);
      wtStep = 0;
      if (view === "choose") { view = "now"; navStack.length = 0; }
      window.scrollTo(0, 0);
      render(); refreshLive(true);
      return;
    }
  });
  document.addEventListener("keydown", (e) => {
    if (tourAt >= 0) {
      if (e.key === "Escape") return endTour();
      if (e.key === "ArrowRight" || e.key === "Enter") return tourStep(1);
      if (e.key === "ArrowLeft") return tourStep(-1);
      return;
    }
    if (e.key === "Escape") return goBack();
    if (view === "walk" && sheet.hidden) {
      if (e.key === "ArrowRight") { push(); wtGo(1); }
      if (e.key === "ArrowLeft") wtGo(-1);
    }
  });
  // Android's back gesture and the browser's back button land here too.
  window.history.replaceState({ mb: 0 }, "");
  window.addEventListener("popstate", () => { window.history.pushState({ mb: 1 }, ""); goBack(); });
  window.history.pushState({ mb: 1 }, "");
  window.addEventListener("online", () => { online = true; refreshLive(true); });
  window.addEventListener("offline", () => { online = false; liveState.status = "off"; paintPulse(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { render(); refreshLive(); } });

  /* ---------- go ---------- */
  const savedTheme = store.get("theme", "");
  if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);
  paintDates();

  if (!["trip", "day", "now"].includes(view)) view = "trip";
  applyLang();
  render();
  refreshLive();
  // First time anyone opens this, walk them through it rather than hoping.
  if (!store.get("toured", 0)) setTimeout(startTour, 500);
  // The countdown is the whole point of the front page, so it ticks.
  setInterval(() => { if (view === "now" && !document.hidden) render(); }, 30000);
  setInterval(() => { if (!document.hidden) refreshLive(); }, 90000);
})();
