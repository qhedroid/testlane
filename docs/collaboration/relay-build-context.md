> **STALE / SUPERSEDED** — This document is no longer maintained. Use [`docs/_authoritative/AS_BUILT_SNAPSHOT.md`](../_authoritative/AS_BUILT_SNAPSHOT.md) and [`docs/_authoritative/PROJECT_CONTEXT.md`](../_authoritative/PROJECT_CONTEXT.md) instead.

# Relay — build context (forward to AI / collaborators)

**Purpose:** Single reference for continuing Relay development without verbal handover. Paste or attach this file when working with ChatGPT, Cursor, or a new collaborator.

**Last updated:** May 2026  
**Repo:** https://github.com/qhedroid/Relay.git (private)  
**Owner:** qhedroid

---

## 1. What Relay is

Relay is a **QA test execution platform** focused on Test Runs and execution workflows. It is intended to replace generic tools (TestRail/Testiny) for teams working across enterprise product modules (CTMS, eTMF, Viewer, SSO/IAM, Reporting, API Gateway).

**Current reality:** Local-dev MVP only. Not production-ready. No real login. MySQL is real. OpenSearch container runs but the app does not use it yet.

**UX source of truth:** `mockup/Relay_Prototype_v1.2.html` (open in browser, no build). The running Next.js app is the implementation truth for what actually exists today.

---

## 2. Latest shipped state

| Commit | Description |
|--------|-------------|
| `ae9c068` | Collaborator onboarding docs + README refresh |
| `8f84e3a` | Execution Experience workspace (three-pane `/runs`) |

**Milestone shipped:** Execution Experience (slices 1–4)

**Current focus:** v0.1 Execution Readiness — UX polish, ticket-led delivery, no new product surfaces.

---

## 3. Stack

| Layer | Choice |
|-------|--------|
| App | Next.js 15 App Router (`apps/web`) |
| Workspace | pnpm monorepo |
| ORM | Drizzle 0.30.x, MySQL dialect (`packages/db`) |
| Database | MySQL 8 (Docker locally; Aurora target in architecture) |
| Local infra | Docker Compose (MySQL + OpenSearch) |
| IDs | ULID (26-char, app-generated) |
| Auth (today) | Dev only: `x-relay-user-id` header with seed user ULIDs |

---

## 4. Repository layout

```
relay/
├── apps/web/                 # Next.js UI + thin API routes
│   ├── src/app/runs/         # /runs page + runs.css
│   ├── src/app/api/          # health, runs, case result routes
│   ├── src/components/runs/  # RunsScreen, CaseListPane, CaseDetailPanel, shell
│   └── src/lib/relay/        # api-client, types, config
├── packages/db/
│   ├── schema.ts             # 20-table model (source of truth)
│   ├── services/             # TestRunService, ExecutionService
│   └── src/runs/read.ts      # listProjectRuns, getRunDetail
├── docs/
│   ├── architecture/         # Canonical architecture baseline
│   ├── product/              # UX philosophy, design system
│   ├── implementation/     # current-state.md, api-contracts.md
│   └── collaboration/      # onboarding, working agreement, this file
├── mockup/Relay_Prototype_v1.2.html
└── docker-compose.yml
```

---

## 5. Architectural rules (do not break)

1. **Backend-first** — business logic in `packages/db/services/`, not in API routes.
2. **Thin API routes** — Zod validation, auth header, call service, return JSON.
3. **Immutable run snapshots** — `test_run_cases` snapshot columns set at spawn; result columns mutable until run sealed.
4. **Append-only audit** — `audit_log` written on mutations; no UI for it yet.
5. **RBAC in services** — `super_admin` > `admin` > `contributor` > `viewer`. Job titles are not RBAC enums.
6. **Vertical slices** — small, focused changes; avoid full-page rewrites unless necessary.
7. **No over-engineering** — no new abstractions unless clearly needed.

---

## 6. What works today

### Backend / data

- Drizzle schema + migrations (`0000` schema, `0001` RBAC roles)
- Idempotent seed: org `relay-dev`, 6 users, 6 projects, PLAN-001 (4 cases), folders, cases, steps
- `TestRunService.create()` — spawn run from plan, snapshot cases, audit row
- `ExecutionService.updateCaseResult()` — status, comment, executed_by/at, audit
- `listProjectRuns`, `getRunDetail` (includes assignee names, module/suite, updatedAt)

### HTTP API

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/health` | App + MySQL ping |
| GET | `/api/runs?projectId=` | List runs with case counts |
| POST | `/api/runs` | Create run (admin+ only) |
| GET | `/api/runs/:runId?projectId=` | Run detail + cases |
| POST | `/api/runs/:runId/cases/:runCaseId/result` | Status + optional comment |

Full contract: `docs/implementation/api-contracts.md`

### `/runs` UI (Execution Experience)

**Three panes:**

1. **Left** — run list + create-run form (Shaun/admin creates via API)
2. **Middle** — selected run summary, compact count cards, status filter chips, case search, case list
3. **Right** — selected case detail: metadata, result buttons, execution comment textarea

**Behaviours:**

- Fully API-backed; refresh persists status and comments
- Client-side filters: All, Not run, Passed, Failed, Blocked, Skipped
- Client-side search: case ref, title, assignee name, suite/folder
- Viewer read-only when `NEXT_PUBLIC_RELAY_USER_ID` = seed viewer ULID
- Relay shell: navy sidebar, topbar, placeholder nav links

**Key components:** `RunsScreen.tsx`, `CaseListPane.tsx`, `CaseDetailPanel.tsx`, `RunsAppShell.tsx`, `run-case-utils.ts`

---

## 7. Seed users (dev auth)

| User | ULID | Role | Typical use |
|------|------|------|-------------|
| Noel Quadri | `01SEED00000000000000000002` | super_admin | — |
| Shaun Sevume | `01SEED00000000000000000003` | admin | Create runs (UI + API) |
| Priya Nair | `01SEED00000000000000000004` | contributor | Default UI actor; update results |
| Marcus Webb | `01SEED00000000000000000005` | admin | — |
| James O'Sullivan | `01SEED00000000000000000006` | contributor | — |
| Alex Viewer | `01SEED00000000000000000007` | viewer | Read-only testing |

**CTMS project:** `01SEED00000000000000000010`  
**PLAN-001:** `01SEED00000000000000000400`

Header for API calls: `x-relay-user-id: <ULID>`

---

## 8. Local setup and validation

```bash
git clone https://github.com/qhedroid/Relay.git
cd Relay
pnpm install
cp .env.example .env
pnpm docker:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open: http://localhost:3000/runs

**Before PR / after changes:**

```bash
pnpm build
pnpm api:validate    # requires pnpm dev on :3000
```

**If dev server breaks after build:**

```bash
pnpm dev:reset
pnpm dev
```

Optional service scripts:

```bash
pnpm db:validate-create-run
pnpm db:validate-update-case-result
```

---

## 9. What is NOT built (do not assume)

- Dashboard, global search (Cmd K), Test Plans screen, Test Cases library screen
- Real authentication, SSO, sessions
- OpenSearch indexing in the app
- Step-level execution UI/API
- Defects linking
- Activity/history read API or UI
- Run seal/archive from UI
- Keyboard shortcuts, resizable panes
- Production deployment, workers, notifications
- Do not edit `mockup/Relay_Prototype_v1.2.html` unless explicitly asked

---

## 10. v0.1 Execution Readiness — GitHub issues

| Issue | Title | Priority | Status |
|-------|-------|----------|--------|
| [#1](https://github.com/qhedroid/Relay/issues/1) | REL-001 Manual UX audit of /runs | p0 | Open |
| [#2](https://github.com/qhedroid/Relay/issues/2) | REL-002 Resolve duplicate result controls | p0 | Open |
| [#3](https://github.com/qhedroid/Relay/issues/3) | REL-003 Improve loading, empty, and error states | p0 | Open |
| [#4](https://github.com/qhedroid/Relay/issues/4) | REL-004 Confirm RBAC/viewer mode UX | p0 | Open |
| [#5](https://github.com/qhedroid/Relay/issues/5) | REL-005 README and collaborator setup | p1 | **Closed** (done in `ae9c068`) |
| [#6](https://github.com/qhedroid/Relay/issues/6) | REL-006 Add v0.1 readiness checklist | p1 | Open |
| [#7](https://github.com/qhedroid/Relay/issues/7) | REL-007 Tag execution checkpoint | p1 | Open |

**Labels:** `p0`, `p1`, `p2`, `bug`, `feature`, `ux`, `docs`, `chore`, `v0.1`

**Branch naming:** `rel-001-short-description`, `rel-002-...`

**Rule:** Do not commit feature work directly to `main`. Branch → PR → `pnpm build` + `pnpm api:validate`.

---

## 11. Suggested build order (after v0.1)

1. Finish v0.1 issues (REL-001–004, REL-006, REL-007)
2. Activity/history — minimal audit read API + tab (no full audit UI)
3. Run sealing HTTP + UI guardrails
4. Step-level execution when backend contract exists
5. Broader surfaces (plans, cases, dashboard) only when explicitly scoped

---

## 12. Key documents in repo

| Path | Use |
|------|-----|
| `README.md` | Quick start |
| `docs/implementation/current-state.md` | Engineering checkpoint |
| `docs/implementation/api-contracts.md` | HTTP API contract |
| `docs/collaboration/getting-started.md` | Troubleshooting |
| `docs/collaboration/working-agreement.md` | Branches and PRs |
| `docs/architecture/relay-architecture-baseline.md` | Full architecture |
| `mockup/Relay_Prototype_v1.2.html` | UX reference |

---

## 13. ChatGPT / AI assistant prompt (copy-paste)

```
You are helping build Relay, a local-dev QA execution platform (Next.js 15 + Drizzle + MySQL).

Repo: https://github.com/qhedroid/Relay
Current focus: v0.1 Execution Readiness — polish /runs, not new product surfaces.

Rules:
- Business logic in packages/db/services; thin API routes
- No real auth yet (x-relay-user-id header + seed ULIDs)
- Do not add dashboard, search, plans, cases screens, steps, defects, or activity UI unless asked
- Preserve create run flow and result/comment persistence
- Run pnpm build and pnpm api:validate before finishing

What exists: three-pane /runs (run list | case list with filters | case detail with status + comments).
Latest commits: 8f84e3a (execution workspace), ae9c068 (onboarding docs).

Open tickets: GitHub issues REL-001 through REL-007 on qhedroid/Relay.
Refer to docs/collaboration/relay-build-context.md and docs/implementation/api-contracts.md for detail.
```

---

## 14. Intentionally rough areas (known)

- Duplicate result controls in case detail (inline + footer) — REL-002
- Sidebar links are placeholders
- Assignee shown by name when seeded; no user picker
- No keyboard shortcuts
- No resizable panes
- Hard-coded CTMS project in web config for dev

---

*When in doubt: running app + API contract beat the HTML prototype for implementation truth.*
