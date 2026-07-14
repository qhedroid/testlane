# Task 13 — Defects + Audit + Project Settings (Phase 2, final batch)

Branch: `mvp-visual-overhaul` · Schema: unchanged (v14) · Depends on: task-07 · This is task 13 of
13 — **the last task on this branch.**

> Run this task straight through, including the final wrap-up section at the end, without stopping
> to ask for confirmation partway. Only stop if you hit a genuine blocker.

Three smaller, lower-risk screens bundled into one session: Defects and Audit are single existing
screens being swapped for the mockup's version, and Project Settings is largely visual polish on top
of what Phase 1's task-06 already did to `/admin/*`, now that task-07 made it the sidebar's single
settings entry point.

Reference: `mockup/Relay Compass Reskin Mockup.html` → Defects, Audit History, Project Settings.

Files touched:
- `apps/web/src/fresh/screens/DefectsScreen.tsx`
- `apps/web/src/fresh/screens/AuditScreen.tsx`
- `apps/web/src/fresh/components/admin/**`, `apps/web/src/fresh/styles/admin.css`
- `apps/web/src/fresh/styles/fresh.css`

## Part A — Defects

**Read `_kickoff.md` §9.2 — `DefectsScreen.tsx` reads `activeDefects` from `useFresh()` (real local
defects), merged with a static mock list. Adopt the mockup's layout, keep the real defect data.**

Match the mockup's Defects screen (`data-screen-label="Defects"`): a table toolbar ("All defects" +
shown count + status filter chips + a contextual "Details" button), the defects table itself (shared
`.tbl` look), and the detail panel when a defect is selected. No page header shown in the mockup's own
data-screen-label block beyond the default page-head pattern used elsewhere — apply the same "discard
the page header" treatment used on Dashboard/Test Cases/Test Plans, for consistency (Shaun didn't
call this out explicitly for Defects either way — this is a judgement call, flag it in the QA report
so it's easy to reverse if he'd rather keep it here). Keep all existing filter/detail-panel behaviour.

## Part B — Audit History

`AuditScreen.tsx` is already static (`AUDIT_EVENTS` from `data/seed`), so this is a straightforward
swap — abandon the current layout and implement the mockup's Audit History screen
(`data-screen-label` around the "Audit history" event-row styling: icon chips per event type,
timestamps, ref links). **Keep the page header** — Shaun explicitly asked for this one to be kept,
unlike most other Phase 2 screens. Keep the existing filter tabs (All events / Test Cases / Test Runs
/ Test Plans / Users) and their behaviour.

## Part C — Project Settings

Task-07 already made "Project Settings" the sidebar's single entry point (→ `/admin`, keeping the
app's real sidebar-swap behaviour). This task is the remaining visual polish: apply the mockup's
specific rounded-box/card treatment, button styling, and icon layout to the admin content pages,
building further on what Phase 1's task-06 already did to `admin.css` and `components/admin/**` —
compare the current admin styling against the mockup's Project Settings screen
(`data-screen-label="Project settings"`) and tighten up anything that doesn't yet match (form row
spacing, card radii, section dividers, table styling). Do **not** change the admin area's actual
structure (still a separate global area with its own sub-nav replacing the main sidebar) — this is
visual refinement only, not a rebuild.

## Verification

1. `pnpm build`; `pnpm dev`.
2. `/DP/defects`: table, filters, and detail panel match the mockup; real defect data still renders
   and updates correctly.
3. `/DP/audit`: matches the mockup's event-row styling, header kept, all filter tabs work.
4. `/admin/*`: Project Settings entry point works (from task-07), all admin sub-pages render with the
   tightened-up visual treatment, all existing CRUD/RBAC behaviour unchanged.
5. Screenshots to `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md`.

---

## Final wrap-up (this branch is now complete — do this last)

1. **Full regression sweep across both phases** — every route touched in tasks 01–13:
   `/DP/dashboard`, `/DP/testcases`, `/DP/testruns`, `/DP/plans`, `/DP/defects`, `/DP/audit`,
   `/DP/login`, `/DP/mywork`, `/DP/milestones`, `/DP/requirements`, `/DP/reports`, `/DP/aistudio`,
   `/admin/*` (all sub-pages). No console errors, no behavioural diff anywhere, protected Test Runs
   UX confirmed unchanged one more time.
2. Final screenshots + a "Phase 2 complete" summary appended to
   `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md`.
3. **Revise** `docs/cursor-prompts/mvp-visual-overhaul/pr-description-mvp-visual-overhaul.md` (drafted
   at the end of Phase 1's task-06) to cover both phases — add a "Phase 2" section describing the new
   screens, shell changes, and per-screen rebuilds, and update the Caveats section with anything
   flagged as a judgement call across tasks 07–13 (the `/settings` → `/admin` redirect, any
   reduced-fidelity dashboard panels, the Defects page-head decision, the Requirements data-source
   decision). Follow the repo's MR format (`CLAUDE.md` → "Merge request description format").
4. Update `docs/claude/handoff.md` — mark the `mvp-visual-overhaul` branch fully complete (Phase 1 +
   Phase 2); schema stays v14.

## Out of scope

- Any admin RBAC/CRUD logic change; any defect/audit data model change.
