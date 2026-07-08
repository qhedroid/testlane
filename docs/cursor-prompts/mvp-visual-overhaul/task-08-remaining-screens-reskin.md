# Task 08 — Remaining screens: Defects, Audit, Settings, modals, placeholders

Branch: `mvp-visual-overhaul` · Schema: unchanged (v14) · Depends on: task-01, task-02

Final polish pass over the long-tail screens and shared overlays. All of these already inherit the
task-01 tokens; this task closes gaps and matches the mockup. Presentational only.

Reference: `mockup/Relay Compass Reskin Mockup.html` → Defects, Audit History, Reports, and the
modals/overlays.

Files touched:
- `apps/web/src/fresh/screens/DefectsScreen.tsx` + `.defects-*` in `fresh.css`
- `apps/web/src/fresh/screens/AuditScreen.tsx` + `.audit-*` in `fresh.css`
- `apps/web/src/fresh/screens/SettingsScreen.tsx` + `.settings-*` in `fresh.css` (per-project settings)
- `apps/web/src/fresh/screens/PlaceholderScreen.tsx` + `.placeholder-*` (used by Reports/Integrations)
- `apps/web/src/fresh/components/*Modal.tsx` + `.modal-backdrop`/`.create-dialog`/`.search-dialog`/
  `.shortcuts-dialog` + `.source-banner*` in `fresh.css`

## Changes
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

## Verification
- `/DP/defects`, `/DP/audit`, `/DP/settings`, `/DP/reports` (+ any integrations route) render and
  match the mockup. Open the create-case / create-run / create-project / search (⌘K) / shortcuts
  modals — each is restyled and still opens, submits, and closes correctly.
- Full core-regression sweep one final time (all routes from task-01) with no console errors and no
  behavioural diff.
- Final screenshots + a "visual overhaul complete" summary in the QA report; note the two approved
  semantic colour change (blocked→amber; skipped kept as the app's existing purple) once more for the reviewer.

## Documentation
- `docs/claude/handoff.md` — mark the `mvp-visual-overhaul` branch complete (tasks 01–08); schema
  stays v14.
- Draft the PR description (`docs/cursor-prompts/mvp-visual-overhaul/pr-description-mvp-visual-overhaul.md`)
  per the repo's MR format: Summary → What's included (per task, linked SHAs) → ⚠️ Caveats (Gotham
  SSm font status; blocked→amber colour change; skipped kept purple) → Testing.

## Out of scope
- Building Reports/Integrations/My Work/Milestones/Requirements/AI Studio (mockup-only or unbuilt —
  future branches); any behaviour/data/route/schema change; icon swap.
