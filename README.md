# Archerbox

A browser arcade with 21 bundled games, 3D avatars, friends, multiplayer, fantasy leagues, and shared leaderboards.

Source: https://github.com/arcoon625/archerbox
Planned custom domain: https://archer-box.com

## How it works

- `public/`: HTML, CSS, JavaScript, Three.js, artwork, sounds, and games. Static files are served directly by Cloudflare.
- `worker/index.js`: standalone Cloudflare Worker that routes requests to the existing game APIs.
- `server/`: server-owned game rules, friends, fantasy leagues, and leaderboards.
- `drizzle/`: ordered SQL migrations that create the D1 database tables.
- `tests/`: game rules and backend tests. `scripts/` contains optional asset/data maintenance tools.

This copy does not require React, Next.js, Vinext, Sites, or a separate always-on server. A Worker bundle is produced automatically by Wrangler. Third-party assets retain their existing notices (including `public/vendor/LICENSE.txt`).

## Player profiles

There are no passwords or ChatGPT accounts. The Friends client creates a browser profile on first connection. A cryptographically random session token is kept in an HttpOnly, SameSite=Strict cookie (Secure on HTTPS). Only its SHA-256 hash is stored in D1. Incoming identity headers are discarded; the Worker supplies the verified player ID to existing APIs.

The browser profile lasts up to one year. Clearing cookies, changing browsers, changing website domains, or expiration creates a new identity. There is no account recovery or cross-device login. Use an arcade nickname rather than personal information. Existing Sites database records and browser saves are not automatically migrated; this deployment starts with a new D1 database. Browser-local favorites and avatars remain local.

## Run on your computer

Install Node.js 22.13 or newer, then in this folder run:

```sh
npm ci
npm run db:local
npm run dev
```

Open the local URL Wrangler prints. Local database state is ignored by Git. Development does not need a Cloudflare login.

## Check the project

```sh
npm run check
npm run build
```

`check` validates all bundled games, rankings, multiplayer rules, and browser-session security. `build` bundles the real Worker without publishing. `npm test` runs the broader existing game suite. GitHub Actions runs checks and a dry-run build on pushes and pull requests.

## Deploy to your own Cloudflare account

Use the Free Workers plan and D1. Paid services are not required for initial setup. Free request, CPU and database quotas still apply; live multiplayer is significantly more demanding than saving a final score.

1. Sign in at https://dash.cloudflare.com (create the account yourself if necessary).
2. In this folder run `npx wrangler login` and approve the requested access in your browser.
3. Run `npx wrangler d1 create archerbox-db`. Copy its `database_id` into the `DB` entry in `wrangler.jsonc`, replacing the placeholder. The database ID is configuration, not a password.
4. Run `npm run deploy`. This applies the SQL migrations to D1 before deploying the Worker and its static files.
5. Open the `workers.dev` address printed by Wrangler. Test two browsers with different profiles and friend codes, and verify a score persists after reloading.

Future manual updates use `npm run deploy` from a clean, tested checkout. Never put API tokens, environment secrets, cookies, or local database files in Git.

### Optional automatic deployment from GitHub

In Cloudflare open **Workers & Pages → archerbox → Settings → Builds**, connect `arcoon625/archerbox`, and select branch `main`. Authorize the GitHub connection yourself if prompted. Set:

- Root directory: repository root
- Build command: `npm run check`
- Deploy command: `npm run deploy`

The checked-in GitHub workflow only tests; it does not publish or need Cloudflare secrets. Cloudflare Builds owns deployment credentials when connected. Do not enable a second deployment integration for the same Worker.

## Connect archer-box.com

Keep the registration at Squarespace. For a standard Cloudflare Workers custom domain:

1. Add `archer-box.com` to Cloudflare and select the Free website plan.
2. Review imported DNS records; preserve any email and domain-verification records.
3. Cloudflare provides two nameservers. In Squarespace, open the domain's DNS/nameserver settings and replace its nameservers with the exact two Cloudflare provides. This delegates DNS; it does not transfer the registration.
4. Wait for Cloudflare to mark the domain active.
5. In the Worker, open **Settings → Domains & Routes → Add → Custom Domain** and add `archer-box.com` (and `www.archer-box.com` if desired). Let Cloudflare manage the corresponding DNS and HTTPS certificate.
6. Verify the custom domain, profile saving, and leaderboards over HTTPS. Use the final domain for player profiles, because cookies from `workers.dev` do not transfer.

Nameserver values are unique to the Cloudflare zone. Do not copy example nameservers or delete unrelated DNS records. Domain renewal remains billed by Squarespace.

## Original game documentation

See `docs/original-game-notes.md` for game design and maintenance history. Its old Sites publishing/sign-in instructions do not apply to this independent deployment.
