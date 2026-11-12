# Multiplayer fantasy leagues

Open Fantasy from the Archerbox lobby. Create league and Join league are now the primary actions; device-only practice is secondary.

Creating a saved league produces a server-generated eight-character alphanumeric code, protected by a database unique index and collision retries. Share that code with up to thirteen other managers. They choose Join league, enter the code and a team name, and join the same server-backed league. Codes accept either case and trim surrounding spaces at the API. A friend code is separate from a league code.

First-time managers choose their Archerbox player-pool position within the create/join form. The form explains the opt-in and registers before creating or joining. Existing player-pool positions are preserved. No separate registration page is needed.

Saved leagues support any 2–14 managers. The lobby shows joined managers and the next available seat, a selectable code, Copy code, automatic four-second refresh, a manual refresh and connection recovery. Draft picks, lineups, trades and matchups use the existing shared league API. Only the creator starts the draft or controls fantasy weeks. The creator can start as soon as 2 managers join, or wait for up to 14. Starting locks that actual manager count and closes new membership. No CPU managers are added to saved leagues; solo practice still has three CPUs; existing managers can reopen with the same code. Join retries use optimistic version checks, so simultaneous arrivals cannot overwrite seats. Both create and join enforce the twelve-league limit. A deleted league returns a clear error even if deletion occurs during joining.

NFL standard scoring, manual fantasy weeks and championship cleanup remain unchanged. Leagues persist in D1, rather than device storage. Practice remains local.

Site access is separate: friends need their own signed-in account and permission to open Archerbox. A league code does not grant access to the hosted website. This change preserves the existing site audience.

Verification:

- `node tests/fantasy-leagues.test.mjs`: collision retry, code validation, simultaneous joins, capacity, authorization, shared picks, draft membership lock, league limits.
- `node tests/fantasy-leagues-ui.test.mjs`: actual create/join handlers against the real API with an isolated SQLite database, integrated opt-in, retained form errors, polling, connection recovery, saved leagues and stale-response protection.
- Existing fantasy, NFL fantasy and championship cleanup suites.
- Local browser check with two isolated managers using the real API, incorrect and lowercase codes, copying, automatic lobby updates, draft start and a 390px phone preview. No hosted leagues or player progress were changed for QA.

League sizes are verified by `node tests/fantasy-sizes.test.mjs`: every size 2–14 in both modes, full legal rosters, dynamic snake rounds, round-robin coverage, rotating byes, consolation games and full season completion. Two- and three-manager leagues have four regular weeks and a Week 5 championship between the top two. Larger leagues keep top-four semifinals and the Week 6 championship; lower teams play consolation games or have a bye. Bye scores contribute to points but give no win or loss. Existing four-team leagues, their saved results and manual-week controls stay valid.
