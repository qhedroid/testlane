# Task 02 — Dashboard + remaining screens reskin

Branch: `mvp-visual-overhaul` · Schema: unchanged (v14) · Depends on: task-01 · This is task 2 of 6.

> **Run Part A and Part B below back-to-back in this one session.** Do not stop and ask for
> confirmation between them. Only stop if you hit a genuine blocker.

This batch pairs the Dashboard (the first screen to receive the reskin, already fully live-data
driven) with the long tail of smaller screens and shared overlays that all inherit the task-01
tokens with comparatively little screen-specific work each.

---

# Part A — Dashboard reskin

Reskin the Dashboard to match the mockup. **Layout stays** (metric-card grid + active-runs column +
needs-attention + coverage). This is presentational only — the dashboard already computes all its
data live from `FreshProvider` (per the `mvp-dashboard-metrics` work); do not touch that computation.

Reference: `mockup/Relay Compass Reskin Mockup.html` → Dashboard ("Hey Shaun" greeting, KPI tiles,
Completion donut + legend, Results-over-time, active runs, needs-attention).

Files touched:
- `apps/web/src/fresh/screens/DashboardScreen.tsx` (presentational className/markup only)
- `apps/web/src/fresh/components/RunDonut.tsx`, `RunStatusInfographic.tsx` (**donut colour constants**)
- `apps/web/src/fresh/styles/fresh.css` (`.dash-*`, `.mc*`, `.run-card`/`.rct`/`.rcd`, `.att-*`, `.cov-*`)

## A.1 — Changes

1. **Metric cards** (`.mc`, `.mc-ic`, `.mv`, `.ml`, `.mt`, and the `.met-row .mc` overrides
   ~lines 100–110 & 640): radius → `var(--r-l)`; value `.mv` uses `font-family:var(--display)` at
   ~26px; label `.ml` uppercase 11px `--text2`; the accent left-stripe (`.mc::before`) and icon tint
   (`.mc.c-blue .mc-ic` etc.) re-point to the Compass status/accent tokens (blue→`--accent`,
   green→`--pass`, red→`--fail`, amber→`--block`, grey→`--text3`). Icon chips: soft tinted background
   + token-coloured glyph, matching the mockup.
2. **Donut colours** — `RunDonut.tsx` and `RunStatusInfographic.tsx` define pass/fail/blocked/
   skipped/not-run colours as JS constants (hex or CSS var strings). Re-point them to the Compass
   values: passed `#108718`, failed `#C50007`, blocked `#E4AF03`, skipped `#4527A0` (unchanged — do
   not gray it), not-run `#BAC5CD` (gl-gray-300). Prefer referencing the CSS vars (`var(--pass)` …)
   if the component already passes colours through to SVG `stroke`/`fill`; otherwise use the hex.
   Do not change the donut geometry, props, or the hover-tooltip behaviour. These constants are
   shared with Test Runs (task-04) and Test Plans (task-05) — get them right here once.
3. **Active run cards** (`.run-card`, `.rct*`, `.rcd*`, ~lines 380–460): card radius → `var(--r-l)`;
   flat at rest, hover raises border + `box-shadow:0 4px 10px rgba(0,0,0,.12)` (Compass card shadow-s);
   the expanded-detail tabs (`.rcd-tab.on`) use `--accent`; count dots (`.rct-dot`) read the status
   tokens. Keep the expand/collapse behaviour.
4. **Needs-attention** (`.att-*`, ~lines 430–460): the severity stripes (`.att-item-stripe.crit/.high/.med`)
   re-point to `--fail`/`--block`/`--accent`; `no-defect-tag`/`defect-tag-sm` use `--fail`/`--fail-bg`.
   Row layout unchanged.
5. **Coverage panel** (`.cov-*`, ~lines 108–115): `.cov-fill` uses `--accent`; bar track
   `var(--surface2)`; radius `var(--r-pill)`.
6. **Greeting / page head** (`DashboardScreen.tsx`): if the mockup's "Hey {name}" greeting + subline
   already exist in the app, restyle to the display font; if they don't exist, **do not add them**
   (that's content — out of scope). Keep the existing header actions ("Export", "New Run") — restyle
   "New Run" as `.btn-p`, "Export" as `.btn-neutral`.

## Verification (Part A)
- `pnpm build`; load `/DP/dashboard`. Metric tiles, donuts, active-run cards, needs-attention, and
  coverage all match the mockup's palette/type; donuts show the new status colours.
- Behaviour unchanged: card expand/collapse, donut tooltips, "all runs"/"new run" links, needs-
  attention row clicks all work.
- Screenshots to `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md`.

## Out of scope (Part A)
- Dashboard data computation/selectors; adding greeting/widgets that don't exist; donut geometry;
  any behaviour.

Continue straight into Part B.

---

# Part B — Remaining screens: Defects, Audit, Settings, modals, placeholders

Final polish pass over the long-tail screens and shared overlays. All of these already inherit the
task-01 tokens; this part closes gaps and matches the mockup. Presentational only.

Reference: `mockup/Relay Compass Reskin Mockup.html` → Defects, Audit History, Reports, and the
modals/overlays.

Files touched:
- `apps/web/src/fresh/screens/DefectsScreen.tsx` + `.defects-*` in `fresh.css`
- `apps/web/src/fresh/screens/AuditScreen.tsx` + `.audit-*` in `fresh.css`
- `apps/web/src/fresh/screens/SettingsScreen.tsx` + `.settings-*` in `fresh.css` (per-project settings)
- `apps/web/src/fresh/screens/PlaceholderScreen.tsx` + `.placeholder-*` (used by Reports/Integrations)
- `apps/web/src/fresh/components/*Modal.tsx` + `.modal-backdrop`/`.create-dialog`/`.search-dialog`/
  `.shortcuts-dialog` + `.source-banner*` in `fresh.css`

## B.1 — Changes

1. **Defects** (`.defects-*`, ~fresh.css 560+): filters use `.chip`; the defects table adopts the
   shared table look; severity cells read status tokens (critical→`--fail`, high→`--block-text`,
   etc.); the detail panel uses Compass panel chrome; the `.mono` id column `--accent`.
2. **Audit** (`.audit-*`, ~fresh.css 468+): the event rows' icon chips (`.audit-ic.result/.create/
   .edit/.seal/.assign/.delete/.link`) re-point their tinted backgrounds + glyph colours to the
   Compass tokens (result→amber, create→green, edit→accent, seal→gray, delete→red, link→amber);
   ref links `--accent` `--mono`; timestamps `--text3`.
3. **Per-project Settings** (`.settings-*`, ~fresh.css 620+): reskin to Compass cards/tables/inputs
   for consistency. (Note: the mockup routes "Project settings" to the admin area; this per-project
   screen still exists in the app, so keep it working and just make it visually consistent — low
   effort, no behaviour change.)
4. **Placeholder** (`.placeholder-*`): icon `--text3`, title display font, the API-list box
   `--surface2` — used by Reports and Integrations routes until they're built. Keep as-is
   functionally.
5. **Modals & overlays** — restyle to the mockup's modal look: `.modal-backdrop` uses
   `rgba(11,24,33,0.55)` (no heavy blur); dialogs (`.create-dialog`, `.search-dialog`,
   `.shortcuts-dialog`) radius `var(--r-l)`, Compass modal shadow (`0 4px 20px rgba(0,0,0,.20)`),
   header/body/footer spacing per the mockup; form fields to Compass chrome; footer buttons via
   `.btn-p`/`.btn-neutral`. Search modal (`SearchModal.tsx`) result rows use `--accent-lt` on
   hover/focus. **Keep all modal behaviour** (open/close, submit, keyboard nav) — restyle only.
6. **Source banners** (`.source-banner-mock/.api/.placeholder`): re-point to Compass tints
   (mock→warning, api→accent, placeholder→gray).

## Verification (Part B)
- `/DP/defects`, `/DP/audit`, `/DP/settings`, `/DP/reports` (+ any integrations route) render and
  match the mockup. Open the create-case / create-run / create-project / search (⌘K) / shortcuts
  modals — each is restyled and still opens, submits, and closes correctly.
- Screenshots appended to `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md`.
- No need for a full cross-branch regression sweep here — that happens once, at the end of task-06
  (Admin), after every screen has been reskinned.

## Out of scope (Part B)
- Building Reports/Integrations/My Work/Milestones/Requirements/AI Studio (mockup-only or unbuilt —
  future branches); any behaviour/data/route/schema change; icon swap.

---

## Documentation
- `docs/claude/handoff.md` — mark task-02 (Dashboard + remaining screens) done under
  `mvp-visual-overhaul`.
