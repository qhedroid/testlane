# Cloudflare Tunnel — expose the local full stack (checklist)

> **Canonical how-to:** [`docs/ops/cloudflare-tunnel-local-launch.md`](../../ops/cloudflare-tunnel-local-launch.md)  
> **Cursor relaunch prompt:** [`docs/cursor-prompts/main/task-02-relaunch-cloudflare-tunnel.md`](../../cursor-prompts/main/task-02-relaunch-cloudflare-tunnel.md)

Branch: `main` (full backend). This file is a short Claude/Cowork checklist; prefer the ops doc for pitfalls and lifetime details.

## 0. Bring the local stack up

```bash
git pull origin main
pnpm install
pnpm docker:up          # MySQL + OpenSearch
pnpm db:migrate
pnpm db:seed            # only if fresh DB — re-running wipes seed-org projects
pnpm dev
curl http://localhost:3000/api/health   # confirm 200 before continuing
```

## 1. Install `cloudflared`

```bash
brew install cloudflared        # macOS
cloudflared --version
```

## 2. Choose a mode

**Quick Tunnel** — instant, zero config, no Cloudflare account. URL is random and **changes every restart**. Stays up only while `cloudflared` (and this machine) keep running — no fixed TTL, no uptime guarantee.

```bash
cloudflared tunnel --url http://127.0.0.1:3000
```

Prints `https://<random-words>.trycloudflare.com`.

**Named Tunnel** — stable URL, survives restarts. Needs a free Cloudflare account + a domain on Cloudflare.

```bash
cloudflared tunnel login
cloudflared tunnel create relay-demo
# write ~/.cloudflared/config.yml mapping your chosen hostname -> http://127.0.0.1:3000
cloudflared tunnel route dns relay-demo <your-chosen-hostname>
cloudflared tunnel run relay-demo
```

Use Quick for a one-off. Use Named for anything you'll come back to.

## 3. Update URL env vars — easy to forget

Set **both** in root `.env` to exactly match the tunnel public URL (https, no trailing slash), then restart Next:

- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`

With a Quick Tunnel, redo this every time the tunnel hostname changes. Wrong / stale values → login redirects to `https://localhost:3000` → browser `ERR_SSL_PROTOCOL_ERROR`. Middleware uses `NEXTAUTH_URL` for those redirects (`apps/web/src/middleware.ts`).

## 4. Verify

- `curl https://<tunnel-url>/api/health` → 200
- Unauthenticated `/` Location stays on the **tunnel** host (not localhost)
- Log in at `https://<tunnel-url>/login` (`ssevume@ti.com` / `relay-dev-2026`)
- Confirm `/DP/dashboard` loads with real data

New Quick hostnames can take ~30–60s for DNS to resolve.

## 5. Before sending the URL to anyone

This exposes the real app, including two known dev-only gaps: `/api/runs/*` accepts a bare `x-relay-user-id` header with no session (seed user IDs are deterministic/guessable), and all seed users share one hardcoded password (`relay-dev-2026`). Fine for a quick demo to people you trust; not something to leave running unattended or share broadly until those are closed.

## 6. Tear down

```bash
# Ctrl+C the cloudflared process (Quick Tunnel)
# restore NEXTAUTH_URL / NEXT_PUBLIC_APP_URL to http://localhost:3000 and restart Next for local-only work

# Named Tunnel:
cloudflared tunnel delete relay-demo  # only when removing it entirely
```

Only stays up while your machine, Docker, Next, and `cloudflared` are all running.
