# Blocking notes for Touchdown Rush

Reference game: Philadelphia Eagles vs. Kansas City Chiefs, Super Bowl LIX,
February 9, 2025. Research uses the NFL's written report, official team reporting,
and the official first-sack highlight description. Video playback was not
available in the research browser; this is not a frame-by-frame film review.

## What the sources establish

- Philadelphia recorded six sacks without blitzing. A blocker cannot guarantee
  that a defender is removed from the play. [NFL game report](https://www.nfl.com/news/chiefs-eagles-in-super-bowl-lix-what-we-learned-from-philadelphia-s-40-22-win)
- The Eagles describe immediate pressure by Josh Sweat on their first sack.
  Early defensive wins need to be possible. [Official play description](https://www.philadelphiaeagles.com/video/highlight-josh-sweat-corrals-patrick-mahomes-to-notch-first-sack-of-super-bowl-lix)
- Saquon Barkley gained 57 rushing yards on 25 carries. Strong offensive lines
  do not make every run a big gain. [NFL rushing report](https://www.nfl.com/news/eagles-rb-saquon-barkley-sets-new-single-season-mark-for-most-rushing-yards-including-playoffs)
- Before the game, Lane Johnson explained how protection to one side can be
  attacked from the opposite side. Position and assignments matter.
  [Eagles preparation notes](https://www.philadelphiaeagles.com/news/super-bowl-lix-kansas-city-chiefs-vs-philadelphia-eagles-daily-updates)

These are evidence for design choices, not measurements of block duration,
player ratings, or individual blocking technique. One game is not a league-wide
statistical target.

## How the game changes

1. Contact slows defenders but permits sideways movement while engaged.
2. Contests expire sooner, with duration influenced by difficulty, role,
   matchup variation, and approach angle.
3. Blocks require front-facing contact. A player cannot catch a defender by
   touching their back or facing away from them.
4. Defenders can push a blocker back. Receivers are less effective against
   defensive linemen than offensive linemen are.
5. Bodies remain solid, but their contact area is smaller. A nearby blocker
   does not automatically prevent a defender from tackling a reachable runner
   on the same side of contact.
6. CPU defenders try paths around blockers immediately. Offensive teammates
   no longer run down defenders at the previous boosted blocking speed.

## Repeatable game comparison

Pro difficulty, starting formation, sprint toward the called running lane,
no jukes, identical inputs before and after the change. These are deterministic
game checks, not NFL statistics or an average across real players.

| Called run | Previous gain | Updated gain |
| --- | ---: | ---: |
| Inside Run | 7.9 yards | 2.2 yards |
| Sweep Left | 13.0 yards | 5.4 yards |
| Sweep Right | 13.0 yards | 3.9 yards |

Collision, sidestepping, reach tackles, pushback, difficulty, and serialized
friend-match behavior are checked in `tests/football-blocking.test.mjs`.

## Later running-lane update

The user requested occasional larger gains and a QB sneak. This is an arcade balance update; the following are repeatable game outcomes, not NFL statistical estimates or additional film research.

- Four pre-snap fronts cycle after actual scrimmage snaps. Wider defensive tackles leave an interior opportunity; a pinched front makes the edge more attractive. Invalid or repeated live calls cannot reroll a front.
- The CPU front seven initially defend individual gaps, then pursue. Linemen with an existing front-facing engagement steer briefly away from the called lane. Blocks retain their existing durations and solid-body collision rules, and defenders still shed, sidestep and tackle reachable runners.
- The added QB Sneak (R) starts behind the center, 1.3 yards behind the line. It is separate from the five-yard-deep QB Draw (Q). Sneaks get no special tackle immunity; the shorter start also uses a shorter handoff grace period. Middle linebackers retain an interior responsibility so an empty middle does not guarantee a long touchdown.
- Existing plays, passes, field goals, PATs, punts, returns, injuries, substitutions and fantasy rushing stats remain.

Pro difficulty, starting Cowboys/Chiefs units, sprint toward the called lane, no jukes, simulated at 120 steps/second. Different starting fronts with the same inputs yield these gains:

| Call | Example short gain | Example open-lane gain |
| --- | ---: | ---: |
| Inside Run | 2.2 yards | 12.6 yards |
| Counter Run, following its changing lane | 1.9 yards | 13.4 yards |
| QB Draw | 3.9 yards | 14.4 yards |
| QB Sneak | 1.3 yards | 5.6 yards |
| Sweep Right | 1.5 yards | 5.4 yards |

These samples are not guaranteed gains. Waiting lets the lane close; steering, sprint timing, difficulty, field position, jukes and human defenders change results. `tests/football-running-lanes.test.mjs` checks these varied outcomes, normal tackles/scoring, serialized state and friend control, while the original blocking regression checks remain unchanged.
