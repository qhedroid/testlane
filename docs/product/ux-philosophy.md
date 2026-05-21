# UX philosophy — Relay

## The core principle

Relay is an execution workspace. The moment a QA engineer opens it, they should be able to find their assigned cases, see what is failing, and start marking results — without navigating through menus, configuring views, or translating between the tool's model and their actual workflow.

Every UX decision is judged against this principle.

---

## View-by-view philosophy

### Dashboard

The dashboard is a briefing screen, not a reporting screen.

It answers: *What needs attention right now?*

- The Needs Attention panel surfaces unlinked failures by severity
- Active run cards show execution progress at a glance without opening a run
- Module coverage communicates overall test health in one row
- No configuration needed — the defaults are the useful defaults

Run cards collapse to a compact summary (pass rate, progress bar, status) and expand independently to show full breakdown, assignees, and defects. Expanding one card does not affect others.

### Test Cases

The test case table is the product's primary information store.

Three-panel layout: folder tree (left, resizable) → case table (centre) → detail panel (right, slides in on selection).

The folder tree maps to module boundaries, not arbitrary categories. Engineers navigate by module, not by feature tag.

**Quick Create** allows rapid case entry without a modal. Press Enter to create, Tab to add another. Details can be filled in later. This is how engineers actually work — capturing cases quickly and refining them in the next pass.

The detail panel uses six tabs (Details / Steps / Activity / History / Comments / Defects). This is the same tab pattern used in the execution panel, so the two screens feel like the same product.

### Test Plans

Test plans are meta-objects that spawn runs. They are not checklists.

A plan defines: which cases to include, which environment to use, how to assign cases, and when to run. Spawning a plan creates a run with a snapshot of all included cases.

The plan detail uses four tabs (Overview / Test Cases / Runs / Metrics). The Metrics tab shows coverage trends over sprints — this is where plan health becomes visible without opening individual runs.

Plans are never executed directly. They always spawn a run.

### Test Runs

The most important screen. QA engineers spend most of their working time here.

**Layout:** searchable run selector (top) → case list with filters → execution detail (right, tabs, resizable, closable, fullscreen).

The run selector replaces a bulky left panel. Engineers switch runs via a compact dropdown without changing their view context.

The case list filters by All / Not run / Fail / Blocked. Within the list, cases are ordered by severity (CRIT → HIGH → MEDIUM → LOW), then by status (Fail → Blocked → Not run → Pass). This surfaces the highest-priority work at the top.

The execution detail panel matches the Test Cases detail panel exactly: same tab structure, same metadata layout, same comment and defect patterns. The engineer's mental model transfers.

Result buttons (Pass / Fail / Blocked / Skip) and keyboard shortcuts are always visible at the bottom of the panel. This is the primary interaction — it should never require scrolling to reach.

### Global Search

Cmd K opens the search palette from any screen. It queries test cases, test runs, and test plans simultaneously via a fan-out to three OpenSearch indexes. Results are grouped by type and display highlighted match text.

Recent views are shown on open (served from the MySQL `recent_views` table — no index query needed). This makes the palette instantly useful, even before the user types.

---

## Interaction principles

**Persistent context.** Split-pane layouts mean selecting an item never destroys the list context. The list remains visible and scannable. Back navigation is rarely needed.

**Inline creation over modal.** Quick Create, inline comment inputs, and inline defect linking keep the engineer in their current context. Modals are used only for confirmation dialogs.

**Keyboard shortcuts are discoverable.** The `?` key opens the shortcuts modal from anywhere. Execution shortcuts are shown in the persistent footer bar in Test Runs.

**Collapsed state communicates.** The sidebar collapses to 48px with icon-only navigation. Run cards collapsed still show pass rate, progress bar, and status. No state is hidden by collapsing.

**Audit by default.** Every mutation is logged. Engineers do not need to opt in to traceability — it happens automatically.

---

## What Relay is not trying to be

- Not a project management tool (no sprints, epics, or issue tracking)
- Not a defect tracker (linked defects only — lifecycle management is in the existing defect system)
- Not a reporting platform (summaries yes; drilldown analytics, no — Phase 2)
- Not a CI/CD dashboard (manual test management only at MVP)
- Not designed for non-QA users
