# Task 01 (`main`) — launch the local full stack behind a Cloudflare Tunnel

> **Status (2026-07-14):** Completed for the first launch. For **future relaunches**, use  
> [`task-02-relaunch-cloudflare-tunnel.md`](./task-02-relaunch-cloudflare-tunnel.md) and the durable how-to  
> [`docs/ops/cloudflare-tunnel-local-launch.md`](../../ops/cloudflare-tunnel-local-launch.md).

## Why this is a Cursor task, not a Claude (Cowork) one
This needs a real local machine: Docker containers actually running, a live Next.js process, installing a system binary (`cloudflared`), and potentially an interactive browser-based Cloudflare login. Claude's Cowork sandbox has none of that (no Docker, no route to your actual `localhost`, no browser).

## Branch
`main` — now has the full backend (merged 2026-07-14, `7d3d5b1`). No application code should change as part of this task.

## Context
- Noel's decision (2026-07-14): launch locally via Cloudflare Tunnel now; the GitLab migration and Netlify/DB hosting decision are a separate conversation for later. This task is scoped to today's local launch only.
- Full checklist this follows: `docs/claude/mvp-backend/cloudflare-tunnel-checklist.md` — read it first.
- Known, not-yet-fixed risk: `/api/runs/*`'s header-auth bypass and the shared seed password (`relay-dev-2026`) become reachable the moment there's a public URL. This task does **not** fix those — it surfaces the risk to the human operator before finishing (step 5).
- Note for whoever runs this: a previous session's scratch docs (an architecture audit, a known-bugs entry, a couple of Cursor prompts) were lost when the repo's working tree got reset during the merge to `main` — if anything in this prompt references something that doesn't exist on disk, that's why; ask Claude to regenerate it rather than assuming it was never written.

## Scope — do this, in order

1. **Get on `main` and bring the stack up:**
   ```bash
   git pull origin main
   pnpm install
   pnpm docker:up
   pnpm db:migrate
   pnpm db:seed        # only if this is a fresh DB
   pnpm dev             # or: pnpm build && pnpm start
   curl -s http://localhost:3000/api/health   # confirm 200 before continuing
   ```

2. **Check for `cloudflared`:**
   ```bash
   cloudflared --version
   ```
   If missing, install it (check the actual OS first — don't assume macOS; use `brew install cloudflared` if it is).

3. **Ask the human operator which mode they want — don't choose for them:**
   - **Quick Tunnel**: instant, no account, URL changes every restart.
     ```bash
     cloudflared tunnel --url http://localhost:3000
     ```
   - **Named Tunnel**: stable URL, needs a one-time interactive Cloudflare login (`cloudflared tunnel login` opens a browser) — only a human can complete this step.
     ```bash
     cloudflared tunnel login
     cloudflared tunnel create relay-demo
     # write ~/.cloudflared/config.yml: ingress mapping <chosen-hostname> -> http://localhost:3000
     cloudflared tunnel route dns relay-demo <chosen-hostname>
     cloudflared tunnel run relay-demo
     ```

4. **Update `NEXTAUTH_URL`** in `.env` to exactly match the resulting public URL (protocol included, no trailing slash), then restart the Next.js process. Easy to forget; login silently misbehaves without it.

5. **Before declaring this done, state the following to the human operator explicitly and get an acknowledgement:** *"This tunnel exposes the real app, including two known dev-only auth gaps (the `/api/runs/*` header bypass and the shared seed password) — don't share this URL beyond people you trust for this session, and don't leave it running unattended."*

6. **Verify:**
   - `curl https://<tunnel-url>/api/health` → 200
   - `https://<tunnel-url>/login` → sign in (`ssevume@ti.com` / `relay-dev-2026`) → `/DP/dashboard` loads with real data
   - Confirm it's reading the real local DB, not a cached/static response

## Explicit non-goals
- No application code changes.
- Do not fix the `/api/runs/*` auth gap or the shared password here — flag them (step 5), don't patch them.
- No commits, no pushes.
- Do not write to `docs/claude/**` — report the resulting URL/mode back in your final chat response; Noel or Shaun can relay it to Claude to log.

## Output format
State: mode used, the resulting public URL (note if it'll change on next restart), confirmation the step-5 acknowledgement happened, and the step-6 verification results.
