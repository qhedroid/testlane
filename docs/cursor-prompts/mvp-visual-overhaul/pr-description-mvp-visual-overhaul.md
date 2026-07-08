# PR: `mvp-visual-overhaul` → `mvp-main`

## Summary

Applies the approved **Compass (TransPerfect)** visual system across the entire Relay web app as a pure re-skin — colours, typography, spacing, radii, and component chrome retargeted via CSS tokens and shared classes, with **zero behaviour, route, schema, or data changes**. Entry point: every screen under `/:projectKey/*` and the global `/admin/*` area. The protected three-pane Test Runs execution workspace and `/runs/api` retain identical structure, keyboard flow, and result-recording behaviour.

---

## What's included

### Foundation & shell (task-01)

**Visual overhaul: Apply Compass token foundation and app shell** ([`b2961d7`](https://github.com/qhedroid/Relay/commit/b2961d7))
- Compass `:root` tokens in `fresh.css` (navy sidebar, GlobalLink blue accent, gray ramp, status colours)
- Shared primitives: `.btn`, `.panel`, `.tbl`, `.pill`, `.chip`, `.prog`, result buttons
- Open Sans body font; Gotham SSm `@font-face` declared (files pending — Open Sans fallback)
- Sidebar reskin: 216px dark blue, white-chip active state, 68px collapsed rail
- Top bar reskin: 56px, project switcher, ⌘K search, module switcher chrome
- `docs/product/design-system.md` rewritten with Compass token set

### Dashboard & remaining screens (task-02)

**Visual overhaul: Reskin dashboard and remaining screens** ([`e379b13`](https://github.com/qhedroid/Relay/commit/e379b13))
- Dashboard metric cards, donut status colours, active run card hover, needs-attention stripes
- `RunDonut` / `RunStatusInfographic` Compass colour constants
- Defects, Audit, per-project Settings, modals, placeholders — Compass shadow/radius/form chrome
- Source banners → Compass warning/accent/gray tints

### Test Cases & Test Plans (tasks 03 + 05)

**Visual overhaul: Reskin test cases and test plans** ([`02843c4`](https://github.com/qhedroid/Relay/commit/02843c4))
- Test Cases: toolbar search chrome, bulk bar accent tint, folder tree active rows, detail panel display type, step chips, quick-create inputs
- Test Plans: list pane white surface + accent-lt selection, detail header/tabs, overview cards, query-group builder, run history tables, `RunResultBar` status tokens

### Test Runs — protected UX (task-04)

**Visual overhaul: Reskin test runs execution workspace** (pending commit)
- `prototype-runs.css`: token-aligned result buttons (blocked active = dark text on amber), Compass keycaps, pane/step card radii, popover shadows
- Scoped `.runs-v12` polish for case selection, filter tabs, execution detail chrome
- **No changes** to `RunsScreen.tsx`, `TestRunsTopbar.tsx`, keyboard bindings, auto-advance, or `/runs/api`

### Admin / Project Settings (task-06)

**Visual overhaul: Reskin admin panel** (pending commit)
- `admin.css`: sidebar white-chip active (matches main shell), Compass form chrome (34px inputs, focus rings), table/badge/card/modal tokens
- Toggles checked → `--pass`; selected table rows → `--accent-lt`
- Admin remains a separate global area (not merged into project sidebar)
- Lucide icons retained; no CRUD/RBAC changes

---

## ⚠️ Caveats

- **Gotham SSm font files** are not yet in `public/fonts/gotham-ssm/` — `@font-face` rules are declared but browsers 404 the woff2 files and fall back to Open Sans. Drop licensed files to activate display font.
- **Blocked status colour** deliberately changed to Compass amber (`#E4AF03`, text `#8C6A00`) — approved mockup alignment.
- **Skipped status colour** deliberately kept as the app's existing purple (`#4527A0`) — not changed to gray.
- **Icon libraries unchanged** — Tabler (`ti`) in fresh app, Lucide in admin. Material Icons Round glyph parity is out of scope.
- Mockup-only screens (My Work, Milestones, standalone Requirements, AI Studio) not built — not in scope.
- No dark mode — light mode pinned.

---

## Testing

- **Build:** `pnpm build` — PASS (28 routes, no type/lint errors)
- **localStorage:** key `relay-demo-v2`, schema **v14** unchanged, no migrations
- **Manual smoke checks:**
  - `/DP/dashboard`, `/DP/testcases`, `/DP/testruns`, `/DP/plans`, `/DP/defects`, `/DP/settings`, `/DP/audit` — all HTTP 200
  - `/runs/api` — HTTP 200, workspace untouched
  - `/admin/profile`, `/admin/account`, `/admin/organization`, `/admin/projects`, `/admin/users`, `/admin/roles`, `/admin/audit-log`, `/admin/api-keys`, `/admin/integrations`, `/admin/custom-fields`, `/admin/automation` — all HTTP 200
  - Test Runs protected UX (Playwright): Pass/Fail/Blocked/Skip buttons, auto-advance, P/F/B/S + arrow keys, detail open/close, status filter — all PASS
  - Screenshots: `/tmp/relay-qa-mvp-visual-overhaul/testruns.png`, `admin-users.png`, `testcases.png`, `plans.png`
  - Full QA report: `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md`
