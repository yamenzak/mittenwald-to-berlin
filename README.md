# Abu Dhabi to Berlin

A one-file trip planner for two travellers: nine days by train from Milan to
Berlin by way of Liguria, the Dolomites, Bavaria, Salzburg and Alsace,
26 September to 4 October 2026. Built so that nobody has to work anything out
on a platform.

Open `out/mittenwald-to-berlin.html` — that is the whole product. One file, no
server, no install. It works with no signal and gets better when there is one.
(The filename is the repository's, and the repository is older than the trip.)

## What it does

**One trip, one scroll.** Nine days end to end on a single page, newest idea
first: the day strip at the top jumps, it does not switch. There is nothing to
choose before you start and nothing to set up.

**Uses the real timetable.** Every journey was planned against the live
European timetable for the actual dates, through
[Transitous](https://transitous.org) — open GTFS from Italy, Austria, Germany
and France, with the same real-time feeds the operators publish. Nothing on
screen is a guess at when a train runs.

**Knows what each leg costs.** Four countries means four tickets and no single
pass that covers them. Three trains are already booked and say so, with their
seats; everything else is listed once at the top — what to buy before leaving,
and what to buy on the day — and again on the day it is used.

**Says what there is to see.** 190 sights across 25 towns, each with a real
photograph from Wikimedia Commons, a real description, and real coordinates.
Each stop is turned into a walk in the order you would actually do it, measured
with pedestrian routing, fitted to the minutes the trains leave you.

**Warns rather than pretends.** Private operators that look like regional
trains but sell their own seats (Westbahn, the Harz narrow-gauge) are refused
by name. Connections under four minutes are refused. A sight whose coordinates
are missing or a hundred kilometres wrong fails the build instead of quietly
vanishing from the page.

## Building it

    node scripts/build-sights.mjs    # Wikipedia + Commons: photos, notes, coordinates
    node scripts/build-stops.mjs     # one station per town, pinned by hand
    node scripts/build-plan.mjs      # the real trains, and the walk through each town
    node scripts/build-images.mjs    # fetch, re-encode to WebP, inline as data URIs
    node scripts/bundle.mjs          # one HTML file

`data/trip.mjs` is the only file written by hand. Everything else is derived
from it, and the build refuses to finish quietly when something does not add up.
