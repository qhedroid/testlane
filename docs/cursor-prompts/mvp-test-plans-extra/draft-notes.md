# DRAFT — Test Plans Extra (not a runnable task yet)

> Provisional planning note, not a Cursor-ready task prompt. Part of the "Improvements" tier — batched for later, not urgent. Branch name `mvp-test-plans-extra` is a guess (distinct from the already-merged `mvp-test-plans` branch/folder, which covered a different polish round).

## Original ask (multiple items)

1. Test Cases tab under Test Plans needs comparison against Testiny — assess what's missing.
2. "Open Test Run" should be "Open Test Runs" and show a list when multiple runs are open for a plan.
3. TODO: should runs be creatable from an empty test plan (0 resolved cases)?

## What's known so far

**Item 1:** Relay's `TestPlan.queries: TestQuery[]` (type `condition`/`folder`/`static`, resolved via `resolvePlanCases()` — see `docs/_authoritative/DOMAIN_MODEL.md`) already supports multiple named dynamic queries unioned with a static list, which is structurally close to what Testiny does (multiple named queries — by condition or by folder — plus a static "Add from list" bucket, unioned together with an Origin column showing which query matched each case). This needs a real side-by-side check (how many simultaneous named queries does Relay's actual UI let you add today? Is there an Origin-style column?) before assuming there's a gap — don't scope work here without verifying first.

**Item 2:** Fully resolved on Testiny (`testiny-recon-notes.md`, verified 2026-07-02 by creating and deleting a temporary second run) — it is **not** a scrollable list. With 2+ open runs, the "Open test run" card retitles to plural "Open test runs" and shows a stacked-card icon with an "N of M" count (open runs of total runs including closed ones) that acts as a filter shortcut to the "Test runs created from this test plan" table below, rather than linking to or listing individual runs directly. With exactly 1 open run, it shows that run's ID as a direct link (as Relay already does today, per the mvp-test-plans polish round). This item is ready to scope into a real task without further Testiny research — just needs Relay-side implementation of the filter-link pattern.

**Item 3:** Fully resolved on Testiny (verified 2026-07-02 by creating and deleting a temporary empty test plan) — there is no "Create test run" option anywhere (header or "More…" menu) until a plan has at least one resolved case. This is now a pure product decision for Shaun: match Testiny's constraint (block run creation from empty plans) or intentionally diverge. Not something more Testiny research will resolve.

## Suggested next steps when this is picked up

1. Item 2 is the most ready to scope — go straight to reading `PlansScreen.tsx`'s current "Open Test Run" card implementation and plan the filter-link pattern.
2. Item 3 needs a quick decision from Shaun before scoping (block vs. allow empty-plan runs) — don't guess.
3. Item 1 needs a fresh side-by-side of Relay's actual current Test Cases tab UI against the Testiny findings before deciding if there's real work here.
4. Follow the `mvp-custom-fields/task-01-field-type-parity.md` format once any of these are scoped into real tasks.
