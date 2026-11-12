# Touchdown Rush Creation Club

The football setup now has Create a Player, Create a Team and My Creations. Up to 12 players and 6 clubs save on the current browser under `archerbox-football-creators-v1`. Existing NFL data stays unchanged.

Players choose a name, one of 17 positions, a team, height (54–90 inches), weight (100–380 lb), jersey number and skin tone. Measured height, body mass and skin color flow through scrimmage and special-team personnel into the actual 3D models. Created players replace the first available matching position in that team's lineup. Position capacity and duplicate created-player numbers are checked before saving. Build affects a bounded speed estimate. Created quarterbacks can choose passing accuracy from 55 to 99, using a numeric field or Set to 99 button. Other abilities retain their position-based defaults. Old saved quarterbacks without an accuracy field keep 82. With Player Traits enabled, the saved accuracy reaches real pass dispersion and both friend perspectives; the global balanced mode still uses 75. Gameplay still controls the quarterback before a pass, the receiver after a catch, the running back on handoffs, and switchable defenders.

Custom teams choose a city, nickname, two colors and crest. They have original fictional offensive, defensive, specialist and reserve rosters. Their crest appears on helmets, the jersey chest, fan shirts, midfield and the stadium scoreboard. Selecting a custom team as the home team uses its colors for 95% of fans and its name in the end zones. Clubs can be chosen as CPU opponents too.

Friend-match configuration carries sanitized club and player records to the authoritative game server. The opponent receives the corresponding identity and appearance. Built-in NFL roster and specialist tests are preserved. Saving reports an error if browser storage fails before altering current creations.

## Logo artwork and scope

Four original transparent raster crests were generated with the built-in Image Generation tool. The runtime combines these AI-designed artworks with the chosen name and colors; it does not call a live image model or claim to generate an unlimited new illustration on each click. The Build My Logo button suggests one of the four crests from the city and nickname. The UI describes this explicitly and permits manual crest selection.

Saved project assets:

- `public/games/touchdown-rush/creator-logos/thunder.png`
- `public/games/touchdown-rush/creator-logos/shark.png`
- `public/games/touchdown-rush/creator-logos/dragon.png`
- `public/games/touchdown-rush/creator-logos/knight.png`

Final prompt template, used separately for each subject:

> Use case: logo-brand. Asset type: original team crest for a child-friendly 3D American football game. Primary request: [subject]. Bold premium sports identity illustration, isolated centered emblem, clean sculpted shapes, white and silver outer border, deep navy outlines, vivid teal and gold highlights. No lettering, no words, no numbers, no existing team brands. Square composition, entire emblem visible with 12% transparent margin. Genuinely transparent background. Readable at helmet-decal size. Original design.

Subjects: (1) a fierce lightning bolt cutting through a football-shaped shield; (2) a powerful shark head in three-quarter profile, sporting mascot badge; (3) a fierce emerald dragon head with sweeping horns, sporting mascot badge; (4) a heroic medieval knight helmet with a sweeping plume, sporting mascot badge.

Validation: `node tests/football-creators.test.mjs` exercises all 17 positions on all 32 NFL teams plus a custom club; specialist units, persistence, invalid input, individual model height and skin, source roster isolation and both friend perspectives. Browser QA covers club creation, name-based crest selection, a created quarterback, model preview, save/reload and match launch.


## Reload warning recovery

The lobby previously treated every window error as a failed game and immediately placed a blocking reload overlay over football. Browser layout notices and a detached-node error from page inspection could therefore interrupt a working game. Known nonfatal notices are now filtered without discarding errors attributed to actual game source files.

Football now reports recovery after three complete rendered frames. The lobby delays the reload overlay while recovery is possible and clears it when rendering recovers. Errors that keep rendering from succeeding still surface. Graphics-context loss suspends football simulation while Three.js restores the context; the game retains its current match rather than starting a new one. Saved players, teams and coin storage keys are unchanged. Creator previews report successful frames too. The inspection harness stays outside public assets.

Checks: `node tests/game-errors.test.mjs`, the creator/accuracy tests and bundle checks cover nonfatal notices, real faults, delayed errors, successful-frame recovery, stale timer cleanup, old saves, saved 99 accuracy and friend perspectives.

## Repeated editor crash (November 2026)

A live browser stack identified `getMaxPrecision → WebGLRenderer → createPreview` with a null precision error. Reopening the same canvas immediately after `forceContextLoss()` reproduces the exact error. The editor now keeps one lazy renderer per canvas, suspends animation/observation and frees the player model when hidden, and resumes that renderer on the next edit. It never forcibly loses its context on tab changes or dialog close. Pending input updates cannot restart a hidden preview.

Preview context loss pauses rendering until restoration. Initialization, update, or render failures display a local preview notice while the player form remains usable; these optional preview failures do not become unhandled football errors. Genuine main-field failures retain the existing recovery handling. No saved-data keys or roster data changed. `node tests/football-preview.test.mjs` covers repeated reopening, resource lifetime, context restoration and the exact failed-initialization message. Browser QA also exercises the real editor and GPU.
