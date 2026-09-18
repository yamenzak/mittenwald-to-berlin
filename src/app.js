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
  let chosen = store.get("routes", {});
  let ticked = store.get("ticked", {});
  let liveCache = store.get("live", {});

  /* ---------- time ---------- */
  // A ?at= in the address lets the day be previewed before it happens. It is
  // also the only way to test a Tuesday morning in Mittenwald on a Friday.
  const qs = new URLSearchParams(location.search);
  const fake = qs.get("at") ? new Date(qs.get("at")) : null;
  const now = () => (fake ? new Date(fake.getTime() + (Date.now() - boot)) : new Date());
  const boot = Date.now();

  const hhmm = (d) => new Date(d).toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  const dayKey = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: TZ });
  const weekday = (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
  const dateShort = (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const mins = (a, b) => Math.round((new Date(b) - new Date(a)) / 60000);
  const dur = (m) => (m == null ? "" : (m >= 60 ? Math.floor(m / 60) + " h" : "") + (m % 60 ? (m >= 60 ? " " : "") + (m % 60) + " min" : (m >= 60 ? "" : "0 min")));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- helpers ---------- */
  const place = (k) => D.places[k] || { n: k };
  const pathOf = (day) => day.paths.find((p) => p.id === chosen[day.n]) || day.paths[0];
  const sightOf = (pk, name) => D.sights[pk + "/" + name] || null;
  const photo = (key) => IMG[key] || null;
  const todayDay = () => D.days.find((d) => d.iso === dayKey(now()));
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

  const KIND = { church: "Church", museum: "Museum", palace: "Palace", view: "Viewpoint", nature: "Outdoors", street: "Streets", square: "Square", food: "Food", shop: "Shops", sight: "Sight" };

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

  /* Look up one move and return only what differs from the plan. */
  async function checkMove(m) {
    const res = await motis("/plan", {
      fromPlace: m.fromLL.join(","), toPlace: m.toLL.join(","),
      time: m.depIso, numItineraries: 4, transitModes: MODES, arriveBy: "false",
      maxPreTransitTime: 1200, pedestrianProfile: "FOOT",
    });
    const want = m.legs[0];
    let hit = null;
    for (const it of res.itineraries || []) {
      const first = (it.legs || []).find((l) => l.mode && l.mode !== "WALK");
      if (!first) continue;
      const sameTime = first.scheduledStartTime === want.depIso;
      const sameLine = (first.routeShortName || "").replace(/\s*\(\d+\)\s*$/, "") === want.line;
      if (sameTime || (sameLine && Math.abs(mins(want.depIso, first.scheduledStartTime || first.startTime)) < 6)) { hit = it; break; }
    }
    if (!hit) return { id: moveId(m), at: Date.now(), unknown: true };

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
    const day = todayDay();
    if (!day) return [];
    const t = now();
    return pathOf(day).seq
      .filter((s) => s.kind === "move" && !s.missing && s.depIso)
      .filter((s) => new Date(s.arrIso) > new Date(t.getTime() - 60 * 60000))
      .slice(0, 3);
  }

  let refreshing = false;
  async function refreshLive(force) {
    if (refreshing) return;
    const targets = liveTargets();
    if (!targets.length) { liveState.status = "none"; paintPulse(); return; }
    if (!navigator.onLine) { liveState.status = "off"; paintPulse(); return; }
    refreshing = true; liveState.status = "checking"; paintPulse();
    let ok = 0;
    for (const m of targets) {
      const id = moveId(m), had = liveCache[id];
      if (!force && had && Date.now() - had.at < 60000) { ok++; continue; }
      try { liveCache[id] = await checkMove(m); ok++; }
      catch (e) { /* keep whatever we had; the plan still stands */ }
    }
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
  let view = "now";
  let openDay = null;
  const app = document.getElementById("app");

  function render() {
    if (view === "now") app.innerHTML = viewNow();
    else if (view === "day") app.innerHTML = viewDay(openDay || (todayDay() || D.days[0]).n);
    else if (view === "map") app.innerHTML = viewMap();
    else viewHelp();
    document.querySelectorAll(".tab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === view)));
    if (view === "map") drawMap();
    paintPulse();
  }

  /* ---------- now ---------- */
  function viewNow() {
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
        <div class="btns"><button class="btn" data-goday="${d.n}">See day 1</button></div>
        </div>
        ${overviewList()}
        ${footer()}</div>`;
    }
    if (s.kind === "after") {
      return `<div class="wrap">${heroCard(s.day, "The trip", "You made it")}
        <div class="card pad"><p class="lead">Seven days, twenty-four towns. Everything is still here if you want to look back at it.</p></div>
        ${overviewList()}${footer()}</div>`;
    }

    const { day, path, at, riding, nextMove } = s;
    const t = now();
    let head = "", count = "", strip = "";

    if (riding) {
      const l = liveFor(riding);
      const left = mins(t, realArr(riding));
      head = `<div class="what">On the train</div>
        <div class="big">${esc(place(riding.to).n)}</div>
        <p class="why">Arriving ${hhmm(realArr(riding))}${l && l.arrDelay > 2 ? ` — ${l.arrDelay} min late` : ""}.</p>`;
      count = pill(left, "until you arrive", left < 6 ? "now" : "go");
      strip = legStrip(riding, l);
    } else if (nextMove) {
      const go = leaveBy(nextMove, at);
      const toGo = mins(t, go);
      const l = liveFor(nextMove);
      head = `<div class="what">${at ? "You are in " + esc(place(at.place).n) : "Next"}</div>
        <div class="big">${toGo > 0 ? "Next train at " + hhmm(realDep(nextMove)) : "Head for the station"}</div>
        <p class="why">${esc(place(nextMove.to).n)}, arriving ${hhmm(realArr(nextMove))}.${at && at.stn ? " " + esc(at.stn) : ""}</p>`;
      count = toGo > 0
        ? pill(toGo, "until you should set off", toGo > 45 ? "go" : toGo > 12 ? "soon" : "now")
        : pill(Math.max(0, mins(t, realDep(nextMove))), "until it leaves", "now");
      strip = legStrip(nextMove, l);
    } else if (at) {
      head = `<div class="what">Tonight</div>
        <div class="big">${esc(place(at.place).n)}</div>
        <p class="why">No more trains today. ${esc(day.intro)}</p>`;
      count = "";
      strip = "";
    }

    const alerts = liveAlerts(nextMove || riding);
    const suggest = at && !riding ? suggestions(at, nextMove) : "";

    return `<div class="wrap">
      ${heroCard(day, `Day ${day.n} · ${weekday(day.iso)} ${dateShort(day.iso)}`, day.title)}
      <div class="card">
        <div class="headline">${head}${count}</div>
        ${strip}
        <div class="btns two">
          ${nextMove ? `<a class="btn accent" href="${gdir("my location", (at && place(at.place).name) || nextMove.fromStop, "walking")}" target="_blank" rel="noopener">${svg("walk")} Walk me to the station</a>` : ""}
          <button class="btn ghost" data-goday="${day.n}">The whole day</button>
        </div>
      </div>
      ${alerts}
      ${day.holiday ? note("warn", day.holiday) : ""}
      ${suggest}
      ${footer()}</div>`;
  }

  const pill = (m, label, tone) =>
    `<div class="countdown ${tone}"><span class="n">${m <= 0 ? "now" : m < 60 ? m : Math.floor(m / 60) + "h" + String(m % 60).padStart(2, "0")}</span><span class="u">${m > 0 && m < 60 ? "minutes " : ""}${esc(label)}</span></div>`;

  function legStrip(m, l) {
    const f = m.legs[0];
    const late = l && l.depDelay > 2;
    return `<div class="train">
      <span class="line${m.bus || f.mode === "BUS" ? " bus" : ""}">${esc(f.line)}</span>
      <span class="mid">
        <span class="t">${late ? `<s>${esc(f.dep)}</s><em>${hhmm(l.realDep)}</em>` : esc(f.dep)} → ${esc(m.arr)}</span>
        <span class="d">towards ${esc(towards(f, m.to))}${m.changes ? ` · ${m.changes} change${m.changes > 1 ? "s" : ""}` : " · direct"}</span>
      </span>
      ${(l && l.track) || f.track ? `<span class="plat${l && l.trackChanged ? " changed" : ""}"><b>${esc((l && l.track) || f.track)}</b><span>${l && l.trackChanged ? "new plat" : "platform"}</span></span>` : ""}
    </div>`;
  }

  function liveAlerts(m) {
    if (!m) return "";
    const l = liveFor(m);
    if (!l) return liveState.status === "off"
      ? note("calm", "You are offline, so these are the planned times. They were right when the page was built.")
      : "";
    const out = [];
    if (l.cancelled) out.push(note("bad", `This train is cancelled. Tap "Find me another way" below — it will only suggest trains your ticket covers.`));
    else if (l.depDelay >= 5) out.push(note("warn", `Running ${l.depDelay} minutes late. It now leaves at ${hhmm(l.realDep)} and gets in at ${hhmm(l.realArr)}.`));
    if (l.trackChanged) out.push(note("warn", `Platform changed to ${l.track}. Check the board when you get there.`));
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
  const ticketNote = () => note("calm", D.trip.ticket.excluded);

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
    const head = until < 45
      ? `You have about ${until} minutes. These are close.`
      : `You have ${dur(until)} here. Worth doing now:`;

    return `<div class="label">Right now in ${esc(place(stop.place).n)}</div>
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
      <span class="sm">${esc(KIND[s.kind] || "Sight")} · ${s.mins} min</span></span>
    </button>`;
  }

  /* ---------- a day ---------- */
  function viewDay(n) {
    const day = D.days.find((d) => d.n === n) || D.days[0];
    const path = pathOf(day);
    const isToday = day.iso === dayKey(now());

    const routes = `<div class="label">${day.paths.length === 1 ? "The plan" : "Choose how to spend it"}</div>
      <div class="routes">${day.paths.map((p) => `
        <button class="route" data-route="${day.n}:${p.id}" aria-pressed="${p.id === path.id}">
          <span class="rn">${esc(p.name)}</span>
          <span class="rw">${esc(p.why)}</span>
          <span class="rs">
            <span class="tag${p.stops > 2 ? " hot" : ""}">${p.stops} stop${p.stops === 1 ? "" : "s"}</span>
            <span class="tag">${dur(p.ride) || "no"} on trains</span>
            <span class="tag">in by ${esc(p.endArr)}</span>
          </span>
        </button>`).join("")}</div>`;

    const body = path.seq.map((s, i) => s.kind === "stop" ? stopBlock(day, s, i, isToday) : moveBlock(day, s, isToday)).join("");

    return `<div class="wrap">
      ${heroCard(day, `Day ${day.n} · ${weekday(day.iso)} ${dateShort(day.iso)}`, day.title)}
      <div class="card pad"><p class="lead" style="margin:0">${esc(day.intro)}</p></div>
      ${day.holiday ? note("warn", day.holiday) : ""}
      ${day.bags ? note("calm", "You change hotel today — the bags come with you. Most stations have lockers if you want to drop them before wandering.") : ""}
      ${routes}
      <div class="label">The day, in order</div>
      <div class="tl">${body}</div>
      ${footer()}</div>`;
  }

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
            <span class="when">${s.base ? "Arrive " + esc(s.arr) + " · you sleep here" : esc(s.arr) + " – " + esc(s.dep)}</span></span>
          ${s.free ? `<span class="free"><b>${dur(s.free)}</b><span>here</span></span>` : ""}
        </div>
        ${s.stn ? `<p class="walknote">${esc(s.stn)}</p>` : ""}
        ${sights.length ? `<div class="rail">${sights.map((x) => sightCard(s.place, x)).join("")}</div>` : ""}
        <div class="mfoot">
          <a class="chip" href="${gmaps(p.name || p.n)}" target="_blank" rel="noopener">${svg("pin")} Station</a>
          <a class="chip" href="${gmaps(p.n + ", " + (p.country === "AT" ? "Austria" : "Germany"))}" target="_blank" rel="noopener">${svg("map")} The town</a>
          ${day.bags && !s.base && s.free ? `<a class="chip" href="${gmaps("Gepäckschließfächer " + (p.name || p.n))}" target="_blank" rel="noopener">Luggage lockers</a>` : ""}
        </div>
      </div></div>`;
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
          <span class="leg"><span class="lt">${esc(leg.dep)} → ${esc(leg.arr)}</span>
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

  /* ---------- map ---------- */
  function viewMap() {
    const day = D.days.find((d) => d.n === (openDay || (todayDay() || D.days[0]).n)) || D.days[0];
    return `<div class="wrap">
      <div class="days">${D.days.map((d) => `<button class="dchip${d.iso === dayKey(now()) ? " today" : ""}" data-mapday="${d.n}" aria-pressed="${d.n === day.n}">Day ${d.n}<small>${dateShort(d.iso)}</small></button>`).join("")}</div>
      <div class="card" style="margin-top:2px"><div id="map"></div>
        <div class="pad"><h3>${esc(day.title)}</h3><p class="lead">${esc(pathOf(day).name)} · ${pathOf(day).stops} stop${pathOf(day).stops === 1 ? "" : "s"} · ${dur(pathOf(day).ride) || "no"} on trains</p></div></div>
      <div class="foot">Map tiles and place data © OpenStreetMap contributors.</div></div>`;
  }

  let map = null, layer = null;
  function drawMap() {
    const day = D.days.find((d) => d.n === (openDay || (todayDay() || D.days[0]).n)) || D.days[0];
    const el = document.getElementById("map");
    if (!el) return;
    if (!window.L) {
      el.innerHTML = `<div class="mapfall"><p>The map needs a connection. Every stop still opens in Google Maps from the day page.</p></div>`;
      return;
    }
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

  /* ---------- help ---------- */
  function viewHelp() {
    const credits = Object.entries(D.credits || {}).slice(0, 400);
    app.innerHTML = `<div class="wrap">
      <div class="label" style="margin-top:18px">If something goes wrong</div>
      <a class="big-call" href="tel:112"><b>112</b><span>Emergency — police, ambulance, fire. Works anywhere in Europe, free, from any phone.</span></a>
      <a class="big-call" style="background:var(--hair)" href="tel:+4930297010"><b>+49 30 2970 1055</b><span>Deutsche Bahn customer service, in English.</span></a>
      <div class="card pad">
        <div class="kv"><b>Your ticket</b><span>${esc(D.trip.ticket.name)}</span></div>
        <div class="kv"><b>Covers</b><span>Regional trains (RB, RE, IRE), S-Bahn, U-Bahn, trams and buses</span></div>
        <div class="kv"><b>Does not cover</b><span>ICE, IC and EC. This page never plans one.</span></div>
        <div class="kv"><b>Austria</b><span>The Mittenwald–Seefeld hop is Austrian. Buy that short ticket at the machine.</span></div>
      </div>
      <div class="label">Words that help</div>
      <div class="card pad">
        ${[["Which platform for…?", "Welches Gleis nach …?"], ["Is this train going to…?", "Fährt dieser Zug nach …?"], ["The train is late", "Der Zug hat Verspätung"], ["I have missed my connection", "Ich habe meinen Anschluss verpasst"], ["Where is the station?", "Wo ist der Bahnhof?"], ["Can you help me, please?", "Können Sie mir bitte helfen?"], ["I don't speak German", "Ich spreche kein Deutsch"]]
          .map(([a, b]) => `<div class="kv"><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join("")}
      </div>
      <div class="label">Reading a German platform</div>
      <div class="card pad"><p class="lead" style="margin:0">
        <b>Gleis</b> is the platform. <b>Abfahrt</b> is departures, <b>Ankunft</b> arrivals.
        <b>Heute ca. 10 Minuten später</b> means about ten minutes late.
        <b>Gleiswechsel</b> means the platform has changed — this page tells you that too, when it can reach the timetable.
        <b>Fällt aus</b> means cancelled.</p></div>
      <div class="label">How this page knows things</div>
      <div class="card pad"><p class="lead" style="margin:0">
        Train times, platforms and delays come from <a href="https://transitous.org" target="_blank" rel="noopener">Transitous</a>,
        which runs on Deutsche Bahn's own published timetable and live feed. Every journey was checked against
        what actually runs on your dates, and filtered so it only ever suggests trains your ticket covers.
        Photographs and descriptions come from Wikipedia and Wikimedia Commons; places and the map from OpenStreetMap.
        With no signal, everything you see is the plan as built — the times were right when it was made.</p></div>
      <div class="label">Photographs</div>
      <div class="card pad" style="max-height:340px;overflow:auto">
        ${credits.map(([f, c]) => `<div class="kv" style="font-size:13px"><b style="font-weight:500">${esc(f)}</b><span>${esc(c.by)} · ${esc(c.lic)}</span></div>`).join("")}
      </div>
      <div class="foot">Made for one traveller. Times from Deutsche Bahn via Transitous, pictures from Wikimedia Commons,
        maps © OpenStreetMap contributors.</div></div>`;
  }

  /* ---------- overview ---------- */
  function overviewList() {
    return `<div class="label">The whole week</div>
      <div class="routes">${D.days.map((d) => {
        const p = pathOf(d);
        return `<button class="route" data-goday="${d.n}">
          <span class="rn">${esc(dateShort(d.iso))} · ${esc(d.title)}</span>
          <span class="rw">${esc(p.name)} — sleep in ${esc(d.sleep)}</span>
          <span class="rs"><span class="tag">${p.stops} stop${p.stops === 1 ? "" : "s"}</span><span class="tag">${dur(p.ride) || "no"} riding</span></span>
        </button>`;
      }).join("")}</div>`;
  }

  const footer = () => `<div class="foot">Times are real — checked against the German timetable for your dates and filtered to what your ticket covers.
    Platforms can still change on the day, so glance at the board. Pictures from Wikimedia Commons.</div>`;

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
        <div class="btns" style="padding-left:0;padding-right:0"><button class="btn ghost" data-close="1">Close</button></div></div>`;
    } catch (e) {
      sheet.querySelector(".about").textContent = "Could not reach the timetable. Ask at the ticket desk — your ticket is still valid on the next regional train.";
    }
  }

  /* ---------- events ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-tab],[data-goday],[data-route],[data-sight],[data-tick],[data-mapday],[data-replan],[data-close],#scrim,#themebtn,#refresh");
    if (!t) return;
    if (t.id === "scrim" || t.dataset.close) return closeSheet();
    if (t.id === "themebtn") {
      const cur = document.documentElement.getAttribute("data-theme");
      const next = cur === "dark" ? "light" : cur === "light" ? "" : "dark";
      if (next) document.documentElement.setAttribute("data-theme", next);
      else document.documentElement.removeAttribute("data-theme");
      store.set("theme", next);
      return;
    }
    if (t.id === "refresh") return refreshLive(true);
    if (t.dataset.tab) { view = t.dataset.tab; window.scrollTo(0, 0); return render(); }
    if (t.dataset.goday) { view = "day"; openDay = +t.dataset.goday; window.scrollTo(0, 0); return render(); }
    if (t.dataset.mapday) { openDay = +t.dataset.mapday; return render(); }
    if (t.dataset.route) {
      const [n, id] = t.dataset.route.split(":");
      chosen[n] = id; store.set("routes", chosen);
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
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });
  window.addEventListener("online", () => { online = true; refreshLive(true); });
  window.addEventListener("offline", () => { online = false; liveState.status = "off"; paintPulse(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { render(); refreshLive(); } });

  /* ---------- go ---------- */
  const savedTheme = store.get("theme", "");
  if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);
  document.getElementById("trip-dates").textContent =
    dateShort(D.days[0].iso) + " – " + dateShort(D.days[D.days.length - 1].iso) + " · " + D.days.length + " days";

  render();
  refreshLive();
  // The countdown is the whole point of the front page, so it ticks.
  setInterval(() => { if (view === "now" && !document.hidden) render(); }, 30000);
  setInterval(() => { if (!document.hidden) refreshLive(); }, 90000);
})();
