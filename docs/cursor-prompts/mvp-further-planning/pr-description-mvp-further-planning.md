# PR: mvp-further-planning → mvp-main

## Summary

This is a docs-only, cross-cutting planning session — no `apps/**` source files were touched. It captures the full roadmap Shaun dictated for post-mvp-test-plans work, a live Testiny recon pass (browsed via Claude in Chrome as a UX reference), and turns two of the resulting Next Steps items (Custom Fields, Dashboard Metrics) into real, ready-to-run Cursor task prompts. Everything else in the roadmap gets a light provisional draft note so no research from this session is lost before those items are actually picked up. It also updates `CLAUDE.md` itself to register the new `roadmap.md`/`testiny-recon-notes.md` files as mandatory reads and to document the draft-notes/cross-cutting-branch conventions this session established.

---

## What's included

### Roadmap capture, Testiny recon, and first task prompts

**Docs: capture roadmap + Testiny recon, draft custom-fields prompts** ([`9932646`](https://github.com/qhedroid/Relay/commit/9932646))
- Corrected `handoff.md`'s stale active-branch claim (`mvp-test-plans` → `mvp-main`; PR #16 was already merged)
- Added `roadmap.md` — durable backlog of every Next Steps / Improvements / Lesser Improvements item Shaun raised, with status tags and code findings annotated inline
- Added `testiny-recon-notes.md` — full findings from browsing the live Testiny instance, cross-referenced against Relay's code, plus an initial "open verification items" list
- Drafted three real Cursor task prompts under `cursor-prompts/mvp-custom-fields/`: field type parity + fixing broken Multi-Select/Date rendering (task-01), Owner as a mandatory field (task-02), per-field project assignment (task-03)
- Added provisional draft notes for Requirements & Defects Extra and Dashboard Metrics

### Planning process conventions

**Docs: register roadmap/recon files and draft-prompt convention in CLAUDE.md** ([`852a938`](https://github.com/qhedroid/Relay/commit/852a938))
- Added `roadmap.md` and `testiny-recon-notes.md` to the mandatory read-on-session-start file list in `CLAUDE.md`, with update triggers for each
- Documented the `draft-notes.md` convention for roadmap items not yet scoped into runnable tasks
- Documented that cross-cutting planning work (spanning multiple future feature areas) belongs on its own planning branch, e.g. this one, rather than `mvp-main` or an unrelated feature branch

### Testiny verification follow-ups

**Docs: resolve remaining Testiny verification items** ([`9a5ddd2`](https://github.com/qhedroid/Relay/commit/9a5ddd2))
- Added a case-template finding (Text vs. Steps) resolving the multi-step Steps/Expected-Results alignment question
- Added the Duration custom-field widget finding (plain formatted free-text, not a structured picker)
- Resolved the Open Test Runs plural-UI question and the create-run-from-empty-plan question, each verified by creating and immediately deleting a temporary object in Testiny's "My Demo Project" (confirmed restored to original state — 2 test plans, 7 test runs, no other project touched)

### Dashboard Metrics planning

**Docs: draft mvp-dashboard-metrics task prompts (4 tasks)** ([`b7ebf5f`](https://github.com/qhedroid/Relay/commit/b7ebf5f))
- Drafted four real Cursor task prompts under `cursor-prompts/mvp-dashboard-metrics/`: real metric cards + active-runs column (task-01), a real "Needs attention" panel (task-02), a real per-folder coverage panel (task-03), and removing the demo-only placeholder gate (task-04)
- Reframed the original "Project Scope → Test Plans Scope" ask after finding the dashboard is 100% static mock data today — confirmed with Shaun that the real intent is a full rebuild on live data, with "Test Plans Scope" being a smaller separate follow-up to verify Test Plan Overview metrics are also live

### Improvements backlog draft notes

**Docs: light draft-notes across remaining Improvements backlog** ([`e184795`](https://github.com/qhedroid/Relay/commit/e184795))
- Added provisional draft notes for User Management, Role Management, Test Cases Extra, Test Plans Extra, Test Runs Extra (plus a Lesser Improvements addendum), the live demo project, and the four remaining scattered Lesser Improvements items
- Updated `roadmap.md` with `[~draft]` status tags and pointers for every item now covered

---

## ⚠️ Caveats

- This PR contains no implemented functionality — every change is a planning document or Cursor task prompt. None of `mvp-custom-fields`'s or `mvp-dashboard-metrics`'s tasks have been run yet.
- Two Testiny findings required temporarily creating a second test run and an empty test plan in the live "My Demo Project" instance; both were deleted immediately after observation and the project was confirmed back to its original state.
- Several roadmap items still carry open product decisions that were surfaced but not resolved here (e.g. whether Relay should block run creation from empty test plans, matching Testiny; the Requirements/Defects case-run detachment question, which Shaun flagged needs further verification on his end before any code work proceeds).

---

## Testing

- **Build:** N/A — no `apps/**` source files changed; nothing to build or run.
- **localStorage:** N/A — no schema or data-shape changes.
- **Manual smoke checks:**
  - Confirmed no files under `apps/**` or `docs/_authoritative/**` were modified.
  - Confirmed the live Testiny "My Demo Project" instance was returned to its original state after the two temporary verification objects were deleted.
