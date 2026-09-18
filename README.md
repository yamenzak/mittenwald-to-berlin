# Mittenwald to Berlin

A one-file trip planner for one traveller: seven days of regional trains across
Germany, 29 September to 5 October 2026, built so that the person carrying it
never has to work anything out.

Open `out/mittenwald-to-berlin.html`. That is the whole product — one file, no
server, no install. It works with no signal, and gets better when there is one.

## What it does

**Answers "what now?" first.** The front page is a single sentence and a single
number: where she is, what the next train is, and how long until she should set
off. The countdown allows for the walk to the station and eight minutes of
slack, and it turns amber and then red as the time goes.

**Uses the real timetable.** Every one of the 40 journeys across 16 route
options was planned against the German timetable for the actual dates, through
[Transitous](https://transitous.org) — MOTIS over the official DELFI/DB feeds
with GTFS-Realtime. Real line numbers, real platforms, real changes, real
durations.

**Cannot put her on a train she has no ticket for.** The ticket covers regional
services only. Every query is filtered to those modes and every returned
itinerary is checked again before it is accepted, at build time and live.

**Tracks delays while she travels.** Every 90 seconds it re-checks the next
three moves and shows only what has changed: a delay, a platform change, a
connection that realtime has eaten into. If a train is cancelled or badly late,
"Find me another way" plans from her actual GPS position to that night's hotel,
still regional-only.

**Suggests what to do with the time she has.** 155 sights across 24 towns, each
ranked against the minutes actually left in that town, whether it is open on
that weekday, and whether it is a thing to do after dark. A museum is not
offered at nine at night; a beer garden is.

**Shows real photographs.** Every sight and town carries a real photo from
Wikimedia Commons, with the photographer and licence recorded and shown. German
town articles lead with a coat of arms rather than a photograph, so lead images
are checked and a Commons photo search is used instead where needed.

**Works on a train in the Alps.** All 180 photographs are re-encoded as small
WebP and inlined, so the page is complete the moment it loads and stays complete
with no signal. The live layer only ever refines what is already readable.

## Building it

```
npm install
node scripts/build-sights.mjs    # photos, coordinates, licences from Wikipedia/Commons
node scripts/build-stops.mjs     # station coordinates
node scripts/build-plan.mjs      # every journey against the real timetable
node scripts/build-images.mjs    # download, resize, inline
node scripts/bundle.mjs          # one file into out/
```

`data/trip.mjs` is the only file written by hand: the days, the route options,
the sights, and what is worth saying about each. Everything else is derived, and
every script reports loudly when something does not resolve rather than quietly
inventing it.

## Two things worth knowing

**Stations are resolved by position, not by name.** Asking the geocoder for
"Oberammergau Bahnhof" returns a stop in Bern, and "Eisenach" returns
Eisenstadt in Austria. For smaller towns the stop index only surfaces bus stops
at all. So stations are pinned as coordinates and the planner is asked to route
from a point, which is what it is good at.

**The day is chained, not copied.** The times in `data/trip.mjs` are a wish —
"about two hours in Oberammergau, then on to Murnau". Each day is walked in
order and every move is planned from the moment she is genuinely free to leave.
Where the line is two-hourly, it will cut a stop twenty-five minutes short
rather than have her arrive somewhere at ten at night.

## Sources

Timetables and live data from Deutsche Bahn via Transitous. Photographs and
descriptions from Wikipedia and Wikimedia Commons, each credited in the page.
Places and map tiles from OpenStreetMap.
