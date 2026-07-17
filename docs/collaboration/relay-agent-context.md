# Testlane — Agent source-of-truth context

*Last updated: June 2026. Branch `demo/prototype-parity`.*

---

## 1. Purpose

Source-of-truth for Cursor, ChatGPT, and human collaborators. **Read before planning or coding.**

If this file conflicts with the repository, **the repo wins** — update this file after verifying.

Companion docs:
- `docs/implementation/frontend-contracts.md` — per-screen contracts
- `docs/implementation/api-contracts.md` — HTTP API for `/runs`
- `DEMO.md` — stakeholder walkthrough script

---

## 2. Product identity

**Testlane** is a QA test execution platform (local-dev prototype). Clinical-trials-style multi-module workspace (CTMS, eTMF, Viewer, etc.).

**Not production-ready.** No real authentication. Hybrid UI: **API-backed execution** + **mock prototype screens** with explicit labelling.

---

## 3. Branch and delivery

| Item | Value |
|------|-------|
| **Branch** | `demo/prototype-parity` (Shaun's demo branch — do not commit to `main` directly) |
| **Board** | Testlane v0.1 Execution Readiness |
| **Repo** | https://github.com/noel-q/testlane |

### REL issues

| ID | Title | Status |
|----|-------|--------|
| REL-001 | Manual UX audit of `/runs` | Open |
| REL-002 | Resolve duplicate result controls | Open |
| REL-003 | Loading, empty, error states | Open |
| REL-004 | RBAC/viewer mode UX | Open |
| REL-005 | README and collaborator setup | Closed |
| REL-006 | v0.1 readiness checklist | Open |
| REL-007 | Tag execution checkpoint | Open |

---

## 4. Architectural rules (agents must follow)

1. **Frontend-first is allowed; frontend-only without contracts is not.** Every screen must be documented in `frontend-contracts.md`.
2. **Do not remove API-backed execution.** APIs stay at `/runs/api` until Shaun's `/runs` UI is wired to them. **Do not replace `/runs` with the legacy three-pane layout.**
3. **Do not change backend services, schema, or migrations** unless explicitly required.
4. **Do not add new real APIs** for prototype screens without a ticket.
5. **Label mock and placeholder screens** in the UI (`PrototypeBanner`).
6. **Centralise mock data** in `apps/web/src/lib/relay/mock-data.ts` — avoid scattering arrays in components.
7. **Keep API routes thin** — business logic in `packages/db/services/`.
8. **Run `pnpm build`** after changes; run `pnpm api:validate` if APIs/services touched.
9. **Do not commit unless asked.**

---

## 5. Route map — what is real vs mock

| Route | Screen | Data state | Implementation |
|-------|--------|------------|----------------|
| `/` | Redirect → `/dashboard` | — | `app/page.tsx` |
| `/dashboard` | Dashboard | **Mock** | `fresh/screens/DashboardScreen.tsx` |
| `/cases` | Test Cases | **Mock** (+ localStorage) | `fresh/screens/CasesScreen.tsx` |
| `/test-cases` | Alias | — | Redirects to `/cases` |
| `/plans` | Test Plans | **Mock** | `fresh/screens/PlansScreen.tsx` |
| `/test-plans` | Alias | — | Redirects to `/plans` |
| `/runs` | Test Runs (demo) | **Mock** | `fresh/screens/RunsScreen.tsx` — Shaun v1.2 UI |
| `/runs/api` | Test Runs (API) | **API-backed** | `components/api-runs/ApiRunsWorkspace.tsx` |
| `/audit` | Audit History | **Mock** | `fresh/screens/AuditScreen.tsx` |
| `/defects` | Defects | **Mock** | `fresh/screens/DefectsScreen.tsx` |
| `/settings` | Settings | **Mock** | `fresh/screens/SettingsScreen.tsx` |
| `/reports` | Reports | **Placeholder** | `fresh/screens/PlaceholderScreen.tsx` |
| `/integrations` | Integrations | **Placeholder** | `fresh/screens/PlaceholderScreen.tsx` |

### API routes (backend — unchanged)

| Method | Path | Used by UI |
|--------|------|------------|
| GET | `/api/health` | Validation only |
| GET | `/api/runs` | `/runs/api` |
| POST | `/api/runs` | `/runs/api` |
| GET | `/api/runs/:runId` | `/runs/api` |
| POST | `/api/runs/:runId/cases/:runCaseId/result` | `/runs/api` |

---

## 6. Repository structure (active paths)

```
apps/web/src/
├── app/(app)/           # Routes — dashboard, cases, plans, runs, audit, defects, settings, reports, integrations
├── fresh/               # Mock prototype UI (shell, screens, seed, styles)
├── components/api-runs/ # API-backed execution workspace (promoted from legacy)
├── lib/relay/           # api-client, config, types, mock-data, prototype-contracts
└── legacy/              # Quarantined prior code — excluded from tsconfig; do not import

packages/db/             # Schema, migrations, seed, services (unchanged)
docs/implementation/     # frontend-contracts.md, api-contracts.md, current-state.md
```

### Key files added/updated for contract-aware prototype

| File | Role |
|------|------|
| `components/api-runs/ApiRunsWorkspace.tsx` | API-backed `/runs` inside FreshShell |
| `fresh/components/PrototypeBanner.tsx` | Mock/API/placeholder labelling |
| `lib/relay/mock-data.ts` | Centralised mock data |
| `lib/relay/prototype-contracts.ts` | Route metadata for agents |
| `fresh/screens/DefectsScreen.tsx` | Mock defects module |
| `fresh/screens/SettingsScreen.tsx` | Mock settings |
| `fresh/screens/PlaceholderScreen.tsx` | Reports / integrations |
| `docs/implementation/frontend-contracts.md` | Per-screen contracts |

---

## 7. `/runs` — demo vs API split

**`/runs` (primary demo):** Shaun's FRESH v1.2 `RunsScreen` — in-memory, full UX (donuts, run picker, shortcuts, step results). No Docker required.

**`/runs/api` (integration):** Legacy three-pane `ApiRunsWorkspace` — MySQL-backed, used for `pnpm api:validate`. Requires Docker + seed.

**Next slice:** Wire Shaun's `/runs` UI to `/api/runs` without changing the layout. Do not regress to swapping routes.

---

## 8. Mock prototype screens

All show a yellow **Frontend prototype** banner.

| Screen | Persistence | Notes |
|--------|-------------|-------|
| Dashboard | None (seed) | Export button visual only |
| Cases | localStorage for new cases | Import/edit/clone placeholder |
| Plans | None (seed) | Spawn run → navigates to `/runs`, no API call |
| Audit | None (seed) | Filters work client-side |
| Defects | None (mock-data.ts) | New defect disabled |
| Settings | None (mock-data.ts) | All fields read-only |

---

## 9. Placeholder screens

Grey **Planned module** banner. Routes work; no broken nav links.

- `/reports`
- `/integrations`

---

## 10. Local commands

```bash
pnpm install
pnpm dev                    # UI demo — open http://localhost:3000

# For API-backed /runs:
pnpm docker:up
pnpm db:migrate
pnpm db:seed

pnpm build
pnpm api:validate           # needs dev server + seeded DB
```

---

## 11. What not to assume

- Mock screens are **not** backed by MySQL
- Placeholder screens are **not** partially implemented
- No real login, SSO, OpenSearch in app, defects API, audit read API
- `README.md` and `relay-build-context.md` may be stale vs this branch
- Do not import from `src/legacy/` (tsconfig excluded)

---

## 12. Suggested next work

1. REL-001–004 against **API-backed** `/runs`
2. REL-002 duplicate result controls in `CaseDetailPanel`
3. REL-003 loading/empty/error states on `/runs`
4. Wire dashboard metrics to run list API (optional, ticketed)
5. Audit read API + replace mock `/audit`
6. REL-006 checklist, REL-007 checkpoint tag

---

## 13. Agent prompt (copy-paste)

```
You are working on Testlane (branch demo/prototype-parity). Read docs/collaboration/relay-agent-context.md and docs/implementation/frontend-contracts.md first.

Rules: `/runs` = Shaun demo UI; `/runs/api` = API workspace; pull latest branch before editing; mock screens labelled; run pnpm build (+ api:validate if APIs touched); do not commit unless asked.
```
