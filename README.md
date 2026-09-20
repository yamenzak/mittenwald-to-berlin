# Mittenwald to Berlin

A one-file trip planner for one traveller: five days of regional trains across
Germany, 29 September to 3 October 2026, built so that the person carrying it
never has to work anything out.

Open `out/mittenwald-to-berlin.html`. That is the whole product — one file, no
server, no install. It works with no signal, and gets better when there is one.

## What it does

**One trip, one screen.** Mittenwald to Berlin, 29 September to 3 October,
eighteen towns, fixed. There is nothing to choose before you start and nothing
to set up: it opens on the day you are in, and the strip along the top moves
between days. Two of the five days offer a real alternative — Seefeld or the
lakes on the first, four stops or one on the last — and those are the only
decisions in the app.

**Uses the real timetable.** Every journey was planned against the German
timetable for the actual dates, through [Transitous](https://transitous.org) —
MOTIS over the official DELFI/DB feeds with GTFS-Realtime. Real line numbers,
real platforms, real changes, real durations. The build prints every leg it
chose, and the plan is rewritten from what actually runs rather than from what
was typed.

**Cannot put her on a train she has no ticket for.** The ticket covers regional
services only. Every query is filtered to those modes and every returned
itinerary is checked again before it is accepted, at build time and live — and
the mode filter alone is not enough, because the Brocken steam railway comes
back from the feed as `REGIONAL_RAIL` and is a private line with its own fares.
It is refused by name. Changes under four minutes are refused too, except onto
something that runs every few minutes anyway.

**Tracks delays while she travels.** Every 90 seconds it re-checks the next
three moves and shows only what has changed: a delay, a platform change, a
connection realtime has eaten into. If a train is cancelled or badly late,
"Find me another way" plans from her actual GPS position to that night's hotel,
still regional-only — and "I missed my train" rebuilds the rest of the day from
the real timetable, saying honestly what has to be given up and never giving up
the bed.

**Walks each town in order.** Every stop carries the route through it with a
running clock — arrive here, twelve minutes to there, forty minutes inside, back
to the station by — routed for real against pedestrian and transit directions,
with a thumbnail of each place beside it.

**Says where there is time to eat.** Lunch and dinner are placed where there is
genuinely room for them, and appear in the timeline with the town, the minutes,
and somewhere to look. When the answer is a train, it says so and says to buy
something before boarding.

**Shows real photographs.** Every sight and town carries a real photo from
Wikimedia Commons, with the photographer and licence recorded and shown. German
town articles lead with a coat of arms rather than a photograph, so lead images
are checked and a Commons photo search is used instead where needed.

**Works on a train in the Alps.** All 275 photographs are re-encoded as small
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

**Heidelberg works as a line of its own and not as a detour, which took two
measurements to learn.** Hung off the normal south–north road it is hopeless —
4 h 49 out from Augsburg and 10 h 27 back to Berlin, paid twice because nothing
on the return is new. Given its own week it works, because the way back east
through Würzburg is all new ground: Augsburg → Ulm 1 h 21 direct, Ulm →
Esslingen 1 h 04 direct, Esslingen → Heidelberg 1 h 48, Heidelberg → Würzburg
2 h 29, Würzburg → Erfurt 2 h 31.

**More stops made the week shorter, not longer.** Breaking the last day into
four — Weimar, Naumburg, Halle, Wittenberg — rides 3 h 44, where going Erfurt to
Berlin with one stop rides 4 h 39: the direct routing takes a slower path than
the string of regional hops does. Bamberg is the same trick: Würzburg → Bamberg
→ Erfurt is 2 h 14 against 2 h 32 direct, so the town is free and then some.
Murnau costs nothing at all, being a stop on the train already being ridden. The
week went from eleven towns and 16 h 38 to eighteen towns and 16 h 12.

**Some trains stop running before the day does.** The fast RE29 from Bamberg to
Erfurt takes 1 h 12; after about seven in the evening the same journey is 2 h 58
with two changes, and later still it is four and a half hours. A day that looks
fine on paper can lose two hours to leaving a town twenty minutes late, so day
four is pulled forward to catch that train. `scripts/build-plan.mjs` prints
every leg it chose and every alternative it rejected, and every number here came
off that output.

## Sources

Timetables and live data from Deutsche Bahn via Transitous. Photographs and
descriptions from Wikipedia and Wikimedia Commons, each credited in the page.
Places and map tiles from OpenStreetMap.
