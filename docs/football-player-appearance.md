# Football player appearance

The football models previously chose a color by hashing the printed name into
six generic colors. This had no relationship to a player's appearance. Models
now use the real athlete ID that already drives names, rosters and substitutions.

`appearance-data.js` contains cosmetic RGB approximations sampled from the
visible cheeks in public [ESPN headshots](https://a.espncdn.com/i/headshots/nfl/players/full/3918298.png).
Jack Strand uses his [official Falcons portrait](https://www.atlantafalcons.com/team/players-roster/jack-strand/) because ESPN had no headshot.
These are appearance colors, not racial/ethnic classifications. Photos and
lighting vary, so the colors are visual approximations rather than exact skin
measurements. No appearance value affects speed, accuracy, injuries or any rule.

Run `python3 scripts/update-player-appearance.py` to refresh the roster snapshot.
It includes all 32 teams' game starters, active reserves, kicking/return units
and the Classic Hill guest. Source photos stay in `/tmp/archer-player-appearance`. The later 2026 athlete
upgrade also bundles source headshots for individual face projection; see
[football-realism-2026.md](football-realism-2026.md). Contact sheets put each
portrait beside its sampled color for visual review. Any explicit reviewed
corrections belong in `scripts/player-appearance-overrides.json`, with a source
and reason. Missing images are reported, not replaced with a name-based guess.

One shared skin material covers each model's face, neck, arms and calves. Kits,
jersey edits and role changes preserve the athlete ID. Personnel changes already
rebuild models, so a backup or kicker receives their own color. Friend views
preserve athlete IDs even when actor slots and team seats are swapped.

`node tests/football-appearance.test.mjs` checks roster coverage, material
consistency, jersey/home/away changes, backups, specialist units, Classic Hill
and both friend seats. Existing model/animation checks cover geometry and draw
budgets. Unknown future or synthetic IDs use a documented neutral placeholder
until a sourced entry is added.
