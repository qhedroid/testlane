# Task 14 — Sync living docs to Phase 2 (docs-only, no app code)

Branch: `mvp-visual-overhaul` · Schema: unchanged (v14) · This is task 14 of 14 — a follow-up after
task-13, filed once the branch was otherwise complete.

> Run this task straight through to Verification without stopping to ask for confirmation partway.
> Only stop if you hit a genuine blocker. Report your token/usage % when done.

## Why this task exists

`docs/product/user-guide.md` and `docs/product/feature-flow.md` are **MANDATORY living docs** per
`CLAUDE.md` ("Update both when changing: user-visible behaviour, routes, demo data, localStorage
schema, RBAC behaviour, or module flow"). Task-08 updated both files when it added six new screens/
routes. Tasks 07 and 09–13 all made user-visible changes — sidebar/nav restructuring, the
`/[projectKey]/settings` → `/admin` redirect, and full layout rebuilds of Dashboard, Test Cases, Test
Plans, Test Runs, Defects, and Audit — but none of those task prompts included a Documentation step,
so both files are now stale relative to the real Phase 2 UI. This task is pure documentation cleanup:
**no app code changes.**

Files touched:
- `docs/product/user-guide.md`
- `docs/product/feature-flow.md`

Do not touch any file under `apps/**`.

## What to update

Load the app (`pnpm dev`) and walk each affected screen at `/DP/<module>` to confirm current
behaviour before writing — don't rely on the task list below alone, it's a starting point from
reviewing the git history, not a verified-current description.

### `user-guide.md`

1. **`## Settings` section (currently describes a settings *preview page* with a live user summary)
   — this is stale.** Since task-07, `/:key/settings` is a pure `redirect('/admin')`; the sidebar's
   old separate "Settings" and "Admin" links are now a single "Project Settings" entry that goes
   straight to `/admin` (same sidebar-swap behaviour `/admin` always had). Rewrite this section to
   describe the redirect and the single sidebar entry point, not a preview page.
2. **`## Dashboard` section** — rewrite to describe the actual Phase 2 layout: KPI strip (tile
   metrics), completion donut + legend, a results-over-time chart (7d/30d/90d), a results-by-assignee
   bars panel, an open-runs list (click-through to the run), a milestones slice (links to
   `/milestones`), and the needs-attention panel (unlinked failures) — all still computed from live
   `FreshProvider`/selector data, not the mockup's static numbers. Note the reduced-fidelity fallback:
   trend/delta panels show flat "as of today" lines until the user records results in-session (seed
   data has no historical `executionLog`).
3. **New global top bar cluster (added task-07, present on every screen)** — add a short section (or
   fold into "Project switching" / add a new "Navigation" section) describing: search, **New test
   case**, **New test run**, AI Studio icon, Notifications icon, Help icon, always rendered in
   `FreshTopbar` regardless of which screen is open. Each screen still has its own local page-level
   actions elsewhere (e.g. Test Runs keeps Seal/Edit/Report/More in its own page-head now, not the
   shared top bar — worth a line in the Test runs / Test execution sections too).
4. **`## Test cases` section** — note that Create test run / Import / Quick create / New case buttons
   moved from the top bar into the case-list pane's own toolbar (task-10); behaviour unchanged, just
   relocated.
5. Spot-check `## My Work`, `## Milestones`, `## Requirements (list view)`, `## AI Studio`, `## Login`,
   `## Reports`, `## Defects`, `## Audit log` sections against the actual current screens — these were
   originally documented from task-08's initial shells; confirm wording still matches after tasks
   09–13's polish (in particular Defects — task-13 rebuilt its table/toolbar/detail panel — and Audit —
   task-13 rebuilt its event-row styling but kept the page header and filter tabs, so the behavioural
   description should still hold, just double-check).
6. Sidebar nav order changed (task-07): Dashboard, My Work, then grouped Testing (Test cases/plans/
   runs) and Traceability (Requirements/Defects/Reports/Audit history) sections, AI Studio, then
   Project Settings at the bottom. "Pinned Modules" (eTMF Module, API Gateway, Add shortcut) and
   "Integrations" nav entry were removed — if this doc references either, remove/update. (The
   `/[projectKey]/integrations` route and its `PlaceholderScreen` still exist, just unreachable from
   the sidebar — don't imply the route was deleted.)

### `feature-flow.md`

1. **Feature status table** — the `Settings (project)` row currently says "Partial / Static mock /
   Read-only." Update to reflect the redirect (e.g. "Redirect to `/admin`" / not a standalone screen
   anymore).
2. **Manual test checklist per module** — the `### Settings — /:key/settings` checklist item
   ("Read-only fields display") is stale; replace with a check that the route redirects cleanly to
   `/admin` and the sidebar shows one "Project Settings" entry.
3. **Manual test checklist — Dashboard** — add/update checks for the new panels described above (KPI
   strip, completion donut, results-over-time chart, assignee bars, open runs, milestones slice) in
   place of or alongside the existing metric-card-oriented checks.
4. **Manual test checklist — Test cases** — add a check that Create test run/Import/Quick create/New
   case now live in the list-pane toolbar rather than the top bar.
5. **Manual test checklist — Test runs** — add a check that Seal/Edit/Report/More live in the screen's
   own page-head, and that the global top bar's New test case/New test run/AI Studio/Notifications/
   Help render identically across screens.
6. **"Shell & navigation" row** in the feature status table — update its Notes column to mention the
   new nav grouping (Testing/Traceability sections, Pinned Modules and Integrations nav entry removed)
   instead of just "Sidebar, module switcher, Cmd+K."
7. Everything else in this file (routes table, persistence model, schema notes, RBAC section,
   dependencies diagram) already reflects Phase 2 correctly as of task-08's update — don't rewrite
   sections that are already accurate; this task is about closing the specific gaps listed above, not
   a full rewrite.

## Verification

1. Read both files end-to-end after editing; confirm no remaining reference to the old Settings
   preview-page behaviour, the old Dashboard metric-card-only layout, or the removed Pinned
   Modules/Integrations nav entries.
2. Cross-check every route/behaviour claim against the running app (`pnpm dev`), not just the diffs —
   these two files are meant to be independently trustworthy without reading code.
3. No app code changed — `git diff --stat` should show only the two doc files.
4. Update the "*Living document · Last verified: <date>*" line at the top of both files.

## Documentation

- `docs/claude/handoff.md` — mark task-14 done; note it as a docs-only follow-up (no calibration
  data needed given the scope, but report usage % anyway for the record).

## Out of scope

- Any app code change under `apps/**`.
- Rewriting sections that are already accurate (see point 7 above) — targeted fixes only.
- `docs/_authoritative/**` — out of scope for this task; flag separately if something there also
  looks stale.
