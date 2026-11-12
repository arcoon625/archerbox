# Home stadium presentation

The setup screen lets either participating team host. The choice persists with
the other local football settings. The host of a friend match chooses the home
side; the server keeps that team's ID in both player perspectives. It does not
change possession, blocking, player traits, scoring, kicks or the match clock.

Occupied seats are generated first, then a deterministic shuffle assigns
`round(fanCount * .95)` spectators to the home team. The remainder support the
visitor. Every spectator has an instanced chest badge bearing their assigned
team's mark; shirt/cap palettes use that team's primary, accent and white.
Skin and hair selection remain independent of team assignment. All three
stadiums retain 43 instanced stadium draws and roughly 3.12 million triangles.

The 32 local transparent PNG logos come from the public ESPN team-logo URLs
already supplied by the team's cached 2026 roster feed, such as
`https://a.espncdn.com/i/teamlogos/nfl/500/sf.png`. Washington's asset uses `wsh`.
Team marks remain their owners' property. There are no runtime third-party
image requests. Image data is cached; each scene owns its GPU texture and
ignores asynchronous callbacks after disposal.

The home mark appears at midfield, both end zones carry the home name, and the
seats/perimeter/ribbon use home colors. One textured field surface adds grass
fibers, alternating mowing strips, painted numbers, goalward arrows, sidelines,
hashes and the outer safety border. Eight rectangular orange foam pylons replace
the cone-like end-zone decoration. Low yard placards and a live down marker sit
outside play. Dimensions use the existing yard coordinates: 120 by 53⅓ yards,
10-yard end zones, 18½ feet between the inner hash edges, two-foot hashes and
four-inch ordinary lines. Placement follows the
[2026 NFL field-marking reference](https://operations.nfl.com/rules-officiating/2026-nfl-rulebook).
This is an original stadium, not an exact replica of a particular NFL venue.

Both physical scoreboards have steel supports, bezels and an LED-style screen.
The display orders visitor/home consistently and shows actual scores, clock,
possession, down, distance, ball spot and kicking state. It never invents
quarters or a play clock for the arcade match. Canvas redraws are throttled and
invalidate for changed game state or loaded logos.

“View Home Stadium” previews the field, board and fan shirts before kickoff,
with phone-friendly camera framing. Closing restores the existing setup scene
without rebuilding it. The tour freezes gameplay and does not alter match data.

Verification: `node --test tests/football-stadium.test.mjs tests/bundle.test.mjs
tests/multiplayer.test.mjs`, plus browser inspection of both teams hosting,
all three tour views, phone layout and normal gameplay.
