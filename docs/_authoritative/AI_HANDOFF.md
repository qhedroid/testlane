# Testlane — AI handoff / bootstrap prompt

*Paste into a new ChatGPT, Claude, or Cursor chat. Repo wins over prose — verify paths in code when unsure.*

---

# Testlane — AI handoff / bootstrap (paste into a new ChatGPT/Claude/Cursor chat)

You are stepping into an existing repo called **Testlane**. Treat the **repo as ground truth**. When unsure, inspect code and cite file paths.

## 1. Purpose & constraints (non‑negotiable)
- **Product:** Testlane is a QA test execution platform (clinical-trials-style workspace).
- **Phase:** **Frontend-only prototype**.
  - Do **not** implement/modify backend, DB/schema, Docker, auth, or API routes unless explicitly asked.
  - Do **not** wire demo screens to real APIs. Persistence is **client-side only** (FreshProvider + localStorage).
- **Authoritative docs:** Only `docs/_authoritative/**` defines requirements/contracts. Ignore other `docs/**` unless explicitly requested.
- **UX invariants:** Do not change test run execution UX at `/:projectKey/testruns` (RunsScreen) unless asked.
  - Do not replace with legacy three-pane layout.
  - Keep `/runs/api` isolated (API workspace).
- **Workflow:** Do not create commits unless asked.

## 2. Repo orientation (verify in repo)
- **Stack:** Next.js App Router (apps/web), React, pnpm.
- **Prototype UI root:** `apps/web/src/fresh/`
- **Canonical store:** `apps/web/src/fresh/data/FreshProvider.tsx`
- **State types:** `apps/web/src/fresh/data/demo-model.ts`
- **Migration:** `apps/web/src/fresh/data/migrate-demo-state.ts`
- **Selectors:** `apps/web/src/fresh/data/project-selectors.ts`
- **Project switcher UI:** `apps/web/src/fresh/components/ProjectSwitcher.tsx` and `CreateProjectModal.tsx` (verify exact paths)
- **Routing helpers / sync:** `ProjectRouteSync.tsx`, `LegacyRouteRedirect.tsx`, `lib/project-routes.ts`, `hooks/useProjectHref.ts` (verify)
- **Canonical routes:** `apps/web/src/app/(app)/[projectKey]/*`
- **App layout wiring:** `apps/web/src/app/(app)/layout.tsx` (FreshProvider + route sync)
- **Primary demo execution screen:** `apps/web/src/fresh/screens/RunsScreen.tsx`
- **API workspace (non-prefixed):** `apps/web/src/fresh/components/api-runs/ApiRunsWorkspace.tsx` at `/runs/api`
- **Avoid:** `apps/web/src/legacy/**` unless explicitly requested.

Dev commands (typical):
- `pnpm install`
- `pnpm dev`
- After changes: `pnpm build`

## 3. Current behavior (as-built; confirm via code + authoritative docs)
### Multi-project model
- Projects have: **name**, **key** (uppercase), **description** (optional).
- Store has `projectsById` + `activeProjectId`.
- All core entities are project-scoped via `projectId` (folders, cases, runs, executions).
- Project CRUD exists via store/hooks: create/rename/delete/switch and **add demo project**.

### Routing (key-prefixed)
- Canonical routes are `/:projectKey/<module>` e.g.:
  - `/DP/dashboard`
  - `/CTMS/testruns`
- Module slugs live in `project-routes.ts` (verify constant name).
- Root `/` redirects to `/DP/dashboard`.
- Legacy routes like `/dashboard`, `/cases`, `/runs` redirect via `LegacyRouteRedirect` to the active project path.
- `/runs/api` and `/api/*` are **not** project-prefixed.

### URL ↔ store sync
- `ProjectRouteSync` parses `projectKey` from the URL and sets active project.
- Unknown `projectKey` redirects to same module under the active key (fallback `DP` if needed).
- Project switcher updates both store and URL (helper like `switchProjectPath` / `useProjectHref`).

### Demo project semantics
- Default seeded project:
  - Name: **Demo Project**
  - Key: **DP**
  - Contains prefilled seed data
  - Has a stable ID like `proj-ti-core` (verify in seed file)
- **Add demo project**:
  - Clones from an **immutable demo template** (e.g. `demo-template.ts`).
  - Ignores any user edits in the current session.
  - Keys increment: `DP1`, `DP2`, …
  - Creates new IDs for all cloned entities.
  - Navigates to `/:key/dashboard`.

### Dashboards
- Dashboards are project-specific.
- All projects compute metrics from live `FreshProvider` state (active unsealed/unarchived runs, cases, folders).
- Projects with zero test cases show an onboarding empty state; projects with cases show real metrics (including zero-state when no runs exist).

### Test runs (critical)
- `/:projectKey/testruns` is the primary execution experience.
- Supports steps/results/defects/comments, sealed run behavior, keyboard shortcuts.
- Sealed runs must remain non-mutable.

## 4. Data model overview (practical)
Typical `DemoState` (see `demo-model.ts`; verify exact shape):
- `schemaVersion`
- `projectsById`
- `activeProjectId`
- `folders[]`
- `cases[]`
- `runs[]`
- `currentRunIdByProject: Record<projectId, runId>`
- `nextCaseNumByProject: Record<projectId, number>`

Relations/scoping:
- Folder: `projectId`, tree via `parentId?`
- Case: `projectId`, `folderId?`, `steps[]`
- Run: `projectId`, `caseOrder[]`, `executions` keyed by caseId, `sealed`
- Use selectors like `listActiveProject*` (always filter by `activeProjectId`)

## 5. Persistence & migration (verify values in code)
- localStorage key: `testlane-demo-v2` (verify in FreshProvider)
- schemaVersion: `DEMO_SCHEMA_VERSION` (value may be 2/3+; verify)
- `migrateDemoState()` runs on load:
  - Migrates legacy versions → current schemaVersion
  - Handles legacy `DEMO` key → `DP` key change (if implemented)
  - On migration failure: logs error and falls back to fresh seeded initial state
- Reset for testing:
  - `localStorage.removeItem('testlane-demo-v2'); location.reload()`

## 6. How to work (required process)
Before implementing any task:
1) Read relevant `docs/_authoritative/*` (start with `PROJECT_CONTEXT.md`, `AS_BUILT_SNAPSHOT.md`, `DOMAIN_MODEL.md`, `FRONTEND_CONTRACTS.md`).
2) List planned file changes + what will remain unchanged.
3) Make incremental changes; match existing code style.
4) Update authoritative docs when model/contracts/routing change.
5) Run `pnpm build` when UI/routing/store changes.

Do not touch unless explicitly requested:
- backend/db packages, API routes, `/runs/api` behavior, RunsScreen execution interactions, `legacy/`, introducing new state libraries.

## 7. Manual test checklist (template)
- `/DP/dashboard` shows demo dashboard content
- Create blank project → placeholder dashboard; cases/runs empty + scoped
- Switch projects → URL updates; data scopes correctly
- Add demo project twice → `DP1`, `DP2` seeded from pristine template even if `DP` edited
- `/:projectKey/testruns` execution UX unchanged
- Legacy `/runs` redirects to `/${activeKey}/testruns`
- `pnpm build` passes

## 8. Quick links
Authoritative docs:
- `docs/_authoritative/README.md`
- `PROJECT_CONTEXT.md`
- `MVP_FRONTEND_ONLY_SCOPE.md`
- `AS_BUILT_SNAPSHOT.md`
- `FRONTEND_CONTRACTS.md`
- `DOMAIN_MODEL.md`

Core code:
- `FreshProvider.tsx`, `demo-model.ts`, `migrate-demo-state.ts`, `project-selectors.ts`
- `demo-template.ts`, `demo-project-utils.ts` (verify names/paths)
- `project-routes.ts`, `ProjectRouteSync.tsx`, `ProjectSwitcher.tsx`, `RunsScreen.tsx`
- `apps/web/src/app/(app)/[projectKey]/...`

Date note: June 2026. Verify branch/commit in repo.
