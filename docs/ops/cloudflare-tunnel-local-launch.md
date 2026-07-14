# Local full-stack launch via Cloudflare Tunnel

How to expose Relay’s local Docker + Next.js stack on a temporary public HTTPS URL for demos.

**Audience:** Noel / Shaun (or anyone launching on a real Mac with Docker).  
**Related Cursor prompt:** `docs/cursor-prompts/main/task-02-relaunch-cloudflare-tunnel.md`  
**Short Claude checklist:** `docs/claude/mvp-backend/cloudflare-tunnel-checklist.md`

This is **local launch only**. Hosted Netlify/DB decisions (Aiven / Oracle / company AWS) are separate.

---

## What you get

| Piece | Role |
|---|---|
| Docker Compose | MySQL + OpenSearch on this machine |
| `pnpm dev` (or `pnpm start`) | Next.js on `http://localhost:3000` |
| `cloudflared` | Public HTTPS → your localhost:3000 |

The public URL hits **your laptop’s DB**. If the machine sleeps, `cloudflared` stops, or Next dies, the URL dies with it.

---

## Prerequisites

- Branch: `main` (full backend)
- Docker Desktop running
- Node / `pnpm` as usual for this repo
- `cloudflared` installed (`brew install cloudflared` on macOS)

```bash
git checkout main && git pull origin main
pnpm install
pnpm docker:up
pnpm db:migrate
pnpm db:seed          # only on a fresh DB — re-seed wipes seed-org projects
pnpm dev
curl -s http://localhost:3000/api/health   # expect 200, mysql: ok
```

---

## Choose a tunnel mode

### Quick Tunnel (default for one-off demos)

- No Cloudflare account
- Instant
- URL is random: `https://<words>.trycloudflare.com`
- **Changes every time you restart `cloudflared`**
- Stays up only while the `cloudflared` process (and this machine / Docker / Next) are running
- Cloudflare gives account-less tunnels **no uptime guarantee**

```bash
cloudflared tunnel --url http://127.0.0.1:3000
```

Prefer `127.0.0.1` over `localhost` to avoid IPv6 oddities.

### Named Tunnel (stable hostname)

- Needs a Cloudflare account + a domain on Cloudflare
- Same hostname across restarts
- One-time interactive login (`cloudflared tunnel login` opens a browser)

```bash
cloudflared tunnel login
cloudflared tunnel create relay-demo
# ~/.cloudflared/config.yml — ingress: <hostname> -> http://127.0.0.1:3000
cloudflared tunnel route dns relay-demo <hostname>
cloudflared tunnel run relay-demo
```

Use Quick for a single sitting. Use Named when you’ll return tomorrow without resharing a new URL.

---

## Env vars (required after every URL change)

Root `.env` (loaded by `apps/web/next.config.ts`):

| Variable | Must be |
|---|---|
| `NEXTAUTH_URL` | Exact public URL (https, **no** trailing slash) |
| `NEXT_PUBLIC_APP_URL` | Same public URL |

Then **restart Next.js** so both are picked up. For Quick Tunnels, redo this on every `cloudflared` restart.

When done demoting, set both back to `http://localhost:3000` for normal local work.

Middleware (`apps/web/src/middleware.ts`) uses `NEXTAUTH_URL` as the base for unauthenticated → `/login` redirects. Without that, behind Cloudflare you get `https://localhost:3000/...` and the browser shows `ERR_SSL_PROTOCOL_ERROR` (HTTPS against plain HTTP Next).

---

## Verify

```bash
curl -s https://<tunnel-url>/api/health
# → {"status":"ok",...,"mysql":"ok"}
```

1. Open `https://<tunnel-url>/login` (not `https://localhost:3000`)
2. Sign in: `ssevume@ti.com` / `relay-dev-2026`
3. Confirm `/DP/dashboard` shows real seed data (cases/runs), not an empty shell

If health works via curl but the browser can’t resolve a brand-new `*.trycloudflare.com` name, wait ~30–60s for DNS, or flush DNS cache. New Quick Tunnel hostnames sometimes lag briefly.

---

## Lifetime / teardown

| Event | Effect |
|---|---|
| Leave `cloudflared` + `pnpm dev` + Docker running | URL stays reachable (no fixed TTL) |
| Ctrl+C / kill `cloudflared` | Quick URL dies permanently |
| Restart Quick Tunnel | **New** hostname — update `.env` + restart Next |
| Laptop sleep / network loss | Usually breaks until processes recover |

Tear down:

```bash
# stop cloudflared (Ctrl+C or kill the process)
# optionally restore local-only env:
#   NEXTAUTH_URL=http://localhost:3000
#   NEXT_PUBLIC_APP_URL=http://localhost:3000
# then restart pnpm dev
```

Named tunnel full delete: `cloudflared tunnel delete relay-demo`.

---

## Security (always tell the operator)

A public tunnel exposes the **real** local app, including currently known **dev-only** gaps:

1. **`/api/runs/*` header bypass** — accepts bare `x-relay-user-id` without a session (seed user IDs are deterministic).
2. **Shared seed password** — all seed users use `relay-dev-2026`.

Do **not** share the URL beyond people trusted for this session. Do **not** leave the tunnel running unattended. Closing those gaps is a separate task — launching a tunnel does not fix them.

---

## Known pitfalls (from 2026-07-14 launch)

| Symptom | Cause | Fix |
|---|---|---|
| `ERR_SSL_PROTOCOL_ERROR` on `https://localhost:3000/login?...` | Auth redirect used local origin + `X-Forwarded-Proto: https` | Set `NEXTAUTH_URL` (and `NEXT_PUBLIC_APP_URL`) to the tunnel URL; restart Next. Middleware must prefer `NEXTAUTH_URL` for login redirects. |
| Login works in curl, browser can’t open new `*.trycloudflare.com` | DNS not propagated yet / resolver lag | Wait and retry; verify with `dig @1.1.1.1 <host> A` |
| Cookies / NextAuth weirdness after URL change | Stale `NEXTAUTH_URL` | Sync both URL env vars; restart Next |
| Re-seed “lost” demo work | `pnpm db:seed` on non-empty DB | Only seed fresh DBs |
| Hitting old Quick URL | Prior `cloudflared` was restarted | Use the URL printed by the **current** process |

---

## What this is not

- Not production hosting
- Not a replacement for a real public DB
- Not a reason to leave `main`’s Netlify deploy “working” end-to-end — Netlify still has no reachable hosted DB until that decision lands
