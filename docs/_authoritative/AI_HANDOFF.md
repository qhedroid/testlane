# Relay — AI handoff / bootstrap prompt

*Paste into a new ChatGPT, Claude, or Cursor chat. Repo wins over prose — verify paths in code when unsure.*

---

## Purpose & constraints

**Relay** is a QA test execution platform (clinical-trials-style workspace). Current delivery is a **frontend-only prototype** with mock data and browser persistence.

- **Frontend-only:** No backend/DB/API/Docker changes unless the user explicitly requests a backend slice.
- **No API wiring** for demo screens. Persistence = `FreshProvider` + `localStorage` only.
- **Authoritative docs:** Use **only** `docs/_authoritative/**` for requirements. Other `docs/**` may be stale.
- **UX invariants:** Do **not** change test run execution UX at `/:projectKey/testruns` (`RunsScreen`) unless asked. Do **not** replace with the legacy three-pane layout. Keep `/runs/api` isolated.
- **Labelling:** `PrototypeBanner` on mock/placeholder screens. **Do not commit** unless asked.

---

## Repo orientation

| Item | Path |
|------|------|
| Stack | Next.js 15 App Router, React 19, pnpm (`apps/web`) |
| Prototype UI | `apps/web/src/fresh/` |
| **Canonical store** | `apps/web/src/fresh/data/FreshProvider.tsx` |
| State types | `apps/web/src/fresh/data/demo-model.ts` |
| Selectors / migration | `project-selectors.ts`, `migrate-demo-state.ts` |
| **Project Switcher** | `components/ProjectSwitcher.tsx`, `CreateProjectModal.tsx` |
| **Route sync / helpers** | `ProjectRouteSync.tsx`, `LegacyRouteRedirect.tsx`, `lib/project-routes.ts`, `hooks/useProjectHref.ts` |
| **Canonical routes** | `apps/web/src/app/(app)/[projectKey]/*` |
| App layout | `apps/web/src/app/(app)/layout.tsx` — `FreshProvider` + `ProjectRouteSync` |
| Demo execution | `fresh/screens/RunsScreen.tsx` |
| API workspace | `components/api-runs/ApiRunsWorkspace.tsx` at `/runs/api` |

Do **not** import `apps/web/src/legacy/`. Dev: `pnpm install && pnpm dev`. After changes: `pnpm build`.

---

## Current behavior (as-built)

**Multi-project:** `projectsById` holds projects (`name`, `key`, `description?`, `seedTemplate?`). `activeProjectId` scopes folders, cases, runs (`projectId` on each). CRUD + `addDemoProject()` via `useFresh()`.

**Routing:** Canonical `/:projectKey/:moduleSlug` — e.g. `/DP/dashboard`, `/CTMS/testruns`. Slugs in `MODULE_SLUGS` (`project-routes.ts`). Root `/` → `/DP/dashboard`. Legacy `/dashboard`, `/cases`, `/runs`, … redirect via `LegacyRouteRedirect`. **`/runs/api` and `/api/*` are not project-prefixed.**

**URL ↔ store sync:** `ProjectRouteSync` parses URL key → `setActiveProject`. Unknown key → redirect to same module under active key (fallback `DP`). Switcher updates store + URL (`switchProjectPath`).

**Demo project:**
- Seed: **Demo Project** / key **`DP`**, `seedTemplate: 'demo'`, id `proj-ti-core` — verify `demo-seed.ts`, `demo-model.ts`.
- **Add demo project:** clones immutable template (`demo-template.ts`), never live store. Keys `DP1`, `DP2`, …; names `Demo Project N`; new entity ids; navigates to `/:key/dashboard`.
- **Dashboard:** `seedTemplate === 'demo'` → seeded metrics; else placeholder (“Dashboard coming soon”). Verify `demo-project-utils.ts`.

**Test runs:** `/:projectKey/testruns` = primary demo execution (steps, results, defects, sealed runs). Sealed runs block mutations.

---

## Data model overview

`DemoState` (`demo-model.ts`): `schemaVersion`, `projectsById`, `activeProjectId`, `folders[]`, `cases[]`, `runs[]`, `currentRunIdByProject{}`, `nextCaseNumByProject{}`.

| Entity | Scoping / relations |
|--------|---------------------|
| Folder | `projectId`, `parentId?` tree → cases use `folderId` |
| Case | `projectId`, `steps[]` → referenced in run `caseOrder[]` |
| DemoRun | `projectId`, `caseOrder[]`, `executions{caseId→CaseExecution}`, `sealed` |
| CaseExecution | `status`, `stepResults{}`, `defects?`, `assignee?` |
| TestPlan | Static `seed.ts` only — not in `DemoState` |

Use `listActiveProject*` selectors — always filter by `activeProjectId`.

---

## Persistence & migration

| Item | Value |
|------|-------|
| localStorage key | `relay-demo-v2` (`FreshProvider.tsx`) |
| schemaVersion | `3` (`DEMO_SCHEMA_VERSION`) |
| Migration | `migrateDemoState()` on load: v1/v2→v3; legacy `DEMO`→`DP`; `seedTemplate` on demo projects |
| Failure | `console.error` → `buildInitialDemoState()` (Demo Project / `DP`) |
| Reset | `localStorage.removeItem('relay-demo-v2'); location.reload()` |

---

## How to work in this repo

1. Read relevant `docs/_authoritative/*` (start: `PROJECT_CONTEXT.md`, `AS_BUILT_SNAPSHOT.md`, `FRONTEND_CONTRACTS.md`, `DOMAIN_MODEL.md`).
2. List files to modify and what stays unchanged.
3. Small incremental steps; match surrounding code style.
4. Update `docs/_authoritative/*` when contracts/model/routing change.
5. `pnpm build` after UI changes.

**Do not touch (unless asked):** `packages/db/**`, API routes, `/runs/api` layout, `RunsScreen` execution interactions, `legacy/`, new state libraries.

---

## Manual test checklist (template)

- [ ] `/DP/dashboard` shows demo metrics
- [ ] Blank project → placeholder dashboard; scoped empty cases/runs
- [ ] Project switch → URL + data scoped correctly
- [ ] Add demo project → `DP1`/`DP2` with pristine seed (even if `DP` edited)
- [ ] `/:projectKey/testruns` execution UX unchanged
- [ ] Legacy `/runs` → `/${activeKey}/testruns`
- [ ] `pnpm build` passes

---

## Quick links

**Docs:** `docs/_authoritative/README.md`, `PROJECT_CONTEXT.md`, `MVP_FRONTEND_ONLY_SCOPE.md`, `AS_BUILT_SNAPSHOT.md`, `FRONTEND_CONTRACTS.md`, `DOMAIN_MODEL.md`

**Code:** `FreshProvider.tsx`, `demo-model.ts`, `migrate-demo-state.ts`, `demo-template.ts`, `demo-project-utils.ts`, `project-selectors.ts`, `project-routes.ts`, `ProjectSwitcher.tsx`, `ProjectRouteSync.tsx`, `RunsScreen.tsx`, `DashboardScreen.tsx`, `app/(app)/[projectKey]/`

*June 2026. Verify branch/commit in repo.*
