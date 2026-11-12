# Original player traits for Touchdown Rush

2026 update: `season-stats.js` supplies 1,341 current-season lines and is now
preferred once position-specific samples are sufficient. A smaller 2026 sample
falls back to 2025 with an explicit label and correctly dated source link. See
[football-realism-2026.md](football-realism-2026.md) for the selection rules.
`update-player-traits.py` now defaults to 2026; use `--season 2025` to refresh
the older baseline. The earlier derivation notes below still describe that baseline.

The user requested real strengths and weaknesses: Hill's speed, McCaffrey's finishing, accurate quarterbacks and meaningful disadvantages. These are original arcade estimates guided by public production and historical speed evidence. They are not official NFL, ESPN, Next Gen Stats or Madden ratings, pure scouting grades, present-day measured running speeds, or real injury predictions.

## Sources and snapshot

`trait-stats.js` contains 1,116 available athlete stat lines from **2025 regular-season** ESPN production endpoints. The source URL template is `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2025/types/2/athletes/{id}/statistics/0`. Inputs are explicitly dated and refreshed only by `scripts/update-player-traits.py`. New 2026 players without sufficient 2025 NFL data receive a balanced baseline, not an invented penalty. No public feed is requested during gameplay.

Cross-checks and historical speed evidence:

- [NFL 2025 passing table](https://www.nfl.com/stats/player-stats/category/passing/2025/REG/all/passingcompletionpercentage/DESC), for a sample cross-check of completion percentages. Completion rate includes scheme, depth and receiver effects; it is not a pure accuracy measurement.
- [NFL McCaffrey production report](https://amp.nfl.com/news/christian-mccaffrey-49ers-rb-comeback-player-of-year-2025), supporting the all-purpose finishing and receiving emphasis.
- [NFL Hill tracking report](https://www.nfl.com/news/next-gen-stats-leaders-who-s-fastest-who-s-most-efficient-0ap3000000756630), historical evidence for the classic speed trait, not a claim of current speed.
- [Worthy's official 2024 combine result](https://www.nfl.com/videos/xavier-worthy-runs-official-4-21-second-40-yard-dash-at-2024-combine).
- [Seahawks Metcalf report](https://www.seahawks.com/news/dk-metcalf-just-a-dominant-player-in-seahawks-win-over-49ers), reporting a 4.33-second combine sprint.
- [Vikings McCaffrey prospect profile](https://www.vikings.com/news/prospect-profile-stanford-rb-christian-mccaffrey-18711100), reporting a 4.48-second combine sprint.
- [NFL Jackson rushing report](https://www.nfl.com/_amp/lamar-jackson-dalvin-cook-among-nfl-s-10-most-explosive-runners), supporting an explosive QB mobility trait.

A combine sprint is not identical to in-pads football speed. Most speed ratings stay balanced where there is no individual speed evidence; QB mobility uses rushing production as an explicitly labeled arcade estimate. No random athlete-ID-based abilities are invented.

## Ratings and effects

75 is neutral. Ratings are bounded 55–99 and shown in setup player cards, with green strengths, amber weaknesses, source notes, dates and links. Limited samples are identified as balanced. The controlled player's key ratings are shown during play.

- QB accuracy uses completion percentage with 150 attempts of neutral prior weight, and requires at least 40 attempts. Accurate QBs have less pressure/movement/range scatter; below-average ratings add a small placement error. Throw outcomes still follow the physical ball path. Open short throws remain easier than pressured or risky throws.
- Receiving reliability uses catches/targets relative to role, with 35 neutral targets of prior weight and a 15-target minimum. This is not a measured drop rate. It slightly changes catch reach, and below-baseline hands add at most a 10% arcade drop chance at the first valid catch opportunity. A drop becomes a normal incompletion using one down, with no yards or duplicate stats.
- Finishing uses rushing efficiency and scrimmage production, requiring 30 carries/four games. McCaffrey receives an explicit all-purpose emphasis. It does not claim he adds a measured number of contact yards on every real carry.
- Tackling is a small production-based game estimate using tackles/game, role baselines, and a capped sack contribution, with an eight-game minimum. It adjusts reach slightly and resistance to a finisher. Counts depend on role/opportunity; this is not a pure tackling grade.
- Speed changes actual movement for humans and CPUs. Throw route prediction and receiver movement share the same speed factor, preventing fast receivers from being systematically led incorrectly. A rating of 99 gives roughly 11% more movement speed than the balanced baseline; it does not reproduce a literal mph value.

## One to three extra yards after contact

An eligible finisher can win one contact contest per play. The game then permits up to 1–3 **actual forward yards** after winning the initial contact. The player must continue moving. A second defender can end the run immediately; standing still ends the contest after 0.7 simulated seconds. There is no general juke/invulnerability extension.

The final position is capped before touchdown detection, including coarse steps, so a one-yard allowance cannot accidentally produce more yards or a false touchdown. Boundary, touchdown, PAT, clock, injury and normal rushing/receiving/fantasy accounting still use the actual end position. Only a completed tackle is credited; a failed initial contact does not count twice. The state resets on the next lineup/snap/kick.

## Classic Hill and correct teams

[NFL's Hill page](https://www.nfl.com/players/tyreek-hill/stats/career) identifies him as a free agent in this snapshot, and he is absent from the bundled current team units. **Classic Hill** is therefore an optional, labeled Miami guest-star variant using Hill #10 at WR. It is not presented as a current signing or a complete historical team. `gameRoster` copies the selected offensive unit; it does not mutate current roster data. Standard and classic customization numbers have separate keys. Specialist roles and eleven distinct players/numbers are preserved.

## Shared matches and balanced mode

Traits are on by default; setup Off gives all players balanced abilities. The inviting friend's setting applies to both teams. Each friend can choose the Classic Hill variant for their own Miami team. The server derives all profiles from athlete identities and sanitized booleans, never client-supplied numeric ratings. Snap/athlete-based contact and catch rolls survive JSON persistence without per-frame rerolls. Guest views remap contact actor IDs while preserving real athlete IDs, profiles and evidence. Injured backups receive their own profile instead of inheriting the starter's strengths.

Verification: `tests/football-traits.test.mjs` checks dated data bounds, genuine strengths/weaknesses, unknown baselines, Hill's actual movement, rated route leads, comparative pressured completions, weaker-hand drops, physical finishing in both directions/three step sizes, second-defender and timeout stops, real yard/TD/PAT stats, coarse-step touchdown safety, backups, classic roster isolation/units, balanced mode and authoritative friend views. The older pure flight/route fixtures explicitly choose balanced mode so geometry is tested independently of the new optional traits.
