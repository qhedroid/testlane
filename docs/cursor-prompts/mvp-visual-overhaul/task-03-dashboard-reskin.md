# Task 03 — Dashboard reskin

Branch: `mvp-visual-overhaul` · Schema: unchanged (v14) · Depends on: task-01, task-02

Reskin the Dashboard to match the mockup. **Layout stays** (metric-card grid + active-runs column +
needs-attention + coverage). This is presentational only — the dashboard already computes all its
data live from `FreshProvider` (per the `mvp-dashboard-metrics` work); do not touch that computation.

Reference: `mockup/Relay Compass Reskin Mockup.html` → Dashboard ("Hey Shaun" greeting, KPI tiles,
Completion donut + legend, Results-over-time, active runs, needs-attention).

Files touched:
- `apps/web/src/fresh/screens/DashboardScreen.tsx` (presentational className/markup only)
- `apps/web/src/fresh/components/RunDonut.tsx`, `RunStatusInfographic.tsx` (**donut colour constants**)
- `apps/web/src/fresh/styles/fresh.css` (`.dash-*`, `.mc*`, `.run-card`/`.rct`/`.rcd`, `.att-*`, `.cov-*`)

## Changes

1. **Metric cards** (`.mc`, `.mc-ic`, `.mv`, `.ml`, `.mt`, and the `.met-row .mc` overrides
   ~lines 100–110 & 640): radius → `var(--r-l)`; value `.mv` uses `font-family:var(--display)` at
   ~26px; label `.ml` uppercase 11px `--text2`; the accent left-stripe (`.mc::before`) and icon tint
   (`.mc.c-blue .mc-ic` etc.) re-point to the Compass status/accent tokens (blue→`--accent`,
   green→`--pass`, red→`--fail`, amber→`--block`, grey→`--text3`). Icon chips: soft tinted background
   + token-coloured glyph, matching the mockup.
2. **Donut colours** — `RunDonut.tsx` and `RunStatusInfographic.tsx` define pass/fail/blocked/
   skipped/not-run colours as JS constants (hex or CSS var strings). Re-point them to the Compass
   values: passed `#108718`, failed `#C50007`, blocked `#E4AF03`, skipped `#4527A0` (unchanged — do not gray it), not-run
   `#BAC5CD` (gl-gray-300). Prefer referencing the CSS vars (`var(--pass)` …) if the component already
   passes colours through to SVG `stroke`/`fill`; otherwise use the hex. Do not change the donut
   geometry, props, or the hover-tooltip behaviour.
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

## Verification
- `pnpm build`; load `/DP/dashboard`. Metric tiles, donuts, active-run cards, needs-attention, and
  coverage all match the mockup's palette/type; donuts show the new status colours.
- Behaviour unchanged: card expand/collapse, donut tooltips, "all runs"/"new run" links, needs-
  attention row clicks all work.
- Screenshots to the QA report.

## Out of scope
- Dashboard data computation/selectors; adding greeting/widgets that don't exist; donut geometry;
  any behaviour. Reports/other screens (their own tasks).
