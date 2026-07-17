> **STALE / SUPERSEDED** — This document is no longer maintained. Use [`docs/_authoritative/AS_BUILT_SNAPSHOT.md`](../_authoritative/AS_BUILT_SNAPSHOT.md) and [`docs/_authoritative/PROJECT_CONTEXT.md`](../_authoritative/PROJECT_CONTEXT.md) instead. For setup steps, see [`getting-started.md`](getting-started.md).

# Handover — Testlane for a technical collaborator

Short context if you are joining to help on execution UX and v0.1 readiness. Read this first, then [`getting-started.md`](getting-started.md).

---

## What Testlane is

Testlane is an internal-style QA platform aimed at replacing generic tools (TestRail/Testiny) for teams working across product modules (CTMS, eTMF, Viewer, etc.). The **product vision** lives in `docs/product/` and the **interactive prototype** in `mockup/Testlane_Prototype_v1.2.html`.

**Right now the repo is a local-dev MVP**, not a deployed product. Auth is fake (seed user IDs in headers). MySQL is real. OpenSearch runs in Docker but the app does not index anything yet.

---

## What currently works

- Monorepo: Next.js app + Drizzle package
- MySQL schema, migrations, idempotent seed (`relay-dev`)
- Create a test run from PLAN-001 (admin user in seed)
- List runs, load run detail with execution cases
- Update case result status and execution-level comment
- RBAC enforced in services (viewer cannot mutate; contributor can execute)
- `/runs` UI: Testlane shell + three-pane execution workspace
- `pnpm build` and `pnpm api:validate`

---

## What `/runs` includes today

1. **Left** — run list and create-run form  
2. **Middle** — selected run summary, compact count cards, status filter chips, case search, case list  
3. **Right** — selected case detail: metadata, result buttons, comment field  

Data is fully API-backed. Refresh the page and status/comments should still be there.

---

## What is not done

- Dashboard, global search, Test Plans / Test Cases screens  
- Real login, SSO, sessions  
- Step-level execution, defects, activity/history UI  
- Run sealing from the UI  
- OpenSearch in the app  
- Production hosting, workers, notifications  

Do not assume anything in the HTML prototype exists in Next.js unless you verify in `apps/web`.

---

## How to run it

```bash
git clone https://github.com/noel-q/testlane.git
cd Testlane
pnpm install
cp .env.example .env
pnpm docker:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open http://localhost:3000/runs

If something breaks after a build:

```bash
pnpm dev:reset
pnpm dev
```

---

## How to contribute safely

1. Read [`working-agreement.md`](working-agreement.md) — branch from `main`, no direct feature commits to `main`.  
2. Pick or create an issue (see [`github-setup.md`](github-setup.md)).  
3. Before a PR: `pnpm build` and `pnpm api:validate`.  
4. Keep changes focused; match existing patterns in `packages/db/services/` and thin API routes.  
5. Do not change schema/seed without explicit agreement—that affects everyone’s local DB.

---

## Next milestones

**Immediate focus:** v0.1 Execution Readiness — polish `/runs`, ticket-led delivery, collaboration hygiene (this doc set).

**After that (typical order):**

- Activity/history read API + minimal UI  
- Step-level execution when the backend contract exists  
- Run seal/archive HTTP  
- Broader product surfaces (plans, cases, dashboard) only when scoped

Engineering checkpoint: [`docs/implementation/current-state.md`](../implementation/current-state.md)  
API contract: [`docs/implementation/api-contracts.md`](../implementation/api-contracts.md)

---

## Questions?

Check `docs/collaboration/` and `docs/implementation/`. If behaviour disagrees with the prototype, the **running app and API contract win** until product signs off a change.
