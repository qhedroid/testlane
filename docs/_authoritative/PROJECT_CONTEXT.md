# Relay — Project context

*Last updated: June 2026. Branch `demo/contract-aware-prototype`.*

**Authoritative entry point** for Cursor, ChatGPT, and collaborators. Read before planning or coding.

If this file conflicts with the repository, **the repo wins** — update this file after verifying.

Companion docs (all in `docs/_authoritative/`):
- [`MVP_FRONTEND_ONLY_SCOPE.md`](MVP_FRONTEND_ONLY_SCOPE.md) — what we build in the frontend-only phase
- [`AS_BUILT_SNAPSHOT.md`](AS_BUILT_SNAPSHOT.md) — concise as-built record
- [`FRONTEND_CONTRACTS.md`](FRONTEND_CONTRACTS.md) — per-screen contracts
- [`DOMAIN_MODEL.md`](DOMAIN_MODEL.md) — entities, IDs, invariants
- [`DEMO.md`](../../DEMO.md) — stakeholder walkthrough

Backend-phase reference (do not treat as current UI scope): [`docs/implementation/api-contracts.md`](../implementation/api-contracts.md), [`ARCHITECTURE_BASELINE.md`](ARCHITECTURE_BASELINE.md).

---

## 1. Product identity

**Relay** is a QA test execution platform (local-dev prototype). Clinical-trials-style multi-module workspace (CTMS, eTMF, Viewer, etc.).

**Not production-ready.** No real authentication. **Contract-aware hybrid UI:** mock prototype screens (primary demo) + isolated API workspace at `/runs/api`.

**Current phase:** Frontend-only — see [`MVP_FRONTEND_ONLY_SCOPE.md`](MVP_FRONTEND_ONLY_SCOPE.md).

---

## 2. Branch and delivery

| Item | Value |
|------|-------|
| **Branch** | `demo/contract-aware-prototype` |
| **Board** | Relay v0.1 Execution Readiness |
| **Repo** | https://github.com/qhedroid/Relay |

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

## 3. Architectural rules (agents must follow)

1. **Frontend-first is allowed; frontend-only without contracts is not.** Every screen must be documented in [`FRONTEND_CONTRACTS.md`](FRONTEND_CONTRACTS.md).
2. **Do not remove API-backed execution.** APIs stay at `/runs/api` until Shaun's `/runs` UI is wired to them. **Do not replace `/runs` with the legacy three-pane layout.**
3. **Do not change backend services, schema, or migrations** unless explicitly required (frontend-only phase).
4. **Do not add new real APIs** for prototype screens without a ticket.
5. **Label mock and placeholder screens** in the UI (`PrototypeBanner`).
6. **Centralise mock data** in `apps/web/src/lib/relay/mock-data.ts` — avoid scattering arrays in components.
7. **Keep API routes thin** — business logic in `packages/db/services/`.
8. **Run `pnpm build`** after changes; run `pnpm api:validate` if APIs/services touched.
9. **Do not commit unless asked.**

---

## 4. Route map — what is real vs mock

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

### API routes (backend — used by `/runs/api` only)

| Method | Path | Used by UI |
|--------|------|------------|
| GET | `/api/health` | Validation only |
| GET | `/api/runs` | `/runs/api` |
| POST | `/api/runs` | `/runs/api` |
| GET | `/api/runs/:runId` | `/runs/api` |
| POST | `/api/runs/:runId/cases/:runCaseId/result` | `/runs/api` |

---

## 5. Repository structure (active paths)

```
apps/web/src/
├── app/(app)/           # Routes — dashboard, cases, plans, runs, runs/api, …
├── fresh/               # Mock prototype UI (shell, screens, seed, styles)
├── components/api-runs/ # API-backed workspace at /runs/api
├── lib/relay/           # api-client, config, types, mock-data, prototype-contracts
└── legacy/              # Quarantined — excluded from tsconfig; do not import

packages/db/             # Schema, migrations, seed, services (backend-phase)
docs/_authoritative/     # Maintained docs (start here)
```

### Key files

| File | Role |
|------|------|
| `fresh/screens/RunsScreen.tsx` | Primary demo execution UI at `/runs` |
| `components/api-runs/ApiRunsWorkspace.tsx` | MySQL workspace at `/runs/api` |
| `fresh/components/PrototypeBanner.tsx` | Mock/API/placeholder labelling |
| `lib/relay/mock-data.ts` | Centralised mock data |
| `lib/relay/prototype-contracts.ts` | Route metadata for agents |
| `fresh/data/FreshProvider.tsx` | localStorage state (`relay-demo-v2`) |

---

## 6. `/runs` — demo vs API split

**`/runs` (primary demo):** Shaun's FRESH v1.2 `RunsScreen` — in-memory + localStorage, full UX (donuts, run picker, step results, defect linking, shortcuts). No Docker required.

**`/runs/api` (integration):** Legacy three-pane `ApiRunsWorkspace` — MySQL-backed, used for `pnpm api:validate`. Requires Docker + seed. Not in sidebar; cross-linked via banners.

**Next slice (post frontend-only phase):** Wire Shaun's `/runs` UI to `/api/runs` without changing the layout.

---

## 7. Mock prototype screens

All show a yellow **Frontend prototype** banner.

| Screen | Persistence | Notes |
|--------|-------------|-------|
| Dashboard | None (seed) | Export button visual only |
| Cases | localStorage | Import/clone partial |
| Plans | None (seed) | Spawn run → `/runs`, no API call |
| Runs (demo) | localStorage | New run button visual only |
| Audit | None (seed) | Filters client-side |
| Defects | mock-data.ts | New defect disabled |
| Settings | mock-data.ts | Read-only |

---

## 8. Placeholder screens

Grey **Planned module** banner: `/reports`, `/integrations`.

---

## 9. Local commands

```bash
pnpm install
pnpm dev                    # UI demo — http://localhost:3000

# For /runs/api only:
pnpm docker:up && pnpm db:migrate && pnpm db:seed

pnpm build
pnpm api:validate           # needs dev server + seeded DB
```

---

## 10. What not to assume

- Mock screens are **not** backed by MySQL
- Placeholder screens are **not** partially implemented
- No real login, SSO, OpenSearch in app, defects API, audit read API
- [`docs/collaboration/relay-build-context.md`](../collaboration/relay-build-context.md) and [`docs/implementation/current-state.md`](../implementation/current-state.md) are **stale** — use [`AS_BUILT_SNAPSHOT.md`](AS_BUILT_SNAPSHOT.md)
- Do not import from `src/legacy/`

---

## 11. Suggested next work

1. REL-001–004 — clarify target surface: demo `/runs` vs `/runs/api` per issue
2. REL-002 duplicate result controls in `CaseDetailPanel` (`/runs/api`)
3. REL-003 loading/empty/error states
4. Frontend contract sync when routes or behaviour change
5. Wire demo `/runs` to API (ticketed backend slice)
6. REL-006 checklist, REL-007 checkpoint tag

---

## 12. Agent prompt (copy-paste)

```
You are working on Relay (branch demo/contract-aware-prototype). Read docs/_authoritative/PROJECT_CONTEXT.md and docs/_authoritative/MVP_FRONTEND_ONLY_SCOPE.md first.

Rules: `/runs` = Shaun demo UI (mock); `/runs/api` = API workspace; mock screens labelled; run pnpm build (+ api:validate if APIs touched); do not commit unless asked.
```
