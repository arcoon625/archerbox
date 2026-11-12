# Fantasy weeks at the league's pace

Both saved and practice leagues use manual fantasy weeks. The creator starts a
week after everyone sets lineups, then chooses **Finish Week** whenever everyone
is ready. There is no calendar deadline and no automatic next week. Finishing
records the results and reopens lineups, trades, and pickups. **Start Week** locks
lineups for the next scoring period. Week 6 still crowns the champion.

The saved-league API checks creator ownership for both actions and uses its
existing optimistic version update. Repeating Finish Week after it succeeds
cannot settle scores twice. Routine reads refresh live scores but never finish
or advance the week. Existing live leagues lose their old seven-day deadline
when opened; completed historical weeks and rosters are preserved. The local
practice league applies the same migration when resumed.

Open weeks collect eligible matches from their start time without a fixed end.
On Finish Week, the server refreshes from completed matches strictly before its
cutoff time, then freezes that snapshot. The next week begins at its own start
time, so older matches and matches played between weeks cannot score again.
Best-match scoring, stable CPU results, draft clocks, and two-minute waivers
remain unchanged.

`node --test tests/fantasy.test.mjs tests/bundle.test.mjs` checks creator-only
controls, a live week after thirty days, old-deadline migration, late matches,
score cutoffs, repeated Finish requests, open lineups between weeks, forty days
without an automatic next week, fresh scoring, and complete saved/practice
seasons with seeded playoffs. Browser QA uses a local practice league to finish
a week, edit a lineup, and start the next one through the actual buttons.
