# Relay — Frontend screen contracts

*Branch: `demo/contract-aware-prototype`. Companion: [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md).*

This document defines what each visible screen shows, what data powers it today, and what future APIs are expected. **Do not treat mock screens as production-ready.**

---

## Dashboard

**Route:** `/dashboard`

**Current state:** Frontend prototype only.

**Real/API-backed, mock-backed, or placeholder:** Mock-backed.

**Data source:** `apps/web/src/fresh/data/seed.ts` (`RUN_CARDS`, `ATTENTION_ITEMS`, `COVERAGE_ITEMS`).

**Data shown:** Active run count cards, sprint subtitle, expandable run cards (overview/assignees/defects tabs), needs-attention list, module coverage bars.

**User actions:** Expand/collapse run cards; switch card tabs; navigate to `/runs` via New Run / attention links; export button (visual only).

**Future API contract:**
- `GET /api/dashboard/summary` — metric cards
- `GET /api/runs?status=active` — run cards
- `GET /api/attention-items` — needs-attention queue

**Known backend dependency:** Run list read API exists but is not wired to this screen.

**Out of scope:** Live metrics, real defect counts, authenticated user context.

**Notes for future backend implementation:** Keep dashboard read-only initially; aggregate from runs + defects services.

---

## Test Cases Library

**Route:** `/cases` (alias: `/test-cases` → redirect)

**Current state:** Frontend prototype only.

**Real/API-backed, mock-backed, or placeholder:** Mock-backed (`localStorage` for user-created cases).

**Data source:** `fresh/data/seed.ts` + `FreshProvider` + localStorage key `relay-demo-v2`.

**Data shown:** Suite/folder tree, case table (ref, title, priority, type, last result, owner, steps), detail panel (details/history/activity), bulk selection bar.

**User actions:** Folder navigation; status filter chips; search (toolbar); quick create; new case modal; row select / bulk bar; import shows empty state only.

**Future API contract:**
- `GET /api/test-cases`
- `POST /api/test-cases`
- `GET /api/test-cases/:caseId`
- `PATCH /api/test-cases/:caseId`

**Data needed:** case ref, title, priority, type, module/folder/suite, owner, status, last updated, steps, tags.

**Known backend dependency:** `test_cases`, `test_case_steps`, `folders` tables exist; no read API.

**Out of scope:** Step execution, defects workflow, audit history write, bulk import, clone/export.

**Notes for future backend implementation:** Align folder tree with `folders` table; preserve case ref generation pattern from seed.

---

## Test Plans

**Route:** `/plans` (alias: `/test-plans` → redirect)

**Current state:** Frontend prototype only.

**Real/API-backed, mock-backed, or placeholder:** Mock-backed.

**Data source:** `fresh/data/seed.ts` (`PLANS`).

**Data shown:** Plan list (active/draft), status pill, case count, owner, last updated, detail tabs (overview, included suites, run history).

**User actions:** Select plan; switch tabs; spawn run link navigates to `/runs` (does **not** call `POST /api/runs`).

**Future API contract:**
- `GET /api/test-plans`
- `GET /api/test-plans/:planId`
- `POST /api/test-plans/:planId/spawn-run` (or reuse `POST /api/runs`)

**Known backend dependency:** `test_plans`, `test_plan_cases` tables exist; `createRun` service implements spawn.

**Out of scope:** Plan edit, clone, export, version history.

---

## Test Runs (demo execution UI)

**Route:** `/runs`

**Current state:** Frontend prototype — **Shaun's v1.2 FRESH execution workspace** (primary demo route).

**Real/API-backed, mock-backed, or placeholder:** Mock-backed (in-memory `FreshProvider` + localStorage).

**Implementation:** `apps/web/src/fresh/screens/RunsScreen.tsx`, `fresh/styles/prototype-runs.css`.

**Data shown:** Run picker, header donuts, case list with filters, step results, keyboard shortcuts, tabs (details/steps/activity/history/comments/defects).

**User actions:** Full demo execution flow per `DEMO.md` — in-memory/localStorage; sealed runs block mutations.

**Future API contract:** Same as `/runs/api` — wire this UI to existing HTTP routes without replacing the layout.

**Known backend dependency:** None for demo. Docker optional.

**Out of scope:** Persisting results to MySQL from this route (use `/runs/api` until wired).

**Notes:** **Do not swap this route back to the legacy three-pane UI.** Extend Shaun's screen toward API integration.

---

## Test Runs (API workspace)

**Route:** `/runs/api`

**Current state:** **API-backed** — MySQL via existing HTTP routes.

**Real/API-backed, mock-backed, or placeholder:** API-backed.

**Data source:** `GET/POST /api/runs`, `GET /api/runs/:runId`, `POST /api/runs/:runId/cases/:runCaseId/result`.

**Implementation:** `apps/web/src/components/api-runs/ApiRunsWorkspace.tsx`.

**Data shown:** Run list with progress; case list with filters/search; case detail with result buttons and execution comment.

**User actions:** Create run; update case result; save comment (persisted).

**Known backend dependency:** Docker MySQL, migrations, seed. Auth via `NEXT_PUBLIC_RELAY_USER_ID`.

**Notes:** Preserved for `pnpm api:validate` and backend integration testing. Not the stakeholder demo surface.

---

## Audit History

**Route:** `/audit`

**Current state:** Frontend prototype only.

**Real/API-backed, mock-backed, or placeholder:** Mock-backed.

**Data source:** `fresh/data/seed.ts` (`AUDIT_EVENTS`).

**Data shown:** Audit timeline, event type icon, actor/action HTML, context line, timestamp. Filter chips (client-side).

**User actions:** Filter by event category; export button (visual only).

**Future API contract:**
- `GET /api/audit-events?module=&actor=&from=&to=`

**Known backend dependency:** `audit_log` table written on run create and case result update; **no read API**.

**Out of scope:** Real-time feed, pagination, export, write from UI.

---

## Defects

**Route:** `/defects`

**Current state:** Frontend prototype only.

**Real/API-backed, mock-backed, or placeholder:** Mock-backed.

**Data source:** `apps/web/src/lib/relay/mock-data.ts` (`MOCK_DEFECTS`).

**Data shown:** Defect table (ID, title, severity, status, module, owner); detail panel with linked case/run, timestamps.

**User actions:** Search; filter by status/severity; select row for detail; new defect button disabled (placeholder).

**Future API contract:**
- `GET /api/defects`
- `POST /api/defects`
- `PATCH /api/defects/:defectId`
- `POST /api/defects/:defectId/link-case`

**Known backend dependency:** No defects schema or API.

**Out of scope:** Jira sync, workflow transitions, attachments.

**Notes:** In-run defect linking works in demo `/runs` (in-memory IDs) but is not wired to this screen.

---

## Settings

**Route:** `/settings`

**Current state:** Frontend prototype only.

**Real/API-backed, mock-backed, or placeholder:** Mock-backed.

**Data source:** `apps/web/src/lib/relay/mock-data.ts` (workspace modules, users preview).

**Data shown:** Workspace fields (read-only), module list, users/roles table, local demo status notes.

**User actions:** View only — inputs are read-only.

**Future API contract:**
- `GET /api/workspace`
- `GET /api/users`
- `PATCH /api/workspace/settings`

**Known backend dependency:** Seed users/projects exist; no settings API; no real auth.

**Out of scope:** SSO configuration, API keys, billing.

---

## Reports

**Route:** `/reports`

**Current state:** Placeholder screen.

**Real/API-backed, mock-backed, or placeholder:** Placeholder.

**Data shown:** Planned-module message and future API list.

**User actions:** Navigate back to dashboard.

**Future API contract:** `GET /api/reports`, `GET /api/reports/execution-summary`

**Out of scope:** All report generation until backend contract exists.

---

## Integrations

**Route:** `/integrations`

**Current state:** Placeholder screen.

**Real/API-backed, mock-backed, or placeholder:** Placeholder.

**Data shown:** Planned-module message.

**Future API contract:** `GET /api/integrations`, `POST /api/integrations/:provider/connect`

**Out of scope:** OAuth flows, webhooks, third-party SDKs.

---

## Shared mock data locations

| File | Purpose |
|------|---------|
| `apps/web/src/lib/relay/mock-data.ts` | Central mock exports + defects/settings data |
| `apps/web/src/lib/relay/prototype-contracts.ts` | Route metadata for agents |
| `apps/web/src/fresh/data/seed.ts` | Dashboard, cases, plans, audit seed |
| `apps/web/src/fresh/data/FreshProvider.tsx` | In-memory state for cases + runs (`relay-demo-v2`) |

---

## UI labelling convention

Mock and placeholder screens display a **source banner** (`PrototypeBanner` component):

- **Frontend prototype** — yellow banner, mock data
- **API-backed** — blue banner on `/runs/api`
- **Planned module** — grey banner on reports/integrations
