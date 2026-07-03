# DRAFT — Requirements & Defects Extra (not a runnable task yet)

> This is a provisional planning note, not a Cursor-ready task prompt. It captures what's known so far so a future session can pick this up without re-deriving it. Do not hand this to Cursor as-is — flesh it into a real `task-01-*.md` (following the format used in `docs/cursor-prompts/mvp-custom-fields/`) once scope is confirmed with Shaun.
>
> Branch name `mvp-requirements-defects` is a guess at what this will eventually be called — confirm/rename when this actually starts.

## Original ask

"Check Testiny and verify how these should be displayed. Then update Relay accordingly to bring UI + functionality closer to Testiny. Question: If a requirement is added to a Test Case, does it update ALL test cases for open plans or not? This is very important as we must figure out whether Test Cases under Test Runs are FULLY detached from parent test cases and don't reflect changes, or whether they still reflect some changes done to their respective parent test case."

**Shaun said (2026-07-02): he can't yet answer the detachment question without further verification on his end — don't proceed on it as settled.** Treat the finding below as a hypothesis pending his confirmation, not a scoped-and-ready fact.

## What we found on Testiny (full detail in `docs/claude/testiny-recon-notes.md`)

Requirements and Defects in Testiny are **entirely Jira-integration-backed** — "Create requirement"/"Create defect" open real Jira-issue-creation forms (project + issue type pickers, auto-filled summary/description linking back to the case), and "Link requirement"/"Link defect" search existing Jira issues. This happens both at the case level (Requirements: create/link; Defects: view-only) and the run level (Defects: create/link on Failed/Blocked executions; view-only elsewhere) — which already matches how Relay's local entities are gated.

**Implication:** Relay can't replicate the *creation* flow (no real Jira integration, frontend-only prototype per `CLAUDE.md`). Any "bring UI closer to Testiny" work here should target the *display* layer — how a linked requirement/defect looks on a case or run (badges, counts, list presentation) — not the linking mechanism itself, which is structurally different by design.

## Code-level finding on the detachment question (unconfirmed by Shaun — see above)

`DemoRun.executions[caseId]` (`demo-model.ts` / `FreshProvider.tsx`) only stores `{ status, stepResults, defects[], assignee, resultNotes?, testedAt?, testedBy? }`. No snapshot of the case's title, steps, or `requirementIds` is taken when a case is added to a run — everything else (including `Case.requirementIds`, which drives what shows on a run's Requirements tab) is read live from the parent `Case` object via `caseId` lookup at render time. So as implemented today, nothing is detached: editing a case's requirements (or steps, or any field) immediately reflects in every run referencing that case, including already-open/in-progress ones.

Whether that's the *right* behavior is the open question. Most run-execution tools (and possibly Testiny, though we didn't get to test this specific scenario live) snapshot a case's content at the point it's added to a run, specifically so results aren't retroactively altered by later edits to the source case. This is a real design decision, not just a display tweak — worth a deliberate choice before writing any task prompt, not something to infer from the Jira-backed requirements flow (which doesn't touch this question at all, since Jira requirements/defects are separate objects being *linked*, not case content being *copied*).

## Suggested next steps when this is picked up

1. Get Shaun's answer on the detachment question first — it may reframe scope entirely (e.g. if snapshotting is wanted, this becomes a `DemoRun`/`CaseExecution` schema change, not a UI-only task).
2. Decide what "display parity" with Testiny's Requirements/Defects actually means for Relay's local entities — e.g. does the case Requirements tab need a "Create requirement"/"Link requirement" two-button layout matching Testiny's visual pattern (even though the underlying action is local, not Jira), or is the current implementation already close enough?
3. Re-read `docs/_authoritative/DOMAIN_MODEL.md`'s Requirement/Defect rows and the "Requirements & Defects frontend slice" section of `docs/claude/handoff.md` (from the `mvp-requirements-defects-slice` branch) before drafting — this feature was already built once; changes here are refinement, not greenfield.
4. Follow the `docs/cursor-prompts/mvp-custom-fields/task-01-field-type-parity.md` format once scope is locked: Background → Part-by-part file changes with exact line references → Verification → Documentation → Out of scope.
