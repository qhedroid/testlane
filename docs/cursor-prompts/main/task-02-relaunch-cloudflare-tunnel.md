# Task 02 (`main`) — relaunch local stack behind Cloudflare Tunnel

## Why this is a Cursor task
Needs a real machine: Docker, live Next.js, `cloudflared`, and (for Named mode) an interactive browser login. Claude’s Cowork sandbox cannot do this.

## Branch
`main` — full backend. Prefer **no application code changes**. Config/env and process management only, unless a documented tunnel bug blocks launch (see ops doc pitfalls).

## Read first
**`docs/ops/cloudflare-tunnel-local-launch.md`** — durable how-to (modes, env, lifetime, security, pitfalls).  
Short duplicate checklist (Claude): `docs/claude/mvp-backend/cloudflare-tunnel-checklist.md`.

Task 01 (`docs/cursor-prompts/main/task-01-cloudflare-tunnel-launch.md`) was the first launch (2026-07-14). Use **this** prompt for every subsequent relaunch.

---

## Scope — do this, in order

1. **Bring the stack up on `main`:**
   ```bash
   git checkout main && git pull origin main
   pnpm install
   pnpm docker:up
   pnpm db:migrate
   pnpm db:seed        # ONLY if fresh DB — re-seed wipes seed-org projects
   pnpm dev
   curl -s http://localhost:3000/api/health   # expect 200 + mysql ok
   ```

2. **Ensure `cloudflared`:**
   ```bash
   cloudflared --version
   ```
   If missing: check OS; on macOS `brew install cloudflared`.

3. **Ask the human which mode — do not choose for them:**
   - **Quick Tunnel** — instant; URL changes every restart:
     ```bash
     cloudflared tunnel --url http://127.0.0.1:3000
     ```
   - **Named Tunnel** — stable URL; human must complete `cloudflared tunnel login` in a browser:
     ```bash
     cloudflared tunnel login
     cloudflared tunnel create relay-demo   # skip create if it already exists
     # ensure ~/.cloudflared/config.yml maps hostname -> http://127.0.0.1:3000
     cloudflared tunnel route dns relay-demo <chosen-hostname>
     cloudflared tunnel run relay-demo
     ```

4. **Sync `.env` to the public URL, then restart Next:**
   - `NEXTAUTH_URL=https://<tunnel-host>` (no trailing slash)
   - `NEXT_PUBLIC_APP_URL=https://<tunnel-host>` (same)
   - Restart `pnpm dev` so both load  
   Without this, browsers get `ERR_SSL_PROTOCOL_ERROR` via redirects to `https://localhost:3000` (see ops doc).

5. **Security acknowledgement — quote this and get an explicit ack before declaring done:**  
   *"This tunnel exposes the real app, including two known dev-only auth gaps (the `/api/runs/*` header bypass and the shared seed password) — don't share this URL beyond people you trust for this session, and don't leave it running unattended."*  
   Do **not** patch those gaps in this task.

6. **Verify:**
   - `curl https://<tunnel-url>/api/health` → 200 / `mysql: ok`
   - Unauthenticated `/` → Location on the **tunnel** host `/login?...` (not `localhost`)
   - Browser: `https://<tunnel-url>/login` → `ssevume@ti.com` / `relay-dev-2026` → `/DP/dashboard` with real DB data
   - If a brand-new Quick hostname won’t resolve, wait for DNS (~30–60s) before declaring failure

---

## Explicit non-goals
- No hosted Netlify/DB work
- No fixing `/api/runs/*` header auth or shared seed passwords
- No commits / pushes unless the human asks
- Do not write session chatter into `docs/claude/handoff.md` unless asked; report URL/mode in chat

---

## Output format
State: mode, public URL (note if Quick URL dies on restart), step-5 acknowledgement, step-6 verification results, and any env keys you changed (not secret values).
