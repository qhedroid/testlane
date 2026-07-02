# Testiny recon notes

> Findings from browsing the live reference instance (`https://testiny.trialinteractive.com/DP/*`, project "My Demo Project") via Claude in Chrome, 2026-07-02. Kept as a durable reference so future sessions don't need to re-browse to re-derive these details. Cross-referenced against the actual Relay codebase where noted. See `docs/claude/roadmap.md` for how each finding maps to a roadmap item, and `docs/cursor-prompts/mvp-custom-fields/` for the one area already turned into real task prompts.

---

## Custom Fields

- No "local vs global" field *type* — every field lives in one org-wide catalog (Settings → Custom Fields) and is explicitly assigned to whichever projects should use it via a checkbox list of every project, plus an "Add custom field automatically in all future projects" toggle (that toggle is what makes a field effectively "global").
- Field types: Text, Number (integer), Number (float), URL, Boolean, Multi-Line Text, Date, Date & Time, Duration, Multi-Select.
- "As Dropdown" is a toggle on **Text** fields specifically — turns it into a single-select populated from a defined value list (`+ Add value` button, "Show display values" toggle). Not its own type.
- Fields can be marked Required, given a default value, and a description.
- Per-project field activation (show/hide on that project's cases) is a separate screen under each project's own settings — a checkbox grid of every catalog field for that project.
- **Owner is not a custom field.** It's a native, built-in field on every test case, shown as "Assigned To … <Owner>" in the execution detail. Confirmed no "Owner" entry exists anywhere in the ~40-row global custom fields catalog.
- Relay comparison (code-verified): admin catalog + per-project active toggle + case-detail rendering already exist (`AdminCustomFieldsPageContent.tsx`, `AdminProjectPanel.tsx`, `CasesScreen.tsx`), but only 6 types are declared and only Boolean/Multi-Line Text actually render correctly — Multi-Select and Date & Time silently fall through to a plain text input. `Case.assignee` already exists and is functionally Testiny's Owner (dropdown of the real 8-person `TEAM_USERS` team) — just optional and labeled "Assigned to." Full gap analysis and fix plan → `docs/cursor-prompts/mvp-custom-fields/`.
- **Duration field widget:** previewed via the "Add custom field" modal (not saved/created). It's a plain free-text input following a formatted convention shown as placeholder text, e.g. `1h 30m 42s` — not a structured multi-part picker (separate hour/minute/second fields). Relay's task-01 plan of a free-text stand-in for Duration is therefore already a faithful match, not a compromise.

## Requirements & Defects

- **Both are 100% Jira-integration-backed, not local entities.** "Create requirement" on a test case opens a real Jira-issue-creation form (project picker e.g. "myTI (TIMO)", issue type e.g. Bug, summary auto-filled with case title+id, description auto-filled with a link back to the case, "Add test steps to description" checkbox, "Browse JiraCloud" link). "Link requirement" searches existing Jira issues from the configured project/type.
- Defects follow the identical pattern, both from a case's Defects tab (case-level) and a run's Defects tab (run-level aggregate) — same "Create defect" / "Link defect" buttons, same "linked from configured integrations" copy.
- A case's Defects tab is genuinely empty/view-only when nothing's linked ("No defects have yet been linked to this test case in a test run") — defects can **only** be created/linked from a run execution (Failed/Blocked), never directly from a case. This matches Relay's current behavior exactly (Requirement: create/link on cases, view-only on runs; Defect: create/link on runs Failed/Blocked, view-only on cases) — no gap here.
- **Implication for Relay:** since Relay is frontend-only with no real Jira integration, matching Testiny's *creation* flow literally isn't practical. Treat Relay's local `Requirement`/`Defect` entities (schema v14, `requirementsById`/`defectsById`) as an intentional stand-in, and target any future alignment work at the *display* layer (how a linked item looks/counts/badges on a case or run), not the linking UX.
- Data-model question Shaun asked (whether editing a case's requirements retroactively affects cases already added to open test runs): reading `FreshProvider.tsx`/`demo-model.ts` shows `DemoRun.executions[caseId]` only stores `{ status, stepResults, defects[], assignee, resultNotes?, testedAt?, testedBy? }` — no snapshot of the case's title/steps/requirementIds. Everything else renders live from the parent `Case`. So today, nothing is detached — edits to a case immediately show up in every run referencing it, including already-open ones. **Shaun flagged he wants to verify this further before treating it as settled — don't act on it as final without his sign-off.**

## Test Case folders

- Hovering a folder row reveals a pencil (rename) and trash (delete) icon on the right.
- Clicking the pencil turns the folder name into an inline text input (count stays visible next to it) with a green checkmark (confirm) and grey X (cancel) to its right. Escape also cancels.
- "New" folder creation drops a nested inline "Enter folder name" input with the identical check/X pair; Escape cancels without creating anything.
- Exact pattern to mirror in Relay for both rename and quick-create.

## Test Case "Runs" tab (recent results graphic)

Three distinct states, confirmed by checking cases with 0, 1, and 4 associated runs:

| Run count | Content |
|---|---|
| 0 | Icon + "Add this test case to a test run to see results." — no table. |
| 1–3 | Icon + "Add this test case to more test runs to see a graphical overview." **plus** a Run / By / At table underneath (table always shows regardless of count). |
| 4+ | Full "Recent Results" graphic — colored result squares, a %/count badge per status (e.g. "75% 3 Passed", "25% 1 Not Run"), "N times executed" — plus the same Run/By/At table. |

The threshold counts *all* associated runs regardless of status (a run marked Not Run still counts toward the 4).

**Relay cross-check:** the case-list sparkline bars (`caseBarRun(activeRuns, caseId, barIndex)` in `CasesScreen.tsx`) already pull from real run data with a working "go to execution" hover tooltip/link — this is functionally the same UI concept as Testiny's graphic. But the case-detail panel's Runs/History/Activity tabs (~line 1955-1997 in that file) are 100% hardcoded fake JSX (literal names like "Nadim Sharif", "Sprint 44 Regression" baked into markup). Fixing the Runs tab should reuse `caseBarRun`/`activeRuns`, not build new computation from scratch.

**Case templates (resolves the "multi-step Steps/Expected-Results alignment" question):** every test case has a "Template" field with two options — "Text" and "Steps." All 38 demo cases use "Text," where Steps and Expected Results are each a single freeform numbered text block written by the author (e.g. "1.) click Sign Up... 5.) Verify sign up now in footer" matched to "1-5.) In separate tab, the registration-mail-field is focused") — not discrete per-step rows, and expected results don't necessarily map one-to-one to steps; one expected-results line can cover a range of steps. Switching a case to the "Steps" template (tested on "Registration," then discarded without saving — confirmed reverted) shows what looks like a discrete per-step row table, closer to Relay's own `CaseStep[]` model, but wasn't populated with real content to fully confirm the layout. **Conclusion:** Relay's discrete-step-row model is arguably already more structured than Testiny's default template — there's likely no gap to close on "alignment" for the common case, since Testiny's default isn't row-aligned at all.

## Test Plans

- The "Test cases" tab supports **multiple named dynamic queries** per plan — "by condition" (arbitrary field conditions, e.g. `Type = Usability | Performance`, with a full AND-able condition builder: field dropdown, operator dropdown, value, live result preview) and "by folder" (multi-select folder tree including an explicit "No folder"/unfiled row) — plus a separate static "Add from list" bucket for hand-picked cases. All of these union together into one resolved list with an **Origin** column showing which query matched each case.
- Relay already has `TestPlan.queries: TestQuery[]` (type: `condition`/`folder`/`static`, resolved via `resolvePlanCases()`) per `docs/_authoritative/DOMAIN_MODEL.md` — structurally this looks close to Testiny already. Needs a real side-by-side (how many simultaneous named queries does Relay's UI actually let you add? Is there an Origin-style column?) before scoping any follow-up work — don't assume a gap without checking.
- The Overview tab shows: Test plan details (created by/at, case count), an "Open test run" card (single run shown as a big centered icon+ID when exactly one is open), a "Test case coverage" donut (matches Relay's existing coverage donut concept), a "Most frequently failed test cases" heatmap (test-run rows × test-case columns, not currently requested by Shaun — noting for awareness only), and a "Test runs created from this test plan" table listing **all** runs (open and closed) with a mini result bar, created/closed dates.
- **Resolved (previously listed as unverified):** created a temporary second open run on "Usability and full functional regression Test" to check the plural behavior, then deleted it. With 2+ open runs, the card retitles to "Open test runs" (plural) and shows a stacked-card icon with an "N of M" count (open runs of total runs including closed ones) instead of a single run ID link. It is **not** a scrollable list or carousel — clicking it applies a "Show only open test runs" filter to the "Test runs created from this test plan" table below. With exactly 1 open run, it instead shows that run's ID as a direct link (as originally observed).
- **Resolved (previously listed as unverified):** created a temporary empty test plan (0 resolved cases) to check whether a run can be created from it, then deleted it. Confirmed: there is **no** "Create test run" option anywhere (not in the header, not in the "More…" menu) until the plan has at least one resolved case. So creating a run from a genuinely empty plan is blocked by Testiny's own UI — worth deciding whether Relay should match that constraint or intentionally diverge.

## Test Runs

- Description sits directly beneath the run's title/name in the run detail header, editable inline. Confirmed by example run "NTR1" showing "Descooo where are u" right under the title.
- The status list next to the run's summary donut **always shows all five statuses** (Failed, Blocked, Skipped, Not Run, Passed), even when a status has 0 count (e.g. a run with 0 Blocked/Skipped still lists them at "0%"). **Each status row is clickable** — clicking applies a `Result = X` filter chip above the case list, filtering it to that status (with an X to clear). This single interaction covers two separate Relay asks at once: the missing Passed/Skipped filter tabs, and statuses disappearing from the list at zero count.
- "Reset all results" is a real, working action in the run's "More…" menu (also has Edit/Close/Duplicate/Show history/Create report/Export CSV/Export Excel/Delete).
- History log: a case present in a run from creation time gets the same "Record was created" entry as a case added later (confirmed via History tab on an execution) — Relay's current behavior of only logging this for later-added cases is a real deviation.
- Steps/Expected Results render as a left/right split: a "STEPS" column (icon + step text) on the left, an "EXPECTED RESULTS" column (icon + bulleted list) on the right, both under a "PRECONDITION" block and above "CUSTOM FIELDS" (which only shows fields active for that project — confirmed consistent with the admin per-project active-field toggle). Only observed on cases with a single step in this pass — multi-step row-by-row alignment (does each step get its own paired expected-results row, or is it one block of steps next to one block of results?) is not yet confirmed.
- Comments tab: simple textarea + "Add attachment" + "Save," no existing comments were present to observe display/threading style.
- Run-level Defects tab: same Jira-integration-backed "Create defect"/"Link defect" pattern as case-level (see Requirements & Defects section above).

## Open verification items — all resolved as of 2026-07-02

All four items originally listed here have been checked (see inline findings above in each section). Two required creating temporary objects in the live "My Demo Project" (a second test run, an empty test plan) — both were deleted immediately after observation, confirmed back to original state (2 test plans, 7 test runs). No other project was touched.

Superseded findings, kept here for the record:
1. ~~Open Test Runs plural/scrolling UI~~ — resolved, see Test Plans section above.
2. ~~Create-run-from-empty-plan behavior~~ — resolved, see Test Plans section above.
3. ~~Multi-step Steps/Expected-Results alignment~~ — resolved, see Test Case "Runs" tab / template findings above: Testiny's default "Text" template uses two freeform numbered-text blocks, not discrete per-step rows; a separate "Steps" template exists but wasn't populated/tested against real content.
4. ~~Duration field type behavior~~ — resolved, see Custom Fields section above: plain free-text input following a formatted convention (e.g. `1h 30m 42s`), not a structured picker.
