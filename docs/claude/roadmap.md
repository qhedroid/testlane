# Relay Roadmap — working notes

> Durable record of the roadmap Shaun dictated in session (2026-07-02), so it survives chat summarization/compaction across sessions. Status tags are updated as work progresses. This is the source of truth for "what's next" — `handoff.md` stays a short session log; this file is the full backlog.
>
> Status legend: `[ ]` not started · `[~draft]` provisional Cursor-prompt notes exist, not yet a real numbered task · `[~in progress]` real task prompts drafted and/or partially implemented · `[x]` implemented and merged.

---

## Next Steps (active priority)

### Custom Fields `[~in progress]`
Branch `mvp-custom-fields`, prompts at `docs/cursor-prompts/mvp-custom-fields/` (task-01, task-02, task-03 — see that folder). Full recon detail in `docs/claude/testiny-recon-notes.md`.

Original ask: custom field support needs to be implemented (partially done on Admin Panel, needs to be made functional). Every project has its own set of custom fields; some local, some global. Test cases display custom fields marked active for the current project; toggling shows/hides for ALL test cases in that project. Projects can share custom fields — define in admin panel, assign which projects use them. "Owner" should be global and mandatory for ALL test cases (dropdown, user assignment).

### Dashboard Metrics `[~in progress]`
Branch `mvp-dashboard-metrics`, four task prompts at `docs/cursor-prompts/mvp-dashboard-metrics/` (task-01 through task-04). Not yet run in Cursor.

Original ask: "Do it: Project Scope → Test Plans Scope." Turned out `DashboardScreen.tsx` has no scope concept at all — it's 100% static mock data (`RUN_CARDS`/`ATTENTION_ITEMS`/`COVERAGE_ITEMS` from `seed.ts`), shown only for the seed demo project. Shaun's actual intent (confirmed 2026-07-02): rebuild the dashboard on real data first (metric cards, active-run list, needs-attention panel, coverage-by-folder panel, and removing the demo-only placeholder gate), matching the real-data pattern already used for Test Cases/Runs/Plans. "Test Plans Scope" was shorthand for a smaller follow-up — verifying each Test Plan's own Overview metrics are also live, not a new selector on the main dashboard. That follow-up is noted in task-04 but not part of this branch.

### Requirements & Defects Extra `[~draft]`
Provisional notes at `docs/cursor-prompts/mvp-requirements-defects/draft-notes.md`.

Original ask: check Testiny and verify how requirements/defects should be displayed, then update Relay's UI/functionality accordingly. Open question from Shaun: if a requirement is added to a test case, does it update ALL test cases for open plans, or are test cases under test runs fully detached from their parent case? **Shaun flagged this still needs further verification on his end before we act on it — do not treat the current answer below as final.**

Partial answer already found by reading the code (not yet confirmed with Shaun): `DemoRun.executions[caseId]` only stores status/defects/comments/history — no snapshot of title/steps/requirementIds. Everything else is read live from the parent `Case`, so nothing is currently detached; edits to a case's requirements immediately show up in every run referencing that case, including open ones. Separately, Testiny's Requirements/Defects turned out to be 100% Jira-integration-backed (see recon notes) — Relay's local entities are an intentional frontend-only stand-in, so alignment work should target display parity, not the Jira-linking creation flow.

---

## Improvements (batch towards end of MVP — not urgent)

### User Management
- Add a "remove user" option (currently only disable exists).
- Real names instead of fake demo names: Shaun Sevume, Noel Quadri, Nasir Dipto, Arvindh Chandran, Monica Dayalani, Jamil Khan, Nadim Sharif, Syed Ahmed.
- Role assignments: Owner (keep as Demo User), Administrator (Shaun, Noel), Run Manager (Syed), Run Executor (Jamil, Nasir), Editor (Monica), Viewer (Nadim).
- **Scope note found during Custom Fields research:** the case-level assignee/owner dropdown (`TEAM_USERS` in `apps/web/src/fresh/data/team-users.ts`) already has all 8 real names. This item is really only about the separate **admin panel** user list (`AdminUser[]`, `/admin/users`), which still uses fake names — smaller lift than it looked.

### Role Management
- Pre-existing (built-in) roles can't be edited/deleted, only viewed.
- New custom roles created in Role Management don't show up in the invite-user role dropdown.
- **Root cause found during Custom Fields research:** the invite/edit-user role dropdown reads from a hardcoded `ADMIN_USER_ROLES` union in `rbac.ts`, completely separate from the dynamic `AdminRole` CRUD entity Role Management edits — two disconnected role systems, not a missing refresh. This is a real architecture fix (unifying a static type union with a dynamic list + RBAC checks elsewhere), not a small dropdown tweak. Doesn't block the User Management task above — all 6 roles requested there already exist in the static list.

### Test Cases Extra
- Test case history should reflect real project data (like the list-view sparklines already do) — currently the case detail's History/Runs/Activity tabs show hardcoded fake data.
  - **Finding:** confirmed in code. `CasesScreen.tsx`'s case-list sparkline bars are driven by real data via a `caseBarRun(activeRuns, caseId, barIndex)` helper with a working "go to execution" link. The case detail panel's Runs/History/Activity tabs (~line 1955-1997) are 100% hardcoded literal JSX (fake names like "Nadim Sharif", "Sprint 44 Regression"). Fixing this is mostly reusing `caseBarRun`/`activeRuns`, not new computation. Testiny's equivalent "Recent results" graphic on a case's Runs tab is functionally the same UI concept as the sparkline — confirmed thresholds: 0 runs → "Add this test case to a test run to see results." (no table); 1–3 runs → "Add this test case to more test runs to see a graphical overview." + a Run/By/At table; 4+ runs → full colored-squares graphic + the same table.
- Rename test case folders: folder shows name | doc count, hover reveals edit (pencil) and delete (bin) icons.
  - **Confirmed on Testiny:** hover reveals pencil/trash; pencil turns the name into an inline text input with green check (confirm) / grey X (cancel).
- Folder creation should behave like quick-create: type name first, Enter confirms, Escape cancels; tick/cross icons as a mouse alternative.
  - **Confirmed on Testiny:** "New" folder button drops an inline "Enter folder name" input with the same check/X pair; Escape cancels. Exact pattern to mirror.
- "Runs" tab under a test case should link to actual runs (see history finding above — same fix).
- TODO (unscoped): TC bulk editing + versioning.

### Test Plans Extra
- Test Cases tab under Test Plans needs comparison against Testiny.
  - **Finding:** Relay's `TestPlan.queries: TestQuery[]` (condition/folder/static, `resolvePlanCases()`) already supports multiple named dynamic queries unioned with a static list — structurally close to what Testiny does (multiple named queries + a static "Add from list" bucket, each shown as its own chip, unioned with an Origin column showing which query matched each case). Needs a closer side-by-side before scoping — may be more polish (e.g. an Origin column, richer condition builder) than net-new architecture.
- "Open Test Run" should be "Open Test Runs" and show a scrollable list when multiple runs are open for a plan.
  - **Resolved on Testiny (verified 2026-07-02):** it's not a scrollable list. With 2+ open runs, the card retitles to plural "Open test runs" and shows a stacked-card icon with an "N of M" count (open of total runs) that acts as a filter shortcut to the runs table below, rather than linking to or listing individual runs. With exactly 1 open run it shows that run's ID directly. Relay's fix should mirror this filter-link pattern, not build a scrollable list.
- TODO: should runs be creatable from an empty test plan (0 resolved cases)?
  - **Resolved on Testiny (verified 2026-07-02):** no — Testiny has no "Create test run" option anywhere (header or "More…" menu) until a plan has at least one resolved case. Shaun still needs to decide whether Relay should match this constraint or intentionally diverge.

### Test Runs Extra
- Filter tabs above the case list are missing Passed/Skipped; should match the status order next to the summary donut (Passed, Failed, Blocked, Skipped, Not Run).
- All 5 statuses next to the donut should always be visible, even at 0 count (currently statuses with zero cases disappear, e.g. Skipped).
  - **Confirmed on Testiny, and both items share one fix:** the status rows next to the run's summary donut are always rendered (even at 0%) AND each one is clickable, applying a `Result = X` filter chip to the case list below. Replicating that single mechanism in Relay covers both asks at once.
- Make "Reset all Results" functional.
  - **Confirmed on Testiny:** it's a real, working action under the run's "More…" menu.
- "Record was created" history log should appear for every case added to a run, including ones added at run creation (currently only shows for cases added later).
  - **Confirmed on Testiny:** a case present from run creation gets the same "Record was created" entry as one added later — Relay's current gap is a real deviation, not intended behavior.
- Add an optional description field wherever missing when creating a run; description should display beneath the run's name when viewing it.
  - **Confirmed on Testiny:** description sits directly beneath the run title, editable inline.
- Add a keyboard shortcut to quickly clear a result status.

### Add a "live" demo project
Keep the current stale demo project, but add a second one with real, non-static test cases/runs (real ids, valid field values) so Shaun can showcase arrow navigation, auto case numbering, run creation, etc. without prior setup.
- **Note:** this is a prerequisite/enabler for the two Test Cases Extra history/Runs-tab fixes above being meaningfully demoable — worth sequencing before or alongside those, even though it's filed under "Improvements."

---

## Lesser Improvements (backlog, not urgent)

- **Test Runs Lesser:** redesign the Steps window to a left/right split (steps | expected results), matching Testiny.
  - **Resolved on Testiny (verified 2026-07-02):** this only applies to Testiny's default "Text" case template, where Steps/Expected Results are two freeform numbered-text blocks side by side (not discrete per-step rows — see `testiny-recon-notes.md`). Testiny also has a separate "Steps" template that looked like discrete per-step rows but wasn't populated with real content to confirm. Net effect: Relay's existing discrete `CaseStep[]` row model is likely already more structured than Testiny's common case, so this item may not need work — recommend closing or re-scoping as "verify Relay's current steps UI is fine as-is" rather than a redesign, next time it's picked up.
- **Test Runs Lesser:** grey out the "Create run" button when no cases exist in the project (the big blue button shown when no runs exist yet).
- **Test Runs Lesser:** improve commenting to be closer to Testiny's add/edit/view style, especially from a step's Details tab.
- **Searching:** remove the raw internal case ID (long number) from global search results — only show friendly ids (TC-XXXX, TR-XXXX, etc).
- **MTI Stuff:** use the CTMS domain overview as a basis for MTI structure — Shaun will go through this directly, not actionable yet.
- **Audit History:** log all frontend actions to the audit log, attributed to the current actor. Depends on User Management improvements landing first (sequencing already noted by Shaun).
- **Permissions Management Extra:** add a feature to manage permissions. Blocked — need to confirm the permission set with Syed or Vijay before scoping.
