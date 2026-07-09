# PR: `mvp-visual-overhaul` → `mvp-main`

## Summary

Applies the approved **Compass (TransPerfect)** visual system across the entire Relay web app in two phases: Phase 1 retargets CSS tokens and shared classes for a pure re-skin; Phase 2 adopts the mockup's information architecture — new demo screens, sidebar/topbar restructuring, and full per-screen layout rebuilds for Dashboard, Test Cases, Test Plans, Test Runs, Defects, and Audit History. Entry point: every screen under `/:projectKey/*` and the global `/admin/*` area. The protected three-pane Test Runs execution workspace and `/runs/api` retain identical keyboard flow and result-recording behaviour. Schema stays v14 throughout.

---

## What's included

### Foundation & shell (Phase 1 — tasks 01–02)

**Visual overhaul: Apply Compass token foundation and app shell** ([`b2961d7`](https://github.com/qhedroid/Relay/commit/b2961d7))
- Compass `:root` tokens in `fresh.css` (navy sidebar, GlobalLink blue accent, gray ramp, status colours)
- Shared primitives: `.btn`, `.panel`, `.tbl`, `.pill`, `.chip`, `.prog`, result buttons
- Gotham SSm display font wired; Open Sans body
- Sidebar reskin: 216px dark blue, white-chip active state, 68px collapsed rail
- Top bar reskin: 56px, project switcher, ⌘K search, module switcher chrome
- `docs/product/design-system.md` rewritten with Compass token set

**Visual overhaul: Reskin dashboard and remaining screens** ([`e379b13`](https://github.com/qhedroid/Relay/commit/e379b13))
- Dashboard metric cards, donut status colours, active run card hover, needs-attention stripes
- `RunDonut` / `RunStatusInfographic` Compass colour constants
- Defects, Audit, per-project Settings, modals, placeholders — Compass shadow/radius/form chrome

### Test Cases, Test Plans, Test Runs, Admin (Phase 1 — tasks 03–06)

**Visual overhaul: Reskin test cases and test plans** ([`02843c4`](https://github.com/qhedroid/Relay/commit/02843c4))
- Test Cases: toolbar search chrome, bulk bar accent tint, folder tree active rows, detail panel display type, step chips
- Test Plans: list pane white surface + accent-lt selection, detail header/tabs, overview cards, query-group builder, run history tables

**Visual overhaul: Reskin test runs and admin panel** ([`a9119bc`](https://github.com/qhedroid/Relay/commit/a9119bc))
- `prototype-runs.css`: token-aligned result buttons, Compass keycaps, pane/step card radii, popover shadows
- `admin.css`: sidebar white-chip active, Compass form chrome, table/badge/card/modal tokens
- Protected UX: no changes to keyboard bindings, auto-advance, or `/runs/api`

### Shell IA & new screens (Phase 2 — tasks 07–08)

**Visual overhaul: Restructure shell nav and global topbar** ([`5e669eb`](https://github.com/qhedroid/Relay/commit/5e669eb))
- Sidebar mockup nav order/grouping (Dashboard, My Work, Testing, Traceability); Title Case labels; Tabler icons for new items
- Removed Pinned Modules + Integrations; single "Project Settings" → `/admin` (sidebar swap preserved)
- Global topbar cluster: New test case, New test run, AI Studio, Notifications, Help
- Route stubs for six new screens; `/[projectKey]/settings` redirects to `/admin`

**Visual overhaul: Build six new demo screens** ([`eb6d956`](https://github.com/qhedroid/Relay/commit/eb6d956))
- Login (`/:key/login`), My Work, Milestones, Requirements, Reports, AI Studio — static/demo shells with mock content
- Requirements uses live `activeRequirements` when populated, else static `REQ-*` demo list
- Shared screen CSS: `.page-head`, `.kpi-strip`, `.screen-row`, login full-bleed layout

### Per-screen layout rebuilds (Phase 2 — tasks 09–13)

**Visual overhaul: Rebuild dashboard from mockup layout** ([`cfed6e7`](https://github.com/qhedroid/Relay/commit/cfed6e7))
- KPI strip, completion donut + legend, results-over-time chart, assignee bars, open runs, milestones slice, needs-attention panel
- All metrics wired to live `FreshProvider` selectors — never mockup hardcoded numbers
- Page header discarded per Shaun's ask

**Visual overhaul: Rebuild test cases hybrid layout** ([`e77ee61`](https://github.com/qhedroid/Relay/commit/e77ee61))
- Folder tree + case list + detail panel restyled to mockup; toolbar actions moved from `FreshTopbar` to case-list pane
- All CRUD, drag, filter, keyboard behaviour unchanged

**Visual overhaul: Rebuild test plans layout** ([`cd5af30`](https://github.com/qhedroid/Relay/commit/cd5af30))
- Plan list/detail panes, tabs, overview cards, query builder, run history — mockup layout with live `resolvePlanCases()` data

**Visual overhaul: Rebuild test runs layout** ([`a78cee0`](https://github.com/qhedroid/Relay/commit/a78cee0))
- Queue pane + exec detail pane mockup structure; result footer with icon buttons + keyboard legend
- Protected UX verified unchanged (P/F/B/S, auto-advance, arrow keys — Shaun manual sign-off 2026-07-09)

**Visual overhaul: Rebuild defects, audit, and admin polish** ([`ffb0411`](https://github.com/qhedroid/Relay/commit/ffb0411))
- Defects: mockup `.gl-table` toolbar (All defects + count + status chips + Details toggle), `.tbl` table, detail panel; live `activeDefects` preserved
- Audit History: mockup event-row styling (circular icon chips, timestamps, ref links); page header kept; filter tabs unchanged
- Admin/Project Settings: section card treatment, 240px/1fr form rows, table/card refinements in `admin.css`

### Living docs sync (task-14)

**Docs: sync living docs to Phase 2, close out mvp-visual-overhaul planning** ([`658225b`](https://github.com/qhedroid/Relay/commit/658225b))
- `user-guide.md` / `feature-flow.md` brought current with every Phase 2 UI change: new Navigation section (sidebar groups, global top bar), rebuilt Dashboard description, Test Cases toolbar relocation, Test Runs page-head actions, Defects/Audit task-13 layout, Settings redirect
- Docs-only — no `apps/**` changes

---

## ⚠️ Caveats

- **`/[projectKey]/settings` → `/admin` redirect** (task-07): per-project `SettingsScreen` orphaned from sidebar; route redirects cleanly, component left in repo
- **Page headers discarded** on Dashboard, Test Cases, Test Plans, Test Runs, Defects — Audit History is the exception (header kept per Shaun's ask). Defects page-head removal is a task-13 judgement call; easy to reverse
- **Requirements data source** (task-08): uses live `activeRequirements` when demo data exists, otherwise falls back to static `REQ-*` rows
- **Reduced-fidelity dashboard panels**: milestones slice uses static placeholder content linking to `/milestones`; some mockup KPI sublines simplified
- **Dropped from Dashboard** (task-09): the pre-Phase-2 "Critical" filter chip and expandable run-card pattern (Overview/Assignees/Defects tabs per card) are gone, replaced by the mockup's flatter "Open test runs" list. Confirmed intentional with Shaun 2026-07-09; not a regression to fix
- **Blocked status colour** deliberately changed to Compass amber (`#E4AF03`, text `#8C6A00`) — approved mockup alignment
- **Skipped status colour** deliberately kept as the app's existing purple (`#4527A0`) — not changed to gray
- **Icon libraries unchanged** — Tabler (`ti`) in fresh app, Lucide in admin. Material Icons Round glyph parity is out of scope
- New screens (Login, My Work, Milestones, Requirements, Reports, AI Studio) are static/demo shells — no backend wiring
- No dark mode — light mode pinned

---

## Testing

- **Build:** `pnpm build` — PASS (28 routes, no type/lint errors)
- **localStorage:** key `relay-demo-v2`, schema **v14** unchanged, no migrations
- **Manual smoke checks:**
  - Phase 2 routes: `/DP/dashboard`, `/DP/testcases`, `/DP/testruns`, `/DP/plans`, `/DP/defects`, `/DP/audit`, `/DP/login`, `/DP/mywork`, `/DP/milestones`, `/DP/requirements`, `/DP/reports`, `/DP/aistudio` — all HTTP 200 (production build)
  - Admin: `/admin/users`, `/admin/roles`, `/admin/audit-log`, `/admin/profile`, `/admin/account`, `/admin/organization`, `/admin/projects`, `/admin/api-keys`, `/admin/integrations`, `/admin/custom-fields`, `/admin/automation` — all HTTP 200
  - `/runs/api` — HTTP 200, workspace untouched
  - Test Runs protected UX: manually verified by Shaun after task-12 (P/F/B/S, auto-advance, arrow keys); task-13 does not touch execution code
  - Full QA report: `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md`
