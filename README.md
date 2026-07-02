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

## What works today

- Create test runs from a seeded plan (CTMS / PLAN-001)
- List runs and open run detail with execution cases
- Three-pane execution workspace: run list · case list · case detail
- Update case status and execution comments (persisted via API)
- Client-side status filters and case search within a run
- Dev RBAC via `x-relay-user-id` header (seed users; no real login)
- `pnpm api:validate` HTTP contract suite

API contract: [`docs/implementation/api-contracts.md`](docs/implementation/api-contracts.md)

---

## Current limitations

- No real authentication or SSO
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
