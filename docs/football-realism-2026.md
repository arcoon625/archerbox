# Touchdown Rush 2026 athlete upgrade

This is an original browser football game. It is not Madden or a claim of
Madden-level scans, motion capture, physics or animation quality.

## Athlete models

`player-profiles.js` contains 1,816 roster identities with public height/weight
measurements from the dated 2026 ESPN roster feeds. Inches are converted to the
field's yard scale, with a small helmet allowance. Positional builds and body
mass affect cosmetic proportions only. A smaller running back and a tall QB
are visibly different. Match collisions and game rules remain independent.

The torso and limbs use continuous tapered surfaces, with shoulder padding,
sewn jersey creases, woven fabric, pores, shaped calves, curled glove fingers,
ankle collars, molded cleats, laces and seams. The helmet's open eye window
fits the face; existing vents, ear ports, cage and chin straps remain.

Each model projects its own public portrait onto a curved face with a nose and
cheek relief. This preserves actual eyes, facial hair and mouth detail without
claiming an exact 3D likeness. [Apple Vision](https://developer.apple.com/documentation/vision/vndetectfacerectanglesrequest)
is used offline to find portrait UV rectangles, not to identify people or
classify demographics. Stable IDs already supplied by the roster select the
portraits. Full source portraits are bundled for starting skill players;
smaller source-CDN images cover other players. WebP encoding preserves the
source dimensions while keeping downloads and source publication compact.
Jack Strand uses his official
Falcons portrait. Images load locally from the Site with a procedural face
fallback, and async loads are disposed safely after team changes.

The new Player Spotlight exposes the actual game models, with a player picker,
real measurements, rotation by drag/buttons/arrows, full-body/face zoom, and
standing, running and throwing poses. It does not run or change match state.
The same model code renders CPU players, specialists, backups and friend seats.

## 2026 season

The game title, setup and Spotlight clearly identify 2026. `season-stats.js`
adds 1,341 available 2026 regular-season stat lines, checked October 20, 2026.
The original bounded ratings use the 2026 line once sample thresholds are met:
40 QB pass attempts, 15 WR/TE targets, 30 RB carries and four games, or four
defensive games. Otherwise a 2025 baseline is labeled explicitly on the card
and its source link still points to 2025. Older information is never relabeled.
The normal neutral prior and classic/historical speed notes remain. The current
[NFL passing table](https://www.nfl.com/stats/player-stats/category/passing/2026/REG/all/passingcompletionpercentage/DESC)
was used for a spot-check. These remain original game estimates, not official
NFL ratings or a live weekly update service.

## Refresh and verification

- `swift scripts/extract-player-faces.swift /tmp/archer-player-appearance`
- `python3 scripts/update-player-profiles.py`
- `python3 scripts/update-player-traits.py --season 2026`
- `node tests/football-realism-2026.test.mjs`

Existing model, skin consistency, trait, passing, running, kicking, injury,
celebration, roster, friend and fantasy regressions also apply. Detailed models
are capped by draw/triangle budgets; this upgrade does not promise a fixed FPS
on every device.
