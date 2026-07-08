# Branch kickoff — `mvp-visual-overhaul` (Compass reskin)

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
