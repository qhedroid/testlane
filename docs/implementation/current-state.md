# Relay — Current Implementation State

**Canonical engineering checkpoint.** Use this document to resume implementation work. Architecture philosophy and product intent remain in `docs/architecture/` and `docs/product/` — this file covers what is built, how to run it, and what comes next.

*Last updated: May 2026*

---

## 1. Project Status

### Current phase

**Phase 1 — Local foundation and data layer.** Design and architecture exploration remain the product baseline; implementation has started with a runnable monorepo, database schema, migrations, seed data, and minimal app shell.

### Completed

| Area | Status |
|------|--------|
| Monorepo bootstrap | pnpm workspaces, `@relay/web`, `@relay/db` |
| Next.js app shell | App Router, `/api/health`, dev placeholder page |
| Drizzle schema | 20-table MySQL model in `packages/db/schema.ts` |
| Migrations | `0000` initial schema, `0001` capability RBAC roles |
| Docker local stack | MySQL 8.0 + OpenSearch 2.18 |
| DB connection module | `packages/db/src/index.ts` (`getDb`, `pingDatabase`) |
| Idempotent dev seed | `relay-dev` org, 6 module projects, users, cases, plans, `ref_counters` |
| RBAC model | Platform roles: `super_admin`, `admin`, `contributor`, `viewer` |
| TestRunService.create() | Wired to `@relay/db` runtime; validated via `pnpm db:validate-create-run` |
| ExecutionService.updateCaseResult() | Wired; validated via `pnpm db:validate-update-case-result` |
| Internal HTTP API | `GET /api/health`, `POST /api/runs`, `POST /api/runs/:runId/cases/:runCaseId/result`; contract in `api-contracts.md`; `pnpm api:validate` |
| Interactive prototype | `mockup/Relay_Prototype_v1.2.html` (unchanged, no build step) |

### Intentionally deferred

- Product UI screens (Dashboard, Cases, Plans, Runs, Cmd K, etc.)
- Real authentication (NextAuth / SSO) — dev uses `x-relay-user-id` header only
- Auth / session (NextAuth, credentials, SSO)
- OpenSearch indexing and `SearchService`
- Remaining service layer (`ExecutionService` step results, `AuditService` wiring, etc.)
- AWS deployment (ECS, ALB, Aurora, Secrets Manager)
- Background workers / job queues
- S3 attachments, email, CI/CD integration
- Infra hardening and production observability

---

## 2. Current Stack

| Layer | Decision | Local today | Production target |
|-------|----------|-------------|-------------------|
| App | Next.js (App Router, API routes) | `apps/web` | Same |
| Package manager | pnpm workspaces | Root + filters | Same |
| ORM | Drizzle ORM 0.30.x (MySQL dialect) | `packages/db` | Same |
| Primary database | MySQL-compatible | Docker MySQL 8.0 | Aurora MySQL 3.x |
| Search | OpenSearch | Docker (running, unused by app) | AWS OpenSearch Service |
| IDs | ULID (application-generated) | Enforced in schema | Same |
| Compute | — | `pnpm dev` on host | ECS Fargate |
| Edge / CDN | — | — | CloudFront + ALB |
| Cloud | AWS-first | Local Docker only | ECR, VPC, Secrets Manager |

---

## 3. Repository Structure

```
relay/
├── apps/web/              # Next.js application (health route only at MVP shell stage)
├── packages/db/           # Drizzle schema, migrations, connection, seed, service references
├── docs/
│   ├── architecture/    # Canonical architecture baseline, TestRunService design
│   ├── database/        # Schema rationale
│   ├── product/         # UX philosophy, design system, changelog
│   └── implementation/  # This checkpoint and future implementation notes
├── assets/branding/     # Brand tokens and reference sheet
├── mockup/              # Interactive HTML prototype (v1.2) — UX source of truth
├── docker-compose.yml   # Local MySQL + OpenSearch
├── scripts/             # wait-for-mysql.sh (used by db:migrate / db:seed)
└── .env.example         # Local connection templates (copy to repo root `.env`)
```

| Path | Purpose |
|------|---------|
| `apps/web` | Next.js full-stack host; currently minimal — not the product UI |
| `packages/db` | Schema, Drizzle Kit migrations, DB client, dev seed, service reference code |
| `docs` | Architecture, product, and implementation documentation |
| `assets` | Branding assets and design tokens |
| `mockup` | Standalone prototype; open in browser, no build |

---

## 4. Local Development Status

### Docker

```bash
pnpm docker:up          # MySQL :3306, OpenSearch :9200
pnpm docker:down        # stop containers
docker compose down -v  # reset volumes (wipes DB)
```

`pnpm db:migrate` and `pnpm db:seed` call `scripts/wait-for-mysql.sh` automatically. After `docker compose up -d`, allow 30–60s for MySQL to reach healthy before migrating.

### Health endpoint

`GET /api/health` — confirms app boot and MySQL (`SELECT 1`). Does not check OpenSearch or schema completeness.

```bash
pnpm dev
curl http://localhost:3000/api/health
# Expected: {"status":"ok","app":"ok","mysql":"ok",...}
```

### Migrations

| Tag | File | Purpose |
|-----|------|---------|
| `0000_futuristic_gabe_jones` | Initial 20-table schema | Fresh DB |
| `0001_capability_rbac_roles` | Role enum migration | Required on DBs created with legacy `qa_lead` / `qa_engineer` enums |

```bash
pnpm db:migrate
```

### Schema

- **Source of truth:** `packages/db/schema.ts`
- **Helper table:** `ref_counters` (created by seed script if missing; used by `TestRunService.create()` for `run_ref` generation)
- **Drizzle ORM:** pinned to `0.30.10` via root `pnpm.overrides`

### OpenSearch

Container runs locally with security plugin disabled. **No application client or indexing** is implemented yet. `OPENSEARCH_URL` is in `.env.example` for future `SearchService` work.

### Seed data

```bash
pnpm db:seed    # Idempotent — clears `relay-dev` org scope and reinserts
```

Provides organisation, five users, six module projects (CTMS, eTMF, Viewer, SSO/IAM, Reporting, API Gateway), folders, cases, steps, plans, and `ref_counters`. Stable IDs for manual testing are in `packages/db/src/seed/ids.ts`.

### Typical local workflow

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
curl http://localhost:3000/api/health
```

---

## 5. Canonical Architecture Decisions

| Decision | Summary |
|----------|---------|
| **Immutable run snapshots** | `test_run_cases` snapshot columns set once at run spawn; result columns mutable until sealed |
| **Append-only audit log** | `audit_log` — INSERT only; no UPDATE/DELETE at service layer |
| **Service-layer architecture** | Business logic in services under `packages/db/services/` (future: `apps/web` imports); API routes stay thin |
| **ULID primary keys** | 26-char time-ordered IDs generated in application code, not DB auto-increment |
| **Split-pane operational UX** | Prototype demonstrates list + detail execution workspace; UI not implemented in Next.js yet |
| **RBAC at capability level** | Four platform roles; enforced in middleware (future) and services (e.g. spawn gate on `TestRunService`) |
| **Project = module** | CTMS, eTMF, etc. are `projects` in the data model; UI may say "module" contextually |
| **MySQL primary, OpenSearch for search** | No NoSQL at MVP; search index is denormalised sync from MySQL writes |

Full detail: `docs/architecture/relay-architecture-baseline.md`.

---

## 6. Canonical RBAC Model

### Approved platform roles

| Role | Capability summary |
|------|-------------------|
| `super_admin` | Platform-wide authority — users, global settings, cross-project access |
| `admin` | Project management — suites, folders, plans, runs, assignments, seal/reopen runs |
| `contributor` | Operational work — execute tests, results, comments, defect links |
| `viewer` | Read-only — audit and review access |

**Hierarchy:** `super_admin > admin > contributor > viewer`  
**Effective role per project:** `MAX(users.global_role, project_roles.role)`

### Explicit rule

**Business and job titles are NOT RBAC enums.**  
Examples that must **not** appear as `global_role` or `project_roles.role` values:

`qa_lead`, `qa_manager`, `automation_engineer`, `validation_specialist`, `tester`

Those belong in **organisational metadata** (profile fields, team structure, HR integration) — not permission checks.

Migration `0001` maps legacy seed enums (`qa_lead` → `admin`, `qa_engineer` → `contributor`) for existing local databases.

---

## 7. Current Known Risks / Open Questions

| Topic | Notes |
|-------|-------|
| **Run snapshot transaction** | `TestRunService.create()` is a large atomic transaction (cases, step snapshots, audit). Lock contention on `ref_counters` under concurrency — design doc covers `FOR UPDATE` pattern |
| **OpenSearch sync** | Write-through indexing strategy defined in architecture; no client, no retry/sync job implemented |
| **Auth / sessions** | Schema has `users` table; NextAuth adapter tables and API session middleware not built |
| **Background workers** | Deferred — indexing retries, S3 cleanup, notifications would need a worker strategy (Phase 2) |
| **Infra hardening** | Local Docker uses default credentials; production VPC, secrets, IAM, and ALB rules not implemented |
| **OpenSearch indexing** | `createRun` post-commit index uses a local no-op client; run `indexed_at` stays NULL until SearchService is built |
| **Folder self-FK** | `folders.parent_id` FK to self added via raw migration note in schema — verify in DB if tree depth features are tested |

---

## 8. Current Verification Workflow

Run before marking implementation work complete or opening a PR:

```bash
cd /Users/nquadri/Documents/Relay

# 1. Production build
pnpm build

# 2. Docker services healthy
docker compose ps
# relay-mysql and relay-opensearch should show healthy

# 3. Schema + seed (after compose up)
pnpm db:migrate
pnpm db:seed

# 4. Service validation
pnpm db:validate-create-run
pnpm db:validate-update-case-result

# 5. HTTP API (requires pnpm dev in another terminal)
pnpm api:validate

# 6. App health
curl http://localhost:3000/api/health

# 6. Working tree
git status
```

**Build:** `pnpm build` must complete without TypeScript errors.  
**Health:** Expect HTTP 200 and `"mysql":"ok"` when MySQL is up and `.env` is configured.  
**Git:** Ensure intended files are staged; no secrets in commits (`.env` is gitignored).

Optional DB sanity check:

```bash
docker compose exec mysql mysql -u relay -prelay relay -e \
  "SELECT email, global_role FROM users; SELECT plan_ref, status FROM test_plans;"
```

---

## 9. Next Immediate Task

### Next implementation phase

**Read APIs for frontend** (run list/detail) and/or **run sealing HTTP** — UI screens still deferred. API contract: `docs/implementation/api-contracts.md`.

```bash
pnpm dev
pnpm api:validate
```

### Completed in this phase

- API contract documentation (`docs/implementation/api-contracts.md`)
- Thin Next.js routes with Zod validation and standard JSON errors
- Temporary dev auth via `x-relay-user-id` header

### Explicitly deferred

**UI implementation remains intentionally out of scope.**

---

## Related documents

| Document | Use when |
|----------|----------|
| `docs/architecture/relay-architecture-baseline.md` | Full architecture, schema domains, permission matrix |
| `docs/architecture/TestRunService-design.md` | Run spawn flow, errors, transaction phases |
| `docs/database/schema-rationale.md` | ULID, refs, snapshot design rationale |
| `README.md` | Quick local setup commands |
| `docs/implementation/api-contracts.md` | HTTP API contract for frontend integration |
| `mockup/Relay_Prototype_v1.2.html` | UX behaviour reference |
