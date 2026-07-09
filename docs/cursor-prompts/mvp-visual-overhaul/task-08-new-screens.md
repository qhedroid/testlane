# Task 08 — Build the six new screens (Phase 2)

Branch: `mvp-visual-overhaul` · Schema: unchanged (v14) · Depends on: task-07 (route stubs exist) ·
This is task 8 of 13.

> Run this task straight through to Verification without stopping to ask for confirmation partway.
> Only stop if you hit a genuine blocker. Report your token/usage % when done — this is the first
> Phase 2 task involving real net-new component authoring rather than editing existing files, so
> there's no calibration data for it yet. If it's clearly running very long partway through, it's
> fine to stop after 2–3 screens and let Shaun split the remainder into a follow-up task rather than
> pushing through and risking a bad partial state.

Build out full content for six screens that exist in the mockup but not in the app today: **Login,
My Work, Milestones, Requirements, Reports, AI Studio**. All six are static/demo-content shells —
none of them wire to real backend logic in the mockup either (e.g. AI Studio's "Generate" button has
no real AI call behind it), so hardcoded mock data matching the app's existing demo-data conventions
(see `apps/web/src/fresh/data/seed.ts` and `mock-data.ts` for the style/shape already used elsewhere)
is the right level of fidelity. Do not build real functionality, real data wiring, or backend calls
for any of these.

Reference: `mockup/Relay Compass Reskin Mockup.html` — open it in a browser (it's a fully interactive
self-contained bundle). Each screen lives under its own `data-screen-label="..."` block in the page
source if you need to find it in raw markup, but viewing it rendered is more useful for anything with
mock data in it.

Files touched:
- `apps/web/src/fresh/screens/{LoginScreen,MyWorkScreen,MilestonesScreen,RequirementsScreen,ReportsScreen,AiStudioScreen}.tsx` (new)
- The five route files task-07 stubbed with `PlaceholderScreen` — replace their contents to render the
  new real screen components instead
- `apps/web/src/fresh/styles/fresh.css` — add screen-specific classes as needed, following the
  existing naming convention (`.mywork-*`, `.milestones-*`, etc.) and reusing shared classes
  (`.panel`, `.tbl`, `.btn`/`.btn-p`/`.btn-neutral`, `.pill`, `.chip`, `.pri`) wherever the mockup uses
  their equivalents — don't invent new primitives if an existing shared class already matches.

General approach for all six: match the mockup's layout, content, and copy closely — these are meant
to look and feel finished even though nothing behind them is real. Use Tabler icons (`ti-*`), not the
mockup's Material Icons Round, for every icon (kickoff §2.6 still applies — pick a sensible Tabler
equivalent for each Material glyph you see, matching the mapping style already used in task-07 for
sidebar icons). Use Title Case for headings/labels where the mockup uses sentence case (kickoff §9.5).
Every screen should use `FreshTopbar` the same way existing screens do (breadcrumb + the global
action cluster from task-07 — do not pass extra screen-specific `actions` into it; if a screen needs
its own local actions, put them in its own page-head/body the way Test Cases and Test Runs do).

## Login

Reachable at the `/login` route task-07 stubbed — **not** a gate on app load; nothing about how the
app starts up or is accessed changes. Build it 1:1 from the mockup's login screen: full-bleed
two-column layout, left panel dark-blue (`--navy`) with the Relay wordmark, "Test management"
subhead, three checkmark bullet points ("Plan, execute and trace testing in one place", "Requirements
and defects linked to every case", "Reports your auditors will actually read"), and a footer copyright
line. Right panel: "Sign in" heading, a one-line description, Email + Password fields (labels
uppercase, small, muted), a "Forgot password?" link, a primary "Sign in" button, an "or" divider, and
a "Continue with TransPerfect SSO" neutral button with a domain icon. Footer note: "Internal tool —
access is provisioned by IT." None of the buttons need to do anything real — clicking "Sign in" or the
SSO button can just navigate to the project dashboard (`projectPath(DEFAULT_PROJECT_KEY, 'dashboard')`
or similar), simulating the mockup's `signIn` handler without any real auth check.

## My Work

KPI strip with four tiles (Assigned cases, Not run yet, Blocked, Defects to verify — use small mock
numbers, e.g. 9/3/1/1), then a two-column layout: a "Your test queue" panel showing 2–3 mock run
groups (each with a run id/name/fraction-complete header and a "Continue" button, and a couple of
case rows each with a status dot, case id, title, status pill, and a "Run" button), and a "Defects
involving you" panel listing a few mock defects with id, title, a short reason line, and a severity
pill. Page head: "My Work" title + a one-line sub like "Everything waiting on you · N cases across N
runs".

## Milestones

Reference the mockup's Milestones screen (`data-screen-label="Milestones"`) for layout — expect a
list/grid of milestone cards or rows with name, status, target date, and linked run/case counts. Use
2–4 mock milestones matching the flavour of the app's other demo content (e.g. names like "UAT
sign-off", tying into the existing mock run/defect data where it's easy to cross-reference, e.g. the
"R-29 · Login hardening" run already referenced elsewhere in the app's seed data).

## Requirements

Reference the mockup's Requirements screen (`data-screen-label="Requirements"`) for layout — a
table/list of requirements with id (e.g. REQ-xxx), title, linked test case count, and status. This is
a **read-only view-only module for now** — the app already has local requirement creation/linking
inside Test Cases' and Test Runs' Requirements tabs (see `mvp-requirements-defects-slice` in
`roadmap.md`); this new page is a dedicated list view of those, not a new place to create them. If
it's simple to do, pull from the same `requirementsById` state the existing tabs use rather than
inventing a separate mock list — if that turns out to be non-trivial, a static mock list matching the
existing requirement id format (`REQ-xxx`) is an acceptable fallback; note which approach you took in
the QA report.

## Reports

The app already has a `/reports` route and nav entry (currently `PlaceholderScreen`, "planned").
Replace its content with the mockup's Reports screen (`data-screen-label="Reports"`) — expect a grid
of report-type cards (e.g. "Run summary", "Requirements coverage", "Failure trends", "Flaky cases",
"Tester workload" — these exact labels appear in the mockup's `repChips` data). Static/demo content is
fine; these don't need to generate anything real.

## AI Studio

Reference the mockup's AI Studio screen (`data-screen-label="AI Studio"`) — a prompt input with a
purple "Generate" button, a row of 4 quick-action cards (e.g. "Generate test cases", each with an
icon/title/description), and a two-column result area: a "Draft preview" panel listing 2–3 mock
generated items (each with Accept/Edit/Discard buttons that don't need to do anything real), and
likely a secondary panel alongside it (check the mockup for what it shows — a summary or history
panel). Purple accent (`--tp-purple` in the mockup — add this as a token if it's not already in
`fresh.css`, matching the mockup's exact hex) is used consistently for AI-related UI. None of the
generate/accept/edit/discard actions need real behaviour — clicking Generate can just reveal the
already-present mock draft panel (or do nothing if that's simpler), consistent with "nothing is saved
without your review" copy in the mockup.

## Verification

1. `pnpm build`; `pnpm dev`.
2. Navigate to all six new routes (`/login`, `/mywork`, `/milestones`, `/requirements`, `/reports`,
   `/aistudio`) both directly and via the sidebar — each renders its real content (not the
   `PlaceholderScreen` fallback) with no console errors.
3. Confirm the app's normal entry/navigation flow is unchanged — visiting `/login` does not redirect
   anywhere unexpected, and nothing else in the app redirects *to* `/login`.
4. Confirm Tabler icons are used throughout (no Material Icons Round leaked in), Title Case labels,
   and the shared `.btn`/`.panel`/`.tbl`/`.pill` classes are reused rather than one-off styles.
5. Core regression routes still render with no console errors.
6. Screenshots of all six new screens to `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md`.

## Documentation

- `docs/claude/handoff.md` — mark task-08 done; list the six new routes/screens and note the
  Requirements page's data-source decision (live `requirementsById` vs. static mock list).
- `docs/product/feature-flow.md` and `docs/product/user-guide.md` — these are genuinely new
  routes/screens, so (unlike Phase 1) this warrants updates: add each new screen to the route/feature
  list with its current scope (static/demo-only, no real functionality yet).

## Out of scope

- Any real backend, real AI calls, real auth, real notifications.
- Making Requirements a place to create/edit requirements (it already has one, inside Test
  Cases/Test Runs — this task only adds a dedicated list view).
- Wiring Milestones/Reports to real computed data — static demo content is correct for this task.
