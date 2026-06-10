# Publishing the Relay demo to here.now

The fresh UI prototype (Dashboard, Cases, Runs, Plans, Audit) can be published as a **static site** on [here.now](https://here.now). The hosted demo uses **localStorage seed data** only — API routes are excluded from the export.

**Live demo:** https://silent-intent-5wwe.here.now/

---

## How static export works

| Piece | Detail |
|-------|--------|
| Build flag | `RELAY_STATIC_EXPORT=1` enables `output: 'export'` in `apps/web/next.config.ts` |
| Output | `apps/web/out/` (HTML + `_next/` assets) |
| API routes | Must be moved aside during export — Next.js cannot export `app/api/**` |
| Data | `FreshProvider` + `relay-demo-v2` localStorage; no MySQL required on the host |
| Routing | Publish with `--spa` so client-side paths (`/dashboard`, `/cases`, `/runs`) resolve |

Normal `pnpm build` / `pnpm dev` are **unchanged** when `RELAY_STATIC_EXPORT` is unset.

---

## Prerequisites

1. **here.now skill** installed (see `~/.cursor/skills/here-now/` or run `npx skills add heredotnow/skill --skill here-now -g`).
2. **API key** saved at `~/.herenow/credentials` (permanent publishes). Anonymous publishes expire in 24h.
3. **Tools:** `curl`, `jq`, `file`, `pnpm`.

---

## Quick publish (recommended)

From the repo root:

```bash
pnpm publish:demo
```

This runs `scripts/publish-here-now.sh`, which:

1. Temporarily moves `apps/web/src/app/api` aside
2. Runs `RELAY_STATIC_EXPORT=1 pnpm build`
3. Publishes `apps/web/out` to here.now with `--spa`
4. Restores API routes

**Update the existing site** (same slug):

```bash
pnpm publish:demo -- silent-intent-5wwe
```

Or set `HERENOW_SLUG` in the environment:

```bash
HERENOW_SLUG=silent-intent-5wwe pnpm publish:demo
```

---

## Manual steps

```bash
# 1. Move API routes out of the app tree
mv apps/web/src/app/api apps/web/.api-export-bak

# 2. Static export build
RELAY_STATIC_EXPORT=1 pnpm build

# 3. Publish (first time — omit --slug to create a new site)
~/.cursor/skills/here-now/scripts/publish.sh apps/web/out \
  --client cursor \
  --spa \
  --title "Relay — QA Workspace Demo" \
  --description "Relay prototype demo: Dashboard, Test Cases, and Test Runs"

# 4. Update an existing site
~/.cursor/skills/here-now/scripts/publish.sh apps/web/out \
  --client cursor \
  --spa \
  --slug silent-intent-5wwe

# 5. Restore API routes
mv apps/web/.api-export-bak apps/web/src/app/api
```

---

## Files to know

| Path | Purpose |
|------|---------|
| `apps/web/next.config.ts` | Gates `output: 'export'` behind `RELAY_STATIC_EXPORT=1` |
| `apps/web/out/` | Generated static site (gitignored) |
| `scripts/publish-here-now.sh` | One-command publish script |
| `.herenow/state.json` | Local publish cache (gitignored; do not commit) |
| `~/.herenow/credentials` | API key (gitignored; never commit) |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `force-dynamic` / API export error | Ensure `apps/web/src/app/api` is moved out before export |
| 404 on `/dashboard` after publish | Republish with `--spa` |
| Stale demo in browser | Hard refresh; demo state is per-browser localStorage |
| `SSL certificate problem` (curl) | Run publish from a shell with valid CA certs, or use the project's normal terminal |

---

## Docs

- here.now skill: `~/.cursor/skills/here-now/SKILL.md`
- Platform docs: https://here.now/docs
