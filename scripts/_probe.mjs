/* Measuring the nine-day line. Four countries, so every mode is on the table —
   the point is to find out what each day actually costs before drawing it. */
const API = "https://api.transitous.org/api/v1";
const H = { headers: { "User-Agent": "MittenwaldToBerlin/1.0 (family trip page)" } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ALL = "HIGHSPEED_RAIL,LONG_DISTANCE,NIGHT_RAIL,COACH,REGIONAL_FAST_RAIL,REGIONAL_RAIL,METRO,SUBWAY,TRAM,BUS,FERRY";

export const P = {
  mxp:         [45.63060,  8.72810, "Malpensa Aeroporto T1"],
  milan:       [45.48620,  9.20500, "Milano Centrale"],
  genoa:       [44.41700,  8.92000, "Genova Piazza Principe"],
  smargherita: [44.33450,  9.20930, "S. Margherita Ligure-Portofino"],
  portofino:   [44.30320,  9.20970, "Portofino"],
  verona:      [45.42880, 10.98200, "Verona Porta Nuova"],
  bolzano:     [46.49500, 11.35600, "Bolzano/Bozen"],
  ortisei:     [46.57600, 11.67200, "Ortisei/St. Ulrich"],
  scristina:   [46.55900, 11.72000, "Santa Cristina Valgardena"],
  innsbruck:   [47.26320, 11.40100, "Innsbruck Hbf"],
  mittenwald:  [47.44000, 11.26550, "Bahnhof Mittenwald"],
  garmisch:    [47.49200, 11.09800, "Garmisch-Partenkirchen"],
  ettal:       [47.56950, 11.09490, "Ettal, Kloster"],
  munich:      [48.14020, 11.56000, "München Hbf"],
  rosenheim:   [47.85000, 12.12000, "Rosenheim"],
  freilassing: [47.83700, 12.97900, "Freilassing"],
  berchtes:    [47.62900, 13.00000, "Berchtesgaden Hbf"],
  konigssee:   [47.58700, 12.98800, "Königssee"],
  salzburg:    [47.81300, 13.04600, "Salzburg Hbf"],
  lindau:      [47.54500,  9.68100, "Lindau-Insel"],
  freiburg:    [47.99700,  7.84100, "Freiburg Hbf"],
  kehl:        [48.57500,  7.81400, "Kehl Bahnhof"],
  strasbourg:  [48.58500,  7.73400, "Strasbourg Gare"],
  colmar:      [48.07300,  7.34600, "Colmar"],
  heidelberg:  [49.40400,  8.67500, "Heidelberg Hbf"],
  nuremberg:   [49.44600, 11.08200, "Nürnberg Hbf"],
  berlin:      [52.52500, 13.36900, "Berlin Hbf"],
};

async function plan(a, b, time, modes = ALL) {
  const q = new URLSearchParams({
    fromPlace: `${P[a][0]},${P[a][1]}`, toPlace: `${P[b][0]},${P[b][1]}`,
    time, numItineraries: "6", transitModes: modes, arriveBy: "false",
    maxPreTransitTime: "2700", pedestrianProfile: "FOOT",
  });
  for (let i = 0; i < 5; i++) {
    const r = await fetch(`${API}/plan?${q}`, H);
    if (r.status === 429 || r.status >= 500) { await sleep(2000 * (i + 1)); continue; }
    if (!r.ok) return { error: `${r.status}` };
    return r.json();
  }
  return { error: "gave up" };
}

const hhmm = (s) => new Date(s).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
const dur = (s) => `${Math.floor(s / 3600)}h${String(Math.round((s % 3600) / 60)).padStart(2, "0")}`;
const FAST = new Set(["HIGHSPEED_RAIL", "LONG_DISTANCE", "NIGHT_RAIL"]);

for (const [a, b, time, label] of JSON.parse(process.argv[2])) {
  const res = await plan(a, b, time); await sleep(400);
  const tag = label || `${a} → ${b}`;
  if (res.error) { console.log(`${tag}: ERROR ${res.error}`); continue; }
  const its = (res.itineraries || []).slice(0, 3);
  if (!its.length) { console.log(`${tag}  NONE`); continue; }
  console.log(`\n${tag}   (from ${time.slice(11, 16)})`);
  for (const it of its) {
    const L = it.legs.filter((l) => l.mode !== "WALK");
    const fast = L.some((l) => FAST.has(l.mode));
    console.log(`   ${hhmm(it.startTime)}–${hhmm(it.endTime)}  ${dur(it.duration).padEnd(6)} ${L.length - 1}chg  ${fast ? "FAST" : "reg "}  ` +
      L.map((l) => l.routeShortName || l.mode).join(" · "));
  }
}
