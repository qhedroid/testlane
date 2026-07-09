# Branch kickoff — `mvp-visual-overhaul` (Compass reskin)

> **This file now covers two phases.** §1–§8 below are **Phase 1** (tasks 01–06): a pure CSS/className
> re-skin, complete and committed. **§9 (Phase 2, tasks 07–13)** is a larger follow-on that adopts more
> of the mockup directly — new screens, sidebar/topbar structure changes, full per-screen rebuilds —
> and **supersedes several of the Phase 1 golden rules below** for tasks 07 onward. If you're starting
> task-07 or later, read §1–§8 for context, then read §9 carefully — it tells you exactly which Phase 1
> rules still apply and which don't.

> This branch is split into 6 task files (`task-01-*.md` … `task-06-*.md`), each sized to comfortably
> fit in a single Cursor agent session/conversation. Hand this kickoff file to Cursor first, then hand
> it **one task file at a time**, waiting for that session to finish before starting the next. **Within
> a task file, instruct Cursor to run everything in it — including any internal "Part A / Part B"
> sections — back-to-back, without stopping to ask for confirmation between them.** It should only
> stop if it hits a genuine blocker (a build error it can't resolve, a missing asset, or a change that
> turns out not to be presentational). There is no other checkpoint/review gate on this branch — the
> task-file boundaries themselves are the natural review points, since each is its own Cursor session.
> Your `.cursor/rules/*.mdc` already covers the frontend-only phase, smoke test, commit format and
> living-docs rules; this file does not repeat them, it adds the visual-overhaul-specific rules.

Branch: `mvp-visual-overhaul` (already created, off latest `mvp-main`).
Schema: **unchanged (v14).** This branch touches CSS, `className` values, fonts, and small
presentational markup only. If you find yourself editing `demo-model.ts`,
`migrate-demo-state.ts`, `FreshProvider.tsx`, selectors, reducers, routes, or any data — **stop,
you are out of scope.**

---

## 1. Goal

Apply the **approved Compass (TransPerfect) visual system** to the whole Relay web app, as a pure
**re-skin**. The look is already designed and signed off in an HTML mockup (see §3). Your job is to
make the live Next.js app *look like that mockup* while **keeping every existing behaviour,
layout structure, route, and interaction exactly as it is today.**

This is a visual pass to precede functional work — the team will rework/restore functionality on
later branches. Nothing here should remove or change functionality.

## 2. Golden rules (read twice)

1. **Zero behaviour change.** Do not touch state, reducers, selectors, actions, event handlers,
   routing, RBAC, data model, `localStorage`, or any conditional that drives behaviour. If a JSX
   change is not purely presentational, it does not belong on this branch.
2. **The mockup is the visual source of truth; the app is the structural source of truth.** Match
   the mockup's colours, typography, spacing, radii, borders, badges/chips/buttons, table and panel
   treatments. Do **not** restructure a screen's layout, panes, or DOM hierarchy to match the mockup —
   the app's current layout stays. (The mockup was itself built from these screens, so structures
   already correspond closely.)
3. **Re-skin via tokens and shared classes, not rewrites.** Almost the entire app is driven by ~15
   CSS variables in `apps/web/src/fresh/styles/fresh.css` `:root` plus a set of shared classes
   (`.btn`, `.panel`, `.tbl`, `.chip`, `.pill`, `.pri`, `.sb*`, `.topbar`, …). Retarget those
   variables and adjust those shared classes (task-01), and most of the app reskins itself. Prefer
   editing CSS over editing TSX. Only touch `className` strings when a class genuinely needs to
   change; never rename classes app-wide for cosmetics.
4. **Protected UX — Test Runs execution workspace.** The three-pane run workspace
   (`RunsScreen.tsx` + `.runs-v12` rules in `prototype-runs.css`) is explicitly protected. Reskin its
   colours/type/spacing **only**. Do not change the three-pane structure, the keyboard flow, the
   result-recording behaviour, or `/runs/api`. (task-04)
5. **Keep the `/admin/*` area a separate, global area.** Reskin it, but keep its visual separation
   from the per-project shell legible. Do not merge admin nav into the project sidebar. (task-06)
6. **Keep the existing icon libraries.** The fresh app uses **Tabler Icons** (`<i className="ti ti-…">`);
   the admin area uses **Lucide React**. The mockup happens to use Material Icons Round, but both
   Tabler and Lucide are the same family of clean line icons — do **not** swap icon libraries
   (~180 `ti` call sites + Lucide imports; a swap is risky and is not a reskin). Restyle icon
   colour/size/containers only. Exact Material-glyph parity is an explicit **out-of-scope** future
   task, noted in §6.
7. **Frontend-only phase still applies** — no backend, DB, Docker, auth, or API-route work.

## 3. Reference material

- **Visual mockup (authoritative look):** `mockup/Relay Compass Reskin Mockup.html` — a single
  self-contained file that opens in a browser with no build. Open it and click through Dashboard,
  My Work, Test Cases, Test Plans, Test Runs, Requirements, Defects, Milestones, Reports, Audit
  History, AI Studio, Project Settings. **Every screen you reskin has a counterpart here** — match it.
  (This is added to the repo alongside these prompts; if it is missing, ask.)
  - Note: the mockup contains a few screens the live app does **not** have yet (My Work, Milestones,
    standalone Requirements, AI Studio). Those are future features — **out of scope** for this branch
    (§6). Only reskin screens that exist in the app today.
- **Design system:** Compass (TransPerfect). The exact token values you need are transcribed into
  **task-01** so you do not need the design-system repo. For deeper reference the guide describes:
  TP Dark Blue `#003B71` nav, GlobalLink Blue `#1976D2` interactive, a 14-step gray ramp, Gotham SSm
  display / Open Sans body, Material Icons Round, 8-pt spacing, radii `s6 m8 l10 xl16 pill100`,
  solid surfaces + 1px borders (no gradients), subtle shadows only.
- **Per-screen intent** (which screens keep which layout) is in each task file's Background.

## 4. Task sequence

Run the 6 task files in order, **one per Cursor session** — hand task-01 to Cursor, let it run to
completion (including its internal Parts, continuously, no stopping for confirmation), then hand it
task-02, and so on. Tasks were originally split into 8 finer-grained files purely to manage Cursor's
token budget per session; in practice that budget has had comfortable headroom even at this coarser
size (measured on other branches: 5 combined tasks on one screen ≈ 51% usage, a single task on a
~1,300-line screen ≈ 45% usage), so they've been consolidated into 6 — each still sized to stay
clear of the ceiling, based on the size of the files each one touches. task-03, 04, 05, and 06 each
wrap one original task (Test Cases, Test Runs, Test Plans, Admin — the four screens with the
largest individual files, left solo on purpose); task-01 and task-02 each bundle two lighter
original tasks as internal Parts (see those files for the Part breakdown). There is no cross-task
checkpoint anymore — each task file's own Verification section is the review point, and the file
itself instructs Cursor not to stop partway through it.

| Task | Scope | Primary files |
|------|-------|---------------|
| **task-01** | Compass token & primitive foundation (Part A) + app shell — sidebar + top bar (Part B) | `fresh.css` (`:root` + shared classes), fonts, `FreshShell.tsx`, `FreshTopbar.tsx`, `ProjectSwitcher.tsx`, `ModuleSwitcher.tsx` |
| **task-02** | Dashboard (Part A) + remaining screens — Defects, Audit, per-project Settings, modals, placeholders (Part B) | `DashboardScreen.tsx`, `RunDonut.tsx`, `RunStatusInfographic.tsx`, `DefectsScreen.tsx`, `AuditScreen.tsx`, `SettingsScreen.tsx`, `*Modal.tsx`, `PlaceholderScreen.tsx`, `fresh.css` |
| **task-03** | Test Cases | `CasesScreen.tsx`, `fresh.css` |
| **task-04** | Test Runs (protected UX — visual only) | `RunsScreen.tsx`, `TestRunsTopbar.tsx`, `prototype-runs.css` |
| **task-05** | Test Plans | `PlansScreen.tsx`, `prototype-plans.css` |
| **task-06** | Admin / Project Settings, plus the branch's final wrap-up (full regression sweep + PR description) | `admin.css`, `admin/**` pages + shell |

Each task ends with its own build + smoke test (see `.cursor/rules`). Because this is a visual
branch, the smoke test is primarily "does every core route still render, still behave identically,
and now look like the mockup" — capture before/after screenshots per task. The one-time,
branch-wide final regression sweep and PR description now live at the end of task-06, since it's the
last task to run.

## 5. Definition of done (per task)

- App builds (`pnpm build`) and all core regression routes render with no console errors.
- The reskinned screen visually matches its mockup counterpart (colour, type, spacing, components).
- No behavioural diff: every button, filter, drag, tab, keyboard shortcut, and navigation still does
  exactly what it did before.
- Living docs updated where relevant (see §7).

## 6. Out of scope for this branch (do not do here)

- New screens that only exist in the mockup: **My Work, Milestones, standalone Requirements module,
  AI Studio.** (Future feature branches.)
- Swapping icon libraries to Material Icons Round for exact glyph parity. (Optional future
  `mvp-icon-migration`.)
- Any functional change, new data, new routes, schema/migration, backend.
- Creation/deletion modal *behaviour*, tooltips/micro-interaction *behaviour* — you may restyle the
  existing ones, but don't build new interactions.
- Dark mode. The app is light-mode only; keep it that way (task-01 pins light mode).

## 7. Documentation

This branch changes the visual system but not behaviour, routes, data, or schema. Update:
- `docs/product/design-system.md` — replace the current ad-hoc token table with the Compass token
  set adopted in task-01 (this is the biggest doc change; do it during task-01).
- `docs/claude/handoff.md` — add a "Completed work — `mvp-visual-overhaul`" section as tasks land;
  schema stays v14.
- No change needed to `feature-flow.md` / `user-guide.md` (no behaviour/route change) beyond a note
  that the UI was reskinned to Compass, if you think it warrants one.

## 8. A note on scale / project name

The mockup shows the app under the working name **"Relay"** with a **"TransPerfect — Trial
Interactive"** organization. Keep the app's current product name and wordmark as they are in the
code — do not rename anything. Only the *visual style* changes.

---

## 9. Phase 2 — Compass IA/layout overhaul (tasks 07–13)

Everything in §1–§8 governed Phase 1 (tasks 01–06, complete). After reviewing that result, Shaun
requested a larger follow-on: bring over more of the mockup's actual structure, not just its colours.
This is deliberately kept on this same branch rather than split into a new one. Read this section in
full before starting task-07 — it changes some of the ground rules above.

### 9.1 What's different from Phase 1

1. **Zero-behaviour-change no longer applies universally.** Sidebar/topbar structure changes, new
   screens, and full per-screen layout rebuilds are explicitly in scope for the screens named in the
   task table below. **The Test Runs protected-UX rule (§2.4) is unchanged and still fully applies** —
   nothing about Phase 2 relaxes that; task-12 restates it.
2. **New screens are now in scope:** Login, My Work, Milestones, Requirements, Reports, AI Studio.
   (§6's exclusion of these is lifted for these six specifically — everything else in §6 still applies.)
3. **Layout restructuring is now in scope** for the screens named in the task table below — the
   mockup's actual layout, not just its colours/type, is the target for those screens. Screens not
   named in the Phase 2 task table (nothing currently outside it) keep the Phase 1 rule of
   layout-stays.
4. **Icon libraries still stay** (§2.6 unchanged). The six new screens/nav items need Tabler
   equivalents chosen for the mockup's Material glyphs — task-07 lists the mapping.
5. **Frontend-only phase still applies** (§2.7 unchanged) — no backend, no real auth, no real AI
   calls. New screens are static/demo-content shells, consistent with how the rest of this app
   already works (e.g. the existing "Pinned Modules" / mock defects / seed data pattern).

### 9.2 Critical rule — read before every Phase 2 task

Several screens are described as "abandon ours, implement the mockup's version" (Dashboard, Defects,
Audit). The mockup's own content is static demo data written for a design mockup, not a real app.
**`DashboardScreen.tsx` and `DefectsScreen.tsx` compute real values from `FreshProvider` state
(`useFresh()`) today. Adopt the mockup's layout and component structure, but re-wire it to that same
live data — never replace a live value with the mockup's hardcoded number** (e.g. "342 test cases",
its specific donut percentages, its specific defect rows). `AuditScreen.tsx` is already static
(`AUDIT_EVENTS` from `data/seed`), so swapping its content for the mockup's own static demo rows is
fine — there's no live computation to lose there. Test Plans and Test Cases already compute live from
`FreshProvider` too — the same rule applies to anything they display.

### 9.3 Font

Gotham SSm is now fully wired (`apps/web/public/fonts/gotham-ssm/`, weights 400/500/700, woff2+woff).
There is no more Open Sans fallback caveat — nothing to do here, just don't remove the files or the
`@font-face` rules.

### 9.4 Task sequence (tasks 07–13)

Run one task file per Cursor session, same pattern as Phase 1 — hand this whole kickoff file plus the
task file, let it run to completion continuously, no stopping for confirmation except at a genuine
blocker.

| Task | Scope | Primary files |
|------|-------|---------------|
| **task-07** | Sidebar + top bar overhaul, plus route/nav scaffolding for the six new screens (pointing at placeholders until task-08 fills them in) | `FreshShell.tsx`, `FreshTopbar.tsx`, `TestRunsTopbar.tsx`, `project-routes.ts`, new `page.tsx` route stubs, `fresh.css` |
| **task-08** | Six new screens, built out fully: Login, My Work, Milestones, Requirements, Reports, AI Studio | new screen components + routes, replacing task-07's placeholders |
| **task-09** | Dashboard — full rebuild from the mockup's layout, live data preserved (§9.2) | `DashboardScreen.tsx`, `fresh.css` |
| **task-10** | Test Cases — hybrid rebuild; the task file spells out exactly what's kept from the app vs. replaced from the mockup | `CasesScreen.tsx`, `fresh.css` |
| **task-11** | Test Plans — full rebuild from the mockup's layout, live data preserved (§9.2) | `PlansScreen.tsx`, `prototype-plans.css` |
| **task-12** | Test Runs — full rebuild from the mockup's structure; **protected UX, §2.4 still applies in full** | `RunsScreen.tsx`, `TestRunsTopbar.tsx`, `prototype-runs.css` |
| **task-13** | Defects + Audit + Project Settings, bundled — three smaller, lower-risk screens | `DefectsScreen.tsx`, `AuditScreen.tsx`, `SettingsScreen.tsx`, `admin/**`, `fresh.css` |

**Sizing note:** this is heavier work than Phase 1's CSS-only tasks — real component authoring from
the mockup's markup, not targeted line edits — so Phase 1's measured 41–46% usage band does **not**
necessarily transfer. There's no calibration data yet for this kind of work. Report the usage % after
each task the same way Phase 1 did, so later tasks in this list can be resized (split further, or
bundled more) if the early ones run hot or cold.

### 9.5 Definition of done (Phase 2, per task)

Same as §5, plus:
- Any screen with live data (Dashboard, Defects, Test Cases, Test Plans, Test Runs) shows real,
  correct `FreshProvider`-computed values — never the mockup's static demo numbers.
- New screens render the mockup's static demo content with no console errors, using Tabler icons
  (not Material Icons Round) for their nav entries and in-page icons.
- Sidebar/nav labels use **Title Case** (e.g. "Test Cases," "My Work," "Audit History") even where
  the mockup itself uses sentence case ("Test cases," "My work") — this is a deliberate correction,
  not a mockup-copying error.
- Living docs updated per each task file's own Documentation section.

### 9.6 Mockup research reference

`docs/claude/handoff.md`'s "2026-07-08 Phase 2" section has the full write-up of what was found by
decoding the mockup bundle (nav order/labels, global topbar scope, Project Settings behaviour, Test
Runs control parity, Test Cases real mock data, confirmation the six new screens are static/demo-only
underneath). Read it once before task-07 rather than re-deriving these facts from the mockup file
yourself.
