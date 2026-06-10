# Relay — Agent source-of-truth context

*Last inspected: June 2026. Branch `demo/prototype-parity`, commit `2a6836a`.*

---

## 1. Purpose of this file

This file is the **source-of-truth context** for future Cursor, ChatGPT, and human collaborator sessions working on Relay.

**Read this file before planning or coding.**

If anything here conflicts with the repository, **the repo wins** — update this file after verifying the discrepancy.

Do not treat older docs (`README.md`, `docs/implementation/current-state.md`, `docs/collaboration/relay-build-context.md`) as authoritative unless you have confirmed they match the current branch. Several of those files describe the pre-FRESH, API-backed `/runs` UI and are now stale relative to `apps/web/src/fresh/`.

---

## 2. Current project identity

**Relay** is a QA test execution platform — a local-dev prototype/MVP for managing test cases, plans, runs, and audit history in a clinical-trials-style multi-module workspace.

It is **not production-ready**. There is no real authentication, no deployed environment, and the visible product UI is largely a **mockup-parity demo** backed by in-memory state, not the MySQL layer.

---

## 3. Current branch, commits, and repo state

| Item | Value |
|------|-------|
| **Current branch** | `demo/prototype-parity` |
| **Latest commit** | `2a6836a` — *Replace Test Runs UI with Relay_Prototype_v1.2 layout* |
| **HEAD hash** | `2a6836a7e00fa65dd27e491c43edf64b7c1d95d4` |
| **Working tree** | Clean for tracked files |

### Recent relevant commits (newest first)

| Hash | Summary |
|------|---------|
| `2a6836a` | Test Runs UI rebuilt from `Relay_Prototype_v1.2.html` |
| `fd28e57` | FRESH polish: dashboard scale, sidebar nav, cases filters |
| `84ee32b` | `DEMO.md` — FRESH mockup demo script |
| `5165387` | Full demo UI rebuild in isolated `fresh/` layer |
| `ae9c068` | Collaborator onboarding docs + README refresh |
| `8f84e3a` | **Checkpoint:** API-backed execution workspace (now superseded for UI by `fresh/`) |

### Known previous checkpoints

- `8f84e3a` — Complete execution experience workspace (MySQL-backed `/runs` in `legacy/`)
- `ae9c068` — Collaborator onboarding docs

### Uncommitted / untracked files (not in git)

| Path | Notes |
|------|-------|
| `docs/collaboration/context.md` | Instructions that produced this file |
| `docs/collaboration/relay-build-context.md` | Older handover doc; partially stale |
| `docs/collaboration/relay-agent-context.md` | This file (new) |
| `mockup/Relay Mockup NEW.html` | Not used by active UI — ignore |
| `apps/web/tsconfig.tsbuildinfo` | Build artefact |
| `.pnpm-store/` | Local pnpm cache |

No staged or unstaged diffs on tracked files at time of inspection.

---

## 4. Tech stack

Confirmed in repo:

| Layer | Technology |
|-------|------------|
| App framework | **Next.js 15** (App Router, API routes) — `apps/web` |
| UI library | React 19 |
| Workspace | **pnpm 9** workspaces (`relay` root, `@relay/web`, `@relay/db`) |
| ORM | **Drizzle ORM** 0.30.x (MySQL dialect) |
| Database | **MySQL 8.0** via Docker Compose |
| Search container | **OpenSearch 2.18** via Docker Compose — **not wired into the app** |
| Validation | Zod (API request schemas) |
| IDs | ULID (application-generated) |
| Node | ≥ 20 |

Not present: NextAuth/SSO, AWS deployment, CI pipeline, background workers, production tunnel tooling in repo.

---

## 5. Repository structure

```
relay/
├── apps/web/                  # Next.js app — routes, API, active fresh UI
│   └── src/
│       ├── app/               # App Router pages + API routes
│       ├── fresh/             # ★ ACTIVE demo UI (mockup parity)
│       ├── legacy/            # Quarantined prior UI (excluded from tsconfig)
│       ├── lib/api/           # Thin API helpers (auth, errors, schemas)
│       └── components/        # Old components — excluded from tsconfig, unused
├── packages/db/               # Drizzle schema, migrations, seed, services
│   ├── schema.ts              # 20-table MySQL model
│   ├── drizzle/               # SQL migrations
│   ├── services/              # TestRunService, ExecutionService
│   └── src/                   # DB client, seed, RBAC, run read helpers
├── docs/
│   ├── architecture/          # Product/architecture baseline
│   ├── product/               # UX philosophy, design system
│   ├── implementation/        # current-state.md, api-contracts.md
│   └── collaboration/         # This file, working-agreement, getting-started
├── mockup/                    # HTML prototypes (no build step)
│   ├── Relay Mockup FRESH.html      # Source for dashboard/cases/plans/audit
│   ├── Relay_Prototype_v1.2.html    # Source for /runs only
│   └── Relay Mockup NEW.html        # Not used — ignore
├── scripts/                   # wait-for-mysql.sh, reset-web-dev.sh
├── docker-compose.yml         # MySQL + OpenSearch
├── DEMO.md                    # Demo walkthrough for fresh UI
└── .env.example               # Local connection templates
```

| Path | Purpose |
|------|---------|
| `apps/web/src/fresh/` | **Active product UI** — all five nav screens |
| `apps/web/src/legacy/` | Prior API-backed and demo implementations — **not imported** |
| `packages/db/services/` | Business logic for run creation and case results |
| `packages/db/src/runs/` | Run list/detail read queries |
| `mockup/` | UX reference HTML — open in browser |

---

## 6. Architectural rules

Future agents **must** follow these rules:

1. **Keep API routes thin** — validation + auth resolution + service call + envelope response.
2. **Keep business logic in `packages/db/services/`** (and `packages/db/src/runs/` for reads).
3. **Do not put database or business logic in React components.**
4. **Do not add new infrastructure** unless a ticket explicitly requires it.
5. **Do not build unrequested modules** — no Reports, Integrations, Defects screens unless ticketed.
6. **Prefer vertical slices** — one REL issue, one focused change.
7. **Preserve existing validation** — `pnpm api:validate`, service scripts, Zod schemas.
8. **Avoid over-engineering** — match existing patterns; minimal diffs.
9. **No production/auth assumptions** — dev header auth only; fresh UI has no auth at all.
10. **Mockup sources are strict:**
    - `Relay Mockup FRESH.html` — dashboard, cases, plans, audit
    - `Relay_Prototype_v1.2.html` — `/runs` only
    - Do not mix sources or use `Relay Mockup NEW.html`

---

## 7. Implemented product areas

The **active UI** lives in `apps/web/src/fresh/`. It uses `FreshProvider` (React context + reducer) with seed data from `fresh/data/seed.ts`. **No screen calls `/api/*`.**

Docker/MySQL is **optional** for the demo UI walkthrough (`DEMO.md`). It is **required** for API validation.

### Routes

| Route | Screen | Data source | Status |
|-------|--------|-------------|--------|
| `/` | Redirect | — | → `/dashboard` |
| `/dashboard` | `DashboardScreen` | Static seed (`RUN_CARDS`, metrics) | **Implemented** (demo) |
| `/cases` | `CasesScreen` | Seed + `localStorage` for user-added cases | **Implemented** (demo) |
| `/plans` | `PlansScreen` | Static seed (`PLANS`) | **Implemented** (demo) |
| `/runs` | `RunsScreen` | In-memory `FreshProvider` exec cases | **Implemented** (demo) |
| `/audit` | `AuditScreen` | Static seed (`AUDIT_EVENTS`) | **Implemented** (demo) |

### Per-route detail

**`/dashboard`**
- Metric cards, sprint subtitle, expandable run cards with Overview/Assignees/Defects tabs.
- Needs-attention list links to `/runs`.
- Data: static seed. No API. No live metrics.

**`/cases`**
- Suite tree, folder navigation, status filter chips (single-select), row selection + bulk bar.
- Quick create (toolbar + empty state), New case modal.
- Detail panel tabs: Details / History / Activity (History and Activity are static seed content).
- User-created cases persist in `localStorage` key `relay-fresh-cases`.
- Limitations: Import/Edit/Clone/Export buttons are visual only; no real case library API.

**`/plans`**
- Plan list (Active/Draft), tabs: Overview / Included suites / Run history.
- "Spawn new run" navigates to `/runs` (does not create a DB run).
- Limitations: Edit plan, clone, export — visual only.

**`/runs`**
- Layout from `Relay_Prototype_v1.2.html` (`runs-v12` CSS scope).
- Project switcher, run picker (6 runs, searchable, scrollable), case list with filters, detail panel with 6 tabs.
- Case-level results update in-memory; step-level result buttons update in-memory `sr[]` array.
- Keyboard shortcuts: `P/F/B/S`, `J/K`, `D`, `?`.
- Global search (`⌘K`) finds cases/runs/plans in seed data.
- Limitations: see section 8.

**`/audit`**
- Static audit log; filter chips toggle visually but do not filter entries.

### Sidebar / nav placeholders

| Nav item | Status |
|----------|--------|
| Dashboard | Working route |
| Test Cases | Working route |
| Test Plans | Working route |
| Test Runs | Working route |
| Audit History | Working route |
| Reports | **Placeholder** — disabled, "Planned" badge |
| Defects (footer) | **Placeholder** — no route |
| Integrations (footer) | **Placeholder** — disabled |
| Pinned modules (eTMF, API Gateway) | **Visual only** — module switcher changes label, not data |

### What to show Syed (or any stakeholder) in a demo

Follow `DEMO.md` (5–7 min script). **No Docker required.**

Show: full nav walkthrough, case creation, plan browsing, run execution with keyboard shortcuts, global search, sidebar collapse.

Do **not** claim: real auth, persistent run results, database-backed audit, production deployment, or that comments/defects persist.

---

## 8. Current `/runs` or execution workspace behaviour

`/runs` **works as a demo screen** on branch `demo/prototype-parity`. It does **not** use the MySQL-backed execution workspace from commit `8f84e3a` (that code is in `apps/web/src/legacy/` and is quarantined).

### What works (in-memory demo)

| Feature | Behaviour |
|---------|-----------|
| Run picker | 6 seeded runs; search; switches `currentRunId` / name in state |
| Case list | 10 exec cases grouped by status; filter tabs All/Not run/Fail/Blocked; search |
| Case detail panel | 6 tabs: Details, Steps, Activity, History, Comments, Defects |
| Case-level result | Footer buttons + keyboard `P/F/B/S` update `execCases[].status` |
| Step-level result | Per-step `P/F/B/S` buttons update `execCases[].sr[]` in memory |
| Navigation | `J/K`, Prev/Next buttons; resizable ec-pane |
| Defect link | `D` key adds random defect ID to case (in-memory) |
| Priority toggle | Hides/shows priority labels in case list |
| Shortcuts modal | `?` key |

### What does not work / gaps

| Feature | Status |
|---------|--------|
| **Seal Run** | `FreshProvider.sealRun()` exists but **is not wired** in `RunsScreen.tsx`. No seal button or sealed banner in current UI. `DEMO.md` step 4 mentions sealing — that behaviour is **not implemented** in fresh `/runs`. |
| **New run** | Button present; no-op |
| **Filter** (topbar) | Button present; no-op |
| **Comments** | Static display; "Save comment" does not persist |
| **Activity / History tabs** | Static seed HTML — not live |
| **RBAC / viewer read-only** | Not enforced in fresh UI (legacy API layer had `NEXT_PUBLIC_RELAY_USER_ID` viewer mode) |
| **Duplicate result controls** | Case-level footer buttons **and** step-level inline buttons both exist — REL-002 |
| **API integration** | Fresh UI makes zero `fetch` calls to `/api/runs` |
| **Persistence** | All execution state resets on page reload (except `localStorage` cases on `/cases`) |

### Recent UI changes (Shaun, `demo/prototype-parity`)

- `5165387` — Full FRESH rebuild in `fresh/` layer
- `fd28e57` — Dashboard metric scale, sidebar inactive colour, flat run-card tabs, cases status filters, inverted detail resizer
- `2a6836a` — `/runs` rewritten for v1.2 layout + `prototype-runs.css`

---

## 9. Current APIs and services

API routes exist and are functional **when Docker + seed + dev server are running**. The fresh demo UI does not call them.

### API routes

| Method | Path | Purpose | Auth | Service |
|--------|------|---------|------|---------|
| `GET` | `/api/health` | App + MySQL ping | None | `pingDatabase()` |
| `GET` | `/api/runs` | List runs for project | `x-relay-user-id` header | `listProjectRuns()` |
| `POST` | `/api/runs` | Spawn run from plan | `x-relay-user-id` header | `createRun()` |
| `GET` | `/api/runs/:runId` | Run detail + cases | `x-relay-user-id` header | `getRunDetail()` |
| `POST` | `/api/runs/:runId/cases/:runCaseId/result` | Update case result | `x-relay-user-id` header | `updateCaseResult()` |

All `/api/runs` routes use Zod validation (`apps/web/src/lib/api/schemas.ts`) and return `{ data }` / `{ error }` envelopes per `docs/implementation/api-contracts.md`.

### Services

| Service | Location | Implemented | Notes |
|---------|----------|-------------|-------|
| `createRun` | `packages/db/services/TestRunService.ts` | Yes | Spawns run from plan; snapshots cases/steps; audit log; ref counter for `runRef` |
| `updateCaseResult` | `packages/db/services/ExecutionService.ts` | Yes | Case-level only; updates status/comment/executed_by/executed_at; audit log |
| `listProjectRuns` | `packages/db/src/runs/read.ts` | Yes | Requires viewer+ RBAC |
| `getRunDetail` | `packages/db/src/runs/read.ts` | Yes | Returns cases with snapshot fields |
| Step-level execution service | — | **No** | Step results are UI-only in fresh layer; no `updateStepResult` API |
| Run seal/reopen service | — | **No** | Referenced in TestRunService header comment as deferred |
| SearchService / OpenSearch | `packages/db/src/opensearch/client.ts` | Stub only | Container runs; app does not index |

---

## 10. Database and seed state

### Migrations

| Tag | File | Purpose |
|-----|------|---------|
| `0000_futuristic_gabe_jones` | Initial 20-table schema | Fresh DB |
| `0001_capability_rbac_roles` | Role enum migration | Required on DBs with legacy role enums |

### Schema highlights (`packages/db/schema.ts`)

20 tables including: organisations, users, projects, folders, test_cases, test_case_steps, test_plans, test_plan_cases, test_runs, test_run_cases, run_case_step_snapshots, run_assignees, project_roles, audit_log, recent_views, etc.

### Seed (`pnpm db:seed`)

Idempotent reload of `relay-dev` organisation:

- **6 users:** Noel (super_admin), Shaun (admin), Priya (contributor), Marcus, James, Alex Viewer (viewer)
- **6 module projects:** CTMS, eTMF, Viewer, SSO/IAM, Reporting, API Gateway
- **Test cases + steps** across module folders
- **2 test plans:** CTMS Regression (PLAN-001, 4 cases), eTMF Smoke
- **`ref_counters`** per project for human-readable refs (`RUN-0001`, etc.)

Stable ULIDs in `packages/db/src/seed/ids.ts` — safe for docs and `api:validate`.

### Audit log

Written by `createRun` and `updateCaseResult` services. **Not surfaced** by fresh UI. `/audit` screen uses static seed only.

No production data. No real auth. Seed restricted to localhost unless `ALLOW_REMOTE_SEED=true`.

---

## 11. Auth and RBAC reality

### Real auth

**Not implemented.** No login screen, no NextAuth, no SSO, no session cookies, no bearer tokens.

### Dev auth (API only)

```
x-relay-user-id: <26-char ULID>
```

Resolved by `apps/web/src/lib/api/auth.ts` → `resolveUserById()`. Missing/invalid → `401 UNAUTHORIZED`.

The **legacy** API-backed UI used `apps/web/src/lib/relay/config.ts` with `NEXT_PUBLIC_RELAY_USER_ID` for viewer testing. The **fresh** UI ignores this entirely.

### RBAC model

Platform roles (highest wins): `super_admin` > `admin` > `contributor` > `viewer`.

Effective role = max(global role, project role) via `assertMinProjectRole()`.

| Action | Minimum role |
|--------|--------------|
| List/view runs | viewer |
| Create run | contributor |
| Update case result | contributor |

### What is enforced where

| Layer | RBAC |
|-------|------|
| API routes + services | **Enforced** |
| Fresh demo UI | **Not enforced** — no auth concept |

---

## 12. Demo/tunnel/access setup

### Local demo (recommended)

```bash
cd Relay
pnpm install
pnpm dev
```

Open **http://localhost:3000** → redirects to `/dashboard`.

No Docker required for UI demo. See `DEMO.md`.

### API-backed validation demo

Requires Docker + seed + dev server:

```bash
pnpm docker:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

### Public tunnel

**No tunnel currently active.**

No cloudflared, ngrok, or here.now configuration found in the repo. If a tunnel was used ad hoc in a past session, it is not documented or persisted here.

### Stale cache fix

If dev server returns 500 or `__webpack_modules__[moduleId] is not a function`:

```bash
pnpm dev:reset   # kills :3000, removes apps/web/.next
pnpm dev
```

---

## 13. Validation and run commands

| Command | Purpose |
|---------|---------|
| `pnpm install` | Install workspace deps |
| `pnpm docker:up` | Start MySQL + OpenSearch containers |
| `pnpm docker:down` | Stop containers |
| `pnpm db:migrate` | Apply Drizzle migrations (waits for MySQL) |
| `pnpm db:seed` | Reload `relay-dev` seed data |
| `pnpm dev` | Start Next.js on :3000 |
| `pnpm dev:reset` | Clear `.next` cache and free :3000 |
| `pnpm build` | Production build (TypeScript + Next.js) |
| `pnpm api:validate` | HTTP API test suite (needs `pnpm dev` + seeded DB) |
| `pnpm db:validate-create-run` | Direct DB test of `createRun` |
| `pnpm db:validate-update-case-result` | Direct DB test of `updateCaseResult` |

### Commands run during this documentation pass

| Command | Result |
|---------|--------|
| `git status`, `git log`, `git branch`, `git diff --stat` | Ran — see section 3 |
| `pnpm build` | **Passed** (all routes compile) |
| `pnpm api:validate` | **Not run** — requires Docker MySQL + running dev server |
| `pnpm dev` | **Not run** in this pass |

---

## 14. Known limitations and non-working areas

### Implemented

- Monorepo bootstrap (pnpm, Next.js 15, Drizzle, Docker Compose)
- MySQL schema + migrations + idempotent seed
- Internal HTTP API: health, run list/create/read, case result update
- `TestRunService.createRun()` and `ExecutionService.updateCaseResult()`
- RBAC enforcement in services
- **Fresh demo UI:** dashboard, cases, plans, runs, audit (in-memory)
- Global search modal (`⌘K`) over seed data
- `DEMO.md` walkthrough script
- `pnpm dev:reset` cache fix script

### Partially implemented

- **Test Runs UI** — rich v1.2 layout works in demo mode; not wired to API; seal run not connected; comments/activity/history static
- **Test Cases** — create/filter/detail work; library is seed + localStorage only
- **Test Plans** — browse/select works; spawn run is navigation only
- **Dashboard** — full visual demo; no live data
- **Audit** — static log; filter chips are cosmetic
- **Step-level execution** — UI buttons update in-memory array only; no DB/API
- **Global search** — works over seed; no OpenSearch
- **README / current-state.md** — describe older API-backed `/runs`; stale vs `fresh/` branch
- **Seal run** — state helper in `FreshProvider` exists; UI not wired in fresh `RunsScreen`

### Placeholder

- Reports (sidebar — disabled)
- Defects (sidebar footer — no route)
- Integrations (sidebar — disabled)
- Pinned modules / "Add shortcut"
- New run / Filter buttons on `/runs` topbar
- Plan Edit / Clone / Export
- Cases Import (shows empty state only)
- Audit filter logic
- Comment save on `/runs`
- `Relay Mockup NEW.html` — not integrated

### Not implemented

- Real authentication / SSO / NextAuth
- Production deployment (AWS ECS, Aurora, etc.)
- OpenSearch indexing and `SearchService`
- Step-level result API / service
- Run seal/reopen API
- Defects module
- Reports module
- Background workers / notifications / email
- S3 attachments
- CI/CD pipeline in repo
- Cases/plans library read APIs
- Fresh UI → API integration (wire demo to MySQL)
- Viewer read-only mode in fresh UI
- Tunnel/public demo URL (none active)

---

## 15. GitHub delivery state

| Item | Value |
|------|-------|
| **Repo URL** | https://github.com/qhedroid/Relay |
| **Project board** | Relay v0.1 Execution Readiness (manual setup — see `docs/collaboration/github-setup.md`) |
| **Current branch** | `demo/prototype-parity` (may not be pushed to remote) |

### Issues (REL series)

| ID | Title | GitHub | Priority | Status |
|----|-------|--------|----------|--------|
| REL-001 | Manual UX audit of `/runs` | [#1](https://github.com/qhedroid/Relay/issues/1) | p0 | Open |
| REL-002 | Resolve duplicate result controls | [#2](https://github.com/qhedroid/Relay/issues/2) | p0 | Open |
| REL-003 | Improve loading, empty, and error states | [#3](https://github.com/qhedroid/Relay/issues/3) | p0 | Open |
| REL-004 | Confirm RBAC/viewer mode UX | [#4](https://github.com/qhedroid/Relay/issues/4) | p0 | Open |
| REL-005 | Add README and collaborator setup guide | [#5](https://github.com/qhedroid/Relay/issues/5) | p1 | **Closed** |
| REL-006 | Add v0.1 readiness checklist | [#6](https://github.com/qhedroid/Relay/issues/6) | p1 | Open |
| REL-007 | Tag execution checkpoint | [#7](https://github.com/qhedroid/Relay/issues/7) | p1 | Open |

New work should map to a REL issue. Branch naming: `rel-001-short-description`.

**Note:** REL-001–004 were written for the API-backed `/runs` workspace. On `demo/prototype-parity`, audit against the fresh v1.2 UI and note the API disconnect.

---

## 16. Agent operating instructions

1. **Read this file first** before planning or coding.
2. **Check `git status` and branch** before making changes — know if you are on `demo/prototype-parity` or `main`.
3. **Do not assume missing features exist** — inspect the repo.
4. **Do not broaden scope** beyond the selected REL issue.
5. **Before coding**, identify files to inspect (grep > guess).
6. **Distinguish fresh vs legacy vs API** — active UI is `fresh/`; do not edit `legacy/` unless explicitly reactivating it.
7. **After coding**, run `pnpm build`; run `pnpm api:validate` if you touched APIs/services.
8. **Summarise changed files** in your response.
9. **Do not commit unless requested.**
10. **Use UK English** in documentation.
11. **If uncertain, inspect** — do not hallucinate routes, tabs, or services.
12. **Do not change product code** when asked for documentation-only tasks.
13. **Mockup discipline:** FRESH for non-runs screens; v1.2 for `/runs` only.

---

## 17. Recommended next build sequence

Practical order given current state:

1. **Decide integration strategy** — keep demo-only `fresh/` or wire `/runs` back to API (ticket needed).
2. **Update stale docs** — README, `current-state.md` to reflect `fresh/` layer (or merge branch to `main`).
3. **REL-001** — Manual UX audit of fresh `/runs` vs v1.2 mockup.
4. **REL-002** — Duplicate result controls (footer + step inline buttons).
5. **Wire seal run** — `FreshProvider.sealRun` exists; connect UI or remove from `DEMO.md`.
6. **REL-003** — Loading, empty, and error states (especially if API integration resumes).
7. **REL-004** — Viewer read-only mode (needs fresh UI + API wiring).
8. **REL-006** — v0.1 readiness checklist.
9. **REL-007** — Tag stable checkpoint on `main`.

---

## 18. Copy-paste prompt for future agents

```
You are working on Relay. First read docs/collaboration/relay-agent-context.md and treat it as the current source-of-truth unless the repo contradicts it. Then inspect the selected REL issue and the relevant files before planning. Do not assume unimplemented modules exist. Keep the work ticket-led, narrow, and repo-grounded. Preserve thin API routes and service-layer business logic. Do not commit unless asked.
```

---

## 19. Final human summary

**What works:** A full five-screen demo UI (dashboard, cases, plans, runs, audit) runs locally with `pnpm dev` and no database. Navigation, case creation (localStorage), plan browsing, run execution with keyboard shortcuts, and global search all work as an interactive walkthrough. Behind that, the MySQL layer, seed data, and five API endpoints are implemented and validated separately.

**What is demoable today:** The `DEMO.md` script on branch `demo/prototype-parity` — suitable for stakeholder UI review. No login, no persistence of run results across reload.

**What is not built:** Real auth, API-connected product UI, step-level DB execution, run sealing in fresh UI, defects/reports modules, OpenSearch, production deployment, and most sidebar placeholders.

**What needs attention next:** Reconcile the fresh demo layer with the API-backed foundation (or document the split clearly), fix stale README/current-state, complete REL-001–004 against the actual UI, wire or drop seal-run, and land a stable tagged checkpoint on `main`.
