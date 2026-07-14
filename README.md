# Relay

Relay is a QA test execution platform. The current focus is **Test Runs** and execution workflows on a local MVP foundation. It is not production-ready yet.

This repository contains a runnable monorepo (Next.js + Drizzle + MySQL), API-backed `/runs` UI, architecture and product documentation, and an interactive HTML prototype for UX reference.

**Remote:** https://github.com/qhedroid/Relay.git  
**Latest milestone:** Test Plans polish + Requirements & Defects slice (commit `7199115`)

---

## Current stack

| Layer | Technology |
|-------|------------|
| App | Next.js 15 (App Router, API routes) |
| Workspace | pnpm |
| ORM | Drizzle ORM (MySQL dialect) |
| Database | MySQL 8 (Docker locally) |
| Local infra | Docker Compose |
| Search | OpenSearch container is present but **not wired into the app yet** |

---

## Repository structure

```
relay/
├── apps/web/              # Next.js application (/runs, API routes)
├── packages/db/           # Drizzle schema, migrations, seed, services
├── docs/                  # Architecture, product, implementation, collaboration
├── mockup/
│   └── Relay_Prototype_v1.2.html   # UX reference (open in browser, no build)
├── docker-compose.yml
└── .env.example
```

Deeper detail: [`docs/implementation/current-state.md`](docs/implementation/current-state.md)

---

## Local setup

### Requirements

- Node.js 20+
- pnpm 9+
- Docker Desktop
- Git

### Commands

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

**Open:** http://localhost:3000/runs

After `docker compose up -d`, allow 30–60 seconds for MySQL to become healthy before migrating.

### Validation

```bash
pnpm build
pnpm api:validate   # requires pnpm dev running on port 3000
```

Service-level checks (optional):

```bash
pnpm db:validate-create-run
pnpm db:validate-update-case-result
```

Health check:

```bash
curl http://localhost:3000/api/health
```

Expect `"status":"ok"` and `"mysql":"ok"`.

---

## Local dev login

After `pnpm db:seed`, the app has real NextAuth-backed login (JWT session, Credentials
provider). All eight seed users share one local-dev password:

```
testlane-demo-2026
```

The "Admin role" column is the closest equivalent in the Admin panel's separate, more granular
role model (Owner/Administrator/Project Administrator/Editor/Run Manager/Run
Executor/Viewer — see `apps/web/src/fresh/data/rbac.ts`); the DB's `globalRole` enum only has
four values, so it's a compressed mapping, not a 1:1 match.

| Email | Name | Global role (DB) | Admin role |
|-------|------|-------------|------------|
| `nquadri@ti.com` | Noel Quadri | super_admin | Administrator |
| `ssevume@ti.com` | Shaun Sevume | admin | Administrator |
| `elena.voss@testlane.dev` | Elena Voss | contributor | Editor |
| `devon.reyes@testlane.dev` | Devon Reyes | contributor | Run Executor |
| `marcus.webb@testlane.dev` | Marcus Webb | contributor | Run Executor |
| `sam.okafor@testlane.dev` | Sam Okafor | contributor | Editor |
| `priya.malhotra@testlane.dev` | Priya Malhotra | viewer | Viewer |
| `tom.bright@testlane.dev` | Tom Bright | contributor | Run Manager |

Visiting any app route while logged out redirects to `/login`. `/api/runs/*` is the one
exception — it still authenticates via the legacy `x-relay-user-id` dev header pending a
later phase (`mvp-backend` task/phase 4) that moves it onto real sessions too.

---

## What works today

- Real login/session (NextAuth Credentials, JWT strategy) gates the app
- Create test runs from a seeded plan (CTMS / PLAN-001)
- List runs and open run detail with execution cases
- Three-pane execution workspace: run list · case list · case detail
- Update case status and execution comments (persisted via API)
- Client-side status filters and case search within a run
- `/api/runs/*` still uses `x-relay-user-id` header auth (seed users) pending later wiring
- `pnpm api:validate` HTTP contract suite

API contract: [`docs/implementation/api-contracts.md`](docs/implementation/api-contracts.md)

---

## Current limitations

- No real SSO (the login screen's SSO button is a visual placeholder)
- No production deployment
- No dashboard
- No global search
- No OpenSearch indexing in the app
- No Test Plans screen
- No Test Cases screen
- No step-level execution
- No defects workflow
- No activity/history UI
- No notifications or background workers

---

## Collaborating

New to the repo? Start here:

| Document | Purpose |
|----------|---------|
| [`docs/collaboration/getting-started.md`](docs/collaboration/getting-started.md) | Clone, run, troubleshoot |
| [`docs/collaboration/working-agreement.md`](docs/collaboration/working-agreement.md) | Branches, commits, PRs |
| [`docs/collaboration/github-setup.md`](docs/collaboration/github-setup.md) | GitHub project, labels, first issues |
| [`docs/collaboration/friend-handover.md`](docs/collaboration/friend-handover.md) | Short handover for a technical collaborator |

Interactive prototype (UX only): open `mockup/Relay_Prototype_v1.2.html` in a browser.

---

## Licence

MIT
