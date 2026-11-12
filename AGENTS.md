# Archerbox development and publishing

This repository is the source of https://archer-box.com and https://www.archer-box.com.
GitHub: https://github.com/arcoon625/archerbox. Cloudflare Builds automatically publishes `main`.

## Default workflow

When Archer asks for a website change, implement it here, verify it, and publish it unless he explicitly requests local-only work, a draft, or review before publishing. His standing preference is to handle routine commits, pushes, and deployment without asking again.

1. Inspect Git status and preserve unrelated user changes. Work in this repository, not the legacy Sites project.
2. Change files in `public/` for the lobby/games, `server/` for existing APIs, and `worker/` for routing/browser sessions. Add SQL changes as new ordered migrations under `drizzle/`; do not rewrite applied migrations.
3. Run relevant game tests for gameplay changes.
4. On `main`, run `npm run ship -- "Describe the change"`. This runs standard checks and a dry-run build, commits the working tree, pushes normally, and waits for the Cloudflare build on that exact commit. Review the working tree first because this command includes all non-ignored changes.
5. For feature branches, use a `codex/` prefix, test and commit normally, and bring the completed change to `main` when publication is authorized. Do not force push or discard others' changes.
6. Confirm the deployment succeeded and check the relevant behavior at https://archer-box.com. If deployment fails, diagnose and fix it; never report a push alone as a successful deployment.

## Hosting

- `wrangler.jsonc` defines the Worker, static assets, D1 binding, and both custom domains.
- Cloudflare Builds runs `npm run check`, then `npm run deploy` (D1 migrations followed by Worker publication).
- GitHub Actions also runs checks and a dry-run build. Keep Cloudflare Builds as the publishing integration.
- The site is independently hosted on the user's Cloudflare account. Do not publish changes to the old Sites project or replace this workflow with Sites hosting.
- Never commit credentials, cookies, local D1 state, `.env*`, `.dev.vars*`, or `node_modules/`.
- Browser profiles use secure cookies; preserve identity isolation and remove untrusted identity headers. Clearing cookies or changing browser/origin creates a new identity.

Explain results in beginner-friendly language. Archer can simply ask to make a change and put it live; he does not need to operate Git or Cloudflare himself.
