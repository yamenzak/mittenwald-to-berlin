/* Source of truth for the trip.
   Sight entries carry a German Wikipedia title (`w`) used to pull a real photo,
   a real description and real coordinates at build time. Anything whose title
   does not resolve is reported by scripts/build-sights.mjs and fixed here —
   nothing in the built page is invented. */

export const TRIP = {
  title: "Mittenwald to Berlin",
  start: "2026-09-29",
  end: "2026-10-03",
  tz: "Europe/Berlin",
  // What the ticket covers. Used to filter every journey query.
  ticket: {
    name: "Deutschland-Ticket (regional)",
    modes: ["REGIONAL_RAIL", "REGIONAL_FAST_RAIL", "METRO", "SUBWAY", "TRAM", "BUS"],
    excluded: "ICE, IC and EC trains are not covered. The plan never puts you on one.",
  },
};

/* Places. `q` is what we hand the journey planner to resolve a stop id.
   `w` is the German Wikipedia article for the town hero image. */
export const PLACES = {
  mittenwald:   { n: "Mittenwald",      q: "Mittenwald Bahnhof",                 w: "Mittenwald",                    stn: "Bahnhof Mittenwald",            country: "DE" },
  seefeld:      { n: "Seefeld",         q: "Seefeld in Tirol Bahnhof",           w: "Seefeld in Tirol",              stn: "Bahnhof Seefeld in Tirol",      country: "AT" },
  garmisch:     { n: "Garmisch",        q: "Garmisch-Partenkirchen Bahnhof",     w: "Garmisch-Partenkirchen",        stn: "Bahnhof Garmisch-Partenkirchen", country: "DE" },
  oberau:       { n: "Oberau",          q: "Oberau (Oberbayern) Bahnhof",        w: "Oberau",                                   stn: "Bahnhof Oberau",                country: "DE", pass: 1 },
  ettal:        { n: "Ettal",           q: "Ettal Kloster",                      w: "Kloster Ettal",                 stn: "Bushaltestelle Kloster Ettal",  country: "DE" },
  oberammergau: { n: "Oberammergau",    q: "Oberammergau Bahnhof",               w: "Oberammergau",                  stn: "Bahnhof Oberammergau",          country: "DE" },
  murnau:       { n: "Murnau",          q: "Murnau am Staffelsee Bahnhof",       w: "Murnau am Staffelsee",          stn: "Bahnhof Murnau",                country: "DE" },
  fussen:       { n: "Füssen",          q: "Füssen Bahnhof",                     w: "Füssen",                        stn: "Bahnhof Füssen",                country: "DE" },
  munich:       { n: "Munich",          q: "München Hauptbahnhof",               w: "München",                       stn: "München Hauptbahnhof",          country: "DE" },
  augsburg:     { n: "Augsburg",        q: "Augsburg Hauptbahnhof",              w: "Augsburg",                      stn: "Augsburg Hauptbahnhof",         country: "DE" },
  landsberg:    { n: "Landsberg",       q: "Landsberg am Lech Bahnhof",          w: "Landsberg am Lech",             stn: "Bahnhof Landsberg am Lech",     country: "DE" },
  donauworth:   { n: "Donauwörth",      q: "Donauwörth Bahnhof",                 w: "Donauwörth",                    stn: "Bahnhof Donauwörth",            country: "DE" },
  nuremberg:    { n: "Nuremberg",       q: "Nürnberg Hauptbahnhof",              w: "Nürnberg",                      stn: "Nürnberg Hauptbahnhof",         country: "DE" },
  bamberg:      { n: "Bamberg",         q: "Bamberg Bahnhof",                    w: "Bamberg",                       stn: "Bahnhof Bamberg",               country: "DE" },
  rothenburg:   { n: "Rothenburg",      q: "Rothenburg ob der Tauber Bahnhof",   w: "Rothenburg ob der Tauber",      stn: "Bahnhof Rothenburg ob der Tauber", country: "DE" },
  wurzburg:     { n: "Würzburg",        q: "Würzburg Hauptbahnhof",              w: "Würzburg",                      stn: "Würzburg Hauptbahnhof",         country: "DE" },
  heidelberg:   { n: "Heidelberg",      q: "Heidelberg Hauptbahnhof",            w: "Heidelberg",                    stn: "Heidelberg Hauptbahnhof",       country: "DE" },
  ulm:          { n: "Ulm",             q: "Ulm Hauptbahnhof",                   w: "Ulm",                           stn: "Ulm Hauptbahnhof",              country: "DE" },
  esslingen:    { n: "Esslingen",       q: "Esslingen (Neckar) Bahnhof",         w: "Esslingen am Neckar",           stn: "Bahnhof Esslingen (Neckar)",    country: "DE" },
  fulda:        { n: "Fulda",           q: "Fulda Bahnhof",                      w: "Fulda",                         stn: "Bahnhof Fulda",                 country: "DE" },
  eisenach:     { n: "Eisenach",        q: "Eisenach Bahnhof",                   w: "Eisenach",                      stn: "Bahnhof Eisenach",              country: "DE" },
  erfurt:       { n: "Erfurt",          q: "Erfurt Hauptbahnhof",                w: "Erfurt",                        stn: "Erfurt Hauptbahnhof",           country: "DE" },
  weimar:       { n: "Weimar",          q: "Weimar Bahnhof",                     w: "Weimar",                        stn: "Bahnhof Weimar",                country: "DE" },
  naumburg:     { n: "Naumburg",        q: "Naumburg (Saale) Hauptbahnhof",      w: "Naumburg (Saale)",              stn: "Naumburg (Saale) Hauptbahnhof", country: "DE" },
  quedlinburg:  { n: "Quedlinburg",     q: "Quedlinburg Bahnhof",                w: "Quedlinburg",                   stn: "Bahnhof Quedlinburg",           country: "DE" },
  wernigerode:  { n: "Wernigerode",     q: "Wernigerode Hauptbahnhof",           w: "Wernigerode",                   stn: "Wernigerode Hauptbahnhof",      country: "DE" },
  thale:        { n: "Thale",           q: "Thale Hauptbahnhof",                 w: "Thale",                         stn: "Thale Hauptbahnhof",            country: "DE" },
  halberstadt:  { n: "Halberstadt",     q: "Halberstadt Bahnhof",                w: "Halberstadt",                   stn: "Bahnhof Halberstadt",           country: "DE" },
  magdeburg:    { n: "Magdeburg",       q: "Magdeburg Hauptbahnhof",             w: "Magdeburg",                     stn: "Magdeburg Hauptbahnhof",        country: "DE" },
  berlin:       { n: "Berlin",          q: "Berlin Hauptbahnhof",                w: "Berlin",                        stn: "Berlin Hauptbahnhof",           country: "DE" },
  friedberg:    { n: "Friedberg",       q: "Friedberg (Bayern) Bahnhof",         w: "Friedberg (Bayern)",            stn: "Bahnhof Friedberg (Bayern)",    country: "DE" },
  jena:         { n: "Jena",            q: "Jena Paradies",                      w: "Jena",                          stn: "Bahnhof Jena Paradies",         country: "DE" },
  saalfeld:     { n: "Saalfeld",        q: "Saalfeld (Saale) Bahnhof",           w: "Saalfeld/Saale",                stn: "Bahnhof Saalfeld (Saale)",      country: "DE" },
};

/* Sights, by place. Each: [display name, German Wikipedia title, note, opts]
   opts: mins = typical visit in minutes, kind, ticket = needs a paid ticket,
   indoor = good in rain, closed = weekday numbers it is shut (0=Sun).
   `kind` drives the icon and the "what's good right now" suggestions. */
const S = (name, w, note, o = {}) => ({ name, w, note, mins: 30, kind: "sight", ...o });

export const SIGHTS = {
  mittenwald: [
    S("Ballenhausgasse", "Mittenwald", "The lane behind Obermarkt, quieter and just as painted.", { mins: 15, kind: "street" }),
    S("Kalvarienberg", "Mittenwald", "Stations of the Cross up a wooded hill, 25 min for the valley view.", { cimg: "Kalvarienberg Mittenwald", mins: 60, kind: "view" }),
    S("Obermarkt", "Mittenwald", "The painted main street — Lüftlmalerei on nearly every facade.", { must: 1, mins: 40, kind: "street" }),
    S("St Peter and Paul", "St. Peter und Paul (Mittenwald)", "Baroque church with a painted tower you can see from the whole valley.", { must: 1, mins: 20, kind: "church", indoor: 1 }),
    S("Violin Making Museum", "Geigenbaumuseum Mittenwald", "Mittenwald has made violins since 1684. Small, and genuinely lovely.", { mins: 45, kind: "museum", indoor: 1, ticket: 1, closed: [1] }),
    S("Lautersee", "Lautersee", "Mountain lake above the town. About 1 h up through the forest.", { mins: 120, kind: "nature", walkFromStation: 55 }),
    S("Ferchensee", "Ferchensee", "The quieter second lake, 30 min further on from Lautersee.", { mins: 90, kind: "nature" }),
    S("Karwendel cable car", "Karwendelbahn (Seilbahn)", "Up to 2244 m. A viewing platform over the whole range.", { cimg: "Karwendelbahn Mittenwald", mins: 150, kind: "view", ticket: 1 }),
    S("Leutaschklamm", "Leutaschklamm", "Gorge walkway on steel catwalks over the water. 4 km from town.", { mins: 90, kind: "nature", ticket: 1 }),
    S("Isar source valley", "Isar", "The Isar starts here and runs north to Munich.", { mins: 60, kind: "nature" }),
  ],
  seefeld: [
    S("Seefeld centre", "Seefeld in Tirol", "Tyrolean pedestrian streets, cafés, mountain air.", { must: 1, mins: 60, kind: "street" }),
    S("Wildsee", "Wildsee (Seefeld)", "Lake walk at the southern edge of the centre, flat and easy.", { must: 1, mins: 50, kind: "nature" }),
    S("Pfarrkirche St Oswald", "Pfarr- und Wallfahrtskirche Seefeld in Tirol", "Late-Gothic church, the reason pilgrims came here.", { mins: 20, kind: "church", indoor: 1 }),
    S("Seekirchl", "Seekirche (Seefeld)", "The little round white chapel on the meadow — Seefeld's postcard.", { mins: 20, kind: "church" }),
  ],
  garmisch: [
    S("Mohrenplatz", "Partenkirchen", "The small square at the top of Ludwigstraße.", { cimg: "Mohrenplatz Garmisch-Partenkirchen", mins: 15, kind: "square" }),
    S("Kurpark Garmisch", "Garmisch-Partenkirchen", "Bandstand, flowerbeds and the Wetterstein behind them.", { cimg: "Kurpark Garmisch-Partenkirchen", mins: 30, kind: "nature" }),
    S("Ludwigstraße", "Partenkirchen", "Partenkirchen's old painted street. Prettier than the Garmisch half.", { must: 1, mins: 45, kind: "street" }),
    S("Old St Martin", "Alte Pfarrkirche St. Martin (Garmisch-Partenkirchen)", "Medieval frescoes inside, including a giant St Christopher.", { must: 1, mins: 20, kind: "church", indoor: 1 }),
    S("Partnachklamm", "Partnachklamm", "Gorge cut 80 m deep. Walkway through the spray. 20 min walk to the entrance.", { mins: 120, kind: "nature", ticket: 1 }),
    S("Zugspitze", "Zugspitze", "Germany's highest point, 2962 m. Cog railway plus cable car. Half a day.", { must: 1, mins: 300, kind: "view", ticket: 1 }),
    S("Olympic ski stadium", "Olympiaschanze", "The 1936 jump. You can walk up to the top of the tower.", { mins: 40, kind: "view" }),
    S("Eibsee", "Eibsee", "Turquoise lake under the Zugspitze. A flat 7 km loop.", { mins: 150, kind: "nature" }),
  ],
  ettal: [
    S("Ettal Abbey church", "Kloster Ettal", "Benedictine abbey from 1330. The dome fresco is the thing to look up at.", { must: 1, mins: 40, kind: "church", indoor: 1 }),
    S("Abbey shop and distillery", "Kloster Ettal", "The monks' liqueur, beer and cheese, sold at the gate.", { mins: 15, kind: "food", indoor: 1 }),
    S("Schloss Linderhof", "Schloss Linderhof", "Ludwig II's small palace with the golden bedroom. Bus from Ettal.", { mins: 150, kind: "palace", ticket: 1 }),
  ],
  oberammergau: [
    S("Dorfstraße", "Oberammergau", "The main street, painted end to end.", { cimg: "Dorfstraße Oberammergau", mins: 30, kind: "street" }),
    S("Ammer riverside", "Ammer", "Five minutes from the centre, with the Kofel above it.", { cimg: "Ammer Oberammergau", mins: 30, kind: "nature" }),
    S("Pilatushaus", "Pilatushaus", "The most famous painted facade in Bavaria — painted architecture that isn't there.", { must: 1, cimg: "Pilatushaus Oberammergau", mins: 25, kind: "street" }),
    S("Passion Play Theatre", "Passionsspiele Oberammergau", "The village has staged the Passion every ten years since 1634.", { must: 1, mins: 30, kind: "museum", indoor: 1 }),
    S("Woodcarving workshops", "Oberammergau", "Along Dorfstraße. Carvers still work in the windows.", { mins: 40, kind: "shop", indoor: 1 }),
    S("Ettaler Straße houses", "Lüftlmalerei", "Hansel and Gretel and Little Red Riding Hood, painted across whole walls.", { must: 1, mins: 25, kind: "street" }),
    S("Pfarrkirche St Peter und Paul", "St. Peter und Paul (Oberammergau)", "Rococo interior, considered one of the finest village churches in Bavaria.", { mins: 20, kind: "church", indoor: 1 }),
    S("Laber cable car", "Laber (Berg)", "Ten minutes up for the view back over the painted village.", { mins: 90, kind: "view", ticket: 1 }),
  ],
  murnau: [
    S("Ramsachkircherl", "Murnauer Moos", "A tiny church alone in the moor, 30 min out on the flat.", { cimg: "Ramsachkircherl", mins: 75, kind: "nature" }),
    S("Obermarkt", "Murnau am Staffelsee", "A colourful main street the Blaue Reiter painters put on canvas.", { must: 1, mins: 30, kind: "street" }),
    S("Münter House", "Münter-Haus", "Where Kandinsky and Gabriele Münter lived and painted. Still furnished.", { must: 1, mins: 50, kind: "museum", indoor: 1, ticket: 1, closed: [1] }),
    S("Staffelsee", "Staffelsee", "Lake with seven islands, 20 min walk from the centre.", { mins: 90, kind: "nature" }),
    S("Murnauer Moos", "Murnauer Moos", "The largest intact moor in central Europe. Boardwalk trails.", { mins: 120, kind: "nature" }),
    S("Schlossmuseum Murnau", "Schlossmuseum Murnau", "Blaue Reiter paintings in the old castle.", { mins: 50, kind: "museum", indoor: 1, ticket: 1, closed: [1] }),
  ],
  fussen: [
    S("Neuschwanstein", "Schloss Neuschwanstein", "Ludwig II's castle. Interior needs a timed ticket booked ahead.", { must: 1, mins: 180, kind: "palace", ticket: 1 }),
    S("Marienbrücke", "Marienbrücke (Neuschwanstein)", "The bridge over the gorge with the castle view everyone knows.", { must: 1, mins: 40, kind: "view" }),
    S("Hohenschwangau", "Schloss Hohenschwangau", "The yellow castle below — where Ludwig actually grew up.", { mins: 90, kind: "palace", ticket: 1 }),
    S("Hohes Schloss", "Hohes Schloss Füssen", "Painted castle courtyard — trompe-l'œil windows on flat walls.", { mins: 45, kind: "palace" }),
    S("Füssen old town", "Füssen", "Lanes of pastel houses right beside the station.", { mins: 50, kind: "street" }),
    S("Lechfall", "Lechfall", "Waterfall and gorge, 10 min from the centre.", { mins: 30, kind: "nature" }),
    S("St Mang's Abbey", "Kloster St. Mang", "Baroque abbey on the river with a painted Hall of Princes.", { mins: 45, kind: "church", indoor: 1 }),
  ],
  munich: [
    S("Odeonsplatz", "Odeonsplatz", "The Feldherrnhalle and the yellow Theatinerkirche.", { mins: 25, kind: "square" }),
    S("Theatinerkirche", "Theatinerkirche (München)", "Butter-yellow outside, all white stucco inside.", { mins: 25, kind: "church", indoor: 1 }),
    S("Karlsplatz and Neuhauser Straße", "Stachus", "The shopping street that runs from the station to Marienplatz.", { mins: 30, kind: "street" }),
    S("Michaelskirche", "Michaelskirche (München)", "Renaissance church on the way in; Ludwig II is buried in the crypt.", { mins: 25, kind: "church", indoor: 1 }),
    S("Alter Hof", "Alter Hof", "The Wittelsbachs' first castle, a quiet courtyard most people walk past.", { mins: 20, kind: "palace" }),
    S("Marienplatz", "Marienplatz", "The heart of the city. Glockenspiel at 11:00 and 12:00.", { must: 1, mins: 40, kind: "square" }),
    S("St Peter's tower", "Alter Peter", "306 steps. The best view in Munich, straight down onto Marienplatz.", { must: 1, mins: 45, kind: "view", ticket: 1 }),
    S("Viktualienmarkt", "Viktualienmarkt", "Open-air food market since 1807. Lunch here.", { must: 1, mins: 60, kind: "food" }),
    S("Frauenkirche", "Frauenkirche (München)", "The two onion domes on the skyline. Free to enter.", { must: 1, mins: 25, kind: "church", indoor: 1 }),
    S("Residenz", "Münchner Residenz", "The Wittelsbach palace. The Antiquarium hall alone is worth it.", { mins: 120, kind: "palace", indoor: 1, ticket: 1 }),
    S("Hofgarten", "Hofgarten (München)", "Quiet formal garden behind the Residenz.", { mins: 30, kind: "nature" }),
    S("English Garden", "Englischer Garten", "Bigger than Central Park. Surfers on the Eisbach at the south end.", { must: 1, mins: 120, kind: "nature" }),
    S("Chinesischer Turm", "Chinesischer Turm (München)", "Beer garden under a wooden pagoda, in the middle of the park.", { mins: 60, kind: "food" }),
    S("Hofbräuhaus", "Hofbräuhaus am Platzl", "The famous beer hall. Loud, touristy, still fun once.", { mins: 60, kind: "food", indoor: 1 }),
    S("Asamkirche", "Asamkirche (München)", "A tiny baroque church squeezed between shops. Astonishing inside.", { mins: 20, kind: "church", indoor: 1 }),
    S("Nymphenburg Palace", "Schloss Nymphenburg", "Summer palace and park, 20 min by tram.", { mins: 150, kind: "palace", ticket: 1 }),
    S("Deutsches Museum", "Deutsches Museum", "The largest science and technology museum in the world.", { mins: 180, kind: "museum", indoor: 1, ticket: 1 }),
    S("Oktoberfest", "Oktoberfest", "On the Theresienwiese. In 2026 it runs to 4 October — expect big crowds.", { mins: 180, kind: "food" }),
  ],
  augsburg: [
    S("Perlachturm", "Perlachturm", "70 m of tower beside the town hall. On a clear day you can see the Alps.", { mins: 40, kind: "view", ticket: 1 }),
    S("Augustusbrunnen", "Augustusbrunnen", "The bronze fountain in front of the town hall.", { mins: 10, kind: "square" }),
    S("Maximilianmuseum", "Maximilianmuseum", "The city's own museum, in two merchants' houses.", { mins: 60, kind: "museum", indoor: 1, ticket: 1, closed: [1] }),
    S("Mozarthaus", "Leopold-Mozart-Haus Augsburg", "Leopold Mozart was born here; Wolfgang visited.", { mins: 45, kind: "museum", indoor: 1, ticket: 1, closed: [1] }),
    S("Rathausplatz", "Rathausplatz (Augsburg)", "Renaissance town hall and the Perlachturm above it.", { must: 1, mins: 40, kind: "square" }),
    S("Golden Hall", "Rathaus (Augsburg)", "Inside the town hall. Gold leaf across the whole ceiling.", { must: 1, cimg: "Goldener Saal Augsburg Rathaus", mins: 30, kind: "palace", indoor: 1, ticket: 1 }),
    S("Fuggerei", "Fuggerei", "Social housing founded in 1521. Rent is still 0.88 € a year. People live here.", { must: 1, mins: 60, kind: "museum", ticket: 1 }),
    S("Maximilianstraße", "Maximilianstraße (Augsburg)", "The grand street, with the Hercules and Mercury fountains.", { must: 1, mins: 40, kind: "street" }),
    S("Augsburg Cathedral", "Augsburger Dom", "Has some of the oldest stained glass in the world, around 1100.", { must: 1, mins: 35, kind: "church", indoor: 1 }),
    S("Lechviertel canals", "Lechviertel", "The old craftsmen's quarter, threaded with water channels.", { mins: 45, kind: "street" }),
    S("St Ulrich and St Afra", "St. Ulrich und Afra (Augsburg)", "Two churches, Catholic and Protestant, sharing one building.", { mins: 30, kind: "church", indoor: 1 }),
    S("Schaezlerpalais", "Schaezlerpalais", "Rococo ballroom and a good picture gallery.", { mins: 60, kind: "museum", indoor: 1, ticket: 1, closed: [1] }),
    S("Augsburg water management", "Historische Wasserwirtschaft Augsburg", "UNESCO-listed: 800 years of waterworks, towers and canals.", { mins: 60, kind: "sight" }),
  ],
  landsberg: [
    S("Lech weir", "Landsberg am Lech", "A stepped waterfall right in the middle of town.", { cimg: "Lechwehr Landsberg", mins: 25, kind: "nature" }),
    S("Hauptplatz", "Landsberg am Lech", "Sloping square with the Schmalzturm and a painted town hall.", { mins: 40, kind: "square" }),
    S("Bayertor", "Bayertor", "1425 gate tower, climbable, 15 min uphill from the square.", { mins: 40, kind: "view", ticket: 1 }),
    S("Mother of God church", "Stadtpfarrkirche Mariä Himmelfahrt (Landsberg am Lech)", "Gothic outside, baroque inside.", { mins: 25, kind: "church", indoor: 1 }),
  ],
  donauworth: [
    S("Reichsstraße", "Donauwörth", "A wide street of tall gabled houses, one of the best in Swabia.", { cimg: "Reichsstraße Donauwörth", mins: 35, kind: "street" }),
    S("Ried island", "Donauwörth", "Where the Wörnitz runs into the Danube.", { mins: 30, kind: "nature" }),
    S("Liebfrauenmünster", "Liebfrauenmünster (Donauwörth)", "Late-Gothic brick minster with the town's big bell.", { mins: 25, kind: "church", indoor: 1 }),
    S("Käthe Kruse Doll Museum", "Käthe-Kruse-Puppen-Museum", "In an old monastery. Charming and odd.", { mins: 45, kind: "museum", indoor: 1, ticket: 1, closed: [1] }),
  ],
  nuremberg: [
    S("Königstor and the walls", "Stadtmauer (Nürnberg)", "You come out of the station straight into a medieval gate.", { mins: 20, kind: "street" }),
    S("Schöner Brunnen", "Schöner Brunnen", "The gold fountain standing on the market square. Turn the brass ring for luck.", { mins: 10, kind: "square" }),
    S("Sebalduskirche", "St. Sebald (Nürnberg)", "The older of the two great churches, below the castle.", { mins: 25, kind: "church", indoor: 1 }),
    S("Tiergärtnertorplatz", "Tiergärtnertor", "The square below the castle where everyone sits out.", { mins: 25, kind: "square" }),
    S("Heilig-Geist-Spital", "Heilig-Geist-Spital (Nürnberg)", "A hospital built out over the river on arches.", { mins: 20, kind: "sight" }),
    S("Imperial Castle", "Nürnberger Burg", "Walls, a very deep well, and the roofs of the old town below.", { must: 1, mins: 60, kind: "palace", ticket: 1 }),
    S("Hauptmarkt", "Hauptmarkt (Nürnberg)", "The broad market square below the castle rock.", { must: 1, mins: 15, kind: "square" }),
    S("Albrecht Dürer's House", "Albrecht-Dürer-Haus", "Where Dürer lived and worked, just below the castle gate.", { must: 1, mins: 45, kind: "museum", indoor: 1, ticket: 1, closed: [1] }),
    S("Weißgerbergasse", "Weißgerbergasse", "The prettiest surviving half-timbered lane in the city.", { must: 1, mins: 25, kind: "street" }),
    S("Henkersteg", "Henkersteg", "Covered wooden bridge over the Pegnitz, with the hangman's house.", { mins: 25, kind: "sight" }),
    S("Frauenkirche", "Frauenkirche (Nürnberg)", "On the market square. The clock figures move at noon.", { must: 1, mins: 25, kind: "church", indoor: 1 }),
    S("St Lorenz", "St. Lorenz (Nürnberg)", "Huge Gothic church with Veit Stoß's Annunciation hanging in the choir.", { must: 1, mins: 30, kind: "church", indoor: 1 }),
    S("Germanisches Nationalmuseum", "Germanisches Nationalmuseum", "The biggest museum of German culture. Enormous.", { mins: 150, kind: "museum", indoor: 1, ticket: 1, closed: [1] }),
    S("Documentation Centre", "Dokumentationszentrum Reichsparteitagsgelände", "The Nazi rally grounds, honestly explained. 15 min by tram.", { mins: 120, kind: "museum", indoor: 1, ticket: 1 }),
    S("Nuremberg sausages", "Nürnberger Rostbratwurst", "Three in a roll, or a dozen on a pewter plate at Bratwursthäusle.", { mins: 60, kind: "food", indoor: 1 }),
    S("Handwerkerhof", "Handwerkerhof", "Craft courtyard inside the wall by the station. Touristy but pretty.", { mins: 30, kind: "shop" }),
  ],
  bamberg: [
    S("Obere Brücke", "Altes Rathaus (Bamberg)", "The bridge the old town hall stands on.", { mins: 10, kind: "sight" }),
    S("Alte Hofhaltung", "Alte Hofhaltung (Bamberg)", "Half-timbered courtyard beside the cathedral.", { mins: 30, kind: "palace" }),
    S("Böttingerhaus", "Böttingerhaus", "The grandest baroque townhouse in the city.", { mins: 15, kind: "sight" }),
    S("Maximiliansplatz", "Bamberg", "The market square in the lower town, with St Martin's church on it.", { cimg: "Maximiliansplatz Bamberg", mins: 20, kind: "square" }),
    S("Old Town Hall", "Altes Rathaus (Bamberg)", "Built on an artificial island in the middle of the river, painted all over.", { must: 1, mins: 25, kind: "sight" }),
    S("Little Venice", "Klein-Venedig (Bamberg)", "Fishermen's houses leaning over the water.", { must: 1, mins: 30, kind: "street" }),
    S("Bamberg Cathedral", "Bamberger Dom", "Four towers, and the Bamberg Horseman inside.", { must: 1, mins: 45, kind: "church", indoor: 1 }),
    S("Schlenkerla", "Schlenkerla", "Smoked beer, poured from the barrel. Tastes like bacon. Try it once.", { mins: 60, kind: "food", indoor: 1 }),
    S("New Residence rose garden", "Neue Residenz (Bamberg)", "Terrace garden with the best view over the roofs.", { mins: 40, kind: "nature" }),
    S("Michaelsberg Abbey", "Kloster Michelsberg", "On the hill above, with a ceiling painted with 600 medicinal plants.", { mins: 45, kind: "church" }),
  ],
  rothenburg: [
    S("Marktplatz", "Rothenburg ob der Tauber", "Town hall tower is climbable — narrow stairs, big reward.", { must: 1, mins: 45, kind: "square" }),
    S("Plönlein", "Plönlein", "The crooked yellow house between two gates. The photo everyone takes.", { mins: 20, kind: "street" }),
    S("Town wall walk", "Rothenburg ob der Tauber", "Covered walkway along the top. The east side is the best stretch.", { cimg: "Stadtmauer Rothenburg Wehrgang", mins: 60, kind: "view" }),
    S("Burggarten", "Burg Rothenburg ob der Tauber", "Castle garden at the western end, looking down the Tauber valley.", { cimg: "Burggarten Rothenburg ob der Tauber", mins: 40, kind: "nature" }),
    S("St Jakob's", "St. Jakob (Rothenburg ob der Tauber)", "Riemenschneider's Holy Blood Altar, carved in limewood around 1500.", { mins: 40, kind: "church", indoor: 1, ticket: 1 }),
    S("Medieval Crime Museum", "Mittelalterliches Kriminalmuseum", "Six hundred years of law and punishment. Grim and fascinating.", { mins: 75, kind: "museum", indoor: 1, ticket: 1 }),
    S("Käthe Wohlfahrt", "Käthe Wohlfahrt", "Christmas, all year, in a shop the size of a village.", { mins: 30, kind: "shop", indoor: 1 }),
  ],
  wurzburg: [
    S("Würzburg Residence", "Würzburger Residenz", "UNESCO. Tiepolo's staircase fresco is the largest in the world.", { mins: 90, kind: "palace", indoor: 1, ticket: 1 }),
    S("Old Main Bridge", "Alte Mainbrücke", "Stone saints along the parapet. People drink wine on it at sunset.", { mins: 40, kind: "sight" }),
    S("Marienberg Fortress", "Festung Marienberg", "30 min climb through the vineyards, or bus 9. The view is the point.", { mins: 120, kind: "view" }),
    S("Würzburg Cathedral", "Würzburger Dom", "One of the largest Romanesque churches in Germany.", { mins: 30, kind: "church", indoor: 1 }),
    S("Marktplatz and Marienkapelle", "Marienkapelle (Würzburg)", "Red-and-white Gothic chapel on the market square.", { mins: 30, kind: "square" }),
    S("Court Garden", "Würzburger Residenz", "Behind the Residence, free to walk into.", { cimg: "Hofgarten Würzburg", mins: 30, kind: "nature" }),
    S("Franconian wine", "Bocksbeutel", "Dry white in the flat round Bocksbeutel bottle. Local to here.", { mins: 60, kind: "food" }),
  ],
  heidelberg: [
    S("Heidelberg Castle", "Heidelberger Schloss", "Red sandstone ruin above the town. Funicular from Kornmarkt.", { mins: 120, kind: "palace", ticket: 1 }),
    S("Philosophers' Walk", "Philosophenweg (Heidelberg)", "Across the river and up. The classic view back at the castle.", { mins: 90, kind: "view" }),
    S("Old Bridge", "Alte Brücke (Heidelberg)", "1788. The bronze monkey at the end is for holding, and for luck.", { mins: 30, kind: "sight" }),
    S("Hauptstraße", "Hauptstraße (Heidelberg)", "1.6 km of pedestrian street, the longest in Germany.", { mins: 60, kind: "street" }),
    S("Marktplatz and Church of the Holy Spirit", "Heiliggeistkirche (Heidelberg)", "Market square church with shops built into its outer walls.", { mins: 30, kind: "church", indoor: 1 }),
    S("Student Prison", "Studentenkarzer", "Where misbehaving students were locked up — and covered the walls in graffiti.", { mins: 30, kind: "museum", indoor: 1, ticket: 1 }),
    S("Königstuhl funicular", "Heidelberger Bergbahn", "Continue past the castle to the top of the hill.", { mins: 90, kind: "view", ticket: 1 }),
  ],
  ulm: [
    S("Ulm Minster", "Ulmer Münster", "The tallest church steeple in the world, 161 m. 768 steps if you want the Alps from the top.", { must: 1, mins: 90, kind: "church", indoor: 1, ticket: 1 }),
    S("Fishermen's Quarter", "Ulm", "Half-timbered lanes over the little Blau, two minutes from the Minster.", { must: 1, cimg: "Fischerviertel Ulm", mins: 60, kind: "street" }),
    S("Crooked House", "Ulm", "A 1443 hotel leaning far enough that the beds are levelled with wedges.", { cimg: "Schiefes Haus Ulm", mins: 15, kind: "sight" }),
    S("Ulm Town Hall", "Ulm", "Painted head to foot, with an astronomical clock from 1520.", { cimg: "Rathaus Ulm", mins: 25, kind: "sight" }),
    S("Metzgerturm", "Metzgerturm", "The leaning butcher's tower on the old wall, above the Danube.", { cimg: "Metzgerturm Ulm", mins: 25, kind: "view" }),
    S("Danube wall walk", "Ulm", "Along the top of the city wall beside the river. Flat, and the best light in the evening.", { cimg: "Stadtmauer Ulm Donau", mins: 40, kind: "nature" }),
    S("Einstein's birthplace", "Albert Einstein", "He was born here in 1879; the house went in the war and a stone marks it.", { cimg: "Einstein Denkmal Ulm", mins: 15, kind: "sight" }),
  ],
  esslingen: [
    S("Old Town Hall", "Esslingen am Neckar", "1430 timber front with an astronomical clock and a glockenspiel that still plays.", { cimg: "Altes Rathaus Esslingen Glockenspiel", must: 1, mins: 30, kind: "sight" }),
    S("Esslingen Burg", "Esslinger Burg", "300 steps up through the vineyard to the fortress. The town and the Neckar below.", { must: 1, cimg: "Esslinger Burg Dicker Turm", mins: 60, kind: "view" }),
    S("Innere Brücke", "Esslingen am Neckar", "A medieval bridge with a chapel standing on it.", { cimg: "Innere Brücke Esslingen", mins: 25, kind: "sight" }),
    S("Frauenkirche", "Frauenkirche (Esslingen am Neckar)", "Gothic, with a filigree spire that took two centuries.", { mins: 30, kind: "church", indoor: 1 }),
    S("The oldest timber houses", "Esslingen am Neckar", "The row on Webergasse dates from about 1267 — the oldest standing in Germany.", { cimg: "Webergasse Esslingen Fachwerk", must: 1, mins: 40, kind: "street" }),
    S("Kessler Sekt", "Kessler Sekt", "Germany's first sparkling wine house, founded 1826, still in its vaulted cellar.", { cimg: "Kessler Sekt Esslingen", mins: 45, kind: "food", indoor: 1 }),
  ],
  fulda: [
    S("Fulda Cathedral", "Fuldaer Dom", "Baroque, over the tomb of St Boniface.", { mins: 35, kind: "church", indoor: 1 }),
    S("St Michael's", "Michaelskirche (Fulda)", "9th century, one of the oldest churches in Germany, right beside the cathedral.", { mins: 25, kind: "church", indoor: 1 }),
    S("City Palace", "Stadtschloss Fulda", "Prince-abbots' palace, with a mirror cabinet.", { mins: 60, kind: "palace", indoor: 1, ticket: 1 }),
    S("Palace gardens and Orangery", "Stadtschloss Fulda", "Free to walk through, with the huge Floravase at the top.", { cimg: "Orangerie Fulda", mins: 40, kind: "nature" }),
  ],
  eisenach: [
    S("Wartburg", "Wartburg", "UNESCO castle where Luther translated the New Testament in ten weeks.", { mins: 180, kind: "palace", ticket: 1 }),
    S("Bach House", "Bachhaus Eisenach", "Bach was born in Eisenach. Live demonstrations on historic instruments.", { mins: 75, kind: "museum", indoor: 1, ticket: 1 }),
    S("Market square", "Eisenach", "Town hall, the Georgenkirche where Bach was baptised, and cafés.", { mins: 40, kind: "square" }),
    S("Luther House", "Lutherhaus Eisenach", "Where Luther lodged as a schoolboy.", { mins: 45, kind: "museum", indoor: 1, ticket: 1 }),
  ],
  erfurt: [
    S("Anger", "Anger (Erfurt)", "The wide shopping street between the station and the old town.", { mins: 30, kind: "street" }),
    S("Merchants' Bridge shops", "Krämerbrücke", "Thirty-two houses on the bridge, with workshops in the ground floors.", { cimg: "Krämerbrücke Erfurt Geschäfte", mins: 40, kind: "shop" }),
    S("Ägidienkirche tower", "Ägidienkirche (Erfurt)", "Climb the tower at the end of the bridge for the best view of it.", { mins: 25, kind: "view", ticket: 1 }),
    S("St Severi", "Severikirche (Erfurt)", "The five-spired church sharing the steps with the cathedral.", { mins: 25, kind: "church", indoor: 1 }),
    S("Krämerbrücke", "Krämerbrücke", "A bridge with houses on it, lived in continuously since 1325.", { must: 1, mins: 45, kind: "street" }),
    S("Domplatz", "Domplatz (Erfurt)", "Cathedral and St Severi side by side above a huge open square.", { must: 1, mins: 40, kind: "square" }),
    S("Erfurt Cathedral", "Erfurter Dom", "Climb the steps. The Gloriosa bell inside is the largest medieval bell in the world.", { must: 1, mins: 40, kind: "church", indoor: 1 }),
    S("Petersberg Citadel", "Zitadelle Petersberg", "Baroque fortress on the hill. Best place for sunset over the city.", { mins: 60, kind: "view" }),
    S("Fischmarkt", "Fischmarkt (Erfurt)", "Renaissance houses and the town hall. Dinner here.", { must: 1, mins: 45, kind: "square" }),
    S("Augustinian Monastery", "Augustinerkloster (Erfurt)", "Luther was a monk here for six years.", { mins: 50, kind: "church", indoor: 1, ticket: 1 }),
    S("Old Synagogue", "Alte Synagoge (Erfurt)", "The oldest standing synagogue in Europe, with a hoard of medieval treasure.", { mins: 60, kind: "museum", indoor: 1, ticket: 1, closed: [1] }),
    S("egapark", "Egapark", "Big garden park on the edge of town, if you want green.", { mins: 120, kind: "nature", ticket: 1 }),
  ],
  weimar: [
    S("Cranach House", "Cranachhaus", "The painter's last home, on the market square.", { mins: 20, kind: "sight" }),
    S("Wittumspalais", "Wittumspalais (Weimar)", "Anna Amalia's town palace, where the salon met.", { mins: 45, kind: "palace", indoor: 1, ticket: 1 }),
    S("Goethe's Garden House", "Goethes Gartenhaus", "In the park by the river. Where he lived first.", { mins: 40, kind: "museum", ticket: 1 }),
    S("Goethe's House", "Goethes Wohnhaus", "On Frauenplan. He lived here for fifty years; it is exactly as he left it.", { must: 1, mins: 75, kind: "museum", indoor: 1, ticket: 1, closed: [1] }),
    S("Marktplatz", "Weimar", "Town hall and the Cranach house, with the old Elephant hotel.", { must: 1, mins: 30, kind: "square" }),
    S("Park an der Ilm", "Park an der Ilm", "Landscape park along the river, with Goethe's garden house in it.", { must: 1, mins: 75, kind: "nature" }),
    S("Schiller's House", "Schillers Wohnhaus", "Where Schiller wrote William Tell.", { mins: 50, kind: "museum", indoor: 1, ticket: 1 }),
    S("Bauhaus Museum", "Bauhaus-Museum", "The Bauhaus started in this town in 1919.", { cimg: "Bauhaus-Museum Weimar", mins: 75, kind: "museum", indoor: 1, ticket: 1 }),
    S("Duchess Anna Amalia Library", "Herzogin Anna Amalia Bibliothek", "The oval rococo hall. Timed tickets, limited numbers, book ahead.", { mins: 45, kind: "museum", indoor: 1, ticket: 1 }),
    S("Theaterplatz", "Deutsches Nationaltheater Weimar", "The Goethe and Schiller statue stands in front of the theatre.", { must: 1, mins: 20, kind: "square" }),
  ],
  naumburg: [
    S("Nietzsche House", "Nietzsche-Haus Naumburg", "Where Nietzsche grew up and later returned, ill.", { mins: 40, kind: "museum", indoor: 1, ticket: 1, closed: [1] }),
    S("Town walls and Marientor", "Marientor (Naumburg)", "The last surviving double gate in Thuringia.", { mins: 20, kind: "street" }),
    S("Naumburg Cathedral", "Naumburger Dom", "UNESCO. The twelve founder statues — Uta especially — are extraordinary.", { must: 1, mins: 60, kind: "church", indoor: 1, ticket: 1 }),
    S("Marktplatz", "Naumburg (Saale)", "Late-Gothic town hall and burgher houses.", { must: 1, mins: 30, kind: "square" }),
    S("St Wenceslas", "Stadtkirche St. Wenzel (Naumburg)", "Has a Hildebrandt organ that Bach himself tested in 1746.", { mins: 30, kind: "church", indoor: 1 }),
    S("Saale-Unstrut wine", "Saale-Unstrut (Weinanbaugebiet)", "The northernmost quality wine region in Europe.", { mins: 60, kind: "food" }),
  ],
  quedlinburg: [
    S("Old town", "Quedlinburg", "UNESCO. Around 1300 half-timbered houses from six centuries.", { mins: 90, kind: "street" }),
    S("Schlossberg and collegiate church", "Stiftskirche St. Servatii", "Romanesque church on the castle rock, with the Ottonian treasury.", { mins: 75, kind: "church", ticket: 1 }),
    S("Marktplatz", "Quedlinburg", "Renaissance town hall with a Roland statue in front.", { must: 1, mins: 30, kind: "square" }),
    S("Finkenherd", "Quedlinburg", "The oldest corner of town, below the castle rock.", { mins: 25, kind: "street" }),
    S("Half-timbered museum", "Fachwerkmuseum (Quedlinburg)", "In a house from about 1310 — one of the oldest in Germany.", { mins: 40, kind: "museum", indoor: 1, ticket: 1 }),
  ],
  wernigerode: [
    S("Marktplatz", "Wernigerode", "The town hall with two pointed towers, built for a merchant and never finished as one.", { must: 1, mins: 40, kind: "square" }),
    S("Breite Straße", "Wernigerode", "The main street of painted half-timbered houses, including the Krummelsches Haus.", { cimg: "Breite Straße Wernigerode", must: 1, mins: 45, kind: "street" }),
    S("Wernigerode Castle", "Schloss Wernigerode", "On the hill above the town. Twenty minutes up, or the little Bimmelbahn road train.", { must: 1, mins: 120, kind: "palace", ticket: 1 }),
    S("Kleinstes Haus", "Wernigerode", "Three metres wide. People lived in it until 1976.", { cimg: "Kleinstes Haus Wernigerode", mins: 15, kind: "sight" }),
    S("Harzquerbahn", "Harzer Schmalspurbahnen", "Steam narrow-gauge from the town station. The Brocken train takes most of a day.", { cimg: "Harzquerbahn Wernigerode Dampflokomotive", mins: 60, kind: "sight", ticket: 1 }),
    S("Schiefes Haus", "Wernigerode", "A leaning mill house, propped up and still standing.", { cimg: "Schiefes Haus Wernigerode", mins: 15, kind: "sight" }),
    S("Lustgarten", "Schloss Wernigerode", "The terraced garden below the castle, free and quiet.", { cimg: "Lustgarten Wernigerode", mins: 35, kind: "nature" }),
  ],
  thale: [
    S("Bodetal", "Bodetal", "The deepest gorge north of the Alps. The path in from the station is flat.", { must: 1, mins: 120, kind: "nature" }),
    S("Hexentanzplatz", "Hexentanzplatz", "The witches' dancing floor on the cliff. Cable car up from the valley.", { cimg: "Hexentanzplatz Thale Bodetal", must: 1, mins: 90, kind: "view", ticket: 1 }),
    S("Rosstrappe", "Rosstrappe", "The rock with the hoofprint, opposite the Hexentanzplatz. Chairlift or a stiff walk.", { mins: 90, kind: "view", ticket: 1 }),
  ],
  halberstadt: [
    S("Halberstadt Cathedral", "Halberstädter Dom", "Gothic, with a cathedral treasury of medieval textiles that has no equal in Europe.", { must: 1, mins: 60, kind: "church", indoor: 1, ticket: 1 }),
    S("Domplatz", "Halberstädter Dom", "Cathedral and the Liebfrauenkirche facing each other across the green.", { cimg: "Domplatz Halberstadt", mins: 30, kind: "square" }),
    S("Fischmarkt", "Halberstadt", "The rebuilt half-timbered centre, with the Rathaus and Roland.", { mins: 30, kind: "square" }),
    S("As Slow as Possible", "As Slow as Possible", "A John Cage organ piece in the Burchardikirche, playing since 2001. It ends in 2640.", { mins: 40, kind: "sight" }),
  ],
  magdeburg: [
    S("Magdeburg Cathedral", "Magdeburger Dom", "The first Gothic cathedral on German soil, on the Elbe.", { mins: 50, kind: "church", indoor: 1 }),
    S("Green Citadel", "Grüne Zitadelle von Magdeburg", "Hundertwasser's last building. Pink, wonky, full of trees.", { mins: 40, kind: "sight" }),
    S("Elbe promenade", "Elbe", "River walk between the cathedral and the bridges.", { mins: 40, kind: "nature" }),
    S("Monastery of Our Lady", "Kloster Unser Lieben Frauen", "Romanesque monastery, now a sculpture museum.", { mins: 50, kind: "museum", indoor: 1, ticket: 1 }),
  ],
  berlin: [
    S("Brandenburg Gate", "Brandenburger Tor", "The obvious one, and still worth standing in front of.", { must: 1, mins: 30, kind: "sight" }),
    S("Gendarmenmarkt", "Gendarmenmarkt", "Two matching cathedrals and the concert hall. The handsomest square in Berlin.", { must: 1, mins: 40, kind: "square" }),
    S("Museum Island", "Museumsinsel", "Five museums on one island. The Pergamon's Ishtar Gate is the highlight.", { mins: 180, kind: "museum", indoor: 1, ticket: 1 }),
    S("Reichstag dome", "Reichstagsgebäude", "Free, but you must register online in advance.", { mins: 90, kind: "view" }),
    S("East Side Gallery", "East Side Gallery", "1.3 km of the Wall, painted.", { mins: 60, kind: "street" }),
    S("Berlin Cathedral", "Berliner Dom", "Climb to the dome walkway for the view over the island.", { mins: 60, kind: "church", indoor: 1, ticket: 1 }),
    S("Memorial to the Murdered Jews of Europe", "Denkmal für die ermordeten Juden Europas", "2711 concrete slabs. Walk into the middle of it.", { mins: 45, kind: "sight" }),
    S("Tiergarten", "Großer Tiergarten", "The big central park, with the Victory Column in the middle.", { mins: 90, kind: "nature" }),
    S("Alexanderplatz TV Tower", "Berliner Fernsehturm", "368 m. Book a time slot to skip the queue.", { mins: 90, kind: "view", ticket: 1 }),
    S("Checkpoint Charlie", "Checkpoint Charlie", "The old crossing point. Busy and a bit tacky, but it is the spot.", { mins: 30, kind: "sight" }),
    S("Charlottenburg Palace", "Schloss Charlottenburg", "The largest palace in Berlin, with a big park behind it.", { mins: 150, kind: "palace", ticket: 1 }),
    S("Hackesche Höfe", "Hackesche Höfe", "Eight linked courtyards of shops and cafés in Mitte.", { mins: 60, kind: "shop" }),
  ],
  friedberg: [
    S("Marienplatz", "Friedberg (Bayern)", "A long sloping square with the town hall at the top.", { must: 1, cimg: "Marienplatz Friedberg Bayern", mins: 30, kind: "square" }),
    S("Wittelsbacher Schloss", "Schloss Friedberg (Bayern)", "The castle on the ridge, with the town museum inside.", { must: 1, mins: 50, kind: "palace", indoor: 1, ticket: 1 }),
    S("Herrgottsruhkirche", "Herrgottsruh", "Rococo pilgrimage church ten minutes east of the centre.", { mins: 30, kind: "church", indoor: 1 }),
  ],
  jena: [
    S("Marktplatz", "Jena", "The old market with the Hanfried statue in the middle.", { must: 1, cimg: "Marktplatz Jena", mins: 30, kind: "square" }),
    S("JenTower", "JenTower", "The round tower over the city; there is a viewing platform at the top.", { must: 1, mins: 45, kind: "view", ticket: 1 }),
    S("Botanical Garden", "Botanischer Garten Jena", "One of the oldest in Germany — Goethe had a hand in it.", { mins: 60, kind: "nature", ticket: 1 }),
    S("Zeiss Planetarium", "Zeiss-Planetarium Jena", "The oldest working planetarium in the world, from 1926.", { mins: 75, kind: "museum", indoor: 1, ticket: 1 }),
    S("Stadtkirche St Michael", "St. Michael (Jena)", "Luther's original tombstone is inside.", { mins: 25, kind: "church", indoor: 1 }),
  ],
  saalfeld: [
    S("Fairy Grottoes", "Feengrotten", "Old alum mine turned into the most colourful show cave in the world.", { must: 1, mins: 90, kind: "nature", ticket: 1 }),
    S("Marktplatz", "Saalfeld/Saale", "Renaissance town hall and a ring of gabled houses.", { must: 1, cimg: "Markt Saalfeld Saale Rathaus", mins: 30, kind: "square" }),
    S("Johanneskirche", "Johanneskirche (Saalfeld)", "Late-Gothic hall church in the middle of town.", { mins: 25, kind: "church", indoor: 1 }),
    S("Saalfeld town walls", "Saalfeld/Saale", "Towers and gates still ringing the old centre.", { cimg: "Saalfeld Saale Stadtmauer", mins: 25, kind: "street" }),
  ],
};

/* Days and route options.

   `see` is an ORDER, not a set: it is the walk through the town, starting and
   ending at the station, and the build measures the real walking minutes
   between each pair. Times here are the intent — the build resolves every move
   against the real timetable and rewrites them with what actually runs.

   She has to be in Berlin by the end of 3 October, which is five days, not
   seven. So no town gets a whole day to itself: the line runs north and breaks
   the long rides with somewhere worth getting off. */
const T = (dep, arr, to, via, x, bus) => ({ M: bus ? "Bus" : "Train", dep, arr, to, via, x });

export const DAYS = [
  {
    n: 1, iso: "2026-09-29", title: "Into the Karwendel", c: "#4E7A9B",
    hero: "mittenwald",
    intro: "You arrive in the afternoon. One small alpine town, painted head to foot, with a limestone wall behind it that goes pink at sunset.",
    paths: [
      { id: "A", name: "The town, slowly", why: "You have been travelling. No more trains today.", seq: [
        { S: "mittenwald", arr: "14:00", base: 1, stn: "Out of the station, straight down Bahnhofstraße — Obermarkt is five minutes on the flat.",
          see: ["Obermarkt", "St Peter and Paul", "Ballenhausgasse", "Violin Making Museum", "Kalvarienberg", "Karwendel cable car"] },
      ]},
      { id: "B", name: "Over the border to Seefeld", why: "Twenty minutes into Austria and back, for a lake and a different country.", seq: [
        { S: "mittenwald", arr: "14:00", dep: "15:40", stn: "Obermarkt is five minutes from the station, on the flat.",
          see: ["Obermarkt", "St Peter and Paul", "Ballenhausgasse"] },
        T("15:40", "16:00", "Seefeld", ["mittenwald", "seefeld"], "This crosses into Austria, and your German ticket does not cover it. Buy the short Mittenwald–Seefeld ticket from the machine on the platform."),
        { S: "seefeld", arr: "16:00", dep: "18:40", stn: "The station is at the edge of the centre — five minutes in.",
          see: ["Seefeld centre", "Pfarrkirche St Oswald", "Seekirchl", "Wildsee"] },
        T("18:40", "19:00", "Mittenwald", ["seefeld", "mittenwald"]),
        { S: "mittenwald", arr: "19:00", base: 1, see: [] },
      ]},
      { id: "C", name: "Up to the lakes", why: "The two mountain lakes above the town. A proper walk, about three hours.", seq: [
        { S: "mittenwald", arr: "14:00", base: 1, stn: "The path to the lakes starts at the south end of town, past the church.",
          see: ["Obermarkt", "St Peter and Paul", "Lautersee", "Ferchensee"] },
      ]},
    ],
  },
  {
    n: 2, iso: "2026-09-30", title: "Out of the Alps", c: "#1F8F8A",
    hero: "ettal",
    intro: "The best day of the week for looking out of a window. An abbey, a village where the houses are painted with fairy tales, and a lake, before the mountains let go.",
    paths: [
      { id: "A", name: "Abbey and woodcarvers", why: "Four short stops, none of them rushed. The most to see.", bags: 1, seq: [
        T("08:30", "08:50", "Garmisch", ["mittenwald", "garmisch"]),
        { S: "garmisch", arr: "08:50", dep: "10:35", stn: "Ten minutes east from the station to Ludwigstraße — the Partenkirchen half, which is the pretty one.",
          see: ["Ludwigstraße", "Mohrenplatz", "Old St Martin", "Kurpark Garmisch"] },
        T("10:40", "11:10", "Ettal", ["garmisch", "ettal"], "Bus 9606 from outside Garmisch station. It runs straight through to Ettal and on to Oberammergau.", 1),
        { S: "ettal", arr: "11:10", dep: "12:00", stn: "The bus stops at the abbey gate. Everything is in front of you.",
          see: ["Ettal Abbey church", "Abbey shop and distillery"] },
        T("12:00", "12:10", "Oberammergau", ["ettal", "oberammergau"], "", 1),
        { S: "oberammergau", arr: "12:10", dep: "14:15", stn: "Ten minutes from the station into the village.",
          see: ["Dorfstraße", "Pilatushaus", "Ettaler Straße houses", "Pfarrkirche St Peter und Paul", "Woodcarving workshops", "Passion Play Theatre", "Ammer riverside"] },
        T("14:15", "14:55", "Murnau", ["oberammergau", "murnau"]),
        { S: "murnau", arr: "14:55", dep: "16:20", stn: "Ten minutes uphill from the station to Obermarkt.",
          see: ["Obermarkt", "Münter House", "Staffelsee"] },
        T("16:05", "17:55", "Augsburg", ["murnau", "augsburg"], "Change at München Hbf."),
        { S: "augsburg", arr: "17:55", base: 1, stn: "Fifteen minutes east from the Hbf to Rathausplatz, or tram 2.",
          see: ["Maximilianstraße", "Rathausplatz", "Augustusbrunnen", "Lechviertel canals"] },
      ]},
      { id: "B", name: "Füssen and Neuschwanstein", why: "One famous castle instead of four small towns. Early start, long day, a lot of queueing.", bags: 1, seq: [
        T("07:30", "07:50", "Garmisch", ["mittenwald", "garmisch"]),
        T("08:05", "10:05", "Füssen", ["garmisch", "oberammergau", "fussen"], "Regional bus 9606 via Ettal and Oberammergau. Only a few runs a day — check the time the night before.", 1),
        { S: "fussen", arr: "10:05", dep: "15:05", stn: "The station is right beside the old town; the castle bus leaves from outside it.",
          see: ["Füssen old town", "Hohes Schloss", "St Mang's Abbey", "Lechfall", "Hohenschwangau", "Neuschwanstein", "Marienbrücke"] },
        T("15:05", "17:05", "Augsburg", ["fussen", "augsburg"], "Change at Buchloe."),
        { S: "augsburg", arr: "17:05", base: 1, stn: "Fifteen minutes east from the Hbf to Rathausplatz, or tram 2.",
          see: ["Maximilianstraße", "Rathausplatz", "Augsburg Cathedral"] },
      ]},
      /* The western line leaves the Alps the same morning but turns down the
         Danube instead of up to Franconia. Garmisch, Munich and Augsburg are
         all still on it — short stops rather than none. */
      { id: "W", name: "Down the Danube to Ulm",
        title: "Out of the Alps, westward", hero: "munich",
        intro: "The same road out of the mountains, cut short three times: Partenkirchen for an hour and a half, Munich for the middle of the day, Augsburg before the light goes, and a bed under the tallest church spire in the world.",
        why: "Garmisch, Munich and Augsburg in one day, and then west along the Danube. Sleeps in Ulm.", bags: 1, seq: [
        T("08:00", "08:27", "Garmisch", ["mittenwald", "garmisch"]),
        { S: "garmisch", arr: "08:27", dep: "10:00", stn: "Ten minutes east from the station to Ludwigstraße — the Partenkirchen half, which is the pretty one.",
          see: ["Ludwigstraße", "Mohrenplatz", "Old St Martin"] },
        T("10:00", "11:26", "Munich", ["garmisch", "munich"], "Direct up the Loisach valley."),
        { S: "munich", arr: "11:26", dep: "14:15", stn: "Twenty minutes on foot down Neuhauser Straße, or two stops on the S-Bahn.",
          see: ["Karlsplatz and Neuhauser Straße", "Frauenkirche", "Marienplatz", "St Peter's tower", "Viktualienmarkt", "Asamkirche"] },
        T("14:15", "15:02", "Augsburg", ["munich", "augsburg"]),
        { S: "augsburg", arr: "15:02", dep: "17:00", stn: "Fifteen minutes east from the Hbf to Rathausplatz, or tram 2.",
          see: ["Rathausplatz", "Augustusbrunnen", "Golden Hall", "Maximilianstraße"] },
        T("17:00", "18:21", "Ulm", ["augsburg", "ulm"], "Direct along the Danube, an hour and twenty."),
        { S: "ulm", arr: "18:21", base: 1, stn: "Out of the Hbf and straight down Bahnhofstraße — the Minster is five minutes and you cannot miss it.",
          see: ["Ulm Minster", "Fishermen's Quarter", "Crooked House"] },
      ]},

      { id: "Z", name: "The Zugspitze, and back to Mittenwald",
        title: "The Zugspitze", hero: "garmisch",
        intro: "Germany's highest point and then back to the same bed. Nothing to pack, nothing to catch at the end of it.",
        why: "Stays a second night in Mittenwald. The mountain all day, and no hotel to change.", seq: [
        T("08:00", "08:20", "Garmisch", ["mittenwald", "garmisch"]),
        { S: "garmisch", arr: "08:20", dep: "17:40", stn: "The Zugspitzbahn leaves from its own platform beside the main station.",
          see: ["Zugspitze", "Eibsee", "Ludwigstraße", "Mohrenplatz", "Partnachklamm", "Old St Martin"] },
        T("17:40", "18:00", "Mittenwald", ["garmisch", "mittenwald"]),
        { S: "mittenwald", arr: "18:00", base: 1, stn: "The same walk down Bahnhofstraße as last night.",
          see: ["Obermarkt", "Ballenhausgasse"] },
      ]},
    ],
  },
  {
    n: 3, iso: "2026-10-01", title: "Augsburg, Munich, Nuremberg", c: "#9A7428",
    hero: "munich", bags: 1,
    intro: "Three cities in one day, which sounds mad and is not: they are forty minutes apart and you only walk the middle of each.",
    paths: [
      { id: "A", name: "All three", why: "Augsburg before the crowds, Munich in the middle, Nuremberg for the evening.", seq: [
        { S: "augsburg", arr: "08:00", dep: "10:45", stn: "Fifteen minutes east from the Hbf, or tram 2 to Rathausplatz.",
          see: ["Rathausplatz", "Augustusbrunnen", "Golden Hall", "Perlachturm", "Augsburg Cathedral", "Fuggerei", "Maximilianstraße"] },
        T("10:45", "11:30", "Munich", ["augsburg", "munich"]),
        { S: "munich", arr: "11:30", dep: "17:00", stn: "From the Hbf it is twenty minutes on foot straight down Neuhauser Straße, or two stops on the S-Bahn.",
          see: ["Karlsplatz and Neuhauser Straße", "Michaelskirche", "Frauenkirche", "Marienplatz", "St Peter's tower", "Viktualienmarkt", "Asamkirche", "Hofbräuhaus"] },
        T("17:00", "19:10", "Nuremberg", ["munich", "nuremberg"]),
        { S: "nuremberg", arr: "19:10", base: 1, stn: "Cross the road from the Hbf and you are through the Königstor and inside the walls.",
          see: ["Königstor and the walls", "Handwerkerhof", "Nuremberg sausages"] },
      ]},
      { id: "B", name: "Munich properly", why: "Skips Augsburg's museums for a long unhurried Munich, including the English Garden.", seq: [
        { S: "augsburg", arr: "08:15", dep: "09:30", stn: "Straight down Bahnhofstraße — Rathausplatz is fifteen minutes.",
          see: ["Rathausplatz", "Maximilianstraße"] },
        T("09:15", "10:00", "Munich", ["augsburg", "munich"]),
        { S: "munich", arr: "10:00", dep: "17:30", stn: "Twenty minutes on foot down Neuhauser Straße, or two stops on the S-Bahn.",
          see: ["Karlsplatz and Neuhauser Straße", "Frauenkirche", "Marienplatz", "St Peter's tower", "Viktualienmarkt", "Alter Hof", "Residenz", "Odeonsplatz", "Theatinerkirche", "Hofgarten", "English Garden", "Chinesischer Turm"] },
        T("17:30", "19:40", "Nuremberg", ["munich", "nuremberg"]),
        { S: "nuremberg", arr: "19:40", base: 1, stn: "Through the Königstor, straight across from the Hbf.",
          see: ["Königstor and the walls", "Nuremberg sausages"] },
      ]},

      /* The Romantic Road. Augsburg is on it and so is Rothenburg, which is
         two and a half hours up the line rather than the day-long detour it
         looks like on a map. Würzburg is the far end of the road and a bed
         nobody else on this trip sleeps in. */
      { id: "R", name: "Rothenburg and Würzburg",
        title: "Up the Romantic Road", hero: "rothenburg",
        intro: "North-west instead of north-east, along the road the coaches take: the most complete walled town in Germany, and then the bishops' city at the end of it.",
        why: "The whole point is Rothenburg — walls you can walk the top of, and a town inside them that stopped in 1650. Sleeps in Würzburg.", seq: [
        { S: "augsburg", arr: "08:00", dep: "09:15", stn: "Fifteen minutes east from the Hbf, or tram 2 to Rathausplatz.",
          see: ["Rathausplatz", "Augustusbrunnen", "Maximilianstraße"] },
        T("09:15", "11:45", "Rothenburg", ["augsburg", "rothenburg"], "Changes at Treuchtlingen and Steinach. The last one is a two-carriage shuttle up the valley."),
        { S: "rothenburg", arr: "11:45", dep: "16:45", stn: "Ten minutes uphill from the station, in through the Rödertor, and you are on the wall.",
          see: ["Marktplatz", "Plönlein", "Town wall walk", "Burggarten", "St Jakob's", "Medieval Crime Museum", "Käthe Wohlfahrt"] },
        T("16:45", "18:00", "Würzburg", ["rothenburg", "wurzburg"], "Change at Steinach."),
        { S: "wurzburg", arr: "18:00", base: 1, stn: "Ten minutes from the Hbf down Kaiserstraße to the centre, or tram 1 to Dom.",
          see: ["Marktplatz and Marienkapelle", "Old Main Bridge", "Franconian wine"] },
      ]},

      /* Straight north instead, to buy a day in the Harz. */
      { id: "H", name: "Nuremberg, then on to Erfurt",
        title: "Nuremberg, then Thuringia", hero: "nuremberg",
        intro: "Nuremberg for the middle of the day, and then a fast run north so that tomorrow can be spent in the mountains above Quedlinburg rather than on a train.",
        why: "Gets the northward ride out of the way today, which is what buys the Harz tomorrow. Sleeps in Erfurt.", seq: [
        { S: "augsburg", arr: "08:00", dep: "09:00", stn: "Fifteen minutes east from the Hbf, or tram 2 to Rathausplatz.",
          see: ["Rathausplatz", "Maximilianstraße"] },
        T("09:00", "10:50", "Nuremberg", ["augsburg", "nuremberg"], "Direct, about an hour and three quarters."),
        { S: "nuremberg", arr: "10:50", dep: "16:30", stn: "Cross the road from the Hbf, through the Königstor, and you are inside the walls.",
          see: ["Königstor and the walls", "St Lorenz", "Heilig-Geist-Spital", "Hauptmarkt", "Schöner Brunnen", "Sebalduskirche", "Albrecht Dürer's House", "Imperial Castle", "Weißgerbergasse", "Nuremberg sausages"] },
        T("16:30", "18:25", "Erfurt", ["nuremberg", "erfurt"], "Direct on the RE29 — under two hours, and the Franconian Forest out of the window."),
        { S: "erfurt", arr: "18:25", base: 1, stn: "Fifteen minutes from the station up the Anger to the old town, or tram 3, 4 or 6.",
          see: ["Anger", "Fischmarkt", "Krämerbrücke", "Domplatz"] },
      ]},

      /* The western line's one day that is entirely new ground. */
      { id: "W", name: "Ulm, Esslingen, Heidelberg",
        title: "West to the Neckar", hero: "heidelberg",
        intro: "The Minster first thing while it is quiet, then a medieval town almost nobody outside Germany has heard of, and a castle above a river for the night.",
        why: "Ulm's spire, Esslingen's timber houses — the oldest standing in Germany — and Heidelberg by the evening. Sleeps in Heidelberg.", seq: [
        { S: "ulm", arr: "08:00", dep: "11:30", stn: "Five minutes from the Hbf down Bahnhofstraße to Münsterplatz.",
          see: ["Ulm Minster", "Ulm Town Hall", "Fishermen's Quarter", "Crooked House", "Metzgerturm", "Danube wall walk", "Einstein's birthplace"] },
        T("11:30", "12:34", "Esslingen", ["ulm", "esslingen"], "Direct on the RE5, an hour down the Fils and the Neckar."),
        { S: "esslingen", arr: "12:34", dep: "15:30", stn: "Ten minutes from the station across the Neckar and you are in the old town.",
          see: ["Old Town Hall", "The oldest timber houses", "Innere Brücke", "Frauenkirche", "Esslingen Burg", "Kessler Sekt"] },
        T("15:30", "17:18", "Heidelberg", ["esslingen", "heidelberg"], "Two changes, usually Stuttgart and Mannheim."),
        { S: "heidelberg", arr: "17:18", base: 1, stn: "The Hbf is out of the centre — bus 32 or tram 5 to Bismarckplatz, then the Hauptstraße is in front of you.",
          see: ["Hauptstraße", "Marktplatz and Church of the Holy Spirit", "Old Bridge"] },
      ]},

      /* The Alps line comes out of Mittenwald today instead of yesterday. */
      { id: "Z", name: "Down from the mountains, via Munich",
        title: "Mittenwald to Nuremberg", hero: "munich",
        intro: "Two hours out of the mountains, a long afternoon in Munich, and Franconia for the night.",
        why: "For the week that stayed two nights in Mittenwald. Munich all afternoon, Nuremberg for the evening.", seq: [
        { S: "mittenwald", arr: "08:00", dep: "09:00", stn: "Five minutes down Bahnhofstraße for anything you still want to see.",
          see: ["Obermarkt", "St Peter and Paul"] },
        T("09:00", "11:00", "Munich", ["mittenwald", "munich"], "Change at Garmisch or Murnau. The Karwendel line is the good half."),
        { S: "munich", arr: "11:00", dep: "17:15", stn: "Twenty minutes on foot down Neuhauser Straße, or two stops on the S-Bahn.",
          see: ["Karlsplatz and Neuhauser Straße", "Frauenkirche", "Marienplatz", "St Peter's tower", "Viktualienmarkt", "Asamkirche", "Residenz", "Odeonsplatz", "Hofgarten", "Hofbräuhaus"] },
        T("17:15", "19:25", "Nuremberg", ["munich", "nuremberg"]),
        { S: "nuremberg", arr: "19:25", base: 1, stn: "Through the Königstor, straight across from the Hbf.",
          see: ["Königstor and the walls", "Handwerkerhof", "Nuremberg sausages"] },
      ]},
    ],
  },
  {
    n: 4, iso: "2026-10-02", title: "Franconia, then north", c: "#8E3B46",
    hero: "bamberg", bags: 1,
    intro: "One more Franconian old town in the morning, and then the run up into Thuringia, which is shorter than it looks.",
    paths: [
      { id: "A", name: "Nuremberg, then Bamberg", why: "Two of the best old towns in Germany in one day, and in Erfurt in good time.", seq: [
        { S: "nuremberg", arr: "08:00", dep: "12:30", stn: "Through the Königstor and uphill; the castle is the far end of the old town.",
          see: ["St Lorenz", "Heilig-Geist-Spital", "Hauptmarkt", "Schöner Brunnen", "Frauenkirche", "Sebalduskirche", "Albrecht Dürer's House", "Tiergärtnertorplatz", "Imperial Castle", "Weißgerbergasse", "Henkersteg"] },
        T("12:30", "13:15", "Bamberg", ["nuremberg", "bamberg"]),
        { S: "bamberg", arr: "13:15", dep: "17:30", stn: "Twenty minutes from the station to the river, or bus 901.",
          see: ["Maximiliansplatz", "Obere Brücke", "Old Town Hall", "Little Venice", "Böttingerhaus", "Bamberg Cathedral", "Alte Hofhaltung", "New Residence rose garden", "Schlenkerla"] },
        T("17:30", "19:05", "Erfurt", ["bamberg", "erfurt"], "Direct on the RE29, an hour and a half."),
        { S: "erfurt", arr: "19:05", base: 1, stn: "Fifteen minutes from the station up the Anger to the old town, or tram 3, 4 or 6.",
          see: ["Anger", "Fischmarkt", "Krämerbrücke"] },
      ]},
      { id: "B", name: "Nuremberg, then the Fairy Grottoes", why: "Saalfeld's show cave is the strangest thing on this route, and it sits on the way north.", seq: [
        { S: "nuremberg", arr: "08:00", dep: "10:45", stn: "Through the Königstor and uphill to the castle.",
          see: ["St Lorenz", "Hauptmarkt", "Schöner Brunnen", "Sebalduskirche", "Albrecht Dürer's House", "Imperial Castle", "Weißgerbergasse"] },
        T("10:45", "13:15", "Saalfeld", ["nuremberg", "saalfeld"], "Up through the Franconian Forest. One change, usually at Lichtenfels."),
        { S: "saalfeld", arr: "13:15", dep: "17:00", stn: "The Feengrotten are a 25-minute walk south-west of the station, or bus A.",
          see: ["Marktplatz", "Johanneskirche", "Saalfeld town walls", "Fairy Grottoes"] },
        T("17:00", "18:15", "Erfurt", ["saalfeld", "erfurt"]),
        { S: "erfurt", arr: "18:15", base: 1, stn: "Fifteen minutes up the Anger, or tram 3, 4 or 6.",
          see: ["Anger", "Fischmarkt", "Krämerbrücke", "Domplatz"] },
      ]},

      /* Out of Würzburg for the Romantic Road week. */
      { id: "R", name: "Würzburg, then Bamberg",
        title: "Würzburg and Bamberg", hero: "wurzburg",
        intro: "The Residence first thing, while the staircase still has its light, then an hour up the Main to Bamberg and on into Thuringia.",
        why: "Two UNESCO towns in a morning and an afternoon, and the shortest ride north on the whole trip.", seq: [
        { S: "wurzburg", arr: "08:00", dep: "12:15", stn: "Ten minutes down Kaiserstraße from the Hbf, or tram 1 to Dom.",
          see: ["Würzburg Residence", "Court Garden", "Würzburg Cathedral", "Marktplatz and Marienkapelle", "Old Main Bridge", "Marienberg Fortress", "Franconian wine"] },
        T("12:15", "13:30", "Bamberg", ["wurzburg", "bamberg"], "Change at Schweinfurt or Haßfurt."),
        { S: "bamberg", arr: "13:30", dep: "17:30", stn: "Twenty minutes from the station to the river, or bus 901.",
          see: ["Maximiliansplatz", "Obere Brücke", "Old Town Hall", "Little Venice", "Bamberg Cathedral", "Alte Hofhaltung", "New Residence rose garden", "Schlenkerla"] },
        T("17:30", "19:05", "Erfurt", ["bamberg", "erfurt"], "Direct on the RE29."),
        { S: "erfurt", arr: "19:05", base: 1, stn: "Fifteen minutes up the Anger, or tram 3, 4 or 6.",
          see: ["Anger", "Fischmarkt", "Krämerbrücke"] },
      ]},

      /* Back east, and the only day on the trip with five hours of train in it.
         It is what the west costs. */
      { id: "W", name: "Heidelberg, then east to Würzburg",
        title: "Heidelberg, then back east", hero: "heidelberg",
        intro: "The castle and the Philosophers' Walk in the morning, and then the long run east with the Würzburg Residence in the middle of it.",
        why: "Heidelberg's morning is the reason for this week. The afternoon buys Würzburg and the evening gets you back on the line to Berlin. Five hours riding — the most of any day here.", seq: [
        { S: "heidelberg", arr: "08:00", dep: "11:45", stn: "Bus 33 to the castle, or the funicular from Kornmarkt. The Philosophers' Walk is over the Old Bridge.",
          see: ["Heidelberg Castle", "Old Bridge", "Philosophers' Walk", "Marktplatz and Church of the Holy Spirit", "Hauptstraße", "Student Prison"] },
        T("11:45", "14:14", "Würzburg", ["heidelberg", "wurzburg"], "Change at Mannheim or Osterburken. Buy something to eat before you board."),
        { S: "wurzburg", arr: "14:14", dep: "17:00", stn: "Ten minutes down Kaiserstraße from the Hbf, or tram 1 to Dom.",
          see: ["Würzburg Residence", "Court Garden", "Marktplatz and Marienkapelle", "Old Main Bridge", "Franconian wine"] },
        T("17:00", "19:31", "Erfurt", ["wurzburg", "erfurt"], "Change at Bamberg or Schweinfurt."),
        { S: "erfurt", arr: "19:31", base: 1, stn: "Fifteen minutes from the station up the Anger to the old town, or tram 3, 4 or 6.",
          see: ["Anger", "Fischmarkt", "Krämerbrücke"] },
      ]},

      /* And the Harz, which is the one day of this trip that is not a city. */
      { id: "H", name: "Into the Harz",
        title: "The Harz", hero: "wernigerode",
        intro: "Out of Thuringia and into the mountains the fairy tales came from: a town of painted timber under a castle, and a night inside a thousand-year-old UNESCO town.",
        why: "The only day that is not cities. Wernigerode under its castle, then Quedlinburg — 1300 half-timbered houses and a bed in the middle of them.", seq: [
        { S: "erfurt", arr: "08:00", dep: "08:40", stn: "Straight to the station this morning; you had the evening here.",
          see: ["Anger"] },
        T("08:40", "12:20", "Wernigerode", ["erfurt", "wernigerode"], "The long one of the day — up through Sangerhausen and Halberstadt. Buy something to eat before you board."),
        { S: "wernigerode", arr: "12:20", dep: "17:00", stn: "The Hbf is fifteen minutes from Breite Straße — or take the Bimmelbahn, which stops outside.",
          see: ["Breite Straße", "Marktplatz", "Kleinstes Haus", "Schiefes Haus", "Wernigerode Castle", "Lustgarten", "Harzquerbahn"] },
        T("17:00", "18:15", "Quedlinburg", ["wernigerode", "quedlinburg"], "Change at Halberstadt."),
        { S: "quedlinburg", arr: "18:15", base: 1, stn: "Ten minutes from the station down Bahnhofstraße and you are in the old town.",
          see: ["Marktplatz", "Old town", "Finkenherd"] },
      ]},

      /* The same bed with less of the day on a train — Halberstadt is on the
         way and half an hour from Quedlinburg on the bus. */
      { id: "G", name: "The Harz, gently",
        title: "The Harz", hero: "halberstadt",
        intro: "One cathedral town on the way in instead of two, and in Quedlinburg with the afternoon still going.",
        why: "Half an hour less riding than the full Harz day, and Halberstadt's treasury is the best of its kind in Europe. Same bed in Quedlinburg.", seq: [
        { S: "erfurt", arr: "08:00", dep: "08:40", stn: "Straight to the station this morning; you had the evening here.",
          see: ["Anger"] },
        T("08:40", "11:50", "Halberstadt", ["erfurt", "halberstadt"], "Up through Sangerhausen. Buy something to eat before you board."),
        { S: "halberstadt", arr: "11:50", dep: "16:30", stn: "Fifteen minutes from the station to the Domplatz, all of it level.",
          see: ["Halberstadt Cathedral", "Domplatz", "Fischmarkt", "As Slow as Possible"] },
        T("16:30", "17:05", "Quedlinburg", ["halberstadt", "quedlinburg"], "Bus 233, half an hour across the fields.", 1),
        { S: "quedlinburg", arr: "17:05", base: 1, stn: "Ten minutes from the station down Bahnhofstraße and you are in the old town.",
          see: ["Marktplatz", "Old town", "Finkenherd", "Schlossberg and collegiate church"] },
      ]},
    ],
  },
  {
    n: 5, iso: "2026-10-03", title: "Thuringia to Berlin", c: "#3B4C8C",
    hero: "berlin", bags: 1,
    holiday: "German Unity Day — a public holiday. Trains run a Sunday timetable, so there are fewer of them, and museums may keep holiday hours. Check the times before you leave each place.",
    intro: "The last morning, two small stops on the way, and your brother at the end of it.",
    paths: [
      { id: "A", name: "Weimar and Naumburg", why: "Two short, beautiful stops and very little walking between them.", seq: [
        { S: "erfurt", arr: "08:00", dep: "10:30", stn: "Fifteen minutes from the station up the Anger, or tram 3, 4 or 6 to Domplatz.",
          see: ["Anger", "Fischmarkt", "Krämerbrücke", "Merchants' Bridge shops", "Ägidienkirche tower", "Domplatz", "Erfurt Cathedral", "St Severi"] },
        T("10:30", "10:50", "Weimar", ["erfurt", "weimar"]),
        { S: "weimar", arr: "10:50", dep: "13:15", stn: "Fifteen minutes downhill from the station into the centre.",
          see: ["Marktplatz", "Cranach House", "Goethe's House", "Theaterplatz", "Wittumspalais", "Park an der Ilm"] },
        T("13:30", "14:10", "Naumburg", ["weimar", "naumburg"]),
        { S: "naumburg", arr: "14:10", dep: "16:40", stn: "Fifteen minutes from the Hbf, or the little historic tram, to the old town.",
          see: ["Marktplatz", "Naumburg Cathedral", "St Wenceslas", "Nietzsche House", "Town walls and Marientor"] },
        T("16:15", "19:30", "Berlin", ["naumburg", "berlin"], "One or two changes, usually at Halle."),
        { S: "berlin", arr: "19:30", base: 1, stn: "You have arrived. Berlin Hauptbahnhof.",
          see: ["Gendarmenmarkt", "Brandenburg Gate"] },
      ]},
      { id: "B", name: "Jena and Naumburg", why: "Jena is a university town in a gorge, and the tower has the best view in Thuringia.", seq: [
        { S: "erfurt", arr: "08:00", dep: "10:00", stn: "Fifteen minutes up the Anger, or tram 3, 4 or 6 to Domplatz.",
          see: ["Anger", "Krämerbrücke", "Domplatz", "Erfurt Cathedral"] },
        T("10:00", "10:45", "Jena", ["erfurt", "jena"]),
        { S: "jena", arr: "10:45", dep: "13:45", stn: "Jena Paradies station is ten minutes from the market square, along the river.",
          see: ["Marktplatz", "Stadtkirche St Michael", "JenTower", "Botanical Garden"] },
        T("13:45", "14:20", "Naumburg", ["jena", "naumburg"]),
        { S: "naumburg", arr: "14:20", dep: "16:30", stn: "Fifteen minutes from the Hbf, or the historic tram.",
          see: ["Marktplatz", "Naumburg Cathedral", "St Wenceslas"] },
        T("16:30", "19:45", "Berlin", ["naumburg", "berlin"], "One or two changes, usually at Halle."),
        { S: "berlin", arr: "19:45", base: 1, stn: "You have arrived. Berlin Hauptbahnhof.",
          see: ["Gendarmenmarkt", "Brandenburg Gate"] },
      ]},
      { id: "C", name: "Straight to Berlin, Weimar on the way", why: "The gentlest last day. One stop, and in Berlin in the afternoon.", seq: [
        { S: "erfurt", arr: "08:00", dep: "10:30", stn: "Fifteen minutes up the Anger, or tram 3, 4 or 6 to Domplatz.",
          see: ["Anger", "Fischmarkt", "Krämerbrücke", "Domplatz", "Erfurt Cathedral", "Petersberg Citadel"] },
        T("10:30", "10:50", "Weimar", ["erfurt", "weimar"]),
        { S: "weimar", arr: "10:50", dep: "13:00", stn: "Fifteen minutes downhill into the centre.",
          see: ["Marktplatz", "Goethe's House", "Theaterplatz"] },
        T("13:00", "16:45", "Berlin", ["weimar", "berlin"], "Changes at Naumburg and Halle."),
        { S: "berlin", arr: "16:45", base: 1, stn: "You have arrived. Berlin Hauptbahnhof.",
          see: ["Gendarmenmarkt", "Brandenburg Gate", "Museum Island", "Berlin Cathedral"] },
      ]},

      /* Out of the Harz. Quedlinburg is nearer Berlin than Erfurt is, so this
         is the shortest last day of the four and the only one with a morning
         in the town you slept in. */
      { id: "H", name: "Quedlinburg, then Magdeburg",
        title: "Out of the Harz", hero: "quedlinburg",
        intro: "A whole morning inside the UNESCO town instead of on a platform, one cathedral city on the Elbe, and Berlin before it is dark.",
        why: "The shortest last day. Quedlinburg all morning, Magdeburg in the afternoon, and in Berlin by early evening.", seq: [
        { S: "quedlinburg", arr: "08:00", dep: "12:30", stn: "Ten minutes from the station into the old town, all of it on the flat until the castle rock.",
          see: ["Marktplatz", "Old town", "Finkenherd", "Schlossberg and collegiate church", "Half-timbered museum"] },
        T("12:30", "14:05", "Magdeburg", ["quedlinburg", "magdeburg"], "Direct on the RE11, an hour and a half down the Bode and the Elbe."),
        { S: "magdeburg", arr: "14:05", dep: "16:45", stn: "Ten minutes from the Hbf to the cathedral, or one stop on any tram.",
          see: ["Magdeburg Cathedral", "Green Citadel", "Elbe promenade", "Monastery of Our Lady"] },
        T("16:45", "18:40", "Berlin", ["magdeburg", "berlin"], "Change at Potsdam or Berlin-Spandau."),
        { S: "berlin", arr: "18:40", base: 1, stn: "You have arrived. Berlin Hauptbahnhof.",
          see: ["Gendarmenmarkt", "Brandenburg Gate"] },
      ]},

      { id: "G", name: "Quedlinburg, then the Bodetal",
        title: "The Bodetal, then Berlin", hero: "thale",
        intro: "The old town in the morning and then half an hour up the valley: the deepest gorge north of the Alps, with a cable car over it, before the run into Berlin.",
        why: "Swaps Magdeburg's cathedral for the Harz's gorge. A later arrival in Berlin, and the only mountain on the last day.", seq: [
        { S: "quedlinburg", arr: "08:00", dep: "11:30", stn: "Ten minutes from the station into the old town, all of it on the flat until the castle rock.",
          see: ["Marktplatz", "Old town", "Finkenherd", "Schlossberg and collegiate church"] },
        T("11:30", "12:00", "Thale", ["quedlinburg", "thale"], "Half an hour up the Bode on the RE11."),
        { S: "thale", arr: "12:00", dep: "15:30", stn: "The gorge path and both cable cars start within ten minutes of the station.",
          see: ["Bodetal", "Hexentanzplatz", "Rosstrappe"] },
        T("15:30", "19:25", "Berlin", ["thale", "berlin"], "Changes at Magdeburg and Potsdam. It is a holiday, so check the board before you leave the valley."),
        { S: "berlin", arr: "19:25", base: 1, stn: "You have arrived. Berlin Hauptbahnhof.",
          see: ["Gendarmenmarkt", "Brandenburg Gate"] },
      ]},
    ],
  },
];


/* Presets: whole trips, not a pile of choices.

   They used to differ only in how the middle of a day was spent — all four
   slept in the same five towns, which made choosing one a decision about
   nothing. Now each is a different line down the country with a different set
   of beds, so the choice is the one that actually has to be made before
   leaving home.

   What they cannot differ in is the end: Berlin, on the evening of the 3rd,
   on trains the ticket covers. That rules out more than it sounds. Heidelberg
   was asked for and measured — 4 h 49 from Augsburg and 10 h 27 back out to
   Berlin on regional trains — and there is no version of a five-day week that
   affords it. Rothenburg, at 2 h 29 from Augsburg, affords itself easily, and
   the Harz turned out to be nearer Berlin than Thuringia is. */
export const PRESETS = [
  {
    id: "classic", name: "The classic line",
    sub: "Augsburg · Nuremberg · Erfurt",
    why: "Every town on the way that is worth stopping in, and no day that ends after eight. If you are not sure, take this one.",
    pick: { 1: "A", 2: "A", 3: "A", 4: "A", 5: "A" },
  },
  {
    id: "romantic", name: "The Romantic Road",
    sub: "Rothenburg · Würzburg · Bamberg",
    why: "Turns north-west after Augsburg for the walled town everyone means when they say medieval Germany, sleeps in Würzburg under the Residence, and comes back east through Bamberg.",
    pick: { 1: "A", 2: "A", 3: "R", 4: "R", 5: "A" },
  },
  {
    id: "harz", name: "The Harz",
    sub: "Nuremberg · Wernigerode · Quedlinburg",
    why: "Gets the long ride north done on Thursday so that Friday can be spent in the mountains: Wernigerode under its castle, a night inside Quedlinburg's 1300 half-timbered houses, and the shortest run into Berlin of the four.",
    pick: { 1: "A", 2: "A", 3: "H", 4: "H", 5: "H" },
  },
  {
    id: "west", name: "West to Heidelberg",
    sub: "Ulm · Esslingen · Heidelberg",
    why: "The only line that leaves the south–north road. Out of the Alps down the Danube to Ulm, west along the Neckar, a night under Heidelberg castle, and back east through Würzburg. Garmisch, Munich, Augsburg, Würzburg and Erfurt are all still on it, as shorter stops. The most riding of the five, and the least like the others.",
    pick: { 1: "A", 2: "W", 3: "W", 4: "W", 5: "C" },
  },
  {
    id: "alps", name: "Two nights in the mountains",
    sub: "Mittenwald twice · Zugspitze · Munich",
    why: "Gives the Alps a second day and the Zugspitze with it, with no hotel to change on the Wednesday. Pays for it with one long Thursday down through Munich.",
    pick: { 1: "C", 2: "Z", 3: "Z", 4: "A", 5: "C" },
  },
];
