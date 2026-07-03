# DRAFT — Add a "live" demo project (not a runnable task yet)

> Provisional planning note, not a Cursor-ready task prompt. Part of the "Improvements" tier — batched for later, not urgent. Branch name `mvp-live-demo-project` is a guess.

## Original ask

Keep the current stale demo project (good for a static overview), but add a second one with real, non-static test cases/runs — real case ids, valid field values per field options — that Shaun can jump into and showcase (arrow navigation, auto case numbering, run creation, etc.) without prior setup.

## What's known so far

Relay already has a "clone demo project" mechanism: "Add demo project" clones from an immutable in-code template (`demo-template.ts`), never from live store state, with incremental keys (`DP1`, `DP2`, …) and all entity ids remapped for isolation (`docs/_authoritative/DOMAIN_MODEL.md` invariant #8). This is a plausible mechanism to extend rather than building project cloning from scratch — the work is likely more about *authoring a good second template* (a smaller, deliberately "live-feeling" set of cases/runs) than building new cloning infrastructure.

## Dependency note

This item is a prerequisite/enabler for two `mvp-test-cases-extra` items — "test case history should reflect real data" and "Runs tab should link to real runs" — both need real, varied run history behind real cases to be meaningfully demoable/QA-able. Worth sequencing this alongside or before those, even though all three are filed under "Improvements."

## Not yet done

- Haven't scoped exactly how many cases/runs "a few" means, or what specific demo flows Shaun wants to showcase (arrow navigation and auto-numbering just need a handful of cases in a folder; run creation needs at least one folder with unrun cases).
- Haven't checked whether the existing demo template mechanism supports authoring a *second*, different template, or only re-cloning the same one.

## Suggested next steps when this is picked up

1. Read `demo-template.ts` and the "Add demo project" clone flow in full.
2. Get a short list from Shaun of the specific flows he wants to demo, to size the new template content precisely rather than guessing.
3. Follow the `mvp-custom-fields/task-01-field-type-parity.md` format once scoped.
