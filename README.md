# Mittenwald to Berlin

A one-file trip planner for one traveller: five days of regional trains across
Germany, 29 September to 3 October 2026, built so that the person carrying it
never has to work anything out.

Open `out/mittenwald-to-berlin.html`. That is the whole product — one file, no
server, no install. It works with no signal, and gets better when there is one.

## What it does

**Asks two questions, then gets out of the way.** Which way across the country
— four itineraries drawn on one map in four colours, each naming the towns you
sleep in so the hotels can be booked — and which day it starts. After that
there is no navigation at all: the app is the day, and the strip along the top
moves between days. There is no tour, because there is nothing left to explain.

**Five lines, not five ways of spending the same day.** The classic run through
Augsburg, Nuremberg and Erfurt; the Romantic Road, which turns north-west for
Rothenburg and sleeps in Würzburg; the Harz, which gets the northward ride done
early to buy a day for Wernigerode and a night inside Quedlinburg; the west,
which leaves the south–north road entirely for Ulm, Esslingen and a night under
Heidelberg castle; and two nights in Mittenwald with the Zugspitze between them.
They sleep in different towns, so the choice is the one that has to be made
before leaving home. A day's options are filtered to the ones that start where
the night before ended — you are never offered a train out of a town you are
not in.

**Says where there is time to eat.** Lunch and dinner are placed where there is
genuinely room for them — the part of the day with the longest overlap with the
hour people eat in — and appear in the timeline with the town, the minutes, and
somewhere to look. When the answer is a train, it says so and says to buy
something before boarding, which is the useful version of the same fact.

**Uses the real timetable.** Every one of the 40 journeys across 16 route
options was planned against the German timetable for the actual dates, through
[Transitous](https://transitous.org) — MOTIS over the official DELFI/DB feeds
with GTFS-Realtime. Real line numbers, real platforms, real changes, real
durations.

**Cannot put her on a train she has no ticket for.** The ticket covers regional
services only. Every query is filtered to those modes and every returned
itinerary is checked again before it is accepted, at build time and live — and
the mode filter alone is not enough, because the Brocken steam railway comes
back from the feed as `REGIONAL_RAIL` and is a private line with its own fares.
It routed itself into the Harz day once; it is now refused by name. Changes
under four minutes are refused too, except onto something that runs every few
minutes anyway.

**Tracks delays while she travels.** Every 90 seconds it re-checks the next
three moves and shows only what has changed: a delay, a platform change, a
connection that realtime has eaten into. If a train is cancelled or badly late,
"Find me another way" plans from her actual GPS position to that night's hotel,
still regional-only — and "I missed my train" rebuilds the rest of the day from
the real timetable, saying honestly what has to be given up and never giving up
the bed.

**Walks each town in order.** Every stop carries the route through it with a
running clock — arrive here, twelve minutes to there, forty minutes inside, back
to the station by — routed for real against pedestrian and transit directions,
with a thumbnail of each place beside it. Where the router has no path at all,
the page says roughly how long getting there takes rather than pretending it is
a walk up the Zugspitze.

**Shows real photographs.** Every sight and town carries a real photo from
Wikimedia Commons, with the photographer and licence recorded and shown. German
town articles lead with a coat of arms rather than a photograph, so lead images
are checked and a Commons photo search is used instead where needed.

**Works on a train in the Alps.** All 229 photographs are re-encoded as small
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

Only `bundle.mjs` is needed after a change to `src/`.

The checks:

```
node scripts/test-flow.mjs       # the two questions, then the day, every line
node scripts/test-fixes2.mjs     # scroll, drawers, images
node scripts/test-live.mjs       # delays, platform changes, cancellations
```

`data/trip.mjs` is the only file written by hand: the days, the route options,
the sights, and what is worth saying about each. Everything else is derived, and
every script reports loudly when something does not resolve rather than quietly
inventing it.

## Three things worth knowing

**Heidelberg fits as a line of its own and not as a detour, which took two
measurements to learn.** Hung off the normal route it is hopeless — 4 h 49 out
from Augsburg and 10 h 27 back to Berlin, paid twice because nothing on the
return is new. Given its own week it works, because the way back east through
Würzburg is all new ground: Augsburg → Ulm 1 h 21 direct, Ulm → Esslingen 1 h 04
direct, Esslingen → Heidelberg 1 h 48, Heidelberg → Würzburg 2 h 29, Würzburg →
Erfurt 2 h 31. That is 16 h 38 over the week, the heaviest of the five, and it
is the price of the only line that leaves the south–north road.

Esslingen is there because Stuttgart is not worth a stop and Esslingen is: it
costs 1 h 04 from Ulm against 1 h 16 to Stuttgart, and Webergasse has the oldest
standing timber houses in Germany. The Harz turned out to be nearer Berlin than
Thuringia is — Quedlinburg to Berlin is 3 h 44 against Erfurt's 4 h 46.
`scripts/build-plan.mjs` prints every leg it chooses, and every number here came
off that output.

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
