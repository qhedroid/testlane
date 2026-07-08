# Task 04 — Test Runs reskin (PROTECTED execution UX — visual only)

Branch: `mvp-visual-overhaul` · Schema: unchanged (v14) · Depends on: task-01 (foundation + shell) ·
This is task 4 of 6.

> Run this task straight through to Verification without stopping to ask for confirmation partway.
> Only stop if you hit a genuine blocker.

⚠️ **This screen is explicitly protected.** The three-pane execution workspace, the keyboard flow,
the result-recording behaviour, and `/runs/api` must not change. This task is **colour/type/spacing
only.** If a change alters structure, pane behaviour, shortcuts, or execution logic, it is out of
scope — stop.

Reference: `mockup/Relay Compass Reskin Mockup.html` → Test Runs.

Files touched:
- `apps/web/src/fresh/styles/prototype-runs.css` (the live workspace styles, scoped to `.runs-v12`)
- `apps/web/src/fresh/screens/RunsScreen.tsx` (presentational className/style only — be surgical)
- `apps/web/src/fresh/components/TestRunsTopbar.tsx` (presentational only)
- `apps/web/src/fresh/components/RunStatusInfographic.tsx` / `RunDonut.tsx` (donut colours — if not
  already done in task-02; make sure both screens share the corrected constants)

## Background
The live Test Runs screen renders inside `.runs-v12` and is styled by `prototype-runs.css`
(942 lines) which largely re-declares the three-pane layout using the same `--*` tokens — so most of
it **inherits task-01 automatically.** Your job is targeted polish + any hardcoded colours that
bypass the tokens, without touching the protected structure/flow.

## Changes
1. **Grep `prototype-runs.css` for hardcoded status/greys** and re-point to tokens: pass `#2E7D32`,
   fail `#C62828`, blocked `#E65100`, skip `#4527A0` (+ their `-bg`) → `--pass/--fail/--block/--skip`
   (+ `-bg`); ad-hoc borders/greys → `--border`/`--surface2`/`--text*`. Radii → the `--r-*` scale.
2. **Summary donut + status list** — the always-visible status rows and donut read their colours
   from `RunStatusInfographic.tsx`/`RunDonut.tsx`; ensure those constants are the Compass values
   (see task-02 Part A, change 2). Blocked = amber `#E4AF03`, skipped = purple `#4527A0` (unchanged),
   not-run `#BAC5CD`. Do not change which statuses render or their click-to-filter behaviour.
3. **Execution result buttons** (`.srb-*`, `.rmb-*`) — task-01 moved them onto tokens; verify in the
   `.runs-v12` context they look like the mockup's big Pass/Fail/Blocked/Skip buttons (token bg,
   token border, solid token fill on active). Blocked button: `--block` fill with dark text so the
   amber is legible. **Do not change** the click/auto-advance behaviour or keyboard bindings.
4. **Panes** (`.runs-v12 .ec-pane`, `.ec-run-hd`, `.ec-case`, `.ec-ftab-bar .ftab`, exec detail
   `.ed-*`): white surfaces, `1px --border` separators, active case `--accent-lt` with the
   left-accent kept (this is a list-selection affordance, not the sidebar). Filter tabs (`.ftab.on`)
   → `--accent`. Step cards (`.esc*`) radii/borders per Compass.
5. **Run picker / toolbar** (`.run-exec-toolbar`, `.run-picker*`, `.run-summary-card`) and
   **`TestRunsTopbar.tsx`** (seal button, edit, report, new-run): restyle buttons via task-01 classes;
   seal button keeps its behaviour. Popover radii/shadows to Compass.
6. **Shortcut bar** (`.sc-bar`, `.kbd`): restyle the `.kbd` keycaps to the Compass keycap look; keep
   every shortcut.

## Verification
- `/DP/testruns`: workspace matches the mockup's palette/type; donut + status list show new colours;
  result buttons look right.
- **Protected-UX regression (critical):** record a Pass/Fail/Blocked/Skip and confirm auto-advance;
  use keyboard shortcuts (P/F/B/S, navigation); open/close the detail; resize panes; seal/reopen a
  run; click a status row to filter — **all identical to before.** `/runs/api` untouched.
- Screenshots + explicit "protected UX behaviour verified unchanged" note in
  `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md`.

## Out of scope
- ANY structural, keyboard, or execution-behaviour change; `/runs/api`; three-pane layout; data;
  icon swap.

## Documentation
- `docs/claude/handoff.md` — mark task-04 (Test Runs) done under `mvp-visual-overhaul`.
