# MVP — Frontend-only phase scope

*Branch: `demo/contract-aware-prototype` · June 2026*

This document defines what Relay is building **now**: a contract-labelled front-end prototype that demonstrates the full MVP user journey without requiring backend integration for the primary demo path.

**Full-stack target scope** remains in [`ARCHITECTURE_BASELINE.md`](ARCHITECTURE_BASELINE.md) (backend phase). **What exists today** is in [`AS_BUILT_SNAPSHOT.md`](AS_BUILT_SNAPSHOT.md).

---

## Phase goal

Deliver a **stakeholder-demoable UI** covering the flow:

`Project → Test Cases → Test Plan → Test Run → Execution → Defect link → Dashboard / Audit (read-only mock)`

- Primary path uses **mock data + localStorage** — no Docker required for demos.
- Backend integration is **preserved but isolated** at `/runs/api` for validation and a later wiring slice.
- Every screen is **contract-documented** and **banner-labelled** (mock / API / placeholder).

---

## In scope (frontend-only phase)

| Area | Deliverable | Persistence today |
|------|-------------|-------------------|
| **Shell & navigation** | Sidebar, topbar, module switcher, Cmd+K search, `PrototypeBanner` | Client state |
| **Dashboard** | Metrics, run cards, attention, coverage | FreshProvider (localStorage) |
| **Test cases** | Folder tree, CRUD, steps, filters, detail panel | localStorage (`relay-demo-v2`) |
| **Test plans** | List, detail tabs, spawn-run navigation | Static seed |
| **Test runs (demo)** | Shaun v1.2 execution UX at `/runs` — steps, results, defects, shortcuts | localStorage |
| **Test runs (API)** | Legacy three-pane workspace at `/runs/api` | MySQL (unchanged) |
| **Audit** | Filterable timeline | Static seed |
| **Defects** | List/detail (mock) | Static mock-data |
| **Settings** | Workspace/users preview (read-only) | Static mock-data |
| **Reports / Integrations** | Placeholder routes (nav continuity) | None |
| **Contracts** | `FRONTEND_CONTRACTS.md`, `prototype-contracts.ts`, this doc set | Repo |

---

## Explicitly out of scope (this phase)

Do **not** start these without a ticket and phase change:

- New HTTP APIs beyond existing `/api/runs/*` and `/api/health`
- Wiring demo `/runs` to MySQL (planned next backend slice)
- Real authentication, SSO, session UI
- OpenSearch indexing and global search API
- Requirements management
- Export (PDF/CSV/Excel)
- Report generation
- Defect create/sync with external tools
- Audit read API
- Schema or migration changes (unless explicitly ticketed)
- Replacing Shaun's `/runs` layout with the legacy three-pane UI

---

## Architectural rules (frontend phase)

1. **Frontend-first is allowed; frontend-only without contracts is not.** Update [`FRONTEND_CONTRACTS.md`](FRONTEND_CONTRACTS.md) when behaviour changes.
2. **Do not remove `/runs/api`.** Preserved for `pnpm api:validate` until demo `/runs` is wired.
3. **Do not replace `/runs` with the legacy layout.** Extend Shaun's screen toward API integration later.
4. **Label every screen** via `PrototypeBanner` + `prototype-contracts.ts`.
5. **Centralise mock data** in `apps/web/src/lib/relay/mock-data.ts` and `fresh/data/seed.ts`.
6. **Do not import** from `apps/web/src/legacy/` (tsconfig excluded).
7. **Run `pnpm build`** after UI changes; `pnpm api:validate` only if API/services touched.
8. **Do not commit** unless asked.

---

## Success criteria

- [ ] Full demo walkthrough in [`DEMO.md`](../../DEMO.md) works without Docker
- [ ] Every route has a contract row in `FRONTEND_CONTRACTS.md` and `prototype-contracts.ts`
- [ ] Mock vs API vs placeholder is obvious in the UI
- [ ] Domain model in [`DOMAIN_MODEL.md`](DOMAIN_MODEL.md) matches prototype types and target invariants
- [ ] REL-001–004 UX issues tracked against the appropriate surface (`/runs` demo vs `/runs/api`)

---

## Next slice (after frontend phase stabilises)

Wire demo `/runs` to existing `/api/runs` HTTP routes **without changing layout** — see [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) §7.
