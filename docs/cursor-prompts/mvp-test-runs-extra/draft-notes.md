# DRAFT — Test Runs Extra (not a runnable task yet)

> Provisional planning note, not a Cursor-ready task prompt. Part of the "Improvements" tier (plus a "Lesser Improvements" addendum at the bottom) — batched for later, not urgent. Branch name `mvp-test-runs-extra` is a guess (distinct from the already-merged `mvp-test-runs` branch/folder).

## Original ask (Improvements tier)

1. Filter tabs above the case list are missing Passed/Skipped; should match the status order next to the summary donut (Passed, Failed, Blocked, Skipped, Not Run).
2. All 5 statuses next to the donut should always be visible, even at 0 count (currently statuses with zero cases disappear).
3. Make "Reset all Results" functional.
4. "Record was created" history log should appear for every case added to a run, including ones added at run creation (currently only shows for cases added later).
5. Add an optional description field wherever missing when creating a run; description should display beneath the run's name when viewing it.
6. Add a keyboard shortcut to quickly clear a result status.

## What's known so far

**Items 1 & 2 share one fix.** Confirmed on Testiny (`testiny-recon-notes.md`): the status rows next to the run's summary donut are always rendered (even at 0%), and each row is clickable — clicking applies a `Result = X` filter chip to the case list below. Replicating that single mechanism in Relay's `RunsScreen.tsx` covers both asks at once, rather than needing two separate fixes.

**Item 3:** confirmed as a real, working action in Testiny's run "More…" menu — no special behavior beyond resetting every case's result back to Not Run. Should be a straightforward wire-up once located in Relay's reducer/actions.

**Item 4:** confirmed on Testiny — a case present in a run from creation time gets the identical "Record was created" history entry as one added later. Relay's current gap (only logging it for later-added cases) is a real deviation from the reference behavior, not intended.

**Item 5:** confirmed on Testiny — description sits directly beneath the run's title/name in the detail header, editable inline. Relay should check every run-creation entry point (Test Cases screen, Test Plans screen, Test Runs screen) for a description field per the original ask's own note ("check all the other windows... add the optional field anywhere it's missing").

**Item 6:** no Testiny reference gathered for this one specifically (not part of the recon pass) — would need either a quick look at Testiny's keyboard shortcuts (check `Automation`/settings or in-app shortcut hints) or just a Relay-side design decision on a sensible key binding.

## Suggested next steps when this is picked up

1. Items 1, 2, and 3 are the most ready to scope — patterns are confirmed, just need Relay-side implementation planning against `RunsScreen.tsx`.
2. Item 4 needs a look at wherever Relay currently writes the "Record was created" log entry (likely in an `ADD_CASES_TO_RUN`-adjacent reducer path) to find where the run-creation path diverges from the add-later path.
3. Item 5 needs a full audit of every "create test run" entry point in the codebase to find which ones are missing the field.
4. Item 6 needs either a quick Testiny check or a Shaun decision on the actual keybinding.
5. Follow the `mvp-custom-fields/task-01-field-type-parity.md` format once scoped.

---

## Addendum — Lesser Improvements, same screen area (lower priority, backlog)

These are filed separately in `roadmap.md` under "Lesser Improvements" but touch the same screen, so worth considering together if this branch is ever picked up:

- **Steps window redesign** (left/right split of steps | expected results) — **likely a non-issue.** Confirmed on Testiny this layout only applies to its default "Text" case template, where Steps/Expected Results are two freeform numbered-text blocks, not discrete per-step rows (see `testiny-recon-notes.md`). Relay's existing discrete `CaseStep[]` row model is arguably already more structured than Testiny's common case. Recommend re-verifying Relay's current steps UI is fine as-is before treating this as a redesign task.
- **Grey out "Create run" button when no cases exist in the project** — not yet researched on Testiny or in Relay's code; straightforward disabled-state UI work once picked up.
- **Improve commenting** (closer to Testiny's add/edit/view style, especially from a step's Details tab) — not deeply researched; Testiny's comment tab was seen as a simple textarea + attachment + save with no existing comments to observe threading/display style against.
