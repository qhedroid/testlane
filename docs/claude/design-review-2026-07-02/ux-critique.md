# Relay — UX Critique & Design Review (2026-07-02)

**Inputs:** live-site audit screenshots (39), `TI-TMT MVP Tracker 2.xlsx` (final manual-pass statuses), `docs/design-brief/claude-design-brief-mvp-review.md`, `qa-mvp-tracker-audit-2026-07-02-report.md`, and a read of `apps/web/src/fresh/styles/*.css` for real values. No live-site interaction was performed; behavioural claims below are labelled as confirmed (seen in screenshot/tracker/code) or suspected.

Companion file: `wireframes.html` (wireframe-fidelity concepts for the four weak areas).

---

## 1. What's working

- **The execution workspace is the strongest screen in the product.** Three-pane layout, keyboard-first result entry (P/F/B/S, D for defect), a visible shortcut legend, step-level results with inline comments, and a pinned result bar. It reads like a tool made by people who run tests. Protecting it from casual rework is the right call.
- **The dashboard has genuine information scent.** KPI strip with deltas ("↑ 6.1 pp vs Sprint 43"), an actionable "Needs attention" queue with link-defect affordances, per-module coverage. It answers "what do I do next?", which most QA dashboards don't.
- **Visual language is broadly coherent** on the core screens: navy sidebar, monospace IDs, priority/status pills, compact 13px-base density appropriate for a data tool.
- **Plan query groups** (folder-based dynamic selection with a resolved-cases preview) are a genuinely good pattern — the preview table showing *why* a case is included (SOURCE column) is better than Testiny's equivalent.

## 2. Candid critique (independent of feature completeness)

### 2.1 Information architecture and navigation

- **Defects is buried.** It sits in the bottom utility cluster next to Settings/Admin/Integrations, while it is a first-class QA object that appears in the dashboard, execution screen, and case detail. It belongs in the DEMO PROJECT group with Test Cases/Plans/Runs.
- **Dead or placeholder nav in the primary rail.** "Reports — PLANNED" leads to a placeholder that exposes internal API surface (`GET /api/reports`) to the user. Demo coherence is a fair goal, but a primary-nav item that dead-ends erodes trust in everything else. Either give it the skeleton of the real module (see wireframes) or move planned items into a visually separate "Coming soon" affordance.
- **Breadcrumbs are inconsistent and mislabelled.** Confirmed across screenshots: `Dashboard / Demo Project / Test cases`, `Dashboard / Reports` (project level missing), and `Dashboard / TI-Core Platform / Audit History` — a third project name that appears nowhere else while the switcher still says "Demo Project". Breadcrumbs also start at Dashboard rather than the project, which makes Dashboard look like the root object.
- **Two search affordances on one screen.** Test Cases shows the topbar "Search cases… ⌘K" and a second in-table "Search cases…" box simultaneously, with no indication of how they differ. The dashboard version says "Search everything…". One global ⌘K search plus one clearly-scoped table filter would resolve this; right now they look like the same control twice.
- **The admin area's separation is legible (good), but developer furniture leaks through**: "Demo role: Demo User (Owner)" switcher in the chrome, "Current organisation" as plain header text. Acceptable in a prototype; worth flagging because it will read as broken RBAC to a stakeholder.

### 2.2 Consistency

- **Three different prototype banners** with internal jargon: "not persisted to MySQL… docs/implementation/frontend-contracts.md", "Shaun's v1.2 execution UI — in-memory demo data… MySQL-backed workspace: /runs/api", "Planned module…". A demo audience should never see a colleague's name, a database engine, or a docs path. One consistent, plainly-worded banner ("Prototype — demo data, resets on reload") would do.
- **Button verb/casing anarchy** (confirmed): "+ New Run", "+ New case", "+ New defect", "Create test run ▾", "Quick create", "+ New plan", "+ Invite user", "+ Create role". Pick one verb ("New" for records) and one casing.
- **Case detail panel renders two field systems on top of each other** (confirmed in `testcase-detail-panel.png`): Priority appears under METADATA as a pill and again below as an empty custom field "Priority —"; "References" appears twice; empty "Summary —" and "Is Automated —" sit next to a populated "Automation: Manual". This looks like built-in fields and custom fields being rendered from two sources without de-duplication. It is the single most visible polish defect in the case module.
- **Persona split across modules** (confirmed): execution/test data uses Nadim/Nasir/Monica/Jamil/Syed; org/admin uses Demo User/Alice/Bob/Carol/David; the project audit log mixes both, and run creation is attributed to "Noel Quadri". Two disjoint demo casts make RBAC demos confusing ("which of these users is Nadim?").
- **List paradigms differ per module** — folder-tree+table+overlay (Cases), master-detail rail (Plans), three-pane (Runs), plain table+detail (Defects). Some divergence is justified by the data, but Plans feels underdesigned by comparison: a mostly-empty canvas with two list cards and "Select a plan to view details".
- **Defect identity is mixed**: list shows TI-* rows; the panel note explains DEF-* vs TI-* (local vs mock-Jira), but the UI itself never distinguishes them visually.

### 2.3 Tables, density, and feedback

- **Column priority is wrong when the detail panel opens** (confirmed): TITLE collapses to 3–4 characters ("Vali…") while FOLDER/TYPE keep full width. Title and ID are the scannable columns; they should win. Same screen keeps both PRIORITY and the folder column even at half width.
- **"31d ago" on every visible row** — relative-only timestamps are useless at scale; at minimum tooltip the absolute date, and switch to absolute past 7 days.
- **LAST RESULTS sparkline dots have no legend** and are colour-only encodings (red/green/orange/purple). Not decodable by a first-time user, invisible to colour-blind users.
- **Silent-failure exports** (confirmed by audit: clicks produce no file; `AS_BUILT` says "visual only"): dashboard Export, run More…→CSV/Excel, audit Export. A control that does nothing on click is worse than an absent control — it converts every other button into a suspect. Until real, they should be disabled with a "not in prototype" tooltip, or better, drive the export flow in `wireframes.html` §B with a stubbed "Ready" artifact.
- **"15 of 1,000,000 entries"** in the admin audit log reads as obviously fake and undermines the otherwise credible admin area.

### 2.4 Execution screen (within the protected constraint)

Not proposing layout rework; these are contained irritations:

- **Per-step "Save" buttons** for comments are heavy for a keyboard-first screen; comment-on-blur autosave with a saved tick would remove two clicks per step. (Suspected friction; not verified live.)
- **Case-level vs step-level result ambiguity**: the bottom bar (Pass/Fail/Blocked/Skipped) and the per-step P/F/B/S chips are visually similar; nothing states that the bar sets the case result. A one-word label ("Case result:") would fix it — the bar already says "Result:", making it label-adjacent but still ambiguous when steps are also called results.
- **The Team/Defects/Details mini-tabs** inside the summary card are easy to miss and the Defects tab's copy ("can be linked to defects from configured integrations") contradicts the working local create-defect flow.
- **Counter adjacency**: filter row shows "All / Not run / Fail / Blocked · 132" directly above a folder group showing "Role & permissions · 10" — two unrelated counts stacked in the same visual position.

### 2.5 Accessibility (systemic)

- Red/green-only status encoding in dots, donuts, progress bars, sparklines. Add shape/letter reinforcement (the execution chips already prove the pattern: P/F/B/S letters).
- Type floor is very low: 9px/9.5px/10px labels are below any accessibility guidance; grey-on-white metadata (`--text3: #7A92AB` on white) is roughly 3:1 — fails WCAG AA for text this small.
- Row-level actions are hover-revealed and pointer-only in the case table (suspected keyboard trap; needs live verification).

## 3. Design-system opinion (brief item 3)

The brief says "no shared design system, each module styled independently". Having read the CSS, that's half-true — and the true half is cheap to fix:

- **A de facto token layer already exists** in `fresh/styles/fresh.css` (`:root` custom properties: navy/accent/status colours, `--mono`/`--sans`). `prototype-plans.css` and `prototype-runs.css` each contain exactly **one** raw hex value; everything else uses `var(--…)`. This is much better than the brief implies.
- **The real divergences**: `admin.css` re-declares its own palette (8 raw hex values, different blues — visible in the screenshots as the admin area's lighter look), and `legacy/relay-app.css` + `legacy/app-runs/runs.css` (~3,400 lines) are a separate universe.
- **Typography is the actual mess**: ~19 distinct `font-size` values across fresh+prototype styles (9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 14, 18, 22 px, with half-pixel steps used inconsistently). No one chose this scale; it accreted.
- **Recommendation** (small, sequenced): (1) extract `:root` from `fresh.css` into a `tokens.css` imported everywhere including admin; (2) collapse the type ramp to 5 steps (10 / 11 / 12 / 13 / 16 px, say) plus display sizes, expressed as `--fs-*` tokens; (3) migrate `admin.css`'s hex values to tokens. That's a one-branch job that makes every future screen cheaper. Full legacy migration can wait.

## 4. Things that stood out beyond the tracker (brief item 4)

1. **The screenshot set has a gap**: `testruns.png` and `testruns-list.png` are both the *run detail* (00001); there is no capture of a runs *list/index* view, and `testrun-case-execution.png` (cited as tracker evidence in 8 rows) is absent from the zip. Worth re-capturing before this evidence set is archived.
2. **Tracker vs uploaded audit report**: the uploaded `qa-…report.md` (first automated pass) and the xlsx (manual pass) disagree on rows 26/73/92 (ordering, coverage metrics, audit trail — all downgraded on manual verification). The xlsx is authoritative per the brief; the md should be annotated as superseded so nobody quotes "Coverage metrics: Completed" from it.
3. **Tracker `*` rows** (looks built, isn't): 21 (case history — run outcomes only, no version diff), 22 (case organisation — Completed at management level but the Organization area below is 0/7), 61 (requirement traceability — one-way only), 67 (defect traceability — links exist, no matrix). Row 12 is the mirror image: bulk-select UI with Add-to-run/Clone/Move/Assign/Archive is visible in `testcase-bulk-select.png`, yet Bulk edit is Not Started — dead-looking-alive again.
4. **Plan Overview stats can mislead**: "TEST CASE COVERAGE 29% — 7 of 24 test cases in this project" is plan-scope-vs-project maths presented as a quality metric; a plan isn't trying to cover the project. Meanwhile the case table says "17 cases" and Settings says 87+64+29+52 module cases — three different case-count universes visible in one session.
5. **Settings page leaks ops detail** ("requires Docker MySQL, pnpm db:migrate", port numbers) into a user-facing screen.

## 5. Priorities if only three things get fixed

1. **Kill silent-failure exports** (disable-with-tooltip now; real flow per wireframes §B next). Trust issue, not a feature issue.
2. **De-duplicate the case Details panel fields** and fix title-column collapse — the two most visible daily-use defects.
3. **One banner, one demo cast, one breadcrumb scheme** — cheap consistency wins that make every demo read as one product instead of three prototypes stitched together.

---

*Wireframe-fidelity concepts for Reporting & Analytics, Export & Reporting, Re-Run Management, and Test Case Organization are in `wireframes.html` alongside this file. Each frame carries numbered annotations and states its constraints (frontend-only, three-pane execution untouched).*
