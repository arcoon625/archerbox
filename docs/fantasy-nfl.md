# NFL fantasy

New leagues can select NFL players or the existing Archerbox player pool. Existing leagues retain their original mode, rosters and results. NFL leagues draft actual NFL athletes and team defenses; CPU managers draft from the same pool.

NFL scoring uses ESPN's public **standard, non-PPR** `appliedTotal` for the exact NFL season and regular-season scoring period. The parser requires actual (`statSourceId: 0`), weekly (`statSplitTypeId: 1`) results. It rejects other years, other weeks and projections. Thus 50 receiving yards plus a receiving touchdown is 11 points, with no reception bonus. Other positions use the same ESPN standard format.

The creator chooses a completed NFL week before manually starting a fantasy week. Each NFL week can be used once per league. Nine starters lock when the fantasy week begins; only their points count. Finishing a week freezes its results. Finishing the sixth fantasy week (the championship) deletes the league for all managers and returns them to My Leagues with a winner notice. Completed leagues saved by older versions are removed on the next visit; active leagues are retained. Practice leagues clear their device save after the championship so a new draft can begin. Nothing starts or ends because a calendar week elapsed. Missing provider results remain null and display an em dash (contributing zero); schedule-confirmed byes score zero.

`scripts/update-nfl-fantasy.mjs` regenerates the dated roster and completed-week snapshot from ESPN's public fantasy defaults, scoreboard and team APIs. Run it with a fresh cache directory to force a fresh import. The checked-in snapshot contains 2026 Weeks 1–6, verified October 23, 2026 in Los Angeles. It contains 710 athletes and defenses. This import uses `leaguedefaults/1`; `/3` is PPR and is intentionally not used.

The hosted provider checks public scores with a 15-minute cache and a 60-second minimum between forced refreshes. It coalesces concurrent requests, times out upstream requests and falls back to the last verified results while preserving their original check time and showing a saved-data notice. It sends no Archerbox identities, league codes or account cookies to the source. Incomplete NFL weeks cannot start. Historical fantasy weeks never change during a refresh.

Validation: `node --test tests/fantasy.test.mjs tests/nfl-fantasy.test.mjs tests/fantasy-cleanup-ui.test.mjs tests/bundle.test.mjs`.
