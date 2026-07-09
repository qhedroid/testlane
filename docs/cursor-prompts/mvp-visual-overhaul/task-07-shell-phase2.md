# Task 07 — Shell overhaul: sidebar, top bar, and route scaffolding (Phase 2)

Branch: `mvp-visual-overhaul` · Schema: unchanged (v14) · This is task 7 of 13 (task 1 of Phase 2 —
read `_kickoff.md` §9 in full before starting, it supersedes several Phase 1 rules).

> Run this task straight through to Verification without stopping to ask for confirmation partway.
> Only stop if you hit a genuine blocker. Report your token/usage % when done — there's no
> calibration data yet for Phase 2's heavier component-authoring work.

This task does two things: (1) resize and restructure the sidebar and top bar to match the mockup,
and (2) scaffold routes/nav entries for six screens that don't exist in the app yet, pointing them at
a placeholder for now. Task-08 replaces those placeholders with real content.

Reference: `mockup/Relay Compass Reskin Mockup.html`. Open it in a browser (it's a fully interactive
self-contained bundle, not static markup — you'll see it actually run).

Files touched:
- `apps/web/src/fresh/components/FreshShell.tsx` (sidebar)
- `apps/web/src/fresh/components/FreshTopbar.tsx` (top bar)
- `apps/web/src/fresh/lib/project-routes.ts` (new module slugs)
- `apps/web/src/app/(app)/[projectKey]/{login,mywork,milestones,requirements,aistudio}/page.tsx` (new route stubs)
- `apps/web/src/fresh/styles/fresh.css` (`.sb*` sizing, new global topbar action styles)

---

## Part A — Sidebar

**Sizing** (mockup values — apply these to the existing `.sbi`/`.sb-lbl` rules in `fresh.css`, do not
rename classes): nav item padding `13px 14px` (up from `8px 12px`), font `500 14.5px/1` (up from
12.5–14px), icon size `21px` (up from ~18px), section label padding `18px 12px 6px`. Keep the white
rounded-chip active-state treatment from Phase 1 (task-01) — that part already matches the mockup.

**Full nav parity.** Current nav order/items (`FreshShell.tsx` `PLATFORM_NAV` + the hardcoded links):
Dashboard, Test Cases, Test Plans, Test Runs, Reports (planned), then a "Pinned Modules" section
(eTMF Module, API Gateway, Add shortcut), then Audit History, Defects, Integrations (planned),
Settings, Admin. Replace this with the mockup's nav list, **in this order**, grouped exactly as the
mockup groups them:

```
Dashboard
— group: Testing —
Test Cases
Test Plans
Test Runs
Milestones
— group: Traceability —
Requirements
Defects
Reports
Audit History
AI Studio
```

Plus, at the very bottom (below a divider, same place the current Settings/Admin links live):
**My Work** does NOT belong in this bottom cluster or the Testing/Traceability groups — per the
mockup it sits directly under Dashboard, before the "Testing" group starts, with no group label of
its own. Add it there.

**Deliberate deviations from the mockup, do not copy these verbatim:**
- **Capitalization:** use Title Case for every label (Test Cases, My Work, Audit History, AI Studio)
  even though the mockup's own labels are sentence case ("Test cases", "My work"). This is an
  intentional correction Shaun asked for, not an oversight to preserve.
- **Remove the "Pinned Modules" section entirely** (eTMF Module, API Gateway, Add shortcut) — it
  doesn't exist in the mockup and Shaun confirmed it should go, not be kept or reskinned.
- **Remove "Integrations"** — not in the mockup's nav, matches Shaun's explicit ask. Leave the
  underlying `/[projectKey]/integrations` route and `PlaceholderScreen` usage in place (just
  unreachable from the sidebar) rather than deleting the route — low-value churn to remove it outright.
- **Collapse control:** keep the app's existing small collapse toggle in the logo cell
  (`.sb-toggle`, next to the Relay mark) exactly as it is today. Do **not** add the mockup's separate
  bottom-of-sidebar "Collapse" row item — the app doesn't need two ways to do the same thing.
- **Settings/Admin → single "Project Settings" entry.** Today there are two separate links at the
  bottom (`Settings` → the per-project `SettingsScreen`, and `Admin` → `/admin`). Replace both with
  **one** "Project Settings" link that goes to `/admin` (keeping the app's real behaviour: the sidebar
  swaps to the admin sub-nav, exactly as `/admin` already does today — do **not** adopt the mockup's
  own Project Settings behaviour of an embedded sub-panel within one page, Shaun explicitly wants to
  keep the app's real swap-sidebar mechanism). This leaves the old per-project `SettingsScreen.tsx`
  route orphaned from the sidebar — **this is a judgment call flagged for Shaun to correct if wrong:**
  redirect `/[projectKey]/settings` to `/admin` rather than deleting the route or its component,
  so nothing 404s if something else links to it. Grep the codebase for other references to
  `projectHref('settings')` before doing this, in case something else depends on it.

**Icons (Tabler, not Material — icon libraries stay per kickoff §2.6 / §9.1.4).** Choose Tabler
equivalents for the mockup's Material glyphs on the new items:
- My Work (`assignment_ind`) → `ti-user-check`
- Milestones (`flag`) → `ti-flag`
- Requirements (`rule`) → `ti-list-details`
- AI Studio (`auto_awesome`) → `ti-sparkles`
- Reports (`insights`) → keep the app's existing `ti-chart-bar` (already used for the current
  "planned" Reports link)
- Audit History, Defects — keep existing `ti-history` / `ti-bug`, no change needed

Drop the "Planned" badge from Reports now that task-08 is about to build it out for real (the badge
logic can stay in the component if you prefer to be cautious, just don't show it on Reports/My
Work/Milestones/Requirements/AI Studio once their routes exist — a `soon` badge on a page-stub is
fine to leave for now if it's simpler to only remove once task-08 lands; use your judgement, it's
cosmetic either way).

---

## Part B — Top bar

**Background:** `FreshTopbar.tsx` is a shared component every screen renders, but each screen passes
its own `actions` prop into it — that's why the right-side icons currently change depending on which
screen is open (e.g. Test Runs passes `<TestRunsTopbar>`'s seal/edit/report/more cluster). Shaun wants
the top bar to stop doing that: the mockup's global header (search, New test case, New test run, AI
Studio, Notifications, Help) renders identically on every screen, while each screen keeps its own
*local* page-level actions elsewhere in its own body (not through the shared top bar) — Test Cases
moving its create/import/quick-create buttons into its own list-pane toolbar (task-10) is the clearest
example of this pattern, and Test Runs keeps its own page-head with Seal/Edit/New-run actions
(task-12) the same way the mockup does.

**What to do in this task:**
1. Add a new, always-rendered action cluster **inside `FreshTopbar.tsx` itself** (not passed in via
   props): New test case (`.btn-neutral`), New test run (`.btn-p`), an AI Studio icon button
   (`ti-sparkles`, purple/accent-tinted per the mockup's `.ai` treatment), a Notifications icon button
   (`ti-bell`, with a small dot — no real notification data needed, static is fine), and a Help icon
   button (`ti-help-circle`). Wire "New test case" and "New test run" to whatever the app's existing
   case/run creation entry points are (grep for where `CreateCaseModal` / `CreateRunModal` are
   currently opened from — likely a per-screen button today — and reuse that same open-modal call from
   the new global buttons rather than duplicating logic). AI Studio links to the new `/aistudio` route
   stub from Part C.
2. **Do not** add the mockup's "Apps" (9-square grid) icon or its user-avatar icon — the app doesn't
   have these today and Shaun explicitly wants them left out, not brought over.
3. Keep the breadcrumb (`.bc`) exactly as it is — it's the one piece of the current top bar Shaun
   wants kept as-is.
4. **Leave the `actions` prop on `FreshTopbar`'s interface working for now** — several screens
   (Test Runs, and others until their own Phase 2 tasks run) still pass content through it, and this
   task doesn't touch every screen. Removing the prop now would break builds for screens not yet
   migrated. The new global cluster added in step 1 renders *in addition to* whatever `actions` a
   screen still passes; screens get cleaned up to stop passing screen-specific actions as their own
   tasks (09–13) rebuild them from the mockup. Once every screen has been migrated (end of task-13),
   it's fine to remove the now-unused `actions` prop entirely if nothing references it — flag this as
   a note in your task-13 handoff, don't do it in this task.

---

## Part C — Route scaffolding for the six new screens

Add module slugs and route stubs so the new sidebar links don't 404, without building real content
yet (task-08 does that).

1. **`project-routes.ts`:** add `mywork: 'mywork'`, `milestones: 'milestones'`,
   `requirements: 'requirements'`, `aistudio: 'aistudio'` to `MODULE_SLUGS` (note: `reports` already
   exists as a slug). Add matching entries to `LEGACY_PATH_TO_MODULE` for consistency with the
   existing pattern.
2. **Route stubs:** for each of `mywork`, `milestones`, `requirements`, `aistudio`, create
   `apps/web/src/app/(app)/[projectKey]/<slug>/page.tsx` that renders the existing
   `PlaceholderScreen` component (same pattern already used for `reports`/`integrations` — see
   `apps/web/src/app/(app)/[projectKey]/reports/page.tsx` for the exact shape to copy), with a
   title and one-line description appropriate to each (e.g. "My Work — your assigned work across
   test cases and runs will live here."). `reports` already has a real route + `PlaceholderScreen` —
   leave it as-is, task-08 replaces its content directly.
3. **Login:** add `apps/web/src/app/(app)/[projectKey]/login/page.tsx` as a route stub for now (task-08
   builds the real page). This is a **reachable route only** — it does not gate access to the rest of
   the app on load. Do not wire any redirect-to-login-if-not-authenticated logic; there is no real
   auth in this app and none should be added.

---

## Verification

1. `pnpm build`; `pnpm dev`.
2. Sidebar: full nav list in the mockup's order/grouping, Title Case labels, correct Tabler icons,
   "Pinned Modules" and "Integrations" gone, a single "Project Settings" entry that swaps the sidebar
   to admin nav exactly as `/admin` does today, the app's existing small collapse toggle still works
   (no second collapse control added).
3. Top bar: New test case / New test run / AI Studio / Notifications / Help render identically on
   every screen (check at least Dashboard, Test Cases, Test Runs); breadcrumb still shows the current
   path; no Apps-grid or avatar icon added. New test case / New test run buttons actually open the
   existing creation modals.
4. The four new placeholder routes (`/mywork`, `/milestones`, `/requirements`, `/aistudio`) and
   `/login` all render without error when navigated to directly or via the sidebar.
5. Every existing screen that passes its own `actions` into `FreshTopbar` still builds and still shows
   its existing screen-specific actions alongside the new global cluster — nothing broken for
   not-yet-migrated screens.
6. Core regression routes all still render (see task-01's list) with no console errors.
7. Screenshots of the shell (expanded + collapsed, and the new nav items) to
   `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md`.

## Documentation

- `docs/claude/handoff.md` — mark task-07 done under the "2026-07-08 Phase 2" section; note the
  `/[projectKey]/settings` → `/admin` redirect decision explicitly so it's easy for Shaun to spot and
  correct if it's not what he wanted.

## Out of scope

- Building real content for the six new screens (task-08).
- Any change to `/admin/*` internals beyond making it the single settings entry point (task-13 covers
  its visual polish).
- Test Runs' own local page-head actions (task-12) or Test Cases' list-pane toolbar (task-10) — this
  task only adds the *global* topbar cluster, not per-screen local actions.
- Real authentication, real notifications data, real AI Studio functionality.
